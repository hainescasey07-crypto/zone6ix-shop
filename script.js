const tr = value => window.zone6ixI18n?.t(value) ?? String(value ?? "");
const activeLocale = () => window.zone6ixI18n?.locale() ?? "en-GB";

const DEFAULT_PRODUCTS = [
  {
    id: "small-turf",
    category: "turfs",
    name: "Small Turf",
    description: "A compact gang base with custom branding, a clean interior and enough space for a focused crew setup.",
    cash: 3.5,
    robux: 350,
    badge: "STARTER BUILD",
    accent: "#4bbcff",
    art: "turf-small"
  },
  {
    id: "medium-turf",
    category: "turfs",
    name: "Medium Turf",
    description: "A larger gang environment with more usable rooms, stronger street presence and extra custom detailing.",
    cash: 7,
    robux: 700,
    badge: "MOST POPULAR",
    accent: "#67d0ff",
    art: "turf-medium",
    featured: true
  },
  {
    id: "large-turf",
    category: "turfs",
    name: "Large Turf",
    description: "A full gang headquarters with multiple spaces, detailed branding and the strongest visual presence.",
    cash: 12,
    robux: 1200,
    badge: "HEADQUARTERS",
    accent: "#74c6ff",
    art: "turf-large"
  },
  {
    id: "second-floor",
    category: "turfs",
    name: "Second Floor",
    description: "Expand an existing turf with another level for extra rooms, storage, meetings or private gang areas.",
    cash: 4,
    robux: 400,
    badge: "TURF ADD-ON",
    accent: "#4aa7e8",
    art: "turf-floor"
  },
  {
    id: "gold-uzi",
    category: "guns",
    name: "Gold Uzi",
    description: "A ready-made metallic Uzi finish reserved for your gang and delivered as a premium exclusive loadout.",
    cash: 3,
    robux: 400,
    badge: "METALLIC SERIES",
    accent: "#e6b95c",
    art: "uzi"
  },
  {
    id: "gold-draco",
    category: "guns",
    name: "Gold Draco",
    description: "A premium metallic Draco with a stronger silhouette and a high-value gang weapon appearance.",
    cash: 4,
    robux: 500,
    badge: "METALLIC SERIES",
    accent: "#f0c96e",
    art: "draco"
  },
  {
    id: "custom-gun",
    category: "guns",
    name: "Fully Custom Gun",
    description: "Choose the weapon direction, material, gang logo, colour treatment and custom 3D writing.",
    cash: 7,
    robux: 900,
    badge: "FULL COMMISSION",
    accent: "#59c7ff",
    art: "custom-gun"
  },
  {
    id: "custom-name",
    category: "identity",
    name: "Custom Player Name",
    description: "A custom name display for one individual player, styled to stand out above their character in Zone6ix.",
    cash: 2,
    robux: 250,
    badge: "PLAYER NAME",
    accent: "#69ccff",
    art: "name"
  },
  {
    id: "custom-emoji",
    category: "identity",
    name: "Custom Player Emoji",
    description: "Add an emoji beside one individual player’s name using a Roblox-supported emoji that matches their style.",
    cash: 2,
    robux: 250,
    badge: "PLAYER EMOJI",
    accent: "#78d5ff",
    art: "emoji"
  },
  {
    id: "custom-level",
    category: "identity",
    name: "Custom Player Level",
    description: "Choose a custom level or status display for one individual player rather than the whole gang.",
    cash: 2,
    robux: 250,
    badge: "PLAYER LEVEL",
    accent: "#55baf0",
    art: "level"
  },
  {
    id: "identity-bundle",
    category: "identity",
    name: "Player Customisation Bundle",
    description: "Custom player name, emoji and level together for one individual player at a lower bundle price.",
    cash: 5,
    robux: 600,
    badge: "BEST VALUE",
    accent: "#8adfff",
    art: "bundle"
  }
];

let ROBUX_PRODUCT_IDS = {
  "small-turf": 3611483762,
  "medium-turf": 3611483961,
  "large-turf": 3611484082,
  "second-floor": 3611484153,
  "gold-uzi": 3611484215,
  "gold-draco": 3611484270,
  "custom-gun": 3611484308,
  "custom-name": 3611484376,
  "custom-emoji": 3611484485,
  "custom-level": 3611484625,
  "identity-bundle": 3611484757
};

let storedCart = JSON.parse(localStorage.getItem("zone6ixCart") || "[]");
let products = DEFAULT_PRODUCTS.map(product => ({ ...product }));
let cart = [];
let currentOrderData = null;

const PRODUCTS_REQUIRING_CUSTOM_REQUEST = new Set([
  "small-turf",
  "medium-turf",
  "large-turf",
  "custom-gun",
  "custom-name",
  "custom-emoji",
  "custom-level",
  "identity-bundle"
]);

