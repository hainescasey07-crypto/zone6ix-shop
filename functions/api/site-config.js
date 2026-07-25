import { errorResponse, json } from "../_lib/common.js";
import { ensureSiteSchema, getShopProducts, getSiteSettings } from "../_lib/site.js";

export async function onRequestGet({ env }) {
  try {
    await ensureSiteSchema(env.DB);
    const [settings, products] = await Promise.all([
      getSiteSettings(env.DB),
      getShopProducts(env.DB)
    ]);
    return json({ settings, products });
  } catch (error) {
    return errorResponse(error);
  }
}
