/* Smart3D engine/slots.js — KO'P SLOTLI MATERIAL ARXITEKTURASI (DDD).
 *
 * 6 YILLIK ARXITEKTURA STANDARTI:
 *   - Mebel faqat bitta materialdan iborat bo'lmaydi!
 *   - Standart slotlar:
 *       • korpus: yon devorlar, tub, qopqoq, bog'lovchi plankalar (odatda LDSP 16/18mm)
 *       • fasad: eshiklar, tortma old panellari (odatda MDF 16/18mm, AGT, Akril)
 *       • orqa: orqa devor, tortma tubi (odatda HDF 3mm)
 *       • polka: ichki tokchalar (odatda LDSP 16/18mm)
 *       • kromka_korpus: ko'rinmaydigan/ichki qirralar (0.4mm PVC)
 *       • kromka_fasad: tashqi qirralar, eshiklar (2.0mm PVC)
 *   - Har bir detal o'z slotiga qaraydi va shu slotdagi material qalinligi 't'
 *     hamda haqiqiy narx bo'yicha hisoblanadi.
 */

export const DEFAULT_SLOTS = {
  korpus: 'LDSP18',
  fasad: 'MDF16',
  orqa: 'HDF3',
  polka: 'LDSP18',
  kromka_korpus: 'PVC04',
  kromka_fasad: 'PVC2'
};

/**
 * Slotlar bo'yicha material va qalinliklarni aniqlaydi.
 *
 * Ustuvorlik (pastdan yuqoriga): DEFAULT_SLOTS → fragment slotlari → loyiha → alohida mebel.
 *
 * @param {Object} projectSlots — loyiha darajasidagi slotlar (usta tanlagan korpus/fasad)
 * @param {Object} placementOverride — alohida mebel uchun maxsus slotlar
 * @param {Object} materials — materials.json ma'lumotlar bazasi
 * @param {Object} [fragSlots] — fragmentning o'z standart slotlari (fragments.json → slots)
 * @returns {Object} { getMaterial(slotName), getThickness(slotName), getEdge(slotName), getEdgeByCode(code), slots }
 */
export function resolveSlots(projectSlots = {}, placementOverride = {}, materials = {}, fragSlots = {}) {
  const merged = Object.assign({}, DEFAULT_SLOTS, fragSlots, projectSlots, placementOverride);
  const panelList = materials.panel_materials || [];
  const edgeList = materials.edge_materials || [];

  const panelMap = {};
  for (const p of panelList) panelMap[p.code] = p;

  const edgeMap = {};
  for (const e of edgeList) {
    edgeMap[e.code] = e;
    edgeMap[String(e.code).replace(/\./g, '')] = e;
  }

  return {
    slots: merged,

    /** Slot bo'yicha plita materiali kodini qaytaradi */
    getMaterialCode(slotName) {
      return merged[slotName] || merged.korpus || 'LDSP18';
    },

    /** Slot bo'yicha plita obyektini qaytaradi */
    getMaterial(slotName) {
      const code = this.getMaterialCode(slotName);
      return panelMap[code] || { code, name: code, thickness: 18, sheet_price: 500000 };
    },

    /** Slot bo'yicha material qalinligi t (mm) */
    getThickness(slotName) {
      const mat = this.getMaterial(slotName);
      return mat.thickness != null ? mat.thickness : 18;
    },

    /** Slot bo'yicha kromka materiali (narx — productionCost'da, bazadan) */
    getEdge(slotName) {
      const code = merged[slotName] || (slotName.includes('fasad') ? 'PVC2' : 'PVC04');
      return this.getEdgeByCode(code);
    },

    /** Kod bo'yicha kromka ("PVC0.4" = "PVC04"). Bazada yo'q bo'lsa — narxsiz yozuv. */
    getEdgeByCode(code) {
      return edgeMap[code] || edgeMap[String(code).replace(/\./g, '')] || { code, name: code, missing: true };
    }
  };
}
