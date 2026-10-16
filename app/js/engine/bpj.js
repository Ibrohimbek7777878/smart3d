/* Smart3D engine/bpj.js — BPJ (BazisUniversalExport 4.2) WRITER.
 *
 * Manba: mebelcity-platform/1.bpj (haqiqiy Bazis eksporti, 682 KB) +
 * widget_bazis/bpj_parser.py (ERP o'quvchisi) + widget_bazis/static/widget_bazis/viewer/bazis/BazisUniversalImport.js
 * (Bazis'ga import skripti v4.18 — faylni shu skript o'qiydi; tests/bpj_import_mock.mjs uni taqlid qiladi).
 *
 * Format (tekshirilgan real fayldan):
 *   { version:"4.2", script:"BazisUniversalExport", meta, config,
 *     materials[], edgeBands[], furnitures[], blocks[], bom[], objects[],
 *     exports:{giblab, csv, smetaHtml} }
 *
 * Panel joyi (TZ-17, real fayl va import skripti bo'yicha):
 *   - Bazis global o'qlari: X — tomoshabinning o'ngi, Y — yuqori, Z — old tomon (oldda turgan tomoshabin tomon).
 *     Smart3D dunyo (x, y — reja, z — yuqori) → Bazis: X = OFF − x, Y = z, Z = y (burilish, ko'zgu emas; OFF — X ≥ 0 uchun).
 *   - transform — panelning o'z ramkasi: origin = kontur (0,0) burchagi va qalinlik boshlanadigan yuz, axisX — dl bo'ylab,
 *     axisY — dw bo'ylab, axisZ — qalinlik (o'ng qo'l: X × Y = Z). Kontur 0..dl × 0..dw, qalinlik lokal 0..dp.
 *     Import skripti: AddFrontPanel(0,0,dl,dw,0) → Orient(axisZ, axisY) → Position = origin.
 *   - dl/dw — panelning geometrik (tayyor) o'lchami, haqiqiy Bazis eksportidagidek; kesim o'lchami userProps.smart3d_kesim.
 *   - Joy manbasi: MC modullari — Bazis faylidan olingan joy formulalari (engine/joy.js), qolganlari — 3D panel modeli
 *     (assembler); unda yo'q detal — navbat bilan (ogohlantirish: "geometriya tekshirilmagan").
 *   - Kromka elemIndex: 0 — y=0 qirra (F, oldi), 1 — x=dl, 2 — y=dw, 3 — x=0 (L). Teshik: x — dl bo'ylab L dan,
 *     y — dw bo'ylab F dan, z — 0 (old yuz) yoki dp (orqa yuz).
 *
 * Encoder: fayl UTF-8 (BOM'siz). Parser (bpj_parser.py) UTF-8/UTF-16/cp1251 ni avtomatik aniqlaydi.
 */

import { evalFormula } from './expr.js';
import { cutlist } from './cutlist.js';
import { getModulePanels } from './assembler.js';
import { hasJoy, joyPanellar } from './joy.js';
import { panelFitsSheet, pickSheetSize, KERF_DEFAULT, TRIM_DEFAULT } from './nesting.js';

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r4 = (x) => Math.round(x * 10000) / 10000;

/** Butta (qirra) → elemIndex: 0=pastki(dl) 1=o'ng(dw) 2=yuqori(dl) 3=chap(dw). */
const SIDE_TO_ELEM = { F: 0, R: 1, B: 2, L: 3 };

