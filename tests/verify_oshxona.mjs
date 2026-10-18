/* egasi #166: matndan oshxona — "Kuxnya 4500 mm, Haytek bezruchka, gola …" bitta modul EMAS, 3 qavatli to'g'ri oshxona.
 * Tekshiriladi: yo'naltirish (oshxona / bitta modul), AI'siz tahlilchi (uz, ru, en, imlo xatolari), har maydon manbasi (matn/sukut),
 * konstruktor natijasi: qator 4500 ± modul qadami, 3 qavat bo'yi/chuqurligi, fartuk 600, gaz va vityajka 600 bir o'qda, 3 tortma
 * (Tandem vakuum), ruchka va ruchka teshigi yo'q, Gola profil, stoleshnitsa 38 × 600; kesim ro'yxati xatosiz, ustma-ust 0,
 * devorga kirish 0; xona kengayishi va balandligi; server sxemasi (oshxona maydonlari). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { oshxonami, oshxonaSpec, oshxonaTekshir, oshxonaBirlashtir, oshxonaSxemadan } from '../app/js/engine/oshxonaTili.js';
import { konstruksiyami } from '../app/js/engine/konstruksiyaTili.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { aiBuild } from '../app/js/ai.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { validateDoc, footprint } from '../app/js/engine/rules.js';
import { getModulePanels } from '../app/js/engine/assembler.js';
import { devorOraliqlari, DEVOR_ORALIQ } from '../app/js/engine/devorOraliq.js';

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (p) => JSON.parse(readFileSync(DATA + p, 'utf8'));
const std = J('sex-standartlari.json'), mats = J('materials.json');
const cat = {};
for (const f of J('fragments.json')) cat[f.code] = f;
for (const f of J('fragments-mc.json').fragments) cat[f.code] = f;
for (const f of Object.values(cat)) applySexStandart(f, std);
for (const a of J('appliances.json').appliances) cat[a.code] = { code: a.code, name: a.name, category: 'appliance', group: 'texnika', w: a.w, d: a.d, h: a.h, min_w: 200, max_w: 1200, production: 'none', parts: [], holes: [], hardware: [], edge: [] };

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; } else { fail++; console.log('  ✗', name, info); } };
const S = JSON.stringify;

const EGA = 'Kuxnya 4500 mm, Haytek bezruchka, gola frofilli birinchi etaj balandligi 870mm fartuk 600 mm 2 etaj 750mm 3 etaj 600mm balandlikda, chuqurliklar 1 etaj 450 mm 2 etaj 350mm, 3 etaj 560mm gaz va vitichka 600mm dan 1 etajda 3 ta tortma bor tandem vacuum,Stolichnitsa 38mmx600mm';
const RUS = 'Кухня 4,5 м, хайтек без ручек, профиль Гола, первый ярус высота 870 мм, фартук 600 мм, второй ярус 750 мм, третий ярус 600 мм высотой, глубина: первый ярус 450 мм, второй ярус 350 мм, третий ярус 560 мм, газ и вытяжка 600 мм, в первом ярусе 3 ящика тандем вакуум, столешница 38х600 мм';
const ENG = 'Kitchen 4.5 m, hi-tech handleless gola profile, first tier height 870 mm, backsplash 600 mm, second tier 750 mm, third tier 600 mm, depths: first tier 450 mm, second tier 350 mm, third tier 560 mm, gas hob and hood 600 mm, 3 drawers tandem soft-close, countertop 38x600 mm';
/* oldingi shkaf prompti (tests/verify_konstruksiya.mjs) — bitta modul bo'lib qoladi */
const SHKAF = /^const EGA = '(.*)';$/m.exec(readFileSync(fileURLToPath(new URL('./verify_konstruksiya.mjs', import.meta.url)), 'utf8'))[1];

