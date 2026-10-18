/* TZ-05: umumiy (SP) modullar geometriyasini sex konstruktiv qoidasiga keltirish — bir martalik vosita, hisobot bilan.
 *
 * Qoida (MebelCity'ning Bazis bilan tekshirilgan modullaridagi amaliyot; egasi tasdiqladi, SORIZLAR #134):
 *   · polka yon devorlar orasida: "w-36" (2 × 18 mm qattiq yozilgan) → "w - 2*t_korpus" (tanlangan korpus qalinligi);
 *     polka detallari (shift*) "polka" slotiga o'tadi — polka materiali (TZ-23 E) ularga ham tegadi;
 *   · pastki shkaf va tumba (stoleshnitsa ostida): tub to'liq eni (w), yon devor tub ustida (h − t), qopqoq yon devorlar
 *     orasida (w − 2t);
 *   · ustki shkaf, penal, shkaf, javon va boshqalar: qopqoq va tub to'liq (w), yon devorlar ular orasida (h − 2t);
 *   · varaqqa sig'maydigan detal: orqa devor (HDF) ikki bo'lak bo'ladi; uzun korpus detali bo'lsa — modulning eng katta
 *     eni varaqqa sig'adigan qilib kamaytiriladi (bundan katta shkaf — ikki modul).
 * Divan, stul, eshik, deraza — panel shkaf emas, tegilmaydi (hisobotda ro'yxati).
 *
 * Ishlatish: node scripts/geometriya_tuzatish.mjs [--yoz]    (--yozsiz — faqat hisobot, fayl o'zgarmaydi)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';

const YOL = fileURLToPath(new URL('../app/data/fragments.json', import.meta.url));
const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json'), furn = J('furnitura-catalog.json');
const furnituraById = Object.fromEntries(furn.items.filter(i => i.id).map(i => [i.id, i]));
const asl = JSON.parse(readFileSync(YOL, 'utf8'));
const frags = JSON.parse(JSON.stringify(asl));

const TEGILMAYDI = new Set(['sofa', 'chair', 'door', 'window']);
const PASTKI_GURUH = new Set(['kuxnya-pastki', 'kuxnya-burchak', 'kuxnya-pec', 'kuxnya-orol']);
const pastkimi = (f) => PASTKI_GURUH.has(f.group) || /pastki|osti|lavabo|yuvish/i.test(f.name || '');
const ns = (s) => String(s).replace(/\s/g, '');
/* varaq 2800 × 2070, chetidan 10 mm kesiladi (nesting-defaults: trimL, trimW) */
const UZUN = 2780, ENI = 2050;
const sigadi = (L, W) => Math.max(L, W) <= UZUN && Math.min(L, W) <= ENI;
const SLOT_ENG = { korpus: 'LDSP18', polka: 'LDSP18', fasad: 'MDF18', orqa: 'HDF3' };   // eng qalin — eng katta detal
const SLOT_STD = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'MDF16', orqa: 'HDF3' };

const hisobot = { ozgardi: [], tegilmadi: [], sigmadi: [] };

