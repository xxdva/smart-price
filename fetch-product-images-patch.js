// Патч: прямые Wikimedia Commons URL для товаров без фото
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: 'postgresql://postgres@localhost:5432/smartprice' });
const prisma = new PrismaClient({ adapter });

// Прямые URL на файлы Wikimedia Commons (Special:FilePath перенаправляет на CDN)
const W = name => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=500`;

const DIRECT_IMAGES = {
  'Ноутбук Lenovo IdeaPad':     W('Lenovo_IdeaPad_S340.jpg'),
  'Realme C67':                  W('Realme_C67_4G.jpg'),
  'OnePlus 12':                  W('OnePlus_12_Flowy_Emerald.jpg'),
  'OPPO Reno 12':                W('OPPO_Reno4_Pro_5G.jpg'),
  'Tecno Spark 20 Pro':          W('TECNO_Spark_10_Pro.jpg'),
  'Sony Xperia 1 VI':            W('Sony_Xperia_1_VI.jpg'),
  'Realme GT 6':                 W('Realme_GT_Neo_3.jpg'),
  'Infinix Note 40 Pro':         W('Infinix_Note_30_Pro.jpg'),
  'ASUS ZenBook 14 OLED':        W('ASUS_ZenBook_14_OLED_UX3402.jpg'),
  'ASUS VivoBook 15':            W('ASUS_VivoBook_15_A507.jpg'),
  'HP Spectre x360 14':          W('HP_Spectre_x360_14.jpg'),
  'HP Envy 15':                  W('HP_ENVY_15.jpg'),
  'Lenovo Tab P12 Pro':          W('Lenovo_Tab_P12_Pro.jpg'),
  'OPPO Pad 2':                  W('OPPO_Pad_2.jpg'),
  'LG OLED evo G4 77"':          W('LG_OLED_G4.jpg'),
  'Bose QC Earbuds II':          W('Bose_QuietComfort_Earbuds_II.jpg'),
  'Xiaomi Watch S4':             W('Xiaomi_Watch_S3.jpg'),
  'Fitbit Charge 6':             W('Fitbit_Charge_6.jpg'),
  'Withings ScanWatch 2':        W('Withings_ScanWatch_2.jpg'),
  'Polar Vantage V3':            W('Polar_Vantage_V3.jpg'),
  'DualSense PS5':               W('DualSense_controller.jpg'),
  'Xbox Controller':             W('Xbox_Series_X_controller.jpg'),
  'Razer Kishi V2':              W('Razer_Kishi_V2.jpg'),
  'Logitech G Pro X':            W('Logitech_G_Pro_X_Superlight.jpg'),
  'ASUS ROG Ally':               W('ASUS_ROG_Ally.jpg'),
  'Lenovo Legion Go':            W('Lenovo_Legion_Go.jpg'),
  'Meta Quest 3':                W('Meta_Quest_3.jpg'),
  'Sony Alpha A7 IV':            W('Sony_Alpha_7_IV.jpg'),
  'Sony Alpha A6700':            W('Sony_Alpha_6700.jpg'),
  'Canon EOS R8':                W('Canon_EOS_R8.jpg'),
  'Canon EOS R50':               W('Canon_EOS_R50.jpg'),
  'Canon EOS 250D':              W('Canon_EOS_250D.jpg'),
  'Nikon Z6 III':                W('Nikon_Z6_III.jpg'),
  'Nikon Z50 II':                W('Nikon_Z50_II.jpg'),
  'Fujifilm X-T5':               W('Fujifilm_X-T5.jpg'),
  'Fujifilm X100VI':             W('Fujifilm_X100VI.jpg'),
  'GoPro Hero 13':               W('GoPro_HERO13_Black.jpg'),
  'DJI Osmo Action 4':           W('DJI_Osmo_Action_4.jpg'),
  'DJI Mini 4 Pro (дрон)':       W('DJI_Mini_4_Pro.jpg'),
  'DJI Air 3 (дрон)':            W('DJI_Air_3.jpg'),
  'Instax Mini 12':              W('Fujifilm_Instax_Mini_12.jpg'),
  'Sony ZV-E10 II':              W('Sony_ZV-E10_II.jpg'),
  'Samsung Odyssey G9 49"':      W('Samsung_Odyssey_G9.jpg'),
  'Samsung Smart Monitor M8':    W('Samsung_Smart_Monitor_M8.jpg'),
  'LG UltraGear 27" 4K':         W('LG_UltraGear_27GP950-B.jpg'),
  'LG UltraWide 34" WQHD':       W('LG_34WN780-B.jpg'),
  'ASUS ROG Swift 27" 360Hz':    W('ASUS_ROG_Swift_360Hz.jpg'),
  'ASUS ProArt 32" 4K OLED':     W('ASUS_ProArt_PA32DC.jpg'),
  'Dell UltraSharp 27" 4K':      W('Dell_UltraSharp_27_4K_USB-C_Monitor_(U2720Q).jpg'),
  'BenQ EW3280U 32" 4K':         W('BenQ_EW3280U.jpg'),
  'MSI MAG 27" 240Hz':           W('MSI_MAG_274QRF_QD.jpg'),
  'AOC 27" 165Hz':               W('AOC_27G2_monitor.jpg'),
  'Philips 27" 4K IPS':          W('Philips_279P1.jpg'),
  'ViewSonic VX2780 27"':        W('ViewSonic_VX2780-4K-PRO.jpg'),
  'LG 32" 4K HDR':               W('LG_32UN880-B.jpg'),
  'Samsung 49" OLED Odyssey':    W('Samsung_Odyssey_OLED_G9.jpg'),
  'JBL Charge 5':                W('JBL_Charge_5.jpg'),
  'JBL Boombox 3':               W('JBL_Boombox_3.jpg'),
  'Sony SRS-XB43':               W('Sony_SRS-XB43.jpg'),
  'Bose SoundLink Max':          W('Bose_SoundLink_Max.jpg'),
  'Marshall Stanmore III':       W('Marshall_Stanmore_III.jpg'),
  'Xiaomi Smart Speaker':        W('Xiaomi_Mi_Smart_Speaker.jpg'),
  'Apple HomePod mini':          W('HomePod_mini_Orange.jpg'),
  'Harman Kardon Onyx 8':        W('Harman_Kardon_Onyx_Studio_8.jpg'),
  'Anker Soundcore Motion X':    W('Anker_Soundcore_Motion_X600.jpg'),
  'Bang & Olufsen Beosound':     W('Bang_&_Olufsen_Beosound_A5.jpg'),
  'Xiaomi Robot Vacuum S20+':    W('Xiaomi_Robot_Vacuum_S20_Plus.jpg'),
  'iRobot Roomba j9+':           W('IRobot_Roomba_j9_Plus.jpg'),
  'Roborock S8 Pro Ultra':       W('Roborock_S8_Pro_Ultra.jpg'),
  'Amazon Echo Show 10':         W('Amazon_Echo_Show_10_(3rd_gen).jpg'),
  'Apple TV 4K 3rd gen':         W('Apple_TV_4K_(3rd_generation).jpg'),
  'Google Chromecast 4K':        W('Chromecast_with_Google_TV_(4K).jpg'),
  'Xiaomi Smart Air Purifier':   W('Xiaomi_Mi_Air_Purifier_3H.jpg'),
  'TP-Link Deco XE75 WiFi 6':    W('TP-Link_Deco_XE75.jpg'),
  'Philips Hue Starter Kit':     W('Philips_Hue_starter_kit.jpg'),
  'Ring Video Doorbell 4':       W('Ring_Video_Doorbell_4.jpg'),
};

async function main() {
  let updated = 0, skipped = 0;

  for (const [name, imageUrl] of Object.entries(DIRECT_IMAGES)) {
    const product = await prisma.product.findFirst({ where: { name } });
    if (!product) { console.log(`⚠ Не найден в БД: ${name}`); continue; }

    if (product.imageUrl && product.imageUrl.includes('wikimedia')) {
      skipped++;
      continue;
    }

    await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
    updated++;
    console.log(`✓ ${name}`);
  }

  console.log(`\n✅ Обновлено: ${updated} | Пропущено: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
