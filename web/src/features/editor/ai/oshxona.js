import { useSlice } from '../../../store/index.js';
import { closeSheet, xato } from '../../../store/ui.js';
import { baribirChiz } from './konstruksiya.js';
import { t } from '../../../i18n/index.js';

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
  q(t('ai.osh_fartuk', { v: p2.z - n.jami1 }), qm('fartuk'));
  q(t('ai.osh_q2', { h: p2.h, d: p2.d, z: p2.z, n: p2.n }), qm('q2_boyi', 'q2_chuqurligi'));
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
  n.qavatlar.forEach((pq, i) => q(t('ai.osh_modullar', { q: i + 1, s: pq.modullar.map(x => x.frg + ' · ' + x.nom + ' ' + x.w + '×' + x.d + '×' + x.h + (x.n > 1 ? ' ×' + x.n : '')).join('; ') }), 'katalog'));
  return out;
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
