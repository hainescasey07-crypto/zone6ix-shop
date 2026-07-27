const FIREBASE_WEB_API_KEY = "AIzaSyApYiotTOTsFFFL2H6lsxeNeEC5CjMuvXo";
export const OWNER_EMAIL = "hainescasey07@gmail.com";
export const ADMIN_EMAIL = OWNER_EMAIL;

export const PRODUCTS = {
  "small-turf": { name: "Small Turf", cashPence: 350, robux: 350 },
  "medium-turf": { name: "Medium Turf", cashPence: 700, robux: 700 },
  "large-turf": { name: "Large Turf", cashPence: 1200, robux: 1200 },
  "second-floor": { name: "Second Floor", cashPence: 400, robux: 400 },
  "gold-uzi": { name: "Gold Uzi", cashPence: 300, robux: 400 },
  "gold-draco": { name: "Gold Draco", cashPence: 400, robux: 500 },
  "custom-gun": { name: "Fully Custom Gun", cashPence: 700, robux: 900 },
  "custom-name": { name: "Custom Player Name", cashPence: 200, robux: 250 },
  "custom-emoji": { name: "Custom Player Emoji", cashPence: 200, robux: 250 },
  "custom-level": { name: "Custom Player Level", cashPence: 200, robux: 250 },
  "identity-bundle": { name: "Player Customisation Bundle", cashPence: 500, robux: 600 }
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export function cleanText(value, { name = "Value", max = 500, min = 0, required = false } = {}) {
  const text = String(value ?? "").trim();
  if ((required || min > 0) && text.length < Math.max(min, 1)) {
    throw new Error(`${name} is required.`);
  }
  if (text.length > max) throw new Error(`${name} is too long.`);
  return text;
}

export function cleanReferenceLink(value) {
  const text = cleanText(value, { name: "Reference link", max: 800 });
  if (!text || text === "None provided") return "";
  let url;
  try { url = new URL(text); } catch { throw new Error("Reference link must be a valid URL."); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Reference link must begin with http or https.");
  return url.toString();
}

export function aggregateProducts(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) throw new Error("Add at least one product.");
  if (productIds.length > 30) throw new Error("Too many products in one order.");
  const quantities = new Map();
  for (const rawId of productIds) {
    const id = String(rawId || "");
    if (!PRODUCTS[id]) throw new Error(`Unknown product: ${id || "missing"}`);
    quantities.set(id, (quantities.get(id) || 0) + 1);
  }
  return [...quantities.entries()].map(([id, quantity]) => ({ id, quantity, ...PRODUCTS[id] }));
}

export function makeOrderIdentity() {
  const id = crypto.randomUUID();
  const time = Date.now().toString(36).toUpperCase();
  const random = id.replaceAll("-", "").slice(0, 6).toUpperCase();
  return { id, orderCode: `Z6-${time}-${random}` };
}

export async function requireFirebaseUser(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("Sign in with Google to continue."), { status: 401 });

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: match[1] })
  });

  if (!response.ok) {
    throw Object.assign(new Error("Your Google session has expired. Sign in again."), { status: 401 });
  }

  const data = await response.json();
  const record = data.users?.[0];
  if (!record?.localId || record.disabled) {
    throw Object.assign(new Error("This account cannot be used."), { status: 401 });
  }

  return {
    uid: record.localId,
    email: String(record.email || "").toLowerCase(),
    emailVerified: Boolean(record.emailVerified),
    displayName: String(record.displayName || ""),
    photoUrl: String(record.photoUrl || "")
  };
}

let adminSchemaPromise = null;

