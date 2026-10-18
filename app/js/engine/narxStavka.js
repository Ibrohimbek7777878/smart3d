/* TZ-20 (2026-10-17): narx stavkalari — server (/api/narxlar) hujjatining shakli, tekshiruvi, sex xizmat jadvalini o'qish
 * va hisobda ishlatilishi. BITTA MANBA: server (tekshiruv), hisob (cutlist.productionCost) va web (Sozlamalar → Narxlar).
 *
 * Qoida 4.3: stavka o'ylab topilmaydi — faqat egasi kiritgan yoki sex xizmat jadvalidagi qiymat. Qaysi qator ishlatilishi
 * (raspil stanogi, kromka xizmati, teshik turi → prisadka qatori) — EGASINING tanlovi (tanlov.*). Tanlanmagan joyda hisob
 * materials.json dagi hozirgi qiymatni "taxmin" belgisi bilan ishlatadi. Istisno — ustama: materials.json dagi
 * pricing.price_src "egasi, <sana>" bo'lsa (TZ-30: 35% — egasi tasdiqladi, 2026-10-17), u "egasi" manbasi bilan.
 *
 * Hujjat:
 *   xizmatlar: { <kod>: { nom, guruh: raspil|kromka|prisadka, qiymat, birlik, kategoriya, manba: 'sex jadvali'|'egasi', sana } }
 *   tanlov:    { raspil: <kod>|null, raspil_yupqa?: <kod> (TZ-36: HDF ≤ 3 mm list uchun raspil), kromka: { _sukut|<kromka kodi>|E<eni>x<qalinlik> (TZ-36: "E19x1"): <kod> }, prisadka: { <teshik turi>: <kod> }, bazis: { onlayn|oflayn: <kod> } }
 *   ish_haqi:  { yoqilgan, detal, modul } — har biri { qiymat, manba, sana }
 *   ustama:    { foiz: { qiymat (0–300), manba, sana } } */

export const MANBALAR = ['egasi', 'sex jadvali', 'taxmin'];
export const TASDIQ_MANBA = ['egasi', 'sex jadvali'];
export const GURUHLAR = ['raspil', 'kromka', 'prisadka', 'bazis'];
/** TZ-32 E3: Bazis loyiha xizmati — detal soniga qarab; usta narx panelida tanlaydi (onlayn / oflayn) */
export const BAZIS_TURLARI = ['onlayn', 'oflayn'];
/** aql chegarasi (so'm): list, metr, dona; ish haqi — detal, modul; ustama — % */
export const AQL = { raspil: 1e6, kromka: 2e5, prisadka: 1e5, bazis: 1e5, detal: 1e6, modul: 1e7, foiz: 300 };
/** teshik turi (hisobdagi kalit: Bazis turi yoki fragment teshigi turi) — prisadka qatoriga bog'lanadi */
export const TESHIK_TURLARI = ['konfirmat_yuza', 'konfirmat_qirra', 'petlya', 'polka', 'ruchka', 'shkant', 'eksentrik', 'belgi',
  'drill', 'dowel', 'hinge', 'cam', 'mark', 'cutout', 'd6_kosa', 'd6_eksentrik', 'd6_eks_qirra', 'd6_eks_bolt'];
/** sex jadvalidagi kategoriya → guruh */
const KATEGORIYA = { 'Услуги Распила': 'raspil', 'Услуга кромирование': 'kromka', 'Услуги сверления': 'prisadka', 'Услуги пазования': 'prisadka', 'Bazis': 'bazis' };
const KOD_RE = /^[\w.\-]{1,40}$/;
const SANA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const tasdiqMi = (manba) => TASDIQ_MANBA.includes(manba);

/** materials.json dagi ustama (pricing.markup_pct) manbasi: price_src "egasi…" — 'egasi' (tasdiqlangan), aks holda — 'taxmin'.
 *  Bitta qoida: boshlang'ich hujjat (narxSukut) va stavkasiz hisob (cutlist.productionCost). */
export const ustamaManbasi = (materials) => {
  const p = materials && materials.pricing;
  return p && p.markup_pct != null && /^egasi/.test(String(p.price_src || '')) ? 'egasi' : 'taxmin';
};

