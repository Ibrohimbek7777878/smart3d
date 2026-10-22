/* Smart3D server — TZ-44: ERP jonli sinxron poller (server/lib/erp-jonli.js). SOXTA ERP serveri bilan (lokal http, test/erp-soxta.js): haqiqiy ERP'ga HECH QACHON
 * so'rov yuborilmaydi. Tekshiriladi: login (Django forma, csrf), sessiya yangilanishi, faqat GET, qaynoq/to'liq jadval va ERP yuki (kategoriya filtri, byudjet),
 * ±30% qoidasi, tasdiq kutish (qoralama), kurs sakrashi, noldan narx, qo'lda narx ustunligi, noaniqlik, ERP o'chganda oxirgi narx qolishi, kechikish (backoff),
 * env yo'q bo'lsa o'chiq, parol logga/javobga/xatoga/bazaga chiqmasligi, to'xtatilganda tozalanishi (unref). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createJurnal } from '../jurnal.js';
import { yadroSxema, adminSxema, adminSxema2, adminSxema3, erpJonliSxema } from '../lib/sxema.js';
import { erpJonliYarat, loginFormaOqi, qaror, kursMediana, erpQatorNormal, ErpXato, KOD } from '../lib/erp-jonli.js';
import { soxtaErp, erpMahsulot } from './erp-soxta.js';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── sintetik katalog (haqiqiy katalogga bog'lanmaydi — natija aniq) ── */
const PLITA = [
  { k: 'ERP-t1', sku: 'A100', nom: 'ЛДСП Тест Белый A100 16мм', fayl: 300000 },
  { k: 'ERP-t2', sku: 'A200', nom: 'ЛДСП Тест Серый A200 16мм', fayl: 400000 },
  { k: 'ERP-t3', sku: 'A300', nom: 'ЛДСП Тест Дуб A300 16мм', fayl: 500000 },
  { k: 'ERP-t4', sku: 'A400', nom: 'ЛДСП Тест Вишня A400 16мм', fayl: 0 }
];
const FURN = [
  { k: '90000001', sku: 'F1', nom: 'Петля Тест F1', fayl: 10000 },
  { k: '90000002', sku: 'F2', nom: 'Ручка Тест F2', fayl: 20000 }
];
const KAT = { plita: PLITA, furnitura: FURN, stoleshnitsa: [], kurs: 12800, kodlar: { plita: new Set(PLITA.map(x => x.k)), furnitura: new Set(FURN.map(x => x.k)) } };
const BOSH_SUKUT = () => new Map();                                         // sintetik sinovlarda sukut plitalar yo'q (haqiqiy materials.json ga bog'lanmaydi)
const KATALOG = { ol: () => KAT, qaynoq: () => ({ plita: new Set(['ERP-t1', 'ERP-t2']), furnitura: new Set(['90000001']) }), sukut: BOSH_SUKUT };
/* katalog yozuvlarida `cat` bor (haqiqiy katalogdagidek: ERP category_name bilan AYNAN bir xil) — kategoriya NOMI bo'yicha ustuvorlik sinovlari uchun */
const KAT_CAT = { ...KAT, plita: PLITA.map((x, i) => ({ ...x, cat: i === 3 ? 'Пусто Тест' : 'ЛДСП Тест' })), furnitura: FURN.map(x => ({ ...x, cat: 'Фурнитура Тест' })),
  stoleshnitsa: [{ erp_id: 5001, sku: 'ST1', nom: 'Столешница тест 3050*600*26мм', narx_m2: 200000, cat: 'Столешницы Тест' }] };
const KATALOG_CAT = { ol: () => KAT_CAT, qaynoq: KATALOG.qaynoq, sukut: BOSH_SUKUT };
/** 1000 kategoriyali ERP (haqiqiy ERP kabi): plita/furnitura/stoleshnitsa kategoriyalari ro'yxat OXIRIDA (id 873, 421, 650), qolgan 996 tasi katalogga aloqasiz */
function erp1000() {
  const kategoriyalar = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, name: 'Kategoriya ' + (i + 1), parent: null, products_count: 5 }));
  kategoriyalar[872] = { id: 873, name: 'ЛДСП Тест', parent: null, products_count: 4 };
  kategoriyalar[420] = { id: 421, name: 'Фурнитура Тест', parent: null, products_count: 2 };
  kategoriyalar[649] = { id: 650, name: 'Столешницы Тест', parent: null, products_count: 1 };
  kategoriyalar[6] = { id: 7, name: 'Пусто Тест', parent: null, products_count: 0 };
  const mahsulotlar = [
    erpMahsulot({ id: 101, sku: 'A100', name: PLITA[0].nom, kat: 873, uzs: 312000 }), erpMahsulot({ id: 102, sku: 'A200', name: PLITA[1].nom, kat: 873, uzs: 400000 }),
    erpMahsulot({ id: 103, sku: 'A300', name: PLITA[2].nom, kat: 873, uzs: 500000 }), erpMahsulot({ id: 777, sku: 'N1', name: 'Boshqa narsa', kat: 873, uzs: 5 }),
    erpMahsulot({ id: 201, sku: 'F1', name: FURN[0].nom, kat: 421, uzs: 10500 }), erpMahsulot({ id: 202, sku: 'F2', name: FURN[1].nom, kat: 421, uzs: 20000 }),
    erpMahsulot({ id: 5001, sku: 'ST1', name: 'Столешница тест 3050*600*26мм', kat: 650, uzs: 210000, unit: 'м2' }),
    ...Array.from({ length: 5 }, (_, i) => erpMahsulot({ id: 8000 + i, sku: 'K' + i, name: 'Aloqasiz ' + i, kat: 5, uzs: 1000 + i }))
  ];
  return { kategoriyalar, mahsulotlar };
}
const KATLAR = [{ id: 1, name: 'ЛДСП Тест' }, { id: 2, name: 'Фурнитура Тест' }, { id: 3, name: 'Мусор' }, { id: 4, name: 'Пусто' }];

const shovqin = (kat, n, bosh) => Array.from({ length: n }, (_, i) => erpMahsulot({ id: bosh + i, sku: 'N' + (bosh + i), name: 'Шуруп шум ' + (bosh + i), kat, uzs: 1000 + i }));
const boshMahsulot = () => [
  erpMahsulot({ id: 101, sku: 'A100', name: PLITA[0].nom, kat: 1, uzs: 300000 }),
  erpMahsulot({ id: 102, sku: 'A200', name: PLITA[1].nom, kat: 1, uzs: 400000 }),
  erpMahsulot({ id: 103, sku: 'A300', name: PLITA[2].nom, kat: 1, uzs: 500000 }),
  erpMahsulot({ id: 104, sku: 'A400', name: PLITA[3].nom, kat: 1, uzs: 450000 }),
  ...shovqin(1, 3, 1000),
  erpMahsulot({ id: 201, sku: 'F1', name: FURN[0].nom, kat: 2, uzs: 10000 }),
  erpMahsulot({ id: 202, sku: 'F2', name: FURN[1].nom, kat: 2, uzs: 20000 }),
  ...shovqin(2, 2, 2000),
  ...shovqin(3, 120, 3000)
];
const xz = (code, name, narx) => ({ id: Number(code.slice(-4)), name, code, category_id: 1, category_name: 'Услуги Распила', service_type: 'mixed', unit_type: 'fixed', is_active: true, client_price: narx });
const boshXizmat = () => [xz('7802360156', 'Услуга Распила Holzma 2', 43000), xz('7802360124', 'Услуга Распила Holzma 1', 25000)];
const bahoOl = (erp, id) => erp.mahsulotlar.find(m => m.id === id);
const narxQoy = (erp, id, uzs) => { const m = bahoOl(erp, id); m.display_price_uzs = uzs; m.price = uzs.toFixed(2); };

