import {
  cleanText,
  errorResponse,
  json,
  requireFirebaseUser,
  upsertUser
} from "../_lib/common.js";
import {
  claimDailyLoginBonus,
  ensureTokenWallet,
  getTokenSettings,
  tokenPublicSettings
} from "../_lib/tokens.js";

function parseSqlDate(value) {
  if (!value) return NaN;
  const normalized = String(value).includes("T")
    ? String(value)
    : `${String(value).replace(" ", "T")}Z`;
  return new Date(normalized).getTime();
}

function walletJson(wallet) {
  return {
    balanceMilli: Number(wallet?.balance_milli || 0),
    lifetimeEarnedMilli: Number(wallet?.lifetime_earned_milli || 0),
    lifetimeSpentMilli: Number(wallet?.lifetime_spent_milli || 0),
    updatedAt: wallet?.updated_at || null
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const action = cleanText(body.action, { name: "Action", min: 1, max: 30, required: true });
    await upsertUser(env.DB, user);

    if (action === "start") {
      const claimed = await claimDailyLoginBonus(env.DB, user);
      const settings = claimed.settings || await getTokenSettings(env.DB);
      const sessionId = crypto.randomUUID();

      await env.DB.batch([
        env.DB.prepare(`
          UPDATE token_earning_sessions SET
            status = 'expired', ended_at = CURRENT_TIMESTAMP
          WHERE firebase_uid = ? AND status IN ('active', 'paused')
        `).bind(user.uid),
        env.DB.prepare(`
          INSERT INTO token_earning_sessions (
            id, firebase_uid, started_at, last_heartbeat_at,
            active_seconds, awarded_milli, status
          ) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'active')
        `).bind(sessionId, user.uid)
      ]);

      return json({
        sessionId,
        wallet: walletJson(claimed.wallet || await ensureTokenWallet(env.DB, user.uid)),
        settings: tokenPublicSettings(settings),
        dailyBonusAwarded: Boolean(claimed.awarded)
      }, 201);
    }

    const sessionId = cleanText(body.sessionId, { name: "Session ID", min: 1, max: 100, required: true });
    const session = await env.DB.prepare(`
      SELECT * FROM token_earning_sessions
      WHERE id = ? AND firebase_uid = ?
    `).bind(sessionId, user.uid).first();

    if (!session) throw Object.assign(new Error("Earning session not found."), { status: 404 });

    if (action === "end") {
      await env.DB.prepare(`
        UPDATE token_earning_sessions SET
          status = 'ended', ended_at = CURRENT_TIMESTAMP,
          last_heartbeat_at = CURRENT_TIMESTAMP
        WHERE id = ? AND firebase_uid = ?
      `).bind(sessionId, user.uid).run();
      return json({ ended: true });
    }

    if (action !== "heartbeat") {
      throw Object.assign(new Error("Invalid earning action."), { status: 400 });
    }

    const settings = await getTokenSettings(env.DB);
    const wallet = await ensureTokenWallet(env.DB, user.uid);
    const today = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(`
      INSERT OR IGNORE INTO token_daily_stats (
        firebase_uid, earning_date, active_seconds, earned_milli,
        login_bonus_claimed, updated_at
      ) VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
    `).bind(user.uid, today).run();
    const daily = await env.DB.prepare(`
      SELECT * FROM token_daily_stats
      WHERE firebase_uid = ? AND earning_date = ?
    `).bind(user.uid, today).first();

    const now = Date.now();
    const last = parseSqlDate(session.last_heartbeat_at);
    const elapsed = Number.isFinite(last) ? Math.floor((now - last) / 1000) : 0;
    const clientActive = body.active === true;
    const sessionUsable = ["active", "paused"].includes(session.status) && elapsed >= 0 && elapsed <= 90;
    const maxHeartbeatSeconds = 40;
    const candidateSeconds = clientActive && sessionUsable
      ? Math.max(0, Math.min(elapsed, maxHeartbeatSeconds))
      : 0;

    const dailyLimitSeconds = Math.max(0, Number(settings.daily_earning_limit_minutes || 0) * 60);
    const remainingDailySeconds = Math.max(0, dailyLimitSeconds - Number(daily?.active_seconds || 0));
    const acceptedSeconds = Number(settings.earning_enabled || 0) === 1
      ? Math.min(candidateSeconds, remainingDailySeconds)
      : 0;

    const previousSessionSeconds = Number(session.active_seconds || 0);
    const newSessionSeconds = previousSessionSeconds + acceptedSeconds;
    const previousWholeMinutes = Math.floor(previousSessionSeconds / 60);
    const newWholeMinutes = Math.floor(newSessionSeconds / 60);
    const completedMinutes = Math.max(0, newWholeMinutes - previousWholeMinutes);
    const awardDelta = completedMinutes * Number(settings.earn_per_minute_milli || 0);
    const newSessionAwarded = Number(session.awarded_milli || 0) + awardDelta;
    const newDailyEarned = Number(daily?.earned_milli || 0) + awardDelta;
    const newBalance = Number(wallet.balance_milli || 0) + awardDelta;
    const heartbeatKey = `active:${sessionId}:minute:${newWholeMinutes}`;

    const statements = [
      env.DB.prepare(`
        UPDATE token_earning_sessions SET
          last_heartbeat_at = CURRENT_TIMESTAMP,
          active_seconds = ?,
          awarded_milli = ?,
          status = CASE WHEN ? = 1 THEN 'active' ELSE 'paused' END
        WHERE id = ? AND firebase_uid = ?
      `).bind(newSessionSeconds, newSessionAwarded, clientActive ? 1 : 0, sessionId, user.uid),
      env.DB.prepare(`
        UPDATE token_daily_stats SET
          active_seconds = active_seconds + ?,
          earned_milli = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE firebase_uid = ? AND earning_date = ?
      `).bind(acceptedSeconds, newDailyEarned, user.uid, today)
    ];

    if (awardDelta > 0) {
      statements.push(
        env.DB.prepare(`
          UPDATE token_wallets SET
            balance_milli = balance_milli + ?,
            lifetime_earned_milli = lifetime_earned_milli + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE firebase_uid = ?
            AND NOT EXISTS (
              SELECT 1 FROM token_ledger WHERE idempotency_key = ?
            )
        `).bind(awardDelta, awardDelta, user.uid, heartbeatKey),
        env.DB.prepare(`
          INSERT OR IGNORE INTO token_ledger (
            firebase_uid, amount_milli, balance_after_milli,
            reason, reference_type, reference_id, note,
            idempotency_key, created_at, created_by_email
          ) VALUES (?, ?, ?, 'active_time', 'earning_session', ?, ?, ?, CURRENT_TIMESTAMP, 'system')
        `).bind(
          user.uid,
          awardDelta,
          newBalance,
          sessionId,
          `${Math.floor(newSessionSeconds / 60)} active minute(s)`,
          heartbeatKey
        )
      );
    }

    await env.DB.batch(statements);
    const updatedWallet = await ensureTokenWallet(env.DB, user.uid);

    return json({
      sessionId,
      active: clientActive && sessionUsable,
      acceptedSeconds,
      awardedMilli: awardDelta,
      wallet: walletJson(updatedWallet),
      daily: {
        date: today,
        activeSeconds: Number(daily?.active_seconds || 0) + acceptedSeconds,
        earnedMilli: newDailyEarned,
        limitMinutes: Number(settings.daily_earning_limit_minutes || 0)
      },
      settings: tokenPublicSettings(settings)
    });
  } catch (error) {
    return errorResponse(error);
  }
}
