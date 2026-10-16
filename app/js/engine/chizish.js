/* Smart3D engine/chizish.js — TZ-24 A: o'z modulini chizish (qo'lda konstruktor).
 *
 * Chizma (fragment.chizma) — yagona manba: undan istalgan o'lchamda (w, d, h) va material qalinligida
 *   chizmaPanellar → 3D panellar (assembler shaklida: eshik petlyasi, tortma, ruchka, oyoq/shtanga),
 *   chizmaFragment → detallar (kesim, raskroy, narx), joyi (joy — BPJ), kromka va furnitura.
 * Ikkalasi bitta joylash hisobidan (joylash) chiqadi — 3D va ishlab chiqarish bir xil.
 *
 * Chizma:
 *   { v: 1, tur: 'pastki'|'ustki'|'shkaf'|'tumba'|'erkin', w, d, h,
 *     tag: { tur: 'oyoq'|'sokol'|'yoq', h }, qopqoq: 'yaxlit'|'planka', orqa: 'hdf'|'yoq', ichki: Bo'lim }
 *   h — korpus bo'yi; pastki/tumba oyog'i korpus ostida (katalogdagi MC modullaridek: joylashuv z = oyoq bo'yi),
 *   shkaf/erkin sokoli — ichkarida (h ga kiradi).
 *   Bo'lim: bo'linadi — { yo: 'v' (vertikal bo'lgich) | 'h' (gorizontal), bo: [{ o: mm | null (teng), n: Bo'lim }] }
 *           yoki tarkib — { polka: soni, tortma: soni, shtanga: bool }; istalgan bo'limda eshik: 0|1|2, petlya: 'chap'|'ong'
 *           (eshik bo'lim ichidagi hamma narsani yopadi).
 * O'qlar (assembler bilan bir xil): lokal x — eni (chap = −x), y — chuqurligi (old = +y), z — bo'yi; markazlangan.
 * d — korpus chuqurligi; fasad korpus oldida (y = d/2 … d/2 + fasad qalinligi), HDF — ortida, katalog modullaridagidek.
 *
 * Qoidalar (dunyo standarti; texnolog tasdiqlaydi — TZ-24 5-bo'lim):
 *   System 32 — bo'lgich 32 mm qadamga yopishadi (UI); polka eni: LDSP 16 — 800, 18 — 900 mm gacha;
 *   petlya soni eshik bo'yiga qarab (≤1000 — 2, ≤1600 — 3, ≤2000 — 4, undan katta — 5; sex fayllaridan — d6.js); fasad tirqishi 2 mm;
 *   napravlyayushiy 250–600 mm (50 qadam); polkalar orasi ≥ 100 mm; petlyali eshik eni 150–600 mm.
 */
import { d6Teshiklar, petlyaSoni } from './d6.js';

export const CHIZMA_TURLARI = ['pastki', 'ustki', 'shkaf', 'tumba', 'erkin'];
export const QOIDA = {
  tirqish: 2, polkaOld: 20, polkaChet: 1, tortmaYon: 13, tortmaOrqa: 10, tortmaTepa: 40, tortmaMinH: 100,
  napr: [250, 300, 350, 400, 450, 500, 550, 600], polkaEni: { 16: 800, 18: 900 }, bolimMin: 100,
  eshikMin: 150, eshikMax: 600, plankaChuq: 80, sokolOrqaga: 50, ruchka: 128, oyoqKatta: 1000
};
const TARTIB = { korpus: 0, polka: 1, fasad: 2, orqa: 3 };
export { petlyaSoni };                                       // D6: sex fayllaridagi soni (engine/d6.js)

/** tur bo'yicha boshlang'ich chizma (o'lchami katalogdagi o'xshash modullardek) */
export function yangiChizma(tur = 'pastki') {
  const T = {
    pastki: { w: 600, d: 450, h: 708, tag: { tur: 'oyoq', h: 100 }, qopqoq: 'planka', ichki: { eshik: 2, polka: 1 } },
    ustki: { w: 600, d: 300, h: 721, tag: { tur: 'yoq', h: 0 }, qopqoq: 'yaxlit', ichki: { eshik: 2, polka: 2 } },
    shkaf: { w: 1200, d: 600, h: 2200, tag: { tur: 'sokol', h: 84 }, qopqoq: 'yaxlit',
      ichki: { yo: 'v', bo: [{ o: null, n: { eshik: 1, petlya: 'chap', shtanga: true, polka: 1 } }, { o: null, n: { eshik: 1, petlya: 'ong', polka: 4 } }] } },
    tumba: { w: 400, d: 450, h: 708, tag: { tur: 'oyoq', h: 100 }, qopqoq: 'planka', ichki: { tortma: 3 } },
    erkin: { w: 800, d: 350, h: 1800, tag: { tur: 'sokol', h: 84 }, qopqoq: 'yaxlit', ichki: { polka: 4 } }
  };
  return Object.assign({ v: 1, tur: T[tur] ? tur : 'pastki', orqa: 'hdf' }, JSON.parse(JSON.stringify(T[tur] || T.pastki)));
}

