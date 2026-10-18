/* TZ-20 (2026-10-17): raskroy aniqligi — bizning LDSP listlari ↔ sex GibLab'i.
 *   8 ta buyurtma (Bazis va GibLab bir versiya — detal maydoni sexdagi bilan bir xil):
 *   Bazis fayli → kesim ro'yxati → nestProject → LDSP listlari soni; sexniki —
 *   06_kroy_natijalari/GibLab_kroy_natijalari_30.xlsx, "Material bo'yicha" varag'i.
 *   Sexning qoldiq bo'laklari (2440×1220 dan kichik list) — list ulushi (maydon / shu materialning to'liq listi).
 *   Paket (Smart3D_toplam_2026-10-16, mijoz fayllari — git'da yo'q) bo'lmasa — o'tkazib yuboriladi.
 * Ishlatish: node tests/verify_raskroy_sex.mjs */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import * as B from '../app/js/engine/bazis/b3d.js';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { bazisLoyiha, materiallarniQosh, oddiyDekor } from '../app/js/engine/bazis/loyiha.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { nestProject, nestPanels } from '../app/js/engine/nesting.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAKET = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16');
const XLSX = join(PAKET, '06_kroy_natijalari', 'GibLab_kroy_natijalari_30.xlsx');
const BAZIS = join(PAKET, '01_buyurtma_fayllari', '04_bazis');
const IDS = [3240, 3276, 3311, 3329, 3646, 3877, 3926, 4034];
const MAQSAD = 1.05;          // jami ≤ sex + 5%

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const tugat = () => { console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`); process.exit(fail ? 1 : 0); };

/* geometriya: ustma-ust emas, trim ichida, qo'shni detallar orasida kerf (rotated — X o'lchami detning ENI) */
function geomXato(nm, kerf, nom) {
  const out = [];
  for (const s of nm.sheets) {
    const b = s.parts.map(p => ({ p, x0: p.x, y0: p.y, x1: p.x + (p.rotated ? p.width : p.length), y1: p.y + (p.rotated ? p.length : p.width) }));
    for (let i = 0; i < b.length; i++) {
      const A = b[i];
      if (A.x0 < s.trimL - 0.01 || A.y0 < s.trimW - 0.01 || A.x1 > s.length - s.trimL + 0.01 || A.y1 > s.width - s.trimW + 0.01) out.push(`${nom} list ${s.no}: trimdan chiqdi`);
      const t = String(A.p.texture || '').toLowerCase();
      if (t === 'uzunlik' && A.p.rotated) out.push(`${nom} list ${s.no}: tekstura buzildi (uzunlik detali aylandi)`);
      for (let j = i + 1; j < b.length; j++) {
        const C = b[j];
        if (A.x0 < C.x1 + kerf - 0.01 && C.x0 < A.x1 + kerf - 0.01 && A.y0 < C.y1 + kerf - 0.01 && C.y0 < A.y1 + kerf - 0.01) out.push(`${nom} list ${s.no}: detallar orasida kerf yo'q`);
      }
    }
  }
  return out;
}
const toza = (n) => JSON.stringify(n, (k, v) => k === 'created_at' ? undefined : v);

/* ── 1) har doim (CI ham): kerf faqat qo'shni detallar orasida — TZ misoli (3646) ── */
const P9 = [[1490, 4], [1780, 2], [1840, 1], [1500, 1], [1100, 1]].map(([l, q], i) => ({ id: 'p' + i, length: l, width: 600, qty: q, texture: 'uzunlik', material: 'L' }));
const o9 = { sheetL: 2500, sheetW: 1830, trimL: 10, trimW: 10, kerf: 4, mode: 'bssf' };
const n9 = nestPanels(P9, o9);
ok(`TZ misoli: eni 600 li 9 detal (uzunlik), 2500×1830, kerf 4 → ${n9.sheet_count} list (3; oldin 5)`, n9.sheet_count === 3 && n9.unplaced.length === 0 && n9.sheets.every(s => s.parts.length === 3), JSON.stringify(n9.sheets.map(s => s.parts.length)));
ok('eniga 3 ta: 600×3 + 4×2 = 1808 ≤ 1810 (y = 10, 614, 1218)', n9.sheets.every(s => s.parts.map(p => p.y).sort((a, b) => a - b).join() === '10,614,1218'), JSON.stringify(n9.sheets[0].parts.map(p => [p.x, p.y])));
const n602 = nestPanels(P9.map(p => Object.assign({}, p, { width: 602 })), o9);
ok('602 li detal 3 tasi sig\'maydi: 602×3 + 4×2 = 1814 > 1810', n602.sheets.every(s => s.parts.length <= 2), JSON.stringify(n602.sheets.map(s => s.parts.length)));
ok('TZ misoli: geometriya (trim, kerf, tekstura)', !geomXato(n9, 4, 'misol').length && !geomXato(n602, 4, '602').length, geomXato(n9, 4, 'misol').concat(geomXato(n602, 4, '602')).slice(0, 2).join('; '));
const s9 = nestPanels(P9, Object.assign({}, o9, { mode: 'strip' }));
ok(`lenta rejimi ham: ${s9.sheet_count} list, geometriya to'g'ri`, s9.sheet_count === 3 && !geomXato(s9, 4, 'lenta').length, geomXato(s9, 4, 'lenta').slice(0, 2).join('; '));
ok('natija deterministik (ikki marta — aynan bir xil)', toza(nestPanels(P9, o9)) === toza(n9));
/* tekstura belgisi: oddiy dekor aylantiriladi, yog'och/tosh naqshi va noma'lum rang — yo'nalish saqlanadi */
const ODDIY = ['ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', 'ЛДСП Ультрадекор 4,575 Кашемир 16мм', 'ЛДСП Ультрадекор 4,575 Серый Графит 16мм', 'Каштан 18мм A GREY A GP PEARL', 'LDSP ODDIY'];
const NAQSHLI = ['ЛДСП Ультрадекор 4,575 Дуб Золотой 16мм', 'ЛДСП 5кв Kronospan 16мм Сосна Астана', 'ЛДСП Ультрадекор 4,575 Бодега Тёмный 16мм', 'ЛДСП Ультрадекор 5,796 Бетонный камень 16мм', 'ЛДСП Ультрадекор 4,575 Дуб Белый 16мм', 'Frente #1 _ 19мм', ''];
ok('tekstura: oddiy dekor — aylantiriladi (sex txt="false")', ODDIY.every(oddiyDekor), ODDIY.filter(n => !oddiyDekor(n)).join('; '));
ok('tekstura: yog\'och/tosh naqshi va noma\'lum — yo\'nalish saqlanadi (sex txt="true")', !NAQSHLI.some(oddiyDekor), NAQSHLI.filter(oddiyDekor).join('; '));

