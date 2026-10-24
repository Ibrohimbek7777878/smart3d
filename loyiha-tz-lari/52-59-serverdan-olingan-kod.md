# TZ-52…59 — serverda to'g'ridan-to'g'ri yozilgan ishlar GitHub'ga olindi (2026-10-24)

**Nima bo'ldi.** Productionda (`/srv/smart3d`, `.git` yo'q) kod `main` (65317d7) dan oldinda edi: 21 ta fayl farq qilardi, 4 ta import qilinadigan fayl faqat serverda bor edi (TZ-57, TZ-59 — egasi serverdagi Claude bilan ishlagan). Keyingi qo'lda deploy ularni o'chirib yuborardi. 2026-10-24 da faqat o'qish rejimida solishtirildi (serverga hech narsa yozilmadi) va 24 ta fayl shu commit bilan `main`ga qo'shildi. Har faylning serverdagi varianti = `main` dagi so'nggi variant + serverning o'z tahriri (`main` o'zgarishlari qaytarilmaydi).

## Ichida nima bor (kod izohlaridagi TZ raqamlari bo'yicha)
| TZ | Nima | Fayllar |
|---|---|---|
| 52 | Stoleshnitsa ('top') materiali eshik yog'ochi bilan bir xil | `shared/design3d/engine.js` |
| 53 | SVG zaxira rejimida (WebGL yo'q) qutilar bo'laklanadi — saralash aniqroq | `shared/design3d/engine.js` |
| 54 | Kirishda Google bloki doim ko'rinadi; Client ID sozlanmagan bo'lsa tugma tushuntirish xabarini ko'rsatadi (jim 503 emas) | `Kirish.jsx`, `useKirish.js`, i18n |
| 57 | Bazis plitasi → ERP plitasi tanlovini eslab qolish (har foydalanuvchining o'zi, `plita_moslash` jadvali): `GET/PUT/DELETE /api/plita-moslash`; saqlangan loyiha ochilganda ham moslash; narx panelida "ERP dan tanlash"; nomzod qatorida plita formati | `server/routes/plita-moslash.js`, `server/index.js`, `plitaXotira.js`, `material.js`, `bazis.js`, `erpMaterial.js`, `store/project.js`, `useQadamNarx.js`, `QadamNarx.jsx` |
| 57 | Bazis'ning mahsulot bo'lmagan qatorlari (`BZ-pr_N`, `BZ-fragmentN`) narxsiz furnitura sifatida aniqlikni tushirmaydi — hisobda yashirilib `yashirin` da qaytadi; bir ERP mahsulotiga bog'langan turli Bazis kodlari hisobda bitta qatorga birlashadi | `app/js/engine/cutlist.js` |
| 57 | Egasi (2026-10-23, "qolganlarini ham bog'la") bo'yicha 5 ta Bazis furnitura kodi bog'landi: 3 yarim-gorbat petlya → 90002524, plastik ekstsentrik → 90002094, `nojka_..._192` → 90002491. Qolgan 17 kod (quti/komplekt narxi, uzunlik) egasi javobisiz bog'lanmaydi | `app/data/furnitura-boglash.json` |
| 57 | Furnitura katalogidagi takror ID'lar ro'yxatda bir marta | `furnTakror.js`, `furnitura.js` |
| 59 | Furnitura rasmi (katalog, zapchast paneli), "namuna rasm" belgisi; kromka: sof metr va chiqit bilan hisoblangan metr birga; raskroyda detal turi bo'yicha rang va izoh; hisobdagi furnitura qatorida ERP ID; PWA rasm keshi 1200 → 3000 | `furnRasm.js`, `FurnituraVaraq.jsx`, `ZapchastPanel.jsx`, `zapchast.js`, `useQadamNarx.js`, `cutlist.js`, `vite.config.js` |

## Qo'shilMAGAN narsa
- `app/data/rasmlar.json` ning serverdagi varianti (+32 furnitura rasmi, 12 ta "namuna" belgisi) — u ko'rsatadigan `data/rasm/furnitura/*.webp` 32 fayl GitHub'da yo'q (`verify_rasm` bu yerda yiqiladi). Rasm fayllari olib kelingach, `rasmlar.json` bilan birga qo'shiladi. Shu vaqtgacha `main` dagi eski `rasmlar.json` qoladi (furnitura rasmlari soni 961).

## Tekshiruv
- `tests/verify_furn_boglash.mjs` yangilandi: egasi tasdiqlagan yangi bog'lanishlar, `pr_N`/`fragmentN` yashirinligi, birlashgan qator.
- `tests/verify_stol.mjs`: ERP jadvali orqali bog'langan qatorda ham `id` bor (TZ-59).
- Yangi: `tests/verify_serverdan.mjs` (takrorsiz, rasmYol/rasmNamuna, plita xotirasi kaliti), `server/test/plita-moslash.test.js` (login, per-user, qayta yozish, o'chirish, tekshiruv 400).
