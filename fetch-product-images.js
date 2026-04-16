const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const https = require('https');

const adapter = new PrismaPg({ connectionString: 'postgresql://postgres@localhost:5432/smartprice' });
const prisma = new PrismaClient({ adapter });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchUrl(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, { headers: { 'User-Agent': 'SmartPrice/1.0 (educational)' }, timeout: 8000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve);
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

// Wikipedia REST summary API — следует редиректам автоматически
async function getImageByTitle(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const data = await fetchUrl(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
  const src = data?.thumbnail?.source;
  if (!src) return null;
  return src.replace(/\/\d+px-/, '/500px-');
}

// Wikipedia action search — находим точное название статьи
async function searchTitle(query) {
  const encoded = encodeURIComponent(query);
  const data = await fetchUrl(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=3&srnamespace=0&format=json`
  );
  return data?.query?.search?.map(r => r.title) || [];
}

// Сокращаем название для лучшего поиска
function simplifyName(name) {
  return name
    .replace(/\s*\([^)]*\)/g, '')          // (дрон), (2nd generation)
    .replace(/\d+["'']\s*/g, '')            // 65", 55"
    .replace(/\b(4K|8K|Full HD|QLED|OLED|ULED|Neo|WQHD|Mini LED|HDR|Smart)\b/gi, '')
    .replace(/\b(Pro Max|Ultra|Plus)\b/gi, match => match) // сохраняем важные суффиксы
    .replace(/\s+/g, ' ').trim();
}

// Прямое сопоставление продукта → Wikipedia статья
const ARTICLE_MAP = {
  'iPhone 16 Pro Max':            'iPhone 16 Pro',
  'iPhone 16 Plus':               'iPhone 16',
  'iPhone SE 3':                  'iPhone SE (3rd generation)',
  'MacBook Pro 16 M4':            'MacBook Pro (16-inch, M4)',
  'MacBook Pro 14 M4':            'MacBook Pro (14-inch, M4)',
  'MacBook Air 15 M3':            'MacBook Air (15-inch)',
  'MacBook Air 13 M3':            'MacBook Air (13-inch, M3)',
  'iPad Pro 13 M4':               'iPad Pro (M4)',
  'iPad Pro 11 M4':               'iPad Pro (M4)',
  'iPad Air 13 M2':               'iPad Air (M2)',
  'iPad Air 11 M2':               'iPad Air (M2)',
  'iPad mini 7':                  'iPad mini (7th generation)',
  'iPad 10':                      'iPad (10th generation)',
  'AirPods Pro 2':                'AirPods Pro',
  'AirPods 4':                    'AirPods (4th generation)',
  'Apple Watch Series 10':        'Apple Watch Series 10',
  'Apple Watch Ultra 2':          'Apple Watch Ultra 2',
  'Apple Watch SE 2':             'Apple Watch SE',
  'Apple TV 4K 3rd gen':          'Apple TV 4K',
  'Apple HomePod mini':           'HomePod mini',
  'Apple Studio Display 27"':     'Apple Studio Display',
  'Samsung Galaxy S25 Ultra':     'Samsung Galaxy S25',
  'Samsung Galaxy S25+':          'Samsung Galaxy S25',
  'Samsung Galaxy Tab S9 Ultra':  'Samsung Galaxy Tab S9',
  'Samsung Galaxy Tab S9+':       'Samsung Galaxy Tab S9',
  'Samsung Galaxy Tab S9 FE':     'Samsung Galaxy Tab S9 FE',
  'Samsung Galaxy Tab A9+':       'Samsung Galaxy Tab A9',
  'Samsung Galaxy Watch Ultra':   'Samsung Galaxy Watch Ultra',
  'Samsung Galaxy Watch 7':       'Samsung Galaxy Watch 7',
  'Samsung Galaxy Buds3 Pro':     'Samsung Galaxy Buds3',
  'Samsung QLED 65" 4K':          'Samsung QLED',
  'Samsung QLED 55" 4K':          'Samsung QLED',
  'Samsung Neo QLED 75"':         'Samsung Neo QLED',
  'Samsung 43" Full HD':          'Samsung television',
  'Samsung Frame TV 55"':         'The Frame (Samsung)',
  'Samsung Odyssey G9 49"':       'Samsung Odyssey G9',
  'Samsung 49" OLED Odyssey':     'Samsung Odyssey OLED G9',
  'LG OLED C4 65"':               'LG C4 OLED',
  'LG OLED C4 55"':               'LG C4 OLED',
  'LG OLED evo G4 77"':           'LG G4 OLED',
  'LG QNED 75" 4K':               'LG QNED',
  'LG 43" 4K Smart TV':           'LG Electronics',
  'LG UltraGear 27" 4K':          'LG UltraGear',
  'LG UltraWide 34" WQHD':        'LG UltraWide',
  'LG 32" 4K HDR':                'LG monitor',
  'Sony Bravia XR 65" OLED':      'Sony Bravia XR',
  'Sony Bravia 55" 4K':           'Sony Bravia',
  'Sony WH-1000XM5':              'Sony WH-1000XM5',
  'Sony WF-1000XM5':              'Sony WF-1000XM5',
  'Sony Xperia 1 VI':             'Sony Xperia 1 VI',
  'Sony Alpha A7 IV':             'Sony α7 IV',
  'Sony Alpha A6700':             'Sony α6700',
  'Xiaomi 14 Ultra':              'Xiaomi 14 Ultra',
  'Xiaomi 14':                    'Xiaomi 14',
  'Xiaomi Redmi Note 13 Pro':     'Xiaomi Redmi Note 13',
  'Xiaomi Redmi Note 13':         'Xiaomi Redmi Note 13',
  'Xiaomi Redmi 13C':             'Xiaomi Redmi 13C',
  'Xiaomi Redmi 12':              'Xiaomi Redmi 12',
  'Xiaomi Pad 6':                 'Xiaomi Pad 6',
  'Xiaomi TV A Pro 55"':          'Xiaomi Smart TV',
  'Xiaomi TV S Pro 65"':          'Xiaomi Smart TV',
  'Xiaomi Watch S4':              'Xiaomi Watch S4',
  'Xiaomi Buds 5 Pro':            'Xiaomi earbuds',
  'Xiaomi Smart Speaker':         'Xiaomi Smart Speaker',
  'Xiaomi Smart Air Purifier':    'Xiaomi Mi Air Purifier',
  'Xiaomi Robot Vacuum S20+':     'Xiaomi Mi Robot Vacuum',
  'Xiaomi Mi Notebook Pro':       'Xiaomi Mi Notebook',
  'POCO X6 Pro':                  'Xiaomi POCO X6 Pro',
  'POCO M6 Pro':                  'Xiaomi POCO M6 Pro',
  'POCO F6 Pro':                  'Xiaomi POCO F6 Pro',
  'OnePlus 12':                   'OnePlus 12',
  'Google Pixel 9 Pro':           'Google Pixel 9 Pro',
  'Google Pixel 9':               'Google Pixel 9',
  'Google Pixel Watch 3':         'Google Pixel Watch 3',
  'Google Chromecast 4K':         'Chromecast',
  'Huawei P60 Pro':               'Huawei P60 Pro',
  'Huawei MatePad Pro 13':        'Huawei MatePad Pro',
  'Huawei MateBook D16':          'Huawei MateBook D',
  'Huawei Watch GT 5 Pro':        'Huawei Watch GT',
  'Huawei FreeBuds Pro 3':        'Huawei FreeBuds Pro',
  'Honor 200 Pro':                'Honor 200 Pro',
  'Honor MagicBook X16':          'Honor MagicBook',
  'OPPO Reno 12':                 'OPPO Reno 12',
  'OPPO Pad 2':                   'OPPO Pad',
  'Realme 12 Pro+':               'Realme 12 Pro+',
  'Realme C67':                   'Realme C67',
  'Realme GT 6':                  'Realme GT 6',
  'Vivo V30 Pro':                 'Vivo V30 Pro',
  'Nokia G42':                    'Nokia G42',
  'Tecno Spark 20 Pro':           'TECNO Mobile',
  'Infinix Note 40 Pro':          'Infinix Mobile',
  'Motorola Edge 50 Pro':         'Motorola Edge 50 Pro',
  'ASUS ROG Zephyrus G14':        'ASUS ROG Zephyrus G14',
  'ASUS ROG Strix G16':           'Asus ROG Strix',
  'ASUS ZenBook 14 OLED':         'ASUS ZenBook',
  'ASUS VivoBook 15':             'Asus VivoBook',
  'ASUS ROG Ally':                'ASUS ROG Ally',
  'ASUS ROG Swift 27" 360Hz':     'Asus ROG Swift',
  'ASUS ProArt 32" 4K OLED':      'Asus ProArt',
  'Lenovo ThinkPad X1 Carbon':    'ThinkPad X1 Carbon',
  'Lenovo Legion Pro 5':          'Lenovo Legion 5 Pro',
  'Lenovo IdeaPad Slim 5':        'Lenovo IdeaPad',
  'Lenovo IdeaPad Gaming 3':      'Lenovo IdeaPad',
  'Lenovo Legion Go':             'Lenovo Legion Go',
  'Lenovo Tab P12 Pro':           'Lenovo Tab P12 Pro',
  'HP Spectre x360 14':           'HP Spectre x360',
  'HP Envy 15':                   'HP Envy',
  'HP Pavilion 15':               'HP Pavilion',
  'HP OMEN 16':                   'HP Omen',
  'Dell XPS 15':                  'Dell XPS 15',
  'Dell Inspiron 15':             'Dell Inspiron',
  'Dell G15 Gaming':              'Dell G Series',
  'Dell UltraSharp 27" 4K':       'Dell UltraSharp',
  'MSI Titan GT77':               'MSI laptop',
  'MSI Stealth 16':               'MSI laptop',
  'MSI MAG 27" 240Hz':            'MSI monitor',
  'Acer Nitro 17':                'Acer Nitro',
  'Acer Swift 3':                 'Acer Swift',
  'Acer Predator Helios 16':      'Acer Predator Helios',
  'Samsung Galaxy Book 4 Pro':    'Samsung Galaxy Book',
  'Microsoft Surface Pro 10':     'Microsoft Surface Pro',
  'Razer Blade 15':               'Razer Blade (laptop)',
  'BenQ EW3280U 32" 4K':          'BenQ monitor',
  'AOC 27" 165Hz':                'AOC (monitor)',
  'Philips 27" 4K IPS':           'Philips monitor',
  'ViewSonic VX2780 27"':         'ViewSonic',
  'Hisense 55" QLED':             'Hisense television',
  'Hisense 65" ULED':             'Hisense ULED',
  'TCL 55" QLED':                 'TCL (brand)',
  'TCL 75" Mini LED':             'TCL (brand)',
  'Philips 55" OLED':             'Philips television',
  'Haier 50" 4K':                 'Haier',
  'Xbox Series X':                'Xbox Series X',
  'Xbox Series S':                'Xbox Series S',
  'Xbox Controller':              'Xbox wireless controller',
  'Nintendo Switch OLED':         'Nintendo Switch (OLED model)',
  'Nintendo Switch Lite':         'Nintendo Switch Lite',
  'Steam Deck OLED':              'Steam Deck',
  'DualSense PS5':                'DualSense',
  'PlayStation Portal':           'PlayStation Portal',
  'Razer Kishi V2':               'Razer Kishi',
  'Logitech G Pro X':             'Logitech G Pro',
  'Meta Quest 3':                 'Meta Quest 3',
  'Garmin Fenix 8':               'Garmin Fēnix',
  'Garmin Venu 3':                'Garmin Venu',
  'Fitbit Charge 6':              'Fitbit Charge',
  'Amazfit GTR 4':                'Amazfit GTR',
  'Amazfit Balance':              'Amazfit',
  'Withings ScanWatch 2':         'Withings ScanWatch',
  'Polar Vantage V3':             'Polar Vantage',
  'Bose QuietComfort 45':         'Bose QuietComfort 45',
  'Bose QC Earbuds II':           'Bose QuietComfort Earbuds',
  'Bose SoundLink Max':           'Bose SoundLink',
  'JBL Tour Pro 2':               'JBL Tour Pro 2',
  'JBL Live 770NC':               'JBL (company)',
  'JBL Charge 5':                 'JBL Charge',
  'JBL Boombox 3':                'JBL Boombox',
  'Jabra Elite 10':               'Jabra Elite',
  'Nothing Ear (2)':              'Nothing Ear (2)',
  'Beats Studio Pro':             'Beats Studio Pro',
  'Sennheiser Momentum 4':        'Sennheiser Momentum',
  'OnePlus Buds 3':               'OnePlus Buds',
  'Anker Soundcore Liberty 4':    'Anker (company)',
  'Anker Soundcore Motion X':     'Anker (company)',
  'Marshall Major V':             'Marshall headphones',
  'Marshall Stanmore III':        'Marshall Stanmore',
  'Harman Kardon Onyx 8':         'Harman Kardon',
  'Bang & Olufsen Beosound':      'Bang & Olufsen',
  'Sony SRS-XB43':                'Sony speaker',
  'Canon EOS R8':                 'Canon EOS R8',
  'Canon EOS R50':                'Canon EOS R50',
  'Canon EOS 250D':               'Canon EOS 250D',
  'Nikon Z6 III':                 'Nikon Z6III',
  'Nikon Z50 II':                 'Nikon Z50',
  'Fujifilm X-T5':                'Fujifilm X-T5',
  'Fujifilm X100VI':              'Fujifilm X100VI',
  'GoPro Hero 13':                'GoPro Hero 13',
  'DJI Osmo Action 4':            'DJI Osmo Action 4',
  'DJI Mini 4 Pro (дрон)':        'DJI Mini 4 Pro',
  'DJI Air 3 (дрон)':             'DJI Air 3',
  'Sony ZV-E10 II':               'Sony ZV-E10 II',
  'Instax Mini 12':               'Fujifilm Instax Mini 12',
  'iRobot Roomba j9+':            'iRobot Roomba',
  'Roborock S8 Pro Ultra':        'Roborock',
  'Amazon Echo Show 10':          'Amazon Echo Show',
  'Ring Video Doorbell 4':        'Ring Video Doorbell',
  'TP-Link Deco XE75 WiFi 6':     'TP-Link Deco',
  'Philips Hue Starter Kit':      'Philips Hue',
};

async function resolveImage(product) {
  const articleTitle = ARTICLE_MAP[product.name];
  const candidates = articleTitle
    ? [articleTitle, product.name]
    : [product.name, simplifyName(product.name)];

  for (const candidate of candidates) {
    // Сначала пробуем прямой REST запрос
    let img = await getImageByTitle(candidate);
    if (img) return img;

    // Затем ищем через search API
    const titles = await searchTitle(candidate);
    for (const title of titles.slice(0, 2)) {
      img = await getImageByTitle(title);
      if (img) return img;
      await sleep(80);
    }
    await sleep(80);
  }
  return null;
}

async function main() {
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  console.log(`Товаров: ${products.length}\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const product of products) {
    if (product.imageUrl && product.imageUrl.includes('wikimedia')) {
      skipped++;
      continue;
    }

    const imageUrl = await resolveImage(product);
    await sleep(200);

    if (imageUrl) {
      await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
      updated++;
      process.stdout.write(`✓ [${updated + skipped}/${products.length}] ${product.name}\n`);
    } else {
      failed++;
      process.stdout.write(`✗ [${updated + skipped + failed}/${products.length}] ${product.name}\n`);
    }
  }

  console.log(`\n✅ Обновлено: ${updated} | Пропущено: ${skipped} | Не найдено: ${failed}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