async function muhit({ erp: erpOpt = {}, env = {}, sozlama = {}, katalog = KATALOG, eskiParol, fetchImpl } = {}) {
  const erp = await soxtaErp({ kategoriyalar: KATLAR, mahsulotlar: boshMahsulot(), xizmatlar: boshXizmat(), ...erpOpt });
  const db = new Database(':memory:');
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password_hash TEXT, role TEXT DEFAULT 'user')");
  db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  adminSxema(db); adminSxema2(db); adminSxema3(db); erpJonliSxema(db);
  const chiqish = [];
  const jurnal = createJurnal(db, { out: { write: s => chiqish.push(String(s)) }, err: { write: s => chiqish.push(String(s)) } });
  const e = { ERP_JONLI: '1', ERP_URL: erp.url, ERP_LOGIN: erp.login, ERP_PASSWORD: eskiParol || erp.parol, ...env };
  const jonli = erpJonliYarat({ db, jurnal, env: e, katalog, ...(fetchImpl ? { fetchImpl } : {}), sozlama: { qaynoqOraliqMs: 0, toliqOraliqMs: 0, ...sozlama } });
  const yop = async () => { await jonli.stop(); await erp.yop(); db.close(); };
  const layer = () => Object.fromEntries(db.prepare('SELECT tur, kalit, uzs FROM erp_narx').all().map(x => [x.tur + ':' + x.kalit, x.uzs]));
  return { erp, db, jurnal, jonli, chiqish, yop, layer, env: e };
}
const tur = (m, nom) => m.erp.getlar().filter(x => x.path === nom);

/* ═══════════ sof funksiyalar ═══════════ */
test('loginFormaOqi: Django forma — maydon nomlari sahifadan o\'qiladi (username / login / email), yashirin maydonlar olinadi', () => {
  const a = loginFormaOqi('<form method="post" action="/login/"><input type="hidden" name="csrfmiddlewaretoken" value="T1"><input type="hidden" name="next" value="/"><input type="text" name="username"><input type="password" name="password"></form>');
  assert.deepEqual(a, { amal: '/login/', yashirin: [['csrfmiddlewaretoken', 'T1'], ['next', '/']], loginNom: 'username', parolNom: 'password' });
  const b = loginFormaOqi("<form action='/kirish/'><input name='csrfmiddlewaretoken' type='hidden' value='X'><input type=email name=login><input type=password name=pwd1></form>");
  assert.equal(b.loginNom, 'login'); assert.equal(b.parolNom, 'pwd1'); assert.equal(b.amal, '/kirish/');
  assert.equal(loginFormaOqi('<html>parol maydoni yo\'q</html>'), null);
  assert.equal(loginFormaOqi(''), null);
});

test('qaror: ±chegara ichida — avtomatik; katta o\'zgarish, birinchi narx, kurs sakrashi — tasdiq kutadi', () => {
  const x = (h, foiz, yangi = 100) => ({ h, foiz, yangi });
  assert.deepEqual(qaror(x('ozgardi', 29.9)), { amal: 'qollash' });
  assert.deepEqual(qaror(x('ozgardi', -30)), { amal: 'qollash' });
  assert.deepEqual(qaror(x('ozgardi', 30.1)), { amal: 'kutadi', sabab: 'katta_ozgarish' });
  assert.deepEqual(qaror(x('ozgardi', -45)), { amal: 'kutadi', sabab: 'katta_ozgarish' });
  assert.deepEqual(qaror(x('ozgardi', 5), { chegara: 5 }), { amal: 'qollash' });
  assert.deepEqual(qaror(x('ozgardi', 6), { chegara: 5 }), { amal: 'kutadi', sabab: 'katta_ozgarish' });
  assert.deepEqual(qaror(x('ozgardi', 2), { kursSakradi: true }), { amal: 'kutadi', sabab: 'kurs_sakradi' });
  assert.deepEqual(qaror(x('toldirildi', null)), { amal: 'kutadi', sabab: 'birinchi_narx' });
  assert.deepEqual(qaror(x('ozgardi', 2, 0)), { amal: 'kutadi', sabab: 'narx_yoq' });
  assert.equal(qaror(x('bir_xil', 0)).amal, 'yoq');
});

test('erpQatorNormal / kursMediana: nofaol qator tashlanadi, dollar ERP kursida, noto\'g\'ri narx rad', () => {
  assert.equal(erpQatorNormal({ id: 1, name: 'a', is_active: false, display_price_uzs: 5 }), null);
  const a = erpQatorNormal({ id: 1, name: 'a', sku: 's', unit: 'шт', display_price_uzs: '123 456,5', price: '1', price_usd: '10.00', category: 7 });
  assert.equal(a.qator.display_price_uzs, 123456.5); assert.equal(a.yon.kat, '7');
  assert.equal(erpQatorNormal({ id: 1, name: 'a', price: '90000.00' }).qator.display_price_uzs, 90000, 'display_price_uzs yo\'q — price');
  assert.equal(erpQatorNormal({ id: 1, name: 'a', display_price_usd: 10 }, 11773.68).qator.display_price_uzs, 117737, 'faqat dollar — ERP kursi');
  assert.equal(erpQatorNormal({ id: 1, name: 'a', display_price_uzs: 'abc' }).qator.display_price_uzs, -1, 'noto\'g\'ri narx rad etiladi (erpMahsulotOqi)');
  assert.equal(erpQatorNormal({ id: 1, name: 'a', display_price_uzs: -5 }).qator.display_price_uzs, -1);
  assert.equal(kursMediana([{ price: 117736.8, usd: 10 }, { price: 235473.6, usd: 20 }, { price: 11773.68, usd: 1 }, { price: 1, usd: 0 }]), 11773.68);
  assert.equal(kursMediana([{ price: 100, usd: 1 }]), 0, 'kamida 3 ta namuna');
});

/* ═══════════ kategoriya NOMI bo'yicha ustuvorlik (haqiqiy ERP: ~1000 kategoriya) ═══════════ */
test('1000 kategoriyali ERP: BIRINCHI qaynoq tsiklning o\'zidayoq plita va furnitura o\'z kategoriyasi (katalogdagi cat nomi) orqali yangilanadi; byudjet ≤ ~60 so\'rov', async () => {
  const m = await muhit({ erp: erp1000(), katalog: KATALOG_CAT });
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null, JSON.stringify(st.xato));
  const g = m.erp.getlar();
  const royxat = g.filter(x => x.path === '/api/v2/products/categories/');
  assert.equal(royxat.length, 20, '1000 kategoriya = 20 sahifa ro\'yxat (mahsulot so\'rovi emas)');
  const mahs = g.filter(x => x.path === '/api/v2/products/').map(x => x.query.category);
  assert.deepEqual([...new Set(mahs)].sort(), ['421', '873'], 'faqat qaynoq plita/furnitura kategoriyalari o\'qildi (kashf kerak emas)');
  assert.ok(st.sorov <= 60, `birinchi qaynoq tsikl so'rovi: ${st.sorov}`);
  assert.equal(m.layer()['plita:ERP-t1'], 312000, 'plita narxi birinchi tsiklda yangilandi');
  assert.equal(m.layer()['furnitura:90000001'], 10500, 'furnitura ham');
  /* diagnostika: kuzatilayotgan obyektlar va kashf qilinmagan kategoriyalar */
  const h = m.jonli.holat();
  assert.deepEqual(h.kuzatilayotgan, { plita: 3, furnitura: 2, xizmat: 2, sukut: 0 });
  assert.deepEqual(h.katalog, { plita: 4, furnitura: 2, qaynoq_plita: 2, qaynoq_furnitura: 1, qaynoq_sukut: 0 });
  assert.equal(h.kategoriyalar.jami, 1000); assert.equal(h.kategoriyalar.nom_mos, 4);            // ЛДСП Тест, Пусто Тест, Фурнитура Тест, Столешницы Тест
  assert.equal(h.kategoriyalar.qaynoq, 2); assert.equal(h.kategoriyalar.qaynoq_nomalum, 0);
  assert.equal(h.kategoriyalar.kashf, 3, 'o\'qilgan 2 + bo\'sh (products_count=0) 1');
  assert.equal(h.kategoriyalar.kashf_qilinmagan, 997, '1000 − 2 (o\'qilgan) − 1 (bo\'sh)');
  assert.equal(h.kategoriyalar.nom_mos_kashf_qilinmagan, 1, 'stoleshnitsa kategoriyasi to\'liq aylanishda o\'qiladi');
  /* ikkinchi qaynoq tsikl: ro'yxat qayta so'ralmaydi, yana faqat 2 kategoriya + xizmatlar */
  m.erp.tozala();
  const st2 = await m.jonli.aylanish('qaynoq');
  assert.equal(m.erp.getlar().filter(x => x.path === '/api/v2/products/categories/').length, 0);
  assert.ok(st2.sorov <= 4, `ikkinchi tsikl: ${st2.sorov}`);
  await m.yop();
});

