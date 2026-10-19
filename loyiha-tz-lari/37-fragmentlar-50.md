# TZ-37 — "full base" Bazis fragmentlaridan kamida 50 modul

**Sana:** 2026-10-19 · **Navbat:** 37 · **Holat:** BAJARILMOQDA (egasi #264–#268: "600 talik bazadan eng kamida 50 tasini tizimga qo'shib ber, narx bir xil bo'lsin")
**Manba:** `full base.zip` (449 fayl: 447 `.fr3d`, 2 `.b3d`; repoda YO'Q, `.gitignore`da). Tahlil: 363 o'qiladi, 86 shifrlangan.

## Tarkib
Korpus 21 (hammasi o'qiladi), Korpus ichi 118 (polka 11, stoyka 16, tortma paketlari 88), Fasad 171 (56 shifrlangan), Zapchast 138 (28 shifrlangan; 89 tasi detalsiz, faqat 3D).

## Vazifa
1. Kamida **50 ta tayyor modul** (korpus + ichki + fasad birlashmalari yoki alohida korpuslar) `app/data/fragments-mc.json` (yoki yangi fayl) ga, MC-… kodlari bilan; turli-tumanlik: oshxona pastki/ustki, gola, sokolli, vityajka, tortmali (salazka/tandem), polkali.
2. Nomlar uz/ru/en; katalog kategoriyalari; 3D va zapchast belgilari ko'rinadi; D6 teshiklar sex qoidasi bo'yicha.
3. **Narx:** har modul uchun hisobimiz fragment faylining o'z detal+furnitura ro'yxati (`generateSpecification`) bilan **±5%** ichida; oshsa modul qo'shilmaydi, sababi yoziladi. Furnitura narxi faqat ERP bog'lanishi bor bo'lsa; yo'q bo'lsa — "narxsiz", o'ylab topilmaydi.
4. Shifrlangan fayllar ochilmaydi — o'tkazib yuboriladi.

## Qoidalar
`.fr3d`/`.b3d` fayllar repoga qo'shilmaydi; faqat olingan ma'lumot (formulalar, o'lchamlar, slotlar). Narx/hisob dvigateli (cutlist.js, narxStavka.js) o'zgarmaydi. Testlar yashil, build, CI.

## Xavf — O'RTA (katalog 130 → 180; AI tanlovi o'zgarishi mumkin: `verify_ai_katalog` yashil qolishi shart).
