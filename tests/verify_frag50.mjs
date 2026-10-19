/* verify_frag50.mjs — TZ-37: "full base.zip" Bazis fragmentlaridan 50+ tayyor modul (app/data/fragments-fr.json, MC-FB-…).
 *   [1] import butunligi: soni ≥ 50, kodlar noyob, repoda .fr3d/.b3d yo'q, furnitura ID faqat ERP katalogidan (narx o'ylab topilmaydi)
 *   [2] nomlar: uz / ru / en (rus — kirill, ingliz — kirillsiz), nomlar takrorlanmaydi
 *   [3] o'lcham: min ≤ std ≤ max (sex standartiga mos), formula min/max/std da to'g'ri (xatosiz, musbat), o'lcham o'zgarsa detal o'zgaradi
 *   [4] Bazis bilan solishtirish (saqlangan kutilma raqamlari — frag50-bazis.json, .fr3d fayllarsiz): har komponent o'z native o'lchamida:
 *       detal soni teng, har detal o'lchami ±0,6 mm, maydon ±1 %, furnitura soni teng, narx (plita + furnitura) ±5 %
 *   [5] 3D: joy panellari gabaritda, zapchast/teshik belgilari (D6), kesim ro'yxati bilan teng
 *   [6] eksport: 3 yangi modul — eksportModeli → SketchUp (.skp o'qiladi), .dae, Bazis .b3d (daraxtda panellar teng)
 * Ishga tushirish: node tests/verify_frag50.mjs */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { yukla, solishtir } = await import('../scripts/frag50_solishtir.mjs');
const { cutlist } = await import('../app/js/engine/cutlist.js');
const { joyPanellar } = await import('../app/js/engine/joy.js');
const { applySexStandart } = await import('../app/js/engine/standart.js');
const { teshik3d } = await import('../app/js/engine/teshik3d.js');
const { getModulePanels } = await import('../app/js/engine/assembler.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const D = yukla();
const std = JSON.parse(readFileSync(join(ROOT, 'app/data/sex-standartlari.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(ROOT, 'app/data/nomlar.ru.json'), 'utf8')).modullar;
const en = JSON.parse(readFileSync(join(ROOT, 'app/data/nomlar.en.json'), 'utf8')).modullar;
const F = D.frags;
for (const f of F) applySexStandart(f, std);
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };

/* ══ [1] import butunligi ══ */
console.log('\n[1] Import');
ok(`${F.length} ta tayyor modul (talab: kamida 50)`, F.length >= 50, String(F.length));
ok('kodlar noyob va MC-FB-NN (katalogda MC-… prefiksi: ichki ko\'rinish, sex qoidalari shu orqali)', new Set(F.map(f => f.code)).size === F.length && F.every(f => /^MC-FB-\d{2}$/.test(f.code)));
{
  const mc = JSON.parse(readFileSync(join(ROOT, 'app/data/fragments-mc.json'), 'utf8')).fragments.map(f => f.code);
  const sp = JSON.parse(readFileSync(join(ROOT, 'app/data/fragments.json'), 'utf8')).map(f => f.code);
  ok('boshqa katalog kodlari bilan to\'qnashmaydi (SP-…, MC-…)', F.every(f => !mc.includes(f.code) && !sp.includes(f.code)));
}
{
  const bor = [];
  const yur = (d) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === '.git') continue; const p = join(d, n); let st; try { st = statSync(p); } catch (_) { continue; } if (st.isDirectory()) yur(p); else if (/\.(fr3d|b3d)$/i.test(n)) bor.push(p); } };
  for (const d of ['app', 'scripts', 'tests', 'web/src', 'server']) yur(join(ROOT, d));
  ok('repoda .fr3d / .b3d fayl yo\'q (ommaviy repo: faqat olingan ma\'lumot)', bor.length === 0, bor.slice(0, 3).join(', '));
}
ok('detal kodlari modul ichida noyob; har detal src (k = korpus, i = ichki to\'plam) belgilangan', F.every(f => new Set(f.parts.map(p => p.code)).size === f.parts.length && f.parts.every(p => p.src === 'k' || p.src === 'i')));
ok('turli-tumanlik: oshxona pastki, ustki, gola, sokolli, tortmali (salazka/tandem), polkali, stoyka, abmanka, vityachka',
  [/pastki(?! gola)/i, /gola/i, /sokol/i, /salazka/i, /tandem/i, /polka/i, /stoyka/i, /abmanka/i, /vityachka/i, /Ochiq shkaf/].every(re => F.some(f => re.test(f.name))));
