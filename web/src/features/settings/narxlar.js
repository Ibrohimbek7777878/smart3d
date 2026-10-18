import { useEffect } from 'react';
import { inflateRaw } from 'pako';
import { get, set, useSlice } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { xato, toast, confirm } from '../../store/ui.js';
import { raqam } from '../../shared/lib/format.js';
import { t, serverXato } from '../../i18n/index.js';
import { xlsxOqish } from '../../../../app/js/engine/xlsxOqish.js';
import { xizmatJadvalOqish, xizmatFarq, TESHIK_TURLARI, AQL } from '../../../../app/js/engine/narxStavka.js';

/* TZ-20 (2026-10-17): Sozlamalar → "Narxlar" — narx stavkalari (server /api/narxlar). Ko'rish — hamma; o'zgartirish — faqat admin
 * (server tekshiradi). Stavka faqat egasi kiritgan yoki sex xizmat jadvalidagi (qoida 4.3); qaysi qator ishlatilishi — egasi
 * tanlaydi (raspil stanogi, kromka xizmati, teshik turi → prisadka). Sex jadvali BRAUZERDA o'qiladi — fayl serverga ham,
 * repoga ham tushmaydi; serverga faqat ko'rib chiqilgan qatorlar boradi. Pul harakati yo'q, ERP'ga yozilmaydi. */
const setIn = (p) => set('settings', p);
const GURUH_TARTIB = ['raspil', 'kromka', 'prisadka', 'bazis'];

/** serverdagi stavkalar → hisob (yuklashda va saqlangach). Server yo'q bo'lsa — materials.json ("taxmin") qoladi. */
export async function loadNarxlar() {
  try {
    const r = await fetch('/api/narxlar', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    narxQollaHisob(await r.json());
  } catch (e) { setIn({ narxlarYoq: true }); console.warn('S3D-NARX-103', e && e.message); }
}
function narxQollaHisob(n) {
  setIn({ narxlar: n, narxlarYoq: false });
  if (project.H && project.H.applyNarxlar(n)) { project.rebuildEstimator(); project.scheduleRecalc(true); }
}

async function sorov(yol, o, kod) {
  try {
    const r = await S.api(yol, o);
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code) || t('umumiy.xato_n', { n: r.status }), (j && j.code) || kod); return null; }
    return j;
  } catch (e) { xato('S3D-NET-101', { modul: 'narxlar', err: e }); return null; }
}

/** admin: o'zgarish → server; muvaffaqiyatli bo'lsa hisob darhol yangilanadi */
export async function saveNarxlar(patch, xabar) {
  const j = await sorov('/api/narxlar', { method: 'PUT', body: patch }, 'S3D-NARX-101');
  if (!j) return false;
  narxQollaHisob(j.narxlar);
  if (get().settings.narxTarix) loadNarxTarix();
  toast(xabar || t('narxlar.saqlandi', { n: j.ozgarish }));
  return true;
}

/** TZ-36 P7: admin — sukut stavkalarga qaytarish (serverda eski saqlangan qiymat qolgan bo'lsa). qamrov: 'ish_haqi' | 'hammasi'.
 *  Tasdiqdan keyin POST /api/narxlar/sukut; o'zgarish tarixga yoziladi, hisob darhol yangilanadi. */
export function sukutgaQaytar(qamrov) {
  confirm({ title: t('narxlar.sukut_sarlavha'), text: t('narxlar.sukut_matn_' + qamrov), ok: t('narxlar.sukut_tasdiq'), danger: true, yes: async () => {
    const j = await sorov('/api/narxlar/sukut', { method: 'POST', body: { qamrov } }, 'S3D-NARX-101');
    if (!j) return;
    narxQollaHisob(j.narxlar);
    setIn({ narxIn: null });
    if (get().settings.narxTarix) loadNarxTarix();
    toast(j.ozgarish ? t('narxlar.sukut_qaytdi', { n: j.ozgarish }) : t('narxlar.sukut_allaqachon'));
  } });
}

