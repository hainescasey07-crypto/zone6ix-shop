import {
  cleanText,
  errorResponse,
  requireAdminUser,
  json,
} from "../_lib/common.js";
import { parseStoreItem, publicStoreItem, slugify } from "../_lib/store.js";

async function requireAdmin(request, db) {
  return requireAdminUser(request, db);
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
    await requireAdmin(request, env.DB);
    return json({ items: await allItems(env.DB) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request, env.DB);
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
    const admin = await requireAdmin(request, env.DB);
    const body = await request.json().catch(() => ({}));
    const itemId = cleanText(body.itemId, { name: "Item ID", min: 1, max: 100, required: true });
    const existing = await env.DB.prepare("SELECT * FROM store_items WHERE id = ?").bind(itemId).first();
    if (!existing) throw Object.assign(new Error("Store item not found."), { status: 404 });

    if (body.action === "restore") {
      await env.DB.prepare(`
        UPDATE store_items
        SET status = 'draft', updated_at = CURRENT_TIMESTAMP, updated_by_email = ?
        WHERE id = ?
      `).bind(admin.email, itemId).run();

      const restored = await env.DB.prepare(`
        SELECT i.*,
          EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image,
          (SELECT COUNT(*) FROM store_redemptions r WHERE r.item_id = i.id AND r.status NOT IN ('cancelled','refunded')) AS redemption_count
        FROM store_items i WHERE i.id = ?
      `).bind(itemId).first();
      return json({ item: publicStoreItem(restored), restored: true });
    }

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
    const admin = await requireAdmin(request, env.DB);
    const url = new URL(request.url);
    const itemId = cleanText(url.searchParams.get("itemId"), { name: "Item ID", min: 1, max: 100, required: true });
    const mode = url.searchParams.get("mode") === "permanent" ? "permanent" : "archive";
    const existing = await env.DB.prepare("SELECT id, name FROM store_items WHERE id = ?").bind(itemId).first();
    if (!existing) throw Object.assign(new Error("Store item not found."), { status: 404 });

    if (mode === "permanent") {
      const redemptionsResult = await env.DB.prepare(`
        SELECT firebase_uid,
               SUM(CASE WHEN status <> 'refunded' THEN total_price_milli ELSE 0 END) AS refund_milli,
               COUNT(*) AS redemption_count
        FROM store_redemptions
        WHERE item_id = ?
        GROUP BY firebase_uid
      `).bind(itemId).all();

      let redemptionCount = 0;
      let refundedMilli = 0;

      // Refund in small idempotent batches so deleting a popular item does not
      // hit D1's batch-size limits. A retry cannot award the refund twice.
      for (const row of redemptionsResult.results || []) {
        redemptionCount += Number(row.redemption_count || 0);
        const amount = Math.max(0, Number(row.refund_milli || 0));
        if (amount <= 0) continue;
        refundedMilli += amount;
        const key = `item-delete-refund:${itemId}:${row.firebase_uid}`;
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE token_wallets SET
              balance_milli = balance_milli + ?,
              lifetime_spent_milli = MAX(0, lifetime_spent_milli - ?),
              updated_at = CURRENT_TIMESTAMP
            WHERE firebase_uid = ?
              AND NOT EXISTS (SELECT 1 FROM token_ledger WHERE idempotency_key = ?)
          `).bind(amount, amount, row.firebase_uid, key),
          env.DB.prepare(`
            INSERT OR IGNORE INTO token_ledger (
              firebase_uid, amount_milli, balance_after_milli,
              reason, reference_type, reference_id, note,
              idempotency_key, created_at, created_by_email
            )
            SELECT ?, ?, balance_milli, 'item_deleted_refund', 'store_item', ?, ?, ?, CURRENT_TIMESTAMP, ?
            FROM token_wallets WHERE firebase_uid = ?
          `).bind(
            row.firebase_uid,
            amount,
            itemId,
            `Automatic refund because ${existing.name} was permanently deleted`,
            key,
            admin.email,
            row.firebase_uid
          )
        ]);
      }

      await env.DB.batch([
        env.DB.prepare("DELETE FROM store_redemptions WHERE item_id = ?").bind(itemId),
        env.DB.prepare("DELETE FROM store_item_images WHERE item_id = ?").bind(itemId),
        env.DB.prepare("DELETE FROM store_items WHERE id = ?").bind(itemId)
      ]);
      return json({ deleted: true, itemId, redemptionCount, refundedMilli });
    }

    await env.DB.prepare(`
      UPDATE store_items SET status = 'archived', updated_at = CURRENT_TIMESTAMP, updated_by_email = ? WHERE id = ?
    `).bind(admin.email, itemId).run();
    return json({ archived: true, itemId });
  } catch (error) {
    return errorResponse(error);
  }
}
