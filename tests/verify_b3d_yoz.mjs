/* TZ-33 B2: Bazis .b3d YOZUVCHI (app/js/engine/bazis/b3dYoz.js) tekshiruvi — SINOV: haqiqiy Bazis'da ochish bu yerda tekshirilmaydi.
 *   1) Format qoidalari: sarlavha, zlib, sxema tartibi, butun son turi (i8/i32), PNG — yozilgan fayl umumiy o'quvchida aynan qayta o'qiladi.
 *   2) Smart3D loyiha (konstruktor oshxonasi + modullar → BPJ → .b3d) → bizning o'quvchi (b3d.js + daraxt.js):
 *      panellar soni, o'lcham (±0,1 mm), qalinlik, material, joy (pos + o'qlar), kromka, modul soni, furnitura soni teng.
 *   3) Mahalliy sex fayllari bo'lsa (git'da yo'q — mijoz ma'lumoti): "Bazis 15" fayllari — o'qish → qayta yozish baytma-bayt AYNAN
 *      (format grammatikasi isboti); barcha fayl: o'qish → loyiha → yozish → o'qish → solishtirish (round-trip).
 *   4) Yotoqxona (Tayyor → Yotoqxona) → eksportModeli (SketchUp manbasi) → modeldanLoyiha → b3dYoz → daraxt: har panel AABB modeldagi bilan teng (±0,5 mm),
 *      garderob/komod yig'ilgan (bitta tana), eshiklar korpus old tekisligida, modullar ustma-ust emas, furnitura joyi teng (sintetik — sex fayli kerak emas).
 *   5) Sex fayli bo'lsa: har panel global AABB (kontur + qalinlik) o'qish → loyiha → yozish → o'qishdan keyin aynan (±0,5 mm).
 * Ishlatish: node tests/verify_b3d_yoz.mjs */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { b3dYoz, bpjdanLoyiha, umumiyOqi, oqimBaytlari, oqdanKvaternion, zlibSaqlash } from '../app/js/engine/bazis/b3dYoz.js';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { parseBazisB3D, contourBBox, PANEL_CODE } from '../app/js/engine/bazis/b3d.js';
import { buildBPJ } from '../app/js/engine/bpj.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
globalThis.SpPrice = createRequire(import.meta.url)('../app/js/engine/price.js');   // hisob.js recalc shuni kutadi (verify_skp.mjs kabi)
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const { promptLoyiha } = await import('../app/js/engine/promptlar.js');
const { eksportModeli, modulJoyi } = await import('../web/src/features/editor/eksport/model.js');
const { modeldanLoyiha } = await import('../app/js/engine/bazis/modelLoyiha.js');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
const deflate = (b) => new Uint8Array(zlib.deflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);
const yaqin = (a, b, e) => Math.abs(a - b) <= e;

