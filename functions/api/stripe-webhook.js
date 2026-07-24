function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureCompare(first, second) {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < first.length; index += 1) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}

function parseStripeSignature(header) {
  let timestamp = null;
  const signatures = [];

  for (const section of String(header || "").split(",")) {
    const separator = section.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = section.slice(0, separator).trim();
    const value = section.slice(separator + 1).trim();

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

  const expectedSignature = bytesToHex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${timestamp}.${rawBody}`)
    )
  );

  return signatures.some(signature =>
    secureCompare(signature, expectedSignature)
  );
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
  const stripeSignature =
    request.headers.get("Stripe-Signature");

  const signatureIsValid =
    await verifyStripeSignature(
      rawBody,
      stripeSignature,
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
      { error: "Invalid JSON." },
      400
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;

    console.log("Verified Zone6ix payment event", {
      eventId: event.id,
      sessionId: session?.id,
      paymentStatus: session?.payment_status,
      gangName: session?.metadata?.gang_name,
      robloxUsername:
        session?.metadata?.roblox_username
    });
  }

  return jsonResponse({
    received: true
  });
}

export function onRequestGet() {
  return jsonResponse(
    { error: "Stripe webhooks use POST requests." },
    405
  );
}
