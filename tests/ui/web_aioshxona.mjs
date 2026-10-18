/* egasi #166, #168: matn qatoridan oshxona — faqat katalog modullaridan (CH- yo'q; o'lcham modul chegarasida, chegaradan tashqarisi kartada); — "Kuxnya 4500 mm, Haytek bezruchka, gola …" bitta modul EMAS, 3 qavatli to'g'ri oshxona
 * (sinov serverida AI kaliti yo'q → AI'siz tahlilchi). Tekshiriladi: "AI oshxona — nima tushunildi" kartasi (matndan / sukut),
 * qator 4500, 3 qavat (z 100 / 1470 / 2220; bo'yi 732 / 750 / 600; chuqurligi 450 / 350 / 560), gaz va vityajka 600 bir o'qda,
 * 3 tortmali modul (Tandem vakuum), hamma modul ruchkasiz, Gola, stoleshnitsa 38; narx hisoblandi; ruscha matn; telefon (390).
 * Skrinshotlar: tests/ui/out/web/ai-oshxona-*.png. Ishlatish: bash tests/ui/web.sh aioshxona */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/ai-oshxona-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const EGA = 'Kuxnya 4500 mm, Haytek bezruchka, gola frofilli birinchi etaj balandligi 870mm fartuk 600 mm 2 etaj 750mm 3 etaj 600mm balandlikda, chuqurliklar 1 etaj 450 mm 2 etaj 350mm, 3 etaj 560mm gaz va vitichka 600mm dan 1 etajda 3 ta tortma bor tandem vacuum,Stolichnitsa 38mmx600mm';
