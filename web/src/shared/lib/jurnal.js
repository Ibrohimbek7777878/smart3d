import { KOD_RE } from '../../../../app/js/xatolar.js';

/* TZ-19 §2: brauzer xatolari — konsolga va serverga (/api/log). Yuboriladi: kod, bo'lim, sahifa, qisqa matn, qisqa stack.
 * Yuborilmaydi: parol, token, email, telefon (matndan olib tashlanadi), loyiha ma'lumoti. Bir xil xato — 60 soniyada bir marta,
 * sahifa ochiq turgan paytda ko'pi bilan 30 ta (serverni ko'mib tashlamaslik uchun). */
const sent = new Map();
let count = 0;

const tozala = (s, n) => String(s == null ? '' : s)
  .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
  .replace(/\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, '[telefon]')
  .slice(0, n);

/** xatoni qayd qilish. code — S3D-…, o: { modul, xabar, err } */
export function report(code, o = {}) {
  const err = o.err, xabar = tozala(o.xabar || (err && (err.message || err)) || '', 300);
  console.warn('[' + code + ']', o.modul || '', xabar, err || '');
  if (!KOD_RE.test(code) || typeof fetch !== 'function') return;
  const key = code + '|' + xabar, now = Date.now();
  if ((sent.get(key) || 0) > now - 60000 || count >= 30) return;
  sent.set(key, now); count++;
  const body = JSON.stringify({ code, modul: String(o.modul || '').replace(/[^\w/-]/g, '').slice(0, 40),
    sahifa: (location.pathname.split('/').pop() || 'index.html').replace(/[^\w./-]/g, '').slice(0, 80), xabar,
    stack: tozala(err && err.stack, 1000) });
  fetch('/api/log', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body })   // kirgan bo'lsa — cookie o'zi boradi
    .catch(() => { /* internet yo'q — faqat konsolda */ });
}

/** kutilmagan xatolar (global): JS xatosi va ushlanmagan jarayon (promise) */
export function installGlobalHandlers() {
  window.addEventListener('error', (e) => {
    if (e && e.target && e.target !== window) return;                    // rasm/skript yuklanmadi — bu yerda emas
    report('S3D-JS-101', { modul: 'global', xabar: e.message, err: e.error });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report('S3D-JS-102', { modul: 'global', xabar: r && (r.message || String(r)), err: r instanceof Error ? r : null });
  });
}
