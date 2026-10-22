/* narx_b3d.mjs — TZ-48: Bazis .b3d fayli → ilovadagi YO'L bilan narx (komponentlar bo'yicha jadval; faqat o'qish, fayl serverga ketmaydi).
 *   daraxt → generateSpecification → bazisLoyiha → ERP plitasiga avtomoslash (faqat bir qiymatli, bazisMoslash) → createHisob().recalc — saytdagi bilan bir xil.
 * Komponentlar: plita (list soni × narx), kromka, raspil (+1 qo'shimcha raspil), prisadka, Bazis xizmati, furnitura, ish haqi, qo'shilgan xizmatlar, ustama; jami va «Furniturasiz» jami.
 * Ishlatish:
 *   node scripts/narx_b3d.mjs [--repo=<repo ildizi>] [--sku="7045 BS"] [--xizmat=teshik,bazis] [--json] fayl.b3d …
 *     --repo   boshqa nusxadagi (masalan eski main) kod bilan hisoblash — OLDIN/KEYIN solishtirish uchun (sukut: shu repo)
 *     --sku    avtomoslash noaniq (2 nomzod) qoldirgan plita guruhi uchun shu SKU li ERP plitasini tanlaydi (usta "Almashtirish" oynasida tanlagandek)
 *     --xizmat eski kodda (prisadka/Bazis sukutda o'chiq edi) shu xizmatlarni qo'lda yoqish: teshik, bazis
 * Maxfiy fayllar (mijoz loyihalari) repoga KIRMAYDI — yo'l argument sifatida beriladi. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const ARGS = process.argv.slice(2);
const opt = (n) => (ARGS.find(a => a.startsWith('--' + n + '=')) || '').slice(n.length + 3);
const FILES = ARGS.filter(a => !a.startsWith('--'));
const ROOT = resolve(opt('repo') || fileURLToPath(new URL('..', import.meta.url)));
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const require = createRequire(import.meta.url);
globalThis.SpPrice = globalThis.SpPrice || require(join(ROOT, 'app/js/engine/price.js'));
const { loadData, createHisob } = await imp('web/src/services/hisob.js');
const E = await imp('web/src/services/erpMaterial.js');
const { daraxt } = await imp('app/js/engine/bazis/daraxt.js');
const B = await imp('app/js/engine/bazis/b3d.js');
const { bazisLoyiha, materiallarniQosh } = await imp('app/js/engine/bazis/loyiha.js');
const { bazisMoslashHammasi } = await imp('app/js/engine/plitaMoslash.js');
const { narxSukut } = await imp('app/js/engine/narxStavka.js');

const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const DATA = join(ROOT, 'app/data/');
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
const sum = (a) => a.reduce((s, x) => s + x, 0);
const soM = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const sku = opt('sku'), xizmat = opt('xizmat').split(',').filter(Boolean);
const furnLinks = (J(DATA + 'furnitura-boglash.json').links) || {};
if (!FILES.length) { console.error('Ishlatish: node scripts/narx_b3d.mjs [--repo=…] [--sku="7045 BS"] [--xizmat=teshik,bazis] [--json] fayl.b3d …'); process.exit(2); }

async function hisobla(fayl) {
  const bytes = new Uint8Array(readFileSync(fayl));
  const r = daraxt(bytes, { inflate });
  const sp = B.generateSpecification(r.objects);
  const rs = bazisLoyiha(r.objects, { fayl: fayl.split('/').pop(), format: r.format, fittings: sp.fittings, fasteners: sp.fasteners, furnituraBoglash: furnLinks });
  if (rs.xato) throw new Error('Bazis: ' + rs.xato);
  const H = createHisob(await loadData((n) => Promise.resolve(J(DATA + n))));
  H.applyNarxlar(narxSukut(H.materials));
  const f = rs.fragment;
  const room = { outline: [[0, 0], [5000, 0], [5000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] };
  const doc = { v: 1, room, placements: [{ id: 'bz1', frg: f.code, name: f.name, x: 500, y: 0, z: 0, w: f.w, d: f.d, h: f.h, rot: 0, qty: 1 }],
    bazis: { fragment: f, materiallar: JSON.parse(JSON.stringify(rs.materiallar)), hisobot: rs.hisobot, almash: {} } };
  if (xizmat.length) doc.xizmatlar = Object.assign({}, xizmat.includes('teshik') ? { teshik: true } : {}, xizmat.includes('bazis') ? { bazis: 'onlayn' } : {});
  const m = E.bazisMoslash(doc, H);                                       // saytdagi kabi: faqat bir qiymatli moslik avtomatik
  if (sku) for (const [kod, x] of Object.entries(bazisMoslashHammasi(doc.bazis.materiallar.panel, H.sheetCatalog.sheets, doc.bazis.almash))) {
    if (x.holat === 'nomzod') { const sh = (x.nomzodlar || []).find(s => s.sku === sku); if (sh) doc.bazis.almash = Object.assign({}, doc.bazis.almash, { [kod]: E.erpQosh(H, doc, sh) }); }
  }
  E.erpUla(H, doc);
  materiallarniQosh(H.materials, doc.bazis.materiallar);
  H.catalog[f.code] = E.bazisAlmash(f, doc.bazis.almash, H.materials.panel_materials);
  const res = H.recalc(doc, { materialCode: 'LDSP16', polkaCode: 'LDSP16', fasadCode: 'MDF16', nestCfg: Object.assign({}, H.nestDefaults) });
  const P = res.prod, L = P.lines;
  const grp = (f) => L.filter(f);
  const bolim = (nom, ls) => ({ nom, qty: ls.map(l => `${Math.round(l.qty * 100) / 100} ${l.unit || ''}`).join(' + '), summa: sum(ls.map(l => l.amount || 0)),
    qatorlar: ls.map(l => ({ nom: l.name, qty: l.qty, narx: l.unit_price, summa: l.amount, manba: l.manba, qoida: l.narx_qoida || '' })) });
  const hw = grp(l => l.group === 'Furnitura');
  const komp = [bolim('plita (list)', grp(l => /^Plita/.test(l.group) || l.group === 'Stoleshnitsa')), bolim('kromka', grp(l => l.group === 'Kromka')),
    bolim('raspil', grp(l => l.group === 'Raspil')), bolim('prisadka', grp(l => /^hole:/.test(l.code) && !l.info)), bolim('Bazis xizmati', grp(l => l.code === 'bazis')),
    bolim('furnitura', hw), bolim('ish haqi', grp(l => l.group === 'Ish haqi')), bolim("qo'shilgan xizmatlar", grp(l => l.qosh))];
  const ustama = P.clientTotal - P.totalCost;
  const furnsiz = P.clientFurnsiz != null ? P.clientFurnsiz : P.clientTotal - Math.round(P.hwCost * (1 + P.markupPct));
  return { fayl: fayl.split('/').pop(), detal: rs.hisobot.panellar, moslash: m, ustamaPct: P.markupPct, komp, ustama, jami: P.clientTotal, furnsiz, tannarx: P.totalCost, narxsiz: P.missing.length,
    aniqlik: P.aniqlik.pct, plitaGuruhlari: Object.entries(res.nest.by_material).map(([k, v]) => ({ kod: k, nom: (H.materials.panel_materials.find(x => x.code === k) || {}).name, list: v.sheet_count })) };
}

const natija = [];
for (const f of FILES) natija.push(await hisobla(f));
if (ARGS.includes('--json')) console.log(JSON.stringify(natija, null, 1));
else for (const n of natija) {
  console.log(`\n### ${n.fayl} — ${n.detal} panel; ERP avtomoslash: ${JSON.stringify(n.moslash)}; ustama ${Math.round(n.ustamaPct * 1000) / 10}%; aniqlik ${n.aniqlik}%; narxsiz qator ${n.narxsiz}`);
  console.log('| komponent | miqdor | summa (so\'m) |\n| --- | --- | ---: |');
  for (const k of n.komp) if (k.summa || k.qatorlar.length) console.log(`| ${k.nom} | ${k.qty} | ${soM(k.summa)} |`);
  console.log(`| ustama | ${Math.round(n.ustamaPct * 1000) / 10}% | ${soM(n.ustama)} |`);
  console.log(`| **JAMI (mijozga narx)** | | **${soM(n.jami)}** |\n| Furniturasiz jami | | ${soM(n.furnsiz)} |\n| tannarx (ustamasiz) | | ${soM(n.tannarx)} |`);
  console.log('plita guruhlari: ' + n.plitaGuruhlari.map(g => `${g.nom || g.kod} × ${g.list}`).join('; '));
}
