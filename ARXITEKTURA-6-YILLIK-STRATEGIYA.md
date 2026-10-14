# Smart3D: 6 Yillik Uzluksiz, Xavfsiz va Raqobatbardosh Arxitektura Strategiyasi (2026–2032)

> **Hujjat maqomi:** Bosh Arxitektura Konstitutsiyasi (Enterprise Master Architecture Document)  
> **Amal qilish muddati:** 2026 – 2032 (kamida 6 yil)  
> **Maqsad:** Smart3D platformasini xalqaro miqyosda raqobatbardosh (Sunpina, Kujiale, Bazis darajasida), 99.99% uptime bilan to'xtovsiz ishlaydigan, kiberxavfsiz va texnik qarzga botmaydigan etib qurish.

---

## 1. Strategik Maqsad va "6 Yillik Qoida"

Smart3D — mebel sexlari uchun oddiy hisoblagich emas, balki **butun ishlab chiqarish jarayonini boshqaruvchi operatsion tizimdir**.
Tizim 6 yil davomida (2026–2032) to'xtovsiz, kamchiliksiz va raqobatga bardoshli bo'lib xizmat qilishi uchun quyidagi **5 ta o'zgarmas arxitektura qonuni** belgilanadi:

1. **Framework-Mustaqillik (Core Domain Agnostic):**
   Mebel konstruksiyasi, formulalar, kroy (raskroy) va stanok post-prosessorlari sof matematika va algoritmlarga tayanadi. Ular Three.js, React, Express yoki boshqa vaqtinchalik kutubxonalarga BOG'LANMAYDI. Har qanday UI kutubxonasi 3 yildan keyin o'zgarsa ham, mebel hisoblash yadrosi o'zgarmasdan ishlayveradi.
2. **Yagona Manba va Deterministik Hisob (Deterministic SSOT):**
   Bitta `ProjectDoc` kiritilganda — 2026-yilda ham, 2032-yilda ham, brauzerda ham, serverda ham bir xil natija (detallar, narx, kroy, stanok fayli) chiqishi shart.
3. **Local-First & Offline Resilience (Sex va Xona Haqiqati):**
   Usta mijozning yerto'lasida yoki interneti yo'q xonadonida turganda ham tizim 100% mustaqil ishlaydi (IndexedDB + Service Worker). Internet paydo bo'lganda serverga asinxron sinxronizatsiya qilinadi.
4. **Zero-Trust Multi-Tenancy & Mudofaa (Kiberxavfsizlik):**
   Har bir mebel sexi (tenant) o'z narxlari, mijozlari, bazalari va chizmalariga ega. Hech bir holatda bir sexning ma'lumotlari ikkinchi sexga oqib o'tmaydi.
5. **Stanoklar va AI uchun Plugin Arxitekturasi (Kelajakka Moslik):**
   Yangi stanok modeli (Biesse, Homag, SCM, yangi Xitoy CNC) yoki yangi AI modeli (Claude, Gemini, lokal DeepSeek) chiqqanda butun tizimni qayta yozmasdan, faqat 1 ta adapter/plugin qo'shiladi.

---

## 2. Domain-Driven Design (DDD) va Tizimning 7 ta Bounded Context'i

