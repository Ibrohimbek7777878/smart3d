/* #230: kirish oynasidagi shkaf yuqoridan YOPIQ (bezak stoleshnitsa, deco:true), lekin hisobga kirmaydi.
 * Ishlatish: bash tests/ui/web.sh ustiYopiq */
export default async function run(page) {
  const R = {};
  try {
    const OUT = process.env.QA_OUT;
    const { s3Spec } = await import(process.cwd() + '/web/src/shared/design3d/engine.js');
    const sp = s3Spec('kp', 600);
    const deco = sp.parts.filter(p => p.deco), asl = sp.parts.filter(p => !p.deco);
    R.decoBor = deco.length === 1 && deco[0].dir[1] > 0 && !deco[0].lab;
    R.detal10 = sp.stats.detal === 10 && sp.list.length === 7 && !sp.list.some(x => /Stolesh/.test(x.name));
    R.aslQismlar = asl.reduce((a, p) => a + p.n, 0) === 16 && deco[0].size[1] > 0;
    for (const [W, H] of [[1440, 900], [390, 844]]) {
      await page.setViewportSize({ width: W, height: H });
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); }, null, false);
      await page.goto(page.url().split('#')[0]);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/usti-${W}-1-oddiy.png` });
      const cv = page.locator('canvas').first();
      if (await cv.count()) {
        const b = await cv.boundingBox();
        if (b) { const x = b.x + b.width / 2, y = b.y + b.height / 2;
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 140, { steps: 12 }); await page.mouse.up();
          await page.waitForTimeout(600); }
      }
      await page.screenshot({ path: `${OUT}/usti-${W}-2-yuqoridan.png` });
    }
    R.ok = R.decoBor && R.detal10 && R.aslQismlar;
  } catch (e) { R.xato = String(e.message || e).split('\n')[0]; R.ok = false; }
  return R;
}
