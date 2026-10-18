/* TZ-33 A: SketchUp (.skp) va SketchUp Pro (.dae) eksporti uchun umumiy model — XONA YO'Q, faqat mebel (plita va furnitura).
 *
 * Manba (yangi hisob yo'q, dublikat qurilmaydi):
 *   - detallar — kesim ro'yxati qutilari (engine/teshik3d.js → d6.js joyQutilar): cutlist detali bilan 1:1, haqiqiy o'lcham va joy;
 *     joy formulasi yo'q modul (umumiy katalog, Bazis importi) — OBJ eksportidagi kabi 3D panellar (engine/assembler.js getModulePanels);
 *   - material — detalning kesim ro'yxatidagi materiali (dekor nomi, rangi — services/erpMaterial.js materialRang);
 *   - furnitura — 3D dagi zapchast belgilari (teshik3d zapchast: petlya, polka ushlagich, ruchka, yo'naltiruvchi — teshiklardan),
 *     assembler furn (oyoq, shtanga, ruchka), eshik tutqichi (assembler handle). Nomi — modul furniturasi (ERP nomi va kodi).
 *     Joyi noma'lum furnitura (masalan MC oyoqchasi — teshigi yo'q) chizilmaydi: modul atributida "joysiz" bo'lib yoziladi (qoida 4.3).
 * O'qlar: mm, Z-yuqori. Modul lokal o'qlari — burchagi (0, 0, 0): x — eni, y — chuqurligi, z — bo'yi; dunyoga joylashuv
 *   (x, y, z, rot) bilan — OBJ eksportidagi bilan bir xil (markaz = joy + R·(w/2, d/2) + h/2). */
import { getModulePanels } from '../../../../../app/js/engine/assembler.js';
import { teshik3d, qutiPanel, RANG } from '../../../../../app/js/engine/teshik3d.js';
import { materialRang } from '../../../services/erpMaterial.js';

/** dizayndagi standart ranglar (nomi rangni aytmaydigan material — 3D dagidek, engine/rang.js: o'ylab topilmaydi) */
const STD = { korpus: 0xC9BFAE, fasad: 0xB4834F, orqa: 0xC4A57F, furnitura: RANG.zapchast, ruchka: 0x34343C };
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const r1 = (v) => Math.round(v * 10) / 10;
/** qatlam (SketchUp tag): 0 — korpus (polka, stoleshnitsa ham), 1 — fasad, 2 — orqa devor, 3 — furnitura */
const qatlami = (slot) => (slot === 'fasad' ? 1 : slot === 'orqa' ? 2 : 0);
const QISM = ['korpus', 'fasad', 'orqa'];

/* furnitura turi → modul furniturasidagi yozuv (ERP nomi bo'yicha; cutlist.js dagi qoidalar bilan bir xil) */
const HW_RE = {
  petlya: [/петл|petl|hinge|^PET-/i, /чашк|планк|plank/i],
  polka: [/полкодерж|polkoderj|ushlagich|shelf/i],
  ruchka: [/ручк|ruchk|handle|^RU-/i],
  napr: [/направл|napravl|салазк|salazk|slide|tandem|тандем/i],
  oyoq: [/ножк|nojk|oyoq|опор|leg/i],
  shtanga: [/штанг|shtang/i, /крепл|держ|kreplen/i]
};

const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
  mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  neg: (a) => [-a[0], -a[1], -a[2]]
};
/** o'ng qo'lli ortonormal bazis: z — asosiy o'q, x — unga perpendikulyar qilingan yo'nalish */
function bazis(z, x) {
  const Z = v3.norm(z);
  let X = x ? v3.sub(x, v3.add([0, 0, 0], Z, Z[0] * x[0] + Z[1] * x[1] + Z[2] * x[2])) : null;
  if (!X || v3.len(X) < 1e-6) X = Math.abs(Z[2]) < 0.9 ? v3.cross([0, 0, 1], Z) : v3.cross(Z, [1, 0, 0]);
  X = v3.norm(X);
  return [X, v3.cross(Z, X), Z];
}