/** Boshlang'ich hujjat — materials.json dagi hozirgi ish haqi ("taxmin") va ustama (manbasi — ustamaManbasi). */
export function narxSukut(materials) {
  const lab = (materials && materials.labor) || {};
  const sana = ((materials && materials._meta && materials._meta.updated) || '').slice(0, 10) || null;
  const mk = materials && materials.pricing && materials.pricing.markup_pct != null ? materials.pricing.markup_pct : 0.35;
  const q = (qiymat) => ({ qiymat, manba: 'taxmin', sana });
  /* ish haqi: materials.labor.price_src "egasi, <sana>" bo'lsa — tasdiqlangan (egasi #222 Q3: ERP'da ish haqi xizmat narxiga kiritilgan, alohida stavka 0) */
  const ihTasdiq = /^egasi/.test(String(lab.price_src || ''));
  const ihQ = (qiymat) => (ihTasdiq ? { qiymat, manba: 'egasi', sana: (/\d{4}-\d{2}-\d{2}/.exec(lab.price_src) || [])[0] || sana } : q(qiymat));
  const um = ustamaManbasi(materials);
  const uSana = um === 'egasi' ? ((/\d{4}-\d{2}-\d{2}/.exec(materials.pricing.price_src) || [])[0] || sana) : sana;   // "egasi, 2026-10-17" → sana
  let doc = {
    versiya: 1, xizmatlar: {}, tanlov: { raspil: null, kromka: {}, prisadka: {}, bazis: {} },
    ish_haqi: { yoqilgan: ihQ(true), detal: ihQ(lab.panel_per_piece || 0), modul: ihQ(lab.per_fragment_min || 0) },
    ustama: { foiz: { qiymat: Math.round(mk * 1000) / 10, manba: um, sana: uSana } }
  };
  /* TZ-32 E: ERP xizmatlar jadvalidagi sukut stavkalar va oldindan tanlangan qatorlar (materials.json sukut_narx) — har qiymat
     manbali; buzuq yozuv hujjatni buzmaydi (o'sha qism tashlab ketiladi) */
  const sn = materials && materials.sukut_narx;
  if (sn && typeof sn === 'object') {
    try { doc = narxQollash(doc, { xizmatlar: sn.xizmatlar || {}, tanlov: sn.tanlov || {} }).next; } catch (e) { if (!narxXatoMi(e)) throw e; }
  }
  return doc;
}

class NarxXato extends Error {}
const yoq = (msg) => { throw new NarxXato(msg); };
export const narxXatoMi = (e) => e instanceof NarxXato;
function son(v, nom, max) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  if (!Number.isFinite(n) || n < 0 || n > max) yoq(`${nom}: 0…${max} oralig'idagi son bo'lishi kerak`);
  return Math.round(n * 100) / 100;
}
function matn(v, nom, max) {
  if (v == null) return '';
  if (typeof v !== 'string') yoq(`${nom}: matn bo'lishi kerak`);
  const s = v.trim();
  if (s.length > max) yoq(`${nom}: juda uzun (max ${max})`);
  if (/[<>]/.test(s)) yoq(`${nom}: < va > belgilari mumkin emas`);
  return s;
}
const obyekt = (v, nom) => { if (!v || typeof v !== 'object' || Array.isArray(v)) yoq(`${nom}: obyekt bo'lishi kerak`); return v; };
const bugun = () => new Date().toISOString().slice(0, 10);

/**
 * O'zgarishni tekshirib joriy hujjatga qo'llaydi (server PUT). Xato bo'lsa NarxXato (narxXatoMi) — hech narsa o'zgarmaydi.
 * patch: { xizmatlar?: {kod: qator|null}, tanlov?: {raspil?, kromka?: {k: kod|null}, prisadka?: {...}},
 *          ish_haqi?: {yoqilgan?: bool, detal?: son, modul?: son}, ustama?: {foiz?: son} }
 * → { next, ozgarish: [{ kalit, eski, yangi }] }
 */
