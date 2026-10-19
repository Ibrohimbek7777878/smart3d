/* Smart3D engine/teshik3d.js — egasi #167: teshik, kromka va zapchast joylari 3D da (rentgen, "Ichini ko'rish", detal kartasi).
 *
 * Manba — faqat kesim ro'yxati (cutlist: holes, edges) va detal joyi (joy, engine/d6.js joyQutilar — cutlist D6 bilan bir xil
 * qutilar, nusxa `ref` bilan). Hech narsa o'ylab topilmaydi: joyi yo'q teshik (narx_uchun, Bazis importi; joysiz SP shabloni)
 * chizilmaydi.
 * Teshik nuqtasi — stanok eksportchisi (post/smart3d.js) konvertatsiyasi: tayyor detal o'qlari (cutlist teshigi kesim o'lchamida —
 *   F va L kromkasi qaytariladi: v = x + ded(F), u = y + ded(L)), keyin d6.js mahalliy() ning teskarisi: y — uzunlik o'qi (la)
 *   L uchidan, x — eni o'qi (wa) F qirradan (korpus detalida F — o'qning katta tomoni, eshik/tortma fasadida — kichigi).
 *   Yuza: d6.js yuzaRaqami() (1-yuza normali = (L→R) × (F→B)); side 'B' (yuzasiz) — 2-yuza (BPJ bilan bir xil); torets ('T') —
 *   L/R — uzunlik uchlari, F/B — bo'ylama qirralar, qalinlik o'rtasida.
 * Bazis o'qlari → Smart3D modul lokal (markazlangan, joy.js): x = W/2 − X, y = Z − D/2, z = Y − H/2.
 * Kromka — cutlist edges (detal kodi, tomonlar F/B/L/R, qalinlik): har nusxaning o'sha qirrasi bo'ylab ingichka tasma.
 * Zapchast belgisi — teshiklardan: petlya (kosa joyida), polka ushlagich, ruchka (juft teshik orasida), yo'naltiruvchi (qator);
 * TZ-38: konfirmat (yuza evrovint teshigi — vint shu teshikda), ekssentrik (d6_eksentrik kosasi), oyoq (kesim ro'yxatida "nojka" 4 dona
 * bo'lsa — pastki detal burchaklarida; joyi taxminiy: burchakdan 50 mm, `taxminiy: true`). Har belgi: tur, p (mm), n, code/ref (detal), i (tartib raqami). */
import { joyQutilar, yuzaRaqami } from './d6.js';
import { chizmaYech } from './chizish.js';
import { EDGE_DEDUCT_MIN_MM } from './cutlist.js';

const LW = { X: ['Y', 'Z'], Y: ['X', 'Z'], Z: ['Y', 'X'] };
/** teshik turi (rang guruhi) — kind bo'yicha */
export const TESHIK_TUR = {
  evrovint: 'konfirmat', evrovint_torets: 'konfirmat',
  d6_kosa: 'petlya', d6_vint: 'petlya', d6_planka: 'petlya',
  d6_polka: 'polka', d6_ruchka: 'ruchka', d6_napr: 'napr',
  d6_eksentrik: 'eksentrik', d6_eks_qirra: 'eksentrik', d6_eks_bolt: 'eksentrik'
};
export const TURLAR = ['konfirmat', 'petlya', 'polka', 'ruchka', 'eksentrik', 'napr', 'boshqa'];
/** TZ-38: zapchast belgisi turlari (3D da chiziladi): oldingi to'rttasi + konfirmat, ekssentrik, oyoq */
export const ZAPCHAST_TURLAR = ['petlya', 'polka', 'ruchka', 'napr', 'konfirmat', 'eksentrik', 'oyoq'];
/** bitta palitra (dizayn tokenlari: --acc #FF7A45, --cyan #5FE1C4 va ular bilan uyg'un ranglar) */
export const RANG = { konfirmat: 0xFFC247, petlya: 0x5FE1C4, polka: 0x7AA2FF, ruchka: 0xFF7A45, eksentrik: 0xC58BFF, napr: 0x5ED36A, boshqa: 0xE6E9EE, kromka: 0xFF5C8A, zapchast: 0xD9DEE4, oyoq: 0xC9B27C };
export const teshikTuri = (kind) => TESHIK_TUR[kind] || 'boshqa';

const fMaxMi = (q) => !(q.rol === 'eshik' || q.rol === 'tortma_fasad');
const r1 = (v) => Math.round(v * 10) / 10;

