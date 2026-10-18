# Handoff: Smart3D — sayt (landing) + ilova (ro'yxat → muharrir)

> **Claude Code uchun asosiy qoida:** dizaynni **buzmang**. `designs/` papkadagi HTML fayllar — ko'rinish va xatti-harakatning **yagona manbasi** (source of truth). Har bir ekranni ochib, piksel-darajada solishtirib, aynan shunday qayta yozing. Rang, shrift, o'lcham, radius, matn, animatsiya vaqtlari — o'zgartirilmaydi. Shubha bo'lsa — HTML faylni oching va undagi inline `style` qiymatini ko'chiring.

## Overview
Smart3D (by Bittada) — mebel ustalari, dizaynerlar va Bazischilar uchun brauzer ilovasi: zamer → 3D modul joylash → kroy/smeta → stanok fayli.
Ikki qism:
1. **Landing** — marketing sayti, scroll bilan boshqariladigan 3D modul animatsiyasi va interaktiv 3D demo.
2. **Ilova** — ro'yxatdan o'tish/kirish → onboarding → loyihalar → 3D muharrir (4 qadam: Xona, Mebel, Narx, Fayllar).

Barcha UI matni — **o'zbek (lotin)**. Matnni HTML'dan aynan ko'chiring.

## About the Design Files
`designs/` ichidagi fayllar — **HTML'da yaratilgan dizayn prototiplari** (ko'rinish + xatti-harakat namunasi), production kod emas. Vazifa — ularni loyihaning mavjud muhitida (React/Next.js/Vue va h.k.) uning patternlari bilan **qayta yaratish**. Muhit yo'q bo'lsa tavsiya: **Vite + React + TypeScript + three.js** (3D qismi uchun `@react-three/fiber` ixtiyoriy — lekin quyidagi 3D xatti-harakatlar aynan saqlanishi shart).