/* 1) yo'naltirish */
ok('egasi matni — oshxona (bitta modul emas)', oshxonami(EGA) && !konstruksiyami(EGA));
ok('ruscha va inglizcha — oshxona', oshxonami(RUS) && !konstruksiyami(RUS) && oshxonami(ENG) && !konstruksiyami(ENG));
ok('oldingi shkaf prompti — bitta modul (avvalgidek)', konstruksiyami(SHKAF) && !oshxonami(SHKAF));
ok('bitta modul matnlari oshxona emas', ['shkaf 1200 4 polka', 'pastki shkaf 800 3 tortma', 'komod 6 tortma', 'javon 800x300x1800'].every(s => !oshxonami(s) && konstruksiyami(s)));
ok('xona o\'lchamli oshxona — avvalgi yo\'l (oshxona spec emas)', ['oshxona 3x4 m', 'oshxona 3.6x3 m L shakl', 'кухня 3x4 м'].every(s => !oshxonami(s) && !konstruksiyami(s)));

/* 2) tahlilchi */
const KUT = { uzunlik: 4500, qavatlar: [{ boyi: 870, chuqurligi: 450 }, { boyi: 750, chuqurligi: 350 }, { boyi: 600, chuqurligi: 560 }], fartuk: 600, uslub: 'haytek', ruchkasiz: true, gola: true,
  tortma: { soni: 3, yonaltiruvchi: 'tandem_vakuum' }, gaz: { bor: true, eni: 600 }, vytyajka: { bor: true, eni: 600 }, stoleshnitsa: { qalinlik: 38, chuqurligi: 600 } };
const asosiy = (s) => S({ uzunlik: s.uzunlik, qavatlar: s.qavatlar, fartuk: s.fartuk, uslub: s.uslub, ruchkasiz: s.ruchkasiz, gola: s.gola, tortma: s.tortma, gaz: s.gaz, vytyajka: s.vytyajka, stoleshnitsa: s.stoleshnitsa });
for (const [nom, matn] of [['egasi', EGA], ['ruscha', RUS], ['inglizcha', ENG]]) {
  const r = oshxonaTekshir(oshxonaSpec(matn));
  ok(nom + ': spec — uzunlik, 3 qavat, fartuk, ruchkasiz, Gola, tortma, gaz/vityajka, stoleshnitsa', asosiy(r.spec) === S(KUT), asosiy(r.spec));
  ok(nom + ': tuzatishsiz', r.tuzatish.length === 0, S(r.tuzatish));
  const m = r.spec.manba;
  ok(nom + ': har maydon manbasi — matndan (moyka — sukut)', Object.entries(m).every(([k, v]) => k === 'moyka' ? v === 'sukut' : v === 'matn'), S(m));
}
/* imlo xatolari va sukut */
const qisqa = oshxonaTekshir(oshxonaSpec('oshxona 3.6 metr, gaz plita, 2 ta tortma')).spec;
ok('qisqa matn: uzunlik 3600, tortma 2, qolgani sukut (0)', qisqa.uzunlik === 3600 && qisqa.tortma.soni === 2 && qisqa.qavatlar.length === 2 && qisqa.qavatlar.every(q => !q.boyi && !q.chuqurligi) && !qisqa.fartuk && !qisqa.ruchkasiz && !qisqa.stoleshnitsa.qalinlik
  && qisqa.manba.q1_boyi === 'sukut' && qisqa.manba.fartuk === 'sukut' && qisqa.manba.uzunlik === 'matn', S(qisqa));
const imlo = oshxonaTekshir(oshxonaSpec('kuhnya 4 m, bez ruchka, 1-qavat 850 mm, fartug 650, 2-qavat 700, stoleshnisa 26 mm, vityajka 500')).spec;
ok('imlo: kuhnya, bez ruchka, 1-qavat, fartug, stoleshnisa, vityajka', imlo.uzunlik === 4000 && imlo.ruchkasiz && !imlo.gola && imlo.qavatlar[0].boyi === 850 && imlo.fartuk === 650 && imlo.qavatlar[1].boyi === 700
  && imlo.stoleshnitsa.qalinlik === 26 && imlo.vytyajka.eni === 500, S(imlo));
