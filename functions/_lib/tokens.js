export async function getTokenSettings(db) {
  let settings = await db.prepare("SELECT * FROM token_settings WHERE id = 1").first();
  if (!settings) {
    await db.prepare("INSERT OR IGNORE INTO token_settings (id) VALUES (1)").run();
    settings = await db.prepare("SELECT * FROM token_settings WHERE id = 1").first();
  }
  return settings;
}

export async function ensureTokenWallet(db, uid) {
  await db.prepare(`
    INSERT OR IGNORE INTO token_wallets (
      firebase_uid, balance_milli, lifetime_earned_milli, lifetime_spent_milli,
      created_at, updated_at
    ) VALUES (?, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(uid).run();
  return db.prepare("SELECT * FROM token_wallets WHERE firebase_uid = ?").bind(uid).first();
}

export async function awardTokens(db, {
  uid,
  amountMilli,
  reason,
  referenceType = "",
  referenceId = "",
  note = "",
  idempotencyKey,
  createdByEmail = "system"
}) {
  const amount = Math.max(0, Math.trunc(Number(amountMilli) || 0));
  if (!uid || !idempotencyKey || amount <= 0) {
    return { awarded: false, wallet: await ensureTokenWallet(db, uid) };
  }

  await ensureTokenWallet(db, uid);

  const results = await db.batch([
    db.prepare(`
      UPDATE token_wallets SET
        balance_milli = balance_milli + ?,
        lifetime_earned_milli = lifetime_earned_milli + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE firebase_uid = ?
        AND NOT EXISTS (
          SELECT 1 FROM token_ledger WHERE idempotency_key = ?
        )
    `).bind(amount, amount, uid, idempotencyKey),
    db.prepare(`
      INSERT OR IGNORE INTO token_ledger (
        firebase_uid, amount_milli, balance_after_milli,
        reason, reference_type, reference_id, note,
        idempotency_key, created_at, created_by_email
      )
      SELECT ?, ?, balance_milli, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?
      FROM token_wallets
      WHERE firebase_uid = ?
    `).bind(
      uid,
      amount,
      reason,
      referenceType,
      referenceId,
      note,
      idempotencyKey,
      createdByEmail,
      uid
    )
  ]);

  return {
    awarded: Number(results?.[0]?.meta?.changes || 0) > 0,
    wallet: await ensureTokenWallet(db, uid)
  };
}

export async function claimDailyLoginBonus(db, user) {
  const settings = await getTokenSettings(db);
  const today = new Date().toISOString().slice(0, 10);

  await db.prepare(`
    INSERT OR IGNORE INTO token_daily_stats (
      firebase_uid, earning_date, active_seconds, earned_milli,
      login_bonus_claimed, updated_at
    ) VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
  `).bind(user.uid, today).run();

  const result = await awardTokens(db, {
    uid: user.uid,
    amountMilli: Number(settings.daily_login_bonus_milli || 0),
    reason: "daily_login",
    referenceType: "day",
    referenceId: today,
    note: "Daily Zone Token login bonus",
    idempotencyKey: `daily-login:${user.uid}:${today}`,
    createdByEmail: "system"
  });

  await db.prepare(`
    UPDATE token_daily_stats SET
      login_bonus_claimed = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE firebase_uid = ? AND earning_date = ?
  `).bind(user.uid, today).run();

  return { settings, today, ...result };
}

export async function awardPurchaseBonus(db, order, createdByEmail = "stripe") {
  if (!order?.id || !order?.firebase_uid) return { awarded: false };
  const settings = await getTokenSettings(db);
  return awardTokens(db, {
    uid: order.firebase_uid,
    amountMilli: Number(settings.purchase_bonus_milli || 0),
    reason: "purchase_bonus",
    referenceType: "order",
    referenceId: order.id,
    note: `Purchase bonus for ${order.order_code || order.id}`,
    idempotencyKey: `purchase-bonus:${order.id}`,
    createdByEmail
  });
}

export function tokenPublicSettings(settings) {
  return {
    name: settings?.token_name || "Zone Tokens",
    symbol: settings?.token_symbol || "ZT",
    earnPerMinuteMilli: Number(settings?.earn_per_minute_milli || 0),
    dailyLimitMinutes: Number(settings?.daily_earning_limit_minutes || 0),
    dailyLoginBonusMilli: Number(settings?.daily_login_bonus_milli || 0),
    purchaseBonusMilli: Number(settings?.purchase_bonus_milli || 0),
    earningEnabled: Number(settings?.earning_enabled || 0) === 1,
    updatedAt: settings?.updated_at || null
  };
}