`.dc.html` fayllar `support.js` runtime bilan ochiladi (bir papkada bo'lishi shart). Ularda:
- shablon `<x-dc>…</x-dc>` ichida — `{{ name }}` teshiklar `renderVals()` qaytargan qiymatlar;
- `<sc-if value>` = shartli render, `<sc-for list as>` = ro'yxat;
- `style-hover="…"` = hover holati;
- mantiq `<script type="text/x-dc">` ichida `class Component` (React class komponentiga o'xshash: `state`, `setState`, `componentDidMount`).
3D kodi (three.js) — shu script ichidagi `s3*` funksiyalar: **ularni deyarli o'zgarishsiz alohida modulga ko'chirish mumkin** (`s3Viewer`, `s3Build`, `s3Apply`, `s3Spec*`, `s3Room`, `s3Mats`, `s3HwMesh`, `s3Label`).

## Fidelity
**High-fidelity.** Ranglar, tipografiya, oraliqlar, radiuslar, animatsiyalar — yakuniy. Piksel-darajada takrorlang.

---

## Design Tokens

### Ranglar (yagona tema — to'q yashil-ko'k; oq fon ishlatilmaydi)
| Token | Hex | Ishlatilishi |
|---|---|---|
| `--bg` | `#0F2229` | sahifa foni |
| `--bg2` | `#12282F` | (landing) ikkinchi fon |
| `--sfc` | `#173239` | kartalar |
| `--sfc2` | `#204049` | ichki bloklar, chiplar |
| `--sfc3` | `#2A4D57` | (ilova) o'chiq toggle, nuqtalar |
| `--txt` | `#ECF4F2` | asosiy matn |
| `--mut` | `#9DB8B5` | ikkinchi darajali matn |
| `--line` | `rgba(236,244,242,.12)` | chegaralar |
| `--acc` | `#FF7A45` | urg'u (mis-to'q sariq): asosiy tugmalar, aktiv holat |
| `--acct` | `#FF956B` | urg'u matni |
| `--ink` | `#2A1206` | urg'u ustidagi matn |
| `--cyan` | `#5FE1C4` | o'lcham chiziqlari, ✓ belgilar |
| `--lav` | `#B9A6FF` | "Sexga" guruhi |
| `--pch` | `#FFB59A` | raskroy rangi |
| `--danger` | `#FF7B7B` | xato/ogohlantirish |
| 3D sahna foni | `#0C1C22` (+ radial `rgba(255,122,69,.10–.18)`) | |
| Header foni | `rgba(15,34,41,.78)` + `backdrop-filter: blur(16px)` | |

3D materiallar (three.js hex): LDSP korpus `0xC9BFAE`, "rangsiz" `0x8FA9AB`, osma eshik `0xBDB5A6`, HDF `0xC4A57F`, stoleshnitsa `0xA79F92`, qora `0x2C2B31`, ruchka `0x34343C`, metall `0xC8CCD3`, Euro `0xD8B35A`, Евровинт `0x8E949C`, devor `0x22424A`, yon devor `0x1C3940`, pol `0x14292F`, deraza `0x5E8F96`, shisha eshik `0x6FA3AA` (opacity .75), tanlov chegarasi `0xFF7A45`, o'lcham chiziq `0x5FE1C4`. Yog'och — canvas tekstura (`s3WoodTex`, asos `#B4834F`).

### Tipografiya
- Asosiy: **Manrope** 400/500/600/700/800 (Google Fonts). Raqamlar: `font-variant-numeric: tabular-nums`.
- Kod/raqam belgilari: **JetBrains Mono** 500/700.
- H1 landing: `clamp(38px,5.4vw,72px)`, 800, `line-height:1`, `letter-spacing:-.045em`.
- H2: `clamp(32px,4.2vw,56px)` yoki `clamp(28px,3.4vw,44px)`, 800, `letter-spacing:-.03…-.04em`.
- Matn: 16px / 1.5; ikkinchi: 14–15px; label: 12–13px 700–800, ba'zan `uppercase` + `letter-spacing:.08em`.

### Radius / soya / oraliq
- Radius: tugma 14–16px, karta 20–28px, katta CTA blok 32px, chip 999px, input 12–14px.
- Soya: modal/karta `0 20px 50px rgba(0,0,0,.4)`; CTA hover `0 14px 36px rgba(255,122,69,.35)`.
- Konteyner: `max-width:1280px`, gorizontal padding `clamp(16px,4vw,32px)`.
- Oraliqlar asosan 6/8/10/12/14/16/20/24/28px (`gap` bilan, flex/grid).
- Min. bosish maydoni 44px.

---

## Screens / Views

### A. Landing — `designs/Smart3D Landing v2.dc.html`
1. **Header** (sticky, 64px): logo "3D" kvadrat 38px `--acc` + "Smart3D / by Bittada"; nav (≥1081px): Kimlar uchun · 3D demo · Qanday ishlaydi · Fayllar · Savollar; "Kirish" (outline) → `Ilova#login`; "Ro'yxatdan o'tish" (`--acc`) → `Ilova#reg`. <1081px: ☰ menyu.
2. **Hero + scroll-3D** (`#hero`, balandlik `520vh`, ichida `position:sticky;top:0;height:100vh`):
   - To'liq ekran three.js sahna: pastki shkaf MC-KP-02 (600×450×708).
   - Scroll progressi `p = clamp(-rect.top/(height-innerHeight))` → bosqichlar:
     `p<.08` hero matni ko'rinadi (keyin yuqoriga ketadi va so'nadi) ·
     `.08–.24` 01 Zamer (rangsiz + o'lcham chiziqlari) ·
     `.24–.38` 02 Material quyiladi (clipping plane pastdan yuqoriga) ·
     `.38–.55` 03 10 detalga sochiladi (yorliqlar) ·
     `.55–.68` 04 Zapchastlar · `.68–.84` 05 Hisob (hisoblagichlar 0→qiymat) ·
     `.84–1` 06 Qayta yig'iladi.
   - Kamera: `theta = -.75 + p*3.1 (+ sin(t*.35)*.12)`, `phi = .2 + sin(p*π)*.26`, `dist = 3.1 (+explode*.7)`; mobil (<1100px) `dist 4.4`, target markazda.
   - Chap-pastda shisha karta (blur 14px): "0N / 06", sarlavha, izoh, 4 hisoblagich (detal / zapchast / m kromka / m² plita), 6 segmentli progress.
   - Detal yorliqlari ikki ustunga teriladi (chap/o'ng), har biridan detalga ingichka chiziq + to'q sariq nuqta (`s3Viewer` ichidagi `columns` rejimi).
3. **Kim uchun** — 3 karta (Mebel ustasi / Dizayner / Bazischi), hover: `perspective(1000px) rotateX(5deg) rotateY(-6deg) translateY(-6px)`.
4. **3D demo** (`#demo`) — tablar: Pastki shkaf (10 detal) / Osma shkaf (8) / Shkaf-kupe (41). Ko'rinishga kirganda 6 bosqichli avto-ssenariy (~10.4s). Boshqaruv: Rangli/Rangsiz, Sochish slayderi 0–100%, Eni slayderi 600–1070 (faqat KP: eshik `(W-4)/2`, polka `W-32` qayta hisoblanadi). Detal bosilganda: boshqalari `opacity .1` (shaffof), o'ng-tepada karta: **alohida aylanuvchi mini-3D** (220px) + o'lcham/material/soni/kromka. O'ngda spec paneli + "Bu modulni loyihamga qo'shish →" (`Ilova#s=reg&mod=MC-KP-02&w=<W>`).
5. **5 qadam**, **Fayllar (17 xil)**, **Savollar (accordion)**, **Yakuniy CTA (`--acc` blok)**, **Footer**.
6. Bo'limlar ko'rinishga kirganda: `opacity 0→1`, `perspective(1200px) rotateX(14deg) translateY(40px) → none`, `.9s cubic-bezier(.2,.7,.2,1)`.

### B. Ilova — `designs/Smart3D Ilova.dc.html`
`state.screen`: `reg` | `login` | `onb1` | `onb2` | `projects` | `app`.
1. **Ro'yxatdan o'tish / Kirish** — 2 ustun (≤980px bitta). Chapda aylanuvchi/ochilib-yopiluvchi 3D shkaf + 3 ✓. O'ngda: "← Saytga qaytish", (agar saytdan modul kelgan bo'lsa) to'q sariq xabar, Ism, Telefon (`+998` prefiks, mask `__ ___ __ __`, 9 raqam), Parol (👁, 4 segment kuch ko'rsatkichi), Sex nomi (ixtiyoriy). Xatolar: "Ismingizni yozing", "Telefon 9 raqam bo'lishi kerak", "Bu raqam bilan akkaunt bor — kirish", "Parol kamida 8 belgi".
2. **Onboarding 1** "Nima yasaymiz?" — 4 karta (Oshxona / Shkaf-garderob / Boshqa mebel / AI'ga aytib beraman). **Onboarding 2** — xona presetlari (3.6×3, 4.2×3.1, 5×4, 6×4 m) + o'z o'lchami, yoki AI matn/ovoz. "Muharrirni ochish →".
3. **Loyihalarim** — qidiruv + "+ Yangi loyiha" + kartalar grid (`minmax(260px,1fr)`), CSS-3D mini thumbnail.
4. **Muharrir** — grid `200px | 1fr | 400px` (≤980px: ustma-ust, nav pastga fixed 72px).
   - Header: logo, loyiha nomi (tahrirlanadi), narx chipi `5 701 103 so'm*` → Narx qadami, "* to'liq emas".
   - Chap nav: ① Xona ② Mebel ③ Narx ④ Fayllar (✓ tugallangan, aktiv `--acc`).
   - **3D xona** (three.js): devor/pol, deraza, pastki 4 + osma 3 modul, stoleshnitsa, sokol, karniz. Toolbar: 2D/3D, 📸 Rasm, 🔄 360°, **🚪 Eshiklarni ochish**, ⌖ Markazga. G'ildirak — zoom (2.2–12).
   - **Modul tanlash** (1-bosish): to'q sariq Box3Helper + cyan o'lcham. Karta: Eni/Chuqurligi/Bo'yi [–][input][+] (qadam 10), min/max, chegaradan chiqsa qizil ⚠️ va qiymat siqiladi; ◀ ▶ (±50mm), ⟳, ⧉ nusxa, 🗑 (tasdiq modal); "🚪 Ochish · eshiklar/tortmalar"; "Ichini ko'rish →" (faqat MC-KP-02, MC-KU-04).
   - **Eshik/tortma** (tanlangan modulda bosish): eshik petlyada `rotation.y = -sign * 1.75rad`, tortma `z += d*0.7`, silliq `1-exp(-dt*6)`.
   - **Detal** (ochilgan/ichki detalni bosish): qolgan hamma mesh `opacity .14, depthWrite:false`, tanlangan `emissive 0x8a3000 .35`. O'ng-tepada karta: nom, kod, **mini-3D (190px)** aylanadi, O'lcham/Material/Kromka, (eshik/tortma bo'lsa) Ochish/Yopish.
   - ✨ AI tugmasi (o'ng-past, 60px, `--cyan`) → bottom-sheet.
   - Maslahatlar (3 ta, cyan karta).
   - Panel qadamlari: **Xona** (shakl, o'lchamlar, teshiklar, 5 toggle), **Mebel** (qidiruv, kategoriya chiplar, material chiplar, katalog → bosilganda sahnaga qo'shiladi), **Narx** (3 karta: mijoz narxi / tannarx / foyda +35%, 12 zapchast narxi yo'q ogohlantirish, kotirovka, tannarx, raskroy 6 varaq ←→, detallar), **Fayllar** (tekshiruv, Mijozga/Sexga/Stanokka; "Bazis (BPJ) · tez orada" disabled).
5. **Ichini ko'rish** modal — chapda 3D (avto sochiladi 0.6→2s), Rangli/Rangsiz, Sochish; o'ngda kod, o'lcham, detal/zapchast soni, ro'yxat, zapchast chiplar.
6. Toast (3s), tasdiq modal.

---

## Interactions & Behavior (muhim)
- **Sayt → ilova:** `Ilova#reg`, `Ilova#login`, `Ilova#s=reg&mod=MC-KP-02&w=800` (+ `sessionStorage['s3d-handoff']` zaxira). Ilova `hashchange`ni tinglaydi. Modul kelsa — onboarding/kirishdan keyin shu modul shu enida xonaga qo'shiladi va tanlanadi + toast.
- **Foydalanuvchi:** hozir `localStorage['s3d-user']` (prototip). Productionda — backend (telefon + parol / SMS). `901234567` — "band raqam" demosi.
- **3D yuklanishi:** three.js `0.160.0`. WebGL yo'q bo'lsa → `SVGRenderer` zaxira (`s3Load`), bunda: tekstura o'rniga rang, renderOrder bo'yicha qatlamlash, kadr ~30fps. `localStorage['s3d-force-svg']='1'` — test uchun.
- `prefers-reduced-motion` — animatsiyalar o'chadi, ssenariy oxirgi holatda.
- Kamera: sudrash `theta -= dx*.008`, `phi += dy*.005` (clamp), 2.5s harakatsizlikdan keyin avto-aylanish.
- Detal yorliqlari: sochilish `> .5` bo'lganda paydo bo'ladi (`(explode-.5)/.35`).

## State Management (ilova)
`screen, f{name,phone,pass,shop,show,err}, onbKind, room{w,d,h}, shape, tg{stol,sokol,dobor,karniz,moyka}, mods[] {id,code,name,type kp|ku,kind door|moyka|tortma|glass,w,d,h,doors,off,warn,p0,v0}, sel, open{ '<id>:d0'|'<id>:t0': 1 }, part{name,dim,mat,mk,edge,key,size,id,code}, view 2d|3d, spin, tip, ai, aiText, mic, cf, toast, ins, insA{ex,color}, cat, q, rk, miss, mat{k,f}, projName, pq, pending{mod,w}`.
Modul chegaralari: `kp: w 600–1070, d 450–580, h 600–880`; `ku: w 600–1070, d 290–400, h 460–1140`.
Narx: `s3Price(m)=p0*(0.4+0.6*(w*h*d)/v0)` — **vaqtinchalik formula**, productionda ERP katalogidan olinadi.

## Ma'lumotlar (haqiqiy vs namuna)
- Haqiqiy (brifdan): MC-KP-02 detallari/zapchastlari, 504 865 so'm, jami 5 701 103 so'm, 121 modul, 17 fayl, 6 varaq · 82 detal, 1 281 plita / 1 978 zapchast.
- **Namuna** (almashtirish kerak): boshqa modullar narxi, tannarx qatorlari, kromka qiymatlari, loyihalar ro'yxati, raskroy to'rtburchaklari (seed bilan generatsiya).

## Assets
Rasm fayllari yo'q. Ikonlar — emoji/unicode (🚪 📸 🔄 ⌖ ✨ 🎤 🗑 ⧉ ◀ ▶ ⟳ ✓ ×). Yog'och teksturasi kodda canvas bilan chiziladi. Shriftlar — Google Fonts. Karuseldagi ilova skrinshotlari uchun joy belgilari bor (keyin real skrinshot qo'yiladi).

## Files
- `designs/Smart3D Landing v2.dc.html` — sayt (asosiy).
- `designs/Smart3D Ilova.dc.html` — ilova (ro'yxat → muharrir).
- `designs/support.js` — prototip runtime (faqat HTML'ni ochish uchun; productionga kerak emas).
- `brief/DIZAYN-Smart3D.md` — asl dizayn topshirig'i.

## Claude Code uchun tavsiya etilgan ish tartibi
1. `designs/*.dc.html` ni brauzerda oching, har ekranni ko'rib chiqing.
2. Tokenlarni CSS o'zgaruvchilari / theme sifatida bir joyga chiqaring (qiymatlar aynan yuqoridagidek).
3. 3D kodni (`s3*` funksiyalar) `src/three/` ga TypeScript modul qilib ko'chiring — mantiqni o'zgartirmang.
4. Ekranlarni komponentlarga bo'ling: `Landing/{Header,HeroScroll3D,Audience,Demo3D,Steps,Files,Faq,Cta,Footer}`, `App/{Auth,Onboarding,Projects,Editor/{TopBar,StepNav,Scene3D,ModuleCard,PartCard,panels/*},InsideModal,AiSheet,Confirm,Toast}`.
5. Routing: `/` (landing), `/app/register`, `/app/login`, `/app/onboarding`, `/app/projects`, `/app/editor/:id`.
6. Har bosqichdan keyin prototip bilan yonma-yon solishtiring (desktop 1440px va mobil 390px).
