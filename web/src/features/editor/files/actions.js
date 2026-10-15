import { get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast } from '../../../store/ui.js';
import { eksport } from '../../../services/eksport.js';
import { scene } from '../scene/sahna.js';

/* TZ-19: fayllar — har yorliq haqiqiy fayl beradi (services/eksport.js). */
function ctx() {
  const st = get(), p = st.project;
  return { doc: project.doc, H: project.H, res: project.res, name: p.name, matCode: p.matCode, fasadCode: p.fasadCode, sheet: p.sheet,
    nestCfg: project.H ? project.nestCfg() : {}, sp: scene.sahna && scene.sahna.sp, toast, logo: st.settings.sets.logo };
}

/** k — eksport turi: 'hisobot', 'rasm', 'excel', 'giblab', 'dxf', ... */
export function faylYukla(k) { if (project.H) eksport[k](ctx()); }