/** Bazis qutisi → Smart3D lokal { c: markaz, s: o'lcham } */
function lokalQuti(q, w, d, h) {
  return { c: [w / 2 - (q.lo.X + q.hi.X) / 2, (q.lo.Z + q.hi.Z) / 2 - d / 2, (q.lo.Y + q.hi.Y) / 2 - h / 2], s: [q.hi.X - q.lo.X, q.hi.Z - q.lo.Z, q.hi.Y - q.lo.Y] };
}
const nuqta = (P, w, d, h) => [r1(w / 2 - P.X), r1(P.Z - d / 2), r1(P.Y - h / 2)];
const yonalish = (V) => [-V.X || 0, V.Z || 0, V.Y || 0];

/** bitta teshik bitta nusxada: { p — og'iz nuqtasi, n — burg'ilash yo'nalishi (detal ichiga), depth } */
function teshikJoyi(q, hl, ded, w, d, h) {
  const [la, wa] = LW[q.o], o = q.o, fMax = fMaxMi(q);
  const x = +hl.x + ded(q.code, 'F'), y = +hl.y + ded(q.code, 'L');
  if (!isFinite(x) || !isFinite(y)) return null;
  const P = { X: 0, Y: 0, Z: 0 }, V = { X: 0, Y: 0, Z: 0 };
  P[la] = q.lo[la] + y;
  P[wa] = fMax ? q.hi[wa] - x : q.lo[wa] + x;
  const tq = q.hi[o] - q.lo[o];
  let depth = Math.max(1, +hl.depth || 1);
  if (hl.side === 'T') {
    P[o] = (q.lo[o] + q.hi[o]) / 2;
    const tr = hl.torets || 'L';
    if (tr === 'L') { P[la] = q.lo[la]; V[la] = 1; } else if (tr === 'R') { P[la] = q.hi[la]; V[la] = -1; }
    else { const yuqori = (tr === 'F') === fMax; P[wa] = yuqori ? q.hi[wa] : q.lo[wa]; V[wa] = yuqori ? -1 : 1; }
  } else {
    const yuza = hl.yuza ? +hl.yuza : hl.side === 'B' ? 2 : 1;
    const plyus1 = yuzaRaqami(q, '+') === 1;                  // '+' tomondagi yuza — 1-yuzami
    const s = (yuza === 1) === plyus1 ? 1 : -1;
    P[o] = s > 0 ? q.hi[o] : q.lo[o]; V[o] = -s;
    depth = Math.min(depth, tq);
  }
  return { p: nuqta(P, w, d, h), n: yonalish(V), depth: r1(depth) };
}

/** kromka tasmasi: detal qirrasi bo'ylab, tashqariga qalinligicha (ko'rinishi uchun kamida 1,5 mm) */
function kromkaTasma(q, side, kt, w, d, h) {
  const [la, wa] = LW[q.o], fMax = fMaxMi(q);
  const lo = { ...q.lo }, hi = { ...q.hi }, t = Math.max(1.5, +kt || 0);
  if (side === 'F' || side === 'B') {
    const yuqori = (side === 'F') === fMax;
    if (yuqori) { lo[wa] = q.hi[wa]; hi[wa] = q.hi[wa] + t; } else { hi[wa] = q.lo[wa]; lo[wa] = q.lo[wa] - t; }
  } else if (side === 'L') { hi[la] = q.lo[la]; lo[la] = q.lo[la] - t; }
  else if (side === 'R') { lo[la] = q.hi[la]; hi[la] = q.hi[la] + t; }
  else return null;
  return lokalQuti({ lo, hi }, w, d, h);
}

const qosh3 = (a, b, k = 1) => [r1(a[0] + b[0] * k), r1(a[1] + b[1] * k), r1(a[2] + b[2] * k)];

/**
 * @param {Object} frag — katalog fragmenti (MC — parts[].joy; qo'lda chizilgan — chizma)
 * @param {number} w, d, h — joylashuv o'lchami
 * @param {Object} cl — shu joylashuvning kesim ro'yxati (cutlist natijasi)
 * @param {Object} [o] — { hinge } (bitta eshik petlyasi tomoni, cutlist bilan bir xil)
 * @returns {{ qutilar: [{ code, ref, rol, c, s }], teshiklar: [{ tur, kind, dia, depth, p, n, code, ref }],
 *   kromkalar: [{ code, ref, side, qalinlik, material, c, s }], zapchast: [{ tur, p, n, a?, b?, code, ref }], joysiz: number }}
 */
