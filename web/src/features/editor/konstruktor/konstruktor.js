import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet, closeSheet, confirm, xato } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { konstruksiya } from '../../../../../app/js/engine/konstruktor/index.js';
import { t } from '../../../i18n/index.js';

/* TZ-22: avtomatik konstruktor oynasi — shakl va talablar → variantlar (har biri izoh bilan) → "Qo'llash".
 * Xona (o'lcham, deraza, eshik, quvur) — joriy loyihadan. Hisob — engine/konstruktor (AI'siz, internetsiz). */
const SHAKL = ['auto', 'I', 'L', 'U'];

export function openKonstruktor() {
  openSheet('konstruktor', { shakl: 'auto', xolodilnik: true, plita: true, ustki: true, natija: null });
}

function hisobla(q) {
  try {
    const r = konstruksiya(project.doc.room, { shakl: q.shakl, xolodilnik: q.xolodilnik, plita: q.plita ? 'erkin' : false, ustki: q.ustki }, project.H.korinadiKatalog);
    if (r.xato && r.xato !== 'S3D-KONS-103') xato(r.xato, { modul: 'konstruktor' });
    patchSheet({ natija: r });
  } catch (e) { xato('S3D-KONS-104', { modul: 'konstruktor', err: e }); }
}

/** variantni loyihaga qo'llash: mebel almashadi, stoleshnitsa/sokol yoqiladi (oshxonaning boshqa sozlamalari saqlanadi) */
function qolla(v) {
  const doc = project.doc;
  const run = () => {
    doc.placements = v.placements.map(p => Object.assign({}, p));
    doc.kitchen = Object.assign(doc.kitchen || L.freshKitchen(), { stoleshnitsa: true, stoleshnitsaD: v.kitchen.stoleshnitsaD, sokol: true });
    closeSheet();
    set('editor', { sel: null, part: null, warn: {} });
    project.changed('items');
    toast(t('konstruktor.qollandi', { n: v.placements.length }));
  };
  if (doc.placements.length) confirm({ title: t('konstruktor.almashtirish_sarlavha'), text: t('konstruktor.almashtirish_matn', { n: doc.placements.length }), ok: t('konstruktor.qollash'), yes: run });
  else run();
}

export function useKonstruktorVaraq() {
  const q = useSlice('ui').vq;
  useSlice('project');
  const tog = (k, label) => ({ label, on: !!q[k], pick: () => patchSheet({ [k]: !q[k], natija: null }) });
  const r = q.natija;
  return {
    shakllar: SHAKL.map(s => ({ label: t('konstruktor.shakl_' + s), on: q.shakl === s, pick: () => patchSheet({ shakl: s, natija: null }) })),
    talablar: [tog('xolodilnik', t('konstruktor.xolodilnik')), tog('plita', t('konstruktor.plita')), tog('ustki', t('konstruktor.ustki'))],
    korish: () => hisobla(q),
    variantlar: r ? r.variantlar.map((v, i) => ({
      nom: t('konstruktor.variant', { n: i + 1, nom: t('konstruktor.shakl_' + v.shakl), d: v.devorlar.map(x => x + 1).join(', ') }),
      sub: t('konstruktor.variant_sub', { m: v.placements.length }),
      izohlar: v.izohlar.map(z => ({ matn: t('konstruktor.iz_' + z.kalit, z.v), diqqat: !!z.diqqat })),
      ogoh: v.ogohlantirishlar.length,
      qolla: () => qolla(v)
    })) : null,
    bosh: !!r && !r.variantlar.length
  };
}