const kop = (o) => JSON.parse(JSON.stringify(o));
/** yo'l bo'yicha bo'lim (yo'l — bolalar indekslari: [] — ildiz, [1, 0] — ildizning 2-bolasining 1-bolasi) */
export function bolim(ch, yol) {
  let n = ch.ichki;
  for (const i of yol || []) n = n && n.bo && n.bo[i] ? n.bo[i].n : null;
  return n;
}
/** bo'limni o'zgartirish (yangi chizma qaytadi — eskisi o'zgarmaydi) */
export function bolimOzgar(ch, yol, fn) {
  const c = kop(ch);
  let n = c.ichki;
  for (const i of yol || []) n = n.bo[i].n;
  fn(n);
  return c;
}
/** bo'limni teng k qismga bo'lish (tarkibi birinchi qismga o'tadi, eshik — bo'linayotgan bo'limda qoladi) */
export function bol(ch, yol, yo, k) {
  return bolimOzgar(ch, yol, (n) => {
    const tarkib = { polka: n.polka, tortma: n.tortma, shtanga: n.shtanga };
    const bo = [];
    for (let i = 0; i < Math.max(2, Math.min(8, k | 0)); i++) bo.push({ o: null, n: i === 0 ? JSON.parse(JSON.stringify(tarkib)) : {} });
    for (const k2 of ['polka', 'tortma', 'shtanga', 'yo', 'bo']) delete n[k2];
    n.yo = yo; n.bo = bo;
  });
}
/** bo'linishni olib tashlash (bo'lim yana yaxlit) */
export function birlashtir(ch, yol) {
  return bolimOzgar(ch, yol, (n) => { delete n.yo; delete n.bo; });
}

/* ── joylash: chizma + o'lcham + qalinliklar → qutilar (min/max) ──
 * Konstruksiya — sex (MebelCity) Bazis modullaridagi qoidalar bilan (fragments-mc.json, 38 modul):
 *   pastki/tumba — pol to'liq eni (w×d), yon devorlar pol ustida (h−t), tepada 2 planka 80 mm (yoki yaxlit qopqoq);
 *                  oyoq korpus ostida (joylashuv z = oyoq bo'yi); "sokol" — oyoq + old frontalnaya (bo'yi − 10);
 *   ustki        — tepa va past to'liq eni, yon devorlar orasida (h−2t);
 *   shkaf/erkin  — yon devorlar poldan (h−t), tepa to'liq eni; sokol ichkarida (pol sokol ustida, old va orqa sokol);
 *   HDF — korpus ortida (h−2)×(w−2), 3 mm; polka — yon devorlar orasida (w−2t), chuqurligi d−40 (pastki), d−30 (ustki),
 *   d−50 (shkaf), orqaga tekis; fasad — tashqi chetdan 1 mm, oralig'i 2 mm, pastki modulda tepadan 3 mm;
 *   tortma — yon devordan 13 mm (napravlyayushiy), quti eni w−2t−26, chuqurligi = napravlyayushiy, balandligi fasad − 60,
 *   tubi (HDF) quti ostida. */
