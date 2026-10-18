import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, confirm } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { detalKarta, ichiniKorsaBoladi, teshikJoy } from '../../../services/ichki.js';
import { select } from '../actions.js';
import { scene, bumpScene } from './sahna.js';
import { t } from '../../../i18n/index.js';
import { korinishOzgar } from './korinish.js';

/* TZ-19: sahna va modul kartasi amallari (dizayndagi roomClick, modul kartasi tugmalari, eshik/tortma). */
const items = () => scene.sahna && scene.sahna.items;
const selected = () => project.pl(get().editor.sel);

/** sahnada tegish: avval modul tanlanadi, keyin eshik ochiladi, keyin detal kartasi */
export function roomTap(id, part) {
  const s = get().editor, it = items();
  if (!id) { select(null); return; }
  if (s.sel !== id) { select(id); return; }
  if (!part) return;
  if (part.key && !it.isOpen(part.key) && !s.part) { it.setOpen([part.key], true); bumpScene(); return; }
  const frag = project.fr(project.pl(id)) || {}, p = get().project;
  const names = { korpus: project.matName(p.matCode), polka: project.matName(p.matCode), fasad: project.matName(p.fasadCode), orqa: project.matName('HDF3') };
  const pl = project.pl(id), cl = project.res && project.res.cutlists && project.res.cutlists.find(c => c.placementId === id);
  set('editor', { part: detalKarta(part, frag, names, { pl, cl, dat: teshikJoy(project.H, project.res, id, pl) }) });   // egasi #167
  it.setFocus(id, part.id);
}

/** eshik/tortmalar: hammasi (id=null) yoki bitta modulniki */
export function toggleOpen(id) {
  const it = items(); if (!it) return;
  const keys = it.moverKeys(id);
  it.setOpen(keys, !keys.some(k => it.isOpen(k)));
  set('editor', { part: null }); it.setFocus(null); bumpScene();
}
/** TZ-23 B: Bazis loyihasi — eshik ochilmaydi (faylda petlya tomoni yo'q), o'rniga fasadsiz ko'rinish (izoh bilan) */
export function bazisFasadsiz() {
  const yoq = !get().korinish.fasadsiz;
  korinishOzgar({ fasadsiz: yoq });
  if (yoq) toast(t('sahna.bazis_eshik_izoh'));
}
export function togglePartOpen() {
  const P = get().editor.part, it = items();
  if (!P || !P.key || !it) return;
  it.setOpen([P.key], !it.isOpen(P.key)); bumpScene();
}
export function closePart() { set('editor', { part: null }); const it = items(); if (it) it.setFocus(null); }

/** modul o'lchami (chegarasiga keltiriladi, ogohlantirish kartada) */
export function setDim(key, val) {
  const p = selected(), frag = project.fr(p); if (!p || !frag) return;
  const warn = L.setSize(p, frag, key, val);
  set('editor', s => ({ warn: { ...s.warn, [p.id]: warn }, raw: { ...s.raw, [key]: undefined } }));
  project.changed('items');
}
export function moveBy(mm) { const p = selected(); if (p) { L.moveAlong(p, mm); L.devordan(project.doc, p); project.changed('items'); } }   // #152: devorga kirmaydi
export function rotate() { const p = selected(); if (p) { L.rotate90(p); L.devordan(project.doc, p); project.changed('items'); } }
/** egasi #236: qaraydigan tomon (old/orqa/chap/ong) va erkin burchak (0–359°) */
export function setRot(deg) { const p = selected(); if (p) { L.setRot(p, deg); L.devordan(project.doc, p); set('editor', s => ({ raw: { ...s.raw, rot: undefined } })); project.changed('items'); } }
export function tomon(k) { if (k in L.TOMON_ROT) setRot(L.TOMON_ROT[k]); }
/** balandlik (p.z, mm) — xona balandligidan chiqmaydi */
export function setZ(z) { const p = selected(); if (p) { L.setZ(p, z, project.doc.room && project.doc.room.wall_height); set('editor', s => ({ raw: { ...s.raw, z: undefined } })); project.changed('items'); } }
export function duplicate() {
  const p = selected(); if (!p) return;
  const c = L.duplicatePlacement(project.doc, p.id);
  set('editor', { sel: c.id }); project.changed('items'); toast(t('sahna.nusxa_qoshildi'));
}
export function askDelete() {
  const p = selected(); if (!p) return;
  confirm({ title: t('sahna.ochirish_sarlavha'), text: t('sahna.ochirish_matn', { kod: p.frg, nom: L.joyNomi(project.H, p, project.fr(p)) }), ok: t('umumiy.ochirish'), danger: true,
    yes: () => { L.removePlacement(project.doc, p.id); select(null); project.changed('items', true); toast(t('sahna.ochirildi')); } });
}
/** "Ichini ko'rish" (Q6) — faqat MebelCity modullari */
export function openInside() {
  const p = selected(), frag = project.fr(p);
  if (!p || !ichiniKorsaBoladi(frag)) return;
  set('ins', { id: p.id, ex: 0, color: 1, auto: true });
}

export const center = () => scene.sahna && scene.sahna.center();
export const setView = (view) => set('editor', view === '2d' ? { view, spin: false } : { view });
export const toggleSpin = () => set('editor', s => ({ spin: !s.spin, view: '3d' }));
export function vr() { if (scene.vrBtn) { set('editor', { view: '3d' }); scene.vrBtn.click(); } else toast(t('sahna.vr_yoq')); }
export const tipNext = () => set('editor', s => ({ tip: s.tip + 1 }));
export const tipSkip = () => set('editor', { tip: 3 });
