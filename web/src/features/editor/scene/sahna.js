import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { korinishBoshla, korinishMaydon } from './korinish.js';
import { cheklovXonasi } from '../../../services/loyiha.js';
import { joyRanglari } from '../../../services/erpMaterial.js';
import { surishCheklov } from '../../../../../app/js/engine/devorOraliq.js';
import { teshikJoy } from '../../../services/ichki.js';

/* TZ-19: muharrir 3D sahnasi — bizning zamer tizimi (services/sahna.js, qoida S6) dizayn ko'rinishida.
 * Bitta nusxa: muharrir ochilganda yaratiladi (mount), yopilganda tozalanadi (unmount). 3D da o'zgargan holat
 * (eshik ochildi va h.k.) — editor.sceneV hisoblagichi orqali ekranga yetadi.
 * TZ-19 §5: three.js (667 KB) va sahna kodi — alohida bo'lak, muharrir ochilganda yuklanadi (birinchi ekran tezroq). */
export const scene = { sahna: null, vrBtn: null, vrBox: null };
let offDoc = null, offRecalc = null;

/** 3D holati o'zgardi — unga bog'liq yozuvlar (masalan "Eshiklarni ochish") yangilanadi */
export const bumpScene = () => set('editor', s => ({ sceneV: s.sceneV + 1 }));

/** host — dizayndagi roomHost div; onTap — sahnada tegish (actions.roomTap). alive() — hali kerakmi (yuklash paytida yopilgan bo'lsa — yo'q) */
export async function mountSahna(host, onTap, alive = () => true) {
  const [{ createSahna }, { VRButton }] = await Promise.all([import('../../../services/sahna.js'), import('three/examples/jsm/webxr/VRButton.js')]);
  if (!alive()) return;
  const H = project.H, ed = get().editor;
  const joylar = () => joyRanglari(H, H.viewPlacements(project.doc), get().project, project.doc.bazis);   // TZ-23 E: tanlangan material dekori 3D da
  /* #235: sudrash/aylantirish paytida stoleshnitsa, sokol, dobor, karniz modul bilan birga suriladi (kadrda bir marta, faqat hosila mesh'lar) */
  let autoRaf = 0;
  const autoYangila = () => {
    if (autoRaf) return;
    autoRaf = requestAnimationFrame(() => { autoRaf = 0; if (scene.sahna) scene.sahna.items.setAuto(joylar()); });
  };
  const sahna = createSahna(host, {
    getPlacements: () => joylar(),
    getRoom: () => project.doc.room,
    onSelect: (id) => {
      const e = get().editor;
      if (e.sel !== id) set('editor', { sel: id || null, raw: {}, part: null });
      if (id && e.tip === 0) set('editor', { tip: 1 });
    },
    onDrag: (id, x, y) => { const p = project.pl(id); if (p) { p.x = x; p.y = y; project.scheduleRecalc(); autoYangila(); } },
    /* egasi #151: surish (2D va 3D) — devorga yopishadi, devor ichiga va qo'shni modulga kirmaydi (#152: devordan DEVOR_ORALIQ mm) */
    cheklov: (id) => surishCheklov(cheklovXonasi(project.doc), project.doc.placements, id),   // #156: magnit yo'q; Erkin maydonda devor yo'q
    /* qo'yib yuborildi yoki Esc — stoleshnitsa, sokol kabi hosila elementlar yangi joyga moslashadi, avtomatik saqlash */
    onDragEnd: (id, holat) => { if (holat !== 'joyida') project.changed('items'); },
    onRotate: (id, rot, x, y) => { const p = project.pl(id); if (p) { p.rot = rot; p.x = x; p.y = y; project.scheduleRecalc(); autoYangila(); } },
    onRotateEnd: () => project.changed('items'),
    onTap,
    getTeshik: (id) => teshikJoy(project.H, project.res, id, project.pl(id))   // egasi #167: rentgen belgilari — kesim ro'yxatidan
  });
  scene.sahna = sahna;
  sahna.setDoc(project.doc, joylar(), H.catalog);
  sahna.setMode(ed.view);
  sahna.center();                                         // dizayndagi boshlang'ich ko'rinish (camHome)
  /* loyiha o'zgarsa: xona — devorlar ham va kamera markazga (dizayn), mebel — faqat mebel */
  offDoc = project.onDocChange((kind) => {
    if (kind === 'room') { sahna.setDoc(project.doc, joylar(), H.catalog); korinishMaydon(); sahna.center(); }
    else if (kind === 'devor') sahna.setDoc(project.doc, joylar(), H.catalog, { kamera: false });   // TZ-25: devor tahriri — kamera joyida
    else sahna.setPlacements(joylar(), H.catalog);
  });
  offRecalc = project.onRecalc(() => { if (scene.sahna) scene.sahna.belgiYangila(); });   // egasi #167: kesim yangilandi — belgilar ham
  /* VR (WebXR): three.js tugmasi o'z yozuvini o'zi boshqaradi ("VR NOT SUPPORTED") — yashirin qobiqda turadi,
     ekranda faqat dizayn tugmamiz (editor.vrOk) ko'rinadi */
  try {
    scene.vrBox = document.createElement('div'); scene.vrBox.style.display = 'none';
    scene.vrBtn = VRButton.createButton(sahna.sp.renderer); scene.vrBox.appendChild(scene.vrBtn); document.body.appendChild(scene.vrBox);
    if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(ok => set('editor', { vrOk: !!ok })).catch(() => {});
  } catch (_) { /* WebXR yo'q */ }
  if (ed.sel) sahna.select(ed.sel);
  korinishBoshla();                                       // TZ-23: ko'rinish holati (eslab qolingan yoki Bazis standarti)
  if (sahna.korinish.maydonFaol()) sahna.center();         // #153: devorsiz ko'rinish — boshidan butun maydon ko'rinadi
  set('editor', { sceneOn: true, sceneErr: false });
}

export function unmountSahna() {
  if (offDoc) { offDoc(); offDoc = null; }
  if (offRecalc) { offRecalc(); offRecalc = null; }
  if (scene.sahna) { scene.sahna.dispose(); scene.sahna = null; }
  if (scene.vrBox) { scene.vrBox.remove(); scene.vrBox = null; scene.vrBtn = null; }
  set('editor', { sceneOn: false });
}
