/* Smart3D engine/bazis/b3dYoz.js — TZ-33 B2: Bazis-Mebelshchik .b3d YOZUVCHI (SINOV: haqiqiy Bazis'da ochilishi tekshirilmagan).
 *
 * Format tuzilmasi — B3D_YOZISH.md (sex namunalarining eng soddasi, "Bazis 15" shakli, bo'yicha; mijoz ma'lumotisiz).
 *   fayl     = "BZ85" · oqim(rejim 0, oddiy: sarlavha) · oqim(rejim 1, zlib: model)
 *   oqim     = 01 00 00 FF <rejim> · sxema (nomlar ro'yxati) · bitta ildiz tugun
 *   tugun    = <idx:4><soni:4><tur:1><qiymat>  (tur: 0 tuzilma, 1/2 mantiq, 3 i8, 4 i32, 5 double, 6 matn UTF-16, 7 blob)
 * Panel = tur 4002 yozuvi (o'lcham — kontur blobi, joy — Trans: pos + kvaternion, material — Mat, kromka — Butts), furnitura = 3001
 * (FurnList dagi F<FastID> ta'rifiga bog'liq), modul = 1005 guruh (Objs ichida: 1001 gabarit ramka, panellar, furnitura).
 * O'qish — b3d.js + daraxt.js (o'zgarmagan); bu fayl faqat yozadi va tekshirish uchun umumiy o'quvchi (umumiyOqi) beradi.
 * zlib: opts.deflate (pako.deflate / zlib.deflateSync) — bo'lmasa siqilmagan zlib bloklari (fayl kattaroq, lekin to'g'ri).
 */
import { PANEL_CODE } from './b3d.js';

const enc = new TextEncoder();
const f64 = new DataView(new ArrayBuffer(8));

/* ───────────── tugun yasovchilar ───────────── */
const NOMSIZ = 0xFFFFFFFF;
export const S = (nom, bolalar, tur = 0) => ({ k: 'S', nom, v: bolalar, tur });
export const D = (nom, v) => ({ k: 'd', nom, v });
export const B = (nom, v) => ({ k: 'b', nom, v: !!v });
export const T = (nom, v) => ({ k: 's', nom, v: String(v == null ? '' : v) });
export const BL = (nom, v) => ({ k: 'blob', nom, v });
/** butun son: 0..255 → i8, qolgani → i32 (haqiqiy fayllarda aynan shunday — 4375 i32 va 3129 i8 da istisno yo'q) */
export const I = (nom, v) => ({ k: (v >= 0 && v <= 255) ? 'i8' : 'i32', nom, v });
export const I32 = (nom, v) => ({ k: 'i32', nom, v });

/* ───────────── bayt yozuvchi ───────────── */
class Yozuvchi {
  constructor() { this.b = new Uint8Array(1024); this.n = 0; }
  _kerak(k) { if (this.n + k > this.b.length) { const y = new Uint8Array(Math.max(this.b.length * 2, this.n + k)); y.set(this.b.subarray(0, this.n)); this.b = y; } }
  u8(x) { this._kerak(1); this.b[this.n++] = x & 255; }
  u32(x) { this._kerak(4); this.b[this.n++] = x & 255; this.b[this.n++] = (x >>> 8) & 255; this.b[this.n++] = (x >>> 16) & 255; this.b[this.n++] = (x >>> 24) & 255; }
  f64(x) { f64.setFloat64(0, x, true); this._kerak(8); for (let i = 0; i < 8; i++) this.b[this.n++] = f64.getUint8(i); }
  baytlar(a) { this._kerak(a.length); this.b.set(a, this.n); this.n += a.length; }
  utf16(s) { this.u32(s.length); this._kerak(s.length * 2); for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); this.b[this.n++] = c & 255; this.b[this.n++] = c >> 8; } }
  natija() { return this.b.slice(0, this.n); }
}

