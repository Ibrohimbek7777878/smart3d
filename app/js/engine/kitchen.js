/* F2: Oshxona elementlari — yaxlit stoleshnitsa, sokol, dobor, karniz, moyka kesimi.
 *
 * doc.kitchen (persist — foydalanuvchi toggle, zamer panelidagi "Oshxona elementlari"):
 *   { stoleshnitsa: bool, sokol: bool, dobor: bool, doborH: mm,
 *     karniz: bool, karnizH: mm,
 *     moyka: { on, offset, fromBack, size } }        // moyka = stoleshnitsadagi kesim
 *
 * deriveKitchen(doc, catalog) → SYNTHETIC placements (auto:true, hech qachon persist):
 *   pastki run'lari bo'yicha: stoleshnitsa (SP-ST-001), sokol (SP-ST-002, no3d —
 *   3D kickplate assembler'da), dobor (SP-ST-003);
 *   ustki run'lari bo'yicha: karniz (SP-ST-004).
 * Uzunlik varaq (2800) dan katta bo'lsa SHEET_MAX segmentlarga bo'linadi — raskroyda
 * yaxlit 3600 stoleshnitsa = 2 dona kesim (real sex amaliyoti).
 *
 * Run aniqlash: gorizontal (rot 0/180) va vertikal (rot 90/270) modullar alohida;
 * bir xil devor bo'ylab yopishqoq qatorlar bbox y0 (x0) bo'yicha 20mm ichida klasterlanadi,
 * keyin oraliq ≤ 30mm bilan birlashtiriladi.
 */
import { footprint, roomBBox } from './rules.js';

export const SHEET_MAX = 2700;   // varaq 2800 dan xavfsiz kichik segment

function clusterRuns(members, axis) {
  // axis 'h': cluster by bbox y0; 'v': by bbox x0 (tol 20 mm)
  const withFp = members.map(p => ({ p, f: footprint(p) }));
  withFp.sort((a, b) => (axis === 'h' ? a.f.y0 - b.f.y0 : a.f.x0 - b.f.x0));
  const clusters = [];
  for (const m of withFp) {
    const key = axis === 'h' ? m.f.y0 : m.f.x0;
    let c = clusters.find(cl => Math.abs(cl.key - key) <= 20);
    if (!c) { c = { key, items: [] }; clusters.push(c); }
    c.items.push(m);
  }
  return clusters;
}

function mergeSegments(items, axis) {
  // sort along run axis; merge gap ≤ 30mm
  const byAxis = items.slice().sort((a, b) =>
    axis === 'h' ? a.f.x0 - b.f.x0 : a.f.y0 - b.f.y0);
  const segs = [];
  for (const m of byAxis) {
    const s = axis === 'h'
      ? { x0: m.f.x0, x1: m.f.x1, y0: m.f.y0, y1: m.f.y1, h: m.p.z + m.p.h, members: [m.p] }
      : { x0: m.f.x0, x1: m.f.x1, y0: m.f.y0, y1: m.f.y1, h: m.p.z + m.p.h, members: [m.p] };
    const last = segs[segs.length - 1];
    if (last) {
      const gap = axis === 'h' ? s.x0 - last.x1 : s.y0 - last.y1;
      if (gap <= 30 && gap >= -Math.max(s.x1 - s.x0, s.y1 - s.y0)) {
        // birlashtir (bir xil klaster — devor bo'ylab yopishqoq)
        if (axis === 'h') {
          last.x1 = Math.max(last.x1, s.x1);
          last.y0 = Math.min(last.y0, s.y0);
          last.y1 = Math.max(last.y1, s.y1);
        } else {
          last.y1 = Math.max(last.y1, s.y1);
          last.x0 = Math.min(last.x0, s.x0);
          last.x1 = Math.max(last.x1, s.x1);
        }
        last.h = Math.max(last.h, s.h);
        last.members = last.members.concat(s.members);
        continue;
      }
    }
    segs.push(s);
  }
  return segs;
}

