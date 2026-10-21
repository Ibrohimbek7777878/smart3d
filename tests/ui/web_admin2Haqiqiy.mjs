/* TZ-37 (2-faza): admin panel — Materiallar, Modullar katalogi, Foydalanuvchilar — HAQIQIY serverda (soxta API'siz).
 *   1) admin kiradi; 9 bo'lim tabi; Materiallar: 100 dekor, qidiruv; rang (noto'g'ri — so'rov ketmaydi; to'g'ri — saqlanadi), rasm yuklash (PNG),
 *      varaq narxi; "Fayldagiga qaytarish" (tasdiq bilan);
 *   2) Katalog: yashirish tugmasi (ochiq GET /api/katalog), nom va o'lcham chegarasi, narx rejimi; fayldagiga qaytarish;
 *   3) Foydalanuvchilar: 3 tab, qidirish, telefon +998 XX XXX XX XX ko'rinishida, tafsilot (loyiha va buyurtma), bloklash (sabab bilan);
 *      bloklangan foydalanuvchi kirish oynasida "Akkaunt bloklangan" xabarini ko'radi; ochish → kiradi;
 *   4) ILOVADA ta'sir (sahifa qayta ochilganda): Asosiy 100 rangi, varaq narxi, modul nomi/chegarasi, yashirilgan modul tanlash ro'yxatida yo'q,
 *      lekin katalogda (hisob-kitob uchun) bor; 5) uch til (uz/ru/en) va 390 px da gorizontal skroll yo'q.
 * Ishlatish: bash tests/ui/web.sh admin2Haqiqiy */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/admin2Haqiqiy-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const orgn = () => new URL(page.url()).origin;
  const kut = async (sel, ms = 8000) => { try { await page.locator(sel).first().waitFor({ timeout: ms }); return true; } catch (_) { return false; } };
  const matn = () => M(() => document.body.innerText);
  const skroll0 = () => M(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const tasdiq = (nom) => page.locator('[role=dialog]:not([data-varaq])').getByRole('button', { name: nom });   // tasdiq oynasi (varaq emas)
  const sorovlar = [];
  page.on('request', q => { if (q.method() !== 'GET' && /\/api\/admin\//.test(q.url())) sorovlar.push({ m: q.method(), p: new URL(q.url()).pathname, body: q.postData() }); });
  const oxirgi = (m, re) => sorovlar.filter(c => c.m === m && re.test(c.p)).pop();
  const jsonOl = (yol) => M((yol) => fetch(yol, { cache: 'no-store' }).then(r => r.json()), yol);

  /* ── tayyorgarlik: oddiy foydalanuvchi (Node tomondan, brauzer cookie'siga tegmaydi): loyiha va buyurtma bilan ── */
  const tel9 = '90' + String(Date.now()).slice(-7), tel = '998' + tel9;
  const email = 'blok' + Date.now() + '@test.uz', parol = 'parol12345';
  const post = (yol, body, token) => fetch(orgn() + yol, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, j: await r.json().catch(() => null) }));
  const reg = await post('/api/register', { email, password: parol, name: 'Blok Sinov', phone: tel });
  const token = reg.j && reg.j.token, uid = reg.j && reg.j.user && reg.j.user.id;
  const doc = { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708 }] };
  await post('/api/projects', { name: 'Sinov loyiha', client: 'Mijoz Aliyev', doc, total_price: 1234567 }, token);
  await post('/api/orders', { client_name: 'Aliyev', client_phone: '+998 90 777 66 55', project_name: 'Sinov loyiha', total_price: 1234567, doc }, token);
  R.tayyor = reg.status === 200 && !!token && !!uid;
  const kutilganTel = '+998 ' + tel9.slice(0, 2) + ' ' + tel9.slice(2, 5) + ' ' + tel9.slice(5, 7) + ' ' + tel9.slice(7, 9);

  /* ── admin kiradi ── */
  await page.setViewportSize({ width: 1440, height: 900 });
  const adminKirish = async () => {
    await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
    await page.context().clearCookies();
    await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
    await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
    await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  };
  await adminKirish();
  await page.goto(orgn() + '/admin'); await kut('[data-admin-tab]');
  R.tablar = await page.locator('[data-admin-tab]').count();
  R.yangiTablar = (await Promise.all(['materiallar', 'katalog', 'foydalanuvchilar'].map(b => page.locator(`[data-admin-tab="${b}"]`).count()))).every(n => n === 1);

  /* ═══ 1) MATERIALLAR ═══ */
  await page.locator('[data-admin-tab="materiallar"]').click(); await kut('[data-mat-qator]');
  R.matYol = await M(() => location.pathname);
  R.matSoni = await page.locator('[data-mat-qator]').count();
  await page.screenshot({ path: `${OUT}/admin2-materiallar-1440.png` });
  await page.locator('[data-mat="qidir"]').fill('гладкий'); await page.waitForTimeout(300);
  R.matQidiruv = (await page.locator('[data-mat-qator]').count()) >= 1 && (await page.locator('[data-mat-qator]').count()) < 100;
  await page.locator('[data-mat="qidir"]').fill('');
  const KALIT = 'белый гладкий';
  await page.locator(`[data-mat-tahrir="${KALIT}"]`).click(); await kut('[data-varaq="admin-mat"]');
  R.matVaraq = await kut('[data-mat-f="rang"]');
  const fayldagiRang = await page.locator('[data-mat-f="rang"]').inputValue();
  await page.locator('[data-mat-f="rang"]').fill('qizil'); await page.locator('[data-mat-f="rang-saqla"]').click(); await page.waitForTimeout(500);
  R.rangXatoSorovYoq = !oxirgi('PUT', /materiallar\/dekor\//);                       // brauzer o'zi tekshiradi — so'rov ketmaydi
  R.rangXatoXabar = /#rrggbb/.test(await matn());
  await page.locator('[data-mat-f="rang"]').fill('#10ab20'); await page.locator('[data-mat-f="rang-saqla"]').click(); await page.waitForTimeout(900);
  const rp = oxirgi('PUT', /materiallar\/dekor\/[^/]+$/);
  R.rangPut = !!rp && JSON.parse(rp.body).rang_hex === '#10ab20' && decodeURIComponent(rp.p).endsWith('/' + KALIT);
  R.rangQaytTugma = await kut('[data-mat-f="rang-qayt"]');
  R.rangOchiqGet = (await jsonOl('/api/materiallar')).dekor[KALIT]?.rang_hex === '#10ab20';
  /* rasm */
  await page.locator('[data-mat-f="rasm-fayl"]').setInputFiles({ name: 'sinov.png', mimeType: 'image/png', buffer: PNG }); await page.waitForTimeout(1200);
  const rasmSrc = await page.locator('img[data-mat-f="rasm-korinish"]').getAttribute('src').catch(() => null);
  R.rasmYuklandi = !!oxirgi('PUT', /dekor\/[^/]+\/rasm$/) && /^\/api\/materiallar\/rasm\//.test(rasmSrc || '');
  R.rasmKorinadi = await M(() => { const i = document.querySelector('img[data-mat-f="rasm-korinish"]'); return !!i && i.complete && i.naturalWidth === 1; });
  R.rasmOchirTugma = await kut('[data-mat-f="rasm-ochir"]');
  await page.locator('[data-mat-f="rasm-fayl"]').setInputFiles({ name: 'yomon.txt', mimeType: 'text/plain', buffer: Buffer.from('rasm emas') }); await page.waitForTimeout(500);
  R.yomonRasmXabar = /PNG, JPEG yoki WebP/.test(await matn()) && sorovlar.filter(c => /rasm$/.test(c.p)).length === 1;
  /* narx */
  const kod = await page.locator('[data-mat-variant]').first().getAttribute('data-mat-variant');
  const eskiNarx = Number((await page.locator(`[data-mat-narx="${kod}"]`).inputValue()).replace(/\s/g, ''));
  const yangiNarx = eskiNarx + 10000;
  await page.locator(`[data-mat-narx="${kod}"]`).fill('abc'); R.narxSaqlaOchiq = await page.locator(`[data-mat-narx-saqla="${kod}"]`).isDisabled();
  await page.locator(`[data-mat-narx="${kod}"]`).fill(String(yangiNarx)); await page.locator(`[data-mat-narx-saqla="${kod}"]`).click(); await page.waitForTimeout(900);
  const np = oxirgi('PUT', /materiallar\/narx\//);
  R.narxPut = !!np && JSON.parse(np.body).uzs === yangiNarx && decodeURIComponent(np.p).endsWith('/' + kod);
  R.narxOchiqGet = (await jsonOl('/api/materiallar')).narx[kod] === yangiNarx;
  await page.screenshot({ path: `${OUT}/admin2-materiallar-varaq-1440.png` });
  /* fayldagiga qaytarish — faqat rang (tasdiq bilan); rasm va narx qoladi, ilovada tekshiriladi */
  await page.locator('[data-mat-f="rang-qayt"]').click(); await page.waitForTimeout(300);
  await tasdiq(/Fayldagiga qaytarish/).click(); await page.waitForTimeout(900);
  R.rangQaytdi = !!oxirgi('DELETE', /dekor\/[^/]+$/) && (await page.locator('[data-mat-f="rang"]').inputValue()) === fayldagiRang && (await jsonOl('/api/materiallar')).dekor[KALIT]?.rang_hex === undefined;
  await page.locator('[data-mat-f="rang"]').fill('#10ab20'); await page.locator('[data-mat-f="rang-saqla"]').click(); await page.waitForTimeout(900);   // ilovada ko'rish uchun yana
  await page.locator('[data-varaq="admin-mat"] button[aria-label="Yopish"]').click();

  /* ═══ 2) KATALOG ═══ */
  await page.locator('[data-admin-tab="katalog"]').click(); await kut('[data-kat-qator]');
  R.katYol = await M(() => location.pathname);
  R.katSoni = await page.locator('[data-kat-qator]').count();
  await page.screenshot({ path: `${OUT}/admin2-katalog-1440.png` });
  await page.locator('[data-kat="qidir"]').fill('SP-K-001'); await page.waitForTimeout(300);
  R.katQidiruv = (await page.locator('[data-kat-qator]').count()) === 1;
  const KOD = 'SP-K-001';
  const asl = (await jsonOl('/api/admin/katalog')).modullar.find(m => m.kod === KOD);
  R.aslChegara = asl && asl.chegara.min_d > 0;
  await page.locator(`[data-kat-korinish="${KOD}"]`).click(); await page.waitForTimeout(900);
  R.yashirildi = (await page.locator(`[data-kat-korinish="${KOD}"]`).getAttribute('aria-checked')) === 'false' && (await jsonOl('/api/katalog')).modullar[KOD]?.yashirin === true
    && JSON.parse(oxirgi('PUT', /katalog\/SP-K-001$/).body).yashirin === true;
  await page.locator(`[data-kat-tahrir="${KOD}"]`).click(); await kut('[data-kat-f="nom_uz"]');
  await page.locator('[data-kat-f="nom_uz"]').fill('Sinov shkafi'); await page.locator('[data-kat-f="nom_ru"]').fill('Тестовый шкаф');
  await page.locator('[data-kat-f="min_d"]').fill('380'); await page.locator('[data-kat-f="max_d"]').fill('360');
  await page.locator('[data-kat-f="saqla"]').click(); await page.waitForTimeout(500);
  R.minMaxXabar = /Eng kichik qiymat eng kattasidan oshmasin/.test(await matn());            // 380 > 360: brauzer to'xtatadi
  await page.locator('[data-kat-f="max_d"]').fill('640'); await page.locator('[data-kat-f="rejim"]').selectOption('m2');
  await page.locator('[data-kat-f="saqla"]').click(); await page.waitForTimeout(1000);
  const kp = oxirgi('PUT', /katalog\/SP-K-001$/), kb = kp && JSON.parse(kp.body);
  R.katPut = !!kb && kb.nom_uz === 'Sinov shkafi' && kb.nom_ru === 'Тестовый шкаф' && kb.nom_en === null && kb.min_d === 380 && kb.max_d === 640 && kb.min_w === null && kb.narx_rejim === 'm2';
  const pub = (await jsonOl('/api/katalog')).modullar[KOD];
  R.katOchiqGet = pub && pub.min_d === 380 && pub.max_d === 640 && pub.price_mode === 'm2' && pub.nom_uz === 'Sinov shkafi' && pub.yashirin === true;
  await page.screenshot({ path: `${OUT}/admin2-katalog-1440-qator.png` });
  /* tarix: katalog yozuvi ko'rinadi */
  await page.locator('[data-admin-tab="tarix"]').click(); await kut('[data-tarix-qator]');
  await page.locator('[data-tarix-suzgich="katalog"]').click(); await page.waitForTimeout(700);
  R.tarixKatalog = (await page.locator('[data-tarix-qator]').count()) >= 2 && /SP-K-001/.test(await matn());

  /* ═══ 3) FOYDALANUVCHILAR ═══ */
  await page.locator('[data-admin-tab="foydalanuvchilar"]').click(); await kut('[data-foyd-qator]');
  R.fyYol = await M(() => location.pathname);
  R.fyTablar = await page.locator('[data-fy-tab]').count();
  await page.locator('[data-fy="qidir"]').fill('Blok Sinov'); await page.waitForTimeout(900);
  R.fyQidiruv = (await page.locator('[data-foyd-qator]').count()) === 1;
  R.fyTelefon = (await page.locator(`[data-foyd-qator="${uid}"] [data-foyd-telefon]`).innerText()) === kutilganTel;
  await page.locator('[data-fy="qidir"]').fill(tel9.slice(2)); await page.waitForTimeout(900);
  R.fyTelefonQidiruv = (await page.locator(`[data-foyd-qator="${uid}"]`).count()) === 1;
  await page.locator('[data-fy="qidir"]').fill('Blok Sinov'); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/admin2-foydalanuvchilar-1440.png` });
  await page.locator(`[data-foyd-korish="${uid}"]`).click(); await kut(`[data-foyd-tafsilot="${uid}"]`);
  const taf = await page.locator(`[data-foyd-tafsilot="${uid}"]`).innerText();
  R.fyTafsilot = taf.includes('Sinov loyiha') && taf.includes('Aliyev') && taf.includes('+998 90 777 66 55') && taf.includes(kutilganTel);
  await page.locator(`[data-foyd-blok="${uid}"]`).click(); await kut('[data-blok-f="sabab"]');
  await page.locator('[data-blok-f="sabab"]').fill('sinov: spam'); await page.locator('[data-blok-f="tasdiq"]').click(); await page.waitForTimeout(1200);
  const bp = oxirgi('PUT', /foydalanuvchilar\/\d+\/blok$/);
  R.blokPut = !!bp && JSON.parse(bp.body).bloklangan === true && JSON.parse(bp.body).sabab === 'sinov: spam' && bp.p.endsWith(`/${uid}/blok`);
  await page.locator('[data-fy-holat="bloklangan"]').click(); await page.waitForTimeout(900);
  R.bloklanganRoyxatda = (await page.locator(`[data-foyd-qator="${uid}"]`).count()) === 1 && /Bloklangan/.test(await page.locator(`[data-foyd-qator="${uid}"]`).innerText());
  /* admin tafsilotida "Bloklash" tugmasi yo'q */
  await page.locator('[data-fy-holat=""]').click(); await page.locator('[data-fy="qidir"]').fill('admin@smart3d.uz'); await page.waitForTimeout(900);
  await page.locator('[data-foyd-korish]').first().click(); await kut('[data-foyd-tafsilot]');
  R.adminBlokYoq = (await page.locator('[data-foyd-blok]').count()) === 0 && /Admin/.test(await page.locator('[data-foyd-tafsilot]').innerText());
  await page.locator('[data-varaq="admin-foyd"] button[aria-label="Yopish"]').click();
  /* loyihalar va buyurtmalar tablari */
  await page.locator('[data-fy-tab="loyihalar"]').click(); await kut('[data-loyiha-qator]');
  R.fyLoyiha = /Sinov loyiha/.test(await page.locator('[data-fy-royxat="loyihalar"]').innerText()) && /Mijoz Aliyev/.test(await matn());
  R.fyLoyihaTel = (await page.locator('[data-fy-royxat="loyihalar"]').innerText()).includes(kutilganTel);
  await page.locator('[data-fy-tab="buyurtmalar"]').click(); await kut('[data-buyurtma-qator]');
  const bt = await page.locator('[data-fy-royxat="buyurtmalar"]').innerText();
  R.fyBuyurtma = bt.includes('Aliyev') && bt.includes('+998 90 777 66 55') && bt.includes('1 234 567') && bt.includes('Yangi');
  await page.screenshot({ path: `${OUT}/admin2-buyurtmalar-1440.png` });

  /* bloklangan foydalanuvchi: kirish oynasida xabar; (Node tomondan: 403 S3D-AUTH-021, ochiq kalit yaroqsiz) */
  const lg = await post('/api/login', { email, password: parol });
  R.blokLogin = lg.status === 403 && lg.j && lg.j.code === 'S3D-AUTH-021';
  R.blokKalit = (await fetch(orgn() + '/api/me', { headers: { authorization: 'Bearer ' + token } })).status === 401;
  await page.context().clearCookies(); await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', email); await fill('kamida 8', parol); await click(/^Kirish$/); await page.waitForTimeout(1500);
  R.blokKirishXabar = /Akkaunt bloklangan/.test(await matn()) && (await page.locator('[data-ishjoyi]').count()) === 0;
  await page.screenshot({ path: `${OUT}/admin2-bloklangan-kirish.png` });
  await adminKirish();
  await page.goto(orgn() + '/admin/foydalanuvchilar'); await kut('[data-foyd-qator]');
  await page.locator('[data-fy="qidir"]').fill('Blok Sinov'); await page.locator('[data-fy-holat="bloklangan"]').click(); await page.waitForTimeout(900);
  await page.locator(`[data-foyd-korish="${uid}"]`).click(); await kut(`[data-foyd-och="${uid}"]`);
  await page.locator(`[data-foyd-och="${uid}"]`).click(); await page.waitForTimeout(300);
  await tasdiq(/Blokdan ochish/).click(); await page.waitForTimeout(1200);
  R.ochildi = !!oxirgi('PUT', /\/blok$/) && JSON.parse(oxirgi('PUT', /\/blok$/).body).bloklangan === false && (await post('/api/login', { email, password: parol })).status === 200;
  await page.locator('[data-fy-holat=""]').click().catch(() => {});

  /* ═══ 4) ILOVADA TA'SIR (sahifa qayta ochilganda; admin sifatida) ═══ */
  await page.goto(orgn() + '/loyiha/yangi?t=' + Date.now()); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.H)); i++) await page.waitForTimeout(250);
  const H = await M((a) => {
    const h = window.__app.H, e = h.dekorAsosiy.items.find(x => x.kalit === a.kalit), f = h.catalog[a.kod];
    return { rang: e.rang_hex, ishonch: e.rang_ishonch, minD: f.min_d, maxD: f.max_d, rejim: f.price_mode, yashirin: [...h.yashirin], nomUz: h.nomlar.uz && h.nomlar.uz.modullar[a.kod], nomRu: h.nomlar.ru.modullar[a.kod],
      katalogda: !!h.catalog[a.kod], korinadida: !!h.korinadiKatalog[a.kod], rasm: h.rasmlar.materiallar['dekor|' + a.kalit] };
  }, { kalit: KALIT, kod: KOD });
  R.ilovaRang = H.rang === '#10ab20' && H.ishonch === 'aniq';
  R.ilovaRasm = /^api\/materiallar\/rasm\//.test(H.rasm || '');
  R.ilovaChegara = H.minD === 380 && H.maxD === 640 && H.rejim === 'm2';
  R.ilovaNom = H.nomUz === 'Sinov shkafi' && H.nomRu === 'Тестовый шкаф';
  R.ilovaYashirin = H.yashirin.includes(KOD) && H.katalogda && !H.korinadida;
  R.ilovaNarx = await M(({ kod, narx }) => {
    const h = window.__app.H;
    return h.sheetCatalog.sheets.some(s => s.uzs === narx) && h.dekorAsosiy.items.some(e => e.kodlar.includes(kod));
  }, { kod, narx: yangiNarx });
  /* modul tanlash ro'yxati: yashirin modul yo'q, boshqasi bor */
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(KOD); await page.waitForTimeout(600);
  R.ro_yxatdaYoq = (await page.locator('[data-panel] button.h5').count()) === 0;
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(600);
  R.boshqaBor = (await page.locator('[data-panel] button.h5').count()) >= 1;
  await page.screenshot({ path: `${OUT}/admin2-ilova-1440.png` });

  /* katalogni butunlay faylga qaytarish: modul yana ro'yxatda */
  await page.goto(orgn() + '/admin/katalog'); await kut('[data-kat-qator]');
  await page.locator('[data-kat="qidir"]').fill(KOD); await page.waitForTimeout(300);
  await page.locator(`[data-kat-tahrir="${KOD}"]`).click(); await kut('[data-kat-f="qaytar"]');
  await page.locator('[data-kat-f="qaytar"]').click(); await page.waitForTimeout(300);
  await tasdiq(/Fayldagiga qaytarish/).click(); await page.waitForTimeout(1000);
  R.katQaytdi = !!oxirgi('DELETE', /katalog\/SP-K-001$/) && Object.keys((await jsonOl('/api/katalog')).modullar).length === 0;

  /* ═══ 5) UCH TIL va 390 px ═══ */
  for (const [til, sarlavha, tab] of [['ru', 'Пользователи, проекты, заказы', 'Материалы'], ['en', 'Users, projects, orders', 'Materials'], ['uz', 'Foydalanuvchilar, loyihalar, buyurtmalar', 'Materiallar']]) {
    await M((t) => localStorage.setItem('s3d-til', t), til);
    await page.goto(orgn() + '/admin/foydalanuvchilar'); await kut('[data-foyd-qator]');
    const m = await matn();
    R['til_' + til] = m.includes(sarlavha) && m.includes(tab);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  R.skroll390 = {};
  for (const b of ['materiallar', 'katalog', 'foydalanuvchilar']) {
    await page.goto(orgn() + '/admin/' + b); await kut(`[data-admin-bolim="${b}"]`); await page.waitForTimeout(900);
    R.skroll390[b] = await skroll0();
    await page.screenshot({ path: `${OUT}/admin2-${b}-390.png` });
    await page.locator('[data-mat-qator],[data-kat-qator],[data-foyd-qator]').nth(1).scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${OUT}/admin2-${b}-390-qatorlar.png` });
  }
  await page.locator('[data-fy-tab="buyurtmalar"]').click(); await page.waitForTimeout(700);
  R.skroll390.buyurtmalar = await skroll0();
  await page.goto(orgn() + '/admin/materiallar'); await kut('[data-mat-tahrir]');
  await page.locator('[data-mat-tahrir]').first().click(); await kut('[data-varaq="admin-mat"]');
  R.skroll390.varaq = await skroll0();
  await page.screenshot({ path: `${OUT}/admin2-materiallar-varaq-390.png` });

  R.xatolar = errs.length;
  const kutilgan = ['tayyor', 'yangiTablar', 'matVaraq', 'matQidiruv', 'rangXatoSorovYoq', 'rangXatoXabar', 'rangPut', 'rangQaytTugma', 'rangOchiqGet', 'rasmYuklandi', 'rasmKorinadi', 'rasmOchirTugma', 'yomonRasmXabar',
    'narxSaqlaOchiq', 'narxPut', 'narxOchiqGet', 'rangQaytdi', 'katQidiruv', 'aslChegara', 'yashirildi', 'minMaxXabar', 'katPut', 'katOchiqGet', 'tarixKatalog', 'fyQidiruv', 'fyTelefon', 'fyTelefonQidiruv', 'fyTafsilot',
    'blokPut', 'bloklanganRoyxatda', 'adminBlokYoq', 'fyLoyiha', 'fyLoyihaTel', 'fyBuyurtma', 'blokLogin', 'blokKalit', 'blokKirishXabar', 'ochildi', 'ilovaRang', 'ilovaRasm', 'ilovaChegara', 'ilovaNom', 'ilovaYashirin', 'ilovaNarx',
    'ro_yxatdaYoq', 'boshqaBor', 'katQaytdi', 'til_ru', 'til_en', 'til_uz'];
  R.yiqilgan = kutilgan.filter(k => !R[k]);
  R.ok = !R.yiqilgan.length && R.tablar === 9 && R.matSoni === 100 && R.katSoni >= 130 && R.fyTablar === 3 && R.matYol === '/admin/materiallar' && R.katYol === '/admin/katalog' && R.fyYol === '/admin/foydalanuvchilar'
    && Object.values(R.skroll390).every(Boolean) && !errs.length;
}
