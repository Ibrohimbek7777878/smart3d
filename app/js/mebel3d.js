/* Smart3D app/js/mebel3d.js — yumshoq va yotoqxona mebelining 3D ko'rinishi (egasi #239–#241: "yotoqxona mebel yaxshi chiqmagan,
 * spalni garnitur yo'q"). Namuna: texnika3d.js (texnika) va engine/deraza3d.js (oyna) — shu usul.
 *
 * Katalogda yopiq quti (asosiy_korpus — bitta panel) bo'lib chiziladigan modullar oddiy primitivlardan haqiqiy shaklda chiziladi:
 *   krovat (SP-BD-001/003/004, MC-KR-01…05): karkas (yog'och yoki mato), matras, yostiqlar, ko'rpa, boshi (izgolovye) va oyoq tomoni;
 *     boshi doim uzun o'qning -y (orqa) uchida; uzun o'qi x bo'lgan modullarda (w > d: MC-KR-01/04/05) shakl 90° buriladi (boshi -x da);
 *   krovat boshi (SP-BD-002), toshqin (SP-BD-006) — yumshoq skameyka;
 *   divan (SP-S-001/006), burchak divan (SP-S-002), kreslo (SP-S-003), divan qutisi (SP-S-005): oyoq, tag, qo'ltiq, suyanchiq, yostiqlar;
 *   komod (SP-BD-005): karkas, ustki taxta, 4 ta tortma (oldinga suriladi) va ruchkalar.
 * Stol va stul assembler'da allaqachon oyoq + stoleshnitsa/o'rindiq + suyanchiq panellaridan quriladi — bu faylga kirmaydi.
 * Faqat 3D ko'rinish: o'lcham, detal ro'yxati, kesim, narx O'ZGARMAYDI (assembler/cutlist'ga bog'liq emas).
 *
 * Koordinata (modul guruhi, markazda): x — eni, y — chuqurlik (old tomon +y), z — balandlik; themedMesh'dagidek.
 * Rang (modul kartasi "Modul materiali", opts.rang): korpus — yog'och karkas, fasad — mato / tortma fasadi; yo'q bo'lsa — realistik:
 * matras oq-bej, karkas yog'och, mato kulrang. */

/** kod → shakl turi */
const TUR = {
  'SP-BD-001': 'krovat', 'SP-BD-003': 'krovat', 'SP-BD-004': 'krovat',
  'MC-KR-01': 'krovat', 'MC-KR-02': 'krovat', 'MC-KR-03': 'krovat', 'MC-KR-04': 'krovat', 'MC-KR-05': 'krovat',
  'SP-BD-002': 'boshi', 'SP-BD-005': 'komod', 'SP-BD-006': 'toshqin',
  'SP-S-001': 'divan', 'SP-S-006': 'divan', 'SP-S-002': 'burchak', 'SP-S-003': 'kreslo', 'SP-S-005': 'skameyka'
};
export const MEBEL3D_KODLAR = Object.keys(TUR);
export function mebelTuri(code) { return TUR[code] || null; }

/** krovat 90° buriladimi (uzun o'qi x) — promptlar.js shu qoidadan foydalanadi: boshi devorga tiralsin */
export function boshiXda(frag) { return !!frag && TUR[frag.code] === 'krovat' && +frag.w > +frag.d; }

