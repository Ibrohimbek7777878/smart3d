import { useEffect } from 'react';
import { useSlice, get, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { toast, xato } from '../../store/ui.js';
import { telefon, son, vaqt } from '../../shared/lib/format.js';
import { goProjects } from '../projects/actions.js';
import { saveSettings, askLogout, loadXatolar } from './actions.js';
import { STANOK, NEST_F, STD_DIMS, NEST_KEY } from './constants.js';
import { t, serverXato, TILLAR, til, setTil } from '../../i18n/index.js';
import { ustamaAdmin } from '../../../../app/js/engine/narxStavka.js';

/* TZ-19: Sozlamalar sahifasi qiymatlari — akkaunt, ustama, logo, stanok profili, raskroy, sex standartlari (TZ-14). */
const setIn = (patch) => set('settings', patch);

function back() {
  if (get().nav.from === 'app') { set('nav', { screen: 'app' }); project.changed('room', true); }
  else goProjects();
}

/* TZ-49 (3): ustama — 0 ≠ bo'sh. 0 — «ustama yo'q» (saqlanadi va narxda 0 sifatida ishlaydi); bo'sh (null) — admin sozlamasi yoki sukutga qaytish.
   Ikkalasi aniq tugmalar bilan ham tanlanadi: «Ustama yo'q (0%)» va «Standartga qaytarish». */
async function saqlaUstama(qiymat) {
  if (await saveSettings({ markup_pct: qiymat })) { setIn({ markupIn: null }); toast(t('sozlama.ustama_saqlandi')); return true; }
  return false;
}
async function saveMarkup() {
  const raw = get().settings.markupIn;
  if (raw == null) return;
  const v = String(raw).trim(), n = son(v);
  if (v !== '' && !(Number.isFinite(n) && n >= 0 && n <= 300)) { toast(t('sozlama.ustama_chegara')); return; }
  await saqlaUstama(v === '' ? null : Math.round(n * 10) / 1000);
}
const f1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

function onLogo(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast(t('sozlama.logo_tur')); return; }
  if (f.size > 300 * 1024) { toast(t('sozlama.logo_hajm')); return; }
  const rd = new FileReader();
  rd.onload = async () => { if (await saveSettings({ logo: String(rd.result) })) toast(t('sozlama.logo_saqlandi')); };
  rd.readAsDataURL(f);
}

function saveNest(nc) {
  const out = {};
  for (const k of NEST_F) { const n = son(nc[k]); if (!(n >= 0)) { toast(t('sozlama.raskroy_son')); return; } out[k] = n; }
  out.mode = nc.mode; out.maxRot = +nc.maxRot || 2;
  try { localStorage.setItem(NEST_KEY, JSON.stringify(out)); } catch (_) { /* kvota */ }
  setIn({ nestIn: null }); project.scheduleRecalc(true); toast(t('sozlama.raskroy_saqlandi'));
}

function resetNest() {
  try { localStorage.removeItem(NEST_KEY); } catch (_) { /* yo'q */ }
  setIn({ nestIn: null }); project.scheduleRecalc(true); toast(t('sozlama.raskroy_standart'));
}

async function saveStd(stdIn, std) {
  const mod = {};
  for (const [t, ks] of Object.entries(stdIn)) for (const [k, v] of Object.entries(ks)) {
    (mod[t] = mod[t] || {})[k] = { min: v.min === '' ? null : Number(v.min), max: v.max === '' ? null : Number(v.max), std: (std[t][k] && std[t][k].std) || [] };
  }
  let r;
  try { r = await S.api('/api/sex-standartlari', { method: 'PUT', body: { modullar: mod } }); }
  catch (e) { xato('S3D-NET-101', { modul: 'settings', err: e }); return; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast(serverXato(j.error, j.code) || t('umumiy.xato_n', { n: r.status }), j.code || 'S3D-SET-101'); return; }
  project.H.applyStandards(j.standartlar); project.rebuildEstimator();
  setIn({ stdIn: null }); project.scheduleRecalc(true); toast(t('sozlama.std_saqlandi'));
}

