/* TZ-24 A: o'z modulini chizish (engine/chizish.js). Tekshiriladi:
 *   sex modullarini qo'lda chizsak — detallari aynan bir xil (MC-KP-01, MC-KP-02, MC-KU-07 — Bazis'dan olingan);
 *   3D panellar = kesim detallari (soni va o'lchami), BPJ joyi (joy) 3D bilan aynan; cho'zish; qoidalar (ogohlantirish);
 *   petlya soni, napravlyayushiy uzunligi, polka 16 mm (#120), hisob (narx, raskroy) xatosiz. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const C = await import('../app/js/engine/chizish.js');
const { cutlist } = await import('../app/js/engine/cutlist.js');
const { getModulePanels } = await import('../app/js/engine/assembler.js');
const { joyPanellar } = await import('../app/js/engine/joy.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const S16 = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };
const imzo = (cl) => cl.parts.map(p => p.slot + ':' + Math.max(p.finish_length, p.finish_width) + 'x' + Math.min(p.finish_length, p.finish_width)).sort().join(' ');
const chiz = (o) => Object.assign(C.yangiChizma(o.tur || 'pastki'), o);

/* 1) sex modullari qo'lda chizilganda — detallari aynan */
for (const [kod, ch] of [
  ['MC-KP-02', { w: 600, d: 450, h: 708, tag: { tur: 'sokol', h: 100 }, qopqoq: 'planka', ichki: { eshik: 2, polka: 1 } }],
  ['MC-KP-01', { w: 300, d: 450, h: 708, tag: { tur: 'sokol', h: 100 }, qopqoq: 'planka', ichki: { eshik: 1, polka: 1 } }],
  ['MC-KU-07', { tur: 'ustki', w: 600, d: 300, h: 721, tag: { tur: 'yoq', h: 0 }, ichki: { eshik: 2, polka: 2 } }]
]) {
  const f = H.catalog[kod], c = chiz(ch);
  const a = imzo(cutlist(f, f.w, f.d, f.h, H.materials, { projectSlots: S16 }));
  const b = imzo(cutlist(C.chizmaKatalog(c, 'CH-T', 't'), c.w, c.d, c.h, H.materials, { projectSlots: S16 }));
  ok(`${kod} ni qo'lda chizsak — detallari aynan bir xil (${a.split(' ').length} ta)`, a === b, '\n    MC ' + a + '\n    CH ' + b);
}