export function teshik3d(frag, w, d, h, cl, o = {}) {
  const out = { qutilar: [], teshiklar: [], kromkalar: [], zapchast: [], joysiz: 0 };
  if (!frag || !cl || Array.isArray(frag.bazis3d)) return out;
  const parts = cl.parts || [];
  const qal = {};
  for (const p of parts) qal[p.code] = +p.thickness || 16;
  const slotT = (s) => { const p = parts.find(x => x.slot === s); return p ? +p.thickness : undefined; };
  const tK = slotT('korpus') || 16, tF = slotT('fasad') || tK;
  let f = frag;
  try {
    if (f.chizma) f = chizmaYech(f, w, d, h, { t: tK, tp: slotT('polka'), tf: tF, to: slotT('orqa') });
  } catch (_) { return out; }
  let Q = [];
  try { Q = joyQutilar(f, { w: +w, d: +d, h: +h, t: tK, t_korpus: tK, t_fasad: tF }, (part) => qal[part.code], { hinge: o.hinge }); } catch (_) { Q = []; }
  const byCode = {}, byRef = {};
  for (const q of Q) {
    (byCode[q.code] = byCode[q.code] || []).push(q);
    byRef[q.ref] = q;
    out.qutilar.push(Object.assign({ code: q.code, ref: q.ref, rol: q.rol }, lokalQuti(q, w, d, h)));
  }
  /* kromka qalinligi (kesim o'lchamidan ayirilgan) — post/smart3d.js dagidek */
  const kr = {};
  for (const e of cl.edges || []) for (const s of e.sides || []) { const k = (kr[e.code] = kr[e.code] || {}); k[s] = Math.max(k[s] || 0, +e.thickness || 0); }
  const ded = (code, s) => { const t = (kr[code] || {})[s] || 0; return t >= EDGE_DEDUCT_MIN_MM ? t : 0; };

  /* teshiklar */
  for (const hl of cl.holes || []) {
    if (hl.narx_uchun || !hl.part || hl.kind === 'cutout') continue;
    const qs = hl.ref ? (byRef[hl.ref] ? [byRef[hl.ref]] : []) : (byCode[hl.part] || []);
    const n = Math.max(1, Math.round(+hl.qty || 1));
    if (!qs.length) { out.joysiz += n; continue; }
    for (const q of qs) {
      const j = teshikJoyi(q, hl, ded, w, d, h);
      if (!j) { out.joysiz += n; continue; }
      for (let k = 0; k < n; k++) out.teshiklar.push(Object.assign({ tur: teshikTuri(hl.kind), kind: hl.kind, dia: +hl.dia || 5, code: q.code, ref: q.ref }, j));
    }
  }
  /* kromka */
  for (const e of cl.edges || []) {
    for (const q of byCode[e.code] || []) {
      for (const side of e.sides || []) {
        const b = kromkaTasma(q, side, e.thickness, w, d, h);
        if (b) out.kromkalar.push(Object.assign({ code: e.code, ref: q.ref, side, qalinlik: +e.thickness || 0, material: e.material }, b));
      }
    }
  }
  /* zapchast belgilari — teshiklardan */
  const juft = {}, qRef = {};
  for (const q of out.qutilar) qRef[q.ref] = q;
  for (const t of out.teshiklar) {
    /* petlya yelkasi — kosadan eshikning yaqin (petlya) qirrasi tomonga */
    if (t.kind === 'd6_kosa') out.zapchast.push({ tur: 'petlya', p: t.p, n: t.n, yelka: qRef[t.ref] && t.p[0] < qRef[t.ref].c[0] ? -1 : 1, code: t.code, ref: t.ref });
    else if (t.kind === 'd6_polka') out.zapchast.push({ tur: 'polka', p: t.p, n: t.n, code: t.code, ref: t.ref });
    else if (t.kind === 'evrovint') out.zapchast.push({ tur: 'konfirmat', p: t.p, n: t.n, uz: KONFIRMAT_UZ, code: t.code, ref: t.ref });
    else if (t.kind === 'd6_eksentrik') out.zapchast.push({ tur: 'eksentrik', p: t.p, n: t.n, code: t.code, ref: t.ref });
    else if (t.kind === 'd6_ruchka' || t.kind === 'd6_napr') (juft[t.kind + '|' + t.ref] = juft[t.kind + '|' + t.ref] || []).push(t);
  }
  for (const [k, ts] of Object.entries(juft)) {
    if (k.startsWith('d6_ruchka')) {
      /* ruchka: juft o'tuvchi teshik — tashqi yuzada (og'izdan qalinlik bo'ylab) */
      for (let i = 0; i + 1 < ts.length; i += 2) {
        const a = qosh3(ts[i].p, ts[i].n, ts[i].depth), b = qosh3(ts[i + 1].p, ts[i + 1].n, ts[i + 1].depth);
        out.zapchast.push({ tur: 'ruchka', a, b, n: ts[i].n, code: ts[i].code, ref: ts[i].ref });
      }
    } else {
      /* yo'naltiruvchi: bir qatordagi (bir balandlikdagi) teshiklar — boshidan oxirigacha */
      const qator = {};
      for (const t of ts) (qator[Math.round(t.p[2])] = qator[Math.round(t.p[2])] || []).push(t);
      for (const r of Object.values(qator)) {
        const ys = r.map(t => t.p[1]);
        const i0 = ys.indexOf(Math.min(...ys)), i1 = ys.indexOf(Math.max(...ys));
        out.zapchast.push({ tur: 'napr', a: r[i0].p, b: r[i1].p, n: r[0].n, code: r[0].code, ref: r[0].ref });
      }
    }
  }
  /* oyoq: BOM da "nojka" 4 dona — pastki (eng past, keng gorizontal) detalning 4 burchagida, pastga qarab. Joyi taxminiy (Bazis bu nuqtani bermaydi) */
  const oyoqQty = (cl.hardware || []).filter(x => OYOQ_RE.test((x.code || '') + ' ' + (x.name || ''))).reduce((a, x) => a + (+x.qty || 0), 0);
  if (oyoqQty === 4) {
    let past = null;
    for (const q of out.qutilar) {
      if (q.s[2] > 40 || q.s[0] < w * 0.5 || q.s[1] < d * 0.4) continue;
      if (!past || q.c[2] - q.s[2] / 2 < past.c[2] - past.s[2] / 2) past = q;
    }
    if (past) {
      const zt = r1(past.c[2] - past.s[2] / 2), ix = Math.min(OYOQ_CHETDAN, past.s[0] / 4), iy = Math.min(OYOQ_CHETDAN, past.s[1] / 4);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        out.zapchast.push({ tur: 'oyoq', p: [r1(past.c[0] + sx * (past.s[0] / 2 - ix)), r1(past.c[1] + sy * (past.s[1] / 2 - iy)), zt], n: [0, 0, 1], uz: OYOQ_UZ, taxminiy: true, code: past.code, ref: past.ref });
      }
    }
  }
  out.zapchast.forEach((z, i) => { z.i = i; });
  return out;
}

