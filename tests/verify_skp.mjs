/* TZ-33 A: SketchUp (.skp) va SketchUp Pro (.dae) eksporti (web/src/features/editor/eksport). Namunaviy loyiha — 3 ta MC modul
 * (eshikli, 3 tortmali — 90° burilgan, ustki), qo'lda chizilgan pastki modul (oyoqli) va umumiy katalog moduli; xona — yo'q.
 * .skp — openskp (o'sha 1.3.0) o'quvchisi bilan qayta o'qiladi: komponentlar = modullar, guruhlar = detallar (kesim ro'yxati),
 *   furnitura komponentlari soni, o'lchamlar (dyuym → mm, ±0,1 mm), dunyo joyi (OBJ eksportidagi formula bilan), material va
 *   qatlam nomlari, furnitura nomida ERP kodi, atributlar (material, o'lcham, kromka) faylda.
 * .dae — XML to'g'ri (qat'iy o'quvchi), COLLADA 1.4.1 ildizi, birlik va Z-yuqori; three.js ColladaLoader bilan qayta o'qiladi
 *   (node'da DOMParser yo'q — shu fayldagi kichik XML DOM o'rnini bosuvchi bilan), detal va furnitura soni, o'lcham (mm).
 * Namuna fayllar: SKP_NAMUNA=<papka> berilsa — o'sha yerga (egasi SketchUp'da ochib ko'rishi uchun). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const C = await import('../app/js/engine/chizish.js');
const { teshik3d } = await import('../app/js/engine/teshik3d.js');
const { eksportModeli } = await import('../web/src/features/editor/eksport/model.js');
const { skpYoz } = await import('../web/src/features/editor/eksport/skp.js');
const { daeYoz } = await import('../web/src/features/editor/eksport/dae.js');
const { parseSkp, buildScene } = await import('../web/node_modules/openskp/dist/index.mjs');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));

/* ── namunaviy loyiha ── */
const ch = C.yangiChizma('pastki');
H.catalog['CH-SKP'] = C.chizmaKatalog(ch, 'CH-SKP', 'pastki');
const F = (k) => H.catalog[k];
const doc = {
  room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700 },
  placements: [
    { id: 1, frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708, rot: 0 },
    { id: 2, frg: 'MC-KP-10', x: 1500, y: 0, z: 100, w: F('MC-KP-10').w, d: F('MC-KP-10').d, h: F('MC-KP-10').h, rot: 90 },
    { id: 3, frg: 'MC-KU-07', x: 0, y: 150, z: 1450, w: F('MC-KU-07').w, d: F('MC-KU-07').d, h: F('MC-KU-07').h, rot: 0 },
    { id: 4, frg: 'CH-SKP', x: 2000, y: 0, z: 0, w: ch.w, d: ch.d, h: ch.h, rot: 0 },
    { id: 5, frg: 'SP-K-001', x: 2800, y: 0, z: 0, w: F('SP-K-001').w, d: F('SP-K-001').d, h: F('SP-K-001').h, rot: 0 }
  ]
};
const res = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'MDF16' });
const view = Object.assign({}, doc, { placements: H.viewPlacements(doc) });
const model = eksportModeli(view, H, res.cutlists);
const clOf = (id) => res.cutlists.find(c => c.placementId === id);
const M = Object.fromEntries(model.modullar.map(m => [m.id, m]));
ok(`model: ${model.modullar.length} modul (xona yo'q), qatlamlar — ${model.qatlamlar.join(', ')}`, model.modullar.length === 5 && model.qatlamlar.join('|') === 'Korpus|Fasad|Orqa devor|Furnitura');
for (const id of [1, 2, 3, 4]) {
  const cl = clOf(id), n = cl.parts.reduce((a, p) => a + (+p.qty || 1), 0);
  ok(`model: ${M[id].kod} — detal ${M[id].detallar.length} = kesim ro'yxati ${n} (manba: ${M[id].manba})`, M[id].detallar.length === n && M[id].manba === 'kesim');
}
ok(`model: ${M[5].kod} (joy formulasi yo'q) — 3D panellar (OBJ manbasi): ${M[5].detallar.length} detal, ruchka ${M[5].furnitura.length}`, M[5].manba === '3d' && M[5].detallar.length > 3 && M[5].furnitura.every(f => f.tur === 'ruchka'));
{
  /* TZ-38: konfirmat, ekssentrik, oyoq belgilari faqat 3D ko'rinishda (eksportga kirmaydi) — eksport turlari: petlya, polka, ruchka, napr */
  const z = teshik3d(F('MC-KP-02'), 600, 450, 708, clOf(1), {}).zapchast.filter(x => ['petlya', 'polka', 'ruchka', 'napr'].includes(x.tur));
  const tur = (m, t) => m.furnitura.filter(f => f.tur === t).length;
  ok(`model: MC-KP-02 furnitura = 3D zapchast belgilari (${z.length}): petlya ${tur(M[1], 'petlya')}, polka ${tur(M[1], 'polka')}, ruchka ${tur(M[1], 'ruchka')}`,
    M[1].furnitura.length === z.length && tur(M[1], 'petlya') === 4 && tur(M[1], 'polka') === 4 && tur(M[1], 'ruchka') === 2);
  ok(`model: MC-KP-10 (3 tortma) — yo'naltiruvchi ${tur(M[2], 'napr')}, ruchka ${tur(M[2], 'ruchka')}`, tur(M[2], 'napr') >= 6);
  ok(`model: qo'lda chizilgan — oyoqcha ${tur(M[4], 'oyoq')} (assembler furn)`, tur(M[4], 'oyoq') >= 4);
  ok(`model: ruchka nomi — ERP nomi va kodi: "${(M[1].furnitura.find(f => f.tur === 'ruchka') || {}).nom}"`, /\(90001982\)$/.test((M[1].furnitura.find(f => f.tur === 'ruchka') || {}).nom || ''));
  ok(`model: MC oyoqchasi — joyi yo'q, o'ylab topilmaydi: "${M[1].atr.joysiz_furnitura}"`, /nojka/.test(M[1].atr.joysiz_furnitura) && !M[1].furnitura.some(f => f.tur === 'oyoq'));
}

