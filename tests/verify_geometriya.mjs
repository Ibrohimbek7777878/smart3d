/* TZ-05: umumiy (SP) modullar geometriyasi — sex konstruktiv qoidasi (scripts/geometriya_tuzatish.mjs).
 * Tekshiriladi: "w-36" yo'q; polka yon devorlar orasida (polka + 2t = eni) korpus 16 va 18 mm da; burchakda ustma-ust
 * yo'q (pastki: tub to'liq, yon h − t, qopqoq w − 2t; boshqalar: qopqoq va tub to'liq, yon h − 2t); har detal
 * eng katta o'lchamda ham varaqqa sig'adi; teshiklar detal ichida; polka materiali polka slotidan. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { cutlist } = await import('../app/js/engine/cutlist.js');
const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
const frags = J('fragments.json'), mats = J('materials.json');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const TEGILMAYDI = new Set(['sofa', 'chair', 'door', 'window']);
const PASTKI = new Set(['kuxnya-pastki', 'kuxnya-burchak', 'kuxnya-pec', 'kuxnya-orol']);
const pastkimi = (f) => PASTKI.has(f.group) || /pastki|osti|lavabo|yuvish/i.test(f.name || '');
const sp = frags.filter(f => /^SP-/.test(f.code) && (f.parts || []).length);
const qutilar = sp.filter(f => !TEGILMAYDI.has(f.category) && f.parts.some(p => p.code === 'yon') && f.parts.some(p => p.code === 'ust' || p.code === 'past'));

/* 1. qattiq yozilgan 36 mm yo'q */
ok('"w-36" — 0 ta modulda', !JSON.stringify(frags).replace(/\s/g, '').includes('"w-36"'));

/* 2. polka va korpus o'lchamlari — 16 va 18 mm korpusda, standart / eng kichik / eng katta enida */
const xato = { polka: [], burchak: [], varaq: [], teshik: [] };
for (const kod of ['LDSP16', 'LDSP18']) {
  const t = mats.panel_materials.find(m => m.code === kod).thickness;
  for (const f of sp) {
    for (const w of [f.w, f.min_w || f.w, f.max_w || f.w]) {
      const cl = cutlist(f, w, f.d, f.h, mats, { projectSlots: { korpus: kod, polka: 'LDSP16' } });
      const L = (code) => cl.parts.filter(p => p.code === code).map(p => +p.finish_length);
      for (const p of f.parts) {
        if (!/^shift\d*$/.test(p.code) && !(p.code === 'polka' && f.code === 'SP-SH-001')) continue;
        for (const v of L(p.code)) if (Math.abs(v + 2 * t - w) > 0.5) xato.polka.push(`${f.code} ${kod} w=${w}: ${p.code} ${v}`);
      }
      if (qutilar.includes(f)) {
        /* qopqoq (tub) yon devorlar USTIDA (to'liq w) yoki ORASIDA (w − 2t); yon devor shunga qarab qisqaradi */
        const yon = L('yon')[0], ust = L('ust')[0], past = L('past')[0];
        const ustida = (v) => v != null && Math.abs(v - w) < 0.5, orasida = (v) => v != null && Math.abs(v - (w - 2 * t)) < 0.5;
        const kutYon = f.h - (ustida(ust) ? t : 0) - (ustida(past) ? t : 0);
        const toza = [ust, past].every(v => v == null || ustida(v) || orasida(v)) && Math.abs(yon - kutYon) < 0.5;
        /* TZ-05 qoidasi: pastki — tub ustida, qopqoq orasida; boshqalar — ikkalasi ustida (shu skript o'zgartirganlar) */
        const qoida = !/t_korpus/.test(String((f.parts.find(p => p.code === 'yon') || {}).len)) ||
          (pastkimi(f) ? ustida(past) && (ust == null || orasida(ust)) : (ust == null || ustida(ust)) && (past == null || ustida(past)));
        if (!toza || !qoida) xato.burchak.push(`${f.code} ${kod} w=${w}: yon ${yon}, ust ${ust}, past ${past}`);
      }
      if (TEGILMAYDI.has(f.category)) continue;            // divan, stul — panel shkaf emas (TZ-05: tegilmaydi)
      for (const p of cl.parts) {
        const a = +p.finish_length, b = +p.finish_width;
        if (f.code !== 'SP-ST-001' && Math.max(a, b) > 2780 || Math.min(a, b) > 2050) xato.varaq.push(`${f.code} ${kod} w=${w}: ${p.code} ${a}×${b}`);
      }
      const P = Object.fromEntries(cl.parts.map(p => [p.code, p]));
      for (const h of cl.holes) {
        const p = P[h.part];
        if (p && (h.x > Math.max(+p.finish_length, +p.finish_width) + 1 || h.y > Math.max(+p.finish_length, +p.finish_width) + 1))
          xato.teshik.push(`${f.code} w=${w}: ${h.part} @${h.x},${h.y}`);
      }
    }
  }
}
ok('polka yon devorlar orasida: polka + 2t = eni (16 va 18 mm korpus)', !xato.polka.length, xato.polka.slice(0, 3).join(' | '));
ok(`burchakda ustma-ust yo'q (${qutilar.length} ta quti modul)`, qutilar.length >= 45 && !xato.burchak.length, xato.burchak.slice(0, 3).join(' | '));
ok('har detal eng katta o\'lchamda ham varaqqa sig\'adi (2800 × 2070, chetidan 10 mm; divan va stuldan tashqari)', !xato.varaq.length, xato.varaq.slice(0, 3).join(' | '));
ok('teshiklar detal ichida', !xato.teshik.length, xato.teshik.slice(0, 3).join(' | '));

