/* Egasi #223 (V3): "Fayllar" bo'limidagi HAR tugma yuklagan fayl — nomi, kengaytmasi va birinchi baytlari haqiqiy formatga mosmi
 * (.dxf — haqiqiy DXF, .xlsx — haqiqiy xlsx/ZIP, .glb — glTF, .zip — ZIP ichida .obj+.mtl, .nc — G-kod, matn faylda stanok nomi yo'q).
 * "tez orada" (Biesse/Homag) tugmalar bu ro'yxatga kirmaydi (bosilmaydi — web_fayllar.mjs tekshiradi); admin tugmalari (GibLab Bazis, KDT) — yo'q.
 * Stanok formatining ICHKI to'g'riligi (G-code dialekti va h.k.) bu testda tekshirilmaydi — faqat ko'rinish, nom va imzo.
 * Ishlatish: bash tests/ui/web.sh eksport_format */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/eksport_format-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

/** ZIP markaziy katalogidan fayl nomlari (imzo PK\x03\x04 ham tekshiriladi) */
function zipNomlar(b) {
  if (!(b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4)) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), nom = [];
  let e = -1; for (let i = b.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) return null;
  let p = dv.getUint32(e + 16, true);
  for (let n = dv.getUint16(e + 10, true); n > 0 && dv.getUint32(p, true) === 0x02014b50; n--) {
    const L = dv.getUint16(p + 28, true); nom.push(new TextDecoder().decode(b.subarray(p + 46, p + 46 + L))); p += 46 + L + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return nom;
}
const matn = (b) => new TextDecoder('utf-8').decode(b).replace(/^﻿/, '');
const json = (b) => { try { return JSON.parse(matn(b)); } catch { return null; } };
const STANOK_NOMI = /altendorf|biesse|homag/i;   // oddiy matn/CSV faylda noto'g'ri stanok nomi bo'lmasin

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (t) => (await M(() => document.body.innerText)).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const fs = await import('node:fs');
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Fayl Usta'); await fill('jasur@', 'fayl' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => /\d/.test((document.querySelector('header button[class], header button') || {}).textContent || '') && window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  const btn = (re) => page.locator('[data-panel] button', { hasText: re }).first();
  R.tugmalar = await M(() => [...document.querySelectorAll('[data-panel] button')].map(b => b.textContent.trim()).filter(x => x && !/tez orada/.test(x)));

  /* [tugma matni, (ixtiyoriy) varaq ichidagi yuklash tugmasi, nom regex, imzo tekshiruvi (bayt, matn)] */
  const J = [
    ['Excel smeta', null, /-smeta\.xlsx$/, (b) => (zipNomlar(b) || []).includes('xl/workbook.xml')],
    ['Detallar (CSV)', null, /\.csv$/, (b) => /,|;/.test(matn(b).split('\n')[0]) && !STANOK_NOMI.test(matn(b))],
    ['Loyiha fayli', null, /\.json$/, (b) => { const j = json(b); return !!j && j.app === 'smart3d' && !!j.doc; }],
    ['Smeta (CSV)', null, /\.csv$/, (b) => /,|;/.test(matn(b).split('\n')[0])],
    [/^OBJ — butun loyiha$/, null, /\.obj$/, (b) => { const m = matn(b); return /^# /.test(m) && /^v /m.test(m) && /^f /m.test(m) && !/^mtllib/m.test(m); }],
    [/^OBJ \+ rang/, null, /-rang\.zip$/, (b, nom) => { const z = zipNomlar(b) || []; return z.length === 2 && z.some(x => /\.obj$/.test(x)) && z.some(x => /\.mtl$/.test(x)); }],
    [/^SketchUp \(\.skp\)/, null, /\.skp$/, (b) => b.length > 100 && b[0] === 0xff && b[1] === 0xfe && b[2] === 0xff && b[3] === 0x0e && String.fromCharCode(b[4], b[6], b[8], b[10]) === 'Sket'],
    [/^SketchUp Pro \(\.dae\)/, null, /\.dae$/, (b) => /^<\?xml/.test(matn(b)) && /<COLLADA/.test(matn(b))],
    ['Teshiklar (JSON)', null, /\.json$/, (b) => { const j = json(b); return !!j && Array.isArray(j.holes); }],
    [/^GibLab$/, null, /\.project$/, (b) => /^<\?xml/.test(matn(b)) && !STANOK_NOMI.test(matn(b).slice(0, 200))],
    [/^DXF$/, null, /\.dxf$/, (b) => /^\s*0\s*\n\s*SECTION/.test(matn(b)) && /EOF\s*$/.test(matn(b))],
    [/^G-code$/, null, /\.nc$/, (b) => /^[%(]|^G\d|^N\d/m.test(matn(b)) && /^G0?[01]\b/m.test(matn(b))],
    [/^PTP$/, null, /-ptp\.csv$/, (b) => /,|;/.test(matn(b).split('\n')[0])],
    [/^NC$/, null, /-teshik\.nc$/, (b) => /^[%(]|^G\d|^N\d|^M\d/m.test(matn(b))],
    [/^XNC$/, null, /-xnc\.csv$/, (b) => /,|;/.test(matn(b).split('\n')[0])],
    ['Kesim rejasi (matn)', null, /-kesim-rejasi\.txt$/, (b) => /FAZALI KESIM/.test(matn(b)) && !STANOK_NOMI.test(matn(b))],
    ['Altendorf — GibLab orqali', '[data-altendorf-yukla]', /\.project$/, (b) => /^<\?xml/.test(matn(b))],
    [/Bazis \(\.bpj\)/, '[data-bpj-yukla]', /\.bpj$/, (b) => { const j = json(b); return !!j && !!j.meta && Array.isArray(j.blocks); }],
    [/Bazis \(\.b3d\)/, '[data-b3d-yukla]', /\.b3d$/, (b) => String.fromCharCode(...b.subarray(0, 4)) === 'BZ85'],
    ['GLB (3D/AR)', null, /\.glb$/, (b) => String.fromCharCode(...b.subarray(0, 4)) === 'glTF'],
    [/^Rasm/, null, /\.png$/, (b) => b[0] === 0x89 && String.fromCharCode(...b.subarray(1, 4)) === 'PNG', 60000],
    [/^360°/, null, /\.jpe?g$/, (b) => b[0] === 0xff && b[1] === 0xd8, 60000]
  ];
  R.fayl = {};
  for (const [tugma, ichki, nomRe, imzo, vaqt] of J) {
    const kalit = typeof tugma === 'string' ? tugma : String(tugma);
    try {
      if (!(await page.locator('[data-panel] button', { hasText: tugma }).count())) { await click(/^Fayllar$/); await page.waitForTimeout(800); }
      const yuk = ichki ? () => btn(tugma).click().then(() => page.waitForTimeout(500)).then(() => page.locator(ichki).click()) : () => btn(tugma).click();
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: vaqt || 25000 }), yuk()]);
      const b = new Uint8Array(fs.readFileSync(await d.path()));
      const nom = d.suggestedFilename();
      R.fayl[kalit] = { nom, kb: Math.round(b.length / 1024), bosh: Array.from(b.subarray(0, 8)).map(x => x.toString(16).padStart(2, '0')).join(''), nomOk: nomRe.test(nom), imzoOk: !!imzo(b, nom) };
    } catch (e) { R.fayl[kalit] = { xato: String(e.message).split('\n')[0], nomOk: false, imzoOk: false }; }
    await page.waitForTimeout(400);
  }
  /* OBJ: ikkita fayl chiqmasin (.mtl alohida yuklanmasin) — yuqorida bitta download kutildi; yana bir download kelmasligini tekshiramiz */
  let ortiqcha = null;
  page.once('download', (d) => { ortiqcha = d.suggestedFilename(); });
  if (!(await page.locator('[data-panel] button', { hasText: /^OBJ — butun loyiha$/ }).count())) { await click(/^Fayllar$/); await page.waitForTimeout(800); }
  await btn(/^OBJ — butun loyiha$/).click(); await page.waitForTimeout(1500);
  R.objBirinchi = ortiqcha;   // faqat .obj
  R.objFaqatBitta = /\.obj$/.test(ortiqcha || '');
  /* PDF hisobot — yangi oyna (HTML; chop etishda PDF), fayl emas */
  try {
    if (!(await page.locator('[data-panel] button', { hasText: 'Hisobot (PDF)' }).count())) { await click(/^Fayllar$/); await page.waitForTimeout(800); }
    const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 15000 }), btn('Hisobot (PDF)').click()]);
    await pop.waitForLoadState('domcontentloaded'); R.hisobot = { oyna: true }; await pop.close();
  } catch (e) { R.hisobot = { xato: String(e.message).split('\n')[0] }; }
  R.errs = errs;
  const hammasi = Object.values(R.fayl);
  R.nomXato = Object.entries(R.fayl).filter(([, v]) => !v.nomOk || !v.imzoOk).map(([k, v]) => k + ': ' + (v.xato || v.nom + ' ' + v.bosh));
  R.ok = hammasi.length === J.length && R.nomXato.length === 0 && R.objFaqatBitta && R.hisobot.oyna === true && errs.length === 0;
}
