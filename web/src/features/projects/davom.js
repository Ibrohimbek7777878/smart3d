import { useSlice } from '../../store/index.js';
import { closeSheet } from '../../store/ui.js';
import { raqam, sana } from '../../shared/lib/format.js';
import { openProject } from './actions.js';
import { t } from '../../i18n/index.js';

/* TZ-27 (egasi #137): "Ishni davom ettirish" — chala qolgan loyihalar: kamida 1 modul bor, o'chirilmagan (buyurtma holati
 * hozircha yo'q — TZ-23 C1), oxirgi o'zgartirilgani birinchi. Ish joyida (tez boshlash chipi → varaq) va "Loyihalarim" tepasida. */
export function chalaLoyihalar(list) { return (list || []).filter(p => (p.modules || 0) > 0); }

export function useDavom() {
  const pr = useSlice('projects');
  const royxat = chalaLoyihalar(pr.list).map(p => ({
    id: p.id, nom: p.name || t('umumiy.loyiha'), mijoz: p.client || '—', sana: sana(p.updated_at),
    mods: t('loyihalar.modul_n', { n: p.modules || 0 }), narx: raqam(p.total_price || 0) + ' ' + t('umumiy.som'),
    och: () => { closeSheet(); openProject(p.id); }
  }));
  return { soni: royxat.length, royxat, aloqa: pr.aloqa !== false };
}
