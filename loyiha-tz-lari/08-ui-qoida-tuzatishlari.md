# TZ-08 — Ekrandagi qoida buzilishlarini tuzatish (logo, oyna, burish)

**Sana:** 2026-10-15 · **Navbat:** 8 · **Holat:** QISMAN — 2-qism (tasdiq oynasi) va 3-qism (burish) BAJARILDI 2026-10-15; 1-qism (logo) — fayl kutilmoqda · **Bog'liq:** logo fayli egasidan.

## Muammo (tekshirilgan)
1. **Bittada logosi chiqadigan hujjatlarda yo'q** (qoida 6.3, S4):
   - Excel — `xlsxexport.js` da logo yo'q;
   - chop etiladigan hisobotda faqat "Smart3D" matni ([app.js:1011](../app/js/app.js#L1011));
   - 1080p rasmda faqat "BITTADA SMART3D" yozuvi ([photo-render.js:84](../app/js/engine/photo-render.js#L84)).

   Repoda logo fayli yo'q.
2. **Brauzerning oddiy `confirm()` oynasi** 2 joyda ishlatilgan:
   - "AI yangi konstruksiya quradi" ([app.js:744](../app/js/app.js#L744));
   - "Joriy loyiha o'chiriladi" ([app.js:1263](../app/js/app.js#L1263)).
3. **Modulni barmoq yoki sichqoncha bilan burib bo'lmaydi** — faqat "⟳ 90°" tugmasi bor (qoida 6.2).

## Bajariladigan ishlar
1. **Logo:**
   - fayl `app/icons/bittada-logo.svg` (yoki `.png`) ga qo'yiladi;
   - hisobotda — sahifa boshi va oxirida;
   - Excel'da — 1-varaq tepasida;
   - 1080p va 360° rasmda — burchakda;
   - usta (sex) logosi — kichikroq, sozlamada bo'lsa.
2. **O'z tasdiq oynamiz** — matn, `[Bekor]`, `[Tasdiqlash]`; Esc va tashqariga bosish = bekor. Ikkala `confirm()` shu oyna bilan almashtiriladi.
3. **Burish ishorasi:**
   - tanlangan modul ustida aylana dastagi chiqadi; sudrab buriladi, 15° qadam, Shift bosilsa — erkin;
   - telefonda — ikki barmoq bilan aylantirish;
   - "⟳ 90°" tugmasi zaxira bo'lib qoladi.

## Tegadigan fayllar
- `app/js/app.js`, `app/js/items.js`, `app/js/controls.js`
- `app/index.html`, `app/css/app.css`
- `app/js/engine/xlsxexport.js`, `app/js/engine/photo-render.js`
- `app/icons/*`, `app/sw.js` (kesh ro'yxati)
- testlar: `tests/ui/modals.mjs`, yangi burish testi

## Xavf, moliya, orqaga qaytarish
- **Xavf: PAST–O'RTA.** Burish ishorasi sudrash va kamera boshqaruviga xalaqit bermasligi kerak — touch va matritsa testlari bilan tekshiriladi.
- **Moliya:** ta'siri yo'q.
- **Orqaga qaytarish:** 3 qism — 3 commit, `git revert`.

## Natija
- **2-qism (2026-10-15):** `askConfirm()` — o'z oynamiz (`#askModal`, mavjud `modal-back` uslubida).
  - Matn, `[Tasdiqlash]` (AI: "Almashtirish", yangi loyiha: "Yangi loyiha") va `[Bekor]`; Esc yoki fonga bosish — bekor.
  - Ikkala `confirm()` almashtirildi, brauzer oynasiga zaxira ham yo'q.
  - Tekshiruv (`tests/ui/modals.mjs`, telefon 360):
    - oyna sig'adi (336×144);
    - Esc → mebel qoldi (5);
    - Tasdiqlash → 0;
    - brauzerning oddiy oynasi 0 marta.
  - `tests/qa_ai.mjs` yangi oynani bosadigan qilindi — 3 ta AI qurilishi o'tdi.
  - Regressiya yashil.

- **3-qism (2026-10-15):** burish dastagi (`items.js`, CSS2D).
  - Tanlangan mebelning old tomonida (xona ichida) ⟳ dastak: 44 px, ekranda doim bir xil o'lcham.
  - Sudralganda mebel **markazi atrofida** buriladi: 15° qadam, Shift bosilsa — erkin.
  - Qo'yib yuborilganda sahna qayta quriladi (stoleshnitsa va boshqa hosila elementlar moslashadi).
  - Faqat 2D'da; 3D'da yashirin. "⟳ 90°" tugmasi zaxira bo'lib qoldi.
  - **TZ'dan farq:** ikki barmoqli burish qilinmadi — u xaritani kattalashtirish (pinch-zoom) bilan to'qnashadi. O'rniga dastakni bitta barmoq bilan sudrash ishlaydi.
  - Dastlab dastak orqa (devor) tomonda edi — kompyuterda ekrandan chiqib qolardi. Old tomonga o'tkazildi.
  - **Tekshiruv** (`tests/ui/burish.mjs`, `run.sh` ga qo'shildi): kompyuterda sichqoncha bilan va telefonda barmoq bilan —
    - 0° → 90°;
    - markaz joyida (≤ 2 mm);
    - kamera surilmadi;
    - 3D'da dastak yashirin;
    - JS xatosi 0.
  - Regressiya: 8 brauzer to'plami va 8 node to'plami yashil.
  - Ma'lum: matritsa testi birinchi qurilmada (android-360) ba'zan "small=28" beradi — qayta ishga tushirilganda 0 (sovuq start beqarorligi, oldin ham bo'lgan).

## Egasidan kerak
- **Bittada logo fayli** — SVG yoki shaffof PNG; qorong'i va yorug' fon uchun variantlari bo'lsa yaxshi.

## Qabul
- Hisobot, Excel va rasmlarda logo bor.
- Brauzerning oddiy oynasi 0 ta.
- Modul barmoq va sichqoncha bilan buriladi.
- 7 qurilmada testlar yashil.