const RUS = 'Кухня 4,5 м, хайтек без ручек, профиль Гола, первый ярус высота 870 мм, фартук 600 мм, второй ярус 750 мм, третий ярус 600 мм высотой, глубина: первый ярус 450 мм, второй ярус 350 мм, третий ярус 560 мм, газ и вытяжка 600 мм, в первом ярусе 3 ящика тандем вакуум, столешница 38х600 мм';

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const qator = page.locator('[data-matn]');
  const yoz = async (s) => { await qator.fill(s); await qator.press('Enter'); };
  const kut = async (fn, arg, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };
  /* qurilgan oshxona: qavatlar, gaz/vityajka o'qi, tortma, ruchkasiz, Gola, stoleshnitsa, narx */
  const holat = () => M(() => {
    const a = window.__app, pl = a.doc.placements, uniq = (arr) => [...new Set(arr)];
    const mc = (re) => pl.filter(p => re.test(p.frg));
    const P = mc(/^MC-KP/), U = pl.filter(p => /^MC-KU/.test(p.frg) && p.z < 2000), A = pl.filter(p => /^MC-KU/.test(p.frg) && p.z >= 2000);
    const pastki = pl.filter(p => p.z < 1000), xs = pastki.flatMap(p => [p.x, p.x + p.w]);
    const gaz = pl.find(p => p.frg === 'SP-TX-008'), vyt = pl.find(p => p.frg === 'SP-TX-006');
    return {
      n: pl.length, qator: Math.max(...xs) - Math.min(...xs),
      q1: uniq(P.map(p => [p.z, p.h, p.d].join('/'))), q2: uniq(U.map(p => [p.z, p.h, p.d].join('/'))), q3: uniq(A.map(p => [p.z, p.h, p.d].join('/'))),
      gaz: gaz && [gaz.w, gaz.x + gaz.w / 2], vyt: vyt && [vyt.w, vyt.x + vyt.w / 2, vyt.z],
      tortma: mc(/^MC-KP-10$/).map(p => p.yonaltiruvchi), ruchkasiz: pl.filter(p => /^MC-/.test(p.frg)).every(p => p.ruchkasiz),
      kitchen: a.doc.kitchen && { stolT: a.doc.kitchen.stolT, gola: a.doc.kitchen.gola }, h: a.doc.room.wall_height,
      narx: a.res && a.res.priceRes.total,
      katalogMi: pl.every(p => a.H.catalog[p.frg] && !/^CH-/.test(p.frg)) && !Object.keys(a.doc.chizmalar || {}).length,   // egasi #168
      hw: a.res ? a.res.cutlists.flatMap(c => c.hardware).filter(h => /GOLA|TANDEM|ручк|ruchk|^RU-/i.test(h.code + ' ' + (h.name || ''))).map(h => h.code + ':' + h.qty) : []
    };
  });
  const karta = () => M(() => {
    const el = document.querySelector('[data-ai-oshxona]');
    return el ? { matn: el.innerText, sukut: el.querySelectorAll('[data-manba="sukut"]').length, matndan: el.querySelectorAll('[data-manba="matn"]').length } : null;
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Oshxona Usta'); await fill('jasur@', 'osh' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* 1) egasining matni (aynan) */
  const oldin = await M(() => Object.keys(window.__app.doc.chizmalar || {}).length);
  await yoz(EGA);
  if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 2500)) await click(/^Almashtirish$/);
  R.karta = await kut(() => !!document.querySelector('[data-ai-oshxona]')) ? await karta() : null;
  await kut(() => window.__app.res && window.__app.doc.placements.some(p => p.frg === 'MC-KP-10'));
  await page.waitForTimeout(1200);
  R.ega = await holat();
  R.chizilganYoq = (await M(() => Object.keys(window.__app.doc.chizmalar || {}).length)) === oldin;   // "Chizilgan shkaf" qo'shilmadi
  /* 3D: ruchka meshlari (materials3d: BoxGeometry(handle.w, handle.d = 22, handle.h)) — ruchkasiz oshxonada 0 */
  R.ruchkaMesh = await M(() => { let n = 0; window.__app.sahna.sp.groups.items.traverse(o => { const g = o.geometry && o.geometry.parameters; if (o.isMesh && g && g.height === 22 && (g.width <= 160 && g.depth <= 120)) n++; }); return n; });
  await page.screenshot({ path: `${OUT}/ai-oshxona-1440-karta.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/ai-oshxona-1440-3d.png` });

  /* 2) ruscha matn — loyiha almashadi (tasdiq), natija bir xil */
  await yoz(RUS);
  if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 4000)) await click(/^Almashtirish$/);
  await kut(() => !!document.querySelector('[data-ai-oshxona]'));
  await page.waitForTimeout(1200);
  R.rus = await holat();
  R.rusKarta = await karta();

  /* 3) telefon (390) — karta toshmaydi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  R.toshish = await M(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `${OUT}/ai-oshxona-390.png` });
  R.errs = errs;

  const togri = (h) => h && Math.abs(h.qator - 4500) <= 50 && JSON.stringify(h.q1) === '["100/732/450"]' && JSON.stringify(h.q2) === '["1470/750/350"]'
    && JSON.stringify(h.q3) === '["2220/600/400"]' && h.katalogMi && h.gaz && h.vyt && h.gaz[0] === 600 && h.vyt[0] === 600 && Math.abs(h.gaz[1] - h.vyt[1]) < 1 && h.vyt[2] === 1470
    && JSON.stringify(h.tortma) === '["tandem_vakuum"]' && h.ruchkasiz && h.kitchen && h.kitchen.stolT === 38 && h.kitchen.gola && h.kitchen.gola.gorizontal > 0
    && h.h >= 2820 && h.narx > 0 && h.hw.some(x => /^GOLA-PROFIL:/.test(x)) && h.hw.includes('TANDEM-VAKUUM:3') && !h.hw.some(x => /^RU-|ручк|ruchk/i.test(x));
  R.ok = !!R.karta && /4500/.test(R.karta.matn) && /870/.test(R.karta.matn) && /600/.test(R.karta.matn) && /Gola/.test(R.karta.matn) && /Tandem/.test(R.karta.matn) && /38/.test(R.karta.matn)
    && /MC-KP-10 · /.test(R.karta.matn) && /3-qavat modullari: MC-KU-0[67]/.test(R.karta.matn) && /MC-KU-0[67]: chuqurligi 560 mm so'raldi, modul chegarasi 290–400 → 400 mm/.test(R.karta.matn)
    && R.karta.matndan >= 8 && R.karta.sukut >= 1 && R.chizilganYoq && R.ruchkaMesh === 0 && togri(R.ega) && togri(R.rus) && !!R.rusKarta && !R.toshish && errs.length === 0;
}