/* 1b) birikma teshiklari (TZ-11) — sex modullari qo'lda chizilsa, konfirmat teshiklari aynan (nomlar: pol → tub, bok → yon) */
{
  const NOM = { pol: 'tub', bok: 'yon', tepa_poltom: 'tub' };
  const tim = (cl, nomlar) => { const by = {}; for (const h of cl.holes.filter(x => /^evrovint/.test(x.kind))) (by[nomlar ? (NOM[h.part] || h.part) : h.part] = by[nomlar ? (NOM[h.part] || h.part) : h.part] || []).push([h.side, h.torets || '', h.x, h.y, h.dia, h.depth].join(',')); return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.sort().join(' ')])); };
  for (const [kod, ch] of [
    ['MC-KP-02', { w: 600, d: 450, h: 708, tag: { tur: 'sokol', h: 100 }, qopqoq: 'planka', ichki: { eshik: 2, polka: 1 } }],
    ['MC-KP-01', { w: 300, d: 450, h: 708, tag: { tur: 'sokol', h: 100 }, qopqoq: 'planka', ichki: { eshik: 1, polka: 1 } }],
    ['MC-KU-07', { tur: 'ustki', w: 600, d: 300, h: 721, tag: { tur: 'yoq', h: 0 }, ichki: { eshik: 2, polka: 2 } }]
  ]) {
    const f = H.catalog[kod], c = chiz(ch);
    const a = tim(cutlist(f, f.w, f.d, f.h, H.materials, { projectSlots: S16 }), true), b = tim(cutlist(C.chizmaKatalog(c, 'CH-T', 't'), c.w, c.d, c.h, H.materials, { projectSlots: S16 }));
    const umumiy = Object.keys(a).filter(k => b[k] != null);
    ok(`${kod}: konfirmat teshiklari (joyi, diametri, chuqurligi) sexdagi modul bilan aynan — ${umumiy.join(', ')}`, umumiy.length >= 2 && umumiy.every(k => a[k] === b[k]), JSON.stringify(umumiy.filter(k => a[k] !== b[k]).map(k => [k, a[k], b[k]])));
    /* D6: petlya kosasi, vint, planka, polka ushlagich — ikkala yo'lda bir xil (har nusxa; ruchka oralig'i farq qiladi: MC 160, chizma 128) */
    const d6 = (cl) => { const n = {}; for (const p of cl.parts) n[p.code] = (n[p.code] || 0) + 1;
      return cl.holes.filter(x => /^d6_/.test(x.kind) && x.kind !== 'd6_ruchka').flatMap(x => Array(x.ref ? 1 : n[x.part] || 1).fill([x.kind, x.yuza, x.x, x.y, x.dia, x.depth].join(','))).sort().join(' '); };
    const da = d6(cutlist(f, f.w, f.d, f.h, H.materials, { projectSlots: S16 })), db = d6(cutlist(C.chizmaKatalog(c, 'CH-T', 't'), c.w, c.d, c.h, H.materials, { projectSlots: S16 }));
    ok(`${kod}: D6 teshiklari (petlya, planka, polka ushlagich) sex moduli va qo'lda chizilganda bir xil (${da.split(' ').length} ta)`, da && da === db, '\n    MC ' + da + '\n    CH ' + db);
  }
  const sk = C.yangiChizma('shkaf'), k1 = C.chizmaFragment(sk, 1200, 600, 2200, {});
  const cl = cutlist(C.chizmaKatalog(sk, 'CH-S', 's'), 1200, 600, 2200, H.materials, { projectSlots: S16 });
  const ts = (k1.hardware.find(x => x.code === 'TS-1730') || {}).qty, th = cl.holes.filter(h => h.side === 'B').reduce((a, h) => a + (h.nusxa || 1), 0);
  ok('shkaf: konfirmat soni = o\'tuvchi teshiklar soni (har nusxa; bo\'lgich, pol, tepa, sokol birikmalari)', ts > 0 && ts === th, ts + ' / ' + th);
}

/* 2) har tur: 3D = kesim, BPJ joyi = 3D, hisob xatosiz */
for (const tur of C.CHIZMA_TURLARI) {
  const c = C.yangiChizma(tur), fr = C.chizmaKatalog(c, 'CH-' + tur, tur);
  const cl = cutlist(fr, c.w, c.d, c.h, H.materials, {});
  const asm = getModulePanels(fr, c.w, c.d, c.h, { thickness: 16 });
  const birxil = asm.panels.length === cl.parts.length;
  const yf = C.chizmaYech(fr, c.w, c.d, c.h, {});
  const jp = joyPanellar(yf, c.w, c.d, c.h, { t: 16, qalinlik: (p) => (p.slot === 'orqa' ? 3 : 16) });
  const key = (p) => [p.x, p.y, p.z, p.w, p.d, p.h].map(v => Math.round(v)).join(',');
  const A = asm.panels.map(key).sort().join('|'), B = jp.map(key).sort().join('|');
  ok(`${tur}: 3D panellar (${asm.panels.length}) = kesim detallari; BPJ joyi 3D bilan aynan; kesim xatosiz`, birxil && A === B && !cl.errors.length,
    JSON.stringify({ asm: asm.panels.length, cl: cl.parts.length, err: cl.errors.slice(0, 2) }) + (A === B ? '' : '\n    3D ' + A.slice(0, 300) + '\n    BPJ ' + B.slice(0, 300)));
}

