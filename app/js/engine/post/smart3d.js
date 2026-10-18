/* Smart3D engine/post/smart3d.js — TZ-11: Smart3D loyihasi (hisob natijasi — kesim ro'yxatlari) → stanok modeli
 * (post/project.js: GibLab .project, post/kdt.js: KDT prisadka).
 *
 * Detal o'qlari (XNC): x — tekstura bo'ylab (dl, L uchidan), y — eni bo'ylab, B qirra (y = 0) dan F qirra (y = dw) ga.
 *   Sex fayllarida old (F) qirra — "b" (KDT da pastki qirra), orqa — "t"; teshik nuqtasi: x = u, y = eni − v
 *   (u — L uchidan uzunlik bo'ylab, v — F qirradan; cutlist teshiklari kesim o'lchamida — kromka qalinligi qaytariladi).
 *   Tekstura eni bo'ylab bo'lsa (texture: 'en') — dl = eni, o'qlar almashadi.
 * Teshiklar: sex Bazis birikmalari (MC modullari, TZ-06) va qo'lda chizilgan modullar birikmalari (engine/chizish.js) —
 *   ikkalasi 38 modulda Bazis bilan tekshirilgan. D6 (engine/d6.js): petlya kosasi va vintlari, planka, polka ushlagich,
 *   ruchka — ko'r teshik o'z yuzasida (yuza 2 → XNC side 2); bir koddagi nusxalarning teshiklari har xil bo'lsa (chap va o'ng
 *   yon devor — ko'zgu) — alohida detal. Umumiy SP modullarining teshiklari (shablon — Bazis bilan tekshirilmagan;
 *   TZ-05 da faqat detal o'lchamlari sex qoidasiga keltirildi) stanok fayliga kirmaydi — ogohlantirish bilan. Petlya, polka ushlagich, ruchka teshiklari — D6 jadvali (texnolog).
 */
import { EDGE_DEDUCT_MIN_MM } from '../cutlist.js';
import { chizmaYech } from '../chizish.js';

const STD = { F: 'b', B: 't', L: 'l', R: 'r' }, ALM = { F: 'l', B: 'r', L: 't', R: 'b' };
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * @param {{ cutlists: Array, placements: Array, catalog: Object, materials: Object, nom: string }} o
 * @returns {{ model, ogoh: { spTeshik: number, detal: number } }}
 */
