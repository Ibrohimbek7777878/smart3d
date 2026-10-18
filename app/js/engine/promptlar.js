/* Smart3D engine/promptlar.js — TZ-24 B: tayyor so'rovlar kutubxonasi (app/data/promptlar.json) — AI'siz loyiha.
 *
 * Har so'rov: kategoriya, nomi va izohi (uz/ru/en), o'zgaradigan raqamlar (maydon: xona eni, chuqurligi …) va usul:
 *   oshxona — avtomatik konstruktor (TZ-22): talab (shakl I/L/U, ustki …) bilan eng yaxshi variant;
 *   toplam  — katalogdagi aniq modullar devor bo'ylab: devor (orqa/chap/ong/old), joy (bosh/markaz/oxir),
 *             eni — o'zi, aniq son yoki "toldir" (devorga sig'guncha, modul chegarasi ichida), z — osma bo'lsa.
 * Joylash to'qnashuvsiz va xona ichida; sig'maganlari ro'yxatda qaytadi (o'ylab joylanmaydi).
 */
import { footprint } from './rules.js';
import { devorChegara } from './devorOraliq.js';
import { boshiXda } from '../mebel3d.js';

export const KATEGORIYALAR = ['oshxona', 'garderob', 'yotoqxona', 'bolalar', 'mehmonxona', 'ofis', 'dahliz', 'hammom'];
const QADAM = 10;

/** kiritilgan raqamlar → maydon chegaralari ichida (bo'sh yoki xato — standart qiymat) */
export function qiymatlar(prompt, kirish = {}) {
  const out = {};
  for (const m of (prompt && prompt.maydon) || []) {
    let v = Math.round(+kirish[m.k]);
    if (!isFinite(v) || kirish[m.k] === '' || kirish[m.k] == null) v = m.q;
    out[m.k] = Math.min(m.max, Math.max(m.min, v));
  }
  return out;
}

/** devor bo'ylab s nuqtadan (devor boshidan, mm) eni w modul — joylashuv (x, y, rot) */
function devorga(devor, s, w, W, D) {
  switch (devor) {
    case 'chap': return { x: 0, y: s + w, rot: 270 };
    case 'ong': return { x: W, y: s, rot: 90 };
    case 'old': return { x: s + w, y: D, rot: 180 };
    default: return { x: s, y: 0, rot: 0 };
  }
}

/** krovat boshi devorga: asosiy joylashuv (devorga) o'rniga 90° burilgan — kesim (x0,y0) shu devor bo'ylab bo (=d) × chuqurlik (=w) to'rtburchakka tushadi */
function buril90(p, devor, s, f, W, D) {
  const nishon = footprint(Object.assign({ w: f.d, d: f.w }, devorga(devor, s, f.d, W, D)));      // devor bo'ylab f.d, chuqurligi f.w
  const rot = (p.rot + 90) % 360;
  const o = footprint({ w: f.w, d: f.d, x: 0, y: 0, rot });
  p.rot = rot; p.x = nishon.x0 - o.x0; p.y = nishon.y0 - o.y0;
}

const kesishadi = (a, b) => {
  const A = footprint(a), B = footprint(b);
  const xy = A.x0 < B.x1 - 1 && B.x0 < A.x1 - 1 && A.y0 < B.y1 - 1 && B.y0 < A.y1 - 1;
  const z = (+a.z || 0) < (+b.z || 0) + (+b.h || 0) - 1 && (+b.z || 0) < (+a.z || 0) + (+a.h || 0) - 1;
  return xy && z;
};
const ichida = (p, W, D) => { const f = footprint(p); return f.x0 >= -0.5 && f.y0 >= -0.5 && f.x1 <= W + 0.5 && f.y1 <= D + 0.5; };

/**
 * Modullarni devor bo'ylab joylash.
 * @param {number} W — xona eni (x), D — chuqurligi (y), H — balandligi
 * @param {Array} items — [{ kod, devor, joy, w?, z? }]
 * @param {number} [T] — kontur chizig'idan modulgacha (egasi #152: devor qalinligining yarmi + DEVOR_ORALIQ — modul devorga tiralmaydi)
 * @returns {{ placements: Array, sigmadi: string[] }}
 */
