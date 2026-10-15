import { useEffect } from 'react';
import { useSlice, get, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { toast, xato } from '../../store/ui.js';
import { telefon, son, vaqt } from '../../shared/lib/format.js';
import { goProjects } from '../projects/actions.js';
import { saveSettings, askLogout, loadXatolar } from './actions.js';
import { STANOK, NEST_F, STD_LABEL, NEST_KEY } from './constants.js';

/* TZ-19: Sozlamalar sahifasi qiymatlari — akkaunt, ustama, logo, stanok profili, raskroy, sex standartlari (TZ-14). */
const setIn = (patch) => set('settings', patch);

function back() {
  if (get().nav.from === 'app') { set('nav', { screen: 'app' }); project.changed('room', true); }
  else goProjects();
}

async function saveMarkup() {
  const raw = get().settings.markupIn;
  if (raw == null) return;
  const t = String(raw).trim(), n = son(t);
  if (t !== '' && !(n >= 0 && n <= 300)) { toast('Ustama 0–300% oralig\'ida bo\'lsin'); return; }
  if (await saveSettings({ markup_pct: t === '' ? null : Math.round(n * 10) / 1000 })) { setIn({ markupIn: null }); toast('Ustama saqlandi — narx yangilandi'); }
}

function onLogo(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast('Faqat PNG, JPEG yoki WEBP'); return; }
  if (f.size > 300 * 1024) { toast('Logo 300 KB dan kichik bo\'lsin'); return; }
  const rd = new FileReader();
  rd.onload = async () => { if (await saveSettings({ logo: String(rd.result) })) toast('Sex logosi saqlandi'); };
  rd.readAsDataURL(f);
}

function saveNest(nc) {
  const out = {};
  for (const [k] of NEST_F) { const n = son(nc[k]); if (!(n >= 0)) { toast('Raskroy: son kiriting'); return; } out[k] = n; }
  out.mode = nc.mode; out.maxRot = +nc.maxRot || 2;
  try { localStorage.setItem(NEST_KEY, JSON.stringify(out)); } catch (_) { /* kvota */ }
  setIn({ nestIn: null }); project.scheduleRecalc(true); toast('Raskroy parametrlari saqlandi');
}

function resetNest() {
  try { localStorage.removeItem(NEST_KEY); } catch (_) { /* yo'q */ }
  setIn({ nestIn: null }); project.scheduleRecalc(true); toast('Raskroy — standart parametrlar');
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
  if (!r.ok) { toast(j.error || ('Xato ' + r.status), j.code || 'S3D-SET-101'); return; }
  project.H.applyStandards(j.standartlar); project.rebuildEstimator();
  setIn({ stdIn: null }); project.scheduleRecalc(true); toast('Sex standartlari saqlandi — katalog chegaralari yangilandi');
}

export function useSozlamalar() {
  const st = useSlice('settings'), nav = useSlice('nav'), auth = useSlice('auth');
  useSlice('data');
  const H = project.H, u = auth.user || {}, admin = u.role === 'admin', sets = st.sets;
  const std = (H && H.sexStd && H.sexStd.modullar) || {};
  const stdIn = st.stdIn || Object.fromEntries(Object.entries(std).map(([t, m]) => [t, Object.fromEntries(Object.keys(STD_LABEL).filter(k => m[k]).map(k => [k, { min: m[k].min ?? '', max: m[k].max ?? '' }]))]));
  const nc = st.nestIn || (H ? project.nestCfg() : {});
  const std0 = H ? Math.round(((H.materials.pricing && H.materials.pricing.markup_pct) ?? 0.35) * 100) : 35;
  useEffect(() => { if (admin) loadXatolar(''); }, [admin]);
  const xj = st.xatolar;
  const setStd = (t, k, patch) => setIn({ stdIn: { ...stdIn, [t]: { ...stdIn[t], [k]: { ...stdIn[t][k], ...patch } } } });
  return {
    back, backLabel: nav.from === 'app' ? '← Muharrirga' : '← Loyihalarim',
    akkaunt: [['Ism', u.name || '—'], ['Email', u.email || '—'], ['Telefon', telefon(u.phone)], ['Sex nomi', u.shop || '—']].concat(admin ? [['Rol', 'admin']] : []),
    logout: askLogout,
    markup: st.markupIn ?? (sets.markup_pct != null ? Math.round(sets.markup_pct * 1000) / 10 : ''), markupPh: std0 + ' (standart)', markupStd: std0,
    onMarkup: ev => setIn({ markupIn: ev.target.value }), saveMarkup,
    enter: ev => { if (ev.key === 'Enter') ev.target.blur(); },
    logo: sets.logo, onLogo, removeLogo: async () => { if (await saveSettings({ logo: null })) toast('Sex logosi olib tashlandi'); },
    stanoklar: STANOK.map(([k, l, sub]) => {
      const on = !sets.stanoklar || sets.stanoklar.includes(k);
      return { label: l, sub, on, flip: () => { const cur = sets.stanoklar || STANOK.map(x => x[0]); saveSettings({ stanoklar: on ? cur.filter(x => x !== k) : cur.concat(k) }); } };
    }),
    modes: [['bssf', 'Guillotine (BSSF)'], ['strip', 'Lenta (LSTR)']].map(([k, l]) => ({ label: l, on: nc.mode === k, pick: () => setIn({ nestIn: { ...nc, mode: k } }) })),
    rots: [[1, 'Yo\'q — tekstura'], [2, '90° — zichroq']].map(([k, l]) => ({ label: l, on: +nc.maxRot === k, pick: () => setIn({ nestIn: { ...nc, maxRot: k } }) })),
    nest: NEST_F.map(([k, l]) => ({ label: l, val: nc[k] ?? '', on: ev => setIn({ nestIn: { ...nc, [k]: ev.target.value } }) })),
    saveNest: () => saveNest(nc), resetNest,
    admin, stdNote: admin ? 'Admin: chegarani o\'zgartirsangiz — katalog va ogohlantirishlar darhol yangilanadi.' : 'Modul o\'lcham chegaralari (mm). O\'zgartirish — faqat admin.',
    std: Object.entries(std).map(([t, m]) => ({ nom: m.nom || t, rows: Object.keys(STD_LABEL).filter(k => m[k]).map(k => ({ label: STD_LABEL[k],
      min: stdIn[t][k].min, max: stdIn[t][k].max,
      onMin: ev => setStd(t, k, { min: ev.target.value }), onMax: ev => setStd(t, k, { max: ev.target.value }) })) })),
    saveStd: () => saveStd(stdIn, std),
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
