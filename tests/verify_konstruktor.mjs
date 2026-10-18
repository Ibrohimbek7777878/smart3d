/* TZ-22: avtomatik konstruktor (AI'siz) — 20 ta namuna xona.
 * Har variantda: xatosiz (validateDoc: to'qnashuv, xonadan chiqish, o'lcham chegarasi), eshiklar 90° gacha ochiladi
 * (devor, mebel, tutqich, qo'shni eshik), devor millimetrigacha to'ldirilgan (bo'shliq 0 mm), ustki shkaf deraza ustida emas,
 * plita deraza ostida emas, moyka quvur devorida, natija har safar bir xil, detal ro'yxati va raskroy xatosiz.
 * Qo'shimcha: eshik qoidasi (assembler, opts.eshiklar) va "Eshiklarni ochish" xavfsiz burchagi (rasmdagi muammo). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { devorlar } from '../app/js/engine/konstruktor/devor.js';
import { eshikToqnashuvlari, eshikBurchaklari } from '../app/js/engine/konstruktor/eshik.js';
import { QOIDALAR } from '../app/js/engine/konstruktor/qoidalar.js';
import { getModulePanels } from '../app/js/engine/assembler.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { footprint } from '../app/js/engine/rules.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { ichkiXona, devorOraliqlari, DEVOR_ORALIQ } from '../app/js/engine/devorOraliq.js';

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
const rect = (W, D) => [[0, 0], [W, 0], [W, D], [0, D]];
const win = (wall, offset, width, sill = 900) => ({ wall, type: 'window', offset, width, sill, height: 1400 });
const door = (wall, offset, width = 800) => ({ wall, type: 'door', offset, width, sill: 0, height: 2100 });
const pipe = (wall, offset) => ({ type: 'pipe', wall, offset, z: 500 });

const XONALAR = [
  { n: '3.6×3, deraza+quvur, eshik', r: { outline: rect(3600, 3000), openings: [win(0, 1300, 1200), door(2, 400)], utilities: [pipe(0, 1900)] } },
  { n: '3×3 bo\'sh', r: { outline: rect(3000, 3000) } },
  { n: '2.4×3 kichik', r: { outline: rect(2400, 3000), openings: [door(2, 800)] } },
  { n: '1.8×2.4 juda kichik', r: { outline: rect(1800, 2400), openings: [door(2, 500)] }, t: { shakl: 'I' }, diqqat: 'joy_xolodilnik' },
  { n: '4.2×3.2 katta', r: { outline: rect(4200, 3200), openings: [win(0, 1500, 1500), door(2, 600, 900)], utilities: [pipe(0, 2200)] } },
  { n: '5×3.5', r: { outline: rect(5000, 3500), openings: [win(1, 1000, 1200)], utilities: [pipe(1, 1600)] } },
  { n: '2.7×4 tor uzun', r: { outline: rect(2700, 4000), openings: [door(0, 900), win(2, 700, 1200)] } },
  { n: 'quvur qisqa devorda', r: { outline: rect(4000, 2800), utilities: [pipe(1, 1400)] } },
  { n: 'past tokchali deraza', r: { outline: rect(3600, 3000), openings: [win(0, 1200, 1200, 600)] } },
  { n: 'L majburiy', r: { outline: rect(3600, 3000), openings: [door(2, 400)], utilities: [pipe(0, 1500)] }, t: { shakl: 'L' } },
  { n: 'U majburiy', r: { outline: rect(3600, 3200), openings: [door(2, 1400)] }, t: { shakl: 'U' } },
  { n: 'xolodilniksiz', r: { outline: rect(3000, 2800), utilities: [pipe(0, 1000)] }, t: { xolodilnik: false } },
  { n: 'plitasiz', r: { outline: rect(3000, 2800) }, t: { plita: false } },
  { n: 'ustkisiz', r: { outline: rect(3400, 2800), openings: [win(0, 1000, 1400)] }, t: { ustki: false } },
  { n: 'L shakl xona (6 nuqta)', r: { outline: [[0, 0], [4000, 0], [4000, 2000], [2500, 2000], [2500, 3500], [0, 3500]], openings: [door(4, 600)] } },
  { n: 'teskari aylanish (CCW)', r: { outline: [[0, 0], [0, 3000], [3600, 3000], [3600, 0]], utilities: [pipe(3, 1800)] } },
  { n: 'eshik asosiy devorda', r: { outline: rect(4000, 3000), openings: [door(0, 1600)] } },
  { n: '3.2×2.6 deraza markazda', r: { outline: rect(3200, 2600), openings: [win(0, 1000, 1200), door(1, 300)], utilities: [pipe(0, 1600)] } },
  { n: '6×4 juda katta', r: { outline: rect(6000, 4000), openings: [win(0, 2000, 2000)], utilities: [pipe(0, 3000)] } },
  { n: 'siljigan xona (manfiy koordinata)', r: { outline: [[-1000, -500], [2600, -500], [2600, 2500], [-1000, 2500]], utilities: [pipe(0, 1800)] } }
];

const Wkp = cat[QOIDALAR.modul.pastki.burchak].w, Dp = QOIDALAR.pastki.d;
let variantlar = 0;
for (const X of XONALAR) {
  const room = Object.assign({ wall_height: 2700, openings: [], utilities: [] }, X.r);
  const res = konstruksiya(room, X.t || {}, cat);
  ok(X.n + ': kamida 1 variant', res.variantlar.length >= 1, res.xato);
  const res2 = konstruksiya(room, X.t || {}, cat);
  ok(X.n + ': har safar bir xil natija', JSON.stringify(res) === JSON.stringify(res2));
  /* egasi #152: konstruktor devor yuzasidan DEVOR_ORALIQ mm ichkaridagi "ichki xona"da ishlaydi — "bo'shliq 0" va deraza
     tekshiruvlari shu ichki chiziq bo'yicha (oldin kontur chizig'ida edi: modul 3D da devor ichiga 50 mm kirardi) */
  const ichki = ichkiXona(room), W = devorlar(ichki);
  for (const v of res.variantlar) {
    variantlar++;
    const tag = X.n + ' [' + v.shakl + ']';
    const dq = v.izohlar.filter(z => z.diqqat).map(z => z.kalit);
    ok(tag + ': joy yetmasa — izoh bilan (aks holda izohsiz)', X.diqqat ? dq[0] === X.diqqat : dq.length === 0, dq.join(','));
    ok(tag + ': ogohlantirish yo\'q (to\'qnashuv, xona, chegara, eshik)', v.ogohlantirishlar.length === 0, JSON.stringify(v.ogohlantirishlar).slice(0, 300));
    ok(tag + ': eshiklar 90° ochiladi', eshikToqnashuvlari(v.placements, cat, room).length === 0);
    /* egasi #152: har modul devor yuzasidan kamida DEVOR_ORALIQ mm (devor ichiga kirish 0), devor yonidagilari — aynan shuncha */
    const gaps = v.placements.flatMap(p => devorOraliqlari(room, p, 60).map(g => g.oraliq));
    ok(tag + ': devor oralig\'i ' + DEVOR_ORALIQ + ' mm, devorga kirish yo\'q', gaps.length > 0 && gaps.every(g => g >= DEVOR_ORALIQ - 0.5) && gaps.some(g => Math.abs(g - DEVOR_ORALIQ) < 0.5),
      JSON.stringify([...new Set(gaps.map(Math.round))]));
    /* bo'shliq 0: har devorda pastki qator — oraliqlar faqat xona eshigi / past deraza / burchak zonasida */
    for (const wi of v.devorlar) {
      const dv = W.find(d => d.i === wi);
      const pas = v.placements.filter(p => (+p.z || 0) < 1000 && p.rot === dv.rot   /* pastki qator — oyoqda (z 0…100) */ && Math.abs((dv.n[0] ? p.x : p.y) - (dv.n[0] ? dv.S[0] : dv.S[1])) < 1)
        .map(p => { const f = footprint(p); const a = dv.u[0] ? [f.x0, f.x1] : [f.y0, f.y1]; const s0 = dv.u[0] + dv.u[1] > 0 ? a[0] - (dv.u[0] ? dv.S[0] : dv.S[1]) : (dv.u[0] ? dv.S[0] : dv.S[1]) - a[1]; return [Math.round(s0), Math.round(s0 + (a[1] - a[0]))]; })
        .sort((a, b) => a[0] - b[0]);
      const blok = (ichki.openings || []).filter(o => +o.wall === wi && (o.type === 'door' || (+o.sill || 0) < QOIDALAR.pastki.h + 40)).map(o => dv.oraliq(+o.offset, +o.width));
      const k = v.devorlar.indexOf(wi), boshda = k > 0;
      const run1 = dv.len;
      let cur = boshda ? Dp : 0, bosh = true;
      const bo = [];
      for (const [a, b] of pas) {
        if (a > cur + 0.5) { const m = blok.some(([x0, x1]) => x0 - QOIDALAR.xonaEshigi.oraliq <= cur + 1 && x1 + QOIDALAR.xonaEshigi.oraliq >= a - 1); if (!m) bo.push([cur, a]); }
        cur = Math.max(cur, b); bosh = false;
      }
      if (run1 > cur + 0.5 && !blok.some(([x0, x1]) => x1 + QOIDALAR.xonaEshigi.oraliq >= run1 - 1 && x0 - QOIDALAR.xonaEshigi.oraliq <= cur + 1)) bo.push([cur, run1]);
      ok(tag + ': devor ' + (wi + 1) + ' — bo\'shliq 0 mm', !bosh && bo.length === 0, JSON.stringify(bo));
    }
    /* ustki shkaf deraza ustida emas; plita deraza ostida emas */
    for (const o of (ichki.openings || []).filter(o => o.type === 'window')) {
      const dv = W.find(d => d.i === +o.wall);
      const [w0, w1] = dv.oraliq(+o.offset, +o.width);
      const onWall = (p) => p.rot === dv.rot && Math.abs((dv.n[0] ? p.x : p.y) - (dv.n[0] ? dv.S[0] : dv.S[1])) < 1;
      const sOf = (p) => { const f = footprint(p); const a = dv.u[0] ? [f.x0, f.x1] : [f.y0, f.y1]; const base = dv.u[0] ? dv.S[0] : dv.S[1]; return dv.u[0] + dv.u[1] > 0 ? [a[0] - base, a[1] - base] : [base - a[1], base - a[0]]; };
      const ust = v.placements.filter(p => onWall(p) && +p.z >= 1000 && cat[p.frg].category !== 'filler').filter(p => { const [a, b] = sOf(p); return a < w1 - 1 && b > w0 + 1; });
      ok(tag + ': ustki shkaf deraza ustida emas', ust.length === 0, ust.map(p => p.frg).join(','));
      const pl = v.placements.filter(p => onWall(p) && p.frg === QOIDALAR.modul.texnika.plita).filter(p => { const [a, b] = sOf(p); return a < w1 + QOIDALAR.plita.derazadan && b > w0 - QOIDALAR.plita.derazadan; });
      ok(tag + ': plita deraza ostida emas', pl.length === 0);
    }
    /* moyka quvur devorida (quvur shakl devorida bo'lsa) */
    for (const u of (room.utilities || []).filter(u => u.type === 'pipe')) {
      if (!v.devorlar.includes(+u.wall)) continue;
      const dv = W.find(d => d.i === +u.wall);
      const mo = v.placements.find(p => /MC-KP-0[78]/.test(p.frg));
      ok(tag + ': moyka quvur devorida', mo && mo.rot === dv.rot);
    }
    /* burchak modullari (gluxoy): ko'r qism burchakka qaragan (eshik emas) — Bazis'dagi "chap" modul */
    for (const p of v.placements.filter(p => p.frg === QOIDALAR.modul.pastki.burchak || p.frg === QOIDALAR.modul.ustki.burchak)) {
      const f = cat[p.frg], pan = getModulePanels(f, p.w, p.d, p.h, { eshiklar: true }).panels;
      const r = (p.rot || 0) * Math.PI / 180, c = Math.round(Math.cos(r)), sn = Math.round(Math.sin(r));
      const cx = p.x + (p.w / 2) * c - (p.d / 2) * sn, cy = p.y + (p.w / 2) * sn + (p.d / 2) * c;
      const W = (lx) => [cx + lx * c, cy + lx * sn];
      const near = (pt) => Math.min(...room.outline.map(([x, y]) => Math.hypot(pt[0] - x, pt[1] - y)));
      const kor = pan.find(q => q.code === 'gluxoy'), esh = pan.find(q => q.isDoor);
      ok(tag + ': ' + p.frg + ' — ko\'r qism burchakda', kor && esh && near(W(kor.x)) < near(W(esh.x)));
    }
    /* detal ro'yxati va raskroy */
    const doc = { room, placements: v.placements, kitchen: v.kitchen };
    const all = v.placements.concat(deriveKitchen(doc, cat)).filter(p => cat[p.frg] && cat[p.frg].production !== 'none');
    let partsOk = true;
    const parts = [];
    for (const p of all) {
      try {
        const cl = cutlist(cat[p.frg], p.w, p.d, p.h, mats, { projectSlots: { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' } });
        for (const q of cl.parts) { if (!(q.length > 0 && q.width > 0) || !isFinite(q.length + q.width)) partsOk = false; parts.push(Object.assign({}, q, { id: p.id + ':' + q.ref })); }
      } catch (e) { partsOk = false; }
    }
    ok(tag + ': detal ro\'yxati xatosiz', partsOk && parts.length > 0, parts.length);
    let nestOk = false;
    try { const n = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 }); nestOk = !!n && JSON.stringify(n).indexOf('NaN') < 0; } catch (e) { nestOk = false; }
    ok(tag + ': raskroy xatosiz', nestOk);
    /* stoleshnitsa — Bazis chuqurligi (600) */
    const st = deriveKitchen(doc, cat).filter(p => p.frg === 'SP-ST-001');
    ok(tag + ': stoleshnitsa 600 chuqur', st.length > 0 && st.every(p => p.d === 600), st.map(p => p.d).join(','));
  }
}
ok('variantlar soni yetarli (≥ 30)', variantlar >= 30, variantlar);