ok('avtomatik furnitura o\'chiq (Bazis BOM to\'liq), stoleshnitsa bo\'lagi yo\'q', F.every(f => f.auto_hardware === false && !f.parts.some(p => /stol|столешн/i.test(p.nom + p.code))));
ok('Bazis qo\'g\'irchoq eshigi (50 mm «eshik») modulda yo\'q', F.every(f => !f.parts.some(p => p.code === 'eshik')));
{
  const bad = [];
  for (const f of F) for (const h of f.hardware) if (h.id && !D.furnById[h.id]) bad.push(f.code + ':' + h.id);
  ok('furnitura narxi o\'ylab topilmagan: ID faqat ERP katalogidan (furnitura-catalog.json)', bad.length === 0, bad.slice(0, 3).join(','));
}

/* ══ [2] nomlar ══ */
console.log('\n[2] Nomlar (uz / ru / en)');
{
  const kir = /[А-Яа-яЁё]/;
  ok('har modulda uz nomi (MC · …)', F.every(f => /^MC · \S/.test(f.name)));
  ok('har modulda rus nomi (kirill) — nomlar.ru.json', F.every(f => ru[f.code] && kir.test(ru[f.code])), F.filter(f => !ru[f.code] || !kir.test(ru[f.code])).map(f => f.code).join(','));
  ok('har modulda ingliz nomi (kirillsiz) — nomlar.en.json', F.every(f => en[f.code] && !kir.test(en[f.code])), F.filter(f => !en[f.code] || kir.test(en[f.code])).map(f => f.code).join(','));
  ok('nomlar takrorlanmaydi (uz, ru, en alohida)', [F.map(f => f.name), F.map(f => ru[f.code]), F.map(f => en[f.code])].every(a => new Set(a).size === a.length));
}

/* ══ [3] o'lcham: min ≤ std ≤ max, formula ══ */
console.log('\n[3] O\'lcham (min / std / max)');
{
  const xato = [], fz = [], ozg = [];
  for (const f of F) {
    for (const k of ['w', 'd', 'h']) {
      const lo = f['min_' + k], hi = f['max_' + k];
      if (!(lo <= f[k] && f[k] <= hi)) xato.push(`${f.code}.${k}: ${lo} ≤ ${f[k]} ≤ ${hi}`);
      if (f.standart && (std.modullar[f.standart][k].std || []).length && !std.modullar[f.standart][k].std.includes(f[k]) && !(f[k] >= lo && f[k] <= hi)) xato.push(`${f.code}.${k}: std ro'yxatida emas`);
    }
    const sizes = [[f.w, f.d, f.h], [f.min_w, f.min_d, f.min_h], [f.max_w, f.max_d, f.max_h]];
    const boy = [];
    for (const [w, d, h] of sizes) {
      const cl = cutlist(f, w, d, h, D.mats, { projectSlots: SLOTS });
      if (cl.errors.length) fz.push(`${f.code} ${w}x${d}x${h}: ${cl.errors[0].message}`);
      if (cl.parts.some(p => !(p.finish_length > 0 && p.finish_width > 0))) fz.push(`${f.code} ${w}x${d}x${h}: nolinchi detal`);
      boy.push(cl.parts.reduce((s, p) => s + p.finish_length * p.finish_width, 0));
    }
    if (f.max_w > f.min_w && !(boy[2] > boy[1])) ozg.push(f.code);
  }
  ok('min ≤ std ≤ max (w, d, h) — sex-standartlari.json bilan mos', xato.length === 0, xato.slice(0, 4).join(' | '));
  ok(`formulalar std / min / max o'lchamda xatosiz, hamma detal musbat (${F.length} modul × 3)`, fz.length === 0, fz.slice(0, 3).join(' | '));
  ok('o\'lcham kattalashsa detallar maydoni ham oshadi (formula ishlaydi)', ozg.length === 0, ozg.join(','));
  const a = F.find(f => /3 tortma salazka/.test(f.name) && f.max_w > f.min_w);
  const wide = (w) => { const cl = cutlist(a, w, a.d, a.h, D.mats, { projectSlots: SLOTS }); return cl.parts.filter(p => p.code === 'fasad_yashika').map(p => Math.max(p.finish_length, p.finish_width)); };
  const x1 = wide(a.min_w), x2 = wide(a.max_w);
  ok(`${a.code}: tortma fasadi eni modul eniga ergashadi (w ${a.min_w} → ${a.max_w}: ${x1[0]} → ${x2[0]} mm)`, x1.length === 3 && x2[0] - x1[0] === a.max_w - a.min_w);
}

