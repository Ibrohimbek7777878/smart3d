/* Bekor qilish / qaytarish tarixi (egasi, 2026-10-17): loyiha hujjati (doc) va loyiha materiallarining surati (JSON).
 * Qadam — yakunlangan o'zgarish: project.changed() chaqirilganda oldingi surat bilan farq bo'lsa, oldingisi tarixga tushadi.
 * Tortish (surish, burish) — hujjat har pikselda o'zgaradi, lekin changed() faqat qo'yib yuborilganda: bitta qadam.
 * Ketma-ket bir xil amal (bitta modul o'lchami maydoni, xona o'lchami, tugma bilan surish) BIRLASH_MS ichida — bitta qadam.
 * Modul chizish oynasi ochiq turganda hamma o'zgarish bitta qadam ("Tayyor" bosilguncha).
 * Kamera, ko'rinish, tanlov, panellar hujjatda emas — tarixga kirmaydi. Eng ko'pi TARIX_MAX qadam (eng eskisi tushadi).
 * Bu modul — faqat tarix mantig'i (React, 3D, sahna yo'q); ulanishi: store/project.js, amallar: features/editor/bekor.js. */
export const TARIX_MAX = 50;
export const BIRLASH_MS = 800;

const J = (v) => JSON.stringify(v === undefined ? null : v);
const modullar = (d) => new Map(((d && d.placements) || []).filter(p => p && !p.auto).map(p => [p.id, p]));

/** ikki surat orasidagi farq → { nom, kalit? } (nom — tarix.n_<nom> yozuvi; kalit — birlashtirish uchun) yoki null */
export function farq(a, b) {
  if (J(a.m) !== J(b.m)) return { nom: 'material', kalit: 'material' };
  const da = a.doc || {}, db = b.doc || {};
  if (J(da.chizmalar) !== J(db.chizmalar)) return { nom: 'chizma' };
  if ((da.maydon || 'devorli') !== (db.maydon || 'devorli')) return { nom: 'maydon' };
  const ra = da.room || {}, rb = db.room || {};
  if (J(ra) !== J(rb)) {
    if ((ra.outline || []).length !== (rb.outline || []).length) return { nom: 'shakl' };   // devor chizish, L/P shakl
    if (J(ra.outline) !== J(rb.outline)) return { nom: 'xona', kalit: 'xona' };            // o'lcham, devorni surish (teshiklar ham moslashadi)
    if (J(ra.openings) !== J(rb.openings)) return { nom: 'teshik' };
    if (J(ra.utilities) !== J(rb.utilities)) return { nom: 'quvur' };
    return { nom: 'xona', kalit: 'xona' };                                                  // balandlik va boshqa xona sozlamasi
  }
  const A = modullar(da), B = modullar(db);
  const qoshildi = [...B.keys()].filter(id => !A.has(id)), olindi = [...A.keys()].filter(id => !B.has(id));
  if (qoshildi.length + olindi.length > 1) return { nom: 'joylashuv' };
  if (qoshildi.length) return { nom: 'qoshish' };
  if (olindi.length) return { nom: 'ochirish' };
  const ozgardi = [...B.keys()].filter(id => J(A.get(id)) !== J(B.get(id)));
  if (ozgardi.length) {
    const tur = (p, q) => (p.w !== q.w || p.d !== q.d || p.h !== q.h) ? 'olcham'
      : (p.rot || 0) !== (q.rot || 0) ? 'burish'
      : (p.x !== q.x || p.y !== q.y || (p.z || 0) !== (q.z || 0)) ? 'surish'
      : J(p.slots) !== J(q.slots) ? 'material' : 'modul';
    const nom = tur(A.get(ozgardi[0]), B.get(ozgardi[0]));
    return { nom, kalit: ozgardi.length === 1 ? nom + ':' + ozgardi[0] : null };
  }
  if (J(da.kitchen) !== J(db.kitchen)) return { nom: 'oshxona', kalit: 'oshxona' };
  if (J(da.bazis) !== J(db.bazis)) return { nom: 'material', kalit: 'material' };
  if (J(da) !== J(db)) return { nom: 'ozgarish' };
  return null;
}

/** o: { surat() → { doc, m } (jonli obyekt), qoy(surat) — hujjatni qaytarish, guruh() → kalit|null, onChange({ bekor, qayta }) } */
export function createTarix(o) {
  const max = o.max || TARIX_MAX;
  let orqa = [], oldinga = [], joriy = null, joriyObj = null, oxirgi = null, belgi = null, jim = false;
  const xabar = () => { if (o.onChange) o.onChange({ bekor: orqa.length, qayta: oldinga.length }); };
  const ol = () => JSON.stringify(o.surat());

  function qoy(s) {
    jim = true;
    try { o.qoy(JSON.parse(s)); } finally { jim = false; }
    joriy = ol(); joriyObj = JSON.parse(joriy); oxirgi = null; belgi = null;   // qaytarish zanjiri hujjatni moslasa — shu holat asos
    xabar();
  }

  const T = {
    /** yangi yoki boshqa loyiha — tarix bo'sh; keyingi yoz() boshlang'ich holatni oladi */
    tozala() { orqa = []; oldinga = []; joriy = null; joriyObj = null; oxirgi = null; belgi = null; xabar(); },
    /** keyingi qadam nomi (masalan 'ai') — farqdan topilgan nomdan ustun */
    belgi(nom) { belgi = nom; },
    /** yakunlangan o'zgarish (project.changed) — farq bo'lsa, bitta qadam */
    yoz() {
      if (jim) return;
      const s = ol();
      if (joriy === null) { joriy = s; joriyObj = JSON.parse(s); belgi = null; return; }
      if (s === joriy) { belgi = null; return; }
      const yangi = JSON.parse(s), g = o.guruh ? o.guruh() : null;
      const f = farq(joriyObj, yangi) || { nom: 'ozgarish' };
      const kalit = g || f.kalit || null, now = Date.now();
      const birlash = !!kalit && !!oxirgi && oxirgi.kalit === kalit && (!!g || now - oxirgi.t < BIRLASH_MS) && orqa.length > 0;
      if (!birlash) {
        orqa.push({ s: joriy, nom: belgi || (g ? 'chizma' : f.nom) });
        if (orqa.length > max) orqa.shift();
      }
      oldinga = []; belgi = null;
      joriy = s; joriyObj = yangi; oxirgi = { kalit, t: now };
      xabar();
    },
    /** bekor qilish → qadam nomi yoki null */
    bekor() {
      T.yoz();                                           // yozilmay qolgan o'zgarish bo'lsa — avval u qadam bo'ladi
      if (!orqa.length) return null;
      const q = orqa.pop();
      oldinga.push({ s: joriy, nom: q.nom });
      qoy(q.s);
      return q.nom;
    },
    /** qaytarish → qadam nomi yoki null */
    qayta() {
      if (!oldinga.length) return null;
      const q = oldinga.pop();
      orqa.push({ s: joriy, nom: q.nom });
      if (orqa.length > max) orqa.shift();
      qoy(q.s);
      return q.nom;
    },
    holat: () => ({ bekor: orqa.length, qayta: oldinga.length })
  };
  return T;
}
