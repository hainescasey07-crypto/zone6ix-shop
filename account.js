import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const tr = value => window.zone6ixI18n?.t(value) ?? String(value ?? "");
const activeLocale = () => window.zone6ixI18n?.locale() ?? "en-GB";
const displayIdentity = value => window.zone6ixDisplayIdentity?.(value, "Owner") ?? String(value ?? "");

const firebaseConfig = {
  apiKey: "AIzaSyApYiotTOTsFFFL2H6lsxeNeEC5CjMuvXo",
  authDomain: "zone6ix-shop.firebaseapp.com",
  projectId: "zone6ix-shop",
  storageBucket: "zone6ix-shop.firebasestorage.app",
  messagingSenderId: "962808974469",
  appId: "1:962808974469:web:537613e8cd9d00420c6dec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let currentUser = null;
let accountProfile = null;
let adminAllowed = false;
let ownerAllowed = false;
let adminRole = null;
let adminPermissions = {};
let adminOrders = [];
let selectedAdminOrderId = null;
let readyResolved = false;
let resolveReady;
const ready = new Promise(resolve => { resolveReady = resolve; });

const elements = {
  accountButton: document.getElementById("accountButton"),
  accountMenu: document.getElementById("accountMenu"),
  accountAvatar: document.getElementById("accountAvatar"),
  accountLabel: document.getElementById("accountLabel"),
  accountSubLabel: document.getElementById("accountSubLabel"),
  accountMenuAvatar: document.getElementById("accountMenuAvatar"),
  accountMenuName: document.getElementById("accountMenuName"),
  accountMenuEmail: document.getElementById("accountMenuEmail"),
  myOrdersButton: document.getElementById("myOrdersButton"),
  adminButton: document.getElementById("adminButton"),
  signOutButton: document.getElementById("signOutButton"),
  orderSignInButton: document.getElementById("orderSignInButton"),
  orderAccountState: document.getElementById("orderAccountState"),
  dashboardBackdrop: document.getElementById("dashboardBackdrop"),
  ordersDashboard: document.getElementById("ordersDashboard"),
  adminDashboard: document.getElementById("adminDashboard"),
  closeOrdersDashboard: document.getElementById("closeOrdersDashboard"),
  closeAdminDashboard: document.getElementById("closeAdminDashboard"),
  refreshOrdersButton: document.getElementById("refreshOrdersButton"),
  refreshAdminButton: document.getElementById("refreshAdminButton"),
  ordersSummary: document.getElementById("ordersSummary"),
  ordersList: document.getElementById("ordersList"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  profileForm: document.getElementById("profileForm"),
  profileRobloxUsername: document.getElementById("profileRobloxUsername"),
  profileDiscordUsername: document.getElementById("profileDiscordUsername"),
  profileGangName: document.getElementById("profileGangName"),
  profileMessage: document.getElementById("profileMessage"),
  adminStats: document.getElementById("adminStats"),
  adminSearch: document.getElementById("adminSearch"),
  adminStatusFilter: document.getElementById("adminStatusFilter"),
  adminOrderList: document.getElementById("adminOrderList"),
  adminEditor: document.getElementById("adminEditor")
};

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function initials(name, email) {
  const source = (name || email || "Z6").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function avatarMarkup(user, cssClass = "") {
  if (user?.photoURL || accountProfile?.photoUrl) {
    const src = escapeHtml(user?.photoURL || accountProfile?.photoUrl);
    return `<img class="${cssClass}" src="${src}" alt="">`;
  }
  return `<span class="${cssClass}">${escapeHtml(initials(user?.displayName, user?.email))}</span>`;
}

function setAvatar(container, user) {
  if (!container) return;
  if (user?.photoURL) {
    container.innerHTML = `<img src="${escapeHtml(user.photoURL)}" alt="">`;
  } else if (user) {
    container.textContent = initials(user.displayName, user.email);
  } else {
    container.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"/></svg>`;
  }
}

function closeAccountMenu() {
  elements.accountMenu?.classList.remove("open");
  elements.accountMenu?.setAttribute("aria-hidden", "true");
  elements.accountButton?.setAttribute("aria-expanded", "false");
}

function toggleAccountMenu() {
  if (!currentUser) {
    signInUser();
    return;
  }
  const opening = !elements.accountMenu.classList.contains("open");
  elements.accountMenu.classList.toggle("open", opening);
  elements.accountMenu.setAttribute("aria-hidden", String(!opening));
  elements.accountButton.setAttribute("aria-expanded", String(opening));
}

function closeDashboards() {
  document.querySelectorAll(".dashboard-modal.open").forEach(modal => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
  elements.dashboardBackdrop?.classList.remove("visible");
  elements.dashboardBackdrop?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
  document.dispatchEvent(new CustomEvent("zone6ix-dashboards-closed"));
}

function openDashboard(target) {
  if (!target) return;
  closeAccountMenu();
  closeDashboards();
  target.classList.add("open");
  target.setAttribute("aria-hidden", "false");
  elements.dashboardBackdrop?.classList.add("visible");
  elements.dashboardBackdrop?.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

async function signInUser() {
  try {
    await signInWithPopup(auth, provider);
    return auth.currentUser;
  } catch (error) {
    const redirectCodes = ["auth/popup-blocked", "auth/cancelled-popup-request", "auth/web-storage-unsupported"];
    if (redirectCodes.includes(error?.code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    if (error?.code !== "auth/popup-closed-by-user") {
      console.error("Google sign-in failed:", error);
      alert(`${tr("Google sign-in failed")}: ${tr(error?.message || "Unknown error")}`);
    }
    return null;
  }
}

async function getToken(forceRefresh = false) {
  // Firebase can restore a saved user before the public `ready` promise has
  // resolved. Do not wait on that same promise when we already have the user,
  // otherwise the first account sync after a page refresh can deadlock.
  let user = currentUser || auth.currentUser;
  if (!user && !readyResolved) {
    await ready;
    user = currentUser || auth.currentUser;
  }
  if (!user) return null;
  currentUser = user;
  return user.getIdToken(forceRefresh);
}

async function requireUser() {
  await ready;
  if (currentUser) return currentUser;
  const user = await signInUser();
  if (user) return user;
  await new Promise(resolve => setTimeout(resolve, 250));
  return auth.currentUser;
}

async function apiFetch(url, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("Sign in with Google first.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && currentUser) {
    const freshToken = await getToken(true);
    headers.set("Authorization", `Bearer ${freshToken}`);
    response = await fetch(url, { ...options, headers });
  }

  let data = {};
  const text = await response.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function prefillOrderForm() {
  const emailInput = document.getElementById("customerEmail");
  const robloxInput = document.getElementById("robloxUsername");
  const discordInput = document.getElementById("discordUsername");
  const gangInput = document.getElementById("gangName");

  if (!currentUser) {
    if (emailInput) emailInput.value = "";
    return;
  }

  if (emailInput) emailInput.value = displayIdentity(currentUser.email || "");
  if (robloxInput && !robloxInput.value) robloxInput.value = accountProfile?.robloxUsername || "";
  if (discordInput && !discordInput.value) discordInput.value = accountProfile?.discordUsername || "";
  if (gangInput && !gangInput.value) gangInput.value = accountProfile?.gangName || "";
}

function updateAccountUi() {
  if (!currentUser) {
    setAvatar(elements.accountAvatar, null);
    setAvatar(elements.accountMenuAvatar, null);
    elements.accountLabel.textContent = tr("Sign in");
    elements.accountSubLabel.textContent = tr("Google account");
    elements.accountMenuName.textContent = tr("Not signed in");
    elements.accountMenuEmail.textContent = tr("Sign in to save orders");
    elements.myOrdersButton.hidden = true;
    elements.adminButton.hidden = true;
    elements.signOutButton.hidden = true;
    elements.orderSignInButton.hidden = false;
    elements.orderSignInButton.textContent = tr("Sign in");
    elements.orderAccountState.classList.remove("signed-in");
    elements.orderAccountState.querySelector("strong").textContent = tr("Google sign-in required");
    elements.orderAccountState.querySelector("small").textContent = tr("Your order and progress will be saved to your account.");
    const icon = elements.orderAccountState.querySelector(".order-account-icon");
    setAvatar(icon, null);
    prefillOrderForm();
    return;
  }

  const name = currentUser.displayName || tr("Zone6ix customer");
  setAvatar(elements.accountAvatar, currentUser);
  setAvatar(elements.accountMenuAvatar, currentUser);
  elements.accountLabel.textContent = name.split(" ")[0];
  elements.accountSubLabel.textContent = ownerAllowed
    ? tr("Owner account")
    : adminAllowed
      ? tr("Admin account")
      : tr("My Zone6ix");
  elements.accountMenuName.textContent = name;
  elements.accountMenuEmail.textContent = displayIdentity(currentUser.email || "");
  elements.myOrdersButton.hidden = false;
  elements.adminButton.hidden = !adminAllowed;
  elements.signOutButton.hidden = false;
  elements.orderSignInButton.hidden = false;
  elements.orderSignInButton.textContent = tr("My orders");
  elements.orderAccountState.classList.add("signed-in");
  elements.orderAccountState.querySelector("strong").textContent = tr(`Signed in as ${name}`);
  elements.orderAccountState.querySelector("small").textContent = tr("This order and every update will be saved to My Orders.");
  setAvatar(elements.orderAccountState.querySelector(".order-account-icon"), currentUser);
  prefillOrderForm();
}

async function syncAccount() {
  if (!currentUser) return;
  try {
    const data = await apiFetch("/api/account", {
      method: "POST",
      body: JSON.stringify({})
    });
    accountProfile = data.user || null;
    adminAllowed = Boolean(data.isAdmin);
    ownerAllowed = Boolean(data.isOwner);
    adminRole = data.adminRole || null;
    adminPermissions = data.permissions || {};
    updateAccountUi();
  } catch (error) {
    console.error("Account sync failed:", error);
    ownerAllowed = currentUser.email?.toLowerCase() === "hainescasey07@gmail.com";
    adminAllowed = ownerAllowed;
    adminRole = ownerAllowed ? "owner" : null;
    adminPermissions = ownerAllowed ? { viewOrders: true, manageOrders: true, deleteOrders: true, manageStore: true, manageRedemptions: true, manageTokens: true, viewCustomers: true, manageCustomers: true, manageSite: true, viewChat: true, manageChat: true, exportData: true, viewAudit: true, manageAdmins: true } : {};
    updateAccountUi();
  }
}

function formatDate(value, translated = true) {
  if (!value) return translated ? tr("Unknown date") : "Unknown date";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(translated ? activeLocale() : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

const statusNames = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  reviewing: "Reviewing",
  in_progress: "In progress",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
  robux_pending: "Robux pending",
  robux_verified: "Robux verified"
};

function statusName(value, translated = true) {
  const raw = statusNames[value] || String(value || "Unknown").replaceAll("_", " ");
  return translated ? tr(raw) : raw;
}

function orderTotal(order, translated = true) {
  const locale = translated ? activeLocale() : "en-GB";
  if (order.payment_method === "robux") return `${Number(order.robux_total || 0).toLocaleString(locale)} R$`;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "GBP" }).format(Number(order.cash_total_pence || 0) / 100);
}

function renderCustomerOrders(orders) {
  const active = orders.filter(order => !["completed", "cancelled"].includes(order.order_status)).length;
  const completed = orders.filter(order => order.order_status === "completed").length;
  const paid = orders.filter(order => ["paid", "robux_verified"].includes(order.payment_status)).length;

  elements.ordersSummary.innerHTML = [
    [tr("All orders"), orders.length],
    [tr("Active builds"), active],
    [tr("Payments confirmed"), paid],
    [tr("Completed"), completed]
  ].map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`).join("");

  if (!orders.length) {
    elements.ordersList.innerHTML = `<div class="dashboard-empty"><strong>${tr("No saved orders yet.")}</strong><span>${tr("Your next Stripe or Robux order will appear here automatically.")}</span></div>`;
    return;
  }

  elements.ordersList.innerHTML = orders.map(order => {
    const latestVisibleUpdate = [...(order.updates || [])]
      .filter(update => Number(update.visible_to_customer) === 1)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    const updateText = order.customer_update || latestVisibleUpdate?.message || tr("No new update has been added yet.");
    const items = (order.items || []).map(item => `<li><span>${escapeHtml(tr(item.product_name))}${Number(item.quantity) > 1 ? ` × ${Number(item.quantity)}` : ""}</span><strong>${order.payment_method === "robux" ? `${Number(item.robux_price || 0).toLocaleString(activeLocale())} R$` : `£${(Number(item.cash_price_pence || 0) / 100).toFixed(2)}`}</strong></li>`).join("");
    return `
      <article class="order-history-card">
        <div class="order-history-head">
          <div class="order-history-code"><small>${tr("Order code")}</small><strong>${escapeHtml(order.order_code)}</strong></div>
          <span class="order-status-pill status-${escapeHtml(order.order_status)}">${escapeHtml(statusName(order.order_status))}</span>
          <div class="order-history-total"><small>${order.payment_method === "robux" ? tr("Robux total") : tr("Card total")}</small><strong>${escapeHtml(orderTotal(order))}</strong></div>
        </div>
        <div class="order-history-body">
          <div class="order-history-products"><h4>${tr("Products")}</h4><ul>${items || `<li><span>${tr("No items found")}</span></li>`}</ul></div>
          <div class="order-history-update"><h4>${tr("Latest update")}</h4><p>${escapeHtml(updateText)}</p></div>
        </div>
        ${(order.gang_shirt_link || order.gang_pants_link || order.gang_group_link) ? `<div class="order-history-links">
          ${order.gang_shirt_link ? `<a href="${escapeHtml(order.gang_shirt_link)}" target="_blank" rel="noopener">${tr("Gang shirt")}</a>` : ""}
          ${order.gang_pants_link ? `<a href="${escapeHtml(order.gang_pants_link)}" target="_blank" rel="noopener">${tr("Gang pants")}</a>` : ""}
          ${order.gang_group_link ? `<a href="${escapeHtml(order.gang_group_link)}" target="_blank" rel="noopener">${tr("Gang group")}</a>` : ""}
        </div>` : ""}
        <div class="order-meta-line">
          <span>${escapeHtml(order.gang_name)}</span>
          <span>${escapeHtml(order.roblox_username)}</span>
          <span>${escapeHtml(statusName(order.payment_status))}</span>
          <span>${escapeHtml(formatDate(order.created_at))}</span>
        </div>
      </article>`;
  }).join("");
}

async function loadOrders() {
  if (!currentUser) return;
  elements.ordersList.innerHTML = `<div class="dashboard-loading"><i></i><span>${tr("Loading your orders…")}</span></div>`;
  try {
    const data = await apiFetch("/api/orders");
    renderCustomerOrders(data.orders || []);
  } catch (error) {
    elements.ordersList.innerHTML = `<div class="dashboard-error"><strong>${tr("Could not load your orders.")}</strong><span>${escapeHtml(tr(error.message))}</span></div>`;
  }
}

async function openOrdersDashboard() {
  const user = await requireUser();
  if (!user) return;
  closeAccountMenu();
  elements.profileName.textContent = currentUser.displayName || tr("Zone6ix customer");
  elements.profileEmail.textContent = displayIdentity(currentUser.email || "");
  setAvatar(elements.profileAvatar, currentUser);
  elements.profileRobloxUsername.value = accountProfile?.robloxUsername || "";
  elements.profileDiscordUsername.value = accountProfile?.discordUsername || "";
  elements.profileGangName.value = accountProfile?.gangName || "";
  elements.profileMessage.textContent = "";
  openDashboard(elements.ordersDashboard);
  await loadOrders();
}

async function saveProfile(event) {
  event.preventDefault();
  elements.profileMessage.textContent = tr("Saving…");
  try {
    const data = await apiFetch("/api/account", {
      method: "POST",
      body: JSON.stringify({
        robloxUsername: elements.profileRobloxUsername.value.trim(),
        discordUsername: elements.profileDiscordUsername.value.trim(),
        gangName: elements.profileGangName.value.trim()
      })
    });
    accountProfile = data.user;
    elements.profileMessage.textContent = tr("Saved. These details will fill your next order.");
    prefillOrderForm();
  } catch (error) {
    elements.profileMessage.textContent = tr(error.message);
  }
}

function getFilteredAdminOrders() {
  const search = elements.adminSearch.value.trim().toLowerCase();
  const status = elements.adminStatusFilter.value;
  return adminOrders.filter(order => {
    if (status !== "all" && order.order_status !== status) return false;
    if (!search) return true;
    const haystack = [
      order.order_code,
      order.gang_name,
      order.roblox_username,
      order.discord_username,
      order.customer_email,
      order.customer_name
    ].join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

function renderAdminStats() {
  const counts = {
    total: adminOrders.length,
    paid: adminOrders.filter(order => ["paid", "robux_verified"].includes(order.payment_status)).length,
    active: adminOrders.filter(order => ["reviewing", "in_progress", "ready"].includes(order.order_status)).length,
    completed: adminOrders.filter(order => order.order_status === "completed").length
  };
  elements.adminStats.innerHTML = [
    ["All orders", counts.total],
    ["Payments confirmed", counts.paid],
    ["Active builds", counts.active],
    ["Completed", counts.completed]
  ].map(([label, value]) => `<article class="admin-stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderAdminOrderList() {
  const filtered = getFilteredAdminOrders();
  if (!filtered.length) {
    elements.adminOrderList.innerHTML = `<div class="dashboard-empty"><strong>No matching orders.</strong><span>Change the search or status filter.</span></div>`;
    return;
  }
  elements.adminOrderList.innerHTML = filtered.map(order => `
    <button class="admin-order-row ${order.id === selectedAdminOrderId ? "selected" : ""}" type="button" data-admin-order-id="${escapeHtml(order.id)}">
      <span><strong>${escapeHtml(order.order_code)} · ${escapeHtml(order.gang_name)}</strong><small>${escapeHtml(order.roblox_username)} · ${escapeHtml(displayIdentity(order.customer_email))}</small></span>
      <span><strong>${escapeHtml(statusName(order.order_status, false))}</strong><small>${escapeHtml(statusName(order.payment_status, false))} · ${escapeHtml(formatDate(order.created_at, false))}</small></span>
      <span class="admin-row-total">${escapeHtml(orderTotal(order, false))}</span>
    </button>`).join("");
  elements.adminOrderList.querySelectorAll("[data-admin-order-id]").forEach(button => {
    button.addEventListener("click", () => selectAdminOrder(button.dataset.adminOrderId));
  });
}

function adminProducts(order) {
  return (order.items || []).map(item => `<li>${escapeHtml(item.product_name)}${Number(item.quantity) > 1 ? ` × ${Number(item.quantity)}` : ""}</li>`).join("") || "<li>No products found</li>";
}

function selectAdminOrder(orderId) {
  selectedAdminOrderId = orderId;
  const order = adminOrders.find(item => item.id === orderId);
  renderAdminOrderList();
  if (!order) return;
  const canManage = Boolean(adminPermissions.manageOrders);
  const canDelete = Boolean(adminPermissions.deleteOrders);
  elements.adminEditor.innerHTML = `
    <div class="admin-editor-head">
      <div><small>${escapeHtml(order.order_code)}</small><h3>${escapeHtml(order.gang_name)}</h3></div>
      <span class="order-status-pill status-${escapeHtml(order.order_status)}">${escapeHtml(statusName(order.order_status, false))}</span>
    </div>

    <div class="admin-detail-grid">
      <div class="admin-detail"><span>Customer</span><strong>${escapeHtml(order.customer_name || "Unknown")}</strong></div>
      <div class="admin-detail"><span>Email</span><strong>${escapeHtml(displayIdentity(order.customer_email))}</strong></div>
      <div class="admin-detail"><span>Roblox</span><strong>${escapeHtml(order.roblox_username)}</strong></div>
      <div class="admin-detail"><span>Discord</span><strong>${escapeHtml(order.discord_username)}</strong></div>
      <div class="admin-detail"><span>Payment method</span><strong>${escapeHtml(order.payment_method === "robux" ? "Robux" : "Stripe card")}</strong></div>
      <div class="admin-detail"><span>Total</span><strong>${escapeHtml(orderTotal(order, false))}</strong></div>
      <div class="admin-detail"><span>Created</span><strong>${escapeHtml(formatDate(order.created_at, false))}</strong></div>
      <div class="admin-detail"><span>Stripe session</span><strong>${escapeHtml(order.stripe_checkout_session_id || "Not applicable")}</strong></div>
    </div>

    <section class="admin-editor-section"><h4>Products</h4><ul>${adminProducts(order)}</ul></section>
    <section class="admin-editor-section"><h4>Customer request</h4><p>${escapeHtml(order.custom_request)}</p></section>
    ${order.reference_link ? `<section class="admin-editor-section"><h4>Reference link</h4><p><a href="${escapeHtml(order.reference_link)}" target="_blank" rel="noopener">Open reference</a></p></section>` : ""}
    ${(order.gang_shirt_link || order.gang_pants_link || order.gang_group_link) ? `<section class="admin-editor-section"><h4>Gang clothing and group</h4><div class="admin-resource-links">
      ${order.gang_shirt_link ? `<a href="${escapeHtml(order.gang_shirt_link)}" target="_blank" rel="noopener">Open gang shirt</a>` : ""}
      ${order.gang_pants_link ? `<a href="${escapeHtml(order.gang_pants_link)}" target="_blank" rel="noopener">Open gang pants</a>` : ""}
      ${order.gang_group_link ? `<a href="${escapeHtml(order.gang_group_link)}" target="_blank" rel="noopener">Open gang group</a>` : ""}
    </div></section>` : ""}

    <label class="admin-editor-field"><span>Order status</span>
      <select id="adminOrderStatus" ${canManage ? "" : "disabled"}>
        ${["awaiting_payment", "paid", "reviewing", "in_progress", "ready", "completed", "cancelled"].map(value => `<option value="${value}" ${order.order_status === value ? "selected" : ""}>${statusName(value, false)}</option>`).join("")}
      </select>
    </label>

    <label class="admin-editor-field"><span>Payment status</span>
      <select id="adminPaymentStatus" ${canManage ? "" : "disabled"}>
        ${["unpaid", "pending", "paid", "failed", "refunded", "robux_pending", "robux_verified"].map(value => `<option value="${value}" ${order.payment_status === value ? "selected" : ""}>${statusName(value, false)}</option>`).join("")}
      </select>
    </label>

    <label class="admin-editor-field"><span>Customer-visible update</span>
      <textarea id="adminCustomerUpdate" ${canManage ? "" : "disabled"} placeholder="Example: The exterior is finished and the armoury is being built next.">${escapeHtml(order.customer_update || "")}</textarea>
    </label>

    <label class="admin-editor-field"><span>Private admin note</span>
      <textarea id="adminPrivateNote" ${canManage ? "" : "disabled"} placeholder="Only you can see this note.">${escapeHtml(order.admin_private_note || "")}</textarea>
    </label>

    <div class="admin-save-row">
      ${canManage ? `<button class="dashboard-primary" id="saveAdminOrder" type="button">Save order update</button>` : `<span class="admin-readonly-note">View-only access</span>`}
      ${canDelete ? `<button class="dashboard-delete" id="deleteAdminOrder" type="button">Delete order permanently</button>` : ""}
      <span class="admin-save-message" id="adminSaveMessage"></span>
    </div>`;
  document.getElementById("saveAdminOrder")?.addEventListener("click", saveAdminOrder);
  document.getElementById("deleteAdminOrder")?.addEventListener("click", deleteAdminOrder);
}

async function saveAdminOrder() {
  if (!selectedAdminOrderId || !adminPermissions.manageOrders) return;
  const message = document.getElementById("adminSaveMessage");
  const button = document.getElementById("saveAdminOrder");
  button.disabled = true;
  message.textContent = "Saving…";
  try {
    const data = await apiFetch("/api/admin-orders", {
      method: "PATCH",
      body: JSON.stringify({
        orderId: selectedAdminOrderId,
        orderStatus: document.getElementById("adminOrderStatus").value,
        paymentStatus: document.getElementById("adminPaymentStatus").value,
        customerUpdate: document.getElementById("adminCustomerUpdate").value.trim(),
        adminPrivateNote: document.getElementById("adminPrivateNote").value.trim()
      })
    });
    const index = adminOrders.findIndex(order => order.id === selectedAdminOrderId);
    if (index !== -1) adminOrders[index] = data.order;
    renderAdminStats();
    renderAdminOrderList();
    selectAdminOrder(selectedAdminOrderId);
    document.getElementById("adminSaveMessage").textContent = "Saved";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteAdminOrder() {
  if (!selectedAdminOrderId || !adminPermissions.deleteOrders) return;
  const order = adminOrders.find(item => item.id === selectedAdminOrderId);
  if (!order) return;
  const confirmed = confirm(`Permanently delete order ${order.order_code}? This removes it from Admin and the customer's My Orders history.`);
  if (!confirmed) return;

  const button = document.getElementById("deleteAdminOrder");
  const message = document.getElementById("adminSaveMessage");
  if (button) button.disabled = true;
  if (message) message.textContent = "Deleting order…";

  try {
    await apiFetch(`/api/admin-orders?orderId=${encodeURIComponent(selectedAdminOrderId)}`, {
      method: "DELETE"
    });
    adminOrders = adminOrders.filter(item => item.id !== selectedAdminOrderId);
    selectedAdminOrderId = null;
    renderAdminStats();
    renderAdminOrderList();
    elements.adminEditor.innerHTML = `<div class="admin-editor-empty">
      <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 10h40v44H12z"/><path d="M20 21h24M20 31h24M20 41h15"/></svg>
      <strong>Order deleted</strong><span>Select another order to manage it.</span>
    </div>`;
    if (elements.ordersDashboard?.classList.contains("open")) await loadOrders();
  } catch (error) {
    if (message) message.textContent = error.message;
    if (button) button.disabled = false;
  }
}

async function loadAdminOrders() {
  if (!adminPermissions.viewOrders) {
    elements.adminOrderList.innerHTML = `<div class="dashboard-empty"><strong>Orders access unavailable.</strong><span>Choose another dashboard section permitted by your role.</span></div>`;
    return;
  }
  elements.adminOrderList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading all orders…</span></div>`;
  try {
    const data = await apiFetch("/api/admin-orders");
    adminOrders = data.orders || [];
    renderAdminStats();
    renderAdminOrderList();
    if (selectedAdminOrderId && adminOrders.some(order => order.id === selectedAdminOrderId)) {
      selectAdminOrder(selectedAdminOrderId);
    }
  } catch (error) {
    elements.adminOrderList.innerHTML = `<div class="dashboard-error"><strong>Could not load admin orders.</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

async function openAdminDashboard() {
  closeAccountMenu();

  if (!elements.adminDashboard || !elements.dashboardBackdrop) {
    alert("The admin dashboard files are out of sync. Refresh the page after the latest deployment finishes.");
    return;
  }

  // Open immediately so the click always gives visible feedback, even if the API is slow.
  openDashboard(elements.adminDashboard);
  elements.adminOrderList.innerHTML = `<div class="dashboard-loading"><i></i><span>Checking admin access…</span></div>`;

  const user = await requireUser();
  if (!user || !adminAllowed) {
    closeDashboards();
    alert("This Google account does not have admin access.");
    return;
  }

  if (adminPermissions.viewOrders) await loadAdminOrders();
  document.dispatchEvent(new CustomEvent("zone6ix-admin-opened", { detail: { permissions: { ...adminPermissions }, role: adminRole } }));
}

function bindEvents() {
  elements.accountButton?.addEventListener("click", event => {
    event.stopPropagation();
    toggleAccountMenu();
  });
  elements.accountMenu?.addEventListener("click", event => event.stopPropagation());
  document.addEventListener("click", closeAccountMenu);
  elements.orderSignInButton?.addEventListener("click", () => currentUser ? openOrdersDashboard() : signInUser());
  elements.myOrdersButton?.addEventListener("click", openOrdersDashboard);
  elements.adminButton?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    openAdminDashboard().catch(error => {
      console.error("Admin dashboard failed to open:", error);
      alert(error?.message || "The admin dashboard could not open.");
    });
  });
  elements.signOutButton?.addEventListener("click", async () => {
    closeAccountMenu();
    closeDashboards();
    await signOut(auth);
  });
  elements.closeOrdersDashboard?.addEventListener("click", closeDashboards);
  elements.closeAdminDashboard?.addEventListener("click", closeDashboards);
  elements.dashboardBackdrop?.addEventListener("click", closeDashboards);
  elements.refreshOrdersButton?.addEventListener("click", loadOrders);
  elements.refreshAdminButton?.addEventListener("click", () => { if (adminPermissions.viewOrders) loadAdminOrders(); });
  elements.profileForm?.addEventListener("submit", saveProfile);
  elements.adminSearch?.addEventListener("input", renderAdminOrderList);
  elements.adminStatusFilter?.addEventListener("change", renderAdminOrderList);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAccountMenu();
      closeDashboards();
    }
  });
}

document.addEventListener("zone6ix-language-change", () => {
  updateAccountUi();
  if (elements.ordersDashboard?.classList.contains("open") && currentUser) {
    loadOrders().catch(() => {});
  }
});

window.zone6ixAuth = {
  ready,
  getUser: () => currentUser,
  getProfile: () => accountProfile,
  getToken,
  requireUser,
  signIn: signInUser,
  signOut: () => signOut(auth),
  apiFetch,
  openMyOrders: openOrdersDashboard,
  refreshOrders: loadOrders,
  isAdmin: () => adminAllowed,
  isOwner: () => ownerAllowed,
  getAdminRole: () => adminRole,
  getPermissions: () => ({ ...adminPermissions }),
  hasPermission: permission => Boolean(adminPermissions?.[permission]),
  openAdmin: openAdminDashboard,
  openDashboard,
  closeDashboards,
  closeAccountMenu,
  syncAccount
};

document.dispatchEvent(new CustomEvent("zone6ix-auth-module"));
bindEvents();

let restoredSessionSync = Promise.resolve();

function announceAuthState(user) {
  document.dispatchEvent(new CustomEvent("zone6ix-auth-change", {
    detail: {
      user,
      isAdmin: adminAllowed,
      isOwner: ownerAllowed,
      role: adminRole,
      permissions: { ...adminPermissions }
    }
  }));
}

async function restoreCurrentSession({ forceTokenRefresh = false } = {}) {
  const user = auth.currentUser;
  if (!user) return;

  restoredSessionSync = restoredSessionSync.then(async () => {
    currentUser = user;
    try {
      if (forceTokenRefresh) await user.getIdToken(true);
      await syncAccount();
      announceAuthState(user);
    } catch (error) {
      console.error("Saved login refresh failed:", error);
    }
  });

  return restoredSessionSync;
}

async function bootAuthentication() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Auth persistence error:", error);
  }

  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("Google redirect result error:", error);
  }

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    accountProfile = null;
    adminAllowed = false;
    ownerAllowed = false;
    adminRole = null;
    adminPermissions = {};
    updateAccountUi();

    // Finish the secure account/admin sync before announcing that auth is
    // ready. Other modules can now trust tokens, role permissions and wallet
    // access immediately after a normal refresh or a reopened Safari tab.
    if (user) await syncAccount();

    if (!readyResolved) {
      readyResolved = true;
      resolveReady(user);
      document.dispatchEvent(new CustomEvent("zone6ix-auth-ready", {
        detail: { user, isAdmin: adminAllowed, isOwner: ownerAllowed }
      }));
    }

    announceAuthState(user);
  });
}

// Safari can restore a page from its back/forward cache without re-running
// every network request. Re-check the saved Firebase session when that occurs.
window.addEventListener("pageshow", event => {
  if (event.persisted && auth.currentUser) restoreCurrentSession({ forceTokenRefresh: true });
});

bootAuthentication().catch(error => console.error("Authentication failed to initialise:", error));
