/* Modulni almashtirish (egasi #239–#241): tanlangan modulni katalogdagi boshqasiga almashtirganda YANGI modul eskisining joyiga
 * (xuddi shu burilish, orqa devorga bog'lanish), ESKI modul esa ustma-ust tushmasdan eng yaqin bo'sh joyga (avval o'sha devor
 * bo'ylab o'ngga/chapga, keyin boshqa devorga, keyin istalgan yaqin bo'sh joyga) suriladi. O'chirilmaydi.
 * Toza funksiya — hujjatga tegmaydi; qo'llash — web/src/services/loyiha.js almashtir(). Node'da ham ishlaydi. */
import { footprint, pointInPoly, roomBBox } from './rules.js';
import { devordanSur, devorChegara, devorYarim, devorOraliqlari, devorlar, kesim, zKesishadi, ERKIN_STANDART } from './devorOraliq.js';

const num = (v) => { const n = +v; return isFinite(n) ? n : 0; };
const cs = (rot) => {
  const deg = ((num(rot) % 360) + 360) % 360;
  if (deg === 0) return [1, 0]; if (deg === 90) return [0, 1]; if (deg === 180) return [-1, 0]; if (deg === 270) return [0, -1];
  const a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)];
};
const r2 = (v) => Math.round(v * 100) / 100;

/** p ning "orqa chetining o'rtasi" (modul o'z koordinatasida (w/2, 0)) — dunyo nuqtasi */
const orqaMarkaz = (p) => { const [c, s] = cs(p.rot), h = num(p.w) / 2; return [num(p.x) + h * c, num(p.y) + h * s]; };
/** orqa chet o'rtasi (ax, ay) bo'ladigan (x, y) */
const orqadan = (p, ax, ay) => { const [c, s] = cs(p.rot), h = num(p.w) / 2; return Object.assign({}, p, { x: r2(ax - h * c), y: r2(ay - h * s) }); };
const markaz = (p) => { const f = footprint(p); return [(f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2]; };

/** c joyi yaroqlimi: boshqalar bilan kesishmaydi (balandlik hisobga olinadi), devordan >= 3 mm, xona ichida */
export function joyYaroqli(room, boshqalar, c, erkin = false) {
  const A = footprint(c);
  for (const b of boshqalar) if (zKesishadi(c, b)) { const { ox, oy } = kesim(A, footprint(b)); if (ox > 0.5 && oy > 0.5) return false; }
  if (erkin) return true;
  const T = devorChegara(room), yarim = devorYarim(room), pts = (room && room.outline) || [];
  if (devorOraliqlari(room, c, T + 1).some(d => d.oraliq < T - yarim - 0.5)) return false;
  if (pts.length >= 3) {
    if (!pointInPoly((A.x0 + A.x1) / 2, (A.y0 + A.y1) / 2, pts)) return false;
    if (![[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]].every(([x, y]) => pointInPoly(x, y, pts))) return false;
  }
  return true;
}

/** c ga eng yaqin bo'sh joy (50 mm qadamli spiral) yoki null */
function yaqinBosh(room, boshqalar, c, erkin, hudud) {
  const R = Math.ceil(hudud / 50) + 2, ofs = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) ofs.push([i * 50, j * 50, i * i + j * j]);
  ofs.sort((a, b) => a[2] - b[2]);
  for (const [dx, dy] of ofs) {
    const k = Object.assign({}, c, { x: r2(num(c.x) + dx), y: r2(num(c.y) + dy) });
    if (joyYaroqli(room, boshqalar, k, erkin)) return k;
  }
  return null;
}

/** c ni o'z yo'nalishi (devor) bo'ylab 10 mm qadam bilan surish: avval o'ngga, keyin chapga (bir xil masofada); topilgach yonma-yon tekislanadi */
function yonSur(room, boshqalar, c0, erkin, hudud) {
  const [c, s] = cs(c0.rot), MAX = Math.ceil(hudud / 10) * 10 + 200;
  const surilgan = (d) => Object.assign({}, c0, { x: r2(num(c0.x) + c * d), y: r2(num(c0.y) + s * d) });
  for (let d = 10; d <= MAX; d += 10) for (const sg of [1, -1]) {
    let k = surilgan(sg * d);
    if (!joyYaroqli(room, boshqalar, k, erkin)) continue;
    for (let e = d - 1; e > 0; e--) { const k2 = surilgan(sg * e); if (!joyYaroqli(room, boshqalar, k2, erkin)) break; k = k2; }
    return k;
  }
  return null;
}

