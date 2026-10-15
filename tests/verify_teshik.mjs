/* verify_teshik.mjs — TZ-06: MebelCity modullariga teshiklar Bazis faylidan (fragments-mc.json `birikmalar`).
   Ishga tushirish: node tests/verify_teshik.mjs
   [1] import nazorati · [2] Bazis o'lchamida · [3] chegaraviy o'lchamlarda · [4] Bazis qoidasi
   [5] stanok fayllari va prisadka */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost, birikmaTeshiklari, bazisQoida } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { cncBundle } from '../app/js/engine/cnc.js';
import { buildOBJ } from '../app/js/engine/objexport.js';

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mc = J('fragments-mc.json').fragments;
const mats = J('materials.json');
const std = J('sex-standartlari.json');
for (const f of mc) applySexStandart(f, std);
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };   // Bazis modullari 16 mm LDSP
const nomBom = (s) => String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

let n = 0, fails = 0;
const ok = (name, cond, extra = '') => {
  n++;
  if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); }
  else console.log('ok    ' + name);
};

/* teshiklar detal ichida, torets teshigi aynan nomlangan chetda (tayyor o'lchamda) */
function chegara(f, w, d, h) {
  const cl = cutlist(f, w, d, h, mats, { projectSlots: SLOTS });
  if (cl.errors.length) return [`${f.code} ${w}×${d}×${h}: ${cl.errors[0].message}`];
  const size = {};
  for (const p of cl.parts) size[p.code] = [p.finish_width, p.finish_length];
  const { holes } = birikmaTeshiklari(f, { w, d, h, t: 16, t_korpus: 16, t_fasad: 16 });
  const bad = [];
  for (const hl of holes) {
    const [W, L] = size[hl.part] || [];
    const tag = `${f.code} ${w}×${d}×${h} ${hl.part} (${hl.x.toFixed(1)}, ${hl.y.toFixed(1)})`;
    if (W == null) { bad.push(tag + ': detal yo\'q'); continue; }
    if (hl.x < -0.6 || hl.x > W + 0.6 || hl.y < -0.6 || hl.y > L + 0.6) bad.push(`${tag}: detaldan tashqarida ${W}×${L}`);
    const e = hl.torets, near = (a, b) => Math.abs(a - b) <= 0.6;
    if (hl.side === 'T' && !(e === 'F' ? near(hl.x, 0) : e === 'B' ? near(hl.x, W) : e === 'L' ? near(hl.y, 0) : e === 'R' ? near(hl.y, L) : false))
      bad.push(`${tag}: torets ${e} chetida emas`);
  }
  return bad;
}

/* ══ [1] import nazorati ══ */
console.log('\n[1] Import nazorati');
const jami = mc.reduce((s, f) => ({ v: s.v + f.manba.teshik.vint, t: s.t + f.manba.teshik.teshik }), { v: 0, t: 0 });
ok(`38 modulda teshiklar Bazis fayli bilan mos (${jami.v} vint, ${jami.t} teshik)`,
  mc.every(f => f.manba.teshik.bazis_bilan_mos && !f.manba.teshik.xato.length), mc.filter(f => !f.manba.teshik.bazis_bilan_mos).map(f => f.code).join(' '));
ok('har birikma zapchasti — vint soni Bazis BOM bilan teng (konfirmat soni = teshik soni)',
  mc.every(f => f.birikmalar.every(b => b.zapchast_soni)), mc.filter(f => f.birikmalar.some(b => !b.zapchast_soni)).map(f => f.code).join(' '));
ok('mahkamlagich guruhi ("Евровинт 7х50 (32) симм") zapchast emas — furniturada yo\'q',
  mc.every(f => f.hardware.every(h => !/^Евровинт \d+х\d+ \(32\)/.test(nomBom(h.name)))));
ok('diametr fayldan: evrovint plast Ø7 yoki Ø8, torets Ø4.5 yoki Ø5 — o\'ylab topilmagan',
  mc.every(f => f.birikmalar.every(b => b.teshiklar.every(t => (t.kind === 'evrovint' ? [7, 8] : [4.5, 5]).includes(t.dia)))));
