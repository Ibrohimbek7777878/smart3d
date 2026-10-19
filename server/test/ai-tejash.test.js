/* Smart3D server — TZ-40: AI token tejash. HAQIQIY Claude chaqirilmaydi: Claude o'rniga sanaydigan soxta (mock) ishlatiladi.
 * Tekshiriladi: tayyor prompt = 0 chaqiruv; kesh urilishi; qoidali tahlilchi; byudjet/kunlik chegara tugaganda qoidaga o'tish; sarf yozilishi;
 * admin tahrirlasa tuzilma bir marta hosil bo'lishi va tasdiqlanishi. Xotiradagi bazada (asl bazaga tegmaydi). */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { adminSxema, aiSxema, promptlarSeed } from '../lib/sxema.js';
import { aiTejash, normMatn, qoidaTahlil, specHosilQil, specYaroqli, TAHLIL_V, bugun } from '../lib/ai-tejash.js';

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../app');
const UZUN = (t) => t + ' — ' + 'qo\'shimcha izoh, '.repeat(15) + 'oxiri';   // 240 belgidan uzun — "murakkab", Claude'ga boradi

let db, calls, tejash, vaqt, javob;
const SARF = { kirish: 300, chiqish: 100, kesh_yozildi: 0, kesh_oqildi: 0 };
const PARSED = { room: { w: 3600, d: 3000, h: 2700, layoutType: 'linear', openings: [], features: {}, outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]] }, orders: [{ kind: 'pastki', qty: 3 }], unknown: [] };
const KONS = { spec: specHosilQil('shkaf 1200x600x2200, 2 eshik').kons.spec, tuzatish: [], tushunilmadi: [] };

function yarat({ yoqilgan = true } = {}) {
  db = new Database(':memory:');
  db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, org_id TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  adminSxema(db); aiSxema(db);
  calls = { parse: 0, konstruksiya: 0, opts: [] };
  vaqt = Date.UTC(2026, 9, 19, 6, 0, 0);
  javob = { sarf: SARF };
  const claude = {
    parse: async (_t, o) => { calls.opts.push(o); calls.parse++; if (javob.xato) throw Object.assign(new Error(javob.xato), { sarf: { kirish: 50, chiqish: 0 } }); return { parsed: PARSED, engine: 'anthropic:claude-sonnet-5-5', sarf: javob.sarf }; },
    konstruksiya: async () => { calls.konstruksiya++; if (javob.xato) throw new Error(javob.xato); return { natija: KONS, engine: 'anthropic:claude-sonnet-5-5', sarf: javob.sarf }; }
  };
  tejash = aiTejash({ db, claude, yoqilgan: () => yoqilgan, model: () => 'claude-sonnet-5-5', now: () => vaqt });
}
const jami = () => calls.parse + calls.konstruksiya;
const sarflar = (manba) => db.prepare('SELECT * FROM ai_sarf WHERE manba = ? ORDER BY id').all(manba);
const env = (o) => { const eski = {}; for (const k of Object.keys(o)) { eski[k] = process.env[k]; if (o[k] == null) delete process.env[k]; else process.env[k] = o[k]; } return () => { for (const k of Object.keys(eski)) { if (eski[k] === undefined) delete process.env[k]; else process.env[k] = eski[k]; } }; };

beforeEach(() => yarat());

test('normMatn: katta-kichik harf, tinish belgilari, apostrof, bo\'shliq farqi yo\'q; raqamdagi nuqta/vergul bir xil', () => {
  assert.equal(normMatn("  OSHXONA  3 metr, To'g'ri! "), normMatn('oshxona 3 metr togri'));
  assert.equal(normMatn('kuxnya 3,6 x 3'), normMatn('Kuxnya 3.6 x 3.'));
  assert.notEqual(normMatn('oshxona 3x4'), normMatn('oshxona 3x5'));
  assert.equal(normMatn(null), '');
});