function cartRequiresCustomRequest() {
  return cart.some(item => PRODUCTS_REQUIRING_CUSTOM_REQUEST.has(String(item.id || "")));
}

const turfProducts = document.getElementById("turfProducts");
const gunProducts = document.getElementById("gunProducts");
const identityProducts = document.getElementById("identityProducts");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const overlay = document.getElementById("overlay");
const reviewModal = document.getElementById("reviewModal");
const basketDock = document.getElementById("basketDock");


function safeText(element, value) {
  if (element && value !== undefined && value !== null) element.textContent = String(value);
}

function applySiteSettings(settings = {}) {
  window.zone6ixSiteSettings = settings;
  if (settings.siteName) document.title = settings.siteName;
  document.documentElement.style.setProperty("--blue", settings.accentPrimary || "#4bbcff");
  document.documentElement.style.setProperty("--blue-strong", settings.accentSecondary || "#1769ff");
  document.documentElement.style.setProperty("--site-accent", settings.accentPrimary || "#4bbcff");
  document.documentElement.style.setProperty("--site-accent-secondary", settings.accentSecondary || "#1769ff");
  document.querySelectorAll(".brand-copy strong").forEach(element => safeText(element, settings.siteName?.replace(/\s+Customs$/i, "") || "ZONE6IX"));
  document.querySelectorAll(".brand-copy small").forEach(element => safeText(element, settings.studioLabel || "CUSTOM STUDIO"));
  safeText(document.getElementById("siteStatusText"), tr(settings.statusText || "CUSTOM ORDERS OPEN"));
  safeText(document.getElementById("heroLineOne"), tr(settings.heroLineOne || "YOUR GANG."));
  safeText(document.getElementById("heroLineTwo"), tr(settings.heroLineTwo || "YOUR WORLD."));
  safeText(document.getElementById("heroLineThree"), tr(settings.heroLineThree || "BUILT DIFFERENT."));
  safeText(document.getElementById("heroLead"), tr(settings.heroLead || ""));
  safeText(document.getElementById("studioHeading"), tr(settings.studioHeading || "More than a shop."));
  safeText(document.getElementById("studioAccentHeading"), tr(settings.studioAccentHeading || "Your gang’s design department."));
  safeText(document.getElementById("studioLead"), tr(settings.studioLead || ""));
  safeText(document.getElementById("turfHeading"), tr(settings.turfHeading || "Build a place your gang can own."));
  safeText(document.getElementById("turfLead"), tr(settings.turfLead || ""));
  safeText(document.getElementById("weaponHeading"), tr(settings.weaponHeading || "Make the loadout part of the brand."));
  safeText(document.getElementById("weaponLead"), tr(settings.weaponLead || ""));
  safeText(document.getElementById("playerHeading"), tr(settings.playerHeading || "Make your individual player stand out."));
  safeText(document.getElementById("playerLead"), tr(settings.playerLead || ""));
  const eventHeading = document.getElementById("eventHeading");
  if (eventHeading && settings.eventHeading) eventHeading.textContent = tr(settings.eventHeading);
  safeText(document.getElementById("eventLead"), tr(settings.eventLead || ""));
  safeText(document.getElementById("processHeading"), tr(settings.processHeading || "From idea to in-game."));
  safeText(document.getElementById("processLead"), tr(settings.processLead || ""));
  safeText(document.getElementById("orderHeading"), tr(settings.orderHeading || "Turn the idea into a real Zone6ix build."));
  safeText(document.getElementById("orderLead"), tr(settings.orderLead || ""));
  safeText(document.getElementById("primaryCtaText"), tr(settings.primaryCta || "Explore the studio"));
  safeText(document.getElementById("secondaryCtaText"), tr(settings.secondaryCta || "Build an order"));
  safeText(document.getElementById("footerDescription"), `Premium custom content for the Zone6ix Roblox experience. Contact: ${settings.contactEmail || "hainescasey07@gmail.com"}`);
  const footerStatus = document.getElementById("footerStatus");
  if (footerStatus) footerStatus.innerHTML = `<i></i> ${escapeHtml(settings.statusText || "Custom orders open")}`;
  document.getElementById("siteStatusPill")?.classList.toggle("closed", settings.statusOpen === false);
  footerStatus?.classList.toggle("closed", settings.statusOpen === false);

  const announcement = document.getElementById("siteAnnouncement");
  const dismissed = sessionStorage.getItem("zone6ixAnnouncementDismissed") === String(settings.announcementText || "");
  if (announcement) {
    safeText(document.getElementById("siteAnnouncementText"), tr(settings.announcementText || ""));
    announcement.hidden = !settings.announcementText || dismissed;
  }
  safeText(document.getElementById("publicTermsText"), settings.termsText || "");
  safeText(document.getElementById("publicPrivacyText"), settings.privacyText || "");
  safeText(document.getElementById("publicRefundText"), settings.refundText || "");
  safeText(document.getElementById("publicTokenRulesText"), settings.tokenRulesText || "");
}