ok('D6 kutilayotgan teshiklar (petlya, polka ushlagich, ruchka) generatsiya qilinmagan, izohda bor',
  mc.every(f => f.birikmalar.every(b => b.tur === 'evrovint')) && mc.some(f => f.manba.teshik.kutilmoqda.some(k => /petlya/.test(k))));

/* ══ [2] Bazis o'lchamida ══ */
console.log('\n[2] Bazis o\'lchamida');
{
  const sonBad = [], hwBad = [];
  let bad = [];
  for (const f of mc) {
    const [W, D, H] = f.manba.bazis_olcham;
    const cl = cutlist(f, W, D, H, mats, { projectSlots: SLOTS });
    const hs = cl.holes.filter(h => /^evrovint/.test(h.kind));
    if (hs.length !== f.manba.teshik.teshik) sonBad.push(`${f.code}: ${hs.length}≠${f.manba.teshik.teshik}`);
    for (const hw of f.hardware) {
      const got = cl.hardware.find(x => x.code === hw.code);
      if (!got || got.qty !== hw.qty) hwBad.push(`${f.code} ${hw.name}: ${got && got.qty}≠${hw.qty}`);
    }
    bad = bad.concat(chegara(f, W, D, H));
  }
  ok('cutlist teshiklari soni = import nazorati (38 modul)', sonBad.length === 0, sonBad.slice(0, 4).join(' | '));
  ok('zapchast soni Bazis o\'lchamida o\'zgarmaydi', hwBad.length === 0, hwBad.slice(0, 4).join(' | '));
  ok('har teshik detal ichida, torets teshigi aynan chetida', bad.length === 0, bad.slice(0, 3).join(' | '));
}

/* ══ [3] chegaraviy o'lchamlarda (min / max) ══ */
console.log('\n[3] Chegaraviy o\'lchamlarda');
{
  let bad = [], sinov = 0;
  const ozgardi = [];
  for (const f of mc) {
    const base = { w: f.w, d: f.d, h: f.h };
    for (const k of ['w', 'd', 'h']) {
      const lo = f['min_' + k], hi = f['max_' + k];
      if (lo == null || hi == null || lo === hi) continue;
      for (const v of [lo, hi]) {
        const s = Object.assign({}, base, { [k]: v });
        bad = bad.concat(chegara(f, s.w, s.d, s.h));
        sinov++;
      }
      /* vint soni Bazis jadvali bo'yicha o'zgaradimi — zapchast soni ham o'shanga teng */
      const a = birikmaTeshiklari(f, Object.assign({ t: 16, t_korpus: 16, t_fasad: 16 }, base, { [k]: lo })).vintSoni;
      const b = birikmaTeshiklari(f, Object.assign({ t: 16, t_korpus: 16, t_fasad: 16 }, base, { [k]: hi })).vintSoni;
      for (const z in b) if (b[z] !== a[z]) ozgardi.push({ f, k, z, lo, hi, a: a[z], b: b[z] });
    }
  }
  ok(`${sinov} o'lchamda: har teshik detal ichida, torets chetida, formula xatosi yo'q`, bad.length === 0, bad.slice(0, 3).join(' | '));
  const x = ozgardi[0];
  ok('o\'lcham o\'zgarsa vint soni Bazis jadvali bo\'yicha o\'zgaradi va zapchast soni unga teng',
    ozgardi.length > 0 && ozgardi.every(o => {
      const s = Object.assign({ w: o.f.w, d: o.f.d, h: o.f.h }, { [o.k]: o.hi });
      const cl = cutlist(o.f, s.w, s.d, s.h, mats, { projectSlots: SLOTS });
      const hw = cl.hardware.filter(hh => nomBom(hh.name) === o.z).reduce((q, hh) => q + hh.qty, 0);
      return hw === o.b;
    }), x ? `${x.f.code} ${x.k} ${x.lo}→${x.hi}: ${x.z} ${x.a}→${x.b}` : 'o\'zgargan modul yo\'q');
  if (x) console.log(`      misol: ${x.f.code} (${x.f.name}) ${x.k} ${x.lo} → ${x.hi}: ${x.z} ${x.a} → ${x.b} ta`);
}

