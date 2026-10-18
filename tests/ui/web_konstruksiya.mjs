/* TZ-26: AI konstruksiya — matn qatoridan (sinov serverida AI kaliti yo'q → AI'siz tahlilchi; server yo'li — server testida).
 * Tekshiriladi: "shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik" → xonaga modul (CH-…), "Modul chizish" paneli,
 * chizma: 2 bo'lim, chapda shtanga, o'ngda 4 polka, 2 eshik; izoh kartasi (kim tushundi, xulosa); narx; ruscha
 * "тумба 600, 4 ящика" → tumba 4 tortma; AI oynasidagi "Qurish" ham shu yo'l; xona matni ("oshxona 3x4 m") — oshxona yo'li
 * (almashtirish tasdig'i); keng polka — tizim to'g'rilaydi (izohda); telefon (390); egasining prompti (2026-10-17) — o'lcham,
 * bo'limlar, ERP materiallar, furnitura, OBJ darhol yuklanadi. Egasi #168: har matn avval katalog moduli kartasini ochadi (shkaf —
 * MC-SH-01, CH- yaratilmaydi); chizish — faqat "Baribir chizish" bosilganda (katalog moduli o'rniga). Ishlatish: bash tests/ui/web.sh konstruksiya */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/konstruksiya-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const qator = page.locator('[data-matn]');
  const yoz = async (s) => { await qator.fill(s); await qator.press('Enter'); };
  /* egasi #168: matn → avval katalog moduli (yoki "katalogda yo'q") kartasi; "Baribir chizish" bosilgandagina CH- modul chiziladi */
  const katalog = [];
  const karta = async () => {
    const el = await kut(() => { const e = document.querySelector('[data-ai-oshxona]'); return e ? e.innerText : null; }, null, 8000);
    katalog.push({ matn: el || '', chizmalar: await M(() => Object.keys(window.__app.doc.chizmalar || {}).length), pl: await M(() => window.__app.doc.placements.length) });
    return el;
  };
  const baribir = async () => { await page.locator('[data-baribir-chiz]').click(); };
  const yozChiz = async (s) => { await yoz(s); await karta(); await baribir(); };
  const kut = async (fn, arg, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };
  /* oxirgi qo'lda chizilgan modul: chizma (katalogda), joylashuv, narx */
  const oxirgi = () => M(() => {
    const a = window.__app, k = Object.keys(a.doc.chizmalar || {}), kod = k[k.length - 1], fr = kod && a.H.catalog[kod];
    const p = a.doc.placements.find(x => x.frg === kod), ch = fr && fr.chizma;
    const b = (n) => n ? { yo: n.yo || null, bo: (n.bo || []).map(x => b(x.n)), polka: n.polka || 0, tortma: n.tortma || 0, shtanga: !!n.shtanga, eshik: n.eshik || 0 } : null;
    return { n: k.length, kod, tur: ch && ch.tur, wdh: p && [p.w, p.d, p.h], ichki: ch && b(ch.ichki), narx: a.res && a.res.priceRes.total };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Konstruksiya Usta'); await fill('jasur@', 'kons' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* 1) o'zbekcha shkaf */
  await yoz("shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik");
  R.katalog1 = await karta();
  R.katalogModul = await M(() => window.__app.doc.placements.map(p => p.frg));
  await page.screenshot({ path: `${OUT}/konstruksiya-1440-katalog.png` });
  await baribir();
  await kut(() => !!document.querySelector('[data-kons-izoh]'));
  await page.waitForTimeout(800);
  R.shkaf = await oxirgi();
  R.izoh = await M(() => (document.querySelector('[data-kons-izoh]') || {}).innerText || '');
  R.panel = await M(() => !!document.querySelector('[data-chizish]'));
  R.sahnada = await M((k) => { let n = 0; window.__app.sahna.sp.groups.items.traverse(o => { if (o.userData && o.userData.frg === k) n++; }); return n; }, R.shkaf.kod);
  await page.screenshot({ path: `${OUT}/konstruksiya-1440-shkaf.png` });

  /* 1b) egasining prompti (2026-10-17, aynan): o'lcham, bo'limlar (chapda 1000 mm kiyim joyi, ustida va ostida polka; o'ngda 6 polka),
   *     ERP materiallar modul qismlarida (Кашемир, Дуб Золотой), uzun ruchka, HDF polgacha; "obj formatda yubor" — OBJ darhol yuklanadi */
  const EGA = 'mebel turi:shkaf balandlig 2100mm , eniga 1200mm,chuqurlig 580mm,korpusi va ichki qism materali:kashemir,16mm , fasad dubzalatoy,16mm, ikki eshikli chap tomondan 1 metr kiyim iladigan vishilkali joy, tepa va pastida polkalar bor bittadan , ong tomonda qolgan qismmi 6ta teng polkadan iborat , korpus brikmasi konfirmat, polkalar polka derjatel, bilan mahkamlanad  ruchka 1mterlik uzun ruchkadan qoyilad korpus bakavinasi yergacha va sokilli boladi,  obj formatda yubor gpirmasdan yubor';
  await yoz(EGA);
  R.katalogEga = await karta();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), baribir()]);
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.shkaf.n);
  await page.waitForTimeout(800);
  R.ega = await M(() => {
    const a = window.__app, k = Object.keys(a.doc.chizmalar || {}), kod = k[k.length - 1], fr = a.H.catalog[kod];
    const p = a.doc.placements.find(x => x.frg === kod), ch = fr && fr.chizma;
    const mat = (c) => (a.doc.erpMat && a.doc.erpMat[c] && a.doc.erpMat[c].name) || c || null;
    return { n: k.length, tur: ch && ch.tur, wdh: p && [p.w, p.d, p.h], chap: ch && ch.ichki.bo[0].n, ong: ch && ch.ichki.bo[1].n, orqaYer: ch && ch.orqaYer, ruchka: ch && ch.ruchka,
      slots: p && p.slots ? { korpus: mat(p.slots.korpus), polka: mat(p.slots.polka), fasad: mat(p.slots.fasad) } : null, narx: a.res && a.res.priceRes.total };
  });
  R.egaIzoh = await M(() => (document.querySelector('[data-kons-izoh]') || {}).innerText || '');
  R.egaObj = dl ? dl.suggestedFilename() : null;
  R.egaDialog = await M(() => !!document.querySelector('[role=dialog], [data-tasdiq]'));
  await page.screenshot({ path: `${OUT}/konstruksiya-1440-egasi.png` });

  /* 2) ruscha tumba */
  await yozChiz('тумба 600, 4 ящика');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.ega.n);
  await page.waitForTimeout(600);
  R.tumba = await oxirgi();

  /* 3) keng polka — tizim bo'lgich qo'yadi (izohda) */
  await yozChiz('javon 1600x300x1800 5 polka');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.tumba.n);
  await page.waitForTimeout(600);
  R.javon = await oxirgi();
  R.javonIzoh = await M(() => (document.querySelector('[data-kons-tuzatish]') || {}).innerText || '');

  /* 4) AI oynasidagi "Qurish" — shu yo'l */
  await page.locator('[data-matn-menyu]').click(); await page.waitForTimeout(400);
  await page.locator('[data-ai-tab] button', { hasText: 'Matn' }).click(); await page.waitForTimeout(200);
  await page.locator('[data-varaq="ai"] textarea').fill('ustki shkaf 800 2 eshik 2 polka');
  await page.locator('[data-varaq="ai"] button', { hasText: 'Qurish' }).click();
  await karta(); await baribir();
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.javon.n);
  await page.waitForTimeout(600);
  R.ustki = await oxirgi();
  R.aiYopildi = await M(() => !document.querySelector('[data-varaq="ai"]'));

  /* 5) xona matni — oshxona yo'li (mebel bor — almashtirish tasdig'i), bekor qilinadi */
  const n0 = await M(() => window.__app.doc.placements.length);
  await yoz('oshxona 3x4 m L shakl');
  R.xonaTasdiq = !!(await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 4000));
  if (R.xonaTasdiq) { await click(/^Bekor qilish$|^Bekor$/); await page.waitForTimeout(300); }
  R.xonaTegilmadi = (await M(() => window.__app.doc.placements.length)) === n0;

  /* 6) telefon (390) — panel va matn qatori, toshish yo'q */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
  await yozChiz('tumba 400 3 tortma');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.ustki.n);
  await page.waitForTimeout(600);
  R.tel = await M(() => ({ toshish: document.documentElement.scrollWidth - innerWidth, izoh: !!document.querySelector('[data-kons-izoh]'), qator: document.querySelector('[data-matn-qatori]').getBoundingClientRect().bottom <= innerHeight + 1 }));
  await page.screenshot({ path: `${OUT}/konstruksiya-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 });

  R.xatolar = errs;
  R.katalog = katalog.map(k => ({ chizmalar: k.chizmalar, pl: k.pl, bosh: k.matn.split('\n')[0] }));
  const s = R.shkaf.ichki;
  R.ok = /MC-SH-01/.test(R.katalog1 || '') && katalog[0].chizmalar === 0 && JSON.stringify(R.katalogModul) === '["MC-SH-01"]'
    && /MC-SH-01/.test(R.katalogEga || '') && /polka/.test(R.katalogEga || '')
    && R.shkaf.n === 1 && /^CH-/.test(R.shkaf.kod) && R.shkaf.tur === 'shkaf' && JSON.stringify(R.shkaf.wdh) === '[1200,600,2200]'
    && s.yo === 'v' && s.bo.length === 2 && s.bo[0].shtanga && s.bo[0].eshik === 1 && s.bo[1].polka === 4 && s.bo[1].eshik === 1 && R.shkaf.narx > 0
    && /AI'siz/.test(R.izoh) && /2 bo'lim/.test(R.izoh) && R.panel && R.sahnada > 0
    && R.ega.tur === 'shkaf' && JSON.stringify(R.ega.wdh) === '[1200,580,2100]' && R.ega.chap.yo === 'h' && R.ega.chap.ajrat === 'polka' && R.ega.chap.bo.length === 3
    && R.ega.chap.bo[1].o === 1000 && R.ega.chap.bo[1].n.shtanga && R.ega.chap.eshik === 1 && R.ega.ong.polka === 6 && R.ega.ong.eshik === 1 && R.ega.orqaYer && R.ega.ruchka.l === 1000
    && R.ega.slots && /Кашемир UR 16мм/.test(R.ega.slots.korpus) && /Кашемир UR 16мм/.test(R.ega.slots.polka) && /Дуб Золотой 16мм/.test(R.ega.slots.fasad) && R.ega.narx > 0
    && /8 polka/.test(R.egaIzoh) && /Кашемир/.test(R.egaIzoh) && /konfirmat/.test(R.egaIzoh) && /1000 mm/.test(R.egaIzoh) && /Chizilgan_shkaf_1200_580_2100\.obj$/.test(R.egaObj) && !R.egaDialog
    && R.tumba.tur === 'tumba' && R.tumba.ichki.tortma === 4 && R.tumba.wdh[0] === 600
    && R.javon.ichki.yo === 'v' && R.javon.ichki.bo.length === 2 && R.javon.ichki.bo.every(b => b.polka === 5) && /bo'lgich/.test(R.javonIzoh)
    && R.ustki.tur === 'ustki' && R.ustki.ichki.eshik === 2 && R.ustki.ichki.polka === 2 && R.aiYopildi
    && R.xonaTasdiq && R.xonaTegilmadi
    && R.tel.toshish <= 0 && R.tel.izoh && R.tel.qator
    && !errs.length;
}
