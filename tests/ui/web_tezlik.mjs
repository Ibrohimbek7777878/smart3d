/* TZ-19 §5: tezlik — telefon sharoitida (Lighthouse "sekin 4G": 1.6 Mbit/s, 150 ms, protsessor 4× sekin, 390 px)
 * birinchi ekran (FCP) va eng katta element (LCP). Maqsad: FCP ≤ 2.5 s. Kesh — bo'sh (birinchi kirish).
 * Ishlatish: bash tests/ui/web.sh tezlik   (TEZLIK_MBIT=0.4 — boshqa tezlik bilan) */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) { R.xato = String(e.message || e).split('\n')[0]; R.ok = false; }
  return R;
}

async function olch(page, url) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (+process.env.TEZLIK_MBIT || 1.6) * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  /* service worker keshi o'lchovni buzmasin */
  await page.evaluate(async () => { for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) await r.unregister(); for (const k of (await caches?.keys?.()) || []) await caches.delete(k); }, undefined, false).catch(() => {});
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => new Promise((res) => {
    const out = { fcp: 0, lcp: 0 };
    const p = performance.getEntriesByName('first-contentful-paint')[0]; if (p) out.fcp = Math.round(p.startTime);
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) out.lcp = Math.round(e[e.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res(out), 300);
  }), undefined, false);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.detach();
  return m;
}

async function asosiy(page, R) {
  await page.setViewportSize({ width: 390, height: 844 });
  const base = new URL(page.url()).origin + '/';   // TZ-30: ilova manzili /royxat, /loyiha/5 … bo'lishi mumkin
  R.sayt = await olch(page, base + '?t=' + Date.now());
  R.ilova = await olch(page, base + 'app.html?t=' + Date.now() + '#s=reg');
  R.ok = R.sayt.fcp > 0 && R.ilova.fcp > 0 && R.sayt.fcp <= 2500 && R.ilova.fcp <= 2500;
}