const POLKA_CHUQ = { pastki: 40, tumba: 40, ustki: 30, shkaf: 50, erkin: 50 };
function joylash(ch, w, d, h, o = {}) {
  const t = +o.t || 16, tp = +o.tp || 16, tf = +o.tf || 16, to = ch.orqa === 'yoq' ? 0 : (+o.to || 3);
  const Q = QOIDA, g = Q.tirqish, tur = ch.tur || 'pastki';
  const baland = tur === 'shkaf' || tur === 'erkin', past = tur === 'pastki' || tur === 'tumba', ustki = tur === 'ustki';
  const qutilar = [], furn = [], ogoh = [], hw = {};
  const qosh = (q) => { qutilar.push(q); return q; };
  const hwQosh = (code, qty, name, unit) => { if (!qty) return; const x = hw[code] || (hw[code] = { code, qty: 0, name, unit: unit || 'dona' }); x.qty += qty; };
  const xl = -w / 2, xr = w / 2, yb = -d / 2, yf = d / 2, zb = -h / 2, zt = h / 2;
  const tag = ch.tag || { tur: 'yoq', h: 0 };
  const tagH = ustki || tag.tur === 'yoq' ? 0 : Math.max(0, Math.min(200, +tag.h || 0));
  const F = { F: 'kromka_korpus' };
  let joint = 0;
  let R0, fasadB, fasadT;                                     // ichki ochiq joy; fasad pastki va yuqori cheti

  if (baland) {
    const pz = zb + (tag.tur === 'sokol' ? tagH : 0);        // pol sathi
    qosh({ code: 'yon', nom: 'Yon devor', slot: 'korpus', o: 'X', x0: xl, x1: xl + t, y0: yb, y1: yf, z0: zb, z1: zt - t, edge: F });
    qosh({ code: 'yon', nom: 'Yon devor', slot: 'korpus', o: 'X', x0: xr - t, x1: xr, y0: yb, y1: yf, z0: zb, z1: zt - t, edge: F });
    qosh({ code: 'qopqoq', nom: 'Tepa (tom)', slot: 'korpus', o: 'Y', x0: xl, x1: xr, y0: yb, y1: yf, z0: zt - t, z1: zt, edge: F });
    qosh({ code: 'tub', nom: 'Pol', slot: 'korpus', o: 'Y', x0: xl + t, x1: xr - t, y0: yb, y1: yf, z0: pz, z1: pz + t, edge: F });
    joint += 8;
    if (tag.tur === 'sokol' && tagH > 0) {
      qosh({ code: 'sokol', nom: 'Sokol', slot: 'korpus', o: 'Z', x0: xl + t, x1: xr - t, y0: yf - t, y1: yf, z0: zb, z1: pz, edge: F });
      qosh({ code: 'sokol', nom: 'Sokol', slot: 'korpus', o: 'Z', x0: xl + t, x1: xr - t, y0: yb, y1: yb + t, z0: zb, z1: pz, edge: F });
      joint += 4;
    }
    if (tag.tur === 'oyoq' && tagH > 0) ogoh.push({ kod: 'oyoq_baland' });
    R0 = { x0: xl + t, x1: xr - t, z0: pz + t, z1: zt - t };
    fasadB = pz + 1; fasadT = zt - 1;
    if (to) qosh({ code: 'orqa', nom: 'Orqa devor (HDF)', slot: 'orqa', o: 'Z', x0: xl + 1, x1: xr - 1, y0: yb - to, y1: yb, z0: pz + 1, z1: zt - 1, edge: {} });
  } else {
    /* pastki, tumba, ustki: pol to'liq eni */
    qosh({ code: 'tub', nom: 'Pol', slot: 'korpus', o: 'Y', x0: xl, x1: xr, y0: yb, y1: yf, z0: zb, z1: zb + t, edge: F });
    const yz1 = ustki ? zt - t : zt;                         // ustki — yon devorlar tepa va past orasida
    if (ustki) qosh({ code: 'qopqoq', nom: 'Tepa', slot: 'korpus', o: 'Y', x0: xl, x1: xr, y0: yb, y1: yf, z0: zt - t, z1: zt, edge: F });
    qosh({ code: 'yon', nom: 'Yon devor', slot: 'korpus', o: 'X', x0: xl, x1: xl + t, y0: yb, y1: yf, z0: zb + t, z1: yz1, edge: F });
    qosh({ code: 'yon', nom: 'Yon devor', slot: 'korpus', o: 'X', x0: xr - t, x1: xr, y0: yb, y1: yf, z0: zb + t, z1: yz1, edge: F });
    joint += 4;
    if (!ustki) {
      if (ch.qopqoq === 'yaxlit') qosh({ code: 'qopqoq', nom: 'Qopqoq', slot: 'korpus', o: 'Y', x0: xl + t, x1: xr - t, y0: yb, y1: yf, z0: zt - t, z1: zt, edge: F });
      else {
        qosh({ code: 'planka', nom: 'Planka', slot: 'korpus', o: 'Y', x0: xl + t, x1: xr - t, y0: yb, y1: yb + Q.plankaChuq, z0: zt - t, z1: zt, edge: F });
        qosh({ code: 'planka', nom: 'Planka', slot: 'korpus', o: 'Y', x0: xl + t, x1: xr - t, y0: yf - Q.plankaChuq, y1: yf, z0: zt - t, z1: zt, edge: F });
      }
      joint += 4;
      if (tagH > 0) {
        const n = w > Q.oyoqKatta ? 6 : 4;
        hwQosh('NOG-90', n, 'Nojka (oyoq)');
        const xs = n === 6 ? [xl + 50, 0, xr - 50] : [xl + 50, xr - 50];
        for (const x of xs) for (const y of [yb + 50, yf - 60]) furn.push({ tur: 'oyoq', o: [x, y, zb], ax: [1, 0, 0], az: [0, 0, -1], l: tagH });
        if (tag.tur === 'sokol') qosh({ code: 'frontalnaya', nom: 'Sokol (frontalnaya)', slot: 'korpus', o: 'Z', x0: xl, x1: xr, y0: yf - t, y1: yf, z0: zb - (tagH - 10), z1: zb, edge: F });
      }
    }
    R0 = { x0: xl + t, x1: xr - t, z0: zb + t, z1: zt - t };
    fasadB = zb + 1; fasadT = past ? zt - 3 : zt - 1;
    if (to) qosh({ code: 'orqa', nom: 'Orqa devor (HDF)', slot: 'orqa', o: 'Z', x0: xl + 1, x1: xr - 1, y0: yb - to, y1: yb, z0: zb + 1, z1: zt - 1, edge: {} });
  }
  const polkaD = d - (POLKA_CHUQ[tur] || 40);

  /* fasad cheti: tashqi — korpus chetidan 1 mm (pastki modulning tepasi — 3 mm), ichki bo'lgich — uning o'rtasidan 1 mm */
  const fasadRect = (R, chet) => ({
    x0: chet.L ? xl + 1 : R.x0 - t / 2 + g / 2, x1: chet.R ? xr - 1 : R.x1 + t / 2 - g / 2,
    z0: chet.B ? fasadB : R.z0 - t / 2 + g / 2, z1: chet.T ? fasadT : R.z1 + t / 2 - g / 2
  });
  let fasadNo = 0;
  /* ruchka markazi — D6 teshiklari bilan bir xil: yaqin teshik eshik uchidan 50 mm (pastki — tepada, ustki — pastda, baland — o'rtada) */
  const ruchkaZ = (z0f, z1f) => (ustki ? z0f + 50 + Q.ruchka / 2 : baland ? (z0f + z1f) / 2 : z1f - 50 - Q.ruchka / 2);
  const FASAD = { F: 'kromka_fasad', B: 'kromka_fasad', L: 'kromka_fasad', R: 'kromka_fasad' };

  function eshiklar(n, R, chet) {
    const f = fasadRect(R, chet);
    const k = n.eshik === 2 ? 2 : 1, ew = (f.x1 - f.x0 - (k - 1) * g) / k, eh = f.z1 - f.z0;
    for (let i = 0; i < k; i++) {
      const ex0 = f.x0 + i * (ew + g), ex1 = ex0 + ew;
      const side = k === 2 ? (i === 0 ? 'left' : 'right') : (n.petlya === 'ong' ? 'right' : 'left');
      const id = 'eshik_' + (++fasadNo);
      qosh({ code: 'eshik', nom: 'Eshik', slot: 'fasad', o: 'Z', x0: ex0, x1: ex1, y0: yf, y1: yf + tf, z0: f.z0, z1: f.z1, edge: FASAD,
        isDoor: true, id, hingeSide: side, handle: { x: side === 'left' ? ex1 - 40 : ex0 + 40, y: yf + tf + 14, z: ruchkaZ(f.z0, f.z1), w: 12, d: 22, h: Math.min(eh * 0.4, Q.ruchka + 32) } });
      hwQosh('PET-4', petlyaSoni(eh), 'Petlya'); hwQosh('RU-128', 1, 'Ruchka');
      if (ew < Q.eshikMin || ew > Q.eshikMax) ogoh.push({ kod: ew < Q.eshikMin ? 'eshik_tor' : 'eshik_keng', n: Math.round(ew) });
    }
  }

  function tortmalar(n, R, chet) {
    const f = fasadRect(R, chet);
    const k = Math.max(1, Math.min(8, n.tortma | 0)), fh = (f.z1 - f.z0 - (k - 1) * g) / k;
    const L = [...Q.napr].reverse().find(v => v <= d - Q.tortmaOrqa) || 0;
    if (!L) { ogoh.push({ kod: 'tortma_chuqur', n: Math.round(d) }); return; }
    if (fh < Q.tortmaMinH) ogoh.push({ kod: 'tortma_past', n: Math.round(fh) });
    const bx0 = R.x0 + Q.tortmaYon, bx1 = R.x1 - Q.tortmaYon, bh = Math.max(60, fh - 60), by0 = yf - L, by1 = yf;
    for (let i = 0; i < k; i++) {
      const tz0 = f.z0 + i * (fh + g), tz1 = tz0 + fh;
      const id = 'tortma_' + (++fasadNo);
      qosh({ code: 'tortma_fasad', nom: 'Tortma fasadi', slot: 'fasad', o: 'Z', x0: f.x0, x1: f.x1, y0: yf, y1: yf + tf, z0: tz0, z1: tz1, edge: FASAD, isDrawer: true, id,
        handle: { x: (f.x0 + f.x1) / 2, y: yf + tf + 14, z: (tz0 + tz1) / 2, w: Math.min(Q.ruchka + 32, (f.x1 - f.x0) * 0.4), d: 22, h: 12 } });   // D6: markazda
      const bz0 = tz0 + 28;
      qosh({ code: 'tortma_yon', nom: 'Tortma yoni', slot: 'korpus', o: 'X', x0: bx0, x1: bx0 + tp, y0: by0, y1: by1, z0: bz0, z1: bz0 + bh, edge: F, drawerOf: id });
      qosh({ code: 'tortma_yon', nom: 'Tortma yoni', slot: 'korpus', o: 'X', x0: bx1 - tp, x1: bx1, y0: by0, y1: by1, z0: bz0, z1: bz0 + bh, edge: F, drawerOf: id });
      qosh({ code: 'tortma_ich', nom: 'Tortma orqasi va ichki oldi', slot: 'korpus', o: 'Z', x0: bx0 + tp, x1: bx1 - tp, y0: by0, y1: by0 + tp, z0: bz0, z1: bz0 + bh, edge: F, drawerOf: id });
      qosh({ code: 'tortma_ich', nom: 'Tortma orqasi va ichki oldi', slot: 'korpus', o: 'Z', x0: bx0 + tp, x1: bx1 - tp, y0: by1 - tp, y1: by1, z0: bz0, z1: bz0 + bh, edge: F, drawerOf: id });
      qosh({ code: 'tortma_tub', nom: 'Tortma tubi (HDF)', slot: 'orqa', o: 'Y', x0: bx0, x1: bx1, y0: by0, y1: by1, z0: bz0 - 3, z1: bz0, edge: {}, drawerOf: id });
      hwQosh('NAP-' + L, 1, 'Napravlyayushiy L' + L + ' (sharikli, to\'liq chiqish)', 'komplekt'); hwQosh('RU-128', 1, 'Ruchka');
      joint += 4;
    }
  }

  function yur(n, R, chet, eshikBor, yol) {
    if (!n) return;
    if (o.bolimlar) o.bolimlar.push({ yol, x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1, bolingan: n.yo === 'v' || n.yo === 'h', yo: n.yo || null, eshik: n.eshik || 0 });
    if (n.eshik && !eshikBor) { eshiklar(n, R, chet); eshikBor = true; }
    if (n.yo === 'v' || n.yo === 'h') {
      const v = n.yo === 'v', bo = n.bo || [];
      const L0 = v ? R.x0 : R.z0, L1 = v ? R.x1 : R.z1, kk = bo.length;
      const bor = (L1 - L0) - (kk - 1) * t;
      const aniq = bo.reduce((a, b) => a + (b.o > 0 ? +b.o : 0), 0), teng = bo.filter(b => !(b.o > 0)).length;
      const tengO = teng ? (bor - aniq) / teng : 0;
      if (!teng && Math.abs(aniq - bor) > 0.5) ogoh.push({ kod: 'bolim_yigindi', n: Math.round(aniq), m: Math.round(bor) });
      let s = L0;
      bo.forEach((b, i) => {
        const len = b.o > 0 ? +b.o : tengO;
        if (len < Q.bolimMin) ogoh.push({ kod: 'bolim_kichik', n: Math.round(len) });
        const R2 = v ? { x0: s, x1: s + len, z0: R.z0, z1: R.z1 } : { x0: R.x0, x1: R.x1, z0: s, z1: s + len };
        const c2 = v ? { L: i === 0 ? chet.L : false, R: i === kk - 1 ? chet.R : false, B: chet.B, T: chet.T }
          : { L: chet.L, R: chet.R, B: i === 0 ? chet.B : false, T: i === kk - 1 ? chet.T : false };
        yur(b.n, R2, c2, eshikBor, yol.concat(i));
        s += len;
        if (i < kk - 1) {
          if (o.bolgichlar) o.bolgichlar.push({ yol, i, yo: n.yo, s, x0: v ? s : R.x0, x1: v ? s + t : R.x1, z0: v ? R.z0 : s, z1: v ? R.z1 : s + t, L0, L1 });
          if (v) qosh({ code: 'bolgich', nom: 'Vertikal bo\'lgich', slot: 'korpus', o: 'X', x0: s, x1: s + t, y0: yb, y1: yf, z0: R.z0, z1: R.z1, edge: F });
          else qosh({ code: 'bolgich_g', nom: 'Gorizontal bo\'lgich', slot: 'korpus', o: 'Y', x0: R.x0, x1: R.x1, y0: yb, y1: yf, z0: s, z1: s + t, edge: F });
          joint += 4;
          s += t;
        }
      });
      return;
    }
    /* tarkib */
    if (n.tortma > 0) { tortmalar(n, R, chet); return; }
    const k = Math.max(0, Math.min(20, n.polka | 0));
    if (k) {
      const qad = (R.z1 - R.z0 - k * tp) / (k + 1);
      if (qad < Q.bolimMin) ogoh.push({ kod: 'polka_zich', n: Math.round(qad) });
      const span = R.x1 - R.x0, maxSpan = Q.polkaEni[tp] || (tp >= 18 ? 900 : 800);
      if (span > maxSpan) ogoh.push({ kod: 'polka_keng', n: Math.round(span), m: maxSpan });
      for (let i = 1; i <= k; i++) {
        const z = R.z0 + i * qad + (i - 1) * tp;
        qosh({ code: 'polka', nom: 'Polka', slot: 'polka', o: 'Y', x0: R.x0, x1: R.x1, y0: yb, y1: yb + polkaD, z0: z, z1: z + tp, edge: F });
      }
      hwQosh('POLKADERJ', 4 * k, 'Polkaderjatel (Ø5)');
    }
    if (n.shtanga) {
      const l = R.x1 - R.x0;
      furn.push({ tur: 'shtanga', o: [R.x0, (yb + yf) / 2, R.z1 - 60], ax: [1, 0, 0], az: [0, 0, 1], l });
      hwQosh('SHTANGA', Math.round(l) / 1000, 'Shtanga (kiyim ilgich)', 'm'); hwQosh('SHT-FL', 2, 'Shtanga tutqichi (flanets)');
    }
  }

  yur(ch.ichki, R0, { L: true, R: true, B: true, T: true }, false, []);
  hwQosh('TS-1730', joint, 'Konfirmat (styajka)');
  return { qutilar, furn, ogoh, hardware: Object.values(hw).map(x => Object.assign(x, { qty: Math.round(x.qty * 100) / 100 })) };
}

