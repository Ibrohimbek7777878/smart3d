import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast } from '../../../store/ui.js';
import { raqam } from '../../../shared/lib/format.js';
import { openSettings } from '../../settings/actions.js';
import { nestQoldiqlari, qoldiqQosh } from '../../settings/qoldiq.js';
import { goStep } from '../actions.js';
import { narxKorinishi } from './narx.js';
import { t } from '../../../i18n/index.js';
import * as L from '../../../services/loyiha.js';

/* TZ-19: ③ Narx — mijoz narxi, tannarx, foyda, kotirovka, xizmatlar (S3), tannarx tarkibi, raskroy varaqlari, detallar. */
const RANGLAR = ['#FF7A45', '#5FE1C4', '#B9A6FF', '#FFB59A', '#F3F0E9'];    // dizayndagi raskroy ranglari
const dec = (x) => String(x || 0).replace('.', ',');

/** raskroy varaqlari (haqiqiy) va joriy varaqdagi detallar — foizda (dizayndagi chizma) */
function raskroy(R, idx) {
  const sheets = [];
  if (R) for (const [mc, m] of Object.entries(R.nest.by_material || {})) for (const sh of m.sheets || []) sheets.push({ mc, sh, L: sh.length || m.sheet_length, W: sh.width || m.sheet_width });
  const rk = Math.min(idx, Math.max(0, sheets.length - 1)), cur = sheets[rk];
  const col = {}; let ci = 0;
  const rects = cur ? (cur.sh.parts || []).map(pt => {
    const w = pt.rotated ? pt.width : pt.length, h = pt.rotated ? pt.length : pt.width;
    const key = pt.fragment || pt.code; if (!(key in col)) col[key] = RANGLAR[ci++ % RANGLAR.length];
    return { l: (pt.x / cur.L * 100) + '%', t: (pt.y / cur.W * 100) + '%', w: (w / cur.L * 100) + '%', h: (h / cur.W * 100) + '%', c: col[key] };
  }) : [];
  return { n: sheets.length, rk, cur, rects };
}

/** Plita qatorlari — material bo'yicha: "N list · M m² ishlatildi · to'lish P%" (M — detallar maydoni, list maydoni emas).
 *  Raskroy natijasi bo'lmasa (taxminiy hisob) — avvalgi jami qator. */
function plitaQatorlari(R, prod, B) {
  const bm = (R && R.nest && R.nest.by_material) || {};
  const lines = (prod.lines || []).filter(l => /^Plita/.test(l.group));
  const rows = lines.filter(l => bm[l.code] && bm[l.code].stats).map(l => {
    const nm = bm[l.code], st = nm.stats;
    return [(project.H ? project.matName(l.code) : l.code), t('narx.plita_mat', { n: nm.sheet_count || 0, m: dec(Math.round((st.used_area_m2 || 0) * 100) / 100), p: dec(st.utilization_pct || 0) }), l.amount];
  });
  return rows.length ? rows : [[t('narx.plita'), t('narx.plita_q', { n: B.sheetsCount || 0, m: dec(B.panelAreaM2) }), prod.sheetCost]];
}

function flipPrisadka(on) {
  project.doc.xizmatlar = Object.assign({}, project.doc.xizmatlar, { teshik: on });
  project.scheduleRecalc(true);
  toast(on ? t('narx.prisadka_qoshildi') : t('narx.prisadka_olindi'));
}

