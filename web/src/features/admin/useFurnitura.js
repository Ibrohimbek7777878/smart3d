import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirm, toast } from '../../store/ui.js';
import { son } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* furnitura bog'lash (TZ-37 p.1): GET/PUT/DELETE /api/admin/furnitura-boglash[/:kod]; katalog (ERP ID qidiruvi) — /data/furnitura-catalog.json */
const YOL = '/api/admin/furnitura-boglash';
let KATALOG = null;
async function katalogOl() {
  if (KATALOG) return KATALOG;
  try { const r = await fetch('/data/furnitura-catalog.json'); KATALOG = (await r.json()).items || []; } catch (_) { KATALOG = []; }
  return KATALOG;
}

/** katalogdan qidiruv: SKU / ID / nom bo'yicha, eng ko'pi bilan 12 ta */
export function qidir(kat, q) {
  const s = String(q || '').trim().toLowerCase();
  if (s.length < 2) return [];
  const out = [];
  for (const it of kat) {
    if (String(it.id) === s || String(it.sku || '').toLowerCase().includes(s) || String(it.name || '').toLowerCase().includes(s)) out.push(it);
    if (out.length >= 12) break;
  }
  return out;
}

export function useFurnitura() {
  const [d, setD] = useState(null);                 // { links, narxsiz }
  const [kat, setKat] = useState([]);
  const [tahrir, setTahrir] = useState(null);       // { kod, erp, koef, izoh, q, yangi }
  const [band, setBand] = useState(false);
  const yukla = useCallback(async () => {
    const r = await adm(YOL);
    setD(r.ok && r.j ? { links: r.j.links || [], narxsiz: r.j.narxsiz || [] } : { links: [], narxsiz: [] });
  }, []);
  useEffect(() => { yukla(); katalogOl().then(setKat); }, [yukla]);

  const ochish = (l, kod) => setTahrir({ kod: kod || l.kod, erp: l ? String(l.erp_id || '') : '', koef: l ? String(l.koef ?? 1) : '1', izoh: l ? l.izoh || '' : '', q: '', yangi: !l });
  const topilgan = useMemo(() => tahrir ? qidir(kat, tahrir.q) : [], [kat, tahrir]);
  const tanlangan = tahrir ? kat.find(x => String(x.id) === String(tahrir.erp)) : null;

  const saqla = async () => {
    const k = son(tahrir.koef);
    if (!tahrir.erp.trim()) { toast(t('admin.furn_erp_kerak')); return; }
    if (!(k > 0 && k <= 1000)) { toast(t('admin.furn_koef_chegara')); return; }
    setBand(true);
    const r = await adm(YOL + '/' + encodeURIComponent(tahrir.kod), { method: 'PUT', body: { erp_id: tahrir.erp.trim(), koef: k, izoh: tahrir.izoh.trim() } });
    setBand(false);
    if (r.ok) { toast(t('admin.saqlandi')); setTahrir(null); yukla(); }
  };
  const ochir = (l) => confirm({ title: t('admin.furn_ochir_sarlavha'), text: t('admin.furn_ochir_matn', { kod: l.kod }), ok: t('umumiy.ochirish'), danger: true,
    yes: async () => { const r = await adm(YOL + '/' + encodeURIComponent(l.kod), { method: 'DELETE' }); if (r.ok) { toast(t('admin.furn_ochirildi')); yukla(); } } });

  return { d, tahrir, setTahrir, ochish, topilgan, tanlangan, saqla, ochir, band, katYoq: !kat.length,
    on: (k) => (ev) => setTahrir(x => ({ ...x, [k]: ev.target.value })) };
}
