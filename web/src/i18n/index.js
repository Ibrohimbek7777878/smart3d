import { createStore, useStoreSlice } from '../store/store.js';
import uz from './uz.json';
import { XATOLAR } from '../../../app/js/xatolar.js';

/* TZ-18: uch til — o'zbek (asosiy), rus, ingliz. Har matn — kalit bo'yicha lug'atda (uz.json, ru.json, en.json).
 * Tarjima topilmasa — o'zbekchasi (keyin kalitning o'zi) ko'rinadi; to'liqlik testi (tests/verify_til.mjs) buni ushlaydi.
 * Til almashsa sahifa qayta yuklanmaydi: ilova va sayt ildizi til omboriga obuna (useTil), qolgani t() ni chaqiradi.
 * Tezlik (testchi nuqsonlari, 2026-10-22): o'zbekcha lug'at — asosiy bo'lakda; ruscha va inglizcha — alohida bo'laklar (har biri ~35 KB gzip), tanlangan til
 * bo'lgandagina yuklanadi (o'zbekcha ochgan foydalanuvchi ularni yuklamaydi). Yuklanguncha t() o'zbekchasini beradi (tarjima
 * topilmagandagi qoida bilan bir xil); ilova va sayt birinchi chizishdan OLDIN tilniTayyorla() ni kutadi (main.jsx) — o'zbekchada kutish yo'q. */
const LUGAT = { uz };
const YUKLA = { ru: () => import('./ru.json'), en: () => import('./en.json') };
const yuklanmoqda = {};
/* xato kodlari: o'zbekcha matn — bitta manbadan (app/js/xatolar.js), ruscha/inglizcha — lug'atda "xato.S3D-…" */
for (const [kod, x] of Object.entries(XATOLAR)) if (uz['xato.' + kod] == null) uz['xato.' + kod] = x.matn;
export const TILLAR = [['uz', 'O\'zbekcha'], ['ru', 'Русский'], ['en', 'English']];
const KALIT = 's3d-til';

const KODLAR = TILLAR.map(x => x[0]);

function boshlangich() {
  try { const s = localStorage.getItem(KALIT); if (KODLAR.includes(s)) return s; } catch (_) { /* yo'q */ }
  const b = String((typeof navigator !== 'undefined' && navigator.language) || '').slice(0, 2).toLowerCase();
  return KODLAR.includes(b) && b !== 'uz' ? b : 'uz';
}

export const tilStore = createStore({ til: { kod: typeof window !== 'undefined' ? boshlangich() : 'uz' } });
if (typeof document !== 'undefined') document.documentElement.lang = tilStore.get().til.kod;

export const til = () => tilStore.get().til.kod;

/** t('kirish.sarlavha') yoki t('narx.zapchast', { n: 3 }) — {n} o'rniga qiymat */
export function t(key, vars) {
  const k = til();
  let s = (LUGAT[k] || uz)[key];                    // lug'at hali yuklanmagan — o'zbekcha
  if (s == null || s === '') s = uz[key];
  if (s == null) return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, n) => (vars[n] != null ? vars[n] : m)) : s;
}

/** dvigatel bergan o'zbekcha nom (detal, zapchast: "Yon devor", "Ichki javon 2") → tanlangan tilda.
 *  Lug'atdagi o'zbekcha qiymat bo'yicha topiladi (d3.* kalitlar); oxiridagi raqam ("… 2") saqlanadi; topilmasa — o'zi */
let teskari = null;
export function tr(matn) {
  if (matn == null || til() === 'uz') return matn;
  if (!teskari) { teskari = new Map(); for (const [k, v] of Object.entries(uz)) if (k.startsWith('d3.') || k.startsWith('sayt.') || k.startsWith('umumiy.')) if (!teskari.has(v)) teskari.set(v, k); }
  const s = String(matn), k = teskari.get(s);
  if (k) return t(k);
  const m = /^(.*\S)\s+(\d+)$/.exec(s);
  if (m && teskari.has(m[1])) return t(teskari.get(m[1])) + ' ' + m[2];
  const h = /^(.*) \(HDF\)$/.exec(s);
  if (h && teskari.has(h[1])) return t(teskari.get(h[1])) + ' (HDF)';
  return s;
}

/** foydalanuvchiga xato: "matn · S3D-…" */
export const xatoMatni = (code) => t('xato.' + code) + ' · ' + code;

/** server xatosi: o'zbekchada — serverning aniq matni; boshqa tilda — kod bo'yicha tarjima (bo'lsa) */
export function serverXato(matn, code) {
  if (!code || til() === 'uz') return matn;
  const k = 'xato.' + code;
  const L = LUGAT[til()];
  return L && L[k] ? L[k] : matn;
}

/** tilning lug'ati yuklanadimi (kod berilmasa — tanlangan til): tayyor bo'lsa — darhol; yuklanmasa (tarmoq) rad etadi */
export function tilniTayyorla(kod) {
  kod = kod || til();
  if (LUGAT[kod] || !YUKLA[kod]) return Promise.resolve();
  return yuklanmoqda[kod] || (yuklanmoqda[kod] = YUKLA[kod]().then(
    (m) => { LUGAT[kod] = m.default; },
    (e) => { delete yuklanmoqda[kod]; throw e; }));
}

/** til almashtirish: eslab qolinadi (qurilmada; kirgan bo'lsa — serverda ham, onChange orqali).
 *  Lug'at yuklangan bo'lsa — darhol; yuklanmagan bo'lsa (ru/en, birinchi marta) — yuklangach. Tarmoq yo'q bo'lsa til almashmaydi,
 *  qayta tanlash mumkin. Qaytaradi: almashgunicha kutiladigan va'da (ilova ishga tushishida kutiladi). */
const listeners = new Set();
let sorov = 0, kutish = Promise.resolve();
function qollash(kod, serverdan) {
  tilStore.set('til', { kod });
  try { localStorage.setItem(KALIT, kod); } catch (_) { /* kvota */ }
  document.documentElement.lang = kod;
  listeners.forEach(f => f(kod, !!serverdan));
}
export function setTil(kod, serverdan) {
  if (!KODLAR.includes(kod) || kod === til()) return kutish;
  const n = ++sorov;
  if (LUGAT[kod]) { qollash(kod, serverdan); return kutish; }
  kutish = tilniTayyorla(kod).then(() => { if (n === sorov) qollash(kod, serverdan); }, () => { /* tarmoq yo'q — til almashmaydi */ });
  return kutish;
}
/** birinchi chizishdan oldin: tanlangan tilning lug'ati (va kutilayotgan setTil) tayyor bo'lishini kutish */
export const tilKut = () => Promise.all([tilniTayyorla(), kutish]).then(() => undefined);
export const onTil = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** React: til o'zgarsa qayta chizish (ilova va sayt ildizida) */
export const useTil = () => useStoreSlice(tilStore, 'til').kod;