/* ── .skp ── */
const u8 = skpYoz(model);
const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
const S = parseSkp(buf);
const defs = S.definitions, defByIdx = (i) => defs.get(i);
ok(`skp: fayl ${Math.round(u8.length / 1024)} KB, versiya ${S.version}, ildizda ${S.root.instances.length} komponent = modullar`, S.root.instances.length === 5 && S.root.faces.length === 0);
ok(`skp: qatlamlar (tag) — ${S.layers.map(l => l.name).join(', ')}`, ['Korpus', 'Fasad', 'Orqa devor', 'Furnitura'].every(n => S.layers.some(l => l.name === n)));
const matNom = new Set(S.materials.map(m => m.name));
ok(`skp: materiallar ${S.materials.length} = model (${model.materiallar.length}), nomlari teng: ${[...matNom].slice(0, 4).join(' | ')}…`,
  S.materials.length === model.materiallar.length && model.materiallar.every(m => matNom.has(m.nom)) && ['Korpus', 'Fasad', 'Orqa devor'].every(q => [...matNom].some(n => n.startsWith(q + ' — '))));
const matById = {};
for (const m of S.materials) matById[m.id] = m;
const bbox = (pts) => { const a = [Infinity, Infinity, Infinity], b = [-Infinity, -Infinity, -Infinity]; for (const p of pts) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], p[k]); b[k] = Math.max(b[k], p[k]); } return [a, b]; };
const vxyz = (v) => (Array.isArray(v) ? v : v.position ? [v.position.x, v.position.y, v.position.z] : [v.x, v.y, v.z]);
let olchamXato = [], matXato = [], soniXato = [], qatlamXato = [];
const QT = ['Korpus', 'Fasad', 'Orqa devor'];
for (const inst of S.root.instances) {
  const md = defByIdx(inst.refIdx), m = model.modullar.find(x => x.nom === md.name);
  if (!m) { soniXato.push('modul topilmadi: ' + md.name); continue; }
  const furnI = md.instances.filter(i => i.layer === 'Furnitura'), detI = md.instances.filter(i => i.layer !== 'Furnitura');
  if (detI.length !== m.detallar.length || furnI.length !== m.furnitura.length) soniXato.push(`${m.kod}: guruh ${detI.length}/${m.detallar.length}, furnitura ${furnI.length}/${m.furnitura.length}`);
  detI.forEach((gi, i) => {
    const dt = m.detallar[i], gd = defByIdx(gi.refIdx);
    const [a, b] = bbox(gd.vertices.map(vxyz));
    const s = [0, 1, 2].map(k => (b[k] - a[k]) * 25.4);
    if (s.some((v, k) => Math.abs(v - Math.max(0.1, dt.s[k])) > 0.1)) olchamXato.push(`${m.kod}/${dt.nom}: ${s.map(v => v.toFixed(2))} ≠ ${dt.s}`);
    const t = [gi.matrix[9], gi.matrix[10], gi.matrix[11]].map(v => v * 25.4);
    if (t.some((v, k) => Math.abs(v - dt.min[k]) > 0.1)) olchamXato.push(`${m.kod}/${dt.nom} joyi: ${t.map(v => v.toFixed(2))} ≠ ${dt.min}`);
    const fm = new Set(gd.faces.map(f => (matById[f.materialId] || matById[f.material] || {}).name || f.material));
    if (fm.size !== 1 || !fm.has(model.materiallar[dt.mat].nom)) matXato.push(`${m.kod}/${dt.nom}: ${[...fm].join(',')}`);
    if (gi.layer !== QT[dt.qatlam]) qatlamXato.push(`${m.kod}/${dt.nom}: ${gi.layer}`);
  });
}
ok(`skp: har modulda guruhlar = detallar, furnitura komponentlari = model (jami ${model.modullar.reduce((a, m) => a + m.furnitura.length, 0)})`, !soniXato.length, soniXato.join('; '));
ok(`skp: detal o'lchami va joyi (dyuym → mm) ±0,1 mm`, !olchamXato.length, olchamXato.slice(0, 4).join('; '));
ok(`skp: detal yuzalari — o'z materialida (korpus / fasad / orqa devor alohida)`, !matXato.length, matXato.slice(0, 4).join('; '));
ok(`skp: detal qatlami — qismiga ko'ra (Korpus / Fasad / Orqa devor)`, !qatlamXato.length, qatlamXato.slice(0, 4).join('; '));
{
  /* kesim ro'yxati bilan: MC-KP-02 detallari o'lchami (finish) = guruh o'lchami */
  const cl = clOf(1), m = M[1];
  const kesim = cl.parts.map(p => [+p.finish_length || +p.length, +p.finish_width || +p.width, +p.thickness].sort((a, b) => b - a).join('×')).sort();
  const md = defByIdx(S.root.instances.find(i => defByIdx(i.refIdx).name === m.nom).refIdx);
  const fayl = md.instances.filter(i => i.layer !== 'Furnitura').map(gi => { const [a, b] = bbox(defByIdx(gi.refIdx).vertices.map(vxyz)); return [0, 1, 2].map(k => Math.round((b[k] - a[k]) * 25.4 * 10) / 10).sort((x, y) => y - x).join('×'); }).sort();
  ok(`skp: MC-KP-02 — 10 detal o'lchami kesim ro'yxatidagidek (${fayl.slice(0, 3).join(', ')}…)`, JSON.stringify(kesim) === JSON.stringify(fayl), kesim.join(' ') + ' | ' + fayl.join(' '));
}
{
  /* dunyo joyi: OBJ eksportidagi formula (markaz = joy + R·(w/2, d/2) + h/2) — 90° burilgan MC-KP-10 qutilari */
  const scene = buildScene(buf);
  const pm = scene.glbPrimitives;
  const p = doc.placements[1], m = M[2], cl = clOf(2);
  const q = teshik3d(F(p.frg), cl.w, cl.d, cl.h, cl, {}).qutilar;
  const rad = p.rot * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
  const cx = p.x + (p.w / 2) * cs - (p.d / 2) * sn, cy = p.y + (p.w / 2) * sn + (p.d / 2) * cs, cz = p.z + p.h / 2;
  const kut = bbox(q.flatMap(b => [-1, 1].flatMap(sx => [-1, 1].flatMap(sy => [-1, 1].map(sz => {
    const lx = b.c[0] + sx * b.s[0] / 2, ly = b.c[1] + sy * b.s[1] / 2, lz = b.c[2] + sz * b.s[2] / 2;
    return [cx + lx * cs - ly * sn, cy + lx * sn + ly * cs, cz + lz];
  })))));
  const nomlar = new Set(m.detallar.map(d => d.nom));
  const pts = [];
  /* modul ta'rifi nomi bilan — sahnadagi detal primitivlari (meshIndex → guruh ta'rifi), glTF (x, z, −y) metr → mm, Z-yuqori */
  const md = defByIdx(S.root.instances.find(i => defByIdx(i.refIdx).name === m.nom).refIdx);
  const detDef = new Set(md.instances.filter(i => i.layer !== 'Furnitura').map(i => defByIdx(i.refIdx).name));
  for (const pr of pm) if (detDef.has((scene.meshIndex[pr.geomName] || {}).definitionName)) for (let i = 0; i < pr.positions.length; i += 3) pts.push([pr.positions[i] * 1000, -pr.positions[i + 2] * 1000, pr.positions[i + 1] * 1000]);
  const fakt = bbox(pts);
  const farq = Math.max(...[0, 1].flatMap(j => [0, 1, 2].map(k => Math.abs(fakt[j][k] - kut[j][k]))));
  ok(`skp: 90° burilgan modul dunyo joyida (OBJ formulasi bilan farq ${farq.toFixed(2)} mm; ${nomlar.size} xil detal nomi)`, pts.length > 0 && farq <= 0.2,
    JSON.stringify(fakt.map(a => a.map(Math.round))) + ' ≠ ' + JSON.stringify(kut.map(a => a.map(Math.round))));
}
{
  const fNom = [...defs.values()].map(d => d.name);
  ok(`skp: furnitura komponenti nomida ERP nomi va kodi (masalan "${fNom.find(n => /90002019/.test(n))}")`, fNom.some(n => /\(90001982\)/.test(n)) && fNom.some(n => /\(90002019\)/.test(n)));
  const B = Buffer.from(u8), bor = (s) => B.indexOf(Buffer.from(String(s), 'utf16le')) >= 0;
  const dt = M[1].detallar.find(d => d.atr.kromka !== '—');
  ok(`skp: atributlar faylda ("Smart3D" lug'ati: material, olcham, kromka — "${dt.atr.kromka}")`, bor('Smart3D') && bor('kromka') && bor('olcham') && bor('material') && bor(dt.atr.kromka) && bor(dt.atr.olcham));
}
{
  /* faqat tanlangan modul */
  const m1 = eksportModeli(view, H, res.cutlists, { only: 3 }), b1 = skpYoz(m1), S1 = parseSkp(b1.buffer.slice(b1.byteOffset, b1.byteOffset + b1.byteLength));
  ok(`skp: tanlangan modul — faqat ${m1.modullar.map(m => m.kod).join()} (${S1.root.instances.length} komponent)`, m1.modullar.length === 1 && m1.modullar[0].kod === 'MC-KU-07' && S1.root.instances.length === 1);
}