/* eshik qoidasi (assembler, faqat opts.eshiklar) */
const kp02 = cat['MC-KP-02'], kp05 = cat['MC-KP-05'], ku05 = cat['MC-KU-05'], kp01 = cat['MC-KP-01'];
ok('MC-KP-02 600: Bazis bo\'yicha 2 eshik (bayroqsiz — avvalgidek 1)', getModulePanels(kp02, 600, 450, 708, { eshiklar: true }).panels.filter(p => p.isDoor).length === 2 && getModulePanels(kp02, 600, 450, 708, {}).panels.filter(p => p.isDoor).length === 1);
const g = getModulePanels(kp05, 780, 450, 708, { eshiklar: true });
const gd = g.panels.find(p => p.isDoor);
/* bizda lokal +x — tomoshabinning chapi; Bazis'da eshik o'ngda → lokal −x, petlya ko'r qism tomonida (+x chet) */
ok('MC-KP-05 gluxoy: eshik 308, tomoshabinning o\'ngida, petlya ko\'r qism tomonida + qo\'zg\'almas fasad', gd && gd.w === 308 && gd.x < 0 && gd.hingeSide === 'right' && g.panels.some(p => p.code === 'gluxoy' && p.x > 0));
ok('MC-KU-05 ochiq javon: eshiksiz', getModulePanels(ku05, 200, 300, 721, { eshiklar: true }).panels.filter(p => p.isDoor).length === 0);
const r1 = getModulePanels(kp01, 400, 450, 708, { eshiklar: true, hinge: 'right' }).panels.find(p => p.isDoor);
ok('MC-KP-01: petlya o\'ngda — tutqich chapda', r1.hingeSide === 'right' && r1.handle.x < 0);

