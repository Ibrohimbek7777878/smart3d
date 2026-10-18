/* TZ-20 (2026-10-17): Sozlamalar → "Narxlar" (admin) va Narx qadamidagi "Narx aniqligi X%".
 * Admin: sex jadvalini yuklaydi (ko'rib chiqish: eski → yangi, nechta qator) → Saqlash; raspil stanogi va kromka sukutini tanlaydi;
 * tarix ochiladi. Muharrir: aniqlik foizi jami narx yonida, bosilsa taxminiy qatorlar; raspil qatori; sarlavhada kichik belgi.
 * Telefon (390 px) — sig'adi. Jadval TEST UCHUN yasaladi (soxta qiymatlar, egasining fayli emas, repoga tushmaydi).
 * Ishlatish: bash tests/ui/web.sh narxlar */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/narxlar-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

/** sex jadvali shaklidagi TEST fayli (scripts/xlsx_oddiy.py bilan) */
function testJadval(out) {
  const py = fileURLToPath(new URL('../../scripts/', import.meta.url));
  execFileSync('python3', ['-I', '-c', `
import sys; sys.path.insert(0, ${JSON.stringify(py)})
from xlsx_oddiy import write_xlsx
H = ['ID','Kod','Nomi','Kategoriya','Turi','Birlik turi','Vaqt (daq/birlik)','Tannarx','Mijoz narxi','Valyuta','Amal sanasi','Faol']
rows = [H,
 [1,'T-RASPIL-1','Test raspil stanok 1','Услуги Распила','labor','fixed',None,1000,18000,'UZS','2026-07-03','ha'],
 [2,'T-RASPIL-2','Test raspil stanok 2','Услуги Распила','labor','fixed',None,1000,33000,'UZS','2026-07-03','ha'],
 [3,'T-KROMKA-1','Test kromka 19/1','Услуга кромирование','mixed','fixed',None,440,4000,'UZS','2026-07-03','ha'],
 [4,'T-PRIS-1','Test prisadka evro','Услуги сверления','labor','fixed',None,320,1600,'UZS','2026-05-12','ha'],
 [5,'T-BOSH','Test bo\\'sh narx','Услуга кромирование','mixed','fixed',None,440,None,'','2026-07-03','ha'],
 [6,'T-NOL','Test nol narx','Услуги Распила','labor','fixed',None,0,0,'UZS','2026-07-03','ha'],
 [7,'T-BOSHQA','Test boshqa xizmat','Dizayn','work','piece',None,None,50000,'UZS','2026-07-03','ha']]
write_xlsx(sys.argv[1], [{'name': 'Xizmatlar', 'rows': rows}])
`, out]);
  return out;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (s, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const N = (sel) => page.locator('[data-set="narxlar"] ' + sel);
  const narxMatn = () => M(() => (document.querySelector('[data-set="narxlar"]') || {}).innerText || '');

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });

  /* 1) Sozlamalar → Narxlar: boshlang'ich holat (taxmin) */
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Sex jadvalidan yuklash');
  await page.waitForTimeout(600);
  const m0 = await narxMatn();
  R.boshlangich = { taxmin: (m0.match(/taxmin/g) || []).length, jadval: /Sex jadvalidagi qatorlar/.test(m0) };

  /* 2) sex jadvalidan yuklash → ko'rib chiqish → Saqlash */
  await N('[data-sex-jadval] input[type=file]').setInputFiles(testJadval(`${OUT}/narxlar-test-jadval.xlsx`));
  await page.locator('[data-narx-korib]').waitFor({ timeout: 8000 });
  R.korib = await M(() => document.querySelector('[data-narx-korib]').innerText.replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/narxlar-1440-korib.png` });
  await page.locator('[data-narx-saqla]').click(); await page.waitForTimeout(1200);
  R.saqlandi = await has('Sex jadvalidan 4 qator saqlandi');
  R.korishYopildi = !(await page.locator('[data-narx-korib]').count());

  /* 3) egasi tanlaydi: raspil stanogi, kromka sukuti */
  const sel = N('select');
  await sel.nth(0).selectOption('T-RASPIL-1'); await page.waitForTimeout(1000);
  await sel.nth(1).selectOption('T-KROMKA-1'); await page.waitForTimeout(1000);
  R.tanlov = await M(() => fetch('/api/narxlar').then(r => r.json()).then(j => j.tanlov));
  /* ish haqi — egasi qiymati (taxmin → egasi) */
  await N('input[aria-label="Ish haqi — detal boshiga"]').fill('12000');
  await N('input[aria-label="Ish haqi — modul boshiga (kamida)"]').fill('40000');
  await N('input[aria-label="Ustama"]').fill('35');
  await page.locator('[data-narx-qiymat-saqla]').click(); await page.waitForTimeout(1200);
  const g = await M(() => fetch('/api/narxlar').then(r => r.json()));
  R.ishHaqi = { detal: g.ish_haqi.detal.manba, modul: g.ish_haqi.modul.manba, ustama: g.ustama.foiz.manba };
  /* jadval va tarix */
  await N('[data-narx-guruh="raspil"] button').click(); await page.waitForTimeout(300);
  R.jadvalRaspil = await M(() => document.querySelectorAll('[data-narx-guruh="raspil"] > div').length);
  await page.locator('[data-narx-tarix-tugma]').click(); await page.waitForTimeout(1000);
  R.tarix = await M(() => document.querySelectorAll('[data-narx-tarix] > div').length);
  await page.locator('[data-set="narxlar"]').scrollIntoViewIfNeeded();
  await page.locator('[data-set="narxlar"]').screenshot({ path: `${OUT}/narxlar-1440.png` });

  /* 4) muharrir: oshxona → Narx: aniqlik foizi, raspil qatori, taxminiy qatorlar ro'yxati */
  await click(/Muharrirga|Loyihalarimga/); await page.waitForTimeout(600);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await click(/^Mebel$/); await page.waitForTimeout(500);
  for (const kod of ['MC-KP-02', 'MC-KP-10']) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  await click(/^Narx$/); await page.waitForTimeout(1500);
  R.prod = await M(() => { const p = window.__app.res.prod; return { pct: p.aniqlik.pct, raspil: p.raspilCost, taxmin: p.aniqlik.taxmin.map(t => t.group), narxsiz: p.aniqlik.narxsiz }; });
  R.aniqTugma = await M(() => (document.querySelector('[data-aniqlik]') || {}).innerText || '');
  R.raspilQator = await has('Raspil');
  await page.locator('[data-aniqlik]').click(); await page.waitForTimeout(300);
  R.aniqRoyxat = await M(() => (document.querySelector('[data-aniqlik-royxat]') || {}).innerText || '');
  R.sarlavha = await M(() => [...document.querySelectorAll('header button, [data-sarlavha], button')].map(b => b.innerText).find(s => /so'm/.test(s) && /%/.test(s)) || '');
  R.toliqEmasYoq = !(await has("to'liq emas"));
  await page.screenshot({ path: `${OUT}/narxlar-1440-narx.png` });

  /* 5) telefon 390 px: narx paneli va Sozlamalar → Narxlar */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/narxlar-390-narx.png` });
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Sex jadvalidan yuklash'); await page.waitForTimeout(800);
  await page.locator('[data-set="narxlar"]').scrollIntoViewIfNeeded();
  R.tel = await M(() => { const r = document.querySelector('[data-set="narxlar"]').getBoundingClientRect(); return { sigadi: r.left >= 0 && r.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.locator('[data-set="narxlar"]').screenshot({ path: `${OUT}/narxlar-390.png` });

  /* 6) TZ-36 P7: admin "Ish haqini sukutga qaytarish" — eski saqlangan 12 000 / 40 000 → 0 ("egasi"), ustama tegilmaydi; tarixga yoziladi */
  const sb = await M(() => fetch('/api/narxlar').then(r => r.json()));
  R.sukutOldin = { detal: sb.ish_haqi.detal.qiymat, modul: sb.ish_haqi.modul.qiymat };
  await page.locator('[data-narx-sukut="ish_haqi"]').scrollIntoViewIfNeeded();
  await page.locator('[data-narx-sukut="ish_haqi"]').click(); await page.waitForTimeout(400);
  R.sukutDialog = await M(() => (document.querySelector('[role="dialog"]') || {}).innerText || '');
  await page.locator('[role="dialog"] button').last().click(); await page.waitForTimeout(1500);
  const sk = await M(() => fetch('/api/narxlar').then(r => r.json()));
  R.sukutKeyin = { detal: sk.ish_haqi.detal.qiymat, modul: sk.ish_haqi.modul.qiymat, manba: sk.ish_haqi.detal.manba, ustama: sk.ustama.foiz.qiymat };
  R.sukutTugmalar = await M(() => document.querySelectorAll('[data-narx-sukut]').length);

  /* jadvalRaspil: 6 sukut raspil qatori (ERP Holzma 1–3, Altendorf 1–3; TZ-32 E) + 2 ta test qatori */
  R.errs = errs;
  R.ok = R.boshlangich.taxmin > 0 && R.boshlangich.jadval &&
    /6 qator o'qildi — 4 yangi, 0 o'zgargan, 0 bir xil, 2 o'tkazildi/.test(R.korib) && /— → 18 000/.test(R.korib) &&
    R.saqlandi && R.korishYopildi && R.tanlov.raspil === 'T-RASPIL-1' && R.tanlov.kromka._sukut === 'T-KROMKA-1' &&
    R.ishHaqi.detal === 'egasi' && R.ishHaqi.modul === 'egasi' && R.ishHaqi.ustama === 'egasi' &&
    R.jadvalRaspil === 8 && R.tarix >= 6 &&
    R.prod.pct > 0 && R.prod.raspil > 0 && R.aniqTugma.includes('Narx aniqligi ' + R.prod.pct + '%') && R.raspilQator && R.aniqRoyxat.length > 0 &&
    R.sukutOldin.detal === 12000 && R.sukutOldin.modul === 40000 && /sukut/i.test(R.sukutDialog) &&
    R.sukutKeyin.detal === 0 && R.sukutKeyin.modul === 0 && R.sukutKeyin.manba === 'egasi' && R.sukutKeyin.ustama === 35 && R.sukutTugmalar === 2 &&
    R.toliqEmasYoq && R.tel.sigadi && !R.tel.hScroll && errs.length === 0;
}
