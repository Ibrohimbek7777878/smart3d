/* Smart3D engine/cutlist.js — DETALLAR (razdelka) + ISHLAB CHIQARISH XARAJATI.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI:
 *   - Xavfsiz AST parser (expr.js) orqali hisoblash: "eval" yo'q!
 *   - Shartli ifodalar: "w > 600 ? 2 : 1", "w > 600 ? (w/2 - 3) : (w - 4)"
 *   - Material qalinligi 't' o'zgaruvchisi to'liq qo'llab-quvvatlanadi: "w - 2 * t"
 *   - Ko'p slotlilik (slots.js): korpus, fasad, orqa, polka alohida materiallarda
 *   - Yog'och teksturasi yo'nalishi (texture: uzunlik / en / erkin)
 *   - To'liq tannarx: Varaqlar (kroy) + Kromka + Furnitura + Teshiklar + Ish haqi
 *   - Kesim o'lchami: tayyor o'lcham − kromka (≥1 mm); narxsiz narsa o'ylab topilmaydi
 */

import { evalFormula, roundMm } from './expr.js';
import { resolveSlots } from './slots.js';
import { panelFitsSheet, pickSheetSize, KERF_DEFAULT, TRIM_DEFAULT } from './nesting.js';

/** Orqaga moslik uchun evalExpr (ichkarida xavfsiz evalFormula ishlaydi). */
export function evalExpr(expr, vars) {
  return evalFormula(expr, vars);
}

/** Butun songa yaxlitlash (ishlab chiqarishda kasr yo'q). */
export function rInt(x) {
  return roundMm(x);
}

/** Kesim o'lchamidan shu qalinlikdan boshlab kromka ayiriladi (0.4 mm kabi yupqa kromka — yo'q). */
export const EDGE_DEDUCT_MIN_MM = 1;

/* Petlya soni eshik balandligiga qarab (petlya ishlab chiqaruvchilarining umumiy qoidasi) */
function hingesForDoor(heightMm) {
  if (heightMm <= 900) return 2;
  if (heightMm <= 1600) return 3;
  if (heightMm <= 2000) return 4;
  return 5;
}

/**
 * Fragment detallarini hisoblaydi.
 *
 * Detal `length`/`width` — KESIM o'lchami (arralanadigan): tayyor o'lchamdan
 * ≥ EDGE_DEDUCT_MIN_MM qalinlikdagi kromka tomonlari ayirilgan. Tayyor o'lcham —
 * `finish_length`/`finish_width`. Kromka metri tayyor o'lchamdan hisoblanadi.
 *
 * @param {Object} frag — fragments.json elementi
 * @param {number} w, d, h — joylashuv o'lchamlari (mm)
 * @param {Object} materials — materials.json
 * @param {Object} [opt] — { projectSlots, placementSlots }
 * @returns {{parts:[], edges:[], holes:[], hardware:[], stats:{}, errors:[]}}
 */
