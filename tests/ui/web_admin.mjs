/* TZ-37 (1-faza; 2-faza: 8 bo'lim tabi): admin panel sahifalari — API SHARTNOMA shaklida soxtalashtiriladi (page.route; backend alohida qurilmoqda).
 * Tekshiriladi: admin bo'lmagan → 404 ko'rinishi; admin → 5 bo'lim; furnitura PUT/DELETE tanasi; promptlar POST/PUT;
 * standart PUT; tarix qaytarish POST; 390 px da gorizontal skroll 0; uz/ru/en. Ishlatish: bash tests/ui/web.sh admin */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/admin-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const origin = new URL(page.url()).origin;
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const kut = async (sel, ms = 8000) => { try { await page.locator(sel).first().waitFor({ timeout: ms }); return true; } catch (_) { return false; } };
  const skroll0 = () => M(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);

  /* oddiy usta sifatida kirish (haqiqiy server) */
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Admin Sinov'); await fill('jasur@', 'admin' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await page.getByText(/^Ro'yxatdan o'tish$/).last().click(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  R.adminHavolaUstada = (await page.locator('[data-admin-havola]').count()) === 0;     // usta ko'rmaydi

  /* 1) admin bo'lmagan → 404 ko'rinishi */
  await page.goto(origin + '/admin/furnitura'); await page.waitForTimeout(1500);
  await page.waitForTimeout(1500);
  R.yoq404 = !!(await page.locator('[data-admin-emas]').count());   // egasi #261: 404 o'rniga tushuntirish kartasi
  R.yoq404Matn = (await txt()).includes("faqat admin uchun") && !/404\.html/.test(page.url());
  R.yoqTabYoq = (await page.locator('[data-admin-tab]').count()) === 0;

  /* soxta server (SHARTNOMA shakli) */
  const baza = {
    links: [
      { kod: 'BZ-a', erp_id: '90000001', koef: 0.5, izoh: 'juft', nom: 'Sinov a', narx: 12000, manba: 'baza' },
      { kod: 'BZ-b', erp_id: '90000002', koef: 1, izoh: '', nom: 'Sinov b', narx: 5000, manba: 'fayl' }],
    narxsiz: ['BZ-c']
  };
  let prompts = [
    { id: 1, kat: 'oshxona', nom_uz: 'Birinchi', nom_ru: 'Первый', nom_en: 'First', matn_uz: 'matn bir', matn_ru: 'текст', matn_en: 'text', tartib: 1, faol: 1 },
    { id: 2, kat: 'oshxona', nom_uz: 'Ikkinchi', nom_ru: '', nom_en: '', matn_uz: 'matn ikki', matn_ru: '', matn_en: '', tartib: 2, faol: 0 },
    { id: 3, kat: 'yotoqxona', nom_uz: 'Uchinchi', nom_ru: '', nom_en: '', matn_uz: 'matn uch', matn_ru: '', matn_en: '', tartib: 1, faol: 1 }];
  const std = { korpus: { nom: 'LDSP', qalinlik: 16 }, fasad: { nom: 'MDF', qalinlik: 16 }, orqa: { nom: 'HDF', qalinlik: 3 }, polka: { nom: 'LDSP', qalinlik: 16 },
    ruchka: { tur: 'profil', uzunlik: 128 }, birikma: 'konfirmat', tag: 'oyoq', oyoqBalandlik: 100 };
  const chaqiruv = [];
  await page.route('**/api/me', r => json(r, { id: 1, name: 'Admin Sinov', email: 'a@test.uz', role: 'admin' }));
  await page.route('**/api/admin/**', async (route) => {
    const q = route.request(), u = new URL(q.url()), m = q.method(), p = u.pathname;
    const body = q.postData() ? JSON.parse(q.postData()) : null;
    if (m !== 'GET') chaqiruv.push({ m, p, body });
    if (p === '/api/admin/furnitura-boglash') return json(route, baza);
    if (p.startsWith('/api/admin/furnitura-boglash/')) return json(route, { ok: true });
    if (p === '/api/admin/promptlar' && m === 'GET') return json(route, prompts);
    if (p === '/api/admin/promptlar' && m === 'POST') return json(route, { id: 9, ...body });
    if (p.startsWith('/api/admin/promptlar/')) return json(route, { ok: true });
    if (p === '/api/admin/standart') return json(route, m === 'GET' ? std : body);
    if (p === '/api/admin/audit') return json(route, [{ id: 7, bolim: 'narxlar', kalit: 'raspil', kim: 'admin@test.uz', vaqt: Date.now(), eski: '1000', yangi: '2000' }]);
    if (p.startsWith('/api/admin/qaytar/')) return json(route, { ok: true });
    return json(route, { error: 'yo\'q' }, 404);
  });
  const oxirgi = (m, re) => chaqiruv.filter(c => c.m === m && re.test(c.p)).pop();

  /* 2) admin → 5 bo'lim */
  await page.goto(origin + '/admin'); await kut('[data-admin-tab]');
  R.tablar = await page.locator('[data-admin-tab]').count();
  R.manzil = await M(() => location.pathname);
  R.narxlarBolim = await kut('[data-set="narxlar"]');
  for (const b of ['furnitura', 'promptlar', 'standart', 'tarix']) {
    await page.locator(`[data-admin-tab="${b}"]`).click();
    R['bolim_' + b] = await kut(`[data-admin-bolim="${b}"]`);
    R['manzil_' + b] = await M(() => location.pathname);
  }

  /* 3) furnitura */
  await page.locator('[data-admin-tab="furnitura"]').click(); await kut('[data-furn-qator="BZ-a"]');
  R.narxsizTepada = await M(() => { const a = document.querySelector('[data-furn="narxsiz"]'), b = document.querySelector('[data-furn="royxat"]'); return !!a && !!b && !!(a.compareDocumentPosition(b) & 4); });
  await page.screenshot({ path: `${OUT}/admin-furnitura-1440.png`, fullPage: true });
  await page.locator('[data-furn-tahrir="BZ-a"]').click(); await kut('[data-f="koef"]');
  await page.locator('[data-f="qidir"]').fill('S8109.71'); await page.waitForTimeout(800);
  R.katalogTopdi = await kut('[data-erp-variant]');
  await page.locator('[data-erp-variant]').first().click();
  R.erpTanlandi = (await page.locator('[data-f="erp"]').inputValue()).length === 8;
  await page.locator('[data-f="koef"]').fill('0,25'); await page.locator('[data-f="izoh"]').fill('yangi izoh');
  const erpTanlangan = await page.locator('[data-f="erp"]').inputValue();
  R.tushuntirish = (await txt()).includes('0,5');
  await page.locator('[data-f="saqla"]').click(); await page.waitForTimeout(800);
  const put = oxirgi('PUT', /furnitura-boglash\/BZ-a$/);
  R.putTana = !!put && put.body.erp_id === erpTanlangan && put.body.koef === 0.25 && put.body.izoh === 'yangi izoh' && Object.keys(put.body).length === 3;
  await page.locator('[data-furn-ochir="BZ-a"]').click(); await page.waitForTimeout(300);
  await page.getByRole('dialog').getByRole('button', { name: /O'chirish/ }).click(); await page.waitForTimeout(800);
  R.deleteYuborildi = !!oxirgi('DELETE', /furnitura-boglash\/BZ-a$/);
  R.faylQatorOchirYoq = (await page.locator('[data-furn-ochir="BZ-b"]').count()) === 0;

  /* 4) promptlar */
  await page.locator('[data-admin-tab="promptlar"]').click(); await kut('[data-prompt-guruh="oshxona"]');
  R.guruhlar = await page.locator('[data-prompt-guruh]').count();
  await page.screenshot({ path: `${OUT}/admin-promptlar-1440.png`, fullPage: true });
  await page.locator('[data-prompt="qosh"]').click(); await kut('[data-f="kat"]');
  await page.locator('[data-f="kat"]').fill('vannaxona'); await page.locator('[data-f="nom_uz"]').fill('Yangi nom');
  await page.locator('[data-f="matn_uz"]').fill('yangi matn'); await page.locator('[data-f="matn_ru"]').fill('новый текст');
  await page.locator('[data-f="saqla"]').click(); await page.waitForTimeout(800);
  const post = oxirgi('POST', /promptlar$/);
  R.postTana = !!post && post.body.kat === 'vannaxona' && post.body.nom_uz === 'Yangi nom' && post.body.matn_ru === 'новый текст' && post.body.faol === 1 && post.body.tartib === 3;
  await page.locator('[data-prompt-past="1"]').click(); await page.waitForTimeout(800);
  R.tartibPut = chaqiruv.filter(c => c.m === 'PUT' && /promptlar\/[12]$/.test(c.p)).length >= 2;
  await page.locator('[data-prompt-faol="1"]').click(); await page.waitForTimeout(600);
  R.faolPut = oxirgi('PUT', /promptlar\/1$/)?.body.faol === 0;
  R.sinash = (await page.locator('[data-prompt-sina]').first().getAttribute('href')) === '/loyiha/yangi';
  await page.locator('[data-prompt-ochir="3"]').click(); await page.getByRole('dialog').getByRole('button', { name: /O'chirish/ }).click(); await page.waitForTimeout(600);
  R.promptDelete = !!oxirgi('DELETE', /promptlar\/3$/);

  /* 5) standart */
  await page.locator('[data-admin-tab="standart"]').click(); await kut('[data-f="korpus-nom"]');
  await page.locator('[data-f="korpus-nom"]').fill('LDSP-E1'); await page.locator('[data-f="oyoq-h"]').fill('120'); await page.locator('[data-f="tag"]').selectOption('sokol');
  await page.locator('[data-f="saqla"]').click(); await page.waitForTimeout(700);
  const sp = oxirgi('PUT', /standart$/);
  R.standartPut = !!sp && sp.body.korpus.nom === 'LDSP-E1' && sp.body.korpus.qalinlik === 16 && sp.body.oyoqBalandlik === 120 && sp.body.tag === 'sokol' && sp.body.ruchka.uzunlik === 128 && sp.body.birikma === 'konfirmat';
  await page.locator('[data-std="sukut"]').click(); await page.waitForTimeout(300);
  R.sukutKorpus = await page.locator('[data-f="korpus-nom"]').inputValue() === 'LDSP' && await page.locator('[data-f="oyoq-h"]').inputValue() === '100';

  /* 6) tarix */
  await page.locator('[data-admin-tab="tarix"]').click(); await kut('[data-tarix-qator="7"]');
  await page.locator('[data-tarix-qaytar="7"]').click(); await page.getByRole('dialog').getByRole('button', { name: /Qaytarish/ }).click(); await page.waitForTimeout(700);
  R.qaytarPost = !!oxirgi('POST', /qaytar\/7$/);

  /* 390 px: gorizontal skroll 0 (har bo'lim) + skrinshot */
  await page.setViewportSize({ width: 390, height: 844 });
  R.skroll390 = {};
  for (const b of ['narxlar', 'furnitura', 'promptlar', 'standart', 'tarix']) {
    await page.locator(`[data-admin-tab="${b}"]`).click(); await kut(b === 'narxlar' ? '[data-set="narxlar"]' : `[data-admin-bolim="${b}"]`); await page.waitForTimeout(500);
    R.skroll390[b] = await skroll0();
    if (b === 'furnitura' || b === 'promptlar') await page.screenshot({ path: `${OUT}/admin-${b}-390.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  /* til: ru / en */
  R.til = {};
  for (const [l, kutilgan] of [['ru', 'Панель администратора'], ['en', 'Admin panel'], ['uz', 'Admin panel']]) {
    await M((x) => localStorage.setItem('s3d-til', x), l);
    await page.reload(); await kut('[data-admin-tab]'); await page.waitForTimeout(500);
    const bt = await txt();
    R.til[l] = bt.includes(kutilgan) && (l !== 'ru' || bt.includes('Фурнитура')) && (l !== 'en' || bt.includes('Hardware'));
  }
  R.xatolarYoq = !errs.length; if (errs.length) R.errs = errs.slice(0, 3);

  R.ok = R.adminHavolaUstada && R.yoq404 && R.yoq404Matn && R.yoqTabYoq && R.tablar === 8 && R.manzil === '/admin' && R.narxlarBolim && R.bolim_furnitura && R.bolim_promptlar &&
    R.bolim_standart && R.bolim_tarix && R.manzil_tarix === '/admin/tarix' && R.narxsizTepada && R.katalogTopdi && R.erpTanlandi && R.tushuntirish && R.putTana && R.deleteYuborildi &&
    R.faylQatorOchirYoq && R.guruhlar === 2 && R.postTana && R.tartibPut && R.faolPut && R.sinash && R.promptDelete && R.standartPut && R.sukutKorpus && R.qaytarPost &&
    Object.values(R.skroll390).every(Boolean) && Object.values(R.til).every(Boolean) && R.xatolarYoq;
}
