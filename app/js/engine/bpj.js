/* Smart3D engine/bpj.js — BPJ (BazisUniversalExport 4.2) WRITER.
 *
 * Manba: mebelcity-platform/1.bpj (haqiqiy Bazis eksporti, 682 KB) +
 * widget_bazis/bpj_parser.py (qabul qiluvchi tomon) +
 * widget_bazis/static/widget_bazis/viewer/js/{svg.js,file-io.js,pricing.js}
 * (K3: objects[].holes sxemasi — {x,y,diameter,depth,face} — viewer'dan olindi:
 *  svg.js H.x/H.y kontur kadrida, file-io.js face = front|back|edge-*).
 *
 * Format (tekshirilgan real fayldan):
 *   { version:"4.2", script:"BazisUniversalExport", meta, config,
 *     materials[], edgeBands[], furnitures[], blocks[], bom[], objects[],
 *     exports:{giblab, csv, smetaHtml} }
 *
 * K3 qarorlari (real fayl tekshiruvi bilan):
 *   - Panel materiali/qalinligi — DETAL darajasida (cutlist), modul emas.
 *     Real 1.bpj: 3 ta material (ЛДСП/Каштан/ЛХДФ 3мм) — orqa devor alohida.
 *   - bom dl/dw = KESIM o'lchami (real faylda panel bitta o'lchamda);
 *     tayyor o'lcham userProps.smart3d_finish da saqlanadi.
 *   - butts length = panelning o'z qirrasi (= dl/dw, real faylda: 610 = dl).
 *   - position = panelning global bbox min burchagi (hamma panel bitta
 *     nuqtada emas); transform.origin = panel markazi; bbox = haqiqiy 8 burchak.
 *   - config.sheetL/W = eng kichik (barcha panellar sig'adigan) varaq formati.
 *
 * Encoder: fayl UTF-8 (BOM'siz) — Bazis ism/litrallari lotin (ASCII-safe).
 * Parser (bpj_parser.py) UTF-8/UTF-16/cp1251 ni avtomatik aniqlaydi.
 */

import { evalFormula } from './expr.js';
import { cutlist } from './cutlist.js';
import { getModulePanels } from './assembler.js';
import { panelFitsSheet, pickSheetSize, KERF_DEFAULT, TRIM_DEFAULT } from './nesting.js';

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r4 = (x) => Math.round(x * 10000) / 10000;

/** Butta (qirra) → elemIndex: 0=pastki(dl) 1=o'ng(dw) 2=yuqori(dl) 3=chap(dw). */
const SIDE_TO_ELEM = { F: 0, R: 1, B: 2, L: 3 };

/**
 * Smart3D doc → BPJ 4.2 ob'ekti.
 * @param {Object} doc        — {room, placements}
 * @param {Object} catalog    — {code: frag}
 * @param {Object} materials  — materials.json (panel_materials thickness)
 * @param {Object} opts       — {modelName, materialCode, cutlists, cutlistOpt}
 * @returns {Object} bpj
 */
