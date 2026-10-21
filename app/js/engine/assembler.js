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
 *
 * TZ-09 Q5 / TZ-19: opts.tortma = true — tortmali modulda fasad tortmalarga bo'linadi (faqat 3D ko'rinish: yangi sayt
 * sahnasi va "Ichini ko'rish"). Soni va nisbiy balandligi — modul detallaridan (Фасад ящика / fasad_kichik / fasad_katta /
 * tortma_fasad). Kesim, narx, BPJ/OBJ/GLB bu bayroqsiz chaqiradi — ular O'ZGARMAYDI (tests/verify_tortma.mjs).
 */
import { evalFormula } from './expr.js';
import { hasJoy, joyPanellar } from './joy.js';
import { dekorRang } from './rang.js';
import { chizmaPanellar } from './chizish.js';

const TORTMA_RE = /ящик|tortma|fasad_kichik|fasad_katta/i;
const ESHIK_RE = /двер|eshik/i;

/** fasad qatorlari (yuqoridan pastga): tortmalar va eshik qatori, balandligi — detal formulasidan */
function fasadQatorlari(frag, w, d, h, t, tall) {
  const vars = { w, d, h, t, t_korpus: t };   // TZ-37: fasad detali formulasida t_korpus (bo'shliq korpus qalinligidan) bo'lishi mumkin
  const num = (e) => { try { const v = evalFormula(String(e), vars); return v > 0 ? v : 0; } catch (err) { return 0; } };
  const drawers = [];
  let door = 0;
  for (const p of (frag && frag.parts) || []) {
    if (p.slot !== 'fasad') continue;
    const nm = (p.nom || p.name || '') + ' ' + (p.code || '');
    const hh = num(p.len), q = Math.max(1, Math.round(+p.qty || 1));
    if (!hh) continue;
    if (TORTMA_RE.test(nm)) for (let i = 0; i < q; i++) drawers.push(hh);
    else if (ESHIK_RE.test(nm)) door = Math.max(door, hh);
  }
  if (!drawers.length) return null;
  drawers.sort((a, b) => a - b);                             // kichigi tepada (odatiy tartib)
  const rows = drawers.map(x => ({ kind: 'tortma', h: x }));
  if (door) return tall ? [{ kind: 'eshik', h: door }, ...rows] : [...rows, { kind: 'eshik', h: door }];   // shkafda tortma pastda
  return rows;
}

/** TZ-22: eshik qatori modul detallaridan — bitta eshik detali, soni 1 yoki 2. Aniqlab bo'lmasa null (eski qoida: w > 600 → 2).
 *  Bazis'dan olingan modulda (frag.manba.fayl) eshik detali yo'q bo'lsa — eshiksiz (ochiq javon).
 *  Qisman eshik (eni < w − 20, masalan gluxoy burchak: 308 / 258) — Bazis faylidagidek tomoshabinning o'ngida, petlya eshikning
 *  ko'r qism tomonidagi chetida (gluxoy chap.fr3d, gluxoy 2 etaj *.fr3d, antirsol gluxoy 1000 o'ng.fr3d — 2026-10-16 da tekshirildi).
 *  Diqqat: bizda lokal +x — tomoshabinning CHAPI (reja o'ng qo'l tizimida), Bazis'da +X — o'ngi; shuning uchun eshik lokal −x da.
 *  hingeSide / opts.hinge: 'left' — petlya lokal −x chetida (xonadan qaraganda o'ng chet), 'right' — lokal +x chetida. */
export function eshikTuzilmasi(frag, w, d, h, t = 16) {
  const parts = (frag && frag.parts) || [];
  const vars = { w, d, h, t, t_korpus: t };
  const num = (e) => { try { const v = evalFormula(String(e), vars); return v > 0 ? v : 0; } catch (err) { return 0; } };
  const nm = (p) => (p.nom || p.name || '') + ' ' + (p.code || '');
  const ds = parts.filter(p => p.slot === 'fasad' && ESHIK_RE.test(nm(p)) && !TORTMA_RE.test(nm(p)));
  if (!ds.length) return frag && frag.manba && frag.manba.fayl ? { soni: 0 } : null;
  if (ds.length !== 1) return null;                           // ustma-ust eshiklar (penal), shkaflar — eski qoida
  const soni = Math.round(num(ds[0].qty)), eni = num(ds[0].width);
  if (!(soni === 1 || soni === 2) || !(eni > 0)) return null;
  return { soni, eni, qisman: soni === 1 && eni < w - 20 };
}

