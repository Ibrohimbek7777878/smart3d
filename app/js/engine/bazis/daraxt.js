/* Smart3D engine/bazis/daraxt.js — TZ-21: Bazis faylini daraxt sifatida o'qish (scripts/bazis_daraxt.py ning JS ko'chirmasi).
 *
 * Nima uchun: b3d.js oqimni tekis o'qiydi. Natijada
 *   • fayl oxiridagi amallar tarixi (undo: "Удаление 40 объектов" …) ham detal bo'lib sanaladi;
 *   • guruh ichidagi panel koordinatasi guruhga nisbatan qoladi (global emas).
 * Bu yerda TLV yozuvlari daraxt sifatida o'qiladi: <idx:4><soni:4><tur:1><qiymat>, tur 0/8 — ichida `soni` ta yozuv.
 * Faqat asosiy model ro'yxati (eng katta obyektlar ro'yxati) olinadi, joylashuv ota guruhlardan qo'shib boriladi.
 * Panel yozuvi — b3d.js assemble() bilan (material, kromka, kontur — aynan o'sha qoidalar).
 */
import { inflateBiggest, looksEncrypted, assemble, PANEL_CODE } from './b3d.js';

class Buzuq extends Error {}
const royxatMi = (k, O) => k.t === 'S' && k.v.length > 0 && k.v.every(c => c.t === 'S' && c.i === O);
const u32 = (m, p) => (m[p] | (m[p + 1] << 8) | (m[p + 2] << 16) | (m[p + 3] << 24)) >>> 0;
const i32 = (m, p) => m[p] | (m[p + 1] << 8) | (m[p + 2] << 16) | (m[p + 3] << 24);

/** bitta TLV yozuvi → [tugun, keyingi pozitsiya] */
function yozuv(m, dv, dec, pos, chuqur) {
  if (pos + 9 > m.length || chuqur > 64) throw new Buzuq(pos);
  const idx = u32(m, pos), soni = u32(m, pos + 4), t = m[pos + 8];
  let vp = pos + 9;
  if (t === 0 || t === 8) {
    if (soni > 100000) throw new Buzuq(pos);
    const ich = [];
    for (let k = 0; k < soni; k++) { const [n, p] = yozuv(m, dv, dec, vp, chuqur + 1); ich.push(n); vp = p; }
    return [{ i: idx, t: 'S', v: ich }, vp];
  }
  if (t === 1 || t === 2) return [{ i: idx, t: 'b', v: t === 1 }, vp];
  if (t === 3) { if (vp + 1 > m.length) throw new Buzuq(pos); return [{ i: idx, t: 'i8', v: m[vp] }, vp + 1]; }
  if (t === 4) { if (vp + 4 > m.length) throw new Buzuq(pos); return [{ i: idx, t: 'i32', v: i32(m, vp) }, vp + 4]; }
  if (t === 5) { if (vp + 8 > m.length) throw new Buzuq(pos); return [{ i: idx, t: 'd', v: dv.getFloat64(vp, true) }, vp + 8]; }
  if (t === 6) {
    if (vp + 4 > m.length) throw new Buzuq(pos);
    const n = u32(m, vp);
    if (n > 5000000 || vp + 4 + n * 2 > m.length) throw new Buzuq(pos);
    return [{ i: idx, t: 'str', v: dec.decode(m.subarray(vp + 4, vp + 4 + n * 2)) }, vp + 4 + n * 2];
  }
  if (t === 7) {
    if (vp + 4 > m.length) throw new Buzuq(pos);
    const n = u32(m, vp);
    if (vp + 4 + n > m.length) throw new Buzuq(pos);
    return [{ i: idx, t: 'blob', v: m.subarray(vp + 4, vp + 4 + n) }, vp + 4 + n];
  }
  throw new Buzuq(pos);
}

/** Fayl ichidagi raqamlar har faylda boshqacha: obyekt yozuvi (O), kod (C), nom (N) */
function maydonlar(m) {
  const hits = [];
  for (let p = 8; p < m.length - 5; p++) {
    if (m[p] === 0x04 && m[p + 1] === 0xa2 && m[p + 2] === 0x0f && m[p + 3] === 0 && m[p + 4] === 0) hits.push(p - 8);   // i32 = 4002
  }
  if (!hits.length) return null;
  const sanoq = new Map();
  for (const h of hits) { const k = u32(m, h); sanoq.set(k, (sanoq.get(k) || 0) + 1); }
  let C = null, eng = -1;
  for (const [k, n] of sanoq) if (n > eng) { eng = n; C = k; }
  for (const h of hits) {
    if (u32(m, h) === C && m[h - 1] === 0 && h >= 9) {
      const O = u32(m, h - 9);
      const N = h + 21 < m.length && m[h + 21] === 6 ? u32(m, h + 13) : null;
      return { O, C, N };
    }
  }
  return null;
}

/** ro'yxatdagi panellar soni (ichma-ich guruhlar bilan) */
function panelSoni(royxat, O, C) {
  let n = 0;
  for (const node of royxat) {
    if (node.t !== 'S' || node.i !== O) continue;
    if ((node.v.find(k => k.i === C) || {}).v === PANEL_CODE) n++;
    for (const k of node.v) if (royxatMi(k, O)) n += panelSoni(k.v, O, C);
  }
  return n;
}

/** Asosiy model — ENG KO'P PANELLI obyektlar ro'yxati (teng bo'lsa — kattarog'i). Qolganlari — amallar tarixi va
 *  import qilingan 3D modellar ro'yxati (Python bazis_daraxt.py faqat bayt hajmiga qaraydi — 4250 kabi fayllarda
 *  12 MB mesh ro'yxati asosiy deb olinib, 0 panel chiqardi; JS da tuzatildi, 38 MC modulda natija bir xil). */
