/* Stoleshnitsa L burchak (3D): L oshxona 3800×3200 (AI'siz) → sahnadagi SP-ST-001 meshlari ustma-ust 0, xato yo'q;
 * skrinshot tests/ui/out/web/stoleshnitsa-L.png. Ishlatish: bash tests/ui/web.sh stoleshnitsa */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/stoleshnitsa-xato.png` }).catch(() => {});
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
  await fill('Jasur', 'Stol Usta'); await fill('jasur@', 'stol' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.waitForTimeout(400);   // TZ-25: bo'sh ish joyi (standart xona)
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  if (await has("O'tkazib yuborish")) { await click(/^O'tkazib yuborish$/); await page.waitForTimeout(300); }   // birinchi ochilish maslahatlari

  /* L oshxona (AI'siz tayyor so'rov) → stoleshnitsa 3D da: bo'laklar, ustma-ust, bo'shliq */
  await page.locator('[data-matn-menyu]').click({ timeout: 5000 }); await page.waitForTimeout(400);
  await tab("Tayyor so'rovlar"); await page.waitForTimeout(300);
  await V('[data-prompt="oshxona-l"]').click(); await page.waitForTimeout(300);
  await V('[data-maydon="eni"]').fill('3800'); await V('[data-maydon="chuqurligi"]').fill('3200');
  await V('[data-tayyor-qur]').click(); await page.waitForTimeout(2000);
  await page.keyboard.press('Escape').catch(() => {});
  R.oshxonaL = await holat();
  R.kitchen = await M(() => window.__app.doc.kitchen && { stol: window.__app.doc.kitchen.stoleshnitsa, moyka: !!(window.__app.doc.kitchen.moyka && window.__app.doc.kitchen.moyka.on) });
  /* sahnadagi stoleshnitsa meshlari: dunyo koordinatadagi chegara qutilari (x,z tekislik) */
  R.stol = await M(() => {
    const out = [];
    for (const m of window.__app.sahna.sp.groups.items.children) {
      const u = m.userData; if (!u || u.frg !== 'SP-ST-001') continue;
      /* mesh markazi + burilishi (placeMesh) → burchak nuqtalari: haqiqiy sahna holati */
      const c = Math.cos(m.rotation.z), s = Math.sin(m.rotation.z);
      const xs = [], ys = [];
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        xs.push(m.position.x + (sx * u.w / 2) * c - (sy * u.d / 2) * s);
        ys.push(m.position.y + (sx * u.w / 2) * s + (sy * u.d / 2) * c);
      }
      out.push([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), m.position.z - u.h / 2, u.h].map(Math.round));
    }
    return out;
  });
  const f = R.stol;
  let over = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
    over += Math.max(0, Math.min(f[i][1], f[j][1]) - Math.max(f[i][0], f[j][0])) * Math.max(0, Math.min(f[i][3], f[j][3]) - Math.max(f[i][2], f[j][2]));
  R.ustmaUst = over;
  await M(() => { const s = window.__app.sahna; if (s.sp.setView) try { s.sp.setView('iso'); } catch (e) {} });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/stoleshnitsa-L.png` });

  /* egasi #162: Oshxona elementlari → Stoleshnitsa qalinligi 38 mm tanlovi (sukut 26) */
  const stolHolat = () => M(() => { const d = window.__app.doc, ms = window.__app.sahna.sp.groups.items.children.map(m => m.userData).filter(u => u && u.frg === 'SP-ST-001'); return { t: d.kitchen.stolT, h: ms.map(u => u.h) }; });
  R.t26 = await stolHolat();
  await click(/^Xona$/); await page.waitForTimeout(700);
  R.chipSoni = await page.locator('[data-stol-t]').count();
  await page.locator('[data-stol-t="38"]').click(); await page.waitForTimeout(1200);
  R.t38 = await stolHolat();
  R.t38aria = await page.locator('[data-stol-t="38"]').getAttribute('aria-checked');
  await page.screenshot({ path: `${OUT}/stoleshnitsa-tanlov.png` });
  R.xatolar = errs;
  R.ok = f.length >= 2 && over === 0 && errs.length === 0 && R.chipSoni === 2 && R.t26.t === 26 && R.t26.h.every(h => h === 26)
    && R.t38.t === 38 && R.t38.h.length >= 2 && R.t38.h.every(h => h === 38) && R.t38aria === 'true';
}
