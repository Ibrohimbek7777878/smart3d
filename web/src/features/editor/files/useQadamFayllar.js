import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { STANOK } from '../../settings/constants.js';
import { faylYukla } from './actions.js';
import { openSheet } from '../../../store/ui.js';
import { t } from '../../../i18n/index.js';

/* TZ-19: "Fayllar" qadami — tekshiruv va fayl guruhlari. Har yorliq — haqiqiy fayl. Biesse/Homag — TZ-11 gacha yo'q
 * (doim namuna detal chiqaradi, TZ-01); BPJ — SINOV (TZ-33 B1: hamma uchun). "Smeta (CSV)", "OBJ", "Teshiklar (JSON)" —
 * eski saytdagi fayllar yo'qolmasin. Stanok fayllari — Sozlamalardagi stanok profili bo'yicha.
 * TZ-33: "SketchUp (.skp)" va "SketchUp Pro (.dae)" — OBJ yonida (tanlangan modul yoki butun loyiha); "Bazis (.bpj)" — hamma uchun
 * (SINOV belgisi bilan), bosilganda 3 qadamli yo'riqnoma va yuklab olish tugmasi (eksport/BpjYoriq.jsx). */
export function useQadamFayllar() {
  const auth = useSlice('auth'), st = useSlice('settings');
  useSlice('project');
  const edSel = useSlice('editor').sel;
  const modul = edSel != null && project.doc && project.pl(edSel);
  const R = project.res, NS = R ? R.nest.summary : {}, pr = R ? R.priceRes : null, prod = R ? R.prod : null;
  const missN = prod ? prod.missing.length : 0;
  let detTotal = 0;
  if (R) for (const cl of R.cutlists) for (const pt of cl.parts) detTotal += (+pt.qty || 1);
  const sizeWarn = pr ? pr.warnings.filter(w => /SIZE|CLAMP/.test(w.code)).length : 0;
  const admin = !!(auth.user && auth.user.role === 'admin'), stanoklar = st.sets.stanoklar;
  const groups = [
    { title: t('fayllar.mijozga'), col: 'var(--cyan)', sub: t('fayllar.logo_bilan'), mainLabel: t('fayllar.hisobot'), mainIkon: 'chop', main: 'hisobot', more: [[t('fayllar.rasm'), 'rasm', 'rasm'], ['360°', 'panorama', 'aylanish'], ['GLB (3D/AR)', 'glb']] },
    { title: t('fayllar.sexga'), col: 'var(--lav)', sub: t('fayllar.sexga_sub', { d: NS.panel_count || 0, v: NS.total_sheets || 0 }), mainLabel: t('fayllar.excel'), mainIkon: 'excel', main: 'excel',
      more: [[t('fayllar.detallar_csv'), 'cutlist'], [t('fayllar.loyiha_fayli'), 'loyiha'], [t('fayllar.smeta_csv'), 'smetaCsv'], [t('fayllar.obj_loyiha'), 'objButun'], [t('fayllar.obj_rang'), 'objRangButun'],
        [t('fayllar.skp_loyiha'), 'skpButun'], [t('fayllar.dae_loyiha'), 'daeButun'],
        ...(modul ? [[t('fayllar.obj_modul'), 'obj'], [t('fayllar.skp_modul'), 'skp'], [t('fayllar.dae_modul'), 'dae']] : []),   // #233: butun loyiha doim; tanlangan modul — qo'shimcha
        [t('fayllar.teshiklar_json'), 'teshiklar']] },
    { title: t('fayllar.stanokka'), col: 'var(--acct)', sub: t('fayllar.dastursiz'), mainLabel: 'GibLab', main: 'giblab',
      more: [['DXF', 'dxf'], ['G-code', 'gcode'], [t('fayllar.tez_orada', { nom: 'Biesse' }), null], [t('fayllar.tez_orada', { nom: 'Homag' }), null], ['PTP', 'ptp'], ['NC', 'nc'], ['XNC', 'xnc'], [t('fayllar.altendorf_giblab'), 'altendorf', null, () => openSheet('altendorfYoriq', {})],   // egasi #223: .gibcut ni GibLab yozadi (yopiq format) — yo'riqnoma + GibLab .project
        [t('fayllar.kesim_reja'), 'kesimReja'],   // matnli fazali kesim rejasi — stanok nomisiz
        [t('fayllar.sinov', { nom: 'Bazis (.bpj)' }), 'bpj', null, () => openSheet('bpjYoriq', {})],   // TZ-33 B1: avval yo'riqnoma
        [t('fayllar.sinov', { nom: 'Bazis (.b3d)' }), 'b3d', null, () => openSheet('b3dYoriq', {})],   // TZ-33 B2: .b3d yozuvchi — SINOV
        /* TZ-11: Bazis eksportidek GibLab .project va KDT prisadka — texnolog sinovigacha faqat admin, SINOV */
        ...(admin ? [[t('fayllar.sinov', { nom: 'GibLab (Bazis)' }), 'giblabBazis'], [t('fayllar.sinov', { nom: 'KDT prisadka' }), 'kdt']] : [])]
        .filter(([, k]) => !k || !stanoklar || !STANOK.some(x => x[0] === k) || stanoklar.includes(k)) }];
  return {
    checks: [
      ...(R ? [{ ok: !NS.placed_count || NS.placed_count === NS.panel_count, text: NS.placed_count === NS.panel_count ? t('fayllar.sigdi', { n: detTotal, v: NS.total_sheets || 0 }) : t('fayllar.sigmadi', { n: NS.panel_count - NS.placed_count }) }] : []),
      { ok: !sizeWarn, text: sizeWarn ? t('fayllar.chegaradan_tashqari', { n: sizeWarn }) : t('fayllar.chegarada') },
      ...(R ? R.val.errors : []).map(x => ({ ok: false, text: x.message || x.code })),
      ...(missN ? [{ ok: false, text: t('fayllar.zapchast_narxsiz', { n: missN }) }] : [])],
    fileGroups: groups.map(g => ({ ...g, main: () => faylYukla(g.main),
      more: g.more.map(([l, k, ikon, go]) => ({ label: l, ikon, dis: !k, c: k ? 'var(--txt)' : 'var(--mut)', cur: k ? 'pointer' : 'not-allowed', go: () => { if (go) go(); else if (k) faylYukla(k); } })) }))
  };
}
