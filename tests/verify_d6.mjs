/* D6 (engine/d6.js, egasi #136): petlya kosasi va vintlari, planka, polka ushlagich, ruchka — sex fayllaridan olingan qiymatlar.
 * Tekshiriladi: MC-KP-02 da aniq joylar (kosa 105/21,5, planka 37 va ±16 kosa balandligida, ushlagich polka ostidan 2,5 mm,
 * 65/45, ruchka 160 — 40 va 50); chap va o'ng yon devor — qarama-qarshi yuza; 38 MC modulida teshik detaldan chiqmaydi va
 * soni Bazis (manba.teshik.kutilmoqda) bilan: polka ushlagich va ruchka — aynan, petlya — 32 modulda aynan; konfirmatli polkaga
 * ushlagich yo'q; kupe eshik — teshiksiz; qo'lda chizilgan shkaf: chap/o'ng yon devor alohida detal; stanok modeli: 2-yuza
 * (XNC side 2), .project aylanishi, KDT fayllari; prisadka narxi (kosa — "hinge" stavkasi); BPJ — har nusxa o'z teshigi bilan. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { D6, petlyaSoni, d6Teshiklar } = await import('../app/js/engine/d6.js');
const { cutlist, productionCost } = await import('../app/js/engine/cutlist.js');
const C = await import('../app/js/engine/chizish.js');
const { stanokModeli } = await import('../app/js/engine/post/smart3d.js');
const { projectYoz, projectOqi } = await import('../app/js/engine/post/project.js');
const { kdtFayllar, kdtOqi } = await import('../app/js/engine/post/kdt.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const M = H.materials, S = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16', orqa: 'HDF3' };
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;

/* 1) qiymatlar — sex fayllaridan */
ok('D6: kosa Ø35×13, 105 / 21,5; vint Ø3×2, ±24, +6; planka Ø3×3, 37, 32; ushlagich Ø5×9, 65/45, polka ostidan 2,5; ruchka Ø5, 160, 40/50',
  J(D6) === J({ kosa: { d: 35, dp: 13, uch: 105, chet: 21.5 }, kosaVint: { d: 3, dp: 2, oraliq: 24, ichkari: 6 }, planka: { d: 3, dp: 3, old: 37, oraliq: 32 },
    polka: { d: 5, dp: 9, old: 65, orqa: 45, past: 2.5, minChuq: 140 }, ruchka: { d: 5, chet: 40, uch: 50, oraliq: 160 } }));
ok('petlya soni (sex fayllaridan): ≤1000 — 2, ≤1600 — 3, ≤2000 — 4, undan katta — 5', [1000, 1001, 1600, 1601, 2000, 2001].map(petlyaSoni).join() === '2,3,3,4,4,5');

/* 2) MC-KP-02 (600×450×708, 2 eshik, 1 polka, ruchka 160) — aniq joylar (kesim detalida: fasad kromkasi 2 mm ayirilgan) */
const f2 = H.catalog['MC-KP-02'], c2 = cutlist(f2, 600, 450, 708, M, { projectSlots: S });
const tx = (ref, kind) => c2.holes.filter(h => h.ref === ref && h.kind === kind).map(h => [h.yuza, h.x, h.y].join(',')).sort();
ok('eshik (chap): kosa 1-yuzada, uchidan 105 va qirradan 21,5 (kromka 2 mm ayirilgan: 103 / 19,5)', J(tx('dver#1', 'd6_kosa')) === J(['1,19.5,103', '1,19.5,597']), J(tx('dver#1', 'd6_kosa')));
ok('kosa vintlari ±24, 6 mm ichkarida', J(tx('dver#1', 'd6_vint')) === J(['1,25.5,127', '1,25.5,573', '1,25.5,621', '1,25.5,79']), J(tx('dver#1', 'd6_vint')));
ok('eshik (o\'ng): kosa qarama-qarshi qirrada', J(tx('dver#2', 'd6_kosa')) === J(['1,274.5,103', '1,274.5,597']), J(tx('dver#2', 'd6_kosa')));
ok('ruchka: 160 oraliq, ochiladigan qirradan 40, yaqin teshigi tepadan 50, o\'tuvchi', J(tx('dver#1', 'd6_ruchka')) === J(['1,256,492', '1,256,652'])
  && c2.holes.filter(h => h.kind === 'd6_ruchka').every(h => h.depth === 16), J(tx('dver#1', 'd6_ruchka')));
