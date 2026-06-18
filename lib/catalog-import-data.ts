export type ImportProduct = {
  name: string
  emoji: string
  category: string
  origin: string
  tags: string[]
  variants: { label: string; price: number }[]
}

const CALI_USA_PREMIUM_V1: { label: string; price: number }[] = [
  { label: '3.5g', price: 45 }, { label: '7g', price: 80 }, { label: '14g', price: 140 },
  { label: '28g', price: 240 }, { label: '56g', price: 420 }, { label: '112g', price: 760 },
  { label: '448g', price: 2700 }, { label: '896g', price: 4700 }, { label: '1334g', price: 6850 },
]
const CALI_USA_TOPSHELF_V1: { label: string; price: number }[] = [
  { label: '3.5g', price: 40 }, { label: '7g', price: 70 }, { label: '14g', price: 120 },
  { label: '28g', price: 210 }, { label: '56g', price: 400 }, { label: '112g', price: 750 },
  { label: '224g', price: 1450 },
]
const CALI_USA_TOPSHELF_V2: { label: string; price: number }[] = [
  ...CALI_USA_TOPSHELF_V1,
  { label: '448g', price: 2700 },
]
const CALI_SPAIN_TOPSHELF_V1: { label: string; price: number }[] = [
  { label: '10g', price: 65 }, { label: '25g', price: 145 }, { label: '50g', price: 250 },
  { label: '100g', price: 440 }, { label: '250g', price: 1000 }, { label: '500g', price: 1900 },
  { label: '1kg', price: 3600 },
]
const CALI_SPAIN_TOPSHELF_V2: { label: string; price: number }[] = [
  { label: '10g', price: 70 }, { label: '25g', price: 150 }, { label: '50g', price: 250 },
  { label: '100g', price: 460 }, { label: '250g', price: 1020 }, { label: '500g', price: 1950 },
  { label: '1kg', price: 3750 },
]
const CALI_SPAIN_TOPSHELF_V3: { label: string; price: number }[] = [
  { label: '10g', price: 70 }, { label: '25g', price: 150 }, { label: '50g', price: 250 },
  { label: '100g', price: 450 }, { label: '250g', price: 1050 }, { label: '500g', price: 1950 },
]
const FROZEN_V1: { label: string; price: number }[] = [
  { label: '3g', price: 35 }, { label: '5g', price: 50 }, { label: '10g', price: 85 },
  { label: '25g', price: 190 }, { label: '50g', price: 340 }, { label: '100g', price: 600 },
  { label: '200g', price: 1130 }, { label: '300g', price: 1620 }, { label: '500g', price: 2600 },
  { label: '1kg', price: 5000 },
]
const FROZEN_V2: { label: string; price: number }[] = [
  { label: '3g', price: 30 }, { label: '5g', price: 45 }, { label: '10g', price: 80 },
  { label: '25g', price: 180 }, { label: '50g', price: 300 }, { label: '100g', price: 550 },
  { label: '200g', price: 1000 }, { label: '300g', price: 1440 }, { label: '500g', price: 2300 },
  { label: '1kg', price: 4300 },
]
const HASH_DRY3X_V1: { label: string; price: number }[] = [
  { label: '10g', price: 70 }, { label: '25g', price: 150 }, { label: '50g', price: 250 },
  { label: '100g', price: 450 }, { label: '200g', price: 850 }, { label: '300g', price: 1200 },
  { label: '500g', price: 1900 }, { label: '1kg', price: 3500 },
]
const HASH_DRY3X_V2: { label: string; price: number }[] = [
  { label: '10g', price: 60 }, { label: '25g', price: 125 }, { label: '50g', price: 210 },
  { label: '100g', price: 380 }, { label: '200g', price: 710 }, { label: '300g', price: 1035 },
  { label: '500g', price: 1590 }, { label: '1kg', price: 2975 },
]
const HASH_DRY73U: { label: string; price: number }[] = [
  { label: '10g', price: 55 }, { label: '25g', price: 110 }, { label: '50g', price: 195 },
  { label: '100g', price: 360 }, { label: '200g', price: 680 }, { label: '300g', price: 990 },
  { label: '500g', price: 1500 }, { label: '1kg', price: 2800 },
]
const HASH_SIFT_V1: { label: string; price: number }[] = [
  { label: '10g', price: 50 }, { label: '25g', price: 100 }, { label: '50g', price: 175 },
  { label: '100g', price: 310 }, { label: '200g', price: 550 }, { label: '300g', price: 810 },
  { label: '500g', price: 1250 }, { label: '1kg', price: 2350 }, { label: '2kg', price: 4500 },
  { label: '3kg', price: 6750 }, { label: '5kg', price: 11000 },
]
const HASH_SIFT_V2: { label: string; price: number }[] = [
  { label: '10g', price: 50 }, { label: '25g', price: 100 }, { label: '50g', price: 175 },
  { label: '100g', price: 300 }, { label: '200g', price: 550 }, { label: '300g', price: 800 },
  { label: '500g', price: 1200 }, { label: '1kg', price: 2300 }, { label: '2kg', price: 4500 },
  { label: '3kg', price: 6600 }, { label: '5kg', price: 10500 },
]
const PLASMA_V1: { label: string; price: number }[] = [
  { label: '3g', price: 55 }, { label: '5g', price: 80 }, { label: '10g', price: 130 },
  { label: '25g', price: 290 }, { label: '50g', price: 500 }, { label: '100g', price: 920 },
  { label: '200g', price: 1800 }, { label: '500g', price: 4400 }, { label: '1kg', price: 8350 },
]
const PLASMA_V2: { label: string; price: number }[] = [
  { label: '3g', price: 50 }, { label: '5g', price: 70 }, { label: '10g', price: 120 },
  { label: '25g', price: 270 }, { label: '50g', price: 450 }, { label: '100g', price: 800 },
  { label: '200g', price: 1550 }, { label: '500g', price: 3650 }, { label: '1kg', price: 7000 },
]

