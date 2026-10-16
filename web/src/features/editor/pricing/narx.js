import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

/* TZ-19: narx ko'rinishi — sarlavhadagi tugma va "Narx" qadami uchun bitta hisob (TZ-04: to'liq bo'lmasa — yulduzcha). */
export function narxKorinishi(res) {
  const pr = res ? res.priceRes : null, prod = res ? res.prod : null;
  const total = pr ? pr.total : 0, cost = prod ? prod.totalCost : 0, inc = pr ? pr.incomplete : false;
  return {
    total: res ? raqam(total) : '…', cost: res ? raqam(cost) : '…', profit: res ? raqam(total - cost) : '…',
    star: inc ? '*' : '', note: inc ? t('narx.toliq_emas') : '', som: t('umumiy.som') + (inc ? ' *' : '')
  };
}
