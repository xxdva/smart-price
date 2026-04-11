const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const DB_URL = 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'smartprice-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// ===== Seed =====
async function seed() {
  const count = await prisma.store.count();
  if (count > 0) return;

  const sulpak    = await prisma.store.create({ data: { name: 'Sulpak',    url: 'https://www.sulpak.kz' } });
  const technodom = await prisma.store.create({ data: { name: 'Technodom', url: 'https://www.technodom.kz' } });
  const mechta    = await prisma.store.create({ data: { name: 'Mechta',    url: 'https://www.mechta.kz' } });

  const iphone  = await prisma.product.create({ data: { name: 'iPhone 15',              icon: '📱' } });
  const samsung = await prisma.product.create({ data: { name: 'Samsung Galaxy S24',     icon: '📱' } });
  const macbook = await prisma.product.create({ data: { name: 'MacBook Air M2',         icon: '💻' } });
  const lenovo  = await prisma.product.create({ data: { name: 'Ноутбук Lenovo IdeaPad', icon: '💻' } });

  await prisma.price.createMany({ data: [
    { productId: iphone.id,  storeId: sulpak.id,    price: 320000 },
    { productId: iphone.id,  storeId: technodom.id, price: 310000 },
    { productId: iphone.id,  storeId: mechta.id,    price: 325000 },
    { productId: samsung.id, storeId: sulpak.id,    price: 280000 },
    { productId: samsung.id, storeId: technodom.id, price: 275000 },
    { productId: samsung.id, storeId: mechta.id,    price: 285000 },
    { productId: macbook.id, storeId: sulpak.id,    price: 590000 },
    { productId: macbook.id, storeId: technodom.id, price: 580000 },
    { productId: lenovo.id,  storeId: technodom.id, price: 220000 },
    { productId: lenovo.id,  storeId: mechta.id,    price: 215000 },
  ]});

  console.log('База заполнена');
}

// ===== Страницы =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/cabinet');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/cabinet');
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/cabinet', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'cabinet.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ===== Auth API =====
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ error: 'Email уже зарегистрирован' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Введите email и пароль' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Неверный пароль' });
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, name: true, email: true, createdAt: true }
  });
  res.json({ user });
});

app.get('/api/my-searches', requireAuth, async (req, res) => {
  const searches = await prisma.search.findMany({
    where: { userId: req.session.userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  res.json(searches);
});

// ===== Корзина API =====
app.get('/api/cart', requireAuth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.session.userId },
    include: { product: true, store: true },
    orderBy: { addedAt: 'desc' }
  });
  res.json(items);
});

app.post('/api/cart', requireAuth, async (req, res) => {
  const { productId, storeId, price } = req.body;
  if (!productId || !storeId || !price) return res.status(400).json({ error: 'Недостаточно данных' });

  const exists = await prisma.cartItem.findFirst({
    where: { userId: req.session.userId, productId: parseInt(productId), storeId: parseInt(storeId) }
  });
  if (exists) return res.status(400).json({ error: 'Товар уже в корзине' });

  const item = await prisma.cartItem.create({
    data: { userId: req.session.userId, productId: parseInt(productId), storeId: parseInt(storeId), price: parseInt(price) },
    include: { product: true, store: true }
  });
  res.json(item);
});

app.delete('/api/cart/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const item = await prisma.cartItem.findFirst({ where: { id, userId: req.session.userId } });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  await prisma.cartItem.delete({ where: { id } });
  res.json({ ok: true });
});

// ===== Товары API =====
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  if (req.session.userId) {
    await prisma.search.create({ data: { userId: req.session.userId, query: q } });
  }
  const products = await prisma.product.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    orderBy: { name: 'asc' }
  });
  res.json(products);
});

app.get('/api/prices/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  const priceRows = await prisma.price.findMany({
    where: { productId },
    include: { store: true },
    orderBy: { price: 'asc' }
  });
  const prices = priceRows.map(p => ({ storeId: p.store.id, store: p.store.name, url: p.store.url, price: p.price }));
  res.json({ product, prices });
});

app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      prices: { orderBy: { price: 'asc' }, take: 1 }
    }
  });
  res.json(products);
});

app.get('/api/stores', async (req, res) => {
  res.json(await prisma.store.findMany({ orderBy: { name: 'asc' } }));
});

app.post('/api/products', async (req, res) => {
  const { name, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' });
  res.json(await prisma.product.create({ data: { name: name.trim(), icon: icon || '📦' } }));
});

app.post('/api/stores', async (req, res) => {
  const { name, url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' });
  res.json(await prisma.store.create({ data: { name: name.trim(), url: url || '' } }));
});

app.post('/api/prices', async (req, res) => {
  const { product_id, store_id, price } = req.body;
  if (!product_id || !store_id || !price) return res.status(400).json({ error: 'Все поля обязательны' });
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Цена должна быть положительным числом' });
  const existing = await prisma.price.findFirst({
    where: { productId: parseInt(product_id), storeId: parseInt(store_id) }
  });
  if (existing) {
    await prisma.price.update({ where: { id: existing.id }, data: { price: parseInt(price) } });
    res.json({ updated: true });
  } else {
    const p = await prisma.price.create({
      data: { productId: parseInt(product_id), storeId: parseInt(store_id), price: parseInt(price) }
    });
    res.json({ id: p.id });
  }
});

const PORT = 3000;
async function main() {
  await seed();
  app.listen(PORT, () => console.log(`SmartPrice: http://localhost:${PORT}`));
}
main().catch(console.error);
