/* Smart3D engine/post/project.js — TZ-11 (2-tahrir): GibLab .project — Bazis eksportidek (importBMV 1.84).
 *
 * Sexdagi zanjir: Bazis → GibLab .project → GibLab kesimni o'zi optimallashtiradi va arra fayllarini (Altendorf .gibcut,
 * Homag .LC4) o'zi chiqaradi; prisadka — har detalga KDT .xml (post/kdt.js). Smart3D'ning ishi — Bazis'nikidek .project.
 * Format 30 ta haqiqiy buyurtmadan (Smart3D_toplam_2026-10-16/01_arra, faqat o'qildi) olingan:
 *   <good typeId="product"> detallar: dl (tekstura bo'ylab), dw, count, code, kromka — elt/elb/ell/elr="@operation#EL"
 *   <good typeId="sheet" t name><part count l w/></good> + <operation typeId="CS"> (shu plitadagi detallar)
 *   <good typeId="band" t w name/> + <operation typeId="EL"> (shu kromkali detallar)
 *   <operation typeId="XNC" side code typeName program="…"> — detal teshiklari (dastur ichida XML: bf, bl/br/bt/bb …)
 * XNC o'qlari (kalibrlangan): x — dl bo'ylab, l qirradan (x=0) r ga (x=dl); y — dw bo'ylab, t qirradan (y=0) b ga (y=dw).
 * Teshiklar: bf (yuza: x, y, dp), bl/br (chap/o'ng qirra: y, z, dp), bt/bb (yuqori/past qirra: x, z, dp).
 *
 * Model (o'qish va yozish uchun bitta):
 *   { nom, detallar: [{ id, nom, dl, dw, soni, kod, varaq, kromka: { t, b, l, r: band id | null }, xnc: [{ side, dz, teshiklar: [...] }] }],
 *     varaqlar: [{ id, t, nom, l, w }], kromkalar: [{ id, t, w, nom }] }
 *   teshik: { tur: 'f'|'l'|'r'|'t'|'b', x, y, z, d, dp (son) | otuvchi: true, nom (asbob) }
 */
import { atributlar, xmlYop, son, son2 } from './xml.js';

const TOMON = ['t', 'b', 'l', 'r'];
const asbobD = (nom, asboblar) => { const a = asboblar[nom]; if (a != null) return a; const m = /([\d.]+)$/.exec(nom || ''); return m ? +m[1] : null; };

/** XNC dasturi (ichki XML) → { dx, dy, dz, teshiklar, boshqa } */
export function xncOqi(prog) {
  const p = atributlar((/<program\s([^>]*)>/.exec(prog) || [])[1]);
  const asboblar = {};
  for (const m of prog.matchAll(/<tool\s([^>]*?)\/?>/g)) { const a = atributlar(m[1]); asboblar[a.name] = +a.d; }
  const teshiklar = [], boshqa = {};
  for (const m of prog.matchAll(/<(bf|bl|br|bt|bb|ms|ml|mac|gr)\s([^>]*?)\/?>/g)) {
    const tag = m[1], a = atributlar(m[2]);
    if (tag[0] !== 'b') { boshqa[tag] = (boshqa[tag] || 0) + 1; continue; }
    const tur = tag === 'bf' ? 'f' : tag[1];
    const otuvchi = !isFinite(+a.dp);
    const t = { tur, d: asbobD(a.name, asboblar), nom: a.name };
    if (otuvchi) t.otuvchi = true; else t.dp = +a.dp;
    if (tur === 'f') { t.x = +a.x; t.y = +a.y; }
    else if (tur === 'l' || tur === 'r') { t.y = +a.y; t.z = +a.z; }
    else { t.x = +a.x; t.z = +a.z; }
    teshiklar.push(t);
  }
  return { dx: +p.dx, dy: +p.dy, dz: +p.dz, teshiklar, boshqa, dastur: prog };   // dastur — asl matn (frezalash, paz — o'zgarishsiz qayta yoziladi)
}

