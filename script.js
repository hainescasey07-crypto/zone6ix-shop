const products = [
  {
    id: "small-turf",
    category: "turfs",
    name: "Small Turf",
    description: "A compact gang base with custom gang branding and a simple interior.",
    cash: 3.5,
    robux: 350,
    icon: "🏠",
    badge: "STARTER"
  },
  {
    id: "medium-turf",
    category: "turfs",
    name: "Medium Turf",
    description: "More room for your gang with a larger layout and extra custom details.",
    cash: 7,
    robux: 700,
    icon: "🏢",
    badge: "POPULAR"
  },
  {
    id: "large-turf",
    category: "turfs",
    name: "Large Turf",
    description: "A full-sized gang headquarters with multiple rooms and detailed branding.",
    cash: 12,
    robux: 1200,
    icon: "🏭",
    badge: "PREMIUM"
  },
  {
    id: "second-floor",
    category: "turfs",
    name: "Second Floor",
    description: "Add a second floor to a turf for extra rooms, storage or gang areas.",
    cash: 4,
    robux: 400,
    icon: "🪜",
    badge: "ADD-ON"
  },
  {
    id: "gold-uzi",
    category: "guns",
    name: "Gold Uzi",
    description: "A ready-made gold Uzi available exclusively for your gang.",
    cash: 3,
    robux: 400,
    icon: "✨",
    badge: "READY-MADE"
  },
  {
    id: "gold-draco",
    category: "guns",
    name: "Gold Draco",
    description: "A ready-made gold Draco with a premium metallic appearance.",
    cash: 4,
    robux: 500,
    icon: "⚡",
    badge: "READY-MADE"
  },
  {
    id: "custom-gun",
    category: "guns",
    name: "Fully Custom Gun",
    description: "Choose your texture, gang logo and custom 3D writing on the weapon.",
    cash: 7,
    robux: 900,
    icon: "🎨",
    badge: "FULL CUSTOM"
  },
  {
    id: "custom-name",
    category: "identity",
    name: "Custom Name",
    description: "Give your gang a custom in-game name made specifically for your group.",
    cash: 2,
    robux: 250,
    icon: "🔤",
    badge: "IDENTITY"
  },
  {
    id: "custom-emoji",
    category: "identity",
    name: "Custom Emoji",
    description: "Add a custom emoji beside your gang identity inside the game.",
    cash: 2,
    robux: 250,
    icon: "💠",
    badge: "IDENTITY"
  },
  {
    id: "custom-level",
    category: "identity",
    name: "Custom Level",
    description: "Choose a custom level display for your gang members.",
    cash: 2,
    robux: 250,
    icon: "🏆",
    badge: "IDENTITY"
  },
  {
    id: "identity-bundle",
    category: "identity",
    name: "Identity Bundle",
    description: "Custom gang name, emoji and level together for a lower bundle price.",
    cash: 5,
    robux: 600,
    icon: "👑",
    badge: "BEST VALUE"
  }
];

let cart = JSON.parse(localStorage.getItem("zone6ixCart") || "[]");

const turfProducts = document.getElementById("turfProducts");
const gunProducts = document.getElementById("gunProducts");
const identityProducts = document.getElementById("identityProducts");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const overlay = document.getElementById("overlay");
const reviewModal = document.getElementById("reviewModal");

function productCard(product) {
  return `
    <article class="product-card">
      <div class="product-visual">${product.icon}</div>
      <span class="product-badge">${product.badge}</span>
      <h3>${product.name}</h3>
      <p>${product.description}</p>

      <div class="price-row">
        <div>
          <span>Card price</span>
          <strong>£${product.cash.toFixed(2)}</strong>
        </div>

        <div>
          <span>Robux price</span>
          <strong>${product.robux.toLocaleString()} R$</strong>
        </div>
      </div>

      <button class="add-button" data-product-id="${product.id}">
        Add to basket
      </button>
    </article>
  `;
}