test('boshlang\'ich to\'plam: 44 prompt uchun tuzilma bepul hosil bo\'ladi, yaroqli, qayta ishga tushirish zararsiz', () => {
  assert.equal(promptlarSeed(db, APP_DIR), 44);
  assert.equal(tejash.royxatToldir(), 44);
  assert.equal(tejash.royxatToldir(), 0, 'ikkinchi marta — hech narsa o\'zgarmaydi');
  assert.equal(jami(), 0, 'tuzilma hosil qilishda Claude chaqirilmadi');
  for (const p of db.prepare('SELECT * FROM promptlar_admin').all()) {
    assert.equal(p.spec_manba, 'qoida'); assert.equal(p.spec_versiya, TAHLIL_V); assert.ok(p.spec_sana);
    assert.ok(specYaroqli(JSON.parse(p.spec_json)), p.id + ' tuzilmasi yaroqsiz');
    /* qoidalar o'zgarsa saqlangan tuzilma eskiradi — shu sinov uni tutadi (TAHLIL_V ni oshiring) */
    assert.deepEqual(JSON.parse(p.spec_json), JSON.parse(JSON.stringify(specHosilQil(p.matn_uz))), p.id + ' tuzilmasi qoidalardan farq qiladi');
  }
});

test('tayyor prompt = 0 chaqiruv (parse va konstruksiya), sarf "tayyor" yoziladi', async () => {
  promptlarSeed(db, APP_DIR); tejash.royxatToldir();
  const hammasi = db.prepare('SELECT id, matn_uz FROM promptlar_admin').all();
  for (const p of hammasi) {
    const a = await tejash.yech({ yol: 'parse', text: p.matn_uz, userId: 1 });
    assert.equal(a.manba, 'tayyor', p.id); assert.ok(a.natija.room && Array.isArray(a.natija.orders));
    if (qoidaTahlil(p.matn_uz).kons) {
      const b = await tejash.yech({ yol: 'konstruksiya', text: p.matn_uz, userId: 1 });
      assert.equal(b.manba, 'tayyor', p.id); assert.ok(b.natija.spec);
    }
  }
  assert.equal(jami(), 0, 'Claude bir marta ham chaqirilmadi');
  assert.ok(sarflar('tayyor').length >= 44);
  assert.equal(sarflar('claude').length, 0);
  /* normallashtirilgan matn (katta harf, tinish) ham mos */
  const x = await tejash.yech({ yol: 'parse', text: "  OSHXONA 3 metr, TO'G'RI. ", userId: 1 });
  assert.equal(x.manba, 'tayyor'); assert.equal(jami(), 0);
});

