const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/smartprice';
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
const publicDir = path.join(__dirname, 'public');

const CATEGORY_META = {
  smartphones: {
    label: 'Смартфоны',
    icon: '📱',
    accent: 'teal',
    badge: 'Хит продаж'
  },
  laptops: {
    label: 'Ноутбуки',
    icon: '💻',
    accent: 'blue',
    badge: 'Для работы и игр'
  },
  tablets: {
    label: 'Планшеты',
    icon: '📲',
    accent: 'amber',
    badge: 'Мобильная продуктивность'
  },
  tv: {
    label: 'Телевизоры',
    icon: '📺',
    accent: 'orange',
    badge: 'Большой экран'
  },
  audio: {
    label: 'Аудио',
    icon: '🎧',
    accent: 'rose',
    badge: 'Музыка без компромиссов'
  },
  wearables: {
    label: 'Носимые устройства',
    icon: '⌚',
    accent: 'violet',
    badge: 'Умные аксессуары'
  },
  gaming: {
    label: 'Игры и консоли',
    icon: '🎮',
    accent: 'lime',
    badge: 'Для геймеров'
  },
  camera: {
    label: 'Фото и видео',
    icon: '📷',
    accent: 'pink',
    badge: 'Контент без ограничений'
  },
  monitors: {
    label: 'Мониторы',
    icon: '🖥️',
    accent: 'sky',
    badge: 'Комфортный сетап'
  },
  home: {
    label: 'Умный дом',
    icon: '🏠',
    accent: 'emerald',
    badge: 'Техника для дома'
  },
  other: {
    label: 'Другое',
    icon: '📦',
    accent: 'slate',
    badge: 'Подборка товаров'
  }
};

const CATEGORY_IMAGE_META = {
  smartphones: { start: '#0f766e', end: '#14b8a6', glow: '#99f6e4' },
  laptops: { start: '#1d4ed8', end: '#60a5fa', glow: '#bfdbfe' },
  tablets: { start: '#c2410c', end: '#fb923c', glow: '#fed7aa' },
  tv: { start: '#7c2d12', end: '#f97316', glow: '#fdba74' },
  audio: { start: '#be123c', end: '#fb7185', glow: '#fecdd3' },
  wearables: { start: '#6d28d9', end: '#a78bfa', glow: '#ddd6fe' },
  gaming: { start: '#3f6212', end: '#84cc16', glow: '#d9f99d' },
  camera: { start: '#9f1239', end: '#f472b6', glow: '#fbcfe8' },
  monitors: { start: '#0f172a', end: '#334155', glow: '#cbd5e1' },
  home: { start: '#166534', end: '#4ade80', glow: '#bbf7d0' },
  other: { start: '#475569', end: '#94a3b8', glow: '#e2e8f0' }
};

const LEGACY_AUTO_ASSIGNED_IMAGE_URLS = new Set([
  'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1533821736289-77cfe5aae0dd?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1525275335684-4ca7f5e99737?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1587829191301-d06b92b52d92?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
]);

const LEGACY_TEXT_FIXES = [
  ['РњР°РіР°Р·РёРЅ', 'Магазин'],
  ['РќРѕСѓС‚Р±СѓРє', 'Ноутбук'],
  ['РЎРјР°СЂС‚С„РѕРЅ', 'Смартфон'],
  ['РўРµР»РµРІРёР·РѕСЂ', 'Телевизор'],
  ['РёРіСЂ', 'игр'],
  ['РґСЂРѕРЅ', 'дрон']
];

const LEGACY_ICON_FIXES = {
  'рџ“±': '📱',
  'рџ’»': '💻',
  'рџ“џ': '📲',
  'рџ“є': '📺',
  'рџЋ§': '🎧',
  'вЊљ': '⌚',
  'рџЋ®': '🎮',
  'рџ“ё': '📷',
  'рџ–ҐпёЏ': '🖥️',
  'рџ”Љ': '🔊',
  'рџЏ ': '🏠',
  'рџ“¦': '📦'
};

const starterStores = [
  { name: 'Sulpak', url: 'https://www.sulpak.kz' },
  { name: 'Technodom', url: 'https://www.technodom.kz' },
  { name: 'Mechta', url: 'https://www.mechta.kz' },
  { name: 'Kaspi Магазин', url: 'https://kaspi.kz/shop' },
  { name: 'DNS', url: 'https://www.dns-shop.kz' }
];

