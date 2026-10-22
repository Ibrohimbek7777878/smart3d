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
 *   - Kerf: 4 mm (arracha qalinligi) — faqat qo'shni detallar orasida (TZ-20, 2026-10-17)
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
      id: it.id + '#' + placed.length, it, src: it.src || it,
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

/* ── Guillotine joylashtirish (bitta varaq) ─────────────────────────
 * items l/w — KERF QO'SHILGAN; varaq L0×W0 = samarali o'lcham + kerf
 * (kerf faqat qo'shni detallar orasida: n ta detal + (n−1) kerf ≤ samarali o'lcham).
 * Erkin to'rtburchak detal qo'yilgach IKKI bo'lakka bo'linadi (bitta to'g'ri
 * kesim — arra stanogi uchun guillotine saqlanadi):
 *   fit   — qaysi bo'sh joy: 'bssf' (qisqa tomon qoldig'i eng kam), 'blsf'
 *           (uzun tomon qoldig'i eng kam), 'baf' (maydon qoldig'i eng kam);
 *   split — qaysi kesim avval: 'slas' / 'llas' (qoldiq o'qi qisqa / uzun),
 *           'minas' / 'maxas' (kichik bo'lak eng kichik / eng katta),
 *           'sas' / 'las' (bo'sh joyning qisqa / uzun o'qi).
 * Sig'magan detallar — keyingi varaqqa (unplaced). */
function fitScore(fit, fw, fh, w, h) {
  const dw = fw - w, dh = fh - h;
  const lo = Math.min(dw, dh), hi = Math.max(dw, dh);
  if (fit === 'blsf') return [hi, lo];
  if (fit === 'baf') return [fw * fh - w * h, lo];
  return [lo, hi];
}

function splitHorizontal(split, fw, fh, w, h) {
  const rw = fw - w, rh = fh - h;
  switch (split) {
    case 'llas': return rw > rh;
    case 'minas': return w * rh > rw * h;
    case 'maxas': return w * rh <= rw * h;
    case 'sas': return fw <= fh;
    case 'las': return fw > fh;
    default: return rw <= rh;          // 'slas'
  }
}

function packSheet(items, L0, W0, opt = {}) {
  const maxRot = opt.maxRot != null ? opt.maxRot : 2;   // 1=yo'q, 2=90°
  const fit = opt.fit || 'bssf', split = opt.split || 'slas';
  const free = [{ x: 0, y: 0, w: L0, h: W0 }];
  const placed = [], unplaced = [];

  for (const it of items) {
    let best = null;
    const allowRot = (it.canRotate !== false) && (maxRot >= 2);
    for (let i = 0; i < free.length; i++) {
      const f = free[i];
      for (let r = 0; r < (allowRot ? 2 : 1); r++) {
        const w = r ? it.w : it.l, h = r ? it.l : it.w;
        if (w > f.w || h > f.h) continue;
        const s = fitScore(fit, f.w, f.h, w, h);
        if (!best || s[0] < best.s[0] || (s[0] === best.s[0] && s[1] < best.s[1])) best = { s, i, w, h, rot: r === 1 };
      }
    }
    if (!best) { unplaced.push(it); continue; }

    const f = free[best.i];
    placed.push({
      id: it.id, it, x: f.x, y: f.y, w: best.w, h: best.h, rotated: best.rot,
      xIsLength: best.rot ? !it.lIsLength : it.lIsLength,   // X o'lchami detning uzunligimi
      src: it.src || it
    });
    free.splice(best.i, 1);

    /* guillotine: ikki bo'lak — o'ng (x bo'ylab qoldiq) va past (y bo'ylab qoldiq) */
    const rw = f.w - best.w, rh = f.h - best.h;
    const hor = splitHorizontal(split, f.w, f.h, best.w, best.h);
    const right = { x: f.x + best.w, y: f.y, w: rw, h: hor ? best.h : f.h };
    const bottom = { x: f.x, y: f.y + best.h, w: hor ? f.w : best.w, h: rh };
    if (right.w >= 10 && right.h >= 10) free.push(right);
    if (bottom.w >= 10 && bottom.h >= 10) free.push(bottom);
  }
  return { placed, unplaced, free };
}

/* ── Ko'p o'tishli tanlov (BSSF rejimi) ─────────────────────────────
 * Bir nechta saralash tartibi × joy tanlash × kesim qoidasi bilan butun
 * material joylanadi; ikki usulda:
 *   a) har sozlama butun materialni varaqma-varaq teradi;
 *   b) har varaqda barcha sozlamalar sinaladi, eng ko'p maydon to'ldirgani olinadi.
 * Eng kam varaq, teng bo'lsa — oxirgi varaq eng bo'sh (oldingilar eng to'la,
 * qoldiq bir joyda katta). Tasodif va vaqt yo'q — natija deterministik. */
