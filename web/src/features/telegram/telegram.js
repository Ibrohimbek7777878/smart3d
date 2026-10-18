import { get, set, store } from '../../store/index.js';
import { S } from '../../store/session.js';
import { toast, xato } from '../../store/ui.js';
import { t, setTil } from '../../i18n/index.js';
import { TELEGRAM, tg, tgYukla, tgChaqir } from '../../app/bridge/telegram.js';
import { setDownloadHandler } from '../../../../app/js/engine/objexport.js';
import { goProjects } from '../projects/actions.js';

/* TZ-16: Telegram Mini App — ilova Telegram ichida ochilganda:
 *   kirish — Telegram imzosi bilan (forma o'rniga kutish ekrani), kalit faqat xotirada (store/session.js);
 *   Telegram sarlavha/fon rangi — dizayndagi #0F2229, to'liq ekran, 3D'ni aylantirganda oyna pastga tortilib yopilmaydi;
 *   "Orqaga" tugmasi — ekranlar orasida; telefon — bir bosishda (raqam bot chatiga ulashiladi, server webhook bilan oladi);
 *   fayllar — bot chatiga hujjat bo'lib (Telegram ichida brauzer yuklab olishi ishonchsiz).
 * Oddiy saytda bu modul hech narsa qilmaydi. */
const FON = '#0F2229';
const ORQA = {
  app: () => goProjects(),
  settings: () => goProjects(),
  onb2: () => set('nav', { screen: 'onb1' })
};
const kut = (ms) => new Promise(r => setTimeout(r, ms));

function tgXato(code, err) {
  set('nav', { screen: 'login' });                 // email+parol bilan kirish yo'li ochiq qoladi
  xato(code, { modul: 'telegram', err });
}

function orqaTugma(W) {
  const BB = W.BackButton;
  if (!BB) return;
  let oldin = null;
  const yangila = () => {
    const sc = get().nav.screen;
    if (sc === oldin) return;
    oldin = sc;
    tgChaqir(() => (ORQA[sc] ? BB.show() : BB.hide()));
  };
  tgChaqir(() => BB.onClick(() => { const f = ORQA[get().nav.screen]; if (f) f(); }));
  store.subscribe(yangila);
  yangila();
}

/* fayl → bot chatiga (10 MB gacha; nomi server ro'yxatidagi belgilarga keltiriladi) */
async function b64(blob) {
  const u = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
async function faylYubor(nom, content, mime) {
  const toza = String(nom || 'smart3d').replace(/[^\p{L}\p{N} _.()'-]/gu, '_').slice(-120);
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    if (blob.size > 10 * 1024 * 1024) { xato('S3D-TG-007', { modul: 'telegram', xabar: toza }); return; }
    toast(t('telegram.fayl_yuborilmoqda', { nom: toza }));
    const r = await S.api('/api/telegram/fayl', { method: 'POST', body: { nom: toza, mime: mime || blob.type || '', base64: await b64(blob) } });
    if (!r.ok) { const e = await S.errInfo(r); xato(e.code || 'S3D-TG-005', { modul: 'telegram', xabar: e.text + ' · ' + toza }); return; }
    toast(t('telegram.fayl_yuborildi', { nom: toza }));
  } catch (e) { xato('S3D-TG-005', { modul: 'telegram', err: e }); }
}

/* telefon: bir marta so'raladi (sessiyada); raqam bot chatiga keladi — server webhook bilan saqlaydi, ilova kutadi */
function raqamSora(W, keyin) {
  if (!S.user || S.user.phone || typeof W.requestContact !== 'function') return;
  try { if (sessionStorage.getItem('s3d-tg-raqam')) return; sessionStorage.setItem('s3d-tg-raqam', '1'); } catch (_) { /* yo'q */ }
  tgChaqir(() => W.requestContact(async (ulashdi) => {
    if (!ulashdi) return;
    for (let i = 0; i < 10; i++) {
      await kut(1500);
      const r = await S.api('/api/me').catch(() => null);
      if (!r) continue;
      if (r.status === 401) {                        // saytdagi (SMS) akkauntga ulandi — eski kalit bekor, qayta kiriladi
        const j = await S.telegram(W.initData);
        if (j.ok) { set('auth', { user: j.user }); toast(t('telegram.ulandi')); await keyin(j); }
        return;
      }
      const u = r.ok ? await r.json() : null;
      if (u && u.phone) { set('auth', { user: { ...get().auth.user, ...u } }); toast(t('telegram.raqam_saqlandi')); return; }
    }
  }));
}

/**
 * Telegram ichida ishga tushirish (bootstrap chaqiradi).
 * @param {Function} keyin — kirgandan keyin: (javob) → yangi akkaunt — onboarding, aks holda — loyihalar
 */
export async function telegramIshga(keyin) {
  if (!TELEGRAM) return;
  let W;
  try { W = await tgYukla(); } catch (e) { tgXato('S3D-TG-101', e); return; }
  tgChaqir(() => W.ready());
  tgChaqir(() => W.expand());
  tgChaqir(() => W.setHeaderColor(FON));
  tgChaqir(() => W.setBackgroundColor(FON));
  tgChaqir(() => W.disableVerticalSwipes && W.disableVerticalSwipes());   // Bot API 7.7+: 3D aylantirganda oyna yopilmaydi
  /* til: foydalanuvchi o'zi tanlamagan bo'lsa — Telegram tili (TZ-18 §3) */
  const lc = String((W.initDataUnsafe && W.initDataUnsafe.user && W.initDataUnsafe.user.language_code) || '').slice(0, 2);
  let tanlangan = null;
  try { tanlangan = localStorage.getItem('s3d-til'); } catch (_) { /* yo'q */ }
  if (!tanlangan && ['uz', 'ru', 'en'].includes(lc)) setTil(lc);
  orqaTugma(W);
  setDownloadHandler(faylYubor);
  if (!W.initData) { tgXato('S3D-TG-101'); return; }
  const j = await S.telegram(W.initData);
  if (!j.ok) { tgXato(j.code || 'S3D-TG-002'); return; }
  set('auth', { user: j.user });
  await keyin(j);
  raqamSora(W, keyin);
}

/** email+parol bilan kirilganda (Telegram ichida) — akkaunt shu Telegram'ga ulanadi */
export async function telegramUlash() {
  const W = tg();
  if (!TELEGRAM || !W || !W.initData) return;
  const u = await S.telegramUlash(W.initData);
  if (u.ok) { set('auth', { user: u.user }); toast(t('telegram.ulandi')); }
  else xato(u.code || 'S3D-TG-002', { modul: 'telegram' });
}
