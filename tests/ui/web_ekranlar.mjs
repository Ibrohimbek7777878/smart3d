/* TZ-18 9-bosqich: yakuniy tekshiruv — 3 til × telefon (390) / planshet (768) / kompyuter (1440), har ekran va oyna:
 * gorizontal aylantirish yo'q; rus va ingliz matni sig'adi — o'zbek tilida yo'q kesilish/toshish rus/inglizda paydo bo'lmagan
 * (o'zbek — tasdiqlangan dizayn, u asos). Ekranlar: sayt, ro'yxat, onboarding (2), muharrir 4 qadam, oynalar (teshik,
 * oshxona, material, konstruktor, AI), loyihalar, sozlamalar. Tugmalar lug'atdan topiladi — har tilda bir xil yo'l.
 * Ishlatish: bash tests/ui/web.sh ekranlar */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const I18N = fileURLToPath(new URL('../../web/src/i18n/', import.meta.url));
const LUG = Object.fromEntries(['uz', 'ru', 'en'].map(l => [l, JSON.parse(readFileSync(I18N + l + '.json', 'utf8'))]));
const VP = [[390, 844], [768, 1024], [1440, 900]];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/ekranlar-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

/* sahifada: ko'rinadigan matnli element — ekrandan chiqqan, o'zi yoki kesuvchi otasi ichida kesilgan, qutisidan toshgan.
 * 3D (canvas, svg) va 3D yorliqlar (will-change), aylanadigan qatorlar ichidagilar hisobga olinmaydi. */
