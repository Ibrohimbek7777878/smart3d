/* static/client_erp/js/sunpin/sp-validate.js — CHIZMA TEKSHIRUVI (S-D8).
 *
 * NIMA UCHUN SERVERDA HAM TEKSHIRUV BOR?
 *    Bu modul **tez** xatolarni ko'rsatadi (chizayotganda), server esa
 *    **ishonchli** natijani qaytaradi (narx + validatsiya). Ikkalasi bir xil
 *    qoidalarni ishlatadi — farq faqat tezlikda.
 *
 * QOIDALAR (server bilan BIR XIL — client_erp/services/sunpin_doc.py)
 *   E_DOC_INVALID         — chizma formati noto'g'ri
 *   E_OUTLINE_INVALID     — 3 dan kam nuqta / nuqta noto'g'ri
 *   E_OUTLINE_TOO_SMALL   — perimetr < 1600 mm
 *   E_OPENING_OUT_OF_WALL — teshik devordan chiqib ketgan
 *   E_OPENING_OVERLAP     — 2 teshik ustma-ust
 *   E_UTIL_OUT_OF_WALL    — quvur/rozetka devordan chiqib ketgan (F1)
 *   E_FRAG_UNKNOWN        — katalogda yo'q mebel yoki noto'g'ri o'lcham
 *   W_OVERLAP             — 2 ta mebel ustma-ust (ogohlantirish, to'xtirmaydi)
 *   W_OUT_OF_ROOM         — mebel xona chegarasidan tashqarida
 */
export const MIN_PERIMETER_MM = 1600;

function num(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && isFinite(n) ? n : 0;
}

/** Aylanma hisobga olingan to'rtburchak chegarasi. */
export function rotatedExtent(w, d, deg) {
  const a = (num(deg) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return { ex: num(w) * c + num(d) * s, ey: num(w) * s + num(d) * c };
}

/**
 * Placement'ning aylanmagandagi min burchagi (x, y) shu (items.js placeMesh:
 * (x,y) — burchak ANCHOR, rotation shu nuqta atrofida) → haqiqiy AABB.
 * 0/90/180/270 da aniq; boshqa burchaklarda kengaytirilgan AABB.
 * @returns {{x0:number,y0:number,x1:number,y1:number,ex:number,ey:number}}
 */
export function footprint(p) {
  const w = num(p && p.w), d = num(p && p.d);
  /* 0/90/180/270 da aniq qiymatlar — Math.cos/sin da floating-point
     xatosi (599.9999999999999) qo'shni turuvchi mebellar uchun soxta
     to'qnashuvga olib keladi. */
  const deg = ((num(p && p.rot) % 360) + 360) % 360;
  let c, s;
  if (deg === 0) { c = 1; s = 0; }
  else if (deg === 90) { c = 0; s = 1; }
  else if (deg === 180) { c = -1; s = 0; }
  else if (deg === 270) { c = 0; s = -1; }
  else { const a = (deg * Math.PI) / 180; c = Math.cos(a); s = Math.sin(a); }
  const ax = num(p && p.x), ay = num(p && p.y);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of [[0, 0], [w, 0], [w, d], [0, d]]) {
    const X = ax + px * c - py * s, Y = ay + px * s + py * c;
    if (X < x0) x0 = X; if (X > x1) x1 = X;
    if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  return { x0, y0, x1, y1, ex: x1 - x0, ey: y1 - y0 };
}

/** Z (balandlik) oralig'i: [z, z+h]. h berilmagan bo'lsa — kesishadi deb hisoblanadi. */
function zInterval(p) {
  const h = num(p && p.h);
  if (h <= 0) return null;
  const z0 = num(p && p.z);
  return [z0, z0 + h];
}

/** Ikki mebel kesishadimi (footprint + balandlik — mos: sp-editor.js). */
export function itemsOverlap(a, b) {
  if (!a || !b) return false;
  /* Balandlik: ustki (z=1450) va pastki (z=0) shkaflar bir joyda turadi,
     lekin 3D da to'qnashmaydi → soxta W_OVERLAP kerak emas (A3). */
  const az = zInterval(a), bz = zInterval(b);
  if (az && bz && (az[1] <= bz[0] || bz[1] <= az[0])) return false;
  const fa = footprint(a), fb = footprint(b);
  return fa.x0 < fb.x1 && fb.x0 < fa.x1 && fa.y0 < fb.y1 && fb.y0 < fa.y1;
}

/* ═════════════ F1 — POLIGON XONA ═════════════ */

/** Xona outline'ining bounding box'i (mm). */
export function roomBBox(outline) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outline || []) {
    const x = num(p && p[0]), y = num(p && p[1]);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!isFinite(minX)) { minX = minY = maxX = maxY = 0; }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ray-casting: nuqta poligon ichida. Chegaraga ±1 mm (chegara → ichida). */
