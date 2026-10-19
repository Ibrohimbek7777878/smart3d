/* TZ-17: "Bazis taqlidi" — bizning BPJ fayl Bazis'ga import skripti (BazisUniversalImport.js v4.18, mebelcity-platform —
 * faqat o'qiladi, o'zgartirilmaydi) bilan Node'da soxta Bazis funksiyalari ustida ochiladi; har yaratilgan panel joyi va
 * burilishi tekshiriladi:
 *   1) 38 ta MC moduli (standart o'lcham) — asl Bazis faylidagi (.fr3d, data1) panellar bilan: joy va o'lcham ≤ 0.5 mm;
 *   2) konstruktor oshxonalari (I / L / U, 0°/90°/180°/270°) — har panel o'z modulining izida, fasadlar xona tomonda;
 *   3) umumiy modullar — 3D model bilan; modelda yo'q detallar ro'yxati (TZ-05 gacha "geometriya tekshirilmagan").
 * Taqlid qilib bo'lmaydigan Bazis xususiyatlari (faqat real Bazis'da tekshiriladi — BPJ-SINOV-YORIQNOMA.md):
 *   AddFrontPanel(0,0,dl,dw,0) qalinligi lokal +Z tomonga; Orient(Z, Y) — Z aniq, Y yo'nalish; AddHole(x, y, z) yuzi.
 * Fayllar yo'q bo'lsa (skript, data1) — tegishli qism o'tkazib yuboriladi. Ishlatish: node tests/bpj_import_mock.mjs */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { buildBPJ } from '../app/js/engine/bpj.js';
import { getModulePanels } from '../app/js/engine/assembler.js';
import { cutlist } from '../app/js/engine/cutlist.js';
import { footprint } from '../app/js/engine/rules.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { PANEL_CODE } from '../app/js/engine/bazis/b3d.js';
import { konturBox } from '../app/js/engine/bazis/loyiha.js';
import { loadData, createHisob } from '../web/src/services/hisob.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKRIPT = join(ROOT, '..', 'mebelcity-platform', 'widget_bazis', 'static', 'widget_bazis', 'viewer', 'bazis', 'BazisUniversalImport.js');
const DATA1 = [join(ROOT, 'data1'), join(ROOT, '..', 'Smart3D', 'data1')].find(existsSync);
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(ROOT, 'app', 'data', n), 'utf8')))));
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const TOL = 0.5;

if (!existsSync(SKRIPT)) {
  console.log('  · import skripti yo\'q (mebelcity-platform) — test o\'tkazib yuborildi');
  console.log('\n=== HAMMASI OK (0 pass, 0 fail) ===');
  process.exit(0);
}
const SKRIPT_MATN = readFileSync(SKRIPT, 'utf8');

/* ── soxta Bazis: panel — ramka (origin + o'qlar), kontur to'rtburchagi, qalinlik (material bo'yicha) ── */
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const rotV = (v, k, deg) => {   // Rodrigues: v ni k atrofida deg ga
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), kk = norm(k), kv = cross(kk, v), kd = dot(kk, v);
  return { x: v.x * c + kv.x * s + kk.x * kd * (1 - c), y: v.y * c + kv.y * s + kk.y * kd * (1 - c), z: v.z * c + kv.z * s + kk.z * kd * (1 - c) };
};

