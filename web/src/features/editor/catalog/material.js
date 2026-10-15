import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { baseForSheet, slotForBase } from '../../../services/hisob.js';
import { raqam } from '../../../shared/lib/format.js';

/* TZ-19 (TZ-09 8-bosqich): korpus/fasad materiali va ERP plitasi (1281 ta) — haqiqiy narx va varaq o'lchami. */
const same = (a, b) => a && b && ((a.sku && a.sku === b.sku && a.name === b.name) || (a.name === b.name && a.type === b.type));
const setMaterial = (patch) => { set('project', patch); project.scheduleRecalc(true); };

/** slot — 'matCode' (korpus) yoki 'fasadCode' */
export function openMaterial(slot) { openSheet('material', { slot, q: '' }); }

export function useMaterialVaraq() {
  const q = useSlice('ui').vq, pj = useSlice('project');
  const H = project.H, slotName = q.slot === 'matCode' ? 'Korpus' : 'Fasad';
  const pm = (H.materials.panel_materials || []).filter(m => /^(LDSP|LMDF|MDF|OSB)/.test(m.code));
  return {
    turlar: pm.map(m => ({ label: m.name, on: pj[q.slot] === m.code,
      pick: () => { setMaterial({ [q.slot]: m.code, sheet: null }); toast(slotName + ': ' + m.name + ' — narx yangilandi'); } })),
    q: q.q, onQ: ev => patchSheet({ q: ev.target.value }), demoOn: !pj.sheet,
    demo: () => { setMaterial({ sheet: null }); toast('Bazaviy narx (materials.json)'); },
    plitalar: L.plitaRoyxati(H, q.q, pj[q.slot]).slice(0, 80).map(({ s: sh }) => ({
      name: (sh.id ? '[' + sh.id + '] ' : '') + sh.name, sub: [sh.sku, sh.th ? sh.th + ' mm' : '', sh.l && sh.w ? sh.l + '×' + sh.w : ''].filter(Boolean).join(' · '),
      price: sh.uzs > 0 ? raqam(sh.uzs) + ' so\'m' : 'narx yo\'q', on: same(pj.sheet, sh),
      pick: () => {
        const base = baseForSheet(sh), slot = slotForBase(base), patch = { sheet: sh };
        if (slot === 'korpus') patch.matCode = base; else if (slot === 'fasad') patch.fasadCode = base;
        setMaterial(patch);
        toast(slot ? 'Real material (' + slot + '): ' + sh.name : sh.name + ' — korpus/fasad uchun emas, faqat narx bazasi');
      } }))
  };
}

export const materialTitle = (vq) => (vq.slot === 'matCode' ? 'Korpus materiali' : 'Fasad materiali');
