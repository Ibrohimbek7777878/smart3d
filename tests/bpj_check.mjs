/* TZ-17: BPJ format tekshiruvi.
 *   1) haqiqiy Bazis eksporti (mebelcity-platform/1.bpj) bilan maydonma-maydon: bo'limlar, majburiy maydonlar, turlar;
 *   2) Bazis import skripti (BazisUniversalImport.js v4.18) o'qiydigan har maydon bizda bor va to'g'ri;
 *   3) ramka: o'qlar birlik, o'zaro perpendikular, o'ng qo'l (X × Y = Z); bbox transform bilan bir xil;
 *   4) ERP o'quvchisi (bpj_parser.py) faylni xatosiz o'qiydi — detal soni, o'lchami va materiali kesim ro'yxati bilan bir xil.
 * mebelcity-platform yo'q bo'lsa — tegishli qism o'tkazib yuboriladi. Ishlatish: node tests/bpj_check.mjs */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildBPJ } from '../app/js/engine/bpj.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { loadData, createHisob } from '../web/src/services/hisob.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MP = join(ROOT, '..', 'mebelcity-platform');
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(ROOT, 'app', 'data', n), 'utf8')))));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const tur = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

/* namuna loyiha: konstruktor oshxonasi (L, MC modullari) + bir nechta umumiy modul */
const rect = (W, D) => [[0, 0], [W, 0], [W, D], [0, D]];
const v = konstruksiya({ outline: rect(3600, 3000), utilities: [{ type: 'pipe', wall: 0, offset: 1500, z: 500 }] }, { shakl: 'L' }, H.catalog).variantlar[0];
const placements = v.placements.filter(p => (H.catalog[p.frg].parts || []).length);
for (const [i, code] of ['SP-K-001', 'SP-K-004'].entries()) {
  const f = H.catalog[code];
  if (f) placements.push({ id: 'u' + i, frg: code, x: 200 + i * 700, y: 2400, z: 0, w: f.w, d: f.d, h: f.h, rot: 180, qty: 1 });
}
const cutlists = placements.map(p => Object.assign(cutlist(H.catalog[p.frg], p.w, p.d, p.h, H.materials, {}), { placementId: p.id }));
const bpj = buildBPJ({ room: { outline: rect(3600, 3000) }, placements }, H.catalog, H.materials, { modelName: 'Namuna oshxona', cutlists });

