import { errorResponse, json } from "../_lib/common.js";
import { verifyStripeWebhook } from "../_lib/stripe.js";
import { awardPurchaseBonus } from "../_lib/tokens.js";

function paymentIntentId(session) {
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
}

async function findOrder(env, session) {
  const orderId = session.metadata?.order_id || session.client_reference_id || "";
  if (orderId) {
    const byId = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
    if (byId) return byId;
  }
  if (session.id) {
    return env.DB.prepare("SELECT * FROM orders WHERE stripe_checkout_session_id = ?").bind(session.id).first();
  }
  return null;
}

async function markPaid(env, order, session) {
  if (order.payment_status === "paid") return;
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE orders SET
        payment_status = 'paid',
        order_status = CASE WHEN order_status = 'awaiting_payment' THEN 'paid' ELSE order_status END,
        stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, ?),
        stripe_payment_intent_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(session.id || "", paymentIntentId(session), order.id),
    env.DB.prepare(`
      INSERT INTO order_updates (
        order_id, status, message, visible_to_customer, created_by_email
      ) VALUES (?, 'paid', 'Stripe payment confirmed. Your order is ready for review.', 1, 'stripe')
    `).bind(order.id)
  ]);
  await awardPurchaseBonus(env.DB, order, "stripe");
}

async function markExpired(env, order) {
  if (["paid", "refunded"].includes(order.payment_status)) return;
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE orders SET payment_status = 'failed', order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(order.id),
    env.DB.prepare(`
      INSERT INTO order_updates (
        order_id, status, message, visible_to_customer, created_by_email
      ) VALUES (?, 'cancelled', 'Stripe Checkout expired before payment was completed.', 1, 'stripe')
    `).bind(order.id)
  ]);
}

export async function onRequestPost({ request, env }) {
  try {
    const rawBody = await request.text();
    const event = await verifyStripeWebhook(
      rawBody,
      request.headers.get("stripe-signature"),
      env.STRIPE_WEBHOOK_SECRET
    );

    const supported = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired"
    ]);
    if (!supported.has(event.type)) return json({ received: true, ignored: true });

    const session = event.data?.object || {};
    const order = await findOrder(env, session);
    if (!order) {
      console.warn("Stripe event has no matching Zone6ix order:", event.id, session.id);
      return json({ received: true, orderFound: false });
    }

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && session.payment_status === "paid") {
      await markPaid(env, order, session);
    } else if (event.type === "checkout.session.expired") {
      await markExpired(env, order);
    }

    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}
