/* Smart3D js/materials3d.js — MEBEL MATERIALLARI VA 3D PANELLAR (Sanoat standarti).
 *
 * 6 YILLIK ARXITEKTURA TALABLARI (Kamchilik 19):
 *    - Mebel yaxlit bo'yalgan quti emas, haqiqiy panellar (yon devorlar, tub,
 *      qopqoq, tokchalar, orqa HDF, fasad eshiklari va tutqichlar) majmuasi.
 *    - Ranglar 2D va 3D rejimda yagona uyg'unlikda bo'ladi.
 *    - Fasad va korpus slotlari mustaqil ranglarda ko'rinadi.
 */
import { getModulePanels } from './engine/assembler.js';

/** Kategoriya → rang (yumshoq, ko'z uchun qulay). */
export const CATEGORY_COLOR = {
  cabinet:  0xd9c9a8,   // shkaf — quy
  wardrobe: 0xd9c9a8,   // garderob — quy
  kitchen:  0xd9c9a8,   // oshxona — quy
  bathroom: 0xcfdcd6,   // hammom — yashil-jigar
  sofa:     0xd6c3b8,   // divan — pushti-jigar
  table:    0xe0d3ba,   // stol — och
  chair:    0xe0d3ba,
  bed:      0xd6c3b8,
  shelf:    0xdcd2be,   // toko — kulrang
  door:     0xc9b79a,   // eshik — to'qroq
  window:   0xbcd0dc,   // oyna — moviy
  appliance:0x64748b,   // o'rnatma texnika — slateg kulrang
  countertop:0xd8d2c4,  // oshxona qo'shimcha
  other:    0xd8d2c4
};

export const CATEGORY_LABEL = {
  cabinet: 'Shkaf', wardrobe: 'Garderob', kitchen: 'Oshxona', bathroom: 'Hammom',
  sofa: 'Divan', table: 'Stol', chair: 'Stol-stul', bed: 'Karyera',
  shelf: 'Javon', door: 'Eshik', window: 'Oyna', appliance: "O'rnatma texnika", other: 'Boshqa'
};

const SEL_COLOR = 0xd97706; // tanlanganlik sarg'ish-oltin

/**
 * Mebel uchun haqiqiy panellardan tashkil topgan 3D guruh (Group) yasaydi.
 * @param {Object} THREE
 * @param {Object} frag  — katalogdagi fragment: {code,name,category,w,d,h}
 * @param {number} w,d,h — joylashuvdagi haqiqiy o'lcham (mm)
 * @param {Object} [opts] — slotlar, ranglar
 * @returns {THREE.Group}
 */
export function makeItemMesh(THREE, frag, w, d, h, opts = {}) {
  const group = new THREE.Group();
  const asm = getModulePanels(frag, w, d, h, opts);
  if (opts.theme) return themedMesh(THREE, frag, w, d, h, asm, opts.theme, group);

  // Ranglar
  const carcassColor = (frag && CATEGORY_COLOR[frag.category]) || 0xd9c9a8;
  const fasadColor = opts.fasadColor || 0x475569;  // zamonaviy to'q kulrang/ko'kimtir fasad
  const hdfColor = 0xcfc5b4;
  const handleColor = 0x1e293b;
  const edgeColor = 0x8a8072;

  const matCarcass = new THREE.MeshLambertMaterial({ color: carcassColor });
  const matFasad = new THREE.MeshLambertMaterial({ color: fasadColor });
  const matHdf = new THREE.MeshLambertMaterial({ color: hdfColor });
  const matHandle = new THREE.MeshLambertMaterial({ color: handleColor });
  const lineMat = new THREE.LineBasicMaterial({ color: edgeColor });

  // 1) Asosiy ko'rinmas hit-box (raycasting uchun)
  const hitGeo = new THREE.BoxGeometry(w, d, h);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.userData = { kind: 'hitBox' };
  group.add(hitMesh);

  // 2) Panellarni qurish
  for (const p of asm.panels) {
    const pGeo = new THREE.BoxGeometry(p.w, p.d, p.h);
    let pMat = matCarcass;
    if (p.slot === 'fasad') pMat = matFasad;
    else if (p.slot === 'orqa') pMat = matHdf;

    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.set(p.x, p.y, p.z);
    pMesh.castShadow = true;
    pMesh.receiveShadow = true;
    pMesh.userData = { panelId: p.id, name: p.name, slot: p.slot };

    // Panel qirralari
    const pEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pGeo, 1), lineMat.clone());
    pMesh.add(pEdges);
    pMesh.userData.edges = pEdges;

    // Ruchka (tutqich)
    if (p.handle) {
      const hGeo = new THREE.BoxGeometry(p.handle.w, p.handle.d, p.handle.h);
      const hMesh = new THREE.Mesh(hGeo, matHandle);
      hMesh.position.set(p.handle.x, p.handle.y, p.handle.z);
      const hEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(hGeo, 1),
        new THREE.LineBasicMaterial({ color: 0x0f172a })
      );
      hMesh.add(hEdges);
      group.add(hMesh);
    }

    group.add(pMesh);
  }

  // 3) Modul umumiy kontur qirrasi
  const outerEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hitGeo, 1),
    new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.6 })
  );
  outerEdges.userData = { kind: 'edges' };
  group.add(outerEdges);
  group.userData.edges = outerEdges;

  group.userData = {
    kind: 'item',
    code: frag ? frag.code : '',
    name: frag ? frag.name : '',
    category: frag ? frag.category : 'other',
    w, d, h,
    panelsCount: asm.panels.length,
    doorsCount: asm.doors.length
  };

  return group;
}