export function narxQollash(cur, patch) {
  obyekt(patch, 'so\'rov');
  const next = JSON.parse(JSON.stringify(cur));
  const oz = [];
  const yoz = (kalit, eski, yangi) => { if (JSON.stringify(eski) !== JSON.stringify(yangi)) oz.push({ kalit, eski: eski === undefined ? null : eski, yangi: yangi === undefined ? null : yangi }); };
  if (patch.xizmatlar != null) {
    const xz = obyekt(patch.xizmatlar, 'xizmatlar');
    const keys = Object.keys(xz);
    if (keys.length > 1000) yoq('xizmatlar: 1000 tagacha');
    for (const kod of keys) {
      if (!KOD_RE.test(kod)) yoq(`xizmat kodi noto'g'ri: ${kod.slice(0, 40)}`);
      const r = xz[kod], eski = next.xizmatlar[kod];
      if (r === null) { delete next.xizmatlar[kod]; yoz('xizmatlar.' + kod, eski, null); continue; }
      obyekt(r, 'xizmat ' + kod);
      if (!GURUHLAR.includes(r.guruh)) yoq(`${kod}: guruh — ${GURUHLAR.join(', ')}`);
      if (!TASDIQ_MANBA.includes(r.manba)) yoq(`${kod}: manba — egasi yoki sex jadvali`);
      const sana = r.manba === 'egasi' ? bugun() : String(r.sana || '');
      if (!SANA_RE.test(sana)) yoq(`${kod}: sana YYYY-MM-DD bo'lishi kerak`);
      const q = { nom: matn(r.nom, kod + '.nom', 200) || kod, guruh: r.guruh, qiymat: son(r.qiymat, kod + '.qiymat', AQL[r.guruh]),
        birlik: matn(r.birlik, kod + '.birlik', 20), kategoriya: matn(r.kategoriya, kod + '.kategoriya', 100), manba: r.manba, sana };
      next.xizmatlar[kod] = q;
      yoz('xizmatlar.' + kod, eski, q);
    }
  }
  /* tanlovdagi kod mavjud va guruhi mos bo'lishi kerak (o'chirilgan xizmatga bog'lanish ham tozalanadi) */
  const tekKod = (kod, guruh, nom) => {
    if (kod === null || kod === '') return null;
    if (typeof kod !== 'string' || !next.xizmatlar[kod] || next.xizmatlar[kod].guruh !== guruh) yoq(`${nom}: ${guruh} xizmati topilmadi`);
    return kod;
  };
  if (patch.tanlov != null) {
    const tn = obyekt(patch.tanlov, 'tanlov');
    if ('raspil' in tn) { const v = tekKod(tn.raspil, 'raspil', 'tanlov.raspil'); yoz('tanlov.raspil', next.tanlov.raspil, v); next.tanlov.raspil = v; }
    if ('raspil_yupqa' in tn) {   // TZ-36 K3: HDF/yupqa list uchun raspil (ixtiyoriy)
      const v = tekKod(tn.raspil_yupqa, 'raspil', 'tanlov.raspil_yupqa');
      yoz('tanlov.raspil_yupqa', next.tanlov.raspil_yupqa || null, v);
      if (v) next.tanlov.raspil_yupqa = v; else delete next.tanlov.raspil_yupqa;
    }
    for (const g of ['kromka', 'prisadka', 'bazis']) {
      if (tn[g] == null) continue;
      const m = obyekt(tn[g], 'tanlov.' + g);
      if (Object.keys(m).length > 200) yoq(`tanlov.${g}: 200 tagacha`);
      next.tanlov[g] = next.tanlov[g] || {};   // eski hujjatda bazis bo'lmasligi mumkin
      for (const [k, kod] of Object.entries(m)) {
        if (!KOD_RE.test(k)) yoq(`tanlov.${g}: kalit noto'g'ri`);
        if (g === 'prisadka' && !TESHIK_TURLARI.includes(k)) yoq(`tanlov.prisadka: noma'lum teshik turi ${k}`);
        if (g === 'bazis' && !BAZIS_TURLARI.includes(k)) yoq(`tanlov.bazis: onlayn yoki oflayn (${k})`);
        const v = tekKod(kod, g, `tanlov.${g}.${k}`);
        yoz(`tanlov.${g}.${k}`, next.tanlov[g][k] || null, v);
        if (v) next.tanlov[g][k] = v; else delete next.tanlov[g][k];
      }
    }
  }
  /* xizmat o'chirilsa — unga bog'langan tanlov ham bo'shaydi */
  if (next.tanlov.raspil && !next.xizmatlar[next.tanlov.raspil]) { yoz('tanlov.raspil', next.tanlov.raspil, null); next.tanlov.raspil = null; }
  if (next.tanlov.raspil_yupqa && !next.xizmatlar[next.tanlov.raspil_yupqa]) { yoz('tanlov.raspil_yupqa', next.tanlov.raspil_yupqa, null); delete next.tanlov.raspil_yupqa; }
  for (const g of ['kromka', 'prisadka', 'bazis']) for (const [k, kod] of Object.entries(next.tanlov[g] || {})) if (!next.xizmatlar[kod]) { yoz(`tanlov.${g}.${k}`, kod, null); delete next.tanlov[g][k]; }
  const qiymatQ = (grp, k, v) => { const eski = next[grp][k]; const q = { qiymat: v, manba: 'egasi', sana: bugun() }; if (!eski || eski.qiymat !== v || eski.manba !== 'egasi') { next[grp][k] = q; yoz(grp + '.' + k, eski, q); } };
  if (patch.ish_haqi != null) {
    const ih = obyekt(patch.ish_haqi, 'ish_haqi');
    if ('yoqilgan' in ih) { if (typeof ih.yoqilgan !== 'boolean') yoq('ish_haqi.yoqilgan: ha/yo\'q'); qiymatQ('ish_haqi', 'yoqilgan', ih.yoqilgan); }
    for (const k of ['detal', 'modul']) if (k in ih && ih[k] !== '' && ih[k] != null) qiymatQ('ish_haqi', k, son(ih[k], 'ish_haqi.' + k, AQL[k]));
  }
  if (patch.ustama != null) {
    const us = obyekt(patch.ustama, 'ustama');
    if ('foiz' in us && us.foiz !== '' && us.foiz != null) qiymatQ('ustama', 'foiz', son(us.foiz, 'ustama.foiz', AQL.foiz));
  }
  return { next, ozgarish: oz };
}

