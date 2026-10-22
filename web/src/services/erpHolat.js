/* TZ-44: jonli ERP narxlari — sof funksiyalar (store va brauzersiz: Node testlari ham ishlatadi). Poller — services/erpJonli.js. */
export const ESKI_MS = 10 * 60 * 1000;            // shundan eski ERP narxi — ogohlantirish

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
/** narx qatlami o'zgarganmi: server versiya bergan bo'lsa — shu; bermasa (eski server) — mazmun imzosi (soni va yig'indisi) */
const imzo = (o) => { let n = 0, y = 0; for (const k in obj(o) || {}) { n++; y += Number(o[k]) || 0; } return n + ':' + y; };
export const kalitOf = (ev) => (ev.versiya != null ? 'v' + ev.versiya : 'c' + imzo(ev.plita) + '|' + imzo(ev.furnitura));

/** server vaqti (ISO; zonasiz "2026-10-22 09:30:00" — UTC deb olinadi, format.js bilan bir xil) → ms yoki NaN */
export function isoMs(v) {
  const s = String(v == null ? '' : v).trim();
  return s ? new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : s.replace(' ', 'T') + 'Z').getTime() : NaN;
}

/** soat:daqiqa (brauzer vaqti, 24 soat) */
export function soatMin(ms) {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** server javobi → ombordagi 'erp' bo'limi. jonli bloki yo'q (eski server) — bor:false: ko'rsatkich chiqmaydi (hech narsa o'ylab topilmaydi) */
export function erpHolati(ev, hozir) {
  const j = ev && obj(ev.jonli);
  if (!j) return { bor: false, tekshirilgan: hozir };
  const n = Number(j.xato_soni);
  return { bor: true, yoqilgan: !!j.yoqilgan, eskiServer: !!j.eski, oxirgi: j.oxirgi_muvaffaqiyat || null, yangilangan: ev.yangilangan || null, manba: j.manba_sana || null,
    xato: Number.isFinite(n) && n > 0 ? n : 0, kurs: j.kurs != null ? j.kurs : null, versiya: ev.versiya != null ? ev.versiya : null, tekshirilgan: hozir };
}

/** narx panelidagi ko'rsatkich: null (ko'rsatilmaydi) yoki { eski, vaqt } — vaqt "HH:MM" yoki ''.
 *  Yangi: jonli yoqilgan, aloqa bor, ERP xatosi yo'q va oxirgi muvaffaqiyat ≤ 10 daqiqa. Qolgani (o'chiq, xato, eski, aloqa yo'q) — ogohlantirish. */
export function erpKorsatkich(e, hozir) {
  if (!e || !e.bor) return null;
  const ms = isoMs(e.oxirgi || e.yangilangan), bor = Number.isFinite(ms);
  const yangi = e.yoqilgan && e.aloqa !== false && !(e.xato > 0) && !e.eskiServer && bor && hozir - ms <= ESKI_MS;
  return { eski: !yangi, vaqt: bor ? soatMin(ms) : '' };
}

