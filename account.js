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
  elements.ordersDashboard?.classList.remove("open");
  elements.ordersDashboard?.setAttribute("aria-hidden", "true");
  elements.adminDashboard?.classList.remove("open");
  elements.adminDashboard?.setAttribute("aria-hidden", "true");
  elements.dashboardBackdrop?.classList.remove("visible");
  elements.dashboardBackdrop?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function openDashboard(target) {
  closeAccountMenu();
  closeDashboards();
  target.classList.add("open");
  target.setAttribute("aria-hidden", "false");
  elements.dashboardBackdrop.classList.add("visible");
  elements.dashboardBackdrop.setAttribute("aria-hidden", "false");
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
      alert(`Google sign-in failed: ${error?.message || "Unknown error"}`);
    }
    return null;
  }
}

async function getToken(forceRefresh = false) {
  await ready;
  if (!currentUser) return null;
  return currentUser.getIdToken(forceRefresh);
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
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

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

  if (emailInput) emailInput.value = currentUser.email || "";
  if (robloxInput && !robloxInput.value) robloxInput.value = accountProfile?.robloxUsername || "";
  if (discordInput && !discordInput.value) discordInput.value = accountProfile?.discordUsername || "";
  if (gangInput && !gangInput.value) gangInput.value = accountProfile?.gangName || "";
}

function updateAccountUi() {
  if (!currentUser) {
    setAvatar(elements.accountAvatar, null);
    setAvatar(elements.accountMenuAvatar, null);
    elements.accountLabel.textContent = "Sign in";
    elements.accountSubLabel.textContent = "Google account";
    elements.accountMenuName.textContent = "Not signed in";
    elements.accountMenuEmail.textContent = "Sign in to save orders";
    elements.myOrdersButton.hidden = true;
    elements.adminButton.hidden = true;
    elements.signOutButton.hidden = true;
    elements.orderSignInButton.hidden = false;
    elements.orderSignInButton.textContent = "Sign in";
    elements.orderAccountState.classList.remove("signed-in");
    elements.orderAccountState.querySelector("strong").textContent = "Google sign-in required";
    elements.orderAccountState.querySelector("small").textContent = "Your order and progress will be saved to your account.";
    const icon = elements.orderAccountState.querySelector(".order-account-icon");
    setAvatar(icon, null);
    prefillOrderForm();
    return;
  }

  const name = currentUser.displayName || "Zone6ix customer";
  setAvatar(elements.accountAvatar, currentUser);
  setAvatar(elements.accountMenuAvatar, currentUser);
  elements.accountLabel.textContent = name.split(" ")[0];
  elements.accountSubLabel.textContent = adminAllowed ? "Owner account" : "My Zone6ix";
  elements.accountMenuName.textContent = name;
  elements.accountMenuEmail.textContent = currentUser.email || "";
  elements.myOrdersButton.hidden = false;
  elements.adminButton.hidden = !adminAllowed;
  elements.signOutButton.hidden = false;
  elements.orderSignInButton.hidden = false;
  elements.orderSignInButton.textContent = "My orders";
  elements.orderAccountState.classList.add("signed-in");
  elements.orderAccountState.querySelector("strong").textContent = `Signed in as ${name}`;
  elements.orderAccountState.querySelector("small").textContent = "This order and every update will be saved to My Orders.";
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
    updateAccountUi();
  } catch (error) {
    console.error("Account sync failed:", error);
    adminAllowed = currentUser.email?.toLowerCase() === "hainescasey07@gmail.com";
    updateAccountUi();
  }
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
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

function statusName(value) {
  return statusNames[value] || String(value || "Unknown").replaceAll("_", " ");
}

function orderTotal(order) {
  if (order.payment_method === "robux") return `${Number(order.robux_total || 0).toLocaleString("en-GB")} R$`;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(order.cash_total_pence || 0) / 100);
}

