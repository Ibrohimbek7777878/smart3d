/* Smart3D engine/nesting.js — VARAQGA JOYLASHTIRISH (raskroy).
 *
 * Manba: mebelcity-platform/client_erp/services/sunpin_nesting.py
 * (guillotine + rectpack) — bu yerda rectpack'siz SOF JS guillotine:
 *   BSSF (Best Short Side Fit) + lenta (strip) rejimlari.
 *
 * Qoidalar (sanoat mebel ishlab chiqarish talablari):
 *   - Varaq: LDSP/MDF uchun 2800×2070 yoki 2440×1220 (materials.json)
 *   - Trim (chetini tozalash): trimL va trimW (standart 10 mm) — varaq chetidagi
 *     shikastlangan/iflos qismlarni hisobdan chiqarib, effL va effW ga joylashtirish
 *   - Kerf: har bir detalga +4 mm (arracha qalinligi)
 *   - Textura / Grain direction:
 *       'uzunlik' (length/y): detal uzunligi varaq uzunligi bo'ylab bo'lishi shart (aylanish man etiladi)
 *       'en' (width/x): detal uzunligi varaq eni bo'ylab
 *       'ixtiyoriy' / 'none': aylantirish mumkin (maxRot >= 2 bo'lsa)
 *   - Qoldiqlar (remnants): o'lchamlari va maydoni bilan ombor hisobiga tayyor formatda
 *
 * @returns {material: {sheets:[{no,L,W,trimL,trimW,parts,used}], stats, remnants, sheet_price}}
 */

export const KERF_DEFAULT = 4;
export const TRIM_DEFAULT = 10;

/* ── LSTR: lenta rejimi — teng kenglikdagi detallar lentalari ─────
 * GibLab/.project daraxtiga mos: chiziq kengligi = det kengligi (L bo'ylab),
 * detallar W bo'ylab teriladi. items l/w — KERF QO'SHILGAN (nestPanels).
 * Aylanish: it.canRotate && maxRot >= 2 bo'lsa 90° mumkin.
 * Qaytaradi: {placed, unplaced, remnants:[{x,y,w,h,area}]}
 */
function packStrip(items, L0, W0, kerf, maxRot) {
  const sorted = items.slice().sort((a, b) => (b.w - a.w) || (b.l - a.l));
  const placed = [], unplaced = [], remnants = [];
  let posL = 0, cur = null;

  const closeStrip = () => {
    if (!cur) return;
    let posW = 0;
    for (const p of cur.parts) posW += p.l;
    const remW = W0 - posW;
    if (remW >= 30) remnants.push({ x: cur.x, y: posW, w: cur.width, h: remW, area: cur.width * remW });
    cur = null;
  };

  for (const it of sorted) {
    const allowRot = (it.canRotate !== false) && (maxRot >= 2);
    const opts = [{ l: it.l, w: it.w, rot: false }];
    if (allowRot) opts.push({ l: it.w, w: it.l, rot: true });
    let done = false;
    if (cur) {
      const posW = cur.parts.reduce((s, x) => s + x.l, 0);
      for (const o of opts) {
        if (Math.abs(cur.width - o.w) <= 1 && posW + o.l <= W0 + 0.01) {
          cur.parts.push({ l: o.l });
          placed.push({
            id: it.id + '#' + placed.length, src: it.src || it,
            x: cur.x, y: posW, w: o.w, h: o.l, rotated: o.rot
          });
          done = true; break;
        }
      }
    }
    if (done) continue;
    closeStrip();
    let ok = false;
    for (const o of opts) {
      if (posL + o.w <= L0) {
        cur = { width: o.w, x: posL, parts: [{ l: o.l }] };
        placed.push({
          id: it.id + '#' + placed.length, src: it.src || it,
          x: posL, y: 0, w: o.w, h: o.l, rotated: o.rot
        });
        posL += o.w;
        ok = true; break;
      }
    }
    if (!ok) unplaced.push(it);
  }
  closeStrip();
  if (posL > 0) {
    const remL = L0 - posL;
    if (remL >= 30) remnants.push({ x: posL, y: 0, w: remL, h: W0, area: remL * W0 });
  }
  return { placed, unplaced, remnants };
}