test('qoidali tahlilchi tushunsa Claude chaqirilmaydi (manba: qoida), natija keshga yozilmaydi', async () => {
  const a = await tejash.yech({ yol: 'parse', text: '4.2 ga 3.1 oshxona, moyka, 3 ta pastki', userId: 1 });
  assert.equal(a.manba, 'qoida'); assert.equal(a.natija.room.w, 4200);
  const b = await tejash.yech({ yol: 'konstruksiya', text: 'shkaf 1200, 2 eshik', userId: 1 });
  assert.equal(b.manba, 'qoida'); assert.ok(b.natija.spec);
  assert.equal(jami(), 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ai_kesh').get().n, 0);
  assert.equal(sarflar('qoida').length, 2);
});

test('qoldiq (tushunilmagan qism) yoki murakkab matn — Claude bir marta; takror — kesh (30 kun), muddati o\'tsa — yana Claude', async () => {
  const t = 'shkaf h 2400';                                         // "h 2400" — tushunilmadi (unknown)
  const a = await tejash.yech({ yol: 'parse', text: t, userId: 1 });
  assert.equal(a.manba, 'claude'); assert.equal(calls.parse, 1); assert.equal(a.natija.room.w, 3600);
  const b = await tejash.yech({ yol: 'parse', text: ' SHKAF  H 2400! ', userId: 2 });   // boshqa foydalanuvchi, boshqacha yozilgan
  assert.equal(b.manba, 'kesh'); assert.equal(calls.parse, 1, 'kesh urildi — yangi chaqiruv yo\'q');
  assert.equal(db.prepare('SELECT urilgan FROM ai_kesh').get().urilgan, 1);
  assert.equal(sarflar('kesh')[0].tejaldi, 400, 'tejalgan token — asl chaqiruv tokeni');
  const u = await tejash.yech({ yol: 'konstruksiya', text: UZUN('shkaf 1200'), userId: 1 });   // murakkab matn
  assert.equal(u.manba, 'claude'); assert.equal(calls.konstruksiya, 1);
  /* kalit: yo'l alohida — parse keshi konstruksiyaga tegmaydi */
  assert.equal((await tejash.yech({ yol: 'konstruksiya', text: t, userId: 1 })).manba === 'kesh', false);
  /* 30 kundan keyin kesh eskirgan */
  vaqt += 31 * 86400 * 1000;
  assert.equal((await tejash.yech({ yol: 'parse', text: t, userId: 1 })).manba, 'claude');
  assert.equal(tejash.keshTozala() >= 1, true);
});

test('kesh kaliti model va ko\'rsatma versiyasiga bog\'liq: boshqa model — kesh urilmaydi', async () => {
  const t = 'shkaf h 2400';
  await tejash.yech({ yol: 'parse', text: t, userId: 1 });
  const ikkinchi = aiTejash({ db, claude: { parse: async () => { calls.parse++; return { parsed: PARSED, engine: 'x', sarf: SARF }; }, konstruksiya: async () => ({}) },
    yoqilgan: () => true, model: () => 'claude-haiku-5-5', now: () => vaqt });
  assert.equal((await ikkinchi.yech({ yol: 'parse', text: t, userId: 1 })).manba, 'claude');
  assert.equal(calls.parse, 2);
});

test('oylik byudjet tugasa — Claude chaqirilmaydi, qoidali natija va S3D-AI-004 (sayt to\'xtamaydi)', async () => {
  const qayt = env({ AI_OYLIK_TOKEN: '500' });
  try {
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 })).manba, 'claude');   // 400 token ishlatildi
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2500', userId: 1 })).manba, 'claude');   // 800 >= 500
    assert.equal(calls.parse, 2);
    const c = await tejash.yech({ yol: 'parse', text: 'shkaf h 2600', userId: 1 });
    assert.equal(c.manba, 'qoida'); assert.equal(c.ogohlantirish, 'S3D-AI-004'); assert.ok(c.natija.room && Array.isArray(c.natija.orders));
    assert.equal(calls.parse, 2, 'byudjet tugagach chaqiruv yo\'q');
    const k = await tejash.yech({ yol: 'konstruksiya', text: UZUN('shkaf 1200'), userId: 1 });
    assert.equal(k.manba, 'qoida'); assert.equal(k.ogohlantirish, 'S3D-AI-004'); assert.ok(k.natija.spec);
    /* keshdagi natija byudjet tugasa ham beriladi (0 token) */
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 })).manba, 'kesh');
    /* keyingi oy — byudjet yangidan */
    vaqt = Date.UTC(2026, 10, 2, 6, 0, 0);
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2700', userId: 1 })).manba, 'claude');
    const st = tejash.statistika();
    assert.equal(st.byudjet.chegara, 500);
  } finally { qayt(); }
});

test('AI_OYLIK_TOKEN=0 — Claude butunlay o\'chiq: hamma narsa qoidaga o\'tadi', async () => {
  const qayt = env({ AI_OYLIK_TOKEN: '0' });
  try {
    const a = await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 });
    assert.equal(a.manba, 'qoida'); assert.equal(a.ogohlantirish, 'S3D-AI-004'); assert.equal(jami(), 0);
  } finally { qayt(); }
});

