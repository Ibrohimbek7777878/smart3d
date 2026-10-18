/* TZ-32 B: 85 umumiy (SP-) modulni sex qoidasiga keltirish — bir martalik vosita (qayta ishlatsa o'zgarmaydi, idempotent).
 *
 * Har qadam alohida (alohida commit): --qadam B1,B2,… ; --yoz bo'lmasa — faqat hisobot, fayl o'zgarmaydi.
 * Raqam o'ylab topilmaydi — har qiymatning manbasi qadam izohida:
 *   B1  polkaderjatel — har olinadigan polkaga 4 ta, ERP 90002019 «Полкодержатель штифтовой белый» (furnitura-catalog.json;
 *       MC modullaridagi BZ-polkoderjatel_nikel shu ID ga bog'langan — furnitura-boglash.json). Soni MC dagidek (1 polka — 4 ta).
 *   B2  kromka — MC (Bazis) qoidasi: korpus/polka detali faqat old qirra (F), fasad 4 tomon, orqa (HDF) — yo'q.
 *       Eski modullarda qo'shilgan qirra shu modulning o'z korpus kromkasi (yon devor yozuvi) bilan bir xil; ust/qopqoq orqa
 *       qirrasidagi (B) kromka olib tashlanadi. Yangi 16 modul (slot formati) — qopqoq va polka B qirrasi olib tashlanadi.
 *   B3  standart — sex-standartlari.json turi (egasi tasdiqlagan, 2026-10-15). Sukut o'lchami sex oralig'idan tashqarida
 *       bo'lgan o'lcham standart_olchamlar ga kirmaydi (MC importidagi qoida: o'z o'lchami oraliqdan uzoq — o'zgarmas).
 *   B4  konfirmat — MC modullaridagi eng ko'p uchragan Bazis qoidasi "Евровинт 7х50 (32) симм" (58 birikma):
 *       S 60, P 32, jadval [[150,1],[600,2],[1200,3],[2400,4]] — har gorizontal panel × 2 uchi; soni o'lchamga qarab (cutlist).
 *   B5  xato modullar — har birining manbasi pastda.
 * Egasi javobini kutayotganlar (TS-1730, korpus 16 mm, 12 quti-shablon, K-004/BD-005 nomi, narxsiz kodlar) — tegilmaydi.
 *
 * Ishlatish: node scripts/modul85_tuzatish.mjs --qadam B1 [--yoz]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evalFormula } from '../app/js/engine/expr.js';

const YOL = fileURLToPath(new URL('../app/data/fragments.json', import.meta.url));
const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const std = J('sex-standartlari.json');
const frags = JSON.parse(readFileSync(YOL, 'utf8'));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : ''; };
const QADAM = new Set(arg('--qadam').split(',').filter(Boolean));
const YOZ = process.argv.includes('--yoz');

/* tegilmaydi — egasi javobi (TZ-32 7-savol) */
const QUTI_SHABLON = new Set(['SP-T-004', 'SP-T-005', 'SP-T-006', 'SP-T-007', 'SP-BD-003', 'SP-BD-004', 'SP-BD-005', 'SP-BD-006',
  'SP-S-005', 'SP-S-006', 'SP-C-003', 'SP-C-004']);
const KROMKA_YOQ_TUR = new Set(['sofa', 'chair', 'door', 'window', 'countertop', 'filler']);
const POLKA = /^(shift\d*|polka)$/;
const POLKA_QOTIRMA = new Set(['SP-SH-001']);                       // ochiq toka: polka — korpusning o'zi (SH-01 shkant bilan)
const BUTUN_KROMKA = /^(gorma|stoleshnitsa|asosiy_panel)$/;          // 4 qirrasi ham ko'rinadi (stol usti, devor paneli)
const GORIZONTAL = /^(ust|past|tub|qopqoq|tsarga\w*|texnika_polka|tub_l|qopqoq_l)$/;   // yon devorlar orasidagi panel → konfirmat
const MAHKAM = /CONFIRMAT|konfirmat|евро|evro|GD-04|SH-01|M8-60|UGOLOK/i;

