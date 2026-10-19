/* TZ-09 (Q6): "Ichini ko'rish" va detal kartasi — dizayndagi ko'rinish kodi (s3Build/s3Apply) aynan qoladi,
 * ma'lumot esa HAQIQIY: panellar — assembler.js (3D geometriya), detal va zapchast soni — kesim ro'yxati (cutlist.js)
 * va modul furniturasi. Dizayn koordinatasi: Y-up, mm, tagi y=0, old tomoni +z; bizniki: Z-up, markazda, old tomoni +y. */
import { getModulePanels } from '../../../app/js/engine/assembler.js';
import { chizmaYech } from '../../../app/js/engine/chizish.js';
import { isUstki } from './loyiha.js';
import { teshik3d, qutiPanel, nuqtaPanel, TURLAR, ZAPCHAST_TURLAR } from '../../../app/js/engine/teshik3d.js';

/* TZ-38: teshik3d() natijasi kesim ro'yxati (cl) bo'yicha eslab qolinadi — rentgen, detal kartasi, "Ichini ko'rish" va zapchast ro'yxati
 * bitta hisobdan foydalanadi (hisob qayta yurganda cl yangi obyekt — kesh o'zi yangilanadi). Natija o'zgartirilmaydi (nusxa olinadi). */
const DAT_KESH = new WeakMap();
/** egasi #167: joy id → teshik, kromka, zapchast joylari (kesim ro'yxatidan; hisob hali bo'lmasa — null) */
export function teshikJoy(H, res, id, pl) {
  const cl = res && res.cutlists && res.cutlists.find(c => c.placementId === id);
  const frag = cl && H && H.catalog[cl.fragment];
  if (!frag) return null;
  const hinge = pl && pl.hinge, k = DAT_KESH.get(cl);
  if (k && k.hinge === hinge) return k.dat;
  const dat = teshik3d(frag, cl.w, cl.d, cl.h, cl, { hinge });
  DAT_KESH.set(cl, { hinge, dat });
  return dat;
}

/** "Ichini ko'rish" faqat MebelCity modullarida — 83 ta umumiy modul geometriyasi TZ-05 gacha tekshirilmagan */
export const ichiniKorsaBoladi = (frag) => !!frag && (/^MC-/.test(frag.code || '') || !!frag.chizma);   // TZ-24 A: qo'lda chizilgan ham

/** zapchast belgisi nuqtalari (p, a, b) — berilgan siljitish bilan */
const DIZAYN_HW = new Set(['petlya', 'polka', 'ruchka', 'napr']);
const zapRel = (x, rel) => Object.assign({}, x, x.p ? { p: rel(x.p) } : {}, x.a ? { a: rel(x.a), b: rel(x.b) } : {});

const dimText = (a, b) => Math.round(a) + '×' + Math.round(b);
/** Detal yorlig'i: ikki katta o'lcham (masalan yon devor 692×450) */
const partDim = (s) => { const [a, b] = s.slice().sort((x, y) => y - x); return dimText(a, b); };
const matKey = (slot, ustki, glass) => (slot === 'fasad' ? (glass ? 'white' : ustki ? 'white' : 'wood') : slot === 'orqa' ? 'hdf' : 'ldsp');

/** frag + o'lcham → dizayn spetsifikatsiyasi { W, D, H, parts, hw, list, hwList, stats }.
 *  egasi #167: dat (teshikJoy) bo'lsa — har detalda teshik va kromka (parts[].tk, detal markaziga nisbatan, mm, bizning o'qlarda)
 *  va zapchast belgilari (hw: petlya, polka ushlagich, ruchka, yo'naltiruvchi — dizayn belgilari, joyi teshiklardan) */
export function ichkiSpec(frag, w, d, h, cutlistRes, dat) {
  if (frag && frag.chizma) frag = chizmaYech(frag, w, d, h);
  const asm = getModulePanels(frag, w, d, h, { tortma: true });   // Q5: tortmalar ham (faqat 3D)
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
  const hw = [];
  if (dat) {
    const refPart = {}, map = qutiPanel(dat.qutilar, asm.panels);
    dat.qutilar.forEach((q, qi) => {
      const i = map[qi], P = asm.panels[i];
      if (i < 0) return;
      refPart[q.ref] = parts[i];
      const rel = (a) => [a[0] - P.x, a[1] - P.y, a[2] - P.z];
      const tk = parts[i].tk || (parts[i].tk = { tesh: [], krom: [] });
      for (const x of dat.teshiklar) if (x.ref === q.ref) tk.tesh.push(Object.assign({}, x, { p: rel(x.p) }));
      for (const x of dat.kromkalar) if (x.ref === q.ref) tk.krom.push(Object.assign({}, x, { c: rel(x.c) }));
      /* TZ-38: shu detalga tegishli zapchast (petlya eshikda, ruchka fasadda, polka ushlagich yon devorda …) — detal markaziga nisbatan */
      for (const x of dat.zapchast || []) if (x.ref === q.ref) (tk.zap = tk.zap || []).push(zapRel(x, rel));
    });
    const dzn = (a) => [a[0], a[2] + h / 2, a[1]];          // bizniki (markazlangan, Z-up) → dizayn (Y-up, tagi y = 0)
    const yon = (a, ref) => { const pi = nuqtaPanel(a, asm.panels); const pp = refPart[ref] || parts[pi]; return pp ? pp.dir : [w ? a[0] / (w / 2) * 400 : 0, h ? a[2] / (h / 2) * 420 : 0, d ? a[1] / (d / 2) * 520 : 0]; };
    const qo = (a, n, k) => [a[0] + n[0] * k, a[1] + n[1] * k, a[2] + n[2] * k];
    const guruh = {};
    for (const z of dat.zapchast) {
      if (!DIZAYN_HW.has(z.tur)) continue;                // TZ-38: konfirmat, ekssentrik, oyoq — dizayn belgisi yo'q (belgi3d da chiziladi)
      let p, kind;
      if (z.tur === 'petlya') { p = qo(z.p, z.n, -2); kind = 'hinge'; }
      else if (z.tur === 'polka') { p = qo(z.p, z.n, -6); kind = 'pin'; }
      else {
        const m = [(z.a[0] + z.b[0]) / 2, (z.a[1] + z.b[1]) / 2, (z.a[2] + z.b[2]) / 2];
        p = z.tur === 'ruchka' ? qo(m, z.n, 26) : qo(m, z.n, -7);
        kind = z.tur === 'ruchka' ? (Math.abs(z.b[2] - z.a[2]) > Math.abs(z.b[0] - z.a[0]) ? 'handleV' : 'handleH') : 'rail';
      }
      (guruh[z.tur] = guruh[z.tur] || { tur: z.tur, kind, items: [] }).items.push({ p: dzn(p), d: yon(p, z.ref), k: kind });
    }
    for (const tur of ['petlya', 'polka', 'ruchka', 'napr']) if (guruh[tur]) hw.push({ name: tur, cnt: guruh[tur].items.length, kind: guruh[tur].kind, items: guruh[tur].items });
  }
  const furn = (frag.furnitura || frag.hardware || []).filter(x => (+x.qty || 0) > 0);
  const zap = furn.reduce((a, x) => a + (+x.qty || 0), 0);
  const detal = cutlistRes ? cutlistRes.parts.reduce((a, x) => a + (+x.qty || 1), 0) : parts.length;
  const spec = {
    W: w, D: d, H: h, parts, hw, dims: false,
    stats: { detal, zap },
    list: parts.filter(p => p.lab).map(p => ({ n: p.n, name: p.name + (p.mat === 'hdf' ? ' (HDF)' : ''), dim: p.dim })),
    hwList: furn.map(x => ({ name: x.name, cnt: +x.qty }))
  };
  return spec;
}

