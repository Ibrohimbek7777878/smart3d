import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { t } from '../../i18n/index.js';
import { adm, royxatOl } from './actions.js';

/* tayyor promptlar (TZ-37 p.2): GET/POST /api/admin/promptlar, PUT/DELETE /api/admin/promptlar/:id.
 * Yozuv: { id, kat, nom_uz/ru/en, matn_uz/ru/en, tartib, faol (0/1) } */
const YOL = '/api/admin/promptlar';
const BOSH = { kat: '', nom_uz: '', nom_ru: '', nom_en: '', matn_uz: '', matn_ru: '', matn_en: '', faol: 1 };
const MAYDON = ['kat', 'nom_uz', 'nom_ru', 'nom_en', 'matn_uz', 'matn_ru', 'matn_en', 'tartib', 'faol'];
const tanasi = (p) => Object.fromEntries(MAYDON.filter(k => p[k] !== undefined).map(k => [k, p[k]]));

export function usePromptlar() {
  const [r, setR] = useState(null);
  const [x, setX] = useState(null);                 // tahrir/qo'shish formasi (id bo'lsa — tahrir)
  const [band, setBand] = useState(false);
  const yukla = useCallback(async () => {
    const a = await adm(YOL);
    setR(a.ok ? royxatOl(a.j).slice().sort((p, q) => (p.tartib || 0) - (q.tartib || 0)) : []);
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  const guruhlar = useMemo(() => {
    const m = new Map();
    for (const p of r || []) { if (!m.has(p.kat)) m.set(p.kat, []); m.get(p.kat).push(p); }
    return [...m].map(([kat, list]) => ({ kat, list }));
  }, [r]);
  const turlar = useMemo(() => [...new Set((r || []).map(p => p.kat).filter(Boolean))], [r]);

  const saqla = async () => {
    if (!x.kat.trim() || !x.nom_uz.trim() || !x.matn_uz.trim()) { toast(t('admin.prompt_toldir')); return; }
    setBand(true);
    const tartib = x.id ? x.tartib : ((r || []).reduce((m, p) => Math.max(m, p.tartib || 0), 0) + 1);
    const a = await adm(x.id ? YOL + '/' + encodeURIComponent(x.id) : YOL, { method: x.id ? 'PUT' : 'POST', body: tanasi({ ...x, kat: x.kat.trim(), tartib }) });
    setBand(false);
    if (a.ok) { toast(t('admin.saqlandi')); setX(null); yukla(); }
  };
  const faol = async (p) => { const a = await adm(YOL + '/' + encodeURIComponent(p.id), { method: 'PUT', body: tanasi({ ...p, faol: p.faol ? 0 : 1 }) }); if (a.ok) yukla(); };
  /** tartib: shu guruhdagi qo'shni bilan tartib raqamlari almashtiriladi */
  const surish = async (g, i, d) => {
    const a = g.list[i], b = g.list[i + d];
    if (!a || !b) return;
    const ta = a.tartib ?? i, tb = b.tartib ?? i + d;
    const r1 = await adm(YOL + '/' + encodeURIComponent(a.id), { method: 'PUT', body: tanasi({ ...a, tartib: tb === ta ? ta + d : tb }) });
    if (r1.ok) await adm(YOL + '/' + encodeURIComponent(b.id), { method: 'PUT', body: tanasi({ ...b, tartib: ta }) });
    yukla();
  };
  const ochir = (p) => confirm({ title: t('admin.prompt_ochir_sarlavha'), text: t('admin.prompt_ochir_matn', { nom: p.nom_uz }), ok: t('umumiy.ochirish'), danger: true,
    yes: async () => { const a = await adm(YOL + '/' + encodeURIComponent(p.id), { method: 'DELETE' }); if (a.ok) { toast(t('admin.prompt_ochirildi')); yukla(); } } });

  return { r, guruhlar, turlar, x, setX, band, saqla, faol, surish, ochir, yangi: () => setX({ ...BOSH }),
    on: (k) => (ev) => setX(v => ({ ...v, [k]: ev.target.value })) };
}
