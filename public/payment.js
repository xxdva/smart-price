const dom = {
  cardNumber: document.getElementById('pCardNumber'),
  holder: document.getElementById('pHolder'),
  expiry: document.getElementById('pExpiry'),
  cvv: document.getElementById('pCvv'),
  previewNumber: document.getElementById('previewNumber'),
  previewHolder: document.getElementById('previewHolder'),
  previewExpiry: document.getElementById('previewExpiry'),
  previewCardType: document.getElementById('previewCardType'),
  cardPreview: document.getElementById('cardPreview'),
  orderItems: document.getElementById('orderItems'),
  orderTotalBig: document.getElementById('orderTotalBig'),
  orderSummary: document.getElementById('orderSummary'),
  savedCards: document.getElementById('savedCards'),
  error: document.getElementById('paymentError'),
  submitBtn: document.getElementById('submitPaymentBtn'),
  form: document.getElementById('paymentForm')
};

function detectCardType(number) {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'visa';
}

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  let v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) return v.slice(0, 2) + '/' + v.slice(2);
  return v;
}

dom.cardNumber.addEventListener('input', () => {
  dom.cardNumber.value = formatCardNumber(dom.cardNumber.value);
  const digits = dom.cardNumber.value.replace(/\s/g, '');
  const masked = digits.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
  dom.previewNumber.textContent = masked;
  const type = detectCardType(dom.cardNumber.value);
  dom.previewCardType.textContent = type.toUpperCase();
  dom.cardPreview.dataset.cardtype = type;
});

dom.holder.addEventListener('input', () => {
  dom.previewHolder.textContent = dom.holder.value.toUpperCase() || 'ВАШЕ ИМЯ';
});

dom.expiry.addEventListener('input', () => {
  dom.expiry.value = formatExpiry(dom.expiry.value);
  dom.previewExpiry.textContent = dom.expiry.value || 'ММ/ГГ';
});

dom.cvv.addEventListener('input', () => {
  dom.cvv.value = dom.cvv.value.replace(/\D/g, '').slice(0, 3);
});

async function fetchJson(url, opts) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

function formatPrice(n) {
  return Number(n).toLocaleString('ru-RU');
}

async function loadCart() {
  try {
    const cabinet = await fetchJson('/api/cabinet');
    const items = cabinet.cart || [];
    if (!items.length) {
      dom.orderItems.innerHTML = '<p class="muted-text">Корзина пуста</p>';
      return;
    }
    const total = items.reduce((s, i) => s + i.price, 0);
    dom.orderItems.innerHTML = items.map(item => `
      <div class="order-item-row">
        <span class="order-item-name">${item.product.name}</span>
        <span class="order-item-store">${item.store.name}</span>
        <strong class="order-item-price">${formatPrice(item.price)} ₸</strong>
      </div>
    `).join('');
    dom.orderTotalBig.textContent = `${formatPrice(total)} ₸`;
    dom.submitBtn.textContent = `Оплатить ${formatPrice(total)} ₸`;
  } catch (e) {}
}

async function loadSavedCards() {
  try {
    const cards = await fetchJson('/api/cards');
    if (!cards.length) return;
    dom.savedCards.classList.remove('hidden');
    dom.savedCards.innerHTML = `
      <p class="field__label">Сохранённые карты</p>
      <div class="saved-card-list">
        ${cards.map(c => `
          <button class="saved-card-btn" type="button" data-card-id="${c.id}">
            <span class="card-type-badge">${c.cardType.toUpperCase()}</span>
            <span>•••• ${c.last4}</span>
            <span class="muted-text">${c.expiryMonth}/${String(c.expiryYear).slice(-2)}</span>
          </button>
        `).join('')}
      </div>
    `;
  } catch (e) {}
}

dom.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.error.textContent = '';

  const addressId = sessionStorage.getItem('sp_addressId');
  if (!addressId) {
    dom.error.textContent = 'Не указан адрес доставки. Вернитесь на предыдущий шаг.';
    return;
  }

  const rawNumber = dom.cardNumber.value.replace(/\s/g, '');
  if (rawNumber.length < 16) { dom.error.textContent = 'Введите полный номер карты'; return; }
  const expParts = dom.expiry.value.split('/');
  if (expParts.length !== 2) { dom.error.textContent = 'Некорректный срок действия'; return; }
  if (dom.cvv.value.length < 3) { dom.error.textContent = 'Введите CVV'; return; }

  dom.submitBtn.disabled = true;
  dom.submitBtn.textContent = 'Обрабатываем платёж...';

  try {
    const card = await fetchJson('/api/cards', {
      method: 'POST',
      body: JSON.stringify({
        last4: rawNumber.slice(-4),
        cardType: detectCardType(rawNumber),
        expiryMonth: Number(expParts[0]),
        expiryYear: 2000 + Number(expParts[1]),
        holder: dom.holder.value.trim().toUpperCase(),
        isDefault: true
      })
    });

    const order = await fetchJson('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ addressId: Number(addressId), cardId: card.id })
    });

    if (order.error) {
      dom.error.textContent = order.error;
      dom.submitBtn.disabled = false;
      dom.submitBtn.textContent = 'Оплатить';
      return;
    }

    sessionStorage.removeItem('sp_addressId');
    window.location.href = `/tracking/${order.id}`;
  } catch (err) {
    dom.error.textContent = 'Ошибка оплаты. Попробуйте ещё раз.';
    dom.submitBtn.disabled = false;
    dom.submitBtn.textContent = 'Оплатить';
  }
});

loadCart();
loadSavedCards();