const chek = oshxonaTekshir({ uzunlik: 99999, qavatlar: [{ boyi: 5000 }], stoleshnitsa: { qalinlik: 40 } });
ok('chegara: uzunlik 12000 ga, qalinlik 40 → 38 (izoh bilan)', chek.spec.uzunlik === 12000 && chek.spec.stoleshnitsa.qalinlik === 38 && chek.tuzatish.length === 3, S(chek.tuzatish));
/* server sxemasi → xom spec, birlashtirish (AI'siz asosiy) */
const sx = oshxonaSxemadan({ uzunlik_mm: 4000, q1_boyi_mm: 860, q1_chuqurligi_mm: 0, q2_boyi_mm: 0, q2_chuqurligi_mm: 0, q3_boyi_mm: 0, q3_chuqurligi_mm: 0, fartuk_mm: 620,
  tortma_soni: 0, gaz_mm: 0, vytyajka_mm: 0, stol_qalinlik_mm: 0, stol_chuqurligi_mm: 0, ruchkasiz: true, gola: false, haytek: false, tandem_vakuum: false });
const bir = oshxonaBirlashtir(qisqa, oshxonaTekshir(sx).spec);
ok('AI javobi faqat bo\'sh maydonlarni to\'ldiradi', bir.uzunlik === 3600 && bir.qavatlar[0].boyi === 860 && bir.fartuk === 620 && bir.ruchkasiz && bir.manba.fartuk === 'ai' && bir.manba.uzunlik === 'matn', S(bir));
ok('server sxemasi: aytilmagan oshxona — null', oshxonaSxemadan({ uzunlik_mm: 0, q1_boyi_mm: 0, q2_boyi_mm: 0 }) === null && oshxonaSxemadan(undefined) === null);

