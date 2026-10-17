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

/* 7) eksentrik (minifiks) — chizma.birikma = 'ekssentrik' (konstruksiya tili); sukut — konfirmat o'zgarmaydi */
{
  const { EKS } = await import('../app/js/engine/d6.js');
  const { buildBPJ } = await import('../app/js/engine/bpj.js');
  ok('eksentrik qiymatlari (sex KDT): korpus Ø15×12,5, toretsdan 35; torets Ø7×35; juft detalda Ø10×11', J(EKS) === J({ korpus: { d: 15, dp: 12.5, chet: 35 }, qirra: { d: 7, dp: 35 }, bolt: { d: 10, dp: 11 } }));
  const qur = (eks) => { const ch = C.yangiChizma('pastki'); if (eks) ch.birikma = 'ekssentrik'; const fr = C.chizmaKatalog(ch, eks ? 'CH-EKS' : 'CH-KON', 'Pastki'); return { fr, cl: cutlist(fr, fr.w, fr.d, fr.h, M, { projectSlots: S }) }; };
  const K0 = qur(false), K1 = qur(true), soni = (cl, k) => cl.holes.filter(h => h.kind === k).reduce((a, h) => a + (h.nusxa || 1), 0);   // har nusxa
  const kon = soni(K0.cl, 'evrovint_torets');
  ok('sukut — konfirmat (o\'zgarmagan): eksentrik teshigi yo\'q, TS-1730 = birikma soni', kon === 8 && !K0.cl.holes.some(h => /eks/.test(h.kind)) && K0.cl.hardware.some(x => x.code === 'TS-1730' && x.qty === kon), kon);
  ok('eksentrik: konfirmat o\'rniga — har birikmada Ø15 + Ø7 torets + Ø10 juft (soni konfirmatdek), konfirmat teshigi yo\'q',
    soni(K1.cl, 'd6_eksentrik') === kon && soni(K1.cl, 'd6_eks_qirra') === kon && soni(K1.cl, 'd6_eks_bolt') === kon && !K1.cl.holes.some(h => /^evrovint/.test(h.kind)));
  const yon = K1.cl.holes.filter(h => h.part === 'yon' && h.kind === 'd6_eksentrik'), yon2 = K1.cl.holes.filter(h => h.part === 'yon_2' && h.kind === 'd6_eksentrik');
  ok('korpus: yon devorda toretsdan (pastdan) 35 mm, Ø15×12,5; chap va o\'ng yon — ichki yuza (ko\'zgu)', yon.length === 2 && yon.every(h => h.y === 35 && h.dia === 15 && h.depth === 12.5)
    && J([...new Set(yon.map(h => h.yuza))]) !== J([...new Set(yon2.map(h => h.yuza))]), J(yon));
  const bolt = K1.cl.holes.filter(h => h.part === 'tub' && h.kind === 'd6_eks_bolt');
  ok('juft detal (tub): Ø10×11 ko\'r, konfirmat joyida (qirradan 8 = t/2)', bolt.length === 4 && bolt.every(h => h.dia === 10 && h.depth === 11 && h.side === 'F' && (h.y === 8 || h.y === 592)), J(bolt));
  ok('torets: Ø7×35 (side T)', K1.cl.holes.filter(h => h.kind === 'd6_eks_qirra').every(h => h.side === 'T' && h.dia === 7 && h.depth === 35));
  ok('furnitura: eksentrik komplekt (BZ-ekstsentrik_0_0 → ERP ID) birikma sonicha, konfirmat yo\'q', K1.cl.hardware.some(x => x.code === 'BZ-ekstsentrik_0_0' && x.qty === kon) && !K1.cl.hardware.some(x => x.code === 'TS-1730'));
  const pc = productionCost([Object.assign(K1.cl, { placementId: 'e' })], M, { xizmatlar: { teshik: true } });
  const cam = M.hole_kinds.find(h => h.code === 'cam').price, ln = pc.lines.find(l => l.code === 'hole:d6_eksentrik');
  ok('prisadka narxi: Ø15 — mavjud "cam" stavkasi (nomi ham)', ln && ln.unit_price === cam && ln.qty === kon && ln.name.startsWith(M.hole_kinds.find(h => h.code === 'cam').name), J(ln));
  const pl = [{ id: 'e', frg: 'CH-EKS', x: 0, y: 0, z: 0, w: K1.fr.w, d: K1.fr.d, h: K1.fr.h, rot: 0, qty: 1 }];
  const { model } = stanokModeli({ cutlists: [Object.assign(K1.cl, { placementId: 'e' })], placements: pl, catalog: { 'CH-EKS': K1.fr }, materials: M, nom: 'EKS' });
  const yonD = model.detallar.filter(d => /yon/i.test(d.nom)), tf = (d) => d.xnc.flatMap(x => x.teshiklar);
  ok('stanok modeli (GibLab .project / KDT): yon devorda Ø15×12,5 yuza va Ø7×35 qirra teshigi', yonD.length === 2 && yonD.every(d => tf(d).filter(h => h.tur === 'f' && h.d === 15 && h.dp === 12.5).length === 2 && tf(d).filter(h => h.tur !== 'f' && h.d === 7 && h.dp === 35).length === 2), J(yonD.map(tf)));
  const kd = yonD[0], kf = kdtFayllar({ ...kd, kromka: { t: 0, b: 0, l: 0, r: 0 } }, kd.xnc).map(f => kdtOqi(f.matn));
  ok('KDT: Ø15 (TypeNo 1) va Ø7 qirra teshigi faylda', kf.some(k => k.teshiklar.some(h => h.d === 15)) && kf.some(k => k.teshiklar.some(h => h.d === 7 && h.dp === 35)), J(kf.map(k => k.teshiklar)));
  const P = projectOqi(projectYoz(model));
  ok('.project: yozib o\'qilganda Ø15 saqlanadi', P.detallar.some(d => d.xnc.some(x => x.teshiklar.some(h => h.d === 15))));
  const Bp = buildBPJ({ room: { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]] }, placements: pl }, { 'CH-EKS': K1.fr }, M, { modelName: 'EKS', cutlists: [Object.assign(K1.cl, { placementId: 'e' })] });
  ok('BPJ: Ø15 va Ø10 teshiklari obyektlarda', (Bp.objects || []).some(o => (o.holes || []).some(h => h.diameter === 15)) && (Bp.objects || []).some(o => (o.holes || []).some(h => h.diameter === 10)));
}

