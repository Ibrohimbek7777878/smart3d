/* TZ-26: AI konstruksiya — konstruksiya tili (app/js/engine/konstruksiyaTili.js).
 * Tekshiriladi: modul yoki xona (konstruksiyami); AI'siz tahlilchi uch tilda (o'lcham, bo'limlar, polka, tortma, shtanga,
 * eshik taqsimoti); tizim to'g'rilashi (o'lcham chegarasi, keng eshik — 2, keng polka — bo'lgich, keng eshikli bo'lim — bo'linadi,
 * zich polka/tortma, tortmaga eshik yo'q, tortma + polka — qatlamlar); AI javobi kabi xom JSON (yetishmagan, noto'g'ri
 * maydonlar); chizmaga aylantirish va chizish dvigatelidan detallar, furnitura, narx (cutlist + productionCost). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const K = await import('../app/js/engine/konstruksiyaTili.js');
const { chizmaKatalog, chizmaPanellar } = await import('../app/js/engine/chizish.js');
const { cutlist, productionCost } = await import('../app/js/engine/cutlist.js');
const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const mats = JSON.parse(readFileSync(DATA + 'materials.json', 'utf8'));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;
const qur = (matn) => K.specTekshir(K.matndanSpec(matn));
const qisqa = (b) => [b.eshik, b.petlya, b.polka, b.tortma, b.shtanga];

/* 1. modulmi yoki xona */
ok('modul: shkaf, pastki, tumba, javon, ruscha, inglizcha', ["shkaf 1200 4 polka", "pastki shkaf 800 3 tortma", "komod 6 tortma", "javon 800x300x1800", "шкаф 1800 слева штанга", "wardrobe 1500 wide"].every(K.konstruksiyami));
ok('xona: oshxona o\'lcham bilan, L shakl, xolodilnik, "3 ta pastki"', !["oshxona 3x4 m", "oshxona 3.6x3 m L shakl", "xona 4x5 xolodilnik chapda", "3 ta pastki va 2 ta ustki shkaf", "кухня 3x4 м", ""].some(K.konstruksiyami));

/* 2. tahlilchi */
let r = qur("shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik");
ok('o\'zbekcha shkaf: o\'lcham, 2 bo\'lim, chapda shtanga (eshik chap), o\'ngda 4 polka (eshik o\'ng)', r.spec.tur === 'shkaf' && r.spec.eni === 1200 && r.spec.chuqurligi === 600 && r.spec.boyi === 2200
  && J(r.spec.bolimlar.map(qisqa)) === J([[1, 'chap', 0, 0, true], [1, 'ong', 4, 0, false]]) && !r.tuzatish.length, J(r));
r = qur('pastki shkaf 800, 3 tortma');
ok('"pastki shkaf 800, 3 tortma" → tumba, 3 tortma, eshiksiz', r.spec.tur === 'tumba' && r.spec.eni === 800 && J(r.spec.bolimlar.map(qisqa)) === J([[0, 'auto', 0, 3, false]]), J(r.spec));
r = qur('шкаф 1800х600х2400, слева штанга, посередине 5 полок, справа 3 ящика и 2 полки');
ok('ruscha: 3 bo\'lim; o\'ngda pastda 3 tortma, tepada 2 polka (eshik — faqat polkalarda)', r.spec.bolimlar.length === 3 && r.spec.bolimlar[1].polka === 5
  && J(r.spec.bolimlar[2].qatlamlar.map(qisqa)) === J([[0, 'auto', 0, 3, false], [1, 'ong', 2, 0, false]]) && r.tuzatish.some(t => t.kod === 'tortma_qatlam'), J(r.spec.bolimlar));
r = qur('шкаф ширина 1500 высота 2400, полки 4');
ok('ruscha kalit so\'zlar: ширина, высота, "полки 4" (kirill harflari)', r.spec.eni === 1500 && r.spec.boyi === 2400 && r.spec.bolimlar.every(b => b.polka === 4), J(r.spec));
r = qur('тумба 600, 4 ящика');
ok('ruscha tumba: eni 600, 4 tortma', r.spec.tur === 'tumba' && r.spec.eni === 600 && r.spec.bolimlar[0].tortma === 4, J(r.spec));
r = qur('wardrobe 1500 wide 2200 high, left hanging rail, right 5 shelves, 3 doors');
ok('inglizcha: 1500 × 2200, chapda shtanga, o\'ngda 5 polka; keng bitta eshik — 2 (izoh)', r.spec.eni === 1500 && r.spec.boyi === 2200 && r.spec.bolimlar[0].shtanga && r.spec.bolimlar[1].polka === 5
  && r.spec.bolimlar.every(b => b.eshik === 2) && r.tuzatish.some(t => t.kod === 'eshik2'), J(r));
r = qur('kiyim shkafi eni 2 m, bo\'yi 2.4 m, 3 bo\'lim, shtanga va polka');
ok('metrda o\'lcham, "3 bo\'lim"', r.spec.eni === 2000 && r.spec.boyi === 2400 && r.spec.bolimlar.length === 3 && r.spec.bolimlar.every(b => b.shtanga && b.polka === 1));
r = qur("shkaf 2 bo'lim 4 eshik");
ok('"shkaf 2 bo\'lim 4 eshik": 2 kichik son o\'lcham emas; har bo\'limga 2 eshik', r.spec.eni === 1200 && r.spec.bolimlar.length === 2 && r.spec.bolimlar.every(b => b.eshik === 2));
r = qur('javon 800x300x1800 5 polka');
ok('javon — erkin, eshiksiz', r.spec.tur === 'erkin' && r.spec.bolimlar[0].eshik === 0 && r.spec.bolimlar[0].polka === 5);
r = qur('shkaf');
ok('faqat "shkaf" — tur standarti (2 bo\'lim: chapda shtanga, o\'ngda 4 polka)', r.spec.eni === 1200 && r.spec.boyi === 2200
  && J(r.spec.bolimlar.map(qisqa)) === J([[1, 'chap', 1, 0, true], [1, 'ong', 4, 0, false]]), J(r.spec.bolimlar.map(qisqa)));

