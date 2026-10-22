/* Prisadka aniqligi: Bazis importidan JOYLASHUVI BILAN teshiklar (bazis/teshikJoy.js) → stanok modeli → KDT, sexning haqiqiy KDT fayllari bilan.
 *   Har doim (sintetik): evrovint geometriyasi (A — o'tuvchi Ø7, B — qirra Ø4,5 × 35), fragment.bazisJoy matn qatorlari (aylanish, himoya.js
 *     tekshiruvi), cutlist stanok_uchun teshiklari (NARXGA va holeCount ga kirmaydi — narx o'zgarmaydi), stanokModeli/KDT, ko'r teshiklar faqat
 *     2-yuzada bo'lsa ag'darish (faqat Bazis importi; D6/MC o'zgarmaydi), ERP prisadka soni qoidalari (МЕТКА = samorez + metka, ШКАНТ).
 *   Mahalliy ma'lumot bo'lsa (Smart3D_toplam_2026-10-16 — mijoz fayllari, gitda yo'q): 30 buyurtma .b3d → bizning KDT ↔ sexning haqiqiy KDT
 *     (scripts/prisadka_solishtir.mjs): umumiy va tur bo'yicha recall/precision pastga tushmasligi (chegaralar o'lchangan qiymatdan keyin qo'yilgan: 2026-10-22, recall 91,0%, precision 94,9%, aynan 85,2%).
 *     Paket yo'q bo'lsa — SKIP.
 * Ishlatish: node tests/verify_prisadka_real.mjs */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bazisLoyiha, materiallarniQosh } from '../app/js/engine/bazis/loyiha.js';
import { bazisTeshikJoy, joyQatorlar, joyOqi } from '../app/js/engine/bazis/teshikJoy.js';
import { bazisTeshiklar } from '../app/js/engine/bazis/teshik.js';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { stanokModeli } from '../app/js/engine/post/smart3d.js';
import { kdtFayllar, kdtOqi } from '../app/js/engine/post/kdt.js';
import { docXatosi } from '../server/himoya.js';
import { solishtir, paketTop } from '../scripts/prisadka_solishtir.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const mats0 = JSON.parse(readFileSync(join(ROOT, 'app/data/materials.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);
const J = JSON.stringify;

