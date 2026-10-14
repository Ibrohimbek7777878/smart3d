# Sunpin K20 — olingan ma'lumotlar (SUNPIN-DATALAR-2)

> **Sana:** 2026-10-12 · **Manba:** `yfk20.com` (圆方K20设计系统 — Yuanfang K20)
> **Kirish:** login `designer01d5i` · SP brendi · 部: 尚品海外部/乌兹别克斯坦 (Shangpin Overseas / Uzbekistan)
> **Versiya:** K20 v3.3.28.0 (2026-09-21 build)

## Nima olindi (`data/` papkasi)

| Fayl | Hajm | Nima | Soni |
|---|---|---|---|
| `k20-xpro-all.json` | 8.7 MB | **Komponentlar katalogi** — dir1..dir5, name, modelno, w/d/h, min/max chegaralar, rasm URL | **6503** |
| `k20-models.json` | 728 KB | **3D model tafsilotlari** — **GLB URL**, cover, 2D rasm, narx maydonlari (price/referencePrice/exFactoryPrice/sellingPrice), o'lcham, material | **262** |
| `k20-goods.json` | 320 KB | **Do'kon tovarlari** — title, narx, modelId, brend, shop | **274** (38 ta narxli) |
| `k20-textureCeramic.json` | 120 KB | **PBR teksturalar** (kafel) — rang, normal/reflect/roughness maplar | 99 |
| `k20-zx-catalog.json` | 28 KB | **Katalog daraxti** — 5 top-level, 1124 barg | 5 bo'lim |
| `k20-categories.json` | 5 KB | Do'kon kategoriyalari daraxti | 2 top |
| `k20-models / getModel` | — | Bitta modelning to'liq tuzilmasi (namuna) | 1 |
| `k20-p-designListT1.json` | 1 KB | **Narx paketi** — pricingMode, price=99, originalPrice=999, maxArea=100/180 | 1 |
| `k20-zx-bimCatalog.json` | 1 KB | BIM mahsulot katalogi (sanitariya, jihozlar) | 14 tur |

