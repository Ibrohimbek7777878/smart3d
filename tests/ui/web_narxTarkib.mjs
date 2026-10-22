/* TZ-48 (2026-10-22, egasi #301/#302): narx paneli — haqiqiy brauzerda (1440 va 390 px).
 *   1) sukut: ustama 0% (blok o'chiq), prisadka va Bazis yoqilgan, +1 qo'shimcha raspil ogohlantirishi
 *   2) «Furniturasiz»: jami furnitura (va unga ustama) chiqarilgan jamga almashadi, hisob (clientTotal) o'zgarmaydi; qayta bosilsa — avvalgi jami
 *   3) ustama bloki: yoqilsa taklif 35%, foiz o'zgarsa narx darhol yangilanadi, o'chirilsa 0%
 *   4) +1 raspil: olib tashlash (raspil summasi aynan stavkaga kamayadi) va qaytarish
 *   5) «Xizmat qo'shish» oynasi: qidiruv, guruhlar (arra, kromka, prisadka, Rover …), miqdor bilan qo'shish, o'zgartirish, olib tashlash
 *   6) narx tarkibi: bo'limlar yig'indisi = jami; har qatorda miqdor × narx = summa, manba va qoida
 *   7) loyiha saqlanib qayta ochilganda tanlovlar (ustama, +1 raspil, qo'shilgan xizmatlar) tiklanadi
 *   8) telefon (390 px): gorizontal aylantirish yo'q, oyna va tarkib sig'adi
 * Narx hujjati (server) testdan oldin admin orqali sukutga qaytariladi (boshqa suitelar o'zgartirgan bo'lishi mumkin).
 * Ishlatish: bash tests/ui/web.sh narxTarkib */

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/narxTarkib-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (s) => (await txt()).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const raqam = (s) => Number(String(s).replace(/[^\d]/g, ''));
  const hisob = async () => { for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const r = await M(() => window.__app.res && window.__app.res.prod && window.__app.res.priceRes); if (r) break; } await page.waitForTimeout(500); };
  const P = () => M(() => {
    const p = window.__app.res.prod, d = window.__app.doc;
    return { jami: p.clientTotal, furnsiz: p.clientFurnsiz, tannarx: p.totalCost, hw: p.hwCost, hole: p.holeCost, bazis: p.bazisCost, bazisQty: p.xizmat_taklif.bazis.qty, raspil: p.raspilCost, qosh: p.qoshCost,
      mk: p.markupPct, r1: p.xizmat_taklif.raspil1, qoshQator: p.lines.filter(l => l.qosh).map(l => [l.code, l.qty, l.amount]), sheetCost: p.sheetCost,
      doc: { xizmatlar: d.xizmatlar || null, ustama: d.ustama || null, qosh: d.qoshXizmat || null },
      tarkibJami: p.tarkib.bolimlar.reduce((s, b) => s + b.jami, 0), tarkibKodlar: p.tarkib.bolimlar.map(b => b.kod),
      raspilQoidalar: (p.tarkib.bolimlar.find(b => b.kod === 'raspil') || { qatorlar: [] }).qatorlar.map(q => q.qoida) };
  });
  const katta = () => M(() => { const el = document.querySelector('[data-jami-label]'); return el ? { label: el.innerText, matn: el.parentElement.innerText } : null; });
  const toggleOn = (sel) => M((s) => { const b = document.querySelector(s + ' [role=switch]'); return b ? b.getAttribute('aria-checked') : null; }, sel);

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  /* narx hujjati — sukutga (boshqa suitelar raspil stanogi / ustamani o'zgartirgan bo'lishi mumkin); keyin sahifa qayta yuklanadi */
  R.reset = await M(() => fetch('/api/narxlar/sukut', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qamrov: 'hammasi' }) }).then(r => r.status));
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now()); await page.waitForTimeout(1800);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await click(/^Mebel$/); await page.waitForTimeout(500);
  for (const kod of ['MC-KP-02', 'MC-KP-10']) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  await click(/^Narx$/); await page.waitForTimeout(1500); await hisob();

  /* 1) sukutlar */
  R.s = await P();
  R.sukut = { ustamaToggle: await toggleOn('[data-ustama]'), ustamaMatn: await M(() => document.querySelector('[data-ustama]').innerText), prisadka: await toggleOn('[data-xizmat]'),
    raspil1: await M(() => { const e = document.querySelector('[data-raspil1]'); return e ? { holat: e.getAttribute('data-raspil1'), matn: e.innerText } : null; }),
    ustamaFoizInput: await page.locator('[data-ustama-foiz]').count() };
  R.bazisToggle = await M(() => [...document.querySelectorAll('[data-xizmat] [role=switch]')].map(b => b.innerText.replace(/\s+/g, ' ')));
  R.katta0 = await katta();
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-sukut.png` });

  /* 2) Furniturasiz */
  await page.locator('[data-furnsiz]').click(); await page.waitForTimeout(500);
  R.furnsizOn = { katta: await katta(), p: await P(), izoh: await M(() => (document.querySelector('[data-furnsiz-izoh]') || {}).innerText || ''), pressed: await M(() => document.querySelector('[data-furnsiz]').getAttribute('aria-pressed')),
    tannarxQator: await M(() => [...document.querySelectorAll('div')].some(d => d.innerText === 'Zapchast')) };
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-furnsiz.png` });
  await page.locator('[data-furnsiz]').click(); await page.waitForTimeout(400);
  R.furnsizOff = { katta: await katta(), pressed: await M(() => document.querySelector('[data-furnsiz]').getAttribute('aria-pressed')) };

  /* 3) ustama bloki */
  await page.locator('[data-ustama] [role=switch]').click(); await hisob();
  R.u35 = { p: await P(), foiz: await page.locator('[data-ustama-foiz]').inputValue(), katta: await katta() };
  await page.locator('[data-ustama-foiz]').fill('20'); await hisob();
  R.u20 = await P();
  await page.locator('[data-ustama-foiz]').fill('12,5'.replace(',', '.')); await hisob();
  R.u125 = await P();
  await page.locator('[data-ustama-taklif]').click(); await hisob();
  R.uTaklif = { p: await P(), foiz: await page.locator('[data-ustama-foiz]').inputValue() };
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-ustama.png` });
  await page.locator('[data-ustama] [role=switch]').click(); await hisob();
  R.uOff = { p: await P(), inputYoq: await page.locator('[data-ustama-foiz]').count() };
  /* tanlangan foiz keyingi yoqishda eslab qolinadi */
  await page.locator('[data-ustama-foiz]').count();

  /* 4) +1 raspil */
  const r1Bor = R.s.raspil;
  await page.locator('[data-raspil1-tugma]').click(); await hisob();
  R.r1Olindi = { p: await P(), holat: await M(() => document.querySelector('[data-raspil1]').getAttribute('data-raspil1')), matn: await M(() => document.querySelector('[data-raspil1]').innerText), tugma: await M(() => document.querySelector('[data-raspil1-tugma]').innerText) };
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-raspil1.png` });
  await page.locator('[data-raspil1-tugma]').click(); await hisob();
  R.r1Qaytdi = { p: await P(), holat: await M(() => document.querySelector('[data-raspil1]').getAttribute('data-raspil1')) };
  /* qayta olib tashlaymiz — saqlanish tekshiruvi uchun (7) */
  await page.locator('[data-raspil1-tugma]').click(); await hisob();

  /* 5) Xizmat qo'shish oynasi */
  await page.locator('[data-xizmat-qosh]').scrollIntoViewIfNeeded();
  await page.locator('[data-xizmat-qosh]').click(); await page.locator('[data-varaq="xizmat"]').waitFor({ timeout: 8000 });
  R.oyna0 = await M(() => ({ guruhlar: [...document.querySelectorAll('[data-xizmat-guruh]')].map(b => b.getAttribute('data-xizmat-guruh') + ':' + b.innerText.replace(/\D+/g, ' ').trim()), qatorlar: document.querySelectorAll('[data-xizmat-qator]').length }));
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-oyna.png` });
  await page.locator('[data-xizmat-qidiruv]').fill('овал'); await page.waitForTimeout(400);
  R.qidiruv = await M(() => ({ n: document.querySelectorAll('[data-xizmat-qator]').length, birinchi: (document.querySelector('[data-xizmat-qator]') || {}).innerText || '' }));
  await page.locator('[data-xizmat-guruh="prisadka"]').click(); await page.waitForTimeout(300);
  R.prisadkaOval = await M(() => [...document.querySelectorAll('[data-xizmat-qator]')].map(e => e.innerText.split('\n')[0]));
  await page.locator('[data-xizmat-qator="780236010876"] [data-xizmat-soni]').fill('2');
  await page.locator('[data-xizmat-qator="780236010876"] [data-xizmat-qoshish]').click(); await page.waitForTimeout(500);
  R.ovalQoshilgan = await M(() => ({ bor: !!document.querySelector('[data-xizmat-qator="780236010876"] [data-xizmat-bor]'), matn: (document.querySelector('[data-xizmat-qator="780236010876"] [data-xizmat-bor]') || {}).innerText || '' }));
  await page.locator('[data-xizmat-qidiruv]').fill(''); await page.locator('[data-xizmat-guruh="rover"]').click(); await page.waitForTimeout(300);
  R.rover = await M(() => ({ n: document.querySelectorAll('[data-xizmat-qator]').length, manba: [...new Set([...document.querySelectorAll('[data-xizmat-manba]')].map(e => e.getAttribute('data-xizmat-manba')))] }));
  await page.locator('[data-xizmat-qidiruv]').fill("1 ta tig'li");
  await page.locator('[data-xizmat-qator] [data-xizmat-soni]').first().fill('3');
  await page.locator('[data-xizmat-qator] [data-xizmat-qoshish]').first().click(); await page.waitForTimeout(400);
  await page.locator('[data-xizmat-guruh="boshqa"]').click(); await page.locator('[data-xizmat-qidiruv]').fill('Yetkazib'); await page.waitForTimeout(300);
  R.smart3dKatalog = await M(() => { const q = document.querySelector('[data-xizmat-qator]'); return q ? { kod: q.getAttribute('data-xizmat-qator'), manba: (q.querySelector('[data-xizmat-manba]') || {}).getAttribute('data-xizmat-manba') } : null; });
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-oyna-rover.png` });
  await page.locator('[data-varaq="xizmat"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(500);
  await hisob();
  R.qoshOldin = await P();
  R.qoshQatorlar = await M(() => [...document.querySelectorAll('[data-qosh-qator]')].map(e => e.getAttribute('data-qosh-qator') + ' | ' + e.innerText.replace(/\s+/g, ' ')));
  /* miqdorni o'zgartirish: Rover ×3 → plus → 4; minus → 3; ОВАЛ ×2 → olib tashlash */
  const roverKod = await M(() => window.__app.doc.qoshXizmat.find(q => q.guruh === 'rover').kod);
  await page.locator(`[data-qosh-qator="${roverKod}"] [data-qosh-plus]`).click(); await hisob();
  R.plus = (await P()).qosh;
  await page.locator(`[data-qosh-qator="${roverKod}"] [data-qosh-minus]`).click(); await hisob();
  R.minus = (await P()).qosh;
  await page.locator('[data-qosh-qator="780236010876"] [data-qosh-olib]').click(); await hisob();
  R.olibQosh = { p: await P(), qator: await page.locator('[data-qosh-qator="780236010876"]').count() };
  /* qaytadan qo'shamiz (7-bo'lim uchun saqlanadigan holat): ОВАЛ ×2 */
  await page.locator('[data-xizmat-qosh]').click(); await page.locator('[data-varaq="xizmat"]').waitFor({ timeout: 8000 });
  await page.locator('[data-xizmat-qidiruv]').fill('780236010876'); await page.waitForTimeout(300);
  await page.locator('[data-xizmat-qator="780236010876"] [data-xizmat-soni]').fill('2');
  await page.locator('[data-xizmat-qator="780236010876"] [data-xizmat-qoshish]').click(); await page.waitForTimeout(300);
  await page.locator('[data-varaq="xizmat"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(500);
  await hisob();

  /* 6) narx tarkibi */
  await page.locator('[data-tarkib-tugma]').scrollIntoViewIfNeeded();
  await page.locator('[data-tarkib-tugma]').click(); await page.locator('[data-tarkib]').waitFor({ timeout: 5000 });
  R.tarkib = await M(() => {
    const bolimlar = [...document.querySelectorAll('[data-tarkib-bolim]')].map(b => ({ kod: b.getAttribute('data-tarkib-bolim'), jami: b.querySelector('[data-tarkib-jami]').innerText,
      qatorlar: [...b.querySelectorAll('[data-tarkib-qator]')].map(q => ({ matn: q.innerText.replace(/\s+/g, ' '), manba: (q.querySelector('[data-tarkib-manba]') || {}).innerText || '', qoida: (q.querySelector('[data-tarkib-qoida]') || {}).innerText || '' })) }));
    return { bolimlar, hammasi: document.querySelector('[data-tarkib-hammasi]').innerText, furnsiz: document.querySelector('[data-tarkib-furnsiz]').innerText };
  });
  R.tp = await P();
  R.tarkibKatta = await katta();
  await page.locator('[data-tarkib]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/narxTarkib-1440-tarkib.png` });
  await page.locator('[data-tarkib]').screenshot({ path: `${OUT}/narxTarkib-1440-tarkib-blok.png` });

  /* 7) saqlash va qayta ochish */
  const hozir = await P();
  await page.waitForTimeout(3500);
  R.payload = await M(() => { const d = window.__app.projectPayload().doc; return { raspil1: d.xizmatlar && d.xizmatlar.raspil1, ustama: d.ustama || null, qosh: (d.qoshXizmat || []).map(q => q.kod + '×' + q.soni) }; });
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(2500);
  for (let i = 0; i < 30 && !(await M(() => window.__app.res && window.__app.res.priceRes)); i++) await page.waitForTimeout(250);
  await hisob();
  R.qayta = await P(); R.hozir = hozir;

  /* 8) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  await click(/^Narx$/); await page.waitForTimeout(800);
  await page.locator('[data-tarkib-tugma]').scrollIntoViewIfNeeded();
  if (!(await page.locator('[data-tarkib]').count())) await page.locator('[data-tarkib-tugma]').click();
  await page.waitForTimeout(300);
  R.tel = await M(() => ({ hScroll: document.documentElement.scrollWidth > innerWidth + 1, tarkib: (() => { const r = (document.querySelector('[data-tarkib]') || { getBoundingClientRect: () => ({ left: 0, right: 0 }) }).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })() }));
  await page.locator('[data-tarkib]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/narxTarkib-390-tarkib.png` });
  await page.locator('[data-ustama]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/narxTarkib-390-ustama.png` });
  await page.locator('[data-xizmat-qosh]').scrollIntoViewIfNeeded();
  await page.locator('[data-xizmat-qosh]').click(); await page.locator('[data-varaq="xizmat"]').waitFor({ timeout: 8000 });
  R.telOyna = await M(() => { const v = document.querySelector('[data-varaq="xizmat"]').getBoundingClientRect(); return { sigadi: v.left >= -1 && v.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1, qatorlar: document.querySelectorAll('[data-xizmat-qator]').length }; });
  await page.screenshot({ path: `${OUT}/narxTarkib-390-oyna.png` });
  await page.locator('[data-varaq="xizmat"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);

  R.errs = errs;
  const s = R.s, f = R.furnsizOn;
  const bolim = (k) => R.tarkib.bolimlar.find(b => b.kod === k);
  const bolimJami = R.tarkib.bolimlar.map(b => raqam(b.jami)).reduce((a, b) => a + b, 0);
  R.ok = R.reset === 200
    /* 1 */ && R.sukut.ustamaToggle === 'false' && /Qo'shilmaydi \(0%\)/.test(R.sukut.ustamaMatn) && R.sukut.ustamaFoizInput === 0 && s.mk === 0 && s.jami === s.tannarx
    && R.sukut.prisadka === 'true' && s.hole > 0 && s.bazis === s.bazisQty * 5000 && s.bazisQty > 0 && R.bazisToggle.some(x => /Bazis loyiha/.test(x) && /16\/18\/19/.test(x))
    && R.sukut.raspil1 && R.sukut.raspil1.holat === 'bor' && /1 ta qo'shimcha raspil qo'shildi/.test(R.sukut.raspil1.matn) && s.r1.bor && s.r1.narx === 43000
    && R.katta0.label === 'Mijozga narx' && raqam(R.katta0.matn.replace(R.katta0.label, '')) === s.jami
    /* 2 */ && f.pressed === 'true' && f.katta.label === 'Mijozga narx (furniturasiz)' && raqam(f.katta.matn.replace(f.katta.label, '')) === s.furnsiz && s.furnsiz < s.jami && s.jami - s.furnsiz === s.hw
    && f.p.jami === s.jami && /Furniturasiz jami/.test(f.izoh) && R.furnsizOff.pressed === 'false' && raqam(R.furnsizOff.katta.matn.replace(R.furnsizOff.katta.label, '')) === s.jami
    /* 3 */ && R.u35.foiz === '35' && R.u35.p.mk === 0.35 && R.u35.p.jami === Math.round((s.sheetCost + s.hw) * 1.35) + s.tannarx - s.sheetCost - s.hw && R.u35.p.jami > s.jami
    && R.u20.mk === 0.2 && R.u20.jami < R.u35.p.jami && R.u125.mk === 0.125 && R.uTaklif.p.mk === 0.35 && R.uTaklif.foiz === '35' && R.uOff.p.mk === 0 && R.uOff.p.jami === s.jami && R.uOff.inputYoq === 0
    /* 4 */ && R.r1Olindi.holat === 'olingan' && /olib tashlandi/.test(R.r1Olindi.matn) && R.r1Olindi.tugma === 'Qaytarish' && !R.r1Olindi.p.r1.bor && R.r1Olindi.p.r1.mumkin && R.r1Olindi.p.raspil === s.raspil - 43000 && R.r1Olindi.p.jami === s.jami - 43000
    && R.r1Qaytdi.holat === 'bor' && R.r1Qaytdi.p.raspil === s.raspil && R.r1Qaytdi.p.jami === s.jami
    /* 5 */ && R.oyna0.qatorlar > 50 && ['hammasi', 'arra', 'kromka', 'prisadka', 'rover', 'bazis'].every(g => R.oyna0.guruhlar.some(x => x.startsWith(g + ':')))
    && R.qidiruv.n > 3 && R.prisadkaOval.length === 3 && R.prisadkaOval.every(x => /ОВАЛ/.test(x)) && R.ovalQoshilgan.bor && /Qo'shilgan: 2/.test(R.ovalQoshilgan.matn)
    && R.rover.n === 14 && R.rover.manba.includes('erp') && R.smart3dKatalog && R.smart3dKatalog.manba === 'taxmin'
    && R.qoshOldin.qosh === 2 * 10000 + 3 * 50000 && R.qoshQatorlar.length === 2 && R.qoshQatorlar.some(x => /ПРИСАДКА ОВАЛ КАТТА/.test(x) && /2 dona × 10 000 = 20 000/.test(x))
    && R.plus === 20000 + 4 * 50000 && R.minus === 20000 + 3 * 50000 && R.olibQosh.qator === 0 && R.olibQosh.p.qosh === 3 * 50000
    /* 6 */ && ['plita', 'kromka', 'raspil', 'prisadka', 'bazis', 'furnitura', 'qosh', 'ustama'].every(k => bolim(k)) && bolimJami === R.tp.jami && raqam(R.tarkib.hammasi) === R.tp.jami && R.tp.tarkibJami === R.tp.jami
    && raqam(R.tarkib.furnsiz) === R.tp.furnsiz && R.tarkibKatta.label === 'Mijozga narx'
    && R.tarkib.bolimlar.every(b => b.qatorlar.length > 0 && b.qatorlar.every(q => q.manba && q.qoida && /=/.test(q.matn) || b.kod === 'ustama'))
    && bolim('plita').qatorlar.every(q => /ERP|taxmin|mijoz/.test(q.manba)) && /ro'yxat narxi|ERP tannarx|tannarx/.test(bolim('plita').qatorlar[0].qoida)
    && bolim('bazis').qatorlar[0].qoida.includes('16, 18, 19') && !bolim('raspil').qatorlar.some(q => /\+1 qo'shimcha raspil/.test(q.qoida)) && R.s.raspilQoidalar.includes('raspil_qosh') && R.r1Qaytdi.p.raspilQoidalar.includes('raspil_qosh') && !R.r1Olindi.p.raspilQoidalar.includes('raspil_qosh')
    /* 7 */ && R.payload.raspil1 === false && R.payload.qosh.length === 2 && R.qayta.doc.xizmatlar && R.qayta.doc.xizmatlar.raspil1 === false && !R.qayta.r1.bor && R.qayta.qosh === R.hozir.qosh && R.qayta.jami === R.hozir.jami
    && R.qayta.doc.qosh && R.qayta.doc.qosh.length === 2
    /* 8 */ && !R.tel.hScroll && R.tel.tarkib && R.telOyna.sigadi && !R.telOyna.hScroll && R.telOyna.qatorlar > 50 && errs.length === 0;
}