function reconcileCart() {
  const ids = Array.isArray(storedCart)
    ? storedCart.map(item => typeof item === "string" ? item : item?.id).filter(Boolean)
    : [];
  cart = ids.map(id => products.find(product => product.id === id)).filter(Boolean);
}

async function loadSiteConfig() {
  try {
    const response = await fetch("/api/site-config", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Site configuration could not load.");
    if (Array.isArray(data.products) && data.products.length) {
      products = data.products.map(product => ({
        ...product,
        cash: Number(product.cashPricePence || 0) / 100,
        robux: Number(product.robuxPrice || 0)
      }));
      ROBUX_PRODUCT_IDS = Object.fromEntries(products.map(product => [product.id, Number(product.robuxProductId || 0)]));
    }
    applySiteSettings(data.settings || {});
    window.zone6ixSiteConfig = data;
    document.dispatchEvent(new CustomEvent("zone6ix-site-config", { detail: data }));
  } catch (error) {
    console.error("Zone6ix site config fallback:", error);
    applySiteSettings({});
  }
  reconcileCart();
}

async function waitForZone6ixAuth() {
  if (window.zone6ixAuth) {
    await window.zone6ixAuth.ready;
    return window.zone6ixAuth;
  }
  await new Promise(resolve => document.addEventListener("zone6ix-auth-module", resolve, { once: true }));
  await window.zone6ixAuth.ready;
  return window.zone6ixAuth;
}

async function getAuthenticatedHeaders(extraHeaders = {}) {
  const authApi = await waitForZone6ixAuth();
  const user = await authApi.requireUser();
  if (!user) throw new Error("Sign in with Google to continue.");
  const token = await authApi.getToken();
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  };
}

