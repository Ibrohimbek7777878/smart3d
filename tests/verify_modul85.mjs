/* verify_modul85.mjs — TZ-32 B: 85 umumiy (SP-) modul sex qoidasiga mosligi. Har safar 85 modulni tekshiradi:
 *   QUR    — detal bor; formula xatosiz (sukut / eng kichik / eng katta o'lchamda, sex standarti qo'llangandan keyin ham);
 *            har detal varaqqa sig'adi (2800 × 2070, chetidan 10 mm — nesting.js TRIM_DEFAULT); tortma yon devori
 *            chuqurlikka sig'adi (MC/Bazis qoidasi: tortma yoni = d − 50, MC-KP-03/04/09/10/11).
 *   OLCHAM — sex turiga mos modulda `standart` maydoni (sex-standartlari.json) bor; sukut o'lchami sex oralig'ida.
 *   FURN   — har olinadigan polkaga 4 polkaderjatel (ERP 90002019); korpus qutisida konfirmat (MC uzunlik jadvali).
 *   KROMKA — korpus/polka detali: old qirra (F) bor, orqa qirra (B) yo'q; fasad — 4 tomon; 16 yangi modul — slot formatida
 *            (kromka_korpus / kromka_fasad, MC modullari kabi).
 *   PETLYA — eski 'hinge' yozuvi yo'q; har ochiladigan eshikda kosa D6 qoidasida (uchidan 105, qirradan 21,5; soni petlyaSoni).
 *   TESHIK — bir koordinatada qty > 1 (eski shablon teshiklari) va teshiksiz korpus — faqat hisobot (joy manbasi yo'q).
 *   NARX   — 85 modul narx aniqligi (eng yuqori / mediana) — faqat ma'lumot.
 * Egasi javobini kutayotganlar (TZ-32 4-bo'lim) yiqitmaydi — "kutilmoqda" ro'yxatida chiqadi.
 * Ishga tushirish: node tests/verify_modul85.mjs [--stat] [--fayl <fragments.json>] */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { D6, petlyaSoni } from '../app/js/engine/d6.js';

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const STAT = process.argv.includes('--stat');
const frags = JSON.parse(readFileSync(arg('--fayl') || DATA + 'fragments.json', 'utf8'));
const mats = J('materials.json'), std = J('sex-standartlari.json');
const furnById = Object.fromEntries(J('furnitura-catalog.json').items.filter(i => i.id).map(i => [i.id, i]));
const furnBoglash = J('furnitura-boglash.json').links || {};

/* ── egasi javobini kutayotganlar (TZ-32 4-bo'lim) — yiqitmaydi ── */
const QUTI_SHABLON = new Set(['SP-T-004', 'SP-T-005', 'SP-T-006', 'SP-T-007', 'SP-BD-003', 'SP-BD-004', 'SP-BD-005', 'SP-BD-006',
  'SP-S-005', 'SP-S-006', 'SP-C-003', 'SP-C-004']);                                            // 7-savol: stol/krovat/divan/stul — yopiq quti
const NOM_SAVOL = new Set(['SP-K-004', 'SP-BD-005']);                                          // 9-savol
const NARXSIZ_18 = ['KUPE-SYS-02', 'KUPE-SYS-03', 'TRUBA-OVAL', 'CONFIRMAT', 'PETLYA-MUZ', 'SLIDER-MUZ', 'TANDEM-500', 'TANDEM-400-NAM',
  'KARGO-200', 'NAVES-REG', 'NAVES-OGIR', 'NAVES-CAMAR', 'LIFT-HF', 'GILDIRAK-ROLIK', 'ZAMOK-MARKAZIY', 'KRYUCHOK-3TALIK', 'PETLYA-NAM', 'TIP-ON'];

