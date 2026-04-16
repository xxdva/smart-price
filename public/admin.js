const adminDom = {
  adminStats: document.getElementById('adminStats'),
  productForm: document.getElementById('productForm'),
  productName: document.getElementById('productName'),
  productIcon: document.getElementById('productIcon'),
  productMsg: document.getElementById('productMsg'),
  storeForm: document.getElementById('storeForm'),
  storeName: document.getElementById('storeName'),
  storeUrl: document.getElementById('storeUrl'),
  storeMsg: document.getElementById('storeMsg'),
  priceForm: document.getElementById('priceForm'),
  priceProduct: document.getElementById('priceProduct'),
  priceStore: document.getElementById('priceStore'),
  priceValue: document.getElementById('priceValue'),
  priceMsg: document.getElementById('priceMsg')
};

const adminState = {
  products: [],
  stores: [],
  home: null
};

initAdmin();

async function initAdmin() {
  bindAdminEvents();
  adminDom.adminStats.innerHTML = `
    <article class="stat-card skeleton-block"></article>
    <article class="stat-card skeleton-block"></article>
    <article class="stat-card skeleton-block"></article>
  `;

  try {
    await reloadAdminData();
    await loadAnalytics();
  } catch (error) {
    renderFormMessage(adminDom.priceMsg, error.message, true);
  }
}

function bindAdminEvents() {
  adminDom.productForm.addEventListener('submit', handleProductSubmit);
  adminDom.storeForm.addEventListener('submit', handleStoreSubmit);
  adminDom.priceForm.addEventListener('submit', handlePriceSubmit);
  document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', loadAnalytics);
}

async function reloadAdminData() {
  const [products, stores, home] = await Promise.all([
    fetchJson('/api/products'),
    fetchJson('/api/stores'),
    fetchJson('/api/home')
  ]);

  adminState.products = products;
  adminState.stores = stores;
  adminState.home = home;

  renderAdminStats();
  populateSelects();
}

function renderAdminStats() {
  const totals = adminState.home.totals;
  const stats = [
    { label: 'Товаров', value: totals.products },
    { label: 'Магазинов', value: totals.stores },
    { label: 'Лучшее снижение', value: `${formatPrice(totals.biggestSaving)} ₸` }
  ];

  adminDom.adminStats.innerHTML = stats
    .map((item) => `
      <article class="stat-card">
        <strong>${escapeHtml(String(item.value))}</strong>
        <span>${escapeHtml(item.label)}</span>
      </article>
    `)
    .join('');
}

function populateSelects() {
  adminDom.priceProduct.innerHTML = `
    <option value="">Выберите товар</option>
    ${adminState.products.map((product) => `
      <option value="${product.id}">${escapeHtml(product.name)}</option>
    `).join('')}
  `;

  adminDom.priceStore.innerHTML = `
    <option value="">Выберите магазин</option>
    ${adminState.stores.map((store) => `
      <option value="${store.id}">${escapeHtml(store.name)}</option>
    `).join('')}
  `;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  try {
    const created = await fetchJson('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adminDom.productName.value.trim(),
        icon: adminDom.productIcon.value.trim()
      })
    });

    renderFormMessage(adminDom.productMsg, `Товар "${created.name}" добавлен.`);
    adminDom.productForm.reset();
    await reloadAdminData();
  } catch (error) {
    renderFormMessage(adminDom.productMsg, error.message, true);
  }
}

async function handleStoreSubmit(event) {
  event.preventDefault();

  try {
    const created = await fetchJson('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: adminDom.storeName.value.trim(),
        url: adminDom.storeUrl.value.trim()
      })
    });

    renderFormMessage(adminDom.storeMsg, `Магазин "${created.name}" добавлен.`);
    adminDom.storeForm.reset();
    await reloadAdminData();
  } catch (error) {
    renderFormMessage(adminDom.storeMsg, error.message, true);
  }
}

async function handlePriceSubmit(event) {
  event.preventDefault();

  try {
    const saved = await fetchJson('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: adminDom.priceProduct.value,
        store_id: adminDom.priceStore.value,
        price: adminDom.priceValue.value
      })
    });

    renderFormMessage(adminDom.priceMsg, saved.updated ? 'Цена обновлена.' : 'Цена добавлена.');
    adminDom.priceValue.value = '';
    await reloadAdminData();
  } catch (error) {
    renderFormMessage(adminDom.priceMsg, error.message, true);
  }
}

