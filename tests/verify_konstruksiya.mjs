/* TZ-26: AI konstruksiya — konstruksiya tili (app/js/engine/konstruksiyaTili.js).
 * Tekshiriladi: modul yoki xona (konstruksiyami); AI'siz tahlilchi uch tilda (o'lcham, bo'limlar, polka, tortma, shtanga,
 * eshik taqsimoti); tizim to'g'rilashi (o'lcham chegarasi, keng eshik — 2, keng polka — bo'lgich, keng eshikli bo'lim — bo'linadi,
 * zich polka/tortma, tortmaga eshik yo'q, tortma + polka — qatlamlar); AI javobi kabi xom JSON (yetishmagan, noto'g'ri
 * maydonlar); chizmaga aylantirish va chizish dvigatelidan detallar, furnitura, narx (cutlist + productionCost). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const K = await import('../app/js/engine/konstruksiyaTili.js');
const { chizmaKatalog, chizmaPanellar, chizmaFragment, yassi, tikla } = await import('../app/js/engine/chizish.js');
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

/* 5. egasining prompti (2026-10-17, aynan — imlo xatolari bilan): o'lcham, bo'limlar, kiyim joyi (1000 mm, shtanga, ustida va
 *    ostida polka), 6 teng polka, material (ERP: Кашемир, Дуб золотой), furnitura (konfirmat, polkaderjatel, 1000 mm ruchka),
 *    sokol, orqa HDF polgacha, OBJ buyrug'i; yana 3 variant: ruscha, imlo xatosiz, "kengligi 1000" (bo'lim eni) */
