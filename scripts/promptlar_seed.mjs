/* TZ-37 (2): tayyor so'rovlar dastlabki to'plami. Manba: tests/ui/web_qabul50.mjs dagi qabul sinovidan o'tgan (OK) promptlar —
 * matni AYNAN sinalgan; kutilgan-xato va bajarilmaganlari kirmaydi (salom/3 4 — xato kutiladi; bar peshtaxta, antresol — qamrovdan
 * tashqari; katalogda yo'q "tumba" — 2 ta). Mavjud app/data/promptlar.json dagi 13 ta (parametrli) o'z joyida qoladi.
 * Natija: app/data/promptlar-matn.json (server ishga tushganda bir marta bazaga qo'shiladi — lib/sxema.js promptlarSeed).
 * Ishlatish:  node scripts/promptlar_seed.mjs            — faylni qayta yaratadi, jami sonni chiqaradi
 *             node scripts/promptlar_seed.mjs --db X.db  — shu bazaga ham (idempotent: bir marta) qo'shadi
 * TZ-40: --db bilan har promptga AI tuzilmasi (promptlar_admin.spec_json) ham bepul hosil qilinadi — qoidali tahlilchi, Claude chaqirilmaydi;
 * mavjud tuzilma o'zgarmaydi (faqat bo'sh yoki eski qoida versiyasidagilar). Server ham ishga tushganda shuni qiladi. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'tests/ui/web_qabul50.mjs'), 'utf8');
const a = src.indexOf('const P = ['), b = src.indexOf('\n];', a);
const P = new Function('return ' + src.slice(a + 'const P = '.length, b + 2))();   // [turkum, matn, kutilgan]

/* matn (boshlanishi) → [xona turi (kat), nom uz]; ro'yxatda bo'lmagan — kirmaydi */
const JADVAL = [
  ["oshxona 3 metr to'g'ri", 'oshxona', "To'g'ri oshxona, 3 metr"],
  ['oshxona L shakl 3x4', 'oshxona', 'L shaklli oshxona 3x4, muzlatgich chapda'],
  ['oshxona U shakl 4x4', 'oshxona', 'U shaklli oshxona 4x4'],
  ['oshxona 3x4 orol', 'oshxona', 'Orolli oshxona 3x4'],
  ['kichik oshxona 2 metr', 'oshxona', 'Kichik oshxona, 2 metr'],
  ['oshxona 3 metr ustki shkafsiz', 'oshxona', 'Ustki shkafsiz oshxona'],
  ['oshxona 3 metr stoleshnitsa 38', 'oshxona', 'Oshxona, stoleshnitsa 38 mm'],
  ['oshxona 3 metr gaz plita', 'oshxona', 'Gaz plita va vytyajkali oshxona'],
  ['oshxona L shakl 3x3', 'oshxona', 'L oshxona 3x3, moyka burchakda'],
  ["to'liq oshxona 5x4", 'oshxona', "To'liq oshxona 5x4, texnika bilan"],
  ['yotoqxona 4x5', 'yotoqxona', 'Yotoqxona 4x5'],
  ['yotoqxona 3x4 bir kishilik', 'yotoqxona', 'Bir kishilik yotoqxona 3x4'],
  ['mehmonxona 4x6', 'mehmonxona', 'Mehmonxona 4x6'],
  ['mehmonxona TV zona', 'mehmonxona', 'Mehmonxona, TV zona'],
  ['bolalar xonasi 3x3', 'bolalar', 'Bolalar xonasi 3x3'],
  ['garderob xona 2x3', 'garderob', 'Garderob xona 2x3'],
  ['vannaxona 2x3', 'hammom', 'Vannaxona 2x3'],
  ['ofis 4x4', 'ofis', 'Ofis 4x4'],
  ['dahliz 2x3', 'dahliz', 'Dahliz 2x3, prixojka'],
  ['yotoqxona 5x5 katta', 'yotoqxona', 'Katta yotoqxona 5x5'],
  ['shkaf 1200x600x2200', 'garderob', 'Shkaf 1200x600x2200, 2 eshik'],
  ['shkaf 1800x600x2400', 'garderob', 'Shkaf 1800x600x2400, 3 eshik'],
  ['pastki shkaf 800', 'garderob', 'Pastki shkaf 800, 3 tortma'],
  ['ustki shkaf 600x350x700', 'garderob', 'Ustki shkaf 600x350x700'],
  ['javon 1600x300x1800', 'ofis', 'Javon 1600x300x1800, 5 polka'],
  ['garderob 2000 ikki qanotli', 'garderob', 'Garderob 2000, ikki qanotli'],
  ['stol 1400x700', 'ofis', 'Stol 1400x700'],
  ['ish stoli 1200', 'ofis', 'Ish stoli 1200'],
  ['poyabzal shkafi', 'dahliz', 'Poyabzal shkafi'],
  ['spalniy garnitur', 'yotoqxona', 'Spalniy garnitur: krovat, 3 qismli shkaf, trimo'],
  ['karavot 1600x2000', 'yotoqxona', 'Karavot 1600x2000 va 2 eshikli garderob'],
  ['divan 2 metr', 'mehmonxona', 'Divan 2 metr va stol'],
  ['stol va 4 stul', 'mehmonxona', 'Stol va 4 stul'],
  ['garderob 2400 va komod', 'yotoqxona', 'Garderob 2400 va komod 1200'],
  ['mehmonxona garnitur', 'mehmonxona', 'Mehmonxona garniturı: TV tumba, vitrina, divan'],
  ['bolalar garnituri', 'bolalar', 'Bolalar garnituri: krovat, stol, shkaf'],
  ['ofis: stol, shkaf, javon', 'ofis', 'Ofis: stol, shkaf, javon'],
  ['kabinet: stol', 'ofis', 'Kabinet: stol va kitob javoni'],
  ['кухня 3 на 4', 'oshxona', 'Oshxona 3x4 (ruscha so\'rov)', { ru: 'Кухня 3 на 4', en: 'Kitchen 3 by 4 (Russian prompt)' }],
  ['спальня 4x5', 'yotoqxona', 'Yotoqxona 4x5 (ruscha so\'rov)', { ru: 'Спальня 4x5', en: 'Bedroom 4x5 (Russian prompt)' }],
  ['шкаф 2 метра', 'garderob', 'Shkaf 2 metr, 3 eshik (ruscha so\'rov)', { ru: 'Шкаф 2 метра, 3 двери', en: 'Wardrobe 2 m, 3 doors (Russian prompt)' }],
  ['гостиная с ТВ', 'mehmonxona', 'Mehmonxona TV zonali (ruscha so\'rov)', { ru: 'Гостиная с ТВ зоной', en: 'Living room with TV zone (Russian prompt)' }],
  ['kitchen 3x4', 'oshxona', 'L oshxona 3x4 (inglizcha so\'rov)', { ru: 'Г-образная кухня 3x4 (английский запрос)', en: 'Kitchen 3x4 L-shape' }],
  ['wardrobe 2000', 'garderob', 'Shkaf 2000, 3 eshik (inglizcha so\'rov)', { ru: 'Шкаф 2000, 3 двери (английский запрос)', en: 'Wardrobe 2000 with 3 doors' }]
];
const chiqqan = [];
const prompts = [];
JADVAL.forEach(([bosh, kat, nom, tillar], i) => {
  const q = P.filter(x => x[1].startsWith(bosh));
  if (q.length !== 1) throw new Error(`prompt topilmadi yoki ikki marta: "${bosh}" (${q.length})`);
  const t = tillar || {};
  prompts.push({ id: 'qabul-' + String(i + 1).padStart(2, '0'), kat, nom: { uz: nom, ru: t.ru || '', en: t.en || '' }, matn: { uz: q[0][1], ru: '', en: '' }, tartib: 1000 + (i + 1) * 10 });
});
for (const x of P) if (!JADVAL.some(j => x[1].startsWith(j[0]))) chiqqan.push(x[1].slice(0, 40));