/* ── .dae ── */
const dae = daeYoz(model, { sana: '2026-10-18T00:00:00Z' });
let xml = null;
try { xml = xmlOqi(dae); } catch (e) { xml = null; ok('dae: XML to\'g\'ri', false, e.message); }
if (xml) {
  const root = xml.childNodes.find(n => n.nodeType === 1);
  const asset = root.getElementsByTagName('asset')[0];
  ok(`dae: XML to'g'ri, ildiz ${root.nodeName} ${root.getAttribute('version')}, xmlns COLLADASchema`, root.nodeName === 'COLLADA' && root.getAttribute('version') === '1.4.1' && root.getAttribute('xmlns') === 'http://www.collada.org/2005/11/COLLADASchema');
  ok(`dae: birlik dyuym (meter="${asset.getElementsByTagName('unit')[0].getAttribute('meter')}"), ${asset.getElementsByTagName('up_axis')[0].textContent}`,
    asset.getElementsByTagName('unit')[0].getAttribute('meter') === '0.0254' && asset.getElementsByTagName('up_axis')[0].textContent === 'Z_UP');
  const ids = new Set(root.getElementsByTagName('*').map(e => e.getAttribute('id')).filter(Boolean));
  const urls = [...dae.matchAll(/(?:url|source|target)="#([^"]+)"/g)].map(x => x[1]);
  ok(`dae: barcha havolalar (${urls.length}) mavjud id ga`, urls.every(u => ids.has(u)), urls.filter(u => !ids.has(u)).slice(0, 5).join(','));
  /* three.js ColladaLoader */
  globalThis.DOMParser = class { parseFromString(t) { return xmlOqi(t); } };
  const { ColladaLoader } = await import('../web/node_modules/three/examples/jsm/loaders/ColladaLoader.js');
  const THREE = await import('../web/node_modules/three/build/three.module.js');
  const dbg = console.debug; console.debug = () => {};
  const col = new ColladaLoader().parse(dae, '');
  console.debug = dbg;
  col.scene.updateMatrixWorld(true);
  const meshes = [];
  col.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const kut = model.modullar.reduce((a, m) => a + (m.detallar.length + m.furnitura.length) * m.qty, 0);
  ok(`dae: ColladaLoader — ${meshes.length} mesh = detal + furnitura (${kut})`, meshes.length === kut);
  /* o'lcham: MC-KP-02 yon devori (bok) — 16 × 450 × 692 mm, dunyo x 584…600 yoki 0…16, z 116…808 (oyoq 100) */
  const bx = meshes.map(o => new THREE.Box3().setFromObject(o)).map(b => ({ min: [b.min.x, -b.max.z, b.min.y].map(v => Math.round(v * 10000) / 10), max: [b.max.x, -b.min.z, b.max.y].map(v => Math.round(v * 10000) / 10) }));
  const bok = bx.filter(b => Math.abs(b.max[0] - b.min[0] - 16) < 0.2 && Math.abs(b.max[1] - b.min[1] - 450) < 0.2 && Math.abs(b.max[2] - b.min[2] - 692) < 0.2 && b.min[2] > 115 && b.min[2] < 117 && b.max[0] <= 600.1);
  ok(`dae: o'lcham va joy (mm): MC-KP-02 yon devorlari — ${bok.map(b => b.min[0] + '…' + b.max[0]).join(', ')}`, bok.length === 2 && bok.some(b => Math.abs(b.min[0]) < 0.2) && bok.some(b => Math.abs(b.min[0] - 584) < 0.2));
  const matN = new Set(meshes.map(o => o.material && o.material.name));
  ok(`dae: material nomlari — ${matN.size} = ${model.materiallar.length}`, model.materiallar.every(m => matN.has(m.nom)) && matN.size === model.materiallar.length);
}

