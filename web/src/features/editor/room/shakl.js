import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet, closeSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { son } from '../../../shared/lib/format.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';

/* TZ-19 (TZ-09 8-bosqich): erkin xona — burchak nuqtalari (dizayndagi "✎ Erkin"). Kamida 3 nuqta. */
const asText = (pts) => pts.map(p => [String(p[0]), String(p[1])]);

export function openShakl() { openSheet('shakl', { pts: asText(project.doc.room.outline || []) }); }

export function useShaklVaraq() {
  const pts = useSlice('ui').vq.pts;
  const setPts = (next) => patchSheet({ pts: next });
  return {
    nuqtalar: pts.map((p, i) => ({ x: p[0], y: p[1], canDel: pts.length > 3,
      onX: ev => setPts(pts.map((r, j) => j === i ? [ev.target.value, r[1]] : r)),
      onY: ev => setPts(pts.map((r, j) => j === i ? [r[0], ev.target.value] : r)),
      del: () => { if (pts.length > 3) setPts(pts.filter((_, j) => j !== i)); } })),
    qoshNuqta: () => { const l = pts[pts.length - 1] || ['0', '0']; setPts(pts.concat([[String(son(l[0]) + 500), l[1]]])); },
    lShakl: () => setPts(asText(L.L_OUTLINE)),
    qolla: () => {
      const o = pts.map(p => [Math.round(son(p[0])), Math.round(son(p[1]))]);
      if (o.length < 3 || o.some(p => !isFinite(p[0]) || !isFinite(p[1]))) { toast('Kamida 3 ta to\'g\'ri nuqta kiriting'); return; }
      L.applyRoom(project.doc, { outline: o });
      project.changed('room', true);
      closeSheet();
      const b = roomBBox(o);
      toast('Xona: ' + o.length + ' nuqta · ' + Math.round(b.w) + '×' + Math.round(b.h) + ' mm');
    }
  };
}