for (const f of frags) {
  if (!/^SP-/.test(f.code) || !(f.parts || []).length) continue;
  const izoh = [];
  const P = f.parts;
  /* 1) polka: w-36 → w - 2*t_korpus; shift* — polka sloti (divan/stul qutisidagi polka ham — faqat shu) */
  for (const p of P) {
    if (ns(p.len) === 'w-36') { p.len = 'w - 2*t_korpus'; izoh.push(p.code + ': w-36 → w-2t'); }
    if (/^shift\d*$/.test(p.code) && !p.slot) p.slot = 'polka';
  }
  if (TEGILMAYDI.has(f.category)) {
    hisobot.tegilmadi.push([f.code, f.name, f.category]);
    if (izoh.length) hisobot.ozgardi.push({ code: f.code, name: f.name, izoh: izoh.concat('konstruksiyasi tegilmadi (' + f.category + ')') });
    continue;
  }
  /* 2) korpus: yon, qopqoq (ust), tub (past) — burchakda ustma-ust bo'lmasin */
  const yon = P.filter(p => p.code === 'yon' && ns(p.len) === 'h');
  const ust = P.filter(p => p.code === 'ust' && ns(p.len) === 'w');
  const past = P.filter(p => p.code === 'past' && ns(p.len) === 'w');
  if (yon.length && (ust.length || past.length)) {
    if (pastkimi(f)) {
      yon.forEach(p => { p.len = 'h - t_korpus'; });
      ust.forEach(p => { p.len = 'w - 2*t_korpus'; });
      izoh.push('pastki: tub to\'liq, yon h−t, qopqoq w−2t');
    } else {
      yon.forEach(p => { p.len = 'h - 2*t_korpus'; });
      izoh.push('qopqoq va tub to\'liq, yon h−2t');
    }
    /* yon devorning yuqori qismidagi teshik (raqam bilan, to'liq h ga) — yuqori qirradan o'sha masofada qoladi */
    const yonLen = yon[0].len;
    for (const hl of f.holes || []) {
      if (hl.part !== 'yon' || typeof hl.y !== 'number' || hl.y <= f.h / 2) continue;
      izoh.push(`yon teshigi: yuqori qirradan ${f.h - hl.y} mm`);
      hl.y = `${yonLen} - ${f.h - hl.y}`;
    }
  }
  /* 3) varaqqa sig'ish — eng katta o'lchamda, eng qalin materialda */
  const maxW = f.max_w || f.w, maxD = f.max_d || f.d;
  const cl = cutlist(f, maxW, maxD, f.h, mats, { projectSlots: SLOT_ENG });
  for (const pt of cl.parts) {
    const L = +pt.finish_length, W = +pt.finish_width;
    if (sigadi(L, W)) continue;
    const p = P.find(x => x.code === pt.code);
    if (!p) continue;
    if (/orqa/.test(p.code) && Math.min(L, W) > ENI && Math.max(L, W) <= UZUN * 2) {
      /* orqa devor (HDF) — eni bo'yicha ikki bo'lak (o'rtadagi polka/devorga qoqiladi) */
      if (!p._bolak) {
        const sh = `(${p.width}) > ${ENI} && (${p.len}) > ${ENI}`;
        p.qty = `${sh} ? ${2 * (+p.qty || 1)} : ${+p.qty || 1}`;
        p.width = `${sh} ? (${p.width}) / 2 : ${p.width}`;
        p._bolak = 1;
        izoh.push(p.code + ': varaqdan katta bo\'lsa — 2 bo\'lak');
      }
    }
  }
  P.forEach(p => { delete p._bolak; });
  /* uzun korpus detali — eng katta en kamayadi (50 mm qadam) */
  let mw = f.max_w || f.w;
  const sigadimi = (w) => cutlist(f, w, maxD, f.h, mats, { projectSlots: SLOT_ENG }).parts.every(pt => sigadi(+pt.finish_length, +pt.finish_width));
  while (mw > (f.min_w || f.w) && !sigadimi(mw)) mw -= 50;
  if (mw !== (f.max_w || f.w)) {
    if (!sigadimi(mw)) hisobot.sigmadi.push([f.code, f.name]);
    else { izoh.push(`eng katta eni ${f.max_w} → ${mw} (detal varaqqa sig'masdi)`); f.max_w = mw; if (f.w > mw) f.w = mw; }
  } else if (!sigadimi(mw)) hisobot.sigmadi.push([f.code, f.name]);
  if (izoh.length) hisobot.ozgardi.push({ code: f.code, name: f.name, izoh });
}

/* hisobot: standart o'lchamda, LDSP16 — eski va yangi plita maydoni va mijoz narxi */
const byCode = Object.fromEntries(asl.map(f => [f.code, f]));
const olch = (f) => {
  const cl = cutlist(f, f.w, f.d, f.h, mats, { projectSlots: SLOT_STD });
  const m2 = cl.parts.reduce((s, p) => s + (+p.finish_length) * (+p.finish_width) / 1e6, 0);
  const pc = productionCost([Object.assign(cl, { placementId: 'x' })], mats, { furnituraById });
  return { m2: Math.round(m2 * 1000) / 1000, narx: pc.clientTotal, detal: cl.parts.length };
};
for (const r of hisobot.ozgardi) {
  const yangi = frags.find(f => f.code === r.code);
  r.eski = olch(byCode[r.code]); r.yangi = olch(yangi);
}
const qator = (r) => `| ${r.code} | ${r.name} | ${r.eski.m2} → ${r.yangi.m2} | ${r.eski.narx.toLocaleString('ru-RU')} → ${r.yangi.narx.toLocaleString('ru-RU')} | ${r.eski.detal === r.yangi.detal ? r.yangi.detal : r.eski.detal + ' → ' + r.yangi.detal} | ${r.izoh.join('; ')} |`;
console.log('| Modul | Nomi | Plita, m² | Mijoz narxi, so\'m | Detal | O\'zgarish |\n|---|---|---|---|---|---|\n' + hisobot.ozgardi.map(qator).join('\n'));
console.log('\nKonstruksiyasi tegilmadi (panel shkaf emas): ' + hisobot.tegilmadi.map(x => x[0] + ' ' + x[1]).join('; '));
console.log('Varaqqa sig\'maydi (qo\'lda ko\'rish kerak): ' + (hisobot.sigmadi.map(x => x[0]).join(', ') || "yo'q"));
console.log(`\nJami o'zgardi: ${hisobot.ozgardi.length} modul`);
if (process.argv.includes('--yoz')) { writeFileSync(YOL, JSON.stringify(frags, null, 1)); console.log('yozildi: app/data/fragments.json'); }