/**
 * @param {Object} doc — ko'rinadigan loyiha ({ placements } — H.viewPlacements bilan, oshxona elementlari ham)
 * @param {Object} H — hisob bazasi (catalog, materials, furnById, furnituraBoglash)
 * @param {Array} cutlists — hisob natijasi (res.cutlists; placementId bo'yicha)
 * @param {Object} [o] — { only: joy id (faqat shu modul), nom: { modul(frag, p), material(code, asl), qatlam: [4], furn: { tur: nom } } }
 * @returns {{ materiallar, qatlamlar, modullar }}
 */
export function eksportModeli(doc, H, cutlists, o = {}) {
  const N = Object.assign({ modul: (f) => f.name || f.code, material: (c, asl) => asl || c, qatlam: ['Korpus', 'Fasad', 'Orqa devor', 'Furnitura'],
    furn: { petlya: 'Petlya', polka: 'Polka ushlagich', ruchka: 'Ruchka', napr: "Yo'naltiruvchi", oyoq: 'Oyoqcha', shtanga: 'Shtanga' } }, o.nom || {});
  const catalog = (H && H.catalog) || {};
  const pm = (H && H.materials && H.materials.panel_materials) || [];
  const hwByCode = {};
  for (const m of (H && H.materials && H.materials.hardware) || []) hwByCode[m.code] = m;
  const furnById = (H && H.furnById) || {}, boglash = (H && H.furnituraBoglash) || {};
  const clById = {};
  for (const cl of cutlists || []) if (cl.placementId != null) clById[cl.placementId] = cl;

  /* materiallar: qism (korpus / fasad / orqa) + material kodi — har qism alohida material (TZ-33) */
  const materiallar = [], matIdx = new Map();
  const mat = (qism, code) => {
    const k = qism + '|' + (code || '');
    if (matIdx.has(k)) return matIdx.get(k);
    let dekor, rang;
    if (qism === 'furnitura' || qism === 'ruchka') { dekor = qism === 'ruchka' ? N.furn.ruchka : N.qatlam[3]; rang = STD[qism]; }
    else {
      const m = pm.find(x => x.code === code);
      const r = code ? materialRang(H, code) : null;
      dekor = code ? N.material(code, m ? m.name : code) : '—';
      rang = r && r.rang != null ? r.rang : STD[qism];
    }
    dekor = String(dekor).replace(/\s+/g, ' ').trim().slice(0, 100);
    const nom = qism === 'furnitura' ? dekor : (qism === 'ruchka' ? N.qatlam[3] : N.qatlam[QISM.indexOf(qism)]) + ' — ' + dekor;
    materiallar.push({ kalit: k, nom, dekor, rang: rgb(rang) });
    matIdx.set(k, materiallar.length - 1);
    return materiallar.length - 1;
  };

  const modullar = [];
  for (const p of (doc && doc.placements) || []) {
    if (o.only != null && p.id !== o.only) continue;
    const frag = catalog[p.frg];
    if (!frag) continue;
    const w = +p.w || +frag.w, d = +p.d || +frag.d, h = +p.h || +frag.h;
    const cl = clById[p.id] || null;
    const yarim = [w / 2, d / 2, h / 2];
    const lok = (a) => [a[0] + yarim[0], a[1] + yarim[1], a[2] + yarim[2]];   // markazlangan → burchakdan
    let asm = { panels: [] };
    try { asm = getModulePanels(frag, w, d, h, { tortma: true, eshiklar: true, hinge: p.hinge, ruchkasiz: !!p.ruchkasiz }) || asm; } catch (_) { asm = { panels: [] }; }
    let dat = null;
    try { dat = cl ? teshik3d(frag, cl.w, cl.d, cl.h, cl, { hinge: p.hinge }) : null; } catch (_) { dat = null; }
    const parts = (cl && cl.parts) || [];
    const partByRef = {};
    for (const pt of parts) if (pt.ref) partByRef[pt.ref] = pt;
    /* kesim ro'yxati qutilari hamma detalni qamrasa — ular (haqiqiy detal); bo'lmasa — 3D panellar (OBJ eksportidagidek) */
    const qutili = !!(dat && dat.qutilar.length && dat.qutilar.length === parts.length && dat.qutilar.every(q => partByRef[q.ref]));
    /* qism → material kodi (kesim ro'yxatidagi eng ko'p uchragani) */
    const slotMat = {};
    for (const pt of parts) { const s = pt.slot === 'polka' ? 'polka' : pt.slot; (slotMat[s] = slotMat[s] || {})[pt.material] = ((slotMat[s] || {})[pt.material] || 0) + 1; }
    const engKop = (s) => { const x = slotMat[s]; return x ? Object.entries(x).sort((a, b) => b[1] - a[1])[0][0] : null; };
    const panelMat = (slot) => { const s = slot === 'polka' ? 'polka' : slot === 'stoleshnitsa' ? 'stoleshnitsa' : QISM.includes(slot) ? slot : 'korpus'; return engKop(s) || engKop('korpus') || frag.material_code || ''; };
    const kromkaMatn = (code) => {
      const es = ((cl && cl.edges) || []).filter(e => e.code === code);
      return es.length ? es.map(e => (e.sides || []).join('') + ' ' + (+e.thickness || 0) + ' mm' + (e.name ? ' (' + e.name + ')' : '')).join('; ') : '—';
    };

    const detallar = [];
    if (qutili) {
      const map = qutiPanel(dat.qutilar, asm.panels);
      dat.qutilar.forEach((q, i) => {
        const pt = partByRef[q.ref], P = asm.panels[map[i]];
        const slot = pt.slot || 'korpus', qism = slot === 'fasad' ? 'fasad' : slot === 'orqa' ? 'orqa' : 'korpus';
        const s = q.s.map(r1), min = lok(v3.sub(q.c, s.map(v => v / 2))).map(r1);
        const nom = String((P && P.name) || pt.name || pt.code || 'detal');
        const ol = [+pt.finish_length || +pt.length, +pt.finish_width || +pt.width, +pt.thickness].map(v => r1(v || 0));
        detallar.push({ nom, kod: pt.code, ref: pt.ref, qatlam: qatlami(slot), mat: mat(qism, pt.material), min, s,
          atr: { detal: nom, kod: pt.code, material: materiallar[mat(qism, pt.material)].dekor, material_kodi: pt.material || '',
            olcham: ol.join('×') + ' mm', kromka: kromkaMatn(pt.code) } });
      });
    } else {
      for (const P of asm.panels) {
        const slot = P.slot || 'korpus', qism = slot === 'fasad' ? 'fasad' : slot === 'orqa' ? 'orqa' : 'korpus';
        const code = panelMat(slot), s = [P.w, P.d, P.h].map(r1);
        const min = lok([P.x - P.w / 2, P.y - P.d / 2, P.z - P.h / 2]).map(r1);
        const ol = s.slice().sort((a, b) => b - a);
        detallar.push({ nom: String(P.name || P.id), kod: P.code || P.id, qatlam: qatlami(slot), mat: mat(qism, code), min, s,
          atr: { detal: String(P.name || P.id), kod: P.code || P.id || '', material: materiallar[mat(qism, code)].dekor, material_kodi: code, olcham: ol.join('×') + ' mm', kromka: '—' } });
      }
    }

    /* furnitura */
    const hw = (cl && cl.hardware) || frag.hardware || [];
    const ishlatildi = {};
    const hwTop = (tur) => {
      const [re, yoq] = HW_RE[tur];
      return hw.find(x => re.test((x.name || '') + ' ' + (x.code || '')) && !(yoq && yoq.test((x.name || '') + ' ' + (x.code || ''))));
    };
    const hwNomi = (tur) => {
      const x = hwTop(tur);
      if (!x) return { nom: N.furn[tur], kod: '' };
      const id = x.id || boglash[x.code];
      const nom = ((furnById[id] || {}).name || (hwByCode[x.code] || {}).name || x.name || x.code || N.furn[tur]).replace(/\s+/g, ' ').trim();
      ishlatildi[x.code] = (ishlatildi[x.code] || 0) + 1;
      return { nom, kod: String(id || x.code || ''), hwKod: x.code };
    };
    const furnitura = [];
    const qosh = (tur, t, m, shakl, qism) => {
      const n = hwNomi(tur);
      furnitura.push({ tur, nom: (n.kod ? n.nom + ' (' + n.kod + ')' : n.nom).slice(0, 160), kod: n.kod, mat: mat(qism || 'furnitura'), t: lok(t).map(r1), m, shakl,
        atr: { furnitura: n.nom, kod: n.kod || '—', tur: N.furn[tur] } });
    };
    const zap = (dat && dat.zapchast) || [];
    const furn = asm.furn || [];
    const ruchkaZap = zap.some(z => z.tur === 'ruchka');
    const ruchkaFurn = furn.some(f => f.tur === 'ruchka');
    for (const z of zap) {
      if (z.tur === 'petlya') {
        /* kosa (Ø35, 11,5 mm — eshik ichida, teshigida) + yelka korpus ichiga (yon devor tomonida, 46 mm chuqurlikka) — soddalashtirilgan;
           lokal: Z — eshikdan korpus ichiga, X — petlya qirrasi (yon devor) tomoni. Yelka yon devordan tashqariga chiqmaydi
           (3D rentgen belgisi — services/belgi3d.js — faqat ko'rsatkich, uning yelkasi qirradan tashqariga chiqadi) */
        const m = bazis(v3.neg(z.n), [z.yelka || 1, 0, 0]);
        qosh('petlya', z.p, m, [{ tur: 'silindr', c: [0, 0, -11.5], r: 17.5, l: 11.5 }, { tur: 'quti', min: [-4, -8, 0], s: [10, 16, 46] }]);
      } else if (z.tur === 'polka') {
        qosh('polka', z.p, bazis(v3.neg(z.n)), [{ tur: 'silindr', c: [0, 0, 0], r: 3, l: 12 }]);
      } else if (z.tur === 'ruchka') {
        if (p.ruchkasiz) continue;
        const L = r1(v3.len(v3.sub(z.b, z.a)));
        qosh('ruchka', v3.mid(z.a, z.b), bazis(z.n, v3.sub(z.b, z.a)), ruchkaShakl(L), 'ruchka');
      } else if (z.tur === 'napr') {
        const L = r1(v3.len(v3.sub(z.b, z.a)) + 60);
        const m = bazis(v3.neg(z.n), v3.sub(z.b, z.a));
        qosh('napr', v3.mid(z.a, z.b), m, [{ tur: 'quti', min: [-L / 2, -17.5, 1], s: [L, 35, 12] }]);
      }
    }
    for (const f of furn) {
      const X = v3.norm(f.ax), Z = v3.norm(f.az), m = [X, v3.cross(Z, X), Z];
      if (f.tur === 'oyoq') qosh('oyoq', f.o, m, [{ tur: 'silindr', c: [0, 0, 0], r: 15, l: r1(f.l) }]);
      else if (f.tur === 'shtanga') qosh('shtanga', f.o, bazis(X, Z), [{ tur: 'silindr', c: [0, 0, 0], r: 12, l: r1(f.l) }]);
      else if (f.tur === 'ruchka' && !ruchkaZap && !p.ruchkasiz) qosh('ruchka', f.o, m, ruchkaShakl(r1(f.l)), 'ruchka');
    }
    if (!ruchkaZap && !ruchkaFurn && !p.ruchkasiz) {
      for (const P of asm.panels) {
        const hd = P.handle;
        if (!hd) continue;
        qosh('ruchka', [hd.x, hd.y, hd.z], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [{ tur: 'quti', min: [-hd.w / 2, -hd.d / 2, -hd.h / 2].map(r1), s: [hd.w, hd.d, hd.h].map(r1) }], 'ruchka');
      }
    }
    /* joysiz furnitura — modul furniturasida bor, 3D da joyi yo'q (ishlatilganidan ortgani) */
    const joysiz = [];
    for (const x of hw) {
      const tur = Object.keys(HW_RE).find(k => HW_RE[k][0].test((x.name || '') + ' ' + (x.code || '')) && !(HW_RE[k][1] && HW_RE[k][1].test((x.name || '') + ' ' + (x.code || ''))));
      if (!tur) continue;
      const qolgan = Math.max(0, Math.round(+x.qty || 0) - (ishlatildi[x.code] || 0));
      if (qolgan) joysiz.push({ tur, nom: x.name || x.code, kod: String(x.id || boglash[x.code] || x.code || ''), soni: qolgan });
    }

    const nomi = String((doc.chizmalar && doc.chizmalar[p.frg] && doc.chizmalar[p.frg].nom) || N.modul(frag, p) || frag.name || p.frg).replace(/\s+/g, ' ').trim();
    const kod = String(frag.code || p.frg);
    const qty = Math.max(1, Math.round(+p.qty || 1));
    const modul = {
      id: p.id, kod, nom: (nomi.indexOf(kod) === 0 ? nomi : kod + ' ' + nomi).slice(0, 160), olcham: [w, d, h].map(r1),
      t: [+p.x || 0, +p.y || 0, +p.z || 0], rot: ((+p.rot || 0) % 360 + 360) % 360, qty, manba: qutili ? 'kesim' : '3d',
      detallar, furnitura, joysiz,
      atr: { modul: nomi, kod, olcham: [w, d, h].map(r1).join('×') + ' mm', detal: detallar.length, furnitura: furnitura.length,
        joysiz_furnitura: joysiz.length ? joysiz.map(j => j.nom + (j.kod ? ' (' + j.kod + ')' : '') + ' ×' + j.soni).join('; ') : '—' }
    };
    modul.imzo = JSON.stringify([modul.nom, detallar, furnitura, modul.atr]);   // bir xil modul — bitta komponent ta'rifi
    modullar.push(modul);
  }
  return { materiallar, qatlamlar: N.qatlam.slice(0, 4), modullar };
}