/** Bir varaqqa guillotine (BSSF) joylashtirish. */
function packSheet(items, L0, W0, opt = {}) {
  const maxRot = opt.maxRot != null ? opt.maxRot : 2;   // 1=yo'q, 2=90°
  const kerf = opt.kerf != null ? opt.kerf : KERF_DEFAULT;
  const free = [{ x: 0, y: 0, w: L0, h: W0 }];
  const placed = [], unplaced = [];

  for (const it of items) {
    let best = null, bi = -1, rot = false;
    const allowRot = (it.canRotate !== false) && (maxRot >= 2);
    for (let i = 0; i < free.length; i++) {
      const f = free[i];
      // to'g'ri (0°)
      if (it.l <= f.w && it.w <= f.h) {
        const s = Math.min(f.w - it.l, f.h - it.w);
        if (!best || s < best.s) { best = { s, x: f.x, y: f.y, w: it.l, h: it.w, f: i }; rot = false; }
      }
      // 90° aylantirilgan (faqat ruxsat bo'lsa)
      if (allowRot && it.w <= f.w && it.l <= f.h) {
        const s = Math.min(f.w - it.w, f.h - it.l);
        if (!best || s < best.s) { best = { s, x: f.x, y: f.y, w: it.w, h: it.l, f: i }; rot = true; }
      }
    }
    if (!best) { unplaced.push(it); continue; }

    const f = free[best.f];
    placed.push({ id: it.id, x: best.x, y: best.y, w: best.w, h: best.h, rotated: rot, src: it.src || it });
    free.splice(best.f, 1);
    
    // Guillotine bo'linishi
    const rw = f.w - best.w, rh = f.h - best.h;
    if (rw >= 10 && best.h >= 10) free.push({ x: f.x + best.w, y: f.y, w: rw, h: best.h });
    if (rh >= 10 && best.w >= 10) free.push({ x: f.x, y: f.y + best.h, w: best.w, h: rh });
    if (rw >= 10 && rh >= 10) free.push({ x: f.x + best.w, y: f.y + best.h, w: rw, h: rh });
    
    // mayda bo'shliqlarni tozalash
    for (let i = free.length - 1; i >= 0; i--) {
      if (free[i].w < 10 || free[i].h < 10) free.splice(i, 1);
    }
  }
  return { placed, unplaced, free };
}

/**
 * Panellarni varaq(lar)ga joylashtiradi.
 * @param {Array} panels — [{id, length, width, code, fragment, material, texture}]
 * @param {Object} opt — {sheetL, sheetW, trimL, trimW, kerf, sheetPrice, mode, maxRot, remMinA, remMinB, remUsableMin}
 */
