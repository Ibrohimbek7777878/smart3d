/* Smart3D engine/post/kdt.js — TZ-11 (2-tahrir): KDT prisadka stanogi fayli (<KDTPanelFormat>), har detal va yuzaga bitta.
 *
 * Format va o'qlar 30 ta haqiqiy buyurtmaning 2044 ta KDT faylidan kalibrlangan (02_kromka_prisadka; faqat o'qildi):
 *   fayl nomi  — [detal kodi]_[yuza].XML (1 — asosiy yuza, 2 — orqa yuza); kodirovka ASCII, qatorlar CRLF, tab bilan;
 *   PANEL      — PanelLength ≥ PanelWidth (uzun tomon — X), qalinlik, nomi "[kod] lotincha nom";
 *   PanelOutline — to'rtburchak: (L,W) → (0,W) → (0,0) → (L,0); Vertex'dagi <Banding> — shu uchdan keyingi qirra kromkasi
 *                (tartib: yuqori, chap, past, o'ng), <Description> — kromka qalinligi;
 *   CAD TypeNo 1 — yuza teshigi (X1, Y1, Depth, Diameter); TypeNo 2 — qirra teshigi (Quadrant: 1 — o'ng, 2 — chap,
 *                3 — yuqori, 4 — past; X1, Y1 — qirradagi nuqta, Z1 — qalinlikdagi balandligi);
 *   o'tuvchi teshik chuqurligi — qalinlik + 0,5 mm (sexdagi fayllarda 16,5 / 18,5).
 * XNC (.project) dan o'tkazish: 1-yuza — X = x, Y = dw − y (dl ≥ dw), burilganda X = y, Y = x; 2-yuza — ko'zgu (X = x, Y = y).
 *   Sex fayllarida ba'zan detal 180° burilgan holda yoziladi — jismonan bir xil detal (test shunday solishtiradi).
 */
import { lotin, son2, xmlMatn } from './xml.js';

const NL = '\r\n';
const RANG = 'rgb(0,255,64)';
const QIRRA = ['top', 'left', 'bottom', 'right'];
const KVADRANT = { right: 1, left: 2, top: 3, bottom: 4 };

/** XNC nuqtasi → KDT nuqtasi va o'lchamlar */
export function kdtOqlar(dl, dw, side = 1) {
  const rot = dl <= dw + 1e-6, L = rot ? dw : dl, W = rot ? dl : dw;   // kvadrat detal ham burilgan holda (sex fayllaridagidek)
  const f = side === 2
    ? (rot ? (x, y) => [dw - y, x] : (x, y) => [x, y])
    : (rot ? (x, y) => [y, x] : (x, y) => [x, dw - y]);
  return { L, W, f };
}

/** qirra nuqtasi (KDT o'qlarida) → qaysi tomon */
const tomoni = (X, Y, L, W) => (Math.abs(X) < 0.01 ? 'left' : Math.abs(X - L) < 0.01 ? 'right' : Math.abs(Y - W) < 0.01 ? 'top' : 'bottom');

/**
 * Detal (post/project.js modeli) → KDT matni.
 * @param {Object} d — { kod, nom, dl, dw, t, kromka: { t, b, l, r: qalinlik mm | 0 } }
 * @param {Array} teshiklar — XNC o'qlaridagi teshiklar (post/project.js) shu yuza uchun
 * @param {number} side — 1 | 2
 */
