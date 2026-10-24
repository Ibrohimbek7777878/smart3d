import { set, useSlice } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { toast, xato, openSheet } from '../../store/ui.js';
import * as L from '../../services/loyiha.js';
import { raqam } from '../../shared/lib/format.js';
import { t } from '../../i18n/index.js';
import { openBazisMaterial } from '../editor/catalog/material.js';
import { dekorRang } from '../../../../app/js/engine/rang.js';
import { materialRang, bazisMoslash } from '../../services/erpMaterial.js';
import { xotiraYukla } from '../../services/plitaXotira.js';
import { bazisniERPga } from '../../../../app/js/engine/plitaMoslash.js';
import { ishJoyiOch } from '../editor/ishjoyi/ishjoyi.js';

/* TZ-21: Bazis faylini yuklash (.b3d, .fr3d, .bpj) — brauzerda o'qiladi (xom fayl serverga yuborilmaydi), natija — yangi loyiha:
 * Bazis'dagi mebel bitta joylashuv (o'lchami qat'iy), kesim ro'yxati, raskroy, smeta va fayllar odatdagidek.
 * Xavfsizlik: kengaytma, hajm (50 MB), alohida oqim va vaqt chegarasi (40 s). */
export const BAZIS_MAX = 50 * 1024 * 1024;
const VAQT = 40000;

/** alohida oqimda o'qish → natija yoki { xato } */
function ishchida(buf, fayl) {
  return new Promise((resolve) => {
    let w;
    try { w = new Worker(new URL('./bazisIshchi.js', import.meta.url), { type: 'module' }); }
    catch (e) { resolve({ xato: 'S3D-BAZIS-103', xabar: String(e.message || e) }); return; }
    const tm = setTimeout(() => { w.terminate(); resolve({ xato: 'S3D-BAZIS-105' }); }, VAQT);
    w.onmessage = (e) => { clearTimeout(tm); w.terminate(); resolve(e.data || { xato: 'S3D-BAZIS-103' }); };
    w.onerror = (e) => { clearTimeout(tm); w.terminate(); resolve({ xato: 'S3D-BAZIS-103', xabar: String((e && e.message) || 'worker') }); };
    w.postMessage({ bytes: buf, fayl, furnituraBoglash: (project.H && project.H.furnituraBoglash) || {} }, [buf]);   // TZ-37: birlashgan kod → ERP ID jadvali
  });
}

/** Bazis natijasi → yangi loyiha hujjati: mebel orqa devorga qo'yiladi, xona — atrofida o'tish joyi bilan */
export function bazisHujjat(res) {
  const f = res.fragment;
  const W = Math.max(2000, f.w + 1000), D = Math.max(2000, f.d + 1500);
  const room = L.freshRoom();
  room.outline = L.rectOutline(W, D);
  room.wall_height = Math.max(2700, f.h + 100);
  const doc = L.newDoc(room);
  doc.placements = [L.devordan(doc, { id: 'bz1', frg: f.code, name: f.name, x: Math.round((W - f.w) / 2), y: 0, z: 0, w: f.w, d: f.d, h: f.h, rot: 0, qty: 1 })];   // #152: devorga tiralmaydi
  doc.bazis = { fragment: f, materiallar: res.materiallar, hisobot: res.hisobot };
  bazisMoslash(doc, project.H);                       // TZ-42: ERP plitasiga avtomatik moslash (faqat bir qiymatli)
  return doc;
}

export async function bazisYukla(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (f) await bazisFayl(f);
}

