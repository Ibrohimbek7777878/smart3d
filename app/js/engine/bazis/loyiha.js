/* Smart3D engine/bazis/loyiha.js — TZ-21: o'qilgan Bazis obyektlari → Smart3D (bitta fragment + 3D panellar).
 *
 * Kirish: daraxt.js (yoki b3d.js) obyektlari — panel: name, material, thickness, butts, contour_outer, tf {pos, oq}.
 * Chiqish: { fragment, materiallar: {panel, edge}, hisobot }
 *   fragment — katalog yozuvi (o'lchami qat'iy): parts (har detal o'z materiali bilan — material_code), edge (detal tomonlari
 *   bo'yicha kromka), hardware (furnitura + mahkamlagich, kod 'BZ-' + slug — fr3d_import.py bilan bir xil), bazis3d (3D quti).
 *   materiallar — Bazis material nomlari uchun sintetik kodlar (BZM-…, BZE-…): raskroy har dekorni alohida listda hisoblaydi;
 *   narxi — turdagi asosiy materialdan (LDSP16 …), "taxminiy" (decor narxi — TZ-20).
 * Ishlab chiqarishga kirmaydi: materialsiz, plastik/alyuminiy/PET (kesilmaydi), shisha/oyna (buyurtma qilinadi) — hisobotda.
 * O'qlar: Bazis X o'ng, Y tepa, Z old (tomoshabinga) → Smart3D x = −X (bizda +x — tomoshabinning chapi), y = Z (old), z = Y.
 * Panel qalinligi lokal +Z tomonga (MC modullarida tekshirildi: ustma-ust tushish 0).
 */
import { PANEL_CODE } from './b3d.js';

