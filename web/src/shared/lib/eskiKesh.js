/* TZ-09 Q7: sayt almashgach — eski sayt "/" da qoldirgan keshlar (smart3d-v1 … v18) o'chiriladi. Eski sayt endi "/eski/" da
 * va v19+ keshini ishlatadi — unga tegilmaydi. Eski service worker'ni yangisi (/sw.js) o'zi almashtiradi. */
export function eskiKeshniTozala() {
  try {
    if (!('caches' in window)) return;
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => { const m = /^smart3d-v(\d+)$/.exec(k); return m && +m[1] < 19; }).map(k => caches.delete(k))))
      .catch(() => { /* kesh yo'q — jim */ });
  } catch (_) { /* eski brauzer */ }
}
