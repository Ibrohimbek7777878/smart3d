import { useSlice, set } from '../../store/index.js';
import { raqam, sana } from '../../shared/lib/format.js';
import { s3Thumb } from '../../shared/design3d/engine.js';
import { newProject, openProject, openFile, askRemove } from './actions.js';

const THUMB = s3Thumb(1200, 800, 450, '#B4834F', 'door', 2, 100);

/** "Loyihalarim" qiymatlari: qidiruv (nom yoki mijoz) va kartalar */
export function useLoyihalar() {
  const pr = useSlice('projects');
  const q = pr.q.toLowerCase();
  const list = (pr.list || []).filter(p => !q || ((p.name || '') + ' ' + (p.client || '')).toLowerCase().includes(q));
  return {
    pq: pr.q, onPq: ev => set('projects', { q: ev.target.value }),
    newProject, openFile,
    projEmpty: !list.length,
    projects: list.map(p => ({
      name: p.name || 'Loyiha', client: p.client || '—', date: sana(p.updated_at), price: raqam(p.total_price || 0) + ' so\'m', mods: (p.modules || 0) + ' modul',
      t: THUMB, open: () => openProject(p.id), del: () => askRemove(p)
    }))
  };
}
