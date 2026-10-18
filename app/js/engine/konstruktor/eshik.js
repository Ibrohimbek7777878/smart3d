/* Smart3D engine/konstruktor/eshik.js — TZ-22: eshiklar rejada (petlya tomoni, ochilish, to'qnashuv).
 *
 * Manba — 3D bilan bitta: getModulePanels (assembler, opts.eshiklar) qaytargan eshiklar → jahon koordinatasi.
 * Eshik — kesma (qalinligisiz): petlya nuqtasi (eshik o'rta tekisligi, petlya cheti) va eni.
 * Tekshiruv (θ — ochilish burchagi, odatda 90°):
 *   1) ochilish yo'li (θ/3, 2θ/3, θ) — devor, boshqa mebel korpusi va boshqa modulning yopiq eshigiga tegmasin;
 *   2) ikki eshik birga ochiq (θ) — kesishmasin.
 * Ustki va pastki eshiklar balandlik bo'yicha kesishmasa — bir-biriga xalaqit bermaydi.
 */
import { getModulePanels } from '../assembler.js';
import { footprint } from '../rules.js';

const RAD = Math.PI / 180;
const TOL = 2;   // mm — shundan yaqin kesmalar "tegadi" deb olinadi

function cs(rot) {
  const deg = ((+rot || 0) % 360 + 360) % 360;
  if (deg === 0) return [1, 0];
  if (deg === 90) return [0, 1];
  if (deg === 180) return [-1, 0];
  if (deg === 270) return [0, -1];
  return [Math.cos(deg * RAD), Math.sin(deg * RAD)];
}

/** Joylashuvdagi eshiklar: [{ key ('modulId:eshikId'), pid, len, sign, px, py, L (lokal → jahon), z0, z1 }] */
export function modulEshiklari(p, frag) {
  if (!p || !frag) return [];
  const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
  const asm = getModulePanels(frag, w, d, h, { tortma: true, eshiklar: true, hinge: p.hinge });
  const [c, s] = cs(p.rot);
  const cx = +p.x + (w / 2) * c - (d / 2) * s, cy = +p.y + (w / 2) * s + (d / 2) * c;
  const L = (lx, ly) => [cx + lx * c - ly * s, cy + lx * s + ly * c];
  const zc = (+p.z || 0) + h / 2;
  return asm.panels.filter(q => q.isDoor && q.hingeSide).map(q => {
    const sign = q.hingeSide === 'right' ? -1 : 1;
    return { key: p.id + ':' + q.id, pid: p.id, rot: ((+p.rot || 0) % 360 + 360) % 360, len: q.w, sign, px: q.x - sign * q.w / 2, py: q.y, L, z0: zc + q.z - q.h / 2, z1: zc + q.z + q.h / 2 };
  });
}

/** Yopiq fasadlardagi tutqichlar (eshik va tortma) — to'siq kesmalari: korpus oldidan tutqich uchigacha */
function tutqichlar(p, frag) {
  const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
  const asm = getModulePanels(frag, w, d, h, { tortma: true, eshiklar: true, hinge: p.hinge });
  const [c, s] = cs(p.rot);
  const cx = +p.x + (w / 2) * c - (d / 2) * s, cy = +p.y + (w / 2) * s + (d / 2) * c;
  const L = (lx, ly) => [cx + lx * c - ly * s, cy + lx * s + ly * c];
  const zc = (+p.z || 0) + h / 2;
  return asm.panels.filter(q => q.handle).map(q => {
    const hd = q.handle;
    return { pid: p.id, z0: zc + hd.z - hd.h / 2, z1: zc + hd.z + hd.h / 2, seg: [L(hd.x, d / 2), L(hd.x, hd.y + hd.d / 2)] };
  });
}

/** θ (radian) burchakdagi eshik kesmasi [petlya, uch] — jahon koordinatasida */
export function eshikKesma(e, th) {
  return [e.L(e.px, e.py), e.L(e.px + e.sign * e.len * Math.cos(th), e.py + e.len * Math.sin(th))];
}

