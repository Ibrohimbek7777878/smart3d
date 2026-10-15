# Smart3D — frontend (React + Vite + three.js)

Sayt va ilova dizayn prototipidan **aynan** React'ga o'tkazilgan: ranglar, shriftlar, o'lchamlar, animatsiyalar, 3D modullar va barcha funksiyalar saqlangan.

## Ishga tushirish
```bash
npm install
npm run dev        # http://localhost:5173  → sayt,  /app.html → ilova
npm run build      # dist/ — serverga qo'yiladigan tayyor fayllar
npm run preview    # build natijasini ko'rish
```
Node.js 18+ kerak.

## Tuzilma
```
index.html            sayt (landing) sahifasi
app.html              ilova sahifasi (ro'yxat → onboarding → loyihalar → 3D muharrir)
src/landing/
  Landing.jsx         sayt komponenti (UI + holat)
  engine.js           3D dvigatel: viewer, modul spetsifikatsiyalari, sochilish, yorliqlar
  landing.css         global qoidalar + hover holatlari
  main.jsx
src/app/
  App.jsx             ilova komponenti (barcha ekranlar)
  engine.js           3D dvigatel + xona (s3Room), katalog, narx, eshik/tortma
  app.css
  main.jsx
```

## Muhim — dizaynni buzmaslik uchun
- Stillar **inline** (`style={{…}}`) — prototipdagi qiymatlar aynan. O'zgartirmang.
- `engine.js` dagi 3D mantiq prototipdan so'zma-so'z ko'chirilgan. Yangi modul qo'shish — `s3Spec*` (sayt) va `S3_CAT` / `S3_LIM` (ilova) orqali.
- `React.StrictMode` **ishlatmang** — 3D sahnalar ikki marta yaratilib qoladi.
- WebGL yo'q brauzerda avtomatik SVG zaxira rejimi ishlaydi (`s3Load`).

## Sayt ↔ ilova bog'lanishi
- `app.html#reg`, `app.html#login`
- `app.html#s=reg&mod=MC-KP-02&w=800` — saytdagi demo modul ro'yxatdan keyin xonaga qo'shiladi.

## Backendga ulash kerak bo'lgan joylar (`src/app/App.jsx`)
| Joy | Hozir | Kerak |
|---|---|---|
| `submitAuth()` | `localStorage['s3d-user']` | API: ro'yxat / kirish (telefon + parol yoki SMS) |
| `S3_PROJ` | namuna loyihalar | API: foydalanuvchi loyihalari |
| `S3_CAT`, `s3Price()` | namuna narxlar | ERP katalogi (plita, zapchast, SKU) |
| `costRows`, `missing` | namuna | smeta hisoblash servisi |
| Fayllar (`fileGroups`) | toast | PDF / Excel / GibLab / DXF / G-code generatsiyasi |
| `S3_SHEETS` | generatsiya qilingan | raskroy (nesting) natijasi |
| AI (`aiBuild`) | demo | AI servis |

Haqiqiy raqamlar (brifdan): MC-KP-02 detallari, 504 865 so'm, jami 5 701 103 so'm, 121 modul, 17 fayl.
