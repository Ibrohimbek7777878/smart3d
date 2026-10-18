/* Smart3D xato kodlari — BITTA MANBA (TZ-19 §2). Server (server/index.js), yangi sayt (web/) va eski sayt shuni ishlatadi.
 *
 * Shakl: S3D-<BO'LIM>-<NNN>. 001–099 — server, 101–199 — brauzer. Kod o'zgarmaydi (qo'llab-quvvatlash va jurnal uchun);
 * eskirsa — o'chirilmaydi, "eski" deb belgilanadi. Matn — foydalanuvchiga ko'rinadigan o'zbekcha izoh.
 *   AUTH kirish, sessiya   PROJ loyihalar   SET sozlamalar   STD sex standartlari   CALC hisob   EXP fayllar
 *   SCENE 3D   AI AI va ovoz   KONS avtomatik konstruktor   BAZIS Bazis fayli   TG Telegram Mini App   DATA ma'lumot   NET tarmoq
 *   VAL kiritish   RATE cheklov   SRV server   UI ekran   LOG jurnal */
export const XATOLAR = {
  /* ── server ── */
  'S3D-AUTH-001': { http: 401, matn: 'Email yoki parol noto\'g\'ri' },
  'S3D-AUTH-002': { http: 409, matn: 'Email allaqachon bor' },
  'S3D-AUTH-003': { http: 409, matn: 'Bu telefon bilan akkaunt bor' },
  'S3D-AUTH-004': { http: 401, matn: 'Token yo\'q' },
  'S3D-AUTH-005': { http: 401, matn: 'Token yaroqsiz' },
  'S3D-AUTH-006': { http: 403, matn: 'Admin kerak' },
  'S3D-AUTH-007': { http: 404, matn: 'Foydalanuvchi topilmadi' },
  'S3D-AUTH-008': { http: 423, matn: 'Ko\'p xato urinish — akkaunt 15 daqiqaga bloklandi' },
  'S3D-AUTH-009': { http: 403, matn: 'So\'rov boshqa saytdan keldi — rad etildi' },
  'S3D-AUTH-010': { http: 503, matn: 'SMS xizmati hali sozlanmagan' },
  'S3D-AUTH-011': { http: 502, matn: 'SMS yuborilmadi — keyinroq qayta urinib ko\'ring' },
  'S3D-AUTH-012': { http: 429, matn: 'Kod yaqinda yuborildi — 1 daqiqadan keyin qayta urinib ko\'ring' },
  'S3D-AUTH-013': { http: 400, matn: 'Kod eskirgan — qayta yuboring' },
  'S3D-AUTH-014': { http: 429, matn: 'Urinishlar tugadi — yangi kod so\'rang' },
  'S3D-AUTH-015': { http: 400, matn: 'Kod noto\'g\'ri' },
  'S3D-AUTH-016': { http: 503, matn: 'Google bilan kirish hali sozlanmagan' },
  'S3D-AUTH-017': { http: 401, matn: 'Google tasdiqlamadi — qayta urinib ko\'ring' },
  'S3D-AUTH-018': { http: 409, matn: 'Bu email boshqa Google akkauntga bog\'langan' },
  'S3D-AUTH-019': { http: 403, matn: 'Google emaili tasdiqlanmagan' },
  'S3D-AUTH-020': { http: 502, matn: 'Google bilan aloqa bo\'lmadi — keyinroq urinib ko\'ring' },
  'S3D-PROJ-001': { http: 404, matn: 'Loyiha topilmadi' },
  'S3D-DATA-001': { http: 404, matn: 'Topilmadi' },
  'S3D-STD-001': { http: 404, matn: 'Standartlar topilmadi' },
  /* TZ-20: narx stavkalari (Sozlamalar → Narxlar) */
  'S3D-NARX-001': { http: 400, matn: 'Narx stavkasi noto\'g\'ri' },
  'S3D-NARX-002': { http: 500, matn: 'Narx stavkalari bazada buzilgan — boshlang\'ich qiymat ishlatildi' },
  /* TZ-24 B: shaxsiy shablonlar */
  'S3D-SHB-001': { http: 404, matn: 'Shablon topilmadi' },
  'S3D-SHB-002': { http: 409, matn: 'Shablonlar ko\'p — 100 tagacha; keraksizini o\'chiring' },
  'S3D-SHB-101': { matn: 'Shablon saqlanmadi' },
  /* TZ-23 C1 (egasi #138): buyurtmalar */
  'S3D-ORD-001': { http: 400, matn: 'Buyurtma holati noto\'g\'ri' },
  'S3D-ORD-101': { matn: 'Buyurtma yuborilmadi' },
  'S3D-AI-001': { http: 503, matn: 'AI sozlanmagan — qoidali tahlilchi ishlaydi' },
  'S3D-AI-002': { http: 502, matn: 'AI javob bermadi — qoidali tahlilchi ishlaydi' },
  'S3D-AI-003': { http: 501, matn: 'Server ovoz tanish (STT) hali ulanmagan — brauzer ovozidan foydalaning' },
  'S3D-VAL-001': { http: 400, matn: 'Kiritilgan qiymat noto\'g\'ri' },
  'S3D-VAL-002': { http: 400, matn: 'JSON noto\'g\'ri' },
  'S3D-VAL-003': { http: 413, matn: 'So\'rov juda katta' },
  'S3D-RATE-001': { http: 429, matn: 'Urinishlar juda ko\'p — keyinroq qayta urinib ko\'ring' },
  'S3D-SRV-001': { http: 500, matn: 'Server xatosi' },
  'S3D-SRV-002': { http: 404, matn: 'Topilmadi' },
  'S3D-LOG-001': { http: 400, matn: 'Jurnal yozuvi noto\'g\'ri' },
  /* TZ-16: Telegram Mini App */
  'S3D-TG-001': { http: 503, matn: 'Telegram ulanmagan — bot kaliti serverda yo\'q' },
  'S3D-TG-002': { http: 401, matn: 'Telegram ma\'lumoti tasdiqlanmadi — ilovani botdan qayta oching' },
  'S3D-TG-003': { http: 403, matn: 'Webhook kaliti noto\'g\'ri' },
  'S3D-TG-004': { http: 403, matn: 'Bu akkaunt Telegram\'ga ulanmagan' },
  'S3D-TG-005': { http: 502, matn: 'Fayl Telegram\'ga yuborilmadi — keyinroq urinib ko\'ring' },
  'S3D-TG-006': { http: 409, matn: 'Bu akkaunt boshqa Telegram\'ga ulangan' },
  'S3D-TG-007': { http: 400, matn: 'Fayl turi yoki hajmi ruxsat etilmagan (10 MB gacha)' },

  /* ── brauzer ── */
  'S3D-NET-101': { matn: 'Server bilan aloqa yo\'q — internetni tekshiring' },
  'S3D-TG-101': { matn: 'Telegram bilan ulanib bo\'lmadi — ilovani botdan qayta oching' },
  'S3D-NET-102': { matn: 'Server javob bermadi (vaqt tugadi) — qayta urinib ko\'ring' },
  'S3D-DATA-101': { matn: 'Ma\'lumot yuklanmadi — internetni tekshiring' },
  'S3D-CALC-101': { matn: 'Hisoblashda xato — narx yangilanmadi' },
  'S3D-EXP-101': { matn: 'Fayl yaratilmadi' },
  /* TZ-33 A: SketchUp eksporti */
  'S3D-EXP-102': { matn: 'SketchUp (.skp) fayli yaratilmadi' },
  'S3D-EXP-103': { matn: 'SketchUp eksporti yuklanmadi — internetni tekshirib, qayta urinib ko\'ring' },
  'S3D-EXP-104': { matn: 'SketchUp Pro (.dae) fayli yaratilmadi' },
  'S3D-SCENE-101': { matn: '3D sahna ochilmadi' },
  'S3D-SCENE-102': { matn: '3D ko\'rinish ochilmadi' },
  'S3D-AI-101': { matn: 'AI xato' },
  'S3D-AI-102': { matn: 'Ovoz xatosi' },
  'S3D-KONS-101': { matn: 'Avtomatik konstruksiya: xona devorlari aniqlanmadi' },
  'S3D-KONS-102': { matn: 'Avtomatik konstruksiya: katalogda kerakli modul yo\'q' },
  'S3D-KONS-103': { matn: 'Avtomatik konstruksiya: bu xonaga oshxona sig\'madi' },
  'S3D-KONS-104': { matn: 'Avtomatik konstruksiyada xato' },
  'S3D-BAZIS-101': { matn: 'Bu Bazis fayli emas — .b3d, .fr3d yoki .bpj tanlang' },
  'S3D-BAZIS-102': { matn: 'Bazis fayli shifrlangan — Bazis\'da shifrsiz saqlab qayta yuklang' },
  'S3D-BAZIS-103': { matn: 'Bazis fayli o\'qilmadi' },
  'S3D-BAZIS-104': { matn: 'Bazis faylida detal topilmadi' },
  'S3D-BAZIS-105': { matn: 'Bazis fayli juda uzoq o\'qildi — to\'xtatildi' },
  'S3D-BAZIS-106': { matn: 'Fayl juda katta (50 MB dan ortiq)' },
  'S3D-PROJ-101': { matn: 'Bu Smart3D loyiha fayli emas' },
  'S3D-SET-101': { matn: 'Sozlama saqlanmadi' },
  'S3D-REM-101': { matn: 'Qoldiqlar ombori o\'qilmadi' },
  'S3D-REM-102': { matn: 'Qoldiq saqlanmadi' },
  'S3D-NARX-101': { matn: 'Narx stavkalari saqlanmadi' },
  'S3D-NARX-102': { matn: 'Sex xizmat jadvali o\'qilmadi — Xizmat_narxlari.xlsx (ID, Kod, Nomi, Kategoriya, …, Mijoz narxi) tanlang' },
  'S3D-NARX-103': { matn: 'Narx stavkalari serverdan o\'qilmadi — fayldagi taxminiy qiymatlar ishlatilmoqda' },
  'S3D-UI-101': { matn: 'Bu bo\'limda xatolik yuz berdi' },
  'S3D-UI-102': { matn: 'Sahifa ochilmadi — qayta urinib ko\'ring' },          // TZ-30: manzil (/loyiha/5 …) ochilmadi
  'S3D-JS-101': { matn: 'Kutilmagan xato' },
  'S3D-JS-102': { matn: 'Kutilmagan xato (jarayon)' }
};

export const KOD_RE = /^S3D-[A-Z]{2,6}-\d{3}$/;

/** foydalanuvchiga: "matn · S3D-…" */
export const xatoMatn = (code, matn) => (matn || (XATOLAR[code] && XATOLAR[code].matn) || 'Xato') + (code ? ' · ' + code : '');