function asosiyRoyxat(m, dv, dec, O, C) {
  let best = null;
  const o0 = O & 255, o1 = (O >>> 8) & 255, o2 = (O >>> 16) & 255, o3 = (O >>> 24) & 255;
  for (let q = 9; q + 13 <= m.length; q++) {
    if (m[q] !== o0 || m[q + 1] !== o1 || m[q + 2] !== o2 || m[q + 3] !== o3) continue;
    if (m[q + 8] !== 0 || u32(m, q + 9) !== C || m[q - 1] !== 0) continue;
    const n = u32(m, q - 5);
    if (!(n > 0 && n < 5000)) continue;
    let r, end;
    try { [r, end] = yozuv(m, dv, dec, q - 9, 0); } catch (e) { if (e instanceof Buzuq) continue; throw e; }
    if (!r.v.every(k => k.t === 'S' && k.i === O)) continue;
    const pn = panelSoni(r.v, O, C);
    if (!best || pn > best.pn || (pn === best.pn && end - (q - 9) > best.end - best.start)) best = { start: q - 9, end, r, pn };
  }
  return best;
}

/* ── joylashuv: o'qlar [AxisX, AxisY, AxisZ] (b3d_full_parser.quat_to_matrix bilan bir xil) ── */
const BIRLIK = { pos: [0, 0, 0], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
export function kvaternionMatritsa(qx, qy, qz, qw) {
  const n = qx * qx + qy * qy + qz * qz + qw * qw;
  if (n < 1e-9) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const s = 2 / n;
  return [
    [1 - s * (qy * qy + qz * qz), s * (qx * qy + qz * qw), s * (qx * qz - qy * qw)],
    [s * (qx * qy - qz * qw), 1 - s * (qx * qx + qz * qz), s * (qy * qz + qx * qw)],
    [s * (qx * qz + qy * qw), s * (qy * qz - qx * qw), 1 - s * (qx * qx + qy * qy)]
  ];
}
/** bola joylashuvi ota koordinatasida → global */
function qosh(ota, ozi) {
  const op = ota.pos, oo = ota.oq, bp = ozi.pos, bo = ozi.oq;
  const pos = [0, 1, 2].map(i => op[i] + bp[0] * oo[0][i] + bp[1] * oo[1][i] + bp[2] * oo[2][i]);
  const oq = [0, 1, 2].map(a => [0, 1, 2].map(i => bo[a][0] * oo[0][i] + bo[a][1] * oo[1][i] + bo[a][2] * oo[2][i]));
  return { pos, oq };
}
function tfMi(k) {
  if (k.t !== 'S' || k.v.length !== 7 || !k.v.every(x => x.t === 'd')) return false;
  return Math.abs(k.v.slice(3).reduce((a, x) => a + x.v * x.v, 0) - 1) < 0.02;
}

/** tugun → b3d.js oqimi ({name, type, val}); bolalar ro'yxati va mantiqiy qiymatlarsiz */
function tekis(node, O, out) {
  for (const k of node.v) {
    if (k.t === 'S') { if (!royxatMi(k, O)) tekis(k, O, out); }
    else if (k.t !== 'b') out.push({ name: String(k.i), type: k.t, val: k.v });
  }
  return out;
}

/**
 * Asosiy modeldagi obyektlar (DFS tartibida), global joylashuv bilan.
 * → { objects: [b3d.js yozuvi + { tf: {pos, oq}, chuqur, ota }], format } | null (daraxt o'qilmadi) | { encrypted: true } | { model: false }
 */
export function daraxt(bytes, opts = {}) {
  const m = inflateBiggest(bytes, opts.inflate);
  if (!m) return { model: false };                    // ichida siqilgan model yo'q — Bazis fayli emas (shifrlangan emas)
  if (looksEncrypted(m)) return { encrypted: true };
  const dv = new DataView(m.buffer, m.byteOffset, m.byteLength), dec = new TextDecoder('utf-16le');
  const mk = maydonlar(m);
  if (!mk) return null;
  const { O, C, N } = mk;
  const asos = asosiyRoyxat(m, dv, dec, O, C);
  if (!asos) return null;
  const objects = [];
  const yur = (royxat, ota, chuqur, otaNom) => {
    for (const node of royxat) {
      if (node.t !== 'S' || node.i !== O) continue;
      const kod = (node.v.find(k => k.i === C) || {}).v;
      const tf = node.v.find(tfMi);
      const ozi = tf ? { pos: tf.v.slice(0, 3).map(x => x.v), oq: kvaternionMatritsa(tf.v[3].v, tf.v[4].v, tf.v[5].v, tf.v[6].v) } : BIRLIK;
      const g = qosh(ota, ozi);
      const oqim = tekis(node, O, []);
      let rec;
      if (kod === PANEL_CODE) {
        const recs = assemble(oqim);
        rec = recs.length === 1 ? recs[0] : { modelCode: kod };
      } else {
        rec = { modelCode: kod };
        const nm = oqim.find(x => x.type === 'str' && x.val.trim());
        if (nm) rec.name = nm.val.trim();
      }
      const nom = N != null ? ((node.v.find(k => k.i === N && k.t === 'str') || {}).v || '').trim() : '';
      if (nom && !rec.name) rec.name = nom;
      rec.tf = g; rec.chuqur = chuqur; rec.ota = otaNom;
      objects.push(rec);
      for (const k of node.v) if (royxatMi(k, O)) yur(k.v, g, chuqur + 1, nom || rec.name || null);
    }
  };
  yur(asos.r.v, BIRLIK, 0, null);
  return { objects, format: 'daraxt' };
}
