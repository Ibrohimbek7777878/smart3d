/* Smart3D engine/devorOraliq.js — egasi #152: modul devorga hech qachon tirab qo'yilmaydi; #151: modulni surish qoidalari.
 *
 * Devor xona konturi (room.outline) chizig'ining IKKI tomoniga qalinligining yarmidan chiziladi (scene.js buildWalls:
 * ExtrudeGeometry depth = wall_thickness, −thick/2 ga siljigan). Demak devorning ichki yuzasi kontur chizig'idan
 * wall_thickness/2 ichkarida. Modulning orqa (va burchakda yon) yuzasi bilan devor yuzasi orasida DEVOR_ORALIQ mm
 * bo'shliq qoladi → modul kontur chizig'idan kamida  T = wall_thickness/2 + DEVOR_ORALIQ  uzoqda turadi.
 *
 * Hamma joylash yo'li shu modulni ishlatadi: katalogdan qo'shish (loyiha.addPlacement), avtomatik konstruktor
 * (konstruktor/index.js — ichkiXona), AI zaxira joylashi (ai.js suggestLayout), tayyor so'rovlar (promptlar.js),
 * sichqoncha/barmoq bilan surish (surishJoyi — items.js orqali).
 */
import { footprint, pointInPoly, roomBBox } from './rules.js';

/** mm — egasi #152 ("devordan … surib qo'y"); egasi "3 metr" deb yozdi, ma'nosi bo'yicha 3 mm — birligi tasdiqlanmoqda */
export const DEVOR_ORALIQ = 3;

/** mm — egasi #156: "Devordan 3 metr qochsin, devorga yopishib qolmasin". YANGI bitta modul (katalogdan "+", AI natijasi,
 *  "Modul chizish" → Tayyor, nusxa) orqa devor yuzasidan shuncha nariga, eni bo'yicha xona o'rtasiga qo'yiladi.
 *  Istisno: avtomatik oshxona va konstruktor/tayyor so'rovlar qatori devor bo'ylab turadi (DEVOR_ORALIQ). */
export const YANGI_MODUL_DEVORDAN = 3000;
/** erkin maydonda modul yo'q bo'lsa — standart pol (mm), korinish.js MAYDON_STANDART bilan bir xil */
export const ERKIN_STANDART = [5000, 4000];

const num = (v) => { const n = +v; return isFinite(n) ? n : 0; };
/** devor qalinligining yarmi (kontur chizig'idan devor yuzasigacha), mm */
export const devorYarim = (room) => (num(room && room.wall_thickness) || 100) / 2;
/** kontur chizig'idan modulgacha eng kam masofa, mm */
export const devorChegara = (room, oraliq = DEVOR_ORALIQ) => devorYarim(room) + num(oraliq);

/** devorlar: A → B, u — yo'nalish (birlik), n — xona ichiga normal, len */
function devorlar(outline) {
  const pts = outline || [], k = pts.length, out = [];
  let a2 = 0;
  for (let i = 0; i < k; i++) { const a = pts[i], b = pts[(i + 1) % k]; a2 += num(a[0]) * num(b[1]) - num(b[0]) * num(a[1]); }
  for (let i = 0; i < k; i++) {
    const A = [num(pts[i][0]), num(pts[i][1])], B = [num(pts[(i + 1) % k][0]), num(pts[(i + 1) % k][1])];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;
    out.push({ i, A, B, len, u: [ux, uy], n: a2 > 0 ? [-uy, ux] : [uy, -ux] });   // konstruktor/devor.js bilan bir xil
  }
  return out;
}

/* burilish: 0/90/180/270 da aniq (rules.footprint kabi — 599.999… soxta xato bo'lmasin) */
function cs(rot) {
  const deg = ((num(rot) % 360) + 360) % 360;
  if (deg === 0) return [1, 0]; if (deg === 90) return [0, 1]; if (deg === 180) return [-1, 0]; if (deg === 270) return [0, -1];
  const a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)];
}
/** modul to'rtburchagining 4 burchagi (haqiqiy, burilgan) */
export function burchaklar(p) {
  const [c, s] = cs(p.rot), w = num(p.w), d = num(p.d), x = num(p.x), y = num(p.y);
  return [[0, 0], [w, 0], [w, d], [0, d]].map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]);
}

