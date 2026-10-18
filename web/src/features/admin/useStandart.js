import { useState, useEffect } from 'react';
import { toast } from '../../store/ui.js';
import { son } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { adm } from './actions.js';

/* standart konstruksiya (TZ-37 p.3): GET/PUT /api/admin/standart.
 * { korpus|fasad|orqa|polka:{nom,qalinlik}, ruchka:{tur,uzunlik}, birikma, tag:'oyoq'|'sokol', oyoqBalandlik } */
export const QISMLAR = ['korpus', 'fasad', 'orqa', 'polka'];
/** shartnomadagi sukut (korpus LDSP 16, fasad MDF 16, orqa HDF 3, polka LDSP 16, birikma konfirmat, oyoq 100 mm) */
export const SUKUT = { korpus: { nom: 'LDSP', qalinlik: 16 }, fasad: { nom: 'MDF', qalinlik: 16 }, orqa: { nom: 'HDF', qalinlik: 3 }, polka: { nom: 'LDSP', qalinlik: 16 },
  birikma: 'konfirmat', tag: 'oyoq', oyoqBalandlik: 100 };

const matnga = (v) => ({ ...v, ...Object.fromEntries(QISMLAR.map(k => [k, { nom: (v[k] || {}).nom ?? '', qalinlik: String((v[k] || {}).qalinlik ?? '') }])),
  ruchka: { tur: (v.ruchka || {}).tur ?? '', uzunlik: String((v.ruchka || {}).uzunlik ?? '') }, birikma: v.birikma ?? '', tag: v.tag || 'oyoq', oyoqBalandlik: String(v.oyoqBalandlik ?? '') });

export function useStandart() {
  const [f, setF] = useState(null);
  const [band, setBand] = useState(false);
  useEffect(() => { adm('/api/admin/standart').then(a => setF(matnga(a.ok && a.j ? a.j : SUKUT))); }, []);

  const qism = (k, m) => (ev) => setF(x => ({ ...x, [k]: { ...x[k], [m]: ev.target.value } }));
  const oddiy = (k) => (ev) => setF(x => ({ ...x, [k]: ev.target.value }));

  const saqla = async () => {
    const out = { ...f };
    for (const k of QISMLAR) {
      const q = son(f[k].qalinlik);
      if (!f[k].nom.trim() || !(q > 0 && q <= 100)) { toast(t('admin.std_xato_qism')); return; }
      out[k] = { nom: f[k].nom.trim(), qalinlik: q };
    }
    const u = f.ruchka.uzunlik === '' ? 0 : son(f.ruchka.uzunlik), h = son(f.oyoqBalandlik);
    if (!(u >= 0 && u <= 2000) || !(h >= 0 && h <= 500)) { toast(t('admin.std_xato_son')); return; }
    out.ruchka = { tur: f.ruchka.tur.trim(), uzunlik: u };
    out.birikma = f.birikma.trim();
    out.oyoqBalandlik = h;
    setBand(true);
    const a = await adm('/api/admin/standart', { method: 'PUT', body: out });
    setBand(false);
    if (a.ok) toast(t('admin.saqlandi'));
  };
  /* sukutga qaytarish: shakl shartnomadagi qiymatlar bilan to'ldiriladi (ruchka o'zgarmaydi); "Saqlash" bosilgandagina yoziladi */
  const sukut = () => { setF(x => matnga({ ...SUKUT, ruchka: { tur: x.ruchka.tur, uzunlik: x.ruchka.uzunlik } })); toast(t('admin.std_sukut_qoyildi')); };
  return { f, band, qism, oddiy, saqla, sukut };
}
