/* Smart3D engine/konstruktor/devor.js — TZ-22: xona devorlari konstruktor uchun.
 *
 * Har devor: S (boshlanish) → E (oxir) yo'nalishi u — modulning lokal x o'qi; n — xona ichiga normal (modul fasadi shu tomonga).
 * Modul devor bo'ylab s masofada: anchor = S + s·u (orqa-chap burchak devor chizig'ida), rot — n bo'yicha
 * (n=(0,1)→0°, (−1,0)→90°, (0,−1)→180°, (1,0)→270°; rules.footprint bilan bir xil).
 * Faqat o'qlarga parallel devorlar (qiya devorga modul avtomatik qo'yilmaydi).
 * Teshik (eshik/deraza) va quvur offset'i A (outline[i]) dan o'lchanadi — s ga o'giriladi.
 */
const ROT = { '0,1': 0, '-1,0': 90, '0,-1': 180, '1,0': 270 };

export function devorlar(room) {
  const pts = (room && room.outline) || [];
  const n = pts.length;
  let a2 = 0;
  for (let i = 0; i < n; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n]; a2 += x1 * y2 - x2 * y1; }
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[(i + 1) % n];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    if (!len) continue;
    const ox = dx / len, oy = dy / len;
    const nx = a2 > 0 ? -oy : oy, ny = a2 > 0 ? ox : -ox;               // ichkariga normal
    const ux = ny, uy = -nx;                                              // modul lokal x o'qi
    const key = Math.round(nx) + ',' + Math.round(ny);
    const tekis = Math.abs(Math.abs(nx) + Math.abs(ny) - 1) < 1e-6 && key in ROT;
    const teskari = ux * dx + uy * dy < 0;                                // S = B (u A→B ga qarama-qarshi)
    const S = teskari ? B : A;
    out.push({
      i, A, B, S, E: teskari ? A : B, len, teskari, tekis,
      u: [Math.round(ux), Math.round(uy)], n: [Math.round(nx), Math.round(ny)], rot: tekis ? ROT[key] : null,
      /** A dan o'lchangan offset (va eni) → s oralig'i [s0, s1] */
      oraliq(off, wid = 0) { return teskari ? [len - off - wid, len - off] : [off, off + wid]; },
      /** devor bo'ylab s, devordan chuqurlik 0 dagi nuqta */
      nuqta(s) { return [S[0] + s * ux, S[1] + s * uy]; }
    });
  }
  return out;
}

/** Ikki devor umumiy burchak nuqtasi — a.E === b.S bo'lsa 'ab' (b ning boshida burchak), a.S === b.E bo'lsa 'ba' */
export function burchak(a, b) {
  const teng = (p, q) => Math.abs(p[0] - q[0]) < 1 && Math.abs(p[1] - q[1]) < 1;
  if (teng(a.E, b.S)) return 'ab';
  if (teng(a.S, b.E)) return 'ba';
  return null;
}

/** devordagi to'siqlar (s oraliqlari): pastki/ustki qatlam uchun */
export function tosiqlar(room, dv, Q) {
  const pastki = [], ustki = [];
  for (const o of (room && room.openings) || []) {
    if (+o.wall !== dv.i) continue;
    const [s0, s1] = dv.oraliq(+o.offset || 0, +o.width || 0);
    if (o.type === 'door') {
      const m = Q.xonaEshigi.oraliq;
      pastki.push([s0 - m, s1 + m, 'eshik']); ustki.push([s0 - m, s1 + m, 'eshik']);
    } else {
      const m = Q.deraza.oraliq;
      ustki.push([s0 - m, s1 + m, 'deraza']);
      /* tokcha stoleshnitsadan past bo'lsa — deraza ostiga pastki modul ham qo'yilmaydi */
      if ((+o.sill || 0) < Q.pastki.h + 40) pastki.push([s0, s1, 'deraza']);
    }
  }
  return { pastki, ustki };
}

/** [0, len] dan to'siqlarni ayirib, bo'sh oraliqlar: [{ s0, s1, b0 (boshlanish turi), b1 }].
 *  To'siq yonidagi uch: muzlatgich — 'texnika' (dobor shart), qolganlari (eshik, deraza, vityajka) — 'erkin'. */
export function boshOraliqlar(len, bloklar, uchlar = ['devor', 'devor']) {
  const bl = bloklar.map(b => [Math.max(0, b[0]), Math.min(len, b[1]), b[2]]).filter(b => b[1] > b[0]).sort((a, b) => a[0] - b[0]);
  const uch = (t) => t === 'xolodilnik' ? 'texnika' : 'erkin';
  const out = [];
  let cur = 0, curT = uchlar[0];
  for (const [b0, b1, t] of bl) {
    if (b0 > cur) out.push({ s0: cur, s1: b0, b0: curT, b1: uch(t) });
    if (b1 > cur) { cur = b1; curT = uch(t); }
  }
  if (len > cur) out.push({ s0: cur, s1: len, b0: curT, b1: uchlar[1] });
  return out;
}
