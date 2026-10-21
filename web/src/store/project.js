import { get, set } from './index.js';
import { loadData, createHisob } from '../services/hisob.js';
import * as L from '../services/loyiha.js';
import { suggestLayout } from '../../../app/js/ai.js';
import { konstruksiya } from '../../../app/js/engine/konstruktor/index.js';
import { materiallarniQosh } from '../../../app/js/engine/bazis/loyiha.js';
import { eskiKodlar } from '../../../app/js/engine/kodlar.js';
import { erpUla, erpSaqla, bazisAlmash } from '../services/erpMaterial.js';
import { chizmaUla } from '../services/chizma.js';
import { report } from '../shared/lib/jurnal.js';
import { xato } from './ui.js';
import { t } from '../i18n/index.js';
import { createTarix } from './bekor.js';

/* TZ-19: loyiha modeli — ochiq loyiha hujjati (doc), hisob dvigateli (H) va oxirgi hisob natijasi (res).
 * doc — dvigatel o'zi o'zgartiradigan obyekt (eski sayt bilan bir xil shakl), shuning uchun holatda emas, shu yerda turadi.
 * O'zgarish: changed(kind) → 3D sahna xabar oladi (onDocChange), project.docV oshadi, hisob qayta ishlaydi →
 * project.dv oshadi va avtomatik saqlash xabar oladi (onRecalc). Hisob — eski sayt bilan aynan bir xil (services/hisob.js). */
const docListeners = new Set();
const recalcListeners = new Set();
let recalcTimer = 0;
const J = (v) => JSON.stringify(v === undefined ? null : v);
const MAT = ['matCode', 'fasadCode', 'polkaCode', 'orqaCode', 'stolCode', 'sheet'];   // loyiha materiallari — tarix suratida

/* Bekor qilish / qaytarish (store/bekor.js): surat — hujjat va loyiha materiallari; modul chizish ochiq — bitta qadam */
const tarix = createTarix({
  surat: () => { const p = get().project; return { doc: project.doc, m: MAT.map(k => p[k] == null ? null : p[k]) }; },
  qoy: (o) => project.suratQoy(o),
  guruh: () => { const c = get().chizish; return c && c.ochiq ? 'chizish:' + c.kod : null; },
  onChange: (h) => set('tarix', h)
});

