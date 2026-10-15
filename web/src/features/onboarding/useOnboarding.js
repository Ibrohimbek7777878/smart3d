import { useSlice, set } from '../../store/index.js';
import { aiView } from '../editor/ai/actions.js';
import { openEditor } from '../projects/actions.js';

/* TZ-19: yangi loyiha — 1) nima yasaymiz, 2) xona o'lchami yoki AI matni. */
export const PRESETS = [[3600, 3000, '3.6×3 m'], [4200, 3100, '4.2×3.1 m'], [5000, 4000, '5×4 m'], [6000, 4000, '6×4 m']];
const KINDS = [['kitchen', '🍳', 'Oshxona', 'Pastki va osma modullar'], ['wardrobe', '🚪', 'Shkaf / garderob', 'Kupe, penal, garderob'],
  ['other', '🛏', 'Boshqa mebel', 'Krovat, stol, javon'], ['ai', '✨', 'AI\'ga aytib beraman', 'Matn yoki ovoz bilan']];

const setRoom = (patch) => set('onb', s => ({ room: { ...s.room, ...patch } }));
/* o'z o'lchami: yozilgan son saqlanadi, chegaraga muharrir ochilganda keltiriladi (openEditor) */
const roomInput = (k) => ev => setRoom({ [k]: ev.target.value === '' ? '' : +ev.target.value });

export function useOnboarding() {
  const nav = useSlice('nav'), onb = useSlice('onb'), ai = useSlice('ai');
  const n = nav.screen === 'onb1' ? 1 : 2, isAi = onb.kind === 'ai', room = onb.room;
  return {
    isOnb1: n === 1, isOnb2: n === 2,
    onb: {
      n, bars: [1, 2, 3].map(i => ({ c: i <= n ? 'var(--acc)' : 'var(--sfc2)' })),
      kinds: KINDS.map(k => ({ icon: k[1], label: k[2], sub: k[3], pick: () => { set('onb', { kind: k[0] }); set('nav', { screen: 'onb2' }); } })),
      isAi, notAi: !isAi,
      t2: isAi ? 'AI\'ga aytib bering' : 'Xona o\'lchami',
      s2: isAi ? 'Xona va mebelni oddiy so\'z bilan yozing yoki ayting.' : 'Tayyor o\'lchamni tanlang yoki o\'zingiz yozing.',
      presets: PRESETS.map(p => {
        const on = room.w === p[0] && room.d === p[1];
        return { label: p[2], area: ((p[0] * p[1]) / 1e6).toFixed(1).replace('.', ',') + ' m²', bg: on ? 'rgba(255,122,69,.14)' : 'var(--sfc)', bd: on ? 'var(--acc)' : 'var(--line)', pick: () => setRoom({ w: p[0], d: p[1] }) };
      })
    },
    room, onRoomW: roomInput('w'), onRoomD: roomInput('d'), onRoomH: roomInput('h'),
    onbBack: () => set('nav', { screen: 'onb1' }),
    openEditor,
    ...aiView(ai)
  };
}
