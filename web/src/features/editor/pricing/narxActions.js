import { set, get } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast, xato, openSheet } from '../../../store/ui.js';
import { t } from '../../../i18n/index.js';
import { qoshXizmatTekshir, QOSH_LIMIT } from '../../../../../app/js/engine/xizmatKatalog.js';

/* TZ-48 (egasi #301/#302): narx panelidagi usta tanlovlari — loyiha hujjatida (doc) saqlanadi, loyiha bilan birga serverga ketadi.
 *   doc.xizmatlar.teshik  — prisadka (sukut YOQILGAN; false — o'chirilgan)
 *   doc.xizmatlar.bazis   — Bazis loyiha xizmati (sukut YOQILGAN; false/null — o'chirilgan; 'onlayn'/'oflayn' — eski loyiha)
 *   doc.xizmatlar.raspil1 — +1 qo'shimcha raspil (sukut YOQILGAN; false — olib tashlangan)
 *   doc.ustama            — { yoqilgan, foiz }: sukutda yo'q (0%); usta yoqadi va foizini o'zgartiradi
 *   doc.qoshXizmat        — «Xizmat qo'shish» dan qo'shilgan ERP xizmatlari [{ kod, nom, guruh, birlik, narx, manba, sana, soni }]
 *   doc.furnituraNarx     — TZ-49 (4): narxi bazada yo'q furnitura uchun usta qo'lda yozgan dona narxi { furnitura kodi: so'm } (faqat shu loyiha; ERP/admin qatlamiga yozilmaydi)
 * Hisob (kesim, kroy) o'zgarmaydi — faqat narx qayta hisoblanadi (project.scheduleRecalc → avtomatik saqlash). */
const yangila = (patch) => { project.doc.xizmatlar = Object.assign({}, project.doc.xizmatlar, patch); project.scheduleRecalc(true); };

export function flipPrisadka(on) {
  yangila({ teshik: on });
  toast(on ? t('narx.prisadka_qoshildi') : t('narx.prisadka_olindi'));
}

/** TZ-48 (6-qaror): loyiha uchun raspil stanogi (Holzma 1/2/3, Altendorf 1/2/3) — usta tanlaydi; xizmat kodi doc.xizmatlar.raspilStanok da */
export function raspilStanokTanla(kod, nom) {
  yangila({ raspilStanok: kod || null });
  toast(t('narx.stanok_tanlandi', { nom: nom || '—' }));
}

/** Bazis loyiha xizmati: yoqish/o'chirish (stavka — Bazis5 5 000/detal; faqat 16/18/19 mm detallar) */
export function flipBazis(on) {
  yangila({ bazis: on ? true : false });
  toast(on ? t('narx.bazis_qoshildi') : t('narx.bazis_olindi'));
}

/** +1 qo'shimcha raspil: olib tashlash (bor = true → false) yoki qaytarish */
export function flipRaspil1(bor) {
  yangila({ raspil1: !bor });
  toast(bor ? t('narx.raspil1_olindi') : t('narx.raspil1_qaytdi'));
}

/** Ustama: yoqish (foiz — oldingi qiymat yoki taklif) / o'chirish */
export function ustamaFlip(yoqilgan, foiz) {
  project.doc.ustama = { yoqilgan: !yoqilgan, foiz: Math.round(foiz * 10) / 10 };
  set('editor', { ustamaIn: null });
  project.scheduleRecalc(true);
  toast(yoqilgan ? t('narx.ustama_olindi') : t('narx.ustama_qoshildi', { n: project.doc.ustama.foiz }));
}

/** Ustama foizi (matn): to'g'ri son (0–300) bo'lsa narx darhol yangilanadi; aks holda matn saqlanadi va ogohlantiriladi */
export function ustamaFoiz(raw) {
  set('editor', { ustamaIn: raw });
  const n = Number(String(raw).replace(',', '.'));
  if (String(raw).trim() === '') return;                                  // yozilmoqda — hisob oldingi foizda qoladi
  if (!Number.isFinite(n) || n < 0 || n > 300) { xato('S3D-VAL-001', { modul: 'ustama', matn: t('sozlama.ustama_chegara') }); return; }
  project.doc.ustama = { yoqilgan: true, foiz: Math.round(n * 10) / 10 };
  project.scheduleRecalc(true);
}

