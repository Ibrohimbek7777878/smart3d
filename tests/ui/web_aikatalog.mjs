/* egasi #183: "bizda bor modullardan foydalanib AI bizga konstruksiya qilib bersin" — testchining 14 so'rovi brauzerda (AI'siz tahlilchi).
 * Har so'rov: matn qatoriga yoziladi → karta har doim chiqadi; faqat katalog modullari (CH- yo'q), ustma-ust 0; xona so'rovi — shablon,
 * tanilmagan — hech narsa qurilmaydi. Natija: R.jadval (har so'rov: karta matni, modullar), skrinshotlar tests/ui/out/web/aikatalog-<n>.png.
 * Ishlatish: bash tests/ui/web.sh aikatalog */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/aikatalog-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const EGA = 'Kuxnya 4500 mm, Haytek bezruchka, gola frofilli birinchi etaj balandligi 870mm fartuk 600 mm 2 etaj 750mm 3 etaj 600mm balandlikda, chuqurliklar 1 etaj 450 mm 2 etaj 350mm, 3 etaj 560mm gaz va vitichka 600mm dan 1 etajda 3 ta tortma bor tandem vacuum,Stolichnitsa 38mmx600mm';
/* [so'rov, karta matnida bo'lishi shart (regex), qo'shimcha tekshiruv (holat → bool)] */
const SORA = [
  ['oshxona 3 metr', /Shakl: to'g'ri/, (h) => h.n > 0],
  [EGA, /3-qavat modullari/, (h) => h.n > 0],
  ['L shaklli oshxona 3600x3000', /Shakl: burchakli \(L/, (h) => h.n > 0],
  ['P shaklli oshxona 3600x2800x2400', /Shakl: P shakl \(U[\s\S]*2400 — shift balandligi/, (h) => h.H === 2400 && h.tepa <= 2400],
  ['кухня 3200 мм, духовка в колонне, посудомойка', /Duxovka kolonnada \(penal\) — bajarildi: SP-K-020[\s\S]*Idish yuvish mashinasi \(moyka yonida\) — bajarildi: SP-TX-002/, (h) => h.kod.includes('SP-K-020') && h.kod.includes('SP-TX-002')],
  ['oshxona 2.4 m ustki shkaflarsiz', /Ustki shkaflar — yo'q/, (h) => h.n > 0 && h.ustki === 0],
  ['shkaf-kupe 2400 eni, 3 eshik', /SP-G-011[\s\S]*eshik: 3 — mos/, (h) => h.kod.includes('SP-G-011')],
  ['yotoqxona: krovat 1600, ikki tumba, garderob', /SP-BD-003[\s\S]*tumba ×2 bajarilmadi/i, (h) => h.kod.includes('SP-BD-003') && h.kod.includes('SP-W-006') && !h.kod.some(c => /^MC-KP/.test(c))],
  ['dahliz 1800, kiyim ilgich va oyoq kiyim joyi', /Xona eni: 1800 mm[\s\S]*SP-D-002[\s\S]*SP-W-008/, (h) => h.W === 1800 && h.kod.includes('SP-D-002') && h.kod.includes('SP-W-008')],
  ['mehmonxona tv zona 3000', /3000 mm so'raldi, shablon chegarasi 3400–8000 → 3400 mm[\s\S]*SP-SH-002/, (h) => h.kod.includes('SP-SH-002') && !h.kod.some(c => /^MC-K|^SP-K-/.test(c))],
  ["Shkaf 1200×600×2200: chapda shtanga, o'ngda 4 polka, 2 eshik", /MC-SH-01/, (h) => h.kod.includes('MC-SH-01')],
  ['pastki shkaf 600 eshikli', /Tanlandi: MC-KP-02/, (h) => h.kod.includes('MC-KP-02') && !h.kod.includes('MC-KP-08')],
  ['pastki shkaf 800 3 tortma', /Tanlandi: SP-K-022/, (h) => h.kod.includes('SP-K-022')],
  ['salom, menga mashina chizib ber', /Tushunmadim \/ qura olmayman[\s\S]*Tayyor variantlar:/, (h, old) => h.n === old.n]
];

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const qator = page.locator('[data-matn]');
  const kut = async (fn, arg, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };
  const holat = () => M(() => {
    const a = window.__app, pl = a.doc.placements, C = a.H.catalog;
    const fp = (p) => { const r = ((+p.rot || 0) % 360 + 360) % 360, sw = r === 90 || r === 270; const w = sw ? p.d : p.w, d = sw ? p.w : p.d;
      const x0 = r === 0 ? p.x : r === 90 ? p.x - w : r === 180 ? p.x - w : p.x, y0 = r === 0 ? p.y : r === 90 ? p.y : r === 180 ? p.y - d : p.y - d; return [x0, y0, x0 + w, y0 + d]; };
    let ust = 0;
    for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
      const A = fp(pl[i]), B = fp(pl[j]), za = +pl[i].z || 0, zb = +pl[j].z || 0;
      if (A[0] < B[2] - 2 && B[0] < A[2] - 2 && A[1] < B[3] - 2 && B[1] < A[3] - 2 && za < zb + (+pl[j].h || 0) - 1 && zb < za + (+pl[i].h || 0) - 1) ust++;
    }
    const xs = a.doc.room.outline.map(p => p[0]);
    return { n: pl.length, kod: [...new Set(pl.map(p => p.frg))], ust, katalog: pl.every(p => C[p.frg] && !/^CH-/.test(p.frg)),
      chizma: Object.keys(a.doc.chizmalar || {}).length, H: a.doc.room.wall_height, W: Math.max(...xs) - Math.min(...xs),
      tepa: Math.max(0, ...pl.map(p => (+p.z || 0) + (+p.h || 0))), ustki: pl.filter(p => (+p.z || 0) >= 1000 && (C[p.frg] || {}).category !== 'appliance').length };
  });
  const karta = () => M(() => { const el = document.querySelector('[data-ai-oshxona]'); return el ? el.innerText : null; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Katalog Usta'); await fill('jasur@', 'kat' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  R.jadval = [];
  /* bitta modul so'rovlari (7, 11–13) — avval, bo'sh loyihada (modul joriy xonaga qo'shiladi; oshxona ichiga emas) */
  const TARTIB = [6, 10, 11, 12, 0, 1, 2, 3, 4, 5, 7, 8, 9, 13];
  for (const i of TARTIB) {
    const [matn, re, tek] = SORA[i];
    /* oldingi karta yopiladi; bitta modul so'rovlari — bo'sh loyihada (oldingi xona ichiga emas) */
    for (let k = 0; k < 3 && await M(() => !!document.querySelector('[data-ai-oshxona]')); k++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    const old = await holat();
    await qator.fill(matn); await qator.press('Enter');
    if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 1500)) await click(/^Almashtirish$/);
    const k = await kut(() => document.querySelector('[data-ai-oshxona]') && document.querySelector('[data-ai-oshxona]').innerText, null, 8000);
    await page.waitForTimeout(700);
    const h = await holat();
    const kt = k ? await karta() : null;
    await page.screenshot({ path: `${OUT}/aikatalog-${i + 1}.png` });
    const yangi = h.chizma === old.chizma;                         // yangi CH- modul chizilmadi
    const ok = !!kt && re.test(kt) && h.katalog !== false && (h.n === 0 || h.katalog) && h.ust === 0 && yangi && tek(h, old);
    R.jadval.push({ n: i + 1, matn: matn.slice(0, 60), ok, karta: kt ? kt.slice(0, 900) : null, modul: h.n, kod: h.kod.slice(0, 14), ust: h.ust, xona: [h.W, h.H] });
  }
  R.jadval.sort((a, b) => a.n - b.n);
  /* telefon (390): karta toshmaydi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  R.toshish = await M(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await page.screenshot({ path: `${OUT}/aikatalog-390.png` });
  R.errs = errs;
  R.ok = R.jadval.every(x => x.ok) && !R.toshish && errs.length === 0;
}
