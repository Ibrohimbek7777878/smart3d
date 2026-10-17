import { useSlice, set, get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { baseForSheet, slotForBase } from '../../../services/hisob.js';
import { erpKod, erpQosh, materialRang, plitaRangi } from '../../../services/erpMaterial.js';
import { RANG_GURUHLARI, GURUH_RANG } from '../../../../../app/js/engine/rang.js';
import { asosiyRang } from '../../../../../app/js/engine/dekorAsosiy.js';
import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';
import { dekorlarga } from './dekor.js';

/* TZ-19 (TZ-09 8-bosqich) → TZ-23 E: material va rang tanlash.
 *   qism  — korpus, polka, fasad, orqa devor, stoleshnitsa;
 *   doira — butun loyiha yoki faqat bitta modul (p.slots — hisob uni loyiha tanlovidan ustun qo'yadi);
 *   material — umumiy tur (LDSP 16/18, LMDF, MDF …) yoki ERP plitasi (1281 ta): plita alohida material kodi bo'lib
 *   qo'shiladi (services/erpMaterial.js) — narxi ERP'dan, varaq o'lchami o'zidan, raskroy har dekorni alohida;
 *   rang — palitra ERP plitalarini dekor rangi bo'yicha saralaydi (nomidan, taxminiy — engine/rang.js);
 *   qalinlik — ERP'dagi haqiqiy qalinliklar (polka: 16 standart, 18, MDF 17 — egasi #119-10, #120).
 * "Bitta umumiy material" (#119-7) — korpus, polka va fasad bir xil, modullardagi alohida tanlovlar olib tashlanadi.
 * Narx formulasi o'zgarmaydi — faqat qaysi material ekanligi. */
export const QISMLAR = ['korpus', 'polka', 'fasad', 'orqa', 'stol'];
const KALIT = { korpus: 'matCode', polka: 'polkaCode', fasad: 'fasadCode', orqa: 'orqaCode', stol: 'stolCode' };
const SLOT = { korpus: 'korpus', polka: 'polka', fasad: 'fasad', orqa: 'orqa', stol: 'stoleshnitsa' };
const ESKI = { matCode: 'korpus', fasadCode: 'fasad' };
const UMUMIY = ['korpus', 'polka', 'fasad'];
const TURLAR = { korpus: /^(LDSP|LMDF|MDF1|OSB)/, polka: /^(LDSP|LMDF|MDF1)/, fasad: /^(MDF1|LDSP|LMDF)/, orqa: /^(HDF|MDF8)/, stol: /^(LDSP|MDF1)/ };
const ERP_TUR = { korpus: ['LDSP', 'LMDF', 'MDF'], polka: ['LDSP', 'LMDF', 'MDF'], fasad: ['MDF', 'AKRIL', 'LMDF', 'LDSP'], orqa: ['HDF', 'MDF', 'LMDF'], stol: ['LDSP', 'MDF', 'LMDF'] };
/* qismga mos qalinlik oralig'i (mm): orqa devor — yupqa, qolganlari — 15 dan */
const ORALIQ = { korpus: [15, 26], polka: [15, 26], fasad: [15, 23], orqa: [2, 10], stol: [15, 40] };
const SUKUT_TH = { korpus: 16, polka: 16, fasad: 16, orqa: 3, stol: 38 };
const hex = (n) => '#' + Number(n).toString(16).padStart(6, '0');
const ichida = (qism, th) => th >= ORALIQ[qism][0] && th <= ORALIQ[qism][1];

/** qism: 'korpus' | 'polka' | 'fasad' | 'orqa' | 'stol' (eski: 'matCode' | 'fasadCode'); modul — joylashuv id (faqat shu modul) */
export function openMaterial(qism, modul) {
  openSheet('material', { qism: ESKI[qism] || qism || 'korpus', modul: modul || null, modul0: modul || null, q: '', guruh: null, th: null, tur: null, fil: false, hammasi: false });
}

/** TZ-23 E: Bazis loyihasidagi material (BZM-…) — ERP dekori yoki umumiy turga almashtirish (doc.bazis.almash) */
const BZ_QISM = { hdf: 'orqa', akril: 'fasad', mdf: 'fasad', stoleshnitsa: 'stol' };
const bazisMat = (kod) => ((project.doc && project.doc.bazis && project.doc.bazis.materiallar && project.doc.bazis.materiallar.panel) || []).find(x => x.code === kod) || null;
export function openBazisMaterial(kod) {
  const m = bazisMat(kod);
  openSheet('material', { bazis: kod, qism: (m && BZ_QISM[m.tur]) || 'korpus', modul: null, modul0: null, q: '', guruh: null, th: null, tur: null, fil: false, hammasi: false });
}
function bazisQoy(kod, code) {
  const b = project.doc.bazis;
  if (!b) return;
  b.almash = Object.assign({}, b.almash);
  if (code && code !== kod) b.almash[kod] = code; else delete b.almash[kod];
  if (!Object.keys(b.almash).length) delete b.almash;
  project.bazisUla();                                      // katalogdagi Bazis fragmenti — yangi materiallar bilan
  yangila();
}

/** loyiha darajasidagi kod (polka tanlanmagan eski loyiha — korpus bilan bir xil) */
const loyihaKod = (pj, qism) => pj[KALIT[qism]] || (qism === 'polka' ? pj.matCode : null);
/** hozirgi material kodi (modul — o'zida bo'lmasa loyihadagi) */
const joriy = (pj, qism, p) => (p && p.slots && p.slots[SLOT[qism]]) || loyihaKod(pj, qism);

function yangila() { project.changed('items', true); }   // qayta hisob → S.changed (avtosaqlash)

/* #182: korpus dekori tanlansa polka (ichki tokcha) ham shu dekorda — 3D da polka korpus rangida ko'rinadi, kesim ro'yxati va narx ham
 * shunday bo'lishi kerak (avval polka LDSP 16 da qolib ketardi: 3D "o'zgardi", kesim/narx — yo'q). Polkaga alohida ERP dekori
 * tanlangan bo'lsa (korpusnikidan boshqa) — tegilmaydi. */
const ergashadi = (polka, eskiKorpus) => !polka || !/^ERP-/.test(polka) || polka === eskiKorpus;
function qoy(qism, modul, code) {
  const erp = /^ERP-/.test(code || '');
  if (modul) {
    const p = project.pl(modul);
    if (!p) return;
    const pj = get().project, eski = joriy(pj, 'korpus', p), polka = joriy(pj, 'polka', p);
    const s = Object.assign({}, p.slots || {}, { [SLOT[qism]]: code });
    if (qism === 'korpus' && erp && ergashadi(polka, eski)) s.polka = code;
    p.slots = s;
  } else {
    const pj = get().project, patch = { [KALIT[qism]]: code }, sh = pj.sheet;
    if (sh && slotForBase(baseForSheet(sh)) === SLOT[qism]) patch.sheet = null;   // eski (TZ-19) tanlov shu qism uchun edi
    if (qism === 'korpus' && erp && ergashadi(loyihaKod(pj, 'polka'), pj.matCode)) patch.polkaCode = code;
    set('project', patch);
  }
  yangila();
}

/** shu qismlar uchun modullardagi alohida tanlovni olib tashlash — hammasi loyihadagi materialda; → nechta modul */
function tozala(qismlar) {
  let n = 0;
  for (const p of project.doc.placements) {
    if (!p.slots) continue;
    let bor = false;
    for (const q of qismlar) if (SLOT[q] in p.slots) { delete p.slots[SLOT[q]]; bor = true; }
    if (!Object.keys(p.slots).length) delete p.slots;
    if (bor) n++;
  }
  return n;
}

export function useMaterialVaraq() {
  const q = useSlice('ui').vq, pj = useSlice('project');
  const H = project.H, qism = q.qism || 'korpus';
  /* qism/filtr/rang/qidiruv almashsa — ro'yxat yana 150 tadan boshlanadi */
  const yangiFiltr = (patch) => patchSheet(Object.assign({ chek: undefined }, patch));
  const bz = q.bazis && project.doc.bazis ? q.bazis : null, bzM = bz ? bazisMat(bz) : null, almash = (bz && project.doc.bazis.almash) || {};
  const p = q.modul ? project.pl(q.modul) : null;
  const cur = bz ? almash[bz] || bz : joriy(pj, qism, p);
  const qismNom = bz ? t('mebel.bazis_material') : t('mebel.qism_' + qism);
  const pm = H.materials.panel_materials || [];
  const tanlandi = (nom) => toast(t('mebel.material_tanlandi', { qism: qismNom, nom }) + (p ? ' · ' + t('mebel.faqat_shu_modul') : ''));
  /* "Butun loyiha" — aniq: modullardagi shu qismning alohida tanlovlari ham olib tashlanadi, hammasi bitta materialda */
  const qoyish = (code) => {
    if (bz) return bazisQoy(bz, code);
    if (!q.modul) {
      /* modulda korpusga ergashgan polka (bir xil dekor) ham loyihadagiga qaytadi — korpus bilan birga */
      if (qism === 'korpus') for (const x of project.doc.placements) if (x.slots && x.slots.polka && x.slots.polka === x.slots.korpus) delete x.slots.polka;
      tozala([qism]);
    }
    qoy(qism, q.modul, code);
  };

  /* ERP plitalari: qidiruv (yoki shu qism turlari) → tur/qalinlik filtri → dekorlar (qalinlik variantlari bitta plitkada) → rang oilasi */
  const all = (H.sheetCatalog && H.sheetCatalog.sheets) || [];
  const bzTh = bzM ? +bzM.thickness : 0;
  /* #151: narxsiz plitalar ro'yxatda ko'rinmaydi; loyihada allaqachon tanlangani (cur) qoladi — "narx yo'q" bilan */
  const mos = (s) => (s.uzs > 0 || erpKod(s) === cur) && ERP_TUR[qism].includes(s.type) && ichida(qism, +s.th || 0) && (!bzTh || Math.abs((+s.th || 0) - bzTh) < 0.6);
  const turi = (q.q ? L.plitaRoyxati(H, q.q, cur).map(x => x.s) : all).filter(mos);
  const turlari = [...new Set(turi.map(s => s.type))];
  const qalin = bzTh ? [] : [...new Set(turi.map(s => +s.th || 0).filter(v => ichida(qism, v)))].sort((a, b) => a - b);
  const curM = pm.find(m => m.code === cur), curR = materialRang(H, cur);
  /* sukut qalinlik: korpus/polka/fasad — 16 mm (egasi #120); ERP plitasi tanlangan bo'lsa — uning qalinligi */
  const curTh = (curM && /^ERP-/.test(cur) && curM.thickness) || SUKUT_TH[qism];
  let pool = turi;
  if (q.tur) pool = pool.filter(s => s.type === q.tur);
  if (q.th) pool = pool.filter(s => Math.abs((+s.th || 0) - q.th) < 0.3);
  const dekorlar = dekorlarga(pool).map(g => ({ g, r: plitaRangi(H, g.variantlar[0]) }));
  const sanoq = {};
  for (const d of dekorlar) { const k = d.r ? d.r.guruh : 'boshqa'; sanoq[k] = (sanoq[k] || 0) + 1; }
  const korinadi = dekorlar.filter(d => !q.guruh || (d.r && d.r.guruh === q.guruh));
  const narxli = (g) => g.variantlar.some(v => v.uzs > 0);
  korinadi.sort((a, b) => (narxli(b.g) - narxli(a.g)) || a.g.nom.localeCompare(b.g.nom, 'ru'));
  const jami = korinadi.length, CHEK = 150, chek = q.chek || CHEK;   // chek: "Yana ko'rsatish" bilan oshadi; qism/filtr/rang o'zgarsa undefined → 150
  /* #151: "Ko'p ishlatiladigan" — sex buyurtmalaridagi dekorlar (dekor-mashhur.json) → shu qismga mos narxli plitalar.
   * Bir dekor bir nechta ishlab chiqaruvchida bo'lsa: ko'rsatilgan tur, keyin Ultradekor, keyin arzoni. Qidiruv/filtr/rang tanlansa — to'liq ko'rinish. */
  /* dekor kodi qo'shimchasi (UR, CD, PE, HU/HU, ST9 …) taqqoslashda hisobga olinmaydi; "Дуб Гудзон Кашемир" kabi boshqa dekorlar qo'shilmaydi */
  const nrm = (v) => String(v || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim().replace(/(?:\s+(?:[a-z]{1,3}(?:\/[a-z]{1,3})?|st\d+))+$/, '');
  const turTartib = (g) => { const i = ERP_TUR[qism].indexOf(g.tur); return i < 0 ? 99 : i; };   // korpus/polka/fasad: LDSP → LMDF; orqa: HDF
  /* bir qalinlik — bitta chip: shu qalinlikdagi variantlardan tanlangani, aks holda narxlisi va arzoni */
  const birQalin = (g) => {
    const m = new Map();
    for (const v of g.variantlar) {
      const k = +v.th || 0, o = m.get(k), narx = (x) => (x.uzs > 0 ? x.uzs : Infinity);
      if (!o || (erpKod(v) === cur && erpKod(o) !== cur) || (erpKod(o) !== cur && narx(v) < narx(o))) m.set(k, v);
    }
    return Object.assign({}, g, { variantlar: [...m.values()] });
  };
  const mashhur = [];
  for (const e of ((H.dekorMashhur && H.dekorMashhur.items) || [])) {
    const arz = (d) => Math.min(...d.g.variantlar.filter(v => v.uzs > 0).map(v => v.uzs), Infinity);
    const nomzod = dekorlar.filter(d => nrm(d.g.nom) === nrm(e.nom) && narxli(d.g) && (qism !== 'orqa' || d.g.tur === 'HDF'));   // orqa devor — faqat HDF
    nomzod.sort((a, b) => (turTartib(a.g) - turTartib(b.g)) || ((b.g.brend === 'Ultradekor') - (a.g.brend === 'Ultradekor')) || (arz(a) - arz(b)));
    if (nomzod[0] && !mashhur.some(m => m.g === nomzod[0].g)) mashhur.push({ g: birQalin(nomzod[0].g), r: nomzod[0].r, soni: e.soni });
  }
  mashhur.splice(12);
  /* #182: "Asosiy 100" — sex buyurtmalari va ombor qoldig'i bo'yicha eng muhim dekorlar (app/data/dekor-asosiy.json): bir dekor — bitta plitka
   * (ishlab chiqaruvchi va tur — variantlar, bir qalinlik — bitta chip), rang — namuna rangi (3D bilan bir xil). Qidiruvda ham — yuqorida. */
  const asosiy = [], qq = String(q.q || '').toLowerCase().trim();
  if (H.dekorAsosiy && !bz) {
    const kodSh = new Map(pool.map(s => [erpKod(s), s]));
    for (const e of H.dekorAsosiy.items) {
      const v = e.kodlar.map(c => kodSh.get(c)).filter(Boolean);
      if (!v.length) continue;
      if (q.guruh && e.guruh !== q.guruh) continue;
      v.sort((a, b) => (ERP_TUR[qism].indexOf(a.type) - ERP_TUR[qism].indexOf(b.type)));
      asosiy.push({ g: birQalin({ key: 'asosiy|' + e.kalit, nom: e.dekor, brend: '', tur: v[0].type, variantlar: v }), r: asosiyRang(e), e });
    }
  }
  const hammasi = !!(q.hammasi || q.q || q.guruh || q.tur || q.th || mashhur.length < 3);
  const GURUHLAR = RANG_GURUHLARI.concat(['boshqa']);
  const plitka = ({ g, r }) => {
    /* sukut variant — hozirgi qalinlikka eng yaqini (korpus/polka — 16 mm), narxlisi oldin */
    const sukut = g.variantlar.slice().sort((a, b) => (Math.abs((+a.th || 0) - curTh) - Math.abs((+b.th || 0) - curTh)) || ((b.uzs > 0) - (a.uzs > 0)))[0];
    const tanla = (sh) => () => { const c = erpQosh(H, project.doc, sh); qoyish(c); tanlandi(sh.name); };
    const narx = (sh) => (sh.uzs > 0 ? raqam(sh.uzs) + ' ' + t('umumiy.som') : t('mebel.narx_yoq'));
    const on = g.variantlar.find(v => erpKod(v) === cur) || null, kor = on || sukut;
    return {
      key: g.key, nom: g.nom, sub: [g.brend, g.tur].filter(Boolean).join(' · '), rang: r ? hex(r.rang) : null, yogoch: !!(r && r.yogoch),
      on: !!on, price: narx(kor), pick: tanla(kor),
      variantlar: g.variantlar.length > 1 || kor.th ? g.variantlar.map(v => ({ label: (+v.th || 0) + ' ' + t('umumiy.mm'), on: kor === v, pick: tanla(v) })) : []
    };
  };
  let qolgan = chek;
  const bolimlar = GURUHLAR.map(k => {
    const list = korinadi.filter(d => (d.r ? d.r.guruh : 'boshqa') === k).slice(0, Math.max(0, qolgan));
    qolgan -= list.length;
    return { k, label: k === 'boshqa' ? t('mebel.rang_boshqa') : t('mebel.rang_' + k), rang: k === 'boshqa' ? null : hex(GURUH_RANG[k]), plitkalar: list.map(plitka) };
  }).filter(x => x.plitkalar.length);
  const mashhurPlitkalar = mashhur.map(d => Object.assign(plitka(d), { soni: t('mebel.mashhur_soni', { n: d.soni }) }));
  const asosiyBolim = GURUHLAR.map(k => {
    const list = asosiy.filter(d => d.e.guruh === k);
    return { k, label: k === 'boshqa' ? t('mebel.rang_boshqa') : t('mebel.rang_' + k), rang: k === 'boshqa' ? null : hex(GURUH_RANG[k]),
      plitkalar: list.map(d => Object.assign(plitka(d), { taxminiy: d.r.taxminiy, sub: [...new Set(d.g.variantlar.map(v => v.type))].join(' · ') })) };
  }).filter(x => x.plitkalar.length);
  const filtrSoni = (q.tur ? 1 : 0) + (q.th ? 1 : 0);

  return {
    qism,
    doira: bz ? t('mebel.bazis_asl', { nom: bzM ? bzM.name : bz }) : p ? t('mebel.faqat_shu_modul') + ': ' + L.joyNomi(H, p, H.catalog[p.frg]) : t('mebel.butun_loyiha'),
    /* #182: umumiy (dekorsiz) material — "standart, dekor tanlanmagan"; modulda o'z tanlovi yo'q — "loyihadan" (nega plitka belgilanmagan — ko'rinsin) */
    joriy: curM ? L.materialNomi(H, cur, curM.name) : t('mebel.standart_material'), joriyRang: curR ? hex(curR.rang) : null,
    joriyIzoh: [bz || /^ERP-/.test(cur || '') ? '' : t('mebel.dekorsiz'), p && !(p.slots && p.slots[SLOT[qism]]) ? t('mebel.loyihadan') : ''].filter(Boolean).join(' · '),
    joriyQalin: curM ? (curM.thickness || 0) + ' ' + t('umumiy.mm') : '',
    joriyNarx: curM && curM.sheet_price > 0 ? raqam(curM.sheet_price) + ' ' + t('umumiy.som') : t('mebel.narx_yoq'),
    qismlar: bz ? [] : QISMLAR.filter(x => !p || x !== 'stol').map(x => ({ label: t('mebel.qism_' + x), on: x === qism, pick: () => yangiFiltr({ qism: x, guruh: null, th: null, tur: null }) })),
    /* doira: faqat shu modul | butun loyiha (modul kartasidan ochilganda) */
    doiralar: !bz && q.modul0 && project.pl(q.modul0) ? [
      { label: t('mebel.doira_modul'), on: !!q.modul, pick: () => yangiFiltr({ modul: q.modul0 }) },
      { label: t('mebel.doira_loyiha'), on: !q.modul, pick: () => yangiFiltr({ modul: null }) }] : [],
    mashhur: hammasi ? [] : mashhurPlitkalar, hammasi,
    asosiy: asosiyBolim, asosiySoni: asosiy.length, hammasiQaytish: !!q.hammasi && mashhurPlitkalar.length >= 3, hammasiTogla: () => yangiFiltr({ hammasi: !q.hammasi }),
    boshqaSoni: dekorlar.length,   /* to'liq ko'rinishda (mashhur yashiriladi) ko'rsatiladigan jami dekorlar — ro'yxat bilan bir xil */
    filOchiq: !!q.fil, filSoni: filtrSoni, filTogla: () => patchSheet({ fil: !q.fil }),
    turlarERP: turlari.length > 1 ? [{ label: t('mebel.rang_hammasi'), on: !q.tur, pick: () => yangiFiltr({ tur: null }) }]
      .concat(turlari.map(x => ({ label: x, on: q.tur === x, pick: () => yangiFiltr({ tur: q.tur === x ? null : x }) }))) : [],
    qalinlik: qalin.length > 1 ? [{ label: t('mebel.rang_hammasi'), on: !q.th, pick: () => yangiFiltr({ th: null }) }]
      .concat(qalin.map(v => ({ label: v + ' ' + t('umumiy.mm'), on: q.th === v, pick: () => yangiFiltr({ th: q.th === v ? null : v }) }))) : [],
    turlar: pm.filter(m => TURLAR[qism].test(m.code) && (!bzTh || m.thickness === bzTh)).map(m => ({ label: L.materialNomi(H, m.code, m.name), on: cur === m.code,
      pick: () => { qoyish(m.code); tanlandi(m.name); } })),
    /* Bazis: asl materialga qaytish */
    asli: bz && almash[bz] ? () => { bazisQoy(bz, null); toast(t('mebel.bazis_qaytdi', { nom: bzM ? bzM.name : bz })); } : null,
    /* rang oilasi: bitta bosish bilan saralash (doiralar) */
    ranglar: RANG_GURUHLARI.concat(['boshqa']).filter(k => sanoq[k] || q.guruh === k).map(k => ({
      k, label: (k === 'boshqa' ? t('mebel.rang_boshqa') : t('mebel.rang_' + k)) + ' (' + (sanoq[k] || 0) + ')', rang: k === 'boshqa' ? null : hex(GURUH_RANG[k]),
      on: q.guruh === k, pick: () => yangiFiltr({ guruh: q.guruh === k ? null : k }) })),
    q: q.q, onQ: ev => yangiFiltr({ q: ev.target.value }),
    /* modullardagi alohida tanlovlar bor — "Butun loyiha"da tanlansa hammasi bitta materialga o'tadi */
    umumiy: !p && !bz && cur && UMUMIY.includes(qism) ? () => {
      const n = tozala(UMUMIY);
      set('project', { matCode: cur, polkaCode: cur, fasadCode: cur, sheet: null });
      yangila();
      toast(t('mebel.umumiy_qollandi', { nom: curM ? curM.name : cur, n }));
    } : null,
    /* modul: o'z tanlovini bekor qilish — loyihadagi materialga qaytish */
    loyihadagi: p && p.slots && p.slots[SLOT[qism]] ? () => {
      delete p.slots[SLOT[qism]]; if (!Object.keys(p.slots).length) delete p.slots;
      yangila(); toast(t('mebel.loyihadagiga_qaytdi', { qism: qismNom }));
    } : null,
    jami: jami > chek ? t('mebel.plita_soni', { n: chek, jami }) : null,
    yana: jami > chek ? { n: jami - chek, pick: () => yangiFiltr({ chek: chek + CHEK }) } : null,
    bolimlar, bor: jami > 0
  };
}

export const materialTitle = (vq) => (vq && vq.bazis ? t('mebel.bazis_almashtirish') : t('mebel.material_' + ((vq && (vq.qism || ESKI[vq.slot])) || 'korpus')));
