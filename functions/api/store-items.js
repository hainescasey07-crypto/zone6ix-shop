import { errorResponse, json } from "../_lib/common.js";
import { publicStoreItem } from "../_lib/store.js";

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT i.*,
        EXISTS(SELECT 1 FROM store_item_images img WHERE img.item_id = i.id) AS has_image,
        (SELECT COUNT(*) FROM store_redemptions r WHERE r.item_id = i.id AND r.status NOT IN ('cancelled','refunded')) AS redemption_count
      FROM store_items i
      WHERE i.status IN ('live', 'scheduled')
        AND (i.starts_at IS NULL OR datetime(i.starts_at) <= datetime('now'))
        AND (i.ends_at IS NULL OR datetime(i.ends_at) > datetime('now'))
        AND (i.stock_remaining IS NULL OR i.stock_remaining > 0)
      ORDER BY i.is_limited DESC, datetime(i.starts_at) DESC, datetime(i.created_at) DESC
      LIMIT 100
    `).all();

    return json({ items: (result.results || []).map(publicStoreItem) });
  } catch (error) {
    return errorResponse(error);
  }
}