/* TZ-38: konfirmat vinti uzunligi (BOM "Евро 51 мм"), oyoq balandligi (BOM "ножка 100 мм") va burchakdan oraliq — mm */
const KONFIRMAT_UZ = 50, OYOQ_UZ = 100, OYOQ_CHETDAN = 50;
const OYOQ_RE = /nojk|ножк|noga|\blegs?\b/i;

/** TZ-38: BOM qatori (kesim ro'yxati `hardware`: code, name) → 3D zapchast turi; 3D da joyi bo'lmagan (aksessuar, vint, shkant) — null.
 *  Petlya tarkibidagi chashka va montaj plankasi alohida belgilanmaydi (belgi — petlyaning o'zi). */
export function bomTuri(hw) {
  const s = ((hw && hw.code) || '') + ' ' + ((hw && hw.name) || '');
  if (/^(bz-)?(chashk|montaj|planka|samorez|shkant)/i.test((hw && hw.code) || '') || /^(чашк|монтаж|планк|саморез|шкант)/i.test((hw && hw.name) || '')) return null;
  if (OYOQ_RE.test(s)) return 'oyoq';
  if (/ekstsentr|ekssentr|eksentr|эксцентр/i.test(s)) return 'eksentrik';
  if (/petl|петл|hinge|^PET-/i.test(s)) return 'petlya';
  if (/evro|евро|konfirmat|конфирмат|evrovint/i.test(s)) return 'konfirmat';
  if (/polkoder|полкодерж|polka/i.test(s)) return 'polka';
  if (/ruchk|ручк|handle|^RU-/i.test(s)) return 'ruchka';
  if (/napravl|направл|salazk|салазк|tandem|sharikov|релс|relsa/i.test(s)) return 'napr';
  return null;
}

/**
 * TZ-38: bitta joylashuv uchun BOM qatorlari ↔ 3D belgilar. Har tur belgilari shu turdagi BIRINCHI BOM qatoriga bog'lanadi (qolgan qatorlar —
 * masalan chashka, ikkinchi yo'naltiruvchi qatori — belgisiz); mos BOM qatori yo'q belgilar `bomsiz` da (narx panelida shu zapchast qatori yo'q).
 * @param {Object} cl — kesim ro'yxati (hardware), dat — teshik3d() natijasi, korinadi(hw) — narx panelida ko'rinadigan qatorlar (yashirinlar emas)
 * @returns {{ qatorlar: [{ code, hw, tur, belgilar: [zapchast] }], bomsiz: [zapchast] }}
 */
