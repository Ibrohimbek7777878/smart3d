/* TZ-21: Bazis faylini (.b3d, .fr3d, .bpj) o'qish — alohida oqimda (Web Worker), sahifa qotmaydi. Fayl serverga yuborilmaydi.
 * Kirish: { bytes: ArrayBuffer, fayl }. Chiqish: { ok, fragment, materiallar, hisobot } yoki { xato: 'S3D-BAZIS-…', xabar }.
 * Tartib: daraxt (asosiy model, global joylashuv, amallar tarixisiz) → o'qilmasa tekis o'quvchi → Smart3D fragmenti. */
import { inflate } from 'pako';
import { daraxt } from '../../../../app/js/engine/bazis/daraxt.js';
import { parseBazisB3D, generateSpecification, PANEL_CODE } from '../../../../app/js/engine/bazis/b3d.js';
import { bazisLoyiha } from '../../../../app/js/engine/bazis/loyiha.js';
import { bpjOqi, bpjMatn } from '../../../../app/js/engine/bazis/bpj.js';

self.onmessage = (e) => {
  const { bytes, fayl } = e.data || {};
  try {
    const u8 = new Uint8Array(bytes);
    /* .bpj — Bazis skripti eksporti (JSON): joylashuv global, to'g'ridan o'giriladi */
    if (/\.bpj$/i.test(fayl || '')) {
      const b = bpjOqi(bpjMatn(u8));
      if (b.xato) { self.postMessage({ xato: b.xato, xabar: 'BPJ JSON emas' }); return; }
      const rb = bazisLoyiha(b.objects, { fayl, format: b.format, fittings: b.fittings, fasteners: b.fasteners });
      if (rb.xato) { self.postMessage({ xato: rb.xato }); return; }
      rb.hisobot.usul = 'bpj';
      self.postMessage(Object.assign({ ok: true }, rb));
      return;
    }
    let r = daraxt(u8, { inflate }), usul = 'daraxt';
    if (r && r.model === false) { self.postMessage({ xato: 'S3D-BAZIS-103', xabar: 'ichida Bazis modeli yo\'q' }); return; }
    if (r && r.encrypted) { self.postMessage({ xato: 'S3D-BAZIS-102' }); return; }
    if (!r || !r.objects.some(o => o.modelCode === PANEL_CODE)) {
      r = parseBazisB3D(u8, { inflate }); usul = 'tekis';
      if (r.encrypted) { self.postMessage({ xato: 'S3D-BAZIS-102' }); return; }
    }
    const sp = generateSpecification(r.objects);
    const res = bazisLoyiha(r.objects, { fayl, format: r.format || usul, fittings: sp.fittings, fasteners: sp.fasteners });
    if (res.xato) { self.postMessage({ xato: res.xato }); return; }
    res.hisobot.usul = usul;
    self.postMessage(Object.assign({ ok: true }, res));
  } catch (err) {
    self.postMessage({ xato: 'S3D-BAZIS-103', xabar: String((err && err.message) || err).slice(0, 200) });
  }
};