export function pointInPoly(x, y, pts) {
  if (!pts || pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = num(pts[i][0]), yi = num(pts[i][1]);
    const xj = num(pts[j][0]), yj = num(pts[j][1]);
    if (((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
  }
  if (inside) return true;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (distSeg(x, y, num(pts[j][0]), num(pts[j][1]), num(pts[i][0]), num(pts[i][1])) <= 1) return true;
  }
  return false;
}

/**
 * Footprint to'liq xona poligonida: 4 burchak + 4 chek nuqtasi + markaz
 * poligon ichida bo'lishi kerak (L shakldagi qirqimni ushlaydi).
 */
export function fpInRoom(fp, pts) {
  const mx = (fp.x0 + fp.x1) / 2, my = (fp.y0 + fp.y1) / 2;
  const probes = [
    [fp.x0, fp.y0], [fp.x1, fp.y0], [fp.x1, fp.y1], [fp.x0, fp.y1],
    [mx, fp.y0], [mx, fp.y1], [fp.x0, my], [fp.x1, my], [mx, my]
  ];
  return probes.every(([x, y]) => pointInPoly(x, y, pts));
}

/**
 * ProjectDoc'ni tekshiradi.
 * @param {Object} doc
 * @param {Object} [opts] { catalog: {code: frag}, minPerimeter: mm }
 * @returns {{errors:Array, warnings:Array, ok:boolean}}
 */
export function validateDoc(doc, opts = {}) {
  const errors = [], warnings = [];
  const catalog = opts.catalog || null;
  const MIN = opts.minPerimeter || MIN_PERIMETER_MM;

  if (!doc || typeof doc !== 'object') {
    return { errors: [{ code: 'E_DOC_INVALID', message: 'Chizma formati noto\'g\'ri' }], warnings, ok: false };
  }

  const room = doc.room || {};
  const outline = Array.isArray(room.outline) ? room.outline : [];
  if (outline.length < 3) {
    errors.push({ code: 'E_OUTLINE_INVALID', message: 'Xona kamida 3 nuqtadan iborat bo\'lishi kerak' });
    return { errors, warnings, ok: false };
  }

  // ── 1) nuqtalar to'g'rimi? (serverdagi float() bilan BIR XIL: 'x' → xato)
  const pts = [];
  for (const p of outline) {
    let bad = !p || typeof p !== 'object' || p.length < 2;
    let x = 0, y = 0;
    if (!bad) {
      const rx = p[0], ry = p[1];
      const nx = typeof rx === 'number' ? rx : (typeof rx === 'string' && rx.trim() !== '' ? Number(rx) : NaN);
      const ny = typeof ry === 'number' ? ry : (typeof ry === 'string' && ry.trim() !== '' ? Number(ry) : NaN);
      bad = !isFinite(nx) || !isFinite(ny);
      x = nx; y = ny;
    }
    if (bad) {
      errors.push({ code: 'E_OUTLINE_INVALID', message: 'Nuqta noto\'g\'ri: ' + JSON.stringify(p) });
      x = 0; y = 0;
    }
    pts.push([x, y]);
  }
  if (errors.length) return { errors, warnings, ok: false };

  // ── 2) perimetr
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    perim += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  if (perim < MIN) {
    errors.push({ code: 'E_OUTLINE_TOO_SMALL',
                  message: 'Xona juda kichik (' + Math.round(perim) + ' mm < ' + MIN + ' mm)' });
  }

  // ── 3) teshiklar
  const openings = Array.isArray(room.openings) ? room.openings : [];
  const spans = [];
  openings.forEach((op, i) => {
    if (!op || typeof op !== 'object') {
      errors.push({ code: 'E_OPENING_OUT_OF_WALL', message: i + '-teshik noto\'g\'ri' });
      return;
    }
    const wi = parseInt(op.wall, 10);
    if (!(wi >= 0) || wi >= pts.length) {
      errors.push({ code: 'E_OPENING_OUT_OF_WALL', message: i + '-teshik devori yo\'q' });
      return;
    }
    const a = pts[wi], b = pts[(wi + 1) % pts.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const off = num(op.offset), wid = num(op.width);
    if (off < 0 || off + wid > seg + 1) {
      errors.push({ code: 'E_OPENING_OUT_OF_WALL',
                    message: i + '-teshik devordan chiqib ketgan' });
    } else {
      spans.push([wi, off, off + wid]);
    }
  });
  // ustma-ust teshik
  const seen = new Set();
  for (const [wi, s1, e1] of spans) {
    for (const [wj, s2, e2] of spans) {
      if (wi === wj && s1 < e2 && s2 < e1 && (s1 !== s2 || e1 !== e2)) {
        const key = [wi, Math.min(s1, s2), Math.max(e1, e2)].join(':');
        if (!seen.has(key)) {
          seen.add(key);
          errors.push({ code: 'E_OPENING_OVERLAP', message: 'Ikki teshik ustma-ust' });
        }
      }
    }
  }

  // ── 3b) quvur / rozetka (F1)
  const utils = Array.isArray(room.utilities) ? room.utilities : [];
  utils.forEach((u, i) => {
    if (!u || typeof u !== 'object') {
      errors.push({ code: 'E_UTIL_OUT_OF_WALL', message: i + '-quvur/rozetka noto\'g\'ri' });
      return;
    }
    const wi = parseInt(u.wall, 10);
    if (!(wi >= 0) || wi >= pts.length) {
      errors.push({ code: 'E_UTIL_OUT_OF_WALL', message: i + '-quvur/rozetka devori yo\'q' });
      return;
    }
    const a = pts[wi], b = pts[(wi + 1) % pts.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const off = num(u.offset);
    if (off < 0 || off > seg + 1) {
      errors.push({ code: 'E_UTIL_OUT_OF_WALL', message: i + '-quvur/rozetka devordan chiqib ketgan' });
    }
  });

  // ── 4) mebellar
  const placements = Array.isArray(doc.placements) ? doc.placements : [];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  placements.forEach((p, i) => {
    if (!p || typeof p !== 'object') {
      errors.push({ code: 'E_FRAG_UNKNOWN', message: i + '-mebel noto\'g\'ri' });
      return;
    }
    const frag = catalog ? catalog[p.frg] : null;
    if (catalog && !frag) {
      errors.push({ code: 'E_FRAG_UNKNOWN', message: 'Katalogda yo\'q mebel: ' + p.frg });
      return;
    }
    const w = num(p.w), d = num(p.d), h = num(p.h);
    if (w <= 0 || d <= 0 || h <= 0) {
      errors.push({ code: 'E_FRAG_UNKNOWN', message: (p.frg || i) + ': o\'lcham 0 dan katta bo\'lishi kerak' });
      return;
    }
    // katalog chegaralari
    if (frag) {
      if (frag.min_w && w < frag.min_w) warnings.push({ code: 'W_SIZE_CLAMP', id: p.id, message: p.frg + ': eni chegaradan kich' });
      if (frag.max_w && w > frag.max_w) warnings.push({ code: 'W_SIZE_CLAMP', id: p.frg, message: p.frg + ': eni chegaradan katta' });
      if (frag.min_d && d < frag.min_d) warnings.push({ code: 'W_SIZE_CLAMP', id: p.id, message: p.frg + ': chuqurligi chegaradan kich' });
      if (frag.max_d && d > frag.max_d) warnings.push({ code: 'W_SIZE_CLAMP', id: p.frg, message: p.frg + ': chuqurligi chegaradan katta' });
    }
    // xona chegarasi — aylanish hisobga olingan (footprint)
    const ext = rotatedExtent(w, d, p.rot);
    const fp = footprint(p);
    if (ext.ex > (maxX - minX) || ext.ey > (maxY - minY)) {
      errors.push({ code: 'E_FRAG_UNKNOWN', message: p.frg + ': xonaga sig\'maydi' });
    } else if (!fpInRoom(fp, pts)) {
      // poligon (L shakl) — qirqim hududida ham ushlaydi; to'rtburchakda bbox bilan bir xil
      warnings.push({ code: 'W_OUT_OF_ROOM', id: p.id, message: p.frg + ': xona chegarasidan tashqarida' });
    }
  });

  // ── 5) mebel-to'qnashuv (ogohlantirish)
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (itemsOverlap(placements[i], placements[j])) {
        warnings.push({ code: 'W_OVERLAP', a: placements[i].id, b: placements[j].id,
                        message: 'Ikki mebel ustma-ust turibdi' });
      }
    }
  }

  return { errors, warnings, ok: errors.length === 0 };
}

/** Snap qadami (A2): zoom <1 → 10, <3 → 50, ≥3 → 100 mm; Shift = 1 mm. */
export function snapStep(mmPerPx, shift) {
  if (shift) return 1;
  const v = num(mmPerPx);
  if (v < 1) return 10;
  if (v < 3) return 50;
  return 100;
}

export function snapTo(value, step) {
  return step <= 1 ? Math.round(value) : Math.round(value / step) * step;
}