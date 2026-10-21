import { useState, useEffect, useCallback, useRef } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* TZ-37 (2-faza, bo'lim 7): foydalanuvchilar / loyihalar / buyurtmalar — ko'rish, qidirish, bloklash.
 * GET /api/admin/{foydalanuvchilar|loyihalar|buyurtmalar}?q=&holat=&limit=&offset= → { jami, items }; GET /api/admin/foydalanuvchilar/:id; PUT …/:id/blok { bloklangan, sabab } */
const YOL = '/api/admin/';
export const TABLAR = ['foydalanuvchilar', 'loyihalar', 'buyurtmalar'];
export const HOLATLAR = { foydalanuvchilar: ['', 'faol', 'bloklangan'], loyihalar: [], buyurtmalar: ['', 'yangi', 'qabul', 'ishlab', 'tayyor', 'bekor'] };
const SAHIFA = 50;

export function useFoydalanuvchilar() {
  const [tab, setTab] = useState('foydalanuvchilar');
  const [q, setQ] = useState('');
  const [holat, setHolat] = useState('');
  const [r, setR] = useState(null);                       // { jami, items }
  const [band, setBand] = useState(false);
  const [det, setDet] = useState(null);                   // foydalanuvchi tafsiloti (loyiha va buyurtmalari bilan)
  const [blok, setBlok] = useState(null);                 // bloklash formasi: { id, name, sabab }
  const kalitRef = useRef(0);

  const yukla = useCallback(async (offset = 0) => {
    const kalit = ++kalitRef.current;                      // eski javob yangisini bosib ketmasin (tez yozganda)
    setBand(true);
    const p = new URLSearchParams({ limit: String(SAHIFA), offset: String(offset) });
    if (q.trim()) p.set('q', q.trim());
    if (holat) p.set('holat', holat);
    const a = await adm(YOL + tab + '?' + p.toString());
    if (kalit !== kalitRef.current) return;
    setBand(false);
    const j = a.ok && a.j ? a.j : { jami: 0, items: [] };
    setR(offset ? (o) => ({ jami: j.jami, items: [...((o && o.items) || []), ...j.items] }) : { jami: j.jami, items: j.items });
  }, [tab, q, holat]);
  useEffect(() => { const id = setTimeout(() => yukla(0), q ? 300 : 0); return () => clearTimeout(id); }, [yukla, q]);

  const tabAlmash = (n) => { setTab(n); setHolat(''); setQ(''); setR(null); };
  const yana = () => yukla((r && r.items.length) || 0);

  const ochish = async (u) => {
    const a = await adm(YOL + 'foydalanuvchilar/' + encodeURIComponent(u.id));
    if (a.ok) setDet(a.j);
  };
  const blokOch = (u) => setBlok({ id: u.id, name: u.name || u.email, sabab: '' });
  const blokYubor = async () => {
    setBand(true);
    const a = await adm(YOL + 'foydalanuvchilar/' + encodeURIComponent(blok.id) + '/blok', { method: 'PUT', body: { bloklangan: true, sabab: blok.sabab.trim() } });
    setBand(false);
    if (a.ok) { toast(t('admin.fy_bloklandi')); setBlok(null); setDet(null); yukla(0); }
  };
  const blokOch2 = (u) => confirm({ title: t('admin.fy_och_sarlavha'), text: t('admin.fy_och_matn', { nom: u.name || u.email }), ok: t('admin.fy_och'), danger: false,
    yes: async () => {
      const a = await adm(YOL + 'foydalanuvchilar/' + encodeURIComponent(u.id) + '/blok', { method: 'PUT', body: { bloklangan: false } });
      if (a.ok) { toast(t('admin.fy_ochildi')); setDet(null); yukla(0); }
    } });

  return { tab, tabAlmash, q, setQ, holat, setHolat, r, band, yana, det, setDet, ochish, blok, setBlok, blokOch, blokYubor, blokOch2, SAHIFA,
    sababYoz: (ev) => setBlok(b => ({ ...b, sabab: ev.target.value })) };
}
