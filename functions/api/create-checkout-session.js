const PRODUCTS = {
  "small-turf": {
    name: "Small Turf",
    amount: 350
  },
  "medium-turf": {
    name: "Medium Turf",
    amount: 700
  },
  "large-turf": {
    name: "Large Turf",
    amount: 1200
  },
  "second-floor": {
    name: "Second Floor Add-on",
    amount: 400
  },
  "gold-uzi": {
    name: "Gold Uzi",
    amount: 300
  },
  "gold-draco": {
    name: "Gold Draco",
    amount: 400
  },
  "custom-gun": {
    name: "Fully Custom Gang Gun",
    amount: 700
  },
  "custom-name": {
    name: "Custom Name",
    amount: 200
  },
  "custom-emoji": {
    name: "Custom Emoji",
    amount: 200
  },
  "custom-level": {
    name: "Custom Level",
    amount: 200
  },
  "identity-bundle": {
    name: "Gang Identity Bundle",
    amount: 500
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maximumLength = 450) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse(
      { error: "The Stripe secret has not been configured in Cloudflare." },
      500
    );
  }

  try {
    const body = await request.json();
    const productIds = body.productIds;
    const customer = body.customer || {};

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return jsonResponse(
        { error: "Your basket is empty." },
        400
      );
    }

    if (productIds.length > 30) {
      return jsonResponse(
        { error: "There are too many products in this order." },
        400
      );
    }

    const quantities = {};

    for (const productId of productIds) {
      if (!PRODUCTS[productId]) {
        return jsonResponse(
          { error: `Invalid product: ${productId}` },
          400
        );
      }

      quantities[productId] = (quantities[productId] || 0) + 1;
    }

    const websiteOrigin = new URL(request.url).origin;
    const stripeForm = new URLSearchParams();

    stripeForm.set("mode", "payment");
    stripeForm.set("payment_method_types[0]", "card");

    stripeForm.set(
      "success_url",
      `${websiteOrigin}/?payment=success`
    );

    stripeForm.set(
      "cancel_url",
      `${websiteOrigin}/?payment=cancelled`
    );

    const email = cleanText(customer.email, 200);

    if (email) {
      stripeForm.set("customer_email", email);
    }

    const gangName = cleanText(customer.gangName, 200);
    const robloxUsername = cleanText(customer.robloxUsername, 200);
    const discordUsername = cleanText(customer.discordUsername, 200);
    const customRequest = cleanText(customer.customRequest);
    const referenceLink = cleanText(customer.referenceLink);

    stripeForm.set(
      "client_reference_id",
      cleanText(`${gangName} — ${robloxUsername}`, 200)
    );

    const metadata = {
      gang_name: gangName,
      roblox_username: robloxUsername,
      discord_username: discordUsername,
      custom_request: customRequest,
      reference_link: referenceLink
    };

    for (const [key, value] of Object.entries(metadata)) {
      stripeForm.set(`metadata[${key}]`, value);
      stripeForm.set(
        `payment_intent_data[metadata][${key}]`,
        value
      );
    }

    let lineIndex = 0;

    for (const [productId, quantity] of Object.entries(quantities)) {
      const product = PRODUCTS[productId];

      stripeForm.set(
        `line_items[${lineIndex}][price_data][currency]`,
        "gbp"
      );

      stripeForm.set(
        `line_items[${lineIndex}][price_data][product_data][name]`,
        product.name
      );

      stripeForm.set(
        `line_items[${lineIndex}][price_data][unit_amount]`,
        String(product.amount)
      );

      stripeForm.set(
        `line_items[${lineIndex}][quantity]`,
        String(quantity)
      );

      lineIndex += 1;
    }

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stripeForm
      }
    );

    const stripeResult = await stripeResponse.json();

    if (!stripeResponse.ok || !stripeResult.url) {
      return jsonResponse(
        {
          error:
            stripeResult.error?.message ||
            "Stripe could not create the checkout."
        },
        400
      );
    }

    return jsonResponse({
      url: stripeResult.url
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unknown checkout error occurred."
      },
      500
    );
  }
}

export function onRequestGet() {
  return jsonResponse(
    { error: "This checkout route only accepts POST requests." },
    405
  );
}
