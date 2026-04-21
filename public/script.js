const SELECTION_STORAGE_KEY = 'smartprice-selection-v2';
const FAVORITES_STORAGE_KEY = 'smartprice-favorites-v1';
const SEARCH_HISTORY_KEY = 'smartprice-search-history-v1';

const page = document.body.classList.contains('page-favorites') ? 'favorites' : 'home';

let priceChartInstance = null;

const state = {
  user: null,
  home: null,
  products: [],
  stores: [],
  storeRatings: [],
  searchResults: [],
  searchSubmitted: false,
  selectedIds: loadStoredIds(SELECTION_STORAGE_KEY),
  favoriteIds: loadStoredIds(FAVORITES_STORAGE_KEY),
  sponsoredSet: new Set(),
  visibleCount: 24,
  pageSize: 24,
  filters: {
    query: '',
    category: 'all',
    stores: [],
    minPrice: '',
    maxPrice: '',
    sort: 'popular'
  }
};

const dom = {
  navAuth: document.getElementById('navAuth'),
  heroStats: document.getElementById('heroStats'),
  featuredGrid: document.getElementById('featuredGrid'),
  catalogMeta: document.getElementById('catalogMeta'),
  resultCount: document.getElementById('resultCount'),
  categoryChips: document.getElementById('categoryChips'),
  storeFilters: document.getElementById('storeFilters'),
  activeFilters: document.getElementById('activeFilters'),
  catalogInsights: document.getElementById('catalogInsights'),
  catalogGrid: document.getElementById('catalogGrid'),
  catalogFooter: document.getElementById('catalogFooter'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  heroSearchInput: document.getElementById('heroSearchInput'),
  catalogSearchInput: document.getElementById('catalogSearchInput'),
  heroSearchBtn: document.getElementById('heroSearchBtn'),
  heroSuggestions: document.getElementById('heroSuggestions'),
  minPriceInput: document.getElementById('minPriceInput'),
  maxPriceInput: document.getElementById('maxPriceInput'),
  sortSelect: document.getElementById('sortSelect'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  selectionDock: document.getElementById('selectionDock'),
  selectionTitle: document.getElementById('selectionTitle'),
  selectionItems: document.getElementById('selectionItems'),
  clearSelectionBtn: document.getElementById('clearSelectionBtn'),
  productModal: document.getElementById('productModal'),
  modalContent: document.getElementById('modalContent'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  toastStack: document.getElementById('toastStack'),
  showSelectionBtn: document.getElementById('showSelectionBtn'),
  scrollToSelectionBtn: document.getElementById('scrollToSelectionBtn'),
  favoritesGrid: document.getElementById('favoritesGrid'),
  favoritesCountValue: document.getElementById('favoritesCountValue'),
  favoritesStatus: document.getElementById('favoritesStatus'),
  favoriteCounters: Array.from(document.querySelectorAll('[data-favorites-count]'))
};

init();

async function init() {
  bindEvents();
  renderSkeletons();
  renderFavoriteBadges();

  try {
    const [meResult, homeResult, productsResult, storesResult, sponsoredResult] = await Promise.allSettled([
      fetchJson('/api/me'),
      fetchJson('/api/home'),
      fetchJson('/api/products'),
      fetchJson('/api/stores'),
      fetchJson('/api/sponsored-products')
    ]);

    if (productsResult.status !== 'fulfilled') {
      throw new Error('Не удалось загрузить каталог.');
    }

    state.user = meResult.status === 'fulfilled' ? meResult.value.user : null;
    state.products = Array.isArray(productsResult.value) ? productsResult.value : [];
    state.stores = storesResult.status === 'fulfilled' && Array.isArray(storesResult.value)
      ? storesResult.value
      : [];
    state.home = homeResult.status === 'fulfilled'
      ? homeResult.value
      : buildHomeFallback(state.products, state.stores.length);

    if (sponsoredResult.status === 'fulfilled' && Array.isArray(sponsoredResult.value)) {
      state.sponsoredSet = new Set(sponsoredResult.value.map(s => s.productId));
    }

    normalizeStoredLists();
    loadStoreRatings();
    renderNavAuth();
    renderFavoriteBadges();

    if (page === 'home') {
      renderHeroStats();
      renderFeatured();
      renderCategoryChips();
      renderStoreFilters();

      const initialQuery = new URLSearchParams(window.location.search).get('q');
      if (initialQuery) {
        syncQueryInputs(initialQuery);
        state.filters.query = initialQuery;
        await runSearch(initialQuery, false);
      } else {
        renderCatalog();
      }

      renderSelectionDock();
    } else {
      renderFavoritesPage();
    }
  } catch (error) {
    showFatalState(error.message);
  }
}

function bindEvents() {
  if (dom.heroSearchInput) {
    dom.heroSearchInput.addEventListener('input', (event) => {
      updateQuery(event.target.value, 'hero');
      renderSuggestions();
    });

    dom.heroSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch(dom.heroSearchInput.value.trim());
      }
    });
  }

  if (dom.catalogSearchInput) {
    dom.catalogSearchInput.addEventListener('input', (event) => {
      updateQuery(event.target.value, 'catalog');
    });

    dom.catalogSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch(dom.catalogSearchInput.value.trim());
      }
    });
  }

  if (dom.heroSearchBtn) {
    dom.heroSearchBtn.addEventListener('click', () => {
      runSearch(dom.heroSearchInput ? dom.heroSearchInput.value.trim() : '');
    });
  }

  if (dom.minPriceInput) {
    dom.minPriceInput.addEventListener('input', (event) => {
      state.filters.minPrice = event.target.value;
      renderCatalog();
    });
  }

  if (dom.maxPriceInput) {
    dom.maxPriceInput.addEventListener('input', (event) => {
      state.filters.maxPrice = event.target.value;
      renderCatalog();
    });
  }

  if (dom.sortSelect) {
    dom.sortSelect.addEventListener('change', (event) => {
      state.filters.sort = event.target.value;
      renderCatalog();
    });
  }

  if (dom.resetFiltersBtn) {
    dom.resetFiltersBtn.addEventListener('click', resetFilters);
  }

  if (dom.loadMoreBtn) {
    dom.loadMoreBtn.addEventListener('click', () => {
      state.visibleCount += state.pageSize;
      renderCatalog();
    });
  }

  if (dom.clearSelectionBtn) {
    dom.clearSelectionBtn.addEventListener('click', clearSelection);
  }

  if (dom.closeModalBtn) {
    dom.closeModalBtn.addEventListener('click', closeModal);
  }

  if (dom.showSelectionBtn) {
    dom.showSelectionBtn.addEventListener('click', scrollToSelection);
  }

  if (dom.scrollToSelectionBtn) {
    dom.scrollToSelectionBtn.addEventListener('click', scrollToSelection);
  }

  if (dom.catalogGrid) {
    dom.catalogGrid.addEventListener('click', handleCatalogClick);
  }

  if (dom.featuredGrid) {
    dom.featuredGrid.addEventListener('click', handleCatalogClick);
  }

  if (dom.selectionItems) {
    dom.selectionItems.addEventListener('click', handleSelectionClick);
  }

  if (dom.activeFilters) {
    dom.activeFilters.addEventListener('click', handleActiveFilterClick);
  }

  if (dom.productModal) {
    dom.productModal.addEventListener('click', handleModalClick);
  }

  if (dom.favoritesGrid) {
    dom.favoritesGrid.addEventListener('click', handleCatalogClick);
  }

  document.addEventListener('click', (event) => {
    if (!dom.heroSuggestions) return;

    if (!event.target.closest('.hero-search') && !event.target.closest('.suggestion-item')) {
      dom.heroSuggestions.innerHTML = '';
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
}

function renderSkeletons() {
  if (dom.heroStats) {
    dom.heroStats.innerHTML = `
      <div class="stat-card skeleton-block"></div>
      <div class="stat-card skeleton-block"></div>
      <div class="stat-card skeleton-block"></div>
      <div class="stat-card skeleton-block"></div>
    `;
  }

  if (dom.featuredGrid) {
    dom.featuredGrid.innerHTML = Array.from({ length: 3 })
      .map(() => '<article class="featured-card skeleton-block"></article>')
      .join('');
  }

  const skeletonCards = Array.from({ length: 6 })
    .map(() => `
      <article class="product-card skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-short"></div>
        <div class="skeleton-actions"></div>
      </article>
    `)
    .join('');

  if (dom.catalogGrid) {
    dom.catalogGrid.innerHTML = skeletonCards;
  }

  if (dom.favoritesGrid) {
    dom.favoritesGrid.innerHTML = skeletonCards;
  }
}

function renderNavAuth() {
  if (!dom.navAuth) return;

  if (!state.user) {
    dom.navAuth.innerHTML = `
      <a href="/login" class="btn btn-ghost">Вход</a>
      <a href="/register" class="btn btn-primary">Регистрация</a>
    `;
    return;
  }

  const name = escapeHtml(firstWord(state.user.name));
  const initial = escapeHtml(String(state.user.name || '?').charAt(0).toUpperCase());

  dom.navAuth.innerHTML = `
    <a href="/cabinet" class="profile-chip">
      <span class="profile-chip__avatar">${initial}</span>
      <span>${name}</span>
    </a>
  `;
}

function renderFavoriteBadges() {
  const count = state.favoriteIds.length;

  dom.favoriteCounters.forEach((element) => {
    element.textContent = String(count);
    element.classList.toggle('is-empty', count === 0);
  });

  if (dom.favoritesCountValue) {
    dom.favoritesCountValue.textContent = String(count);
  }

  if (dom.favoritesStatus) {
    dom.favoritesStatus.textContent = count
      ? `${count} ${pluralize(count, ['товар', 'товара', 'товаров'])} сохранено`
      : 'Нет избранных товаров';
  }
}

function renderHeroStats() {
  if (!dom.heroStats) return;

  const fallback = buildHomeFallback(state.products, state.stores.length);
  const totals = state.home && state.home.totals ? state.home.totals : fallback.totals;
  const stats = [
    { label: 'Товаров', value: totals.products },
    { label: 'Магазинов', value: totals.stores },
    { label: 'С выгодой', value: totals.deals },
    { label: 'Макс. экономия', value: `${formatPrice(totals.biggestSaving)} ₸` }
  ];

  dom.heroStats.innerHTML = stats
    .map((item, index) => `
      <article class="stat-card reveal-up" style="animation-delay:${index * 80}ms">
        <strong>${escapeHtml(String(item.value))}</strong>
        <span>${escapeHtml(item.label)}</span>
      </article>
    `)
    .join('');
}

function renderFeatured() {
  if (!dom.featuredGrid) return;

  const featured = Array.isArray(state.home && state.home.featured) ? state.home.featured : [];

  if (!featured.length) {
    dom.featuredGrid.innerHTML = createEmptyState(
      'Нет данных для витрины',
      'Как только в каталоге появятся товары с ценами, здесь появятся лучшие предложения.'
    );
    return;
  }

  dom.featuredGrid.innerHTML = featured
    .slice(0, 6)
    .map((product, index) => {
      const priceLabel = getPriceLabel(product.minPrice);
      return `
        <article class="featured-card reveal-up" style="animation-delay:${index * 70}ms">
          <div class="featured-card__top">
            ${renderProductMedia(product, 'featured')}
            ${renderFavoriteButton(product.id, 'featured-card__favorite')}
          </div>
          <div class="featured-card__content">
            <span class="tag">${escapeHtml(product.category || 'Каталог')}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description || 'Описание скоро появится.')}</p>
          </div>
          <div class="featured-card__footer">
            <div class="featured-card__price">
              <span class="featured-card__price-label">Цена от</span>
              <strong>${escapeHtml(priceLabel)}</strong>
            </div>
            <button class="btn btn-secondary" type="button" data-action="details" data-product-id="${product.id}">
              Подробнее
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderCategoryChips() {
  if (!dom.categoryChips) return;

  const counts = state.products.reduce((acc, product) => {
    const key = product.category || 'Без категории';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const categories = Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
    .map(([name, count]) => ({
      value: name,
      label: `${name} (${count})`
    }));

  const items = [
    { value: 'all', label: `Все категории (${state.products.length})` },
    ...categories
  ];

  dom.categoryChips.innerHTML = items
    .map(({ value, label }) => `
      <button
        class="filter-chip ${state.filters.category === value ? 'is-active' : ''}"
        type="button"
        data-category-chip="${escapeAttr(value)}"
      >
        ${escapeHtml(label)}
      </button>
    `)
    .join('');

  dom.categoryChips.querySelectorAll('[data-category-chip]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filters.category = button.dataset.categoryChip;
      state.visibleCount = state.pageSize;
      renderCategoryChips();
      renderCatalog();
    });
  });
}

function renderStoreFilters() {
  if (!dom.storeFilters) return;

  dom.storeFilters.innerHTML = state.stores
    .map((store) => `
      <label class="check-item">
        <input type="checkbox" value="${store.id}" ${state.filters.stores.includes(store.id) ? 'checked' : ''}>
        <span>${escapeHtml(store.name)}</span>
      </label>
    `)
    .join('');

  dom.storeFilters.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.filters.stores = Array.from(dom.storeFilters.querySelectorAll('input:checked'))
        .map((element) => Number(element.value));
      state.visibleCount = state.pageSize;
      renderCatalog();
    });
  });
}

function updateQuery(value, source) {
  const normalized = value.trimStart();
  state.filters.query = normalized;
  syncQueryInputs(normalized, source);

  if (!normalized.trim()) {
    state.searchSubmitted = false;
    state.searchResults = [];
    setUrlQuery('');
  }

  state.visibleCount = state.pageSize;
  renderCatalog();
}

function syncQueryInputs(value, source) {
  if (dom.heroSearchInput && source !== 'hero') dom.heroSearchInput.value = value;
  if (dom.catalogSearchInput && source !== 'catalog') dom.catalogSearchInput.value = value;
}

async function runSearch(query, scroll = true) {
  if (page !== 'home') return;

  const normalized = query.trim();
  state.filters.query = normalized;
  syncQueryInputs(normalized);

  if (dom.heroSuggestions) {
    dom.heroSuggestions.innerHTML = '';
  }

  if (!normalized) {
    state.searchSubmitted = false;
    state.searchResults = [];
    renderCatalog();
    return;
  }

  if (dom.catalogMeta) {
    dom.catalogMeta.textContent = `Ищем по запросу "${normalized}"...`;
  }

  setUrlQuery(normalized);

  try {
    const results = await fetchJson(`/api/search?q=${encodeURIComponent(normalized)}`);
    state.searchSubmitted = true;
    state.searchResults = Array.isArray(results) ? results : [];
    state.visibleCount = state.pageSize;
    renderCatalog();

    if (scroll) {
      const catalogSection = document.getElementById('catalog');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch (error) {
    showToast(error.message, 'error');
    renderCatalog();
  }
}

function renderSuggestions() {
  if (!dom.heroSuggestions) return;

  const query = state.filters.query.trim().toLowerCase();

  if (!query) {
    dom.heroSuggestions.innerHTML = '';
    return;
  }

  const matchedProducts = state.products
    .filter((product) => String(product.name || '').toLowerCase().includes(query))
    .slice(0, 8);

  const matchedCategories = [...new Set(
    state.products
      .filter((product) => String(product.category || '').toLowerCase().includes(query))
      .map((product) => product.category)
  )].slice(0, 4);

  const popularQueries = getPopularQueries(query).slice(0, 4);

  let html = '';

  if (matchedProducts.length > 0) {
    html += '<div class="suggestions-group">';
    html += '<div class="suggestions-group__label">Товары</div>';
    html += matchedProducts
      .map((product) => `
        <button class="suggestion-item" type="button" data-suggestion="${escapeAttr(product.name)}">
          <span class="suggestion-item__icon">${escapeHtml(product.icon || '📦')}</span>
          <div class="suggestion-item__content">
            <span class="suggestion-item__title">${escapeHtml(product.name)}</span>
            <span class="suggestion-item__meta">${escapeHtml(product.category || 'Каталог')}</span>
          </div>
        </button>
      `)
      .join('');
    html += '</div>';
  }

  if (matchedCategories.length > 0) {
    html += '<div class="suggestions-group">';
    html += '<div class="suggestions-group__label">Категории</div>';
    html += matchedCategories
      .map((category) => {
        const count = state.products.filter((p) => p.category === category).length;
        return `
          <button class="suggestion-item" type="button" data-suggestion="${escapeAttr(category)}">
            <span class="suggestion-item__icon">🏷️</span>
            <div class="suggestion-item__content">
              <span class="suggestion-item__title">${escapeHtml(category)}</span>
              <span class="suggestion-item__meta">${count} ${pluralize(count, ['товар', 'товара', 'товаров'])}</span>
            </div>
          </button>
        `;
      })
      .join('');
    html += '</div>';
  }

  if (popularQueries.length > 0 && matchedProducts.length === 0 && matchedCategories.length === 0) {
    html += '<div class="suggestions-group suggestions-group--popular">';
    html += '<div class="suggestions-group__label">Популярные запросы</div>';
    html += popularQueries
      .map((q) => `
        <button class="suggestion-item" type="button" data-suggestion="${escapeAttr(q)}">
          <span class="suggestion-item__icon">⭐</span>
          <div class="suggestion-item__content">
            <span class="suggestion-item__title">${escapeHtml(q)}</span>
          </div>
        </button>
      `)
      .join('');
    html += '</div>';
  }

  if (!html) {
    html = `
      <div class="suggestions-empty">
        <p>Ничего не найдено по запросу "${escapeHtml(query)}"</p>
      </div>
    `;
  }

  dom.heroSuggestions.innerHTML = html;

  dom.heroSuggestions.querySelectorAll('[data-suggestion]').forEach((button) => {
    button.addEventListener('click', () => {
      const query = button.dataset.suggestion;
      trackSearch(query);
      runSearch(query);
    });
  });
}

function renderCatalog() {
  if (!dom.catalogGrid) return;

  const products = getFilteredProducts();
  const visibleProducts = products.slice(0, state.visibleCount);

  if (dom.resultCount) {
    dom.resultCount.textContent = `${products.length} ${pluralize(products.length, ['товар', 'товара', 'товаров'])}`;
  }

  if (dom.catalogMeta) {
    if (state.filters.query && state.searchSubmitted) {
      dom.catalogMeta.textContent = products.length
        ? `Результаты по запросу "${state.filters.query}" готовы.`
        : `По запросу "${state.filters.query}" ничего не найдено.`;
    } else if (state.filters.query) {
      dom.catalogMeta.textContent = `Локальная фильтрация по запросу "${state.filters.query}".`;
    } else {
      dom.catalogMeta.textContent = 'Выбирайте товары, открывайте предложения магазинов и сохраняйте лучшее в избранное.';
    }
  }

  renderActiveFilters();
  renderCatalogInsights(products, visibleProducts.length);

  if (!products.length) {
    dom.catalogGrid.innerHTML = createEmptyState(
      'Ничего не найдено',
      'Попробуйте изменить фильтры или сбросить текущий поиск.'
    );
    if (dom.catalogFooter) {
      dom.catalogFooter.classList.add('hidden');
    }
    return;
  }

  dom.catalogGrid.innerHTML = visibleProducts
    .map((product, index) => renderProductCard(product, index))
    .join('');

  const hasMore = products.length > visibleProducts.length;
  if (dom.catalogFooter) {
    dom.catalogFooter.classList.toggle('hidden', !hasMore);
  }

  if (hasMore && dom.loadMoreBtn) {
    dom.loadMoreBtn.textContent = `Показать ещё (${products.length - visibleProducts.length})`;
  }
}

function renderFavoritesPage() {
  if (!dom.favoritesGrid) return;

  const favoriteProducts = state.favoriteIds
    .map((id) => findProduct(id))
    .filter(Boolean);

  renderFavoriteBadges();

  if (!favoriteProducts.length) {
    dom.favoritesGrid.innerHTML = createEmptyState(
      'Нет избранных товаров',
      'Сохраните товары с главной страницы, и они появятся здесь.'
    );
    return;
  }

  dom.favoritesGrid.innerHTML = favoriteProducts
    .map((product, index) => renderProductCard(product, index))
    .join('');
}

function renderCatalogInsights(products, visibleCount) {
  if (!dom.catalogInsights) return;

  if (!products.length) {
    dom.catalogInsights.innerHTML = '';
    return;
  }

  const categories = products.reduce((acc, product) => {
    const key = product.category || 'Другое';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, 4);

  const cheapest = products.reduce((min, product) => {
    if (!Number.isFinite(Number(product.minPrice))) return min;
    if (!min || Number(product.minPrice) < Number(min.minPrice)) return product;
    return min;
  }, null);

  const mostProfitable = products.reduce((best, product) => {
    if (!best || Number(product.savings || 0) > Number(best.savings || 0)) return product;
    return best;
  }, null);

  const cards = [
    {
      title: 'В каталоге',
      value: `${products.length}`,
      text: `Сейчас показано ${visibleCount} ${pluralize(visibleCount, ['позиция', 'позиции', 'позиций'])}.`
    },
    {
      title: 'Категории',
      value: `${Object.keys(categories).length}`,
      text: topCategories.map(([name, count]) => `${name}: ${count}`).join(' • ')
    },
    {
      title: 'Минимальная цена',
      value: cheapest ? `${formatPrice(cheapest.minPrice)} ₸` : '—',
      text: cheapest ? cheapest.name : 'Нет доступных цен'
    },
    {
      title: 'Лучшая экономия',
      value: mostProfitable ? `${formatPrice(mostProfitable.savings)} ₸` : '—',
      text: mostProfitable ? mostProfitable.name : 'Недостаточно данных'
    }
  ];

  dom.catalogInsights.innerHTML = cards
    .map((card) => `
      <article class="insight-card">
        <span>${escapeHtml(card.title)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.text)}</p>
      </article>
    `)
    .join('');
}

function renderActiveFilters() {
  if (!dom.activeFilters) return;

  const filters = [];

  if (state.filters.query.trim()) {
    filters.push({ key: 'query', label: `Поиск: ${state.filters.query.trim()}` });
  }

  if (state.filters.category !== 'all') {
    filters.push({ key: 'category', label: state.filters.category });
  }

  if (state.filters.stores.length) {
    const names = state.stores
      .filter((store) => state.filters.stores.includes(store.id))
      .map((store) => store.name)
      .join(', ');
    filters.push({ key: 'stores', label: `Магазины: ${names}` });
  }

  if (state.filters.minPrice) {
    filters.push({ key: 'min', label: `От ${formatPrice(state.filters.minPrice)} ₸` });
  }

  if (state.filters.maxPrice) {
    filters.push({ key: 'max', label: `До ${formatPrice(state.filters.maxPrice)} ₸` });
  }

  if (!filters.length) {
    dom.activeFilters.innerHTML = '<span class="muted-text">Фильтры пока не выбраны.</span>';
    return;
  }

  dom.activeFilters.innerHTML = filters
    .map((item) => `
      <button class="tag tag-action" type="button" data-reset-filter="${item.key}">
        ${escapeHtml(item.label)} ×
      </button>
    `)
    .join('');
}

function renderProductCard(product, index = 0) {
  const offers = Array.isArray(product.offers) ? product.offers : [];
  const bestOffer = offers[0] || null;
  const offersCount = Number(product.offersCount || offers.length || 0);
  const storesCount = Number(product.storesCount || offers.length || 0);
  const savings = Number(product.savings || 0);
  const priceLabel = getPriceLabel(product.minPrice);
  const savingsLabel = savings > 0 ? `−${formatPrice(savings)} ₸` : '';
  const bestStoreLabel = bestOffer ? bestOffer.storeName : 'Скоро появится';
  const categoryKey = escapeHtml(product.categoryKey || 'default');
  const imageUrl = product.imageUrl ? escapeAttr(product.imageUrl) : '';
  const hasImage = Boolean(imageUrl);
  const name = escapeAttr(product.name || 'Product');
  const icon = escapeHtml(product.icon || '📦');

  const isSponsored = state.sponsoredSet.has(product.id);

  return `
    <article class="product-card reveal-up" style="animation-delay:${Math.min(index * 40, 280)}ms">
      <div class="product-card__media-shell ${hasImage ? 'product-card__media-shell--photo' : ''}" data-category="${categoryKey}">
        <div class="product-card__media-aura" aria-hidden="true"></div>
        ${hasImage
          ? `<img class="product-card__photo" src="${imageUrl}" alt="${name}" loading="lazy" decoding="async">`
          : `<div class="product-card__icon product-card__icon--standalone" data-category="${categoryKey}">${icon}</div>`
        }
        <div class="product-card__photo-ui">
          <div class="product-card__photo-tags">
            <span class="product-card__photo-cat">${escapeHtml(product.category || 'Каталог')}</span>
            ${product.badge ? `<span class="product-card__photo-badge">${escapeHtml(product.badge)}</span>` : ''}
            ${isSponsored ? `<span class="sponsored-badge">Спонсор</span>` : ''}
          </div>
          ${renderFavoriteButton(product.id)}
        </div>
      </div>

      <div class="product-card__body">
        <div class="product-card__copy">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || 'Описание скоро появится.')}</p>
        </div>

        <div class="product-card__quick">
          <span>${escapeHtml(bestStoreLabel)}</span>
          <span>${offersCount} ${pluralize(offersCount, ['предложение', 'предложения', 'предложений'])}</span>
          <span>${storesCount} ${pluralize(storesCount, ['магазин', 'магазина', 'магазинов'])}</span>
        </div>

        <div class="product-card__bottom">
          <div class="product-card__price-block">
            <span>Лучшая цена</span>
            <strong>${escapeHtml(priceLabel)}</strong>
            ${savingsLabel ? `<small>${escapeHtml(savingsLabel)}</small>` : ''}
          </div>

        </div>

        <div class="product-card__actions">
          <button class="btn btn-secondary" type="button" data-action="details" data-product-id="${product.id}">
            Подробнее
          </button>
          <button
            class="btn btn-primary"
            type="button"
            data-action="cart"
            data-product-id="${product.id}"
            data-store-id="${bestOffer ? bestOffer.storeId : ''}"
            ${bestOffer ? '' : 'disabled'}
          >
            В корзину
          </button>
          <button
            class="btn-compare ${compareState.ids.includes(product.id) ? 'is-active' : ''}"
            type="button"
            data-action="compare"
            data-product-id="${product.id}"
            title="Добавить к сравнению"
          >⇄</button>
        </div>
      </div>
    </article>
  `;
}

function renderFavoriteButton(productId, extraClass = '') {
  const isFavorite = state.favoriteIds.includes(productId);
  return `
    <button
      class="product-card__favorite ${extraClass} ${isFavorite ? 'is-active' : ''}"
      type="button"
      aria-label="${isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}"
      title="${isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}"
      data-action="toggle-favorite"
      data-product-id="${productId}"
    >
      <span class="product-card__favorite-icon">${isFavorite ? '&#10084;' : '&#9825;'}</span>
    </button>
  `;
}

function getBaseProducts() {
  const query = state.filters.query.trim().toLowerCase();
  const source = state.searchSubmitted && query ? state.searchResults : state.products;

  if (!query || state.searchSubmitted) {
    return source;
  }

  return source.filter((product) => {
    const haystack = `${product.name || ''} ${product.category || ''} ${product.description || ''}`.toLowerCase();
    return haystack.includes(query);
  });
}

function getFilteredProducts() {
  const minPrice = Number(state.filters.minPrice);
  const maxPrice = Number(state.filters.maxPrice);

  const filtered = getBaseProducts().filter((product) => {
    const productMinPrice = Number(product.minPrice);

    if (state.filters.category !== 'all' && product.category !== state.filters.category) {
      return false;
    }

    if (
      Number.isFinite(minPrice) &&
      state.filters.minPrice !== '' &&
      (!Number.isFinite(productMinPrice) || productMinPrice < minPrice)
    ) {
      return false;
    }

    if (
      Number.isFinite(maxPrice) &&
      state.filters.maxPrice !== '' &&
      (!Number.isFinite(productMinPrice) || productMinPrice > maxPrice)
    ) {
      return false;
    }

    if (state.filters.stores.length > 0) {
      const offers = Array.isArray(product.offers) ? product.offers : [];
      return offers.some((offer) => state.filters.stores.includes(offer.storeId));
    }

    return true;
  });

  const sorters = {
    popular: (a, b) => Number(b.offersCount || 0) - Number(a.offersCount || 0)
      || Number(b.savings || 0) - Number(a.savings || 0)
      || String(a.name || '').localeCompare(String(b.name || ''), 'ru'),
    'price-asc': (a, b) => (Number.isFinite(Number(a.minPrice)) ? Number(a.minPrice) : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(Number(b.minPrice)) ? Number(b.minPrice) : Number.MAX_SAFE_INTEGER),
    'price-desc': (a, b) => (Number.isFinite(Number(b.minPrice)) ? Number(b.minPrice) : 0)
      - (Number.isFinite(Number(a.minPrice)) ? Number(a.minPrice) : 0),
    savings: (a, b) => Number(b.savings || 0) - Number(a.savings || 0)
      || (Number.isFinite(Number(a.minPrice)) ? Number(a.minPrice) : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(Number(b.minPrice)) ? Number(b.minPrice) : Number.MAX_SAFE_INTEGER),
    name: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru')
  };

  return filtered.sort(sorters[state.filters.sort] || sorters.popular);
}

function handleActiveFilterClick(event) {
  const button = event.target.closest('[data-reset-filter]');
  if (!button) return;

  switch (button.dataset.resetFilter) {
    case 'query':
      state.filters.query = '';
      state.searchSubmitted = false;
      state.searchResults = [];
      syncQueryInputs('');
      setUrlQuery('');
      break;
    case 'category':
      state.filters.category = 'all';
      renderCategoryChips();
      break;
    case 'stores':
      state.filters.stores = [];
      renderStoreFilters();
      break;
    case 'min':
      state.filters.minPrice = '';
      if (dom.minPriceInput) dom.minPriceInput.value = '';
      break;
    case 'max':
      state.filters.maxPrice = '';
      if (dom.maxPriceInput) dom.maxPriceInput.value = '';
      break;
    default:
      break;
  }

  renderCatalog();
}

function handleCatalogClick(event) {
  const detailsButton = event.target.closest('[data-action="details"]');
  if (detailsButton) {
    openProduct(Number(detailsButton.dataset.productId));
    return;
  }

  const favoriteButton = event.target.closest('[data-action="toggle-favorite"]');
  if (favoriteButton) {
    toggleFavorite(Number(favoriteButton.dataset.productId));
    return;
  }

  const selectButton = event.target.closest('[data-action="toggle-select"]');
  if (selectButton) {
    toggleSelection(Number(selectButton.dataset.productId));
    return;
  }

  const cartButton = event.target.closest('[data-action="cart"]');
  if (cartButton) {
    addToCart(Number(cartButton.dataset.productId), Number(cartButton.dataset.storeId));
  }
}

function handleSelectionClick(event) {
  const openButton = event.target.closest('[data-selection-open]');
  if (openButton) {
    openProduct(Number(openButton.dataset.selectionOpen));
    return;
  }

  const removeButton = event.target.closest('[data-selection-remove]');
  if (removeButton) {
    toggleSelection(Number(removeButton.dataset.selectionRemove));
  }
}

function handleModalClick(event) {
  if (event.target.matches('[data-close-modal="true"]')) {
    closeModal();
    return;
  }

  const favoriteButton = event.target.closest('[data-modal-favorite]');
  if (favoriteButton) {
    toggleFavorite(Number(favoriteButton.dataset.modalFavorite));
    return;
  }

  const selectButton = event.target.closest('[data-modal-select]');
  if (selectButton) {
    toggleSelection(Number(selectButton.dataset.modalSelect));
    return;
  }

  const cartButton = event.target.closest('[data-modal-cart]');
  if (cartButton) {
    addToCart(Number(cartButton.dataset.productId), Number(cartButton.dataset.storeId));
    return;
  }

  const affiliateLink = event.target.closest('[data-affiliate-product]');
  if (affiliateLink) {
    const productId = Number(affiliateLink.dataset.affiliateProduct);
    const storeId = Number(affiliateLink.dataset.affiliateStore);
    const price = Number(affiliateLink.dataset.affiliatePrice);
    fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, storeId, priceAtClick: price })
    }).catch(() => {});
  }
}

function openProduct(productId) {
  if (!dom.modalContent || !dom.productModal) return;

  const product = findProduct(productId);
  if (!product) {
    showToast('Товар не найден.', 'error');
    return;
  }

  const offers = Array.isArray(product.offers) ? product.offers : [];
  const isSelected = state.selectedIds.includes(product.id);
  const isFavorite = state.favoriteIds.includes(product.id);

  dom.modalContent.innerHTML = `
    <div class="modal-product">
      <div class="modal-product__hero">
        ${renderProductMedia(product, 'modal')}
        <div>
          <div class="modal-product__tags">
            <span class="tag">${escapeHtml(product.category || 'Каталог')}</span>
            ${product.badge ? `<span class="tag tag-soft">${escapeHtml(product.badge)}</span>` : ''}
          </div>
          <h2 id="modalProductTitle">${escapeHtml(product.name)}</h2>
          <p>${escapeHtml(product.description || 'Описание скоро появится.')}</p>
        </div>
      </div>

      <div class="modal-product__summary">
        <article class="summary-tile">
          <span>Цена</span>
          <strong>${escapeHtml(getPriceLabel(product.minPrice))}</strong>
        </article>
        <article class="summary-tile">
          <span>Экономия</span>
          <strong>${formatPrice(product.savings || 0)} ₸</strong>
        </article>
        <article class="summary-tile">
          <span>Предложения</span>
          <strong>${offers.length}</strong>
        </article>
      </div>

      <div class="modal-product__chart-section">
        <div class="chart-header">
          <span class="chart-label">Изменение цены за 7 дней</span>
        </div>
        <canvas id="priceChart" class="price-chart-canvas"></canvas>
      </div>

      <div class="modal-product__actions">
        <button
          class="btn ${isFavorite ? 'btn-secondary' : 'btn-primary'}"
          type="button"
          data-modal-favorite="${product.id}"
        >
          ${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        </button>
        <button
          class="btn ${isSelected ? 'btn-secondary' : 'btn-ghost'}"
          type="button"
          data-modal-select="${product.id}"
        >
          ${isSelected ? 'Убрать из выбора' : 'Мой выбор'}
        </button>
      </div>

      <div class="offer-list">
        ${offers.length ? offers.map((offer, index) => {
          const sr = state.storeRatings.find(r => r.storeId === offer.storeId);
          const storeStars = sr ? renderStars(sr.avg) : '';
          const storeScore = sr ? `<span class="store-rating__score">${sr.avg}</span><span style="font-size:0.75rem;color:var(--text-soft)">(${sr.count})</span>` : '';
          return `
          <article class="offer-card ${index === 0 ? 'offer-card-best' : ''}">
            <div>
              <div class="offer-card__store">
                <strong>${escapeHtml(offer.storeName)}</strong>
                ${index === 0 ? '<span class="tag tag-accent">Лучшая цена</span>' : ''}
              </div>
              <div class="store-rating">
                <span class="store-rating__stars">${storeStars}</span>
                ${storeScore}
                <button class="store-rate-btn" data-rate-store="${offer.storeId}" data-store-name="${escapeAttr(offer.storeName)}">Оценить</button>
              </div>
            </div>
            <div class="offer-card__side">
              <strong>${formatPrice(offer.price)} ₸</strong>
              <div class="offer-card__buttons">
                <button
                  class="btn btn-primary"
                  type="button"
                  data-modal-cart="true"
                  data-product-id="${product.id}"
                  data-store-id="${offer.storeId}"
                >
                  В корзину
                </button>
                ${offer.storeUrl ? `<a class="btn btn-secondary" href="${escapeAttr(offer.storeUrl)}" target="_blank" rel="noopener noreferrer" data-affiliate-product="${product.id}" data-affiliate-store="${offer.storeId}" data-affiliate-price="${offer.price}">К магазину</a>` : ''}
              </div>
            </div>
          </article>
        `}).join('') : createEmptyState('Нет предложений', 'Для этого товара предложения магазинов пока не добавлены.')}
      </div>

      <div id="reviewsSection" class="reviews-section">
        <div class="reviews-section__head">
          <h3 style="margin:0;font-size:1rem">Отзывы</h3>
          <div class="reviews-avg" id="reviewsAvg"></div>
        </div>
        <div id="reviewList" class="review-list"><p style="color:var(--text-soft);font-size:0.9rem">Загрузка отзывов...</p></div>
        <div class="review-form" id="reviewForm">
          <div class="review-form__title">Оставить отзыв</div>
          <div class="review-form__stars" id="reviewStars"></div>
          <textarea id="reviewText" placeholder="Ваш отзыв..."></textarea>
          <button class="btn btn-primary" id="submitReviewBtn" data-product-id="${product.id}" style="font-size:0.88rem;padding:9px 20px">Отправить</button>
        </div>
      </div>
    </div>
  `;

  dom.productModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  setTimeout(() => {
    renderPriceChart(product.id, Number(product.minPrice));
    loadReviews(product.id);
    initReviewStars();
  }, 100);
}

function closeModal() {
  if (!dom.productModal) return;

  if (priceChartInstance) {
    priceChartInstance.destroy();
    priceChartInstance = null;
  }

  dom.productModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function toggleFavorite(productId) {
  if (!productId) return;

  const next = new Set(state.favoriteIds);
  const wasFavorite = next.has(productId);

  if (wasFavorite) next.delete(productId);
  else next.add(productId);

  state.favoriteIds = Array.from(next);
  saveStoredIds(FAVORITES_STORAGE_KEY, state.favoriteIds);
  renderFavoriteBadges();

  if (page === 'favorites') {
    renderFavoritesPage();
  } else {
    renderFeatured();
    renderCatalog();
  }

  if (dom.productModal && !dom.productModal.classList.contains('hidden')) {
    openProduct(productId);
  }

  showToast(wasFavorite ? 'Товар удалён из избранного.' : 'Товар добавлен в избранное.', 'info');
}

function toggleSelection(productId) {
  if (!productId) return;

  const next = new Set(state.selectedIds);

  if (next.has(productId)) next.delete(productId);
  else next.add(productId);

  state.selectedIds = Array.from(next);
  saveStoredIds(SELECTION_STORAGE_KEY, state.selectedIds);
  renderSelectionDock();

  if (page === 'favorites') {
    renderFavoritesPage();
  } else {
    renderCatalog();
  }

  if (dom.productModal && !dom.productModal.classList.contains('hidden')) {
    openProduct(productId);
  }
}

function renderSelectionDock() {
  if (!dom.selectionDock || !dom.selectionTitle || !dom.selectionItems) return;

  const products = state.selectedIds
    .map((id) => findProduct(id))
    .filter(Boolean);

  if (!products.length) {
    dom.selectionDock.classList.add('hidden');
    return;
  }

  dom.selectionDock.classList.remove('hidden');
  dom.selectionTitle.textContent = `Выбрано ${products.length} ${pluralize(products.length, ['товар', 'товара', 'товаров'])}`;
  dom.selectionItems.innerHTML = products
    .map((product) => `
      <div class="selection-pill">
        <button class="selection-pill__open" type="button" data-selection-open="${product.id}">
          <span>${escapeHtml(product.icon || '•')}</span>
          <span>${escapeHtml(product.name)}</span>
        </button>
        <button class="selection-pill__remove" type="button" data-selection-remove="${product.id}" aria-label="Убрать товар">×</button>
      </div>
    `)
    .join('');
}

function scrollToSelection() {
  if (!dom.selectionDock) return;

  if (dom.selectionDock.classList.contains('hidden')) {
    showToast('Вы пока не выбрали товары.', 'info');
    return;
  }

  dom.selectionDock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearSelection() {
  state.selectedIds = [];
  saveStoredIds(SELECTION_STORAGE_KEY, []);
  renderSelectionDock();

  if (page === 'favorites') {
    renderFavoritesPage();
  } else {
    renderCatalog();
  }

  showToast('Список "Мой выбор" очищен.', 'info');
}

async function addToCart(productId, storeId) {
  if (!productId || !storeId) {
    showToast('Для этого товара пока нет доступного предложения.', 'error');
    return;
  }

  try {
    await fetchJson('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, storeId })
    });
    showToast('Товар добавлен в корзину.', 'success');
  } catch (error) {
    if (error.status === 401) {
      showToast('Сначала войдите в аккаунт, чтобы сохранять товары в корзину.', 'info');
      window.setTimeout(() => {
        const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
      }, 900);
      return;
    }

    showToast(error.message, 'error');
  }
}

function resetFilters() {
  state.filters = {
    query: '',
    category: 'all',
    stores: [],
    minPrice: '',
    maxPrice: '',
    sort: 'popular'
  };
  state.searchSubmitted = false;
  state.searchResults = [];
  state.visibleCount = state.pageSize;

  syncQueryInputs('');
  if (dom.minPriceInput) dom.minPriceInput.value = '';
  if (dom.maxPriceInput) dom.maxPriceInput.value = '';
  if (dom.sortSelect) dom.sortSelect.value = 'popular';
  setUrlQuery('');

  renderCategoryChips();
  renderStoreFilters();
  renderCatalog();
  showToast('Фильтры сброшены.', 'info');
}

function setUrlQuery(query) {
  const url = new URL(window.location.href);

  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function buildHomeFallback(products, storesCount) {
  const biggestSaving = products.reduce((max, product) => Math.max(max, Number(product.savings || 0)), 0);

  return {
    totals: {
      products: products.length,
      stores: storesCount,
      deals: products.filter((product) => Number.isFinite(Number(product.minPrice))).length,
      biggestSaving
    },
    featured: [...products]
      .sort((a, b) => Number(b.savings || 0) - Number(a.savings || 0)
        || (Number.isFinite(Number(a.minPrice)) ? Number(a.minPrice) : Number.MAX_SAFE_INTEGER)
        - (Number.isFinite(Number(b.minPrice)) ? Number(b.minPrice) : Number.MAX_SAFE_INTEGER))
      .slice(0, 6)
  };
}

function renderProductMedia(product, type) {
  const icon = escapeHtml(product.icon || '📦');
  const categoryKey = escapeHtml(product.categoryKey || 'default');
  const name = escapeAttr(product.name || 'Product');
  const imageUrl = product.imageUrl ? escapeAttr(product.imageUrl) : '';
  const hasImage = Boolean(imageUrl);

  if (type === 'featured') {
    return `
      <div class="featured-card__media-shell ${hasImage ? 'featured-card__media-shell--photo' : ''}" data-category="${categoryKey}">
        ${hasImage
          ? `<img class="featured-card__photo" src="${imageUrl}" alt="${name}" loading="lazy" decoding="async">`
          : `<div class="featured-card__icon" data-category="${categoryKey}">${icon}</div>`}
      </div>
    `;
  }

  if (type === 'card') {
    return `
      <div class="product-card__media-shell ${hasImage ? 'product-card__media-shell--photo' : ''}" data-category="${categoryKey}">
        <div class="product-card__media-aura" aria-hidden="true"></div>
        ${hasImage ? `<img class="product-card__photo" src="${imageUrl}" alt="${name}" loading="lazy" decoding="async">` : ''}
        ${hasImage ? '' : `
          <div class="product-card__icon product-card__icon--standalone" data-category="${categoryKey}">
            ${icon}
          </div>
        `}
      </div>
    `;
  }

  if (type === 'modal') {
    return `
      <div class="modal-product__media-shell ${hasImage ? 'modal-product__media-shell--photo' : ''}" data-category="${categoryKey}">
        <div class="modal-product__media-aura" aria-hidden="true"></div>
        ${hasImage ? `<img class="modal-product__photo" src="${imageUrl}" alt="${name}" loading="lazy" decoding="async">` : ''}
        ${hasImage ? '' : `
          <div class="modal-product__icon modal-product__icon--standalone" data-category="${categoryKey}">
            ${icon}
          </div>
        `}
      </div>
    `;
  }

  return '';
}

function findProduct(productId) {
  return state.products.find((product) => product.id === productId)
    || state.searchResults.find((product) => product.id === productId)
    || null;
}

function normalizeStoredLists() {
  const productIds = new Set(state.products.map((product) => product.id));
  const nextSelected = state.selectedIds.filter((id) => productIds.has(id));
  const nextFavorites = state.favoriteIds.filter((id) => productIds.has(id));

  if (nextSelected.length !== state.selectedIds.length) {
    state.selectedIds = nextSelected;
    saveStoredIds(SELECTION_STORAGE_KEY, nextSelected);
  }

  if (nextFavorites.length !== state.favoriteIds.length) {
    state.favoriteIds = nextFavorites;
    saveStoredIds(FAVORITES_STORAGE_KEY, nextFavorites);
  }
}

function loadStoredIds(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id) => Number.isInteger(id))
      : [];
  } catch (error) {
    return [];
  }
}

function saveStoredIds(key, ids) {
  window.localStorage.setItem(key, JSON.stringify(ids));
}

function getPriceLabel(value) {
  return Number.isFinite(Number(value)) ? `${formatPrice(value)} ₸` : 'Цена уточняется';
}

function createEmptyState(title, text) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function showFatalState(message) {
  if (dom.catalogMeta) {
    dom.catalogMeta.textContent = message;
  }

  const empty = createEmptyState(
    page === 'favorites' ? 'Не удалось загрузить избранное' : 'Каталог пока не загрузился',
    'Проверьте подключение к серверу и обновите страницу.'
  );

  if (dom.catalogGrid) {
    dom.catalogGrid.innerHTML = empty;
  }

  if (dom.favoritesGrid) {
    dom.favoritesGrid.innerHTML = empty;
  }

  renderFavoriteBadges();
}

function pluralize(value, words) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return words[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return words[1];
  return words[2];
}

function firstWord(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'Профиль';
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('ru-RU');
}

function trackSearch(query) {
  if (!query.trim()) return;

  const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  const normalized = query.trim().toLowerCase();
  
  const existing = history.findIndex((item) => item.query.toLowerCase() === normalized);
  if (existing >= 0) {
    history[existing].count += 1;
    history[existing].lastUsed = Date.now();
  } else {
    history.push({
      query: query.trim(),
      count: 1,
      lastUsed: Date.now()
    });
  }

  history.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

function getPopularQueries(prefix = '') {
  const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  const lowerPrefix = prefix.trim().toLowerCase();

  return history
    .filter((item) => !lowerPrefix || item.query.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .map((item) => item.query)
    .slice(0, 8);
}

function generatePriceHistory(basePrice) {
  const days = [];
  const prices = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'numeric', day: 'numeric' });
    days.push(dayName);

    const variance = (Math.random() - 0.5) * (basePrice * 0.15);
    const price = Math.max(Math.round(basePrice + variance), Math.round(basePrice * 0.8));
    prices.push(price);
  }

  return { days, prices };
}

function renderPriceChart(productId, basePrice) {
  if (typeof Chart === 'undefined') return;

  if (priceChartInstance) {
    priceChartInstance.destroy();
    priceChartInstance = null;
  }

  const canvas = document.getElementById('priceChart');
  if (!canvas) return;

  const { days, prices } = generatePriceHistory(basePrice);

  priceChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Цена, ₸',
          data: prices,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#0f766e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#1e1a16',
            font: {
              family: "'Manrope', sans-serif",
              size: 14,
              weight: '600'
            },
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: 'rgba(30, 26, 22, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          titleFont: {
            family: "'Manrope', sans-serif",
            size: 13,
            weight: '600'
          },
          bodyFont: {
            family: "'Manrope', sans-serif",
            size: 12
          },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return context.parsed.y + ' ₸';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(82, 58, 36, 0.08)',
            drawBorder: false
          },
          ticks: {
            color: '#6f6358',
            font: {
              family: "'Manrope', sans-serif",
              size: 12
            },
            callback: function(value) {
              return value + ' ₸';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6f6358',
            font: {
              family: "'Manrope', sans-serif",
              size: 12
            }
          }
        }
      }
    }
  });
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
  if (!dom.toastStack) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  dom.toastStack.appendChild(toast);

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

// ═══════════════════════════════════════════════════════════════
// DARK THEME
// ═══════════════════════════════════════════════════════════════

(function initTheme() {
  const saved = localStorage.getItem('smartprice-theme') || 'light';
  applyTheme(saved);
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('smartprice-theme', theme);
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ═══════════════════════════════════════════════════════════════
// COMPARE
// ═══════════════════════════════════════════════════════════════

const compareState = { ids: [] };
const MAX_COMPARE = 3;

function toggleCompare(productId) {
  const idx = compareState.ids.indexOf(productId);
  if (idx !== -1) {
    compareState.ids.splice(idx, 1);
  } else {
    if (compareState.ids.length >= MAX_COMPARE) {
      showToast(`Можно сравнить до ${MAX_COMPARE} товаров`, 'error');
      return;
    }
    compareState.ids.push(productId);
  }
  renderCompareBar();
  renderCatalog();
}

function renderCompareBar() {
  const bar = document.getElementById('compareBar');
  if (!bar) return;

  const slots = bar.querySelectorAll('.compare-bar__slot');
  slots.forEach((slot, i) => {
    const id = compareState.ids[i];
    if (id) {
      const p = findProduct(id);
      slot.textContent = p ? p.icon || '📦' : '?';
      slot.classList.add('is-filled');
      slot.title = p ? p.name : '';
    } else {
      slot.textContent = '';
      slot.classList.remove('is-filled');
      slot.title = '';
    }
  });

  bar.classList.toggle('is-visible', compareState.ids.length > 0);
}

function openCompareModal() {
  if (compareState.ids.length < 2) {
    showToast('Выберите минимум 2 товара для сравнения', 'error');
    return;
  }

  const products = compareState.ids.map(id => findProduct(id)).filter(Boolean);
  const wrap = document.getElementById('compareTableWrap');
  if (!wrap) return;

  const allStoreNames = [...new Set(
    products.flatMap(p => (p.offers || []).map(o => o.storeName))
  )];

  const minPrices = products.map(p => p.minPrice || 0);
  const overallMin = Math.min(...minPrices);

  wrap.innerHTML = `
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead>
          <tr>
            <td></td>
            ${products.map(p => `
              <th>
                <span class="compare-card__icon">${escapeHtml(p.icon || '📦')}</span>
                ${escapeHtml(p.name)}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Категория</td>
            ${products.map(p => `<td style="text-align:center">${escapeHtml(p.category || '—')}</td>`).join('')}
          </tr>
          <tr>
            <td>Лучшая цена</td>
            ${products.map(p => `<td style="text-align:center" class="${p.minPrice === overallMin ? 'best-price' : ''}">${formatPrice(p.minPrice || 0)} ₸</td>`).join('')}
          </tr>
          <tr>
            <td>Экономия</td>
            ${products.map(p => `<td style="text-align:center">${formatPrice(p.savings || 0)} ₸</td>`).join('')}
          </tr>
          <tr>
            <td>Предложений</td>
            ${products.map(p => `<td style="text-align:center">${(p.offers || []).length}</td>`).join('')}
          </tr>
          ${allStoreNames.map(storeName => `
            <tr>
              <td>${escapeHtml(storeName)}</td>
              ${products.map(p => {
                const offer = (p.offers || []).find(o => o.storeName === storeName);
                return `<td style="text-align:center">${offer ? formatPrice(offer.price) + ' ₸' : '—'}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('compareModal')?.classList.add('is-open');
}

document.getElementById('openCompareBtn')?.addEventListener('click', openCompareModal);
document.getElementById('clearCompareBtn')?.addEventListener('click', () => {
  compareState.ids = [];
  renderCompareBar();
  renderCatalog();
});
document.getElementById('closeCompareBtn')?.addEventListener('click', () => {
  document.getElementById('compareModal')?.classList.remove('is-open');
});
document.getElementById('compareModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('compareModal')) {
    document.getElementById('compareModal').classList.remove('is-open');
  }
});

// ═══════════════════════════════════════════════════════════════
// STORE RATINGS
// ═══════════════════════════════════════════════════════════════

async function loadStoreRatings() {
  try {
    const data = await fetchJson('/api/store-ratings');
    state.storeRatings = Array.isArray(data) ? data : [];
  } catch {
    state.storeRatings = [];
  }
}

function renderStars(avg, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star ${i <= Math.round(avg) ? 'filled' : ''}">★</span>`;
  }
  return html;
}

let rateStoreTarget = null;
let rateStorePending = 0;

function openRateStore(storeId, storeName) {
  rateStoreTarget = storeId;
  rateStorePending = 0;
  const popup = document.getElementById('rateStorePopup');
  const nameEl = document.getElementById('rateStoreName');
  const starsEl = document.getElementById('rateStoreStars');
  if (!popup || !nameEl || !starsEl) return;

  nameEl.textContent = storeName;

  const existing = state.storeRatings.find(r => r.storeId === storeId);
  const current = existing ? existing.avg : 0;

  starsEl.innerHTML = [1,2,3,4,5].map(i => `
    <span class="star interactive ${i <= current ? 'filled' : ''}" data-val="${i}">★</span>
  `).join('');

  starsEl.querySelectorAll('.star').forEach(star => {
    const val = Number(star.dataset.val);
    star.addEventListener('mouseenter', () => {
      starsEl.querySelectorAll('.star').forEach((s, idx) => {
        s.classList.toggle('hovered', idx < val);
      });
    });
    star.addEventListener('mouseleave', () => {
      starsEl.querySelectorAll('.star').forEach(s => s.classList.remove('hovered'));
    });
    star.addEventListener('click', () => {
      rateStorePending = val;
      starsEl.querySelectorAll('.star').forEach((s, idx) => {
        s.classList.toggle('filled', idx < val);
      });
    });
  });

  popup.classList.add('is-open');
}

document.getElementById('rateStoreConfirmBtn')?.addEventListener('click', async () => {
  if (!rateStoreTarget || !rateStorePending) {
    showToast('Выберите оценку', 'error');
    return;
  }
  try {
    await fetchJson('/api/store-ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: rateStoreTarget, rating: rateStorePending })
    });
    showToast('Оценка сохранена!', 'success');
    await loadStoreRatings();
    document.getElementById('rateStorePopup').classList.remove('is-open');
  } catch (err) {
    showToast(err.message || 'Ошибка', 'error');
  }
});

document.getElementById('rateStoreCancelBtn')?.addEventListener('click', () => {
  document.getElementById('rateStorePopup')?.classList.remove('is-open');
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-rate-store]');
  if (btn) {
    if (!state.user) { showToast('Войдите чтобы оценить магазин', 'error'); return; }
    openRateStore(Number(btn.dataset.rateStore), btn.dataset.storeName);
  }
});

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════

async function loadReviews(productId) {
  const listEl = document.getElementById('reviewList');
  const avgEl = document.getElementById('reviewsAvg');
  if (!listEl) return;

  try {
    const data = await fetchJson(`/api/reviews/${productId}`);
    const { reviews, avg, count } = data;

    if (avgEl) {
      avgEl.innerHTML = count > 0
        ? `<span class="reviews-avg__score">${avg}</span><span class="stars">${renderStars(avg)}</span><span style="font-size:0.8rem;color:var(--text-soft)">${count} отз.</span>`
        : `<span style="font-size:0.85rem;color:var(--text-soft)">Нет оценок</span>`;
    }

    if (!reviews.length) {
      listEl.innerHTML = `<p style="color:var(--text-soft);font-size:0.9rem">Отзывов пока нет. Будьте первым!</p>`;
      return;
    }

    listEl.innerHTML = reviews.map(r => `
      <div class="review-item">
        <div class="review-item__head">
          <span class="review-item__author">${escapeHtml(r.user?.name || 'Аноним')}</span>
          <span class="review-item__date">${new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
        </div>
        <div class="stars" style="margin-bottom:6px">${renderStars(r.rating)}</div>
        <div class="review-item__text">${escapeHtml(r.text)}</div>
      </div>
    `).join('');
  } catch {
    if (listEl) listEl.innerHTML = `<p style="color:var(--text-soft);font-size:0.9rem">Не удалось загрузить отзывы.</p>`;
  }

  const formEl = document.getElementById('reviewForm');
  if (formEl) formEl.style.display = state.user ? '' : 'none';
  if (!state.user && document.getElementById('reviewsSection')) {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.85rem;color:var(--text-soft);margin-top:8px';
    note.textContent = 'Войдите чтобы оставить отзыв.';
    document.getElementById('reviewsSection').appendChild(note);
  }
}

let reviewRating = 0;

function initReviewStars() {
  const starsEl = document.getElementById('reviewStars');
  if (!starsEl) return;
  reviewRating = 0;

  starsEl.innerHTML = [1,2,3,4,5].map(i => `
    <span class="star interactive" data-val="${i}">★</span>
  `).join('');

  starsEl.querySelectorAll('.star').forEach(star => {
    const val = Number(star.dataset.val);
    star.addEventListener('mouseenter', () => {
      starsEl.querySelectorAll('.star').forEach((s, idx) => s.classList.toggle('hovered', idx < val));
    });
    star.addEventListener('mouseleave', () => {
      starsEl.querySelectorAll('.star').forEach((s, idx) => {
        s.classList.remove('hovered');
        s.classList.toggle('filled', idx < reviewRating);
      });
    });
    star.addEventListener('click', () => {
      reviewRating = val;
      starsEl.querySelectorAll('.star').forEach((s, idx) => s.classList.toggle('filled', idx < val));
    });
  });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#submitReviewBtn');
  if (!btn) return;

  const productId = Number(btn.dataset.productId);
  const text = document.getElementById('reviewText')?.value?.trim();

  if (!reviewRating) { showToast('Поставьте оценку', 'error'); return; }
  if (!text) { showToast('Напишите отзыв', 'error'); return; }

  try {
    btn.disabled = true;
    await fetchJson('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, rating: reviewRating, text })
    });
    showToast('Отзыв добавлен!', 'success');
    document.getElementById('reviewText').value = '';
    reviewRating = 0;
    initReviewStars();
    await loadReviews(productId);
  } catch (err) {
    showToast(err.message || 'Ошибка', 'error');
  } finally {
    btn.disabled = false;
  }
});

// Handle compare action from product cards
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="compare"]');
  if (btn) toggleCompare(Number(btn.dataset.productId));
});