const ol = (q) => ({ X: q.x1 - q.x0, Y: q.z1 - q.z0, Z: q.y1 - q.y0 });   // Bazis o'qlarida o'lcham
const r1 = (v) => Math.round(v * 10) / 10;

/** 3D: assembler shaklidagi panellar (markaz va o'lcham), eshik/tortma belgilari bilan; furn — oyoq va shtanga */
export function chizmaPanellar(ch, w, d, h, o = {}) {
  const J = joylash(ch, w, d, h, o);
  const panels = J.qutilar.map((q, i) => {
    const p = { id: q.id || (q.code + '_' + i), name: q.nom, slot: q.slot, code: q.code,
      w: q.x1 - q.x0, d: q.y1 - q.y0, h: q.z1 - q.z0, x: (q.x0 + q.x1) / 2, y: (q.y0 + q.y1) / 2, z: (q.z0 + q.z1) / 2 };
    if (q.isDoor) Object.assign(p, { isFasad: true, isDoor: true, hingeSide: q.hingeSide, handle: q.handle });
    if (q.isDrawer) Object.assign(p, { isFasad: true, isDrawer: true, handle: q.handle });
    if (q.drawerOf) p.drawerOf = q.drawerOf;
    return p;
  });
  return { panels, doors: panels.filter(p => p.isDoor), furn: J.furn, ogoh: J.ogoh };
}

