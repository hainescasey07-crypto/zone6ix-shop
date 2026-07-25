const smEscape = value => {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
};

let smAuth = null;
let smData = { settings: null, products: [] };
let smLoaded = false;
let smAuditLoaded = false;

const sm = {
  siteTab: document.getElementById("adminSiteTab"),
  securityTab: document.getElementById("adminSecurityTab"),
  siteForm: document.getElementById("siteSettingsForm"),
  legalForm: document.getElementById("legalSettingsForm"),
  siteMessage: document.getElementById("siteSettingsMessage"),
  legalMessage: document.getElementById("legalSettingsMessage"),
  productList: document.getElementById("coreProductsList"),
  refreshSite: document.getElementById("refreshSiteManager"),
  auditList: document.getElementById("auditLogList"),
  refreshAudit: document.getElementById("refreshAuditLog"),
  exportMessage: document.getElementById("exportMessage"),
  legalDashboard: document.getElementById("legalDashboard"),
  closeLegal: document.getElementById("closeLegalDashboard"),
  backdrop: document.getElementById("dashboardBackdrop")
};

const siteFieldIds = {
  siteName: "siteSettingName",
  studioLabel: "siteSettingStudio",
  statusText: "siteSettingStatus",
  contactEmail: "siteSettingEmail",
  heroLineOne: "siteSettingHero1",
  heroLineTwo: "siteSettingHero2",
  heroLineThree: "siteSettingHero3",
  announcementText: "siteSettingAnnouncement",
  accentPrimary: "siteSettingAccent1",
  accentSecondary: "siteSettingAccent2",
  primaryCta: "siteSettingPrimaryCta",
  secondaryCta: "siteSettingSecondaryCta",
  heroLead: "siteSettingLead",
  studioHeading: "siteSettingStudioHeading",
  studioAccentHeading: "siteSettingStudioAccent",
  studioLead: "siteSettingStudioLead",
  turfHeading: "siteSettingTurfHeading",
  turfLead: "siteSettingTurfLead",
  weaponHeading: "siteSettingWeaponHeading",
  weaponLead: "siteSettingWeaponLead",
  playerHeading: "siteSettingPlayerHeading",
  playerLead: "siteSettingPlayerLead",
  eventHeading: "siteSettingEventHeading",
  eventLead: "siteSettingEventLead",
  processHeading: "siteSettingProcessHeading",
  processLead: "siteSettingProcessLead",
  orderHeading: "siteSettingOrderHeading",
  orderLead: "siteSettingOrderLead"
};

const legalFieldIds = {
  termsText: "siteTermsText",
  privacyText: "sitePrivacyText",
  refundText: "siteRefundText",
  tokenRulesText: "siteTokenRulesText"
};

function permissions() {
  return smAuth?.getPermissions?.() || {};
}

function has(permission) {
  return Boolean(permissions()[permission]);
}

function setMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text || "";
  element.classList.toggle("error", Boolean(isError));
}

function setFormValues(settings = {}) {
  Object.entries(siteFieldIds).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input) input.value = settings[key] ?? "";
  });
  const open = document.getElementById("siteSettingOpen");
  if (open) open.checked = settings.statusOpen !== false;
  Object.entries(legalFieldIds).forEach(([key, id]) => {
    const input = document.getElementById(id);
    if (input) input.value = settings[key] ?? "";
  });
}

function readSettings(keys = Object.keys(siteFieldIds)) {
  const settings = {};
  keys.forEach(key => {
    const input = document.getElementById(siteFieldIds[key]);
    if (input) settings[key] = input.value.trim();
  });
  settings.statusOpen = Boolean(document.getElementById("siteSettingOpen")?.checked);
  return settings;
}

function readLegalSettings() {
  const settings = {};
  Object.entries(legalFieldIds).forEach(([key, id]) => {
    settings[key] = document.getElementById(id)?.value.trim() || "";
  });
  return settings;
}

function money(value) {
  const number = Number(value || 0) / 100;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(number);
}

