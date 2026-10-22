/* Tezlik (testchi nuqsonlari, 2026-10-22): ruscha/inglizcha lug'at alohida bo'lak (i18n/index.js). Tanlangan til shular bo'lsa, bo'lak asosiy kod bilan BIR VAQTDA
 * yuklanadi — aks holda asosiy kod kelib bo'lgach yana bir tarmoq sayohati kutilar edi (birinchi chizish ~0.4 s kechikardi).
 * Alohida kirish nuqtasi (vite.config.js: smart3dTilOldindan HTML'ga qo'shadi), hech narsa import qilmaydi (o'zi tez keladi).
 * Tilni tanlash qoidasi i18n/index.js dagi boshlangich() bilan bir xil: saqlangan til, yo'q bo'lsa — brauzer tili. O'zbekchada hech narsa yuklanmaydi. */
try {
  let kod = null;
  try { kod = localStorage.getItem('s3d-til'); } catch (_) { /* yo'q */ }
  if (kod !== 'uz' && kod !== 'ru' && kod !== 'en') {
    const b = String((typeof navigator !== 'undefined' && navigator.language) || '').slice(0, 2).toLowerCase();
    kod = b === 'ru' || b === 'en' ? b : 'uz';
  }
  if (kod === 'ru') import('./ru.json').catch(() => { /* asosiy kod qayta uringanda xato kodi bilan yoziladi */ });
  else if (kod === 'en') import('./en.json').catch(() => { /* idem */ });
} catch (_) { /* oldindan yuklash shart emas */ }
