/* TZ-38: "Zapchastlar" ro'yxati — narx panelidagi furnitura (hisob natijasi: prod.lines, group 'Furnitura') bilan BIR MANBA.
 * Qator soni, narx va nomi — to'g'ridan-to'g'ri o'sha satrlardan (shuning uchun jami son va summa narx paneli bilan aynan mos);
 * 3D joyi — teshiklardan hosil bo'lgan belgilar (app/js/engine/teshik3d.js zapchastBom): har tur belgisi shu turdagi birinchi BOM qatoriga
 * bog'lanadi. BOM soni va belgilar soni farq qilishi mumkin (masalan, 4 ta "chashka+planka" petlya tarkibida, vint teshigi D6 da yo'q) —
 * qator ikkalasini ham ko'rsatadi: "soni" (narx) va "3D da joyi aniq: N ta". Hech narsa o'ylab topilmaydi (qoida 4.3). */
import { getModulePanels } from '../../../app/js/engine/assembler.js';
import { qutiPanel, zapchastBom, ZAPCHAST_TURLAR } from '../../../app/js/engine/teshik3d.js';
import { teshikJoy } from './ichki.js';
import * as L from './loyiha.js';
import { tr } from '../i18n/index.js';

/* kesim ro'yxati (cl) → { ref: detal nomi } — hisob qayta yurganda cl yangi obyekt, kesh o'zi yangilanadi */
const NOM_KESH = new WeakMap();
function detalNomlari(frag, pl, dat, cl) {
  const k = NOM_KESH.get(cl);
  if (k) return k;
  const nom = {};
  try {
    const panels = getModulePanels(frag, pl.w, pl.d, pl.h, { tortma: true, eshiklar: true, hinge: pl.hinge }).panels;
    const map = qutiPanel(dat.qutilar, panels);
    dat.qutilar.forEach((q, i) => { if (map[i] >= 0) nom[q.ref] = tr(panels[map[i]].name); });
  } catch (_) { /* panel nomi topilmasa — detal kodi */ }
  NOM_KESH.set(cl, nom);
  return nom;
}

const r1 = (v) => Math.round(v * 10) / 10;
/** belgi markazi (mm, modul lokal): ruchka va yo'naltiruvchi — a va b orasi */
const markaz = (z) => z.p ? z.p.map(r1) : [0, 1, 2].map(i => r1((z.a[i] + z.b[i]) / 2));

/**
 * @param {Object} project — store/project.js (res, H, pl)
 * @returns {null | { qatorlar: [{ code, id, name, unit, qty, unitPrice, amount, noPrice, bomsiz, tur, belgilar: [{ key, pid, i, tur, detal, modul, p, taxminiy }] }],
 *   jami: { qty, amount, narxsiz, belgi }, moslik: { qty, amount } }} — moslik: narx paneli (breakdown.hwCount, hwCost) bilan teng-tengmi
 */
export function zapchastRoyxat(project) {
  const R = project.res, H = project.H;
  if (!R || !R.prod || !H) return null;
  const lines = (R.prod.lines || []).filter(l => l.group === 'Furnitura');
  const qator = new Map();
  for (const l of lines) {
    qator.set(l.code, { code: l.code, id: l.id || null, name: l.name || l.code, unit: l.unit || 'dona', qty: l.qty, unitPrice: l.unit_price || 0, amount: l.amount || 0, noPrice: !!l.no_price, bomsiz: false, tur: null, belgilar: [] });
  }
  const bomsiz = new Map();                                // tur → qator (narx panelida mos qatori yo'q belgilar)
  for (const cl of R.cutlists || []) {
    const pl = project.pl(cl.placementId), frag = H.catalog[cl.fragment];
    if (!pl || !frag) continue;
    const dat = teshikJoy(H, R, cl.placementId, pl) || { zapchast: [], qutilar: [] };
    const nom = dat.zapchast.length ? detalNomlari(frag, pl, dat, cl) : {}, modul = L.joyNomi(H, pl, frag);
    const bel = (z) => ({ key: cl.placementId + ':' + z.i, pid: cl.placementId, i: z.i, tur: z.tur, detal: nom[z.ref] || z.code, modul, p: markaz(z), taxminiy: !!z.taxminiy });
    const { qatorlar, bomsiz: bs } = zapchastBom(cl, dat, hw => qator.has(hw.code));
    for (const q of qatorlar) {
      const r = qator.get(q.code);
      if (q.tur && !r.tur) r.tur = q.tur;
      for (const z of q.belgilar) r.belgilar.push(bel(z));
    }
    for (const z of bs) {
      if (!bomsiz.has(z.tur)) bomsiz.set(z.tur, { code: null, id: null, name: null, unit: 'dona', qty: 0, unitPrice: 0, amount: 0, noPrice: false, bomsiz: true, tur: z.tur, belgilar: [] });
      bomsiz.get(z.tur).belgilar.push(bel(z));
    }
  }
  const qatorlar = [...qator.values(), ...ZAPCHAST_TURLAR.filter(k => bomsiz.has(k)).map(k => bomsiz.get(k))];
  const jami = { qty: 0, amount: 0, narxsiz: 0, belgi: 0 };
  for (const r of qatorlar) { jami.qty += r.qty; jami.amount += r.amount; if (r.noPrice) jami.narxsiz++; jami.belgi += r.belgilar.length; }
  const B = R.prod.breakdown || {};
  return { qatorlar, jami, moslik: { qty: jami.qty === (B.hwCount || 0), amount: jami.amount === (R.prod.hwCost || 0) } };
}
