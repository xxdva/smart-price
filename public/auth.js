const authMode = document.body.dataset.authMode;

const authDom = {
  form: document.getElementById('authForm'),
  nameInput: document.getElementById('nameInput'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  togglePasswordBtn: document.getElementById('togglePasswordBtn'),
  authError: document.getElementById('authError'),
  submitAuthBtn: document.getElementById('submitAuthBtn'),
  passwordStrength: document.getElementById('passwordStrength'),
  passwordStrengthBar: document.getElementById('passwordStrengthBar'),
  passwordStrengthText: document.getElementById('passwordStrengthText')
};

bindAuthEvents();

function bindAuthEvents() {
  authDom.form.addEventListener('submit', handleAuthSubmit);
  authDom.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

  if (authMode === 'register' && authDom.passwordInput) {
    authDom.passwordInput.addEventListener('input', renderPasswordStrength);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  authDom.authError.textContent = '';
  authDom.authError.className = 'form-message form-message-error';

  const payload = {
    email: authDom.emailInput.value.trim(),
    password: authDom.passwordInput.value
  };

  if (authMode === 'register') {
    payload.name = authDom.nameInput.value.trim();
  }

  const endpoint = authMode === 'register' ? '/api/register' : '/api/login';
  const defaultTarget = '/cabinet';
  const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || defaultTarget;
  const originalLabel = authDom.submitAuthBtn.textContent;

  authDom.submitAuthBtn.disabled = true;
  authDom.submitAuthBtn.textContent = authMode === 'register' ? 'Создаем аккаунт...' : 'Входим...';

  try {
    await fetchJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    window.location.href = redirectTarget;
  } catch (error) {
    authDom.authError.textContent = error.message;
  } finally {
    authDom.submitAuthBtn.disabled = false;
    authDom.submitAuthBtn.textContent = originalLabel;
  }
}

function togglePasswordVisibility() {
  const isPassword = authDom.passwordInput.type === 'password';
  authDom.passwordInput.type = isPassword ? 'text' : 'password';
  authDom.togglePasswordBtn.textContent = isPassword ? 'Скрыть' : 'Показать';
}

function renderPasswordStrength() {
  const password = authDom.passwordInput.value;
  authDom.passwordStrength.classList.remove('hidden');

  let score = 0;
  if (password.length >= 6) score += 1;
  if (/[A-ZА-Я]/.test(password)) score += 1;
  if (/[a-zа-я]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-zА-Яа-я0-9]/.test(password)) score += 1;

  const percent = Math.max(15, score * 20);
  const tones = ['#ef4444', '#f97316', '#f59e0b', '#0f766e', '#065f46'];
  const labels = [
    'Пароль пока слишком простой.',
    'Можно усилить пароль цифрами и разным регистром.',
    'Неплохо, но можно сделать еще надежнее.',
    'Хороший пароль.',
    'Отличный, сильный пароль.'
  ];

  authDom.passwordStrengthBar.style.width = `${percent}%`;
  authDom.passwordStrengthBar.style.background = tones[Math.max(score - 1, 0)];
  authDom.passwordStrengthText.textContent = labels[Math.max(score - 1, 0)];
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