export function getModulePanels(frag, w, d, h, opts = {}) {
  /* egasi #166: ruchkasiz (Gola) oshxona — eshik va tortmalarda ruchka chizilmaydi (joylashuv bayrog'i p.ruchkasiz) */
  if (opts.ruchkasiz) {
    const r = getModulePanels(frag, w, d, h, Object.assign({}, opts, { ruchkasiz: false }));
    if (r && Array.isArray(r.panels)) for (const q of r.panels) delete q.handle;
    if (r && Array.isArray(r.furn)) r.furn = r.furn.filter(f => f.tur !== 'ruchka');
    return r;
  }
  /* TZ-24 A: qo'lda chizilgan modul — panellar chizmadan (eshik petlyasi, tortmalar, ruchka, oyoq, shtanga) */
  if (frag && frag.chizma) return chizmaPanellar(frag.chizma, w, d, h, { t: opts.thickness || 16 });
  /* TZ-21: Bazis faylidan yuklangan loyiha — panellar fayldagi joyida (engine/bazis/loyiha.js: [x, y, z, w, d, h, slot, mi]).
     TZ-23 A5: material nomi va dekor rangi (taxminiy), egri panel — o'z konturi (shakl), oyoq va ruchka (furn) */
  if (frag && Array.isArray(frag.bazis3d)) {
    const SL = ['korpus', 'fasad', 'orqa'], BM = frag.bazisMat || [], rangi = new Map();
    const dekor = (mi) => { if (!rangi.has(mi)) rangi.set(mi, BM[mi] ? dekorRang(BM[mi][0]) : null); return rangi.get(mi); };
    const shakl = new Map((frag.bazisShakl || []).map(s => [s[0], { o: s[1], m: s[2], t: s[3], p: s[4], h: s[5] || [] }]));
    const panels = frag.bazis3d.map((b, i) => {
      const mi = b[7] == null ? -1 : b[7], m = BM[mi];
      return { id: 'bz' + i, name: frag.name, slot: SL[b[6]] || 'korpus', code: 'bazis', x: b[0], y: b[1], z: b[2], w: b[3], d: b[4], h: b[5],
        mi, material: m ? m[0] : '', rang: dekor(mi), shakl: shakl.get(i) || null };
    });
    const furn = (frag.bazisFurn || []).map(f => ({ tur: f[0] ? 'ruchka' : 'oyoq', o: [f[1], f[2], f[3]], ax: [f[4], f[5], f[6]], az: [f[7], f[8], f[9]], l: f[10] }));
    return { panels, doors: [], furn };
  }
  const t = opts.thickness || 16;       // panel qalinligi (standart 16mm yoki 18mm)
  const cat = (frag && frag.category) || 'cabinet';
  const group = (frag && frag.group) || '';
  const name = (frag && frag.name) || '';
  const panels = [];
  const doors = [];

  // ── 1. Oshxona va Shkaflar (Kabinet, Garderob, Oshxona shkaflari) ──
  const isStorage = /cabinet|wardrobe|kitchen|shelf/i.test(cat) || /shkaf|tumba|penal/i.test(name)
    || (!!opts.tortma && /drawer/i.test(cat));                // tortmali modul (drawer_base) — 3D da shkaf + tortmalar

  if (isStorage) {
    // Tsokol (oyog'i / kickplate)
    const isWallCabinet = /osma|tepa|wall/i.test(group) || /osma/i.test(name) || (h <= 750 && d <= 400);
    const isWardrobe = h >= 1600;
    /* MC (Bazis): korpus oyoqda turadi, sokol — modulning o'z detali korpus OSTIDA (modul balandligidan tashqarida, joy formulasi) */
    const ostiSokol = !!frag.sokol_ichida && hasJoy(frag);
    const cokolH = ostiSokol || isWallCabinet ? 0 : (isWardrobe ? 80 : 100);

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
    if (ostiSokol) {
      for (const q of joyPanellar(frag, w, d, h, { t }).filter(q => q.z + q.h / 2 <= -h / 2 + 1)) {
        panels.push({ id: 'cokol', name: 'Tsokol planka', slot: 'korpus', code: q.code, w: q.w, d: q.d, h: q.h, x: q.x, y: q.y, z: q.z });
      }
    }
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

    // 7) Ichki tokchalar (polka / shelf) — faqat tortmadan iborat modulda javon yo'q (tortma bayrog'i bilan)
    const isDoorless = /ochiq|polka|shelf/i.test(cat) || /ochiq/i.test(name);
    const rows = !isDoorless && opts.tortma ? fasadQatorlari(frag, w, d, h, t, isWardrobe) : null;
    const shelfCount = rows && !rows.some(r => r.kind === 'eshik') ? 0 : isWardrobe ? 3 : (netH > 500 ? 1 : 0);
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
    let doorTop = zBase + netH - 2, doorRowH = netH - 4;     // eshik qatori (tortmasiz — butun fasad)
    if (rows) {
      /* qatorlar fasad balandligiga nisbatan joylashadi (3 mm oraliq) — 3D uchun; o'lcham kesimda o'zgarmaydi */
      const gap = 3, total = rows.reduce((a, r) => a + r.h, 0);
      const k = (netH - 4 - gap * (rows.length - 1)) / total;
      let top = zBase + netH - 2;
      rows.forEach((r, i) => {
        const hh = r.h * k, zc = top - hh / 2;
        if (r.kind === 'eshik') { doorTop = top; doorRowH = hh; }
        else {
          const id = 'tortma_' + (i + 1), bw = Math.max(10, w - 2 * t - 26), bd = Math.max(60, d - 60), bh = Math.max(40, hh - 40);
          const front = {
            id, name: 'Tortma fasadi', slot: 'fasad', code: 'tortma', isFasad: true, isDrawer: true,
            w: Math.max(10, w - 4), d: t, h: hh, x: 0, y: d / 2 + t / 2, z: zc,
            handle: { x: 0, y: d / 2 + t + 10, z: zc + Math.max(0, hh / 2 - 40), w: Math.min(160, w * 0.4), d: 22, h: 12 }
          };
          panels.push(front);
          doors.push(front);
          /* tortma qutisi (yon, orqa, tub) — fasad bilan birga suriladi */
          const by = d / 2 - bd / 2 - 2, bz = zc - hh / 2 + 20 + bh / 2;
          panels.push(
            { id: id + '_yon_chap', drawerOf: id, name: 'Tortma yoni', slot: 'korpus', code: 'tortma_yon', w: t, d: bd, h: bh, x: -bw / 2 + t / 2, y: by, z: bz },
            { id: id + '_yon_ong', drawerOf: id, name: 'Tortma yoni', slot: 'korpus', code: 'tortma_yon', w: t, d: bd, h: bh, x: bw / 2 - t / 2, y: by, z: bz },
            { id: id + '_orqa', drawerOf: id, name: 'Tortma orqasi', slot: 'korpus', code: 'tortma_orqa', w: Math.max(10, bw - 2 * t), d: t, h: bh, x: 0, y: by - bd / 2 + t / 2, z: bz },
            { id: id + '_tub', drawerOf: id, name: 'Tortma tubi', slot: 'orqa', code: 'tortma_tub', w: bw, d: bd, h: 3, x: 0, y: by, z: bz - bh / 2 + 1.5 }
          );
        }
        top -= hh + gap;
      });
    }
    /* TZ-22: opts.eshiklar (yangi sayt 3D va eshik tekshiruvi) — eshik soni/eni detallardan, bitta eshik petlyasi — opts.hinge.
       Bayroqsiz (kesim, narx, BPJ/OBJ/GLB) — avvalgidek. */
    const ed = opts.eshiklar ? eshikTuzilmasi(frag, w, d, h, t) : null;
    if (!isDoorless && (!rows || rows.some(r => r.kind === 'eshik')) && !(ed && ed.soni === 0)) {
      const doorH = Math.max(10, doorRowH);
      const zDoor = rows ? doorTop - doorRowH / 2 : zBase + netH / 2;   // tortmasiz — aynan avvalgi qiymat
      const isTwoDoors = ed ? ed.soni === 2 : w > 600;

      if (ed && ed.qisman) {
        /* gluxoy burchak: eshik tomoshabinning o'ngida (lokal −x), petlya — ko'r qism tomonidagi chetida (+x),
           tutqich — tashqi chetida; qolgani (lokal +x tomoni) — qo'zg'almas fasad */
        const doorW = Math.min(ed.eni, w - 4), x = -w / 2 + 2 + doorW / 2, bw = Math.max(10, w - 4 - doorW - 2);
        const door = {
          id: 'fasad_1', name: 'Fasad eshik', slot: 'fasad', code: 'eshik', isFasad: true, isDoor: true,
          w: doorW, d: t, h: doorH, x, y: d / 2 + t / 2, z: zDoor, hingeSide: 'right',
          handle: { x: x - doorW / 2 + 35, y: d / 2 + t + 10, z: zDoor, w: 12, d: 22, h: 120 }
        };
        panels.push(door, {
          id: 'gluxoy_fasad', name: 'Gluxoy fasad', slot: 'fasad', code: 'gluxoy', isFasad: true,
          w: bw, d: t, h: doorH, x: w / 2 - 2 - bw / 2, y: d / 2 + t / 2, z: zDoor
        });
        doors.push(door);
      } else if (!isTwoDoors) {
        // Bitta eshik (TZ-22: petlya tomoni — joylashuvdan, opts.hinge; tutqich qarama-qarshi chetda)
        const doorW = Math.max(10, w - 4);
        const ong = !!ed && opts.hinge === 'right';
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
          z: zDoor,
          hingeSide: ong ? 'right' : 'left',
          handle: {
            x: ong ? -(doorW / 2 - 35) : doorW / 2 - 35,
            y: d / 2 + t + 10,
            z: zDoor,
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
          z: zDoor,
          hingeSide: 'left',
          handle: {
            x: -w / 4 + doorW / 2 - 25,
            y: d / 2 + t + 10,
            z: zDoor,
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
          z: zDoor,
          hingeSide: 'right',
          handle: {
            x: w / 4 - doorW / 2 + 25,
            y: d / 2 + t + 10,
            z: zDoor,
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
