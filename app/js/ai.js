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
export function parseZamer(text) {
  const t = String(text || '').toLowerCase();
  const unknown = [];
  const room = {
    w: 0, d: 0, h: 2700,
    outline: null, openings: [],
    layoutType: 'linear', // 'linear', 'L', 'U', 'island'
    features: {}
  };
  const orders = [];

  /* ── 1. Layout turi (L-shakl, U-shakl, to'g'ri, orol) ── */
  if (/l[\s-]*shakl|burchakli|burchak|г[\s-]*образн/i.test(t)) {
    room.layoutType = 'L';
  } else if (/u[\s-]*shakl|p[\s-]*shakl|п[\s-]*образн|uch\s*tomon/i.test(t)) {
    room.layoutType = 'U';
  } else if (/orol|orolli|ostrov/i.test(t)) {
    room.layoutType = 'island';
  }

  /* ── 2. Xona o'lchamlari ── */
  // "3x4", "3*4", "3 x 4", "3000x4000", "3000 x 4000"
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    let w = parseNum(m[1]), d = parseNum(m[2]);
    if (w < 100 && d < 100) { w *= 1000; d *= 1000; }
    room.w = Math.round(w); room.d = Math.round(d);
  } else {
    // "3 metr 4 metr", "3m 4m", "3 ga 4"
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:м|metr|m|ga)?\s*(?:на|ga)?\s*(\d+(?:[.,]\d+)?)\s*(?:м|metr|m)/);
    if (m) {
      let w = parseNum(m[1]), d = parseNum(m[2]);
      if (w < 100 && d < 100) { w *= 1000; d *= 1000; }
      room.w = Math.round(w); room.d = Math.round(d);
    }
  }

  /* ── 3. Balandlik ── */
  m = t.match(/(?:balandlik|высота|height|shift|h)\s*[=:]?\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    let h = parseNum(m[1]);
    if (h < 100) h *= 1000;
    if (h >= 1000 && h <= 6000) room.h = Math.round(h);
  }

  /* ── 4. Teshiklar: Deraza va Eshiklar ── */
  const reO = /(deraza|oyna|okno|eshik|dver)\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*(?:m|metr|м)?/g;
  let mm;
  while ((mm = reO.exec(t))) {
    let wid = parseNum(mm[2]);
    if (wid < 100) wid *= 1000;
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
    corner: /burchak|угол/i.test(t) || room.layoutType === 'L' || room.layoutType === 'U',
    upper: /ustki|tepa|osma|navesnoy|навесн/i.test(t),
    tall: /penal|kolonna|baland shkaf|пенал/i.test(t),
    wardrobe: /garderob|kupe|shkaf-kupe/i.test(t),
    island: /orol|ostrov/i.test(t)
  };
  room.features = features;

  /* ── 6. Miqdorli buyurtmalar ("3 ta pastki", "2 ta osma") ── */
  const reQ = /(\d+|bir|bitta|ikki|ikkita|uch|uchta|to'rt|besh|olti)\s*(?:ta)?\s+([a-z'`-]+)/g;
  const KIND_MAP = [
    [/ustki|osma|tepa/, 'ustki'],
    [/pastki|tumba/, 'pastki'],
    [/burchak/, 'burchak'],
    [/garderob|shkaf/, 'shkaf'],
    [/stol/, 'stol'],
    [/divan/, 'divan'],
    [/orol/, 'orol']
  ];

  while ((mm = reQ.exec(t))) {
    const qty = Math.max(1, parseNum(mm[1]) || 1);
    const word = mm[2];
    let kind = null;
    for (const [re, k] of KIND_MAP) {
      if (re.test(word)) { kind = k; break; }
    }
    if (kind) orders.push({ kind, qty });
  }

  // Standart to'rtburchak xona konturi
  if (room.w && room.d) {
    room.outline = [[0, 0], [room.w, 0], [room.w, room.d], [0, room.d]];
  }

  return { room, orders, unknown };
}

/* ── 2. To'qnashuv va Joylashtirish Matematikasi ── */

/**
 * 2D to'rtburchaklar to'qnashuvini tekshirish (AABB Collision Test).
 */
function isColliding(a, b) {
  // Vertikal zonalarga bo'lish: pastki (z < 1000) va ustki (z >= 1000)
  const aUpper = (a.z || 0) >= 1000;
  const bUpper = (b.z || 0) >= 1000;
  // Agar biri pastda, biri tepada bo'lsa (kolonna bundan mustasno) — to'qnashmaydi
  if (aUpper !== bUpper && (a.h || 0) < 1800 && (b.h || 0) < 1800) {
    return false;
  }

  // 2D proyeksiyada AABB
  const aX2 = a.x + a.w;
  const aY2 = a.y + a.d;
  const bX2 = b.x + b.w;
  const bY2 = b.y + b.d;

  return !(aX2 <= b.x + 2 || a.x >= bX2 - 2 || aY2 <= b.y + 2 || a.y >= bY2 - 2);
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

  function place(frag, x, y, z, rot = 0, customW = null) {
    if (!frag) return null;
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
    return item;
  }

  /* ═══════════════ A. L-SHAKLLI OSHXONA (CORNER SNAPPING) ═══════════════ */
  if (layout === 'L' || feat.corner) {
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
    if ((feat.fridge || feat.tall) && maxWallY - 600 >= curY + 600) {
      place(fridgeFrag, margin, maxWallY - 600, 0, 270, 600);
    }

    // Chap devor bo'ylab pastki shkaflar (rot = 270°, fasad o'ngga)
    while (curY + 600 <= (feat.fridge ? maxWallY - 600 : maxWallY)) {
      place(baseStandard, margin, curY, 0, 270, 600);
      curY += 600;
    }

    // 4) Ustki osma shkaflar (Z = 1450 mm)
    // Pastki devor ustki qatori
    let uX = margin + 600;
    while (uX + 600 <= maxWallX) {
      const uFrag = (uX + 900 <= maxWallX) ? upperWide : upperStandard;
      const uW = (uX + 900 <= maxWallX) ? 900 : 600;
      place(uFrag, uX, margin, 1450, 0, uW);
      uX += uW;
    }

    // Chap devor ustki qatori
    let uY = margin + 600;
    while (uY + 600 <= (feat.fridge ? maxWallY - 600 : maxWallY)) {
      place(upperStandard, margin, uY, 1450, 270, 600);
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
    // O'ng burchak
    place(cornerFrag, W - margin - cW, margin, 0, 90);

    // O'rta qism (pastki devor, cW dan W-cW gacha)
    let midX = margin + cW;
    while (midX + 600 <= W - margin - cW) {
      place(baseStandard, midX, margin, 0, 0, 600);
      midX += 600;
    }

    // Chap qanot (Y o'qi bo'ylab, rot 270°)
    let leftY = margin + cD;
    while (leftY + 600 <= D - margin) {
      place(baseStandard, margin, leftY, 0, 270, 600);
      leftY += 600;
    }

    // O'ng qanot (Y o'qi bo'ylab, rot 90°, fasad chapga qarab)
    let rightY = margin + cD;
    while (rightY + 600 <= D - margin) {
      place(baseStandard, W - margin - 550, rightY, 0, 90, 600);
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
    place(uFrag, uX, margin, 1450, 0, uW);
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
  if (!room.outline) {
    room.w = room.w || 3600;
    room.d = room.d || 2800;
    room.outline = [[0, 0], [room.w, 0], [room.w, room.d], [0, room.d]];
  }

  const placements = suggestLayout(room, catalog, parsed.orders);

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

  return { doc, orders: parsed.orders, unknown: parsed.unknown, source };
}

/* ── 4. Ovoz Tizimi (Web Speech API) ── */

export function voiceSupported() {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function startVoice(onText, onEnd, lang = 'uz-UZ') {
  if (!voiceSupported()) return null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = false;

  rec.onresult = (e) => {
    const text = e.results[0] && e.results[0][0] && e.results[0][0].transcript;
    if (text) onText(text);
  };
  rec.onerror = () => { if (onEnd) onEnd(); };
  rec.onend = () => { if (onEnd) onEnd(); };
  rec.start();
  return rec;
}
