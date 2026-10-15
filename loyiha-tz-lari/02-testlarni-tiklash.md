# TZ-02 — Testlarni tiklash va `/tmp` ga bog'liqlikni yo'qotish

**Sana:** 2026-10-15 · **Navbat:** 2 · **Holat:** BAJARILDI (2026-10-15, egasi: "davom et") · **Ma'lumot kerak emas.**

## Muammo (tekshirilgan)
1. **`tests/verify.mjs` [5]** — GibLab `.project` tekshiruvi `/tmp/opencode/giblab_check.py` ga bog'liq ([verify.mjs:214](../tests/verify.mjs#L214)).
   - Kompyuter 2026-10-15 08:36 da qayta yuklanganda `/tmp` tozalandi.
   - Skript repoda yo'q, shuning uchun test shu joyda yiqiladi: `ENOENT`.
2. Test natijalari ham `/tmp/opencode/` ga yoziladi ([verify.mjs:254](../tests/verify.mjs#L254)).
3. **Testlar commit'dan oldin avtomatik ishlamaydi.** Repoda `git remote` yo'q — GitHub CI hozircha mumkin emas.

## Bajariladigan ishlar
1. **GibLab tekshiruvchisi repoga yoziladi** — `tests/giblab_check.mjs`, Node'da, Python shart emas. U `.project` XML faylini qayta o'qiydi va tekshiradi:
   - har detal kartada bormi;
   - kartada ustma-ust tushish yo'qmi;
   - detal varaqdan chiqmaydimi;
   - formatga sig'magan detallar soni `excluded` bilan tengmi.

   Yo'qolgan Python skriptining mantig'i `verify.mjs` dagi talablardan tiklanadi — natija shakli o'sha: "render xato / ustma-ust / joylashtirilmagan".
2. **Barcha vaqtinchalik fayllar** `os.tmpdir()` dagi `fs.mkdtemp` papkasiga yoziladi va test oxirida o'chiriladi. `/tmp/opencode` ga bog'liqlik qolmaydi.
3. **`tests/pre-commit.sh`** — `bash tests/run-all.sh` ni ishga tushiradi. O'rnatish ixtiyoriy: `ln -s ../../tests/pre-commit.sh .git/hooks/pre-commit`. O'rnatish yo'riqnomasi `tests/README` da.
4. Repoda hali `/tmp/opencode` ga ishora qilgan boshqa joylar topiladi va tuzatiladi (`grep`).

## Tegadigan fayllar
- `tests/verify.mjs`
- `tests/giblab_check.mjs` (yangi)
- `tests/pre-commit.sh` (yangi)
- `tests/README` (yangi yoki yangilanadi)

Ilova kodi o'zgarmaydi.

## Xavf, moliya, orqaga qaytarish
- **Xavf: PAST** — faqat testlar.
- **Moliya:** ta'siri yo'q.
- **Orqaga qaytarish:** `git revert`.

## Natija (2026-10-15)
- **`tests/giblab_check.mjs`** — Bittada FMS'dagi `giblab_raskroy.py` (o'qish, qayta kodlash, chizish) Node'da aynan takrorlandi. Ustiga ustma-ust tushish va joylashtirilmagan detal tekshiruvi qo'shildi.
  - Mos Python parser bilan solishtirildi (u faqat o'qildi):
    - kompyuterdagi 7 ta haqiqiy GibLab fayl — **7/7 bir xil natija**;
    - Smart3D'ning 120 modulli fayli (1 346 detal) — **bir xil**.
  - Haqiqiy fayllarda ustma-ust 0 — noto'g'ri xato bermaydi.
- **`verify.mjs`** endi shu tekshiruvchini chaqiradi — fayl yozmaydi, `/tmp` kerak emas.
  - Ataylab buzilgan 3 xil fayl (detal yo'q, o'lcham farq, joylashtirilmagan) — **uchalasi ushlandi**.
- **`qa_*.mjs`**: `/tmp/opencode` o'rniga `tests/ui/out` (gitignore'da). Testlarda `/tmp` ga ishora: 0.
- **`tests/pre-commit.sh`** — repo ichidan ham, tashqaridan ham ishlaydi.
  - Hook **o'rnatilmagan** — egasi xohlasa: `ln -s ../../tests/pre-commit.sh .git/hooks/pre-commit`.
  - Yo'riqnoma: `tests/README.md`.
- **`bash tests/run-all.sh` — 7/7 yashil.**
- 4-banddagi hujjatlardagi `/tmp/opencode` ishoralari — tarixiy yozuvlar, o'zgartirilmadi.

## Qabul
- Kompyuter qayta yuklangandan keyin ham `bash tests/run-all.sh` — 7/7 yashil.
- **Ataylab buzilgan `.project`** (bitta detal o'chirilgan) testda yiqiladi — tekshiruvchi haqiqatan ishlashi isbotlanadi.