export async function loadNarxTarix() {
  const j = await sorov('/api/narxlar/tarix?limit=200', undefined, 'S3D-NARX-101');
  if (j) setIn({ narxTarix: j });
}

/** "Sex jadvalidan yuklash": .xlsx → ko'rib chiqish (eski → yangi). Saqlanmaguncha hech narsa o'zgarmaydi. */
export async function sexJadvalTanla(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast(t('narxlar.fayl_katta'), 'S3D-NARX-102'); return; }
  let res = null;
  try {
    const varaqlar = xlsxOqish(new Uint8Array(await f.arrayBuffer()), inflateRaw);
    for (const rows of Object.values(varaqlar)) { res = xizmatJadvalOqish(rows); if (res) break; }
  } catch (e) { console.warn('S3D-NARX-102', e && e.message); }
  if (!res || !Object.keys(res.xizmatlar).length) { xato('S3D-NARX-102', { modul: 'narxlar' }); return; }
  setIn({ narxYuklash: { fayl: f.name, ...res, farq: xizmatFarq(get().settings.narxlar, res.xizmatlar) } });
}

async function yuklashSaqlash() {
  const y = get().settings.narxYuklash;
  if (!y) return;
  const kodlar = [...y.farq.yangi, ...y.farq.ozgargan].map(r => r.kod);
  if (!kodlar.length) { setIn({ narxYuklash: null }); toast(t('narxlar.ozgarish_yoq')); return; }
  if (await saveNarxlar({ xizmatlar: Object.fromEntries(kodlar.map(k => [k, y.xizmatlar[k]])) }, t('narxlar.yuklandi', { n: kodlar.length }))) setIn({ narxYuklash: null });
}

const sanaQ = (s) => (s ? String(s).slice(0, 10) : '—');
const manbaQ = (m) => t('narxlar.m_' + ({ egasi: 'egasi', 'sex jadvali': 'sex', taxmin: 'taxmin', ERP: 'erp', usta: 'usta' }[m] || 'yoq'));
const qiymatQ = (v) => (typeof v === 'boolean' ? (v ? t('narxlar.ha') : t('narxlar.yoq')) : v == null ? '—' : raqam(v));
/** tarix yozuvidagi qiymat: xizmat qatori, {qiymat}, kod yoki null */
const tarixQ = (v, xz) => (v == null ? '—' : typeof v === 'string' ? ((xz[v] && xz[v].nom) || v) : typeof v === 'object' ? qiymatQ(v.qiymat) + (v.manba ? ' · ' + manbaQ(v.manba) : '') : qiymatQ(v));

/** tarix kaliti → ekrandagi nom (ustama.foiz → "Ustama", tanlov.prisadka.polka → "Prisadka — …: Polka ushlagich") */
function kalitNomi(k, mats) {
  const ICH = { 'ustama.foiz': 'narxlar.ustama', 'ish_haqi.detal': 'narxlar.ish_detal', 'ish_haqi.modul': 'narxlar.ish_modul', 'ish_haqi.yoqilgan': 'narxlar.ish_haqi_yoqilgan', 'tanlov.raspil': 'narxlar.g_raspil' };
  if (ICH[k]) return t(ICH[k]);
  let m = /^tanlov\.prisadka\.(\w+)$/.exec(k);
  if (m && TESHIK_TURLARI.includes(m[1])) return t('narxlar.g_prisadka') + ': ' + t('narxlar.t_' + m[1]);
  m = /^tanlov\.kromka\.(.+)$/.exec(k);
  if (m) return t('narxlar.g_kromka') + ': ' + (m[1] === '_sukut' ? t('narxlar.kromka_sukut') : ((mats.edge_materials || []).find(e => String(e.code).replace(/\./g, '') === m[1]) || {}).name || m[1]);
  return k.replace(/^xizmatlar\./, '');
}

