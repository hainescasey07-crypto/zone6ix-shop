import {
  errorResponse,
  getAdminAccess,
  json,
  mapUserRow,
  requireFirebaseUser,
  upsertUser
} from "../_lib/common.js";

async function accountResponse(env, user, profile = {}) {
  const row = await upsertUser(env.DB, user, profile);
  const access = await getAdminAccess(env.DB, user);
  return json({
    user: mapUserRow(row),
    isAdmin: access.isAdmin,
    isOwner: access.isOwner,
    adminRole: access.role
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    return await accountResponse(env, user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    return await accountResponse(env, user, {
      robloxUsername: body.robloxUsername,
      discordUsername: body.discordUsername,
      gangName: body.gangName
    });
  } catch (error) {
    return errorResponse(error);
  }
}
