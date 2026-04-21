const cabinetState = {
  cabinet: null,
  products: [],
  subscription: null
};

const cabinetDom = {
  logoutBtn: document.getElementById('logoutBtn'),
  profileAvatar: document.getElementById('profileAvatar'),
  profileName: document.getElementById('profileName'),
  profileEmail: document.getElementById('profileEmail'),
  profileDate: document.getElementById('profileDate'),
  statsGrid: document.getElementById('statsGrid'),
  cartSummary: document.getElementById('cartSummary'),
  cartList: document.getElementById('cartList'),
  searchHistory: document.getElementById('searchHistory'),
  recommendationsGrid: document.getElementById('recommendationsGrid'),
  clearCartBtn: document.getElementById('clearCartBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  toastStack: document.getElementById('toastStack')
};

initCabinet();

async function initCabinet() {
  bindCabinetEvents();
  cabinetDom.cartList.innerHTML = createLoadingState();
  cabinetDom.searchHistory.innerHTML = createLoadingState();
  cabinetDom.recommendationsGrid.innerHTML = createMiniSkeletons();

  try {
    const [cabinet, products, subscription] = await Promise.all([
      fetchJson('/api/cabinet'),
      fetchJson('/api/products'),
      fetchJson('/api/my-subscription').catch(() => null)
    ]);

    cabinetState.cabinet = cabinet;
    cabinetState.products = products;
    cabinetState.subscription = subscription;

    renderCabinet();
    renderSubscriptionInfo(subscription);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = `/login?redirect=${encodeURIComponent('/cabinet')}`;
      return;
    }

    cabinetDom.cartList.innerHTML = createEmptyState('Кабинет не загрузился', error.message);
    cabinetDom.searchHistory.innerHTML = '';
    cabinetDom.recommendationsGrid.innerHTML = '';
  }
}

function bindCabinetEvents() {
  cabinetDom.logoutBtn.addEventListener('click', logout);
  cabinetDom.clearCartBtn.addEventListener('click', clearCart);
  cabinetDom.clearHistoryBtn.addEventListener('click', clearHistory);
  cabinetDom.cartList.addEventListener('click', handleCartClick);
}

function renderCabinet() {
  const { user, stats } = cabinetState.cabinet;

  cabinetDom.profileAvatar.textContent = String(user.name || '?').charAt(0).toUpperCase();
  cabinetDom.profileName.textContent = user.name;
  cabinetDom.profileEmail.textContent = user.email;
  cabinetDom.profileDate.textContent = `Дата регистрации: ${new Date(user.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}`;

  const cards = [
    { label: 'Поисков', value: stats.searches },
    { label: 'Товаров в корзине', value: stats.cartItems },
    { label: 'Товаров в каталоге', value: stats.products },
    { label: 'Экономия в корзине', value: `${formatPrice(stats.cartSavings)} ₸` }
  ];

  cabinetDom.statsGrid.innerHTML = cards
    .map((item) => `
      <article class="stat-card">
        <strong>${escapeHtml(String(item.value))}</strong>
        <span>${escapeHtml(item.label)}</span>
      </article>
    `)
    .join('');

  renderCart();
  renderHistory();
  renderRecommendations();
}

function renderCart() {
  const items = cabinetState.cabinet.cart;
  const stats = cabinetState.cabinet.stats;

  const checkoutLink = document.getElementById('checkoutLink');

  if (!items.length) {
    cabinetDom.cartSummary.classList.add('hidden');
    if (checkoutLink) checkoutLink.style.display = 'none';
    cabinetDom.cartList.innerHTML = createEmptyState(
      'Корзина пустая',
      'Выберите товары в каталоге и сохраните лучшие офферы сюда.'
    );
    return;
  }

  if (checkoutLink) checkoutLink.style.display = '';

  cabinetDom.cartSummary.classList.remove('hidden');
  cabinetDom.cartSummary.innerHTML = `
    <div>
      <strong>Итого: ${formatPrice(stats.cartTotal)} ₸</strong>
      <span>Экономия: ${formatPrice(stats.cartSavings)} ₸</span>
    </div>
    <div class="summary-banner__actions">
      <a class="btn btn-primary" href="/delivery">Оформить заказ →</a>
      <a class="btn btn-secondary" href="/#catalog">Продолжить покупки</a>
    </div>
  `;

  cabinetDom.cartList.innerHTML = items
    .map((item) => `
      <article class="list-card">
        ${renderCabinetProductMedia(item.product, 'cart')}
        <div class="list-card__body">
          <strong>${escapeHtml(item.product.name)}</strong>
          <p>${escapeHtml(item.store.name)} · ${escapeHtml(item.product.category)}</p>
        </div>
        <div class="list-card__side">
          <strong>${formatPrice(item.price)} ₸</strong>
          <button class="btn btn-ghost" type="button" data-remove-cart="${item.id}">Удалить</button>
        </div>
      </article>
    `)
    .join('');
}