export function nestPanels(panels, opt = {}) {
  const sheetL = opt.sheetL || 2800, sheetW = opt.sheetW || 2070;
  const trimL = opt.trimL != null ? +opt.trimL : (opt.trim != null ? +opt.trim : TRIM_DEFAULT);
  const trimW = opt.trimW != null ? +opt.trimW : (opt.trim != null ? +opt.trim : TRIM_DEFAULT);
  const effL = Math.max(100, sheetL - 2 * trimL);
  const effW = Math.max(100, sheetW - 2 * trimW);

  const kerf = opt.kerf != null ? opt.kerf : KERF_DEFAULT;
  const mode = opt.mode === 'strip' ? 'strip' : 'bssf';
  const maxRot = opt.maxRot != null ? +opt.maxRot : 2;
  const remMinA = opt.remMinA != null ? +opt.remMinA : 300;
  const remMinB = opt.remMinB != null ? +opt.remMinB : 300;
  const remUsableMin = opt.remUsableMin != null ? +opt.remUsableMin : 0.5;   // m²

  // kerf qo'shilgan holda va textura qoidalarini inobatga olgan holda
  const items = [];
  for (const p of panels) {
    const n = Math.max(1, Math.round(p.qty || 1));
    const tex = String(p.texture || p.grain || '').toLowerCase();
    const pLen = p.length != null ? +p.length : (+p.len || 0);
    const pWid = p.width != null ? +p.width : (+p.w || 0);
    let canRotate = maxRot >= 2;
    let initialL = pLen + kerf;
    let initialW = pWid + kerf;
    if (tex === 'uzunlik' || tex === 'length' || tex === 'y') {
      canRotate = false;
    } else if (tex === 'en' || tex === 'width' || tex === 'x') {
      initialL = pWid + kerf;
      initialW = pLen + kerf;
      canRotate = false;
    }

    for (let i = 0; i < n; i++) {
      items.push({
        id: p.id + '#' + i,
        src: p,
        l: initialL,
        w: initialW,
        canRotate,
        texture: tex
      });
    }
  }
  items.sort((a, b) => (b.l * b.w) - (a.l * a.w));

  const sheets = [];
  let pool = items, guard = 0;
  const allRemnants = [];
  while (pool.length && guard < 500) {
    guard++;
    const r = mode === 'strip'
      ? packStrip(pool, effL, effW, kerf, maxRot)
      : packSheet(pool, effL, effW, { kerf, maxRot });
    if (!r.placed.length) break; // bitta ham joylashmadi → cheksiz loopdan chiqish

    let used = 0;
    const parts = r.placed.map(x => {
      used += x.src.length * x.src.width;
      const actualX = trimL + x.x;
      const actualY = trimW + x.y;
      return {
        ref: x.src.id, code: x.src.code || '', fragment: x.src.fragment || '',
        length: x.src.length, width: x.src.width,
        x: Math.round(actualX * 10) / 10, y: Math.round(actualY * 10) / 10,
        rotated: x.rotated, material: x.src.material,
        texture: x.src.texture || 'ixtiyoriy'
      };
    });

    sheets.push({
      no: sheets.length + 1,
      length: sheetL,
      width: sheetW,
      trimL,
      trimW,
      eff_length: effL,
      eff_width: effW,
      parts,
      used_area: Math.round(used)
    });

    // qoldiqlar (remnants) — trim offset bilan
    const rawRems = r.remnants || (r.free || [])
      .filter(f => Math.min(f.w, f.h) >= Math.min(remMinA, remMinB) && (f.w * f.h) / 1e6 >= remUsableMin)
      .map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h, area: f.w * f.h }));

    for (const rm of rawRems) {
      if (Math.min(rm.w, rm.h) >= Math.min(remMinA, remMinB) && rm.area / 1e6 >= remUsableMin) {
        allRemnants.push({
          id: `REM-${sheets.length}-${allRemnants.length + 1}`,
          sheet: sheets.length,
          material: opt.material || '',
          x: Math.round((trimL + rm.x) * 10) / 10,
          y: Math.round((trimW + rm.y) * 10) / 10,
          w: Math.round(rm.w * 10) / 10,
          h: Math.round(rm.h * 10) / 10,
          length: Math.round(rm.w * 10) / 10,
          width: Math.round(rm.h * 10) / 10,
          area: Math.round(rm.area),
          area_m2: Math.round(rm.area / 1e6 * 1000) / 1000,
          created_at: new Date().toISOString()
        });
      }
    }
    pool = r.unplaced;
  }

  const sheetArea = sheetL * sheetW * (sheets.length || 0);
  const usedArea = sheets.reduce((s, x) => s + x.used_area, 0);
  return {
    sheet_length: sheetL, sheet_width: sheetW,
    trimL, trimW, eff_length: effL, eff_width: effW,
    kerf, mode,
    sheets, sheet_count: sheets.length,
    unplaced: pool,
    remnants: allRemnants,
    sheet_price: opt.sheetPrice || 0,
    stats: {
      panel_count: items.length,
      placed_count: items.length - pool.length,
      used_area_m2: Math.round(usedArea / 1e6 * 1000) / 1000,
      sheet_area_m2: Math.round(sheetArea / 1e6 * 1000) / 1000,
      utilization_pct: sheetArea ? Math.round(usedArea / sheetArea * 1000) / 10 : 0,
      waste_m2: Math.round((sheetArea - usedArea) / 1e6 * 1000) / 1000,
      remnant_count: allRemnants.length,
      remnant_usable_m2: Math.round(allRemnants.reduce((s, x) => s + x.area, 0) / 1e6 * 1000) / 1000,
      cost: sheets.length * (opt.sheetPrice || 0)
    }
  };
}

