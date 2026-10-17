/* TZ-31 B: VR (WebXR) — sahna mm va Z-yuqori, WebXR esa metr va Y-yuqori kutadi.
 * Sessiya davomida sahna (ildiz) masshtab 0.001 va x bo'yicha -90° buriladi (Z→Y); foydalanuvchi 'local-floor' da, xona markazida,
 * pol ustida turadi. Pult: nur chizig'i + tugma. Bosish: modul → mavjud tanlash/eshik ochish (onTap), pol → teleport.
 * Sessiya tugasa — kamera, near/far, sikl, OrbitControls va ildiz transformi AYNAN avvalgidek qaytadi. */
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

const MASSHTAB = 0.001;          // mm → m
const NUR = 6;                   // nur uzunligi (m)

/** Sof hisob (tests/verify_vr.mjs ham ishlatadi): xona markazi (cx, cy mm) pol ustida (0,0,0) ga tushadigan ildiz transformi */
export function ildizHisob(cx, cy) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const pos = new THREE.Vector3(cx * MASSHTAB, cy * MASSHTAB, 0).applyQuaternion(q).negate();
  return { scale: MASSHTAB, quat: q, pos };
}

/** sp — createScene() natijasi (renderer, scene, camera, bbox, _startLoop…); o: { onTap(id, part), getItems(), ctl, setLabels(on) } */
export function createVR(sp, o = {}) {
  const xr = sp.renderer.xr, scene = sp.scene;
  xr.setReferenceSpaceType('local-floor');
  let on = false, saved = null, wrap = null;
  const ctrls = [], rc = new THREE.Raycaster(), tm = new THREE.Matrix4(), tv = new THREE.Vector3();
  const offs = [];

  const wrapYangila = () => {            // pultlar ildiz ichida — teskari matritsa bilan dunyo (metr) fazosida qoladi
    scene.updateMatrix(); wrap.matrix.copy(scene.matrix).invert(); wrap.matrixWorldNeedsUpdate = true;
  };

  function nur(c) {
    rc.ray.origin.setFromMatrixPosition(c.matrixWorld);
    tm.identity().extractRotation(c.matrixWorld);
    rc.ray.direction.set(0, 0, -1).applyMatrix4(tm).normalize();
    rc.far = 100;
    return rc;
  }

  function teleport(P) {                 // dunyoni surish: P nuqta (dunyo) foydalanuvchi ostiga keladi
    scene.position.x -= P.x; scene.position.z -= P.z;
    scene.updateMatrixWorld(true); wrapYangila();
  }

  function tanla(c) {
    if (!on) return null;
    scene.updateMatrixWorld(true);
    const r = nur(c), items = o.getItems && o.getItems();
    const h = items && items.pickPartRay ? items.pickPartRay(r) : null;
    if (h) { o.onTap && o.onTap(h.id, h.part); return { tur: 'modul', id: h.id }; }
    const pol = new THREE.Plane(new THREE.Vector3(0, 1, 0), -scene.position.y);   // pol: dunyo y = ildiz y (0 sathi)
    const P = r.ray.intersectPlane(pol, tv);
    if (P && P.distanceTo(r.ray.origin) < 30) { const nuqta = P.clone(); teleport(nuqta); return { tur: 'pol', x: nuqta.x, z: nuqta.z }; }
    return null;
  }

  function pultlar() {
    const fab = new XRControllerModelFactory();
    wrap = new THREE.Group(); wrap.name = 'vr-pult'; wrap.matrixAutoUpdate = false; scene.add(wrap);
    for (let i = 0; i < 2; i++) {
      const c = xr.getController(i), g = xr.getControllerGrip(i);
      const chiz = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -NUR)]),
        new THREE.LineBasicMaterial({ color: 0x8FD9E8 }));
      c.add(chiz); g.add(fab.createControllerModel(g));
      const fn = () => tanla(c);
      c.addEventListener('select', fn);
      offs.push(() => { c.removeEventListener('select', fn); c.remove(chiz); chiz.geometry.dispose(); chiz.material.dispose(); });
      wrap.add(c, g); ctrls.push(c);
    }
  }

  function boshla() {
    const cam = sp.camera, orbit = o.ctl && o.ctl.orbit;
    saved = {
      pos: scene.position.clone(), quat: scene.quaternion.clone(), scale: scene.scale.clone(),
      cam: { p: cam.position.clone(), q: cam.quaternion.clone(), s: cam.scale.clone(), up: cam.up.clone(), near: cam.near, far: cam.far, zoom: cam.zoom, fov: cam.fov, aspect: cam.aspect },
      orbit: orbit ? { en: orbit.enabled, t: orbit.target.clone() } : null,
      sikl: sp._loopOn ? sp._loopOn() : false, ctl: sp._controls
    };
    const h = ildizHisob(sp.bbox.cx, sp.bbox.cy);
    scene.scale.setScalar(h.scale); scene.quaternion.copy(h.quat); scene.position.copy(h.pos);
    scene.updateMatrixWorld(true);
    cam.near = 0.05; cam.far = 100; cam.updateProjectionMatrix();     // metr (sahna endi metrda)
    if (orbit) orbit.enabled = false;
    sp._controls = null;                    // sikl OrbitControls.update() ni chaqirmasin (u shlem kamerasini mm masofaga tortardi)
    o.setLabels && o.setLabels(false);
    if (!wrap) pultlar();
    wrapYangila();
    on = true;
    sp._startLoop();                                                  // XR kadrlari shart
  }

  function tugat() {
    if (!on || !saved) return;
    on = false;
    const cam = sp.camera, s = saved, orbit = o.ctl && o.ctl.orbit;
    scene.position.copy(s.pos); scene.quaternion.copy(s.quat); scene.scale.copy(s.scale); scene.updateMatrixWorld(true);
    cam.position.copy(s.cam.p); cam.quaternion.copy(s.cam.q); cam.scale.copy(s.cam.s); cam.up.copy(s.cam.up);
    cam.near = s.cam.near; cam.far = s.cam.far; cam.zoom = s.cam.zoom; cam.fov = s.cam.fov; cam.aspect = s.cam.aspect; cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    sp._controls = s.ctl;
    if (orbit && s.orbit) { orbit.target.copy(s.orbit.t); orbit.enabled = s.orbit.en; }
    o.setLabels && o.setLabels(true);
    sp._stopLoop(); sp._startLoop();                                  // XR halqasidan oddiy halqaga qayta bog'lash
    if (!s.sikl) sp._stopLoop();
    sp._resize(); sp._invalidate();
    saved = null;
  }

  xr.addEventListener('sessionstart', boshla);
  xr.addEventListener('sessionend', tugat);

  return {
    /** QA ilgagi: joriy holat (faqat o'qish) */
    holat: () => ({ on, scale: scene.scale.x, rotX: scene.rotation.x, pos: scene.position.toArray(), pult: ctrls.length, saklangan: saved ? saved.cam.p.toArray() : null }),
    tanla,
    dispose() {
      xr.removeEventListener('sessionstart', boshla); xr.removeEventListener('sessionend', tugat);
      offs.forEach(f => f()); if (wrap) scene.remove(wrap);
    }
  };
}