/* ── birikmalar (TZ-11): konfirmat — sex Bazis modullaridagidek (fragments-mc.json birikmalar, TZ-06) ──
 * Bir detalning toretsi (uchi yoki qirrasi) ikkinchisining yuzasiga tegsa: yuza detalda Ø7 o'tuvchi teshik, torets detalda
 * Ø4,5 × 35 (detal qalinligi o'rtasida); planka birikmasi — Ø8 va Ø5 (sex modullaridagidek); joylari birikish chizig'i
 * bo'ylab Bazis qoidasi bilan (chetdan 60, qadam 32). Tekshiruv: MC-KP-01/02, MC-KU-07 qo'lda chizilsa — teshiklar aynan.
 * Mahalliy o'qlar (cutlist teshik formati): y — uzunlik bo'ylab L uchidan, x — eni bo'ylab F (old) qirradan;
 * torets: L/R — uzunlik uchlari, F/B — bo'ylama qirralar. Faqat korpus detallari (polka — ushlagichda, tortma, fasad, HDF — yo'q). */
const LW = { X: ['Y', 'Z'], Y: ['X', 'Z'], Z: ['Y', 'X'] };
const BQ = { S: 60, P: 32, jadval: [[150, 1], [600, 2], [1200, 3], [2400, 4]] };
const BIRIKADI = new Set(['yon', 'tub', 'qopqoq', 'planka', 'bolgich', 'bolgich_g', 'sokol']);
function bqoida(L) {                                             // cutlist.js bazisQoida bilan bir xil (aylana importsiz)
  const row = BQ.jadval.find(r => L <= r[0] + 1e-6);
  let n = row ? row[1] : BQ.jadval[BQ.jadval.length - 1][1];
  if (n >= 2 && L - 2 * BQ.S < -1e-6) n = 1;
  if (n <= 1) return [L / 2];
  const step = Math.floor((L - 2 * BQ.S) / ((n - 1) * BQ.P) + 1e-6) * BQ.P, f = (L - step * (n - 1)) / 2;
  return Array.from({ length: n }, (_, k) => f + k * step);
}
function birikmalar(qutilar, w, d, h) {
  /* Bazis o'qlari: X = w/2 − x, Y = z + h/2, Z = y + d/2 */
  const B = qutilar.map((q, i) => ({ i, q, ok: BIRIKADI.has(q.code) && !q.drawerOf && q.slot === 'korpus',
    lo: { X: w / 2 - q.x1, Y: q.z0 + h / 2, Z: q.y0 + d / 2 }, hi: { X: w / 2 - q.x0, Y: q.z1 + h / 2, Z: q.y1 + d / 2 } }));
  const tesh = qutilar.map(() => []);
  const mahalliy = (b, P) => { const [la, wa] = LW[b.q.o]; return { y: r1(P[la] - b.lo[la]), x: r1(b.hi[wa] - P[wa]) }; };
  let soni = 0;
  for (const A of B) for (const F of B) {
    if (A === F || !A.ok || !F.ok) continue;
    const a = F.q.o;                                             // tegish o'qi — yuza detal normali
    if (A.q.o === a) continue;                                   // yuzama-yuza — birikma emas
    const yuqori = Math.abs(A.hi[a] - F.lo[a]) < 0.6, past = Math.abs(A.lo[a] - F.hi[a]) < 0.6;
    if (!yuqori && !past) continue;
    const boshqa = ['X', 'Y', 'Z'].filter(k => k !== a);
    const ust = boshqa.map(k => [Math.max(A.lo[k], F.lo[k]), Math.min(A.hi[k], F.hi[k])]);
    if (ust.some(([u0, u1]) => u1 - u0 < 0.5)) continue;
    const r = boshqa.find(k => k !== A.q.o), [r0, r1_] = ust[boshqa.indexOf(r)];
    const c = (A.lo[A.q.o] + A.hi[A.q.o]) / 2, tA = A.hi[A.q.o] - A.lo[A.q.o], tF = F.hi[a] - F.lo[a];
    const [la, wa] = LW[A.q.o];
    const torets = a === la ? (yuqori ? 'R' : 'L') : (yuqori ? 'B' : 'F');
    const planka = A.q.code === 'planka', dF = planka ? 8 : 7, dA = planka ? 5 : 4.5;
    for (const s of bqoida(r1_ - r0)) {
      const P = { [a]: yuqori ? A.hi[a] : A.lo[a], [r]: r0 + s, [A.q.o]: c };
      tesh[F.i].push(Object.assign({ side: 'B', dia: dF, depth: r1(tF), kind: 'evrovint' }, mahalliy(F, P)));
      const m = mahalliy(A, P);
      if (torets === 'L') m.y = 0; else if (torets === 'R') m.y = r1(A.hi[la] - A.lo[la]); else if (torets === 'F') m.x = 0; else m.x = r1(A.hi[wa] - A.lo[wa]);
      tesh[A.i].push(Object.assign({ side: 'T', torets, dia: dA, depth: 35, kind: 'evrovint_torets' }, m));
      soni++;
    }
    void tA;
  }
  return { tesh, soni };
}

