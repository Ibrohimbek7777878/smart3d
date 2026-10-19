# TZ-39 — Zapchast ko'rinishi slayddagidek aniq va topish oson bo'lsin

**Sana:** 2026-10-19 · **Navbat:** 39 · **Holat:** BAJARILDI 2026-10-19 13:37 (`main` 087d0e3; agent 3b76cf7; testlar yashil). Qoldi: telefonda modul kartasi asboblar qatorini yopadi; kompyuterda zapchast rejimida modul kartasi yashiriladi (egasi tasdiqlashi kerak). Boshlangan 12:05 (egasi #276: "hali ham yo'q… TZlarni tasdiqlayman, maqul bo'lganini qil, boshla")
**Asos:** TZ-38 texnik jihatdan ishlaydi (testlar yashil, `web_zapchast`), lekin egasi ekranda ko'rmayapti (#275, #276). Sabab (agent tekshirgan skrinshotlar bo'yicha):
1. Tugma — yozuvsiz tishli g'ildirak belgisi, vertikal panel ichida; topilmaydi.
2. Yoqilganda kamera joyida qoladi: belgilar mayda, modulning bir burchagida, panellar orqasida; ro'yxat paneli 3D oynaning o'rtasini yopadi.
3. SP- (umumiy) modullarda teshik koordinatasi yo'q — belgi chizilmaydi, ro'yxatdagi "3D da joyi aniqlanmagan" tushunarsiz.

## Bajariladigan ishlar (faqat `web/` ko'rsatish qatlami; narx, kesim, fayl hisobi o'zgarmaydi)
1. **Yozuvli tugma "Zapchastlar"** yuqori asboblar qatorida ("Markazga" yonida), Ikon bilan, faol holati aniq ko'rinadi; yon paneldagi eski tugma shu bilan bir holatni boshqaradi (dublikat holat yo'q).
2. **Yoqilganda avtomatik kadrlash:** tanlangan modul (yoki tanlanmagan bo'lsa — sahnadagi hamma modullar) to'liq ko'rinadigan kamera; panellar shaffof, ichki qism ko'rinadi.
3. **Belgilar slayddagidek aniq:** (Smart3D_malumot/Smart3D-korgazma-slayd.pdf 6-slayd) ekranda kamida ~14 px, turi bo'yicha rang (petlya, ruchka, polka ushlagich, relsa, konfirmat, ekssentrik, oyoq), orqa qirrada ko'rinish (depth test o'chiq yoki yengil kontur); kichik **rang izohi** (legend), turga bosib yoqish/o'chirish.
4. **Ro'yxat paneli 3D ni yopmasin:** kompyuterda o'ng ustundagi alohida varaq yoki tor yon panel; telefonda pastki varaq, sukut — yig'ilgan (faqat "Jami: N dona, M so'm · 3D da: K ta"), bosilsa ochiladi.
5. **Joyi yo'q zapchast uchun tushuntirish:** "Bu modulda teshik koordinatasi yo'q — joyi ko'rsatilmaydi, narxga kiradi" (3 tilda). SP modullar uchun keyingi ish (joyni qoida bilan hisoblash) — alohida TZ.
6. Yoqilganda qisqa xabar: "Zapchastlar: N ta ko'rsatildi".
7. Testlar: `web_zapchast` yangilanadi; yangi tekshiruv — yoqilganda belgilar ekranda ko'rinadi (piksel/belgi o'lchami), kamera moduldan uzoqda emas, ro'yxat paneli markaziy 3D maydonining ≥70% ni yopmaydi, 390×844 telefonda ishlaydi. Agent o'zi skrinshotlarni ko'rib, slaydga solishtirib, hisobotga yozadi.

## Tegadigan fayllar
`web/src/services/belgi3d.js`, `web/src/features/editor/scene/{ZapchastPanel.jsx,zapchast.js,KorinishPanel.jsx,Sahna.jsx,useSahna.js}`, `web/src/services/{sahna,zapchast}.js`, lug'atlar, `tests/ui/web_zapchast.mjs`. **Tegilmaydi:** hisob, kesim, eksport, tasdiqlangan dizayn.

## Xavf: PAST (faqat ko'rsatish). Orqaga qaytarish: `git revert`.
