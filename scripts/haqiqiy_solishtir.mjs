/* haqiqiy_solishtir.mjs — TZ-47 (1-bosqich: TAHLIL): bizning narx hisobi ↔ ERP dagi HAQIQIY sotuv, komponentlar bo'yicha.
 *
 * Har buyurtma (haqiqiy-buyurtmalar-2026-10-22.json: ERP sotuv qatorlari) uchun:
 *   1) Bazis .b3d ni ilovadagi YO'L bilan o'qiydi: daraxt → generateSpecification → bazisLoyiha (bazis/loyiha.js, bazis/teshik.js);
 *   2) Bazis plita guruhlarini HAQIQIY sotilgan ERP plitasiga moslaydi (GibLab natijalari + dekor nomi + detal soni; usuli har guruhda yoziladi);
 *   3) web/src/services/hisob.js createHisob().recalc — saytdagi bilan BIR XIL hisob (cutlist → nestProject → productionCost,
 *      sukut stavkalar narxSukut, plita narxi = ERP display_price_uzs = tannarx);
 *   4) ERP sotuv bilan solishtiradi: (a) har SKU varaq soni (biz / ERP / GibLab), (b) kromka metr turlar bo'yicha, (c) raspil list soni,
 *      (d) prisadka turlari soni, (e) Bazis xizmati, (f) jami: tannarx (ustamasiz) va 35% li mijoz narxi — ERP sotuv va price_list_uzs bilan.
 * Mavjud kod va ma'lumot fayllari O'ZGARMAYDI; faqat o'qiydi. Natija: jadvallar (yoki --json / --md).
 * Maxfiy paket (Smart3D_toplam_2026-10-16, Smart3D_malumot) repoda YO'Q: asosiy repo papkasidan o'qiladi (SMART3D_ASOSIY=… bilan almashtiriladi);
 * yo'q bo'lsa — o'tkazib yuboriladi (exit 0). Chiqishda mijoz ismi/telefoni yo'q — faqat buyurtma id.
 *
 * Aniqlik haqida (qoida 4.3 — taxmin qilinmaydi): moslash usuli har Bazis guruhida ko'rsatiladi (nom / soni / ortiqcha); ERP da bo'lmagan qator
 * (HDF, stoleshnitsa, mijoz plitasi) "ERP'da yo'q" deb alohida ajratiladi; o'lchanmagan narsa "—" yoki "o'lchanmadi".
 * Ishlatish: node scripts/haqiqiy_solishtir.mjs [--id=3877,4034] [--json] [--md] [--qisqa] [--tafsilot]   (--qisqa: faqat q, f2, g3, h, i, j, j2 bo'limlari)
 *   env -u NODE_ENV node …  (NODE_ENV=production bo'lsa ham ishlaydi — dev bog'liqlik kerak emas)
 * Chiqish bo'limlari: 0 moslash · a SKU varaq (+a2 raskroy algoritmi) · b kromka · c raspil · d prisadka · e Bazis · f jami (+f2 avtomoslash) ·
 *   g/g2/g3/g4 farq sabablari · h o'rtacha/mediana |xato| · i eng katta 10 chetlanish · j/j2 narx siyosati va maxsus narxlar · k tekshiruv */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
globalThis.SpPrice = globalThis.SpPrice || require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const { daraxt } = await import('../app/js/engine/bazis/daraxt.js');
const B = await import('../app/js/engine/bazis/b3d.js');
const { bazisLoyiha, materiallarniQosh } = await import('../app/js/engine/bazis/loyiha.js');
const { nestProject } = await import('../app/js/engine/nesting.js');
const { nomTahlil, nomFormati, bazisniERPga } = await import('../app/js/engine/plitaMoslash.js');
const { narxSukut, kromkaOlchamKaliti } = await import('../app/js/engine/narxStavka.js');
const { bazisAlmash } = E;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASOSIY = process.env.SMART3D_ASOSIY || join(ROOT, '..', 'Smart3D');
const PAKET = process.env.SMART3D_TOPLAM || join(ASOSIY, 'Smart3D_toplam_2026-10-16');
const MALUMOT = process.env.SMART3D_MALUMOT || join(ASOSIY, 'Smart3D_malumot');
const F_BUYURTMA = join(MALUMOT, 'haqiqiy-buyurtmalar-2026-10-22.json');
const F_MAHSULOT = join(MALUMOT, 'erp-mahsulotlar-2026-10-22.json');
const F_XLSX = join(PAKET, '06_kroy_natijalari', 'GibLab_kroy_natijalari_30.xlsx');
const D_BAZIS = join(PAKET, '01_buyurtma_fayllari', '04_bazis');
const D_KDT = join(PAKET, '01_buyurtma_fayllari', '02_kromka_prisadka');
const D_ARRA = join(PAKET, '01_buyurtma_fayllari', '01_arra');
const DATA = join(ROOT, 'app/data/');

const ARGS = process.argv.slice(2);
const FLAG = (n) => ARGS.includes('--' + n);
const ARG_ID = ((ARGS.find(a => a.startsWith('--id=')) || '').slice(5).split(',').filter(Boolean));
const JSON_OUT = FLAG('json'), MD = FLAG('md'), TAFSILOT = FLAG('tafsilot'), QISQA = FLAG('qisqa');

if (![F_BUYURTMA, F_MAHSULOT, F_XLSX, D_BAZIS].every(existsSync)) {
  console.log("o'tkazib yuborildi: maxfiy paket yo'q (Smart3D_malumot / Smart3D_toplam_2026-10-16) — SMART3D_ASOSIY=<asosiy repo papkasi> bilan ko'rsating");
  process.exit(0);
}

/* ───────────────────────── yordamchilar ───────────────────────── */
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
const r0 = (x) => Math.round(x), r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const sum = (a) => a.reduce((s, x) => s + x, 0);
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const soM = (n) => (n == null || !isFinite(n) ? '—' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
const pct = (b, e) => (e > 0 ? (b - e) / e * 100 : null);
const pS = (p) => (p == null || !isFinite(p) ? '—' : (p > 0 ? '+' : '') + Math.round(p) + '%');
const med = (a) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const avg = (a) => { const s = a.filter(x => x != null && isFinite(x)); return s.length ? sum(s) / s.length : null; };
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);

/* ───────────────────────── ERP ma'lumotlari ───────────────────────── */
const buyurtmalar = J(F_BUYURTMA).buyurtmalar.filter(b => (b.mahsulot && b.mahsulot.length) || (b.xizmat && b.xizmat.length));
const mahsulotIdx = new Map();   // sku|nom → ERP mahsulot (display_price_uzs = tannarx, price_list_uzs = sotuv narxi ro'yxati)
for (const p of J(F_MAHSULOT)) {
  const k = String(p.sku || '').trim() + '|' + String(p.name || '').trim();
  const eski = mahsulotIdx.get(k);
  if (!eski || (!(eski.display_price_uzs > 0) && p.display_price_uzs > 0)) mahsulotIdx.set(k, p);
}
const thNomdan = (nom, p) => { const m = /(\d+(?:[.,]\d+)?)\s*(?:мм|mm)(?![а-яёa-z])/i.exec(nom); return m ? parseFloat(m[1].replace(',', '.')) : (p && +p.thickness) || 16; };
const turNomdan = (nom) => (/лхдф|хдф/i.test(nom) ? 'HDF' : /лмдф/i.test(nom) ? 'LMDF' : /акрил/i.test(nom) ? 'AKRIL' : /(?<![а-яё])мдф/i.test(nom) ? 'MDF' : 'LDSP');

/** ERP sotuvi (bitta buyurtma) → komponentlar */
function erpTahlil(b) {
  const o = { id: String(b.id), plita: [], hdf: [], stol: [], kromkaMat: [], raspil: [], kromka: {}, prisadka: {}, bazis: { qty: 0, amt: 0, nom: [] }, hujjat: 0, satr: 0, saleTotal: 0 };
  for (const m of b.mahsulot || []) {
    const p = mahsulotIdx.get(String(m.sku || '').trim() + '|' + String(m.product_name || '').trim()) || null;
    const q = { nom: m.product_name, sku: m.sku, qty: +m.quantity, narx: +m.price_uzs, jami: +m.total_uzs, tannarx: p && p.display_price_uzs > 0 ? p.display_price_uzs : null, royxat: p && p.price_list_uzs > 0 ? p.price_list_uzs : null, p };
    o.satr += q.jami;
    if (/^Кромка/i.test(m.product_name)) o.kromkaMat.push(q);
    else if (/Столешница/i.test(m.product_name)) o.stol.push(q);
    else if (/лхдф|хдф/i.test(m.product_name)) o.hdf.push(q);
    else o.plita.push(q);
  }
  for (const x of b.xizmat || []) {
    o.hujjat++; o.saleTotal += +x.sale_total || 0;
    for (const it of x.items || []) {
      const nom = it.service_name, qty = +it.quantity, amt = +it.total, narx = +it.unit_price;
      o.satr += amt;
      let m;
      if ((m = /Распил[аы]?\s+(Столешница)/i.exec(nom))) { o.stol.push({ nom, qty, jami: amt, narx, xizmat: true, tannarx: null, royxat: null }); continue; }   // stoleshnitsa raspili (xizmat)
      if ((m = /Распила?\s+(Holzma|Altendorf)\s*(\d)/i.exec(nom))) { o.raspil.push({ nom, stanok: m[1], daraja: +m[2], qty, amt, narx }); continue; }
      if (/ПВХ/i.test(nom)) { const k = kromkaOlchamKaliti(nom) || '?'; const e = o.kromka[k] || (o.kromka[k] = { m: 0, amt: 0, narx: [] }); e.m += qty; e.amt += amt; e.narx.push(narx); continue; }
      if (/^Bazis/i.test(nom)) { o.bazis.qty += qty; o.bazis.amt += amt; o.bazis.nom.push(nom + '×' + qty); continue; }
      if (/ПРИСАДКА|Присадка/.test(nom)) {
        const T = /ЕВРО/i.test(nom) ? 'konfirmat_yuza' : /ПЕТЛЕ/i.test(nom) ? 'petlya' : /ПОЛКАДЕРЖ/i.test(nom) ? 'polka' : /МЕТКА/i.test(nom) ? 'belgi'
          : /РУЧКА/i.test(nom) ? 'ruchka' : /ШКАНТ/i.test(nom) ? 'shkant' : /ЭКС[ЕЦ]+РТРИК|ЭКСЦЕНТРИК/i.test(nom) ? 'eksentrik' : /ОВАЛ/i.test(nom) ? 'oval' : /Паз/i.test(nom) ? 'paz' : '?' + nom;
        const e = o.prisadka[T] || (o.prisadka[T] = { qty: 0, amt: 0, narx: [] }); e.qty += qty; e.amt += amt; e.narx.push(narx); continue;
      }
      o.noma_lum = (o.noma_lum || []).concat(nom); o.noma_lumSum = (o.noma_lumSum || 0) + amt;
    }
  }
  const sumPl = (a) => sum(a.map(x => x.jami));
  o.kromkaM = sum(Object.values(o.kromka).map(x => x.m));
  o.ovalPazSum = sum(['oval', 'paz'].map(t => (o.prisadka[t] || {}).amt || 0));
  o.qismlar = {   // mijoz-narx bo'yicha qismlar (yig'indisi = sotuv jami)
    plita: sumPl(o.plita), hdf: sumPl(o.hdf), stol: sumPl(o.stol.filter(x => !x.xizmat)), kromka: sumPl(o.kromkaMat) + sum(Object.values(o.kromka).map(x => x.amt)),
    raspil: sum(o.raspil.map(x => x.amt)) + sumPl(o.stol.filter(x => x.xizmat)), prisadka: sum(Object.values(o.prisadka).map(x => x.amt)), bazis: o.bazis.amt, boshqa: o.noma_lumSum || 0
  };
  o.tekshiruv = { saleTotal: o.saleTotal, satrYigindi: o.satr, farq: o.satr - o.saleTotal };
  /* ERP ning o'zi tannarx / price_list bo'yicha: faqat PLITA-turdagi mahsulotlar (plita, HDF, stol) qayta narxlanadi, qolgan satrlar sotuvdagidek */
  const plitaQator = [...o.plita, ...o.hdf, ...o.stol.filter(x => !x.xizmat)];
  const qaytaNarx = (f) => o.saleTotal - sum(plitaQator.map(x => x.jami)) + sum(plitaQator.map(x => (x[f] != null ? x[f] * x.qty : x.jami)));
  o.sotuv = o.saleTotal; o.erpTannarx = qaytaNarx('tannarx'); o.erpRoyxat = qaytaNarx('royxat');
  return o;
}

