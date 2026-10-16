/* TZ-24 B: tayyor so'rovlar kutubxonasi — har so'rov AI'siz loyiha quradi: standart, eng kichik va eng katta o'lchamda
 * hamma modul sig'adi, to'qnashuv va xonadan chiqish yo'q (rules.js validateDoc), narx > 0; uch tilda nom va izoh. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const { promptLoyiha, qiymatlar, toplamJoyla, KATEGORIYALAR } = await import('../app/js/engine/promptlar.js');
const { konstruksiya } = await import('../app/js/engine/konstruktor/index.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const P = JSON.parse(readFileSync(DATA + 'promptlar.json', 'utf8')).promptlar;

ok(`kutubxona: ${P.length} ta so'rov, ${new Set(P.map(p => p.kat)).size} kategoriya, id takrorlanmaydi`, P.length >= 12 && new Set(P.map(p => p.id)).size === P.length && P.every(p => KATEGORIYALAR.includes(p.kat)));
ok('uch tilda nom va izoh', P.every(p => ['uz', 'ru', 'en'].every(l => p.nom[l] && p.izoh[l])));
const kodlar = P.flatMap(p => (p.toplam || []).map(x => x.kod));
ok(`to'plam kodlari katalogda (${new Set(kodlar).size} ta)`, kodlar.every(k => H.catalog[k]), kodlar.filter(k => !H.catalog[k]).join());
ok('qiymatlar chegarada: bo\'sh — standart, katta — max, kichik — min', (() => {
  const p = P[0], m = p.maydon[0];
  return qiymatlar(p, {}).eni === m.q && qiymatlar(p, { eni: 99999 }).eni === m.max && qiymatlar(p, { eni: 1 }).eni === m.min && qiymatlar(p, { eni: 'abc' }).eni === m.q;
})());

for (const p of P) {
  for (const [nom, kir] of [['standart', {}], ['eng kichik', Object.fromEntries(p.maydon.map(m => [m.k, m.min]))], ['eng katta', Object.fromEntries(p.maydon.map(m => [m.k, m.max]))]]) {
    const r = promptLoyiha(p, kir, H.catalog, { konstruksiya });
    const doc = { v: 1, room: { outline: r.xona.outline, wall_height: r.xona.H, wall_thickness: 100, openings: [] }, placements: r.placements, kitchen: r.kitchen };
    let res = null, xt = '';
    try { res = H.recalc(doc, { materialCode: 'LDSP18', fasadCode: 'MDF16', polkaCode: 'LDSP16' }); } catch (e) { xt = e.message; }
    const kutilgan = p.usul === 'toplam' ? p.toplam.length : 3;
    const xato = res ? res.val.errors : [xt];
    ok(`${p.id} (${nom} ${r.xona.W}×${r.xona.D}): ${r.placements.length} modul${p.shakl ? '' : ''}, sig'madi yo'q, xatosiz, narx > 0`,
      !r.xato && !r.sigmadi.length && r.placements.length >= kutilgan && !xato.length && res.priceRes.total > 0 && (p.usul !== 'oshxona' || r.shakl === p.talab.shakl),
      JSON.stringify({ xato: r.xato, sigmadi: r.sigmadi, n: r.placements.length, shakl: r.shakl, val: xato.slice(0, 2) }).slice(0, 300));
  }
}

/* joylash qoidasi: devorlar va burilish (orqa 0°, chap 270°, ong 90°, old 180°) — orqasi devorda */
const t = toplamJoyla(3000, 2500, 2700, [{ kod: 'SP-SH-003', devor: 'orqa', joy: 'bosh' }, { kod: 'SP-SH-003', devor: 'chap', joy: 'oxir' }, { kod: 'SP-SH-003', devor: 'ong', joy: 'bosh' }, { kod: 'SP-SH-003', devor: 'old', joy: 'markaz' }], H.catalog);
ok('devorlar: orqa 0°, chap 270°, ong 90°, old 180° — orqasi devorga tegib turadi', t.placements.map(p => p.rot).join() === '0,270,90,180' && !t.sigmadi.length, JSON.stringify(t.placements.map(p => [p.x, p.y, p.rot])));
const toliq = toplamJoyla(2000, 2000, 2700, [{ kod: 'SP-SH-003', devor: 'orqa', joy: 'bosh' }, { kod: 'SP-SH-003', devor: 'orqa', joy: 'bosh' }, { kod: 'SP-SH-003', devor: 'orqa', joy: 'bosh' }], H.catalog);
ok('sig\'magan modul — ro\'yxatda (joylanmaydi, ustma-ust qo\'yilmaydi)', toliq.placements.length === 2 && toliq.sigmadi.length === 1, JSON.stringify(toliq));
const td = toplamJoyla(3100, 2500, 2700, [{ kod: 'SP-G-011', devor: 'orqa', joy: 'markaz', w: 'toldir' }], H.catalog);
/* TZ-05: SP-G-011 eng katta eni — qopqoq varaqqa (2800) sig'adigan 2800 mm; devor 3100 — chegara ishlaydi */
ok('"toldir": devorga sig\'adigan eng katta eni (chegara ichida)', td.placements[0] && td.placements[0].w === H.catalog['SP-G-011'].max_w && H.catalog['SP-G-011'].max_w < 3100, JSON.stringify(td.placements[0]));

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
