/* Rover (Biesse) CNC frezer dasturi — sexning HAQIQIY fayllari bo'yicha (Smart3D_toplam_2026-10-16/01_buyurtma_fayllari/03_cnc: 30 ta .ncc, 2 ta .tap).
 *
 * Haqiqiy fayllardan olingan qoidalar (tahlil, taxmin emas):
 *  - oddiy matn, qator oxiri CRLF, sarlavha/izoh yo'q; mm, absolyut; faqat G0 (tez) va G1 (ish) — yoy yo'q (G2/G3 yo'q), kontur ko'pburchak;
 *  - modal: G1 dan keyingi qatorlarda G va F yozilmaydi (`G1X..Y..F10000` → `X..Y..`); G0/G1 qatorlari oxirida F10000 (.ncc);
 *  - xavfsiz balandlik Z30, dastur oxirida park X100 Y2800 Z50 (list uzun tomoni — Y o'qi bo'ylab: 2800 × 2070 → Y 2800, X 2070);
 *  - chuqurlik = plita qalinligi (16 mm — bitta o'tish, Z-16), qalin plitada teng o'tishlar: 26 mm → 3 × 8,667; 38 mm → 5 × 7,6 (qadam ≈ 9 mm gacha);
 *  - .tap varianti — to'liq dastur: T1M6, S15000M3, ish tezligi F6300, tushish F2520, M30.
 * Sinov: texnolog Rover'da 1 arzon detalda tekshirmaguncha — SINOV (TZ-11). O'tib kesish (overcut) sexda nolga teng (Z = qalinlik); kerak bo'lsa opts.overcut.
 *
 * Kirish: nest (nesting natijasi: by_material → sheets → parts{x,y,length,width,rotated}), cutlists (qalinlik material bo'yicha olinadi).
 * Chiqish: har list uchun alohida dastur — [{ nom, matn, material, varaq, qalinlik, detal }]. */

export const ROVER_SOZ = {
  ncc: { feed: 10000, plunge: 10000, safeZ: 30, parkZ: 50, parkX: 100, parkY: 2800, sarlavha: false },
  tap: { feed: 6300, plunge: 2520, safeZ: 30, parkZ: 50, parkX: 100, parkY: 2800, sarlavha: true, shpindel: 15000 }
};

const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);

/** Chuqurlik bo'yicha o'tishlar: ≤16 mm — bitta, undan qalin — teng bo'laklar (qadam ≤ 9 mm): sexdagi 16→1, 26→3, 38→5 ga mos */
export function roverOtishlar(chuqurlik, opts) {
  const d = +chuqurlik > 0 ? +chuqurlik : 16;
  const bir = (opts && opts.birOtish) || 16, qadam = (opts && opts.qadam) || 9;
  const n = d <= bir ? 1 : Math.ceil(d / qadam - 1e-9);
  const z = [];
  for (let i = 1; i <= n; i++) z.push(Math.round((d * i / n) * 1000) / 1000);
  return z;
}

/** material kodi → qalinlik (mm): kesim ro'yxati qismlaridan */
export function materialQalinlik(cutlists) {
  const m = {};
  for (const cl of cutlists || []) for (const p of cl.parts || []) if (p.material && +p.thickness > 0 && !(p.material in m)) m[p.material] = +p.thickness;
  return m;
}

/** Bitta list uchun dastur matni */
function varaqDasturi(sheet, qalinlik, uslub, o) {
  const S = Object.assign({}, ROVER_SOZ[uslub], o.soz || {});
  const r = (o.toolDia || 6) / 2;
  const otish = roverOtishlar(qalinlik + (+o.overcut || 0), o);
  const alm = o.almashtir !== false && sheet.length >= sheet.width;   // list uzun tomoni — Y o'qi bo'ylab (sexdagi fayllardek)
  /* nesting: x — list uzunligi bo'ylab, y — eni bo'ylab. almashtir: Rover X = eni (nest y), Rover Y = uzunlik (nest x) */
  const P = (x, y) => alm ? [y, x] : [x, y];
  const L = [];
  const F = (v) => 'F' + (uslub === 'ncc' ? String(Math.round(v)) : v.toFixed(1));
  if (S.sarlavha) {
    L.push('T1M6', 'G0Z' + f3(S.parkZ), 'G0X' + f3(S.parkX) + 'Y' + f3(S.parkY) + 'S' + S.shpindel + 'M3');
  }
  let detal = 0;
  for (const p of sheet.parts || []) {
    const len = p.rotated ? p.width : p.length, wid = p.rotated ? p.length : p.width;
    const x0 = (+p.x || 0) - r, y0 = (+p.y || 0) - r, x1 = (+p.x || 0) + len + r, y1 = (+p.y || 0) + wid + r;   // asbob markazi — detaldan tashqarida
    const a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1);
    /* kontur teskari soat strelkasi bo'yicha (sexdagi fayllardek): a → b → c → d → a; alm bo'lsa ko'zgu bo'lgani uchun tartib teskari */
    const yol = alm ? [a, d, c, b, a] : [a, b, c, d, a];
    const tushish = F(S.plunge);
    if (uslub === 'ncc') L.push('G0X' + f3(yol[0][0]) + 'Y' + f3(yol[0][1]) + 'Z' + f3(S.safeZ) + F(S.feed));
    else L.push('G0X' + f3(yol[0][0]) + 'Y' + f3(yol[0][1]) + 'Z' + f3(S.safeZ));
    otish.forEach((z) => {
      L.push('G1Z-' + f3(z) + tushish);
      for (let k = 1; k < yol.length; k++) {
        const [px, py] = yol[k], [qx, qy] = yol[k - 1];
        const dx = px !== qx, dy = py !== qy;
        L.push((k === 1 ? 'G1' : '') + (dx ? 'X' + f3(px) : '') + (dy ? 'Y' + f3(py) : '') + (k === 1 ? F(S.feed) : ''));
      }
      /* kontur yopiq — keyingi o'tish xuddi shu boshlang'ich nuqtadan; oxirgi o'tishdan keyin ko'tariladi */
    });
    L.push('G0Z' + f3(S.safeZ) + (uslub === 'ncc' ? F(S.feed) : ''));
    detal++;
  }
  if (uslub === 'ncc') L.push('G0X' + f3(S.parkX) + 'Y' + f3(S.parkY) + 'Z' + f3(S.parkZ) + F(S.feed));
  else L.push('G0X' + f3(S.parkX) + 'Y' + f3(S.parkY) + 'Z' + f3(S.parkZ), 'G0Z' + f3(S.parkZ), 'G0X0Y0', 'M30');
  return { matn: L.join('\r\n') + '\r\n', detal };
}

/** Hamma list uchun dasturlar. opts: { uslub:'ncc'|'tap', toolDia, overcut, almashtir, qadam, birOtish, qalinlik:{material:mm} } */
export function roverProgramlar(nest, cutlists, opts) {
  const o = opts || {}, uslub = o.uslub === 'tap' ? 'tap' : 'ncc';
  const qal = Object.assign(materialQalinlik(cutlists), o.qalinlik || {});
  const out = [];
  for (const mat of Object.keys((nest && nest.by_material) || {})) {
    const nm = nest.by_material[mat];
    for (const sheet of nm.sheets || []) {
      const q = qal[mat] || +sheet.thickness || 16;
      const r = varaqDasturi(sheet, q, uslub, o);
      out.push({ nom: String(mat).replace(/[^\w.-]+/g, '_') + '-list' + sheet.no + '.' + uslub, matn: r.matn, material: mat, varaq: sheet.no, qalinlik: q, detal: r.detal });
    }
  }
  return out;
}
