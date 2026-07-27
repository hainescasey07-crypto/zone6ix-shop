import { cleanText } from "./common.js";

export const DEFAULT_SITE_SETTINGS = {
  siteName: "Zone6ix Customs",
  studioLabel: "CUSTOM STUDIO",
  statusText: "CUSTOM ORDERS OPEN",
  statusOpen: true,
  heroLineOne: "YOUR GANG.",
  heroLineTwo: "YOUR WORLD.",
  heroLineThree: "BUILT DIFFERENT.",
  heroLead: "Premium custom turfs, exclusive weapons and individual player customisation designed for the Zone6ix experience.",
  studioHeading: "More than a shop.",
  studioAccentHeading: "Your gang’s design department.",
  studioLead: "Choose a foundation, add the details, then send your references. Every order is built around your gang instead of copied from a generic preset.",
  turfHeading: "Build a place your gang can own.",
  turfLead: "Pick the scale first. The logo, colours, rooms, layout and references are supplied during checkout.",
  weaponHeading: "Make the loadout part of the brand.",
  weaponLead: "Choose a ready-made metallic finish or commission a weapon built around your colours, logo and 3D writing.",
  playerHeading: "Make your individual player stand out.",
  playerLead: "Customise one player with a name, Roblox-supported emoji and level display.",
  eventHeading: "THE ZONE6IX EVENT STORE.",
  eventLead: "Stay active, earn Zone Tokens and unlock limited items released directly by the Zone6ix team.",
  processHeading: "From idea to in-game.",
  processLead: "A simple order flow with enough detail for your build to come out how you pictured it.",
  orderHeading: "Turn the idea into a real Zone6ix build.",
  orderLead: "Your basket controls the products. This form tells us who the order belongs to and exactly what should be created.",
  primaryCta: "Explore the studio",
  secondaryCta: "Build an order",
  announcementText: "Custom orders are currently open.",
  contactEmail: "hainescasey07@gmail.com",
  contactDisplay: "Discord: Ykzues",
  accentPrimary: "#4bbcff",
  accentSecondary: "#1769ff",
  themePreset: "zone6ix",
  themeBackground: "#05070a",
  themeBackgroundAlt: "#080b10",
  themeSurface: "#0d1219",
  themeSurfaceAlt: "#111821",
  themeNav: "#070a0e",
  themeText: "#f4f8fb",
  themeMuted: "#8f9aa7",
  themeBorder: "#24313d",
  themeGlow: "#35aaff",
  themeSuccess: "#65e5ae",
  themeWarning: "#f2bd5c",
  themeDanger: "#ff667a",
  seasonalEffect: "none",
  seasonalEnabled: false,
  seasonalIntensity: 2,
  seasonalStart: "",
  seasonalEnd: "",
  termsText: "Orders are custom digital services for the Zone6ix Roblox experience. Customers must provide accurate Roblox, Discord and order information. Work begins after payment is confirmed. Delivery time depends on complexity and communication. Requests that are unsafe, unlawful, impossible or unsuitable for Zone6ix may be refused or adjusted.",
  privacyText: "Zone6ix stores the information needed to provide accounts, orders and rewards, including your Google account identifier, email address, display name, Roblox username, Discord username, gang details, order history, token activity and redemption history. Payment card details are handled by Stripe and are not stored by Zone6ix. Information is used only to operate the shop, fulfil orders, prevent abuse and provide support.",
  refundText: "Because products are custom digital work, refunds are considered before work begins or when Zone6ix cannot deliver the agreed order. Completed or substantially started custom work is normally non-refundable. Stripe refunds must be processed before the matching website order is deleted. Zone Tokens have no cash value and cannot be exchanged for money.",
  tokenRulesText: "Zone Tokens are free, non-transferable website rewards with no cash value. Tokens may be earned only while genuinely active on the website and may be limited each day. Automated farming, multiple-account abuse, tampering or exploiting can result in tokens, redemptions or account access being removed. Event items may have limited stock and per-account limits."
};