test('foydalanuvchi kunlik chegarasi: oshsa — qoidaga o\'tadi (S3D-AI-005), boshqa foydalanuvchi va ertasi kun — ishlaydi; admin cheklanmaydi', async () => {
  const qayt = env({ AI_KUNLIK_SOROV: '2', AI_OYLIK_TOKEN: '1000000' });
  try {
    for (const t of ['shkaf h 2401', 'shkaf h 2402']) assert.equal((await tejash.yech({ yol: 'parse', text: t, userId: 7 })).manba, 'claude');
    const c = await tejash.yech({ yol: 'parse', text: 'shkaf h 2403', userId: 7 });
    assert.equal(c.manba, 'qoida'); assert.equal(c.ogohlantirish, 'S3D-AI-005'); assert.equal(calls.parse, 2);
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2403', userId: 8 })).manba, 'claude', 'boshqa foydalanuvchi');
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2404', userId: 7, admin: true })).manba, 'claude', 'admin');
    vaqt += 86400 * 1000;
    assert.equal((await tejash.yech({ yol: 'parse', text: 'shkaf h 2405', userId: 7 })).manba, 'claude', 'ertasi kun');
  } finally { qayt(); }
});

test('sarf yozilishi: token, manba, foydalanuvchi, sana; Claude xatosida ham ketgan token yoziladi va xato qaytadi', async () => {
  javob.sarf = { kirish: 500, chiqish: 120, kesh_yozildi: 1200, kesh_oqildi: 0 };
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 5 });
  const r = sarflar('claude')[0];
  assert.deepEqual([r.user_id, r.yol, r.model, r.kirish, r.chiqish, r.kesh_yozildi, r.kesh_oqildi, r.ok, r.sana], [5, 'parse', 'claude-sonnet-5-5', 500, 120, 1200, 0, 1, '2026-10-19']);
  javob.xato = 'AI javobi to\'liq emas';
  await assert.rejects(() => tejash.yech({ yol: 'parse', text: 'shkaf h 2500', userId: 5 }), /to'liq emas/);
  const x = sarflar('claude')[1];
  assert.deepEqual([x.ok, x.kirish, x.sabab], [0, 50, "AI javobi to'liq emas"]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ai_kesh').get().n, 1, 'xato natija keshga yozilmaydi');
  assert.equal(bugun(Date.UTC(2026, 9, 19, 20, 0, 0)), '2026-10-20', 'kun Toshkent vaqti (UTC+5) bo\'yicha');
});

test('admin yangi prompt qo\'shsa: tuzilma bir marta (qoida); qoldiq bo\'lsa — Claude bir marta, tasdiqlanmaguncha ishlatilmaydi; tahrirlansa — qayta', async () => {
  const qosh = (id, matn) => db.prepare("INSERT INTO promptlar_admin (id, kat, nom_uz, matn_uz) VALUES (?, 'oshxona', 'N', ?)").run(id, matn);
  /* 1) qoida tushunadigan matn — Claude yo'q */
  qosh('yangi-1', 'oshxona 4x3 orol bilan');
  let s = await tejash.promptSpec('yangi-1');
  assert.deepEqual([s.manba, s.yangilandi], ['qoida', true]); assert.equal(jami(), 0);
  assert.equal((await tejash.yech({ yol: 'parse', text: 'oshxona 4x3 orol bilan', userId: 1 })).manba, 'tayyor');
  assert.equal((await tejash.promptSpec('yangi-1')).yangilandi, false, 'matn o\'zgarmagan — qayta hosil qilinmaydi');
  /* 2) murakkab matn — Claude bir marta */
  const uzun = UZUN('shkaf 1200');
  qosh('yangi-2', uzun);
  s = await tejash.promptSpec('yangi-2', { userId: 9 });
  assert.equal(s.manba, 'claude'); assert.equal(calls.konstruksiya, 1);
  assert.equal(db.prepare("SELECT spec_tasdiq FROM promptlar_admin WHERE id = 'yangi-2'").get().spec_tasdiq, 0);
  assert.equal((await tejash.yech({ yol: 'konstruksiya', text: uzun, userId: 1 })).manba, 'claude', 'tasdiqlanmagan Claude tuzilmasi — foydalanuvchiga berilmaydi');
  assert.equal(calls.konstruksiya, 2);
  assert.equal(tejash.tasdiqla('yangi-2'), true);
  const t = await tejash.yech({ yol: 'konstruksiya', text: uzun, userId: 1 });
  assert.equal(t.manba, 'tayyor'); assert.equal(calls.konstruksiya, 2, 'tasdiqdan keyin — 0 chaqiruv');
  /* 3) matn tahrirlansa — eski tuzilma ishlatilmaydi, qayta hosil qilinadi */
  db.prepare("UPDATE promptlar_admin SET matn_uz = ? WHERE id = 'yangi-1'").run('oshxona 5x3 orol bilan');
  assert.notEqual((await tejash.yech({ yol: 'parse', text: 'oshxona 5x3 orol bilan', userId: 1 })).manba, 'tayyor', 'tuzilma eski — tayyor emas');
  s = await tejash.promptSpec('yangi-1');
  assert.equal(s.yangilandi, true);
  assert.equal((await tejash.yech({ yol: 'parse', text: 'oshxona 5x3 orol bilan', userId: 1 })).manba, 'tayyor');
  /* faol=0 — ishlatilmaydi */
  db.prepare("UPDATE promptlar_admin SET faol = 0 WHERE id = 'yangi-1'").run();
  assert.notEqual((await tejash.yech({ yol: 'parse', text: 'oshxona 5x3 orol bilan', userId: 1 })).manba, 'tayyor');
});