export function useSozlamalar() {
  const st = useSlice('settings'), nav = useSlice('nav'), auth = useSlice('auth');
  useSlice('data');
  const H = project.H, u = auth.user || {}, admin = u.role === 'admin', sets = st.sets;
  const std = (H && H.sexStd && H.sexStd.modullar) || {};
  const stdIn = st.stdIn || Object.fromEntries(Object.entries(std).map(([t, m]) => [t, Object.fromEntries(STD_DIMS.filter(k => m[k]).map(k => [k, { min: m[k].min ?? '', max: m[k].max ?? '' }]))]));
  const nc = st.nestIn || (H ? project.nestCfg() : {});
  const std0 = H ? Math.round(ustamaAdmin(H.narxlar, H.materials).foiz) : 0;   // TZ-48: sukut ustama 0%; TZ-49: admin ilgari saqlagan qiymat (masalan 35%) bo'lsa — o'sha ko'rinadi (bo'sh qoldirilsa amal qiladigan)
  useEffect(() => { if (admin) loadXatolar(''); }, [admin]);
  const xj = st.xatolar;
  const setStd = (tur, k, patch) => setIn({ stdIn: { ...stdIn, [tur]: { ...stdIn[tur], [k]: { ...stdIn[tur][k], ...patch } } } });
  return {
    back, backLabel: nav.from === 'app' ? t('sozlama.muharrirga') : t('sozlama.loyihalarimga'),
    akkaunt: [[t('sozlama.ism'), u.name || '—'], [t('sozlama.email'), /@telegram\.smart3d$/.test(u.email || '') ? 'Telegram' : (u.email || '—')], [t('sozlama.telefon'), telefon(u.phone)], [t('sozlama.sex_nomi'), u.shop || '—']].concat(admin ? [[t('sozlama.rol'), 'admin']] : []),
    logout: askLogout,
    markup: st.markupIn ?? (sets.markup_pct != null ? Math.round(sets.markup_pct * 1000) / 10 : ''), markupPh: t('sozlama.standart_ph', { n: std0 }), markupStd: std0, markupIzoh: t('sozlama.ustama_izoh', { n: std0 }),
    onMarkup: ev => setIn({ markupIn: ev.target.value }), saveMarkup,
    markupNol: () => saqlaUstama(0), markupStandart: () => saqlaUstama(null), markupNolOn: sets.markup_pct === 0, markupBosh: sets.markup_pct == null,
    markupHolat: sets.markup_pct === 0 ? t('sozlama.ustama_holat_nol')
      : sets.markup_pct != null ? t('sozlama.ustama_holat_n', { n: f1(sets.markup_pct * 100) })
      : t('sozlama.ustama_holat_bosh', { manba: (() => { const a = H ? ustamaAdmin(H.narxlar, H.materials) : null;
        return a && a.tur === 'admin' ? t('sozlama.ustama_m_admin', { n: f1(a.foiz), sana: a.sana || '—' }) : t('sozlama.ustama_m_sukut', { n: f1(a ? a.foiz : 0) }); })() }),
    enter: ev => { if (ev.key === 'Enter') ev.target.blur(); },
    logo: sets.logo, onLogo, removeLogo: async () => { if (await saveSettings({ logo: null })) toast(t('sozlama.logo_olindi')); },
    stanoklar: STANOK.map(([k, l, sub]) => {
      const on = !sets.stanoklar || sets.stanoklar.includes(k);
      return { label: l, sub: t(sub), on, flip: () => { const cur = sets.stanoklar || STANOK.map(x => x[0]); saveSettings({ stanoklar: on ? cur.filter(x => x !== k) : cur.concat(k) }); } };
    }),
    modes: [['bssf', 'sozlama.bssf'], ['strip', 'sozlama.lenta']].map(([k, l]) => ({ label: t(l), on: nc.mode === k, pick: () => setIn({ nestIn: { ...nc, mode: k } }) })),
    rots: [[1, 'sozlama.aylantirmaslik'], [2, 'sozlama.aylantirish90']].map(([k, l]) => ({ label: t(l), on: +nc.maxRot === k, pick: () => setIn({ nestIn: { ...nc, maxRot: k } }) })),
    nest: NEST_F.map(k => ({ label: t('sozlama.n_' + k), val: nc[k] ?? '', on: ev => setIn({ nestIn: { ...nc, [k]: ev.target.value } }) })),
    saveNest: () => saveNest(nc), resetNest,
    admin, stdNote: admin ? t('sozlama.std_admin') : t('sozlama.std_usta'),
    std: Object.entries(std).map(([tur, m]) => ({ nom: m.nom || tur, rows: STD_DIMS.filter(k => m[k]).map(k => ({ label: t('sozlama.d_' + k),
      min: stdIn[tur][k].min, max: stdIn[tur][k].max,
      onMin: ev => setStd(tur, k, { min: ev.target.value }), onMax: ev => setStd(tur, k, { max: ev.target.value }) })) })),
    saveStd: () => saveStd(stdIn, std),
    tillar: TILLAR.map(([kod, nom]) => ({ label: nom, on: kod === til(), pick: () => setTil(kod) })),
    /* admin: xatolar jurnali — kod bo'yicha guruh va oxirgi yozuvlar */
    xatolar: admin ? {
      q: st.xq, onQ: ev => setIn({ xq: ev.target.value }), qidir: () => loadXatolar(st.xq),
      enter: ev => { if (ev.key === 'Enter') loadXatolar(st.xq); },
      bosh: !!xj && !xj.guruhlar.length,
      guruhlar: xj ? xj.guruhlar.map(g => ({ code: g.code, src: g.source === 'web' ? 'brauzer' : 'server', n: g.n, vaqt: vaqt(g.oxirgi), msg: g.msg || '',
        pick: () => { setIn({ xq: g.code }); loadXatolar(g.code); } })) : [],
      oxirgi: xj ? xj.oxirgi.slice(0, 20).map(x => ({ code: x.code, vaqt: vaqt(x.ts), rid: x.rid, yol: [x.method, x.path].filter(Boolean).join(' '), status: x.status || '', msg: x.msg || '',
        pick: () => { if (x.rid) { setIn({ xq: x.rid }); loadXatolar(x.rid); } } })) : []
    } : null
  };
}
