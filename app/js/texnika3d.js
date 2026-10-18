/* Smart3D app/js/texnika3d.js — o'rnatma texnikaning 3D ko'rinishi (egasi #232: "qora quti bo'lib qolgan, eshiklari yo'q").
 *
 * Oddiy primitivlar (quti, silindr, kesik piramida) bilan har texnika haqiqiyroq chiziladi: muzlatgich (2 ta eshik, yon sharnir),
 * duxovka / idish yuvish mashinasi / gaz plita duxovkasi (pastga ochiladigan eshik), mikroto'lqinli (yon sharnir), varochnaya panel
 * (4 konforka + panjara + tugmalar), chimeney (kesik piramida + quvur + filtr).
 * Faqat 3D ko'rinish: hisob, kesim, narx, joylash (o'lcham, z) O'ZGARMAYDI — bu fayl assembler/cutlist'ga bog'liq emas.
 *
 * Koordinata (modul guruhi, markazda): x — eni, y — chuqurlik (old tomon +y), z — balandlik; xuddi themedMesh'dagidek.
 * Eshik: movers [{ obj, type:'door', sign, key }] (yon sharnir, rotation.z) yoki [{ obj, type:'flap', sign, max, key }]
 * (pastki sharnir, rotation.x) — items.js ochadi/yopadi (mavjud mebel eshiklari bilan bir xil boshqaruv).
 * Rang: texnikaRang = { korpus, eshik, ruchka, shisha, tugma, konforka } — son (0xRRGGBB); yo'q qism — turning sukut rangi. */

/** turi kodi bo'yicha */
export function texnikaTuri(code) {
  switch (code) {
    case 'SP-TX-001': return 'duxovka';
    case 'SP-TX-002': return 'yuvish';
    case 'SP-TX-003': return 'mikro';
    case 'SP-TX-004': return 'muzlatgich';
    case 'SP-TX-005': return 'varochnaya';
    case 'SP-TX-006': return 'chimeney';
    case 'SP-TX-008': return 'gazplita';
    default: return null;
  }
}

/** tayyor palitra (oq, kulrang, qora, zanglamas, bronza) — metall: zanglamas, bronza */
export const TEXNIKA_PALITRA = [
  { id: 'oq', rang: 0xF1F1EE, metall: false },
  { id: 'kulrang', rang: 0x9AA0A6, metall: false },
  { id: 'qora', rang: 0x1B1D20, metall: false },
  { id: 'zanglamas', rang: 0xC4C9CD, metall: true },
  { id: 'bronza', rang: 0x8E6B45, metall: true }
];
const METALL = new Set(TEXNIKA_PALITRA.filter(p => p.metall).map(p => p.rang));

/* sukut ranglar: realistik (oq / zanglamas po'lat / qora shisha) */
const OQ = 0xF1F1EE, ZP = 0xC4C9CD, QORA = 0x1B1D20, KULRANG = 0x9AA0A6, TUGMA = 0x2A2E33;
const SUKUT = {
  muzlatgich: { korpus: 0xE6E8EA, eshik: ZP, ruchka: 0x6F757B },
  duxovka: { korpus: ZP, eshik: ZP, shisha: QORA, ruchka: ZP, tugma: TUGMA },
  yuvish: { korpus: ZP, eshik: ZP, shisha: QORA, ruchka: 0x6F757B, tugma: TUGMA },
  mikro: { korpus: ZP, eshik: ZP, shisha: QORA, ruchka: 0x6F757B, tugma: TUGMA },
  gazplita: { korpus: OQ, eshik: OQ, shisha: QORA, ruchka: ZP, tugma: TUGMA, konforka: 0x2B2D30 },
  varochnaya: { korpus: ZP, shisha: QORA, tugma: ZP, konforka: 0x2B2D30 },
  chimeney: { korpus: ZP, shisha: 0x2A2D30, tugma: TUGMA, ruchka: 0x6F757B }
};
/** foydalanuvchi o'zgartiradigan qismlar (turga qarab) */
export const TEXNIKA_QISMLAR = {
  muzlatgich: ['korpus', 'eshik', 'ruchka'],
  duxovka: ['korpus', 'eshik', 'shisha', 'ruchka', 'tugma'],
  yuvish: ['korpus', 'eshik', 'shisha', 'ruchka', 'tugma'],
  mikro: ['korpus', 'eshik', 'shisha', 'ruchka', 'tugma'],
  gazplita: ['korpus', 'eshik', 'shisha', 'ruchka', 'tugma', 'konforka'],
  varochnaya: ['korpus', 'shisha', 'tugma', 'konforka'],
  chimeney: ['korpus', 'shisha', 'tugma']
};
export function texnikaSukut(tur) { return Object.assign({}, SUKUT[tur] || {}); }

