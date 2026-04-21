// ── Admin auth ────────────────────────────────────────────────────────────────
const ADMIN_KEY_STORAGE = 'sp_admin_key';

function getAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

function setAdminKey(key) {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

function clearAdminKey() {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

function adminHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() };
}

document.getElementById('adminGateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = document.getElementById('adminKeyInput').value.trim();
  const errEl = document.getElementById('adminGateError');
  errEl.textContent = '';

  try {
    const res = await fetch('/api/admin/monetization', { headers: { 'x-admin-key': key } });
    if (res.status === 403) {
      errEl.textContent = 'Неверный ключ доступа';
      return;
    }
    setAdminKey(key);
    showAdminPanel();
  } catch {
    errEl.textContent = 'Ошибка соединения';
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  clearAdminKey();
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('adminGate').classList.remove('hidden');
});

async function showAdminPanel() {
  document.getElementById('adminGate').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  bindTabSwitcher();
  bindAdminEvents();
  await reloadAdminData();
  await loadAnalytics();
  await loadMonetization();
}

// Auto-login if key already in session
(async function autoLogin() {
  const key = getAdminKey();
  if (!key) return;
  try {
    const res = await fetch('/api/admin/monetization', { headers: { 'x-admin-key': key } });
    if (res.ok) {
      showAdminPanel();
    } else {
      clearAdminKey();
    }
  } catch {
    clearAdminKey();
  }
})();

