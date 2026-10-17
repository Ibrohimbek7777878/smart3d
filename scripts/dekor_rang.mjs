/* Asosiy 100 dekor (egasi #182): har dekorga namuna rangi. ERP'da rasm va RGB yo'q — rang dekor nomi va ishlab chiqaruvchining
 * dekor kodi/nomi bo'yicha umumiy ma'lum ko'rinishidan (Kronospan, Egger, Ultradekor, Kastamonu kataloglaridagi nomlar).
 *   aniq     — keng tarqalgan, bir ma'noli dekor (Белый гладкий, Антрацит, Дуб Сонома, Венге, Кашемир …);
 *   taxminiy — nom ishlab chiqaruvchiga qarab farq qiladi yoki noyob — UI'da kichik "≈" belgisi.
 * Lug'atda yo'q dekor — engine/rang.js (nomdagi rang so'zi), har doim taxminiy. */
import { dekorRang } from '../app/js/engine/rang.js';

/* kalit (engine/dekorAsosiy.js dekorKalit) → [rang, yuza (yogoch | matt | glyanes), ishonch] */
const L = {
  'белый гладкий': ['#f4f3ef', 'matt', 'aniq'], 'белый': ['#f2f1ec', 'matt', 'aniq'], 'белый фасадный': ['#f3f2ee', 'matt', 'aniq'],
  'белый шагрень': ['#f0efe9', 'matt', 'aniq'], 'белый бриллиант': ['#f6f6f3', 'matt', 'aniq'], 'белый платиновый': ['#e9e9e5', 'matt', 'taxminiy'],
  'белый глянец': ['#f7f7f5', 'glyanes', 'aniq'], 'белый премиум': ['#f5f4f0', 'matt', 'aniq'], 'белый снег': ['#f8f8f5', 'matt', 'aniq'],
  'кашемир': ['#cec5b6', 'matt', 'aniq'], 'серый графит': ['#4b4e53', 'matt', 'aniq'], 'графит': ['#4a4c50', 'matt', 'aniq'], 'антрацит': ['#3e4247', 'matt', 'aniq'],
  'черный': ['#232326', 'matt', 'aniq'], 'черный u190': ['#1f1f21', 'matt', 'aniq'], 'серый': ['#9a9b9c', 'matt', 'taxminiy'],
  'светло-серый': ['#c4c5c3', 'matt', 'aniq'], 'серый шифер': ['#6e7275', 'matt', 'taxminiy'], 'серый камень': ['#8f8c86', 'matt', 'taxminiy'],
  'стальной серый': ['#7d8186', 'matt', 'taxminiy'], 'серая галька': ['#a39e95', 'matt', 'taxminiy'], 'серый уголь': ['#4f5154', 'matt', 'taxminiy'],
  'серый перламутровый': ['#a9a8a4', 'matt', 'taxminiy'], 'серый пыльный': ['#9b9993', 'matt', 'taxminiy'], 'глиняный серый': ['#8a847b', 'matt', 'taxminiy'],
  'арктика серая': ['#b8bbbd', 'matt', 'taxminiy'], 'серебристый матовый': ['#bfc1c2', 'matt', 'taxminiy'], 'платина': ['#b8b6b1', 'matt', 'taxminiy'],
  'бетон': ['#9c9a96', 'matt', 'aniq'], 'бетонный камень': ['#a7a39c', 'matt', 'taxminiy'], 'цемент': ['#9e9b95', 'matt', 'taxminiy'], 'цемент светлый': ['#b9b6af', 'matt', 'taxminiy'],
  'бетон чикаго темно-серый': ['#5f5e5b', 'matt', 'taxminiy'], 'угольный камень': ['#4e4f50', 'matt', 'taxminiy'], 'шелковый камень': ['#cfcac1', 'matt', 'taxminiy'],
  'лунный мрамор': ['#dad7d0', 'matt', 'taxminiy'], 'рамух белый': ['#ece9e2', 'matt', 'taxminiy'], 'корбридж': ['#8d8a84', 'matt', 'taxminiy'],
  'металлик файнлайн антрацит': ['#4a4d52', 'matt', 'taxminiy'], 'мрамор пьетра графитовый': ['#4e5054', 'matt', 'taxminiy'],
  'бежевый': ['#e2d3b6', 'matt', 'aniq'], 'слоновая кость': ['#ece4d0', 'matt', 'aniq'], 'крем бежевый': ['#e6d8bc', 'matt', 'taxminiy'], 'капучино': ['#b39a7e', 'matt', 'aniq'],
  'моккочино': ['#8b7462', 'matt', 'taxminiy'], 'крослайн латте': ['#c7b39a', 'matt', 'taxminiy'], 'тессеа серовато-бежевый': ['#bfb4a4', 'matt', 'taxminiy'],
  'сатин': ['#e9e5dc', 'matt', 'taxminiy'], 'золотая патина': ['#b49460', 'matt', 'taxminiy'], 'аруша': ['#d8cdbe', 'matt', 'taxminiy'], 'аруша глянец': ['#d8cdbe', 'glyanes', 'taxminiy'],
  'кипарисовый зеленый': ['#4f6650', 'matt', 'taxminiy'], 'зеленый эвкалипт': ['#6d806c', 'matt', 'taxminiy'], 'зеленый камень': ['#6f7d6b', 'matt', 'taxminiy'],
  'альби полуночно-синий': ['#263a55', 'matt', 'taxminiy'], 'розовый антик': ['#d2a8a2', 'matt', 'taxminiy'],
  /* yog'och */
  'дуб сонома': ['#d3b58a', 'yogoch', 'aniq'], 'дуб вотан': ['#9c8269', 'yogoch', 'aniq'], 'дуб венге': ['#3b2a22', 'yogoch', 'aniq'], 'венге': ['#3b2a22', 'yogoch', 'aniq'],
  'дуб золотой': ['#c19a5b', 'yogoch', 'taxminiy'], 'дуб орегон': ['#a5754a', 'yogoch', 'taxminiy'], 'сосна астана': ['#dccbb0', 'yogoch', 'taxminiy'],
  'сосна астана original': ['#dccbb0', 'yogoch', 'taxminiy'], 'ясень анкор темный': ['#6b5240', 'yogoch', 'taxminiy'], 'ясень анкор светлый': ['#d2bfa0', 'yogoch', 'taxminiy'],
  'ясень шимо светлый': ['#dccdb3', 'yogoch', 'aniq'], 'ясень шимо темный': ['#5e4a3d', 'yogoch', 'aniq'], 'бодега темный': ['#5e4535', 'yogoch', 'taxminiy'],
  'дуб белый': ['#e6dccb', 'yogoch', 'taxminiy'], 'сосна лофт белая': ['#e8e0d2', 'yogoch', 'taxminiy'], 'морское дерево винтаж': ['#9c8f7e', 'yogoch', 'taxminiy'],
  'дуб бурбон': ['#9a6b43', 'yogoch', 'taxminiy'], 'дуб табачный': ['#8b6440', 'yogoch', 'taxminiy'], 'орех селект каминный': ['#6a4a33', 'yogoch', 'taxminiy'],
  'дуб харбор золотой': ['#b78a55', 'yogoch', 'taxminiy'], 'дуб кунео коричневый': ['#7f5b3e', 'yogoch', 'taxminiy'], 'орех франклин табачный': ['#7a5236', 'yogoch', 'taxminiy'],
  'дуб парящий': ['#b79874', 'yogoch', 'taxminiy'], 'дуб серый': ['#8e8a82', 'yogoch', 'taxminiy'], 'дуб кремовый светлый': ['#e3d3b8', 'yogoch', 'taxminiy'],
  'скандинавское дерево белое': ['#e5dfd3', 'yogoch', 'taxminiy'], 'дуб фристайл': ['#a88660', 'yogoch', 'taxminiy'], 'дуб эвок прибрежный': ['#9f8a70', 'yogoch', 'taxminiy'],
  'дуб сантана': ['#a07a55', 'yogoch', 'taxminiy'], 'дуб бунратти se светлый': ['#c9ae88', 'yogoch', 'taxminiy'], 'дуб сторсунд': ['#a47d58', 'yogoch', 'taxminiy'],
  'дуб каселла натуральный': ['#b58e62', 'yogoch', 'taxminiy'], 'дуб фэрбенк': ['#a68a6a', 'yogoch', 'taxminiy'], 'вяз либерти серебрянный': ['#b9b5ad', 'yogoch', 'taxminiy'],
  'дуб галифакс олово': ['#7e7468', 'yogoch', 'taxminiy'], 'дуб галифакс белый': ['#d8cfc0', 'yogoch', 'taxminiy'], 'дуб сакраменто коричневый': ['#7a5a40', 'yogoch', 'taxminiy'],
  'дуб фокстрот': ['#b79a78', 'yogoch', 'taxminiy'], 'дуб шерман коньяк коричневый': ['#7b5638', 'yogoch', 'taxminiy'], 'дуб амберг натуральный': ['#c29f72', 'yogoch', 'taxminiy'],
  'дуб турин': ['#a27d57', 'yogoch', 'taxminiy'], 'флитвуд белый': ['#e4ded3', 'yogoch', 'taxminiy'], 'флитвуд серая лава': ['#77736c', 'yogoch', 'taxminiy'],
  'сегни светлый': ['#d9c7a8', 'yogoch', 'taxminiy'], 'ароза светлая': ['#d8cbb5', 'yogoch', 'taxminiy'], 'дуб крафт золотой': ['#c49a62', 'yogoch', 'aniq'],
  'дуб крафт белый': ['#e3d9c8', 'yogoch', 'aniq'], 'дуб крафт серый': ['#9e958a', 'yogoch', 'aniq'], 'дуб галифакс натуральный': ['#b08a5f', 'yogoch', 'taxminiy']
};
const hex = (n) => '#' + Number(n).toString(16).padStart(6, '0');

