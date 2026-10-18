/* QABUL SINOVI (egasi #245): "prompt yozilgan konstruksiya uchun butun xonani umumiy chizib berish".
 * Har prompt: ish joyi matn qatoriga yoziladi + Enter → doc.placements, katalog, xonaga sig'ish, kesishish, "tushunilmadi", narx, aniqlik, 3D skrinshot.
 * Sinov FAQAT o'lchaydi: jadvalni chop etadi (holat OK/KAMCHILIK), 0 prompt bajarilgandagina yiqiladi.
 * Skrinshot: tests/ui/out/web/qabul-<nom>.png. Ishlatish: bash tests/ui/web.sh garnitur_qabul */
const PROMPTS = [
  ['oshxonaL', 'oshxona L shakl 3x4 xolodilnik chapda'],
  ['yotoqxona', 'yotoqxona 4x5'],
  ['mehmonxona', 'mehmonxona 4x6'],
  ['bolalar', 'bolalar xonasi 3x3'],
  ['garderobXona', 'garderob xona 2x3'],
  ['vannaxona', 'vannaxona 2x3'],
  ['ofis', 'ofis 4x4'],
  ['krovatGarderob', 'karavot 1800x2100 va 3 qanotli garderob 2400x2300'],
  ['garnitur', "spalniy garnitur, classic model spalniy razmeri 1800x2100 mm material ldsp, bosh va oyoq qismida yumshoq detallari bor, shkafi 2400x2300mm 3 qismdan iborat o'rtadagi qismi kiyim ilish uchun 2 ta chekkasi polkalar, trimosi tortmali tepasida oyna bor ruchkasiz push mexanizmda, umuniy rangi kashemir"],
  ['shkaf', 'shkaf 1200x600x2200 2 eshik']
];

export default async function run(page) {
  const R = { jadval: [] };
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/qabul-xato.png` }).catch(() => {});
  }
  R.bajarildi = R.jadval.filter(r => !r.xato).length;
  R.ok = R.bajarildi > 0;   // faqat 0 prompt bajarilsa yiqiladi
  console.log('PROMPT | modul | katalogda yo\'q | kesishish | tushunilmadi | narx | aniqlik | holat');
  for (const r of R.jadval) console.log([r.nom, r.modul, r.katalogdaYoq.length ? r.katalogdaYoq.join(',') : 0, r.kesishish, r.tushunilmadiSoni, r.narx, r.aniqlik, r.holat].join(' | '));
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
      turlar: pl.map(p => (p.frg || '') + '/' + (p.tur || p.kind || '')).slice(0, 40)
    };
  });

  for (const [nom, matn] of PROMPTS) {
    const r = { nom, prompt: matn.slice(0, 40) };
    try {
      await qator.fill(matn); await qator.press('Enter');
      if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 2500)) await click(/^Almashtirish$/);
      await kut(() => window.__app.doc.placements.length > 0, null, 8000);
      await page.waitForTimeout(2500);
      const o = await olchash();
      Object.assign(r, o);
      r.tushunilmadiSoni = o.tush.length;
      r.kartada = o.tush.length > 0 || o.kartaBor;
      const sabab = [];
      if (o.modul < 1) sabab.push('0 modul');
      if (o.katalogdaYoq.length) sabab.push('katalogda yo\'q: ' + o.katalogdaYoq.join(','));
      if (nom === 'krovatGarderob' && (o.modul !== 2 || !/SP-BD-004/.test(o.frgs.join()))) sabab.push('krovat+garderob 2 modul emas: ' + o.frgs.join());
      if (nom === 'garnitur' && o.tush.some(x => /material|iborat|umuniy|\bbor\b/i.test(x))) sabab.push('to\'xtov so\'z tushunilmadi: ' + o.tush.join(' | '));
      if (o.sigmagan.length) sabab.push('xonaga sig\'madi: ' + o.sigmagan.join(','));
      if (o.kesishish.length) sabab.push('kesishish: ' + o.kesishish.slice(0, 4).join(','));
      if (nom === 'garnitur') {
        const f = o.frgs.concat(o.chiz).join(' ').toLowerCase();
        const krovat = /krovat|karavot|bed|yotoq|kr-|spalni/.test(f), shkaf = /shkaf|wardrobe|garderob|sh-|kup/.test(f), trimo = /trimo|trumo|komod|tumba|tortma|dresser/.test(f);
        r.garnitur3 = { krovat, shkaf, trimo };
        if (o.modul < 3 || !(krovat && shkaf && trimo)) sabab.push(`krovat+shkaf+trimo 3 modul emas (krovat=${krovat} shkaf=${shkaf} trimo=${trimo}, modul=${o.modul})`);
        /* TZ-35 B2: umumiy rang kashemir — doc.erpMat da «Кашемир» plitasi, har modulning slots'ida va p.dekor'da */
        r.rangMaydon = o.rangMaydon;
        if (!o.erpMatNomlar.some(n => /кашемир|kashemir|cashmere/i.test(n)) || o.rangMaydon.slotli < o.modul - 2 || o.rangMaydon.dekorli < 1) { r.kashemirKuzatilmadi = true; sabab.push('kashemir hujjatda emas: ' + JSON.stringify(o.rangMaydon)); }
      }
      r.holat = sabab.length ? 'KAMCHILIK: ' + sabab.join('; ') : 'OK';
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/qabul-${nom}.png` });
    } catch (e) { r.xato = String(e.message || e).split('\n')[0]; r.holat = 'XATO: ' + r.xato; r.modul = r.modul || 0; r.katalogdaYoq = r.katalogdaYoq || []; r.kesishish = r.kesishish || []; r.tushunilmadiSoni = 0; }
    R.jadval.push(r);
  }
  R.errs = errs;
}
