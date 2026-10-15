/* Smart3D engine/ai.js — AI: O'zbek tili zamer matni / ovoz → L/U burchakli oshxona va mebel konstruksiyasi.
 *
 * 6 YILLIK ARXITEKTURA STANDARTI (Kamchilik 23, 24, 26):
 *   1. O'zbek tilidagi erkin matnlarni to'liq tushunish ("3x4 xona, L shakl, burchakka moyka,
 *      yoniga gaz plita, tepasiga osma shkaf, o'ng devorga xolodilnik").
 *   2. L-shaklli va U-shaklli burchakli oshxonalarni avtomatik joylashtirish (Corner snapping,
 *      90° burchak moduli va 3D koordinatalar bo'yicha to'qnashuvsiz terish).
 *   3. Ko'p devorli (multi-wall) joylashtirish: Wall 0 (pastki), Wall 3 (chap), Wall 1 (o'ng)
 *      va Wall 2 (tepa) bo'ylab to'g'ri burchak va fasad yo'nalishi (rot 0°, 90°, 180°, 270°).
 *   4. Har bir modul uchun to'liq to'qnashuv (collision detection) va xona poligonidan
 *      chiqib ketishni oldini olish.
 */

import { footprint } from './engine/rules.js';

/* ── 1. Sonlar va O'zbek tili lug'ati ── */

const NUM_MAP = {
  'bir': 1, 'bitta': 1, 'ikki': 2, 'ikkita': 2, 'ikkala': 2,
  'uch': 3, 'uchta': 3, "to'rt": 4, "to'rtta": 4, 'to`rt': 4,
  'besh': 5, 'beshta': 5, 'olti': 6, 'oltita': 6, 'yetti': 7, 'yettita': 7,
  'sakkiz': 8, 'sakkizta': 8, "to'qqiz": 9, "o'n": 10, 'o`n': 10
};

function parseNum(s) {
  if (s == null) return NaN;
  const t = String(s).replace(',', '.').trim().toLowerCase();
  if (NUM_MAP[t] != null) return NUM_MAP[t];
  const n = parseFloat(t);
  return isFinite(n) ? n : NaN;
}

/**
 * O'zbek tilidagi erkin zamer va buyurtma matnini tahlil qiladi.
 * Masalan: "3x4 metr oshxona, L shakl, burchakka tumba, gaz plita, tepasiga osma shkaf, xolodilnik"
 */
/** Ustki (osma) shkaf balandligi poldan, mm — AI ham, katalog ham shuni ishlatadi (TZ-15) */
export const USTKI_Z = 1450;