export function kdtYoz(d, teshiklar = [], side = 1) {
  const t = +d.t || 16, { L, W, f } = kdtOqlar(d.dl, d.dw, side);
  /* kromka: XNC qirrasi o'rtasini o'tkazib, KDT tomonini topamiz */
  const kr = {};
  for (const [q, [x, y]] of Object.entries({ t: [d.dl / 2, 0], b: [d.dl / 2, d.dw], l: [0, d.dw / 2], r: [d.dl, d.dw / 2] })) {
    const qal = d.kromka && +d.kromka[q];
    if (!qal) continue;
    const [X, Y] = f(x, y);
    kr[tomoni(X, Y, L, W)] = qal;
  }
  const v = [[L, W], [0, W], [0, 0], [L, 0]];
  let s = '<KDTPanelFormat>' + NL + '\t<PANEL>' + NL;
  s += `\t\t<PanelLength>${son2(L)}</PanelLength>${NL}\t\t<PanelWidth>${son2(W)}</PanelWidth>${NL}\t\t<PanelThickness>${son2(t)}</PanelThickness>${NL}`;
  s += `\t\t<PanelName>[${xmlMatn(d.kod)}] ${xmlMatn(lotin(d.nom))}</PanelName>${NL}\t\t<PanelOutline>${NL}`;
  v.forEach(([x, y], i) => {
    s += `\t\t\t<Vertex>${NL}\t\t\t\t<X1>${son2(x)}</X1>${NL}\t\t\t\t<Y1>${son2(y)}</Y1>${NL}`;
    const q = kr[QIRRA[i]];
    if (q) s += `\t\t\t\t<Banding>1.00</Banding>${NL}\t\t\t\t<Description>${+q}</Description>${NL}\t\t\t\t<BandingColor>${RANG}</BandingColor>${NL}\t\t\t\t<DescriptionColor>${RANG}</DescriptionColor>${NL}`;
    s += `\t\t\t</Vertex>${NL}`;
  });
  s += `\t\t</PanelOutline>${NL}\t</PANEL>${NL}`;
  for (const h of teshiklar) {
    const chuq = h.otuvchi ? t + 0.5 : +h.dp;
    if (h.tur === 'f') {
      const [X, Y] = f(h.x, h.y);
      s += `\t<CAD>${NL}\t\t<TypeNo>1</TypeNo>${NL}\t\t<TypeName>Vertical Hole</TypeName>${NL}\t\t<X1>${son2(X)}</X1>${NL}\t\t<Y1>${son2(Y)}</Y1>${NL}`;
    } else {
      const p = h.tur === 'l' ? [0, h.y] : h.tur === 'r' ? [d.dl, h.y] : h.tur === 't' ? [h.x, 0] : [h.x, d.dw];
      const [X, Y] = f(p[0], p[1]);
      s += `\t<CAD>${NL}\t\t<TypeNo>2</TypeNo>${NL}\t\t<TypeName>Horizontal Hole</TypeName>${NL}\t\t<Quadrant>${KVADRANT[tomoni(X, Y, L, W)]}</Quadrant>${NL}`;
      s += `\t\t<X1>${son2(X)}</X1>${NL}\t\t<Y1>${son2(Y)}</Y1>${NL}\t\t<Z1>${son2(h.z)}</Z1>${NL}`;
    }
    s += `\t\t<Depth>${son2(chuq)}</Depth>${NL}\t\t<Diameter>${son2(h.d)}</Diameter>${NL}\t\t<HoleNo>1</HoleNo>${NL}\t\t<IntervalX>0.00</IntervalX>${NL}\t\t<IntervalY>0.00</IntervalY>${NL}\t</CAD>${NL}`;
  }
  return s + '</KDTPanelFormat>' + NL;
}

/**
 * Detalning hamma XNC dasturlari → KDT fayllari, sexdagi qoida bilan (30 buyurtmada tekshirildi):
 *   _1 faylida — asosiy yuzaning ko'r (o'tmaydigan) teshiklari, BARCHA o'tuvchi va qirra teshiklari; _2 da — ikkinchi yuzaning
 *   ko'r teshiklari. Asosiy yuza — 1-yuza; faqat 1-yuzada ham ko'r teshik bo'lib, 2-yuzada ko'proq bo'lsa — 2-yuza
 *   (~2000 detal: shu qoida bilan 1-yuza 0 ta bo'lsa ham 1-yuza birinchi qoladi).
 *   Ikki yuzada bir joydagi ko'r teshiklar (chuqurliklari yig'indisi ≥ qalinlik) — bitta o'tuvchi teshik bo'lib yoziladi.
 * @param {Object} d — kdtYoz dagidek; @param {Array} xnc — [{ side, teshiklar }]
 * @returns {Array} [{ nom: 'kod_1.XML', matn }]
 */
