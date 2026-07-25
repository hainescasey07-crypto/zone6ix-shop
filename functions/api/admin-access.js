import {
  cleanText,
  ensureAdminSchema,
  errorResponse,
  json,
  normalizeEmail,
  OWNER_EMAIL,
  requireOwnerUser
} from "../_lib/common.js";

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

async function listAdmins(db) {
  await ensureAdminSchema(db);
  const result = await db.prepare(`
    SELECT email, role, active, created_by_email, created_at, updated_at
    FROM site_admins
    WHERE active = 1
    ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, datetime(created_at) ASC
    LIMIT 100
  `).all();
  return result.results || [];
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

    if (email === OWNER_EMAIL) {
      return json({ admins: await listAdmins(env.DB), alreadyOwner: true });
    }

    await env.DB.prepare(`
      INSERT INTO site_admins (
        email, role, active, created_by_email, created_at, updated_at
      ) VALUES (?, 'admin', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        role = 'admin',
        active = 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(email, owner.email).run();

    return json({ admins: await listAdmins(env.DB), addedEmail: email }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await requireOwnerUser(request, env.DB);
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

    await env.DB.prepare(`
      DELETE FROM site_admins
      WHERE email = ? COLLATE NOCASE AND role <> 'owner'
    `).bind(email).run();

    return json({ admins: await listAdmins(env.DB), removedEmail: email });
  } catch (error) {
    return errorResponse(error);
  }
}