export const ROLE_PERMISSIONS = {
  owner: {
    viewOrders: true, manageOrders: true, deleteOrders: true,
    manageStore: true, manageRedemptions: true, manageTokens: true,
    viewCustomers: true, manageCustomers: true, manageSite: true,
    viewChat: true, manageChat: true,
    exportData: true, viewAudit: true, manageAdmins: true
  },
  manager: {
    viewOrders: true, manageOrders: true, deleteOrders: true,
    manageStore: true, manageRedemptions: true, manageTokens: true,
    viewCustomers: true, manageCustomers: true, manageSite: true,
    viewChat: true, manageChat: true,
    exportData: true, viewAudit: true, manageAdmins: false
  },
  orders: {
    viewOrders: true, manageOrders: true, deleteOrders: false,
    manageStore: false, manageRedemptions: false, manageTokens: false,
    viewCustomers: true, manageCustomers: false, manageSite: false,
    viewChat: true, manageChat: true,
    exportData: true, viewAudit: false, manageAdmins: false
  },
  store: {
    viewOrders: false, manageOrders: false, deleteOrders: false,
    manageStore: true, manageRedemptions: true, manageTokens: false,
    viewCustomers: true, manageCustomers: false, manageSite: false,
    viewChat: true, manageChat: true,
    exportData: true, viewAudit: false, manageAdmins: false
  },
  support: {
    viewOrders: true, manageOrders: false, deleteOrders: false,
    manageStore: false, manageRedemptions: false, manageTokens: false,
    viewCustomers: true, manageCustomers: false, manageSite: false,
    viewChat: true, manageChat: true,
    exportData: false, viewAudit: false, manageAdmins: false
  }
};

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isOwner(user) {
  return normalizeEmail(user?.email) === OWNER_EMAIL;
}