const starterProducts = [
  {
    name: 'iPhone 16 Pro',
    icon: '📱',
    offers: [
      { store: 'Sulpak', price: 584000 },
      { store: 'Technodom', price: 579000 },
      { store: 'Mechta', price: 591000 },
      { store: 'Kaspi Магазин', price: 576000 }
    ]
  },
  {
    name: 'Samsung Galaxy S25',
    icon: '📱',
    offers: [
      { store: 'Sulpak', price: 459000 },
      { store: 'Technodom', price: 451000 },
      { store: 'Mechta', price: 463000 },
      { store: 'DNS', price: 455000 }
    ]
  },
  {
    name: 'Xiaomi 14',
    icon: '📱',
    offers: [
      { store: 'Sulpak', price: 284000 },
      { store: 'Technodom', price: 279000 },
      { store: 'Mechta', price: 288000 },
      { store: 'Kaspi Магазин', price: 276000 }
    ]
  },
  {
    name: 'MacBook Air 13 M3',
    icon: '💻',
    offers: [
      { store: 'Sulpak', price: 569000 },
      { store: 'Technodom', price: 559000 },
      { store: 'Mechta', price: 578000 },
      { store: 'Kaspi Магазин', price: 555000 }
    ]
  },
  {
    name: 'ASUS ZenBook 14 OLED',
    icon: '💻',
    offers: [
      { store: 'Technodom', price: 318000 },
      { store: 'Mechta', price: 325000 },
      { store: 'DNS', price: 312000 }
    ]
  },
  {
    name: 'Lenovo IdeaPad Slim 5',
    icon: '💻',
    offers: [
      { store: 'Technodom', price: 224000 },
      { store: 'Mechta', price: 219000 },
      { store: 'DNS', price: 221000 }
    ]
  },
  {
    name: 'iPad Air 11 M2',
    icon: '📲',
    offers: [
      { store: 'Sulpak', price: 398000 },
      { store: 'Technodom', price: 389000 },
      { store: 'Kaspi Магазин', price: 385000 }
    ]
  },
  {
    name: 'Samsung Galaxy Tab S9 FE',
    icon: '📲',
    offers: [
      { store: 'Sulpak', price: 228000 },
      { store: 'Technodom', price: 221000 },
      { store: 'DNS', price: 219000 }
    ]
  },
  {
    name: 'LG OLED C4 55"',
    icon: '📺',
    offers: [
      { store: 'Sulpak', price: 458000 },
      { store: 'Technodom', price: 449000 },
      { store: 'Mechta', price: 462000 }
    ]
  },
  {
    name: 'Samsung QLED 65" 4K',
    icon: '📺',
    offers: [
      { store: 'Sulpak', price: 488000 },
      { store: 'Technodom', price: 479000 },
      { store: 'Mechta', price: 492000 },
      { store: 'Kaspi Магазин', price: 475000 }
    ]
  },
  {
    name: 'AirPods Pro 2',
    icon: '🎧',
    offers: [
      { store: 'Sulpak', price: 132000 },
      { store: 'Technodom', price: 128000 },
      { store: 'Kaspi Магазин', price: 126000 }
    ]
  },
  {
    name: 'Sony WH-1000XM5',
    icon: '🎧',
    offers: [
      { store: 'Sulpak', price: 169000 },
      { store: 'Technodom', price: 163000 },
      { store: 'DNS', price: 161000 }
    ]
  },
  {
    name: 'Apple Watch Series 10',
    icon: '⌚',
    offers: [
      { store: 'Sulpak', price: 225000 },
      { store: 'Technodom', price: 219000 },
      { store: 'Kaspi Магазин', price: 217000 }
    ]
  },
  {
    name: 'PlayStation 5 Slim',
    icon: '🎮',
    offers: [
      { store: 'Sulpak', price: 248000 },
      { store: 'Technodom', price: 242000 },
      { store: 'Mechta', price: 246000 },
      { store: 'DNS', price: 239000 }
    ]
  },
  {
    name: 'Meta Quest 3',
    icon: '🎮',
    offers: [
      { store: 'Technodom', price: 199000 },
      { store: 'DNS', price: 194000 },
      { store: 'Kaspi Магазин', price: 197000 }
    ]
  },
  {
    name: 'Sony Alpha A7 IV',
    icon: '📷',
    offers: [
      { store: 'Technodom', price: 986000 },
      { store: 'Mechta', price: 978000 },
      { store: 'DNS', price: 972000 }
    ]
  },
  {
    name: 'DJI Mini 4 Pro (дрон)',
    icon: '📷',
    offers: [
      { store: 'Technodom', price: 326000 },
      { store: 'Mechta', price: 321000 },
      { store: 'Kaspi Магазин', price: 319000 }
    ]
  },
  {
    name: 'Samsung Odyssey G9 49"',
    icon: '🖥️',
    offers: [
      { store: 'Sulpak', price: 589000 },
      { store: 'Technodom', price: 582000 },
      { store: 'DNS', price: 578000 }
    ]
  },
  {
    name: 'JBL Charge 5',
    icon: '🔊',
    offers: [
      { store: 'Sulpak', price: 57000 },
      { store: 'Technodom', price: 54990 },
      { store: 'Kaspi Магазин', price: 53990 }
    ]
  },
  {
    name: 'Xiaomi Robot Vacuum S20+',
    icon: '🏠',
    offers: [
      { store: 'Technodom', price: 184000 },
      { store: 'Mechta', price: 181000 },
      { store: 'Kaspi Магазин', price: 179000 }
    ]
  }
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'smartprice-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

function requirePageAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  next();
}

function requireApiAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Нужна авторизация, чтобы продолжить.',
      authRequired: true
    });
  }

  next();
}

function normalizeText(value) {
  let text = String(value || '').trim();

  for (const [legacy, actual] of LEGACY_TEXT_FIXES) {
    text = text.replaceAll(legacy, actual);
  }

  return text;
}

