/* verify_furn_boglash.mjs — TZ-42 p.3: furnitura bog'lash jadvali (app/data/furnitura-boglash.json) butunligi va
 * egasining real loyihasidagi (BIG ONE) narxsiz Bazis furnitura nomlari.
 *   [1] jadval: har bir bog'langan kod katalogda bor, narxi > 0, ID 8 xonali, takrorlanish yo'q (xom matnda ham), kod formati
 *   [2] koef (fayl/izohdagi) 0 < x <= 1000; savol bo'limida bog'langan kod qolmagan (o'lik yozuv yo'q)
 *   [3] TZ-42 yozuvlari: bog'langan kod links da, ID/nom katalogga mos, asos yozilgan
 *   [4] real loyiha nomlari → kod (Bazis slug qoidasi) → har biri YO bog'langan YO savol bo'limida (jimgina yo'qolmaydi)
 *   [5] hisob dvigateli: bog'langan furnitura katalog narxi bilan hisoblanadi, bog'lanmaganlari narxsiz (`missing`); oldin/keyin soni
 * Ishga tushirish: node tests/verify_furn_boglash.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { productionCost } from '../app/js/engine/cutlist.js';
import { narxSukut } from '../app/js/engine/narxStavka.js';
import { slug } from '../app/js/engine/bazis/loyiha.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const yol = (p) => fileURLToPath(new URL('../app/data/' + p, import.meta.url));
const J = (p) => JSON.parse(readFileSync(yol(p), 'utf8'));
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

const xom = readFileSync(yol('furnitura-boglash.json'), 'utf8');
const fayl = JSON.parse(xom), links = fayl.links || {}, meta = fayl._meta || {};
const katalog = new Map(J('furnitura-catalog.json').items.map(x => [String(x.id), x]));
const KOD_RE = /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,79}$/;       // server/routes/admin-panel.js bilan bir xil

console.log('\n[1] Jadval butunligi (' + Object.keys(links).length + ' ta kod)');
const bogEntries = Object.entries(links);
ok('links bo\'sh emas', bogEntries.length > 0);
ok('kod formati to\'g\'ri (admin panel KOD_RE)', bogEntries.every(([k]) => KOD_RE.test(k)), bogEntries.filter(([k]) => !KOD_RE.test(k)).map(([k]) => k).join());
ok('ID — 8 xonali raqam matni', bogEntries.every(([, v]) => typeof v === 'string' && /^\d{8}$/.test(v)), bogEntries.filter(([, v]) => !(typeof v === 'string' && /^\d{8}$/.test(v))).map(([k]) => k).join());
const yoqId = bogEntries.filter(([, v]) => !katalog.has(String(v))).map(([k, v]) => k + '→' + v);
ok('har bir ID katalogda bor', yoqId.length === 0, yoqId.join());
const narxsizId = bogEntries.filter(([, v]) => { const f = katalog.get(String(v)); return !f || !(f.uzs > 0) || f.no_price || f.price_src === 'yoq'; }).map(([k, v]) => k + '→' + v);
ok('har bir bog\'langan mahsulotning narxi > 0 (no_price emas)', narxsizId.length === 0, narxsizId.join());
/* JSON.parse takroriy kalitni jimgina birlashtiradi — xom matndan sanaymiz */
const linksXom = xom.slice(xom.indexOf('"links"'));
const kalitlar = [...linksXom.matchAll(/^\s*"([^"]+)":\s*"\d{8}"/gm)].map(m => m[1]);
const takror = kalitlar.filter((k, i) => kalitlar.indexOf(k) !== i);
ok('links da takroriy kod yo\'q (xom matnda)', kalitlar.length === bogEntries.length && takror.length === 0, takror.join() || (kalitlar.length + ' ≠ ' + bogEntries.length));
const kichik = bogEntries.map(([k]) => k.toLowerCase());
ok('kodlar registrdan tashqari takrorlanmaydi (BZ-X / bz-x)', new Set(kichik).size === kichik.length);

console.log('\n[2] Koeffitsient va savol bo\'limi');
const koefYoz = [];
if (fayl.koef && typeof fayl.koef === 'object') for (const [k, v] of Object.entries(fayl.koef)) koefYoz.push([k, v]);
const tz = meta['tz42_2026-10-22'] || {}, boglandi = tz.boglandi || {};
for (const [k, v] of Object.entries(boglandi)) koefYoz.push([k, v.koef == null ? 1 : v.koef]);
const koefYomon = koefYoz.filter(([, v]) => !(typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1000));
ok('koef (' + koefYoz.length + ' ta) har biri 0 < x <= 1000 son', koefYomon.length === 0, koefYomon.map(([k, v]) => k + '=' + v).join());
const savol = meta.savol || {};
const oluk = Object.keys(savol).filter(k => links[k]);
ok('savol bo\'limida bog\'langan (o\'lik) kod yo\'q', oluk.length === 0, oluk.join());
ok('savol yozuvlari matn va bo\'sh emas', Object.values(savol).every(v => typeof v === 'string' && v.trim().length > 3));

