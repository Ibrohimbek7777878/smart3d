import { createStore, useStoreSlice } from './store.js';
import { t } from '../i18n/index.js';

/* TZ-19: ilovaning yagona holati. Har bo'lim — bitta modul egaligida:
 *   nav       ekran va o'tishlar (app, features/*)            auth      kirish, foydalanuvchi, saqlash belgisi (features/auth)
 *   ui        xabar, tasdiq oynasi, pastki varaq (store/ui)   data      katalog/narx ma'lumoti yuklandimi (store/project)
 *   onb       yangi loyiha: tur va xona (features/onboarding) project   loyiha nomi, mijoz, material; docV/dv — o'zgarish hisoblagichi
 *   editor    muharrir: qadam, tanlov, 3D holati               ai        AI oynasi, matn, mikrofon (features/editor/ai)
 *   ins       "Ichini ko'rish" (features/editor/inside)        projects  "Loyihalarim" ro'yxati
 *   settings  sozlamalar va kiritilayotgan qiymatlar
 * Loyiha hujjati (doc), hisob natijasi va 3D sahna — o'zgaruvchan obyektlar, holatda emas: store/project.js va
 * features/editor/scene/sahna.js da; ular o'zgarganda tegishli hisoblagich (docV, dv, sceneV) oshadi. */
export const store = createStore({
  nav: { screen: 'reg', from: 'projects', pending: null },
  auth: { user: null, save: null, f: { name: '', email: '', phone: '', pass: '', shop: '', show: false, err: {}, tried: false } },
  ui: { toast: '', toastCode: '', cf: null, vq: null, tilMenu: null },
  data: { ready: false, err: '' },
  onb: { kind: 'kitchen', room: { w: 3600, d: 3000, h: 2700 } },
  project: { name: t('umumiy.yangi_loyiha'), client: '', matCode: 'LDSP18', fasadCode: 'MDF16', sheet: null, docV: 0, dv: 0 },
  editor: { step: 2, done: { 1: true }, tip: 3, view: '3d', spin: false, sel: null, part: null, raw: {}, warn: {},
    cat: 'all', q: '', rk: 0, miss: false, vrOk: false, sceneOn: false, sceneErr: false, sceneV: 0 },
  ai: { open: false, text: '', mic: false },
  ins: { id: null, ex: 0, color: 1, auto: false },
  projects: { list: null, q: '' },
  bazis: { yuk: null },                                   // TZ-21: Bazis fayli o'qilmoqda (fayl nomi)
  settings: { sets: { markup_pct: null, stanoklar: null, logo: null, til: null }, markupIn: null, nestIn: null, stdIn: null, xq: '', xatolar: null }
});

export const useSlice = (name) => useStoreSlice(store, name);
export const get = () => store.get();
export const set = (slice, patch) => store.set(slice, patch);
