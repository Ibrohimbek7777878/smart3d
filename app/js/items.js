/* Smart3D js/items.js — Joylashtirilgan mebellar (mesh) + tanlash + sudrab.
 *
 * sp-scene (devor/to'r/kamera) + sp-materials (haqiqiy panellar guruhi) ustiga qurilgan:
 * placements → panellar majmuasi guruhi, raycast tanlash, 2D sudrab ko'chirish,
 * xotira tozalash (leak-free disposal).
 */
import * as THREE from 'three';
import { CSS2DObject } from '../vendor/three/addons/renderers/CSS2DRenderer.js';
import { makeItemMesh } from './materials3d.js';
import { eshikBurchaklari } from './engine/konstruktor/eshik.js';

const SEL_EDGE = 0xd97706, EDGE = 0x8a8072;

function applySel(mesh, on) {
  if (!mesh) return;
  const col = on ? SEL_EDGE : EDGE;
  if (mesh.userData && mesh.userData.edges) {
    mesh.userData.edges.material.color.setHex(col);
  }
  mesh.traverse(child => {
    if (child.isLineSegments && child.material) {
      child.material.color.setHex(col);
    }
  });
}

/** Mesh'ni (x, y) burchak nuqtasiga qo'yadi — userData: w, d, h, rot, z. */
function placeMesh(mesh, x, y) {
  const u = mesh.userData;
  const rad = u.rot * Math.PI / 180;
  mesh.position.set(
    x + (u.w / 2) * Math.cos(rad) - (u.d / 2) * Math.sin(rad),
    y + (u.w / 2) * Math.sin(rad) + (u.d / 2) * Math.cos(rad),
    u.z + u.h / 2
  );
  mesh.rotation.z = rad;
  u.x = x; u.y = y;
}