/* ══ [4] Bazis bilan solishtirish ══ */
console.log('\n[4] Bazis kutilma raqamlari bilan solishtirish (detal, maydon, furnitura, narx)');
const rows = solishtir(D);
{
  const komp = rows.flatMap(r => r.komponent.map(c => ({ ...c, code: r.code })));
  const chiq = (cond, fmt) => komp.filter(c => !cond(c)).map(fmt);
  ok(`${komp.length} komponent (korpus / ichki to'plam): kesim xatosiz`, komp.every(c => c.errors === 0));
  const d1 = chiq(c => c.detal[0] === c.detal[1], c => `${c.code}/${c.src}: ${c.detal}`);
  ok('detal soni Bazis fayli bilan bir xil', d1.length === 0, d1.slice(0, 4).join(' | '));
  const m1 = chiq(c => Math.abs(c.maydon[0] - c.maydon[1]) <= 0.01 * c.maydon[1], c => `${c.code}/${c.src}: ${c.maydon}`);
  ok('tayyor detallar maydoni Bazis bilan ±1 %', m1.length === 0, m1.slice(0, 4).join(' | '));
  const f1 = chiq(c => c.furn[0] === c.furn[1], c => `${c.code}/${c.src}: ${c.furn}`);
  ok('furnitura soni Bazis BOM bilan teng', f1.length === 0, f1.slice(0, 4).join(' | '));
  const n1 = chiq(c => Math.abs(c.narx[0] - c.narx[1]) <= 0.05 * c.narx[1], c => `${c.code}/${c.src}: ${c.narx}`);
  ok('narx (plita + ERP furnitura) Bazis ro\'yxati bilan ±5 %', n1.length === 0, n1.slice(0, 4).join(' | '));
  const modulN = rows.filter(r => { const s = (k, i) => r.komponent.reduce((x, c) => x + c[k][i], 0); return Math.abs(s('narx', 0) - s('narx', 1)) <= 0.05 * s('narx', 1); });
  ok(`modul narxi (komponentlar yig'indisi) ±5 %: ${modulN.length}/${rows.length}`, modulN.length === rows.length);
}
{ /* har detal o'lchami ±0,6 mm (kesim ro'yxati vs Bazis panellari) */
  const bad = [];
  for (const f of F) for (const c of D.ref[f.code]) {
    const sub = { ...f, parts: f.parts.filter(p => p.src === c.src), hardware: [], birikmalar: [], auto_hardware: false };
    const cl = cutlist(sub, ...[c.native[0], c.native[1], c.native[2]], D.mats, { projectSlots: SLOTS });
    const got = cl.parts.map(p => [p.finish_length, p.finish_width].sort((a, b) => a - b));
    const pool = c.detallar.map(q => [q.len, q.wid].sort((a, b) => a - b));
    for (const g of got) {
      const i = pool.findIndex(q => Math.abs(q[0] - g[0]) <= 0.6 && Math.abs(q[1] - g[1]) <= 0.6);
      if (i < 0) bad.push(`${f.code}/${c.src}: ${g}`); else pool.splice(i, 1);
    }
  }
  ok('har detal o\'lchami Bazis panelidan ≤ 0,6 mm farq (standart o\'lchamda AYNAN)', bad.length === 0, bad.slice(0, 4).join(' | '));
}

