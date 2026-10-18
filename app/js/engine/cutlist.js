/* Smart3D engine/cutlist.js — DETALLAR (razdelka) + ISHLAB CHIQARISH XARAJATI.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI:
 *   - Xavfsiz AST parser (expr.js) orqali hisoblash: "eval" yo'q!
 *   - Shartli ifodalar: "w > 600 ? 2 : 1", "w > 600 ? (w/2 - 3) : (w - 4)"
 *   - Material qalinligi 't' o'zgaruvchisi to'liq qo'llab-quvvatlanadi: "w - 2 * t"
 *   - Ko'p slotlilik (slots.js): korpus, fasad, orqa, polka alohida materiallarda
 *   - Yog'och teksturasi yo'nalishi (texture: uzunlik / en / erkin)
 *   - To'liq tannarx: Varaqlar (kroy) + Kromka + Furnitura + Teshiklar + Ish haqi
 *   - Kesim o'lchami: tayyor o'lcham − kromka (≥1 mm); narxsiz narsa o'ylab topilmaydi
 */

import { evalFormula, roundMm } from './expr.js';
import { resolveSlots } from './slots.js';
import { chizmaYech } from './chizish.js';
import { joyQutilar, d6Teshiklar, D6, petlyaSoni } from './d6.js';
import { panelFitsSheet, pickSheetSize, KERF_DEFAULT, TRIM_DEFAULT } from './nesting.js';
import { kromkaXizmat, prisadkaXizmat, raspilXizmat, tasdiqMi, ustamaManbasi } from './narxStavka.js';

/** D6 teshiklari prisadka narxi — mavjud stavka bo'yicha (materials.json hole_kinds); qolganlari — 'drill' */
const D6_STAVKA = { d6_kosa: 'hinge', d6_eksentrik: 'cam' };

/** D6: modul furniturasidagi ruchka teshiklari oralig'i ("Ручка 160 мм" → 160); ruchka yo'q — 0 (teshik qo'yilmaydi) */
export function ruchkaOraligi(frag) {
  for (const hw of frag.hardware || []) {
    const s = (hw.name || '') + ' ' + (hw.code || '');
    if (!/ручк|ruchka/i.test(s)) continue;
    const m = /(\d{2,3})\s*(?:мм|mm|_mm)|ruchka_(\d{2,3})/i.exec(s);
    return m ? +(m[1] || m[2]) : 160;                        // o'lchami yozilmagan — sexdagi eng ko'p (160)
  }
  return 0;
}

/** Orqaga moslik uchun evalExpr (ichkarida xavfsiz evalFormula ishlaydi). */
export function evalExpr(expr, vars) {
  return evalFormula(expr, vars);
}

/** Butun songa yaxlitlash (ishlab chiqarishda kasr yo'q). */
export function rInt(x) {
  return roundMm(x);
}

/** Kesim o'lchamidan shu qalinlikdan boshlab kromka ayiriladi (0.4 mm kabi yupqa kromka — yo'q). */
export const EDGE_DEDUCT_MIN_MM = 1;

/**
 * Bazis mahkamlash qoidasi (TZ-06): birikish chizig'i uzunligi L → vintlar joyi (chiziq boshidan).
 * Soni — jadvaldan (L ≤ Length bo'lgan birinchi qator); chetdan kamida S; qo'shni oraliq P ga karrali;
 * simmetrik. scripts/bazis_teshik.py qoida_t bilan bir xil — 38 modulda Bazis fayli bilan tekshirilgan.
 */
export function bazisQoida(L, q) {
  const jad = q.jadval || [];
  const row = jad.find(r => L <= r[0] + 1e-6);
  let n = row ? row[1] : (jad.length ? jad[jad.length - 1][1] : 1);
  if (n >= 2 && L - 2 * q.S < -1e-6) n = 1;
  if (n <= 1) return [L / 2];
  const step = Math.floor((L - 2 * q.S) / ((n - 1) * q.P) + 1e-6) * q.P;
  const f = (L - step * (n - 1)) / 2;
  return Array.from({ length: n }, (_, k) => f + k * step);
}

/**
 * Bazis birikmalaridan teshiklar — TAYYOR detal koordinatasida (kromka surilmasidan oldin).
 * Evrovint: A detal plastida o'tuvchi teshik (Ø d1), B detal toretsida (side 'T', Ø d2).
 * @returns {{holes:[], vintSoni:{zapchast: soni}}}
 */
export function birikmaTeshiklari(frag, vars) {
  const holes = [], vintSoni = {};
  for (const b of frag.birikmalar || []) {
    const L = evalFormula(b.L, vars);
    const ts = b.qoida ? bazisQoida(L, b.qoida) : (b.qolda || []).map(q => (q.dan === 'oxir' ? L - q.t : q.t));
    if (b.zapchast_soni) vintSoni[b.zapchast] = (vintSoni[b.zapchast] || 0) + ts.length;
    for (const tp of b.teshiklar || []) {
      const x0 = evalFormula(tp.x0, vars), y0 = evalFormula(tp.y0, vars);
      for (const t of ts) {
        const hl = { part: tp.part, side: tp.side, x: x0 + tp.sx * t, y: y0 + tp.sy * t, dia: tp.dia, depth: tp.depth, kind: tp.kind };
        if (tp.torets) hl.torets = tp.torets;
        if (tp.yuza) hl.yuza = tp.yuza;                          // D6: ko'r teshik qaysi yuzada (1 | 2)
        holes.push(hl);
      }
    }
  }
  return { holes, vintSoni };
}

/* Petlya soni eshik balandligiga qarab (petlya ishlab chiqaruvchilarining umumiy qoidasi) */
function hingesForDoor(heightMm) {
  if (heightMm <= 900) return 2;
  if (heightMm <= 1600) return 3;
  if (heightMm <= 2000) return 4;
  return 5;
}

/**
 * Fragment detallarini hisoblaydi.
 *
 * Detal `length`/`width` — KESIM o'lchami (arralanadigan): tayyor o'lchamdan
 * ≥ EDGE_DEDUCT_MIN_MM qalinlikdagi kromka tomonlari ayirilgan. Tayyor o'lcham —
 * `finish_length`/`finish_width`. Kromka metri tayyor o'lchamdan hisoblanadi.
 *
 * @param {Object} frag — fragments.json elementi
 * @param {number} w, d, h — joylashuv o'lchamlari (mm)
 * @param {Object} materials — materials.json
 * @param {Object} [opt] — { projectSlots, placementSlots }
 * @returns {{parts:[], edges:[], holes:[], hardware:[], stats:{}, errors:[]}}
 */