/** shu devorga nisbatan: devor bo'ylab kesishadimi va kontur chizig'idan eng yaqin nuqta (s0), markaz (sc) */
function devorgaNisbat(dv, P) {
  let t0 = Infinity, t1 = -Infinity, s0 = Infinity, sc = 0;
  for (const [x, y] of P) {
    const rx = x - dv.A[0], ry = y - dv.A[1];
    const t = rx * dv.u[0] + ry * dv.u[1], s = rx * dv.n[0] + ry * dv.n[1];
    if (t < t0) t0 = t; if (t > t1) t1 = t; if (s < s0) s0 = s; sc += s / P.length;
  }
  const ustida = Math.min(t1, dv.len) - Math.max(t0, 0) > 0.5;      // devor uzunligi bo'ylab ustma-ust
  return { ustida, s0, sc };
}

/**
 * Har devor uchun modul va devor YUZASI orasidagi bo'shliq (mm): manfiy — devor ichiga kirgan.
 * Faqat devor bo'ylab ustma-ust va xona tomonida turgan devorlar; yaqinlik chegarasi `uzoq` mm.
 * @returns {Array<{ i, oraliq }>}
 */
export function devorOraliqlari(room, p, uzoq = 1000) {
  const yarim = devorYarim(room), P = burchaklar(p), out = [];
  for (const dv of devorlar(room && room.outline)) {
    const r = devorgaNisbat(dv, P);
    if (!r.ustida || r.sc <= 0 || r.s0 - yarim > uzoq) continue;
    out.push({ i: dv.i, oraliq: r.s0 - yarim });
  }
  return out;
}

/**
 * Modulni devordan kerakli masofaga suradi (joyida o'zgartiradi): yaqin devorlardan T gacha ichkariga, burchakda — ikkalasidan.
 * o.yopish — magnit (mm): devordan T+yopish dan yaqin bo'lsa aynan T ga tortiladi (surishda devorga "yopishadi").
 * @returns {object} p
 */
export function devordanSur(room, p, o = {}) {
  const T = devorChegara(room, o.oraliq), Y = num(o.yopish);
  const D = devorlar(room && room.outline);
  for (let k = 0; k < 4; k++) {
    let ozgardi = false;
    const P = burchaklar(p);
    for (const dv of D) {
      const r = devorgaNisbat(dv, P);
      if (!r.ustida || r.sc <= 0) continue;                         // devor bo'ylab emas yoki modul devor tashqarisida
      const farq = T - r.s0;                                       // > 0 — devorga juda yaqin (yoki ichida)
      if (farq > 0.01 || (Y > 0 && farq < 0 && -farq < Y)) {
        p.x = Math.round((num(p.x) + farq * dv.n[0]) * 100) / 100;
        p.y = Math.round((num(p.y) + farq * dv.n[1]) * 100) / 100;
        ozgardi = true;
        break;                                                     // burchaklar qayta hisoblanadi
      }
    }
    if (!ozgardi) break;
  }
  return p;
}

/**
 * Konstruktor uchun "ichki xona": kontur T ga ichkariga suriladi (har burchak — ikki qo'shni devor chizig'ining kesishishi).
 * Eshik/deraza va quvur offsetlari yangi devor boshidan qayta o'lchanadi (dunyodagi joyi o'zgarmaydi).
 */
