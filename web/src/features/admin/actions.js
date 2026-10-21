import { get, set } from '../../store/index.js';
import { S } from '../../store/session.js';
import { toast, xato } from '../../store/ui.js';
import { t, serverXato } from '../../i18n/index.js';

/* TZ-37 (1-faza; 2-faza: materiallar, katalog, foydalanuvchilar; 3-faza: tizim, tarix, erp): admin panel — server /api/admin/* (faqat role=admin). Bo'limlar: manzil /admin/<bolim> (app/marshrutlar.js). */
export const BOLIMLAR = ['narxlar', 'furnitura', 'materiallar', 'katalog', 'promptlar', 'standart', 'foydalanuvchilar', 'tizim', 'tarix'];
export const BOLIM_IKON = { narxlar: 'narx', furnitura: 'furnitura', materiallar: 'material', katalog: 'mebel', promptlar: 'ai', standart: 'konstruktor', foydalanuvchilar: 'foydalanuvchilar', tizim: 'server', tarix: 'qayta' };

export const adminMi = (u) => !!u && u.role === 'admin';

/** admin panelni ochish; bolim — BOLIMLAR dan (noma'lum bo'lsa — narxlar) */
export function openAdmin(bolim) {
  const b = BOLIMLAR.includes(bolim) ? bolim : 'narxlar';
  const nav = get().nav;
  set('nav', { screen: 'admin', adminBolim: b, from: nav.screen === 'admin' ? nav.from : nav.screen });
}

/** /api/admin/... so'rovi → { ok, j, status }; xato bo'lsa — toast (kod bilan), ok=false */
export async function adm(yol, o, kod = 'S3D-ADM-101') {
  try {
    const r = await S.api(yol, o);
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      toast(serverXato(j && j.error, j && j.code) || t('umumiy.xato_n', { n: r.status }), (j && j.code) || kod);
      return { ok: false, j, status: r.status };
    }
    return { ok: true, j, status: r.status };
  } catch (e) { xato('S3D-NET-101', { modul: 'admin', err: e }); return { ok: false, j: null, status: 0 }; }
}

/** ro'yxat javobi turlicha o'ralgan bo'lishi mumkin: [..] yoki { items | promptlar | audit | rows | list: [..] } */
export function royxatOl(j) {
  if (Array.isArray(j)) return j;
  if (j && typeof j === 'object') for (const k of ['items', 'promptlar', 'audit', 'rows', 'list', 'yozuvlar']) if (Array.isArray(j[k])) return j[k];
  return [];
}