function orient(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function ptSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
/** Ikki kesma orasidagi eng qisqa masofa (kesishsa — 0) */
export function kesmaMasofa(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return 0;
  return Math.min(ptSeg(a, c, d), ptSeg(b, c, d), ptSeg(c, a, b), ptSeg(d, a, b));
}
const tegadi = (s1, s2) => kesmaMasofa(s1[0], s1[1], s2[0], s2[1]) < TOL;
const zKesishadi = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

function devorKesmalari(room) {
  const pts = (room && room.outline) || [];
  const out = [];
  for (let i = 0; i < pts.length; i++) out.push([pts[i], pts[(i + 1) % pts.length]]);
  return out;
}
function korpusKesmalari(p) {
  const f = footprint(p), k = 0.5;   // 0.5 mm ichkariga — qo'shni korpus bilan tutashgan chiziq "tegish" emas
  const a = [f.x0 + k, f.y0 + k], b = [f.x1 - k, f.y0 + k], c = [f.x1 - k, f.y1 - k], d = [f.x0 + k, f.y1 - k];
  return [[a, b], [b, c], [c, d], [d, a]];
}

/** Sahna tayyorlash: eshiklar va to'siqlar (bir marta hisoblanadi) */
function tayyorla(placements, catalog, room) {
  const list = (placements || []).filter(p => p && catalog[p.frg] && !p.no3d);
  const eshiklar = [], korpus = [], tutqich = [];
  for (const p of list) {
    const f = catalog[p.frg];
    const h = +p.h || +f.h, z0 = +p.z || 0;
    korpus.push({ pid: p.id, z0, z1: z0 + h, seg: korpusKesmalari({ x: +p.x, y: +p.y, w: +p.w || +f.w, d: +p.d || +f.d, rot: p.rot }) });
    for (const e of modulEshiklari(p, f)) eshiklar.push(e);
    for (const t of tutqichlar(p, f)) tutqich.push(t);
  }
  return { eshiklar, korpus, tutqich, devor: devorKesmalari(room) };
}

/** e eshik θ gacha ochilganda devor/korpus/boshqa yopiq eshikka tegadimi → to'siq nomi yoki null */
function yolTosigi(e, th, S) {
  for (const k of [th / 3, (2 * th) / 3, th]) {
    const sg = eshikKesma(e, k);
    for (const w of S.devor) if (tegadi(sg, w)) return { tur: 'devor' };
    for (const b of S.korpus) {
      if (b.pid === e.pid || !zKesishadi(e.z0, e.z1, b.z0, b.z1)) continue;
      for (const w of b.seg) if (tegadi(sg, w)) return { tur: 'modul', b: b.pid };
    }
    for (const f of S.eshiklar) {
      if (f.pid === e.pid || !zKesishadi(e.z0, e.z1, f.z0, f.z1)) continue;
      if (tegadi(sg, eshikKesma(f, 0))) return { tur: 'eshik', b: f.key };
    }
    for (const t of S.tutqich) {
      if (t.pid === e.pid || !zKesishadi(e.z0, e.z1, t.z0, t.z1)) continue;
      if (tegadi(sg, t.seg)) return { tur: 'tutqich', b: t.pid };
    }
  }
  return null;
}

/**
 * Eshiklar to'qnashuvi — θ (daraja, standart 90) gacha ochilganda.
 *   'devor' | 'modul' | 'eshik' | 'tutqich' — boshqalari yopiq turganda ham to'liq ochilmaydi (tuzatilishi shart);
 *   'juft' — bir qatordagi (bir tomonga qaragan) ikki eshik birga ochilganda tegadi (rasmdagi muammo).
 *   Perpendikulyar (burchakdagi) ikki eshikning birga ochilishi tekshirilmaydi — burchakda odatiy hol.
 * @returns {Array<{a:string, b?:string, tur:string}>}
 */
export function eshikToqnashuvlari(placements, catalog, room, opt = {}) {
  const th = (opt.burchak || 90) * RAD;
  const S = tayyorla(placements, catalog, room);
  const out = [];
  for (const e of S.eshiklar) {
    const t = yolTosigi(e, th, S);
    if (t) out.push(Object.assign({ a: e.key }, t));
  }
  for (let i = 0; i < S.eshiklar.length; i++) {
    for (let j = i + 1; j < S.eshiklar.length; j++) {
      const e = S.eshiklar[i], f = S.eshiklar[j];
      if (e.pid === f.pid || e.rot !== f.rot || !zKesishadi(e.z0, e.z1, f.z0, f.z1)) continue;
      if (tegadi(eshikKesma(e, th), eshikKesma(f, th))) out.push({ a: e.key, b: f.key, tur: 'juft' });
    }
  }
  return out;
}

/**
 * 3D "Eshiklarni ochish" uchun har eshikning xavfsiz burchagi (radian): 100° → 90° → 80° … 30°.
 * Devorga, mebelga va qo'shni ochiq eshikka tegmaydigan eng katta burchak. Kalit — 'modulId:eshikId'.
 */
export function eshikBurchaklari(placements, catalog, room) {
  const S = tayyorla(placements, catalog, room);
  const QADAM = [100, 90, 80, 70, 60, 50, 40, 30].map(x => x * RAD);
  const max = {};
  for (const e of S.eshiklar) max[e.key] = QADAM[0];
  for (let pass = 0; pass < 2; pass++) {
    for (const e of S.eshiklar) {
      let ok = QADAM[QADAM.length - 1];
      for (const th of QADAM) {
        if (yolTosigi(e, th, S)) continue;
        const sg = eshikKesma(e, th);
        const urildi = S.eshiklar.some(f => f.pid !== e.pid && zKesishadi(e.z0, e.z1, f.z0, f.z1) && tegadi(sg, eshikKesma(f, max[f.key])));
        if (!urildi) { ok = th; break; }
      }
      max[e.key] = ok;
    }
  }
  return max;
}

/**
 * Bitta to'liq eshikli modullarda petlya tomonini tanlash: to'qnashuvni kamaytiradigan tomon (ochko'z, 2 o'tish).
 * placements o'zgartiriladi (p.hinge = 'left'|'right'). Boshlang'ich tomon — chaqiruvchidan (qoida bo'yicha).
 * @returns {number} qolgan to'qnashuvlar soni
 */
export function petlyaTanla(placements, catalog, room, opt = {}) {
  const sanoq = () => eshikToqnashuvlari(placements, catalog, room, opt).length;
  const yakka = placements.filter(p => {
    const f = catalog[p.frg];
    if (!f) return false;
    const ds = modulEshiklari(p, f);
    return ds.length === 1 && ds[0].len >= (+p.w || +f.w) - 20;   // qisman (gluxoy) eshik petlyasi o'zgarmaydi
  });
  let n = sanoq();
  for (let pass = 0; pass < 2 && n > 0; pass++) {
    for (const p of yakka) {
      const eski = p.hinge || 'left';
      p.hinge = eski === 'left' ? 'right' : 'left';
      const m = sanoq();
      if (m < n) n = m; else p.hinge = eski;
    }
  }
  return n;
}
