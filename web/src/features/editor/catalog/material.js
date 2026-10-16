import { useSlice, set, get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, openSheet, patchSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { baseForSheet, slotForBase } from '../../../services/hisob.js';
import { erpKod, erpQosh, materialRang } from '../../../services/erpMaterial.js';
import { dekorRang, RANG_GURUHLARI, GURUH_RANG } from '../../../../../app/js/engine/rang.js';
import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

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
const hex = (n) => '#' + Number(n).toString(16).padStart(6, '0');
const ichida = (qism, th) => th >= ORALIQ[qism][0] && th <= ORALIQ[qism][1];

/** qism: 'korpus' | 'polka' | 'fasad' | 'orqa' | 'stol' (eski: 'matCode' | 'fasadCode'); modul — joylashuv id (faqat shu modul) */
export function openMaterial(qism, modul) {
  openSheet('material', { qism: ESKI[qism] || qism || 'korpus', modul: modul || null, q: '', guruh: null, th: null });
}

/** loyiha darajasidagi kod (polka tanlanmagan eski loyiha — korpus bilan bir xil) */
const loyihaKod = (pj, qism) => pj[KALIT[qism]] || (qism === 'polka' ? pj.matCode : null);
/** hozirgi material kodi (modul — o'zida bo'lmasa loyihadagi) */
const joriy = (pj, qism, p) => (p && p.slots && p.slots[SLOT[qism]]) || loyihaKod(pj, qism);

function yangila() { project.changed('items', true); }   // qayta hisob → S.changed (avtosaqlash)

function qoy(qism, modul, code) {
  if (modul) {
    const p = project.pl(modul);
    if (!p) return;
    p.slots = Object.assign({}, p.slots || {}, { [SLOT[qism]]: code });
  } else {
    const patch = { [KALIT[qism]]: code }, sh = get().project.sheet;
    if (sh && slotForBase(baseForSheet(sh)) === SLOT[qism]) patch.sheet = null;   // eski (TZ-19) tanlov shu qism uchun edi
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
  const p = q.modul ? project.pl(q.modul) : null;
  const cur = joriy(pj, qism, p);
  const qismNom = t('mebel.qism_' + qism);
  const pm = H.materials.panel_materials || [];
  const tanlandi = (nom) => toast(t('mebel.material_tanlandi', { qism: qismNom, nom }) + (p ? ' · ' + t('mebel.faqat_shu_modul') : ''));
  const ustama = !p && project.doc.placements.some(x => x.slots && SLOT[qism] in x.slots);

  /* ERP plitalari: qidiruv (yoki shu qism turlari), rang guruhi va qalinlik bo'yicha; narxi borlari oldin */
  const all = (H.sheetCatalog && H.sheetCatalog.sheets) || [];
  const mos = (s) => ERP_TUR[qism].includes(s.type) && ichida(qism, +s.th || 0);   // qidiruvda ham: korpusga 3 mm HDF chiqmaydi
  const turi = (q.q ? L.plitaRoyxati(H, q.q, cur).map(x => x.s) : all).filter(mos);
  const qalin = [...new Set(turi.map(s => +s.th || 0).filter(v => ichida(qism, v)))].sort((a, b) => a - b);
  let pool = turi;
  if (q.guruh) pool = pool.filter(s => { const r = dekorRang(s.name); return r && r.guruh === q.guruh; });
  if (q.th) pool = pool.filter(s => Math.abs((+s.th || 0) - q.th) < 0.3);
  const jami = pool.length;
  const curM = pm.find(m => m.code === cur), curR = materialRang(H, cur), curTh = (curM && curM.thickness) || 16;
  /* narxi borlari oldin, keyin — hozirgi qalinlikka yaqini (16 tanlangan bo'lsa 25 mm oxirida) */
  pool = pool.slice().sort((a, b) => ((b.uzs > 0) - (a.uzs > 0)) || (Math.abs((+a.th || 0) - curTh) - Math.abs((+b.th || 0) - curTh))).slice(0, 120);

  return {
    qism, modulNom: p ? L.joyNomi(H, p, H.catalog[p.frg]) : null,
    joriy: curM ? L.materialNomi(H, cur, curM.name) : t('mebel.standart_material'), joriyRang: curR ? hex(curR.rang) : null,
    qismlar: QISMLAR.filter(x => !p || x !== 'stol').map(x => ({ label: t('mebel.qism_' + x), on: x === qism, pick: () => patchSheet({ qism: x, guruh: null, th: null }) })),
    turlar: pm.filter(m => TURLAR[qism].test(m.code)).map(m => ({ label: L.materialNomi(H, m.code, m.name), on: cur === m.code,
      pick: () => { qoy(qism, q.modul, m.code); tanlandi(m.name); } })),
    ranglar: [{ label: t('mebel.rang_hammasi'), on: !q.guruh, pick: () => patchSheet({ guruh: null }) }]
      .concat(RANG_GURUHLARI.map(g => ({ label: t('mebel.rang_' + g), rang: hex(GURUH_RANG[g]), on: q.guruh === g, pick: () => patchSheet({ guruh: q.guruh === g ? null : g }) }))),
    qalinlik: qalin.length > 1 ? [{ label: t('mebel.rang_hammasi'), on: !q.th, pick: () => patchSheet({ th: null }) }]
      .concat(qalin.map(v => ({ label: v + ' ' + t('umumiy.mm'), on: q.th === v, pick: () => patchSheet({ th: q.th === v ? null : v }) }))) : [],
    q: q.q, onQ: ev => patchSheet({ q: ev.target.value }),
    /* loyiha: modullardagi alohida tanlovni olib tashlash; "bitta umumiy material" — korpus, polka, fasad bir xil */
    hammasiga: ustama ? () => { const n = tozala([qism]); yangila(); toast(t('mebel.hammasiga_qollandi', { qism: qismNom, n })); } : null,
    umumiy: !p && cur && UMUMIY.includes(qism) ? () => {
      const n = tozala(UMUMIY);
      set('project', { matCode: cur, polkaCode: cur, fasadCode: cur, sheet: null });
      yangila();
      toast(t('mebel.umumiy_qollandi', { nom: curM ? curM.name : cur, n }));
    } : null,
    /* modul: shu modul materiali — butun loyihaga */
    loyihaga: p && p.slots && p.slots[SLOT[qism]] ? () => {
      const code = p.slots[SLOT[qism]];
      tozala([qism]); qoy(qism, null, code);
      toast(t('mebel.hammasiga_qollandi', { qism: qismNom, n: project.doc.placements.length }));
    } : null,
    /* modul: o'z tanlovini bekor qilish — loyihadagi materialga qaytish */
    loyihadagi: p && p.slots && p.slots[SLOT[qism]] ? () => {
      delete p.slots[SLOT[qism]]; if (!Object.keys(p.slots).length) delete p.slots;
      yangila(); toast(t('mebel.loyihadagiga_qaytdi', { qism: qismNom }));
    } : null,
    jami: jami > pool.length ? t('mebel.plita_soni', { n: pool.length, jami }) : null,
    plitalar: pool.map(sh => {
      const code = erpKod(sh), r = dekorRang(sh.name);
      return {
        name: sh.name, rang: r ? hex(r.rang) : null,
        sub: [sh.sku, sh.th ? sh.th + ' ' + t('umumiy.mm') : '', sh.l && sh.w ? sh.l + '×' + sh.w : ''].filter(Boolean).join(' · '),
        price: sh.uzs > 0 ? raqam(sh.uzs) + ' ' + t('umumiy.som') : t('mebel.narx_yoq'), on: cur === code,
        pick: () => { const c = erpQosh(H, project.doc, sh); qoy(qism, q.modul, c); tanlandi(sh.name); }
      };
    })
  };
}

export const materialTitle = (vq) => t('mebel.material_' + ((vq && (vq.qism || ESKI[vq.slot])) || 'korpus'));