function productArtwork(type) {
  const common = 'class="product-art" viewBox="0 0 420 230" aria-hidden="true"';

  const artwork = {
    "turf-small": `<svg ${common}>
      <defs><linearGradient id="ts" x1="0" x2="1"><stop stop-color="#173a51"/><stop offset="1" stop-color="#09151f"/></linearGradient></defs>
      <path d="M72 172 190 104l151 54-123 66Z" fill="#071019" stroke="#388fc0" opacity=".72"/>
      <path d="m111 145 99-57 108 39-101 58Z" fill="url(#ts)" stroke="#66c9fa" stroke-width="2"/>
      <path d="M111 145v43l106 39v-42zM217 185l101-58v42l-101 58z" fill="#0a1923" stroke="#3184b2"/>
      <path d="m151 136 57-32 67 24-58 33z" fill="#102a3a" stroke="#4aa9d8"/>
      <path d="M138 163v27l32 12v-27zM259 153v28l29-17v-27z" fill="#2a85b5" opacity=".4"/>
      <text x="185" y="143" fill="#91dcff" font-size="18" font-weight="900">Z6</text>
      <path d="M42 205h335" stroke="#237aa8" stroke-dasharray="6 8" opacity=".55"/>
    </svg>`,
    "turf-medium": `<svg ${common}>
      <defs><linearGradient id="tm" x1="0" x2="1"><stop stop-color="#1e4f6b"/><stop offset=".55" stop-color="#102b3d"/><stop offset="1" stop-color="#09131b"/></linearGradient></defs>
      <path d="M45 184 188 80l190 76-157 72Z" fill="#071119" stroke="#2e88b8" opacity=".65"/>
      <path d="m84 142 119-75 145 55-128 78Z" fill="url(#tm)" stroke="#78d4ff" stroke-width="2"/>
      <path d="M84 142v54l136 51v-47zM220 200l128-78v50l-128 75z" fill="#0b1b26" stroke="#3b9bcc"/>
      <path d="m125 130 77-47 96 36-79 49z" fill="#16384b" stroke="#52b7e8"/>
      <path d="M116 162v37l42 16v-37zM172 183v40l35 13v-40zM256 172v39l46-28v-39z" fill="#45aee4" opacity=".34"/>
      <path d="m224 112 64 24" stroke="#a2e4ff" stroke-width="3"/>
      <text x="172" y="140" fill="#b6eaff" font-size="23" font-weight="900" letter-spacing="3">ZONE6IX</text>
      <circle cx="220" cy="200" r="7" fill="#6ed4ff" opacity=".55"/>
      <path d="M27 214h368" stroke="#2f91c0" stroke-dasharray="6 8" opacity=".6"/>
    </svg>`,
    "turf-large": `<svg ${common}>
      <defs><linearGradient id="tl" x1="0" x2="1"><stop stop-color="#173f57"/><stop offset="1" stop-color="#08131b"/></linearGradient></defs>
      <path d="M30 190 181 58l219 91-181 86Z" fill="#071018" stroke="#2d8fbe" opacity=".6"/>
      <path d="m63 148 134-93 171 67-149 91Z" fill="url(#tl)" stroke="#6dd0ff" stroke-width="2"/>
      <path d="M63 148v58l156 59v-52zM219 213l149-91v55l-149 88z" fill="#091923" stroke="#348ebc"/>
      <path d="m98 134 98-63 121 47-101 65z" fill="#15364a" stroke="#50b7e8"/>
      <path d="m121 113 75-47 92 35-76 49z" fill="#1b455b" stroke="#6fcdf8"/>
      <path d="M94 169v35l36 14v-36zM143 188v35l36 14v-36zM270 174v43l57-35v-42z" fill="#4bb7ea" opacity=".32"/>
      <text x="157" y="132" fill="#a7e5ff" font-size="22" font-weight="900" letter-spacing="3">Z6 HQ</text>
      <path d="M16 220h390" stroke="#2a88b6" stroke-dasharray="6 8" opacity=".6"/>
    </svg>`,
    "turf-floor": `<svg ${common}>
      <path d="m86 156 126-66 132 51-128 69Z" fill="#102b3b" stroke="#62c5f4" stroke-width="2"/>
      <path d="M86 156v39l130 49v-34zM216 210l128-69v36l-128 67z" fill="#091720" stroke="#3188b7"/>
      <path d="m107 126 108-57 112 43-111 60Z" fill="#173a4e" stroke="#6acdf8" stroke-width="2"/>
      <path d="M107 126v29l109 41v-24zM216 172l111-60v26l-111 58z" fill="#0d202b" stroke="#3995c3"/>
      <path d="m209 40 0 45M195 57l14-17 14 17" stroke="#8addff" stroke-width="3" fill="none"/>
      <path d="M52 216h315" stroke="#2c88b5" stroke-dasharray="6 8" opacity=".58"/>
    </svg>`,
    "uzi": weaponSvg("UZI", true, false),
    "draco": weaponSvg("DRACO", true, true),
    "custom-gun": weaponSvg("YOUR GANG", false, true),
    "name": `<svg ${common}><rect x="58" y="65" width="304" height="110" rx="22" fill="#0d1e29" stroke="#62c8f8"/><path d="M85 98h43M85 116h28" stroke="#315f78" stroke-width="5"/><text x="150" y="132" fill="#a9e5ff" font-size="31" font-weight="900" letter-spacing="5">ZONE6IX</text><path d="M150 147h155" stroke="#3e9ac8"/><circle cx="318" cy="95" r="12" fill="#55bce9" opacity=".28" stroke="#73d1ff"/></svg>`,
    "emoji": `<svg ${common}><rect x="55" y="58" width="310" height="118" rx="24" fill="#0d1e29" stroke="#74d2ff"/><circle cx="122" cy="117" r="39" fill="#173f55" stroke="#6ccfff"/><text x="92" y="137" fill="#d9f5ff" font-size="49">🔥</text><text x="185" y="111" fill="#a9e6ff" font-size="22" font-weight="900" letter-spacing="3">PLAYER</text><text x="185" y="143" fill="#6ecfff" font-size="16" font-weight="800">CUSTOM EMOJI</text><path d="M70 196h280" stroke="#2e86b1" stroke-dasharray="6 8"/></svg>`,
    "level": `<svg ${common}><path d="M72 180h276" stroke="#2a799f"/><rect x="82" y="125" width="256" height="56" rx="14" fill="#0d202b" stroke="#5fc4f3"/><text x="107" y="160" fill="#6e9bb3" font-size="13" font-weight="800">PLAYER LEVEL</text><text x="268" y="162" fill="#aee8ff" font-size="29" font-weight="950">100</text><path d="M97 196h226" stroke="#265f7d" stroke-width="8" stroke-linecap="round"/><path d="M97 196h176" stroke="#66caf8" stroke-width="8" stroke-linecap="round"/><path d="m210 40 16 31 34 5-25 24 6 34-31-16-31 16 6-34-25-24 34-5z" fill="#1d5672" stroke="#74d2ff"/></svg>`,
    "bundle": `<svg ${common}><rect x="46" y="76" width="328" height="102" rx="22" fill="#0c1b25" stroke="#6fd0ff"/><path d="m95 127 31-34 31 34-31 34z" fill="#215c77" stroke="#7ad5ff"/><text x="178" y="125" fill="#a9e6ff" font-size="25" font-weight="900" letter-spacing="4">ZONE6IX</text><text x="179" y="148" fill="#5f9fbe" font-size="11" font-weight="800" letter-spacing="3">LEVEL 100</text><path d="M57 194h306" stroke="#2e86b1" stroke-dasharray="6 8"/><circle cx="337" cy="101" r="8" fill="#6dcbf8" opacity=".65"/></svg>`
  };

  return artwork[type] || artwork.name;
}

