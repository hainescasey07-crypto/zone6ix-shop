import {
  cleanText,
  errorResponse,
  json,
  requireFirebaseUser,
  upsertUser
} from "../_lib/common.js";
import { ensureTokenWallet } from "../_lib/tokens.js";
import { redemptionCode } from "../_lib/store.js";

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const itemId = cleanText(body.itemId, { name: "Item", min: 1, max: 100, required: true });
    const quantity = Math.max(1, Math.min(10, Math.trunc(Number(body.quantity) || 1)));
    const profile = await upsertUser(env.DB, user);
    const robloxUsername = cleanText(body.robloxUsername || profile?.roblox_username, {
      name: "Roblox username",
      min: 1,
      max: 50,
      required: true
    });
    await upsertUser(env.DB, user, { robloxUsername });

    const item = await env.DB.prepare(`
      SELECT * FROM store_items WHERE id = ?
    `).bind(itemId).first();
    if (!item) throw Object.assign(new Error("This item no longer exists."), { status: 404 });
    if (!["live", "scheduled"].includes(item.status)) throw Object.assign(new Error("This item is not live right now."), { status: 409 });
    const now = Date.now();
    if (item.starts_at && new Date(item.starts_at).getTime() > now) throw Object.assign(new Error("This drop has not started yet."), { status: 409 });
    if (item.ends_at && new Date(item.ends_at).getTime() <= now) throw Object.assign(new Error("This drop has ended."), { status: 409 });
    if (item.stock_remaining !== null && Number(item.stock_remaining) < quantity) throw Object.assign(new Error("There is not enough stock remaining."), { status: 409 });

    const existingCountRow = await env.DB.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS quantity
      FROM store_redemptions
      WHERE firebase_uid = ? AND item_id = ? AND status NOT IN ('cancelled','refunded')
    `).bind(user.uid, itemId).first();
    const existingCount = Number(existingCountRow?.quantity || 0);
    if (existingCount + quantity > Number(item.max_per_customer || 1)) {
      throw Object.assign(new Error(`You can only redeem ${item.max_per_customer || 1} of this item.`), { status: 409 });
    }

    const wallet = await ensureTokenWallet(env.DB, user.uid);
    const totalPrice = Number(item.token_price_milli || 0) * quantity;
    if (Number(wallet.balance_milli || 0) < totalPrice) {
      throw Object.assign(new Error("You do not have enough Zone Tokens for this item."), { status: 409 });
    }

    const id = crypto.randomUUID();
    const code = redemptionCode();
    const ledgerKey = `redemption:${id}`;

    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO store_redemptions (
          id, redemption_code, firebase_uid, item_id, quantity,
          unit_price_milli, total_price_milli, roblox_username,
          status, created_at, updated_at
        )
        SELECT ?, ?, ?, i.id, ?, i.token_price_milli, i.token_price_milli * ?, ?,
               'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM store_items i
        JOIN token_wallets w ON w.firebase_uid = ?
        WHERE i.id = ?
          AND i.status IN ('live', 'scheduled')
          AND (i.starts_at IS NULL OR datetime(i.starts_at) <= datetime('now'))
          AND (i.ends_at IS NULL OR datetime(i.ends_at) > datetime('now'))
          AND (i.stock_remaining IS NULL OR i.stock_remaining >= ?)
          AND w.balance_milli >= i.token_price_milli * ?
          AND (
            SELECT COALESCE(SUM(r.quantity), 0)
            FROM store_redemptions r
            WHERE r.firebase_uid = ? AND r.item_id = i.id
              AND r.status NOT IN ('cancelled','refunded')
          ) + ? <= i.max_per_customer
      `).bind(id, code, user.uid, quantity, quantity, robloxUsername, user.uid, itemId, quantity, quantity, user.uid, quantity),
      env.DB.prepare(`
        UPDATE token_wallets SET
          balance_milli = balance_milli - ?,
          lifetime_spent_milli = lifetime_spent_milli + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE firebase_uid = ?
          AND EXISTS (SELECT 1 FROM store_redemptions WHERE id = ?)
          AND balance_milli >= ?
      `).bind(totalPrice, totalPrice, user.uid, id, totalPrice),
      env.DB.prepare(`
        UPDATE store_items SET
          stock_remaining = CASE WHEN stock_remaining IS NULL THEN NULL ELSE stock_remaining - ? END,
          status = CASE WHEN stock_remaining IS NOT NULL AND stock_remaining - ? <= 0 THEN 'sold_out' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND EXISTS (SELECT 1 FROM store_redemptions WHERE id = ?)
      `).bind(quantity, quantity, itemId, id),
      env.DB.prepare(`
        INSERT INTO token_ledger (
          firebase_uid, amount_milli, balance_after_milli,
          reason, reference_type, reference_id, note,
          idempotency_key, created_at, created_by_email
        )
        SELECT ?, ?, w.balance_milli, 'store_redemption', 'redemption', ?, ?, ?, CURRENT_TIMESTAMP, 'system'
        FROM token_wallets w
        WHERE w.firebase_uid = ?
          AND EXISTS (SELECT 1 FROM store_redemptions WHERE id = ?)
      `).bind(user.uid, -totalPrice, id, `${quantity} × ${item.name}`, ledgerKey, user.uid, id)
    ]);

    if (Number(results?.[0]?.meta?.changes || 0) < 1) {
      throw Object.assign(new Error("The item changed while you were redeeming it. Refresh and try again."), { status: 409 });
    }

    const [redemption, updatedWallet] = await Promise.all([
      env.DB.prepare(`
        SELECT r.*, i.name AS item_name, i.category
        FROM store_redemptions r JOIN store_items i ON i.id = r.item_id
        WHERE r.id = ?
      `).bind(id).first(),
      ensureTokenWallet(env.DB, user.uid)
    ]);

    return json({
      redemption,
      wallet: {
        balanceMilli: Number(updatedWallet.balance_milli || 0),
        lifetimeEarnedMilli: Number(updatedWallet.lifetime_earned_milli || 0),
        lifetimeSpentMilli: Number(updatedWallet.lifetime_spent_milli || 0)
      }
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
