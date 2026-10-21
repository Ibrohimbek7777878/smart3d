/* TZ-37 (3-faza): admin panel — Tizim, O'zgarishlar tarixi kengaytmasi, ERP sinxronlash — HAQIQIY serverda (soxta API'siz).
 *   1) Tizim: AI (kalit "yo'q" va sababi; kalit qiymati ekranda yo'q), Google/SMS/Telegram holati, xatolar jurnali (24 soat/7 kun, kod bo'yicha qidiruv),
 *      zaxira holati; 3 til va 390 px da gorizontal skroll yo'q.
 *   2) Tarix: audit + narxlar bitta ro'yxatda; filtr (bo'lim, kim, sana, holat, kalit), sahifalash ("Yana"), narx o'zgarishini qaytarish;
 * Ishlatish: bash tests/ui/web.sh admin3Haqiqiy */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/admin3Haqiqiy-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

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
  page.on('request', q => { if (q.method() !== 'GET' && /\/api\/(admin|narxlar)/.test(q.url())) sorovlar.push({ m: q.method(), p: new URL(q.url()).pathname, body: q.postData() }); });
  const oxirgi = (m, re) => sorovlar.filter(c => c.m === m && re.test(c.p)).pop();
  const jsonOl = (yol) => M((yol) => fetch(yol, { cache: 'no-store' }).then(r => r.json()), yol);
  const yoz = (yol, method, body) => M(({ yol, method, body }) => fetch(yol, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.status), { yol, method, body });

  /* ── admin kiradi ── */
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.context().clearCookies();
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.goto(orgn() + '/admin'); await kut('[data-admin-tab]');
  R.tablar = await page.locator('[data-admin-tab]').count();
  R.yangiTablar = (await Promise.all(['tizim'].map(b => page.locator(`[data-admin-tab="${b}"]`).count()))).every(n => n === 1);

  /* ═══ 1) TIZIM ═══ */
  // xatolar jurnalida kod bo'lsin: brauzer xato yozuvi (mavjud /api/log)
  await M(() => fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'S3D-UI-101', modul: 'sinov', sahifa: '/admin', xabar: 'sinov xatosi' }) }));
  await page.locator('[data-admin-tab="tizim"]').click(); await kut('[data-tz="ai"]');
  R.tizimYol = await M(() => location.pathname);
  R.tizimKarta = await kut('[data-tz="zaxira"]') && await kut('[data-tz="xatolar"]');
  R.aiOchiq = (await page.locator('[data-tz-holat="ai"]').getAttribute('data-ok')) === '0' && await kut('[data-tz-sabab="provayder_yoq"]');
  R.kalitYoq = (await page.locator('[data-tz-holat="kalit"]').getAttribute('data-ok')) === '0' && /Yo'q/.test(await page.locator('[data-tz-qator="kalit"]').innerText());
  R.smsSozlanmagan = (await page.locator('[data-tz-holat="sms"]').getAttribute('data-ok')) === '0' && /Sozlanmagan/.test(await page.locator('[data-tz="sms"]').innerText());
  R.googleSozlanmagan = (await page.locator('[data-tz-holat="google"]').getAttribute('data-ok')) === '0';
  R.telegramSozlangan = (await page.locator('[data-tz-holat="telegram"]').getAttribute('data-ok')) === '1' && /Sozlangan/.test(await page.locator('[data-tz="telegram"]').innerText());
  R.zaxiraYoq = (await page.locator('[data-tz-holat="zaxira"]').getAttribute('data-ok')) === '0' && await kut('[data-tz-zaxira-yoq]');
  R.sarfKarta = await kut('[data-ai-sarf-karta]');
  const tz = await M(() => fetch('/api/admin/tizim', { cache: 'no-store' }).then(r => r.text()));
  R.maxfiyYoq = !/sk-ant|AIza|eyJ|ESKIZ_PASSWORD|web-test-secret/.test(tz) && !/web-test-secret-0123/.test(await matn()) && JSON.parse(tz).ai.kalit.bor === false;
  R.jurnalKorinadi = await kut('[data-tz-jurnal]') && (await page.locator('[data-tz-jurnal]').first().innerText()).includes('S3D-UI-101');
  R.topKorinadi = (await page.locator('[data-tz-top="S3D-UI-101"]').count()) === 1;
  await page.screenshot({ path: `${OUT}/admin3-tizim-1440.png`, fullPage: true });
  await page.locator('[data-tz="xato-qidir"]').fill('S3D-UI-101'); await page.waitForTimeout(900);
  R.qidirKod = (await page.locator('[data-tz-jurnal]').count()) >= 1;
  await page.locator('[data-tz="xato-qidir"]').fill('abcdef012345'); await page.waitForTimeout(900);
  R.qidirRidYoq = (await page.locator('[data-tz-jurnal]').count()) === 0 && /Hech narsa topilmadi/.test(await matn());
  await page.locator('[data-tz="xato-qidir"]').fill('');
  await page.locator('[data-tz="yangila"]').click(); await page.waitForTimeout(700);
  R.yangilaIshlaydi = await kut('[data-tz-jurnal]');
  /* kalit qiymati yozilgan matnni kiritganda ham jurnal qidiruvi so'rovga uni yubormaydi (rid/kod shakli bo'lmasa — hex emas → server 400, ekranda xato) */

  /* ═══ 2) TARIX ═══ */
  const furnId = await M(() => fetch('/data/furnitura-catalog.json').then(r => r.json()).then(d => d.items.find(x => x.id).id));
  const yozuvlar = [await yoz('/api/narxlar', 'PUT', { xizmatlar: { X1: { nom: 'Sinov raspili', guruh: 'raspil', qiymat: 21000, birlik: 'list', kategoriya: 'Услуги Распила', manba: 'egasi' } } }),
    await yoz('/api/narxlar', 'PUT', { ustama: { foiz: 40 } }), await yoz('/api/admin/katalog/SP-K-001', 'PUT', { yashirin: true })];
  for (let i = 1; i <= 48; i++) yozuvlar.push(await yoz('/api/admin/furnitura-boglash/UI-T-' + String(i).padStart(2, '0'), 'PUT', { erp_id: furnId, koef: 1, izoh: 'tarix sinovi' }));
  R.yozuvlar = yozuvlar.every(c => c === 200);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
  R.tarixYol = await M(() => location.pathname);
  R.tarixJami = (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  R.tarixSahifa50 = (await page.locator('[data-tarix-qator]').count()) === 50;
  R.tarixYana = (await page.locator('[data-tarix="yana"]').innerText()).includes('1');
  await page.locator('[data-tarix="yana"]').click(); await page.waitForTimeout(900);
  R.tarixYanaYuklandi = (await page.locator('[data-tarix-qator]').count()) === 51 && (await page.locator('[data-tarix="yana"]').count()) === 0;
  R.chiplarSon = /Narxlar · 2/.test(await page.locator('[data-tarix-suzgich="narxlar"]').innerText()) && /Furnitura · 48/.test(await page.locator('[data-tarix-suzgich="furnitura"]').innerText());
  await page.screenshot({ path: `${OUT}/admin3-tarix-1440.png` });
  await page.locator('[data-tarix-suzgich="narxlar"]').click(); await page.waitForTimeout(800);
  R.narxlarSuzgich = (await page.locator('[data-tarix-qator]').count()) === 2 && (await page.locator('[data-tarix-qator][data-tarix-bolim="narxlar"]').count()) === 2;
  const ustama = page.locator('[data-tarix-qator]', { hasText: 'ustama.foiz' });
  R.farqKorinadi = /qiymat: .*35.*→.*40/.test((await ustama.locator('[data-tarix-farq]').innerText()).replace(/\s+/g, ' ')) || /qiymat: 35 → 40/.test((await ustama.locator('[data-tarix-farq]').innerText()).replace(/\s+/g, ' '));
  await page.locator('[data-tarix-suzgich=""]').click(); await page.waitForTimeout(700);
  /* kim */
  const kimOpt = await page.locator('[data-tarix="kim"] option').count();
  await page.locator('[data-tarix="kim"]').selectOption({ index: 1 }); await page.waitForTimeout(800);
  R.kimSuzgich = kimOpt === 2 && (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  await page.locator('[data-tarix="kim"]').selectOption({ index: 0 }); await page.waitForTimeout(500);
  /* sana */
  const ertaga = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), kecha = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  await page.locator('[data-tarix="dan"]').fill(ertaga); await page.waitForTimeout(800);
  R.sanaBosh = (await page.locator('[data-tarix-qator]').count()) === 0 && /Hech narsa topilmadi/.test(await matn());
  await page.locator('[data-tarix="dan"]').fill(kecha); await page.waitForTimeout(800);
  R.sanaOralig = (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  await page.locator('[data-tarix="tozala"]').click(); await page.waitForTimeout(700);
  R.tozalandi = (await page.locator('[data-tarix="tozala"]').count()) === 0 && (await page.locator('[data-tarix="dan"]').inputValue()) === '';
  /* kalit qidiruvi va holat */
  await page.locator('[data-tarix="qidir"]').fill('ustama'); await page.waitForTimeout(900);
  R.qidirKalit = (await page.locator('[data-tarix-qator]').count()) === 1;
  await page.locator('[data-tarix="holat"]').selectOption('qaytarilgan'); await page.waitForTimeout(800);
  R.holatBosh = (await page.locator('[data-tarix-qator]').count()) === 0;
  await page.locator('[data-tarix="holat"]').selectOption(''); await page.waitForTimeout(700);
  /* narx o'zgarishini qaytarish */
  const qid = await page.locator('[data-tarix-qator]').first().getAttribute('data-tarix-qator');
  R.narxIdN = /^n\d+$/.test(qid || '');
  await page.locator(`[data-tarix-qaytar="${qid}"]`).click();
  await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1000);
  const qp = oxirgi('POST', /narx-qaytar\/\d+$/);
  R.narxQaytarPost = !!qp && qp.p.endsWith('/' + qid.slice(1));
  R.ustamaQaytdi = (await jsonOl('/api/narxlar')).ustama.foiz.qiymat === 35;
  R.qaytarilganBelgi = (await page.locator(`[data-tarix-qaytarilgan="${qid}"]`).count()) === 1 && (await page.locator(`[data-tarix-qaytar="${qid}"]`).count()) === 0;
  await page.locator('[data-tarix="qidir"]').fill('');
  await page.locator('[data-tarix="holat"]').selectOption('qaytarilgan'); await page.waitForTimeout(800);
  R.holatQaytarilgan = (await page.locator('[data-tarix-qator]').count()) === 1;
  /* audit yozuvini qaytarish (furnitura) */
  await page.locator('[data-tarix="holat"]').selectOption('faol'); await page.locator('[data-tarix-suzgich="katalog"]').click(); await page.waitForTimeout(800);
  const kid = await page.locator('[data-tarix-qator]').first().getAttribute('data-tarix-qator');
  await page.locator(`[data-tarix-qaytar="${kid}"]`).click(); await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1000);
  R.katalogQaytdi = !!oxirgi('POST', /\/api\/admin\/qaytar\/\d+$/) && Object.keys((await jsonOl('/api/katalog')).modullar).length === 0;

  /* ═══ UCH TIL va 390 px ═══ */
  for (const [til, sarlavha, tab, ai, kim] of [['ru', 'Состояние системы', 'Система', 'ИИ (Claude)', 'Кто'], ['en', 'System status', 'System', 'AI (Claude)', 'Who'], ['uz', 'Tizim holati', 'Tizim', 'AI (Claude)', 'Kim']]) {
    await M((t) => localStorage.setItem('s3d-til', t), til);
    await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="ai"]');
    const m = await matn();
    R['til_' + til] = m.includes(sarlavha) && m.includes(tab) && m.includes(ai);
    await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
    R['tilTarix_' + til] = (await matn()).includes(kim) && (await page.locator('[data-tarix-suzgich="narxlar"]').count()) === 1;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="zaxira"]'); await page.waitForTimeout(800);
  R.skroll390 = { tizim: await skroll0() };
  await page.screenshot({ path: `${OUT}/admin3-tizim-390.png`, fullPage: true });
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]'); await page.waitForTimeout(700);
  R.skroll390.tarix = await skroll0();
  await page.screenshot({ path: `${OUT}/admin3-tarix-390.png` });

  R.xatolar = errs.length;
  const kutilgan = ['yangiTablar', 'tizimKarta', 'aiOchiq', 'kalitYoq', 'smsSozlanmagan', 'googleSozlanmagan', 'telegramSozlangan', 'zaxiraYoq', 'sarfKarta', 'maxfiyYoq',
    'jurnalKorinadi', 'topKorinadi', 'qidirKod', 'qidirRidYoq', 'yangilaIshlaydi', 'til_ru', 'til_en', 'til_uz', 'tilTarix_ru', 'tilTarix_en', 'tilTarix_uz',
    'yozuvlar', 'tarixJami', 'tarixSahifa50', 'tarixYana', 'tarixYanaYuklandi', 'chiplarSon', 'narxlarSuzgich', 'farqKorinadi', 'kimSuzgich', 'sanaBosh', 'sanaOralig', 'tozalandi', 'qidirKalit',
    'holatBosh', 'narxIdN', 'narxQaytarPost', 'ustamaQaytdi', 'qaytarilganBelgi', 'holatQaytarilgan', 'katalogQaytdi'];
  R.yiqilgan = kutilgan.filter(k => !R[k]);
  R.ok = !R.yiqilgan.length && R.tablar === 9 && R.tizimYol === '/admin/tizim' && R.tarixYol === '/admin/tarix' && Object.values(R.skroll390).every(Boolean) && !errs.length;
}
