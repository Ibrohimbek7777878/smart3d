import { get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, xato } from '../../../store/ui.js';
import { scene } from '../scene/sahna.js';
import { t } from '../../../i18n/index.js';

/* TZ-19: fayllar — har yorliq haqiqiy fayl beradi (services/eksport.js — alohida bo'lak, birinchi bosilganda yuklanadi). */
function ctx(opt) {
  const st = get(), p = st.project;
  return { opt, sel: st.editor && st.editor.sel, doc: project.doc, H: project.H, res: project.res, name: p.name, matCode: p.matCode, fasadCode: p.fasadCode, sheet: p.sheet,
    nestCfg: project.H ? project.nestCfg() : {}, sp: scene.sahna && scene.sahna.sp, toast, logo: st.settings.sets.logo,
    fail: (e, nom) => xato('S3D-EXP-101', { matn: t('fayllar.yaratilmadi', { nom: nom || t('fayllar.fayl'), s: (e && e.message) || e }), modul: 'editor/files', err: e }) };
}

/** k — eksport turi: 'hisobot', 'rasm', 'excel', 'giblab', 'dxf', ... Xato bo'lsa — kod bilan xabar (S3D-EXP-101) */
let mod = null;
/** oldindan yuklash (sahna ochilganda) — bosilganda fayl darhol, foydalanuvchi bosishi ichida yaratiladi
 *  (hisobot yangi oyna ochadi: kechiksa brauzer uni bloklaydi) */
export const preloadEksport = () => import('../../../services/eksport.js').then(m => (mod = m));

export function faylYukla(k, opt) {
  if (!project.H) return;
  const fail = (e) => xato('S3D-EXP-101', { matn: t('fayllar.yaratilmadi_k', { k }), modul: 'editor/files', err: e });
  const run = (m) => {
    try {
      const r = m.eksport[k](ctx(opt));
      if (r && typeof r.catch === 'function') r.catch(fail);
    } catch (e) { fail(e); }
  };
  if (mod) run(mod); else preloadEksport().then(run, fail);
}
