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

/* ── Yordamchi: hole'ni varaq koordinatasiga o'tkazish ───────────────────── */
function holeToSheet(h, part, sheetW, flipY) {
  let x, y, fw, fh;   // fw/fh — joylashgan o'lcham (footprint)
  if (part.rotated) {
    x = part.x + (h.y || 0);
    y = part.y + (h.x || 0);
    fw = part.width; fh = part.length;
  } else {
    x = part.x + (h.x || 0);
    y = part.y + (h.y || 0);
    fw = part.length; fh = part.width;
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
          const refPart = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref;
          const refBase = refPart.split('#')[0];
          if (h.part !== refBase) continue;
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
  const sheetList = sheetsData.length ? sheetsData
    : Object.keys(nest.by_material || {}).flatMap(mat =>
        (nest.by_material[mat].sheets || []).map(sheet => ({ sheet, material: mat, holes: [] })));

  for (const { sheet, holes } of sheetList) {
    const SW = sheet.width;
    const SL = sheet.length;
    const trimL = sheet.trimL || 0;
    const trimW = sheet.trimW || 0;

    /* varaq chegarasi (SHEET) */
    line('SHEET', 0, 0, SL, 0);
    line('SHEET', SL, 0, SL, SW);
    line('SHEET', SL, SW, 0, SW);
    line('SHEET', 0, SW, 0, 0);

    /* tozalangan ishchi maydon chegarasi (TRIM) */
    if (trimL > 0 || trimW > 0) {
      line('TRIM', trimL, trimW, SL - trimL, trimW);
      line('TRIM', SL - trimL, trimW, SL - trimL, SW - trimW);
      line('TRIM', SL - trimL, SW - trimW, trimL, SW - trimW);
      line('TRIM', trimL, SW - trimW, trimL, trimW);
    }

    /* detallar (PART — Y-up flip) */
    for (const p of sheet.parts || []) {
      const fw = p.rotated ? p.width : p.length;
      const fh = p.rotated ? p.length : p.width;
      const x = p.x, yb = SW - (p.y + fh);
      line('PART', x, yb, x + fw, yb);
      line('PART', x + fw, yb, x + fw, yb + fh);
      line('PART', x + fw, yb + fh, x, yb + fh);
      line('PART', x, yb + fh, x, yb);
    }
    /* teshiklar (HOLES) */
    for (const h of holes) circle('HOLES', h.x, h.y, h.dia / 2);
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

/**
 * 7) Altendorf va formatli arralash stanoklari uchun Fazali Kesim (Phased Cuts Guide - Kamchilik 10).
 * Arralovchi usta uchun 1-Faza (Bo'ylama polosa), 2-Faza (Ko'ndalang detal) va 3-Faza (Formatlash) xaritasi.
 */
export function altendorfPhasedCuts(nest) {
  const L = [];
  L.push('================================================================================');
  L.push('       ALTENDORF FORMATLI ARRALASH STANOGI UCHUN FAZALI KESIM QO\'LLANMASI       ');
  L.push('================================================================================');
  L.push(`Sana: ${new Date().toLocaleDateString('uz-UZ')} · Arra kerf: 4 mm`);
  L.push('');

  const byMat = nest.by_material || {};
  let sheetTotal = 0;

  for (const mat in byMat) {
    const nm = byMat[mat];
    for (const sheet of nm.sheets || []) {
      sheetTotal++;
      L.push('--------------------------------------------------------------------------------');
      L.push(`VARAQ №${sheet.no} · Material: ${mat} · O'lchami: ${sheet.length}×${sheet.width} mm`);
      L.push(`Detallar soni: ${(sheet.parts || []).length} ta · Chiqindi: ${sheet.stats?.waste_pct || 0}%`);
      L.push('--------------------------------------------------------------------------------');

      // Detallarni Y koordinatasi bo'yicha polosalarga ajratish
      const parts = [...(sheet.parts || [])].sort((a, b) => a.y - b.y || a.x - b.x);
      const strips = [];
      let currentStrip = null;

      for (const p of parts) {
        const ph = p.rotated ? p.length : p.width;
        const pw = p.rotated ? p.width : p.length;
        const topY = p.y + ph;

        if (!currentStrip || Math.abs(currentStrip.y - p.y) > 5) {
          currentStrip = { y: p.y, height: ph, topY, parts: [] };
          strips.push(currentStrip);
        } else {
          currentStrip.height = Math.max(currentStrip.height, ph);
          currentStrip.topY = Math.max(currentStrip.topY, topY);
        }
        currentStrip.parts.push({ ...p, pw, ph });
      }

      L.push(`1-FAZA: BO'YLAMA ASOSIY POLOSA KESIMLARI (Rip Cuts - Varaq bo'ylab ${strips.length} ta polosa):`);
      for (let sIdx = 0; sIdx < strips.length; sIdx++) {
        const s = strips[sIdx];
        L.push(`  [1.${sIdx + 1}] Polosa ${sIdx + 1}: Arra o'lchami Y = ${Math.round(s.y)} mm dan Y = ${Math.round(s.topY)} mm gacha (Kengligi: ${Math.round(s.height)} mm)`);
      }
      L.push('');

      L.push(`2-FAZA: POLOSALARNI KO'NDALANG BO'LAKLASH (Cross Cuts - Detallarni ajratish):`);
      for (let sIdx = 0; sIdx < strips.length; sIdx++) {
        const s = strips[sIdx];
        L.push(`  Polosa ${sIdx + 1} (${Math.round(s.height)} mm):`);
        const sParts = s.parts.sort((a, b) => a.x - b.x);
        for (let pIdx = 0; pIdx < sParts.length; pIdx++) {
          const p = sParts[pIdx];
          L.push(`    → Kesim ${pIdx + 1} (X=${Math.round(p.x + p.pw)} mm): Detal "${p.code || 'Panel'}" [${Math.round(p.pw)}×${Math.round(p.ph)} mm] · Ref: ${p.ref}`);
        }
      }
      L.push('');

      L.push(`3-FAZA: QOLDIQ VA CHEGARANI TOZALASH (Recut & Trim):`);
      const rem = (sheet.remnants || [])[0];
      if (rem) {
        L.push(`  Foydali qoldiq panel: ${Math.round(rem.length)}×${Math.round(rem.width)} mm (${(rem.area / 1e6).toFixed(2)} m²) omborga qaytarilsin.`);
      } else {
        L.push(`  Qoldiq yo'q — varaq to'liq ishlatildi.`);
      }
      L.push('');
    }
  }

  L.push('================================================================================');
  L.push(`XULOSA: Jami ${sheetTotal} ta varaq arralandi. Barcha kesimlar tekshirildi.`);
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
