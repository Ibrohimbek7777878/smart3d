import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet, closeSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { son } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

/* TZ-19 (TZ-09 8-bosqich): oshxona elementlari — dobor/karniz balandligi, moyka o'lchami va joyi (eski kitchenApply chegaralari). */
const F = [['doborH', 'xona.dobor_h'], ['karnizH', 'xona.karniz_h'], ['size', 'xona.moyka_size'], ['offset', 'xona.moyka_chap'], ['fromBack', 'xona.moyka_devor']];

export function openOshxona() {
  const k = project.doc.kitchen || L.freshKitchen(), m = k.moyka || {};
  openSheet('oshxona', { doborH: k.doborH || 60, karnizH: k.karnizH || 60, size: m.size || 500, offset: m.offset ?? 600, fromBack: m.fromBack ?? 100 });
}

export function useOshxonaVaraq() {
  const q = useSlice('ui').vq;
  return {
    maydonlar: F.map(([k, l]) => ({ label: t(l), val: q[k], on: ev => patchSheet({ [k]: ev.target.value }) })),
    saqla: () => {
      const doc = project.doc, kk = doc.kitchen || (doc.kitchen = L.freshKitchen()), m = kk.moyka || (kk.moyka = { on: false, offset: 600, fromBack: 100, size: 500 });
      kk.doborH = Math.max(30, son(q.doborH) || 60); kk.karnizH = Math.max(30, son(q.karnizH) || 60);
      m.size = Math.max(300, Math.min(900, son(q.size) || 0) || 500); m.offset = Math.max(0, son(q.offset) || 0); m.fromBack = Math.max(0, son(q.fromBack) || 0);
      project.changed('room', true);
      closeSheet();
      toast(t('xona.oshxona_saqlandi'));
    }
  };
}
