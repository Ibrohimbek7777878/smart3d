import { useSlice, set } from '../../store/index.js';
import { raqam, sana } from '../../shared/lib/format.js';
import { s3Thumb } from '../../shared/design3d/engine.js';
import { newProject, openProject, openFile, askRemove } from './actions.js';
import { bazisYukla } from '../bazis/bazis.js';
import { useDavom } from './davom.js';
import { t } from '../../i18n/index.js';

const THUMB = s3Thumb(1200, 800, 450, '#B4834F', 'door', 2, 100);

/** "Loyihalarim" qiymatlari: qidiruv (nom yoki mijoz) va kartalar */
export function useLoyihalar() {
  const pr = useSlice('projects'), bz = useSlice('bazis');
  const q = pr.q.toLowerCase();
  const list = (pr.list || []).filter(p => !q || ((p.name || '') + ' ' + (p.client || '')).toLowerCase().includes(q));
  return {
    pq: pr.q, onPq: ev => set('projects', { q: ev.target.value }),
    newProject, openFile, bazisYukla, bazisYuk: bz.yuk,
    projEmpty: !list.length,
    /* TZ-27: bo'sh ro'yxat sababi — qidiruv, loyiha yo'q yoki server bilan aloqa yo'q */
    bosh: !list.length ? (pr.aloqa === false ? t('loyihalar.aloqa_yoq') : q ? t('umumiy.topilmadi_boshqa_soz_bilan') : t('loyihalar.bosh')) : '',
    davom: useDavom(),
    projects: list.map(p => ({
      name: p.name || t('umumiy.loyiha'), client: p.client || '—', date: sana(p.updated_at), price: raqam(p.total_price || 0) + ' ' + t('umumiy.som'), mods: t('loyihalar.modul_n', { n: p.modules || 0 }),
      t: THUMB, open: () => openProject(p.id), del: () => askRemove(p)
    }))
  };
}
