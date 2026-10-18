/* Smart3D engine/konstruktor/toldirish.js — TZ-22: devor bo'lagini modullar bilan millimetrigacha to'ldirish.
 *
 * Kirish: bo'lak uzunligi L (mm), ikki uchining turi:
 *   'devor'   — yon devor: yon dobor shart (Q.dobor.devor, eshik/tutqich ochilishi uchun)
 *   'burchak' — burchak moduli yonida: dobor shart (Q.dobor.burchak)
 *   'texnika' — muzlatgich/plita yonida (ular 600 chuqur — modul oldidan chiqib turadi): dobor shart (Q.dobor.texnika)
 *   'erkin' | 'modul' — dobor yo'q
 * Modul enlari — 50 mm qadamda (Q.qadam), turlar: bir eshikli [min,max], ikki eshikli [min,max] (sex standartidan).
 * Qoldiq: avval doborga (oralig'i ichida), dobor bo'lmasa — bitta modul eniga qo'shiladi (eni chegarasi ichida).
 * Natija: [{ tur: 'dobor'|'bir'|'ikki', w }] chapdan o'ngga, yoki null (to'ldirib bo'lmaydi).
 * Baho: modul soni (kam — yaxshi), afzal enlar, dobor kengligi. Natija har doim bir xil (deterministik).
 */
const MODUL = 10;

/** dobor eni nomzodlari: shart bo'lsa [min..max]; ustkida ixtiyoriy — 0 yoki [min..max] */
function dobNomzod(tur, Q, ustki) {
  const r = ustki ? (tur === 'devor' || tur === 'burchak' ? Q.dobor.ustki : null)
    : tur === 'devor' ? Q.dobor.devor : tur === 'burchak' ? Q.dobor.burchak : tur === 'texnika' ? Q.dobor.texnika : null;
  if (!r) return [0];
  const out = ustki ? [0] : [];
  for (let f = r[0]; f <= r[1]; f++) out.push(f);
  return out;
}

function enBaho(tur, w, Q) {
  const i = (Q.afzal[tur] || []).indexOf(w);
  return i < 0 ? 2.5 : i * 0.5;
}

/** M (50 ga karrali) ni modullarga bo'lish: DP. → { cost, list: [{tur,w}] } | null */
function dpBol(M, chek, Q) {
  const q = Q.qadam, n = Math.round(M / q);
  const enlar = [];
  for (const tur of ['bir', 'ikki']) {
    const [lo, hi] = chek[tur];
    for (let w = Math.ceil(lo / q) * q; w <= hi; w += q) enlar.push({ tur, w, c: MODUL + enBaho(tur, w, Q) });
  }
  const best = new Array(n + 1).fill(Infinity), from = new Array(n + 1).fill(null);
  best[0] = 0;
  for (let k = 1; k <= n; k++) {
    for (const e of enlar) {
      const u = e.w / q;
      if (u <= k && best[k - u] + e.c < best[k]) { best[k] = best[k - u] + e.c; from[k] = e; }
    }
  }
  if (!isFinite(best[n])) return null;
  const list = [];
  for (let k = n; k > 0;) { const e = from[k]; list.push({ tur: e.tur, w: e.w }); k -= e.w / q; }
  return { cost: best[n], list };
}

/** Modullar tartibi: bir eshikli — chetlarda, ikki eshikli — o'rtada (eniga ko'ra) */
function tartib(list) {
  const bir = list.filter(x => x.tur === 'bir').sort((a, b) => b.w - a.w);
  const ikki = list.filter(x => x.tur === 'ikki').sort((a, b) => b.w - a.w);
  const chap = [], ong = [];
  bir.forEach((x, i) => (i % 2 ? ong : chap).push(x));
  return [...chap, ...ikki, ...ong.reverse()];
}

/**
 * @param {number} L
 * @param {string} b0, b1 — uchlar turi
 * @param {{bir:[number,number], ikki:[number,number]}} chek — modul eni chegaralari
 * @param {object} Q — qoidalar
 * @param {{ustki?:boolean}} [o]
 */
export function toldir(L, b0, b1, chek, Q, o = {}) {
  L = Math.round(L);
  const F0 = dobNomzod(b0, Q, o.ustki), F1 = dobNomzod(b1, Q, o.ustki);
  const ikkiTomon = F0.length > 1 && F1.length > 1, birTomon = F0.length > 1 || F1.length > 1;
  const q = Q.qadam;
  let eng = null;
  const sina = (f0, f1) => {
    const M = L - f0 - f1;
    if (M < 0) return;
    let res;
    if (M === 0) res = { cost: 0, list: [] };
    else {
      const qol = M % q;
      res = dpBol(M - qol, chek, Q);
      if (!res) return;
      if (qol) {                                   // qoldiq — bitta modulga (eni chegarasi ichida)
        const c = res.list.slice().sort((a, b) => b.w - a.w).find(x => x.w + qol <= chek[x.tur][1]);
        if (!c) return;
        c.w += qol;
        res.cost += 3;
      }
    }
    const cost = res.cost + (f0 ? 1 + f0 / 100 : 0) + (f1 ? 1 + f1 / 100 : 0);
    if (!eng || cost < eng.cost - 1e-9) eng = { cost, f0, f1, list: res.list };
  };
  /* dobor juftlari: modul qismi 50 ga karrali bo'ladiganlari (yoki dobor yo'q bo'lsa — hammasi) */
  for (const f0 of F0) {
    for (const f1 of F1) {
      const M = L - f0 - f1;
      if (M < 0) continue;
      if (birTomon && M % q !== 0 && M !== 0) continue;
      if (ikkiTomon && f0 && f1 && Math.abs(f0 - f1) > 1) continue;     // ikki tomonda — teng dobor
      sina(f0, f1);
    }
  }
  /* dobor oralig'i qoldiqni yopolmasa — qoldiq modulga */
  if (!eng) sina(F0[0], F1[0]);
  if (!eng) return null;
  const out = [];
  if (eng.f0) out.push({ tur: 'dobor', w: eng.f0 });
  out.push(...tartib(eng.list));
  if (eng.f1) out.push({ tur: 'dobor', w: eng.f1 });
  return { items: out, cost: eng.cost };
}
