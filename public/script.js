const searchInput = document.getElementById('searchInput');
const searchBtn   = document.getElementById('searchBtn');
const suggestions = document.getElementById('suggestions');
const results     = document.getElementById('results');
const productName = document.getElementById('productName');
const priceCards  = document.getElementById('priceCards');

let debounceTimer;
let isLoggedIn = false;

// Проверим авторизацию
fetch('/api/me').then(r => r.json()).then(d => { isLoggedIn = !!d.user; });

// Загрузить сетку товаров
async function loadProductsGrid() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = products.map((p, i) => {
    const colorClass = `color-${i % 6}`;
    const minPrice = p.prices && p.prices[0] ? p.prices[0].price : null;
    return `
      <div class="product-card" onclick="showPrices(${p.id}, '${escapeHtml(p.name)}', '${p.icon}')">
        <div class="product-card-img ${colorClass}">${p.icon}</div>
        <div class="product-card-body">
          <div class="product-card-name">${escapeHtml(p.name)}</div>
          <div class="product-card-price">
            От <strong>${minPrice ? formatPrice(minPrice) + ' ₸' : 'нет цен'}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

loadProductsGrid();

// Поиск при вводе
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) { suggestions.innerHTML = ''; return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 250);
});

searchBtn.addEventListener('click', () => doSearch());
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box') && !e.target.closest('.suggestions')) {
    suggestions.innerHTML = '';
  }
});

async function fetchSuggestions(q) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const items = await res.json();
  suggestions.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = `${item.icon} ${item.name}`;
    div.addEventListener('click', () => {
      searchInput.value = item.name;
      suggestions.innerHTML = '';
      showPrices(item.id, item.name, item.icon);
    });
    suggestions.appendChild(div);
  });
}

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  suggestions.innerHTML = '';

  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const items = await res.json();

  if (items.length === 0) {
    results.classList.remove('hidden');
    productName.textContent = 'Ничего не найдено';
    priceCards.innerHTML = '<p class="no-results">Попробуйте другой запрос</p>';
    return;
  }

  showPrices(items[0].id, items[0].name, items[0].icon);

  if (items.length > 1) {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = `${item.icon} ${item.name}`;
      div.addEventListener('click', () => {
        searchInput.value = item.name;
        suggestions.innerHTML = '';
        showPrices(item.id, item.name, item.icon);
      });
      suggestions.appendChild(div);
    });
  }
}

async function showPrices(id, name, icon) {
  const res = await fetch(`/api/prices/${id}`);
  const data = await res.json();

  results.classList.remove('hidden');
  productName.textContent = `${icon || ''} ${name}`;

  if (!data.prices || data.prices.length === 0) {
    priceCards.innerHTML = '<p class="no-results">Цены пока не добавлены</p>';
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const minPrice = Math.min(...data.prices.map(p => p.price));

  priceCards.innerHTML = data.prices.map(p => {
    const isBest = p.price === minPrice;
    const storeLink = p.url
      ? `<a href="${escapeHtml(p.url)}" target="_blank" class="price-card-store-link">Перейти →</a>`
      : '';
    return `
      <div class="price-card ${isBest ? 'best' : ''}">
        <div class="price-card-store">
          <span class="price-card-store-name">${escapeHtml(p.store)}</span>
          ${storeLink}
        </div>
        <div class="price-card-amount">${formatPrice(p.price)} ₸</div>
        ${isBest ? '<div class="best-label">✓ Лучшая цена</div>' : ''}
        <button class="btn-add-cart"
          onclick="addToCart(${id}, ${p.storeId}, ${p.price}, '${escapeHtml(name)}', '${escapeHtml(p.store)}', this)"
          ${!isLoggedIn ? 'title="Войдите чтобы добавить в корзину"' : ''}>
          🛒 В корзину
        </button>
      </div>
    `;
  }).join('');

  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function addToCart(productId, storeId, price, productName, storeName, btn) {
  if (!isLoggedIn) {
    window.location.href = '/login';
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';

  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, storeId, price })
  });
  const data = await res.json();

  if (!res.ok) {
    btn.textContent = data.error === 'Товар уже в корзине' ? '✓ Уже в корзине' : '⚠ Ошибка';
    btn.disabled = true;
  } else {
    btn.textContent = '✓ Добавлено!';
    btn.disabled = true;
  }
}

function formatPrice(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
