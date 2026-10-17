/* Smart3D engine/xlsxexport.js — Professional 5-Bo'limli Excel Smeta (.xlsx) Exporter.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 30):
 *   1. Zero-dependency: tashqi kutubxonasiz (xlsx, exceljs-siz) sof PKZip + OpenXML XML.
 *   2. Brauzer va Node.js muhitida 100% oflayn ishlaydi.
 *   3. 5 ta professional bo'lim:
 *      - 1-Bo'lim: Mebel modullari va mijoz kotirovkasi
 *      - 2-Bo'lim: Plita va varaq materiallari (LDS, MDF, HDF)
 *      - 3-Bo'lim: Furnitura va aksessuarlar (ruchka, petlya, slayder, konfirmat)
 *      - 4-Bo'lim: Ishlab chiqarish xizmatlari (kesim, kromka, prisadka, frezerovka)
 *      - 5-Bo'lim: Tannarx va rentabellik xulosasi (Mijozga yakuniy narx)
 *   4. Zamonaviy dizayn va ranglar: Navy Blue sarlavhalar, valyuta formatlari va formulalar.
 */

/* ── 1. Minimal Zero-Dependency PKZip Arxivatori ── */

// CRC-32 hisoblash jadvali
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export class SimpleZip {   // TZ-11: KDT fayllari ZIP ham shu bilan
  constructor() {
    this.files = [];
  }

  addFile(name, content) {
    const encoder = new TextEncoder();
    const data = (typeof content === 'string') ? encoder.encode(content) : new Uint8Array(content);
    const nameBytes = encoder.encode(name);
    const checksum = crc32(data);
    this.files.push({ nameBytes, data, checksum });
  }

  generate() {
    let localHeadersSize = 0;
    let centralDirSize = 0;

    for (const f of this.files) {
      localHeadersSize += 30 + f.nameBytes.length + f.data.length;
      centralDirSize += 46 + f.nameBytes.length;
    }

    const totalSize = localHeadersSize + centralDirSize + 22;
    const out = new Uint8Array(totalSize);
    const dv = new DataView(out.buffer);

    let offset = 0;
    const offsets = [];

    // 1) Local File Headers + Data
    for (const f of this.files) {
      offsets.push(offset);
      dv.setUint32(offset, 0x04034B50, true); offset += 4;  // signature
      dv.setUint16(offset, 20, true); offset += 2;          // version needed
      dv.setUint16(offset, 0, true); offset += 2;           // flags
      dv.setUint16(offset, 0, true); offset += 2;           // compression = 0 (STORE)
      dv.setUint16(offset, 0, true); offset += 2;           // mod time
      dv.setUint16(offset, 0, true); offset += 2;           // mod date
      dv.setUint32(offset, f.checksum, true); offset += 4;  // crc32
      dv.setUint32(offset, f.data.length, true); offset += 4; // compressed size
      dv.setUint32(offset, f.data.length, true); offset += 4; // uncompressed size
      dv.setUint16(offset, f.nameBytes.length, true); offset += 2; // filename len
      dv.setUint16(offset, 0, true); offset += 2;           // extra field len

      out.set(f.nameBytes, offset); offset += f.nameBytes.length;
      out.set(f.data, offset); offset += f.data.length;
    }

    const centralDirStart = offset;

    // 2) Central Directory
    for (let i = 0; i < this.files.length; i++) {
      const f = this.files[i];
      const localOff = offsets[i];

      dv.setUint32(offset, 0x02014B50, true); offset += 4;  // signature
      dv.setUint16(offset, 20, true); offset += 2;          // version made by
      dv.setUint16(offset, 20, true); offset += 2;          // version needed
      dv.setUint16(offset, 0, true); offset += 2;           // flags
      dv.setUint16(offset, 0, true); offset += 2;           // compression = 0
      dv.setUint16(offset, 0, true); offset += 2;           // mod time
      dv.setUint16(offset, 0, true); offset += 2;           // mod date
      dv.setUint32(offset, f.checksum, true); offset += 4;  // crc32
      dv.setUint32(offset, f.data.length, true); offset += 4; // comp size
      dv.setUint32(offset, f.data.length, true); offset += 4; // uncomp size
      dv.setUint16(offset, f.nameBytes.length, true); offset += 2; // name len
      dv.setUint16(offset, 0, true); offset += 2;           // extra len
      dv.setUint16(offset, 0, true); offset += 2;           // comment len
      dv.setUint16(offset, 0, true); offset += 2;           // disk num
      dv.setUint16(offset, 0, true); offset += 2;           // int attr
      dv.setUint32(offset, 0, true); offset += 4;           // ext attr
      dv.setUint32(offset, localOff, true); offset += 4;    // offset of local header

      out.set(f.nameBytes, offset); offset += f.nameBytes.length;
    }

    const centralDirLength = offset - centralDirStart;

    // 3) End of Central Directory (EOCD)
    dv.setUint32(offset, 0x06054B50, true); offset += 4;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, this.files.length, true); offset += 2;
    dv.setUint16(offset, this.files.length, true); offset += 2;
    dv.setUint32(offset, centralDirLength, true); offset += 4;
    dv.setUint32(offset, centralDirStart, true); offset += 4;
    dv.setUint16(offset, 0, true); offset += 2;

    return out;
  }
}