/** TZ-25 C: fayl — tugmadan yoki ish joyiga sudrab tashlangan */
export async function bazisFayl(f) {
  const nom = f.name.slice(0, 80);
  if (!/\.(b3d|fr3d|bpj)$/i.test(f.name)) { xato('S3D-BAZIS-101', { modul: 'bazis', xabar: 'fayl: ' + nom }); return; }
  if (f.size > BAZIS_MAX) { xato('S3D-BAZIS-106', { modul: 'bazis', xabar: 'fayl: ' + nom + ', ' + Math.round(f.size / 1e6) + ' MB' }); return; }
  set('bazis', { yuk: nom });
  toast(t('bazis.oqilmoqda', { nom }));
  try {
    const [buf] = await Promise.all([f.arrayBuffer(), project.load(), xotiraYukla()]);   // TZ-57: oldingi plita tanlovlari (xotira) yuklangan bo'lsin
    const res = await ishchida(buf, nom);
    if (!res.ok) { xato(res.xato || 'S3D-BAZIS-103', { modul: 'bazis', xabar: (res.xabar ? res.xabar + ' · ' : '') + 'fayl: ' + nom }); return; }
    S.resetCurrent();
    project.reset(bazisHujjat(res), true);           // yangi loyiha — bekor qilish tarixi bo'sh
    set('project', { name: nom.replace(/\.(b3d|fr3d|bpj)$/i, ''), client: '' });
    ishJoyiOch();                                    // TZ-25: ish joyi (kompyuterda — katalog paneli, unda Bazis hisoboti tugmasi)
    project.changed('room', true);
    S.changed();
    openSheet('bazis', {});
  } finally {
    set('bazis', { yuk: null });
  }
}

/** hisobot varag'i (ochiq loyihadagi Bazis ma'lumoti) */
export function useBazisVaraq() {
  useSlice('project');
  const b = project.doc && project.doc.bazis;
  const h = (b && b.hisobot) || null;
  if (!h) return null;
  const mat = (project.H && project.H.materials.panel_materials) || [];
  const sheets = (project.H && project.H.sheetCatalog && project.H.sheetCatalog.sheets) || null;
  const avto = Object.keys(b.almash || {}).filter(k => /^ERP-/.test(b.almash[k])).length;
  return {
    olcham: h.olcham.join(' × ') + ' ' + t('umumiy.mm'),
    qatorlar: [
      [t('bazis.panellar'), raqam(h.panellar)],
      [t('bazis.kesimga'), t('bazis.kesimga_q', { n: raqam(h.detal), m: h.detalTuri })],
      [t('bazis.furnitura'), t('bazis.turi_n', { n: h.furnitura })],
      [t('bazis.mahkamlagich'), t('bazis.turi_n', { n: h.mahkamlagich })]
    ],
    /* TZ-23 E: har Bazis materiali — almashtirish mumkin (ERP dekori yoki umumiy tur); rang — nomidan (taxminiy) */
    materiallar: h.materiallar.map(m => {
      const x = mat.find(y => y.code === m.code) || {};
      const yk = b.almash && b.almash[m.code], y = yk ? mat.find(z => z.code === yk) : null;
      const r = y ? materialRang(project.H, yk) : dekorRang(m.name);   // #182: almashtirilgan ERP dekori — Asosiy 100 namunasi (3D bilan bir xil)
      /* TZ-42: almashtirilmagan material — ERP'da nechta mos plita bor (nomzod) yoki yo'q (narx taxminiy bo'lib qoladi) */
      const mos = !y && sheets ? bazisniERPga(m, sheets) : null;
      const erp = !mos ? null : mos.holat === 'nomzod' || mos.holat === 'aniq' ? t('bazis.erp_nomzod', { n: mos.nomzodlar.length }) : mos.sabab === 'dekor_yoq' ? t('bazis.erp_yoq') : null;
      return { nom: m.name, d: t('bazis.material_d', { t: m.thickness, n: m.detal, v: (x.sheets && x.sheets[0] ? x.sheets[0].join('×') : '—'), a: m.asos }),
        yangi: y ? t('bazis.almashtirildi', { nom: y.name }) : erp, rang: r ? '#' + r.rang.toString(16).padStart(6, '0') : null,
        almashtir: () => openBazisMaterial(m.code) };
    }),
    chiqarildi: Object.entries(h.chiqarildi || {}).map(([k, v]) => ({ nom: t('bazis.chiq_' + k), n: v.soni, misol: v.misol.join(', ') })),
    eslatma: (avto ? [t('bazis.erp_hisobot', { a: avto })] : []).concat(h.materiallar.some(m => !(b.almash && b.almash[m.code])) ? [t('bazis.eslatma_narx')] : []).concat([t('bazis.eslatma_teshik'), t('bazis.eslatma_rang')]).concat(h.kesildi3d ? [t('bazis.eslatma_3d')] : []).concat(h.usul === 'tekis' ? [t('bazis.eslatma_tekis')] : [])
  };
}