function renderProducts() {
  if (!sm.productList) return;
  if (!smData.products.length) {
    sm.productList.innerHTML = `<div class="dashboard-empty"><strong>No core products found.</strong><span>Refresh the manager after deployment finishes.</span></div>`;
    return;
  }
  sm.productList.innerHTML = smData.products.map(product => `
    <article class="core-product-editor" data-core-product="${smEscape(product.id)}">
      <header>
        <div><small>${smEscape(product.id)}</small><h4>${smEscape(product.name)}</h4></div>
        <div class="core-product-live-state ${product.visible ? "is-live" : "is-hidden"}">${product.visible ? "Visible" : "Hidden"}</div>
      </header>
      <div class="core-product-fields">
        <label><span>Product name</span><input data-field="name" maxlength="100" value="${smEscape(product.name)}" required></label>
        <label><span>Category</span><select data-field="category">
          ${["turfs", "guns", "identity"].map(category => `<option value="${category}" ${product.category === category ? "selected" : ""}>${category === "identity" ? "Player customisation" : category[0].toUpperCase() + category.slice(1)}</option>`).join("")}
        </select></label>
        <label class="wide"><span>Description</span><textarea data-field="description" maxlength="1000" required>${smEscape(product.description)}</textarea></label>
        <label><span>Cash price (£)</span><input data-field="cash" type="number" min="0" step="0.01" value="${(Number(product.cashPricePence || 0) / 100).toFixed(2)}" required></label>
        <label><span>Robux price</span><input data-field="robuxPrice" type="number" min="0" step="1" value="${Number(product.robuxPrice || 0)}" required></label>
        <label><span>Card badge</span><input data-field="badge" maxlength="40" value="${smEscape(product.badge || "")}"></label>
        <label><span>Roblox Developer Product ID</span><input data-field="robuxProductId" inputmode="numeric" maxlength="40" value="${smEscape(product.robuxProductId || "")}"></label>
        <label><span>Accent colour</span><input data-field="accent" type="color" value="${smEscape(product.accent || "#4bbcff")}"></label>
        <label><span>Display order</span><input data-field="sortOrder" type="number" min="0" max="9999" step="1" value="${Number(product.sortOrder || 0)}"></label>
      </div>
      <div class="core-product-toggles">
        <label class="admin-toggle"><input data-field="visible" type="checkbox" ${product.visible ? "checked" : ""}><span></span><div><strong>Visible in shop</strong><small>Hidden products cannot be added to new baskets.</small></div></label>
        <label class="admin-toggle"><input data-field="featured" type="checkbox" ${product.featured ? "checked" : ""}><span></span><div><strong>Featured product</strong><small>Marks this as a highlighted option.</small></div></label>
      </div>
      <footer>
        <span class="core-product-price-preview">${money(product.cashPricePence)} · ${Number(product.robuxPrice || 0).toLocaleString("en-GB")} R$</span>
        <button class="dashboard-primary compact" type="button" data-save-core-product="${smEscape(product.id)}">Save product</button>
        <span class="core-product-save-message" aria-live="polite"></span>
      </footer>
    </article>
  `).join("");
}

