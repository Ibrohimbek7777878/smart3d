import { set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, openSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { katalogdanTop } from '../../../../../app/js/engine/katalogTanlash.js';
import { report } from '../../../shared/lib/jurnal.js';
import { matndanSpec, specTekshir, specdanChizma, specXulosa, plitaTop } from '../../../../../app/js/engine/konstruksiyaTili.js';
import { yangiModul } from '../chizish/chizish.js';
import { erpQosh } from '../../../services/erpMaterial.js';
import { faylYukla } from '../files/actions.js';
import { t } from '../../../i18n/index.js';

/* TZ-26: AI konstruksiya — usta matni → konstruksiya tili → ideal chizma (engine/konstruksiyaTili.js → engine/chizish.js).
 *   1) serverda AI (Claude) ulangan va usta kirgan bo'lsa — /api/ai/konstruksiya (AI tilga o'giradi, server tekshiradi);
 *   2) aks holda yoki AI javob bermasa — AI'siz tahlilchi (shu yerda, qoidalar bilan).
 * Natija — joriy xonaga yangi modul (CH-…), "Modul chizish" paneli ochiladi: usta o'zgartira oladi. Panelda — kim tushundi,
 * tizim nimani to'g'riladi, nima tushunilmadi. Narx, detallar, stanok fayllari — chizish dvigatelidan (AI narx bermaydi). */

async function serverdan(matn, aiOn) {
  if (!S.loggedIn || !aiOn) return null;
  try {
    const r = await S.api('/api/ai/konstruksiya', { method: 'POST', body: { text: matn } });
    if (!r.ok) return null;                                     // 503 (ulanmagan), 502 (javob yo'q) — AI'siz tahlilchi
    const j = await r.json();
    return j && (j.xona || j.spec) ? j : null;
  } catch (e) { report('S3D-AI-101', { modul: 'ai/konstruksiya', err: e }); return null; }
}

const TUZ = (x) => t('kons.tuz_' + x.kod, { o: x.o ? t('kons.k_' + x.o) : '', k: x.k, n: x.n, m: x.m });   // o — o'lcham nomi, k — soni
const SLOT = { korpus: 'korpus', polka: 'polka', fasad: 'fasad' };

/** spec.material (dekor nomi) → ERP plitasi (sheet-catalog) → shu modul qismlari (p.slots). Topilmasa — o'ylab topilmaydi:
 *  qism standart materialda qoladi, xabar. Qaytaradi: { bor: ["Korpus: …"], yoq: ["«…» ro'yxatda yo'q"] } */
function materialQoy(H, p, material) {
  const bor = [], yoq = [];
  if (!p || !material) return { bor, yoq };
  const sheets = (H.sheetCatalog && H.sheetCatalog.sheets) || [];
  const kesh = {};
  for (const q of Object.keys(SLOT)) {
    const m = material[q];
    if (!m || !m.nom) continue;
    const k = m.nom + '|' + m.qalinlik + '|' + q;
    const sh = k in kesh ? kesh[k] : (kesh[k] = plitaTop(sheets, m.nom, m.qalinlik, q));
    if (!sh) { yoq.push(t('kons.mat_yoq', { nom: m.nom + (m.qalinlik ? ' ' + m.qalinlik + ' ' + t('umumiy.mm') : '') })); continue; }
    p.slots = Object.assign({}, p.slots || {}, { [SLOT[q]]: erpQosh(H, project.doc, sh) });
    bor.push(t('kons.mat_qism', { qism: t('mebel.qism_' + q), nom: sh.name }));
  }
  return { bor, yoq: [...new Set(yoq)] };
}

/* egasi #168: katalog moduli tanlovi — kartadagi qatorlar */
const KN = (k) => (/^(eni|chuqurligi|boyi)$/.test(k) ? t('kons.k_' + k) : t('ai.kat_k_' + k));
function katalogQatorlar(tan) {
  const out = [];
  const q = (matn, manba, diqqat) => out.push({ matn, manba, diqqat: !!diqqat });
  const olchammi = (x) => /^(eni|chuqurligi|boyi)$/.test(x.k);
  for (const x of tan.mos) q(olchammi(x) ? t('ai.kat_mos_olcham', { o: KN(x.k), v: x.soraldi }) : t('ai.kat_mos_son', { o: KN(x.k), v: x.soraldi }), 'katalog');
  for (const x of tan.mosEmas) {
    q(olchammi(x) ? t('ai.kat_chegara', { o: KN(x.k), v: x.soraldi, a: x.min || '—', b: x.max || '—', m: x.natija })
      : x.k === 'kupe' ? t('ai.kat_kupe') : t('ai.kat_farq', { o: KN(x.k), v: x.soraldi, m: x.modulda }), 'katalog', true);
  }
  return out;
}

/** "Baribir chizish (Modul chizish)" — foydalanuvchi o'zi bosadi: avvalgi chizish yo'li (yangi CH- modul).
 *  olib — katalogdan qo'yilgan modul (topilgan holat): chizilgan modul uning O'RNIGA keladi */
export function baribirChiz(matn, aiOn, olib) {
  if (olib) {
    const i = project.doc.placements.findIndex(x => x.id === olib);
    if (i >= 0) { project.doc.placements.splice(i, 1); project.changed('items', true); }
  }
  return aiKonstruksiya(matn, aiOn, { chiz: true });
}

/** matn → modul. Qaytaradi: 'modul' | 'katalog' | 'yoq' | 'xona' (bu konstruksiya emas — chaqiruvchi oshxona yo'liga o'tadi).
 *  egasi #168: avval katalogdagi eng mos tayyor modul (katalogTanlash.js); topilmasa — chizilmaydi, xabar va "Baribir chizish" tugmasi.
 *  o.chiz — foydalanuvchi "Baribir chizish" ni bosdi: avvalgidek yangi modul chiziladi */
export async function aiKonstruksiya(matn, aiOn, o = {}) {
  if (!project.H) return 'xona';
  const ai = await serverdan(matn, aiOn);
  if (ai && ai.xona) return 'xona';
  /* AI javobi serverda tekshirilgan — saytda yana bir bor (bir xil qoida); AI'siz — tahlilchi */
  const xom = ai ? ai.spec : matndanSpec(matn);
  const n = specTekshir(xom);
  if (n.xona) return 'xona';
  if (!o.chiz) {
    const tan = katalogdanTop(n.spec, xom, project.H.catalog, matn);
    const kim = ai ? t('kons.kim_ai') : t('kons.kim_aisiz');
    if (tan && tan.topildi) {
      const fr = project.H.catalog[tan.frg];
      project.tarix.belgi('ai');                                   // bekor qilish: AI modul — bitta qadam
      const p = L.addPlacement(project.doc, Object.assign({}, fr, tan.olcham));
      const M = materialQoy(project.H, p, n.spec.material);
      project.changed('items', true);
      const f = n.spec.furnitura || {}, qolmadi = [];
      if (f.birikma === 'konfirmat') qolmadi.push(t('kons.f_konfirmat'));
      if (f.birikma === 'ekssentrik') qolmadi.push(t('kons.f_ekssentrik'));
      if (f.polka === 'polkaderjatel') qolmadi.push(t('kons.f_polkaderjatel'));
      if (f.ruchka > 0) qolmadi.push(t('kons.f_ruchka', { n: f.ruchka }));
      if (n.spec.orqa === 'yergacha') qolmadi.push(t('kons.f_orqa_yer'));
      const qatorlar = [{ matn: t('ai.kat_tanlandi', { frg: tan.frg, nom: tan.nom, w: p.w, d: p.d, h: p.h }), manba: 'katalog' }]
        .concat(katalogQatorlar(tan), M.bor.map(s => ({ matn: s, manba: 'matn' })), M.yoq.map(s => ({ matn: s, manba: 'matn', diqqat: true })),
          qolmadi.length ? [{ matn: t('ai.kat_qolmadi', { s: qolmadi.join(', ') }), manba: 'matn', diqqat: true }] : []);
      openSheet('aioshxona', { sarlavha: 'ai.kat_sarlavha', qatorlar, chizMatn: matn, aiOn, tugma: 1, olib: p.id });
      toast(t('ai.kat_qoyildi', { kim, frg: tan.frg, nom: tan.nom }));
      if (n.spec.eksport === 'obj') faylYukla('obj', { id: p.id });
      return 'katalog';
    }
    const yet = tan ? tan.yetishmaydi.map(x => x.k === 'tur' ? t('ai.kat_tur_yoq') : /^(eni|chuqurligi|boyi)$/.test(x.k)
      ? t('ai.kat_chegara', { o: KN(x.k), v: x.soraldi, a: x.min || '—', b: x.max || '—', m: x.natija }) : t('ai.kat_farq', { o: KN(x.k), v: x.soraldi, m: x.modulda })) : [];
    const qatorlar = [{ matn: t('ai.kat_yoq', { s: yet.join('; ') }), manba: 'katalog', diqqat: true }]
      .concat(tan && tan.frg ? [{ matn: t('ai.kat_eng_yaqin', { frg: tan.frg, nom: tan.nom }), manba: 'katalog' }] : []);
    openSheet('aioshxona', { sarlavha: 'ai.kat_yoq_sarlavha', qatorlar, chizMatn: matn, aiOn, tugma: 'ai.kat_baribir' });
    toast(t('ai.kat_yoq', { s: yet.join('; ') }));
    return 'yoq';
  }
  const tuzatish = (ai ? ai.tuzatish : []).concat(n.tuzatish), tushunilmadi = ai ? ai.tushunilmadi : n.tushunilmadi;
  const sp = n.spec, ch = specdanChizma(sp);
  const nom = sp.nom || t('chizish.nom_' + sp.tur) + ' ' + sp.eni + '×' + sp.chuqurligi + '×' + sp.boyi;
  project.tarix.belgi('ai');                                       // bekor qilish: AI modul — bitta qadam
  const p = yangiModul(null, ch, nom);
  const M = materialQoy(project.H, p, sp.material);
  if (M.bor.length) project.changed('items', true);                // modul materiali — qayta hisob (narx, raskroy)
  const x = specXulosa(sp);
  const xulosa = t('kons.xulosa', { b: x.bolim, p: x.polka, t: x.tortma, s: x.shtanga, e: x.eshik });
  const f = sp.furnitura || {}, furn = [];
  if (f.birikma === 'konfirmat') furn.push(t('kons.f_konfirmat'));
  if (f.birikma === 'ekssentrik') furn.push(t('kons.f_ekssentrik'));
  if (f.polka === 'polkaderjatel') furn.push(t('kons.f_polkaderjatel'));
  if (f.ruchka > 0) furn.push(t('kons.f_ruchka', { n: f.ruchka }));
  if (sp.orqa === 'yergacha') furn.push(t('kons.f_orqa_yer'));
  const qoshimcha = M.bor.concat(furn.length ? [t('kons.furnitura', { s: furn.join(', ') })] : []);
  set('chizish', { izoh: { kim: ai ? t('kons.kim_ai') : t('kons.kim_aisiz'), xulosa, tuzatish: [...new Set(tuzatish.map(TUZ))], tushunilmadi, qoshimcha, yoq: M.yoq } });
  toast(t('kons.qurildi', { kim: ai ? t('kons.kim_ai') : t('kons.kim_aisiz'), nom }) + (tuzatish.length ? ' · ' + t('kons.tuzatildi', { n: tuzatish.length }) : '')
    + (M.yoq.length ? ' · ' + M.yoq.join(' · ') : ''));
  /* "obj formatda yubor" — qurilgach OBJ darhol yuklanadi (savolsiz) */
  if (sp.eksport === 'obj') faylYukla('obj', { id: p.id });
  return 'modul';
}