const SORTS = [
  (a, b) => (b.l * b.w) - (a.l * a.w),                                         // maydon
  (a, b) => Math.max(b.l, b.w) - Math.max(a.l, a.w) || Math.min(b.l, b.w) - Math.min(a.l, a.w),   // uzun tomon
  (a, b) => Math.min(b.l, b.w) - Math.min(a.l, a.w) || Math.max(b.l, b.w) - Math.max(a.l, a.w),   // qisqa tomon
  (a, b) => (b.l + b.w) - (a.l + a.w),                                         // perimetr
  (a, b) => b.w - a.w || b.l - a.l,                                            // varaq eni bo'ylab
  (a, b) => b.l - a.l || b.w - a.w                                             // varaq uzunligi bo'ylab
];
const FITS = ['bssf', 'blsf', 'baf'];
const SPLITS = ['slas', 'llas', 'minas', 'maxas', 'sas', 'las'];

function sortedBy(items, k) {
  const cmp = SORTS[k];
  return items.map((it, i) => [it, i]).sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]).map(x => x[0]);
}

function placedArea(r) { let a = 0; for (const p of r.placed) a += p.w * p.h; return a; }

/** sozlama bo'yicha butun pool'ni varaqma-varaq teradi → [{placed, free}] */
function runPlan(pool, L0, W0, cfg) {
  const out = [];
  let rest = pool, guard = 0;
  while (rest.length && guard++ < 500) {
    const r = packSheet(rest, L0, W0, cfg);
    if (!r.placed.length) break;
    out.push(r);
    rest = r.unplaced;
  }
  return out;
}

function betterPlan(a, b) {
  if (!b) return true;
  const na = a.reduce((s, r) => s + r.placed.length, 0), nb = b.reduce((s, r) => s + r.placed.length, 0);
  if (na !== nb) return na > nb;                       // (himoya) ko'proq detal joylashgani
  if (a.length !== b.length) return a.length < b.length;
  if (!a.length) return false;
  return placedArea(a[a.length - 1]) < placedArea(b[b.length - 1]);
}

function bestPlan(items, L0, W0, maxRot) {
  const cfgs = [];
  for (let k = 0; k < SORTS.length; k++) for (const fit of FITS) for (const split of SPLITS) cfgs.push({ k, fit, split, maxRot });
  const orders = SORTS.map((_, k) => sortedBy(items, k));

  /* a) har sozlama — butun material */
  let best = null;
  for (const c of cfgs) {
    const plan = runPlan(orders[c.k], L0, W0, c);
    if (betterPlan(plan, best)) best = plan;
  }

  /* b) varaqma-varaq eng to'la varaq (har varaqda barcha sozlamalar) */
  const greedy = [];
  let rest = new Set(items), guard = 0;
  while (rest.size && guard++ < 500) {
    let top = null, topA = -1;
    for (const c of cfgs) {
      const r = packSheet(orders[c.k].filter(it => rest.has(it)), L0, W0, c);
      const a = placedArea(r);
      if (a > topA) { top = r; topA = a; }
    }
    if (!top || !top.placed.length) break;
    greedy.push(top);
    rest = new Set(top.unplaced);
  }
  if (betterPlan(greedy, best)) best = greedy;
  return best || [];
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

  /* Kerf faqat QO'SHNI detallar orasida (oxirgi detaldan keyin emas): har detal
   * l+kerf egallaydi, varaq esa samarali o'lcham + kerf — n detal + (n−1) kerf ≤ eff. */
  const binL = effL + kerf, binW = effW + kerf;
  let plan;
  if (mode === 'strip') {
    plan = [];
    let rest = items, guard = 0;
    while (rest.length && guard++ < 500) {
      const r = packStrip(rest, binL, binW, kerf, maxRot);
      if (!r.placed.length) break; // bitta ham joylashmadi → cheksiz loopdan chiqish
      plan.push(r);
      rest = r.unplaced;
    }
  } else {
    plan = bestPlan(items, binL, binW, maxRot);
  }

  const sheets = [];
  const allRemnants = [];
  const joylashdi = new Set();
  for (const r of plan) {
    for (const x of r.placed) joylashdi.add(x.it);
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

    // qoldiqlar (remnants) — trim offset bilan; varaq chetidagi kerf zaxirasi kesib tashlanadi
    const rawRems = (r.remnants || r.free || []).map(f => {
      const w = Math.min(f.x + f.w, effL) - f.x, h = Math.min(f.y + f.h, effW) - f.y;
      return { x: f.x, y: f.y, w, h, area: w * h };
    });

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
  }
  const pool = items.filter(it => !joylashdi.has(it));

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
  /* TZ-42: nestPanels bilan AYNAN bir xil shart — samarali o'lcham = varaq − 2×trim (kerf faqat qo'shni detallar orasida, chetida emas).
   * Avval `l + trim + kerf <= L` edi: varaqdan 4–14 mm kichik detal "sig'adi" deb formatni tanlatib, kroyda esa sig'may qolardi. */
  const fits = (l, w) => l + 2 * trimL <= L && w + 2 * trimW <= W;
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
  /* standart bo'lak materiallari (stoleshnitsa 3050/4200) — varaqqa kroy qilinmaydi, productionCost dona bilan hisoblaydi */
  const donaMat = new Set((materials.panel_materials || []).filter(m => m.unit_piece).map(m => m.code));
  for (const p of parts) if (!donaMat.has(p.material)) (groups[p.material || 'DEFAULT'] = groups[p.material || 'DEFAULT'] || []).push(p);

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