export const project = {
  doc: L.newDoc(),
  res: null,
  H: null,
  est: null,
  /** ma'lumot yuklanishi (katalog, narx, standartlar) — har amal shuni kutadi */
  ready: null,

  load() {
    if (!this.ready) {
      this.ready = loadData()
        .then(d => { this.H = createHisob(d); this.est = L.createEstimator(this.H); set('data', { ready: true }); })
        .catch(e => { report('S3D-DATA-101', { modul: 'data', err: e }); set('data', { err: 'S3D-DATA-101' }); });
    }
    return this.ready;
  },
  /** standartlar o'zgardi (TZ-14) — katalog narx taxmini qayta quriladi */
  rebuildEstimator() { this.est = L.createEstimator(this.H); },

  pl(id) { return this.doc.placements.find(p => p.id === id) || null; },
  fr(p) { return (p && this.H && this.H.catalog[p.frg]) || null; },
  matName(code) { const m = ((this.H && this.H.materials.panel_materials) || []).find(x => x.code === code); return L.materialNomi(this.H, code, m ? m.name : code); },
  /** raskroy parametrlari: standart + Sozlamalardagi (eski sayt bilan bir xil kalit) */
  nestCfg() {
    const c = Object.assign({}, this.H.nestDefaults);
    try { Object.assign(c, JSON.parse(localStorage.getItem('s3d-nest-cfg') || 'null') || {}); } catch (_) { /* yo'q */ }
    delete c._meta;
    return c;
  },

  onDocChange(fn) { docListeners.add(fn); return () => docListeners.delete(fn); },
  onRecalc(fn) { recalcListeners.add(fn); return () => recalcListeners.delete(fn); },

  /** loyiha o'zgardi: 'room' — devorlar ham, 'items' — faqat mebel; keyin hisob (now — darhol, aks holda 220 ms dan keyin) */
  changed(kind, now) {
    if (this.H) docListeners.forEach(f => f(kind));
    set('project', s => ({ docV: s.docV + 1 }));
    tarix.yoz();                                   // bekor qilish tarixi: farq bo'lsa — bitta qadam
    this.scheduleRecalc(now);
  },
  tarix,
  /** bekor qilish / qaytarish: suratdagi hujjat va materiallar; xona o'zgargan bo'lsa — devorlar ham qayta chiziladi */
  suratQoy(o) {
    const d = o.doc, eski = this.doc;
    const xona = J(d.room && d.room.outline) !== J(eski.room && eski.room.outline) || (d.maydon || 'devorli') !== (eski.maydon || 'devorli');
    const devor = !xona && J(d.room) !== J(eski.room);
    this.doc = d;
    set('project', Object.fromEntries(MAT.map((k, i) => [k, o.m[i] == null ? null : o.m[i]])));
    this.bazisUla();
    this.changed(xona ? 'room' : devor ? 'devor' : 'items', true);
  },
  scheduleRecalc(now) {
    clearTimeout(recalcTimer);
    if (now) this.recalc(); else recalcTimer = setTimeout(() => this.recalc(), 220);
  },
  recalc() {
    if (!this.H) return;
    const s = get(), p = s.project;
    try {
      this.res = this.H.recalc(this.doc, { materialCode: p.matCode, fasadCode: p.fasadCode, orqaCode: p.orqaCode, stolCode: p.stolCode, polkaCode: p.polkaCode, sheet: p.sheet, nestCfg: this.nestCfg(), markupPct: s.settings.sets.markup_pct });
    } catch (e) { xato('S3D-CALC-101', { modul: 'hisob', err: e }); }
    set('project', st => ({ dv: st.dv + 1 }));
    recalcListeners.forEach(f => f());
  },

  /** yangi hujjat: bo'sh yoki namuna bilan */
  reset(doc, yangi) { this.doc = doc || L.newDoc(); eskiKodlar(this.doc); this.bazisUla(); if (!doc || yangi) tarix.tozala(); },   // eski katalog kodlari — yangisiga; yangi loyiha — tarix bo'sh (AI qurish, shablon — bitta qadam)
  /** TZ-21: Bazis'dan yuklangan loyiha — o'z fragmenti va materiallari hisob bazasiga (katalog ro'yxatida ko'rinmaydi) */
  bazisUla() {
    if (this.H && this.doc) erpUla(this.H, this.doc);     // TZ-23 E: loyihada tanlangan ERP plitalari (material kodlari)
    if (this.H && this.doc) chizmaUla(this.H, this.doc);  // TZ-24 A: qo'lda chizilgan modullar
    const b = this.doc && this.doc.bazis;
    if (!b || !b.fragment || !this.H) return;
    this.H.catalog[b.fragment.code] = bazisAlmash(b.fragment, b.almash);   // TZ-23 E: almashtirilgan materiallar
    materiallarniQosh(this.H.materials, b.materiallar);
  },
  /** yangi loyiha: xona (onboarding) + oshxona tanlansa — avtomatik konstruktor (TZ-22, AI'siz) eng yaxshi varianti;
   *  konstruktor variant topolmasa — eski namuna (3 pastki + 2 ustki) */
  fromOnboarding(kind, room) {
    const r = L.freshRoom();
    r.outline = L.rectOutline(room.w, room.d); r.wall_height = room.h;
    const doc = L.newDoc(r);
    if (kind === 'kitchen' && this.H) {
      let v = null;
      /* devor 0 — 3D da kameraga qaragan (orqa) devor */
      try { v = konstruksiya(r, { devor: 0 }, this.H.korinadiKatalog).variantlar[0] || null; } catch (e) { xato('S3D-KONS-104', { modul: 'konstruktor', err: e }); }
      if (v) { doc.placements = v.placements; doc.kitchen = Object.assign(L.freshKitchen(), v.kitchen); }
      else {
        doc.placements = suggestLayout({ w: room.w, d: room.d }, this.H.korinadiKatalog, [{ kind: 'pastki', qty: 3 }, { kind: 'ustki', qty: 2 }])
          .filter(p => this.H.catalog[p.frg]);
      }
    }
    this.doc = doc;
    tarix.tozala();                                // yangi loyiha — bekor qilish tarixi bo'sh
  },

  /** saqlanadigan loyiha fayli — eski buildProjectPayload bilan bir xil shakl (eski sayt ham ocha oladi) */
  payload() {
    const p = get().project, sh = p.sheet;
    erpSaqla(this.H, this.doc, [p.matCode, p.polkaCode, p.fasadCode, p.orqaCode, p.stolCode]);
    return { app: 'smart3d', v: 2, ts: Date.now(), name: p.name, client: p.client, material: p.matCode, fasad: p.fasadCode,
      ...(p.polkaCode ? { polka: p.polkaCode } : {}), ...(p.orqaCode ? { orqa: p.orqaCode } : {}), ...(p.stolCode ? { stol: p.stolCode } : {}),
      sheet: sh ? { sku: sh.sku, name: sh.name, type: sh.type, th: sh.th, l: sh.l, w: sh.w, uzs: sh.uzs } : null, doc: this.doc };
  },
  /** serverdan yoki fayldan kelgan loyihani ochish */
  apply(p, meta) {
    if (!p || !p.doc) return;
    this.doc = p.doc;
    tarix.tozala();                                // boshqa loyiha ochildi — bekor qilish tarixi bo'sh
    if (!this.doc.kitchen) this.doc.kitchen = L.freshKitchen();
    this.bazisUla();
    set('project', { client: p.client || (meta && meta.client) || '', name: p.name || t('umumiy.loyiha'), matCode: p.material || 'LDSP16', fasadCode: p.fasad || 'MDF16', polkaCode: p.polka || null, orqaCode: p.orqa || null, stolCode: p.stol || null, sheet: p.sheet || null });   // polka yo'q (eski loyiha) — korpus bilan bir xil, narxi o'zgarmaydi
    set('editor', { sel: null, part: null, warn: {} });
    this.changed('room', true);
  }
};