export function buildBPJ(doc, catalog, materials, opts = {}) {
  const modelName = opts.modelName || 'Smart3D loyiha';
  const curCode = opts.materialCode || 'MDF16';
  const matMeta = (materials.panel_materials || []).find(m => m.code === curCode) ||
                  { name: curCode, thickness: 16 };
  const matName = matMeta.name;   // "MDF 16mm" — materials.json da allaqachon qalinlik bilan
  const thickness = matMeta.thickness || 16;
  /* kromka nomlari — materials.json edge_materials dan (kod normalizatsiya bilan) */
  const edgeNames = {};
  for (const em of materials.edge_materials || []) {
    edgeNames[String(em.code)] = em.name;
    edgeNames[String(em.code).replace(/\./g, '')] = em.name;  // PVC0.4 → PVC04
  }
  edgeNames['PVC04'] = 'Кромка 0,4';
  edgeNames['PVC0.4'] = 'Кромка 0,4';
  edgeNames['PVC2'] = 'Кромка 2';
  edgeNames['REHAU2'] = 'Кромка Rehau 2';
  edgeNames['PROF-AL'] = 'Профиль алюминиевый';

  /* material kod → meta (cutlist material maydonlari uchun) */
  const matByCode = {};
  for (const m of materials.panel_materials || []) matByCode[m.code] = m;

  /* app.js hisoblagan cutlist (slot/narx bilan mos) — bo'lmasa shu yerda qayta hisoblaymiz */
  const clByPlacement = new Map();
  for (const cl of opts.cutlists || []) if (cl && cl.placementId != null) clByPlacement.set(cl.placementId, cl);
  const fallbackCutlist = (frag, w, d, h) => {
    try { return cutlist(frag, w, d, h, materials, opts.cutlistOpt || {}); }
    catch (e) { return null; }
  };

  /* ── material guruhlari (detal materiali bo'yicha) ── */
  const matAgg = {};       // name → {name, thickness, totalArea, panels[]}
  const edgeAgg = {};      // material@t → {...}
  const bomRows = [];      // agregatsiya: frag+size+material → row
  const bomIdx = {};
  const objects = [];
  const furnitures = [];
  const blocks = [];
  const warnings = [];
  let panelId = 0, totalArea = 0, totalPanels = 0, ovalPanels = 0;
  let unpositioned = 0;

  for (const p of doc.placements || []) {
    const frag = catalog[p.frg];
    if (!frag) continue;
    const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
    const qty = Math.max(1, Math.round(+p.qty || 1));
    const rot = ((+p.rot || 0) % 360 + 360) % 360;
    const rad = rot * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const ox = +p.x || 0, oy = +p.y || 0, oz = +p.z || 0;

    const cl = clByPlacement.get(p.id) || fallbackCutlist(frag, w, d, h);
    const defs = (cl && cl.parts && cl.parts.length)
      ? defsFromCutlist(cl, matByCode, matName, thickness)
      : defsFromFormulas(frag, w, d, h, matByCode, matName, thickness);
    if (!defs.length) continue;

    /* fallback (3D modelda yo'q panel) uchun — fasad/orqa soni (oldinga/orqaga joylash) */
    const fbTotals = { fasad: 0, orqa: 0 };
    for (const d of defs) if (fbTotals[d.slot] != null) fbTotals[d.slot]++;

    /* 3D panel modeli (objexport/glbexport bilan bir xil ramka) — position/boundingBox uchun */
    let asmBase = [];
    try {
      const asm = getModulePanels(frag, w, d, h, { thickness: defs[0].thickness || thickness });
      asmBase = (asm && asm.panels) || [];
    } catch (e) {
      warnings.push(`${p.id}: 3D panel modeli qurilmadi (${e.message}) — position navbatma-navbat`);
    }

    for (let n = 0; n < qty; n++) {
      const fno = furnitures.length + 1;
      furnitures.push({
        no: fno, name: frag.name || p.frg, artPos: p.frg, count: 1,
        userProps: { smart3d_id: p.id, w, d, h, x: ox, y: oy, z: oz, rot }
      });

      const blockPanelIds = [];
      const pool = asmBase.slice();       // har bir modul nusxasi uchun yangi
      const remaining = new Map();        // joylashmagan detallar kodlari (band emaslik nazorati)
      for (const d of defs) remaining.set(d.code, (remaining.get(d.code) || 0) + 1);
      let unmatched = 0, matched = 0, zIdx = 0;
      const fbCount = { fasad: 0, orqa: 0 };
      const usedPos = new Set();          // bir modul ichida bir xil nuqta taqiqlanadi

      /* — har bir panel (cutlist bo'yicha, qty kengaytirilgan) — */
      for (const def of defs) {
        remaining.set(def.code, (remaining.get(def.code) || 1) - 1);
        panelId++;
        totalPanels++;
        const cutL = def.cutL, cutW = def.cutW, th = def.thickness;
        const mat = def.material;
        totalArea += (cutL * cutW) / 1e6;
        blockPanelIds.push(panelId);

        /* materials agregatsiyasi (detal materiali bo'yicha) */
        const ma = matAgg[mat] = matAgg[mat] || { name: mat, thickness: th, totalArea: 0, panels: [] };
        ma.totalArea += (cutL * cutW) / 1e6;
        ma.panels.push(panelId);

        /* butts — fragment.edge bo'yicha, uzunlik = panelning o'z qirrasi (dl/dw) */
        const butts = [];
        for (const e of frag.edge || []) {
          if (e.code !== def.code) continue;
          for (const side of e.sides || []) {
            const ei = SIDE_TO_ELEM[side];
            if (ei == null) continue;
            butts.push({
              elemIndex: ei,
              material: edgeNames[e.material] || e.material,
              thickness: +(e.thickness || 2),
              width: -1,
              length: (ei === 0 || ei === 2) ? Math.round(cutL) : Math.round(cutW)
            });
          }
        }
        for (const b of butts) {
          const key = b.material + '@' + b.thickness;
          const ea = edgeAgg[key] = edgeAgg[key] || {
            material: b.material, thickness: b.thickness, width: -1, totalLength: 0, count: 0
          };
          ea.totalLength += b.length / 1000;   // metr (real fayldagidek)
          ea.count++;
        }

        /* teshiklar — cutlist konvensiyasi (x = F chetdan EN bo'ylab, y = L chetdan
         * UZUNLIK bo'ylab) → BPJ kontur kadrida (X = dl = uzunlik, Y = dw = en) */
        const holes = def.holes
          .filter(hl => hl.kind !== 'cutout' && hl.side !== 'T')   /* F2: moyka kesimi — BPJ circle emas; torets — sxemada yo'q */
          .map(hl => ({
            x: Math.min(Math.round(cutL), Math.max(0, Math.round(hl.y))),
            y: Math.min(Math.round(cutW), Math.max(0, Math.round(hl.x))),
            diameter: +hl.dia || 5,
            depth: +hl.depth || 13,
            face: hl.side === 'F' ? 'front' : hl.side === 'B' ? 'back' : (hl.side || '')
          }));

        /* bom agregatsiyasi (bir xil detal+kesim+material → bitta qator) */
        const key = def.code + '|' + cutL + '|' + cutW + '|' + mat;
        let row = bomIdx[key];
        if (!row) {
          row = bomIdx[key] = {
            no: bomRows.length + 1,
            name: def.code,
            artPos: p.frg,
            dl: Math.round(cutL), dw: Math.round(cutW), dp: th,
            material: mat, textureDir: 0, isOval: false,
            perimeter: Math.round(2 * (cutL + cutW)),
            count: 0,
            area: r3((cutL * cutW) / 1e6),
            totalArea: 0, totalPazLen: 0,
            butts, buttsStr: buttsStr(butts),
            holesCount: 0
          };
          bomRows.push(row);
        }
        row.count++;
        row.holesCount += holes.length;
        row.totalArea = r3(row.area * row.count);

        /* joylashuv — 3D modeldan mos paneldan (yo'q bo'lsa navbatma-navbat) */
        const q = takePanel(pool, def, remaining);
        let cx, cy, cz, ex, ey, ez;
        if (q) {
          matched++;
          /* objexport ramkasi: world = placement origin + R·(modul markazi + lokal) */
          cx = w / 2 + q.x; cy = d / 2 + q.y; cz = h / 2 + q.z;
          ex = Math.abs(q.w) / 2; ey = Math.abs(q.d) / 2; ez = Math.abs(q.h) / 2;
        } else {
          /* 3D modelda bunda panel yo'q (mas. shift/toka — assembler'da modellashtirilmagan):
           * fasad → oldinga (X bo'ylab), orqa → orqaga, qolganlari → Z bo'ylab navbat */
          unpositioned++;
          unmatched++;
          const slot = def.slot || '';
          if ((slot === 'fasad' || slot === 'orqa') && fbTotals[slot]) {
            fbCount[slot]++;
            cx = (w * fbCount[slot]) / (fbTotals[slot] + 1);
            cy = slot === 'fasad' ? (d / 2 + th / 2) : (-d / 2 + th / 2 + 8);
            cz = h / 2;
          } else {
            cx = w / 2; cy = d / 2;
            cz = h * (zIdx++ + 0.5) / Math.max(1, defs.length);
          }
          ex = cutL / 2; ey = cutW / 2; ez = th / 2;
        }
        /* bir xil nuqta bo'lmasligi kerak (kollarizatsiya → z bo'ylab 5mm suramiz) */
        let wx = 0, wy = 0, wz = 0, pkey = '';
        for (let t = 0; t < 60; t++) {
          wx = ox + cx * cs - cy * sn;
          wy = oy + cx * sn + cy * cs;
          wz = oz + cz;
          pkey = Math.round(wx) + ':' + Math.round(wy) + ':' + Math.round(wz);
          if (!usedPos.has(pkey)) break;
          cz += 5;
        }
        usedPos.add(pkey);

        /* objects — haqiqiy panel (contour + transform bilan) */
        const dl = Math.round(cutL), dw = Math.round(cutW);
        const bbox = boxGlobal(wx, wy, wz, ex, ey, ez, cs, sn);
        objects.push({
          id: panelId,
          name: def.name,
          artPos: p.frg,
          isOval: false,
          area: r3((cutL * cutW) / 1e6),
          dimensions: { dl, dw, dp: th },
          perimeter: Math.round(2 * (dl + dw)),
          material: { name: mat, textureDir: 0 },
          materialDetails: { name: mat, thickness: th, sheetWidth: 0 },
          plastics: [],
          position: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          transform: {
            origin: { x: Math.round(wx), y: Math.round(wy), z: Math.round(wz) },
            axisX: { x: 1, y: 0, z: 0 },
            axisY: { x: 0, y: 0, z: -1 },
            axisZ: { x: 0, y: 1, z: 0 },
            source: 'ToGlobal'
          },
          ownerChain: [frag.name || p.frg, 'Model'],
          contour: {
            outer: [
              { type: 'line', x1: 0, y1: 0, x2: dl, y2: 0, len: dl },
              { type: 'line', x1: dl, y1: 0, x2: dl, y2: dw, len: dw },
              { type: 'line', x1: dl, y1: dw, x2: 0, y2: dw, len: dl },
              { type: 'line', x1: 0, y1: dw, x2: 0, y2: 0, len: dw }
            ],
            inner: [],
            perimeter: Math.round(2 * (dl + dw))
          },
          butts,
          holes,
          cuts: [],
          boundingBox: {
            global: bbox,
            local: { min: { x: 0, y: 0, z: 0 }, max: { x: dl, y: dw, z: th } }
          },
          userProps: {
            smart3d_placement: p.id,
            smart3d_holes: holes.length,
            smart3d_finish: { l: def.finL, w: def.finW }
          }
        });
      }

      if (unmatched && n === qty - 1) {
        warnings.push(`${p.id}: ${matched}/${defs.length} panel 3D modeldan joy oldi — qolganlari navbat`);
      }

      blocks.push({
        path: (frag.name || p.frg) + ' > Model',
        name: frag.name || p.frg,
        depth: 0,
        panelCount: blockPanelIds.length,
        panelIds: blockPanelIds
      });
    }
  }

  const materialsList = Object.values(matAgg).map(m => ({
    name: m.name, thickness: m.thickness, totalArea: r4(m.totalArea),
    count: m.panels.length, panels: m.panels
  }));
  const edgeBands = Object.values(edgeAgg).map(e => ({
    material: e.material, thickness: e.thickness, width: e.width,
    totalLength: r3(e.totalLength), count: e.count
  }));

  /* varaq formati — eng kichik (barcha panellar sig'adigan) format,
   * aks holda eng kattasi. Bir nechta material → ulardan eng kattasi. */
  let needL = 0, needW = 0;
  for (const o of objects) {
    if (o.dimensions.dl > needL) needL = o.dimensions.dl;
    if (o.dimensions.dw > needW) needW = o.dimensions.dw;
  }
  let sheetL = 0, sheetW = 0;
  for (const m of materialsList) {
    const meta = (materials.panel_materials || []).find(x => x.name === m.name);
    if (!meta || !meta.sheets || !meta.sheets.length) continue;
    const ps = pickSheetSize(meta.sheets, (a, b) =>
      panelFitsSheet({ length: needL, width: needW }, a, b, KERF_DEFAULT, TRIM_DEFAULT, TRIM_DEFAULT));
    if (ps[0] > sheetL) sheetL = ps[0];
    if (ps[1] > sheetW) sheetW = ps[1];
  }
  if (!sheetL) {
    sheetL = matMeta.sheets ? matMeta.sheets[0][0] : 2800;
    sheetW = matMeta.sheets ? matMeta.sheets[0][1] : 2070;
  }
  if (needL > sheetL || needW > sheetW) {
    warnings.push(`eng katta panel ${needL}×${needW} mm tanlangan varaq ${sheetL}×${sheetW} ga sig'maydi`);
  }

  const csv = buildCSV(bomRows);
  const bpj = {
    version: '4.2',
    script: 'BazisUniversalExport',
    meta: {
      modelName,
      exportDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      exporterVersion: '4.5',
      bazisApiVersion: 1001,
      totalPanels,
      totalOvalPanels: ovalPanels,
      totalMaterials: materialsList.length,
      totalBOMRows: bomRows.length,
      totalBlocks: blocks.length,
      totalArea: r4(totalArea),
      totalPazLengthMm: 0
    },
    config: { precision: 2, boreMinDiam: 1.5, sheetL, sheetW, union: true },
    materials: materialsList,
    edgeBands,
    furnitures,
    blocks,
    bom: bomRows,
    objects,
    exports: {
      giblab: buildGiblab(modelName, bomRows),
      csv,
      smetaHtml: buildSmetaHtml(modelName, bomRows, totalArea)
    },
    smart3d: {
      version: 2,
      note: 'Smart3D dan yaratilgan. objects[].holes: {x,y,diameter,depth,face} — x/dl bo\'ylab, y/dw bo\'ylab (Bazis viewer sxemasi).',
      warnings,
      unpositioned,
      room: doc.room,
      placements: (doc.placements || []).map(p => ({
        id: p.id, frg: p.frg, x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, rot: p.rot || 0
      }))
    }
  };
  return bpj;
}

