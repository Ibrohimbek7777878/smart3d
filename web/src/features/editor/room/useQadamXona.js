import { useState } from 'react';
import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { openSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { clamp } from '../../../shared/lib/format.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { tayyorShakl, teshiklarniMosla } from '../../../services/devor.js';
import { PRESETS } from '../../onboarding/useOnboarding.js';
import { goStep } from '../actions.js';
import { teshikRoyxati, openTeshik } from './teshik.js';
import { openShakl } from './shakl.js';
import { openOshxona } from './oshxona.js';
import { t } from '../../../i18n/index.js';

/* TZ-19: ① Xona — shakl, o'lcham, teshiklar, oshxona elementlari. */
const LIM = { w: [1500, 9000], d: [1500, 9000], h: [2200, 4000] };

function applySize(key, value, room) {
  const v = clamp(+value || 0, LIM[key][0], LIM[key][1]);
  if (key === 'h') L.applyRoom(project.doc, { h: v });
  else L.applyRoom(project.doc, key === 'w' ? { w: v, d: room.d } : { w: room.w, d: v });
  project.changed('room');
}

export function useQadamXona() {
  useSlice('project');
  const [raw, setRaw] = useState({});
  const doc = project.doc, H = project.H, K = doc.kitchen || L.freshKitchen();
  const bb = roomBBox(doc.room.outline), room = { w: Math.round(bb.w), d: Math.round(bb.h), h: doc.room.wall_height || 2700 };
  const nO = (doc.room.outline || []).length, shakl = nO === 4 ? 'rect' : nO === 6 ? 'L' : nO === 8 ? 'P' : 'free';   // TZ-25 D4: P shakl
  /* o'lcham: yozish paytida matn saqlanadi, chegaraga — Enter yoki maydondan chiqqanda (oldin har tugmada keltirilardi) */
  const sizeIn = (key) => ({
    val: raw[key] ?? room[key],
    on: ev => setRaw(r => ({ ...r, [key]: ev.target.value })),
    commit: () => { if (raw[key] !== undefined) { applySize(key, raw[key], room); setRaw(r => ({ ...r, [key]: undefined })); } },
    key: ev => { if (ev.key === 'Enter') ev.target.blur(); }
  });
  const mm = ' ' + t('umumiy.mm');
  const kt = [['stoleshnitsa', t('xona.stoleshnitsa'), H && H.catalog['SP-ST-001'] ? t('xona.yaxlit', { n: H.catalog['SP-ST-001'].h }) : t('xona.yaxlit0')],
    ['sokol', t('xona.sokol'), H && H.catalog['SP-ST-002'] ? H.catalog['SP-ST-002'].d + mm : ''],   // tik planka: balandligi = d (kitchen.js)
    ['dobor', t('xona.dobor'), (K.doborH || 60) + mm], ['karniz', t('xona.karniz'), (K.karnizH || 60) + mm],
    ['moyka', t('xona.moyka'), t('xona.kesim', { n: (K.moyka || {}).size || 500 })]];
  return {
    shapes: [['rect', t('xona.tortburchak'), 'tortburchak'], ['L', t('xona.lshakl'), 'lShakl'], ['P', t('devor.shakl_P'), 'pShakl'], ['free', t('xona.erkin'), 'tahrir']].map(x => {
      const on = x[0] !== 'free' && x[0] === shakl;
      return { label: x[1], ikon: x[2], bg: on ? 'var(--acc)' : 'transparent', c: on ? 'var(--ink)' : 'var(--txt)',
        pick: () => {
          if (x[0] === 'free') { openShakl(); return; }
          L.applyRoom(doc, { outline: x[0] === 'L' ? L.L_OUTLINE.map(p => p.slice()) : x[0] === 'P' ? tayyorShakl('P', room.w, room.d) : L.rectOutline(room.w, room.d) });
          doc.room.openings = teshiklarniMosla(doc.room.outline, doc.room.openings);   // TZ-25: devordan chiqib qolgan teshik bo'lmasin
          project.changed('room', true);
        } };
    }),
    w: sizeIn('w'), d: sizeIn('d'), h: sizeIn('h'),
    roomPresets: PRESETS.map(p => {
      const on = room.w === p[0] && room.d === p[1];
      return { label: p[2], bg: on ? 'var(--acc)' : 'var(--sfc)', c: on ? 'var(--ink)' : 'var(--txt)', pick: () => { L.applyRoom(doc, { outline: L.rectOutline(p[0], p[1]) }); project.changed('room', true); } };
    }),
    holes: teshikRoyxati(doc), addHole: openTeshik, openKitchen: openOshxona,
    toggles: kt.map(r => ({ label: r[1], sub: r[2], on: r[0] === 'moyka' ? !!(K.moyka && K.moyka.on) : !!K[r[0]],
      flip: () => {
        const k = doc.kitchen || (doc.kitchen = L.freshKitchen());
        if (r[0] === 'moyka') { k.moyka = k.moyka || { on: false, offset: 600, fromBack: 100, size: 500 }; k.moyka.on = !k.moyka.on; } else k[r[0]] = !k[r[0]];
        project.changed('room', true);
      } })),
    goStep2: () => goStep(2)
  };
}
