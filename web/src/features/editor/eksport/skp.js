/* TZ-33 A: SketchUp (.skp) — fayl brauzerda yoziladi (serverga yuborilmaydi). Kutubxona — openskp 1.3.0 (MIT, SketchUp SDK'siz;
 * SketchUp 2013–2020 "legacy" formati, yangi SketchUp ham ochadi). Bu fayl faqat eksport bosilganda yuklanadi (dynamic import) —
 * asosiy sahifa og'irlashmaydi.
 * Tuzilma: modul — komponent (nomi: kod + nom; bir xil modullar — bitta ta'rif), uning ichida har detal — guruh (haqiqiy o'lchamda,
 * o'qlari detal burchagida), furnitura — alohida komponent (ERP nomi va kodi; bir xil shakl — bitta ta'rif). Qatlamlar (tag):
 * Korpus, Fasad, Orqa devor, Furnitura. Atributlar — "Smart3D" lug'atida (material, o'lcham, kromka).
 * Birlik: SketchUp ichki birligi — dyuym (mm / 25,4); o'qlar — Z yuqori (Smart3D bilan bir xil). */
import { create } from 'openskp';
import { modulJoyi, shaklYuzalar, qutiYuzalar } from './model.js';

export const DYUYM = 25.4;
const IN = (v) => v / DYUYM;
const P = (p) => [IN(p[0]), IN(p[1]), IN(p[2])];
const LUGAT = 'Smart3D';
const TAG_RANG = [[201, 191, 174], [180, 131, 79], [196, 165, 127], [217, 222, 228]];
/** atribut qiymati — matn (openskp: 255 belgigacha) yoki son (butun son int32, qolgani float64) */
const atr = (o) => { const r = {}; for (const [k, v] of Object.entries(o || {})) if (v != null) r[k] = typeof v === 'number' ? v : String(v).slice(0, 250); return r; };
/** bazis (ustunlar X, Y, Z) → openskp matrix3x3 (qatorlab: [X0, Y0, Z0, X1, Y1, Z1, X2, Y2, Z2]) */
const qator = (m) => [m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]];

/**
 * @param {Object} model — eksportModeli() natijasi
 * @returns {Uint8Array} — .skp fayl baytlari
 */
export function skpYoz(model) {
  const b = create();
  /* nomlar takrorlanmasin (SketchUp ta'rif va material nomlari yagona) */
  const band = new Set();
  const yagona = (n) => { let s = String(n || 'Smart3D').slice(0, 160), k = 2; while (band.has(s)) s = String(n).slice(0, 150) + ' #' + k++; band.add(s); return s; };
  const mats = model.materiallar.map(m => b.addMaterial(yagona(m.nom), m.rang));
  const tags = model.qatlamlar.map((n, i) => b.addLayer(n, { color: TAG_RANG[i] }));
  const yuza = (def, pts, mi) => def.addFace(pts.map(P), { material: mats[mi], backMaterial: mats[mi] });

  /* 1) ta'riflar: detal (guruh), furnitura (komponent), modul (komponent) — openskp: hamma ta'rif joylashtirishdan OLDIN */
  const furnDef = new Map(), modDef = new Map();
  for (const m of model.modullar) {
    if (modDef.has(m.imzo)) continue;
    const detDefs = m.detallar.map(dt => b.addComponentDefinition(yagona(dt.nom), (def) => {
      for (const f of qutiYuzalar([0, 0, 0], dt.s.map(v => Math.max(0.1, v)))) yuza(def, f, dt.mat);
    }));
    const fDefs = m.furnitura.map(f => {
      const k = f.nom + '|' + f.mat + '|' + JSON.stringify(f.shakl);
      if (!furnDef.has(k)) furnDef.set(k, b.addComponentDefinition(yagona(f.nom), (def) => {
        for (const sh of f.shakl) for (const pts of shaklYuzalar(sh)) yuza(def, pts, f.mat);
      }, { attributes: atr(f.atr), attributeDictName: LUGAT }));
      return furnDef.get(k);
    });
    modDef.set(m.imzo, b.addComponentDefinition(yagona(m.nom), (def) => {
      m.detallar.forEach((dt, i) => def.addGroupInstance(detDefs[i], {
        name: dt.nom + ' ' + dt.atr.olcham, translation: P(dt.min), layer: tags[dt.qatlam], attributes: atr(dt.atr), attributeDictName: LUGAT }));
      m.furnitura.forEach((f, i) => def.addInstance(fDefs[i], {
        name: f.nom, translation: P(f.t), matrix3x3: qator(f.m), layer: tags[3], attributes: atr(f.atr), attributeDictName: LUGAT }));
    }, { attributes: atr(m.atr), attributeDictName: LUGAT }));
  }
  /* 2) modullar — loyihadagi joyida (xona yo'q) */
  for (const m of model.modullar) {
    const J = modulJoyi(m);
    for (let n = 0; n < m.qty; n++) {
      b.addInstance(modDef.get(m.imzo), { name: m.nom, translation: P(J.t), matrix3x3: J.R.flat(), attributes: atr(Object.assign({ joy: String(m.id) }, m.atr)), attributeDictName: LUGAT });
    }
  }
  return b.toBytes();
}