function bazisImport(bpj) {
  const qalinlik = Object.fromEntries((bpj.materials || []).map(m => [m.name, m.thickness]));
  const panels = [], log = [], alerts = [];
  const yangiPanel = (x1, y1, x2, y2, o, ax) => {
    const P = {
      _o: o, _x: ax[0], _y: ax[1], _z: ax[2], _r: [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)],
      _t: 16, butts: [], holes: [], Name: '', ArtPos: '',
      Plastics: { Plastics: [{}] },
      Orient(az, ayHint) {   // Z — aniq, Y — yo'nalish (Z ga perpendikular qilinadi), X = Y × Z
        const Z = norm(az), d = dot(ayHint, Z), Y = norm({ x: ayHint.x - d * Z.x, y: ayHint.y - d * Z.y, z: ayHint.z - d * Z.z });
        this._z = Z; this._y = Y; this._x = cross(Y, Z);
      },
      get AxisX() { return this._x; },
      RotateGCS(k, deg) { this._x = rotV(this._x, k, deg); this._y = rotV(this._y, k, deg); this._z = rotV(this._z, k, deg); },
      get Position() { return { ...this._o }; },
      set Position(p) { this._o = { x: p.x, y: p.y, z: p.z }; },
      Translate(dx, dy, dz) { this._o = { x: this._o.x + dx, y: this._o.y + dy, z: this._o.z + dz }; },
      Build() {},
      AddButt(i) { const b = { elemIndex: i }; this.butts.push(b); return b; },
      AddHole(x, y, z, d, depth) { this.holes.push({ x, y, z, d, depth }); return true; },
      Contour: { Clear() {}, AddLine() {}, AddArc() {}, AddCircle() {}, OrderContours() {} }
    };
    Object.defineProperty(P, 'MaterialName', { set(v) { this._m = v; if (qalinlik[v]) this._t = qalinlik[v]; }, get() { return this._m; } });
    panels.push(P);
    return P;
  };
  const I = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
  const ctx = {
    JSON, Math, isNaN, parseFloat, parseInt,
    system: { apiVersion: 1001, askFileName: () => 'taqlid.bpj', readTextFile: () => JSON.stringify(bpj), log: (s) => log.push(String(s)) },
    alert: (s) => alerts.push(String(s)),
    Action: { Properties: { NewGroup: () => ({ NewButton: () => ({}), NewCheckBox: () => ({ Value: null }) }) }, Continue() {}, Finish() {}, Commit() {}, NewModel() {} },
    Undo: { Changing() {} },
    NewVector: (x, y, z) => ({ x, y, z }),
    BeginBlock() {}, EndBlock() {},
    /* PDF imzolari: AddFrontPanel(x1,y1,x2,y2,z) — XY tekislik; AddHorizPanel(x1,z1,x2,z2,y) — XZ; AddVertPanel(z1,y1,z2,y2,x) — ZY */
    AddFrontPanel: (x1, y1, x2, y2, z) => yangiPanel(x1, y1, x2, y2, { x: 0, y: 0, z }, I),
    AddHorizPanel: (x1, z1, x2, z2, y) => yangiPanel(x1, z1, x2, z2, { x: 0, y, z: 0 }, [I[0], I[2], { x: 0, y: -1, z: 0 }]),
    AddVertPanel: (z1, y1, z2, y2, x) => yangiPanel(z1, y1, z2, y2, { x, y: 0, z: 0 }, [I[2], I[1], { x: -1, y: 0, z: 0 }])
  };
  vm.createContext(ctx);
  vm.runInContext(SKRIPT_MATN, ctx, { filename: 'BazisUniversalImport.js' });
  ctx.Btn.OnClick();                                   // "BPJ Import" tugmasi — standart belgilar bilan
  /* har panel global qutisi: o + x·[r0,r2] + y·[r1,r3] + z·[0,t] */
  const box = (P) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const a of [P._r[0], P._r[2]]) for (const b of [P._r[1], P._r[3]]) for (const c of [0, P._t]) {
      const v = [P._o.x + P._x.x * a + P._y.x * b + P._z.x * c, P._o.y + P._x.y * a + P._y.y * b + P._z.y * c, P._o.z + P._x.z * a + P._y.z * b + P._z.z * c];
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], v[i]); mx[i] = Math.max(mx[i], v[i]); }
    }
    return { mn, sz: mx.map((v, i) => v - mn[i]), nom: P.Name, P };
  };
  return { panels, boxes: panels.map(box), log, alerts };
}

/* ikki quti to'plamini solishtirish: siljish — o'lchami mos juftlardan ovoz bilan, keyin har quti juftini topish.
 * Qalinlik o'qida (eng yupqa) material farqiga ruxsat (Smart3D polka 18 mm, Bazis 16) — boshi (min) baribir aniq. */