console.log('\n[3] TZ-42 yozuvlari');
ok('boglandi bo\'sh emas', Object.keys(boglandi).length > 0);
for (const [k, v] of Object.entries(boglandi)) {
  const f = katalog.get(String(v.erp_id));
  ok(k + ': links da, ID mos', links[k] === v.erp_id, 'links=' + links[k] + ' yozuv=' + v.erp_id);
  ok(k + ': nom katalogga mos, narx > 0, asos yozilgan', !!f && f.name === v.nom && f.uzs > 0 && typeof v.asos === 'string' && v.asos.length > 20, f ? f.name + ' / ' + v.nom : 'katalogda yo\'q');
}

console.log('\n[4] Real loyiha (BIG ONE) narxsiz Bazis furnitura nomlari → kod → natija');
/* egasi ko'rsatgan nomlar (TZ-42 p.3); Bazis kodi — 'BZ-' + slug(nom).slice(0,40) (bazisLoyiha bilan bir xil) */
const NOMLAR = ['Петля прямая кухня симм', 'Петля полугорбатая кухня симм', 'Петля полугорб кухня симм', 'Ножка регулируемая 100..125 мм',
  'Направляющие Салазка', 'Направляющие Тандем', 'Направляющие шар. полн.выдв. L300 1045-12 Z оцинков.', 'Сушилка 800мм', 'Сушилка',
  'Сушка SU02 листовая нержавеющая сталь 1 поддон (700 мм) SU02/700', 'SU02 Держатель', 'SU02 Решетка для кружек 700', 'SU02 Решетка для тарелок 700',
  'Держатели', 'Вытяжка 2 дв', 'Евровинт 7x51 (32) Мин60 симм', 'Евровинт 7x50', 'Эксцентрик пластик 0.0', 'samorez 16 mm', 'Евро 51мм Алкан',
  'POLKADERJATEL', 'pr-1', 'pr-9', 'Фрагмент3'];
const kodOf = (nom) => 'BZ-' + slug(nom).slice(0, 40);
const KODLAR = NOMLAR.map(kodOf);
ok('kod qoidasi: nomlar bir-biridan farqli kodlar beradi', new Set(KODLAR).size === NOMLAR.length);
ok('kodlar KOD_RE ga mos (admin panelda bog\'lash mumkin)', KODLAR.every(k => KOD_RE.test(k)));
const jimgina = NOMLAR.filter((nom, i) => !links[KODLAR[i]] && !savol[KODLAR[i]]);
ok('har bir nom YO bog\'langan YO savol bo\'limida (jimgina yo\'qolmaydi)', jimgina.length === 0, jimgina.join(' | '));
const ikkisida = KODLAR.filter(k => links[k] && savol[k]);
ok('hech bir kod ham bog\'langan ham savolda emas', ikkisida.length === 0, ikkisida.join());
ok('shu 24 nomdan bog\'langanlari — TZ-42 yozuvida (boglandi)', KODLAR.filter(k => links[k]).every(k => boglandi[k]));
for (const k of ['BZ-petlya_pryamaya_kuxnya_simm', 'BZ-nojka_reguliruemaya_100_125_mm', 'BZ-polkaderjatel']) ok('bog\'langan: ' + k, !!links[k]);
/* o'ylab topilmaydigan (birlik/tur noaniq) qatorlar bog'lanmagan bo'lib qolishi shart — ular egasi javobisiz bog'lanmasin */
const BOGLANMASIN = ['BZ-samorez_16_mm', 'BZ-evro_51mm_alkan', 'BZ-evrovint_7x50', 'BZ-evrovint_7x51_32_min60_simm', 'BZ-napravlyayushie_salazka', 'BZ-napravlyayushie_tandem',
  'BZ-napravlyayushie_shar_poln_vidv_l300_1045', 'BZ-sushilka_800mm', 'BZ-sushilka', 'BZ-sushka_su02_listovaya_nerjaveyushaya_sta', 'BZ-su02_derjatel',
  'BZ-su02_reshetka_dlya_krujek_700', 'BZ-su02_reshetka_dlya_tarelok_700', 'BZ-derjateli', 'BZ-vityajka_2_dv', 'BZ-pr_1', 'BZ-pr_9', 'BZ-fragment3'];
/* TZ-57 (2026-10-23): egasi "qolganlarini ham bog'la" dedi — 3 yarim-gorbat petlya (→ 90002524) va plastik ekstsentrik (→ 90002094) bog'landi;
   pr_N va fragmentN — Bazis'ning mahsulot bo'lmagan qatorlari: bog'lanmaydi, hisobda YASHIRILADI (`yashirin` da qaytadi) */