export function zapchastBom(cl, dat, korinadi) {
  const qatorlar = (cl.hardware || []).filter(hw => !korinadi || korinadi(hw)).map(hw => ({ code: hw.code, hw, tur: bomTuri(hw), belgilar: [] }));
  const bomsiz = [], birinchi = {};
  for (const q of qatorlar) if (q.tur && !birinchi[q.tur]) birinchi[q.tur] = q;
  for (const z of (dat && dat.zapchast) || []) (birinchi[z.tur] ? birinchi[z.tur].belgilar : bomsiz).push(z);
  return { qatorlar, bomsiz };
}

/** kesim ro'yxatidagi joyli teshiklar soni (test va detal kartasi uchun — 3D dan mustaqil hisob): har teshik × nusxa */
export function joyliTeshikSoni(cl) {
  const nus = {};
  for (const p of (cl && cl.parts) || []) nus[p.code] = (nus[p.code] || 0) + 1;
  let n = 0;
  for (const hl of (cl && cl.holes) || []) {
    if (hl.narx_uchun || !hl.part || hl.kind === 'cutout') continue;
    n += Math.max(1, Math.round(+hl.qty || 1)) * (hl.ref ? 1 : (nus[hl.part] || 0));
  }
  return n;
}
/** kesim ro'yxatidagi kromkali qirralar soni: har yozuv tomoni × detal nusxasi */
export function kromkaQirraSoni(cl) {
  const nus = {};
  for (const p of (cl && cl.parts) || []) nus[p.code] = (nus[p.code] || 0) + 1;
  return ((cl && cl.edges) || []).reduce((a, e) => a + (e.sides || []).length * (nus[e.code] || 0), 0);
}

/** IoU: 3D panel (assembler: markaz x, y, z va o'lcham w, d, h) ↔ detal qutisi { c, s } */
function iou(P, q) {
  const a0 = [P.x - P.w / 2, P.y - P.d / 2, P.z - P.h / 2], a1 = [P.x + P.w / 2, P.y + P.d / 2, P.z + P.h / 2];
  const b0 = q.c.map((v, i) => v - q.s[i] / 2), b1 = q.c.map((v, i) => v + q.s[i] / 2);
  const k = [0, 1, 2].map(i => Math.max(0, Math.min(a1[i], b1[i]) - Math.max(a0[i], b0[i])));
  const ich = k[0] * k[1] * k[2];
  return ich ? ich / (Math.max(1e-6, P.w * P.d * P.h) + Math.max(1e-6, q.s[0] * q.s[1] * q.s[2]) - ich) : 0;
}
/** har detal qutisi → 3D panel indeksi (−1 — topilmadi): eng katta kesishma (IoU ≥ 0,3), bo'lmasa — qutining markazi ichida
 *  turgan eng kichik panel (20 mm zaxira bilan; masalan katalog 3D sidagi bitta keng eshik — ikki eshik detali) */
export function qutiPanel(qutilar, panels) {
  return (qutilar || []).map(q => {
    let eng = -1, engK = 0.3;
    panels.forEach((P, i) => { const k = iou(P, q); if (k > engK) { engK = k; eng = i; } });
    if (eng >= 0) return eng;
    let hajm = Infinity;
    panels.forEach((P, i) => {
      const ich = Math.abs(q.c[0] - P.x) <= P.w / 2 + 20 && Math.abs(q.c[1] - P.y) <= P.d / 2 + 20 && Math.abs(q.c[2] - P.z) <= P.h / 2 + 20;
      const v = P.w * P.d * P.h;
      if (ich && v < hajm) { hajm = v; eng = i; }
    });
    return eng;
  });
}
/** nuqta (bizning lokal o'qlar) qaysi panel ichida (zaxira bilan) — eng kichigi; yo'q — −1 */
export function nuqtaPanel(p, panels, zaxira = 30) {
  let eng = -1, hajm = Infinity;
  panels.forEach((P, i) => {
    const ich = Math.abs(p[0] - P.x) <= P.w / 2 + zaxira && Math.abs(p[1] - P.y) <= P.d / 2 + zaxira && Math.abs(p[2] - P.z) <= P.h / 2 + zaxira;
    const v = P.w * P.d * P.h;
    if (ich && v < hajm) { hajm = v; eng = i; }
  });
  return eng;
}