const EGA = 'mebel turi:shkaf balandlig 2100mm , eniga 1200mm,chuqurlig 580mm,korpusi va ichki qism materali:kashemir,16mm , fasad dubzalatoy,16mm, ikki eshikli chap tomondan 1 metr kiyim iladigan vishilkali joy, tepa va pastida polkalar bor bittadan , ong tomonda qolgan qismmi 6ta teng polkadan iborat , korpus brikmasi konfirmat, polkalar polka derjatel, bilan mahkamlanad  ruchka 1mterlik uzun ruchkadan qoyilad korpus bakavinasi yergacha va sokilli boladi,  obj formatda yubor gpirmasdan yubor';
const RUS = 'шкаф высота 2100 мм, ширина 1200 мм, глубина 580 мм, корпус и внутренняя часть — кашемир 16 мм, фасад — дуб золотой 16 мм, две двери, слева на 1 метр штанга для одежды, сверху и снизу по одной полке, справа 6 равных полок, корпус на конфирматах, полки на полкодержателях, ручка длинная 1000 мм, задняя стенка до пола, цоколь, отправь в формате obj';
const TOZA = "Mebel turi: shkaf. Balandligi 2100 mm, eni 1200 mm, chuqurligi 580 mm. Korpus va ichki qism materiali: Kashemir, 16 mm; fasad: Dub zolotoy, 16 mm. Ikki eshikli. Chap tomonda 1 metrli kiyim osiladigan joy shtanga bilan, uning tepasida va pastida bittadan polka. O'ng tomonda 6 ta teng polka. Korpus birikmasi — konfirmat, polkalar polkaderjatel bilan mahkamlanadi. Ruchka — 1 metrli uzun ruchka. Korpus bokovinasi yergacha, sokolli. OBJ formatda yuboring, gapirmasdan.";
const sheets = JSON.parse(readFileSync(DATA + 'sheet-catalog.json', 'utf8')).sheets;
const qat = (b) => b.qatlamlar.map(q => [q.boyi, q.shtanga, q.polka]);
const togri = (r, nom) => {
  const sp = r.spec, [c, o] = sp.bolimlar;
  ok(nom + ': o\'lcham 1200×580×2100, sokol, orqa HDF polgacha', sp.tur === 'shkaf' && sp.eni === 1200 && sp.chuqurligi === 580 && sp.boyi === 2100 && sp.tag === 'sokol' && sp.orqa === 'yergacha', J(sp));
  ok(nom + ': 2 bo\'lim (teng), har biriga 1 eshik — chap/o\'ng petlya', sp.bolimlar.length === 2 && c.eni === 0 && o.eni === 0 && c.eshik === 1 && c.petlya === 'chap' && o.eshik === 1 && o.petlya === 'ong', J(sp.bolimlar.map(qisqa)));
  ok(nom + ': chapda kiyim joyi 1000 mm (shtanga), ustida va ostida polka (polka ushlagichda)', c.ajrat === 'polka' && J(qat(c)) === J([[0, false, 0], [1000, true, 0], [0, false, 0]]), J(c));
  ok(nom + ': o\'ngda 6 teng polka', o.polka === 6 && !o.qatlamlar.length && !o.shtanga, J(o));
  ok(nom + ': material — korpus va polka kashemir 16, fasad dub zolotoy 16', /^(kashemir|кашемир)$/.test(sp.material.korpus.nom) && sp.material.korpus.qalinlik === 16
    && sp.material.polka.nom === sp.material.korpus.nom && sp.material.polka.qalinlik === 16 && /^(dubzalatoy|дуб золотой|dub zolotoy)$/.test(sp.material.fasad.nom) && sp.material.fasad.qalinlik === 16, J(sp.material));
  ok(nom + ': furnitura — konfirmat, polkaderjatel, ruchka 1000 mm; OBJ buyrug\'i; to\'g\'rilashsiz', J(sp.furnitura) === J({ birikma: 'konfirmat', polka: 'polkaderjatel', ruchka: 1000 }) && sp.eksport === 'obj' && !r.tuzatish.length, J([sp.furnitura, sp.eksport, r.tuzatish]));
  ok(nom + ': xulosa — 2 bo\'lim · 8 polka · 1 shtanga · 2 eshik', J(K.specXulosa(sp)) === J({ bolim: 2, polka: 8, tortma: 0, shtanga: 1, eshik: 2 }), J(K.specXulosa(sp)));
  const pk = K.plitaTop(sheets, sp.material.korpus.nom, 16, 'korpus'), pf = K.plitaTop(sheets, sp.material.fasad.nom, 16, 'fasad');
  /* TZ-50 (2026-10-23): katalog faqat yangi baza — avvalgi tanlov 'ЛДСП Ультрадекор 5,796 Кашемир UR 16мм' yangi bazada yo'q; plitaTop (o'zgarmagan: qalinlik → ortiqcha so'z kam → tur) endi
   * eng kam ortiqcha so'zli 'ЛМДФ Кашемир 5,0325' (LMDF 16) ni topadi; fasad «Дуб Золотой» — o'sha LDSP */
  ok(nom + ': ERP plitasi — korpus «Кашемир» (yangi bazada: ЛМДФ Кашемир 5,0325, LMDF 16), fasad «Дуб Золотой» LDSP 16', pk && pk.name === 'ЛМДФ Кашемир 5,0325' && pk.type === 'LMDF' && +pk.th === 16 && pf && pf.name === 'ЛДСП Ультрадекор 4,575 Дуб Золотой 16мм', J([pk && pk.name, pf && pf.name]));
};
const rE = qur(EGA);
ok('egasi prompti: modul (xona emas)', K.konstruksiyami(EGA) && K.konstruksiyami(RUS) && K.konstruksiyami(TOZA));
togri(rE, 'egasi');
togri(qur(RUS), 'ruscha');
togri(qur(TOZA), 'imlo xatosiz');
let rk = qur(EGA.replace('chap tomondan 1 metr kiyim', 'chap tomondan kengligi 1000 mm kiyim'));
const rk0 = K.matndanSpec(EGA.replace('chap tomondan 1 metr kiyim', 'chap tomondan kengligi 1000 mm kiyim'));
ok('"kengligi 1000" — bo\'lim ENI 1000 (kiyim joyi bo\'yi aytilmagan — teng), o\'ngda 6 polka', rk0.bolimlar[0].eni === 1000 && rk0.bolimlar[0].ajrat === 'polka'
  && J(rk0.bolimlar[0].qatlamlar) === J([{ boyi: 0 }, { boyi: 0, shtanga: true }, { boyi: 0 }]) && rk0.bolimlar[1].polka === 6 && rk0.bolimlar[1].eni === 0, J(rk0.bolimlar));
