const orderId = window.location.pathname.split('/').pop();
const DELIVERY_DURATION_MS = 60000; // 60 seconds animation

let map, markerA, markerB, courierMarker, routeLayer;
let routeCoords = [];
let animFrame = null;
let startTime = null;

const dom = {
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
  etaLabel: document.getElementById('etaLabel'),
  etaTime: document.getElementById('etaTime'),
  trackingOrderInfo: document.getElementById('trackingOrderInfo'),
  trackingAddress: document.getElementById('trackingAddress')
};

function iconA() {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker map-marker-a">A</div>`,
    iconSize: [36, 36], iconAnchor: [18, 36]
  });
}

function iconB() {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker map-marker-b">B</div>`,
    iconSize: [36, 36], iconAnchor: [18, 36]
  });
}

function courierIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="courier-marker">🏍️</div>`,
    iconSize: [40, 40], iconAnchor: [20, 20]
  });
}

function initMap(coordsA, coordsB, coords) {
  map = L.map('trackingMap', { zoomControl: false }).setView(coordsA, 13);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  markerA = L.marker(coordsA, { icon: iconA() }).addTo(map).bindPopup('Склад SmartPrice');
  markerB = L.marker(coordsB, { icon: iconB() }).addTo(map).bindPopup('Адрес доставки');

  routeLayer = L.polyline(coords, {
    color: '#0f766e', weight: 5, opacity: 0.6
  }).addTo(map);

  courierMarker = L.marker(coordsA, { icon: courierIcon(), zIndexOffset: 1000 }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), { padding: [60, 360] });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getPositionAt(t) {
  if (!routeCoords.length) return null;
  if (t <= 0) return routeCoords[0];
  if (t >= 1) return routeCoords[routeCoords.length - 1];
  const idx = Math.floor(t * (routeCoords.length - 1));
  const next = Math.min(idx + 1, routeCoords.length - 1);
  const seg = t * (routeCoords.length - 1) - idx;
  return [
    lerp(routeCoords[idx][0], routeCoords[next][0], seg),
    lerp(routeCoords[idx][1], routeCoords[next][1], seg)
  ];
}

function updateSteps(progress) {
  if (progress >= 0.01) {
    dom.step1.classList.add('is-done');
    dom.step2.classList.add('is-active');
  }
  if (progress >= 0.5) {
    dom.step2.classList.add('is-done');
    dom.step2.classList.remove('is-active');
  }
  if (progress >= 1) {
    dom.step3.classList.add('is-done', 'is-active');
    dom.etaLabel.textContent = '🎉 Заказ доставлен!';
    dom.etaTime.textContent = 'Спасибо за покупку в SmartPrice';
  } else {
    const secsLeft = Math.ceil(((1 - progress) * DELIVERY_DURATION_MS) / 1000);
    dom.etaTime.textContent = `Осталось ~${secsLeft} сек`;
  }
}

function animate(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / DELIVERY_DURATION_MS, 1);

  const pos = getPositionAt(progress);
  if (pos && courierMarker) {
    courierMarker.setLatLng(pos);
  }

  updateSteps(progress);

  if (progress < 1) {
    animFrame = requestAnimationFrame(animate);
  }
}

function formatPrice(n) {
  return Number(n).toLocaleString('ru-RU');
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function loadOrder() {
  const order = await fetchJson(`/api/orders/${orderId}`);
  if (order.error) {
    document.getElementById('trackingCard').innerHTML = `<p class="muted-text">${order.error}</p>`;
    return;
  }

  const addr = order.address;
  dom.trackingAddress.innerHTML = `
    <div class="tracking-address__row">
      <span>📍</span>
      <div>
        <strong>${addr.name}</strong>
        <span class="muted-text">${addr.city}, ${addr.street}, д.${addr.house}${addr.apartment ? ', кв.'+addr.apartment : ''}</span>
        <span class="muted-text">${addr.phone}</span>
      </div>
    </div>
  `;

  const card = order.card;
  dom.trackingOrderInfo.innerHTML = `
    <div class="tracking-order-row">
      <span>${order.items.length} ${plural(order.items.length, ['товар', 'товара', 'товаров'])}</span>
      <strong>${formatPrice(order.totalPrice)} ₸</strong>
    </div>
    <div class="tracking-order-row muted-text">
      <span>${card.cardType.toUpperCase()} •••• ${card.last4}</span>
      <span>Оплачено</span>
    </div>
    <div class="tracking-items">
      ${order.items.map(i => `<span class="tracking-item-pill">${i.name}</span>`).join('')}
    </div>
  `;

  const route = JSON.parse(sessionStorage.getItem('sp_route') || 'null');
  const coordsA = route?.coordsA || [51.1801, 71.4460];
  const coordsB = route?.coordsB || [addr.lat || 43.2500, addr.lng || 76.9500];
  routeCoords = route?.routeCoords || [coordsA, coordsB];

  initMap(coordsA, coordsB, routeCoords);
  dom.step1.classList.add('is-active');

  setTimeout(() => {
    requestAnimationFrame(animate);
  }, 1500);
}

function plural(n, forms) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

loadOrder();
