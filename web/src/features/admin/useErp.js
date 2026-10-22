import { useState, useEffect, useCallback, useRef } from 'react';
import { confirm, toast, xato } from '../../store/ui.js';
import { vaqt } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* ERP sinxronlash (TZ-37, 3-faza): admin ERP'dan olingan JSON'ni yuklaydi → server tekshiradi va farqni ko'rsatadi (hech narsa o'zgarmaydi) →
 * admin tanlab tasdiqlaydi → narxlar qo'llanadi (tarixdan qaytariladi). ERP bilan jonli aloqa YO'Q; ERP'ga hech narsa yozilmaydi.
 * API: POST /api/admin/erp/yuklash · GET /api/admin/erp · GET /api/admin/erp/:id · POST /api/admin/erp/:id/qollash · DELETE /api/admin/erp/:id · POST /api/admin/erp/sukut */
const YOL = '/api/admin/erp';
export const SAHIFA = 50;
export const GURUH_TARTIB = ['plita', 'furnitura', 'xizmat', 'stoleshnitsa', 'yangi', 'noaniq'];
export const HOLAT_TARTIB = ['ozgardi', 'toldirildi', 'bir_xil', 'narxsiz', 'qolda', 'yangi', 'noaniq'];
const YUKLASH_CHEGARA = 1.9 * 1024 * 1024;                         // server so'rov chegarasi 2 MB (JSON); ortiqcha maydonlar brauzerda olib tashlanadi
const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** ERP eksporti → serverga yuboriladigan qisqartirilgan shakl: { tur, json } yoki null (tanib bo'lmadi). Faqat kerakli maydonlar (rasm havolalari va h.k. tashlanadi) */
export function eksportTayyorla(j) {
  const arr = Array.isArray(j) ? j : obj(j) ? (j.mahsulotlar || j.xizmatlar || j.results || j.items) : null;
  if (!Array.isArray(arr) || !arr.length) return null;
  const meta = obj(j) && obj(j._meta) ? { sana: j._meta.sana, manba: j._meta.manba } : undefined;
  const xizmat = (obj(j) && Array.isArray(j.xizmatlar)) || (arr.some(x => obj(x) && 'client_price' in x) && !arr.some(x => obj(x) && 'display_price_uzs' in x));
  const ol = (o, kalitlar) => Object.fromEntries(kalitlar.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
  if (xizmat) return { tur: 'xizmat', json: { _meta: meta, xizmatlar: arr.map(x => (obj(x) ? ol(x, ['id', 'name', 'code', 'category_name', 'client_price', 'is_active']) : x)) } };
  return { tur: 'mahsulot', json: { _meta: meta, mahsulotlar: arr.map(x => (obj(x) ? ol(x, ['id', 'sku', 'name', 'category_name', 'unit', 'display_price_uzs', 'price_list_uzs', 'display_price_usd', 'qoldiq']) : x)) } };
}

export function useErp() {
  const [d, setD] = useState(null);                       // { qatlam, partiyalar }
  const [det, setDet] = useState(null);                   // ochiq yuklash: farq qatorlari bilan
  const [guruh, setGuruh] = useState('');
  const [holat, setHolat] = useState('');
  const [q, setQ] = useState('');
  const [istisno, setIstisno] = useState([]);             // 'plita:ERP-…' — qo'llanmaydigan qatorlar
  const [guruhlar, setGuruhlar] = useState({ plita: true, furnitura: true, xizmat: true });
  const [yangiXizmat, setYangiXizmat] = useState(false);
  const [band, setBand] = useState(false);
  const kalitRef = useRef(0);
  const detId = useRef(null);

  const yukla = useCallback(async () => {
    const a = await adm(YOL, undefined, 'S3D-ADM-102');
    setD(a.ok && a.j ? a.j : { qatlam: { plita: 0, furnitura: 0, oxirgi_sana: '' }, partiyalar: [] });
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  const detYukla = useCallback(async (id, offset = 0, f = {}) => {
    const kalit = ++kalitRef.current;                  // eski javob yangisini bosib ketmasin (tez yozganda)
    const p = new URLSearchParams({ limit: String(SAHIFA), offset: String(offset) });
    for (const [k, v] of [['guruh', f.guruh], ['holat', f.holat], ['q', (f.q || '').trim()]]) if (v) p.set(k, v);
    const a = await adm(`${YOL}/${encodeURIComponent(id)}?${p.toString()}`, undefined, 'S3D-ADM-102');
    if (kalit !== kalitRef.current) return;
    if (!a.ok || !a.j) return;
    setDet(o => (offset && o && o.id === a.j.id ? { ...a.j, items: [...o.items, ...a.j.items] } : a.j));
  }, []);
  /* filtr o'zgarsa — ochiq yuklashning birinchi sahifasi qayta olinadi */
  useEffect(() => {
    if (detId.current == null) return undefined;
    const id = setTimeout(() => detYukla(detId.current, 0, { guruh, holat, q }), q ? 300 : 0);
    return () => clearTimeout(id);
  }, [guruh, holat, q, detYukla]);

  const ochish = async (id) => {
    detId.current = id;
    setGuruh(''); setHolat(''); setQ(''); setIstisno([]); setYangiXizmat(false);
    await detYukla(id, 0, {});
  };
  const yop = () => { detId.current = null; setDet(null); };
  const yana = () => det && detYukla(det.id, det.items.length, { guruh, holat, q });

  const fayl = async (file) => {
    if (!file) return;
    let j;
    try { j = JSON.parse(await file.text()); } catch (e) { xato('S3D-ADM-105', { modul: 'admin/erp', err: e }); return; }
    const y = eksportTayyorla(j);
    if (!y) { xato('S3D-ADM-105', { modul: 'admin/erp', matn: t('admin.erp_tanilmadi') }); return; }
    const body = { tur: y.tur, fayl_nom: String(file.name || '').replace(/[<>]/g, '').slice(0, 120), json: y.json };
    if (JSON.stringify(body).length > YUKLASH_CHEGARA) { xato('S3D-ADM-105', { modul: 'admin/erp', matn: t('admin.erp_katta') }); return; }
    setBand(true);
    const a = await adm(YOL + '/yuklash', { method: 'POST', body }, 'S3D-ADM-101');
    setBand(false);
    if (a.ok) { toast(t('admin.erp_yuklandi')); await yukla(); await ochish(a.j.id); }
  };

  /** tanlangan guruhlar bo'yicha qo'llanadigan qatorlar soni (istisnolar ayirilgan) */
  const soni = () => {
    if (!det || det.holat !== 'qoralama') return { plita: 0, furnitura: 0, xizmat: 0, jami: 0 };
    const x = det.xulosa || {}, qo = x.qollanadi || {}, xz = (x.guruh && x.guruh.xizmat) || {};
    const ist = (g) => istisno.filter(k => k.startsWith(g + ':')).length;
    const o = {
      plita: guruhlar.plita ? Math.max(0, (qo.plita || 0) - ist('plita')) : 0,
      furnitura: guruhlar.furnitura ? Math.max(0, (qo.furnitura || 0) - ist('furnitura')) : 0,
      xizmat: guruhlar.xizmat ? Math.max(0, (xz.ozgardi || 0) + (yangiXizmat ? (xz.yangi || 0) : 0) - ist('xizmat')) : 0
    };
    return { ...o, jami: o.plita + o.furnitura + o.xizmat };
  };
  const qatorBelgila = (x) => setIstisno(a => (a.includes(x.g + ':' + x.k) ? a.filter(k => k !== x.g + ':' + x.k) : [...a, x.g + ':' + x.k]));
  const guruhBelgila = (g) => setGuruhlar(o => ({ ...o, [g]: !o[g] }));

  const qollash = () => {
    const n = soni();
    confirm({ title: t('admin.erp_qollash_sarlavha'), text: t('admin.erp_qollash_matn', { n: n.jami, p: n.plita, f: n.furnitura, x: n.xizmat }), ok: t('admin.erp_qollash'), danger: false,
      yes: async () => {
        setBand(true);
        const body = { tasdiq: true, guruhlar: ['plita', 'furnitura', 'xizmat'].filter(g => guruhlar[g]), istisno, yangi_xizmat: yangiXizmat };
        const a = await adm(`${YOL}/${encodeURIComponent(det.id)}/qollash`, { method: 'POST', body }, 'S3D-ADM-101');
        setBand(false);
        if (a.ok) {
          const o = a.j.qollandi;
          toast(t('admin.erp_qollandi', { n: o.plita + o.furnitura + o.xizmat }));
          await yukla(); await ochish(det.id);
        }
      } });
  };
  const ochir = (p) => confirm({ title: t('admin.erp_ochir_sarlavha'), text: t('admin.erp_ochir_matn', { nom: p.fayl_nom || '#' + p.id }), ok: t('umumiy.ochirish'), danger: true,
    yes: async () => {
      const a = await adm(`${YOL}/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      if (a.ok) { if (det && det.id === p.id) yop(); toast(t('admin.erp_ochirildi')); yukla(); }
    } });
  const sukut = () => confirm({ title: t('admin.erp_sukut_sarlavha'), text: t('admin.erp_sukut_matn', { p: d.qatlam.plita, f: d.qatlam.furnitura }), ok: t('admin.erp_sukut'), danger: true,
    yes: async () => {
      const a = await adm(YOL + '/sukut', { method: 'POST', body: { tasdiq: true, guruh: 'hammasi' } });
      if (a.ok) { toast(t('admin.erp_sukut_bajarildi')); await yukla(); if (det) await detYukla(det.id, 0, { guruh, holat, q }); }
    } });

  return { d, det, band, guruh, setGuruh, holat, setHolat, q, setQ, istisno, qatorBelgila, guruhlar, guruhBelgila, yangiXizmat, setYangiXizmat, fayl, ochish, yop, yana,
    soni: soni(), qollash, ochir, sukut, sana: (v) => (v ? vaqt(v) : '—') };
}
