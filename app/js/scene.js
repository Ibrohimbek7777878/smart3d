/* static/client_erp/js/sunpin/sp-scene.js — SUNPIN 2D/3D SAHNA (TZ D8 "Yo'l-B").
 *
 * ASOSIY QAROR (D8): 2D va 3D — **BITTA sahnа**. Faqat kamera almashadi,
 * obyektlar qayta qurilmaydi. Shuning uchun `N` tugmasi <100 ms (M-4a) va
 * ko'rsatilgan narsa "sirg'a" bo'lmaydi.
 *
 * O'LCHAM (B3): 1 scene unit = 1 **mm**; doc koordinatalari (x, y, z) bilan
 * sahnа koordinatalari 1:1. Kamera **Z-up** (`up = (0,0,1)`):
 *   x = en · y = chuqurlik · z = balandlik.
 *
 * DEVORLAR (B8): `outline` poligoni + `openings` → `Shape` + `Shape.holes` →
 * `ExtrudeGeometry` (teshik HAQIQIY). Istalgan poligon ishlaydi (4+ burchak).
 *
 * 2D USLUBI (B9): reja ko'rinishida devor — `MeshBasicMaterial` (yarim
 * shaffof) + `EdgesGeometry` chiziq; yorug'lik kerak emas.
 *
 * (B12) `setPixelRatio(min(dpr,2))` · (B10) CSS2D o'lcham matnlari ·
 * (B2) `preserveDrawingBuffer` (PDF/screenshot) · (B11) ranglar ikki rejimda bir xil.
 *
 * ISHLATISH:
 *   import { createScene } from './sp-scene.js';
 *   const sp = createScene(el, { doc });
 *   sp.setDoc(doc); sp.setMode('3d'); sp.toggle(); sp.dispose();
 */
import * as THREE from 'three';
import { CSS2DRenderer } from '../vendor/three/addons/renderers/CSS2DRenderer.js';

/* Ranglar — ikkala rejimda BIR XIL (B11) */
const CLR = {
  wallFill2D: 0xd8d2c4,
  wallSurf3D: 0xe8e2d4,
  edge: 0x2d2a26,
  gridMinor: 0xe6e0d4,
  gridMajor: 0xcfc7b6,
  floor: 0xf3eee3,
  bg: 0xfbf8f1
};

export const DEFAULT_ROOM = {
  outline: [[0, 0], [4200, 0], [4200, 3100], [0, 3100]],
  wall_height: 2700,
  wall_thickness: 100,
  openings: [],
  utilities: []
};