/* ── Yordamchilar ─────────────────────────────────────────────── */

function WOOD_MAT(frag) { return /^(LDSP|MDF|HDF|OSB)/.test(frag.material_code || ''); }

function buttsStr(butts) {
  return butts.map(b => `${b.thickness}t/${b.width}w (${b.material})`).join('; ');
}

/**
 * cutlist → panel ta'riflari (detal bitta-bitta, qty allaqachon kengaytirilgan).
 * Material/qalinlik — DETAL darajasida (slotResolver natijasi).
 */
function defsFromCutlist(cl, matByCode, fallbackMat, fallbackTh) {
  const countByCode = {};
  for (const p of cl.parts || []) countByCode[p.code] = (countByCode[p.code] || 0) + 1;
  const holesByPart = {};
  for (const hl of cl.holes || []) (holesByPart[hl.part] = holesByPart[hl.part] || []).push(hl);
  const seen = {};
  return (cl.parts || []).map(p => {
    const idx = (seen[p.code] = (seen[p.code] || 0) + 1);
    const meta = matByCode[p.material];
    return {
      code: p.code,
      name: p.code + (countByCode[p.code] > 1 ? '_' + idx : ''),
      material: (meta && meta.name) || p.material || fallbackMat,
      materialCode: p.material,
      thickness: +p.thickness || (meta && meta.thickness) || fallbackTh,
      cutL: Math.max(1, Math.round(+p.length || 1)),
      cutW: Math.max(1, Math.round(+p.width || 1)),
      finL: Math.round(+p.finish_length || +p.length || 1),
      finW: Math.round(+p.finish_width || +p.width || 1),
      slot: p.slot,
      texture: p.texture,
      holes: holesByPart[p.code] || []
    };
  });
}

