/* Smart3D engine/d6.js — D6: sex konstruktiv standarti bo'yicha teshiklar (egasi #136: "taklif bo'yicha qil").
 * Petlya kosasi va vintlari, petlya plankasi, polka ushlagich, ruchka, tortma yo'naltiruvchisi (NAPR). Konfirmat — alohida
 * (birikmalar, TZ-06/TZ-11); eksentrik (EKS) — konfirmat o'rniga, qo'lda chizilgan modul birikmalarida (chizish.js).
 *
 * Qiymatlar sexning haqiqiy fayllaridan (Smart3D_toplam_2026-10-16, 30 buyurtma; o'lchov 2026-10-17):
 *   petlya kosasi  — Ø35 × 13, eshik uchidan 105 mm, petlya qirrasidan 21,5 mm (534 eshikning hammasida, 1-yuzada);
 *   kosa vintlari  — 2 × Ø3 × 2, kosa markazidan ±24 mm, qirradan 6 mm ichkarida (27,5);
 *   planka         — 2 × Ø3 × 3, yon devor old qirrasidan 37 mm, oralig'i 32 mm, markazi kosa balandligida;
 *   polka ushlagich — Ø5 × 9, markazi polka ostidan 2,5 mm pastda (1068 tadan 1032 tasi), yon devor old qirrasidan 65 mm,
 *                    orqa qirrasidan 45 mm (eng ko'p uchragan; 909 ushlagich);
 *   ruchka          — 2 × Ø5 o'tuvchi, oralig'i ruchkaga qarab (sexda 160 — 309 tadan 302 tasi); eshikda tik, ochiladigan
 *                    qirradan 40 mm, yaqin teshigi eshik uchidan 50 mm (pastki shkaf — tepada, ustki — pastda, baland — o'rtada);
 *                    tortma fasadida yotiq, markazda.
 * Petlya soni eshik bo'yiga qarab — sex fayllaridan (534 eshik): ≤ 1000 — 2 (472 tadan 470), ≤ 1600 — 3, ≤ 2000 — 4, undan katta — 5;
 *   teng oraliqda. Eni 650 dan, bo'yi 1500 dan katta eshik — kupe (surma): petlya, planka va ruchka teshigi yo'q (sexdagi
 *   MC-SH-03/05/06 da shunday). Konfirmat bilan qotirilgan polkaga ushlagich qo'yilmaydi.
 *
 * O'qlar — Bazis modul o'qlari (X o'ng, Y tepa, Z old). Detal mahalliy o'qlari (cutlist teshik formati, chizish.js birikmalar
 * bilan bir xil): y — uzunlik bo'ylab L uchidan (uzunlik o'qining kichik tomoni), x — eni bo'ylab F qirradan (eni o'qining katta
 * tomoni — old). Yuza: 1-yuza normali = (L→R) × (F→B) — KDT ko'rinishida (L chapda, F pastda) tomoshabinga qaragan yuza.
 * Eshik uchun F — X ning kichik tomoni (shunda 1-yuza — ichki, sexdagidek: kosa va ruchka bitta faylda).
 * YUZA_TESKARI — sinov kunida (TZ-11) birinchi yon devorda tekshiriladi: planka teshiklari tashqi yuzada chiqsa — true. */
import { evalFormula } from './expr.js';

