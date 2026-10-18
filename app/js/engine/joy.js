/* Smart3D engine/joy.js — MC modullari detallarining joyi (TZ-17).
 *
 * fragments-mc.json (scripts/fr3d_import.py): parts[].joy = { o: normal o'qi, p: [[x, y, z], ...] } — har nusxa
 * bbox burchagi Bazis modul o'qlarida (X = eni w, Y = bo'yi h, Z = chuqurligi d; boshi — korpus burchagi), formula
 * (w, h, d, t) bilan: modul cho'zilsa, detal yaqin chetga bog'langan holda yuradi. Standart o'lchamda Bazis bilan aynan.
 *
 * Natija — assembler panellari shaklida (Smart3D modul lokal o'qlari, markazlangan), BPJ va boshqa joylar shu ramkani
 * ishlatadi: x = W/2 − X (Bazis +X — tomoshabinning o'ngi, Smart3D lokal +x — chapi), y = Z − D/2 (old +), z = Y − H/2.
 */
import { evalFormula } from './expr.js';

/* fr3d_import: len/width o'qlari normal bo'yicha (yon devor — bo'yi×chuqurligi, gorizontal — eni×chuqurligi, old — bo'yi×eni) */
const LEN_WID = { X: ['Y', 'Z'], Y: ['X', 'Z'], Z: ['Y', 'X'] };

export function hasJoy(frag) {
  return !!(frag && (frag.parts || []).some(p => p.joy && Array.isArray(p.joy.p) && p.joy.p.length));
}

/**
 * @param {Object} frag — MC fragment
 * @param {number} w, d, h — joylashuv o'lchami
 * @param {Object} opts — { t: korpus qalinligi, qalinlik: (part) → detal qalinligi }
 * @returns {Array} [{ code, slot, name, x, y, z, w, d, h, joy: true }] — markaz va o'lcham (lokal x, y, z bo'yicha)
 */
export function joyPanellar(frag, w, d, h, opts = {}) {
  const t = +opts.t || 16;
  const qal = opts.qalinlik || (() => t);
  const vars = { w, d, h, t, t_korpus: t };
  const out = [];
  for (const part of frag.parts || []) {
    const j = part.joy;
    if (!j || !Array.isArray(j.p) || !LEN_WID[j.o]) continue;
    const [la, wa] = LEN_WID[j.o];
    const S = { [j.o]: +qal(part) || t, [la]: evalFormula(part.len, vars), [wa]: evalFormula(part.width, vars) };
    for (const [fx, fy, fz] of j.p) {
      const X = evalFormula(fx, vars), Y = evalFormula(fy, vars), Z = evalFormula(fz, vars);
      out.push({
        code: part.code, slot: part.slot, name: part.nom || part.code,
        x: w / 2 - (X + S.X / 2), y: Z + S.Z / 2 - d / 2, z: Y + S.Y / 2 - h / 2,
        w: S.X, d: S.Z, h: S.Y, joy: true
      });
    }
  }
  return out;
}
