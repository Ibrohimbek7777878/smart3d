/* TZ-25 D: xona devorlari — geometriya (sof funksiyalar, brauzersiz test qilinadi: tests/verify_devor.mjs). Birlik — mm.
 * Xona — yopiq ko'pburchak `outline` ([[x, y], ...], i-devor: outline[i] → outline[i+1]). Teshik (eshik, deraza) —
 * { wall, offset (devor boshidan), width }. Devor o'zgarsa, teshiklar o'z devorida qoladi (offset devor uzunligiga sig'diriladi). */

export const QADAM = 10;                      // uzunlik yaxlitlash, mm
export const MIN_DEVOR = 300;                 // eng qisqa devor
export const MAX_DEVOR = 30000;
const r10 = (v) => Math.round(v / QADAM) * QADAM;

/** a → b: burchak 45° ga yopishadi (erkin bo'lsa — yo'q), uzunlik 10 mm ga yaxlitlanadi. Natija: { p, len, deg } */
export function yopishtir(a, b, erkin = false) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (!erkin) ang = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
  len = r10(len);
  const p = [Math.round(a[0] + Math.cos(ang) * len), Math.round(a[1] + Math.sin(ang) * len)];
  return { p, len, deg: Math.round(((ang * 180 / Math.PI) % 360 + 360) % 360) };
}

/** a dan berilgan yo'nalishda (gradus) aniq uzunlikdagi nuqta */
export function uzunlikBilan(a, len, deg) {
  const r = deg * Math.PI / 180;
  return [Math.round(a[0] + Math.cos(r) * len), Math.round(a[1] + Math.sin(r) * len)];
}

/** matn qatoridagi buyruq: "3000" (joriy yo'nalishda) yoki "3000 90" / "3000<90" (uzunlik va burchak, gradus) */
export function buyruqOqi(matn) {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:[<@\s]\s*(-?\d+(?:[.,]\d+)?))?\s*$/.exec(String(matn || ''));
  if (!m) return null;
  const len = Math.round(+m[1].replace(',', '.'));
  if (!(len >= MIN_DEVOR && len <= MAX_DEVOR)) return { xato: 'uzunlik' };
  return { len, deg: m[2] != null ? +m[2].replace(',', '.') : null };
}

/** yonma-yon takror va bir chiziqdagi oraliq nuqtalar olib tashlanadi; kamida 3 nuqta bo'lmasa — null */
export function tozala(pts) {
  const p = [];
  for (const q of pts) {
    const r = [Math.round(+q[0]), Math.round(+q[1])], l = p[p.length - 1];
    if (!isFinite(r[0]) || !isFinite(r[1])) return null;
    if (!l || Math.hypot(r[0] - l[0], r[1] - l[1]) > 1) p.push(r);
  }
  while (p.length > 1 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) <= 1) p.pop();
  /* bir chiziqdagi (yoki orqaga qaytgan) oraliq nuqta — olib tashlanadi */
  for (let o = true; o && p.length > 3;) {
    o = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
      const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) <= 0.001 * ab * bc) { p.splice(i, 1); o = true; break; }
    }
  }
  if (p.length < 3) return null;
  return Math.abs(yuza(p)) < 100 * 100 ? null : p;          // yuzasi nolga yaqin — xona emas
}

export function yuza(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }

export function devorUzunligi(p, i) { const a = p[i], b = p[(i + 1) % p.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); }

/** i-devor uzunligini o'zgartirish: oxiri devor yo'nalishida suriladi, keyingi devor o'ziga parallel ko'chadi
 *  (to'g'ri burchakli xonada — xona eni o'zgaradi, shakl buzilmaydi). */
export function uzunlikniOzgartir(p, i, yangi) {
  const n = p.length, a = p[i], b = p[(i + 1) % n], L = devorUzunligi(p, i);
  if (!(L > 0) || !(yangi >= MIN_DEVOR && yangi <= MAX_DEVOR)) return null;
  const d = yangi - L, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const q = p.map(x => x.slice());
  for (const k of [(i + 1) % n, (i + 2) % n]) if (k !== i) { q[k][0] = Math.round(q[k][0] + ux * d); q[k][1] = Math.round(q[k][1] + uy * d); }
  return q;
}

/** i-devorni o'ziga perpendikulyar surish (masofa, mm; musbat — chap normal tomonga). Qo'shni devorlar cho'ziladi. */
export function devorniSur(p, i, masofa) {
  const n = p.length, a = p[i], b = p[(i + 1) % n], L = devorUzunligi(p, i);
  if (!(L > 0)) return null;
  const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  const q = p.map(x => x.slice());
  for (const k of [i, (i + 1) % n]) { q[k][0] = Math.round(q[k][0] + nx * masofa); q[k][1] = Math.round(q[k][1] + ny * masofa); }
  return q;
}

/** nuqtaga eng yaqin devor: { i, t (devor boshidan, mm), d (masofa, mm) } */
export function engYaqinDevor(p, q) {
  let best = null;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], L = devorUzunligi(p, i);
    if (!(L > 0)) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const t = Math.max(0, Math.min(L, (q[0] - a[0]) * ux + (q[1] - a[1]) * uy));
    const d = Math.hypot(q[0] - (a[0] + ux * t), q[1] - (a[1] + uy * t));
    if (!best || d < best.d) best = { i, t, d, L };
  }
  return best;
}

/** devordagi nuqta (boshidan t mm) */
export function devorNuqtasi(p, i, t) {
  const a = p[i], b = p[(i + 1) % p.length], L = devorUzunligi(p, i) || 1;
  return [a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L];
}

/** teshikni devorga sig'dirish: chetidan kamida 50 mm; sig'masa — null */
export function teshikSigdir(L, offset, width) {
  const w = Math.round(+width || 0);
  if (!(w >= 300) || w > L - 100) return null;
  return { offset: Math.round(Math.max(50, Math.min(L - w - 50, +offset || 0))), width: w };
}

/** devorlar o'zgargach teshiklar: o'z devorida, uzunlikka sig'diriladi; sig'maganlari olib tashlanadi */
export function teshiklarniMosla(p, openings) {
  return (openings || []).map(o => {
    if (!(o.wall >= 0 && o.wall < p.length)) return null;
    const s = teshikSigdir(devorUzunligi(p, o.wall), o.offset, o.width);
    return s ? Object.assign({}, o, s) : null;
  }).filter(Boolean);
}

/** tayyor shakllar (TZ-25 D4): to'g'ri to'rtburchak, L va P (U) */
export function tayyorShakl(tur, W = 3600, D = 3000) {
  if (tur === 'L') return [[0, 0], [W, 0], [W, Math.round(D * 0.6)], [Math.round(W * 0.6), Math.round(D * 0.6)], [Math.round(W * 0.6), D], [0, D]];
  if (tur === 'P') {
    const c = Math.round(W * 0.3), e = Math.round(W * 0.7), g = Math.round(D * 0.55);
    return [[0, 0], [W, 0], [W, D], [e, D], [e, g], [c, g], [c, D], [0, D]];
  }
  return [[0, 0], [W, 0], [W, D], [0, D]];
}