/** Tanlanganlikni belgilaydi (chegara rangini o'zgartiradi). */
export function setSelected(mesh, THREE, isSelected) {
  if (!mesh) return;
  const c = isSelected ? SEL_COLOR : 0x8a8072;
  if (mesh.userData && mesh.userData.edges) {
    mesh.userData.edges.material.color.setHex(c);
  }
  mesh.traverse(child => {
    if (child.userData && child.userData.edges) {
      child.userData.edges.material.color.setHex(c);
    }
  });
  mesh.position.z = isSelected ? 4 : 0;
}

/** Sahna yorug'ligi material yordamchisi. */
export function itemMaterial(THREE, category, selected = false) {
  const color = selected ? SEL_COLOR : (CATEGORY_COLOR[category] || CATEGORY_COLOR.other);
  return new THREE.MeshLambertMaterial({ color });
}
/* ── TZ-09: dizayn mavzusi (yangi frontend) ─────────────────────────────────────────────────
 * Materiallar mavzudan keladi (dizayndagi s3Mats: LDSP korpus, yog'och/oq fasad, HDF, tosh, qora, metall).
 * Qirra chiziqlari yo'q (dizayn). Eshiklar petlya atrofida aylanadigan "pivot" ichida —
 * group.userData.movers: [{ obj, type:'door', sign }] (items.js ochadi/yopadi).
 * Har panel mesh'ida userData.part — detal kartasi uchun (nom, o'lcham, slot).
 * theme: { mat(kind) → Material, ustki(frag) → bool, glass(frag) → bool } */
function themedMesh(THREE, frag, w, d, h, asm, theme, group) {
  const ustki = theme.ustki ? theme.ustki(frag) : false;
  const glass = theme.glass ? theme.glass(frag) : false;
  const code = frag ? frag.code : '';
  const kind = frag && frag.category === 'countertop'
    ? (code === 'SP-ST-002' ? 'dark' : 'stone')                 // sokol — qora, stoleshnitsa/dobor/karniz — tosh
    : null;
  const mats = {
    korpus: theme.mat(kind || (frag && frag.category === 'appliance' ? 'appliance' : 'ldsp')),
    fasad: theme.mat(kind || (glass ? 'glass' : ustki ? 'white' : 'wood')),
    orqa: theme.mat('hdf'),
    handle: theme.mat('handle')
  };
  const hitGeo = new THREE.BoxGeometry(w, d, h);
  const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hitMesh.userData = { kind: 'hitBox' };
  group.add(hitMesh);
  const movers = [];
  for (const p of asm.panels) {
    const mat = p.slot === 'fasad' ? mats.fasad : p.slot === 'orqa' ? mats.orqa : mats.korpus;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.d, p.h), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { panelId: p.id, name: p.name, slot: p.slot, part: { id: p.id, name: p.name, slot: p.slot, size: [p.w, p.d, p.h] } };
    let parent = group, ox = 0;
    if (p.isDoor && p.hingeSide) {
      /* petlya cheti — eshik shu nuqta atrofida aylanadi (old tomonga ochiladi) */
      const sign = p.hingeSide === 'right' ? -1 : 1;
      const pivot = new THREE.Group();
      ox = p.x - sign * p.w / 2;
      pivot.position.set(ox, p.y, p.z);
      group.add(pivot);
      parent = pivot;
      movers.push({ obj: pivot, type: 'door', sign, key: p.id });
      mesh.position.set(p.x - ox, 0, 0);
      if (p.handle) {
        const hm = new THREE.Mesh(new THREE.BoxGeometry(p.handle.w, p.handle.d, p.handle.h), mats.handle);
        hm.position.set(p.handle.x - ox, p.handle.y - p.y, p.handle.z - p.z);
        hm.userData = { part: mesh.userData.part };
        pivot.add(hm);
      }
      mesh.userData.mover = p.id;
    } else {
      mesh.position.set(p.x, p.y, p.z);
      if (p.handle) {
        const hm = new THREE.Mesh(new THREE.BoxGeometry(p.handle.w, p.handle.d, p.handle.h), mats.handle);
        hm.position.set(p.handle.x, p.handle.y, p.handle.z);
        group.add(hm);
      }
    }
    parent.add(mesh);
  }
  group.userData = {
    kind: 'item', code, name: frag ? frag.name : '', category: frag ? frag.category : 'other',
    w, d, h, panelsCount: asm.panels.length, doorsCount: asm.doors.length, movers, themed: true
  };
  return group;
}