/* ══ 1) haqiqiy Bazis eksporti bilan ══ */
console.log('\n[1] Haqiqiy Bazis eksporti (1.bpj) bilan — bo\'limlar, maydonlar, turlar');
const REAL = join(MP, '1.bpj');
if (!existsSync(REAL)) console.log('  · 1.bpj yo\'q — o\'tkazib yuborildi');
else {
  const raw = readFileSync(REAL);
  const real = JSON.parse(new TextDecoder(raw[0] === 0xEF ? 'utf-8' : 'windows-1251').decode(raw));
  const farq = (nom, a, b) => {      // a — haqiqiy, b — bizniki: a dagi har kalit b da bor va turi bir xil
    const yoq = Object.keys(a).filter(k => !(k in b));
    const turi = Object.keys(a).filter(k => k in b && a[k] !== null && b[k] !== null && tur(a[k]) !== tur(b[k]));
    return (yoq.length ? nom + ': yo\'q ' + yoq.join(',') : '') + (turi.length ? ' ' + nom + ': turi ' + turi.map(k => k + '(' + tur(a[k]) + '≠' + tur(b[k]) + ')').join(',') : '');
  };
  const xato = [
    farq('ildiz', real, bpj), farq('meta', real.meta, bpj.meta), farq('config', real.config, bpj.config),
    farq('objects[]', real.objects[0], bpj.objects[0]), farq('dimensions', real.objects[0].dimensions, bpj.objects[0].dimensions),
    farq('material', real.objects[0].material, bpj.objects[0].material), farq('materialDetails', real.objects[0].materialDetails, bpj.objects[0].materialDetails),
    farq('transform', real.objects[0].transform, bpj.objects[0].transform), farq('contour', real.objects[0].contour, bpj.objects[0].contour),
    farq('contour.outer[]', real.objects[0].contour.outer[0], bpj.objects[0].contour.outer[0]),
    farq('boundingBox', real.objects[0].boundingBox, bpj.objects[0].boundingBox),
    farq('butts[]', real.objects[0].butts[0], (bpj.objects.find(o => o.butts.length) || {}).butts[0]),
    farq('bom[]', real.bom[0], bpj.bom[0]), farq('materials[]', real.materials[0], bpj.materials[0]),
    farq('edgeBands[]', real.edgeBands[0], bpj.edgeBands[0]), farq('furnitures[]', real.furnitures[0], bpj.furnitures[0]),
    farq('blocks[]', real.blocks[0], bpj.blocks[0]), farq('exports', real.exports, bpj.exports)
  ].filter(Boolean);
  ok('haqiqiy fayldagi har bo\'lim va maydon bizda bor, turi bir xil (' + Object.keys(real).length + ' bo\'lim, objects ' + Object.keys(real.objects[0]).length + ' maydon)', !xato.length, xato.join(' | '));
  ok('versiya va skript nomi bir xil (' + real.version + ', ' + real.script + ')', bpj.version === real.version && bpj.script === real.script);
  /* haqiqiy faylda dl/dw — geometrik o'lcham (bbox bilan bir xil); bizda ham */
  const dlBbox = (o) => {
    const g = o.boundingBox.global, s = [g.max.x - g.min.x, g.max.y - g.min.y, g.max.z - g.min.z].map(Math.round).sort((a, b) => a - b);
    const d = [o.dimensions.dl, o.dimensions.dw, o.dimensions.dp].map(Math.round).sort((a, b) => a - b);
    return s.every((x, i) => Math.abs(x - d[i]) <= 1);
  };
  const realOk = real.objects.filter(o => !o.isOval).filter(dlBbox).length, realN = real.objects.filter(o => !o.isOval).length;
  /* haqiqiy faylda bir nechtasi L-shakl kontur (isOval emas, lekin bbox kattaroq) — asosiy qoida dl = geometrik o'lcham */
  ok(`dl/dw — geometrik o'lcham: haqiqiy faylda ${realOk}/${realN} (qolgani L-shakl kontur), bizda ${bpj.objects.filter(dlBbox).length}/${bpj.objects.length}`, realOk >= 0.95 * realN && bpj.objects.every(dlBbox));
}

/* ══ 2) import skripti o'qiydigan maydonlar ══ */
console.log('\n[2] BazisUniversalImport.js o\'qiydigan maydonlar');
const num = (x) => typeof x === 'number' && Number.isFinite(x);
const vec = (p) => p && num(p.x) && num(p.y) && num(p.z);
const maydonXato = [];
if (!bpj.meta.modelName) maydonXato.push('meta.modelName');
for (const o of bpj.objects) {
  const e = [];
  if (typeof o.name !== 'string' || !o.name) e.push('name');
  if (typeof o.artPos !== 'string') e.push('artPos');
  if (typeof o.isOval !== 'boolean') e.push('isOval');
  if (!(o.dimensions.dl > 0 && o.dimensions.dw > 0 && o.dimensions.dp > 0)) e.push('dimensions');
  if (!o.material || typeof o.material.name !== 'string' || !o.material.name) e.push('material.name');
  if (!Array.isArray(o.plastics) || !Array.isArray(o.cuts) || !Array.isArray(o.ownerChain)) e.push('plastics/cuts/ownerChain');
  if (o.butts.some(b => !(Number.isInteger(b.elemIndex) && b.elemIndex >= 0 && b.elemIndex < 4) || !b.material || !(b.thickness > 0) || !num(b.width))) e.push('butts');
  if (o.holes.some(h => !num(h.x) || !num(h.y) || !num(h.z) || !(h.diameter > 0) || !(h.depth > 0))) e.push('holes');
  const t = o.transform;
  if (!t || !vec(t.origin) || !vec(t.axisX) || !vec(t.axisY) || !vec(t.axisZ) || t.derived) e.push('transform');
  if (!o.boundingBox || !vec(o.boundingBox.global.min) || !vec(o.boundingBox.global.max)) e.push('boundingBox.global');
  if (!Array.isArray(o.contour.outer) || o.contour.outer.length !== 4 || !Array.isArray(o.contour.inner)) e.push('contour');
  if (e.length) maydonXato.push(o.id + ':' + e.join(','));
}
ok(`${bpj.objects.length} panel: name, artPos, isOval, dimensions, material.name, plastics, butts (elemIndex 0–3), holes (x,y,z), transform (aniq, derived yo'q), boundingBox, contour`, !maydonXato.length, maydonXato.slice(0, 5).join(' | '));

