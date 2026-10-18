/* TZ-23 C1 (egasi #138): sexga buyurtma. Tekshiriladi: Narx panelida "Buyurtma berish" → varaq (loyiha, modul soni, summa);
 * ism yoki telefon bo'lmasa — yuborilmaydi; yuborilgach — server buyurtmani to'liq loyiha bilan saqlaydi (telefon S1: 998XXXXXXXXX,
 * summa — Narx panelidagi); "Loyihalarim"da "Buyurtmalarim" — holati "Yangi"; admin Sozlamalarda holatni "Qabul qilindi" qiladi →
 * usta ro'yxatida ham shunday. Telefon (390) — varaq sig'adi. Ishlatish: bash tests/ui/web.sh buyurtma */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/buyurtma-xato.png` }).catch(() => {});
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
  const waitText = async (s, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const chiqish = () => M(async () => { await fetch('/api/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  const kirish = async (em, pw) => {
    await page.goto(page.url().split('#')[0].split('?')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
    await fill('jasur@', em); await fill('kamida 8', pw);
    await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  };
  const ustaQatorlar = () => M(() => [...document.querySelectorAll('[data-buyurtmalar="usta"] [data-buyurtma]')].map(d => ({ id: +d.dataset.buyurtma, holat: (d.querySelector('[data-holat]') || {}).dataset?.holat, matn: d.innerText.replace(/\s+/g, ' ') })));

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  const email = 'buyurtma' + Date.now() + '@test.uz', parol = 'parol12345';
  await fill('Jasur', 'Buyurtma Usta'); await fill('jasur@', email);
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', parol);
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  R.bosh = await M(() => !document.querySelector('[data-buyurtmalar]'));

  /* 1) Narx paneli → "Buyurtma berish" → varaq */
  await page.locator('[data-tez="kitchen"]').click();
  for (let i = 0; i < 60 && !(await M(() => window.__app.res && window.__app.doc.placements.length)); i++) await page.waitForTimeout(250);
  await click(/^Narx$/); await page.waitForTimeout(1000);
  R.tugma = await page.locator('[data-buyurtma-ber]').count();
  const jami = await M(() => Math.round(window.__app.res.priceRes.total));
  const nMebel = await M(() => window.__app.doc.placements.length);
  await page.locator('[data-buyurtma-ber]').click(); await page.waitForTimeout(500);
  R.varaq = await M(() => ({ bor: !!document.querySelector('[data-varaq="buyurtma"]'), xulosa: (document.querySelector('[data-buyurtma-xulosa]') || {}).innerText || '' }));
  R.xulosaNarx = R.varaq.xulosa.replace(/\s/g, '').includes(String(jami));

  /* 2) ism yoki telefon bo'lmasa — yuborilmaydi */
  await page.locator('[data-buyurtma-ism]').fill('');
  await page.locator('[data-buyurtma-yubor]').click(); await page.waitForTimeout(300);
  R.ismKerak = await has('Mijoz ismini yozing');
  await page.locator('[data-buyurtma-ism]').fill('Aziz Karimov');
  await page.locator('[data-buyurtma-tel]').fill('90 123');
  await page.locator('[data-buyurtma-yubor]').click(); await page.waitForTimeout(300);
  R.telKerak = await has("Telefon raqami to'liq emas");
  await page.locator('[data-buyurtma-tel]').fill('+998 90 123 45 67');
  R.telKorinish = await page.locator('[data-buyurtma-tel]').inputValue();
  await page.locator('[data-buyurtma-izoh]').fill('Rangi oq <glyanes>, 2-qavat');
  await page.screenshot({ path: `${OUT}/buyurtma-1440-varaq.png` });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  R.telefon = await M(() => { const v = document.querySelector('[data-varaq="buyurtma"]').getBoundingClientRect(); return { sigdi: v.left >= 0 && v.right <= innerWidth + 1, gorizontal: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/buyurtma-390-varaq.png` });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);

  /* 3) yuborish → server */
  await page.locator('[data-buyurtma-yubor]').click();
  R.yuborildi = await waitText('sexga yuborildi');
  R.varaqYopildi = await M(() => !document.querySelector('[data-varaq="buyurtma"]'));
  R.server = await M(async () => {
    const l = await (await fetch('/api/orders', { cache: 'no-store' })).json();
    if (!l.length) return null;
    const o = await (await fetch('/api/orders/' + l[0].id, { cache: 'no-store' })).json();
    const d = o.doc && (o.doc.doc || o.doc);
    return { n: l.length, id: o.id, ism: o.client_name, tel: o.client_phone, izoh: o.notes, holat: o.status, narx: o.total_price, modul: o.modules, docMebel: d && d.placements ? d.placements.length : 0 };
  });

  /* 4) "Loyihalarim" → "Buyurtmalarim": holati "Yangi" */
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  R.ustaRoyxat = await ustaQatorlar();
  await page.screenshot({ path: `${OUT}/buyurtma-1440-loyihalar.png` });

  /* 5) admin: Sozlamalar → Buyurtmalar → "Qabul qilindi" */
  await chiqish();
  await kirish('admin@smart3d.uz', 'web-test-admin-1');
  await page.locator('[aria-label="Sozlamalar"]').click(); await page.waitForTimeout(1500);
  R.admin = await M((id) => { const q = document.querySelector(`[data-buyurtmalar="admin"] [data-buyurtma="${id}"]`); return q ? q.innerText.replace(/\s+/g, ' ') : ''; }, R.server && R.server.id);
  await page.locator(`[data-buyurtma-holat="${R.server && R.server.id}"]`).selectOption('qabul');
  R.holatToast = await waitText('Qabul qilindi', 5000);
  await page.screenshot({ path: `${OUT}/buyurtma-1440-admin.png` });

  /* 6) usta qayta kiradi — holat "Qabul qilindi" */
  await chiqish();
  await kirish(email, parol);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  R.ustaKeyin = await ustaQatorlar();

  R.xatolar = errs;
  const s = R.server || {};
  R.ok = R.bosh && R.tugma === 1 && R.varaq.bor && R.xulosaNarx && R.ismKerak && R.telKerak && R.telKorinish === '90 123 45 67'
    && R.telefon.sigdi && R.telefon.gorizontal && R.yuborildi && R.varaqYopildi
    && s.n === 1 && s.ism === 'Aziz Karimov' && s.tel === '998901234567' && s.izoh === 'Rangi oq <glyanes>, 2-qavat' && s.holat === 'yangi'
    && s.narx === jami && s.modul === nMebel && s.docMebel === nMebel
    && R.ustaRoyxat.length === 1 && R.ustaRoyxat[0].holat === 'yangi' && /Aziz Karimov/.test(R.ustaRoyxat[0].matn)
    && /Aziz Karimov/.test(R.admin) && /Buyurtma Usta/.test(R.admin) && R.holatToast
    && R.ustaKeyin.length === 1 && R.ustaKeyin[0].holat === 'qabul'
    && !errs.length;
}