function inferCategoryKey(name) {
  const value = normalizeText(name).toLowerCase();

  if (/(iphone|galaxy|xiaomi|redmi|poco|realme|oneplus|pixel|phone|смартфон|tecno|nokia|motorola|vivo|oppo|honor|huawei)/.test(value)) {
    return 'smartphones';
  }

  if (/(macbook|notebook|laptop|ноутбук|thinkpad|ideapad|rog|zenbook|vivobook|surface|matebook|magicbook|predator|swift|omen|xps|inspiron|legion|blade)/.test(value)) {
    return 'laptops';
  }

  if (/(ipad|tablet|tab |tab$|планшет|matepad|pad )/.test(value)) {
    return 'tablets';
  }

  if (/(oled|qled|tv|television|телевизор|bravia|frame)/.test(value)) {
    return 'tv';
  }

  if (/(airpods|buds|headphone|наушник|speaker|колонк|audio|jbl|bose|sennheiser|soundcore|marshall|homepod)/.test(value)) {
    return 'audio';
  }

  if (/(watch|ультра|ultra|fenix|garmin|fitbit|amazfit|scanwatch|wearable|часы)/.test(value)) {
    return 'wearables';
  }

  if (/(playstation|xbox|nintendo|steam deck|quest|controller|gaming|game|консол|игр)/.test(value)) {
    return 'gaming';
  }

  if (/(sony alpha|canon|nikon|fujifilm|gopro|dji|instax|camera|дрон|фото|video|zv-e10)/.test(value)) {
    return 'camera';
  }

  if (/(monitor|ultrasharp|ultragear|odyssey|display|монитор|proart|viewsonic|benq|aoc)/.test(value)) {
    return 'monitors';
  }

  if (/(vacuum|roomba|roborock|echo|chromecast|doorbell|deco|home|умный дом|purifier|tv 4k)/.test(value)) {
    return 'home';
  }

  return 'other';
}

function normalizeIcon(icon, productName) {
  const raw = String(icon || '').trim();
  if (LEGACY_ICON_FIXES[raw]) return LEGACY_ICON_FIXES[raw];
  if (raw.length <= 4 && raw) return raw;
  return CATEGORY_META[inferCategoryKey(productName)].icon;
}

