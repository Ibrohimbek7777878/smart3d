# TZ-46 — 600+ Bazis modulini katalogga olish (mustaqil TZ: boshqa AI ham bajara oladi)

**Sana:** 2026-10-22 · **Navbat:** 46 · **Holat:** TAKLIF — egasining "boshla"si va MANBA PAPKA yo'li kutilmoqda (egasi #298; ilgari: TZ-13, #8, #270)
**Maqsad:** egasi bergan 600+ ta Bazis moduli (`.fr3d`) ni mavjud tekshirilgan quvur (`scripts/fr3d_import.py`) bilan Smart3D katalogiga olish, eng ko'p ishlatiladiganlarni tanlash, max/min va nomlarni to'g'rilash. **Kod deyarli yozilmaydi — asosan skript yurgiziladi va natija tekshiriladi** (token tejash uchun shunday).

## 0. Bajaruvchi uchun qoidalar (majburiy, avval o'qing)
- `qoidalar_qatiy_amalqilinsin.md` (loyiha ildizida), `loyiha-tz-lari/13-modullar-kutubxonasi.md`, `41-natija-modul-minmax.md`, `loyiha-tz-lari/42-narx-togriligi-bazis-erp.md` (3-band: kod qoidasi `BZ-`+slug).
- Javoblar o'zbek tilida (lotin). Maxfiy ma'lumot (parol, API kalit, ERP login) repoga, logga, hisobotga YOZILMAYDI. Serverga hech narsa yozilmaydi (egasi qo'lda qo'yadi). `git push` yo'q (koordinator qiladi), `git add -A` yo'q, boshqa chatlar parallel ishlaydi — faqat o'z fayllaringiz (`app/data/fragments-mc*.json`, `app/data/id-links.json`, `scripts/fr3d_*`, testlar). Narx, o'lcham va furnitura birligi O'YLAB TOPILMAYDI (qoida 4.3): noaniq bo'lsa — qoldirib, hisobotga yozing.
- Ishlash tartibi: bo'limlar bo'yicha **partiyalar** (har partiya ~50–100 modul). Partiyadan keyin faqat tez testlar (`node tests/verify_mc.mjs`, `verify_bazis_teshik.mjs`); to'liq `bash tests/run-all.sh`, `server npm test`, `vite build` va UI testlar — faqat **oxirida bir marta**. Skript/test chiqishini to'liq chop etmang: faqat yig'ma son va xatolar (token tejash).

## 1. Kirish (egasi beradi — hozir lokalda YO'Q)
- Papka: 600+ `.fr3d` (taxminan `bazis fayllar oktiyabr`, serverda ~2 933 fayl; egasi tanlab lokalga ko'chiradi). Yo'li: `/home/ibrohim/Desktop/bittada sunpin/Smart3D/data1/modulniy_600/` (gitignored; mavjud `data1/modulniy` — 38 ta, allaqachon `MC-` katalogda — tegilmaydi).
- Mavjud 38 modul + 85 SP modul + 600+ yangi → dublikat (bir xil nom/o'lcham/tarkib) birlashtiriladi.

## 2. Bajariladigan ishlar
1. **Quvur masshtabi:** `scripts/fr3d_import.py` ni yangi papka bilan ishlatish (SRC parametri; mavjud 38 ni buzmaslik; natija deterministik). Parser (`b3d_full_parser.py`, FAQAT o'qish) xato bergan fayllar — ro'yxat bilan o'tkazib yuboriladi, hisobotga yoziladi.
2. **Tanlash:** `41-natija-modul-minmax.md` dagi reyting (oshxona pastki/ustki/penal, shkaf/kupe, krovat, tumba, parta, ofis, hammom...) bo'yicha eng ko'p ishlatiladigan turlar to'liq; qolganlari "katalogda, lekin ko'rinmas" (yashirin) bayroq bilan (admin panel "Modullar katalogi" ko'rsatadi). Yo'q turlar (krovat yon tumbasi, ochiladigan klassik shkaf, yumshoq oyoq, ramkali ko'zgu, shkaf ustiga antresol, ofis hujjat shkafi) manba papkadan qidiriladi, topilsa olinadi.
3. **Max/min:** egasi tasdiqlagan jadval (TZ-41 savollariga javoblari) bo'yicha: jahon standarti + sex haqiqati; ziddiyat — egasi qarori. Standart (Bazis) o'lchamda formula natijasi Bazis bilan AYNAN (±0,6 mm) teng bo'lishi shart (importer qoidasi).
4. **Nomlar:** ru (Bazis nomidan), uz-lotin, uz-kirill (avtomatik), en — mavjud lug'at tuzilmasi (`app/data/nomlar.ru.json`, `nomlar.en.json`); tarjimasi noaniq nomlar hisobotda.
5. **Teshik va furnitura:** parser cheklovi tufayli teshik koordinatasi bo'lmagan modullar belgilanadi (`holes` yo'q) — ularning zapchasti 3D da faqat ro'yxatda ko'rinadi (TZ-38/39). Furnitura kodlari (`BZ-…`) → ERP: faqat bir qiymatli moslik (`app/data/furnitura-boglash.json`); qolganlari narxsiz ro'yxatga (admin panel).
6. **Materiallar:** shisha va mato (M6) — alohida slot, LDSP deb hisoblanmaydi.
7. **Testlar:** `verify_mc.mjs` yangi modullarni qamraydi (soni, max/min mantiqi, Bazis bilan solishtirish, takror kod yo'q, nomlar 4 tilda); yangi katalog hajmi pasaymaydi.

## 3. Tegmaydigan
Tasdiqlangan dizayn, narx formulalari, ustama, server sozlamalari, admin panel kodi. Qo'lda tahrirlangan MC- yozuvlar yo'q (fayl avtomatik hosil bo'ladi — "QO'LDA TAHRIRLAMANG").

## 4. Token tejash tartibi (tavsiya)
- Partiyalarni **Haiku** (mexanik skript yurgizish, yig'ma hisobot) bajaradi; parser/formula xatolari va max/min mantig'i — **Sonnet**. Opus kerak emas.
- Har partiya hisoboti ≤ 15 qator (yangi/o'tkazilgan/xato son, 5 ta eng muhim ogohlantirish).
- To'liq testlar va UI — oxirida bir marta; "load" baland bo'lsa UI testlar yolg'iz yurgiziladi.

## 5. Qabul
- Katalogda 600+ modul (yoki manbadagi hammasi) `MC-` kodlari bilan; takror yo'q; max/min tasdiqlangan jadvalga mos.
- Standart o'lchamda Bazis bilan aynan; 3D da chizilishi (har bo'limdan namuna), narx hisoblanishi (narxsiz furnitura soni hisobotda).
- Barcha eski testlar yashil (run-all, server, UI narx/admin/mebel3d).

## Xavf: O'RTA (katalog hajmi katta, narx hisobiga ta'siri). Orqaga qaytarish: `git revert` (fragments-mc.json yangi fayl bilan almashadi).
