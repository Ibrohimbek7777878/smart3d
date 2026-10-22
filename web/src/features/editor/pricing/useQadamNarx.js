import { useSlice, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { openSheet } from '../../../store/ui.js';
import { raqam } from '../../../shared/lib/format.js';
import { nestQoldiqlari, qoldiqQosh } from '../../settings/qoldiq.js';
import { goStep } from '../actions.js';
import { narxKorinishi } from './narx.js';
import { t, til } from '../../../i18n/index.js';
import * as L from '../../../services/loyiha.js';
import { erpKorsatkich } from '../../../services/erpHolat.js';
import { openSettings } from '../../settings/actions.js';
import { flipPrisadka, flipBazis, flipRaspil1, raspilStanokTanla, ustamaFlip, ustamaFoiz, qoshSoni, qoshOlib, furnsizFlip, tarkibFlip, tarkibKatta, chopEt, furnituraNarxQoy } from './narxActions.js';
import { ustamaManbaMatn } from './ustamaManba.js';

/* TZ-19: ③ Narx — mijoz narxi, tannarx, foyda, kotirovka, xizmatlar (S3), tannarx tarkibi, raskroy varaqlari, detallar.
 * TZ-48 (egasi #301/#302): ustama bloki (sukut 0%, qo'lda yoqiladi), «Furniturasiz» ko'rinish, +1 raspil ogohlantirishi, «Xizmat qo'shish», narx tarkibi. */
const RANGLAR = ['#FF7A45', '#5FE1C4', '#B9A6FF', '#FFB59A', '#F3F0E9'];    // dizayndagi raskroy ranglari
const dec = (x) => String(x || 0).replace('.', ',');
/** birlik (varaq, list, m, m2, dona, detal …) → tilda; lug'atda yo'q birlik (ERP: «шт», «reys») — o'zi */
const birlikNomi = (u) => { const v = t('narx.u_' + u); return v === 'narx.u_' + u ? String(u || '') : v; };
/** manba (dvigatel) → ko'rinadigan kalit: ERP / egasi / qo'lda / taxmin / narx yo'q / mijoz */
const MANBA = { ERP: 'erp', 'sex jadvali': 'erp', egasi: 'egasi', usta: 'qolda', qolda: 'qolda', taxmin: 'taxmin', yoq: 'yoq', mijoz: 'mijoz' };

/** raskroy varaqlari (haqiqiy) va joriy varaqdagi detallar — foizda (dizayndagi chizma) */
function raskroy(R, idx) {
  const sheets = [];
  if (R) for (const [mc, m] of Object.entries(R.nest.by_material || {})) for (const sh of m.sheets || []) sheets.push({ mc, sh, L: sh.length || m.sheet_length, W: sh.width || m.sheet_width });
  const rk = Math.min(idx, Math.max(0, sheets.length - 1)), cur = sheets[rk];
  const col = {}; let ci = 0;
  const rects = cur ? (cur.sh.parts || []).map(pt => {
    const w = pt.rotated ? pt.width : pt.length, h = pt.rotated ? pt.length : pt.width;
    const key = pt.fragment || pt.code; if (!(key in col)) col[key] = RANGLAR[ci++ % RANGLAR.length];
    return { l: (pt.x / cur.L * 100) + '%', t: (pt.y / cur.W * 100) + '%', w: (w / cur.L * 100) + '%', h: (h / cur.W * 100) + '%', c: col[key] };
  }) : [];
  return { n: sheets.length, rk, cur, rects };
}

/** Plita qatorlari — material bo'yicha: "N list · M m² ishlatildi · to'lish P%" (M — detallar maydoni, list maydoni emas).
 *  Raskroy natijasi bo'lmasa (taxminiy hisob) — avvalgi jami qator. */
function plitaQatorlari(R, prod, B) {
  const bm = (R && R.nest && R.nest.by_material) || {};
  const lines = (prod.lines || []).filter(l => /^Plita/.test(l.group));
  const rows = [];
  for (const l of lines.filter(x => bm[x.code] && bm[x.code].stats && !x.sigmadi)) {
    const nm = bm[l.code], st = nm.stats;
    /* TZ-42: mijoz materiali — qator ko'rinadi (kesim hisoblanadi), summa 0 va belgi bilan */
    rows.push([(project.H ? project.matName(l.code) : l.code) + (l.mijoz ? t('narx.mijoz_mat') : ''), t('narx.plita_mat', { n: nm.sheet_count || 0, m: dec(Math.round((st.used_area_m2 || 0) * 100) / 100), p: dec(st.utilization_pct || 0) }), l.amount]);
    /* TZ-42: varaqqa sig'magan detallar — jim tashlanmaydi: yuza bo'yicha taxminiy varaq (alohida qator, "taxminiy") */
    const sg = lines.find(x => x.sigmadi && x.code === l.code);
    if (sg) rows.push([t('narx.sigmadi', { nom: project.H ? project.matName(l.code) : l.code, n: sg.sigmadi.soni, v: dec(sg.sigmadi.varaq) }) + (l.mijoz ? t('narx.mijoz_mat') : t('narx.taxminiy')), '', sg.amount]);
  }
  return rows.length ? rows : [[t('narx.plita'), t('narx.plita_q', { n: B.sheetsCount || 0, m: dec(B.panelAreaM2) }), prod.sheetCost]];
}

/** TZ-48: narx tarkibi (prod.tarkib) → ko'rinish: bo'limlar, qatorlar (nom, miqdor × narx = summa, manba, qoida).
 *  TZ-49: har qatorda jamidagi ulushi (%), qo'lda furnitura narxi; pastda tannarx, ustama, jami, «Furniturasiz» jami. Katta ko'rinish, kichik blok va chop hujjati
 *  (ChopHujjat) shu BITTA ko'rinishdan chiziladi — yig'indi narx paneli jami bilan aynan teng. */
export function tarkibKorinishi(prod) {
  const T = prod && prod.tarkib;
  if (!T) return null;
  const doc = project.doc || {};
  const qatorNomi = (bolim, r) => {
    if (bolim === 'plita' && r.qoida !== 'sigmadi' && r.qoida !== 'stol' && project.H && project.H.materials.panel_materials.some(m => m.code === r.kod)) return project.matName(r.kod) + (r.qoida === 'mijoz' ? t('narx.mijoz_mat') : '');
    if (bolim === 'raspil') return r.kod === 'raspil_qosh' ? t('narx.raspil_qosh_nom') : r.kod === 'raspil_yupqa' ? t('narx.raspil_yupqa_nom') : t('narx.raspil');
    if (bolim === 'bazis') return t('narx.bazis');
    if (bolim === 'ish_haqi') return t('narx.ish_haqi');
    return String(r.nom || '').replace(/ — taxminiy$/, '').replace(/ — mijoz materiali$/, t('narx.mijoz_mat'));
  };
  const sozlar = (r) => {
    const v = r.qv || {};
    return t('narx.q_' + r.qoida, { lst: raqam(v.lst || 0), tannarx: raqam(v.tannarx || 0), chegirma: raqam(v.chegirma || 0), koef: dec(v.koef || 0), chiqit: dec(v.chiqit || 0), sof: dec(v.sof || 0),
      xizmat: v.xizmat || t('narx.q_katalog_narx'), soni: v.soni || 0, util: dec(v.util || 0), asos: raqam(v.asos || 0), foiz: dec(r.miqdor || 0), n: dec(r.miqdor || 0) });
  };
  const jami = T.jami || 0;
  const ulush = (x) => (jami > 0 ? Math.round((x || 0) / jami * 1000) / 10 : 0);
  const qolda = doc.furnituraNarx || {};
  const tannarx = prod.totalCost || 0, ustamaSumma = jami - tannarx;
  return {
    bolimlar: T.bolimlar.map(b => ({
      kod: b.kod, nom: t('narx.b_' + b.kod), jami: raqam(b.jami), ulush: ulush(b.jami), ulushMatn: dec(ulush(b.jami)) + '%',
      qatorlar: b.qatorlar.map(r => {
        const ust = b.kod === 'ustama', mk = MANBA[r.manba] || 'taxmin', narxsiz = r.manba === 'yoq';
        return {
          kod: r.kod, nom: ust ? t('narx.ustama') : qatorNomi(b.kod, r),
          formula: ust ? t('narx.tarkib_ustama', { asos: raqam(r.narx), foiz: dec(r.miqdor), summa: raqam(r.summa) })
            : t('narx.tarkib_formula', { n: dec(Math.round(r.miqdor * 100) / 100), u: birlikNomi(r.birlik), s: raqam(r.narx), j: raqam(r.summa) }),
          miqdor: ust ? dec(r.miqdor) + '%' : dec(Math.round(r.miqdor * 100) / 100) + ' ' + birlikNomi(r.birlik), narx: raqam(r.narx), summa: raqam(r.summa), summaSon: r.summa,
          ulush: ulush(r.summa), ulushMatn: dec(ulush(r.summa)) + '%', narxsiz,
          manba: t('narx.m_' + mk), manbaKod: mk, qoida: sozlar(r), qoidaKod: r.qoida,
          /* TZ-49 (4): narxsiz furnituraga qo'lda narx kiritish maydoni (narxsiz yoki qo'lda yozilgan qator) */
          qoldaMumkin: b.kod === 'furnitura' && (narxsiz || r.manba === 'qolda'), qoldaNarx: qolda[r.kod] != null ? String(qolda[r.kod]) : '',
          saqla: (raw) => furnituraNarxQoy(r.kod, qatorNomi(b.kod, r), raw)
        };
      })
    })),
    jami: raqam(T.jami), furnsiz: raqam(T.furnsiz), furnituraJami: raqam(T.furnituraJami),
    jamiSon: T.jami, furnsizSon: T.furnsiz, tannarx: raqam(tannarx), tannarxSon: tannarx,
    ustama: { summa: raqam(ustamaSumma), summaSon: ustamaSumma, foiz: Math.round((prod.markupPct || 0) * 1000) / 10, bor: ustamaSumma > 0 },
    ustamaManba: ustamaManbaMatn(prod, doc)
  };
}

const LOC = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' };
/** TZ-49: katta ko'rinish (varaq) va chop hujjati uchun narx tarkibi + sarlavha (loyiha nomi, sana, mijoz) — useQadamNarx().tarkib bilan bir xil hisob */
export function useTarkibKorinish() {
  const ed = useSlice('editor'), pj = useSlice('project');
  useSlice('data'); useSlice('settings');
  const prod = project.res ? project.res.prod : null;
  const k = prod && prod.tarkib ? tarkibKorinishi(prod) : null;
  if (!k) return null;
  let sana = '';
  try { sana = new Date().toLocaleDateString(LOC[til()] || 'uz-UZ'); } catch (_) { sana = new Date().toISOString().slice(0, 10); }
  return { ...k, furnsizOn: !!ed.furnsiz, meta: { nom: pj.name || '', mijoz: pj.client || '', sana } };
}

export function useQadamNarx() {
  const ed = useSlice('editor'), pj = useSlice('project'), auth = useSlice('auth'), erp = useSlice('erp');
  useSlice('data');
  const R = project.res, pr = R ? R.priceRes : null, prod = R ? R.prod : null, B = prod ? prod.breakdown : {}, NS = R ? R.nest.summary : {};
  const missN = prod ? prod.missing.length : 0;
  const xzt = (prod && prod.xizmat_taklif && prod.xizmat_taklif.teshik) || { tanlangan: false, qty: 0, amount: 0 };
  const xzb = (prod && prod.xizmat_taklif && prod.xizmat_taklif.bazis) || { tanlangan: null, qty: 0, narxBor: false };
  const xzr = (prod && prod.xizmat_taklif && prod.xizmat_taklif.raspil1) || { mumkin: false, bor: false, narx: 0 };
  const xzs = (prod && prod.xizmat_taklif && prod.xizmat_taklif.raspilStanok) || { kod: null, variantlar: [] };
  const stanokNom = (nom) => String(nom || '').replace(/^Услуга Распила\s+/, '');
  const taxminiy = (prod && prod.taxminiy) || [];
  const rs = raskroy(R, ed.rk);
  const det = {};
  if (R) for (const cl of R.cutlists) for (const pt of cl.parts) { const k = pt.material || '—'; det[k] = (det[k] || 0) + (+pt.qty || 1); }
  const ek = erpKorsatkich(erp, Date.now());
  const furnsiz = !!ed.furnsiz;
  /* ustama (TZ-48): sukut 0% — usta yoqadi; foiz — hozirgi, bo'lmasa oldingi tanlov, bo'lmasa taklif (materials.json pricing.markup_taklif = 35%).
     TZ-49 (3): 0 ≠ bo'sh — loyihada «yoqilgan, 0%» tanlovi saqlanadi va blok ochiq qoladi (0 yozilganda blok yo'qolib qolmasin, foiz maydoni 0 ko'rsatsin) */
  const markup = prod ? prod.markupPct || 0 : 0;
  const taklif = Math.round((((project.H && project.H.materials.pricing) || {}).markup_taklif || 0.35) * 100);
  const du = project.doc.ustama && typeof project.doc.ustama.yoqilgan === 'boolean' ? project.doc.ustama : null;
  const duFoiz = du && du.foiz > 0 ? du.foiz : 0;
  const ustamaOn = markup > 0 || !!(du && du.yoqilgan);
  const foizYoq = du && du.yoqilgan ? du.foiz : (markup > 0 ? Math.round(markup * 1000) / 10 : (duFoiz || taklif));
  const qosh = ((project.doc && project.doc.qoshXizmat) || []).filter(q => q && q.kod && q.soni > 0);
  const lineBy = (kod) => (prod && prod.lines.find(l => l.code === kod)) || {};
  return {
    price: narxKorinishi(R, { furnsiz }),
    furnsiz: { on: furnsiz, flip: furnsizFlip, label: t('narx.furnsiz'), izoh: furnsiz ? t('narx.furnsiz_izoh') : '', bigLabel: furnsiz ? t('narx.mijozga_narx_furnsiz') : t('narx.mijozga_narx'),
      furnituraJami: prod ? raqam(prod.clientTotal - prod.clientFurnsiz) : '…' },
    /* TZ-48 (egasi #301, 1-qaror): ustama sukutda qo'shilmaydi (0%); narx panelida qo'lda yoqiladi va foizi o'zgartiriladi */
    ustama: { on: ustamaOn, foiz: ed.ustamaIn != null ? ed.ustamaIn : String(foizYoq), taklif,
      sub: ustamaOn ? t('narx.ustama_sub_on', { n: Math.round(markup * 1000) / 10 }) : t('narx.ustama_sub_off'),
      manba: ustamaManbaMatn(prod, project.doc),
      flip: () => ustamaFlip(ustamaOn, foizYoq), onFoiz: (ev) => ustamaFoiz(ev.target.value), taklifTugma: () => ustamaFoiz(String(taklif)) },
    /* TZ-44 (8): "ERP narxlari: HH:MM" — yangi bo'lsa oddiy; eski (> 10 daqiqa), jonli o'chiq, ERP xatosi yoki aloqa yo'q — ogohlantirish. Server jonli holat bermasa — chiqmaydi */
    erp: ek ? { eski: ek.eski, matn: !ek.eski ? t('narx.erp_vaqt', { vaqt: ek.vaqt }) : ek.vaqt ? t('narx.erp_eski', { vaqt: ek.vaqt }) : t('narx.erp_hali') } : null,
    markupLabel: t('narx.foyda', { n: prod ? Math.round((prod.markupPct || 0) * 1000) / 10 : 0 }),
    hasMissing: missN > 0, missText: t('narx.zapchast_narxi_yoq', { n: missN }, missN),
    /* TZ-20: "Narx aniqligi X%" — bosilsa taxminiy qatorlar (qaysi summa tasdiqlanmagan) */
    aniqlik: prod && prod.aniqlik && prod.aniqlik.pct != null ? {
      label: prod.aniqlik.narxsiz ? t('narx.aniqlik_narxsiz', { n: prod.aniqlik.pct, k: prod.aniqlik.narxsiz }, prod.aniqlik.narxsiz) : t('narx.aniqlik', { n: prod.aniqlik.pct }), ochiq: !!ed.aniq, toliq: prod.aniqlik.pct === 100 && !prod.aniqlik.narxsiz, flip: () => set('editor', { aniq: !ed.aniq }),
      rows: prod.aniqlik.taxmin.map(x => ({ n: x.group === 'Ustama' ? t('narx.aniq_ustama', { n: Math.round((prod.markupPct || 0) * 1000) / 10 }) : x.name.replace(/ — taxminiy$/, ''), m: x.manba === 'yoq' ? t('narx.aniq_yoq') : x.manba === 'qolda' ? t('narx.m_qolda') : t('narx.aniq_taxmin'), p: raqam(x.amount) })),
      narxsiz: prod.aniqlik.narxsiz ? t('narx.aniq_narxsiz', { n: prod.aniqlik.narxsiz }, prod.aniqlik.narxsiz) : '',
      bosh: !prod.aniqlik.taxmin.length ? t('narx.aniq_hammasi') : ''
    } : null,
    /* TZ-48 (7-qaror): narx tarkibi — "Narx aniqligi" nomi o'zgarmaydi; yonida alohida «Narx tarkibi» */
    tarkib: prod && prod.tarkib ? { ochiq: !!ed.tarkib, flip: tarkibFlip, label: t('narx.tarkib'), ...tarkibKorinishi(prod) } : null,
    /* TZ-49 (egasi #303): «Katta ko'rinish» (varaq) va «PDF / Chop etish» — «Sex tannarxi» kartasida ham, katta narx tarkibida ham: ikkalasi BITTA hujjatni ochadi */
    katta: { label: t('narx.katta'), ochish: () => tarkibKatta() },
    chop: { label: t('narx.chop'), izoh: t('narx.chop_izoh'), yoz: chopEt, bor: !!(prod && prod.tarkib) },
    zapchastKiritish: { label: t('narx.zapchast_narx_kiriting'), ochish: () => tarkibKatta('furnitura') },
    toggleMissing: () => set('editor', { miss: !ed.miss }), missOpen: ed.miss,
    missing: prod ? prod.missing.map(m => ({ n: m.name || m.code, c: m.qty ? '×' + m.qty : '' })) : [],
    client: pj.client, onClient: ev => { set('project', { client: ev.target.value }); S.changed(); },
    quote: pr ? pr.lines.map(l => ({ name: l.code + ' · ' + (project.H && project.H.catalog[l.code] ? L.modulNomi(project.H, project.H.catalog[l.code]) : l.name), dim: (l.w || 0) + '×' + (l.d || 0) + '×' + (l.h || 0), n: l.qty, p: raqam(furnsiz ? l.amountFurnsiz : l.amount) })) : [],
    /* TZ-04: tasdiqlanmagan narx — "taxminiy" (eski saytdagidek); prisadka o'chirilgan bo'lsa — belgi (S3) */
    costRows: prod ? [...plitaQatorlari(R, prod, B),
      ...(prod.raspilCost ? [[t('narx.raspil'), t('narx.raspil_q', { n: dec(lineBy('raspil').qty), s: raqam(lineBy('raspil').unit_price) }) + (xzr.bor ? t('narx.raspil_plus1') : ''), prod.raspilCost]] : []),   // TZ-20; TZ-48: +1 qo'shimcha raspil
      [t('narx.kromka') + (taxminiy.includes('Kromka') ? t('narx.taxminiy') : ''), t('narx.metr', { n: dec(B.edgeMeters) }), prod.edgeCost],
      ...(furnsiz ? [] : [[t('narx.zapchast'), t('narx.dona_n', { n: B.hwCount || 0 }), prod.hwCost]]),   // TZ-48: «Furniturasiz» — furnitura qatori yashiriladi
      [t('narx.teshiklar') + (xzt.tanlangan ? (taxminiy.includes('Prisadka') ? t('narx.taxminiy') : '') : t('narx.tanlanmagan')), t('narx.prisadka_q', { n: B.holeCount || 0 }), prod.holeCost],
      ...(prod.bazisCost ? [[t('narx.bazis'), t('narx.bazis_q', { n: xzb.qty, s: raqam(prod.bazisCost / (xzb.qty || 1)) }), prod.bazisCost]] : []),   // TZ-32 E3; TZ-48: faqat 16/18/19 mm detallar
      ...(prod.qoshCost ? [[t('narx.qosh_xizmat'), t('narx.qosh_n', { n: qosh.length }), prod.qoshCost]] : []),   // TZ-48: «Xizmat qo'shish» dan
      [t('narx.ish_haqi'), t('narx.sex'), prod.laborCost]].map(r => ({ name: r[0], q: r[1], p: raqam(r[2] || 0) })) : [],
    xz: { on: !!xzt.tanlangan, sub: xzt.qty ? t('narx.teshik_sub', { n: xzt.qty, s: raqam(xzt.amount) }) : t('narx.teshik_yoq'),
      note: !xzt.tanlangan && xzt.qty ? t('narx.prisadka_eslatma') : '',
      flip: () => flipPrisadka(!xzt.tanlangan) },
    /* TZ-48 (egasi #301/#302): Bazis loyiha xizmati — sukutda YOQILGAN; 5 000 so'm/detal, faqat 16/18/19 mm detallar (HDF hisobga olinmaydi) */
    bz: xzb.narxBor ? { label: t('narx.bazis'), on: !!xzb.tanlangan,
      sub: t('narx.bazis_sub', { n: xzb.qty, s: raqam(xzb.narx), j: raqam(xzb.qty * xzb.narx), h: Math.max(0, (xzb.jami || 0) - xzb.qty) }), flip: () => flipBazis(!xzb.tanlangan) } : null,
    /* TZ-48 (6-qaror): raspil stanogi — Holzma 1/2/3 (sukut Holzma 2), Altendorf 1/2/3: usta loyiha uchun tanlaydi */
    raspilStanok: xzs.variantlar.length ? { kod: xzs.kod || '', label: t('narx.raspil_stanok'), on: (ev) => raspilStanokTanla(ev.target.value, stanokNom((xzs.variantlar.find(x => x.kod === ev.target.value) || {}).nom)),
      variantlar: xzs.variantlar.map(x => ({ kod: x.kod, label: stanokNom(x.nom) + ' — ' + raqam(x.narx) + ' ' + t('narx.som') })) } : null,
    /* TZ-48 (Q3): +1 qo'shimcha raspil — ustaga aniq ogohlantirish, olib tashlash va qaytarish */
    raspil1: xzr.mumkin ? { bor: xzr.bor, matn: xzr.bor ? t('narx.raspil1_qoshildi', { s: raqam(xzr.narx) }) : t('narx.raspil1_olindi_matn'), izoh: t('narx.raspil1_izoh'),
      tugma: xzr.bor ? t('narx.raspil1_olib') : t('narx.raspil1_qaytar'), flip: () => flipRaspil1(xzr.bor) } : null,
    /* TZ-48: «Xizmat qo'shish» — ERP xizmatlar ro'yxatidan qo'shilgan qatorlar */
    qosh: { royxat: qosh.map(q => ({ kod: q.kod, nom: q.nom, birlik: q.birlik, soni: q.soni, narx: raqam(q.narx), summa: raqam(q.soni * q.narx), manba: t('narx.m_' + (MANBA[q.manba] || 'taxmin')),
      minus: () => qoshSoni(q.kod, q.soni - 1), plus: () => qoshSoni(q.kod, q.soni + 1), olib: () => qoshOlib(q.kod), setSoni: (ev) => { const n = Number(ev.target.value); if (ev.target.value !== '' && Number.isFinite(n)) qoshSoni(q.kod, n); } })),
      ochish: () => openSheet('xizmat', { q: '', g: 'hammasi' }), label: t('narx.xizmat_qosh') },
    rk: { n: rs.rk + 1, rects: rs.rects, ar: rs.cur ? rs.cur.L + '/' + rs.cur.W : '2800/2070',
      summary: t('narx.raskroy_summary', { v: NS.total_sheets || 0, d: NS.panel_count || 0, i: Math.max(0, Math.round(100 - (NS.utilization_pct || 0))) }),
      dots: Array.from({ length: rs.n }, (_, i) => ({ w: i === rs.rk ? '22px' : '6px', c: i === rs.rk ? 'var(--acc)' : 'var(--sfc3)' })) },
    rkPrev: () => set('editor', { rk: (rs.rk + rs.n - 1) % Math.max(1, rs.n) }),
    rkNext: () => set('editor', { rk: (rs.rk + 1) % Math.max(1, rs.n) }),
    openParams: () => openSettings('raskroy'),
    /* TZ-23 C2 (admin): raskroydagi ishga yaraydigan qoldiqlar — omborga */
    qoldiq: auth.user && auth.user.role === 'admin' && NS.remnant_count ? {
      label: t('qoldiq.omborga', { n: NS.remnant_count, m: NS.remnant_usable_m2 || 0 }),
      yoz: () => qoldiqQosh(nestQoldiqlari())
    } : null,
    detGroups: Object.entries(det).map(([mc, n]) => ({ n: project.H ? project.matName(mc) : mc, c: t('narx.detal_n', { n }) })),
    goStep4: () => goStep(4)
  };
}
