const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

// Маппинг товаров к изображениям
// Замените названия файлов на свои изображения
const imageMapping = {
  // Смартфоны
  'iPhone 16 Pro Max': 'iphone-16-pro-max.jpg',
  'iPhone 16 Pro': 'iphone-16-pro.jpg',
  'iPhone 16': 'iphone16.png',
  'Samsung Galaxy S25 Ultra': 'samsung-s25-ultra.jpg',
  'Samsung Galaxy S25': 'samsung-s25.jpg',
  // Ноутбуки
  'MacBook Air M3': 'macbook-air-m3.jpg',
  'MacBook Pro 16': 'macbookpro16m4.jpg',
  'MacBook Pro 16 M4': 'macbookpro16m4.jpg',
  'LG OLED evo G4 77': 'lgoled.jpeg',
  'MacBook Pro 14 M4': 'macbookpro14.jpg',
  'MSI Titan GT77': 'msititan.jpg',
  'Sony Alpha A7 IV': 'sonyalpha.jpg',
  'Nikon Z6 III': 'nikon.jpg',
  'Dell XPS 13': 'dell-xps-13.jpg',
  'iPad Pro 13 M4': 'ipad.jpg',
  'Samsung Neo QLED 75"': 'samsungtv.jpg',
  'Lenovo ThinkPad X1 Carbon': 'leonvo.jpg',
  'Apple Studio Display 27"': 'apple.jpg',
  'Razer Blade 15': 'razer.jpg',
  'Samsung Galaxy Z Fold 6': 'samsung.jpg',
  // Добавьте свои товары и изображения
};

async function main() {
  console.log('🖼️  Обновление изображений товаров...\n');

  // Проверяем существование папки images
  const imagesDir = path.join(__dirname, 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    console.log('❌ Папка public/images не найдена!');
    console.log('📁 Создайте папку public/images и положите туда свои фото товаров');
    return;
  }

  // Получаем все товары
  const products = await prisma.product.findMany({
    select: { id: true, name: true, imageUrl: true }
  });

  console.log(`📦 Найдено товаров: ${products.length}\n`);

  let updated = 0;

  for (const product of products) {
    // Ищем подходящее изображение
    let imageFile = null;

    // Сначала проверяем точное совпадение
    if (imageMapping[product.name]) {
      imageFile = imageMapping[product.name];
    } else {
      // Ищем по ключевым словам в названии
      for (const [productName, fileName] of Object.entries(imageMapping)) {
        if (product.name.includes(productName.split(' ')[0])) { // По первому слову
          imageFile = fileName;
          break;
        }
      }
    }

    if (!imageFile) {
      console.log(`⏭️  ${product.name} - изображение не найдено в маппинге`);
      continue;
    }

    // Проверяем существование файла
    const imagePath = path.join(imagesDir, imageFile);
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  ${product.name} - файл ${imageFile} не найден`);
      continue;
    }

    // Обновляем imageUrl в базе данных
    const imageUrl = `/images/${imageFile}`;
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl }
    });

    console.log(`✅ ${product.name} - обновлено изображение: ${imageUrl}`);
    updated++;
  }

  console.log(`\n🎉 Обновлено изображений: ${updated}/${products.length}`);
  console.log('\n💡 Перезагрузите браузер чтобы увидеть изменения');
  console.log('\n📝 Чтобы добавить новые изображения:');
  console.log('1. Положите фото в папку public/images/');
  console.log('2. Добавьте соответствие в imageMapping в этом файле');
  console.log('3. Запустите: node update-custom-images.js');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });