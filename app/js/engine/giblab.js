/* Smart3D engine/giblab.js — GIBLAB .project FAYL YOZUVCHISI.
 *
 * Format (mebelcity-platform FMS/Raskroy/giblab_raskroy.py asosida,
 * haqiqiy sex .project fayllari ustida tekshirilgan):
 *   XML + CS operatsiyasining binar "data" atributi (base64, BIG-ENDIAN).
 *
 * Binar struktura:
 *   header(8B=00*7+01) + version(03) + pattern_count(int32)
 *   har karta: sheet_count(i32) + L(f64) + W(f64) + extra(5B: card_id i32 + 00)
 *              + imzo(4×f64 -1.0) + stats… + records…
 *   record (15B): opcode(u8)=(level<<3)|type, size(f64), count(i16), part_id(i32)
 *   type: 1=trim 2=cut(strip) 3=part 4=waste; level 0 = yo'nalish bayrog'i
 *
 * Joylashtirish: LSTR (lenta) — chiziqlar sheet L bo'ylab, detallar W bo'ylab
 * (texture xavfsiz, aylanishsiz). Har chiziq = level1 CUT, ichida level2 PART.
 *
 * Test: Smart3D namunasi → python giblab_raskroy.py → 0 xato, round-trip.
 */

const HEADER = [0, 0, 0, 0, 0, 0, 0, 1];
const VERSION = 3;
const T_TRIM = 1, T_CUT = 2, T_PART = 3, T_WASTE = 4;
const MIN_WASTE = 50;          // shundan kichik qoldiq → waste yozilmaydi

/* ── BIG-ENDIAN binar yig'ish ──────────────────────────────────── */
class BinWriter {
  constructor() { this.bytes = []; }
  u8(v) { this.bytes.push(v & 0xff); return this; }
  i32(v) {
    const b = new ArrayBuffer(4); new DataView(b).setInt32(0, v | 0, false);
    this.bytes.push(...new Uint8Array(b)); return this;
  }
  i16(v) {
    const b = new ArrayBuffer(2); new DataView(b).setInt16(0, v | 0, false);
    this.bytes.push(...new Uint8Array(b)); return this;
  }
  f64(v) {
    const b = new ArrayBuffer(8); new DataView(b).setFloat64(0, v, false);
    this.bytes.push(...new Uint8Array(b)); return this;
  }
  sig() { for (let i = 0; i < 4; i++) this.f64(-1.0); return this; }
  raw(arr) { this.bytes.push(...arr); return this; }
  toB64() {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < this.bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, this.bytes.slice(i, i + chunk));
    }
    return btoa(bin);
  }
}

const r6 = (x) => Math.round(x * 1e6) / 1e6;
const r2 = (x) => Math.round(x * 100) / 100;
const escXml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* ── Binar data: patterns[] → base64 ─────────────────────────────
 * FORMAT: records FLAT (pre-order): L1 yozuv, keyin uning L2 children,
 * keyin keyingi L1… Parser daraja bo'yicha daraxt quradi
 * (har L1 CUT → containers[L1+1] ni yangilaydi).
 */
function buildRaskroyData(patterns) {
  const flat = [];
  const emit = (recs) => {
    for (const r of recs) { flat.push(r); if (r.children && r.children.length) emit(r.children); }
  };
  const w = new BinWriter();
  w.raw(HEADER).u8(VERSION).i32(patterns.length);
  for (const p of patterns) {
    flat.length = 0;
    emit(p.records);
    w.i32(p.sheet_count).f64(p.length).f64(p.width);
    w.i32(p.card_id).u8(0);
    w.sig();
    w.i32(p.n_parts).i32(0).i32(0).i32(p.n_parts2);
    w.f64(r6(p.parts_area)).i32(p.n_waste).f64(r6(p.waste_area)).i32(1);
    w.f64(r6(p.cut_len)).i32(p.cut_count).f64(p.filling);
    w.i32(flat.length);
    for (const r of flat) {
      w.u8((r.level << 3) | r.type).f64(r6(r.size)).i16(r.count | 0).i32(r.part_id | 0);
    }
  }
  return w.toB64();
}

