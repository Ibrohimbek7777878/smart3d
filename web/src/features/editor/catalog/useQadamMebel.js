import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { baseForSheet, slotForBase } from '../../../services/hisob.js';
import { raqam } from '../../../shared/lib/format.js';
import { s3Thumb } from '../../../shared/design3d/engine.js';
import { openMaterial } from './material.js';

/* TZ-19: ② Mebel — haqiqiy katalog (qidiruv, toifa), material chiplari, modul qo'shish. Narx — taxmin (hisob dvigateli). */
function addModule(fr) {
  const p = L.addPlacement(project.doc, fr);
  set('editor', { sel: p.id });
  project.changed('items');
  toast(fr.code + ' sahnaga qo\'shildi');
}

const kindOf = (fr) => fr.category === 'drawer_base' ? 'tortma' : /moyka/i.test(fr.name) ? 'moyka' : /shisha|vitr/i.test(fr.name) ? 'glass' : 'door';

export function useQadamMebel() {
  const ed = useSlice('editor'), pj = useSlice('project');
  useSlice('data');
  const H = project.H, doc = project.doc;
  const cats = L.DIZAYN_KATEGORIYA, curCat = cats.find(c => c[0] === ed.cat) || cats[0];
  const ql = ed.q.trim().toLowerCase();
  const allFr = H ? Object.values(H.catalog) : [];
  const catalog = allFr.filter(fr => curCat[2](fr) && (!ql || (fr.name + ' ' + fr.code).toLowerCase().includes(ql))).map(fr => {
    const est = fr.category === 'appliance' ? null : project.est(fr, { materialCode: pj.matCode, fasadCode: pj.fasadCode, sheet: pj.sheet, xizmatlar: doc.xizmatlar });
    return { name: fr.name, dims: fr.w + '×' + fr.d + '×' + fr.h + ' mm', lim: 'min ' + (fr.min_w || '—') + ' · max ' + (fr.max_w || '—'),
      price: est == null ? 'o\'rnatma texnika' : '~' + raqam(est) + ' so\'m',
      add: () => addModule(fr),
      t: s3Thumb(fr.w, fr.h, fr.d, L.isUstki(fr) ? '#E8E4DA' : '#B4834F', kindOf(fr), fr.w > 600 ? 2 : 1, 48) };
  });
  /* chipda: shu slotga tanlangan ERP plitasi nomi yoki material nomi */
  const matLabel = (key) => {
    if (!H) return '…';
    const slot = key === 'matCode' ? 'korpus' : 'fasad';
    return pj.sheet && slotForBase(baseForSheet(pj.sheet)) === slot ? pj.sheet.name : project.matName(pj[key]);
  };
  return {
    catCount: allFr.length + ' ta modul',
    q: ed.q, onQ: ev => set('editor', { q: ev.target.value }),
    cats: cats.map(c => ({ label: c[1], bg: ed.cat === c[0] ? 'var(--acc)' : 'var(--sfc)', c: ed.cat === c[0] ? 'var(--ink)' : 'var(--txt)', pick: () => set('editor', { cat: c[0] }) })),
    mats: [['Korpus', 'matCode'], ['Fasad', 'fasadCode']].map(([k, key]) => ({ k, v: matLabel(key), cycle: () => openMaterial(key) })),
    catalog, catEmpty: !catalog.length
  };
}