export const D6 = {
  kosa: { d: 35, dp: 13, uch: 105, chet: 21.5 },
  kosaVint: { d: 3, dp: 2, oraliq: 24, ichkari: 6 },
  planka: { d: 3, dp: 3, old: 37, oraliq: 32 },
  polka: { d: 5, dp: 9, old: 65, orqa: 45, past: 2.5, minChuq: 140 },
  ruchka: { d: 5, chet: 40, uch: 50, oraliq: 160 }
};
/* Eksentrik (minifiks) birikmasi — konfirmat o'rniga (chizma.birikma = 'ekssentrik'; sukut — konfirmat). Sex KDT fayllaridan
 * (13 buyurtma, 198 ta Ø15): korpus Ø15 × 12,5 (131 tasi; 16 mm detal), birikish toretsidan 35 mm (98 tasi; 34 — 84, 32 — 16);
 * torets teshigi shu joyda Ø7 × 35, detal qalinligi o'rtasida (35 mm li korpuslarning 71 tasi, 6 buyurtma); juft detal yuzasida
 * Ø10 × 11 ko'r teshik, toretsdan t/2 (8 mm) — 6 buyurtma (yon devorning uchta Ø10 teshigi pol/tomdagi uchta Ø15 bilan bir
 * joyda: 65 / 300 / 535). Joylari — konfirmat qoidasi bo'yicha (birikish chizig'i bo'ylab). */
export const EKS = { korpus: { d: 15, dp: 12.5, chet: 35 }, qirra: { d: 7, dp: 35 }, bolt: { d: 10, dp: 11 } };
/* Tortma yo'naltiruvchisi (sharikli "salazka" — tortma yoni korpus yon devoridan 13 mm ichkarida; Bazis guruhi "Направляющие
 * Салазка"): yon devor ichki yuzasida Ø3 × 2,5 qator, tortma qutisi tubidan 27 mm balandda (7 buyurtma: 2834, 3276, 3832, 3888,
 * 3808, 3877, 3936 — .b3d dagi quti joyi ↔ KDT qatori). Qatordagi teshiklar quti (yo'naltiruvchi) old qirrasidan, uzunligiga qarab:
 * 400 — 37 / 176 / 240 (5 buyurtma), 450 — 52 / 209 / 416 (2), 350 — 36 / 185 (1). Boshqa uzunlikda sex fayli yo'q — teshik
 * qo'yilmaydi (o'ylab topilmaydi). Tandem (oraliq 5 mm) — Smart3D da yo'q, qo'yilmaydi. */
export const NAPR = { d: 3, dp: 2.5, tubdan: 27, oraliq: 13, joy: { 350: [36, 185], 400: [37, 176, 240], 450: [52, 209, 416] } };
export const YUZA_TESKARI = false;
export const petlyaSoni = (h) => (h <= 1000 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5);
const kupemi = (W, H) => W > 650 && H > 1500;

const LW = { X: ['Y', 'Z'], Y: ['X', 'Z'], Z: ['Y', 'X'] };
const r1 = (v) => Math.round(v * 10) / 10;
const VEK = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };
const krest = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** quti mahalliy o'qlari: { la, wa, fMax } — eshikda F qirrasi X ning kichik tomonida */
function oqlar(q) { const [la, wa] = LW[q.o]; return { la, wa, fMax: !(q.rol === 'eshik' || q.rol === 'tortma_fasad') }; }
/** olamdagi nuqta → detal mahalliy (x — F qirradan, y — L uchidan) */
export function mahalliy(q, P) {
  const { la, wa, fMax } = oqlar(q);
  return { x: r1(fMax ? q.hi[wa] - P[wa] : P[wa] - q.lo[wa]), y: r1(P[la] - q.lo[la]) };
}
/** yuzaning tashqi normali (masalan '+X') → 1 | 2 */
export function yuzaRaqami(q, belgi, o) {
  const { la, wa, fMax } = oqlar(q);
  const a = VEK[la], b = VEK[wa].map(v => (fMax ? -v : v));          // F→B yo'nalishi
  const n1 = krest(a, b), k = 'XYZ'.indexOf(q.o);
  const yuza = Math.sign(n1[k]) === (belgi === '+' ? 1 : -1) ? 1 : 2;
  return (o && o.teskari) || YUZA_TESKARI ? 3 - yuza : yuza;
}

