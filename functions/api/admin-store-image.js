import {
  cleanText,
  errorResponse,
  isAdmin,
  json,
  requireFirebaseUser
} from "../_lib/common.js";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 1_500_000;

async function requireAdmin(request) {
  const user = await requireFirebaseUser(request);
  if (!isAdmin(user)) throw Object.assign(new Error("Admin access denied."), { status: 403 });
  return user;
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAdmin(request);
    const form = await request.formData();
    const itemId = cleanText(form.get("itemId"), { name: "Item ID", min: 1, max: 100, required: true });
    const image = form.get("image");
    if (!(image instanceof File)) throw Object.assign(new Error("Choose an image to upload."), { status: 400 });
    if (!TYPES.has(image.type)) throw Object.assign(new Error("Use a JPG, PNG or WebP image."), { status: 400 });
    if (image.size <= 0 || image.size > MAX_BYTES) throw Object.assign(new Error("The image must be smaller than 1.5 MB."), { status: 400 });
    const item = await env.DB.prepare("SELECT id FROM store_items WHERE id = ?").bind(itemId).first();
    if (!item) throw Object.assign(new Error("Store item not found."), { status: 404 });

    const bytes = new Uint8Array(await image.arrayBuffer());
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO store_item_images (item_id, mime_type, image_data, size_bytes, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(item_id) DO UPDATE SET
          mime_type = excluded.mime_type,
          image_data = excluded.image_data,
          size_bytes = excluded.size_bytes,
          updated_at = CURRENT_TIMESTAMP
      `).bind(itemId, image.type, bytes, image.size),
      env.DB.prepare(`
        UPDATE store_items SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(`/api/store-image?id=${itemId}`, itemId)
    ]);

    return json({ imageUrl: `/api/store-image?id=${encodeURIComponent(itemId)}&v=${Date.now()}` });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await requireAdmin(request);
    const itemId = cleanText(new URL(request.url).searchParams.get("itemId"), { name: "Item ID", min: 1, max: 100, required: true });
    await env.DB.batch([
      env.DB.prepare("DELETE FROM store_item_images WHERE item_id = ?").bind(itemId),
      env.DB.prepare("UPDATE store_items SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(itemId)
    ]);
    return json({ removed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