/* ── sintetik sahna: A — polka (700 × 450 × 16, yuzasi y = 0 da, normal pastga), B — yon devor (uchi A ning ostida), vint A ning yuzasida ── */
const kontur = (w, h) => [[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]].map(([a, b, c, d]) => ({ type: 'line', p1: [a, b], p2: [c, d] }));
const panel = (name, pos, oq, w, h, butts = []) => ({ modelCode: 4002, name, material: 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', thickness: 16, butts, contour_outer: kontur(w, h), tf: { pos, oq } });
const A = panel('pol', [0, 0, 0], [[1, 0, 0], [0, 0, 1], [0, -1, 0]], 700, 450);        // X = global X, Y = global Z, Z = −Y
const B = panel('bok', [16, -516, 0], [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], 450, 500);    // X = global Z, Y = global Y, Z = −X; y ∈ [−516, −16]
const vint = (x, z, name = 'Евро 51мм Алкан') => ({ modelCode: 3001, name, tf: { pos: [x, 0, z], oq: [[0, -1, 0], [1, 0, 0], [0, 0, 1]] } });
const panels = [A, B].map(o => ({ o, bb: { x0: 0, y0: 0, x1: o === A ? 700 : 450, y1: o === A ? 450 : 500 }, t: 16, ishlab: true }));

console.log('[1] Evrovint geometriyasi (bazis/teshikJoy.js)');
{
  const joy = bazisTeshikJoy([A, B, vint(8, 65)], panels);
  const a = joy.get(panels[0]) || [], b = joy.get(panels[1]) || [];
  ok('A (polka): o\'tuvchi Ø7 — yuzada (8, 65), Z=0 yuzadan', a.length === 1 && a[0].X === 8 && a[0].Y === 65 && a[0].d === 7 && a[0].dp === 16 && a[0].z0 === true && !a[0].edge, J(a));
  ok('B (yon devor): qirra teshigi Ø4,5 × 35 — uchki qirrada (F), 65 dan', b.length === 1 && b[0].edge === 'F' && b[0].X === 65 && b[0].Y === 500 && b[0].d === 4.5 && b[0].dp === 35, J(b));
  ok('X o\'qi teskari berilgan vint ham topiladi (ba\'zi guruhlarda shunday) — natija aynan bir xil', (() => {
    const t = vint(8, 65); t.tf.oq[0] = [0, 1, 0];
    const j2 = bazisTeshikJoy([A, B, t], panels);
    return J(j2.get(panels[0])) === J(a) && J(j2.get(panels[1])) === J(b);
  })());
  ok('sxemasiz/panelga tegmagan vint — teshik yo\'q (xato bermaydi)', bazisTeshikJoy([A, B, vint(2000, 65)], panels).size === 0);
}

console.log('\n[2] fragment.bazisJoy qatorlari');
{
  const fr = bazisLoyiha([A, B, vint(8, 65), vint(8, 385)], { fayl: 'sinov.b3d' }).fragment;
  ok('bazisJoy — matn qatorlari (har detal nusxasiga), faqat satrlar', Array.isArray(fr.bazisJoy) && fr.bazisJoy.length >= 2 && fr.bazisJoy.every(q => typeof q === 'string' && q.length < 2000), J(fr.bazisJoy));
  const hs = fr.bazisJoy.flatMap(joyOqi);
  ok('joyOqi: yuza (F1/F2) va qirra (T…) teshiklari, diametr/chuqurlik/tur', hs.some(h => h.side === 'F' && h.dia === 7 && h.kind === 'evrovint') && hs.some(h => h.side === 'T' && h.dia === 4.5 && h.depth === 35 && h.kind === 'evrovint_torets' && /^[FBLR]$/.test(h.torets)), J(hs.slice(0, 3)));
  ok('yaroqsiz qator o\'tkazib yuboriladi', joyOqi('xato').length === 0 && joyOqi('bz1#1|Q9,1,2').length === 0);
  const en = { bb: { x0: 0, y0: 0, x1: 700, y1: 450 } };
  const q = joyQatorlar('bz1#1', en, Array.from({ length: 400 }, (_, i) => ({ X: i, Y: 5, z0: true, edge: null, d: 7, dp: 16, kind: 'evrovint' })));
  ok('uzun ro\'yxat 2000 belgidan oshmaydigan qatorlarga bo\'linadi, hammasi qaytib o\'qiladi', q.length > 1 && q.every(x => x.length <= 2000) && q.flatMap(joyOqi).length === 400);
  const doc = { v: 1, bazis: { fragment: fr } };
  ok('loyiha hujjati server tekshiruvidan o\'tadi (himoya.js docXatosi)', docXatosi(doc) === null, String(docXatosi(doc)));
}

console.log('\n[3] cutlist → narx o\'zgarmaydi; stanok modeli; KDT');
{
  const rs = bazisLoyiha([A, B, vint(8, 65), vint(8, 385), { modelCode: 3001, name: 'metka samarezga', tf: { pos: [100, 0, 100], oq: [[0, -1, 0], [1, 0, 0], [0, 0, 1]] } }], { fayl: 'sinov.b3d', fittings: [], fasteners: [] });
  const mats = JSON.parse(JSON.stringify(mats0)); materiallarniQosh(mats, rs.materiallar);
  const fr = rs.fragment, fr0 = { ...fr }; delete fr0.bazisJoy;
  const cl = Object.assign(cutlist(fr, fr.w, fr.d, fr.h, mats, {}), { placementId: 'p1' }), cl0 = cutlist(fr0, fr.w, fr.d, fr.h, mats, {});
  const joyli = cl.holes.filter(h => h.stanok_uchun);
  ok('cutlist: joyli teshiklar bor, stanok_uchun belgili, qismi (part) va nusxasi (ref) ko\'rsatilgan', joyli.length >= 5 && joyli.every(h => h.part && h.ref && h.qty === 1), J(joyli.slice(0, 2)));
  ok('hole_count (statistika) joyli teshiklarsiz — o\'zgarmagan', cl.stats.hole_count === cl0.stats.hole_count, cl.stats.hole_count + ' ↔ ' + cl0.stats.hole_count);
  const pc = productionCost([cl], mats, { xizmatlar: { teshik: true } }), pc0 = productionCost([cl0], mats, { xizmatlar: { teshik: true } });
  ok('prisadka narxi (holeCost) va teshik qatorlari joyli teshiklar bilan/siz AYNAN bir xil', pc.holeCost === pc0.holeCost && J(pc.lines.filter(l => /^hole:/.test(l.code))) === J(pc0.lines.filter(l => /^hole:/.test(l.code))) && pc.breakdown.holeCount === pc0.breakdown.holeCount, pc.holeCost + ' ↔ ' + pc0.holeCost);
  const { model, ogoh } = stanokModeli({ cutlists: [cl], placements: [{ id: 'p1', qty: 1 }], catalog: { [fr.code]: fr }, materials: mats, nom: 'sinov' });
  const polka = model.detallar.find(d => d.dl === 700 || d.dw === 700);
  const tf = polka ? polka.xnc.flatMap(x => x.teshiklar) : [];
  ok('stanok modeli: polkada 2 ta o\'tuvchi Ø7 yuza teshigi (+ 1 belgi)', tf.filter(h => h.tur === 'f' && h.d === 7 && h.otuvchi).length === 2, J(tf));
  const bok = model.detallar.find(d => d.dl === 500 || d.dw === 500);
  ok('stanok modeli: yon devor uchida 2 ta qirra teshigi Ø4,5 × 35', !!bok && bok.xnc.flatMap(x => x.teshiklar).filter(h => h.tur !== 'f' && h.d === 4.5 && h.dp === 35).length === 2, J(bok && bok.xnc));
  ok('ogohlantirish: joyli teshiklar "SP shablon" deb sanalmaydi', ogoh.spTeshik === 0, String(ogoh.spTeshik));
  const f = kdtFayllar({ kod: polka.kod, nom: polka.nom, dl: polka.dl, dw: polka.dw, t: polka.t, kromka: { t: 0, b: 0, l: 0, r: 0 } }, polka.xnc).map(x => kdtOqi(x.matn));
  ok('KDT: polka faylida 2 ta Ø7 o\'tuvchi (chuqurlik 16,5)', f.length >= 1 && f[0].teshiklar.filter(h => h.tur === 1 && h.d === 7 && h.dp === 16.5).length === 2, J(f[0] && f[0].teshiklar));
  ok('metka samarezga — Ø3 × 3 belgi yuzada', cl.holes.some(h => h.stanok_uchun && h.kind === 'd6_belgi' && h.dia === 3 && h.depth === 3));
}

console.log('\n[4] ko\'r teshiklar faqat 2-yuzada: Bazis importida panel ag\'dariladi; qo\'lda/D6 — o\'zgarmaydi');
{
  const mk = (stanok) => {
    const hl = (y) => ({ fragment: 'F', part: 'a', ref: 'a#1', side: 'F', yuza: 2, x: 30, y, dia: 5, depth: 9, kind: 'd6_polka', qty: 1, nusxa: 1, ...(stanok ? { stanok_uchun: true } : {}) });
    const cl = { fragment: 'F', placementId: 'p', parts: [{ code: 'a', ref: 'a#1', length: 700, width: 400, finish_length: 700, finish_width: 400, thickness: 16, material: 'LDSP16', texture: 'uzunlik' }],
      edges: [{ code: 'a', sides: ['L'], material: 'K1', thickness: 1 }], holes: [hl(100), hl(250)] };
    return stanokModeli({ cutlists: [cl], placements: [{ id: 'p', qty: 1 }], catalog: { F: { parts: [{ code: 'a', nom: 'a' }] } }, materials: mats0, nom: 'x' }).model.detallar[0];
  };
  const bz = mk(true), d6 = mk(false);
  ok('Bazis importi: ko\'r teshiklar 1-yuzada, x = dl − x (mirror), kromka chap ↔ o\'ng', bz.xnc.length === 1 && bz.xnc[0].side === 1 && J(bz.xnc[0].teshiklar.map(h => h.x).sort((a, b) => a - b)) === J([449, 599]) && bz.xnc[0].teshiklar.every(h => h.y === 370) && !!bz.kromka.r && !bz.kromka.l, J([bz.xnc, bz.kromka]));
  ok('D6/MC (stanok_uchun emas): 2-yuza saqlanadi (o\'zgarmagan)', d6.xnc.length === 1 && d6.xnc[0].side === 2 && !!d6.kromka.l, J([d6.xnc.map(x => x.side), d6.kromka]));
}

console.log('\n[5] ERP prisadka soni qoidalari (narx — teshik.js; 14 haqiqiy ERP buyurtmasi bilan aynan)');
{
  const L = (name, n, modelCode = 3001) => Array.from({ length: n }, () => ({ modelCode, name }));
  const t = bazisTeshiklar([...L('samorez 16 mm', 6), ...L('Саморез с потайной головкой под крестUS3,5 x 16 KB76', 6), ...L('metka samarezga', 18), ...L('Петля прямая', 10), ...L('Шкант 8х30404', 6), ...L('6x10', 4), ...L('7x12', 2), ...L('Евро 51мм Алкан', 17), ...L('7', 13), ...L('15х13', 42), ...L('Стяжка Minifix EC02/16/TE03', 4)]);
  const g = (tur) => t.find(x => x.tur === tur) || {};
  ok('МЕТКА narx soni = samorez + саморез + metka obyektlari (6 + 6 + 18 = 30); petlya belgilari (4 × 10) jismoniy sonda, narxda emas', g('belgi').narxQty === 30 && g('belgi').qty === 30 + 40, J(g('belgi')));
  ok('ШКАНТ narx soni = shkant + 6x10 + 7x12 obyektlari (1 dona) = 12; jismoniy teshik 2 × shkant + pin', g('shkant').narxQty === 12 && g('shkant').qty === 6 * 2 + 6, J(g('shkant')));
  ok('nomi o\'lcham obyektlar: "7" — ЕВРО (17 + 13 = 30), "15х13" — ЭКСЕРТРИК (42 + 4 = 46)', g('konfirmat_yuza').narxQty === 30 && g('eksentrik').qty === 46, J([g('konfirmat_yuza'), g('eksentrik')]));
  ok('ЕВРО jismoniy: har mahkamlagich = 1 yuza + 1 qirra teshigi (1,0; oldin 0,81 / 0,70)', g('konfirmat_yuza').qty === 30 && g('konfirmat_qirra').qty === 30);
}

console.log('\n[6] 30 ta haqiqiy buyurtma: bizning KDT ↔ sexning KDT');
const top = paketTop();
if (!top) skip('Smart3D_toplam_2026-10-16 yo\'q (SMART3D_TOPLAM=… bilan ko\'rsating)');
else {
  const S = solishtir();
  const J0 = S.umumiy.jami, T = S.umumiy.tur;
  const rec = (a, b) => (b > 0 ? a / b : 1), pct = (v) => (100 * v).toFixed(1) + '%';
  console.log(`    haqiqiy ${J0.haq} · bizniki ${J0.biz} · MOS ${J0.tp} (recall ${pct(rec(J0.tp, J0.haq))}, precision ${pct(rec(J0.tp, J0.biz))}); aynan (o'zi/180°) ${pct(rec(J0.aynan, J0.haq))}`);
  ok('30 buyurtmaning hammasi o\'qildi (b3d + KDT)', S.buyurtmalar.length >= 30 && S.buyurtmalar.every(b => !b.xato), J(S.buyurtmalar.filter(b => b.xato)));
  ok('haqiqiy teshik soni ≥ 15 000 (ma\'lumot to\'g\'ri o\'qildi)', J0.haq >= 15000, String(J0.haq));
  /* chegaralar — o'lchangan qiymatdan keyin (2026-10-22): recall 91,0%, precision 94,9%, aynan 85,2% */
  ok(`umumiy recall (jismoniy mos) ≥ 90% — ${pct(rec(J0.tp, J0.haq))}`, rec(J0.tp, J0.haq) >= 0.90);
  ok(`umumiy precision ≥ 94% — ${pct(rec(J0.tp, J0.biz))}`, rec(J0.tp, J0.biz) >= 0.94);
  ok(`aynan mos (o'zi yoki 180° burilgan) recall ≥ 84% — ${pct(rec(J0.aynan, J0.haq))}`, rec(J0.aynan, J0.haq) >= 0.84);
  const MIN = { konf_yuza: [0.95, 0.98], konf_qirra: [0.95, 0.97], kosa: [0.84, 0.85], belgi: [0.86, 0.88], polka: [0.86, 0.92], ruchka: [0.85, 0.96], eks15: [0.80, 0.93], eks_qirra: [0.85, 0.90], boshqa: [0.95, 0.95] };
  for (const [k, [r, p]] of Object.entries(MIN)) {
    const x = T[k];
    ok(`${k}: recall ≥ ${Math.round(r * 100)}% / precision ≥ ${Math.round(p * 100)}% — ${pct(rec(x.tp, x.haq))} / ${pct(rec(x.tp, x.biz))}`, rec(x.tp, x.haq) >= r && rec(x.tp, x.biz) >= p);
  }
  ok('teshiklarning jismoniy mos kelmagan "joyi bir, o\'lchami boshqa" soni ≤ 150 (diametr/chuqurlik qoidalari buzilmagan)', J0.farq <= 150, String(J0.farq));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
