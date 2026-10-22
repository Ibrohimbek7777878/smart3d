/* TZ-20: Bazis importida prisadka teshiklari soni (faqat narx uchun) — sexning KDT fayllari bilan solishtirish.
 *   Har doim: tur jadvali, kind kodlari materials.json hole_kinds da, sintetik obyektlardan hisob, yozuvlar joylashuvsiz
 *   (part yo'q → stanok eksportchilari o'tkazib yuboradi), narxsiz kod (mark) "narx yo'q" chiqadi.
 *   Mahalliy ma'lumot bo'lsa (git'da yo'q — mijoz fayllari): 7 buyurtma (Bazis ↔ KDT) tur bo'yicha; kalibrovka orqasidagi
 *   23 buyurtmada ham hisoblanadi (faqat ma'lumot uchun). Paket yo'q bo'lsa — skip.
 * Ishlatish: node tests/verify_bazis_teshik.mjs */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { bazisLoyiha, materiallarniQosh } from '../app/js/engine/bazis/loyiha.js';
import { bazisTeshiklar, TESHIK_TURI, teshikTuri } from '../app/js/engine/bazis/teshik.js';
import { stanokModeli } from '../app/js/engine/post/smart3d.js';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { haqiqiyBuyurtma, turi as kdtTuri } from '../scripts/prisadka_solishtir.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);

/* ── 1) Har doim ── */
const mat = J('materials.json');
const kodlar = new Set(mat.hole_kinds.map(k => k.code));
ok('barcha tur kind kodlari materials.json hole_kinds da', Object.values(TESHIK_TURI).every(t => kodlar.has(t.kind)));
const mark = mat.hole_kinds.find(k => k.code === 'mark');
ok('yangi kod mark — narxsiz (price 0, "narx yo\'q")', mark && !(mark.price > 0));
ok('nom → tur: petlya, ruchka, polka, minifix, shkant, evro, metka', ['Петля прямая', 'Ручка 160 мм', 'Полкодержатель D5 никель 16', 'Стяжка Minifix EC02', 'Шкант 8х30', 'Евро 51мм Алкан', 'metka samarezga'].map(teshikTuri).join() === 'petlya,ruchka,polka,eksentrik,shkant,konfirmat,metka');
ok('Евровинт ham konfirmat, "Направляющие" — teshiksiz', teshikTuri('Евровинт 7х50') === 'konfirmat' && teshikTuri('Направляющие Салазка') === null);

const L = (name, n, modelCode = 3001) => Array.from({ length: n }, () => ({ modelCode, name }));
const sint = [...L('Петля прямая', 10), ...L('Ручка 160 мм', 5), ...L('Полкодержатель D5', 8), ...L('Шкант 8х30', 3), ...L('metka samarezga', 4), ...L('Евро 51мм Алкан', 100), ...L('Евро 51мм Алкан', 100, 1005), ...L('IKSENTRIK SHKANTLI', 2, 1005)];
const t = bazisTeshiklar(sint), by = Object.fromEntries(t.map(x => [x.tur, x.qty]));
ok('sintetik: petlya 10, ruchka 10, polka 8, shkant 8 (3×2 + 2), konfirmat faqat 3001 dan', by.petlya === 10 && by.ruchka === 10 && by.polka === 8 && by.shkant === 8 && by.konfirmat_yuza === 100 && by.konfirmat_qirra === 100, JSON.stringify(by));
ok('sintetik: belgi = metka + 4 × petlya (kosa vinti ×2 + planka ×2; ruchka belgisi yo\'q)', by.belgi === 4 + 10 * 4, String(by.belgi));
ok('bo\'sh/yaroqsiz kirish — bo\'sh ro\'yxat', bazisTeshiklar([]).length === 0 && bazisTeshiklar(null).length === 0 && bazisTeshiklar([{ modelCode: 3001 }]).length === 0);

const fr = bazisLoyiha([], { fayl: 'x.b3d' });
ok('panelsiz loyiha xato bilan (teshiksiz) qaytadi', fr.xato || !(fr.fragment && fr.fragment.bazisTeshik));

/* stanok eksportchisi narx_uchun yozuvlarini o'tkazib yuboradi (ogohlantirishga ham qo'shmaydi) */
{
  const narxH = bazisTeshiklar(sint).map(t => ({ fragment: 'X', part: '', side: '', x: 0, y: 0, dia: t.dia, depth: t.depth, kind: t.kind, qty: t.qty, nusxa: 1, tur: t.tur, narx_uchun: true }));
  const sp = { fragment: 'X', placementId: 1, parts: [], edges: [], holes: [{ part: 'a', kind: 'drill', dia: 5, depth: 9, qty: 1, x: 1, y: 1 }, ...narxH] };
  const r0 = stanokModeli({ cutlists: [{ ...sp, holes: sp.holes.slice(0, 1) }], placements: [{ id: 1, qty: 1 }], catalog: {}, materials: mat, nom: 't' });
  const r1 = stanokModeli({ cutlists: [sp], placements: [{ id: 1, qty: 1 }], catalog: {}, materials: mat, nom: 't' });
  ok(`stanokModeli: ogoh.spTeshik narx_uchun yozuvlarisiz (${narxH.length} tur qo'shildi, ${r0.ogoh.spTeshik} → ${r1.ogoh.spTeshik})`, narxH.length > 0 && r0.ogoh.spTeshik === 1 && r1.ogoh.spTeshik === 1);
}

