#!/usr/bin/env node
/* Smart3D scripts/prisadka_solishtir.mjs — prisadka (teshik burg'ilash) aniqligi: Smart3D chiqargan KDT ↔ sexning haqiqiy KDT fayllari.
 *
 * FAQAT O'QIYDI (ma'lumot paketiga ham, serverga ham yozmaydi). Paket: Smart3D_toplam_2026-10-16 (mijoz fayllari — MAXFIY, gitda yo'q).
 *   Paket yo'li: --paket=… yoki SMART3D_TOPLAM=… yoki ../Smart3D/Smart3D_toplam_2026-10-16. Yo'q bo'lsa — tushunarli xabar bilan chiqadi.
 *
 * Har buyurtma (01_buyurtma_fayllari/04_bazis/<id>_<nom>/*.b3d ↔ 02_kromka_prisadka/<id>_<nom>/*.XML):
 *   BIZNIKI  .b3d → daraxt.js (o'quvchi) → bazisLoyiha → cutlist → stanokModeli → kdtFayllar → kdtOqi   (foydalanuvchi "KDT (ZIP)" bosganidagi zanjir)
 *   HAQIQIY  sexning KDT fayllari; detal soni — shu buyurtmaning Bazis .project faylidan (count), bo'lmasa 1
 *   MOSLASH  detal bo'yicha: o'lcham (±0,51 mm) va qalinlik; bir xil o'lchamli detallar orasida teshiklari eng mos juftlik (Vengriya usuli);
 *            panel 180° burilgan holda yozilishi ham mos (sexda shunday uchraydi — post/kdt.js izohi)
 *   SOLISHTIRISH  teshik: fayl (_1/_2), turi (yuza/qirra), diametr (±0,01), chuqurlik (±0,51), koordinata (±0,51 mm), qirra kvadranti
 *   MOS = bir xil teshik; recall = MOS / haqiqiy, precision = MOS / bizniki. Mijoz ismlari/telefonlari hisobotga CHIQARILMAYDI — faqat buyurtma raqami.
 *
 * Ishlatish: node scripts/prisadka_solishtir.mjs [--id=3311,3329] [--batafsil] [--json] [--paket=YO'L]
 * Kutubxona sifatida: import { solishtir, paketTop } from './prisadka_solishtir.mjs' (tests/verify_prisadka_real.mjs shuni ishlatadi). */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { bazisLoyiha, materiallarniQosh } from '../app/js/engine/bazis/loyiha.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { stanokModeli } from '../app/js/engine/post/smart3d.js';
import { kdtFayllar, kdtOqi } from '../app/js/engine/post/kdt.js';
import { projectOqi } from '../app/js/engine/post/project.js';
import { matnOqi } from '../app/js/engine/post/xml.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOL = 0.51;                 // koordinata, chuqurlik, o'lcham: ±0,5 mm (+ yaxlitlash)
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));

/** ma'lumot paketining 01_buyurtma_fayllari papkasi (yo'q bo'lsa null) */
export function paketTop(paket) {
  const p = paket || process.env.SMART3D_TOPLAM || join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16');
  const top = join(p, '01_buyurtma_fayllari');
  return existsSync(join(top, '02_kromka_prisadka')) && existsSync(join(top, '04_bazis')) ? top : null;
}

/* ── teshik turlari (hisobot uchun) — KDT teshigi: { tn: 1 yuza | 2 qirra, d, dp } va detal qalinligi T ── */
export const TURLAR = ['konf_yuza', 'konf_qirra', 'kosa', 'belgi', 'polka', 'ruchka', 'eks15', 'eks10', 'eks_qirra', 'shkant', 'boshqa'];
export const TUR_NOMI = { konf_yuza: 'konfirmat (yuza, o\'tuvchi)', konf_qirra: 'konfirmat (qirra Ø4,5×35)', kosa: 'petlya chashkasi Ø35×13', belgi: 'belgi Ø3 (kosa vinti, planka)',
  polka: 'polka ushlagich Ø5×9', ruchka: 'ruchka Ø5 (o\'tuvchi)', eks15: 'ekssentrik Ø15', eks10: 'ekssentrik juft Ø10', eks_qirra: 'ekssentrik qirra Ø7×35', shkant: 'shkant Ø8', boshqa: 'boshqa' };