/**
 * Detallar (katalog formati): bir xil o'lchamdagi detallar bitta qatorda (soni bilan), joyi — har nusxa (joy, BPJ).
 * Formula o'rnida son (shu o'lcham uchun) — chizma har safar shu o'lchamga qayta hisoblanadi.
 * birikmalar — konfirmat teshiklari (cutlist birikma formati, har teshik alohida: L = 0, qo'lda t = 0).
 */
export function chizmaFragment(ch, w, d, h, o = {}) {
  const J = joylash(ch, w, d, h, o);
  const BK = birikmalar(J.qutilar, w, d, h);
  /* D6 (engine/d6.js): petlya kosasi va vintlari, planka, polka ushlagich, ruchka — Bazis o'qlarida (birikmalar bilan bir xil) */
  const tur = ch.tur || 'pastki';
  const D = d6Teshiklar(J.qutilar.map(q => ({
    o: q.o, lo: { X: w / 2 - q.x1, Y: q.z0 + h / 2, Z: q.y0 + d / 2 }, hi: { X: w / 2 - q.x0, Y: q.z1 + h / 2, Z: q.y1 + d / 2 },
    rol: q.isDoor ? 'eshik' : q.isDrawer ? 'tortma_fasad' : q.drawerOf ? null : q.code === 'polka' ? 'polka' : (q.code === 'yon' || q.code === 'bolgich') ? 'yon' : null,
    petlya: q.isDoor ? (q.hingeSide === 'right' ? 'min' : 'max') : null,          // 'left' — lokal −x = Bazis X ning katta tomoni
    ruchkaJoy: tur === 'ustki' ? 'past' : tur === 'shkaf' || tur === 'erkin' ? 'orta' : 'tepa'
  })), { ruchka: QOIDA.ruchka });
  D.forEach((arr, i) => { BK.tesh[i] = BK.tesh[i].concat(arr); });
  const tim = (arr) => arr.map(x => [x.side, x.torets || '', x.yuza || '', x.x, x.y, x.dia, x.depth].join(',')).sort().join(';');
  const guruh = new Map();
  for (const [qi, q] of J.qutilar.entries()) {
    const S = ol(q);
    const [len, wid] = q.o === 'X' ? [S.Y, S.Z] : q.o === 'Y' ? [S.X, S.Z] : [S.Y, S.X];
    const key = [q.code, q.slot, r1(len), r1(wid), JSON.stringify(q.edge), tim(BK.tesh[qi])].join('|');
    if (!guruh.has(key)) guruh.set(key, { code: q.code, nom: q.nom, slot: q.slot, len: r1(len), wid: r1(wid), edge: q.edge, o: q.o, p: [], tesh: BK.tesh[qi] });
    /* joy: Bazis o'qlarida min burchak (joy.js: x = w/2 − (X + S.X/2), y = Z + S.Z/2 − d/2, z = Y + S.Y/2 − h/2) */
    guruh.get(key).p.push([String(r1(w / 2 - q.x1)), String(r1(q.z0 + h / 2)), String(r1(q.y0 + d / 2))]);
  }
  const g = [...guruh.values()].sort((a, b) => (TARTIB[a.slot] - TARTIB[b.slot]) || (b.len * b.wid - a.len * a.wid));
  const sanoq = {}, birik = [];
  const parts = g.map(x => {
    sanoq[x.code] = (sanoq[x.code] || 0) + 1;
    const code = sanoq[x.code] > 1 ? x.code + '_' + sanoq[x.code] : x.code;
    for (const t of x.tesh) birik.push({ tur: /^d6_/.test(t.kind) ? 'd6' : 'evrovint', L: '0', qolda: [{ t: 0 }], teshiklar: [Object.assign({ part: code, x0: String(t.x), sx: 0, y0: String(t.y), sy: 0 }, t)] });
    return { code, nom: x.nom, qty: x.p.length, len: String(x.len), width: String(x.wid), slot: x.slot,
      tekstura: x.slot === 'orqa' ? 'erkin' : 'uzunlik', edge: x.edge, joy: { o: x.o, p: x.p } };
  });
  /* konfirmat soni — haqiqiy birikmalardan (har teshik juftligi — bitta vint) */
  const hardware = J.hardware.map(x => (x.code === 'TS-1730' ? Object.assign({}, x, { qty: BK.soni }) : x)).filter(x => x.qty > 0);
  return { parts, hardware, ogoh: J.ogoh, furn: J.furn, birikmalar: birik };
}