/* ───────────────────────── GibLab (haqiqiy ishlatilgan varaqlar) ───────────────────────── */
function gibLabOqi() {
  const kod = `import sys, json\nsys.dont_write_bytecode = True\nsys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})\nfrom xlsx_oddiy import read_xlsx\nx = read_xlsx(sys.argv[1])\nprint(json.dumps({"mat": x.get("Material bo'yicha", []), "buy": x.get("Buyurtmalar", [])}))\n`;
  const x = JSON.parse(execFileSync('python3', ['-I', '-c', kod, F_XLSX], { encoding: 'utf8', timeout: 60000, maxBuffer: 1 << 26 }));
  const out = {};
  for (const r of x.mat.slice(1)) if (r && r[0] != null) (out[String(Math.round(r[0]))] = out[String(Math.round(r[0]))] || { rows: [], kromkaM: null, teshik: null }).rows.push({ nom: String(r[1] || ''), L: +r[2], W: +r[3], n: +r[4], det: +r[6] || 0 });
  for (const r of x.buy.slice(1)) if (r && r[0] != null) { const e = out[String(Math.round(r[0]))] || (out[String(Math.round(r[0]))] = { rows: [], kromkaM: null, teshik: null }); e.kromkaM = +r[5] || null; e.teshik = +r[6] || null; e.detalSoni = +r[3] || null; e.fayl = String(r[1] || ''); }
  return out;
}
/** GibLab qatorlari → haqiqiy materiallar (nom bo'yicha): varaq soni (to'liq + qoldiq ulushi), format, detal */
function haqiqiyMateriallar(gl) {
  const m = new Map();
  for (const r of (gl && gl.rows) || []) {
    const k = norm(r.nom);
    const e = m.get(k) || { nom: r.nom.trim(), qatorlar: [], det: 0 };
    e.qatorlar.push(r); e.det += r.det; m.set(k, e);
  }
  const out = [];
  for (const e of m.values()) {
    const eng = e.qatorlar.slice().sort((a, b) => b.L * b.W - a.L * a.W)[0];
    const nomF = nomFormati(e.nom);
    const F = nomF && e.qatorlar.some(r => Math.max(r.L, r.W) >= nomF[0] - 5 && Math.min(r.L, r.W) >= nomF[1] - 5) ? nomF : [Math.max(eng.L, eng.W), Math.min(eng.L, eng.W)];
    let tolaq = 0, ulush = 0;
    for (const r of e.qatorlar) {
      const L = Math.max(r.L, r.W), W = Math.min(r.L, r.W);
      if (L >= F[0] - 5 && W >= F[1] - 5) tolaq += r.n; else ulush += r.n * (L * W) / (F[0] * F[1]);
    }
    out.push({ nom: e.nom, det: e.det, varaq: tolaq + ulush, tolaq, qoldiqUlush: ulush, fmt: F, hdf: /хдф/i.test(e.nom), kls: /хдф/i.test(e.nom) ? 'hdf' : /18\s*мм|каштан|lege/i.test(e.nom) ? 18 : 16, sold: null });
  }
  return out;
}


