/* QABUL-50 SINOVI (egasi #247): "50 xil prompt tayyorlab qo'y, shu asosda qabul qilinsin".
 * Ish joyi matn qatoriga yozilgan har xil buyurtma katalogdagi tayyor modullardan to'g'ri yig'ilishi kerak.
 * Sinov FAQAT o'lchaydi (A oshxona, B xonalar, C bitta mebel, D garnitur, E erkin/xato); 0 prompt bajarilsa yiqiladi.
 * Skrinshot faqat kamchiliklarda: tests/ui/out/web/qabul50-<n>.png. Ishlatish: env -u NODE_ENV bash tests/ui/web.sh qabul50 */

/* [kategoriya, matn, kutilgan]; kutilgan: {bo:[o'lchamlar modulda bo'lishi kerak], mebel:[[nom, regex]...], bosh:true (modul yo'q + xabar kutiladi), min:N} */
const P = [
  /* A) OSHXONA */
  ['A', "oshxona 3 metr to'g'ri", { min: 2 }],
  ['A', 'oshxona L shakl 3x4 xolodilnik chapda', { min: 3 }],
  ['A', 'oshxona U shakl 4x4', { min: 4 }],
  ['A', 'oshxona 3x4 orol bilan', { min: 3 }],
  ['A', 'kichik oshxona 2 metr', { min: 2 }],
  ['A', 'oshxona 3 metr ustki shkafsiz', { min: 1 }],
  ['A', 'oshxona 3 metr stoleshnitsa 38 mm', { min: 2 }],
  ['A', 'oshxona 3 metr gaz plita va vytyajka bilan', { min: 2 }],
  ['A', 'oshxona L shakl 3x3 moyka burchakda', { min: 2 }],
  ['A', "to'liq oshxona 5x4 pastki va ustki shkaflar, texnika bilan", { min: 4 }],
  /* B) XONALAR */
  ['B', 'yotoqxona 4x5', { min: 3 }],
  ['B', 'yotoqxona 3x4 bir kishilik', { min: 3 }],
  ['B', 'mehmonxona 4x6', { min: 3 }],
  ['B', 'mehmonxona TV zona', { min: 1 }],
  ['B', 'bolalar xonasi 3x3', { min: 3 }],
  ['B', 'garderob xona 2x3', { min: 3 }],
  ['B', 'vannaxona 2x3', { min: 3 }],
  ['B', 'ofis 4x4', { min: 3 }],
  ['B', 'dahliz 2x3 prixojka', { min: 3 }],
  ['B', 'yotoqxona 5x5 katta', { min: 3 }],
  /* C) BITTA MEBEL */
  ['C', 'shkaf 1200x600x2200 2 eshik', { bo: [1200, 600, 2200] }],
  ['C', 'shkaf 1800x600x2400 3 eshik', { bo: [1800, 600, 2400] }],
  ['C', 'pastki shkaf 800 3 tortma', { bo: [800] }],
  ['C', 'ustki shkaf 600x350x700', { bo: [600, 350, 700] }],
  ['C', 'tumba 500 2 tortma', { bo: [500] }],
  ['C', 'javon 1600x300x1800 5 polka', { bo: [1600, 300, 1800] }],
  ['C', 'garderob 2000 ikki qanotli', { bo: [2000] }],
  ['C', 'stol 1400x700', { bo: [1400, 700] }],
  ['C', 'ish stoli 1200', { bo: [1200] }],
  ['C', 'poyabzal shkafi', { min: 1 }],
  /* D) GARNITUR / BIR NECHTA MEBEL */
  ['D', "spalniy garnitur, classic model spalniy razmeri 1800x2100 mm material ldsp, bosh va oyoq qismida yumshoq detallari bor, shkafi 2400x2300mm 3 qismdan iborat o'rtadagi qismi kiyim ilish uchun 2 ta chekkasi polkalar, trimosi tortmali tepasida oyna bor ruchkasiz push mexanizmda, umuniy rangi kashemir", { bo: [1800, 2100, 2400, 2300], min: 3, mebel: [['krovat', /bed|krovat|karavot|yotoq/i], ['shkaf', /wardrobe|shkaf|garderob/i], ['trimo', /komod|trimo|tortma/i]] }],
  ['D', 'karavot 1600x2000 va 2 eshikli garderob', { bo: [1600, 2000], min: 2, mebel: [['krovat', /bed|krovat|karavot|yotoq/i], ['garderob', /wardrobe|shkaf|garderob/i]] }],
  ['D', 'krovat va 2 tumba', { min: 3, mebel: [['krovat', /bed|krovat|karavot|yotoq/i], ['tumba', /tumba|nightstand|bedside/i]] }],
  ['D', 'divan 2 metr va stol', { bo: [2000], min: 2, mebel: [['divan', /sofa|divan/i], ['stol', /table|stol/i]] }],
  ['D', 'stol va 4 stul', { min: 5, mebel: [['stol', /table|stol/i], ['stul', /chair|stul/i]] }],
  ['D', 'garderob 2400 va komod 1200', { bo: [2400, 1200], min: 2, mebel: [['garderob', /wardrobe|shkaf|garderob/i], ['komod', /komod|dresser|tortma/i]] }],
  ['D', 'mehmonxona garniturı: TV tumba, vitrina, divan', { min: 3, mebel: [['tv', /tv|televizor/i], ['vitrina', /vitrin|display/i], ['divan', /sofa|divan/i]] }],
  ['D', 'bolalar garnituri: krovat, stol, shkaf', { min: 3, mebel: [['krovat', /bed|krovat|karavot|yotoq/i], ['stol', /table|stol|desk/i], ['shkaf', /wardrobe|shkaf|garderob/i]] }],
  ['D', 'ofis: stol, shkaf, javon', { min: 3, mebel: [['stol', /table|stol|desk/i], ['shkaf', /wardrobe|shkaf|cabinet/i], ['javon', /javon|shelf|bookcase|polka/i]] }],
  ['D', 'kabinet: stol va kitob javoni', { min: 2, mebel: [['stol', /table|stol|desk/i], ['javon', /javon|shelf|bookcase|polka/i]] }],
  /* E) ERKIN / MURAKKAB / XATO */
  ['E', 'кухня 3 на 4', { min: 2 }],
  ['E', 'спальня 4x5', { min: 3 }],
  ['E', 'шкаф 2 метра 3 двери', { min: 1 }],
  ['E', 'гостиная с ТВ зоной', { min: 1 }],
  ['E', 'kitchen 3x4 L-shape', { min: 3 }],
  ['E', 'wardrobe 2000 with 3 doors', { min: 1 }],
  ['E', 'antresol bilan kupe shkaf', { min: 1 }],
  ['E', 'bar peshtaxta aylana', { min: 1 }],
  ['E', 'salom qalaysan', { bosh: true }],
  ['E', '3 4', { bosh: true }]
];

