/* Smart3D engine/konstruktor/index.js — TZ-22: avtomatik konstruktor (sun'iy intellektsiz, qoidalar bilan).
 *
 * konstruksiya(room, talab, catalog, opt) → { variantlar: [...], xato? }
 *   room   — doc.room (outline, openings: eshik/deraza, utilities: quvur)
 *   talab  — { shakl: 'auto'|'I'|'L'|'U', devor?: indeks, xolodilnik: bool, plita: 'erkin'|false, moyka: bool, ustki: bool }
 *   catalog — sex standarti qo'llangan katalog (MC-* modullari, SP-ST-005/006 dobor, SP-TX-004/008 texnika)
 * Har variant: { shakl, devorlar, placements, kitchen, izohlar[], ogohlantirishlar[], baho }
 *
 * Tartib: shakl → devor bo'laklari (eshik/deraza, burchak) → langarlar (muzlatgich chetda, moyka quvur yonida,
 * plita — qoidalar bilan) → bo'laklar millimetrigacha to'ldiriladi (toldirish.js) → ustki qator pastki modullar
 * chegarasiga tekislanadi, plita ustida vityajka → petlya tomoni (eshik.js) → tekshiruv (rules.validateDoc + eshiklar).
 * Bir xil kirish → har doim bir xil natija. Internet va AI kerak emas.
 */
import { validateDoc } from '../rules.js';
import { qoidalar } from './qoidalar.js';
import { devorlar, burchak, tosiqlar, boshOraliqlar } from './devor.js';
import { toldir } from './toldirish.js';
import { eshikToqnashuvlari, petlyaTanla } from './eshik.js';
import { ichkiXona, devorChegara, DEVOR_ORALIQ } from '../devorOraliq.js';
import { STOL_QALINLIK, STOL_SUKUT_QALINLIK } from '../kitchen.js';

const chuqurQosh = (a, b) => { const o = Object.assign({}, a); for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? chuqurQosh(a[k], v) : v; return o; };
const SHAKL_NOMI = { I: "To'g'ri", L: 'Burchakli (L)', U: 'P shakl (U)' };

/** Katalogdan eni chegarasi (sex standarti qo'llangan) */
function chegara(catalog, code, fallback) {
  const f = catalog[code];
  return f ? [+f.min_w || +f.w, +f.max_w || +f.w] : fallback;
}

/** Shakl nomzodlari: [{ shakl, walls: [dv…] }] */
function shakllar(W, talab, Q) {
  const tek = W.filter(d => d.tekis && d.len >= 1200);
  const out = [];
  /* egasi #166: oshxona uzunligi aytilgan — to'g'ri oshxona shu uzunlik sig'adigan devorda (bo'lmasa — eng uzunida) */
  const sigadi = talab.uzunlik > 0 ? tek.filter(d => d.len >= talab.uzunlik - 1) : [];
  const I = (sigadi.length ? sigadi : talab.uzunlik > 0 ? tek.slice().sort((a, b) => b.len - a.len).slice(0, 1) : tek).slice().sort((a, b) => b.len - a.len);
  if (talab.devor != null) { const d = tek.find(x => x.i === +talab.devor); if (d) I.unshift(d); }
  for (const d of I) out.push({ shakl: 'I', walls: [d] });
  for (const a of tek) for (const b of tek) {
    if (a === b || burchak(a, b) !== 'ab') continue;
    out.push({ shakl: 'L', walls: [a, b] });
    for (const c of tek) {
      if (c === a || c === b || burchak(b, c) !== 'ab') continue;
      /* P shaklda qanotlar orasida kamida 1200 mm o'tish joyi (taklif) */
      if (b.len - 2 * Q.pastki.d >= 1200) out.push({ shakl: 'U', walls: [a, b, c] });
    }
  }
  return out;
}

/** Shakl bo'yicha har devorning pastki/ustki oralig'i va burchak modullari */
function shaklRejasi(sh, room, Q, catalog, talab = {}) {
  const Dp = Q.pastki.d, Du = Q.ustki.d;
  const Wkp = (catalog[Q.modul.pastki.burchak] || {}).w || 780, Wku = (catalog[Q.modul.ustki.burchak] || {}).w || 600;
  const n = sh.walls.length;
  return sh.walls.map((dv, k) => {
    /* Xona ichidan devorga qaraganda s (modul lokal +x) CHAPGA o'sadi (reja o'ng qo'l tizimida, 2D: y tepaga).
       MC gluxoy modullari Bazis'da "chap" — ko'r qismi tomoshabinning chapida = lokal +x tomonda. Shuning uchun
       burchak moduli burchak devorning OXIRIDA (E, s = len) turadi, keyingi qanot esa boshida (S) burchak zonasidan boshlanadi. */
    const bosh = k > 0, oxir = k < n - 1;              // k>0: boshida oldingi qanot burchagi; k<n-1: oxirida burchak moduli
    const ts = tosiqlar(room, dv, Q);
    const p0 = bosh ? Dp : 0, u0 = bosh ? Du : 0;
    let p1 = oxir ? dv.len - Wkp : dv.len, u1 = oxir ? dv.len - Wku : dv.len, b1 = oxir ? 'modul' : 'devor';
    /* egasi #166: oshxona uzunligi aytilgan (to'g'ri oshxona) va devor uzunroq — qator shu uzunlikda, oxiri erkin (dobor yo'q) */
    if (n === 1 && talab.uzunlik > 0 && talab.uzunlik < dv.len - 1) { p1 = u1 = talab.uzunlik; b1 = 'erkin'; }
    return {
      dv, ts, bosh, oxir, Wkp, Wku,
      pastki: { s0: p0, s1: p1, b0: bosh ? 'burchak' : 'devor', b1 },
      ustki: { s0: u0, s1: u1, b0: bosh ? 'burchak' : 'devor', b1 },
      erkinUch: [!bosh ? 'S' : null, !oxir ? 'E' : null].filter(Boolean)
    };
  });
}

