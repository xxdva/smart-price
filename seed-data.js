const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: 'postgresql://postgres@localhost:5432/smartprice' });
const prisma = new PrismaClient({ adapter });

// ===== НОВЫЕ МАГАЗИНЫ =====
const newStores = [
  { name: 'Alser',          url: 'https://alser.kz' },
  { name: 'Kaspi Магазин',  url: 'https://shop.kaspi.kz' },
  { name: 'DNS',            url: 'https://www.dns-shop.kz' },
  { name: 'Евrika',         url: 'https://evrika.com' },
  { name: 'Forpost',        url: 'https://forpost.kz' },
  { name: 'iSpace',         url: 'https://ispace.kz' },
  { name: 'Марвин',         url: 'https://marwin.kz' },
  { name: 'BTS Digital',    url: 'https://bts.kz' },
  { name: 'Shop.kz',        url: 'https://shop.kz' },
  { name: 'Eldorado',       url: 'https://eldorado.kz' },
  { name: 'Samsung Store',  url: 'https://samsung.com/kz' },
  { name: 'Xiaomi Store',   url: 'https://mi.kz' },
];

// ===== 200 ПОПУЛЯРНЫХ ТОВАРОВ =====
const products = [
  // 📱 СМАРТФОНЫ (40)
  { name: 'iPhone 16 Pro Max',         icon: '📱', basePrice: 680000 },
  { name: 'iPhone 16 Pro',             icon: '📱', basePrice: 580000 },
  { name: 'iPhone 16',                 icon: '📱', basePrice: 450000 },
  { name: 'iPhone 16 Plus',            icon: '📱', basePrice: 490000 },
  { name: 'iPhone 14',                 icon: '📱', basePrice: 320000 },
  { name: 'iPhone 13',                 icon: '📱', basePrice: 260000 },
  { name: 'Samsung Galaxy S25 Ultra',  icon: '📱', basePrice: 720000 },
  { name: 'Samsung Galaxy S25+',       icon: '📱', basePrice: 580000 },
  { name: 'Samsung Galaxy S25',        icon: '📱', basePrice: 460000 },
  { name: 'Samsung Galaxy A55',        icon: '📱', basePrice: 210000 },
  { name: 'Samsung Galaxy A35',        icon: '📱', basePrice: 160000 },
  { name: 'Samsung Galaxy A15',        icon: '📱', basePrice: 90000  },
  { name: 'Xiaomi 14 Ultra',           icon: '📱', basePrice: 420000 },
  { name: 'Xiaomi 14',                 icon: '📱', basePrice: 280000 },
  { name: 'Xiaomi Redmi Note 13 Pro',  icon: '📱', basePrice: 130000 },
  { name: 'Xiaomi Redmi Note 13',      icon: '📱', basePrice: 95000  },
  { name: 'Xiaomi Redmi 13C',          icon: '📱', basePrice: 65000  },
  { name: 'POCO X6 Pro',               icon: '📱', basePrice: 175000 },
  { name: 'POCO M6 Pro',               icon: '📱', basePrice: 110000 },
  { name: 'Realme 12 Pro+',            icon: '📱', basePrice: 155000 },
  { name: 'Realme C67',                icon: '📱', basePrice: 75000  },
  { name: 'OnePlus 12',                icon: '📱', basePrice: 350000 },
  { name: 'Google Pixel 9 Pro',        icon: '📱', basePrice: 510000 },
  { name: 'Google Pixel 9',            icon: '📱', basePrice: 380000 },
  { name: 'Huawei P60 Pro',            icon: '📱', basePrice: 340000 },
  { name: 'Honor 200 Pro',             icon: '📱', basePrice: 220000 },
  { name: 'Vivo V30 Pro',              icon: '📱', basePrice: 195000 },
  { name: 'OPPO Reno 12',              icon: '📱', basePrice: 185000 },
  { name: 'Tecno Spark 20 Pro',        icon: '📱', basePrice: 70000  },
  { name: 'Nokia G42',                 icon: '📱', basePrice: 65000  },
  { name: 'Sony Xperia 1 VI',          icon: '📱', basePrice: 620000 },
  { name: 'Samsung Galaxy Z Fold 6',   icon: '📱', basePrice: 890000 },
  { name: 'Samsung Galaxy Z Flip 6',   icon: '📱', basePrice: 490000 },
  { name: 'iPhone SE 3',               icon: '📱', basePrice: 220000 },
  { name: 'Xiaomi Redmi 12',           icon: '📱', basePrice: 80000  },
  { name: 'Samsung Galaxy A25',        icon: '📱', basePrice: 130000 },
  { name: 'Realme GT 6',               icon: '📱', basePrice: 240000 },
  { name: 'POCO F6 Pro',               icon: '📱', basePrice: 230000 },
  { name: 'Motorola Edge 50 Pro',      icon: '📱', basePrice: 200000 },
  { name: 'Infinix Note 40 Pro',       icon: '📱', basePrice: 95000  },

  // 💻 НОУТБУКИ (30)
  { name: 'MacBook Pro 16 M4',         icon: '💻', basePrice: 1200000 },
  { name: 'MacBook Pro 14 M4',         icon: '💻', basePrice: 980000  },
  { name: 'MacBook Air 15 M3',         icon: '💻', basePrice: 680000  },
  { name: 'MacBook Air 13 M3',         icon: '💻', basePrice: 560000  },
  { name: 'ASUS ROG Zephyrus G14',     icon: '💻', basePrice: 650000  },
  { name: 'ASUS ROG Strix G16',        icon: '💻', basePrice: 580000  },
  { name: 'ASUS ZenBook 14 OLED',      icon: '💻', basePrice: 320000  },
  { name: 'ASUS VivoBook 15',          icon: '💻', basePrice: 190000  },
  { name: 'Lenovo ThinkPad X1 Carbon', icon: '💻', basePrice: 750000  },
  { name: 'Lenovo Legion Pro 5',       icon: '💻', basePrice: 560000  },
  { name: 'Lenovo IdeaPad Slim 5',     icon: '💻', basePrice: 220000  },
  { name: 'Lenovo IdeaPad Gaming 3',   icon: '💻', basePrice: 290000  },
  { name: 'HP Spectre x360 14',        icon: '💻', basePrice: 590000  },
  { name: 'HP Envy 15',                icon: '💻', basePrice: 380000  },
  { name: 'HP Pavilion 15',            icon: '💻', basePrice: 210000  },
  { name: 'HP OMEN 16',                icon: '💻', basePrice: 490000  },
  { name: 'Dell XPS 15',               icon: '💻', basePrice: 720000  },
  { name: 'Dell Inspiron 15',          icon: '💻', basePrice: 230000  },
  { name: 'Dell G15 Gaming',           icon: '💻', basePrice: 340000  },
  { name: 'MSI Titan GT77',            icon: '💻', basePrice: 980000  },
  { name: 'MSI Stealth 16',            icon: '💻', basePrice: 650000  },
  { name: 'Acer Nitro 17',             icon: '💻', basePrice: 350000  },
  { name: 'Acer Swift 3',              icon: '💻', basePrice: 250000  },
  { name: 'Acer Predator Helios 16',   icon: '💻', basePrice: 580000  },
  { name: 'Samsung Galaxy Book 4 Pro', icon: '💻', basePrice: 620000  },
  { name: 'Microsoft Surface Pro 10',  icon: '💻', basePrice: 720000  },
  { name: 'Razer Blade 15',            icon: '💻', basePrice: 880000  },
  { name: 'Huawei MateBook D16',       icon: '💻', basePrice: 290000  },
  { name: 'Honor MagicBook X16',       icon: '💻', basePrice: 195000  },
  { name: 'Xiaomi Mi Notebook Pro',    icon: '💻', basePrice: 310000  },

  // 📟 ПЛАНШЕТЫ (15)
  { name: 'iPad Pro 13 M4',            icon: '📟', basePrice: 850000  },
  { name: 'iPad Pro 11 M4',            icon: '📟', basePrice: 620000  },
  { name: 'iPad Air 13 M2',            icon: '📟', basePrice: 520000  },
  { name: 'iPad Air 11 M2',            icon: '📟', basePrice: 390000  },
  { name: 'iPad 10',                   icon: '📟', basePrice: 250000  },
  { name: 'iPad mini 7',               icon: '📟', basePrice: 340000  },
  { name: 'Samsung Galaxy Tab S9 Ultra', icon: '📟', basePrice: 680000 },
  { name: 'Samsung Galaxy Tab S9+',    icon: '📟', basePrice: 490000  },
  { name: 'Samsung Galaxy Tab S9 FE',  icon: '📟', basePrice: 220000  },
  { name: 'Samsung Galaxy Tab A9+',    icon: '📟', basePrice: 140000  },
  { name: 'Xiaomi Pad 6',              icon: '📟', basePrice: 190000  },
  { name: 'Xiaomi Redmi Pad Pro',      icon: '📟', basePrice: 150000  },
  { name: 'Lenovo Tab P12 Pro',        icon: '📟', basePrice: 310000  },
  { name: 'Huawei MatePad Pro 13',     icon: '📟', basePrice: 420000  },
  { name: 'OPPO Pad 2',                icon: '📟', basePrice: 200000  },

  // 📺 ТЕЛЕВИЗОРЫ (20)
  { name: 'Samsung QLED 65" 4K',       icon: '📺', basePrice: 480000  },
  { name: 'Samsung QLED 55" 4K',       icon: '📺', basePrice: 320000  },
  { name: 'Samsung Neo QLED 75"',      icon: '📺', basePrice: 780000  },
  { name: 'LG OLED C4 65"',            icon: '📺', basePrice: 650000  },
  { name: 'LG OLED C4 55"',            icon: '📺', basePrice: 450000  },
  { name: 'LG QNED 75" 4K',            icon: '📺', basePrice: 350000  },
  { name: 'Sony Bravia XR 65" OLED',   icon: '📺', basePrice: 720000  },
  { name: 'Sony Bravia 55" 4K',        icon: '📺', basePrice: 380000  },
  { name: 'Xiaomi TV A Pro 55"',       icon: '📺', basePrice: 180000  },
  { name: 'Xiaomi TV S Pro 65"',       icon: '📺', basePrice: 280000  },
  { name: 'Hisense 55" QLED',          icon: '📺', basePrice: 200000  },
  { name: 'Hisense 65" ULED',          icon: '📺', basePrice: 310000  },
  { name: 'TCL 55" QLED',              icon: '📺', basePrice: 165000  },
  { name: 'TCL 75" Mini LED',          icon: '📺', basePrice: 420000  },
  { name: 'Philips 55" OLED',          icon: '📺', basePrice: 490000  },
  { name: 'Samsung 43" Full HD',       icon: '📺', basePrice: 120000  },
  { name: 'LG 43" 4K Smart TV',        icon: '📺', basePrice: 155000  },
  { name: 'Haier 50" 4K',              icon: '📺', basePrice: 140000  },
  { name: 'Samsung Frame TV 55"',      icon: '📺', basePrice: 390000  },
  { name: 'LG OLED evo G4 77"',        icon: '📺', basePrice: 1100000 },

  // 🎧 НАУШНИКИ (20)
  { name: 'AirPods Pro 2',             icon: '🎧', basePrice: 130000  },
  { name: 'AirPods 4',                 icon: '🎧', basePrice: 90000   },
  { name: 'AirPods Max',               icon: '🎧', basePrice: 280000  },
  { name: 'Sony WH-1000XM5',           icon: '🎧', basePrice: 165000  },
  { name: 'Sony WF-1000XM5',           icon: '🎧', basePrice: 125000  },
  { name: 'Samsung Galaxy Buds3 Pro',  icon: '🎧', basePrice: 95000   },
  { name: 'Samsung Galaxy Buds3',      icon: '🎧', basePrice: 65000   },
  { name: 'Bose QuietComfort 45',      icon: '🎧', basePrice: 145000  },
  { name: 'Bose QC Earbuds II',        icon: '🎧', basePrice: 120000  },
  { name: 'JBL Tour Pro 2',            icon: '🎧', basePrice: 75000   },
  { name: 'JBL Live 770NC',            icon: '🎧', basePrice: 55000   },
  { name: 'Jabra Elite 10',            icon: '🎧', basePrice: 110000  },
  { name: 'Xiaomi Buds 5 Pro',         icon: '🎧', basePrice: 55000   },
  { name: 'Nothing Ear (2)',           icon: '🎧', basePrice: 60000   },
  { name: 'Beats Studio Pro',          icon: '🎧', basePrice: 130000  },
  { name: 'Sennheiser Momentum 4',     icon: '🎧', basePrice: 155000  },
  { name: 'Huawei FreeBuds Pro 3',     icon: '🎧', basePrice: 70000   },
  { name: 'OnePlus Buds 3',            icon: '🎧', basePrice: 40000   },
  { name: 'Anker Soundcore Liberty 4', icon: '🎧', basePrice: 35000   },
  { name: 'Marshall Major V',          icon: '🎧', basePrice: 65000   },

  // ⌚ УМНЫЕ ЧАСЫ (15)
  { name: 'Apple Watch Series 10',     icon: '⌚', basePrice: 220000  },
  { name: 'Apple Watch Ultra 2',       icon: '⌚', basePrice: 420000  },
  { name: 'Apple Watch SE 2',          icon: '⌚', basePrice: 130000  },
  { name: 'Samsung Galaxy Watch 7',    icon: '⌚', basePrice: 135000  },
  { name: 'Samsung Galaxy Watch Ultra', icon: '⌚', basePrice: 220000 },
  { name: 'Garmin Fenix 8',            icon: '⌚', basePrice: 480000  },
  { name: 'Garmin Venu 3',             icon: '⌚', basePrice: 190000  },
  { name: 'Xiaomi Watch S4',           icon: '⌚', basePrice: 50000   },
  { name: 'Huawei Watch GT 5 Pro',     icon: '⌚', basePrice: 115000  },
  { name: 'Fitbit Charge 6',           icon: '⌚', basePrice: 60000   },
  { name: 'Amazfit GTR 4',             icon: '⌚', basePrice: 45000   },
  { name: 'Amazfit Balance',           icon: '⌚', basePrice: 80000   },
  { name: 'Google Pixel Watch 3',      icon: '⌚', basePrice: 165000  },
  { name: 'Withings ScanWatch 2',      icon: '⌚', basePrice: 120000  },
  { name: 'Polar Vantage V3',          icon: '⌚', basePrice: 250000  },

  // 🎮 ИГРОВЫЕ ПРИСТАВКИ (15)
  { name: 'PlayStation 5',             icon: '🎮', basePrice: 280000  },
  { name: 'PlayStation 5 Slim',        icon: '🎮', basePrice: 240000  },
  { name: 'Xbox Series X',             icon: '🎮', basePrice: 270000  },
  { name: 'Xbox Series S',             icon: '🎮', basePrice: 145000  },
  { name: 'Nintendo Switch OLED',      icon: '🎮', basePrice: 170000  },
  { name: 'Nintendo Switch Lite',      icon: '🎮', basePrice: 95000   },
  { name: 'Steam Deck OLED',           icon: '🎮', basePrice: 290000  },
  { name: 'DualSense PS5',             icon: '🎮', basePrice: 28000   },
  { name: 'Xbox Controller',           icon: '🎮', basePrice: 22000   },
  { name: 'Razer Kishi V2',            icon: '🎮', basePrice: 35000   },
  { name: 'Logitech G Pro X',          icon: '🎮', basePrice: 55000   },
  { name: 'ASUS ROG Ally',             icon: '🎮', basePrice: 320000  },
  { name: 'Lenovo Legion Go',          icon: '🎮', basePrice: 350000  },
  { name: 'PlayStation Portal',        icon: '🎮', basePrice: 80000   },
  { name: 'Meta Quest 3',              icon: '🎮', basePrice: 195000  },

  // 📸 ФОТО И ВИДЕО (15)
  { name: 'Sony Alpha A7 IV',          icon: '📸', basePrice: 980000  },
  { name: 'Sony Alpha A6700',          icon: '📸', basePrice: 580000  },
  { name: 'Canon EOS R8',              icon: '📸', basePrice: 560000  },
  { name: 'Canon EOS R50',             icon: '📸', basePrice: 340000  },
  { name: 'Nikon Z6 III',              icon: '📸', basePrice: 890000  },
  { name: 'Nikon Z50 II',              icon: '📸', basePrice: 420000  },
  { name: 'Fujifilm X-T5',             icon: '📸', basePrice: 750000  },
  { name: 'Fujifilm X100VI',           icon: '📸', basePrice: 650000  },
  { name: 'GoPro Hero 13',             icon: '📸', basePrice: 180000  },
  { name: 'DJI Osmo Action 4',         icon: '📸', basePrice: 130000  },
  { name: 'DJI Mini 4 Pro (дрон)',     icon: '📸', basePrice: 320000  },
  { name: 'DJI Air 3 (дрон)',          icon: '📸', basePrice: 480000  },
  { name: 'Instax Mini 12',            icon: '📸', basePrice: 35000   },
  { name: 'Sony ZV-E10 II',            icon: '📸', basePrice: 390000  },
  { name: 'Canon EOS 250D',            icon: '📸', basePrice: 280000  },

  // 🖥️ МОНИТОРЫ (15)
  { name: 'Samsung Odyssey G9 49"',    icon: '🖥️', basePrice: 580000  },
  { name: 'Samsung Smart Monitor M8', icon: '🖥️', basePrice: 220000  },
  { name: 'LG UltraGear 27" 4K',      icon: '🖥️', basePrice: 190000  },
  { name: 'LG UltraWide 34" WQHD',    icon: '🖥️', basePrice: 230000  },
  { name: 'ASUS ROG Swift 27" 360Hz', icon: '🖥️', basePrice: 280000  },
  { name: 'ASUS ProArt 32" 4K OLED',  icon: '🖥️', basePrice: 420000  },
  { name: 'Dell UltraSharp 27" 4K',   icon: '🖥️', basePrice: 195000  },
  { name: 'BenQ EW3280U 32" 4K',      icon: '🖥️', basePrice: 175000  },
  { name: 'MSI MAG 27" 240Hz',        icon: '🖥️', basePrice: 130000  },
  { name: 'AOC 27" 165Hz',            icon: '🖥️', basePrice: 90000   },
  { name: 'Philips 27" 4K IPS',       icon: '🖥️', basePrice: 140000  },
  { name: 'ViewSonic VX2780 27"',     icon: '🖥️', basePrice: 100000  },
  { name: 'Apple Studio Display 27"', icon: '🖥️', basePrice: 850000  },
  { name: 'LG 32" 4K HDR',           icon: '🖥️', basePrice: 160000  },
  { name: 'Samsung 49" OLED Odyssey', icon: '🖥️', basePrice: 750000  },

  // 🔊 АУДИО (10)
  { name: 'JBL Charge 5',             icon: '🔊', basePrice: 55000   },
  { name: 'JBL Boombox 3',            icon: '🔊', basePrice: 120000  },
  { name: 'Sony SRS-XB43',            icon: '🔊', basePrice: 65000   },
  { name: 'Bose SoundLink Max',        icon: '🔊', basePrice: 110000  },
  { name: 'Marshall Stanmore III',     icon: '🔊', basePrice: 130000  },
  { name: 'Xiaomi Smart Speaker',      icon: '🔊', basePrice: 25000   },
  { name: 'Apple HomePod mini',        icon: '🔊', basePrice: 65000   },
  { name: 'Harman Kardon Onyx 8',      icon: '🔊', basePrice: 95000   },
  { name: 'Anker Soundcore Motion X',  icon: '🔊', basePrice: 30000   },
  { name: 'Bang & Olufsen Beosound',   icon: '🔊', basePrice: 280000  },

  // 🏠 УМНЫЙ ДОМ (10)
  { name: 'Xiaomi Robot Vacuum S20+',  icon: '🏠', basePrice: 180000  },
  { name: 'iRobot Roomba j9+',         icon: '🏠', basePrice: 420000  },
  { name: 'Roborock S8 Pro Ultra',     icon: '🏠', basePrice: 350000  },
  { name: 'Amazon Echo Show 10',       icon: '🏠', basePrice: 80000   },
  { name: 'Apple TV 4K 3rd gen',       icon: '🏠', basePrice: 75000   },
  { name: 'Google Chromecast 4K',      icon: '🏠', basePrice: 35000   },
  { name: 'Xiaomi Smart Air Purifier', icon: '🏠', basePrice: 60000   },
  { name: 'TP-Link Deco XE75 WiFi 6',  icon: '🏠', basePrice: 85000   },
  { name: 'Philips Hue Starter Kit',   icon: '🏠', basePrice: 45000   },
  { name: 'Ring Video Doorbell 4',     icon: '🏠', basePrice: 70000   },
];

