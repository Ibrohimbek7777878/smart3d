# TZ-40 — Tayyor promptlar AI tilida oldindan saqlansin va AI token sarfi nazoratda bo'lsin

**Sana:** 2026-10-19 · **Navbat:** 40 · **Holat:** BAJARILDI 2026-10-19 12:30 (`main`; agent f1cfabc + model tuzatish 5cbe654; server 129/129). Qoldi: kunlik/oylik chegara sonlarini egasi tanlaydi; productionda `AI_MODEL=claude-sonnet-5-5`. Boshlangan 12:05 (egasi #269: "promptlarni AI tushunadigan tilda yetkazish, token sarfi va API kalit ishlashi o'ylangan holda"; #276 "boshla")
**Asos:** hozir har tayyor so'rov va har matn Claude'ga ketadi (max_tokens 4000, kesh yo'q, tizim ko'rsatmasi har safar, faqat 60 so'rov/soat/IP chegarasi). 57 ta tayyor prompt allaqachon sinalgan.

## Bajariladigan ishlar (server + admin panel; narx/kesim/chizma mantig'i o'zgarmaydi)
1. **Tayyor promptga tayyor tuzilma:** `promptlar_admin` ga `spec_json` (konstruksiya tili tuzilmasi, app/js/engine/konstruksiyaTili.js formatida) va tekshiruv sanasi ustuni. Boshlang'ich 57 prompt uchun tuzilma **bepul** — qoidali tahlilchi bilan hosil qilinib (LLM chaqirilmaydi) saqlanadi va tizim tekshiruvidan (specTekshir) o'tkaziladi. Tayyor prompt matni (normallashtirilgan) kelganda server **Claude'ni chaqirmay** saqlangan tuzilmani qaytaradi: 0 token.
2. **Admin tahrirlasa/yangi qo'shsa:** server tuzilmani bir marta hosil qiladi (avval qoidali; qoldiq "tushunilmadi" bo'lsagina va AI yoqilgan bo'lsa — Claude bir marta), saqlaydi, admin ko'radi va tasdiqlaydi.
3. **Erkin matn:** avval qoidali tahlilchi; Claude faqat qoidali tahlilchi tushunmagan qism qolganda (yoki murakkab matnda) chaqiriladi. **Kesh:** normallashtirilgan matn + til + model + ko'rsatma versiyasi → natija (SQLite `ai_kesh`, muddati 30 kun).
4. **Chaqiruv tejash:** `max_tokens` real javob uzunligiga qarab pasaytirilsin (o'lchab tanlansin, hozir 4000); tizim ko'rsatmasini keshlash (Anthropic prompt caching) — foydasini o'lchab (usage.cache_read_input_tokens), foyda bo'lmasa qo'shilmasin; model Sonnet 5.5 qoladi (egasi qarori).
5. **Sarf nazorati:** jadval `ai_sarf` (sana, foydalanuvchi, kirish/chiqish token, kesh urildimi, manba: tayyor/kesh/qoida/claude). Foydalanuvchiga kunlik chegara, umumiy oylik byudjet (`AI_OYLIK_TOKEN`, sukut chegara). Byudjet tugasa — avtomatik qoidali tahlilchi + foydalanuvchiga tushunarli xabar (3 tilda, xato kodi `S3D-AI-xxx`), sayt to'xtamaydi.
6. **Admin panelda "AI sarfi" kartasi:** bugun/oy so'rovlar soni, token (taxminiy), kesh va tayyor-prompt ulushi, byudjet qoldig'i.
7. Testlar: Claude chaqirilmasdan (mock) — tayyor prompt 0 chaqiruv; kesh urilishi; byudjet tugaganda qoidaga o'tish; sarf yozilishi. Haqiqiy Claude bilan **eng ko'pi 3 ta** qo'lda sinov (token tejash!); kalitni faylga yozmang.

## Tegadigan fayllar
`server/ai-llm.js`, `server/routes/ai.js`, `server/routes/admin-panel.js`, `server/lib/sxema.js`, `scripts/promptlar_seed.mjs`, `app/data/promptlar-matn.json`, `web/src/features/admin/*`, `web/src/features/editor/ai/*` (kerak bo'lsa), lug'atlar, `app/js/xatolar.js`, testlar.

## Xavf: O'RTA (AI yo'li, baza sxemasi — faqat yangi jadval/ustun qo'shiladi). Orqaga qaytarish: `git revert`; yangi ustun/jadval zararsiz.
