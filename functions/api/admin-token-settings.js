import {
  cleanText,
  errorResponse,
  isAdmin,
  json,
  requireFirebaseUser
} from "../_lib/common.js";
import { getTokenSettings, tokenPublicSettings } from "../_lib/tokens.js";

async function requireAdmin(request) {
  const user = await requireFirebaseUser(request);
  if (!isAdmin(user)) throw Object.assign(new Error("Admin access denied."), { status: 403 });
  return user;
}

function int(value, name, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw Object.assign(new Error(`${name} is invalid.`), { status: 400 });
  }
  return number;
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request);
    return json({ settings: tokenPublicSettings(await getTokenSettings(env.DB)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const name = cleanText(body.name || "Zone Tokens", { name: "Token name", min: 2, max: 40, required: true });
    const symbol = cleanText(body.symbol || "ZT", { name: "Token symbol", min: 1, max: 8, required: true }).toUpperCase();
    const earnPerMinuteMilli = int(body.earnPerMinuteMilli, "Earning rate", 0, 1_000_000);
    const dailyLimitMinutes = int(body.dailyLimitMinutes, "Daily limit", 0, 1440);
    const dailyLoginBonusMilli = int(body.dailyLoginBonusMilli, "Daily login bonus", 0, 100_000_000);
    const purchaseBonusMilli = int(body.purchaseBonusMilli, "Purchase bonus", 0, 100_000_000);
    const earningEnabled = body.earningEnabled === true || Number(body.earningEnabled) === 1 ? 1 : 0;

    await env.DB.prepare(`
      UPDATE token_settings SET
        token_name = ?, token_symbol = ?,
        earn_per_minute_milli = ?, daily_earning_limit_minutes = ?,
        daily_login_bonus_milli = ?, purchase_bonus_milli = ?,
        earning_enabled = ?, updated_at = CURRENT_TIMESTAMP,
        updated_by_email = ?
      WHERE id = 1
    `).bind(
      name, symbol, earnPerMinuteMilli, dailyLimitMinutes,
      dailyLoginBonusMilli, purchaseBonusMilli, earningEnabled, admin.email
    ).run();

    return json({ settings: tokenPublicSettings(await getTokenSettings(env.DB)) });
  } catch (error) {
    return errorResponse(error);
  }
}
