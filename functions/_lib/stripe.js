import { json } from "./common.js";

export async function stripeRequest(secretKey, path, options = {}) {
  if (!secretKey) throw new Error("Stripe is not configured on the server.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${secretKey}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }
  const response = await fetch(`https://api.stripe.com/v1${path}`, { ...options, headers });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error?.message || `Stripe request failed (${response.status}).`);
  return data;
}

export async function createCheckoutSession(secretKey, requestUrl, { order, customer, products }) {
  const origin = new URL(requestUrl).origin;
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/?payment=cancelled`);
  form.set("customer_email", customer.email);
  form.set("client_reference_id", order.id);
  form.set("metadata[order_id]", order.id);
  form.set("metadata[order_code]", order.orderCode);
  form.set("metadata[firebase_uid]", customer.uid);
  form.set("metadata[gang_name]", customer.gangName.slice(0, 500));
  form.set("metadata[roblox_username]", customer.robloxUsername.slice(0, 500));
  form.set("metadata[discord_username]", customer.discordUsername.slice(0, 500));
  form.set("payment_intent_data[metadata][order_id]", order.id);
  form.set("payment_intent_data[metadata][order_code]", order.orderCode);

  products.forEach((product, index) => {
    form.set(`line_items[${index}][price_data][currency]`, "gbp");
    form.set(`line_items[${index}][price_data][unit_amount]`, String(product.cashPence));
    form.set(`line_items[${index}][price_data][product_data][name]`, product.name);
    form.set(`line_items[${index}][quantity]`, String(product.quantity));
  });

  return stripeRequest(secretKey, "/checkout/sessions", { method: "POST", body: form });
}

export async function retrieveCheckoutSession(secretKey, sessionId) {
  return stripeRequest(secretKey, `/checkout/sessions/${encodeURIComponent(sessionId)}`, { method: "GET" });
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a[index] ^ b[index];
  return result === 0;
}

export async function verifyStripeWebhook(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) throw new Error("Stripe webhook signing is not configured.");
  const parts = signatureHeader.split(",").map(part => part.trim());
  const timestamp = parts.find(part => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter(part => part.startsWith("v1=")).map(part => part.slice(3));
  if (!timestamp || signatures.length === 0) throw new Error("Invalid Stripe signature header.");

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) throw new Error("Invalid Stripe signature timestamp.");
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > toleranceSeconds) throw new Error("Stripe signature timestamp is outside the allowed window.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  ));

  const valid = signatures.some(signature => constantTimeEqual(digest, hexToBytes(signature)));
  if (!valid) throw new Error("Stripe webhook signature verification failed.");
  return JSON.parse(rawBody);
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
}
