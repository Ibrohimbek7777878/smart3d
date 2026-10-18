/* Smart3D js/materials3d.js — MEBEL MATERIALLARI VA 3D PANELLAR (Sanoat standarti).
 *
 * 6 YILLIK ARXITEKTURA TALABLARI (Kamchilik 19):
 *    - Mebel yaxlit bo'yalgan quti emas, haqiqiy panellar (yon devorlar, tub,
 *      qopqoq, tokchalar, orqa HDF, fasad eshiklari va tutqichlar) majmuasi.
 *    - Ranglar 2D va 3D rejimda yagona uyg'unlikda bo'ladi.
 *    - Fasad va korpus slotlari mustaqil ranglarda ko'rinadi.
 */
import { getModulePanels } from './engine/assembler.js';
import { derazaYasa, DERAZA_KATEGORIYA } from './engine/deraza3d.js';
import { texnikaMesh, texnikaTuri } from './texnika3d.js';
import { mebelMesh, mebelTuri } from './mebel3d.js';

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
  /* egasi #232: o'rnatma texnika (faqat 3D ko'rinish, yangi sayt) — oddiy primitivlardan haqiqiyroq shakl, eshiklari ochiladi */
  if (opts.theme && frag && frag.category === 'appliance' && texnikaTuri(frag.code)) return texnikaMesh(THREE, frag, w, d, h, { rang: opts.texnikaRang, hinge: opts.hinge });
  /* egasi #239–#241: yotoqxona / yumshoq mebel (krovat, divan, kreslo, komod …) — yopiq quti emas, haqiqiy shakl (faqat 3D ko'rinish) */
  if (opts.theme && frag && mebelTuri(frag.code)) return mebelMesh(THREE, frag, w, d, h, { theme: opts.theme, rang: opts.rang });
  const group = new THREE.Group();
  /* TZ-09 Q5: yangi sayt (mavzu) — tortmalar ham (faqat 3D; eski sayt va eksportlar — avvalgidek) */
  /* TZ-22: yangi sayt — eshik soni/eni Bazis detallaridan, bitta eshik petlyasi — joylashuvdan (opts.hinge) */
  const asm = getModulePanels(frag, w, d, h, opts.theme ? Object.assign({}, opts, { tortma: true, eshiklar: true }) : opts);
  if (opts.theme) return themedMesh(THREE, frag, w, d, h, asm, opts.theme, group, opts.rang);

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

/** Tekstura mm masshtabida: BoxGeometry UV (har yoq 0..1) → yoq o'lchami / rasmning haqiqiy o'lchami (mm). Tekstura RepeatWrapping bo'lishi kerak.
 *  Geometriya har panelda alohida, shu sababli material umumiy bo'lsa ham takrorlanish har panelda to'g'ri. */
export function uvMm(geo, mmEni, mmBoyi) {
  const pr = geo.parameters || {}, X = pr.width, Y = pr.height, Z = pr.depth;
  const uv = geo.attributes.uv, nr = geo.attributes.normal;
  if (!uv || !nr || !(mmEni > 0) || !(mmBoyi > 0)) return geo;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(nr.getX(i)), ay = Math.abs(nr.getY(i));
    const [a, b] = ax > 0.5 ? [Z, Y] : ay > 0.5 ? [X, Z] : [X, Y];   // yoqning eni va bo'yi (mm)
    uv.setXY(i, uv.getX(i) * a / mmEni, uv.getY(i) * b / mmBoyi);
  }
  uv.needsUpdate = true;
  return geo;
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
 * group.userData.movers: [{ obj, type:'door', sign }] (items.js ochadi/yopadi); tortma — [{ obj, type:'drawer', dist }]:
 * fasad, tutqich va quti bitta guruhda oldinga suriladi.
 * Har panel mesh'ida userData.part — detal kartasi uchun (nom, o'lcham, slot).
 * theme: { mat(kind) → Material, ustki(frag) → bool, glass(frag) → bool, rangMat(r) → Material }
 * rang (TZ-23 E): { korpus, polka, fasad, orqa, stol } — tanlangan material dekori ({ rang, yogoch }, engine/rang.js);
 * yo'q qism — dizayndagi standart ko'rinish. */
