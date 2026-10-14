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

/** Ikki mebel kesishadimi (mos: sp-editor.js). */
export function itemsOverlap(a, b) {
  if (!a || !b) return false;
  const ea = rotatedExtent(a.w, a.d, a.rot), eb = rotatedExtent(b.w, b.d, b.rot);
  const acx = num(a.x) + num(a.w) / 2, acy = num(a.y) + num(a.d) / 2;
  const bcx = num(b.x) + num(b.w) / 2, bcy = num(b.y) + num(b.d) / 2;
  return (Math.abs(acx - bcx) * 2 < ea.ex + eb.ex) &&
         (Math.abs(acy - bcy) * 2 < ea.ey + eb.ey);
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
    // xona chegarasi
    if (w > (maxX - minX) || d > (maxY - minY)) {
      errors.push({ code: 'E_FRAG_UNKNOWN', message: p.frg + ': xonaga sig\'maydi' });
    } else if (p.x < minX - 1 || p.y < minY - 1 || p.x + w > maxX + 1 || p.y + d > maxY + 1) {
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