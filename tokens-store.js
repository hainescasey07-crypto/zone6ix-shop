const tr = value => window.zone6ixI18n?.t(value) ?? String(value ?? "");
const locale = () => window.zone6ixI18n?.locale?.() || "en-GB";

let authApi = null;
let walletData = null;
let storeItems = [];
let earningSessionId = null;
let heartbeatTimer = null;
let lastInteractionAt = Date.now();
let currentRedeemItem = null;
let storeAdminItems = [];
let selectedStoreItemId = null;
let selectedStoreImage = null;
let adminRedemptions = [];
let selectedRedemptionId = null;
let adminCustomers = [];
let siteAdmins = [];
let activeAdminTab = "orders";

const el = {
  tokenWalletButton: document.getElementById("tokenWalletButton"),
  tokenWalletBalance: document.getElementById("tokenWalletBalance"),
  tokenWalletSymbol: document.getElementById("tokenWalletSymbol"),
  tokenEarningDot: document.getElementById("tokenEarningDot"),
  walletMenuButton: document.getElementById("walletMenuButton"),
  eventStoreMenuButton: document.getElementById("eventStoreMenuButton"),
  eventWalletPreview: document.getElementById("eventWalletPreview"),
  eventWalletBalance: document.getElementById("eventWalletBalance"),
  eventWalletOpen: document.getElementById("eventWalletOpen"),
  earningRateLabel: document.getElementById("earningRateLabel"),
  dailyBonusLabel: document.getElementById("dailyBonusLabel"),
  purchaseBonusLabel: document.getElementById("purchaseBonusLabel"),
  storeState: document.getElementById("storeState"),
  eventStoreGrid: document.getElementById("eventStoreGrid"),
  tokenDashboard: document.getElementById("tokenDashboard"),
  closeTokenDashboard: document.getElementById("closeTokenDashboard"),
  refreshTokenWallet: document.getElementById("refreshTokenWallet"),
  walletLargeBalance: document.getElementById("walletLargeBalance"),
  walletLifetimeText: document.getElementById("walletLifetimeText"),
  earningStatusCard: document.getElementById("earningStatusCard"),
  earningStatusText: document.getElementById("earningStatusText"),
  earningProgressBar: document.getElementById("earningProgressBar"),
  earningTodayText: document.getElementById("earningTodayText"),
  earningLimitText: document.getElementById("earningLimitText"),
  walletActivityPanel: document.getElementById("walletActivityPanel"),
  walletRedemptionsPanel: document.getElementById("walletRedemptionsPanel"),
  redeemBackdrop: document.getElementById("redeemBackdrop"),
  redeemModal: document.getElementById("redeemModal"),
  closeRedeemModal: document.getElementById("closeRedeemModal"),
  redeemItemPreview: document.getElementById("redeemItemPreview"),
  redeemModalTitle: document.getElementById("redeemModalTitle"),
  redeemModalDescription: document.getElementById("redeemModalDescription"),
  redeemRobloxUsername: document.getElementById("redeemRobloxUsername"),
  redeemQuantityField: document.getElementById("redeemQuantityField"),
  redeemQuantity: document.getElementById("redeemQuantity"),
  redeemTotalCost: document.getElementById("redeemTotalCost"),
  confirmRedeemButton: document.getElementById("confirmRedeemButton"),
  redeemMessage: document.getElementById("redeemMessage"),
  adminSectionTabs: document.getElementById("adminSectionTabs"),
  adminDashboardKicker: document.getElementById("adminDashboardKicker"),
  refreshAdminButton: document.getElementById("refreshAdminButton"),
  adminButton: document.getElementById("adminButton"),
  adminAccessTab: document.getElementById("adminAccessTab"),
  adminAccessForm: document.getElementById("adminAccessForm"),
  newAdminEmail: document.getElementById("newAdminEmail"),
  newAdminRole: document.getElementById("newAdminRole"),
  addAdminButton: document.getElementById("addAdminButton"),
  adminAccessMessage: document.getElementById("adminAccessMessage"),
  adminAccessList: document.getElementById("adminAccessList"),
  refreshAdmins: document.getElementById("refreshAdmins"),
  storeAdminList: document.getElementById("storeAdminList"),
  storeItemEditor: document.getElementById("storeItemEditor"),
  createStoreItemButton: document.getElementById("createStoreItemButton"),
  storeAdminSearch: document.getElementById("storeAdminSearch"),
  storeAdminStatus: document.getElementById("storeAdminStatus"),
  redemptionAdminList: document.getElementById("redemptionAdminList"),
  redemptionEditor: document.getElementById("redemptionEditor"),
  redemptionSearch: document.getElementById("redemptionSearch"),
  redemptionStatusFilter: document.getElementById("redemptionStatusFilter"),
  refreshRedemptions: document.getElementById("refreshRedemptions"),
  tokenSettingsForm: document.getElementById("tokenSettingsForm"),
  settingTokenName: document.getElementById("settingTokenName"),
  settingTokenSymbol: document.getElementById("settingTokenSymbol"),
  settingEarnRate: document.getElementById("settingEarnRate"),
  settingDailyLimit: document.getElementById("settingDailyLimit"),
  settingDailyBonus: document.getElementById("settingDailyBonus"),
  settingPurchaseBonus: document.getElementById("settingPurchaseBonus"),
  settingEarningEnabled: document.getElementById("settingEarningEnabled"),
  tokenSettingsMessage: document.getElementById("tokenSettingsMessage"),
  economyPreviewRate: document.getElementById("economyPreviewRate"),
  economyPreviewDaily: document.getElementById("economyPreviewDaily"),
  economyPreviewLogin: document.getElementById("economyPreviewLogin"),
  economyPreviewPurchase: document.getElementById("economyPreviewPurchase"),
  customerSearch: document.getElementById("customerSearch"),
  customerTableBody: document.getElementById("customerTableBody"),
  refreshCustomers: document.getElementById("refreshCustomers")
};

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function formatTokens(milli, maximumFractionDigits = 3) {
  const value = Number(milli || 0) / 1000;
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits
  }).format(value);
}

function tokenLabel(milli, symbol = walletData?.settings?.symbol || "ZT") {
  return `${formatTokens(milli)} ${symbol}`;
}

