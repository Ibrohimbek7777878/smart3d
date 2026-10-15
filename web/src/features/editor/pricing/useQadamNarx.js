import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast } from '../../../store/ui.js';
import { raqam } from '../../../shared/lib/format.js';
import { openSettings } from '../../settings/actions.js';
import { goStep } from '../actions.js';
import { narxKorinishi } from './narx.js';

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

function flipPrisadka(on) {
  project.doc.xizmatlar = Object.assign({}, project.doc.xizmatlar, { teshik: on });
  project.scheduleRecalc(true);
  toast(on ? 'Prisadka smetaga qo\'shildi' : 'Prisadka smetadan olindi');
}

export function useQadamNarx() {
  const ed = useSlice('editor'), pj = useSlice('project');
  const R = project.res, pr = R ? R.priceRes : null, prod = R ? R.prod : null, B = prod ? prod.breakdown : {}, NS = R ? R.nest.summary : {};
  const missN = prod ? prod.missing.length : 0;
  const xzt = (prod && prod.xizmat_taklif && prod.xizmat_taklif.teshik) || { tanlangan: false, qty: 0, amount: 0 };
  const taxminiy = (prod && prod.taxminiy) || [];
  const rs = raskroy(R, ed.rk);
  const det = {};
  if (R) for (const cl of R.cutlists) for (const pt of cl.parts) { const k = pt.material || '—'; det[k] = (det[k] || 0) + (+pt.qty || 1); }
  return {
    price: narxKorinishi(R),
    markupLabel: 'Foyda (+' + (prod ? Math.round((prod.markupPct || 0) * 100) : 0) + '%)',
    hasMissing: missN > 0, missText: missN + ' ta zapchastning narxi bazada yo\'q — 0 deb olindi',
    toggleMissing: () => set('editor', { miss: !ed.miss }), missOpen: ed.miss,
    missing: prod ? prod.missing.map(m => ({ n: m.name || m.code, c: m.qty ? '×' + m.qty : '' })) : [],
    client: pj.client, onClient: ev => { set('project', { client: ev.target.value }); S.changed(); },
    quote: pr ? pr.lines.map(l => ({ name: l.code + ' · ' + l.name, dim: (l.w || 0) + '×' + (l.d || 0) + '×' + (l.h || 0), n: l.qty, p: raqam(l.amount) })) : [],
    /* TZ-04: tasdiqlanmagan narx — "taxminiy" (eski saytdagidek); prisadka tanlanmagan bo'lsa — belgi (S3) */
    costRows: prod ? [['Plita', (B.sheetsCount || 0) + ' varaq · ' + dec(B.panelAreaM2) + ' m²', prod.sheetCost],
      ['Kromka' + (taxminiy.includes('Kromka') ? ' · taxminiy' : ''), dec(B.edgeMeters) + ' m', prod.edgeCost],
      ['Zapchast', (B.hwCount || 0) + ' dona', prod.hwCost],
      ['Teshiklar' + (xzt.tanlangan ? (taxminiy.includes('Prisadka') ? ' · taxminiy' : '') : ' · tanlanmagan'), 'присадка · ' + (B.holeCount || 0), prod.holeCost],
      ['Ish haqi', 'sex', prod.laborCost]].map(r => ({ name: r[0], q: r[1], p: raqam(r[2] || 0) })) : [],
    xz: { on: !!xzt.tanlangan, sub: xzt.qty ? xzt.qty + ' teshik · ' + raqam(xzt.amount) + ' so\'m' : 'loyihada teshik yo\'q',
      note: !xzt.tanlangan && xzt.qty ? 'Prisadka smetaga qo\'shilmagan — kerak bo\'lsa belgilang' : '',
      flip: () => flipPrisadka(!xzt.tanlangan) },
    rk: { n: rs.rk + 1, rects: rs.rects, ar: rs.cur ? rs.cur.L + '/' + rs.cur.W : '2800/2070',
      summary: (NS.total_sheets || 0) + ' varaq · ' + (NS.panel_count || 0) + ' detal · isrof ' + Math.max(0, Math.round(100 - (NS.utilization_pct || 0))) + '%',
      dots: Array.from({ length: rs.n }, (_, i) => ({ w: i === rs.rk ? '22px' : '6px', c: i === rs.rk ? 'var(--acc)' : 'var(--sfc3)' })) },
    rkPrev: () => set('editor', { rk: (rs.rk + rs.n - 1) % Math.max(1, rs.n) }),
    rkNext: () => set('editor', { rk: (rs.rk + 1) % Math.max(1, rs.n) }),
    openParams: () => openSettings('raskroy'),
    detGroups: Object.entries(det).map(([mc, n]) => ({ n: project.H ? project.matName(mc) : mc, c: n + ' detal' })),
    goStep4: () => goStep(4)
  };
}