export const DEFAULT_PRODUCTS = [
  { id: "small-turf", category: "turfs", name: "Small Turf", description: "A compact gang base with custom branding, a clean interior and enough space for a focused crew setup.", cashPricePence: 350, robuxPrice: 350, badge: "STARTER BUILD", accent: "#4bbcff", art: "turf-small", robuxProductId: "3611483762", visible: true, featured: false, sortOrder: 10 },
  { id: "medium-turf", category: "turfs", name: "Medium Turf", description: "A larger gang environment with more usable rooms, stronger street presence and extra custom detailing.", cashPricePence: 700, robuxPrice: 700, badge: "MOST POPULAR", accent: "#67d0ff", art: "turf-medium", robuxProductId: "3611483961", visible: true, featured: true, sortOrder: 20 },
  { id: "large-turf", category: "turfs", name: "Large Turf", description: "A full gang headquarters with multiple spaces, detailed branding and the strongest visual presence.", cashPricePence: 1200, robuxPrice: 1200, badge: "HEADQUARTERS", accent: "#74c6ff", art: "turf-large", robuxProductId: "3611484082", visible: true, featured: false, sortOrder: 30 },
  { id: "second-floor", category: "turfs", name: "Second Floor", description: "Expand an existing turf with another level for extra rooms, storage, meetings or private gang areas.", cashPricePence: 400, robuxPrice: 400, badge: "TURF ADD-ON", accent: "#4aa7e8", art: "turf-floor", robuxProductId: "3611484153", visible: true, featured: false, sortOrder: 40 },
  { id: "gold-uzi", category: "guns", name: "Gold Uzi", description: "A ready-made metallic Uzi finish reserved for your gang and delivered as a premium exclusive loadout.", cashPricePence: 300, robuxPrice: 400, badge: "METALLIC SERIES", accent: "#e6b95c", art: "uzi", robuxProductId: "3611484215", visible: true, featured: false, sortOrder: 50 },
  { id: "gold-draco", category: "guns", name: "Gold Draco", description: "A premium metallic Draco with a stronger silhouette and a high-value gang weapon appearance.", cashPricePence: 400, robuxPrice: 500, badge: "METALLIC SERIES", accent: "#f0c96e", art: "draco", robuxProductId: "3611484270", visible: true, featured: false, sortOrder: 60 },
  { id: "custom-gun", category: "guns", name: "Fully Custom Gun", description: "Choose the weapon direction, material, gang logo, colour treatment and custom 3D writing.", cashPricePence: 700, robuxPrice: 900, badge: "FULL COMMISSION", accent: "#59c7ff", art: "custom-gun", robuxProductId: "3611484308", visible: true, featured: true, sortOrder: 70 },
  { id: "custom-name", category: "identity", name: "Custom Player Name", description: "A custom name display for one individual player, styled to stand out above their character in Zone6ix.", cashPricePence: 200, robuxPrice: 250, badge: "PLAYER NAME", accent: "#69ccff", art: "name", robuxProductId: "3611484376", visible: true, featured: false, sortOrder: 80 },
  { id: "custom-emoji", category: "identity", name: "Custom Player Emoji", description: "Add an emoji beside one individual player’s name. Choose a Roblox-supported emoji that matches their style.", cashPricePence: 200, robuxPrice: 250, badge: "PLAYER EMOJI", accent: "#78d5ff", art: "emoji", robuxProductId: "3611484485", visible: true, featured: false, sortOrder: 90 },
  { id: "custom-level", category: "identity", name: "Custom Player Level", description: "Choose a custom level or status display for one individual player rather than the whole gang.", cashPricePence: 200, robuxPrice: 250, badge: "PLAYER LEVEL", accent: "#55baf0", art: "level", robuxProductId: "3611484625", visible: true, featured: false, sortOrder: 100 },
  { id: "identity-bundle", category: "identity", name: "Player Customisation Bundle", description: "Custom player name, emoji and level together for one individual player at a lower bundle price.", cashPricePence: 500, robuxPrice: 600, badge: "BEST VALUE", accent: "#8adfff", art: "bundle", robuxProductId: "3611484757", visible: true, featured: true, sortOrder: 110 }
];

let siteSchemaPromise = null;

async function tableColumns(db, table) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results || []).map(row => row.name));
}

