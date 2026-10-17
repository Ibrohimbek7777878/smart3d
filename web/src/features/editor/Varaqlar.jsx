import React from 'react';
import { t } from '../../i18n/index.js';
import { useSlice } from '../../store/index.js';
import { closeSheet } from '../../store/ui.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import TeshikVaraq from './room/TeshikVaraq.jsx';
import ShaklVaraq from './room/ShaklVaraq.jsx';
import OshxonaVaraq from './room/OshxonaVaraq.jsx';
import MaterialVaraq from './catalog/MaterialVaraq.jsx';
import KonstruktorVaraq from './konstruktor/KonstruktorVaraq.jsx';
import BazisVaraq from '../bazis/BazisVaraq.jsx';
import FurnituraVaraq from './catalog/FurnituraVaraq.jsx';
import DavomVaraq from '../projects/DavomVaraq.jsx';
import { materialTitle } from './catalog/material.js';
import Ikon from '../../shared/ui/Ikon.jsx';

/* TZ-19: muharrirdagi pastki varaqlar (dizaynda yo'q qismlar) — qaysi biri ochiq bo'lsa (ui.vq.kind) o'sha chiziladi. */
const VARAQ = {
  teshik: { title: () => t('xona.teshiklar_sarlavha'), Body: TeshikVaraq },
  shakl: { title: () => <><Ikon n="tahrir" size={18} />{t('varaq.erkin_shakl')}</>, label: 'xona.erkin_shakl', Body: ShaklVaraq },
  oshxona: { title: () => t('xona.oshxona_elementlari'), Body: OshxonaVaraq },
  material: { title: materialTitle, Body: MaterialVaraq },
  konstruktor: { title: () => <><Ikon n="konstruktor" size={18} />{t('konstruktor.sarlavha')}</>, label: 'konstruktor.sarlavha', Body: KonstruktorVaraq },
  bazis: { title: () => <><Ikon n="bazis" size={18} />{t('bazis.sarlavha')}</>, label: 'bazis.sarlavha', Body: BazisVaraq },
  furnitura: { title: () => <><Ikon n="furnitura" size={18} />{t('furnitura.sarlavha')}</>, label: 'furnitura.sarlavha', Body: FurnituraVaraq },
  davom: { title: () => <><Ikon n="papka" size={18} />{t('davom.sarlavha')}</>, label: 'davom.sarlavha', Body: DavomVaraq }   // TZ-27
};

export default function Varaqlar() {
  const { vq } = useSlice('ui');
  useSlice('data');
  const v = vq && VARAQ[vq.kind];
  if (!v) return null;
  const { Body } = v;
  return <Varaq title={v.title(vq)} label={v.label && t(v.label)} kind={vq.kind} onClose={closeSheet}><Body /></Varaq>;
}
