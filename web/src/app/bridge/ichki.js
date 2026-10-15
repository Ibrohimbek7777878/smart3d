/* TZ-09 (Q6): "Ichini ko'rish" va detal kartasi — dizayndagi ko'rinish kodi (s3Build/s3Apply) aynan qoladi,
 * ma'lumot esa HAQIQIY: panellar — assembler.js (3D geometriya), detal va zapchast soni — kesim ro'yxati (cutlist.js)
 * va modul furniturasi. Dizayn koordinatasi: Y-up, mm, tagi y=0, old tomoni +z; bizniki: Z-up, markazda, old tomoni +y. */
import { getModulePanels } from '../../../../app/js/engine/assembler.js';
import { isUstki } from './loyiha.js';

/** "Ichini ko'rish" faqat MebelCity modullarida — 83 ta umumiy modul geometriyasi TZ-05 gacha tekshirilmagan */
export const ichiniKorsaBoladi = (frag) => !!frag && /^MC-/.test(frag.code || '');

const dimText = (a, b) => Math.round(a) + '×' + Math.round(b);
/** Detal yorlig'i: ikki katta o'lcham (masalan yon devor 692×450) */
const partDim = (s) => { const [a, b] = s.slice().sort((x, y) => y - x); return dimText(a, b); };
const matKey = (slot, ustki, glass) => (slot === 'fasad' ? (glass ? 'white' : ustki ? 'white' : 'wood') : slot === 'orqa' ? 'hdf' : 'ldsp');

/** frag + o'lcham → dizayn spetsifikatsiyasi { W, D, H, parts, hw, list, hwList, stats } */
export function ichkiSpec(frag, w, d, h, cutlistRes) {
  const asm = getModulePanels(frag, w, d, h, {});
  const ustki = isUstki(frag), glass = /shisha|vitr|glass|oyna/i.test(frag.name || '');
  const seen = {};
  const parts = asm.panels.map(p => {
    const size = [p.w, p.h, p.d];                       // dizayn: x, y (balandlik), z (chuqurlik)
    const pos = [p.x, p.z + h / 2, p.y];
    const k = p.name + '|' + size.map(Math.round).join('x');
    const first = !seen[k];
    seen[k] = (seen[k] || 0) + 1;
    /* sochilish yo'nalishi — markazdan tashqariga (dizayndagi qiymatlar tartibida, mm) */
    const dir = [w ? p.x / (w / 2) * 400 : 0, h ? p.z / (h / 2) * 420 : 0, d ? p.y / (d / 2) * 520 : 0];
    return { name: p.name, n: 1, size, pos, dir, mat: matKey(p.slot, ustki, glass), dim: partDim(size), lab: first, edge: '', _k: k, slot: p.slot };
  });
  for (const p of parts) if (p.lab) p.n = seen[p._k];
  const furn = (frag.furnitura || frag.hardware || []).filter(x => (+x.qty || 0) > 0);
  const zap = furn.reduce((a, x) => a + (+x.qty || 0), 0);
  const detal = cutlistRes ? cutlistRes.parts.reduce((a, x) => a + (+x.qty || 1), 0) : parts.length;
  const spec = {
    W: w, D: d, H: h, parts, hw: [], dims: false,
    stats: { detal, zap },
    list: parts.filter(p => p.lab).map(p => ({ n: p.n, name: p.name + (p.mat === 'hdf' ? ' (HDF)' : ''), dim: p.dim })),
    hwList: furn.map(x => ({ name: x.name, cnt: +x.qty }))
  };
  return spec;
}

/** Sahnada bosilgan detal → detal kartasi (dizayn: nom, o'lcham, material, kromka, mini-3D) */
export function detalKarta(part, frag, matNames) {
  const [w, d, h] = part.size;                          // bizniki: x, y (chuqurlik/qalinlik), z (balandlik)
  const ustki = isUstki(frag), glass = /shisha|vitr|glass|oyna/i.test(frag.name || '');
  return {
    id: part.id, name: part.name, code: frag.code, key: part.key || null,
    size: [w, h, d],                                    // dizayn mini-3D: x, y, z
    dim: partDim([w, h, d]),
    mat: matNames[part.slot] || matNames.korpus || '—',
    mk: part.slot === 'fasad' ? (glass ? 'glass' : ustki ? 'white' : 'wood') : part.slot === 'orqa' ? 'hdf' : 'ldsp',
    edge: '—'                                           // detal↔kesim bog'lanishi hali yo'q — o'ylab topilmaydi (4.3)
  };
}
