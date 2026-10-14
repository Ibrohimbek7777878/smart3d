/* Smart3D engine/cutlist.js — DETALLAR (razdelka) + ISHLAB CHIQARISH XARAJATI.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI:
 *   - Xavfsiz AST parser (expr.js) orqali hisoblash: "eval" yo'q!
 *   - Shartli ifodalar: "w > 600 ? 2 : 1", "w > 600 ? (w/2 - 3) : (w - 4)"
 *   - Material qalinligi 't' o'zgaruvchisi to'liq qo'llab-quvvatlanadi: "w - 2 * t"
 *   - Ko'p slotlilik (slots.js): korpus, fasad, orqa, polka alohida materiallarda
 *   - Yog'och teksturasi yo'nalishi (texture: uzunlik / en / erkin)
 *   - To'liq tannarx: Varaqlar (kroy) + Kromka + Furnitura + Teshiklar + Ish haqi
 */

import { evalFormula, roundMm } from './expr.js';
import { resolveSlots } from './slots.js';

/** Orqaga moslik uchun evalExpr (ichkarida xavfsiz evalFormula ishlaydi). */
export function evalExpr(expr, vars) {
  return evalFormula(expr, vars);
}

/** Butun songa yaxlitlash (ishlab chiqarishda kasr yo'q). */
export function rInt(x) {
  return roundMm(x);
}

/**
 * Fragment detallarini hisoblaydi.
 *
 * @param {Object} frag — fragments.json elementi
 * @param {number} w, d, h — joylashuv o'lchamlari (mm)
 * @param {Object} materials — materials.json
 * @param {Object} [opt] — { projectSlots, placementSlots }
 * @returns {{parts:[], edges:[], holes:[], hardware:[], stats:{}, errors:[]}}
 */