/** [s0,s1] oralig'ini to'siqlar bilan bo'lib, uch turlarini saqlab — bo'laklar */
function bolaklar(r, bloklar) {
  const parts = boshOraliqlar(r.s1 - r.s0, bloklar.map(b => [b[0] - r.s0, b[1] - r.s0, b[2]]), [r.b0, r.b1]);
  return parts.map(p => ({ s0: p.s0 + r.s0, s1: p.s1 + r.s0, b0: p.b0, b1: p.b1 }));
}

/** Pastki qatlam: langarlar (muzlatgich, moyka, plita) o'rnini qidirish va bo'laklarni to'ldirish */
function pastkiQidir(reja, room, talab, Q, chek) {
  const kesh = new Map();
  /* uzunligi 0 bo'lak: eshikli modul (moyka, burchak) devor/burchak/texnikaga doborsiz taqalmaydi */
  const doborShart = (t) => t === 'devor' || t === 'burchak' || t === 'texnika';
  const fill = (L, b0, b1) => {
    const k = L + '|' + b0 + '|' + b1;
    if (!kesh.has(k)) {
      kesh.set(k, L >= 1 ? toldir(L, b0, b1, chek, Q)
        : (doborShart(b0) && b1 === 'modul') || (doborShart(b1) && b0 === 'modul') ? null : { items: [], cost: 0 });
    }
    return kesh.get(k);
  };
  /* bo'sh bo'laklar (xona eshigi, past deraza) */
  const asos = reja.map(r => bolaklar(r.pastki, r.ts.pastki));
  /* quvur — moyka devori */
  const quvurlar = [];
  for (const u of (room.utilities || [])) {
    if (u.type !== 'pipe') continue;
    const r = reja.find(x => x.dv.i === +u.wall);
    if (r) quvurlar.push({ r, s: r.dv.oraliq(+u.offset || 0)[0] });
  }
  const derazalar = [];
  for (const o of (room.openings || [])) {
    if (o.type !== 'window') continue;
    const r = reja.find(x => x.dv.i === +o.wall);
    if (r) { const [a, b] = r.dv.oraliq(+o.offset || 0, +o.width || 0); derazalar.push({ r, a, b }); }
  }
  const quvurYoq = !quvurlar.length && (room.utilities || []).some(u => u.type === 'pipe');
  const asosiy = reja.slice().sort((a, b) => b.dv.len - a.dv.len)[0];
  const moykaR = quvurlar.length ? quvurlar[0].r : derazalar.length ? derazalar[0].r : asosiy;
  /* plita: L/U da moykadan boshqa eng uzun qanot (≥ 1500), aks holda moyka devori */
  const boshqa = reja.filter(r => r !== moykaR).sort((a, b) => (b.pastki.s1 - b.pastki.s0) - (a.pastki.s1 - a.pastki.s0))[0];
  const plitaR = talab.plita && boshqa && boshqa.pastki.s1 - boshqa.pastki.s0 >= 1500 ? boshqa : moykaR;

  const Wm = Q.moyka.eni, Wp = Q.plita.eni, Wx = Q.xolodilnik.eni, Wpn = Q.penalEni || 600, Wd = Q.posudomoykaEni || 600;
  const xOpts = [null];
  if (talab.xolodilnik) {
    xOpts.length = 0;
    reja.forEach((r, k) => r.erkinUch.forEach(u => xOpts.push({ k, u })));
  }
  /* egasi #183: penal — qator chetida (muzlatgich shu chetda bo'lsa — uning yonida); idish yuvish mashinasi — moyka yonida */
  const pnOpts = [null];
  if (talab.penal) { pnOpts.length = 0; reja.forEach((r, k) => r.erkinUch.forEach(u => pnOpts.push({ k, u }))); }
  const dOpts = talab.posudomoyka && talab.moyka !== false ? ['ong', 'chap'] : [null];
  /* langar nomzodlari (50 mm qadam + quvurga aniq) */
  const nomzod = (k, w) => {
    const out = new Set();
    for (const b of asos[k]) {
      for (let s = b.s0; s + w <= b.s1 + 0.5; s += Q.qadam) out.add(Math.round(s));
      if (b.s1 - w >= b.s0) out.add(Math.round(b.s1 - w));
    }
    for (const q of quvurlar) if (q.r === reja[k]) out.add(Math.round(q.s - w / 2));
    return [...out].sort((a, b) => a - b);
  };
  const km = reja.indexOf(moykaR), kp = reja.indexOf(plitaR);
  const mS = talab.moyka !== false ? nomzod(km, Wm) : [null];
  const pS = talab.plita ? nomzod(kp, Wp) : [null];
  let eng = null;

  for (const xo of xOpts) for (const pn of pnOpts) for (const dd of dOpts) {
    for (const ms of mS) {
      for (const ps of pS) {
        /* langarlar ro'yxati har devor uchun: [s0, s1, tur] */
        const lang = reja.map(() => []);
        if (xo) { const r = reja[xo.k]; const s = xo.u === 'S' ? r.pastki.s0 : r.pastki.s1 - Wx; lang[xo.k].push([s, s + Wx, 'xolodilnik']); }
        if (pn) {
          const r = reja[pn.k], yon = xo && xo.k === pn.k && xo.u === pn.u ? Wx : 0;
          const s = pn.u === 'S' ? r.pastki.s0 + yon : r.pastki.s1 - yon - Wpn;
          lang[pn.k].push([s, s + Wpn, 'penal']);
        }
        if (ms != null) lang[km].push([ms, ms + Wm, 'moyka']);
        if (ms != null && dd) lang[km].push(dd === 'ong' ? [ms + Wm, ms + Wm + Wd, 'posudomoyka'] : [ms - Wd, ms, 'posudomoyka']);
        if (ps != null) lang[kp].push([ps, ps + Wp, 'plita']);
        let ok = true, cost = 0;
        const segs = reja.map(() => []);
        for (let k = 0; k < reja.length && ok; k++) {
          const L = lang[k].sort((a, b) => a[0] - b[0]);
          for (let i = 1; i < L.length; i++) if (L[i][0] < L[i - 1][1]) ok = false;   // ustma-ust
          if (!ok) break;
          /* har langar bitta bo'lak ichida bo'lishi shart */
          for (const a of L) if (!asos[k].some(b => a[0] >= b.s0 - 0.5 && a[1] <= b.s1 + 0.5)) ok = false;
          if (!ok) break;
          for (const b of asos[k]) {
            let cur = b.s0, curT = b.b0;
            const ichida = L.filter(a => a[0] >= b.s0 - 0.5 && a[1] <= b.s1 + 0.5);
            for (const a of ichida) {
              const t = a[2] === 'moyka' || a[2] === 'posudomoyka' ? 'modul' : 'texnika';   // posudomoyka — fasadli (eshikli modul kabi)
              segs[k].push({ s0: cur, s1: a[0], b0: curT, b1: t, yonida: a[2] });
              segs[k].push({ s0: a[0], s1: a[1], langar: a[2] });
              cur = a[1]; curT = t;
            }
            segs[k].push({ s0: cur, s1: b.s1, b0: curT, b1: b.b1 });
          }
        }
        if (!ok) continue;
        /* plita qoidalari: yonida ≥ Q.plita.yon modul (devor/muzlatgich/bo'lak chetidan), derazadan uzoq */
        if (ps != null) {
          const sg = segs[kp];
          const i = sg.findIndex(s => s.langar === 'plita');
          const chap = sg[i - 1], ong = sg[i + 1];
          const yon = (s) => s && s.s1 - s.s0 >= Q.plita.yon - 0.5;
          if (!yon(chap) || !yon(ong)) continue;
          if (derazalar.some(d => d.r === plitaR && ps < d.b + Q.plita.derazadan && ps + Wp > d.a - Q.plita.derazadan)) continue;
        }
        /* moyka–plita oralig'i (bir devorda) */
        if (ms != null && ps != null && km === kp) {
          const gap = ms < ps ? ps - (ms + Wm) : ms - (ps + Wp);
          if (gap < Q.moyka.plitadan) continue;
          cost += gap > 1800 ? (gap - 1800) / 200 : 0;
        }
        /* to'ldirish */
        for (let k = 0; k < reja.length && ok; k++) {
          for (const s of segs[k]) {
            if (s.langar) continue;
            const L = s.s1 - s.s0;
            if (L > 0.5 && L < Q.minQator && s.b0 !== 'devor' && s.b1 !== 'devor' && s.b0 !== 'burchak' && s.b1 !== 'burchak') { ok = false; break; }
            const f = fill(Math.round(L), s.b0, s.b1);
            if (!f) { ok = false; break; }
            s.f = f; cost += f.cost;
          }
        }
        if (!ok) continue;
        /* jarimalar: moyka quvurdan uzoq, derazadan uzoq (quvur bo'lmasa); quvur bu shakl devorlarida yo'q — katta jarima
           (suv quvurini ko'chirish qimmat) */
        if (ms != null && quvurYoq) cost += 40;
        if (ms != null) {
          const c = ms + Wm / 2;
          const q = quvurlar.find(x => x.r === moykaR);
          if (q) cost += Math.abs(c - q.s) / 50;
          else { const d = derazalar.find(x => x.r === moykaR); if (d) cost += Math.abs(c - (d.a + d.b) / 2) / 100; }
        }
        if (!eng || cost < eng.cost - 1e-9) eng = { cost, segs: segs.map(x => x.map(s => Object.assign({}, s))), xo, pn, dd, ms, ps, km, kp };
      }
    }
  }
  return eng;
}

