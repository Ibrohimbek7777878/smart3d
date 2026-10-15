/* TZ-19: ko'rinish formatlari — bitta joyda (dizayndagi yozuv shakllari). */

/** 1234567 → "1 234 567" (dizayndagi s3n bilan bir xil) */
export const raqam = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** server vaqti (UTC, "2026-10-12 08:30:00") → "12.10.2026" */
export function sana(t) {
  const s = String(t || ''), d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  const p = (n) => String(n).padStart(2, '0');
  return isNaN(d) ? '' : p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
}

/** server vaqti (UTC) → "15.10 20:53" (mahalliy) */
export function vaqt(t) {
  const s = String(t || ''), d = new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z'));
  const p = (n) => String(n).padStart(2, '0');
  return isNaN(d) ? '' : p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** 9 raqam → "90 123 45 67" (yozish paytida) */
export const telGuruh = (d) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');

/** "998901234567" → "+998 90 123 45 67" */
export function telefon(t) {
  const d = String(t || '').replace(/^998/, '');
  return d ? '+998 ' + [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].join(' ') : '—';
}

/** avatar uchun 2 harf: ism → bosh harflar, yo'q bo'lsa email boshi */
export function bosh(name, email) {
  const nm = String(name || '').trim();
  return (nm ? nm.split(/\s+/).map(w => w[0]).join('').slice(0, 2) : String(email || '').slice(0, 2) || '•').toUpperCase();
}

/** "1,5" yoki "1.5" → 1.5 */
export const son = (v) => Number(String(v).replace(',', '.'));

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
