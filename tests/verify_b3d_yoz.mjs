/* TZ-33 B2: Bazis .b3d YOZUVCHI (app/js/engine/bazis/b3dYoz.js) tekshiruvi — SINOV: haqiqiy Bazis'da ochish bu yerda tekshirilmaydi.
 *   1) Format qoidalari: sarlavha, zlib, sxema tartibi, butun son turi (i8/i32), PNG — yozilgan fayl umumiy o'quvchida aynan qayta o'qiladi.
 *   2) Smart3D loyiha (konstruktor oshxonasi + modullar → BPJ → .b3d) → bizning o'quvchi (b3d.js + daraxt.js):
 *      panellar soni, o'lcham (±0,1 mm), qalinlik, material, joy (pos + o'qlar), kromka, modul soni, furnitura soni teng.
 *   3) Mahalliy sex fayllari bo'lsa (git'da yo'q — mijoz ma'lumoti): "Bazis 15" fayllari — o'qish → qayta yozish baytma-bayt AYNAN
 *      (format grammatikasi isboti); barcha fayl: o'qish → loyiha → yozish → o'qish → solishtirish (round-trip).
 * Ishlatish: node tests/verify_b3d_yoz.mjs */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { b3dYoz, bpjdanLoyiha, umumiyOqi, oqimBaytlari, oqdanKvaternion, zlibSaqlash } from '../app/js/engine/bazis/b3dYoz.js';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { parseBazisB3D, contourBBox, PANEL_CODE } from '../app/js/engine/bazis/b3d.js';
import { buildBPJ } from '../app/js/engine/bpj.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { loadData, createHisob } from '../web/src/services/hisob.js';

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
      return { nom: o.name || 'detal', dl: bb.dl, dw: bb.dw, dp: o.thickness, material: o.material || '', pos: o.tf.pos, oq: o.tf.oq,
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
        : Math.max(...o.tf.pos.map((x, k) => Math.abs(x - q.tf.pos[k]))) > 1e-6 ? 'joy' : (o.name || 'detal') !== q.name ? 'nom' : '';
      if (sebab) { xato++; SEBAB[sebab] = (SEBAB[sebab] || 0) + 1; if (process.env.DEBUG_B3D && SEBAB[sebab] < 3) console.log('   ', sebab, JSON.stringify([o.name, q.name, o.material, q.material, o.thickness, q.thickness, a, b])); }
    });
    if (!xato) rtOk++; else farqlar.push(f.split('/').slice(-2).join('/') + ': ' + xato + ' farq');
  }
  ok(`"Bazis 15" fayllari: o'qish → qayta yozish baytma-bayt aynan (${aynan}/${jami15})`, jami15 > 0 && aynan === jami15);
  ok(`round-trip: o'qish → loyiha → yozish → o'qish — panel soni, o'lcham, qalinlik, material, nom, joy teng (${rtOk}/${rtJami} fayl, ${panelJami} panel)`, rtJami > 0 && rtOk === rtJami, farqlar.slice(0, 3).join(' | ') + ' ' + JSON.stringify(SEBAB));
}

console.log(`\n${fail ? '❌' : '✅'} verify_b3d_yoz: ${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);
