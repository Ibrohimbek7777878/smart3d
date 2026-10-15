import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { STANOK } from '../../settings/constants.js';
import { faylYukla } from './actions.js';

/* TZ-19: "Fayllar" qadami — tekshiruv va fayl guruhlari. Har yorliq — haqiqiy fayl. Biesse/Homag — TZ-11 gacha yo'q
 * (doim namuna detal chiqaradi, TZ-01); BPJ — TZ-17 gacha faqat admin, SINOV. "Smeta (CSV)", "OBJ", "Teshiklar (JSON)" —
 * eski saytdagi fayllar yo'qolmasin. Stanok fayllari — Sozlamalardagi stanok profili bo'yicha. */
export function useQadamFayllar() {
  const auth = useSlice('auth'), st = useSlice('settings');
  useSlice('project');
  const R = project.res, NS = R ? R.nest.summary : {}, pr = R ? R.priceRes : null, prod = R ? R.prod : null;
  const missN = prod ? prod.missing.length : 0;
  let detTotal = 0;
  if (R) for (const cl of R.cutlists) for (const pt of cl.parts) detTotal += (+pt.qty || 1);
  const sizeWarn = pr ? pr.warnings.filter(w => /SIZE|CLAMP/.test(w.code)).length : 0;
  const admin = !!(auth.user && auth.user.role === 'admin'), stanoklar = st.sets.stanoklar;
  const groups = [
    { title: 'Mijozga', col: 'var(--cyan)', sub: 'Bittada logosi bilan', mainLabel: 'Hisobot (PDF)', mainIkon: 'chop', main: 'hisobot', more: [['Rasm', 'rasm', 'rasm'], ['360°', 'panorama', 'aylanish'], ['GLB (3D/AR)', 'glb']] },
    { title: 'Sexga', col: 'var(--lav)', sub: (NS.panel_count || 0) + ' detal · ' + (NS.total_sheets || 0) + ' varaq', mainLabel: 'Excel smeta', mainIkon: 'excel', main: 'excel',
      more: [['Detallar (CSV)', 'cutlist'], ['Loyiha fayli', 'loyiha'], ['Smeta (CSV)', 'smetaCsv'], ['OBJ', 'obj'], ['Teshiklar (JSON)', 'teshiklar']] },
    { title: 'Stanokka', col: 'var(--acct)', sub: 'alohida dastursiz', mainLabel: 'GibLab', main: 'giblab',
      more: [['DXF', 'dxf'], ['G-code', 'gcode'], ['Biesse · tez orada', null], ['Homag · tez orada', null], ['PTP', 'ptp'], ['NC', 'nc'], ['XNC', 'xnc'], ['Altendorf', 'altendorf'],
        admin ? ['Bazis (BPJ) · SINOV', 'bpj'] : ['Bazis (BPJ) · tez orada', null]]
        .filter(([, k]) => !k || !stanoklar || !STANOK.some(x => x[0] === k) || stanoklar.includes(k)) }];
  return {
    checks: [
      ...(R ? [{ ok: !NS.placed_count || NS.placed_count === NS.panel_count, text: NS.placed_count === NS.panel_count ? detTotal + ' detal ' + (NS.total_sheets || 0) + ' varaqqa sig\'di' : (NS.panel_count - NS.placed_count) + ' ta detal varaqqa sig\'madi' }] : []),
      { ok: !sizeWarn, text: sizeWarn ? sizeWarn + ' ta o\'lcham chegaradan tashqari' : 'Hamma o\'lcham modul chegarasida' },
      ...(R ? R.val.errors : []).map(x => ({ ok: false, text: x.message || x.code })),
      ...(missN ? [{ ok: false, text: missN + ' ta zapchastning narxi yo\'q' }] : [])],
    fileGroups: groups.map(g => ({ ...g, main: () => faylYukla(g.main),
      more: g.more.map(([l, k, ikon]) => ({ label: l, ikon, dis: !k, c: k ? 'var(--txt)' : 'var(--mut)', cur: k ? 'pointer' : 'not-allowed', go: () => { if (k) faylYukla(k); } })) }))
  };
}
