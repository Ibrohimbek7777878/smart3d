import { get, set, store } from '../store/index.js';
import { TELEGRAM } from './bridge/telegram.js';
import { yopiqQil } from './klaviatura.js';
import { goProjects } from '../features/projects/actions.js';
import { openSettings } from '../features/settings/actions.js';

/* TZ-27 (egasi #137): brauzer va sichqonchaning "orqaga" tugmasi — ilova ichida. Har bosishda: avval eng ustdagi oyna yoki rejim
 * yopiladi (klaviatura.js yopiqQil), bo'lmasa — oldingi ekran (ish joyi ↔ loyihalar ↔ sozlamalar). Ilovadan chiqib ketmaydi:
 * tarixda doim bitta "ilova" qadami qoladi. Telegram ichida — Telegram'ning o'z "orqaga" tugmasi (TZ-16), bu ishlamaydi. */
const EKRAN = new Set(['app', 'projects', 'settings']);

export function tarixOrnat() {
  if (TELEGRAM || typeof history === 'undefined' || !history.pushState) return;
  const yigin = [];                                    // oldingi ekranlar
  let oldingi = get().nav.screen, qaytmoqda = false;
  store.subscribe(() => {
    const sc = get().nav.screen;
    if (sc === oldingi) return;
    if (!EKRAN.has(sc)) yigin.length = 0;              // kirish yoki chiqish — tarix tozalanadi
    else if (!qaytmoqda && EKRAN.has(oldingi)) { yigin.push(oldingi); if (yigin.length > 30) yigin.shift(); }
    oldingi = sc; qaytmoqda = false;
  });
  try {
    history.replaceState(Object.assign({}, history.state, { s3d: 'ildiz' }), '');
    history.pushState({ s3d: 'ilova' }, '');
  } catch (_) { return; }
  window.addEventListener('popstate', () => {
    try { history.pushState({ s3d: 'ilova' }, ''); } catch (_) { /* yo'q */ }
    if (yopiqQil(true)) return;
    const sc = get().nav.screen;
    if (!EKRAN.has(sc)) return;
    let oldin = yigin.pop();
    while (oldin === sc) oldin = yigin.pop();
    if (!oldin) oldin = sc === 'app' ? 'projects' : 'app';
    qaytmoqda = true;
    if (oldin === 'projects') goProjects();
    else if (oldin === 'settings') openSettings();
    else set('nav', { screen: 'app' });
  });
}