/** group bo'yicha run'lar: [{axis, x0,x1,y0,y1,h, members}] */
export function detectRuns(doc, catalog, group) {
  const members = (doc.placements || []).filter(p => {
    const fr = catalog[p.frg];
    return fr && fr.group === group;
  });
  const horiz = members.filter(p => (Math.round(p.rot || 0) % 180) === 0);
  const vert = members.filter(p => (Math.round(p.rot || 0) % 180) !== 0);
  const runs = [];
  for (const cl of clusterRuns(horiz, 'h')) {
    for (const s of mergeSegments(cl.items, 'h')) runs.push(Object.assign({ axis: 'h' }, s));
  }
  for (const cl of clusterRuns(vert, 'v')) {
    for (const s of mergeSegments(cl.items, 'v')) runs.push(Object.assign({ axis: 'v' }, s));
  }
  return runs;
}

/** Uzunlik SHEET_MAX dan katta bo'lsa segmentlarga bo'ladi */
export function splitSegments(run) {
  const len = run.axis === 'h' ? run.x1 - run.x0 : run.y1 - run.y0;
  if (len <= SHEET_MAX) return [{ s0: 0, len }];
  const n = Math.ceil(len / SHEET_MAX);
  const each = Math.round(len / n / 10) * 10;
  const out = [];
  let s0 = 0;
  for (let i = 0; i < n; i++) {
    const L = i === n - 1 ? len - s0 : each;
    out.push({ s0, len: L });
    s0 += L;
  }
  return out;
}

/** Mesh lokal +y (F tomon) belgisi: devor qaysi lokal tomonda (+1/-1) — moyka 3D uchun */
function backLocalOf(side, isV) {
  if (isV) return side === 'x1' ? -1 : 1;   // rot90: lokal +y → jahon −x
  return side === 'y1' ? 1 : -1;
}

/** Devor tomoni = xona markazidan uroq bbox chekka ('y0'|'y1'|'x0'|'x1') */
function backSide(run, cx, cy) {
  if (run.axis === 'h') return (run.y0 + run.y1) / 2 >= cy ? 'y1' : 'y0';
  return (run.x0 + run.x1) / 2 >= cx ? 'x1' : 'x0';
}

/** segment {s0, len} dan oraliqlarni [a, b] ayirish → qolgan bo'laklar (50 mm dan kichigi tashlanadi) */
function ayir(seg, band) {
  let qism = [[seg.s0, seg.s0 + seg.len]];
  for (const [a, b] of band) {
    qism = qism.flatMap(([u, v]) => (b <= u || a >= v) ? [[u, v]] : [[u, Math.max(u, a)], [Math.min(v, b), v]].filter(([p, q]) => q - p > 0));
  }
  return qism.filter(([u, v]) => v - u >= 50).map(([u, v]) => ({ s0: Math.round(u), len: Math.round(v - u) }));
}

/** Strip qo'yish (sokol/dobor/karniz): devor chekkasida t = qalinlik.
 * Vertikal run'larda rot=90 (detal uzunligi W bo'lishi uchun — raskroyda
 * 3600mm planka W=3600 sifatida kesiladi, aks holda varaqdan chiqmasdi). */
function stripPlacement(run, side, t, seg, z, h, frg, name, id, extra) {
  const isV = run.axis === 'v';
  const x = isV ? (side === 'x1' ? run.x1 : run.x0 + t) : run.x0 + seg.s0;
  const y = isV ? run.y0 + seg.s0 : (side === 'y1' ? run.y1 - t : run.y0);
  return Object.assign({
    id, auto: true, frg, name,
    x: Math.round(x), y: Math.round(y), z: Math.round(z),
    w: Math.round(seg.len),
    d: Math.round(t),
    h: Math.round(h), rot: isV ? 90 : 0, qty: 1
  }, extra || {});
}

/**
 * Synthetic placements (auto:true). doc.kitchen bo'sh bo'lsa — [].
 * Har bir placement qo'shimcha: runIdx, segIdx, segCount (moyka qaysi run'da — uchun).
 */