test('admin tuzilmasi: AI o\'chiq yoki byudjet tugagan bo\'lsa — qoidali tuzilma saqlanadi (xato bermaydi); AI xatosi — S3D-AI-006, qoida saqlanadi', async () => {
  yarat({ yoqilgan: false });
  db.prepare("INSERT INTO promptlar_admin (id, kat, nom_uz, matn_uz) VALUES ('a1', 'ofis', 'N', ?)").run(UZUN('stol 1400x700'));
  let s = await tejash.promptSpec('a1');
  assert.equal(s.manba, 'qoida'); assert.equal(jami(), 0);
  yarat();
  db.prepare("INSERT INTO promptlar_admin (id, kat, nom_uz, matn_uz) VALUES ('a2', 'ofis', 'N', ?)").run(UZUN('stol 1400x700'));
  javob.xato = 'AI HTTP 500';
  s = await tejash.promptSpec('a2');
  assert.deepEqual([s.manba, s.ogohlantirish], ['qoida', 'S3D-AI-006']);
  assert.ok(specYaroqli(JSON.parse(db.prepare("SELECT spec_json FROM promptlar_admin WHERE id = 'a2'").get().spec_json)));
  const qayt = env({ AI_OYLIK_TOKEN: '0' });
  try {
    db.prepare("INSERT INTO promptlar_admin (id, kat, nom_uz, matn_uz) VALUES ('a3', 'ofis', 'N', ?)").run(UZUN('stol 1500x700'));
    s = await tejash.promptSpec('a3');
    assert.deepEqual([s.manba, s.ogohlantirish], ['qoida', 'S3D-AI-004']);
  } finally { qayt(); }
});

test('specYaroqli: buzilgan tuzilmani rad etadi', () => {
  const t = specHosilQil('shkaf 1200x600x2200, 2 eshik');
  assert.ok(specYaroqli(t));
  assert.equal(specYaroqli({ ...t, v: 0 }), false);
  assert.equal(specYaroqli({ ...t, parse: null }), false);
  assert.equal(specYaroqli({ ...t, kons: { spec: 5 } }), false);
  assert.equal(specYaroqli(null), false);
});

