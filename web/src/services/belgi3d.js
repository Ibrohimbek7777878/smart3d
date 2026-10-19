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
 * @param {Object} [o] — { xf: nuqta → [x, y, z], xd: yo'nalish → [x, y, z], k: mm → sahna birligi, minD: eng kichik ko'rinish diametri (mm), minZ: zapchast ingichka qismlari (vint, pin) eng kichik diametri (mm),
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
  /* zapchast — belgi: petlya (kosa ustida disk + yelka), polka ushlagich (pin), ruchka (planka), yo'naltiruvchi (relsa);
     TZ-38: konfirmat (kallak + vint), ekssentrik (kosa), oyoq (tik silindr). Har belgi — aniq koordinatada (mm, modul lokal).
     userData.zapNuqta: [{ i, c, r }] — har belgi markazi (sahna birligida) va radiusi: bosib tanlash va ajratib ko'rsatish uchun */
  const zs = dat.zapchast || [];
  const nuqtalar = [];
  if (zs.length) {
    const mz = (v, kk = 1) => Math.max(v, (o.minZ || 0) * kk);     // kichik oynada (detal kartasi) ingichka qismlar (vint, pin) ham ko'rinsin
    const sil = [], quti = [];                                     // { c, n, s, rang, ikkinchi }
    zs.forEach((z, zi) => {
      const idx = z.i != null ? z.i : zi;
      const n = z.n ? V(xd(z.n)).normalize() : null;
      let c, r = 30;
      if (z.tur === 'petlya') {
        const p = V(xf(z.p));
        sil.push({ c: p.clone().addScaledVector(n, -2 * k), n, s: [40 * k, 4 * k, 40 * k], rang: R('petlya', 0.45) });
        /* yelka: kosadan eshik petlya qirrasi tomonga (x), korpus ichida */
        const yon = V(xd([z.yelka || 1, 0, 0])), pp = p.clone().addScaledVector(n, -8 * k);
        quti.push({ c: pp.addScaledVector(yon.clone().normalize(), 26 * k), n: yon, s: [10 * k, 52 * k, 10 * k], rang: R('petlya', 0.45), ikkinchi: n });
        c = p.clone().addScaledVector(n, -4 * k); r = 40;
      } else if (z.tur === 'polka') {
        const p = V(xf(z.p));
        sil.push({ c: p.clone().addScaledVector(n, -6 * k), n, s: [mz(6, .8) * k, 12 * k, mz(6, .8) * k], rang: R('polka', 0.45) });
        c = p.clone().addScaledVector(n, -6 * k); r = 20;
      } else if (z.tur === 'konfirmat') {
        const p = V(xf(z.p)), uz = (z.uz || 50);
        sil.push({ c: p.clone().addScaledVector(n, -0.5 * k), n, s: [mz(11, 1.5) * k, 3 * k, mz(11, 1.5) * k], rang: R('konfirmat', 0.5) });                 // kallak
        sil.push({ c: p.clone().addScaledVector(n, (uz / 2) * k), n, s: [mz(8) * k, uz * k, mz(8) * k], rang: R('konfirmat', 0.45) });             // vint
        c = p.clone().addScaledVector(n, (uz / 2) * k); r = 16;
      } else if (z.tur === 'eksentrik') {
        const p = V(xf(z.p));
        sil.push({ c: p.clone().addScaledVector(n, 5.5 * k), n, s: [mz(17, 1.4) * k, 13 * k, mz(17, 1.4) * k], rang: R('eksentrik', 0.4) });
        c = p.clone().addScaledVector(n, 5 * k); r = 22;
      } else if (z.tur === 'oyoq') {
        const p = V(xf(z.p)), uz = z.uz || 100;
        sil.push({ c: p.clone().addScaledVector(n, -(uz / 2) * k), n, s: [36 * k, uz * k, 36 * k], rang: R('oyoq', 0.15) });
        c = p.clone().addScaledVector(n, -(uz / 2) * k); r = 40;
      } else {                                                      // ruchka | napr
        const a = V(xf(z.a)), b = V(xf(z.b)), yon = b.clone().sub(a);
        if (yon.lengthSq() < 1e-12) yon.copy(V(xd([0, 1, 0])));
        const L = yon.length() + (z.tur === 'ruchka' ? 24 * k : 60 * k);
        const m = a.clone().add(b).multiplyScalar(0.5);
        if (z.tur === 'ruchka') quti.push({ c: m.clone().addScaledVector(n, 26 * k), n: yon, s: [12 * k, L, 12 * k], rang: R('ruchka', 0.45), ikkinchi: n });
        else quti.push({ c: m.clone().addScaledVector(n, -7 * k), n: yon, s: [35 * k, L, 12 * k], rang: R('napr', 0.45), ikkinchi: n });
        c = z.tur === 'ruchka' ? m.clone().addScaledVector(n, 26 * k) : m.clone().addScaledVector(n, -7 * k); r = Math.max(30, L / (2 * k) * 0.5);
      }
      nuqtalar.push({ i: idx, tur: z.tur, c, r: r * k });
    });
    if (sil.length) {
      const mesh = qatlam(new T.CylinderGeometry(0.5, 0.5, 1, 18), sil.length, 'zapchast');
      sil.forEach((x, i) => qoy(mesh, i, x.c, x.n, x.s, x.rang));
    }
    if (quti.length) {
      const mesh = qatlam(new T.BoxGeometry(1, 1, 1), quti.length, 'zapchast_q');
      quti.forEach((x, i) => qoy(mesh, i, x.c, x.n, x.s, x.rang, x.ikkinchi));
    }
    son.zapchast = zs.length;
  }
  g.userData.zapNuqta = nuqtalar;
  for (const c of g.children) { if (!c.isInstancedMesh) continue; c.instanceMatrix.needsUpdate = true; if (c.instanceColor) c.instanceColor.needsUpdate = true; }
  return g;
}

