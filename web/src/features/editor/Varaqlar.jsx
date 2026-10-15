import React from 'react';
import { useSlice } from '../../store/index.js';
import { closeSheet } from '../../store/ui.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import TeshikVaraq from './room/TeshikVaraq.jsx';
import ShaklVaraq from './room/ShaklVaraq.jsx';
import OshxonaVaraq from './room/OshxonaVaraq.jsx';
import MaterialVaraq from './catalog/MaterialVaraq.jsx';
import { materialTitle } from './catalog/material.js';

/* TZ-19: muharrirdagi pastki varaqlar (dizaynda yo'q qismlar) — qaysi biri ochiq bo'lsa (ui.vq.kind) o'sha chiziladi. */
const VARAQ = {
  teshik: { title: () => 'Teshiklar', Body: TeshikVaraq },
  shakl: { title: () => '✎ Erkin shakl', Body: ShaklVaraq },
  oshxona: { title: () => 'Oshxona elementlari', Body: OshxonaVaraq },
  material: { title: materialTitle, Body: MaterialVaraq }
};

export default function Varaqlar() {
  const { vq } = useSlice('ui');
  useSlice('data');
  const v = vq && VARAQ[vq.kind];
  if (!v) return null;
  const { Body } = v;
  return <Varaq title={v.title(vq)} kind={vq.kind} onClose={closeSheet}><Body /></Varaq>;
}