/**
 * cutlist ishlamasa — fragments.json formulalari bo'yicha (eski yo'l).
 * Material modul darajasida (WOOD_MAT qoidasi).
 */
function defsFromFormulas(frag, w, d, h, matByCode, matName, fallbackTh) {
  const holesByPart = {};
  for (const hl of frag.holes || []) {
    try {
      (holesByPart[hl.part] = holesByPart[hl.part] || []).push({
        x: Math.round(evalFormula(hl.x, { w, d, h })),
        y: Math.round(evalFormula(hl.y, { w, d, h })),
        dia: +hl.dia || 5,
        depth: +hl.depth || 13,
        side: hl.side || 'F',
        qty: Math.max(1, Math.round(+hl.qty || 1))
      });
    } catch (e) { /* formulasiz hole — o'tkazib yuboriladi */ }
  }
  const material = WOOD_MAT(frag) ? matName : (frag.material_code || matName);
  const th = WOOD_MAT(frag)
    ? fallbackTh
    : ((matByCode[frag.material_code] && matByCode[frag.material_code].thickness) || 16);
  const defs = [];
  const seen = {};
  for (const part of frag.parts || []) {
    try {
      const vars = { w, d, h, t: th, qty: 1 };
      const len = evalFormula(part.len, vars);
      const wid = evalFormula(part.width, vars);
      const pqty = Math.max(1, Math.round(evalFormula(part.qty != null ? part.qty : 1, vars) || 1));
      for (let i = 1; i <= pqty; i++) {
        const idx = (seen[part.code] = (seen[part.code] || 0) + 1);
        defs.push({
          code: part.code,
          name: part.code + (pqty > 1 || idx > 1 ? '_' + i : ''),
          material,
          materialCode: frag.material_code,
          thickness: th,
          cutL: Math.max(1, Math.round(len)),
          cutW: Math.max(1, Math.round(wid)),
          finL: Math.max(1, Math.round(len)),
          finW: Math.max(1, Math.round(wid)),
          slot: part.slot,
          texture: part.tekstura || part.texture,
          holes: holesByPart[part.code] || []
        });
      }
    } catch (e) { /* formula xatosi — cutlist E_BAD_EXPR ko'rsatadi */ }
  }
  return defs;
}

