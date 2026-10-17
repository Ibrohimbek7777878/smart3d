/* Bekor qilish / qaytarish tarixi (web/src/store/bekor.js, egasi 2026-10-17): qadam, birlashtirish, guruh (modul chizish),
 * 50 qadam chegarasi, qaytarish zanjiri, tozalash va farq nomlari. Brauzerdagi tekshiruv: tests/ui/web_undo.mjs. */
import { createTarix, farq, TARIX_MAX, BIRLASH_MS } from '../web/src/store/bekor.js';

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;
const xona = () => ({ outline: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]], wall_height: 2700, openings: [], utilities: [] });
const mod = (id, o) => Object.assign({ id, frg: 'SP-K-001', x: 100, y: 100, z: 0, w: 600, d: 550, h: 720, rot: 0 }, o);

/* sinov "loyihasi": jonli hujjat + materiallar; qoy — surat qaytarilganda */
let doc = { room: xona(), placements: [], kitchen: {} }, m = ['LDSP18', 'MDF16'], guruh = null, qoyildi = 0, holat = null;
const T = createTarix({ surat: () => ({ doc, m }), qoy: (o) => { doc = o.doc; m = o.m; qoyildi++; }, guruh: () => guruh, onChange: (h) => { holat = h; } });
const ozgar = (fn) => { fn(); T.yoz(); };

T.yoz();
ok('boshlang\'ich holat — qadam emas', T.holat().bekor === 0 && T.holat().qayta === 0);
T.yoz();
ok("o'zgarishsiz yoz() — qadam emas", T.holat().bekor === 0);
ozgar(() => doc.placements.push(mod('p1')));
ok("modul qo'shish — 1 qadam, onChange xabar oldi", T.holat().bekor === 1 && holat && holat.bekor === 1);
ok("bekor → 'qoshish', modul yo'q", T.bekor() === 'qoshish' && doc.placements.length === 0 && qoyildi === 1);
ok("qayta → 'qoshish', modul bor", T.qayta() === 'qoshish' && doc.placements.length === 1 && doc.placements[0].id === 'p1');
ok('qaytarilgan hujjat — yangi obyekt (suratdan), jonli emas', T.holat().bekor === 1 && T.holat().qayta === 0);

/* surish: tortish oxirida bitta yoz() */
ozgar(() => { doc.placements[0].x = 900; doc.placements[0].y = 300; });
ok("surish — 'surish'", T.bekor() === 'surish' && doc.placements[0].x === 100);
T.qayta();
/* o'lcham maydoni — bir modulda ketma-ket (BIRLASH_MS ichida) — bitta qadam */
const n0 = T.holat().bekor;
ozgar(() => { doc.placements[0].w = 610; });
ozgar(() => { doc.placements[0].w = 620; });
ozgar(() => { doc.placements[0].w = 630; });
ok("ketma-ket o'lcham — bitta qadam", T.holat().bekor === n0 + 1, J(T.holat()));
ok("bekor → 'olcham', 600 ga qaytadi", T.bekor() === 'olcham' && doc.placements[0].w === 600);
ok('yangi o\'zgarish qaytarish zanjirini tozalaydi', (ozgar(() => { doc.placements[0].rot = 90; }), T.holat().qayta === 0));
ok("burish — 'burish'", T.bekor() === 'burish' && doc.placements[0].rot === 0);

/* material — loyiha materiali (m) va modul sloti */
ozgar(() => { m = ['ERP-1', 'MDF16']; });
ok("loyiha materiali — 'material'", T.bekor() === 'material' && m[0] === 'LDSP18');
ozgar(() => { doc.placements[0].slots = { korpus: 'ERP-2' }; });
ok("modul materiali — 'material'", T.bekor() === 'material' && !doc.placements[0].slots);

/* modul chizish oynasi ochiq — hamma o'zgarish bitta qadam (vaqtdan qat'i nazar) */
guruh = 'chizish:CH-1';
const n1 = T.holat().bekor;
ozgar(() => { doc.chizmalar = { 'CH-1': { nom: 'a' } }; doc.placements.push(mod('p2')); });
ozgar(() => { doc.chizmalar['CH-1'].nom = 'b'; doc.placements[1].w = 700; });
ozgar(() => { doc.placements[1].h = 800; });
guruh = null;
ok("chizish oynasi — bitta qadam 'chizma'", T.holat().bekor === n1 + 1);
ok("bekor → chizma va modul yo'q", T.bekor() === 'chizma' && !doc.chizmalar && doc.placements.length === 1);

