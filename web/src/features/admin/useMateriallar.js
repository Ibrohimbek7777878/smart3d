import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirm, toast, xato } from '../../store/ui.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* TZ-37 (2-faza, bo'lim 3): Materiallar — "Asosiy 100" dekorlar. GET /api/admin/materiallar → { dekorlar: [{ kalit, dekor, rang, rang_fayl, rang_manba, rasm, variantlar }] }
 *   rang:  PUT/DELETE /dekor/:kalit {rang_hex};   rasm: PUT {data: base64} / DELETE /dekor/:kalit/rasm;   narx: PUT {uzs} / DELETE /narx/:kod (ERP varaq narxi)
 * O'zgarish ilovada sahifa qayta ochilganda ko'rinadi (ilova ma'lumotni yuklashda GET /api/materiallar dan oladi). */
const YOL = '/api/admin/materiallar';
const HEX = /^#[0-9a-f]{6}$/i;
export const RASM_MAX = 600 * 1024;
export const RASM_TURLAR = ['image/png', 'image/jpeg', 'image/webp'];
const kalit = (k) => encodeURIComponent(k);

/** "1 250 000" / "1250000" → butun son yoki NaN */
export const narxSon = (v) => { const s = String(v == null ? '' : v).replace(/[\s ]/g, ''); return /^\d{1,9}$/.test(s) ? Number(s) : NaN; };

/** File → base64 (data: prefiksisiz). Xato — S3D-ADM-104 */
function faylOqi(f) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => no(r.error || new Error('FileReader'));
    r.readAsDataURL(f);
  });
}

export function useMateriallar() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState('');
  const [guruh, setGuruh] = useState('');
  const [x, setX] = useState(null);                       // ochiq dekor: { kalit, rang, narx: { kod: matn } }
  const [band, setBand] = useState(false);

  const draft = (e) => ({ kalit: e.kalit, rang: e.rang, narx: Object.fromEntries(e.variantlar.map(v => [v.kod, String(v.narx || '')])) });
  const yukla = useCallback(async (ochiq) => {
    const r = await adm(YOL);
    const list = r.ok && r.j ? r.j.dekorlar || [] : [];
    setD(list);
    if (ochiq) { const e = list.find(z => z.kalit === ochiq); setX(e ? draft(e) : null); }
  }, []);
  useEffect(() => { yukla(); }, [yukla]);

  const guruhlar = useMemo(() => [...new Set((d || []).map(e => e.guruh).filter(Boolean))], [d]);
  const royxat = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (d || []).filter(e => (!guruh || e.guruh === guruh) && (!s || e.dekor.toLowerCase().includes(s) || e.kalit.includes(s)));
  }, [d, q, guruh]);
  const dekor = x && d ? d.find(e => e.kalit === x.kalit) || null : null;

  const ochish = (e) => setX(draft(e));
  const amal = async (yol, o, ok) => {
    setBand(true);
    const r = await adm(yol, o);
    setBand(false);
    if (r.ok) { toast(ok); await yukla(x && x.kalit); }
    return r.ok;
  };

  const rangSaqla = () => {
    if (!HEX.test(x.rang)) { toast(t('admin.mat_rang_xato')); return; }
    return amal(`${YOL}/dekor/${kalit(x.kalit)}`, { method: 'PUT', body: { rang_hex: x.rang.toLowerCase() } }, t('admin.saqlandi'));
  };
  const rangQayt = () => confirm({ title: t('admin.mat_qayt_sarlavha'), text: t('admin.mat_rang_qayt_matn', { nom: dekor.dekor }), ok: t('admin.fayldagiga_qaytar'), danger: true,
    yes: () => amal(`${YOL}/dekor/${kalit(x.kalit)}`, { method: 'DELETE' }, t('admin.qaytarildi')) });

  const rasmYukla = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    if (!RASM_TURLAR.includes(f.type) || f.size > RASM_MAX || !f.size) { toast(t('admin.mat_rasm_xato')); return; }
    let data;
    try { data = await faylOqi(f); } catch (e) { xato('S3D-ADM-104', { modul: 'admin/materiallar', err: e }); return; }
    return amal(`${YOL}/dekor/${kalit(x.kalit)}/rasm`, { method: 'PUT', body: { data } }, t('admin.saqlandi'));
  };
  const rasmOchir = () => confirm({ title: t('admin.mat_qayt_sarlavha'), text: t('admin.mat_rasm_ochir_matn', { nom: dekor.dekor }), ok: t('admin.fayldagiga_qaytar'), danger: true,
    yes: () => amal(`${YOL}/dekor/${kalit(x.kalit)}/rasm`, { method: 'DELETE' }, t('admin.qaytarildi')) });

  const narxSaqla = (v) => {
    const n = narxSon(x.narx[v.kod]);
    if (!(n >= 1)) { toast(t('admin.mat_narx_xato')); return; }
    return amal(`${YOL}/narx/${encodeURIComponent(v.kod)}`, { method: 'PUT', body: { uzs: n } }, t('admin.saqlandi'));
  };
  const narxQayt = (v) => confirm({ title: t('admin.mat_qayt_sarlavha'), text: t('admin.mat_narx_qayt_matn', { nom: v.nom }), ok: t('admin.fayldagiga_qaytar'), danger: true,
    yes: () => amal(`${YOL}/narx/${encodeURIComponent(v.kod)}`, { method: 'DELETE' }, t('admin.qaytarildi')) });

  return { d, royxat, guruhlar, q, setQ, guruh, setGuruh, x, setX, dekor, ochish, band, rangSaqla, rangQayt, rasmYukla, rasmOchir, narxSaqla, narxQayt,
    rangYoz: (v) => setX(z => ({ ...z, rang: v })), narxYoz: (kod, v) => setX(z => ({ ...z, narx: { ...z.narx, [kod]: v } })) };
}