export function ichkiXona(room, T = devorChegara(room)) {
  const pts = (room && room.outline) || [];
  const k = pts.length;
  if (k < 3 || !(T > 0)) return room;
  let a2 = 0;
  for (let i = 0; i < k; i++) { const a = pts[i], b = pts[(i + 1) % k]; a2 += num(a[0]) * num(b[1]) - num(b[0]) * num(a[1]); }
  const nrm = (i) => {
    const a = pts[i], b = pts[(i + 1) % k], dx = num(b[0]) - num(a[0]), dy = num(b[1]) - num(a[1]), l = Math.hypot(dx, dy) || 1;
    return a2 > 0 ? [-dy / l, dx / l] : [dy / l, -dx / l];
  };
  const yangi = pts.map((p, i) => {
    const n0 = nrm((i - 1 + k) % k), n1 = nrm(i), dot = n0[0] * n1[0] + n0[1] * n1[1];
    const m = dot > -0.99 ? T / (1 + dot) : T;
    const [vx, vy] = dot > -0.99 ? [n0[0] + n1[0], n0[1] + n1[1]] : n1;
    return [Math.round((num(p[0]) + vx * m) * 1000) / 1000, Math.round((num(p[1]) + vy * m) * 1000) / 1000];
  });
  const qayta = (o, keng) => {
    const i = parseInt(o.wall, 10);
    if (!(i >= 0) || i >= k) return o;
    const a = pts[i], b = pts[(i + 1) % k], l = Math.hypot(num(b[0]) - num(a[0]), num(b[1]) - num(a[1])) || 1;
    const ux = (num(b[0]) - num(a[0])) / l, uy = (num(b[1]) - num(a[1])) / l;
    const a1 = yangi[i], b1 = yangi[(i + 1) % k], l1 = Math.hypot(b1[0] - a1[0], b1[1] - a1[1]);
    const P = [num(a[0]) + ux * num(o.offset), num(a[1]) + uy * num(o.offset)];
    let off = (P[0] - a1[0]) * ux + (P[1] - a1[1]) * uy;
    if (!keng) return Object.assign({}, o, { offset: Math.round(Math.max(0, Math.min(l1, off)) * 1000) / 1000 });
    let w = num(o.width);
    if (off < 0) { w += off; off = 0; }
    if (off + w > l1) w = l1 - off;
    return Object.assign({}, o, { offset: Math.round(off * 1000) / 1000, width: Math.round(Math.max(0, w) * 1000) / 1000 });
  };
  return Object.assign({}, room, {
    outline: yangi,
    openings: ((room && room.openings) || []).map(o => qayta(o, true)),
    utilities: ((room && room.utilities) || []).map(o => qayta(o, false))
  });
}

/* ── surish (#151): devorga yopishish, devor ichiga kirmaslik, modullar bir-biriga kirmasligi ── */

const zKesishadi = (a, b) => {
  const ah = num(a.h), bh = num(b.h);
  if (!(ah > 0) || !(bh > 0)) return true;
  const az = num(a.z), bz = num(b.z);
  return az < bz + bh - 0.5 && bz < az + ah - 0.5;
};
/** ikki modul footprint'i x/y bo'yicha kesishishi (musbat — kirgan, manfiy — oraliq) */
function kesim(A, B) {
  return { ox: Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy: Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) };
}

/**
 * Surilayotgan modulning yangi joyi: p — { x, y, w, d, h, z, rot } (taklif qilingan joy), boshqalar — qolgan modullar.
 *  1) devordan T gacha ichkariga (devorga magnit YO'Q — egasi #156); devor ichiga kirmaydi, T da to'xtaydi;
 *  2) qo'shni modulga kirib qolsa — eng qisqa yo'nalishda chiqariladi; yaqin (60 mm) bo'lsa — yonma-yon tekislanadi;
 *  3) natija yaroqsiz bo'lsa (devor ichida, boshqa modulga kirgan yoki xonadan tashqarida) — null (joyida qoladi).
 * Balandlik (z) o'zgarmaydi: ustki modul ustki qatorda qoladi; ustki va pastki bir-biriga xalal bermaydi.
 * @returns {{x:number,y:number}|null}
 */
