/* Smart3D engine/objexport.js — OBJ + yon fayllar export.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 20):
 *   1. Har bir modul haqiqiy PANELLAR majmuasi (`g <kod>_<id>_<panel>`) bilan
 *      eksport qilinadi (yaxlit quti emas!).
 *   2. SketchUp, 3ds Max, Blender, Bazis'da ochilganda har bir panel
 *      (yon devor, tub, qopqoq, eshik, tokcha, ruchka) alohida komponent
 *      sifatida tahrirlanadi.
 *   3. Material slotlari (`cat_korpus`, `cat_fasad`, `cat_orqa`, `cat_handle`)
 *      MTL fayl orqali to'g'ri bo'yaladi.
 *   4. O'lcham birligi: MM (millimetr). Koordinatalar: Z-up.
 *
 * Chiqish: obj (geometriya) + mtl + holes.json + placement.csv + cutlist.csv
 */
import { getModulePanels } from './assembler.js';
import { triangulate } from './geom.js';

const fmt = (n) => (Math.round(n * 10000) / 10000).toFixed(4);

/** Kategoriya va slotlar → MTL ranglari. */
const MTL_COLOR = {
  cabinet: [0.85, 0.79, 0.66],
  wardrobe: [0.85, 0.79, 0.66],
  kitchen: [0.85, 0.79, 0.66],
  korpus: [0.85, 0.79, 0.66],
  fasad: [0.28, 0.33, 0.41],   // zamonaviy to'q fasad
  orqa: [0.81, 0.77, 0.70],    // HDF
  polka: [0.88, 0.84, 0.74],
  handle: [0.12, 0.16, 0.23],  // qora metall tutqich
  bathroom: [0.81, 0.86, 0.84],
  sofa: [0.84, 0.76, 0.72],
  table: [0.88, 0.83, 0.73],
  chair: [0.88, 0.83, 0.73],
  bed: [0.84, 0.76, 0.72],
  shelf: [0.86, 0.82, 0.75],
  door: [0.79, 0.72, 0.60],
  window: [0.74, 0.82, 0.86],
  other: [0.85, 0.82, 0.77],
  wall: [0.91, 0.89, 0.83],
  floor: [0.95, 0.93, 0.89],
  pipe: [0.55, 0.60, 0.66],    // quvur — kulrang metall
  outlet: [0.20, 0.24, 0.30]   // rozetka — quyuq plastik
};

/** smart3d.mtl — material kutubxonasi. */
function buildMTL(catalog) {
  const cats = new Set(['wall', 'floor', 'korpus', 'fasad', 'orqa', 'polka', 'handle', 'pipe', 'outlet']);
  for (const f of Object.values(catalog || {})) {
    if (f.category) cats.add(f.category);
  }
  const out = [
    '# Smart3D material kutubxonasi (MTL)',
    '# Sanoat standarti: korpus, fasad, HDF, metall va mebel turlari'
  ];
  for (const c of cats) {
    const rgb = MTL_COLOR[c] || MTL_COLOR.other;
    out.push(
      '',
      'newmtl cat_' + c,
      'Ka 0.2 0.2 0.2',
      'Kd ' + rgb.join(' '),
      'Ks 0.1 0.1 0.1',
      'Ns 20',
      'illum 2'
    );
  }
  return out.join('\n') + '\n';
}

/**
 * Butun loyiha hujjatini detallarga ajratilgan sanoat darajasidagi OBJ'ga aylantiradi.
 * @param {Object} doc — {room:{outline, wall_height, openings}, placements:[{id,frg,x,y,z,w,d,h,rot,qty}]}
 * @param {Object} catalog — {code: frag}
 * @returns {{obj:string, mtl:string, holes:any[], placements:any[]}}
 */
