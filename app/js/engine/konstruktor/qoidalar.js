/* Smart3D engine/konstruktor/qoidalar.js — TZ-22: avtomatik konstruktor qoidalari.
 *
 * Har qiymatning manbasi yozilgan. "taklif: true" — texnolog tasdiqlaguncha taklif (qoida 4.3: raqam o'ylab topilmaydi —
 * bu ergonomik oraliqlar, narx emas; egasi/texnolog o'zgartiradi). Admin keyin ekrandan o'zgartiradi (TZ-14 sahifasi).
 * O'zgartirish: konstruksiya(…, { qoidalar: { plita: { yon: 250 } } }) — chuqur birlashtiriladi.
 */
export const QOIDALAR = {
  /* modullar — MebelCity'ning Bazis modullari (MC-*) */
  modul: {
    pastki: { bir: 'MC-KP-01', ikki: 'MC-KP-02', tortma: 'MC-KP-10', moyka2: 'MC-KP-08', moyka1: 'MC-KP-07', burchak: 'MC-KP-05' },
    ustki: { bir: 'MC-KU-06', ikki: 'MC-KU-07', ochiq: 'MC-KU-08', burchak: 'MC-KU-02', vityajka: 'MC-KU-10' },
    dobor: { pastki: 'SP-ST-005', ustki: 'SP-ST-006' },
    texnika: { xolodilnik: 'SP-T-004', plita: 'SP-T-007' }
  },
  /* o'lchamlar: MC modullari (Bazis) va sex standarti (egasi tasdiqlagan 2026-10-15) */
  pastki: { h: 708, d: 450, manba: 'MC-KP-* (Bazis): h 708, d 450 — sex standarti std[0]' },
  ustki: { h: 721, d: 300, z: 1450, manba: 'MC-KU-07 (Bazis) h 721, d 300; z — TZ-15 (USTKI_Z)' },
  stoleshnitsa: { d: 600, manba: 'MC modullari (Bazis): "Эггер Столешница 4,1х0,6х38" — chuqurligi 600' },
  /* eni chegaralari — sex standartidan (fragment min/max), bu yerda faqat afzal qadam */
  qadam: 50,
  afzal: { bir: [400, 450, 500, 350, 300], ikki: [600, 800, 900, 700, 1000] },
  /* yon dobor (planka) — devor/burchak yonida eshik va tutqich ochilishi uchun */
  dobor: { devor: [40, 100], burchak: [50, 100], texnika: [40, 100], ustki: [30, 100], taklif: true },
  plita: { eni: 600, yon: 300, derazadan: 300, taklif: true },        // plita yonida kamida 300 mm ish yuzasi / modul
  moyka: { eni: 600, plitadan: 400, taklif: true },                    // moyka bilan plita orasida kamida 400 mm
  xolodilnik: { eni: 600, manba: 'appliances.json SP-T-004 (nishon)' },
  xonaEshigi: { oraliq: 100, taklif: true },                           // xona eshigi chetidan bo'sh joy
  deraza: { oraliq: 50, taklif: true },                                // deraza chetidan ustki shkafgacha
  eshik: { burchak: 90 },                                              // tekshiruvdagi ochilish burchagi (Bazis: "Петля 90º")
  minQator: 300                                                        // bundan qisqa devor bo'lagiga modul qo'yilmaydi
};

function chuqur(a, b) {
  const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' ? chuqur(a[k], v) : v;
  }
  return out;
}
export function qoidalar(ust) { return ust ? chuqur(QOIDALAR, ust) : QOIDALAR; }