/** .project matni → model. Atributlar tartibi muhim emas: Bazis eksporti ham, GibLab qayta saqlagan fayl ham o'qiladi;
 *  bir nechta mahsulot bo'lsa — hammasining detallari. */
export function projectOqi(txt) {
  const s = String(txt);
  const out = { nom: '', detallar: [], varaqlar: [], kromkalar: [] };
  const goods = [...s.matchAll(/<good\s([^>]*?)(?:\/>|>([\s\S]*?)<\/good>)/g)].map(m => ({ a: atributlar(m[1]), ich: m[2] || '' }));
  const ops = [...s.matchAll(/<operation\s([^>]*?)(?:\/>|>([\s\S]*?)<\/operation>)/g)].map(m => ({ a: atributlar(m[1]), ich: m[2] || '' }));
  const mahsulot = goods.filter(g => g.a.typeId === 'product');
  if (mahsulot[0]) out.nom = mahsulot[0].a.name || '';
  const elBand = {}, csVaraq = {};
  for (const g of goods.filter(g => g.a.typeId === 'sheet')) {
    const b = atributlar((/<part\s([^>]*?)\/?>/.exec(g.ich) || [])[1]);
    out.varaqlar.push({ id: g.a.id, t: +g.a.t, nom: g.a.name || '', l: +b.l, w: +b.w });
  }
  for (const g of goods.filter(g => g.a.typeId === 'band')) out.kromkalar.push({ id: g.a.id, t: +g.a.t, w: +g.a.w, nom: g.a.name || '' });
  for (const o of ops.filter(o => o.a.typeId === 'CS' || o.a.typeId === 'EL')) {
    const mat = (/<material id="(\d+)"/.exec(o.ich) || [])[1];
    if (o.a.typeId === 'EL') elBand[o.a.id] = mat;
    else for (const p of o.ich.matchAll(/<part id="(\d+)"/g)) csVaraq[p[1]] = mat;
  }
  const byId = {};
  for (const m of mahsulot.map(g => g.ich).join('').matchAll(/<part\s([^>]*?)\/>/g)) {
    const a = atributlar(m[1]);
    const kromka = {};
    for (const t of TOMON) { const r = a['el' + t]; kromka[t] = r ? elBand[(/#(\d+)/.exec(r) || [])[1]] || null : null; }
    const d = { id: a.id, nom: a.name || '', dl: +a.dl, dw: +a.dw, soni: +a.count || 1, kod: a.code || a.id, varaq: csVaraq[a.id] || null, kromka, xnc: [] };
    out.detallar.push(d); byId[a.id] = d;
  }
  for (const o of ops.filter(o => o.a.typeId === 'XNC')) {
    const x = Object.assign({ side: +o.a.side || 1, kod: o.a.code || '' }, xncOqi(o.a.program || ''));
    for (const p of o.ich.matchAll(/<part id="(\d+)"/g)) if (byId[p[1]]) byId[p[1]].xnc.push(x);
  }
  return out;
}

/* ── yozish ── */
function dastur(dx, dy, dz, teshiklar) {
  const ds = [...new Set(teshiklar.map(t => t.d))].sort((a, b) => b - a);
  const asbob = (d) => 'Bore' + son(d);
  let x = `<?xml version="1.0" encoding="UTF-8"?><program dx="${son2(dx)}" dy="${son2(dy)}" dz="${son2(dz)}">`;
  for (const d of ds) x += `<tool name="${asbob(d)}" d="${son(d)}"/>`;
  if (teshiklar.some(t => t.otuvchi)) x += '<var comment="Глубина сквозного отверстия" name="throughBoreDepth" type="double" expr="dz+2.00"/>';
  const dp = (t) => (t.otuvchi ? 'throughBoreDepth' : son(t.dp));
  /* tartib — Bazis'dagidek: qirra teshiklari, keyin yuza */
  for (const t of teshiklar.filter(t => t.tur !== 'f')) {
    const pos = t.tur === 'l' || t.tur === 'r' ? `y="${son(t.y)}"` : `x="${son(t.x)}"`;
    x += `<b${t.tur} ver="2" ${pos} z="${son(t.z)}" dp="${dp(t)}" m="true" name="${asbob(t.d)}"/>`;
  }
  for (const t of teshiklar.filter(t => t.tur === 'f')) x += `<bf x="${son(t.x)}" y="${son(t.y)}" dp="${dp(t)}" name="${asbob(t.d)}"/>`;
  return x + '</program>';
}

/**
 * model → .project matni (Bazis eksporti shaklida; baytlarga — xml.js cp1251).
 * Detal kodi (code) — KDT fayl nomi bilan bir xil ([kod]_1.XML).
 */
export function projectYoz(M) {
  const L = [];
  const els = [...new Set(M.detallar.flatMap(d => TOMON.map(t => d.kromka[t]).filter(Boolean)))];
  const vars = [...new Set(M.detallar.map(d => d.varaq))];
  const elId = {}; els.forEach((b, i) => { elId[b] = i + 1; });
  let g = 1, partId = M.detallar.length;
  L.push('<?xml version="1.0" encoding="windows-1251"?><project importBMV="1.84">');
  let pr = `<good typeId="product" id="${g++}" count="1" name="${xmlYop(M.nom)}" product.import="bm.1.84">`;
  for (const d of M.detallar) {
    pr += `<part id="${d.id}" name="${xmlYop(d.nom)}" dl="${son(d.dl)}" dw="${son(d.dw)}" count="${d.soni}" txt="true" code="${d.kod}" part.code="${d.kod}" part.position="${d.kod}" part.designation="${d.kod}"`;
    for (const t of TOMON) if (d.kromka[t]) pr += ` el${t}${t === 'b' ? ' ' : ''}="@operation#${elId[d.kromka[t]]}"`;
    pr += '/>';
  }
  L.push(pr + ' </good>');
  let opId = els.length + 1, s = '';
  for (const v of vars) {
    const V = M.varaqlar.find(x => x.id === v) || { t: 16, nom: '', l: 2800, w: 2070 };
    const tool = g++, sh = g++;
    s += `<good typeId="tool.cutting" id="${tool}"/><good typeId="sheet" id="${sh}" t="${son(V.t)}" name="${xmlYop(V.nom)}"><part id="${++partId}" count="10000" l="${son(V.l)}" w="${son(V.w)}"/></good>`;
    s += `<operation typeId="CS" id="${opId++}" tool1="${tool}" cSizeMode="1"><material id="${sh}"/>` + M.detallar.filter(d => d.varaq === v).map(d => `<part id="${d.id}" />`).join('') + '</operation>';
  }
  for (const b of els) {
    const B = M.kromkalar.find(x => x.id === b) || { t: 1, w: -1, nom: '' };
    const tool = g++, band = g++;
    s += `<good typeId="tool.edgeline" id="${tool}" elWidthPreJoint="1"/><good typeId="band" id="${band}" t="${son(B.t)}" w="${son(B.w)}" name="${xmlYop(B.nom)}"/>`;
    s += `<operation typeId="EL" id="${elId[b]}" tool1="${tool}" ><material id="${band}"/>` + M.detallar.filter(d => TOMON.some(t => d.kromka[t] === b)).map(d => `<part id="${d.id}" />`).join('') + '</operation>';
  }
  let n = 0;
  for (const d of M.detallar) {
    const xs = (d.xnc || []).filter(x => x.dastur || (x.teshiklar && x.teshiklar.length));
    if (!xs.length) continue;
    n++;
    for (const x of xs) {
      const kod = String(d.kod).padStart(4, '0') + 'x' + String(n).padStart(3, '0') + 'x' + (x.side || 1);
      s += `<operation typeId="XNC" id="${opId++}" side="${x.side || 1}" bySizeDetail="true" code="${kod}" typeName="${xmlYop(d.nom)}" program="${xmlYop(x.dastur || dastur(d.dl, d.dw, x.dz || 16, x.teshiklar))}"><part id="${d.id}"/></operation>`;
    }
  }
  L.push(s + '</project>');
  return L.join('\n');
}