export function turi(h, T) {
  const o = h.dp >= T - 0.01;    // o'tuvchi (qalinlik + 0,5)
  if (h.tn === 1) {
    if (h.d === 35) return 'kosa';
    if (h.d === 3 || h.d === 2.5) return 'belgi';
    if (h.d === 5) return o ? 'ruchka' : 'polka';
    if ((h.d === 7 || h.d === 8 || h.d === 6) && o) return 'konf_yuza';
    if (h.d === 15) return 'eks15';
    if (h.d === 10) return 'eks10';
    if (h.d === 8) return 'shkant';
    return 'boshqa';
  }
  if (h.d === 4.5 || (h.d === 5 && h.dp >= 30)) return 'konf_qirra';
  if (h.d === 7 && h.dp >= 30) return 'eks_qirra';
  if (h.d === 8) return 'shkant';
  return 'boshqa';
}

/* ── KDT fayli → { L, W, T, nom, kromka, holes: [{ f, tn, kv, x, y, z, d, dp }] } ── */
function kdtDetal(txt, fayl) {
  const k = kdtOqi(txt);
  return { L: k.L, W: k.W, T: k.T, nom: k.nom, kromka: k.kromka, fayl,
    holes: k.teshiklar.map(h => ({ f: fayl, tn: h.tur, kv: h.kv || 0, x: h.x, y: h.y, z: h.z == null ? 0 : h.z, d: h.d, dp: h.dp })) };
}

/* ── HAQIQIY buyurtma ── */
const papka = (base, id) => { const d = readdirSync(base).find(x => x.startsWith(id + '_')); return d ? join(base, d) : null; };

/** @returns {{ id, detallar: [{ kod, L, W, T, soni, holes }], kdtFayl, soniManba }} */
export function haqiqiyBuyurtma(top, id) {
  const kd = papka(join(top, '02_kromka_prisadka'), id);
  if (!kd) return null;
  const kdt = new Map();                                          // kod → { 1: detal, 2: detal }
  for (const f of readdirSync(kd)) {
    const m = /^(.+)_([12])\.xml$/i.exec(f);
    if (!m) continue;
    const g = kdt.get(m[1]) || {};
    g[m[2]] = kdtDetal(readFileSync(join(kd, f), 'latin1'), +m[2]);
    kdt.set(m[1], g);
  }
  /* detal soni — Bazis eksporti (.project, importBMV) dan: kodi va o'lchami KDT ga mos eng yaxshi fayl */
  const ad = papka(join(top, '01_arra'), id);
  let eng = null;
  if (ad) {
    for (const f of readdirSync(ad).filter(x => /\.project$/i.test(x))) {
      const txt = matnOqi(readFileSync(join(ad, f)));
      if (!/^<\?xml[^>]*\?>\s*<project importBMV=/.test(txt)) continue;
      const P = projectOqi(txt);
      let mos = 0;
      for (const x of P.detallar) {
        const g = kdt.get(String(x.kod));
        if (!g) continue;
        const a = g[1] || g[2];
        const [l, w] = x.dl >= x.dw ? [x.dl, x.dw] : [x.dw, x.dl];
        if (Math.abs(a.L - l) <= TOL && Math.abs(a.W - w) <= TOL) mos++;
      }
      if (!eng || mos > eng.mos) eng = { P, mos };
    }
  }
  const soni = new Map();                                         // kod → detal soni (o'lchami mos .project detallaridan)
  const ishonchli = eng && eng.mos >= 0.8 * kdt.size;
  if (eng) {
    for (const x of eng.P.detallar) {
      const g = kdt.get(String(x.kod));
      if (!g) continue;
      const a = g[1] || g[2], [l, w] = x.dl >= x.dw ? [x.dl, x.dw] : [x.dw, x.dl];
      if (Math.abs(a.L - l) <= TOL && Math.abs(a.W - w) <= TOL) soni.set(String(x.kod), (soni.get(String(x.kod)) || 0) + (x.soni || 1));
    }
  }
  const detallar = [];
  for (const [kod, g] of kdt) {
    const a = g[1] || g[2];
    detallar.push({ kod, L: a.L, W: a.W, T: a.T, nom: a.nom, soni: soni.get(kod) || 1, holes: [...(g[1] ? g[1].holes : []), ...(g[2] ? g[2].holes : [])], soniMalum: soni.has(kod) });
  }
  /* teshiksiz (KDT fayli yo'q) detallar: .project dagi qolgan detallar — faqat .project KDT ga ishonchli mos kelsa */
  let teshiksiz = 0;
  if (ishonchli) {
    const sheetT = Object.fromEntries(eng.P.varaqlar.map(v => [v.id, v.t]));
    for (const x of eng.P.detallar) {
      if (kdt.has(String(x.kod))) continue;
      const [l, w] = x.dl >= x.dw ? [x.dl, x.dw] : [x.dw, x.dl];
      detallar.push({ kod: String(x.kod), L: l, W: w, T: sheetT[x.varaq] || 16, nom: x.nom, soni: x.soni || 1, holes: [], soniMalum: true, faylsiz: true });
      teshiksiz += x.soni || 1;
    }
  }
  return { id, detallar, kdtFayl: kdt.size, ishonchli: !!ishonchli, teshiksiz };
}