/* rasmdagi muammo: namuna oshxona (SP modullar), 100° da eshiklar kesishadi → xavfsiz burchak bilan kesishmaydi */
const room0 = { outline: rect(3600, 3000) };
const pl0 = [
  { id: 'p1', frg: 'SP-K-001', x: 50, y: 50, z: 0, w: 600, d: 550, h: 720, rot: 0 },
  { id: 'p2', frg: 'SP-K-004', x: 650, y: 50, z: 0, w: 900, d: 550, h: 720, rot: 0 },
  { id: 'p3', frg: 'SP-K-014', x: 1550, y: 50, z: 0, w: 600, d: 550, h: 600, rot: 0 },
  { id: 'p4', frg: 'SP-K-005', x: 50, y: 50, z: 1450, w: 900, d: 350, h: 700, rot: 0 },
  { id: 'p5', frg: 'SP-K-005', x: 950, y: 50, z: 1450, w: 900, d: 350, h: 700, rot: 0 }];
ok('rasmdagi holat: 100° da eshiklar kesishadi (aniqlanadi)', eshikToqnashuvlari(pl0, cat, room0, { burchak: 100 }).some(t => t.tur === 'juft'));
const bur = eshikBurchaklari(pl0, cat, room0);
ok('xavfsiz burchak: hech bir eshik 100° dan oshmaydi, to\'qnashganlari ≤ 90°', Object.values(bur).every(v => v <= 100 * Math.PI / 180 + 1e-9) && bur['p2:fasad_ong'] <= Math.PI / 2 + 1e-9 && bur['p4:fasad_ong'] <= Math.PI / 2 + 1e-9);