let qalinFarq = 0;
function solishtir(ours, ref) {
  const ovoz = new Map();
  const thin = (q) => q.sz.indexOf(Math.min(...q.sz));
  const mosOlcham = (a, b) => thin(a) === thin(b) && a.sz.every((v, i) => Math.abs(v - b.sz[i]) <= (i === thin(a) ? 2.5 : TOL) + 1e-6);
  for (const a of ours) for (const b of ref) if (mosOlcham(a, b)) {
    const t = b.mn.map((v, i) => Math.round((v - a.mn[i]) * 2) / 2).join(',');
    ovoz.set(t, (ovoz.get(t) || 0) + 1);
  }
  const best = [...ovoz.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return { mos: 0, ortiq: ours.length, yoq: ref.length, misol: [] };
  const t = best[0].split(',').map(Number);
  const used = new Set();
  let mos = 0;
  const misol = [];
  for (const a of ours) {
    const j = ref.findIndex((b, k) => !used.has(k) && mosOlcham(a, b) && b.mn.every((v, i) => Math.abs(v - a.mn[i] - t[i]) <= TOL + 1e-6));
    if (j >= 0) { used.add(j); mos++; if (Math.abs(a.sz[thin(a)] - ref[j].sz[thin(a)]) > TOL) qalinFarq++; } else if (misol.length < 3) misol.push(a.nom + ' ' + a.sz.map(Math.round).join('×') + ' @' + a.mn.map(Math.round).join(','));
  }
  return { mos, ortiq: ours.length - mos, yoq: ref.length - used.size, misol };
}

const STOL = /stol|столешн/i;   // stoleshnitsa bo'lagi — fr3d_import chiqaradi (yaxlit stoleshnitsa F2 da)
function asliQutilar(fayl) {
  const r = daraxt(new Uint8Array(readFileSync(fayl)), { inflate });
  const out = [];
  for (const p of (r && r.objects) || []) {
    if (p.modelCode !== PANEL_CODE || !p.contour_outer || !p.contour_outer.length) continue;
    if (STOL.test(p.name || '') || STOL.test(p.material || '')) continue;
    const bb = konturBox(p.contour_outer);              // yoylar bilan (egri konturli panel)
    const t = +p.thickness || 16, tf = p.tf;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const x of [bb.x0, bb.x1]) for (const y of [bb.y0, bb.y1]) for (const z of [0, t]) {
      for (let i = 0; i < 3; i++) { const v = tf.pos[i] + x * tf.oq[0][i] + y * tf.oq[1][i] + z * tf.oq[2][i]; mn[i] = Math.min(mn[i], v); mx[i] = Math.max(mx[i], v); }
    }
    out.push({ mn, sz: mx.map((v, i) => v - mn[i]), nom: p.name });
  }
  return out;
}

const bpjOf = (placements) => buildBPJ({ room: {}, placements }, H.catalog, H.materials, { modelName: 'taqlid' });
const tekshirImport = (nom, bpj, imp) => {
  const xato = imp.log.filter(s => /^\[!!\]/.test(s));
  const tr = bpj.objects.every((o, i) => {
    const P = imp.panels[i];
    const eq = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.z - b.z) < 1e-6;
    return P && eq(P._o, o.transform.origin) && eq(P._x, o.transform.axisX) && eq(P._y, o.transform.axisY) && eq(P._z, o.transform.axisZ);
  });
  return { xato, tr, n: imp.panels.length };
};

