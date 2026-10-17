/* TZ-09: muharrir 3D sahnasi — BIZNING zamer tizimi (app/js/scene.js + items.js + controls.js, qoida S6),
 * tasdiqlangan dizayn ko'rinishida (mavzu). Dizayn qiymatlari README "3D materiallar" va prototip kodidan (engine.js):
 * fon #0C1C22 (sahna orqasidagi CSS gradient), devor 0x22424A / yon 0x1C3940, pol 0x14292F, oyna 0x5E8F96,
 * materiallar s3Mats (LDSP 0xC9BFAE, yog'och, oq 0xBDB5A6, HDF, tosh, qora, metall), yorug'lik — s3Viewer
 * (hemisphere + key + fill + rim), ACES tone mapping, kamera — dizayndagi camHome (theta .38, phi .24). */
import * as THREE from 'three';
import { createScene } from '../../../app/js/scene.js';
import { attachControls } from '../../../app/js/controls.js';
import { createItems } from '../../../app/js/items.js';
import { s3Mats } from '../shared/design3d/engine.js';
import { isUstki } from './loyiha.js';
import { createKorinish } from './korinish.js';
import { belgiGuruh, belgiQism, belgiTozala } from './belgi3d.js';

export const DIZAYN_RANG = {
  bg: 0x0C1C22, wall3D: 0x22424A, wallSide: 0x1C3940, floor: 0x14292F,
  glass: 0x5E8F96, glassEmissive: 0x10282C,
  /* 2D reja (dizayn tokenlari: --sfc2, --mut; to'r — s3Viewer grid ranglari) */
  wallFill2D: 0x204049, edge: 0x9DB8B5, gridMinor: 0x214C56, gridMajor: 0x3A7A84
};

/* dizayn yorug'ligi (s3Viewer, Y-up metr) → bizning olam (Z-up mm): (x, y, z)_dizayn → (x, z, y) */
const LIGHTS = [
  { c: 0xffffff, i: 1.7, v: [2.5, 3.5, 4] },     // key  (2.5, 4, 3.5)
  { c: 0xfff6e8, i: 0.55, v: [-3, -1, 2] },      // fill (-3, 2, -1)
  { c: 0xFF9466, i: 1.1, v: [-2.5, -3, 1.8] }    // rim  (-2.5, 1.8, -3)
];

