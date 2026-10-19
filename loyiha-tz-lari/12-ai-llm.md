# TZ-12 — AI: haqiqiy til modeli va ovoz

**Sana:** 2026-10-15 · **Navbat:** 12 · **Holat:** BAJARILDI 2026-10-15 (1, 2, 4-bandlar) — real sinov API kalit qo'yilgach; ovoz (3-band) — keyin. **Bog'liq:** TZ-07 (server).

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

## Egasining qarori (2026-10-15)
- **"Hammasini tayyor qilib qo'y, istalgan sun'iy intellektga ulanadigan qil."** 1-band shunday o'zgaradi — provayderga bog'liq bo'lmagan ulanish:
  - **adapterlar:** Claude (Anthropic), Gemini (Google) va OpenAI'ga mos API (OpenAI, DeepSeek, mahalliy Ollama va boshqalar);
  - **sozlama faqat server muhitida:** `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`. Provayder almashtirish = sozlamani o'zgartirish, kod o'zgarmaydi;
  - **bitta umumiy javob shakli** (xona + modullar JSON); javob tekshiriladi, noto'g'ri bo'lsa qoidali tahlilchi ishlaydi;
  - **kalit yo'q bo'lsa** — AI tugmasi hozirgidek qoidali tahlilchi bilan ishlaydi.

## Egasidan kerak
- **D13** — API kalitlar va provayder tanlovi.
- **D10** — 100–200 ta haqiqiy usta iborasi: matn va ovoz.

## Qabul
- D10 to'plamida aniqlik hozirgidan yuqori.
- Model ishlamaganda ham ilova ishlaydi.

## Natija (2026-10-15)
- **`server/ai-llm.js`** — provayderga bog'liq emas. Uch xil ulanish:
  - **Claude** — rasmiy `@anthropic-ai/sdk` (0.131.0, aniq versiya — kamida 2 hafta oldin chiqqan); standart model `claude-sonnet-5-5` (egasi qarori 2026-10-18; avval Opus edi), `effort: low`, tuzilgan JSON (`output_config.format`), rad etishda server tomonidagi zaxira (`fallbacks: "default"`);
  - **Gemini** — REST, `responseMimeType: application/json`;
  - **OpenAI'ga mos** — OpenAI, DeepSeek, Ollama, OpenRouter: `response_format: json_object`.

  Provayder almashtirish = muhit sozlamasi (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`), kod o'zgarmaydi.
- **AI faqat matnni tuzilmaga o'giradi.** Joylashtirishni mavjud dvigatel qiladi — AI geometriya o'ylab topmaydi.
  - Javob qat'iy tekshiriladi: o'lcham 1–20 m, bo'yi 2–6 m, faqat ma'lum mebel turlari, soni 1–50, teshik 300–5000 mm.
  - Yaroqsiz javob — 502, sayt qoidali tahlilchiga qaytadi.
- **Server:**
  - `GET /api/ai/status` — yoqilganmi, provayder, model; kalit ko'rinmaydi;
  - `POST /api/ai/parse` — faqat kirgan usta uchun, 60 so'rov/soat/IP;
  - `ai_log` jurnali (A6): matn, natija, xato.
- **Sayt:** usta kirgan va AI yoqilgan bo'lsa, "Qurish" avval AI'ga so'raydi; bo'lmasa — qoidali tahlilchi. Natijada "manba: AI — provayder:model". O'lcham aytilmasa ham AI tushungan buyurtmalar qabul qilinadi.
- **Testlar** (haqiqiy pullik AI chaqirilmadi — 5.1):
  - `server/test/ai.test.js` — soxta OpenAI'ga mos server bilan butun zanjir: so'rov shakli, kalit, tekshiruv, jurnal; buzuq javob → 502; yaroqsiz qiymatlar tozalanadi; sxema structured outputs talablariga mos;
  - `server/test/ai-anthropic.test.js` — SDK so'rov shakli (model, x-api-key, beta sarlavha, fallbacks, effort, json_schema); rad etish → 502;
  - AI sozlanmagan server: status o'chiq, parse 503;
  - server 29/29, node 9/9; brauzer to'plamlari va `qa_ai` yashil.
- **Qilinmadi:**
  - 3-band (o'zbekcha ovozni server orqali tanish) — provayder tanlanmagan;
  - 5-band (D10 iboralarida aniqlikni o'lchash) — API kalit va iboralar to'plami kerak.

