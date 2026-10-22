import React from 'react';
import { t } from '../../i18n/index.js';
import { useSlice } from '../../store/index.js';
import { closeSheet } from '../../store/ui.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import { materialTitle } from './catalog/material.js';
import Ikon from '../../shared/ui/Ikon.jsx';

import { kechiktir } from '../../shared/lib/kechiktir.jsx';

/* Tezlik (testchi nuqsonlari, 2026-10-22): varaq tanasi faqat varaq ochilganda kerak — har biri alohida bo'lak (ochilganda yuklanadi; birinchi ekran yengil) */
const TeshikVaraq = kechiktir(() => import('./room/TeshikVaraq.jsx'), { joy: 'ichki' });
const ShaklVaraq = kechiktir(() => import('./room/ShaklVaraq.jsx'), { joy: 'ichki' });
const OshxonaVaraq = kechiktir(() => import('./room/OshxonaVaraq.jsx'), { joy: 'ichki' });
const MaterialVaraq = kechiktir(() => import('./catalog/MaterialVaraq.jsx'), { joy: 'ichki' });
const KonstruktorVaraq = kechiktir(() => import('./konstruktor/KonstruktorVaraq.jsx'), { joy: 'ichki' });
const BazisVaraq = kechiktir(() => import('../bazis/BazisVaraq.jsx'), { joy: 'ichki' });
const FurnituraVaraq = kechiktir(() => import('./catalog/FurnituraVaraq.jsx'), { joy: 'ichki' });
const DavomVaraq = kechiktir(() => import('../projects/DavomVaraq.jsx'), { joy: 'ichki' });
const BuyurtmaVaraq = kechiktir(() => import('../buyurtma/BuyurtmaVaraq.jsx'), { joy: 'ichki' });
const OshxonaAiVaraq = kechiktir(() => import('./ai/OshxonaVaraq.jsx'), { joy: 'ichki' });
const BpjYoriq = kechiktir(() => import('./eksport/BpjYoriq.jsx'), { joy: 'ichki' });
const B3dYoriq = kechiktir(() => import('./eksport/B3dYoriq.jsx'), { joy: 'ichki' });
const AltendorfYoriq = kechiktir(() => import('./eksport/AltendorfYoriq.jsx'), { joy: 'ichki' });
const XizmatVaraq = kechiktir(() => import('./pricing/XizmatVaraq.jsx'), { joy: 'ichki' });
const TarkibVaraq = kechiktir(() => import('./pricing/TarkibVaraq.jsx'), { joy: 'ichki' });

/* TZ-19: muharrirdagi pastki varaqlar (dizaynda yo'q qismlar) — qaysi biri ochiq bo'lsa (ui.vq.kind) o'sha chiziladi. */
const VARAQ = {
  teshik: { title: () => t('xona.teshiklar_sarlavha'), Body: TeshikVaraq },
  shakl: { title: () => <><Ikon n="tahrir" size={18} />{t('varaq.erkin_shakl')}</>, label: 'xona.erkin_shakl', Body: ShaklVaraq },
  oshxona: { title: () => t('xona.oshxona_elementlari'), Body: OshxonaVaraq },
  material: { title: materialTitle, Body: MaterialVaraq },
  konstruktor: { title: () => <><Ikon n="konstruktor" size={18} />{t('konstruktor.sarlavha')}</>, label: 'konstruktor.sarlavha', Body: KonstruktorVaraq },
  bazis: { title: () => <><Ikon n="bazis" size={18} />{t('bazis.sarlavha')}</>, label: 'bazis.sarlavha', Body: BazisVaraq },
  furnitura: { title: () => <><Ikon n="furnitura" size={18} />{t('furnitura.sarlavha')}</>, label: 'furnitura.sarlavha', Body: FurnituraVaraq },
  davom: { title: () => <><Ikon n="papka" size={18} />{t('davom.sarlavha')}</>, label: 'davom.sarlavha', Body: DavomVaraq },   // TZ-27
  buyurtma: { title: () => <><Ikon n="buyurtma" size={18} />{t('buyurtma.sarlavha')}</>, label: 'buyurtma.sarlavha', Body: BuyurtmaVaraq },   // TZ-23 C1
  aioshxona: { title: (vq) => <><Ikon n={vq.sarlavha ? 'ai' : 'oshxona'} size={18} />{t(vq.sarlavha || 'ai.osh_sarlavha')}</>, label: 'ai.osh_sarlavha', Body: OshxonaAiVaraq },   // egasi #166, #168
  bpjYoriq: { title: () => <><Ikon n="bazis" size={18} />{t('bpj.sarlavha')}</>, label: 'bpj.sarlavha', Body: BpjYoriq },   // TZ-33 B1
  altendorfYoriq: { title: () => <><Ikon n="bazis" size={18} />{t('altendorf.sarlavha')}</>, label: 'altendorf.sarlavha', Body: AltendorfYoriq },   // egasi #223
  b3dYoriq: { title: () => <><Ikon n="bazis" size={18} />{t('b3d.sarlavha')}</>, label: 'b3d.sarlavha', Body: B3dYoriq },   // TZ-33 B2
  xizmat: { title: () => <><Ikon n="qosh" size={18} />{t('xizmatq.sarlavha')}</>, label: 'xizmatq.sarlavha', Body: XizmatVaraq },   // TZ-48: «Xizmat qo'shish»
  tarkib: { title: () => <><Ikon n="qatlam" size={18} />{t('narx.tarkib')}</>, label: 'narx.tarkib', Body: TarkibVaraq, keng: true }   // TZ-49: «Narx tarkibi» katta ko'rinishi
};

const TANALAR = [TeshikVaraq, ShaklVaraq, OshxonaVaraq, MaterialVaraq, KonstruktorVaraq, BazisVaraq, FurnituraVaraq, DavomVaraq, BuyurtmaVaraq, OshxonaAiVaraq, BpjYoriq, B3dYoriq, AltendorfYoriq, XizmatVaraq, TarkibVaraq];
/** varaq tanalarini oldindan yuklash (3D sahna ko'tarilgach, bo'sh vaqtda — app/App.jsx): varaq ochilganda kutish bo'lmaydi */
export const varaqlarniOldindanYukla = () => TANALAR.forEach(B => B.oldindan());

export default function Varaqlar() {
  const { vq } = useSlice('ui');
  useSlice('data');
  const v = vq && VARAQ[vq.kind];
  if (!v) return null;
  const { Body } = v;
  return <Varaq title={v.title(vq)} label={v.label && t(v.label)} kind={vq.kind} onClose={closeSheet} keng={!!v.keng}><Body /></Varaq>;
}