/** nomlar tartibi haqiqiy fayllardagidek: avval uzunligi, keyin harflar tartibi; bo'sh nom — 0-o'rinda */
const nomTartib = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
function nomlarYig(ildiz) {
  const to = new Set(['']);
  const yur = (n) => { if (n.nom != null) to.add(n.nom); if (n.k === 'S') for (const c of n.v) yur(c); };
  yur(ildiz);
  return [...to].sort(nomTartib);
}
function tugunYoz(y, n, idx) {
  y.u32(n.nom == null ? NOMSIZ : idx.get(n.nom));
  if (n.k === 'S') { y.u32(n.v.length); y.u8(n.tur || 0); for (const c of n.v) tugunYoz(y, c, idx); return; }
  y.u32(0);
  if (n.k === 'b') { y.u8(n.v ? 1 : 2); return; }
  if (n.k === 'i8') { y.u8(3); y.u8(n.v); return; }
  if (n.k === 'i32') { y.u8(4); y.u32(n.v >>> 0); return; }
  if (n.k === 'd') { y.u8(5); y.f64(n.v); return; }
  if (n.k === 's') { y.u8(6); y.utf16(n.v); return; }
  if (n.k === 'blob') { y.u8(7); y.u32(n.v.length); y.baytlar(n.v); return; }
  throw new Error('B3D-YOZ: noma\'lum tugun turi ' + n.k);
}
/** sxema + ildiz tugun → baytlar (oqim ichi) */
export function oqimBaytlari(ildiz) {
  const nomlar = nomlarYig(ildiz), idx = new Map(nomlar.map((s, i) => [s, i]));
  const y = new Yozuvchi();
  y.u32(nomlar.length);
  for (const s of nomlar) { const a = enc.encode(s); y.u32(a.length); y.baytlar(a); }
  tugunYoz(y, ildiz, idx);
  return y.natija();
}

