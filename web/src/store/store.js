import { useSyncExternalStore } from 'react';

/* TZ-19: ilova holati — kichik ombor (tashqi kutubxonasiz). Holat bo'limlarga (slice) bo'lingan; komponent faqat o'zi
 * o'qigan bo'lim o'zgarganda qayta chiziladi. Bo'lim obyekti o'zgarmas (immutable): har yangilanish — yangi obyekt. */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    /** set('editor', { sel: 1 }) yoki set('editor', s => ({ ... })) — qiymat o'zgarmagan bo'lsa hech kim xabar olmaydi */
    set(slice, patch) {
      const cur = state[slice];
      const p = typeof patch === 'function' ? patch(cur) : patch;
      if (!p) return;
      let changed = false;
      for (const k in p) if (!Object.is(cur[k], p[k])) { changed = true; break; }
      if (!changed) return;
      state = { ...state, [slice]: { ...cur, ...p } };
      subs.forEach(f => f());
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
}

/** React: bitta bo'limga obuna */
export function useStoreSlice(store, slice) {
  return useSyncExternalStore(store.subscribe, () => store.get()[slice]);
}