/* namuna fayllar (egasi uchun) */
if (process.env.SKP_NAMUNA) {
  mkdirSync(process.env.SKP_NAMUNA, { recursive: true });
  writeFileSync(process.env.SKP_NAMUNA + '/smart3d-namuna.skp', u8);
  writeFileSync(process.env.SKP_NAMUNA + '/smart3d-namuna.dae', dae);
  console.log('  namuna:', process.env.SKP_NAMUNA);
}
console.log(`\n${fail ? '❌' : '✅'} verify_skp: ${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);

/* ── kichik qat'iy XML o'quvchi (DOM o'rnini bosuvchi — ColladaLoader ishlatadiganlari): noto'g'ri XML — xato ── */
function xmlOqi(src) {
  const ent = (s) => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e] || String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1))));
  const el = (name, attrs) => ({
    nodeType: 1, nodeName: name, tagName: name, childNodes: [], _a: attrs,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    get textContent() { return this.childNodes.map(c => c.textContent).join(''); },
    getElementsByTagName(n) { const o = []; const w = (e) => { for (const c of e.childNodes) if (c.nodeType === 1) { if (n === '*' || c.nodeName === n) o.push(c); w(c); } }; w(this); return o; },
    querySelector(q) { const m = /^\[(\w+)="([^"]*)"\]$/.exec(q); if (!m) throw new Error('querySelector: ' + q); return this.getElementsByTagName('*').find(e => e.getAttribute(m[1]) === m[2]) || null; }
  });
  const doc = el('#document', {}); doc.nodeType = 9;
  const st = [doc];
  const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|([^<]+)/gy;
  let m, pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m || m.index !== pos) throw new Error('XML buzilgan: ' + pos + ' — ' + JSON.stringify(src.slice(pos, pos + 40)));
    pos = re.lastIndex;
    const top = st[st.length - 1];
    if (m[1] != null) top.childNodes.push({ nodeType: 3, nodeName: '#text', textContent: m[1], data: m[1] });
    else if (m[2]) { if (top.nodeName !== m[2]) throw new Error(`yopilish teg mos emas: </${m[2]}> (kutilgan </${top.nodeName}>)`); st.pop(); }
    else if (m[3]) {
      const a = {};
      for (const x of m[4].matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) { if (a[x[1]] != null) throw new Error('takror atribut ' + x[1]); a[x[1]] = ent(x[2]); }
      const e = el(m[3], a); e.parentNode = top; top.childNodes.push(e);
      if (!m[5]) st.push(e);
    } else if (m[6] != null) {
      if (/[<&](?!(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(m[6])) throw new Error('xom & yoki <');
      if (st.length === 1 && m[6].trim()) throw new Error('ildizdan tashqarida matn');
      const t = ent(m[6]); top.childNodes.push({ nodeType: 3, nodeName: '#text', textContent: t, data: t });
    }
  }
  if (st.length !== 1) throw new Error('yopilmagan teg: ' + st[st.length - 1].nodeName);
  if (doc.childNodes.filter(n => n.nodeType === 1).length !== 1) throw new Error('ildiz bitta emas');
  return doc;
}
