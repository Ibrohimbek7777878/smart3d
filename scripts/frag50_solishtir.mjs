/* frag50_solishtir.mjs — TZ-37: fragments-fr.json modullarini Bazis kutilma raqamlari (frag50-bazis.json) bilan solishtirish.
 * Har modul komponentlari (korpus 'k', ichki to'plam 'i') o'z native (Bazis) o'lchamida quriladi:
 *   detal soni, tayyor maydon (m2), furnitura soni — hisobimiz vs Bazis fayli; narx (plita + furnitura) — productionCost bilan
 *   (Bazis tomoni: kutilma detal/furnitura ro'yxatidan tekis fragment; narx dvigateli va furnitura ERP bog'lanishi — bir xil).
 * Ishlatish: node scripts/frag50_solishtir.mjs  → jadval; testlar import { yukla, solishtir } qiladi. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = globalThis.SpPrice || require('../app/js/engine/price.js');
const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };

export function yukla() {
  const furn = J('furnitura-catalog.json').items.filter(i => i.id);
  return { mats: J('materials.json'), frags: J('fragments-fr.json').fragments, ref: J('frag50-bazis.json').modullar,
    furnById: Object.fromEntries(furn.map(i => [i.id, i])), boglash: J('furnitura-boglash.json').links };
}

const hwQty = (arr) => arr.reduce((s, x) => s + (+x.qty || 0), 0);
const round2 = (x) => Math.round(x * 100) / 100;

/** Komponent narxi: plita + furnitura (taxminiy kroy, ERP furnitura) */
function narx(cl0, D) {
  /* cutlist avtomatik qo'shgan petlya (_auto) Bazis BOM'ida yo'q — solishtirishga kirmaydi (alohida «auto» ko'rsatkichi) */
  const cl = { ...cl0, hardware: (cl0.hardware || []).filter(x => !x._auto) };
  const pc = productionCost([cl], D.mats, { furnituraById: D.furnById, furnituraBoglash: D.boglash });
  const sum = (g) => pc.lines.filter(l => l.group === g || (g === 'Plita' && /^Plita/.test(l.group))).reduce((s, l) => s + (l.amount || 0), 0);
  return { plita: sum('Plita'), furn: sum('Furnitura'), narxsiz: pc.missing.filter(m => m.group === 'Furnitura').map(m => m.code) };
}

export function solishtir(D) {
  const rows = [];
  for (const f of D.frags) {
    const comps = D.ref[f.code] || [];
    const row = { code: f.code, name: f.name, komponent: [], tug: f.tur };
    for (const c of comps) {
      const sub = { ...f, parts: f.parts.filter(p => p.src === c.src), hardware: f.hardware.filter(h => h.src === c.src),
        birikmalar: c.src === 'k' ? f.birikmalar : [], auto_hardware: false };
      const [W, D_, H] = c.native;
      const cl = cutlist(sub, W, D_, H, D.mats, { projectSlots: SLOTS });
      const our = {};
      for (const p of cl.parts) our[p.material] = (our[p.material] || 0) + p.finish_length * p.finish_width / 1e6;
      const ourArea = Object.values(our).reduce((s, x) => s + x, 0);
      const refArea = Object.values(c.maydon_m2).reduce((s, x) => s + x, 0);
      // Bazis tomoni: tekis fragment (kutilma detallar + furnitura) — o'sha dvigatel, o'sha ERP bog'lanish
      const flat = { code: 'REF', name: 'ref', w: W, d: D_, h: H, slots: f.slots, material_code: f.material_code, auto_hardware: false,
        parts: c.detallar.map((q, i) => ({ code: 'r' + i, nom: q.nom, qty: 1, len: String(q.len), width: String(q.wid), slot: q.slot, tekstura: q.slot === 'orqa' ? 'erkin' : 'uzunlik' })),
        hardware: c.furnitura.map(h => ({ code: h.code, name: h.name, qty: h.qty, unit: 'dona', ...(h.id ? { id: h.id } : {}) })) };
      const rcl = cutlist(flat, W, D_, H, D.mats, { projectSlots: SLOTS });
      const ours = narx(cl, D), refN = narx(rcl, D);
      const ourHw = hwQty(cl.hardware.filter(x => !x._auto));
      row.komponent.push({
        src: c.src, fayl: c.fayl, native: c.native, errors: cl.errors.length,
        detal: [cl.parts.length, c.panel_soni], maydon: [round2(ourArea), round2(refArea)],
        furn: [ourHw, hwQty(c.furnitura)], narx: [Math.round(ours.plita + ours.furn), Math.round(refN.plita + refN.furn)],
        plita: [Math.round(ours.plita), Math.round(refN.plita)], furnNarx: [Math.round(ours.furn), Math.round(refN.furn)],
        narxsiz: ours.narxsiz, kromka: [round2(cl.edges.reduce((s, e) => s + e.meters, 0)), c.bom_kromka_m],
        auto: cl.hardware.filter(x => x._auto).map(x => x.code + ':' + x.qty)
      });
    }
    rows.push(row);
  }
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = solishtir(yukla());
  const pct = (a, b) => (b ? Math.round((a - b) / b * 1000) / 10 : 0);
  for (const r of rows) {
    const k = r.komponent;
    const s = (key, i) => k.reduce((x, c) => x + c[key][i], 0);
    console.log(r.code.padEnd(9), r.name.slice(0, 52).padEnd(52), 'detal', s('detal', 0), '/', s('detal', 1), ' maydon%', pct(s('maydon', 0), s('maydon', 1)), ' narx%', pct(s('narx', 0), s('narx', 1)), ' furn', s('furn', 0), '/', s('furn', 1));
  }
}