function renderFormMessage(target, message, isError = false) {
  target.className = isError ? 'form-message form-message-error' : 'form-message form-message-success';
  target.textContent = message;
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

// ── Analytics ─────────────────────────────────────────────────────────────────

let searchChartInstance = null;
let regChartInstance = null;

async function loadAnalytics() {
  const btn = document.getElementById('refreshAnalyticsBtn');
  if (btn) btn.textContent = '↻ Загрузка...';

  try {
    const data = await fetchJson('/api/admin/analytics');
    renderKpi(data);
    renderCharts(data.charts);
    renderTopSearches(data.topSearches);
    renderTopProducts(data.topProducts);
    renderStoreRatings(data.storeRatings);
  } catch (e) {
    document.getElementById('analyticsKpi').innerHTML =
      `<p style="color:var(--danger)">Ошибка загрузки аналитики: ${escapeHtml(e.message)}</p>`;
  } finally {
    if (btn) btn.textContent = '↻ Обновить';
  }
}

function renderKpi(data) {
  const kpis = [
    { value: data.users.total,    label: 'Пользователей',   sub: `+${data.users.week} за неделю` },
    { value: data.users.today,    label: 'Новых сегодня',   sub: `+${data.users.week} за 7 дней` },
    { value: data.searches.total, label: 'Всего поисков',   sub: null },
    { value: data.cart.total,     label: 'В корзинах',      sub: null },
    { value: data.reviews.total,  label: 'Отзывов',         sub: data.reviews.avg ? `Средняя: ${data.reviews.avg} ★` : null },
  ];

  document.getElementById('analyticsKpi').innerHTML = kpis.map(k => `
    <div class="analytics-kpi-card">
      <div class="analytics-kpi-card__value">${escapeHtml(String(k.value))}</div>
      <div class="analytics-kpi-card__label">${escapeHtml(k.label)}</div>
      ${k.sub ? `<div class="analytics-kpi-card__sub">${escapeHtml(k.sub)}</div>` : ''}
    </div>
  `).join('');
}

function renderCharts(charts) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#b0aec8' : '#6f6358';

  const baseOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, precision: 0 }, beginAtZero: true }
    }
  };

  if (searchChartInstance) searchChartInstance.destroy();
  if (regChartInstance) regChartInstance.destroy();

  const searchCtx = document.getElementById('searchChart');
  if (searchCtx) {
    searchChartInstance = new Chart(searchCtx, {
      type: 'bar',
      data: {
        labels: charts.days,
        datasets: [{
          data: charts.searches,
          backgroundColor: 'rgba(74,222,128,0.5)',
          borderColor: '#4ade80',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: baseOptions
    });
  }

  const regCtx = document.getElementById('regChart');
  if (regCtx) {
    regChartInstance = new Chart(regCtx, {
      type: 'line',
      data: {
        labels: charts.days,
        datasets: [{
          data: charts.registrations,
          borderColor: '#fb923c',
          backgroundColor: 'rgba(251,146,60,0.15)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#fb923c',
          tension: 0.35,
          fill: true
        }]
      },
      options: baseOptions
    });
  }
}

function renderTopSearches(items) {
  const el = document.getElementById('topSearchesTable');
  if (!el) return;
  if (!items.length) { el.innerHTML = `<p class="analytics-empty">Поисков пока нет</p>`; return; }
  el.innerHTML = items.map((s, i) => `
    <div class="analytics-row">
      <span style="color:var(--text-soft);min-width:18px;font-size:0.8rem">${i + 1}</span>
      <span class="analytics-row__name">${escapeHtml(s.query)}</span>
      <span class="analytics-row__badge">${s.count}</span>
    </div>
  `).join('');
}

function renderTopProducts(items) {
  const el = document.getElementById('topProductsTable');
  if (!el) return;
  if (!items.length) { el.innerHTML = `<p class="analytics-empty">Корзины пусты</p>`; return; }
  el.innerHTML = items.map((p, i) => `
    <div class="analytics-row">
      <span style="color:var(--text-soft);min-width:18px;font-size:0.8rem">${i + 1}</span>
      <span style="font-size:1rem">${escapeHtml(p.icon || '📦')}</span>
      <span class="analytics-row__name">${escapeHtml(p.name)}</span>
      <span class="analytics-row__badge">${p.count}</span>
    </div>
  `).join('');
}

function renderStoreRatings(items) {
  const el = document.getElementById('storeRatingsTable');
  if (!el) return;
  if (!items.length) { el.innerHTML = `<p class="analytics-empty">Оценок пока нет</p>`; return; }
  el.innerHTML = items.map(s => `
    <div class="analytics-row">
      <span class="analytics-row__name">${escapeHtml(s.name)}</span>
      <span class="analytics-row__stars">${'★'.repeat(Math.round(s.avg))}${'☆'.repeat(5 - Math.round(s.avg))}</span>
      <span class="analytics-row__badge">${s.avg} (${s.count})</span>
    </div>
  `).join('');
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