/** Pastki qatlam bo'laklari → elementlar [{s0, w, tur}] */
function pastkiElementlar(eng, reja, Q, chek) {
  return reja.map((r, k) => {
    const out = [];
    if (r.oxir) out.push({ s0: r.dv.len - r.Wkp, w: 0, tur: 'burchak' });
    for (const s of eng.segs[k]) {
      if (s.langar) { out.push({ s0: s.s0, w: s.s1 - s.s0, tur: s.langar }); continue; }
      let x = s.s0;
      for (const it of (s.f && s.f.items) || []) { out.push({ s0: x, w: it.w, tur: it.tur }); x += it.w; }
    }
    /* plita yonidagi bir eshikli modul — tortmali (qoshiq, idish uchun): avval moykadan uzoq tomon, dobor o'tkazib yuboriladi.
       egasi #166: Q.tortmaModul > 1 — plitaga yaqinidan boshlab navbat bilan (ikki tomonda) shuncha bir eshikli modul */
    const kerak = Q.tortmaModul != null ? Q.tortmaModul : 1;
    out.forEach((e, i) => {
      if (e.tur !== 'plita' || kerak < 1) return;
      const tomon = (dir) => { const r = []; for (let j = i + dir; j >= 0 && j < out.length; j += dir) { if (out[j].tur !== 'dobor') r.push(out[j]); } return r; };
      const moykaChapda = out.findIndex(x => x.tur === 'moyka') < i;
      const [A, B] = moykaChapda ? [tomon(1), tomon(-1)] : [tomon(-1), tomon(1)];
      let tartib = [A[0], B[0]];
      if (kerak > 1) { tartib = []; for (let k = 0; k < Math.max(A.length, B.length); k++) tartib.push(A[k], B[k]); }
      const bor = tartib.filter(x => x && x.tur === 'bir').slice(0, kerak);
      bor.forEach(t => { t.tur = 'tortma'; });
      /* egasi #166: matnda tortma aytilgan, plita yonida bir eshikli modul yetmadi — yaqin ikki eshikli modul ikkiga bo'linadi:
         plita tomonda tortmali (bir eshikli eni chegarasida, afzal enlar), qolgani — bir yoki ikki eshikli (eni chegarasi ichida) */
      if (!Q.oshxona || !chek || bor.length >= kerak) return;
      let qoldi = kerak - bor.length;
      const navbat = []; for (let k = 0; k < Math.max(A.length, B.length); k++) navbat.push(A[k], B[k]);
      for (const x of navbat) {
        if (!qoldi) break;
        if (!x || x.tur !== 'ikki') continue;
        const turi = (w) => w >= chek.bir[0] && w <= chek.bir[1] ? 'bir' : w >= chek.ikki[0] && w <= chek.ikki[1] ? 'ikki' : null;
        const tw = Q.afzal.bir.find(w => w >= chek.bir[0] && w <= chek.bir[1] && turi(x.w - w));
        if (!tw) continue;
        const r = x.w - tw, chapda = x.s0 < e.s0, j = out.indexOf(x);
        const qism = chapda ? [{ s0: x.s0, w: r, tur: turi(r) }, { s0: x.s0 + r, w: tw, tur: 'tortma' }]
          : [{ s0: x.s0, w: tw, tur: 'tortma' }, { s0: x.s0 + tw, w: r, tur: turi(r) }];
        out.splice(j, 1, ...qism);
        qoldi--;
      }
    });
    return out;
  });
}

