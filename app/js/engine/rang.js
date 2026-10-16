/* Smart3D engine/rang.js — material dekori rangi (TZ-23 E, A5).
 *
 * ERP va Bazis materialning haqiqiy rangini (rasm, RGB) bermaydi — faqat nomi ("ЛДСП Кроношпан 16мм Белый",
 * "Кашемир", "Дуб Сонома"). Rang nomdagi so'zdan olinadi — "taxminiy" (ERP ham shunday qiladi: b3d_full_parser
 * material_color). Nom rangni aytmasa — null: 3D dizayndagi standart rang bilan qoladi (o'ylab topilmaydi, qoida 4.3).
 * guruh — palitra bo'yicha qidiruv uchun (oq, kulrang, bej, yog'och-och, yog'och-to'q, qora, rangli).
 */
const QOIDA = [
  /* [so'z (kichik harf), rang, guruh, yog'och] — tartib muhim: aniqrog'i oldin */
  [/антрацит|графит|anthracite|graphite/, 0x45484d, 'qora', false],
  [/венге|wenge/, 0x3b2a22, 'yogoch_toq', true],
  [/черн|чёрн|qora|black|noir/, 0x232326, 'qora', false],
  [/кашемир|cashmere/, 0xc9c0b4, 'bej', false],
  [/капучино|латте|cappuccino|latte|мокко|mocha/, 0xb39a7e, 'bej', false],
  [/бежев|беж|ваниль|крем|слоновая|ivory|cream|beige|vanil/, 0xe0d4bd, 'bej', false],
  [/бел|white|oq\b|snow|арктик|arctic/, 0xeeece6, 'oq', false],
  [/светло-сер|св\.сер|light grey|light gray/, 0xc3c4c4, 'kulrang', false],
  [/сер|grey|gray|kulrang|бетон|beton|concrete|цемент/, 0x9a9b9c, 'kulrang', false],
  [/орех|walnut|yong'oq/, 0x7d5536, 'yogoch_toq', true],
  [/вишн|cherry|олив|махагон|mahogany/, 0x8e4a2c, 'yogoch_toq', true],
  [/(?:^|[^а-яё])тик(?:[^а-яё]|$)|teak|палисандр|rosewood/, 0x7a5236, 'yogoch_toq', true],
  [/дуб|oak|eman/, 0xc39d6b, 'yogoch_och', true],
  [/бук|beech/, 0xd2ad80, 'yogoch_och', true],
  [/ясен|ash\b|сосна|pine|клён|клен|maple|береза|берёза|birch|ольха|акация|acacia|craft|крафт|сонома|sonoma/, 0xd6bf98, 'yogoch_och', true],
  [/мрамор|marble|камень|stone|гранит|granite/, 0xd8d5ce, 'kulrang', false],
  [/красн|\bred\b|бордо|bordo/, 0x9e3330, 'rangli', false],
  [/зел|green|олива|olive|мята|mint|изумруд/, 0x5c7d58, 'rangli', false],
  [/синий|синяя|синее|синие|\bblue\b|голуб|navy|индиго/, 0x3e5f8a, 'rangli', false],
  [/желт|жёлт|yellow|горчич|mustard|оранж|orange/, 0xd2a63f, 'rangli', false],
  [/розов|pink|пудр/, 0xd9a3a6, 'rangli', false],
  /* Egger dekor kodlari (ishlab chiqaruvchi standarti): W — oq, H — yog'och (Holz), F — tosh/fantaziya */
  [/(?:^|[^a-z0-9])w\d{3,4}(?:[^0-9]|$)/, 0xedebe4, 'oq', false],
  [/(?:^|[^a-z0-9])h\d{4}(?:[^0-9]|$)/, 0xbf996a, 'yogoch_och', true],
  [/(?:^|[^a-z0-9])f\d{3}(?:[^0-9]|$)/, 0xb9b6ae, 'kulrang', false]
];

export const RANG_GURUHLARI = ['oq', 'kulrang', 'bej', 'yogoch_och', 'yogoch_toq', 'qora', 'rangli'];
/** palitra namunasi (guruh rangi) */
export const GURUH_RANG = { oq: 0xeeece6, kulrang: 0x9a9b9c, bej: 0xd9c9ad, yogoch_och: 0xc9a273, yogoch_toq: 0x7d5536, qora: 0x2a2a2d, rangli: 0x5c7d58 };

/** nom → { rang, guruh, yogoch } yoki null (nom rangni aytmaydi) */
export function dekorRang(nom) {
  const s = String(nom || '').toLowerCase();
  if (!s) return null;
  for (const [re, rang, guruh, yogoch] of QOIDA) if (re.test(s)) return { rang, guruh, yogoch };
  return null;
}