export function surishJoyi(room, boshqalar, p, o = {}) {
  /* egasi #156: devorga magnit yo'q (o.yopish — faqat sinov uchun); modul–modul tekislash (yonma-yon) qoladi */
  const Y = num(o.yopish), YM = o.modulYopish != null ? num(o.modulYopish) : 60;
  const q = Object.assign({}, p, { x: num(p.x), y: num(p.y) });
  const yon = (boshqalar || []).filter(b => b && zKesishadi(q, b));
  devordanSur(room, q, { yopish: Y, oraliq: o.oraliq });
  /* qo'shni modullar: magnit (har o'qda eng yaqini) */
  let mx = null, my = null;
  const A0 = footprint(q);
  for (const b of yon) {
    const B = footprint(b), { ox, oy } = kesim(A0, B);
    const chap = A0.x0 + A0.x1 < B.x0 + B.x1, past = A0.y0 + A0.y1 < B.y0 + B.y1;
    if (oy > 0.5 && ox <= 0.5 && -ox < YM && (!mx || -ox < mx.g)) mx = { g: -ox, dx: chap ? -ox : ox };
    if (ox > 0.5 && oy <= 0.5 && -oy < YM && (!my || -oy < my.g)) my = { g: -oy, dy: past ? -oy : oy };
  }
  if (mx) q.x += mx.dx;
  if (my) q.y += my.dy;
  /* kirib qolsa — chiqarish (bir necha marta: chiqarilgach boshqasiga tegishi mumkin) */
  for (let k = 0; k < 4; k++) {
    let ozgardi = false;
    const A = footprint(q);
    for (const b of yon) {
      const B = footprint(b), { ox, oy } = kesim(A, B);
      if (ox > 0.5 && oy > 0.5) {
        /* o'q: markazlar orasidagi nisbiy siljish kattaroq tomonga (bir qatordagi modul — qator bo'ylab, oldiga emas) */
        const rx = Math.abs(A.x0 + A.x1 - B.x0 - B.x1) / (A.ex + B.ex), ry = Math.abs(A.y0 + A.y1 - B.y0 - B.y1) / (A.ey + B.ey);
        if (rx > ry || (rx === ry && ox <= oy)) q.x += (A.x0 + A.x1 < B.x0 + B.x1 ? -ox : ox); else q.y += (A.y0 + A.y1 < B.y0 + B.y1 ? -oy : oy);
        ozgardi = true; break;
      }
    }
    if (!ozgardi) break;
  }
  q.x = Math.round(q.x * 100) / 100; q.y = Math.round(q.y * 100) / 100;
  /* yakuniy tekshiruv */
  const T = devorChegara(room, o.oraliq), yarim = devorYarim(room);
  if (devorOraliqlari(room, q, T + 1).some(d => d.oraliq < T - yarim - 0.5)) return null;
  const A = footprint(q);
  if (yon.some(b => { const { ox, oy } = kesim(A, footprint(b)); return ox > 0.5 && oy > 0.5; })) return null;
  const pts = room && room.outline;
  if (o.xona !== false && pts && pts.length >= 3 && !pointInPoly((A.x0 + A.x1) / 2, (A.y0 + A.y1) / 2, pts)) return null;
  return { x: q.x, y: q.y };
}

/** ikki modul bir-biriga kirganmi (0.5 mm dan ortiq; balandlik hisobga olinadi) */
export function kirgan(a, b) {
  if (!zKesishadi(a, b)) return false;
  const { ox, oy } = kesim(footprint(a), footprint(b));
  return ox > 0.5 && oy > 0.5;
}

/**
 * Surish boshlanishida: shu modul uchun cheklov funksiyasi (x, y) → {x, y} | null (items.js opts.cheklov).
 * Boshidanoq ustma-ust turgan modullar (eski loyiha) e'tiborga olinmaydi — aks holda modul joyidan qo'zg'almasdi;
 * xonadan tashqarida turgan modul uchun xona chegarasi tekshirilmaydi (shu sababdan).
 */