export function buildOBJ(doc, catalog, opt = {}) {
  const out = { v: [], f: [] };
  /* TZ-06: MebelCity teshiklari (Bazis birikmalari) — cutlist'da modul o'lchamida hisoblangan */
  const clById = {};
  for (const cl of opt.cutlists || []) if (cl.placementId != null) clById[cl.placementId] = cl;
  let base = 0;
  const holes = [], placementRows = [];

  const header = [
    '# Smart3D Detallashtirilgan Model Eksporti (OBJ)',
    '# units: mm · axes: x=width y=depth z=height (Z-up)',
    '# Har bir mebel haqiqiy panellar (yon, tub, qopqoq, eshik, tokcha) bilan yozilgan',
    'mtllib smart3d.mtl'
  ].join('\n');

  /* ── 1) Pol / xona (outline ko'tarilgan holda) ─────────────────── */
  const room = doc.room || {};
  const outline = room.outline || [];
  const wh = +room.wall_height || 2700;
  if (outline.length >= 3) {
    out.v.push('o floor');
    out.v.push('usemtl cat_floor');
    out.v.push(`# xona poligoni`);
    const start = base;
    for (const p of outline) {
      out.v.push(`v ${fmt(+p[0])} ${fmt(+p[1])} 0`);
      base++;
    }
    // pol — F1: konkav (L shakl) kontur uchun triangulyatsiya (n-urchak emas)
    for (const t of triangulate(outline.map(p => [+p[0], +p[1]]))) {
      out.f.push(`f ${t.map(i => start + i + 1).join(' ')}`);
    }

    // devorlar
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const dx = +b[0] - +a[0], dy = +b[1] - +a[1];
      const len = Math.hypot(dx, dy);
      const th = +room.wall_thickness || 100;
      const ang = Math.atan2(dy, dx);
      out.v.push(`o wall_${i + 1}`);
      out.v.push('usemtl cat_wall');

      const c = Math.cos(ang), s = Math.sin(ang);
      const perpX = -s * th, perpY = c * th;

      const p0 = [+a[0], +a[1]];
      const p1 = [+b[0], +b[1]];
      const p2 = [+b[0] + perpX, +b[1] + perpY];
      const p3 = [+a[0] + perpX, +a[1] + perpY];

      const b0 = base;
      for (const pt of [p0, p1, p2, p3]) out.v.push(`v ${fmt(pt[0])} ${fmt(pt[1])} 0`);
      for (const pt of [p0, p1, p2, p3]) out.v.push(`v ${fmt(pt[0])} ${fmt(pt[1])} ${fmt(wh)}`);
      base += 8;
      const fc = [
        [1, 2, 3, 4], [5, 8, 7, 6], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 8, 4], [4, 8, 5, 1]
      ];
      for (const f4 of fc) out.f.push(`f ${f4.map(n => n + b0).join(' ')}`);
    }

    /* ── 1b) F1: quvur/rozetka (room.utilities) — devor yuzasida ── */
    const utils = room.utilities || [];
    if (utils.length) {
      const th = +room.wall_thickness || 100;
      const emitBox = (cx, cy, cz, ex, ey, ez, ang, name) => {
        out.v.push(`o ${name}`);
        const c = Math.cos(ang), s = Math.sin(ang);
        const corners = [];
        for (const sx of [-ex, ex]) for (const sy of [-ey, ey]) for (const sz of [-ez, ez]) {
          const lx = sx * c - sy * s, ly = sx * s + sy * c;
          corners.push([cx + lx, cy + ly, cz + sz]);
        }
        const b = base;
        for (const pt of corners) { out.v.push(`v ${fmt(pt[0])} ${fmt(pt[1])} ${fmt(pt[2])}`); base++; }
        // 6 ta yuz (corner indeksi: [−x−y−z, +x−y−z, +x+y−z, −x+y−z, −x−y+z, +x−y+z, +x+y+z, −x+y+z])
        const f6 = [
          [1, 2, 3, 4], [5, 8, 7, 6], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 8, 4], [4, 8, 5, 1]
        ];
        for (const f4 of f6) out.f.push(`f ${f4.map(n => n + b).join(' ')}`);
      };
      for (let ui = 0; ui < utils.length; ui++) {
        const u = utils[ui];
        const wi = Number(u.wall);
        if (!(wi >= 0) || wi >= outline.length) continue;
        const a = outline[wi], b2 = outline[(wi + 1) % outline.length];
        const ex = +b2[0] - +a[0], ey = +b2[1] - +a[1];
        const len = Math.hypot(ex, ey);
        if (len < 1) continue;
        const t = Math.max(0, Math.min(1, (Number(u.offset) || 0) / len));
        const px = +a[0] + ex * t, py = +a[1] + ey * t;
        const z = Math.max(50, Math.min(wh - 50, Number(u.z) || 1000));
        const ang = Math.atan2(ey, ex);
        if (u.type === 'outlet') {
          out.v.push('usemtl cat_outlet');
          emitBox(px, py, z, 35, th / 2 + 11, 35, ang, `rozetka_${ui + 1}`);
        } else {
          out.v.push('usemtl cat_pipe');
          emitBox(px, py, z, 25, th / 2 + 40, 25, ang, `quvur_${ui + 1}`);
        }
      }
    }
  }

  /* ── 2) Mebellar: har bir mebel panellar bo'yicha eksport qilinadi ── */
  for (const p of doc.placements || []) {
    const frag = catalog[p.frg];
    if (!frag) continue;
    const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
    const ox = +p.x || 0, oy = +p.y || 0, oz = +p.z || 0;
    const rot = ((+p.rot || 0) % 360 + 360) % 360;
    const qty = Math.max(1, Math.round(+p.qty || 1));

    // Panellarni aniqlash
    const asm = getModulePanels(frag, w, d, h);

    for (let n = 0; n < qty; n++) {
      const modName = `${p.frg}_${p.id}${qty > 1 ? '_' + (n + 1) : ''}`;
      out.v.push('');
      out.v.push(`# ===================================================`);
      out.v.push(`# Modul: ${frag.name || p.frg} · ${w}×${d}×${h} mm (${asm.panels.length} panel)`);
      out.v.push(`o ${modName}`);

      const rad = rot * Math.PI / 180;
      const cs = Math.cos(rad), sn = Math.sin(rad);
      const cx = ox + (w / 2) * cs - (d / 2) * sn;
      const cy = oy + (w / 2) * sn + (d / 2) * cs;
      const cz = oz + h / 2;

      // Panel qutisini world koordinatasiga yozish
      function writeBox(px, py, pz, pw, pd, ph) {
        const x0 = px - pw / 2, x1 = px + pw / 2;
        const y0 = py - pd / 2, y1 = py + pd / 2;
        const z0 = pz - ph / 2, z1 = pz + ph / 2;
        const pts = [
          [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
          [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
        ];
        const b0 = base;
        for (const pt of pts) {
          const wx = cx + pt[0] * cs - pt[1] * sn;
          const wy = cy + pt[0] * sn + pt[1] * cs;
          const wz = cz + pt[2];
          out.v.push(`v ${fmt(wx)} ${fmt(wy)} ${fmt(wz)}`);
        }
        base += 8;
        const fc = [
          [1, 2, 3, 4], [5, 8, 7, 6], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 8, 4], [4, 8, 5, 1]
        ];
        for (const f4 of fc) out.f.push(`f ${f4.map(idx => idx + b0).join(' ')}`);
      }

      // Har bir panelni guruh (group) sifatida yozish
      for (const panel of asm.panels) {
        out.v.push(`g ${modName}_${panel.id}`);
        out.v.push(`usemtl cat_${panel.slot || 'korpus'}`);
        writeBox(panel.x, panel.y, panel.z, panel.w, panel.d, panel.h);

        // Tutqich (handle)
        if (panel.handle) {
          out.v.push(`g ${modName}_${panel.id}_handle`);
          out.v.push(`usemtl cat_handle`);
          writeBox(
            panel.handle.x, panel.handle.y, panel.handle.z,
            panel.handle.w, panel.handle.d, panel.handle.h
          );
        }
      }

      /* — holes.json uchun — */
      for (const hl of frag.holes || []) {
        holes.push({
          placement: p.id, fragment: p.frg, part: hl.part, side: hl.side,
          kind: hl.kind, dia: hl.dia, depth: hl.depth,
          local_x: hl.x, local_y: hl.y,
          world: { x: Math.round(ox), y: Math.round(oy), z: Math.round(oz) },
          size: { w, d, h }, qty: Math.max(1, Math.round(+hl.qty || 1)),
          rotated: rot
        });
      }
      const bHoles = frag.birikmalar && clById[p.id] ? clById[p.id].holes.filter(hl => /^(evrovint|d6_eks)/.test(hl.kind)) : [];   // birikma: konfirmat yoki eksentrik (d6.js EKS)
      for (const hl of bHoles) {
        holes.push({
          placement: p.id, fragment: p.frg, part: hl.part, side: hl.side, torets: hl.torets,
          kind: hl.kind, dia: hl.dia, depth: hl.depth,
          local_x: hl.x, local_y: hl.y,          // kesilgan detal burchagidan: x — F chetdan, y — L chetdan
          world: { x: Math.round(ox), y: Math.round(oy), z: Math.round(oz) },
          size: { w, d, h }, qty: 1, nusxa: hl.nusxa,
          rotated: rot
        });
      }

      placementRows.push({
        id: p.id, fragment: p.frg, name: frag.name || '',
        x: Math.round(ox), y: Math.round(oy), z: Math.round(oz),
        rot, w, d, h,
        panels: asm.panels.length, holes: (frag.holes || []).length + bHoles.length,
        material: frag.material_code || '', qty: 1
      });
    }
  }

  return {
    obj: header + '\n' + out.v.join('\n') + '\n' + out.f.join('\n') + '\n',
    mtl: buildMTL(catalog),
    holes,
    placements: placementRows
  };
}

