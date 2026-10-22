import { useState, useEffect, useCallback, useRef } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { vaqt } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* O'zgarishlar tarixi (TZ-37 p.5 va 3-faza kengaytmasi): GET /api/admin/tarix?bolim=&kim=&dan=&gacha=&holat=&q=&limit=&offset= → { jami, items, bolimlar, kimlar }
 * (admin_audit + narx_history bitta ro'yxatda); qaytarish: audit yozuvi — POST /api/admin/qaytar/:id, narxlar — POST /api/admin/narx-qaytar/:id. */
export const SUZGICH = ['', 'narxlar', 'furnitura', 'materiallar', 'katalog', 'promptlar', 'standart', 'foydalanuvchilar', 'erp'];
export const HOLATLAR = ['', 'faol', 'qaytarilgan'];
const SAHIFA = 50;
const qisqa = (v) => {
  if (v == null || v === '') return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
};
const obyekt = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** eski → yangi: obyekt bo'lsa — faqat o'zgargan maydonlar [{ k, e, y }], aks holda bitta qator. 8 qatordan ko'pi kesiladi (qoldig'i soni bilan) */
export function farq(eski, yangi) {
  let qatorlar;
  if (obyekt(eski) || obyekt(yangi)) {
    const a = obyekt(eski) ? eski : {}, b = obyekt(yangi) ? yangi : {};
    qatorlar = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(k => ({ k, e: qisqa(a[k]), y: qisqa(b[k]) }));
    if (!qatorlar.length) qatorlar = [{ k: '', e: qisqa(eski), y: qisqa(yangi) }];
  } else qatorlar = [{ k: '', e: qisqa(eski), y: qisqa(yangi) }];
  return { qatorlar: qatorlar.slice(0, 8), ortiqcha: Math.max(0, qatorlar.length - 8) };
}

export function useTarix() {
  const [bolim, setBolim] = useState('');
  const [kim, setKim] = useState('');
  const [dan, setDan] = useState('');
  const [gacha, setGacha] = useState('');
  const [holat, setHolat] = useState('');
  const [q, setQ] = useState('');
  const [r, setR] = useState(null);                  // { jami, items, bolimlar, kimlar }
  const [band, setBand] = useState(false);
  const kalitRef = useRef(0);

  const yukla = useCallback(async (offset = 0) => {
    const kalit = ++kalitRef.current;                 // eski javob yangisini bosib ketmasin (tez yozganda)
    setBand(true);
    const p = new URLSearchParams({ limit: String(SAHIFA), offset: String(offset) });
    for (const [k, v] of [['bolim', bolim], ['kim', kim], ['dan', dan], ['gacha', gacha], ['holat', holat], ['q', q.trim()]]) if (v) p.set(k, v);
    const a = await adm('/api/admin/tarix?' + p.toString(), undefined, 'S3D-ADM-102');
    if (kalit !== kalitRef.current) return;
    setBand(false);
    const j = a.ok && a.j && Array.isArray(a.j.items) ? a.j : { jami: 0, items: [], bolimlar: [], kimlar: [] };
    setR(o => ({ jami: j.jami, items: offset && o ? [...o.items, ...j.items] : j.items, bolimlar: j.bolimlar || [], kimlar: j.kimlar || [] }));
  }, [bolim, kim, dan, gacha, holat, q]);
  useEffect(() => { const id = setTimeout(() => yukla(0), q ? 300 : 0); return () => clearTimeout(id); }, [yukla, q]);

  const yana = () => yukla((r && r.items.length) || 0);
  const tozala = () => { setBolim(''); setKim(''); setDan(''); setGacha(''); setHolat(''); setQ(''); };
  const qaytar = (x) => confirm({ title: t('admin.tarix_qaytar_sarlavha'), text: t('admin.tarix_qaytar_matn', { bolim: x.bolim, kalit: x.kalit }), ok: t('admin.qaytarish'), danger: true,
    yes: async () => {
      const yol = x.manba === 'narx' ? '/api/admin/narx-qaytar/' : '/api/admin/qaytar/';
      const a = await adm(yol + encodeURIComponent(String(x.id).slice(1)), { method: 'POST', body: {} });
      if (a.ok) { toast(t('admin.tarix_qaytarildi')); yukla(0); }
    } });
  const sana = (v) => { const n = typeof v === 'number' ? v : Date.parse(String(v).replace(' ', 'T') + (String(v).includes('Z') ? '' : 'Z')); return Number.isFinite(n) ? vaqt(n) : String(v || '—'); };
  const filtrBor = !!(bolim || kim || dan || gacha || holat || q);
  return { r, band, bolim, setBolim, kim, setKim, dan, setDan, gacha, setGacha, holat, setHolat, q, setQ, yana, tozala, qaytar, sana, filtrBor };
}
