import { get, set, useSlice } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { toast, xato, openSheet, patchSheet, closeSheet } from '../../store/ui.js';
import { raqam, sana, telefon, telGuruh } from '../../shared/lib/format.js';
import { t, serverXato } from '../../i18n/index.js';

/* TZ-23 C1 (egasi #138): sexga buyurtma — Narx va Fayllar panelida "Buyurtma berish" → varaq (mijoz ismi, telefon S1, izoh)
 * → /api/orders (to'liq loyiha bilan — sex shu bilan ishlaydi). "Loyihalarim"da — "Buyurtmalarim" (holati bilan); admin —
 * Sozlamalarda "Buyurtmalar": holatni o'zgartiradi (yangi → qabul → ishlab → tayyor | bekor). Pul harakati yo'q (qoida 5.1). */
export const HOLATLAR = ['yangi', 'qabul', 'ishlab', 'tayyor', 'bekor'];
export const HOLAT_RANG = { yangi: 'var(--acc)', qabul: 'var(--lav)', ishlab: 'var(--cyan)', tayyor: '#7BD88F', bekor: 'var(--mut)' };
const raqamlar = (s) => String(s || '').replace(/\D/g, '');

export function buyurtmaOch() {
  if (!project.doc.placements.length) { toast(t('buyurtma.mebel_yoq')); return; }
  openSheet('buyurtma', { ism: get().project.client || '', tel: '', izoh: '', yuborilmoqda: false });
}

export function useBuyurtmaVaraq() {
  const q = useSlice('ui').vq;
  const pj = useSlice('project');
  const jami = project.res ? project.res.priceRes.total : 0;
  const tel = raqamlar(q.tel).replace(/^998/, '').slice(0, 9);
  return {
    ism: q.ism, onIsm: ev => patchSheet({ ism: ev.target.value.slice(0, 120) }),
    tel: telGuruh(tel),
    onTel: ev => patchSheet({ tel: raqamlar(ev.target.value).replace(/^998/, '').slice(0, 9) }),
    izoh: q.izoh, onIzoh: ev => patchSheet({ izoh: ev.target.value.slice(0, 2000) }),
    loyiha: pj.name, mebel: t('loyihalar.modul_n', { n: project.doc.placements.length }), narx: raqam(jami) + ' ' + t('umumiy.som'),
    band: !!q.yuborilmoqda,
    yubor: () => yubor(q, tel, jami)
  };
}

async function yubor(q, tel, jami) {
  const ism = String(q.ism || '').trim();
  if (!ism) { toast(t('buyurtma.ism_kerak')); return; }
  if (tel.length !== 9) { toast(t('buyurtma.tel_kerak')); return; }
  patchSheet({ yuborilmoqda: true });
  try {
    const r = await S.api('/api/orders', { method: 'POST', body: {
      client_name: ism, client_phone: '998' + tel, notes: String(q.izoh || '').trim(), project_name: get().project.name,
      project_id: S.currentId || null, total_price: Math.round(jami), doc: project.payload() } });
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code) || t('xato.S3D-ORD-101'), (j && j.code) || 'S3D-ORD-101'); patchSheet({ yuborilmoqda: false }); return; }
    if (!get().project.client) { set('project', { client: ism }); S.changed(); }
    closeSheet();
    toast(t('buyurtma.yuborildi', { n: j.id }));
    loadBuyurtmalar();
  } catch (e) { xato('S3D-ORD-101', { modul: 'buyurtma', err: e }); patchSheet({ yuborilmoqda: false }); }
}

/** "Buyurtmalarim" */
export async function loadBuyurtmalar() {
  if (!S.loggedIn) return;
  try { const r = await S.api('/api/orders'); if (r.ok) set('buyurtma', { list: await r.json() }); } catch (_) { /* aloqa yo'q — ro'yxat avvalgidek */ }
}
/** admin: hamma buyurtmalar */
export async function loadAdminBuyurtmalar() {
  try { const r = await S.api('/api/admin/orders'); if (r.ok) set('buyurtma', { admin: await r.json() }); } catch (_) { /* aloqa yo'q */ }
}
export async function holatQoy(id, status) {
  try {
    const r = await S.api('/api/admin/orders/' + id, { method: 'PUT', body: { status } });
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code), (j && j.code) || 'S3D-ORD-101'); return; }
    set('buyurtma', s => ({ admin: (s.admin || []).map(o => (o.id === id ? { ...o, status } : o)) }));
    toast(t('buyurtma.holat_qoyildi', { n: id, h: t('buyurtma.h_' + status) }));
  } catch (e) { xato('S3D-NET-101', { modul: 'buyurtma', err: e }); }
}

/** ro'yxat qatori (usta va admin uchun) */
export const qator = (o) => ({ id: o.id, nom: o.project_name || t('umumiy.loyiha'), mijoz: o.client_name + ' · ' + telefon(o.client_phone), sana: sana(o.created_at),
  narx: raqam(o.total_price || 0) + ' ' + t('umumiy.som'), mods: t('loyihalar.modul_n', { n: o.modules || 0 }), holat: o.status, holatNom: t('buyurtma.h_' + o.status),
  rang: HOLAT_RANG[o.status] || 'var(--mut)', usta: o.usta ? (o.usta.name || o.usta.email) + (o.usta.phone ? ' · ' + telefon(o.usta.phone) : '') : '' });