/* ── sex qoidalari (manba izohda) ── */
const VARAQ = { L: 2800 - 2 * 10, W: 2070 - 2 * 10 };                                        // materials.json sheet 2800×2070, TRIM 10
const TORTMA_ZAZOR = 50;                                                                       // MC-KP-03/04/09/10/11: Боковина ящика = d − 50
const TORTMA_YON = /^tortma_yon|Боковина ящика/i;
const POLKA = /^(shift\d*|polka)$/;                                                            // olinadigan polka (ushlagichda)
const POLKA_QOTIRMA = new Set(['SP-SH-001']);                                                  // ochiq toka: polka korpusning o'zi (SH-01 shkant)
const KROMKA_YOQ_TUR = new Set(['sofa', 'chair', 'door', 'window', 'countertop', 'filler']);   // upholstery / eshik / deraza / oshxona qo'shimchasi
const BUTUN_KROMKA = /^(gorma|stoleshnitsa|asosiy_panel)$/;                                   // stol usti, devor paneli — 4 qirrasi ko'rinadi
const YANGI16 = (f) => !!f.slots;                                                               // expand_fragments.js da qo'shilgan modullar
const KONFIRMAT = /CONFIRMAT|konfirmat|евро|evro|GD-04|SH-01|M8-60|UGOLOK/i;                  // korpus mahkamlagichi (biror turi)
const POLKADERJATEL = /polk.*derj|полкодерж|POLKADERJATEL/i;

const qutimi = (f) => f.production === 'panel' && !KROMKA_YOQ_TUR.has(f.category)
  && f.parts.some(p => /^yon/.test(p.code)) && f.parts.some(p => /^(ust|past|tub|qopqoq)/.test(p.code));
const slotOf = (p) => p.slot || (/eshik|fasad|door|front/i.test(p.code) ? 'fasad' : /orqa|back|hdf/i.test(p.code) ? 'orqa'
  : /polka|shelf/i.test(p.code) ? 'polka' : 'korpus');
const eshikSoni = (f) => f.parts.filter(p => slotOf(p) === 'fasad' && !/tortma|fasad_kichik|fasad_katta|gorizontal/i.test(p.code)
  && /eshik/i.test(p.code)).reduce((s, p) => s + (+p.qty || 1), 0);
const polkaSoni = (f) => POLKA_QOTIRMA.has(f.code) ? 0
  : f.parts.filter(p => POLKA.test(p.code)).reduce((s, p) => s + (isNaN(+p.qty) ? 1 : +p.qty), 0);

/** sex standarti turi — qoida: guruh/toifa + eshik soni (sex: "w — modul eni, eshik enidan"). Mos tur yo'q — null */
export function sexTuri(f) {
  if (f.production !== 'panel' || KROMKA_YOQ_TUR.has(f.category)) return null;
  const n = eshikSoni(f), ikki = n >= 2 || (n === 0 && f.w >= 600);
  if (['kuxnya-kolonna', 'kuxnya-muz'].includes(f.group) || (f.group === 'kuxnya-ustki' && f.h >= 2030)) return 'oshxona_penal';
  if (['kuxnya-pastki', 'kuxnya-pec'].includes(f.group)) return ikki ? 'oshxona_pastki_2e' : 'oshxona_pastki_1e';
  if (f.group === 'kuxnya-ustki') return ikki ? 'oshxona_ustki_2e' : 'oshxona_ustki_1e';
  if (f.category === 'wardrobe' && f.h >= 1780) return 'shkaf';
  return null;
}

