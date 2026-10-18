import { chizmaKatalog, tikla } from '../../../app/js/engine/chizish.js';

/* TZ-24 A: qo'lda chizilgan modullar loyihada — doc.chizmalar { kod: { nom, ch (yassi) } }.
 * Loyiha ochilganda katalogga qo'shiladi (detallar har safar o'lchamga qarab chizmadan hisoblanadi — engine/chizish.js). */
export function chizmaUla(H, doc) {
  if (!H || !doc || !doc.chizmalar) return 0;
  let n = 0;
  for (const [kod, x] of Object.entries(doc.chizmalar)) {
    if (!x || !x.ch || !/^CH-[A-Z0-9-]{3,40}$/.test(kod)) continue;
    H.catalog[kod] = chizmaKatalog(tikla(x.ch), kod, x.nom || kod);
    n++;
  }
  return n;
}