ok('planka: yon devorda, old qirradan 37, kosa balandligida ±16 (sexdagi yon devorda ham 74/106)', J(tx('bok#1', 'd6_planka')) === J(['2,37,106', '2,37,568', '2,37,600', '2,37,74']), J(tx('bok#1', 'd6_planka')));
ok('polka ushlagich: polka ostidan 2,5 mm (346 − 2,5 − 16 = 327,5), old 65, orqa 45', J(tx('bok#1', 'd6_polka')) === J(['2,405,327.5', '2,65,327.5']), J(tx('bok#1', 'd6_polka')));
ok('chap va o\'ng yon devor — qarama-qarshi yuza (ichki tomon), joylari bir xil', J(tx('bok#2', 'd6_polka')) === J(['1,405,327.5', '1,65,327.5']) && J(tx('bok#2', 'd6_planka')) === J(['1,37,106', '1,37,568', '1,37,600', '1,37,74']));

/* 3) 38 MC moduli — Bazis asl o'lchamida: teshik detal ichida, soni Bazis bilan */
let ichida = true, mos = 0;
const jami = { kosa: [0, 0], polka: [0, 0], ruchka: [0, 0] };
for (const f of Object.values(H.catalog).filter(x => /^MC-/.test(x.code))) {
  const o = (f.manba || {}).joy_olcham || [f.w, f.d, f.h], cl = cutlist(f, o[0], o[1], o[2], M, { projectSlots: S });
  const P = Object.fromEntries(cl.parts.map(p => [p.ref, p]));
  for (const h of cl.holes.filter(h => /^d6_/.test(h.kind))) {
    const ps = h.ref ? [P[h.ref]] : cl.parts.filter(p => p.code === h.part);
    if (ps.some(p => !p || h.x < 0 || h.y < 0 || h.x > p.width + 0.5 || h.y > p.length + 0.5)) ichida = false;
  }
  const kut = { kosa: 0, polka: 0, ruchka: 0 };
  for (const s of ((f.manba || {}).teshik || {}).kutilmoqda || []) {
    const m = /^(.*?) — (\d+) ta/.exec(s); if (!m) continue;
    const n = m[1].toLowerCase();
    if (/petl|петл/.test(n)) kut.kosa += +m[2]; else if (/polk|полк/.test(n)) kut.polka += +m[2]; else if (/ruchk|ручк/.test(n)) kut.ruchka += +m[2];
  }
  const bor = { kosa: cl.holes.filter(h => h.kind === 'd6_kosa').length, polka: cl.holes.filter(h => h.kind === 'd6_polka').length, ruchka: cl.holes.filter(h => h.kind === 'd6_ruchka').length / 2 };
  for (const k of Object.keys(jami)) { jami[k][0] += Math.min(bor[k], kut[k]); jami[k][1] += kut[k]; }
  if (bor.kosa === kut.kosa && bor.polka === kut.polka && bor.ruchka === kut.ruchka) mos++;
}
ok('38 MC moduli: har D6 teshigi o\'z detali ichida', ichida);
ok(`Bazis bilan: polka ushlagich ${jami.polka.join('/')} va ruchka ${jami.ruchka.join('/')} — aynan; petlya ${jami.kosa.join('/')}; ${mos}/38 modul to'liq mos`,
  jami.polka[0] === jami.polka[1] && jami.ruchka[0] === jami.ruchka[1] && jami.kosa[0] >= jami.kosa[1] - 10 && mos >= 32, J(jami) + ' ' + mos);
{
  const f = H.catalog['MC-SH-05'], o = f.manba.joy_olcham, cl = cutlist(f, o[0], o[1], o[2], M, { projectSlots: S });
  ok('MC-SH-05: kupe eshiklar (937×2073) teshiksiz, tepadagi kichik eshiklarda 2 tadan (Bazis: 4)', cl.holes.filter(h => h.kind === 'd6_kosa').length === 4);
  ok('konfirmat bilan qotirilgan polkaga ushlagich qo\'yilmaydi (MC-SH-05: Bazis — 0)', cl.holes.filter(h => h.kind === 'd6_polka').length === 0);
}

/* 4) qo'lda chizilgan shkaf (2 bo'lim, 2 eshik, 2200) */
{
  const ch = C.yangiChizma('shkaf'), fr = C.chizmaKatalog(ch, 'CH-D6', 'Shkaf'), cl = cutlist(fr, fr.w, fr.d, fr.h, M, { projectSlots: S });
  const yon = cl.parts.filter(p => /^yon/.test(p.code)).map(p => p.code);
  const yuz = (code, kind) => [...new Set(cl.holes.filter(h => h.part === code && h.kind === kind).map(h => h.yuza))];
  ok('chap va o\'ng yon devor — alohida detal (teshiklari ko\'zgu)', yon.length === 2 && yon[0] !== yon[1] && J(yuz(yon[0], 'd6_planka')) !== J(yuz(yon[1], 'd6_planka')), J(yon));
  const H5 = cl.holes.filter(h => h.kind === 'd6_kosa').length;
  ok('eshik 2116 mm — 5 tadan petlya (sex: 2000 dan baland — 5), plankasi ham', H5 === 10 && cl.holes.filter(h => h.kind === 'd6_planka').length === 20, H5);
  ok('bo\'lgich — ikki yuzasida polka ushlagich (chapda 1 polka, o\'ngda 4)', J(yuz('bolgich', 'd6_polka').sort()) === J([1, 2]));
  const kupe = d6Teshiklar([{ o: 'Z', rol: 'eshik', petlya: 'min', lo: { X: 0, Y: 0, Z: 600 }, hi: { X: 700, Y: 1900, Z: 616 } }], { ruchka: 160 });
  ok('kupe eshik (700×1900) — teshik yo\'q', kupe[0].length === 0);
}