/* ── LSTR joylashtirish → patterns (kesim daraxti bilan) ────────
 * parts: [{pid, l, w, stackLen}] — stackLen = W o'qi bo'ylab egallaydi.
 * Chiziq kengligi = det kengligi (L bo'ylab), detallar W bo'ylab teriladi.
 */
function packStrips(parts, L, W, kerf, trimL, trimW) {
  const patterns = [];
  let cur = null, cardId = 1;
  let posL = 0;
  let strips = [];

  const newPattern = () => {
    cur = {
      sheet_count: 1, length: L, width: W, card_id: cardId++,
      n_parts: 0, n_parts2: 0, parts_area: 0, n_waste: 0, waste_area: 0,
      cut_len: 0, cut_count: 0, filling: 0, records: [], _wasteParts: []
    };
    patterns.push(cur);
    posL = trimL > 0 ? trimL + kerf : 0;
    strips = [];
  };

  const closeStrips = () => {
    if (!strips.length) return;
    if (trimL > 0) cur.records.push({ level: 1, type: T_TRIM, size: trimL, count: 0, part_id: -1 });
    let pos = trimL > 0 ? trimL + kerf : 0;    // _render_nodes modeli: har yozuv size+kerf
    for (const st of strips) {
      const rec = { level: 1, type: T_CUT, size: st.width, count: 1, part_id: -1, children: [] };
      if (trimW > 0) rec.children.push({ level: 2, type: T_TRIM, size: trimW, count: 0, part_id: -1 });
      let posW = trimW > 0 ? trimW + kerf : 0;
      for (const p of st.parts) {
        rec.children.push({ level: 2, type: T_PART, size: p.stackLen, count: 1, part_id: p.pid });
        cur.n_parts++; cur.n_parts2++;
        cur.parts_area += (p.l * p.w) / 1e6;
        posW += p.stackLen + kerf;
      }
      const remW = W - posW;                   // namuna: waste = cap - pos(kerf bilan)
      if (remW >= MIN_WASTE) {
        rec.children.push({ level: 2, type: T_WASTE, size: remW, count: 0, part_id: null });
        cur.n_waste++; cur.waste_area += (st.width * remW) / 1e6;
        cur._wasteParts.push({ wExt: st.width, hExt: remW });
      }
      cur.records.push(rec);
      pos += st.width + kerf;
    }
    strips = [];
    const remL = L - pos;                      // posL kerf bilan — waste = L - pos
    if (remL >= MIN_WASTE) {
      cur.records.push({ level: 1, type: T_WASTE, size: remL, count: 0, part_id: null });
      cur.n_waste++; cur.waste_area += (remL * W) / 1e6;
      cur._wasteParts.push({ wExt: remL, hExt: W });
    }
  };

  const sorted = parts.slice().sort((a, b) => (b.w - a.w) || (b.l - a.l));
  for (const p of sorted) {
    if (p.w + trimL + kerf > L || p.l + trimW + kerf > W) continue;   // sig'maydi
    const st = strips[strips.length - 1];
    if (st && Math.abs(st.width - p.w) <= 1) {
      const posW = (trimW > 0 ? trimW + kerf : 0)
        + st.parts.reduce((s, x) => s + x.stackLen + kerf, 0);
      if (posW + p.stackLen <= W) { st.parts.push(p); continue; }
    }
    if (!cur || posL + p.w > L) { closeStrips(); newPattern(); }
    strips.push({ width: p.w, parts: [p] });
    posL += p.w + kerf;
  }
  closeStrips();
  return patterns;
}

/* ── cut_len / cut_count / filling (daraxt hisobi) ─────────────── */
function finalizePattern(p) {
  let cutLen = 0, cutCount = 0;
  const walk = (records, perim) => {
    for (let i = 0; i < records.length - 1; i++) { cutLen += perim; cutCount++; }
    for (const r of records) if (r.children) walk(r.children, r.size);
  };
  walk(p.records, p.width);
  p.cut_len = cutLen / 1000;
  p.cut_count = cutCount;
  const sheetArea = (p.length * p.width) / 1e6;
  p.filling = sheetArea ? p.parts_area / sheetArea : 0;
}