/* ── jismoniy teng holatlar (XNC modelida): panelni 180° burish, to'ntarish (ag'darish) — teshiklar to'plami o'sha jismoniy panel ── */
const QIRRA_ALM = { rot: { l: 'r', r: 'l', t: 'b', b: 't' }, fy: { l: 'l', r: 'r', t: 'b', b: 't' }, fx: { l: 'r', r: 'l', t: 't', b: 'b' } };
function xncAylantir(d, tur) {
  const { dl, dw } = d, ag = tur !== 'rot';                          // ag'darishda ko'r teshik yuzasi almashadi
  const xnc = [];
  const yangi = (side) => { let e = xnc.find(x => x.side === side); if (!e) { e = { side, dz: d.t, teshiklar: [] }; xnc.push(e); } return e; };
  for (const x of d.xnc) for (const h of x.teshiklar) {
    const o = { ...h }, fx = tur === 'rot' || tur === 'fx', fy = tur === 'rot' || tur === 'fy';
    if (h.tur === 'f') { if (fx) o.x = dl - h.x; if (fy) o.y = dw - h.y; }
    else {
      o.tur = QIRRA_ALM[tur][h.tur];
      if (h.tur === 'l' || h.tur === 'r') { if (fy) o.y = dw - h.y; } else if (fx) o.x = dl - h.x;
    }
    yangi(h.tur === 'f' && !h.otuvchi && ag ? 3 - x.side : x.side).teshiklar.push(o);
  }
  xnc.sort((a, b) => a.side - b.side);
  return { ...d, xnc };
}
const JISMONAN = [d => d, d => xncAylantir(d, 'rot'), d => xncAylantir(d, 'fy'), d => xncAylantir(d, 'fx')];

/** teshik.js (narx) turi → hisobot turi */
const NARX_TUR = { konfirmat_yuza: 'konf_yuza', konfirmat_qirra: 'konf_qirra', petlya: 'kosa', eksentrik: 'eks15' };

/* ── BIZNIKI: .b3d → … → KDT ── */
export function bizningBuyurtma(top, id, hamma = {}) {
  const bd = papka(join(top, '04_bazis'), id);
  const f = bd && readdirSync(bd).find(x => /\.b3d$/i.test(x));
  if (!f) return null;
  const r = daraxt(new Uint8Array(readFileSync(join(bd, f))), { inflate });
  if (!r || !r.objects) return { xato: 'b3d o\'qilmadi' };
  const rs = bazisLoyiha(r.objects, { fayl: f, nom: 'b' + id });
  if (rs.xato) return { xato: rs.xato };
  const m2 = JSON.parse(JSON.stringify(hamma.materials));
  materiallarniQosh(m2, rs.materiallar);
  const fr = rs.fragment;
  const cl = Object.assign(cutlist(fr, fr.w, fr.d, fr.h, m2, {}), { placementId: 'p1' });
  const { model } = stanokModeli({ cutlists: [cl], placements: [{ id: 'p1', qty: 1 }], catalog: { [fr.code]: fr }, materials: m2, nom: 'b' + id });
  const kq = (kid) => (model.kromkalar.find(k => k.id === kid) || {}).t || 0;
  const detallar = [];
  for (const d of model.detallar) {
    const kromka = Object.fromEntries(Object.entries(d.kromka).map(([q, kid]) => [q, kid ? kq(kid) : 0]));
    const L = Math.max(d.dl, d.dw), W = Math.min(d.dl, d.dw);
    /* panelni jismonan teng 4 holatda yozish: o'zi, 180° burilgan, ikkala o'q atrofida ag'darilgan — sex fayllarida detal shunday turlicha yoziladi */
    const varyant = JISMONAN.map(fn => {
      const dd = fn(d), holes = [];
      for (const fy of kdtFayllar({ kod: d.kod, nom: d.nom, dl: d.dl, dw: d.dw, t: d.t, kromka }, dd.xnc)) holes.push(...kdtDetal(fy.matn, +/_(\d)\.XML$/.exec(fy.nom)[1]).holes);
      return holes;
    });
    detallar.push({ kod: d.kod, L, W, T: d.t, nom: d.nom, soni: d.soni, holes: varyant[0], varyant });
  }
  /* narx uchun teshik soni (joylashuvsiz; teshik.js) — hisobotning "soni darajasi" bo'limi */
  const narxSoni = {};
  for (const t of fr.bazisTeshik || []) { const k = NARX_TUR[t.tur] || t.tur; narxSoni[k] = (narxSoni[k] || 0) + t.qty; }
  return { id, detallar, fragment: fr, panellar: fr.manba && fr.manba.panellar, narxSoni };
}