test('statistika: bugun/oy so\'rovlar, token, tayyor+kesh ulushi, byudjet qoldig\'i, prompt tuzilmalari', async () => {
  promptlarSeed(db, APP_DIR); tejash.royxatToldir();
  await tejash.yech({ yol: 'parse', text: 'oshxona 3 metr to\'g\'ri', userId: 1 });            // tayyor
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 });                         // claude
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 });                         // kesh
  await tejash.yech({ yol: 'parse', text: '4.2 ga 3.1 oshxona, moyka, 3 ta pastki', userId: 1 }); // qoida
  const st = tejash.statistika();
  assert.equal(st.sana, '2026-10-19');
  assert.deepEqual([st.bugun.jami, st.bugun.tayyor, st.bugun.claude, st.bugun.kesh, st.bugun.qoida], [4, 1, 1, 1, 1]);
  assert.equal(st.bugun.tayyor_kesh_foiz, 50);
  assert.equal(st.bugun.token, 400); assert.equal(st.oy_jami.jami, 4);
  assert.equal(st.byudjet.ishlatilgan, 400); assert.equal(st.byudjet.qoldiq, st.byudjet.chegara - 400);
  assert.equal(st.promptlar.tuzilmali, 44); assert.equal(st.kesh.yozuv, 1);
  assert.equal(st.oy_jami.tejaldi, 400);
});

test('migratsiya: eski promptlar_admin (spec ustunlarisiz) ma\'lumoti saqlanadi, aiSxema ikki marta ishga tushsa ham zararsiz', () => {
  const d = new Database(':memory:');
  d.exec(`CREATE TABLE promptlar_admin (id TEXT PRIMARY KEY, kat TEXT NOT NULL DEFAULT '', nom_uz TEXT NOT NULL DEFAULT '', nom_ru TEXT NOT NULL DEFAULT '', nom_en TEXT NOT NULL DEFAULT '',
    matn_uz TEXT NOT NULL DEFAULT '', matn_ru TEXT NOT NULL DEFAULT '', matn_en TEXT NOT NULL DEFAULT '', tartib INTEGER NOT NULL DEFAULT 0, faol INTEGER NOT NULL DEFAULT 1, updated_by INTEGER, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO promptlar_admin (id, kat, nom_uz, matn_uz, tartib) VALUES ('eski-1', 'oshxona', 'Eski', 'oshxona 3 metr to''g''ri', 7);`);
  aiSxema(d); aiSxema(d);
  const r = d.prepare('SELECT * FROM promptlar_admin').get();
  assert.deepEqual([r.id, r.nom_uz, r.matn_uz, r.tartib, r.spec_json, r.spec_versiya, r.spec_tasdiq], ['eski-1', 'Eski', "oshxona 3 metr to'g'ri", 7, '', 0, 0]);
  assert.deepEqual(d.prepare("SELECT name FROM sqlite_master WHERE name IN ('ai_kesh', 'ai_sarf') ORDER BY name").all().map(x => x.name), ['ai_kesh', 'ai_sarf']);
});

test('prompt caching (auto): kesh yozish faqat yaqinda (5 daqiqa) chaqiruv bo\'lsa yoki soatiga >= 3 chaqiruv bo\'lsa — aks holda yozish narxi ortiqcha', async () => {
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 });
  assert.equal(calls.opts[0].kesh, false, 'birinchi chaqiruv — oldin chaqiruv yo\'q');
  vaqt += 2 * 60 * 1000;
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2401', userId: 1 });
  assert.equal(calls.opts[1].kesh, true, '2 daqiqa oldin chaqiruv bo\'lgan — kesh tirik');
  vaqt += 10 * 60 * 1000;
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2402', userId: 1 });
  assert.equal(calls.opts[2].kesh, false, '12 daqiqa oldin chaqiruv — kesh o\'lgan, soatiga 2 ta — yozish foydasiz');
  vaqt += 10 * 60 * 1000;
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2403', userId: 1 });
  assert.equal(calls.opts[3].kesh, true, 'soatiga 3 ta chaqiruv — doimiy yuk');
  yarat();
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2400', userId: 1 });
  vaqt += 30 * 60 * 1000;
  await tejash.yech({ yol: 'parse', text: 'shkaf h 2401', userId: 1 });
  assert.equal(calls.opts[1].kesh, false, 'chaqiruvlar orasi 30 daqiqa — kesh o\'lgan, yozish foydasiz');
});