function formatDate(value, includeTime = true) {
  if (!value) return "—";
  const normalized = String(value).includes("T") ? String(value) : `${String(value).replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale(), includeTime ? {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  } : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function reasonLabel(reason) {
  return ({
    daily_login: tr("Daily login bonus"),
    active_time: tr("Active time"),
    purchase_bonus: tr("Purchase bonus"),
    store_redemption: tr("Event Store redemption"),
    redemption_refund: tr("Redemption refund"),
    admin_adjustment: tr("Admin adjustment")
  })[reason] || String(reason || "Zone Token update").replaceAll("_", " ");
}

function redemptionStatus(value) {
  return ({
    pending: tr("Pending"), approved: tr("Approved"), in_progress: tr("In progress"),
    delivered: tr("Delivered"), cancelled: tr("Cancelled"), refunded: tr("Refunded")
  })[value] || String(value || "").replaceAll("_", " ");
}

function storeStatus(value) {
  return ({
    draft: "Draft", scheduled: "Scheduled", live: "Live", hidden: "Hidden",
    sold_out: "Sold out", archived: "Archived"
  })[value] || String(value || "");
}

function categoryLabel(value) {
  return String(value || "event_item").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function fallbackItemGraphic() {
  return `<svg viewBox="0 0 340 220" aria-hidden="true"><defs><linearGradient id="z6g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".75"/><stop offset="1" stop-color="currentColor" stop-opacity=".1"/></linearGradient></defs><path class="store-fallback-ring" d="M68 110c0-56 45-101 101-101s101 45 101 101-45 101-101 101S68 166 68 110Z"/><path fill="url(#z6g)" d="M54 61h232l-99 66h80L130 190H55l91-67H69l72-62Z"/><path d="M34 42h272M34 178h272"/></svg>`;
}

async function waitForAuth() {
  if (window.zone6ixAuth) return window.zone6ixAuth;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 3000);
    document.addEventListener("zone6ix-auth-module", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
  return window.zone6ixAuth;
}

function currentUser() {
  return authApi?.getUser?.() || null;
}

function markInteraction() {
  lastInteractionAt = Date.now();
}

function isActivelyUsingSite() {
  return Boolean(
    currentUser() &&
    document.visibilityState === "visible" &&
    document.hasFocus() &&
    Date.now() - lastInteractionAt < 120000
  );
}

function updateEarningUi(active = isActivelyUsingSite()) {
  const enabled = Boolean(walletData?.settings?.earningEnabled);
  const signedIn = Boolean(currentUser());
  const earning = signedIn && enabled && active && Boolean(earningSessionId);
  el.tokenEarningDot?.classList.toggle("earning", earning);
  el.tokenWalletButton?.classList.toggle("earning", earning);
  el.earningStatusCard?.classList.toggle("earning", earning);
  if (el.earningStatusText) {
    el.earningStatusText.textContent = !signedIn
      ? tr("Waiting for sign-in")
      : !enabled
        ? tr("Earning paused by admin")
        : earning
          ? tr("Earning now")
          : tr("Paused — use the site to continue");
  }
}

function updateWalletSummary() {
  const signedIn = Boolean(currentUser());
  const wallet = walletData?.wallet;
  const settings = walletData?.settings || {};
  const balance = Number(wallet?.balanceMilli || 0);
  const symbol = settings.symbol || "ZT";

  if (el.tokenWalletButton) el.tokenWalletButton.hidden = !signedIn;
  if (el.walletMenuButton) el.walletMenuButton.hidden = !signedIn;
  if (el.tokenWalletBalance) el.tokenWalletBalance.textContent = formatTokens(balance);
  if (el.tokenWalletSymbol) el.tokenWalletSymbol.textContent = symbol;
  if (el.eventWalletBalance) el.eventWalletBalance.textContent = signedIn ? tokenLabel(balance, symbol) : tr("Sign in to earn");
  if (el.walletLargeBalance) el.walletLargeBalance.textContent = tokenLabel(balance, symbol);
  if (el.walletLifetimeText) {
    el.walletLifetimeText.textContent = `${tokenLabel(wallet?.lifetimeEarnedMilli || 0, symbol)} ${tr("earned")} · ${tokenLabel(wallet?.lifetimeSpentMilli || 0, symbol)} ${tr("spent")}`;
  }

  const dailySeconds = Number(walletData?.daily?.activeSeconds || 0);
  const limitMinutes = Number(settings.dailyLimitMinutes || 0);
  const progress = limitMinutes > 0 ? Math.min(100, dailySeconds / (limitMinutes * 60) * 100) : 0;
  if (el.earningProgressBar) el.earningProgressBar.style.width = `${progress}%`;
  if (el.earningTodayText) el.earningTodayText.textContent = `${Math.floor(dailySeconds / 60)} ${tr("active minutes today")}`;
  if (el.earningLimitText) el.earningLimitText.textContent = `${tr("Daily limit")}: ${limitMinutes} min`;

  if (el.earningRateLabel) el.earningRateLabel.textContent = `${tokenLabel(settings.earnPerMinuteMilli || 0, symbol)} ${tr("every active minute")}`;
  if (el.dailyBonusLabel) el.dailyBonusLabel.textContent = `${tokenLabel(settings.dailyLoginBonusMilli || 0, symbol)} ${tr("when you return")}`;
  if (el.purchaseBonusLabel) el.purchaseBonusLabel.textContent = `${tokenLabel(settings.purchaseBonusMilli || 0, symbol)} ${tr("after a paid order")}`;
  updateEarningUi();
}

function renderWalletActivity() {
  if (!el.walletActivityPanel) return;
  const ledger = walletData?.ledger || [];
  if (!ledger.length) {
    el.walletActivityPanel.innerHTML = `<div class="dashboard-empty"><strong>${tr("No token activity yet.")}</strong><span>${tr("Stay active or return tomorrow to start earning.")}</span></div>`;
    return;
  }
  el.walletActivityPanel.innerHTML = `<div class="token-ledger-list">${ledger.map(entry => {
    const amount = Number(entry.amount_milli || 0);
    return `<article class="token-ledger-row ${amount >= 0 ? "credit" : "debit"}">
      <span class="ledger-direction"><svg viewBox="0 0 24 24"><path d="${amount >= 0 ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"}"/></svg></span>
      <div><strong>${escapeHtml(reasonLabel(entry.reason))}</strong><small>${escapeHtml(entry.note || formatDate(entry.created_at))}</small></div>
      <div><strong>${amount >= 0 ? "+" : "−"}${escapeHtml(tokenLabel(Math.abs(amount)))}</strong><small>${escapeHtml(formatDate(entry.created_at))}</small></div>
    </article>`;
  }).join("")}</div>`;
}

function renderWalletRedemptions() {
  if (!el.walletRedemptionsPanel) return;
  const redemptions = walletData?.redemptions || [];
  if (!redemptions.length) {
    el.walletRedemptionsPanel.innerHTML = `<div class="dashboard-empty"><strong>${tr("No Event Store redemptions yet.")}</strong><span>${tr("Limited items you redeem will appear here.")}</span></div>`;
    return;
  }
  el.walletRedemptionsPanel.innerHTML = `<div class="wallet-redemption-list">${redemptions.map(item => `
    <article class="wallet-redemption-card">
      <div class="wallet-redemption-image">${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : fallbackItemGraphic()}</div>
      <div><small>${escapeHtml(item.redemption_code)}</small><strong>${escapeHtml(item.item_name)}</strong><span>${escapeHtml(redemptionStatus(item.status))}</span>${item.customer_update ? `<p>${escapeHtml(item.customer_update)}</p>` : ""}</div>
      <div><strong>${escapeHtml(tokenLabel(item.total_price_milli))}</strong><small>${escapeHtml(formatDate(item.created_at))}</small></div>
    </article>`).join("")}</div>`;
}

async function loadWallet({ silent = false } = {}) {
  if (!currentUser()) {
    walletData = null;
    updateWalletSummary();
    return null;
  }
  try {
    const data = await authApi.apiFetch("/api/token-wallet");
    walletData = data;
    updateWalletSummary();
    renderWalletActivity();
    renderWalletRedemptions();
    return data;
  } catch (error) {
    console.error("Wallet load failed:", error);
    if (!silent && el.walletActivityPanel) {
      el.walletActivityPanel.innerHTML = `<div class="dashboard-error"><strong>${tr("Could not load your wallet.")}</strong><span>${escapeHtml(error.message)}</span></div>`;
    }
    return null;
  }
}

async function startEarningSession() {
  if (!currentUser()) return;
  stopHeartbeatTimer();
  try {
    const data = await authApi.apiFetch("/api/token-session", {
      method: "POST",
      body: JSON.stringify({ action: "start" })
    });
    earningSessionId = data.sessionId;
    if (data.wallet) {
      walletData = {
        ...(walletData || {}),
        wallet: data.wallet,
        settings: data.settings || walletData?.settings,
        daily: walletData?.daily || { activeSeconds: 0, earnedMilli: 0 }
      };
      updateWalletSummary();
    }
    heartbeatTimer = window.setInterval(sendHeartbeat, 30000);
    window.setTimeout(sendHeartbeat, 1500);
  } catch (error) {
    console.error("Could not start token session:", error);
    earningSessionId = null;
    updateEarningUi(false);
  }
}