function shortTitle(value, maxLength = 26) {
  const text = normalizeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function encodeSvg(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getProductPhotoUrl(name, categoryKey) {
  const queryKeywords = {
    smartphones: 'smartphone',
    laptops: 'laptop',
    tablets: 'tablet',
    tv: 'television',
    audio: 'headphones',
    wearables: 'smartwatch',
    gaming: 'gaming console',
    camera: 'camera',
    monitors: 'monitor',
    home: 'smart home',
    other: 'electronics'
  };

  return '';
}

function resolveProductImage(name, storedImageUrl, categoryKey) {
  const normalizedUrl = normalizeText(storedImageUrl);

  if (normalizedUrl && !LEGACY_AUTO_ASSIGNED_IMAGE_URLS.has(normalizedUrl) && !normalizedUrl.startsWith('data:')) {
    return normalizedUrl;
  }

  return null;
}

function buildProductImage(name, categoryKey) {
  const palette = CATEGORY_IMAGE_META[categoryKey] || CATEGORY_IMAGE_META.other;
  const meta = CATEGORY_META[categoryKey] || CATEGORY_META.other;
  const title = escapeSvgText(shortTitle(name, 30));
  const label = escapeSvgText(meta.label);

  const artworkMap = {
    smartphones: `
      <g transform="translate(245 78)">
        <rect x="0" y="0" width="230" height="396" rx="38" fill="#0f172a"/>
        <rect x="16" y="18" width="198" height="360" rx="28" fill="rgba(255,255,255,0.92)"/>
        <rect x="82" y="10" width="66" height="10" rx="5" fill="rgba(255,255,255,0.28)"/>
        <circle cx="115" cy="348" r="15" fill="rgba(15,23,42,0.12)"/>
      </g>
    `,
    laptops: `
      <g transform="translate(176 128)">
        <rect x="74" y="0" width="300" height="194" rx="20" fill="#0f172a"/>
        <rect x="92" y="16" width="264" height="160" rx="12" fill="rgba(255,255,255,0.9)"/>
        <path d="M0 220h448l-28 42H30z" fill="#cbd5e1"/>
        <rect x="180" y="232" width="88" height="10" rx="5" fill="rgba(15,23,42,0.12)"/>
      </g>
    `,
    tablets: `
      <g transform="translate(196 90) rotate(-6 200 180)">
        <rect x="0" y="0" width="408" height="288" rx="26" fill="#111827"/>
        <rect x="16" y="16" width="376" height="256" rx="18" fill="rgba(255,255,255,0.94)"/>
        <circle cx="204" cy="276" r="6" fill="rgba(255,255,255,0.34)"/>
      </g>
    `,
    tv: `
      <g transform="translate(132 112)">
        <rect x="0" y="0" width="456" height="258" rx="22" fill="#0f172a"/>
        <rect x="18" y="18" width="420" height="222" rx="16" fill="rgba(255,255,255,0.9)"/>
        <path d="M212 258h32l26 42h-84z" fill="#cbd5e1"/>
        <rect x="170" y="300" width="116" height="12" rx="6" fill="rgba(15,23,42,0.16)"/>
      </g>
    `,
    audio: `
      <g transform="translate(215 98)">
        <path d="M70 88c0-78 44-128 115-128s115 50 115 128" fill="none" stroke="#f8fafc" stroke-width="28" stroke-linecap="round"/>
        <rect x="26" y="98" width="66" height="132" rx="30" fill="#f8fafc"/>
        <rect x="208" y="98" width="66" height="132" rx="30" fill="#f8fafc"/>
        <rect x="88" y="66" width="24" height="114" rx="12" fill="rgba(255,255,255,0.52)"/>
        <rect x="188" y="66" width="24" height="114" rx="12" fill="rgba(255,255,255,0.52)"/>
      </g>
    `,
    wearables: `
      <g transform="translate(242 64)">
        <rect x="52" y="0" width="108" height="116" rx="44" fill="#111827"/>
        <rect x="0" y="90" width="212" height="284" rx="78" fill="#1f2937"/>
        <rect x="26" y="122" width="160" height="118" rx="34" fill="rgba(255,255,255,0.92)"/>
        <rect x="52" y="346" width="108" height="116" rx="44" fill="#111827"/>
      </g>
    `,
    gaming: `
      <g transform="translate(172 182)">
        <path d="M64 26c18-24 50-38 84-38h144c34 0 66 14 84 38l38 62c18 30-3 68-38 68-18 0-34-8-46-20l-22-22H156l-22 22c-12 12-28 20-46 20-35 0-56-38-38-68z" fill="#0f172a"/>
        <circle cx="150" cy="90" r="18" fill="rgba(255,255,255,0.88)"/>
        <circle cx="340" cy="90" r="12" fill="rgba(255,255,255,0.88)"/>
        <circle cx="378" cy="66" r="12" fill="rgba(255,255,255,0.88)"/>
        <rect x="116" y="82" width="68" height="16" rx="8" fill="rgba(255,255,255,0.88)"/>
        <rect x="142" y="56" width="16" height="68" rx="8" fill="rgba(255,255,255,0.88)"/>
      </g>
    `,
    camera: `
      <g transform="translate(182 156)">
        <rect x="0" y="34" width="436" height="226" rx="38" fill="#111827"/>
        <rect x="72" y="0" width="118" height="52" rx="18" fill="#1f2937"/>
        <circle cx="232" cy="148" r="72" fill="rgba(255,255,255,0.94)"/>
        <circle cx="232" cy="148" r="46" fill="rgba(17,24,39,0.82)"/>
        <circle cx="232" cy="148" r="20" fill="rgba(255,255,255,0.64)"/>
        <circle cx="364" cy="82" r="12" fill="rgba(255,255,255,0.78)"/>
      </g>
    `,
    monitors: `
      <g transform="translate(132 98)">
        <rect x="0" y="0" width="456" height="272" rx="18" fill="#0f172a"/>
        <rect x="18" y="18" width="420" height="236" rx="12" fill="rgba(255,255,255,0.9)"/>
        <rect x="212" y="272" width="32" height="44" rx="10" fill="#94a3b8"/>
        <rect x="166" y="314" width="124" height="14" rx="7" fill="#cbd5e1"/>
      </g>
    `,
    home: `
      <g transform="translate(220 112)">
        <rect x="44" y="0" width="194" height="310" rx="38" fill="#14532d"/>
        <circle cx="141" cy="92" r="52" fill="rgba(255,255,255,0.9)"/>
        <circle cx="141" cy="92" r="28" fill="#14532d"/>
        <circle cx="141" cy="206" r="28" fill="rgba(255,255,255,0.84)"/>
      </g>
    `,
    other: `
      <g transform="translate(208 118)">
        <rect x="34" y="0" width="280" height="78" rx="18" fill="rgba(255,255,255,0.2)"/>
        <rect x="0" y="64" width="348" height="236" rx="34" fill="#1f2937"/>
        <path d="M0 92l174 92 174-92" fill="rgba(255,255,255,0.08)"/>
      </g>
    `
  };

  const artwork = artworkMap[categoryKey] || artworkMap.other;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560" fill="none">
      <defs>
        <linearGradient id="bg" x1="120" y1="48" x2="660" y2="500" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.start}"/>
          <stop offset="1" stop-color="${palette.end}"/>
        </linearGradient>
        <linearGradient id="glass" x1="210" y1="316" x2="600" y2="538" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(255,255,255,0.28)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0.08)"/>
        </linearGradient>
        <filter id="blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="26"/>
        </filter>
      </defs>
      <rect width="800" height="560" rx="44" fill="url(#bg)"/>
      <circle cx="640" cy="108" r="132" fill="${palette.glow}" opacity="0.56" filter="url(#blur)"/>
      <circle cx="176" cy="170" r="108" fill="#ffffff" opacity="0.14" filter="url(#blur)"/>
      <rect x="24" y="24" width="752" height="512" rx="36" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)"/>
      ${artwork}
      <rect x="48" y="404" width="704" height="112" rx="28" fill="url(#glass)" stroke="rgba(255,255,255,0.18)"/>
      <text x="84" y="446" fill="white" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" opacity="0.72">SMARTPRICE</text>
      <text x="84" y="482" fill="white" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="800">${title}</text>
      <text x="84" y="510" fill="white" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="500" opacity="0.82">${label}</text>
    </svg>
  `;

  return svg;
}

function buildProductDescription(name, categoryLabel) {
  const base = normalizeText(name);

  switch (categoryLabel) {
    case 'Смартфоны':
      return `${base} с актуальными предложениями по рынку и быстрой проверкой лучшей цены.`;
    case 'Ноутбуки':
      return `${base} для работы, учебы и повседневных задач с подборкой магазинов в одном месте.`;
    case 'Планшеты':
      return `${base} для мобильной работы, учебы и развлечений с удобным сравнением предложений.`;
    case 'Телевизоры':
      return `${base} с подборкой цен по крупным магазинам и акцентом на лучшую сделку.`;
    case 'Аудио':
      return `${base} с быстрой проверкой стоимости в нескольких магазинах.`;
    case 'Носимые устройства':
      return `${base} с удобным сравнением цены и магазинов перед покупкой.`;
    case 'Игры и консоли':
      return `${base} для домашнего гейминга с подборкой лучших предложений.`;
    case 'Фото и видео':
      return `${base} с удобным обзором цен и магазинов для техники контент-класса.`;
    case 'Мониторы':
      return `${base} с ценами по популярным площадкам и понятной разницей между офферами.`;
    case 'Умный дом':
      return `${base} для дома с удобной сравнительной витриной по магазинам.`;
    default:
      return `${base} с быстрым сравнением стоимости по нескольким магазинам.`;
  }
}

function enrichStore(store) {
  return {
    id: store.id,
    name: normalizeText(store.name),
    url: normalizeText(store.url)
  };
}

function enrichProduct(product) {
  const name = normalizeText(product.name);
  const categoryKey = inferCategoryKey(name);
  const meta = CATEGORY_META[categoryKey];
  const normalizedIcon = normalizeIcon(product.icon, name);
  const offers = (product.prices || [])
    .map((row) => ({
      id: row.id,
      storeId: row.store.id,
      storeName: normalizeText(row.store.name),
      storeUrl: normalizeText(row.store.url),
      price: row.price
    }))
    .sort((a, b) => a.price - b.price);

  const minPrice = offers[0]?.price ?? null;
  const maxPrice = offers[offers.length - 1]?.price ?? null;
  const savings = Number.isFinite(minPrice) && Number.isFinite(maxPrice) ? Math.max(maxPrice - minPrice, 0) : 0;

  return {
    id: product.id,
    name,
    icon: normalizedIcon,
    imageUrl: resolveProductImage(name, product.imageUrl, categoryKey) ?? `/api/product-image/${product.id}`,
    category: meta.label,
    categoryKey,
    accent: meta.accent,
    badge: savings > 0 ? `Экономия до ${formatPrice(savings)} ₸` : meta.badge,
    description: buildProductDescription(name, meta.label),
    minPrice,
    maxPrice,
    offersCount: offers.length,
    storesCount: new Set(offers.map((item) => item.storeId)).size,
    savings,
    bestStore: offers[0]?.storeName || null,
    offers
  };
}

function enrichCartItem(item) {
  const normalizedName = normalizeText(item.product.name);
  const categoryKey = inferCategoryKey(item.product.name);
  const icon = normalizeIcon(item.product.icon, item.product.name);

  return {
    id: item.id,
    price: item.price,
    addedAt: item.addedAt,
    product: {
      id: item.product.id,
      name: normalizedName,
      icon,
      imageUrl: '',
      category: CATEGORY_META[categoryKey].label
    },
    store: enrichStore(item.store)
  };
}

function formatPrice(value) {
  return Number(value).toLocaleString('ru-RU');
}

async function ensureSeedData() {
  const storeCount = await prisma.store.count();

  if (storeCount === 0) {
    for (const store of starterStores) {
      await prisma.store.create({ data: store });
    }
  }

  const productCount = await prisma.product.count();
  if (productCount > 0) return;

  const stores = await prisma.store.findMany();
  const storeMap = new Map(stores.map((store) => [store.name, store]));

  for (const entry of starterProducts) {
    const product = await prisma.product.create({
      data: {
        name: entry.name,
        icon: entry.icon
      }
    });

    for (const offer of entry.offers) {
      const store = storeMap.get(offer.store);
      if (!store) continue;

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          price: offer.price
        }
      });
    }
  }

  console.log('База заполнена стартовыми данными.');
}

async function repairLegacyData() {
  for (const [legacyIcon, actualIcon] of Object.entries(LEGACY_ICON_FIXES)) {
    await prisma.product.updateMany({
      where: { icon: legacyIcon },
      data: { icon: actualIcon }
    });
  }

  const productNameFixes = [
    ['РќРѕСѓС‚Р±СѓРє Lenovo IdeaPad', 'Ноутбук Lenovo IdeaPad'],
    ['DJI Mini 4 Pro (РґСЂРѕРЅ)', 'DJI Mini 4 Pro (дрон)'],
    ['DJI Air 3 (РґСЂРѕРЅ)', 'DJI Air 3 (дрон)']
  ];

  for (const [legacyName, actualName] of productNameFixes) {
    await prisma.product.updateMany({
      where: { name: legacyName },
      data: { name: actualName }
    });
  }

  await prisma.store.updateMany({
    where: { name: 'Kaspi РњР°РіР°Р·РёРЅ' },
    data: { name: 'Kaspi Магазин' }
  });
}

async function getAllProducts() {
  const products = await prisma.product.findMany({
    include: {
      prices: {
        include: { store: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return products.map(enrichProduct);
}

function sendPage(res, fileName) {
  res.sendFile(path.join(publicDir, fileName));
}

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/cabinet');
  return sendPage(res, 'login.html');
});
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/cabinet');
  return sendPage(res, 'register.html');
});
app.get('/cabinet', requirePageAuth, (req, res) => sendPage(res, 'cabinet.html'));
app.get('/delivery', requirePageAuth, (req, res) => sendPage(res, 'delivery.html'));
app.get('/payment', requirePageAuth, (req, res) => sendPage(res, 'payment.html'));
app.get('/tracking/:orderId', requirePageAuth, (req, res) => sendPage(res, 'tracking.html'));
app.get('/admin', (req, res) => sendPage(res, 'admin.html'));

app.post('/api/register', async (req, res) => {
  const name = normalizeText(req.body.name);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните все поля.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов.' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword }
  });

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(400).json({ error: 'Пользователь не найден.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: 'Неверный пароль.' });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, name: true, email: true, createdAt: true }
  });

  if (!user) {
    return res.json({ user: null });
  }

  res.json({
    user: {
      ...user,
      name: normalizeText(user.name)
    }
  });
});

app.get('/api/home', async (req, res) => {
  const [products, storesCount] = await Promise.all([getAllProducts(), prisma.store.count()]);
  const cheapestProducts = products.filter((product) => Number.isFinite(product.minPrice));
  const biggestSaving = cheapestProducts.reduce((max, product) => Math.max(max, product.savings), 0);

  res.json({
    totals: {
      products: products.length,
      stores: storesCount,
      deals: cheapestProducts.length,
      biggestSaving
    },
    featured: cheapestProducts
      .sort((a, b) => {
        if (b.savings !== a.savings) return b.savings - a.savings;
        return (a.minPrice ?? 0) - (b.minPrice ?? 0);
      })
      .slice(0, 6)
  });
});

app.get('/api/products', async (req, res) => {
  const products = await getAllProducts();
  res.json(products);
});

app.get('/api/product-image/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).end();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).end();

  const categoryKey = inferCategoryKey(product.name);
  const svg = buildProductImage(product.name, categoryKey);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.send(svg);
});

app.get('/api/search', async (req, res) => {
  const query = normalizeText(req.query.q).trim();

  if (!query) {
    return res.json([]);
  }

  if (req.session.userId) {
    await prisma.search.create({
      data: {
        userId: req.session.userId,
        query
      }
    });
  }

  const matches = await prisma.product.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' }
    },
    include: {
      prices: {
        include: { store: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  res.json(matches.map(enrichProduct));
});

app.get('/api/prices/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор товара.' });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      prices: {
        include: { store: true }
      }
    }
  });

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден.' });
  }

  res.json(enrichProduct(product));
});

app.get('/api/stores', async (req, res) => {
  const stores = await prisma.store.findMany({ orderBy: { name: 'asc' } });
  res.json(stores.map(enrichStore));
});

app.get('/api/my-searches', requireApiAuth, async (req, res) => {
  const searches = await prisma.search.findMany({
    where: { userId: req.session.userId },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  res.json(
    searches.map((item) => ({
      id: item.id,
      query: normalizeText(item.query),
      createdAt: item.createdAt
    }))
  );
});

app.delete('/api/my-searches', requireApiAuth, async (req, res) => {
  await prisma.search.deleteMany({ where: { userId: req.session.userId } });
  res.json({ ok: true });
});

app.get('/api/cart', requireApiAuth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.session.userId },
    include: {
      product: true,
      store: true
    },
    orderBy: { addedAt: 'desc' }
  });

  res.json(items.map(enrichCartItem));
});

app.post('/api/cart', requireApiAuth, async (req, res) => {
  const productId = Number(req.body.productId);
  const storeId = Number(req.body.storeId);

  if (!Number.isInteger(productId) || !Number.isInteger(storeId)) {
    return res.status(400).json({ error: 'Недостаточно данных для добавления в корзину.' });
  }

  const offer = await prisma.price.findFirst({
    where: { productId, storeId },
    include: {
      product: true,
      store: true
    }
  });

  if (!offer) {
    return res.status(404).json({ error: 'Такого предложения не существует.' });
  }

  const exists = await prisma.cartItem.findFirst({
    where: {
      userId: req.session.userId,
      productId,
      storeId
    }
  });

  if (exists) {
    return res.status(409).json({ error: 'Этот товар уже есть в вашей корзине.' });
  }

  const item = await prisma.cartItem.create({
    data: {
      userId: req.session.userId,
      productId,
      storeId,
      price: offer.price
    },
    include: {
      product: true,
      store: true
    }
  });

  res.json(enrichCartItem(item));
});

app.delete('/api/cart/:id', requireApiAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Некорректный идентификатор корзины.' });
  }

  const item = await prisma.cartItem.findFirst({
    where: {
      id,
      userId: req.session.userId
    }
  });

  if (!item) {
    return res.status(404).json({ error: 'Товар в корзине не найден.' });
  }

  await prisma.cartItem.delete({ where: { id } });
  res.json({ ok: true });
});

app.delete('/api/cart', requireApiAuth, async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.session.userId } });
  res.json({ ok: true });
});

app.get('/api/cabinet', requireApiAuth, async (req, res) => {
  const [user, searches, cartItems, products, storesCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, name: true, email: true, createdAt: true }
    }),
    prisma.search.findMany({
      where: { userId: req.session.userId },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.cartItem.findMany({
      where: { userId: req.session.userId },
      include: {
        product: true,
        store: true
      },
      orderBy: { addedAt: 'desc' }
    }),
    getAllProducts(),
    prisma.store.count()
  ]);

  const cart = cartItems.map(enrichCartItem);
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const cartByProduct = new Map(products.map((product) => [product.id, product]));
  const cartSavings = cart.reduce((sum, item) => {
    const product = cartByProduct.get(item.product.id);
    if (!product || !Number.isFinite(product.maxPrice)) return sum;
    return sum + Math.max(product.maxPrice - item.price, 0);
  }, 0);

  res.json({
    user: {
      ...user,
      name: normalizeText(user.name)
    },
    searches: searches.map((item) => ({
      id: item.id,
      query: normalizeText(item.query),
      createdAt: item.createdAt
    })),
    cart,
    stats: {
      searches: searches.length,
      cartItems: cart.length,
      products: products.length,
      stores: storesCount,
      cartTotal,
      cartSavings
    }
  });
});

app.post('/api/products', async (req, res) => {
  const name = normalizeText(req.body.name);
  const icon = normalizeIcon(req.body.icon, name);

  if (!name) {
    return res.status(400).json({ error: 'Название товара обязательно.' });
  }

  const product = await prisma.product.create({
    data: {
      name,
      icon
    },
    include: {
      prices: {
        include: { store: true }
      }
    }
  });

  res.json(enrichProduct(product));
});

app.post('/api/stores', async (req, res) => {
  const name = normalizeText(req.body.name);
  const url = normalizeText(req.body.url);

  if (!name) {
    return res.status(400).json({ error: 'Название магазина обязательно.' });
  }

  const store = await prisma.store.create({
    data: {
      name,
      url
    }
  });

  res.json(enrichStore(store));
});

app.post('/api/prices', async (req, res) => {
  const productId = Number(req.body.product_id);
  const storeId = Number(req.body.store_id);
  const price = Number(req.body.price);

  if (!Number.isInteger(productId) || !Number.isInteger(storeId) || !Number.isFinite(price)) {
    return res.status(400).json({ error: 'Все поля обязательны.' });
  }

  if (price <= 0) {
    return res.status(400).json({ error: 'Цена должна быть положительным числом.' });
  }

  const existing = await prisma.price.findFirst({
    where: { productId, storeId }
  });

  if (existing) {
    await prisma.price.update({
      where: { id: existing.id },
      data: { price: Math.round(price) }
    });

    return res.json({ updated: true });
  }

  const created = await prisma.price.create({
    data: {
      productId,
      storeId,
      price: Math.round(price)
    }
  });

  res.json({ id: created.id, updated: false });
});

// ── Analytics ────────────────────────────────────────────────────────────────

app.get('/api/admin/analytics', async (_req, res) => {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Последние 7 дней для графиков
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * day);
    return d.toISOString().slice(0, 10);
  });

  const weekAgo = new Date(now - 7 * day);

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    totalSearches,
    topSearches,
    searchesByDay,
    totalCartItems,
    topCartProducts,
    totalReviews,
    avgRating,
    storeRatings,
    registrationsByDay,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(now.toISOString().slice(0, 10)) } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.search.count(),
    // Топ 10 поисковых запросов
    prisma.search.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10
    }),
    // Поиски по дням за 7 дней
    prisma.search.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { createdAt: true }
    }),
    prisma.cartItem.count(),
    // Топ товаров по добавлениям в корзину
    prisma.cartItem.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 10
    }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    // Рейтинг магазинов
    prisma.storeRating.groupBy({
      by: ['storeId'],
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: 'desc' } }
    }),
    // Регистрации по дням
    prisma.user.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { createdAt: true }
    }),
  ]);

  // Агрегируем поиски по дням
  const searchDayMap = Object.fromEntries(days7.map(d => [d, 0]));
  searchesByDay.forEach(s => {
    const d = s.createdAt.toISOString().slice(0, 10);
    if (d in searchDayMap) searchDayMap[d]++;
  });

  // Агрегируем регистрации по дням
  const regDayMap = Object.fromEntries(days7.map(d => [d, 0]));
  registrationsByDay.forEach(u => {
    const d = u.createdAt.toISOString().slice(0, 10);
    if (d in regDayMap) regDayMap[d]++;
  });

  // Получаем названия товаров для топа корзины
  const topProductIds = topCartProducts.map(p => p.productId);
  const topProductsList = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, icon: true }
  });
  const topProductsMap = Object.fromEntries(topProductsList.map(p => [p.id, p]));

  // Получаем названия магазинов для рейтинга
  const storeIds = storeRatings.map(r => r.storeId);
  const storesList = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true }
  });
  const storesMap = Object.fromEntries(storesList.map(s => [s.id, s]));

  res.json({
    users: { total: totalUsers, today: newUsersToday, week: newUsersWeek },
    searches: { total: totalSearches },
    cart: { total: totalCartItems },
    reviews: { total: totalReviews, avg: Math.round((avgRating._avg.rating || 0) * 10) / 10 },
    topSearches: topSearches.map(s => ({ query: s.query, count: s._count.query })),
    topProducts: topCartProducts.map(p => ({
      ...topProductsMap[p.productId],
      count: p._count.productId
    })).filter(p => p.name),
    storeRatings: storeRatings.map(r => ({
      name: storesMap[r.storeId]?.name || '—',
      avg: Math.round((r._avg.rating || 0) * 10) / 10,
      count: r._count.rating
    })),
    charts: {
      days: days7.map(d => d.slice(5)),
      searches: days7.map(d => searchDayMap[d]),
      registrations: days7.map(d => regDayMap[d])
    }
  });
});

// ── Reviews ──────────────────────────────────────────────────────────────────

app.get('/api/reviews/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ error: 'Неверный id товара' });

  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  res.json({ reviews, avg, count: reviews.length });
});

app.post('/api/reviews', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });

  const { productId, rating, text } = req.body;
  if (!productId || !rating || !text?.trim()) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  const r = Number(rating);
  if (r < 1 || r > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: Number(productId), userId: req.session.userId } }
  });

  let review;
  if (existing) {
    review = await prisma.review.update({
      where: { id: existing.id },
      data: { rating: r, text: text.trim() },
      include: { user: { select: { name: true } } }
    });
  } else {
    review = await prisma.review.create({
      data: { productId: Number(productId), userId: req.session.userId, rating: r, text: text.trim() },
      include: { user: { select: { name: true } } }
    });
  }

  res.json(review);
});

app.delete('/api/reviews/:productId', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const productId = Number(req.params.productId);

  await prisma.review.deleteMany({
    where: { productId, userId: req.session.userId }
  });

  res.json({ ok: true });
});

// ── Store Ratings ─────────────────────────────────────────────────────────────

app.get('/api/store-ratings', async (_req, res) => {
  const ratings = await prisma.storeRating.groupBy({
    by: ['storeId'],
    _avg: { rating: true },
    _count: { rating: true }
  });

  const result = ratings.map(r => ({
    storeId: r.storeId,
    avg: Math.round((r._avg.rating || 0) * 10) / 10,
    count: r._count.rating
  }));

  res.json(result);
});

app.post('/api/store-ratings', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });

  const { storeId, rating } = req.body;
  if (!storeId || !rating) return res.status(400).json({ error: 'Укажите магазин и оценку' });
  const r = Number(rating);
  if (r < 1 || r > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

  const result = await prisma.storeRating.upsert({
    where: { storeId_userId: { storeId: Number(storeId), userId: req.session.userId } },
    create: { storeId: Number(storeId), userId: req.session.userId, rating: r },
    update: { rating: r }
  });

  res.json(result);
});

// ── Geocode proxy (Nominatim needs server-side User-Agent) ─
function cleanAddressQuery(q) {
  return q
    .replace(/(^|\s+)(пр\.|пр |проспект |ул\.|ул |улица |пер\.|пер |переулок |бул\.|бул |бульвар |мкр\.|мкр |микрорайон |д\.|кв\.)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

app.get('/api/geocode', async (req, res) => {
  const raw = String(req.query.q || '').trim();
  if (!raw) return res.json([]);

  const queries = Array.from(new Set([raw, cleanAddressQuery(raw)]));
  const headers = { 'User-Agent': 'SmartPrice/1.0 (air95003@gmail.com)', 'Accept-Language': 'ru' };

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&accept-language=ru`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (data.length > 0) {
        return res.json(data.map(r => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), display: r.display_name })));
      }
    } catch (e) {}
  }
  res.json([]);
});