export function parseZamer(text) {
  let t = String(text || '').toLowerCase();
  const unknown = [];
  const room = {
    w: 0, d: 0, h: 2700,
    outline: null, openings: [],
    layoutType: 'linear', // 'linear', 'L', 'U', 'island'
    features: {}
  };
  const orders = [];

  /* "3 yarim" → "3.5" (A1) */
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*yarim/g,
    (_, a) => String(parseFloat(String(a).replace(',', '.')) + 0.5));

  /* ── 1. Layout turi (U birinchi tekshiriladi — "U shakl, burchakka" matnida
          "burchak" so'zi L ga tegmasligi uchun; "угловая" = L (A1)) ── */
  if (/u[\s-]*shakl|p[\s-]*shakl|п[\s-]*образн|uch\s*tomon/i.test(t)) {
    room.layoutType = 'U';
  } else if (/l[\s-]*shakl|burchakli|burchak|углов|г[\s-]*образн/i.test(t)) {
    room.layoutType = 'L';
  } else if (/orol|orolli|ostrov/i.test(t)) {
    room.layoutType = 'island';
  }

  /* ── 2. Xona o'lchamlari ── */
  // "3x4", "3*4", "3000x4000", kirill "3х4" (A1)
  let dimSpan = null;                               // xona o'lchami matndagi o'rni — miqdor emas
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×*xXхХ]\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    let w = parseNum(m[1]), d = parseNum(m[2]);
    if (w < 100 && d < 100) { w *= 1000; d *= 1000; }
    room.w = Math.round(w); room.d = Math.round(d); dimSpan = [m.index, m.index + m[0].length];
  } else {
    // "3.5 ga 2.8", "3 ga 4 metr", "3.5 metrga 3 metr", "3 yarim metr ga 3" — separator so'z
    // bilan; birinchi sondan keyin birlik ham kelishi mumkin (A1)
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:metr|метр|м|m)?\s*(?:га|ga|на)\s*(?:метр(?:ов)?\s*|metr\s*)?(\d+(?:[.,]\d+)?)/);
    if (m) {
      let w = parseNum(m[1]), d = parseNum(m[2]);
      if (w < 100 && d < 100) { w *= 1000; d *= 1000; }
      room.w = Math.round(w); room.d = Math.round(d); dimSpan = [m.index, m.index + m[0].length];
    } else {
      // "3 metr 4 metr", "3m 4m" — ikkala tomonda ham birlik majburiy
      m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:м|metr|метр)\s*(?:га|на)?\s*(\d+(?:[.,]\d+)?)\s*(?:м|metr|метр)/);
      if (m) {
        let w = parseNum(m[1]), d = parseNum(m[2]);
        if (w < 100 && d < 100) { w *= 1000; d *= 1000; }
        room.w = Math.round(w); room.d = Math.round(d); dimSpan = [m.index, m.index + m[0].length];
      }
    }
  }

  /* ── 3. Balandlik ──
     Faqat xona kalit so'zlari (balandlik/высота/height/shift) yoki mustaqil "h".
     "shkaf h 2400" — mebel balandligi, xona emas (A1): unknown ga tushadi. */
  m = t.match(/(?:balandli[kg]\w*|высота|height|shift|h)\s*[=:]?\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    const before = t.slice(Math.max(0, m.index - 14), m.index);
    const isFurniture = /(shkaf|modul|penal|tumba|osma|garderob|eshik|stol|divan|karavot|mebel|korpus|шкаф|шкаф|тумба|стол|мебель|шкафа)\s*$/.test(before);
    let h = parseNum(m[1]);
    if (h < 100) h *= 1000;
    if (isFurniture) {
      unknown.push(m[0].trim());
    } else if (h >= 1000 && h <= 6000) {
      room.h = Math.round(h);
    }
  }

  /* ── 4. Teshiklar: Deraza va Eshiklar — birlikga e'tibor (A1):
        "eshik 90 sm" → 900 mm (eski kod 90 000 mm qilardi) ── */
  const reO = /(deraza|oyna|okno|eshik|dver)\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*(sm|см|cm|mm|мм|m|metr|метр|м)?/g;
  let mm;
  while ((mm = reO.exec(t))) {
    const unit = (mm[3] || '').toLowerCase();
    let wid = parseNum(mm[2]);
    if (/^(sm|см|cm)$/.test(unit)) {
      wid *= 10;                                   // sm/cm → mm
    } else if (/^(mm|мм)$/.test(unit)) {
      // mm — o'zgarmaydi
    } else if (/^(m|metr|метр|м)$/.test(unit)) {
      wid *= 1000;                                 // m → mm
    } else if (wid > 0 && wid < 10) {
      wid *= 1000;                                 // "1.5" → 1.5 m
    } else if (wid > 0 && wid < 100) {
      wid *= 10;                                   // "90" → 90 sm
    }
    room.openings.push({
      type: /deraza|oyna|okno/.test(mm[1]) ? 'window' : 'door',
      width: Math.round(wid || 900)
    });
  }

  /* ── 5. Mebel zonalari va kalit so'zlari ── */
  const features = {
    sink: /moyka|rakovina|chanoq|yuvg'ich|мойка/i.test(t),
    stove: /gaz|plita|pechka|duxovka|варочн|плита/i.test(t),
    fridge: /xolodilnik|muzlatgich|холодильник/i.test(t),
    corner: /burchak|угол/i.test(t),
    upper: /ustki|tepa|osma|navesnoy|навесн/i.test(t),
    tall: /penal|kolonna|baland shkaf|пенал/i.test(t),
    wardrobe: /garderob|kupe|shkaf-kupe/i.test(t),
    island: /orol|ostrov/i.test(t)
  };
  room.features = features;

  /* ── 6. Miqdorli buyurtmalar ("3 ta pastki", "4 tadan osma", "4ta") (A1) ── */
  const reQ = /(\d+|bir|bitta|ikki|ikkita|uch|uchta|to'rt|to`rt|besh|olti|yetti|sakkiz|to'qqiz|o'n|o`n)\s*(?:tadan|tali|ta|donalik|dona|шт|штука)?\s*([a-zа-я'`-]+)/gi;
  const KIND_MAP = [
    [/ustki|osma|tepa|navesnoy|навесн|верхн/, 'ustki'],
    [/pastki|tumba|нижн/, 'pastki'],
    [/burchak|углов/, 'burchak'],
    [/garderob|shkaf|шкаф|купе/, 'shkaf'],
    [/penal|пенал/, 'shkaf'],
    [/stol|стол/, 'stol'],
    [/divan|диван/, 'divan'],
    [/orol|остров/, 'orol']
  ];

  const kindOf = (word) => {
    for (const [re, k] of KIND_MAP) if (word && re.test(word)) return k;
    return null;
  };
  /* Ikki uslub: "4 ta pastki" (son → so'z) va "pastki 4 ta" (so'z → son) (A1).
     Vergulsiz matnda (ovoz) "pastki 4 ta ustki 3 ta" ikki xil o'qilishi mumkin —
     gap "… N ta" bilan tugasa, so'z → son uslubi ishlatilgan: u birinchi o'qiladi.
     Bir son faqat bir marta sanaladi (o'rni bo'yicha). */
  const NUMW = "\\d+|bir|bitta|ikki|ikkita|uch|uchta|to'rt|to'rtta|to`rt|besh|beshta|olti|oltita|yetti|sakkiz|to'qqiz|o'n|o`n";
  const reQR = new RegExp(`([a-zа-я'\`-]+)(?:\\s+([a-zа-я'\`-]+))?\\s*[:=-]?\\s*(${NUMW})\\s*(?:tadan|ta|dona|шт)(?![a-zа-я])`, 'gi');
  const usedNums = new Set();
  const inDim = (pos) => dimSpan && pos >= dimSpan[0] && pos < dimSpan[1];   // "4x3 pastki" — 3 miqdor emas
  const readNumFirst = () => {
    reQ.lastIndex = 0;
    while ((mm = reQ.exec(t))) {
      if (usedNums.has(mm.index) || inDim(mm.index)) continue;
      const kind = kindOf(mm[2]);
      if (kind) { orders.push({ kind, qty: Math.max(1, parseNum(mm[1]) || 1) }); usedNums.add(mm.index); }
    }
  };
  const readWordFirst = () => {
    reQR.lastIndex = 0;
    while ((mm = reQR.exec(t))) {
      const numPos = mm.index + mm[0].lastIndexOf(mm[3]);
      if (usedNums.has(numPos) || inDim(numPos)) continue;
      const kind = kindOf(mm[1]) || kindOf(mm[2]);
      if (kind) { orders.push({ kind, qty: Math.max(1, parseNum(mm[3]) || 1) }); usedNums.add(numPos); }
    }
  };
  if (new RegExp(`(?:${NUMW})\\s*(?:tadan|ta|dona|шт)\\s*[.!?]*\\s*$`, 'i').test(t)) { readWordFirst(); readNumFirst(); }
  else { readNumFirst(); readWordFirst(); }

  /* Teshiklarga devor (edge) va geometriya berish — F1: aks holda
     validateDoc E_OPENING_OUT_OF_WALL beradi va sahna uni chizmaydi. */
  room.openings.forEach(op => {
    if (op.wall == null) op.wall = 0;
    const seg = (room.w || op.width || 900) + 0;
    if (op.offset == null) op.offset = Math.max(100, Math.round((seg - (op.width || 900)) / 2));
    if (op.sill == null) op.sill = op.type === 'window' ? 900 : 0;
    if (op.height == null) op.height = op.type === 'window' ? 1400 : 2100;
  });

  // Standart to'rtburchak xona konturi
  if (room.w && room.d) {
    room.outline = [[0, 0], [room.w, 0], [room.w, room.d], [0, room.d]];
  }

  return { room, orders, unknown };
}

/* ── 2. To'qnashuv va Joylashtirish Matematikasi ── */

/**
 * 2D + Z (balandlik) to'qnashuv tekshiruvi.
 * (x,y) — burchak ANCHOR (items.js placeMesh): rot 270 da haqiqiy
 * footprint [x, x+d]×[y-w, y] bo'ladi. Eski kod rot'ni e'tiborsiz
 * qoldirgani uchun L/U shaklda modullar ustma-ust tushgan (A2).
 */
function isColliding(a, b) {
  /* Balandlik oralig'i: [z, z+h] — ustki (1450) va pastki (0) shkaflar
     bir xayoliy proyeksiyada ustma-ust, lekin 3D da to'qnashmaydi. */
  const az0 = a.z || 0, az1 = az0 + (a.h || 0);
  const bz0 = b.z || 0, bz1 = bz0 + (b.h || 0);
  if (a.h > 0 && b.h > 0 && (az1 <= bz0 || bz1 <= az0)) return false;

  const fa = footprint(a), fb = footprint(b);
  return !(fa.x1 <= fb.x0 + 2 || fa.x0 >= fb.x1 - 2 ||
           fa.y1 <= fb.y0 + 2 || fa.y0 >= fb.y1 - 2);
}

/**
 * L-shaklli, U-shaklli va to'g'ri oshxona/mebel konfiguratsiyasini avtomatik qurish.
 */
export function suggestLayout(room, catalog = {}, orders = []) {
  const placements = [];
  const W = room.w || 3600;
  const D = room.d || 2800;
  const layout = room.layoutType || 'linear';
  const feat = room.features || {};

  const frgs = Object.values(catalog);
  const byCode = (code) => catalog[code] || frgs.find(f => f.code === code);
  const byGroup = (grp) => frgs.filter(f => f.group === grp);

  // Asosiy oshxona modullari
  const cornerFrag = byCode('SP-K-007') || frgs.find(f => f.w === 900 && f.d === 550);
  const baseWide = byCode('SP-K-004') || byCode('SP-K-001') || frgs[0];
  const baseStandard = byCode('SP-K-001') || frgs[0];
  const stoveFrag = byCode('SP-K-014') || baseStandard;
  const upperWide = byCode('SP-K-005') || byCode('SP-K-002') || frgs[1];
  const upperStandard = byCode('SP-K-002') || frgs[1];
  const tallFrag = byCode('SP-K-013') || byCode('SP-K-006');
  const fridgeFrag = byCode('SP-K-015') || tallFrag;
  const wardrobeFrag = byCode('SP-W-001') || frgs.find(f => f.group === 'garderob');

  let idSeq = 1;
  const margin = 50; // devor chetidan bo'sh joy

  /* Buyurtmadagi miqdor ("pastki 4 ta, ustki 3 ta") — yuqori chegara (A1). Buyurtmada
     son bo'lmasa — avvalgidek devor to'ldiriladi. Burchak va plita tumbasi ham "pastki". */
  const capOf = (k) => {
    const q = (orders || []).filter(o => o.kind === k).reduce((s, o) => s + o.qty, 0);
    return q > 0 ? q : Infinity;
  };
  const cap = { pastki: capOf('pastki'), ustki: capOf('ustki') };
  const count = { pastki: 0, ustki: 0 };
  const roleOf = (frag, z) => (z > 0 ? 'ustki' : ((frag.h || 0) >= 1800 ? 'baland' : 'pastki'));

  function place(frag, x, y, z, rot = 0, customW = null) {
    if (!frag) return null;
    const role = roleOf(frag, z);
    if (count[role] != null && count[role] >= cap[role]) return null;   // so'ralgan son to'ldi
    const w = customW || frag.w;
    const d = frag.d;
    const h = frag.h;

    const item = {
      id: 'p' + idSeq++,
      frg: frag.code,
      name: frag.name,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      w, d, h,
      rot,
      qty: 1
    };

    // To'qnashuv tekshiruvi
    for (const existing of placements) {
      if (isColliding(item, existing)) {
        return null; // to'qnashuv bor, qo'yilmaydi
      }
    }

    placements.push(item);
    if (count[role] != null) count[role]++;
    return item;
  }

  /* ═══════════════ A. L-SHAKLLI OSHXONA (CORNER SNAPPING) ═══════════════
     layout === 'U' bo'lsa bu blok o'tkazib yuboriladi — "U shakl, burchakka"
     matnida feat.corner true bo'lib, L birinchi kirib, U hech qachon qurilmay
     qolgan edi (A1). */
  if (layout !== 'U' && (layout === 'L' || feat.corner)) {
    const cW = cornerFrag ? cornerFrag.w : 900;
    const cD = cornerFrag ? cornerFrag.d : 550;

    // 1) Burchak moduli (0, 0) da
    place(cornerFrag, margin, margin, 0, 0);

    // 2) Devor 0 (pastki devor, X o'qi bo'ylab: 900 mm dan W gacha)
    let curX = margin + cW;
    const maxWallX = W - margin;

    // Gaz plita / Pishirish paneli
    if (feat.stove && curX + 600 <= maxWallX) {
      place(stoveFrag, curX, margin, 0, 0, 600);
      curX += 600;
    }

    // Pastki shkaflarni to'ldirish
    while (curX + 600 <= maxWallX) {
      const frag = (curX + 900 <= maxWallX) ? baseWide : baseStandard;
      const w = (curX + 900 <= maxWallX) ? 900 : 600;
      place(frag, curX, margin, 0, 0, w);
      curX += w;
    }

    // 3) Devor 3 (chap devor, Y o'qi bo'ylab: 900 mm dan D gacha)
    let curY = margin + cD;
    const maxWallY = D - margin;

    // Agar xolodilnik yoki kolonna bo'lsa, eng chetiga qo'yish
    // rot 270 → footprint y∈[y-w, y]: anchor = maxWallY (A2)
    if ((feat.fridge || feat.tall) && maxWallY - 600 >= curY + 600) {
      place(fridgeFrag, margin, maxWallY, 0, 270, 600);
    }

    // Chap devor bo'ylab pastki shkaflar (rot = 270°, fasad o'ngga)
    while (curY + 600 <= (feat.fridge ? maxWallY - 600 : maxWallY)) {
      place(baseStandard, margin, curY + 600, 0, 270, 600);
      curY += 600;
    }

    // 4) Ustki osma shkaflar (Z = 1450 mm)
    // Pastki devor ustki qatori
    let uX = margin + 600;
    while (uX + 600 <= maxWallX) {
      const uFrag = (uX + 900 <= maxWallX) ? upperWide : upperStandard;
      const uW = (uX + 900 <= maxWallX) ? 900 : 600;
      place(uFrag, uX, margin, USTKI_Z, 0, uW);
      uX += uW;
    }

    // Chap devor ustki qatori (rot 270: anchor = uY + 600, footprint [uY, uY+600])
    let uY = margin + 600;
    while (uY + 600 <= (feat.fridge ? maxWallY - 600 : maxWallY)) {
      place(upperStandard, margin, uY + 600, USTKI_Z, 270, 600);
      uY += 600;
    }

    return placements;
  }

  /* ═══════════════ B. U-SHAKLLI OSHXONA (3 DEVOR) ═══════════════ */
  if (layout === 'U') {
    const cW = cornerFrag ? cornerFrag.w : 900;
    const cD = cornerFrag ? cornerFrag.d : 550;

    // Chap burchak
    place(cornerFrag, margin, margin, 0, 0);
    // O'ng burchak — rot 0: footprint [W-margin-cW, W-margin]×[margin, margin+cD]
    // (eski rot 90 burchakni devordan uzoqlashtirib, o'ng qanot bilan ustma-ust
    //  tushishiga sabak bo'lardi — A2)
    place(cornerFrag, W - margin - cW, margin, 0, 0);

    // O'rta qism (pastki devor, cW dan W-cW gacha)
    let midX = margin + cW;
    while (midX + 600 <= W - margin - cW) {
      place(baseStandard, midX, margin, 0, 0, 600);
      midX += 600;
    }

    // Chap qanot (Y o'qi bo'ylab, rot 270: anchor = leftY+600)
    let leftY = margin + cD;
    while (leftY + 600 <= D - margin) {
      place(baseStandard, margin, leftY + 600, 0, 270, 600);
      leftY += 600;
    }

    // O'ng qanot (Y o'qi bo'ylab, rot 90 → footprint [x-d, x]×[y, y+w];
    // anchor x = W-margin, ya'ni devorga yopishqoq)
    let rightY = margin + cD;
    while (rightY + 600 <= D - margin) {
      place(baseStandard, W - margin, rightY, 0, 90, 600);
      rightY += 600;
    }

    return placements;
  }

  /* ═══════════════ C. TO'G'RI CHIZIQLI OSHXONA / STANDART ═══════════════ */
  let curX = margin;
  const maxW = W - margin;

  // 1) Xolodilnik / Kolonna eng chapda
  if (feat.fridge || feat.tall) {
    place(fridgeFrag, curX, margin, 0, 0, 600);
    curX += 600;
  }

  // 2) Moyka / Yuvg'ich tumbasi
  place(baseStandard, curX, margin, 0, 0, 600);
  curX += 600;

  // 3) Ish stoli (tumba)
  if (curX + 600 <= maxW) {
    place(baseWide, curX, margin, 0, 0, 900);
    curX += 900;
  }

  // 4) Gaz plita / Pishirish paneli
  if (curX + 600 <= maxW) {
    place(stoveFrag, curX, margin, 0, 0, 600);
    curX += 600;
  }

  // Qolgan bo'sh joyga pastki shkaflar
  while (curX + 600 <= maxW) {
    place(baseStandard, curX, margin, 0, 0, 600);
    curX += 600;
  }

  // Ustki shkaflar (Z = 1450 mm da, xolodilnikdan keyin)
  let uX = (feat.fridge || feat.tall) ? margin + 600 : margin;
  while (uX + 600 <= curX) {
    const uFrag = (uX + 900 <= curX) ? upperWide : upperStandard;
    const uW = (uX + 900 <= curX) ? 900 : 600;
    place(uFrag, uX, margin, USTKI_Z, 0, uW);
    uX += uW;
  }

  // Agar garderob buyurtma qilingan bo'lsa yoki xona katta bo'lsa
  if ((feat.wardrobe || orders.some(o => o.kind === 'shkaf')) && D > 1800) {
    place(wardrobeFrag, margin, D - margin - 600, 0, 0, 1000);
  }

  return placements;
}

/* ── 3. AI Yagona Chiqish Trubkasi (aiBuild) ── */

export async function aiBuild(text, catalog = {}, opts = {}) {
  let parsed = null;
  let source = 'rule';

  if (typeof opts.llm === 'function') {
    try {
      const r = await opts.llm(text);
      if (r && r.room && r.room.outline) {
        parsed = r;
        source = 'llm';
      }
    } catch (e) {
      // LLM xato bersa, tabiiy qoidali parserga qaytadi
    }
  }

  if (!parsed) {
    parsed = parseZamer(text);
  }

  const room = parsed.room;
  let assumed = false;
  if (!room.outline) {
    /* O'lcham topilmadi — default bilan davom etamiz, lekin "✅ 3600×2800"
       deb da'vo qilmaymiz (A1: "Tushunmasa ham ✅ ko'rsatmasin") */
    assumed = true;
    room.w = room.w || 3600;
    room.d = room.d || 2800;
    room.outline = [[0, 0], [room.w, 0], [room.w, room.d], [0, room.d]];
  }

  const placements = suggestLayout(room, catalog, parsed.orders);

  /* So'ralgan son sig'madi — jim o'tib ketmaydi (A1) */
  const notes = [];
  for (const k of ['pastki', 'ustki']) {
    const req = (parsed.orders || []).filter(o => o.kind === k).reduce((s, o) => s + o.qty, 0);
    if (!req) continue;
    const got = placements.filter(p => (k === 'ustki' ? (p.z || 0) > 0 : !((p.z || 0) > 0) && (p.h || 0) < 1800)).length;
    if (got < req) notes.push(`${k}: ${req} ta so'raldi, ${got} tasi sig'di`);
  }

  const doc = {
    v: 1,
    kind: 'smart3d',
    room: {
      outline: room.outline,
      wall_height: room.h || 2700,
      wall_thickness: 100,
      openings: room.openings || []
    },
    placements
  };

  return { doc, orders: parsed.orders, unknown: parsed.unknown, notes, source, assumed };
}

/* ── 4. Ovoz Tizimi (Web Speech API) ── */

export function voiceSupported() {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

/**
 * Ovozni matnga aylantirishni boshlaydi.
 * @param {object} o — { lang='uz-UZ', onText(text), onError(code), onEnd(lastErrorCode|null) }
 *   onError har xatoda chaqiriladi; onEnd sessiya tugaganda BIR MARTA (xato bo'lsa ham).
 * @returns SpeechRecognition (stop() bilan to'xtatiladi) yoki null.
 */
export function startVoice({ lang = 'uz-UZ', onText, onError, onEnd } = {}) {
  if (!voiceSupported()) return null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = false;

  let lastError = null;
  rec.onresult = (e) => {
    const text = e.results[0] && e.results[0][0] && e.results[0][0].transcript;
    if (text && onText) onText(text);
  };
  rec.onerror = (e) => {
    lastError = (e && e.error) || 'unknown';
    if (onError) onError(lastError);
  };
  rec.onend = () => { if (onEnd) onEnd(lastError); };
  rec.start();
  return rec;
}