/* belgi: AI qurish */
T.belgi('ai');
ozgar(() => { doc.placements = [mod('a1'), mod('a2'), mod('a3')]; });
ok("belgi('ai') — nom farqdan ustun", T.bekor() === 'ai' && doc.placements.length === 1);

/* 51 qadam → 50; eng eskisi tushadi */
T.tozala(); T.yoz();
ok('tozala — tarix bo\'sh', T.holat().bekor === 0 && T.holat().qayta === 0 && holat.bekor === 0);
const tur = ['qoshish', 'surish'];
for (let i = 0; i < TARIX_MAX + 1; i++) {
  if (i % 2 === 0) ozgar(() => doc.placements.push(mod('q' + i)));
  else ozgar(() => { doc.placements[doc.placements.length - 1].x += 50; });
}
ok(`${TARIX_MAX + 1} qadam — tarixda ${TARIX_MAX}`, T.holat().bekor === TARIX_MAX, J(T.holat()));
const nomlar = [];
for (let i = 0; i < TARIX_MAX; i++) nomlar.push(T.bekor());
ok('hammasi bekor — 1-qadamdan keyingi holat (q0 bor, boshqasi yo\'q)', J(doc.placements.map(p => p.id)) === J(['p1', 'q0']) && T.bekor() === null, J(doc.placements.map(p => p.id)));
ok('nomlar navbatma-navbat', nomlar.every((n, i) => n === tur[(TARIX_MAX - i) % 2]), J(nomlar.slice(0, 4)));
ok(`qaytarish zanjiri — ${TARIX_MAX}`, T.holat().qayta === TARIX_MAX);

/* farq nomlari */
const S = (o) => ({ doc: Object.assign({ room: xona(), placements: [mod('p1')], kitchen: {} }, o), m: ['LDSP18'] });
const nom = (a, b) => (farq(a, b) || {}).nom || null;
ok("o'zgarishsiz — null", farq(S(), S()) === null);
ok("xona o'lchami — 'xona'", nom(S(), S({ room: Object.assign(xona(), { outline: [[0, 0], [6000, 0], [6000, 4000], [0, 4000]] }) })) === 'xona');
ok("balandlik — 'xona'", nom(S(), S({ room: Object.assign(xona(), { wall_height: 3000 }) })) === 'xona');
ok("L shakl — 'shakl'", nom(S(), S({ room: Object.assign(xona(), { outline: [[0, 0], [5000, 0], [5000, 2000], [3000, 2000], [3000, 4000], [0, 4000]] }) })) === 'shakl');
ok("eshik — 'teshik'", nom(S(), S({ room: Object.assign(xona(), { openings: [{ wall: 0, type: 'door', offset: 100, width: 900 }] }) })) === 'teshik');
ok("quvur — 'quvur'", nom(S(), S({ room: Object.assign(xona(), { utilities: [{ wall: 0, type: 'pipe', offset: 100 }] }) })) === 'quvur');
ok("Devorli → Erkin — 'maydon'", nom(S(), S({ maydon: 'erkin' })) === 'maydon');
ok("oshxona elementlari — 'oshxona'", nom(S(), S({ kitchen: { stoleshnitsa: true } })) === 'oshxona');
ok("o'chirish — 'ochirish'", nom(S(), S({ placements: [] })) === 'ochirish');
ok("hosila (auto) modullar hisobga olinmaydi", farq(S(), S({ placements: [mod('p1'), Object.assign(mod('k'), { auto: true })] })) === null || nom(S(), S({ placements: [mod('p1'), Object.assign(mod('k'), { auto: true })] })) === 'ozgarish');
ok("o'lcham kaliti — modul bo'yicha", (farq(S(), S({ placements: [mod('p1', { w: 700 })] })) || {}).kalit === 'olcham:p1');
ok(`birlashtirish oynasi ${BIRLASH_MS} ms`, BIRLASH_MS > 0 && BIRLASH_MS <= 1500);

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
