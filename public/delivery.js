const WAREHOUSE = { lat: 51.1801, lng: 71.4460, label: 'Склад SmartPrice, Астана' };

let map, markerA, markerB, routeLayer;
let geocodeTimer = null;
let currentCoords = null;

const dom = {
  form: document.getElementById('deliveryForm'),
  name: document.getElementById('dName'),
  phone: document.getElementById('dPhone'),
  city: document.getElementById('dCity'),
  street: document.getElementById('dStreet'),
  house: document.getElementById('dHouse'),
  apartment: document.getElementById('dApartment'),
  error: document.getElementById('deliveryError'),
  submitBtn: document.getElementById('submitDeliveryBtn'),
  mapStatus: document.getElementById('mapStatus'),
  routeInfo: document.getElementById('deliveryRouteInfo'),
  routeDistance: document.getElementById('routeDistance'),
  routeTime: document.getElementById('routeTime'),
  savedAddresses: document.getElementById('savedAddresses')
};

function markerIconA() {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker map-marker-a">A</div>`,
    iconSize: [36, 36], iconAnchor: [18, 36]
  });
}

function markerIconB() {
  return L.divIcon({
    className: '',
    html: `<div class="map-marker map-marker-b">B</div>`,
    iconSize: [36, 36], iconAnchor: [18, 36]
  });
}

function initMap() {
  map = L.map('deliveryMap', { zoomControl: true }).setView([WAREHOUSE.lat, WAREHOUSE.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  markerA = L.marker([WAREHOUSE.lat, WAREHOUSE.lng], { icon: markerIconA() })
    .addTo(map)
    .bindPopup(WAREHOUSE.label);

  // Allow clicking on map to place/move marker B manually
  map.on('click', (e) => {
    placeMarkerB(e.latlng.lat, e.latlng.lng, 'Выбрано вручную на карте');
    dom.mapStatus.textContent = 'Местоположение выбрано вручную';
  });
}

function placeMarkerB(lat, lng, displayName) {
  currentCoords = { lat, lng };
  if (markerB) markerB.remove();
  markerB = L.marker([lat, lng], { icon: markerIconB(), draggable: true })
    .addTo(map)
    .bindPopup(displayName || 'Адрес доставки');

  markerB.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    currentCoords = { lat: pos.lat, lng: pos.lng };
    buildRoute(pos.lat, pos.lng);
    dom.mapStatus.textContent = 'Маркер перемещён';
  });

  buildRoute(lat, lng);
}

async function buildRoute(latB, lngB) {
  if (routeLayer) { routeLayer.remove(); routeLayer = null; }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${WAREHOUSE.lng},${WAREHOUSE.lat};${lngB},${latB}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      routeLayer = L.polyline(coords, { color: '#0f766e', weight: 5, opacity: 0.8 }).addTo(map);
      map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

      const dist = data.routes[0].distance;
      const dur = data.routes[0].duration;
      dom.routeDistance.textContent = dist >= 1000 ? `📍 ${(dist/1000).toFixed(1)} км` : `📍 ${Math.round(dist)} м`;
      dom.routeTime.textContent = `🕐 ~${Math.ceil(dur/60)} мин`;
      dom.routeInfo.classList.remove('hidden');

      sessionStorage.setItem('sp_route', JSON.stringify({
        coordsA: [WAREHOUSE.lat, WAREHOUSE.lng],
        coordsB: [latB, lngB],
        routeCoords: coords
      }));
      return;
    }
  } catch (e) {}

  // Fallback: straight line
  const line = L.polyline([[WAREHOUSE.lat, WAREHOUSE.lng], [latB, lngB]], {
    color: '#0f766e', weight: 4, dashArray: '8 8'
  }).addTo(map);
  routeLayer = line;
  map.fitBounds(line.getBounds(), { padding: [40, 40] });
  sessionStorage.setItem('sp_route', JSON.stringify({
    coordsA: [WAREHOUSE.lat, WAREHOUSE.lng],
    coordsB: [latB, lngB],
    routeCoords: [[WAREHOUSE.lat, WAREHOUSE.lng], [latB, lngB]]
  }));
}

