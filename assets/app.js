import { PRODUCTS } from "./data.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const money = (amount, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);

const getCart = () => {
  try { return JSON.parse(localStorage.getItem("mwc_cart") || "[]"); }
  catch { return []; }
};

const setCart = (items) => localStorage.setItem("mwc_cart", JSON.stringify(items));
const cartCount = () => getCart().reduce((sum, it) => sum + it.qty, 0);

const updateCartBadge = () => {
  const badge = $("#cartBadge");
  if (badge) badge.textContent = cartCount();
};

const addToCart = (id, qty = 1) => {
  const cart = getCart();
  const found = cart.find((x) => x.id === id);
  if (found) found.qty += qty;
  else cart.push({ id, qty });
  setCart(cart);
  updateCartBadge();
};

const updateQty = (id, qty) => {
  const cart = getCart();
  const found = cart.find((x) => x.id === id);
  if (!found) return;
  found.qty = Math.max(1, qty);
  setCart(cart);
  updateCartBadge();
};

const removeFromCart = (id) => {
  setCart(getCart().filter((x) => x.id !== id));
  updateCartBadge();
};

const clearCart = () => {
  setCart([]);
  updateCartBadge();
};

const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

function productCard(p) {
  const tag = p.tags?.[0] ? `<span class="tag">${p.tags[0]}</span>` : "";
  return `
    <a class="card product-card" href="product.html?id=${encodeURIComponent(p.id)}">
      <div class="product-media">${tag}</div>
      <div class="product-body">
        <h4>${p.name}</h4>
        <p>${p.short}</p>
        <div class="meta">
          <span class="price">${money(p.price, p.currency)}</span>
          <span class="small">${p.category}</span>
        </div>
      </div>
    </a>
  `;
}

function initHome() {
  const grid = $("#featuredGrid");
  if (!grid) return;

  // Always show exactly 3 products
  let featured = PRODUCTS.filter(p => p.featured);

  if (featured.length < 3) {
    const fillers = PRODUCTS.filter(p => !featured.includes(p));
    featured = [...featured, ...fillers].slice(0, 3);
  }

  if (featured.length > 3) {
    featured = featured.slice(0, 3);
  }

  grid.innerHTML = featured.map(productCard).join("");
}
function initCatalog() {
  const grid = $("#catalogGrid");
  if (!grid) return;

  const search = $("#searchInput");
  const category = $("#categorySelect");
  const sort = $("#sortSelect");

  const categories = ["All", ...new Set(PRODUCTS.map(p => p.category))];
  category.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");

  const apply = () => {
    const q = (search.value || "").toLowerCase();
    const c = category.value;

    let list = PRODUCTS.slice();
    if (c !== "All") list = list.filter(p => p.category === c);

    if (q) {
      list = list.filter(p => {
        const hay = `${p.name} ${p.short} ${p.description} ${p.category}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const s = sort.value;
    if (s === "price-asc") list.sort((a,b)=>a.price-b.price);
    if (s === "price-desc") list.sort((a,b)=>b.price-a.price);
    if (s === "name-asc") list.sort((a,b)=>a.name.localeCompare(b.name));
    if (s === "name-desc") list.sort((a,b)=>b.name.localeCompare(a.name));

    $("#resultCount").textContent = `${list.length} item(s)`;
    grid.innerHTML = list.map(productCard).join("");
  };

  [search, category, sort].forEach(el => el.addEventListener("input", apply));
  apply();
}

function initProduct() {
  const host = $("#productHost");
  if (!host) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const p = findProduct(id);

  if (!p) {
    host.innerHTML = `<div class="card panel">Product not found.</div>`;
    return;
  }

  host.innerHTML = `
    <div class="card panel">
      <h2 style="font-family:var(--font-heading); margin:0 0 10px;">${p.name}</h2>
      <p style="margin:0 0 14px; color:var(--muted);">${p.description}</p>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${money(p.price, p.currency)}</strong>
        <button class="btn primary" id="addBtn">Add to cart</button>
      </div>
    </div>
  `;

  $("#addBtn").addEventListener("click", () => {
    addToCart(p.id, 1);
    alert(`Added 1 × ${p.name}`);
  });
}

function initCart() {
  const host = $("#cartHost");
  if (!host) return;

  const cart = getCart();
  if (!cart.length) {
    host.innerHTML = `<div class="card panel"><h2>Your cart is empty</h2></div>`;
    return;
  }

  const lines = cart.map(it => {
    const p = findProduct(it.id);
    return { ...it, p, total: (p?.price || 0) * it.qty };
  });

  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  host.innerHTML = `
    <div class="card panel">
      <h2 style="margin:0 0 12px;">Cart</h2>
      ${lines.map(l => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--line);">
          <div>
            <strong>${l.p.name}</strong><br/>
            <small style="color:var(--muted)">${money(l.p.price)} × ${l.qty}</small>
          </div>
          <div>
            <button class="pill" data-dec="${l.p.id}">−</button>
            <button class="pill" data-inc="${l.p.id}">+</button>
            <button class="pill" data-rm="${l.p.id}">Remove</button>
          </div>
        </div>
      `).join("")}
      <div style="display:flex; justify-content:space-between; padding-top:14px;">
        <strong>Subtotal</strong>
        <strong>${money(subtotal)}</strong>
      </div>
      <div style="margin-top:14px; display:flex; gap:10px;">
        <button class="pill" id="clearBtn">Clear</button>
        <button class="btn primary" style="flex:1;">Checkout (placeholder)</button>
      </div>
    </div>
  `;

  $$("[data-inc]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-inc");
    const item = getCart().find(x => x.id === id);
    updateQty(id, (item?.qty || 1) + 1);
    location.reload();
  }));

  $$("[data-dec]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-dec");
    const item = getCart().find(x => x.id === id);
    updateQty(id, Math.max(1, (item?.qty || 1) - 1));
    location.reload();
  }));

  $$("[data-rm]").forEach(btn => btn.addEventListener("click", () => {
    removeFromCart(btn.getAttribute("data-rm"));
    location.reload();
  }));

  $("#clearBtn").addEventListener("click", () => {
    clearCart();
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  initHome();
  initCatalog();
  initProduct();
  initCart();
});