/* ══ [4] Bazis qoidasi ══ */
console.log('\n[4] Bazis joylashtirish qoidasi');
ok('450 mm, chetdan 60, qadam 32 → 65 / 385 (fayldagi bilan bir xil)', JSON.stringify(bazisQoida(450, { S: 60, P: 32, jadval: [[150, 1], [600, 2]] })) === '[65,385]');
ok('1768 mm, 4 vint, qadam 60 → 74 / 614 / 1154 / 1694', JSON.stringify(bazisQoida(1768, { S: 40, P: 60, jadval: [[120, 1], [600, 2], [1200, 3], [2400, 4]] })) === '[74,614,1154,1694]');
ok('80 mm planka (2·60 > 80) → bitta vint o\'rtada', JSON.stringify(bazisQoida(80, { S: 64, P: 32, jadval: [[650, 2], [800, 3]] })) === '[40]');
{
  const kp2 = mc.find(f => f.code === 'MC-KP-02');
  const xs = (d) => cutlist(kp2, 600, d, 708, mats, { projectSlots: SLOTS }).holes
    .filter(h => h.part === 'bok' && h.side === 'T' && h.torets === 'L').map(h => h.x).sort((a, b) => a - b);
  ok('MC-KP-02 bok toretsi: chuqurlik 450 → 65 / 385; 580 → 66 / 514 (Bazis qoidasi)',
    JSON.stringify(xs(450)) === '[65,385]' && JSON.stringify(xs(580)) === '[66,514]', JSON.stringify([xs(450), xs(580)]));
}

/* ══ [5] stanok fayllari va prisadka ══ */
console.log('\n[5] Stanok fayllari va prisadka');
{
  const pick = ['MC-KP-02', 'MC-KU-04', 'MC-SH-02'].map(c => mc.find(f => f.code === c));
  const cls = pick.map((f, i) => Object.assign(cutlist(f, f.w, f.d, f.h, mats, { projectSlots: SLOTS }), { placementId: 'p' + i }));
  const parts = []; cls.forEach(cl => cl.parts.forEach(pp => parts.push(Object.assign({}, pp, { id: cl.placementId + ':' + pp.ref }))));
  const nest = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
  const kutil = cls.reduce((s, cl) => s + cl.holes.filter(h => h.side !== 'T' && h.dia > 0).reduce((q, h) => q + h.nusxa, 0), 0);
  const torets = cls.reduce((s, cl) => s + cl.holes.filter(h => h.side === 'T').length, 0);
  const b = cncBundle(nest, cls, { toolDia: 6 });
  ok(`varaq fayllarida faqat plast teshiklari: ${b.stats.holes} = ${kutil} (torets ${torets} ta — gorizontal prisadkaga)`, b.stats.holes === kutil && torets > 0);
  const jamiT = cls.reduce((s, cl) => s + cl.holes.reduce((q, h) => q + h.qty * h.nusxa, 0), 0);
  const off = productionCost(cls, mats, { nestResult: nest });
  const on = productionCost(cls, mats, { nestResult: nest, xizmatlar: { teshik: true } });
  const tl = on.lines.filter(l => /teshik|prisadka/i.test(l.group + ' ' + l.name));
  ok('prisadka faqat usta tanlasa (S3): tanlanmasa tannarxda yo\'q', !off.lines.some(l => /teshik|prisadka/i.test(l.group)) || off.totalCost <= on.totalCost);
  const doc = { room: {}, placements: pick.map((f, i) => ({ id: 'p' + i, frg: f.code, x: i * 1000, y: 0, z: 0, w: f.w, d: f.d, h: f.h })) };
  const cat = Object.fromEntries(pick.map(f => [f.code, f]));
  const hj = buildOBJ(doc, cat, { cutlists: cls }).holes;
  const birT = cls.reduce((s, cl) => s + cl.holes.filter(h => /^evrovint/.test(h.kind)).length, 0);
  ok(`holes.json (3D eksport): MebelCity teshiklari bor — ${hj.length} = ${birT}, torets cheti bilan`,
    hj.length === birT && hj.some(h => h.torets) && hj.every(h => typeof h.local_x === 'number'));
  ok(`prisadka soni = barcha nusxalardagi teshiklar (${jamiT})`, cls.every(cl => cl.stats.hole_count === cl.holes.reduce((q, h) => q + h.qty * h.nusxa, 0)) && jamiT > 0, JSON.stringify(tl.map(l => [l.name, l.qty])));
}

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n - fails} pass, 0 fail) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