/* 3) qurish (aiBuild + konstruktor, AI'siz) */
async function qur(matn) {
  let v = null;
  const res = await aiBuild(matn, cat, { konstruktor: (room, talab) => (v = konstruksiya(room, talab, cat).variantlar[0] || null) });
  return { res, v };
}
const sOf = (p) => { const f = footprint(p); return [f.x0, f.x1]; };
async function tekshir(nom, matn, kutUz = 4500) {
  const { res, v } = await qur(matn);
  const pl = res.doc.placements, room = res.doc.room;
  ok(nom + ': konstruktor varianti bor', !!v && !!res.oshxona && !!res.oshxona.natija);
  if (!v) return null;
  const tur = (p) => cat[p.frg] || {};
  const tex = (p) => tur(p).category === 'appliance';
  const P = pl.filter(p => p.z < 1000), U = pl.filter(p => p.z >= 1000 && p.z < 2000), A = pl.filter(p => p.z >= 2000);
  const run = (L) => { const xs = L.flatMap(sOf); return Math.max(...xs) - Math.min(...xs); };
  ok(nom + ': qator uzunligi ' + kutUz + ' ± 50 (bitta devor)', Math.abs(run(P) - kutUz) <= 50 && new Set(pl.map(p => p.rot)).size === 1, run(P));
  const m1 = P.filter(p => /^MC-KP/.test(p.frg)), m2 = U.filter(p => /^MC-KU/.test(p.frg)), m3 = A.filter(p => /^MC-KU/.test(p.frg));
  const kit = deriveKitchen({ room, placements: pl, kitchen: res.doc.kitchen || res.kitchen }, cat);
  const st = kit.filter(p => p.frg === 'SP-ST-001');
  ok(nom + ': 1-qavat — poldan stoleshnitsa ustigacha 870 (oyoq 100 + korpus 732 + stol 38), chuqurligi 450', m1.length > 0 && m1.every(p => p.z === 100 && p.h === 732 && p.d === 450) && st.length > 0 && st.every(p => p.z + p.h === 870),
    S([...new Set(m1.map(p => [p.z, p.h, p.d].join('/')))]) + ' stol ' + S(st.map(p => [p.z, p.h])));
  ok(nom + ': stoleshnitsa 38 × 600', st.every(p => p.h === 38 && p.d === 600) && res.kitchen.stolT === 38, S(st.map(p => [p.h, p.d])));
  ok(nom + ': fartuk 600 — 2-qavat poldan 1470', m2.length > 0 && m2.every(p => p.z === 870 + 600), S([...new Set(m2.map(p => p.z))]));
  ok(nom + ': 2-qavat bo\'yi 750, chuqurligi 350', m2.every(p => p.h === 750 && p.d === 350), S([...new Set(m2.map(p => p.h + '/' + p.d))]));
  /* egasi #168: faqat katalog modullari — antresol oilasi tanlanadi (MC-KA: bo'yi 350–360 qat'iy; MC-KU: 460–1140) — 600 ga MC-KU yaqin;
     chuqurligi 560 — MC-KU chegarasi 290–400 → 400 (izohda, o'ylab topilmaydi) */
  ok(nom + ': 3-qavat (antresol) — 2-qavat ustida (2220), bo\'yi 600, chuqurligi 560 → 400 (modul chegarasi)', m3.length > 0 && m3.every(p => p.z === 2220 && p.h === 600 && p.d === 400), S([...new Set(m3.map(p => [p.z, p.h, p.d].join('/')))]));
  const ch = res.oshxona.natija.chegara;
  ok(nom + ': chegara izohi — har antresol moduli: chuqurligi 560 so\'raldi, 290–400 → 400; boshqa chegaradan chiqish yo\'q', ch.length === m3.length && ch.every(x => /^MC-KU-0[67]$/.test(x.frg) && x.o === 'd' && x.soraldi === 560 && x.min === 290 && x.max === 400 && x.natija === 400) && res.oshxona.natija.antresolOila === 'ustki', S(ch));
  ok(nom + ': hamma joylashuv — katalog moduli (CH- yo\'q)', pl.every(p => cat[p.frg] && !/^CH-/.test(p.frg)), pl.filter(p => !cat[p.frg]).map(p => p.frg).join());
  const q3m = res.oshxona.natija.qavatlar[2].modullar;
  ok(nom + ': xulosada har qavat modullari (kod, nomi, o\'lchami, soni)', q3m.length > 0 && q3m.every(x => x.frg && x.nom && x.w > 0 && x.n > 0) && res.oshxona.natija.qavatlar[0].modullar.some(x => x.frg === 'MC-KP-10' && x.n === 1), S(q3m));
  ok(nom + ': xona balandligi 3 qavatga yetadi (≥ 2820)', room.wall_height >= 2820 && Math.max(...pl.map(p => p.z + p.h)) <= room.wall_height, room.wall_height);
  const gaz = pl.find(p => p.frg === 'SP-TX-008'), vyt = pl.find(p => p.frg === 'SP-TX-006');
  const o = (p) => { const [a, b] = sOf(p); return (a + b) / 2; };
  ok(nom + ': gaz 600 va vityajka 600 bir o\'qda, vityajka 2-qavat ostida', gaz && vyt && gaz.w === 600 && vyt.w === 600 && Math.abs(o(gaz) - o(vyt)) < 1 && vyt.z === 1470, S([gaz, vyt].map(p => p && [p.w, o(p), p.z])));
  const tm = pl.filter(p => p.frg === 'MC-KP-10');
  const cl = (p) => cutlist(cat[p.frg], p.w, p.d, p.h, mats, { projectSlots: { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' }, hinge: p.hinge, ruchkasiz: p.ruchkasiz, yonaltiruvchi: p.yonaltiruvchi });
  const tcl = tm.map(cl);
  const tortmaSoni = tcl.reduce((a, c) => a + c.parts.filter(q => q.code === 'fasad_yashika').length, 0);
  ok(nom + ': 1-qavatda 3 tortma (bitta 3 tortmali modul), gaz yonida', tm.length === 1 && tortmaSoni === 3 && Math.min(...tm.map(p => Math.min(Math.abs(sOf(p)[0] - sOf(gaz)[1]), Math.abs(sOf(p)[1] - sOf(gaz)[0])))) <= 100, tm.length + ' / ' + tortmaSoni);
  ok(nom + ': Tandem vakuum — har tortmaga 1 komplekt, eski salazka/napravlyayushie qatori yo\'q', tcl.every(c => c.hardware.some(h => h.code === 'TANDEM-VAKUUM' && h.qty === 3) && !c.hardware.some(h => /napravl|salazk/i.test(h.code + ' ' + h.name))),
    S(tcl.map(c => c.hardware.map(h => h.code))));
  const mod = pl.filter(p => !tex(p) && tur(p).category !== 'filler' && /^MC-/.test(p.frg));
  const cls = mod.map(cl);
  ok(nom + ': ruchkasiz — ruchka qatori ham, ruchka teshigi ham yo\'q', mod.every(p => p.ruchkasiz) && cls.every(c => !c.hardware.some(h => /ручк|ruchk|^RU-/i.test(h.code + ' ' + (h.name || ''))) && !c.holes.some(h => h.kind === 'd6_ruchka')),
    S(cls.flatMap(c => c.hardware.filter(h => /ручк|ruchk|^RU-/i.test(h.code + ' ' + (h.name || ''))).map(h => h.code))));
  ok(nom + ': 3D — ruchka chizilmaydi (bayroqsiz — chiziladi)', mod.every(p => !getModulePanels(cat[p.frg], p.w, p.d, p.h, { eshiklar: true, tortma: true, ruchkasiz: true }).panels.some(q => q.handle))
    && mod.some(p => getModulePanels(cat[p.frg], p.w, p.d, p.h, { eshiklar: true, tortma: true }).panels.some(q => q.handle)));
  ok(nom + ': Gola profil — gorizontal uzunlik (taklif)', res.kitchen.gola && res.kitchen.gola.gorizontal > 0 && res.kitchen.gola.gorizontal >= m1.reduce((a, p) => a + p.w, 0), S(res.kitchen.gola));
  /* kesim ro'yxati, raskroy, ustma-ust, devor */
  const all = pl.concat(kit).filter(p => cat[p.frg] && cat[p.frg].production !== 'none');
  const parts = [];
  let partsOk = true;
  for (const p of all) {
    const c = cl(p);
    if (c.errors.length) partsOk = false;
    for (const q of c.parts) { if (!(q.length > 0 && q.width > 0)) partsOk = false; parts.push(Object.assign({}, q, { id: p.id + ':' + q.ref })); }
  }
  ok(nom + ': kesim ro\'yxati xatosiz', partsOk && parts.length > 0, parts.length);
  let nestOk = false;
  try { const n = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 }); nestOk = !!n && S(n).indexOf('NaN') < 0; } catch (e) { nestOk = false; }
  ok(nom + ': raskroy xatosiz', nestOk);
  const val = validateDoc({ room, placements: pl, kitchen: res.kitchen }, { catalog: cat });
  ok(nom + ': ustma-ust 0, xonadan chiqish 0 (validateDoc xatosiz)', val.errors.length === 0, S(val.errors.slice(0, 3)));
  const gaps = pl.flatMap(p => devorOraliqlari(room, p, 60).map(g => g.oraliq));
  ok(nom + ': devorga kirish 0 (devor oralig\'i ≥ ' + DEVOR_ORALIQ + ' mm)', gaps.length > 0 && gaps.every(g => g >= DEVOR_ORALIQ - 0.5), S([...new Set(gaps.map(Math.round))]));
  ok(nom + ': ogohlantirish yo\'q (o\'lchamlar modul chegarasida)', res.oshxona.ogoh.length === 0, S(res.oshxona.ogoh));
  return res;
}
const rE = await tekshir('egasi', EGA);
ok('egasi: xona aytilmagan — 4500 + 2 × devor chegarasi, sukut deb belgilangan', rE && rE.oshxona.xona.sukut && rE.doc.room.outline[1][0] === 4500 + 2 * (50 + DEVOR_ORALIQ) && rE.oshxona.xona.balandlik.keyin === 2820, rE && S(rE.oshxona.xona));
await tekshir('ruscha', RUS);
await tekshir('inglizcha', ENG);
/* xona katta — qator 4500 da to'xtaydi; xona kichik — kengayadi */
{
  const { res } = await qur('xona 6x3 m, ' + EGA);
  const P = res.doc.placements.filter(p => p.z < 1000), xs = P.flatMap(sOf);
  ok('xona 6×3: qator 4500 ± 50 (devor 6000 — to\'liq to\'ldirilmaydi)', Math.abs(Math.max(...xs) - Math.min(...xs) - 4500) <= 50 && !res.oshxona.xona.kengaydi, Math.max(...xs) - Math.min(...xs));
  const r2 = (await qur('xona 3x3 m, ' + EGA)).res;
  ok('xona 3×3: devor 4606 ga kengaydi (izoh bilan)', r2.oshxona.xona.kengaydi && r2.oshxona.xona.kengaydi.keyin === 4606 && r2.doc.room.outline[1][0] === 4606, S(r2.oshxona.xona));
}
/* egasi #168: antresol oilasi — so'ralgani MC antresol (MC-KA) chegarasiga yaqin bo'lsa, MC-KA modullari (o'lchami qat'iy) */
{
  const { res } = await qur('Kuxnya 4500 mm, 1 etaj 870 mm, fartuk 600 mm, 2 etaj 750 mm, 3 etaj 350 mm, chuqurliklar 1 etaj 450 mm, 2 etaj 350 mm, 3 etaj 400 mm, gaz plita');
  const A = res.doc.placements.filter(p => p.z >= 2000 && cat[p.frg].category !== 'filler');
  ok('antresol 350×400 → MC-KA-01/02 (katalog antresol moduli), chegara izohlari bilan', res.oshxona.natija && res.oshxona.natija.antresolOila === 'antresol' && A.length > 0 && A.every(p => /^MC-KA-0[12]$/.test(p.frg)),
    S(A.map(p => [p.frg, p.w, p.d, p.h])));
  ok('antresol (MC-KA): hamma joylashuv katalogda, kesish 0', res.doc.placements.every(p => cat[p.frg]) && validateDoc({ room: res.doc.room, placements: res.doc.placements, kitchen: res.kitchen }, { catalog: cat }).errors.length === 0);
}

/* oshxona bo'lmagan matn — avvalgi natija (oshxona maydoni yo'q) */
{
  const { res } = await qur('oshxona 3.6x3 m, moyka, gaz plita, xolodilnik');
  ok('oddiy oshxona matni — avvalgidek (oshxona spec yo\'q)', res.oshxona === null && res.doc.placements.length > 0);
}

/* sayt hisobi (web/src/services/hisob.js, haqiqiy katalog): Gola va Tandem furnitura qatori, ruchka qatori yo'q, narx o'ylab topilmaydi */
{
  const { createRequire } = await import('node:module');
  globalThis.SpPrice = createRequire(import.meta.url)('../app/js/engine/price.js');
  const { loadData, createHisob } = await import('../web/src/services/hisob.js');
  const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
  const res = await aiBuild(EGA, H.catalog, { konstruktor: (room, talab) => konstruksiya(room, talab, H.catalog).variantlar[0] || null });
  const doc = Object.assign({}, res.doc, { kitchen: Object.assign({ stoleshnitsa: true, stolT: 26, sokol: false, dobor: false, doborH: 60, karniz: false, karnizH: 60, moyka: { on: false, offset: 600, fromBack: 100, size: 500 } }, res.kitchen) });
  const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16' });
  const hw = r.cutlists.flatMap(c => c.hardware);
  const gola = hw.filter(h => h.code === 'GOLA-PROFIL'), tan = hw.filter(h => h.code === 'TANDEM-VAKUUM');
  ok('hisob: Gola profil qatori — 1 ta, metr (butun), konstruktor uzunligidan', gola.length === 1 && gola[0].qty === Math.ceil(res.kitchen.gola.gorizontal / 1000) && gola[0].unit === 'm', S(gola));
  ok('hisob: Tandem vakuum — 3 komplekt', tan.reduce((a, h) => a + h.qty, 0) === 3, S(tan));
  ok('hisob: ruchka qatori va ruchka teshigi yo\'q', !hw.some(h => /ручк|ruchk|^RU-/i.test(h.code + ' ' + (h.name || ''))) && !r.cutlists.some(c => c.holes.some(h => h.kind === 'd6_ruchka')));
  ok('hisob: Gola/Tandem narxi o\'ylab topilmaydi — "narx yo\'q" ro\'yxatida', S(r.prod).includes('GOLA-PROFIL') && S(r.prod).includes('TANDEM-VAKUUM'));
  ok('hisob: validatsiya xatosiz, jami > 0', r.val.errors.length === 0 && r.priceRes.total > 0, S(r.val.errors.slice(0, 2)));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
