import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast } from '../../../store/ui.js';
import * as D from '../../../services/devor.js';
import * as L from '../../../services/loyiha.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { scene } from '../scene/sahna.js';
import { t } from '../../../i18n/index.js';

/* TZ-25 D: 2D da xona chizish (Bazis va SunPin'dagidek) — sichqoncha, barmoq va matn qatori bilan.
 *   Devor chizish: nuqtama-nuqta bosiladi; 0°/45°/90° ga yopishadi (Shift — erkin); uzunlik — matn qatoridan
 *     ("3000" yoki "3000 90"); birinchi nuqtaga qaytilsa, Enter yoki ikki marta bosilsa — xona yopiladi; Esc — bekor,
 *     Backspace — oxirgi nuqta. Bo'sh joyni sudrash — siljitish, 2 barmoq — kattalashtirish (controls.js).
 *   Tanlash asbobida: devorni sudrash — o'ziga parallel suriladi; eshik/derazani sudrash — devor bo'ylab suriladi.
 *   Eshik va deraza — palitradan devorga sudrab yoki tanlab, devorga bosib qo'yiladi.
 * Har sichqoncha harakati store'ga yozilmaydi — `jonli` holat va obuna (faqat chizma qatlami qayta chiziladi). */

export const jonli = { kursor: null, sudrash: null };
const kuzat = new Set();
export const obuna = (fn) => { kuzat.add(fn); return () => kuzat.delete(fn); };
const yangila = () => kuzat.forEach(f => f());

const sahna = () => scene.sahna;
const sp = () => scene.sahna && scene.sahna.sp;
const ikkiD = () => { const s = sp(); return !!s && s.mode === '2d'; };

/* ── ekran ↔ olam (2D kamera, mm) ── */
export function olamga(x, y) {
  const s = sp(), c = s.cam2d, r = s.renderer.domElement.getBoundingClientRect();
  return [c.left + (x - r.left) / (r.width || 1) * (c.right - c.left), c.top - (y - r.top) / (r.height || 1) * (c.top - c.bottom)];
}
/** kanva ichidagi px (chizma qatlami kanva ustida, bir xil o'lchamda) */
export function ekranga(p) {
  const s = sp(), c = s.cam2d, el = s.renderer.domElement;
  return [(p[0] - c.left) / (c.right - c.left) * el.clientWidth, (c.top - p[1]) / (c.top - c.bottom) * el.clientHeight];
}
export const mmPx = () => { const s = sp(); return s ? (s.cam2d.right - s.cam2d.left) / (s.renderer.domElement.clientWidth || 1) : 1; };

/* ── asbob ── */
export function asbobTanla(a) {
  const ij = get().ishjoyi;
  if (ij.asbob === a && a !== 'tanlash') a = 'tanlash';                       // qayta bosilsa — o'chadi
  set('ishjoyi', { asbob: a, teshikTur: null, tahrir: null, tanlov: null, nuqtalar: a === 'devor' ? [] : ij.nuqtalar });
  const s = sp();
  if (s) s.asbob = a === 'devor' || a === 'teshik' ? a : null;
  if (a === 'devor' || a === 'teshik') set('editor', { view: '2d', spin: false, sel: null, part: null });
  jonli.kursor = null; jonli.sudrash = null; yangila();
  if (a === 'devor') toast(t('devor.boshlash'));
}
export function teshikTanla(tur) { set('ishjoyi', { teshikTur: get().ishjoyi.teshikTur === tur ? null : tur }); }