function weaponSvg(label, gold, longShape) {
  const metalA = gold ? "#5d4215" : "#133d55";
  const metalB = gold ? "#f0c760" : "#62c9ff";
  const metalC = gold ? "#8e671f" : "#0d2c40";
  const width = longShape ? 270 : 220;
  return `<svg class="product-art" viewBox="0 0 420 230" aria-hidden="true">
    <defs><linearGradient id="wg${label.replace(/\W/g, "")}" x1="0" x2="1"><stop stop-color="${metalA}"/><stop offset=".45" stop-color="${metalB}"/><stop offset=".7" stop-color="${metalC}"/><stop offset="1" stop-color="#081018"/></linearGradient></defs>
    <g transform="translate(${longShape ? 42 : 70} 64) rotate(-4)" fill="url(#wg${label.replace(/\W/g, "")})" stroke="${metalB}" stroke-width="1.5">
      <path d="M0 42h${width}l45 19v39H${longShape ? 160 : 132}l-35-14H0Z"/>
      <path d="M${longShape ? 100 : 75} 94h58l-8 84H${longShape ? 105 : 80}z"/>
      <path d="M${longShape ? 185 : 142} 96h45l38 69h-57z"/>
      <path d="M${width - 5} 55h86v25h-86z"/>
      <path d="M-28 53H8v35h-36z"/>
    </g>
    <text x="${longShape ? 145 : 128}" y="134" fill="${gold ? "#fff0b0" : "#d8f3ff"}" font-size="${label.length > 7 ? 14 : 18}" font-weight="950" letter-spacing="3">${label}</text>
    <path d="M38 205h344" stroke="${metalB}" stroke-dasharray="6 8" opacity=".45"/>
  </svg>`;
}

function miniIcon(product) {
  const icons = {
    turfs: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l9-5 9 5v11H3Z"/><path d="M8 20v-7h5v7M16 11h2v3h-2"/></svg>`,
    guns: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h12l3-3h3v5h-3l-3-2"/><path d="M10 10v8h4l2-8M5 10v4h3"/></svg>`,
    identity: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 5v10l-8 5-8-5V7z"/><path d="m8 12 3 3 5-6"/></svg>`
  };
  return icons[product.category];
}

function productCard(product) {
  return `
    <article class="product-card spotlight-card reveal ${product.featured ? "featured" : ""}" style="--accent:${product.accent}">
      <div class="product-visual">${productArtwork(product.art)}</div>
      <div class="product-body">
        <span class="product-badge">${escapeHtml(tr(product.badge))}</span>
        <h3>${escapeHtml(tr(product.name))}</h3>
        <p class="product-description">${escapeHtml(tr(product.description))}</p>
        <div class="product-meta">
          <div><span>${tr("Card price")}</span><strong>£${product.cash.toFixed(2)}</strong></div>
          <div><span>${tr("Robux price")}</span><strong>${product.robux.toLocaleString(activeLocale())} R$</strong></div>
        </div>
        <button class="add-button" type="button" data-product-id="${product.id}">
          <span>${escapeHtml(tr("Add to basket"))}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </article>
  `;
}

function renderProducts() {
  turfProducts.innerHTML = products.filter(product => product.category === "turfs").map(productCard).join("");
  gunProducts.innerHTML = products.filter(product => product.category === "guns").map(productCard).join("");
  identityProducts.innerHTML = products.filter(product => product.category === "identity").map(productCard).join("");

  document.querySelectorAll("[data-product-id]").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.productId, button);
    });
  });

  activateSpotlights();
  activateReveals();
}

function addToCart(productId, button) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  cart.push(product);
  saveCart();
  renderCart();

  if (button) {
    const label = button.querySelector("span");
    const oldLabel = label.textContent;
    button.classList.add("added");
    label.textContent = tr("Added to basket");
    setTimeout(() => {
      button.classList.remove("added");
      label.textContent = oldLabel;
    }, 950);
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem("zone6ixCart", JSON.stringify(cart.map(item => item.id)));
  storedCart = cart.map(item => item.id);
}

function renderCart() {
  const count = cart.length;
  const cashTotal = cart.reduce((total, item) => total + Number(item.cash || 0), 0);
  const robuxTotal = cart.reduce((total, item) => total + Number(item.robux || 0), 0);

  document.getElementById("cartCount").textContent = count;
  document.getElementById("cashTotal").textContent = `£${cashTotal.toFixed(2)}`;
  document.getElementById("robuxTotal").textContent = `${robuxTotal.toLocaleString(activeLocale())} R$`;
  document.getElementById("dockCount").textContent = count;
  document.getElementById("dockTotal").textContent = `£${cashTotal.toFixed(2)}`;

  basketDock.classList.toggle("visible", count > 0 && !cartPanel.classList.contains("open") && !reviewModal.classList.contains("open"));
  cartEmpty.style.display = count === 0 ? "grid" : "none";

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-icon">${miniIcon(item)}</div>
      <div>
        <h4>${escapeHtml(tr(item.name))}</h4>
        <p>£${Number(item.cash).toFixed(2)} ${tr("or")} ${Number(item.robux).toLocaleString(activeLocale())} R$</p>
      </div>
      <button class="remove-item" type="button" data-remove-index="${index}">${tr("Remove")}</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-remove-index]").forEach(button => {
    button.addEventListener("click", () => removeFromCart(Number(button.dataset.removeIndex)));
  });
}

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("visible");
  basketDock.classList.remove("visible");
  document.body.classList.add("locked");
}

