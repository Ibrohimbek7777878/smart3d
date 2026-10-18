/* Smart3D engine/logo.js — Bittada logosi (qoidalar 6.3 va S4: har bir chiqariladigan hujjatda).
 * Brauzerda `data/rasm/logo-bittada.png` (fetch), Node'da fayl yo'li. Yuklanmasa — null (hujjat logosiz davom etadi, xato yo'q).
 * logoBytes() — xlsx uchun; logoDataUrl() — HTML hisobot uchun (sinxron, oldindan yuklangan bo'lsa). */
export const LOGO_REL = 'data/rasm/logo-bittada.png';
let _bytes = null, _url = null, _p = null;

function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return (typeof btoa === 'function') ? btoa(s) : Buffer.from(u8).toString('base64');
}

export function loadLogo() {
  if (_p) return _p;
  _p = (async () => {
    try {
      let u8;
      if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import(/* @vite-ignore */ 'node:fs');
        const path = await import(/* @vite-ignore */ 'node:path');
        const url = await import(/* @vite-ignore */ 'node:url');
        u8 = new Uint8Array(fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '../../', LOGO_REL)));
      } else {
        const r = await fetch('/' + LOGO_REL);
        if (!r.ok) return null;
        u8 = new Uint8Array(await r.arrayBuffer());
      }
      if (u8.length < 8 || u8[0] !== 0x89 || u8[1] !== 0x50) return null;   // PNG emas
      _bytes = u8; _url = 'data:image/png;base64,' + b64(u8);
      return _bytes;
    } catch (e) { return null; }
  })();
  return _p;
}
export const logoBytes = () => _bytes;
export const logoDataUrl = () => _url;
if (typeof window !== 'undefined') loadLogo();   // brauzerda oldindan (hisobot oynasi sinxron ochiladi)
