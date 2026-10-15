# TZ-15 — Katalogdan ustki shkafni to'g'ri balandlikka qo'yish

**Sana:** 2026-10-15 · **Navbat:** 15 (shoshilinch — konstruksiyaga to'sqinlik qiladi) · **Holat:** BAJARILDI 2026-10-15 (egasi: "hammasini qilib tugatib ber") · **Ma'lumot kerak emas.**

## Muammo (tekshirilgan)
- **Katalogdan qo'yilgan ustki (osma) shkaf polga tushadi** (z = 0). `addPlacement` balandlikni `frag.default_z` dan oladi, lekin hech bir modulda (83 + 38) bu maydon yo'q.
- **Joy tanlashda ustki shkaf pastki qatorni ham band joy deb hisoblaydi.** Natijada u pastki shkaflar ustiga emas, ularning yoniga qo'yiladi.
- **Mebel kartasida balandlik (Z) maydoni yo'q.** Faqat eni, chuqurligi, bo'yi va X bor — usta shkafni ko'tara olmaydi.
- **AI to'g'ri ishlaydi:** ustki shkaf Z = 1 450 mm (`ai.js`). Katalog bilan AI bir-biriga mos emas.

## Bajariladigan ishlar
1. **Bitta qiymat:** `ai.js` da `USTKI_Z = 1450` eksport qilinadi. AI ham, katalog ham shuni ishlatadi — dublikat yo'q (2.4).
2. **`addPlacement`:** ustki modul — `wall_cabinet`, `wall_corner` yoki `kuxnya-ustki` / `kuxnya-antresol` guruhi — `z = USTKI_Z` bilan qo'yiladi. Bo'sh joy faqat balandligi kesishadigan modullar orasidan qidiriladi: ustki — ustkilar, pastki — pastkilar orasidan.
3. **Mebel kartasi:** "Z (polдан), mm" maydoni. O'zgartirilsa, sahna va narx yangilanadi.
4. **Sinov:** brauzerda pastki va ustki modul qo'yiladi:
   - ustki Z = 1450;
   - X — pastki ustida;
   - Z maydoni o'zgartirilsa, modul ko'tariladi;
   - qolgan testlar yashil.

## Tegadigan fayllar
- `app/js/ai.js` (eksport)
- `app/js/app.js` (`addPlacement`, karta)
- `app/index.html` (Z maydoni)
- `tests/ui/*`

## Xavf, moliya, orqaga qaytarish
- **Xavf: PAST** — faqat katalogdan yangi qo'yilgan modul joyi va karta. AI va mavjud loyihalar o'zgarmaydi.
- **Moliya:** ta'siri yo'q.
- **Orqaga qaytarish:** `git revert`.

## Natija (2026-10-15)
- `USTKI_Z = 1450` endi `ai.js` da bitta joyda. AI'ning uchta joyi ham shu qiymatni ishlatadi.
- `addPlacement`: ustki modul 1450 da turadi; bo'sh joy balandligi kesishadigan modullar orasidan qidiriladi.
- Mebel kartasi: "Z poldan, mm" (kompyuterda 5 ustun, juda tor ekranda 2 ustun).
- **Tekshiruv** (`tests/ui/ustki.mjs`, `run.sh` ga qo'shildi):
  - yangi loyihada KP-02, KP-08, KU-04, KU-07 → pastkilar z=0, ustkilar z=1450, aynan pastkilar ustida (x=0, x=600);
  - kartada Z=1450; 1600 ga o'zgartirildi → modul ko'tarildi;
  - ustma-ust ogohlantirish 0.
- Regressiya: node 9/9, brauzer 10 to'plam yashil; telefonda karta sig'adi.