const out = path.join(ROOT, 'app/data/promptlar-matn.json');
fs.writeFileSync(out, JSON.stringify({ _meta: { nima: "Tayyor so'rovlar dastlabki to'plami (matn — AI qatoriga aynan yoziladi). Yaratuvchi: scripts/promptlar_seed.mjs; server uni bir marta bazaga (promptlar_admin) qo'shadi.", manba: 'tests/ui/web_qabul50.mjs (qabul sinovidan o\'tganlar)', chiqarilgan: chiqqan }, promptlar: prompts }, null, 1) + '\n');
const fayl13 = (JSON.parse(fs.readFileSync(path.join(ROOT, 'app/data/promptlar.json'), 'utf8')).promptlar || []).length;
console.log(`promptlar-matn.json: ${prompts.length} ta (+ promptlar.json: ${fayl13}) = ${prompts.length + fayl13}; kirmadi: ${chiqqan.length} (${chiqqan.join(' | ')})`);

const di = process.argv.indexOf('--db');
if (di > 0) {
  const { openDb } = await import('../server/lib/db.js');
  const { adminSxema, aiSxema, promptlarSeed } = await import('../server/lib/sxema.js');
  const { aiTejash } = await import('../server/lib/ai-tejash.js');
  const db = openDb(process.argv[di + 1]);
  db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, org_id TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  adminSxema(db); aiSxema(db);
  console.log(`bazaga qo'shildi: ${promptlarSeed(db, path.join(ROOT, 'app'))} ta`);
  console.log(`AI tuzilmasi hosil qilindi (qoida, bepul): ${aiTejash({ db, claude: {}, yoqilgan: () => false }).royxatToldir()} ta`);
}