export function toplamJoyla(W, D, H, items, catalog, T = devorChegara({ wall_thickness: 100 })) {
  /* ichki to'rtburchakda (har devordan T) joylanadi, keyin T ga suriladi */
  const r = toplamIchki(W - 2 * T, D - 2 * T, H, items, catalog);
  for (const p of r.placements) { p.x += T; p.y += T; }
  return r;
}
function toplamIchki(W, D, H, items, catalog) {
  const placements = [], sigmadi = [];
  let id = 1;
  for (const it of items || []) {
    const f = catalog[it.kod];
    if (!f) { sigmadi.push(it.kod); continue; }
    const L = it.devor === 'chap' || it.devor === 'ong' ? D : W;
    const minW = +f.min_w || f.w, maxW = +f.max_w || f.w;
    const z = it.z != null ? +it.z : +f.default_z || 0;
    if (z + f.h > H) { sigmadi.push(it.kod); continue; }
    /* eni: "toldir" — devorga sig'adigan eng kattasi (chegarada), aks holda o'zi yoki berilgan son (chegarada) */
    /* egasi #239–#241: uzun o'qi x bo'lgan krovat (MC-KR-01/04/05, boshi -x da) — 90° buriladi: boshi devorga tiralib, uzun tomoni xonaga qaraydi;
       devor bo'ylab o'lchami — krovat eni (d), devordan chuqurligi — uzunligi (w) */
    const burish = boshiXda(f);
    const enlar = burish ? [f.w] : it.w === 'toldir'
      ? (() => { const a = []; for (let v = Math.min(maxW, L); v >= minW; v -= 50) a.push(v); if (!a.length || a[a.length - 1] !== minW) a.push(minW); return a; })()
      : [Math.min(maxW, Math.max(minW, +it.w || f.w))];
    let joy = null;
    for (const w of enlar) {
      const bo = burish ? f.d : w;                      // devor bo'ylab egallagan uzunlik
      if (bo > L) continue;
      /* boshlanish nuqtalari: bosh — 0 dan oldinga, oxir — oxiridan orqaga, markaz — o'rtadan ikki tomonga */
      const nuqtalar = [];
      const oxir = Math.floor((L - bo) / QADAM) * QADAM;
      if (it.joy === 'oxir') for (let s = oxir; s >= 0; s -= QADAM) nuqtalar.push(s);
      else if (it.joy === 'markaz') { const m = Math.round((L - bo) / 2); nuqtalar.push(m); for (let k = QADAM; k <= L; k += QADAM) { if (m - k >= 0) nuqtalar.push(m - k); if (m + k <= L - bo) nuqtalar.push(m + k); } }
      else for (let s = 0; s <= L - bo; s += QADAM) nuqtalar.push(s);
      for (const s of nuqtalar) {
        const p = Object.assign({ id: 'p' + id, frg: f.code, name: f.name, z, w, d: f.d, h: f.h, qty: 1 }, devorga(it.devor, s, bo, W, D));
        if (burish) buril90(p, it.devor, s, f, W, D);
        if (it.klassik) p.klassik = true;                                   // TZ-35: garnitur — klassik ramkali fasad, yumshoq krovat (faqat 3D ko'rinish)
        if (it.push) p.push = true;                                          // ruchkasiz (3D: ruchka chizilmaydi; kesim/narx o'zgarmaydi)
        if (ichida(p, W, D) && !placements.some(q => kesishadi(p, q))) { joy = p; break; }
      }
      if (joy) break;
    }
    if (joy) { placements.push(joy); id++; } else sigmadi.push(it.kod);
  }
  return { placements, sigmadi };
}

/**
 * So'rov → loyiha qismlari (xona, modullar, oshxona sozlamasi).
 * @param {Object} prompt — promptlar.json yozuvi
 * @param {Object} kirish — foydalanuvchi raqamlari { eni, chuqurligi, … }
 * @param {Object} catalog
 * @param {{ konstruksiya?: Function }} o — oshxona uchun (engine/konstruktor)
 * @returns {{ xona: {W, D, H, outline}, placements, kitchen?, sigmadi: string[], xato?: string }}
 */
export function promptLoyiha(prompt, kirish, catalog, o = {}) {
  const q = qiymatlar(prompt, kirish);
  const W = q.eni || 3600, D = q.chuqurligi || 3000, H = q.balandligi || 2700;
  const xona = { W, D, H, outline: [[0, 0], [W, 0], [W, D], [0, D]] };
  if (prompt.usul === 'oshxona') {
    if (!o.konstruksiya) return { xona, placements: [], sigmadi: [], xato: 'S3D-KONS-101' };
    const room = { outline: xona.outline, wall_height: H, wall_thickness: 100, openings: [], utilities: [] };
    const r = o.konstruksiya(room, Object.assign({ devor: 0 }, prompt.talab || {}), catalog);
    const v = r && r.variantlar && r.variantlar[0];
    if (!v) return { xona, placements: [], sigmadi: [], xato: (r && r.xato) || 'S3D-KONS-103' };
    return { xona, placements: v.placements, kitchen: v.kitchen, sigmadi: [], shakl: v.shakl };
  }
  const t = toplamJoyla(W, D, H, prompt.toplam, catalog);
  if (prompt.garnituRang) for (const p of t.placements) if (p.klassik) p.garnituRang = +prompt.garnituRang;   // TZ-35: butun garnitur bitta rangda (kashemir)
  return { xona, placements: t.placements, sigmadi: t.sigmadi };
}
