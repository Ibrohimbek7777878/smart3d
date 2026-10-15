# TZ-12 — AI: haqiqiy til modeli va ovoz

**Sana:** 2026-10-15 · **Navbat:** 12 · **Holat:** MA'LUMOT KUTILMOQDA — D13 (API kalitlar), D10 (usta iboralari). **Bog'liq:** TZ-07 (server).

## Muammo (tekshirilgan)
- **AI qoidalarga asoslangan oddiy tahlilchi** (`app/js/ai.js`). 43 ta ibora testidan o'tadi, lekin erkin gapni tushunmaydi.
- **Til modeli (LLM) ulanmagan** (A4).
  - Serverdagi `/api/ai/build` (`index.js`) ham qoidaga asoslangan (`aiBuild`), sayt uni ishlatmaydi.
  - `gemini-pro` faqat ishlamaydigan `server/src/` da, model nomi eskirgan.
- **Ovozni tanish** — brauzerning o'zinikidan. O'zbek tili uchun ishonchsiz (A5).
- **Jurnal yo'q:** "usta nima dedi → AI nima tushundi" (A6).

## Bajariladigan ishlar
1. **Server orqali til modeli:**
   - kalit faqat serverda;
   - provayder sozlanadi (Claude yoki Gemini);
   - javob tuzilgan JSON (xona, modullar) — hozirgi tahlilchi bilan bir xil shaklda.
2. **Ehtiyot rejim:** model javob bermasa yoki xato qilsa — hozirgi qoidali tahlilchi ishlaydi.
3. **Ovoz:** server orqali o'zbekcha nutqni matnga o'girish (Yandex SpeechKit yoki boshqa — egasi tanlaydi).
4. **Jurnal:** so'rov, tushunilgan natija, usta tasdiqladimi. Shaxsiy ma'lumotsiz.
5. **Sinov:** D10 iboralari to'plami. Aniqlik o'lchanadi — hozirgisi bilan solishtiriladi.

## Tegadigan fayllar
- `server/index.js` — proxy
- `app/js/ai.js`, `app/js/app.js`
- testlar

## Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA** — tashqi servis.
  - Kalit commit qilinmaydi.
  - So'rovlar soni cheklanadi.
- **Moliya:** API to'lovi — egasi limit qo'yadi.
- **Orqaga qaytarish:** sozlamada o'chirib qo'yiladi — qoidali tahlilchi qoladi.

## Egasidan kerak
- **D13** — API kalitlar va provayder tanlovi.
- **D10** — 100–200 ta haqiqiy usta iborasi: matn va ovoz.

## Qabul
- D10 to'plamida aniqlik hozirgidan yuqori.
- Model ishlamaganda ham ilova ishlaydi.