export async function ensureAdminSchema(db) {
  if (!adminSchemaPromise) {
    adminSchemaPromise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS site_admins (
          email TEXT PRIMARY KEY COLLATE NOCASE,
          role TEXT NOT NULL DEFAULT 'admin'
            CHECK (role IN ('owner', 'admin')),
          active INTEGER NOT NULL DEFAULT 1
            CHECK (active IN (0, 1)),
          created_by_email TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS admin_role_profiles (
          email TEXT PRIMARY KEY COLLATE NOCASE,
          role_name TEXT NOT NULL DEFAULT 'manager'
            CHECK (role_name IN ('owner', 'manager', 'orders', 'store', 'support')),
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_by_email TEXT
        )
      `).run();

      await db.prepare(`
        INSERT INTO site_admins (
          email, role, active, created_by_email, created_at, updated_at
        ) VALUES (?, 'owner', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
          role = 'owner', active = 1, updated_at = CURRENT_TIMESTAMP
      `).bind(OWNER_EMAIL, OWNER_EMAIL).run();

      await db.prepare(`
        INSERT INTO admin_role_profiles (email, role_name, updated_at, updated_by_email)
        VALUES (?, 'owner', CURRENT_TIMESTAMP, ?)
        ON CONFLICT(email) DO UPDATE SET role_name = 'owner', updated_at = CURRENT_TIMESTAMP
      `).bind(OWNER_EMAIL, OWNER_EMAIL).run();
    })().catch(error => {
      adminSchemaPromise = null;
      throw error;
    });
  }
  await adminSchemaPromise;
}

export async function getAdminAccess(db, user) {
  const email = normalizeEmail(user?.email);
  if (!email || !user?.emailVerified) {
    return { isAdmin: false, isOwner: false, role: null, permissions: {} };
  }
  if (email === OWNER_EMAIL) {
    return { isAdmin: true, isOwner: true, role: "owner", permissions: ROLE_PERMISSIONS.owner };
  }

  await ensureAdminSchema(db);
  const row = await db.prepare(`
    SELECT a.role, a.active, COALESCE(p.role_name, 'manager') AS role_name
    FROM site_admins a
    LEFT JOIN admin_role_profiles p ON p.email = a.email COLLATE NOCASE
    WHERE a.email = ? COLLATE NOCASE
    LIMIT 1
  `).bind(email).first();

  const allowed = Number(row?.active || 0) === 1 && row?.role === "admin";
  const role = allowed && ROLE_PERMISSIONS[row?.role_name] ? row.role_name : (allowed ? "manager" : null);
  return {
    isAdmin: allowed,
    isOwner: false,
    role,
    permissions: role ? ROLE_PERMISSIONS[role] : {}
  };
}

export async function isAdmin(user, db) {
  return (await getAdminAccess(db, user)).isAdmin;
}

export async function requireAdminUser(request, db) {
  const user = await requireFirebaseUser(request);
  const access = await getAdminAccess(db, user);
  if (!access.isAdmin) throw Object.assign(new Error("Admin access denied."), { status: 403 });
  return { ...user, adminRole: access.role, isOwner: access.isOwner, permissions: access.permissions };
}

export async function requirePermission(request, db, permission) {
  const user = await requireAdminUser(request, db);
  if (!user.permissions?.[permission]) {
    throw Object.assign(new Error("Your admin role does not allow this action."), { status: 403 });
  }
  return user;
}

export async function requireOwnerUser(request, db) {
  const user = await requireFirebaseUser(request);
  if (!isOwner(user) || !user.emailVerified) {
    throw Object.assign(new Error("Owner access required."), { status: 403 });
  }
  await ensureAdminSchema(db);
  return { ...user, adminRole: "owner", isOwner: true, permissions: ROLE_PERMISSIONS.owner };
}

export async function upsertUser(db, user, profile = {}) {
  const robloxUsername = cleanText(profile.robloxUsername, { name: "Roblox username", max: 50 });
  const discordUsername = cleanText(profile.discordUsername, { name: "Discord username", max: 80 });
  const gangName = cleanText(profile.gangName, { name: "Gang name", max: 100 });

  await db.prepare(`
    INSERT INTO users (
      firebase_uid, email, display_name, photo_url,
      roblox_username, discord_username, gang_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(firebase_uid) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      photo_url = excluded.photo_url,
      roblox_username = CASE WHEN excluded.roblox_username <> '' THEN excluded.roblox_username ELSE users.roblox_username END,
      discord_username = CASE WHEN excluded.discord_username <> '' THEN excluded.discord_username ELSE users.discord_username END,
      gang_name = CASE WHEN excluded.gang_name <> '' THEN excluded.gang_name ELSE users.gang_name END,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    user.uid,
    user.email,
    user.displayName,
    user.photoUrl,
    robloxUsername,
    discordUsername,
    gangName
  ).run();

  return db.prepare(`
    SELECT firebase_uid, email, display_name, photo_url,
           roblox_username, discord_username, gang_name, created_at, updated_at
    FROM users WHERE firebase_uid = ?
  `).bind(user.uid).first();
}

export function mapUserRow(row) {
  if (!row) return null;
  return {
    uid: row.firebase_uid,
    email: row.email,
    displayName: row.display_name || "",
    photoUrl: row.photo_url || "",
    robloxUsername: row.roblox_username || "",
    discordUsername: row.discord_username || "",
    gangName: row.gang_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function parseCustomer(body = {}) {
  const customer = body.customer || {};
  return {
    robloxUsername: cleanText(customer.robloxUsername, { name: "Roblox username", min: 1, max: 50, required: true }),
    discordUsername: cleanText(customer.discordUsername, { name: "Discord username", min: 1, max: 80, required: true }),
    gangName: cleanText(customer.gangName, { name: "Gang name", min: 1, max: 100, required: true }),
    customRequest: cleanText(customer.customRequest, { name: "Custom request", max: 3000 }) || "No custom request provided.",
    referenceLink: cleanReferenceLink(customer.referenceLink),
    gangShirtLink: cleanReferenceLink(customer.gangShirtLink),
    gangPantsLink: cleanReferenceLink(customer.gangPantsLink),
    gangGroupLink: cleanReferenceLink(customer.gangGroupLink)
  };
}

export async function hydrateOrders(db, rows) {
  const orders = Array.isArray(rows) ? rows : [];
  if (!orders.length) return [];
  const ids = orders.map(order => order.id);
  const placeholders = ids.map(() => "?").join(",");

  const [itemsResult, updatesResult] = await Promise.all([
    db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`).bind(...ids).all(),
    db.prepare(`SELECT * FROM order_updates WHERE order_id IN (${placeholders}) ORDER BY created_at ASC, id ASC`).bind(...ids).all()
  ]);

  const itemsByOrder = new Map();
  for (const item of itemsResult.results || []) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }

  const updatesByOrder = new Map();
  for (const update of updatesResult.results || []) {
    if (!updatesByOrder.has(update.order_id)) updatesByOrder.set(update.order_id, []);
    updatesByOrder.get(update.order_id).push(update);
  }

  return orders.map(order => ({
    ...order,
    items: itemsByOrder.get(order.id) || [],
    updates: updatesByOrder.get(order.id) || []
  }));
}

export function errorResponse(error) {
  console.error(error);
  return json({ error: error?.message || "Unexpected server error." }, Number(error?.status) || 500);
}