export function useQadamNarx() {
  const ed = useSlice('editor'), pj = useSlice('project'), auth = useSlice('auth');
  const R = project.res, pr = R ? R.priceRes : null, prod = R ? R.prod : null, B = prod ? prod.breakdown : {}, NS = R ? R.nest.summary : {};
  const missN = prod ? prod.missing.length : 0;
  const xzt = (prod && prod.xizmat_taklif && prod.xizmat_taklif.teshik) || { tanlangan: false, qty: 0, amount: 0 };
  const taxminiy = (prod && prod.taxminiy) || [];
  const rs = raskroy(R, ed.rk);
  const det = {};
  if (R) for (const cl of R.cutlists) for (const pt of cl.parts) { const k = pt.material || '—'; det[k] = (det[k] || 0) + (+pt.qty || 1); }
  return {
    price: narxKorinishi(R),
    markupLabel: t('narx.foyda', { n: prod ? Math.round((prod.markupPct || 0) * 100) : 0 }),
    hasMissing: missN > 0, missText: t('narx.zapchast_narxi_yoq', { n: missN }),
    toggleMissing: () => set('editor', { miss: !ed.miss }), missOpen: ed.miss,
    missing: prod ? prod.missing.map(m => ({ n: m.name || m.code, c: m.qty ? '×' + m.qty : '' })) : [],
    client: pj.client, onClient: ev => { set('project', { client: ev.target.value }); S.changed(); },
    quote: pr ? pr.lines.map(l => ({ name: l.code + ' · ' + (project.H && project.H.catalog[l.code] ? L.modulNomi(project.H, project.H.catalog[l.code]) : l.name), dim: (l.w || 0) + '×' + (l.d || 0) + '×' + (l.h || 0), n: l.qty, p: raqam(l.amount) })) : [],
    /* TZ-04: tasdiqlanmagan narx — "taxminiy" (eski saytdagidek); prisadka tanlanmagan bo'lsa — belgi (S3) */
    costRows: prod ? [...plitaQatorlari(R, prod, B),
      [t('narx.kromka') + (taxminiy.includes('Kromka') ? t('narx.taxminiy') : ''), t('narx.metr', { n: dec(B.edgeMeters) }), prod.edgeCost],
      [t('narx.zapchast'), t('narx.dona_n', { n: B.hwCount || 0 }), prod.hwCost],
      [t('narx.teshiklar') + (xzt.tanlangan ? (taxminiy.includes('Prisadka') ? t('narx.taxminiy') : '') : t('narx.tanlanmagan')), t('narx.prisadka_q', { n: B.holeCount || 0 }), prod.holeCost],
      [t('narx.ish_haqi'), t('narx.sex'), prod.laborCost]].map(r => ({ name: r[0], q: r[1], p: raqam(r[2] || 0) })) : [],
    xz: { on: !!xzt.tanlangan, sub: xzt.qty ? t('narx.teshik_sub', { n: xzt.qty, s: raqam(xzt.amount) }) : t('narx.teshik_yoq'),
      note: !xzt.tanlangan && xzt.qty ? t('narx.prisadka_eslatma') : '',
      flip: () => flipPrisadka(!xzt.tanlangan) },
    rk: { n: rs.rk + 1, rects: rs.rects, ar: rs.cur ? rs.cur.L + '/' + rs.cur.W : '2800/2070',
      summary: t('narx.raskroy_summary', { v: NS.total_sheets || 0, d: NS.panel_count || 0, i: Math.max(0, Math.round(100 - (NS.utilization_pct || 0))) }),
      dots: Array.from({ length: rs.n }, (_, i) => ({ w: i === rs.rk ? '22px' : '6px', c: i === rs.rk ? 'var(--acc)' : 'var(--sfc3)' })) },
    rkPrev: () => set('editor', { rk: (rs.rk + rs.n - 1) % Math.max(1, rs.n) }),
    rkNext: () => set('editor', { rk: (rs.rk + 1) % Math.max(1, rs.n) }),
    openParams: () => openSettings('raskroy'),
    /* TZ-23 C2 (admin): raskroydagi ishga yaraydigan qoldiqlar — omborga */
    qoldiq: auth.user && auth.user.role === 'admin' && NS.remnant_count ? {
      label: t('qoldiq.omborga', { n: NS.remnant_count, m: NS.remnant_usable_m2 || 0 }),
      yoz: () => qoldiqQosh(nestQoldiqlari())
    } : null,
    detGroups: Object.entries(det).map(([mc, n]) => ({ n: project.H ? project.matName(mc) : mc, c: t('narx.detal_n', { n }) })),
    goStep4: () => goStep(4)
  };
}
