# QOIDALAR — QAT'IY AMAL QILINSIN

Muallif: loyiha egasi · Holat: 2026-10-15

Har bir AI (Claude, OpenCode, Antigravity va boshqalar) ishni boshlashdan oldin shu faylni to'liq o'qiydi va unga qat'iy amal qiladi.

- **1-qism** — umumiy qoidalar, barcha AI va har qanday loyiha uchun (egasining matni, so'zma-so'z).
- **2-qism** — faqat Smart3D loyihasiga tegishli qoidalar.
- **3-qism** — skillardan foydalanish.

Ziddiyat bo'lsa — 1-qism ustun (0.1).

---

# 1-QISM. AI YORDAMCHI (CLAUDE, OPENCODE VA BOSHQALAR) UCHUN UMUMIY ISH QOIDALARI

Muallif: loyiha egasi · Holat: 2026-10-14
Bu qoidalar har qanday loyihaga tegishli. Loyihaning texnik qoidalari alohida hujjatda bo'ladi.

## 0. USTUVORLIK VA MULOQOT

- **0.1.** Shu qoidalar har qanday skill, shablon yoki tayyor ko'rsatmadan USTUN.
- **0.2.** Muloqot o'zbek tilida. Javob qisqa: natija (havola, raqam, ha/yo'q) birinchi qatorda.
  "Nima qildim, qanday tekshirdim" kabi tafsilot faqat so'ralsa yoziladi.
- **0.3.** Ko'p bosqichli ishdan keyin ham yakuniy xabar qisqa — faqat eng muhimi.

## 1. AVVAL TZ, KEYIN RUXSAT, KEYIN KOD

- **1.1.** Har qanday vazifada AVVAL TZ (texnik topshiriq) yoziladi va menga ko'rsatiladi.
  Kod faqat men "boshla", "tasdiqlayman" yoki "ruxsat" deganimdan keyin yoziladi.
- **1.2.** TZ ichida HAR DOIM:
  - a) qaysi fayllarga va bog'langan joylarga tegiladi;
  - b) xavf darajasi — PAST / O'RTA / YUQORI va nega;
  - c) pul/moliya qismiga zarar yetmasligi alohida tasdiqlanadi.
- **1.3.** Ikki bosqich: (1) men vazifani tushuntiraman; (2) sen tahlil, g'oya, yechim va vazifalar
  ro'yxatini berib RUXSAT so'raysan. Ruxsatsiz birorta qator kod yo'q.
- **1.4.** Bitta YAXLIT, to'liq TZ yoziladi (hamma bosqichlar, xavf, orqaga qaytarish — bitta hujjatda).
  Ishni bo'laklab, ruxsatsiz faza-faza bajarish taqiqlangan.
- **1.5.** "TZ yoz" — faqat TZ yozish degani. Oldingi ishda "boshla" deyilgan bo'lsa ham, TZ'dan
  kodga o'zboshimcha o'tilmaydi.
- **1.6.** Savol bo'lsa — TZ'dan oldin so'raladi.
- **1.7.** Sof tadqiqot yoki o'rganish so'ralsa — fayl ham, TZ ham yozilmaydi, natija chatda beriladi.
- **1.8.** TZ yangilansa — eski TZ o'chiriladi yoki "BAJARILDI / ALMASHTIRILDI" deb belgilanadi.
  Bir-biriga zid ikkita TZ qolmasin.
- **1.9.** Har bir TZ bajarilib, tekshirilgach — git commit. Push faqat men so'raganimda. Asosiy
  tarmoqqa o'zboshimcha o'tilmaydi. Maxfiy fayllar (.env, kalitlar, parollar, shaxsiy hujjatlar)
  commit qilinmaydi.

## 2. FAQAT SO'RALGAN JOY — BOSHQASIGA ZARAR YO'Q

- **2.1.** Faqat SO'RALGAN joy o'zgartiriladi. Yo'l-yo'lakay "yaxshilash", refaktor, boshqa faylni
  "ehtiyot uchun" o'zgartirish taqiqlangan.
- **2.2.** Eski va unga bog'langan fayllarga shikast yetkazilmaydi.
- **2.3.** Har o'zgarishda 5 qadam:
  1) o'zgarayotgan narsa yana QAYERDA ishlatilishini qidirib topish (faqat ochiq faylda emas);
  2) ma'lumot o'zgarsa — uni kim o'qishini aniqlash;
  3) bo'sh turgan maydonni "to'ldirish"dan oldin to'xtash — u ataylab bo'sh bo'lishi mumkin;
  4) ishdan keyin bog'liq joylarni ham qayta sinash, faqat o'zgargan joyni emas;
  5) yon ta'sir topilsa — darhol aytish, yashirmaslik.
- **2.4.** Yangi narsa qurishdan oldin: shunga o'xshash narsa allaqachon bormi — tekshiriladi.
  Dublikat qurilmaydi; mavjudi kengaytiriladi.
- **2.5.** Noaniqlik bo'lsa — o'zgartirishdan OLDIN aytiladi va so'raladi. Taxmin bilan ishlanmaydi.
- **2.6.** Tekshiruv/audit so'ralsa — natija HISOBOT. Avtomatik tuzatish yo'q.
- **2.7.** "Olib tashla" yoki "o'chir" (ekrandagi blok/karta haqida) — faqat ekranda YASHIRISH.
  Orqadagi hisob-kitob o'chirilmaydi. "Butunlay o'chir" deyilsagina o'chiriladi.
- **2.8.** Kelishilgan har bir o'zgarish — doimiy qoida, vaqtinchalik yamoq emas. Keyingi ishlarda u
  buzilmaydi va hamma tegishli joyda ishlaydi.