export function cutlist(frag, w, d, h, materials = {}, opt = {}) {
  const errors = [];
  const slotResolver = resolveSlots(opt.projectSlots, opt.placementSlots, materials, frag.slots);

  // Korpus materialining haqiqiy qalinligi t (mm)
  const tKorpus = slotResolver.getThickness('korpus');
  const tFasad = slotResolver.getThickness('fasad');

  const baseVars = {
    w: +w,
    d: +d,
    h: +h,
    t: tKorpus,
    t_korpus: tKorpus,
    t_fasad: tFasad
  };

  const parts = [];
  const partDefs = {};                      // detal kodi → fragments.json dagi ta'rif

  /* ── 1) Detallar (tayyor o'lcham) ───────────────────────────── */
  for (const p of frag.parts || []) {
    try {
      // Detal qaysi slotga tegishli? (korpus / fasad / orqa / polka)
      let slotName = p.slot;
      if (!slotName) {
        if (/eshik|fasad|door|front/i.test(p.code)) slotName = 'fasad';
        else if (/orqa|back|hdf/i.test(p.code)) slotName = 'orqa';
        else if (/polka|shelf/i.test(p.code)) slotName = 'polka';
        else slotName = 'korpus';
      }

      const matCode = slotResolver.getMaterialCode(slotName);
      const th = slotResolver.getThickness(slotName);
      const partVars = Object.assign({}, baseVars, { t: th });

      // Detal soni: formula yoki raqam ("w > 600 ? 2 : 1")
      let qty = 1;
      if (typeof p.qty === 'string' && isNaN(Number(p.qty))) {
        qty = Math.max(1, roundMm(evalFormula(p.qty, partVars)));
      } else {
        qty = Math.max(1, roundMm(+p.qty || 1));
      }

      // Detal uzunligi va eni
      const len = evalFormula(p.len, partVars);
      const wid = evalFormula(p.width, partVars);

      // Tekstura yo'nalishi (uzunlik / en / erkin)
      const texture = p.tekstura || p.texture || (slotName === 'orqa' ? 'erkin' : 'uzunlik');

      partDefs[p.code] = p;
      for (let i = 0; i < qty; i++) {
        parts.push({
          fragment: frag.code,
          code: p.code,
          ref: p.code + '#' + (i + 1),
          length: rInt(len),
          width: rInt(wid),
          finish_length: rInt(len),
          finish_width: rInt(wid),
          qty: 1,
          slot: slotName,
          material: matCode,
          thickness: th,
          texture
        });
      }
    } catch (e) {
      errors.push({
        code: 'E_BAD_EXPR',
        message: `${frag.code} parts.${p.code}: ${e.message}`
      });
    }
  }

  /* ── 1b) O'lcham validatsiyasi ─────────────────────────────────
   * Formula manfiy/0 natija bera olishi mumkin (mas. SP-BD-002 karkas:
   * "d-200", d=150 → −50). Bunday o'lcham raskroy/DXF/G-code'ni buzadi —
   * xato qaytaramiz va o'lchamni minimal qiymatga clamp qilamiz, shu tariqa
   * nomanfiy o'lcham hech qachon nesting va stanok fayllariga tushmaydi. */
  const MIN_PART_MM = 10;
  for (const p of parts) {
    if (p.finish_length > 0 && p.finish_width > 0) continue;
    errors.push({
      code: 'E_BAD_SIZE',
      message: `${frag.code}.${p.code}: tayyor o'lcham noto'g'ri (${p.finish_length}×${p.finish_width} mm) — formula ko'rsatmalarini tekshiring`
    });
    p.finish_length = Math.max(MIN_PART_MM, rInt(p.finish_length));
    p.finish_width = Math.max(MIN_PART_MM, rInt(p.finish_width));
    p.length = Math.max(MIN_PART_MM, rInt(p.length));
    p.width = Math.max(MIN_PART_MM, rInt(p.width));
  }

  /* ── 2) Kromka ──────────────────────────────────────────────────
   * Ikki format qo'llab-quvvatlanadi:
   *  a) fragment darajasida: edge: [{code, sides:["F","B"], material?, thickness?, slot?}]
   *     — aniq `material` berilgan bo'lsa shu ishlatiladi, aks holda slot;
   *  b) detal darajasida: parts[].edge = {F:"kromka_korpus", L:"kromka_fasad", ...}
   *     yoki "hammasi:kromka_fasad".
   * Tomonlar: F=old, B=orqa (uzunlik bo'ylab), L=chap, R=o'ng (en bo'ylab). */
  const partMap = {};
  for (const p of parts) (partMap[p.code] = partMap[p.code] || []).push(p);
  const sideThk = {};                       // detal kodi → {F,B,L,R: qalinlik mm}
  const edgeAgg = {};                       // detal kodi + material → yozuv

  function addEdge(code, sides, meta, qtyOverride) {
    const ps = partMap[code] || [];
    if (!ps.length || !sides.length) return;
    let mPerPiece = 0;
    for (const side of sides) {
      mPerPiece += (side === 'F' || side === 'B') ? ps[0].finish_length : ps[0].finish_width;
      const st = (sideThk[code] = sideThk[code] || {});
      st[side] = Math.max(st[side] || 0, +meta.thickness || 0);
    }
    const qty = Math.max(1, Math.round(+qtyOverride || ps.length));
    const key = code + '|' + meta.code;
    if (!edgeAgg[key]) {
      edgeAgg[key] = {
        fragment: frag.code, code, material: meta.code, name: meta.name || meta.code,
        thickness: +meta.thickness || 0, sides: [], qty, meters: 0
      };
    }
    const rec = edgeAgg[key];
    rec.sides = rec.sides.concat(sides);
    rec.meters = Math.round((rec.meters + (mPerPiece / 1000) * qty) * 1000) / 1000;
  }

  for (const e of frag.edge || []) {
    try {
      let meta;
      if (e.material && !e.slot) {
        const m = slotResolver.getEdgeByCode(e.material);
        meta = Object.assign({}, m, { thickness: e.thickness != null ? +e.thickness : m.thickness });
      } else {
        const isFasad = /eshik|fasad|front/i.test(e.code);
        meta = slotResolver.getEdge(e.slot || (isFasad ? 'kromka_fasad' : 'kromka_korpus'));
      }
      addEdge(e.code, e.sides || [], meta, e.qty);
    } catch (err) {
      errors.push({ code: 'E_BAD_EXPR', message: `${frag.code} edge.${e.code}: ${err.message}` });
    }
  }
  for (const code in partDefs) {
    const pe = partDefs[code].edge;
    if (!pe) continue;
    if (typeof pe === 'string') {
      const m = /^hammasi:(.+)$/.exec(pe.trim());
      if (m) addEdge(code, ['F', 'B', 'L', 'R'], slotResolver.getEdge(m[1]));
      else errors.push({ code: 'E_EDGE_FORMAT', message: `${frag.code} parts.${code}: kromka formati noma'lum "${pe}"` });
    } else if (typeof pe === 'object') {
      const bySlot = {};
      for (const side of ['F', 'B', 'L', 'R']) if (pe[side]) (bySlot[pe[side]] = bySlot[pe[side]] || []).push(side);
      for (const slot in bySlot) addEdge(code, bySlot[slot], slotResolver.getEdge(slot));
    }
  }
  const edges = Object.values(edgeAgg);

  /* ── 2b) Kesim o'lchami = tayyor o'lcham − kromka (≥ EDGE_DEDUCT_MIN_MM) ── */
  const dedOf = (code, side) => {
    const t = (sideThk[code] || {})[side] || 0;
    return t >= EDGE_DEDUCT_MIN_MM ? t : 0;
  };
  for (const p of parts) {
    if (!sideThk[p.code]) continue;
    const rawL = p.finish_length - dedOf(p.code, 'L') - dedOf(p.code, 'R');
    const rawW = p.finish_width - dedOf(p.code, 'F') - dedOf(p.code, 'B');
    if (rawL > 0 && rawW > 0) {
      p.length = rInt(rawL);
      p.width = rInt(rawW);
    } else {
      /* kromka qalinligi tayyor o'lchamdan katta — kesim o'lchami manfiy
       * bo'lmasin (aks holda raskroy va G-code buziladi) */
      errors.push({
        code: 'E_BAD_SIZE',
        message: `${frag.code}.${p.code}: kromkadan keyin kesim o'lchami manfiy (${rawL}×${rawW} mm)`
      });
      p.length = Math.max(MIN_PART_MM, rInt(rawL));
      p.width = Math.max(MIN_PART_MM, rInt(rawW));
    }
  }

  /* ── 3) Teshiklar (burg'ilash) ──────────────────────────────────
   * Formula koordinatasi TAYYOR detalning burchagidan, lekin O'QLAR fragment
   * ma'lumotidagi konvensiya bo'yicha: x — EN bo'ylab F chetdan (system-32 chizig'i:
   * 32/37/64/98 mm), y — UZUNLIK bo'ylab L chetdan (detal balandligi/uzunligi bo'ylab
   * joylashuv). 1281 fragmentning 99.1% (882/890) shu konvensiyaga mos chiqdi.
   * Stanok kesilgan (kromkasiz) panelni teshadi, shuning uchun F va L tomondagi
   * ayirilgan kromka qalinligiga suramiz — kromka yopishgach teshik joyida. */
  const holes = [];
  for (const hl of frag.holes || []) {
    try {
      const x = evalFormula(hl.x, baseVars) - dedOf(hl.part, 'F');
      const y = evalFormula(hl.y, baseVars) - dedOf(hl.part, 'L');
      const qty = Math.max(1, Math.round(+hl.qty || 1));
      holes.push({
        fragment: frag.code,
        part: hl.part,
        side: hl.side,
        x: Math.round(x),
        y: Math.round(y),
        dia: +hl.dia || 5,
        depth: +hl.depth || 13,
        kind: hl.kind || 'drill',
        qty
      });
    } catch (err) {
      errors.push({
        code: 'E_BAD_EXPR',
        message: `${frag.code} hole: ${err.message}`
      });
    }
  }

  /* ── 4) Furnitura ────────────────────────────────────────────── */
  const hardware = (frag.hardware || []).map(hw => ({
    fragment: frag.code,
    code: hw.code,
    qty: Math.max(1, Math.round(+hw.qty || 1)),
    id: hw.id,              // ERP furnitura ID (8 xona) — narx shu bo'yicha (TZ-HAQIQIY-MODULLAR A4)
    name: hw.name,
    unit: hw.unit
  }));

  /* ── 4b) Avtomatik furnitura — fragmentda ko'rsatilmagan bo'lsa ──
   * Petlya faqat ochiladigan ESHIKKA (tortma fasadiga emas, kupe eshigiga emas),
   * soni eshik balandligiga qarab; tutqich — har bir fasadga (eshik va tortma). */
  const fronts = parts.filter(p => p.slot === 'fasad' || /eshik|door|fasad|front/i.test(p.code));
  const isDrawer = (p) => /tortma|drawer|yashik|yashchik/i.test(p.code);
  const sliding = hardware.some(hw => /KUPE|SLID|RAIL|ROLIK/i.test(hw.code));
  /* Bazis'dan import qilingan modul (auto_hardware:false) — furnitura ro'yxati Bazis BOM'idan
     to'liq keladi; avtomatik petlya/ruchka qo'shilsa ikki marta sanaladi */
  const autoHw = frag.auto_hardware !== false;
  const doors = sliding || !autoHw ? [] : fronts.filter(p => !isDrawer(p));
  /* TS-… — eski fragmentlarda petlya shu kod bilan yozilgan (materials.json da nomi
     "Styajka TS-1730" — ziddiyat egasi bilan aniqlanadi); bor bo'lsa ikkinchi marta qo'shilmaydi */
  if (doors.length && !hardware.some(hw => /TS-|PET|petl|hinge/i.test(hw.code))) {
    const hingeQty = doors.reduce((s, p) => s + hingesForDoor(Math.max(p.finish_length, p.finish_width)), 0);
    hardware.push({ fragment: frag.code, code: 'PET-4', qty: hingeQty, _auto: true });
  }
  if (autoHw && fronts.length && !sliding && !hardware.some(hw => /RU-|ruchka|handle/i.test(hw.code))) {
    hardware.push({ fragment: frag.code, code: 'RU-128', qty: fronts.length, _auto: true });
  }

  /* ── 5) Statistika ───────────────────────────────────────────── */
  let areaMm2 = 0;
  for (const p of parts) areaMm2 += p.length * p.width;
  const holeCount = holes.reduce((s, x) => s + x.qty, 0);
  const edgeMeters = edges.reduce((s, x) => s + x.meters, 0);

  return {
    fragment: frag.code,
    w: +w, d: +d, h: +h,
    parts, edges, holes, hardware,
    stats: {
      part_count: parts.length,
      hole_count: holeCount,
      edge_meters: Math.round(edgeMeters * 1000) / 1000,
      area_m2: Math.round(areaMm2 / 1e6 * 1000) / 1000
    },
    errors
  };
}