/* ───────────────────────── GibLab .project: sexning ANIQ detal ro'yxati → bizning raskroy (faqat algoritm farqi) ───────────────────────── */
const NEST_DEF = (() => { const d = J(DATA + 'nesting-defaults.json'); delete d._meta; return d; })();
const atr = (tag) => { const o = {}; for (const m of tag.matchAll(/([\w.]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const xmlMatn = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** GibLab .project fayllari (har buyurtmada 1–3 ta: "_2" — sex qayta nomlagan oxirgi variant) → { nom → [{ id, length, width, qty, texture }] }
 *  (har material uchun kesish detallari). Material nomlari GibLab xlsx dagi bilan eng ko'p mos kelgan fayl tanlanadi. */
function gibLabDetallar(id, real) {
  const dir = existsSync(D_ARRA) && readdirSync(D_ARRA).find(x => x.startsWith(id + '_'));
  if (!dir) return null;
  let eng = null;
  for (const f of readdirSync(join(D_ARRA, dir)).filter(x => /\.project$/i.test(x))) {
    const buf = readFileSync(join(D_ARRA, dir, f));
    const enc = (/encoding="([^"]+)"/.exec(buf.subarray(0, 100).toString('latin1')) || [])[1] || 'utf-8';
    const t = new TextDecoder(enc).decode(buf);
    const prod = /<good typeId="product"[^>]*>([\s\S]*?)<\/good>/.exec(t);
    const detal = {};
    for (const m of (prod ? prod[1] : '').matchAll(/<part ([^>]*?)\/?>/g)) { const a = atr(m[1]); if (a.id) detal[a.id] = a; }
    const listlar = {};
    for (const m of t.matchAll(/<good typeId="sheet" ([^>]*)>/g)) { const a = atr(m[1]); if (a.id) listlar[a.id] = a; }
    const out = {};
    for (const m0 of t.matchAll(/<operation ([^>]*)>([\s\S]*?)<\/operation>/g)) {
      if (!/typeId="CS"/.test(m0[1])) continue;
      const m = [m0[0], m0[2]];
      const mat = (/<material id="(\d+)"/.exec(m[1]) || [])[1], sh = listlar[mat];
      if (!sh) continue;
      const nom = xmlMatn(sh.name);
      for (const pm of m[1].matchAll(/<part id="(\d+)"/g)) {
        const d = detal[pm[1]]; if (!d || +d.usedCount === 0) continue;
        (out[nom] = out[nom] || []).push({ id: 'g' + pm[1], length: +(d.cl || d.dl), width: +(d.cw || d.dw), qty: d.usedCount != null && d.usedCount !== '' ? +d.usedCount : (+d.count || 1), texture: d.txt === 'true' ? 'uzunlik' : 'erkin' });
      }
    }
    const mos = Object.keys(out).filter(n => real.some(r => norm(r.nom) === norm(n))).length;
    if (!eng || mos > eng.mos) eng = { fayl: f, materiallar: out, mos };
  }
  return eng;
}
/** shu detallarni GibLab listi formatida bizning nesting bilan: { nom → { soni, soni44, det } } (soni — ilovaning kerf=4, soni44 — GibLab arra qalinligi 4,4) */
function algoritmSinov(gd, real) {
  const out = {};
  for (const [nom, parts] of Object.entries((gd && gd.materiallar) || {})) {
    const r = real.find(x => norm(x.nom) === norm(nom));
    if (!r) continue;
    const mats = { panel_materials: [{ code: 'M', sheets: [r.fmt.slice()], sheet_price: 0 }] };
    const hamma = parts.map(p => Object.assign({}, p, { material: 'M' }));
    const run = (kerf, mode) => nestProject(hamma, mats, Object.assign({}, NEST_DEF, { kerf }, mode ? { mode } : {})).by_material.M;
    const tt = Date.now();
    const a = run(+NEST_DEF.kerf || 4);
    const vaqt = Date.now() - tt;
    const b = run(4.4), c = run(+NEST_DEF.kerf || 4, 'strip');
    out[norm(nom)] = { vaqt, soni: a.sheet_count, soni44: b.sheet_count, soniStrip: c.sheet_count, soniMin: Math.min(a.sheet_count, c.sheet_count), joyda: a.stats.placed_count, sigmadi: (a.unplaced || []).length, det: sum(parts.map(p => p.qty)), util: a.stats.utilization_pct, maydon: sum(parts.map(p => p.length * p.width * p.qty)) / 1e6 };
  }
  return out;
}

/* ───────────────────────── KDT (jismoniy teshiklar, ma'lumot uchun) ───────────────────────── */
const kdtTur = (tn, d, dp) => d === 3 || d === 2.5 ? 'belgi' : d === 35 ? 'petlya' : tn === 'H' && (d === 4.5 || d === 5) ? 'konfirmat_qirra'
  : tn === 'V' && (d === 6 || d === 7) && dp >= 12 ? 'konfirmat_yuza' : d === 5 && dp <= 12 ? 'polka' : d === 5 && dp >= 16 ? 'ruchka' : d === 15 ? 'eksentrik' : d === 8 ? 'shkant' : 'boshqa';
function kdtSana(id) {
  const dir = existsSync(D_KDT) && readdirSync(D_KDT).find(x => x.startsWith(id + '_')), c = {};
  if (!dir) return null;
  for (const f of readdirSync(join(D_KDT, dir)).filter(x => /\.xml$/i.test(x))) {
    for (const m of readFileSync(join(D_KDT, dir, f), 'utf8').matchAll(/<CAD>([\s\S]*?)<\/CAD>/g)) {
      const g = (k) => (m[1].match(new RegExp('<' + k + '>([^<]*)</' + k + '>')) || [])[1];
      if (!g('Diameter')) continue;
      const k = kdtTur((g('TypeName') || '?')[0], +g('Diameter'), +g('Depth')); c[k] = (c[k] || 0) + 1;
    }
  }
  return c;
}

/* ───────────────────────── Bazis → Smart3D ───────────────────────── */
const furnLinks = (J(DATA + 'furnitura-boglash.json').links) || {};
function bazisYukla(id) {
  const d = readdirSync(D_BAZIS).find(x => x.startsWith(id + '_'));
  const f = d && readdirSync(join(D_BAZIS, d)).find(x => /\.b3d$/i.test(x));
  if (!f) return null;
  const r = daraxt(new Uint8Array(readFileSync(join(D_BAZIS, d, f))), { inflate });
  const sp = B.generateSpecification(r.objects);
  const rs = bazisLoyiha(r.objects, { fayl: f, format: r.format, fittings: sp.fittings, fasteners: sp.fasteners, furnituraBoglash: furnLinks });
  return rs.xato ? null : rs;
}

/* ───────────────────────── Bazis plita guruhi → haqiqiy sotilgan SKU ───────────────────────── */
const dekorSozlar = (nom) => nomTahlil(nom).dekor.filter(w => !/^[\d#_]+$/.test(w));
const dekorTeng = (a, b) => { const x = dekorSozlar(a), y = dekorSozlar(b); return x.length > 0 && x.length === y.length && x.every((w, i) => w === y[i]); };
const sozKls = (nom, t, tur) => (tur === 'hdf' || /хдф/i.test(nom) ? 'hdf' : t >= 17 || /каштан|lege/i.test(nom) ? 18 : 16);

/** ERP mahsulot → erpQosh uchun "sheet" yozuvi (sheet-catalog.json shakli); narx = display_price_uzs (tannarx) */
function sheetYozuv(q, fmt) {
  const p = q.p || {};
  return { id: p.id || '', sku: q.sku, name: q.nom, th: thNomdan(q.nom, p), l: p.length > 100 ? p.length : fmt[0], w: p.width > 100 ? p.width : fmt[1], uzs: q.tannarx || 0, type: turNomdan(q.nom) };
}

function moslash(rs, erp, gl) {
  const maydonKod = {};
  for (const p of rs.fragment.parts) maydonKod[p.material_code] = (maydonKod[p.material_code] || 0) + (+p.len) * (+p.width) * p.qty / 1e6;
  const guruhlar = rs.materiallar.panel.map(m => ({ kod: m.code, nom: m.name, t: m.thickness, tur: m.tur, det: m.detal, maydon: maydonKod[m.code] || 0, kls: sozKls(m.name, m.thickness, m.tur) }));
  const real = haqiqiyMateriallar(gl);
  const sotilgan = [...erp.plita, ...erp.hdf].map((q, i) => Object.assign(q, { i, kls: sozKls(q.nom, thNomdan(q.nom, q.p), turNomdan(q.nom) === 'HDF' ? 'hdf' : 'ldsp') }));
  /* 1) haqiqiy (GibLab) material → sotilgan SKU: dekor nomi; keyin varaq soni yaqinligi (bir sinfda) */
  const soldBog = new Set();
  const bog = (r, q, usul) => { r.sold = q; r.soldUsul = usul; soldBog.add(q.i); };
  for (const r of real) {
    const mos = sotilgan.filter(q => !soldBog.has(q.i) && q.kls === r.kls && dekorTeng(r.nom, q.nom) && (nomTahlil(r.nom).maydon == null || nomTahlil(q.nom).maydon == null || nomTahlil(r.nom).maydon === nomTahlil(q.nom).maydon));
    if (mos.length) bog(r, mos[0], 'nom');
  }
  const juft = [];
  for (const r of real) if (!r.sold) for (const q of sotilgan) if (!soldBog.has(q.i) && q.kls === r.kls) juft.push([Math.abs(r.varaq - q.qty), r, q]);
  juft.sort((a, b) => a[0] - b[0]);
  for (const [, r, q] of juft) if (!r.sold && !soldBog.has(q.i)) bog(r, q, 'soni');
  /* 2) Bazis guruhi → haqiqiy material (dekor nomi, keyin detal soni) */
  const tayin = new Map();   // guruh kodi → { r, usul }
  const gHdf = guruhlar.filter(g => g.kls === 'hdf'), gPl = guruhlar.filter(g => g.kls !== 'hdf');
  const realHdf = real.filter(r => r.hdf), realPl = real.filter(r => !r.hdf);
  const olinganR = new Set();
  const juftG = [];
  for (const g of gPl) for (const r of realPl) juftG.push([(dekorTeng(g.nom, r.nom) ? 0 : 1e6) + Math.abs(g.det - r.det) + (g.kls === r.kls ? 0 : 5e5), g, r]);
  juftG.sort((a, b) => a[0] - b[0]);
  for (const [sc, g, r] of juftG) if (!tayin.has(g.kod) && !olinganR.has(r)) { tayin.set(g.kod, { r, usul: sc < 1e6 ? 'nom' : 'soni' }); olinganR.add(r); }
  for (const g of gPl) if (!tayin.has(g.kod) && realPl.length) {   // ortiqcha guruh → eng yaqin haqiqiy material (ko'p-bir)
    const eng = realPl.map(r => [(dekorTeng(g.nom, r.nom) ? 0 : 1e6) + Math.abs(g.det - r.det) + (g.kls === r.kls ? 0 : 5e5), r]).sort((a, b) => a[0] - b[0])[0];
    tayin.set(g.kod, { r: eng[1], usul: 'ortiqcha' });
  }
  for (const g of gHdf) if (realHdf.length) tayin.set(g.kod, { r: realHdf[0], usul: 'hdf' });
  /* GibLab yo'q (masalan 3975): sotilgan plita bilan bevosita */
  if (!real.length) {
    for (const g of gPl) { const mos = sotilgan.filter(q => q.kls === g.kls && dekorTeng(g.nom, q.nom)); if (mos.length === 1) tayin.set(g.kod, { r: { sold: mos[0], nom: mos[0].nom, fmt: null }, usul: 'nom' }); }
  }
  const natija = guruhlar.map(g => {
    const t = tayin.get(g.kod);
    if (t && t.r.sold) return { g, nishon: t.r.sold, usul: t.usul, real: t.r };
    if (t) return { g, nishon: 'mijoz', usul: t.usul + '/mijoz', real: t.r };   // haqiqiy material bor, lekin ERP da sotilmagan — mijoz materiali
    if (g.kls !== 'hdf' && !sotilgan.some(q => q.kls !== 'hdf') && !realPl.length) return { g, nishon: 'mijoz', usul: "sotuvda plita yo'q", real: null };
    return { g, nishon: null, usul: g.kls === 'hdf' ? "HDF sexda/sotuvda yo'q" : 'moslanmadi', real: null };
  });
  return { natija, real, sotilgan };
}

/* ───────────────────────── bizning hisob (saytdagi yo'l) ───────────────────────── */
async function yangiH() {
  const H = createHisob(await loadData((n) => Promise.resolve(J(DATA + n))));
  H.applyNarxlar(narxSukut(H.materials));
  return H;
}
const xona = { outline: [[0, 0], [5000, 0], [5000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] };

/** moslash natijasi bo'yicha hujjat → hisob. gibFormat — true bo'lsa har SKU ning varaq formati GibLab da ishlatilgan format (faqat varaq soni uchun) */
async function bizHisob(rs, ms, { gibFormat = false, avto = false } = {}) {
  const H = await yangiH();
  const doc = { v: 1, room: xona, placements: [{ id: 'bz1', frg: rs.fragment.code, name: 'bz', x: 500, y: 0, z: 0, w: rs.fragment.w, d: rs.fragment.d, h: rs.fragment.h, rot: 0, qty: 1 }],
    bazis: { fragment: rs.fragment, materiallar: JSON.parse(JSON.stringify(rs.materiallar)), hisobot: rs.hisobot, almash: {} }, xizmatlar: { teshik: true, bazis: 'onlayn' }, mijozMat: {} };
  /* stoleshnitsa (Bazis panel, material STOL…): ERP sotuvida stoleshnitsa mahsuloti bo'lmasa — mijoz materiali (narxga kirmaydi), aks holda ilova narxi */
  const stolKodlar = [...new Set(rs.fragment.parts.filter(p => /^STOL/.test(p.material_code || '')).map(p => p.material_code))];
  if (!ms.erpStol) for (const k of stolKodlar) doc.mijozMat[k] = true;
  const kodlar = new Map();   // sotilgan SKU indeksi → ERP material kodi
  for (const x of ms.natija) {
    if (x.nishon === 'mijoz') { doc.mijozMat[x.g.kod] = true; continue; }
    if (avto) {   // ilovaning o'z qoidasi (bazisMoslash): faqat bir qiymatli ("aniq") moslik qo'llanadi, qolgani — asosiy material (LDSP16 …) narxi
      if (x.avtoM && x.avtoM.holat === 'aniq') doc.bazis.almash[x.g.kod] = E.erpQosh(H, doc, x.avtoM.sheet);
      continue;
    }
    if (!x.nishon) continue;
    const fmt = (x.real && x.real.fmt) || [2750, 1830];
    const kod = E.erpQosh(H, doc, sheetYozuv(x.nishon, fmt));
    if (gibFormat && x.real && x.real.fmt) { const m = doc.erpMat[kod]; m.sheets = [x.real.fmt.slice()]; }
    doc.bazis.almash[x.g.kod] = kod; kodlar.set(x.nishon.i, kod);
  }
  H.catalog[rs.fragment.code] = bazisAlmash(rs.fragment, doc.bazis.almash, H.materials.panel_materials);   // TZ-47 (A): tekstura yangi material nomiga qarab
  materiallarniQosh(H.materials, doc.bazis.materiallar);
  const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16', orqaCode: 'HDF3' });
  return { r, doc, kodlar, H };
}

/** hisob natijasidan komponentlar */
function bizTahlil(res, ms, rs) {
  const { r, doc, kodlar } = res, P = r.prod, L = P.lines;
  const pl = (kod) => { const q = L.filter(l => l.code === kod && /^Plita/.test(l.group)); return { qty: sum(q.map(l => l.qty)), amt: sum(q.map(l => l.amount)), sigmadi: sum(q.map(l => (l.sigmadi ? l.sigmadi.soni : 0))), narx: (q[0] || {}).unit_price || 0, taxmin: q.filter(l => l.sigmadi).reduce((s, l) => s + l.qty, 0) }; };
  const sku = {};
  for (const [i, kod] of kodlar) sku[i] = pl(kod);
  const hdfKod = ms.natija.filter(x => x.g.kls === 'hdf' && !x.nishon).map(x => x.g.kod);   // sotuvga moslanmagan HDF — sukut narx
  const mijozKod = Object.keys(doc.mijozMat);
  const bazis = P.xizmat_taklif.bazis;
  const kromka = {}, prisadka = {};
  for (const l of L.filter(l => l.group === 'Kromka')) {
    const k = kromkaOlchamKaliti(l.name) || '?';
    const e = kromka[k] || (kromka[k] = { m: 0, mSof: 0, amt: 0 });
    e.m += l.qty; e.mSof += l.metr_sof; e.amt += l.amount;
  }
  for (const l of L.filter(l => /^hole:/.test(l.code))) { const k = l.code.slice(5); const e = prisadka[k] || (prisadka[k] = { qty: 0, amt: 0 }); e.qty += l.qty; e.amt += l.amount; }
  const raspil = L.filter(l => l.code === 'raspil'), yupqa = L.filter(l => l.code === 'raspil_yupqa');
  const plitaLines = L.filter(l => /^Plita/.test(l.group));
  const nonHdf = (l) => !/хдф/i.test(l.name) && l.code !== 'BZM-hdf' && !hdfKod.includes(l.code) && !((doc.erpMat || {})[l.code] && /хдф/i.test(doc.erpMat[l.code].name));
  const sheetAmt = (f) => sum(plitaLines.filter(f).map(l => l.amount));
  const sheetQty = (f) => sum(plitaLines.filter(f).map(l => l.qty));
  const mk = 1 + P.markupPct;
  return {
    sku, mijozKod, hdfKod,
    plitaVaraq: sheetQty(l => nonHdf(l) && !mijozKod.includes(l.code)), plitaVaraqHammasi: sheetQty(nonHdf), hdfVaraq: sheetQty(l => !nonHdf(l)),
    plitaSum: sum(plitaLines.filter(nonHdf).map(l => l.amount)), hdfSum: sheetAmt(l => !nonHdf(l)), mijozPlitaSum: sheetAmt(l => mijozKod.includes(l.code)),
    stolSum: sum(L.filter(l => l.group === 'Stoleshnitsa').map(l => l.amount)), stolDona: sum(L.filter(l => l.group === 'Stoleshnitsa').map(l => l.qty)),
    sigmadi: P.sigmadi.map(s => ({ kod: s.code, soni: s.soni, varaq: s.varaq })),
    kromka, kromkaM: sum(Object.values(kromka).map(x => x.m)), kromkaMsof: sum(Object.values(kromka).map(x => x.mSof)), kromkaSum: P.edgeCost,
    raspil2: sum(raspil.map(l => l.qty)), raspil1: sum(yupqa.map(l => l.qty)), raspilSum: P.raspilCost,
    prisadka, prisadkaSum: P.holeCost,
    bazis: { detal: bazis.qty, onlayn: bazis.onlayn, oflayn: bazis.oflayn, panel: rs.hisobot.panellar, hdfsiz: rs.hisobot.panellar - sum(rs.materiallar.panel.filter(m => m.tur === 'hdf').map(m => m.detal)) },
    furnSum: P.hwCost, narxsiz: P.missing.length,
    tannarx: P.totalCost, mijoz: P.clientTotal, tannarxFurnsiz: P.totalCost - P.hwCost,
    mijozFurnsiz: P.clientTotal - Math.round((P.sheetCost + P.hwCost) * mk) + Math.round(P.sheetCost * mk), ustama: P.markupPct, sheetCost: P.sheetCost
  };
}

/* ───────────────────────── asosiy ketma-ketlik ───────────────────────── */
const GL = gibLabOqi();
const natijalar = [], xatolar = [];
const t0 = Date.now();
for (const b of buyurtmalar) {
  const id = String(b.id);
  if (ARG_ID.length && !ARG_ID.includes(id)) continue;
  try {
    const erp = erpTahlil(b);
    const rs = bazisYukla(id);
    if (!rs) throw new Error('Bazis (.b3d) topilmadi yoki o\'qilmadi');
    const ms = moslash(rs, erp, GL[id]);
    ms.erpStol = erp.stol.some(x => !x.xizmat);
    const A = await bizHisob(rs, ms), Bx = await bizHisob(rs, ms, { gibFormat: true });
    const biz = bizTahlil(A, ms, rs), bizG = bizTahlil(Bx, ms, rs);
    /* ilovaning O'ZI (plitaMoslash.bazisniERPga, nom bo'yicha) shu Bazis materialini qaysi ERP plitasiga moslardi — sotilganga nisbatan */
    const sheets = A.H.sheetCatalog.sheets;
    for (const x of ms.natija) {
      const m = bazisniERPga({ name: x.g.nom, thickness: x.g.t, tur: x.g.tur }, sheets);
      const sotilgan = x.nishon && x.nishon !== 'mijoz' ? x.nishon : null;
      const teng = (sh) => sotilgan && norm(sh.name) === norm(sotilgan.nom) && norm(sh.sku) === norm(sotilgan.sku);
      x.avtoM = m;
      x.avto = !sotilgan ? (m.holat + ' (sotilgan yo\'q)') : m.holat === 'aniq' ? (teng(m.sheet) ? "aniq: TO'G'RI" : "aniq: NOTO'G'RI") : m.holat === 'nomzod' ? (m.nomzodlar.some(teng) ? `nomzod ${m.nomzodlar.length} (sotilgan ichida)` : `nomzod ${m.nomzodlar.length} (sotilgan ichida emas)`) : "yo'q";
    }
    /* ilovaning HOZIRGI avtomoslashi bilan jami (sotilgan SKU o'rniga) — "Bazis materialni noto'g'ri moslash" ta'sirini o'lchash uchun */
    const Av = await bizHisob(rs, ms, { avto: true });
    const bizA = bizTahlil(Av, ms, rs);
    const algo = algoritmSinov(gibLabDetallar(id, ms.real), ms.real);
    natijalar.push({ id, erp, gl: GL[id] || null, algo, real: ms.real, ms, biz, bizG, bizA, kdt: kdtSana(id), satrlar: A.r.prod.lines, nest: Object.entries(A.r.nest.by_material).map(([k, v]) => ({ kod: k, soni: v.sheet_count, L: v.sheet_length, W: v.sheet_width, util: v.stats && v.stats.utilization_pct, joy: v.stats && v.stats.placed_count, sigmadi: (v.unplaced || []).length })) });
  } catch (e) { xatolar.push(id + ': ' + (e && e.message)); }
}

/* ───────────────────────── hisoblangan solishtirish ───────────────────────── */
const TUR_NOM = { konfirmat_yuza: 'ЕВРО', petlya: 'ПЕТЛЕ', polka: 'ПОЛКАДЕРЖ', belgi: 'МЕТКА', ruchka: 'РУЧКА', shkant: 'ШКАНТ', eksentrik: 'ЭКСЦ', oval: 'ОВАЛ', paz: 'ПАЗ' };
const TURLAR = Object.keys(TUR_NOM);
for (const n of natijalar) {
  const { erp, biz, bizG } = n;
  const mk = 1 + biz.ustama;
  /* varaq: ERP sotilgan / GibLab / biz (sotuv SKU formatida va GibLab formatida), jami (HDF'siz) */
  n.varaq = { erp: sum(erp.plita.map(q => q.qty)), biz: sum(n.ms.sotilgan.filter(q => !q.kls || q.kls !== 'hdf').map(q => (biz.sku[q.i] || { qty: 0 }).qty)), bizG: sum(n.ms.sotilgan.filter(q => q.kls !== 'hdf').map(q => (bizG.sku[q.i] || { qty: 0 }).qty)),
    gib: n.real.length ? sum(n.real.filter(r => !r.hdf && r.sold).map(r => r.varaq)) : null, gibMijoz: sum(n.real.filter(r => !r.hdf && !r.sold).map(r => r.varaq)) };
  n.varaq.erpHdf = sum(erp.hdf.map(q => q.qty));
  n.varaq.gibHdf = n.real.length ? sum(n.real.filter(r => r.hdf).map(r => r.varaq)) : null;
  /* kromka */
  n.kromka = {};
  const keys = new Set([...Object.keys(erp.kromka), ...Object.keys(biz.kromka)]);
  for (const k of keys) n.kromka[k] = { erp: (erp.kromka[k] || {}).m || 0, bizSof: (biz.kromka[k] || {}).mSof || 0, biz: (biz.kromka[k] || {}).m || 0, erpSum: (erp.kromka[k] || {}).amt || 0, bizSum: (biz.kromka[k] || {}).amt || 0 };
  /* raspil */
  n.raspil = { erp2: sum(erp.raspil.filter(x => x.daraja >= 2).map(x => x.qty)), erp1: sum(erp.raspil.filter(x => x.daraja === 1).map(x => x.qty)), biz2: biz.raspil2, biz1: biz.raspil1, erpSum: erp.qismlar.raspil, bizSum: biz.raspilSum,
    stanok: [...new Set(erp.raspil.map(x => x.stanok + x.daraja))].join('/'), erpRaspilStavkada: sum(erp.raspil.map(x => x.qty * (x.daraja === 1 ? 25000 : 43000))) + sum(erp.stol.filter(x => x.xizmat).map(x => x.jami)) };
  /* prisadka */
  n.prisadka = {};
  for (const t of TURLAR) n.prisadka[t] = { erp: (erp.prisadka[t] || {}).qty || 0, biz: (biz.prisadka[t] || {}).qty || 0, erpSum: (erp.prisadka[t] || {}).amt || 0, bizSum: (biz.prisadka[t] || {}).amt || 0, kdt: n.kdt ? (n.kdt[t] || 0) : null };
  n.prisadkaEslatma = Object.keys(erp.prisadka).filter(t => t[0] === '?');
  /* Bazis xizmati */
  n.bazis = { erpQty: erp.bazis.qty, erpSum: erp.bazis.amt, erpNom: erp.bazis.nom.join(','), onlayn: biz.bazis.onlayn, oflayn: biz.bazis.oflayn, panel: biz.bazis.panel, hdfsiz: biz.bazis.hdfsiz, detal: biz.bazis.detal };
  /* qismlar (mijoz-narx): ERP ↔ biz; yig'indisi jami farqiga teng */
  const bizQ = { plita: r0(biz.plitaSum * mk), hdf: r0(biz.hdfSum * mk), stol: r0(biz.stolSum * mk), kromka: biz.kromkaSum, raspil: biz.raspilSum, prisadka: biz.prisadkaSum, bazis: biz.bazis.onlayn, furnitura: r0(biz.furnSum * mk) };
  n.qism = {};
  for (const k of ['plita', 'hdf', 'stol', 'kromka', 'raspil', 'prisadka', 'bazis']) n.qism[k] = { erp: erp.qismlar[k], biz: bizQ[k] || 0 };
  n.qism.furnitura = { erp: 0, biz: bizQ.furnitura };
  n.qism.boshqa = { erp: erp.qismlar.boshqa, biz: 0 };
  /* plita narx siyosati (ustama) ta'siri: ERP varaq sonida bizning tannarx×1.35 ↔ ERP sotuv narxi */
  const plitaERP = [...erp.plita, ...erp.hdf, ...erp.stol.filter(x => !x.xizmat)];
  n.siyosat = { erpTannarxKorsatma: sum(plitaERP.map(q => (q.tannarx != null ? q.tannarx * q.qty * mk : q.jami))), erpSotuv: sum(plitaERP.map(q => q.jami)) };
  n.siyosat.erpRoyxat = sum(plitaERP.map(q => (q.royxat != null ? q.royxat * q.qty : q.jami)));
  n.siyosat.farq = n.siyosat.erpTannarxKorsatma - n.siyosat.erpSotuv;
  n.jami = { erpSotuv: erp.sotuv, erpRoyxat: erp.erpRoyxat, erpTannarx: erp.erpTannarx, bizTannarx: biz.tannarxFurnsiz, bizMijoz: biz.mijozFurnsiz, bizTannarxFurnBilan: biz.tannarx, bizMijozFurnBilan: biz.mijoz, avtoTannarx: n.bizA.tannarxFurnsiz, avtoMijoz: n.bizA.mijozFurnsiz };
  /* plita narx siyosati va ERP o'rtacha ustama (sotuv/tannarx), price_list/tannarx */
  const ust = plitaERP.filter(q => q.tannarx > 0 && !q.xizmat);
  n.ustamaERP = { sotuv: ust.length ? sum(ust.map(q => q.jami)) / sum(ust.map(q => q.tannarx * q.qty)) - 1 : null, royxat: ust.filter(q => q.royxat).length ? sum(ust.filter(q => q.royxat).map(q => q.royxat * q.qty)) / sum(ust.filter(q => q.royxat).map(q => q.tannarx * q.qty)) - 1 : null };
}

/** SKU varaq farqining sababi (faqat o'lchanganidan; birinchi mos kelgan): [sinf, matn] */
function varaqSabab(n, q, r, bizQty) {
  if (!r) return ['olchanmadi', "GibLab yo'q (o'lchanmadi)"];
  const bazisM = sum(n.ms.natija.filter(x => x.nishon === q).map(x => x.g.maydon)), a = n.algo[norm(r.nom)];
  const maydonFarq = a && a.maydon > 0 ? (bazisM - a.maydon) / a.maydon : 0;
  const formatFarq = q.p && q.p.length && (Math.abs(q.p.length - r.fmt[0]) > 5 || Math.abs(q.p.width - r.fmt[1]) > 5) && !(r.fmt[0] === 2440 && r.fmt[1] === 1220);
  const m = [];
  if (r.qoldiqUlush > 0) m.push(['qoldiq', 'GibLab qoldiq (offcut) ishlatgan (' + r2(r.qoldiqUlush) + ' list ulushi) — ERP faqat yangi list sotadi']);
  if (formatFarq) m.push(['format', `format (sotilgan ${q.p.length}×${q.p.width}, kesilgan ${r.fmt.join('×')})`]);
  if (Math.abs(maydonFarq) > 0.04) m.push(['bazis-detal', `Bazis detal maydoni ${bazisM.toFixed(2)} ≠ GibLab ${a.maydon.toFixed(2)} m² (${pS(maydonFarq * 100)})`]);
  if (a && a.soni > r.varaq && !(r.qoldiqUlush > 0)) m.push(['nesting', `nesting: GibLab detallari bilan ham +${r2(a.soni - r.varaq)} list`]);
  if (Math.abs(r.varaq - q.qty) > 0.5) m.push(['sex-sotuv', `GibLab ${r2(r.varaq)} ≠ ERP ${q.qty}`]);
  if (!m.length) m.push(['kesim-royxati', "Bazis→kesim ro'yxati o'lchami/teksturasi GibLab dan farq qiladi (GibLab detallari bilan nesting teng)"]);
  return [m.map(x => x[0]).join('+'), m.map(x => x[1]).join('; ')];
}


/* ERP maxsus narxlar ("chegirma" maydoni hamma qatorda 0 — narx qo'lda tushiriladi): har qator nomi bo'yicha eng ko'p uchragan (mod) birlik narxdan farq */
{
  const qatorlar = [];
  for (const b of buyurtmalar) {
    const id = String(b.id);
    for (const m of b.mahsulot || []) qatorlar.push({ id, kalit: 'M|' + String(m.sku).trim() + '|' + String(m.product_name).trim(), narx: +m.price_uzs, qty: +m.quantity });
    for (const x of b.xizmat || []) for (const it of x.items || []) qatorlar.push({ id, kalit: 'X|' + String(it.service_name).trim().replace(/\s+/g, ' ') + '|' + it.unit, narx: +it.unit_price, qty: +it.quantity });
  }
  const mod = {};
  for (const k of new Set(qatorlar.map(x => x.kalit))) {
    const c = {};
    for (const x of qatorlar.filter(y => y.kalit === k)) c[x.narx] = (c[x.narx] || 0) + 1;
    const e = Object.entries(c).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    mod[k] = { narx: +e[0], son: e[1], jami: Object.values(c).reduce((a, b) => a + b, 0) };
  }
  for (const n of natijalar) {
    const q = qatorlar.filter(x => x.id === n.id && mod[x.kalit].jami >= 3 && mod[x.kalit].son >= 2);
    n.maxsusNarx = { farq: sum(q.map(x => (x.narx - mod[x.kalit].narx) * x.qty)), qator: q.filter(x => x.narx !== mod[x.kalit].narx).length, jami: q.length };
  }
}

/* mijoz narxi farqining (biz − ERP sotuv, furnitura'siz) AMALIY SABABLARGA bo'linishi — yig'indisi jami farqqa teng */
const PARCHA = [['siyosat', "plita ustama siyosati (tannarx×1,35 ↔ ERP sotuv narxi)"], ['plitaVaraq', 'LDSP/Kashtan/LEGE varaq soni'], ['hdfVaraq', "HDF varaq soni (ERP'da sotilgan)"], ['hdfYoq', "HDF: Bazis'da bor, ERP'da sotilmagan"], ['stol', 'stoleshnitsa (ilova narxi ↔ sotilgan)'], ['kromka', 'kromka (metr, tur, chiqit)'],
  ['raspilMiqdor', 'raspil list soni'], ['raspilStavka', 'raspil stavkasi (stanok: Altendorf/Holzma, maxsus narx)'], ['ovalPaz', "prisadka ОВАЛ/ПАЗ (modellanmagan)"], ['prisadka', 'prisadka (7 modellangan tur)'], ['bazis', 'Bazis xizmati'], ['boshqa', "boshqa (noma'lum ERP xizmat)"]];
for (const n of natijalar) {
  const q = n.qism, d = {};
  d.siyosat = n.siyosat.farq;
  const mk2 = 1 + n.biz.ustama, bizHdfSotuv = n.erp.hdf.length ? q.hdf.biz : 0;
  const atOur = (arr) => sum(arr.filter(x => !x.xizmat).map(x => (x.tannarx != null ? x.tannarx * x.qty * mk2 : x.jami)));
  d.plitaVaraq = q.plita.biz - atOur(n.erp.plita);
  d.hdfVaraq = bizHdfSotuv - atOur(n.erp.hdf);
  d.hdfYoq = n.erp.hdf.length ? 0 : q.hdf.biz;
  d.stol = q.stol.biz - atOur(n.erp.stol);
  d.kromka = q.kromka.biz - q.kromka.erp;
  d.raspilMiqdor = q.raspil.biz - n.raspil.erpRaspilStavkada;
  d.raspilStavka = n.raspil.erpRaspilStavkada - q.raspil.erp;
  d.ovalPaz = -n.erp.ovalPazSum;
  d.prisadka = q.prisadka.biz - (q.prisadka.erp - n.erp.ovalPazSum);
  d.bazis = q.bazis.biz - q.bazis.erp;
  d.boshqa = -q.boshqa.erp;
  d.jami = sum(PARCHA.map(([k]) => d[k]));
  d.haqiqiy = n.jami.bizMijoz - n.jami.erpSotuv;
  n.parcha = d;
}

/* ───────────────────────── statistika ───────────────────────── */
/** komponent × buyurtma: (biz − ERP)/ERP; ERP = 0 bo'lsa — baholanmaydi (alohida "ERP da yo'q" ro'yxati) */
const KOMP = [];
const komp = (nom, f) => KOMP.push({ nom, f });
komp('plita varaq (HDF\'siz, sotilgan SKU lar)', n => [n.varaq.biz, n.varaq.erp]);
komp('plita varaq (GibLab formatida)', n => [n.varaq.bizG, n.varaq.erp]);
komp('raskroy ALGORITMI: GibLab detallari (kerf 4) ↔ GibLab list', n => { const q = n.real.filter(r => n.algo[norm(r.nom)] && !r.hdf); return q.length ? [sum(q.map(r => n.algo[norm(r.nom)].soni)), sum(q.map(r => r.varaq))] : null; });
komp('raskroy ALGORITMI: GibLab detallari (kerf 4,4) ↔ GibLab list', n => { const q = n.real.filter(r => n.algo[norm(r.nom)] && !r.hdf); return q.length ? [sum(q.map(r => n.algo[norm(r.nom)].soni44)), sum(q.map(r => r.varaq))] : null; });
komp('raskroy ALGORITMI: min(bssf, strip) ↔ GibLab list', n => { const q = n.real.filter(r => n.algo[norm(r.nom)] && !r.hdf); return q.length ? [sum(q.map(r => n.algo[norm(r.nom)].soniMin)), sum(q.map(r => r.varaq))] : null; });
komp('HDF varaq (ERP sotuvida bor bo\'lsa)', n => (n.varaq.erpHdf > 0 ? [n.biz.hdfVaraq, n.varaq.erpHdf] : null));
komp('kromka m (hisobli, +8% chiqit)', n => [n.biz.kromkaM, n.erp.kromkaM]);
komp('kromka m (chizmadagi sof)', n => [n.biz.kromkaMsof, n.erp.kromkaM]);
komp('kromka m: GibLab (sex) m × 1,08 ↔ ERP (chiqit qoidasi sexga nisbatan)', n => (n.gl && n.gl.kromkaM ? [n.gl.kromkaM * 1.08, n.erp.kromkaM] : null));
komp('kromka m: Bazis chizmadagi sof ↔ GibLab (sex) m', n => (n.gl && n.gl.kromkaM ? [n.biz.kromkaMsof, n.gl.kromkaM] : null));
komp('detal soni: Bazis panel ↔ GibLab detal', n => (n.gl && n.gl.detalSoni ? [n.biz.bazis.panel, n.gl.detalSoni] : null));
komp('raspil list (LDSP, 2/3-daraja)', n => [n.raspil.biz2, n.raspil.erp2]);
komp('raspil list (HDF, 1-daraja)', n => (n.raspil.erp1 > 0 ? [n.raspil.biz1, n.raspil.erp1] : null));
for (const t of TURLAR.filter(t => t !== 'oval' && t !== 'paz')) komp('prisadka ' + TUR_NOM[t] + ' soni', n => (n.prisadka[t].erp > 0 ? [n.prisadka[t].biz, n.prisadka[t].erp] : null));
komp('prisadka jami so\'m (modellangan 7 tur)', n => [sum(TURLAR.filter(t => t !== 'oval' && t !== 'paz').map(t => n.prisadka[t].bizSum)), sum(TURLAR.filter(t => t !== 'oval' && t !== 'paz').map(t => n.prisadka[t].erpSum))]);
komp('Bazis xizmati so\'m (onlayn 3000/detal)', n => (n.bazis.erpSum > 0 ? [n.bazis.onlayn, n.bazis.erpSum] : null));
komp('Bazis xizmati so\'m (oflayn 6000/detal)', n => (n.bazis.erpSum > 0 ? [n.bazis.oflayn, n.bazis.erpSum] : null));
komp('Bazis xizmati so\'m (NOMZOD qoida: 4000 × HDF\'siz panel)', n => (n.bazis.erpSum > 0 ? [4000 * n.bazis.hdfsiz, n.bazis.erpSum] : null));
komp('JAMI tannarx (ustamasiz) ↔ ERP tannarx-bazasi', n => [n.jami.bizTannarx, n.jami.erpTannarx]);
komp('JAMI mijoz narxi (35%) ↔ ERP sotuv', n => [n.jami.bizMijoz, n.jami.erpSotuv]);
komp('JAMI mijoz narxi (35%) ↔ ERP price_list', n => [n.jami.bizMijoz, n.jami.erpRoyxat]);
komp('JAMI tannarx ↔ ERP sotuv', n => [n.jami.bizTannarx, n.jami.erpSotuv]);
komp("JAMI mijoz narxi (35%) ↔ ERP sotuv — ilovaning HOZIRGI avtomoslashi bilan (sotilgan SKU o'rniga)", n => [n.jami.avtoMijoz, n.jami.erpSotuv]);
komp("JAMI tannarx ↔ ERP tannarx-bazasi — ilovaning HOZIRGI avtomoslashi bilan", n => [n.jami.avtoTannarx, n.jami.erpTannarx]);

const statistika = KOMP.map(k => {
  const qat = natijalar.map(n => ({ id: n.id, v: k.f(n) })).filter(x => x.v && x.v[1] > 0);
  const xato = qat.map(x => pct(x.v[0], x.v[1]));
  const yigE = sum(qat.map(x => x.v[1])), yigB = sum(qat.map(x => x.v[0]));
  return { nom: k.nom, n: qat.length, ortAbs: avg(xato.map(Math.abs)), medAbs: med(xato.map(Math.abs)), ortBelgili: avg(xato), yigindi: yigE > 0 ? (yigB - yigE) / yigE * 100 : null, maks: qat.length ? qat.reduce((m, x, i) => (Math.abs(xato[i]) > Math.abs(m.p) ? { id: x.id, p: xato[i] } : m), { id: '', p: 0 }) : null };
});

/** eng katta chetlanishlar: (buyurtma × sabab) bo'yicha so'm farqi (mijoz narxi, biz − ERP sotuv, furnitura'siz) */
const chet = [];
for (const n of natijalar) for (const [k, nom] of PARCHA) if (n.parcha[k]) chet.push({ id: n.id, qism: k, nom, erp: n.jami.erpSotuv, farq: n.parcha[k] });
chet.sort((a, b) => Math.abs(b.farq) - Math.abs(a.farq));

/* ───────────────────────── chiqarish ───────────────────────── */
const ELAPSED = Date.now() - t0;
if (JSON_OUT) {
  const sodda = natijalar.map(n => ({ id: n.id, algo: n.algo, varaq: n.varaq, kromka: n.kromka, raspil: n.raspil, prisadka: n.prisadka, bazis: n.bazis, qism: n.qism, jami: n.jami, siyosat: n.siyosat, ustamaERP: n.ustamaERP,
    moslash: n.ms.natija.map(x => ({ guruh: x.g.nom, detal: x.g.det, nishon: x.nishon === 'mijoz' ? 'mijoz' : x.nishon ? x.nishon.nom : null, usul: x.usul })) }));
  console.log(JSON.stringify({ natijalar: sodda, statistika, chetlanish: chet.slice(0, 10), xatolar }, null, 1));
  await new Promise(r => process.stdout.write('', r));   // quvur (pipe) ga katta chiqish to'liq yozilsin
  process.exit(xatolar.length ? 1 : 0);
}

const out = [];
let SKIP = false;
const P = (s = '') => { if (!SKIP) out.push(s); };
const qisqa = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const tbl = (sarlavha, qatorlar) => {
  if (SKIP) return;
  const w = sarlavha.map((h, i) => Math.max(String(h).length, ...qatorlar.map(q => String(q[i] == null ? '' : q[i]).length)));
  if (MD) {
    const son = (x) => /^[-+\d\s.,%/×—()]*$/.test(String(x == null ? '' : x).trim());
    P('| ' + sarlavha.join(' | ') + ' |'); P('|' + sarlavha.map((h, i) => (i > 0 && qatorlar.filter(q => son(q[i])).length > qatorlar.length / 2 ? ' ---: ' : ' --- ')).join('|') + '|');
    for (const q of qatorlar) P('| ' + q.map(x => (x == null ? '' : x)).join(' | ') + ' |');
  } else {
    P(sarlavha.map((h, i) => (i === 0 ? pad(h, w[i]) : lpad(h, w[i]))).join('  '));
    for (const q of qatorlar) P(q.map((x, i) => (i === 0 ? pad(x == null ? '' : x, w[i]) : lpad(x == null ? '' : x, w[i]))).join('  '));
  }
  P();
};
const KEEP = new Set(['q', 'f2', 'g3', 'g5', 'h', 'i', 'j', 'j2']);
const H1 = (s) => { SKIP = QISQA && !KEEP.has((/^(\w+)[).]/.exec(s) || [])[1]); P(MD ? '### ' + s : '── ' + s + ' ──'); if (!MD) P(); };

H1("q) Qisqa jadval (buyurtma × komponent): biz / ERP sotuv / GibLab (haqiqiy ishlatilgan)");
{
  const f3 = (a, b, c) => [a, b, c].map(x => (x == null ? '—' : typeof x === 'number' ? r2(x) : x)).join(' / ');
  tbl(['buyurtma', 'LDSP varaq (biz/ERP/Gib)', 'HDF varaq', 'kromka m (biz+8%/ERP/Gib)', 'raspil LDSP list (biz/ERP)', 'raspil HDF (biz/ERP)', "prisadka 7 tur so'm (biz/ERP)", "Bazis so'm (biz 3000×/ERP)"],
    natijalar.map(n => [n.id, n.varaq.erp > 0 ? f3(n.varaq.biz, n.varaq.erp, n.varaq.gib) : 'mijoz plitasi (ERP\'da yo\'q)', n.varaq.erpHdf > 0 ? f3(n.biz.hdfVaraq, n.varaq.erpHdf, n.varaq.gibHdf) : (n.biz.hdfVaraq > 0 ? f3(n.biz.hdfVaraq, 0, n.varaq.gibHdf) + " (ERP'da yo'q)" : '—'),
      f3(r1(n.biz.kromkaM), r1(n.erp.kromkaM), n.gl && n.gl.kromkaM ? r1(n.gl.kromkaM) : null), n.raspil.biz2 + ' / ' + n.raspil.erp2, n.raspil.biz1 + ' / ' + n.raspil.erp1,
      soM(sum(TURLAR.filter(t => t !== 'oval' && t !== 'paz').map(t => n.prisadka[t].bizSum))) + ' / ' + soM(sum(TURLAR.map(t => n.prisadka[t].erpSum))), soM(n.bazis.onlayn) + ' / ' + soM(n.bazis.erpSum)]));
  tbl(['buyurtma', 'tannarx biz', 'tannarx ERP-baza', 'farq', 'mijoz 35% biz', 'ERP sotuv', 'farq', 'ERP price_list', 'farq', 'avtomoslash bilan (ERP sotuvga)'],
    natijalar.map(n => [n.id, soM(n.jami.bizTannarx), soM(n.jami.erpTannarx), pS(pct(n.jami.bizTannarx, n.jami.erpTannarx)), soM(n.jami.bizMijoz), soM(n.jami.erpSotuv), pS(pct(n.jami.bizMijoz, n.jami.erpSotuv)), soM(n.jami.erpRoyxat), pS(pct(n.jami.bizMijoz, n.jami.erpRoyxat)), pS(pct(n.jami.avtoMijoz, n.jami.erpSotuv))]));
}

H1("0. Moslash: Bazis plita guruhi → haqiqiy sotilgan SKU (usul: nom = dekor nomi, soni = detal/varaq soni yaqinligi, ortiqcha = eng yaqin material) va ilovaning o'z avtomoslashi (nom bo'yicha)");
tbl(['buyurtma', 'Bazis guruhi (detal)', 'sotilgan SKU yoki holat', 'usul', 'ilova avtomoslashi'], natijalar.flatMap(n => n.ms.natija.map(x => [n.id, qisqa(x.g.nom, 34) + ' (' + x.g.det + ')', x.nishon === 'mijoz' ? 'MIJOZ materiali (ERP da sotilmagan)' : x.nishon ? qisqa(x.nishon.nom, 44) : '—', x.usul, x.avto])));
{
  const hammasi = natijalar.flatMap(n => n.ms.natija).filter(x => x.nishon && x.nishon !== 'mijoz' && x.g.kls !== 'hdf');
  const c = (re) => hammasi.filter(x => re.test(x.avto)).length;
  const us = {};
  for (const x of natijalar.flatMap(n => n.ms.natija)) us[x.usul] = (us[x.usul] || 0) + 1;
  P('Moslash usullari (Bazis guruhlari soni): ' + Object.entries(us).map(([k, v]) => k + ' ' + v).join(', '));
  P(`Ilova avtomoslashi (${hammasi.length} ta plita guruhi, HDF'siz, ERP'da sotilgan SKU ga bog'langan): aniq va TO'G'RI ${c(/^aniq: TO'G'RI/)}, aniq lekin NOTO'G'RI ${c(/NOTO'G'RI/)}, nomzod (sotilgan ichida) ${c(/ichida\)/)}, nomzod (sotilgan ichida emas) ${c(/ichida emas/)}, yo'q ${c(/^yo'q/)}`);
  P();
}

H1('a) Plita varaqlari: har sotilgan SKU (ERP / GibLab haqiqiy / biz sotuv-SKU formatida / biz GibLab formatida / biz GibLab DETALLARI bilan; detal soni Bazis/GibLab)');
const aq = [];
const algoSoni = (n, r) => { const a = r && n.algo[norm(r.nom)]; return a ? a.soni : null; };
for (const n of natijalar) {
  for (const q of n.ms.sotilgan) {
    const r = n.real.find(x => x.sold === q);
    const bazisDet = sum(n.ms.natija.filter(x => x.nishon === q).map(x => x.g.det));
    const bq = (n.biz.sku[q.i] || { qty: 0 }).qty;
    aq.push([n.id, qisqa(q.nom.replace(/^ЛДСП Ультрадекор /, 'ЛДСП ').replace(/ 16мм/, ''), 34), q.qty, r ? r2(r.varaq) : '—', r2(bq), r2((n.bizG.sku[q.i] || { qty: 0 }).qty), algoSoni(n, r) == null ? '—' : algoSoni(n, r), pS(pct(bq, q.qty)), bazisDet + '/' + (r ? r.det : '—'), Math.abs(bq - q.qty) > 0.01 ? varaqSabab(n, q, r, bq)[1] : '']);
  }
  for (const r of n.real.filter(x => !x.sold)) aq.push([n.id, qisqa(r.nom.trim(), 34) + ' [mijoz]', 0, r2(r.varaq), '(mijoz)', '(mijoz)', algoSoni(n, r) == null ? '—' : algoSoni(n, r), '', sum(n.ms.natija.filter(x => x.real === r).map(x => x.g.det)) + '/' + r.det, '']);
}
tbl(['buyurtma', 'SKU', 'ERP', 'GibLab', 'biz', 'biz(Gib fmt)', 'biz(Gib detal)', 'biz/ERP', 'detal B/G', 'sabab (o\'lchangan)'], aq);

H1('a2) Raskroy ALGORITMI (faqat nesting farqi): GibLab .project dagi aniq detallar → bizning nestProject, GibLab listi formatida');
const a2 = [];
for (const n of natijalar) for (const r of n.real) {
  const a = n.algo[norm(r.nom)];
  if (!a) continue;
  a2.push([n.id, qisqa(r.nom.trim(), 34) + (r.hdf ? ' [HDF]' : r.sold ? '' : ' [mijoz]'), r.fmt.join('×'), a.det, r2(r.varaq), a.soni, pS(pct(a.soni, r.varaq)), a.soni44, a.soniStrip, a.soniMin, pS(pct(a.soniMin, r.varaq)), a.util + '%']);
}
tbl(['buyurtma', 'material', 'format', 'detal', 'GibLab list', 'biz bssf kerf4', 'farq', 'bssf kerf4,4', 'strip', 'min(bssf,strip)', 'farq', 'biz to\'lish'], a2);

{
  const sku = natijalar.flatMap(n => n.ms.sotilgan.filter(q => q.qty > 0).map(q => ({ id: n.id, hdf: q.kls === 'hdf', e: q.qty, b: (n.biz.sku[q.i] || { qty: 0 }).qty })));
  for (const [nom, arr] of [["LDSP/Kashtan/LEGE/LMDF", sku.filter(x => !x.hdf)], ['HDF', sku.filter(x => x.hdf)]]) {
    const x = arr.map(a => (a.b - a.e) / a.e * 100);
    P(`SKU darajasi, ${nom} (${arr.length} ta): aniq mos ${arr.filter(a => Math.abs(a.b - a.e) <= 0.01).length}, bizda ko'p ${arr.filter(a => a.b - a.e > 0.01).length} (shundan +1 list: ${arr.filter(a => Math.abs(a.b - a.e - 1) <= 0.01).length}), bizda kam ${arr.filter(a => a.e - a.b > 0.01).length}; o'rtacha |xato| ${r1(avg(x.map(Math.abs)))}%, mediana ${r1(med(x.map(Math.abs)))}%`);
  }
  const al = natijalar.flatMap(n => n.real.filter(r => n.algo[norm(r.nom)] && !(!r.sold && !r.hdf)).map(r => ({ g: r.varaq, a: n.algo[norm(r.nom)].soni, hdf: r.hdf, q: r.qoldiqUlush > 0 })));
  P(`Algoritm (GibLab detallari, ERP'da sotilgan materiallar, ${al.length} ta): teng ${al.filter(x => Math.abs(x.a - x.g) < 0.01).length}, bizda +1 list ${al.filter(x => x.a - x.g >= 0.99 && x.a - x.g <= 1.01).length}, bizda ko'p (qoldiqli, kasr farq) ${al.filter(x => x.a - x.g > 0.01 && !(x.a - x.g >= 0.99 && x.a - x.g <= 1.01)).length}, bizda kam ${al.filter(x => x.g - x.a > 0.01).length}`);
  P();
}
H1('b) Kromka metr (eni/qalinlik turi bo\'yicha): ERP sotuvdagi m / GibLab m (jami) / biz chizmadagi sof m / biz hisobli m (+8%)');
const kq = [];
for (const n of natijalar) {
  for (const [k, v] of Object.entries(n.kromka).sort()) kq.push([n.id, k.replace('E', '').replace('x', '/'), r1(v.erp), '', r1(v.bizSof), r1(v.biz), pS(pct(v.biz, v.erp)), soM(v.erpSum), soM(v.bizSum), '']);
  kq.push([n.id, 'JAMI', r1(n.erp.kromkaM), n.gl && n.gl.kromkaM ? r1(n.gl.kromkaM) : '—', r1(n.biz.kromkaMsof), r1(n.biz.kromkaM), pS(pct(n.biz.kromkaM, n.erp.kromkaM)), soM(sum(Object.values(n.erp.kromka).map(x => x.amt))), soM(n.biz.kromkaSum), soM(n.qism.kromka.erp) + ' / ' + soM(n.qism.kromka.biz)]);
}
tbl(['buyurtma', 'tur', 'ERP m', 'GibLab m', 'biz sof', 'biz hisobli', 'biz/ERP', 'ERP xizmat so\'m', 'biz so\'m (stavka: mat+xizmat)', 'JAMI so\'m ERP(mat+xizmat) / biz'], kq);

H1('c) Raspil (list soni): ERP (stanok) / biz');
tbl(['buyurtma', 'ERP stanok', 'ERP 2/3-daraja', 'biz LDSP', 'farq', 'ERP 1-daraja', 'biz HDF', 'ERP so\'m', 'ERP soni × biz stavka', 'biz so\'m'],
  natijalar.map(n => [n.id, n.raspil.stanok, n.raspil.erp2, r2(n.raspil.biz2), pS(pct(n.raspil.biz2, n.raspil.erp2)), n.raspil.erp1, r2(n.raspil.biz1), soM(n.raspil.erpSum), soM(n.raspil.erpRaspilStavkada), soM(n.raspil.bizSum)]));

H1('d) Prisadka turlari soni: ERP / biz (KDT jismoniy teshik — ma\'lumot uchun)');
const pq = [];
for (const n of natijalar) pq.push([n.id, ...TURLAR.filter(t => t !== 'oval' && t !== 'paz').map(t => n.prisadka[t].erp + '/' + n.prisadka[t].biz + (n.prisadka[t].kdt != null ? '/' + n.prisadka[t].kdt : '')), n.prisadka.oval.erp + ' / ' + n.prisadka.paz.erp, soM(n.erp.ovalPazSum), soM(sum(TURLAR.map(t => n.prisadka[t].erpSum))), soM(sum(TURLAR.map(t => n.prisadka[t].bizSum)))]);
tbl(['buyurtma', ...TURLAR.filter(t => t !== 'oval' && t !== 'paz').map(t => TUR_NOM[t] + ' ERP/biz/KDT'), 'ОВАЛ / ПАЗ ERP soni', 'ОВАЛ+ПАЗ ERP so\'m', 'ERP so\'m jami', 'biz so\'m'], pq);

H1('e) Bazis xizmati: ERP (nomi × soni, so\'m) / biz onlayn (3000×detal) va oflayn (6000×detal); ERP soniga nomzod qoidalar');
tbl(['buyurtma', 'ERP', 'ERP so\'m', 'biz onlayn', 'biz oflayn', 'Bazis panel', 'HDF\'siz panel', 'ERP son = HDF\'siz?'],
  natijalar.map(n => [n.id, n.bazis.erpNom || '—', soM(n.bazis.erpSum), soM(n.bazis.onlayn), soM(n.bazis.oflayn), n.bazis.panel, n.bazis.hdfsiz, n.bazis.erpQty ? (n.bazis.erpQty === n.bazis.hdfsiz ? 'ha' : "yo'q (" + n.bazis.erpQty + ' vs ' + n.bazis.hdfsiz + ')') : '—']));

H1('f) Jami (furnitura\'siz): ERP sotuv / ERP price_list / ERP tannarx-bazasi ↔ biz tannarx va biz mijoz (35%)');
tbl(['buyurtma', 'ERP sotuv', 'ERP price_list', 'ERP tannarx', 'biz tannarx', 'biz/ERP tannarx', 'biz mijoz 35%', 'biz/ERP sotuv', 'biz/price_list', 'ERP ustama (sotuv/tannarx)', 'ERP ustama (price_list)'],
  natijalar.map(n => [n.id, soM(n.jami.erpSotuv), soM(n.jami.erpRoyxat), soM(n.jami.erpTannarx), soM(n.jami.bizTannarx), pS(pct(n.jami.bizTannarx, n.jami.erpTannarx)), soM(n.jami.bizMijoz), pS(pct(n.jami.bizMijoz, n.jami.erpSotuv)), pS(pct(n.jami.bizMijoz, n.jami.erpRoyxat)),
    n.ustamaERP.sotuv != null ? r1(n.ustamaERP.sotuv * 100) + '%' : '—', n.ustamaERP.royxat != null ? r1(n.ustamaERP.royxat * 100) + '%' : '—']));

H1("f2) Ilovaning HOZIRGI avtomoslashi bilan (Bazis nomi → ERP plitasi, faqat bir qiymatli) ↔ sotilgan SKU bilan: jami mijoz narxi, ERP sotuvga nisbatan");
tbl(['buyurtma', 'ERP sotuv', 'biz (sotilgan SKU)', 'farq', 'biz (avtomoslash)', 'farq', 'avtomoslash: plita varaq (HDF\'siz)', 'sotilgan SKU: plita varaq'], natijalar.map(n => [n.id, soM(n.jami.erpSotuv), soM(n.jami.bizMijoz), pS(pct(n.jami.bizMijoz, n.jami.erpSotuv)), soM(n.jami.avtoMijoz), pS(pct(n.jami.avtoMijoz, n.jami.erpSotuv)), r2(n.bizA.plitaVaraqHammasi), r2(n.biz.plitaVaraqHammasi)]));

H1('g) Mijoz narxi farqi qismlar bo\'yicha (biz − ERP, so\'m; yig\'indi = jami farq)');
const QK = ['plita', 'hdf', 'stol', 'kromka', 'raspil', 'prisadka', 'bazis', 'furnitura', 'boshqa'];
{
  const qat = natijalar.map(n => { const f = QK.map(k => n.qism[k].biz - n.qism[k].erp); return [n.id, ...f.map(soM), soM(n.jami.bizMijozFurnBilan - n.jami.erpSotuv), Math.abs(sum(f) - (n.jami.bizMijozFurnBilan - n.jami.erpSotuv)) <= 2 ? 'ok' : 'farq ' + soM(sum(f) - (n.jami.bizMijozFurnBilan - n.jami.erpSotuv))]; });
  qat.push(['Σ', ...QK.map(k => soM(sum(natijalar.map(n => n.qism[k].biz - n.qism[k].erp)))), soM(sum(natijalar.map(n => n.jami.bizMijozFurnBilan - n.jami.erpSotuv))), '']);
  tbl(['buyurtma', ...QK, 'JAMI farq', 'tekshiruv'], qat);
}

H1('g2) Mijoz narxi farqi (biz − ERP sotuv, furnitura\'siz) AMALIY SABABLAR bo\'yicha, so\'m — yig\'indi = jami farq');
tbl(['buyurtma', ...PARCHA.map(x => x[0]), 'JAMI', 'tekshiruv', "ERP sotuv", 'farq %'], natijalar.map(n => [n.id, ...PARCHA.map(([k]) => soM(n.parcha[k])), soM(n.parcha.jami), Math.abs(n.parcha.jami - n.parcha.haqiqiy) <= 3 ? 'ok' : 'farq ' + soM(n.parcha.jami - n.parcha.haqiqiy), soM(n.jami.erpSotuv), pS(pct(n.jami.bizMijoz, n.jami.erpSotuv))]).concat([['Σ', ...PARCHA.map(([k]) => soM(sum(natijalar.map(n => n.parcha[k])))), soM(sum(natijalar.map(n => n.parcha.jami))), '', soM(sum(natijalar.map(n => n.jami.erpSotuv))), pS(pct(sum(natijalar.map(n => n.jami.bizMijoz)), sum(natijalar.map(n => n.jami.erpSotuv))))]]));
H1("g4) Plita varaq farqi (LDSP/Kashtan/LEGE/LMDF/HDF SKU lar, biz − ERP) sabab sinflari bo'yicha: ortiqcha list va so'm (tannarx×1,35)");
const g4 = {};
for (const n of natijalar) for (const q of n.ms.sotilgan) {
  const r = n.real.find(x => x.sold === q), bq = (n.biz.sku[q.i] || { qty: 0 }).qty;
  if (Math.abs(bq - q.qty) <= 0.01) continue;
  const [sinf] = varaqSabab(n, q, r, bq);
  const e = g4[sinf] || (g4[sinf] = { soni: 0, list: 0, som: 0, ids: new Set() });
  e.soni++; e.list += bq - q.qty; e.som += (bq - q.qty) * (q.tannarx || 0) * (1 + n.biz.ustama); e.ids.add(n.id);
}
tbl(['sabab sinfi', 'SKU soni', "ortiqcha list (biz − ERP)", "so'm", 'buyurtmalar'], Object.entries(g4).map(([k, e]) => [k, e.soni, r2(e.list), soM(e.som), [...e.ids].join(',')]));

H1('g3) Har sababning ERP sotuv narxiga nisbatan ulushi (buyurtmalar bo\'yicha o\'rtacha): kutilgan ta\'sir = shu sabab to\'liq bartaraf etilsa jami xato shuncha kamayadi');
const yigE = sum(natijalar.map(n => n.jami.erpSotuv));
tbl(['sabab', "o'rtacha farq so'm", "o'rtacha farq % (ERP sotuvga)", "o'rtacha abs(farq) %", 'median abs(farq) %', "yig'indi % (Σfarq/ΣERP)"], PARCHA.map(([k, nom]) => {
  const f = natijalar.map(n => n.parcha[k] / n.jami.erpSotuv * 100);
  return [nom, soM(avg(natijalar.map(n => n.parcha[k]))), r1(avg(f)) + '%', r1(avg(f.map(Math.abs))) + '%', r1(med(f.map(Math.abs))) + '%', r1(sum(natijalar.map(n => n.parcha[k])) / yigE * 100) + '%'];
}).concat([['JAMI (biz mijoz − ERP sotuv)', soM(avg(natijalar.map(n => n.parcha.jami))), r1(avg(natijalar.map(n => n.parcha.jami / n.jami.erpSotuv * 100))) + '%', r1(avg(natijalar.map(n => Math.abs(n.parcha.jami / n.jami.erpSotuv * 100)))) + '%', r1(med(natijalar.map(n => Math.abs(n.parcha.jami / n.jami.erpSotuv * 100)))) + '%', r1(sum(natijalar.map(n => n.parcha.jami)) / yigE * 100) + '%']]));

H1("g5) Stsenariylar (ketma-ket, kumulyativ): har tuzatish qo'shilgach jami mijoz narxi xatosi (biz − ERP sotuv, ERP sotuvga %). Oracle = ERP/GibLab ma'lumotini bilgan holda (amalda ularni kiritish yoki hisoblash yo'li kerak)");
{
  const sten = [
    ['0. hozirgi holat (35% ustama, sukut stavka)', () => 0],
    ['1. plita narxi = price_list_uzs (ustama o\'rniga) — egasi qarori', n => n.parcha.siyosat - (n.siyosat.erpRoyxat - n.siyosat.erpSotuv)],
    ['2. + raspil stavkasi stanokka mos (Altendorf/Holzma)', n => n.parcha.raspilStavka],
    ["3. + HDF faqat ERP'da sotilganda hisoblansin (Bazis'da bor HDF ni belgilash)", n => n.parcha.hdfYoq],
    ['4. + Bazis xizmati ERP kabi [oracle: ERP qoidasi o\'lchanmadi]', n => n.parcha.bazis],
    ['5. + ОВАЛ/ПАЗ prisadka modellansin [oracle: Bazis manbasi o\'lchanmadi]', n => n.parcha.ovalPaz],
    ['6. + varaq soni ERP/GibLab kabi [oracle: nesting + Bazis→sex versiya mosligi]', n => n.parcha.plitaVaraq + n.parcha.hdfVaraq + n.parcha.stol + n.parcha.raspilMiqdor]
  ];
  const kum = natijalar.map(() => 0);
  const qat = sten.map(([nom, f]) => {
    natijalar.forEach((n, i) => { kum[i] += f(n); });
    const x = natijalar.map((n, i) => (n.parcha.jami - kum[i]) / n.jami.erpSotuv * 100);
    return [nom, r1(avg(x.map(Math.abs))) + '%', r1(med(x.map(Math.abs))) + '%', pS(sum(natijalar.map((n, i) => n.parcha.jami - kum[i])) / sum(natijalar.map(n => n.jami.erpSotuv)) * 100)];
  });
  tbl(['stsenariy', "o'rtacha abs(xato)", 'mediana abs(xato)', "yig'indi (Σfarq/ΣERP)"], qat);
  P("Qoldiq (6-qadamdan keyin) — kromka (Bazis ≠ sex versiyasi), prisadka 7 tur (ШКАНТ/МЕТКА qoidasi), ERP qo'lda narxi (4250) va yaxlitlash.");
  P();
}
P(`Σ ERP sotuv = ${soM(sum(natijalar.map(n => n.jami.erpSotuv)))} so'm (${natijalar.length} buyurtma); Σ biz mijoz narxi (furnitura'siz) = ${soM(sum(natijalar.map(n => n.jami.bizMijoz)))}; Σ biz tannarx = ${soM(sum(natijalar.map(n => n.jami.bizTannarx)))}; Σ ERP tannarx-bazasi = ${soM(sum(natijalar.map(n => n.jami.erpTannarx)))}`);
P();
H1('h) O\'rtacha va mediana |xato| komponentlar bo\'yicha (ERP > 0 bo\'lgan buyurtmalarda; yig\'indi — Σbiz/ΣERP − 1)');
tbl(['komponent', 'n', "o'rtacha abs(xato)", 'mediana abs(xato)', "o'rtacha (belgili)", 'yig\'indi', 'eng katta (id)'],
  statistika.map(s => [s.nom, s.n, s.ortAbs == null ? '—' : r1(s.ortAbs) + '%', s.medAbs == null ? '—' : r1(s.medAbs) + '%', s.ortBelgili == null ? '—' : pS(s.ortBelgili), s.yigindi == null ? '—' : pS(s.yigindi), s.maks && s.maks.id ? pS(s.maks.p) + ' (' + s.maks.id + ')' : '—']));

H1('i) Eng katta 10 chetlanish (buyurtma × sabab; mijoz narxi bo\'yicha so\'m farqi: biz − ERP sotuv, furnitura\'siz)');
tbl(['#', 'buyurtma', 'sabab', 'farq so\'m', 'ERP sotuv jami', 'ERP sotuvga %'], chet.slice(0, 10).map((x, i) => [i + 1, x.id, x.nom, soM(x.farq), soM(x.erp), pS(x.farq / x.erp * 100)]));

H1('j) ERP plita narx siyosati: ERP varaq soni bilan bizning (tannarx × 1.35) ↔ ERP sotuv narxi (plita, HDF, stoleshnitsa mahsuloti)');
tbl(['buyurtma', 'ERP sotuv (plita qatorlari)', 'tannarx×1.35', 'farq', 'farq %', 'ERP ustama (sotuv/tannarx)', 'price_list × varaq', 'price_list ↔ sotuv %'],
  natijalar.map(n => [n.id, soM(n.siyosat.erpSotuv), soM(n.siyosat.erpTannarxKorsatma), soM(n.siyosat.farq), pS(pct(n.siyosat.erpTannarxKorsatma, n.siyosat.erpSotuv)), n.ustamaERP.sotuv != null ? r1(n.ustamaERP.sotuv * 100) + '%' : '—', soM(n.siyosat.erpRoyxat), pS(pct(n.siyosat.erpRoyxat, n.siyosat.erpSotuv))]));
P(`Plita narxi (ERP varaq soni bilan, ${natijalar.filter(n => n.siyosat.erpSotuv > 0).length} buyurtma, Σ): tannarx×1,35 ↔ ERP sotuv ${pS(pct(sum(natijalar.map(n => n.siyosat.erpTannarxKorsatma)), sum(natijalar.map(n => n.siyosat.erpSotuv))))}; price_list_uzs ↔ ERP sotuv ${pS(pct(sum(natijalar.map(n => n.siyosat.erpRoyxat)), sum(natijalar.map(n => n.siyosat.erpSotuv))))}; tannarx×1,00 ↔ ERP sotuv ${pS(pct(sum(natijalar.map(n => n.siyosat.erpTannarxKorsatma / (1 + n.biz.ustama))), sum(natijalar.map(n => n.siyosat.erpSotuv))))}`);
P();

{
  const pl = natijalar.flatMap(n => [...n.erp.plita, ...n.erp.hdf, ...n.erp.stol.filter(x => !x.xizmat)]).filter(q => q.tannarx > 0);
  P(`ERP plita ustamasi (vaznli, ${pl.length} qator): sotuv/tannarx = +${r1((sum(pl.map(q => q.jami)) / sum(pl.map(q => q.tannarx * q.qty)) - 1) * 100)}%; price_list/tannarx = +${r1((sum(pl.filter(q => q.royxat).map(q => q.royxat * q.qty)) / sum(pl.filter(q => q.royxat).map(q => q.tannarx * q.qty)) - 1) * 100)}%; bizning ustama = +${r1(natijalar[0].biz.ustama * 100)}%`);
  const sku = [...new Map(pl.map(q => [q.sku + '|' + q.nom, q])).values()].map(q => (q.jami / q.qty) / q.tannarx - 1);
  P(`SKU bo'yicha sotuv/tannarx ustamasi: min ${r1(Math.min(...sku) * 100)}%, mediana ${r1(med(sku) * 100)}%, maks ${r1(Math.max(...sku) * 100)}% (${sku.length} ta SKU)`);
  P();
}
H1("j2) ERP maxsus (standartdan farqli) narxlar: qator nomi bo'yicha eng ko'p uchragan birlik narxdan og'ish × miqdor (faqat ≥3 buyurtmada uchraydigan qatorlar)");
tbl(['buyurtma', "standartdan farqli qator / tekshirilgan", "farq so'm (− = ERP arzon sotgan)", 'ERP sotuvga %'], natijalar.map(n => [n.id, n.maxsusNarx.qator + ' / ' + n.maxsusNarx.jami, soM(n.maxsusNarx.farq), pS(n.maxsusNarx.farq / n.jami.erpSotuv * 100)]));

H1('k) Ma\'lumot tekshiruvi');
tbl(['buyurtma', 'sotuv jami (ERP)', 'qatorlar yig\'indisi', 'farq', 'sotuv hujjati', 'noma\'lum xizmat', 'narxsiz qator (biz)', 'HDF sexda yo\'q', 'GibLab detal / Bazis panel'],
  natijalar.map(n => [n.id, soM(n.erp.tekshiruv.saleTotal), soM(n.erp.tekshiruv.satrYigindi), soM(n.erp.tekshiruv.farq), n.erp.hujjat, (n.erp.noma_lum || []).join(';') || '—', n.biz.narxsiz, n.ms.natija.some(x => x.usul === "HDF sexda/sotuvda yo'q") ? 'ha' : '', (n.gl && n.gl.detalSoni ? n.gl.detalSoni : '—') + ' / ' + n.biz.bazis.panel]));

if (TAFSILOT) {
  H1('Tafsilot: har buyurtma — hisoblash ogohlantirishlari');
  for (const n of natijalar) P(n.id + ': sig\'magan detallar ' + JSON.stringify(n.biz.sigmadi) + '; mijoz materiallari ' + n.biz.mijozKod.length + '; furnitura (ERP sotuvida yo\'q) ' + soM(n.biz.furnSum) + ' so\'m');
  P();
  for (const n of natijalar) {
    P(n.id + ' — biz hisob satrlari (guruh | kod | miqdor | stavka | summa):');
    P('   raskroy: ' + n.nest.map(x => `${x.kod}: ${x.soni} list ${x.L}×${x.W}, ${x.joy} detal, ${x.util}%`).join(' ; '));
    for (const l of n.satrlar) P('   ' + [l.group, qisqa(l.code, 22), r2(l.qty), soM(l.unit_price), soM(l.amount)].join(' | ') + (l.sigmadi ? '  [sig\'madi ' + l.sigmadi.soni + ']' : '') + (l.mijoz ? '  [mijoz]' : ''));
  }
  P();
}
SKIP = false;
P(`Eslatma 1 (kalibrovka): TZ-36 K1/K2/K3 shu 14 ta buyurtmaning 12 tasida (3770, 3808, 3812, 3832, 3860, 3877, 3888, 3926, 3936, 3978, 4034, 4250) o'tkazilgan — ularda ЕВРО/МЕТКА/РУЧКА soni va kromka chiqiti natijalari "in-sample" (optimistik); mustaqil tekshiruv faqat 3975 va 4204 (ikkalasi ham mijoz plitasi).`);
P(`Eslatma 2 (o'lchanmadi): .LC4 (Homag) — detal/operatsiya jadvali, varaq xaritasi yo'q (kalitlarda faqat 'waste') → varaq soni GibLab xlsx va .project dan; LC4 dagi kromka/teshik jadvali o'qilmadi. 3975 — GibLab xlsx da yo'q (varaq/kromka m GibLab bilan o'lchanmadi). ERP plita narxi — ERP ning joriy display_price_uzs (2026-10-22), buyurtma sanasidagi emas.`);
P(`${natijalar.length} buyurtma hisoblandi (${(ELAPSED / 1000).toFixed(1)} s)` + (xatolar.length ? `; XATO: ${xatolar.join(' | ')}` : '; xatosiz'));
console.log(out.join('\n'));
await new Promise(r => process.stdout.write('', r));
process.exit(xatolar.length ? 1 : 0);