/* 3. polka materiali — polka slotidan (TZ-23 E: polka 16 mm, korpus 18 mm bo'lsa ham) */
{
  const f = frags.find(x => x.code === 'SP-K-013');
  const cl = cutlist(f, 600, f.d, f.h, mats, { projectSlots: { korpus: 'LDSP18', polka: 'LDSP16' } });
  const pl = cl.parts.filter(p => /^shift/.test(p.code)), yon = cl.parts.find(p => p.code === 'yon');
  ok('polka — LDSP16, korpus — LDSP18, polka uzunligi 600 − 2×18', pl.length === 4 && pl.every(p => p.material === 'LDSP16' && +p.finish_length === 564) && yon.material === 'LDSP18',
    JSON.stringify(pl.map(p => [p.material, p.finish_length])));
}

/* 4. katta orqa devor — ikki bo'lak; eng katta en — varaqqa sig'adigan */
{
  const f = frags.find(x => x.code === 'SP-W-007');
  const cl = cutlist(f, 2400, f.d, f.h, mats, { projectSlots: { korpus: 'LDSP16' } });
  const orqa = cl.parts.filter(p => p.code === 'orqa');
  ok('SP-W-007 (2400 × 2200): orqa devor 2 bo\'lak, har biri varaqqa sig\'adi', orqa.length === 2 && orqa.every(p => Math.min(+p.finish_length, +p.finish_width) <= 2050), JSON.stringify(orqa.map(p => [p.finish_length, p.finish_width])));
  const k = frags.find(x => x.code === 'SP-K-001');
  const c1 = cutlist(k, 600, k.d, k.h, mats, { projectSlots: { korpus: 'LDSP16' } });
  ok('kichik modulda orqa devor — 1 bo\'lak', c1.parts.filter(p => p.code === 'orqa').length === 1);
  ok('eng katta eni: SP-W-007 ≤ 2780, SP-G-011 ≤ 2800', f.max_w <= 2780 && frags.find(x => x.code === 'SP-G-011').max_w <= 2800);
}

/* 5. divan, stul, eshik, deraza — konstruksiyasi tegilmagan */
{
  const f = frags.find(x => x.code === 'SP-S-005');
  ok('divan qutisi: yon devor to\'liq h (konstruksiyasi tegilmagan)', f.parts.find(p => p.code === 'yon').len === 'h');
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