/* ── 2. OpenXML XML Shablonlari ── */

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Smeta va Tannarx" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

/** xl/styles.xml — ranglar, shriftlar, hoshiyalar va formatlar */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0\\ &quot;so'm&quot;"/>
  </numFmts>
  <fonts count="6">
    <font><name val="Calibri"/><sz val="10"/></font>
    <font><b/><name val="Calibri"/><sz val="15"/><color rgb="FF1E293B"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FF1E293B"/></font>
    <font><b/><name val="Calibri"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Calibri"/><sz val="13"/><color rgb="FF047857"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <border>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
    <border>
      <top style="thin"><color rgb="FF10B981"/></top>
      <bottom style="double"><color rgb="FF047857"/></bottom>
    </border>
  </borders>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <!-- 1: Project Title -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/>
    <!-- 2: Section Header (Fill light slate) -->
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <!-- 3: Table Header (Navy Blue, White text) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 4: Regular text cell -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>
    <!-- 5: Regular number/currency cell -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 6: Regular integer quantity cell -->
    <xf numFmtId="3" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 7: Section Total (Bold, Gray background) -->
    <xf numFmtId="164" fontId="4" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="right"/>
    </xf>
    <!-- 8: Grand Total (Emerald green, 13pt bold) -->
    <xf numFmtId="164" fontId="5" fillId="5" borderId="3" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="right"/>
    </xf>
  </cellXfs>