/* ══ [5] 3D: joy panellari, zapchast/teshik belgilari ══ */
console.log('\n[5] 3D joylashuv va zapchast belgilari (D6)');
{
  const bad = [], sanoq = [], zp = [];
  for (const f of F) {
    for (const [w, d, h] of [[f.w, f.d, f.h], [f.min_w, f.min_d, f.min_h], [f.max_w, f.max_d, f.max_h]]) {
      const cl = cutlist(f, w, d, h, D.mats, { projectSlots: SLOTS });
      const pn = joyPanellar(f, w, d, h, { t: 16, qalinlik: (p) => (p.slot === 'orqa' ? 3 : 16) });
      if (pn.length !== f.parts.reduce((s, p) => s + p.qty, 0)) sanoq.push(`${f.code}: panel ${pn.length}`);
      for (const p of pn) {
        const lo = [p.x - p.w / 2, p.y - p.d / 2, p.z - p.h / 2], hi = [p.x + p.w / 2, p.y + p.d / 2, p.z + p.h / 2];
        // gabarit: x ∈ [−w/2, w/2], old tekisligi (+y) ≤ d/2 + 17 (fasad old yuzasi), orqa ≥ −d/2 − 3, balandlik [−h/2 − 90 (old planka sokol zonasida, MC-KP-… dagidek), h/2 + 1]
        if (lo[0] < -w / 2 - 1 || hi[0] > w / 2 + 1 || lo[1] < -d / 2 - 3.1 || hi[1] > d / 2 + 17 || lo[2] < -h / 2 - 91 || hi[2] > h / 2 + 1)
          bad.push(`${f.code} ${w}x${d}x${h} ${p.code}`);
      }
    }
  }
  ok('joy: har nusxa uchun panel (qty yig\'indisi) — std / min / max', sanoq.length === 0, sanoq.slice(0, 3).join(' | '));
  ok('hamma panel modul gabaritida (eshik/fasad old yuzasi 17 mm gacha, orqa devor −3 mm)', bad.length === 0, bad.slice(0, 4).join(' | '));
  for (const f of F) {
    const cl = cutlist(f, f.w, f.d, f.h, D.mats, { projectSlots: SLOTS });
    let z; try { z = teshik3d(f, f.w, f.d, f.h, cl, {}).zapchast; } catch (e) { zp.push(f.code + ': ' + e.message); continue; }
    const hwN = f.hardware.filter(h => !/евро|evro|samorez|саморез|винт|nojka|ножк/i.test(h.name)).reduce((s, h) => s + h.qty, 0);   // mahkamlagich (vint) va MC oyoqchasi — 3D belgisi yo'q (verify_skp: oyoq joyi o'ylab topilmaydi)
    if (hwN > 0 && !(z && z.length > 0)) zp.push(f.code + ': zapchast belgisi yo\'q');
  }
  ok('teshik3d: vintdan boshqa furnitura (polkaderjatel, ruchka, yo\'naltiruvchi, oyoq) bor har modulda zapchast belgilari chiziladi (D6), xatosiz', zp.length === 0, zp.slice(0, 3).join(' | '));
  /* sahna (assembler): tortmali modulda tortma fasadlari soni = tortma soni; ochiq (eshiksiz) modulda eshik yo'q */
  const asmBad = [];
  for (const f of F) {
    const n = (f.parts.find(p => p.code === 'fasad_yashika') || {}).qty || 0;
    const a = getModulePanels(f, f.w, f.d, f.h, { tortma: true, eshiklar: true });
    const tf = a.panels.filter(p => p.name === 'Tortma fasadi').length, ek = a.panels.filter(p => p.name === 'Fasad eshik').length;
    if (n && tf !== n) asmBad.push(`${f.code}: tortma fasadi ${tf}/${n}`);
    if (!f.parts.some(p => p.slot === 'fasad') && ek) asmBad.push(`${f.code}: eshiksiz modulda eshik chizilgan`);
  }
  ok('sahna (assembler): tortma fasadlari soni modul tortmalariga teng, eshiksiz modulda eshik chizilmaydi', asmBad.length === 0, asmBad.slice(0, 4).join(' | '));
  const pk = F.find(f => /3 tortma salazka/.test(f.name));
  const cl = cutlist(pk, pk.w, pk.d, pk.h, D.mats, { projectSlots: SLOTS });
  const t3 = teshik3d(pk, pk.w, pk.d, pk.h, cl, {});
  ok(`${pk.code}: 3D teshiklar (${(t3.teshiklar || t3.holes || []).length}) va zapchast (${t3.zapchast.length}) chiziladi`, t3.zapchast.length > 0);
}

