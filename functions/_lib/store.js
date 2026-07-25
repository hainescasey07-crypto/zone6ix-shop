import { cleanText } from "./common.js";

export const STORE_STATUSES = new Set(["draft", "scheduled", "live", "hidden", "sold_out", "archived"]);
export const DELIVERY_TYPES = new Set(["manual", "roblox_join", "roblox_product"]);
export const REDEMPTION_STATUSES = new Set(["pending", "approved", "in_progress", "delivered", "cancelled", "refunded"]);

function optionalInt(value, { name, min = 0, max = 2_000_000_000 } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw Object.assign(new Error(`${name} is invalid.`), { status: 400 });
  }
  return number;
}

function requiredInt(value, { name, min = 0, max = 2_000_000_000 } = {}) {
  const number = optionalInt(value, { name, min, max });
  if (number === null) throw Object.assign(new Error(`${name} is required.`), { status: 400 });
  return number;
}

function optionalDate(value, name) {
  const text = cleanText(value, { name, max: 80 });
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`${name} is invalid.`), { status: 400 });
  }
  return date.toISOString();
}

export function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || `item-${Date.now().toString(36)}`;
}

export function parseStoreItem(body = {}, { partial = false } = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(body, key);
  const item = {};

  if (!partial || has("name")) {
    item.name = cleanText(body.name, { name: "Item name", min: 2, max: 100, required: true });
  }
  if (!partial || has("description")) {
    item.description = cleanText(body.description, { name: "Description", min: 3, max: 1800, required: true });
  }
  if (!partial || has("category")) {
    item.category = cleanText(body.category || "event_item", { name: "Category", min: 2, max: 60, required: true });
  }
  if (!partial || has("tokenPriceMilli")) {
    item.tokenPriceMilli = requiredInt(body.tokenPriceMilli, { name: "Token price", min: 0 });
  }
  if (!partial || has("cashPricePence")) {
    item.cashPricePence = optionalInt(body.cashPricePence, { name: "Cash price", min: 0 });
  }
  if (!partial || has("robuxPrice")) {
    item.robuxPrice = optionalInt(body.robuxPrice, { name: "Robux price", min: 0 });
  }
  if (!partial || has("stockTotal")) {
    item.stockTotal = optionalInt(body.stockTotal, { name: "Total stock", min: 0 });
  }
  if (!partial || has("stockRemaining")) {
    item.stockRemaining = optionalInt(body.stockRemaining, { name: "Remaining stock", min: 0 });
  }
  if (!partial || has("maxPerCustomer")) {
    item.maxPerCustomer = requiredInt(body.maxPerCustomer ?? 1, { name: "Maximum per customer", min: 1, max: 1000 });
  }
  if (!partial || has("startsAt")) item.startsAt = optionalDate(body.startsAt, "Start date");
  if (!partial || has("endsAt")) item.endsAt = optionalDate(body.endsAt, "End date");
  if (item.startsAt && item.endsAt && new Date(item.endsAt) <= new Date(item.startsAt)) {
    throw Object.assign(new Error("The end date must be after the start date."), { status: 400 });
  }
  if (!partial || has("isLimited")) item.isLimited = body.isLimited === true || Number(body.isLimited) === 1 ? 1 : 0;
  if (!partial || has("status")) {
    item.status = cleanText(body.status || "draft", { name: "Status", min: 1, max: 30, required: true });
    if (!STORE_STATUSES.has(item.status)) throw Object.assign(new Error("Invalid store status."), { status: 400 });
  }
  if (item.status === "scheduled" && !item.startsAt) {
    throw Object.assign(new Error("Scheduled items need a start date."), { status: 400 });
  }
  if (!partial || has("deliveryType")) {
    item.deliveryType = cleanText(body.deliveryType || "manual", { name: "Delivery type", min: 1, max: 30, required: true });
    if (!DELIVERY_TYPES.has(item.deliveryType)) throw Object.assign(new Error("Invalid delivery type."), { status: 400 });
  }
  if (!partial || has("robloxProductId")) {
    item.robloxProductId = cleanText(body.robloxProductId, { name: "Roblox product ID", max: 40 });
    if (item.robloxProductId && !/^\d+$/.test(item.robloxProductId)) {
      throw Object.assign(new Error("Roblox product ID must contain numbers only."), { status: 400 });
    }
  }
  if (!partial || has("deliveryNotes")) {
    item.deliveryNotes = cleanText(body.deliveryNotes, { name: "Delivery notes", max: 1200 });
  }

  if (!partial && item.stockTotal === null) {
    item.stockRemaining = null;
  } else if (!partial && item.stockTotal !== null && item.stockRemaining === null) {
    item.stockRemaining = item.stockTotal;
  }
  if (item.stockTotal !== undefined && item.stockRemaining !== undefined && item.stockTotal !== null && item.stockRemaining !== null && item.stockRemaining > item.stockTotal) {
    throw Object.assign(new Error("Remaining stock cannot be higher than total stock."), { status: 400 });
  }
  return item;
}

export function publicStoreItem(row) {
  const stockRemaining = row.stock_remaining === null || row.stock_remaining === undefined ? null : Number(row.stock_remaining);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    imageUrl: Number(row.has_image || 0) === 1 ? `/api/store-image?id=${encodeURIComponent(row.id)}&v=${encodeURIComponent(row.updated_at || "1")}` : (row.image_url || ""),
    tokenPriceMilli: Number(row.token_price_milli || 0),
    cashPricePence: row.cash_price_pence === null ? null : Number(row.cash_price_pence),
    robuxPrice: row.robux_price === null ? null : Number(row.robux_price),
    stockTotal: row.stock_total === null ? null : Number(row.stock_total),
    stockRemaining,
    maxPerCustomer: Number(row.max_per_customer || 1),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isLimited: Number(row.is_limited || 0) === 1,
    status: row.status,
    deliveryType: row.delivery_type,
    robloxProductId: row.roblox_product_id || "",
    deliveryNotes: row.delivery_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    redemptionCount: Number(row.redemption_count || 0),
    hasImage: Number(row.has_image || 0) === 1
  };
}

export function redemptionCode() {
  return `ZTR-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}
