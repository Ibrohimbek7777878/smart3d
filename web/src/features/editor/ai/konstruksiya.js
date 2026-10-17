import { set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast } from '../../../store/ui.js';
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

/** matn → modul. Qaytaradi: 'modul' | 'xona' (bu konstruksiya emas — chaqiruvchi oshxona yo'liga o'tadi) */
export async function aiKonstruksiya(matn, aiOn) {
  if (!project.H) return 'xona';
  const ai = await serverdan(matn, aiOn);
  if (ai && ai.xona) return 'xona';
  /* AI javobi serverda tekshirilgan — saytda yana bir bor (bir xil qoida); AI'siz — tahlilchi */
  const n = ai ? specTekshir(ai.spec) : specTekshir(matndanSpec(matn));
  if (n.xona) return 'xona';
  const tuzatish = (ai ? ai.tuzatish : []).concat(n.tuzatish), tushunilmadi = ai ? ai.tushunilmadi : n.tushunilmadi;
  const sp = n.spec, ch = specdanChizma(sp);
  const nom = sp.nom || t('chizish.nom_' + sp.tur) + ' ' + sp.eni + '×' + sp.chuqurligi + '×' + sp.boyi;
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