/* ───────────── zlib / PNG ───────────── */
function adler32(a) { let x = 1, y = 0; for (let i = 0; i < a.length; i++) { x = (x + a[i]) % 65521; y = (y + x) % 65521; } return ((y << 16) | x) >>> 0; }
/** siqmasdan zlib (saqlangan bloklar, 65535 bayt) — deflate funksiyasi berilmaganda */
export function zlibSaqlash(a) {
  const nb = Math.max(1, Math.ceil(a.length / 65535)), o = new Uint8Array(2 + a.length + nb * 5 + 4);
  let p = 0; o[p++] = 0x78; o[p++] = 0x01;
  for (let i = 0; i < nb; i++) {
    const s = a.subarray(i * 65535, Math.min(a.length, (i + 1) * 65535)), son = i === nb - 1 ? 1 : 0;
    o[p++] = son; o[p++] = s.length & 255; o[p++] = s.length >> 8; o[p++] = (~s.length) & 255; o[p++] = ((~s.length) >> 8) & 255;
    o.set(s, p); p += s.length;
  }
  const ad = adler32(a); o[p++] = ad >>> 24; o[p++] = (ad >>> 16) & 255; o[p++] = (ad >>> 8) & 255; o[p++] = ad & 255;
  return o;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (a) => { let c = 0xFFFFFFFF; for (let i = 0; i < a.length; i++) c = CRC[(c ^ a[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
/** bir tekis rangli RGB PNG (ko'rish rasmi — Bazis fayl ro'yxatida chiqadi) */
export function pngYasa(w, h, rgb, zlib) {
  const raw = new Uint8Array(h * (1 + w * 3));
  for (let y = 0; y < h; y++) { const o = y * (1 + w * 3); for (let x = 0; x < w; x++) { raw[o + 1 + x * 3] = rgb[0]; raw[o + 2 + x * 3] = rgb[1]; raw[o + 3 + x * 3] = rgb[2]; } }
  const bo = (tur, d) => {
    const a = new Uint8Array(12 + d.length), dv = new DataView(a.buffer);
    dv.setUint32(0, d.length); for (let i = 0; i < 4; i++) a[4 + i] = tur.charCodeAt(i); a.set(d, 8);
    dv.setUint32(8 + d.length, crc32(a.subarray(4, 8 + d.length))); return a;
  };
  const ih = new Uint8Array(13), idv = new DataView(ih.buffer); idv.setUint32(0, w); idv.setUint32(4, h); ih[8] = 8; ih[9] = 2;
  const parts = [Uint8Array.of(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A), bo('IHDR', ih), bo('IDAT', zlib(raw)), bo('IEND', new Uint8Array(0))];
  const o = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let p = 0; for (const x of parts) { o.set(x, p); p += x.length; }
  return o;
}

/* ───────────── geometriya yordamchilari ───────────── */
/** o'qlar [AxisX, AxisY, AxisZ] → kvaternion [x, y, z, w] (daraxt.js kvaternionMatritsa ning teskarisi; ustunlar = o'qlar) */
export function oqdanKvaternion(oq) {
  const R = [[oq[0][0], oq[1][0], oq[2][0]], [oq[0][1], oq[1][1], oq[2][1]], [oq[0][2], oq[1][2], oq[2][2]]];
  const tr = R[0][0] + R[1][1] + R[2][2];
  let x, y, z, w;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (R[2][1] - R[1][2]) / s; y = (R[0][2] - R[2][0]) / s; z = (R[1][0] - R[0][1]) / s; }
  else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2; w = (R[2][1] - R[1][2]) / s; x = s / 4; y = (R[0][1] + R[1][0]) / s; z = (R[0][2] + R[2][0]) / s; }
  else if (R[1][1] > R[2][2]) { const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2; w = (R[0][2] - R[2][0]) / s; x = (R[0][1] + R[1][0]) / s; y = s / 4; z = (R[1][2] + R[2][1]) / s; }
  else { const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2; w = (R[1][0] - R[0][1]) / s; x = (R[0][2] + R[2][0]) / s; y = (R[1][2] + R[2][1]) / s; z = s / 4; }
  const n = Math.hypot(x, y, z, w) || 1;
  return [x / n, y / n, z / n, w / n];
}
function konturBlob(chiziqlar) {
  const y = new Yozuvchi();
  y.u32(chiziqlar.length);
  for (const [x1, y1, x2, y2] of chiziqlar) { y.u8(0x10); y.f64(x1); y.f64(y1); y.f64(x2); y.f64(y2); }
  return y.natija();
}
const trans = (pos, q) => S('Trans', [D('X', pos[0]), D('Y', pos[1]), D('Z', pos[2]), D('Rx', q[0]), D('Ry', q[1]), D('Rz', q[2]), D('Rw', q[3])]);
const BIRLIK_Q = [0, 0, 0, 1];
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
/* matn uzunligi yozuvda oldindan beriladi — qator uzilishi (Bazis nomlarida \r bor) xavfsiz va aynan saqlanadi */
const toza = (s, n = 200) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim().slice(0, n);

/* ───────────── yozuvchi ───────────── */
/**
 * @typedef {Object} B3dPanel  { nom, dl, dw, dp, material, kromka: [{ elem, nom, qalinlik }], pos: [x,y,z], oq: [[ax],[ay],[az]], kontur?: [[x1,y1,x2,y2]...] }
 * @typedef {Object} B3dModul  { nom, panellar: B3dPanel[], furnitura: [{ nom, soni }] }
 * @param {{ nom: string, modullar: B3dModul[] }} loyiha
 * @param {{ deflate?: (Uint8Array) => Uint8Array }} [opts]
 * @returns {Uint8Array} .b3d baytlari
 */
export function b3dYoz(loyiha, opts = {}) {
  if (!loyiha || !Array.isArray(loyiha.modullar)) throw new Error('B3D-YOZ: loyiha.modullar kerak');
  const zlib = opts.deflate ? (a) => { const o = opts.deflate(a); return o instanceof Uint8Array ? o : new Uint8Array(o); } : zlibSaqlash;
  let nextId = 1000;
  const id = () => ++nextId;
  const furnTa = new Map();       // nom → FastID
  const fastId = (nom) => {
    if (!furnTa.has(nom)) { let f = (fnv(nom) & 0x7FFFFFFF) || 1; const band = new Set(furnTa.values()); while (band.has(f)) f = (f % 0x7FFFFFFF) + 1; furnTa.set(nom, f); }
    return furnTa.get(nom);
  };
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const sig = (p, bb) => { for (let i = 0; i < 3; i++) { if (p[i] < bb.mn[i]) bb.mn[i] = p[i]; if (p[i] > bb.mx[i]) bb.mx[i] = p[i]; } };

  const modulTugunlari = [];
  for (const m of loyiha.modullar) {
    const bb = { mn: [Infinity, Infinity, Infinity], mx: [-Infinity, -Infinity, -Infinity] };
    const panelTugun = [];
    for (const p of m.panellar || []) {
      const dl = +p.dl, dw = +p.dw, dp = +p.dp;
      if (!(dl > 0 && dw > 0 && dp > 0)) throw new Error('B3D-YOZ: panel o\'lchami noto\'g\'ri: ' + toza(p.nom));
      const oq = p.oq, pos = p.pos;
      for (const a of [0, dl]) for (const b of [0, dw]) for (const c of [0, dp]) {
        const q = [0, 1, 2].map(i => pos[i] + a * oq[0][i] + b * oq[1][i] + c * oq[2][i]);
        sig(q, bb);
      }
      const kontur = p.kontur && p.kontur.length ? p.kontur : [[0, 0, dl, 0], [dl, 0, dl, dw], [dl, dw, 0, dw], [0, dw, 0, 0]];
      const butts = (p.kromka || []).map(k => {
        const nom = /кромка/i.test(k.nom || '') ? toza(k.nom) : 'Кромка ' + toza(k.nom || '');
        return S('Butt', [T('Mat', nom), D('Thick', +k.qalinlik || 1), I('Elem', k.elem | 0), T('Sign', nom), D('Overhung', 0), D('Allowance', 1), B('Clip', false)]);
      });
      panelTugun.push(S('Obj', [I32('Type', PANEL_CODE), T('Name', toza(p.nom) || 'detal'), I('ID', id()), I32('Color', 4934475),
        trans(pos, oqdanKvaternion(oq)), T('Mat', toza(p.material)), D('Thick', dp), I('TexDir', 1), BL('Contour', konturBlob(kontur)),
        ...(butts.length ? [S('Butts', butts)] : [])]));
    }
    const furnTugun = [];
    for (const f of m.furnitura || []) {
      const nom = toza(f.nom, 160); if (!nom) continue;
      const fid = fastId(nom);
      for (let k = 0; k < Math.max(1, Math.round(+f.soni || 1)); k++) furnTugun.push(S('Obj', [I32('Type', 3001), T('Name', nom), I('ID', id()), I32('Color', 16744448), trans(f.pos || (bb.mn[0] === Infinity ? [0, 0, 0] : bb.mn), BIRLIK_Q), I32('FastID', fid), I('SalonType', 0)]));
    }
    const lo = bb.mn[0] === Infinity ? [0, 0, 0] : bb.mn, hi = bb.mx[0] === -Infinity ? [0, 0, 0] : bb.mx;
    sig(lo, { mn, mx }); sig(hi, { mn, mx });
    const ramka = S('Obj', [I32('Type', 1001), T('Name', 'Габаритная рамка'), I('ID', id()), B('Vis', true), I32('Color', 15780518), trans(lo, BIRLIK_Q),
      D('Width', hi[0] - lo[0]), D('Height', hi[1] - lo[1]), D('Depth', hi[2] - lo[2]), D('GridSize', 0), D('LDistance', 200), I('DatumMode', 6)]);
    modulTugunlari.push(S('Obj', [I32('Type', 1005), T('Name', toza(m.nom) || 'modul'), I('ID', id()), trans([0, 0, 0], BIRLIK_Q), I('DatumMode', 6), D('JointLength', 0), B('Symmetrize', false),
      S('Objs', [ramka, ...panelTugun, ...furnTugun])]));
  }
  if (mn[0] === Infinity) { mn = [0, 0, 0]; mx = [0, 0, 0]; }
  const umumiyRamka = S('Obj', [I32('Type', 1001), T('Name', 'Габаритная рамка'), I('ID', id()), I32('Color', 10789024),
    D('Width', mx[0] - mn[0]), D('Height', mx[1] - mn[1]), D('Depth', mx[2] - mn[2]), D('GridSize', 0), D('LDistance', 200)]);

  /* FurnList: furnitura ta'rifi — nom, quti (haqiqiy 3D yo'q: Bazis o'z kutubxonasidan almashtirishi mumkin) */
  const furnList = [...furnTa.entries()].map(([nom, fid]) => S('F' + fid, [T('Name', nom), I32('FastID', fid), I('DatumMode', 3), I('ParamType', 1), D('ParamOffset', 16),
    S('ParData', [S('Elements', [T(null, nom)])]), D('MinX', 0), D('MinY', -5), D('MinZ', -5), D('MaxX', 10), D('MaxY', 5), D('MaxZ', 5), S('Holes', []), I32('RotHoleIndex', -1), I32('RotEdgeIndex', -1)]));

  const hujjat = S('Document', [I('VersionMajor', 10), I('VersionMinor', 13), S('Estimate', []), S('FurnList', furnList), S('Model', [umumiyRamka, ...modulTugunlari]),
    S('ModelParams', [T('Name', 'Model')]),
    S('Camera', [D('AngleX', 6), D('AngleY', -7), D('MoveX', 0), D('MoveY', 0), D('Scale', 0.0005), S('FixedPos', [D('x', 0), D('y', 0), D('z', 0)]), D('PerspAspect', 5),
      S('NavPos', [D('x', 0), D('y', 0), D('z', 0)]), D('NavAngleOfView', 60), S('NavRot', [D('x', 0), D('y', 0), D('z', 0), D('q', 1)])]),
    I('HardwareKey', 0),
    S('Undo', [I('ActiveIndex', 0), I('FirstOperationNumber', 0), T('StartName', 'Новая модель'), S('Operations', [])])]);

  const nom = toza(loyiha.nom, 120) || 'Smart3D';
  const sarlavha = S('Header', [I('Version', 13), BL('Thumbnail', pngYasa(opts.deflate ? 256 : 64, opts.deflate ? 256 : 64, [236, 233, 226], zlib)),
    S('Article', [T('Name', nom), I('ID', 1), T('OrderName', nom), D('LDistance', 0), D('LDistance.Min', 0), D('LDistance.Max', 0), B('Furniture', true), I('FileType', 1), S('ExtraInfo', []), S('RotationList', [])])]);
  /* Header ildiz tuguni haqiqiy faylda S[3]: Version, Thumbnail, Article */

  const bosh = Uint8Array.of(0x42, 0x5A, 0x38, 0x35);                 // "BZ85"
  const rejim = (r) => Uint8Array.of(0x01, 0x00, 0x00, 0xFF, r);
  const a = oqimBaytlari(sarlavha), model = zlib(oqimBaytlari(hujjat));
  const parts = [bosh, rejim(0), a, rejim(1), model];
  const o = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let p = 0; for (const x of parts) { o.set(x, p); p += x.length; }
  return o;
}

/* ───────────── umumiy o'quvchi (tekshirish uchun): bayt → tugunlar daraxti ───────────── */
const u32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
function sxemaOqi(m, p) {
  const n = u32(m, p); p += 4; const nomlar = [];
  if (n > 100000) throw new Error('sxema buzuq');
  for (let i = 0; i < n; i++) { const l = u32(m, p); p += 4; if (l > 4096) throw new Error('nom buzuq'); nomlar.push(new TextDecoder().decode(m.subarray(p, p + l))); p += l; }
  return [nomlar, p];
}
function tugunOqi(m, dv, p, nomlar, chuq = 0) {
  if (p + 9 > m.length || chuq > 64) throw new Error('tugun buzuq @' + p);
  const idx = u32(m, p), soni = u32(m, p + 4), tur = m[p + 8]; let q = p + 9;
  const nom = idx === NOMSIZ ? null : nomlar[idx];
  if (idx !== NOMSIZ && idx >= nomlar.length) throw new Error('nom indeksi chegaradan tashqari @' + p);
  if (tur === 0 || tur === 8) { const v = []; for (let i = 0; i < soni; i++) { const [c, q2] = tugunOqi(m, dv, q, nomlar, chuq + 1); v.push(c); q = q2; } return [{ k: 'S', nom, v, tur }, q]; }
  if (tur === 1 || tur === 2) return [{ k: 'b', nom, v: tur === 1 }, q];
  if (tur === 3) return [{ k: 'i8', nom, v: m[q] }, q + 1];
  if (tur === 4) return [{ k: 'i32', nom, v: (m[q] | (m[q + 1] << 8) | (m[q + 2] << 16) | (m[q + 3] << 24)) }, q + 4];
  if (tur === 5) return [{ k: 'd', nom, v: dv.getFloat64(q, true) }, q + 8];
  if (tur === 6) { const l = u32(m, q); return [{ k: 's', nom, v: new TextDecoder('utf-16le').decode(m.subarray(q + 4, q + 4 + l * 2)) }, q + 4 + l * 2]; }
  if (tur === 7) { const l = u32(m, q); return [{ k: 'blob', nom, v: m.subarray(q + 4, q + 4 + l) }, q + 4 + l]; }
  throw new Error('noma\'lum tur ' + tur + ' @' + p);
}
/** oqim ichi (sxema + ildiz) → ildiz tugun; oxirigacha o'qilmasa — xato */
export function oqimOqi(bytes) {
  const [nomlar, p] = sxemaOqi(bytes, 0);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const [t, q] = tugunOqi(bytes, dv, p, nomlar);
  if (q !== bytes.length) throw new Error('oqim oxirida ortiqcha baytlar: ' + (bytes.length - q));
  return t;
}
/** butun fayl → { sarlavha, hujjat }; inflate — Uint8Array → Uint8Array (zlib) */
export function umumiyOqi(fayl, inflate) {
  if (String.fromCharCode(fayl[0], fayl[1], fayl[2], fayl[3]) !== 'BZ85') throw new Error('BZ85 belgisi yo\'q');
  let p = 4;
  const rejimOqi = () => { if (fayl[p] !== 1 || fayl[p + 1] !== 0 || fayl[p + 2] !== 0 || fayl[p + 3] !== 0xFF) throw new Error('oqim belgisi yo\'q @' + p); return fayl[p + 4]; };
  if (rejimOqi() !== 0) throw new Error('sarlavha oqimi oddiy emas');
  p += 5;
  const [nomlar, q0] = sxemaOqi(fayl, p);
  const dv = new DataView(fayl.buffer, fayl.byteOffset, fayl.byteLength);
  const [sarlavha, q1] = tugunOqi(fayl, dv, q0, nomlar);
  p = q1;
  if (rejimOqi() !== 1) throw new Error('model oqimi siqilmagan emas');
  p += 5;
  const model = inflate(fayl.subarray(p));
  return { sarlavha, hujjat: oqimOqi(model), model };
}

/* ───────────── Smart3D BPJ (engine/bpj.js buildBPJ natijasi) → yozuvchi kirishi ─────────────
 * BPJ da panel joyi allaqachon Bazis o'qlarida (TZ-17): transform.origin + axisX/Y/Z — bu yerda o'zgarishsiz olinadi.
 * Modul = bpj.blocks[k] (panelIds); furnitura — furnitura(k) → [{ nom, soni }] (BPJ da furnitura yo'q: UI beradi). */
export function bpjdanLoyiha(bpj, furnitura) {
  const v3 = (o) => [+(o && o.x) || 0, +(o && o.y) || 0, +(o && o.z) || 0];
  const byId = new Map((bpj.objects || []).map(o => [o.id, o]));
  const modullar = [];
  (bpj.blocks || []).forEach((bl, k) => {
    const panellar = [];
    for (const pid of bl.panelIds || []) {
      const o = byId.get(pid); if (!o) continue;
      const tr = o.transform || {};
      const chiziq = ((o.contour && o.contour.outer) || []).filter(e => e && e.type === 'line' && e.x1 != null).map(e => [e.x1, e.y1, e.x2, e.y2]);
      panellar.push({
        nom: o.name, dl: o.dimensions.dl, dw: o.dimensions.dw, dp: o.dimensions.dp,
        material: (o.material && o.material.name) || (o.materialDetails && o.materialDetails.name) || '',
        kromka: (o.butts || []).map(b => ({ elem: b.elemIndex, nom: b.material, qalinlik: b.thickness })),
        pos: v3(tr.origin), oq: [v3(tr.axisX || { x: 1 }), v3(tr.axisY || { y: 1 }), v3(tr.axisZ || { z: 1 })],
        kontur: chiziq.length >= 3 ? chiziq : null
      });
    }
    modullar.push({ nom: bl.name, panellar, furnitura: (furnitura && furnitura(k)) || [] });
  });
  return { nom: (bpj.meta && bpj.meta.modelName) || 'Smart3D', modullar };
}