const slotOf = (p) => p.slot || (/eshik|fasad|door|front/i.test(p.code) ? 'fasad' : /orqa|back|hdf/i.test(p.code) ? 'orqa'
  : /polka|shelf/i.test(p.code) ? 'polka' : 'korpus');
const qutimi = (f) => f.production === 'panel' && !KROMKA_YOQ_TUR.has(f.category)
  && f.parts.some(p => /^yon/.test(p.code)) && f.parts.some(p => /^(ust|past|tub|qopqoq)/.test(p.code));
const eshikSoni = (f) => f.parts.filter(p => slotOf(p) === 'fasad' && !/tortma|fasad_kichik|fasad_katta|gorizontal/i.test(p.code)
  && /eshik/i.test(p.code)).reduce((s, p) => s + (+p.qty || 1), 0);
const sonOf = (p, f) => (isNaN(+p.qty) ? Math.max(1, Math.round(evalFormula(p.qty, { w: f.w, d: f.d, h: f.h, t: 18, t_korpus: 18 }))) : +p.qty);
const hisobot = [];
const yoz = (q, code, m) => hisobot.push(`${q} ${code}: ${m}`);

/** sex standarti turi — tests/verify_modul85.mjs sexTuri bilan bir xil qoida */
function sexTuri(f) {
  if (f.production !== 'panel' || KROMKA_YOQ_TUR.has(f.category)) return null;
  const n = eshikSoni(f), ikki = n >= 2 || (n === 0 && f.w >= 600);
  if (['kuxnya-kolonna', 'kuxnya-muz'].includes(f.group) || (f.group === 'kuxnya-ustki' && f.h >= 2030)) return 'oshxona_penal';
  if (['kuxnya-pastki', 'kuxnya-pec'].includes(f.group)) return ikki ? 'oshxona_pastki_2e' : 'oshxona_pastki_1e';
  if (f.group === 'kuxnya-ustki') return ikki ? 'oshxona_ustki_2e' : 'oshxona_ustki_1e';
  if (f.category === 'wardrobe' && f.h >= 1780) return 'shkaf';
  return null;
}
const TORTMA_ZAZOR = 50;                                             // MC-KP-03/04/09/10/11: Боковина ящика = d − 50

