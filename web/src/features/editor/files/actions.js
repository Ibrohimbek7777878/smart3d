import { get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, xato } from '../../../store/ui.js';
import { eksport } from '../../../services/eksport.js';
import { scene } from '../scene/sahna.js';

/* TZ-19: fayllar — har yorliq haqiqiy fayl beradi (services/eksport.js). */
function ctx() {
  const st = get(), p = st.project;
  return { doc: project.doc, H: project.H, res: project.res, name: p.name, matCode: p.matCode, fasadCode: p.fasadCode, sheet: p.sheet,
    nestCfg: project.H ? project.nestCfg() : {}, sp: scene.sahna && scene.sahna.sp, toast, logo: st.settings.sets.logo,
    fail: (e, nom) => xato('S3D-EXP-101', { matn: (nom || 'Fayl') + ' yaratilmadi: ' + ((e && e.message) || e), modul: 'editor/files', err: e }) };
}

/** k — eksport turi: 'hisobot', 'rasm', 'excel', 'giblab', 'dxf', ... Xato bo'lsa — kod bilan xabar (S3D-EXP-101) */
export function faylYukla(k) {
  if (!project.H) return;
  const fail = (e) => xato('S3D-EXP-101', { matn: 'Fayl yaratilmadi (' + k + ')', modul: 'editor/files', err: e });
  try {
    const r = eksport[k](ctx());
    if (r && typeof r.catch === 'function') r.catch(fail);
  } catch (e) { fail(e); }
}