/* ── devor chizish ── */
function kursorHisob(q, erkin) {
  const pts = get().ishjoyi.nuqtalar, px = mmPx();
  if (!pts.length) return { p: [Math.round(q[0] / D.QADAM) * D.QADAM, Math.round(q[1] / D.QADAM) * D.QADAM], len: 0, deg: null };
  const a = pts[pts.length - 1], b = pts[0];
  if (pts.length >= 3 && Math.hypot(q[0] - b[0], q[1] - b[1]) <= 16 * px) return { p: b.slice(), len: Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])), deg: null, yopiq: true };
  const y = D.yopishtir(a, q, erkin);
  /* to'g'ri burchakli xona aniq yopilsin: gorizontal devor oxiri — birinchi nuqta ustunida, tik devor — qatorida */
  if (!erkin && pts.length >= 2) {
    if ((y.deg === 0 || y.deg === 180) && Math.abs(y.p[0] - b[0]) <= 12 * px) y.p[0] = b[0];
    if ((y.deg === 90 || y.deg === 270) && Math.abs(y.p[1] - b[1]) <= 12 * px) y.p[1] = b[1];
    y.len = Math.round(Math.hypot(y.p[0] - a[0], y.p[1] - a[1]));
  }
  return y;
}

function nuqtaQosh(k) {
  if (k.yopiq) { tugat(); return; }
  const pts = get().ishjoyi.nuqtalar, a = pts[pts.length - 1];
  const d = a ? Math.hypot(k.p[0] - a[0], k.p[1] - a[1]) : Infinity;
  if (d < D.MIN_DEVOR) { if (d > 8 * mmPx()) toast(t('devor.qisqa', { n: D.MIN_DEVOR })); return; }   // o'sha joyga qayta bosish (ikki marta bosish) — jim
  set('ishjoyi', { nuqtalar: pts.concat([k.p]) });
  jonli.kursor = null; yangila();
}

/** matn qatoridan: "3000" — kursor yo'nalishida (kursor yo'q bo'lsa — oldingi devordan 90° chapga), "3000 90" — burchak bilan.
 *  Birinchi nuqta bosilmagan bo'lsa — (0, 0) dan. → true agar buyruq qabul qilinsa */
export function uzunlikBuyruq(matn) {
  const b = D.buyruqOqi(matn);
  if (!b) return false;
  if (b.xato) { toast(t('devor.uzunlik_chegara', { min: D.MIN_DEVOR, max: D.MAX_DEVOR })); return true; }
  let pts = get().ishjoyi.nuqtalar;
  if (!pts.length) pts = [[0, 0]];
  const a = pts[pts.length - 1];
  let deg = b.deg;
  if (deg == null && jonli.kursor && jonli.kursor.deg != null && pts.length === get().ishjoyi.nuqtalar.length) deg = jonli.kursor.deg;
  if (deg == null) {
    const o = pts[pts.length - 2];
    deg = o ? Math.atan2(a[1] - o[1], a[0] - o[0]) * 180 / Math.PI + 90 : 0;
  }
  const p = D.uzunlikBilan(a, b.len, deg);
  set('ishjoyi', { nuqtalar: pts.concat([p]) });
  jonli.kursor = null; yangila();
  const n = pts.length + 1, f = pts[0];
  if (n >= 4 && Math.hypot(p[0] - f[0], p[1] - f[1]) <= 5) tugat();
  return true;
}

export function oxirgisiniOchir() {
  const pts = get().ishjoyi.nuqtalar;
  if (pts.length) { set('ishjoyi', { nuqtalar: pts.slice(0, -1) }); yangila(); }
}
export function bekor() { set('ishjoyi', { nuqtalar: [] }); jonli.kursor = null; yangila(); }

/** xona yopiladi: kamida 3 devor; eski eshik/deraza/quvur o'chadi (devorlar boshqa) */
export function tugat() {
  const pts = get().ishjoyi.nuqtalar;
  if (pts.length < 3) { toast(t('devor.kam')); return false; }
  const o = D.tozala(pts);
  if (!o) { toast(t('devor.notogri')); return false; }
  const r = project.doc.room, eski = (r.openings || []).length + (r.utilities || []).length;
  L.applyRoom(project.doc, { outline: o });
  r.openings = []; r.utilities = [];
  set('ishjoyi', { nuqtalar: [], asbob: 'tanlash', tanlov: null, tahrir: null });
  const s = sp(); if (s) s.asbob = null;
  jonli.kursor = null; yangila();
  project.changed('room', true);
  const bb = roomBBox(o);
  toast(t('devor.chizildi', { n: o.length, w: Math.round(bb.w), d: Math.round(bb.h) }) + (eski ? ' · ' + t('devor.teshiklar_olindi') : ''));
  return true;
}