// ── Addresses ─────────────────────────────────────────────
app.get('/api/addresses', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const addresses = await prisma.address.findMany({
    where: { userId: req.session.userId },
    orderBy: { isDefault: 'desc' }
  });
  res.json(addresses);
});

app.post('/api/addresses', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const { name, phone, city, street, house, apartment, lat, lng } = req.body;
  if (!name || !phone || !street || !house) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.session.userId }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({
    data: {
      userId: req.session.userId,
      name: String(name).trim(),
      phone: String(phone).trim(),
      city: String(city || 'Астана').trim(),
      street: String(street).trim(),
      house: String(house).trim(),
      apartment: String(apartment || '').trim(),
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      isDefault: Boolean(req.body.isDefault)
    }
  });
  res.json(address);
});

// ── Payment cards ──────────────────────────────────────────
app.get('/api/cards', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const cards = await prisma.paymentCard.findMany({
    where: { userId: req.session.userId },
    orderBy: { isDefault: 'desc' }
  });
  res.json(cards);
});

app.post('/api/cards', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const { last4, cardType, expiryMonth, expiryYear, holder } = req.body;
  if (!last4 || !expiryMonth || !expiryYear || !holder) {
    return res.status(400).json({ error: 'Заполните данные карты' });
  }
  if (!/^\d{4}$/.test(last4)) return res.status(400).json({ error: 'Последние 4 цифры карты некорректны' });
  if (req.body.isDefault) {
    await prisma.paymentCard.updateMany({ where: { userId: req.session.userId }, data: { isDefault: false } });
  }
  const card = await prisma.paymentCard.create({
    data: {
      userId: req.session.userId,
      last4: String(last4),
      cardType: String(cardType || 'visa').toLowerCase(),
      expiryMonth: Number(expiryMonth),
      expiryYear: Number(expiryYear),
      holder: String(holder).trim().toUpperCase(),
      isDefault: Boolean(req.body.isDefault)
    }
  });
  res.json(card);
});

