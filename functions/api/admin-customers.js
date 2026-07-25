import {
  cleanText,
  errorResponse,
  requireAdminUser,
  json,
} from "../_lib/common.js";
import { ensureTokenWallet } from "../_lib/tokens.js";

async function requireAdmin(request, db) {
  return requireAdminUser(request, db);
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env.DB);
    const result = await env.DB.prepare(`
      SELECT u.firebase_uid, u.email, u.display_name, u.photo_url,
             u.roblox_username, u.discord_username, u.gang_name,
             u.created_at, u.updated_at,
             COALESCE(w.balance_milli, 0) AS balance_milli,
             COALESCE(w.lifetime_earned_milli, 0) AS lifetime_earned_milli,
             COALESCE(w.lifetime_spent_milli, 0) AS lifetime_spent_milli,
             (SELECT COUNT(*) FROM orders o WHERE o.firebase_uid = u.firebase_uid) AS order_count,
             (SELECT COUNT(*) FROM store_redemptions r WHERE r.firebase_uid = u.firebase_uid) AS redemption_count
      FROM users u
      LEFT JOIN token_wallets w ON w.firebase_uid = u.firebase_uid
      ORDER BY datetime(u.updated_at) DESC
      LIMIT 300
    `).all();
    return json({ customers: result.results || [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(request, env.DB);
    const body = await request.json().catch(() => ({}));
    const uid = cleanText(body.uid, { name: "Customer ID", min: 1, max: 150, required: true });
    const deltaMilli = Math.trunc(Number(body.deltaMilli));
    if (!Number.isInteger(deltaMilli) || deltaMilli === 0 || Math.abs(deltaMilli) > 100_000_000) {
      throw Object.assign(new Error("Enter a valid token adjustment."), { status: 400 });
    }
    const note = cleanText(body.note, { name: "Adjustment note", min: 2, max: 500, required: true });
    const customer = await env.DB.prepare("SELECT firebase_uid FROM users WHERE firebase_uid = ?").bind(uid).first();
    if (!customer) throw Object.assign(new Error("Customer not found."), { status: 404 });
    const wallet = await ensureTokenWallet(env.DB, uid);
    if (Number(wallet.balance_milli || 0) + deltaMilli < 0) {
      throw Object.assign(new Error("This adjustment would make the balance negative."), { status: 409 });
    }
    const key = `admin-adjust:${crypto.randomUUID()}`;
    const newBalance = Number(wallet.balance_milli || 0) + deltaMilli;

    await env.DB.batch([
      env.DB.prepare(`
        UPDATE token_wallets SET
          balance_milli = balance_milli + ?,
          lifetime_earned_milli = lifetime_earned_milli + CASE WHEN ? > 0 THEN ? ELSE 0 END,
          lifetime_spent_milli = lifetime_spent_milli + CASE WHEN ? < 0 THEN ABS(?) ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE firebase_uid = ?
      `).bind(deltaMilli, deltaMilli, deltaMilli, deltaMilli, deltaMilli, uid),
      env.DB.prepare(`
        INSERT INTO token_ledger (
          firebase_uid, amount_milli, balance_after_milli,
          reason, reference_type, reference_id, note,
          idempotency_key, created_at, created_by_email
        ) VALUES (?, ?, ?, 'admin_adjustment', 'admin', ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `).bind(uid, deltaMilli, newBalance, admin.email, note, key, admin.email)
    ]);

    return json({ wallet: await ensureTokenWallet(env.DB, uid) });
  } catch (error) {
    return errorResponse(error);
  }
}