/** bitta modul tekshiruvi → { tur: [{m, k}] } (k — kutilmoqda: egasi javobi) */
export function tekshir(f0) {
  const f = JSON.parse(JSON.stringify(f0));
  const R = { QUR: [], OLCHAM: [], FURN: [], KROMKA: [], PETLYA: [], TESHIK: [] };
  const x = (tur, m, k = false) => R[tur].push({ m, k });
  if (f.production === 'none') return R;
  /* QUR */
  if (!(f.parts || []).length) { x('QUR', "detal yo'q"); return R; }
  if (QUTI_SHABLON.has(f.code)) x('QUR', 'yopiq quti shablon (7-savol)', true);
  if (NOM_SAVOL.has(f.code)) x('QUR', 'nomi tarkibiga mos emas (9-savol)', true);
  const fs = JSON.parse(JSON.stringify(f));
  applySexStandart(fs, std);
  const lim = (g, k) => (g['min_' + k] != null ? [g['min_' + k], g['max_' + k]] : [g[k], g[k]]);
  const [wa, wb] = lim(fs, 'w'), [da, db] = lim(fs, 'd'), [ha, hb] = lim(fs, 'h');
  for (const [w, d, h, nom] of [[f.w, f.d, f.h, 'sukut'], [wa, da, ha, 'eng kichik'], [wb, db, hb, 'eng katta']]) {
    const cl = cutlist(f, w, d, h, mats, {});
    for (const e of cl.errors) x('QUR', `${nom} ${w}×${d}×${h}: ${e.code} ${e.message}`);
    for (const p of cl.parts) {
      const a = Math.max(p.finish_length, p.finish_width), b = Math.min(p.finish_length, p.finish_width);
      if (f.category !== 'countertop' && (a > VARAQ.L || b > VARAQ.W)) x('QUR', `${nom} ${w}×${d}×${h}: ${p.code} ${a}×${b} varaqqa sig'maydi`);
      if (!(p.finish_length > 0 && p.finish_width > 0)) x('QUR', `${nom}: ${p.code} o'lchami 0`);
    }
    for (const p of f.parts) {
      if (!TORTMA_YON.test(p.code) && !TORTMA_YON.test(p.nom || '')) continue;
      const pp = cl.parts.find(q => q.code === p.code);
      if (pp && Math.max(pp.finish_length, pp.finish_width) > d - TORTMA_ZAZOR + 0.5) x('QUR', `${nom} d=${d}: ${p.code} ${Math.max(pp.finish_length, pp.finish_width)} > d − ${TORTMA_ZAZOR}`);
    }
  }
  const eN = /(\d)\s*eshik/i.exec(f.name || ''), tN = /(\d)\s*(?:tortma|chexol)/i.exec(f.name || '');
  if (eN && !/kupe/i.test(f.name) && eshikSoni(f) !== +eN[1] && !NOM_SAVOL.has(f.code)) x('QUR', `nomida ${eN[1]} eshik, detalda ${eshikSoni(f)}`);
  if (tN && !NOM_SAVOL.has(f.code)) {
    const tf = f.parts.filter(p => slotOf(p) === 'fasad' && /tortma|fasad_kichik|fasad_katta/i.test(p.code)).reduce((s, p) => s + (+p.qty || 1), 0);
    if (tf !== +tN[1]) x('QUR', `nomida ${tN[1]} tortma, fasad ${tf}`);
  }
  /* OLCHAM */
  const tur = sexTuri(f);
  if (tur && !f.standart) x('OLCHAM', `sex turi ${tur}: 'standart' maydoni yo'q`);
  if (tur && f.standart && f.standart !== tur) x('OLCHAM', `standart ${f.standart}, qoida bo'yicha ${tur}`);
  if (tur) {
    const t = std.modullar[tur], dims = Array.isArray(f.standart_olchamlar) ? f.standart_olchamlar : ['w', 'd', 'h'];
    for (const k of ['w', 'd', 'h']) {
      if (!t[k]) continue;
      const out = (t[k].min != null && f[k] < t[k].min) || (t[k].max != null && f[k] > t[k].max);
      if (out) x('OLCHAM', `${k}=${f[k]} sex oralig'idan tashqari (${t[k].min}–${t[k].max}) — ${dims.includes(k) ? "standart qo'llanadi, sukut tashqarida" : 'standart_olchamlar dan chiqarilgan'}`, !dims.includes(k));
    }
  }
  if (qutimi(f)) x('OLCHAM', 'korpus 18 mm (sexda 16) — 8-savol', true);
  /* FURN */
  const QS = QUTI_SHABLON.has(f.code);                                                         // 7-savol: qayta chiziladi yoki yashiriladi
  const hw = f.hardware || [];
  const np = polkaSoni(f);
  if (np) {
    const pd = hw.filter(h => h.id === '90002019' || POLKADERJATEL.test((h.code || '') + ' ' + (h.name || ''))).reduce((s, h) => s + (+h.qty || 0), 0);
    if (pd < 4 * np) x('FURN', `polkaderjatel ${pd} < 4 × ${np} polka${QS ? ' (quti-shablon, 7-savol)' : ''}`, QS);
  }
  if (qutimi(f) && !hw.some(h => KONFIRMAT.test((h.code || '') + ' ' + (h.name || '')))) x('FURN', "konfirmat yo'q" + (QS ? ' (quti-shablon, 7-savol)' : ''), QS);
  if (/ustki|osma/i.test(f.group + ' ' + f.name) && f.h < 2030 && qutimi(f) && !hw.some(h => /NAVES/i.test(h.code))) x('FURN', "osma modulda naves yo'q (TZ-32 dan tashqari)", true);
  if (hw.some(h => h.code === 'TS-1730') && eshikSoni(f)) x('FURN', 'TS-1730 petlya sifatida (4-savol)', true);
  for (const h of hw) if (NARXSIZ_18.includes(h.code)) { x('FURN', `${h.code} narxsiz (5-savol)`, true); }
  /* KROMKA */
  if (!KROMKA_YOQ_TUR.has(f.category) && f.production === 'panel') {
    const cl = cutlist(f, f.w, f.d, f.h, mats, {});
    const sides = {};
    for (const e of cl.edges) (sides[e.code] = sides[e.code] || new Set()), e.sides.forEach(s => sides[e.code].add(s));
    for (const p of f.parts) {
      const s = sides[p.code] || new Set(), sl = slotOf(p);
      if (sl === 'orqa') continue;
      const qs = QS ? ' (quti-shablon, 7-savol)' : '';
      if (sl === 'fasad') { if (!['F', 'B', 'L', 'R'].every(k => s.has(k))) x('KROMKA', `${p.code} (fasad): ${[...s].join('') || '—'}, 4 tomon kerak${qs}`, QS); continue; }
      if (!s.has('F')) x('KROMKA', `${p.code}: old qirra (F) kromkasiz${qs}`, QS);
      if (s.has('B') && !BUTUN_KROMKA.test(p.code)) x('KROMKA', `${p.code}: orqa qirrada (B) ortiqcha kromka${qs}`, QS);
    }
    if (YANGI16(f)) {
      if ((f.edge || []).length) x('KROMKA', "yangi modul: fragment darajasidagi edge[] (slot formati kerak)");
      for (const p of f.parts) {
        if (!p.edge) continue;
        const v = typeof p.edge === 'string' ? [p.edge.replace(/^hammasi:/, '')] : Object.values(p.edge);
        const kut = slotOf(p) === 'fasad' ? 'kromka_fasad' : 'kromka_korpus';
        if (v.some(s => s !== kut) && !(BUTUN_KROMKA.test(p.code) && v.every(s => s === 'kromka_fasad'))) x('KROMKA', `${p.code}: kromka slot ${v.join(',')} (kerak ${kut})`);
      }
    }
  }
  /* PETLYA (B6, qat'iy): eski qo'lda yozilgan 'hinge' yo'q; har ochiladigan eshikda D6 kosa — uchidan 105, qirradan 21,5, soni
   * petlyaSoni (d6.js), bir joyda bitta. TESHIK (hisobot): bir koordinatada qty > 1 (eski shablon teshiklari), teshiksiz korpus. */
  for (const hl of f.holes || []) if (hl.kind === 'hinge') x('PETLYA', `${hl.part}: eski petlya yozuvi @${hl.x},${hl.y} ×${hl.qty || 1}`);
  {
    const sliding = (f.hardware || []).some(h => /KUPE|SLID|RAIL|ROLIK/i.test(h.code || ''));
    const cl = cutlist(f, f.w, f.d, f.h, mats, {});
    for (const p of cl.parts) {
      if (sliding || p.slot !== 'fasad' || !/eshik|door/i.test(p.code) || /tortma|drawer|yashik|gorizontal/i.test(p.code)) continue;
      const H = p.finish_length, W = p.finish_width;
      if ((W > 650 && H > 1500) || H < 2 * D6.kosa.uch) continue;
      const k = cl.holes.filter(hl => hl.ref === p.ref && hl.kind === 'd6_kosa');
      const ded = (H - p.length) / 2;                                    // L/R kromka (kesim koordinatasi)
      const ys = k.map(hl => Math.round((hl.y + ded) * 10) / 10).sort((a, b) => a - b);
      const okJoy = k.length === petlyaSoni(H) && Math.abs(ys[0] - D6.kosa.uch) < 0.6 && Math.abs(ys[ys.length - 1] - (H - D6.kosa.uch)) < 0.6
        && new Set(k.map(hl => hl.x + ',' + hl.y)).size === k.length && k.every(hl => (hl.qty || 1) === 1);
      if (!okJoy) x('PETLYA', `${p.ref}: kosa ${k.length} ta (kerak ${petlyaSoni(H)}), y ${ys.join('/')} (kerak ${D6.kosa.uch} va H − ${D6.kosa.uch})`);
    }
  }
  if (qutimi(f) && !(f.holes || []).length && !(f.birikmalar || []).some(b => (b.teshiklar || []).length)) x('TESHIK', "korpus teshiklari yo'q (faqat petlya — D6)");
  for (const hl of f.holes || []) if ((+hl.qty || 1) > 1) x('TESHIK', `${hl.part} ${hl.kind} @${hl.x},${hl.y}: bir joyda ${hl.qty} ta`);
  return R;
}

