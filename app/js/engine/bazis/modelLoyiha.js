/* Smart3D engine/bazis/modelLoyiha.js — .b3d yozuvchining YAGONA panel-joy manbasi: SketchUp eksporti modeli (eksportModeli).
 *
 * Nima uchun: oldin .b3d panel joyini BPJ (buildBPJ) berar edi — u umumiy (SP) modullarda kesim ro'yxati detallarini 3D panellarga
 * taxminiy moslab (takePanel, bo'lmasa "navbat") joylar edi, 3D da chizilgan modul bilan mos kelmasdi (garderob eshiklari korpusdan
 * tashqarida, polkalar tarqoq, trimo yig'ilmagan). SketchUp eksporti esa panel qutisini 3D modeldan (kesim ro'yxati qutilari
 * teshik3d/joyQutilar yoki assembler 3D panellari) oladi va to'g'ri chiqadi. Endi .b3d ham aynan shu modeldan yoziladi.
 *
 * Kirish (eksportModeli natijasi, mm, Smart3D o'qlari — Z yuqori):
 *   modul: { id, kod, nom, olcham: [w, d, h], t: [x, y, z], rot (gradus, Z atrofida), qty,
 *            detallar: [{ nom, ref?, min: [x, y, z], s: [sx, sy, sz], atr }], furnitura: [{ nom, t, m: [X, Y, Z] }], joysiz: [{ nom, soni }] }
 *   min — modul burchagidan (lokal x — eni, y — chuqurligi, z — bo'yi); dunyoga: (x, y, z, rot) — OBJ/SketchUp eksportidagidek.
 * Chiqish — b3dYoz() kirishi (Bazis o'qlarida, panel joyi global: pos + [AxisX, AxisY, AxisZ]).
 *
 * O'qlar (TZ-17, 77/77 panel haqiqiy BPJ bilan aynan; loyiha.js bilan bir xil): Bazis X = OFF − x, Y = z (yuqori), Z = y (chuqurlik)
 *   — burilish, ko'zgu emas; OFF — barcha X ≥ 0 bo'lishi uchun (butun son). Panel ramkasi: origin = kontur (0,0) burchagi va qalinlik
 *   boshlanadigan yuz, AxisX — dl bo'ylab, AxisY — dw bo'ylab, AxisZ — qalinlik (o'ng qo'l) — bpj.js panelRamka() bilan bir xil,
 *   shuning uchun kromka elemIndex (0 — F/pastki, 1 — o'ng, 2 — yuqori, 3 — chap) BPJ dagidek qoladi.
 * Detal ma'lumoti (nom, material, kromka): kesim ro'yxati detali (ref bo'yicha, bo'lmasa o'lchami ±1 mm) — bo'lsa o'shandan; bo'lmasa
 *   modeldagi nom/material, kromka yo'q (3D panelda kromka noma'lum).
 */
import { panelRamka, defsFromCutlist, defButts, edgeNomlari } from '../bpj.js';

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r4 = (x) => Math.round(x * 10000) / 10000;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const srt = (a) => a.slice().sort((x, y) => x - y);


/**
 * 3D da butun modul bitta massiv quti bo'lib chizilgan (assembler da batafsil modeli yo'q: komod, kir yotoq, toshqin, divan quti …),
 * lekin kesim ro'yxatida standart karkas detallari bor (yon×2, ust, past, orqa, shift*, eshik*) — Bazis'ga massiv quti emas, yig'ilgan
 * karkas yoziladi: tashqi gabarit 3D dagi quti bilan bir xil, detallar kesim ro'yxati o'lchamida, ichida joyida:
 *   past z=0, ust z=h−t, yon x=0 va x=w−t (z=t..h−t), shift — yon devorlar orasida teng oraliqda, orqa y=0 (3 mm), eshik — old tomonda (y=d, 3D
 *   dagi SP garderob eshiklari kabi gabaritdan 16 mm oldinga), teng oraliqda. Qoidalarga mos kelmasa (boshqa detallar, o'lcham mos emas) — null (quti qoladi).
 * @returns {Array|null} detallar (eksportModeli detalidek: min, s) + _def
 */
