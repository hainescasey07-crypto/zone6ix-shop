import { errorResponse, isAdmin, json, mapUserRow, requireFirebaseUser, upsertUser } from "../_lib/common.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const row = await upsertUser(env.DB, user);
    return json({ user: mapUserRow(row), isAdmin: isAdmin(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const row = await upsertUser(env.DB, user, {
      robloxUsername: body.robloxUsername,
      discordUsername: body.discordUsername,
      gangName: body.gangName
    });
    return json({ user: mapUserRow(row), isAdmin: isAdmin(user) });
  } catch (error) {
    return errorResponse(error);
  }
}
