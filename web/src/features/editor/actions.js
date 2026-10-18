import { set } from '../../store/index.js';
import { scene } from './scene/sahna.js';

/* TZ-19: muharrir — qadamlar (1 Xona · 2 Mebel · 3 Narx · 4 Fayllar) va mebel tanlash. */
export function goStep(n) {
  set('editor', s => {
    const done = { ...s.done };
    for (let i = 1; i < n; i++) done[i] = true;
    return { step: n, done };
  });
}

/** tanlash (null — tanlovni olib tashlash); detal kartasi yopiladi */
export function select(id) {
  set('editor', { sel: id || null, raw: {}, part: null, almash: null });   // almashtirish rejimi tanlov o'zgarsa tugaydi
  if (scene.sahna) { scene.sahna.select(id || null); scene.sahna.items.setFocus(null); }
}