/* ══ 3) ramka ══ */
console.log('\n[3] Panel ramkasi');
const d = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cr = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
let ramkaX = 0, bboxX = 0;
for (const o of bpj.objects) {
  const { axisX: X, axisY: Y, axisZ: Z, origin: O } = o.transform;
  const c = cr(X, Y);
  if ([X, Y, Z].some(v => Math.abs(d(v, v) - 1) > 1e-6) || Math.abs(d(X, Y)) > 1e-6 || Math.abs(c.x - Z.x) + Math.abs(c.y - Z.y) + Math.abs(c.z - Z.z) > 1e-6) ramkaX++;
  const { dl, dw, dp } = o.dimensions, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < 8; k++) {
    const a = k & 1 ? dl : 0, b = k & 2 ? dw : 0, z = k & 4 ? dp : 0;
    const p = [O.x + X.x * a + Y.x * b + Z.x * z, O.y + X.y * a + Y.y * b + Z.y * z, O.z + X.z * a + Y.z * b + Z.z * z];
    for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  }
  const g = o.boundingBox.global;
  if (Math.abs(mn[0] - g.min.x) > 0.01 || Math.abs(mn[1] - g.min.y) > 0.01 || Math.abs(mn[2] - g.min.z) > 0.01 ||
      Math.abs(mx[0] - g.max.x) > 0.01 || Math.abs(mx[1] - g.max.y) > 0.01 || Math.abs(mx[2] - g.max.z) > 0.01) bboxX++;
}
ok('o\'qlar birlik, perpendikular, o\'ng qo\'l (X × Y = Z)', !ramkaX, ramkaX + ' panel');
ok('boundingBox.global = transform + dimensions (import skriptining bbox usuli bilan ham bir xil joy)', !bboxX, bboxX + ' panel');
/* kromka F qirrasi (elemIndex 0, kontur y = 0) — chuqurlik bo'ylab yotgan panelda modulning old tomonida.
 * Modul oldi Smart3D'da lokal +y → burilish bilan (−sin, cos); Bazis'da (X, Z) = (−x, y) → (sin, cos) */