export function cutlist(frag, w, d, h, materials = {}, opt = {}) {
  const errors = [];
  const slotResolver = resolveSlots(opt.projectSlots, opt.placementSlots, materials, frag.slots);

  // Korpus materialining haqiqiy qalinligi t (mm)
  const tKorpus = slotResolver.getThickness('korpus');
  const tFasad = slotResolver.getThickness('fasad');
  /* TZ-24 A: qo'lda chizilgan modul — detallar shu o'lcham va material qalinligida chizmadan (engine/chizish.js) */
  if (frag.chizma) frag = chizmaYech(frag, w, d, h, { t: tKorpus, tp: slotResolver.getThickness('polka'), tf: tFasad, to: slotResolver.getThickness('orqa') });

  const baseVars = {
    w: +w,
    d: +d,
    h: +h,
    t: tKorpus,
    t_korpus: tKorpus,
    t_fasad: tFasad
  };

  const parts = [];
  const partDefs = {};                      // detal kodi → fragments.json dagi ta'rif

  /* ── 1) Detallar (tayyor o'lcham) ───────────────────────────── */
  for (const p of frag.parts || []) {
    try {
      // Detal qaysi slotga tegishli? (korpus / fasad / orqa / polka)
      let slotName = p.slot;
      if (!slotName) {
        if (/eshik|fasad|door|front/i.test(p.code)) slotName = 'fasad';
        else if (/orqa|back|hdf/i.test(p.code)) slotName = 'orqa';
        else if (/polka|shelf/i.test(p.code)) slotName = 'polka';
        else slotName = 'korpus';
      }

      /* TZ-21: Bazis'dan yuklangan detalda o'z materiali bor (p.material_code) — slotdan emas; bo'lmasa avvalgidek */
      const ownMat = p.material_code ? (materials.panel_materials || []).find(m => m.code === p.material_code) : null;
      const matCode = ownMat ? ownMat.code : slotResolver.getMaterialCode(slotName);
      const th = ownMat && ownMat.thickness != null ? ownMat.thickness : slotResolver.getThickness(slotName);
      const partVars = Object.assign({}, baseVars, { t: th });

      // Detal soni: formula yoki raqam ("w > 600 ? 2 : 1")
      let qty = 1;
      if (typeof p.qty === 'string' && isNaN(Number(p.qty))) {
        qty = Math.max(1, roundMm(evalFormula(p.qty, partVars)));
      } else {
        qty = Math.max(1, roundMm(+p.qty || 1));
      }

      // Detal uzunligi va eni
      const len = evalFormula(p.len, partVars);
      const wid = evalFormula(p.width, partVars);

      // Tekstura yo'nalishi (uzunlik / en / erkin)
      const texture = p.tekstura || p.texture || (slotName === 'orqa' ? 'erkin' : 'uzunlik');

      partDefs[p.code] = p;
      for (let i = 0; i < qty; i++) {
        parts.push({
          fragment: frag.code,
          code: p.code,
          ref: p.code + '#' + (i + 1),
          length: rInt(len),
          width: rInt(wid),
          finish_length: rInt(len),
          finish_width: rInt(wid),
          qty: 1,
          slot: slotName,
          material: matCode,
          thickness: th,
          texture
        });
      }
    } catch (e) {
      errors.push({
        code: 'E_BAD_EXPR',
        message: `${frag.code} parts.${p.code}: ${e.message}`
      });
    }
  }

  /* ── 1b) O'lcham validatsiyasi ─────────────────────────────────
   * Formula manfiy/0 natija bera olishi mumkin (mas. SP-BD-002 karkas:
   * "d-200", d=150 → −50). Bunday o'lcham raskroy/DXF/G-code'ni buzadi —
   * xato qaytaramiz va o'lchamni minimal qiymatga clamp qilamiz, shu tariqa
   * nomanfiy o'lcham hech qachon nesting va stanok fayllariga tushmaydi. */
  const MIN_PART_MM = 10;
  for (const p of parts) {
    if (p.finish_length > 0 && p.finish_width > 0) continue;
    errors.push({
      code: 'E_BAD_SIZE',
      message: `${frag.code}.${p.code}: tayyor o'lcham noto'g'ri (${p.finish_length}×${p.finish_width} mm) — formula ko'rsatmalarini tekshiring`
    });
    p.finish_length = Math.max(MIN_PART_MM, rInt(p.finish_length));
    p.finish_width = Math.max(MIN_PART_MM, rInt(p.finish_width));
    p.length = Math.max(MIN_PART_MM, rInt(p.length));
    p.width = Math.max(MIN_PART_MM, rInt(p.width));
  }

  /* ── 2) Kromka ──────────────────────────────────────────────────
   * Ikki format qo'llab-quvvatlanadi:
   *  a) fragment darajasida: edge: [{code, sides:["F","B"], material?, thickness?, slot?}]
   *     — aniq `material` berilgan bo'lsa shu ishlatiladi, aks holda slot;
   *  b) detal darajasida: parts[].edge = {F:"kromka_korpus", L:"kromka_fasad", ...}
   *     yoki "hammasi:kromka_fasad".
   * Tomonlar: F=old, B=orqa (uzunlik bo'ylab), L=chap, R=o'ng (en bo'ylab). */
  const partMap = {};
  for (const p of parts) (partMap[p.code] = partMap[p.code] || []).push(p);
  const sideThk = {};                       // detal kodi → {F,B,L,R: qalinlik mm}
  const edgeAgg = {};                       // detal kodi + material → yozuv

  function addEdge(code, sides, meta, qtyOverride) {
    const ps = partMap[code] || [];
    if (!ps.length || !sides.length) return;
    let mPerPiece = 0;
    for (const side of sides) {
      mPerPiece += (side === 'F' || side === 'B') ? ps[0].finish_length : ps[0].finish_width;
      const st = (sideThk[code] = sideThk[code] || {});
      st[side] = Math.max(st[side] || 0, +meta.thickness || 0);
    }
    const qty = Math.max(1, Math.round(+qtyOverride || ps.length));
    const key = code + '|' + meta.code;
    if (!edgeAgg[key]) {
      edgeAgg[key] = {
        fragment: frag.code, code, material: meta.code, name: meta.name || meta.code,
        thickness: +meta.thickness || 0, sides: [], qty, meters: 0
      };
    }
    const rec = edgeAgg[key];
    rec.sides = rec.sides.concat(sides);
    rec.meters = Math.round((rec.meters + (mPerPiece / 1000) * qty) * 1000) / 1000;
  }

  for (const e of frag.edge || []) {
    try {
      let meta;
      if (e.material && !e.slot) {
        const m = slotResolver.getEdgeByCode(e.material);
        meta = Object.assign({}, m, { thickness: e.thickness != null ? +e.thickness : m.thickness });
      } else {
        const isFasad = /eshik|fasad|front/i.test(e.code);
        meta = slotResolver.getEdge(e.slot || (isFasad ? 'kromka_fasad' : 'kromka_korpus'));
      }
      addEdge(e.code, e.sides || [], meta, e.qty);
    } catch (err) {
      errors.push({ code: 'E_BAD_EXPR', message: `${frag.code} edge.${e.code}: ${err.message}` });
    }
  }
  for (const code in partDefs) {
    const pe = partDefs[code].edge;
    if (!pe) continue;
    if (typeof pe === 'string') {
      const m = /^hammasi:(.+)$/.exec(pe.trim());
      if (m) addEdge(code, ['F', 'B', 'L', 'R'], slotResolver.getEdge(m[1]));
      else errors.push({ code: 'E_EDGE_FORMAT', message: `${frag.code} parts.${code}: kromka formati noma'lum "${pe}"` });
    } else if (typeof pe === 'object') {
      const bySlot = {};
      for (const side of ['F', 'B', 'L', 'R']) if (pe[side]) (bySlot[pe[side]] = bySlot[pe[side]] || []).push(side);
      for (const slot in bySlot) addEdge(code, bySlot[slot], slotResolver.getEdge(slot));
    }
  }
  const edges = Object.values(edgeAgg);

  /* ── 2b) Kesim o'lchami = tayyor o'lcham − kromka (≥ EDGE_DEDUCT_MIN_MM) ── */
  const dedOf = (code, side) => {
    const t = (sideThk[code] || {})[side] || 0;
    return t >= EDGE_DEDUCT_MIN_MM ? t : 0;
  };
  for (const p of parts) {
    if (!sideThk[p.code]) continue;
    const rawL = p.finish_length - dedOf(p.code, 'L') - dedOf(p.code, 'R');
    const rawW = p.finish_width - dedOf(p.code, 'F') - dedOf(p.code, 'B');
    if (rawL > 0 && rawW > 0) {
      p.length = rInt(rawL);
      p.width = rInt(rawW);
    } else {
      /* kromka qalinligi tayyor o'lchamdan katta — kesim o'lchami manfiy
       * bo'lmasin (aks holda raskroy va G-code buziladi) */
      errors.push({
        code: 'E_BAD_SIZE',
        message: `${frag.code}.${p.code}: kromkadan keyin kesim o'lchami manfiy (${rawL}×${rawW} mm)`
      });
      p.length = Math.max(MIN_PART_MM, rInt(rawL));
      p.width = Math.max(MIN_PART_MM, rInt(rawW));
    }
  }

  /* ── 3) Teshiklar (burg'ilash) ──────────────────────────────────
   * Formula koordinatasi TAYYOR detalning burchagidan, lekin O'QLAR fragment
   * ma'lumotidagi konvensiya bo'yicha: x — EN bo'ylab F chetdan (system-32 chizig'i:
   * 32/37/64/98 mm), y — UZUNLIK bo'ylab L chetdan (detal balandligi/uzunligi bo'ylab
   * joylashuv). 1281 fragmentning 99.1% (882/890) shu konvensiyaga mos chiqdi.
   * Stanok kesilgan (kromkasiz) panelni teshadi, shuning uchun F va L tomondagi
   * ayirilgan kromka qalinligiga suramiz — kromka yopishgach teshik joyida. */
  const holes = [];
  for (const hl of frag.holes || []) {
    try {
      const x = evalFormula(hl.x, baseVars) - dedOf(hl.part, 'F');
      const y = evalFormula(hl.y, baseVars) - dedOf(hl.part, 'L');
      const qty = Math.max(1, Math.round(+hl.qty || 1));
      holes.push({
        fragment: frag.code,
        part: hl.part,
        side: hl.side,
        x: Math.round(x),
        y: Math.round(y),
        dia: +hl.dia || 5,
        depth: +hl.depth || 13,
        kind: hl.kind || 'drill',
        qty
      });
    } catch (err) {
      errors.push({
        code: 'E_BAD_EXPR',
        message: `${frag.code} hole: ${err.message}`
      });
    }
  }

  /* ── 3b) Bazis birikmalari (TZ-06): teshik joyi va vint soni modul o'lchamiga qarab ──
   * Har teshik — detalning BITTA nusxasi uchun (stanok har nusxaga qo'yadi); `nusxa` — detal soni
   * (prisadka hisobi uchun). Torets teshigi (side 'T') varaqda teshilmaydi — stanok fayliga kirmaydi. */
  let vintSoni = {};
  if ((frag.birikmalar || []).length) {
    try {
      const bt = birikmaTeshiklari(frag, baseVars);
      vintSoni = bt.vintSoni;
      const nusxa = {};
      for (const p of parts) nusxa[p.code] = (nusxa[p.code] || 0) + 1;
      const r1 = (v) => Math.round(v * 10) / 10;
      for (const hl of bt.holes) {
        holes.push(Object.assign({ fragment: frag.code }, hl, {
          x: r1(hl.x - dedOf(hl.part, 'F')),
          y: r1(hl.y - dedOf(hl.part, 'L')),
          qty: 1,
          nusxa: nusxa[hl.part] || 1
        }));
      }
    } catch (err) {
      errors.push({ code: 'E_BAD_EXPR', message: `${frag.code} birikma: ${err.message}` });
    }
  }

  /* ── 3c) D6 (engine/d6.js): MC (Bazis) modullarida petlya, planka, polka ushlagich, ruchka — har nusxa o'z joyidan
   * (chap va o'ng yon devor — ko'zgu: teshik o'sha nusxaga, `ref`). Qo'lda chizilgan modulda — birikmalar ichida (chizish.js). */
  if (!frag.chizma && !frag.bazis3d && frag.production !== 'none' && (frag.parts || []).some(p => p.joy) && opt.d6 !== false) {
    try {
      const qal = {};
      for (const p of parts) qal[p.code] = p.thickness;
      const Q = joyQutilar(frag, baseVars, (part) => qal[part.code], { hinge: opt.hinge });
      const r1 = (v) => Math.round(v * 10) / 10;
      d6Teshiklar(Q, { ruchka: opt.ruchkasiz ? 0 : ruchkaOraligi(frag) }).forEach((arr, i) => {   // egasi #166: ruchkasiz — teshik yo'q
        for (const hl of arr) {
          holes.push(Object.assign({ fragment: frag.code, part: Q[i].code, ref: Q[i].ref }, hl, {
            x: r1(hl.x - dedOf(Q[i].code, 'F')), y: r1(hl.y - dedOf(Q[i].code, 'L')), qty: 1, nusxa: 1
          }));
        }
      });
    } catch (err) {
      errors.push({ code: 'E_BAD_EXPR', message: `${frag.code} D6: ${err.message}` });
    }
  } else if (/^SP-/.test(frag.code || '') && !frag.chizma && !frag.bazis3d && frag.production !== 'none' && opt.d6 !== false
    && !(frag.hardware || []).some(hw => /KUPE|SLID|RAIL|ROLIK/i.test(hw.code || ''))) {
    /* TZ-32 B6: umumiy (SP, joysiz) modul — eshik petlyasi D6 qoidasi bo'yicha (d6.js: kosa eshik uchidan 105, qirradan 21,5;
     * vintlari ±24, 6 mm ichkarida; soni eshik bo'yiga qarab). Petlya qirrasi — F (eshik simmetrik); kupe va tortma — yo'q. */
    const r1 = (v) => Math.round(v * 10) / 10, K = D6.kosa, V3 = D6.kosaVint;
    for (const p of parts) {
      if (p.slot !== 'fasad' || !/eshik|door/i.test(p.code) || /tortma|drawer|yashik|gorizontal/i.test(p.code)) continue;
      const H = p.finish_length, W = p.finish_width;
      if ((W > 650 && H > 1500) || H < 2 * K.uch) continue;          // kupe (surma) eshik — d6.js kupemi; juda past eshik
      const n = petlyaSoni(H), ys = Array.from({ length: n }, (_, k) => K.uch + (n > 1 ? k * (H - 2 * K.uch) / (n - 1) : 0));
      const add = (x, y, dia, depth, kind) => holes.push({ fragment: frag.code, part: p.code, ref: p.ref, side: 'F', yuza: 1,
        x: r1(x - dedOf(p.code, 'F')), y: r1(y - dedOf(p.code, 'L')), dia, depth, kind, qty: 1, nusxa: 1 });
      for (const Y of ys) {
        add(K.chet, Y, K.d, K.dp, 'd6_kosa');
        for (const s of [-1, 1]) add(K.chet + V3.ichkari, Y + s * V3.oraliq, V3.d, V3.dp, 'd6_vint');
      }
    }
  }

  /* ── 3d) TZ-20: Bazis importi — furnitura/mahkamlagichdan hisoblangan teshiklar (faqat NARX uchun, joylashuvsiz).
   * part yo'q → stanok eksportchilari (CNC, KDT, GibLab, BPJ) ularni o'tkazib yuboradi. */
  for (const t of frag.bazisTeshik || []) {
    holes.push({ fragment: frag.code, part: '', side: '', x: 0, y: 0, dia: t.dia, depth: t.depth, kind: t.kind, qty: Math.max(1, Math.round(+t.qty || 1)), nusxa: 1, tur: t.tur, narx_uchun: true });
  }

  /* ── 4) Furnitura ────────────────────────────────────────────── */
  const nomBom = (s) => String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const hardware = (frag.hardware || []).map(hw => ({
    fragment: frag.code,
    code: hw.code,
    /* birikma vintlari soni o'lchamga qarab o'zgaradi (Bazis jadvali) */
    qty: vintSoni[nomBom(hw.name)] != null ? vintSoni[nomBom(hw.name)] : Math.max(1, Math.round(+hw.qty || 1)),
    id: hw.id,              // ERP furnitura ID (8 xona) — narx shu bo'yicha (TZ-HAQIQIY-MODULLAR A4)
    name: hw.name,
    unit: hw.unit
  }));

  /* ── 4b) Avtomatik furnitura — fragmentda ko'rsatilmagan bo'lsa ──
   * Petlya faqat ochiladigan ESHIKKA (tortma fasadiga emas, kupe eshigiga emas),
   * soni eshik balandligiga qarab; tutqich — har bir fasadga (eshik va tortma). */
  const fronts = parts.filter(p => p.slot === 'fasad' || /eshik|door|fasad|front/i.test(p.code));
  const isDrawer = (p) => /tortma|drawer|yashik|yashchik/i.test(p.code);
  const sliding = hardware.some(hw => /KUPE|SLID|RAIL|ROLIK/i.test(hw.code));
  /* Bazis'dan import qilingan modul (auto_hardware:false) — furnitura ro'yxati Bazis BOM'idan
     to'liq keladi; avtomatik petlya/ruchka qo'shilsa ikki marta sanaladi */
  const autoHw = frag.auto_hardware !== false;
  const doors = sliding || !autoHw ? [] : fronts.filter(p => !isDrawer(p));
  /* TS-… — eski fragmentlarda petlya shu kod bilan yozilgan (materials.json da nomi
     "Styajka TS-1730" — ziddiyat egasi bilan aniqlanadi); bor bo'lsa ikkinchi marta qo'shilmaydi */
  if (doors.length && !hardware.some(hw => /TS-|PET|petl|hinge/i.test(hw.code))) {
    const hingeQty = doors.reduce((s, p) => s + hingesForDoor(Math.max(p.finish_length, p.finish_width)), 0);
    hardware.push({ fragment: frag.code, code: 'PET-4', qty: hingeQty, _auto: true });
  }
  if (autoHw && fronts.length && !sliding && !opt.ruchkasiz && !hardware.some(hw => /RU-|ruchka|handle/i.test(hw.code))) {
    hardware.push({ fragment: frag.code, code: 'RU-128', qty: fronts.length, _auto: true });
  }
  /* egasi #166 (opt — joylashuvdan): ruchkasiz (Gola) — ruchka qatori yo'q; Tandem vakuum — modulning yo'naltiruvchi/salazka qatorlari
     o'rniga har tortmaga 1 komplekt (ERP ID bog'lanmagan — narxi "yo'q" deb chiqadi, o'ylab topilmaydi) */
  if (opt.ruchkasiz) {
    for (let i = hardware.length - 1; i >= 0; i--) if (/ручк|ruchk|handle|^RU-/i.test((hardware[i].code || '') + ' ' + (hardware[i].name || ''))) hardware.splice(i, 1);
  }
  if (opt.yonaltiruvchi === 'tandem_vakuum') {
    const tortma = parts.filter(p => /fasad_yashika|tortma.*fasad|drawer.*front/i.test(p.code)).length;
    if (tortma) {
      for (let i = hardware.length - 1; i >= 0; i--) if (/napravl|salazk|направл|салазк|slide/i.test((hardware[i].code || '') + ' ' + (hardware[i].name || ''))) hardware.splice(i, 1);
      hardware.push({ fragment: frag.code, code: 'TANDEM-VAKUUM', name: "Tandem vakuum yo'naltiruvchi (komplekt)", qty: tortma, unit: 'komplekt', _auto: true });
    }
  }

  /* ── 5) Statistika ───────────────────────────────────────────── */
  let areaMm2 = 0;
  for (const p of parts) areaMm2 += p.length * p.width;
  const holeCount = holes.reduce((s, x) => s + x.qty * (x.nusxa || 1), 0);
  const edgeMeters = edges.reduce((s, x) => s + x.meters, 0);

  return {
    fragment: frag.code,
    w: +w, d: +d, h: +h,
    parts, edges, holes, hardware,
    stats: {
      part_count: parts.length,
      hole_count: holeCount,
      edge_meters: Math.round(edgeMeters * 1000) / 1000,
      area_m2: Math.round(areaMm2 / 1e6 * 1000) / 1000
    },
    errors
  };
}

