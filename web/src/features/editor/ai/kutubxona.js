import KUTUBXONA from '../../../../../app/data/promptlar.json';
import { promptlarYukla } from '../../../../../app/js/engine/promptlar.js';

/* TZ-37: tayyor so'rovlar kutubxonasi — serverdan (/api/promptlar: fayl + admin bazasi), zaxira — statik app/data/promptlar.json.
 * Parametrli (usul/maydon — AI'siz loyiha quradi) va matnli (tur: 'matn' — AI qatoriga yoziladigan tayyor buyurtma). Yuklash bir marta, jim. */
let LIST = KUTUBXONA.promptlar, bor = null;

export const hammasi = () => LIST;
export const parametrli = () => LIST.filter(p => p.usul);
/** ro'yxat yuklanadi (bir marta); serverdan kelmasa — statik qoladi */
export function yukla() {
  if (!bor) bor = promptlarYukla(KUTUBXONA.promptlar, (yol) => fetch(yol).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })).then(l => { LIST = l; return l; });
  return bor;
}