function renderCustomerOrders(orders) {
  const active = orders.filter(order => !["completed", "cancelled"].includes(order.order_status)).length;
  const completed = orders.filter(order => order.order_status === "completed").length;
  const paid = orders.filter(order => ["paid", "robux_verified"].includes(order.payment_status)).length;

  elements.ordersSummary.innerHTML = [
    ["All orders", orders.length],
    ["Active builds", active],
    ["Payments confirmed", paid],
    ["Completed", completed]
  ].map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`).join("");

  if (!orders.length) {
    elements.ordersList.innerHTML = `<div class="dashboard-empty"><strong>No saved orders yet.</strong><span>Your next Stripe or Robux order will appear here automatically.</span></div>`;
    return;
  }

  elements.ordersList.innerHTML = orders.map(order => {
    const latestVisibleUpdate = [...(order.updates || [])]
      .filter(update => Number(update.visible_to_customer) === 1)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    const updateText = order.customer_update || latestVisibleUpdate?.message || "No new update has been added yet.";
    const items = (order.items || []).map(item => `<li><span>${escapeHtml(item.product_name)}${Number(item.quantity) > 1 ? ` × ${Number(item.quantity)}` : ""}</span><strong>${order.payment_method === "robux" ? `${Number(item.robux_price || 0).toLocaleString("en-GB")} R$` : `£${(Number(item.cash_price_pence || 0) / 100).toFixed(2)}`}</strong></li>`).join("");
    return `
      <article class="order-history-card">
        <div class="order-history-head">
          <div class="order-history-code"><small>Order code</small><strong>${escapeHtml(order.order_code)}</strong></div>
          <span class="order-status-pill status-${escapeHtml(order.order_status)}">${escapeHtml(statusName(order.order_status))}</span>
          <div class="order-history-total"><small>${order.payment_method === "robux" ? "Robux total" : "Card total"}</small><strong>${escapeHtml(orderTotal(order))}</strong></div>
        </div>
        <div class="order-history-body">
          <div class="order-history-products"><h4>Products</h4><ul>${items || "<li><span>No items found</span></li>"}</ul></div>
          <div class="order-history-update"><h4>Latest update</h4><p>${escapeHtml(updateText)}</p></div>
        </div>
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
  elements.ordersList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading your orders…</span></div>`;
  try {
    const data = await apiFetch("/api/orders");
    renderCustomerOrders(data.orders || []);
  } catch (error) {
    elements.ordersList.innerHTML = `<div class="dashboard-error"><strong>Could not load your orders.</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

async function openOrdersDashboard() {
  const user = await requireUser();
  if (!user) return;
  closeAccountMenu();
  elements.profileName.textContent = currentUser.displayName || "Zone6ix customer";
  elements.profileEmail.textContent = currentUser.email || "";
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
  elements.profileMessage.textContent = "Saving…";
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
    elements.profileMessage.textContent = "Saved. These details will fill your next order.";
    prefillOrderForm();
  } catch (error) {
    elements.profileMessage.textContent = error.message;
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
      <span><strong>${escapeHtml(order.order_code)} · ${escapeHtml(order.gang_name)}</strong><small>${escapeHtml(order.roblox_username)} · ${escapeHtml(order.customer_email)}</small></span>
      <span><strong>${escapeHtml(statusName(order.order_status))}</strong><small>${escapeHtml(statusName(order.payment_status))} · ${escapeHtml(formatDate(order.created_at))}</small></span>
      <span class="admin-row-total">${escapeHtml(orderTotal(order))}</span>
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
  elements.adminEditor.innerHTML = `
    <div class="admin-editor-head">
      <div><small>${escapeHtml(order.order_code)}</small><h3>${escapeHtml(order.gang_name)}</h3></div>
      <span class="order-status-pill status-${escapeHtml(order.order_status)}">${escapeHtml(statusName(order.order_status))}</span>
    </div>

    <div class="admin-detail-grid">
      <div class="admin-detail"><span>Customer</span><strong>${escapeHtml(order.customer_name || "Unknown")}</strong></div>
      <div class="admin-detail"><span>Email</span><strong>${escapeHtml(order.customer_email)}</strong></div>
      <div class="admin-detail"><span>Roblox</span><strong>${escapeHtml(order.roblox_username)}</strong></div>
      <div class="admin-detail"><span>Discord</span><strong>${escapeHtml(order.discord_username)}</strong></div>
      <div class="admin-detail"><span>Payment method</span><strong>${escapeHtml(order.payment_method === "robux" ? "Robux" : "Stripe card")}</strong></div>
      <div class="admin-detail"><span>Total</span><strong>${escapeHtml(orderTotal(order))}</strong></div>
      <div class="admin-detail"><span>Created</span><strong>${escapeHtml(formatDate(order.created_at))}</strong></div>
      <div class="admin-detail"><span>Stripe session</span><strong>${escapeHtml(order.stripe_checkout_session_id || "Not applicable")}</strong></div>
    </div>

    <section class="admin-editor-section"><h4>Products</h4><ul>${adminProducts(order)}</ul></section>
    <section class="admin-editor-section"><h4>Customer request</h4><p>${escapeHtml(order.custom_request)}</p></section>
    ${order.reference_link ? `<section class="admin-editor-section"><h4>Reference link</h4><p>${escapeHtml(order.reference_link)}</p></section>` : ""}

    <label class="admin-editor-field"><span>Order status</span>
      <select id="adminOrderStatus">
        ${["awaiting_payment", "paid", "reviewing", "in_progress", "ready", "completed", "cancelled"].map(value => `<option value="${value}" ${order.order_status === value ? "selected" : ""}>${statusName(value)}</option>`).join("")}
      </select>
    </label>

    <label class="admin-editor-field"><span>Payment status</span>
      <select id="adminPaymentStatus">
        ${["unpaid", "pending", "paid", "failed", "refunded", "robux_pending", "robux_verified"].map(value => `<option value="${value}" ${order.payment_status === value ? "selected" : ""}>${statusName(value)}</option>`).join("")}
      </select>
    </label>

    <label class="admin-editor-field"><span>Customer-visible update</span>
      <textarea id="adminCustomerUpdate" placeholder="Example: The exterior is finished and the armoury is being built next.">${escapeHtml(order.customer_update || "")}</textarea>
    </label>

    <label class="admin-editor-field"><span>Private admin note</span>
      <textarea id="adminPrivateNote" placeholder="Only you can see this note.">${escapeHtml(order.admin_private_note || "")}</textarea>
    </label>

    <div class="admin-save-row">
      <button class="dashboard-primary" id="saveAdminOrder" type="button">Save order update</button>
      <span class="admin-save-message" id="adminSaveMessage"></span>
    </div>`;
  document.getElementById("saveAdminOrder").addEventListener("click", saveAdminOrder);
}

async function saveAdminOrder() {
  if (!selectedAdminOrderId) return;
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

async function loadAdminOrders() {
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
  const user = await requireUser();
  if (!user || !adminAllowed) {
    alert("This account does not have admin access.");
    return;
  }
  openDashboard(elements.adminDashboard);
  await loadAdminOrders();
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
  elements.adminButton?.addEventListener("click", openAdminDashboard);
  elements.signOutButton?.addEventListener("click", async () => {
    closeAccountMenu();
    closeDashboards();
    await signOut(auth);
  });
  elements.closeOrdersDashboard?.addEventListener("click", closeDashboards);
  elements.closeAdminDashboard?.addEventListener("click", closeDashboards);
  elements.dashboardBackdrop?.addEventListener("click", closeDashboards);
  elements.refreshOrdersButton?.addEventListener("click", loadOrders);
  elements.refreshAdminButton?.addEventListener("click", loadAdminOrders);
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
  isAdmin: () => adminAllowed
};

document.dispatchEvent(new CustomEvent("zone6ix-auth-module"));
bindEvents();
setPersistence(auth, browserLocalPersistence).catch(error => console.error("Auth persistence error:", error));
getRedirectResult(auth).catch(error => console.error("Google redirect result error:", error));

onAuthStateChanged(auth, async user => {
  currentUser = user;
  accountProfile = null;
  adminAllowed = false;
  updateAccountUi();
  if (user) await syncAccount();
  if (!readyResolved) {
    readyResolved = true;
    resolveReady(user);
    document.dispatchEvent(new CustomEvent("zone6ix-auth-ready"));
  }
  document.dispatchEvent(new CustomEvent("zone6ix-auth-change", { detail: { user } }));
});