function closeEverything() {
  cartPanel.classList.remove("open");
  reviewModal.classList.remove("open");
  overlay.classList.remove("visible");
  document.body.classList.remove("locked");
  renderCart();
}

function buildReview() {
  const paymentMethod = document.getElementById("paymentMethod").value;
  const customRequestInput = document.getElementById("customRequest");
  const enteredCustomRequest = customRequestInput.value.trim();

  if (cartRequiresCustomRequest() && enteredCustomRequest.length < 3) {
    customRequestInput.focus();
    throw new Error("Please describe what you want customised for the selected item.");
  }

  const customRequest = enteredCustomRequest || "No custom request provided.";
  const cashTotal = cart.reduce((total, item) => total + Number(item.cash || 0), 0);
  const robuxTotal = cart.reduce((total, item) => total + Number(item.robux || 0), 0);
  const selectedTotal = paymentMethod === "cash" ? `£${cashTotal.toFixed(2)}` : `${robuxTotal.toLocaleString(activeLocale())} R$`;

  currentOrderData = {
    robloxUsername: document.getElementById("robloxUsername").value.trim(),
    gangName: document.getElementById("gangName").value.trim(),
    customerEmail: document.getElementById("customerEmail").value.trim(),
    discordUsername: document.getElementById("discordUsername").value.trim(),
    paymentMethod: paymentMethod === "cash" ? "Card / cash" : "Robux",
    products: cart.map(item => item.name).join(", "),
    cashTotal: `£${cashTotal.toFixed(2)}`,
    robuxTotal: `${robuxTotal.toLocaleString(activeLocale())} R$`,
    selectedTotal,
    customRequest,
    referenceLink: document.getElementById("referenceLink").value.trim() || "None provided",
    gangShirtLink: document.getElementById("gangShirtLink").value.trim() || "None provided",
    gangPantsLink: document.getElementById("gangPantsLink").value.trim() || "None provided",
    gangGroupLink: document.getElementById("gangGroupLink").value.trim() || "None provided"
  };

  const rows = [
    [tr("Roblox username"), currentOrderData.robloxUsername],
    [tr("Gang name"), currentOrderData.gangName],
    [tr("Email"), currentOrderData.customerEmail],
    [tr("Discord"), currentOrderData.discordUsername],
    [tr("Payment choice"), tr(currentOrderData.paymentMethod)],
    [tr("Products"), cart.map(item => tr(item.name)).join(", ")],
    [tr("Total"), currentOrderData.selectedTotal],
    [tr("Request"), currentOrderData.customRequest],
    [tr("Reference link"), tr(currentOrderData.referenceLink)],
    [tr("Gang shirt link"), tr(currentOrderData.gangShirtLink)],
    [tr("Gang pants link"), tr(currentOrderData.gangPantsLink)],
    [tr("Gang group link"), tr(currentOrderData.gangGroupLink)]
  ];

  document.getElementById("reviewContent").innerHTML = `
    <div class="review-list">
      ${rows.map(([label, value]) => `<div class="review-line"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div>
  `;

  closeEverything();
  reviewModal.classList.add("open");
  overlay.classList.add("visible");
  basketDock.classList.remove("visible");
  document.body.classList.add("locked");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function setButtonLabel(button, text) {
  const translated = tr(text);
  const span = button.querySelector("span");
  if (span) span.textContent = translated;
  else button.textContent = translated;
}

document.getElementById("dismissAnnouncement")?.addEventListener("click", () => {
  const announcement = document.getElementById("siteAnnouncement");
  const text = window.zone6ixSiteSettings?.announcementText || "";
  sessionStorage.setItem("zone6ixAnnouncementDismissed", text);
  if (announcement) announcement.hidden = true;
});

document.getElementById("openCartButton").addEventListener("click", openCart);
document.getElementById("basketDockButton").addEventListener("click", openCart);
document.getElementById("closeCartButton").addEventListener("click", closeEverything);
document.getElementById("closeModalButton").addEventListener("click", closeEverything);
document.getElementById("overlay").addEventListener("click", closeEverything);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeEverything();
});

document.getElementById("continueButton").addEventListener("click", () => {
  if (cart.length === 0) {
    alert(tr("Add at least one item to your basket first."));
    return;
  }
  closeEverything();
  document.getElementById("order").scrollIntoView({ behavior: "smooth" });
});

document.querySelectorAll("[data-scroll-order]").forEach(button => {
  button.addEventListener("click", () => document.getElementById("order").scrollIntoView({ behavior: "smooth" }));
});

document.getElementById("orderForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (cart.length === 0) {
    alert(tr("Your basket is empty. Add at least one product first."));
    document.getElementById("collections").scrollIntoView({ behavior: "smooth" });
    return;
  }

  try {
    const authApi = await waitForZone6ixAuth();
    const user = await authApi.requireUser();
    if (!user) return;
    document.getElementById("customerEmail").value = user.email || "";
    buildReview();
  } catch (error) {
    alert(tr(error.message || "Google sign-in is required to save this order."));
  }
});

async function sendOrderEmail(orderStatus) {
  const formData = new URLSearchParams({
    _subject: `New Zone6ix order — ${currentOrderData.gangName}`,
    _template: "table",
    _replyto: currentOrderData.customerEmail,
    email: currentOrderData.customerEmail,
    "Order Status": orderStatus,
    "Order Code": currentOrderData.orderCode || "Not created",
    "Roblox Username": currentOrderData.robloxUsername,
    "Gang Name": currentOrderData.gangName,
    "Discord Username": currentOrderData.discordUsername,
    "Payment Method": currentOrderData.paymentMethod,
    Products: currentOrderData.products,
    "Cash Total": currentOrderData.cashTotal,
    "Robux Total": currentOrderData.robuxTotal,
    "Selected Total": currentOrderData.selectedTotal,
    "Custom Request": currentOrderData.customRequest,
    "Reference Link": currentOrderData.referenceLink,
    "Gang Shirt Link": currentOrderData.gangShirtLink,
    "Gang Pants Link": currentOrderData.gangPantsLink,
    "Gang Group Link": currentOrderData.gangGroupLink,
    Website: "https://zone6ix-shop.pages.dev"
  });

  const response = await fetch("https://formsubmit.co/ajax/Hainescasey07@gmail.com", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData
  });

  const responseText = await response.text();
  let result = {};
  try { result = JSON.parse(responseText); } catch { result = {}; }

  if (!response.ok || String(result.success).toLowerCase() === "false") {
    throw new Error(result.message || responseText || "The order email could not be sent.");
  }
}

async function createStripeCheckout() {
  const headers = await getAuthenticatedHeaders({ "Content-Type": "application/json" });
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers,
    body: JSON.stringify({
      productIds: cart.map(item => item.id),
      customer: {
        robloxUsername: currentOrderData.robloxUsername,
        gangName: currentOrderData.gangName,
        discordUsername: currentOrderData.discordUsername,
        customRequest: currentOrderData.customRequest,
        referenceLink: currentOrderData.referenceLink,
        gangShirtLink: currentOrderData.gangShirtLink,
        gangPantsLink: currentOrderData.gangPantsLink,
        gangGroupLink: currentOrderData.gangGroupLink
      }
    })
  });

  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(result.error || "Stripe could not create the checkout.");
  currentOrderData.orderCode = result.orderCode;
  return result.url;
}

async function createSavedRobuxOrder() {
  const headers = await getAuthenticatedHeaders({ "Content-Type": "application/json" });
  const response = await fetch("/api/orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      paymentMethod: "robux",
      productIds: cart.map(item => item.id),
      customer: {
        robloxUsername: currentOrderData.robloxUsername,
        gangName: currentOrderData.gangName,
        discordUsername: currentOrderData.discordUsername,
        customRequest: currentOrderData.customRequest,
        referenceLink: currentOrderData.referenceLink,
        gangShirtLink: currentOrderData.gangShirtLink,
        gangPantsLink: currentOrderData.gangPantsLink,
        gangGroupLink: currentOrderData.gangGroupLink
      }
    })
  });

  const result = await response.json();
  if (!response.ok || !result.orderCode) throw new Error(result.error || "The Robux order could not be saved.");
  return result;
}

function showOrderSentMessage(message) {
  document.getElementById("reviewContent").innerHTML = `<div class="notice"><strong>${tr("Order request sent.")}</strong><br>${escapeHtml(tr(message))}</div>`;
}

function updatePaymentButtonLabel() {
  const paymentMethod = document.getElementById("paymentMethod").value;
  const button = document.getElementById("paymentButton");
  setButtonLabel(button, paymentMethod === "cash" ? "Pay securely with Stripe" : "Send Robux order request");
}

document.getElementById("paymentMethod").addEventListener("change", updatePaymentButtonLabel);

function createRobuxOrderCode() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const randomPart = randomValues[0].toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
  return `Z6-${timePart}-${randomPart}`;
}

function createRobloxOrderUrl(orderCode) {
  const productIds = cart.map(item => Number(item.robuxProductId || ROBUX_PRODUCT_IDS[item.id]));
  if (productIds.length === 0 || productIds.some(productId => !productId)) {
    throw new Error("One or more products are missing their Roblox Product ID.");
  }
  const launchData = JSON.stringify({ o: orderCode, p: productIds });
  return `https://www.roblox.com/games/start?placeId=123342024810939&launchData=${encodeURIComponent(launchData)}`;
}