if (!existsSync(XLSX) || !existsSync(BAZIS)) {
  console.log('  · o\'tkazib yuborildi: Smart3D_toplam_2026-10-16 yo\'q (mijoz fayllari git\'da emas)');
  tugat();
}

/* ── sex: "Material bo'yicha" varag'i (scripts/xlsx_oddiy.py — kutubxonasiz o'quvchi) ── */
const kod = `import sys, json\nsys.dont_write_bytecode = True\nsys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})\nfrom xlsx_oddiy import read_xlsx\nprint(json.dumps(read_xlsx(sys.argv[1]).get("Material bo'yicha", [])))\n`;
const qatorlar = JSON.parse(execFileSync('python3', ['-I', '-c', kod, XLSX], { encoding: 'utf8', timeout: 60000 }));
const LDSP = /лдсп/i;
/* to'liq list maydoni — nomdagi m² (4,575 / 5,0325), bo'lmasa shu buyurtmadagi eng katta list */
const nomMaydon = (nom) => { const m = String(nom).match(/(\d)[,.](\d{2,4})\b/); return m ? +(m[1] + '.' + m[2]) * 1e6 : 0; };
const sex = {};
for (const id of IDS) {
  const q = qatorlar.slice(1).filter(r => r && +r[0] === id && LDSP.test(String(r[1])));
  const katta = Math.max(0, ...q.map(r => +r[2] * +r[3]));
  let soni = 0;
  for (const r of q) {
    const L = Math.max(+r[2], +r[3]), W = Math.min(+r[2], +r[3]), n = +r[4] || 0;
    const qoldiq = L < 2440 || W < 1220;
    soni += qoldiq ? n * (L * W) / (nomMaydon(r[1]) || katta) : n;
  }
  sex[id] = soni;
}

/* ── biz: Bazis → kesim → raskroy (verify_bazis.mjs "30 ta haqiqiy buyurtma" bilan bir xil zanjir) ── */
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
/* sex qaysi formatda kesgan (o'lchov uchun: algoritm sifatini formatdan ajratish) — eng katta LDSP listi, dekor nomi bo'yicha */
const sexFormat = (id, nom) => {
  const q = qatorlar.slice(1).filter(r => r && +r[0] === id && LDSP.test(String(r[1])) && Math.max(+r[2], +r[3]) >= 2440 && Math.min(+r[2], +r[3]) >= 1220);
  const dekor = String(nom).replace(/.*\d[,.]\d{2,4}\s*/, '').replace(/\s*1[68]\s*мм.*$/i, '').trim().split(/\s+/)[0].toLowerCase();
  const mos = q.filter(r => String(r[1]).toLowerCase().includes(dekor));
  const r = (mos.length ? mos : q).sort((a, b) => +b[2] * +b[3] - +a[2] * +a[3])[0];
  return r ? [Math.max(+r[2], +r[3]), Math.min(+r[2], +r[3])] : null;
};