/** Ustki qatlam: to'siqlar (deraza, eshik, muzlatgich, vityajka), pastki chegaralarga tekislab */
function ustkiElementlar(reja, past, Q, chek) {
  return reja.map((r, k) => {
    const out = [];
    if (r.oxir) out.push({ s0: r.dv.len - r.Wku, w: 0, tur: 'burchak' });
    const bl = r.ts.ustki.slice();
    for (const e of past[k]) {
      if (e.tur === 'xolodilnik' || e.tur === 'penal') bl.push([e.s0, e.s0 + e.w, e.tur]);   // baland modul ustida ustki shkaf yo'q
      if (e.tur === 'plita') {
        const vw = Q.vityajkaEni || 450, s = e.s0 + (e.w - vw) / 2;
        out.push({ s0: s, w: vw, tur: 'vityajka' });
        bl.push([s, s + vw, 'vityajka']);
      }
    }
    const kesish = new Set(past[k].filter(e => e.w > 0).flatMap(e => [Math.round(e.s0), Math.round(e.s0 + e.w)]));
    /* uchdagi dobor (devor, burchak, muzlatgich yonida — shart): eni pastki qatordagi shu joydagi dobor bilan bir xil, aks holda min */
    const pastDobor = (s, chap) => past[k].find(e => e.tur === 'dobor' && Math.abs((chap ? e.s0 : e.s0 + e.w) - s) < 1);
    const dobEni = (tur, s, chap) => {
      const r0 = tur === 'devor' ? Q.dobor.devor : tur === 'burchak' ? Q.dobor.burchak : tur === 'texnika' ? Q.dobor.texnika : null;
      if (!r0) return 0;
      const pd = pastDobor(s, chap);
      return pd && pd.w >= r0[0] && pd.w <= r0[1] ? pd.w : r0[0];
    };
    for (const b0 of bolaklar(r.ustki, bl)) {
      const f0 = dobEni(b0.b0, b0.s0, true), f1 = dobEni(b0.b1, b0.s1, false);
      if (b0.s1 - b0.s0 < f0 + f1 + 1) continue;
      if (f0) out.push({ s0: b0.s0, w: f0, tur: 'dobor' });
      if (f1) out.push({ s0: b0.s1 - f1, w: f1, tur: 'dobor' });
      const b = { s0: b0.s0 + f0, s1: b0.s1 - f1, b0: f0 ? 'modul' : b0.b0, b1: f1 ? 'modul' : b0.b1 };
      const L = b.s1 - b.s0;
      if (L < 1) continue;
      /* pastki chegaralar bo'yicha bo'laklar */
      let pts = [b.s0, ...[...kesish].filter(x => x > b.s0 + 0.5 && x < b.s1 - 0.5).sort((a, c) => a - c), b.s1];
      const tur = (w, chet) => w >= chek.bir[0] && w <= chek.bir[1] ? 'bir' : w >= chek.ikki[0] && w <= chek.ikki[1] ? 'ikki'
        : Math.abs(w - 200) < 1 ? 'ochiq' : chet && w <= Q.dobor.ustki[1] ? 'dobor' : null;
      let ok = false;
      for (let iter = 0; iter < 40; iter++) {
        let bad = -1;
        for (let i = 0; i < pts.length - 1; i++) {
          const w = pts[i + 1] - pts[i], chet = i === 0 || i === pts.length - 2;
          if (!tur(w, chet)) { bad = i; break; }
        }
        if (bad < 0) { ok = true; break; }
        if (pts.length <= 2) break;
        /* yomon bo'lakni qo'shnisi bilan birlashtirish (kichikroq qo'shni) */
        const wl = bad > 0 ? pts[bad] - pts[bad - 1] : Infinity, wr = bad < pts.length - 2 ? pts[bad + 2] - pts[bad + 1] : Infinity;
        if (wl <= wr && bad > 0) pts.splice(bad, 1); else pts.splice(bad + 1, 1);
      }
      if (ok) {
        for (let i = 0; i < pts.length - 1; i++) {
          const w = pts[i + 1] - pts[i];
          out.push({ s0: pts[i], w, tur: tur(w, i === 0 || i === pts.length - 2) });
        }
      } else {
        const f = toldir(Math.round(L), b.b0, b.b1, chek, Q, { ustki: true });
        if (!f) continue;                                 // bu bo'lak ustki shkafsiz qoladi
        let x = b.s0;
        for (const it of f.items) { out.push({ s0: x, w: it.w, tur: it.tur }); x += it.w; }
      }
    }
    return out.sort((a, c) => a.s0 - c.s0);
  });
}

