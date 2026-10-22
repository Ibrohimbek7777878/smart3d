import { get, set } from '../store/index.js';
import { project } from '../store/project.js';
import { toast } from '../store/ui.js';
import { t } from '../i18n/index.js';
import { ESKI_MS, isoMs, erpHolati, kalitOf } from './erpHolat.js';

/* TZ-44 (7, 8): jonli ERP narxlari — brauzer tomoni. Server (erp-jonli.js) ERP'dan narxni har 2 daqiqada oladi va GET /api/erp-narx da
 * { plita, furnitura, sana, versiya, yangilangan, jonli: { yoqilgan, oxirgi_muvaffaqiyat, manba_sana, xato_soni, kurs } } beradi (ETag / 304).
 * Bu yerda: ilova ochiq va tab ko'rinib turganda har 120 soniyada shuni so'rash; versiya o'zgarsa — narx qatlamini yangilab narxni qayta hisoblash
 * (project.erpNarxYangila: tanlov, chizma, 3D tegilmaydi) va "Narxlar yangilandi (N ta)"; narx panelidagi "ERP narxlari: HH:MM" ko'rsatkichi.
 * Tarmoq xatosi — jimgina keyingisiga (xabar yo'q); ERP'ga brauzer HECH QACHON to'g'ridan-to'g'ri murojaat qilmaydi. */
export const DAVR_MS = 120000;                    // so'rov oralig'i
const META_MS = 4 * 60 * 1000;                    // 304 dan keyin ham holat (oxirgi muvaffaqiyat) kamida shuncha vaqtda bir marta to'liq olinadi
const YOL = '/api/erp-narx';

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
let etag = null, oxirgiTolaq = 0, timer = 0, band = false, ishda = false, xatoSon = 0, kutish = null, kutishTimer = 0, bekor = null;

/** narx qatlamini qo'llash; ochiq oyna (pastki varaq — buyurtma, material… yoki tasdiq) bo'lsa — yopilguncha kutadi: ochiq oynadagi narx o'zgarmasin */
function qollash(ev) {
  const ui = get().ui;
  if (ui.vq || ui.cf) {
    kutish = ev;
    if (!kutishTimer) kutishTimer = setTimeout(() => { kutishTimer = 0; const k = kutish; kutish = null; if (k && ishda) qollash(k); }, 1500);
    return;
  }
  kutish = null;
  const n = project.erpNarxYangila(ev);
  if (n > 0) toast(t('narx.erp_yangilandi', { n }));
}

/** bitta tekshiruv (ETag bilan). Qaytadi: 'yangi' | 'ozgarmadi' | 'xato' */
export async function erpTekshir() {
  if (band) return 'band';
  band = true;
  const hozir = Date.now();
  try {
    const sarlavha = etag && hozir - oxirgiTolaq < META_MS ? { 'If-None-Match': etag } : {};
    const r = await fetch(YOL, { headers: sarlavha, credentials: 'same-origin', cache: 'no-store' });   // brauzer keshi 304 ni yutib yubormasin
    if (r.status === 304) {
      xatoSon = 0;
      const xo = r.headers.get('X-Erp-Oxirgi');                  // server 304 da ham ERP tirikligini sarlavhada beradi (oxirgi muvaffaqiyat): holat to'liq javobsiz yangilanadi
      if (xo && Number.isFinite(isoMs(xo))) { oxirgiTolaq = hozir; set('erp', { oxirgi: xo, aloqa: true, tekshirilgan: hozir }); } else set('erp', { aloqa: true, tekshirilgan: hozir });
      return 'ozgarmadi';
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const ev = await r.json();
    if (!obj(ev)) throw new Error('erp-narx: javob obyekt emas');
    etag = r.headers.get('ETag') || null; oxirgiTolaq = hozir; xatoSon = 0;
    const H = project.H, oldin = H && H.erpEv, ozgardi = !oldin || kalitOf(oldin) !== kalitOf(ev);
    set('erp', { ...erpHolati(ev, hozir), aloqa: true });
    if (ozgardi) qollash(ev);
    else if (H) H.erpEv = ev;                                    // narxlar bir xil — faqat jonli holat yangilandi
    return ozgardi ? 'yangi' : 'ozgarmadi';
  } catch (_) {
    xatoSon++;
    set('erp', { aloqa: xatoSon < 2, tekshirilgan: hozir });     // jimgina; ikki marta ketma-ket bo'lmasa — ko'rsatkich o'zgarmaydi
    return 'xato';
  } finally { band = false; }
}

const korinadi = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
function reja() { clearTimeout(timer); timer = 0; if (ishda && korinadi()) timer = setTimeout(async () => { timer = 0; await erpTekshir(); reja(); }, DAVR_MS); }
function korinishO() {
  if (!ishda) return;
  if (korinadi()) { erpTekshir().then(reja); } else { clearTimeout(timer); timer = 0; }   // yashirin — to'xtaydi; qaytganda darrov bir marta
}

/** poller'ni ishga tushirish (bir marta; data tayyor bo'lgach). Qaytadi: to'xtatish funksiyasi */
export function erpJonliBosh() {
  if (ishda) return bekor;
  ishda = true;
  const H = project.H, ev = H && H.erpEv;
  if (ev) set('erp', { ...erpHolati(ev, Date.now()), aloqa: true });
  document.addEventListener('visibilitychange', korinishO);
  reja();
  bekor = () => { ishda = false; clearTimeout(timer); clearTimeout(kutishTimer); timer = 0; kutishTimer = 0; document.removeEventListener('visibilitychange', korinishO); bekor = null; };
  return bekor;
}

/** QA (window.__app.erp): holat va qo'lda tekshirish — brauzer testlari uchun */
export const erpQA = { tekshir: erpTekshir, holat: () => get().erp, davr: DAVR_MS, eskiMs: ESKI_MS, kutayotgan: () => !!kutish };