/** rang oilasi — palitra guruhi (engine/rang.js RANG_GURUHLARI) rang va yuza bo'yicha */
export function guruhi(h, yogoch) {
  const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  if (yogoch) return l >= 0.55 ? 'yogoch_och' : 'yogoch_toq';
  const d = mx - mn, hue = d === 0 ? 0 : mx === r ? (60 * ((g - b) / d) + 360) % 360 : mx === g ? 60 * ((b - r) / d) + 120 : 60 * ((r - g) / d) + 240;
  if (s >= 0.15 && d > 0.04 && !(hue >= 15 && hue <= 55)) return 'rangli';   // yashil, ko'k, pushti — rangli
  if (l < 0.3) return 'qora';
  if (l > 0.9 && s < 0.4) return 'oq';
  if (s < 0.12 || d < 0.05) return 'kulrang';
  if (hue >= 15 && hue <= 55) return 'bej';
  return 'rangli';
}

export function dekorRangi(k, nom) {
  const e = L[k];
  if (e) return { hex: e[0], yuza: e[1], ishonch: e[2], guruh: guruhi(e[0], e[1] === 'yogoch') };
  const r = dekorRang(nom) || dekorRang(k), glyanes = /глян|gloss/i.test(nom);
  if (r) return { hex: hex(r.rang), yuza: r.yogoch ? 'yogoch' : glyanes ? 'glyanes' : 'matt', ishonch: 'taxminiy', guruh: r.guruh };
  return null;
}
export const LUGAT = L;