function tekshir() {
  const vw = document.documentElement.clientWidth;
  const yol = (el) => { const p = []; for (let e = el; e && e !== document.body; e = e.parentElement) { let i = 1; for (let s = e.previousElementSibling; s; s = s.previousElementSibling) i++; p.unshift(e.tagName.toLowerCase() + i); } return p.join('>'); };
  const kor = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } return true; };
  const yopiq = (v) => v === 'hidden' || v === 'clip';
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('canvas,svg,script,style,[aria-hidden="true"],[style*="will-change"]')) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || !kor(el)) continue;
    const c = getComputedStyle(el);
    let tur = null, ota = null;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {   // birinchi "visible" bo'lmagan ota
      const ce = getComputedStyle(e);
      if (ce.overflowX !== 'visible' || ce.overflowY !== 'visible') { ota = { e, ce }; break; }
    }
    if (r.right > vw + 1 || r.left < -1) { if (!ota || yopiq(ota.ce.overflowX)) tur = 'ekrandan chiqdi'; }
    else if (yopiq(c.overflowX) && el.scrollWidth > el.clientWidth + 1 && c.textOverflow !== 'ellipsis') tur = 'eni kesildi';
    else if (yopiq(c.overflowY) && el.scrollHeight > el.clientHeight + 2) tur = "bo'yi kesildi";
    else if (c.display !== 'inline' && c.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1) tur = 'qutidan toshdi';
    else if (ota) {
      const re = ota.e.getBoundingClientRect();
      /* to'liq yashirin (yopiq akkordeon javobi — ota bo'yi 0, matn butunlay tashqarida) — ataylab, kesilish emas;
         kesilish — qisman ko'rinib, qisman yo'qolgan matn (2026-10-16: saytdagi FAQ animatsiyasi testni beqaror qilardi) */
      const kesishmaydi = r.right <= re.left || r.left >= re.right || r.bottom <= re.top || r.top >= re.bottom;
      if (kesishmaydi) continue;
      if ((yopiq(ota.ce.overflowX) && (r.right > re.right + 1 || r.left < re.left - 1)) ||
          (yopiq(ota.ce.overflowY) && (r.bottom > re.bottom + 1 || r.top < re.top - 1))) tur = 'ota ichida kesildi';
    }
    if (tur) out.push({ yol: yol(el), tur, matn: own.slice(0, 40) });
  }
  return { hScroll: document.documentElement.scrollWidth > vw + 1, out };
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const waitText = async (s, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const tugma = (s, sel = 'button') => page.locator(sel).filter({ hasText: new RegExp('^\\s*' + esc(s) + '\\s*$') });
  /* DOM orqali bosish (joylashuv testi — ustidagi maslahat pufakchasi xalaqit bermasin): sel ichida matni mos birinchisi */
  const bos = async (sel, matn, aniq = true) => {
    const ok = await M(([sel, matn, aniq]) => { const n = (x) => x.replace(/\s+/g, ' ').trim(), m = n(matn);
      const el = [...document.querySelectorAll(sel)].find(b => { const x = n(b.innerText); return aniq ? x === m : x.includes(m); });
      if (el) el.click(); return !!el; }, [sel, matn, aniq]);
    if (!ok) throw new Error('topilmadi: ' + sel + ' "' + matn + '"');
  };
  const base = page.url().split(/[?#]/)[0].replace(/app\.html$/, '');
  const N = {};            // til → [{ ekran, en, hScroll, out }]

  /* bitta ekran: uch o'lchamda tekshiriladi (kirish — 1440 da), keyin 1440 ga qaytadi */
  const olch = async (til, ekran, oldin) => {
    for (const [w, h] of VP) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(450);
      if (oldin) await oldin();
      const t = await M(tekshir);
      N[til].push({ ekran, en: w, hScroll: t.hScroll, out: t.out });
      if (til !== 'uz' && w === 390) await page.screenshot({ path: `${OUT}/ekran-${til}-${ekran}-390.png` });
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
  };
  const varaq = async (til, ekran, och) => {
    await och(); await page.waitForTimeout(600);
    if (!(await page.locator('[role=dialog]').count())) { N[til].push({ ekran, en: 0, hScroll: false, out: [{ yol: '-', tur: 'oyna ochilmadi', matn: ekran }] }); return; }
    await olch(til, ekran);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  };

  for (const til of ['uz', 'ru', 'en']) {
    const L = LUG[til];
    N[til] = [];
    await page.context().clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '?t=' + Date.now());
    await M((k) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', k); }, til);

    /* sayt: yuqori, o'rta, pastki qism */
    await page.goto(base + '?t=' + Date.now()); await page.waitForTimeout(2500);
    for (const [nom, k] of [['sayt', 0], ['sayt-orta', 0.45], ['sayt-past', 1]]) {
      await olch(til, nom, async () => { await M((q) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * q), k); await page.waitForTimeout(700); });
    }

    /* ro'yxat */
    await page.goto(base + 'app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(2500);
    await olch(til, 'royxat');
    await page.locator(`input[placeholder="${L['kirish.jasur_aliyev']}"]`).fill('Ekran ' + til);
    await page.locator(`input[placeholder="${L['kirish.jasur_mail_uz']}"]`).fill('ekran' + til + Date.now() + '@test.uz');
    const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
    await page.locator(`input[placeholder="${L['kirish.kamida_8_belgi']}"]`).fill('parol12345');
    await tugma(L['kirish.royxat']).last().click();
    if (!(await waitText(L['onb.nima_yasaymiz']))) throw new Error(til + ': ro\'yxatdan keyin onboarding ochilmadi');

    /* onboarding */
    await olch(til, 'onb1');
    await page.getByText(L['onb.oshxona'], { exact: true }).last().click(); await page.waitForTimeout(500);
    await olch(til, 'onb2');
    await page.getByText(L['onb.muharrirni_ochish'], { exact: true }).last().click();
    for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(1200);

    /* muharrir: 4 qadam va oynalar */
    await bos('button[data-navbtn]', L['qadam.xona'], false); await page.waitForTimeout(700);   // onboarding'dan keyin 2-qadam ochiladi
    await olch(til, 'xona');
    await varaq(til, 'teshik', () => bos('button', L['xona.qoshish'].replace(/^\+\s*/, ''), false));
    await varaq(til, 'oshxona', () => bos('button', L['xona.sozlash'], false));
    await varaq(til, 'ai', () => M(() => document.querySelector('button[aria-label="AI"]').click()));
    await bos('button[data-navbtn]', L['qadam.mebel'], false); await page.waitForTimeout(700);
    await olch(til, 'mebel');
    await varaq(til, 'material', () => bos('[data-panel] button', L['mebel.korpus'], false));
    await varaq(til, 'konstruktor', () => M(() => document.querySelector('button[data-konstruktor]').click()));
    await bos('button[data-navbtn]', L['qadam.narx'], false); await page.waitForTimeout(900);
    await olch(til, 'narx');
    await bos('button[data-navbtn]', L['qadam.fayllar'], false); await page.waitForTimeout(900);
    await olch(til, 'fayllar');

    /* loyihalar va sozlamalar */
    await bos('button[data-ednav-x]', L['qadam.loyihalar']);
    await waitText(L['loyihalar.loyihalarim']); await page.waitForTimeout(500);
    await olch(til, 'loyihalar');
    await page.locator('[data-sozlamalar]').first().click(); await page.waitForTimeout(1200);
    await olch(til, 'sozlamalar');
  }

  /* natija: gorizontal aylantirish (har tilda) va rus/inglizda yangi paydo bo'lgan kesilish/toshish (o'zbekda yo'q) */
  const kalit = (x, o) => x.ekran + '|' + x.en + '|' + o.yol + '|' + o.tur;
  const uzK = new Set(N.uz.flatMap(x => x.out.map(o => kalit(x, o))));
  R.ekranlar = N.uz.length;
  R.hScroll = Object.entries(N).flatMap(([til, a]) => a.filter(x => x.hScroll).map(x => til + ':' + x.ekran + '@' + x.en));
  R.yangi = {};
  for (const til of ['ru', 'en']) R.yangi[til] = N[til].flatMap(x => x.out.filter(o => !uzK.has(kalit(x, o))).map(o => x.ekran + '@' + x.en + ' ' + o.tur + ': ' + o.matn));
  R.ochilmadi = Object.entries(N).flatMap(([til, a]) => a.flatMap(x => x.out.filter(o => o.tur === 'oyna ochilmadi').map(() => til + ':' + x.ekran)));
  R.uzMavjud = N.uz.reduce((s, x) => s + x.out.length, 0);          // dizayndagi holat (ma'lumot uchun)
  R.uzMisol = [...new Set(N.uz.flatMap(x => x.out.map(o => x.ekran + ' ' + o.tur + ': ' + o.matn)))].slice(0, 12);
  R.errs = errs;
  R.ok = R.ekranlar >= 45 && R.hScroll.length === 0 && R.yangi.ru.length === 0 && R.yangi.en.length === 0 && R.ochilmadi.length === 0 && errs.length === 0;
}