ok('"kengligi 1000": 1000 mm polka egiladi — tizim 2 ga bo\'ladi (izoh), har yarmida kiyim joyi, o\'ngda 6 polka', rk.tuzatish.some(t => t.kod === 'polka_bolgich' && t.n === 1000 && t.k === 2)
  && rk.spec.bolimlar.length === 3 && rk.spec.bolimlar.slice(0, 2).every(b => b.ajrat === 'polka' && b.qatlamlar[1].shtanga && b.eshik === 1) && rk.spec.bolimlar[2].polka === 6, J(rk.spec.bolimlar.map(qisqa)));
ok('"mm" — millimetr (metr emas): "eni 1200 mm" → 1200', qur('shkaf eni 1200 mm balandligi 2100mm').spec.eni === 1200 && qur('shkaf eni 1200 mm balandligi 2100mm').spec.boyi === 2100 && qur('shkaf 1200x600x2200 mm').spec.chuqurligi === 600);
ok('ERP\'da yo\'q dekor — null (o\'ylab topilmaydi); qalinlik mos kelmasa — null', K.plitaTop(sheets, 'qizil olma', 16, 'korpus') === null && K.plitaTop(sheets, 'kashemir', 18, 'korpus') === null && K.plitaTop(sheets, 'bilan', 16, 'korpus') === null);

/* chizma → dvigatel: detallar, furnitura kodlari, sokol, HDF polgacha, kiyim joyi bo'yi, ruchka */
const chE = K.specdanChizma(rE.spec);
ok('chizma: orqaYer, ruchka 1000, chap bo\'lim — gorizontal (ajrat polka); saqlash/tiklashda saqlanadi', chE.orqaYer === true && chE.ruchka.l === 1000 && chE.ichki.bo[0].n.yo === 'h' && chE.ichki.bo[0].n.ajrat === 'polka'
  && (() => { const x = tikla(JSON.parse(J(yassi(chE)))); return x.orqaYer === true && x.ruchka.l === 1000 && x.ichki.bo[0].n.ajrat === 'polka' && x.ichki.bo[0].n.bo[1].o === 1000 && x.ichki.bo[0].n.bo[1].n.shtanga; })(), J(chE));
const frE = chizmaKatalog(chE, 'CH-EGA', 'shkaf');
const PE = chizmaPanellar(chE, chE.w, chE.d, chE.h, { t: 16 });
const pz = PE.panels.filter(p => p.code === 'polka'), zb = -chE.h / 2;
const chapP = pz.filter(p => p.x < 0).sort((a, b) => a.z - b.z), ongP = pz.filter(p => p.x > 0).sort((a, b) => a.z - b.z);
const orqaP = PE.panels.find(p => p.code === 'orqa'), yonlar = PE.panels.filter(p => p.code === 'yon');
ok('3D: 8 polka (chapda 2, o\'ngda 6), bo\'lgich_g yo\'q; chapdagi polkalar orasi 1000 mm, shtanga ular orasida', pz.length === 8 && chapP.length === 2 && ongP.length === 6 && !PE.panels.some(p => p.code === 'bolgich_g')
  && Math.abs((chapP[1].z - chapP[1].h / 2) - (chapP[0].z + chapP[0].h / 2) - 1000) < 0.6
  && PE.furn.filter(f => f.tur === 'shtanga').length === 1 && PE.furn.some(f => f.tur === 'shtanga' && f.o[2] > chapP[0].z && f.o[2] < chapP[1].z), J(chapP.map(p => [p.z, p.h])));
const oraliq = ongP.slice(1).map((p, i) => Math.round((p.z - ongP[i].z) * 10) / 10);
ok('3D: o\'ngdagi 6 polka teng oraliqda', oraliq.every(v => Math.abs(v - oraliq[0]) < 0.6), J(oraliq));
ok('3D: sokol (old va orqa), yon devorlar polgacha, orqa HDF polgacha (sokol ortini yopadi), 2 eshik', PE.panels.filter(p => p.code === 'sokol').length === 2 && yonlar.length === 2
  && yonlar.every(p => Math.abs(p.z - p.h / 2 - zb) < 0.6) && orqaP && Math.abs(orqaP.z - orqaP.h / 2 - zb) < 0.6 && PE.doors.length === 2, J(orqaP));
