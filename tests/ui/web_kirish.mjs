/* TZ-09 2-bosqich: yangi frontend — email + parol bilan ro'yxat va kirish (haqiqiy server, sinov bazasi).
 * Ishlatish: bash tests/ui/web.sh kirish */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/kirish-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const tel = async (v) => { const el = page.locator('input[inputmode=numeric]').first(); await el.fill(''); await el.click(); await el.type(v); };
  const yangiSahifa = (hash) => page.goto(page.url().split(/[?#]/)[0] + '?t=' + Date.now() + (hash ? '#' + hash : ''));   // to'liq qayta yuklash
  const waitText = async (t, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };

  for (const [W, H] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: W, height: H });
    await M(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(page.url().split('#')[0]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/kirish-${W}-1-royxat.png` });
    await click(/^Kirish$/); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/kirish-${W}-2-kirish.png` });
    await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(500);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  R.qadam = '1)';
  /* 1) bo'sh forma — 4 ta xato, dizayn uslubida */
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(400);
  const t1 = await txt();
  R.boshForma = ['Ismingizni yozing', "Emailni to'g'ri yozing", "Telefon 9 raqam bo'lishi kerak", 'Parol kamida 8 belgi'].map(x => t1.includes(x));
  await page.screenshot({ path: `${OUT}/kirish-1440-3-xatolar.png` });

  R.qadam = '2)';
  /* 2) to'g'ri ro'yxat → onboarding; server: ism, email, telefon (S1), sex nomi */
  await fill('Jasur', 'Usta Sinov');
  await fill('jasur@', 'usta.web@test.uz');
  await tel('901112233');
  await fill('kamida 8', 'parol12345');
  await fill('Mebel-Pro', 'Sinov Sex');
  await click(/^Ro'yxatdan o'tish$/);
  R.onboarding = await waitText('Nima yasaymiz');
  R.server = await M(async () => {
    const t = JSON.parse(localStorage.getItem('smart3d.token') || 'null');
    const me = await (await fetch('/api/me', { headers: { authorization: 'Bearer ' + t } })).json();
    return { email: me.email, phone: me.phone, shop: me.shop, name: me.name };
  });
  R.serverTogri = R.server.phone === '998901112233' && R.server.shop === 'Sinov Sex' && R.server.email === 'usta.web@test.uz';

  R.qadam = '3)';
  /* 3) qayta ochilganda — kirgan holat saqlanadi, loyihalar ekrani */
  await page.goto(page.url().split('#')[0]); await page.waitForTimeout(2500);
  R.qaytaOchildi = await has('Loyihalarim');
  R.avatar = await M(() => [...document.querySelectorAll('header div')].map(d => d.textContent.trim()).find(t => t === 'US') || null);

  R.qadam = '4)';
  /* 4) chiqish (Sozlamalar sahifasi 7-bosqichda — hozircha kalitni o'chirish) → email esda, kirish */
  await M(() => { localStorage.removeItem('smart3d.token'); localStorage.removeItem('smart3d.user'); });
  await yangiSahifa('login'); await page.waitForTimeout(2000);
  R.emailEsda = await M(() => [...document.querySelectorAll('input[type=email]')].map(i => i.value)[0] || '');
  await fill('kamida 8', 'notogri-parol');
  await click(/^Kirish$/); await page.waitForTimeout(1200);
  R.notogriParol = await has("Email yoki parol noto'g'ri");
  await fill('kamida 8', 'parol12345');
  await click(/^Kirish$/);
  R.kirdi = await waitText('Loyihalarim');

  R.qadam = '5)';
  /* 5) takror email va takror telefon — dizayndagi xato matni */
  await M(() => { localStorage.removeItem('smart3d.token'); localStorage.removeItem('smart3d.user'); localStorage.removeItem('s3d-last-email'); });
  await yangiSahifa('reg'); await page.waitForTimeout(2000);
  await fill('Jasur', 'Boshqa Usta'); await fill('jasur@', 'usta.web@test.uz'); await tel('935556677'); await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(1200);
  R.takrorEmail = await has('Bu email bilan akkaunt bor — kirish');
  await fill('jasur@', 'boshqa.web@test.uz'); await tel('901112233');
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(1200);
  R.takrorTelefon = await has('Bu raqam bilan akkaunt bor — kirish');

  R.errs = errs;
  R.ok = R.boshForma.every(Boolean) && R.onboarding && R.serverTogri && R.qaytaOchildi && R.emailEsda === 'usta.web@test.uz' &&
    R.notogriParol && R.kirdi && R.takrorEmail && R.takrorTelefon && errs.length === 0;
}