export function createItems(sp, opts = {}) {
  const group = sp.groups.items;
  /* TZ-09: dizayn mavzusi (yangi frontend) — opts.theme bo'lsa: mavzu materiallari, to'q sariq tanlov ramkasi,
     cyan o'lcham yorliqlari, eshik ochilishi, detal tanlash. Berilmasa — hammasi avvalgidek. */
  const TH = opts.theme || null;
  const open = {};                    // 'modulId:eshikId' → 1 (ochiq)
  let doorMax = {};                   // 'modulId:eshikId' → xavfsiz ochilish burchagi (radian, TZ-22)
  const openV = {};                   // joriy ochilish 0..1 (silliq)
  let focus = null;                   // { id, part } — detal kartasi
  let catalog = {};
  let selectedId = null;
  const meshes = [];

  /** placements → mesh'lar (xotirani to'liq tozalash bilan). */
  function setPlacements(placements, cat) {
    if (cat) catalog = cat;
    for (const m of meshes) {
      group.remove(m);
      m.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
          else child.material.dispose();
        }
        if (child.element && child.element.remove) child.element.remove();   // TZ-09: CSS2D yorliq (tanlov o'lchami)
      });
    }
    meshes.length = 0;

    for (const p of placements || []) {
      const frag = catalog[p.frg];
      if (!frag) continue;
      const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
      const rot = ((+p.rot || 0) % 360 + 360) % 360;
      const mesh = makeItemMesh(THREE, frag, w, d, h, TH ? { theme: TH, hinge: p.hinge, rang: p._rang, ruchkasiz: !!p.ruchkasiz } : { ruchkasiz: !!p.ruchkasiz });   // egasi #166: Gola — ruchkasiz   // TZ-23 E: tanlangan material dekori

      // Agar oddiy mesh bo'lsa geometriyani siljitadi (Group allaqachon markazlashgan)
      if (mesh.geometry && mesh.geometry.translate) {
        mesh.geometry.translate(-w / 2, -h / 2, -d / 2);
        if (mesh.userData.edges && mesh.userData.edges.geometry) {
          mesh.userData.edges.geometry.translate(-w / 2, -h / 2, -d / 2);
        }
      }

      mesh.userData = Object.assign({}, mesh.userData, {
        id: p.id, frg: p.frg, w, d, h, rot, z: +p.z || 0, auto: !!p.auto
      });
      placeMesh(mesh, +p.x, +p.y);

      /* F2: moyka belgisi — stoleshnitsa yuzasida quyuq quti (ichki kesim vizuali) */
      if (p.moyka) {
        const mk = p.moyka;
        const sink = new THREE.Mesh(
          new THREE.BoxGeometry(mk.size, mk.size, 26),
          new THREE.MeshBasicMaterial({ color: 0x1e293b }));
        const bl = mk.backLocal || 1;   // devor tomoni (lokal +y/-1)
        sink.position.set(
          -w / 2 + mk.offset + mk.size / 2,
          bl * (d / 2 - mk.fromBack - mk.size / 2),
          h / 2 - 9);
        sink.userData = { kind: 'moyka' };
        mesh.add(sink);
      }

      if (p.id === selectedId) (TH ? themeSel(mesh, true) : applySel(mesh, true));
      group.add(mesh);
      meshes.push(mesh);
    }
    /* TZ-22: har eshikning xavfsiz ochilish burchagi — devor, mebel, tutqich va qo'shni eshikka tegmaydi (100° → 90° …) */
    if (TH) {
      try { doorMax = eshikBurchaklari(placements || [], catalog, opts.getRoom ? opts.getRoom() : null); } catch (e) { doorMax = {}; }
      applyMovers(true); applyFocus();
    }
    updateHandle();
    sp._invalidate();
  }

  /** source: 'scene' — foydalanuvchi sahnada bosdi; aks holda dasturdan (katalog, nusxa…) */
  function select(id, source) {
    selectedId = id;
    if (TH && focus && focus.id !== id) { focus = null; applyFocus(); }
    for (const m of meshes) (TH ? themeSel(m, m.userData.id === id) : applySel(m, m.userData.id === id));
    updateHandle();
    sp._invalidate();
    opts.onSelect && opts.onSelect(id, meshes.find(m => m.userData.id === id) || null, source);
  }
  function getSelected() { return selectedId; }

  /* ── Raycast ────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();

  /** → { obj (mebel), point (birinchi tegish nuqtasi) } | null */
  function pickHit(e) {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ptr, sp.camera);
    /* F2: synthetic (auto) meshlar tanlanmaydi/sudralmaydi — pastki mebel
       stoleshnitsa ostida ham bosib tanlansa bo'ladi */
    const hits = ray.intersectObjects(meshes.filter(m => !(m.userData && m.userData.auto)), true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && obj.parent && obj.parent !== group && !meshes.includes(obj)) {
      obj = obj.parent;
    }
    return { obj, point: hits[0].point.clone() };
  }
  function pick(e) { const h = pickHit(e); return h ? h.obj : null; }

  /* ── Tanlash va sudrash (snap 50 mm) ──────────────────────────
   * · 2D: mebelni bosish — darhol tanlanadi va sudraladi;
   * · 3D (egasi #151): mebel USTIDA bosib tortish — mebel pol bo'ylab suriladi (kamera aylanmaydi), bo'sh joyda — aylantirish;
   *   sichqoncha — darhol (6 px siljigach), barmoq/qalam — ~300 ms ushlab turgach (oldin siljisa — kamera aylanadi);
   *   tegish (siljimasdan qo'yib yuborish) — avvalgidek tanlash / detal kartasi;
   * · bo'sh joyga TEGISH tanlovni bekor qiladi (pan/pinch bekor qilmaydi — controls.js);
   * · ikkinchi barmoq tushsa sudrash to'xtaydi (pinch-zoom controls.js da); Esc — mebel joyiga qaytadi;
   * · opts.surish3d — 3D surish yoqilgan (yangi sayt: services/sahna.js);
   * · opts.cheklov(id) → (x, y) => {x, y} | null — devorga yopishish, devor/qo'shni mebelga kirmaslik (null — joyida qoladi);
   *   balandlik (z) o'zgarmaydi — ustki modul ustki qatorda qoladi. */
  let drag = null, tap = null;
  const SNAP = 50, TAP_PX = 6, USHLASH_MS = 300;
  const snap = (v) => Math.round(v / SNAP) * SNAP;
  const _v = new THREE.Vector3();

  function worldPerPx() {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    return (sp.cam2d.right - sp.cam2d.left) / (rect.width || 1);
  }
  /** 3D: ekran nuqtasidan gorizontal tekislikka (mebel ushlangan balandlikda) — dunyo nuqtasi */
  function tekislikda(e, plane) {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ptr, sp.camera);
    return ray.ray.intersectPlane(plane, _v) ? _v.clone() : null;
  }
  /** 3D surish — faqat yangi saytda (opts.surish3d; eski app.js da 3D avvalgidek) va orbit kamerada (yurish rejimida sudrash — qarash) */
  const surish3d = () => sp.mode === '3d' && !!sp._controls && !!opts.surish3d;
  function orbitTiq(on) {
    const o = sp._controls;
    if (!o || !drag) return;
    if (!on) { if (drag.orbit == null) drag.orbit = o.enabled; o.enabled = false; }
    else if (drag.orbit != null) { o.enabled = drag.orbit && sp.mode === '3d'; drag.orbit = null; }
  }
  /** sudrash boshlandi (tanlash, cheklov) */
  function faollash() {
    if (!drag || drag.faol) return;
    drag.faol = true;
    drag.ch = opts.cheklov ? opts.cheklov(drag.id) : null;
    if (!drag.d3 || selectedId !== drag.id) select(drag.id, 'scene');   // 2D — avvalgidek har bosishda
    if (drag.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (_) { /* yo'q */ } }
  }
  /** yangi joy: setka → cheklov; o'zgarsa mesh siljiydi va opts.onDrag */
  function joyla(nx, ny) {
    if (drag.ch) { const r = drag.ch(nx, ny); if (!r) return; nx = r.x; ny = r.y; }
    if (nx === drag.lx && ny === drag.ly) return;
    const m = meshes.find(x => x.userData.id === drag.id);
    if (!m) return;
    drag.lx = nx; drag.ly = ny;
    placeMesh(m, nx, ny);              // faqat shu mesh — butun sahna qayta qurilmaydi
    updateHandle();
    sp._invalidate();
    opts.onDrag && opts.onDrag(drag.id, nx, ny);
  }
  /** sudrashni tugatish: qaytar — Esc (asl joyiga) */
  function tugat(qaytar) {
    if (!drag) return;
    const d = drag;
    clearTimeout(d.timer);
    if (qaytar && d.faol && (d.lx !== d.ox || d.ly !== d.oy)) {
      const m = meshes.find(x => x.userData.id === d.id);
      if (m) { placeMesh(m, d.ox, d.oy); updateHandle(); sp._invalidate(); }
      opts.onDrag && opts.onDrag(d.id, d.ox, d.oy);
    }
    orbitTiq(true);
    try { sp.renderer.domElement.releasePointerCapture && sp.renderer.domElement.releasePointerCapture(d.pointerId); } catch (_) {}
    drag = null;
    if (d.faol) opts.onDragEnd && opts.onDragEnd(d.id, qaytar ? 'bekor' : (d.lx !== d.ox || d.ly !== d.oy ? 'surildi' : 'joyida'));
  }

  function onDown(e) {
    if (!e.isPrimary || sp.asbob) { tugat(false); tap = null; return; }   // TZ-25: devor yoki teshik chizilmoqda
    if (e.button !== 0) return;
    if (drag) tugat(false);
    const h = pickHit(e), m = h && h.obj;
    tap = { x: e.clientX, y: e.clientY, id: m ? m.userData.id : null };
    if (!m) return;
    const u = m.userData;
    if (sp.mode === '2d') {
      drag = { id: u.id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: u.x, oy: u.y, lx: u.x, ly: u.y, d3: false, faol: false };
      faollash();
    } else if (surish3d()) {
      drag = { id: u.id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: u.x, oy: u.y, lx: u.x, ly: u.y, d3: true, faol: false,
               touch: e.pointerType !== 'mouse', plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -h.point.z), p0: h.point.clone() };
      if (!drag.touch) orbitTiq(false);                              // sichqoncha: mebel ustida kamera aylanmaydi
      else drag.timer = setTimeout(() => { if (drag && !drag.faol) { orbitTiq(false); faollash(); } }, USHLASH_MS);
    } else return;
    try { sp.renderer.domElement.setPointerCapture && sp.renderer.domElement.setPointerCapture(e.pointerId); } catch (_) { /* sintetik pointer */ }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.d3) {
      const k = worldPerPx();
      joyla(snap(drag.ox + (e.clientX - drag.sx) * k), snap(drag.oy - (e.clientY - drag.sy) * k));
      return;
    }
    if (!drag.faol) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < TAP_PX) return;
      if (drag.touch) { tugat(false); return; }                      // ushlamasdan siljidi — kamera aylanadi (OrbitControls)
      faollash();
    }
    const q = tekislikda(e, drag.plane);
    if (!q) return;
    joyla(snap(drag.ox + q.x - drag.p0.x), snap(drag.oy + q.y - drag.p0.y));
  }
  function onUp(e) {
    if (tap && e.isPrimary && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_PX) {
      if (TH && opts.onTap && sp.mode !== '2d') { const h = pickPart(e); opts.onTap(h ? h.id : null, h ? h.part : null); }
      else if (tap.id === null) { if (selectedId !== null) select(null, 'scene'); }
      else if (sp.mode !== '2d') select(tap.id, 'scene');
    }
    tap = null;
    if (drag && e.pointerId === drag.pointerId) tugat(false);
    else try { sp.renderer.domElement.releasePointerCapture && sp.renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function onKey(e) {
    if (e.key !== 'Escape' || !drag || !drag.faol) return;
    e.preventDefault(); e.stopImmediatePropagation();               // Esc — faqat surishni bekor qiladi (tanlov va panel joyida)
    tap = null;
    tugat(true);
  }
  window.addEventListener('keydown', onKey, true);

  /* ── TZ-08: burish dastagi (qoida 6.2 — ishora asosiy, "⟳ 90°" tugmasi zaxira) ─────────
   * Tanlangan mebel yonida (2D) HTML dastak — CSS2D, har chizishda o'zi joylashadi, ekranda
   * doim 44 px (barmoq uchun). Sudralganda mebel MARKAZI atrofida buriladi: 15° qadam,
   * Shift bosilsa — erkin. Bosish dastakning o'ziga tushadi — sahna sudrash/kamera bilan
   * to'qnashmaydi. Ikki barmoqli burish yo'q: u pinch-zoom bilan to'qnashadi. */
  const HANDLE_GAP = 220;                     // mm — mebel chetidan dastakkacha
  const hEl = document.createElement('div');
  hEl.className = 'rot-handle';
  hEl.title = "Burish — sudrang (Shift: erkin burchak)";
  hEl.setAttribute('aria-label', 'Mebelni burish');
  hEl.textContent = '⟳';
  const handle = new CSS2DObject(hEl);
  handle.visible = false;
  sp.scene ? sp.scene.add(handle) : group.add(handle);
  let rot = null;

  function selMesh() { return meshes.find(m => m.userData.id === selectedId && !m.userData.auto) || null; }
  function updateHandle() {
    const m = selMesh();
    const on = !!m && sp.mode === '2d';
    handle.visible = on;
    hEl.style.display = on ? '' : 'none';
    if (!on) return;
    const u = m.userData, r = u.rot * Math.PI / 180;
    const R = Math.max(u.w, u.d) / 2 + HANDLE_GAP;
    /* old tomonda (lokal +y — xona ichi; orqa tomoni devorga qaragan) */
    handle.position.set(m.position.x - R * Math.sin(r), m.position.y + R * Math.cos(r), u.z + u.h + 10);
  }
  function screenToWorld(cx, cy) {
    const rect = sp.renderer.domElement.getBoundingClientRect(), c = sp.cam2d;
    return { x: c.left + (cx - rect.left) / rect.width * (c.right - c.left),
             y: c.top - (cy - rect.top) / rect.height * (c.top - c.bottom) };
  }
  function onRotDown(e) {
    const m = selMesh();
    if (!m || sp.mode !== '2d') return;
    e.preventDefault(); e.stopPropagation();
    rot = { id: m.userData.id, pointerId: e.pointerId, cx: m.position.x, cy: m.position.y };
    hEl.setPointerCapture && hEl.setPointerCapture(e.pointerId);
    hEl.classList.add('is-active');
  }
  function onRotMove(e) {
    if (!rot || e.pointerId !== rot.pointerId) return;
    e.preventDefault();
    const m = meshes.find(x => x.userData.id === rot.id);
    if (!m) return;
    const w = screenToWorld(e.clientX, e.clientY);
    let deg = Math.atan2(w.y - rot.cy, w.x - rot.cx) * 180 / Math.PI - 90;   // dastak — mebelning lokal +y (old) tomonida
    if (!e.shiftKey) deg = Math.round(deg / 15) * 15;
    deg = Math.round(((deg % 360) + 360) % 360);
    const u = m.userData;
    if (deg === u.rot) return;
    const r = deg * Math.PI / 180;
    /* markaz joyida qoladi: burchak nuqtasi (x, y) qayta hisoblanadi */
    const ax = Math.round(rot.cx - ((u.w / 2) * Math.cos(r) - (u.d / 2) * Math.sin(r)));
    const ay = Math.round(rot.cy - ((u.w / 2) * Math.sin(r) + (u.d / 2) * Math.cos(r)));
    u.rot = deg;
    placeMesh(m, ax, ay);
    updateHandle();
    sp._invalidate();
    opts.onRotate && opts.onRotate(rot.id, deg, ax, ay);
  }
  function onRotUp(e) {
    if (!rot || e.pointerId !== rot.pointerId) return;
    try { hEl.releasePointerCapture && hEl.releasePointerCapture(e.pointerId); } catch (_) {}
    hEl.classList.remove('is-active');
    const id = rot.id;
    rot = null;
    opts.onRotateEnd && opts.onRotateEnd(id);
  }
  hEl.addEventListener('pointerdown', onRotDown);
  hEl.addEventListener('pointermove', onRotMove);
  hEl.addEventListener('pointerup', onRotUp);
  hEl.addEventListener('pointercancel', onRotUp);
  sp.on && sp.on('toggle', () => { updateHandle(); sp._invalidate(); });

  const el = sp.renderer.domElement;
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  /* ── TZ-09 mavzu: tanlov ramkasi va o'lcham yorliqlari (dizayn: Box3Helper 0xFF7A45 + cyan yorliq) ── */
  function dimLabel(text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'pointer-events:none;font-size:13px;font-weight:700;color:#5FE1C4;padding:3px 8px;border-radius:8px;' +
      'background:rgba(15,34,41,.85);border:1px solid rgba(95,225,196,.35);font-variant-numeric:tabular-nums;white-space:nowrap';
    return new CSS2DObject(el);
  }
  function themeSel(mesh, on) {
    const u = mesh.userData;
    if (u.selBox) {
      mesh.remove(u.selBox);
      u.selBox.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); if (o.element) o.element.remove(); });
      u.selBox = null;
    }
    if (!on) return;
    const g = new THREE.Group();
    const box = new THREE.Box3(new THREE.Vector3(-u.w / 2 - 6, -u.d / 2 - 6, -u.h / 2 - 6), new THREE.Vector3(u.w / 2 + 6, u.d / 2 + 30, u.h / 2 + 6));
    g.add(new THREE.Box3Helper(box, 0xFF7A45));
    const W = dimLabel(Math.round(u.w) + ''); W.position.set(0, u.d / 2 + 40, -u.h / 2 - 40); g.add(W);
    const H = dimLabel(Math.round(u.h) + ''); H.position.set(u.w / 2 + 60, u.d / 2 + 20, 0); g.add(H);
    const D = dimLabel(Math.round(u.d) + ''); D.position.set(u.w / 2 + 60, 0, -u.h / 2 - 20); g.add(D);
    mesh.add(g);
    u.selBox = g;
  }

  /* ── eshik ochilishi (dizayn: silliq 1-exp(-dt*6), maksimal 1.75 rad) ──
   * TZ-27 (egasi #137): eshik Bazis'dagidek qiya ochiladi — eng ko'pi 45° (xavfsiz burchak kichik bo'lsa — o'sha):
   * yonma-yon modullar eshiklari bir-biriga tegmaydi, ichi ko'rinadi. */
  const OCHIQ_MAX = Math.PI / 4;
  let animating = false, lastT = 0;
  function applyMovers(instant) {
    let busy = false;
    const now = performance.now(), dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    const k = instant ? 1 : 1 - Math.exp(-dt * 6);
    for (const m of meshes) {
      for (const mv of (m.userData.movers || [])) {
        const key = m.userData.id + ':' + mv.key;
        const t = open[key] ? 1 : 0, c = openV[key] || 0;
        const n = Math.abs(t - c) < 0.001 ? t : c + (t - c) * k;
        openV[key] = n;
        if (n !== t) busy = true;
        if (mv.type === 'door') mv.obj.rotation.z = mv.sign * n * Math.min(doorMax[key] || 1.75, OCHIQ_MAX);
        else if (mv.type === 'drawer') mv.obj.position.y = n * mv.dist;   // TZ-09 Q5: tortma oldinga suriladi
      }
    }
    return busy;
  }
  if (TH) sp.on('frame', () => { if (animating) { animating = applyMovers(false); sp._invalidate(); } });
  function kick() { lastT = performance.now(); animating = true; if (sp.mode === '3d') sp._startLoop(); else { applyMovers(true); sp._invalidate(); } }
  /** modul eshiklari kalitlari (ochish/yopish uchun) */
  function moverKeys(id) {
    const out = [];
    for (const m of meshes) if (id == null || m.userData.id === id) for (const mv of (m.userData.movers || [])) out.push(m.userData.id + ':' + mv.key);
    return out;
  }
  function setOpen(keys, on) { for (const k of keys) { if (on) open[k] = 1; else delete open[k]; } kick(); }

  /* ── detal tanlash: bosilgan panel (ochilgan eshik ham) ── */
  function pickPart(e) {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ptr, sp.camera);
    const hits = ray.intersectObjects(meshes.filter(m => !(m.userData && m.userData.auto)), true)
      .filter(h => h.object.visible && !(h.object.userData && h.object.userData.kind === 'hitBox'));
    let hit = hits[0];
    if (focus) { const vis = hits.find(h => !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.5)); if (vis) hit = vis; }
    if (!hit) return null;
    let obj = hit.object, part = null;
    while (obj && !meshes.includes(obj)) { if (!part && obj.userData && obj.userData.part) part = obj.userData.part; obj = obj.parent; }
    if (!obj) return null;
    const pid = part && part.id;
    const mv = (obj.userData.movers || []).find(x => x.key === pid);
    return { id: obj.userData.id, part: part ? Object.assign({}, part, mv ? { key: obj.userData.id + ':' + mv.key } : {}) : null };
  }
  /** detal fokus: qolganlari shaffof (0.14), tanlangani yoritiladi (dizayn) */
  function applyFocus() {
    for (const m of meshes) m.traverse(o => {
      if (!o.isMesh || (o.userData && o.userData.kind === 'hitBox') || !o.material || o.material.isMeshBasicMaterial) return;
      const mat = o.material;
      if (mat.userData.base === undefined) mat.userData.base = { opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite };
      const mine = focus && m.userData.id === focus.id && o.userData.part && o.userData.part.id === focus.part;
      if (focus && !mine) { mat.transparent = true; mat.opacity = 0.14; mat.depthWrite = false; }
      else { const b = mat.userData.base; mat.transparent = b.transparent; mat.opacity = b.opacity; mat.depthWrite = b.depthWrite; }
      if (mat.emissive) { mat.emissive.setHex(mine ? 0x8a3000 : 0x000000); mat.emissiveIntensity = mine ? 0.35 : 1; }
      mat.needsUpdate = true;
    });
    sp._invalidate();
  }

  return {
    /* TZ-09 mavzu API */
    moverKeys, setOpen, isOpen: (k) => !!open[k],
    setFocus(id, partId) { focus = id && partId ? { id, part: partId } : null; applyFocus(); },
    setPlacements, select, getSelected, meshes,
    /** Ekran nuqtasida mebel bormi (controls.js: bo'sh joy = pan) */
    hitTest: (e) => !!pick(e),
    /** ekran nuqtasidagi mebel id (yoki null) — brauzer testlari */
    pickId: (e) => { const m = pick(e); return m ? m.userData.id : null; },
    /** surish davom etyaptimi (testlar va boshqa boshqaruvlar uchun) */
    get surilmoqda() { return !!(drag && drag.faol); },
    refresh: () => setPlacements(opts.getPlacements(), catalog),
    dispose() {
      hEl.removeEventListener('pointerdown', onRotDown);
      hEl.removeEventListener('pointermove', onRotMove);
      hEl.removeEventListener('pointerup', onRotUp);
      hEl.removeEventListener('pointercancel', onRotUp);
      if (handle.parent) handle.parent.remove(handle);
      hEl.remove();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey, true);
      if (drag) clearTimeout(drag.timer);
      for (const m of meshes) {
        group.remove(m);
        m.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
            else child.material.dispose();
          }
        });
      }
      meshes.length = 0;
    }
  };
}