/** 3D modeldan shu detalga eng yaqin panelni oladi: (1) kod, (2) slot, (3) o'lcham.
 * @param {Map} remaining — joylashmagan detallar kodlari (keyin keladiganlar band emas) */
function takePanel(pool, def, remaining) {
  const dims = (q) => {
    const A = [+q.w, +q.d, +q.h].map(Math.round).sort((x, y) => x - y);
    const B = [def.cutL, def.cutW, def.thickness].map(Math.round).sort((x, y) => x - y);
    return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]);
  };
  const pick = (pred, tol) => {
    let bi = -1, bs = Infinity;
    for (let i = 0; i < pool.length; i++) {
      if (!pred(pool[i])) continue;
      const sc = dims(pool[i]);
      if (sc < bs) { bs = sc; bi = i; }
    }
    if (bi < 0) return null;
    if (tol != null && bs > tol) return null;
    return pool.splice(bi, 1)[0];
  };
  const free = (q) => !(remaining && remaining.get(q.code));
  return pick(q => q.code === def.code) ||
         (def.slot ? pick(q => q.slot === def.slot && free(q), DIM_MATCH_TOL_MM) : null) ||
         pick(free, DIM_MATCH_TOL_MM) ||
         /* oxirgi variant: slot mos, o'lcham farqi katta bo'lsa ham (position ma'qul,
          * navbatdagi Z-stack dan yaxshiroq) */
         (def.slot ? pick(q => q.slot === def.slot && free(q)) : null);
}