async function geocodeAndUpdate() {
  const city   = dom.city.value.trim();
  const street = dom.street.value.trim();
  const house  = dom.house.value.trim();

  if (!city && !street) return;

  // Build progressively detailed query
  const queries = [];
  if (street && house) queries.push(`${street} ${house}, ${city || 'Астана'}, Казахстан`);
  if (street)          queries.push(`${street}, ${city || 'Астана'}, Казахстан`);
  if (city)            queries.push(`${city}, Казахстан`);

  dom.mapStatus.textContent = 'Ищем адрес...';

  for (const q of queries) {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lng, display } = results[0];
        placeMarkerB(lat, lng, display);
        dom.mapStatus.textContent = `Найдено: ${display.split(',').slice(0,3).join(', ')}`;
        return;
      }
    } catch (e) {}
  }

  // If nothing found — show tip, still allow manual placement
  dom.mapStatus.textContent = 'Адрес не найден автоматически — нажмите на карту, чтобы указать точку вручную';
}

function scheduleGeocode() {
  clearTimeout(geocodeTimer);
  geocodeTimer = setTimeout(geocodeAndUpdate, 800);
}

async function loadSavedAddresses() {
  try {
    const addresses = await fetchJson('/api/addresses');
    if (!addresses.length) return;
    dom.savedAddresses.classList.remove('hidden');
    dom.savedAddresses.innerHTML = `
      <p class="field__label">Сохранённые адреса</p>
      <div class="saved-address-list">
        ${addresses.map(a => `
          <button class="saved-address-btn" type="button" data-address='${JSON.stringify(a)}'>
            <strong>${a.name}</strong>
            <span>${a.city}, ${a.street}, д.${a.house}${a.apartment ? ', кв.'+a.apartment : ''}</span>
          </button>
        `).join('')}
      </div>`;
    dom.savedAddresses.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-address]');
      if (!btn) return;
      const a = JSON.parse(btn.dataset.address);
      dom.name.value      = a.name;
      dom.phone.value     = a.phone;
      dom.city.value      = a.city;
      dom.street.value    = a.street;
      dom.house.value     = a.house;
      dom.apartment.value = a.apartment || '';
      if (a.lat && a.lng) placeMarkerB(a.lat, a.lng, `${a.city}, ${a.street}`);
      else geocodeAndUpdate();
    });
  } catch (e) {}
}

async function fetchJson(url, opts) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

dom.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.error.textContent = '';

  if (!dom.name.value.trim())   { dom.error.textContent = 'Укажите имя получателя'; return; }
  if (!dom.phone.value.trim())  { dom.error.textContent = 'Укажите телефон'; return; }
  if (!dom.street.value.trim()) { dom.error.textContent = 'Укажите улицу'; return; }
  if (!dom.house.value.trim())  { dom.error.textContent = 'Укажите номер дома'; return; }

  dom.submitBtn.disabled = true;
  dom.submitBtn.textContent = 'Сохраняем адрес...';

  try {
    const address = await fetchJson('/api/addresses', {
      method: 'POST',
      body: JSON.stringify({
        name:      dom.name.value.trim(),
        phone:     dom.phone.value.trim(),
        city:      dom.city.value.trim() || 'Алматы',
        street:    dom.street.value.trim(),
        house:     dom.house.value.trim(),
        apartment: dom.apartment.value.trim(),
        lat:       currentCoords?.lat || WAREHOUSE.lat,
        lng:       currentCoords?.lng || WAREHOUSE.lng,
        isDefault: true
      })
    });

    if (address.error) {
      dom.error.textContent = address.error;
      dom.submitBtn.disabled = false;
      dom.submitBtn.textContent = 'Продолжить к оплате →';
      return;
    }

    sessionStorage.setItem('sp_addressId', address.id);
    window.location.href = '/payment';
  } catch (err) {
    dom.error.textContent = 'Ошибка при сохранении адреса. Попробуйте ещё раз.';
    dom.submitBtn.disabled = false;
    dom.submitBtn.textContent = 'Продолжить к оплате →';
  }
});

['dCity', 'dStreet', 'dHouse'].forEach(id => {
  document.getElementById(id).addEventListener('input', scheduleGeocode);
});

initMap();
loadSavedAddresses();
