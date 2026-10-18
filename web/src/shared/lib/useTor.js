import { useEffect, useState } from 'react';

/* Tor ekran (telefon/planshet tik) — app.css dagi chegara bilan bir xil (980px): muharrir pastki navigatsiyaga o'tadi */
const SORUV = '(max-width: 980px)';
const hozir = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(SORUV).matches;

export function useTor() {
  const [tor, setTor] = useState(hozir);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const m = window.matchMedia(SORUV), f = () => setTor(m.matches);
    m.addEventListener ? m.addEventListener('change', f) : m.addListener(f);
    return () => (m.removeEventListener ? m.removeEventListener('change', f) : m.removeListener(f));
  }, []);
  return tor;
}
