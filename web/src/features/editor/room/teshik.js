import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { son } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

/* TZ-19 (TZ-09 8-bosqich): teshiklar — deraza, eshik (devordagi ochiq joy) va quvur, rozetka (kommunikatsiya). */
const TURLAR = [['window', 'xona.deraza'], ['door', 'xona.eshik'], ['pipe', 'xona.quvur'], ['outlet', 'xona.rozetka']];
const turNomi = (k) => t(TURLAR.find(x => x[0] === k)[1]);

export function openTeshik() { openSheet('teshik', { tur: 'window', wall: 0, width: 1200, offset: 500, z: 1000 }); }

/** xonadagi teshiklar ro'yxati: { t, d, del } — Xona qadamida ham, varaqda ham */
export function teshikRoyxati(doc) {
  const room = doc.room;
  return [
    ...(room.openings || []).map((o, i) => ({ t: t(o.type === 'window' ? 'xona.deraza' : 'xona.eshik'), d: t('xona.teshik_d', { w: o.width || 0, d: +o.wall + 1 }),
      del: () => { room.openings.splice(i, 1); project.changed('room', true); } })),
    ...(room.utilities || []).map((u, i) => ({ t: t(u.type === 'outlet' ? 'xona.rozetka' : 'xona.quvur'), d: t('xona.util_d', { d: +u.wall + 1, o: u.offset || 0, z: u.z || 0 }),
      del: () => { room.utilities.splice(i, 1); project.changed('room', true); } }))];
}

export function useTeshikVaraq() {
  const q = useSlice('ui').vq;
  useSlice('project');
  const doc = project.doc, util = q.tur === 'pipe' || q.tur === 'outlet';
  return {
    turlar: TURLAR.map(([k, l]) => ({ label: t(l), on: q.tur === k, pick: () => patchSheet({ tur: k }) })),
    devorlar: (doc.room.outline || []).map((_, i) => ({ label: t('xona.devor_chip', { d: i + 1, l: Math.round(L.wallLen(doc, i)) }), on: q.wall === i, pick: () => patchSheet({ wall: i }) })),
    maydonlar: util
      ? [{ label: t('xona.devor_boshidan'), val: q.offset, on: ev => patchSheet({ offset: ev.target.value }) }, { label: t('xona.balandlik'), val: q.z, on: ev => patchSheet({ z: ev.target.value }) }]
      : [{ label: t('xona.kenglik'), val: q.width, on: ev => patchSheet({ width: ev.target.value }) }],
    qosh: () => {
      const r = util ? L.addUtility(doc, { wall: q.wall, type: q.tur, offset: son(q.offset), z: son(q.z) })
        : L.addOpening(doc, { wall: q.wall, type: q.tur, width: son(q.width) });
      if (!r) { toast(t('xona.devor_qisqa')); return; }
      project.changed('room', true);
      toast(t('xona.qoshildi', { nom: turNomi(q.tur) }));
    },
    royxat: teshikRoyxati(doc)
  };
}
