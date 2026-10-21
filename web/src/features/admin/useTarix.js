import { useState, useEffect, useCallback } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { vaqt } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { adm, royxatOl } from './actions.js';

/* audit tarixi (TZ-37 p.5): GET /api/admin/audit?bolim=&limit= ; POST /api/admin/qaytar/:auditId */
export const SUZGICH = ['', 'narxlar', 'furnitura', 'materiallar', 'katalog', 'promptlar', 'standart', 'foydalanuvchilar'];
const qisqa = (v) => {
  if (v == null || v === '') return '—';
  let s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
};

export function useTarix() {
  const [bolim, setBolim] = useState('');
  const [r, setR] = useState(null);
  const yukla = useCallback(async (b) => {
    const a = await adm('/api/admin/audit?bolim=' + encodeURIComponent(b) + '&limit=100');
    setR(a.ok ? royxatOl(a.j).map(x => ({
      id: x.id, bolim: x.bolim || '', kalit: x.kalit || '', kim: x.kim || x.user || x.email || x.user_email || x.user_id || '—',
      vaqt: x.vaqt || x.ts || x.created_at || x.sana, eski: qisqa(x.eski), yangi: qisqa(x.yangi) })) : []);
  }, []);
  useEffect(() => { yukla(bolim); }, [yukla, bolim]);
  const qaytar = (x) => confirm({ title: t('admin.tarix_qaytar_sarlavha'), text: t('admin.tarix_qaytar_matn', { bolim: x.bolim, kalit: x.kalit }), ok: t('admin.qaytarish'), danger: true,
    yes: async () => { const a = await adm('/api/admin/qaytar/' + encodeURIComponent(x.id), { method: 'POST', body: {} }); if (a.ok) { toast(t('admin.tarix_qaytarildi')); yukla(bolim); } } });
  const sana = (v) => { const n = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(n) ? vaqt(n) : String(v || '—'); };
  return { r, bolim, setBolim, qaytar, sana };
}
