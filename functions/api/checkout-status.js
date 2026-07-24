function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse(
      { error: "Stripe is not configured." },
      500
    );
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return jsonResponse(
      { error: "Invalid checkout session." },
      400
    );
  }

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${
      encodeURIComponent(sessionId)
    }`,
    {
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`
      }
    }
  );

  const session = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return jsonResponse(
      {
        error:
          session.error?.message ||
          "Stripe could not verify this payment."
      },
      400
    );
  }

  return jsonResponse({
    paid:
      session.status === "complete" &&
      session.payment_status === "paid"
  });
}
