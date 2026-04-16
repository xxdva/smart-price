const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice'
});

const prisma = new PrismaClient({ adapter });

const extraStores = [
  { name: 'Shop.kz', url: 'https://shop.kz' },
  { name: 'Al-Style', url: 'https://al-style.kz' },
  { name: 'Freedom Mobile', url: 'https://freedommobile.kz' }
];

const storeMultipliers = {
  'Shop.kz': 1.02,
  'Al-Style': 0.99,
  'Freedom Mobile': 1.01
};

function roundPrice(value) {
  return Math.round(value / 1000) * 1000;
}

async function ensureStores() {
  const result = [];

  for (const storeData of extraStores) {
    const existing = await prisma.store.findFirst({
      where: { name: storeData.name }
    });

    if (existing) {
      result.push(existing);
      continue;
    }

    const created = await prisma.store.create({ data: storeData });
    result.push(created);
  }

  return result;
}

async function addPricesForStores(stores) {
  const products = await prisma.product.findMany({
    include: {
      prices: {
        include: { store: true },
        orderBy: { price: 'asc' }
      }
    },
    orderBy: { id: 'asc' }
  });

  let createdCount = 0;

  for (const product of products) {
    const minPrice = product.prices[0]?.price;
    if (!minPrice) continue;

    for (const store of stores) {
      const exists = product.prices.some((row) => row.storeId === store.id);
      if (exists) continue;

      const multiplier = storeMultipliers[store.name] || 1;
      const offset = ((product.id + store.id) % 5) * 1000;
      const generatedPrice = roundPrice(minPrice * multiplier + offset);

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          price: generatedPrice
        }
      });

      createdCount += 1;
    }
  }

  return createdCount;
}

async function main() {
  const stores = await ensureStores();
  const createdPrices = await addPricesForStores(stores);

  const [productCount, storeCount, priceCount] = await Promise.all([
    prisma.product.count(),
    prisma.store.count(),
    prisma.price.count()
  ]);

  console.log(JSON.stringify({
    products: productCount,
    stores: storeCount,
    prices: priceCount,
    addedStores: stores.map((store) => store.name),
    createdPrices
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
