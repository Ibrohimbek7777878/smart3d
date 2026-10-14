/* Smart3D engine/assembler.js — 3D Mebel Panellari Konstruktori (Real Assembly).
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 19, 20, 21):
 *   Mebel sahnada va eksportda (OBJ, GLB) yaxlit quti emas, balki
 *   haqiqiy panellar (yon devorlar, tub, qopqoq, tokchalar, orqa devor,
 *   fasad eshiklari va ruchkalar) majmuasi sifatida quriladi.
 *
 * Koordinatalar tizimi (Smart3D / Three.js Z-up):
 *   X = kenglik (width, chapdan o'ngga)
 *   Y = chuqurlik (depth, orqadan oldinga / fasad tomon)
 *   Z = balandlik (height, poldan shiftga)
 *
 * Barcha panellar modul markazi (0, 0, 0) ga nisbatan hisoblanadi:
 *   X: [-w/2 .. +w/2]
 *   Y: [-d/2 .. +d/2] (Y = +d/2 da fasad joylashadi)
 *   Z: [-h/2 .. +h/2] (Z = -h/2 pol/pastki qism, Z = +h/2 qopqoq)
 */

export function getModulePanels(frag, w, d, h, opts = {}) {
  const t = opts.thickness || 16;       // panel qalinligi (standart 16mm yoki 18mm)
  const cat = (frag && frag.category) || 'cabinet';
  const group = (frag && frag.group) || '';
  const name = (frag && frag.name) || '';
  const panels = [];
  const doors = [];

  // ── 1. Oshxona va Shkaflar (Kabinet, Garderob, Oshxona shkaflari) ──
  const isStorage = /cabinet|wardrobe|kitchen|shelf/i.test(cat) || /shkaf|tumba|penal/i.test(name);

  if (isStorage) {
    // Tsokol (oyog'i / kickplate)
    const isWallCabinet = /osma|tepa|wall/i.test(group) || /osma/i.test(name) || (h <= 750 && d <= 400);
    const isWardrobe = h >= 1600;
    const cokolH = isWallCabinet ? 0 : (isWardrobe ? 80 : 100);

    const netH = h - cokolH;
    const zBase = -h / 2 + cokolH;

    // 1) Chap yon devor (yon_chap)
    panels.push({
      id: 'yon_chap',
      name: 'Chap yon devor',
      slot: 'korpus',
      code: 'yon',
      w: t,
      d: d,
      h: netH,
      x: -w / 2 + t / 2,
      y: 0,
      z: zBase + netH / 2
    });

    // 2) O'ng yon devor (yon_ong)
    panels.push({
      id: 'yon_ong',
      name: 'O\'ng yon devor',
      slot: 'korpus',
      code: 'yon',
      w: t,
      d: d,
      h: netH,
      x: w / 2 - t / 2,
      y: 0,
      z: zBase + netH / 2
    });

    // 3) Tub panel (past / bottom)
    panels.push({
      id: 'tub',
      name: 'Tub panel',
      slot: 'korpus',
      code: 'past',
      w: Math.max(10, w - 2 * t),
      d: d,
      h: t,
      x: 0,
      y: 0,
      z: zBase + t / 2
    });

    // 4) Qopqoq / Tepasi (ust / top)
    panels.push({
      id: 'qopqoq',
      name: 'Qopqoq',
      slot: 'korpus',
      code: 'ust',
      w: Math.max(10, w - 2 * t),
      d: d,
      h: t,
      x: 0,
      y: 0,
      z: h / 2 - t / 2
    });

    // 5) Orqa devor (HDF 3mm)
    panels.push({
      id: 'orqa',
      name: 'Orqa devor (HDF)',
      slot: 'orqa',
      code: 'orqa',
      w: Math.max(10, w - 4),
      d: 3,
      h: Math.max(10, netH - 4),
      x: 0,
      y: -d / 2 + 3 / 2 + 8, // 8mm ichkariga kirgan paz
      z: zBase + netH / 2
    });

    // 6) Tsokol (Plintus / kickplate, agar bor bo'lsa)
    if (cokolH > 0) {
      panels.push({
        id: 'cokol',
        name: 'Tsokol planka',
        slot: 'korpus',
        code: 'cokol',
        w: Math.max(10, w - 2 * t),
        d: t,
        h: cokolH,
        x: 0,
        y: d / 2 - 40, // fasaddan 40mm ichkariga kirgan
        z: -h / 2 + cokolH / 2
      });
    }

    // 7) Ichki tokchalar (polka / shelf)
    const shelfCount = isWardrobe ? 3 : (netH > 500 ? 1 : 0);
    if (shelfCount > 0) {
      const step = netH / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        panels.push({
          id: `polka_${s}`,
          name: `Ichki javon ${s}`,
          slot: 'polka',
          code: 'polka',
          w: Math.max(10, w - 2 * t - 1),
          d: Math.max(10, d - 25), // eshikka tegmasligi uchun 25mm qisqaroq
          h: t,
          x: 0,
          y: -12.5,
          z: zBase + s * step
        });
      }
    }

    // 8) Fasad (Eshiklar / Tortmalar)
    const isDoorless = /ochiq|polka|shelf/i.test(cat) || /ochiq/i.test(name);
    if (!isDoorless) {
      const doorH = Math.max(10, netH - 4);
      const isTwoDoors = w > 600;

      if (!isTwoDoors) {
        // Bitta eshik
        const doorW = Math.max(10, w - 4);
        const doorPanel = {
          id: 'fasad_1',
          name: 'Fasad eshik',
          slot: 'fasad',
          code: 'eshik',
          isFasad: true,
          isDoor: true,
          w: doorW,
          d: t,
          h: doorH,
          x: 0,
          y: d / 2 + t / 2,
          z: zBase + netH / 2,
          hingeSide: 'left',
          handle: {
            x: doorW / 2 - 35,
            y: d / 2 + t + 10,
            z: zBase + netH / 2,
            w: 12,
            d: 22,
            h: 120
          }
        };
        panels.push(doorPanel);
        doors.push(doorPanel);
      } else {
        // Ikkita eshik
        const doorW = Math.max(10, (w - 6) / 2);
        // Chap eshik
        const leftDoor = {
          id: 'fasad_chap',
          name: 'Chap fasad eshik',
          slot: 'fasad',
          code: 'eshik',
          isFasad: true,
          isDoor: true,
          w: doorW,
          d: t,
          h: doorH,
          x: -w / 4,
          y: d / 2 + t / 2,
          z: zBase + netH / 2,
          hingeSide: 'left',
          handle: {
            x: -w / 4 + doorW / 2 - 25,
            y: d / 2 + t + 10,
            z: zBase + netH / 2,
            w: 12,
            d: 22,
            h: 120
          }
        };
        // O'ng eshik
        const rightDoor = {
          id: 'fasad_ong',
          name: 'O\'ng fasad eshik',
          slot: 'fasad',
          code: 'eshik',
          isFasad: true,
          isDoor: true,
          w: doorW,
          d: t,
          h: doorH,
          x: w / 4,
          y: d / 2 + t / 2,
          z: zBase + netH / 2,
          hingeSide: 'right',
          handle: {
            x: w / 4 - doorW / 2 + 25,
            y: d / 2 + t + 10,
            z: zBase + netH / 2,
            w: 12,
            d: 22,
            h: 120
          }
        };
        panels.push(leftDoor, rightDoor);
        doors.push(leftDoor, rightDoor);
      }
    }
  } else if (/table|desk/i.test(cat) || /stol/i.test(name)) {
    // ── 2. Stollar: Stol usti + 4 oyoq ──
    const topT = 25;
    panels.push({
      id: 'stol_usti',
      name: 'Stol usti',
      slot: 'fasad',
      code: 'ust',
      w, d, h: topT,
      x: 0, y: 0, z: h / 2 - topT / 2
    });
    const legW = 50;
    const legH = h - topT;
    const legPositions = [
      [-w / 2 + legW / 2 + 10, -d / 2 + legW / 2 + 10],
      [w / 2 - legW / 2 - 10, -d / 2 + legW / 2 + 10],
      [-w / 2 + legW / 2 + 10, d / 2 - legW / 2 - 10],
      [w / 2 - legW / 2 - 10, d / 2 - legW / 2 - 10]
    ];
    legPositions.forEach((pos, idx) => {
      panels.push({
        id: `oyoq_${idx + 1}`,
        name: `Stol oyog'i ${idx + 1}`,
        slot: 'korpus',
        code: 'oyoq',
        w: legW, d: legW, h: legH,
        x: pos[0], y: pos[1], z: -h / 2 + legH / 2
      });
    });
  } else if (/chair/i.test(cat) || /stul/i.test(name)) {
    // ── 3. Stullar: O'rindiq + suyanchiq + oyoqlar ──
    const seatH = Math.min(450, h * 0.55);
    panels.push({
      id: 'orindiq',
      name: 'O\'rindiq',
      slot: 'fasad',
      code: 'seat',
      w, d: d * 0.85, h: 30,
      x: 0, y: 0, z: -h / 2 + seatH
    });
    panels.push({
      id: 'suyanchiq',
      name: 'Suyanchiq',
      slot: 'fasad',
      code: 'back',
      w: w * 0.9, d: 20, h: h - seatH,
      x: 0, y: -d / 2 + 10, z: -h / 2 + seatH + (h - seatH) / 2
    });
    const legW = 35;
    const legH = seatH;
    [
      [-w / 2 + 20, -d / 2 + 20],
      [w / 2 - 20, -d / 2 + 20],
      [-w / 2 + 20, d / 2 - 20],
      [w / 2 - 20, d / 2 - 20]
    ].forEach((pos, idx) => {
      panels.push({
        id: `stul_oyoq_${idx + 1}`,
        name: `Stul oyog'i ${idx + 1}`,
        slot: 'korpus',
        code: 'oyoq',
        w: legW, d: legW, h: legH,
        x: pos[0], y: pos[1], z: -h / 2 + legH / 2
      });
    });
  } else {
    // ── 4. Standart mebel korpusi ──
    panels.push({
      id: 'asosiy_korpus',
      name: frag ? frag.name : 'Mebel',
      slot: 'korpus',
      code: 'korpus',
      w, d, h,
      x: 0, y: 0, z: 0
    });
  }

  return { panels, doors };
}
