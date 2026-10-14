/* static/client_erp/js/sunpin/price-engine.js — SUNPIN narx hisoblagichi.
 *
 * BU — YAGONA NARX QOIDASI (D4: "narx — qoida, emas taxmin").
 * Serverdagi `client_erp/services/sunpin_price.py` SHU formula bilan 1:1 mos.
 * Test: `node static/client_erp/js/sunpin/test-price.js` (20 holat).
 *
 * QANDAY ISHLATILADI (brauzerda):
 *   <script src="/static/client_erp/js/sunpin/price-engine.js"></script>
 *   const r = SpPrice.calc(doc, prices);
 *   r.total, r.lines, r.warnings
 *
 * QANDAY ISHLATILADI (Node testida):
 *   const SpPrice = require('./price-engine.js');
 *
 * QAT'IY QOIDALAR (buzilmaydi):
 *   • Barcha o'lchamlar butun son **mm**, barcha narxlar butun son **so'm**.
 *   • Har bir qator avval `round(...)` qilinadi, keyin yig'iladi (0.1 so'm
 *     xatosi umumiy narxga o'tmasligi uchun).
 *   • `Math.round` yarim sonni **yuqoriga** yaxlitlaydi (200.5 → 201).
 *     Python'da `int(x + 0.5)` bilan XUDDI SHU natija beriladi.
 *
 * price_mode (katalog maydoni):
 *   unit = har bir dona uchun narx · m2 = kvadrat metr · mm = metr uzunligi
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }  // Node
  else { root.SpPrice = api; }                                                // brauzer
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MM2_PER_M2 = 1000000;   // 1 m² = 1 000 000 mm²
  var MM_PER_M = 1000;        // 1 m   = 1 000 mm

  /* ── Yordamchi funksiyalar ───────────────────────────────────────────── */

  /** Xuddi shu yaxlitlash: yarim sonni yuqoriga (Python `int(x + 0.5)`). */
  function roundHalfUp(x) {
    if (!isFinite(x)) return 0;
    return x >= 0 ? Math.floor(x + 0.5) : -Math.floor(-x + 0.5);
  }

  function toNum(v) {
    var n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && isFinite(n) ? n : 0;
  }

  function isEmpty(v) {
    return v === null || v === undefined || v === '';
  }

  /** Bugungi kun (serverda TZ §7.4.4: valid_from <= bugun va (valid_to null yoki >= bugun)). */
  function todayISO(now) {
    var d = now ? new Date(now) : new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /**
   * Narx qatorlaridan JORIY qatorni tanlaydi (eng yangi valid_from).
   * @param {Array} rows — [{valid_from, valid_to, unit_price, price_m2, price_mm}]
   */
  function pickCurrentPrice(rows, nowISO) {
    if (!rows || !rows.length) return null;
    var today = nowISO || todayISO();
    var open = [], newest = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r) continue;
      var from = r.valid_from || '0000-01-01';
      if (from > today) continue;                         // hali kiritilmagan
      if (r.valid_to && r.valid_to < today) continue;     // muddati o'tgan
      if (!newest || from > (newest.valid_from || '')) newest = r;
      open.push(r);
    }
    if (newest) return newest;
    // Hamma qatorlar yopilgan bo'lsa — eng oxirgisini ishlatamiz (eski ma'lumot
    // yaxshiroq, hech narx qaytarishdan).
    return rows.slice().sort(function (a, b) {
      return String(a.valid_to || '').localeCompare(String(b.valid_to || ''));
    }).pop();
  }

  /* ── PARAMETRIK CHO'ZILISH (P5, TZ §7.4.2) ─────────────────────────────
   * Shelf k = w / base_w
   *   k <= 0.6  → 0.55  (kichraytirish — arzonlashmaydi, xarajat bor)
   *   k >= 1.6  → 1.45  (kattalashish — katta maydon = ko'p material)
   *   0.6..1.6  → 0.7 + 0.3 × k   (chiziqli, uzluksiz)
   * Bu formula "taxmin" emas: chegara qiymatlari ham, chiziqli qism ham aniq.
   * Natija: 1.6 → 0.7+0.48 = 1.18 ; 2.0 → 1.30 ; 2.44 → 1.43 ; 1.8 → 1.24
   */
  function stretchFactor(actualW, baseW) {
    var b = toNum(baseW);
    if (b <= 0) return 1;
    var k = toNum(actualW) / b;
    if (k <= 0.6) return 0.55;
    if (k >= 1.6) return 1.45;
    return 0.7 + 0.3 * k;
  }

  /* ── ASOSIY FUNKSIYA: SpPrice.calc(doc, prices, opts) ─────────────────── */

  /**
   * @param {Object} doc     — ProjectDoc: {v, room, placements[], layers[], meta}
   * @param {Object} prices  — { [fragment_code]: {mode, price, base_w, min_w, max_w, rows[]} }
   *                            `rows` — narx tarixi (SunpinPriceItem), ixtiyoriy.
   * @param {Object} [opts]  — { now: ISO-sana, delivery_fee: int so'm, discount: {type,value} }
   * @returns {Object} { lines, subtotal, total, warnings, errors }
   */
  function calc(doc, prices, opts) {
    opts = opts || {};
    prices = prices || {};
    var nowISO = opts.now || null;

    var lines = [], warnings = [], errors = [];
    var placements = (doc && doc.placements) || [];

    for (var i = 0; i < placements.length; i++) {
      var p = placements[i] || {};
      var code = p.frg || p.code || '';
      var cat = prices[code];

      /* — 1) Katalogda yo'q? — mijozga xato ko'rsatilmaydi, ogohlantiriladi */
      if (!cat) {
        warnings.push({ code: 'W_NO_PRICE', code_ref: code, message: code + ': katalogda narx yo\'q' });
        continue;
      }

      var qty = toNum(p.qty);
      if (qty <= 0) qty = 1;

      /* — 2) Parametrik chegaralar: ruxsat etilgan o'lchamdan tashqarida qo'yilmaydi */
      var w = toNum(p.w), d = toNum(p.d);
      if (!isEmpty(cat.min_w) && cat.min_w !== null && w < toNum(cat.min_w)) {
        warnings.push({ code: 'W_SIZE_CLAMP', code_ref: code, message: code + ': eni ' + cat.min_w + ' mm dan kich' });
        w = toNum(cat.min_w);
      }
      if (!isEmpty(cat.max_w) && cat.max_w !== null && w > toNum(cat.max_w)) {
        warnings.push({ code: 'W_SIZE_CLAMP', code_ref: code, message: code + ': eni ' + cat.max_w + ' mm dan katta' });
        w = toNum(cat.max_w);
      }
      if (!isEmpty(cat.min_d) && cat.min_d !== null && d < toNum(cat.min_d)) {
        warnings.push({ code: 'W_SIZE_CLAMP', code_ref: code, message: code + ': chuqurligi ' + cat.min_d + ' mm dan kich' });
        d = toNum(cat.min_d);
      }
      if (!isEmpty(cat.max_d) && cat.max_d !== null && d > toNum(cat.max_d)) {
        warnings.push({ code: 'W_SIZE_CLAMP', code_ref: code, message: code + ': chuqurligi ' + cat.max_d + ' mm dan katta' });
        d = toNum(cat.max_d);
      }

      /* — 3) Narxni olish: joriy qator (tarxi) → mode bo'yicha
         Muhim: `unitPrice`/`price_mm` HAR QATORDA nolga tiklanadi —
         `var` funksiya doirasida bo'lgani uchun tiklanmasa oldingi qatorning
         narxi keyingiga o'tib ketadi (xato: eshik 390000 ga hisoblanadi). */
      var mode = cat.mode || 'unit';
      var unitPrice = null, price_mm = null;

      if (cat.rows && cat.rows.length) {
        var row = pickCurrentPrice(cat.rows, nowISO);
        if (row) {
          unitPrice = mode === 'm2' ? row.price_m2 : (mode === 'mm' ? row.price_mm : row.unit_price);
          price_mm = row.price_mm;
        }
      }
      if (isEmpty(unitPrice)) unitPrice = cat.price;
      unitPrice = toNum(unitPrice);
      price_mm = isEmpty(price_mm) ? toNum(cat.price_mm) : toNum(price_mm);

      /* — 4) PARAMETRIK NARX: shkaf kengayganda narx ham o'sadi (P5) */
      var isShelf = (mode === 'unit') && !isEmpty(cat.stretch_axis) && String(cat.stretch_axis) !== '';
      var lineAmount, extra = {};

      if (isShelf) {
        var f = stretchFactor(w, cat.base_w);
        lineAmount = roundHalfUp(unitPrice * f * qty);
        extra = { stretch_k: roundHalfUp(f * 100) / 100, base_w: toNum(cat.base_w) };
      } else if (mode === 'm2') {
        var area = (w * d) / MM2_PER_M2;                 // m²
        lineAmount = roundHalfUp(unitPrice * area * qty);
        extra = { area_m2: Math.round(area * 10000) / 10000 };
      } else if (mode === 'mm') {
        var lenM = w / MM_PER_M;                        // metr
        lineAmount = roundHalfUp(price_mm * lenM * qty);
        extra = { length_m: Math.round(lenM * 1000) / 1000 };
      } else {                                          // unit
        lineAmount = roundHalfUp(unitPrice * qty);
      }

      /* — 5) Kichik-kichik qatorlarni yig'ish emas — har biri alohida qator */
      lines.push({
        id: p.id || ('p' + (i + 1)),
        code: code,
        name: p.name || cat.name || code,
        qty: qty, mode: mode, unit_price: unitPrice, amount: lineAmount,
        w: w, d: d, h: toNum(p.h),
        extra: extra
      });
    }

    /* — 6) Yig'ish va yakuniy yaxlitlash (TZ §7.4.3, HAR DOIM shu tartibda) */
    var subtotal = 0;
    for (var j = 0; j < lines.length; j++) subtotal += lines[j].amount;

    var delivery = roundHalfUp(toNum(opts.delivery_fee));
    if (delivery > 0) lines.push({ id: '__delivery', code: '__delivery', name: 'Yetkazib berish', qty: 1, mode: 'unit', unit_price: delivery, amount: delivery });

    var afterDelivery = subtotal + delivery;
    var discount = 0;
    var ds = opts.discount || null;
    if (ds && !isEmpty(ds.type) && !isEmpty(ds.value)) {
      var v = toNum(ds.value);
      if (ds.type === 'percent') {
        if (v < 0 || v > 100) {
          errors.push({ code: 'E_BAD_DISCOUNT', message: 'Chegra ' + v + '% — 0..100 oralig\'ida bo\'lishi kerak' });
        } else {
          discount = roundHalfUp(afterDelivery * v / 100);
        }
      } else if (ds.type === 'sum') {
        discount = roundHalfUp(v);
        if (discount > afterDelivery) {
          errors.push({ code: 'E_BAD_DISCOUNT', message: 'Chegra summasi jami narxdan katta' });
          discount = afterDelivery;
        }
      } else {
        errors.push({ code: 'E_BAD_DISCOUNT', message: 'Chegra turi noto\'g\'ri: ' + ds.type });
      }
    }

    var total = roundHalfUp(afterDelivery - discount);
    if (total < 0) total = 0;

    return {
      lines: lines,
      subtotal: subtotal,
      total: total,
      discount: discount,
      delivery_fee: delivery,
      warnings: warnings,
      errors: errors
    };
  }

  /* ── Yordamchi: narx satrini chindan ham ko'rsatish uchun format ─────── */
  function fmtSoom(n) {
    var s = String(Math.abs(Math.round(toNum(n))));
    var out = '';
    while (s.length > 3) { out = ' ' + s.slice(-3) + out; s = s.slice(0, -3); }
    return (toNum(n) < 0 ? '−' : '') + s + out + ' so\'m';
  }

  return {
    calc: calc,
    pickCurrentPrice: pickCurrentPrice,
    stretchFactor: stretchFactor,
    roundHalfUp: roundHalfUp,
    fmtSoom: fmtSoom,
    MM2_PER_M2: MM2_PER_M2,
    MM_PER_M: MM_PER_M
  };
});