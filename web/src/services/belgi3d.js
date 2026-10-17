/* egasi #167: teshik, kromka va zapchast belgilari — three.js qatlami (ma'lumot: app/js/engine/teshik3d.js, kesim ro'yxatidan).
 * Bitta funksiya uch joyda: muharrir sahnasi (rentgen; Z-up, mm, modul lokal), "Ichini ko'rish" va detal kartasi (dizayn: Y-up, metr).
 * Tezlik: har tur — bitta InstancedMesh (yuzlab teshik — 1 chizish chaqiruvi); MeshBasicMaterial — yorug'lik, soya,
 * rentgen va fokus shaffofligiga tushmaydi (korinish.js / items.js ularni o'tkazib yuboradi); raycast o'chiq — tanlash,
 * o'lchash va sudrashga xalaqit bermaydi. */
import { RANG } from '../../../app/js/engine/teshik3d.js';

const och = (T, hex, k) => new T.Color(hex).lerp(new T.Color(0xffffff), k);

/**
 * @param T — three.js nomlar fazosi
 * @param {Object} dat — teshik3d() natijasi (yoki uning bir detalga tegishli qismi)
 * @param {Object} [o] — { xf: nuqta → [x, y, z], xd: yo'nalish → [x, y, z], k: mm → sahna birligi, minD: eng kichik ko'rinish diametri (mm),
 *   minKromka: kromka tasmasining eng kichik qalinligi (mm) — kichik oynada (detal kartasi) ko'rinsin, chiqish: teshik yuzadan
 *   chiqib turishi (mm; shaffof bo'lmagan detalda — kattaroq) }
 * @returns {Group} — userData.son: { teshik, kromka, zapchast } (instansiyalar soni)
 */