/* ══ 1) MC modullari — asl Bazis fayli bilan ══ */
console.log('\n[1] MC modullari (standart o\'lcham) — import natijasi asl Bazis fayli bilan');
const MC = Object.values(H.catalog).filter(f => /^MC-(?!FB-)/.test(f.code)).sort((a, b) => a.code.localeCompare(b.code));
if (!DATA1) console.log('  · data1 yo\'q — asl fayl bilan solishtirish o\'tkazib yuborildi');
let mcPanel = 0, mcMos = 0, mcRotOk = 0;
const mcXato = [];
for (const f of MC) {
  const [bw, bd, bh] = (f.manba && f.manba.joy_olcham) || [f.w, f.d, f.h];   // Bazis faylidagi o'lcham (joy formulalari shunda tekshirilgan)
  const bpj = bpjOf([{ id: 'm1', frg: f.code, x: 0, y: 0, z: 0, w: bw, d: bd, h: bh, rot: 0, qty: 1 }]);
  const imp = bazisImport(bpj);
  const ti = tekshirImport(f.code, bpj, imp);
  mcPanel += ti.n;
  if (ti.tr && !ti.xato.length && ti.n === bpj.objects.length) mcRotOk++; else mcXato.push(f.code + ': import ' + ti.n + '/' + bpj.objects.length + (ti.tr ? '' : ', ramka farq') + (ti.xato[0] ? ', ' + ti.xato[0] : ''));
  if (!DATA1) continue;
  const fayl = join(DATA1, '..', f.manba.fayl);
  if (!existsSync(fayl)) { mcXato.push(f.code + ': asl fayl yo\'q'); continue; }
  const s = solishtir(imp.boxes, asliQutilar(fayl));
  mcMos += s.mos;
  if (s.ortiq || s.yoq) mcXato.push(`${f.code}: ${s.mos}/${imp.boxes.length} mos, Bazis'da ortiq ${s.yoq}${s.misol.length ? ' — ' + s.misol.join('; ') : ''}`);
}
ok(`38 modul — import skripti xatosiz, har panel ramkasi BPJ bilan aynan (${mcRotOk}/${MC.length})`, mcRotOk === MC.length && MC.length === 38, mcXato.slice(0, 5).join(' | '));
if (DATA1) ok(`asl Bazis bilan: ${mcMos}/${mcPanel} panel joyi va o'lchami ≤ ${TOL} mm`, mcMos === mcPanel && !mcXato.length, mcXato.slice(0, 6).join(' | '));
if (DATA1) console.log(`  · qalinlik farqi (Smart3D materiali, joy aniq): ${qalinFarq} panel`);

/* ══ 2) konstruktor oshxonalari — burilishlar ══ */
console.log('\n[2] Konstruktor oshxonalari (I / L / U) — har panel modul izida, fasad xona tomonda');
const rect = (W, D) => [[0, 0], [W, 0], [W, D], [0, D]];
const XONA = [
  { n: '3.6×3 L', r: { outline: rect(3600, 3000), openings: [{ wall: 2, type: 'door', offset: 400, width: 800, sill: 0, height: 2100 }], utilities: [{ type: 'pipe', wall: 0, offset: 1500, z: 500 }] }, t: { shakl: 'L' } },
  { n: '3.6×3.2 U', r: { outline: rect(3600, 3200), openings: [{ wall: 2, type: 'door', offset: 1400, width: 800, sill: 0, height: 2100 }] }, t: { shakl: 'U' } },
  { n: '4×2.8 I (qisqa devor)', r: { outline: rect(4000, 2800), utilities: [{ type: 'pipe', wall: 1, offset: 1400, z: 500 }] }, t: { shakl: 'I' } }
];
for (const X of XONA) {
  const v = konstruksiya(X.r, X.t, H.catalog).variantlar[0];
  if (!v) { ok(X.n + ': variant bor', false); continue; }
  const pl = v.placements.filter(p => H.catalog[p.frg] && (H.catalog[p.frg].parts || []).length);
  const bpj = bpjOf(pl);
  const imp = bazisImport(bpj);
  const ti = tekshirImport(X.n, bpj, imp);
  const rots = [...new Set(pl.map(p => ((p.rot || 0) % 360 + 360) % 360))].sort((a, b) => a - b);
  ok(`${X.n}: ${pl.length} modul (${rots.join('/')}°), ${ti.n} panel — import xatosiz, ramka aynan`, ti.tr && !ti.xato.length && ti.n === bpj.objects.length, ti.xato[0] || '');
  /* Bazis → Smart3D: x = OFF − X, y = Z, z = Y */
  const OFF = bpj.smart3d.offsetX;
  const tash = [], fasadXato = [];
  imp.boxes.forEach((b, i) => {
    const o = bpj.objects[i], p = pl.find(q => q.id === o.userProps.smart3d_placement);
    const fp = footprint(p);
    const x0 = OFF - (b.mn[0] + b.sz[0]), x1 = OFF - b.mn[0], y0 = b.mn[2], y1 = b.mn[2] + b.sz[2], z0 = b.mn[1], z1 = b.mn[1] + b.sz[1];
    const E = 25;   // fasad qalinligi va tirqish
    if (x0 < fp.x0 - E || x1 > fp.x1 + E || y0 < fp.y0 - E || y1 > fp.y1 + E || z0 < (+p.z || 0) - 110 || z1 > (+p.z || 0) + p.h + 5) tash.push(o.name + '@' + p.frg);
    if (/fasad|двер|dver/i.test(o.name) || o.userProps.smart3d_joy && H.catalog[p.frg].parts.some(q => q.code === o.userProps.smart3d_detal.replace(/_\d+$/, '') && q.slot === 'fasad')) {
      /* fasad — modul oldida: orqa devor chizig'idan ≥ d − 5 */
      const r = ((+p.rot || 0) % 360 + 360) % 360, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const chuqur = r === 0 ? cy - fp.y0 : r === 180 ? fp.y1 - cy : r === 90 ? fp.x1 - cx : cx - fp.x0;
      if (chuqur < p.d - 5) fasadXato.push(o.name + '@' + p.frg + ' ' + Math.round(chuqur));
    }
  });
  ok(`${X.n}: har panel o'z modulining izida`, !tash.length, tash.slice(0, 4).join(', '));
  ok(`${X.n}: fasadlar modul oldida (xona tomonda)`, !fasadXato.length, fasadXato.slice(0, 4).join(', '));
}