/* ══ 1) Format qoidalari ══ */
console.log('\n[1] Format qoidalari');
{
  const L = { nom: 'Sinov', modullar: [{ nom: 'Modul A', panellar: [
    { nom: 'bok', dl: 692, dw: 450, dp: 16, material: 'LDSP 16mm', kromka: [{ elem: 0, nom: 'Кромка 0,4', qalinlik: 0.4 }], pos: [2444, 116, 69], oq: [[0, 1, 0], [1, 0, 0], [0, 0, -1]] }],
    furnitura: [{ nom: 'Петля прямая', soni: 2 }] }] };
  for (const [nom, df] of [['siqilmagan zlib', undefined], ['deflate (pako/zlib)', deflate]]) {
    const b = b3dYoz(L, { deflate: df });
    ok(nom + ': "BZ85" + oqim belgisi 01 00 00 FF', String.fromCharCode(...b.subarray(0, 4)) === 'BZ85' && b[4] === 1 && b[5] === 0 && b[6] === 0 && b[7] === 0xFF && b[8] === 0);
    let u; try { u = umumiyOqi(b, inflate); } catch (e) { u = null; }
    ok(nom + ': umumiy o\'quvchi faylni oxirigacha o\'qiydi (sarlavha + model)', !!u && u.sarlavha.nom === 'Header' && u.hujjat.nom === 'Document');
    ok(nom + ': model daraxti qayta yozilganda baytma-bayt aynan', !!u && Buffer.compare(Buffer.from(oqimBaytlari(u.hujjat)), Buffer.from(u.model)) === 0);
    const png = b.indexOf(0x89); ok(nom + ': PNG ko\'rish rasmi to\'g\'ri tugaydi (IEND)', png > 0 && Buffer.from(b).indexOf('IEND') > png);
  }
  ok('zlibSaqlash — Node zlib ochadi', Buffer.compare(Buffer.from(zlib.inflateSync(Buffer.from(zlibSaqlash(Uint8Array.from({ length: 70000 }, (_, i) => i % 251))))), Buffer.from(Uint8Array.from({ length: 70000 }, (_, i) => i % 251))) === 0);
  const q = oqdanKvaternion([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  ok('birlik o\'qlar → birlik kvaternion', q[3] === 1 && q[0] === 0 && q[1] === 0 && q[2] === 0);
  let xato = null; try { b3dYoz({ nom: 'x', modullar: [{ nom: 'a', panellar: [{ nom: 'p', dl: 0, dw: 5, dp: 16, pos: [0, 0, 0], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }] }] }); } catch (e) { xato = e; }
  ok('noto\'g\'ri panel o\'lchami — xato (jim emas)', !!xato && /o'lchami/.test(xato.message));
}

/* ══ 2) Smart3D loyiha → .b3d → o'quvchi ══ */
console.log('\n[2] Smart3D loyiha → .b3d → bizning o\'quvchi (b3d.js + daraxt.js)');
{
  const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(ROOT, 'app', 'data', n), 'utf8')))));
  const rect = (W, D) => [[0, 0], [W, 0], [W, D], [0, D]];
  const v = konstruksiya({ outline: rect(3600, 3000), utilities: [{ type: 'pipe', wall: 0, offset: 1500, z: 500 }] }, { shakl: 'L' }, H.catalog).variantlar[0];
  const placements = v.placements.filter(p => (H.catalog[p.frg].parts || []).length);
  for (const [i, code] of ['SP-K-001', 'SP-K-004'].entries()) {
    const f = H.catalog[code];
    if (f) placements.push({ id: 'u' + i, frg: code, x: 200 + i * 700, y: 2400, z: 0, w: f.w, d: f.d, h: f.h, rot: 180, qty: 1 });
  }
  const cutlists = placements.map(p => Object.assign(cutlist(H.catalog[p.frg], p.w, p.d, p.h, H.materials, {}), { placementId: p.id }));
  const bpj = buildBPJ({ room: { outline: rect(3600, 3000) }, placements }, H.catalog, H.materials, { modelName: 'Namuna oshxona', cutlists });
  const FURN = (k) => [{ nom: 'Петля прямая', soni: 2 }, { nom: 'Ручка ' + (k % 2), soni: 1 }];
  const L = bpjdanLoyiha(bpj, FURN);
  const b = b3dYoz(L, { deflate });
  const d = daraxt(b, { inflate });
  ok('daraxt.js faylni o\'qiydi (shifrlanmagan, obyektlar bor)', !!d && Array.isArray(d.objects) && d.objects.length > 0);
  const paneller = d.objects.filter(o => o.modelCode === PANEL_CODE);
  ok(`panellar soni teng (BPJ ${bpj.objects.length}, o'qildi ${paneller.length})`, paneller.length === bpj.objects.length && bpj.objects.length > 20);
  const modullar = d.objects.filter(o => o.modelCode === 1005);
  ok(`modullar soni teng (${bpj.blocks.length})`, modullar.length === bpj.blocks.length);
  const furn = d.objects.filter(o => o.modelCode === 3001);
  const furnKutilgan = bpj.blocks.reduce((s, _, k) => s + FURN(k).reduce((a, x) => a + x.soni, 0), 0);
  ok(`furnitura soni teng (${furnKutilgan})`, furn.length === furnKutilgan);
  ok('furnitura nomi saqlanadi (kirill)', furn.some(o => o.name === 'Петля прямая'));
  let xOlcham = 0, xQal = 0, xMat = 0, xJoy = 0, xOq = 0, xKr = 0, xNom = 0, maxJoy = 0;
  bpj.objects.forEach((o, i) => {
    const r = paneller[i]; if (!r) return;
    const bb = contourBBox(r.contour_outer);
    if (!(yaqin(bb.dl, o.dimensions.dl, 0.1) && yaqin(bb.dw, o.dimensions.dw, 0.1))) xOlcham++;
    if (r.thickness !== o.dimensions.dp) xQal++;
    if (r.material !== o.material.name) xMat++;
    if (r.name !== o.name) xNom++;
    const tr = o.transform, pos = [tr.origin.x, tr.origin.y, tr.origin.z];
    const dj = Math.max(...pos.map((x, k) => Math.abs(x - r.tf.pos[k])));
    maxJoy = Math.max(maxJoy, dj); if (dj > 1e-6) xJoy++;
    const oq = [tr.axisX, tr.axisY, tr.axisZ].map(a => [a.x, a.y, a.z]);
    if (Math.max(...oq.flatMap((a, i2) => a.map((x, k) => Math.abs(x - r.tf.oq[i2][k])))) > 1e-9) xOq++;
    const kb = (o.butts || []).map(x => x.elemIndex).sort().join(), ko = (r.butts || []).map(x => x.edgeIndex).sort().join();
    if (kb !== ko) xKr++;
  });
  ok('har panel o\'lchami (kontur) ±0,1 mm teng', xOlcham === 0, xOlcham + ' ta farq');
  ok('qalinlik teng', xQal === 0, xQal + ' ta farq');
  ok('material nomi aynan teng', xMat === 0, xMat + ' ta farq');
  ok('panel nomi aynan teng', xNom === 0, xNom + ' ta farq');
  ok(`joy (pos) teng (eng katta farq ${maxJoy.toExponential(1)} mm)`, xJoy === 0, xJoy + ' ta farq');
  ok('joy (3 o\'q) teng (1e-9)', xOq === 0, xOq + ' ta farq');
  ok('kromka qirralari (elemIndex) teng', xKr === 0, xKr + ' ta farq');
  const nomsiz = bpj.objects.filter(o => (o.butts || []).length).length;
  ok(`kromkali panel bor (${nomsiz})`, nomsiz > 0);
  const flat = parseBazisB3D(b, { inflate });
  ok('b3d.js (tekis o\'quvchi) ham o\'qiydi — panel soni teng', flat.objects.filter(o => o.modelCode === PANEL_CODE).length === bpj.objects.length);
}

