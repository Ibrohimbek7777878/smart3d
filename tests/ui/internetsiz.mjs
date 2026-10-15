/* TZ-09: yangi frontend internetsiz ochiladimi — bir marta ochiladi (service worker keshlaydi),
 * keyin internet uziladi va sayt, ilova, ma'lumot fayllari qayta yuklanadi. Ishlatish: tests/ui/internetsiz.sh */
export default async function run(page) {
  const base = page.url().replace(/[^/]*$/, '');
  const R = {};
  const M = (fn, arg) => page.evaluate(fn, arg, false);   // MAIN world — serviceWorker faqat shu yerda
  for (let i = 0; i < 60 && !(await M(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller))); i++) await page.waitForTimeout(500);
  if (!(await M(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)))) {
    await page.reload();
    for (let i = 0; i < 60 && !(await M(() => !!navigator.serviceWorker.controller)); i++) await page.waitForTimeout(500);
  }
  R.swBoshqaryapti = await M(() => !!navigator.serviceWorker.controller);
  /* oldindan keshlash tugashini kutish */
  await M(async () => { await navigator.serviceWorker.ready; });
  await page.waitForTimeout(3000);

  await page.context().setOffline(true);
  for (const [k, u, matn] of [['sayt', base, 'Mebelni'], ['ilova', base + 'app.html', "Ro'yxatdan o'tish"]]) {
    const r = await page.goto(u).then(x => x && x.status()).catch(e => 'XATO: ' + e.message.split('\n')[0]);
    await page.waitForTimeout(1500);
    R[k] = { javob: r, matnBor: await M(t => document.body.innerText.includes(t), matn) };
  }
  R.malumot = await M(async () => {
    const out = {};
    for (const n of ['fragments.json', 'fragments-mc.json', 'materials.json', 'sheet-catalog.json', 'furnitura-catalog.json']) {
      try { const j = await (await fetch('data/' + n)).json(); out[n] = Array.isArray(j) ? j.length : Object.keys(j).length; }
      catch (e) { out[n] = 'XATO'; }
    }
    return out;
  });
  await page.context().setOffline(false);
  R.ok = R.sayt.matnBor && R.ilova.matnBor && Object.values(R.malumot).every(v => v !== 'XATO');
  return R;
}
