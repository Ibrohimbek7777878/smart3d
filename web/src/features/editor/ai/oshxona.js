import { useSlice } from '../../../store/index.js';
import { closeSheet, xato } from '../../../store/ui.js';
import { baribirChiz } from './konstruksiya.js';
import { t, til } from '../../../i18n/index.js';

/* egasi #166: AI oshxona — "nima tushunildi" kartasi. Har qator: matndan olingani yoki sukut (tizim standarti).
 * Ma'lumot — aiBuild natijasi (res.oshxona: spec, natija — konstruktor xulosasi, xona, tuzatish, ogoh). Hisob — engine'da. */

const OYOQ_SUKUT = 100;

/** res.oshxona → kartadagi qatorlar [{ matn, manba: 'matn'|'sukut'|'ai', diqqat }] */
export function oshxonaQatorlar(osh, room) {
  if (!osh || !osh.spec) return [];
  const s = osh.spec, m = s.manba || {}, n = osh.natija;
  const out = [];
  const q = (matn, manba, diqqat) => out.push({ matn, manba: manba || 'matn', diqqat: !!diqqat });
  const qm = (...k) => (k.every(x => m[x] === 'sukut') ? 'sukut' : k.some(x => m[x] === 'ai') ? 'ai' : 'matn');
  if (!n) { q(t('ai.osh_qurilmadi'), 'matn', true); return out; }
  const [p1, p2, p3] = n.qavatlar;
  q(s.uzunlik ? t('ai.osh_uzunlik', { v: s.uzunlik }) : t('ai.osh_uzunlik_yoq'), qm('uzunlik'));
  q(t('ai.osh_q1', { h: n.jami1, o: p1.z || OYOQ_SUKUT, k: p1.h, s: n.jami1 - p1.h - (p1.z || 0), d: p1.d, n: p1.n }), qm('q1_boyi', 'q1_chuqurligi'));
  /* egasi #183: "ustkisiz" — 2-qavat va fartuk yo'q (kartadagi talab qatori aytadi) */
  if (s.ustki !== false) {
    q(t('ai.osh_fartuk', { v: p2.z - n.jami1 }), qm('fartuk'));
    q(t('ai.osh_q2', { h: p2.h, d: p2.d, z: p2.z, n: p2.n }), qm('q2_boyi', 'q2_chuqurligi'));
  }
  if (p3) q(t('ai.osh_q3', { h: p3.h, d: p3.d, z: p3.z, n: p3.n }), qm('q3_boyi', 'q3_chuqurligi'));
  if (n.ruchkasiz) q(t('ai.osh_ruchkasiz') + (s.uslub === 'haytek' ? ' · ' + t('ai.osh_haytek') : ''), qm('ruchkasiz'));
  else q(t('ai.osh_ruchkali'), 'sukut');
  if (n.gola) q(t('ai.osh_gola', { g: n.gola.gorizontal, v: n.gola.vertikal }), qm('gola'));
  q(t('ai.osh_tortma', { n: n.tortma.soni, m: n.tortma.modul }) + (n.tortma.yonaltiruvchi === 'tandem_vakuum' ? ' · ' + t('ai.osh_tandem') : ''), qm('tortma'));
  if (n.tortma.soni < (s.tortma.soni || 0)) q(t('ai.osh_tortma_kam', { s: s.tortma.soni, n: n.tortma.soni }), 'matn', true);
  if (s.gaz.bor) q(t('ai.osh_gaz', { g: s.gaz.eni || 600, v: s.vytyajka.eni || s.gaz.eni || 600 }), qm('gaz', 'vytyajka'));
  q(t('ai.osh_stol', { t: s.stoleshnitsa.qalinlik || 26, d: s.stoleshnitsa.chuqurligi || 600 }), qm('stol_qalinlik', 'stol_chuqurligi'));
  if (m.moyka !== 'matn') q(t('ai.osh_moyka'), 'sukut');
  const x = osh.xona || {};
  if (x.sukut && room) q(t('ai.osh_xona', { w: room.w, d: room.d }), 'sukut');
  if (x.kengaydi) q(t('ai.osh_xona_keng', { a: x.kengaydi.oldin, b: x.kengaydi.keyin }), 'matn', true);
  if (x.balandlik) q(t('ai.osh_xona_baland', { a: x.balandlik.oldin, b: x.balandlik.keyin }), 'matn', true);
  for (const z of osh.tuzatish || []) q(t('ai.osh_tuzatish', { k: z.kod, n: z.n, m: z.m }), 'matn', true);
  /* egasi #168: faqat katalog modullari — har qavatda qaysi modul (kod · nomi · o'lchami · soni) va chegaradan tashqari o'lchamlar */
  const ON = { w: t('ai.osh_o_w'), d: t('ai.osh_o_d'), h: t('ai.osh_o_h') };
  const chg = {};
  for (const c of n.chegara || []) { const k = c.frg + c.o + c.soraldi; if (!chg[k]) chg[k] = c; }
  for (const c of Object.values(chg)) q(t('ai.osh_chegara', { frg: c.frg, o: ON[c.o], s: c.soraldi, a: c.min, b: c.max, m: c.natija }), 'matn', true);
  n.qavatlar.forEach((pq, i) => { if (pq.modullar.length) q(t('ai.osh_modullar', { q: i + 1, s: pq.modullar.map(x => x.frg + ' · ' + x.nom + ' ' + x.w + '×' + x.d + '×' + x.h + (x.n > 1 ? ' ×' + x.n : '')).join('; ') }), 'katalog'); });
  return out;
}

