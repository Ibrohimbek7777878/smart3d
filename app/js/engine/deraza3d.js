/* Smart3D engine/deraza3d.js — REAL oyna va eshik 3D ko'rinishi (egasi #236). Faqat ko'rinish: narx, kesim, hisob
 * modulning parts ro'yxatidan davom etadi (assembler o'zgarmaydi).
 * Lokal o'qlar (assembler bilan bir xil): X — eni, Y — chuqurlik (+Y = xona ichi/old), Z — bo'yi; markaz (0,0,0). Birlik — mm. */

export const DERAZA_KATEGORIYA = /^(window|door)$/;
export const ORNATILGAN_PROFIL = 55;        // oyna rama profili, mm
export const PEShTAXTA_CHIQISH = 30;        // podokonnik xona ichiga chiqishi, mm
export const OYNA_SUKUT_Z = 900;            // yangi oynaning pastki qirrasi poldan, mm

/** Geometriya rejasi (THREE'siz — testlanadi): har bo'lak { id, tur, x, y, z, w, d, h } (markaz koordinatasi). */
export function derazaReja(kat, w, d, h) {
  const B = [];
  const q = (id, tur, x, y, z, bw, bd, bh) => B.push({ id, tur, x, y, z, w: bw, d: bd, h: bh });
  if (kat === 'window') {
    const f = Math.min(ORNATILGAN_PROFIL, w / 6, h / 6), sill = 30;
    const ph = h - sill;                                  // rama balandligi (peshtaxta ostida)
    const cz = sill / 2;                                  // rama markazi z (pastdan sill)
    q('rama-ch', 'ramka', -w / 2 + f / 2, 0, cz, f, d, ph); q('rama-o', 'ramka', w / 2 - f / 2, 0, cz, f, d, ph);
    q('rama-t', 'ramka', 0, 0, cz + ph / 2 - f / 2, w - 2 * f, d, f); q('rama-p', 'ramka', 0, 0, cz - ph / 2 + f / 2, w - 2 * f, d, f);
    const iw = w - 2 * f, ih = ph - 2 * f, mu = 50;       // ichki teshik, o'rta ustun
    q('ustun', 'ramka', 0, 0, cz, mu, d * 0.8, ih);
    let zy = [cz, ih];                                    // ko'ndalang (transom): baland oynada gorizontal bo'lgich
    if (ih > 1300) { q('kondalang', 'ramka', 0, 0, cz + ih * 0.2, iw, d * 0.8, 40); zy = null; }
    const qw = (iw - mu) / 2, sg = 6;
    for (const s of [-1, 1]) {
      const cx = s * (mu / 2 + qw / 2);
      if (zy) q('shisha-' + (s < 0 ? 'ch' : 'o'), 'shisha', cx, 0, zy[0], qw, sg, zy[1]);
      else {
        const zt = cz + ih * 0.2 + 20, hu = cz + ih / 2 - zt, hp = (zt - 40) - (cz - ih / 2);
        q('shisha-' + (s < 0 ? 'ch' : 'o') + '-u', 'shisha', cx, 0, zt + hu / 2, qw, sg, hu);
        q('shisha-' + (s < 0 ? 'ch' : 'o') + '-p', 'shisha', cx, 0, cz - ih / 2 + hp / 2, qw, sg, hp);
      }
    }
    q('peshtaxta', 'peshtaxta', 0, PEShTAXTA_CHIQISH / 2, -h / 2 + sill / 2, w + 100, d + PEShTAXTA_CHIQISH, sill);
  } else {
    const k = Math.min(45, w / 10), t = d;                // eshik korobkasi (ramka)
    q('korobka-ch', 'ramka', -w / 2 + k / 2, 0, 0, k, t, h); q('korobka-o', 'ramka', w / 2 - k / 2, 0, 0, k, t, h);
    q('korobka-t', 'ramka', 0, 0, h / 2 - k / 2, w - 2 * k, t, k);
    const qw = w - 2 * k - 6, qh = h - k - 3, qt = Math.max(30, d - 6), qz = -(k + 3) / 2;   // qanot (sal bo'shliq bilan)
    q('qanot', 'qanot', 0, 0, qz, qw, qt, qh);
    const pw = qw * 0.62, ph2 = qh * 0.36, py = qt / 2 + 3;                // panel bo'rtmalari (ikkala tomonda)
    for (const [i, zc] of [[1, qh * 0.22], [2, -qh * 0.2]]) for (const s of [1, -1]) {
      q('bortma-' + i + (s > 0 ? 'o' : 'a'), 'bortma', 0, s * py, qz + zc, pw, 6, ph2);
    }
    for (const sg of [1, -1]) {                                            // ruchka: plank + tayanch, ikkala tomonda
      q('ruchka-' + (sg > 0 ? 'o' : 'a'), 'ruchka', w / 2 - k - 70, sg * (qt / 2 + 28), -h * 0.02, 120, 14, 14);
      q('ruchka-sh-' + (sg > 0 ? 'o' : 'a'), 'ruchka', w / 2 - k - 20, sg * (qt / 2 + 14), -h * 0.02, 14, 28, 14);
    }
  }
  return B;
}

/** group'ga real oyna/eshik mesh'larini qo'shadi. mats: { ramka, qanot, handle } (THREE material); → group */
export function derazaYasa(THREE, group, kat, w, d, h, mats, nomi) {
  const glass = new THREE.MeshStandardMaterial({ color: 0x9ccfe0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const M = { ramka: mats.ramka, peshtaxta: mats.ramka, shisha: glass, qanot: mats.qanot || mats.ramka, bortma: mats.qanot || mats.ramka, ruchka: mats.handle };
  const part = (id) => ({ id, name: nomi || kat, slot: 'fasad', size: [w, d, h] });
  for (const b of derazaReja(kat, w, d, h)) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.d, b.h), M[b.tur]);
    m.position.set(b.x, b.y, b.z);
    m.castShadow = b.tur !== 'shisha'; m.receiveShadow = true;
    m.userData = { panelId: 'dz-' + b.id, name: nomi || kat, slot: 'fasad', derazaTur: b.tur, part: part('dz-' + b.id) };
    if (b.tur !== 'shisha') {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 1), new THREE.LineBasicMaterial({ color: 0x8a8072 }));
      m.add(e);
    }
    group.add(m);
  }
  return group;
}
