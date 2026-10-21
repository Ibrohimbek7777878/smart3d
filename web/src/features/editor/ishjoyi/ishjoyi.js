import { get, set, useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, xato, confirm } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { konstruksiya } from '../../../../../app/js/engine/konstruktor/index.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { korinishOzgar } from '../scene/korinish.js';
import { chizishOch } from '../chizish/chizish.js';
import { bazisFayl } from '../../bazis/bazis.js';
import { asbobTanla } from './devorAsbob.js';
import { t } from '../../../i18n/index.js';
import { oddiyMi, oddiyQadam, oddiyPanel, useRejim } from '../oddiy/rejim.js';

/* TZ-25 A: bosh ish joyi — bitta ekran (Bazis kabi). Kirishi bilan oxirgi loyiha yoki bo'sh standart xona ochiladi
 * ("Nima yasaymiz" so'rovnomasi yashirildi — qoida 2.7). O'ng panel faqat kerak bo'lganda: editor.step — 0 (yopiq),
 * 1 Xona, 2 Mebel (katalog), 3 Narx, 4 Fayllar; modul chizish — o'z paneli (chizish.ochiq). */
const POLKA = 'LDSP16';
export const STANDART_XONA = { w: 5000, d: 4000, h: 2700 };          // egasi #152: standart xona 5 m × 4 m (oldin #134: 3.6 × 3 m); balandlik o'zgarmadi
export const tor = () => typeof matchMedia === 'function' && matchMedia('(max-width:980px)').matches;

/** ish joyini ko'rsatish: telefonda panel yopiq (kanva va matn qatori), kompyuterda — katalog */
export function ishJoyiOch(step) {
  set('nav', { screen: 'app' });
  set('editor', { step: step != null ? step : (tor() ? 0 : 2), done: { 1: true }, tip: 3, sel: null, part: null, warn: {} });
  set('ishjoyi', { asbob: 'tanlash', nuqtalar: [], teshikTur: null, tahrir: null, tanlov: null, menyu: false });
}

/** yangi bo'sh ish joyi — standart xona, mebelsiz */
export async function yangiIshJoyi() {
  await project.load();
  if (!project.H) { xato('S3D-DATA-101', { modul: 'ishjoyi' }); return; }
  S.resetCurrent();
  project.res = null;
  project.fromOnboarding('other', STANDART_XONA);
  set('project', s => ({ name: t('umumiy.yangi_loyiha'), client: '', polkaCode: s.polkaCode || POLKA }));
  ishJoyiOch();
  project.changed('room', true);
}

/** o'ng panel: shu bo'lim ochiladi (yopish — panelning × tugmasi) */
export function panel(n) {
  if (oddiyMi()) { if (n === 3) oddiyQadam(4); else if (n === 1) oddiyQadam(1); else if (n === 2) oddiyQadam(2); return; }   // Oddiy rejim: Narx — 4-qadam, Fayllar yo'q
  if (get().chizish.ochiq) set('chizish', { ochiq: false });
  set('editor', s => ({ step: n, done: { ...s.done, ...(n > 1 ? { [n - 1]: true } : null) } }));
}
export const panelYop = () => { set('editor', { step: 0, almash: null }); if (get().chizish.ochiq) set('chizish', { ochiq: false }); };

/** "Tez boshlash" (loyiha bo'sh bo'lganda, matn qatori ustida): oshxona — joriy xonaga avtomatik konstruktor (TZ-22) */
export function tezOshxona() {
  const H = project.H, doc = project.doc;
  if (!H) return;
  let v = null;
  try { v = konstruksiya(doc.room, { devor: 0 }, H.korinadiKatalog).variantlar[0] || null; } catch (e) { xato('S3D-KONS-104', { modul: 'ishjoyi', err: e }); return; }
  if (!v || !v.placements.length) { toast(t('konstruktor.topilmadi')); return; }
  doc.placements = v.placements.filter(p => H.catalog[p.frg]);
  doc.kitchen = Object.assign(L.freshKitchen(), v.kitchen);
  set('editor', { sel: null, part: null, warn: {} });
  project.changed('room', true);
  const bb = roomBBox(doc.room.outline);
  toast(t('ai.qurdi', { n: doc.placements.length, w: Math.round(bb.w), h: Math.round(bb.h) }));
}

