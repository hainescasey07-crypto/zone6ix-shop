import {
  errorResponse,
  json,
  makeOrderIdentity,
  parseCustomer,
  requireFirebaseUser,
  upsertUser
} from "../_lib/common.js";
import { aggregateShopProducts, ensureSiteSchema } from "../_lib/site.js";
import { createCheckoutSession } from "../_lib/stripe.js";

async function cleanupOrder(db, orderId) {
  try {
    await db.batch([
      db.prepare("DELETE FROM order_updates WHERE order_id = ?").bind(orderId),
      db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId),
      db.prepare("DELETE FROM orders WHERE id = ?").bind(orderId)
    ]);
  } catch (error) {
    console.error("Could not clean up failed order:", error);
  }
}

export async function onRequestPost({ request, env }) {
  let orderId = "";
  let stripeSessionCreated = false;
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json();
    const customer = parseCustomer(body);
    await ensureSiteSchema(env.DB);
    const products = await aggregateShopProducts(env.DB, body.productIds);
    const identity = makeOrderIdentity();
    orderId = identity.id;

    const cashTotal = products.reduce((sum, product) => sum + product.cashPence * product.quantity, 0);
    const robuxTotal = products.reduce((sum, product) => sum + product.robux * product.quantity, 0);
    await upsertUser(env.DB, user, customer);

    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO orders (
          id, order_code, firebase_uid, customer_email, customer_name,
          roblox_username, discord_username, gang_name,
          payment_method, payment_status, order_status,
          cash_total_pence, robux_total, custom_request, reference_link,
          gang_shirt_link, gang_pants_link, gang_group_link,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'card', 'pending', 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        identity.id,
        identity.orderCode,
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
      `).bind(identity.id, product.id, product.name, product.cashPence, product.robux, product.quantity)),
      env.DB.prepare(`
        INSERT INTO order_updates (
          order_id, status, message, visible_to_customer, created_by_email
        ) VALUES (?, 'awaiting_payment', 'Order created. Complete Stripe Checkout to confirm payment.', 1, ?)
      `).bind(identity.id, user.email)
    ]);

    const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, request.url, {
      order: identity,
      customer: {
        uid: user.uid,
        email: user.email,
        gangName: customer.gangName,
        robloxUsername: customer.robloxUsername,
        discordUsername: customer.discordUsername
      },
      products
    });
    stripeSessionCreated = true;

    await env.DB.prepare(`
      UPDATE orders
      SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(session.id, identity.id).run();

    return json({ url: session.url, orderCode: identity.orderCode });
  } catch (error) {
    if (orderId && !stripeSessionCreated) await cleanupOrder(env.DB, orderId);
    return errorResponse(error);
  }
}