function stopHeartbeatTimer() {
  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

async function endEarningSession() {
  stopHeartbeatTimer();
  const sessionId = earningSessionId;
  earningSessionId = null;
  updateEarningUi(false);
  if (!sessionId || !currentUser()) return;
  try {
    await authApi.apiFetch("/api/token-session", {
      method: "POST",
      body: JSON.stringify({ action: "end", sessionId }),
      keepalive: true
    });
  } catch {}
}

async function sendHeartbeat() {
  if (!earningSessionId || !currentUser()) return;
  const active = isActivelyUsingSite();
  updateEarningUi(active);
  try {
    const data = await authApi.apiFetch("/api/token-session", {
      method: "POST",
      body: JSON.stringify({ action: "heartbeat", sessionId: earningSessionId, active })
    });
    if (data.wallet) {
      walletData = {
        ...(walletData || {}),
        wallet: data.wallet,
        settings: data.settings || walletData?.settings,
        daily: data.daily || walletData?.daily
      };
      updateWalletSummary();
      if (Number(data.awardedMilli || 0) > 0 && el.tokenWalletButton) {
        el.tokenWalletButton.classList.remove("token-pop");
        void el.tokenWalletButton.offsetWidth;
        el.tokenWalletButton.classList.add("token-pop");
      }
    }
  } catch (error) {
    if (/session not found|expired/i.test(error.message || "")) startEarningSession();
    else console.warn("Token heartbeat failed:", error.message);
  }
}

function itemAvailability(item) {
  const stock = item.stockRemaining;
  if (stock === 0) return tr("Sold out");
  if (stock === null) return tr("Unlimited availability");
  return `${stock} ${tr("remaining")}`;
}

function itemCountdown(item) {
  if (!item.endsAt) return tr("No expiry");
  const diff = new Date(item.endsAt).getTime() - Date.now();
  if (diff <= 0) return tr("Ended");
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ${tr("left")}`;
  return `${Math.ceil(hours / 24)}d ${tr("left")}`;
}

function renderStoreItems() {
  if (!el.eventStoreGrid || !el.storeState) return;
  if (!storeItems.length) {
    el.storeState.innerHTML = `<div class="store-empty"><span>${fallbackItemGraphic()}</span><div><strong>${tr("No live drops right now.")}</strong><p>${tr("Check back for limited Zone6ix releases created from the admin dashboard.")}</p></div></div>`;
    el.eventStoreGrid.innerHTML = "";
    return;
  }
  el.storeState.innerHTML = "";
  el.eventStoreGrid.innerHTML = storeItems.map((item, index) => {
    const stockPercent = item.stockTotal && item.stockRemaining !== null
      ? Math.max(0, Math.min(100, item.stockRemaining / item.stockTotal * 100))
      : 100;
    const canAfford = Number(walletData?.wallet?.balanceMilli || 0) >= Number(item.tokenPriceMilli || 0);
    return `<article class="event-item-card reveal visible" style="--item-delay:${index * 45}ms" data-store-item-id="${escapeHtml(item.id)}">
      <div class="event-item-media">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : fallbackItemGraphic()}
        <span class="event-item-category">${escapeHtml(categoryLabel(item.category))}</span>
        ${item.isLimited ? `<span class="event-item-limited">${tr("LIMITED")}</span>` : ""}
        <div class="event-item-time"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${escapeHtml(itemCountdown(item))}</div>
      </div>
      <div class="event-item-content">
        <div class="event-item-title"><div><small>${escapeHtml(itemAvailability(item))}</small><h3>${escapeHtml(item.name)}</h3></div><strong>${escapeHtml(tokenLabel(item.tokenPriceMilli))}</strong></div>
        <p>${escapeHtml(item.description)}</p>
        ${item.stockTotal !== null ? `<div class="stock-meter"><span style="width:${stockPercent}%"></span></div>` : ""}
        <div class="event-item-foot">
          <div>${item.cashPricePence !== null ? `<span>£${(item.cashPricePence / 100).toFixed(2)}</span>` : ""}${item.robuxPrice !== null ? `<span>${item.robuxPrice} R$</span>` : ""}</div>
          <button type="button" data-redeem-item="${escapeHtml(item.id)}" ${item.stockRemaining === 0 ? "disabled" : ""} class="${canAfford ? "can-afford" : ""}">${currentUser() ? tr("Redeem") : tr("Sign in to redeem")}<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        </div>
      </div>
    </article>`;
  }).join("");

  el.eventStoreGrid.querySelectorAll("[data-redeem-item]").forEach(button => {
    button.addEventListener("click", () => openRedeemModal(button.dataset.redeemItem));
  });
}

async function loadStoreItems() {
  if (el.storeState) el.storeState.innerHTML = `<div class="store-loading"><i></i><span>${tr("Loading live drops…")}</span></div>`;
  try {
    const response = await fetch("/api/store-items", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Store could not load.");
    storeItems = data.items || [];
    renderStoreItems();
  } catch (error) {
    if (el.storeState) el.storeState.innerHTML = `<div class="dashboard-error"><strong>${tr("Could not load the Event Store.")}</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

async function openWalletDashboard() {
  if (!currentUser()) {
    await authApi.signIn();
    if (!currentUser()) return;
  }
  authApi.openDashboard(el.tokenDashboard);
  if (el.walletActivityPanel) el.walletActivityPanel.innerHTML = `<div class="dashboard-loading"><i></i><span>${tr("Loading token activity…")}</span></div>`;
  await loadWallet();
}

function closeRedeemModal() {
  el.redeemModal?.classList.remove("open");
  el.redeemModal?.setAttribute("aria-hidden", "true");
  el.redeemBackdrop?.classList.remove("visible");
  el.redeemBackdrop?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
  currentRedeemItem = null;
}

async function openRedeemModal(itemId) {
  let user = currentUser();
  if (!user) {
    user = await authApi.signIn();
    if (!user) return;
    await loadWallet({ silent: true });
  }
  const item = storeItems.find(entry => entry.id === itemId);
  if (!item) return;
  currentRedeemItem = item;
  const profile = authApi.getProfile?.() || {};
  if (el.redeemItemPreview) el.redeemItemPreview.innerHTML = item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : fallbackItemGraphic();
  if (el.redeemModalTitle) el.redeemModalTitle.textContent = item.name;
  if (el.redeemModalDescription) el.redeemModalDescription.textContent = item.description;
  if (el.redeemRobloxUsername) el.redeemRobloxUsername.value = profile.robloxUsername || "";
  const maxQuantity = Math.max(1, Math.min(10, item.maxPerCustomer || 1, item.stockRemaining === null ? 10 : item.stockRemaining));
  if (el.redeemQuantity) {
    el.redeemQuantity.max = String(maxQuantity);
    el.redeemQuantity.value = "1";
  }
  if (el.redeemQuantityField) el.redeemQuantityField.hidden = maxQuantity <= 1;
  if (el.redeemMessage) el.redeemMessage.textContent = "";
  updateRedeemCost();
  el.redeemModal?.classList.add("open");
  el.redeemModal?.setAttribute("aria-hidden", "false");
  el.redeemBackdrop?.classList.add("visible");
  el.redeemBackdrop?.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
  window.setTimeout(() => el.redeemRobloxUsername?.focus(), 100);
}

function updateRedeemCost() {
  if (!currentRedeemItem || !el.redeemTotalCost) return;
  const quantity = Math.max(1, Number(el.redeemQuantity?.value || 1));
  el.redeemTotalCost.textContent = tokenLabel(currentRedeemItem.tokenPriceMilli * quantity);
}

async function confirmRedemption() {
  if (!currentRedeemItem) return;
  const button = el.confirmRedeemButton;
  const message = el.redeemMessage;
  const quantity = Math.max(1, Math.trunc(Number(el.redeemQuantity?.value || 1)));
  const robloxUsername = el.redeemRobloxUsername?.value.trim() || "";
  if (!robloxUsername) {
    message.textContent = tr("Enter your Roblox username.");
    el.redeemRobloxUsername?.focus();
    return;
  }
  button.disabled = true;
  message.textContent = tr("Securing your item…");
  try {
    const data = await authApi.apiFetch("/api/store-redeem", {
      method: "POST",
      body: JSON.stringify({ itemId: currentRedeemItem.id, quantity, robloxUsername })
    });
    if (walletData) walletData.wallet = data.wallet;
    updateWalletSummary();
    message.textContent = `${tr("Redeemed successfully")}: ${data.redemption.redemption_code}`;
    button.querySelector("span").textContent = tr("Redeemed");
    window.setTimeout(async () => {
      closeRedeemModal();
      await Promise.all([loadWallet({ silent: true }), loadStoreItems()]);
      openWalletDashboard();
    }, 1200);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function switchWalletTab(name) {
  document.querySelectorAll("[data-wallet-tab]").forEach(button => button.classList.toggle("active", button.dataset.walletTab === name));
  document.querySelectorAll(".wallet-tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `wallet${name[0].toUpperCase()}${name.slice(1)}Panel`));
}

const adminTabPermissions = {
  orders: "viewOrders",
  store: "manageStore",
  redemptions: "manageRedemptions",
  tokens: "manageTokens",
  site: "manageSite",
  security: "exportData",
  customers: "viewCustomers",
  admins: "manageAdmins"
};

function adminPermissions() {
  return authApi?.getPermissions?.() || {};
}

function canOpenAdminTab(name) {
  if (name === "security") {
    const permissions = adminPermissions();
    return Boolean(permissions.exportData || permissions.viewAudit);
  }
  return Boolean(adminPermissions()[adminTabPermissions[name]]);
}

function firstAllowedAdminTab() {
  return ["orders", "store", "redemptions", "tokens", "site", "security", "customers", "admins"].find(canOpenAdminTab) || "orders";
}

function switchAdminTab(name) {
  if (!canOpenAdminTab(name)) name = firstAllowedAdminTab();
  activeAdminTab = name;
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("active", button.dataset.adminTab === name));
  document.querySelectorAll("[data-admin-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.adminPanel === name));
  if (name === "store") loadAdminStoreItems();
  if (name === "redemptions") loadAdminRedemptions();
  if (name === "tokens") loadTokenSettings();
  if (name === "customers") loadAdminCustomers();
  if (name === "admins") loadAdminAccess();
}

function storeItemForm(item = null) {
  const isNew = !item;
  const value = (key, fallback = "") => escapeHtml(item?.[key] ?? fallback);
  const dateValue = input => {
    if (!input) return "";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const stockTotal = item?.stockTotal === null ? "" : (item?.stockTotal ?? "");
  const stockRemaining = item?.stockRemaining === null ? "" : (item?.stockRemaining ?? "");
  return `<form class="store-item-form" id="storeItemForm">
    <div class="store-editor-head"><div><small>${isNew ? "NEW EVENT ITEM" : escapeHtml(item.slug)}</small><h3>${isNew ? "Create a store item" : escapeHtml(item.name)}</h3></div>${!isNew ? `<span class="store-status-badge status-${escapeHtml(item.status)}">${escapeHtml(storeStatus(item.status))}</span>` : ""}</div>
    <input type="hidden" id="storeItemId" value="${value("id")}">
    <div class="store-image-uploader" id="storeImageUploader">
      <div class="store-image-preview" id="storeImagePreview">${item?.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : fallbackItemGraphic()}</div>
      <div><strong>Item artwork</strong><p>JPG, PNG or WebP. The browser compresses it before saving to D1.</p><label class="upload-image-button"><input id="storeImageInput" type="file" accept="image/jpeg,image/png,image/webp">Choose image</label>${item?.hasImage ? `<button class="remove-image-button" id="removeStoreImage" type="button">Remove image</button>` : ""}</div>
    </div>
    <div class="admin-form-grid">
      <label><span>Item name</span><input id="storeName" maxlength="100" value="${value("name")}" required></label>
      <label><span>Category</span><input id="storeCategory" maxlength="60" value="${value("category", "event_item")}" required></label>
    </div>
    <label><span>Description</span><textarea id="storeDescription" maxlength="1800" required>${value("description")}</textarea></label>
    <div class="admin-form-grid three">
      <label><span>Token price</span><input id="storeTokenPrice" type="number" min="0" step="0.001" value="${item ? Number(item.tokenPriceMilli || 0) / 1000 : 0}" required></label>
      <label><span>Optional cash price (£)</span><input id="storeCashPrice" type="number" min="0" step="0.01" value="${item?.cashPricePence === null || item?.cashPricePence === undefined ? "" : Number(item.cashPricePence) / 100}"></label>
      <label><span>Optional Robux price</span><input id="storeRobuxPrice" type="number" min="0" step="1" value="${item?.robuxPrice ?? ""}"></label>
    </div>
    <div class="admin-form-grid three">
      <label><span>Total stock (blank = unlimited)</span><input id="storeStockTotal" type="number" min="0" step="1" value="${stockTotal}"></label>
      <label><span>Stock remaining</span><input id="storeStockRemaining" type="number" min="0" step="1" value="${stockRemaining}"></label>
      <label><span>Maximum per customer</span><input id="storeMaxPerCustomer" type="number" min="1" max="1000" step="1" value="${item?.maxPerCustomer ?? 1}" required></label>
    </div>
    <div class="admin-form-grid">
      <label><span>Starts at (optional)</span><input id="storeStartsAt" type="datetime-local" value="${dateValue(item?.startsAt)}"></label>
      <label><span>Ends at (optional)</span><input id="storeEndsAt" type="datetime-local" value="${dateValue(item?.endsAt)}"></label>
    </div>
    <div class="admin-form-grid three">
      <label><span>Status</span><select id="storeStatus">${["draft","scheduled","live","hidden","sold_out","archived"].map(status => `<option value="${status}" ${item?.status === status || (!item && status === "draft") ? "selected" : ""}>${storeStatus(status)}</option>`).join("")}</select></label>
      <label><span>Delivery type</span><select id="storeDeliveryType">${[["manual","Manual delivery"],["roblox_join","Grant when player joins"],["roblox_product","Roblox developer product"]].map(([value,label]) => `<option value="${value}" ${item?.deliveryType === value || (!item && value === "manual") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label><span>Roblox product ID</span><input id="storeRobloxProductId" inputmode="numeric" value="${value("robloxProductId")}"></label>
    </div>
    <label class="admin-toggle"><input id="storeIsLimited" type="checkbox" ${item?.isLimited !== false ? "checked" : ""}><span></span><div><strong>Limited item</strong><small>Show the limited badge and stock information.</small></div></label>
    <label><span>Private delivery notes</span><textarea id="storeDeliveryNotes" maxlength="1200">${value("deliveryNotes")}</textarea></label>
    <div class="admin-save-row">
      <button class="dashboard-primary" type="submit">${isNew ? "Create item" : "Save changes"}</button>
      ${!isNew && item.status !== "archived" ? `<button class="dashboard-danger" id="archiveStoreItem" type="button">Archive</button>` : ""}
      ${!isNew && item.status === "archived" ? `<button class="dashboard-secondary" id="restoreStoreItem" type="button">Unarchive</button>` : ""}
      ${!isNew ? `<button class="dashboard-delete" id="deleteStoreItem" type="button">Delete permanently</button>` : ""}
      <span id="storeSaveMessage"></span>
    </div>
  </form>`;
}

function renderStoreAdminList() {
  if (!el.storeAdminList) return;
  const search = el.storeAdminSearch?.value.trim().toLowerCase() || "";
  const status = el.storeAdminStatus?.value || "all";
  const filtered = storeAdminItems.filter(item => {
    const haystack = `${item.name} ${item.category} ${item.slug}`.toLowerCase();
    return (!search || haystack.includes(search)) && (status === "all" || item.status === status);
  });
  if (!filtered.length) {
    el.storeAdminList.innerHTML = `<div class="dashboard-empty"><strong>No matching store items.</strong><span>Create a new item or change the filters.</span></div>`;
    return;
  }
  el.storeAdminList.innerHTML = filtered.map(item => `
    <button class="store-admin-row ${selectedStoreItemId === item.id ? "selected" : ""}" type="button" data-store-admin-id="${escapeHtml(item.id)}">
      <span class="store-admin-thumb">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : fallbackItemGraphic()}</span>
      <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(categoryLabel(item.category))} · ${escapeHtml(tokenLabel(item.tokenPriceMilli))}</small></span>
      <span><strong class="store-status-text status-${escapeHtml(item.status)}">${escapeHtml(storeStatus(item.status))}</strong><small>${escapeHtml(itemAvailability(item))}</small></span>
    </button>`).join("");
  el.storeAdminList.querySelectorAll("[data-store-admin-id]").forEach(button => button.addEventListener("click", () => selectStoreAdminItem(button.dataset.storeAdminId)));
}

async function loadAdminStoreItems(force = false) {
  if (!authApi?.isAdmin?.() || (!force && storeAdminItems.length)) {
    if (storeAdminItems.length) renderStoreAdminList();
    return;
  }
  if (el.storeAdminList) el.storeAdminList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading store items…</span></div>`;
  try {
    const data = await authApi.apiFetch("/api/admin-store");
    storeAdminItems = data.items || [];
    renderStoreAdminList();
    if (selectedStoreItemId) selectStoreAdminItem(selectedStoreItemId);
  } catch (error) {
    el.storeAdminList.innerHTML = `<div class="dashboard-error"><strong>Could not load store items.</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function bindStoreForm() {
  const form = document.getElementById("storeItemForm");
  const imageInput = document.getElementById("storeImageInput");
  form?.addEventListener("submit", saveStoreItem);
  imageInput?.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    selectedStoreImage = file || null;
    if (file) {
      const preview = document.getElementById("storeImagePreview");
      preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Selected item artwork">`;
    }
  });
  document.getElementById("archiveStoreItem")?.addEventListener("click", archiveStoreItem);
  document.getElementById("restoreStoreItem")?.addEventListener("click", restoreStoreItem);
  document.getElementById("deleteStoreItem")?.addEventListener("click", deleteStoreItem);
  document.getElementById("removeStoreImage")?.addEventListener("click", removeStoreImage);
}

function selectStoreAdminItem(id) {
  selectedStoreItemId = id;
  selectedStoreImage = null;
  const item = storeAdminItems.find(entry => entry.id === id);
  renderStoreAdminList();
  if (el.storeItemEditor) el.storeItemEditor.innerHTML = storeItemForm(item || null);
  bindStoreForm();
}

function newStoreItem() {
  selectedStoreItemId = null;
  selectedStoreImage = null;
  renderStoreAdminList();
  el.storeItemEditor.innerHTML = storeItemForm(null);
  bindStoreForm();
}

function formNumber(id, multiplier = 1, nullable = false) {
  const raw = document.getElementById(id)?.value.trim() ?? "";
  if (nullable && raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value * multiplier) : null;
}

async function compressImage(file) {
  if (!file) return null;
  if (file.size <= 1_350_000 && file.type === "image/webp") return file;

  let source;
  let width;
  let height;
  let cleanup = () => {};
  if ("createImageBitmap" in window) {
    source = await createImageBitmap(file);
    width = source.width;
    height = source.height;
    cleanup = () => source.close?.();
  } else {
    const objectUrl = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The image could not be opened."));
      image.src = objectUrl;
    });
    width = source.naturalWidth;
    height = source.naturalHeight;
    cleanup = () => URL.revokeObjectURL(objectUrl);
  }

  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  cleanup();
  let quality = 0.86;
  let blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
  while (blob && blob.size > 1_400_000 && quality > 0.45) {
    quality -= 0.08;
    blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
  }
  if (!blob) throw new Error("The image could not be processed.");
  if (blob.size > 1_500_000) throw new Error("The image is still too large. Choose a smaller image.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "zone6ix-item"}.webp`, { type: "image/webp" });
}

async function uploadStoreImage(itemId, file) {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("itemId", itemId);
  form.append("image", compressed);
  return authApi.apiFetch("/api/admin-store-image", { method: "POST", body: form });
}

async function saveStoreItem(event) {
  event.preventDefault();
  const message = document.getElementById("storeSaveMessage");
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  message.textContent = "Saving item…";
  const itemId = document.getElementById("storeItemId")?.value || "";
  const startsRaw = document.getElementById("storeStartsAt")?.value || "";
  const endsRaw = document.getElementById("storeEndsAt")?.value || "";
  const payload = {
    itemId,
    name: document.getElementById("storeName").value.trim(),
    category: document.getElementById("storeCategory").value.trim(),
    description: document.getElementById("storeDescription").value.trim(),
    tokenPriceMilli: formNumber("storeTokenPrice", 1000),
    cashPricePence: formNumber("storeCashPrice", 100, true),
    robuxPrice: formNumber("storeRobuxPrice", 1, true),
    stockTotal: formNumber("storeStockTotal", 1, true),
    stockRemaining: formNumber("storeStockRemaining", 1, true),
    maxPerCustomer: formNumber("storeMaxPerCustomer", 1),
    startsAt: startsRaw ? new Date(startsRaw).toISOString() : "",
    endsAt: endsRaw ? new Date(endsRaw).toISOString() : "",
    isLimited: document.getElementById("storeIsLimited").checked,
    status: document.getElementById("storeStatus").value,
    deliveryType: document.getElementById("storeDeliveryType").value,
    robloxProductId: document.getElementById("storeRobloxProductId").value.trim(),
    deliveryNotes: document.getElementById("storeDeliveryNotes").value.trim()
  };
  try {
    const data = await authApi.apiFetch("/api/admin-store", {
      method: itemId ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });
    const savedId = data.item.id;
    if (selectedStoreImage) {
      message.textContent = "Compressing and uploading artwork…";
      await uploadStoreImage(savedId, selectedStoreImage);
    }
    selectedStoreItemId = savedId;
    selectedStoreImage = null;
    storeAdminItems = [];
    await Promise.all([loadAdminStoreItems(true), loadStoreItems()]);
    message.textContent = "Saved and live website updated.";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function archiveStoreItem() {
  if (!selectedStoreItemId || !confirm("Archive this store item? It will disappear from the live store.")) return;
  const message = document.getElementById("storeSaveMessage");
  try {
    message.textContent = "Archiving item…";
    await authApi.apiFetch(`/api/admin-store?itemId=${encodeURIComponent(selectedStoreItemId)}&mode=archive`, { method: "DELETE" });
    const archivedId = selectedStoreItemId;
    storeAdminItems = [];
    await Promise.all([loadAdminStoreItems(true), loadStoreItems()]);
    selectStoreAdminItem(archivedId);
    document.getElementById("storeSaveMessage").textContent = "Item archived.";
  } catch (error) {
    message.textContent = error.message;
  }
}

async function restoreStoreItem() {
  if (!selectedStoreItemId || !confirm("Unarchive this item? It will return as a draft so you can review it before making it live.")) return;
  const message = document.getElementById("storeSaveMessage");
  try {
    message.textContent = "Restoring item…";
    const restoredId = selectedStoreItemId;
    await authApi.apiFetch("/api/admin-store", {
      method: "PATCH",
      body: JSON.stringify({ itemId: restoredId, action: "restore" })
    });
    storeAdminItems = [];
    await Promise.all([loadAdminStoreItems(true), loadStoreItems()]);
    selectStoreAdminItem(restoredId);
    document.getElementById("storeSaveMessage").textContent = "Item unarchived as a draft.";
  } catch (error) {
    message.textContent = error.message;
  }
}

async function deleteStoreItem() {
  if (!selectedStoreItemId) return;
  const item = storeAdminItems.find(entry => entry.id === selectedStoreItemId);
  const itemName = item?.name || "this item";
  const historyCount = Number(item?.redemptionCount || 0);
  const historyText = historyCount > 0
    ? ` It will also remove ${historyCount} redemption record${historyCount === 1 ? "" : "s"} and automatically return unrefunded tokens.`
    : "";
  if (!confirm(`Permanently delete ${itemName}?${historyText} This cannot be undone.`)) return;

  const message = document.getElementById("storeSaveMessage");
  const button = document.getElementById("deleteStoreItem");
  if (button) button.disabled = true;
  try {
    message.textContent = "Deleting item and related history…";
    await authApi.apiFetch(`/api/admin-store?itemId=${encodeURIComponent(selectedStoreItemId)}&mode=permanent`, { method: "DELETE" });
    selectedStoreItemId = null;
    selectedStoreImage = null;
    storeAdminItems = [];
    adminRedemptions = [];
    el.storeItemEditor.innerHTML = storeItemForm(null);
    bindStoreForm();
    await Promise.all([loadAdminStoreItems(true), loadStoreItems(), loadAdminRedemptions(true), loadWallet({ silent: true })]);
  } catch (error) {
    message.textContent = error.message;
    if (button) button.disabled = false;
  }
}

async function removeStoreImage() {
  if (!selectedStoreItemId || !confirm("Remove this item image?")) return;
  try {
    await authApi.apiFetch(`/api/admin-store-image?itemId=${encodeURIComponent(selectedStoreItemId)}`, { method: "DELETE" });
    storeAdminItems = [];
    await Promise.all([loadAdminStoreItems(true), loadStoreItems()]);
  } catch (error) {
    document.getElementById("storeSaveMessage").textContent = error.message;
  }
}

function renderAdminRedemptions() {
  if (!el.redemptionAdminList) return;
  const search = el.redemptionSearch?.value.trim().toLowerCase() || "";
  const status = el.redemptionStatusFilter?.value || "all";
  const filtered = adminRedemptions.filter(item => {
    const haystack = `${item.redemption_code} ${item.item_name} ${item.email} ${item.roblox_username} ${item.gang_name}`.toLowerCase();
    return (!search || haystack.includes(search)) && (status === "all" || item.status === status);
  });
  if (!filtered.length) {
    el.redemptionAdminList.innerHTML = `<div class="dashboard-empty"><strong>No matching redemptions.</strong><span>New Event Store claims will appear here.</span></div>`;
    return;
  }
  el.redemptionAdminList.innerHTML = filtered.map(item => `
    <button class="redemption-admin-row ${selectedRedemptionId === item.id ? "selected" : ""}" data-redemption-id="${escapeHtml(item.id)}" type="button">
      <span><strong>${escapeHtml(item.redemption_code)} · ${escapeHtml(item.item_name)}</strong><small>${escapeHtml(item.roblox_username || "No Roblox username")} · ${escapeHtml(item.email)}</small></span>
      <span><strong class="status-${escapeHtml(item.status)}">${escapeHtml(redemptionStatus(item.status))}</strong><small>${escapeHtml(tokenLabel(item.total_price_milli))} · ${escapeHtml(formatDate(item.created_at))}</small></span>
    </button>`).join("");
  el.redemptionAdminList.querySelectorAll("[data-redemption-id]").forEach(button => button.addEventListener("click", () => selectAdminRedemption(button.dataset.redemptionId)));
}

async function loadAdminRedemptions(force = false) {
  if (!authApi?.isAdmin?.() || (!force && adminRedemptions.length)) {
    if (adminRedemptions.length) renderAdminRedemptions();
    return;
  }
  el.redemptionAdminList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading redemptions…</span></div>`;
  try {
    const data = await authApi.apiFetch("/api/admin-redemptions");
    adminRedemptions = data.redemptions || [];
    renderAdminRedemptions();
    if (selectedRedemptionId) selectAdminRedemption(selectedRedemptionId);
  } catch (error) {
    el.redemptionAdminList.innerHTML = `<div class="dashboard-error"><strong>Could not load redemptions.</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function selectAdminRedemption(id) {
  selectedRedemptionId = id;
  const item = adminRedemptions.find(entry => entry.id === id);
  renderAdminRedemptions();
  if (!item) return;
  el.redemptionEditor.innerHTML = `<div class="admin-editor-head"><div><small>${escapeHtml(item.redemption_code)}</small><h3>${escapeHtml(item.item_name)}</h3></div><span class="order-status-pill status-${escapeHtml(item.status)}">${escapeHtml(redemptionStatus(item.status))}</span></div>
    <div class="admin-detail-grid"><div class="admin-detail"><span>Customer</span><strong>${escapeHtml(item.display_name || "Unknown")}</strong></div><div class="admin-detail"><span>Email</span><strong>${escapeHtml(item.email)}</strong></div><div class="admin-detail"><span>Roblox</span><strong>${escapeHtml(item.roblox_username || "Not provided")}</strong></div><div class="admin-detail"><span>Gang</span><strong>${escapeHtml(item.gang_name || "Not provided")}</strong></div><div class="admin-detail"><span>Quantity</span><strong>${Number(item.quantity || 1)}</strong></div><div class="admin-detail"><span>Token cost</span><strong>${escapeHtml(tokenLabel(item.total_price_milli))}</strong></div><div class="admin-detail"><span>Delivery</span><strong>${escapeHtml(item.delivery_type || "manual")}</strong></div><div class="admin-detail"><span>Product ID</span><strong>${escapeHtml(item.roblox_product_id || "Not set")}</strong></div></div>
    <label class="admin-editor-field"><span>Redemption status</span><select id="redemptionEditorStatus">${["pending","approved","in_progress","delivered","cancelled","refunded"].map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${redemptionStatus(status)}</option>`).join("")}</select></label>
    <label class="admin-editor-field"><span>Customer-visible update</span><textarea id="redemptionCustomerUpdate">${escapeHtml(item.customer_update || "")}</textarea></label>
    <label class="admin-editor-field"><span>Private admin note</span><textarea id="redemptionPrivateNote">${escapeHtml(item.admin_private_note || "")}</textarea></label>
    <div class="admin-save-row"><button class="dashboard-primary" id="saveRedemptionUpdate" type="button">Save redemption</button><button class="dashboard-delete" id="deleteRedemption" type="button">Delete redemption permanently</button><span id="redemptionSaveMessage"></span></div>`;
  document.getElementById("saveRedemptionUpdate").addEventListener("click", saveRedemptionUpdate);
  document.getElementById("deleteRedemption").addEventListener("click", deleteAdminRedemption);
}

async function saveRedemptionUpdate() {
  if (!selectedRedemptionId) return;
  const button = document.getElementById("saveRedemptionUpdate");
  const message = document.getElementById("redemptionSaveMessage");
  button.disabled = true;
  message.textContent = "Saving…";
  try {
    const data = await authApi.apiFetch("/api/admin-redemptions", {
      method: "PATCH",
      body: JSON.stringify({
        redemptionId: selectedRedemptionId,
        status: document.getElementById("redemptionEditorStatus").value,
        customerUpdate: document.getElementById("redemptionCustomerUpdate").value.trim(),
        adminPrivateNote: document.getElementById("redemptionPrivateNote").value.trim()
      })
    });
    const index = adminRedemptions.findIndex(item => item.id === selectedRedemptionId);
    if (index !== -1) adminRedemptions[index] = data.redemption;
    renderAdminRedemptions();
    selectAdminRedemption(selectedRedemptionId);
    document.getElementById("redemptionSaveMessage").textContent = "Saved";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function deleteAdminRedemption() {
  if (!selectedRedemptionId) return;
  const redemption = adminRedemptions.find(item => item.id === selectedRedemptionId);
  if (!redemption) return;
  const refundText = redemption.status === "refunded"
    ? "Its tokens were already refunded."
    : "Its token cost will be returned automatically and the item stock will be restored.";
  if (!confirm(`Permanently delete redemption ${redemption.redemption_code}? ${refundText}`)) return;

  const button = document.getElementById("deleteRedemption");
  const message = document.getElementById("redemptionSaveMessage");
  if (button) button.disabled = true;
  if (message) message.textContent = "Deleting redemption…";
  try {
    await authApi.apiFetch(`/api/admin-redemptions?redemptionId=${encodeURIComponent(selectedRedemptionId)}`, {
      method: "DELETE"
    });
    adminRedemptions = adminRedemptions.filter(item => item.id !== selectedRedemptionId);
    selectedRedemptionId = null;
    renderAdminRedemptions();
    el.redemptionEditor.innerHTML = `<div class="admin-editor-empty"><svg viewBox="0 0 64 64"><path d="M12 10h40v44H12z"/><path d="M20 21h24M20 31h24M20 41h15"/></svg><strong>Redemption deleted</strong><span>Select another redemption to manage it.</span></div>`;
    storeAdminItems = [];
    await Promise.all([loadAdminStoreItems(true), loadStoreItems(), loadWallet({ silent: true })]);
  } catch (error) {
    if (message) message.textContent = error.message;
    if (button) button.disabled = false;
  }
}

function updateEconomyPreview() {
  const symbol = el.settingTokenSymbol?.value.trim().toUpperCase() || "ZT";
  const rate = Number(el.settingEarnRate?.value || 0);
  const limit = Number(el.settingDailyLimit?.value || 0);
  const login = Number(el.settingDailyBonus?.value || 0);
  const purchase = Number(el.settingPurchaseBonus?.value || 0);
  if (el.economyPreviewRate) el.economyPreviewRate.textContent = `${rate} ${symbol} / minute`;
  if (el.economyPreviewDaily) el.economyPreviewDaily.textContent = `Up to ${Number((rate * limit).toFixed(3))} ${symbol} from active time each day`;
  if (el.economyPreviewLogin) el.economyPreviewLogin.textContent = `${login} ${symbol}`;
  if (el.economyPreviewPurchase) el.economyPreviewPurchase.textContent = `${purchase} ${symbol}`;
}

async function loadTokenSettings() {
  if (!authApi?.isAdmin?.()) return;
  try {
    const data = await authApi.apiFetch("/api/admin-token-settings");
    const settings = data.settings;
    el.settingTokenName.value = settings.name;
    el.settingTokenSymbol.value = settings.symbol;
    el.settingEarnRate.value = Number(settings.earnPerMinuteMilli || 0) / 1000;
    el.settingDailyLimit.value = settings.dailyLimitMinutes;
    el.settingDailyBonus.value = Number(settings.dailyLoginBonusMilli || 0) / 1000;
    el.settingPurchaseBonus.value = Number(settings.purchaseBonusMilli || 0) / 1000;
    el.settingEarningEnabled.checked = Boolean(settings.earningEnabled);
    updateEconomyPreview();
  } catch (error) {
    el.tokenSettingsMessage.textContent = error.message;
  }
}

async function saveTokenSettings(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  el.tokenSettingsMessage.textContent = "Saving…";
  try {
    const data = await authApi.apiFetch("/api/admin-token-settings", {
      method: "PATCH",
      body: JSON.stringify({
        name: el.settingTokenName.value.trim(),
        symbol: el.settingTokenSymbol.value.trim(),
        earnPerMinuteMilli: Math.round(Number(el.settingEarnRate.value) * 1000),
        dailyLimitMinutes: Math.round(Number(el.settingDailyLimit.value)),
        dailyLoginBonusMilli: Math.round(Number(el.settingDailyBonus.value) * 1000),
        purchaseBonusMilli: Math.round(Number(el.settingPurchaseBonus.value) * 1000),
        earningEnabled: el.settingEarningEnabled.checked
      })
    });
    if (walletData) walletData.settings = data.settings;
    updateWalletSummary();
    updateEconomyPreview();
    el.tokenSettingsMessage.textContent = "Saved — live immediately";
  } catch (error) {
    el.tokenSettingsMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function renderAdminCustomers() {
  if (!el.customerTableBody) return;
  const search = el.customerSearch?.value.trim().toLowerCase() || "";
  const filtered = adminCustomers.filter(customer => `${customer.display_name} ${customer.email} ${customer.roblox_username} ${customer.discord_username} ${customer.gang_name}`.toLowerCase().includes(search));
  if (!filtered.length) {
    el.customerTableBody.innerHTML = `<tr><td colspan="6"><div class="dashboard-empty"><strong>No matching customers.</strong></div></td></tr>`;
    return;
  }
  const canAdjust = Boolean(adminPermissions().manageCustomers);
  el.customerTableBody.innerHTML = filtered.map(customer => `<tr>
    <td><strong>${escapeHtml(customer.display_name || "Zone6ix customer")}</strong><small>${escapeHtml(customer.email)}</small></td>
    <td><strong>${escapeHtml(customer.roblox_username || "—")}</strong><small>${escapeHtml(customer.gang_name || customer.discord_username || "—")}</small></td>
    <td><strong>${escapeHtml(tokenLabel(customer.balance_milli))}</strong><small>${escapeHtml(tokenLabel(customer.lifetime_earned_milli))} earned</small></td>
    <td>${Number(customer.order_count || 0)}</td><td>${Number(customer.redemption_count || 0)}</td>
    <td>${canAdjust ? `<button type="button" data-adjust-customer="${escapeHtml(customer.firebase_uid)}">Adjust tokens</button>` : `<span class="admin-readonly-note">View only</span>`}</td>
  </tr>`).join("");
  el.customerTableBody.querySelectorAll("[data-adjust-customer]").forEach(button => button.addEventListener("click", () => adjustCustomerTokens(button.dataset.adjustCustomer)));
}

async function loadAdminCustomers(force = false) {
  if (!authApi?.isAdmin?.() || (!force && adminCustomers.length)) {
    if (adminCustomers.length) renderAdminCustomers();
    return;
  }
  el.customerTableBody.innerHTML = `<tr><td colspan="6"><div class="dashboard-loading"><i></i><span>Loading customers…</span></div></td></tr>`;
  try {
    const data = await authApi.apiFetch("/api/admin-customers");
    adminCustomers = data.customers || [];
    renderAdminCustomers();
  } catch (error) {
    el.customerTableBody.innerHTML = `<tr><td colspan="6"><div class="dashboard-error"><strong>Could not load customers.</strong><span>${escapeHtml(error.message)}</span></div></td></tr>`;
  }
}

function updateAdminAccessUi() {
  const owner = Boolean(authApi?.isOwner?.());
  const permissions = adminPermissions();
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.hidden = !canOpenAdminTab(button.dataset.adminTab);
  });
  if (el.adminAccessTab) el.adminAccessTab.hidden = !permissions.manageAdmins;
  if (el.adminDashboardKicker) {
    const role = authApi?.getAdminRole?.() || "admin";
    el.adminDashboardKicker.textContent = owner ? "OWNER CONTROL CENTRE" : `${String(role).toUpperCase()} CONTROL CENTRE`;
  }
  if (!owner) siteAdmins = [];
  if (!canOpenAdminTab(activeAdminTab)) activeAdminTab = firstAllowedAdminTab();
  switchAdminTab(activeAdminTab);
}

function adminInitials(email) {
  const name = String(email || "AD").split("@")[0].replace(/[^a-z0-9]+/gi, " ").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2) || "AD").toUpperCase();
}

function renderAdminAccess() {
  if (!el.adminAccessList) return;
  if (!authApi?.isOwner?.()) {
    el.adminAccessList.innerHTML = `<div class="dashboard-error"><strong>Owner access required.</strong><span>Only the owner can change website administrators.</span></div>`;
    return;
  }
  if (!siteAdmins.length) {
    el.adminAccessList.innerHTML = `<div class="dashboard-empty"><strong>No administrators found.</strong><span>Your owner account will always keep access.</span></div>`;
    return;
  }
  el.adminAccessList.innerHTML = siteAdmins.map(admin => {
    const owner = admin.role === "owner";
    return `<article class="admin-access-row" data-admin-email="${escapeHtml(admin.email)}">
      <span class="admin-access-avatar">${escapeHtml(adminInitials(admin.email))}</span>
      <div class="admin-access-details">
        <strong>${escapeHtml(admin.email)}</strong>
        <small>${owner ? "Permanent owner account" : `Added ${escapeHtml(formatDate(admin.created_at, false))} by ${escapeHtml(admin.created_by_email || "owner")}`}</small>
      </div>
      ${owner ? `<span class="admin-role-badge owner">Owner</span>` : `<label class="admin-role-control"><span>Role</span><select data-admin-role-email="${escapeHtml(admin.email)}">
        ${[["manager","Manager"],["orders","Orders admin"],["store","Store admin"],["support","Support"]].map(([value,label]) => `<option value="${value}" ${admin.role_name === value ? "selected" : ""}>${label}</option>`).join("")}
      </select></label>`}
      ${owner ? "" : `<button class="remove-admin-button" type="button" data-remove-admin="${escapeHtml(admin.email)}">Remove access</button>`}
    </article>`;
  }).join("");
}

async function loadAdminAccess(force = false) {
  if (!authApi?.isOwner?.() || (!force && siteAdmins.length)) return;
  if (el.adminAccessList) el.adminAccessList.innerHTML = `<div class="dashboard-loading"><i></i><span>Loading administrators…</span></div>`;
  try {
    const data = await authApi.apiFetch("/api/admin-access");
    siteAdmins = Array.isArray(data.admins) ? data.admins : [];
    renderAdminAccess();
  } catch (error) {
    if (el.adminAccessList) el.adminAccessList.innerHTML = `<div class="dashboard-error"><strong>Could not load administrators.</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

async function addAdminAccess(event) {
  event?.preventDefault();
  if (!authApi?.isOwner?.()) return;
  const email = el.newAdminEmail?.value.trim().toLowerCase() || "";
  if (!email) return;
  const button = el.addAdminButton;
  const message = el.adminAccessMessage;
  if (button) button.disabled = true;
  if (message) {
    message.classList.remove("error");
    message.textContent = "Adding secure admin access…";
  }
  try {
    const roleName = el.newAdminRole?.value || "manager";
    const data = await authApi.apiFetch("/api/admin-access", {
      method: "POST",
      body: JSON.stringify({ email, roleName })
    });
    siteAdmins = Array.isArray(data.admins) ? data.admins : [];
    renderAdminAccess();
    if (el.newAdminEmail) el.newAdminEmail.value = "";
    if (message) message.textContent = data.alreadyOwner
      ? "That email is already the permanent owner account."
      : `${email} now has ${el.newAdminRole?.selectedOptions?.[0]?.textContent || "admin"} access. They should refresh the site and sign in with that exact Google account.`;
  } catch (error) {
    if (message) {
      message.classList.add("error");
      message.textContent = error.message;
    }
  } finally {
    if (button) button.disabled = false;
  }
}

async function changeAdminRole(email, roleName, select) {
  if (!authApi?.isOwner?.()) return;
  const previous = siteAdmins.find(admin => admin.email === email)?.role_name || "manager";
  select.disabled = true;
  try {
    const data = await authApi.apiFetch("/api/admin-access", {
      method: "PATCH",
      body: JSON.stringify({ email, roleName })
    });
    siteAdmins = Array.isArray(data.admins) ? data.admins : [];
    renderAdminAccess();
    if (el.adminAccessMessage) {
      el.adminAccessMessage.classList.remove("error");
      el.adminAccessMessage.textContent = `${email} role changed to ${roleName}.`;
    }
  } catch (error) {
    select.value = previous;
    select.disabled = false;
    if (el.adminAccessMessage) {
      el.adminAccessMessage.classList.add("error");
      el.adminAccessMessage.textContent = error.message;
    }
  }
}

async function removeAdminAccess(email) {
  if (!authApi?.isOwner?.()) return;
  const confirmed = confirm(`Remove admin access from ${email}?\n\nThey will lose access on their next dashboard request or page refresh.`);
  if (!confirmed) return;
  try {
    const data = await authApi.apiFetch(`/api/admin-access?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    siteAdmins = Array.isArray(data.admins) ? data.admins : [];
    renderAdminAccess();
    if (el.adminAccessMessage) {
      el.adminAccessMessage.classList.remove("error");
      el.adminAccessMessage.textContent = `${email} no longer has admin access.`;
    }
  } catch (error) {
    if (el.adminAccessMessage) {
      el.adminAccessMessage.classList.add("error");
      el.adminAccessMessage.textContent = error.message;
    }
  }
}

async function adjustCustomerTokens(uid) {
  if (!adminPermissions().manageCustomers) return;
  const customer = adminCustomers.find(item => item.firebase_uid === uid);
  if (!customer) return;
  const amountText = prompt(`Add or remove Zone Tokens for ${customer.email}.\nUse a negative number to remove tokens.`, "10");
  if (amountText === null) return;
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount === 0) return alert("Enter a valid non-zero amount.");
  const note = prompt("Reason for this adjustment:", "Admin reward");
  if (!note?.trim()) return;
  try {
    const data = await authApi.apiFetch("/api/admin-customers", {
      method: "PATCH",
      body: JSON.stringify({ uid, deltaMilli: Math.round(amount * 1000), note: note.trim() })
    });
    customer.balance_milli = data.wallet.balance_milli;
    customer.lifetime_earned_milli = data.wallet.lifetime_earned_milli;
    customer.lifetime_spent_milli = data.wallet.lifetime_spent_milli;
    renderAdminCustomers();
  } catch (error) {
    alert(error.message);
  }
}

function bindEvents() {
  ["pointerdown", "keydown", "touchstart", "wheel"].forEach(type => window.addEventListener(type, markInteraction, { passive: true }));
  window.addEventListener("scroll", markInteraction, { passive: true });
  window.addEventListener("focus", () => { markInteraction(); updateEarningUi(); });
  window.addEventListener("blur", () => updateEarningUi(false));
  document.addEventListener("visibilitychange", () => updateEarningUi());

  el.tokenWalletButton?.addEventListener("click", openWalletDashboard);
  el.walletMenuButton?.addEventListener("click", openWalletDashboard);
  el.eventWalletOpen?.addEventListener("click", () => currentUser() ? openWalletDashboard() : authApi.signIn());
  el.eventStoreMenuButton?.addEventListener("click", () => {
    authApi.closeAccountMenu?.();
    document.getElementById("event-store")?.scrollIntoView({ behavior: "smooth" });
  });
  el.closeTokenDashboard?.addEventListener("click", authApi.closeDashboards);
  el.refreshTokenWallet?.addEventListener("click", () => loadWallet());
  document.querySelectorAll("[data-wallet-tab]").forEach(button => button.addEventListener("click", () => switchWalletTab(button.dataset.walletTab)));

  el.closeRedeemModal?.addEventListener("click", closeRedeemModal);
  el.redeemBackdrop?.addEventListener("click", closeRedeemModal);
  el.redeemQuantity?.addEventListener("input", updateRedeemCost);
  el.confirmRedeemButton?.addEventListener("click", confirmRedemption);

  el.adminSectionTabs?.querySelectorAll("[data-admin-tab]").forEach(button => button.addEventListener("click", () => switchAdminTab(button.dataset.adminTab)));
  el.adminButton?.addEventListener("click", () => window.setTimeout(() => switchAdminTab(activeAdminTab), 50));
  el.refreshAdminButton?.addEventListener("click", () => {
    if (activeAdminTab === "store") { storeAdminItems = []; loadAdminStoreItems(true); }
    if (activeAdminTab === "redemptions") { adminRedemptions = []; loadAdminRedemptions(true); }
    if (activeAdminTab === "tokens") loadTokenSettings();
    if (activeAdminTab === "customers") { adminCustomers = []; loadAdminCustomers(true); }
    if (activeAdminTab === "admins") { siteAdmins = []; loadAdminAccess(true); }
  });
  el.createStoreItemButton?.addEventListener("click", newStoreItem);
  el.storeAdminSearch?.addEventListener("input", renderStoreAdminList);
  el.storeAdminStatus?.addEventListener("change", renderStoreAdminList);
  el.redemptionSearch?.addEventListener("input", renderAdminRedemptions);
  el.redemptionStatusFilter?.addEventListener("change", renderAdminRedemptions);
  el.refreshRedemptions?.addEventListener("click", () => { adminRedemptions = []; loadAdminRedemptions(true); });
  el.tokenSettingsForm?.addEventListener("submit", saveTokenSettings);
  [el.settingTokenSymbol, el.settingEarnRate, el.settingDailyLimit, el.settingDailyBonus, el.settingPurchaseBonus].forEach(input => input?.addEventListener("input", updateEconomyPreview));
  el.customerSearch?.addEventListener("input", renderAdminCustomers);
  el.refreshCustomers?.addEventListener("click", () => { adminCustomers = []; loadAdminCustomers(true); });
  el.adminAccessForm?.addEventListener("submit", addAdminAccess);
  el.refreshAdmins?.addEventListener("click", () => { siteAdmins = []; loadAdminAccess(true); });
  el.adminAccessList?.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-admin]");
    if (button) removeAdminAccess(button.dataset.removeAdmin);
  });
  el.adminAccessList?.addEventListener("change", event => {
    const select = event.target.closest("[data-admin-role-email]");
    if (select) changeAdminRole(select.dataset.adminRoleEmail, select.value, select);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && el.redeemModal?.classList.contains("open")) closeRedeemModal();
  });
  window.addEventListener("pagehide", () => {
    stopHeartbeatTimer();
    if (earningSessionId && currentUser()) {
      authApi.apiFetch("/api/token-session", {
        method: "POST",
        body: JSON.stringify({ action: "end", sessionId: earningSessionId }),
        keepalive: true
      }).catch(() => {});
    }
  });
}

async function handleAuthChange(user) {
  updateAdminAccessUi();
  if (user) {
    await loadWallet({ silent: true });
    await startEarningSession();
  } else {
    await endEarningSession();
    walletData = null;
    siteAdmins = [];
    updateWalletSummary();
  }
  renderStoreItems();
}

async function init() {
  authApi = await waitForAuth();
  if (!authApi) return;
  bindEvents();
  await loadStoreItems();
  await authApi.ready;
  updateAdminAccessUi();
  await handleAuthChange(currentUser());
  document.addEventListener("zone6ix-auth-change", event => handleAuthChange(event.detail?.user));
  document.addEventListener("zone6ix-language-change", () => {
    updateWalletSummary();
    renderWalletActivity();
    renderWalletRedemptions();
    renderStoreItems();
  });
}

init().catch(error => console.error("Zone6ix rewards failed to initialise:", error));
