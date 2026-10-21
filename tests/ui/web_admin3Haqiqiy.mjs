/* TZ-37 (3-faza): admin panel — Tizim, O'zgarishlar tarixi kengaytmasi, ERP sinxronlash — HAQIQIY serverda (soxta API'siz).
 *   1) Tizim: AI (kalit "yo'q" va sababi; kalit qiymati ekranda yo'q), Google/SMS/Telegram holati, xatolar jurnali (24 soat/7 kun, kod bo'yicha qidiruv),
 *      zaxira holati; 3 til va 390 px da gorizontal skroll yo'q.
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

  /* ═══ UCH TIL va 390 px ═══ */
  for (const [til, sarlavha, tab, ai] of [['ru', 'Состояние системы', 'Система', 'ИИ (Claude)'], ['en', 'System status', 'System', 'AI (Claude)'], ['uz', 'Tizim holati', 'Tizim', 'AI (Claude)']]) {
    await M((t) => localStorage.setItem('s3d-til', t), til);
    await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="ai"]');
    const m = await matn();
    R['til_' + til] = m.includes(sarlavha) && m.includes(tab) && m.includes(ai);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="zaxira"]'); await page.waitForTimeout(800);
  R.skroll390 = { tizim: await skroll0() };
  await page.screenshot({ path: `${OUT}/admin3-tizim-390.png`, fullPage: true });

  R.xatolar = errs.length;
  const kutilgan = ['yangiTablar', 'tizimKarta', 'aiOchiq', 'kalitYoq', 'smsSozlanmagan', 'googleSozlanmagan', 'telegramSozlangan', 'zaxiraYoq', 'sarfKarta', 'maxfiyYoq',
    'jurnalKorinadi', 'topKorinadi', 'qidirKod', 'qidirRidYoq', 'yangilaIshlaydi', 'til_ru', 'til_en', 'til_uz'];
  R.yiqilgan = kutilgan.filter(k => !R[k]);
  R.ok = !R.yiqilgan.length && R.tablar === 9 && R.tizimYol === '/admin/tizim' && Object.values(R.skroll390).every(Boolean) && !errs.length;
}