export function dizaynMavzu() {
  const M = s3Mats(THREE, null, null);
  const glass = new THREE.MeshStandardMaterial({ color: 0x6FA3AA, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.75 });
  return {
    colors: DIZAYN_RANG,
    exposure: 1.15,                                  // dizayn: xona ko'rinishi (v.r.toneMappingExposure=1.15)
    fov: 32,                                         // dizayn: PerspectiveCamera(32, ...)
    lights(scene, T) {
      const hemi = new T.HemisphereLight(0xffffff, 0x55525e, 1.15);
      hemi.position.set(0, 0, 1);                    // Z-up
      scene.add(hemi);
      const tgt = new T.Object3D(); scene.add(tgt);
      const ls = LIGHTS.map(L => { const d = new T.DirectionalLight(L.c, L.i); d.target = tgt; scene.add(d); return [d, L.v]; });
      return {
        update(bb) {
          tgt.position.set(bb.cx, bb.cy, 0);
          for (const [d, v] of ls) d.position.set(bb.cx + v[0] * 2000, bb.cy + v[1] * 2000, v[2] * 2000);
        }
      };
    },
    /* dizayndagi camHome: markaz — chap devordan 0.9 m, balandlik 1.15 m, orqa devordan 0.7 m; theta .38, phi .24 */
    cam3d(bb) {
      const t = [bb.cx - bb.w / 4 + 900, bb.minY + 700, 1150];
      const d = Math.max(5200, bb.w * 1.6);
      return { pos: [t[0] + Math.sin(0.38) * Math.cos(0.24) * d, t[1] + Math.cos(0.38) * Math.cos(0.24) * d, t[2] + Math.sin(0.24) * d], target: t };
    },
    /* TZ-23 (egasi #115, #119): to'liq erkin — istalgan burchak (pol ostidan ham), 0.3–40 m, siljitish, kursorga yaqinlashish
       (dizayndagi cheklov: 2.2–12 m, −0.05…1.1 rad, siljitishsiz — Bazis-Cloud'dagidek emas edi) */
    orbit: { minDistance: 300, maxDistance: 40000, minPolarAngle: 0, maxPolarAngle: Math.PI, enablePan: true, screenSpacePanning: true, zoomToCursor: true },
    mat(k) {
      switch (k) {
        case 'wood': return M.wood();
        case 'white': return M.white();
        case 'hdf': return M.hdf();
        case 'stone': return M.stone();
        case 'dark': case 'appliance': return M.dark();
        case 'glass': return glass.clone();
        case 'handle': return M.metalD.clone();
        default: return M.ldsp();
      }
    },
    /* TZ-23 E: material dekori (nomidan, taxminiy — engine/rang.js). Yog'och — dizayndagi tekstura shu rangga bo'yaladi
       (tekstura o'rtacha rangi 0xB4834F ga nisbatan; ochroq dekor — tekstura o'zi), qolgani — tekis rang */
    /* #182: yog'och dekor — o'z rangidagi tekstura (asos — dekor rangi, tola chiziqlari to'qroq): plitkadagi namuna bilan bir xil.
       Avval tekstura 0xB4834F ga nisbatan bo'yalardi — undan ochroq dekor (Сонома, Вотан, Ясень …) standart yog'ochdan farqlanmasdi */
    rangMat(r) {
      if (r.yogoch) {
        const m = new THREE.MeshStandardMaterial({ map: yogochTex(r.rang), roughness: 0.62 });
        m.userData.rang = r.rang;
        return m;
      }
      const m = new THREE.MeshStandardMaterial({ color: r.rang, roughness: r.glyanes ? 0.18 : 0.5 });
      m.userData.rang = r.rang;
      return m;
    },
    ustki: (f) => isUstki(f),
    glass: (f) => /shisha|vitr|glass|oyna/i.test((f && f.name) || '')
  };
}

/** Sahna: host — dizayndagi roomHost div. o: { catalog, getPlacements, getRoom (eshik burchaklari, TZ-22), onSelect, onDrag, onDragEnd,
 *  cheklov (surish qoidalari, #151), onRotate, onRotateEnd, onTap, getTeshik (egasi #167: joy id → teshik3d() natijasi | null) } */
