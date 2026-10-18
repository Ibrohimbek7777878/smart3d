/* Smart3D engine/bazis/bpj.js — TZ-21: Bazis BPJ (BazisUniversalExport JSON, format 4.x) → b3d.js obyektlari shakli.
 *
 * BPJ — Bazis skripti eksport qilgan JSON (1.bpj kabi): objects[] da har panel — name, material, dimensions.dp,
 * contour.outer (chiziqlar), butts (elemIndex, material, thickness), transform (origin + axisX/Y/Z, global).
 * Natija loyiha.js ga to'g'ridan beriladi (.b3d bilan bir xil yo'l). Furnitura — furnitures[] dan (b3d.js qoidasi bilan
 * furnitura / mahkamlagich / guruh nomi ajratiladi).
 * Kodirovka: UTF-8, bo'lmasa Windows-1251 (Bazis eski versiyalari).
 */
import { classifyFitting, PANEL_CODE } from './b3d.js';

export function bpjMatn(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { return new TextDecoder('windows-1251').decode(bytes); }
}

const v3 = (o) => [+(o && o.x) || 0, +(o && o.y) || 0, +(o && o.z) || 0];
const nuqta = (e, k) => [+e['x' + k] || 0, +e['y' + k] || 0];

/** BPJ matni → { objects, fittings, fasteners, format } | { xato } */
export function bpjOqi(matn) {
  let d;
  try { d = JSON.parse(String(matn).replace(/^\uFEFF/, '')); } catch (e) { return { xato: 'S3D-BAZIS-103' }; }
  if (!d || !Array.isArray(d.objects)) return { xato: 'S3D-BAZIS-103' };
  const objects = [];
  for (const o of d.objects) {
    const outer = (o.contour && o.contour.outer) || [];
    const els = outer.filter(e => e && e.x1 != null).map(e => ({ type: 'line', p1: nuqta(e, 1), p2: nuqta(e, 2) }));
    const tr = o.transform || {};
    objects.push({
      modelCode: PANEL_CODE,
      name: String(o.name || '').trim(),
      material: String((o.material && o.material.name) || (o.materialDetails && o.materialDetails.name) || '').trim() || undefined,
      thickness: +((o.dimensions && o.dimensions.dp) || (o.materialDetails && o.materialDetails.thickness)) || undefined,
      contour_outer: els.length ? els : undefined,
      butts: (o.butts || []).map(b => ({ name: b.material, thickness: +b.thickness || undefined, edgeIndex: b.elemIndex })),
      tf: { pos: v3(tr.origin), oq: [v3(tr.axisX || { x: 1 }), v3(tr.axisY || { y: 1 }), v3(tr.axisZ || { z: 1 })] }
    });
  }
  const panelNames = new Set(objects.map(o => o.name.toLowerCase()).filter(Boolean));
  const birlik = (nm) => /направля|salazk|салазк|тандем|tandem/i.test(nm) ? 'komplekt' : 'dona';
  const fittings = [], fasteners = [];
  for (const f of d.furnitures || []) {
    const nm = String(f.name || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
    if (!nm) continue;
    const cls = classifyFitting(nm, panelNames);
    const x = { name: nm, count: +f.count || 1, unit: birlik(nm) };
    if (cls === 'fast') fasteners.push(x); else if (cls === 'furn') fittings.push(x);
  }
  return { objects, fittings, fasteners, format: 'BPJ ' + (d.version || '') };
}