/** narx aniqligi (%), sukut sozlama, katalog kartasi hisobi (areaEstimate) */
function aniqlik(f) {
  if (!(f.parts || []).length) return null;
  const cl = cutlist(f, f.w, f.d, f.h, mats, {});
  return productionCost([cl], mats, { areaEstimate: true, furnituraById: furnById, furnituraBoglash: furnBoglash }).aniqlik.pct;
}

/* ── ishga tushirish ── */
const SP = frags.filter(f => /^SP-/.test(f.code));
const natija = SP.map(f => ({ code: f.code, r: tekshir(f), pct: aniqlik(f) }));
const TURLAR = ['QUR', 'OLCHAM', 'FURN', 'KROMKA', 'PETLYA', 'TESHIK'];
/* qat'iy turlar — tuzatilganlar (TZ-32 B1–B6); TESHIK (eski shablon teshiklari joyi) — hisobot, manba kelguncha */
const QATIY = new Set(['QUR', 'OLCHAM', 'FURN', 'KROMKA', 'PETLYA']);

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; if (!STAT) console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

if (STAT) {
  console.log('modul'.padEnd(11) + TURLAR.map(t => t.padEnd(8)).join('') + 'aniqlik');
  for (const n of natija) console.log(n.code.padEnd(11) + TURLAR.map(t => { const a = n.r[t].filter(z => !z.k).length, b = n.r[t].filter(z => z.k).length; return (a ? String(a) : '·') + (b ? '+' + b + 'k' : ''); }).map(s => s.padEnd(8)).join('') + (n.pct == null ? '—' : n.pct + '%'));
  for (const t of TURLAR) for (const n of natija) for (const z of n.r[t].filter(z => !z.k)) console.log(`  ${t} ${n.code}: ${z.m}`);
}
const toza = natija.filter(n => TURLAR.every(t => !n.r[t].some(z => !z.k))).length;
const tozaK = natija.filter(n => TURLAR.every(t => !n.r[t].length)).length;
const pcts = natija.map(n => n.pct).filter(v => v != null).sort((a, b) => a - b);
const med = pcts.length ? (pcts.length % 2 ? pcts[(pcts.length - 1) / 2] : (pcts[pcts.length / 2 - 1] + pcts[pcts.length / 2]) / 2) : null;
console.log(`\nStatistika: ${SP.length} modul; toza (kutilmoqda hisobga olinmasa) ${toza}, to'liq toza ${tozaK}; narx aniqligi eng yuqori ${pcts[pcts.length - 1]}%, mediana ${med}%`);
for (const t of TURLAR) {
  const a = natija.filter(n => n.r[t].some(z => !z.k)).length, b = natija.filter(n => n.r[t].some(z => z.k)).length;
  console.log(`  ${t.padEnd(7)} kamchilik: ${String(a).padStart(2)} modul${b ? `; kutilmoqda: ${b} modul` : ''}`);
}