- **2.9.** Pauzaga qo'yilgan ish o'zboshimcha boshlanmaydi.
- **2.10.** Boshqa tizim yoki serverdan ma'lumot olinganda — faqat O'QISH. Hech narsa yozilmaydi,
  o'zgartirilmaydi, buzilmaydi.

## 3. ISHLASH USLUBI

- **3.1.** ORQA FONDA ISHLASH TAQIQLANGAN. Fon agentlari va fon vazifalari ishlatilmaydi — hamma ish
  old fonda, men ko'rib turgan holda. Parallel agentlar faqat men aniq ruxsat bersam.
- **3.2.** Uzoq ishda oraliq holat qisqa xabarlar bilan aytib boriladi.
- **3.3.** Vizual dizaynda o'zing yasagan variantlardan tanlatish yetarli emas — avval mendan aniq
  namuna (sayt, skrinshot) so'raladi.

## 4. HAQIQAT VA DALIL

- **4.1.** Xato topilganda — avval to'liq tekshiriladi, sabab dalil bilan (log, natija, farq)
  tasdiqlanadi, keyin xulosa aytiladi. Taxmin emas.
- **4.2.** "Avtomatik ishlamayapti / yangilanmayapti" kabi xatoda — avval ma'lumot manbai va
  avtomatik zanjir (jadval, cron, tashqi servis) tekshiriladi, keyin kod gumon qilinadi.
- **4.3.** Narx, raqam yoki ma'lumot O'YLAB TOPILMAYDI. Yo'q bo'lsa — "yo'q" deb ko'rsatiladi.
- **4.4.** O'zimizning ma'lumot — asosiy manba. Tashqi tizimdan ko'chirilgan nusxa faqat zaxira.

## 5. PUL VA XAVFSIZLIK

- **5.1.** Haqiqiy pul harakati qiladigan amal (to'lov, yechish, kirim) HECH QACHON "sinov" uchun
  ishga tushirilmaydi. Sinov — faqat o'qish. Sinash shart bo'lsa — avval aniq ruxsat.
- **5.2.** Jonli (production) tizimda og'ir testlar ketma-ket tez yoki parallel ishga tushirilmaydi.
- **5.3.** Server/servisni o'zing qayta ishga tushirmaysan (restart/reload/deploy). Kod yozib,
  tekshirib, javob berib to'xtaysan; men "restart qil" desamgina bajarasan.
- **5.4.** Har qanday deploy/restart OLDIDAN sintaksis va konfiguratsiya tekshiruvi qilinadi.
- **5.5.** Umumiy infratuzilma sozlamalari (systemd, nginx, server konfiguratsiyasi) tahrirlanmaydi —
  bitta serverda bir nechta agent ishlaydi.

## 6. INTERFEYS (UI)

- ~~6.1~~ — olib tashlandi (egasi, 2026-10-15: eski saytdan qolgan). Smart3D faqat tasdiqlangan dizayndagi
  qorong'i rejimda; yorug' rejim qo'shilmaydi.
- **6.2.** 3D yoki vizual muharrirda obyekt sichqoncha/barmoq ishorasi bilan boshqariladi
  (sudrash, burish, kattalashtirish). Tugmalar — faqat zaxira.
- **6.3.** Kompaniya logosi har bir chiqariladigan hujjatda (ekran, chop etish, PDF) turadi.

---

# 2-QISM. SMART3D LOYIHASI QOIDALARI

Manba: `QOIDALAR-Bittada-2026-10-14.txt` (qavsda eski raqami). Bittada ERP'ga tegishli va 1-qismda takrorlangan qoidalar olib tashlangan.

- **S1** (7.7). Telefon: bazada 998XXXXXXXXX, ekranda +998 XX XXX XX XX; dublikat oxirgi 9 raqam bo'yicha
  bloklanadi.
- **S2** (7.8). Raqamlar (quantity, stock) butun son — Math.ceil().
- **S3** (7.9). Xizmatlar avtomatik qo'shilmaydi — foydalanuvchi o'zi tanlaydi.
- **S4** (8.5). Shartnomada (ekran, chop etish, PDF, har bet) Bittada logosi DOIM turadi; usta logosi ham bor,
  lekin kichikroq. Dizayn o'zgarsa ham olib tashlanmaydi.
- **S5** (9.1). SketchUp / .b3d eksport — PAUZA, boshlanmaydi. Shu mavzuda so'rov kelsa eslatiladi.
  Bazis BPJ — pauzadan chiqarildi (egasi, 2026-10-15: "bpj ni davom ettir"), TZ-17 bo'yicha.
- **S6** (9.2). "3D xona / modullar" (ModuleCatalog) — haqiqiy zamer tizimi. Zamer/mebel joylash bo'yicha yangi
  dublikat tizim qurilmaydi, shu tizimga qo'shiladi.
- **S7** (9.8). <ichki-host-kroy> / <ichki-host-tunel> — faqat o'qish. <ichki-host-kod> — hozircha kirilmaydi.
- **S8** (6.5). Testlar o'z nomli test bazasi bilan ishlaydi.

---

# 3-QISM. SKILLAR

- **K1.** Har vazifada barcha skillar ko'rib chiqiladi; berilgan vazifaga mos kelganlari tartib bilan ishlatiladi.
- **K2.** Alohida agent yoki orqa fonda ishlaydigan skillar (`code-review`, `deep-research`, `workflow`, `loop`, `schedule` va shunga o'xshashlar) faqat egasining aniq ruxsati bilan ishlatiladi (1-qism, 3.1).
- **K3.** Skill ko'rsatmasi shu qoidalarga zid bo'lsa — shu qoidalar ustun (1-qism, 0.1).
