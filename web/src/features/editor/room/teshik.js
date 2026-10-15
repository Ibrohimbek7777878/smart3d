import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { son } from '../../../shared/lib/format.js';

/* TZ-19 (TZ-09 8-bosqich): teshiklar — deraza, eshik (devordagi ochiq joy) va quvur, rozetka (kommunikatsiya). */
const TURLAR = [['window', 'Deraza'], ['door', 'Eshik'], ['pipe', 'Quvur'], ['outlet', 'Rozetka']];
const turNomi = (k) => TURLAR.find(t => t[0] === k)[1];

export function openTeshik() { openSheet('teshik', { tur: 'window', wall: 0, width: 1200, offset: 500, z: 1000 }); }

/** xonadagi teshiklar ro'yxati: { t, d, del } — Xona qadamida ham, varaqda ham */
export function teshikRoyxati(doc) {
  const room = doc.room;
  return [
    ...(room.openings || []).map((o, i) => ({ t: o.type === 'window' ? 'Deraza' : 'Eshik', d: (o.width || 0) + ' mm · ' + (+o.wall + 1) + '-devor',
      del: () => { room.openings.splice(i, 1); project.changed('room', true); } })),
    ...(room.utilities || []).map((u, i) => ({ t: u.type === 'outlet' ? 'Rozetka' : 'Quvur', d: (+u.wall + 1) + '-devor · ' + (u.offset || 0) + ' mm · h ' + (u.z || 0),
      del: () => { room.utilities.splice(i, 1); project.changed('room', true); } }))];
}

export function useTeshikVaraq() {
  const q = useSlice('ui').vq;
  useSlice('project');
  const doc = project.doc, util = q.tur === 'pipe' || q.tur === 'outlet';
  return {
    turlar: TURLAR.map(([k, l]) => ({ label: l, on: q.tur === k, pick: () => patchSheet({ tur: k }) })),
    devorlar: (doc.room.outline || []).map((_, i) => ({ label: (i + 1) + '-devor · ' + Math.round(L.wallLen(doc, i)) + ' mm', on: q.wall === i, pick: () => patchSheet({ wall: i }) })),
    maydonlar: util
      ? [{ label: 'Devor boshidan, mm', val: q.offset, on: ev => patchSheet({ offset: ev.target.value }) }, { label: 'Balandlik, mm', val: q.z, on: ev => patchSheet({ z: ev.target.value }) }]
      : [{ label: 'Kenglik, mm', val: q.width, on: ev => patchSheet({ width: ev.target.value }) }],
    qosh: () => {
      const r = util ? L.addUtility(doc, { wall: q.wall, type: q.tur, offset: son(q.offset), z: son(q.z) })
        : L.addOpening(doc, { wall: q.wall, type: q.tur, width: son(q.width) });
      if (!r) { toast('Devor juda qisqa — kenglikni kamaytiring'); return; }
      project.changed('room', true);
      toast(turNomi(q.tur) + ' qo\'shildi');
    },
    royxat: teshikRoyxati(doc)
  };
}