export function stanokModeli(o) {
  const pm = (o.materials && o.materials.panel_materials) || [], em = (o.materials && o.materials.edge_materials) || [];
  const plById = Object.fromEntries((o.placements || []).map(p => [p.id, p]));
  const varaqlar = new Map(), kromkalar = new Map(), guruh = new Map();
  let spTeshik = 0;

  const varaq = (code) => {
    if (!varaqlar.has(code)) {
      const m = pm.find(x => x.code === code) || {};
      const sh = (m.sheets && m.sheets[0]) || [2800, 2070];
      varaqlar.set(code, { id: code, t: +m.thickness || 16, nom: m.name || code, l: Math.max(sh[0], sh[1]), w: Math.min(sh[0], sh[1]) });
    }
    return code;
  };
  const kromka = (code, nom, t) => {
    if (!kromkalar.has(code)) { const m = em.find(x => x.code === code) || {}; kromkalar.set(code, { id: code, t: +t || +m.thickness || 1, w: -1, nom: nom || m.name || code }); }
    return code;
  };

  for (const cl of o.cutlists || []) {
    const p = plById[cl.placementId] || {}, mul = Math.max(1, Math.round(+p.qty || 1));
    let frag = (o.catalog || {})[cl.fragment] || {};
    if (frag.chizma) frag = chizmaYech(frag, +p.w || frag.w, +p.d || frag.d, +p.h || frag.h);
    const nomi = (code) => { const d = (frag.parts || []).find(x => x.code === code); return (d && (d.nom || d.name)) || code; };
    /* kromka: detal kodi → tomon → { material, qalinlik } */
    const kr = {};
    for (const e of cl.edges || []) for (const s of e.sides || []) (kr[e.code] = kr[e.code] || {})[s] = { m: kromka(e.material, e.name, e.thickness), t: +e.thickness || 0 };
    const ded = (code, s) => { const k = (kr[code] || {})[s]; return k && k.t >= EDGE_DEDUCT_MIN_MM ? k.t : 0; };
    const tesh = {};
    for (const h of cl.holes || []) {
      if (h.narx_uchun) continue;   // TZ-20: Bazis importi — faqat narx uchun, stanok fayliga tushmaydi va ogohlantirishga ham kirmaydi
      if (!/^(evrovint|d6_)/.test(h.kind || '')) { spTeshik++; continue; }
      (tesh[h.part] = tesh[h.part] || []).push(h);
    }
    /* bir kodli detallar (kesim ro'yxatida har nusxa alohida); nusxalar teshiklari bo'yicha guruhlanadi (h.ref — shu nusxaga) */
    const byCode = {};
    for (const pt of cl.parts || []) (byCode[pt.code] = byCode[pt.code] || []).push(pt);
    const nusxalar = [];
    for (const [code, pts] of Object.entries(byCode)) {
      const g = new Map();
      for (const pt of pts) {
        const hs = (tesh[code] || []).filter(h => !h.ref || h.ref === pt.ref);
        const k = JSON.stringify(hs.map(h => [h.side, h.torets || '', h.yuza || 1, h.x, h.y, h.dia, h.depth]).sort());
        if (!g.has(k)) g.set(k, { code, pts: [], hs });
        g.get(k).pts.push(pt);
      }
      nusxalar.push(...g.values());
    }
    for (const { code, pts, hs } of nusxalar) {
      const pt = pts[0], alm = pt.texture === 'en', map = alm ? ALM : STD;
      const fl = +pt.finish_length, fw = +pt.finish_width, t = +pt.thickness || 16;
      const dl = alm ? fw : fl, dw = alm ? fl : fw;
      const k = { t: null, b: null, l: null, r: null };
      for (const [s, v] of Object.entries(kr[code] || {})) k[map[s]] = v.m;
      const teshiklar = [], ikkinchi = [];
      for (const h of hs) {
        const v = +h.x + ded(code, 'F'), u = +h.y + ded(code, 'L');           // tayyor detal o'qlari
        const nuqta = alm ? [v, u] : [u, fw - v];
        if (h.side === 'T') {
          const q = map[h.torets] || 'l';
          const z = r2(t / 2);
          if (q === 'l' || q === 'r') teshiklar.push({ tur: q, y: r2(nuqta[1]), z, d: +h.dia, dp: +h.depth });
          else teshiklar.push({ tur: q, x: r2(nuqta[0]), z, d: +h.dia, dp: +h.depth });
        } else {
          const t0 = { tur: 'f', x: r2(nuqta[0]), y: r2(nuqta[1]), d: +h.dia };
          if (+h.depth >= t - 0.01) t0.otuvchi = true; else t0.dp = +h.depth;
          (h.yuza === 2 && !t0.otuvchi ? ikkinchi : teshiklar).push(t0);   // D6: ko'r teshik 2-yuzada — XNC side 2 (o'qlar bir xil)
        }
      }
      const xnc = [];
      if (teshiklar.length) xnc.push({ side: 1, dz: t, teshiklar });
      if (ikkinchi.length) xnc.push({ side: 2, dz: t, teshiklar: ikkinchi });
      const iz = (a) => JSON.stringify(a.map(x => [x.tur, x.x, x.y, x.z, x.d, x.dp, !!x.otuvchi]).sort());
      const key = [pt.material, dl, dw, JSON.stringify(k), iz(teshiklar), iz(ikkinchi), nomi(code)].join('|');
      if (!guruh.has(key)) guruh.set(key, { nom: nomi(code), dl: r2(dl), dw: r2(dw), soni: 0, varaq: varaq(pt.material), kromka: k, xnc, t });
      guruh.get(key).soni += pts.length * mul;
    }
  }
  const detallar = [...guruh.values()].map((d, i) => Object.assign({ id: String(i + 1), kod: String(i + 1) }, d));
  return { model: { nom: o.nom || 'Smart3D', detallar, varaqlar: [...varaqlar.values()], kromkalar: [...kromkalar.values()] }, ogoh: { spTeshik, detal: detallar.length } };
}