export function belgiGuruh(T, dat, o = {}) {
  const xf = o.xf || ((p) => p), xd = o.xd || ((v) => v), k = o.k || 1;
  const g = new T.Group();
  g.name = 'belgi3d';
  const son = { teshik: 0, kromka: 0, zapchast: 0 };
  g.userData = { belgi3d: true, son };
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3();
  const Y = new T.Vector3(0, 1, 0), v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3();
  const V = (a) => new T.Vector3(a[0], a[1], a[2]);
  const qatlam = (geo, n, nom) => {
    const mesh = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    mesh.name = nom; mesh.userData = { belgi3d: nom };
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    g.add(mesh);
    return mesh;
  };
  /* o'q (Y) → yo'nalish, o'lcham (sx, uzunlik, sz) */
  const qoy = (mesh, i, markaz, yon, s, rang, ikkinchi) => {
    v1.copy(yon).normalize();
    if (ikkinchi) {                                    // to'liq bazis: Y — uzunlik, Z — normal
      v3.copy(ikkinchi).normalize(); v2.crossVectors(v1, v3).normalize(); v3.crossVectors(v2, v1).normalize();
      m4.makeBasis(v2, v1, v3); q.setFromRotationMatrix(m4);
    } else q.setFromUnitVectors(Y, v1);
    sc.set(s[0], s[1], s[2]);
    m4.compose(pos.copy(markaz), q, sc);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, rang);
  };
  const rangi = {};
  const R = (tur, ochroq) => { const kk = tur + (ochroq || ''); if (!rangi[kk]) rangi[kk] = och(T, RANG[tur] != null ? RANG[tur] : RANG.boshqa, ochroq || 0); return rangi[kk]; };

  /* teshiklar — silindr (diametri va chuqurligi bo'yicha; yuzadan 0,5 mm chiqib turadi — ko'rinsin) */
  const ts = dat.teshiklar || [];
  if (ts.length) {
    const mesh = qatlam(new T.CylinderGeometry(0.5, 0.5, 1, 14), ts.length, 'teshik');
    ts.forEach((t, i) => {
      const n = V(xd(t.n)), p = V(xf(t.p));
      const ch = o.chiqish != null ? o.chiqish : 0.5;      // yuzadan chiqib turishi (mm) — shaffof bo'lmagan detalda ham ko'rinsin
      const L = (t.depth + ch) * k, r = Math.max(o.minD || 2.4, t.dia) * k;
      qoy(mesh, i, p.addScaledVector(n.clone().normalize(), L / 2 - ch * k), n, [r, L, r], R(t.tur));
    });
    son.teshik = ts.length;
  }
  /* kromka — qirra bo'ylab ingichka tasma */
  const ks = dat.kromkalar || [];
  if (ks.length) {
    const mesh = qatlam(new T.BoxGeometry(1, 1, 1), ks.length, 'kromka');
    const rang = R('kromka');
    ks.forEach((e, i) => {
      const c = V(xf(e.c)), s = xd(e.s).map(Math.abs), qal = Math.min(...s);
      if (o.minKromka && qal < o.minKromka) { const i0 = s.indexOf(qal); s[i0] = o.minKromka; }
      m4.compose(c, q.identity(), sc.set(s[0] * k, s[1] * k, s[2] * k));
      mesh.setMatrixAt(i, m4); mesh.setColorAt(i, rang);
    });
    son.kromka = ks.length;
  }
  /* zapchast — soddalashtirilgan belgi: petlya (kosa ustida disk + yelka), polka ushlagich (pin), ruchka (planka), yo'naltiruvchi (relsa) */
  const zs = dat.zapchast || [];
  if (zs.length) {
    const silindr = zs.filter(z => z.tur === 'petlya' || z.tur === 'polka'), quti = zs.filter(z => z.tur === 'ruchka' || z.tur === 'napr' || z.tur === 'petlya');
    if (silindr.length) {
      const mesh = qatlam(new T.CylinderGeometry(0.5, 0.5, 1, 18), silindr.length, 'zapchast');
      silindr.forEach((z, i) => {
        const n = V(xd(z.n)).normalize(), p = V(xf(z.p));
        if (z.tur === 'petlya') qoy(mesh, i, p.addScaledVector(n, -2 * k), n, [40 * k, 4 * k, 40 * k], R('petlya', 0.45));
        else qoy(mesh, i, p.addScaledVector(n, -6 * k), n, [6 * k, 12 * k, 6 * k], R('polka', 0.45));
      });
    }
    if (quti.length) {
      const mesh = qatlam(new T.BoxGeometry(1, 1, 1), quti.length, 'zapchast_q');
      quti.forEach((z, i) => {
        const n = V(xd(z.n)).normalize();
        if (z.tur === 'petlya') {
          /* yelka: kosadan eshik petlya qirrasi tomonga (x), korpus ichida */
          const p = V(xf(z.p)).addScaledVector(n, -8 * k), yon = V(xd([z.yelka || 1, 0, 0]));
          qoy(mesh, i, p.addScaledVector(yon.clone().normalize(), 26 * k), yon, [10 * k, 52 * k, 10 * k], R('petlya', 0.45), n);
        } else {
          const a = V(xf(z.a)), b = V(xf(z.b)), yon = b.clone().sub(a);
          if (yon.lengthSq() < 1e-12) yon.copy(V(xd([0, 1, 0])));
          const L = yon.length() + (z.tur === 'ruchka' ? 24 * k : 60 * k);
          const m = a.clone().add(b).multiplyScalar(0.5);
          if (z.tur === 'ruchka') qoy(mesh, i, m.addScaledVector(n, 26 * k), yon, [12 * k, L, 12 * k], R('ruchka', 0.45), n);
          else qoy(mesh, i, m.addScaledVector(n, -7 * k), yon, [35 * k, L, 12 * k], R('napr', 0.45), n);
        }
      });
    }
    son.zapchast = zs.length;
  }
  for (const c of g.children) { c.instanceMatrix.needsUpdate = true; if (c.instanceColor) c.instanceColor.needsUpdate = true; }
  return g;
}

/** qism ko'rinishi (menyu tanlovi) */
export function belgiQism(g, qism = {}) {
  for (const c of g.children) {
    const nom = c.userData && c.userData.belgi3d;
    c.visible = nom === 'teshik' ? qism.teshik !== false : nom === 'kromka' ? qism.kromka !== false : qism.zapchast !== false;
  }
}

/** xotirani bo'shatish */
export function belgiTozala(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); if (c.dispose && c.isInstancedMesh) c.dispose(); });
}
