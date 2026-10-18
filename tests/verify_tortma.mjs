/* TZ-09 Q5 / TZ-19: tortmalar faqat 3D ko'rinish uchun (assembler.js, opts.tortma) — kesim, narx va eksport O'ZGARMAYDI.
 *   1) bayroqsiz chiqish (BPJ, OBJ, GLB, eski sayt shuni ishlatadi) — tortma qo'shilishidan oldingi kod bilan aynan bir xil
 *      (barmoq izi 2026-10-15 da eski koddan olingan: 121 modul × 4 o'lcham × 2 qalinlik);
 *   2) bayroq bilan: tortmalar soni modul detallaridagi "Фасад ящика"/fasad_kichik/fasad_katta/tortma_fasad soniga teng,
 *      fasad ichida, bir-birini qoplamaydi; aralash modulda eshik ham bor; tortmasiz modul va shkaf bo'lmagan (karavot,
 *      parta — 3D da yaxlit quti) — o'zgarmaydi. */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getModulePanels } from '../app/js/engine/assembler.js';

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
/* TZ-22 da qo'shilgan yon doborlar (SP-ST-005/006) barmoq izi ro'yxatiga kirmaydi — iz 121 eski modul bo'yicha */
const frs = [...JSON.parse(readFileSync(DATA + 'fragments.json', 'utf8')), ...JSON.parse(readFileSync(DATA + 'fragments-mc.json', 'utf8')).fragments]
  .filter(f => !['SP-ST-005', 'SP-ST-006'].includes(f.code));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const SIZES = (f) => [[f.w, f.d, f.h], [f.w + 137, f.d, f.h], [400, 450, 708], [900, 560, 2100]];

/* 1) bayroqsiz — eski kod bilan aynan */
const out = [];
for (const f of frs) for (const [w, d, h] of SIZES(f)) out.push(getModulePanels(f, w, d, h, {}), getModulePanels(f, w, d, h, { thickness: 18 }));
const iz = crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
/* 2026-10-16 (egasi #119): MC pastki shkaf va penal (sokol_ichida) — korpus oyoqda, sokol korpus ostida (Bazis'dagidek) — ataylab
   o'zgardi: 6 modul (MC-KP-01/02/05/07/08, MC-KK-01). Qolgan 115 modul eski kod bilan aynan (har modul bo'yicha solishtirildi). */
ok('bayroqsiz chiqish o\'zgarmagan (BPJ/OBJ/GLB/eski sayt)', iz === '04fa8a2f66b4614c599684b88ebb75b8ae9a80a2078cba61872872690573d07f', iz);

/* 2) bayroq bilan */
const TORTMA = /ящик|tortma|fasad_kichik|fasad_katta/i;
const dataSoni = (f) => (f.parts || []).filter(p => p.slot === 'fasad' && TORTMA.test((p.nom || p.name || '') + ' ' + (p.code || ''))).reduce((a, p) => a + Math.max(1, Math.round(+p.qty || 1)), 0);
let tortmali = 0;
for (const f of frs) {
  const n = dataSoni(f);
  const a = getModulePanels(f, f.w, f.d, f.h, {}), b = getModulePanels(f, f.w, f.d, f.h, { tortma: true });
  const fronts = b.panels.filter(p => p.isDrawer);
  if (!n) { ok(f.code + ': tortmasiz — bayroq bilan ham o\'zgarmaydi', JSON.stringify(a) === JSON.stringify(b)); continue; }
  if (!b.doors.length) { ok(f.code + ': shkaf emas (karavot, parta) — 3D o\'zgarmaydi', JSON.stringify(a) === JSON.stringify(b)); continue; }
  tortmali++;
  ok(f.code + ': tortmalar soni = detallardagi (' + n + ')', fronts.length === n, fronts.length);
  const zs = fronts.map(p => [p.z - p.h / 2, p.z + p.h / 2]).sort((x, y) => x[0] - y[0]);
  ok(f.code + ': fasad ichida, bir-birini qoplamaydi', zs.every(([lo, hi], i) => lo >= -f.h / 2 - 0.01 && hi <= f.h / 2 + 0.01 && (i === 0 || lo >= zs[i - 1][1] - 0.01)));
  ok(f.code + ': har tortmada quti (yon ×2, orqa, tub)', fronts.every(fr => b.panels.filter(p => p.drawerOf === fr.id).length === 4));
}
ok('tortmali modullar topildi', tortmali >= 7, tortmali);
const kp03 = frs.find(f => f.code === 'MC-KP-03'), g12 = frs.find(f => f.code === 'SP-G-012');
const m3 = getModulePanels(kp03, kp03.w, kp03.d, kp03.h, { tortma: true }), m12 = getModulePanels(g12, g12.w, g12.d, g12.h, { tortma: true });
ok('MC-KP-03 (1 tortma + eshik): eshik tortma ostida', m3.doors.some(p => p.isDoor) && m3.panels.find(p => p.isDrawer).z > m3.panels.find(p => p.isDoor).z);
ok('SP-G-012 (garderob): 2 eshik tepada, tortmalar pastda', m12.panels.filter(p => p.isDoor).length === 2 && Math.max(...m12.panels.filter(p => p.isDrawer).map(p => p.z)) < Math.min(...m12.panels.filter(p => p.isDoor).map(p => p.z)));

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