export function cutlist(frag, w, d, h, materials = {}, opt = {}) {
  const errors = [];
  const slotResolver = resolveSlots(opt.projectSlots, opt.placementSlots, materials);

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

  /* ── 1) Detallar ─────────────────────────────────────────────── */
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

      for (let i = 0; i < qty; i++) {
        parts.push({
          fragment: frag.code,
          code: p.code,
          ref: p.code + '#' + (i + 1),
          length: rInt(len),
          width: rInt(wid),
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

  /* ── 2) Kromka: qirra uzunliklari (mm → m) ──────────────────── */
  const edges = [];
  const partMap = {};
  for (const p of parts) (partMap[p.code] = partMap[p.code] || []).push(p);

  for (const e of frag.edge || []) {
    try {
      const ps = partMap[e.code] || [];
      if (!ps.length) continue;

      // Qaysi kromka materiali?
      const isFasad = /eshik|fasad|front/i.test(e.code);
      const defaultEdgeSlot = isFasad ? 'kromka_fasad' : 'kromka_korpus';
      const edgeMeta = slotResolver.getEdge(e.slot || defaultEdgeSlot);

      // Qirra tomonlari: F=old (len), B=orqa (len), L=chap (width), R=o'ng (width)
      let mPerPiece = 0;
      for (const side of e.sides || []) {
        if (side === 'F' || side === 'B') mPerPiece += ps[0].length;
        else mPerPiece += ps[0].width;
      }

      const qty = Math.max(1, Math.round(+e.qty || ps.length));
      const totalM = (mPerPiece / 1000) * qty;

      edges.push({
        fragment: frag.code,
        code: e.code,
        material: edgeMeta.code || e.material || 'PVC04',
        name: edgeMeta.name,
        thickness: edgeMeta.thickness || e.thickness || 2,
        sides: e.sides || [],
        qty,
        meters: Math.round(totalM * 1000) / 1000
      });
    } catch (err) {
      errors.push({
        code: 'E_BAD_EXPR',
        message: `${frag.code} edge.${e.code}: ${err.message}`
      });
    }
  }

  /* ── 3) Teshiklar (burg'ilash) ──────────────────────────────── */
  const holes = [];
  for (const hl of frag.holes || []) {
    try {
      const x = evalFormula(hl.x, baseVars);
      const y = evalFormula(hl.y, baseVars);
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
    qty: Math.max(1, Math.round(+hw.qty || 1))
  }));

  /* ── 4b) Avtomatik furnitura — agar eshiklar bo'lsa ──────────── */
  const doorParts = parts.filter(p => /eshik|door|fasad/i.test(p.code));
  if (doorParts.length) {
    const hingeQty = doorParts.length * 2; // har eshikka kamida 2 ta petlya
    const handleQty = doorParts.length;    // har eshikka 1 ta ruchka
    const hasHinge = hardware.some(hw => /TS-|petli|hinge/i.test(hw.code));
    const hasHandle = hardware.some(hw => /RU-|ruchka|handle/i.test(hw.code));
    if (!hasHinge) hardware.push({ fragment: frag.code, code: 'TS-1730', qty: hingeQty, _auto: true });
    if (!hasHandle) hardware.push({ fragment: frag.code, code: 'RU-128', qty: handleQty, _auto: true });
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
 * Butun loyihaning haqiqiy ishlab chiqarish tannarxi va xarajatini hisoblaydi:
 * Plita (kroy natijasidagi haqiqiy varaqlar) + Kromka + Furnitura + Teshiklar + Ish haqi.
 *
 * @param {Array} cutlists — barcha modullar cutlist natijalari
 * @param {Object} materials — materials.json
 * @param {Object} [opt] — { nestResult, markupPct }
 * @returns {{lines:[], totalCost:number, clientTotal:number, breakdown:{}}}
 */
export function productionCost(cutlists, materials = {}, opt = {}) {
  const matByCode = {};
  (materials.panel_materials || []).forEach(m => { matByCode[m.code] = m; });
  const edgeByCode = {};
  (materials.edge_materials || []).forEach(m => { edgeByCode[m.code] = m; });
  const hwByCode = {};
  (materials.hardware || []).forEach(m => { hwByCode[m.code] = m; });
  const holeByKind = {};
  (materials.hole_kinds || []).forEach(m => { holeByKind[m.code] = m; });
  const labor = materials.labor || { panel_per_piece: 12000, per_fragment_min: 40000 };

  const groups = {}; // material → panel[]
  const edgeAgg = {}, hwAgg = {};
  let totalHoles = 0;
  let totalParts = 0;

  for (const cl of cutlists || []) {
    totalParts += (cl.parts || []).length;
    for (const p of cl.parts || []) {
      const mat = p.material || 'LDSP18';
      (groups[mat] = groups[mat] || []).push(p);
    }
    for (const e of cl.edges || []) {
      const key = e.material + '@' + e.thickness;
      if (!edgeAgg[key]) edgeAgg[key] = { material: e.material, thickness: e.thickness, meters: 0 };
      edgeAgg[key].meters += e.meters;
    }
    for (const hw of cl.hardware || []) {
      hwAgg[hw.code] = hwAgg[hw.code] || { code: hw.code, qty: 0 };
      hwAgg[hw.code].qty += hw.qty;
    }
    for (const hl of cl.holes || []) {
      totalHoles += (hl.qty || 1);
    }
  }

  const lines = [];
  let sheetCost = 0;
  let totalSheetsCount = 0;
  let totalPanelArea = 0;

  // 1) Plita materiallari: agar kroy (nestResult) berilgan bo'lsa — haqiqiy varaqlar soni!
  if (opt.nestResult && opt.nestResult.by_material) {
    for (const mat in opt.nestResult.by_material) {
      const nm = opt.nestResult.by_material[mat];
      const meta = matByCode[mat] || { name: mat, sheet_price: nm.sheet_price || 500000 };
      const sheetsCount = nm.sheet_count || 0;
      const unitPrice = nm.sheet_price || meta.sheet_price || 500000;
      const amount = sheetsCount * unitPrice;
      sheetCost += amount;
      totalSheetsCount += sheetsCount;
      totalPanelArea += (nm.stats ? nm.stats.used_area_m2 : 0);
      lines.push({
        group: 'Plita (Kroy)',
        name: `${meta.name || mat} (${sheetsCount} varaq, ${nm.stats ? nm.stats.utilization_pct : 0}% unumdorlik)`,
        qty: sheetsCount,
        unit: 'varaq',
        unit_price: unitPrice,
        amount
      });
    }
  } else {
    // Kroy hali o'tkazilmagan bo'lsa — sof kvadrat metri bo'yicha hisob
    for (const mat in groups) {
      const ps = groups[mat];
      const area = ps.reduce((s, x) => s + x.length * x.width, 0) / 1e6;
      const meta = matByCode[mat] || { name: mat, sheet_price: 500000, sheets: [[2800, 2070]] };
      const sheetArea = ((meta.sheets && meta.sheets[0] && meta.sheets[0][0] * meta.sheets[0][1]) || (2800 * 2070)) / 1e6;
      const estSheets = Math.ceil(area / (sheetArea * 0.85)); // 85% taxminiy kroy
      const amount = estSheets * (meta.sheet_price || 500000);
      sheetCost += amount;
      totalSheetsCount += estSheets;
      totalPanelArea += area;
      lines.push({
        group: 'Plita (Taxminiy)',
        name: `${meta.name || mat} (~${estSheets} varaq)`,
        qty: estSheets,
        unit: 'varaq',
        unit_price: meta.sheet_price || 500000,
        amount
      });
    }
  }

  // 2) Kromka
  let edgeCost = 0;
  for (const k in edgeAgg) {
    const a = edgeAgg[k];
    const price = (edgeByCode[a.material] || { price_m: 1500 }).price_m;
    const amount = Math.round(a.meters * price);
    edgeCost += amount;
    lines.push({
      group: 'Kromka',
      name: (edgeByCode[a.material] || {}).name || a.material,
      qty: Math.round(a.meters * 100) / 100,
      unit: 'm',
      unit_price: price,
      amount
    });
  }

  // 3) Furnitura
  let hwCost = 0;
  for (const k in hwAgg) {
    const a = hwAgg[k];
    const meta = hwByCode[a.code] || { name: a.code, price: 5000 };
    const price = meta.price > 0 ? meta.price : 5000;
    const amount = price * a.qty;
    hwCost += amount;
    lines.push({
      group: 'Furnitura',
      name: meta.name || a.code,
      qty: a.qty,
      unit: meta.unit || 'dona',
      unit_price: price,
      amount
    });
  }

  // 4) Teshik burg'ilash xizmati
  const holeUnitPrice = (holeByKind['drill'] || { price: 300 }).price;
  const holeCost = totalHoles * holeUnitPrice;
  if (totalHoles > 0) {
    lines.push({
      group: 'Xizmatlar',
      name: `Teshik burg'ilash (${totalHoles} dona)`,
      qty: totalHoles,
      unit: 'dona',
      unit_price: holeUnitPrice,
      amount: holeCost
    });
  }

  // 5) Sex ish haqi (arralash + yig'ish)
  const pieceLabor = totalParts * (labor.panel_per_piece || 12000);
  const fragLabor = (cutlists || []).length * (labor.per_fragment_min || 40000);
  const laborCost = Math.max(pieceLabor, fragLabor);
  if (laborCost > 0) {
    lines.push({
      group: 'Ish haqi',
      name: `Arralash, kromka urish va sex yig'ish (${totalParts} detal)`,
      qty: totalParts,
      unit: 'detal',
      unit_price: Math.round(laborCost / (totalParts || 1)),
      amount: laborCost
    });
  }

  // Jami Tannarx (Cost Price)
  const totalCost = sheetCost + edgeCost + hwCost + holeCost + laborCost;

  // Mijoz narxi (Client Price) — standart 35% ustama marja
  const markup = opt.markupPct != null ? opt.markupPct : 0.35;
  const clientTotal = Math.round(totalCost * (1 + markup));

  const totalEdgeMeters = Math.round(Object.values(edgeAgg).reduce((s, x) => s + x.meters, 0) * 100) / 100;
  const totalHwCount = Object.values(hwAgg).reduce((s, x) => s + x.qty, 0);

  return {
    by_material: groups,
    lines,
    totalCost,
    clientTotal,
    sheetCost,
    edgeCost,
    hwCost,
    holeCost,
    laborCost,
    totalWorkshopCost: totalCost,
    suggestedClientPrice: clientTotal,
    margin: 1 + markup,
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
