const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Получить первый товар
  const product = await prisma.product.findFirst();
  
  if (!product) {
    console.log('❌ Товаров в базе не найдено');
    return;
  }

  console.log(`📦 Найден товар: "${product.name}" (ID: ${product.id})`);

  // Добавить картинку - используем красивую картинку гаджета
  const imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';
  
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { imageUrl }
  });

  console.log(`✅ Картинка успешно добавлена!`);
  console.log(`📷 URL: ${updated.imageUrl}`);
  console.log(`\n🎉 Товар "${updated.name}" теперь с картинкой!`);
  console.log(`\n💡 Перезагрузите браузер чтобы увидеть изменения`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