export default async function run(page) {
  const R = { jadval: [] };
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/qabul50-xato.png` }).catch(() => {});
  }
  R.bajarildi = R.jadval.filter(r => !r.xato).length;
  R.ok = R.bajarildi > 0;   // faqat 0 prompt bajarilsa yiqiladi
  R.OK = R.jadval.filter(r => r.holat === 'OK').length;
  R.KAMCHILIK = R.jadval.filter(r => /^(KAMCHILIK|XATO)/.test(r.holat || '')).length;
  const gr = {};
  for (const r of R.jadval) for (const g of (r.guruh || [])) (gr[g] = gr[g] || []).push(r.n);
  R.guruhlar = gr;
  R.jadval = R.jadval.map(r => ({ n: r.n, turkum: r.turkum, prompt: r.prompt, modul: r.modul, frg: r.frgQisqa, katalogdaYoq: r.katalogdaYoq, sigmagan: r.sigmagan, kesishish: r.kesishish, tushunilmadiSoni: r.tushunilmadiSoni, tushunilmadi: r.tushunilmadi, xabar: r.xabar, narx: r.narx, xona: r.xona, holat: r.holat }));
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const qator = page.locator('[data-matn]');
  const kut = async (fn, arg, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Qabul Usta'); await fill('jasur@', 'qabul' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* sahifadagi holatni o'lchash (kod o'zgartirilmaydi) */
  const olchash = () => M(() => {
    const a = window.__app, d = a.doc, pl = d.placements || [], cat = a.H.catalog, chz = d.chizmalar || {};
    const num = (v) => (Number.isFinite(+v) ? +v : 0);
    const fp = (p) => {   // rules.js footprint bilan bir xil: anchor atrofida burish
      const deg = ((num(p.rot) % 360) + 360) % 360, r = deg * Math.PI / 180, c = Math.round(Math.cos(r) * 1e9) / 1e9, s = Math.round(Math.sin(r) * 1e9) / 1e9;
      const xs = [], ys = [];
      for (const [px, py] of [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]) { xs.push(num(p.x) + px * c - py * s); ys.push(num(p.y) + px * s + py * c); }
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    };
    const out = (d.room && d.room.outline) || [], rx = out.map(q => q[0]), ry = out.map(q => q[1]);
    const bb = { x0: Math.min(...rx), x1: Math.max(...rx), y0: Math.min(...ry), y1: Math.max(...ry) };
    const E = 2;
    const sigmagan = pl.filter(p => { const f = fp(p); return f.x0 < bb.x0 - E || f.x1 > bb.x1 + E || f.y0 < bb.y0 - E || f.y1 > bb.y1 + E; }).map(p => p.frg);
    const kes = [];
    for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
      const A = pl[i], B = pl[j], fa = fp(A), fb = fp(B);
      const zA = [num(A.z), num(A.z) + num(A.h)], zB = [num(B.z), num(B.z) + num(B.h)];
      if (zA[1] <= zB[0] + E || zB[1] <= zA[0] + E) continue;   // turli balandlikda (ustki/pastki) — kesishmaydi
      const ox = Math.min(fa.x1, fb.x1) - Math.max(fa.x0, fb.x0), oy = Math.min(fa.y1, fb.y1) - Math.max(fa.y0, fb.y0);
      if (ox > E && oy > E) kes.push(A.frg + '~' + B.frg);
    }
    const matn = document.body.innerText;
    const tush = [];
    const kartaEl = document.querySelector('[data-ai-oshxona]');
    const manba = (kartaEl ? kartaEl.innerText : '') + '\n' + matn;
    for (const m of manba.matchAll(/[Tt]ushunilmadi:?\s*([^\n]*)/g)) if (m[1].trim()) tush.push(m[1].trim().slice(0, 160));
    const chizIzoh = a.state && a.state.chizish && a.state.chizish.izoh;
    if (chizIzoh && chizIzoh.tushunilmadi) for (const x of chizIzoh.tushunilmadi) tush.push(String(x).slice(0, 160));
    const frgs = pl.map(p => p.frg);
    return {
      modul: pl.length, frgs, chiz: Object.keys(chz).map(k => k + ':' + (chz[k] && chz[k].tur)),
      katalogdaYoq: [...new Set(pl.filter(p => !cat[p.frg] && !chz[p.frg]).map(p => p.frg))],
      sigmagan, kesishish: kes, tush: [...new Set(tush)],
      kartaBor: !!kartaEl, xona: [bb.x1 - bb.x0, bb.y1 - bb.y0, d.room && d.room.wall_height],
      narx: a.res && a.res.priceRes ? a.res.priceRes.total : null,
      aniqlik: (a.res && a.res.priceRes && (a.res.priceRes.aniqlik || a.res.priceRes.accuracy || a.res.priceRes.exact)) || null,
      /* rang hujjatda: doc.erpMat (ERP plita nomlari), placements[].slots (korpus/polka/fasad → ERP-kod) va placements[].dekor (engine: {nom, korpus, fasad}) */
      rang: JSON.stringify({ erpMat: Object.values(d.erpMat || {}).map(m => m.name), slotli: pl.filter(p => p.slots && (p.slots.korpus || p.slots.fasad)).length, dekor: [...new Set(pl.filter(p => p.dekor).map(p => p.dekor.nom + '|' + p.dekor.korpus))] }).slice(0, 300),
      rangMaydon: { erpMat: Object.keys(d.erpMat || {}).length, slotli: pl.filter(p => p.slots && (p.slots.korpus || p.slots.fasad)).length, dekorli: pl.filter(p => p.dekor).length },
      erpMatNomlar: Object.values(d.erpMat || {}).map(m => m.name),
      kat: pl.map(p => { const f = cat[p.frg] || {}; return (f.category || '') + '/' + (f.group || ''); }),
      matnlar: Object.fromEntries(pl.map(p => [p.frg, [p.frg, JSON.stringify(cat[p.frg] || {}).slice(0, 400), (p.tur || p.kind || '')].join(' ')])),
      olchamlar: pl.map(p => ({ w: Math.round(num(p.w)), d: Math.round(num(p.d)), h: Math.round(num(p.h)) })),
      turlar: pl.map(p => (p.frg || '') + '/' + (p.tur || p.kind || '')).slice(0, 40)
    };
  });


  const T0 = Date.now();
  for (let n = 1; n <= P.length; n++) {
    const [kat, matn, K] = P[n - 1];
    const r = { n, turkum: kat, prompt: matn.slice(0, 50) };
    try {
      if (Date.now() - T0 > 11.5 * 60000) { r.holat = 'O\'TKAZILDI: vaqt'; r.xato = 'vaqt'; R.jadval.push(r); continue; }
      /* yangi loyiha: avval hujjat tozalanadi (doc.placements bo'shatish), so'ng matn */
      await M(() => { const a = window.__app; if (a && a.doc && a.doc.placements) a.doc.placements.length = 0; });
      const oldin = await M(() => document.body.innerText);
      await qator.fill(matn); await qator.press('Enter');
      if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 1500)) await click(/^Almashtirish$/);
      await kut(() => window.__app.doc.placements.length > 0, null, K.bosh ? 2500 : 7000);
      await page.waitForTimeout(K.bosh ? 1200 : 2000);
      const o = await olchash();
      Object.assign(r, o);
      const keyin = await M(() => document.body.innerText);
      const yangi = keyin.split('\n').map(s => s.trim()).filter(s => s && !oldin.includes(s)).slice(0, 6);
      r.xabar = yangi.join(' / ').slice(0, 200);
      r.tushunilmadiSoni = o.tush.length;
      r.tushunilmadi = o.tush.join(' | ').slice(0, 200);
      const f = r.frgs.slice(0, 12);
      r.frgQisqa = f.join(',');
      const mt = o.frgs.map(x => x + ' ' + o.matnlar[x]);
      const sabab = [], guruh = [];
      const bad = (g, s) => { guruh.push(g); sabab.push(s); };
      if (K.bosh) {
        if (o.modul > 0) bad('modul chiqqan (kutilmagan)', o.modul + ' modul');
        if (!yangi.length && !o.tush.length && !o.kartaBor) bad('jim chiqish', 'hech qanday xabar yo\'q');
      } else {
        if (o.modul < 1) bad('0 modul / tur tanilmagan', '0 modul' + (r.xabar ? ' (xabar: ' + r.xabar.slice(0, 80) + ')' : ' va xabar yo\'q'));
        else if (K.min && o.modul < K.min) bad('modul kam', 'modul ' + o.modul + ' < ' + K.min);
        if (o.katalogdaYoq.length) bad('katalogda yo\'q frg', o.katalogdaYoq.join(','));
        if (o.sigmagan.length) bad('xonaga sig\'madi', o.sigmagan.join(','));
        if (o.kesishish.length) bad('kesishish', o.kesishish.slice(0, 4).join(','));
        if (K.bo && o.modul > 0) {
          const yoq = K.bo.filter(v => !o.olchamlar.some(p => [p.w, p.d, p.h].some(x => Math.abs(x - v) <= 1)));
          if (yoq.length) bad('aytilgan o\'lcham modulda yo\'q', 'yo\'q: ' + yoq.join(','));
        }
        if (K.mebel) for (const [nm, re] of K.mebel) if (!mt.some(s => re.test(s))) bad('mebel turi tanilmagan', nm + ' moduli yo\'q');
        if ((kat === 'C' || kat === 'D') && o.modul > 0 && !o.tush.length && false) bad('', '');
      }
      r.holat = sabab.length ? 'KAMCHILIK: ' + sabab.join('; ') : 'OK';
      r.guruh = [...new Set(guruh)];
      if (sabab.length) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/qabul50-${n}.png` }).catch(() => {}); }
    } catch (e) { r.xato = String(e.message || e).split('\n')[0]; r.holat = 'XATO: ' + r.xato; r.guruh = ['test xatosi']; r.modul = r.modul || 0; r.katalogdaYoq = r.katalogdaYoq || []; r.kesishish = r.kesishish || []; r.tushunilmadiSoni = 0; }
    R.jadval.push(r);
    console.log(`#${n} ${kat} | ${r.prompt} | modul=${r.modul} | ${r.holat}`);
  }
  R.errs = errs; R.sekund = Math.round((Date.now() - T0) / 1000);
}