/** egasi #167: bosilgan 3D panel ↔ kesim ro'yxati detali (qutisi bo'yicha) → teshiklar, kromka (detal markaziga nisbatan, mm).
 *  pl — joylashuv { w, d, h, hinge }; dat — teshikJoy() natijasi. Mos detal topilmasa — null (o'ylab topilmaydi, 4.3). */
export function detalTeshik(part, frag, pl, dat, cl) {
  if (!dat || !pl || !frag) return null;
  let panels = [];
  try { panels = getModulePanels(frag, pl.w, pl.d, pl.h, { tortma: true, eshiklar: true, hinge: pl.hinge }).panels; } catch (_) { panels = []; }
  const pi = panels.findIndex(x => x.id === part.id), P = panels[pi];
  const map = qutiPanel(dat.qutilar, panels);
  const qs = dat.qutilar.filter((q, i) => pi >= 0 && map[i] === pi);
  if (!qs.length) return null;
  const refs = new Set(qs.map(q => q.ref)), codes = new Set(qs.map(q => q.code)), q = qs[0];
  const c = [P.x, P.y, P.z], rel = (a) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
  const tesh = dat.teshiklar.filter(x => refs.has(x.ref)).map(x => Object.assign({}, x, { p: rel(x.p) }));
  const krom = dat.kromkalar.filter(x => refs.has(x.ref)).map(x => Object.assign({}, x, { c: rel(x.c) }));
  const zap = (dat.zapchast || []).filter(x => refs.has(x.ref)).map(x => zapRel(x, rel));   // TZ-38
  const zapTur = {};
  for (const x of zap) zapTur[x.tur] = (zapTur[x.tur] || 0) + 1;
  const tur = {};
  for (const x of tesh) tur[x.tur] = (tur[x.tur] || 0) + 1;
  const edges = ((cl && cl.edges) || []).filter(e => codes.has(e.code)).map(e => ({ sides: e.sides.slice(), qalinlik: +e.thickness || 0, nom: e.name || e.material }));
  return { code: q.code, ref: q.ref, tesh, krom, zap, zapTurlar: ZAPCHAST_TURLAR.filter(k => zapTur[k]).map(k => [k, zapTur[k]]), turlar: TURLAR.filter(k => tur[k]).map(k => [k, tur[k]]), edges };
}

/** Sahnada bosilgan detal → detal kartasi (dizayn: nom, o'lcham, material, kromka, mini-3D).
 *  egasi #167: ctx { pl, dat, cl } bo'lsa — teshiklar (soni, tur bo'yicha) va kromka (tomonlar, qalinlik) kesim ro'yxatidan */
export function detalKarta(part, frag, matNames, ctx) {
  const [w, d, h] = part.size;                          // bizniki: x, y (chuqurlik/qalinlik), z (balandlik)
  const ustki = isUstki(frag), glass = /shisha|vitr|glass|oyna/i.test(frag.name || '');
  const dt = ctx ? detalTeshik(part, frag, ctx.pl, ctx.dat, ctx.cl) : null;
  return {
    id: part.id, name: part.name, code: frag.code, key: part.key || null,
    size: [w, h, d],                                    // dizayn mini-3D: x, y, z
    dim: partDim([w, h, d]),
    mat: matNames[part.slot] || matNames.korpus || '—',
    mk: part.slot === 'fasad' ? (glass ? 'glass' : ustki ? 'white' : 'wood') : part.slot === 'orqa' ? 'hdf' : 'ldsp',
    edge: '—',                                          // detal↔kesim bog'lanishi topilmasa — o'ylab topilmaydi (4.3)
    tk: dt                                              // egasi #167: { tesh, krom, zap (TZ-38), turlar, zapTurlar, edges } | null
  };
}
