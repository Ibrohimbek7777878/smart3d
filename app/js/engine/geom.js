/* F1 — poligon geometriya yordamchilari.
 * Hozircha: oddiy (self-intersection'siz) poligonlarni ear-clipping
 * bilan triangulyatsiya. Export'lar (OBJ) uchun: konkav kontur
 * (L shakl) ni bitta n-urchak emas, uchburchaklar ro'yxati sifatida yozish. */

function area2(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function inTri(p, a, b, c) {
  const d1 = area2(a, b, p), d2 = area2(b, c, p), d3 = area2(c, a, p);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/**
 * [x,y] nuqtalar poligonini uchburchaklarga bo'ladi (ear-clipping).
 * @returns {Array<[number,number,number]>} — ORIGIN indekslardagi uchburchaklar,
 *   doim CCW (shoelace musbat) yo'nalishda.
 */
export function triangulate(pts) {
  const n = (pts || []).length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  // indekslarni original nuqtalarga bog'langan holda CW → CCW ga o'giramiz
  const idx = [...Array(n).keys()];
  if (area < 0) idx.reverse();

  const tris = [];
  let guard = n * n + 8;
  while (idx.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic];
      if (area2(a, b, c) <= 1e-9) continue;          // konkav/degnerat — quloq emas
      let ear = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inTri(pts[j], a, b, c)) { ear = false; break; }
      }
      if (ear) {
        tris.push([ia, ib, ic]);
        idx.splice(i, 1);
        clipped = true;
        break;
      }
    }
    if (!clipped) break;                              // self-intersection — qolganini fanga bo'lamiz
  }
  for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
  return tris;
}
