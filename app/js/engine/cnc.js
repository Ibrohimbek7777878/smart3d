/* Smart3D engine/cnc.js — CNC export post-processorlari.
 *
 * 1) nestDXF(nest)            — raskroy varaq(lar) → minimal DXF (LINE + CIRCLE,
 *                               R12-siz, hamma CAD/CNC'da ochiladi: LibreCAD,
 *                               SheetCam, ArtCAM, Fusion, laser pultlar)
 * 2) drillNC(nest, cutlists)  — teshiklar → Excellon (METRIC, TZ) — Biesse/Homag
 *                               uslubidagi NC drayllar
 * 3) ptpCSV(nest, cutlists)   — panel pozitsiyalari (PTP/DP line uchun CSV)
 * 4) cutGCode(nest, cutlists) — sanoat darajasidagi ISO G-code:
 *                               - Asbob radiusi kompensatsiyasi (toolDia / 2 tashqariga offset)
 *                               - Prisadka teshiklarini konturdan oldin burg'ulash
 *                               - Kichik panellar uchun holding tabs (mikro-ko'priklar)
 *
 * Join: nesting part.id = placementId + ':' + cutlist.ref
 *       cutlist.cl.placementId = placement id (app.js stamp qiladi)
 * Hole coords: part-local (x,y) → sheet coords (+ aylantirish) → DXF/NC Y-up.
 */

/* ── Yordamchi: hole'ni varaq koordinatasiga o'tkazish ─────────────────────
 * Teshik lokal o'qlari (cutlist.js konvensiyasi):
 *   h.x — EN bo'ylab F chetdan,  h.y — UZUNLIK bo'ylab L chetdan.
 * Varaq ustida detal qanday yotgani (nesting.js):
 *   rotated=false → detal uzunligi varaq X bo'ylab, eni Y bo'ylab:
 *       sheet x = part.x + h.y (uzunlik),  sheet y = part.y + h.x (en)
 *   rotated=true  → detal eni varaq X bo'ylab, uzunligi Y bo'ylab:
 *       sheet x = part.x + h.x (en),       sheet y = part.y + h.y (uzunlik)
 * (Eski kodda bu ikki filial ALMASGAN edi — natijada 56 teshikdan 0 tasi
 *  o'z detaliga tushmagan, xato 1926 mm gacha.) */