/**
 * Butun loyihaning ishlab chiqarish tannarxi va mijoz narxi.
 *
 *   Tannarx = plita (kroydagi HAQIQIY varaqlar) + kromka + furnitura + teshiklar + ish haqi
 *   Mijoz narxi = tannarx × (1 + ustama)            — materials.pricing.markup_pct
 *
 * QOIDA: narxi bazada yo'q narsa 0 so'm bilan hisoblanadi va `missing` ro'yxatiga
 * tushadi — narx HECH QACHON o'ylab topilmaydi (smeta "to'liq emas" deb belgilanadi).
 *
 * @param {Array} cutlists — barcha modullar cutlist natijalari (doc.placements tartibida)
 * @param {Object} materials — materials.json (effektiv: tanlangan ERP varag'i bilan)
 * @param {Object} [opt] — { nestResult, markupPct, areaEstimate, furnituraById }
 *   furnituraById: ERP furnitura ID → {name, uzs, no_price} (hw.id bor bo'lsa narx shu yerdan)
 *   areaEstimate: kroysiz taxmin (katalog kartasi uchun) — varaq maydoni ÷ 0.85, butun varaqqa yaxlitlanmaydi
 * @returns {{lines, totalCost, clientTotal, perModule:[{cost, client}], missing:[], breakdown}}
 */