document.getElementById("paymentButton").addEventListener("click", async () => {
  if (!currentOrderData) {
    alert(tr("Please review your order again."));
    return;
  }

  const button = document.getElementById("paymentButton");
  const paymentMethod = document.getElementById("paymentMethod").value;
  button.disabled = true;

  try {
    const authApi = await waitForZone6ixAuth();
    const user = await authApi.requireUser();
    if (!user) throw new Error("Sign in with Google to continue.");

    if (paymentMethod === "cash") {
      setButtonLabel(button, "Saving order and opening Stripe...");
      const checkoutUrl = await createStripeCheckout();
      window.location.assign(checkoutUrl);
      return;
    }

    setButtonLabel(button, "Saving Robux order...");
    const savedOrder = await createSavedRobuxOrder();
    const orderCode = savedOrder.orderCode;
    const robloxOrderUrl = createRobloxOrderUrl(orderCode);
    currentOrderData.orderCode = orderCode;
    await sendOrderEmail(`Awaiting Robux payment — ${orderCode}`);

    localStorage.setItem("zone6ixLastRobuxOrder", JSON.stringify({
      orderCode,
      products: cart.map(item => item.name),
      productIds: cart.map(item => Number(item.robuxProductId || ROBUX_PRODUCT_IDS[item.id])),
      robloxUsername: currentOrderData.robloxUsername,
      gangName: currentOrderData.gangName,
      createdAt: new Date().toISOString()
    }));

    if (window.zone6ixAuth?.refreshOrders) window.zone6ixAuth.refreshOrders().catch(() => {});
    setButtonLabel(button, "Opening Zone6ix...");
    window.location.assign(robloxOrderUrl);
  } catch (error) {
    console.error("Zone6ix payment error:", error);
    alert(`${tr("Checkout error")}: ${tr(error.message || "Unknown error")}`);
    button.disabled = false;
    updatePaymentButtonLabel();
  }
});