/** Kod mos kelmaganda o'lcham bo'yicha qabul qilinadigan maksimall farq (mm, 3 o'lcham yig'indisi). */
const DIM_MATCH_TOL_MM = 60;

/** Markazi (wx,wy,wz), yarmi o'lchamlari (ex,ey,ez) bilan qutining global bbox'i. */
function boxGlobal(wx, wy, wz, ex, ey, ez, cs, sn) {
  let mnx = Infinity, mny = Infinity, mnz = Infinity;
  let mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
  for (let k = 0; k < 8; k++) {
    const px = (k & 1) ? ex : -ex;
    const py = (k & 2) ? ey : -ey;
    const pz = (k & 4) ? ez : -ez;
    const x = wx + px * cs - py * sn;
    const y = wy + px * sn + py * cs;
    const z = wz + pz;
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
    if (z < mnz) mnz = z; if (z > mxz) mxz = z;
  }
  return {
    min: { x: Math.round(mnx), y: Math.round(mny), z: Math.round(mnz) },
    max: { x: Math.round(mxx), y: Math.round(mxy), z: Math.round(mxz) }
  };
}

/** Xavfsiz formula ifodasi (expr.js orqali, AST asosida, eval/Function-siz). */
function evalF(expr, vars) {
  return evalFormula(expr, vars);
}