/* ══ 4) Yotoqxona: .b3d dagi har panel joyi = SketchUp eksporti (eksportModeli) joyi ══ */
console.log('\n[4] Yotoqxona → eksportModeli → modeldanLoyiha → b3dYoz → daraxt (panel joyi 3D bilan teng)');
{
  const DATA = join(ROOT, 'app', 'data');
  const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(DATA, n), 'utf8')))));
  const prompt = JSON.parse(readFileSync(join(DATA, 'promptlar.json'), 'utf8')).promptlar.find(x => x.id === 'yotoqxona');
  const r = promptLoyiha(prompt, {}, H.catalog);
  const doc = { room: { outline: r.xona.outline, wall_height: r.xona.H }, placements: r.placements.map((p, i) => Object.assign({ id: i + 1 }, p)) };
  const res = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'MDF16' });
  const view = Object.assign({}, doc, { placements: H.viewPlacements(doc) });
  const model = eksportModeli(view, H, res.cutlists);
  const L = modeldanLoyiha(model, { catalog: H.catalog, materials: H.materials, cutlists: res.cutlists, nom: 'Yotoqxona' });
  const bytes = b3dYoz(L, { deflate });
  const d = daraxt(bytes, { inflate });
  const OFF = L.OFF;
  ok(`loyiha: ${r.placements.length} modul (krovat, garderob, komod, deraza, eshik), ${L.modullar.reduce((a, m) => a + m.panellar.length, 0)} panel`, L.modullar.length === 5 && L.modullar.every(m => m.panellar.length > 0));
  const kod = (m) => m.nom;
  const moduls = d.objects.filter(o => o.modelCode === 1005);
  ok('daraxt: modullar soni teng', moduls.length === L.modullar.length);
  /* panel AABB (Bazis global → Smart3D dunyo: x = OFF − X, y = Z, z = Y) */
  const aabbBazis = (o) => {
    const bb = contourBBox(o.contour_outer), mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18];
    for (const a of [bb.x0, bb.x0 + bb.dl]) for (const b of [bb.y0, bb.y0 + bb.dw]) for (const c of [0, o.thickness]) for (let i = 0; i < 3; i++) {
      const q = o.tf.pos[i] + a * o.tf.oq[0][i] + b * o.tf.oq[1][i] + c * o.tf.oq[2][i]; mn[i] = Math.min(mn[i], q); mx[i] = Math.max(mx[i], q);
    }
    return { mn, mx };
  };
  const dunyoga = (a) => ({ mn: [OFF - a.mx[0], a.mn[2], a.mn[1]], mx: [OFF - a.mn[0], a.mx[2], a.mx[1]] });
  const modelAABB = (m, D) => {
    const J = modulJoyi(m), mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18];
    for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) {
      const l = [D.min[0] + a * D.s[0], D.min[1] + b * D.s[1], D.min[2] + c * D.s[2]];
      for (let i = 0; i < 3; i++) { const v = J.t[i] + J.R[i][0] * l[0] + J.R[i][1] * l[1] + J.R[i][2] * l[2]; mn[i] = Math.min(mn[i], v); mx[i] = Math.max(mx[i], v); }
    }
    return { mn, mx };
  };
  const farq = (a, b) => Math.max(...[0, 1, 2].map(i => Math.max(Math.abs(a.mn[i] - b.mn[i]), Math.abs(a.mx[i] - b.mx[i]))));
  const aralash = (a, b) => Math.max(...[0, 1, 2].map(i => Math.max(a.mn[i] - b.mx[i], b.mn[i] - a.mx[i])));   // < 0 — kesishadi (chuqurligi), 0 — tegadi, > 0 — oraliq
  const birlash = (arr) => ({ mn: [0, 1, 2].map(i => Math.min(...arr.map(a => a.mn[i]))), mx: [0, 1, 2].map(i => Math.max(...arr.map(a => a.mx[i]))) });
  /* modul guruhlari → ichidagi panellar (DFS tartibida: guruhdan keyingi panellar shu guruhniki) */
  const objs = d.objects; const guruh = [];
  objs.forEach(o => { if (o.modelCode === 1005 && o.chuqur === 0) guruh.push({ g: o, p: [], f: [] }); else if (guruh.length && o.modelCode === PANEL_CODE) guruh[guruh.length - 1].p.push(o); else if (guruh.length && o.modelCode === 3001) guruh[guruh.length - 1].f.push(o); });
  const natija = model.modullar.map((m, k) => ({ m, g: guruh[k], A: guruh[k].p.map(o => dunyoga(aabbBazis(o))) }));
  /* a) har panel AABB = modeldagi (karkas yig'ilgan modul — alohida: gabarit teng) */
  let jami = 0, teng = 0, eng = 0; const karkasModul = new Set();
  for (const { m, g, A } of natija) {
    if (g.p.length === m.detallar.length) {
      m.detallar.forEach((D, i) => { jami++; const f = farq(A[i], modelAABB(m, D)); eng = Math.max(eng, f); if (f <= 0.5) teng++; });
    } else karkasModul.add(m.kod);
  }
  ok(`har panel AABB eksportModeli bilan teng ±0,5 mm: ${teng}/${jami} (eng katta farq ${eng.toFixed(3)} mm; karkas yig'ilgan modullar: ${[...karkasModul].join(', ') || '—'})`, jami > 40 && teng === jami);
  /* b) krovat — faqat modeldan (MC: BPJ bilan ham 0 mm farq bo'lgan) */
  const mcM = natija.find(x => x.m.kod === 'MC-KR-04');
  ok('krovat (MC) — 32 panel, hammasi modeldagidek joyda', !!mcM && mcM.g.p.length === 32 && mcM.m.detallar.every((D, i) => farq(mcM.A[i], modelAABB(mcM.m, D)) <= 0.5));
  /* c) har modul bitta tana: panellar bir-biriga tegadi yoki kesishadi (tegish oralig'i ≤ 0,5 mm) */
  const boglangan = (A) => { const t = new Set([0]), q = [0]; while (q.length) { const i = q.pop(); A.forEach((b, j) => { if (!t.has(j) && aralash(A[i], b) <= 0.5) { t.add(j); q.push(j); } }); } return t.size === A.length; };
  for (const x of natija.filter(x => x.A.length > 2)) ok(`${x.m.kod} (${x.A.length} panel): panellar yig'ilgan — bitta tana (bir-biriga tegib turadi)`, boglangan(x.A));
  /* d) modul lokal koordinatalarida: eshiklar (fasad) old tekisligida; hamma panel gabaritda (eshik qalinligi 16,5 mm gacha oldinga) */
  const lokal = (m, a) => {   // dunyo AABB markazi → modul lokal (burchakdan) — burchak 90° ga karrali emasligi ham to'g'ri
    const J = modulJoyi(m), R = J.R, mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18];
    for (const x of [a.mn[0], a.mx[0]]) for (const y of [a.mn[1], a.mx[1]]) for (const z of [a.mn[2], a.mx[2]]) {
      const v = [x - J.t[0], y - J.t[1], z - J.t[2]], l = [0, 1, 2].map(j => R[0][j] * v[0] + R[1][j] * v[1] + R[2][j] * v[2]);
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], l[i]); mx[i] = Math.max(mx[i], l[i]); }
    }
    return { mn, mx };
  };
  for (const x of natija.filter(x => /^SP-(W|BD)-/.test(x.m.kod) && x.A.length > 2)) {
    const [w, dd, h] = x.m.olcham, Lk = x.A.map(a => lokal(x.m, a)), U = birlash(Lk);
    const sig = U.mn[0] >= -0.5 && U.mx[0] <= w + 0.5 && U.mn[1] >= -0.5 && U.mx[1] <= dd + 16.5 && U.mn[2] >= -0.5 && U.mx[2] <= h + 0.5;
    ok(`${x.m.kod}: hamma panel modul gabaritida (eshik — old tomonda 16 mm gacha): ${U.mn.map(v => v.toFixed(0)).join(',')} → ${U.mx.map(v => v.toFixed(0)).join(',')} / ${w}×${dd}×${h}`, sig);
    const eshik = x.m.detallar.map((D, i) => ({ D, i })).filter(e => e.D.qatlam === 1);
    if (eshik.length) ok(`${x.m.kod}: eshiklar (${eshik.length}) korpus old tekisligida (chuqurlik = ${dd} mm dan boshlanadi)`, eshik.every(e => Math.abs(Lk[e.i].mn[1] - dd) <= 0.5));
  }
  { /* garderob: yon devor ×2 + past + tepa + orqa bir-biriga tegib turadi (yon devorlar tepa va past bilan) */
    const x = natija.find(q => q.m.kod === 'SP-W-006'), nom = (re) => x.m.detallar.map((D, i) => ({ D, i })).filter(e => re.test(e.D.nom));
    const yon = nom(/yon devor/i), past = nom(/Tub/i), tepa = nom(/Qopqoq/i), orqa = nom(/Orqa/i), javon = nom(/javon/i);
    ok(`SP-W-006: yon ×${yon.length}, past ${past.length}, tepa ${tepa.length}, orqa ${orqa.length}, polka ×${javon.length} — hammasi bor`, yon.length === 2 && past.length === 1 && tepa.length === 1 && orqa.length === 1 && javon.length === 3);
    const teg = (a, b) => aralash(x.A[a.i], x.A[b.i]) <= 0.5;
    ok('SP-W-006: yon devorlar past va tepa bilan tegib turadi (korpus yig\'ilgan)', yon.every(y => teg(y, past[0]) && teg(y, tepa[0])));
    ok('SP-W-006: polkalar yon devorlar orasida (ichida, korpusdan chiqmaydi)', javon.every(j => yon.every(y => teg(j, y)) && aralash(x.A[j.i], birlash(yon.map(y => x.A[y.i]))) <= 0.5));
  }
  { /* komod — massiv quti emas, yig'ilgan karkas: yon×2, ust, past, orqa, polka (kesim ro'yxati o'lchamida) */
    const x = natija.find(q => q.m.kod === 'SP-BD-005'), cl = res.cutlists.find(c => c.placementId === x.m.id);
    ok(`SP-BD-005 (komod): massiv quti emas — ${x.g.p.length} panel = kesim ro'yxati (${cl.parts.length}), yig'ilgan`, x.g.p.length === cl.parts.length && x.g.p.length >= 5 && boglangan(x.A));
    const U = birlash(x.A.map(a => lokal(x.m, a)));
    ok('SP-BD-005: tashqi gabarit 3D dagi quti bilan bir xil (±0,5 mm)', farq(birlash(x.A), modelAABB(x.m, x.m.detallar[0])) <= 0.5);
  }
  /* e) modullar ustma-ust tushmaydi (xonada joyida) */
  let kesish = 0; const Um = natija.map(x => birlash(x.A));
  for (let i = 0; i < Um.length; i++) for (let j = i + 1; j < Um.length; j++) if (aralash(Um[i], Um[j]) < -1) { kesish++; console.log('     kesishadi:', natija[i].m.kod, natija[j].m.kod, aralash(Um[i], Um[j]).toFixed(1)); }
  ok('modullar ustma-ust tushmaydi (gabaritlar kesishmaydi, > 1 mm)', kesish === 0);
  /* f) o'qlar: har panel o'qi o'ng qo'l (det = +1), birlik */
  const det = (q) => q[0][0] * (q[1][1] * q[2][2] - q[1][2] * q[2][1]) - q[0][1] * (q[1][0] * q[2][2] - q[1][2] * q[2][0]) + q[0][2] * (q[1][0] * q[2][1] - q[1][1] * q[2][0]);
  ok('har panel o\'qi o\'ng qo\'l tizimi (det = +1) — ko\'zgu emas', d.objects.filter(o => o.modelCode === PANEL_CODE).every(o => Math.abs(det(o.tf.oq) - 1) < 1e-6));
  /* g) modul guruhi gabarit burchagida, panel va furnitura joyi guruhga nisbatan; X ≥ 0, Y ≥ 0, Z ≥ 0 */
  const hammaPanel = d.objects.filter(o => o.modelCode === PANEL_CODE).map(aabbBazis);
  ok('Bazis o\'qlari: hamma panel X ≥ 0, Y ≥ 0 (Y — bo\'yi: pol 0 dan), Z ≥ −5 (MC krovat obmankasi modelda ham devordan 5 mm chiqadi)', hammaPanel.every(a => a.mn[0] >= -1e-6 && a.mn[1] >= -1e-6 && a.mn[2] >= -5.001) && Math.min(...hammaPanel.map(a => a.mn[1])) <= 1e-6);
  ok('modul guruhi — gabarit burchagida (Trans = panellar AABB min), guruh ichi — nisbiy', guruh.every(({ g, p }) => { const U = birlash(p.map(aabbBazis)); return [0, 1, 2].every(i => Math.abs(g.tf.pos[i] - U.mn[i]) <= 1e-6); }));
  /* h) furnitura: soni va joyi (eksportModeli modul.furnitura bilan) */
  const furnKut = model.modullar.reduce((a, m) => a + m.furnitura.length + m.joysiz.reduce((s, j) => s + j.soni, 0), 0);
  ok(`furnitura soni teng (${furnKut})`, d.objects.filter(o => o.modelCode === 3001).length === furnKut);
  let fx = 0, fn = 0;
  natija.forEach(({ m, g }) => m.furnitura.forEach((f, i) => {
    const J = modulJoyi(m), o = g.f[i]; fn++; if (!o) { fx++; return; }
    const w3 = [0, 1, 2].map(k => J.t[k] + J.R[k][0] * f.t[0] + J.R[k][1] * f.t[1] + J.R[k][2] * f.t[2]), b = [OFF - w3[0], w3[2], w3[1]];
    if (Math.max(...b.map((v, k) => Math.abs(v - o.tf.pos[k]))) > 0.5) fx++;
  }));
  ok(`furnitura joyi eksportModeli bilan teng (±0,5 mm): ${fn - fx}/${fn}`, fn > 0 && fx === 0);
  /* i) b3d.js (tekis o'quvchi) ham o'qiydi */
  ok('b3d.js (tekis o\'quvchi) ham o\'qiydi — panel soni teng', parseBazisB3D(bytes, { inflate }).objects.filter(o => o.modelCode === PANEL_CODE).length === L.modullar.reduce((a, m) => a + m.panellar.length, 0));
  if (process.env.B3D_NAMUNA) { (await import('node:fs')).writeFileSync(process.env.B3D_NAMUNA, bytes); console.log('     namuna fayl:', process.env.B3D_NAMUNA, bytes.length, 'bayt'); }
}