// Разброс цен по магазинам (в процентах от базовой цены)
const storeVariations = [
  0,      // базовая цена
  +0.03,  // +3%
  -0.02,  // -2%
  +0.05,  // +5%
  +0.01,  // +1%
  -0.04,  // -4%
  +0.07,  // +7%
  -0.06,  // -6%
  +0.02,  // +2%
  -0.03,  // -3%
  +0.04,  // +4%
  -0.01,  // -1%
  +0.06,  // +6%
  -0.05,  // -5%
  +0.08,  // +8%
  -0.07,  // -7%
  +0.09,  // +9%
];

async function main() {
  console.log('Начинаем добавление данных...\n');

  // Получаем все существующие магазины
  const existingStores = await prisma.store.findMany();
  console.log(`Существующих магазинов: ${existingStores.length}`);
  existingStores.forEach(s => console.log(`  - ${s.name}`));

  // Добавляем новые магазины (только если ещё нет)
  const addedStores = [];
  for (const store of newStores) {
    const exists = await prisma.store.findFirst({ where: { name: store.name } });
    if (!exists) {
      const s = await prisma.store.create({ data: store });
      addedStores.push(s);
      console.log(`✓ Добавлен магазин: ${s.name}`);
    } else {
      addedStores.push(exists);
      console.log(`⚠ Магазин уже есть: ${exists.name}`);
    }
  }

  const allStores = await prisma.store.findMany();
  console.log(`\nВсего магазинов: ${allStores.length}`);

  // Добавляем товары
  console.log('\nДобавляем товары...');
  let addedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    // Пропускаем если уже есть
    const exists = await prisma.product.findFirst({ where: { name: product.name } });
    if (exists) {
      skippedCount++;
      continue;
    }

    // Создаём товар
    const p = await prisma.product.create({
      data: { name: product.name, icon: product.icon }
    });

    // Добавляем цены для КАЖДОГО магазина
    const priceData = allStores.map((store, i) => {
      const variation = storeVariations[i % storeVariations.length];
      const price = Math.round(product.basePrice * (1 + variation));
      // Округляем до красивого числа (до тысяч)
      const roundedPrice = Math.round(price / 1000) * 1000;
      return {
        productId: p.id,
        storeId: store.id,
        price: roundedPrice
      };
    });

    await prisma.price.createMany({ data: priceData });
    addedCount++;

    if (addedCount % 20 === 0) {
      console.log(`  Добавлено: ${addedCount} товаров...`);
    }
  }

  console.log(`\n✅ Готово!`);
  console.log(`   Добавлено товаров: ${addedCount}`);
  console.log(`   Пропущено (уже есть): ${skippedCount}`);
  console.log(`   Магазинов всего: ${allStores.length}`);
  console.log(`   Цен добавлено: ~${addedCount * allStores.length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