/** giblab XML (real fayldagi format — Bazis importBMV). */
function buildGiblab(modelName, bomRows) {
  const esc = (s) => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project importBMV="4.5" version="2">',
    `<good typeId="product" id="1" count="1" name="${esc(modelName)}" product.import="bm.4.5">`
  ];
  let pid = 0;
  for (const r of bomRows) {
    pid++;
    lines.push(`  <part id="${pid}" name="${esc(r.name)}" dl="${r.dl.toFixed(2)}" dw="${r.dw.toFixed(2)}" count="${r.count}" txt="0">`);
    for (const b of r.butts || []) {
      lines.push(`    <butt elemIndex="${b.elemIndex}" material="${esc(b.material)}" t="${b.thickness.toFixed(2)}" w="${b.width.toFixed(2)}"/>`);
    }
    lines.push('  </part>');
  }
  lines.push('</good>', '</project>');
  return lines.join('\r\n');
}

/** CSV (real fayldagi o'zbekcha sarlavhalar bilan). */
function buildCSV(bomRows) {
  const head = 'No;Nomi;ArtPos;DL(mm);DW(mm);DP(mm);Material;Tekstura;Oval;Perimetr(mm);Paz(mm);Soni;1dona(m2);Jami(m2);Qirralar;Teshiklar';
  const rows = bomRows.map(r => [
    r.no, r.name, r.artPos, r.dl, r.dw, r.dp, r.material, r.textureDir,
    r.isOval ? 'Ha' : "Yo'q", r.perimeter, r.totalPazLen, r.count,
    r.area, r.totalArea, '"' + (r.buttsStr || '') + '"', r.holesCount
  ].join(';'));
  return head + '\r\n' + rows.join('\r\n') + '\r\n';
}

function buildSmetaHtml(modelName, bomRows, totalArea) {
  const rows = bomRows.map(r =>
    `<tr><td>${r.no}</td><td>${r.name}</td><td>${r.dl}×${r.dw}×${r.dp}</td><td>${r.material}</td><td>${r.count}</td><td>${r.totalArea}</td></tr>`
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${modelName} — smeta</title></head>
<body style="font-family:sans-serif">
<h2>${modelName}</h2>
<p>Jami: ${bomRows.length} qator · ${totalArea.toFixed(3)} m²</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>No</th><th>Nomi</th><th>O'lcham</th><th>Material</th><th>Soni</th><th>m²</th></tr>
${rows}</table></body></html>`;
}