/* #182: yog'och teksturasi — dekor rangi asos, tola chiziqlari shu rangdan to'qroq (engine.js s3WoodTex uslubi); rang bo'yicha kesh */
const YOGOCH_TEX = new Map();
function yogochTex(rang) {
  if (YOGOCH_TEX.has(rang)) return YOGOCH_TEX.get(rang);
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'), R = (rang >> 16) & 255, G = (rang >> 8) & 255, B = rang & 255;
  x.fillStyle = '#' + rang.toString(16).padStart(6, '0'); x.fillRect(0, 0, 512, 512);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);   // barqaror (har ochilishda bir xil)
  for (let i = 0; i < 160; i++) {
    const y0 = rnd() * 512, k = 0.55 + rnd() * 0.25;
    x.strokeStyle = `rgba(${R * k | 0},${G * k | 0},${B * k | 0},${0.12 + rnd() * 0.25})`; x.lineWidth = 0.5 + rnd() * 2.2; x.beginPath();
    for (let X = 0; X <= 512; X += 16) { const y = y0 + Math.sin(X / 90 + i) * 6 + Math.sin(X / 23 + i * 3) * 1.5; X ? x.lineTo(X, y) : x.moveTo(X, y); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2;
  YOGOCH_TEX.set(rang, t);
  return t;
}

export function createSahna(host, o) {
  const theme = dizaynMavzu();
  const sp = createScene(host, { mode: '3d', theme, insetTop: 72 });   // 72 px — dizayndagi toolbar
  let items = null, korinish = null;
  const ctl = attachControls(sp, { hitTest: (e) => !!(items && items.hitTest(e)) });
  items = createItems(sp, {
    theme, surish3d: true,                                 // egasi #151: 3D da modul ustida tortish — surish
    getPlacements: o.getPlacements, getRoom: o.getRoom,
    /* #153: surilganda devorsiz ko'rinishdagi maydon chegarasi ham moslashadi */
    onDrag: (id, x, y) => { if (o.onDrag) o.onDrag(id, x, y); if (korinish) korinish.maydon(); },
    onSelect: o.onSelect, onDragEnd: o.onDragEnd, cheklov: o.cheklov, onRotate: o.onRotate, onRotateEnd: o.onRotateEnd, onTap: o.onTap
  });
  korinish = createKorinish({ sp, ctl }, host);           // TZ-23: kamera, yo'nalish, chizish rejimlari, o'lchash
  /* egasi #167: rentgenda teshik, kromka va zapchast belgilari — har modul guruhining bolasi (surilsa, burilsa — birga);
     oddiy ko'rinishda yashirin. Modul qayta qurilsa (items.setPlacements) belgi ham u bilan tozalanadi va kerak bo'lsa qayta quriladi */
  function belgilar(holat) {
    const on = !!holat.rentgen;
    for (const m of items.meshes) {
      let g = m.userData.belgi3d;
      if (!on) { if (g) g.visible = false; continue; }
      if (!g) {
        let dat = null;
        try { dat = o.getTeshik ? o.getTeshik(m.userData.id) : null; } catch (_) { dat = null; }
        if (!dat) continue;
        g = belgiGuruh(THREE, dat);
        m.add(g); m.userData.belgi3d = g;
      }
      g.visible = true;
      belgiQism(g, holat.belgilar);
    }
  }
  korinish.onQatlam(belgilar);
  const api = {
    sp, items, ctl, korinish,
    setDoc(doc, placements, catalog, o) { sp.setDoc(doc, o); items.setPlacements(placements, catalog); korinish.qollash(); },
    setPlacements(placements, catalog) { items.setPlacements(placements, catalog); korinish.qollash(); },
    /** egasi #167: kesim ro'yxati yangilandi — belgilar yangi ma'lumotdan qayta quriladi */
    belgiYangila() {
      for (const m of items.meshes) if (m.userData.belgi3d) { belgiTozala(m.userData.belgi3d); m.userData.belgi3d = null; }
      belgilar(korinish.holat); sp._invalidate();
    },
    /** belgilar soni (sahnadagi instansiyalar): { teshik, kromka, zapchast } — joy id bo'yicha (testlar) */
    belgiSoni(id) {
      const m = items.meshes.find(x => x.userData.id === id), g = m && m.userData.belgi3d;
      return g ? Object.assign({ korinadi: g.visible }, g.userData.son) : null;
    },
    select(id) { if (items.getSelected() !== id) items.select(id); },
    setMode(m) { if (sp.mode !== m) { sp.setMode(m); ctl.updateButtons(); } },
    /** ⌖ Markazga — dizayndagi boshlang'ich ko'rinish */
    center() {
      sp.fit();
      if (sp.mode === '3d') { const t = sp.camTarget(); ctl.orbit.target.set(t[0], t[1], t[2]); ctl.orbit.update(); }
      if (korinish.maydonFaol()) korinish.yonalish('izo');  // #153: devorsiz — butun maydon chegarasi bilan ko'rinadi
      sp._invalidate();
    },
    /** 🔄 — avto-aylanish (dizayn: 0.5 rad/s) */
    spin(on) { ctl.orbit.autoRotate = !!on; ctl.orbit.autoRotateSpeed = 0.5 * 60 / (2 * Math.PI); if (on) sp._startLoop(); },
    dispose() { korinish.dispose(); items.dispose(); ctl.dispose(); sp.dispose(); }
  };
  return api;
}