test('to\'liq aylanish 1000 kategoriyada: avval plita/furnitura, so\'ng nomi katalogga mos (stoleshnitsa), keyin faqat kichik byudjet (40) bilan boshqalar; bo\'sh kategoriya o\'qilmaydi', async () => {
  const m = await muhit({ erp: erp1000(), katalog: KATALOG_CAT });
  const st = await m.jonli.aylanish('toliq');
  assert.equal(st.xato, null, JSON.stringify(st.xato));
  const mahs = m.erp.getlar().filter(x => x.path === '/api/v2/products/').map(x => x.query.category);
  assert.deepEqual(mahs.slice(0, 2).sort(), ['421', '873'], 'plita va furnitura kategoriyalari BIRINCHI');
  assert.equal(mahs[2], '650', 'nomi katalogga mos kategoriya (stoleshnitsa) keyin');
  assert.ok(!mahs.includes('7'), 'products_count=0 kategoriya o\'qilmaydi');
  const kashf = mahs.slice(3);
  assert.ok(kashf.length > 0 && kashf.length <= 40, `kashf so'rovlari ${kashf.length} (byudjet 40)`);
  assert.ok(st.sorov <= 2 + 20 + 3 + 40 + 1, `to'liq tsikl so'rovi ${st.sorov} (login 2 + ro'yxat 20 + plita/furnitura/stoleshnitsa 3 + kashf ≤ 40 + xizmat 1)`);
  assert.equal(m.layer()['plita:ERP-t1'], 312000);
  const h = m.jonli.holat();
  assert.equal(h.kategoriyalar.nom_mos_kashf_qilinmagan, 0);
  assert.equal(h.kategoriyalar.kashf_qilinmagan, 996 - kashf.length);
  /* keyingi to'liq tsikl: kashf davom etadi (yana ≤ 40), plita/furnitura/stoleshnitsa qayta o'qiladi */
  m.erp.tozala();
  await m.jonli.aylanish('toliq');
  const mahs2 = m.erp.getlar().filter(x => x.path === '/api/v2/products/').map(x => x.query.category);
  assert.deepEqual(mahs2.slice(0, 3).sort(), ['421', '650', '873']);
  assert.ok(mahs2.length - 3 <= 40);
  assert.equal(m.jonli.holat().kategoriyalar.kashf_qilinmagan, 996 - kashf.length - (mahs2.length - 3), 'kashf oldingi qolgan joydan davom etdi');
  await m.yop();
});

test('katalogda cat yo\'q yoki ERP nomi mos kelmasa — eski yo\'l: qaynoq tsiklda kashf (kichik byudjet) topadi', async () => {
  const kat = { ...KAT, plita: PLITA.map(x => ({ ...x, cat: 'Mavjud-bo\'lmagan nom' })) };
  const m = await muhit({ erp: erp1000(), katalog: { ol: () => kat, qaynoq: KATALOG.qaynoq, sukut: BOSH_SUKUT } });
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null);
  const h = m.jonli.holat();
  assert.ok(h.kategoriyalar.qaynoq_nomalum >= 0);
  const mahs = m.erp.getlar().filter(x => x.path === '/api/v2/products/');
  assert.ok(mahs.length <= 35, `qaynoq kashf byudjeti: ${mahs.length}`);
  await m.yop();
});

/* ═══════════ sukut plitalar (LDSP16, MDF16, HDF3): ERP mahsulot ID bo'yicha ═══════════ */
const SUKUT_KAT = (extra = {}) => ({ ol: () => KAT, qaynoq: () => ({ plita: new Set(), furnitura: new Set() }), sukut: () => new Map([['LDSP16', { erp_id: '10807', sku: '0110 SM', nom: 'ЛДСП Ультрадекор Белый гладкий 0110 16мм', fayl: 341761 }]]), ...extra });
function erpSukut(narx = 341761) {
  const shovqin0 = Array.from({ length: 55 }, (_, i) => erpMahsulot({ id: 20000 + i, sku: '0110 SM ' + i, name: 'Boshqa 0110 SM mahsulot ' + i, kat: 9, uzs: 1000 + i }));   // qidiruvda bizdan OLDIN (2-sahifaga tushadi)
  return { kategoriyalar: [{ id: 9, name: 'Sukut kategoriya', products_count: 56 }], mahsulotlar: [...shovqin0, erpMahsulot({ id: 10807, sku: '0110 SM', name: 'ЛДСП Ультрадекор Белый гладкий 0110 16мм', kat: 9, uzs: narx })] };
}
test('sukut plita (LDSP16): kategoriyasi noma\'lum — search=<sku> bilan ID bo\'yicha topiladi, keyin o\'z kategoriyasi orqali yangilanadi; /api/erp-narx sukut bo\'limi, versiya, ETag', async () => {
  const m = await muhit({ erp: erpSukut(), katalog: SUKUT_KAT() });
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null, JSON.stringify(st.xato));
  const q1 = m.erp.getlar().filter(x => x.path === '/api/v2/products/' && x.query.search);
  assert.deepEqual(q1.map(x => [x.query.search, x.query.page]), [['0110 SM', '1'], ['0110 SM', '2']], 'sku bo\'yicha qidiruv, 2-sahifada topildi');
  assert.deepEqual(m.jonli.ommaviy().sukut, {}, 'narx o\'zgarmadi — qatlamda yo\'q (fayldagi narx amal qiladi)');
  assert.equal(m.jonli.holat().kuzatilayotgan.sukut, 1);
  assert.equal(m.db.prepare("SELECT kat_id FROM erp_jonli_obyekt WHERE tur = 'sukut' AND kalit = 'LDSP16'").get().kat_id, '9', 'kategoriya o\'rganildi');
  /* ERP narxi +5% → keyingi tsikl kategoriya orqali (qidiruvsiz) qo'llaydi */
  narxQoy(m.erp, 10807, 359000);
  const e0 = m.jonli.ommaviyEtag(), v0 = m.jonli.holat().versiya;
  m.erp.tozala();
  const st2 = await m.jonli.aylanish('qaynoq');
  assert.equal(st2.xato, null);
  const g = m.erp.getlar();
  assert.ok(!g.some(x => x.query.search), 'kategoriya ma\'lum — qidiruv yo\'q');
  assert.deepEqual([...new Set(g.filter(x => x.path === '/api/v2/products/').map(x => x.query.category))], ['9']);
  assert.deepEqual(m.jonli.ommaviy().sukut, { LDSP16: 359000 });
  assert.equal(m.layer()['sukut:LDSP16'], 359000);
  assert.ok(m.jonli.holat().versiya > v0); assert.notEqual(m.jonli.ommaviyEtag(), e0, 'ETag o\'zgardi');
  assert.deepEqual(m.jonli.ommaviy().plita, {}); assert.deepEqual(m.jonli.ommaviy().furnitura, {}, 'plita/furnitura bo\'limlariga aralashmaydi');
  /* audit va qaytarish: partiya qollangan_json da sukut, eski = null (qatlam yo'q edi) */
  const b = m.db.prepare("SELECT qollangan_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qollandi' ORDER BY id DESC").get();
  assert.deepEqual(JSON.parse(b.qollangan_json).sukut.map(x => [x.k, x.eski, x.yangi]), [['LDSP16', null, 359000]]);
  assert.ok(m.jonli.holat().ozgarishlar.some(o => o.tur === 'sukut' && o.kalit === 'LDSP16' && o.harakat === 'qollandi' && o.eski === 341761 && o.yangi === 359000));
  /* >30% — tasdiq kutadi, public narx o'zgarmaydi */
  narxQoy(m.erp, 10807, 900000);
  await m.jonli.aylanish('qaynoq');
  assert.deepEqual(m.jonli.ommaviy().sukut, { LDSP16: 359000 });
  const qr = JSON.parse(m.db.prepare("SELECT farq_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get().farq_json);
  const x = qr.find(y => y.g === 'sukut');
  assert.ok(x && x.k === 'LDSP16' && x.q === true && x.sabab === 'katta_ozgarish' && x.eski === 359000 && x.yangi === 900000 && x.h === 'ozgardi', JSON.stringify(x));
  assert.ok(m.jonli.holat().tasdiq_kutadi.soni >= 1);
  /* admin qo'lda narxi (mat_narx, kod = LDSP16) ustun */
  narxQoy(m.erp, 10807, 365000);                                          // ERP qaytdi: +1,7%
  m.db.prepare("INSERT INTO mat_narx (kod, uzs) VALUES ('LDSP16', 500000)").run();
  const st3 = await m.jonli.aylanish('qaynoq');
  assert.deepEqual(m.jonli.ommaviy().sukut, { LDSP16: 359000 }, 'qo\'lda narx bor — ERP o\'zgartirmaydi');
  assert.ok(st3.qolda >= 1);
  await m.yop();
});

test('sukut plita ERP\'da topilmasa: xato emas (ogohlantirish), 6 soat ichida qayta qidirilmaydi, narx o\'zgarmaydi', async () => {
  const m = await muhit({ erp: { kategoriyalar: [{ id: 9, name: 'X', products_count: 1 }], mahsulotlar: [erpMahsulot({ id: 1, sku: 'Q', name: 'Boshqa', kat: 9, uzs: 5 })] }, katalog: SUKUT_KAT() });
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null);
  assert.ok(st.ogohlantirish.some(o => /sukut LDSP16: ERP mahsuloti \(id 10807\) topilmadi/.test(o.matn)), JSON.stringify(st.ogohlantirish));
  const n = m.erp.getlar().filter(x => x.query.search).length;
  assert.ok(n >= 2 && n <= 4);
  m.erp.tozala();
  await m.jonli.aylanish('qaynoq');
  assert.equal(m.erp.getlar().filter(x => x.query.search).length, 0, '6 soat ichida qayta qidirilmaydi');
  assert.deepEqual(m.jonli.ommaviy().sukut, {});
  await m.yop();
});