/* 3) cho'zish: shkaf 1200 → 1800 — teng bo'limlar, bo'lgich o'rtada; aniq mm bo'lim o'zgarmaydi */
{
  const c = C.yangiChizma('shkaf'), fr = C.chizmaKatalog(c, 'CH-S', 's');
  const p = getModulePanels(fr, 1800, c.d, c.h, {}).panels.find(x => x.code === 'bolgich');
  ok('cho\'zish: 1800 mm shkafda bo\'lgich o\'rtada', p && Math.abs(p.x) < 0.5, p && p.x);
  const c2 = C.bolimOzgar(c, [], (n) => { n.bo[0].o = 500; });
  const p2 = getModulePanels(C.chizmaKatalog(c2, 'CH-S2', 's'), 1800, c.d, c.h, {}).panels.find(x => x.code === 'bolgich');
  ok('aniq 500 mm bo\'lim — eni o\'zgarsa ham 500 qoladi', p2 && Math.abs((p2.x - p2.w / 2) - (-900 + 16 + 500)) < 0.5, p2 && p2.x);
}

/* 4) bo'lish va birlashtirish */
{
  let c = C.yangiChizma('erkin');
  c = C.bol(c, [], 'v', 3);
  ok('bo\'lish: 3 ta vertikal bo\'lim, tarkib birinchisiga o\'tdi', c.ichki.bo.length === 3 && c.ichki.bo[0].n.polka === 4 && !c.ichki.polka);
  const n = C.chizmaPanellar(c, c.w, c.d, c.h).panels.filter(p => p.code === 'bolgich').length;
  ok('bo\'lgichlar soni = bo\'limlar − 1', n === 2, n);
  c = C.bol(c, [1], 'h', 2);
  ok('ichki bo\'lim yana bo\'linadi (gorizontal)', C.bolim(c, [1]).yo === 'h' && C.bolim(c, [1, 0]) !== null);
  c = C.birlashtir(c, [1]);
  ok('birlashtirish — bo\'lim yaxlit', !C.bolim(c, [1]).yo);
}

/* 4b) bo'lgichni surish (32 mm), saqlash shakli (yassi — server chuqurlik chegarasi) */
{
  const { docXatosi } = await import('../server/himoya.js');
  let c = C.yangiChizma('shkaf');
  const b0 = C.chizmaKorinish(c).bolgichlar[0];
  const c2 = C.bolgichSur(c, [], 0, b0.s + 100);
  ok('bo\'lgich surildi: 32 mm qadam, keyingi bo\'lim teng (qolgan joy)', c2.ichki.bo[0].o % 32 === 0 && c2.ichki.bo[1].o == null, JSON.stringify(c2.ichki.bo.map(b => b.o)));
  ok('surilgandan keyin modul kengaysa ham bo\'laklar yig\'indisi to\'g\'ri (ogohlantirishsiz)', !C.chizmaFragment(Object.assign({}, c2, { w: 2000 }), 2000, c.d, c.h).ogoh.some(o => o.kod === 'bolim_yigindi'));
  for (let i = 0; i < 6; i++) c = C.bol(c, i % 2 ? [1, 0] : [1], i % 2 ? 'v' : 'h', 2);
  const y = C.yassi(c);
  ok('yassi saqlash → tiklash: detallar aynan', JSON.stringify(C.chizmaFragment(C.tikla(JSON.parse(JSON.stringify(y))), c.w, c.d, c.h)) === JSON.stringify(C.chizmaFragment(c, c.w, c.d, c.h)));
  const doc = { app: 'smart3d', v: 2, doc: { room: { outline: [[0, 0], [1, 0], [1, 1]] }, placements: [], chizmalar: { 'CH-X1': { nom: 'a', ch: y } } } };
  ok('chuqur bo\'lingan chizma ham server tekshiruvidan o\'tadi (yassi)', !docXatosi(doc), docXatosi(doc));
}

