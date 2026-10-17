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

console.log(fail ? `\n=== XATO (${pass} pass, ${fail} fail) ===` : `\n=== HAMMASI OK (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