function themedMesh(THREE, frag, w, d, h, asm, theme, group, rang) {
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
  const R = (theme.rangMat && rang) || {}, dekor = (r) => theme.rangMat(r);
  if (R.korpus && !kind && !(frag && frag.category === 'appliance')) mats.korpus = dekor(R.korpus);
  if (R.fasad && !kind && !glass) mats.fasad = dekor(R.fasad);
  if (R.orqa) mats.orqa = dekor(R.orqa);
  mats.polka = R.polka ? dekor(R.polka) : mats.korpus;
  mats.stol = R.stol ? dekor(R.stol) : mats.korpus;
  /* TZ-23 A5: Bazis paneli — o'z materiali rangida (nomidan, taxminiy; almashtirilgan bo'lsa — yangisi: rang.bazis[mi]) */
  const bzMat = new Map();
  const bazisMat = (p) => {
    const r = (R.bazis && R.bazis[p.mi]) || p.rang;
    if (!r || !theme.rangMat || (p.slot === 'fasad' && glass)) return null;
    const k = r.rang + (r.yogoch ? 'y' : '') + (r.rasm || '');
    if (!bzMat.has(k)) bzMat.set(k, theme.rangMat(r));
    return bzMat.get(k);
  };
  const hitGeo = new THREE.BoxGeometry(w, d, h);
  const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  hitMesh.userData = { kind: 'hitBox' };
  group.add(hitMesh);
  if (frag && DERAZA_KATEGORIYA.test(frag.category)) {      // egasi #236: real oyna/eshik (faqat ko'rinish; hisob parts'dan)
    const oyna = frag.category === 'window';
    const ramka = R.korpus ? dekor(R.korpus) : (R.fasad && !oyna ? dekor(R.fasad) : theme.mat(oyna ? 'white' : 'wood'));
    derazaYasa(THREE, group, frag.category, w, d, h, { ramka, qanot: R.fasad ? dekor(R.fasad) : (oyna ? null : ramka), handle: mats.handle }, frag.name);
    group.userData = { kind: 'item', code, name: frag.name, category: frag.category, w, d, h, panelsCount: asm.panels.length, doorsCount: 0, movers: [], themed: true, deraza: true };
    return group;
  }
  const movers = [], drawers = {};
  for (const p of asm.panels) {
    const mat = (p.code === 'bazis' && bazisMat(p)) || (p.slot === 'fasad' ? mats.fasad : p.slot === 'orqa' ? mats.orqa : p.slot === 'polka' ? mats.polka : p.slot === 'stoleshnitsa' ? mats.stol : mats.korpus);
    if (p.shakl) {                                            // TZ-23 A5: egri / o'yiqli Bazis paneli — o'z konturi bo'yicha
      const mesh = shaklMesh(THREE, p.shakl, mat);
      if (mesh) {
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData = { panelId: p.id, name: p.name, slot: p.slot, part: { id: p.id, name: p.name, slot: p.slot, size: [p.w, p.d, p.h] } };
        group.add(mesh);
        continue;
      }
    }
    const pg = new THREE.BoxGeometry(p.w, p.d, p.h);
    if (mat.userData && mat.userData.rasmMm) uvMm(pg, mat.userData.rasmMm[0], mat.userData.rasmMm[1]);   // material rasmi — mm masshtabida
    const mesh = new THREE.Mesh(pg, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { panelId: p.id, name: p.name, slot: p.slot, part: { id: p.id, name: p.name, slot: p.slot, size: [p.w, p.d, p.h] } };
    if (p.isDrawer) {                                         // tortma: fasad + tutqich (+ quti — pastda) bitta guruhda
      const grp = new THREE.Group();
      group.add(grp);
      drawers[p.id] = grp;
      movers.push({ obj: grp, type: 'drawer', dist: Math.max(100, (d - 60) * 0.75), key: p.id });
      mesh.position.set(p.x, p.y, p.z);
      mesh.userData.mover = p.id;
      grp.add(mesh);
      if (p.handle) {
        const hm = new THREE.Mesh(new THREE.BoxGeometry(p.handle.w, p.handle.d, p.handle.h), mats.handle);
        hm.position.set(p.handle.x, p.handle.y, p.handle.z);
        hm.userData = { part: mesh.userData.part };
        grp.add(hm);
      }
      continue;
    }
    if (p.drawerOf) { mesh.position.set(p.x, p.y, p.z); (drawers[p.drawerOf] || group).add(mesh); continue; }
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
  for (const f of asm.furn || []) group.add(furnMesh(THREE, f, mats.handle));   // TZ-23 A5: Bazis oyoq va ruchkalari
  group.userData = {
    kind: 'item', code, name: frag ? frag.name : '', category: frag ? frag.category : 'other',
    w, d, h, panelsCount: asm.panels.length, doorsCount: asm.doors.length, movers, themed: true
  };
  return group;
}

/* TZ-23 A5: Bazis paneli konturi → ExtrudeGeometry. s: { o: boshi, m: [o'qX, o'qY, o'qZ] (9), t, p: [x, y …], h: [[x, y …]] }.
 * Chap qo'lli o'qlar (det < 0) — Y teskari (shakl ham), yuzalar to'g'ri tomonga qaraydi. */
function shaklMesh(THREE, s, mat) {
  const m = s.m, ax = m.slice(0, 3), az = m.slice(6, 9);
  let ay = m.slice(3, 6);
  const det = ax[0] * (ay[1] * az[2] - ay[2] * az[1]) - ax[1] * (ay[0] * az[2] - ay[2] * az[0]) + ax[2] * (ay[0] * az[1] - ay[1] * az[0]);
  const fy = det < 0 ? -1 : 1;
  if (fy < 0) ay = ay.map(v => -v);
  const yol = (a) => { const v = []; for (let k = 0; k + 1 < a.length; k += 2) v.push(new THREE.Vector2(a[k], fy * a[k + 1])); return v; };
  const tash = yol(s.p);
  if (tash.length < 3) return null;
  const shape = new THREE.Shape(tash);
  for (const h of s.h || []) { const v = yol(h); if (v.length >= 3) shape.holes.push(new THREE.Path(v)); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: s.t, bevelEnabled: false, curveSegments: 1 });
  geo.applyMatrix4(new THREE.Matrix4().set(ax[0], ay[0], az[0], s.o[0], ax[1], ay[1], az[1], s.o[1], ax[2], ay[2], az[2], s.o[2], 0, 0, 0, 1));
  return new THREE.Mesh(geo, mat);
}

/* TZ-23 A5: oyoq (silindr Ø30, o'qZ bo'ylab l mm) va ruchka (o'qX bo'ylab l+24 mm planka, fasaddan 28 mm, 2 ustuncha) — soddalashtirilgan;
 * TZ-24 A: shtanga (Ø24, o'qX bo'ylab l mm) */
function furnMesh(THREE, f, mat) {
  const g = new THREE.Group();
  const X = new THREE.Vector3(...f.ax).normalize(), Z = new THREE.Vector3(...f.az).normalize(), Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  g.matrixAutoUpdate = true;
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  g.position.set(f.o[0], f.o[1], f.o[2]);
  const qism = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.userData = { kind: 'furn', tur: f.tur }; g.add(m); };
  if (f.tur === 'oyoq') {
    const c = new THREE.CylinderGeometry(15, 15, f.l, 16);
    c.rotateX(Math.PI / 2);                                   // silindr o'qi — lokal Z
    qism(c, 0, 0, f.l / 2);
  } else if (f.tur === 'shtanga') {                         // TZ-24 A: kiyim ilgich — o'qX bo'ylab
    const c = new THREE.CylinderGeometry(12, 12, f.l, 16);
    c.rotateZ(Math.PI / 2);
    qism(c, f.l / 2, 0, 0);
  } else {
    qism(new THREE.BoxGeometry(f.l + 24, 12, 10), 0, 0, 28);
    for (const s of [-1, 1]) qism(new THREE.BoxGeometry(10, 10, 24), s * f.l / 2, 0, 12);
  }
  return g;
}
