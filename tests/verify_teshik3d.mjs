/* egasi #167: teshik, kromka va zapchast joylari 3D da (engine/teshik3d.js). Tekshiriladi:
 *   38 MC modulda va qo'lda chizilgan har turda — 3D teshiklar soni = kesim ro'yxatidagi joyli teshiklar (har teshik × nusxa),
 *   kromka tasmalari = kromkali qirralar (tomon × nusxa); teshik nuqtasi o'z detali yuzasida yoki toretsida (qutidan chiqmaydi);
 *   D6 joylari (MC-KP-02): polka ushlagich yon devor ichki yuzasida, petlya kosasi eshik ichki yuzasida; narx uchun (joysiz)
 *   teshik chizilmaydi; qo'lda chizilgan modulda korpus detallari old qirrasi kromkali (detal kartasidagi "Kromka —" sababi — kartada). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const C = await import('../app/js/engine/chizish.js');
const { cutlist } = await import('../app/js/engine/cutlist.js');
const T = await import('../app/js/engine/teshik3d.js');
const { getModulePanels } = await import('../app/js/engine/assembler.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));

/** teshik nuqtasi o'z qutisi chegarasida (1 mm zaxira) */
const ichida = (r) => {
  const Q = Object.fromEntries(r.qutilar.map(q => [q.ref, q]));
  return r.teshiklar.every(t => { const q = Q[t.ref]; return q && [0, 1, 2].every(i => Math.abs(t.p[i] - q.c[i]) <= q.s[i] / 2 + 1); });
};

/* 1) 38 MC modul */
{
  let mos = 0, chegara = 0, n = 0, d6 = 0;
  const xato = [];
  for (const k of Object.keys(H.catalog).filter(k => /^MC-/.test(k))) {
    const f = H.catalog[k], cl = cutlist(f, f.w, f.d, f.h, H.materials, {});
    const r = T.teshik3d(f, f.w, f.d, f.h, cl, {});
    n++;
    if (r.teshiklar.length === T.joyliTeshikSoni(cl) && r.kromkalar.length === T.kromkaQirraSoni(cl)) mos++; else xato.push(k);
    if (ichida(r)) chegara++;
    if (cl.holes.some(h => /^d6_/.test(h.kind))) d6++;
  }
  ok(`MC: ${mos}/${n} modulda 3D teshik va kromka soni = kesim ro'yxati (D6 li — ${d6})`, mos === n && n >= 38, xato.join(', '));
  ok(`MC: teshik nuqtalari o'z detalida (${chegara}/${n})`, chegara === n);
}

/* 2) qo'lda chizilgan — har tur, eksentrik ham */
for (const [nom, c] of [['pastki', C.yangiChizma('pastki')], ['ustki', C.yangiChizma('ustki')], ['shkaf', C.yangiChizma('shkaf')], ['tumba', C.yangiChizma('tumba')],
  ['erkin', C.yangiChizma('erkin')], ['eksentrik', Object.assign(C.yangiChizma('pastki'), { birikma: 'ekssentrik' })]]) {
  const f = C.chizmaKatalog(c, 'CH-T', nom), cl = cutlist(f, c.w, c.d, c.h, H.materials, {});
  const r = T.teshik3d(f, c.w, c.d, c.h, cl, {});
  const pan = getModulePanels(f, c.w, c.d, c.h, { tortma: true, eshiklar: true }).panels;
  const map = T.qutiPanel(r.qutilar, pan);
  ok(`chizma "${nom}": teshik ${r.teshiklar.length} = ${T.joyliTeshikSoni(cl)}, kromka ${r.kromkalar.length} = ${T.kromkaQirraSoni(cl)}, detal↔3D ${map.filter(i => i >= 0).length}/${map.length}`,
    r.teshiklar.length === T.joyliTeshikSoni(cl) && r.kromkalar.length === T.kromkaQirraSoni(cl) && ichida(r) && map.every(i => i >= 0) && r.teshiklar.length > 0);
}

/* 3) D6 joylari — MC-KP-02 */
{
  const f = H.catalog['MC-KP-02'], cl = cutlist(f, f.w, f.d, f.h, H.materials, {});
  const r = T.teshik3d(f, f.w, f.d, f.h, cl, {});
  const Q = Object.fromEntries(r.qutilar.map(q => [q.ref, q]));
  const polka = r.teshiklar.filter(t => t.kind === 'd6_polka');
  ok(`polka ushlagich (${polka.length}) yon devorning modul ichiga qaragan yuzasida, yo'nalishi devor ichiga`,
    polka.length === 4 && polka.every(t => { const q = Q[t.ref]; const ichki = q.c[0] > 0 ? q.c[0] - q.s[0] / 2 : q.c[0] + q.s[0] / 2; return Math.abs(t.p[0] - ichki) < 0.6 && Math.sign(t.n[0]) === Math.sign(q.c[0]); }));
  const kosa = r.teshiklar.filter(t => t.kind === 'd6_kosa');
  ok(`petlya kosasi (${kosa.length}) eshikning ichki (korpusga qaragan) yuzasida, Ø35 × 13`,
    kosa.length === 4 && kosa.every(t => { const q = Q[t.ref]; return Math.abs(t.p[1] - (q.c[1] - q.s[1] / 2)) < 0.6 && t.n[1] > 0 && t.dia === 35 && t.depth === 13; }));
  const z = {}; for (const x of r.zapchast) z[x.tur] = (z[x.tur] || 0) + 1;
  ok(`zapchast belgilari teshiklardan: petlya ${z.petlya}, polka ${z.polka}, ruchka ${z.ruchka}`, z.petlya === 4 && z.polka === 4 && z.ruchka === 2);
}

