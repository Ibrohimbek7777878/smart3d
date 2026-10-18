import { useEffect } from 'react';
import { get, set, useSlice } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { xato, toast } from '../../store/ui.js';
import { t, serverXato } from '../../i18n/index.js';

/* TZ-23 C2: qoldiqlar ombori (server: /api/remnants). Ko'rish — login bilan; qo'shish va "ishlatildi" — faqat admin
 * (server tekshiradi). Raskroy natijasidagi ishga yaraydigan qoldiqlar (nesting: kamida 150×150 mm va 0,1 m² — sex
 * sozlamasi) admin tomonidan Narx qadamidan omborga yoziladi. */
const nr = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
const yaxlit = (v) => Math.round(+v || 0);

async function sorov(yol, o, kod) {
  try {
    const r = await S.api(yol, o);
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code) || t('umumiy.xato_n', { n: r.status }), (j && j.code) || kod); return null; }
    return j;
  } catch (e) { xato('S3D-NET-101', { modul: 'qoldiq', err: e }); return null; }
}

export async function loadQoldiqlar(holat) {
  const h = holat || get().settings.qHolat || 'available';
  const j = await sorov('/api/remnants?status=' + encodeURIComponent(h), undefined, 'S3D-REM-101');
  if (j) set('settings', { qoldiqlar: Array.isArray(j) ? j : [], qHolat: h });
}

/** list: [{ material_code, len, width, t }] → omborga */
export async function qoldiqQosh(list) {
  if (!list.length) return false;
  const j = await sorov('/api/remnants', { method: 'POST', body: { remnants: list } }, 'S3D-REM-102');
  if (!j) return false;
  toast(t('qoldiq.qoshildi', { n: j.count }));
  await loadQoldiqlar('available');
  return true;
}

export async function qoldiqIshlatildi(id) {
  if (await sorov('/api/remnants/' + encodeURIComponent(id) + '/use', { method: 'PUT', body: {} }, 'S3D-REM-102')) {
    toast(t('qoldiq.ishlatildi_ok'));
    await loadQoldiqlar();
  }
}

/** joriy loyiha raskroyidagi ishga yaraydigan qoldiqlar */
export function nestQoldiqlari() {
  const R = project.res, H = project.H;
  const by = (R && R.nest && R.nest.by_material) || {};
  const pm = (H && H.materials.panel_materials) || [];
  const out = [];
  for (const [mat, r] of Object.entries(by)) {
    const m = pm.find(x => x.code === mat);
    for (const q of r.remnants || []) out.push({ material_code: mat, len: yaxlit(q.length), width: yaxlit(q.width), t: (m && m.thickness) || 16, area: q.area_m2 || 0 });
  }
  return out;
}

export function useQoldiqlar() {
  const st = useSlice('settings'), auth = useSlice('auth');
  useSlice('data');
  const H = project.H, admin = !!(auth.user && auth.user.role === 'admin'), holat = st.qHolat || 'available';
  useEffect(() => { if (auth.user) loadQoldiqlar(holat); }, [auth.user && auth.user.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const list = st.qoldiqlar || [];
  const q = nr(st.qQ);
  const nomi = (code) => (H ? project.matName(code) : code);
  const filt = list.filter(r => !q || nr(nomi(r.material_code) + ' ' + r.material_code + ' ' + yaxlit(r.length) + '×' + yaxlit(r.width)).includes(q));
  const rows = filt.map(r => ({
      nom: nomi(r.material_code),
      olcham: yaxlit(r.length) + ' × ' + yaxlit(r.width) + ' × ' + (+r.thickness || '—') + ' ' + t('umumiy.mm'),
      maydon: t('qoldiq.m2', { n: (+r.area_m2 || 0).toFixed(2) }),
      ishlatildi: admin && holat === 'available' ? () => qoldiqIshlatildi(r.remnant_id || r.id) : null
    }));
  const f = st.qForm || { mat: '', len: '', width: '' };
  const pm = ((H && H.materials.panel_materials) || []).filter(m => m.thickness > 0 && m.code !== 'OYNA' && !m.unit_piece);
  const setF = (p) => set('settings', { qForm: { ...f, ...p } });
  return {
    yuklandi: st.qoldiqlar != null,
    holatlar: [['available', t('qoldiq.omborda')], ['used', t('qoldiq.ishlatilgan')]].map(([k, label]) => ({ label, on: holat === k, pick: () => loadQoldiqlar(k) })),
    q: st.qQ || '', onQ: ev => set('settings', { qQ: ev.target.value }),
    rows, jami: rows.length ? t('qoldiq.jami', { n: rows.length, m: filt.reduce((a, r) => a + (+r.area_m2 || 0), 0).toFixed(2) }) : null,
    admin,
    form: admin ? {
      mat: f.mat || (pm[0] && pm[0].code) || '', matlar: pm.map(m => ({ code: m.code, name: nomi(m.code) })),
      len: f.len, width: f.width,
      onMat: ev => setF({ mat: ev.target.value }), onLen: ev => setF({ len: ev.target.value }), onWidth: ev => setF({ width: ev.target.value }),
      qosh: async () => {
        const mat = f.mat || (pm[0] && pm[0].code), m = pm.find(x => x.code === mat), len = yaxlit(f.len), width = yaxlit(f.width);
        if (!(len >= 50 && len <= 10000 && width >= 50 && width <= 10000)) { toast(t('qoldiq.olcham_xato')); return; }
        if (await qoldiqQosh([{ material_code: mat, len, width, t: (m && m.thickness) || 16 }])) setF({ len: '', width: '' });
      }
    } : null
  };
}