/* vektor yordamchilari (ramka hisobi) */
const AXV = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const vmul = (v, k) => v.map(x => x * k);
const vadd = (a, b) => a.map((x, i) => x + b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Panel ramkasi (modul lokal o'qlarida): quti markazi C, o'lchamlari Dm [x, y, z] bo'yicha; detal dl × dw × th.
 * Qalinlik o'qi — o'lchami th ga eng yaqin; dl o'qi — qolgan ikkitasidan dl ga mosi. F qirra (y=0) — chuqurlik o'qi
 * bo'lsa old tomonda (lokal +y), aks holda pastda/chapda. Natija: { o: origin, x, y, z: birlik o'qlar }.
 */
function panelRamka(C, Dm, dl, dw, th) {
  const ti = [0, 1, 2].sort((i, j) => Math.abs(Dm[i] - th) - Math.abs(Dm[j] - th) || Dm[i] - Dm[j])[0];
  const [i1, i2] = [0, 1, 2].filter(i => i !== ti);
  const li = (Math.abs(Dm[i1] - dl) + Math.abs(Dm[i2] - dw) <= Math.abs(Dm[i2] - dl) + Math.abs(Dm[i1] - dw)) ? i1 : i2;
  const wi = li === i1 ? i2 : i1;
  const ex = AXV[li];
  const ey = wi === 1 ? vmul(AXV[1], -1) : AXV[wi];            // chuqurlik bo'ylab: y=0 — old qirra
  const ez = cross(ex, ey);
  const L = Dm[li], W = Dm[wi], T = Dm[ti];
  const o = vadd(C, vmul(vadd(vadd(vmul(ex, L), vmul(ey, W)), vmul(ez, T)), -0.5));
  return { o, x: ex, y: ey, z: ez };
}

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
  const ramkalar = [];     // objects[i] uchun dunyo ramkasi (Smart3D) — oxirida Bazis o'qlariga o'tkaziladi
  const furnitures = [];
  const blocks = [];
  const warnings = [];
  let panelId = 0, totalArea = 0, totalPanels = 0, ovalPanels = 0;
  let unpositioned = 0, fromJoy = 0, fromModel = 0;

  for (const p of doc.placements || []) {
    const frag = catalog[p.frg];
    if (!frag) continue;
    const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
    const qty = Math.max(1, Math.round(+p.qty || 1));
    const rot = ((+p.rot || 0) % 360 + 360) % 360;
    const rad = rot * Math.PI / 180, cs = Math.round(Math.cos(rad) * 1e12) / 1e12, sn = Math.round(Math.sin(rad) * 1e12) / 1e12;
    const ox = +p.x || 0, oy = +p.y || 0, oz = +p.z || 0;
    /* modul lokal (markazlangan) → dunyo: nuqta va yo'nalish */
    const toWorld = (v) => { const lx = v[0] + w / 2, ly = v[1] + d / 2; return [ox + lx * cs - ly * sn, oy + lx * sn + ly * cs, oz + v[2] + h / 2]; };
    const dirWorld = (v) => [v[0] * cs - v[1] * sn, v[0] * sn + v[1] * cs, v[2]];

    const cl = clByPlacement.get(p.id) || fallbackCutlist(frag, w, d, h);
    const defs = (cl && cl.parts && cl.parts.length)
      ? defsFromCutlist(cl, matByCode, matName, thickness, frag)
      : defsFromFormulas(frag, w, d, h, matByCode, matName, thickness);
    if (!defs.length) continue;

    /* fallback (3D modelda yo'q panel) uchun — fasad/orqa soni (oldinga/orqaga joylash) */
    const fbTotals = { fasad: 0, orqa: 0 };
    for (const d of defs) if (fbTotals[d.slot] != null) fbTotals[d.slot]++;

    /* panel joylari: MC — Bazis faylidan (joy formulalari), qolgani — 3D panel modeli (objexport/glbexport ramkasi) */
    let asmBase = [];
    const joyli = hasJoy(frag);
    const tKorpus = (defs.find(x => x.slot === 'korpus') || defs[0]).thickness || thickness;
    try {
      if (joyli) {
        const thByCode = {};
        for (const x of defs) thByCode[x.code] = x.thickness;
        asmBase = joyPanellar(frag, w, d, h, { t: tKorpus, qalinlik: (part) => thByCode[part.code] });
      } else {
        const asm = getModulePanels(frag, w, d, h, { thickness: tKorpus });
        asmBase = (asm && asm.panels) || [];
      }
    } catch (e) {
      warnings.push(`${p.id}: panel joylari hisoblanmadi (${e.message}) — navbat bilan`);
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

      /* — har bir panel (cutlist bo'yicha, qty kengaytirilgan) — */
      for (const def of defs) {
        remaining.set(def.code, (remaining.get(def.code) || 1) - 1);
        panelId++;
        totalPanels++;
        const dl = Math.max(1, Math.round(def.finL)), dw = Math.max(1, Math.round(def.finW)), th = def.thickness;
        const mat = def.material;
        totalArea += (dl * dw) / 1e6;
        blockPanelIds.push(panelId);

        /* materials agregatsiyasi (detal materiali bo'yicha) */
        const ma = matAgg[mat] = matAgg[mat] || { name: mat, thickness: th, totalArea: 0, panels: [] };
        ma.totalArea += (dl * dw) / 1e6;
        ma.panels.push(panelId);

        /* butts — kesim ro'yxati kromkasi (MC detallari ham — ularda kromka detalning o'zida), bo'lmasa fragment.edge;
         * uzunlik = panelning o'z qirrasi (dl/dw) */
        const butts = [];
        for (const e of def.edges || frag.edge || []) {
          if (e.code !== def.code) continue;
          for (const side of e.sides || []) {
            const ei = SIDE_TO_ELEM[side];
            if (ei == null) continue;
            butts.push({
              elemIndex: ei,
              material: edgeNames[e.material] || e.name || e.material,
              thickness: +(e.thickness || 2),
              width: -1,
              length: (ei === 0 || ei === 2) ? dl : dw
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
         * UZUNLIK bo'ylab) → BPJ kontur kadrida (X = dl = uzunlik, Y = dw = en); z — yuz (import skripti AddHole(x,y,z)) */
        const holes = def.holes
          .filter(hl => hl.kind !== 'cutout' && hl.side !== 'T')   /* F2: moyka kesimi — BPJ circle emas; torets — sxemada yo'q */
          .map(hl => ({
            x: Math.min(dl, Math.max(0, Math.round(hl.y))),
            y: Math.min(dw, Math.max(0, Math.round(hl.x))),
            z: hl.side === 'B' ? th : 0,
            diameter: +hl.dia || 5,
            depth: +hl.depth || 13,
            face: hl.side === 'F' ? 'front' : hl.side === 'B' ? 'back' : (hl.side || '')
          }));

        /* bom agregatsiyasi (bir xil detal+o'lcham+material → bitta qator; nom — obyekt nomi bilan bir xil,
         * ERP (bpj_parser) qator va obyektni nom|dl|dw|dp bo'yicha bog'laydi) */
        const key = def.code + '|' + dl + '|' + dw + '|' + mat;
        let row = bomIdx[key];
        if (!row) {
          row = bomIdx[key] = {
            no: bomRows.length + 1,
            name: def.nom,
            artPos: p.frg,
            dl, dw, dp: th,
            material: mat, textureDir: 0, isOval: false,
            perimeter: Math.round(2 * (dl + dw)),
            count: 0,
            area: r3((dl * dw) / 1e6),
            totalArea: 0, totalPazLen: 0,
            butts, buttsStr: buttsStr(butts),
            holesCount: 0,
            smart3d_kesim: { dl: def.cutL, dw: def.cutW }
          };
          bomRows.push(row);
        }
        row.count++;
        row.holesCount += holes.length;
        row.totalArea = r3(row.area * row.count);

        /* joylashuv — joy formulalari / 3D modeldan mos panel (yo'q bo'lsa navbatma-navbat) */
        const q = takePanel(pool, def, remaining);
        let C, Dm;
        if (q) {
          matched++;
          if (q.joy) fromJoy++; else fromModel++;
          C = [q.x, q.y, q.z];
          Dm = [Math.abs(q.w), Math.abs(q.d), Math.abs(q.h)];
        } else {
          /* 3D modelda bunda panel yo'q (mas. shift/toka — assembler'da modellashtirilmagan):
           * fasad → oldinga (X bo'ylab), orqa → orqaga, qolganlari → Z bo'ylab navbat (yotiq) */
          unpositioned++;
          unmatched++;
          const slot = def.slot || '';
          let cx, cy, cz;
          if ((slot === 'fasad' || slot === 'orqa') && fbTotals[slot]) {
            fbCount[slot]++;
            cx = (w * fbCount[slot]) / (fbTotals[slot] + 1) - w / 2;
            cy = slot === 'fasad' ? (d / 2 + th / 2) : (-d / 2 + th / 2 + 8);
            cz = 0;
            Dm = [dw, th, dl];
          } else {
            cx = 0; cy = 0;
            cz = h * (zIdx++ + 0.5) / Math.max(1, defs.length) - h / 2;
            Dm = [dl, dw, th];
          }
          C = [cx, cy, cz];
        }
        const rl = panelRamka(C, Dm, dl, dw, th);
        ramkalar.push({ o: toWorld(rl.o), x: dirWorld(rl.x), y: dirWorld(rl.y), z: dirWorld(rl.z), dl, dw, th });

        /* objects — haqiqiy panel (contour + transform bilan; transform/bbox oxirida Bazis o'qlarida to'ldiriladi) */
        objects.push({
          id: panelId,
          name: def.nom,
          artPos: p.frg,
          isOval: false,
          area: r3((dl * dw) / 1e6),
          dimensions: { dl, dw, dp: th },
          perimeter: Math.round(2 * (dl + dw)),
          material: { name: mat, textureDir: 0 },
          materialDetails: { name: mat, thickness: th, sheetWidth: 0 },
          plastics: [],
          position: null,
          transform: null,
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
            global: null,
            local: { min: { x: 0, y: 0, z: 0 }, max: { x: dl, y: dw, z: th } }
          },
          userProps: {
            smart3d_placement: p.id,
            smart3d_detal: def.name,
            smart3d_holes: holes.length,
            smart3d_kesim: { dl: def.cutL, dw: def.cutW },
            smart3d_joy: q ? (q.joy ? 'bazis' : 'model') : 'navbat',
            ...(q && !q.joy ? { smart3d_model: q.code } : {})
          }
        });
      }

      if (unmatched && n === qty - 1) {
        warnings.push(`${p.id}: ${matched}/${defs.length} panel joyini oldi — qolgani navbat bilan (geometriya tekshirilmagan)`);
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

  /* Bazis global o'qlari: X = OFF − x, Y = z, Z = y (OFF — barcha panellar X ≥ 0 bo'lishi uchun) */
  let maxX = 0;
  const burchaklar = (r) => {
    const pts = [];
    for (let k = 0; k < 8; k++) {
      let v = r.o;
      if (k & 1) v = vadd(v, vmul(r.x, r.dl));
      if (k & 2) v = vadd(v, vmul(r.y, r.dw));
      if (k & 4) v = vadd(v, vmul(r.z, r.th));
      pts.push(v);
    }
    return pts;
  };
  for (const r of ramkalar) for (const v of burchaklar(r)) if (v[0] > maxX) maxX = v[0];
  const OFF = Math.ceil(maxX);
  const bz = (v) => ({ x: r3(OFF - v[0]), y: r3(v[2]), z: r3(v[1]) });
  const bzDir = (v) => ({ x: r4(-v[0]) || 0, y: r4(v[2]) || 0, z: r4(v[1]) || 0 });
  objects.forEach((o, i) => {
    const r = ramkalar[i];
    const pts = burchaklar(r).map(bz);
    const min = { x: Math.min(...pts.map(q => q.x)), y: Math.min(...pts.map(q => q.y)), z: Math.min(...pts.map(q => q.z)) };
    const max = { x: Math.max(...pts.map(q => q.x)), y: Math.max(...pts.map(q => q.y)), z: Math.max(...pts.map(q => q.z)) };
    o.transform = { origin: bz(r.o), axisX: bzDir(r.x), axisY: bzDir(r.y), axisZ: bzDir(r.z), source: 'ToGlobal' };
    o.boundingBox.global = { min, max };
    o.position = { x: min.x, y: min.y, z: min.z };
  });

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
      exportDate: new Date().toISOString().slice(0, 19),
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
      version: 3,
      note: 'Smart3D dan yaratilgan (SINOV — real Bazis importi tasdiqlanmagan). Bazis o\'qlari: X o\'ngga, Y yuqoriga, Z oldga; ' +
        'X = ' + OFF + ' − x, Y = z, Z = y. dl/dw — tayyor o\'lcham, kesim — userProps.smart3d_kesim. ' +
        'objects[].holes: {x,y,z,diameter,depth,face} — x/dl bo\'ylab, y/dw bo\'ylab.',
      offsetX: OFF,
      joy: { bazis: fromJoy, model: fromModel, navbat: unpositioned },
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
function defsFromCutlist(cl, matByCode, fallbackMat, fallbackTh, frag) {
  const nomOf = partNomi(frag);
  const countByCode = {};
  for (const p of cl.parts || []) countByCode[p.code] = (countByCode[p.code] || 0) + 1;
  const holesByPart = {};
  for (const hl of cl.holes || []) (holesByPart[hl.part] = holesByPart[hl.part] || []).push(hl);
  const edgesByCode = {};
  for (const e of cl.edges || []) (edgesByCode[e.code] = edgesByCode[e.code] || []).push(e);
  const seen = {};
  return (cl.parts || []).map(p => {
    const idx = (seen[p.code] = (seen[p.code] || 0) + 1);
    const meta = matByCode[p.material];
    return {
      code: p.code,
      name: p.code + (countByCode[p.code] > 1 ? '_' + idx : ''),
      nom: nomOf(p.code),
      material: (meta && meta.name) || p.material || fallbackMat,
      materialCode: p.material,
      thickness: +p.thickness || (meta && meta.thickness) || fallbackTh,
      cutL: Math.max(1, Math.round(+p.length || 1)),
      cutW: Math.max(1, Math.round(+p.width || 1)),
      finL: Math.round(+p.finish_length || +p.length || 1),
      finW: Math.round(+p.finish_width || +p.width || 1),
      slot: p.slot,
      texture: p.texture,
      holes: holesByPart[p.code] || [],
      edges: cl.edges ? (edgesByCode[p.code] || []) : null
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
  const nomOf = partNomi(frag);
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
          nom: nomOf(part.code),
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

/** detal kodi → Bazis'dagi nomi (MC: "Боковина ящика левая"), bo'lmasa — kod (BOM va obyekt nomi bir xil bo'lsin) */
function partNomi(frag) {
  const m = {};
  for (const pt of (frag && frag.parts) || []) m[pt.code] = pt.nom || pt.name || pt.code;
  return (code) => m[code] || code;
}

/** 3D modeldan shu detalga eng yaqin panelni oladi: (1) kod, (2) slot, (3) o'lcham.
 * @param {Map} remaining — joylashmagan detallar kodlari (keyin keladiganlar band emas) */
function takePanel(pool, def, remaining) {
  const dims = (q) => {
    const A = [+q.w, +q.d, +q.h].map(Math.round).sort((x, y) => x - y);
    const B = [def.finL, def.finW, def.thickness].map(Math.round).sort((x, y) => x - y);
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