/**
 * Teshiklar. qutilar: [{ o: 'X'|'Y'|'Z', lo: {X,Y,Z}, hi: {X,Y,Z}, t, rol: 'yon'|'polka'|'eshik'|'tortma_fasad'|…,
 *   petlya: 'min'|'max' (eshik: petlya X ning qaysi tomonida), ruchkaJoy: 'tepa'|'past'|'orta' }]
 * o: { ruchka: oraliq mm (0 — ruchka teshigi yo'q), teskari }
 * @returns Array — har quti uchun teshiklar ro'yxati (cutlist formatida: side 'F' — yuza, yuza: 1|2, x, y, dia, depth, kind)
 */
export function d6Teshiklar(qutilar, o = {}) {
  const tesh = qutilar.map(() => []);
  const yonlar = qutilar.map((q, i) => ({ q, i })).filter(x => x.q.rol === 'yon' && x.q.o === 'X');
  const qosh = (i, belgi, P, h) => {
    const q = qutilar[i];
    tesh[i].push(Object.assign({ side: 'F', yuza: yuzaRaqami(q, belgi, o) }, mahalliy(q, P), h));
  };
  /* 1) polka ushlagich: polkaning ikki uchidagi tik panelga (yon devor, bo'lgich) */
  for (const [si, S] of qutilar.entries()) {
    if (S.rol !== 'polka' || S.o !== 'Y') continue;
    const Y = S.lo.Y - D6.polka.past;
    for (const { q: V, i } of yonlar) {
      const chapda = Math.abs(V.hi.X - S.lo.X) < 1, ongda = Math.abs(V.lo.X - S.hi.X) < 1;
      if (!chapda && !ongda) continue;
      if (Y < V.lo.Y + 20 || Y > V.hi.Y - 20) continue;
      const z0 = Math.max(V.lo.Z, S.lo.Z), z1 = Math.min(V.hi.Z, S.hi.Z);
      if (z1 - z0 < 40) continue;
      let zs = [Math.min(V.hi.Z - D6.polka.old, z1 - 15), Math.max(V.lo.Z + D6.polka.orqa, z0 + 15)];
      if (zs[0] - zs[1] < 32 || z1 - z0 < D6.polka.minChuq) zs = [(z0 + z1) / 2];        // sayoz polka — bitta ushlagich
      for (const Z of zs) qosh(i, chapda ? '+' : '-', { X: chapda ? V.hi.X : V.lo.X, Y, Z }, { dia: D6.polka.d, depth: D6.polka.dp, kind: 'd6_polka' });
    }
    void si;
  }
  /* 2) eshik: kosa va vintlari (eshikda), planka (yon devor yoki bo'lgichda); ruchka */
  for (const [ei, E] of qutilar.entries()) {
    if (E.o !== 'Z' || (E.rol !== 'eshik' && E.rol !== 'tortma_fasad')) continue;
    const H = E.hi.Y - E.lo.Y, W = E.hi.X - E.lo.X, t = E.hi.Z - E.lo.Z;
    const ich = { X: 0, Y: 0, Z: E.lo.Z };                         // ichki yuza (korpusga qaragan)
    if (E.rol === 'eshik' && kupemi(W, H)) continue;               // kupe (surma) eshik — teshik yo'q
    if (E.rol === 'eshik' && (E.petlya === 'min' || E.petlya === 'max')) {
      const n = petlyaSoni(H), K = D6.kosa, V3 = D6.kosaVint;
      const Xk = E.petlya === 'min' ? E.lo.X + K.chet : E.hi.X - K.chet, ichkari = E.petlya === 'min' ? 1 : -1;
      const ys = Array.from({ length: n }, (_, k) => E.lo.Y + K.uch + (n > 1 ? k * (H - 2 * K.uch) / (n - 1) : 0));
      for (const Y of ys) {
        qosh(ei, '-', { ...ich, X: Xk, Y }, { dia: K.d, depth: K.dp, kind: 'd6_kosa' });
        for (const s of [-1, 1]) qosh(ei, '-', { ...ich, X: Xk + ichkari * V3.ichkari, Y: Y + s * V3.oraliq }, { dia: V3.d, depth: V3.dp, kind: 'd6_vint' });
      }
      /* planka — eshik petlya qirrasi ustidagi tik panelda, eshik tomonga qaragan yuzada */
      const qirra = E.petlya === 'min' ? E.lo.X : E.hi.X;
      const V = yonlar.find(({ q }) => qirra >= q.lo.X - 1 && qirra <= q.hi.X + 1 && q.hi.Z <= E.lo.Z + 1 && q.hi.Z >= E.lo.Z - 30
        && ys.every(Y => Y > q.lo.Y + 20 && Y < q.hi.Y - 20));
      if (V) {
        const belgi = E.petlya === 'min' ? '+' : '-', X = E.petlya === 'min' ? V.q.hi.X : V.q.lo.X;
        for (const Y of ys) for (const s of [-1, 1]) qosh(V.i, belgi, { X, Y: Y + s * D6.planka.oraliq / 2, Z: V.q.hi.Z - D6.planka.old }, { dia: D6.planka.d, depth: D6.planka.dp, kind: 'd6_planka' });
      }
    }
    /* ruchka (o'tuvchi) */
    const s = +o.ruchka || 0, R = D6.ruchka;
    if (!s) continue;
    let pts;
    if (E.rol === 'tortma_fasad' || W > H) {                       // yotiq — markazda
      const cx = (E.lo.X + E.hi.X) / 2, cy = (E.lo.Y + E.hi.Y) / 2;
      pts = [[cx - s / 2, cy], [cx + s / 2, cy]];
    } else {
      if (!(E.petlya === 'min' || E.petlya === 'max') || H < s + 2 * R.uch) continue;
      const X = E.petlya === 'min' ? E.hi.X - R.chet : E.lo.X + R.chet;   // ochiladigan qirradan
      const joy = E.ruchkaJoy || 'tepa';
      const y0 = joy === 'past' ? E.lo.Y + R.uch : joy === 'orta' ? (E.lo.Y + E.hi.Y) / 2 - s / 2 : E.hi.Y - R.uch - s;
      pts = [[X, y0], [X, y0 + s]];
    }
    for (const [X, Y] of pts) qosh(ei, '-', { ...ich, X, Y }, { dia: R.d, depth: r1(t), kind: 'd6_ruchka' });
  }
  /* 3) tortma yo'naltiruvchisi: tortma yoni (quti) yonidagi korpus devoriga, qutiga qaragan yuzada */
  for (const B of qutilar) {
    if (B.rol !== 'tortma_yon' || B.o !== 'X') continue;
    const joy = NAPR.joy[Math.round(B.hi.Z - B.lo.Z)];
    if (!joy) continue;
    const V = yonlar.find(({ q }) => (Math.abs(B.lo.X - q.hi.X - NAPR.oraliq) < 1 || Math.abs(q.lo.X - B.hi.X - NAPR.oraliq) < 1)
      && B.lo.Y >= q.lo.Y - 1 && B.hi.Y <= q.hi.Y + 1 && B.lo.Z >= q.lo.Z - 1 && B.hi.Z <= q.hi.Z + 1);
    if (!V) continue;
    const ongda = B.lo.X >= V.q.hi.X, X = ongda ? V.q.hi.X : V.q.lo.X, Y = B.lo.Y + NAPR.tubdan;
    for (const z of joy) qosh(V.i, ongda ? '+' : '-', { X, Y, Z: B.hi.Z - z }, { dia: NAPR.d, depth: NAPR.dp, kind: 'd6_napr' });
  }
  return tesh;
}

