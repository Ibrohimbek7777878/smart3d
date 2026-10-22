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
  auth: { user: null, save: null, smsBor: false, googleId: '', tiklash: false, f: { name: '', email: '', phone: '', pass: '', shop: '', show: false, err: {}, tried: false, usul: 'email', kod: '', yuborildi: false, qayta: 0 } },
  ui: { toast: '', toastCode: '', cf: null, vq: null, tilMenu: null },
  data: { ready: false, err: '' },
  onb: { kind: 'kitchen', room: { w: 5000, d: 4000, h: 2700 } },          // egasi #152: standart xona 5 × 4 m (ishjoyi STANDART_XONA bilan bir xil)
  project: { name: t('umumiy.yangi_loyiha'), client: '', matCode: 'LDSP16', polkaCode: 'LDSP16',   /* egasi #209: korpus sukuti — LDSP 16 mm (sex standarti, avval LDSP18) */
    fasadCode: 'MDF16', orqaCode: null, stolCode: null, sheet: null, docV: 0, dv: 0 },
  editor: { step: 2, done: { 1: true }, tip: 3, view: '3d', spin: false, sel: null, part: null, raw: {}, warn: {},
    cat: 'all', q: '', almash: null, rk: 0, miss: false, vrOk: false, sceneOn: false, sceneErr: false, sceneV: 0 },
  ai: { open: false, text: '', mic: false, tab: 'matn', kat: 'oshxona', tanlangan: null, qiymat: {}, shablonlar: null, shNom: '' },
  ins: { id: null, ex: 0, color: 1, auto: false },
  projects: { list: null, q: '', aloqa: true },              // aloqa — ro'yxat serverdan olindimi (TZ-27)
  buyurtma: { list: null, admin: null },                  // TZ-23 C1: "Buyurtmalarim" va admin ro'yxati (features/buyurtma)
  bazis: { yuk: null },                                   // TZ-21: Bazis fayli o'qilmoqda (fayl nomi)
  tarix: { bekor: 0, qayta: 0 },                          // bekor qilish / qaytarish: qadamlar soni (store/bekor.js)
  /* TZ-23: 3D ko'rinish (kamera, fon, chizish rejimi, rentgen, xona, fasadsiz, o'lchash) — features/editor/scene/korinish.js */
  /* TZ-24 A: modul chizish (features/editor/chizish) */
  chizish: { ochiq: false, kod: null, pl: null, ch: null, yol: [], fasad: true, nom: '', modullarim: null, v: 0, raw: {} },
  /* TZ-25: bosh ish joyi — faol asbob (tanlash | devor | teshik), chizilayotgan devor nuqtalari, palitrada tanlangan teshik,
     o'lcham tahriri ({ i, val }), tanlangan eshik/deraza ({ idx, en, joy }) — features/editor/ishjoyi */
  /* Oddiy rejim (mijoz): tanlov — 'oddiy' | 'usta' | null (sukut qoida), panel — ochiq qadam 0..4 (features/editor/oddiy) */
  rejim: { tanlov: (() => { try { const v = localStorage.getItem('s3d-rejim'); return v === 'oddiy' || v === 'usta' ? v : null; } catch (_) { return null; } })(), panel: undefined },
  ishjoyi: { asbob: 'tanlash', nuqtalar: [], teshikTur: null, tahrir: null, tanlov: null, menyu: false },
  korinish: { kamera: 'orbit', fon: null, chizish: 'boyalgan', rentgen: false, xona: true, fasadsiz: false, olchash: false, menyu: false, olcham: null, zapchast: false, zapTanla: null },
  settings: { sets: { markup_pct: null, stanoklar: null, logo: null, til: null }, markupIn: null, nestIn: null, stdIn: null, xq: '', xatolar: null, qoldiqlar: null, qHolat: 'available', qQ: '', qForm: null }
});

export const useSlice = (name) => useStoreSlice(store, name);
export const get = () => store.get();
export const set = (slice, patch) => store.set(slice, patch);
