# Brauzer regressiya testlari

`bash tests/ui/run.sh` — saytni lokal serverda ochadi va headless Chromium'da tekshiradi.

| Test | Nima tekshiradi |
|---|---|
| `phase1` | sayt ochiladi, JS xatosi yo'q; 1080p render canvas'ni kattalashtirmaydi; 360° ochiladi/yopiladi |
| `matrix` | 7 qurilma (360…1920 px, DPR 1–3): gorizontal surilish yo'q, canvas = konteyner, tablar ko'rinadi, bosish nishonlari ≥ 40 px; skrinshotlar |
| `touch` | telefon: tegib tanlash, o'lcham → narx, pan, pinch-zoom, ikki marta tegish, mebel sudrash, 3D aylantirish |
| `modals` | telefon: modal va 360° oynalar sig'adi; katalogdan qo'shganda panel ochiq qoladi |
| `phase3` | korpus/fasad → narx; UI = jadval = modul satrlari = Excel jami |

Natija va skrinshotlar: `tests/ui/out/` (gitga kirmaydi).

Eslatma: patchright konsol xatolarini ko'rsatmaydi — testlar `addInitScript` orqali
`window` xatolarini `document.documentElement.dataset.errs` ga yig'adi.
Server testlari alohida: `cd server && npm test`.
