import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

/* TZ-19: narx ko'rinishi — sarlavhadagi tugma va "Narx" qadami uchun bitta hisob.
 * TZ-20 (2026-10-17): "* to'liq emas" o'rniga "Narx aniqligi X%" — mijoz narxining tasdiqlangan manbadan (ERP plita/furnitura,
 * egasi yoki sex jadvali stavkasi) kelgan qismi (productionCost → aniqlik). 100% va narxsiz qator yo'q bo'lsa — belgi yo'q. */
export function narxKorinishi(res) {
  const pr = res ? res.priceRes : null, prod = res ? res.prod : null;
  const total = pr ? pr.total : 0, cost = prod ? prod.totalCost : 0;
  const an = prod && prod.aniqlik ? prod.aniqlik : null;
  const pct = an && an.pct != null ? an.pct : null;
  const toliq = pct === 100 && !(an.narxsiz > 0);
  return {
    total: res ? raqam(total) : '…', cost: res ? raqam(cost) : '…', profit: res ? raqam(total - cost) : '…',
    star: pct != null && !toliq ? pct + '%' : '', note: pct != null ? t('narx.aniqlik', { n: pct }) : '', som: t('umumiy.som'),
    aniqlik: pct, toliq
  };
}