/** element → placement */
function joylash(dv, e, qatlam, Q, catalog, id) {
  const M = Q.modul;
  const P = qatlam === 'p', A = qatlam === 'a';
  const AM = A && Q.antresol.modul ? Q.antresol.modul : null;               // egasi #168: antresol oilasi (MC-KA yoki MC-KU)
  const frg = {
    bir: AM ? AM.bir : P ? M.pastki.bir : M.ustki.bir, ikki: AM ? AM.ikki : P ? M.pastki.ikki : M.ustki.ikki, tortma: M.pastki.tortma,
    moyka: Q.moyka.eni > 540 ? M.pastki.moyka2 : M.pastki.moyka1, burchak: P ? M.pastki.burchak : M.ustki.burchak,
    dobor: P ? M.dobor.pastki : M.dobor.ustki, ochiq: M.ustki.ochiq, vityajka: M.ustki.vityajka,
    xolodilnik: M.texnika.xolodilnik, plita: M.texnika.plita,
    penal: (Q.qoshimcha || {}).penal, posudomoyka: (Q.qoshimcha || {}).posudomoyka
  }[e.tur];
  const f = catalog[frg] || {};
  /* pastki modul — o'z oyog'ida (MC: Bazis'dagidek 100 mm, sokol modulning o'z detali; default_z — fr3d_import) */
  let w = e.w || +f.w, d = P ? Q.pastki.d : Q.ustki.d, h = P ? Q.pastki.h : Q.ustki.h, z = P ? (+f.default_z || 0) : Q.ustki.z;
  if (A) { d = Q.antresol.d; h = Q.antresol.h; z = Q.antresol.z; }               // egasi #166: 3-qavat (antresol)
  if (e.tur === 'xolodilnik' || e.tur === 'plita' || e.tur === 'penal' || e.tur === 'posudomoyka') { d = +f.d || d; h = +f.h || h; z = 0; }
  /* vityajka shkafi — ustki qator tepasiga tekis; vityajka (texnika, SP-TX-006) — ustki qator ostiga tekis (fartuk tepasi) */
  if (e.tur === 'vityajka') { d = +f.d || d; h = +f.h || 400; z = f.category === 'appliance' ? Q.ustki.z : Q.ustki.z + Q.ustki.h - h; }
  if (e.tur === 'burchak') w = +f.w;
  const [x, y] = dv.nuqta(e.s0);
  return { id, frg, name: f.name || frg, x: Math.round(x), y: Math.round(y), z: Math.round(z), w: Math.round(w), d: Math.round(d), h: Math.round(h), rot: dv.rot, qty: 1, _tur: e.tur, _qatlam: qatlam, _devor: dv.i, _s0: e.s0 };
}

/** Bir eshikli modullar — boshlang'ich petlya: devor/dobor yonida — devor tomonga, aks holda chap */
function boshlangichPetlya(pl) {
  const qator = {};
  for (const p of pl) (qator[p._devor + p._qatlam] = qator[p._devor + p._qatlam] || []).push(p);
  for (const list of Object.values(qator)) {
    list.sort((a, b) => a._s0 - b._s0);
    list.forEach((p, i) => {
      if (p._tur !== 'bir') return;
      const chap = list[i - 1], ong = list[i + 1];
      const devorChap = !chap || chap._tur === 'dobor', devorOng = !ong || ong._tur === 'dobor';
      p.hinge = devorOng && !devorChap ? 'right' : 'left';
    });
  }
}

