/* TZ-57 (1-qadam): "Bazis plitasi → ERP plitasi" tanlovini eslab qolish (server: /api/plita-moslash, har foydalanuvchining o'zi).
 * Faqat foydalanuvchi o'zi tanlagan moslik saqlanadi; narx saqlanmaydi (narx doim katalog/ERP qatlamidan). Xotira yuklanmagan/xato bo'lsa —
 * hech narsa o'zgarmaydi (moslash avvalgidek faqat bir qiymatli bo'lsa avtomatik). Node'da (brauzersiz) ham import qilinadi. */
import { erpKod } from '../../../app/js/engine/erpKod.js';

const YOL = '/api/plita-moslash';
let xotira = null, kutish = null;

/** Bazis materiali → xotira kaliti: nom (harf-raqam, kichik) | qalinlik */
export function moslashKalit(m) {
  const nom = String((m && m.name) || '').toLowerCase().replace(/[^0-9a-zа-яё]+/g, '');
  return nom ? nom + '|' + (+(m && m.thickness) || 0) : '';
}
export const xotiraBor = () => xotira !== null;
/** testlar uchun */
export function xotiraQoy(items) { xotira = items && typeof items === 'object' ? items : null; }

export function xotiraYukla() {
  if (xotira) return Promise.resolve(xotira);
  if (kutish) return kutish;
  if (typeof fetch !== 'function') return Promise.resolve(null);
  kutish = fetch(YOL, { credentials: 'same-origin', cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => { xotira = (j && j.items && typeof j.items === 'object') ? j.items : {}; return xotira; })
    .catch(() => { xotira = {}; return xotira; })          // tarmoq/kirish xatosi: bo'sh xotira (moslash avvalgidek)
    .finally(() => { kutish = null; });
  return kutish;
}

/** xotiradagi tanlov → katalogdagi plita (kod bo'yicha; katalogda endi yo'q bo'lsa — null) */
export function xotiradanSheet(m, sheets) {
  const x = xotira && xotira[moslashKalit(m)];
  return x && Array.isArray(sheets) ? (sheets.find(s => erpKod(s) === x.kod) || null) : null;
}

/** tanlovni saqlash (xato bo'lsa — jim; tanlov loyihada baribir qo'llangan) */
export function xotiraSaqla(m, sh) {
  const kalit = moslashKalit(m);
  if (!kalit || !sh || typeof fetch !== 'function') return Promise.resolve(false);
  const kod = erpKod(sh);
  (xotira || (xotira = {}))[kalit] = { kod, nom: String(sh.name || '') };
  return fetch(YOL, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kalit, kod, nom: String(sh.name || '').slice(0, 200) }) }).then(r => r.ok).catch(() => false);
}