</styleSheet>`;

/* ── 3. Smeta Ma'lumotlarini Yig'ish va Sheet1 Generatsiyasi ── */

/* TZ-18: yorliqlar — standart o'zbekcha (eski sayt va testlar uchun aynan avvalgi matn); yangi sayt opts.yorliq bilan
   tanlangan tildagi matnni beradi. {nom}, {d}, {p}, {n} — o'rniga qo'yiladi. */
export const XLSX_YORLIQ_UZ = {
  loyiha: 'Smart3D Mebel Loyihasi', sarlavha: 'SMART3D · {nom}', sana: "Sana: {d} · Valyuta: UZS (so'm)", locale: 'uz-UZ',
  b1: '1. MEBEL MODULLARI VA MIJOZ KOTIROVKASI', b1h: ['№', 'Modul kodi', 'Modul nomi', "O'lchamlari (K×Ch×B mm)", 'Soni', 'Birlik narxi', 'Summa'],
  b1j: "1-BO'LIM JAMI (Kotirovka):", yoq: "— yo'q —", narxYoq: "narx yo'q",
  b2: '2. PLITA VA KROMKA MATERIALLARI', b2h: ['№', 'Material', 'Format / qalinlik', 'Birlik', 'Miqdori', 'Birlik narxi', 'Summa'], b2j: "2-BO'LIM JAMI (Materiallar):",
  b3: '3. FURNITURA VA MEXANIZMLAR', b3h: ['№', 'Artikul / Kod', 'Furnitura nomi', 'Birlik', 'Miqdori', 'Birlik narxi', 'Summa'], b3j: "3-BO'LIM JAMI (Furnitura):",
  b4: '4. ISHLAB CHIQARISH XIZMATLARI VA ISH HAQI', b4h: ['№', 'Kod', 'Nomi', "O'lchov birligi", 'Hajmi', 'Tarif', 'Summa'], b4j: "4-BO'LIM JAMI (Xizmatlar):",
  b5: '5. TANNARX, FOYDA VA YAKUNIY XULOSA', b5h: ['№', 'Modda', 'Tavsif', 'Hisob asosi', '', 'Ulush (%)', 'Summa'],
  tannarx: 'Tannarx', tannarxT: 'Materiallar + Furnitura + Xizmatlar va ish haqi', tannarxA: "2 + 3 + 4 bo'limlar",
  ustama: 'Ustama (foyda)', ustamaT: 'Tannarxga nisbatan', ustamaA: '{p}% ustama',
  yakuniy: "MIJOZ TO'LAYDIGAN YAKUNIY SUMMA:", toliqEmas: "* Smeta to'liq emas: {n} ta narx bazada yo'q (0 so'm deb olingan) — ", dona: 'dona'
};
const qoy = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

/**
 * 5-bo'limli to'liq Excel smetasini yaratish.
 * @param {Object} opts — {materials, priceRes, prod, projectName}  (2–5-bo'limlar — prod.lines dan)
 * @returns {Uint8Array} — .xlsx binar fayli
 */
export function buildXLSX(opts = {}) {
  const priceRes = opts.priceRes || { lines: [], total: 0 };
  const prod = opts.prod || { lines: [], total: 0 };
  const Y = Object.assign({}, XLSX_YORLIQ_UZ, opts.yorliq || {});
  const projectName = opts.projectName || Y.loyiha;
  const modulNomi = opts.modulNomi || ((l) => l.name || '');        // 1-bo'lim: modul nomi (tanlangan tilda)
  const qatorNomi = opts.qatorNomi || ((l) => l.name);              // 2–4-bo'lim: tannarx satri nomi
  const birlik = opts.birlik || ((u) => u);                         // varaq / m / dona / detal

  const rowsXml = [];
  let rowIdx = 1;

  function addRow(cells, customHeight = null) {
    const hAttr = customHeight ? ` ht="${customHeight}" customHeight="1"` : '';
    const cellXmls = cells.map((c, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      const ref = `${colLetter}${rowIdx}`;
      const s = c.s != null ? ` s="${c.s}"` : '';
      if (typeof c.v === 'number') {
        return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
      } else {
        return `<c r="${ref}" t="inlineStr"${s}><is><t>${escapeXml(c.v != null ? c.v : '')}</t></is></c>`;
      }
    });
    rowsXml.push(`<row r="${rowIdx}"${hAttr}>${cellXmls.join('')}</row>`);
    rowIdx++;
  }

  // Sarlavha
  addRow([{ v: qoy(Y.sarlavha, { nom: projectName.toUpperCase() }), s: 1 }], 28);
  addRow([{ v: qoy(Y.sana, { d: new Date().toLocaleDateString(Y.locale) }), s: 0 }]);
  addRow([]); // bo'sh qator

  /* ════════ 1-BO'LIM: MEBEL MODULLARI (KOTIROVKA) ════════ */
  addRow([{ v: Y.b1, s: 2 }], 22);
  addRow(Y.b1h.map(h => ({ v: h, s: 3 })), 20);

  let p1Sum = 0;
  let idx = 1;
  for (const l of priceRes.lines || []) {
    const amount = +l.amount || 0;
    p1Sum += amount;
    addRow([
      { v: idx++, s: 4 },
      { v: l.code || '', s: 4 },
      { v: modulNomi(l) || '', s: 4 },
      { v: `${l.w || 0} × ${l.d || 0} × ${l.h || 0}`, s: 4 },
      { v: +l.qty || 1, s: 6 },
      { v: +l.unit_price || 0, s: 5 },
      { v: amount, s: 5 }
    ]);
  }
  addRow([
    { v: "", s: 7 },
    { v: "", s: 7 },
    { v: Y.b1j, s: 7 },
    { v: "", s: 7 },
    { v: "", s: 7 },
    { v: "", s: 7 },
    { v: p1Sum, s: 7 }
  ], 20);
  addRow([]);

  /* ════════ 2–4-BO'LIMLAR: TANNARX SATRLARI ════════
   * Hammasi productionCost() natijasidan (prod.lines) — UI dagi "Sex tannarxi" bilan
   * aynan bir xil raqamlar. Narxi bazada yo'q satr 0 so'm va "narx yo'q" belgisi bilan. */
  const prodLines = prod.lines || [];
  const panelMeta = {};
  for (const m of (opts.materials && opts.materials.panel_materials) || []) panelMeta[m.code] = m;

  function costSection(title, header, lines, totalLabel, cellsOf) {
    addRow([{ v: title, s: 2 }], 22);
    addRow(header.map(h => ({ v: h, s: 3 })), 20);
    let sum = 0, i = 1;
    for (const l of lines) {
      sum += +l.amount || 0;
      addRow([{ v: i++, s: 4 }].concat(cellsOf(l)));
    }
    if (!lines.length) addRow([{ v: '', s: 4 }, { v: Y.yoq, s: 4 }]);
    addRow([
      { v: "", s: 7 }, { v: "", s: 7 }, { v: totalLabel, s: 7 },
      { v: "", s: 7 }, { v: "", s: 7 }, { v: "", s: 7 }, { v: sum, s: 7 }
    ], 20);
    addRow([]);
    return sum;
  }
  const priceCell = (l) => (l.no_price ? { v: Y.narxYoq, s: 4 } : { v: +l.unit_price || 0, s: 5 });

  const p2Sum = costSection(
    Y.b2, Y.b2h,
    prodLines.filter(l => /^Plita|^Kromka/.test(l.group)),
    Y.b2j,
    (l) => {
      const m = panelMeta[l.code];
      const fmt = m && m.sheets && m.sheets[0] ? `${m.sheets[0][0]} × ${m.sheets[0][1]} · ${m.thickness} mm` : '';
      return [{ v: qatorNomi(l) || l.code, s: 4 }, { v: fmt, s: 4 }, { v: birlik(l.unit || ''), s: 4 },
              { v: +l.qty || 0, s: 6 }, priceCell(l), { v: +l.amount || 0, s: 5 }];
    });

  const p3Sum = costSection(
    Y.b3, Y.b3h,
    prodLines.filter(l => l.group === 'Furnitura'),
    Y.b3j,
    (l) => [{ v: l.code || '', s: 4 }, { v: qatorNomi(l) || '', s: 4 }, { v: birlik(l.unit || Y.dona), s: 4 },
            { v: +l.qty || 0, s: 6 }, priceCell(l), { v: +l.amount || 0, s: 5 }]);

  const p4Sum = costSection(
    Y.b4, Y.b4h,
    prodLines.filter(l => l.group === 'Xizmatlar' || l.group === 'Raspil' || l.group === 'Ish haqi'),   // TZ-20: raspil — xizmat
    Y.b4j,
    (l) => [{ v: l.code || '', s: 4 }, { v: qatorNomi(l) || '', s: 4 }, { v: birlik(l.unit || ''), s: 4 },
            { v: +l.qty || 0, s: 6 }, priceCell(l), { v: +l.amount || 0, s: 5 }]);

  /* ════════ 5-BO'LIM: YAKUNIY FOYDA VA TANNARX XULOSASI ════════ */
  addRow([{ v: Y.b5, s: 2 }], 22);
  addRow(Y.b5h.map(h => ({ v: h, s: 3 })), 20);

  /* UI va 1-bo'lim bilan bir xil: tannarx = 2+3+4, mijoz narxi = tannarx × (1 + ustama) */
  const directCost = p2Sum + p3Sum + p4Sum;
  const markupPct = Math.round((prod.markupPct != null ? prod.markupPct : (prod.margin || 1) - 1) * 100);
  const finalTotal = prod.clientTotal != null ? prod.clientTotal : Math.round(directCost * (1 + markupPct / 100));
  const marginAmt = finalTotal - directCost;
  const pct = (x) => (finalTotal ? `${Math.round(x / finalTotal * 100)}%` : '0%');

  addRow([
    { v: 1, s: 4 },
    { v: Y.tannarx, s: 4 },
    { v: Y.tannarxT, s: 4 },
    { v: Y.tannarxA, s: 4 },
    { v: "", s: 4 },
    { v: pct(directCost), s: 4 },
    { v: directCost, s: 5 }
  ]);
  addRow([
    { v: 2, s: 4 },
    { v: Y.ustama, s: 4 },
    { v: Y.ustamaT, s: 4 },
    { v: qoy(Y.ustamaA, { p: markupPct }), s: 4 },
    { v: "", s: 4 },
    { v: pct(marginAmt), s: 4 },
    { v: marginAmt, s: 5 }
  ]);

  addRow([
    { v: "★", s: 8 },
    { v: Y.yakuniy, s: 8 },
    { v: "", s: 8 },
    { v: "", s: 8 },
    { v: "", s: 8 },
    { v: "100%", s: 8 },
    { v: finalTotal, s: 8 }
  ], 26);
  if ((prod.missing || []).length) {
    addRow([]);
    addRow([{ v: qoy(Y.toliqEmas, { n: prod.missing.length }) + prod.missing.map(m => m.name || m.code).join(', '), s: 0 }]);
  }

  // Ustun kengliklari
  const colsXml = `
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="38" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
    <col min="5" max="5" width="12" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
  </cols>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>
    ${rowsXml.join('\n')}
  </sheetData>
</worksheet>`;

  /* ── 4. OpenXML ZIP Arxivini yig'ish ── */
  const zip = new SimpleZip();
  zip.addFile('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.addFile('_rels/.rels', ROOT_RELS_XML);
  zip.addFile('xl/workbook.xml', WORKBOOK_XML);
  zip.addFile('xl/_rels/workbook.xml.rels', WORKBOOK_RELS_XML);
  zip.addFile('xl/styles.xml', STYLES_XML);
  zip.addFile('xl/worksheets/sheet1.xml', sheetXml);

  return zip.generate();
}