/** muharrir uchun: bo'limlar (yo'li va old ko'rinishdagi to'rtburchagi), bo'lgichlar (sudrash), panellar, ogohlantirishlar */
export function chizmaKorinish(ch, o = {}) {
  const bolimlar = [], bolgichlar = [];
  const J = joylash(ch, ch.w, ch.d, ch.h, Object.assign({}, o, { bolimlar, bolgichlar }));
  return { bolimlar, bolgichlar, qutilar: J.qutilar, ogoh: J.ogoh, hardware: J.hardware };
}

/** bo'lgichni surish: i-bo'lim (va kerak bo'lsa keyingisi) aniq o'lchamga o'tadi; qadam — 32 mm (System 32) */
export function bolgichSur(ch, yol, i, yangiS, o = {}) {
  const t = +o.t || 16, qadam = o.qadam || 32;
  const K = chizmaKorinish(ch, o).bolgichlar.find(b => b.yol.join() === (yol || []).join() && b.i === i);
  if (!K) return ch;
  return bolimOzgar(ch, yol, (n) => {
    const bo = n.bo, kk = bo.length;
    /* i-bo'lim boshi: oldingi bo'lgichdan keyin */
    let bosh = K.L0;
    const umumiy = (K.L1 - K.L0) - (kk - 1) * t;
    const aniq = bo.reduce((a, b) => a + (b.o > 0 ? +b.o : 0), 0), teng = bo.filter(b => !(b.o > 0)).length;
    const tengO = teng ? (umumiy - aniq) / teng : 0;
    for (let j = 0; j < i; j++) bosh += (bo[j].o > 0 ? +bo[j].o : tengO) + t;
    const eski = bo[i].o > 0 ? +bo[i].o : tengO, kel = bo[i + 1].o > 0 ? +bo[i + 1].o : tengO;
    let len = Math.round((yangiS - bosh) / qadam) * qadam;
    len = Math.max(QOIDA.bolimMin, Math.min(eski + kel - QOIDA.bolimMin, len));
    bo[i].o = len;
    /* keyingisi — aniq bo'lsa, yig'indi saqlanadi; teng bo'lsa — qolgan joyni o'zi oladi (modul cho'zilsa ham to'g'ri) */
    if (bo[i + 1].o > 0) bo[i + 1].o = Math.round(eski + kel - len);
  });
}