const biz = {}, bizSexFormat = {}, vaqt = {}, buzuq = [];
const zanjir = (id) => {
  const d = readdirSync(BAZIS).find(x => x.startsWith(id + '_'));
  const f = d && readdirSync(join(BAZIS, d)).find(x => /\.b3d$/i.test(x));
  if (!f) return null;
  const r = daraxt(new Uint8Array(readFileSync(join(BAZIS, d, f))), { inflate });
  const sp = B.generateSpecification(r.objects);
  const rs = bazisLoyiha(r.objects, { fayl: f, fittings: sp.fittings, fasteners: sp.fasteners });
  const m2 = J('materials.json'); materiallarniQosh(m2, rs.materiallar);
  const c2 = cutlist(rs.fragment, rs.fragment.w, rs.fragment.d, rs.fragment.h, m2, {});
  return { m2, parts: c2.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })) };
};
const ldspSoni = (ns, m2) => {
  const nomi = Object.fromEntries(m2.panel_materials.map(m => [m.code, m.name]));
  return Object.entries(ns.by_material).reduce((a, [mat, nm]) => a + (LDSP.test(nomi[mat] || '') ? nm.sheet_count : 0), 0);
};
const CFG = { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 };
for (const id of IDS) {
  const t0 = Date.now();
  const z = zanjir(id);
  if (!z) { buzuq.push(id + ': Bazis fayli yo\'q'); continue; }
  const ns = nestProject(z.parts, z.m2, CFG);
  vaqt[id] = Date.now() - t0;
  const nomi = Object.fromEntries(z.m2.panel_materials.map(m => [m.code, m.name]));
  for (const [mat, nm] of Object.entries(ns.by_material)) {
    buzuq.push(...geomXato(nm, nm.kerf, id + ' ' + mat));
    if (LDSP.test(nomi[mat] || '') && nm.unplaced.length) buzuq.push(`${id} ${mat}: ${nm.unplaced.length} detal joylashmadi`);
  }
  biz[id] = ldspSoni(ns, z.m2);
  /* o'lchov: xuddi shu detallar sex kesgan list formatida (mahsulot kodi formatni o'zgartirmaydi — Bazis'dagisi olinadi) */
  for (const m of z.m2.panel_materials) if (m.bazis && LDSP.test(m.name)) { const f = sexFormat(id, m.name); if (f) m.sheets = [f]; }
  bizSexFormat[id] = ldspSoni(nestProject(z.parts, z.m2, CFG), z.m2);
}

/* eng katta buyurtma (3832, 405 detal) — Bazis → raskroy vaqti */
let katta = null;
if (readdirSync(BAZIS).some(x => x.startsWith('3832_'))) {
  const t0 = Date.now(); const z = zanjir(3832); const ns = z && nestProject(z.parts, z.m2, CFG);
  katta = { ms: Date.now() - t0, detal: ns ? ns.summary.panel_count : 0 };
}

const r1 = (x) => Math.round(x * 100) / 100;
const jb = IDS.reduce((a, id) => a + (biz[id] || 0), 0), js = IDS.reduce((a, id) => a + sex[id], 0);
const jf = IDS.reduce((a, id) => a + (bizSexFormat[id] || 0), 0);
console.log('\n  buyurtma   biz  biz(sex formati)   sex      vaqt');
for (const id of IDS) console.log(`  ${id}     ${String(biz[id]).padStart(4)}  ${String(bizSexFormat[id]).padStart(8)}        ${String(r1(sex[id])).padStart(5)}   ${vaqt[id]} ms`);
console.log(`  jami       ${String(jb).padStart(4)}  ${String(jf).padStart(8)}        ${String(r1(js)).padStart(5)}   (biz/sex ${r1(jb / js)}; sex formatida ${r1(jf / js)})`);
console.log(`  maqsad ≤ sex +5% = ${r1(js * MAQSAD)}: Bazis formatida — ${jb <= js * MAQSAD ? 'ERISHILDI' : 'ERISHILMADI'} (${jb}); sex formatida — ${jf <= js * MAQSAD ? 'ERISHILDI' : 'ERISHILMADI'} (${jf})`);
if (katta) console.log(`  eng katta buyurtma 3832: ${katta.detal} detal, ${katta.ms} ms`);
console.log('');

ok(`sex ma'lumoti o'qildi: 8 buyurtmada LDSP ${r1(js)} list`, IDS.every(id => sex[id] > 0) && js > 20, JSON.stringify(sex));
ok('raskroy geometriyasi: ustma-ust yo\'q, trim ichida, qo\'shni detallar orasida kerf, tekstura; LDSP hammasi joylashdi', !buzuq.length, buzuq.slice(0, 3).join('; '));
/* Bazis faylidagi format (4,575 → 2500×1830) bilan: 2026-10-17 dagi natija — 27 (oldin 34). Regressiya chegarasi. */
ok(`8 buyurtmada LDSP listlari (Bazis formati): biz ${jb}, sex ${r1(js)} — oldin 34, chegara ≤ 27`, jb <= 27, `biz/sex = ${r1(jb / js)}`);
ok(`sex kesgan formatda: biz ${jf} ≤ sex +5% (${r1(js * MAQSAD)}) — algoritm sexdagidek`, jf <= js * MAQSAD, `biz/sex = ${r1(jf / js)}`);
if (katta) ok(`eng katta buyurtma (3832, ${katta.detal} detal): Bazis → raskroy ${katta.ms} ms (< 3000)`, katta.ms < 3000 && katta.detal >= 400);
tugat();