ok('3D: ruchka eshik bo\'yida uzun (1000 mm)', PE.doors.every(d => d.handle && d.handle.h === 1000), J(PE.doors.map(d => d.handle)));
const fE = chizmaFragment(chE, chE.w, chE.d, chE.h, { t: 16, tp: 16, tf: 16 });
const hw = Object.fromEntries(fE.hardware.map(x => [x.code, x.qty]));
ok('furnitura: konfirmat (TS-1730) bor, polkaderjatel 8×4 = 32, ruchka RU-1000 × 2 (RU-128 yo\'q), shtanga', hw['TS-1730'] > 0 && hw.POLKADERJ === 32 && hw['RU-1000'] === 2 && !hw['RU-128'] && hw.SHTANGA > 0, J(hw));
const eshikTesh = fE.birikmalar.filter(b => b.teshiklar[0].kind === 'd6_ruchka');
ok('uzun ruchka teshigi o\'ylab topilmaydi: d6_ruchka yo\'q, ogohlantirish; polka ushlagich teshiklari bor', !eshikTesh.length && fE.ogoh.some(o => o.kod === 'ruchka_teshik' && o.n === 1000)
  && fE.birikmalar.some(b => b.teshiklar[0].kind === 'd6_polka'), J(fE.ogoh));
const clE = cutlist(frE, frE.w, frE.d, frE.h, mats, { projectSlots: { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16', orqa: 'HDF3' } });
const pcE = productionCost([Object.assign(clE, { placementId: 'x' })], mats, {});
const ruL = pcE.lines.find(l => l.code === 'RU-1000');
ok('hisob: xatosiz, narx > 0; RU-1000 narxi o\'ylab topilmaydi (narx yo\'q belgisi)', !clE.errors.length && pcE.clientTotal > 0 && ruL && ruL.no_price === true, J([clE.errors, ruL]));
ok('AI uchun til: material, furnitura, orqa, eksport, ajrat', /material/.test(K.TIL_IZOH) && /furnitura/.test(K.TIL_IZOH) && /yergacha/.test(K.TIL_IZOH) && /eksport/.test(K.TIL_IZOH) && /ajrat/.test(K.TIL_IZOH));
r = K.specTekshir({ tur: 'shkaf', material: { korpus: { nom: '<b>kashemir</b>', qalinlik: 99 } }, furnitura: { birikma: 'ekssentrik', ruchka: 9000 }, eksport: 'yoq', orqa: 'boshqa' });
ok('AI javobi: material tozalanadi, qalinlik chegarada, ekssentrik — o\'zi (izohsiz, chizmada birikma), ruchka chegarada, eksport/orqa standart', r.spec.material.korpus.nom === 'bkashemir/b' && r.spec.material.korpus.qalinlik === 40
  && r.spec.material.polka.nom === r.spec.material.korpus.nom && !r.tuzatish.some(t => t.kod === 'birikma') && r.spec.furnitura.birikma === 'ekssentrik'
  && K.specdanChizma(r.spec).birikma === 'ekssentrik' && !K.specdanChizma(rE.spec).birikma && r.spec.furnitura.ruchka === 2500 && r.spec.eksport === '' && r.spec.orqa === 'auto', J(r));

/* egasi #168: avval katalogdagi tayyor modul (yangi CH- modul faqat "Baribir chizish" bosilsa) — app/js/engine/katalogTanlash.js */
{
  const { katalogdanTop, modulBelgilari } = await import('../app/js/engine/katalogTanlash.js');
  const { applySexStandart } = await import('../app/js/engine/standart.js');
  const std = JSON.parse(readFileSync(DATA + 'sex-standartlari.json', 'utf8')), cat = {};
  for (const f of JSON.parse(readFileSync(DATA + 'fragments.json', 'utf8'))) cat[f.code] = f;
  for (const f of JSON.parse(readFileSync(DATA + 'fragments-mc.json', 'utf8')).fragments) cat[f.code] = f;
  for (const f of Object.values(cat)) applySexStandart(f, std);
  const tan = (m) => { const raw = K.matndanSpec(m); return katalogdanTop(K.specTekshir(raw).spec, raw, cat, m); };
  const kk = (r, k) => r.mos.concat(r.mosEmas).find(x => x.k === k);
  ok('belgilar: MC-SH-01 — 2 eshik, shtanga; SP-K-022 — 3 tortma; SP-G-010 — kupe', J(modulBelgilari(cat['MC-SH-01'])) === J({ eshik: 2, tortma: 0, polka: 1, shtanga: true, kupe: false })
    && modulBelgilari(cat['SP-K-022']).tortma === 3 && modulBelgilari(cat['SP-G-010']).kupe, J([modulBelgilari(cat['MC-SH-01']), modulBelgilari(cat['SP-K-022'])]));
  for (const [nom, m] of [['egasi', EGA], ['ruscha', RUS], ['imlo xatosiz', TOZA]]) {
    const r = tan(m);
    ok(nom + ': katalogdan MC-SH-01 (garderob, 2 eshik, shtanga) — 1200×580×2100, yangi modul chizilmaydi', r.topildi && r.frg === 'MC-SH-01' && J(r.olcham) === J({ w: 1200, d: 580, h: 2100 }), J([r.frg, r.olcham]));
    ok(nom + ': mos — eni, chuqurligi (350–600), bo\'yi (1780–2590), 2 eshik, shtanga; mos emas — polka soni (modulda 1)',
      ['eni', 'chuqurligi', 'boyi', 'eshik', 'shtanga'].every(k => r.mos.some(x => x.k === k)) && kk(r, 'polka') && r.mosEmas.some(x => x.k === 'polka' && x.modulda === 1), J([r.mos.map(x => x.k), r.mosEmas]));
  }
  const t1 = tan('тумба 600, 4 ящика'), t2 = tan('pastki shkaf 800 3 tortma'), t3 = tan('javon 800x300x1800');
  ok('tumba 600, 4 ящика → SP-K-022 (3 tortma, eni 600 — mos; tortma 4/3 — mos emas)', t1.topildi && t1.frg === 'SP-K-022' && t1.olcham.w === 600 && t1.mosEmas.some(x => x.k === 'tortma' && x.soraldi === 4 && x.modulda === 3), J(t1));
  ok('pastki 800, 3 tortma → SP-K-022 eni 800 (400–900 chegarasida)', t2.topildi && t2.frg === 'SP-K-022' && t2.olcham.w === 800 && !t2.mosEmas.length, J(t2));
  /* egasi #209 (14): teng ballda o'z o'lchami so'ralganga yaqin modul afzal — SP-SH-005 «Ochiq javon» aynan 800x300x1800 (avval kod tartibida SP-SH-001, 900x300x1800) */
  ok('javon 800x300x1800 → SP-SH-005 (hammasi mos, o\'z o\'lchami aynan shu)', t3.topildi && t3.frg === 'SP-SH-005' && !t3.mosEmas.length, J(t3));
  const y = tan('komod 6 tortma');
  ok('komod 6 tortma — katalogda mos modul yo\'q (eng yaqinida 3 tortma) — chizilmaydi', !y.topildi && y.yetishmaydi.some(x => x.k === 'tortma' && x.soraldi === 6 && x.modulda === 3), J(y));
  const ch = tan('pastki shkaf 1000 3 tortma');
  ok('chegara: eni 1000 so\'raldi — SP-K-022 chegarasi 400–900 → 900 (mos emas qatorida)', ch.topildi && ch.frg === 'SP-K-022' && ch.olcham.w === 900
    && ch.mosEmas.some(x => x.k === 'eni' && x.soraldi === 1000 && x.min === 400 && x.max === 900 && x.natija === 900), J(ch));
  ok('natija har safar bir xil', J(tan(EGA)) === J(tan(EGA)));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
