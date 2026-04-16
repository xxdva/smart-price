const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: 'postgresql://postgres@localhost:5432/smartprice' });
const prisma = new PrismaClient({ adapter });

const storeVariations = [
  0, +0.03, -0.02, +0.05, +0.01, -0.04,
  +0.07, -0.06, +0.02, -0.03, +0.04, -0.01,
  +0.06, -0.05, +0.08, -0.07, +0.09,
];

async function main() {
  const allProducts = await prisma.product.findMany({
    include: { prices: { select: { storeId: true } } }
  });
  const allStores = await prisma.store.findMany();

  console.log(`Товаров: ${allProducts.length}, Магазинов: ${allStores.length}`);

  let totalAdded = 0;

  for (const product of allProducts) {
    const existingStoreIds = new Set(product.prices.map(p => p.storeId));

    // Находим магазины без цены для этого товара
    const missingStores = allStores.filter(s => !existingStoreIds.has(s.id));
    if (missingStores.length === 0) continue;

    // Берём среднюю цену из существующих цен как базовую
    const existingPrices = await prisma.price.findMany({
      where: { productId: product.id }
    });
    const avgPrice = Math.round(
      existingPrices.reduce((sum, p) => sum + p.price, 0) / existingPrices.length
    );

    const priceData = missingStores.map((store, i) => {
      const variation = storeVariations[(existingStoreIds.size + i) % storeVariations.length];
      const price = Math.round(avgPrice * (1 + variation) / 1000) * 1000;
      return { productId: product.id, storeId: store.id, price };
    });

    await prisma.price.createMany({ data: priceData });
    totalAdded += priceData.length;

    if (totalAdded % 200 === 0) {
      console.log(`  Добавлено цен: ${totalAdded}...`);
    }
  }

  console.log(`\n✅ Готово! Добавлено цен: ${totalAdded}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
