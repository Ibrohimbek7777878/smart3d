import { useState } from 'react';
import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { openSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { clamp } from '../../../shared/lib/format.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { PRESETS } from '../../onboarding/useOnboarding.js';
import { goStep } from '../actions.js';
import { teshikRoyxati, openTeshik } from './teshik.js';
import { openShakl } from './shakl.js';
import { openOshxona } from './oshxona.js';

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
  const isRect = (doc.room.outline || []).length === 4;
  /* o'lcham: yozish paytida matn saqlanadi, chegaraga — Enter yoki maydondan chiqqanda (oldin har tugmada keltirilardi) */
  const sizeIn = (key) => ({
    val: raw[key] ?? room[key],
    on: ev => setRaw(r => ({ ...r, [key]: ev.target.value })),
    commit: () => { if (raw[key] !== undefined) { applySize(key, raw[key], room); setRaw(r => ({ ...r, [key]: undefined })); } },
    key: ev => { if (ev.key === 'Enter') ev.target.blur(); }
  });
  const kt = [['stoleshnitsa', 'Stoleshnitsa', H && H.catalog['SP-ST-001'] ? H.catalog['SP-ST-001'].h + ' mm, yaxlit' : 'yaxlit'],
    ['sokol', 'Sokol', H && H.catalog['SP-ST-002'] ? H.catalog['SP-ST-002'].d + ' mm' : ''],   // tik planka: balandligi = d (kitchen.js)
    ['dobor', 'Dobor', (K.doborH || 60) + ' mm'], ['karniz', 'Karniz', (K.karnizH || 60) + ' mm'],
    ['moyka', 'Moyka', ((K.moyka || {}).size || 500) + ' mm kesim']];
  return {
    shapes: [['rect', '▣ To\'rtburchak'], ['L', '◩ L-shakl'], ['free', '✎ Erkin']].map(x => {
      const on = x[0] === 'rect' ? isRect : x[0] === 'L' ? !isRect : false;
      return { label: x[1], bg: on ? 'var(--acc)' : 'transparent', c: on ? 'var(--ink)' : 'var(--txt)',
        pick: () => {
          if (x[0] === 'free') { openShakl(); return; }
          L.applyRoom(doc, { outline: x[0] === 'L' ? L.L_OUTLINE.map(p => p.slice()) : L.rectOutline(room.w, room.d) });
          project.changed('room', true);
        } };
    }),
    w: sizeIn('w'), d: sizeIn('d'), h: sizeIn('h'),
    roomPresets: PRESETS.map(p => {
      const on = room.w === p[0] && room.d === p[1];
      return { label: p[2], bg: on ? 'var(--acc)' : 'var(--sfc)', c: on ? 'var(--ink)' : 'var(--txt)', pick: () => { L.applyRoom(doc, { outline: L.rectOutline(p[0], p[1]) }); project.changed('room', true); } };
    }),
    holes: teshikRoyxati(doc), addHole: openTeshik, openKitchen: openOshxona,
    toggles: kt.map(t => ({ label: t[1], sub: t[2], on: t[0] === 'moyka' ? !!(K.moyka && K.moyka.on) : !!K[t[0]],
      flip: () => {
        const k = doc.kitchen || (doc.kitchen = L.freshKitchen());
        if (t[0] === 'moyka') { k.moyka = k.moyka || { on: false, offset: 600, fromBack: 100, size: 500 }; k.moyka.on = !k.moyka.on; } else k[t[0]] = !k[t[0]];
        project.changed('room', true);
      } })),
    goStep2: () => goStep(2)
  };
}
