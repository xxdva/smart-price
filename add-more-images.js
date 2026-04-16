const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const imageMap = {
  // Смартфоны
  iPhone: 'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500&h=500&fit=crop',
  Samsung: 'https://images.unsplash.com/photo-1525275335684-4ca7f5e99737?w=500&h=500&fit=crop',
  Xiaomi: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Huawei: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
  Google: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
  OnePlus: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Sony: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  Nokia: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
  Motorola: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Realme: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  POCO: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Vivo: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  OPPO: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Honor: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',
  Tecno: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop',

  // Ноутбуки
  MacBook: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=500&fit=crop',
  Dell: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  HP: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  Lenovo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  ASUS: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  Acer: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  MSI: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',
  Razer: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&h=500&fit=crop',

  // Планшеты
  iPad: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500&h=500&fit=crop',
  Galaxy: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=500&fit=crop',
  Surface: 'https://images.unsplash.com/photo-1587614295999-6c1f4c928040?w=500&h=500&fit=crop',

  // Телевизоры
  TV: 'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',
  QLED: 'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',
  OLED: 'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',
  Bravia: 'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',

  // Аудио
  AirPods: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  Headphones: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  Earbuds: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  Bose: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  JBL: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  Sennheiser: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  Marshall: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',

  // Носимые устройства
  Watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
  Garmin: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
  Fitbit: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
  Amazfit: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',

  // Гейминг
  PlayStation: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&h=500&fit=crop',
  Xbox: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=500&h=500&fit=crop',
  Nintendo: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=500&fit=crop',
  Steam: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500&h=500&fit=crop',

  // Камеры
  Camera: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  Canon: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  Nikon: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  Fujifilm: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  GoPro: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  DJI: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500&h=500&fit=crop',

  // Мониторы
  Monitor: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
  UltraSharp: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
  Predator: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',

  // Периферия
  Keyboard: 'https://images.unsplash.com/photo-1587829191301-d06b92b52d92?w=500&h=500&fit=crop',
  Mouse: 'https://images.unsplash.com/photo-1587829191301-d06b92b52d92?w=500&h=500&fit=crop',

  // Домашняя техника
  Dyson: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
  Roomba: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
  Nespresso: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=500&fit=crop',
  Instant: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=500&fit=crop',
};

async function main() {
  const products = await prisma.product.findMany();

  if (!products.length) {
    console.log('❌ Товаров в базе не найдено');
    return;
  }

  console.log(`📦 Найдено товаров: ${products.length}\n`);

  let updated = 0;

  for (const product of products) {
    // Пропускаем если уже есть картинка
    if (product.imageUrl) {
      console.log(`⏭️  ${product.name} - уже с картинкой`);
      continue;
    }

    // Ищем подходящую картинку по названию (без учета регистра)
    let imageUrl = null;
    const productName = product.name.toLowerCase();
    for (const [keyword, url] of Object.entries(imageMap)) {
      if (productName.includes(keyword.toLowerCase())) {
        imageUrl = url;
        break;
      }
    }

    // Если не нашли - используем дефолтную картинку
    if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop';
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl }
    });

    console.log(`✅ ${product.name} - картинка добавлена`);
    updated++;
  }

  console.log(`\n🎉 Обновлено товаров: ${updated}/${products.length}`);
  console.log(`💡 Перезагрузите браузер чтобы увидеть все картинки`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