export function createScene(container, opts = {}) {
  if (!container) throw new Error('sp-scene: container topilmadi');
  /* TZ-09: ixtiyoriy mavzu (yangi frontend dizayni). Berilmasa — hammasi avvalgidek.
     theme: { colors:{bg,wall3D,wallSide,floor,glass,...}, exposure, lights(scene,THREE)→update(bbox), cam3d(bbox,h)→{pos,target} } */
  const TH = opts.theme || null;
  const C = TH ? Object.assign({}, CLR, TH.colors || {}) : CLR;

  /* ── Renderer ───────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,      // B2
    alpha: !!TH                       // mavzu: fon — sahna orqasidagi CSS (dizayndagi gradient)
  });
  if (TH) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = TH.exposure || 1.15;
  }
  /* zoomda tekstura aniq: anisotropik filtr (kuchsiz qurilmada 4, qolganida 8 — tezlik pasaymasin) */
  const ANISO = Math.max(1, Math.min(renderer.capabilities.getMaxAnisotropy(), (navigator.hardwareConcurrency || 4) <= 4 ? 4 : 8));
  THREE.Texture.DEFAULT_ANISOTROPY = ANISO;
  let anisoSon = -1;
  function anisoQo() {
    const n = renderer.info.memory.textures;
    if (n === anisoSon) return;                  // yangi tekstura qo'shilmagan — aylanib chiqmaymiz
    anisoSon = n;
    scene.traverse(o => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'aoMap']) {
        const t = m[k];
        if (t && t.isTexture && t.anisotropy < ANISO) { t.anisotropy = ANISO; t.needsUpdate = true; }
      }
    });
  }
  renderer.xr.enabled = true;          // WebXR / VR (VRButton)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));   // B12
  renderer.setClearColor(C.bg, TH ? 0 : 1);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';     // canvas CSS o'lchami konteynerga bog'liq (dpr ≠ 1 da ham to'liq)
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  /* ── O'lcham matnlari (B10) ────────────────────────────────────────── */
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  if (!container.style.position) container.style.position = 'relative';
  container.appendChild(labelRenderer.domElement);

  /* ── Sahna ─────────────────────────────────────────────────────────── */
  const scene = new THREE.Scene();
  scene.background = TH ? null : new THREE.Color(C.bg);

  const cam2d = new THREE.OrthographicCamera(-2000, 2000, 1500, -1500, -100000, 100000);
  const cam3d = new THREE.PerspectiveCamera(TH && TH.fov ? TH.fov : 45, 1, 10, 300000);   // mavzu: dizayndagi 32°
  /* DIQQAT: 2D kamera TO'G'RI Z bo'ylab (pastga) qaraydi — shuning uchun uning
     `up`osi Z bo'lsa, up va qarash yo'nalishi PARALLEL bo'lib, matritsa
     noto'g'ri chiqadi (sahnа bo'sh ko'rinadi). Reja ko'rinishida ekrandagi
     "yuqori" = olamning +Y si, shuning uchun cam2d.up = (0,1,0).
     3D kamera esa Z-up dunyoda aylanadi → cam3d.up = (0,0,1). */
  cam2d.up.set(0, 1, 0);
  cam3d.up.set(0, 0, 1);

  let active = cam2d;                 // joriy kamera (toggle almashadi)
  let mode = '2d';
  /* TZ-23 (D1): 3D da ortografik kamera (Orto — perspektivasiz, chizmadagidek). Ixtiyoriy: setOrto(true) chaqirilmasa — yo'q */
  let cam3o = null, orto = false;

  let themeLights = null;
  if (TH && TH.lights) themeLights = TH.lights(scene, THREE);
  else {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.15));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2500, -3500, 5500);
    scene.add(dirLight);
  }

  /* ── Guruhlar (keyingi kunlar shu yerga qo'shadir) ─────────────────── */
  const gGrid = new THREE.Group();   gGrid.name = 'grid';
  const gFloor = new THREE.Group();  gFloor.name = 'floor';
  const gWalls2D = new THREE.Group(); gWalls2D.name = 'walls2d';
  const gWalls3D = new THREE.Group(); gWalls3D.name = 'walls3d';
  const gItems = new THREE.Group();  gItems.name = 'items';     // S-D4 mebel
  const gLabels = new THREE.Group(); gLabels.name = 'labels';   // S-D5 o'lcham
  scene.add(gGrid, gFloor, gWalls2D, gWalls3D, gItems, gLabels);

  /* ── Materiallar ────────────────────────────────────────────────────── */
  /* 3Dda devor YARIM SHAFFOF — ichidagi mebel hamma burchakdan ko'rinadi
     (dollhouse uslubi). 2Dda esa zich qoladi (matWall2D). */
  const matWall3D = TH
    ? new THREE.MeshStandardMaterial({ color: C.wall3D, roughness: 1 })          // mavzu: zich devor (dizayn)
    : new THREE.MeshLambertMaterial({
      color: C.wallSurf3D, transparent: true, opacity: 0.45,
      side: THREE.DoubleSide, depthWrite: false
    });
  const matWallSide = TH ? new THREE.MeshStandardMaterial({ color: C.wallSide || C.wall3D, roughness: 1 }) : matWall3D;
  const matGlass = TH ? new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.3, emissive: C.glassEmissive || 0x10282C, emissiveIntensity: 0.5 }) : null;
  const matWall2D = new THREE.MeshBasicMaterial({ color: C.wallFill2D, transparent: true, opacity: 0.85 });
  const matLine = (color, opacity = 1) =>
    new THREE.LineBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity });

  /* ── F6: qayta qurishda yangi material yaratilmaydi — ular SHARED va
     clearGroup ularni dispose QILMAYDI (faqat guruh ichidagi geometry va
     SHARED bo'lmagan materiallar tozalanadi). ── */
  const matEdge = matLine(C.edge);
  const matGridMinor = matLine(C.gridMinor, 0.5);
  const matGridMajor = matLine(C.gridMajor, 0.85);
  const matFloor = TH ? new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.9 }) : new THREE.MeshBasicMaterial({ color: C.floor });
  /* F1: quvur/rozetka belgisi (Line emas — Mesh uchun BasicMaterial) */
  const matUtil = new THREE.MeshBasicMaterial({ color: C.edge });
  const SHARED_MATS = new Set([matWall3D, matWallSide, matWall2D, matEdge, matGridMinor, matGridMajor, matFloor, matUtil].concat(matGlass ? [matGlass] : []));

  /* Guruhni bo'shatish + GPU resurslarini tozalash.
     Eski kod `.clear()` ishlatgan edi — devor/to'r har qayta qurilganda
     (xona o'lchami o'zgarganda) geometriyalar GPU xotirasida qolib ketgan. */
  function clearGroup(g) {
    for (const child of g.children.slice()) {
      g.remove(child);
      child.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) if (m && !SHARED_MATS.has(m)) m.dispose();
      });
    }
  }

  /* ── Devor: Shape + holes → ExtrudeGeometry (B8) ────────────────────── */
  function wallShape(len, height, openings) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(len, 0);
    shape.lineTo(len, height);
    shape.lineTo(0, height);
    shape.closePath();
    for (const o of openings || []) {
      const w = Math.max(1, Number(o.width) || 1);
      const h = Math.max(1, Number(o.height) || 1);
      const x0 = Math.max(0, Number(o.offset) || 0);
      const y0 = Math.max(0, Number(o.sill) || 0);
      const hole = new THREE.Path();
      hole.moveTo(x0, y0);
      hole.lineTo(x0, y0 + h);
      hole.lineTo(x0 + w, y0 + h);
      hole.lineTo(x0 + w, y0);
      hole.closePath();
      shape.holes.push(hole);        // HAQIQIY teshik — chizma emas
    }
    return shape;
  }

  /* ExtrudeGeometry XY tekisligida ishlaydi (X=uzunlik, Y=balandlik,
     Z=qalinlik). Bizning olam Z-up → `makeBasis(along, up, normal)` bilan
     o'tkazamiz.
     MUHIM: normal `(−ay, ax)` bo'lsa, baza CHAP QO'L (det = −1) bo'ladi —
     yuzalarning tartibi teskari o'tadi va "orqaga qaragan" yuzalar
     ko'rinmay qoladi (devor yarimda yo'qolgan holat). To'g'ri qo'l uchun
     `(ay, −ax)` — shunda det = +1 va hamma devor ko'rinadi. */
  function placeWall(obj, p0, p1, height) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const along = new THREE.Vector3(dx / len, dy / len, 0);
    const up = new THREE.Vector3(0, 0, 1);
    const normal = new THREE.Vector3(along.y, -along.x, 0);    // o'ng qo'l baza
    obj.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, height / 2);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, up, normal));
  }

  function buildWalls(room) {
    clearGroup(gWalls3D);
    clearGroup(gWalls2D);
    clearGroup(gFloor);

    const outline = Array.isArray(room && room.outline) && room.outline.length >= 3
      ? room.outline : DEFAULT_ROOM.outline;
    const height = Number(room && room.wall_height) || 2700;
    const thick = Number(room && room.wall_thickness) || 100;
    const pts = outline.map(p => ({ x: Number(p[0]) || 0, y: Number(p[1]) || 0 }));
    const openings = (room && room.openings) || [];

    let count = 0;
    /* mavzu: poligon yo'nalishi (soat strelkasiga qarshi bo'lsa o'ng normal — tashqariga) */
    let area2 = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area2 += a.x * b.y - b.x * a.y; }
    const outSign = area2 >= 0 ? 1 : -1;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (len < 1) continue;
      const mine = openings.filter(o => Number(o.wall) === i);

      // 3D — teshikli haqiqiy devor
      const geo3 = new THREE.ExtrudeGeometry(wallShape(len, height, mine), {
        depth: thick, bevelEnabled: false
      });
      geo3.translate(-len / 2, -height / 2, -thick / 2);
      const m3 = new THREE.Mesh(geo3, TH && Math.abs(p1.y - p0.y) > Math.abs(p1.x - p0.x) ? matWallSide : matWall3D);
      placeWall(m3, p0, p1, height);
      m3.userData = { kind: 'wall', index: i, len: len, height: height, openings: mine.length };
      if (TH) {
        const ax = (p1.x - p0.x) / len, ay = (p1.y - p0.y) / len;
        m3.userData.out = new THREE.Vector3(ay * outSign, -ax * outSign, 0);      // tashqariga qaragan normal
        m3.userData.mid = new THREE.Vector3((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, 0);
        /* derazada oyna (dizayn: glass) */
        for (const o of mine) {
          if (o.type !== 'window') continue;
          const ow = Math.max(1, Number(o.width) || 1), oh = Math.max(1, Number(o.height) || 1);
          const g = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, 8), matGlass);
          g.position.set(-len / 2 + (Number(o.offset) || 0) + ow / 2, -height / 2 + (Number(o.sill) || 0) + oh / 2, 0);
          m3.add(g);
        }
      }
      gWalls3D.add(m3);

      // 2D — reja ko'rinishi + chiziq.
      // MUHIM: baza (along, up, normal) → mahalliy X = uzunlik,
      // mahalliy Y = BALANDLIK, mahalliy Z = qalinlik. Shuning uchun
      // BoxGeometry(len, height, thick) — (len, thick, height) YOTIB qoladi
      // va devor reja ko'rinishida ko'rinmaydi.
      const geo2 = new THREE.BoxGeometry(len, height, thick);
      const m2 = new THREE.Mesh(geo2, matWall2D);
      m2.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo2, 1), matEdge));
      placeWall(m2, p0, p1, height);
      m2.userData = m3.userData;
      gWalls2D.add(m2);
      count++;
    }

    /* F1: pol — haqiqiy kontur (L shaklda qirqim bo'sh qoladi);
       ShapeGeometry konkav poligonni to'g'ri triangulyatsiya qiladi. */
    /* F1: quvur/rozetka belgilari — devor edge bo'ylab offset, balandlik z */
    for (const u of (room && room.utilities) || []) {
      const ui = Number(u && u.wall);
      if (!(ui >= 0) || ui >= pts.length) continue;
      const p0 = pts[ui], p1 = pts[(ui + 1) % pts.length];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (len < 1) continue;
      const t = Math.max(0, Math.min(1, (Number(u.offset) || 0) / len));
      const px = p0.x + (p1.x - p0.x) * t, py = p0.y + (p1.y - p0.y) * t;
      const z = Math.max(50, Math.min(height - 50, Number(u.z) || 1000));
      const dx = (p1.x - p0.x) / len, dy = (p1.y - p0.y) / len;
      const along = new THREE.Vector3(dx, dy, 0);
      const up = new THREE.Vector3(0, 0, 1);
      const normal = new THREE.Vector3(dy, -dx, 0);
      let m3;
      if (u.type === 'outlet') {
        // rozetka: devor yuzasiga qaragan plastina (70×70, qalinlik 22)
        m3 = new THREE.Mesh(new THREE.BoxGeometry(70, 70, 22), matUtil);
        m3.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, up, normal));
      } else {
        // quvur: devor qalinligi bo'ylab silindr (ikki tomondan chiqadi)
        m3 = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, thick + 80, 16), matUtil);
        m3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      }
      m3.position.set(px, py, z);
      m3.userData = { kind: 'util', type: u.type || 'pipe' };
      gWalls3D.add(m3);
      // 2D reja belgisi — devor ustida (z = devor balandligidan yuqori)
      const g2 = new THREE.Mesh(new THREE.CircleGeometry(u.type === 'outlet' ? 55 : 40, 20), matUtil);
      g2.position.set(px, py, height + 60);
      g2.userData = m3.userData;
      gWalls2D.add(g2);
    }

    const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), matFloor);
    floor.position.set(0, 0, -2);                  // devor ostida, z=0 dan pastda
    gFloor.add(floor);
    return count;
  }

  /* ── To'r: 100 mm (nozik) / 500 mm (qalin) ─────────────────────────── */
  function buildGrid(b) {
    clearGroup(gGrid);
    const pad = 1000;
    const x0 = Math.floor((b.minX - pad) / 500) * 500, x1 = Math.ceil((b.maxX + pad) / 500) * 500;
    const y0 = Math.floor((b.minY - pad) / 500) * 500, y1 = Math.ceil((b.maxY + pad) / 500) * 500;
    const minor = [], major = [];
    for (let x = x0; x <= x1; x += 100) (x % 500 === 0 ? major : minor).push(x, b.minY - pad, 0, x, b.maxY + pad, 0);
    for (let y = y0; y <= y1; y += 100) (y % 500 === 0 ? major : minor).push(b.minX - pad, y, 0, b.maxX + pad, y, 0);
    gGrid.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(minor, 3)),
      matGridMinor));
    gGrid.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(major, 3)),
      matGridMajor));
  }

  function bboxFrom(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 4200, maxY: 3100, w: 4200, h: 3100, cx: 2100, cy: 1550 };
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }

  let bbox = bboxFrom([{ x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 3100 }, { x: 0, y: 3100 }]);
  let wallH = 2700;

  /* ── Kamerani sig'dirish (B4: 2D frustum = bbox + 20%) ─────────────── */
  /* Ekranning tepasidagi `insetTop` px sahna tugmalari (#viewCtl) bilan band —
     xona shu tasmadan pastdagi qismga sig'diriladi (past ekranli telefonda tugmalar
     devorni yopmasin). Ekran balandligining 30% idan ko'p olinmaydi. */
  const insetTop = Math.max(0, Number(opts.insetTop) || 0);
  function fit2D() {
    const W = container.clientWidth || 1, H = container.clientHeight || 1;
    const top = Math.min(insetTop, H * 0.3);
    const needW = Math.max(bbox.w * 1.2, 1000);
    const needH = Math.max(bbox.h * 1.2, 1000);
    const mmPerPx = Math.max(needW / W, needH / (H - top));
    const vw = W * mmPerPx, vh = H * mmPerPx;
    cam2d.left = bbox.cx - vw / 2;
    cam2d.right = bbox.cx + vw / 2;
    cam2d.top = bbox.cy + (top + (H - top) / 2) * mmPerPx;   // bbox markazi — bo'sh qism markazida
    cam2d.bottom = cam2d.top - vh;
    /* MUHIM: orto kameraning ko'rish oynasi (left/right/top/bottom) KAMERA
       POSITSIYASIGA NISBATAN o'lchanadi. Agar frustum already chizma
       markaziga (cx,cy) qarab markazlangan bo'lsa, kamera ham (cx,cy) da
       bo'lsa — xona IKKI MARTA siljib chiziladi. Shuning uchun 2D kamera
       o'zini (0,0) da tutamiz: butun ko'rish oynasi absolyut (world mm). */
    cam2d.position.set(0, 0, 8000);
    cam2d.updateProjectionMatrix();
  }

  function fit3D() {
    if (TH && TH.cam3d) {
      const v = TH.cam3d(bbox, wallH);
      const d = Math.max(bbox.w, bbox.h) * 1.5 + 1200;
      cam3d.near = Math.max(10, d / 200); cam3d.far = d * 15;
      cam3d.position.set(v.pos[0], v.pos[1], v.pos[2]);
      cam3d.lookAt(v.target[0], v.target[1], v.target[2]);
      cam3d.updateProjectionMatrix();
      return;
    }
    const d = Math.max(bbox.w, bbox.h) * 1.5 + 1200;
    cam3d.near = Math.max(10, d / 100);
    cam3d.far = d * 15;
    cam3d.position.set(bbox.cx + d * 0.5, bbox.cy - d * 0.7, d * 0.5);
    cam3d.lookAt(bbox.cx, bbox.cy, 0);
    cam3d.updateProjectionMatrix();
  }

  /* ── Rejim almashuvi: kamera + ko'rinuv, QAYTA QURILMAYDI (M-4a) ──── */
  let lastToggleMs = 0;
  function applyMode(next) {
    const t0 = performance.now();
    mode = next === '3d' ? '3d' : '2d';

    gWalls2D.visible = mode === '2d';
    gWalls3D.visible = mode === '3d';
    gGrid.visible = TH ? mode === '2d' : true;

    if (mode === '2d') { fit2D(); active = cam2d; }
    else {
      fit3D();
      if (orto && cam3o) { ortoMos(cam3d.position.distanceTo(api._controls ? api._controls.target : new THREE.Vector3(bbox.cx, bbox.cy, 0))); active = cam3o; }
      else active = cam3d;
      if (api._controls) { api._controls.enabled = true; }
    }

    lastToggleMs = performance.now() - t0;
    api._invalidate();
    emit('toggle', { mode: mode, ms: lastToggleMs });
    return lastToggleMs;
  }

  /* orto kamera: perspektiva kamerasining joyi va yo'nalishi, ko'rinish o'lchami — nishongacha masofa bo'yicha */
  function ortoMos(dist) {
    if (!cam3o) return;
    const W = Math.max(container.clientWidth, 1), H = Math.max(container.clientHeight, 1);
    const hh = Math.max(150, dist * Math.tan(THREE.MathUtils.degToRad(cam3d.fov / 2)));
    cam3o.position.copy(cam3d.position); cam3o.quaternion.copy(cam3d.quaternion);
    cam3o.top = hh; cam3o.bottom = -hh; cam3o.left = -hh * W / H; cam3o.right = hh * W / H;
    cam3o.near = -300000; cam3o.far = 300000; cam3o.zoom = 1;
    cam3o.updateProjectionMatrix();
  }

  /* ── Hajam ─────────────────────────────────────────────────────────── */
  function resize() {
    const w = Math.max(container.clientWidth, 1), h = Math.max(container.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);          // brauzer masshtabi o'zgarsa yangilanadi
    if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    cam3d.aspect = w / h;
    cam3d.updateProjectionMatrix();
    if (cam3o) { const hh = (cam3o.top - cam3o.bottom) / 2; cam3o.left = -hh * w / h; cam3o.right = hh * w / h; cam3o.updateProjectionMatrix(); }
    if (mode === '2d') fit2D();
    if (labelRenderer) labelRenderer.setSize(w, h);
    api._invalidate();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);
  window.addEventListener('resize', resize);     // brauzer masshtabi (Ctrl +/−) resize hodisasini ham beradi
  /* masshtab (dpr) o'zgarishi — konteyner o'lchami o'zgarmasligi mumkin, shuning uchun alohida kuzatamiz */
  (function dprKuzat() {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const on = () => { resize(); dprKuzat(); };
    mq.addEventListener ? mq.addEventListener('change', on, { once: true }) : mq.addListener(on);
  })();

  /* ── Render (ixtiyoriy uzluksiz sikl — drag paytida 60 fps) ───────── */
  let needsRender = true;
  let rafId = 0;
  const _v = new THREE.Vector3();
  function cullWalls() {
    if (!TH || mode !== '3d') return;
    for (const w of gWalls3D.children) {
      const u = w.userData;
      if (!u || !u.out) continue;
      _v.copy(cam3d.position).sub(u.mid); _v.z = 0;
      w.visible = _v.dot(u.out) <= 0;          // kamera devorning tashqarisida — devor ko'rinmaydi
    }
  }
  function render() { if (renderer.getPixelRatio() !== Math.min(window.devicePixelRatio || 1, 2)) resize(); cullWalls(); anisoQo(); renderer.render(scene, active); labelRenderer.render(scene, active); if (listeners.render) emit('render'); }
  /* XR (VR) rejimida setAnimationLoop SHART — rAF o'rniga */
  function loop() {
    if (listeners.frame) emit('frame');           // TZ-09: animatsiya (eshik ochilishi) — har kadr
    if (api._controls && api._controls.update) api._controls.update();
    if (needsRender || renderer.xr.isPresenting) { needsRender = false; render(); }
  }

  /* ── Hodisalar ─────────────────────────────────────────────────────── */
  const listeners = {};
  function emit(evt, payload) { (listeners[evt] || []).forEach(fn => { try { fn(payload); } catch (e) { /* jim */ } }); }

  /* ── Tashqi API ────────────────────────────────────────────────────── */
  const api = {
    THREE, scene, renderer, labelRenderer, container,
    theme: TH,
    groups: { grid: gGrid, floor: gFloor, walls2d: gWalls2D, walls3d: gWalls3D, items: gItems, labels: gLabels },
    get camera() { return active; },
    get cam2d() { return cam2d; },
    get cam3d() { return cam3d; },
    get cam3o() { return cam3o; },
    get orto() { return orto; },
    /** TZ-23: 3D da ortografik kamera (on) yoki perspektiva; nishon — orbit markazi. Qaytaradi — endi faol 3D kamera */
    setOrto(on, target) {
      orto = !!on;
      if (orto && !cam3o) { cam3o = new THREE.OrthographicCamera(-1, 1, 1, -1, -300000, 300000); cam3o.up.set(0, 0, 1); }
      if (orto) ortoMos(target ? cam3d.position.distanceTo(target) : 5000);
      if (mode === '3d') active = orto ? cam3o : cam3d;
      api._invalidate();
      return orto ? cam3o : cam3d;
    },
    get mode() { return mode; },
    get bbox() { return bbox; },
    /** 3D aylanish markazi (mavzu bo'lsa — uning ko'rinishi) */
    camTarget() { return TH && TH.cam3d ? TH.cam3d(bbox, wallH).target : [bbox.cx, bbox.cy, 0]; },
    get lastToggleMs() { return lastToggleMs; },

    setMode: m => applyMode(m),
    toggle: () => applyMode(mode === '2d' ? '3d' : '2d'),
    getMode: () => mode,

    /** Chizmani yangilaydi: devorlar + to'r + pol + kamera. o.kamera === false — 2D kamera joyida qoladi (TZ-25: devor tahriri) */
    setDoc(next, o = {}) {
      const d = next || {};
      api._doc = d;                       // getDoc() shundan o'qiydi
      const room = d.room || DEFAULT_ROOM;
      const pts = (Array.isArray(room.outline) && room.outline.length >= 3
        ? room.outline : DEFAULT_ROOM.outline)
        .map(p => ({ x: Number(p[0]) || 0, y: Number(p[1]) || 0 }));
      const walls = buildWalls(room);
      bbox = bboxFrom(pts);
      wallH = Number(room.wall_height) || 2700;
      if (themeLights && themeLights.update) themeLights.update(bbox, wallH);
      buildGrid(bbox);
      /* kamera joyida qolsa ham — xona ko'rinishdan chiqib ketsa, sig'diriladi */
      const korinadi = bbox.minX >= cam2d.left && bbox.maxX <= cam2d.right && bbox.minY >= cam2d.bottom && bbox.maxY <= cam2d.top;
      if (mode === '2d' && (o.kamera !== false || !korinadi)) fit2D();
      api._invalidate();
      emit('doc', { walls: walls, bbox: bbox });
      return { walls: walls, bbox: bbox };
    },
    getDoc: () => api._doc,

    /** 2D: sxma atrofidagi nuqtaga zoom (B4 — frustum mm'da). */
    zoomAt(factor, px, py) {
      if (mode === '2d') {
        /* chegara: ko'rinish eni 400 mm (yaqin) … xonaning 8 baravari (uzoq) */
        const curW = cam2d.right - cam2d.left;
        const maxW = Math.max(bbox.w, bbox.h) * 8 + 4000;
        factor = Math.max(curW / maxW, Math.min(factor, curW / 400));
        if (!isFinite(factor) || factor <= 0) return false;
        const rect = renderer.domElement.getBoundingClientRect();
        const fx = rect.width ? (px - rect.left) / rect.width : 0.5;
        const fy = rect.height ? (py - rect.top) / rect.height : 0.5;
        const cx = cam2d.left + fx * (cam2d.right - cam2d.left);
        const cy = cam2d.top - fy * (cam2d.top - cam2d.bottom);
        const w = (cam2d.right - cam2d.left) / factor;
        const h = (cam2d.top - cam2d.bottom) / factor;
        cam2d.left = cx - fx * w;
        cam2d.right = cx + (1 - fx) * w;
        cam2d.top = cy + (1 - fy) * h;
        cam2d.bottom = cy - fy * h;
        cam2d.updateProjectionMatrix();
        api._invalidate();
      } else if (api._controls && api._controls.dollyIn) {
        api._controls.dollyIn(api._controls.target);   // OrbitControls halqasi
      }
      return true;
    },

    /** 2D: ko'chirish (pan) — px,py ekran nuqtasi, dx,dy siljish. */
    panBy(dx, dy) {
      if (mode !== '2d') return false;
      const rect = renderer.domElement.getBoundingClientRect();
      const mmPerPx = (cam2d.right - cam2d.left) / (rect.width || 1);
      cam2d.left -= dx * mmPerPx; cam2d.right -= dx * mmPerPx;
      cam2d.top += dy * mmPerPx; cam2d.bottom += dy * mmPerPx;
      cam2d.updateProjectionMatrix();
      api._invalidate();
      return true;
    },

    fit() { if (mode === '2d') fit2D(); else fit3D(); api._invalidate(); },

    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },

    /* ichki ishlatiladi (sp-controls) */
    _controls: null,
    _invalidate() { needsRender = true; if (!rafId) render(); },
    _render: render,
    _startLoop() { if (!rafId) { rafId = 1; renderer.setAnimationLoop(loop); } },
    _stopLoop() { if (rafId) { renderer.setAnimationLoop(null); rafId = 0; } },
    _resize: resize,

    /* QA (F6): GPU'dagi geometry/textures soni — qayta qurishda o'smasligi kerak */
    _aniso: () => ANISO,
    _info: () => ({
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures
    }),

    dispose() {
      api._stopLoop();
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(m => m.dispose());
      });
      renderer.dispose();
      [renderer.domElement, labelRenderer.domElement].forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }
  };

  /* boshlang'ich holat */
  api.setDoc(opts.doc || { v: 1, room: DEFAULT_ROOM, placements: [], layers: [] });
  applyMode(opts.mode === '3d' ? '3d' : '2d');
  resize();
  render();
  return api;
}