/* ─────────── sex xizmat jadvali (Xizmat_narxlari.xlsx) ─────────── */
const SARLAVHA = { kod: 'Kod', nom: 'Nomi', kategoriya: 'Kategoriya', birlik: 'Birlik turi', narx: 'Mijoz narxi', sana: 'Amal sanasi', faol: 'Faol', valyuta: 'Valyuta' };

/**
 * Jadval qatorlari (1-qator — sarlavha) → xizmatlar (faqat raspil, kromka, prisadka).
 * Bo'sh yoki 0 narx, faol emas, UZS emas — o'tkazib yuboriladi (hech narsani o'zgartirmaydi).
 * → { xizmatlar: {kod: qator}, otkazildi: son, jami: son } yoki sarlavha topilmasa — null
 */
export function xizmatJadvalOqish(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const h = (rows[0] || []).map(x => String(x == null ? '' : x).trim());
  const ix = {};
  for (const [k, nom] of Object.entries(SARLAVHA)) ix[k] = h.indexOf(nom);
  if (ix.kod < 0 || ix.nom < 0 || ix.kategoriya < 0 || ix.narx < 0) return null;
  const xizmatlar = {};
  let otkazildi = 0, jami = 0;
  for (const r of rows.slice(1)) {
    const guruh = KATEGORIYA[String(r[ix.kategoriya] || '').trim()];
    if (!guruh) continue;
    jami++;
    const kod = String(r[ix.kod] == null ? '' : r[ix.kod]).trim().replace(/\.0$/, '');
    const narx = Number(r[ix.narx]);
    const faol = ix.faol < 0 || String(r[ix.faol] || '').trim().toLowerCase() !== "yo'q";
    const val = ix.valyuta < 0 ? 'UZS' : String(r[ix.valyuta] || '').trim();
    if (!KOD_RE.test(kod) || !(narx > 0) || !faol || (val && val !== 'UZS')) { otkazildi++; continue; }
    const sv = r[ix.sana];   // Excel'da qayta saqlansa — sana son (1900 tizimi) bo'lib keladi
    const sana = typeof sv === 'number' && sv > 20000 && sv < 80000 ? new Date(Date.UTC(1899, 11, 30) + Math.round(sv) * 864e5).toISOString().slice(0, 10)
      : String(sv || '').trim().slice(0, 10);
    xizmatlar[kod] = { nom: String(r[ix.nom] || '').trim().replace(/[<>]/g, '').slice(0, 200), guruh, qiymat: Math.round(narx * 100) / 100,
      birlik: { raspil: 'list', kromka: 'm', prisadka: 'dona', bazis: 'detal' }[guruh], kategoriya: String(r[ix.kategoriya]).trim(),
      manba: 'sex jadvali', sana: SANA_RE.test(sana) ? sana : bugun() };
  }
  return { xizmatlar, otkazildi, jami };
}