function holeToSheet(h, part, sheetW, flipY) {
  let x, y;
  if (part.rotated) {
    x = part.x + (h.x || 0);
    y = part.y + (h.y || 0);
  } else {
    x = part.x + (h.y || 0);
    y = part.y + (h.x || 0);
  }
  if (flipY) y = sheetW - y;   // y pastdan yuqoriga (DXF/Excellon konvensiyasi)
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/** nest sheets + cutlists → [{sheet, material, holes:[{x,y,dia,depth,partRef,kind}]}] */
function collectSheetHoles(nest, cutlists) {
  const holesByPlacement = {};
  for (const cl of cutlists || []) {
    if (cl.placementId != null) holesByPlacement[cl.placementId] = cl.holes || [];
  }
  const out = [];
  for (const mat in (nest.by_material || {})) {
    const nm = nest.by_material[mat];
    for (const sheet of nm.sheets || []) {
      const holes = [];
      for (const part of sheet.parts || []) {
        const ref = String(part.ref || '');
        const pid = ref.includes(':') ? ref.slice(0, ref.indexOf(':')) : null;
        const fragHoles = holesByPlacement[pid] || [];
        for (const h of fragHoles) {
          /* F2: moyka kesimi (kind=cutout) — CNC drill uchun emas (ichki kontur hali yo'q);
           * TZ-06: torets teshigi (side 'T') varaqda teshilmaydi — gorizontal prisadka stanogida */
          if (h.kind === 'cutout' || h.side === 'T' || !(h.dia > 0)) continue;
          const refPart = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
          const refBase = refPart.split('#')[0];
          if (h.part !== refBase) continue;
          if (h.ref && h.ref !== refPart) continue;                 // D6: teshik faqat shu nusxada (chap/o'ng yon devor)
          const n = Math.max(1, Math.round(+h.qty || 1));
          for (let k = 0; k < n; k++) {
            holes.push({
              ...holeToSheet(h, part, sheetWOf(sheet), true),
              dia: h.dia, depth: h.depth, kind: h.kind || 'drill',
              partRef: ref, partX: part.x, partY: part.y
            });
          }
        }
      }
      out.push({ sheet, material: mat, holes });
    }
  }
  return out;
}
function sheetWOf(sheet) { return sheet.width; }

/** F2: moyka/kontur kesimlari (kind=cutout) — DETAL/nest fazosida (G-code p.y bilan bir xil).
 *  Markaz: x=EN (F chetdan), y=UZUNLIK (L chetdan); len = varaq X (detal uzunlik), wid = varaq Y. */
function collectSheetCutouts(nest, cutlists) {
  const byPlacement = {};
  for (const cl of cutlists || []) {
    if (cl.placementId != null) {
      byPlacement[cl.placementId] = (cl.holes || []).filter(h => h.kind === 'cutout');
    }
  }
  const out = [];
  for (const mat in (nest.by_material || {})) {
    const nm = nest.by_material[mat];
    for (const sheet of nm.sheets || []) {
      const cutouts = [];
      for (const part of sheet.parts || []) {
        const ref = String(part.ref || '');
        const pid = ref.includes(':') ? ref.slice(0, ref.indexOf(':')) : null;
        const list = byPlacement[pid] || [];
        if (!list.length) continue;
        const refPart = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
        const refBase = refPart.split('#')[0];
        for (const h of list) {
          if (h.part !== refBase) continue;
          if (h.ref && h.ref !== refPart) continue;                 // D6: teshik faqat shu nusxada (chap/o'ng yon devor)
          const sizeW = +h.d || +h.w || 0;   // en bo'ylab (x)
          const sizeL = +h.w || sizeW;       // uzunlik bo'ylab (y)
          let cx, cy, lenS, widS;
          if (part.rotated) {
            cx = part.x + (+h.x || 0) + sizeW / 2;
            cy = part.y + (+h.y || 0) + sizeL / 2;
            lenS = sizeW; widS = sizeL;
          } else {
            cx = part.x + (+h.y || 0) + sizeL / 2;
            cy = part.y + (+h.x || 0) + sizeW / 2;
            lenS = sizeL; widS = sizeW;
          }
          cutouts.push({
            x: Math.round(cx * 100) / 100, y: Math.round(cy * 100) / 100,
            len: lenS, wid: widS, ref
          });
        }
      }
      out.push({ sheet, material: mat, cutouts });
    }
  }
  return out;
}

/* ── 1) DXF ──────────────────────────────────────────────────────────────── */
export function nestDXF(nest) {
  const L = [];
  const pair = (code, val) => { L.push(String(code), String(val)); };
  const line = (layer, x1, y1, x2, y2) => {
    pair(0, 'LINE'); pair(8, layer);
    pair(10, Math.round(x1 * 100) / 100); pair(20, Math.round(y1 * 100) / 100);
    pair(11, Math.round(x2 * 100) / 100); pair(21, Math.round(y2 * 100) / 100);
  };
  const circle = (layer, cx, cy, r) => {
    pair(0, 'CIRCLE'); pair(8, layer);
    pair(10, Math.round(cx * 100) / 100); pair(20, Math.round(cy * 100) / 100);
    pair(40, Math.round(r * 100) / 100);
  };

  pair(0, 'SECTION'); pair(2, 'ENTITIES');

  const sheetsData = collectSheetHoles(nest, nest._cutlists || []);
  /* F2: ichki konturlar (moyka) — CUTOUT qatlami */
  const cutBySheet = {};
  for (const sd of collectSheetCutouts(nest, nest._cutlists || [])) {
    cutBySheet[sd.sheet.no + '_' + sd.material] = sd.cutouts || [];
  }
  const sheetList = sheetsData.length ? sheetsData
    : Object.keys(nest.by_material || {}).flatMap(mat =>
        (nest.by_material[mat].sheets || []).map(sheet => ({ sheet, material: mat, holes: [] })));

  /* Har bir varaq o'z nixosida (0,0) boshlansa — ular ustma-ust tushadi va
   * bitta CAD/CNC dasturida kesish mumkin emas. Varaqlarni Y bo'ylab ajratamiz. */
  const SHEET_GAP = 50;   // mm oraliq
  let sheetOy = 0;

  for (const { sheet, material, holes } of sheetList) {
    const SW = sheet.width;
    const SL = sheet.length;
    const trimL = sheet.trimL || 0;
    const trimW = sheet.trimW || 0;
    const oy = sheetOy;          // shu varaqning Y-offseti
    sheetOy += SW + SHEET_GAP;

    /* varaq chegarasi (SHEET) */
    line('SHEET', 0, oy, SL, oy);
    line('SHEET', SL, oy, SL, oy + SW);
    line('SHEET', SL, oy + SW, 0, oy + SW);
    line('SHEET', 0, oy + SW, 0, oy);

    /* tozalangan ishchi maydon chegarasi (TRIM) */
    if (trimL > 0 || trimW > 0) {
      line('TRIM', trimL, oy + trimW, SL - trimL, oy + trimW);
      line('TRIM', SL - trimL, oy + trimW, SL - trimL, oy + SW - trimW);
      line('TRIM', SL - trimL, oy + SW - trimW, trimL, oy + SW - trimW);
      line('TRIM', trimL, oy + SW - trimW, trimL, oy + trimW);
    }

    /* detallar (PART — Y-up flip) */
    for (const p of sheet.parts || []) {
      const fw = p.rotated ? p.width : p.length;
      const fh = p.rotated ? p.length : p.width;
      const x = p.x, yb = oy + SW - (p.y + fh);
      line('PART', x, yb, x + fw, yb);
      line('PART', x + fw, yb, x + fw, yb + fh);
      line('PART', x + fw, yb + fh, x, yb + fh);
      line('PART', x, yb + fh, x, yb);
    }
    /* teshiklar (HOLES) */
    for (const h of holes) circle('HOLES', h.x, oy + h.y, h.dia / 2);

    /* F2: ichki konturlar (moyka kesimi) — DETAL fazosida, Y-up flip */
    for (const co of cutBySheet[sheet.no + '_' + material] || []) {
      const x0 = co.x - co.len / 2, x1 = co.x + co.len / 2;
      const yb = oy + SW - (co.y + co.wid / 2);
      const yt = oy + SW - (co.y - co.wid / 2);
      line('CUTOUT', x0, yb, x1, yb);
      line('CUTOUT', x1, yb, x1, yt);
      line('CUTOUT', x1, yt, x0, yt);
      line('CUTOUT', x0, yt, x0, yb);
    }
  }

  pair(0, 'ENDSEC');
  pair(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

/* ── 2) Excellon NC ──────────────────────────────────────────────────────── */
export function drillNC(nest, cutlists) {
  const sheetsData = collectSheetHoles(nest, cutlists);
  const tools = {};
  for (const sd of sheetsData) {
    for (const h of sd.holes) {
      const key = h.dia.toFixed(2);
      (tools[key] = tools[key] || []).push(h);
    }
  }
  const diaList = Object.keys(tools).map(Number).sort((a, b) => a - b);
  const toolNo = {};
  diaList.forEach((d, i) => { toolNo[d.toFixed(2)] = i + 1; });

  const L = [];
  L.push('M48');
  L.push(';Smart3D — teshik dasturi (Excellon)');
  L.push(';Jami varaq: ' + sheetsData.length + ' · vazifa: ' + diaList.length);
  L.push('METRIC,TZ');
  for (const d of diaList) {
    const t = toolNo[d.toFixed(2)];
    L.push('T' + String(t).padStart(2, '0') + 'C' + d.toFixed(2));
  }
  L.push('%');
  L.push('G90');
  L.push('G05');   // drill mode

  for (let si = 0; si < sheetsData.length; si++) {
    const sd = sheetsData[si];
    L.push('');
    L.push(';--- SHEET ' + sd.sheet.no + ' (' + sd.material + ') ' +
      sd.sheet.length + 'x' + sd.sheet.width + ' mm · ' + sd.holes.length + ' teshik ---');
    for (const d of diaList) {
      const hs = sd.holes.filter(h => h.dia.toFixed(2) === d.toFixed(2));
      if (!hs.length) continue;
      L.push('T' + String(toolNo[d.toFixed(2)]).padStart(2, '0'));
      for (const h of hs) {
        L.push('X' + h.x.toFixed(2) + 'Y' + h.y.toFixed(2) +
          ';Z' + (-Math.abs(h.depth || 13)).toFixed(1) + ' ' + (h.kind || 'drill'));
      }
    }
  }
  L.push('');
  L.push('T00');
  L.push('M30');
  return L.join('\r\n') + '\r\n';
}

/* ── 3) PTP CSV ──────────────────────────────────────────────────────────── */
export function ptpCSV(nest, cutlists) {
  const sheetsData = collectSheetHoles(nest, cutlists);
  const head = 'Varaq;Material;Detal;Ref;X(mm);Y(mm);Eni;Boy;Aylangan;Teshik;Kromka';
  const rows = [];
  for (const sd of sheetsData) {
    for (const p of sd.sheet.parts || []) {
      const holeCount = sd.holes.filter(h => h.partRef === p.ref).length;
      rows.push([
        sd.sheet.no, sd.material, p.code || '', p.ref,
        p.x, p.y, p.length, p.width, p.rotated ? 'Ha' : "Yo'q",
        holeCount, p.material || ''
      ].join(';'));
    }
  }
  return '\ufeff' + head + '\r\n' + rows.join('\r\n') + '\r\n';
}

/* ── 4) Sanoat darajasidagi G-code (ISO/Fanuc) ───────────────────────────── */
/**
 * Kontur kesim + Prisadka burg'ulash (ISO/Fanuc G-code).
 * - Asbob radiusi kompensatsiyasi (toolDia / 2)
 * - Prisadka teshiklarini konturdan oldin burg'ulash
 * - Kichik panellar uchun holding tabs (ko'priklar)
 */
export function cutGCode(nest, cutlists, opts) {
  opts = opts || {};
  const feed = opts.feed || 3000;         // mm/min ishchi harakat
  const plunge = opts.plunge || 800;      // mm/min tushish
  const spindle = opts.spindle || 18000;  // rpm
  const depth = opts.depth || 16;         // mm panel qalinligi
  const safeZ = opts.safeZ || 5;          // mm xavfsiz Z balandligi
  const toolDia = opts.toolDia || 6.0;    // mm router freza diametri
  const r = toolDia / 2;                  // radius kompensatsiyasi
  const tabHeight = opts.tabHeight || 2.0; // mm ko'prik balandligi
  const tabWidth = opts.tabWidth || 15.0;  // mm ko'prik kengligi
  const addTabs = opts.addTabs !== false; // avtomatik ko'priklar
  const includeDrill = opts.includeDrill !== false; // avval teshiklarni burg'ulash

  const L = [];
  L.push('%');
  L.push('O1000;');
  L.push(';Smart3D — Sanoat darajasidagi G-code (CAM)');
  L.push(';Asbob: Ø' + toolDia + ' mm · Kompensatsiya: ' + r + ' mm · Chuqurlik: ' + depth + ' mm');
  L.push('G21;                             ;Metrik (mm)');
  L.push('G90;                             ;Absolyut koordinatalar');
  L.push('G17;                             ;XY tekislik');
  L.push('G40;                             ;Dasturiy kompensatsiya (offset kiritilgan)');
  L.push('T01 M06;                         ;Asbob o\'rnatish');
  L.push('S' + spindle + ' M03;            ;Spindle ishga tushirish');
  L.push('G04 P2;                          ;Aylanish tezligini kutish 2s');

  const sheetsData = collectSheetHoles(nest, cutlists);
  const sheetMapHoles = {};
  for (const sd of sheetsData) {
    sheetMapHoles[sd.sheet.no + '_' + sd.material] = sd.holes || [];
  }
  /* F2: ichki konturlar (moyka) */
  const cutoutMap = {};
  for (const sd of collectSheetCutouts(nest, cutlists)) {
    cutoutMap[sd.sheet.no + '_' + sd.material] = sd.cutouts || [];
  }

  const sheets = Object.keys(nest.by_material || {});
  for (const mat of sheets) {
    const nm = nest.by_material[mat];
    for (let si = 0; si < (nm.sheets || []).length; si++) {
      const sheet = nm.sheets[si];
      const sKey = sheet.no + '_' + mat;
      const sheetHoles = sheetMapHoles[sKey] || [];

      L.push('');
      L.push(';================================================================');
      L.push(';=== VARAQ ' + sheet.no + ' (' + mat + ') ' + sheet.length + 'x' + sheet.width + ' mm ===');
      L.push(';================================================================');

      /* 1-BOSQICH: PRISADKA (TESHIKLAR) — varaq butunligida tebranmay burg'ulanadi */
      if (includeDrill && sheetHoles.length > 0) {
        L.push(';--- BOSQICH 1: Teshiklar (Prisadka) Jami: ' + sheetHoles.length + ' ta ---');
        for (const h of sheetHoles) {
          const hDepth = Math.abs(h.depth || 13);
          L.push('G0 Z' + safeZ + ';');
          L.push('G0 X' + h.x.toFixed(2) + ' Y' + h.y.toFixed(2) + ';');
          L.push('G1 Z-' + hDepth.toFixed(2) + ' F' + plunge + ';');
          L.push('G0 Z' + safeZ + ';');
        }
      }

      /* 2a-BOSQICH: ICHKI KONTUR (moyka kesimi) — detaldan chiqmasdan OLDIN kesiladi,
         shunda detal holding tab bilan mahkam turadi va ichki qism tushib ketmaydi */
      const sheetCutouts = cutoutMap[sKey] || [];
      if (sheetCutouts.length) {
        L.push(';--- BOSQICH 2a: Ichki konturlar (moyka kesimi) Jami: ' + sheetCutouts.length + ' ---');
        for (const co of sheetCutouts) {
          const x0 = co.x - co.len / 2 + r;
          const y0 = co.y - co.wid / 2 + r;
          const x1 = co.x + co.len / 2 - r;
          const y1 = co.y + co.wid / 2 - r;
          if (x1 <= x0 || y1 <= y0) {
            L.push("; Cutout " + (co.ref || '') + " — asbob diametridan kichik, o'tkazib yuborildi");
            continue;
          }
          L.push(';--- Cutout: ' + (co.ref || '') + ' ---');
          L.push('G0 Z' + safeZ + ';');
          L.push('G0 X' + x0.toFixed(2) + ' Y' + y0.toFixed(2) + ';');
          L.push('G1 Z-' + depth.toFixed(2) + ' F' + plunge + ';');
          L.push('G1 X' + x1.toFixed(2) + ' Y' + y0.toFixed(2) + ' F' + feed + ';');
          L.push('G1 X' + x1.toFixed(2) + ' Y' + y1.toFixed(2) + ';');
          L.push('G1 X' + x0.toFixed(2) + ' Y' + y1.toFixed(2) + ';');
          L.push('G1 X' + x0.toFixed(2) + ' Y' + y0.toFixed(2) + ';');
          L.push('G0 Z' + safeZ + ';');
        }
      }

      /* 2-BOSQICH: KONTUR FREZALASH (Asbob radiusi offseti va holding tab bilan) */
      L.push(';--- BOSQICH 2: Tashqi kontur kesimi (Tool radius r=' + r + ' mm kompensatsiyasi) ---');
      for (const p of sheet.parts || []) {
        const x = +p.x || 0, y = +p.y || 0;
        const len = p.rotated ? p.width : p.length;
        const wid = p.rotated ? p.length : p.width;
        const areaM2 = (len * wid) / 1e6;
        const needTabs = addTabs && (areaM2 < 0.25 || opts.forceTabs);

        // Tashqi kontur koordinatalari (freza markazi uchun tashqi offset)
        const xMin = x - r;
        const yMin = y - r;
        const xMax = x + len + r;
        const yMax = y + wid + r;

        L.push('');
        L.push(';--- Detal: ' + (p.code || 'PANEL') + ' (' + p.ref + ') ' + len + 'x' + wid + ' mm ---');
        L.push('G0 Z' + safeZ + ';');
        L.push('G0 X' + xMin.toFixed(2) + ' Y' + yMin.toFixed(2) + ';');
        L.push('G1 Z-' + depth.toFixed(2) + ' F' + plunge + ';');

        // Pastki qirra (xMin, yMin) -> (xMax, yMin)
        if (needTabs && (xMax - xMin) > tabWidth * 2) {
          const midX = (xMin + xMax) / 2;
          const t1 = midX - tabWidth / 2;
          const t2 = midX + tabWidth / 2;
          L.push('G1 X' + t1.toFixed(2) + ' Y' + yMin.toFixed(2) + ' F' + feed + ';');
          L.push('G1 Z-' + (depth - tabHeight).toFixed(2) + ' F' + plunge + ';  ;Tab (ko\'prik)');
          L.push('G1 X' + t2.toFixed(2) + ' Y' + yMin.toFixed(2) + ' F' + feed + ';');
          L.push('G1 Z-' + depth.toFixed(2) + ' F' + plunge + ';');
          L.push('G1 X' + xMax.toFixed(2) + ' Y' + yMin.toFixed(2) + ' F' + feed + ';');
        } else {
          L.push('G1 X' + xMax.toFixed(2) + ' Y' + yMin.toFixed(2) + ' F' + feed + ';');
        }

        // O'ng qirra (xMax, yMin) -> (xMax, yMax)
        L.push('G1 X' + xMax.toFixed(2) + ' Y' + yMax.toFixed(2) + ';');

        // Yuqori qirra (xMax, yMax) -> (xMin, yMax)
        if (needTabs && (xMax - xMin) > tabWidth * 2) {
          const midX = (xMin + xMax) / 2;
          const t2 = midX + tabWidth / 2;
          const t1 = midX - tabWidth / 2;
          L.push('G1 X' + t2.toFixed(2) + ' Y' + yMax.toFixed(2) + ' F' + feed + ';');
          L.push('G1 Z-' + (depth - tabHeight).toFixed(2) + ' F' + plunge + ';  ;Tab (ko\'prik)');
          L.push('G1 X' + t1.toFixed(2) + ' Y' + yMax.toFixed(2) + ' F' + feed + ';');
          L.push('G1 Z-' + depth.toFixed(2) + ' F' + plunge + ';');
          L.push('G1 X' + xMin.toFixed(2) + ' Y' + yMax.toFixed(2) + ' F' + feed + ';');
        } else {
          L.push('G1 X' + xMin.toFixed(2) + ' Y' + yMax.toFixed(2) + ';');
        }

        // Chap qirra (xMin, yMax) -> (xMin, yMin) (konturni yopish)
        L.push('G1 X' + xMin.toFixed(2) + ' Y' + yMin.toFixed(2) + ';');
        L.push('G0 Z' + safeZ + ';');
      }
    }
  }

  L.push('');
  L.push('G0 Z' + (safeZ * 2) + ';');
  L.push('M05;                             ;Spindle to\'xtatish');
  L.push('G28 X0 Y0;                       ;Boshlang\'ich nuqtaga qaytish');
  L.push('M30;                             ;Dastur tugadi');
  L.push('%');
  return L.join('\r\n') + '\r\n';
}

/**
 * 5) Biesse Rover / bSolid uchun .cix dasturi (Kamchilik 8).
 * Har bir panel uchun teshiklar, paz va kontur kesimini Biesse CIX formatida generatsiya qiladi.
 */
export function biesseCIX(panel, holes = [], opts = {}) {
  const lpx = panel.length || 600;
  const lpy = panel.width || 400;
  const lpz = panel.thickness || 16;
  const name = panel.name || panel.code || 'PANEL';

  const L = [];
  L.push('BEGIN ID CID3');
  L.push('  REL = 3.0');
  L.push("  AXIS = 'X','Y','Z'");
  L.push('END ID');
  L.push('');
  L.push('BEGIN MACRO');
  L.push('  NAME = PANEL');
  L.push(`  PARAM,NAME=LPX,VALUE=${lpx.toFixed(2)}`);
  L.push(`  PARAM,NAME=LPY,VALUE=${lpy.toFixed(2)}`);
  L.push(`  PARAM,NAME=LPZ,VALUE=${lpz.toFixed(2)}`);
  L.push('  PARAM,NAME=ORIOPS,VALUE=1');
  L.push(`  PARAM,NAME=ALTY,VALUE='${name}'`);
  L.push('END MACRO');
  L.push('');

  // Teshiklar (Prisadka: BG makrosi)
  for (const h of holes) {
    const x = Math.max(0, Math.min(lpx, +h.x || 0));
    const y = Math.max(0, Math.min(lpy, +h.y || 0));
    const dia = +h.dia || 5;
    const depth = Math.abs(+h.depth || 13);

    L.push('BEGIN MACRO');
    L.push('  NAME = BG');
    L.push('  PARAM,NAME=SIDE,VALUE=0');
    L.push("  PARAM,NAME=CRN,VALUE='1'");
    L.push(`  PARAM,NAME=X,VALUE=${x.toFixed(2)}`);
    L.push(`  PARAM,NAME=Y,VALUE=${y.toFixed(2)}`);
    L.push('  PARAM,NAME=Z,VALUE=0.0');
    L.push(`  PARAM,NAME=DP,VALUE=${depth.toFixed(2)}`);
    L.push(`  PARAM,NAME=DIA,VALUE=${dia.toFixed(2)}`);
    L.push('  PARAM,NAME=THR,VALUE=0');
    L.push('END MACRO');
  }

  L.push('');
  L.push('BEGIN MACRO');
  L.push('  NAME = END');
  L.push('END MACRO');
  L.push('');
  return L.join('\r\n');
}

/**
 * 6) Homag / Weeke WoodWOP uchun .mpr dasturi (Kamchilik 8).
 */
export function woodwopMPR(panel, holes = [], opts = {}) {
  const lpx = panel.length || 600;
  const lpy = panel.width || 400;
  const lpz = panel.thickness || 16;
  const name = panel.name || panel.code || 'PANEL';

  const L = [];
  L.push('[H');
  L.push('VERSION="4.0"');
  L.push('FORMAT="WOP"');
  L.push(']');
  L.push('[001');
  L.push(`L=${lpx.toFixed(1)}`);
  L.push(`W=${lpy.toFixed(1)}`);
  L.push(`T=${lpz.toFixed(1)}`);
  L.push(`KM="${name}"`);
  L.push(']');
  L.push('');

  // Teshiklar (BohrVert)
  let hIdx = 100;
  for (const h of holes) {
    const x = Math.max(0, Math.min(lpx, +h.x || 0));
    const y = Math.max(0, Math.min(lpy, +h.y || 0));
    const dia = +h.dia || 5;
    const depth = Math.abs(+h.depth || 13);

    L.push(`<${hIdx++} \\BohrVert\\`);
    L.push(`X=${x.toFixed(1)}`);
    L.push(`Y=${y.toFixed(1)}`);
    L.push(`Z=${depth.toFixed(1)}`);
    L.push(`DM=${dia.toFixed(1)}`);
    L.push('TI=1');
    L.push('AN=1');
    L.push('');
  }

  return L.join('\r\n');
}

/* ── Fazali kesim rejasi: guillotine ───────────────────────────────────────
 * Har bir kesim DETAL ICHIDAN o'tmaydi (Kamchilik C7): kesim faqat detallar
 * orasidagi BO'SHLIK markazidan o'tkaziladi. Diagonal proeksiya bo'shliqlari
 * orasidan kesim topilib, varaq guillotine uslubida bo'laklarga ajratiladi.
 * Natija: 1-FAZA = bo'ylama (Y), 2-FAZA = ko'ndalang (X) kesimlar. */
const CUT_TOL = 0.5;   // mm — kesim chizig'i detaldan kamida shu masofada

/** axis bo'yicha proeksiya bo'shliqlarining o'rtalari (kesim nomzodlari). */
function cutCandidates(parts, axis) {
  const iv = parts.map(p => (axis === 'y' ? [p.y0, p.y1] : [p.x0, p.x1]))
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of iv) {
    const last = merged[merged.length - 1];
    /* faqat haqiqiy UTBUSH (overlap) birlashtiriladi — yonma-yon (touch)
     * detallar alohida qoladi, ular orasidagi chegarada kesim mumkin */
    if (last && s < last[1] - 1e-9) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const cands = [];
  for (let i = 0; i + 1 < merged.length; i++) cands.push((merged[i][1] + merged[i + 1][0]) / 2);
  return cands;
}

/** Guillotine: avval bo'ylama (Y), bo'lmasa ko'ndalang (X) kesim topadi. */
function planCuts(parts, rx0, ry0, rx1, ry1, depth, out) {
  if (parts.length <= 1) return;
  if (depth > 60) { out.blocked += parts.length; return; }
  for (const axis of ['y', 'x']) {
    const cands = cutCandidates(parts, axis);
    if (!cands.length) continue;
    /* eng muvozanatli bo'linishni tanlaymiz (detallarning yarmi har tomonda) */
    let best = cands[0], bestDiff = Infinity;
    for (const c of cands) {
      const lo = parts.filter(p => (axis === 'y' ? p.y1 : p.x1) <= c + CUT_TOL).length;
      const hi = parts.length - lo;
      const d = Math.abs(lo - hi);
      if (d < bestDiff) { bestDiff = d; best = c; }
    }
    const c = best;
    /* bo'shliq chegarasi bo'lgani uchun hech bir detal kesimni kesib o'tmaydi —
     * shu tariqa har bir detal aynan bitta tomonga tushadi (yo'qotilmaydi) */
    const lo = [], hi = [];
    if (axis === 'y') {
      out.rip.push({ y: c, x0: rx0, x1: rx1 });
      for (const p of parts) (p.y1 <= c + CUT_TOL ? lo : hi).push(p);
      planCuts(lo, rx0, ry0, rx1, c, depth + 1, out);
      planCuts(hi, rx0, c, rx1, ry1, depth + 1, out);
    } else {
      out.cross.push({ x: c, y0: ry0, y1: ry1 });
      for (const p of parts) (p.x1 <= c + CUT_TOL ? lo : hi).push(p);
      planCuts(lo, rx0, ry0, c, ry1, depth + 1, out);
      planCuts(hi, c, ry0, rx1, ry1, depth + 1, out);
    }
    return;
  }
  out.blocked += parts.length;   // proeksiya bo'shligi topilmadi
}

/** Kesim detaldan o'tmaydimi? (ha = buzilmagan) */
function cutViolations(rip, cross, parts) {
  let v = 0;
  for (const c of rip) for (const p of parts) {
    if (p.y0 + CUT_TOL < c.y && p.y1 - CUT_TOL > c.y &&
        p.x0 < c.x1 - CUT_TOL && p.x1 > c.x0 + CUT_TOL) v++;
  }
  for (const c of cross) for (const p of parts) {
    if (p.x0 + CUT_TOL < c.x && p.x1 - CUT_TOL > c.x &&
        p.y0 < c.y1 - CUT_TOL && p.y1 > c.y0 + CUT_TOL) v++;
  }
  return v;
}

/**
 * 7) Altendorf fazali kesim rejasi — STRUKTURALI natija (test va boshqa
 * eksportlar uchun). Har bir varaq uchun {sheet, material, rip, cross,
 * parts, violations, blocked}. `violations` — detaldan o'tgan kesimlar
 * soni (0 bo'lishi shart).
 */
export function altendorfPlan(nest) {
  const out = [];
  const byMat = nest.by_material || {};
  for (const mat in byMat) {
    for (const sheet of byMat[mat].sheets || []) {
      const parts = (sheet.parts || []).map(p => {
        const pw = p.rotated ? p.width : p.length;
        const ph = p.rotated ? p.length : p.width;
        return { p, pw, ph, x0: p.x, y0: p.y, x1: p.x + pw, y1: p.y + ph };
      });
      const plan = { rip: [], cross: [], blocked: 0 };
      planCuts(parts, 0, 0, sheet.length, sheet.width, 0, plan);
      out.push({
        material: mat, sheet, parts,
        rip: plan.rip, cross: plan.cross,
        blocked: plan.blocked,
        violations: cutViolations(plan.rip, plan.cross, parts)
      });
    }
  }
  return out;
}

/**
 * 7) Altendorf va formatli arralash stanoklari uchun Fazali Kesim (Kamchilik 10).
 * Arralovchi usta uchun 1-Faza (Bo'ylama polosa), 2-Faza (Ko'ndalang detal) va 3-Faza (Formatlash) xaritasi.
 */
export function altendorfPhasedCuts(nest) {
  const plan = altendorfPlan(nest);
  const L = [];
  L.push('================================================================================');
  L.push("       ALTENDORF FORMATLI ARRALASH STANOGI UCHUN FAZALI KESIM QO'LLANMASI       ");
  L.push('================================================================================');
  L.push(`Sana: ${new Date().toLocaleDateString('uz-UZ')} · Arra kerf: 4 mm`);

  let totalRip = 0, totalCross = 0, totalViol = 0, totalBlocked = 0;

  for (const s of plan) {
    const sheet = s.sheet;
    totalRip += s.rip.length; totalCross += s.cross.length;
    totalViol += s.violations; totalBlocked += s.blocked;

    L.push('--------------------------------------------------------------------------------');
    L.push(`VARAQ №${sheet.no} · Material: ${s.material} · O'lchami: ${sheet.length}×${sheet.width} mm`);
    L.push(`Detallar soni: ${(sheet.parts || []).length} ta · Chiqindi: ${sheet.stats?.waste_pct || 0}%`);
    L.push('--------------------------------------------------------------------------------');

    L.push(`1-FAZA: BO'YLAMA KESIMLAR (Rip Cuts — varaq bo'ylab, Y qiymatida): ${s.rip.length} ta`);
    if (s.rip.length) {
      s.rip.forEach((c, i) => {
        L.push(`  [1.${i + 1}] Y = ${Math.round(c.y)} mm · X: ${Math.round(c.x0)} → ${Math.round(c.x1)} mm (polosa chegarasi)`);
      });
    } else {
      L.push("  Yo'q — varaq bo'ylab ajratish shart emas.");
    }
    L.push('');

    L.push(`2-FAZA: KO'NDALANG KESIMLAR (Cross Cuts — polosa ichida, X qiymatida): ${s.cross.length} ta`);
    if (s.cross.length) {
      s.cross.forEach((c, i) => {
        L.push(`  [2.${i + 1}] X = ${Math.round(c.x)} mm · Y: ${Math.round(c.y0)} → ${Math.round(c.y1)} mm (detal ajratish)`);
      });
    } else {
      L.push("  Yo'q — barcha detallar bo'ylama kesimlar bilan ajratildi.");
    }
    L.push('');

    L.push('3-FAZA: QOLDIQ VA CHEGARANI TOZALASH (Recut & Trim):');
    const rem = (sheet.remnants || [])[0];
    if (rem) {
      L.push(`  Foydali qoldiq panel: ${Math.round(rem.length)}×${Math.round(rem.width)} mm (${(rem.area / 1e6).toFixed(2)} m²) omborga qaytarilsin.`);
    } else {
      L.push(`  Qoldiq yo'q — varaq to'liq ishlatildi.`);
    }
    L.push(`  NAZORAT: kesimlardan ${s.violations} tasi detaldan o'tadi (0 bo'lishi shart)` +
      (s.blocked ? ` · ajratib bo'lmagan detal: ${s.blocked}` : ''));
    L.push('');
  }

  L.push('================================================================================');
  L.push(`XULOSA: Jami ${plan.length} ta varaq · ${totalRip} bo'ylama + ${totalCross} ko'ndalang kesim.`);
  L.push(`NAZORAT: detaldan o'tgan kesimlar — ${totalViol} (0 bo'lishi shart).` +
    (totalBlocked ? ` Ajratib bo'lmagan: ${totalBlocked} detal.` : ''));
  return L.join('\r\n') + '\r\n';
}

/**
 * 8) Sex uchun Yaxlit Texnologik Xarita (Workshop Technological Card - Kamchilik 22).
 */
export function workshopTechCard(nest, cutlists) {
  const L = [];
  L.push('================================================================================');
  L.push('                 SMART3D MEBEL SEXI TEXNOLOGIK XARITASI                         ');
  L.push('================================================================================');
  L.push(`Sana: ${new Date().toLocaleDateString('uz-UZ')} · Versiya: 2026.1`);
  L.push('');

  // 1. Formatka
  L.push('--- 1-UCHASTKA: FORMATLI KESISH (FORMATKA) ---');
  let totalParts = 0;
  for (const m in nest.by_material || {}) {
    const sheets = nest.by_material[m].sheets || [];
    for (const s of sheets) totalParts += (s.parts || []).length;
    L.push(`Material: ${m} · Varaqlar soni: ${sheets.length} ta · Detallar: ${totalParts} ta`);
  }
  L.push('');

  // 2. Kromka
  L.push('--- 2-UCHASTKA: QIRRA YOPISHTIRISH (KROMKA) ---');
  let edge04 = 0, edge20 = 0;
  for (const cl of cutlists || []) {
    for (const p of cl.parts || []) {
      const perim = 2 * ((+p.length || 0) + (+p.width || 0)) / 1000;
      if (/fasad/i.test(p.material || '') || p.edge === '2.0') {
        edge20 += perim;
      } else {
        edge04 += perim;
      }
    }
  }
  L.push(`Kromka 0.4 mm (Korpus/Polka): ${Math.round(edge04)} pogon metr`);
  L.push(`Kromka 2.0 mm (Fasad/Zarba yuz): ${Math.round(edge20)} pogon metr`);
  L.push('');

  // 3. Prisadka
  L.push('--- 3-UCHASTKA: BURG\'ULASH (PRISADKA) ---');
  const sheetsData = collectSheetHoles(nest, cutlists);
  let totalHoles = 0;
  for (const sd of sheetsData) totalHoles += sd.holes.length;
  L.push(`Jami teshiklar: ${totalHoles} ta (konfirmat, shkant, petlya, eksentrik)`);
  L.push(`NC Dastur: Smart3D Excellon / Biesse CIX / WoodWOP MPR tayyor.`);
  L.push('');

  // 4. Montaj
  L.push('--- 4-UCHASTKA: YIG\'ISH VA SIFAT NAZORATI ---');
  L.push('Modullar soni: ' + (cutlists || []).length + ' ta.');
  L.push('Har bir modul furnituralari tekshirilsin va pasport bilan qadoqlansin.');
  L.push('================================================================================');
  return L.join('\r\n') + '\r\n';
}

/** Yordam: nest + cutlists ni birga tayyorlash (app.js va eksport uchun qulay). */
export function cncBundle(nest, cutlists, opts) {
  const sheetsData = collectSheetHoles(nest, cutlists);
  const samplePanel = { length: 1200, width: 600, thickness: 16, name: 'Sample_Panel' };
  const sampleHoles = sheetsData[0]?.holes || [];

  return {
    dxf: nestDXF(Object.assign({}, nest, { _cutlists: cutlists })),
    nc: drillNC(nest, cutlists),
    ptp: ptpCSV(nest, cutlists),
    gcode: cutGCode(nest, cutlists, opts),
    cix: biesseCIX(samplePanel, sampleHoles),
    mpr: woodwopMPR(samplePanel, sampleHoles),
    altendorf: altendorfPhasedCuts(nest),
    techCard: workshopTechCard(nest, cutlists),
    stats: {
      sheets: Object.keys(nest.by_material || {}).reduce(
        (s, m) => s + (nest.by_material[m].sheets || []).length, 0),
      holes: collectSheetHoles(nest, cutlists).reduce((s, sd) => s + sd.holes.length, 0)
    }
  };
}
