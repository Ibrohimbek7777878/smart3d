import { get, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { xato, toast } from '../../store/ui.js';
import { loadSettings } from '../settings/actions.js';
import { goProjects, openPending } from '../projects/actions.js';
import { checkAiStatus } from '../editor/ai/actions.js';
import { t, serverXato } from '../../i18n/index.js';
import { TELEGRAM } from '../../app/bridge/telegram.js';
import { telegramUlash } from '../telegram/telegram.js';

/* TZ-19 (TZ-09 Q2): kirish — email + parol (server: /api/register, /api/login).
 * TZ-23 C4: telefon + SMS kod (TZ-07 server, Eskiz) — kirish oynasida; faqat server SMS ishlaganda ko'rinadi (/api/auth/usullar). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let busy = false;

export const setField = (patch) => set('auth', s => ({ f: { ...s.f, ...patch } }));

/** kirgandan keyin: sozlamalar, internetsiz qolgan o'zgarish, keyin saytdan kelgan modul yoki "Loyihalarim" */
export async function afterLogin() {
  await project.load();
  loadSettings();
  await S.afterLogin(false).catch(() => {});
  if (get().nav.pending) { openPending(); return; }
  goProjects();
}

/** sahifa ochilganda: saqlangan kirish kaliti tekshiriladi */
export async function initSession() {
  await checkAiStatus();
  if (!S.loggedIn) return;
  set('auth', { user: S.user });
  try {
    const r = await S.api('/api/me');
    if (r.status === 401 || r.status === 404) { S.logout(true); return; }
    if (r.ok) set('auth', { user: { ...S.user, ...(await r.json()) } });
    loadSettings();
  } catch (_) { /* internet yo'q — kirgan holat saqlanadi */ }
  const sc = get().nav.screen;
  if (sc === 'reg' || sc === 'login') afterLogin();
}

/** saytdan o'tish: #s=login|reg, #mod=MC-KP-02&w=800 (saytdagi "Bu modulni loyihamga qo'shish") */
export function readHandoff() {
  let h = (location.hash || '').replace(/^#/, '');
  if (!h) { try { h = sessionStorage.getItem('s3d-handoff') || ''; } catch (_) { /* yo'q */ } }
  try { sessionStorage.removeItem('s3d-handoff'); } catch (_) { /* yo'q */ }
  if (!h) return;
  const q = new URLSearchParams(h.includes('=') ? h : 's=' + h), s = q.get('s');
  const nav = {};
  if (s === 'login' || s === 'reg') nav.screen = s;
  const mod = q.get('mod'); if (mod) nav.pending = { mod, w: +q.get('w') || 0 };
  /* shu qurilmada avval kirilgan bo'lsa — kirish oynasi, email tayyor */
  let last = ''; try { last = localStorage.getItem('s3d-last-email') || ''; } catch (_) { /* yo'q */ }
  if (last && s === 'reg' && !mod) nav.screen = 'login';
  if (last) setField({ email: last });
  set('nav', nav);
  const sc = get().nav.screen;
  if (S.loggedIn && (sc === 'reg' || sc === 'login')) afterLogin();
}

/** "Ro'yxatdan o'tish" / "Kirish" tugmasi */
export async function submitAuth() {
  const st = get(), f = st.auth.f, reg = st.nav.screen === 'reg', e = {}, em = f.email.trim();
  if (reg && !f.name.trim()) e.name = t('kirish.ism_yozing');
  if (!EMAIL_RE.test(em)) e.email = t('kirish.email_xato');
  if (reg && f.phone.length !== 9) e.phone = t('kirish.telefon_9');
  if (f.pass.length < 8) e.pass = t('kirish.parol_8');
  if (Object.keys(e).length) { setField({ err: e, tried: true }); return; }
  if (busy) return;
  busy = true;
  const j = reg ? await S.register({ email: em, password: f.pass, name: f.name.trim(), phone: '998' + f.phone, shop: f.shop.trim() })
    : await S.login(em, f.pass);
  busy = false;
  if (!j.ok) {
    if (j.status === 0) { xato(j.code || 'S3D-NET-101', { modul: 'auth' }); return; }
    const msg = String(j.error || ''), ko = serverXato(msg, j.code);   // maydon — server matnidan (o'zbekcha), ko'rinadigani — tanlangan tilda (TZ-18)
    if (j.status === 409) { if (j.code === 'S3D-AUTH-003' || /telefon/i.test(msg)) e.phone = t('kirish.raqam_bor'); else e.email = t('kirish.email_bor'); }
    else if (j.status === 401) e.pass = t('kirish.parol_xato');
    else if (/parol/i.test(msg)) e.pass = ko; else if (/telefon/i.test(msg)) e.phone = ko; else if (/ism/i.test(msg)) e.name = ko; else e.email = ko;
    setField({ err: e, tried: true });
    return;
  }
  try { localStorage.setItem('s3d-last-email', em); } catch (_) { /* kvota */ }
  setField({ name: (j.user && j.user.name) || f.name, pass: '', err: {} });
  set('auth', { user: j.user });
  if (TELEGRAM) await telegramUlash();             // TZ-16: Telegram ichida — saytdagi akkaunt shu Telegram'ga ulanadi
  if (reg) {
    await S.afterLogin(true).catch(() => {});
    if (get().nav.pending) { openPending(); return; }
    set('nav', { screen: 'onb1' });
  } else afterLogin();
}

/* ── TZ-23 C4: telefon + SMS ── */
/** server qaysi kirish usullarini qo'llaydi (SMS — Eskiz sozlangan bo'lsa) */
export async function loadUsullar() {
  try {
    const r = await S.api('/api/auth/usullar');
    if (r.ok) set('auth', { smsBor: !!(await r.json()).sms });
  } catch (_) { /* internet yo'q — SMS tugmasi ko'rinmaydi */ }
}
export const usulAlmash = (usul) => setField({ usul, err: {}, kod: '', yuborildi: false });

/** "Kod yuborish" (va qayta yuborish) */
export async function smsYubor() {
  const f = get().auth.f;
  if (f.phone.length !== 9) { setField({ err: { phone: t('kirish.telefon_9') }, tried: true }); return; }
  if (busy) return;
  busy = true;
  const j = await S.smsSend('998' + f.phone);
  busy = false;
  if (!j.ok) {
    if (j.status === 0) { xato(j.code || 'S3D-NET-101', { modul: 'auth/sms' }); return; }
    setField({ err: { phone: serverXato(j.error, j.code) + (j.retry_after ? ' (' + t('kirish.soniya', { n: j.retry_after }) + ')' : '') } });
    return;
  }
  setField({ yuborildi: true, kod: '', err: {}, qayta: Date.now() + 60000 });
  toast(t('kirish.kod_yuborildi', { tel: '+998 ' + f.phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4') }));
}

/** kod bilan kirish (yangi raqam — akkaunt ochiladi, ism bilan) */
export async function smsKirish() {
  const f = get().auth.f, kod = f.kod.replace(/\D/g, '');
  if (kod.length !== 6) { setField({ err: { kod: t('kirish.kod_6') }, tried: true }); return; }
  if (busy) return;
  busy = true;
  const j = await S.smsVerify('998' + f.phone, kod, f.name.trim());
  busy = false;
  if (!j.ok) {
    if (j.status === 0) { xato(j.code || 'S3D-NET-101', { modul: 'auth/sms' }); return; }
    setField({ err: { kod: serverXato(j.error, j.code) } });
    return;
  }
  setField({ kod: '', err: {}, yuborildi: false });
  set('auth', { user: j.user });
  if (TELEGRAM) await telegramUlash();
  if (j.yangi) {                                     // birinchi kirish — ro'yxatdagidek onboarding
    await S.afterLogin(true).catch(() => {});
    if (get().nav.pending) { openPending(); return; }
    set('nav', { screen: 'onb1' });
  } else afterLogin();
}

export function swapAuth() {
  set('nav', { screen: get().nav.screen === 'reg' ? 'login' : 'reg' });
  setField({ err: {}, usul: 'email', yuborildi: false, kod: '' });
}