### katalog bo'yicha (`k20-xpro-all.json`)
| dir1 (bo'lim) | Soni |
|---|---|
| 衣柜 (Shkaf/Garderob) | 3801 |
| 厨柜 (Oshxona) | 2043 |
| 组件库 (Komponentlar) | 482 |
| 卫浴 (Hammom) | 173 |
| 地脚 (Poydevor) | 4 |
| **JAMI** | **6503** |

Komponent maydonlari: `id, dir1..dir5, name, modelno, w, d, h, w_min/max, d_min/max, h_min/max, price, pic, mirror_modelno, explode, isframe, spzp, wayes, homkoo`

## API mexanizmi (Smart 3D uchun qayta ishlatish mumkin)

### 1. Auth
```
POST /yg/api/admin/utility   (www.yfk20.com, cookie + header)
Headers: { Authorization: "Bearer <sessionStorage.token>" }   # 32 belgi
```
Token login'dan so'ng `sessionStorage.token` da saqlanadi.
Foydalanuvchi profili: `sessionStorage.user` → `{cid, brd, dept0..dept3, ...}`

### 2. Katalog (do'kon)
```json
{ "action": "reqKShop", "url": "/api/design/category/list", "method": "post" }
{ "action": "reqKShop", "url": "/api/design/goods/page", "method": "post",
  "params": { "page": 1, "pageSize": 50, "goodsType": 1, "specParams": "" } }
```

### 3. Komponentlar (asosiy katalog!)
```json
{ "action": "reqzx1080", "url": "/xdb/xpro/catalog", "method": "get",
  "params": { "brand": "SP" } }

{ "action": "reqzx1080", "url": "/xdb/xpro/list", "method": "get",
  "params": { "brand": "SP", "sjs": "<cid>", "page": 1, "per_page": 100,
              "dir1": "衣柜", "dir2": "...", "dir3": "...", "width": "", "depth": "", "height": "" } }
```
Javob: `{retdata: {current_page, data: [...], last_page}}`

### 4. 3D modellar (GLB)
```
POST https://japi.yfway.com/k20/x/model/get-all-by-modelId
Body: { "ids": ["31000100", "31000105", ...] }   # 50 tadan batch
Javob: data[] → { modelId, gltfUrl, twodPicUrl, coverUrl, price, referencePrice,
                  exFactoryPrice, sellingPrice, sizex/y/z, material, cabinetType, textures[] }
```
GLB to'g'ridan-to'g'ri yuklab olinadi (COS storage, autentifikatsiyasiz).

### 5. Narx hisoblash
```json
{ "action": "reqdwss", "url": "/order/k20/config/design/list", "method": "post",
  "params": { "brandId": 1, "type": 1, "page": 1, "pageSize": 100,
              "deptLevel1Id": "<dept0>", ..., "deptLevel4Id": "<dept3>" } }

{ "action": "reqdwss", "url": "/order/k20/total/price", "method": "post",
  "params": { "designTypePrice": 99, "pricingMode": 2, "minimumCharge": 0,
              "roomBuildingArea": 100, "additionList": [] } }
```
Javob: `{retdata: {data: {totalPrice, minimumCharge}}}`

### 6. Teksturalar (japi — cookie bilan)
```
GET https://japi.yfway.com/k20/x/texture/edit/data?category1=瓷砖&vender=0
```

## Proxy action'lari (`yg/api/admin/utility`)
| action | Backend |
|---|---|
| `reqKShop` | `/api/design/*` — do'kon (tovar, kategoriya, brend) |
| `reqzx1080` | `/xdb/*` — komponentlar katalogi (xpro, bim) |
| `reqdwss` | `/order/k20/*` — buyurtma, narx, konfiguratsiya |
| `reqmjs` | miniprogram — **VR add**, `mj/life/scheme_ai` (AI sxema) |
| `reqalgos` | algoritm — **`ai-singlelayout`** (AI avto-layout), scale, view |
| `reqcrs` | task/research |
| `reqfbs` | fikr-mulohaza |
| `reqds` | `yf-shop` PHP (smart_share) |

## Muhim endpointlar ro'yxati (bundle'dan)
- `/xdb/xpro/catalog`, `/xdb/xpro/list`, `/xdb/xpro/property/list`, `/xdb/xpro/bookmark`
- `/xdb/bim/product/catalog`, `/xdb/bim/product/list`, `/xdb/bim/door/catalog`, `/xdb/bim/door/list`
- `/k20/x/model/get-all-by-modelId`, `/k20/model-tag/list`, `/k20/product/modelid`
- `/api/design/goods/page`, `/api/design/category/list`, `/api/design/param/filter`
- `/order/k20/total/price`, `/order/k20/config/design/list`, `/order/k20/config/room/list`
- `/order/k20/order/page`, `/order/k20/list/coupon`, `/order/k20/magicCube/list`
- AI: `ai-singlelayout`, `scheme_ai`, VR: `/miniprogram_public/qj/vr/add`

## Xulosalar Smart 3D uchun
1. **6503 komponent + 1124 katalog bargi** — Smart 3D modul katalogini to'ldirish uchun tayyor (tz §2)
2. **GLB modellar (262 ta)** — 3D ko'rsatish uchun to'g'ridan-to'g'ri ishlatish mumkin (masalan litsenziyani tekshirish shart!)
3. **Narx mexanizmi** — pricingMode/minimumCharge/maxArea modeli Smart 3D tz §3/§5 ga mos
4. **AI endpointlar** — ai-singlelayout, scheme_ai (tz §6: AI kiritish uchun tayyor misol)
5. **Komponentlarda `price` deyarli null** — narx shu hisobda emas, boshqa narx motorida (quote/order). `price: null` → narx quote jarayonida hisoblanadi.

---

## Qo'shimcha tahlil (2026-10-14)

### K20 katalog tuzilishi (`k20-xpro-all.json` dan)
- 6503 komponentdan **5413 tasi parametrik** (eni/bo'yi/chuqurligi uchun min–max oralig'i bor) — Smart3D fragmentlaridagi `min_w/max_w` g'oyasi bilan bir xil.
- **Oshxona (厨柜, 2043):** 新厨柜 oshxona 678 · 新阳台柜 balkon shkafi 494 · 新免拉手厨柜 tutqichsiz oshxona 347 · 电器 texnika 239 · 五金 furnitura 93 · 通用板件 umumiy panellar 79 · 星盆龙头 rakovina/kran 71.
- **Shkaf (衣柜, 3801):** I基础定制 asosiy 1878 · II客餐厅 mehmonxona/oshxona-zal 580 · 灵感柜框架 karkas 304 · 掩门衣柜 ochiladigan eshikli 290 · III卧室 yotoqxona 287 · V功能房 funksional xona 130 · 趟门衣柜 kupe 91 · IV儿童房 bolalar 44.
- **Katalogda detallar ro'yxati (拆单/BOM) YO'Q** — faqat tashqi gabarit va min/max. Modulni detallarga bo'lish qoidalari Sunpina zavod tizimida turadi, dizayner akkauntiga chiqmaydi (tasdiqlanmagan — saytga kirib tekshirilmadi).
- `k20-models.json` dagi 262 modelning hech birida narx maydoni to'ldirilmagan; 262 tasida GLB bor. **GLB modellarni o'z mahsulotimizda ishlatishdan oldin Sunpina'dan ruxsat olish kerak.**

### Sunpina ish jarayoni (YouTube @sunpina, 183 video, RSS tavsiflaridan)
1. **Zamer:** o'z 3D lazer skaneri — xonani 10 daqiqa aylanib chiqadi → 2D CAD reja → bir tugma bilan K20 3D xona (xato ≤ 10 mm).
2. **Dizayn:** K20 dasturi + "AI 设计工厂" (AI dizayn fabrikasi) → 24 soatda dizayn va narx taklifi. "AI Snapshot 2.0" — render 30 soniyada.
3. **Narx:** dizayndan darhol (instant quote).
4. **Ishlab chiqarish:** dizayn to'g'ridan-to'g'ri zavodga ketadi ("AI-powered production") — avtomatik kroy ±0,2 mm, avtomatik kromka, har panel sifat nazorati.
5. **Logistika:** har paketda QR, packing list, konteynerga yuklashda QR skanerlanadi.
6. **Montaj:** "安装宝" (Install Assistant) ilovasi, shkaf qismlarini saralash va yig'ish bo'yicha video yo'riqnomalar.

**Xulosa:** Sunpina Bazis'siz ishlaydi, chunki kutubxonadagi har bir modul oldindan muhandislik qilingan (detallar formulasi zavod tizimida). Dizayner faqat modul qo'yadi, detallar ro'yxati, kroy va stanok fayllari avtomatik chiqadi. Smart3D'dagi `fragments.json` yondashuvi aynan shu — asosiy ish 600 ta modulni formulali qilib kiritish.

Muhim videolar: `2hnN3ivnLcQ` (skaner + K20 to'liq jarayon), `ohjyVJXf690` (K20 o'qitish, 2 soat, ingliz tilida, oshxona), `dxEpIPXx_SI` (kabinetni saralash va montaj), `jBDT9SB4dGo` (QR va packing list). To'liq havola: `https://www.youtube.com/watch?v=<ID>`.
