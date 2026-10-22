/* Muharrir sarlavhasi telefonda (320–560px) sig'adi: gorizontal surilish yo'q, loyiha nomi maydoni ≥ 80px, narx va avatar to'liq ko'rinadi —
 * oddiy usta ham, admin ham (admin: "Til" + "Admin panel" bitta "Menyu" ikonasida). Kompyuterda (1440px) tugmalar o'z joyida.
 * Ishlatish: bash tests/ui/web.sh sarlavha */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/sarlavha-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const ENLAR = [320, 340, 360, 375, 390, 412, 430, 480, 540, 560, 561, 640, 768, 980];

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const orgn = () => new URL(page.url()).origin;
  const editorTayyor = async () => {
    await page.locator('[data-ishjoyi]').waitFor({ timeout: 20000 });
    await page.locator('[data-tez="kitchen"]').click();
    for (let i = 0; i < 80 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.res)); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(800);
  };
  /* sarlavha o'lchovi: hujjat kengligi, nom maydoni, narx/avatar ekran ichida, ko'rinadigan bolalar chegaradan chiqmaydi */
  const olchov = () => M(() => {
    const h = document.querySelector('header'), iw = window.innerWidth;
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; };
    const korinadi = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== 'none'; };
    const narxTugma = [...h.querySelectorAll('button')].find(b => b.dataset.sarl === 'narx');
    const bolalar = [...h.querySelectorAll('*')].filter(korinadi).map(e => e.getBoundingClientRect());
    return {
      sw: document.documentElement.scrollWidth, iw, hsw: h.scrollWidth,
      label: r(h.querySelector('label')), input: r(h.querySelector('label input')), avatar: r(h.querySelector('[data-sozlamalar]')), narx: r(narxTugma),
      menyu: (() => { const e = h.querySelector('[data-sarl="menyu"]'); return e ? korinadi(e) : false; })(),
      til: (() => { const e = h.querySelector('[data-til-menyu]'); return e ? korinadi(e) : false; })(),
      admin: (() => { const e = h.querySelector('[data-admin-havola]'); return e ? korinadi(e) : false; })(),
      chiqqan: bolalar.filter(b => b.right > iw + 0.5 || b.left < -0.5).length
    };
  });
  const sigdi = (o, w) => o.sw <= w && o.hsw <= w && o.avatar && o.avatar.r <= w && o.narx && o.narx.r <= w && o.chiqqan === 0;
  async function tekshir(tag, R2) {
    const yomon = [];
    for (const w of ENLAR) {
      await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(300);
      const o = await olchov();
      R2[w] = { sw: o.sw, nom: o.label && o.label.w, input: o.input && o.input.w, avatar: o.avatar && o.avatar.r, menyu: o.menyu, til: o.til, admin: o.admin };
      const telefon = w <= 560;
      const nomOk = !telefon || (o.label.w >= 80 && o.input.w >= 80);
      if (!sigdi(o, w) || !nomOk) yomon.push(w);
      if (w === 320 || w === 360 || w === 390 || w === 430) await page.screenshot({ path: `${OUT}/sarlavha-${tag}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 160 } });
    }
    return yomon;
  }

  /* 1) oddiy usta */
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Sarlavha Usta'); await fill('jasur@', 'sarlavha' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await editorTayyor();
  R.ustaEnlar = {};
  R.ustaYomon = await tekshir('usta', R.ustaEnlar);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
  const u1440 = await olchov();
  R.usta1440 = { til: u1440.til, admin: u1440.admin, menyu: u1440.menyu, nomInput: u1440.input && u1440.input.w, sw: u1440.sw };
  await page.screenshot({ path: `${OUT}/sarlavha-usta-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });

  /* 2) admin */
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1'); await click(/^Kirish$/);
  await editorTayyor();
  R.adminEnlar = {};
  R.adminYomon = await tekshir('admin', R.adminEnlar);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
  const a1440 = await olchov();
  R.admin1440 = { til: a1440.til, admin: a1440.admin, menyu: a1440.menyu, nomInput: a1440.input && a1440.input.w, sw: a1440.sw };
  await page.screenshot({ path: `${OUT}/sarlavha-admin-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });

  /* 3) admin, telefon: Menyu — tillar + Admin panel; Esc yopadi; Admin panel ochadi */
  await page.setViewportSize({ width: 360, height: 800 }); await page.waitForTimeout(400);
  const ay = await olchov();
  R.menyuTel = { menyu: ay.menyu, tilYashirin: !ay.til, adminYashirin: !ay.admin };
  await page.locator('[data-sarl="menyu"]').click(); await page.waitForTimeout(300);
  R.menyuOchiq = await M(() => { const m = document.querySelector('[data-sarl="menyu-royxat"]'); if (!m) return null; const b = m.getBoundingClientRect(); return { tillar: m.querySelectorAll('[role=menuitemradio]').length, admin: !!m.querySelector('[data-sarl="menyu-admin"]'), ichkarida: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight }; });
  await page.screenshot({ path: `${OUT}/sarlavha-admin-menyu-360.png` });
  const ekranOldin = await M(() => window.__app.state.screen);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  R.escYopdi = await M(() => !document.querySelector('[data-sarl="menyu-royxat"]'));
  R.escEkran = ekranOldin === 'app' && (await M(() => window.__app.state.screen)) === 'app';
  await page.locator('[data-sarl="menyu"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-sarl="menyu-royxat"] [role=menuitemradio][lang=ru]').click(); await page.waitForTimeout(500);
  R.ruTil = await M(() => ({ lang: document.documentElement.lang, yopiq: !document.querySelector('[data-sarl="menyu-royxat"]'), aria: document.querySelector('[data-sarl="menyu"]').getAttribute('aria-label') }));
  await page.locator('[data-sarl="menyu"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-sarl="menyu-royxat"] [role=menuitemradio][lang=uz]').click(); await page.waitForTimeout(400);
  await page.locator('[data-sarl="menyu"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-sarl="menyu-admin"]').click(); await page.waitForTimeout(1500);
  R.adminOchildi = new URL(page.url()).pathname;

  /* 4) boshqa ekranlar (sarlavha: loyihalar) ham sig'adi — admin, 320px */
  await page.goto(orgn() + '/loyihalar'); await page.waitForTimeout(1800);
  await page.setViewportSize({ width: 320, height: 700 }); await page.waitForTimeout(400);
  const lo = await olchov();
  R.loyihalar320 = { sw: lo.sw, avatar: lo.avatar && lo.avatar.r, til: lo.til, admin: lo.admin, menyu: lo.menyu };

  R.xatolar = errs;
  R.ok = R.ustaYomon.length === 0 && R.adminYomon.length === 0
    && R.usta1440.til && !R.usta1440.admin && !R.usta1440.menyu && R.usta1440.nomInput >= 150
    && R.admin1440.til && R.admin1440.admin && !R.admin1440.menyu && R.admin1440.nomInput >= 150
    && R.menyuTel.menyu && R.menyuTel.tilYashirin && R.menyuTel.adminYashirin
    && !!R.menyuOchiq && R.menyuOchiq.tillar === 3 && R.menyuOchiq.admin && R.menyuOchiq.ichkarida
    && R.escYopdi && R.escEkran && R.ruTil.lang === 'ru' && R.ruTil.yopiq && R.ruTil.aria === 'Меню'
    && /^\/admin/.test(R.adminOchildi)
    && R.loyihalar320.sw <= 320 && R.loyihalar320.avatar <= 320 && R.loyihalar320.til && R.loyihalar320.admin && !R.loyihalar320.menyu
    && errs.length === 0;
}