function matOf(THREE, slot, rang) {
  const metall = METALL.has(rang) || (slot === 'ruchka' && rang === 0x6F757B);
  const shisha = slot === 'shisha';
  const m = new THREE.MeshStandardMaterial({
    color: rang, metalness: metall ? 0.3 : shisha ? 0.2 : 0.05, roughness: metall ? 0.4 : shisha ? 0.1 : slot === 'konforka' ? 0.5 : 0.42
  });
  m.userData.texnikaSlot = slot;
  return m;
}

/**
 * @returns {THREE.Group} modul guruhi (themedMesh bilan bir xil userData: movers, themed)
 */
export function texnikaMesh(THREE, frag, w, d, h, opts = {}) {
  const group = new THREE.Group();
  const code = frag ? frag.code : '';
  const tur = texnikaTuri(code) || 'duxovka';
  const R = Object.assign({ ichi: tur === 'muzlatgich' ? 0xF3F4F5 : 0x121417 }, SUKUT[tur], opts.rang || {});
  const mats = {};
  const M = (slot) => (mats[slot] || (mats[slot] = matOf(THREE, slot, R[slot] != null ? R[slot] : R.korpus)));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData = { kind: 'hitBox' };
  group.add(hit);
  const movers = [];
  const fy = d / 2;                                        // old yuza
  const zb = (z0, hh) => -h / 2 + z0 + hh / 2;             // pastdan (z0) hh balandlikdagi markaz
  const sign = opts.hinge === 'right' ? -1 : 1;           // 'left' — sharnir chap chetda (themedMesh bilan bir xil)
  const partOf = (id, name, size) => ({ id, name, slot: 'texnika', size });

  const put = (parent, geo, slot, x, y, z, part) => {
    const m = new THREE.Mesh(geo, M(slot));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    m.userData = { slot: 'texnika', texnikaSlot: slot };
    if (part) { m.userData.part = part; m.userData.panelId = part.id; }
    parent.add(m);
    return m;
  };
  const box = (parent, slot, bw, bd, bh, x, y, z, part) => put(parent, new THREE.BoxGeometry(bw, bd, bh), slot, x, y, z, part);
  /* silindr: o'qi y (old tomonga) — tugma; o'qi z (tepaga) — konforka */
  const tugmaY = (parent, slot, r, len, x, y, z, part) => put(parent, new THREE.CylinderGeometry(r, r * 1.08, len, 20), slot, x, y, z, part);
  const diskZ = (parent, slot, r, len, x, y, z) => {
    const g = new THREE.CylinderGeometry(r, r, len, 28); g.rotateX(Math.PI / 2);
    return put(parent, g, slot, x, y, z);
  };
  const halqaZ = (parent, slot, r1, r2, x, y, z) => {
    const g = new THREE.TorusGeometry(r1, r2, 8, 28);
    return put(parent, g, slot, x, y, z);
  };

  /* eshik ortidagi ichki yuza (eshik ochilganda ichi ko'rinadi): qora (muzlatgichda — oq) */
  const ichi = (cx, dw, z0, hh, qal) => box(group, 'ichi', dw - 24, 4, hh - 24, cx, fy - qal + 1, zb(z0, hh));
  /* eshik — yon sharnir. x0..x1: eshikning old yuzadagi gorizontal oralig'i (markazga nisbatan), z0/hh: pastdan,
     ruchka: 'ver' (vertikal) | 'gor' | null; rz: ruchka balandligi — 'past' | 'yuqori' | 'orta'. Ruchka sharnirning qarshi tomonida. */
  function yonEshik(key, name, x0, x1, z0, hh, ruchka, qal, rz, ruchkaUz) {
    const dw = x1 - x0, hx = sign > 0 ? x0 : x1;           // sharnir cheti
    const pivot = new THREE.Group();
    pivot.position.set(hx, fy - qal / 2, zb(z0, hh));
    group.add(pivot);
    movers.push({ obj: pivot, type: 'door', sign, key });
    const part = partOf(key, name, [dw, qal, hh]);
    ichi((x0 + x1) / 2, dw, z0, hh, qal);
    pivot.userData.part = part;
    box(pivot, 'eshik', dw, qal, hh, sign * dw / 2, 0, 0, part);
    if (ruchka) {
      const L = Math.min(ruchkaUz || hh * 0.5, hh - 80), rx = sign * (dw - 40);
      const zc = rz === 'past' ? -hh / 2 + L / 2 + 70 : rz === 'yuqori' ? hh / 2 - L / 2 - 70 : 0;
      box(pivot, 'ruchka', 14, 22, L, rx, qal / 2 + 11, zc, part);
    }
    return pivot;
  }
  /* eshik — pastki sharnir (pastga ochiladi). */
  function pastgaEshik(key, name, x0, x1, z0, hh, qal, ruchka, shishali) {
    const dw = x1 - x0, cx = (x0 + x1) / 2;
    const pivot = new THREE.Group();
    pivot.position.set(cx, fy - qal / 2, zb(z0, 0));
    group.add(pivot);
    movers.push({ obj: pivot, type: 'flap', sign: -1, max: 1.35, key });
    const part = partOf(key, name, [dw, qal, hh]);
    ichi(cx, dw, z0, hh, qal);
    box(pivot, 'eshik', dw, qal, hh, 0, 0, hh / 2, part);
    if (shishali) box(pivot, 'shisha', dw * 0.78, 4, hh * 0.6, 0, qal / 2 + 1, hh * 0.46, part);   // qora shisha oyna
    if (ruchka) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, dw * 0.8, 14), M('ruchka'));
      g.rotation.z = Math.PI / 2;                           // o'q — x (gorizontal ruchka)
      g.position.set(0, qal / 2 + 24, hh - 36); g.castShadow = true; g.userData = { part, slot: 'texnika', texnikaSlot: 'ruchka' };
      pivot.add(g);
      for (const s of [-1, 1]) box(pivot, 'ruchka', 10, 24, 10, s * dw * 0.38, qal / 2 + 12, hh - 36, part);
    }
    return pivot;
  }
  /* boshqaruv paneli: z0..z0+hh, tugmalar soni n (silindr, old tomonga), displey */
  function panel(x0, x1, z0, hh, n, displey) {
    const pw = x1 - x0, cx = (x0 + x1) / 2;
    box(group, 'shisha', pw, 6, hh, cx, fy - 3, zb(z0, hh));
    const r = Math.min(hh * 0.3, 22);
    for (let i = 0; i < n; i++) tugmaY(group, 'tugma', r, 18, x0 + (pw * (i + 0.5)) / n, fy + 4, zb(z0, hh));
    if (displey) box(group, 'tugma', pw * 0.18, 3, hh * 0.28, cx, fy + 1.5, zb(z0, hh));
  }

    if (tur === 'muzlatgich') {
    /* korpus — eshiklar ostida; eshiklar old yuzada (yon sharnir), ruchkalar vertikal */
    const qal = 24, bd = d - qal;
    box(group, 'korpus', w, bd, h - 40, 0, -qal / 2, zb(20, h - 40));
    box(group, 'korpus', w - 20, bd - 4, 20, 0, -qal / 2, zb(0, 20));             // taglik (poydevor)
    const tuz = Math.round(h * 0.34), z1 = Math.round(h * 0.015);
    yonEshik('eshik_past', 'Muzlatkich eshigi', -w / 2 + 6, w / 2 - 6, z1, tuz - 4, 'ver', qal, 'yuqori', Math.round(tuz * 0.5));
    yonEshik('eshik_yuqori', 'Muzlatgich eshigi', -w / 2 + 6, w / 2 - 6, z1 + tuz, h - z1 - tuz - 20, 'ver', qal, 'past', Math.round(h * 0.3));
  } else if (tur === 'duxovka' || tur === 'mikro') {
    const qal = 22;
    box(group, 'korpus', w, d - qal, h, 0, -qal / 2, 0);
    if (tur === 'duxovka') {
      const ph = Math.round(h * 0.2);                       // yuqorida boshqaruv paneli
      panel(-w / 2 + 20, w / 2 - 20, h - ph - 6, ph, 4, true);
      pastgaEshik('eshik_1', 'Duxovka eshigi', -w / 2 + 14, w / 2 - 14, 8, h - ph - 20, qal, true, true);
    } else {
      /* mikroto'lqinli: chapda eshik (yon sharnir, oynali), o'ngda boshqaruv paneli */
      const pw = Math.round(w * 0.24);
      panel(w / 2 - pw - 10, w / 2 - 10, 10, h - 20, 3, true);
      const x0 = -w / 2 + 10, x1 = w / 2 - pw - 18, dw = x1 - x0;
      const pv = yonEshik('eshik_1', 'Mikroto\'lqinli eshigi', x0, x1, 10, h - 20, 'ver', qal, 'orta', Math.round(h * 0.5));
      box(pv, 'shisha', dw * 0.7, 4, (h - 20) * 0.7, sign * dw * 0.45, qal / 2 + 1, 0, pv.userData.part);
    }
  } else if (tur === 'yuvish') {
    const qal = 24;
    box(group, 'korpus', w, d - qal, h, 0, -qal / 2, 0);
    const ph = 90;
    panel(-w / 2 + 16, w / 2 - 16, h - ph - 8, ph, 3, true);
    pastgaEshik('eshik_1', 'Idish yuvish mashinasi eshigi', -w / 2 + 8, w / 2 - 8, 8, h - ph - 24, qal, true, false);
  } else if (tur === 'gazplita') {
    /* erkin turuvchi: ostida duxovka, ustida varochnaya yuza (konforkalar) va panjara, old tomonda tugmalar */
    const qal = 22, topH = 36, ph = 80;
    box(group, 'korpus', w, d - qal, h - topH, 0, -qal / 2, zb(0, h - topH));
    box(group, 'shisha', w, d, topH * 0.55, 0, 0, zb(h - topH, topH * 0.55));       // qora varochnaya yuza
    konforkalar(zb(h - topH * 0.45, 0), w, d);
    box(group, 'korpus', w, 30, ph, 0, fy - 15, zb(h - topH - ph, ph));             // tugmalar tasmasi (old)
    for (let i = 0; i < 5; i++) tugmaY(group, 'tugma', 19, 22, -w / 2 + (w * (i + 0.5)) / 5, fy + 8, zb(h - topH - ph, ph));
    pastgaEshik('eshik_1', 'Duxovka eshigi', -w / 2 + 14, w / 2 - 14, 60, h - topH - ph - 90, qal, true, true);
    box(group, 'korpus', w - 30, 14, 40, 0, fy - 4, zb(10, 40));                    // pastki planka
  } else if (tur === 'varochnaya') {
    const body = Math.max(20, h - 8);
    box(group, 'korpus', w - 20, d - 20, body, 0, 0, zb(0, body));                  // pastki korpus
    box(group, 'shisha', w, d, 8, 0, 0, zb(h - 8, 8));                              // qora shisha yuza
    konforkalar(h / 2, w, d);
    for (let i = 0; i < 4; i++) tugmaY(group, 'tugma', 17, 22, -w * 0.3 + (w * 0.6 * i) / 3, fy - 10 + 4, zb(Math.max(0, h - 40), 0));
  } else if (tur === 'chimeney') {
    const hb = Math.round(h * 0.16), hf = Math.round(h * 0.32);
    box(group, 'shisha', w * 0.86, d * 0.8, 6, 0, 0, -h / 2 + 3);                   // pastki filtr plastina
    box(group, 'korpus', w, d, hb, 0, 0, zb(6, hb));                                // pastki quti
    const fr = Math.SQRT1_2;
    const geo = new THREE.CylinderGeometry(w * 0.2 / fr, w / 2 / fr, hf, 4, 1);     // kesik piramida (trapetsiya)
    geo.rotateX(Math.PI / 2); geo.rotateZ(Math.PI / 4); geo.scale(1, d / w, 1);
    put(group, geo, 'korpus', 0, 0, -h / 2 + 6 + hb + hf / 2);
    const hq = h - 6 - hb - hf;
    box(group, 'korpus', w * 0.34, d * 0.34, hq, 0, 0, h / 2 - hq / 2);             // quvur
    for (let i = 0; i < 3; i++) tugmaY(group, 'tugma', 11, 10, -w * 0.08 + i * w * 0.08, fy + 2, zb(6 + hb / 2, 0));
  }

  /* 4 ta konforka (doira) + ustida panjara (gaz plita / varochnaya) — yuza z-balandligi zTop */
  function konforkalar(zTop, W, D) {
    const rs = [Math.min(W, D) * 0.13, Math.min(W, D) * 0.09, Math.min(W, D) * 0.09, Math.min(W, D) * 0.11];
    const pos = [[-0.24, 0.2], [0.24, 0.22], [-0.24, -0.2], [0.24, -0.22]];
    pos.forEach((p, i) => {
      const x = p[0] * W, y = p[1] * D * 0.9, r = rs[i];
      diskZ(group, 'konforka', r, 8, x, y, zTop + 4);
      diskZ(group, 'konforka', r * 0.45, 12, x, y, zTop + 8);
      halqaZ(group, 'konforka', r * 1.02, 2.4, x, y, zTop + 2);
    });
    /* panjara: ikki bo'ylama + ikki ko'ndalang sim */
    for (const sx of [-0.24, 0.24]) box(group, 'konforka', 10, D * 0.85, 8, sx * W, 0, zTop + 14);
    for (const sy of [-0.21, 0.21]) box(group, 'konforka', W * 0.82, 10, 8, 0, sy * D * 0.9, zTop + 14);
    box(group, 'konforka', W * 0.82, 8, 8, 0, 0, zTop + 14);
  }

  group.userData = {
    kind: 'item', code, name: frag ? frag.name : '', category: frag ? frag.category : 'appliance',
    w, d, h, panelsCount: group.children.length, doorsCount: movers.length, movers, themed: true, texnika: tur
  };
  return group;
}
