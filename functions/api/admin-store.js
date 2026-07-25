import {
  cleanText,
  errorResponse,
  isAdmin,
  json,
  requireFirebaseUser
} from "../_lib/common.js";
import { parseStoreItem, publicStoreItem, slugify } from "../_lib/store.js";

async function requireAdmin(request) {
  const user = await requireFirebaseUser(request);
  if (!isAdmin(user)) throw Object.assign(new Error("Admin access denied."), { status: 403 });
  return user;
}

async function allItems(db) {
  const result = await db.prepare(`
    SELECT i.*,
      EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image,
      (SELECT COUNT(*) FROM store_redemptions r WHERE r.item_id = i.id AND r.status NOT IN ('cancelled','refunded')) AS redemption_count
    FROM store_items i
    ORDER BY
      CASE i.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
      datetime(i.updated_at) DESC
    LIMIT 250
  `).all();
  return (result.results || []).map(publicStoreItem);
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request);
    return json({ items: await allItems(env.DB) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const item = parseStoreItem(body);
    const id = crypto.randomUUID();
    const baseSlug = slugify(item.name);
    const slug = `${baseSlug}-${id.replaceAll("-", "").slice(0, 6)}`;

    await env.DB.prepare(`
      INSERT INTO store_items (
        id, slug, name, description, category, image_url,
        token_price_milli, cash_price_pence, robux_price,
        stock_total, stock_remaining, max_per_customer,
        starts_at, ends_at, is_limited, status,
        delivery_type, roblox_product_id, delivery_notes,
        created_at, updated_at, created_by_email, updated_by_email
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
    `).bind(
      id, slug, item.name, item.description, item.category,
      item.tokenPriceMilli, item.cashPricePence, item.robuxPrice,
      item.stockTotal, item.stockRemaining, item.maxPerCustomer,
      item.startsAt, item.endsAt, item.isLimited, item.status,
      item.deliveryType, item.robloxProductId, item.deliveryNotes,
      admin.email, admin.email
    ).run();

    const row = await env.DB.prepare(`
      SELECT i.*, 0 AS has_image, 0 AS redemption_count FROM store_items i WHERE i.id = ?
    `).bind(id).first();
    return json({ item: publicStoreItem(row) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const itemId = cleanText(body.itemId, { name: "Item ID", min: 1, max: 100, required: true });
    const existing = await env.DB.prepare("SELECT * FROM store_items WHERE id = ?").bind(itemId).first();
    if (!existing) throw Object.assign(new Error("Store item not found."), { status: 404 });

    const item = parseStoreItem(body);
    await env.DB.prepare(`
      UPDATE store_items SET
        name = ?, description = ?, category = ?,
        token_price_milli = ?, cash_price_pence = ?, robux_price = ?,
        stock_total = ?, stock_remaining = ?, max_per_customer = ?,
        starts_at = ?, ends_at = ?, is_limited = ?, status = ?,
        delivery_type = ?, roblox_product_id = ?, delivery_notes = ?,
        updated_at = CURRENT_TIMESTAMP, updated_by_email = ?
      WHERE id = ?
    `).bind(
      item.name, item.description, item.category,
      item.tokenPriceMilli, item.cashPricePence, item.robuxPrice,
      item.stockTotal, item.stockRemaining, item.maxPerCustomer,
      item.startsAt, item.endsAt, item.isLimited, item.status,
      item.deliveryType, item.robloxProductId, item.deliveryNotes,
      admin.email, itemId
    ).run();

    const row = await env.DB.prepare(`
      SELECT i.*,
        EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image,
        (SELECT COUNT(*) FROM store_redemptions r WHERE r.item_id = i.id AND r.status NOT IN ('cancelled','refunded')) AS redemption_count
      FROM store_items i WHERE i.id = ?
    `).bind(itemId).first();
    return json({ item: publicStoreItem(row) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const admin = await requireAdmin(request);
    const itemId = cleanText(new URL(request.url).searchParams.get("itemId"), { name: "Item ID", min: 1, max: 100, required: true });
    const existing = await env.DB.prepare("SELECT id FROM store_items WHERE id = ?").bind(itemId).first();
    if (!existing) throw Object.assign(new Error("Store item not found."), { status: 404 });
    await env.DB.prepare(`
      UPDATE store_items SET status = 'archived', updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = ?
    `).bind(admin.email, itemId).run();
    return json({ archived: true });
  } catch (error) {
    return errorResponse(error);
  }
}