/** Ko'rib chiqish: yuklangan xizmatlar ↔ joriy → { yangi:[], ozgargan:[{kod, nom, eski, yangi}], bir_xil: son } */
export function xizmatFarq(cur, yuklangan) {
  const out = { yangi: [], ozgargan: [], bir_xil: 0 };
  for (const [kod, r] of Object.entries(yuklangan || {})) {
    const e = (cur && cur.xizmatlar && cur.xizmatlar[kod]) || null;
    if (!e) out.yangi.push({ kod, nom: r.nom, guruh: r.guruh, yangi: r.qiymat });
    else if (e.qiymat !== r.qiymat || e.nom !== r.nom || e.sana !== r.sana || e.manba !== r.manba) out.ozgargan.push({ kod, nom: r.nom, guruh: r.guruh, eski: e.qiymat, yangi: r.qiymat, eskiManba: e.manba });
    else out.bir_xil++;
  }
  return out;
}

/* ─────────── hisobda: stavka → narx ─────────── */
const xz = (S, kod) => (S && kod && S.xizmatlar && S.xizmatlar[kod]) || null;
/** TZ-36 K2: kromka nomi ("Кромка 19/1 …", "ПВХ 21/0,8") → o'lcham kaliti "E<eni>x<qalinlik>" (E19x1, E19x0.4) yoki null.
 *  ERP kromka xizmati eni/qalinligiga qarab narxlanadi (19/0,4 — 3 000, 19/1 — 4 000, 21/1 — 4 800, 35/1 — 5 700, 42/2 — 9 500 so'm/m). */
export function kromkaOlchamKaliti(nom) {
  const m = /(?:^|[^\d])(\d{2})\s*\/\s*(\d(?:[.,]\d+)?)/.exec(String(nom || ''));
  return m ? 'E' + m[1] + 'x' + m[2].replace(',', '.') : null;
}
/** kromka kodi (nuqtasiz) → tanlangan xizmat yoki sukut. nom (ixtiyoriy) — kromka nomi: kod bo'yicha tanlov yo'q bo'lsa
 *  o'lchamga ("E19x1") qarab, u ham yo'q bo'lsa — _sukut */
export function kromkaXizmat(S, code, nom) {
  if (!S || !S.tanlov) return null;
  const k = String(code).replace(/\./g, ''), m = S.tanlov.kromka || {};
  const ok = kromkaOlchamKaliti(nom);
  return xz(S, m[k]) || xz(S, m[code]) || (ok ? xz(S, m[ok]) : null) || xz(S, m._sukut);
}
/** D6 teshigi (d6.js) va MC birikma teshigi → egasi tanlashi mumkin bo'lgan umumiy qatorlar (o'zining qatori bo'lmasa shular).
 *  d6_kosa — petlya (Bazis 'petlya' yoki modul 'hinge'); d6_eksentrik — eksentrik (Bazis 'eksentrik' yoki modul 'cam').
 *  d6_eks_qirra va d6_eks_bolt ataylab YO'Q: eksentrik birikmasi 3 teshikdan iborat (korpus d6_eksentrik + qirra + bolt),
 *  sex "ПРИСАДКА ЭКСЦЕНТРИК" xizmati birikma uchun — uni 3 marta sanamaslik uchun umumiy "cam" stavkasi faqat d6_eksentrik
 *  (birikma boshiga 1 ta) ga o'tadi; qirra/bolt faqat egasi aniq tanlagan bo'lsa narxlanadi (aks holda eskicha — oddiy teshik).
 *  TZ-32 A2: MC birikmasi — evrovint (yuzadan Ø7) → konfirmat_yuza, evrovint_torets (qirradan Ø4,5) → konfirmat_qirra; D6 polka
 *  ushlagich → polka, ruchka → ruchka. d6_vint (kosa vintlari Ø3×2), d6_planka (planka Ø3×3), d6_napr (yo'naltiruvchi Ø3×2,5) →
 *  belgi: KDT statistikasida Ø3 × 2…3 — "belgi / burama nuqtasi (petlya plankasi)", sex jadvalida "ПРИСАДКА МЕТКА 3-2,5";
 *  Bazis importi (bazis/teshik.js) ham petlya kosasi va plankasi vintlarini 'belgi' deb sanaydi. */