/* ── egasi #183: karta har qurishda — shakl, o'lchamlar qayerga ishlatildi, talablar (bajarildi / bajarilmadi), modullar ── */
const ro = (catalog, code) => ((catalog || {})[code] || {}).name || code;
const royxat = (list, catalog) => {
  const r = {};
  for (const p of list) { const k = p.frg + '|' + p.w + '|' + p.d + '|' + p.h; (r[k] = r[k] || { frg: p.frg, w: p.w, d: p.d, h: p.h, n: 0 }).n++; }
  return Object.values(r).map(x => x.frg + ' · ' + ro(catalog, x.frg) + ' ' + x.w + '×' + x.d + '×' + x.h + (x.n > 1 ? ' ×' + x.n : '')).join('; ');
};
const texnikami = (catalog, p) => ((catalog || {})[p.frg] || {}).category === 'appliance';

/**
 * res — aiBuild natijasi (karta: shakl, devorlar, talab, olcham3, izohlar). rejim: 'bosh' (shakl, o'lchamlar), 'talab' (talablar, izohlar),
 * 'hammasi' (+ xona va qator modullari — oshxona spec'i bo'lmagan yo'l). room: { w, d, h, taxmin }
 */
export function kartaQatorlar(res, catalog, rejim = 'hammasi', room = null) {
  const k = res && res.karta;
  if (!k) return [];
  const out = [], pl = (res.doc && res.doc.placements) || [];
  const q = (matn, manba, diqqat) => out.push({ matn, manba: manba || 'matn', diqqat: !!diqqat });
  const bosh = rejim !== 'talab', talab = rejim !== 'bosh';
  if (bosh) {
    if (k.shakl) {
      q(t('ai.k_shakl', { s: t('ai.k_shakl_' + k.shakl), d: k.devorlar.join(' + ') }), k.soraldi === 'auto' ? 'sukut' : 'matn');
      if (k.soraldi !== 'auto' && k.soraldi !== k.shakl) q(t('ai.k_shakl_farq', { a: t('ai.k_shakl_' + k.soraldi), b: t('ai.k_shakl_' + k.shakl) }), 'matn', true);
    } else q(t('ai.k_konstruktorsiz'), 'matn', true);
    if (k.olcham3) q(t('ai.k_olcham3', k.olcham3), 'matn');
    else if (room && rejim === 'hammasi') q(t('ai.k_xona', room), room.taxmin ? 'sukut' : 'matn');
  }
  if (!talab) return out;
  const tl = k.talab || {}, bor = (code) => pl.filter(p => p.frg === code);
  const joy = (k.izohlar || []).some(z => /^joy_/.test(z.kalit));
  const sabab = t(joy ? 'ai.k_sabab_joy' : 'ai.k_sabab_yoq');
  if (tl.ustki === false) {
    const u = pl.filter(p => (+p.z || 0) >= 1000 && !texnikami(catalog, p));
    if (u.length) q(t('ai.k_bajarilmadi', { x: t('ai.k_t_ustkisiz'), s: u.length + ' ' + t('ai.k_modul') }), 'matn', true);
    else q(t('ai.k_ustki_yoq'), 'matn');
  }
  const tek = (soraldi, code, nomKey) => {
    if (!soraldi) return;
    const x = bor(code);
    if (x.length) q(t('ai.k_bajarildi', { x: t(nomKey), s: royxat(x, catalog) }), 'katalog');
    else q(t('ai.k_bajarilmadi', { x: t(nomKey), s: sabab }), 'matn', true);
  };
  if (tl.penal) tek(true, 'SP-K-020', tl.duxovka && tl.mikro ? 'ai.k_t_duxovka_mikro' : tl.duxovka ? 'ai.k_t_duxovka' : 'ai.k_t_mikro');
  tek(tl.posudomoyka, 'SP-TX-002', 'ai.k_t_posudomoyka');
  tek(tl.xolodilnik, 'SP-TX-004', 'ai.k_t_xolodilnik');
  for (const z of k.izohlar || []) if (z.diqqat) q(t('konstruktor.iz_' + z.kalit, z.v || {}), 'matn', true);
  if (rejim === 'hammasi') {
    const qator = { pastki: [], ustki: [], baland: [], texnika: [] };
    for (const p of pl) (texnikami(catalog, p) ? qator.texnika : (+p.h || 0) >= 1500 ? qator.baland : (+p.z || 0) >= 1000 ? qator.ustki : qator.pastki).push(p);
    for (const [nom, list] of Object.entries(qator)) if (list.length) q(t('ai.k_qator', { q: t('ai.k_q_' + nom), s: royxat(list, catalog) }), 'katalog');
  }
  return out;
}