/* 5) stanok modeli: 2-yuza, .project aylanishi, KDT */
{
  const doc = { v: 1, room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
    placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708, rot: 0, qty: 1 }] };
  const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16', polkaCode: 'LDSP16' });
  const { model } = stanokModeli({ cutlists: r.cutlists, placements: doc.placements, catalog: H.catalog, materials: H.materials, nom: 'D6' });
  const bok = model.detallar.filter(d => d.nom === 'bok');
  ok('stanok modeli: yon devorlar — 2 ta alohida detal (biri 1-yuza, biri 2-yuza ko\'r teshiklari bilan)', bok.length === 2 && bok.every(d => d.soni === 1)
    && J(bok.map(d => d.xnc.map(x => x.side).join('+')).sort()) === J(['1', '1+2']), J(bok.map(d => d.xnc.map(x => x.side))));
  const eshik = model.detallar.find(d => /Дверь|dver/i.test(d.nom));
  const ft = eshik && eshik.xnc[0] ? eshik.xnc[0].teshiklar : [];
  ok('eshik: kosa Ø35 (13) va ruchka Ø5 o\'tuvchi — 1-yuzada (sexdagidek)', eshik && eshik.xnc.length === 1 && ft.filter(h => h.d === 35 && h.dp === 13).length === 2 && ft.filter(h => h.d === 5 && h.otuvchi).length === 2, J(ft));
  const P = projectOqi(projectYoz(model)), b2 = P.detallar.find(d => d.nom === 'bok' && d.xnc.some(x => x.side === 2));
  ok('.project: yozib o\'qilganda 2-yuza XNC saqlanadi', b2 && b2.xnc.find(x => x.side === 2).teshiklar.filter(h => h.d === 5 && h.dp === 9).length === 2, J(b2 && b2.xnc.map(x => x.side)));
  const kd = bok.find(d => d.xnc.some(x => x.side === 2)), kf = kdtFayllar({ ...kd, kromka: { t: 0, b: 1, l: 0, r: 0 } }, kd.xnc);
  const k2 = kf.length === 2 ? kdtOqi(kf[1].matn) : null;
  ok('KDT: 2-yuza ko\'r teshiklari alohida faylda (_2): ushlagich Ø5×9, planka Ø3×3', kf.length === 2 && /_2\.XML$/.test(kf[1].nom) && k2.teshiklar.filter(h => h.d === 5 && h.dp === 9).length === 2 && k2.teshiklar.filter(h => h.d === 3 && h.dp === 3).length === 4, J(kf.map(x => x.nom)));
  /* narx: prisadka tanlansa — kosa "hinge" stavkasida */
  const pc = productionCost(r.cutlists, r.materials, { xizmatlar: { teshik: true }, furnituraById: H.furnById });
  const hinge = (M.hole_kinds.find(h => h.code === 'hinge') || {}).price, nKosa = r.cutlists.flatMap(c => c.holes).filter(h => h.kind === 'd6_kosa').length;
  ok('prisadka narxi: D6 teshiklari hisobga kiradi, kosa — "hinge" stavkasi', pc.holeCost >= nKosa * hinge && pc.breakdown.holeCount > 40, pc.holeCost + ' ' + pc.breakdown.holeCount);
}

/* 6) BPJ: har nusxa o'z teshigi bilan (chap yon devor — orqa yuza, o'ng — old yuza) */
{
  const { buildBPJ } = await import('../app/js/engine/bpj.js');
  const pl = [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708, rot: 0, qty: 1 }];
  const cl = Object.assign(cutlist(f2, 600, 450, 708, M, { projectSlots: S }), { placementId: 'p1' });
  const B = buildBPJ({ room: { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]] }, placements: pl }, H.catalog, M, { modelName: 'D6', cutlists: [cl] });
  const ob = (B.objects || []).filter(o => /bok/i.test(o.name || ''));
  const yuza = ob.map(o => [...new Set((o.holes || []).filter(h => h.diameter === 5 && h.depth === 9).map(h => h.face))].join());
  ok('BPJ: ikkala yon devorda ushlagich teshiklari — biri orqa, biri old yuzada', ob.length === 2 && J(yuza.sort()) === J(['back', 'front']), J(yuza));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