async function addColumnIfMissing(db, table, column, definition) {
  const columns = await tableColumns(db, table);
  if (!columns.has(column)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

export async function ensureSiteSchema(db) {
  if (!siteSchemaPromise) {
    siteSchemaPromise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          settings_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_by_email TEXT
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS shop_products (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          cash_price_pence INTEGER NOT NULL DEFAULT 0 CHECK (cash_price_pence >= 0),
          robux_price INTEGER NOT NULL DEFAULT 0 CHECK (robux_price >= 0),
          badge TEXT NOT NULL DEFAULT '',
          accent TEXT NOT NULL DEFAULT '#4bbcff',
          art TEXT NOT NULL DEFAULT 'name',
          robux_product_id TEXT NOT NULL DEFAULT '',
          visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
          featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
          sort_order INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_by_email TEXT
        )
      `).run();

      await db.prepare(`
        CREATE TABLE IF NOT EXISTS admin_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_email TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT,
          details_json TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

      await addColumnIfMissing(db, "orders", "gang_shirt_link", "TEXT");
      await addColumnIfMissing(db, "orders", "gang_pants_link", "TEXT");
      await addColumnIfMissing(db, "orders", "gang_group_link", "TEXT");

      await db.prepare(`
        INSERT OR IGNORE INTO site_settings (id, settings_json, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
      `).bind(JSON.stringify(DEFAULT_SITE_SETTINGS)).run();

      const statements = DEFAULT_PRODUCTS.map(product => db.prepare(`
        INSERT OR IGNORE INTO shop_products (
          id, category, name, description, cash_price_pence, robux_price,
          badge, accent, art, robux_product_id, visible, featured, sort_order,
          updated_at, updated_by_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'system')
      `).bind(
        product.id, product.category, product.name, product.description,
        product.cashPricePence, product.robuxPrice, product.badge, product.accent,
        product.art, product.robuxProductId, product.visible ? 1 : 0,
        product.featured ? 1 : 0, product.sortOrder
      ));
      if (statements.length) await db.batch(statements);
    })().catch(error => {
      siteSchemaPromise = null;
      throw error;
    });
  }
  await siteSchemaPromise;
}

function cleanHex(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
}


function cleanChoice(value, allowed, fallback) {
  const text = String(value || "").trim().toLowerCase();
  return allowed.includes(text) ? text : fallback;
}

function cleanDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanEmail(value) {
  const email = cleanText(value, { name: "Contact email", min: 3, max: 254, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Enter a valid contact email."), { status: 400 });
  }
  return email;
}

export function sanitizeSiteSettings(input = {}, existing = DEFAULT_SITE_SETTINGS) {
  const source = { ...DEFAULT_SITE_SETTINGS, ...(existing || {}), ...(input || {}) };
  return {
    siteName: cleanText(source.siteName, { name: "Site name", min: 1, max: 60, required: true }),
    studioLabel: cleanText(source.studioLabel, { name: "Studio label", min: 1, max: 40, required: true }),
    statusText: cleanText(source.statusText, { name: "Status text", min: 1, max: 60, required: true }),
    statusOpen: source.statusOpen !== false && Number(source.statusOpen) !== 0,
    heroLineOne: cleanText(source.heroLineOne, { name: "Hero line one", min: 1, max: 60, required: true }),
    heroLineTwo: cleanText(source.heroLineTwo, { name: "Hero line two", min: 1, max: 60, required: true }),
    heroLineThree: cleanText(source.heroLineThree, { name: "Hero line three", min: 1, max: 60, required: true }),
    heroLead: cleanText(source.heroLead, { name: "Hero description", min: 1, max: 400, required: true }),
    studioHeading: cleanText(source.studioHeading, { name: "Studio heading", min: 1, max: 100, required: true }),
    studioAccentHeading: cleanText(source.studioAccentHeading, { name: "Studio accent heading", min: 1, max: 120, required: true }),
    studioLead: cleanText(source.studioLead, { name: "Studio description", min: 1, max: 500, required: true }),
    turfHeading: cleanText(source.turfHeading, { name: "Turf heading", min: 1, max: 120, required: true }),
    turfLead: cleanText(source.turfLead, { name: "Turf description", min: 1, max: 500, required: true }),
    weaponHeading: cleanText(source.weaponHeading, { name: "Weapon heading", min: 1, max: 120, required: true }),
    weaponLead: cleanText(source.weaponLead, { name: "Weapon description", min: 1, max: 500, required: true }),
    playerHeading: cleanText(source.playerHeading, { name: "Player heading", min: 1, max: 120, required: true }),
    playerLead: cleanText(source.playerLead, { name: "Player description", min: 1, max: 500, required: true }),
    eventHeading: cleanText(source.eventHeading, { name: "Event Store heading", min: 1, max: 120, required: true }),
    eventLead: cleanText(source.eventLead, { name: "Event Store description", min: 1, max: 500, required: true }),
    processHeading: cleanText(source.processHeading, { name: "Process heading", min: 1, max: 120, required: true }),
    processLead: cleanText(source.processLead, { name: "Process description", min: 1, max: 500, required: true }),
    orderHeading: cleanText(source.orderHeading, { name: "Order heading", min: 1, max: 120, required: true }),
    orderLead: cleanText(source.orderLead, { name: "Order description", min: 1, max: 500, required: true }),
    primaryCta: cleanText(source.primaryCta, { name: "Primary button", min: 1, max: 40, required: true }),
    secondaryCta: cleanText(source.secondaryCta, { name: "Secondary button", min: 1, max: 40, required: true }),
    announcementText: cleanText(source.announcementText, { name: "Announcement", max: 180 }),
    contactEmail: cleanEmail(source.contactEmail),
    contactDisplay: cleanText(source.contactDisplay, { name: "Public contact", min: 1, max: 100, required: true }),
    accentPrimary: cleanHex(source.accentPrimary, DEFAULT_SITE_SETTINGS.accentPrimary),
    accentSecondary: cleanHex(source.accentSecondary, DEFAULT_SITE_SETTINGS.accentSecondary),
    themePreset: cleanChoice(source.themePreset, ["zone6ix", "halloween", "christmas", "valentine", "summer", "blackout", "custom"], DEFAULT_SITE_SETTINGS.themePreset),
    themeBackground: cleanHex(source.themeBackground, DEFAULT_SITE_SETTINGS.themeBackground),
    themeBackgroundAlt: cleanHex(source.themeBackgroundAlt, DEFAULT_SITE_SETTINGS.themeBackgroundAlt),
    themeSurface: cleanHex(source.themeSurface, DEFAULT_SITE_SETTINGS.themeSurface),
    themeSurfaceAlt: cleanHex(source.themeSurfaceAlt, DEFAULT_SITE_SETTINGS.themeSurfaceAlt),
    themeNav: cleanHex(source.themeNav, DEFAULT_SITE_SETTINGS.themeNav),
    themeText: cleanHex(source.themeText, DEFAULT_SITE_SETTINGS.themeText),
    themeMuted: cleanHex(source.themeMuted, DEFAULT_SITE_SETTINGS.themeMuted),
    themeBorder: cleanHex(source.themeBorder, DEFAULT_SITE_SETTINGS.themeBorder),
    themeGlow: cleanHex(source.themeGlow, DEFAULT_SITE_SETTINGS.themeGlow),
    themeSuccess: cleanHex(source.themeSuccess, DEFAULT_SITE_SETTINGS.themeSuccess),
    themeWarning: cleanHex(source.themeWarning, DEFAULT_SITE_SETTINGS.themeWarning),
    themeDanger: cleanHex(source.themeDanger, DEFAULT_SITE_SETTINGS.themeDanger),
    seasonalEffect: cleanChoice(source.seasonalEffect, ["none", "halloween", "christmas"], DEFAULT_SITE_SETTINGS.seasonalEffect),
    seasonalEnabled: source.seasonalEnabled === true || Number(source.seasonalEnabled) === 1,
    seasonalIntensity: Math.max(1, Math.min(3, Math.round(Number(source.seasonalIntensity) || DEFAULT_SITE_SETTINGS.seasonalIntensity))),
    seasonalStart: cleanDate(source.seasonalStart),
    seasonalEnd: cleanDate(source.seasonalEnd),
    termsText: cleanText(source.termsText, { name: "Terms", min: 20, max: 12000, required: true }),
    privacyText: cleanText(source.privacyText, { name: "Privacy notice", min: 20, max: 12000, required: true }),
    refundText: cleanText(source.refundText, { name: "Refund policy", min: 20, max: 12000, required: true }),
    tokenRulesText: cleanText(source.tokenRulesText, { name: "Token rules", min: 20, max: 12000, required: true })
  };
}

export async function getSiteSettings(db) {
  await ensureSiteSchema(db);
  const row = await db.prepare("SELECT * FROM site_settings WHERE id = 1").first();
  let parsed = {};
  try { parsed = JSON.parse(row?.settings_json || "{}"); } catch { parsed = {}; }
  return { ...DEFAULT_SITE_SETTINGS, ...parsed };
}

export async function saveSiteSettings(db, settings, adminEmail) {
  const current = await getSiteSettings(db);
  const clean = sanitizeSiteSettings(settings, current);
  await db.prepare(`
    UPDATE site_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = 1
  `).bind(JSON.stringify(clean), adminEmail).run();
  return clean;
}

export function mapShopProduct(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    cashPricePence: Number(row.cash_price_pence || 0),
    cash: Number(row.cash_price_pence || 0) / 100,
    robuxPrice: Number(row.robux_price || 0),
    robux: Number(row.robux_price || 0),
    badge: row.badge || "",
    accent: row.accent || "#4bbcff",
    art: row.art || "name",
    robuxProductId: row.robux_product_id || "",
    visible: Number(row.visible || 0) === 1,
    featured: Number(row.featured || 0) === 1,
    sortOrder: Number(row.sort_order || 0),
    updatedAt: row.updated_at
  };
}