async function handleStripeReturn() {
  const parameters = new URLSearchParams(window.location.search);
  const paymentResult = parameters.get("payment");
  const sessionId = parameters.get("session_id");

  if (paymentResult === "success" && sessionId) {
    try {
      const headers = await getAuthenticatedHeaders();
      const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, { headers });
      const result = await response.json();
      if (!response.ok || result.paid !== true) throw new Error(result.error || "Stripe has not confirmed this payment.");
      cart = [];
      currentOrderData = null;
      saveCart();
      renderCart();
      if (window.zone6ixAuth?.refreshOrders) await window.zone6ixAuth.refreshOrders().catch(() => {});
      alert(tr(`Payment confirmed. Order ${result.orderCode || ""} is now saved in My Orders.`.trim()));
    } catch (error) {
      console.error("Payment confirmation error:", error);
      alert(tr("Stripe has not confirmed the payment yet. Do not pay again immediately. Contact Zone6ix if money was taken."));
    }
  }

  if (paymentResult === "cancelled") alert(tr("Payment was cancelled. Your items are still in the basket."));
  if (paymentResult) window.history.replaceState({}, document.title, window.location.pathname);
}

function activateReveals() {
  const revealItems = document.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = Number(entry.target.dataset.delay || 0);
        entry.target.style.setProperty("--delay", `${delay}ms`);
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: "0px 0px -40px" });

  revealItems.forEach(item => observer.observe(item));
}

function activateSpotlights() {
  document.querySelectorAll(".spotlight-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

function activateGlobalMotion() {
  const cursor = document.getElementById("cursorLight");
  const progress = document.getElementById("scrollProgress");
  const header = document.getElementById("siteHeader");

  window.addEventListener("pointermove", event => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  }, { passive: true });

  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    header.classList.toggle("scrolled", window.scrollY > 30);
  }, { passive: true });
}

document.addEventListener("zone6ix-language-change", () => {
  applySiteSettings(window.zone6ixSiteSettings || {});
  renderProducts();
  renderCart();
  updatePaymentButtonLabel();
  if (reviewModal.classList.contains("open") && currentOrderData) buildReview();
});

window.zone6ixRefreshPublicSite = async function zone6ixRefreshPublicSite() {
  await loadSiteConfig();
  renderProducts();
  renderCart();
  updatePaymentButtonLabel();
  activateSpotlights();
};

async function initialiseZone6ixShop() {
  await loadSiteConfig();
  renderProducts();
  renderCart();
  updatePaymentButtonLabel();
  activateReveals();
  activateSpotlights();
  activateGlobalMotion();
  handleStripeReturn();
}

initialiseZone6ixShop();
