/* expand_fragments.js — fragments.json kutubxonasini yangi modullar bilan kengaytirish.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 28):
 *   - Shkaf-kupe (2 va 3 eshikli)
 *   - Penal va texnika ustunlari (duxovka, mikrovolnovka, o'rnatma muzlatgich)
 *   - 2, 3 va 4 tortmali oshxona va xona modullari
 *   - Burchakli osma va pastki modullar (L-shakl uchun)
 *   - Mehmonxona TV tumbalari va vitrinalar
 *   - Ofis va o'quv stollari, mobil tumbalar
 *   - Dahliz poyabzal javonlari va kiyim ilgichlar
 *   - Hammom osma rakovina tumbalari va ko'zguli shkaflar
 *
 * Har bir modulda:
 *   - Slotlar arxitekturasi: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3" }
 *   - Haqiqiy formulalar: w, d, h, t (LDSP qalinligi)
 *   - Real bozor narxi (UZS)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fragsPath = path.join(__dirname, 'fragments.json');
const existing = JSON.parse(fs.readFileSync(fragsPath, 'utf8'));

const existingCodes = new Set(existing.map(f => f.code));

const newFragments = [
  // ── 1. Shkaf-kupe va Garderoblar ──
  {
    code: "SP-G-010",
    name: "Shkaf-kupe 2 eshikli (1600x600x2200)",
    category: "wardrobe",
    group: "garderob",
    w: 1600, d: 600, h: 2200,
    min_w: 1200, max_w: 2000, min_d: 550, max_d: 700,
    stretch_axis: "xy", price_mode: "unit", price: 2850000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ust", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "past", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "peregorodka", qty: 1, len: "h - 2 * t - 100", width: "d - 100", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 4, len: "(w - 3 * t) / 2", width: "d - 110", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "kupe_eshik", qty: 2, len: "h - 80", width: "(w / 2) + 20", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "KUPE-SYS-02", qty: 1 },
      { code: "TRUBA-OVAL", qty: 1 },
      { code: "FLANETS-OVAL", qty: 2 },
      { code: "CONFIRMAT", qty: 24 }
    ]
  },
  {
    code: "SP-G-011",
    name: "Shkaf-kupe 3 eshikli (2400x600x2400)",
    category: "wardrobe",
    group: "garderob",
    w: 2400, d: 600, h: 2400,
    min_w: 2100, max_w: 3000, min_d: 550, max_d: 700,
    stretch_axis: "xy", price_mode: "unit", price: 4200000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ust", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "past", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "peregorodka", qty: 2, len: "h - 2 * t - 100", width: "d - 100", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 6, len: "(w - 4 * t) / 3", width: "d - 110", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "kupe_eshik", qty: 3, len: "h - 80", width: "(w / 3) + 20", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "KUPE-SYS-03", qty: 1 },
      { code: "TRUBA-OVAL", qty: 2 },
      { code: "FLANETS-OVAL", qty: 4 },
      { code: "CONFIRMAT", qty: 36 }
    ]
  },
  {
    code: "SP-G-012",
    name: "Garderob 2 eshik + 2 tortmali (900x550x2100)",
    category: "wardrobe",
    group: "garderob",
    w: 900, d: 550, h: 2100,
    min_w: 800, max_w: 1100, min_d: 500, max_d: 650,
    stretch_axis: "xy", price_mode: "unit", price: 1950000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ust", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "past", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "eshik", qty: 2, len: "h - 400", width: "(w - 6) / 2", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_fasad", qty: 2, len: "190", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 4, len: "450", width: "140", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 2, len: "w - 2 * t - 26", width: "450", slot: "orqa", tekstura: "erkin" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "NAPRAV-450", qty: 2 },
      { code: "PETLYA-NAK", qty: 6 },
      { code: "RUCHKA-128", qty: 4 },
      { code: "TRUBA-OVAL", qty: 1 }
    ]
  },

  // ── 2. Oshxona Penallari va O'rnatma Texnika ──
  {
    code: "SP-K-020",
    name: "Penal Duxovka va Mikroto'lqinli pech uchun (600x600x2100)",
    category: "tall_cabinet",
    group: "kuxnya-kolonna",
    w: 600, d: 600, h: 2100,
    min_w: 600, max_w: 600, min_d: 550, max_d: 650,
    stretch_axis: "y", price_mode: "unit", price: 1650000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ust", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "past", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "texnika_polka", qty: 2, len: "w - 2 * t", width: "d - 20", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tepa_eshik", qty: 1, len: "450", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "past_eshik", qty: 1, len: "710", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "PETLYA-NAK", qty: 4 },
      { code: "RUCHKA-128", qty: 2 },
      { code: "NOG-100", qty: 4 }
    ]
  },
  {
    code: "SP-K-021",
    name: "Penal O'rnatma Muzlatgich uchun (600x600x2100)",
    category: "tall_cabinet",
    group: "kuxnya-muz",
    w: 600, d: 600, h: 2100,
    min_w: 600, max_w: 600, min_d: 550, max_d: 650,
    stretch_axis: "y", price_mode: "unit", price: 1750000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ust", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "past", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tepa_muz_fasad", qty: 1, len: "1150", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "past_muz_fasad", qty: 1, len: "710", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "PETLYA-MUZ", qty: 6 },
      { code: "SLIDER-MUZ", qty: 4 },
      { code: "NOG-100", qty: 4 }
    ]
  },

  // ── 3. Tortmali Oshxona Modullari ──
  {
    code: "SP-K-022",
    name: "Pastki modul 3 tortmali (600x550x720)",
    category: "drawer_base",
    group: "kuxnya-pastki",
    w: 600, d: 550, h: 720,
    min_w: 400, max_w: 900, min_d: 500, max_d: 650,
    stretch_axis: "xy", price_mode: "unit", price: 820000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tsarga", qty: 2, len: "w - 2 * t", width: "100", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "fasad_kichik", qty: 1, len: "140", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "fasad_katta", qty: 2, len: "284", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 6, len: "500", width: "140", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_orqa", qty: 3, len: "w - 2 * t - 76", width: "140", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 3, len: "w - 2 * t - 56", width: "496", slot: "orqa", tekstura: "erkin" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "TANDEM-500", qty: 3 },
      { code: "RUCHKA-128", qty: 3 },
      { code: "NOG-100", qty: 4 }
    ]
  },
  {
    code: "SP-K-023",
    name: "Pastki modul 2 katta tortmali (800x550x720)",
    category: "drawer_base",
    group: "kuxnya-pastki",
    w: 800, d: 550, h: 720,
    min_w: 600, max_w: 1200, min_d: 500, max_d: 650,
    stretch_axis: "xy", price_mode: "unit", price: 980000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tsarga", qty: 2, len: "w - 2 * t", width: "100", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "fasad_katta", qty: 2, len: "354", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 4, len: "500", width: "180", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_orqa", qty: 2, len: "w - 2 * t - 76", width: "180", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 2, len: "w - 2 * t - 56", width: "496", slot: "orqa", tekstura: "erkin" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "TANDEM-500", qty: 2 },
      { code: "RUCHKA-128", qty: 2 },
      { code: "NOG-100", qty: 4 }
    ]
  },
  {
    code: "SP-K-024",
    name: "Kargo butilka saqlagich (200x550x720)",
    category: "cargo_base",
    group: "kuxnya-pastki",
    w: 200, d: 550, h: 720,
    min_w: 150, max_w: 300, min_d: 500, max_d: 650,
    stretch_axis: "y", price_mode: "unit", price: 460000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tsarga", qty: 2, len: "w - 2 * t", width: "80", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "fasad", qty: 1, len: "h - 8", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "KARGO-200", qty: 1 },
      { code: "RUCHKA-128", qty: 1 },
      { code: "NOG-100", qty: 4 }
    ]
  },

  // ── 4. Oshxona Tepasi va Osma Modullari ──
  {
    code: "SP-K-025",
    name: "Tepasi idish quritgichli (Sushilka) osma shkaf (800x320x720)",
    category: "wall_cabinet",
    group: "kuxnya-ustki",
    w: 800, d: 320, h: 720,
    min_w: 600, max_w: 900, min_d: 300, max_d: 400,
    stretch_axis: "xy", price_mode: "unit", price: 590000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "eshik", qty: 2, len: "h - 8", width: "(w - 6) / 2", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "SUSHILKA-800", qty: 1 },
      { code: "PETLYA-DOV", qty: 4 },
      { code: "NAVES-REG", qty: 2 },
      { code: "RUCHKA-128", qty: 2 }
    ]
  },
  {
    code: "SP-K-026",
    name: "Gorizontal ko'tarilma osma shkaf (Aventos) (800x320x720)",
    category: "wall_cabinet",
    group: "kuxnya-ustki",
    w: 800, d: 320, h: 720,
    min_w: 600, max_w: 1200, min_d: 300, max_d: 400,
    stretch_axis: "xy", price_mode: "unit", price: 780000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 1, len: "w - 2 * t", width: "d - 20", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "gorizontal_fasad", qty: 2, len: "(h - 6) / 2", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "LIFT-HF", qty: 1 },
      { code: "NAVES-REG", qty: 2 },
      { code: "RUCHKA-128", qty: 2 }
    ]
  },
  {
    code: "SP-K-027",
    name: "Tepadagi burchak shkafi 90° (600x600x720)",
    category: "wall_corner",
    group: "kuxnya-burchak",
    w: 600, d: 600, h: 720,
    min_w: 550, max_w: 650, min_d: 550, max_d: 650,
    stretch_axis: "y", price_mode: "unit", price: 680000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon_chap", qty: 1, len: "h", width: "320", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "yon_ong", qty: 1, len: "h", width: "320", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "orqa_yon_1", qty: 1, len: "h", width: "600", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "orqa_yon_2", qty: 1, len: "h", width: "600 - t", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub_l", qty: 1, len: "600 - 2 * t", width: "600 - 2 * t", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq_l", qty: 1, len: "600 - 2 * t", width: "600 - 2 * t", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "eshik", qty: 1, len: "h - 8", width: "390", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" }
    ],
    hardware: [
      { code: "PETLYA-BURCHAK-135", qty: 2 },
      { code: "NAVES-REG", qty: 2 },
      { code: "RUCHKA-128", qty: 1 }
    ]
  },

  // ── 5. Mehmonxona va TV modullari ──
  {
    code: "SP-T-001",
    name: "Devorga osma TV tumba (1800x350x300)",
    category: "tv_unit",
    group: "tv",
    w: 1800, d: 350, h: 300,
    min_w: 1400, max_w: 2400, min_d: 300, max_d: 450,
    stretch_axis: "x", price_mode: "unit", price: 1100000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w", width: "d", slot: "korpus", edge: { F: "kromka_korpus", B: "kromka_korpus", L: "kromka_korpus", R: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "peregorodka", qty: 2, len: "h - 2 * t", width: "d - 20", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "otkidnoy_fasad", qty: 3, len: "h - 8", width: "(w - 12) / 3", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "GAZLIFT-PAST", qty: 6 },
      { code: "PETLYA-SEKRETER", qty: 6 },
      { code: "TIP-ON", qty: 3 },
      { code: "NAVES-OGIR", qty: 4 }
    ]
  },
  {
    code: "SP-T-002",
    name: "Ochiq vitrina / Kitob javoni (800x350x2000)",
    category: "bookshelf",
    group: "kitob",
    w: 800, d: 350, h: 2000,
    min_w: 600, max_w: 1200, min_d: 300, max_d: 450,
    stretch_axis: "xy", price_mode: "unit", price: 1250000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 4, len: "w - 2 * t", width: "d - 10", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "POLKODERJATEL", qty: 16 },
      { code: "CONFIRMAT", qty: 16 },
      { code: "NOG-PLASTIK", qty: 4 }
    ]
  },

  // ── 6. Ofis va Yozuv Stollari ──
  {
    code: "SP-O-010",
    name: "Yozuv stoli + 3 tortmali tumba (1400x700x750)",
    category: "desk",
    group: "ofis",
    w: 1400, d: 700, h: 750,
    min_w: 1200, max_w: 1800, min_d: 600, max_d: 800,
    stretch_axis: "xy", price_mode: "unit", price: 1350000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "stoleshnitsa", qty: 1, len: "w", width: "d", slot: "korpus", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "oyoq_chap", qty: 1, len: "h - t", width: "d - 50", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tsarga_orqa", qty: 1, len: "w - 400 - 3 * t", width: "350", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tumba_yon", qty: 2, len: "h - t", width: "500", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tumba_tub", qty: 1, len: "400 - 2 * t", width: "500", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_fasad", qty: 3, len: "(h - t - 40) / 3", width: "396", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 6, len: "450", width: "120", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_orqa", qty: 3, len: "400 - 2 * t - 76", width: "120", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 3, len: "400 - 2 * t - 56", width: "446", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "NAPRAV-450", qty: 3 },
      { code: "RUCHKA-128", qty: 3 },
      { code: "UGOLOK-MEBEL", qty: 8 }
    ]
  },
  {
    code: "SP-O-011",
    name: "G'ildirakli ofis tumbasi (400x450x550)",
    category: "mobile_pedestal",
    group: "ofis",
    w: 400, d: 450, h: 550,
    min_w: 400, max_w: 500, min_d: 400, max_d: 550,
    stretch_axis: "y", price_mode: "unit", price: 540000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h - 60", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w", width: "d", slot: "korpus", edge: { F: "kromka_korpus", B: "kromka_korpus", L: "kromka_korpus", R: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_fasad", qty: 3, len: "(h - 60 - 2 * t) / 3", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 6, len: "400", width: "100", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 3, len: "w - 2 * t - 56", width: "396", slot: "orqa", tekstura: "erkin" },
      { code: "orqa", qty: 1, len: "h - 70", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "NAPRAV-400", qty: 3 },
      { code: "GILDIRAK-ROLIK", qty: 4 },
      { code: "ZAMOK-MARKAZIY", qty: 1 },
      { code: "RUCHKA-128", qty: 3 }
    ]
  },

  // ── 7. Dahliz va Koridor Modullari ──
  {
    code: "SP-D-001",
    name: "Poyabzal tumbasi o'tirgich bilan (900x380x500)",
    category: "shoe_rack",
    group: "peshxona",
    w: 900, d: 380, h: 500,
    min_w: 600, max_w: 1200, min_d: 320, max_d: 450,
    stretch_axis: "x", price_mode: "unit", price: 680000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w", width: "d", slot: "korpus", edge: { F: "kromka_korpus", B: "kromka_korpus", L: "kromka_korpus", R: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 1, len: "w - 2 * t", width: "d - 20", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "eshik", qty: 2, len: "h - 2 * t - 8", width: "(w - 6) / 2", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 10", width: "w - 10", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "PETLYA-NAK", qty: 4 },
      { code: "RUCHKA-128", qty: 2 },
      { code: "NOG-PLASTIK", qty: 4 }
    ]
  },
  {
    code: "SP-D-002",
    name: "Dahliz kiyim ilgich paneli tokcha bilan (800x250x1400)",
    category: "coat_hanger",
    group: "peshxona",
    w: 800, d: 250, h: 1400,
    min_w: 600, max_w: 1200, min_d: 200, max_d: 300,
    stretch_axis: "xy", price_mode: "unit", price: 420000,
    material_code: "LDSP18", production: "panel",
    slots: { korpus: "LDSP18", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "asosiy_panel", qty: 1, len: "h", width: "w", slot: "korpus", edge: { F: "kromka_korpus", B: "kromka_korpus", L: "kromka_korpus", R: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "shapka_polka", qty: 1, len: "w", width: "d", slot: "korpus", edge: { F: "kromka_korpus", B: "kromka_korpus", L: "kromka_korpus", R: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "kroneyshteyn", qty: 2, len: "200", width: "200", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" }
    ],
    hardware: [
      { code: "KRYUCHOK-3TALIK", qty: 5 },
      { code: "NAVES-OGIR", qty: 2 }
    ]
  },

  // ── 8. Hammom Modullari ──
  {
    code: "SP-H-010",
    name: "Hammom osma tumbasi rakovina uchun (800x480x500)",
    category: "vanity",
    group: "hammom",
    w: 800, d: 480, h: 500,
    min_w: 600, max_w: 1200, min_d: 400, max_d: 550,
    stretch_axis: "x", price_mode: "unit", price: 920000,
    material_code: "MDF16", production: "panel",
    slots: { korpus: "MDF16", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC2", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tsarga_tepa", qty: 2, len: "w - 2 * t", width: "80", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_fasad", qty: 2, len: "(h - 6) / 2", width: "w - 4", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "tortma_yon", qty: 4, len: "400", width: "120", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tortma_tub", qty: 2, len: "w - 2 * t - 56", width: "396", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "TANDEM-400-NAM", qty: 2 },
      { code: "NAVES-CAMAR", qty: 2 }
    ]
  },
  {
    code: "SP-H-011",
    name: "Hammom ko'zguli osma dori shkafi (800x150x700)",
    category: "mirror_cabinet",
    group: "hammom",
    w: 800, d: 150, h: 700,
    min_w: 600, max_w: 1000, min_d: 140, max_d: 200,
    stretch_axis: "xy", price_mode: "unit", price: 620000,
    material_code: "MDF16", production: "panel",
    slots: { korpus: "MDF16", fasad: "MDF16", orqa: "HDF3", kromka_korpus: "PVC04", kromka_fasad: "PVC2" },
    parts: [
      { code: "yon", qty: 2, len: "h", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "qopqoq", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "tub", qty: 1, len: "w - 2 * t", width: "d", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "polka", qty: 2, len: "w - 2 * t", width: "d - 20", slot: "korpus", edge: { F: "kromka_korpus" }, tekstura: "uzunlik" },
      { code: "ko'zgu_eshik", qty: 2, len: "h - 4", width: "(w - 6) / 2", slot: "fasad", edge: { F: "kromka_fasad", B: "kromka_fasad", L: "kromka_fasad", R: "kromka_fasad" }, tekstura: "uzunlik" },
      { code: "orqa", qty: 1, len: "h - 4", width: "w - 4", slot: "orqa", tekstura: "erkin" }
    ],
    hardware: [
      { code: "PETLYA-NAM", qty: 4 },
      { code: "TIP-ON", qty: 2 },
      { code: "NAVES-REG", qty: 2 }
    ]
  }
];

let added = 0;
for (const nf of newFragments) {
  if (!existingCodes.has(nf.code)) {
    existing.push(nf);
    existingCodes.add(nf.code);
    added++;
  }
}

fs.writeFileSync(fragsPath, JSON.stringify(existing, null, 1), 'utf8');
console.log(`Muvaffaqiyatli: ${added} ta yangi mebel fragmenti qo'shildi! Jami fragmentlar: ${existing.length}`);
