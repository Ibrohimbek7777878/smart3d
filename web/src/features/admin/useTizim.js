import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '../../i18n/index.js';
import { vaqt } from '../../shared/lib/format.js';
import { adm } from './actions.js';

/* TZ-37 (3-faza, bo'lim 8): Tizim — GET /api/admin/tizim (AI/Google/SMS/Telegram holati, xatolar, zaxira; kalit QIYMATI yo'q, faqat bor/yo'q) va
 * GET /api/admin/xatolar?rid=|kod= (oxirgi jurnal yozuvlari — mavjud TZ-19 API). Faqat ko'rish: bu sahifa hech narsani o'zgartirmaydi. */
export const hajm = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB');
export function ishlash(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return t('admin.tz_uptime_fmt', { d, h, m });
}

export function useTizim() {
  const [d, setD] = useState(null);
  const [xato, setXato] = useState(false);
  const [q, setQ] = useState('');
  const [royxat, setRoyxat] = useState(null);
  const kalitRef = useRef(0);
  const yukla = useCallback(async () => {
    const a = await adm('/api/admin/tizim', undefined, 'S3D-ADM-102');
    if (a.ok && a.j && a.j.ai) { setD(a.j); setXato(false); } else setXato(true);
  }, []);
  const xatolar = useCallback(async (s) => {
    const kalit = ++kalitRef.current;                          // eski javob yangisini bosib ketmasin
    const v = String(s || '').trim();
    const p = v ? (/^S3D-/i.test(v) ? 'kod=' + encodeURIComponent(v.toUpperCase()) : 'rid=' + encodeURIComponent(v.toLowerCase())) : '';
    const a = await adm('/api/admin/xatolar' + (p ? '?' + p : ''), undefined, 'S3D-ADM-102');
    if (kalit === kalitRef.current) setRoyxat(a.ok && a.j && Array.isArray(a.j.oxirgi) ? a.j.oxirgi : []);
  }, []);
  useEffect(() => { yukla(); }, [yukla]);
  useEffect(() => { const id = setTimeout(() => xatolar(q), q ? 350 : 0); return () => clearTimeout(id); }, [xatolar, q]);
  const hammasi = () => { yukla(); xatolar(q); };
  return { d, xato, q, setQ, royxat, yukla: hammasi, vaqtKor: (v) => vaqt(v) };
}