export function productionCost(cutlists, materials = {}, opt = {}) {
  const matByCode = {};
  (materials.panel_materials || []).forEach(m => { matByCode[m.code] = m; });
  const edgeByCode = {};
  (materials.edge_materials || []).forEach(m => {
    edgeByCode[m.code] = m;
    edgeByCode[String(m.code).replace(/\./g, '')] = m;
  });
  const hwByCode = {};
  (materials.hardware || []).forEach(m => { hwByCode[m.code] = m; });
  const holeByKind = {};
  (materials.hole_kinds || []).forEach(m => { holeByKind[m.code] = m; });
  const labor = materials.labor || {};
  const markup = opt.markupPct != null ? opt.markupPct
    : (materials.pricing && materials.pricing.markup_pct != null ? materials.pricing.markup_pct : 0.35);

  const missing = [];
  const noteMissing = (group, code, name) => {
    if (!missing.some(m => m.group === group && m.code === code)) missing.push({ group, code, name: name || code });
  };
  const edgePrice = (code) => {
    const m = edgeByCode[code] || edgeByCode[String(code).replace(/\./g, '')];
    if (m && m.price_m > 0) return m.price_m;
    noteMissing('Kromka', code, m && m.name);
    return 0;
  };
  /* ERP furnitura (8 xonali ID) — app.js yuklaydi; ID bor bo'lsa narx FAQAT shu yerdan */
  const furnById = opt.furnituraById || {};
  const hwUnitPrice = (hw) => {
    if (hw.id) { const f = furnById[hw.id]; return f && f.uzs > 0 && !f.no_price ? f.uzs : 0; }
    const m = hwByCode[hw.code];
    return m && m.price > 0 ? m.price : 0;
  };
  const hwName = (hw) => (hw.id && furnById[hw.id] && furnById[hw.id].name) || (hwByCode[hw.code] || {}).name || hw.name || hw.code;
  const hwPrice = (hw) => {
    const price = hwUnitPrice(hw);
    if (!(price > 0)) noteMissing('Furnitura', hw.code, hwName(hw));
    return price;
  };
  const holePrice = (kind) => {
    const m = holeByKind[kind] || holeByKind.drill;
    if (m && m.price > 0) return m.price;
    noteMissing('Xizmatlar', 'hole:' + kind, (holeByKind[kind] && holeByKind[kind].name) || ("Teshik burg'ilash (" + kind + ')'));
    return 0;
  };
  /* Varap maydoni — KROY bilan bir xil format tanlovi (kichik format katta
   * panellarga sig'masa katta format tanlanadi, aks holda narx buziladi). */
  const kerf = +(materials.kerf != null ? materials.kerf : KERF_DEFAULT);
  const trimL = +(materials.trimL != null ? materials.trimL : (materials.trim != null ? materials.trim : TRIM_DEFAULT));
  const trimW = +(materials.trimW != null ? materials.trimW : (materials.trim != null ? materials.trim : TRIM_DEFAULT));
  const sheetArea = (meta, ps) => {
    const s = pickSheetSize(meta && meta.sheets, (L, W) =>
      (ps || []).every(p => panelFitsSheet(p, L, W, kerf, trimL, trimW)));
    return s ? s[0] * s[1] : 2800 * 2070;
  };

  /* ── yig'ish ── */
  const groups = {};                        // material → detallar
  const areaByMat = {};                     // material → mm²
  const edgeAgg = {}, hwAgg = {}, holeAgg = {};
  let totalParts = 0;
  for (const cl of cutlists || []) {
    totalParts += (cl.parts || []).length;
    for (const p of cl.parts || []) {
      const mat = p.material || 'LDSP18';
      (groups[mat] = groups[mat] || []).push(p);
      areaByMat[mat] = (areaByMat[mat] || 0) + p.length * p.width;
    }
    for (const e of cl.edges || []) {
      /* narx material kodi bo'yicha — eski fragmentlarda bir kodga turli qalinlik yozilgan */
      const key = String(e.material).replace(/\./g, '');
      if (!edgeAgg[key]) edgeAgg[key] = { material: e.material, thickness: e.thickness, meters: 0, name: e.name };
      edgeAgg[key].meters += e.meters;
    }
    for (const hw of cl.hardware || []) {
      hwAgg[hw.code] = hwAgg[hw.code] || { code: hw.code, qty: 0, id: hw.id, name: hw.name, unit: hw.unit };
      hwAgg[hw.code].qty += hw.qty;
    }
    for (const hl of cl.holes || []) {
      holeAgg[hl.kind] = (holeAgg[hl.kind] || 0) + (hl.qty || 1);
    }
  }

  const lines = [];

  /* 1) Plita — kroy natijasidagi haqiqiy varaqlar (yoki taxmin) */
  let sheetCost = 0, totalSheetsCount = 0, totalPanelArea = 0;
  const sheetCostByMat = {};
  const mats = opt.nestResult && opt.nestResult.by_material && !opt.areaEstimate
    ? Object.keys(opt.nestResult.by_material) : Object.keys(groups);
  for (const mat of mats) {
    const meta = matByCode[mat] || { name: mat };
    const nm = opt.nestResult && opt.nestResult.by_material && opt.nestResult.by_material[mat];
    const unitPrice = (nm && nm.sheet_price) || meta.sheet_price || 0;
    if (!(unitPrice > 0)) noteMissing('Plita', mat, meta.name);
    let qty, amount, name, group;
    if (nm && !opt.areaEstimate) {
      qty = nm.sheet_count || 0;
      amount = qty * unitPrice;
      totalPanelArea += nm.stats ? nm.stats.used_area_m2 : 0;
      const lost = (nm.unplaced || []).length;
      if (lost) noteMissing('Kroy', mat, `${meta.name || mat}: ${lost} ta detal varaqqa sig'madi — tannarxga kirmagan`);
      name = `${meta.name || mat} (${qty} varaq, ${nm.stats ? nm.stats.utilization_pct : 0}% unumdorlik)`;
      group = 'Plita (Kroy)';
    } else {
      const area = (areaByMat[mat] || 0);
      const sheetsExact = area / (sheetArea(meta, groups[mat]) * 0.85);   // 85% — taxminiy kroy unumdorligi
      qty = Math.round(sheetsExact * 100) / 100;
      amount = Math.round(sheetsExact * unitPrice);
      totalPanelArea += area / 1e6;
      name = `${meta.name || mat} (~${qty} varaq, taxminiy)`;
      group = 'Plita (Taxminiy)';
    }
    sheetCost += amount;
    totalSheetsCount += qty;
    sheetCostByMat[mat] = amount;
    lines.push({ group, code: mat, name, qty, unit: 'varaq', unit_price: unitPrice, amount, no_price: !(unitPrice > 0) });
  }

  /* 2) Kromka */
  let edgeCost = 0;
  for (const k in edgeAgg) {
    const a = edgeAgg[k];
    const price = edgePrice(a.material);
    const amount = Math.round(a.meters * price);
    edgeCost += amount;
    lines.push({
      group: 'Kromka', code: a.material,
      name: (edgeByCode[a.material] || {}).name || a.name || a.material,
      qty: Math.round(a.meters * 100) / 100, unit: 'm', unit_price: price, amount, no_price: !(price > 0)
    });
  }

  /* 3) Furnitura */
  let hwCost = 0;
  for (const k in hwAgg) {
    const a = hwAgg[k];
    const meta = hwByCode[a.code] || {};
    const price = hwPrice(a);
    const amount = price * a.qty;
    hwCost += amount;
    lines.push({
      group: 'Furnitura', code: a.code, id: a.id, name: hwName(a),
      qty: a.qty, unit: meta.unit || a.unit || 'dona', unit_price: price, amount, no_price: !(price > 0)
    });
  }

  /* 4) Teshik burg'ilash — turi bo'yicha (petlya, shkant, kam, oddiy) */
  let holeCost = 0, totalHoles = 0;
  for (const kind in holeAgg) {
    const qty = holeAgg[kind];
    const price = holePrice(kind);
    const amount = qty * price;
    holeCost += amount;
    totalHoles += qty;
    lines.push({
      group: 'Xizmatlar', code: 'hole:' + kind,
      name: `${((holeByKind[kind] || holeByKind.drill || {}).name) || "Teshik burg'ilash"} (${qty} dona)`,
      qty, unit: 'dona', unit_price: price, amount, no_price: !(price > 0)
    });
  }

  /* 5) Sex ish haqi (arralash + yig'ish) — materials.labor (taxminiy stavka) */
  const pieceLabor = totalParts * (labor.panel_per_piece || 0);
  const fragLabor = (cutlists || []).length * (labor.per_fragment_min || 0);
  const laborCost = Math.max(pieceLabor, fragLabor);
  if (!(labor.panel_per_piece > 0 || labor.per_fragment_min > 0) && totalParts) noteMissing('Ish haqi', 'labor', 'Ish haqi stavkasi');
  if (laborCost > 0) {
    lines.push({
      group: 'Ish haqi', code: 'labor',
      name: `Arralash, kromka urish va sex yig'ish (${totalParts} detal)`,
      qty: totalParts, unit: 'detal', unit_price: Math.round(laborCost / (totalParts || 1)), amount: laborCost
    });
  }

  /* Jami */
  const totalCost = sheetCost + edgeCost + hwCost + holeCost + laborCost;
  const clientTotal = Math.round(totalCost * (1 + markup));

  /* Modullar bo'yicha taqsimot (kotirovka satrlari): plita — modul detallari maydoni
     ulushi bo'yicha, ish haqi — detal soni ulushi bo'yicha; qolgani — modulning o'zidan. */
  const perModule = (cutlists || []).map(cl => {
    let cost = 0;
    for (const p of cl.parts || []) {
      const mat = p.material || 'LDSP18';
      if (areaByMat[mat] > 0) cost += (p.length * p.width) / areaByMat[mat] * (sheetCostByMat[mat] || 0);
    }
    for (const e of cl.edges || []) cost += e.meters * (edgeByCode[e.material] || edgeByCode[String(e.material).replace(/\./g, '')] || {}).price_m || 0;
    for (const hw of cl.hardware || []) cost += hw.qty * hwUnitPrice(hw);
    for (const hl of cl.holes || []) cost += (hl.qty || 1) * (((holeByKind[hl.kind] || holeByKind.drill || {}).price) || 0);
    if (totalParts) cost += laborCost * (cl.parts || []).length / totalParts;
    return { cost: Math.round(cost), client: Math.round(cost * (1 + markup)) };
  });
  /* yaxlitlash qoldig'i oxirgi modulga — satrlar yig'indisi jami bilan aynan teng */
  if (perModule.length) {
    const diff = clientTotal - perModule.reduce((s, m) => s + m.client, 0);
    perModule[perModule.length - 1].client += diff;
  }

  const totalEdgeMeters = Math.round(Object.values(edgeAgg).reduce((s, x) => s + x.meters, 0) * 100) / 100;
  const totalHwCount = Object.values(hwAgg).reduce((s, x) => s + x.qty, 0);

  return {
    by_material: groups,
    lines,
    totalCost,
    clientTotal,
    perModule,
    missing,
    sheetCost,
    edgeCost,
    hwCost,
    holeCost,
    laborCost,
    totalWorkshopCost: totalCost,
    suggestedClientPrice: clientTotal,
    margin: 1 + markup,
    markupPct: markup,
    breakdown: {
      sheetCost,
      edgeCost,
      hwCost,
      holeCost,
      laborCost,
      markupAmount: clientTotal - totalCost,
      sheetsCount: totalSheetsCount,
      panelAreaM2: Math.round(totalPanelArea * 1000) / 1000,
      edgeMeters: totalEdgeMeters,
      hwCount: totalHwCount,
      holeCount: totalHoles
    },
    // Orqaga moslik uchun:
    total: totalCost,
    _edgeAgg: edgeAgg,
    _hwAgg: hwAgg
  };
}