/* ── Asosiy: nest + cutlists + materials → .project XML ────────── */
export function buildProject(opts) {
  const { cutlists, materials, modelName = 'Smart3D', materialCode } = opts;
  const settings = Object.assign({
    kerf: 4, trimL: 8, trimW: 8, maxTurns: 4,
    currency: 'UZS', version: '23051701'
  }, opts.settings || {});

  const kerf = +(settings.kerf != null ? settings.kerf : (materials && materials.kerf) || 4);

  const matMeta = {};
  for (const m of ((materials && materials.panel_materials) || [])) matMeta[m.code] = m;
  const edgeMeta = {};
  for (const e of ((materials && materials.edge_materials) || [])) edgeMeta[e.code] = e;

  /* partlarni material bo'yicha yig'ish (cutlist'dan — physical pieces) */
  const byMat = {};
  for (const cl of (cutlists || [])) {
    for (const pt of (cl.parts || [])) {
      const mat = pt.material || materialCode || 'MDF16';
      (byMat[mat] = byMat[mat] || []).push({
        l: +pt.length, w: +pt.width, pid: 0,
        fragment: pt.fragment || '', code: pt.code || '',
        placementId: cl.placementId, ref: pt.ref
      });
    }
  }
  if (!Object.keys(byMat).length) throw new Error('bo\'sh loyiha — detallar yo\'q');

  let nextId = 1;
  const takeId = () => nextId++;

  const productId = takeId();
  const partEntries = [];
  const matBlocks = [];

  for (const mat in byMat) {
    const mlist = byMat[mat];
    const meta = matMeta[mat] || { name: mat, thickness: 16, sheets: [[2800, 2070]], sheet_price: 0 };
    const sz = (meta.sheets && meta.sheets[0]) || [2800, 2070];
    const L = +sz[0], W = +sz[1];

    for (const p of mlist) { p.pid = takeId(); partEntries.push({ id: p.pid, l: p.l, w: p.w }); }

    const packParts = mlist.map(p => ({ pid: p.pid, l: p.l, w: p.w, stackLen: p.l }));
    const patterns = packStrips(packParts, L, W, kerf, settings.trimL, settings.trimW);
    if (!patterns.length) throw new Error(mat + ': joylashmadi');
    for (const pat of patterns) finalizePattern(pat);

    // waste ID larni recordsga tayinlash
    for (const pat of patterns) {
      let wi = 0;
      const assign = (records) => {
        for (const r of records) {
          if (r.type === T_WASTE && r.part_id == null) {
            const wp = pat._wasteParts[wi++];
            if (wp) r.part_id = takeId(), wp.pid = r.part_id;
          }
          if (r.children) assign(r.children);
        }
      };
      assign(pat.records);
    }

    const stockId = takeId();
    const toolCutId = takeId();
    matBlocks.push({ mat, meta, L, W, patterns, stockId, toolCutId, mlist, sheetPrice: +meta.sheet_price || 0 });
  }

  /* kromka (EL) guruhlari */
  const elByMat = {};
  for (const cl of (cutlists || [])) {
    const pidByCode = {};
    for (const pt of (cl.parts || [])) {
      const found = [];
      for (const mat in byMat) for (const pp of byMat[mat]) {
        if (pp.placementId === cl.placementId && pp.ref === pt.ref) found.push(pp.pid);
      }
      (pidByCode[pt.code] = pidByCode[pt.code] || []).push(...found);
    }
    for (const e of (cl.edges || [])) {
      const em = e.material || 'PVC2';
      const g = elByMat[em] = elByMat[em] || {
        thickness: e.thickness || 2, pids: new Set(), meters: 0,
        price_m: (edgeMeta[em] && edgeMeta[em].price_m) || 0
      };
      g.meters += +e.meters || 0;
      for (const pid of (pidByCode[e.code] || [])) g.pids.add(pid);
    }
  }

  /* narxlar */
  let costMaterial = 0, elCost = 0;
  for (const mb of matBlocks) costMaterial += mb.patterns.length * mb.sheetPrice;
  for (const em in elByMat) elCost += elByMat[em].meters * elByMat[em].price_m;
  const costOperation = elCost;
  const costTotal = costMaterial + costOperation;

  /* ── XML ─────────────────────────────────────────────────────── */
  const now = Date.now();
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += `<project date="${now}" orderDate="${now}" currency="${escXml(settings.currency)}" `
     + `project.uuid="${uuid()}" version="${escXml(settings.version)}" `
     + `costOperation="${r2(costOperation)}" costMaterial="${r2(costMaterial)}" cost="${r2(costTotal)}">\n`;

  x += `<good typeId="product" id="${productId}" count="1" name="${escXml(modelName)}" `
     + `costMaterial="${r2(costMaterial)}" costOperation="${r2(costOperation)}" cost="${r2(costTotal)}">\n`;
  for (const pe of partEntries) {
    x += `<part l="${r2(pe.l)}" w="${r2(pe.w)}" dl="${r2(pe.l)}" dw="${r2(pe.w)}" `
       + `jl="${r2(pe.l)}" jw="${r2(pe.w)}" cl="${r2(pe.l)}" cw="${r2(pe.w)}" `
       + `minusCount="0" count="1" usedCount="1" txt="false" id="${pe.id}"/>\n`;
  }
  x += `</good>\n`;

  for (const mb of matBlocks) {
    const m = mb.meta;
    x += `<good typeId="tool.cutting" swSawthick="${r2(kerf)}" swPackageHeight="0" `
       + `swMaxturns="${settings.maxTurns | 0}" swComplexBand="true" swTrimIncludeSaw="false" `
       + `swSort="2" swSortInBand="3" swMinSizeBand="0" swMaxSizeBand="0" swMinPruning="6" `
       + `swMaxLengthBand="0" swSawthickDiv="-1" id="${mb.toolCutId}"/>\n`;

    x += `<good typeId="sheet" t="${r2(m.thickness || 16)}" w="${r2(mb.W)}" l="${r2(mb.L)}" `
       + `count="1" cost="${r2(mb.sheetPrice)}" name="${escXml(m.name || mb.mat)}" `
       + `id="${mb.stockId}" unit="м2" code="${uuid()}">\n`;
    x += `  <part l="${r2(mb.L)}" w="${r2(mb.W)}" count="10000" usedCount="1" id="${mb.stockId}"/>\n`;
    for (const pat of mb.patterns) {
      for (const wp of pat._wasteParts) {
        x += `  <part l="${r2(wp.wExt)}" w="${r2(wp.hExt)}" rl="${r2(wp.wExt)}" rw="${r2(wp.hExt)}" `
           + `count="1" usedCount="0" waste="true" business="false" sheetId="${mb.stockId}" id="${wp.pid}"/>\n`;
      }
    }
    x += `</good>\n`;

    /* CS operation */
    let matAmount = 0, partCount = 0, wasteCount = 0, wasteAmount = 0, partAmount = 0;
    let cutLenTotal = 0, cutCountTotal = 0, trimLen = 0, trimCount = 0, fillSum = 0;
    for (const pat of mb.patterns) {
      matAmount += (pat.length * pat.width) / 1e6;
      partCount += pat.n_parts; partAmount += pat.parts_area;
      wasteCount += pat.n_waste; wasteAmount += pat.waste_area;
      cutLenTotal += pat.cut_len; cutCountTotal += pat.cut_count;
      fillSum += pat.filling;
      for (const r of pat.records) {
        const visit = (rr) => {
          if (rr.type === T_TRIM) { trimLen += rr.size / 1000; trimCount++; }
          if (rr.children) rr.children.forEach(visit);
        };
        visit(r);
      }
    }
    const data = buildRaskroyData(mb.patterns);
    const cutLenAttr = mb.patterns.map((p, i) => `${i}=${r2(p.cut_len)}`).join(';') + ';';
    const cutCntAttr = mb.patterns.map((p, i) => `${i}=${p.cut_count}`).join(';') + ';';
    const sheetCost = r2(mb.sheetPrice * mb.patterns.length);

    x += `<operation cSizeMode="0" cTrimL="${r2(settings.trimL)}" cTrimW="${r2(settings.trimW)}" `
       + `cMinDimDetail="0" printable="true" startNewPage="false" cPrefLargePacket="false" `
       + `cCombiningParts="false" cGroupParts="15" cCostByItem="1" cCostByItemRound="false" `
       + `w="${r2(mb.W)}" l="${r2(mb.L)}" t="${r2(m.thickness || 16)}" cCostType="3" cCostCut="0" `
       + `cFillRep="0.9" cCPF="0.9" cMinDimRegWaste1="10" cMinDimRegWaste2="500" `
       + `cBusinessWaste="10" cTrimWaste="false" cSaveDrawCut="false" cAllowanceWorkpiece="0" `
       + `csDirectCut="0" csTexture="true" cMaxPartsOnPattern="0" cSortPatterns="0" `
       + `tool1="${mb.toolCutId}" cTrimLengthP="0" cTrimCountP="0" cPartCountP="0" `
       + `cPartsAmountP="0" cWasteAmountP="0" cMaterialAmountP="0" typeId="CS" id="${takeId()}" `
       + `costMaterial="${sheetCost}" costOperation="0" costTotal="${sheetCost}" `
       + `cFilling="${r2(mb.patterns.length ? fillSum / mb.patterns.length : 0)}" `
       + `cBusinessWasteAmount="0" cPartCount="${partCount}" cPartAmount="${r2(partAmount)}" `
       + `cMaterialAmount="${r2(matAmount)}" cWasteCount="${wasteCount}" cWasteAmount="${r2(wasteAmount)}" `
       + `data="${data}" cutLength="${cutLenAttr}" cutCount="${cutCntAttr}" `
       + `cMaterialCount="${mb.patterns.length}" cCountPackets="${mb.patterns.length}" `
       + `cTrimLength="${r2(trimLen)}" cTrimCount="${trimCount}">\n`;
    x += `  <material id="${mb.stockId}" count="${mb.patterns.length}"/>\n`;
    for (const pp of mb.mlist) x += `  <part id="${pp.pid}"/>\n`;
    x += `  <part id="${mb.stockId}"/>\n`;
    for (const pat of mb.patterns) for (const wp of pat._wasteParts) x += `  <part id="${wp.pid}"/>\n`;
    x += `</operation>\n`;
  }

  /* EL (kromka) operatsiyalari */
  for (const em in elByMat) {
    const g = elByMat[em];
    if (!g.meters || !g.pids.size) continue;
    const toolElId = takeId(), bandId = takeId(), opId = takeId();
    x += `<good typeId="tool.edgeline" id="${toolElId}"/>\n`;
    x += `<good typeId="band" t="${r2(g.thickness)}" w="22" `
       + `name="${escXml((edgeMeta[em] && edgeMeta[em].name) || em)}" id="${bandId}"/>\n`;
    x += `<operation typeId="EL" id="${opId}" tool1="${toolElId}" `
       + `costMaterial="0" costOperation="${r2(g.meters * g.price_m)}" costTotal="${r2(g.meters * g.price_m)}">\n`;
    x += `  <material id="${bandId}" count="${r2(g.meters)}"/>\n`;
    for (const pid of g.pids) x += `  <part id="${pid}"/>\n`;
    x += `</operation>\n`;
  }

  x += `</project>`;
  return x;
}

/* ── QA: XML stringini tekshirish (minimal) ────────────────────── */
export function projectStats(xml) {
  const ops = (xml.match(/<operation /g) || []).length;
  const goods = (xml.match(/<good /g) || []).length;
  const parts = (xml.match(/<part /g) || []).length;
  const dataB64 = (xml.match(/data="([^"]*)"/) || [])[1];
  return { ops, goods, parts, dataB64Len: dataB64 ? dataB64.length : 0, bytes: xml.length };
}