function variantQur(sh, room, talab, Q, catalog) {
  const chekP = { bir: chegara(catalog, Q.modul.pastki.bir, [300, 540]), ikki: chegara(catalog, Q.modul.pastki.ikki, [600, 1070]) };
  const chekU = { bir: chegara(catalog, Q.modul.ustki.bir, [300, 540]), ikki: chegara(catalog, Q.modul.ustki.ikki, [600, 1070]) };
  Q = Object.assign({}, Q, { vityajkaEni: Q.vityajkaEni || (catalog[Q.modul.ustki.vityajka] || {}).w || 450 });
  const reja = shaklRejasi(sh, room, Q, catalog, talab);
  const eng = pastkiQidir(reja, room, talab, Q, chekP);
  if (!eng) return null;
  const past = pastkiElementlar(eng, reja, Q, chekP);
  const ust = talab.ustki === false ? reja.map(() => []) : ustkiElementlar(reja, past, Q, chekU);
  /* egasi #166: 3-qavat (antresol) — ustki qator ustida, butun qator bo'ylab (vityajka va muzlatgich uni to'smaydi) */
  const AM = Q.antresol && Q.antresol.modul;
  const chekA = AM ? { bir: chegara(catalog, AM.bir, chekU.bir), ikki: chegara(catalog, AM.ikki, chekU.ikki) } : chekU;
  const ant = Q.antresol ? ustkiElementlar(reja, past.map(l => l.filter(e => e.tur !== 'plita' && e.tur !== 'xolodilnik' && e.tur !== 'penal')), AM && AM.oila === 'antresol' ? Object.assign({}, Q, { dobor: Object.assign({}, Q.dobor) }) : Q, chekA)
    .map(l => AM && AM.oila === 'antresol' ? l.filter(e => e.tur !== 'ochiq') : l) : reja.map(() => []);
  const pl = [];
  let n = 0;
  reja.forEach((r, k) => {
    for (const e of past[k]) pl.push(joylash(r.dv, e, 'p', Q, catalog, 'k' + (++n)));
    for (const e of ust[k]) pl.push(joylash(r.dv, e, 'u', Q, catalog, 'k' + (++n)));
    for (const e of ant[k]) pl.push(joylash(r.dv, e, 'a', Q, catalog, 'k' + (++n)));
  });
  if (Q.ruchkasiz || Q.yonaltiruvchi) {
    for (const p of pl) {
      const f = catalog[p.frg] || {};
      if (f.category === 'appliance') continue;
      if (Q.ruchkasiz) p.ruchkasiz = true;                       // ruchka va ruchka teshigi yo'q (cutlist, 3D; dobor ham — avtomatik RU-128 yo'q)
      if (Q.yonaltiruvchi && p._tur === 'tortma') p.yonaltiruvchi = Q.yonaltiruvchi;
    }
  }
  /* egasi #168: oshxona matnidan — hamma o'lcham katalog modulining chegarasida (chegaradan tashqarisi izohda) */
  const chegaraIzoh = Q.oshxona ? chegaragaKeltir(pl, catalog) : [];
  boshlangichPetlya(pl);
  petlyaTanla(pl, catalog, room, { burchak: Q.eshik.burchak });

  /* izohlar */
  const izohlar = [];
  const top = (t) => pl.find(p => p._tur === t);
  const devorN = (p) => p._devor + 1;
  const mo = top('moyka'), pt = top('plita'), xl = top('xolodilnik');
  /* izohlar — qisqa kalit (ekranda: t('konstruktor.iz_' + kalit, v)) */
  if (mo) {
    const sabab = (room.utilities || []).some(u => u.type === 'pipe' && +u.wall === mo._devor) ? 'quvur'
      : (room.openings || []).some(o => o.type === 'window' && +o.wall === mo._devor) ? 'deraza' : 'devor';
    izohlar.push({ kalit: 'moyka_' + sabab, v: { d: devorN(mo), s: Math.round(mo._s0) } });
  }
  if (pt) izohlar.push({ kalit: 'plita', v: { d: devorN(pt), s: Math.round(pt._s0), yon: Q.plita.yon } });
  if (xl) izohlar.push({ kalit: 'xolodilnik', v: { d: devorN(xl) } });
  const dob = pl.filter(p => p._tur === 'dobor');
  if (dob.length) izohlar.push({ kalit: 'dobor', v: { n: dob.length, w: [...new Set(dob.map(p => p.w))].join(', ') } });
  if ((room.openings || []).some(o => o.type === 'window' && reja.some(r => r.dv.i === +o.wall))) izohlar.push({ kalit: 'deraza', v: {} });

  const placements = pl.map(p => { const o = Object.assign({}, p); for (const k of Object.keys(o)) if (k[0] === '_') delete o[k]; return o; });
  const kitchen = { stoleshnitsa: true, stoleshnitsaD: Q.stoleshnitsa.d, sokol: true, dobor: false, karniz: false, moyka: { on: false, offset: 600, fromBack: 100, size: 500 } };
  if (Q.stoleshnitsa.qalinlik) kitchen.stolT = Q.stoleshnitsa.qalinlik;
  const osh = Q.oshxona ? Object.assign(oshxonaXulosa(pl, Q, catalog), { chegara: chegaraIzoh, antresolOila: AM ? AM.oila : null }) : null;
  if (osh && osh.gola) kitchen.gola = osh.gola;
  /* tekshiruv */
  const doc = { room, placements, kitchen };
  const v = validateDoc(doc, { catalog });
  const ogoh = [];
  for (const e of v.errors) ogoh.push({ kod: e.code, matn: e.message });
  for (const w of v.warnings) ogoh.push({ kod: w.code, matn: w.message });
  for (const t of eshikToqnashuvlari(placements, catalog, room, { burchak: Q.eshik.burchak })) ogoh.push({ kod: 'W_ESHIK', tur: t.tur, matn: t.a + ' ~ ' + (t.b || t.tur) });
  /* talab.devor (masalan, kameraga qaragan orqa devor) — shu devorsiz variantga kichik jarima */
  const baho = eng.cost + ogoh.length * 50 + (sh.shakl === 'I' ? 0 : sh.shakl === 'L' ? 2 : 4)
    + (talab.devor != null && !sh.walls.some(d => d.i === +talab.devor) ? 15 : 0);
  return {
    shakl: sh.shakl, nom: SHAKL_NOMI[sh.shakl], devorlar: sh.walls.map(d => d.i), placements, kitchen, izohlar, ogohlantirishlar: ogoh, baho,
    modullar: placements.length, uzunlik: Math.round(reja.reduce((a, r) => a + r.dv.len, 0)),
    ...(osh ? { oshxona: osh } : {})
  };
}

/**
 * egasi #166: oshxona spec'i (engine/oshxonaTili.js) → qoidalar ustiga yoziladigan qiymatlar. Aytilmagani — QOIDALAR/katalog standarti.
 *   1-qavat bo'yi — poldan stoleshnitsa ustigacha: korpus = bo'yi − oyoq (MC default_z) − stoleshnitsa qalinligi.
 *   2-qavat — fartuk tepasidan (z = 1-qavat + fartuk), 3-qavat (antresol) — 2-qavat ustida.
 */