function karkasYig(m, defs) {
  const [w, d, h] = m.olcham, dets = m.detallar || [];
  if (dets.length !== 1 || !defs.length) return null;
  const b = dets[0];
  if (Math.abs(b.s[0] - w) > 1 || Math.abs(b.s[1] - d) > 1 || Math.abs(b.s[2] - h) > 1 || b.min.some(v => Math.abs(v) > 1)) return null;   // quti butun gabarit emas
  const roli = (x) => /^yon$|^yon\d*$/.test(x.code) ? 'yon' : /^ust\d*$/.test(x.code) ? 'ust' : /^past\d*$/.test(x.code) ? 'past' : /^orqa\d*$/.test(x.code) ? 'orqa'
    : /^shift\d*$/.test(x.code) ? 'shift' : /^eshik\d*$/.test(x.code) ? 'eshik' : null;
  const G = { yon: [], ust: [], past: [], orqa: [], shift: [], eshik: [] };
  for (const x of defs) { const r = roli(x); if (!r) return null; G[r].push(x); }
  if (G.yon.length !== 2 || G.ust.length !== 1 || G.past.length !== 1 || G.orqa.length > 1) return null;
  const t = G.yon[0].thickness, near = (a, v) => Math.abs(a - v) <= 2;
  if (!(near(G.past[0].finL, w) && near(G.past[0].finW, d) && near(G.ust[0].finL, w) && near(G.yon[0].finL, h - 2 * t) && near(G.yon[0].finW, d))) return null;
  const out = [], put = (def, min, s) => out.push({ nom: def.nom, ref: null, min: min.map(r1), s: s.map(r1), atr: {}, _def: def });
  put(G.past[0], [0, 0, 0], [G.past[0].finL, G.past[0].finW, G.past[0].thickness]);
  put(G.ust[0], [0, 0, h - G.ust[0].thickness], [G.ust[0].finL, G.ust[0].finW, G.ust[0].thickness]);
  G.yon.forEach((y, i) => put(y, [i ? w - y.thickness : 0, 0, G.past[0].thickness], [y.thickness, y.finW, y.finL]));
  if (G.orqa[0]) put(G.orqa[0], [0, 0, 0], [G.orqa[0].finL, G.orqa[0].thickness, G.orqa[0].finW]);
  const n = G.shift.length;
  if (n) {
    const tt = G.shift[0].thickness, gap = (h - G.past[0].thickness - G.ust[0].thickness - n * tt) / (n + 1);
    G.shift.forEach((x, k) => put(x, [t, 0, G.past[0].thickness + gap * (k + 1) + tt * k], [x.finL, x.finW, x.thickness]));
  }
  const e = G.eshik.length;
  if (e) {
    const fw = G.eshik[0].finW, g = (w - e * fw) / (e + 1);
    G.eshik.forEach((x, k) => put(x, [g * (k + 1) + fw * k, d, (h - x.finL) / 2], [x.finW, x.thickness, x.finL]));
  }
  return out;
}

/**
 * @param {Object} model — eksportModeli() natijasi
 * @param {{ catalog?: Object, materials?: Object, cutlists?: Array, nom?: string }} o
 * @returns {{ nom: string, modullar: Array, ogoh: string[], OFF: number }} — OFF: Bazis X = OFF − x (Smart3D dunyo) ga qaytish uchun
 */