/** ish joyiga fayl tashlandi: Bazis (.b3d, .fr3d, .bpj); boshqasi — xato */
export function faylTashlandi(ev) {
  ev.preventDefault();
  if (oddiyMi()) return;                                        // Oddiy rejimda Bazis fayli yo'q
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (!f) return;
  if (!/\.(b3d|fr3d|bpj)$/i.test(f.name)) { xato('S3D-BAZIS-101', { modul: 'ishjoyi', xabar: 'fayl: ' + f.name.slice(0, 60) }); return; }
  const n = project.doc.placements.length;
  if (n) confirm({ title: t('ai.almashtirish_sarlavha'), text: t('ai.almashtirish_matn', { n }), ok: t('ai.almashtirish'), yes: () => bazisFayl(f) });
  else bazisFayl(f);
}
export function faylUstida(ev) { if (ev.dataTransfer && [...(ev.dataTransfer.types || [])].includes('Files')) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } }

/** O'lchash (TZ-23 D) — 3D da ikki nuqta orasidagi masofa */
export function olchash() {
  const on = !get().korinish.olchash;
  if (on) { asbobTanla('tanlash'); set('editor', { view: '3d' }); }
  korinishOzgar({ olchash: on });
}

/** chap asboblar paneli */
export function useAsboblar() {
  const ed = useSlice('editor'), ij = useSlice('ishjoyi'), chz = useSlice('chizish'), k = useSlice('korinish'), bz = useSlice('bazis');
  const pn = chz.ochiq ? 'chizish' : ed.step;
  const B = (id, ik, label, on, bos) => ({ id, ik, label, on: !!on, bos });
  const rj = useRejim();
  if (rj.oddiy) {                                                // Oddiy rejim: faqat 4 qadam
    const q = (id, ik, n, label) => B('o-' + id, ik, label, rj.panel === n, () => oddiyQadam(rj.panel === n ? 0 : n));
    return { bazisYuk: null, oddiy: true, asboblar: [q('xona', 'xona', 1, t('oddiy.xona')), q('tayyor', 'mebel', 2, t('oddiy.tayyor')), q('rang', 'material', 3, t('oddiy.rang')), q('narx', 'narx', 4, t('oddiy.narx'))] };
  }
  return {
    bazisYuk: bz.yuk,
    asboblar: [
      B('tanlash', 'tanlash', t('asbob.tanlash'), ij.asbob === 'tanlash' && !k.olchash, () => { asbobTanla('tanlash'); if (get().korinish.olchash) korinishOzgar({ olchash: false }); }),
      B('devor', 'devor', t('asbob.devor'), ij.asbob === 'devor', () => asbobTanla('devor')),
      B('teshik', 'eshik', t('asbob.teshik'), ij.asbob === 'teshik', () => asbobTanla('teshik')),
      B('xona', 'xona', t('qadam.xona'), pn === 1, () => panel(1)),
      B('mebel', 'mebel', t('qadam.mebel'), pn === 2, () => panel(2)),
      B('chizish', 'modulChizish', t('asbob.modul'), pn === 'chizish', () => { if (get().chizish.ochiq) panelYop(); else chizishOch(); }),
      B('olchash', 'olchash', t('korinish.olchash'), k.olchash, olchash),
      B('narx', 'narx', t('qadam.narx'), pn === 3, () => panel(3)),
      B('fayllar', 'papka', t('qadam.fayllar'), pn === 4, () => panel(4))
    ]
  };
}