export function kdtFayllar(d, xnc = []) {
  const yuza = { 1: [], 2: [] }, umumiy = [], t = +d.t || 16;
  for (const x of xnc) for (const h of x.teshiklar || []) {
    if (h.tur === 'f' && !h.otuvchi) yuza[x.side === 2 ? 2 : 1].push(h);
    else umumiy.push(h);
  }
  /* ikki yuzada bir joyda, bir diametrli ko'r teshiklar — chuqurliklari yig'indisi qalinlikdan katta bo'lsa — bitta o'tuvchi */
  for (const h1 of yuza[1].slice()) {
    const i = yuza[2].findIndex(h2 => Math.abs(h2.x - h1.x) < 0.01 && Math.abs(h2.y - h1.y) < 0.01 && h2.d === h1.d && (+h1.dp + +h2.dp) >= t);
    if (i < 0) continue;
    yuza[2].splice(i, 1); yuza[1].splice(yuza[1].indexOf(h1), 1);
    umumiy.push(Object.assign({}, h1, { otuvchi: true, dp: undefined }));
  }
  /* kromkasiz va teshiksiz yupqa detal (HDF, oyna) va stoleshnitsa — KDT fayli yo'q; plita detallari (10–25 mm) — bor
     (sex fayllarida: 16 mm — 57/57 faylli, 3 mm — 134 tasi faylsiz, 26 mm — 17 tasi faylsiz) */
  if (!umumiy.length && !yuza[1].length && !yuza[2].length && !Object.values(d.kromka || {}).some(v => +v > 0) && (t < 10 || t > 25)) return [];
  const asosiy = yuza[1].length > 0 && yuza[2].length > yuza[1].length ? 2 : 1, boshqa = asosiy === 1 ? 2 : 1;
  const out = [{ nom: d.kod + '_1.XML', matn: kdtYoz(d, yuza[asosiy].concat(umumiy), asosiy) }];
  if (yuza[boshqa].length) out.push({ nom: d.kod + '_2.XML', matn: kdtYoz(d, yuza[boshqa], boshqa) });
  return out;
}

/** KDT matni → { L, W, T, nom, kromka: { top|left|bottom|right: qalinlik }, teshiklar: [{ tur: 1|2, kv, x, y, z, dp, d }], kontur } */
export function kdtOqi(txt) {
  const s = String(txt), g = (re) => { const m = re.exec(s); return m ? m[1] : null; };
  const out = { L: +g(/<PanelLength>([-\d.]+)/), W: +g(/<PanelWidth>([-\d.]+)/), T: +g(/<PanelThickness>([-\d.]+)/), nom: g(/<PanelName>([^<]*)/) || '', kromka: {}, teshiklar: [], boshqa: 0 };
  const v = [...s.matchAll(/<Vertex>([\s\S]*?)<\/Vertex>/g)].map(m => m[1]);
  out.kontur = v.length;
  if (v.length === 4) v.forEach((x, i) => { if (/<Banding>/.test(x)) out.kromka[QIRRA[i]] = +((/<Description>([\d.]+)/.exec(x) || [])[1] || 1); });
  for (const m of s.matchAll(/<CAD>([\s\S]*?)<\/CAD>/g)) {
    const c = m[1], n = (k) => { const r = new RegExp('<' + k + '>([-\\d.]+)<').exec(c); return r ? +r[1] : null; };
    const tur = n('TypeNo');
    if (tur !== 1 && tur !== 2) { out.boshqa++; continue; }
    out.teshiklar.push({ tur, kv: n('Quadrant'), x: n('X1'), y: n('Y1'), z: n('Z1'), dp: n('Depth'), d: n('Diameter') });
  }
  return out;
}
