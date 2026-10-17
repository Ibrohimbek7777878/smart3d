/* TZ-20 (2026-10-17): narx stavkalari — server (/api/narxlar) hujjatining shakli, tekshiruvi, sex xizmat jadvalini o'qish
 * va hisobda ishlatilishi. BITTA MANBA: server (tekshiruv), hisob (cutlist.productionCost) va web (Sozlamalar → Narxlar).
 *
 * Qoida 4.3: stavka o'ylab topilmaydi — faqat egasi kiritgan yoki sex xizmat jadvalidagi qiymat. Qaysi qator ishlatilishi
 * (raspil stanogi, kromka xizmati, teshik turi → prisadka qatori) — EGASINING tanlovi (tanlov.*). Tanlanmagan joyda hisob
 * materials.json dagi hozirgi qiymatni "taxmin" belgisi bilan ishlatadi.
 *
 * Hujjat:
 *   xizmatlar: { <kod>: { nom, guruh: raspil|kromka|prisadka, qiymat, birlik, kategoriya, manba: 'sex jadvali'|'egasi', sana } }
 *   tanlov:    { raspil: <kod>|null, kromka: { _sukut|<kromka kodi>: <kod> }, prisadka: { <teshik turi>: <kod> } }
 *   ish_haqi:  { yoqilgan, detal, modul } — har biri { qiymat, manba, sana }
 *   ustama:    { foiz: { qiymat (0–300), manba, sana } } */

export const MANBALAR = ['egasi', 'sex jadvali', 'taxmin'];
export const TASDIQ_MANBA = ['egasi', 'sex jadvali'];
export const GURUHLAR = ['raspil', 'kromka', 'prisadka'];
/** aql chegarasi (so'm): list, metr, dona; ish haqi — detal, modul; ustama — % */
export const AQL = { raspil: 1e6, kromka: 2e5, prisadka: 1e5, detal: 1e6, modul: 1e7, foiz: 300 };
/** teshik turi (hisobdagi kalit: Bazis turi yoki fragment teshigi turi) — prisadka qatoriga bog'lanadi */
export const TESHIK_TURLARI = ['konfirmat_yuza', 'konfirmat_qirra', 'petlya', 'polka', 'ruchka', 'shkant', 'eksentrik', 'belgi',
  'drill', 'dowel', 'hinge', 'cam', 'mark', 'cutout', 'd6_kosa'];
/** sex jadvalidagi kategoriya → guruh */
const KATEGORIYA = { 'Услуги Распила': 'raspil', 'Услуга кромирование': 'kromka', 'Услуги сверления': 'prisadka', 'Услуги пазования': 'prisadka' };
const KOD_RE = /^[\w.\-]{1,40}$/;
const SANA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const tasdiqMi = (manba) => TASDIQ_MANBA.includes(manba);

/** Boshlang'ich hujjat — materials.json dagi hozirgi (taxminiy) ish haqi va ustama, "taxmin" deb belgilangan. */
export function narxSukut(materials) {
  const lab = (materials && materials.labor) || {};
  const sana = ((materials && materials._meta && materials._meta.updated) || '').slice(0, 10) || null;
  const mk = materials && materials.pricing && materials.pricing.markup_pct != null ? materials.pricing.markup_pct : 0.35;
  const q = (qiymat) => ({ qiymat, manba: 'taxmin', sana });
  return {
    versiya: 1, xizmatlar: {}, tanlov: { raspil: null, kromka: {}, prisadka: {} },
    ish_haqi: { yoqilgan: q(true), detal: q(lab.panel_per_piece || 0), modul: q(lab.per_fragment_min || 0) },
    ustama: { foiz: q(Math.round(mk * 1000) / 10) }
  };
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
    for (const g of ['kromka', 'prisadka']) {
      if (tn[g] == null) continue;
      const m = obyekt(tn[g], 'tanlov.' + g);
      if (Object.keys(m).length > 200) yoq(`tanlov.${g}: 200 tagacha`);
      for (const [k, kod] of Object.entries(m)) {
        if (!KOD_RE.test(k)) yoq(`tanlov.${g}: kalit noto'g'ri`);
        if (g === 'prisadka' && !TESHIK_TURLARI.includes(k)) yoq(`tanlov.prisadka: noma'lum teshik turi ${k}`);
        const v = tekKod(kod, g, `tanlov.${g}.${k}`);
        yoz(`tanlov.${g}.${k}`, next.tanlov[g][k] || null, v);
        if (v) next.tanlov[g][k] = v; else delete next.tanlov[g][k];
      }
    }
  }
  /* xizmat o'chirilsa — unga bog'langan tanlov ham bo'shaydi */
  if (next.tanlov.raspil && !next.xizmatlar[next.tanlov.raspil]) { yoz('tanlov.raspil', next.tanlov.raspil, null); next.tanlov.raspil = null; }
  for (const g of ['kromka', 'prisadka']) for (const [k, kod] of Object.entries(next.tanlov[g])) if (!next.xizmatlar[kod]) { yoz(`tanlov.${g}.${k}`, kod, null); delete next.tanlov[g][k]; }
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
      birlik: { raspil: 'list', kromka: 'm', prisadka: 'dona' }[guruh], kategoriya: String(r[ix.kategoriya]).trim(),
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
/** kromka kodi (nuqtasiz) → tanlangan xizmat yoki sukut */
export function kromkaXizmat(S, code) {
  if (!S || !S.tanlov) return null;
  const k = String(code).replace(/\./g, ''), m = S.tanlov.kromka || {};
  return xz(S, m[k]) || xz(S, m[code]) || xz(S, m._sukut);
}
/** teshik kaliti (Bazis turi yoki turi) → prisadka xizmati */
export function prisadkaXizmat(S, key, kind) {
  if (!S || !S.tanlov) return null;
  const m = S.tanlov.prisadka || {};
  return xz(S, m[key]) || (kind && kind !== key ? xz(S, m[kind]) : null);
}
export const raspilXizmat = (S) => (S && S.tanlov ? xz(S, S.tanlov.raspil) : null);
