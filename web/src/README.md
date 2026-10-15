# web/src — tuzilish (TZ-19)

Ikki sahifa: `index.html` (sayt, `landing/`) va `app.html` (ilova, `app/`).

```
app/          qobiq: main.jsx (ishga tushirish), App.jsx (sahifa tanlash), bootstrap.js (ma'lumot, sessiya, QA), app.css
store/        holat: store.js (ombor), index.js (bo'limlar), project.js (loyiha modeli), session.js (server), ui.js (xabar, tasdiq, varaq)
services/     dvigatelga ko'prik (ekransiz): hisob, loyiha, sahna (3D), ichki (assembler), eksport (fayllar)
shared/       umumiy: ui/ (Toggle, Varaq, Tasdiq, Toast, Chiplar, styles), lib/format.js, design3d/ (dizayn 3D dvigateli, useViewer)
features/     har bo'lim — o'z papkasi: Komponent.jsx (dizayn JSX) + use<Komponent>.js (qiymatlar) + actions.js (amallar)
  auth/ onboarding/ projects/ settings/ shell/
  editor/  EditorPage, EditorNav, Varaqlar + scene/ room/ catalog/ pricing/ files/ inside/ ai/
landing/      Landing.jsx (sayt mantiqi, 3D hikoya va demo) + sections/ (9 bo'lim)
```

## Qoidalar

- **Dizayn — o'zgarmaydi.** Komponentlardagi JSX va stillar tasdiqlangan dizayndan (`frontend/design_handoff_smart3d`).
  Har o'zgarishdan keyin `bash tests/ui/dizayn.sh` ishga tushiriladi.
- **Holat** faqat `store/` orqali: `useSlice('editor')` — o'qish, `set('editor', {...})` — yozish.
  Komponent faqat o'zi o'qigan bo'lim o'zgarganda qayta chiziladi.
- **Loyiha hujjati** (`project.doc`) — dvigatel o'zgartiradigan obyekt. U holatda saqlanmaydi.
  O'zgargandan keyin `project.changed('room' | 'items')` chaqiriladi: 3D sahna yangilanadi, hisob qayta ishlaydi, avtomatik saqlash ishga tushadi.
- **Hisob** faqat `services/hisob.js` orqali — eski sayt bilan aynan bir xil (`tests/ui/hisob_teng.sh`).
- **Bog'liqlik yo'nalishi:** `features` → `store`, `services`, `shared`. `services` va `shared` hech qachon `features` ni import qilmaydi.
- **Bitta fayl** taxminan 250 qatordan oshmaydi. Istisno: dizayn 3D dvigateli (`shared/design3d/engine.js`) — u dizayndan aynan ko'chirilgan.

## Testlar

```
bash tests/ui/web.sh          # ilova: kirish, muharrir, fayllar, sozlamalar, varaqlar, qolgan (haqiqiy server, vaqtinchalik baza)
bash tests/ui/dizayn.sh       # dizayn bilan pikselma-piksel
bash tests/ui/hisob_teng.sh   # narx eski sayt bilan bir xil
bash tests/ui/internetsiz.sh  # internetsiz ochiladi
```
