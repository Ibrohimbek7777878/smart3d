/* TZ-07: telefon + SMS kirish, avtomatik saqlash, qayta ochish, internetsiz navbat, loyihalar.
   Node server bilan ishlaydi (run.sh 'kirish' uchun vaqtinchalik bazada server ochadi; SMS — dev_code). */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  await page.setViewportSize({ width: 1366, height: 768 });
  const boot = async () => { await page.reload(); await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 }); await page.waitForTimeout(800); };
  await boot();
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const serverCount = () => M(async () => {
    const t = JSON.parse(localStorage.getItem('smart3d.token')), u = JSON.parse(localStorage.getItem('smart3d.user'));
    const id = JSON.parse(localStorage.getItem('smart3d.current.' + u.id));
    let r;                                                  // tarmoq emulyatsiyasi qaytguncha qayta urinish (test barqarorligi)
    for (let i = 0; i < 5; i++) { try { r = await fetch('/api/projects/' + id, { headers: { authorization: 'Bearer ' + t } }); break; } catch (e) { await new Promise(z => setTimeout(z, 600)); } }
    const j = await r.json();
    return { id, n: j.doc.doc.placements.length, name: j.name };
  });
  const R = {};
  R.tugmaKorinadi = await M(() => !document.getElementById('acctBtn').classList.contains('hidden'));
  /* 1) kirish */
  await page.click('#acctBtn'); await page.waitForTimeout(200);
  await page.fill('#acctPhone', '');
  await page.type('#acctPhone', '901112233');
  R.maska = await M(() => document.getElementById('acctPhone').value);
  await page.fill('#acctName', 'Usta Test');
  await page.click('#acctSend'); await page.waitForTimeout(600);
  const code = await M(() => (document.getElementById('acctDev').textContent.match(/\d{6}/) || [''])[0]);
  R.kodKeldi = /^\d{6}$/.test(code);
  await page.fill('#acctCode', code);
  await page.click('#acctVerify'); await page.waitForTimeout(1500);
  R.kirdi = await M(() => ({ user: document.getElementById('acctUser').textContent, royxat: document.querySelectorAll('#acctList .acct-item').length,
    tugma: document.getElementById('acctBtn').classList.contains('is-in') }));
  await page.click('#acctClose2');
  /* 2) o'zgarish → 2 soniyada serverga */
  const n0 = await M(() => window.__s3d.state.doc.placements.length);
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(200);
  await page.click('#catGrid .cat-card[data-code="MC-KP-02"]'); await page.waitForTimeout(3000);
  R.saqlandi = { holat: await M(() => document.getElementById('saveState').dataset.kind), ekranda: n0 + 1, serverda: (await serverCount()).n };
  /* 3) qayta ochish — namuna emas, serverdagi loyiha */
  await boot(); await page.waitForTimeout(800);
  R.qaytaOchildi = { ekranda: await M(() => window.__s3d.state.doc.placements.length), kutilgan: n0 + 1 };
  /* 4) internetsiz — navbat; internet qaytganda yuboriladi */
  await page.context().setOffline(true);
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(200);
  await page.click('#catGrid .cat-card[data-code="MC-KP-01"]'); await page.waitForTimeout(3000);
  R.internetsiz = { holat: await M(() => document.getElementById('saveState').dataset.kind), navbat: await M(() => !!localStorage.getItem('smart3d.pending')) };
  await page.context().setOffline(false); await page.waitForTimeout(2500);
  R.internetQaytdi = { holat: await M(() => document.getElementById('saveState').dataset.kind), serverda: (await serverCount()).n, kutilgan: n0 + 2,
    navbatBosh: await M(() => !localStorage.getItem('smart3d.pending')) };
  /* 5) yangi loyiha → serverda ikkinchi loyiha; o'chirish → ro'yxatdan yo'qoladi */
  await page.click('#acctBtn'); await page.waitForTimeout(500);
  await page.click('#acctNew'); await page.waitForTimeout(200);
  if (await M(() => !document.getElementById('askModal').hidden)) await page.click('#askOk');
  await page.waitForTimeout(3000);
  await page.click('#acctBtn'); await page.waitForTimeout(800);
  R.ikkiLoyiha = await M(() => document.querySelectorAll('#acctList .acct-item').length);
  await page.click('#acctList .acct-item:not(.is-current) .btn.ghost'); await page.waitForTimeout(200);
  await page.click('#askOk'); await page.waitForTimeout(800);
  R.ochirilgandan = await M(() => document.querySelectorAll('#acctList .acct-item').length);
  /* 6) chiqish */
  await page.click('#acctLogout'); await page.waitForTimeout(200); await page.click('#askOk'); await page.waitForTimeout(300);
  R.chiqdi = await M(() => !document.getElementById('acctBtn').classList.contains('is-in') && !localStorage.getItem('smart3d.token'));
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