const TUR = [
  ['stoleshnitsa', /столешн|stoleshn/i],
  ['hdf', /лхдф|хдф|двп|\bhdf\b|lhdf|xdf|dvp/i],
  ['lmdf', /лмдф|lmdf/i],
  ['akril', /акрил|acryl|akril|\bagt\b/i],
  ['mdf', /мдф|\bmdf\b/i],
  ['oyna', /стекл|зеркал|steklo|zerkalo|\boyna\b/i],
  ['boshqa', /пластик|plastik|алюмин|aluminiy|пэт|\bpet\b|профил|хром|xrom|метал|metal/i],
  ['ldsp', /лдсп|дсп|ldsp|\bdsp\b|egger|эггер|kronospan|кроношпан|ультрадекор|lamarty|ламарти|каштан|союз|шпон|фанера/i]
];
const ISHLAB = { ldsp: 1, lmdf: 1, mdf: 1, akril: 1, hdf: 1, stoleshnitsa: 1 };
/* list o'lchami material nomida yashirin (Smart3D_toplam README): maydon m² → o'lcham */
const MAYDON = { '5.796': [2800, 2070], '5.0325': [2750, 1830], '5.175': [2500, 2070], '4.575': [2500, 1830], '2.9768': [2440, 1220], '2.928': [2440, 1200] };

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const toza = (s) => String(s || '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
/** fr3d_import.py slug() bilan bir xil (id-links.json dagi BZ- kodlariga mos) */
export const slug = (s) => (Array.from(String(s || '').toLowerCase()).map(c => TR[c] != null ? TR[c] : c).join('').replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')) || 'detal';

/** material nomi + qalinlik → { tur, ishlab, asos (materials.json kodi), varaq } */
export function materialTuri(nom, t) {
  const n = String(nom || '');
  let tur = n ? null : 'yoq';
  for (const [k, re] of TUR) if (!tur && re.test(n)) tur = k;
  if (!tur) tur = t >= 8 && t <= 40 ? 'ldsp' : 'boshqa';     // nomi tanilmagan plita — qalinligi bo'yicha
  const asos = tur === 'hdf' ? 'HDF3' : tur === 'lmdf' ? 'LMDF16' : tur === 'mdf' || tur === 'akril' ? (t <= 10 ? 'MDF8' : t <= 17 ? 'MDF16' : 'MDF18')
    : tur === 'oyna' ? 'OYNA' : t <= 17 ? 'LDSP16' : 'LDSP18';
  let varaq = null;
  const m = n.match(/(\d{4})\s*[*xхX×]\s*(\d{3,4})/);
  if (m) varaq = [+m[1], +m[2]].sort((a, b) => b - a);
  else { const a = n.match(/(\d)[,.](\d{2,4})/); if (a && MAYDON[a[1] + '.' + a[2]]) varaq = MAYDON[a[1] + '.' + a[2]]; }
  return { tur, ishlab: !!ISHLAB[tur], asos, varaq };
}

/** kromka nomi → qalinlik ("19/1" → 1, "21/0.8" → 0.8) */
function kromkaQalinlik(b) {
  if (b.thickness > 0 && b.thickness <= 5) return b.thickness;
  const m = String(b.name || '').match(/\d{2}\s*\/\s*(\d+(?:[.,]\d+)?)/);
  return m ? +m[1].replace(',', '.') : 1;
}

/** kontur elementi qaysi tomonda: F/B — uzunlik (X) bo'ylab, L/R — en (Y) bo'ylab */
function tomon(el, bb) {
  const [x1, y1] = el.p1, [x2, y2] = el.p2;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  if (el.type === 'line' ? dx >= dy : Math.min(Math.abs(my - bb.y0), Math.abs(my - bb.y1)) <= Math.min(Math.abs(mx - bb.x0), Math.abs(mx - bb.x1))) {
    return my > (bb.y0 + bb.y1) / 2 ? 'F' : 'B';
  }
  return mx > (bb.x0 + bb.x1) / 2 ? 'R' : 'L';
}

function konturBox(els) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of els) for (const p of [e.p1, e.p2, e.center].filter(Boolean)) {
    if (e.type === 'arc' && p === e.center) continue;
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  /* yoy chiqib turgan qismi — b3d.js contourBBox bilan bir xil (ko'pburchak) */
  for (const e of els) {
    if (e.type !== 'arc') continue;
    const cx = e.center[0], cy = e.center[1], rr = Math.hypot(e.p1[0] - cx, e.p1[1] - cy);
    let a1 = Math.atan2(e.p1[1] - cy, e.p1[0] - cx), a2 = Math.atan2(e.p2[1] - cy, e.p2[0] - cx);
    if (e.dir) { while (a2 <= a1) a2 += Math.PI * 2; } else { while (a2 >= a1) a2 -= Math.PI * 2; }
    for (let k = 0; k <= 10; k++) { const a = a1 + (a2 - a1) * k / 10, x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1 };
}

const ESHIK = /двер|dver|eshik|фасад|fasad|ящик/i;
const PANEL3D_MAX = 2000;

/**
 * @param {Array} objects — daraxt.js / b3d.js obyektlari
 * @param {{ nom?: string, fayl?: string, format?: string, fittings?: Array, fasteners?: Array }} o
 *        fittings/fasteners — b3d.js generateSpecification natijasidan (furnitura ro'yxati)
 */
export function bazisLoyiha(objects, o = {}) {
  const panels = (objects || []).filter(x => x.modelCode === PANEL_CODE && x.contour_outer && x.contour_outer.length);
  const matlar = new Map(), kromkalar = new Map(), guruh = new Map();
  const chiqarildi = {};
  const boxes = [];
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];

  for (const p of panels) {
    const bb = konturBox(p.contour_outer);
    const dl = Math.round(bb.x1 - bb.x0), dw = Math.round(bb.y1 - bb.y0), t = Math.round(p.thickness || 16);
    if (!(dl > 0 && dw > 0)) continue;
    const nom = toza(p.name) || '?';
    const mnom = toza(p.material);
    const mt = materialTuri(mnom, t);
    /* 3D: global quti (Bazis o'qlari) */
    const tf = p.tf && p.tf.oq ? p.tf : { pos: (p.tf && p.tf.pos) || [0, 0, 0], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
    const c0 = [Infinity, Infinity, Infinity], c1 = [-Infinity, -Infinity, -Infinity];
    for (const x of [bb.x0, bb.x1]) for (const y of [bb.y0, bb.y1]) for (const z of [0, t]) {
      for (let i = 0; i < 3; i++) { const v = tf.pos[i] + x * tf.oq[0][i] + y * tf.oq[1][i] + z * tf.oq[2][i]; c0[i] = Math.min(c0[i], v); c1[i] = Math.max(c1[i], v); }
    }
    /* Smart3D o'qlari: x = −X, y = Z, z = Y */
    const a0 = [-c1[0], c0[2], c0[1]], a1 = [-c0[0], c1[2], c1[1]];
    for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a0[i]); mx[i] = Math.max(mx[i], a1[i]); }
    const slot = mt.tur === 'hdf' ? 'orqa' : (ESHIK.test(nom) || mt.tur === 'akril') ? 'fasad' : 'korpus';
    if (boxes.length < PANEL3D_MAX) boxes.push({ a0, a1, slot, nom });

    if (!mt.ishlab) {
      const k = mt.tur === 'yoq' ? 'materialsiz' : mt.tur;
      const c = chiqarildi[k] || (chiqarildi[k] = { soni: 0, misol: [] });
      c.soni++; if (c.misol.length < 3 && !c.misol.includes(nom)) c.misol.push(nom);
      continue;
    }
    /* material — sintetik kod (dekor bo'yicha alohida list) */
    const mkod = 'BZM-' + fnv(mnom + '|' + t);
    if (!matlar.has(mkod)) matlar.set(mkod, { code: mkod, name: mnom, thickness: t, tur: mt.tur, asos: mt.asos, varaq: mt.varaq, detal: 0 });
    matlar.get(mkod).detal++;
    /* kromka: tomon → kromka kodi */
    const tomonlar = {};
    for (const b of p.butts || []) {
      const ei = b.edgeIndex;
      if (ei == null || ei >= p.contour_outer.length) continue;
      const knom = toza(b.name) || 'Kromka';
      const kq = kromkaQalinlik(b);
      const kkod = 'BZE-' + fnv(knom + '|' + kq);
      if (!kromkalar.has(kkod)) kromkalar.set(kkod, { code: kkod, name: knom, thickness: kq });
      tomonlar[tomon(p.contour_outer[ei], bb)] = kkod;
    }
    const imzo = Object.keys(tomonlar).sort().map(s => s + ':' + tomonlar[s]).join(',');
    const key = [nom, dl, dw, t, mkod, imzo].join('|');
    if (!guruh.has(key)) guruh.set(key, { nom, dl, dw, t, mkod, tomonlar, slot, tur: mt.tur, mnom, soni: 0 });
    guruh.get(key).soni++;
  }

  if (!isFinite(mn[0])) return { xato: 'S3D-BAZIS-104' };   // panel topilmadi
  const W = Math.max(1, Math.round(mx[0] - mn[0])), D = Math.max(1, Math.round(mx[1] - mn[1])), H = Math.max(1, Math.round(mx[2] - mn[2]));
  const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
  const SLOT = ['korpus', 'fasad', 'orqa'];
  /* 3D: [x, y, z, w, d, h, slot] — markazga nisbatan (assembler bilan bir xil), ixcham (server: ro'yxat ≤ 2000) */
  const bazis3d = boxes.map(b => [
    Math.round((b.a0[0] + b.a1[0]) / 2 - cx), Math.round((b.a0[1] + b.a1[1]) / 2 - cy), Math.round((b.a0[2] + b.a1[2]) / 2 - cz),
    Math.max(1, Math.round(b.a1[0] - b.a0[0])), Math.max(1, Math.round(b.a1[1] - b.a0[1])), Math.max(1, Math.round(b.a1[2] - b.a0[2])),
    SLOT.indexOf(b.slot)]);

  const parts = [], edge = [];
  let n = 0;
  for (const g of [...guruh.values()].sort((a, b) => b.soni - a.soni || (b.dl * b.dw) - (a.dl * a.dw))) {
    const code = 'bz' + (++n);
    parts.push({ code, nom: g.nom, qty: g.soni, len: String(g.dl), width: String(g.dw), slot: g.slot, material_code: g.mkod,
      tekstura: g.tur === 'hdf' ? 'erkin' : 'uzunlik', bazis_material: g.mnom });
    const boyicha = {};
    for (const [s, k] of Object.entries(g.tomonlar)) (boyicha[k] = boyicha[k] || []).push(s);
    for (const [k, sides] of Object.entries(boyicha)) edge.push({ code, sides: sides.sort(), material: k, thickness: kromkalar.get(k).thickness });
  }
  const hardware = [];
  for (const [list, tur] of [[o.fittings || [], 'furnitura'], [o.fasteners || [], 'mahkamlagich']]) {
    for (const x of list) hardware.push({ code: 'BZ-' + slug(x.name).slice(0, 40), name: toza(x.name), qty: Math.max(1, Math.round(+x.count || 1)), unit: x.unit || 'dona', tur });
  }
  const nomi = toza(o.nom || o.fayl || 'Bazis loyiha');
  const fragment = {
    code: 'BZ-' + fnv(nomi + '|' + parts.map(p => p.code + p.len + p.width + p.qty).join(',')),
    name: nomi, category: 'bazis', group: 'bazis', w: W, d: D, h: H,
    min_w: W, max_w: W, min_d: D, max_d: D, min_h: H, max_h: H, stretch_axis: '',
    price_mode: 'unit', price: 0, production: 'panel', auto_hardware: false,
    slots: { korpus: 'LDSP16', fasad: 'LDSP16', orqa: 'HDF3' },
    parts, edge, holes: [], hardware, bazis3d,
    manba: { bazis: true, fayl: toza(o.fayl), format: o.format || '', panellar: panels.length }
  };
  const hisobot = {
    panellar: panels.length,
    detal: parts.reduce((a, p) => a + p.qty, 0),
    detalTuri: parts.length,
    chiqarildi,
    materiallar: [...matlar.values()],
    kromkalar: [...kromkalar.values()],
    furnitura: (o.fittings || []).length, mahkamlagich: (o.fasteners || []).length,
    olcham: [W, D, H],
    kesildi3d: panels.length > PANEL3D_MAX
  };
  return { fragment, materiallar: { panel: [...matlar.values()], edge: [...kromkalar.values()] }, hisobot };
}

