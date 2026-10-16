import { set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast } from '../../../store/ui.js';
import { report } from '../../../shared/lib/jurnal.js';
import { matndanSpec, specTekshir, specdanChizma, specXulosa } from '../../../../../app/js/engine/konstruksiyaTili.js';
import { yangiModul } from '../chizish/chizish.js';
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
  yangiModul(null, ch, nom);
  const x = specXulosa(sp);
  const xulosa = t('kons.xulosa', { b: x.bolim, p: x.polka, t: x.tortma, s: x.shtanga, e: x.eshik });
  set('chizish', { izoh: { kim: ai ? t('kons.kim_ai') : t('kons.kim_aisiz'), xulosa, tuzatish: [...new Set(tuzatish.map(TUZ))], tushunilmadi } });
  toast(t('kons.qurildi', { kim: ai ? t('kons.kim_ai') : t('kons.kim_aisiz'), nom }) + (tuzatish.length ? ' · ' + t('kons.tuzatildi', { n: tuzatish.length }) : ''));
  return 'modul';
}