/**
 * Butun loyihaning ishlab chiqarish tannarxi va mijoz narxi.
 *
 *   Tannarx = plita (kroydagi HAQIQIY varaqlar) + kromka + furnitura + teshiklar + ish haqi
 *   Mijoz narxi = tannarx × (1 + ustama)            — materials.pricing.markup_pct
 *
 * QOIDA: narxi bazada yo'q narsa 0 so'm bilan hisoblanadi va `missing` ro'yxatiga
 * tushadi — narx HECH QACHON o'ylab topilmaydi (smeta "to'liq emas" deb belgilanadi).
 *
 * @param {Array} cutlists — barcha modullar cutlist natijalari (doc.placements tartibida)
 * @param {Object} materials — materials.json (effektiv: tanlangan ERP varag'i bilan)
 * @param {Object} [opt] — { nestResult, markupPct, areaEstimate, furnituraById, xizmatlar, stavka }
 *   stavka: TZ-20 narx stavkalari (server /api/narxlar, engine/narxStavka.js) — raspil, kromka, prisadka, ish haqi, ustama;
 *     berilmagan (yoki tanlanmagan) joyda materials.json dagi qiymat "taxmin" belgisi bilan. Natijada aniqlik — "Narx aniqligi X%".
 *   xizmatlar: { teshik: true } — usta tanlagan xizmatlar (S3); berilmasa teshik burg'ilash tannarxga kirmaydi
 *   furnituraById: ERP furnitura ID → {name, uzs, no_price} (hw.id bor bo'lsa narx shu yerdan)
 *   areaEstimate: kroysiz taxmin (katalog kartasi uchun) — varaq maydoni ÷ 0.85, butun varaqqa yaxlitlanmaydi
 * @returns {{lines, totalCost, clientTotal, perModule:[{cost, client}], missing:[], breakdown}}
 */
