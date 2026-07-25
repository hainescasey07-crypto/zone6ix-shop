import {
  errorResponse,
  hydrateOrders,
  json,
  makeOrderIdentity,
  parseCustomer,
  requireFirebaseUser,
  upsertUser
} from "../_lib/common.js";
import { aggregateShopProducts, ensureSiteSchema } from "../_lib/site.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    await ensureSiteSchema(env.DB);
    const result = await env.DB.prepare(`
      SELECT * FROM orders
      WHERE firebase_uid = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 100
    `).bind(user.uid).all();
    return json({ orders: await hydrateOrders(env.DB, result.results || []) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json();
    if (body.paymentMethod !== "robux") throw Object.assign(new Error("This endpoint only creates Robux orders."), { status: 400 });

    const customer = parseCustomer(body);
    await ensureSiteSchema(env.DB);
    const products = await aggregateShopProducts(env.DB, body.productIds);
    const { id, orderCode } = makeOrderIdentity();
    const cashTotal = products.reduce((sum, product) => sum + product.cashPence * product.quantity, 0);
    const robuxTotal = products.reduce((sum, product) => sum + product.robux * product.quantity, 0);

    await upsertUser(env.DB, user, customer);

    const statements = [
      env.DB.prepare(`
        INSERT INTO orders (
          id, order_code, firebase_uid, customer_email, customer_name,
          roblox_username, discord_username, gang_name,
          payment_method, payment_status, order_status,
          cash_total_pence, robux_total, custom_request, reference_link,
          gang_shirt_link, gang_pants_link, gang_group_link,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'robux', 'robux_pending', 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        id,
        orderCode,
        user.uid,
        user.email,
        user.displayName,
        customer.robloxUsername,
        customer.discordUsername,
        customer.gangName,
        cashTotal,
        robuxTotal,
        customer.customRequest,
        customer.referenceLink,
        customer.gangShirtLink,
        customer.gangPantsLink,
        customer.gangGroupLink
      ),
      ...products.map(product => env.DB.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name,
          cash_price_pence, robux_price, quantity
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, product.id, product.name, product.cashPence, product.robux, product.quantity)),
      env.DB.prepare(`
        INSERT INTO order_updates (
          order_id, status, message, visible_to_customer, created_by_email
        ) VALUES (?, 'awaiting_payment', ?, 1, ?)
      `).bind(id, "Robux order created. Complete the purchase prompts inside Zone6ix.", user.email)
    ];

    await env.DB.batch(statements);
    return json({ orderId: id, orderCode, robuxTotal }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
