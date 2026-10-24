/* TZ-23 C2, C3: qoldiqlar ombori (Sozlamalar) va furnitura varag'i (Mebel qadami).
 * Admin: qoldiq qo'shadi, qidiradi, raskroy qoldiqlarini Narx qadamidan omborga yozadi, "ishlatildi" deb belgilaydi.
 * Furnitura: loyihadagisi (soni, narxi, jami) va ERP katalogi (qidiruv, toifa). Telefon (390) — sig'adi.
 * Ishlatish: bash tests/ui/web.sh qoldiq */
import { readFileSync } from 'node:fs';
import { takrorsiz } from '../../web/src/services/furnTakror.js';   // TZ-57: ro'yxatda takror ID'lar bir marta
/* furnitura katalogi soni — fayldan (ERP + do'kon narx ro'yxati, scripts/narx_pdf_import.py) */
const KATALOG_SONI = takrorsiz(JSON.parse(readFileSync(new URL('../../app/data/furnitura-catalog.json', import.meta.url), 'utf8')).items.filter(i => i.uzs > 0)).length;   // #151: narxsizlar katalogda ko'rinmaydi
/* furnitura zapchast rasmi: rasmi bor va narxli birinchi katalog yozuvi (app/data/rasmlar.json) */
const RASMLI = (() => {
  const r = JSON.parse(readFileSync(new URL('../../app/data/rasmlar.json', import.meta.url), 'utf8')).furnitura;
  const it = JSON.parse(readFileSync(new URL('../../app/data/furnitura-catalog.json', import.meta.url), 'utf8')).items.find(i => r[i.id] && i.uzs > 0);
  return it ? { id: it.id, sku: it.sku } : null;
})();

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/qoldiq-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
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
  const qatorlar = () => M(() => [...document.querySelectorAll('[data-qoldiq-royxat] > div')].map(d => d.innerText.replace(/\s+/g, ' ')).filter(s => !/Qoldiq yo'q/.test(s)));
  const Q = (sel, o) => page.locator('[data-set="qoldiqlar"] ' + sel, o);

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: kirgach — ish joyi

  /* 1) Sozlamalar → qoldiqlar: bo'sh, admin qo'shadi */
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Qoldiqlar ombori');
  await page.waitForTimeout(800);
  R.bosh = await has("Qoldiq yo'q");
  await Q('select').selectOption('LDSP16');
  await Q('input[placeholder*="Uzunligi"]').fill('900'); await Q('input[placeholder*="Eni"]').fill('400');
  await Q('button', { hasText: "Omborga qo'shish" }).click(); await page.waitForTimeout(1200);
  R.qoshildi = await qatorlar();
  await Q('input[placeholder*="Qidiruv"]').fill('zzz'); await page.waitForTimeout(200);
  R.qidiruvYoq = (await qatorlar()).length;
  await Q('input[placeholder*="Qidiruv"]').fill('900'); await page.waitForTimeout(200);
  R.qidiruv = (await qatorlar()).length;
  await Q('input[placeholder*="Qidiruv"]').fill('');
  R.xatoOlcham = await (async () => { await Q('input[placeholder*="Uzunligi"]').fill('10'); await Q('input[placeholder*="Eni"]').fill('10'); await Q('button', { hasText: "Omborga qo'shish" }).click(); await page.waitForTimeout(500); return await has("O'lcham 50"); })();
  await page.screenshot({ path: `${OUT}/qoldiq-1440-sozlama.png` });

  /* 2) muharrir: oshxona → Mebel → Furnitura varag'i */
  await click(/Muharrirga|Loyihalarimga/); await page.waitForTimeout(600);   // TZ-25: kirgach ish joyi ochilgan — sozlamalardan unga qaytiladi
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await click(/^Mebel$/); await page.waitForTimeout(500);
  for (const kod of ['MC-KP-02', 'MC-KP-10']) {                    // eshikli va tortmali modul — furnitura bor
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(''); await page.waitForTimeout(300);
  R.joylar = await M(() => window.__app.doc.placements.length);
  await page.locator('[data-furnitura]').click(); await page.waitForTimeout(500);
  R.furnLoyiha = await M(() => ({ n: document.querySelectorAll('[data-furnitura-loyiha] > div').length, matn: (document.querySelector('[data-furnitura-loyiha]') || {}).innerText || '' }));
  await page.locator('[data-furnitura-tab] button', { hasText: 'Katalog' }).click(); await page.waitForTimeout(400);
  R.katalogTab = await M(() => (document.querySelector('[data-furnitura-tab]') || {}).innerText || '');
  await page.locator('[data-varaq="furnitura"] input').fill('петля'); await page.waitForTimeout(400);
  R.qidiruvPetlya = await M(() => [...document.querySelectorAll('[data-furnitura-katalog] > div')].map(d => d.innerText).filter(s => /петл/i.test(s)).length);
  await page.locator('[data-varaq="furnitura"] input').fill(RASMLI.sku); await page.waitForTimeout(700);
  R.rasm = await M(() => ({ n: document.querySelectorAll('[data-furnitura-katalog] img[data-furnitura-rasm]').length, loaded: [...document.querySelectorAll('[data-furnitura-katalog] img[data-furnitura-rasm]')].every(i => i.complete && i.naturalWidth > 0),
    lazy: [...document.querySelectorAll('[data-furnitura-katalog] img')].every(i => i.loading === 'lazy') }));
  await page.screenshot({ path: `${OUT}/qoldiq-furnitura-rasm.png` });
  await page.locator('[data-varaq="furnitura"] input').fill(''); await page.waitForTimeout(200);
  await page.locator('[data-furnitura-toifa] button').nth(1).click(); await page.waitForTimeout(300);
  R.toifa = await M(() => { const b = [...document.querySelectorAll('[data-furnitura-toifa] button')][1].innerText; const r = [...document.querySelectorAll('[data-furnitura-katalog] > div')].map(d => d.innerText).filter(s => !/ko'rsatildi/.test(s)); return { b, n: r.length, hammasi: r.filter(s => s.includes(b)).length }; });
  await page.screenshot({ path: `${OUT}/qoldiq-1440-furnitura.png` });
  await page.locator('[data-varaq="furnitura"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);

  /* 3) Narx → raskroy qoldiqlarini omborga (admin) */
  await click(/^Narx$/); await page.waitForTimeout(1200);
  R.nestQoldiq = await M(() => window.__app.res.nest.summary.remnant_count || 0);
  R.omborgaTugma = await page.locator('[data-qoldiq-omborga]').count();
  if (R.omborgaTugma) { await page.locator('[data-qoldiq-omborga]').click(); await page.waitForTimeout(1200); }
  R.omborgaToast = await has('qoldiq qo\'shildi');

  /* 3b) TZ-11: Fayllar → GibLab (Bazis uslubi) va KDT prisadka (admin, SINOV) */
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  const yukla = async (matn) => {
    const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await page.locator('[data-panel] button', { hasText: matn }).first().click();
    const d = await dl;
    if (!d) return null;
    const { readFileSync } = await import('node:fs');
    return { nom: d.suggestedFilename(), b: readFileSync(await d.path()) };
  };
  const gp = await yukla('GibLab (Bazis)');
  R.giblabBazis = gp ? { nom: gp.nom, bosh: gp.b.slice(0, 80).toString('latin1'), cp1251: !gp.b.includes(Buffer.from('Ð')), mc: new TextDecoder('windows-1251').decode(gp.b).includes('name="pol"'), xnc: (gp.b.toString('latin1').match(/typeId="XNC"/g) || []).length } : null;
  const kz = await yukla('KDT prisadka');
  R.kdt = kz ? { nom: kz.nom, zip: kz.b[0] === 0x50 && kz.b[1] === 0x4b, fayllar: (kz.b.toString('latin1').match(/_[12]\.XML/g) || []).length / 2, kdtFormat: kz.b.toString('latin1').includes('<KDTPanelFormat>') } : null;

  /* 4) Sozlamalar: ombor ko'paydi; bittasi ishlatildi → "Ishlatilgan" da */
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Qoldiqlar ombori'); await page.waitForTimeout(1000);
  R.ombor = (await qatorlar()).length;
  await Q('[data-qoldiq-royxat] button', { hasText: 'Ishlatildi' }).first().click(); await page.waitForTimeout(1000);
  R.omborKeyin = (await qatorlar()).length;
  await Q('button', { hasText: 'Ishlatilgan' }).click(); await page.waitForTimeout(1000);
  R.ishlatilgan = (await qatorlar()).length;

  /* 5) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.locator('[data-set="qoldiqlar"]').scrollIntoViewIfNeeded();
  R.tel = await M(() => { const r = document.querySelector('[data-set="qoldiqlar"]').getBoundingClientRect(); return { sigadi: r.left >= 0 && r.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/qoldiq-390.png` });

  R.errs = errs;
  R.ok = R.bosh && R.qoshildi.length === 1 && /900 × 400 × 16/.test(R.qoshildi[0]) && R.qidiruvYoq === 0 && R.qidiruv === 1 && R.xatoOlcham &&
    R.joylar >= 2 && R.furnLoyiha.n > 1 && /Furnitura jami/.test(R.furnLoyiha.matn) && R.katalogTab.includes('Katalog (' + KATALOG_SONI + ')') && R.qidiruvPetlya > 0 && R.rasm.n >= 1 && R.rasm.loaded && R.rasm.lazy && R.toifa.n > 0 && R.toifa.n === R.toifa.hammasi &&
    (R.nestQoldiq === 0 || (R.omborgaTugma === 1 && R.omborgaToast && R.ombor === 1 + R.nestQoldiq)) &&
    R.giblabBazis && /^<\?xml version="1.0" encoding="windows-1251"\?><project importBMV="1.84">/.test(R.giblabBazis.bosh) && R.giblabBazis.mc && R.giblabBazis.xnc > 0 &&
    R.kdt && R.kdt.zip && R.kdt.fayllar > 5 && R.kdt.kdtFormat && R.omborKeyin === R.ombor - 1 && R.ishlatilgan === 1 &&
    R.tel.sigadi && !R.tel.hScroll && errs.length === 0;
}
