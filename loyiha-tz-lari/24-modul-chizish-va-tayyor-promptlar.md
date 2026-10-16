# TZ-24 — O'z modulini chizish (qo'lda konstruktor) va tayyor promptlar kutubxonasi

**Sana:** 2026-10-16 · **Navbat:** 24 · **Holat:** RUXSAT BERILGAN — TZ-23 tugagach boshlanadi (egasi #122: "hozir qaysi TZni qilayapsan va o'shandan keyin boshlab ketaver")
**Asos:** egasi (2026-10-16, SORIZLAR #121): "o'zimiz qo'lda va tayyor promptlar yordamida chizish qismini qo'shmadik, uni ham qo'shib qo'yish kerak".
Savollarga javob (#122):
- qo'lda chizish — **o'z modulini chizish**;
- tayyor promptlar — **kutubxona + shaxsiy shablonlar**;
- **AI'siz ham** ishlashi kerak.

**Bog'liq:** TZ-22 (avtomatik konstruktor, AI'siz), TZ-12 (AI), TZ-14 (sex standartlari), TZ-17 (BPJ), TZ-11 (stanok fayllari), TZ-23 E (material), TZ-06 (teshiklar).

---

## 1. Hozirgi holat (tekshirilgan, 2026-10-16)
- **Modul faqat katalogdan qo'shiladi** (130 ta). O'lchami (eni, chuqurligi, bo'yi) chegara ichida o'zgaradi. Ichki tuzilmani — polka soni, eshik, tortma, bo'lgich — o'zgartirib bo'lmaydi. Yangi modul chizib bo'lmaydi.
- **AI oynasida 3 ta misol bor** (`ai.misol1–3`): bosilsa matn maydoniga tushadi. Matnni AI'siz mahalliy tahlilchi (`app/js/ai.js` → `parseZamer`, uz/ru/en) tushunadi; serverda kalit bo'lsa — LLM ham. Kategoriyalangan kutubxona yo'q. O'z promptini saqlab bo'lmaydi.
- **Avtomatik konstruktor** (TZ-22) AI'siz oshxona chizadi — shablonlar shunga bog'lanadi.
- **Modul formati (fragment):** detallar formulalar bilan (`len`, `width`, joyi — `joy`). Kesim, raskroy, narx, BPJ va 3D shu formatni o'qiydi (TZ-17). Yangi modul shu formatda yaratilsa, hamma joyda o'zi ishlaydi — yangi hisob kodi kerak emas.

## 2. Bajariladigan ishlar

### A. O'z modulini chizish
1. **Boshlash.** Mebel qadamida "+ O'z modulingiz":
   - tur — pastki, ustki, shkaf/penal, tumba, erkin;
   - tashqi o'lcham — eni, chuqurligi, bo'yi;
   - oyoq yoki sokol;
   - material — TZ-23 E dagi qismlar (korpus, polka, fasad, orqa).

   Yoki katalogdagi modul → "Tahrirlash": nusxa olinadi, asl katalog o'zgarmaydi.
2. **Korpus** sex standartlari (TZ-14) bo'yicha:
   - yon devorlar, tub;
   - qopqoq — yaxlit yoki 2 planka;
   - orqa devor — HDF, pazda yoki ustiga.
3. **Ichki bo'lish** (Polyboard va Bazis "Шкаф" usulida). Istalgan bo'lim vertikal yoki gorizontal bo'linadi — teng yoki aniq mm. Har bo'lim tarkibi:
   - **polka:** soni, balandligi teng yoki aniq; ko'chma (polkaderjatel) yoki qotirilgan (konfirmat);
   - **tortma:** soni, balandliklari; napravlyayushiy uzunligi chuqurlikdan;
   - **eshik:** bitta yoki ikkita, chap/o'ng petlya; bir yoki bir nechta bo'lim ustidan;
   - **shtanga** (kiyim ilgich), **ochiq bo'lim**, **oyna eshik**.
4. **Boshqaruv:**
   - 2D old ko'rinishda (chizma) bo'limni bosasiz → tarkib tanlanadi;
   - bo'lgichni sudrab surasiz — 32 mm qadamga yopishadi (System 32);
   - raqam bilan aniq kiritish;
   - 3D da shu zahoti ko'rinadi;
   - telefonda barmoq bilan ham ishlaydi (qoida 6.2).
5. **Qoidalar.** Dunyo standarti asosida; texnolog tasdiqlaydi; sex standartlari sahifasida (TZ-14) o'zgaradi:
   - **System 32:** teshiklar 32 mm qadam bilan, old chetdan 37 mm;
   - **polka eni** (egilmasligi uchun): LDSP 16 — 800 mm gacha, LDSP 18 — 900 mm gacha. Oshsa ogohlantirish va "bo'lgich qo'shing" taklifi;
   - **petlya soni** eshik bo'yiga qarab: ≤ 900 mm — 2, ≤ 1600 — 3, ≤ 2000 — 4, undan katta — 5; chetdan 80–100 mm;
   - **fasad tirqishi** — sex standartidan (hozir 2–3 mm);
   - **napravlyayushiy:** 250–600 mm, 50 mm qadam; korpus chuqurligidan kichik eng yaqini;
   - **cheklovlar:** polkalar orasi kamida 100 mm; petlyali eshik eni 150–600 mm. Oshsa — ogohlantirish;
   - **qalinlik:** polka 16 mm (#120), korpus — loyiha materialidan.
6. **Natija** — modul katalog formatida (fragment):
   - detallar formula bilan (keyin ham cho'ziladi) va joyi (`joy`);
   - kromka: ko'rinadigan old qirra — fasad kromkasi, ko'rinmas qirralar — 0,4 mm;
   - furnitura soni: petlya, napravlyayushiy, polkaderjatel, konfirmat/eksentrik;
   - teshiklar.

   Shu modul uchun narx, kesim, raskroy, BPJ, stanok fayllari va Excel avtomatik chiqadi.
7. **Saqlash:**
   - loyihada (hujjat ichida);
   - xohlasangiz — "Mening modullarim"ga (serverda, foydalanuvchiga). Keyingi loyihalarda katalogda chiqadi.

### B. Tayyor promptlar kutubxonasi
1. **AI oynasida "Tayyor so'rovlar".** Kategoriyalar:
   - oshxona — to'g'ri, L, P, orolli;
   - garderob va shkaf-kupe;
   - yotoqxona, bolalar xonasi;
   - mehmonxona (TV zona);
   - ofis, dahliz, hammom.

   Har promptda: nom, qisqa izoh, kichik sxema. O'zgaradigan raqamlar (xona o'lchami, uzunlik, eshik soni) formada kiritiladi.
2. **AI'siz ishlaydi.** Har prompt avtomatik konstruktor (TZ-22) yoki mahalliy tahlilchi (`parseZamer`) shabloniga bog'langan. AI kaliti bo'lsa, erkin matn qo'shimcha aniqlik beradi. Natija oddiy loyiha bo'ladi va tahrirlanadi.
3. **Shaxsiy shablonlar.** "Shablon sifatida saqlash" — joriy prompt (matn va raqamlar) yoki joriy loyiha (modullar to'plami):
   - serverda, foydalanuvchiga, ko'pi bilan 100 ta;
   - nom berish va o'chirish.
4. **Uch tilda** (uz/ru/en): promptlar ham, oyna ham.

## 3. Tegadigan fayllar
- **Engine:** yangi `app/js/engine/chizish/`:
  - tuzilma → fragment (detallar, joy, kromka, furnitura, teshik);
  - qoidalar va ogohlantirishlar.

  Mavjud `cutlist`, `assembler`, `bpj` o'zgarmaydi. Kerak bo'lib qolsa — alohida izoh bilan.
- **Web:**
  - `web/src/features/editor/chizish/*` — oyna, 2D chizma, bo'lim menyusi;
  - `catalog` — "+ O'z modulingiz", "Tahrirlash", "Mening modullarim";
  - `ai` — kutubxona va shablonlar.
- **Ma'lumot:** `app/data/promptlar.json` — kutubxona, 3 tilda.
- **Server:**
  - `/api/modullarim` va `/api/shablonlar` — foydalanuvchi bo'yicha ro'yxat, saqlash, o'chirish;
  - yangi jadval `user_items`;
  - cheklovlar — `himoya.js` (hajm, chuqurlik, HTML).
- **Testlar:**
  - **node:** tuzilma → detallar o'lchami, polka va petlya soni, kesim (qo'lda hisob bilan teng); BPJ chiqadi. Asosiy tekshiruv: MC-KP-02 ni qo'lda chizsak, detallari katalogdagi bilan bir xil chiqadi;
  - **server:** saqlash va o'chirish; boshqa foydalanuvchi ko'rmaydi;
  - **brauzer:** modul chizish (1440 va 390), prompt → loyiha, shablon saqlash.
- **Tegilmaydi:** narx formulasi, mavjud 130 modul, TZ-20 (pauza).

## 4. Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA–YUQORI.** Qo'lda chizilgan modul ishlab chiqarishga ketadi — o'lcham xatosi buzilgan detal degani. Kamaytirish:
  - qoidalar tekshiruvi;
  - "katalogdagi modulni qo'lda chizish = aynan shu modul" testi;
  - fayllarda "qo'lda chizilgan" belgisi — texnolog ko'rib chiqadi.
- **Moliya:** narx formulasi o'zgarmaydi. Furnitura narxi ERP'dan, bo'lmasa — "narx yo'q" (qoida 4.3).
- **Orqaga qaytarish:** A va B alohida commit; `git revert`.

## 5. Egasidan kerak (javob bo'lmasa — tavsiya olinadi)
1. **"Mening modullarim"** faqat o'zi uchunmi, yoki admin ularni hammaga (sex katalogiga) chiqara oladimi? *Tavsiya:* o'zi uchun; admin uchun — "Sex katalogiga qo'shish" tugmasi.
2. **Yangi oyna ko'rinishi** (qoida 3.3) — dizayn uslubida namuna, siz skrinshot bilan tasdiqlaysiz.
3. **Texnolog:** qoidalar raqamlari — polka eni, petlya soni, tirqish, napravlyayushiy.
4. **Tayyor promptlar ro'yxati** — 2-B dagi kategoriyalar yetadimi?

## 6. Qabul
- Bo'sh korpusdan modul chiziladi: bo'lish, polka, tortma, eshik, shtanga. 2D va 3D birga yangilanadi, telefonda ham ishlaydi.
- Chizilgan modul narx, kesim, raskroy, BPJ va Excel'da to'g'ri. Katalogdagi modulni qo'lda chizsak, detallari aynan bir xil.
- Qoidaga zid holat (polka juda keng, eshik juda tor) ogohlantiriladi.
- Tayyor prompt bosilsa AI'siz loyiha chiziladi. Shaxsiy shablon saqlanadi va keyingi safar ishlaydi.
- 3 tilda; 390 va 1440 da toshish yo'q; barcha testlar yashil.

## 7. Muddat (taxmin)
- **A:** 4–5 ish kuni.
- **B:** 2 ish kuni.

Bu taxmin, aniq hisob emas.
