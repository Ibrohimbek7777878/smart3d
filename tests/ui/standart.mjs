/* TZ-14: sex standartlari — admin ekrandan o'zgartiradi (katalog darhol yangilanadi), usta faqat ko'radi.
   Node server bilan (run.sh 'standart'); admin: admin@smart3d.uz / ui-test-admin-1 (vaqtinchalik baza). */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const sel = '[data-tur="oshxona_pastki_2e"][data-k="w"]';
  const R = {};
  /* admin kirishi */
  await page.click('#acctBtn'); await page.waitForTimeout(200);
  await page.click('#acctAdminToggle');
  await page.fill('#acctEmail', 'admin@smart3d.uz'); await page.fill('#acctPass', 'ui-test-admin-1');
  await page.click('#acctAdminLogin'); await page.waitForTimeout(1200);
  R.admin = await M(() => document.getElementById('acctUser').textContent);
  await page.click('#acctStd'); await page.waitForTimeout(300);
  R.adminOyna = await M((s) => ({ ochiq: !document.getElementById('stdModal').hidden, saqlashTugmasi: !document.getElementById('stdSave').classList.contains('hidden'),
    tahrirlanadi: !document.querySelector(s + '[data-f="max"]').disabled, turlar: document.querySelectorAll('#stdBody .std-tur').length }), sel);
  /* noto'g'ri qiymat — xato ko'rsatiladi */
  await page.fill(sel + '[data-f="min"]', '900'); await page.fill(sel + '[data-f="max"]', '800');
  await page.click('#stdSave'); await page.waitForTimeout(500);
  R.notogri = await M(() => document.getElementById('stdErr').textContent);
  /* to'g'ri qiymat — katalog darhol yangilanadi */
  await page.fill(sel + '[data-f="min"]', '600'); await page.fill(sel + '[data-f="max"]', '1100');
  await page.click('#stdSave'); await page.waitForTimeout(800);
  R.saqlandi = await M(() => ({ yopildi: document.getElementById('stdModal').hidden, katalogMax: window.__s3d.state.catalog['MC-KP-02'].max_w }));
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(300);
  R.karta = await M(() => document.querySelector('#catGrid .cat-card[data-code="MC-KP-02"] .cc-range').textContent);
  /* usta — faqat ko'radi */
  await page.click('#acctBtn'); await page.waitForTimeout(300);
  await page.click('#acctLogout'); await page.waitForTimeout(200); await page.click('#askOk'); await page.waitForTimeout(300);
  await page.click('#acctBtn'); await page.waitForTimeout(300);
  R.chiqqandanSmsRejimi = await M(() => !document.getElementById('acctSend').classList.contains('hidden') && document.getElementById('acctAdminBox').classList.contains('hidden'));
  await page.fill('#acctPhone', ''); await page.type('#acctPhone', '901112299');
  await page.click('#acctSend'); await page.waitForTimeout(600);
  const code = await M(() => (document.getElementById('acctDev').textContent.match(/\d{6}/) || [''])[0]);
  await page.fill('#acctCode', code); await page.click('#acctVerify'); await page.waitForTimeout(1500);
  await page.click('#acctStd'); await page.waitForTimeout(300);
  R.usta = await M((s) => ({ izoh: !document.getElementById('stdNote').classList.contains('hidden'), saqlashYoq: document.getElementById('stdSave').classList.contains('hidden'),
    yopiq: document.querySelector(s + '[data-f="max"]').disabled, qiymat: document.querySelector(s + '[data-f="max"]').value }), sel);
  /* qayta ochilganda server standartlari (1100) */
  await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 }); await page.waitForTimeout(1200);
  R.qaytaOchildi = await M(() => window.__s3d.state.catalog['MC-KP-02'].max_w);
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