/* 4) narx uchun (joysiz) teshik chizilmaydi */
{
  const f = H.catalog['MC-KP-02'], cl = cutlist(f, f.w, f.d, f.h, H.materials, {});
  cl.holes.push({ part: '', side: '', x: 0, y: 0, dia: 5, depth: 13, kind: 'd6_polka', qty: 3, narx_uchun: true });
  const r = T.teshik3d(f, f.w, f.d, f.h, cl, {});
  ok('narx uchun (Bazis importi, joysiz) teshik 3D da yo\'q', r.teshiklar.length === T.joyliTeshikSoni(cl));
}

/* 5) kromka: qo'lda chizilgan modulda korpus detallari old (F) qirrasi kromkali — kesim ro'yxatida bor (narxga kiradi) */
{
  const c = Object.assign(C.yangiChizma('erkin'), { w: 800, d: 400 }), f = C.chizmaKatalog(c, 'CH-T', 't');
  const cl = cutlist(f, c.w, c.d, c.h, H.materials, {});
  const tom = cl.edges.find(e => e.code === 'qopqoq');
  ok(`chizma "Tepa (tom)" 800×400: kromka ${tom ? tom.sides.join('') + ' · ' + tom.thickness + ' mm · ' + tom.meters + ' m' : 'yo\'q'}`, !!tom && tom.sides.join('') === 'F' && tom.meters === 0.8);
}