/* 5) qoidalar */
const og = (c) => C.chizmaFragment(c, c.w, c.d, c.h, {}).ogoh.map(x => x.kod);
ok('polka juda keng (16 mm, 1000 mm) — ogohlantirish', og(chiz({ tur: 'erkin', w: 1032, ichki: { polka: 3 } })).includes('polka_keng'));
ok('polka 800 mm gacha — ogohlantirishsiz', !og(chiz({ tur: 'erkin', w: 832, ichki: { polka: 3 } })).includes('polka_keng'));
ok('eshik juda keng (1 eshik, 900 mm) — ogohlantirish', og(chiz({ w: 900, ichki: { eshik: 1, polka: 1 } })).includes('eshik_keng'));
ok('eshik juda tor (2 eshik, 260 mm) — ogohlantirish', og(chiz({ w: 260, ichki: { eshik: 2 } })).includes('eshik_tor'));
ok('tortma uchun chuqurlik yetmaydi — ogohlantirish', og(chiz({ tur: 'tumba', d: 240 })).includes('tortma_chuqur'));
ok('polkalar juda zich — ogohlantirish', og(chiz({ tur: 'erkin', ichki: { polka: 20 } })).includes('polka_zich'));
/* D6 (sex fayllaridan, 534 eshik): ≤ 1000 — 2, ≤ 1600 — 3, ≤ 2000 — 4, undan katta — 5 */
ok('petlya soni: 1000 — 2, 1600 — 3, 2000 — 4, 2001 — 5', [900, 1000, 1001, 1600, 1601, 2000, 2001].map(C.petlyaSoni).join() === '2,2,3,3,4,4,5');
const nap = (d) => (C.chizmaFragment(chiz({ tur: 'tumba', d }), 400, d, 708, {}).hardware.find(x => /^NAP-/.test(x.code)) || {}).code;
ok('napravlyayushiy: chuqurlik 450 → 400, 560 → 550, 300 → 250', nap(450) === 'NAP-400' && nap(560) === 'NAP-550' && nap(300) === 'NAP-250', [nap(450), nap(560), nap(300)].join());

/* 6) hisob: polka 16 mm (#120), korpus 18 — narx, raskroy, furnitura */
{
  const c = C.yangiChizma('shkaf'), fr = C.chizmaKatalog(c, 'CH-HISOB', 'Shkaf');
  H.catalog[fr.code] = fr;
  const doc = { v: 1, room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, wall_thickness: 100, openings: [] },
    placements: [{ id: 'p1', frg: fr.code, x: 0, y: 0, z: 0, w: c.w, d: c.d, h: c.h, rot: 0, qty: 1 }] };
  const r = H.recalc(doc, { materialCode: 'LDSP18', fasadCode: 'MDF16', polkaCode: 'LDSP16' });
  const cl = r.cutlists[0];
  ok('hisob: narx > 0, xatosiz, polka LDSP16 16 mm, korpus 18 mm', r.priceRes.total > 0 && !r.val.errors.length && cl.parts.filter(p => p.slot === 'polka').every(p => p.thickness === 16) && cl.parts.filter(p => p.code === 'yon').every(p => p.thickness === 18));
  const hw = r.prod.lines.filter(l => l.group === 'Furnitura').map(l => l.code);
  ok('furnitura: petlya, ruchka, konfirmat, polkaderjatel, shtanga', ['PET-4', 'RU-128', 'TS-1730', 'POLKADERJ', 'SHTANGA'].every(k => hw.includes(k)), hw.join());
  const yon = cl.parts.find(p => p.code === 'yon');
  ok('korpus 18 mm — ichki o\'lchamlar qalinlikka moslandi (pol eni = w − 2·18)', cl.parts.find(p => p.code === 'tub').finish_length === c.w - 36 && yon.finish_length === c.h - 18, JSON.stringify(cl.parts.find(p => p.code === 'tub')));
  delete H.catalog[fr.code];
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
