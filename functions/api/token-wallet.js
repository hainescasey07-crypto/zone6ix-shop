import {
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

function normalizeDate(value) {
  return value || new Date().toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    await upsertUser(env.DB, user);
    const claimed = await claimDailyLoginBonus(env.DB, user);
    const settings = claimed.settings || await getTokenSettings(env.DB);
    const wallet = claimed.wallet || await ensureTokenWallet(env.DB, user.uid);
    const today = normalizeDate(claimed.today);

    const [daily, ledgerResult, redemptionsResult] = await Promise.all([
      env.DB.prepare(`
        SELECT * FROM token_daily_stats
        WHERE firebase_uid = ? AND earning_date = ?
      `).bind(user.uid, today).first(),
      env.DB.prepare(`
        SELECT id, amount_milli, balance_after_milli, reason,
               reference_type, reference_id, note, created_at
        FROM token_ledger
        WHERE firebase_uid = ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 40
      `).bind(user.uid).all(),
      env.DB.prepare(`
        SELECT r.*, i.name AS item_name, i.image_url, i.category
        FROM store_redemptions r
        JOIN store_items i ON i.id = r.item_id
        WHERE r.firebase_uid = ?
        ORDER BY datetime(r.created_at) DESC
        LIMIT 100
      `).bind(user.uid).all()
    ]);

    return json({
      wallet: {
        balanceMilli: Number(wallet?.balance_milli || 0),
        lifetimeEarnedMilli: Number(wallet?.lifetime_earned_milli || 0),
        lifetimeSpentMilli: Number(wallet?.lifetime_spent_milli || 0),
        updatedAt: wallet?.updated_at || null
      },
      settings: tokenPublicSettings(settings),
      daily: {
        date: today,
        activeSeconds: Number(daily?.active_seconds || 0),
        earnedMilli: Number(daily?.earned_milli || 0),
        loginBonusClaimed: Number(daily?.login_bonus_claimed || 0) === 1
      },
      ledger: ledgerResult.results || [],
      redemptions: redemptionsResult.results || [],
      dailyBonusAwarded: Boolean(claimed.awarded)
    });
  } catch (error) {
    return errorResponse(error);
  }
}
