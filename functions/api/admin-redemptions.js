import {
  cleanText,
  errorResponse,
  isAdmin,
  json,
  requireFirebaseUser
} from "../_lib/common.js";
import { REDEMPTION_STATUSES } from "../_lib/store.js";

async function requireAdmin(request) {
  const user = await requireFirebaseUser(request);
  if (!isAdmin(user)) throw Object.assign(new Error("Admin access denied."), { status: 403 });
  return user;
}

async function getRedemption(db, id) {
  return db.prepare(`
    SELECT r.*, i.name AS item_name, i.category, i.delivery_type, i.roblox_product_id,
           u.email, u.display_name, u.discord_username, u.gang_name,
           EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image
    FROM store_redemptions r
    JOIN store_items i ON i.id = r.item_id
    JOIN users u ON u.firebase_uid = r.firebase_uid
    WHERE r.id = ?
  `).bind(id).first();
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request);
    const result = await env.DB.prepare(`
      SELECT r.*, i.name AS item_name, i.category, i.delivery_type, i.roblox_product_id,
             u.email, u.display_name, u.discord_username, u.gang_name,
             EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image
      FROM store_redemptions r
      JOIN store_items i ON i.id = r.item_id
      JOIN users u ON u.firebase_uid = r.firebase_uid
      ORDER BY datetime(r.created_at) DESC
      LIMIT 300
    `).all();
    return json({ redemptions: result.results || [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const redemptionId = cleanText(body.redemptionId, { name: "Redemption ID", min: 1, max: 100, required: true });
    const status = cleanText(body.status, { name: "Status", min: 1, max: 30, required: true });
    if (!REDEMPTION_STATUSES.has(status)) throw Object.assign(new Error("Invalid redemption status."), { status: 400 });
    const customerUpdate = cleanText(body.customerUpdate, { name: "Customer update", max: 1500 });
    const adminPrivateNote = cleanText(body.adminPrivateNote, { name: "Private note", max: 2500 });
    const existing = await getRedemption(env.DB, redemptionId);
    if (!existing) throw Object.assign(new Error("Redemption not found."), { status: 404 });

    const statements = [env.DB.prepare(`
      UPDATE store_redemptions SET
        status = ?, customer_update = ?, admin_private_note = ?,
        delivered_at = CASE WHEN ? = 'delivered' THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE delivered_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, customerUpdate, adminPrivateNote, status, redemptionId)];

    if (status === "refunded" && existing.status !== "refunded") {
      const amount = Number(existing.total_price_milli || 0);
      const key = `redemption-refund:${redemptionId}`;
      statements.push(
        env.DB.prepare(`
          UPDATE token_wallets SET
            balance_milli = balance_milli + ?,
            lifetime_spent_milli = MAX(0, lifetime_spent_milli - ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE firebase_uid = ?
            AND NOT EXISTS (SELECT 1 FROM token_ledger WHERE idempotency_key = ?)
        `).bind(amount, amount, existing.firebase_uid, key),
        env.DB.prepare(`
          UPDATE store_items SET
            stock_remaining = CASE
              WHEN stock_remaining IS NULL THEN NULL
              WHEN stock_total IS NULL THEN stock_remaining + ?
              ELSE MIN(stock_total, stock_remaining + ?)
            END,
            status = CASE WHEN status = 'sold_out' THEN 'live' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND NOT EXISTS (SELECT 1 FROM token_ledger WHERE idempotency_key = ?)
        `).bind(Number(existing.quantity || 1), Number(existing.quantity || 1), existing.item_id, key),
        env.DB.prepare(`
          INSERT OR IGNORE INTO token_ledger (
            firebase_uid, amount_milli, balance_after_milli,
            reason, reference_type, reference_id, note,
            idempotency_key, created_at, created_by_email
          )
          SELECT ?, ?, balance_milli, 'redemption_refund', 'redemption', ?, ?, ?, CURRENT_TIMESTAMP, ?
          FROM token_wallets WHERE firebase_uid = ?
        `).bind(existing.firebase_uid, amount, redemptionId, `Refund for ${existing.item_name}`, key, admin.email, existing.firebase_uid)
      );
    }

    await env.DB.batch(statements);
    return json({ redemption: await getRedemption(env.DB, redemptionId) });
  } catch (error) {
    return errorResponse(error);
  }
}