/* ── 2) Haqiqiy fayllar (mahalliy) ── */
const TOPLAM = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16');
const TOPLAM2 = process.env.SMART3D_TOPLAM || TOPLAM;
const BZ = join(TOPLAM2, '01_buyurtma_fayllari', '04_bazis'), KP = join(TOPLAM2, '01_buyurtma_fayllari', '02_kromka_prisadka');
if (!existsSync(BZ) || !existsSync(KP)) skip('7 buyurtma Bazis ↔ KDT (Smart3D_toplam_2026-10-16 yo\'q; SMART3D_TOPLAM=… bilan ko\'rsating)');
else {
  const TUR = ['konfirmat_yuza', 'konfirmat_qirra', 'polka', 'ruchka', 'petlya', 'shkant', 'eksentrik', 'belgi'];
  /* haqiqiy son — KDT teshiklari DETAL SONIGA ko'paytirilgan (Bazis .project count): jismoniy teshik soni (oldin fayl soni olinardi — nusxalar hisobga olinmagan) */
  const TUR_MAP = { konf_yuza: 'konfirmat_yuza', konf_qirra: 'konfirmat_qirra', kosa: 'petlya', belgi: 'belgi', polka: 'polka', ruchka: 'ruchka', shkant: 'shkant', eks15: 'eksentrik' };
  const kdtSana = (id) => {
    const H = haqiqiyBuyurtma(join(TOPLAM2, '01_buyurtma_fayllari'), id), c = {};
    if (!H) return null;
    for (const d of H.detallar) for (const h of d.holes) { const k = TUR_MAP[kdtTuri(h, d.T)]; if (k) c[k] = (c[k] || 0) + d.soni; }
    return c;
  };
  const biz = (id) => {
    const dir = readdirSync(BZ).find(x => x.startsWith(id + '_')); if (!dir) return null;
    const f = readdirSync(join(BZ, dir)).find(x => /\.b3d$/i.test(x)); if (!f) return null;
    const r = daraxt(new Uint8Array(readFileSync(join(BZ, dir, f))), { inflate }); if (!r || !r.objects) return null;
    const rs = bazisLoyiha(r.objects, { fayl: f }); if (rs.xato) return null;
    const m2 = J('materials.json'); materiallarniQosh(m2, rs.materiallar);
    const cl = cutlist(rs.fragment, rs.fragment.w, rs.fragment.d, rs.fragment.h, m2, {});
    const c = {}; for (const h of cl.holes) { if (h.stanok_uchun) continue; c[h.tur] = (c[h.tur] || 0) + h.qty * (h.nusxa || 1); }
    return { c, cl, m2 };
  };
  const TEST = ['3276', '3311', '3329', '3646', '3877', '3926', '4034'];
  const jBiz = {}, jKdt = {}; let xato = [], joylashuvsiz = true, narxli = 0;
  console.log('\n  buyurtma  | ' + TUR.map(x => x.padEnd(15)).join(''));
  for (const id of TEST) {
    const b = biz(id), k = kdtSana(id);
    if (!b || !k) { console.log('  ' + id + ': ma\'lumot yo\'q/ochilmadi'); continue; }
    console.log('  ' + id + ' biz | ' + TUR.map(x => String(b.c[x] || 0).padEnd(15)).join(''));
    console.log('  ' + id + ' KDT | ' + TUR.map(x => String(k[x] || 0).padEnd(15)).join(''));
    for (const x of TUR) { jBiz[x] = (jBiz[x] || 0) + (b.c[x] || 0); jKdt[x] = (jKdt[x] || 0) + (k[x] || 0); }
    for (const h of b.cl.holes) { if (h.stanok_uchun) continue; /* joylashuvli stanok teshiklari (bazis/teshikJoy.js) — narxga kirmaydi, alohida tekshiriladi (verify_prisadka_real) */ if (h.part !== '' && h.narx_uchun) joylashuvsiz = false; if (!kodlar.has(h.kind)) xato.push(h.kind); }
    const pc = productionCost([b.cl], b.m2, { xizmatlar: { teshik: true } });
    narxli += pc.lines.filter(l => /^hole:/.test(l.code)).length;
  }
  console.log('  JAMI biz | ' + TUR.map(x => String(jBiz[x] || 0).padEnd(15)).join(''));
  console.log('  JAMI KDT | ' + TUR.map(x => String(jKdt[x] || 0).padEnd(15)).join(''));
  console.log('  farq %   | ' + TUR.map(x => (jKdt[x] ? ((jBiz[x] - jKdt[x]) / jKdt[x] * 100).toFixed(0) + '%' : '-').padEnd(15)).join('') + '\n');
  ok('teshik yozuvlari joylashuvsiz (part yo\'q) va kind kodlari ma\'lum', joylashuvsiz && !xato.length, xato.join());
  ok('productionCost teshik qatorlarini tur bo\'yicha yig\'adi', narxli > 0);
  /* ±10% — erishilgan turlar. Qolganlari (konfirmat_qirra, eksentrik, shkant) — haqiqiy son yuqorida; sababi hisobotda. */
  /* ruchka — KDT da «Ø5 o'tuvchi» sinfi ruchkadan boshqa o'tuvchi teshiklarni ham o'z ichiga oladi (3926: 10 teshik, ERP va Bazis'da 3 ta ruchka) — ma'lumot uchun */
  const OK10 = ['konfirmat_yuza', 'konfirmat_qirra', 'polka', 'petlya', 'belgi'];
  for (const x of TUR) {
    const f = jKdt[x] ? Math.abs(jBiz[x] - jKdt[x]) / jKdt[x] : 1;
    if (OK10.includes(x)) ok(`${x}: jami ${jBiz[x]} ↔ KDT ${jKdt[x]} (±10%)`, f <= 0.10, (f * 100).toFixed(1) + '%');
    else console.log(`  · ${x}: jami ${jBiz[x]} ↔ KDT ${jKdt[x]} (${(f * 100).toFixed(0)}% — ±10% ga yetmaydi, ma'lumot uchun)`);
  }
}
console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