/**
 * Sintetik Bazis materiallarini hisob bazasiga qo'shish (bor bo'lsa — o'zgarmaydi). Narx — asosiy turdan (taxminiy).
 * @returns {number} qo'shilganlar soni
 */
export function materiallarniQosh(materials, mat) {
  const pl = materials.panel_materials || (materials.panel_materials = []);
  const el = materials.edge_materials || (materials.edge_materials = []);
  let n = 0;
  for (const m of (mat && mat.panel) || []) {
    if (pl.some(x => x.code === m.code)) continue;
    const a = pl.find(x => x.code === m.asos) || pl[0] || {};
    pl.push({ code: m.code, name: m.name, thickness: m.thickness, factor: a.factor, sheet_price: a.sheet_price,
      sheets: m.varaq ? [m.varaq] : (a.sheets || [[2800, 2070]]), src: 'Bazis — ' + (a.code || '?') + ' narxi (taxminiy)', bazis: true });
    n++;
  }
  for (const e of (mat && mat.edge) || []) {
    if (el.some(x => x.code === e.code)) continue;
    const a = el.find(x => x.code === (e.thickness >= 1.5 ? 'PVC2' : 'PVC04')) || el[0] || {};
    el.push({ code: e.code, name: e.name, price_m: a.price_m, thickness: e.thickness, thickness_src: 'Bazis', bazis: true });
    n++;
  }
  return n;
}