/* ══ 3) umumiy modullar — 3D model bilan ══ */
console.log('\n[3] Umumiy modullar — 3D model bilan (modelda yo\'q detal — navbat, "geometriya tekshirilmagan")');
const UM = Object.values(H.catalog).filter(f => !/^MC-/.test(f.code) && (f.parts || []).length && f.category !== 'bazis');
let umP = 0, umModel = 0, umNavbat = 0, umOlcham = 0, umXato = [];
for (const f of UM) {
  const bpj = bpjOf([{ id: 'u1', frg: f.code, x: 0, y: 0, z: 0, w: f.w, d: f.d, h: f.h, rot: 0, qty: 1 }]);
  const imp = bazisImport(bpj);
  const ti = tekshirImport(f.code, bpj, imp);
  if (!(ti.tr && !ti.xato.length && ti.n === bpj.objects.length)) umXato.push(f.code);
  umP += ti.n; umModel += bpj.smart3d.joy.model; umNavbat += bpj.smart3d.joy.navbat;
  /* modeldan joy olganlar — 3D panel bilan bir xil markazda (qalinlik — BPJ dagidek, korpus detali materialidan) */
  const cp = cutlist(f, f.w, f.d, f.h, H.materials, {}).parts;
  const asm = getModulePanels(f, f.w, f.d, f.h, { thickness: (cp.find(x => x.slot === 'korpus') || cp[0]).thickness }).panels;
  const OFF = bpj.smart3d.offsetX;
  imp.boxes.forEach((b, i) => {
    const o = bpj.objects[i];
    if (o.userProps.smart3d_joy !== 'model') return;
    const c = [OFF - (b.mn[0] + b.sz[0] / 2) - f.w / 2, b.mn[2] + b.sz[2] / 2 - f.d / 2, b.mn[1] + b.sz[1] / 2 - f.h / 2];
    const srt = (a) => a.map(v => Math.round(Math.abs(v))).sort((x, y) => x - y);
    const ozi = srt([o.dimensions.dl, o.dimensions.dw, o.dimensions.dp]);
    const teng = asm.filter(q => q.code === o.userProps.smart3d_model && srt([q.w, q.d, q.h]).every((v, k) => Math.abs(v - ozi[k]) <= 1));
    if (!teng.length) { umOlcham++; return; }          // kesim o'lchami 3D modeldan farqli — TZ-05 (geometriya tekshirilmagan)
    if (!teng.some(q => Math.abs(q.x - c[0]) <= 1 && Math.abs(q.y - c[1]) <= 1 && Math.abs(q.z - c[2]) <= 1)) umXato.push(f.code + ':' + o.name);
  });
}
ok(`${UM.length} umumiy modul — import xatosiz; 3D modeldan joy olgan ${umModel} panel model bilan bir joyda`, !umXato.length, umXato.slice(0, 6).join(', '));
console.log(`  · umumiy modullar: ${umP} panel — modeldan ${umModel} (shundan ${umOlcham} tasining kesim o'lchami 3D modeldan farqli), navbat ${umNavbat} (${Math.round(umNavbat / Math.max(1, umP) * 100)}%) — TZ-05 gacha "geometriya tekshirilmagan"`);

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
