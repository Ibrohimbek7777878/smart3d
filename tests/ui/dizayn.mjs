/* TZ-09: tasdiqlangan dizayn (frontend/design_handoff_smart3d) va web/ (React) — bir xil ssenariy bo'yicha skrinshotlar.
 * Ishlatish: tests/ui/dizayn.sh orqali (o'zi to'g'ridan-to'g'ri chaqirilmaydi).
 * Muhit: OUT — papka, TAG — fayl prefiksi (dizayn|react), W/H — ekran o'lchami, PAGE — sayt|ilova.
 * Har skrinshot yonida 3D maydonlar ro'yxati (masks) — animatsiya har kadrda boshqacha, solishtirishda chetlab o'tiladi. */
import { writeFileSync } from 'node:fs';

export default async function run(page) {
  const { OUT, TAG, PAGE } = process.env;
  const W = +process.env.W, H = +process.env.H;
  const errs = [];
  const masks = {};
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.setViewportSize({ width: W, height: H });
  /* TZ-18: test brauzeri ingliz tilida — React sahifa o'zbek tilida solishtiriladi (dizayn — o'zbekcha) */
  if (TAG === 'react') { await page.evaluate(() => localStorage.setItem('s3d-til', 'uz'), undefined, false); await page.reload(); }
  /* animatsiyalarni to'xtatmaymiz (dizaynga aralashmaslik uchun) — faqat yetarli kutamiz */
  await page.waitForTimeout(3500);

  const shot = async (name) => {
    masks[name] = await page.evaluate(() => [...document.querySelectorAll('canvas, svg')]
      .filter(c => c.tagName === 'CANVAS' || c.getBoundingClientRect().width > 150)   // 3D (WebGL yoki SVG zaxira)
      .map(c => (c.parentElement || c).getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight)
      .map(r => [Math.floor(r.left), Math.floor(r.top), Math.ceil(r.right), Math.ceil(r.bottom)]));
    await page.screenshot({ path: `${OUT}/${TAG}-${W}-${name}.png` });
  };
  const click = async (re, last = false) => {
    const l = page.getByText(re);
    const n = await l.count();
    if (!n) return false;
    await (last ? l.nth(n - 1) : l.first()).click();
    return true;
  };

  if (PAGE === 'sayt') {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round(H * 0.9);
    for (let y = 0, i = 0; y < total - H / 2; y += step, i++) {
      await page.evaluate(yy => window.scrollTo(0, yy), y);
      await page.waitForTimeout(1800);
      await shot('sayt-' + String(i).padStart(2, '0'));
    }
  } else {
    await shot('1-royxat');
    await click(/^Kirish$/, true); await page.waitForTimeout(900);
    await shot('2-kirish');
    await click(/^Ro'yxatdan o'tish$/, true); await page.waitForTimeout(900);
    const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); if (await el.count()) await el.fill(v); };
    await fill('Jasur', 'Test Usta');
    await fill('jasur@', 'dizayn' + Date.now() + '@test.uz');          // TZ-09 Q2: faqat yangi frontendda
    const tel = page.locator('input[type=tel], input[inputmode=numeric], input[inputmode=tel]').first();
    if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
    await fill('kamida 8', 'parol12345');
    await click(/^Ro'yxatdan o'tish$/, true); await page.waitForTimeout(1200);
    await shot('3-onboarding1');
    await click(/^Oshxona$/); await page.waitForTimeout(900);
    await shot('4-onboarding2');
    await click(/Muharrirni ochish/); await page.waitForTimeout(4500);
    await shot('5-mebel');
    for (const [i, s] of [[6, 'Xona'], [7, 'Narx'], [8, 'Fayllar']]) {
      await click(new RegExp('^' + s + '$')); await page.waitForTimeout(1500);
      await shot(`${i}-${s.toLowerCase()}`);
    }
    /* telefonda (≤980px) chap menyu yashirin — loyihalarga logo orqali o'tiladi */
    if (W > 980) await click(/^Loyihalar$/);
    else await page.locator('header button').first().click();
    await page.waitForTimeout(1500);
    await shot('9-loyihalar');
  }
  writeFileSync(`${OUT}/${TAG}-${W}-${PAGE}-masks.json`, JSON.stringify(masks));
  return { errs, shots: Object.keys(masks).length };
}