/* ── tayyor devorlarni tahrirlash ── */
/** o'lcham yozuvi bosilsa — uzunlik maydoni */
export function tahrirOch(i) { set('ishjoyi', { tahrir: { i, val: String(Math.round(D.devorUzunligi(project.doc.room.outline, i))) }, tanlov: null }); }
export const tahrirYoz = (val) => set('ishjoyi', s => ({ tahrir: s.tahrir ? { ...s.tahrir, val } : null }));
export const tahrirYop = () => set('ishjoyi', { tahrir: null });
export function tahrirQolla() {
  const tr = get().ishjoyi.tahrir;
  if (!tr) return;
  const len = Math.round(+String(tr.val).replace(',', '.'));
  const r = project.doc.room, q = D.uzunlikniOzgartir(r.outline, tr.i, len);
  if (!q) { toast(t('devor.uzunlik_chegara', { min: D.MIN_DEVOR, max: D.MAX_DEVOR })); return; }
  devorlarniYoz(q);
  set('ishjoyi', { tahrir: null });
}

function devorlarniYoz(q) {
  const r = project.doc.room;
  r.outline = q;
  r.openings = D.teshiklarniMosla(q, r.openings);
  r.utilities = (r.utilities || []).filter(u => u.wall < q.length).map(u => Object.assign({}, u, { offset: Math.min(+u.offset || 0, Math.round(D.devorUzunligi(q, u.wall))) }));
  project.changed('devor', true);
}

/** eshik/deraza: tanlangan teshik kartasi */
export const teshikTanlov = (idx) => set('ishjoyi', { tanlov: idx == null ? null : { idx, en: null, joy: null }, tahrir: null });
export function teshikMaydon(k, val) { set('ishjoyi', s => ({ tanlov: s.tanlov ? { ...s.tanlov, [k]: val } : null })); }
export function teshikQolla() {
  const tv = get().ishjoyi.tanlov, r = project.doc.room, o = tv && (r.openings || [])[tv.idx];
  if (!o) return;
  const en = tv.en == null ? o.width : Math.round(+tv.en), joy = tv.joy == null ? o.offset : Math.round(+tv.joy);
  const s = D.teshikSigdir(D.devorUzunligi(r.outline, o.wall), joy, en);
  if (!s) { toast(t('xona.devor_qisqa')); return; }
  Object.assign(o, s);
  set('ishjoyi', { tanlov: { idx: tv.idx, en: null, joy: null } });
  project.changed('devor', true);
}
export function teshikOchir() {
  const tv = get().ishjoyi.tanlov, r = project.doc.room;
  if (!tv || !(r.openings || [])[tv.idx]) return;
  r.openings.splice(tv.idx, 1);
  set('ishjoyi', { tanlov: null });
  project.changed('devor', true);
}

/** palitradan: eshik yoki deraza — nuqtaga eng yaqin devorga (markazi shu nuqtada) */
export function teshikQoy(tur, q) {
  const r = project.doc.room, w = D.engYaqinDevor(r.outline, q);
  if (!w || w.d > Math.max(400, 40 * mmPx())) { toast(t('devor.devorga_qoying')); return false; }
  const en = tur === 'door' ? 900 : 1200, s = D.teshikSigdir(w.L, w.t - en / 2, en);
  if (!s) { toast(t('xona.devor_qisqa')); return false; }
  (r.openings = r.openings || []).push({ wall: w.i, type: tur, offset: s.offset, width: s.width, sill: tur === 'window' ? 900 : 0, height: tur === 'window' ? 1400 : 2100 });
  set('ishjoyi', { teshikTur: null, tanlov: { idx: r.openings.length - 1, en: null, joy: null } });
  project.changed('devor', true);
  toast(t('xona.qoshildi', { nom: t(tur === 'door' ? 'xona.eshik' : 'xona.deraza') }));
  return true;
}
/** palitradagi tugmadan sudrab kanvasga tashlansa (ekran nuqtasi) */
export function teshikTashla(tur, x, y) {
  const s = sp();
  if (!s || !ikkiD()) return false;
  const r = s.renderer.domElement.getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
  return teshikQoy(tur, olamga(x, y));
}