export function oshxonaQoidalar(spec, catalog, Q0 = qoidalar()) {
  const oyoq = +(catalog[Q0.modul.pastki.bir] || {}).default_z || 0;
  const stolT = STOL_QALINLIK.includes(+(spec.stoleshnitsa || {}).qalinlik) ? +spec.stoleshnitsa.qalinlik : STOL_SUKUT_QALINLIK;
  const [q1 = {}, q2 = {}, q3] = spec.qavatlar || [];
  const pastkiH = q1.boyi ? q1.boyi - oyoq - stolT : Q0.pastki.h;
  const jami1 = oyoq + pastkiH + stolT;
  const ustZ = spec.fartuk ? jami1 + spec.fartuk : Q0.ustki.z;
  const ustH = q2.boyi || Q0.ustki.h, ustD = q2.chuqurligi || Q0.ustki.d;
  const antSukut = catalog['MC-KA-01'] || {};                                 // MC antresol (Bazis) — bo'yi aytilmasa
  const out = {
    oshxona: true,
    pastki: { h: pastkiH, d: q1.chuqurligi || Q0.pastki.d },
    ustki: { h: ustH, d: ustD, z: ustZ },
    stoleshnitsa: { d: (spec.stoleshnitsa || {}).chuqurligi || Q0.stoleshnitsa.d, qalinlik: stolT },
    plita: { eni: (spec.gaz || {}).eni || Q0.plita.eni },
    tortmaModul: (spec.tortma || {}).soni ? Math.ceil(spec.tortma.soni / 3) : 1,   // MC-KP-10 — 3 tortmali modul
    tortmaSoni: (spec.tortma || {}).soni || 3,
    ruchkasiz: !!spec.ruchkasiz, gola: !!spec.gola, yonaltiruvchi: (spec.tortma || {}).yonaltiruvchi || '',
    oyoq, jami1
  };
  if (q3) {
    const h = q3.boyi || +antSukut.h || 350, d = q3.chuqurligi || ustD;
    out.antresol = { h, d, z: ustZ + ustH, modul: antresolOila(h, d, catalog, Q0) };
  }
  /* vityajka: aytilgan eni MC vityajka shkafiga (eni qat'iy) teng bo'lmasa — shu enli vityajka texnikasi (SP-TX-006) */
  const ve = (spec.vytyajka || {}).eni, vk = catalog[Q0.modul.ustki.vityajka] || {}, tx = catalog['SP-TX-006'];
  if (ve && ve !== +vk.w && tx) { out.modul = { ustki: { vityajka: 'SP-TX-006' } }; out.vityajkaEni = ve; }
  else if (ve) out.vityajkaEni = +vk.w || ve;
  return out;
}

/* egasi #168: antresol — faqat katalogdagi modullar. Oilalar: MC antresol (MC-KA-01 1 fasad, MC-KA-02 2 fasad — o'lchami qat'iy)
   va MC ustki (MC-KU-06/07, eni/bo'yi/chuqurligi sex standarti chegarasida). So'ralgan bo'yi va chuqurligiga eng yaqini
   (chegaraga keltirilgandagi farq eng kichigi) tanlanadi — o'lcham o'ylab topilmaydi, chegaradan tashqarisi izohda */
const ANTRESOL_OILA = [{ nom: 'antresol', bir: 'MC-KA-01', ikki: 'MC-KA-02' }, { nom: 'ustki', bir: null, ikki: null }];
const chegarada = (v, a, b) => Math.max(a, Math.min(b, v));
function oraliq(f, o) { const v = +f[o]; return [+f['min_' + o] || v, +f['max_' + o] || v]; }
function antresolOila(h, d, catalog, Q0) {
  let eng = null;
  for (const o of ANTRESOL_OILA) {
    const bir = o.bir || Q0.modul.ustki.bir, ikki = o.ikki || Q0.modul.ustki.ikki;
    const fb = catalog[bir], fi = catalog[ikki];
    if (!fb || !fi) continue;
    const H = [Math.min(oraliq(fb, 'h')[0], oraliq(fi, 'h')[0]), Math.max(oraliq(fb, 'h')[1], oraliq(fi, 'h')[1])];
    const D = [Math.min(oraliq(fb, 'd')[0], oraliq(fi, 'd')[0]), Math.max(oraliq(fb, 'd')[1], oraliq(fi, 'd')[1])];
    const farq = Math.abs(h - chegarada(h, H[0], H[1])) + Math.abs(d - chegarada(d, D[0], D[1]));
    if (!eng || farq < eng.farq) eng = { oila: o.nom, bir, ikki, farq };
  }
  return eng;
}

/** egasi #168: joylashuv o'lchami — katalog modulining min/max chegarasiga; chegaradan tashqarisi → eng yaqin qiymat + izoh */
function chegaragaKeltir(pl, catalog) {
  const out = [];
  for (const p of pl) {
    const f = catalog[p.frg];
    if (!f || f.category === 'appliance') continue;
    for (const o of ['w', 'd', 'h']) {
      const [a, b] = oraliq(f, o);
      if (!(a > 0 && b > 0)) continue;
      const v = +p[o], w = chegarada(v, a, b);
      if (Math.abs(w - v) < 0.5) continue;
      out.push({ frg: p.frg, o, soraldi: Math.round(v), min: a, max: b, natija: w });
      p[o] = w;
    }
  }
  return out;
}

/** qurilgan oshxona xulosasi: qavatlar (z, bo'yi, chuqurligi, modul soni), tortma, Gola profil uzunligi (taklif) */
function oshxonaXulosa(pl, Q, catalog) {
  const mod = (q) => pl.filter(p => p._qatlam === q && (catalog[p.frg] || {}).category !== 'appliance' && p._tur !== 'dobor' && p._tur !== 'penal');   // penal — baland modul (qavat o'lchamiga kirmaydi)
  /* haqiqiy (chegaraga keltirilgan) o'lcham — qavatning birinchi moduli bo'yicha; modullar ro'yxati: kod, nomi, o'lchami, soni */
  const qavat = (q, z, h, d) => {
    const m = mod(q).filter(p => p._tur !== 'dobor'), r = {};
    for (const p of mod(q)) { const k = p.frg + '|' + p.w + '|' + p.d + '|' + p.h; (r[k] = r[k] || { frg: p.frg, nom: (catalog[p.frg] || {}).name || p.frg, w: p.w, d: p.d, h: p.h, n: 0 }).n++; }
    return { z, h: m.length ? m[0].h : h, d: m.length ? m[0].d : d, n: m.length, modullar: Object.values(r) };
  };
  const qavatlar = [qavat('p', Q.oyoq, Q.pastki.h, Q.pastki.d), qavat('u', Q.ustki.z, Q.ustki.h, Q.ustki.d)];
  if (Q.antresol) qavatlar.push(qavat('a', Q.antresol.z, Q.antresol.h, Q.antresol.d));
  const tortmaM = pl.filter(p => p._tur === 'tortma');
  let gola = null;
  if (Q.gola) {
    /* gorizontal: pastki fasadli modullar ustida (stoleshnitsa ostida) bitta chiziq + har tortmali modulda tortmalar orasida
       (3 tortma — 2 oraliq); vertikal — baland modul (penal) yo'q, 0. Sex amaliyoti tasdiqlanmagan — taklif */
    const ust = mod('p').reduce((a, p) => a + p.w, 0);
    const ora = tortmaM.reduce((a, p) => a + p.w * Math.max(0, Math.round(Q.tortmaSoni / Math.max(1, tortmaM.length)) - 1), 0);
    gola = { gorizontal: Math.round(ust + ora), vertikal: 0 };
  }
  return { qavatlar, tortma: { modul: tortmaM.length, soni: tortmaM.length * 3, yonaltiruvchi: Q.yonaltiruvchi }, gola, ruchkasiz: !!Q.ruchkasiz, jami1: Q.jami1 };
}

