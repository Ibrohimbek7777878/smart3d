/* Smart3D js/items.js — Joylashtirilgan mebellar (mesh) + tanlash + sudrab.
 *
 * sp-scene (devor/to'r/kamera) + sp-materials (haqiqiy panellar guruhi) ustiga qurilgan:
 * placements → panellar majmuasi guruhi, raycast tanlash, 2D sudrab ko'chirish,
 * xotira tozalash (leak-free disposal).
 */
import * as THREE from 'three';
import { makeItemMesh } from './materials3d.js';

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

export function createItems(sp, opts = {}) {
  const group = sp.groups.items;
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
      });
    }
    meshes.length = 0;

    for (const p of placements || []) {
      const frag = catalog[p.frg];
      if (!frag) continue;
      const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
      const rot = ((+p.rot || 0) % 360 + 360) % 360;
      const mesh = makeItemMesh(THREE, frag, w, d, h);

      // Agar oddiy mesh bo'lsa geometriyani siljitadi (Group allaqachon markazlashgan)
      if (mesh.geometry && mesh.geometry.translate) {
        mesh.geometry.translate(-w / 2, -h / 2, -d / 2);
        if (mesh.userData.edges && mesh.userData.edges.geometry) {
          mesh.userData.edges.geometry.translate(-w / 2, -h / 2, -d / 2);
        }
      }

      const rad = rot * Math.PI / 180;
      const cx = (+p.x) + (w / 2) * Math.cos(rad) - (d / 2) * Math.sin(rad);
      const cy = (+p.y) + (w / 2) * Math.sin(rad) + (d / 2) * Math.cos(rad);
      mesh.position.set(cx, cy, (+p.z || 0) + h / 2);
      mesh.rotation.z = rad;
      mesh.userData = Object.assign({}, mesh.userData, {
        id: p.id, frg: p.frg, w, d, h, rot, x: +p.x, y: +p.y, z: +p.z || 0
      });

      if (p.id === selectedId) applySel(mesh, true);
      group.add(mesh);
      meshes.push(mesh);
    }
    sp._invalidate();
  }

  function select(id) {
    selectedId = id;
    for (const m of meshes) applySel(m, m.userData.id === id);
    sp._invalidate();
    opts.onSelect && opts.onSelect(id, meshes.find(m => m.userData.id === id) || null);
  }
  function getSelected() { return selectedId; }

  /* ── Raycast ────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();

  function pick(e) {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ptr, sp.camera);
    const hits = ray.intersectObjects(meshes, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && obj.parent && obj.parent !== group && !meshes.includes(obj)) {
      obj = obj.parent;
    }
    return obj;
  }

  /* ── 2D: sudrab ko'chirish (snap 50 mm) ─────────────────────────── */
  let drag = null;
  const SNAP = 50;
  const snap = (v) => Math.round(v / SNAP) * SNAP;

  function worldPerPx() {
    const rect = sp.renderer.domElement.getBoundingClientRect();
    return (sp.cam2d.right - sp.cam2d.left) / (rect.width || 1);
  }

  function onDown(e) {
    if (e.button !== 0) return;
    const m = pick(e);
    if (!m) { if (selectedId !== null) select(null); return; }
    select(m.userData.id);
    if (sp.mode === '2d') {
      drag = { id: m.userData.id, sx: e.clientX, sy: e.clientY, ox: m.userData.x, oy: m.userData.y, moved: false };
      sp.renderer.domElement.setPointerCapture && sp.renderer.domElement.setPointerCapture(e.pointerId);
    }
  }
  function onMove(e) {
    if (!drag) return;
    const k = worldPerPx();
    const dx = (e.clientX - drag.sx) * k;
    const dy = -(e.clientY - drag.sy) * k;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    const m = meshes.find(x => x.userData.id === drag.id);
    if (!m) return;
    const nx = snap(drag.ox + dx), ny = snap(drag.oy + dy);
    opts.onDrag && opts.onDrag(drag.id, nx, ny);
  }
  function onUp(e) {
    drag = null;
    try { sp.renderer.domElement.releasePointerCapture && sp.renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  const el = sp.renderer.domElement;
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return {
    setPlacements, select, getSelected, meshes,
    refresh: () => setPlacements(opts.getPlacements(), catalog),
    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
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