async function loadSiteManager(force = false) {
  if (!smAuth || !has("manageSite")) return;
  if (smLoaded && !force) return;
  if (sm.productList) sm.productList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading live site settings…</span></div>`;
  try {
    const data = await smAuth.apiFetch("/api/admin-site");
    smData = { settings: data.settings || {}, products: Array.isArray(data.products) ? data.products : [] };
    setFormValues(smData.settings);
    renderProducts();
    smLoaded = true;
  } catch (error) {
    if (sm.productList) sm.productList.innerHTML = `<div class="dashboard-error"><strong>Could not load site manager.</strong><span>${smEscape(error.message)}</span></div>`;
  }
}

async function saveSiteSettings(event) {
  event.preventDefault();
  if (!has("manageSite")) return;
  const button = event.submitter || sm.siteForm?.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  setMessage(sm.siteMessage, "Publishing changes…");
  try {
    const data = await smAuth.apiFetch("/api/admin-site", {
      method: "PATCH",
      body: JSON.stringify({ action: "saveSettings", settings: readSettings() })
    });
    smData.settings = data.settings;
    setFormValues(smData.settings);
    await window.zone6ixRefreshPublicSite?.();
    setMessage(sm.siteMessage, "Published and shown live.");
    document.dispatchEvent(new CustomEvent("zone6ix-site-settings-saved", { detail: data.settings }));
  } catch (error) {
    setMessage(sm.siteMessage, error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
}

async function saveLegalSettings(event) {
  event.preventDefault();
  if (!has("manageSite")) return;
  const button = event.submitter || sm.legalForm?.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  setMessage(sm.legalMessage, "Publishing policies…");
  try {
    const data = await smAuth.apiFetch("/api/admin-site", {
      method: "PATCH",
      body: JSON.stringify({ action: "saveSettings", settings: readLegalSettings() })
    });
    smData.settings = { ...(smData.settings || {}), ...(data.settings || {}) };
    setFormValues(smData.settings);
    [
      ["publicTermsText", "termsText"],
      ["publicPrivacyText", "privacyText"],
      ["publicRefundText", "refundText"],
      ["publicTokenRulesText", "tokenRulesText"]
    ].forEach(([id, key]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = smData.settings[key] || "";
    });
    setMessage(sm.legalMessage, "Policies published.");
  } catch (error) {
    setMessage(sm.legalMessage, error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
}

function productPayload(card, product) {
  const field = name => card.querySelector(`[data-field="${name}"]`);
  return {
    id: product.id,
    category: field("category")?.value || product.category,
    name: field("name")?.value.trim() || "",
    description: field("description")?.value.trim() || "",
    cashPricePence: Math.round(Number(field("cash")?.value || 0) * 100),
    robuxPrice: Math.round(Number(field("robuxPrice")?.value || 0)),
    badge: field("badge")?.value.trim() || "",
    accent: field("accent")?.value || product.accent,
    robuxProductId: field("robuxProductId")?.value.trim() || "",
    visible: Boolean(field("visible")?.checked),
    featured: Boolean(field("featured")?.checked),
    sortOrder: Math.round(Number(field("sortOrder")?.value || 0))
  };
}

async function saveProduct(id, button) {
  if (!has("manageSite")) return;
  const card = button.closest("[data-core-product]");
  const product = smData.products.find(item => item.id === id);
  if (!card || !product) return;
  const message = card.querySelector(".core-product-save-message");
  button.disabled = true;
  if (message) message.textContent = "Saving…";
  try {
    const data = await smAuth.apiFetch("/api/admin-site", {
      method: "PATCH",
      body: JSON.stringify({ action: "saveProduct", product: productPayload(card, product) })
    });
    const index = smData.products.findIndex(item => item.id === id);
    if (index !== -1) smData.products[index] = data.product;
    await window.zone6ixRefreshPublicSite?.();
    renderProducts();
    const newCard = sm.productList.querySelector(`[data-core-product="${CSS.escape(id)}"]`);
    const newMessage = newCard?.querySelector(".core-product-save-message");
    if (newMessage) newMessage.textContent = "Saved and live";
  } catch (error) {
    if (message) {
      message.classList.add("error");
      message.textContent = error.message;
    }
  } finally {
    button.disabled = false;
  }
}

function auditActionLabel(action) {
  return String(action || "Admin action").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function renderAudit(entries) {
  if (!sm.auditList) return;
  if (!entries.length) {
    sm.auditList.innerHTML = `<div class="dashboard-empty"><strong>No admin activity yet.</strong><span>Updates and deletions will appear here.</span></div>`;
    return;
  }
  sm.auditList.innerHTML = entries.map(entry => {
    const details = entry.details && Object.keys(entry.details).length
      ? Object.entries(entry.details).slice(0, 5).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join(" · ")
      : "No extra details";
    const date = new Date(String(entry.created_at || "").replace(" ", "T") + (String(entry.created_at || "").includes("T") ? "" : "Z"));
    return `<article class="audit-entry">
      <span class="audit-marker"></span>
      <div><strong>${smEscape(auditActionLabel(entry.action))}</strong><p>${smEscape(entry.admin_email)} · ${smEscape(entry.target_type)}${entry.target_id ? ` / ${smEscape(entry.target_id)}` : ""}</p><small>${smEscape(details)}</small></div>
      <time>${Number.isNaN(date.getTime()) ? smEscape(entry.created_at) : date.toLocaleString("en-GB")}</time>
    </article>`;
  }).join("");
}

async function loadAudit(force = false) {
  if (!smAuth || !has("viewAudit")) return;
  if (smAuditLoaded && !force) return;
  if (sm.auditList) sm.auditList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading admin activity…</span></div>`;
  try {
    const data = await smAuth.apiFetch("/api/admin-audit");
    renderAudit(Array.isArray(data.entries) ? data.entries : []);
    smAuditLoaded = true;
  } catch (error) {
    if (sm.auditList) sm.auditList.innerHTML = `<div class="dashboard-error"><strong>Could not load audit log.</strong><span>${smEscape(error.message)}</span></div>`;
  }
}

