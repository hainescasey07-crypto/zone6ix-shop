import { errorResponse, json, requirePermission } from "../_lib/common.js";
import {
  ensureSiteSchema,
  getShopProducts,
  getSiteSettings,
  logAdminAction,
  saveShopProduct,
  saveSiteSettings
} from "../_lib/site.js";

export async function onRequestGet({ request, env }) {
  try {
    const admin = await requirePermission(request, env.DB, "manageSite");
    await ensureSiteSchema(env.DB);
    const [settings, products] = await Promise.all([
      getSiteSettings(env.DB),
      getShopProducts(env.DB, { includeHidden: true })
    ]);
    return json({ settings, products, role: admin.adminRole });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requirePermission(request, env.DB, "manageSite");
    const body = await request.json();
    if (body.action === "saveSettings") {
      const settings = await saveSiteSettings(env.DB, body.settings || {}, admin.email);
      await logAdminAction(env.DB, admin, "site_settings_updated", "site", "main", {
        fields: Object.keys(body.settings || {})
      });
      return json({ settings });
    }
    if (body.action === "saveProduct") {
      const product = await saveShopProduct(env.DB, body.product || {}, admin.email);
      await logAdminAction(env.DB, admin, "core_product_updated", "product", product.id, {
        name: product.name,
        cashPricePence: product.cashPricePence,
        robuxPrice: product.robuxPrice,
        visible: product.visible
      });
      return json({ product });
    }
    throw Object.assign(new Error("Unknown site manager action."), { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
