/* TZ-35 (egasi #242–#244): spalniy garnitur — matn bo'laklarga ajratiladi. Egasining prompti (uz) va ruscha varianti: 5 katalog moduli
 * (krovat SP-BD-004 1800×2100 + yumshoq bosh SP-BD-002, shkaf SP-G-011 2400×2300, trimo SP-BD-005, oyna SP-H-011), butun garnitur bitta ERP dekorida (Кашемир),
 * karta: bajarildi / qisman / bajarilmadi (yumshoq oyoq, push, klassik …). Skrinshotlar: tests/ui/out/web/ai-garnitur-*.png. Ishlatish: bash tests/ui/web.sh garnitur */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/ai-garnitur-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const qator = page.locator('[data-matn]');
  const yoz = async (s) => { await qator.fill(s); await qator.press('Enter'); };
  const kut = async (fn, arg, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };
  const karta = () => M(() => {
    const el = document.querySelector('[data-ai-oshxona]');
    return el ? { matn: el.innerText, sukut: el.querySelectorAll('[data-manba="sukut"]').length, matndan: el.querySelectorAll('[data-manba="matn"]').length, katalog: el.querySelectorAll('[data-manba="katalog"]').length } : null;
  });
  /* qurilgan garnitur: modullar, o'lchamlar, dekor (ERP), belgilar, ustma-ust */
  const holat = () => M(() => {
    const a = window.__app, pl = a.doc.placements, erp = a.doc.erpMat || {};
    const dek = pl.map(p => p.slots ? [p.slots.korpus, p.slots.polka, p.slots.fasad].map(c => (erp[c] || {}).name || c).join('|') : null);
    return {
      n: pl.length, kodlar: pl.map(p => p.frg).sort(), katalogMi: pl.every(p => a.H.catalog[p.frg] && !/^CH-/.test(p.frg)) && !Object.keys(a.doc.chizmalar || {}).length,
      krovat: pl.filter(p => p.frg === 'SP-BD-004').map(p => [p.w, p.d]), shkaf: pl.filter(p => p.frg === 'SP-G-011').map(p => [p.w, p.h]),
      dekor: [...new Set(dek)], dekorHammasi: dek.every(Boolean), uslub: pl.every(p => p.uslub === 'klassik'), push: pl.filter(p => p.push).map(p => p.frg).sort(),
      xona: [a.doc.room.wall_height, a.doc.room.outline && a.doc.room.outline[2]], narx: a.res && a.res.priceRes.total
    };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Oshxona Usta'); await fill('jasur@', 'osh' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  const UZ = "spalniy garnitur, classic model, spalniy razmeri 1800x2100 mm ldsp, bosh va oyoq qismida yumshoq detallari, shkafi 2400x2300 mm 3 qismdan (o'rtada kiyim ilish, 2 chekkasi polka), trimosi tortmali tepasida oyna, ruchkasiz push mexanizmda, umumiy rangi kashemir";
  const RU = 'спальный гарнитур, классика, размер спальни 1800x2100 мм лдсп, мягкие детали в изголовье и в ногах, шкаф 2400x2300 мм из 3 частей (в центре штанга для одежды, по краям полки), трюмо с ящиками, сверху зеркало, без ручек push, общий цвет кашемир';

  /* 1) egasining matni (aynan) */
  await yoz(UZ);
  if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 2500)) await click(/^Almashtirish$/);
  R.karta = await kut(() => !!document.querySelector('[data-ai-oshxona]')) ? await karta() : null;
  await page.waitForTimeout(1500);
  R.uz = await holat();
  await page.screenshot({ path: `${OUT}/ai-garnitur-1440-karta.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/ai-garnitur-1440-3d.png` });

  /* 2) ruscha matn — natija bir xil */
  await yoz(RU);
  if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 4000)) await click(/^Almashtirish$/);
  await kut(() => !!document.querySelector('[data-ai-oshxona]'));
  await page.waitForTimeout(1500);
  R.ru = await holat();
  R.ruKarta = await karta();

  /* 3) telefon (390) — karta toshmaydi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  R.toshish = await M(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `${OUT}/ai-garnitur-390.png` });
  R.errs = errs;

  const KODLAR = JSON.stringify(['SP-BD-002', 'SP-BD-004', 'SP-BD-005', 'SP-G-011', 'SP-H-011']);
  const togri = (h) => h && JSON.stringify(h.kodlar) === KODLAR && h.katalogMi && JSON.stringify(h.krovat) === '[[1800,2100]]' && JSON.stringify(h.shkaf) === '[[2400,2300]]'
    && h.dekor.length === 1 && h.dekorHammasi && /Кашемир/.test(h.dekor[0]) && h.uslub && JSON.stringify(h.push) === '["SP-BD-005","SP-G-011"]' && h.narx > 0;
  R.ok = !!R.karta && /SP-BD-004/.test(R.karta.matn) && /1800×2100/.test(R.karta.matn) && /SP-G-011/.test(R.karta.matn) && /2400×2300/.test(R.karta.matn) && /SP-BD-005/.test(R.karta.matn) && /SP-H-011/.test(R.karta.matn)
    && /Bajarilmadi/.test(R.karta.matn) && /Yumshoq oyoq/.test(R.karta.matn) && /Rang «kashemir»/.test(R.karta.matn) && /Kashemir UR 16mm|Кашемир UR 16мм/.test(R.karta.matn)
    && R.karta.katalog >= 5 && togri(R.uz) && togri(R.ru) && !!R.ruKarta && !R.toshish && errs.length === 0;
}