const MAHSULOT_EMAS = ['BZ-pr_1', 'BZ-pr_9', 'BZ-fragment3'];
ok('TZ-57: yangi bog\'langan 4 kod links da va TZ-57 yozuvida', ['BZ-petlya_polugorbataya_kuxnya_simm', 'BZ-petlya_polugorb_kuxnya_simm', 'BZ-ekstsentrik_plastik_0_0']
  .every(k => links[k] && boglandi[k]));
ok('birlik/tur noaniq ' + BOGLANMASIN.length + ' kod egasi javobisiz bog\'lanmagan (qoida 4.3)', BOGLANMASIN.every(k => !links[k]), BOGLANMASIN.filter(k => links[k]).join());
ok('ular savol bo\'limida (admin panel narxsiz ro\'yxatida chiqadi)', BOGLANMASIN.every(k => savol[k]), BOGLANMASIN.filter(k => !savol[k]).join());

console.log('\n[5] Hisob dvigateli: oldin / keyin');
const mats = J('materials.json');
const S = narxSukut(mats);
const parts = [{ ref: 'a', nom: 'yon', len: 700, width: 500, qty: 2, material_code: 'LDSP16', tekstura: 'erkin', slot: 'korpus' }];
const furnById = {}; for (const [id, x] of katalog) furnById[id] = x;
const hisob = (boglash) => productionCost([{ parts, edges: [], holes: [], hardware: KODLAR.map(code => ({ code, qty: 1, unit: 'dona' })) }], mats,
  { stavka: S, furnituraById: furnById, furnituraBoglash: boglash });
const keyin = hisob(links);
const oldin = hisob(Object.fromEntries(Object.entries(links).filter(([k]) => !boglandi[k])));   // TZ-42 yozuvlarisiz
const narxsizSoni = (p) => KODLAR.filter(k => p.missing.some(m => m.group === 'Furnitura' && m.code === k)).length;
const yashirin = new Set((mats.furnitura_yashirin && mats.furnitura_yashirin.kodlar) || []);
ok('shu kodlarning hech biri yashirin ro\'yxatda emas (hisobda ko\'rinadi)', KODLAR.every(k => !yashirin.has(k)));
console.log('      narxsiz: oldin ' + narxsizSoni(oldin) + ' / ' + NOMLAR.length + ' → keyin ' + narxsizSoni(keyin) + ' / ' + NOMLAR.length);
const bogSoni = KODLAR.filter(k => links[k]).length;
ok('oldin: ' + (NOMLAR.length - MAHSULOT_EMAS.length) + ' nom narxsiz (pr_N/fragmentN yashirin)', narxsizSoni(oldin) === NOMLAR.length - MAHSULOT_EMAS.length, String(narxsizSoni(oldin)));
ok('keyin: narxsiz = ' + (NOMLAR.length - bogSoni - MAHSULOT_EMAS.length) + ' (faqat bog\'langanlari kamaydi)', narxsizSoni(keyin) === NOMLAR.length - bogSoni - MAHSULOT_EMAS.length, String(narxsizSoni(keyin)));
for (const k of KODLAR.filter(k => links[k])) {
  /* TZ-57: bir ERP mahsulotiga bog'langan turli Bazis kodlari hisobda BITTA qatorga birlashadi (qty yig'iladi) */
  const f = katalog.get(links[k]), sher = KODLAR.filter(c => links[c] === links[k]).length;
  const l = keyin.lines.find(x => x.group === 'Furnitura' && (x.code === k || String(x.id) === String(links[k])));
  ok(k + ': dvigatel narxi = katalog narxi (' + (f && f.uzs) + ')' + (sher > 1 ? ' × ' + sher + ' (birlashgan)' : ''), !!l && l.unit_price === f.uzs && l.amount === f.uzs * sher);
}
for (const k of MAHSULOT_EMAS) ok(k + ': mahsulot emas — yashirin (missing da yo\'q, lines da yo\'q, yashirin da qaytadi)',
  !keyin.missing.some(m => m.code === k) && !keyin.lines.some(x => x.code === k) && keyin.yashirin.some(y => y.code === k));
for (const k of BOGLANMASIN.filter(k => KODLAR.includes(k) && !MAHSULOT_EMAS.includes(k))) ok(k + ': narxsiz (missing)', keyin.missing.some(m => m.group === 'Furnitura' && m.code === k) && !keyin.lines.some(x => x.group === 'Furnitura' && x.code === k && x.unit_price > 0));
/* koef bog'langan koddan boshqa kodga ta'sir qilmaydi va bog'langan narx koef bilan o'zgaradi (admin paneldagi koef bilan birga ishlaydi) */
const kk = KODLAR.find(k => links[k]);
const yarim = productionCost([{ parts, edges: [], holes: [], hardware: [{ code: kk, qty: 1 }] }], mats, { stavka: S, furnituraById: furnById, furnituraBoglash: links, furnituraKoef: { [kk]: 0.5 } });
ok('admin koef 0.5 yangi bog\'lanishga ham qo\'llanadi', yarim.lines.find(x => x.code === kk).unit_price === katalog.get(links[kk]).uzs * 0.5);

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
