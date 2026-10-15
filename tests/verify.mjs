/* Smart3D verifikatsiya: C1 (teshik joyi), C6 (DXF varaq offset), K1 (raskroy) */
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const _dir = dirname(fileURLToPath(import.meta.url));
const B = pathToFileURL(join(_dir, '..', 'app') + '/').href;
const { cutlist } = await import(B + 'js/engine/cutlist.js');
const { nestProject, nestPanels } = await import(B + 'js/engine/nesting.js');
const { cncBundle, altendorfPlan, altendorfPhasedCuts } = await import(B + 'js/engine/cnc.js');
const fs = await import('fs');
const frags = JSON.parse(fs.readFileSync(fileURLToPath(new URL(B + 'data/fragments.json')), 'utf8'));
const mats = JSON.parse(fs.readFileSync(fileURLToPath(new URL(B + 'data/materials.json')), 'utf8'));
const cat = {}; for (const f of frags) cat[f.code] = f;
const codes = Object.keys(cat);
const args = new Set(process.argv.slice(2));
let fail = 0;
const bad = (m) => { fail++; console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

/* ---------- 1) barcha fragmentlar: manfiy o'lcham yo'q ---------- */
console.log('\n[1] O\'lcham validatsiyasi (79 fragment)');
let neg = 0, errs = 0;
for (const fr of frags) {
  const w = Math.max(fr.min_w || 400, Math.min(fr.max_w || 1600, fr.w || 600));
  try {
    const c = cutlist(fr, w, fr.d || 550, fr.h || 720, mats, {});
    for (const p of c.parts) if (!(p.length > 0) || !(p.width > 0) || !(p.finish_length > 0) || !(p.finish_width > 0)) neg++;
    for (const e of c.errors) if (e.code === 'E_BAD_SIZE') errs++;
  } catch (e) { neg++; bad(`${fr.code} throw: ${e.message}`); }
}
neg === 0 ? ok('manfiy/0 o\'lcham yo\'q') : bad(`manfiy o'lcham: ${neg}`);
console.log(`     (E_BAD_SIZE xabarlari: ${errs})`);

/* ---------- 2) loyiha: raskroy + DXF ---------- */
console.log('\n[2] Raskroy + DXF (16 modul)');
const placements = [];
for (let i = 0; i < 16; i++) {
  const c = codes[i * 7 % codes.length], f = cat[c];
  placements.push({
    id: 'p' + i, frg: c,
    w: Math.max(f.min_w || 400, Math.min(f.max_w || 1600, f.w || 600)),
    d: f.d || 550, h: f.h || 720, x: (i % 4) * 2200, y: Math.floor(i / 4) * 3200, z: 0, rot: 0
  });
}
const cutlists = [], allParts = [];
for (const p of placements) {
  const fr = cat[p.frg]; if (!fr) continue;
  const cl = cutlist(fr, p.w, p.d, p.h, mats, {});
  cl.placementId = p.id; cutlists.push(cl);
  for (const x of cl.parts) allParts.push(Object.assign({}, x, { id: p.id + ':' + x.ref }));
}
const nest = nestProject(allParts, mats, { mode: 'bssf' });

/* 2a) nest ichida ustma-ustlik yo'q */
let ov = 0, oob = 0, partsN = 0;
for (const mat in nest.by_material) {
  for (const s of nest.by_material[mat].sheets) {
    const b = s.parts.map(p => ({ p, fw: p.rotated ? p.width : p.length, fh: p.rotated ? p.length : p.width }));
    partsN += b.length;
    for (let i = 0; i < b.length; i++) {
      const A = b[i];
      if (A.p.x < -0.6 || A.p.y < -0.6 || A.p.x + A.fw > s.length + 0.6 || A.p.y + A.fh > s.width + 0.6) oob++;
      for (let j = i + 1; j < b.length; j++) {
        const C = b[j];
        if (A.p.x < C.p.x + C.fw - 0.5 && A.p.x + A.fw > C.p.x + 0.5 &&
            A.p.y < C.p.y + C.fh - 0.5 && A.p.y + A.fh > C.p.y + 0.5) ov++;
      }
    }
  }
}
ov === 0 ? ok(`raskroyda ustma-ustlik yo'q (${partsN} detal)`) : bad(`raskroy ustma-ustlik: ${ov}`);
oob === 0 ? ok('chetdan chiqqan detal yo\'q') : bad(`chetdan chiqqan: ${oob}`);

/* 2b) DXF */
const dxf = cncBundle(nest, cutlists).dxf;
const lines = dxf.split(/\r?\n/);
const sheets = [], partLines = [], circles = [];
let i = 0;
while (i < lines.length) {
  if (lines[i] === '0' && lines[i + 2] === '8') {
    const layer = lines[i + 3];
    if (lines[i + 1] === 'LINE') {
      const r = { layer, x1: +lines[i + 5], y1: +lines[i + 7], x2: +lines[i + 9], y2: +lines[i + 11] };
      if (layer === 'SHEET') sheets.push(r); else if (layer === 'PART') partLines.push(r);
      i += 12; continue;
    }
    if (lines[i + 1] === 'CIRCLE') { circles.push({ x: +lines[i + 5], y: +lines[i + 7], r: +lines[i + 9] }); i += 10; continue; }
  }
  i++;
}
const group = (arr) => {
  const out = [];
  for (let k = 0; k + 3 < arr.length; k += 4) {
    const g = arr.slice(k, k + 4);
    const xs = g.flatMap(r => [r.x1, r.x2]), ys = g.flatMap(r => [r.y1, r.y2]);
    out.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
  }
  return out;
};
const sRects = group(sheets), pRects = group(partLines);

/* C1: har bir teshik bitta detal ichida */
let inPart = 0, orphan = 0;
for (const c of circles) {
  let hit = false;
  for (const p of pRects) if (c.x >= p.x0 - 0.6 && c.x <= p.x1 + 0.6 && c.y >= p.y0 - 0.6 && c.y <= p.y1 + 0.6) { hit = true; break; }
  hit ? inPart++ : orphan++;
}
inPart === circles.length && circles.length > 0
  ? ok(`C1: ${inPart}/${circles.length} teshik DXF'da o'z detalida`)
  : bad(`C1: ${orphan} ta teshik detaldan tashqarida (${inPart}/${circles.length})`);

/* C6: varaq va detal ustma-ustligi yo'q */
let sOv = 0;
for (let a = 0; a < sRects.length; a++) for (let c = a + 1; c < sRects.length; c++) {
  const A = sRects[a], P = sRects[c];
  if (A.x0 < P.x1 - 0.5 && A.x1 > P.x0 + 0.5 && A.y0 < P.y1 - 0.5 && A.y1 > P.y0 + 0.5) sOv++;
}
sOv === 0 ? ok(`C6: ${sRects.length} varaq ajratilgan (ustma-ust ${sOv})`) : bad(`C6: varaq ustma-ust: ${sOv}`);
let pOv = 0;
for (let a = 0; a < pRects.length; a++) for (let c = a + 1; c < pRects.length; c++) {
  const A = pRects[a], P = pRects[c];
  if (A.x0 < P.x1 - 0.5 && A.x1 > P.x0 + 0.5 && A.y0 < P.y1 - 0.5 && A.y1 > P.y0 + 0.5) pOv++;
}
pOv === 0 ? ok(`C6: ${pRects.length} detal ustma-ust emas`) : bad(`C6: detal ustma-ust: ${pOv}`);

/* ---------- 3) lenta (strip) rejimi ---------- */
console.log('\n[3] Lenta rejimi (K1)');
const panels = [];
[
  ['Korp yon', 2400, 598, 4, 'uzunlik'], ['Korp ust', 600, 598, 4, 'ixtiyoriy'],
  ['Korp past', 600, 598, 4, 'ixtiyoriy'], ['Korp orqa', 600, 2400, 3, 'ixtiyoriy'],
  ['Polka', 564, 598, 8, 'ixtiyoriy'], ['Eshik', 700, 592, 4, 'uzunlik'],
  ['Tortma', 200, 500, 6, 'en'], ['Shelf', 1164, 300, 5, 'uzunlik'],
  ['PanelA', 1800, 600, 2, 'en'], ['PanelB', 450, 450, 10, 'ixtiyoriy'],
  ['PanelC', 1200, 350, 3, 'uzunlik'], ['PanelD', 280, 700, 7, 'ixtiyoriy']
].forEach((d, k) => panels.push({ id: 'p' + k, code: d[0], length: d[1], width: d[2], qty: d[3], texture: d[4], material: 'LDSP' }));

function checkMode(mode, list, label) {
  const r = nestPanels(list, { mode, sheetL: 2800, sheetW: 2070, trimL: 10, trimW: 10, kerf: 4, maxRot: 2 });
  let o = 0, oo = 0, g = 0, n = 0;
  const all = [];
  for (const s of r.sheets) for (const p of s.parts) {
    const fw = p.rotated ? p.width : p.length, fh = p.rotated ? p.length : p.width;
    all.push({ p, s, x0: p.x, x1: p.x + fw, y0: p.y, y1: p.y + fh });
  }
  n = all.length;
  for (let a = 0; a < all.length; a++) {
    const A = all[a];
    if (A.x0 < -0.6 || A.y0 < -0.6 || A.x1 > A.s.length + 0.6 || A.y1 > A.s.width + 0.6) oo++;
    for (let c = a + 1; c < all.length; c++) {
      const C = all[c]; if (C.s !== A.s) continue;
      if (A.x0 < C.x1 - 0.5 && A.x1 > C.x0 + 0.5 && A.y0 < C.y1 - 0.5 && A.y1 > C.y0 + 0.5) o++;
    }
    const t = String(A.p.texture || '').toLowerCase();
    if ((t === 'uzunlik' || t === 'length' || t === 'y') && A.p.rotated) g++;
    if ((t === 'en' || t === 'width' || t === 'x') && !A.p.rotated) g++;
  }
  const badN = o + oo + g;
  badN === 0 ? ok(`${label} [${mode}]: ${r.sheets.length} varaq, ${n}/${r.stats.panel_count} joylashdi, foydalanish ${r.stats.utilization_pct}%`)
             : bad(`${label} [${mode}]: ustma-ust=${o} chetdan=${oo} textura=${g}`);
  return badN;
}
checkMode('strip', panels, 'LENTA ');
checkMode('bssf', panels, 'BSSF  ');
const big = [];
for (let k = 0; k < 40; k++) big.push({ id: 'b' + k, code: 'B' + k, length: 200 + (k % 7) * 300, width: 150 + (k % 5) * 160, qty: 1 + (k % 3), texture: ['uzunlik', 'en', 'ixtiyoriy'][k % 3], material: 'LDSP' });
checkMode('strip', big, 'LENTA-KATTA');
checkMode('bssf', big, 'BSSF-KATTA ');

/* ---------- 4) Altendorf fazali kesim (C7) ---------- */
console.log('\n[4] Altendorf fazali kesim (C7)');
function c7(nest, label) {
  const plan = altendorfPlan(nest);
  let viol = 0, blocked = 0, rip = 0, cross = 0, sheets = plan.length, selfBad = 0;
  for (const s of plan) {
    rip += s.rip.length; cross += s.cross.length; blocked += s.blocked;
    if (s.violations !== 0) selfBad += s.violations;
    /* mustaqil tekshiruv: kesim chizig'i detaldan o'tmaydimi? (mustahkam geom.) */
    for (const c of s.rip) for (const p of s.parts) {
      if (p.y0 + 0.05 < c.y && c.y < p.y1 - 0.05 && p.x0 < c.x1 - 0.05 && c.x0 < p.x1 - 0.05) viol++;
    }
    for (const c of s.cross) for (const p of s.parts) {
      if (p.x0 + 0.05 < c.x && c.x < p.x1 - 0.05 && p.y0 < c.y1 - 0.05 && c.y0 < p.y1 - 0.05) viol++;
    }
    /* kesimlar soni detallar soniga mosmi (har bir alohida detal = bitta bo'lak) */
    if (s.rip.length + s.cross.length === 0 && s.parts.length > 1) blocked += s.parts.length;
  }
  const txt = altendorfPhasedCuts(nest);
  const hasCtl = /NAZORAT: detaldan o'tgan kesimlar — 0/.test(txt);
  if (viol === 0 && selfBad === 0 && blocked === 0 && hasCtl) {
    ok(`${label}: ${sheets} varaq · ${rip} bo'ylama + ${cross} ko'ndalang = ${rip + cross} kesim, detaldan o'tgani 0, ajratilmagan 0`);
  } else {
    bad(`${label}: violation=${viol} (o'z tekshiruvi=${selfBad}) blocked=${blocked} nazorat=${hasCtl}`);
  }
  return viol + selfBad + blocked;
}
c7(nest, 'C7 bssf');
/* alohida: lenta rejimi bilan katta loyiha */
const stripPanels = [];
for (let k = 0; k < 30; k++) stripPanels.push({
  id: 's' + k, code: 'S' + k, length: 300 + (k % 6) * 350, width: 200 + (k % 4) * 400,
  qty: 1 + (k % 2), texture: ['uzunlik', 'en', 'ixtiyoriy'][k % 3], material: 'LDSP'
});
const stripNest = nestProject(stripPanels, mats, { mode: 'strip' });
c7(stripNest, 'C7 lenta');
const bigNest = nestProject(big, mats, { mode: 'bssf' });
c7(bigNest, 'C7 katta');


/* ══ [5] GibLab .project — K2 (yo'qotishsiz) + K4 (tayyor/kesim) ══ */
console.log('\n[5] GibLab .project (K2 + K4)');
const { buildProject } = await import(B + 'js/engine/giblab.js');
/* TZ-02: mustaqil tekshiruvchi repoda (Bittada giblab_raskroy.py modeli, Node) — Python va /tmp kerak emas */
const { checkProject } = await import('./giblab_check.mjs');

function glRun(clists, nestObj, label, expectWarn) {
  const gl = buildProject({
    cutlists: clists, materials: mats, modelName: 'Test', materialCode: 'LDSP',
    nest: nestObj, settings: { kerf: 4, trimL: 8, trimW: 8 }
  });
  const st = gl.stats;
  if (st.placed + st.excluded !== st.parts) {
    bad(`${label}: joylashtirildi ${st.placed}+chetlashtirilgan ${st.excluded} ≠ ${st.parts}`);
  } else {
    ok(`${label}: ${st.placed}/${st.parts} detal joylashtirildi${st.excluded ? ` (${st.excluded} ta formatga sig'maydi)` : ''} · ${st.sheets} varaq`);
  }

  /* K4: kamida bitta detaldal l ≠ cl bo'lishi shart */
  const kp = (gl.xml.match(/<part l="([\d.]+)" w="([\d.]+)"[^>]*?cl="([\d.]+)" cw="([\d.]+)"/g) || []);
  let diff = 0;
  for (const s of kp) {
    const m = /l="([\d.]+)" w="([\d.]+)".*?cl="([\d.]+)" cw="([\d.]+)"/.exec(s);
    if (m && (+m[1] !== +m[3] || +m[2] !== +m[4])) diff++;
  }
  if (diff > 0) ok(`K4: ${diff} detaldal <part l>≠<cl> (tayyor ≠ kesim)`);
  else bad(`K4: bitta ham detalda tayyor/kesim farqi yo'q (l ham cl ham bir xil)`);

  /* mustaqil tekshiruv: formatga haqiqatan sig'maydigan detal soni */
  let tooBigIndep = 0;
  for (const cl of clists) for (const pt of (cl.parts || [])) {
    const meta = (mats.panel_materials || []).find(m => m.code === pt.material);
    const fmts = (meta && meta.sheets && meta.sheets.length) ? meta.sheets : [[2800, 2070]];
    const tex = String(pt.texture || '').toLowerCase();
    const L = +pt.length, W = +pt.width;
    const ok = (a, b) => fmts.some(([fL, fW]) => a + 12 <= +fL && b + 12 <= +fW);
    let fitsAny;
    if (tex === 'uzunlik' || tex === 'length' || tex === 'y') fitsAny = ok(L, W);
    else if (tex === 'en' || tex === 'width' || tex === 'x') fitsAny = ok(W, L);
    else fitsAny = ok(L, W) || ok(W, L);
    if (!fitsAny) tooBigIndep++;
  }

  try {
    const ck = checkProject(gl.xml);
    if (ck.renderErr === 0 && ck.overlap === 0 && ck.dimErr === 0 && ck.cntErr === 0 && ck.rtOk === ck.ops && ck.missing === st.excluded) {
      ok(`GibLab renderer round-trip: 0 xato, 0 ustma-ust, yo'qolgan 0 (chetlashtirilgan ${st.excluded} — faqat formatga sig'maganlar) (${label})`);
    } else {
      bad(`GibLab renderer: ${ck.line} (kutilgan=${st.excluded}, mustaqil=${tooBigIndep}) (${label})`);
      ck.messages.slice(0, 8).forEach(m => console.log('    ' + m));
    }
    if (st.excluded !== tooBigIndep) bad(`chetlashtirish noto'g'ri: ${st.excluded} ≠ mustaqil hisob ${tooBigIndep} (${label})`);
    else if (st.excluded) ok(`chetlashtirilgan ${st.excluded} ta — mustaqil hisob bilan mos (formatga sig'maydi)`);
  } catch (e) {
    bad(`GibLab renderer xato (${label}): ${String(e.message).slice(0, 600)}`);
  }
}

/* 5a) 16 modul (asosiy kroy bilan) */
glRun(cutlists, nest, '16 modul');

/* 5a') tekshiruvchining o'zi ishlashini isbotlash — ataylab buzilgan fayllar (TZ-02) */
{
  const base = buildProject({ cutlists, materials: mats, modelName: 'Test', materialCode: 'LDSP', nest, settings: { kerf: 4, trimL: 8, trimW: 8 } }).xml;
  const partLines = base.match(/<part l="[^"]*" w="[^"]*" dl=[^>]*\/>\n/g) || [];
  /* (a) mahsulotdan bitta detal o'chirilgan — kartadagi joylashuv "detal yo'q" bo'lishi shart */
  const ckA = checkProject(base.replace(partLines[0], ''));
  /* (b) bitta detalning kesim o'lchami 50 mm o'zgartirilgan — "o'lcham farq" bo'lishi shart */
  const ckB = checkProject(base.replace(partLines[1], partLines[1].replace(/cl="([\d.]+)"/, (m, v) => `cl="${+v + 50}"`)));
  /* (c) mahsulotga joylashtirilmagan qo'shimcha detal — "joylashtirilmagan" +1 */
  const ckC = checkProject(base.replace('</good>', '<part l="100" w="100" cl="100" cw="100" count="1" usedCount="1" id="999999"/>\n</good>'));
  const ck0 = checkProject(base);
  if (partLines.length >= 2 && ckA.renderErr >= 1 && ckB.dimErr >= 1 && ckC.missing === ck0.missing + 1) {
    ok(`tekshiruvchi buzilgan faylni ushlaydi: detal yo'q=${ckA.renderErr}, o'lcham farq=${ckB.dimErr}, joylashtirilmagan +${ckC.missing - ck0.missing}`);
  } else {
    bad(`tekshiruvchi buzilgan faylni USHLAMADI: a=${ckA.line} | b=${ckB.line} | c=${ckC.line}`);
  }
}

/* 5b) BARCHA 79 fragment — K2 stress: hech narsa tashlanmasligi shart */
const allCls = [], allParts2 = [];
let n = 0;
for (const c of codes) {
  const f = cat[c];
  const p = {
    id: 'a' + (n++), frg: c,
    w: Math.max(f.min_w || 400, Math.min(f.max_w || 1600, f.w || 600)),
    d: f.d || 550, h: f.h || 720
  };
  const cl = cutlist(f, p.w, p.d, p.h, mats, {});
  cl.placementId = p.id; allCls.push(cl);
  for (const x of cl.parts) allParts2.push(Object.assign({}, x, { id: p.id + ':' + x.ref }));
}
const allNest = nestProject(allParts2, mats, { mode: 'bssf' });
glRun(allCls, allNest, '79 fragment');

/* 5c) kroy MAVJUD EMAS — fallback: otilmasligi, ogohlantirish berishi kerak */
try {
  const gl0 = buildProject({ cutlists: allCls, materials: mats, modelName: 'T', materialCode: 'LDSP' });
  const s0 = gl0.stats;
  if (s0.placed + s0.excluded === s0.parts && gl0.warnings.length > 0) {
    ok(`kroysiz ham to'liq (${s0.placed}/${s0.parts}, ${s0.excluded} ta chetlashtirilgan, otilmadi) + ogohlantirish: "${gl0.warnings[0].slice(0, 42)}"`);
  } else {
    bad(`kroysiz: joylashtirildi ${s0.placed}+${s0.excluded}/${s0.parts}, ogohlantirishlar=${gl0.warnings.length}`);
  }
} catch (e) { bad('kroysiz buildProject OTDI: ' + e.message); }

/* ---------- 6) BPJ (K3): material / position / holes / dl=kesim ---------- */
console.log('\n[6] BPJ K3 — material, position, holes, dl=kesim');
const { buildBPJ } = await import(B + 'js/engine/bpj.js');
const { panelFitsSheet, KERF_DEFAULT: KERF, TRIM_DEFAULT: TRIM } = await import(B + 'js/engine/nesting.js');
const bpjDoc = { room: { w: 4000, d: 4000, h: 2700 }, placements };
const bpj = buildBPJ(bpjDoc, cat, mats, { materialCode: 'LDSP18', cutlists });

try { JSON.stringify(bpj); ok(`JSON serializable (${bpj.objects.length} panel, ${bpj.bom.length} bom)`); }
catch (e) { bad('JSON: ' + e.message); }

/* 6a) material — DETAL darajasida, orqa devor alohida */
const matNames = bpj.materials.map(m => m.name);
matNames.length >= 2 ? ok(`materiallar: ${matNames.length} ta (${matNames.slice(0, 3).join(' + ')})`)
  : bad('hamma panel BIRTA materialda');
matNames.some(n => /3\s*mm|ХДФ|HDF/i.test(n)) ? ok('orqa devor (3mm) alohida material')
  : bad('orqa devor materiali topilmadi: ' + matNames.join(', '));

/* 6b) position — bir modul ichida bir xil nuqta yo'q */
const byPlace = {};
for (const o of bpj.objects) {
  const k = o.userProps.smart3d_placement;
  (byPlace[k] = byPlace[k] || []).push(o);
}
let dupPos = 0, dupBBox = 0, dupOrigin = 0, checkedPos = 0;
for (const k in byPlace) {
  const arr = byPlace[k];
  if (arr.length < 2) continue;
  checkedPos++;
  const sp = new Set(), sb = new Set(), so = new Set();
  for (const o of arr) {
    sp.add(o.position.x + ',' + o.position.y + ',' + o.position.z);
    sb.add(o.boundingBox.global.min.x + ',' + o.boundingBox.global.min.y + ',' + o.boundingBox.global.min.z);
    so.add(o.transform.origin.x + ',' + o.transform.origin.y + ',' + o.transform.origin.z);
  }
  if (sp.size !== arr.length) dupPos++;
  if (so.size !== arr.length) dupOrigin++;
  if (sb.size !== arr.length) dupBBox++;
}
if (!checkedPos) bad('modul topilmadi');
else if (dupPos || dupBBox || dupOrigin) bad(`bir xil position: ${dupPos}, origin: ${dupOrigin}, bbox: ${dupBBox}`);
else ok(`positionlar/bbox/origin noyob (${checkedPos} modul)`);

/* 6c) holes — mavjud, kontur ichida, diameter bilan, face qiymati */
const holeTotal = bpj.objects.reduce((s, o) => s + o.holes.length, 0);
const holePanels = bpj.objects.filter(o => o.holes.length).length;
holeTotal > 0 ? ok(`holes: ${holePanels} panelda jami ${holeTotal} dona`) : bad("holes bo'sh");
let outH = 0, badD = 0, badFace = 0;
const faces = new Set();
for (const o of bpj.objects) {
  for (const hl of o.holes) {
    if (!(hl.diameter > 0)) badD++;
    if (hl.x < 0 || hl.x > o.dimensions.dl || hl.y < 0 || hl.y > o.dimensions.dw) outH++;
    if (!hl.face) badFace++;
    faces.add(hl.face);
  }
}
badD === 0 ? ok('barcha holes diameter > 0') : bad(`diameter yo'q: ${badD}`);
outH === 0 ? ok("barcha holes kontur (0..dl, 0..dw) ichida") : bad(`konturdan chiqqan: ${outH}`);
badFace === 0 ? ok(`face to'ldirilgan (${[...faces].join('/')})`) : bad(`face bo'sh: ${badFace}`);
const bomHoles = bpj.bom.reduce((s, r) => s + (r.holesCount || 0), 0);
bomHoles === holeTotal ? ok(`bom holesCount (${bomHoles}) = objects (${holeTotal})`)
  : bad(`bom holesCount ${bomHoles} != objects ${holeTotal}`);

/* 6d) dl/dw = KESIM (cutlist bilan mos), finish userProps da saqlangan */
let mmParts = 0, finishDiff = 0, seenId = 0;
for (let i = 0; i < placements.length; i++) {
  const o = bpj.objects.filter(x => x.userProps.smart3d_placement === placements[i].id);
  const cp = cutlists[i].parts;
  if (o.length !== cp.length) { mmParts++; continue; }
  const keyA = o.map(x => x.dimensions.dl + 'x' + x.dimensions.dw + 'x' + x.dimensions.dp).sort().join('|');
  const keyB = cp.map(x => x.length + 'x' + x.width + 'x' + x.thickness).sort().join('|');
  if (keyA !== keyB) mmParts++;
}
mmParts === 0 ? ok('har bir modul: objects dl/dw/dp = cutlist length/width/thickness (kesim)')
  : bad(`kesim o'lchami mos emas: ${mmParts} modul`);
for (const x of bpj.objects) {
  const f = x.userProps.smart3d_finish;
  if (f && (f.l !== x.dimensions.dl || f.w !== x.dimensions.dw)) finishDiff++;
}
finishDiff > 0 ? ok(`tayyor ≠ kesim: ${finishDiff} ta (kromka kesim o'lchamini kichraytirgan)`)
  : bad('dl hammasi finish — kromka hisoblanmagan');

/* 6e) config varaq formati — tanlangan format barcha panellar sig'ishi kerak */
let needL = 0, needW = 0;
for (const o of bpj.objects) { needL = Math.max(needL, o.dimensions.dl); needW = Math.max(needW, o.dimensions.dw); }
let notFitConfig = 0, notFitAny = 0;
for (const o of bpj.objects) {
  const meta = (mats.panel_materials || []).find(x => x.name === o.material.name);
  const sheets = (meta && meta.sheets) || [];
  const L = o.dimensions.dl, W = o.dimensions.dw;
  const fitAny = sheets.some(([a, b]) => panelFitsSheet({ length: L, width: W }, a, b, KERF, TRIM, TRIM));
  if (!fitAny) { notFitAny++; continue; }
  const a1 = L + TRIM + KERF <= bpj.config.sheetL && W + TRIM + KERF <= bpj.config.sheetW;
  const a2 = W + TRIM + KERF <= bpj.config.sheetL && L + TRIM + KERF <= bpj.config.sheetW;
  if (!a1 && !a2) notFitConfig++;
}
notFitConfig === 0 ? ok(`config ${bpj.config.sheetL}×${bpj.config.sheetW} — tanlangan formatdan kichik emas (eng katta panel ${needL}×${needW})`)
  : bad(`config varaq sig'maydigan panel: ${notFitConfig}`);
console.log(`     (hech bir formatga sig'maydigan panel: ${notFitAny} ta)`);
notFitAny <= 4 ? null : bad(`formatga sig'maydigan juda ko'p: ${notFitAny}`);

/* 6f) block panelCount = objects soni */
const blockSum = bpj.blocks.reduce((s, b) => s + b.panelCount, 0);
blockSum === bpj.objects.length ? ok(`blocks panelCount (${blockSum}) = objects (${bpj.objects.length})`)
  : bad(`blocks ${blockSum} != objects ${bpj.objects.length}`);
const fbRatio = bpj.smart3d.unpositioned / Math.max(1, bpj.objects.length);
console.log(`     (3D modeldan joy olmagan: ${bpj.smart3d.unpositioned}/${bpj.objects.length} = ${(fbRatio * 100).toFixed(0)}% — shift/toka kabi assembler'da modellashtirilmagan detallar)`);
fbRatio < 0.5 ? ok("positionlar ko'pchiligi 3D modeldan olingan")
  : bad(`3D modeldan juda kam joy olingan: ${(fbRatio * 100).toFixed(0)}%`);

/* 6g) cutlistsiz ham ishlashi (fallback — formulalar) */
try {
  const bpj2 = buildBPJ(bpjDoc, cat, mats, { materialCode: 'LDSP18' });
  const h2 = bpj2.objects.reduce((s, o) => s + o.holes.length, 0);
  (bpj2.objects.length === bpj.objects.length && h2 > 0 && bpj2.materials.length >= 2)
    ? ok(`cutlistsiz fallback ham to'liq (${bpj2.objects.length} panel, ${h2} holes, ${bpj2.materials.length} material)`)
    : bad(`fallback: ${bpj2.objects.length} panel, ${h2} holes, ${bpj2.materials.length} material`);
} catch (e) { bad('cutlistsiz buildBPJ OTDI: ' + e.message); }

/* 6h) 79 fragment stress */
try {
  const bigPlacements = allCls.map(c => ({
    id: c.placementId, frg: c.fragment, w: c.w, d: c.d, h: c.h, x: 0, y: 0, z: 0, rot: 0
  }));
  const big = buildBPJ({ room: {}, placements: bigPlacements }, cat, mats,
    { materialCode: 'LDSP18', cutlists: allCls });
  const totalParts = allCls.reduce((s, c) => s + c.parts.length, 0);
  big.objects.length === totalParts
    ? ok(`79 fragment: ${big.objects.length}/${totalParts} panel, ${big.materials.length} material, 3D'dan joy olmagan ${big.smart3d.unpositioned}, ogohlantirish ${big.smart3d.warnings.length}`)
    : bad(`79 fragment: ${big.objects.length}/${totalParts}`);
} catch (e) { bad('79 fragment BPJ OTDI: ' + e.message); }

console.log(fail === 0 ? '\n=== HAMMASI OK ===' : `\n=== ${fail} TA XATO ===`);

process.exit(fail ? 1 : 0);