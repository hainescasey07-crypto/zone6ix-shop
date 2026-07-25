import {
  cleanText,
  ensureAdminSchema,
  errorResponse,
  json,
  normalizeEmail,
  OWNER_EMAIL,
  requireOwnerUser,
  ROLE_PERMISSIONS
} from "../_lib/common.js";
import { logAdminAction } from "../_lib/site.js";

const ROLES = new Set(["manager", "orders", "store", "support"]);

function adminEmail(value) {
  const email = normalizeEmail(cleanText(value, {
    name: "Admin email",
    min: 3,
    max: 254,
    required: true
  }));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Enter a valid Google account email."), { status: 400 });
  }
  return email;
}

function roleName(value) {
  const role = String(value || "manager").trim().toLowerCase();
  if (!ROLES.has(role)) throw Object.assign(new Error("Choose a valid admin role."), { status: 400 });
  return role;
}

async function listAdmins(db) {
  await ensureAdminSchema(db);
  const result = await db.prepare(`
    SELECT a.email, a.role, a.active, a.created_by_email, a.created_at, a.updated_at,
           CASE WHEN a.email = ? COLLATE NOCASE THEN 'owner' ELSE COALESCE(p.role_name, 'manager') END AS role_name
    FROM site_admins a
    LEFT JOIN admin_role_profiles p ON p.email = a.email COLLATE NOCASE
    WHERE a.active = 1
    ORDER BY CASE a.role WHEN 'owner' THEN 0 ELSE 1 END, datetime(a.created_at) ASC
    LIMIT 100
  `).bind(OWNER_EMAIL).all();
  return (result.results || []).map(row => ({
    ...row,
    permissions: ROLE_PERMISSIONS[row.role_name] || {}
  }));
}

export async function onRequestGet({ request, env }) {
  try {
    await requireOwnerUser(request, env.DB);
    return json({ admins: await listAdmins(env.DB), ownerEmail: OWNER_EMAIL });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const owner = await requireOwnerUser(request, env.DB);
    const body = await request.json().catch(() => ({}));
    const email = adminEmail(body.email);
    const requestedRole = roleName(body.roleName || "manager");

    if (email === OWNER_EMAIL) {
      return json({ admins: await listAdmins(env.DB), alreadyOwner: true });
    }

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO site_admins (
          email, role, active, created_by_email, created_at, updated_at
        ) VALUES (?, 'admin', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
          role = 'admin', active = 1, updated_at = CURRENT_TIMESTAMP
      `).bind(email, owner.email),
      env.DB.prepare(`
        INSERT INTO admin_role_profiles (email, role_name, updated_at, updated_by_email)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(email) DO UPDATE SET
          role_name = excluded.role_name,
          updated_at = CURRENT_TIMESTAMP,
          updated_by_email = excluded.updated_by_email
      `).bind(email, requestedRole, owner.email)
    ]);

    await logAdminAction(env.DB, owner, "admin_access_granted", "admin", email, { roleName: requestedRole });
    return json({ admins: await listAdmins(env.DB), addedEmail: email, roleName: requestedRole }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const owner = await requireOwnerUser(request, env.DB);
    const body = await request.json().catch(() => ({}));
    const email = adminEmail(body.email);
    const requestedRole = roleName(body.roleName);
    if (email === OWNER_EMAIL) throw Object.assign(new Error("The owner role cannot be changed."), { status: 409 });
    const existing = await env.DB.prepare(`SELECT email FROM site_admins WHERE email = ? COLLATE NOCASE AND active = 1`).bind(email).first();
    if (!existing) throw Object.assign(new Error("That email does not currently have admin access."), { status: 404 });

    await env.DB.prepare(`
      INSERT INTO admin_role_profiles (email, role_name, updated_at, updated_by_email)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(email) DO UPDATE SET role_name = excluded.role_name, updated_at = CURRENT_TIMESTAMP, updated_by_email = excluded.updated_by_email
    `).bind(email, requestedRole, owner.email).run();
    await logAdminAction(env.DB, owner, "admin_role_changed", "admin", email, { roleName: requestedRole });
    return json({ admins: await listAdmins(env.DB), updatedEmail: email, roleName: requestedRole });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const owner = await requireOwnerUser(request, env.DB);
    const email = adminEmail(new URL(request.url).searchParams.get("email"));
    if (email === OWNER_EMAIL) {
      throw Object.assign(new Error("The owner account cannot be removed."), { status: 409 });
    }

    const existing = await env.DB.prepare(`
      SELECT email FROM site_admins WHERE email = ? COLLATE NOCASE AND active = 1
    `).bind(email).first();
    if (!existing) {
      throw Object.assign(new Error("That email does not currently have admin access."), { status: 404 });
    }

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM admin_role_profiles WHERE email = ? COLLATE NOCASE`).bind(email),
      env.DB.prepare(`DELETE FROM site_admins WHERE email = ? COLLATE NOCASE AND role <> 'owner'`).bind(email)
    ]);
    await logAdminAction(env.DB, owner, "admin_access_removed", "admin", email, {});

    return json({ admins: await listAdmins(env.DB), removedEmail: email });
  } catch (error) {
    return errorResponse(error);
  }
}