export const TESHIK_UMUMIY = {
  d6_kosa: ['petlya', 'hinge'], d6_eksentrik: ['eksentrik', 'cam'],
  evrovint: ['konfirmat_yuza'], evrovint_torets: ['konfirmat_qirra'], d6_polka: ['polka'], d6_ruchka: ['ruchka'],
  d6_vint: ['belgi'], d6_planka: ['belgi'], d6_napr: ['belgi']
};
/** teshik kaliti (Bazis turi yoki turi) → prisadka xizmati */
export function prisadkaXizmat(S, key, kind) {
  if (!S || !S.tanlov) return null;
  const m = S.tanlov.prisadka || {};
  const toqri = xz(S, m[key]) || (kind && kind !== key ? xz(S, m[kind]) : null);
  if (toqri) return toqri;
  for (const k of [key, kind]) for (const u of TESHIK_UMUMIY[k] || []) { const x = xz(S, m[u]); if (x) return x; }
  return null;
}
export const raspilXizmat = (S) => (S && S.tanlov ? xz(S, S.tanlov.raspil) : null);
/** TZ-36 K3: yupqa list (HDF ≤ 3 mm) uchun raspil xizmati (tanlov.raspil_yupqa) — ERP: Holzma 1 (25 000); tanlanmagan — null (umumiy raspil) */
export const raspilYupqaXizmat = (S) => (S && S.tanlov ? xz(S, S.tanlov.raspil_yupqa) : null);
/** TZ-32 E3: Bazis loyiha xizmati (tur: 'onlayn' | 'oflayn') → narx qatori (detal boshiga) yoki null */
export const bazisXizmat = (S, tur) => (S && S.tanlov && S.tanlov.bazis ? xz(S, S.tanlov.bazis[tur]) : null);

/* ─────────── TZ-32 A1: sukut plita → ERP mahsuloti (materials.json sukut_erp) ─────────── */
/**
 * materials.sukut_erp: { <panel kodi>: null | { sku, nom, uzs, manba, sana, l?, w? } } — egasi tanlagan ERP mahsuloti (2-savol).
 * Bog'langan plitaning narxi va manbasi shu yerdan, "taxminiy" belgisi tushadi. null yoki to'liq bo'lmagan yozuv — o'zgarmaydi
 * (narx o'ylab topilmaydi). Hisob yuklanganda bir marta chaqiriladi (web/src/services/hisob.js createHisob, app.js boot).
 * @returns {number} bog'langan plitalar soni
 */
export function sukutErpQollash(materials) {
  const se = materials && materials.sukut_erp;
  if (!se || typeof se !== 'object') return 0;
  let n = 0;
  for (const [code, v] of Object.entries(se)) {
    if (code[0] === '_' || !v || typeof v !== 'object') continue;
    const uzs = Number(v.uzs);
    const pm = (materials.panel_materials || []).find(m => m.code === code);
    if (!pm || !(uzs > 0) || uzs > 1e8 || !SANA_RE.test(String(v.sana || ''))) continue;
    pm.sheet_price = Math.round(uzs * 100) / 100;
    pm.price_src = String(v.manba || 'ERP').slice(0, 40) + ', ' + v.sana;
    if (v.sku) pm.sku = String(v.sku).slice(0, 60);
    if (v.nom) pm.sku_nom = String(v.nom).slice(0, 200);
    /* varaq formati — narx shu mahsulotning formati uchun (masalan ERP 4,575 = 2500×1830); aks holda narx noto'g'ri varaqqa tushadi */
    if (Number(v.l) > 100 && Number(v.w) > 100) pm.sheets = [[Number(v.l), Number(v.w)]];
    delete pm.taxminiy;
    n++;
  }
  return n;
}
