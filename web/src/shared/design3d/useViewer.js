import { useEffect, useRef } from 'react';
import { s3Load } from './engine.js';

/* TZ-19: dizayn 3D ko'rinishlari (s3Viewer — ro'yxat oynasidagi shkaf, "Ichini ko'rish", detal mini-3D) uchun umumiy hook.
 * three.js bir marta yuklanadi; ko'rinish host div paydo bo'lganda yaratiladi va komponent yo'qolganda tozalanadi. */
let threeP = null;
export const loadThree = () => threeP || (threeP = s3Load());

/** init(T, host, overlay) → viewer (dispose bilan) yoki null. deps o'zgarsa — qayta yaratiladi. enabled=false — yaratilmaydi. */
export function useViewer(enabled, init, deps) {
  const host = useRef(null), ov = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let v = null, dead = false;
    loadThree().then(T => {
      if (dead || !host.current) return;
      try { v = init(T, host.current, ov.current); } catch (e) { console.warn('3d', e); }
    }).catch(e => console.warn('three load failed', e));
    return () => { dead = true; if (v) v.dispose(); };
  }, deps);   // eslint-disable-line react-hooks/exhaustive-deps
  return [host, ov];
}
