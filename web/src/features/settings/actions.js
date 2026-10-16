import { get, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { confirm, xato, toast } from '../../store/ui.js';
import { t, serverXato } from '../../i18n/index.js';

/* TZ-19 (TZ-09 4.1): sozlamalar — kirgan bo'lsa serverda (/api/settings), aks holda shu qurilmada. */
const LOCAL = 's3d-settings';
const EMPTY = { markup_pct: null, stanoklar: null, logo: null };

export async function loadSettings() {
  let v = null;
  if (S.loggedIn) { try { const r = await S.api('/api/settings'); if (r.ok) v = await r.json(); } catch (_) { /* internet yo'q */ } }
  if (!v) { try { v = JSON.parse(localStorage.getItem(LOCAL) || 'null'); } catch (_) { /* buzilgan */ } }
  if (v) { set('settings', { sets: { markup_pct: v.markup_pct ?? null, stanoklar: v.stanoklar ?? null, logo: v.logo ?? null } }); project.scheduleRecalc(true); }
}

/** → true agar saqlansa */
export async function saveSettings(patch) {
  const next = { ...get().settings.sets, ...patch };
  if (S.loggedIn) {
    try {
      const r = await S.api('/api/settings', { method: 'PUT', body: next });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(serverXato(j.error, j.code) || t('umumiy.xato_n', { n: r.status }), j.code || 'S3D-SET-101'); return false; }
    } catch (e) { xato('S3D-NET-101', { matn: t('sozlama.aloqa_yoq'), modul: 'settings', err: e }); return false; }
  } else { try { localStorage.setItem(LOCAL, JSON.stringify(next)); } catch (_) { /* kvota */ } }
  set('settings', { sets: next });
  project.scheduleRecalc(true);
  return true;
}

/** admin o'zgartirgan sex standartlari (TZ-14) — server bo'lsa undan, aks holda fayldagi */
export async function loadServerStd() {
  try {
    const r = await fetch('/api/sex-standartlari', { cache: 'no-store' });
    if (r.ok && project.H.applyStandards(await r.json())) { project.rebuildEstimator(); project.scheduleRecalc(true); }
  } catch (_) { /* server yo'q — fayldagi standartlar */ }
}

/** Sozlamalar sahifasi; section — o'sha bo'limga aylantiriladi (masalan 'raskroy') */
export function openSettings(section) {
  const nav = get().nav;
  set('nav', { screen: 'settings', from: nav.screen === 'settings' ? nav.from : nav.screen });
  set('editor', { sel: null, part: null });
  set('settings', { markupIn: null, nestIn: null, stdIn: null });
  if (section) setTimeout(() => { const el = document.querySelector('[data-set="' + section + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
}

/** admin: xatolar jurnali (TZ-19 §2). q — bo'sh, kod (S3D-…) yoki so'rov raqami (rid) */
export async function loadXatolar(q = '') {
  const qq = String(q).trim(), p = new URLSearchParams();
  if (/^S3D-/i.test(qq)) p.set('kod', qq.toUpperCase()); else if (qq) p.set('rid', qq.toLowerCase());
  try {
    const r = await S.api('/api/admin/xatolar' + (p.toString() ? '?' + p : ''));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(serverXato(j.error, j.code) || t('umumiy.xato_n', { n: r.status }), j.code || 'S3D-SET-101'); return; }
    set('settings', { xatolar: j });
  } catch (e) { xato('S3D-NET-101', { modul: 'settings/xatolar', err: e }); }
}

export function askLogout() {
  confirm({ title: t('sozlama.chiqish_sarlavha'), text: t('sozlama.chiqish_matn'), ok: t('umumiy.chiqish'), danger: true,
    yes: () => {
      S.logout(false);
      set('nav', { screen: 'login' });
      set('projects', { list: null });
      set('settings', { sets: EMPTY });
    } });
}