/** ESKI modul uchun joy: 'yon' (o'z yo'nalishi bo'ylab — o'sha devor bo'ylab) | 'devor' (boshqa devor) | 'yaqin' (istalgan yaqin joy) | null */
function eskiniSur(room, boshqalar, E, erkin, hudud) {
  /* 1) o'z yo'nalishi bo'ylab */
  const y = yonSur(room, boshqalar, E, erkin, hudud);
  if (y) return { p: y, tur: 'yon' };
  /* 2) boshqa devor bo'ylab: orqa devorga qaragan holda burilib, eski joyga eng yaqin */
  const pts = (room && room.outline) || [];
  if (!erkin && pts.length >= 3) {
    const e0 = markaz(E), T = devorChegara(room);
    let eng = null;
    for (const dv of devorlar(pts)) {
      let rot = Math.round(Math.atan2(-dv.n[0], dv.n[1]) * 180 / Math.PI * 100) / 100; rot = ((rot % 360) + 360) % 360;
      const E2 = Object.assign({}, E, { rot });
      for (let t = 0; t <= dv.len; t += 50) {
        const k = orqadan(E2, dv.A[0] + dv.u[0] * t + dv.n[0] * T, dv.A[1] + dv.u[1] * t + dv.n[1] * T);
        if (!joyYaroqli(room, boshqalar, k, erkin)) continue;
        const m = markaz(k), g = Math.hypot(m[0] - e0[0], m[1] - e0[1]);
        if (!eng || g < eng.g) eng = { p: k, g };
      }
    }
    if (eng) return { p: eng.p, tur: 'devor' };
  }
  /* 3) istalgan yaqin bo'sh joy (o'z burilishida) */
  const k = yaqinBosh(room, boshqalar, E, erkin, hudud);
  return k ? { p: k, tur: 'yaqin' } : null;
}

/**
 * @param room  xona (outline, wall_thickness). Erkin maydonda o.erkin = true (devor yo'q)
 * @param placements  hozirgi modullar (avtomatik hosila p.auto e'tiborga olinmaydi)
 * @param eskiId  almashtiriladigan modul id si
 * @param yangiP  { w, d, h, z } — yangi modul (x, y, rot e'tiborga olinmaydi: eskisidan olinadi)
 * @param o  { erkin }
 * @returns {null | { yangi:{x,y,rot}, eski:{x,y,rot}|null, eskiJoyi:'yon'|'devor'|'yaqin'|null, ogoh:null|'yangi_yaqin'|'eski_qoldi' }}
 *   eski = null — eski modul joyida qoladi (siljitilmaydi); null qaytsa — hech qayerga sig'madi (almashtirilmaydi).
 */
export function almashtirishJoyi(room, placements, eskiId, yangiP, o = {}) {
  const erkin = !!o.erkin;
  const E = (placements || []).find(p => p && p.id === eskiId && !p.auto);
  if (!E || !yangiP) return null;
  const boshqalar = (placements || []).filter(p => p && p !== E && !p.auto && p.id !== eskiId);
  const bb = roomBBox((room && room.outline) || []);
  let hudud = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, 1000);
  if (erkin) hudud = Math.max(hudud, ERKIN_STANDART[0], ...(placements || []).map(p => Math.max(num(p.w), num(p.d))));
  hudud = Math.min(Math.max(hudud, 2000), 12000);

  const rot = num(E.rot);
  const N0 = Object.assign({}, yangiP, { rot, z: yangiP.z != null ? yangiP.z : E.z });
  const [ax, ay] = orqaMarkaz(E);
  let N = orqadan(N0, ax, ay);
  if (!erkin) { devordanSur(room, N); N.x = r2(N.x); N.y = r2(N.y); }     // devorga kirmasin (chuqurroq modul devor ichiga chiqib ketmasin)
  let ogoh = null;
  if (!joyYaroqli(room, boshqalar, N, erkin)) {
    const k = yonSur(room, boshqalar, N, erkin, hudud) || yaqinBosh(room, boshqalar, N, erkin, hudud);   // avval devor bo'ylab
    if (!k) return null;
    N = k; ogoh = 'yangi_yaqin';
  }
  /* eski modul yangi modul bilan kesishsa — chetga */
  const kesishadi = (a, b) => { if (!zKesishadi(a, b)) return false; const { ox, oy } = kesim(footprint(a), footprint(b)); return ox > 0.5 && oy > 0.5; };
  if (!kesishadi(E, N)) return { yangi: { x: N.x, y: N.y, rot }, eski: null, eskiJoyi: null, ogoh };
  const sur = eskiniSur(room, boshqalar.concat([N]), E, erkin, hudud);
  if (sur) return { yangi: { x: N.x, y: N.y, rot }, eski: { x: sur.p.x, y: sur.p.y, rot: sur.p.rot }, eskiJoyi: sur.tur, ogoh };
  /* eski sig'madi: u joyida qoladi, yangi — eng yaqin bo'sh joyga */
  const k = yonSur(room, boshqalar.concat([E]), N, erkin, hudud) || yaqinBosh(room, boshqalar.concat([E]), N, erkin, hudud);
  if (!k) return null;
  return { yangi: { x: k.x, y: k.y, rot }, eski: null, eskiJoyi: null, ogoh: 'eski_qoldi' };
}