/* ── teshiklarni solishtirish ── */
const tng = (a, b) => Math.abs(a - b) <= TOL;
const bir = (a, b) => a.f === b.f && a.tn === b.tn && a.kv === b.kv && tng(a.x, b.x) && tng(a.y, b.y) && (a.tn === 1 || tng(a.z, b.z)) && Math.abs(a.d - b.d) < 0.011 && tng(a.dp, b.dp);
const joyi = (a, b) => a.f === b.f && a.tn === b.tn && a.kv === b.kv && tng(a.x, b.x) && tng(a.y, b.y) && (a.tn === 1 || tng(a.z, b.z));

/** ikki detal teshiklari: jismonan teng 4 holatdan eng mosi → { tp: [[bizniki, haqiqiy]], farq: [[bizniki, haqiqiy]] (joyi bir, o'lchami boshqa), aynan: o'zi yoki 180° burilgan holatda ham shuncha mosmi } */
function juftSolishtir(biz, haq) {
  const natija = (A) => {
    const ishl = new Set(), tp = [];
    A.forEach((a, i) => {
      const j = haq.holes.findIndex((h, jj) => !ishl.has(jj) && bir(a, h));
      if (j >= 0) { ishl.add(j); tp.push([i, j]); }
    });
    return { tp, ishl, A };
  };
  const hammasi = (biz.varyant || [biz.holes]).map(natija);
  let eng = hammasi[0];
  for (const r of hammasi) if (r.tp.length > eng.tp.length) eng = r;
  const aynan = Math.max(hammasi[0].tp.length, hammasi[1] ? hammasi[1].tp.length : 0);
  const tpA = new Set(eng.tp.map(p => p[0])), farq = [];
  eng.A.forEach((a, i) => {
    if (tpA.has(i)) return;
    const j = haq.holes.findIndex((h, jj) => !eng.ishl.has(jj) && joyi(a, h));
    if (j >= 0) { farq.push([i, j]); eng.ishl.add(j); }
  });
  const tpB = new Set(eng.tp.map(p => p[0])), tpH = new Set(eng.tp.map(p => p[1]));
  return { tp: eng.tp.map(([i, j]) => [eng.A[i], haq.holes[j]]), farq: farq.map(([i, j]) => [eng.A[i], haq.holes[j]]), aynan,
    bizQol: eng.A.filter((_, i) => !tpB.has(i)), haqQol: haq.holes.filter((_, j) => !tpH.has(j)) };
}

