import { useMemo } from 'react';
import { useSlice, get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { zapchastRoyxat } from '../../../services/zapchast.js';
import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';
import { korinishOzgar } from './korinish.js';
import { RANG } from '../../../../../app/js/engine/teshik3d.js';

/* TZ-38 (egasi #274): "Zapchastlar" — bitta tugma: 3D da barcha zapchast aniq joyida + ro'yxat paneli.
 * Ro'yxat ma'lumoti — services/zapchast.js (narx paneli bilan bir manba: jami son va summa aynan mos). */
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const mm = (v) => String(Math.round(v)).replace('-', '−');

/** tugma: yoqish / o'chirish (o'chirilganda tanlov ham tozalanadi) */
export const zapchastOchYop = () => korinishOzgar({ zapchast: !get().korinish.zapchast, zapTanla: null });
/** ro'yxat qatori yoki 3D dagi zapchast bosildi — shu zapchast ajraladi (qayta bosilsa — ajratish olib tashlanadi) */
export const zapchastTanla = (key) => korinishOzgar({ zapTanla: get().korinish.zapTanla === key ? null : key });
/** 3D da zapchastga bosildi — har doim tanlanadi (ro'yxatda qator ochiladi) */
export const zapchastBosildi = (key) => korinishOzgar({ zapTanla: key });

export function useZapchast() {
  const k = useSlice('korinish'), ed = useSlice('editor'), pj = useSlice('project');
  const on = !!k.zapchast && ed.view === '3d' && ed.sceneOn;
  const data = useMemo(() => (on ? zapchastRoyxat(project) : null), [on, pj.dv, pj.docV]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!on) return { on: false };
  const sel = k.zapTanla;
  const qatorlar = data ? data.qatorlar.map((r, ri) => {
    const nom = r.bomsiz ? t('zapchast.tur_' + r.tur) : r.name;
    const ochiq = r.belgilar.some(b => b.key === sel);
    return {
      id: ri, nom, ochiq, bomsiz: r.bomsiz, noPrice: r.noPrice, tur: r.tur, rang: r.tur ? hex(RANG[r.tur] != null ? RANG[r.tur] : RANG.zapchast) : null,
      kod: r.bomsiz ? t('zapchast.narxda_yoq') : (r.id ? 'ID ' + r.id : r.code),
      soni: r.bomsiz ? '' : r.qty + ' ' + (r.unit && r.unit !== 'dona' ? r.unit : t('hujjat.u_dona')),
      narx: r.bomsiz ? '' : r.noPrice ? t('mebel.narx_yoq') : raqam(r.amount) + ' ' + t('umumiy.som'),
      belgi: r.belgilar.length ? t('zapchast.belgi_n', { n: r.belgilar.length }) : t('zapchast.joyi_yoq'),
      belgilar: r.belgilar.map(b => ({
        key: b.key, on: b.key === sel, tur: t('zapchast.tur_' + b.tur), detal: b.detal, modul: b.modul,
        joy: 'x ' + mm(b.p[0]) + ' · y ' + mm(b.p[1]) + ' · z ' + mm(b.p[2]) + ' ' + t('umumiy.mm'), taxminiy: b.taxminiy,
        tanla: () => zapchastTanla(b.key)
      }))
    };
  }) : [];
  return {
    on: true, hisob: !!data, qatorlar, yop: zapchastOchYop,
    jami: data ? t('zapchast.jami', { n: data.jami.qty, s: raqam(data.jami.amount) }) : '',
    belgiJami: data ? t('zapchast.belgi_jami', { n: data.jami.belgi }) : '',
    narxsiz: data && data.jami.narxsiz ? t('zapchast.narxsiz', { n: data.jami.narxsiz }) : '',
    bosh: data && !qatorlar.length ? t('zapchast.bosh') : ''
  };
}