/* 3. to'g'rilash (AI javobi kabi xom JSON) */
r = K.specTekshir({ tur: 'shkaf', eni: 5000, chuqurligi: 600, boyi: 2200, bolimlar: [{ eni: 0, eshik: 1, polka: 3 }] });
ok('o\'lcham chegarasi (5000 → 2750) va keng polka — bo\'lgich, keng eshik — bo\'linadi', r.spec.eni === 2750 && r.tuzatish.some(t => t.kod === 'olcham' && t.m === 2750)
  && r.spec.bolimlar.length >= 4 && r.spec.bolimlar.every(b => b.polka === 3 && b.eshik > 0), J(r.tuzatish));
r = K.specTekshir({ tur: 'pastki', eni: 600, bolimlar: [{ eshik: 2, tortma: 3 }] });
ok('tortmali bo\'limga eshik qo\'yilmaydi (izoh)', r.spec.bolimlar[0].eshik === 0 && r.tuzatish.some(t => t.kod === 'tortma_eshik'));
r = K.specTekshir({ tur: 'ustki', eni: 600, boyi: 720, bolimlar: [{ eshik: 2, polka: 12 }] });
ok('zich polka kamaytiriladi (orasi ≥ 150 mm)', r.spec.bolimlar[0].polka < 12 && r.spec.bolimlar[0].polka >= 2 && r.tuzatish.some(t => t.kod === 'polka_kam'), J(r.spec.bolimlar));
r = K.specTekshir({ tur: 'tumba', eni: 600, boyi: 800, bolimlar: [{ tortma: 10 }] });
ok('zich tortma kamaytiriladi (fasad ≥ 100 mm)', r.spec.bolimlar[0].tortma <= 6 && r.tuzatish.some(t => t.kod === 'tortma_kam'));
r = K.specTekshir({ tur: 'shkaf', eni: 1200, bolimlar: [{ eni: 900, eshik: 1 }, { eni: 900, eshik: 1 }] });
ok('bo\'limlar eni yig\'indisi sig\'masa — teng bo\'linadi (izoh)', r.spec.bolimlar.every(b => b.eni === 0) && r.tuzatish.some(t => t.kod === 'eni_yigindi'));
r = K.specTekshir({ tur: 'noma\'lum', eni: 'abc', bolimlar: 'x', tushunilmadi: ['qizil rang', 5] });
ok('noto\'g\'ri maydonlar — standart; tushunilmagan — ro\'yxatda', r.spec.tur === 'shkaf' && r.spec.eni === 1200 && r.spec.bolimlar.length >= 1 && r.tushunilmadi.length === 2);
ok('tur "xona" — konstruksiya emas', K.specTekshir({ tur: 'xona' }).xona === true);

/* 4. chizma → chizish dvigateli: detallar, 3D, furnitura, narx */
const MISOL = ["shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik", 'pastki shkaf 800, 3 tortma', 'шкаф 1800х600х2400, слева штанга, посередине 5 полок, справа 3 ящика и 2 полки',
  'wardrobe 1500 wide 2200 high, left hanging rail, right 5 shelves, 3 doors', 'ustki shkaf 600 2 eshik 2 polka', 'javon 800x300x1800 5 polka', 'komod 1000 6 tortma'];
const natija = MISOL.map((m, i) => {
  const { spec } = qur(m), ch = K.specdanChizma(spec), fr = chizmaKatalog(ch, 'CH-T' + i, spec.nom || m);
  const cl = cutlist(fr, fr.w, fr.d, fr.h, mats, { projectSlots: { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'MDF16', orqa: 'HDF3' } });
  const pc = productionCost([Object.assign(cl, { placementId: 'x' })], mats, {});
  const P = chizmaPanellar(ch, fr.w, fr.d, fr.h, { t: 16 });
  return { m, xato: cl.errors.length, detal: cl.parts.length, narx: pc.clientTotal, eshik: P.panels.filter(p => p.isDoor).length, tortma: P.panels.filter(p => p.isDrawer).length, shtanga: P.furn.filter(f => f.tur === 'shtanga').length, h: fr.h, z: fr.default_z };
});
ok('7 ta misol: chizish dvigateli detal va narx chiqaradi, xatosiz', natija.every(x => !x.xato && x.detal >= 5 && x.narx > 0), J(natija.filter(x => x.xato || x.detal < 5 || !(x.narx > 0))));
ok('3D: shkaf — 2 eshik, 1 shtanga; tumba — 3 tortma; ruscha — 3 tortma, 3 eshik', natija[0].eshik === 2 && natija[0].shtanga === 1 && natija[1].tortma === 3 && natija[1].eshik === 0
  && natija[2].tortma === 3 && natija[2].eshik === 3, J(natija.map(x => [x.eshik, x.tortma, x.shtanga])));
ok('pastki/tumba: bo\'yi oyoq bilan (808 → korpus 708, oyoq 100)', natija[1].h === 708 && natija[1].z === 100, J(natija[1]));
ok('specXulosa: polka, tortma, shtanga, eshik soni', J(K.specXulosa(qur("shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik").spec)) === J({ bolim: 2, polka: 4, tortma: 0, shtanga: 1, eshik: 2 }));
ok('AI uchun til ta\'rifi (server ko\'rsatmasi)', /bolimlar/.test(K.TIL_IZOH) && /PASTDAN YUQORIGA/.test(K.TIL_IZOH) && /xona/.test(K.TIL_IZOH));

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