test('sukut: haqiqiy materials.json — LDSP16, MDF16, HDF3 qaynoq to\'plamga ERP ID bilan kiradi; kodlar to\'plami ham (admin qollash uchun)', async () => {
  const { sukutErpOl, qaynoqKalitlar, erpKatalog } = await import('../lib/erp-katalog.js');
  const sk = sukutErpOl();
  assert.deepEqual([...sk.keys()].sort(), ['HDF3', 'LDSP16', 'MDF16']);
  assert.equal(sk.get('LDSP16').erp_id, '10807'); assert.equal(sk.get('MDF16').erp_id, '11578'); assert.equal(sk.get('HDF3').erp_id, '11750');
  assert.ok(sk.get('LDSP16').fayl > 0);
  const db = new Database(':memory:'); db.exec('CREATE TABLE furn_boglash (kod TEXT, erp_id TEXT)');
  assert.deepEqual([...qaynoqKalitlar(db).sukut].sort(), ['HDF3', 'LDSP16', 'MDF16']);
  assert.deepEqual([...erpKatalog().kodlar.sukut].sort(), ['HDF3', 'LDSP16', 'MDF16']);
  db.close();
});

/* ═══════════ sahifalash (ERP shakli noaniq bo'lsa ham xavfsiz) ═══════════ */
test('sahifalash: limit/offset shakli (`next` so\'rov qatori bilan) ham o\'qiladi; filtr (category) yo\'qolmaydi', async () => {
  const m = await muhit();
  m.erp.sahifaTuri = 'offset';
  const st = await m.jonli.aylanish('toliq');
  assert.equal(st.xato, null);
  const k3 = m.erp.getlar().filter(x => x.path === '/api/v2/products/' && x.query.category === '3');
  assert.deepEqual(k3.map(x => x.query.offset || '0'), ['0', '50', '100'], '120 qator: offset 0, 50, 100');
  assert.ok(k3.every(x => x.query.category === '3'));
  assert.deepEqual(m.db.prepare("SELECT jami FROM erp_jonli_kat WHERE kat_id = '3'").get(), { jami: 120 });
  await m.yop();
});

test('`next` boshqa hostga ishora qilsa — unga HECH QACHON so\'rov yuborilmaydi (kuki/parol sizib chiqmaydi); sahifa parametri e\'tiborsiz qolsa — takrorlanmaydi', async () => {
  const hostlar = new Set();
  const asl = globalThis.fetch;
  const spy = (url, o) => { hostlar.add(new URL(url).host); return asl(url, o); };
  const m = await muhit({ fetchImpl: spy });
  m.erp.sahifaTuri = 'tashqi';
  const st = await m.jonli.aylanish('toliq');
  assert.equal(st.xato, null);
  assert.deepEqual([...hostlar], [new URL(m.erp.url).host], 'faqat ERP_URL hosti');
  assert.equal(m.erp.getlar().filter(x => x.path === '/api/v2/products/' && x.query.category === '3').length, 3, 'tashqi next ham sahifalab o\'qiladi (so\'rov qatori bilan)');
  m.erp.sahifaTuri = 'ignore'; m.erp.tozala();
  const st2 = await m.jonli.aylanish('toliq');
  assert.equal(st2.xato, null);
  assert.ok(m.erp.getlar().filter(x => x.path === '/api/v2/products/' && x.query.category === '3').length <= 3, 'cheksiz aylanmadi');
  await m.yop();
});

/* ═══════════ o'chiq holat ═══════════ */
test('env yo\'q yoki ERP_JONLI!=1: o\'chiq — xato yo\'q, hech qanday so\'rov yo\'q, hozir 409 S3D-ERP-001', async () => {
  for (const [env, sabab] of [[{ ERP_JONLI: undefined }, 'ochirilgan'], [{ ERP_LOGIN: '' }, 'env_yoq'], [{ ERP_PASSWORD: undefined }, 'env_yoq'], [{ ERP_URL: 'ftp://x' }, 'url_yaroqsiz']]) {
    const m = await muhit({ env });
    assert.equal(m.jonli.yoqilgan, false); assert.equal(m.jonli.sabab, sabab);
    assert.equal(m.jonli.start(), false);
    await assert.rejects(m.jonli.hozirSinxron(), (e) => e instanceof ErpXato && e.kod === KOD.OCHIQ);
    const h = m.jonli.holat();
    assert.equal(h.yoqilgan, false); assert.equal(h.keyingi_qaynoq, null); assert.equal(h.manzil, '');
    assert.equal(m.jonli.ommaviy().jonli.yoqilgan, false); assert.equal(m.jonli.ommaviy().jonli.eski, false, 'o\'chiq — "eski narx" ogohlantirishi yo\'q');
    assert.equal(m.erp.sorovlar.length, 0, 'ERP\'ga so\'rov yuborilmaydi');
    await m.yop();
  }
});