function renderProducts() {
  turfProducts.innerHTML = products
    .filter(product => product.category === "turfs")
    .map(productCard)
    .join("");

  gunProducts.innerHTML = products
    .filter(product => product.category === "guns")
    .map(productCard)
    .join("");

  identityProducts.innerHTML = products
    .filter(product => product.category === "identity")
    .map(productCard)
    .join("");

  document.querySelectorAll("[data-product-id]").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.productId);
    });
  });
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);

  if (!product) {
    return;
  }

  cart.push(product);
  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem("zone6ixCart", JSON.stringify(cart));
}

function renderCart() {
  const count = cart.length;
  const cashTotal = cart.reduce((total, item) => total + item.cash, 0);
  const robuxTotal = cart.reduce((total, item) => total + item.robux, 0);

  document.getElementById("cartCount").textContent = count;
  document.getElementById("cashTotal").textContent = `£${cashTotal.toFixed(2)}`;
  document.getElementById("robuxTotal").textContent =
    `${robuxTotal.toLocaleString()} R$`;

  cartEmpty.style.display = count === 0 ? "grid" : "none";

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div>
        <h4>${item.name}</h4>
        <p>£${item.cash.toFixed(2)} or ${item.robux.toLocaleString()} R$</p>
      </div>

      <button class="remove-item" data-remove-index="${index}">
        Remove
      </button>
    </div>
  `).join("");

  document.querySelectorAll("[data-remove-index]").forEach(button => {
    button.addEventListener("click", () => {
      removeFromCart(Number(button.dataset.removeIndex));
    });
  });
}

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("visible");
}

function closeEverything() {
  cartPanel.classList.remove("open");
  reviewModal.classList.remove("open");
  overlay.classList.remove("visible");
}

function buildReview() {
  const paymentMethod = document.getElementById("paymentMethod").value;
  const cashTotal = cart.reduce((total, item) => total + item.cash, 0);
  const robuxTotal = cart.reduce((total, item) => total + item.robux, 0);

  const selectedTotal = paymentMethod === "cash"
    ? `£${cashTotal.toFixed(2)}`
    : `${robuxTotal.toLocaleString()} R$`;

  document.getElementById("reviewContent").innerHTML = `
    <div class="review-list">
      <div class="review-line">
        <span>Roblox username</span>
        <strong>${escapeHtml(document.getElementById("robloxUsername").value)}</strong>
      </div>

      <div class="review-line">
        <span>Gang name</span>
        <strong>${escapeHtml(document.getElementById("gangName").value)}</strong>
      </div>

      <div class="review-line">
        <span>Discord</span>
        <strong>${escapeHtml(document.getElementById("discordUsername").value)}</strong>
      </div>

      <div class="review-line">
        <span>Payment choice</span>
        <strong>${paymentMethod === "cash" ? "Card / cash" : "Robux"}</strong>
      </div>

      <div class="review-line">
        <span>Products</span>
        <strong>${cart.map(item => item.name).join(", ")}</strong>
      </div>

      <div class="review-line">
        <span>Total</span>
        <strong>${selectedTotal}</strong>
      </div>

      <div class="review-line">
        <span>Request</span>
        <strong>${escapeHtml(document.getElementById("customRequest").value)}</strong>
      </div>
    </div>
  `;

  closeEverything();
  reviewModal.classList.add("open");
  overlay.classList.add("visible");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

document.getElementById("openCartButton").addEventListener("click", openCart);
document.getElementById("closeCartButton").addEventListener("click", closeEverything);
document.getElementById("closeModalButton").addEventListener("click", closeEverything);
document.getElementById("overlay").addEventListener("click", closeEverything);

document.getElementById("continueButton").addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Add at least one item to your basket first.");
    return;
  }

  closeEverything();
  document.getElementById("order").scrollIntoView();
});

document.querySelectorAll("[data-scroll-order]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById("turfs").scrollIntoView();
  });
});

document.getElementById("orderForm").addEventListener("submit", event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert("Your basket is empty. Add at least one product first.");
    return;
  }

  buildReview();
});

document.getElementById("paymentButton").addEventListener("click", () => {
  alert(
    "The website design is working. We will connect Stripe and Robux payment links next."
  );
});

renderProducts();
renderCart();