for (const f of frags) {
  if (!/^SP-/.test(f.code)) continue;
  /* ── B1: polkaderjatel ── */
  if (QADAM.has('B1') && !QUTI_SHABLON.has(f.code) && !POLKA_QOTIRMA.has(f.code)) {
    const n = f.parts.filter(p => POLKA.test(p.code)).reduce((s, p) => s + sonOf(p, f), 0);
    const hw = f.hardware || [];
    if (n && !hw.some(h => h.id === '90002019' || /polk.*derj|полкодерж/i.test((h.code || '') + ' ' + (h.name || '')))) {
      (f.hardware = hw).push({ code: 'POLKADERJATEL', name: 'Полкодержатель штифтовой белый', qty: 4 * n, unit: 'dona', id: '90002019' });
      yoz('B1', f.code, `${n} polka → ${4 * n} polkaderjatel`);
    }
  }
  /* ── B2: kromka ── */
  if (QADAM.has('B2') && !QUTI_SHABLON.has(f.code) && f.production === 'panel' && !KROMKA_YOQ_TUR.has(f.category)) {
    if (f.slots) {                                                   // yangi 16 modul — detal darajasidagi slot formati
      for (const p of f.parts) {
        if (!p.edge || typeof p.edge !== 'object' || slotOf(p) === 'fasad' || BUTUN_KROMKA.test(p.code)) continue;
        if (p.edge.B) { delete p.edge.B; yoz('B2', f.code, `${p.code}: orqa qirra (B) kromkasi olib tashlandi`); }
        if (!p.edge.F) { p.edge.F = 'kromka_korpus'; yoz('B2', f.code, `${p.code}: old qirra (F) qo'shildi`); }
      }
      for (const p of f.parts) {
        if (p.edge || slotOf(p) === 'orqa') continue;
        p.edge = slotOf(p) === 'fasad' ? { F: 'kromka_fasad', B: 'kromka_fasad', L: 'kromka_fasad', R: 'kromka_fasad' } : { F: 'kromka_korpus' };
        yoz('B2', f.code, `${p.code}: kromka qo'shildi (${slotOf(p)})`);
      }
    } else {                                                         // eski modullar — fragment darajasidagi edge[]
      const E = f.edge || [];
      const meta = (e) => (e ? { material: e.material, thickness: e.thickness, ...(e.slot ? { slot: e.slot } : {}) } : null);
      const yonE = E.find(e => e.code === 'yon'), fasadE = E.find(e => /eshik|fasad/.test(e.code));
      const polkaE = E.find(e => /^shift/.test(e.code));
      const korpusMeta = meta(yonE) || meta(E.find(e => !/eshik|fasad/.test(e.code))) || { slot: 'kromka_korpus' };
      for (const p of f.parts) {
        const sl = slotOf(p);
        if (sl === 'orqa') continue;
        const bor = E.filter(e => e.code === p.code);
        const sides = new Set(bor.flatMap(e => e.sides || []));
        if (sl === 'fasad') {
          const yoq = ['F', 'B', 'L', 'R'].filter(s => !sides.has(s));
          if (yoq.length) { E.push({ code: p.code, sides: yoq, ...(meta(fasadE) || { material: 'PVC2', thickness: 2 }) }); yoz('B2', f.code, `${p.code} (fasad): ${yoq.join('')} qo'shildi`); }
          continue;
        }
        if (!BUTUN_KROMKA.test(p.code)) for (const e of bor) {
          if ((e.sides || []).includes('B')) { e.sides = e.sides.filter(s => s !== 'B'); yoz('B2', f.code, `${p.code}: orqa qirra (B) kromkasi olib tashlandi`); }
        }
        if (!sides.has('F')) {
          E.push({ code: p.code, sides: ['F'], ...((sl === 'polka' && meta(polkaE)) || korpusMeta) });
          yoz('B2', f.code, `${p.code}: old qirra (F) qo'shildi`);
        }
      }
      for (let i = E.length - 1; i >= 0; i--) if (!(E[i].sides || []).length) E.splice(i, 1);
      if (E.length || f.edge) f.edge = E;
    }
  }
  /* ── B3: standart ── */
  if (QADAM.has('B3')) {
    const tur = sexTuri(f);
    if (tur && !f.standart) {
      const t = std.modullar[tur], dims = [], izoh = [];
      const tortmaL = f.parts.filter(p => /^tortma_yon/.test(p.code) && !isNaN(+p.len)).map(p => +p.len);
      for (const k of ['w', 'd', 'h']) {
        if (!t[k]) continue;
        if ((t[k].min != null && f[k] < t[k].min) || (t[k].max != null && f[k] > t[k].max)) { izoh.push(`${k}=${f[k]} sex oralig'idan (${t[k].min}–${t[k].max}) tashqarida — o'z chegarasi qoldi`); continue; }
        if (k === 'd' && tortmaL.length && Math.max(...tortmaL) + TORTMA_ZAZOR > t.d.min) { izoh.push(`d: tortma yoni ${Math.max(...tortmaL)} mm — d ≥ ${Math.max(...tortmaL) + TORTMA_ZAZOR} (MC: yon = d − ${TORTMA_ZAZOR}), sex min ${t.d.min} bilan to'qnashadi — o'z chegarasi qoldi`); continue; }
        dims.push(k);
      }
      f.standart = tur;
      f.standart_olchamlar = dims;
      if (izoh.length) f.standart_izoh = izoh;
      yoz('B3', f.code, `${tur} [${dims.join(',')}]${izoh.length ? ' — ' + izoh.join('; ') : ''}`);
    }
  }
  /* ── B4: konfirmat ── */
  if (QADAM.has('B4') && qutimi(f) && !QUTI_SHABLON.has(f.code) && !(f.hardware || []).some(h => MAHKAM.test((h.code || '') + ' ' + (h.name || '')))) {
    const NOM = 'Konfirmat 7×50';
    const qoida = { S: 60, P: 32, jadval: [[150, 1], [600, 2], [1200, 3], [2400, 4]] };
    const bir = [];
    for (const p of f.parts) {
      if (!GORIZONTAL.test(p.code)) continue;
      for (let i = 0; i < 2 * sonOf(p, f); i++) bir.push({ tur: 'evrovint', nom: `${NOM} — ${p.code} × yon devor`, zapchast: NOM, L: p.width, qoida, teshiklar: [], zapchast_soni: true });
    }
    if (bir.length) {
      const vars = { w: f.w, d: f.d, h: f.h, t: 18, t_korpus: 18 };
      const soni = bir.reduce((s, b) => { const L = evalFormula(b.L, vars), r = qoida.jadval.find(x => L <= x[0]); return s + (r ? r[1] : 4); }, 0);
      f.birikmalar = bir;
      (f.hardware = f.hardware || []).push({ code: 'CONFIRMAT', name: NOM, qty: soni, unit: 'dona' });
      yoz('B4', f.code, `${bir.length} birikma → ${soni} konfirmat (sukut o'lchamda)`);
    }
  }
  /* ── B5: xato modullar ── */
  if (QADAM.has('B5')) {
    const iz = (m) => { f.izoh = f.izoh ? f.izoh + ' | ' + m : m; };
    if (f.code === 'SP-S-006' && f.max_w > 2780) {
      f.max_w = 2780;                                                 // varaq 2800 − 2 × 10 (chetidan kesish, nesting TRIM_DEFAULT) — SP-W-007 kabi
      iz("TZ-32 B5: max_w 2800 → 2780 — ust/past/orqa detali (eni = w) varaqqa sig'sin (2800 × 2070, chetidan 10 mm)");
      yoz('B5', f.code, 'max_w 2800 → 2780');
    }
    if (f.code === 'SP-ST-005' && f.min_h < 600) {
      f.min_h = 600;                                                  // sex-standartlari.json oshxona_pastki_*.h.min
      iz("TZ-32 B5: min_h 100 → 600 — detal 'h − 100' 0 bo'lmasin; pastki qator bo'yi sexda 600–880 (sex-standartlari.json oshxona_pastki)");
      yoz('B5', f.code, 'min_h 100 → 600');
    }
    if (f.code === 'SP-S-003' && !f.parts.length) {
      f.parts = [{ code: 'karkas', qty: 1, len: 'w-200', width: 'd-200', material: 'LDSP18' }];
      iz("TZ-32 B5: detal yo'q edi — boshqa yumshoq mebel modullaridagi (SP-S-001/002, SP-C-001/002, SP-BD-001) karkas shabloni (w−200 × d−200); haqiqiy kreslo chizmasi emas");
      yoz('B5', f.code, "karkas detali qo'shildi (yumshoq mebel shabloni)");
    }
    const tl = f.parts.filter(p => /^tortma_yon/.test(p.code) && !isNaN(+p.len)).map(p => +p.len);
    if (tl.length && f.min_d != null && f.min_d < Math.max(...tl) + TORTMA_ZAZOR) {
      const old = f.min_d;
      f.min_d = Math.max(...tl) + TORTMA_ZAZOR;
      iz(`TZ-32 B5: min_d ${old} → ${f.min_d} — tortma yoni ${Math.max(...tl)} mm chuqurlikka sig'sin (MC/Bazis: tortma yoni = d − ${TORTMA_ZAZOR}, MC-KP-03/04/09/10/11)`);
      yoz('B5', f.code, `min_d ${old} → ${f.min_d}`);
    }
  }
}

console.log(hisobot.join('\n'));
console.log(`\n${hisobot.length} o'zgarish${YOZ ? ' — yozildi' : ' (--yoz yo\'q — fayl o\'zgarmadi)'}`);
if (YOZ) writeFileSync(YOL, JSON.stringify(frags, null, 1), 'utf8');