export function modeldanLoyiha(model, o = {}) {
  const catalog = o.catalog || {}, materials = o.materials || {};
  const edgeNames = edgeNomlari(materials);
  const matByCode = {};
  for (const m of materials.panel_materials || []) matByCode[m.code] = m;
  const clById = new Map();
  for (const cl of o.cutlists || []) if (cl && cl.placementId != null) clById.set(cl.placementId, cl);
  const ogoh = [];

  /* 1) dunyo (Smart3D) ramkalari */
  const moduls = [];
  for (const m of (model && model.modullar) || []) {
    const frag = catalog[m.kod] || null, cl = clById.get(m.id) || null;
    /* texnika (muzlatkich, plita …) — kesim ro'yxatida detal yo'q, ishlab chiqarilmaydi: Bazis'ga panel bo'lib yozilmaydi (BPJ ham shunday o'tkazib yuborardi) */
    if (cl && !(cl.parts && cl.parts.length)) { ogoh.push(m.kod + ': kesim detali yo\'q (texnika) — o\'tkazib yuborildi'); continue; }
    const [w, d, h] = m.olcham, [ox, oy, oz] = m.t;
    const rad = (m.rot || 0) * Math.PI / 180, cs = Math.round(Math.cos(rad) * 1e12) / 1e12, sn = Math.round(Math.sin(rad) * 1e12) / 1e12;
    const dunyo = (l) => [ox + l[0] * cs - l[1] * sn, oy + l[0] * sn + l[1] * cs, oz + l[2]];                  // modul burchagidan → dunyo
    const dirD = (v) => [v[0] * cs - v[1] * sn, v[0] * sn + v[1] * cs, v[2]];
    const defs = cl && cl.parts && cl.parts.length ? defsFromCutlist(cl, matByCode, '', 16, frag || {}) : [];
    const byRef = new Map();
    (cl && cl.parts || []).forEach((p, i) => { if (p.ref) byRef.set(p.ref, defs[i]); });
    const band = new Set();
    const panellar = [];
    const karkas = karkasYig(m, defs);
    for (const D of karkas || m.detallar || []) {
      if (Math.min(...D.s) < 2) continue;      // 3D dagi belgi (masalan stol oyog'i 50×50×1 mm) — detal emas
      let def = D._def || (D.ref ? byRef.get(D.ref) : null);
      if (def) band.add(def);
      if (!def) {      /* ref yo'q (3D panel) — o'lchami ±1 mm teng bo'sh kesim detali */
        const A = srt(D.s);
        def = defs.find(x => !band.has(x) && srt([x.finL, x.finW, x.thickness]).every((v, i) => Math.abs(v - A[i]) <= 1)) || null;
        if (def) band.add(def);
      }
      const A = srt(D.s), th = def ? def.thickness : r1(A[0]);
      const dl0 = def ? def.finL : A[2], dw0 = def ? def.finW : A[1];
      const C = [D.min[0] + D.s[0] / 2 - w / 2, D.min[1] + D.s[1] / 2 - d / 2, D.min[2] + D.s[2] / 2 - h / 2];   // modul markazidan
      const rl = panelRamka(C, D.s, dl0, dw0, th);
      const ex = rl.x, ey = rl.y, ez = rl.z;
      const dl = r1(Math.abs(dot(D.s, ex))), dw = r1(Math.abs(dot(D.s, ey))), dp = r1(Math.abs(dot(D.s, ez)));
      const matKod = (D.atr && D.atr.material_kodi) || '';
      const material = def ? def.material : ((matByCode[matKod] && matByCode[matKod].name) || (D.atr && D.atr.material) || matKod || '');
      const kromka = def ? defButts(def, frag, dl, dw, edgeNames).map(b => ({ elem: b.elemIndex, nom: b.material, qalinlik: b.thickness })) : [];
      /* burchak (o) — modul markazi koordinatalarida: burchakka o'tkazamiz (+ w/2, d/2, h/2) */
      const o0 = dunyo([rl.o[0] + w / 2, rl.o[1] + d / 2, rl.o[2] + h / 2]);
      panellar.push({ nom: (def && def.nom) || D.nom || 'detal', dl, dw, dp, material, kromka, _o: o0, _x: dirD(ex), _y: dirD(ey), _z: dirD(ez) });
    }
    const furn = (m.furnitura || []).map(f => ({ nom: f.nom, soni: 1, _o: dunyo(f.t), _ax: f.m && f.m.length === 3 ? f.m.map(dirD) : null }));
    for (const j of m.joysiz || []) furn.push({ nom: j.nom, soni: Math.max(1, Math.round(+j.soni || 1)) });
    moduls.push({ nom: m.nom, panellar, furn, qty: Math.max(1, Math.round(+m.qty || 1)) });
  }

  /* 2) Bazis o'qlari: X = OFF − x, Y = z, Z = y */
  let maxX = 0;
  for (const M of moduls) for (const p of M.panellar) {
    for (let k = 0; k < 8; k++) {
      const x = p._o[0] + ((k & 1) ? p.dl * p._x[0] : 0) + ((k & 2) ? p.dw * p._y[0] : 0) + ((k & 4) ? p.dp * p._z[0] : 0);
      if (x > maxX) maxX = x;
    }
  }
  const OFF = Math.ceil(maxX);
  const bz = (v) => [r3(OFF - v[0]), r3(v[2]), r3(v[1])];
  const bzDir = (v) => [r4(-v[0]) || 0, r4(v[2]) || 0, r4(v[1]) || 0];

  const modullar = [];
  for (const M of moduls) {
    const panellar = M.panellar.map(p => ({ nom: p.nom, dl: p.dl, dw: p.dw, dp: p.dp, material: p.material, kromka: p.kromka,
      pos: bz(p._o), oq: [bzDir(p._x), bzDir(p._y), bzDir(p._z)] }));
    const furnitura = M.furn.map(f => f._o ? { nom: f.nom, soni: 1, pos: bz(f._o), oq: f._ax ? f._ax.map(bzDir) : null } : { nom: f.nom, soni: f.soni });
    for (let n = 0; n < M.qty; n++) modullar.push({ nom: M.nom, panellar, furnitura });
  }
  if (!modullar.length) ogoh.push('modul yo\'q');
  return { nom: o.nom || 'Smart3D', modullar, ogoh, OFF };
}
