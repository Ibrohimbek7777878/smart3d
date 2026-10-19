import { useState, useEffect, useCallback } from 'react';
import { S } from '../../store/session.js';

/* TZ-40: "AI sarfi" kartasi — GET /api/admin/ai-sarf (bugun/oy so'rovlar, token, kesh va tayyor ulushi, byudjet). Xato bo'lsa karta jim "—" ko'rsatadi
 * (sarf hisoboti boshqa admin ishini to'xtatmaydi, toast chiqmaydi). */
export function useAiSarf() {
  const [d, setD] = useState(null);
  const [xato, setXato] = useState(false);
  const yukla = useCallback(async () => {
    try {
      const r = await S.api('/api/admin/ai-sarf');
      const j = r.ok ? await r.json().catch(() => null) : null;
      if (j && j.bugun && j.byudjet) { setD(j); setXato(false); } else setXato(true);
    } catch (_) { setXato(true); }
  }, []);
  useEffect(() => { yukla(); }, [yukla]);
  return { d, xato, yukla };
}