/* 8) tortma yo'naltiruvchisi (sharikli salazka) — yon devorda Ø3×2,5, quti tubidan 27, old qirradan uzunlikka qarab */
{
  const { NAPR } = await import('../app/js/engine/d6.js');
  ok('yo\'naltiruvchi qiymatlari (sex KDT + .b3d): Ø3×2,5, tubdan 27; 400 — 37/176/240, 450 — 52/209/416, 350 — 36/185', J(NAPR) === J({ d: 3, dp: 2.5, tubdan: 27, oraliq: 13, joy: { 350: [36, 185], 400: [37, 176, 240], 450: [52, 209, 416] } }));
  const f = H.catalog['MC-KP-10'], cl = cutlist(f, 400, 450, 708, M, { projectSlots: S });
  const n = cl.holes.filter(h => h.kind === 'd6_napr'), by = (ref) => n.filter(h => h.ref === ref).map(h => [h.yuza, h.x, h.y].join(',')).sort();
  ok('MC-KP-10 (3 tortma): har yon devorda 3 qator × 3 teshik, quti tubidan 27 mm (29 − 16 + 27 = 40), old qirradan 37/176/240',
    n.length === 18 && J(by('bok#2')) === J(['2,176,302', '2,176,40', '2,176,564', '2,240,302', '2,240,40', '2,240,564', '2,37,302', '2,37,40', '2,37,564']), J(by('bok#2')));
  ok('chap va o\'ng yon devor — qutiga qaragan yuza (ko\'zgu)', J([...new Set(n.filter(h => h.ref === 'bok#1').map(h => h.yuza))]) === J([1]) && J([...new Set(n.filter(h => h.ref === 'bok#2').map(h => h.yuza))]) === J([2]));
  ok('tortmali MC modullari: KP-03 — 6, KP-04 — 6, KP-09 — 12, KP-11 — 18; kargo (KP-06) — 0', ['MC-KP-03', 'MC-KP-04', 'MC-KP-09', 'MC-KP-11', 'MC-KP-06'].map(c => { const g = H.catalog[c]; return cutlist(g, g.w, g.d, g.h, M, { projectSlots: S }).holes.filter(h => h.kind === 'd6_napr').length; }).join() === '6,6,12,18,0');
  const tumba = (d) => { const ch = C.yangiChizma('tumba'); ch.d = d; const fr = C.chizmaKatalog(ch, 'CH-T', 'T'); return cutlist(fr, fr.w, fr.d, fr.h, M, { projectSlots: S }).holes.filter(h => h.kind === 'd6_napr'); };
  const t450 = tumba(450), t500 = tumba(500), t600 = tumba(600);
  ok('qo\'lda chizilgan tumba: 450 (NAP-400) — 3 tortma × 3 × 2 = 18, 500 (NAP-450) — 52/209/416; 600 (NAP-550, sex fayli yo\'q) — teshik qo\'yilmaydi',
    t450.length === 18 && t500.length === 18 && J([...new Set(t500.map(h => h.x))].sort((a, b) => a - b)) === J([52, 209, 416]) && t600.length === 0, [t450.length, t500.length, t600.length].join());
  const doc = { v: 1, room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
    placements: [{ id: 'p1', frg: 'MC-KP-10', x: 0, y: 0, z: 100, w: 400, d: 450, h: 708, rot: 0, qty: 1 }] };
  const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16', polkaCode: 'LDSP16' });
  const { model } = stanokModeli({ cutlists: r.cutlists, placements: doc.placements, catalog: H.catalog, materials: H.materials, nom: 'NAPR' });
  const bok = model.detallar.filter(d => d.nom === 'bok');
  ok('stanok modeli: yon devorlarda 9 tadan Ø3×2,5 (biri 1-yuza, biri 2-yuza)', bok.length === 2 && bok.every(d => d.xnc.flatMap(x => x.teshiklar).filter(h => h.d === 3 && h.dp === 2.5).length === 9), J(bok.map(d => d.xnc)));
}

/* 9) burchak (gluxoy) modul eshigi — sexdagidek oddiy kosa (Ø35, 21,5, ±24/6), petlya gluxoyga qarama-qarshi yon devorda */
{
  const f = H.catalog['MC-KP-05'], o = f.manba.joy_olcham, cl = cutlist(f, o[0], o[1], o[2], M, { projectSlots: S });
  const kosa = cl.holes.filter(h => h.kind === 'd6_kosa'), pl = cl.holes.filter(h => h.kind === 'd6_planka');
  ok('MC-KP-05 (gluxoy chap): eshikda 2 kosa (bo\'yi 547 ≤ 1000), planka o\'ng yon devorda (gluxoydan uzoq)', kosa.length === 2 && kosa.every(h => h.ref === 'dver#1') && pl.length === 4 && pl.every(h => h.ref === 'bok#2'), J([kosa.map(h => h.ref), pl.map(h => h.ref)]));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