async function downloadExport(type, button) {
  if (!smAuth || !has("exportData")) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing…";
  setMessage(sm.exportMessage, "Preparing secure download…");
  try {
    const token = await smAuth.getToken();
    let response = await fetch(`/api/admin-export?type=${encodeURIComponent(type)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      const fresh = await smAuth.getToken(true);
      response = await fetch(`/api/admin-export?type=${encodeURIComponent(type)}`, { headers: { Authorization: `Bearer ${fresh}` } });
    }
    if (!response.ok) {
      const text = await response.text();
      let error = text;
      try { error = JSON.parse(text).error || text; } catch {}
      throw new Error(error || `Export failed (${response.status}).`);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `zone6ix-${type}.csv`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(sm.exportMessage, `${filename} downloaded.`);
  } catch (error) {
    setMessage(sm.exportMessage, error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function switchLegalPanel(name) {
  const selected = ["terms", "privacy", "refunds", "tokens"].includes(name) ? name : "terms";
  document.querySelectorAll("[data-legal-panel]").forEach(button => button.classList.toggle("active", button.dataset.legalPanel === selected));
  document.querySelectorAll(".legal-panel").forEach(panel => panel.classList.toggle("active", panel.id === `legalPanel${selected[0].toUpperCase()}${selected.slice(1)}`));
}

function openLegal(name = "terms") {
  if (!sm.legalDashboard) return;
  window.zone6ixAuth?.closeAccountMenu?.();
  document.querySelectorAll(".dashboard-modal.open").forEach(modal => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
  switchLegalPanel(name);
  sm.legalDashboard.classList.add("open");
  sm.legalDashboard.setAttribute("aria-hidden", "false");
  sm.backdrop?.classList.add("visible");
  sm.backdrop?.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeLegal() {
  if (!sm.legalDashboard?.classList.contains("open")) return;
  sm.legalDashboard.classList.remove("open");
  sm.legalDashboard.setAttribute("aria-hidden", "true");
  sm.backdrop?.classList.remove("visible");
  sm.backdrop?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function updatePermissionUi() {
  const p = permissions();
  const role = smAuth?.getAdminRole?.() || "support";
  const roleExports = {
    owner: new Set(["orders", "customers", "redemptions", "products", "store", "ledger", "audit"]),
    manager: new Set(["orders", "customers", "redemptions", "products", "store", "ledger", "audit"]),
    orders: new Set(["orders"]),
    store: new Set(["redemptions", "store"])
  };
  const allowedExports = roleExports[role] || new Set();
  if (sm.siteTab) sm.siteTab.hidden = !p.manageSite;
  if (sm.securityTab) sm.securityTab.hidden = !(p.viewAudit || (p.exportData && allowedExports.size));
  document.querySelectorAll("[data-export-type]").forEach(button => {
    button.hidden = !p.exportData || !allowedExports.has(button.dataset.exportType);
  });
  if (sm.refreshAudit) sm.refreshAudit.hidden = !p.viewAudit;
  if (sm.auditList && !p.viewAudit) sm.auditList.innerHTML = `<div class="dashboard-empty"><strong>Audit access unavailable.</strong><span>Your role does not include the admin activity log.</span></div>`;
}

function bind() {
  sm.siteForm?.addEventListener("submit", saveSiteSettings);
  sm.legalForm?.addEventListener("submit", saveLegalSettings);
  sm.refreshSite?.addEventListener("click", () => { smLoaded = false; loadSiteManager(true); });
  sm.productList?.addEventListener("click", event => {
    const button = event.target.closest("[data-save-core-product]");
    if (button) saveProduct(button.dataset.saveCoreProduct, button);
  });
  sm.refreshAudit?.addEventListener("click", () => { smAuditLoaded = false; loadAudit(true); });
  document.querySelectorAll("[data-export-type]").forEach(button => button.addEventListener("click", () => downloadExport(button.dataset.exportType, button)));
  document.querySelectorAll("[data-legal-tab]").forEach(button => button.addEventListener("click", () => openLegal(button.dataset.legalTab)));
  document.querySelectorAll("[data-legal-panel]").forEach(button => button.addEventListener("click", () => switchLegalPanel(button.dataset.legalPanel)));
  sm.closeLegal?.addEventListener("click", closeLegal);
  sm.backdrop?.addEventListener("click", () => { if (sm.legalDashboard?.classList.contains("open")) closeLegal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeLegal(); });
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.adminTab === "site") loadSiteManager();
    if (button.dataset.adminTab === "security") loadAudit();
  }));
  document.addEventListener("zone6ix-auth-change", () => {
    updatePermissionUi();
    if (!smAuth?.isAdmin?.()) {
      smLoaded = false;
      smAuditLoaded = false;
    }
  });
}

function initialise() {
  smAuth = window.zone6ixAuth;
  if (!smAuth) return false;
  updatePermissionUi();
  bind();
  return true;
}

if (!initialise()) {
  document.addEventListener("zone6ix-auth-module", initialise, { once: true });
}
