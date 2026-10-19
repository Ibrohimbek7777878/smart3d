import { useMemo } from 'react';
import { useSlice, get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { zapchastRoyxat } from '../../../services/zapchast.js';
import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';
import { korinishOzgar } from './korinish.js';
import { scene } from './sahna.js';
import { RANG } from '../../../../../app/js/engine/teshik3d.js';

/* TZ-38 (egasi #274): "Zapchastlar" — bitta tugma: 3D da barcha zapchast aniq joyida + ro'yxat paneli.
 * Ro'yxat ma'lumoti — services/zapchast.js (narx paneli bilan bir manba: jami son va summa aynan mos). */
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const mm = (v) => String(Math.round(v)).replace('-', '−');

/** tugma: yoqish / o'chirish (o'chirilganda tanlov ham tozalanadi) */
export function zapchastOchYop() {
  const yoq = !get().korinish.zapchast;
  korinishOzgar({ zapchast: yoq, zapTanla: null });
  if (yoq) setTimeout(zapchastKadr, 60);                  // TZ-39: panel chizilgach — bo'sh joyni o'lchab, modulga yaqinlashtiramiz
}
/** TZ-39: ekranda panellar va kartalar yopmagan bo'sh joy (client koordinatada) → kamera shu joyning o'rtasiga modulni qo'yadi */
export function boshJoy() {
  const h = document.querySelector('[data-scene]');
  if (!h) return null;
  const r = h.getBoundingClientRect();
  let x0 = r.left + 8, x1 = r.right - 8, y0 = r.top + 72, y1 = r.bottom - 8;     // 72 px — yuqori asboblar qatori
  const yop = (el, tomon) => {
    if (!el) return;
    const q = el.getBoundingClientRect();
    if (!q.width || !q.height) return;
    if (tomon === 'chap') x0 = Math.max(x0, q.right + 8);
    else if (tomon === 'ong') x1 = Math.min(x1, q.left - 8);
    else if (tomon === 'past') y1 = Math.min(y1, q.top - 8);
  };
  const tor = r.width < 700;
  const ab = h.querySelector('[data-sahna-asbob]');
  if (ab) { const bs = [...ab.children].reduce((m, c) => Math.max(m, c.getBoundingClientRect().bottom), 0); if (bs > y0) y0 = bs + 6; }   // asboblar qatori (telefonda bir necha qator)
  yop(h.querySelector('[data-korinish-panel]'), 'ong');
  yop(h.querySelector('[data-zap-panel]'), tor ? 'past' : 'ong');
  yop(h.querySelector('[data-modul-karta]'), tor ? 'past' : 'chap');
  return x1 - x0 > 160 && y1 - y0 > 120 ? { x0, x1, y0, y1 } : null;
}
export function zapchastKadr() {
  const s = scene.sahna;
  if (s && get().korinish.zapchast) s.zapchastKadr(boshJoy());
}
/** TZ-39: turni 3D da yoqish / o'chirish (rang izohi chipi) */
export const zapchastTurOzgar = (tur) => { const o = get().korinish.zapTurlar || {}; korinishOzgar({ zapTurlar: { ...o, [tur]: o[tur] === false } }); };
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
      belgi: r.belgilar.length ? t('zapchast.belgi_n', { n: r.belgilar.length }) : t('zapchast.joyi_yoq'), joyiYoq: !r.belgilar.length,
      belgilar: r.belgilar.map(b => ({
        key: b.key, on: b.key === sel, tur: t('zapchast.tur_' + b.tur), detal: b.detal, modul: b.modul,
        joy: 'x ' + mm(b.p[0]) + ' · y ' + mm(b.p[1]) + ' · z ' + mm(b.p[2]) + ' ' + t('umumiy.mm'), taxminiy: b.taxminiy,
        tanla: () => zapchastTanla(b.key)
      }))
    };
  }) : [];
  const turSon = {};
  if (data) for (const r of data.qatorlar) for (const b of r.belgilar) turSon[b.tur] = (turSon[b.tur] || 0) + 1;
  const yash = k.zapTurlar || {};
  const turlar = ['petlya', 'ruchka', 'polka', 'napr', 'konfirmat', 'eksentrik', 'oyoq'].filter(x => turSon[x]).map(x => (
    { tur: x, nom: t('zapchast.tur_' + x), son: turSon[x], rang: hex(RANG[x] != null ? RANG[x] : RANG.boshqa), on: yash[x] !== false, ozgar: () => zapchastTurOzgar(x) }));
  return {
    on: true, hisob: !!data, qatorlar, turlar, yop: zapchastOchYop, belgiN: data ? data.jami.belgi : 0,
    jami: data ? t('zapchast.jami', { n: data.jami.qty, s: raqam(data.jami.amount) }) : '',
    belgiJami: data ? t('zapchast.belgi_jami', { n: data.jami.belgi }) : '',
    narxsiz: data && data.jami.narxsiz ? t('zapchast.narxsiz', { n: data.jami.narxsiz }) : '',
    bosh: data && !qatorlar.length ? t('zapchast.bosh') : ''
  };
}