/* saqlash: daraxt yassi ro'yxatga (server: hujjat chuqurligi ≤ 12) — tugun: { yo, bo: [[o, bola indeksi]] } yoki tarkib */
const MAX_TUGUN = 200;
export function yassi(ch) {
  const tugun = [];
  const yoz = (n) => {
    if (tugun.length >= MAX_TUGUN) return -1;
    const k = tugun.length, x = {};
    tugun.push(x);
    for (const key of ['polka', 'tortma', 'shtanga', 'eshik', 'petlya']) if (n[key] != null && n[key] !== 0 && n[key] !== false) x[key] = n[key];
    if (n.yo && n.bo) { x.yo = n.yo; x.bo = n.bo.map(b => [b.o > 0 ? +b.o : 0, yoz(b.n || {})]); }
    return k;
  };
  yoz(ch.ichki || {});
  const c = Object.assign({}, ch);
  delete c.ichki;
  c.tugun = tugun;
  return c;
}
export function tikla(s) {
  if (!s || !Array.isArray(s.tugun)) return s;
  const T = s.tugun;
  const oqi = (k, chuq) => {
    const x = T[k] || {}, n = {};
    for (const key of ['polka', 'tortma', 'shtanga', 'eshik', 'petlya']) if (x[key] != null) n[key] = x[key];
    if (x.yo && Array.isArray(x.bo) && chuq < 30) { n.yo = x.yo; n.bo = x.bo.map(([o, b]) => ({ o: o > 0 ? o : null, n: oqi(b, chuq + 1) })); }
    return n;
  };
  const c = Object.assign({}, s, { ichki: oqi(0, 0) });
  delete c.tugun;
  return c;
}

/** chizma → katalog yozuvi (fragment). Detallar har safar o'lchamga qarab hisoblanadi (cutlist/assembler/bpj — chizmaYech) */
export function chizmaKatalog(ch, code, nom) {
  const kat = { pastki: ['cabinet', 'chizma'], ustki: ['wall_cabinet', 'chizma'], shkaf: ['wardrobe', 'chizma'], tumba: ['drawer_base', 'chizma'], erkin: ['shelf', 'chizma'] }[ch.tur] || ['cabinet', 'chizma'];
  return {
    code, name: nom || code, category: kat[0], group: kat[1], w: ch.w, d: ch.d, h: ch.h,
    min_w: 200, max_w: 3000, min_d: 200, max_d: 900, min_h: 200, max_h: 2800, stretch_axis: 'w',
    price_mode: 'unit', price: 0, production: 'panel', auto_hardware: false,
    default_z: ch.tur === 'ustki' ? 1450 : (ch.tur === 'pastki' || ch.tur === 'tumba') && ch.tag && ch.tag.tur !== 'yoq' ? +ch.tag.h || 0 : 0,
    ...((ch.tur === 'pastki' || ch.tur === 'tumba') && ch.tag && ch.tag.tur === 'sokol' ? { sokol_ichida: true } : {}),
    slots: { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'MDF16', orqa: 'HDF3' },
    parts: [], edge: [], holes: [], hardware: [], chizma: ch
  };
}

/** chizmali fragment → shu o'lcham va qalinlikdagi oddiy fragment (detallar, joy, furnitura) */
export function chizmaYech(frag, w, d, h, o = {}) {
  if (!frag || !frag.chizma) return frag;
  const f = chizmaFragment(frag.chizma, w, d, h, o);
  return Object.assign({}, frag, { parts: f.parts, hardware: f.hardware, birikmalar: f.birikmalar, chizmaOgoh: f.ogoh });
}
