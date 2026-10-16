import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { scene } from './sahna.js';

/* TZ-23 (A, D): 3D ko'rinish holati — store ↔ sahna (services/korinish.js). Tanlov qurilmada eslab qolinadi
 * (kamera va o'lchash — har safar aylanishdan boshlanadi). Bazis loyihasida standart — Bazis-Cloud'dagidek:
 * qirralar bilan, xonasiz (foydalanuvchi o'zi tanlagan bo'lsa — uning tanlovi). */
const KALIT = 's3d-korinish';
/** fon ranglari (Bazis-Cloud'dagidek: oq … qora) — three'siz (muharrirning asosiy bo'lagida) */
export const FONLAR = { oq: 0xffffff, och: 0xe5e7eb, kulrang: 0x9aa3ae, toq: 0x2b313a, qora: 0x111317 };
const SAQLANADI = ['fon', 'chizish', 'rentgen', 'xona'];

function oqi() { try { return JSON.parse(localStorage.getItem(KALIT) || 'null'); } catch (_) { return null; } }
function yoz() {
  const k = get().korinish, o = {};
  for (const x of SAQLANADI) o[x] = k[x];
  try { localStorage.setItem(KALIT, JSON.stringify(o)); } catch (_) { /* kvota yoki taqiq */ }
}

/** sahna yaratilganda (mountSahna) */
export function korinishBoshla() {
  const s = scene.sahna;
  if (!s) return;
  const bazis = !!(project.doc && project.doc.bazis);
  const k = Object.assign({ fon: null, chizish: bazis ? 'qirrali' : 'boyalgan', rentgen: false, xona: !bazis }, oqi() || {},
    { kamera: 'orbit', fasadsiz: false, olchash: false });
  set('korinish', { ...k, menyu: false, olcham: null });
  s.korinish.onOlcham(mm => set('korinish', { olcham: mm }));
  s.korinish.set(k);
}

/** qisman o'zgarish: { kamera, fon, chizish, rentgen, xona, fasadsiz, olchash } */
export function korinishOzgar(p) {
  const s = scene.sahna;
  if (p.olchash === false || p.olchash === true) p = { ...p, olcham: null };
  set('korinish', p);
  if (s) s.korinish.set(p);
  yoz();
}
export const menyuOchYop = () => set('korinish', k => ({ menyu: !k.menyu }));
export const menyuYop = () => set('korinish', { menyu: false });
export const yonalish = (nom) => { const s = scene.sahna; if (s) s.korinish.yonalish(nom); };
export const zoom = (k) => { const s = scene.sahna; if (s) s.korinish.zoom(k); };
export const toliqEkran = () => { const s = scene.sahna; if (s) s.korinish.toliqEkran(); };
