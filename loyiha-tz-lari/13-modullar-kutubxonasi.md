# TZ-13 — Modullar kutubxonasini 600 tagacha kengaytirish

**Sana:** 2026-10-15 · **Navbat:** 13 · **Holat:** MA'LUMOT KUTILMOQDA — D8 (Bazis fayllari). **Bog'liq:** TZ-05, TZ-06.

## Muammo (tekshirilgan)
- **Hozir 121 modul:** 83 umumiy + 38 MebelCity. TZ'dagi maqsad — 600 (M7, D8).
- **MebelCity import yo'li tayyor va sinalgan:** `scripts/fr3d_import.py`. Bazis faylidan formula, slot, zapchast va standart chiqaradi, Bazis bilan solishtiriladi.
- **Kamchiliklar:**
  - fragment muharriri yo'q;
  - nomlar faqat o'zbek lotin (M5: ru / uz / uz-kir / en);
  - shisha va mato kabi materiallar umumiy modullarda LDSP deb hisoblanadi (M6). MebelCity'da tuzatilgan.

## Bajariladigan ishlar
1. **Ommaviy import:** serverdagi Bazis fayllaridan (`/home/user/bazis fayllar oktiyabr/`, ~2 933 ta) bo'limlar bo'yicha tanlanganlari `fr3d_import.py` bilan olinadi.
   - Har partiyadan keyin Bazis bilan solishtirish testi o'tkaziladi.
   - Dublikatlar birlashtiriladi.
2. **Fragment ko'rish sahifasi:**
   - modul ro'yxati, 3D ko'rinish, detallar;
   - formula tekshiruvi min/std/max o'lchamda;
   - import izohlari.

   Tahrirlash — keyingi bosqich.
3. **Nomlar 4 tilda:** ru — Bazis nomidan; uz-kir — avtomatik; en — qo'lda yoki tarjima bilan tasdiqlash.
4. **M6:** umumiy modullardagi shisha va mato — alohida slot.

## Tegadigan fayllar
- `scripts/fr3d_import.py`
- `app/data/fragments-mc.json` (yoki bo'limlar bo'yicha bir nechta fayl)
- yangi `app/fragmentlar.html`
- testlar

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.**
  - Katalog katta bo'ladi — yuklanish tezligi o'lchanadi, kerak bo'lsa bo'lib yuklanadi.
  - Har partiya alohida commit.
- **Moliya:** narx faqat ID orqali (TZ-04).
- **Orqaga qaytarish:** partiya bo'yicha `git revert`.

## Egasidan kerak
- **D8** — Bazis fayllari (serverdan, faqat o'qish) va qaysi bo'limlar birinchi navbatda.

## Qabul
- Har partiyada detallar soni va maydon Bazis bilan mos.
- Katalog telefonda 3 soniyadan tez ochiladi.
