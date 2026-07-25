import { errorResponse, json, requireFirebaseUser } from "../_lib/common.js";
import { retrieveCheckoutSession } from "../_lib/stripe.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireFirebaseUser(request);
    const sessionId = new URL(request.url).searchParams.get("session_id") || "";
    if (!sessionId.startsWith("cs_")) throw Object.assign(new Error("Invalid Stripe session."), { status: 400 });

    const order = await env.DB.prepare(`
      SELECT * FROM orders
      WHERE stripe_checkout_session_id = ? AND firebase_uid = ?
    `).bind(sessionId, user.uid).first();
    if (!order) throw Object.assign(new Error("This Stripe session is not linked to your account."), { status: 404 });

    const session = await retrieveCheckoutSession(env.STRIPE_SECRET_KEY, sessionId);
    const paid = session.status === "complete" && session.payment_status === "paid";

    if (paid && order.payment_status !== "paid") {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE orders SET
            payment_status = 'paid',
            order_status = CASE WHEN order_status = 'awaiting_payment' THEN 'paid' ELSE order_status END,
            stripe_payment_intent_id = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(typeof session.payment_intent === "string" ? session.payment_intent : "", order.id),
        env.DB.prepare(`
          INSERT INTO order_updates (
            order_id, status, message, visible_to_customer, created_by_email
          ) VALUES (?, 'paid', 'Stripe payment confirmed. Your order is ready for review.', 1, 'stripe')
        `).bind(order.id)
      ]);
    }

    return json({
      paid,
      orderCode: order.order_code,
      paymentStatus: paid ? "paid" : session.payment_status,
      checkoutStatus: session.status
    });
  } catch (error) {
    return errorResponse(error);
  }
}
