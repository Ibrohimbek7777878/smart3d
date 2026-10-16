# TZ-26 — AI konstruksiya: usta matni → Claude → tizim tili → ideal chizma

**Sana:** 2026-10-17 · **Navbat:** 26 · **Holat:** BAJARILDI 2026-10-17 (`dizayn` 309e2ba; egasi #134: "roziman, TZ yoz va boshlayver … boshlab tugatib qo'y")
**Kutilmoqda:** admin — Claude kaliti serverga (`server/DEPLOY.md`, "AI — Claude'ni ulash"). Kalitgacha AI'siz tahlilchi ishlaydi.
**Asos (#134):** "to'liq konstruksiyani AI qila olsin; tizimga Claude'ni ulab qo'y vaqtinchalik — u ustaning yozgan promptini olsin va chizadigan AI tushunadigan tilda yozib o'tkazsin; u ortiqcha qiyinchiliksiz to'g'irlab, konstruksiyani ideal qilib chizib bersin".
**Bog'liq:** TZ-12 (server AI), TZ-24 A (modul chizish dvigateli), TZ-25 (matn qatori), TZ-22 (oshxona konstruktori).

---

## Natija (2026-10-17)
- **Ishlaydi:** ish joyidagi matn qatoriga (yoki AI oynasidagi "Qurish") bitta mebel yozilsa — joriy xonaga modul chiziladi, "Modul chizish" paneli ochiladi (o'zgartirish mumkin), panelda izoh kartasi: kim tushundi (AI / AI'siz), xulosa (bo'lim, polka, tortma, shtanga, eshik), tizim nimani to'g'riladi, nima tushunilmadi. Xona yoki oshxona matni — avvalgidek.
- **Misollar (sinovdan):**
  - "shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik" → 2 bo'lim: chapda shtanga + eshik (petlya chapda), o'ngda 4 polka + eshik (petlya o'ngda), narx 3 581 288 so'm (hozirgi narx bazasida);
  - "pastki shkaf 800, 3 tortma" → tumba, 3 tortma, eshiksiz;
  - "тумба 600, 4 ящика", "шкаф 1800х600х2400, слева штанга, посередине 5 полок, справа 3 ящика и 2 полки" (o'ngda: pastda tortmalar, tepada polkalar);
  - "wardrobe 1500 wide 2200 high, left hanging rail, right 5 shelves, 3 doors" (keng bitta eshik → 2);
  - "javon 1600x300x1800 5 polka" → polka 1568 mm egiladi — tizim 2 bo'limga bo'ldi.
- **Claude:** kod tayyor va soxta Claude bilan sinalgan (tuzilgan JSON, sxema, effort medium). Ulash uchun admin kalitni serverga yozadi — yo'riqnoma `server/DEPLOY.md`. AI javobi serverda va saytda bir xil qoida bilan tekshiriladi; noto'g'ri javob rad etiladi (502) va sayt AI'siz tahlilchiga qaytadi.
- **Testlar:** `verify_konstruksiya` (24), server `ai-konstruksiya` (4), `web_konstruksiya`; node, server (71) va 25 web to'plam — yashil.
- **Chegara:** AI'siz tahlilchi oddiy jumlalarni tushunadi (tur, o'lcham, chap/o'rta/o'ng bo'limlar, N bo'lim, polka, tortma, shtanga, eshik soni, sokol/oyoq). Murakkab gaplar ("antresol", "burchak shkaf", "kupe eshik") — Claude ulangach.

## 1. Hozirgi holat (tekshirilgan, 2026-10-17)
- Server AI (`server/ai-llm.js`): Claude, Gemini yoki OpenAI'ga mos API. Kalit faqat serverda (`AI_PROVIDER`, `AI_API_KEY`), hozir **ulanmagan**.
  - Faqat xona va oshxona so'rovini tushunadi: o'lcham, shakl, modul soni.
- Modul chizish dvigateli (`app/js/engine/chizish.js`, TZ-24 A): chizmadan sex qoidalari bilan detallar, birikmalar, furnitura va 3D chiqaradi.
  - Chizma qo'lda chiziladi; matndan chizma qilinmaydi.

## 2. Yechim — ikki bosqich
1. **Usta matni → konstruksiya tili** (bir xil JSON):
   - modul turi (shkaf, pastki, ustki, tumba, erkin), o'lchami;
   - tag (sokol, oyoq), qopqoq;
   - chapdan o'ngga bo'limlar: eni, eshik soni va petlya tomoni, polka, tortma, shtanga;
   - kerak bo'lsa — pastdan yuqoriga qatlamlar.

   Kim tarjima qiladi:
   - **Claude** (serverda kalit bo'lsa) — o'zbek, rus, ingliz, aralash, og'zaki matnni tushunadi;
   - **AI'siz tahlilchi** (kalit yo'q bo'lsa yoki AI javob bermasa) — oddiy jumlalarni qoidalar bilan tushunadi.

   Ikkalasi bir xil tilga yozadi.
2. **Konstruksiya tili → ideal chizma (tizim).** Tizim tekshiradi va to'g'rilaydi:
   - o'lchamlarni tur chegarasiga keltiradi;
   - eni 600 mm dan katta bir eshikli bo'limga 2 eshik qo'yadi;
   - eni 1200 mm dan katta bo'limni teng bo'limlarga bo'ladi;
   - polka eni 800 mm dan oshsa, vertikal bo'lgich qo'yadi;
   - polkalar orasi 150 mm dan kam bo'lsa, polka sonini kamaytiradi.

   Keyin TZ-24 dvigateli sex qoidalari bilan chizadi: detallar, birikma va teshiklar, furnitura, narx, kesim, stanok fayllari. Har to'g'rilash ustaga izoh bilan ko'rsatiladi.
   - AI raqam yoki narx o'ylab topmaydi: aytilmagan o'lcham — turning standarti, narx — tizimdan.

## 3. Bajariladigan ishlar
1. **Dvigatel** — `app/js/engine/konstruksiyaTili.js` (server va brauzerga umumiy):
   - til ta'rifi;
   - `konstruksiyami` — matn modulmi yoki xona;
   - `matndanSpec` — AI'siz tahlilchi;
   - `specTekshir` — tekshirish va to'g'rilash;
   - `specdanChizma` — chizmaga aylantirish.
2. **Server:**
   - `POST /api/ai/konstruksiya` — kirgan foydalanuvchi uchun, AI limiti bilan;
   - provayder kodi umumiylashtiriladi (`ai-llm.js`) — Claude, Gemini, OpenAI;
   - javob sxemasi qat'iy, server `specTekshir` bilan tekshiradi;
   - har so'rov `ai_log`ga yoziladi;
   - xato kodlari: S3D-AI-001 (ulanmagan), S3D-AI-002 (javob yo'q).
3. **Sayt:**
   - matn qatori va AI oynasidagi "Qurish": matn modul bo'lsa — konstruksiya, xona bo'lsa — avvalgidek oshxona;
   - natija — modul xonaga qo'yiladi va "Modul chizish" paneli ochiladi, usta o'zgartira oladi;
   - xabar: kim tushundi (AI yoki AI'siz), nima to'g'rilandi, nima tushunilmadi.
4. **"Claude'ni ulash" (vaqtinchalik):**
   - kod tayyor; kalit serverga admin tomonidan yoziladi: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=…`, ixtiyoriy `AI_MODEL`;
   - yo'riqnoma `server/DEPLOY.md`da;
   - kalit kodga va gitga yozilmaydi (qoida 1.9).
5. **Testlar:**
   - dvigatel — uch tildagi jumlalar, to'g'rilashlar, chizmadan detal va narx;
   - server — AI ulanmagan, soxta provayder (mahalliy OpenAI'ga mos server) bilan to'liq yo'l, noto'g'ri javob;
   - brauzer — matn qatoridan shkaf va pastki modul, panel, narx.

## 4. Tegadigan fayllar
- `app/js/engine/konstruksiyaTili.js` (yangi).
- `server/ai-llm.js`, `server/index.js`, `server/DEPLOY.md`, `server/test/`.
- `web/src/features/editor/ai/konstruksiya.js` (yangi), `ai/actions.js`, `ishjoyi/MatnQatori.jsx`.
- Lug'atlar (uz, ru, en).
- `tests/verify_konstruksiya.mjs`, `tests/ui/web_konstruksiya.mjs` (yangi).
- **Tegilmaydi:** chizish dvigatelining qoidalari, narx, kesim, stanok fayllari, oshxona konstruktori.

## 5. Xavf, moliya, orqaga qaytarish
- **Xavf: O'RTA.**
  - AI noto'g'ri tushunishi mumkin. Kamaytirish: qat'iy sxema, server tekshiruvi, tizim to'g'rilashi, natija panelda tahrirlanadi, hech narsa avtomatik buyurtma qilinmaydi.
  - AI'siz ham ishlaydi.
- **Moliya:**
  - narx faqat tizim hisobidan — AI narx bermaydi;
  - Claude so'rovi pullik: kalit egasining hisobidan, so'rov limiti bor (AI limiti — mavjud);
  - kalit qo'yilmaguncha xarajat yo'q.
- **Orqaga qaytarish:** `git revert`. Kalit olib tashlansa — AI'siz tahlilchi ishlaydi.

## 6. Qabul
- "shkaf 1200×600×2200, chapda shtanga, o'ngda 4 polka, 2 eshik" → shkaf: 2 bo'lim, chapda shtanga, o'ngda 4 polka; detallar, narx, 3D.
- "pastki shkaf 800, 3 tortma" → tumba, 3 tortma.
- Ruscha va inglizcha jumla ham tushuniladi.
- Kalitsiz (AI'siz) va soxta AI provayder bilan ishlaydi; noto'g'ri AI javobi rad etiladi.
- Barcha testlar yashil.
