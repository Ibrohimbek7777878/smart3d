/* TZ-16: Telegram Mini App — brauzer testi (Telegram muhiti taqlid qilinadi: telegram-web-app.js o'rniga soxta skript,
 * initData — test kaliti bilan imzolangan, Bot API — soxta server; internetga chiqilmaydi).
 * Tekshiriladi: oddiy saytda Telegram skripti yuklanmaydi; Telegram ichida — forma o'rniga kutish ekrani, avtomatik kirish,
 * sarlavha/fon rangi #0F2229, vertikal surish o'chiq, kalit saqlanmaydi (localStorage/cookie bo'sh), telefon (webhook) —
 * ilova o'zi yangilanadi, "Orqaga" tugmasi, loyiha serverga saqlanadi, fayl bot chatiga ketadi. Ishlatish: bash tests/ui/web.sh telegram */
import crypto from 'node:crypto';

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/telegram-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

function imzola(fields, token) {
  const p = new URLSearchParams(fields);
  const q = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(q).digest('hex'));
  return p.toString();
}

/* soxta telegram-web-app.js: initData — haqiqiysidek hash'dagi tgWebAppData dan; chaqiruvlar window.__tg ga yoziladi */
const SOXTA = `(function(){
  var h = new URLSearchParams(location.hash.slice(1)), d = h.get('tgWebAppData') || '', u = {};
  try { u = JSON.parse(new URLSearchParams(d).get('user')); } catch (e) {}
  var T = window.__tg = { yuklandi: true };
  window.Telegram = { WebApp: { initData: d, initDataUnsafe: { user: u }, version: '8.0', platform: 'test',
    ready: function(){ T.ready = true; }, expand: function(){ T.expand = true; },
    setHeaderColor: function(c){ T.header = c; }, setBackgroundColor: function(c){ T.bg = c; },
    disableVerticalSwipes: function(){ T.swipes = false; },
    BackButton: { show: function(){ T.back = true; }, hide: function(){ T.back = false; }, onClick: function(f){ T.backFn = f; }, offClick: function(){} },
    requestContact: function(cb){ T.contact = true; T.contactCb = cb; } } };
})();`;

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const waitText = async (s, ms = 12000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const until = async (fn, ms = 15000) => { for (let i = 0; i < ms / 250; i++) { const v = await M(fn); if (v) return v; await page.waitForTimeout(250); } return null; };
  const base = page.url().split(/[?#]/)[0].replace(/app\.html$/, '');
  const SRV = `http://127.0.0.1:${process.env.NPORT}`, MOCK = `http://127.0.0.1:${process.env.TG_MOCK}`;
  let skriptSoni = 0, kechiktir = 0;
  await page.route('https://telegram.org/**', async (route) => {
    skriptSoni++;
    if (kechiktir) await new Promise(r => setTimeout(r, kechiktir));
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: SOXTA });
  });

  /* 1) oddiy sayt — Telegram skripti so'ralmaydi, kirish formasi o'z joyida */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + 'app.html?t=' + Date.now()); await page.waitForTimeout(400);
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(base + 'app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(1500);
  R.oddiy = { skript: skriptSoni, forma: await has('Ro\'yxatdan o\'tish') };

  /* 2) Telegram ichida: yangi foydalanuvchi */
  await M(() => { localStorage.clear(); sessionStorage.clear(); });
  const tgId = 7000000 + Math.floor(Math.random() * 999999);
  const init = imzola({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAEtest' + tgId,
    user: JSON.stringify({ id: tgId, first_name: 'Telegram', last_name: 'Usta', language_code: 'uz' }) }, process.env.TG_TEST_TOKEN);
  kechiktir = 1500;                                  // kutish ekranini ko'rish uchun skript kechikib keladi
  /* load hodisasi Telegram skriptini ham kutadi — sahifa DOM tayyor bo'lishi bilan kuzatiladi */
  await page.goto(base + 'app.html?t=' + Date.now() + '#tgWebAppData=' + encodeURIComponent(init) + '&tgWebAppVersion=8.0&tgWebAppPlatform=test', { waitUntil: 'domcontentloaded' });
  R.kutish = !!(await until(() => !!document.querySelector('[data-tg-kutish]'), 1400));
  R.formaYoq = !(await has('Ro\'yxatdan o\'tish'));
  await page.screenshot({ path: `${OUT}/telegram-390-kutish.png` });
  R.kirdi = await waitText('Nima yasaymiz');
  kechiktir = 0;
  R.tg = await M(() => ({ ready: __tg.ready, expand: __tg.expand, header: __tg.header, bg: __tg.bg, swipes: __tg.swipes }));
  R.kalitYoq = await M(() => localStorage.getItem('smart3d.token') === null && localStorage.getItem('smart3d.user') === null && !document.cookie.includes('s3d_sess'));
  R.user = await M(() => window.__app.state.user && { name: window.__app.state.user.name, telegram: window.__app.state.user.telegram });
  await page.screenshot({ path: `${OUT}/telegram-390-onboarding.png` });

  /* 3) telefon — foydalanuvchi ulashadi, raqam bot chatiga keladi (webhook), ilova o'zi yangilanadi */
  R.raqamSoraldi = !!(await until(() => window.__tg.contact, 5000));
  const tel = '99893' + String(tgId).slice(-7);
  const w = await fetch(SRV + '/api/telegram/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': process.env.TG_SECRET },
    body: JSON.stringify({ update_id: 1, message: { message_id: 2, from: { id: tgId }, chat: { id: tgId }, contact: { user_id: tgId, phone_number: '+' + tel } } }) });
  R.webhook = w.status;
  await M(() => window.__tg.contactCb && window.__tg.contactCb(true));
  R.raqam = await until(() => window.__app.state.user && window.__app.state.user.phone, 15000);

  /* 4) muharrir, saqlash, "Orqaga" */
  await page.getByText(/^Oshxona$/).last().click(); await page.waitForTimeout(400);
  await page.getByText(/Muharrirni ochish/).last().click();
  await until(() => window.__app && window.__app.res, 15000);
  R.saqlandi = !!(await until(() => !!document.querySelector('[data-save="ok"]'), 15000));
  R.orqaKorindi = await M(() => window.__tg.back === true);
  await M(() => window.__tg.backFn());
  R.loyihalar = await waitText('Loyihalarim', 8000);
  R.orqaYashirindi = await M(() => window.__tg.back === false);

  /* 5) fayl — bot chatiga */
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(1500);
  await until(() => window.__app.res && window.__app.res.priceRes, 15000);
  await page.locator('button[data-navbtn]', { hasText: 'Fayllar' }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('[data-panel] button', { hasText: 'Excel smeta' }).first().click();
  R.toast = await until(() => { const t = document.body.innerText; return /Telegram chatga yuborildi/.test(t) ? 'ok' : (/S3D-TG-\d+/.exec(t) || [])[0]; }, 15000);
  const kel = await (await fetch(MOCK + '/__kelgan')).json();
  R.hujjat = kel.filter(k => k.metod === 'sendDocument').map(k => ({ chat: k.chat_id === String(tgId), nom: k.nom }));
  await page.screenshot({ path: `${OUT}/telegram-390-fayl.png` });

  R.errs = errs;
  R.ok = R.oddiy.skript === 0 && R.oddiy.forma && R.kutish && R.formaYoq && R.kirdi && R.tg.ready && R.tg.expand && R.tg.header === '#0F2229' &&
    R.tg.bg === '#0F2229' && R.tg.swipes === false && R.kalitYoq && R.user && R.user.telegram && R.user.name === 'Telegram Usta' &&
    R.raqamSoraldi && R.webhook === 200 && R.raqam === tel && R.saqlandi && R.orqaKorindi && R.loyihalar && R.orqaYashirindi &&
    R.toast === 'ok' && R.hujjat.length === 1 && R.hujjat[0].chat && /-smeta\.xlsx$/.test(R.hujjat[0].nom) && errs.length === 0;
}