export function productionCost(cutlists, materials = {}, opt = {}) {
  const matByCode = {};
  (materials.panel_materials || []).forEach(m => { matByCode[m.code] = m; });
  const edgeByCode = {};
  (materials.edge_materials || []).forEach(m => {
    edgeByCode[m.code] = m;
    edgeByCode[String(m.code).replace(/\./g, '')] = m;
  });
  const hwByCode = {};
  (materials.hardware || []).forEach(m => { hwByCode[m.code] = m; });
  const holeByKind = {};
  (materials.hole_kinds || []).forEach(m => { holeByKind[m.code] = m; });
  const S = opt.stavka || null;             // TZ-20: narx stavkalari
  const labor = materials.labor || {};
  /* TZ-03 (qoida S3): xizmatni usta o'zi tanlaydi. Teshik burg'ilash (prisadka, moyka kesimi ham)
     faqat opt.xizmatlar.teshik === true bo'lsa tannarxga kiradi; aks holda summasi faqat taklif
     sifatida qaytadi (xizmat_taklif). Ish haqi — sexning doimiy xarajati, avtomatik (egasi qarori). */
  const teshikOn = !!(opt.xizmatlar && opt.xizmatlar.teshik === true);
  /* ustama: usta o'zi qo'ygan (Sozlamalar) → admin stavkasi (TZ-20) → materials.json */
  const sUst = S && S.ustama && S.ustama.foiz && S.ustama.foiz.qiymat != null ? S.ustama.foiz : null;
  const markup = opt.markupPct != null ? opt.markupPct
    : sUst ? sUst.qiymat / 100
    : (materials.pricing && materials.pricing.markup_pct != null ? materials.pricing.markup_pct : 0.35);
  const markupManba = opt.markupPct != null ? 'usta' : sUst ? sUst.manba : ustamaManbasi(materials);   // TZ-30: materials.json — egasi tasdiqlagan bo'lsa 'egasi'

  const missing = [];
  /* TZ-04: narx manbasi egasi tasdig'i bo'lmasa (price_src "egasi, <sana>" emas) — qator "taxminiy" */
  const taxminiy = [];
  const tasdiqlangan = (m) => /^egasi/.test(String((m && m.price_src) || ''));
  const markTaxminiy = (group) => { if (!taxminiy.includes(group)) taxminiy.push(group); return ' — taxminiy'; };
  const noteMissing = (group, code, name) => {
    if (!missing.some(m => m.group === group && m.code === code)) missing.push({ group, code, name: name || code });
  };
  /* kromka stavkasi: tanlangan sex xizmati (lenta bilan, metr) → materials.json (taxmin) */
  const edgeRate = (code) => {
    const x = kromkaXizmat(S, code);
    if (x) return { price: x.qiymat, tasdiq: tasdiqMi(x.manba), manba: x.manba, nom: x.nom };
    const m = edgeByCode[code] || edgeByCode[String(code).replace(/\./g, '')];
    return m && m.price_m > 0 ? { price: m.price_m, tasdiq: tasdiqlangan(m), manba: tasdiqlangan(m) ? 'egasi' : 'taxmin' } : { price: 0, tasdiq: false, manba: 'yoq' };
  };
  const edgePrice = (code) => {
    const r = edgeRate(code);
    if (r.price > 0) return r.price;
    const m = edgeByCode[code] || edgeByCode[String(code).replace(/\./g, '')];
    noteMissing('Kromka', code, m && m.name);
    return 0;
  };
  /* ERP furnitura (8 xonali ID) — app.js yuklaydi; ID bor bo'lsa narx FAQAT shu yerdan */
  const furnById = opt.furnituraById || {};
  const hwUnitPrice = (hw) => {
    const hid = hw.id || (opt.furnituraBoglash || {})[hw.code];   // TZ-20: kod → ID jadvali (id yozilmagan bo'lsa)
    if (hid) { const f = furnById[hid]; return f && f.uzs > 0 && !f.no_price ? f.uzs : 0; }
    const m = hwByCode[hw.code];
    return m && m.price > 0 ? m.price : 0;
  };
  const hwName = (hw) => (furnById[hw.id || (opt.furnituraBoglash || {})[hw.code]] || {}).name || (hwByCode[hw.code] || {}).name || hw.name || hw.code;
  const hwPrice = (hw) => {
    const price = hwUnitPrice(hw);
    if (!(price > 0)) noteMissing('Furnitura', hw.code, hwName(hw));
    return price;
  };
  /* teshik stavkasi: kalit — Bazis turi (konfirmat, petlya, …) yoki teshik turi; tanlangan prisadka xizmati → materials.json (taxmin) */
  const holeMeta = (kind) => holeByKind[kind] || holeByKind[D6_STAVKA[kind]] || holeByKind.drill;   // D6: petlya kosasi — 'hinge', eksentrik — 'cam' stavkasi (teshik agenti)
  const holeRate = (key, kind) => {
    const x = prisadkaXizmat(S, key, kind);
    if (x) return { price: x.qiymat, tasdiq: tasdiqMi(x.manba), manba: x.manba, nom: x.nom };
    const m = holeMeta(kind);
    return m && m.price > 0 ? { price: m.price, tasdiq: tasdiqlangan(m), manba: tasdiqlangan(m) ? 'egasi' : 'taxmin' } : { price: 0, tasdiq: false, manba: 'yoq' };
  };
  const holePrice = (key, kind) => {
    const r = holeRate(key, kind);
    if (r.price > 0) return r.price;
    noteMissing('Xizmatlar', 'hole:' + key, (holeByKind[kind] && holeByKind[kind].name) || ("Teshik burg'ilash (" + key + ')'));
    return 0;
  };
  /* Varap maydoni — KROY bilan bir xil format tanlovi (kichik format katta
   * panellarga sig'masa katta format tanlanadi, aks holda narx buziladi). */
  const kerf = +(materials.kerf != null ? materials.kerf : KERF_DEFAULT);
  const trimL = +(materials.trimL != null ? materials.trimL : (materials.trim != null ? materials.trim : TRIM_DEFAULT));
  const trimW = +(materials.trimW != null ? materials.trimW : (materials.trim != null ? materials.trim : TRIM_DEFAULT));
  const sheetArea = (meta, ps) => {
    const s = pickSheetSize(meta && meta.sheets, (L, W) =>
      (ps || []).every(p => panelFitsSheet(p, L, W, kerf, trimL, trimW)));
    return s ? s[0] * s[1] : 2800 * 2070;
  };

  /* ── yig'ish ── */
  const groups = {};                        // material → detallar
  const areaByMat = {};                     // material → mm²
  const edgeAgg = {}, hwAgg = {}, holeAgg = {};
  let totalParts = 0;
  for (const cl of cutlists || []) {
    totalParts += (cl.parts || []).length;
    for (const p of cl.parts || []) {
      const mat = p.material || 'LDSP18';
      (groups[mat] = groups[mat] || []).push(p);
      areaByMat[mat] = (areaByMat[mat] || 0) + p.length * p.width;
    }
    for (const e of cl.edges || []) {
      /* narx material kodi bo'yicha — eski fragmentlarda bir kodga turli qalinlik yozilgan */
      const key = String(e.material).replace(/\./g, '');
      if (!edgeAgg[key]) edgeAgg[key] = { material: e.material, thickness: e.thickness, meters: 0, name: e.name };
      edgeAgg[key].meters += e.meters;
    }
    for (const hw of cl.hardware || []) {
      hwAgg[hw.code] = hwAgg[hw.code] || { code: hw.code, qty: 0, id: hw.id, name: hw.name, unit: hw.unit };
      hwAgg[hw.code].qty += hw.qty;
    }
    for (const hl of cl.holes || []) {
      const key = hl.tur || hl.kind;           // TZ-20: Bazis teshigi turi bo'yicha (konfirmat, polka, ruchka — hammasi 'drill')
      holeAgg[key] = holeAgg[key] || { qty: 0, kind: hl.kind };
      holeAgg[key].qty += (hl.qty || 1) * (hl.nusxa || 1);
    }
  }

  const lines = [];

  /* 1) Plita — kroy natijasidagi haqiqiy varaqlar (yoki taxmin) */
  let sheetCost = 0, totalSheetsCount = 0, totalPanelArea = 0;
  const sheetCostByMat = {};
  const mats = opt.nestResult && opt.nestResult.by_material && !opt.areaEstimate
    ? Object.keys(opt.nestResult.by_material) : Object.keys(groups).filter(c => !(matByCode[c] && matByCode[c].unit_piece));
  for (const mat of mats) {
    const meta = matByCode[mat] || { name: mat };
    const nm = opt.nestResult && opt.nestResult.by_material && opt.nestResult.by_material[mat];
    const unitPrice = (nm && nm.sheet_price) || meta.sheet_price || 0;
    if (!(unitPrice > 0)) noteMissing('Plita', mat, meta.name);
    let qty, amount, name, group;
    if (nm && !opt.areaEstimate) {
      qty = nm.sheet_count || 0;
      amount = qty * unitPrice;
      totalPanelArea += nm.stats ? nm.stats.used_area_m2 : 0;
      const lost = (nm.unplaced || []).length;
      if (lost) noteMissing('Kroy', mat, `${meta.name || mat}: ${lost} ta detal varaqqa sig'madi — tannarxga kirmagan`);
      name = `${meta.name || mat} (${qty} varaq, ${nm.stats ? nm.stats.utilization_pct : 0}% unumdorlik)`;
      group = 'Plita (Kroy)';
    } else {
      const area = (areaByMat[mat] || 0);
      const sheetsExact = area / (sheetArea(meta, groups[mat]) * 0.85);   // 85% — taxminiy kroy unumdorligi
      qty = Math.round(sheetsExact * 100) / 100;
      amount = Math.round(sheetsExact * unitPrice);
      totalPanelArea += area / 1e6;
      name = `${meta.name || mat} (~${qty} varaq, taxminiy)`;
      group = 'Plita (Taxminiy)';
    }
    sheetCost += amount;
    totalSheetsCount += qty;
    sheetCostByMat[mat] = amount;
    lines.push({ group, code: mat, name, qty, unit: 'varaq', unit_price: unitPrice, amount, no_price: !(unitPrice > 0),
      util: nm && !opt.areaEstimate && nm.stats ? nm.stats.utilization_pct : null,   // TZ-18: hujjat tilida qayta yig'ish uchun
      tasdiq: unitPrice > 0 && !meta.taxminiy, manba: unitPrice > 0 ? (meta.taxminiy ? 'taxmin' : 'ERP') : 'yoq' });   // TZ-20: ERP plita narxi
  }

  /* 1b) TZ-20: raspil — list boshiga, egasi tanlagan stanok stavkasi (tanlanmasa — qator yo'q, ish haqi ichida taxmin) */
  let raspilCost = 0;
  const rx = raspilXizmat(S);
  if (rx && totalSheetsCount > 0) {
    const nList = Math.round(totalSheetsCount * 100) / 100;
    raspilCost = Math.round(nList * rx.qiymat);
    lines.push({ group: 'Raspil', code: 'raspil', name: `Raspil — ${nList} list × ${rx.qiymat}`, qty: nList, unit: 'list',
      unit_price: rx.qiymat, amount: raspilCost, tasdiq: tasdiqMi(rx.manba), manba: rx.manba, xizmat: rx.nom });
  }

  /* 1b) Standart stoleshnitsa bo'laklari (egasi #162): har bo'lak = 1 dona 3050/4200 li stoleshnitsa, maydon emas.
     Narxi ro'yxatlarda yo'q — materials.json da narxsiz (price_src 'yoq'); egasi bergach to'ldiriladi. */
  const stolPieceCost = {};
  for (const mat of Object.keys(groups).filter(c => matByCode[c] && matByCode[c].unit_piece)) {
    const meta = matByCode[mat];
    const qty = groups[mat].length;
    const unitPrice = meta.sheet_price || 0;
    if (!(unitPrice > 0)) noteMissing('Stoleshnitsa', mat, meta.name);
    const amount = qty * unitPrice;
    sheetCost += amount;
    stolPieceCost[mat] = unitPrice;
    lines.push({ group: 'Stoleshnitsa', code: mat, name: meta.name, qty, unit: 'dona', unit_price: unitPrice, amount, no_price: !(unitPrice > 0) });
  }

  /* 2) Kromka */
  let edgeCost = 0;
  for (const k in edgeAgg) {
    const a = edgeAgg[k];
    const price = edgePrice(a.material);
    const amount = Math.round(a.meters * price);
    edgeCost += amount;
    const em = edgeByCode[a.material] || edgeByCode[String(a.material).replace(/\./g, '')];
    const er = edgeRate(a.material);
    const tx = price > 0 && !er.tasdiq;
    lines.push({
      group: 'Kromka', code: a.material,
      name: ((em || {}).name || a.name || a.material) + (tx ? markTaxminiy('Kromka') : ''),
      qty: Math.round(a.meters * 100) / 100, unit: 'm', unit_price: price, amount, no_price: !(price > 0), taxminiy: tx,
      tasdiq: price > 0 && er.tasdiq, manba: er.manba, xizmat: er.nom
    });
  }

  /* 3) Furnitura */
  let hwCost = 0;
  for (const k in hwAgg) {
    const a = hwAgg[k];
    const meta = hwByCode[a.code] || {};
    const price = hwPrice(a);
    const amount = price * a.qty;
    hwCost += amount;
    const erp = !!(a.id || (opt.furnituraBoglash || {})[a.code]);   // ERP / do'kon narx ro'yxatidagi narx (TZ-20)
    lines.push({
      group: 'Furnitura', code: a.code, id: a.id, name: hwName(a),
      qty: a.qty, unit: meta.unit || a.unit || 'dona', unit_price: price, amount, no_price: !(price > 0),
      tasdiq: price > 0 && (erp || tasdiqlangan(meta)), manba: price > 0 ? (erp ? 'ERP' : tasdiqlangan(meta) ? 'egasi' : 'taxmin') : 'yoq'
    });
  }

  /* 4) Teshik burg'ilash — turi bo'yicha (petlya, shkant, kam, oddiy) — faqat usta tanlasa (S3) */
  let holeCost = 0, totalHoles = 0, holeTaklif = 0;
  if (!teshikOn) {
    for (const key in holeAgg) {
      totalHoles += holeAgg[key].qty;
      holeTaklif += holeAgg[key].qty * holeRate(key, holeAgg[key].kind).price;   // narx yo'q ro'yxatiga yozilmaydi
    }
    if (totalHoles) {
      lines.push({
        group: 'Xizmatlar', code: 'hole:tanlanmagan', info: true,
        name: `Teshik burg'ilash (prisadka) — tanlanmagan: ${totalHoles} teshik, ${holeTaklif} so'm`,
        qty: totalHoles, unit: 'dona', unit_price: 0, amount: 0, no_price: false
      });
    }
  }
  for (const key in (teshikOn ? holeAgg : {})) {
    const { qty, kind } = holeAgg[key];
    const price = holePrice(key, kind);
    const amount = qty * price;
    holeCost += amount;
    totalHoles += qty;
    const hr = holeRate(key, kind);
    const tx = price > 0 && !hr.tasdiq;
    lines.push({
      group: 'Xizmatlar', code: 'hole:' + key, kind,
      name: `${hr.nom || ((holeMeta(kind) || {}).name) || "Teshik burg'ilash"} (${qty} dona)` + (tx ? markTaxminiy('Prisadka') : ''),
      qty, unit: 'dona', unit_price: price, amount, no_price: !(price > 0), taxminiy: tx, tasdiq: price > 0 && hr.tasdiq, manba: hr.manba
    });
  }

  /* 5) Sex ish haqi (arralash + yig'ish) — TZ-20 stavkasi (detal / modul boshiga, yoqilgan yoki o'chirilgan) → materials.labor (taxmin) */
  const ih = S && S.ish_haqi ? S.ish_haqi : null;
  const ihOn = !(ih && ih.yoqilgan && ih.yoqilgan.qiymat === false);
  const perPiece = ih && ih.detal ? +ih.detal.qiymat || 0 : (labor.panel_per_piece || 0);
  const perFrag = ih && ih.modul ? +ih.modul.qiymat || 0 : (labor.per_fragment_min || 0);
  const ihTasdiq = ih ? tasdiqMi((ih.detal || {}).manba) && tasdiqMi((ih.modul || {}).manba) : tasdiqlangan(labor);
  const pieceLabor = ihOn ? totalParts * perPiece : 0;
  const fragLabor = ihOn ? (cutlists || []).length * perFrag : 0;
  const laborCost = Math.max(pieceLabor, fragLabor);
  if (ihOn && !(perPiece > 0 || perFrag > 0) && totalParts) noteMissing('Ish haqi', 'labor', 'Ish haqi stavkasi');
  if (laborCost > 0) {
    const tx = !ihTasdiq;
    lines.push({
      group: 'Ish haqi', code: 'labor',
      name: `Arralash, kromka urish va sex yig'ish (${totalParts} detal)` + (tx ? markTaxminiy('Ish haqi') : ''),
      qty: totalParts, unit: 'detal', unit_price: Math.round(laborCost / (totalParts || 1)), amount: laborCost, taxminiy: tx,
      tasdiq: !tx, manba: tx ? 'taxmin' : ((ih && ih.detal && ih.detal.manba) || 'egasi')
    });
  }

  /* Jami */
  const totalCost = sheetCost + raspilCost + edgeCost + hwCost + holeCost + laborCost;
  const clientTotal = Math.round(totalCost * (1 + markup));

  /* TZ-20: "Narx aniqligi X%" — mijoz narxining qancha qismi tasdiqlangan manbadan (ERP plita/furnitura, egasi yoki sex
     jadvali stavkasi). Ustama tasdiqlanmagan bo'lsa — ustama summasi ham taxmin. Narxi yo'q qator summaga kirmaydi — alohida soni. */
  const ustTasdiq = markupManba === 'usta' || tasdiqMi(markupManba);
  const tasdiqCost = lines.reduce((s, l) => s + (l.tasdiq && !l.info ? l.amount || 0 : 0), 0);
  const tasdiqSum = ustTasdiq ? Math.round(tasdiqCost * (1 + markup)) : tasdiqCost;
  const aniqTaxmin = lines.filter(l => !l.tasdiq && !l.info && l.amount > 0).map(l => ({ group: l.group, code: l.code, name: l.name, amount: l.amount, manba: l.manba || 'taxmin' }));
  if (!ustTasdiq && clientTotal > totalCost) aniqTaxmin.push({ group: 'Ustama', code: 'ustama', name: 'Ustama ' + Math.round(markup * 1000) / 10 + '%', amount: clientTotal - totalCost, manba: markupManba });
  /* Narxsiz qator summaga kirmaydi, lekin uning haqiqiy narxi noma'lum — shuning uchun jami "to'liq" emas: narxsiz qator bor
     ekan aniqlik 100% bo'lmaydi (99% da to'xtaydi) va narxsiz qatorlar soni alohida ko'rsatiladi. */
  const pctMax = missing.length > 0 ? 99 : 100;
  const aniqlik = { pct: clientTotal > 0 ? Math.min(pctMax, Math.floor(tasdiqSum / clientTotal * 100 + 1e-9)) : null,
    tasdiqlangan: tasdiqSum, jami: clientTotal, taxmin: aniqTaxmin, narxsiz: missing.length, ustama_manba: markupManba };

  /* Modullar bo'yicha taqsimot (kotirovka satrlari): plita — modul detallari maydoni
     ulushi bo'yicha, ish haqi — detal soni ulushi bo'yicha; qolgani — modulning o'zidan. */
  const areaTotal = Object.values(areaByMat).reduce((s, a) => s + a, 0);
  const perModule = (cutlists || []).map(cl => {
    let cost = 0;
    for (const p of cl.parts || []) {
      const mat = p.material || 'LDSP18';
      if (stolPieceCost[mat] != null) cost += stolPieceCost[mat];
      else if (areaByMat[mat] > 0) cost += (p.length * p.width) / areaByMat[mat] * (sheetCostByMat[mat] || 0);
    }
    if (raspilCost && areaTotal > 0) for (const p of cl.parts || []) cost += (p.length * p.width) / areaTotal * raspilCost;   // raspil — maydon ulushi bo'yicha
    for (const e of cl.edges || []) cost += e.meters * edgeRate(e.material).price;
    for (const hw of cl.hardware || []) cost += hw.qty * hwUnitPrice(hw);
    if (teshikOn) for (const hl of cl.holes || []) cost += (hl.qty || 1) * (hl.nusxa || 1) * holeRate(hl.tur || hl.kind, hl.kind).price;
    if (totalParts) cost += laborCost * (cl.parts || []).length / totalParts;
    return { cost: Math.round(cost), client: Math.round(cost * (1 + markup)) };
  });
  /* yaxlitlash qoldig'i oxirgi modulga — satrlar yig'indisi jami bilan aynan teng */
  if (perModule.length) {
    const diff = clientTotal - perModule.reduce((s, m) => s + m.client, 0);
    perModule[perModule.length - 1].client += diff;
  }

  const totalEdgeMeters = Math.round(Object.values(edgeAgg).reduce((s, x) => s + x.meters, 0) * 100) / 100;
  const totalHwCount = Object.values(hwAgg).reduce((s, x) => s + x.qty, 0);

  return {
    by_material: groups,
    lines,
    totalCost,
    clientTotal,
    perModule,
    missing,
    taxminiy,
    xizmat_taklif: { teshik: { tanlangan: teshikOn, qty: totalHoles, amount: teshikOn ? holeCost : holeTaklif } },
    sheetCost,
    raspilCost,
    edgeCost,
    hwCost,
    holeCost,
    laborCost,
    aniqlik,
    totalWorkshopCost: totalCost,
    suggestedClientPrice: clientTotal,
    margin: 1 + markup,
    markupPct: markup,
    breakdown: {
      sheetCost,
      raspilCost,
      edgeCost,
      hwCost,
      holeCost,
      laborCost,
      markupAmount: clientTotal - totalCost,
      sheetsCount: totalSheetsCount,
      panelAreaM2: Math.round(totalPanelArea * 1000) / 1000,
      edgeMeters: totalEdgeMeters,
      hwCount: totalHwCount,
      holeCount: totalHoles
    },
    // Orqaga moslik uchun:
    total: totalCost,
    _edgeAgg: edgeAgg,
    _hwAgg: hwAgg
  };
}