/** TZ-49 (4): narxsiz furnitura uchun qo'lda dona narxi — shu loyihaning doc.furnituraNarx ida; hisobga kiradi (manba «qo'lda»), ERP/admin narxlari o'zgarmaydi.
 *  Bo'sh qiymat — qo'lda narx olib tashlanadi. 1…1e9 oralig'idagi butun son; aks holda S3D-VAL-001. → true agar qabul qilingan */
export const QOLDA_NARX_MAX = 1e9;
export function furnituraNarxQoy(kod, nom, raw) {
  const s = String(raw == null ? '' : raw).replace(/\s/g, '').replace(',', '.');
  const cur = Object.assign({}, project.doc.furnituraNarx);
  if (s === '') {
    if (!(kod in cur)) return true;
    delete cur[kod];
    if (Object.keys(cur).length) project.doc.furnituraNarx = cur; else delete project.doc.furnituraNarx;
    project.scheduleRecalc(true); toast(t('narx.qolda_olindi', { nom: nom || kod })); return true;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1 || n > QOLDA_NARX_MAX) { xato('S3D-NARX-106', { modul: 'furnitura-narx', matn: t('narx.qolda_chegara') }); return false; }
  cur[kod] = Math.round(n);
  project.doc.furnituraNarx = cur;
  project.scheduleRecalc(true);
  toast(t('narx.qolda_saqlandi', { nom: nom || kod, s: Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }));
  return true;
}

/* ─────────── «Xizmat qo'shish» ─────────── */
const qoshSaqla = (list) => {
  if (list.length) project.doc.qoshXizmat = list; else delete project.doc.qoshXizmat;
  project.scheduleRecalc(true);
};
const joriy = () => qoshXizmatTekshir(project.doc.qoshXizmat);

/** katalog xizmatini miqdor bilan qo'shish (bor bo'lsa — miqdor ko'payadi). x: xizmatKatalog() qatori */
export function qoshXizmat(x, soni = 1) {
  const n = Math.ceil(Number(soni));
  if (!x || !x.kod || !(x.narx > 0) || !Number.isFinite(n) || n < 1 || n > QOSH_LIMIT.soni) { xato('S3D-NARX-105', { modul: 'narx', xabar: String(x && x.kod) + ' × ' + soni }); return false; }
  const list = joriy();
  const bor = list.find(q => q.kod === x.kod);
  if (bor) bor.soni = Math.min(bor.soni + n, QOSH_LIMIT.soni);
  else list.push({ kod: x.kod, nom: x.nom, guruh: x.guruh, birlik: x.birlik, narx: x.narx, manba: x.manba, sana: x.sana || '', soni: n });
  qoshSaqla(list);
  toast(t('xizmatq.qoshildi', { nom: x.nom, n }));
  return true;
}

/** qo'shilgan xizmat miqdorini o'zgartirish (butun son, 1…); 0 yoki kamroq — olib tashlanadi */
export function qoshSoni(kod, soni) {
  const n = Math.ceil(Number(soni));
  if (!Number.isFinite(n)) { xato('S3D-NARX-105', { modul: 'narx', xabar: kod + ' × ' + soni }); return; }
  if (n < 1) { qoshOlib(kod); return; }
  qoshSaqla(joriy().map(q => (q.kod === kod ? Object.assign({}, q, { soni: Math.min(n, QOSH_LIMIT.soni) }) : q)));
}

export function qoshOlib(kod) {
  const q = joriy().find(x => x.kod === kod);
  qoshSaqla(joriy().filter(x => x.kod !== kod));
  if (q) toast(t('xizmatq.olindi', { nom: q.nom }));
}

/** ko'rinish: «Furniturasiz» jami (hisob o'zgarmaydi) */
export const furnsizFlip = () => set('editor', { furnsiz: !get().editor.furnsiz });
export const tarkibFlip = () => set('editor', { tarkib: !get().editor.tarkib });
/** TZ-49: «Narx tarkibi» katta ko'rinishi (varaq); bolim — qaysi bo'limga o'tish (masalan 'furnitura') */
export const tarkibKatta = (bolim) => openSheet('tarkib', { bolim: bolim || null });
/** TZ-49: A4 hujjat — brauzer oynasi orqali printerga yoki «PDF sifatida saqlash». Hujjat (ChopHujjat) narx tarkibidan yig'iladi; chop CSS — app.css */
export const chopEt = () => { try { window.print(); } catch (e) { xato('S3D-NARX-107', { modul: 'chop', err: e }); } };