// ── Orders ─────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const { addressId, cardId } = req.body;
  if (!addressId || !cardId) return res.status(400).json({ error: 'Укажите адрес и карту' });

  const [address, card, cartItems] = await Promise.all([
    prisma.address.findFirst({ where: { id: Number(addressId), userId: req.session.userId } }),
    prisma.paymentCard.findFirst({ where: { id: Number(cardId), userId: req.session.userId } }),
    prisma.cartItem.findMany({
      where: { userId: req.session.userId },
      include: { product: true, store: true }
    })
  ]);

  if (!address) return res.status(400).json({ error: 'Адрес не найден' });
  if (!card) return res.status(400).json({ error: 'Карта не найдена' });
  if (!cartItems.length) return res.status(400).json({ error: 'Корзина пуста' });

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  const order = await prisma.order.create({
    data: {
      userId: req.session.userId,
      addressId: address.id,
      cardId: card.id,
      status: 'delivering',
      totalPrice,
      items: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          storeId: item.storeId,
          price: item.price,
          name: item.product.name
        }))
      }
    },
    include: {
      address: true,
      card: true,
      items: { include: { product: true, store: true } }
    }
  });

  await prisma.cartItem.deleteMany({ where: { userId: req.session.userId } });

  res.json(order);
});

app.get('/api/orders/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const id = Number(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id, userId: req.session.userId },
    include: {
      address: true,
      card: true,
      items: { include: { product: { select: { id: true, name: true, imageUrl: true } }, store: true } }
    }
  });
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  res.json(order);
});

app.patch('/api/orders/:id/status', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Нужна авторизация' });
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['paid', 'delivering', 'delivered'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Некорректный статус' });
  const order = await prisma.order.findFirst({ where: { id, userId: req.session.userId } });
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  const updated = await prisma.order.update({ where: { id }, data: { status } });
  res.json(updated);
});

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await ensureSeedData();
  await repairLegacyData();

  app.listen(PORT, () => {
    console.log(`SmartPrice: http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