/** qism ko'rinishi: qism — menyu tanlovi { teshik, kromka, zapchast }; rejim — { rentgen, zapchast } (TZ-38: "Zapchastlar" tugmasi —
 *  rentgensiz ham faqat zapchastni ko'rsatadi; teshik va kromka faqat rentgenda) */
export function belgiQism(g, qism = {}, rejim = {}) {
  const rentgen = rejim.rentgen !== false;
  for (const c of g.children) {
    const nom = c.userData && c.userData.belgi3d;
    if (nom === 'tanla') continue;                       // ajratib ko'rsatish — belgiTanla boshqaradi
    c.visible = nom === 'teshik' ? rentgen && qism.teshik !== false : nom === 'kromka' ? rentgen && qism.kromka !== false
      : (rejim.zapchast === true || (rentgen && qism.zapchast !== false));
  }
}

/** TZ-38: bitta zapchastni (tartib raqami `i`) ajratib ko'rsatish — markazida yorqin shar; i == null — olib tashlash */
export function belgiTanla(T, g, i) {
  if (!g) return;
  let h = g.children.find(c => c.userData && c.userData.belgi3d === 'tanla');
  const nuq = i == null ? null : (g.userData.zapNuqta || []).find(x => x.i === i);
  if (!nuq) { if (h) h.visible = false; return; }
  if (!h) {
    h = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshBasicMaterial({ color: 0xFF7A45, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, toneMapped: false }));
    h.userData = { belgi3d: 'tanla' }; h.name = 'zapchast_tanla'; h.raycast = () => {}; h.renderOrder = 999; h.frustumCulled = false;
    g.add(h);
  }
  h.position.copy(nuq.c); h.scale.setScalar(nuq.r * 1.25); h.visible = true;
}

/** xotirani bo'shatish */
export function belgiTozala(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); if (c.dispose && c.isInstancedMesh) c.dispose(); });
}