/** shablon (engine/aiTur.js shablonReja + promptLoyiha) → karta qatorlari */
export function shablonQatorlar(nom, rj, r, catalog) {
  const out = [];
  const q = (matn, manba, diqqat) => out.push({ matn, manba: manba || 'matn', diqqat: !!diqqat });
  const B = (b) => t('ai.b_' + b);
  q(t('ai.sh_tanildi', { nom }), 'katalog');
  for (const z of rj.qatorlar) {
    const v = Object.assign({}, z.v, z.v.o ? { o: t('tayyor.m_' + z.v.o) } : {}, /^buyum_/.test(z.kalit) ? { b: B(z.v.b) } : {});   // olcham_chegara: {a}–{b} — chegara
    q(t('ai.sh_' + z.kalit, v), z.manba, z.diqqat);
  }
  if (r.placements.length) q(t('ai.sh_modullar', { s: royxat(r.placements, catalog) }), 'katalog');
  if (r.sigmadi.length) q(t('ai.sh_sigmadi', { s: r.sigmadi.map(c => c + ' · ' + ro(catalog, c)).join('; '), w: r.xona.W, d: r.xona.D }), 'katalog', true);
  return out;
}

/** tanilmagan so'rov — karta: "Tushunmadim" + tayyor variantlar (hech narsa qurilmaydi) */
export function nomalumQatorlar(text, promptlar) {
  const nom = (p) => (p.nom && (p.nom[til()] || p.nom.uz)) || p.id;
  return [
    { matn: t('ai.tur_yoq', { s: String(text).slice(0, 80) }), manba: 'matn', diqqat: true },
    { matn: t('ai.tur_variantlar', { s: [t('ai.tur_oshxona'), t('ai.tur_modul')].concat((promptlar || []).filter(p => p.usul === 'toplam').map(nom)).join(', ') }), manba: 'katalog' },
    { matn: t('ai.tur_misol'), manba: 'katalog' }
  ];
}

/** varaq ko'rinishi */
export function useOshxonaVaraq() {
  const q = useSlice('ui').vq;
  const tugma = q && q.tugma && q.chizMatn ? {
    label: t('ai.kat_baribir'),
    bos: () => { const m = q.chizMatn, on = q.aiOn, olib = q.olib; closeSheet(); baribirChiz(m, on, olib).catch(e => xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e })); }
  } : null;
  return { tugma, katalog: !!(q && q.sarlavha), qatorlar: (q && q.qatorlar) || [], manba: (x) => (x === 'sukut' ? t('ai.osh_sukut') : x === 'ai' ? t('ai.osh_ai') : x === 'katalog' ? t('ai.osh_katalog') : t('ai.osh_matndan')) };
}