const std = (THREE, color, roughness = 0.9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** yumshoq quti: tepadan yumaloq to'rtburchak, qirrasi yumshoq (ExtrudeGeometry + bevel). Hajmi aniq bw × bd × bh. */
function yumGeo(THREE, bw, bd, bh, r) {
  const b = Math.max(1, Math.min(12, bh / 4, bw / 4, bd / 4));
  const iw = bw - 2 * b, id = bd - 2 * b;
  const rr = Math.max(1, Math.min(r - b, iw / 2 - 0.5, id / 2 - 0.5));
  const x = -iw / 2, y = -id / 2, s = new THREE.Shape();
  s.moveTo(x + rr, y); s.lineTo(x + iw - rr, y); s.absarc(x + iw - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + iw, y + id - rr); s.absarc(x + iw - rr, y + id - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + id); s.absarc(x + rr, y + id - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr); s.absarc(x + rr, y + rr, rr, Math.PI, 1.5 * Math.PI, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.5, bh - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -(bh / 2 - b));
  return g;
}

/**
 * @returns {THREE.Group} modul guruhi (themedMesh bilan bir xil userData: movers, themed)
 */
export function mebelMesh(THREE, frag, w, d, h, opts = {}) {
  const th = opts.theme || {};
  const Rg = (th.rangMat && opts.rang) || {};
  const code = frag ? frag.code : '';
  const tur = mebelTuri(code) || 'divan';
  const upholst = !!frag && frag.production === 'upholstery';
  const dekor = (r) => th.rangMat(r);
  const yogochMat = () => (Rg.korpus ? dekor(Rg.korpus) : th.mat ? th.mat('wood') : std(THREE, 0x9a7448, 0.6));
  const M = {
    yogoch: yogochMat(),
    fasad: Rg.fasad ? dekor(Rg.fasad) : th.mat ? th.mat('wood') : std(THREE, 0x9a7448, 0.6),
    oyoq: std(THREE, 0x4a3a2c, 0.55),
    mato: Rg.fasad ? dekor(Rg.fasad) : std(THREE, 0x8c9198, 0.96),
    mato2: Rg.fasad ? dekor(Rg.fasad) : std(THREE, 0x9ba1a8, 0.96),
    matras: std(THREE, 0xf2ede3, 0.92),
    yostiq: std(THREE, 0xfaf8f3, 0.95),
    korpa: std(THREE, 0xb8afa3, 0.96),
    plinth: std(THREE, 0x2b2622, 0.7),
    ichi: std(THREE, 0xd8cdb8, 0.7),
    ruchka: th.mat ? th.mat('handle') : std(THREE, 0x6b7280, 0.35, 0.8)
  };
  const group = new THREE.Group();
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData = { kind: 'hitBox' };
  group.add(hit);
  const movers = [];
  let soni = 0;
  const Z = (z) => z - h / 2;
  const P = (id, name, size) => ({ id, name, slot: 'mebel', size });
  /** quti: x0..x1, y0..y1, z0..z1 (z — poldan), yum > 0 — yumshoq burchak radiusi */
  function blok(mat, x0, x1, y0, y1, z0, z1, part, yum = 0, parent = group) {
    const bw = x1 - x0, bd = y1 - y0, bh = z1 - z0;
    if (!(bw > 0.5 && bd > 0.5 && bh > 0.5)) return null;
    const m = new THREE.Mesh(yum > 0 ? yumGeo(THREE, bw, bd, bh, yum) : new THREE.BoxGeometry(bw, bd, bh), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, Z((z0 + z1) / 2));
    m.castShadow = true; m.receiveShadow = true;
    m.userData = { slot: 'mebel' };
    if (part) { m.userData.part = part; m.userData.panelId = part.id; }
    parent.add(m); soni++;
    return m;
  }
  const oyoq4 = (x0, x1, y0, y1, bal, kv = 45, parent = group) => {
    for (const sx of [0, 1]) for (const sy of [0, 1]) {
      const cx = sx ? x1 - kv / 2 : x0 + kv / 2, cy = sy ? y1 - kv / 2 : y0 + kv / 2;
      blok(M.oyoq, cx - kv / 2, cx + kv / 2, cy - kv / 2, cy + kv / 2, 0, bal, P('oyoq', 'Oyoq', [kv, kv, bal]), 0, parent);
    }
  };
  /** n ta teng bo'lakka bo'lingan yostiqlar: [a, b) oraliqda */
  const bolak = (a, b, n, gap, fn) => { const sw = (b - a - gap * (n - 1)) / n; for (let i = 0; i < n; i++) fn(a + i * (sw + gap), a + i * (sw + gap) + sw, i); };

  /* ── krovat: W — eni, L — uzunligi (boshi -L/2 da), H — jami balandlik ── */
  function krovat(W, L, H, g) {
    const past = H <= 600, bola = !!frag && frag.code === 'MC-KR-01';
    const zr = past ? H - 150 : Math.min(420, Math.max(300, Math.round(H * 0.36)));   // karkas yon tepasi
    const T = 30, bT = past ? 60 : 80;
    const rama = upholst ? M.mato : M.yogoch;
    const part = (id, nom, s) => P(id, nom, s);
    if (upholst && !past) {
      oyoq4(-W / 2 + 10, W / 2 - 10, -L / 2 + 10, L / 2 - 10, 90, 50, g);
      blok(rama, -W / 2, -W / 2 + T, -L / 2, L / 2, 90, zr, part('karkas', 'Karkas', [T, L, zr]), 0, g);
      blok(rama, W / 2 - T, W / 2, -L / 2, L / 2, 90, zr, part('karkas', 'Karkas', [T, L, zr]), 0, g);
      blok(rama, -W / 2, W / 2, L / 2 - T, L / 2, 90, zr, part('karkas', 'Karkas', [W, T, zr]), 0, g);
    } else {
      blok(M.plinth, -W / 2 + 25, W / 2 - 25, -L / 2 + 25, L / 2 - 25, 0, 40, null, 0, g);
      blok(rama, -W / 2, -W / 2 + T, -L / 2, L / 2, 30, zr, part('karkas', 'Karkas', [T, L, zr]), 0, g);
      blok(rama, W / 2 - T, W / 2, -L / 2, L / 2, 30, zr, part('karkas', 'Karkas', [T, L, zr]), 0, g);
      blok(rama, -W / 2, W / 2, L / 2 - T, L / 2, 30, past ? zr : zr + (bola ? 150 : 60), part('oyoq_tomon', "Oyoq tomon (tagbosh)", [W, T, zr]), 0, g);
    }
    /* boshi (izgolovye): past krovatda — past to'siq, balandda — to'liq balandlik */
    blok(rama, -W / 2, W / 2, -L / 2, -L / 2 + bT, upholst && !past ? 60 : 30, past ? zr + 100 : H, part('bosh', 'Boshi (izgolovye)', [W, bT, past ? zr + 100 : H]), upholst && !past ? 24 : 0, g);
    if (!past) {   // yumshoq boshi: panel(lar) mato
      const n = upholst ? Math.max(2, Math.round(W / 380)) : 1;
      const x0 = -W / 2 + (upholst ? 30 : T + 30), x1 = W / 2 - (upholst ? 30 : T + 30);
      bolak(x0, x1, n, 10, (a, b) => blok(M.mato2, a, b, -L / 2 + bT, -L / 2 + bT + 32, zr + 70, H - 70, part('bosh_yumshoq', 'Boshi (yumshoq)', [b - a, 32, H - 70 - zr - 70]), 40, g));
    }
    blok(rama, -W / 2 + T, W / 2 - T, -L / 2 + bT, L / 2 - T, zr - 118, zr - 100, null, 0, g);          // yotoq tagi (taxta)
    const mx0 = -W / 2 + T + 8, mx1 = W / 2 - T - 8, my0 = -L / 2 + bT + 6, my1 = L / 2 - T - 6;
    blok(M.matras, mx0, mx1, my0, my1, zr - 100, zr + 80, part('matras', 'Matras', [mx1 - mx0, my1 - my0, 180]), 45, g);
    const pd = W < 900 ? 300 : 380, py0 = my0 + 20, np = W > 1100 ? 2 : 1, ph = H - (zr + 80) >= 70 ? 70 : Math.max(30, H - (zr + 80));
    const pw = Math.min(620, (mx1 - mx0 - 40 * (np + 1)) / np);
    for (let i = 0; i < np; i++) {
      const cx = ((mx0 + mx1) / 2) + (i - (np - 1) / 2) * (pw + 40);
      blok(M.yostiq, cx - pw / 2, cx + pw / 2, py0, py0 + pd, zr + 80, zr + 80 + ph, part('yostiq', 'Yostiq', [pw, pd, ph]), 60, g);
    }
    const ky0 = py0 + pd + 25;
    blok(M.korpa, mx0 - 6, mx1 + 6, ky0, my1 + 6, zr - 30, Math.min(H, zr + 80 + 28), part('korpa', "Ko'rpa", [mx1 - mx0, my1 - ky0, 110]), 50, g);
  }

  /* ── divan / kreslo / burchak / skameyka ── */
  function divan(kind) {
    const maxN = (iw) => Math.max(1, Math.round(iw / 650));
    if (kind === 'skameyka') {
      oyoq4(-w / 2 + 20, w / 2 - 20, -d / 2 + 20, d / 2 - 20, 70, 45);
      blok(M.mato, -w / 2, w / 2, -d / 2, d / 2, 70, 190, P('tag', 'Tag', [w, d, 120]), 25);
      bolak(-w / 2, w / 2, maxN(w), 6, (a, b) => blok(M.mato2, a, b, -d / 2, d / 2, 190, h, P('orindiq', "O'rindiq yostig'i", [b - a, d, h - 190]), 45));
      return;
    }
    const legH = 90, baseTop = Math.round(h * 0.30), cushTop = Math.round(h * 0.53);
    const kr = kind === 'kreslo', armW = kr ? 120 : 160, backT = Math.round(Math.min(260, d * 0.28)), armTop = Math.min(h - 60, cushTop + 190);
    if (kind === 'burchak') {
      const D1 = Math.round(Math.min(900, d * 0.56)), CW = Math.min(900, Math.round(w * 0.41));
      for (const [lx, ly] of [[-w / 2 + 24, -d / 2 + 24], [w / 2 - 24, -d / 2 + 24], [w / 2 - 24, d / 2 - 24], [-w / 2 + 24, -d / 2 + D1 - 24], [w / 2 - CW + 24, d / 2 - 24]])
        blok(M.oyoq, lx - 22, lx + 22, ly - 22, ly + 22, 0, legH, P('oyoq', 'Oyoq', [45, 45, legH]));
      blok(M.mato, -w / 2, w / 2, -d / 2, -d / 2 + D1, legH, baseTop, P('tag', 'Tag', [w, D1, baseTop - legH]), 25);
      blok(M.mato, w / 2 - CW, w / 2, -d / 2 + D1, d / 2, legH, baseTop, P('tag', 'Tag', [CW, d - D1, baseTop - legH]), 25);
      blok(M.mato, -w / 2, -w / 2 + armW, -d / 2, -d / 2 + D1, legH, armTop, P('qoltiq', "Qo'ltiq", [armW, D1, armTop - legH]), 60);
      blok(M.mato, w / 2 - armW, w / 2, -d / 2, d / 2, legH, armTop, P('qoltiq', "Qo'ltiq", [armW, d, armTop - legH]), 60);
      blok(M.mato, -w / 2 + armW, w / 2 - armW, -d / 2, -d / 2 + backT, baseTop, h, P('suyanchiq', 'Suyanchiq', [w - 2 * armW, backT, h - baseTop]), 50);
      const mx1 = w / 2 - CW;
      bolak(-w / 2 + armW, mx1, maxN(mx1 + w / 2 - armW), 6, (a, b) => blok(M.mato2, a, b, -d / 2 + backT, -d / 2 + D1, baseTop, cushTop, P('orindiq', "O'rindiq yostig'i", [b - a, D1 - backT, cushTop - baseTop]), 40));
      blok(M.mato2, mx1 + 3, w / 2 - armW, -d / 2 + backT, d / 2, baseTop, cushTop, P('orindiq', "O'rindiq yostig'i", [CW - armW - 3, d - backT, cushTop - baseTop]), 40);
      bolak(-w / 2 + armW, w / 2 - armW, maxN(w - 2 * armW), 6, (a, b) => blok(M.mato2, a, b, -d / 2 + backT, -d / 2 + backT + 130, cushTop, h - 30, P('suyanchiq_yostiq', 'Suyanchiq yostig\'i', [b - a, 130, h - 30 - cushTop]), 50));
      return;
    }
    oyoq4(-w / 2 + 25, w / 2 - 25, -d / 2 + 25, d / 2 - 25, legH, 45);
    blok(M.mato, -w / 2, w / 2, -d / 2, d / 2, legH, baseTop, P('tag', 'Tag', [w, d, baseTop - legH]), 25);
    blok(M.mato, -w / 2, -w / 2 + armW, -d / 2, d / 2, legH, armTop, P('qoltiq', "Qo'ltiq", [armW, d, armTop - legH]), 60);
    blok(M.mato, w / 2 - armW, w / 2, -d / 2, d / 2, legH, armTop, P('qoltiq', "Qo'ltiq", [armW, d, armTop - legH]), 60);
    blok(M.mato, -w / 2 + armW, w / 2 - armW, -d / 2, -d / 2 + backT, baseTop, h, P('suyanchiq', 'Suyanchiq', [w - 2 * armW, backT, h - baseTop]), 50);
    const n = kr ? 1 : maxN(w - 2 * armW);
    bolak(-w / 2 + armW, w / 2 - armW, n, 6, (a, b) => {
      blok(M.mato2, a, b, -d / 2 + backT, d / 2, baseTop, cushTop, P('orindiq', "O'rindiq yostig'i", [b - a, d - backT, cushTop - baseTop]), 40);
      blok(M.mato2, a, b, -d / 2 + backT, -d / 2 + backT + 130, cushTop, h - 30, P('suyanchiq_yostiq', "Suyanchiq yostig'i", [b - a, 130, h - 30 - cushTop]), 50);
    });
  }

  /* ── toshqin: oyoq tagida yumshoq skameyka; boshi: mustaqil yumshoq bosh panel ── */
  function toshqin() {
    oyoq4(-w / 2 + 40, w / 2 - 40, -d / 2 + 40, d / 2 - 40, 110, 50);
    blok(M.yogoch, -w / 2 + 8, w / 2 - 8, -d / 2 + 8, d / 2 - 8, 110, 170, P('karkas', 'Karkas', [w - 16, d - 16, 60]));
    blok(M.mato, -w / 2, w / 2, -d / 2, d / 2, 170, h, P('orindiq', 'Yumshoq usti', [w, d, h - 170]), 55);
  }
  function boshi() {
    for (const sx of [-1, 1]) blok(M.oyoq, sx * (w / 2 - 100) - 30, sx * (w / 2 - 100) + 30, -d / 2, -d / 2 + 60, 0, 120, P('oyoq', 'Oyoq', [60, 60, 120]));
    blok(M.yogoch, -w / 2, w / 2, -d / 2, -d / 2 + 30, 120, h, P('karkas', 'Karkas', [w, 30, h - 120]));
    const n = Math.max(2, Math.round(w / 380));
    bolak(-w / 2 + 25, w / 2 - 25, n, 10, (a, b) => blok(M.mato, a, b, -d / 2 + 30, d / 2, 170, h - 30, P('bosh_yumshoq', 'Boshi (yumshoq)', [b - a, d - 30, h - 200]), 45));
  }

  /* ── komod: karkas, ustki taxta, 4 tortma (oldinga suriladi), ruchkalar ── */
  function komod() {
    const T = 18, pl = 70, top = 25, n = 4, yf = d / 2 - 36;               // yf — karkasning old cheti; fasad shundan keyin
    blok(M.plinth, -w / 2 + 20, w / 2 - 20, -d / 2 + 20, yf - 10, 0, pl, null);
    blok(M.yogoch, -w / 2, -w / 2 + T, -d / 2, yf, pl, h - top, P('karkas', 'Karkas', [T, d, h - top - pl]));
    blok(M.yogoch, w / 2 - T, w / 2, -d / 2, yf, pl, h - top, P('karkas', 'Karkas', [T, d, h - top - pl]));
    blok(M.yogoch, -w / 2 + T, w / 2 - T, -d / 2, -d / 2 + 8, pl, h - top, P('orqa', 'Orqa devor', [w, 8, h - top - pl]));
    blok(M.yogoch, -w / 2 + T, w / 2 - T, -d / 2 + 8, yf, pl, pl + T, null);
    blok(M.yogoch, -w / 2, w / 2, -d / 2, d / 2, h - top, h, P('usti', 'Ustki taxta', [w, d, top]));
    const z0 = pl + T, pitch = (h - top - z0) / n;
    for (let i = 0; i < n; i++) {
      const key = 'tortma_' + (i + 1), zb = z0 + (n - 1 - i) * pitch;       // 1-tortma — eng tepada
      const gr = new THREE.Group(); group.add(gr);
      movers.push({ obj: gr, type: 'drawer', dist: Math.max(100, (d - 60) * 0.75), key });
      const part = P(key, i + 1 + '-tortma', [w - 2 * T, 18, pitch - 4]);
      const f = blok(M.fasad, -w / 2 + T + 2, w / 2 - T - 2, d / 2 - 34, d / 2 - 16, zb + 2, zb + pitch - 2, part, 0, gr);
      if (f) f.userData.mover = key;
      const hw = Math.min(180, w * 0.28);
      blok(M.ruchka, -hw / 2, hw / 2, d / 2 - 16, d / 2, zb + pitch / 2 - 6, zb + pitch / 2 + 6, part, 0, gr);
      const tx0 = -w / 2 + T + 14, tx1 = w / 2 - T - 14, ty0 = -d / 2 + 14, ty1 = d / 2 - 36;
      blok(M.ichi, tx0, tx1, ty0, ty1, zb + 14, zb + 28, null, 0, gr);
      blok(M.ichi, tx0, tx0 + 14, ty0, ty1, zb + 14, zb + pitch - 40, null, 0, gr);
      blok(M.ichi, tx1 - 14, tx1, ty0, ty1, zb + 14, zb + pitch - 40, null, 0, gr);
      blok(M.ichi, tx0, tx1, ty0, ty0 + 14, zb + 14, zb + pitch - 40, null, 0, gr);
    }
  }

  switch (tur) {
    case 'krovat': {
      const burish = boshiXda(frag);                                         // uzun o'qi x — boshi -x da
      const inner = new THREE.Group();
      if (burish) inner.rotation.z = -Math.PI / 2;
      group.add(inner);
      krovat(burish ? d : w, burish ? w : d, h, inner);
      break;
    }
    case 'boshi': boshi(); break;
    case 'toshqin': toshqin(); break;
    case 'komod': komod(); break;
    default: divan(tur);
  }
  group.userData = {
    kind: 'item', code, name: frag ? frag.name : '', category: frag ? frag.category : 'other',
    w, d, h, panelsCount: soni, doorsCount: movers.length, movers, themed: true, mebel3d: tur
  };
  return group;
}
