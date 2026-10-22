/* Admin "Modullar katalogi" telefonda (390/360/320px): qator ichidagi yozuvlar ustma-ust tushmaydi ("O'lcham (mm)" ustiga "Eni", "Chuqurlik" ustiga
 * "Narx rejimi"), gorizontal surilish yo'q; modul turi xom ingliz so'zi ("cabinet") emas — uz/ru/en tarjimada. HAQIQIY server.
 * Ishlatish: bash tests/ui/web.sh katalogMobil */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/katalogMobil-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const orgn = () => new URL(page.url()).origin;
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1'); await click(/^Kirish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 20000 });

  /* qator ichidagi katakchalar: matn qoplamasi (Range) bir-biriga kirmaydi va o'z katagidan chiqmaydi */
  const ustmaUst = () => M(() => {
    const yomon = []; let jami = 0;
    for (const q of document.querySelectorAll('[data-kat-qator]')) {
      const kataklar = [...q.children].filter(c => { const b = c.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      const qoplam = kataklar.map(c => { const r = document.createRange(); r.selectNodeContents(c); const b = r.getBoundingClientRect(); return { c, l: b.left, r: b.right, t: b.top, b: b.bottom, bo: b.width > 0 }; });
      jami++;
      kataklar.forEach((c, i) => { if (c.scrollWidth > c.clientWidth + 1) yomon.push(q.dataset.katQator + ': katakdan chiqdi #' + i); });
      for (let i = 0; i < qoplam.length; i++) for (let j = i + 1; j < qoplam.length; j++) {
        const a = qoplam[i], b = qoplam[j]; if (!a.bo || !b.bo) continue;
        if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1) yomon.push(q.dataset.katQator + ': ' + i + ' va ' + j + ' ustma-ust');
      }
    }
    return { jami, yomon: yomon.slice(0, 5), soni: yomon.length };
  });
  const skroll0 = () => M(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const XOM = ['cabinet', 'kitchen', 'wardrobe', 'bathroom', 'sofa', 'table', 'chair', 'bed', 'shelf', 'door', 'window', 'tall_cabinet', 'drawer_base', 'wall_cabinet', 'cargo_base', 'wall_corner', 'desk', 'mobile_pedestal', 'coat_hanger', 'appliance', 'vanity', 'mirror_cabinet', 'countertop', 'filler'];
  /* xom ingliz kodi (aynan "cabinet", "wall_cabinet"…) qatorlarda va suzgich ro'yxatida yo'q */
  const xom = () => M((kodlar) => {
    const qatorlar = [...document.querySelectorAll('[data-kat-qator]')].flatMap(e => e.innerText.split('\n')).map(x => x.split(' · ')[0].trim());
    const opsiyalar = [...document.querySelectorAll('[data-kat-suzgich="kategoriya"] option')].slice(1).map(o => o.textContent.replace(/\s*\(\d+\)$/, '').trim());
    return [...qatorlar, ...opsiyalar].some(x => kodlar.includes(x));
  }, XOM);

  /* til — sarlavhadagi menyu orqali (akkauntga ham saqlanadi): web.sh da suitlar bitta bazani bo'lishadi, localStorage dagi til akkaunt tiliga yutqazadi */
  const tilTanla = async (kod) => {
    const menyu = page.locator('[data-sarl="menyu"], [data-til-menyu]');
    for (let i = 0, n = await menyu.count(); i < n; i++) { const b = menyu.nth(i); if (await b.isVisible()) { await b.click(); break; } }
    await page.locator(`[role=menuitemradio][lang=${kod}]`).click(); await page.waitForTimeout(500);
  };
  R.enlar = {};
  for (const til of ['uz', 'ru', 'en']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(orgn() + '/admin/katalog'); await page.locator('[data-kat-qator]').first().waitFor({ timeout: 15000 });
    await tilTanla(til);
    for (const w of [390, 360, 320]) {
      await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(500);
      const u = await ustmaUst();
      R.enlar[til + w] = { qator: u.jami, ustma: u.soni, misol: u.yomon[0] || null, skroll: await skroll0(), xom: await xom(), til: await M(() => document.documentElement.lang) };
      if (w === 390) await page.screenshot({ path: `${OUT}/katalogMobil-${til}-390.png`, clip: { x: 0, y: 0, width: 390, height: 700 } });
    }
  }
  /* tarjima: birinchi qatordagi tur nomi (SP-K-001 — "cabinet") */
  R.tur = {};
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const til of ['uz', 'ru', 'en']) {
    await tilTanla(til); await page.waitForTimeout(300);
    await page.locator('[data-kat="qidir"]').fill('SP-K-001'); await page.waitForTimeout(300);
    R.tur[til] = await M(() => (document.querySelector('[data-kat-qator]') || { innerText: '' }).innerText.replace(/\s+/g, ' '));
    R.tur[til + '_filtr'] = await M(() => [...document.querySelectorAll('[data-kat-suzgich="kategoriya"] option')].slice(1, 4).map(o => o.textContent));
  }
  await tilTanla('uz');
  R.xatolar = errs;
  const hammasi = Object.values(R.enlar);
  R.ok = hammasi.length === 9 && hammasi.every(x => x.qator > 100 && x.ustma === 0 && x.skroll && !x.xom) && ['uz', 'ru', 'en'].every(k => hammasi.filter(x => x.til === k).length === 3)
    && /Shkaf|Savat|shkaf/i.test(R.tur.uz) && !/cabinet/.test(R.tur.uz) && /Шкаф|шкаф/.test(R.tur.ru) && /Cabinet/.test(R.tur.en) && errs.length === 0;
}
