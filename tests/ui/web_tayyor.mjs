/* TZ-24 B: tayyor so'rovlar va shaxsiy shablonlar (AI oynasida). Tekshiriladi: kategoriyalar va so'rovlar (uch tilda nom),
 * L oshxona 3800×3200 — AI'siz konstruktor bilan quriladi (tasdiqdan keyin); yotoqxona — katalog modullari; shablon:
 * so'rov va loyiha saqlanadi, ochiladi, o'chiriladi; telefon (390) — sig'adi. Ishlatish: bash tests/ui/web.sh tayyor */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/tayyor-xato.png` }).catch(() => {});
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
  const V = (sel, o) => page.locator('[data-varaq="ai"] ' + sel, o);
  const tab = (nom) => V('[data-ai-tab] button', { hasText: nom }).click();
  const holat = () => M(() => { const d = window.__app.doc; return { n: d.placements.length, w: Math.max(...d.room.outline.map(p => p[0])), d: Math.max(...d.room.outline.map(p => p[1])), frg: d.placements.map(p => p.frg), nom: window.__app.state.name }; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Tayyor Usta'); await fill('jasur@', 'tayyor' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Boshqa mebel$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  if (await has("O'tkazib yuborish")) { await click(/^O'tkazib yuborish$/); await page.waitForTimeout(300); }   // birinchi ochilish maslahatlari

  /* 1) AI oynasi → Tayyor so'rovlar */
  await page.locator('button[aria-label="AI"]').click({ timeout: 5000 }); await page.waitForTimeout(400);
  R.tablar = await M(() => [...document.querySelectorAll('[data-ai-tab] button')].map(b => b.innerText.trim()));
  await tab("Tayyor so'rovlar"); await page.waitForTimeout(300);
  R.kategoriyalar = await M(() => document.querySelectorAll('[data-tayyor-kat] button').length);
  R.oshxona = await M(() => [...document.querySelectorAll('[data-tayyor-royxat] button')].map(b => b.getAttribute('data-prompt')));
  await V('[data-prompt="oshxona-l"]').click(); await page.waitForTimeout(300);
  await V('[data-maydon="eni"]').fill('3800'); await V('[data-maydon="chuqurligi"]').fill('3200');
  await page.screenshot({ path: `${OUT}/tayyor-1440-forma.png` });
  await V('[data-tayyor-qur]').click(); await page.waitForTimeout(1500);
  R.oshxonaL = await holat();
  R.oshxonaShakl = await M(() => window.__app.doc.placements.some(p => p.rot === 90 || p.rot === 270));
  R.narx = await M(() => window.__app.res && window.__app.res.priceRes.total);
  await page.screenshot({ path: `${OUT}/tayyor-1440-oshxona.png` });

  /* 2) yotoqxona — mebel bor, avval tasdiq so'raladi */
  await page.locator('button[aria-label="AI"]').click(); await page.waitForTimeout(300);
  await V('[data-tayyor-kat] button', { hasText: 'Yotoqxona' }).click(); await page.waitForTimeout(200);
  await V('[data-prompt="yotoqxona"]').click(); await page.waitForTimeout(200);
  await V('[data-tayyor-qur]').click(); await page.waitForTimeout(500);
  R.tasdiq = await has('Loyihani almashtirasizmi');
  await click(/^Almashtirish$/); await page.waitForTimeout(1500);
  R.yotoqxona = await holat();

  /* 3) shablonlar: so'rov va loyiha saqlanadi, ochiladi, o'chiriladi */
  await page.locator('button[aria-label="AI"]').click(); await page.waitForTimeout(300);
  await tab('Shablonlarim'); await page.waitForTimeout(800);
  await V('[data-shablon-nom]').fill('Mening yotoqxonam');
  await V('[data-shablon-loyiha]').click(); await page.waitForTimeout(1000);
  await tab("Tayyor so'rovlar"); await V('[data-tayyor-kat] button', { hasText: 'Oshxona' }).click();
  await V('[data-prompt="oshxona-togri"]').click(); await V('[data-maydon="eni"]').fill('3300');
  await tab('Shablonlarim'); await page.waitForTimeout(500);
  await V('[data-shablon-nom]').fill("Ko'p so'raladigan oshxona");
  await V('[data-shablon-prompt]').click(); await page.waitForTimeout(1000);
  R.shablonlar = await M(() => [...document.querySelectorAll('[data-shablon-royxat] > div')].map(d => d.innerText.replace(/\s+/g, ' ')));
  await page.screenshot({ path: `${OUT}/tayyor-1440-shablon.png` });
  /* so'rov shablonini ochish → to'g'ri oshxona 3300 */
  await V('[data-shablon-royxat] > div button', { hasText: "Ko'p so'raladigan oshxona" }).click(); await page.waitForTimeout(500);
  if (await has('Loyihani almashtirasizmi')) { await click(/^Almashtirish$/); await page.waitForTimeout(1500); }
  R.promptdan = await holat();
  /* loyiha shablonini ochish → yotoqxona qaytadi */
  await page.locator('button[aria-label="AI"]').click(); await page.waitForTimeout(300);
  await tab('Shablonlarim'); await page.waitForTimeout(800);
  await V('[data-shablon-royxat] > div button', { hasText: 'Mening yotoqxonam' }).click(); await page.waitForTimeout(500);
  if (await has('Loyihani almashtirasizmi')) { await click(/^Almashtirish$/); await page.waitForTimeout(1500); }
  R.loyihadan = await holat();
  /* o'chirish */
  await page.locator('button[aria-label="AI"]').click(); await page.waitForTimeout(300);
  await tab('Shablonlarim'); await page.waitForTimeout(800);
  await V('[data-shablon-royxat] > div button[aria-label="O\'chirish"]').first().click(); await page.waitForTimeout(300);
  await page.locator('[role="dialog"] button, [role="alertdialog"] button', { hasText: "O'chirish" }).last().click().catch(() => {});
  await page.waitForTimeout(1000);
  R.qoldi = await M(() => document.querySelectorAll('[data-shablon-royxat] > div').length);

  /* 4) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await tab("Tayyor so'rovlar"); await page.waitForTimeout(300);
  await V('[data-tayyor-kat] button', { hasText: 'Mehmonxona' }).click(); await V('[data-prompt="mehmonxona-tv"]').click(); await page.waitForTimeout(300);
  R.tel = await M(() => { const v = document.querySelector('[data-varaq="ai"]'); const r = v && v.getBoundingClientRect(); return { sigadi: !!r && r.left >= 0 && r.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/tayyor-390.png` });

  R.errs = errs;
  R.ok = R.tablar.length === 3 && R.kategoriyalar === 8 && R.oshxona.includes('oshxona-l') && R.oshxona.includes('oshxona-u') &&
    R.oshxonaL.n > 10 && R.oshxonaL.w === 3800 && R.oshxonaL.d === 3200 && R.oshxonaShakl && R.narx > 0 && /Burchakli/.test(R.oshxonaL.nom) &&
    R.tasdiq && R.yotoqxona.n === 3 && R.yotoqxona.frg.includes('MC-KR-04') &&
    R.shablonlar.length === 2 && R.promptdan.w === 3300 && R.promptdan.n > 5 && R.loyihadan.n === 3 && R.loyihadan.frg.includes('MC-KR-04') &&
    R.qoldi === 1 && R.tel.sigadi && !R.tel.hScroll && errs.length === 0;
}