/* qat'iy tekshiruv */
ok('85 ta SP modul', SP.length === 85, SP.length);
for (const t of TURLAR) {
  const xato = natija.filter(n => n.r[t].some(z => !z.k));
  const msg = xato.slice(0, 4).map(n => n.code + ': ' + n.r[t].find(z => !z.k).m).join(' | ');
  if (QATIY.has(t)) ok(`${t}: kamchiliksiz (${SP.length - xato.length}/${SP.length})`, !xato.length, msg);
  else console.log(`  · ${t}: ${xato.length} modulda kamchilik (hisobot, yiqitmaydi — joy manbasi yo'q): ${msg}`);
}
/* kutilmoqda — egasi javobi (TZ-32 4-bo'lim), yiqitmaydi */
const kut = {};
for (const n of natija) for (const t of TURLAR) for (const z of n.r[t].filter(z => z.k)) {
  const k = /quti-shablon, 7-savol\)$/.test(z.m) ? `${t}: quti-shablon modul kamchiligi (7-savol)`
    : /narxsiz \(5-savol\)$/.test(z.m) ? 'narxsiz furnitura kodi (5-savol)'
    : /standart_olchamlar dan chiqarilgan$/.test(z.m) ? "sukut o'lchami sex oralig'idan tashqari — standart_olchamlar dan chiqarilgan (egasi/texnolog)" : z.m;
  (kut[k] = kut[k] || new Set()).add(n.code);
}
console.log('\nKutilmoqda (egasi javobi, yiqitmaydi):');
for (const [k, s] of Object.entries(kut)) console.log(`  - ${k}: ${s.size} modul${s.size <= 12 ? ' (' + [...s].join(', ') + ')' : ''}`);
console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