// ── Tabs ──────────────────────────────────────────────────────────────────────
function bindTabSwitcher() {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
      btn.classList.add('is-active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });
}

// ── Catalog tab ───────────────────────────────────────────────────────────────
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

function bindAdminEvents() {
  adminDom.productForm.addEventListener('submit', handleProductSubmit);
  adminDom.storeForm.addEventListener('submit', handleStoreSubmit);
  adminDom.priceForm.addEventListener('submit', handlePriceSubmit);
  document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', loadAnalytics);
  document.getElementById('refreshMonetizationBtn')?.addEventListener('click', loadMonetization);
  document.getElementById('sponsoredForm')?.addEventListener('submit', handleSponsoredSubmit);
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
  const productOptions = `
    <option value="">Выберите товар</option>
    ${adminState.products.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
  `;
  const storeOptions = `
    <option value="">Выберите магазин</option>
    ${adminState.stores.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
  `;

  adminDom.priceProduct.innerHTML = productOptions;
  adminDom.priceStore.innerHTML = storeOptions;

  const spProduct = document.getElementById('sponsoredProduct');
  const spStore = document.getElementById('sponsoredStore');
  if (spProduct) spProduct.innerHTML = productOptions;
  if (spStore) spStore.innerHTML = storeOptions;
}

async function handleProductSubmit(event) {
  event.preventDefault();
  try {
    const created = await fetchJson('/api/products', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ name: adminDom.productName.value.trim(), icon: adminDom.productIcon.value.trim() })
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
      headers: adminHeaders(),
      body: JSON.stringify({ name: adminDom.storeName.value.trim(), url: adminDom.storeUrl.value.trim() })
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
      headers: adminHeaders(),
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

// ── Analytics tab ─────────────────────────────────────────────────────────────
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
      `<p style="color:var(--danger)">Ошибка загрузки: ${escapeHtml(e.message)}</p>`;
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
  const gridColor = 'rgba(0,0,0,0.06)';
  const textColor = '#6f6358';

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
        datasets: [{ data: charts.searches, backgroundColor: 'rgba(74,222,128,0.5)', borderColor: '#4ade80', borderWidth: 2, borderRadius: 6 }]
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
        datasets: [{ data: charts.registrations, borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.15)', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#fb923c', tension: 0.35, fill: true }]
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

// ── Monetization tab ──────────────────────────────────────────────────────────
async function loadMonetization() {
  try {
    const data = await fetchJson('/api/admin/monetization', { headers: adminHeaders() });
    renderRevenueKpi(data);
    renderRevenueBreakdown(data.revenue);
    renderSponsoredTable(data.listings);
    renderAffiliateClicks(data.recentClicks);
    renderSubscriptions(data.subscriptions);
  } catch (e) {
    document.getElementById('revenueKpi').innerHTML =
      `<p style="color:var(--danger)">Ошибка: ${escapeHtml(e.message)}</p>`;
  }
}

function renderRevenueKpi(data) {
  const { revenue, stats } = data;
  const kpis = [
    { label: 'Общий доход', value: formatPrice(revenue.total) + ' ₸', sub: 'все источники', accent: true },
    { label: 'Спонсорские', value: formatPrice(revenue.sponsor) + ' ₸', sub: `${stats.activeListings} активных кампаний`, color: '#0f766e' },
    { label: 'Партнёрские', value: formatPrice(revenue.affiliate) + ' ₸', sub: `${stats.totalClicks} переходов всего`, color: '#2563eb' },
    { label: 'Подписки MRR', value: formatPrice(revenue.subscriptions) + ' ₸', sub: `${stats.activeSubscriptions} активных`, color: '#7c3aed' },
    { label: 'Комиссии за месяц', value: formatPrice(revenue.monthAffiliate) + ' ₸', sub: 'партнёрка за 30 дней', color: '#059669' },
  ];

  document.getElementById('revenueKpi').innerHTML = kpis.map(k => `
    <div class="revenue-kpi-card ${k.accent ? 'revenue-kpi-card--accent' : ''}">
      <div class="revenue-kpi-card__value" ${k.color ? `style="color:${k.color}"` : ''}>${k.value}</div>
      <div class="revenue-kpi-card__label">${escapeHtml(k.label)}</div>
      <div class="revenue-kpi-card__sub">${escapeHtml(k.sub)}</div>
    </div>
  `).join('');
}

function renderRevenueBreakdown(revenue) {
  const total = revenue.sponsor + revenue.affiliate + revenue.subscriptions || 1;
  const sources = [
    { label: 'Спонсорские', amount: revenue.sponsor, color: '#0f766e' },
    { label: 'Партнёрские', amount: revenue.affiliate, color: '#2563eb' },
    { label: 'Подписки', amount: revenue.subscriptions, color: '#7c3aed' }
  ];

  const el = document.getElementById('revenueBreakdown');
  el.innerHTML = `
    <div class="breakdown-bar">
      ${sources.map(s => {
        const pct = Math.round((s.amount / total) * 100);
        if (!pct) return '';
        return `<div class="breakdown-bar__seg" style="width:${pct}%;background:${s.color}" title="${s.label}: ${formatPrice(s.amount)} ₸"></div>`;
      }).join('')}
    </div>
    <div class="breakdown-legend">
      ${sources.map(s => `
        <div class="breakdown-legend__item">
          <span class="breakdown-legend__dot" style="background:${s.color}"></span>
          <span>${escapeHtml(s.label)}</span>
          <strong>${formatPrice(s.amount)} ₸</strong>
          <span class="muted-text">${Math.round((s.amount / total) * 100)}%</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSponsoredTable(listings) {
  const el = document.getElementById('sponsoredTable');
  if (!listings.length) {
    el.innerHTML = `<p class="analytics-empty">Нет активных размещений</p>`;
    return;
  }

  const now = new Date();
  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Товар</th>
          <th>Магазин</th>
          <th>Плата/мес.</th>
          <th>Переходы</th>
          <th>Статус</th>
          <th>Истекает</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${listings.map(l => {
          const isActive = l.isActive && new Date(l.expiresAt) >= now;
          const expires = new Date(l.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
          return `
            <tr>
              <td><span>${escapeHtml(l.product.icon || '📦')}</span> ${escapeHtml(l.product.name)}</td>
              <td>${escapeHtml(l.store.name)}</td>
              <td><strong>${formatPrice(l.monthlyFee)} ₸</strong></td>
              <td>${l.totalClicks}</td>
              <td><span class="status-badge ${isActive ? 'status-badge--active' : 'status-badge--inactive'}">${isActive ? 'Активно' : 'Неактивно'}</span></td>
              <td class="muted-text">${expires}</td>
              <td>
                ${isActive ? `<button class="btn btn-ghost" style="font-size:0.8rem;padding:4px 10px" onclick="deactivateListing(${l.id})">Остановить</button>` : '—'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderAffiliateClicks(clicks) {
  const el = document.getElementById('affiliateClicksFeed');
  if (!clicks.length) {
    el.innerHTML = `<p class="analytics-empty">Переходов пока нет</p>`;
    return;
  }

  el.innerHTML = clicks.map(c => {
    const time = new Date(c.clickedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="affiliate-click-row">
        <span class="affiliate-click-row__icon">${escapeHtml(c.product.icon || '📦')}</span>
        <div class="affiliate-click-row__info">
          <strong>${escapeHtml(c.product.name)}</strong>
          <span class="muted-text">${escapeHtml(c.store.name)}${c.user ? ' · ' + escapeHtml(c.user.name) : ''}</span>
        </div>
        <div class="affiliate-click-row__money">
          <strong class="affiliate-click-row__commission">+${formatPrice(c.commission)} ₸</strong>
          <span class="muted-text">${formatPrice(c.priceAtClick)} ₸</span>
        </div>
        <span class="affiliate-click-row__time muted-text">${time}</span>
      </div>
    `;
  }).join('');
}

function renderSubscriptions(subs) {
  const el = document.getElementById('subscriptionsList');
  if (!subs.length) {
    el.innerHTML = `<p class="analytics-empty">Подписчиков пока нет</p>`;
    return;
  }

  const planLabels = { premium: 'Premium', business: 'Business' };
  el.innerHTML = subs.map(s => {
    const expires = new Date(s.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `
      <div class="subscription-row">
        <div class="subscription-row__avatar">${escapeHtml(s.user.name.charAt(0).toUpperCase())}</div>
        <div class="subscription-row__info">
          <strong>${escapeHtml(s.user.name)}</strong>
          <span class="muted-text">${escapeHtml(s.user.email)}</span>
        </div>
        <div class="subscription-row__plan">
          <span class="plan-badge plan-badge--${s.plan}">${planLabels[s.plan] || s.plan}</span>
          <span class="muted-text">${formatPrice(s.amount)} ₸/мес</span>
        </div>
        <span class="muted-text" style="font-size:0.8rem">до ${expires}</span>
      </div>
    `;
  }).join('');
}

async function handleSponsoredSubmit(event) {
  event.preventDefault();
  const msgEl = document.getElementById('sponsoredMsg');
  msgEl.textContent = '';
  try {
    await fetchJson('/api/admin/sponsored', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        productId: document.getElementById('sponsoredProduct').value,
        storeId: document.getElementById('sponsoredStore').value,
        monthlyFee: document.getElementById('sponsoredFee').value,
        months: document.getElementById('sponsoredMonths').value
      })
    });
    renderFormMessage(msgEl, 'Размещение создано.');
    document.getElementById('sponsoredForm').reset();
    await loadMonetization();
  } catch (e) {
    renderFormMessage(msgEl, e.message, true);
  }
}

async function deactivateListing(id) {
  try {
    await fetchJson(`/api/admin/sponsored/${id}`, { method: 'DELETE', headers: adminHeaders() });
    await loadMonetization();
  } catch (e) {
    alert(e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