export function deriveKitchen(doc, catalog) {
  const k = doc.kitchen;
  if (!k) return [];
  const bb = roomBBox((doc.room && doc.room.outline) || [[0, 0], [1, 1]]);
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
  const pastki = detectRuns(doc, catalog, 'kuxnya-pastki');
  const ustki = detectRuns(doc, catalog, 'kuxnya-ustki');
  const out = [];
  let n = 0;

  pastki.forEach((run, runIdx) => {
    const side = backSide(run, cx, cy);
    const segs = splitSegments(run);
    /* yaxlit stoleshnitsa (vertikal run → rot=90: detal uzunligi W bo'lib, varaqqa sig'adi) */
    if (k.stoleshnitsa !== false) {
      const isV = run.axis === 'v';
      /* TZ-22: k.stoleshnitsaD — stoleshnitsa chuqurligi (MC Bazis: 600, devordan); berilmasa — run chuqurligi (avvalgidek) */
      const depth = +k.stoleshnitsaD > 0 ? +k.stoleshnitsaD : (isV ? run.x1 - run.x0 : run.y1 - run.y0);
      segs.forEach((seg, segIdx) => {
        const mk = (runIdx === 0 && segIdx === 0 && k.moyka && k.moyka.on)
          ? { offset: Math.max(0, +k.moyka.offset || 0), fromBack: Math.max(0, +k.moyka.fromBack || 0),
              size: Math.max(300, +k.moyka.size || 500), backLocal: backLocalOf(side, isV) }
          : undefined;
        out.push({
          id: '__kst' + (n++), auto: true, frg: 'SP-ST-001',
          name: 'Yaxlit stoleshnitsa',
          x: Math.round(isV ? (side === 'x1' ? run.x1 : run.x0 + depth) : run.x0 + seg.s0),
          y: Math.round(isV ? run.y0 + seg.s0 : (side === 'y1' ? run.y1 - depth : run.y0)),
          z: Math.round(run.h),
          w: Math.round(seg.len),
          d: Math.round(depth),
          h: 18, rot: isV ? 90 : 0, qty: 1,
          runIdx, segIdx, segCount: segs.length,
          moyka: mk
        });
      });
    }
    /* sokol (no3d — 3D kickplate assembler'da; cutlist/smeta shu yerdan). O'z sokoli bor modul (MC — Bazis'dagidek korpus
     * ostida, frag.sokol_ichida) ostiga qator sokoli qo'yilmaydi — kesim ro'yxatida sokol ikki marta chiqmasin */
    if (k.sokol) {
      const band = (run.members || []).filter(p => catalog[p.frg] && catalog[p.frg].sokol_ichida).map(p => {
        const f = footprint(p);
        return run.axis === 'h' ? [f.x0 - run.x0, f.x1 - run.x0] : [f.y0 - run.y0, f.y1 - run.y0];
      });
      const qism = band.length ? segs.flatMap(seg => ayir(seg, band)) : segs;
      qism.forEach((seg, segIdx) => {
        out.push(stripPlacement(run, side, 18, seg, 0, 100, 'SP-ST-002', 'Sokol planka',
          '__ksk' + (n++), { no3d: true, runIdx, segIdx, segCount: qism.length }));
      });
    }
    /* dobor (backsplash — stoleshnitsa ustida, devor chekkasida) */
    if (k.dobor) {
      segs.forEach((seg, segIdx) => {
        out.push(stripPlacement(run, side, 18, seg, run.h + 18, Math.max(30, k.doborH || 60),
          'SP-ST-003', 'Dobor', '__kdb' + (n++), { runIdx, segIdx, segCount: segs.length }));
      });
    }
  });

  ustki.forEach((run) => {
    if (!k.karniz) return;
    const side = backSide(run, cx, cy);
    const top = run.h;   // mergeSegments h = max(z+h)
    const segs = splitSegments(run);
    segs.forEach((seg, segIdx) => {
      out.push(stripPlacement(run, side, 30, seg, top, Math.max(30, k.karnizH || 60),
        'SP-ST-004', 'Karniz', '__kkr' + (n++), { segIdx, segCount: segs.length }));
    });
  });

  return out;
}

/** Moyka kesimi — stoleshnitsa detaliga qo'shiladigan cutout (birinchi run'ning birinchi segmenti) */
export function moykaHole(doc) {
  const k = doc.kitchen;
  const m = k && k.moyka;
  if (!m || !m.on) return null;
  const size = Math.max(100, Math.round(+m.size || 500));
  /* konvensiya (cutlist.js): x — EN (detal kengligi) bo'ylab F chetdan,
     y — UZUNLIK bo'ylab L chetdan. Moyka: x = devordan (fromBack), y = boshlanish (offset). */
  return {
    part: 'stoleshnitsa',
    side: 'F',
    kind: 'cutout',
    x: Math.max(0, Math.round(+m.fromBack || 0)),
    y: Math.max(0, Math.round(+m.offset || 0)),
    w: size,       /* uzunlik bo'ylab (y) o'lcham */
    d: size,       /* en bo'ylab (x) o'lcham */
    dia: 0,
    depth: 0,
    qty: 1
  };
}
