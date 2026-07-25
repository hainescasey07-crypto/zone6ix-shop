import { errorResponse } from "../_lib/common.js";

export async function onRequestGet({ request, env }) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id || id.length > 100) return new Response("Not found", { status: 404 });
    const row = await env.DB.prepare(`
      SELECT mime_type, image_data, size_bytes, updated_at
      FROM store_item_images WHERE item_id = ?
    `).bind(id).first();
    if (!row) return new Response("Not found", { status: 404 });

    let body = row.image_data;
    if (Array.isArray(body)) body = new Uint8Array(body);
    else if (body && !(body instanceof ArrayBuffer) && !(body instanceof Uint8Array)) {
      body = new Uint8Array(Object.values(body));
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": row.mime_type,
        "Content-Length": String(row.size_bytes || ""),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
