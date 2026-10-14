/* Smart3D engine/bpj.js — BPJ (BazisUniversalExport 4.2) WRITER.
 *
 * Manba: mebelcity-platform/1.bpj (haqiqiy Bazis eksporti, 682 KB) +
 * widget_bazis/bpj_parser.py (qabul qiluvchi tomon).
 *
 * Format (tekshirilgan real fayldan):
 *   { version:"4.2", script:"BazisUniversalExport", meta, config,
 *     materials[], edgeBands[], furnitures[], blocks[], bom[], objects[],
 *     exports:{giblab, csv, smetaHtml} }
 *
 * Encoder: fayl UTF-8 (BOM'siz) — Bazis ism/litrallari lotin (ASCII-safe).
 * Parser (bpj_parser.py) UTF-8/UTF-16/cp1251 ni avtomatik aniqlaydi.
 */

import { evalFormula } from './expr.js';

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
 * @param {Object} opts       — {modelName, materialCode (joriy panel), cutlists}
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

  /* ── material guruhlari (panel id bo'yicha) ── */
  const matAgg = {};       // name → {name, thickness, totalArea, panels[]}
  const edgeAgg = {};      // material@t → {...}
  const bomRows = [];      // agregatsiya: frag+size → row
  const bomIdx = {};
  const objects = [];
  const furnitures = [];
  const blocks = [];
  let panelId = 0, totalArea = 0, totalPanels = 0, ovalPanels = 0;

  for (const p of doc.placements || []) {
    const frag = catalog[p.frg];
    if (!frag) continue;
    const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
    const qty = Math.max(1, Math.round(+p.qty || 1));
    const mat = WOOD_MAT(frag) ? matName : (frag.material_code || matName);
    const th = WOOD_MAT(frag) ? thickness : ((materials.panel_materials.find(m => m.code === frag.material_code) || {}).thickness || 16);

    for (let n = 0; n < qty; n++) {
      const fno = furnitures.length + 1;
      furnitures.push({
        no: fno, name: frag.name || p.frg, artPos: p.frg, count: 1,
        userProps: { smart3d_id: p.id, w, d, h, x: +p.x || 0, y: +p.y || 0, z: +p.z || 0, rot: +p.rot || 0 }
      });

      const blockPanelIds = [];
      /* — har bir detal (parts formulasi bilan) — */
      for (const part of frag.parts || []) {
        const vars = { w, d, h, t: th, qty: 1 };
        const len = evalFormula(part.len, vars);
        const wid = evalFormula(part.width, vars);
        const pqtyRaw = evalFormula(part.qty != null ? part.qty : 1, vars);
        const pqty = Math.max(1, Math.round(pqtyRaw || 1));
        for (let i = 0; i < pqty; i++) {
          panelId++;
          totalPanels++;
          totalArea += (len * wid) / 1e6;
          blockPanelIds.push(panelId);

          /* materials agregatsiyasi */
          const ma = matAgg[mat] = matAgg[mat] || { name: mat, thickness: th, totalArea: 0, panels: [] };
          ma.totalArea += (len * wid) / 1e6;
          ma.panels.push(panelId);

          /* butts — fragment.edge bo'yicha */
          const butts = [];
          for (const e of frag.edge || []) {
            if (e.code !== part.code) continue;
            for (const side of e.sides || []) {
              const ei = SIDE_TO_ELEM[side];
              if (ei == null) continue;
              butts.push({
                elemIndex: ei,
                material: edgeNames[e.material] || e.material,
                thickness: +(e.thickness || 2),
                width: -1,
                length: (ei === 0 || ei === 2) ? Math.round(len) : Math.round(wid)
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

          /* bom agregatsiyasi (bir xil detal+o'lcham → bitta qator) */
          const key = part.code + '|' + len + '|' + wid + '|' + mat;
          let row = bomIdx[key];
          if (!row) {
            row = bomIdx[key] = {
              no: bomRows.length + 1,
              name: part.code,
              artPos: p.frg,
              dl: Math.round(len), dw: Math.round(wid), dp: th,
              material: mat, textureDir: 0, isOval: false,
              perimeter: Math.round(2 * (len + wid)),
              count: 0,
              area: r3((len * wid) / 1e6),
              totalArea: 0, totalPazLen: 0,
              butts, buttsStr: buttsStr(butts),
              holesCount: 0
            };
            bomRows.push(row);
          }
          row.count++;
          row.totalArea = r3(row.area * row.count);

          /* objects — haqiqiy panel (contour + transform bilan) */
          const dl = Math.round(len), dw = Math.round(wid);
          objects.push({
            id: panelId,
            name: part.code + (pqty > 1 ? '_' + (i + 1) : ''),
            artPos: p.frg,
            isOval: false,
            area: r3((len * wid) / 1e6),
            dimensions: { dl, dw, dp: th },
            perimeter: Math.round(2 * (dl + dw)),
            material: { name: mat, textureDir: 0 },
            materialDetails: { name: mat, thickness: th, sheetWidth: 0 },
            plastics: [],
            position: { x: +p.x || 0, y: +p.y || 0, z: +p.z || 0 },
            transform: {
              origin: { x: +p.x || 0, y: +p.y || 0, z: (+p.z || 0) + th / 2 },
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
            holes: [],
            cuts: [],
            boundingBox: {
              global: {
                min: { x: +p.x || 0, y: +p.y || 0, z: +p.z || 0 },
                max: { x: (+p.x || 0) + w, y: (+p.y || 0) + d, z: (+p.z || 0) + h }
              },
              local: { min: { x: 0, y: 0, z: 0 }, max: { x: dl, y: dw, z: th } }
            },
            userProps: { smart3d_placement: p.id, smart3d_holes: (frag.holes || []).length }
          });
        }
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
    config: { precision: 2, boreMinDiam: 1.5, sheetL: matMeta.sheets ? matMeta.sheets[0][0] : 2800, sheetW: matMeta.sheets ? matMeta.sheets[0][1] : 2070, union: true },
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
      version: 1,
      note: 'Smart3D dan yaratilgan. Teshiklar: smart3d-holes.json (BPJ objects.holes bo\'sh — format Bazis bo\'yicha keyin to\'ldiriladi).',
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