/* ── MC (Bazis) modullari: joy → qutilar (har nusxa), rol va petlya tomoni ── */
const ESHIK_RE = /dver|дверь|двер|eshik|fasad|фасад/i, TORTMA_RE = /ящик|yashik|tortma|drawer/i;
const QUTI_YON_RE = /боковина ящика|bokovina_ya[sš]?[hc]?ika|bokovina jaschika/i;   // faqat tortma qutisining yoni ("tortma bok" — korpus devori)
/**
 * frag — MC fragment (parts[].joy); vars — { w, d, h, t, t_korpus }; qalinlik(part) → mm; o: { hinge: 'left'|'right' (bitta eshik) }
 * @returns [{ code, ref, ...quti }] — ref: 'kod#n' (cutlist detal nusxasi)
 */
export function joyQutilar(frag, vars, qalinlik, o = {}) {
  const out = [];
  const qotgan = new Set((frag.birikmalar || []).flatMap(b => (b.teshiklar || []).map(t => t.part)));   // konfirmat bilan qotirilgan detallar
  const kargo = frag.category === 'cargo_base' || /kargo|карго/i.test(frag.name || '');
  for (const part of frag.parts || []) {
    const j = part.joy;
    if (!j || !Array.isArray(j.p) || !LW[j.o]) continue;
    let qty = 1;
    try { qty = typeof part.qty === 'string' && isNaN(+part.qty) ? Math.round(evalFormula(part.qty, vars)) : Math.round(+part.qty || 1); } catch (_) { continue; }
    if (qty !== j.p.length) continue;                              // nusxa va joy soni mos emas — teshik qo'yilmaydi
    const [la, wa] = LW[j.o], t = +qalinlik(part) || vars.t;
    let S;
    try { S = { [j.o]: t, [la]: evalFormula(part.len, vars), [wa]: evalFormula(part.width, vars) }; } catch (_) { continue; }
    const nom = (part.nom || '') + ' ' + part.code;
    const rol = part.slot === 'polka' || /polka|полк/i.test(nom) ? (qotgan.has(part.code) ? null : 'polka')
      : part.slot === 'fasad' && j.o === 'Z' ? (TORTMA_RE.test(nom) || kargo ? 'tortma_fasad' : ESHIK_RE.test(nom) && !/planka|планк/i.test(nom) ? 'eshik' : null)
        : j.o === 'X' && part.slot === 'korpus' ? (QUTI_YON_RE.test(nom) ? 'tortma_yon' : 'yon') : null;   // tortma qutisi yoni — yo'naltiruvchi uchun
    j.p.forEach((p, k) => {
      let lo;
      try { lo = { X: evalFormula(p[0], vars), Y: evalFormula(p[1], vars), Z: evalFormula(p[2], vars) }; } catch (_) { return; }
      out.push({ code: part.code, ref: part.code + '#' + (k + 1), o: j.o, rol, lo, hi: { X: lo.X + S.X, Y: lo.Y + S.Y, Z: lo.Z + S.Z } });
    });
  }
  /* petlya tomoni: yonma-yon eshiklar — chapdagi chapda, o'ngdagi o'ngda; bitta eshik — joylashuvdan (assembler bilan bir xil:
     'left' — lokal −x = Bazis X ning katta tomoni) */
  const eshiklar = out.filter(q => q.rol === 'eshik');
  for (const E of eshiklar) {
    const qator = eshiklar.filter(F => F !== E && Math.abs(F.lo.Y - E.lo.Y) < 5 && Math.abs(F.hi.Y - E.hi.Y) < 5);
    if (!qator.length) E.petlya = o.hinge === 'right' ? 'min' : 'max';
    else {
      const chapda = qator.some(F => F.hi.X <= E.lo.X + 5), ongda = qator.some(F => F.lo.X >= E.hi.X - 5);
      E.petlya = chapda && !ongda ? 'max' : !chapda && ongda ? 'min' : (E.lo.X + E.hi.X) / 2 < vars.w / 2 ? 'min' : 'max';
    }
  }
  return out;
}