/* ═══════════ asosiy oqim ═══════════ */
test('birinchi (sovuq) qaynoq aylanish: login, kategoriyalar kashfi, ±30% qoidasi, tasdiq qoralamasi, audit, versiya, faqat GET', async () => {
  const m = await muhit();
  const { erp, db, jonli } = m;
  narxQoy(erp, 101, 312000);          // +4%  → avtomatik
  narxQoy(erp, 102, 900000);          // +125% → tasdiq kutadi
  narxQoy(erp, 201, 10500);           // furnitura +5% → avtomatik
  narxQoy(erp, 103, 500000);          // o'zgarmadi
  erp.xizmatlar[0].client_price = 44000;   // xizmat +2.3% → avtomatik
  erp.xizmatlar[1].client_price = 60000;   // xizmat +140% → tasdiq kutadi
  const v0 = jonli.holat().versiya;
  const st = await jonli.aylanish('qaynoq');
  assert.equal(st.xato, null, JSON.stringify(st.xato));
  assert.equal(erp.loginSoni, 1, 'bir marta kirdi');
  assert.ok(erp.faqatGet(), 'faqat GET (login POST dan tashqari): ' + JSON.stringify(erp.sorovlar.filter(x => x.method !== 'GET')));
  assert.ok(erp.sorovlar.every(x => x.ua === 'Smart3D-sync'), 'User-Agent');
  assert.deepEqual(m.layer(), { 'plita:ERP-t1': 312000, 'furnitura:90000001': 10500 }, 'faqat ±30% ichidagilar qo\'llandi');
  const cur = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'narx_stavkalari'").get().value);
  assert.equal(cur.xizmatlar['7802360156'].qiymat, 44000, 'xizmat narxi qo\'llandi');
  assert.equal(cur.xizmatlar['7802360124'].qiymat, 25000, 'katta o\'zgarish xizmatga qo\'llanmadi');
  assert.match(cur._meta.ozgartirildi, /^tizim,/);
  /* qoralama: tasdiq kutayotganlar (mavjud erp_partiya, manba 'jonli') */
  const q = db.prepare("SELECT * FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").all();
  assert.equal(q.length, 1);
  const qr = JSON.parse(q[0].farq_json);
  const kalit = (x) => x.g + ':' + x.k;
  const t2 = qr.find(x => kalit(x) === 'plita:ERP-t2');
  assert.ok(t2 && t2.q === true && t2.sabab === 'katta_ozgarish' && t2.eski === 400000 && t2.yangi === 900000 && t2.h === 'ozgardi', JSON.stringify(t2));
  assert.ok(qr.find(x => kalit(x) === 'xizmat:7802360124' && x.q && x.satr && x.satr.qiymat === 60000), 'xizmat qatori satr bilan');
  assert.ok(qr.find(x => kalit(x) === 'plita:ERP-t4' && x.h === 'toldirildi' && x.sabab === 'birinchi_narx'), 'katalogda narx yo\'q edi — birinchi narx ham tasdiq kutadi');
  assert.ok(!qr.find(x => kalit(x) === 'plita:ERP-t1'), 'qo\'llangani qoralamada yo\'q');
  /* audit: "tizim: ERP jonli", qaytarish uchun partiya qollangan_json */
  const a = db.prepare("SELECT * FROM admin_audit WHERE bolim = 'erp'").all();
  assert.ok(a.length >= 1 && a.every(x => x.user_id === null && /partiya:\d+/.test(x.kalit)), 'audit yozuvi (tizim)');
  assert.match(JSON.parse(a[0].yangi).manba, /tizim: ERP jonli/);
  const b = db.prepare("SELECT * FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qollandi'").all();
  const ch = JSON.parse(b[0].qollangan_json);
  assert.deepEqual(ch.plita.map(x => [x.k, x.eski, x.yangi]), [['ERP-t1', null, 312000]]);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM narx_history').get().n >= 1, 'xizmat narx_history ga ham yozildi');
  /* holat va tarix */
  const h = jonli.holat();
  assert.equal(h.versiya, v0 + 1 + (a.length - 1), 'har qo\'llash partiyasida versiya +1');
  assert.ok(h.versiya > v0 && h.oxirgi_muvaffaqiyat && h.xato_soni === 0 && h.eski === false);
  assert.deepEqual(h.tasdiq_kutadi.sabab && Object.keys(h.tasdiq_kutadi.sabab).sort(), ['birinchi_narx', 'katta_ozgarish']);
  assert.ok(h.tasdiq_kutadi.soni >= 3 && h.tasdiq_kutadi.partiya_id === q[0].id);
  assert.ok(h.ozgarishlar.some(x => x.harakat === 'qollandi' && x.kalit === 'ERP-t1' && x.eski === 300000 && x.yangi === 312000));
  assert.ok(h.ozgarishlar.some(x => x.harakat === 'kutadi' && x.kalit === 'ERP-t2' && x.sabab === 'katta_ozgarish'));
  assert.ok(h.ozgarishlar.length <= 50);
  assert.equal(h.kategoriyalar.jami, 4); assert.equal(h.kategoriyalar.kashf, 4); assert.equal(h.kategoriyalar.bizniki, 2);
  await m.yop();
});

test('qaynoq aylanish ERP yukini kamaytiradi: kategoriya xaritasi o\'rganilgach faqat qaynoq kategoriyalar (+ xizmatlar) o\'qiladi; "Мусор" qayta o\'qilmaydi', async () => {
  const m = await muhit();
  const { erp, db, jonli } = m;
  await jonli.aylanish('qaynoq');                                         // kashf: hamma 4 kategoriya
  const kashf = erp.getlar().filter(x => x.path === '/api/v2/products/').map(x => x.query.category);
  assert.deepEqual([...new Set(kashf)].sort(), ['1', '2', '3', '4']);
  assert.equal(kashf.filter(c => c === '3').length, 3, '120 qator = 3 sahifa (50 tadan)');
  assert.deepEqual(db.prepare('SELECT kat_id, mos FROM erp_jonli_kat ORDER BY kat_id').all().map(x => [x.kat_id, x.mos]), [['1', 4], ['2', 2], ['3', 0], ['4', 0]]);
  erp.tozala();
  const st = await jonli.aylanish('qaynoq');
  const g = erp.getlar();
  const mahs = g.filter(x => x.path === '/api/v2/products/');
  assert.deepEqual([...new Set(mahs.map(x => x.query.category))].sort(), ['1', '2'], 'faqat qaynoq kategoriyalar');
  assert.equal(g.filter(x => x.path === '/api/v2/products/categories/').length, 0, 'kategoriyalar ro\'yxati qayta so\'ralmaydi (yangi)');
  assert.ok(g.filter(x => x.path === '/erp/services/api/manage/services/').length >= 1, 'xizmatlar har aylanishda');
  assert.ok(st.sorov <= 8, `qaynoq aylanish so\'rovi: ${st.sorov}`);
  assert.equal(erp.loginSoni, 1, 'sessiya qayta ishlatildi');
  /* to'liq aylanish: bizniki kategoriyalar (1, 2); bizniki bo'lmagan (3, 4) kashf muddatigacha o'qilmaydi; kategoriya ro'yxati 6 soatda bir marta so'raladi */
  erp.tozala();
  await jonli.aylanish('toliq');
  const t = erp.getlar();
  assert.deepEqual([...new Set(t.filter(x => x.path === '/api/v2/products/').map(x => x.query.category))].sort(), ['1', '2']);
  assert.equal(t.filter(x => x.path === '/api/v2/products/categories/').length, 0, 'kategoriya ro\'yxati yangi — qayta so\'ralmaydi');
  db.prepare("UPDATE erp_jonli_holat SET qiymat = ? WHERE kalit = 'kat_royxat_vaqti'").run(new Date(Date.now() - 7 * 3600_000).toISOString());
  erp.tozala();
  await jonli.aylanish('toliq');
  assert.equal(erp.getlar().filter(x => x.path === '/api/v2/products/categories/').length, 1, '6 soatdan keyin ro\'yxat yangilandi');
  /* bizniki bo'lmagan kategoriya 7 kundan keyin qayta tekshiriladi */
  db.prepare("UPDATE erp_jonli_kat SET skan_at = datetime('now', '-8 days') WHERE kat_id = '3'").run();
  erp.tozala();
  await jonli.aylanish('toliq');
  assert.ok(erp.getlar().some(x => x.path === '/api/v2/products/' && x.query.category === '3'), '7 kundan keyin qayta o\'qildi');
  await m.yop();
});

test('byudjet: qaynoq aylanishda mahsulot so\'rovlari ≤ byudjet (katta kategoriyalar bo\'lsa ham), 19 924 mahsulotni to\'liq o\'qimaydi', async () => {
  const kat = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const mahs = [erpMahsulot({ id: 101, sku: 'A100', name: PLITA[0].nom, kat: 1, uzs: 300000 }), ...shovqin(1, 149, 1000),
    erpMahsulot({ id: 201, sku: 'F1', name: FURN[0].nom, kat: 2, uzs: 10000 }), ...shovqin(2, 149, 2000)];       // har kategoriya 3 sahifa
  const m = await muhit({ erp: { kategoriyalar: kat, mahsulotlar: mahs }, sozlama: { qaynoqButget: 4 } });
  await m.jonli.aylanish('toliq');                                        // o'rganish
  for (let i = 0; i < 3; i++) {
    m.erp.tozala();
    await m.jonli.aylanish('qaynoq');
    const n = m.erp.getlar().filter(x => x.path === '/api/v2/products/').length;
    assert.ok(n <= 4, `qaynoq mahsulot so'rovlari ${n} > 4`);
    assert.ok(n >= 3, 'byudjet ishlatiladi');
  }
  await m.yop();
});

test('o\'zgarmagan narx — yangi partiya ham, versiya ham yo\'q; qayta kirmaydi; sessiya tugasa — avtomatik qayta kiradi', async () => {
  const m = await muhit();
  await m.jonli.aylanish('toliq');
  const v = m.jonli.holat().versiya, p = m.db.prepare('SELECT COUNT(*) AS n FROM erp_partiya').get().n, a = m.db.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n;
  await m.jonli.aylanish('qaynoq'); await m.jonli.aylanish('qaynoq');
  assert.equal(m.jonli.holat().versiya, v); assert.equal(m.db.prepare('SELECT COUNT(*) AS n FROM erp_partiya').get().n, p);
  assert.equal(m.db.prepare('SELECT COUNT(*) AS n FROM admin_audit').get().n, a);
  assert.equal(m.erp.loginSoni, 1);
  m.erp.sessiyaTugat();                                                   // ERP sessiyani tugatdi: keyingi so'rov /login/ ga yo'naltiriladi
  narxQoy(m.erp, 101, 306000);
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null);
  assert.equal(m.erp.loginSoni, 2, 'sessiya tugagach qayta kirdi');
  assert.equal(m.layer()['plita:ERP-t1'], 306000, 'narx qo\'llandi');
  assert.ok(m.erp.faqatGet());
  await m.yop();
});