function renderHistory() {
  const searches = cabinetState.cabinet.searches;

  if (!searches.length) {
    cabinetDom.searchHistory.innerHTML = createEmptyState(
      'История поиска пока пустая',
      'Сделайте поиск в каталоге, и запрос появится здесь.'
    );
    return;
  }

  cabinetDom.searchHistory.innerHTML = searches
    .map((item) => `
      <a class="history-link" href="/?q=${encodeURIComponent(item.query)}#catalog">
        <strong>${escapeHtml(item.query)}</strong>
        <span>${new Date(item.createdAt).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </a>
    `)
    .join('');
}

function renderRecommendations() {
  const products = [...cabinetState.products]
    .filter((product) => Number.isFinite(product.minPrice))
    .sort((a, b) => b.savings - a.savings || (a.minPrice ?? 0) - (b.minPrice ?? 0))
    .slice(0, 4);

  if (!products.length) {
    cabinetDom.recommendationsGrid.innerHTML = createEmptyState(
      'Рекомендации недоступны',
      'Когда в каталоге будет больше цен, здесь появятся лучшие варианты.'
    );
    return;
  }

  cabinetDom.recommendationsGrid.innerHTML = products
    .map((product) => `
      <article class="mini-product-card">
        ${renderCabinetProductMedia(product, 'mini')}
        <div>
          <span class="tag">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>От ${formatPrice(product.minPrice)} ₸</p>
        </div>
        <a class="btn btn-secondary" href="/?q=${encodeURIComponent(product.name)}#catalog">Открыть</a>
      </article>
    `)
    .join('');
}

async function handleCartClick(event) {
  const button = event.target.closest('[data-remove-cart]');
  if (!button) return;

  const id = Number(button.dataset.removeCart);

  try {
    await fetchJson(`/api/cart/${id}`, { method: 'DELETE' });
    cabinetState.cabinet.cart = cabinetState.cabinet.cart.filter((item) => item.id !== id);
    recalculateCartStats();
    renderCabinet();
    showToast('Товар удален из корзины.', 'info');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function clearCart() {
  if (!cabinetState.cabinet?.cart.length) {
    showToast('Корзина уже пустая.', 'info');
    return;
  }

  try {
    await fetchJson('/api/cart', { method: 'DELETE' });
    cabinetState.cabinet.cart = [];
    recalculateCartStats();
    renderCabinet();
    showToast('Корзина очищена.', 'info');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function clearHistory() {
  if (!cabinetState.cabinet?.searches.length) {
    showToast('История уже пустая.', 'info');
    return;
  }

  try {
    await fetchJson('/api/my-searches', { method: 'DELETE' });
    cabinetState.cabinet.searches = [];
    cabinetState.cabinet.stats.searches = 0;
    renderCabinet();
    showToast('История поиска очищена.', 'info');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderSubscriptionInfo(sub) {
  const badge = document.getElementById('profileSubBadge');
  const cta = document.getElementById('premiumCta');

  if (sub?.status === 'active') {
    const planNames = { premium: 'Premium ⭐', business: 'Business 🚀' };
    const planName = planNames[sub.plan] || sub.plan;
    const expires = new Date(sub.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    if (badge) {
      badge.textContent = planName;
      badge.style.background = sub.plan === 'business'
        ? 'linear-gradient(135deg,#0f766e,#14b8a6)'
        : 'linear-gradient(135deg,#7c3aed,#a855f7)';
      badge.style.color = '#fff';
      badge.style.border = 'none';
    }
    if (cta) cta.classList.add('hidden');
  } else {
    if (cta) cta.classList.remove('hidden');
  }
}

async function logout() {
  await fetchJson('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

function recalculateCartStats() {
  const productMap = new Map(cabinetState.products.map((product) => [product.id, product]));
  const cart = cabinetState.cabinet.cart;

  cabinetState.cabinet.stats.cartItems = cart.length;
  cabinetState.cabinet.stats.cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  cabinetState.cabinet.stats.cartSavings = cart.reduce((sum, item) => {
    const product = productMap.get(item.product.id);
    if (!product || !Number.isFinite(product.maxPrice)) return sum;
    return sum + Math.max(product.maxPrice - item.price, 0);
  }, 0);
}

function createLoadingState() {
  return '<div class="muted-text">Загрузка...</div>';
}

function createMiniSkeletons() {
  return Array.from({ length: 4 })
    .map(() => '<article class="mini-product-card skeleton-block"></article>')
    .join('');
}

function renderCabinetProductMedia(product, type) {
  const icon = escapeHtml(product.icon || '📦');

  if (type === 'cart') {
    return `
      <div class="list-card__icon">
        ${icon}
      </div>
    `;
  }

  return `
    <div class="mini-product-card__icon">
      ${icon}
    </div>
  `;
}

function createEmptyState(title, text) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function pluralize(value, words) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return words[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return words[1];
  return words[2];
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function showToast(message, tone = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  cabinetDom.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 240);
  }, 2400);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Произошла ошибка.');
    error.status = response.status;
    throw error;
  }

  return payload;
}
