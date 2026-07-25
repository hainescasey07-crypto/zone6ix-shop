import {
  cleanText,
  errorResponse,
  hydrateOrders,
  requireAdminUser,
  json,
} from "../_lib/common.js";
import { awardPurchaseBonus } from "../_lib/tokens.js";

const ORDER_STATUSES = new Set(["awaiting_payment", "paid", "reviewing", "in_progress", "ready", "completed", "cancelled"]);
const PAYMENT_STATUSES = new Set(["unpaid", "pending", "paid", "failed", "refunded", "robux_pending", "robux_verified"]);

async function requireAdmin(request, db) {
  return requireAdminUser(request, db);
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env.DB);
    const result = await env.DB.prepare(`
      SELECT o.*, u.photo_url AS account_photo_url, u.display_name AS account_display_name
      FROM orders o
      LEFT JOIN users u ON u.firebase_uid = o.firebase_uid
      ORDER BY datetime(o.created_at) DESC
      LIMIT 250
    `).all();
    return json({ orders: await hydrateOrders(env.DB, result.results || []) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(request, env.DB);
    const body = await request.json();
    const orderId = cleanText(body.orderId, { name: "Order ID", min: 1, max: 100, required: true });
    const orderStatus = cleanText(body.orderStatus, { name: "Order status", min: 1, max: 40, required: true });
    const paymentStatus = cleanText(body.paymentStatus, { name: "Payment status", min: 1, max: 40, required: true });
    const customerUpdate = cleanText(body.customerUpdate, { name: "Customer update", max: 1500 });
    const adminPrivateNote = cleanText(body.adminPrivateNote, { name: "Private note", max: 2500 });

    if (!ORDER_STATUSES.has(orderStatus)) throw Object.assign(new Error("Invalid order status."), { status: 400 });
    if (!PAYMENT_STATUSES.has(paymentStatus)) throw Object.assign(new Error("Invalid payment status."), { status: 400 });

    const existing = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
    if (!existing) throw Object.assign(new Error("Order not found."), { status: 404 });

    const statements = [
      env.DB.prepare(`
        UPDATE orders SET
          order_status = ?,
          payment_status = ?,
          customer_update = ?,
          admin_private_note = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(orderStatus, paymentStatus, customerUpdate, adminPrivateNote, orderId)
    ];

    const updateChanged = customerUpdate && customerUpdate !== String(existing.customer_update || "");
    const statusChanged = orderStatus !== existing.order_status;
    if (updateChanged || statusChanged) {
      const message = customerUpdate || `Order status changed to ${orderStatus.replaceAll("_", " ")}.`;
      statements.push(env.DB.prepare(`
        INSERT INTO order_updates (
          order_id, status, message, visible_to_customer, created_by_email
        ) VALUES (?, ?, ?, 1, ?)
      `).bind(orderId, orderStatus, message, admin.email));
    }

    await env.DB.batch(statements);
    if (["paid", "robux_verified"].includes(paymentStatus) && !["paid", "robux_verified"].includes(existing.payment_status)) {
      await awardPurchaseBonus(env.DB, existing, admin.email);
    }
    const row = await env.DB.prepare(`
      SELECT o.*, u.photo_url AS account_photo_url, u.display_name AS account_display_name
      FROM orders o
      LEFT JOIN users u ON u.firebase_uid = o.firebase_uid
      WHERE o.id = ?
    `).bind(orderId).first();
    const [order] = await hydrateOrders(env.DB, row ? [row] : []);
    return json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function onRequestDelete({ request, env }) {
  try {
    await requireAdmin(request, env.DB);
    const url = new URL(request.url);
    const orderId = cleanText(url.searchParams.get("orderId"), {
      name: "Order ID",
      min: 1,
      max: 100,
      required: true
    });

    const existing = await env.DB.prepare(`
      SELECT id, order_code FROM orders WHERE id = ?
    `).bind(orderId).first();
    if (!existing) {
      throw Object.assign(new Error("Order not found."), { status: 404 });
    }

    await env.DB.batch([
      env.DB.prepare("DELETE FROM order_updates WHERE order_id = ?").bind(orderId),
      env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
      env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(orderId)
    ]);

    return json({
      deleted: true,
      orderId,
      orderCode: existing.order_code
    });
  } catch (error) {
    return errorResponse(error);
  }
}
