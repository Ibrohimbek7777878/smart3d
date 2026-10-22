import { useState, useEffect, useCallback, useRef } from 'react';
import { S } from '../../store/session.js';
import { toast } from '../../store/ui.js';
import { t } from '../../i18n/index.js';
import { isoMs, soatMin } from '../../services/erpHolat.js';
import { adm, royxatOl } from './actions.js';

/* TZ-44 (10): admin "Jonli sinxronlash" kartasi (ERP sinxronlash bo'limida). Server o'zi ERP'dan narx oladi; admin bu yerda holatni ko'radi,
 * "Hozir sinxronla" bosadi, pauzaga qo'yadi, avtomatik qo'llash chegarasini (%) o'zgartiradi. ERP'ga brauzer murojaat qilmaydi.
 * API: GET /api/admin/erp/jonli (holat + oxirgi 50 o'zgarish + tasdiq kutayotganlar) · POST /api/admin/erp/jonli/hozir (30 soniyada 1 marta)
 *      · PUT /api/admin/erp/jonli { pauza: bool, chegara_foiz: 5..100 } */
const YOL = '/api/admin/erp/jonli';
const YANGILASH_MS = 15000;                           // karta ochiq turganda holat har 15 soniyada yangilanadi (tab yashirin bo'lsa — to'xtaydi)
export const HOZIR_KUTISH_MS = 30000;                 // server "Hozir" ni 30 soniyada bir marta qabul qiladi
export const CHEGARA = [5, 100];
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const son = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** server javobi → karta uchun tekis shakl. Javob { jonli: {...}, ozgarishlar, kutayotgan } yoki tekis bo'lishi mumkin; maydon nomlari shartnoma bo'yicha (TZ-44 4-band) */
export function jonliNormal(j) {
  const x = obj(j), jn = x.jonli && typeof x.jonli === 'object' ? x.jonli : x;
  const hs = typeof jn.holat === 'string' ? jn.holat : typeof x.holat === 'string' ? x.holat : '';          // "yoqilgan" | "pauza" | "ochiq" ham bo'lishi mumkin
  const pauza = jn.pauza !== undefined ? !!jn.pauza : x.pauza !== undefined ? !!x.pauza : hs === 'pauza';
  const yoqilgan = jn.yoqilgan !== undefined ? !!jn.yoqilgan : x.yoqilgan !== undefined ? !!x.yoqilgan : !!hs && hs !== 'ochiq';
  const kut = x.kutayotgan !== undefined ? x.kutayotgan : x.tasdiq_kutadi !== undefined ? x.tasdiq_kutadi : jn.kutayotgan;
  const kutObj = obj(kut);
  return {
    holat: !yoqilgan ? 'ochiq' : pauza ? 'pauza' : 'yoqilgan', yoqilgan, pauza,
    chegara: son(jn.chegara_foiz !== undefined ? jn.chegara_foiz : x.chegara_foiz, 30),
    oxirgi: jn.oxirgi_muvaffaqiyat || null, manba: jn.manba_sana || null, xato: Math.max(0, son(jn.xato_soni, 0)), kurs: jn.kurs != null ? jn.kurs : null,
    kutayotgan: Array.isArray(kut) ? kut.length : Math.max(0, son(kutObj.soni !== undefined ? kutObj.soni : kut, 0)),
    kutayotganId: kutObj.partiya_id != null ? kutObj.partiya_id : x.kutayotgan_partiya != null ? x.kutayotgan_partiya : x.partiya_id != null ? x.partiya_id : null,
    sabab: typeof x.sabab === 'string' ? x.sabab : '', xatoKodi: obj(x.oxirgi_xato).kod || jn.xato_kodi || '',
    kursKutadi: obj(x.kurs_kutadi).yangi ? { eski: obj(x.kurs_kutadi).eski, yangi: obj(x.kurs_kutadi).yangi } : null,
    ozgarishlar: royxatOl(x.ozgarishlar !== undefined ? x.ozgarishlar : x.tarix !== undefined ? x.tarix : x.oxirgi_ozgarishlar).slice(0, 50)
  };
}

/** "dd.mm HH:MM" (brauzer vaqti) — server vaqtidan */
export function vaqtKorsat(v) {
  const ms = isoMs(v);
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms), p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' ' + soatMin(ms);
}

export function useErpJonli() {
  const [d, setD] = useState(null);                       // jonliNormal() natijasi
  const [yoq, setYoq] = useState(false);                  // holat olinmadi
  const [chegara, setChegara] = useState('');             // kiritilayotgan chegara (matn)
  const [tahrir, setTahrir] = useState(false);            // chegara qo'lda o'zgartirilgan — server qiymati ustiga yozilmaydi
  const [band, setBand] = useState(false);
  const [hozirKutish, setHozirKutish] = useState(false);
  const tahrirRef = useRef(false), jonli = useRef(true);
  useEffect(() => { tahrirRef.current = tahrir; }, [tahrir]);

  const yukla = useCallback(async () => {
    try {
      const r = await S.api(YOL);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) throw new Error('HTTP ' + r.status);
      if (!jonli.current) return;
      const n = jonliNormal(j);
      setD(n); setYoq(false);
      if (!tahrirRef.current) setChegara(String(n.chegara));
    } catch (_) { if (jonli.current) setYoq(true); }        // jim: karta ichida "olinmadi" yozuvi
  }, []);
  useEffect(() => {
    jonli.current = true; yukla();
    const id = setInterval(() => { if (document.visibilityState !== 'hidden') yukla(); }, YANGILASH_MS);
    return () => { jonli.current = false; clearInterval(id); };
  }, [yukla]);

  const hozir = async () => {
    if (band || hozirKutish) return;
    setBand(true);
    const a = await adm(YOL + '/hozir', { method: 'POST' });
    setBand(false);
    if (!a.ok) return;
    toast(t('admin.erpj_hozir_boshlandi'));
    setHozirKutish(true); setTimeout(() => { if (jonli.current) setHozirKutish(false); }, HOZIR_KUTISH_MS);
    setTimeout(() => { if (jonli.current) yukla(); }, 3000);
    yukla();
  };
  const yoz = async (pauza, foiz) => {
    setBand(true);
    const a = await adm(YOL, { method: 'PUT', body: { pauza, chegara_foiz: foiz } });
    setBand(false);
    if (a.ok) { setTahrir(false); await yukla(); }
    return a.ok;
  };
  const pauzaFlip = async () => {
    if (!d || band) return;
    const yangi = !d.pauza;
    if (await yoz(yangi, d.chegara)) toast(yangi ? t('admin.erpj_pauza_qoyildi') : t('admin.erpj_pauza_olindi'));
  };
  const chegaraSaqla = async () => {
    if (!d || band) return;
    const n = /^\d{1,3}$/.test(chegara.trim()) ? Number(chegara.trim()) : NaN;
    if (!(n >= CHEGARA[0] && n <= CHEGARA[1])) { toast(t('admin.erpj_chegara_xato'), 'S3D-ADM-019'); return; }
    if (await yoz(d.pauza, n)) toast(t('admin.erpj_saqlandi'));
  };
  const chegaraYoz = (v) => { setChegara(v.replace(/[^\d]/g, '').slice(0, 3)); setTahrir(true); };

  return { d, yoq, band, hozirKutish, chegara, chegaraYoz, hozir, pauzaFlip, chegaraSaqla, yukla };
}
