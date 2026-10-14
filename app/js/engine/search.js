/* Smart3D engine/search.js — Material ID + multi-til fuzzy qidiruv.
 *
 * Vazifalar:
 * 1) ID orqali qidiruv (8 xonali)
 * 2) Nom orqali qidiruv (kirill/lotin/eski kirill)
 * 3) SKU orqali qidiruv
 * 4) Fuzzy matching (xato yozilgan ham topadi)
 * 5) Kategoriya bo'yicha filtr
 *
 * Qoida: har bir materialda `id`, `name`, `sku`, `cat_code`, `aliases[]`, `search_text` bor.
 * Qidiruv: ID → alias → fuzzy (Levenshtein ≤ 2) → substring
 */

const LEVEN_MAX = 2;  // xato soni (masalan: "kronoshpan" → "kronospan" = 1)

/* ── Levenshtein masofasi (kam uchun, tez) ── */
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > LEVEN_MAX + 2) return 99;
  const m = a.length, n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return row[n];
}

/* ── Kirill → lotin transliteratsiya ── */
const TRANS = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
function translit(s) {
  return String(s).toLowerCase().replace(/[а-яё]/g, c => TRANS[c] || c);
}

/* ── Eski kirill → zamonaviy ── */
const OLD2NEW = { Ѣ:'Е',ѣ:'е',Ѳ:'Ф',ѳ:'ф',Ѵ:'И',ѵ:'и' };
function old2new(s) {
  return String(s).replace(/[ѢѣѲѳѴѵ]/g, c => OLD2NEW[c] || c);
}

/* ── Qidiruv uchun matnni normalizatsiya qilish ── */
function norm(s) {
  return old2new(translit(String(s).toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, ' '))).replace(/\s+/g, ' ').trim();
}

/* ── Boshlang'ich indeks yaratish ── */
export function buildSearchIndex(items) {
  const index = {
    byId: {},       // id → item
    bySku: {},      // sku → item
    byAlias: {},    // alias → item[]
    items: items || []
  };
  for (const it of (items || [])) {
    index.byId[it.id] = it;
    if (it.sku) index.bySku[it.sku.toLowerCase()] = it;
    for (const al of (it.aliases || [])) {
      const key = norm(al);
      if (!index.byAlias[key]) index.byAlias[key] = [];
      index.byAlias[key].push(it);
    }
  }
  return index;
}

/* ── Asosiy qidiruv funksiyasi ──
 * @param {string} q — so'rov (ID, nom, SKU, qisqa nom)
 * @param {Object} index — buildSearchIndex natijasi
 * @param {Object} opts — { limit, catCode, type }
 * @returns {Array} topilgan materiallar (score bo'yicha saralangan)
 */
export function searchMaterial(q, index, opts) {
  if (!q || !index) return [];
  opts = opts || {};
  const limit = opts.limit || 50;
  const nq = norm(q);
  if (!nq) return [];

  // 1) To'g'ridan-to'g'ri ID
  if (index.byId[q.trim()]) {
    return [{ item: index.byId[q.trim()], score: 1000 }];
  }

  // 2) SKU
  if (index.bySku[q.toLowerCase().trim()]) {
    return [{ item: index.bySku[q.toLowerCase().trim()], score: 900 }];
  }

  const results = [];

  // 3) Alias aniq moslik
  if (index.byAlias[nq]) {
    for (const it of index.byAlias[nq]) {
      results.push({ item: it, score: 800 });
    }
  }

  // 4) Substring moslik (search_text ichida)
  for (const it of index.items) {
    if (opts.catCode && it.cat_code !== opts.catCode) continue;
    if (opts.type && it.type !== opts.type) continue;

    const st = it.search_text || '';
    const nm = norm(it.name);
    const sk = norm(it.sku || '');

    // Qisqa so'z mosligi
    if (nq.length >= 2 && (nm.includes(nq) || sk.includes(nq) || st.includes(nq))) {
      results.push({ item: it, score: 600 });
      continue;
    }

    // Fuzzy: so'zlarni ajratib, har biri uchun tekshirish
    const qWords = nq.split(' ').filter(w => w.length >= 2);
    const nWords = nm.split(' ').filter(w => w.length >= 2);
    let matches = 0;
    for (const qw of qWords) {
      if (nWords.some(nw => nw.includes(qw) || qw.includes(nw))) {
        matches++;
        continue;
      }
      if (nWords.some(nw => levenshtein(qw, nw) <= LEVEN_MAX)) {
        matches += 0.7;
      }
    }
    if (matches >= Math.max(1, qWords.length * 0.5)) {
      results.push({ item: it, score: 400 + matches * 50 });
    }
  }

  // Saralash (score kamayish tartibida) + takrorlarni olib tashlash
  results.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const unique = [];
  for (const r of results) {
    if (!seen.has(r.item.id)) {
      seen.add(r.item.id);
      unique.push(r);
    }
    if (unique.length >= limit) break;
  }
  return unique;
}

/* ── Qisqa statistika (debug uchun) ── */
export function searchStats(index) {
  return {
    total: (index.items || []).length,
    ids: Object.keys(index.byId).length,
    skus: Object.keys(index.bySku).length,
    aliases: Object.keys(index.byAlias).length
  };
}
