async function init() {
  try {
    const [me, sub] = await Promise.all([
      fetchJson('/api/me'),
      fetchJson('/api/my-subscription').catch(() => null)
    ]);

    if (me.user && sub?.status === 'active') {
      const planNames = { premium: 'Premium', business: 'Business' };
      const planName = planNames[sub.plan] || sub.plan;
      const expires = new Date(sub.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      const banner = document.getElementById('currentPlanBanner');
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <span class="plan-badge plan-badge--${sub.plan}" style="font-size:0.85rem;padding:4px 14px">${planName}</span>
        <span>Ваша подписка активна до <strong>${expires}</strong></span>
        <span class="muted-text">${sub.amount} ₸/мес</span>
      `;

      const btn = document.getElementById(`btn${planName}`);
      if (btn) {
        btn.textContent = 'Ваш текущий план';
        btn.disabled = true;
      }
    }
  } catch {}

  document.querySelectorAll('.subscribe-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSubscribe(btn.dataset.plan));
  });
}

async function handleSubscribe(plan) {
  const btn = document.getElementById(`btn${plan === 'premium' ? 'Premium' : 'Business'}`);
  const msg = document.getElementById(`msg${plan === 'premium' ? 'Premium' : 'Business'}`);

  try {
    const me = await fetchJson('/api/me');
    if (!me.user) {
      window.location.href = `/login?redirect=${encodeURIComponent('/premium')}`;
      return;
    }
  } catch {
    window.location.href = '/login?redirect=' + encodeURIComponent('/premium');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Оформляем...';
  msg.textContent = '';
  msg.className = 'form-message';

  try {
    await fetchJson('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });

    msg.className = 'form-message form-message-success';
    msg.textContent = 'Подписка активирована!';
    btn.textContent = 'Активировано ✓';

    showToast('Добро пожаловать в ' + (plan === 'premium' ? 'Premium' : 'Business') + '!', 'success');

    setTimeout(() => { window.location.href = '/cabinet'; }, 2000);
  } catch (e) {
    msg.className = 'form-message form-message-error';
    msg.textContent = e.message;
    btn.disabled = false;
    btn.textContent = plan === 'premium' ? 'Оформить Premium' : 'Оформить Business';
  }
}

function showToast(message, tone = 'info') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 240);
  }, 3000);
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Произошла ошибка.');
    err.status = res.status;
    throw err;
  }
  return data;
}

init();
