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
 * GibLab/.project daraxtiga mos: polosa varaq L (X) bo'ylab cho'ziladi,
 * polosaning balandligi (Y) = det ENI (W), ichidagi detallar L (X) bo'ylab
 * teriladi. Konvensiya packSheet bilan BIR XIL: placement X o'lchami = o.l,
 * Y o'lchami = o.w — shunda DXF/CNC konsumentlari (fw = rotated ? w : l)
 * va textura yo'nalishi to'g'ri chiqadi.
 * (Eski kodda X/Y ALMASGAN edi → DXF'da detallar ustma-ust tushar,
 *  tekstura 90° burilar edi.) items l/w — KERF QO'SHILGAN (nestPanels).
 * Aylanish: it.canRotate && maxRot >= 2 bo'lsa 90° mumkin.
 * Qaytaradi: {placed, unplaced, remnants:[{x,y,w,h,area}]}
 */
function packStrip(items, L0, W0, kerf, maxRot) {
  const sorted = items.slice().sort((a, b) => (b.w - a.w) || (b.l - a.l));
  const placed = [], unplaced = [], remnants = [];
  let posW = 0, cur = null;   // keyingi polosaning Y boshi

  const closeStrip = () => {
    if (!cur) return;
    const remL = L0 - cur.posL;
    if (remL >= 30) remnants.push({ x: cur.posL, y: cur.y, w: remL, h: cur.height, area: remL * cur.height });
    cur = null;
  };

  /* placement: X = o.l, Y = o.w; xIsLength — X o'lchami detning uzunligimi */
  const place = (it, o, x, y) => {
    placed.push({
      id: it.id + '#' + placed.length, src: it.src || it,
      x, y, w: o.l, h: o.w, rotated: o.rot,
      xIsLength: o.rot ? !it.lIsLength : it.lIsLength
    });
  };

  for (const it of sorted) {
    const allowRot = (it.canRotate !== false) && (maxRot >= 2);
    const opts = [{ l: it.l, w: it.w, rot: false }];
    if (allowRot) opts.push({ l: it.w, w: it.l, rot: true });
    let done = false;
    if (cur) {
      for (const o of opts) {
        if (Math.abs(cur.height - o.w) <= 1 && cur.posL + o.l <= L0 + 0.01) {
          place(it, o, cur.posL, cur.y);
          cur.posL += o.l;
          done = true; break;
        }
      }
    }
    if (done) continue;
    closeStrip();
    let ok = false;
    for (const o of opts) {
      if (posW + o.w <= W0) {
        cur = { height: o.w, y: posW, posL: o.l };
        place(it, o, 0, posW);
        posW += o.w;
        ok = true; break;
      }
    }
    if (!ok) unplaced.push(it);
  }
  closeStrip();
  if (posW > 0) {
    const remW = W0 - posW;
    if (remW >= 30) remnants.push({ x: 0, y: posW, w: L0, h: remW, area: L0 * remW });
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
    placed.push({
      id: it.id, x: best.x, y: best.y, w: best.w, h: best.h, rotated: rot,
      xIsLength: rot ? !it.lIsLength : it.lIsLength,   // X o'lchami detning uzunligimi
      src: it.src || it
    });
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
    /* lIsLength — item.l detning UZUNLIGIMI (varaq L/X bo'ylab).
     * 'uzunlik' texturada uzunlikka aylanish taqiqlanadi; 'en' texturada
     * l/w almashgani uchun placementning X o'lchami det ENI bo'ladi. */
    let lIsLength = true;
    if (tex === 'uzunlik' || tex === 'length' || tex === 'y') {
      canRotate = false;
    } else if (tex === 'en' || tex === 'width' || tex === 'x') {
      initialL = pWid + kerf;
      initialW = pLen + kerf;
      canRotate = false;
      lIsLength = false;
    }

    for (let i = 0; i < n; i++) {
      items.push({
        id: p.id + '#' + i,
        src: p,
        l: initialL,
        w: initialW,
        canRotate,
        lIsLength,
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
        /* rotated = X o'lchami detning ENI (konsumentlar fw = rotated ? w : l) */
        rotated: x.xIsLength != null ? !x.xIsLength : x.rotated,
        material: x.src.material,
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
 * Bitta panel berilgan varaqda TEXTURE qoidalari bilan sig'adimi?
 * (qolgan detallar bilan emas — faqat o'zi; tanlangan formatda har bir detal
 * o'z varaqiga yoki lentalar orasidagi bo'shliqqa sig'ishi shart.)
 */
export function panelFitsSheet(p, L, W, kerf = KERF_DEFAULT, trimL = TRIM_DEFAULT, trimW = TRIM_DEFAULT) {
  const tex = String(p.texture || p.grain || '').toLowerCase();
  const len = +p.length || 0, wid = +p.width || 0;
  const fits = (l, w) => l + trimL + kerf <= L && w + trimW + kerf <= W;
  if (tex === 'uzunlik' || tex === 'length' || tex === 'y') return fits(len, wid);
  if (tex === 'en' || tex === 'width' || tex === 'x') return fits(wid, len);
  return fits(len, wid) || fits(wid, len);
}

/**
 * Material varaq formatini tanlaydi.
 * `sheets` — materiaaldagi formatlar RO'YXATI (ustuvorlik saqlanadi):
 * birinchi (berilgan tartibda) format — `fits(L,W)` uchun true qaytaradi.
 * Hammasi sig'masa — eng katta format (qolgan detallar ogohlantiriladi).
 * @param {Array} sheets — [[L,W], ...]
 * @param {function} fits — (L, W) => boolean
 * @returns {[number, number]}
 */
export function pickSheetSize(sheets, fits) {
  const list = (sheets && sheets.length) ? sheets.filter(s => s && +s[0] > 0 && +s[1] > 0) : [];
  if (!list.length) return [2800, 2070];
  for (const s of list) if (fits(+s[0], +s[1])) return [+s[0], +s[1]];
  return list.slice().sort((a, b) => (+b[0] * +b[1]) - (+a[0] * +a[1]))[0].map(Number);
}

/**
 * Butun loyiha: materiallar bo'yicha guruhlab joylashtiradi.
 * @param {Array} parts — cutlist chiqishi (material maydoni bilan)
 * @param {Object} materials — materials.json
 */
export function nestProject(parts, materials, cfg = {}) {
  const sheetPrice = {};
  (materials.panel_materials || []).forEach(m => {
    sheetPrice[m.code] = m.sheet_price || 0;
  });
  const groups = {};
  for (const p of parts) (groups[p.material || 'DEFAULT'] = groups[p.material || 'DEFAULT'] || []).push(p);

  const kerf = cfg.kerf != null ? +cfg.kerf : (materials.kerf || 4);
  const trimL = cfg.trimL != null ? +cfg.trimL : (materials.trimL != null ? +materials.trimL : (materials.trim || TRIM_DEFAULT));
  const trimW = cfg.trimW != null ? +cfg.trimW : (materials.trimW != null ? +materials.trimW : (materials.trim || TRIM_DEFAULT));

  /* Format shu loyihadagi detallarga sig'adigan bo'lishi shart —
   * aks holda kichik format (2440×1220) katta orqa panellarni tashlab ketadi. */
  const sizes = {};
  for (const m of (materials.panel_materials || [])) {
    sizes[m.code] = pickSheetSize(m.sheets, (L, W) =>
      (groups[m.code] || []).every(p => panelFitsSheet(p, L, W, kerf, trimL, trimW)));
  }

  const nestOpt = {
    kerf,
    trimL,
    trimW,
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