/**
 * Butun loyiha: materiallar bo'yicha guruhlab joylashtiradi.
 * @param {Array} parts — cutlist chiqishi (material maydoni bilan)
 * @param {Object} materials — materials.json
 */
export function nestProject(parts, materials, cfg = {}) {
  const sheetPrice = {}, sizes = {};
  (materials.panel_materials || []).forEach(m => {
    sheetPrice[m.code] = m.sheet_price || 0;
    sizes[m.code] = (m.sheets && m.sheets[0]) || materials.sheet_sizes_default || [2800, 2070];
  });
  const groups = {};
  for (const p of parts) (groups[p.material || 'DEFAULT'] = groups[p.material || 'DEFAULT'] || []).push(p);

  const nestOpt = {
    kerf: cfg.kerf != null ? +cfg.kerf : (materials.kerf || 4),
    trimL: cfg.trimL != null ? +cfg.trimL : (materials.trimL != null ? +materials.trimL : (materials.trim || TRIM_DEFAULT)),
    trimW: cfg.trimW != null ? +cfg.trimW : (materials.trimW != null ? +materials.trimW : (materials.trim || TRIM_DEFAULT)),
    mode: cfg.mode || 'bssf',
    maxRot: cfg.maxRot != null ? +cfg.maxRot : 2,
    remMinA: cfg.remMinA, remMinB: cfg.remMinB, remUsableMin: cfg.remUsableMin
  };

  const byMaterial = {};
  let totalSheets = 0, totalUsed = 0, totalArea = 0, totalCost = 0, totalRem = 0, totalRemM2 = 0;
  let totalPlaced = 0, totalPanels = 0;
  for (const mat in groups) {
    const sz = sizes[mat] || [2800, 2070];
    const r = nestPanels(groups[mat], Object.assign({}, nestOpt, {
      sheetL: sz[0], sheetW: sz[1], sheetPrice: sheetPrice[mat] || 0, material: mat
    }));
    r.material = mat;
    byMaterial[mat] = r;
    totalSheets += r.sheet_count;
    totalUsed += r.stats.used_area_m2;
    totalArea += r.stats.sheet_area_m2;
    totalCost += r.stats.cost;
    totalRem += r.stats.remnant_count || 0;
    totalRemM2 += r.stats.remnant_usable_m2 || 0;
    totalPlaced += r.stats.placed_count || 0;
    totalPanels += r.stats.panel_count || 0;
  }
  return {
    by_material: byMaterial,
    mode: nestOpt.mode,
    summary: {
      materials: Object.keys(byMaterial).length,
      total_sheets: totalSheets,
      panel_count: totalPanels,
      placed_count: totalPlaced,
      used_area_m2: Math.round(totalUsed * 1000) / 1000,
      sheet_area_m2: Math.round(totalArea * 1000) / 1000,
      utilization_pct: totalArea ? Math.round(totalUsed / totalArea * 1000) / 10 : 0,
      waste_m2: Math.round((totalArea - totalUsed) * 1000) / 1000,
      remnant_count: totalRem,
      remnant_usable_m2: Math.round(totalRemM2 * 1000) / 1000,
      material_cost: totalCost
    }
  };
}

/**
 * Bir nechta turli buyurtmalarni (multi-order batching) umumiy varaqqa teradi (Kamchilik 10).
 * @param {Array<{ orderId: string, clientName: string, parts: Array }>} orders
 * @param {object} materials
 * @param {object} cfg
 */
export function nestBatch(orders, materials = {}, cfg = {}) {
  const taggedParts = [];
  for (const ord of (orders || [])) {
    const oId = ord.orderId || ord.id || 'ORD';
    const client = ord.clientName || ord.client || '';
    for (const p of (ord.parts || [])) {
      taggedParts.push(Object.assign({}, p, {
        orderId: oId,
        clientName: client,
        label: `[${oId}] ${p.label || p.name || p.code || ''}`
      }));
    }
  }
  const result = nestProject(taggedParts, materials, cfg);
  result.batch = {
    order_count: (orders || []).length,
    orders: (orders || []).map(o => ({ id: o.orderId || o.id, client: o.clientName || o.client, partsCount: (o.parts || []).length }))
  };
  return result;
}