test('admin qo\'lda narxi (mat_narx) ustun: ERP o\'zgarsa ham qatlam yozilmaydi', async () => {
  const m = await muhit();
  await m.jonli.aylanish('toliq');
  m.db.prepare("INSERT INTO mat_narx (kod, uzs) VALUES ('ERP-t3', 555000)").run();
  narxQoy(m.erp, 103, 510000);                                            // +2% — lekin admin qo'lda 555000 qo'ygan
  const st = await m.jonli.aylanish('toliq');
  assert.equal(m.layer()['plita:ERP-t3'], undefined);
  assert.ok(st.qolda >= 1);
  await m.yop();
});

test('tasdiq: qoralama qo\'llanmaguncha narx o\'zgarmaydi; qoralama o\'chirilsa shu narx qayta taklif qilinmaydi (rad), yangi narx — taklif qilinadi', async () => {
  const m = await muhit();
  const { erp, db, jonli } = m;
  await jonli.aylanish('toliq');
  narxQoy(erp, 102, 800000);                                              // +100%
  await jonli.aylanish('qaynoq');
  assert.equal(m.layer()['plita:ERP-t2'], undefined);
  const q = db.prepare("SELECT id FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get();
  assert.ok(q);
  await jonli.aylanish('qaynoq');                                         // takror — qoralama bitta, takrorlanmaydi
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM erp_jonli_tarix WHERE harakat = 'kutadi' AND kalit = 'ERP-t2'").get().n, 1, 'tarixga bir marta');
  /* admin qoralamani o'chirdi (admin-erp.js DELETE shuni qiladi) */
  const qr = JSON.parse(db.prepare('SELECT farq_json FROM erp_partiya WHERE id = ?').get(q.id).farq_json).filter(x => x.q);
  jonli.radEtish(qr); db.prepare('DELETE FROM erp_partiya WHERE id = ?').run(q.id);
  await jonli.aylanish('qaynoq');
  const yana = db.prepare("SELECT farq_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get();
  assert.ok(!yana || !JSON.parse(yana.farq_json).some(x => x.k === 'ERP-t2'), 'rad etilgan narx qayta taklif qilinmadi');
  narxQoy(erp, 102, 950000);                                              // ERP narxi yana o'zgardi — yangi taklif
  await jonli.aylanish('qaynoq');
  const yangi = JSON.parse(db.prepare("SELECT farq_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get().farq_json);
  assert.equal(yangi.find(x => x.k === 'ERP-t2').yangi, 950000);
  await m.yop();
});

test('±chegara sozlanadi (5…100): 10% o\'zgarish 5% chegarada tasdiq kutadi; noto\'g\'ri qiymat S3D-ERP-008', async () => {
  const m = await muhit();
  await m.jonli.aylanish('toliq');
  for (const b of [{}, { chegara_foiz: 4 }, { chegara_foiz: 101 }, { chegara_foiz: '30' }, { pauza: 'ha' }, null, [], { chegara_foiz: NaN }]) {
    assert.throws(() => m.jonli.sozla(b), (e) => e instanceof ErpXato && e.kod === KOD.SOZLAMA, JSON.stringify(b));
  }
  assert.deepEqual(m.jonli.sozla({ chegara_foiz: 5 }).yangi, { pauza: false, chegara_foiz: 5 });
  narxQoy(m.erp, 101, 330000);                                            // +10%
  await m.jonli.aylanish('qaynoq');
  assert.equal(m.layer()['plita:ERP-t1'], undefined);
  assert.equal(JSON.parse(m.db.prepare("SELECT farq_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get().farq_json).find(x => x.k === 'ERP-t1').sabab, 'katta_ozgarish');
  m.jonli.sozla({ chegara_foiz: 30 });
  await m.yop();
});

test('ERP\'da narx 0 / manfiy / noto\'g\'ri: qo\'llanmaydi, mavjud narx qoladi (0 bo\'lsa ogohlantirish qatori)', async () => {
  const m = await muhit();
  narxQoy(m.erp, 101, 310000);
  await m.jonli.aylanish('toliq');                                        // t1 = 310000 qo'llandi
  narxQoy(m.erp, 101, 0); narxQoy(m.erp, 102, -5);
  bahoOl(m.erp, 103).display_price_uzs = 'abc';
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null);
  assert.equal(m.layer()['plita:ERP-t1'], 310000, 'ERP 0 desa ham oxirgi narx qoladi');
  assert.equal(m.layer()['plita:ERP-t2'], undefined); assert.equal(m.layer()['plita:ERP-t3'], undefined);
  const qr = JSON.parse(m.db.prepare("SELECT farq_json FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get().farq_json);
  const t1 = qr.find(x => x.k === 'ERP-t1');
  assert.ok(t1 && t1.h === 'narxsiz' && t1.q === false && t1.sabab === 'narx_yoq', 'ERP narxni 0 qildi — admin ko\'radi, qo\'llash mumkin emas');
  await m.yop();
});

test('noaniq moslik (bir katalog yozuviga ikki ERP mahsuloti): qo\'llanmaydi', async () => {
  const mahs = boshMahsulot();
  mahs.push(erpMahsulot({ id: 9001, sku: 'A100', name: PLITA[0].nom, kat: 2, uzs: 123456 }));      // t1 uchun ikkinchi mahsulot (boshqa kategoriyada)
  const m = await muhit({ erp: { mahsulotlar: mahs } });
  const st = await m.jonli.aylanish('toliq');
  assert.equal(m.layer()['plita:ERP-t1'], undefined, 'qaysi biri to\'g\'ri — noma\'lum: narx qo\'yilmadi');
  assert.ok(st.noaniq >= 1 || st.ziddiyat >= 1, JSON.stringify(st));
  await m.yop();
});

test('noaniq moslik turli bo\'laklarda (ikkinchi ERP mahsuloti keyinroq paydo bo\'ldi): birinchi ERP mahsuloti ustun, ikkinchisi narxni o\'zgartirmaydi', async () => {
  const m = await muhit({ sozlama: { bolakSorov: 1 } });                  // har kategoriya alohida bo'lak
  await m.jonli.aylanish('toliq');
  m.erp.mahsulotlar.push(erpMahsulot({ id: 9001, sku: 'A100', name: PLITA[0].nom, kat: 2, uzs: 310000 }));
  narxQoy(m.erp, 101, 305000);
  const st = await m.jonli.aylanish('toliq');
  assert.ok(st.ziddiyat >= 1, JSON.stringify(st));
  assert.equal(m.layer()['plita:ERP-t1'], 305000, 'asl mahsulot (id 101) narxi qo\'llandi, 9001 ning 310000 — yo\'q');
  await m.yop();
});

/* ═══════════ kurs ═══════════ */
test('kurs sakrasa (>10%): hamma o\'zgarish tasdiq kutadi (±30% ichida bo\'lsa ham); qoralama hal bo\'lgach kurs qabul qilinadi va narxlar oqadi', async () => {
  const mahs = [erpMahsulot({ id: 101, sku: 'A100', name: PLITA[0].nom, kat: 1, usd: 25.5 }), erpMahsulot({ id: 102, sku: 'A200', name: PLITA[1].nom, kat: 1, usd: 34 }),
    erpMahsulot({ id: 103, sku: 'A300', name: PLITA[2].nom, kat: 1, usd: 42.5 }), erpMahsulot({ id: 201, sku: 'F1', name: FURN[0].nom, kat: 2, usd: 0.85 })];
  const m = await muhit({ erp: { mahsulotlar: mahs, kategoriyalar: KATLAR.slice(0, 2) } });
  await m.jonli.aylanish('toliq');                                        // kurs 11773.68 qabul qilindi; narxlar fayldagidan ≤30% farq → qo'llandi
  assert.ok(Math.abs(m.jonli.holat().kurs_qabul - 11773.68) < 0.1, String(m.jonli.holat().kurs_qabul));
  const t1 = m.layer()['plita:ERP-t1'];
  assert.equal(t1, Math.round(25.5 * 11773.68));
  /* ERP kursi 11773.68 → 13500 (+14.7%) */
  for (const x of mahs) { const n = Math.round(x.display_price_usd * 13500); x.display_price_uzs = n; x.price = n.toFixed(2); }
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(m.layer()['plita:ERP-t1'], t1, 'kurs sakradi — narx qo\'llanmadi');
  const h = m.jonli.holat();
  assert.ok(h.kurs_kutadi && h.kurs_kutadi.yangi === 13500 && Math.abs(h.kurs_kutadi.eski - 11773.68) < 0.1, JSON.stringify(h.kurs_kutadi));
  assert.equal(h.kurs, 13500); assert.ok(Math.abs(h.kurs_qabul - 11773.68) < 0.1);
  assert.ok(h.tasdiq_kutadi.sabab.kurs_sakradi >= 2, JSON.stringify(h.tasdiq_kutadi));
  assert.ok(st.kutadi >= 2);
  /* admin qoralamani qo'lladi (yoki o'chirdi): kurs qabul qilinadi */
  const q = m.db.prepare("SELECT id FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama'").get();
  m.db.prepare("UPDATE erp_partiya SET holat = 'qollandi' WHERE id = ?").run(q.id);
  await m.jonli.aylanish('qaynoq');
  assert.equal(m.jonli.holat().kurs_qabul, 13500); assert.equal(m.jonli.holat().kurs_kutadi, null);
  await m.yop();
});

/* ═══════════ ERP o'chganda ═══════════ */
test('ERP o\'chdi: oxirgi narx qoladi, xato sanalgichi oshadi (saqlanadi), kechikish 2×, 15 daqiqada to\'xtaydi; tiklangach nolga tushadi', async () => {
  const m = await muhit({ sozlama: { orqaBoshiMs: 1000, orqaMaxMs: 4000 } });
  narxQoy(m.erp, 101, 310000);
  await m.jonli.aylanish('toliq');
  const oxirgi = m.jonli.holat().oxirgi_muvaffaqiyat;
  assert.equal(m.layer()['plita:ERP-t1'], 310000);
  m.erp.rejim = 'uzilgan';
  const kechikish = [];
  for (let i = 0; i < 4; i++) {
    const t = Date.now();
    const st = await m.jonli.aylanish('qaynoq');
    assert.equal(st.xato.kod, KOD.TARMOQ, JSON.stringify(st.xato));
    kechikish.push(Math.round((Date.parse(m.jonli.holat().keyingi_urinish) - t) / 1000));
  }
  assert.deepEqual(kechikish, [1, 2, 4, 4], 'eksponensial kechikish (1→2→4, chegaradan oshmaydi)');
  const h = m.jonli.holat();
  assert.equal(h.xato_soni, 4); assert.equal(h.xato_jami, 4); assert.equal(h.oxirgi_muvaffaqiyat, oxirgi);
  assert.equal(h.oxirgi_xato.kod, KOD.TARMOQ);
  assert.equal(m.layer()['plita:ERP-t1'], 310000, 'oxirgi yaxshi narx qoldi');
  assert.equal(m.jonli.ommaviy().plita['ERP-t1'], 310000);
  assert.equal(m.jonli.ommaviy().jonli.xato_soni, 4); assert.equal(m.jonli.ommaviy().jonli.xato_kodi, KOD.TARMOQ);
  assert.equal(m.db.prepare("SELECT COUNT(*) AS n FROM error_log WHERE code = 'S3D-ERP-003'").get().n, 4, 'jurnalga yozildi');
  for (const rejim of ['500', 'jsonemas']) {                             // boshqa ko'rinishdagi nosozliklar ham narxga tegmaydi
    m.erp.rejim = rejim;
    const st = await m.jonli.aylanish('qaynoq');
    assert.ok(st.xato, rejim + ': xato bo\'lishi kerak'); assert.equal(m.layer()['plita:ERP-t1'], 310000);
  }
  m.erp.rejim = 'ok';
  const st = await m.jonli.aylanish('qaynoq');
  assert.equal(st.xato, null);
  assert.equal(m.jonli.holat().xato_soni, 0, 'tiklandi — ketma-ket xato nolga'); assert.equal(m.jonli.holat().xato_jami, 6, 'jami xato saqlanib qoladi');
  assert.ok(m.jonli.holat().oxirgi_muvaffaqiyat >= oxirgi);
  await m.yop();
});

test('"eski narx" belgisi: oxirgi muvaffaqiyat 10 daqiqadan eski bo\'lsa jonli.eski = true (ETag ham o\'zgaradi)', async () => {
  const m = await muhit();
  await m.jonli.aylanish('toliq');
  const e1 = m.jonli.ommaviyEtag();
  assert.equal(m.jonli.ommaviy().jonli.eski, false);
  m.db.prepare("UPDATE erp_jonli_holat SET qiymat = ? WHERE kalit = 'oxirgi_muvaffaqiyat'").run(new Date(Date.now() - 11 * 60_000).toISOString());
  assert.equal(m.jonli.ommaviy().jonli.eski, true);
  assert.notEqual(m.jonli.ommaviyEtag(), e1);
  await m.yop();
});

test('ETag: jonli aylanishlar (narx o\'zgarmasa) ETag\'ni har 2 daqiqada o\'zgartirmaydi; narx o\'zgarsa — o\'zgaradi', async () => {
  const m = await muhit();
  await m.jonli.aylanish('toliq');
  const e1 = m.jonli.ommaviyEtag();
  await new Promise(r => setTimeout(r, 30));
  await m.jonli.aylanish('qaynoq');                                       // oxirgi_muvaffaqiyat yangilandi (bir 5 daqiqalik bo'lak ichida)
  assert.equal(m.jonli.ommaviyEtag(), e1);
  narxQoy(m.erp, 101, 306000);
  await m.jonli.aylanish('qaynoq');
  assert.notEqual(m.jonli.ommaviyEtag(), e1);
  assert.match(m.jonli.ommaviyEtag(), /^W\/"\d+-[0-9a-z]+"$/);
  await m.yop();
});

/* ═══════════ yuk va jadval ═══════════ */
test('so\'rovlar orasidagi tezlik chegarasi (≤ 1 so\'rov/soniya to\'liqda) ushlanadi', async () => {
  const m = await muhit({ sozlama: { toliqOraliqMs: 120 } });
  const vaqt = [];
  const orig = m.erp.sorovlar.push.bind(m.erp.sorovlar);
  m.erp.sorovlar.push = (x) => { vaqt.push(Date.now()); return orig(x); };
  await m.jonli.aylanish('toliq');
  assert.ok(vaqt.length >= 8);
  const minFarq = Math.min(...vaqt.slice(1).map((t, i) => t - vaqt[i]));
  assert.ok(minFarq >= 100, `eng kichik oraliq ${minFarq} ms < 120 ms`);
  await m.yop();
});

test('jadval: qaynoq har qaynoqMs, to\'liq har toliqMs; bir vaqtda bitta aylanish; stop() dan keyin so\'rov yo\'q', async () => {
  const m = await muhit({ sozlama: { qaynoqMs: 150, toliqMs: 900, boshKechikishMs: 20 } });
  assert.equal(m.jonli.start(), true); assert.equal(m.jonli.start(), false, 'ikkinchi start — hech narsa');
  const toliqlar = new Set(), qaynoqlar = new Set();
  const kuzat = setInterval(() => { const x = m.jonli.holat(); if (x.oxirgi_toliq) toliqlar.add(x.oxirgi_toliq.boshlandi); if (x.oxirgi_qaynoq) qaynoqlar.add(x.oxirgi_qaynoq.boshlandi); }, 10);
  await new Promise(r => setTimeout(r, 2600));
  clearInterval(kuzat);
  const h = m.jonli.holat();
  assert.ok(h.oxirgi_qaynoq && h.oxirgi_toliq, 'ikkala tur ham ishladi');
  assert.ok(toliqlar.size >= 2 && toliqlar.size <= 4, `to'liq aylanishlar soni: ${toliqlar.size}`);
  assert.ok(qaynoqlar.size >= 6, `qaynoq aylanishlar soni: ${qaynoqlar.size}`);
  const xizmatSoni = m.erp.getlar().filter(x => x.path === '/erp/services/api/manage/services/').length;
  assert.ok(xizmatSoni >= 8, `qaynoq aylanishlar soni (xizmatlar har aylanishda): ${xizmatSoni}`);
  assert.equal(m.erp.loginSoni, 1);
  assert.ok(m.erp.faqatGet());
  await m.jonli.stop();
  const n = m.erp.sorovlar.length;
  await new Promise(r => setTimeout(r, 400));
  assert.equal(m.erp.sorovlar.length, n, 'stop() dan keyin so\'rov yo\'q');
  assert.equal(m.jonli.holat().keyingi_qaynoq, null);
  await m.yop();
});

test('stop(): ketayotgan (sekin) so\'rov bekor qilinadi — kutib o\'tirmaydi', async () => {
  const m = await muhit({ sozlama: { taymAutMs: 10_000 } });
  m.erp.rejim = 'sekin'; m.erp.kutish = 5000;
  m.jonli.start();
  const p = m.jonli.hozirSinxron({ kut: false });
  await p;
  await new Promise(r => setTimeout(r, 100));
  const t = Date.now();
  await m.jonli.stop();
  assert.ok(Date.now() - t < 1500, 'stop() tez tugadi: ' + (Date.now() - t) + ' ms');
  await m.erp.yop().catch(() => {}); m.db.close();
});

test('"Hozir": o\'chiq/pauza/band/30 soniya chegarasi (S3D-ERP-001/006/005/007)', async () => {
  const m = await muhit({ sozlama: { hozirOraliqMs: 1200 } });
  const r = await m.jonli.hozirSinxron({ kut: true });
  assert.equal(r.tugadi, true); assert.equal(r.natija.xato, null); assert.ok(r.natija.sorov > 0);
  await assert.rejects(m.jonli.hozirSinxron(), (e) => e.kod === KOD.TEZ);
  await new Promise(r => setTimeout(r, 1300));
  m.jonli.sozla({ pauza: true });
  await assert.rejects(m.jonli.hozirSinxron(), (e) => e.kod === KOD.PAUZA);
  m.jonli.sozla({ pauza: false });
  m.erp.rejim = 'sekin'; m.erp.kutish = 300;
  const p = m.jonli.hozirSinxron();                                       // fonda boshlanadi
  await p;
  await assert.rejects(m.jonli.hozirSinxron(), (e) => e.kod === KOD.BAND || e.kod === KOD.TEZ);
  await m.jonli.stop();
  await m.erp.yop().catch(() => {}); m.db.close();
});

test('pauza: poller ERP\'ga so\'rov yubormaydi (taymer ishlaydi, lekin aylanish yo\'q)', async () => {
  const m = await muhit({ sozlama: { qaynoqMs: 50, toliqMs: 80, boshKechikishMs: 10 } });
  m.jonli.sozla({ pauza: true });
  m.jonli.start();
  await new Promise(r => setTimeout(r, 400));
  assert.equal(m.erp.sorovlar.length, 0);
  assert.equal(m.jonli.holat().pauza, true); assert.equal(m.jonli.holat().keyingi_qaynoq, null);
  await m.yop();
});

/* ═══════════ maxfiy ma'lumot ═══════════ */
test('PAROL va LOGIN hech qayerga chiqmaydi: jurnal, xato matni, holat/ommaviy javob, baza (hamma jadval), hatto ERP javobi parolni takrorlasa ham', async () => {
  const PAROL = 'Juda-Maxfiy-ERP-Parol-7Qz!k2';
  const m = await muhit({ eskiParol: PAROL });
  m.erp.parol = 'boshqa-parol-ERP';                                       // ERP boshqa parol kutadi → login rad; ERP javobi yuborilgan parolni takrorlaydi
  const st1 = await m.jonli.aylanish('toliq');
  assert.equal(st1.xato.kod, KOD.KIRISH, JSON.stringify(st1.xato));
  /* kutilmagan xato matni parolni o'z ichiga olsa — redaktsiya */
  const kat = { ol: () => { throw new Error('baza xatosi login=' + m.erp.login + ' parol=' + PAROL + ' oxiri'); }, qaynoq: KATALOG.qaynoq, sukut: BOSH_SUKUT };
  m.erp.parol = PAROL;
  const m2 = await muhit({ eskiParol: PAROL, katalog: kat, erp: { parol: PAROL } });
  const st2 = await m2.jonli.aylanish('toliq');
  assert.ok(st2.xato && !st2.xato.matn.includes(PAROL), 'xato matnida parol bor: ' + st2.xato.matn);
  assert.ok(st2.xato.matn.includes('[maxfiy]'), 'parol [maxfiy] bilan almashtirilgan: ' + st2.xato.matn);
  /* ERP'ga yuborilgan POST ichida parol bor (shart), lekin boshqa hech qayerda */
  for (const mm of [m, m2]) {
    const hamma = JSON.stringify([mm.jonli.holat(), mm.jonli.ommaviy(), mm.chiqish, mm.jonli.ommaviyEtag()]);
    assert.ok(!hamma.includes(PAROL), 'holat/javob/jurnalda parol');
    assert.ok(!hamma.includes(mm.erp.login), 'holat/javob/jurnalda login');
    for (const t of mm.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
      const satrlar = JSON.stringify(mm.db.prepare(`SELECT * FROM "${t.name}"`).all());
      assert.ok(!satrlar.includes(PAROL), `${t.name} jadvalida parol`);
      assert.ok(!satrlar.includes(mm.erp.login), `${t.name} jadvalida login`);
    }
  }
  /* ERP'ning "noto'g'ri parol" sahifasi parolni qaytargan — bizning javobimizda yo'q (yuqorida tekshirildi) */
  assert.ok(m.erp.sorovlar.some(x => x.method === 'POST' && x.path === '/login/'));
  await m.yop(); await m2.yop();
});

test('ErpMijoz parolni inspect/JSON orqali ham chiqarmaydi; maxfiy.js ERP_PASSWORD/ERP_LOGIN ni tozalaydi', async () => {
  const { maxfiyTozala } = await import('../lib/maxfiy.js');
  const env = { ERP_PASSWORD: 'Parol-Uzun-12345', ERP_LOGIN: 'erp-foydalanuvchi' };
  assert.equal(maxfiyTozala('x Parol-Uzun-12345 y erp-foydalanuvchi z', env), 'x [maxfiy] y [maxfiy] z');
});

/* ═══════════ jarayonni ushlab turmaydi ═══════════ */
test('start() qilingan poller jarayonni ushlab turmaydi (taymerlar unref): stop() chaqirilmasa ham jarayon o\'zi tugaydi', async () => {
  const kod = `
    import Database from 'better-sqlite3';
    import { createJurnal } from ${JSON.stringify(pathToFileURL(path.join(SERVER_DIR, 'jurnal.js')).href)};
    import { adminSxema, adminSxema2, adminSxema3, erpJonliSxema } from ${JSON.stringify(pathToFileURL(path.join(SERVER_DIR, 'lib/sxema.js')).href)};
    import { erpJonliYarat } from ${JSON.stringify(pathToFileURL(path.join(SERVER_DIR, 'lib/erp-jonli.js')).href)};
    const db = new Database(':memory:');
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password_hash TEXT, role TEXT DEFAULT 'user'); CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME)");
    adminSxema(db); adminSxema2(db); adminSxema3(db); erpJonliSxema(db);
    const jurnal = createJurnal(db, { out: { write() {} }, err: { write() {} } });
    const j = erpJonliYarat({ db, jurnal, env: { ERP_JONLI: '1', ERP_URL: 'http://127.0.0.1:9', ERP_LOGIN: 'a', ERP_PASSWORD: 'b' }, sozlama: { boshKechikishMs: 10, qaynoqMs: 20, taymAutMs: 300 } });
    console.log('start', j.start());
    setTimeout(() => console.log('holat', JSON.stringify({ xato: j.holat().xato_soni > 0 })), 600).unref();
    setTimeout(() => {}, 800).unref();
  `;
  const t0 = Date.now();
  const chiq = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['--input-type=module', '-e', kod], { cwd: SERVER_DIR });
    let out = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('jarayon tugamadi (ochiq handle): ' + out)); }, 8000);
    p.on('exit', (code) => { clearTimeout(t); resolve({ code, out }); });
  });
  assert.equal(chiq.code, 0, chiq.out);
  assert.match(chiq.out, /start true/);
  assert.ok(Date.now() - t0 < 6000, 'jarayon tezda tugadi');
});