/* ══ [6] eksport: SketchUp / Bazis .b3d / .dae — 3 ta yangi modul ══ */
console.log('\n[6] Eksport (eksportModeli → .skp, .dae, .b3d) — 3 yangi modul');
{
  const { eksportModeli } = await import('../web/src/features/editor/eksport/model.js');
  const { skpYoz } = await import('../web/src/features/editor/eksport/skp.js');
  const { daeYoz } = await import('../web/src/features/editor/eksport/dae.js');
  const { modeldanLoyiha } = await import('../app/js/engine/bazis/modelLoyiha.js');
  const { b3dYoz } = await import('../app/js/engine/bazis/b3dYoz.js');
  const { daraxt } = await import('../app/js/engine/bazis/daraxt.js');
  const { PANEL_CODE } = await import('../app/js/engine/bazis/b3d.js');
  const { parseSkp } = await import('../web/node_modules/openskp/dist/index.mjs');
  const DATA = join(ROOT, 'app', 'data');
  const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(DATA, n), 'utf8')))));
  const kodlar = [F.find(f => /3 tortma salazka/.test(f.name) && !/gola/.test(f.name)).code, F.find(f => /gola.*\+ 2 polka/.test(f.name)).code, F.find(f => /stoyka/.test(f.name)).code];
  let x = 0;
  const doc = { room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700 },
    placements: kodlar.map((c, i) => { const f = H.catalog[c]; const p = { id: i + 1, frg: c, x, y: 0, z: f.default_z || 0, w: f.w, d: f.d, h: f.h, rot: 0 }; x += f.w + 100; return p; }) };
  const res = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16' });
  const view = Object.assign({}, doc, { placements: H.viewPlacements(doc) });
  const model = eksportModeli(view, H, res.cutlists);
  ok(`model: ${kodlar.join(', ')} — ${model.modullar.length} modul`, model.modullar.length === 3);
  for (const m of model.modullar) {
    const cl = res.cutlists.find(c => String(c.placementId) === String(m.id));
    const n = cl.parts.reduce((a, p) => a + (+p.qty || 1), 0);
    ok(`model: ${m.kod} — detal ${m.detallar.length} = kesim ro'yxati ${n} (manba: ${m.manba}), furnitura ${m.furnitura.length}`, m.detallar.length === n && m.manba === 'kesim' && m.furnitura.length > 0);
  }
  const u8 = skpYoz(model);
  const S = parseSkp(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  ok(`.skp: ${Math.round(u8.length / 1024)} KB, o'qiladi (openskp), ildizda ${S.root.instances.length} komponent = modullar`, S.root.instances.length === 3);
  const detaldan = S.root.instances.map(i => S.definitions.get(i.refIdx).instances.filter(g => g.layer !== 'Furnitura').length);
  ok(`.skp: har modulda guruhlar = detallar (${detaldan.join(', ')})`, detaldan.every((n, i) => n === model.modullar.find(m => m.nom === S.definitions.get(S.root.instances[i].refIdx).name).detallar.length));
  const dae = daeYoz(model);
  const daeS = typeof dae === 'string' ? dae : Buffer.from(dae).toString('utf8');
  ok('.dae: COLLADA 1.4.1, birlik mm/m, har modul geometriyasi', /<COLLADA[^>]*version="1\.4\.1"/.test(daeS) && (daeS.match(/<node /g) || []).length >= 3);
  const L = modeldanLoyiha(model, { catalog: H.catalog, materials: H.materials, cutlists: res.cutlists, nom: 'FB sinov' });
  const bytes = b3dYoz(L, { deflate: (b) => new Uint8Array(zlib.deflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) });
  const d = daraxt(bytes, { inflate: (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength))) });
  const panels = d.objects.filter(o => o.modelCode === PANEL_CODE).length;
  const kutil = L.modullar.reduce((a, m) => a + m.panellar.length, 0);
  ok(`.b3d: ${Math.round(bytes.length / 1024)} KB, daraxtda ${d.objects.filter(o => o.modelCode === 1005).length} modul guruhi, ${panels} panel = yozilgan ${kutil}`, panels === kutil && kutil >= model.modullar.reduce((a, m) => a + m.detallar.length, 0) - 3);
}

console.log(`\n${fail ? '❌ ' + fail + ' xato' : '=== HAMMASI OK'} (${pass} pass, ${fail} fail) ${fail ? '' : '==='}`);
process.exit(fail ? 1 : 0);