Tizim pala-partish bitta katta kod bo'lib qolmasligi uchun 7 ta qat'iy chegaralangan domenlarga (Bounded Contexts) bo'linadi:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SMART3D DOMAIN MODEL                                  │
├───────────────────────────┬────────────────────────────┬───────────────────────────────┤
│ 1. ROOM & MEASURE CONTEXT │ 2. FURNITURE PARAMETRIC    │ 3. NESTING (KROY) CONTEXT     │
│ - Zamer (devor, poligon)  │    CORE CONTEXT            │ - Lenta / Guillotine dvigatel │
│ - BLE lazer / Teshiklar   │ - Parametrik fragmentlar   │ - Trim / Tekstura yo'nalishi  │
│ - Xona cheklovlari        │ - AST Formula Evaluator    │ - Qoldiqlar (remnants) reestri│
│                           │ - Slotlar (korpus, fasad)  │ - Multi-order batching        │
├───────────────────────────┼────────────────────────────┼───────────────────────────────┤
│ 4. MACHINE & CAM CONTEXT  │ 5. PRICING & BOM CONTEXT   │ 6. TENANT & SECURITY CONTEXT  │
│ - Neytral detallar modeli │ - Real-time ERP narxlar    │ - Multi-tenant izolyatsiya    │
│ - Stanok post-prosessorlar│ - Dinamik tannarx (kroy)   │ - RBAC (rollar & huquqlar)    │
│ - Detal QR & Labellar     │ - Smeta snapshot (muzlatish│ - Audit & faoliyat jurnali    │
├───────────────────────────┴────────────────────────────┴───────────────────────────────┤
│ 7. AI ORCHESTRATION CONTEXT                                                           │
│ - AI-1 "Tarjimon" (NL → Qat'iy JSON buyruq)                                           │
│ - AI-2 "Konstruktor" (Buyruq → Modul joylashtirish)                                    │
│ - Deterministik Validator (To'qnashuv, sig'ish, standartlar)                          │
│ - Model-Agnostic LLM Adapter (Gemini, Claude, DeepSeek, Local)                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Arxitekturasi (High-Performance 3D & Local-First PWA)

Frontend 6 yil davomida mobil telefonlarda ham, planshet va noutbuklarda ham yengil, chaqqon va xotira sizib chiqmaydigan (memory-leak free) bo'lishi shart.

### 3.1 Uch Qatlamli Frontend Tuzilmasi

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (UI & Interaction)                              │
│    - Vanilla JS / Web Components (yoki yengil reaktiv wrapper)         │
│    - CSS Custom Properties (Theme, Design Tokens)                      │
│    - Responsive Mobile-First & Touch Gestures                          │
├────────────────────────────────────────────────────────────────────────┤
│ 2. 3D & Graphics Subsystem (Three.js / WebGPU Ready)                   │
│    - Panelli haqiqiy 3D yig'ish (kub emas, haqiqiy detallar)          │
│    - PBR Materiallar va tekstura xaritalari (albedo, roughness)        │
│    - Qat'iy Dispose boshqaruvi (geometriya va material tozalash)       │
│    - WebXR (VR rejim) va GLTFExporter (GLB yuklash)                    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Core Engine (Web Worker / Sof Matematika)                           │
│    - expr.js (AST formula parsyeri)                                    │
│    - cutlist.js (detallashtirish va slotlar)                           │
│    - nesting.js (og'ir raskroy hisoblarini UI'dan alohida oqimda qilish│
│    - rules.js (deterministik geometrik validator)                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Web Worker orqali Kroy va Geometriya Hisobi
Katta oshxona yoki garderobda 150–300 ta detal bo'lishi mumkin. Ularni brauzerning asosiy oqimida (Main Thread) kroy qilish brauzerni 2-3 soniyaga "qotirib" (freeze) qo'yadi.
* **Qoida:** Barcha og'ir hisob-kitoblar (`cutlist`, `nesting`, `dxf/gcode generatsiyasi`) **Web Worker** ichida bajariladi.
* **Natija:** Foydalanuvchi interfeysi doim 60 FPS silliqlikda ishlaydi, kamera va 3D harakat hech qachon to'xtamaydi.

### 3.3 Three.js Xotira Boshqaruvi (Memory Leak Oldini Olish)
Three.js dasturlarining eng katta dardi — uzoq ishlaganda (masalan, usta kun bo'yi 10 ta xona chizganda) xotira to'lib, brauzerning qulashi (OOM Crash).
* **Qoida:** Har bir mebel o'chirilganda yoki o'lchami o'zgarganda uning geometriyasi va materiallari to'liq rekursiv tarzda yo'q qilinadi:
  ```javascript
  function disposeHierarchy(obj) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => disposeMaterial(m));
        else disposeMaterial(child.material);
      }
    });
  }
  function disposeMaterial(mat) {
    Object.keys(mat).forEach(prop => {
      if (mat[prop] && typeof mat[prop].dispose === 'function') mat[prop].dispose();
    });
    mat.dispose();
  }
  ```

---

## 4. Backend va Infratuzilma Arxitekturasi (99.99% Uptime & Masshtablilik)

Backend arxitekturasi 100 000+ aktiv sexlar va 1 000 000+ buyurtmalarga bardosh beruvchi **Modular Monolith** tamoyilida quriladi.

```
                             [ DNS / Cloudflare CDN ]
                                        │
                                        ▼
                           [ Nginx Reverse Proxy / SSL ]
                             (Rate Limit + Compression)
                                        │
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
         [ Node.js Worker #1 ]                     [ Node.js Worker #N ]
         (Cluster Mode / PM2)                      (Cluster Mode / PM2)
         - REST API + Auth                         - REST API + Auth
         - WebSocket Hub                           - WebSocket Hub
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │
               ┌────────────────────────┼────────────────────────┐
               ▼                        ▼                        ▼
      [ PostgreSQL Cluster ]     [ Redis Cluster ]        [ S3 / MinIO ]
      - Primary (Write)          - Cache (TTL 5m)         - 3D Modellar (GLB)
      - Read Replica             - Pub/Sub (WS sync)      - Stanok fayllari (ZIP)
      - Connection Pooling       - Distributed Lock       - Rasm va Renderlar
      - Row-Level Security       - BullMQ Job Queue
```

### 4.1 Asinxron Vazifalar Navbati (Job Queues — BullMQ)
Og'ir vazifalar HTTP so'rovida qilinmaydi:
1. **Foto-render:** Foydalanuvchi "Render" bosganda server `job_id` beradi. Serverdagi Blender worker fonda renderni bajaradi va tayyor bo'lgach WebSocket orqali xabar beradi.
2. **Katta Kroy va Eksport:** 500+ detallik sex buyurtmasining PDF kroy kartalari va CNC fayllari alohida workerda ZIP qilib yig'iladi.

### 4.2 DB Connection Pooling va Zero-Downtime Migration
* `pg-pool` orqali ulanishlar soni chegaralanadi (har bir workerga 20 ta).
* Ma'lumotlar bazasi migratsiyalari (`schema.sql`) faqat orqaga mos (backward-compatible) uslubda yoziladi: ustun o'chirish taqiqlanadi, faqat qo'shish va bosqichma-bosqich o'tish (Zero-downtime Blue/Green deploys).

---

## 5. Kiberxavfsizlik va Korxona Mudofaasi (Enterprise Security)

6 yil davomida buzilmaslik uchun quyidagi xavfsizlik choralari majburiy qilinadi:

### 5.1 Multi-Tenancy va Row-Level Security (RLS)
Har bir so'rovda `org_id` (sex identifikatori) qat'iy tekshiriladi.
PostgreSQL darajasida Row-Level Security yoqiladi:
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_org_isolation ON projects
  USING (org_id = current_setting('app.current_org_id')::uuid);
```
Dasturchi kodi xato qilib `WHERE org_id = ...` ni unutib qo'ysa ham, **baza darajasida begona sex ma'lumotlarini o'qish imkonsiz bo'ladi**.

### 5.2 Autentifikatsiya va Sessiyalar
* **Access Token:** Qisqa muddatli JWT (15 daqiqa), xotirada saqlanadi.
* **Refresh Token:** Uzoq muddatli (30 kun), `HttpOnly`, `Secure`, `SameSite=Strict` cookie ichida saqlanadi. Har safar yangilanishda rotatsiya qilinadi (eski refresh token darhol bekor bo'ladi).
* **Parollar:** `bcrypt` (12 rounds) yoki `argon2id`.

### 5.3 OWASP Top 10 Mudofaasi
* **SQL Injection:** 100% barcha so'rovlar faqat parametrlangan (Prepared Statements). String concatenation taqiqlanadi.
* **XSS:** DOM-ga matn kiritishda faqat `textContent` yoki sanitizatsiya qilingan template (`DOMPurify`).
* **Input Validation (Zod):** Har bir API endpoint kiruvchi JSON-ni qat'iy Zod schema orqali tekshiradi. Ortiqcha yoki kutilmagan parametrlar rad etiladi (`strip / strict`).
* **CSRF va Clickjacking:** `helmet` orqali `X-Frame-Options: DENY`, `Content-Security-Policy` (CSP) qat'iy sozlanadi.
* **DDoS & Brute Force:** `express-rate-limit` + Redis orqali har bir IP va har bir hisob uchun so'rovlar soni cheklanadi (Auth: 15 daqiqada 10 marta, API: daqiqasiga 100 marta).

---

## 6. Mebel Hisoblash Yadrosi (Domain Engines Specification)

### 6.1 Xavfsiz Matematik Parser (`expr.js`)
* **Talab:** `eval` va `Function(...)` butunlay yo'q qilinadi.
* **Arxitektura:** Shunting-Yard algoritmi asosidagi leksik tahlilchi va AST (Abstract Syntax Tree) ijrochisi.
* **Imkoniyat:**
  * O'zgaruvchilar: `w`, `d`, `h`, `t` (korpus qalinligi), `slots`.
  * Shartli amallar: `w > 600 ? 2 : 1`, `(w - 2 * t) / 2`.
  * Natija har doim cheklangan raqam (`isFinite`) va butun songa yaxlitlangan bo'lishi shart.

### 6.2 Ko'p Slotli Modul Konstruksiyasi
Mebel quyidagi slotlarga ega bo'ladi:
```json
{
  "slots": {
    "korpus": { "material": "LDSP18", "thickness": 18, "edge": "PVC04" },
    "fasad": { "material": "AGT18", "thickness": 18, "edge": "PVC2" },
    "orqa": { "material": "HDF3", "thickness": 3, "edge": null },
    "polka": { "material": "LDSP18", "thickness": 18, "edge": "PVC04" }
  }
}
```
Har bir detal qaysi slotga tegishli ekanligini biladi va shu slotning qalinligi $t$ hamda material narxini avtomatik oladi.

### 6.3 Stanok Post-prosessor Plugin Tizimi (CAM Plugins)
Yangi stanok qo'shish arxitekturasi:
```javascript
// PostProcessor interfeysi
class BasePostProcessor {
  constructor(options) { this.options = options; }
  generate(nestResult, cutlists) { throw new Error('Not implemented'); }
}

// Pluginlar:
// - AltendorfSawProcessor (Kroy kartasi + qirqim ketma-ketligi)
// - HolzmaSawProcessor (PTX / SAW formati)
// - BiesseRoverProcessor (.cix / .bpp)
// - WoodWOPProcessor (.mpr)
// - ExcellonDrillProcessor (.nc)
// - IsoGCodeProcessor (.nc / Fanuc)
```
Tizimga yangi stanok qo'shish faqat bitta yangi Processor klassini yozish bilan hal bo'ladi. Mavjud kod bazasi o'zgarmaydi (Open/Closed Principle).

---

## 7. Ishonchlilik, Monitoring va Avariyadan Qutqarish (Disaster Recovery)

6 yil davomida kutilmagan nosozliklar yuz berganda xizmat to'xtab qolmasligi uchun:

1. **Circuit Breaker Pattern:**
   Agar ERP API yoki tashqi xizmat javob bermay qolsa, Circuit Breaker 5 ta xatodan keyin ochiladi va tizim keshdagi oxirgi narxlar bilan ishlashni davom ettiradi. Tizim qotib qolmaydi.
2. **Prometheus & Grafana Monitoring:**
   Har bir so'rov davomiyligi, xotira sarfi, faol WebSocket foydalanuvchilari va sekin so'rovlar real vaqtda kuzatiladi.
3. **Avtomatik Zaxira (Backup) Strategiyasi:**
   * PostgreSQL WAL (Write-Ahead Logging) orqali Point-In-Time Recovery (PITR) — har qanday soniyadagi holatga qaytish imkoniyati.
   * Har 24 soatda to'liq shifrlangan DB dump avtomatik tarzda tashqi bulut omboriga (Cloudflare R2 / AWS S3) yuboriladi.

---

## 8. 6 Yillik Texnik Yo'l Xaritasi (2026–2032)

```
2026 Q4 (Poydevor):
- Xavfsiz AST parser, Haqiqiy tannarx smetasi, Kroy Trim va Tekstura nazorati
- Freza radiusi offseti va CNC xavfsizligi, Server paketlarini tozalash

2027 (Kengayish & Barqarorlik):
- 600 ta to'liq modul kutubxonasi, Biesse Rover (.cix) va WoodWOP (.mpr) post-prosessorlari
- Slotlar arxitekturasi va haqiqiy panelli 3D vizualizatsiya
- Multi-order batch nesting va delovoy qoldiqlar ombori

2028 (AI & Avtomatlashtirish):
- Usta bilan ovozli erkin muloqot (STT/TTS server proxy)
- L-shaklli, U-shaklli va orolli mebel loyihalarini avtomatik generatsiya qilish
- Foto-render server worker (1080p / 360° panorama)

2029–2032 (Ekosistema & Global Raqobat):
- WebGPU 3D yorug'lik va materiallar (brauzerda fotorealistik real-time render)
- Sunpina uslubidagi to'liq zavod integratsiyasi (avtomatik stanok navbatlari, konveyer skanerlari)
- Xalqaro bozorga chiqish (ko'p tilli, ko'p valyutali xalqaro mebel SaaS)
```

---

*Ushbu hujjat Smart3D tizimining uzoq muddatli barqarorligi va texnik ustunligini ta'minlovchi asosiy strategik arxitektura qo'llanmasidir.*
