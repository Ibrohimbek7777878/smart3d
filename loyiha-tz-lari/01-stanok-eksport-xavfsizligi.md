# TZ-01 — Stanok eksportlari: noto'g'ri faylni yashirish

**Sana:** 2026-10-15 · **Navbat:** 1 · **Holat:** BAJARILDI (2026-10-15, egasi: "davom et") — BPJ bandi bundan mustasno, egasining javobi kutilmoqda · **Ma'lumot kerak emas.**

## Muammo (tekshirilgan)
1. **Biesse (.cix) va Homag (.mpr)** — loyiha emas. Har doim 1200×600 mm o'lchamli "Sample_Panel" namunasi chiqadi ([cnc.js:761](../app/js/engine/cnc.js#L761)), ekranda esa "Biesse CIX dasturi tayyor" deb yoziladi ([app.js:1178](../app/js/app.js#L1178), [app.js:1181](../app/js/app.js#L1181)). Stanokka berilsa, noto'g'ri detal kesiladi.
2. **Bazis (BPJ)** eksport tugmasi bor. Qoida S5 bo'yicha esa Bazis eksporti pauzada.
3. **Qolgan stanok fayllari** (DXF, NC, G-code, PTP, Altendorf) sexda sinalmagan.
   - Umumiy ogohlantirish faqat "Export tekshiruvi" blokida bor ([app.js:381](../app/js/app.js#L381)).
   - Tugmalarning o'zida va yuklangandagi xabarda ogohlantirish yo'q.
4. **[DIZAYN-Smart3D.md](../DIZAYN-Smart3D.md)** Biesse va Homag'ni tayyor imkoniyat deb ko'rsatadi; ro'yxatda smeta CSV tushib qolgan.

## Bajariladigan ishlar
1. **Biesse va Homag tugmalari ekrandan yashiriladi** (qoida 2.7 — kod o'chirilmaydi). Ular TZ-11 dagi haqiqiy post-protsessor bilan qaytadi.
2. **BPJ tugmasi yashiriladi** (S5) — egasi tasdiqlasa.
3. **DXF, NC, G-code, PTP, Altendorf:**
   - tugmada kichik `SINOV` belgisi;
   - yuklangandagi xabar: "… tayyor — SINOV, sexda tekshirilmagan".
4. **"Export tekshiruvi" ogohlantirishi** ro'yxatidan Biesse va Homag olib tashlanadi.
5. **DIZAYN-Smart3D.md** tuzatiladi:
   - Biesse va Homag faqat "keyingi bosqich" deb qoladi (1, 3, 6.6, 9.8-bo'limlar);
   - tushib qolgan smeta CSV qo'shiladi — jami soni **17 bo'lib qoladi** (TZ yozilganda "17 → 15" deb noto'g'ri hisoblangan edi).

## Tegadigan fayllar
- `app/index.html` — tugmalar.
- `app/js/app.js` — xabarlar, tekshiruv bloki.
- `DIZAYN-Smart3D.md`.
- Testlar: `tests/ui/*` eksport tugmalari soniga tayanadimi — tekshiriladi. Hozir `exCix/exMpr/exBpj` hech bir testda yo'q.

## Xavf, moliya, orqaga qaytarish
- **Xavf: PAST.** Faqat ekran va hujjat. Hisob va eksport kodi o'zgarmaydi.
- **Moliya:** ta'siri yo'q.
- **Orqaga qaytarish:** alohida commit, `git revert`.

## Natija (2026-10-15)
- Biesse va Homag tugmalari yashirildi (`hidden`, kod qoldi).
- 5 ta tugmada `SINOV` belgisi; yuklangandagi xabar: "… — SINOV: sexda tekshirilmagan".
- "Export tekshiruvi"dan Biesse va Homag olib tashlandi.
- DIZAYN-Smart3D.md tuzatildi.
- **Tekshiruv:** yangi `tests/ui/eksport.mjs` (telefon 390 va kompyuter 1366):
  - Biesse/Homag ko'rinmaydi;
  - SINOV belgisi 5 ta;
  - DXF yuklanganda ogohlantirish chiqadi;
  - gorizontal aylantirish yo'q;
  - JS xatosi 0.
  - Brauzer to'plamlari (7 qurilma) va node testlari yashil. Bundan mustasno: `verify.mjs` [5] — TZ-02 dagi eski sabab, bu o'zgarishga bog'liq emas.
- **BPJ tugmasi o'zgartirilmadi** — egasining javobi kutilmoqda.

## Egasidan kerak
- **BPJ (Bazis) tugmasi** yashirilsinmi (S5 — tavsiya), yoki qoidadan istisno qilinsinmi?

## Qabul
- 7 qurilmada Biesse va Homag tugmalari ko'rinmaydi.
- Qolgan stanok tugmalarida `SINOV` belgisi bor.
- Dizayn hujjatidagi formatlar ro'yxati ilova bilan bir xil.
- Regressiya yashil.
