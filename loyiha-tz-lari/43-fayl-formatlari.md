# TZ-43 — Fayl formatlari: sexdagi haqiqiy fayllarga moslash va to'liq chiqarish

**Sana:** 2026-10-21 · **Navbat:** 43 · **Holat:** 1-BOSQICH BAJARILDI (`agent/format`) — haqiqiy stanokda sinov kutilmoqda
**Asos:** egasi #284: "fayllar formatini to'liq to'g'irlab ishlaydigan qilib ber, barcha formatdagi fayllarni to'liq chiqarib bera olish kerak". Bog'liq: TZ-11 (stanok), TZ-33 (SketchUp/Bazis).
**Xavf:** PAST (eksport kodi; hisob, narx va saqlangan loyihaga tegilmagan). Orqaga qaytarish: `git revert`.
**Moliya:** to'lov/narx hisobiga tegilmaydi.

## 1. Tekshiruv natijasi (o'lchangan)
Mavjud `tests/verify_eksport_mazmun.mjs` 75 tekshiruv, hammasi o'tdi: DXF (ezdxf), Excel (openpyxl), GLB, .dae/.skp, KDT, BPJ, .b3d aylanishi, CSV, loyiha fayli. Ya'ni fayllar **tuzilma jihatdan** to'g'ri. Topilgan kamchiliklar — **sexdagi haqiqiy fayl bilan** solishtirganda (`Smart3D_toplam_2026-10-16`: 30 .ncc, 2 .tap, 61 .project, 84 .gibcut, 75 .LC4, 2 044 KDT, 30 .b3d).

| Format | Holat | Dalil |
|---|---|---|
| **Rover CNC (.ncc / .tap)** | **YANGI — bajarildi** (`engine/post/rover.js`, `tests/verify_rover.mjs` 32 tekshiruv) | Eski "G-code" ISO/Fanuc edi (%, G21, M06…, chuqurlik doim 16, bitta o'tish); sex G0/G1, CRLF, Z30, park X100 Y2800 Z50, o'tishlar 16→1, 26→3, 38→5 |
| Teshiklar JSON | **to'ldirildi** — `detal_teshiklari` (186 = NC/DXF) | Avval 52 teshik (faqat modul ta'rifi) |
| GibLab `.project` (Bazis uslubi), KDT | tayyor, 99,2% mos — texnolog sinovigacha SINOV, faqat admin | TZ-11 |
| `.b3d`, `.bpj` | yoziladi va qayta o'qiladi; **haqiqiy Bazis'da ochilishi tekshirilmagan** | egasi |
| `.skp`, `.dae`, `.obj`, `.glb`, `.xlsx`, `.dxf`, CSV, PDF/hisobot | tekshirildi (mustaqil o'quvchi bilan) | verify_eksport_mazmun |
| `.gibcut` (Altendorf), `.LC4` (Holzma) | **yozilmaydi** — yopiq format; sexda GibLab `.project` dan o'zi chiqaradi | `.project` → GibLab |
| PTP / XNC (CSV) | jadval, stanok fayli emas (tugma izohi shuni aytadi) | haqiqiy namuna yo'q |
| Biesse `.cix`, Homag `.mpr` | tugmalari yashirin (namuna "Sample_Panel"); sexda yo'q | TZ-11 C4 |

## 2. Rover post-protsessor qoidalari (sex fayllaridan olingan)
Matn, CRLF, izoh yo'q; faqat G0/G1 (yoy yo'q); modal (G1 dan keyin G va F yozilmaydi); Z30 xavfsiz, oxirida `G0X100Y2800Z50`; chuqurlik = plita qalinligi (o'tib kesish 0 — `opts.overcut`); .tap — `T1M6`, `S15000M3`, ish F6300, tushish F2520, `M30`. Kontur — detal + asbob radiusi (Ø6), list uzun tomoni Y bo'ylab.
**Taxmin (sinov kerak):** Rover X = list eni, Y = uzunligi (sex fayllaridagi Y 2800 asosida); kontur teskari soat strelkasi bo'yicha.

## 3. Egasidan / texnologdan
1. Rover'da **1 arzon detalda** `.ncc` sinovi (ruxsat sizdan — 5.1); asbob diametri 6 mm to'g'rimi.
2. `Namuna-oshxona.b3d` va `.bpj` ni Bazis'da ochib natijani aytish.
3. `Namuna-oshxona.skp` ni SketchUp Free va Pro'da ochish.
4. GibLab'ga `…-bazis.project` import qilish.
5. G-code (ISO) tugmasi qolsinmi yoki yashirilsinmi (Rover bor).
Namuna fayllar to'plami: `node scripts/format_namuna.mjs <papka>` (har format bir namuna loyihadan).