export function surishCheklov(room, placements, id, o = {}) {
  const p = (placements || []).find(q => q && q.id === id);
  if (!p) return null;
  const boshqalar = placements.filter(q => q && q !== p && !q.auto && !kirgan(p, q));
  const f = footprint(p), pts = room && room.outline;
  const xona = !(pts && pts.length >= 3) || pointInPoly((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, pts);
  return (x, y) => surishJoyi(room, boshqalar, Object.assign({}, p, { x, y }), Object.assign({ xona }, o));
}

/* ── yangi modul joyi (egasi #156): devordan YANGI_MODUL_DEVORDAN, eni bo'yicha o'rtada; sig'masa — xona o'rtasida; band bo'lsa — eng yaqin bo'sh joyda ── */

/**
 * @param room  xona (outline, wall_thickness)
 * @param placements  mavjud modullar (avtomatik hosila elementlar e'tiborga olinmaydi)
 * @param p  { x, y, w, d, h, z, rot } — yangi modul (x, y e'tiborga olinmaydi)
 * @param o  { erkin: true — Erkin maydon (devor yo'q: maydon o'rtasi, modullar yoniga) }
 * @returns {{x:number,y:number,joy:'devordan'|'orta'|'yaqin'}}
 */
export function yangiModulJoyi(room, placements, p, o = {}) {
  const erkin = !!o.erkin;
  const q = Object.assign({}, p, { x: 0, y: 0 });
  const yon = (placements || []).filter(b => b && b !== p && !b.auto && zKesishadi(q, b));
  const f0 = footprint(q), dx0 = -f0.x0, dy0 = -f0.y0, ex = f0.ex, ey = f0.ey;     // footprint boshi (burilganda manfiy bo'lishi mumkin)
  const T = devorChegara(room), yarim = devorYarim(room);
  const pts = (room && room.outline) || [];
  const bb = roomBBox(pts);
  let X0, Y0, X1, Y1;                                              // joylash maydoni (mm)
  if (erkin) {
    const hamma = (placements || []).filter(b => b && b !== p && (+b.w > 0));
    if (hamma.length) {
      X0 = Y0 = Infinity; X1 = Y1 = -Infinity;
      for (const b of hamma) { const f = footprint(b); X0 = Math.min(X0, f.x0); Y0 = Math.min(Y0, f.y0); X1 = Math.max(X1, f.x1); Y1 = Math.max(Y1, f.y1); }
    } else { X0 = bb.minX; Y0 = bb.minY; X1 = X0 + ERKIN_STANDART[0]; Y1 = Y0 + ERKIN_STANDART[1]; }
  } else { X0 = bb.minX; Y0 = bb.minY; X1 = bb.maxX; Y1 = bb.maxY; }
  const joyla = (fx0, fy0) => Object.assign({}, q, { x: Math.round(fx0 + dx0), y: Math.round(fy0 + dy0) });
  const yaroqli = (c) => {
    const A = footprint(c);
    if (yon.some(b => { const { ox, oy } = kesim(A, footprint(b)); return ox > 0.5 && oy > 0.5; })) return false;
    if (erkin) return true;
    if (devorOraliqlari(room, c, T + 1).some(d => d.oraliq < T - yarim - 0.5)) return false;
    if (pts.length >= 3) {
      if (!pointInPoly((A.x0 + A.x1) / 2, (A.y0 + A.y1) / 2, pts)) return false;
      if (![[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]].every(([x, y]) => pointInPoly(x, y, pts))) return false;
    }
    return true;
  };
  const ortaX = (X0 + X1) / 2 - ex / 2, ortaY = (Y0 + Y1) / 2 - ey / 2;
  /* 1) orqa devordan YANGI_MODUL_DEVORDAN (chuqurlik yetsa), aks holda xona o'rtasi */
  const y0 = bb.minY + yarim + YANGI_MODUL_DEVORDAN;
  const devordan = !erkin && y0 + ey <= bb.maxY - T;
  const pref = devordan ? joyla(ortaX, y0) : joyla(ortaX, ortaY), joy = devordan ? 'devordan' : 'orta', c = pref;
  if (yaroqli(c)) return { x: c.x, y: c.y, joy };
  /* band yoki yaroqsiz — o'rtaga eng yaqin bo'sh joy (spiral, 50 mm qadam) */
  const R = Math.ceil(Math.max(X1 - X0, Y1 - Y0, ex, ey) / 50) + 60, ofs = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) ofs.push([i * 50, j * 50, i * i + j * j]);
  ofs.sort((a, b) => a[2] - b[2]);
  for (const [dx, dy] of ofs) {
    const k = joyla(pref.x - dx0 + dx, pref.y - dy0 + dy);
    if (yaroqli(k)) return { x: k.x, y: k.y, joy: 'yaqin' };
  }
  return { x: c.x, y: c.y, joy: 'orta' };
}