export const CATALOG_PRODUCTS: ImportProduct[] = [
  // ─── PREMIUM CALI USA ───
  { name: 'Uncle Snoop', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['premium', 'top shelf', 'cali'],
    variants: [{ label: '3.5g', price: 45 }, { label: '7g', price: 80 }, { label: '14g', price: 140 }, { label: '28g', price: 240 }, { label: '56g', price: 420 }, { label: '112g', price: 760 }] },
  { name: 'Cake Pop', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['premium', 'top shelf', 'cali'],
    variants: CALI_USA_PREMIUM_V1 },
  { name: 'Pinyatti', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['premium', 'top shelf', 'cali'],
    variants: CALI_USA_PREMIUM_V1 },
  { name: 'Bubble Bath', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['premium', 'top shelf', 'cali'],
    variants: CALI_USA_PREMIUM_V1 },
  { name: 'Apple Tartz', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['premium', 'top shelf', 'cali'],
    variants: [{ label: '3.5g', price: 35 }, { label: '7g', price: 60 }, { label: '14g', price: 110 }, { label: '28g', price: 200 }, { label: '56g', price: 380 }, { label: '112g', price: 710 }, { label: '224g', price: 1350 }] },
  { name: 'Permanent Marker', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: [{ label: '3.5g', price: 40 }, { label: '7g', price: 70 }, { label: '14g', price: 120 }, { label: '28g', price: 210 }, { label: '56g', price: 400 }, { label: '112g', price: 750 }] },
  { name: 'Blue Nerdz', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V1 },
  { name: 'Subzero Cherry Bomb', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V1 },
  { name: 'Nine Lions', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V1 },
  { name: 'Baby Yoda', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V1 },
  { name: 'Any Day', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V2 },
  { name: 'White Rainbow', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V2 },
  { name: 'Marks A Lot', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V2 },
  { name: 'Perma Diesel', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V2 },
  { name: 'D-Lish', emoji: '🌿', category: 'premium', origin: 'Cali USA', tags: ['top shelf', 'cali'],
    variants: CALI_USA_TOPSHELF_V2 },

  // ─── TOPSHELF CALI SPAIN ───
  { name: 'Zurple Punch BX', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V3 },
  { name: 'Runtz x Jealousy', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V2 },
  { name: 'Dantes Inferno', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V2 },
  { name: 'ZOZ', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Dulce De Guava', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Luchee', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Super Boof Cherry', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Georgia Pie', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Cherry Bomb', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },
  { name: 'Blueberry Slushies', emoji: '🌿', category: 'premium', origin: 'Cali Spain', tags: ['top shelf', 'cali', 'spain'],
    variants: CALI_SPAIN_TOPSHELF_V1 },

  // ─── PACKS & PRE-ROLLS ───
  { name: 'Premium Cali USA Pack — Mix Strains', emoji: '🌿', category: 'combo', origin: 'Cali USA',
    tags: ['pack', 'mix', 'cali'],
    variants: [{ label: '1pcs (3.5g)', price: 90 }, { label: '2pcs', price: 170 }, { label: '3pcs', price: 240 }, { label: '5pcs', price: 370 }, { label: '10pcs', price: 700 }] },
  { name: 'Premium Cali USA Pack 2 — Mix Strains', emoji: '🌿', category: 'combo', origin: 'Cali USA',
    tags: ['pack', 'mix', 'cali'],
    variants: [{ label: '1pcs (3.5g)', price: 85 }, { label: '2pcs', price: 160 }, { label: '3pcs', price: 230 }, { label: '5pcs', price: 360 }] },
  { name: 'Cali Bags Pre-Roll', emoji: '🚬', category: 'combo', origin: 'Cali USA',
    tags: ['pre-roll', 'cali', 'mix'],
    variants: [{ label: '1 bag (3.5g)', price: 70 }, { label: '3 bags', price: 190 }, { label: '5 bags', price: 310 }, { label: '10 bags', price: 590 }, { label: '20 bags', price: 1100 }] },

  // ─── VAPES ───
  { name: 'Premium USA WPFF Vape', emoji: '💨', category: 'premium', origin: 'USA',
    tags: ['vape', 'wpff', 'live'],
    variants: [{ label: '1pcs', price: 50 }, { label: '3pcs', price: 130 }, { label: '5pcs', price: 215 }, { label: '10pcs', price: 400 }, { label: '25pcs', price: 880 }, { label: '50pcs', price: 1550 }, { label: '100pcs', price: 2900 }, { label: '150pcs', price: 4100 }] },
  { name: 'Premium USA Vape Live Rosin 1G', emoji: '💨', category: 'premium', origin: 'USA',
    tags: ['vape', 'live rosin', '1g'],
    variants: [{ label: '1pcs', price: 55 }, { label: '2pcs', price: 105 }, { label: '3pcs', price: 150 }, { label: '5pcs', price: 230 }, { label: '10pcs', price: 430 }, { label: '20pcs', price: 800 }, { label: '30pcs', price: 1150 }, { label: '1 box / 50pcs', price: 1750 }] },
  { name: 'Vape Live Rosin 1G', emoji: '💨', category: 'premium', origin: 'Spain',
    tags: ['vape', 'live rosin', '1g'],
    variants: [{ label: '1pcs', price: 45 }, { label: '2pcs', price: 80 }, { label: '3pcs', price: 120 }, { label: '5pcs', price: 195 }, { label: '20pcs', price: 650 }] },

  // ─── CONCENTRATES (Plasma Static) ───
  { name: 'Premium Plasma Static — Mix Terps', emoji: '💎', category: 'hash', origin: 'Spain',
    tags: ['concentrate', 'plasma', 'hash'],
    variants: PLASMA_V1 },
  { name: 'Premium Plasma Static v2 — Mix Strains', emoji: '💎', category: 'hash', origin: 'Spain',
    tags: ['concentrate', 'plasma', 'hash'],
    variants: PLASMA_V1 },
  { name: 'Premium Plasma Static Double Hand', emoji: '💎', category: 'hash', origin: 'Spain',
    tags: ['concentrate', 'plasma', 'double hand'],
    variants: PLASMA_V2 },

  // ─── FROZEN ───
  { name: 'Premium Frozen — Mix Strains', emoji: '❄️', category: 'frozen', origin: 'Spain',
    tags: ['frozen', 'premium'],
    variants: FROZEN_V1 },
  { name: 'Premium Frozen White Runtz', emoji: '❄️', category: 'frozen', origin: 'Spain',
    tags: ['frozen', 'runtz'],
    variants: FROZEN_V2 },

  // ─── HASH / DRY SIFT ───
  { name: 'Premium Dry 3x Filtered — Forbidden Fruit', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'dry', 'filtered'],
    variants: HASH_DRY3X_V1 },
  { name: 'Premium Dry 3x Filtered — Apple Banana', emoji: '🧱', category: 'hash', origin: 'Morocco',
    tags: ['hash', 'dry', 'filtered'],
    variants: HASH_DRY3X_V2 },
  { name: 'Premium Dry 3x Filtered — Zkittlez', emoji: '🧱', category: 'hash', origin: 'Morocco',
    tags: ['hash', 'dry', 'filtered'],
    variants: HASH_DRY3X_V2 },
  { name: 'Premium Dry Filtered 73u — Lemon Cherry Gelato', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'dry', '73u'],
    variants: HASH_DRY73U },
  { name: 'Super Top Dry Sift — Lemon Sherbet', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'sift', 'top'],
    variants: HASH_SIFT_V1 },
  { name: 'Super Top Dry Sift — Cherry Rage', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'sift', 'top'],
    variants: HASH_SIFT_V1 },
  { name: 'Super Top Dry Sift — Gelato & Sweets Terps', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'sift', 'top'],
    variants: HASH_SIFT_V1 },
  { name: 'Super Top Dry Sift — Papaya & Sweets Terps', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'sift', 'top'],
    variants: HASH_SIFT_V1 },
  { name: 'Super Top Dry Sift — MAC-1 & Sweets Terps', emoji: '🧱', category: 'hash', origin: 'Spain',
    tags: ['hash', 'sift', 'top'],
    variants: HASH_SIFT_V2 },
]