let fXato = 0, fN = 0;
const plById = Object.fromEntries(bpj.smart3d.placements.map(p => [p.id, p]));
for (const o of bpj.objects) {
  if (!o.butts.some(b => b.elemIndex === 0)) continue;
  const r = (+plById[o.userProps.smart3d_placement].rot || 0) * Math.PI / 180;
  const F = { x: Math.round(Math.sin(r)), y: 0, z: Math.round(Math.cos(r)) };
  const { axisY: Y, origin: O } = o.transform;
  if (Math.abs(Math.abs(d(Y, F)) - 1) > 1e-6) continue;
  fN++;
  const g = o.boundingBox.global;
  const old = Math.max(g.min.x * F.x, g.max.x * F.x) + Math.max(g.min.z * F.z, g.max.z * F.z);
  if (Math.abs(d(O, F) - old) > 0.01) fXato++;
}
ok(`kromka F qirrasi modul oldida (${fN} panel, 0°/90°/180°/270°; kesim ro'yxati kromkasi — MC detallari ham)`, fN > 0 && !fXato, fXato + ' panel');
const yer = bpj.objects.every(o => o.boundingBox.global.min.x >= -0.01);
/* MC pastki shkafi: Bazis'da korpus 100 mm oyoqda, sokol ("Фронтальная") 10…100; Smart3D konstruktori modulni z = 0 ga
 * qo'yadi — sokol −90…0 ga tushadi (BPJ Smart3D modelini aynan beradi; egasiga savol — TZ-17 natijasi) */
ok(`Bazis o'qlari: X ≥ 0 (OFF = ${bpj.smart3d.offsetX}), Y — yuqori: oshxona pastki shkaflari −90…~900 mm`, yer &&
  bpj.objects.filter(o => /^MC-KP/.test(o.artPos)).every(o => o.boundingBox.global.min.y >= -91 && o.boundingBox.global.max.y <= 1000));

/* ══ 4) ERP o'quvchisi ══ */
console.log('\n[4] ERP o\'quvchisi (bpj_parser.py) bilan');
const tmp = mkdtempSync(join(tmpdir(), 's3d-bpj-'));
try {
  const fayl = join(tmp, 'namuna.bpj');
  writeFileSync(fayl, JSON.stringify(bpj));
  let r = null, err = '';
  try { r = JSON.parse(execFileSync('python3', ['-I', join(ROOT, 'tests', 'bpj_erp.py'), fayl], { encoding: 'utf8', timeout: 60000 })); }
  catch (e) { err = String(e.stderr || e.message).split('\n').slice(-3).join(' '); }
  if (r && r.yoq) console.log('  · bpj_parser.py yo\'q — o\'tkazib yuborildi');
  else {
    ok('xatosiz o\'qidi (' + (r ? r.total_panels + ' detal, ' + r.panels.length + ' qator' : 'xato') + ')', !!r, err);
    if (r) {
      ok('detal soni = objects = kesim ro\'yxati (' + bpj.objects.length + ')', r.total_panels === bpj.objects.length && r.total_panels === cutlists.reduce((s, c) => s + c.parts.length, 0));
      /* o'lcham va material — kesim ro'yxati bilan (tayyor o'lcham, qalinlik, material nomi) */
      const mName = (code) => ((H.materials.panel_materials || []).find(m => m.code === code) || {}).name || code;
      const kalit = (dl, dw, dp, m) => [Math.round(dl), Math.round(dw), Math.round(dp), m].join('|');
      const A = new Map(), B = new Map();
      for (const p of r.panels) A.set(kalit(p.dl, p.dw, p.dp, p.material), (A.get(kalit(p.dl, p.dw, p.dp, p.material)) || 0) + p.count);
      for (const c of cutlists) for (const p of c.parts) {
        const k = kalit(+p.finish_length || +p.length, +p.finish_width || +p.width, +p.thickness, mName(p.material));
        B.set(k, (B.get(k) || 0) + 1);
      }
      const farq = [...new Set([...A.keys(), ...B.keys()])].filter(k => A.get(k) !== B.get(k));
      ok(`o'lcham × qalinlik × material: ERP ${A.size} tur = kesim ro'yxati ${B.size} tur, soni ham bir xil`, !farq.length, farq.slice(0, 4).map(k => k + ' ' + (A.get(k) || 0) + '≠' + (B.get(k) || 0)).join(' | '));
      ok('GibLab eksporti bor, materiallar ro\'yxati to\'liq', r.has_giblab && r.materials.length === bpj.materials.length);
    }
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