/** ruchka: planka (L + 24) × 12 × 10 fasaddan 28 mm da, 2 ustuncha 10 × 10 × 24 — 3D dagidek (materials3d.js furnMesh) */
function ruchkaShakl(L) {
  return [{ tur: 'quti', min: [-(L + 24) / 2, -6, 23], s: [L + 24, 12, 10] },
    { tur: 'quti', min: [-L / 2 - 5, -5, 0], s: [10, 10, 24] }, { tur: 'quti', min: [L / 2 - 5, -5, 0], s: [10, 10, 24] }];
}

/** modul joylashuvi → dunyo: aylanish (Z o'qi, gradus) va siljish (mm) */
export function modulJoyi(m) {
  const a = m.rot * Math.PI / 180;
  return { t: m.t, R: [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]] };
}

/** furnitura shakli → yuzalar (lokal mm): quti — 6 yuza, silindr — 16 qirrali prizma (lokal Z bo'ylab). Yuzalar tashqariga qaragan. */
export function shaklYuzalar(sh, seg = 16) {
  if (sh.tur === 'quti') return qutiYuzalar(sh.min, sh.s);
  const out = [], { c, r, l } = sh, pa = [], pb = [];
  for (let i = 0; i < seg; i++) {
    const a = 2 * Math.PI * i / seg, x = c[0] + r * Math.cos(a), y = c[1] + r * Math.sin(a);
    pa.push([r1(x * 1000) / 1000, r1(y * 1000) / 1000, c[2]]); pb.push([r1(x * 1000) / 1000, r1(y * 1000) / 1000, c[2] + l]);
  }
  out.push(pa.slice().reverse(), pb.slice());
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; out.push([pa[i], pa[j], pb[j], pb[i]]); }
  return out;
}
/** quti (min burchak, o'lcham) → 6 yuza, tashqariga qaragan (soat strelkasiga qarshi — tashqaridan qaralganda) */
export function qutiYuzalar(min, s) {
  const [x0, y0, z0] = min, x1 = x0 + s[0], y1 = y0 + s[1], z1 = z0 + s[2];
  return [
    [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
    [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]],
    [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]]
  ];
}