function teshikTop(q, tol) {
  const r = project.doc.room, o = r.outline;
  for (let k = (r.openings || []).length - 1; k >= 0; k--) {
    const x = r.openings[k], a = o[x.wall], L = D.devorUzunligi(o, x.wall);
    if (!a || !(L > 0)) continue;
    const b = o[(x.wall + 1) % o.length], ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const t = (q[0] - a[0]) * ux + (q[1] - a[1]) * uy, d = Math.abs((q[0] - a[0]) * -uy + (q[1] - a[1]) * ux);
    if (d <= tol && t >= x.offset - tol && t <= x.offset + x.width + tol) return { k, t, ux, uy };
  }
  return null;
}

/* ── kanva hodisalari (capture — controls.js va items.js dan oldin) ── */
let bos = null;
function down(e) {
  if (!ikkiD()) return;
  if (!e.isPrimary) { bos = null; return; }                 // ikkinchi barmoq — kattalashtirish (controls.js)
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const ij = get().ishjoyi;
  if (ij.asbob === 'devor' || (ij.asbob === 'teshik' && ij.teshikTur)) { bos = { x: e.clientX, y: e.clientY, id: e.pointerId }; return; }
  if (ij.asbob !== 'tanlash' || e.shiftKey) return;
  const S = sahna();
  if (S.items.hitTest(e)) return;                           // mebel — items.js
  const q = olamga(e.clientX, e.clientY), tol = 12 * mmPx(), r = project.doc.room;
  const th = teshikTop(q, tol);
  if (th) {
    const o = r.openings[th.k];
    jonli.sudrash = { tur: 'teshik', id: e.pointerId, k: th.k, ush: th.t - o.offset, offset: o.offset, x: e.clientX, y: e.clientY };
  } else {
    const w = D.engYaqinDevor(r.outline, q);
    if (!w || w.d > tol) return;
    jonli.sudrash = { tur: 'devor', id: e.pointerId, i: w.i, q0: q, asl: r.outline.map(p => p.slice()), m: 0, x: e.clientX, y: e.clientY };
  }
  e.stopImmediatePropagation();
  try { S.sp.renderer.domElement.setPointerCapture(e.pointerId); } catch (_) { /* yo'q */ }
  yangila();
}
function move(e) {
  if (!ikkiD()) return;
  const sd = jonli.sudrash;
  if (sd && e.pointerId === sd.id) {
    const q = olamga(e.clientX, e.clientY);
    if (sd.tur === 'devor') {
      const a = sd.asl[sd.i], b = sd.asl[(sd.i + 1) % sd.asl.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      sd.m = Math.round(((q[0] - sd.q0[0]) * nx + (q[1] - sd.q0[1]) * ny) / D.QADAM) * D.QADAM;
    } else {
      const r = project.doc.room, o = r.openings[sd.k], a = r.outline[o.wall], L = D.devorUzunligi(r.outline, o.wall);
      const b = r.outline[(o.wall + 1) % r.outline.length], t0 = (q[0] - a[0]) * (b[0] - a[0]) / L + (q[1] - a[1]) * (b[1] - a[1]) / L;
      sd.offset = Math.max(50, Math.min(L - o.width - 50, Math.round((t0 - sd.ush) / D.QADAM) * D.QADAM));
    }
    yangila(); e.stopImmediatePropagation(); return;
  }
  if (get().ishjoyi.asbob === 'devor') { jonli.kursor = kursorHisob(olamga(e.clientX, e.clientY), e.shiftKey); yangila(); }
}
function up(e) {
  const sd = jonli.sudrash;
  if (sd && e.pointerId === sd.id) {
    jonli.sudrash = null;
    const bosildi = Math.hypot(e.clientX - sd.x, e.clientY - sd.y) < 6;
    if (sd.tur === 'teshik') {
      if (bosildi) teshikTanlov(sd.k);
      else { project.doc.room.openings[sd.k].offset = sd.offset; set('ishjoyi', { tanlov: { idx: sd.k, en: null, joy: null } }); project.changed('devor', true); }
    } else if (!bosildi && sd.m) {
      const q = D.devorniSur(sd.asl, sd.i, sd.m), o = q && D.tozala(q);
      if (o && o.length === sd.asl.length) devorlarniYoz(q); else toast(t('devor.notogri'));
    } else if (bosildi) tahrirOch(sd.i);
    yangila(); return;
  }
  if (!bos || e.pointerId !== bos.id) return;
  const b = bos; bos = null;
  if (Math.hypot(e.clientX - b.x, e.clientY - b.y) > 6) return;     // sudraldi — siljitish edi
  const ij = get().ishjoyi, q = olamga(e.clientX, e.clientY);
  if (ij.asbob === 'devor') nuqtaQosh(kursorHisob(q, e.shiftKey));
  else if (ij.asbob === 'teshik' && ij.teshikTur) teshikQoy(ij.teshikTur, q);
}
function dbl(e) { if (ikkiD() && get().ishjoyi.asbob === 'devor') { e.stopImmediatePropagation(); tugat(); } }
function chiq() { if (get().ishjoyi.asbob === 'devor' && jonli.kursor) { jonli.kursor = null; yangila(); } }
const yozilmoqda = (el) => !!el && (/^(input|textarea|select)$/i.test(el.tagName || '') || el.isContentEditable);
function tugma(e) {
  const ij = get().ishjoyi;
  if (get().nav.screen !== 'app' || yozilmoqda(e.target)) return;
  if (ij.asbob === 'devor') {
    if (e.key === 'Escape') { if (ij.nuqtalar.length) bekor(); else asbobTanla('tanlash'); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'Enter') { tugat(); e.preventDefault(); }
    else if (e.key === 'Backspace') { oxirgisiniOchir(); e.preventDefault(); }
  } else if (e.key === 'Escape' && (ij.asbob === 'teshik' || ij.tanlov || ij.tahrir)) {
    if (ij.tahrir || ij.tanlov) set('ishjoyi', { tahrir: null, tanlov: null }); else asbobTanla('tanlash');
    e.preventDefault(); e.stopImmediatePropagation();
  }
}

/** sahna yaratilgach (ChizmaQatlam) — kanva hodisalari; qaytaradi — tozalash */
export function devorUla() {
  const s = sp();
  if (!s) return () => {};
  const el = s.renderer.domElement;
  s.asbob = ['devor', 'teshik'].includes(get().ishjoyi.asbob) ? get().ishjoyi.asbob : null;
  el.addEventListener('pointerdown', down, true);
  el.addEventListener('pointermove', move, true);
  el.addEventListener('pointerup', up, true);
  el.addEventListener('pointercancel', up, true);
  el.addEventListener('dblclick', dbl, true);
  el.addEventListener('pointerleave', chiq);
  window.addEventListener('keydown', tugma, true);
  return () => {
    el.removeEventListener('pointerdown', down, true);
    el.removeEventListener('pointermove', move, true);
    el.removeEventListener('pointerup', up, true);
    el.removeEventListener('pointercancel', up, true);
    el.removeEventListener('dblclick', dbl, true);
    el.removeEventListener('pointerleave', chiq);
    window.removeEventListener('keydown', tugma, true);
    jonli.kursor = null; jonli.sudrash = null; bos = null;
  };
}
