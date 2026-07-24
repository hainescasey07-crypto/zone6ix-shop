function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureCompare(first, second) {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }

  return difference === 0;
}

function parseStripeSignature(header) {
  let timestamp = null;
  const signatures = [];

  for (const section of String(header || "").split(",")) {
    const [key, value] = section.trim().split("=");

    if (key === "t") {
      timestamp = Number(value);
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  return {
    timestamp,
    signatures
  };
}

async function verifyStripeSignature(
  rawBody,
  signatureHeader,
  webhookSecret
) {
  const { timestamp, signatures } =
    parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);

  if (Math.abs(currentTime - timestamp) > 300) {
    return false;
  }

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signedContent = `${timestamp}.${rawBody}`;

  const calculatedSignature = bytesToHex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedContent)
    )
  );

  return signatures.some(signature =>
    secureCompare(signature, calculatedSignature)
  );
}

function cleanText(value, maximumLength = 500) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function cleanSubject(value) {
  return cleanText(value, 120)
    .replace(/[\r\n]+/g, " ");
}

async function sendPaidOrderEmail(session, eventId) {
  const metadata = session.metadata || {};

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    "Not provided";

  const amountPaid =
    typeof session.amount_total === "number"
      ? `£${(session.amount_total / 100).toFixed(2)}`
      : cleanText(metadata.cash_total) || "Unknown";

  const gangName =
    cleanSubject(metadata.gang_name) || "Unknown gang";

  const formData = new URLSearchParams({
    _subject: `PAID Zone6ix order — ${gangName}`,
    _template: "table",
    _replyto: email,
    email,
    "Order Status": "PAID — verified by Stripe",
    "Gang Name": cleanText(metadata.gang_name),
    "Roblox Username": cleanText(metadata.roblox_username),
    "Discord Username": cleanText(metadata.discord_username),
    "Products": cleanText(metadata.products),
    "Amount Paid": amountPaid,
    "Custom Request": cleanText(metadata.custom_request),
    "Reference Link":
      cleanText(metadata.reference_link) || "None provided",
    "Stripe Session ID": cleanText(session.id),
    "Stripe Payment ID": cleanText(session.payment_intent),
    "Stripe Event ID": cleanText(eventId),
    Website: "https://zone6ix-shop.pages.dev"
  });

  const response = await fetch(
    "https://formsubmit.co/ajax/Hainescasey07@gmail.com",
    {
      method: "POST",
      headers: {
        "Accept": "application/json"
      },
      body: formData
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || "The paid-order email could not be sent."
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse(
      { error: "Stripe webhook secret is missing." },
      500
    );
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("Stripe-Signature");

  const signatureIsValid = await verifyStripeSignature(
    rawBody,
    signatureHeader,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (!signatureIsValid) {
    return jsonResponse(
      { error: "Invalid Stripe signature." },
      400
    );
  }

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body." },
      400
    );
  }

  if (event.type !== "checkout.session.completed") {
    return jsonResponse({
      received: true,
      ignored: true
    });
  }

  const session = event.data?.object;

  if (!session) {
    return jsonResponse(
      { error: "Checkout session is missing." },
      400
    );
  }

  if (session.payment_status !== "paid") {
    return jsonResponse({
      received: true,
      paid: false
    });
  }

  try {
    await sendPaidOrderEmail(session, event.id);
  } catch (error) {
    console.error("Paid order email failed:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paid order email failed."
      },
      500
    );
  }

  return jsonResponse({
    received: true,
    paid: true
  });
}

export function onRequestGet() {
  return jsonResponse(
    { error: "Stripe webhooks must use POST." },
    405
  );
}