/** Vengriya usuli: ball matritsasi (kattaroq — yaxshi), taqiqlangan juft = null. → [i → j | -1] */
function tayinlash(ball, n, m) {
  const INF = 1e12, N = Math.max(n, m);
  const a = Array.from({ length: N + 1 }, () => new Float64Array(N + 1));
  for (let i = 1; i <= N; i++) for (let j = 1; j <= N; j++) {
    const b = i <= n && j <= m ? ball[i - 1][j - 1] : null;
    a[i][j] = b == null ? 0 : -b;                  // taqiqlangan/bo'sh juft: 0 (juftlanmaslik) — mos juftlik har doim manfiy
  }
  const u = new Float64Array(N + 1), v = new Float64Array(N + 1), p = new Int32Array(N + 1), way = new Int32Array(N + 1);
  for (let i = 1; i <= N; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Float64Array(N + 1).fill(INF), used = new Uint8Array(N + 1);
    do {
      used[j0] = 1; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= N; j++) if (!used[j]) {
        const cur = a[i0][j] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= N; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= N; j++) if (p[j] >= 1 && p[j] <= n && j <= m && ball[p[j] - 1][j - 1] != null) res[p[j] - 1] = j - 1;
  return res;
}

const yoz = (detallar) => detallar.flatMap((d, i) => Array.from({ length: Math.max(1, d.soni || 1) }, () => ({ d, u: i })));
const bosh = () => Object.fromEntries(TURLAR.map(t => [t, { haq: 0, biz: 0, tp: 0, farq: 0 }]));
const BOSH_JUFT = { tp: [], farq: [], aynan: 0, bizQol: [], haqQol: [] };

/** bitta buyurtma: haqiqiy ↔ bizniki */
export function buyurtmaSolishtir(haq, biz, farqChiqar = null) {
  const H = yoz(haq.detallar), B = yoz(biz.detallar);
  const sizMos = (b, h) => tng(b.L, h.L) && tng(b.W, h.W) && Math.abs((b.T || 16) - (h.T || 16)) < 0.6;
  /* juft ballari: mos teshik soni × 1000 + 1 (o'lchami mos juft — teshiksiz bo'lsa ham juftlanadi); bir xil detal juftlari bir marta hisoblanadi */
  const cache = new Map();
  const juft = (bi, hi) => {
    const k = bi.u + ',' + hi.u;
    if (!cache.has(k)) cache.set(k, bi.d.holes.length && hi.d.holes.length ? juftSolishtir(bi.d, hi.d) : BOSH_JUFT);
    return cache.get(k);
  };
  const ball = B.map(bi => H.map(hi => (sizMos(bi.d, hi.d) ? juft(bi, hi).tp.length * 1000 + 1 : null)));
  const t = B.length && H.length ? tayinlash(ball, B.length, H.length) : B.map(() => -1);
  const tur = bosh(), jami = { haq: 0, biz: 0, tp: 0, aynan: 0, farq: 0, juft: 0, bizJuftsiz: 0, haqJuftsiz: 0, bizJuftsizTesh: 0, haqJuftsizTesh: 0 };
  const haqJuft = new Set();
  B.forEach((bi, i) => {
    const b = bi.d, j = t[i];
    for (const h of b.holes) tur[turi(h, b.T)].biz++;
    jami.biz += b.holes.length;
    if (j < 0) { jami.bizJuftsiz++; jami.bizJuftsizTesh += b.holes.length; return; }
    haqJuft.add(j); jami.juft++;
    const h = H[j].d, r = juft(bi, H[j]);
    jami.tp += r.tp.length; jami.farq += r.farq.length; jami.aynan += r.aynan;
    for (const [bh] of r.tp) tur[turi(bh, b.T)].tp++;
    for (const [, hh] of r.farq) tur[turi(hh, h.T)].farq++;
    if (farqChiqar) farqChiqar(b, h, r, bi.u + ',' + H[j].u);
  });
  H.forEach((hi, j) => {
    for (const x of hi.d.holes) tur[turi(x, hi.d.T)].haq++;
    jami.haq += hi.d.holes.length;
    if (!haqJuft.has(j)) { jami.haqJuftsiz++; jami.haqJuftsizTesh += hi.d.holes.length; }
  });
  return { jami, tur, detalHaq: H.length, detalBiz: B.length };
}

const qosh = (a, b) => { for (const k of Object.keys(b)) a[k] = (a[k] || 0) + b[k]; return a; };
const pct = (a, b) => (b > 0 ? (100 * a / b).toFixed(1) + '%' : '—');

/** @param {{ paket?: string, idlar?: string[] }} o */
export function solishtir(o = {}) {
  const top = paketTop(o.paket);
  if (!top) return null;
  const hamma = { materials: JSON.parse(readFileSync(join(ROOT, 'app/data/materials.json'), 'utf8')) };
  const idlar = (o.idlar && o.idlar.length ? o.idlar : readdirSync(join(top, '04_bazis')).filter(x => /^\d+_/.test(x)).map(x => x.split('_')[0])).sort();
  const buyurtmalar = [], umumiy = { jami: {}, tur: bosh(), narxBiz: {}, narxHaq: {} };
  for (const id of idlar) {
    const haq = haqiqiyBuyurtma(top, id), biz = bizningBuyurtma(top, id, hamma);
    if (!haq || !biz || biz.xato) { buyurtmalar.push({ id, xato: !haq ? 'KDT yo\'q' : !biz ? 'b3d yo\'q' : biz.xato }); continue; }
    const s = buyurtmaSolishtir(haq, biz);
    buyurtmalar.push({ id, ...s, kdtFayl: haq.kdtFayl, ishonchli: haq.ishonchli });
    qosh(umumiy.jami, s.jami);
    qosh(umumiy.narxBiz, biz.narxSoni);
    for (const d of haq.detallar) for (const h of d.holes) umumiy.narxHaq[turi(h, d.T)] = (umumiy.narxHaq[turi(h, d.T)] || 0) + d.soni;
    for (const k of TURLAR) qosh(umumiy.tur[k], s.tur[k]);
  }
  return { buyurtmalar, umumiy, idlar };
}

/* ── hisobot ── */
function jadval(qatorlar, sarlavha) {
  const w = sarlavha.map((s, i) => Math.max(String(s).length, ...qatorlar.map(q => String(q[i]).length)));
  const f = (q) => q.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join(' | ');
  return [f(sarlavha), w.map(x => '-'.repeat(x)).join('-|-'), ...qatorlar.map(f)].join('\n');
}

export function hisobot(S, batafsil = false) {
  const out = [];
  if (batafsil) {
    out.push('BUYURTMA BO\'YICHA (teshik soni detal soniga ko\'paytirilgan)');
    out.push(jadval(S.buyurtmalar.map(b => b.xato ? [b.id, 'XATO: ' + b.xato, '', '', '', '', '', ''] : [b.id, b.detalHaq + '/' + b.detalBiz, b.jami.haq, b.jami.biz, b.jami.tp, pct(b.jami.tp, b.jami.haq), pct(b.jami.tp, b.jami.biz), b.jami.juft]),
      ['buyurtma', 'detal haq/biz', 'teshik haqiqiy', 'bizniki', 'MOS', 'recall', 'precision', 'juft detal']));
    out.push('');
  }
  const J = S.umumiy.jami;
  out.push('UMUMIY (' + S.buyurtmalar.filter(b => !b.xato).length + ' buyurtma)');
  out.push(jadval([[J.haq, J.biz, J.tp, pct(J.tp, J.haq), pct(J.tp, J.biz), J.aynan + ' (' + pct(J.aynan, J.haq) + ')', J.farq, J.juft, J.haqJuftsiz + '/' + J.bizJuftsiz]],
    ['teshik haqiqiy', 'bizniki', 'MOS', 'recall', 'precision', 'aynan (o\'zi/180°) recall', 'joyi bir, o\'lchami boshqa', 'juftlangan detal', 'juftsiz haq/biz detal']));
  out.push('');
  out.push('TUR BO\'YICHA');
  out.push(jadval(TURLAR.map(k => { const t = S.umumiy.tur[k]; return [TUR_NOMI[k], t.haq, t.biz, t.tp, pct(t.tp, t.haq), pct(t.tp, t.biz), t.farq]; }),
    ['tur', 'haqiqiy', 'bizniki', 'MOS', 'recall', 'precision', 'joyi bir, o\'lchami boshqa']));
  out.push('');
  out.push('SONI DARAJASI (narx uchun, joylashuvsiz: teshik.js — bazisTeshiklar) ↔ haqiqiy KDT (detal soniga ko\'paytirilgan)');
  out.push(jadval(TURLAR.map(k => { const h = S.umumiy.narxHaq[k] || 0, b = S.umumiy.narxBiz[k] || 0; return [TUR_NOMI[k], h, b, h ? ((b - h) / h * 100 > 0 ? '+' : '') + ((b - h) / h * 100).toFixed(0) + '%' : '—']; }),
    ['tur', 'haqiqiy', 'bizniki (narx)', 'farq']));
  return out.join('\n');
}

/* ── CLI ── */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (n) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
  const S = solishtir({ paket: arg('paket'), idlar: (arg('id') || '').split(',').filter(Boolean) });
  if (!S) {
    console.log('Ma\'lumot paketi topilmadi (Smart3D_toplam_2026-10-16/01_buyurtma_fayllari). --paket=YO\'L yoki SMART3D_TOPLAM=YO\'L bilan ko\'rsating.');
    process.exit(0);
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(S));
  else console.log(hisobot(S, process.argv.includes('--batafsil')));
}