export function useNarxlar() {
  const st = useSlice('settings'), auth = useSlice('auth');
  useSlice('data');
  const H = project.H, admin = !!(auth.user && auth.user.role === 'admin');
  useEffect(() => { if (!st.narxlar) loadNarxlar(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const N = st.narxlar;
  const mats = (H && H.materials) || {};
  if (!N) return { yuklandi: false, yoq: !!st.narxlarYoq, admin };
  const xz = N.xizmatlar || {};
  const ochiq = st.narxOchiq || {};
  const flip = (k) => setIn({ narxOchiq: { ...ochiq, [k]: !ochiq[k] } });
  const variant = (guruh) => Object.entries(xz).filter(([, r]) => r.guruh === guruh).sort((a, b) => a[1].nom.localeCompare(b[1].nom))
    .map(([kod, r]) => ({ kod, label: r.nom + ' — ' + raqam(r.qiymat) + ' ' + t('narxlar.b_' + guruh) }));
  const tanlovQ = (kod, taxminLabel) => {
    const r = kod && xz[kod];
    return r ? { qiymat: raqam(r.qiymat) + ' ' + t('narxlar.b_' + r.guruh), manba: manbaQ(r.manba), sana: sanaQ(r.sana), tasdiq: true }
      : { qiymat: taxminLabel, manba: taxminLabel ? manbaQ('taxmin') : manbaQ('yoq'), sana: '—', tasdiq: false };
  };
  const pick = (patch) => (ev) => saveNarxlar({ tanlov: patch(ev.target.value || null) });

  /* raspil — bitta stanok (egasi tanlaydi) */
  const raspil = { variant: variant('raspil'), kod: N.tanlov.raspil || '', ...tanlovQ(N.tanlov.raspil, ''), on: pick(v => ({ raspil: v })) };
  /* kromka — har kromka materiali (materials.json) + sukut */
  const edge = [{ code: '_sukut', name: t('narxlar.kromka_sukut') }].concat((mats.edge_materials || []).map(m => ({ code: String(m.code).replace(/\./g, ''), name: m.name, price: m.price_m })));
  const kromka = edge.map(e => {
    const kod = (N.tanlov.kromka || {})[e.code] || '';
    const sukut = !kod && e.code !== '_sukut' && (N.tanlov.kromka || {})._sukut;
    return { nom: e.name, kod, ...(sukut ? { ...tanlovQ(sukut), sukut: true } : tanlovQ(kod, e.price ? raqam(e.price) + ' ' + t('narxlar.b_kromka') : '')),
      on: pick(v => ({ kromka: { [e.code]: v } })) };
  });
  /* prisadka — teshik turi bo'yicha */
  const hk = Object.fromEntries((mats.hole_kinds || []).map(h => [h.code, h]));
  const BAZIS_KIND = { konfirmat_yuza: 'drill', konfirmat_qirra: 'drill', petlya: 'hinge', polka: 'drill', ruchka: 'drill', shkant: 'dowel', eksentrik: 'cam', belgi: 'mark', d6_kosa: 'hinge', d6_eksentrik: 'cam' };
  const prisadka = TESHIK_TURLARI.map(k => {
    const kod = (N.tanlov.prisadka || {})[k] || '';
    const m = hk[k] || hk[BAZIS_KIND[k]] || null;
    return { nom: t('narxlar.t_' + k), kod, ...tanlovQ(kod, m && m.price > 0 ? raqam(m.price) + ' ' + t('narxlar.b_prisadka') : ''), on: pick(v => ({ prisadka: { [k]: v } })) };
  });
  const ih = N.ish_haqi || {}, us = N.ustama || {};
  const inp = st.narxIn || {};
  const setInp = (k) => (ev) => setIn({ narxIn: { ...inp, [k]: ev.target.value } });
  const qator = (k, q, birlik) => ({ val: inp[k] ?? (q && q.qiymat != null ? String(q.qiymat) : ''), on: setInp(k), manba: manbaQ(q && q.manba), sana: sanaQ(q && q.sana), birlik });
  /* Saqlash — ko'rinib turgan qiymatlar egasi qiymati bo'ladi (o'zgartirmasdan bosilsa ham: "taxmin" → "egasi" tasdig'i) */
  const saqlaQiymat = async () => {
    const p = {};
    for (const [k, grp, max, q] of [['detal', 'ish_haqi', AQL.detal, ih.detal], ['modul', 'ish_haqi', AQL.modul, ih.modul], ['foiz', 'ustama', AQL.foiz, us.foiz]]) {
      const raw = inp[k] ?? (q && q.qiymat != null ? String(q.qiymat) : '');
      const n = Number(String(raw).replace(',', '.'));
      if (String(raw).trim() === '' || !Number.isFinite(n) || n < 0 || n > max) { toast(t('narxlar.son_xato', { max: raqam(max) })); return; }
      (p[grp] = p[grp] || {})[k] = n;
    }
    if (await saveNarxlar(p)) setIn({ narxIn: null });
  };
  /* sex jadvalidan kelgan qatorlar — guruh bo'yicha jadval */
  const jadval = GURUH_TARTIB.map(g => {
    const rows = Object.entries(xz).filter(([, r]) => r.guruh === g).sort((a, b) => a[1].nom.localeCompare(b[1].nom));
    return { g, nom: t('narxlar.g_' + g), n: rows.length, ochiq: !!ochiq[g], flip: () => flip(g),
      rows: ochiq[g] ? rows.map(([kod, r]) => ({ kod, nom: r.nom, qiymat: raqam(r.qiymat) + ' ' + t('narxlar.b_' + g), manba: manbaQ(r.manba), sana: sanaQ(r.sana) })) : [] };
  });
  const y = st.narxYuklash;
  const tr = st.narxTarix;
  return {
    yuklandi: true, admin, meta: N._meta && N._meta.ozgartirildi ? t('narxlar.ozgartirildi', { s: N._meta.ozgartirildi }) : '',
    raspil, kromka, prisadka, kromkaVariant: variant('kromka'), prisadkaVariant: variant('prisadka'),
    ishHaqi: { on: !(ih.yoqilgan && ih.yoqilgan.qiymat === false), manba: manbaQ(ih.yoqilgan && ih.yoqilgan.manba),
      flip: () => admin && saveNarxlar({ ish_haqi: { yoqilgan: !!(ih.yoqilgan && ih.yoqilgan.qiymat === false) } }),
      detal: qator('detal', ih.detal, t('narxlar.b_detal')), modul: qator('modul', ih.modul, t('narxlar.b_modul')) },
    ustama: qator('foiz', us.foiz, '%'),
    saqlaQiymat,
    sukutga: (q) => admin && sukutgaQaytar(q),
    jadval,
    yuklash: y ? {
      matn: t('narxlar.korib_chiqish', { f: y.fayl, j: y.jami, a: y.farq.yangi.length, b: y.farq.ozgargan.length, c: y.farq.bir_xil, d: y.otkazildi }),
      rows: [...y.farq.ozgargan.map(r => ({ nom: r.nom, g: t('narxlar.g_' + r.guruh), eski: raqam(r.eski), yangi: raqam(r.yangi) })),
        ...y.farq.yangi.map(r => ({ nom: r.nom, g: t('narxlar.g_' + r.guruh), eski: '—', yangi: raqam(r.yangi) }))].slice(0, 40),
      yana: Math.max(0, y.farq.yangi.length + y.farq.ozgargan.length - 40),
      saqla: yuklashSaqlash, bekor: () => setIn({ narxYuklash: null })
    } : null,
    tarixOchiq: !!ochiq._tarix,
    tarixFlip: () => { if (!ochiq._tarix) loadNarxTarix(); flip('_tarix'); },
    tarix: (tr || []).slice(0, 100).map(x => ({ vaqt: String(x.vaqt || '').slice(0, 16), kim: x.kim, kalit: kalitNomi(x.kalit, mats),
      nom: x.kalit.startsWith('xizmatlar.') ? ((x.yangi && x.yangi.nom) || (x.eski && x.eski.nom) || '') : '',
      eski: tarixQ(x.eski, xz), yangi: tarixQ(x.yangi, xz) })),
    tarixBosh: !!tr && !tr.length
  };
}