/* 6) TZ-38 (egasi #274): zapchast turlari kengaytirildi (konfirmat, ekssentrik, oyoq) va BOM (narx paneli) bilan bog'landi */
{
  /* ichki.js lug'at (JSON) ni import qiladi — node uchun "type: json" atributi (faqat shu test) */
  (await import('node:module')).register('data:text/javascript,' + encodeURIComponent("export async function load(u, c, n) { return n(u, u.endsWith('.json') ? { ...c, importAttributes: { type: 'json' } } : c); }"));
  const { ichkiSpec } = await import('../web/src/services/ichki.js');
  const { belgiGuruh } = await import('../web/src/services/belgi3d.js');
  const THREE = await import('../web/node_modules/three/build/three.module.js');
  const oyoqRe = /nojk|ножк/i;
  let sp0 = 0, jami0 = 0, n = 0, konf = 0, oyoq = 0, chegara = 0, bomMos = 0, ichkiMos = 0, belgiMos = 0, tuz = 0;
  const xato = [];
  for (const k of Object.keys(H.catalog).filter(k => /^MC-/.test(k))) {
    const f = H.catalog[k], cl = cutlist(f, f.w, f.d, f.h, H.materials, {});
    const r = T.teshik3d(f, f.w, f.d, f.h, cl, {});
    n++;
    const cnt = (tur) => r.zapchast.filter(z => z.tur === tur).length;
    const evro = r.teshiklar.filter(t => t.kind === 'evrovint').length, eks = r.teshiklar.filter(t => t.kind === 'd6_eksentrik').length;
    const oyoqBom = cl.hardware.filter(h => oyoqRe.test((h.code || '') + ' ' + (h.name || ''))).reduce((a, h) => a + h.qty, 0);
    const pastki = r.qutilar.some(q => q.s[2] <= 40 && q.s[0] >= f.w * 0.5 && q.s[1] >= f.d * 0.4);
    if (cnt('konfirmat') === evro && cnt('eksentrik') === eks && cnt('oyoq') === (oyoqBom === 4 && pastki ? 4 : 0)) konf++; else xato.push(k + ':tur');
    if (cnt('oyoq')) oyoq++;
    /* barcha belgi nuqtalari modul detallari qutisi ichida (oyoq — pastga 100 mm, eshik/ruchka oldinga ~25 mm chiqadi: zaxira 120 mm) */
    const lo = [0, 1, 2].map(i => Math.min(...r.qutilar.map(q => q.c[i] - q.s[i] / 2)) - 120), hi = [0, 1, 2].map(i => Math.max(...r.qutilar.map(q => q.c[i] + q.s[i] / 2)) + 120);
    const ich = (p) => p.every((v, i) => v >= lo[i] && v <= hi[i]);
    if (r.zapchast.every(z => (z.p ? ich(z.p) : ich(z.a) && ich(z.b)) && z.i != null)) chegara++; else xato.push(k + ':chegara');
    /* BOM bog'lanishi: har belgi — bitta BOM qatorida yoki "bomsiz"da (yo'qolmaydi, ikki marta sanalmaydi) */
    const b = T.zapchastBom(cl, r);
    if (b.qatorlar.reduce((a, q) => a + q.belgilar.length, 0) + b.bomsiz.length === r.zapchast.length) bomMos++; else xato.push(k + ':bom');
    /* "Ichini ko'rish": detal guruhlaridagi zapchast yig'indisi = 3D belgilar (hammasi detalga bog'langan) */
    const spec = ichkiSpec(f, f.w, f.d, f.h, cl, r);
    const sp = spec.parts.reduce((a, p) => a + ((p.tk && p.tk.zap) || []).length, 0);
    /* D6 (MC-KP/KU/KA/KK) modullarida hammasi detalga bog'lanadi; boshqalarida (kupe, burchak, panel — assembler panellari teshik detallari bilan
       to'liq mos emas, teshiklarda ham shunday) bog'lanmagan belgi "Ichini ko'rish" detal guruhida chizilmaydi (hisobotga yoziladi) */
    sp0 += sp; jami0 += r.zapchast.length;
    if (sp <= r.zapchast.length && (!/^MC-K[PUAK]-/.test(k) || sp === r.zapchast.length)) ichkiMos++; else xato.push(k + ':ichki ' + sp + '/' + r.zapchast.length);
    /* three.js: belgilar soni va markazlari */
    const g = belgiGuruh(THREE, r);
    if (g.userData.son.zapchast === r.zapchast.length && g.userData.zapNuqta.length === r.zapchast.length
      && g.userData.zapNuqta.every(x => isFinite(x.c.x + x.c.y + x.c.z) && x.r > 0)) belgiMos++; else xato.push(k + ':belgi');
    if (!tuz) tuz = 1;
  }
  ok(`MC: konfirmat = yuza evrovint teshigi, ekssentrik = d6_eksentrik, oyoq — nojka 4 dona bo'lsa 4 (${konf}/${n}, oyoqli modul ${oyoq})`, konf === n && oyoq >= 3, xato.join(' '));
  ok(`MC: zapchast belgilari modul detallari qutisida va tartib raqamli (${chegara}/${n})`, chegara === n, xato.join(' '));
  ok(`MC: har belgi BOM qatoriga yoki "narx panelida yo'q" guruhiga tushadi (${bomMos}/${n})`, bomMos === n, xato.join(' '));
  ok(`MC: "Ichini ko'rish" detal guruhlaridagi zapchast: D6 modullarida = 3D belgilar, boshqalarida ≤ (${ichkiMos}/${n}; jami ${sp0} / ${jami0})`, ichkiMos === n, xato.join(' '));
  ok(`MC: belgiGuruh zapchast soni va markazlari (${belgiMos}/${n})`, belgiMos === n, xato.join(' '));
  /* zapchastsiz detal — 0 (orqa devor HDF, teshiksiz), eshik — petlya, tortma fasadi — ruchka */
  const f = H.catalog['MC-KP-02'], cl = cutlist(f, f.w, f.d, f.h, H.materials, {}), r = T.teshik3d(f, f.w, f.d, f.h, cl, {});
  const spec = ichkiSpec(f, f.w, f.d, f.h, cl, r);
  const orqa = spec.parts.find(p => p.mat === 'hdf'), eshik = spec.parts.filter(p => p.slot === 'fasad');
  const zt = (p) => ((p && p.tk && p.tk.zap) || []).reduce((a, z) => { a[z.tur] = (a[z.tur] || 0) + 1; return a; }, {});
  const jamiTur = (tur) => eshik.reduce((a, p) => a + (zt(p)[tur] || 0), 0);
  ok(`zapchastsiz detal (orqa HDF) — 0; eshik detallarida petlya ${jamiTur('petlya')} va ruchka ${jamiTur('ruchka')} (2 eshik: 4 + 2)`,
    !!orqa && ((orqa.tk && orqa.tk.zap) || []).length === 0 && eshik.length >= 1 && jamiTur('petlya') === 4 && jamiTur('ruchka') === 2);
  /* ekssentrikli qo'lda chizilgan modul */
  const c = Object.assign(C.yangiChizma('pastki'), { birikma: 'ekssentrik' }), fc = C.chizmaKatalog(c, 'CH-T', 'e'), clc = cutlist(fc, c.w, c.d, c.h, H.materials, {});
  const rc = T.teshik3d(fc, c.w, c.d, c.h, clc, {});
  const eksN = rc.teshiklar.filter(t => t.kind === 'd6_eksentrik').length;
  ok(`chizma (ekssentrik birikma): ekssentrik belgisi ${rc.zapchast.filter(z => z.tur === 'eksentrik').length} = d6_eksentrik teshik ${eksN}`, eksN > 0 && rc.zapchast.filter(z => z.tur === 'eksentrik').length === eksN);
}

console.log(fail ? `\n=== XATO (${pass} pass, ${fail} fail) ===` : `\n=== HAMMASI OK (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