/**
 * Asosiy funksiya. Variantlar bahosi bo'yicha (kichik — yaxshi), har shakldan eng yaxshisi, ko'pi bilan 3 ta.
 */
export function konstruksiya(room, talab = {}, catalog = {}, opt = {}) {
  /* egasi #152: modul devorga tiralmaydi — konstruktor devor yuzasidan DEVOR_ORALIQ mm ichkaridagi "ichki xona"da ishlaydi
     (kontur T = qalinlik/2 + oraliq ga ichkariga; modullar shu chiziqqa taqaladi, burchakda — ikkala devordan). opt.devorOraliq — boshqa qiymat */
  if (room && Array.isArray(room.outline)) room = ichkiXona(room, devorChegara(room, opt.devorOraliq != null ? opt.devorOraliq : DEVOR_ORALIQ));
  /* egasi #166: talab.oshxona — matndan oshxona spec'i (qavatlar, fartuk, ruchkasiz, Gola, tortma, gaz, vityajka, stoleshnitsa) */
  if (talab.oshxona) opt = Object.assign({}, opt, { qoidalar: chuqurQosh(opt.qoidalar || {}, oshxonaQoidalar(talab.oshxona, catalog)) });
  const Q = qoidalar(opt.qoidalar);
  const t = Object.assign({ shakl: 'auto', xolodilnik: true, plita: 'erkin', moyka: true, ustki: true }, talab);
  /* egasi #183: penal / idish yuvish mashinasi — faqat so'ralsa; katalogda yo'q bo'lsa — qo'yilmaydi (chaqiruvchi "bajarilmadi" deydi) */
  const QS = Q.qoshimcha || {};
  if (t.penal && !catalog[QS.penal]) t.penal = false;
  if (t.posudomoyka && !catalog[QS.posudomoyka]) t.posudomoyka = false;
  const Qx = Object.assign({}, Q, { penalEni: +(catalog[QS.penal] || {}).w || 600, posudomoykaEni: +(catalog[QS.posudomoyka] || {}).w || 600 });
  const W = devorlar(room);
  if (!W.length) return { variantlar: [], xato: 'S3D-KONS-101' };
  const yoq = Object.values(Q.modul).flatMap(g => Object.values(g)).filter(c => !catalog[c]);
  if (yoq.length) return { variantlar: [], xato: 'S3D-KONS-102', yoq };
  let nomzod = shakllar(W, t, Q);
  if (t.shakl !== 'auto') nomzod = nomzod.filter(s => s.shakl === t.shakl);
  /* joy yetmasa — bosqichma-bosqich: muzlatgichsiz → muzlatgichsiz va qisqa oraliqlar → plitasiz (har biri izoh bilan) */
  const bosqich = [{ t }];
  const QISQA = { plita: { yon: 150 }, moyka: { plitadan: 300 } };
  if (t.xolodilnik) bosqich.push({ t: Object.assign({}, t, { xolodilnik: false }), izoh: 'joy_xolodilnik' });
  if (t.plita) bosqich.push({ t: Object.assign({}, t, { xolodilnik: false }), q: QISQA, izoh: 'joy_qisqa' });
  /* egasi #183: so'ralgan penal / idish yuvish mashinasi — plitadan oldin olib tashlanadi (har biri izoh bilan; karta "bajarilmadi" deydi) */
  let tq = Object.assign({}, t, { xolodilnik: false });
  if (t.posudomoyka) { tq = Object.assign({}, tq, { posudomoyka: false }); bosqich.push({ t: tq, q: t.plita ? QISQA : null, izoh: 'joy_posudomoyka' }); }
  if (t.penal) { tq = Object.assign({}, tq, { penal: false }); bosqich.push({ t: tq, q: t.plita ? QISQA : null, izoh: 'joy_penal' }); }
  if (t.plita) bosqich.push({ t: Object.assign({}, tq, { plita: false }), izoh: 'joy_plita' });
  for (const b of bosqich) {
    const Qb = Object.assign({}, b.q ? qoidalar(chuqurQosh(opt.qoidalar || {}, b.q)) : Q, { penalEni: Qx.penalEni, posudomoykaEni: Qx.posudomoykaEni });
    const eng = {};
    for (const sh of nomzod) {
      const v = variantQur(sh, room, b.t, Qb, catalog);
      if (!v) continue;
      if (!eng[sh.shakl] || v.baho < eng[sh.shakl].baho) eng[sh.shakl] = v;
    }
    const variantlar = Object.values(eng).sort((a, c) => a.baho - c.baho).slice(0, 3);
    if (variantlar.length) {
      if (b.izoh) for (const v of variantlar) v.izohlar.unshift({ kalit: b.izoh, v: {}, diqqat: true });
      return { variantlar };
    }
  }
  return { variantlar: [], xato: 'S3D-KONS-103' };
}