export async function getShopProducts(db, { includeHidden = false } = {}) {
  await ensureSiteSchema(db);
  const result = await db.prepare(`
    SELECT * FROM shop_products
    ${includeHidden ? "" : "WHERE visible = 1"}
    ORDER BY sort_order ASC, id ASC
  `).all();
  return (result.results || []).map(mapShopProduct);
}

export async function saveShopProduct(db, input, adminEmail) {
  await ensureSiteSchema(db);
  const id = cleanText(input.id, { name: "Product ID", min: 1, max: 80, required: true });
  const existing = await db.prepare("SELECT * FROM shop_products WHERE id = ?").bind(id).first();
  if (!existing) throw Object.assign(new Error("That core product does not exist."), { status: 404 });
  const category = cleanText(input.category, { name: "Category", min: 1, max: 30, required: true });
  if (!["turfs", "guns", "identity"].includes(category)) throw Object.assign(new Error("Invalid product category."), { status: 400 });
  const name = cleanText(input.name, { name: "Product name", min: 1, max: 100, required: true });
  const description = cleanText(input.description, { name: "Description", min: 5, max: 1000, required: true });
  const cashPricePence = Math.max(0, Math.round(Number(input.cashPricePence)));
  const robuxPrice = Math.max(0, Math.round(Number(input.robuxPrice)));
  if (!Number.isFinite(cashPricePence) || !Number.isFinite(robuxPrice)) throw Object.assign(new Error("Enter valid prices."), { status: 400 });
  const badge = cleanText(input.badge, { name: "Badge", max: 40 });
  const accent = cleanHex(input.accent, existing.accent || "#4bbcff");
  const robuxProductId = cleanText(input.robuxProductId, { name: "Roblox Product ID", max: 40 });
  if (robuxProductId && !/^\d+$/.test(robuxProductId)) throw Object.assign(new Error("Roblox Product ID must contain numbers only."), { status: 400 });
  const sortOrder = Math.max(0, Math.min(9999, Math.round(Number(input.sortOrder) || 0)));
  const visible = input.visible === true || Number(input.visible) === 1 ? 1 : 0;
  const featured = input.featured === true || Number(input.featured) === 1 ? 1 : 0;

  await db.prepare(`
    UPDATE shop_products SET
      category = ?, name = ?, description = ?, cash_price_pence = ?, robux_price = ?,
      badge = ?, accent = ?, robux_product_id = ?, visible = ?, featured = ?, sort_order = ?,
      updated_at = CURRENT_TIMESTAMP, updated_by_email = ?
    WHERE id = ?
  `).bind(category, name, description, cashPricePence, robuxPrice, badge, accent, robuxProductId, visible, featured, sortOrder, adminEmail, id).run();

  return mapShopProduct(await db.prepare("SELECT * FROM shop_products WHERE id = ?").bind(id).first());
}

export async function aggregateShopProducts(db, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) throw Object.assign(new Error("Add at least one product."), { status: 400 });
  if (productIds.length > 30) throw Object.assign(new Error("Too many products in one order."), { status: 400 });
  const quantities = new Map();
  for (const rawId of productIds) {
    const id = String(rawId || "");
    quantities.set(id, (quantities.get(id) || 0) + 1);
  }
  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(",");
  await ensureSiteSchema(db);
  const result = await db.prepare(`SELECT * FROM shop_products WHERE id IN (${placeholders}) AND visible = 1`).bind(...ids).all();
  const rows = new Map((result.results || []).map(row => [row.id, row]));
  return ids.map(id => {
    const row = rows.get(id);
    if (!row) throw Object.assign(new Error(`Product ${id || "missing"} is unavailable.`), { status: 400 });
    return {
      id,
      quantity: quantities.get(id),
      name: row.name,
      cashPence: Number(row.cash_price_pence || 0),
      robux: Number(row.robux_price || 0),
      robuxProductId: row.robux_product_id || ""
    };
  });
}

export async function logAdminAction(db, admin, action, targetType, targetId = "", details = {}) {
  try {
    await ensureSiteSchema(db);
    await db.prepare(`
      INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(admin?.email || "system", action, targetType, targetId || "", JSON.stringify(details || {})).run();
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