/* 2026-10-16 (egasi #119, Bazis buyurtmalari bilan solishtirildi): MC pastki shkaf — 100 mm oyoqda, sokol — modulning o'z detali;
   oshxona qatoriga ikkinchi sokol qo'yilmaydi; stoleshnitsa korpus ustida */
{
  const room = { outline: rect(3600, 3000), utilities: [pipe(0, 1500)] };
  const v = konstruksiya(room, { shakl: 'I' }, cat).variantlar[0];
  const kp = v.placements.filter(p => /^MC-KP/.test(p.frg));
  ok('MC pastki shkaf oyoqda: z = 100 (Bazis: korpus Y=100, sokol 10…100)', kp.length > 0 && kp.every(p => p.z === 100), kp.map(p => p.z).join());
  const kit = deriveKitchen({ room, placements: v.placements, kitchen: v.kitchen }, cat);
  const sok = kit.filter(p => p.frg === 'SP-ST-002');
  const ozi = kp.reduce((s, p) => s + cutlist(cat[p.frg], p.w, p.d, p.h, mats, {}).parts.filter(q => q.code === 'frontalnaya').length, 0);
  const ust = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 1;
  const kesish = sok.filter(s => kp.some(p => { const f = footprint(p), g = footprint(s); return ust([f.x0, f.x1], [g.x0, g.x1]) && ust([f.y0, f.y1], [g.y0 - 50, g.y1 + 50]); }));
  ok(`sokol bir marta: modullarning o'z sokoli ${ozi} ta, qator sokoli ular ostida yo'q`, ozi === kp.length && kesish.length === 0, kesish.length + ' ta ustma-ust');
  const st = kit.find(p => p.frg === 'SP-ST-001');
  ok('stoleshnitsa korpus ustida: z = 100 + 708', st && st.z === 100 + QOIDALAR.pastki.h, st && st.z);
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
