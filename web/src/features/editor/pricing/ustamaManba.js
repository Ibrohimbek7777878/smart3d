import { t } from '../../../i18n/index.js';

/* TZ-49 (3): ustama manbasi — "usta (shu loyiha) / usta (Sozlamalar) / admin 35% (sana) / sukut 0%".
 * prod.markupKelish (dvigatel: productionCost) — { tur: 'usta' | 'admin' | 'sukut', foiz (%), manba, sana }; shu loyihadagi tanlov (doc.ustama) — alohida. */
const f1 = (x) => String(Math.round((+x || 0) * 10) / 10).replace('.', ',');

/** narx paneli uchun: hozir amal qilayotgan ustama manbasi (matn). Hisob yo'q bo'lsa — '' */
export function ustamaManbaMatn(prod, doc) {
  const k = prod && prod.markupKelish;
  if (!k) return '';
  const loyiha = !!(doc && doc.ustama && typeof doc.ustama.yoqilgan === 'boolean');
  const n = f1(Math.round((prod.markupPct || 0) * 1000) / 10);
  if (loyiha) return t('narx.ustama_src_loyiha', { n });
  if (k.tur === 'usta') return t('narx.ustama_src_usta', { n });
  if (k.tur === 'admin') return t('narx.ustama_src_admin', { n: f1(k.foiz), sana: k.sana || '—' });
  return t('narx.ustama_src_sukut', { n: f1(k.foiz) });
}