/** panelning global AABB (kontur qutisi + qalinlik, daraxt.js global joyi) — asl va qayta yozilgan solishtiriladi */
function aabbOf(o) {
  const bb = contourBBox(o.contour_outer), mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18];
  for (const a of [bb.x0, bb.x0 + bb.dl]) for (const b of [bb.y0, bb.y0 + bb.dw]) for (const c of [0, o.thickness]) for (let i = 0; i < 3; i++) {
    const q = o.tf.pos[i] + a * o.tf.oq[0][i] + b * o.tf.oq[1][i] + c * o.tf.oq[2][i]; mn[i] = Math.min(mn[i], q); mx[i] = Math.max(mx[i], q);
  }
  return { mn, mx };
}
const aabbFarq = (o, q) => { const a = aabbOf(o), b = aabbOf(q); return Math.max(...[0, 1, 2].map(i => Math.max(Math.abs(a.mn[i] - b.mn[i]), Math.abs(a.mx[i] - b.mx[i])))); };

/* ══ 3) Sex fayllari (mahalliy) ══ */
console.log('\n[3] Sex fayllari — format isboti va round-trip (mahalliy ma\'lumot)');
const TOPLAM = process.env.SMART3D_TOPLAM || join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16');
const BZ = join(TOPLAM, '01_buyurtma_fayllari', '04_bazis');
if (!existsSync(BZ)) skip('Smart3D_toplam_2026-10-16 yo\'q (git\'da yo\'q — mijoz ma\'lumoti; SMART3D_TOPLAM=… bilan ko\'rsating)');
else {
  const fayllar = [];
  for (const dn of readdirSync(BZ)) { const dir = join(BZ, dn); if (!statSync(dir).isDirectory()) continue; for (const f of readdirSync(dir)) if (/\.b3d$/i.test(f)) fayllar.push(join(dir, f)); }
  const SEBAB = {};
  let aynan = 0, jami15 = 0, rtJami = 0, rtOk = 0, panelJami = 0, farqlar = [];
  for (const f of fayllar) {
    const bytes = new Uint8Array(readFileSync(f));
    /* a) "Bazis 15" shakli: model daraxti → qayta yozish baytma-bayt aynan */
    if (bytes[9] === 0x0f) {
      jami15++;
      try { const u = umumiyOqi(bytes, inflate); if (Buffer.compare(Buffer.from(oqimBaytlari(u.hujjat)), Buffer.from(u.model)) === 0) aynan++; } catch (e) { /* hisobga olinmaydi */ }
    }
    /* b) round-trip: o'qish → loyiha → yozish → o'qish */
    let d; try { d = daraxt(bytes, { inflate }); } catch (e) { d = null; }
    if (!d || !d.objects) continue;
    const P = d.objects.filter(o => o.modelCode === PANEL_CODE && o.contour_outer && o.tf && o.thickness > 0);
    if (!P.length) continue;
    rtJami++; panelJami += P.length;
    const m = new Map();
    for (const o of P) { const k = o.ota || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(o); }
    const spec = { nom: 'rt', modullar: [...m].map(([nom, arr]) => ({ nom: nom || 'modul', furnitura: [], panellar: arr.map(o => {
      const bb = contourBBox(o.contour_outer), lines = o.contour_outer.every(e => e.type === 'line');
      /* yoy/teshikli kontur — to'g'ri to'rtburchak (0..dl × 0..dw): kontur boshlanishi (x0, y0) panel joyiga o'tkaziladi, shunda AABB aynan qoladi */
      const pos = lines ? o.tf.pos : [0, 1, 2].map(i => o.tf.pos[i] + bb.x0 * o.tf.oq[0][i] + bb.y0 * o.tf.oq[1][i]);
      return { nom: o.name || 'detal', dl: bb.dl, dw: bb.dw, dp: o.thickness, material: o.material || '', pos, oq: o.tf.oq,
        kromka: (o.butts || []).filter(x => x.edgeIndex !== undefined).map(x => ({ elem: x.edgeIndex, nom: x.name, qalinlik: x.thickness })),
        kontur: lines ? o.contour_outer.map(e => [e.p1[0], e.p1[1], e.p2[0], e.p2[1]]) : null };
    }) })) };
    let d2; try { d2 = daraxt(b3dYoz(spec, { deflate }), { inflate }); } catch (e) { farqlar.push(f.split('/').slice(-2).join('/') + ': ' + e.message); continue; }
    const Q = d2.objects.filter(o => o.modelCode === PANEL_CODE);
    /* yozilgan tartib — guruhlar bo'yicha; solishtirish uchun ikkala tomonni ham guruh tartibiga keltiramiz */
    const tartib = [].concat(...[...m.values()]);
    let xato = Q.length === tartib.length ? 0 : 1e6;
    if (!xato) tartib.forEach((o, i) => {
      const q = Q[i], a = contourBBox(o.contour_outer), b = contourBBox(q.contour_outer);
      const sebab = !(yaqin(a.dl, b.dl, 0.1) && yaqin(a.dw, b.dw, 0.1)) ? 'olcham' : q.thickness !== o.thickness ? 'qalinlik' : (q.material || '') !== (o.material || '') ? 'material'
        : aabbFarq(o, q) > 0.5 ? 'joy-AABB' : (o.name || 'detal') !== q.name ? 'nom' : '';
      if (sebab) { xato++; SEBAB[sebab] = (SEBAB[sebab] || 0) + 1; if (process.env.DEBUG_B3D && SEBAB[sebab] < 3) console.log('   ', sebab, JSON.stringify([o.name, q.name, o.material, q.material, o.thickness, q.thickness, a, b])); }
    });
    if (!xato) rtOk++; else farqlar.push(f.split('/').slice(-2).join('/') + ': ' + xato + ' farq');
  }
  ok(`"Bazis 15" fayllari: o'qish → qayta yozish baytma-bayt aynan (${aynan}/${jami15})`, jami15 > 0 && aynan === jami15);
  ok(`round-trip: o'qish → loyiha → yozish → o'qish — panel soni, o'lcham, qalinlik, material, nom va global joy (AABB, ±0,5 mm) aynan teng (${rtOk}/${rtJami} fayl, ${panelJami} panel)`, rtJami > 0 && rtOk === rtJami, farqlar.slice(0, 3).join(' | ') + ' ' + JSON.stringify(SEBAB));
}

console.log(`\n${fail ? '❌' : '✅'} verify_b3d_yoz: ${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);