/** Cutlist → CSV (Bazis/SketchUp atribut uchun). */
export function cutlistCSV(cutlists) {
  const rows = [['fragment', 'detail', 'length_mm', 'width_mm', 'material']];
  for (const cl of cutlists || []) {
    for (const p of cl.parts || []) {
      rows.push([cl.fragment, p.code, p.length, p.width, p.material || '']);
    }
  }
  return rows.map(r => r.join(';')).join('\r\n') + '\r\n';
}

/** Smeta → CSV (narx jadvali). */
export function smetaCSV(lines, total) {
  const head = ['Guruh', 'Nomi', 'Miqdor', 'Birlik', 'Birlik narxi', 'Summa'];
  const rows = [head];
  for (const l of lines || []) {
    rows.push([l.group, l.name, l.qty, l.unit, l.unit_price, l.amount]);
  }
  rows.push(['', '', '', '', 'JAMI', total]);
  return rows.map(r => r.join(';')).join('\r\n') + '\r\n';
}

/** XNC CSV — GibLab "Импорт из Excel" uchun detal ro'yxati (kod 1_1). */
export function xncCSV(cutlists, materials, catalog) {
  const head = ['№', 'Kod', 'Nomi', 'Uzunlik', 'Kenglik', 'Qalinlik', 'Soni', 'Material', 'Tekstura', 'Izoh'];
  const rows = [head];
  let idx = 1;
  for (const cl of cutlists || []) {
    const frag = (catalog && catalog[cl.fragment]) || {};
    for (const p of cl.parts || []) {
      const qty = Math.max(1, Math.round(+p.qty || 1));
      const mat = p.material || cl.material || 'LDSP16';
      const code = `${idx}_1`;
      const name = p.name || p.code || 'Panel';
      const l = Math.round(p.length || 0);
      const w = Math.round(p.width || 0);
      const th = Math.round(p.thickness || 16);
      const texture = p.grain ? '1' : '0';
      const note = `${cl.fragment} (${frag.name || ''})`;
      rows.push([idx, code, name, l, w, th, qty, mat, texture, note]);
      idx++;
    }
  }
  return rows.map(r => r.join(';')).join('\r\n') + '\r\n';
}

/* TZ-16: muqobil yuklash (Telegram Mini App — fayl bot chatiga yuboriladi); null — oddiy brauzer yuklab olishi */
let downloadHandler = null;
export function setDownloadHandler(fn) { downloadHandler = typeof fn === 'function' ? fn : null; }
export const hasDownloadHandler = () => !!downloadHandler;

/** Brauzerda faylni xavfsiz yuklab olish yordamchisi. */
export function download(filename, content, mime) {
  if (downloadHandler) return downloadHandler(filename, content, mime);
  if (typeof window === 'undefined' || !window.document) return;
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
