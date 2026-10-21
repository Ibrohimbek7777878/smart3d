import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* TZ-37 (2-faza, bo'lim 4): Modullar katalogi. GET /api/admin/katalog → { modullar: [{ kod, nom_fayl, nom:{uz,ru,en}, yashirin, chegara_fayl, chegara_baza, narx_rejim, ... }] }
 * PUT /api/admin/katalog/:kod (qisman; null — fayldagidek), DELETE — butunlay faylga qaytarish. */
const YOL = '/api/admin/katalog';
export const OLCHAM = ['min_w', 'max_w', 'min_d', 'max_d', 'min_h', 'max_h'];
export const REJIMLAR = ['unit', 'm2', 'mm'];
const MAX = 20000;

/** bo'sh → null; butun son 1…20000 → son; aks holda NaN */
export const chegaraSon = (v) => { const s = String(v == null ? '' : v).trim(); if (!s) return null; return /^\d{1,5}$/.test(s) && Number(s) >= 1 && Number(s) <= MAX ? Number(s) : NaN; };

export function useKatalog() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const [faqatYashirin, setFaqatYashirin] = useState(false);
  const [x, setX] = useState(null);                       // tahrir: { kod, nom_uz, nom_ru, nom_en, olcham: { min_w: matn, … }, rejim }
  const [band, setBand] = useState(false);

  const yukla = useCallback(async () => {
    const r = await adm(YOL);
    setD(r.ok && r.j ? r.j.modullar || [] : []);
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  const kategoriyalar = useMemo(() => {
    const m = new Map();
    for (const e of d || []) m.set(e.kategoriya, (m.get(e.kategoriya) || 0) + 1);
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [d]);
  const royxat = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (d || []).filter(e => (!kat || e.kategoriya === kat) && (!faqatYashirin || e.yashirin)
      && (!s || e.kod.toLowerCase().includes(s) || e.nom_fayl.toLowerCase().includes(s) || e.nom.uz.toLowerCase().includes(s) || e.nom.ru.toLowerCase().includes(s) || e.nom.en.toLowerCase().includes(s)));
  }, [d, q, kat, faqatYashirin]);
  const yashirinSoni = (d || []).filter(e => e.yashirin).length;

  const ochish = (e) => setX({ kod: e.kod, nom_uz: e.nom.uz, nom_ru: e.nom.ru, nom_en: e.nom.en,
    olcham: Object.fromEntries(OLCHAM.map(k => [k, e.chegara_baza[k] ? String(e.chegara_baza[k]) : ''])), rejim: e.narx_rejim });
  const joriy = x && d ? d.find(e => e.kod === x.kod) || null : null;

  const yoz = async (kod, body, ok) => {
    setBand(true);
    const r = await adm(`${YOL}/${encodeURIComponent(kod)}`, { method: 'PUT', body });
    setBand(false);
    if (r.ok) { toast(ok || t('admin.saqlandi')); await yukla(); }
    return r.ok;
  };
  /** ko'rinish: yashirish / ko'rsatish (null — fayldagidek: ko'rinadi) */
  const korinish = (e) => yoz(e.kod, { yashirin: e.yashirin ? null : true }, e.yashirin ? t('admin.kat_korsatildi') : t('admin.kat_yashirildi'));

  const saqla = async () => {
    const olcham = {};
    for (const k of OLCHAM) {
      const v = chegaraSon(x.olcham[k]);
      if (Number.isNaN(v)) { toast(t('admin.kat_olcham_xato')); return; }
      olcham[k] = v;
    }
    for (const o of ['w', 'd', 'h']) {
      const lo = olcham['min_' + o] ?? joriy.chegara_fayl['min_' + o], hi = olcham['max_' + o] ?? joriy.chegara_fayl['max_' + o];
      if (lo > 0 && hi > 0 && lo > hi) { toast(t('admin.kat_min_max')); return; }
    }
    const nom = (v) => (String(v || '').trim() || null);
    const body = { nom_uz: nom(x.nom_uz), nom_ru: nom(x.nom_ru), nom_en: nom(x.nom_en), ...olcham };
    if (!joriy.texnika) body.narx_rejim = x.rejim === joriy.narx_rejim_fayl ? null : x.rejim;
    if (joriy.texnika) for (const k of OLCHAM) delete body[k];
    if (await yoz(x.kod, body)) setX(null);
  };
  const qaytar = () => confirm({ title: t('admin.mat_qayt_sarlavha'), text: t('admin.kat_qayt_matn', { kod: joriy.kod }), ok: t('admin.fayldagiga_qaytar'), danger: true,
    yes: async () => {
      setBand(true);
      const r = await adm(`${YOL}/${encodeURIComponent(joriy.kod)}`, { method: 'DELETE' });
      setBand(false);
      if (r.ok) { toast(t('admin.qaytarildi')); setX(null); yukla(); }
    } });

  return { d, royxat, kategoriyalar, yashirinSoni, q, setQ, kat, setKat, faqatYashirin, setFaqatYashirin, x, setX, joriy, ochish, band, korinish, saqla, qaytar,
    on: (k) => (ev) => setX(z => ({ ...z, [k]: ev.target.value })), olchamYoz: (k) => (ev) => setX(z => ({ ...z, olcham: { ...z.olcham, [k]: ev.target.value } })) };
}
