import { errorResponse, OWNER_EMAIL, requirePermission } from "../_lib/common.js";
import { ensureSiteSchema } from "../_lib/site.js";

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  text = text.replace(new RegExp(OWNER_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "Owner");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows, columns) {
  return [
    columns.map(([label]) => csvCell(label)).join(","),
    ...rows.map(row => columns.map(([, key]) => csvCell(row[key])).join(","))
  ].join("\r\n");
}

export async function onRequestGet({ request, env }) {
  try {
    const admin = await requirePermission(request, env.DB, "exportData");
    await ensureSiteSchema(env.DB);
    const type = new URL(request.url).searchParams.get("type") || "orders";
    const roleExports = {
      owner: new Set(["orders", "customers", "redemptions", "products", "store", "ledger", "audit"]),
      manager: new Set(["orders", "customers", "redemptions", "products", "store", "ledger", "audit"]),
      orders: new Set(["orders"]),
      store: new Set(["redemptions", "store"])
    };
    if (!roleExports[admin.adminRole]?.has(type)) {
      throw Object.assign(new Error("Your admin role cannot export that data."), { status: 403 });
    }
    let rows = [];
    let columns = [];
    if (type === "orders") {
      rows = (await env.DB.prepare(`SELECT * FROM orders ORDER BY datetime(created_at) DESC`).all()).results || [];
      columns = [["Order code","order_code"],["Customer email","customer_email"],["Customer name","customer_name"],["Roblox username","roblox_username"],["Discord username","discord_username"],["Gang name","gang_name"],["Gang shirt","gang_shirt_link"],["Gang pants","gang_pants_link"],["Gang group","gang_group_link"],["Payment method","payment_method"],["Payment status","payment_status"],["Order status","order_status"],["Cash total pence","cash_total_pence"],["Robux total","robux_total"],["Custom request","custom_request"],["Reference link","reference_link"],["Created","created_at"],["Updated","updated_at"]];
    } else if (type === "customers") {
      rows = (await env.DB.prepare(`
        SELECT u.*, COALESCE(w.balance_milli,0) AS token_balance_milli
        FROM users u LEFT JOIN token_wallets w ON w.firebase_uid = u.firebase_uid
        ORDER BY datetime(u.created_at) DESC
      `).all()).results || [];
      columns = [["Email","email"],["Display name","display_name"],["Roblox username","roblox_username"],["Discord username","discord_username"],["Gang name","gang_name"],["Token balance milli","token_balance_milli"],["Created","created_at"],["Updated","updated_at"]];
    } else if (type === "redemptions") {
      rows = (await env.DB.prepare(`
        SELECT r.*, i.name AS item_name, u.email
        FROM store_redemptions r JOIN store_items i ON i.id = r.item_id
        JOIN users u ON u.firebase_uid = r.firebase_uid
        ORDER BY datetime(r.created_at) DESC
      `).all()).results || [];
      columns = [["Code","redemption_code"],["Customer email","email"],["Item","item_name"],["Quantity","quantity"],["Total token milli","total_price_milli"],["Roblox username","roblox_username"],["Status","status"],["Created","created_at"],["Delivered","delivered_at"]];
    } else if (type === "products") {
      rows = (await env.DB.prepare(`SELECT * FROM shop_products ORDER BY sort_order ASC`).all()).results || [];
      columns = [["ID","id"],["Category","category"],["Name","name"],["Description","description"],["Cash price pence","cash_price_pence"],["Robux price","robux_price"],["Roblox product ID","robux_product_id"],["Visible","visible"],["Featured","featured"],["Sort order","sort_order"],["Updated","updated_at"]];
    } else if (type === "store") {
      rows = (await env.DB.prepare(`SELECT * FROM store_items ORDER BY datetime(created_at) DESC`).all()).results || [];
      columns = [["ID","id"],["Name","name"],["Description","description"],["Category","category"],["Token price milli","token_price_milli"],["Cash price pence","cash_price_pence"],["Robux price","robux_price"],["Stock total","stock_total"],["Stock remaining","stock_remaining"],["Max per customer","max_per_customer"],["Starts","starts_at"],["Ends","ends_at"],["Status","status"],["Delivery type","delivery_type"],["Roblox product ID","roblox_product_id"],["Created","created_at"],["Updated","updated_at"]];
    } else if (type === "ledger") {
      rows = (await env.DB.prepare(`
        SELECT l.*, u.email FROM token_ledger l
        LEFT JOIN users u ON u.firebase_uid = l.firebase_uid
        ORDER BY datetime(l.created_at) DESC
      `).all()).results || [];
      columns = [["Customer email","email"],["Firebase UID","firebase_uid"],["Amount milli","amount_milli"],["Balance after milli","balance_after_milli"],["Reason","reason"],["Reference type","reference_type"],["Reference ID","reference_id"],["Note","note"],["Created by","created_by_email"],["Created","created_at"]];
    } else if (type === "audit") {
      rows = (await env.DB.prepare(`SELECT * FROM admin_audit_log ORDER BY datetime(created_at) DESC`).all()).results || [];
      columns = [["Admin","admin_email"],["Action","action"],["Target type","target_type"],["Target ID","target_id"],["Details","details_json"],["Created","created_at"]];
    } else {
      throw Object.assign(new Error("Unknown export type."), { status: 400 });
    }
    return new Response(csv(rows, columns), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="zone6ix-${type}-${new Date().toISOString().slice(0,10)}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
