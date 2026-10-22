/* Smart3D engine/bazis/teshikJoy.js — Bazis loyihasidagi mahkamlagichlar (.b3d daraxti) → JOYLASHUVI BILAN prisadka teshiklari (stanok/KDT uchun).
 *
 * Nima uchun: bazisLoyiha (loyiha.js) faqat teshik SONINI beradi (teshik.js — narx uchun). Sexning haqiqiy KDT fayllari esa teshik joyi bilan: Bazis
 * panelda teshik ro'yxatini saqlamaydi, teshikni mahkamlagich obyektidan va mahkamlash sxemasidan (daraxt.js: rec.sxema) hisoblaydi — biz ham shunday.
 *
 * O'qlar: panel konturi (X, Y) va qalinlik (Z) — panelning o'z freymi (tf.pos + tf.oq); kontur qutisi (bb) KDT detalning o'lchami (kromka bilan).
 *   Teshik: { X, Y, z0, edge, d, dp, kind } — X, Y panel freymida; z0 — Z=0 yuzadan kiradi (aks holda Z=qalinlik yuzadan);
 *   edge — null (yuza teshigi) | 'L' (X kichik qirra) | 'R' | 'B' (Y kichik) | 'F' (Y katta) — qirra teshigi.
 * Qoidalar sex fayllari bilan tekshirilgan (scripts/prisadka_solishtir.mjs, tests/verify_prisadka_real.mjs) — qiymatlar sxemadan (d1, d2, h …). */

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const TOL = 0.6;
const EVRO_RE = /^(евро|euro|yevro|evro)/i;                         // 3001 obyekt nomi: "Евро 51мм Алкан"
const EVRO_SUKUT = { d1: 7, d2: 4.5, h: 51 };
const PETLYA_RE = /петл|petl/i;
/* petlya sxemasi bo'lmasa/shifrlangan: sexdagi ochiq sxemalarning ko'pi (Y=21: 114 guruhdan 106 tasi; H=13; kosa vinti Y1=6, A1=48; planka X2=37, A2=32) */
const PETLYA_SUKUT = { D: 35, H: 13, Y: 21, D1: 3, H1: 2, Y1: 6, A1: 48, D2: 3, H2: 2, A2: 32, X2: 37 };
/* Sxemasi o'qilmaydigan (shifrlangan) petlya: sexning haqiqiy KDT sidagi uch oila — "Turkiya Samet" 21,5 / 13 (barcha buyurtmada), ruscha nomli petlyalar 22 / 12 (305 ta) yoki 21 / 13 */
const PETLYA_SAMET = { Y: 21.5, H: 13, H1: 3, H2: 3 };
const PETLYA_SXEMASIZ = { Y: 22, H: 12 };
const SAMOREZ_RE = /саморез|samorez|samarez|metka/i;
const RUCHKA_RE = /ручк|ruchk/i, PROFIL_RE = /профил|profil|gola/i;
const RUCHKA = { d: 5 };                                              // sex KDT: Ø5 o'tuvchi, oralig'i ruchka nomida (160, 192 …)
const EKS_RE = /эксцентрик|eksentrik|ekstsentrik/i;
/* Ekssentrik (sxema Param: D=7 H=35 — qirra teshigi; D1=10 H1=11 — juft detal yuzasida; D2=15 H2=12.5 — korpus yuzasida; x2=35 — uchidan) — d6.js EKS bilan bir xil sex qiymatlari */
const EKS_SUKUT = { D: 7, H: 35, D1: 10, H1: 11, D2: 15, H2: 12.5, x2: 35 };
/* Nomi teshik o'lchami bo'lgan obyektlar (boshqa CAD kutubxonasi): "8х13.0" — Ø8 × 13, "4.5х34" — Ø4,5 × 34, "7" — Ø7 o'tuvchi */
const NOM_TESHIK_RE = /^(\d+(?:[.,]\d+)?)\s*(?:[xх×]\s*(\d+(?:[.,]\d+)?))?$/i;
/* "Стяжка Minifix EC02/16" + "Шкант 8х30" (IKSENTRIK SHKANTLI; 3489, 3975 KDT): kosa Ø15×13 (uchidan 34), uchida Ø8×28, juft yuzada Ø10×13; shkant Ø8 — yuzada 11, uchida 22 */
const MINIFIX_RE = /minifix|минификс|стяжка/i;
const MINIFIX = { D2: 15, H2: 13, D: 8, H: 28, x2: 34, D1: 10, H1: 13 };
const SHKANT_RE = /^(шкант|shkant)/i;
const SHKANT = { d: 8, yuza: 11, qirra: 22 };
/* sxema Param (d, h1, h2) bo'lsa — o'sha; "Шкант 8х30404" (alohida "Шкант" guruhi; 3119, 3390, 3812, 4034 KDT): yuzada 10, uchida 20 */
const SHKANT_404 = { d: 8, yuza: 10, qirra: 20 };
const POLKA_RE = /полкодерж|polkoder|polkader/i;
const POLKA = { d: 5, dp: 9, past: 2.5 };                                       // sex KDT: Ø5 x 9 ko'r teshik (875 ta; sxemada diametr yo'q — f3d fayl)                       // sxema yo'q/shifrlangan: 30 buyurtmadagi ochiq sxemalarning 90% idagi qiymat

/** global nuqta → panel freymi */
function lok(pn, P) { const d = sub(P, pn.o.tf.pos), a = pn.o.tf.oq; return [dot(d, a[0]), dot(d, a[1]), dot(d, a[2])]; }
const bbIchida = (pn, x, y, tol) => x >= pn.bb.x0 - tol && x <= pn.bb.x1 + tol && y >= pn.bb.y0 - tol && y <= pn.bb.y1 + tol;

/** sxemasi bor guruhdan mahkamlagich parametrlari ({d1, d2, h} yoki hinge/ekssentrik …) */
const param = (o) => { const s = o.guruh && o.guruh.sxema && o.guruh.sxema.Scheme; return s && s.Furniture && s.Furniture.Param && typeof s.Furniture.Param === 'object' ? s.Furniture.Param : null; };


/** obyekt (furnitura) turgan yuza: nuqta panel yuzasida (Z=0 yoki Z=qalinlik) va kontur ichida; obyektning X o'qi shu yuzaga tik bo'lgan panel
 *  (qo'shni panel qirrasi ham nuqtani o'z ichiga olishi mumkin — masalan polka qirrasi yon devor yuzasida). Yagona bo'lmasa — null. */
function yuzadagiPanel(panels, o, ok = 0) {
  const p = o.tf.pos, u = o.tf.oq[ok];
  const nomzod = panels.filter(pn => { const l = lok(pn, p); return (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
  const tik = nomzod.filter(pn => Math.abs(Math.abs(dot(u, pn.o.tf.oq[2])) - 1) < 1e-3);
  return tik.length === 1 ? tik[0] : nomzod.length === 1 ? nomzod[0] : null;
}

/**
 * @param {Array} objects — daraxt.js obyektlari (tf global, guruh, sxema)
 * @param {Array<{ o, bb, t, ishlab }>} panels — bazisLoyiha paneli: o (obyekt), bb (konturBox), t (qalinlik), ishlab (kesiladimi)
 * @returns {Map<Object, Array>} panel (panels elementi) → teshiklar
 */
export function bazisTeshikJoy(objects, panels, opts = {}) {
  const out = new Map();
  const qosh = (pn, h) => { if (!pn.ishlab) return; (out.get(pn) || out.set(pn, []).get(pn)).push(h); };

  /* ── 1) Evrovint (konfirmat): A detalda o'tuvchi Ø d1, B detal qirrasida Ø d2 × (h − kirish masofasi). Parametrlar mahkamlash sxemasidan
   *    (guruh; d1, d2, h). Sxema shifrlangan/yo'q bo'lsa — shu fayldagi o'sha nomli vintning sxemasi, bo'lmasa sexda eng ko'p uchraydigan 7 / 4,5 / 51. ── */
  const evro = new Map();
  for (const o of objects) { const p = o.modelCode === 3001 ? param(o) : null; if (p && p.d1 && p.d2 && p.h && !evro.has(o.name)) evro.set(o.name, p); }
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !o.tf.oq || !EVRO_RE.test(o.name || '')) continue;
    const g = param(o);
    const P = (g && g.d1 && g.d2 && g.h ? g : null) || evro.get(o.name) || EVRO_SUKUT;
    const p = o.tf.pos;
    /* vint yo'nalishi: obyektning X o'qi (boshidan birikmaga); ba'zi guruhlarda teskari — ikkala yo'nalish sinaladi */
    let u, a, la, nz, b;
    for (const sg of [1, -1]) {
      const v = [o.tf.oq[0][0] * sg, o.tf.oq[0][1] * sg, o.tf.oq[0][2] * sg];
      const As = panels.filter(pn => { const l = lok(pn, p), n = dot(v, pn.o.tf.oq[2]); return Math.abs(Math.abs(n) - 1) < 1e-3 && Math.abs(l[2] - (n > 0 ? 0 : pn.t)) < TOL && bbIchida(pn, l[0], l[1], TOL); });
      if (As.length !== 1) continue;
      const q = [p[0] + v[0] * (As[0].t + 1), p[1] + v[1] * (As[0].t + 1), p[2] + v[2] * (As[0].t + 1)];
      const Bs = panels.filter(pn => { if (pn === As[0]) return false; const l = lok(pn, q); return Math.abs(dot(v, pn.o.tf.oq[2])) < 1e-3 && l[2] > -0.01 && l[2] < pn.t + 0.01 && bbIchida(pn, l[0], l[1], 0.01); });
      if (Bs.length !== 1) continue;
      u = v; a = As[0]; b = Bs[0]; la = lok(a, p); nz = dot(v, a.o.tf.oq[2]);
      break;
    }
    if (!a) continue;
    qosh(a, { X: la[0], Y: la[1], z0: nz > 0, edge: null, d: P.d1, dp: a.t, kind: 'evrovint' });
    const lb = lok(b, p), ex = dot(u, b.o.tf.oq[0]), ey = dot(u, b.o.tf.oq[1]);
    let edge, X, Y, s;
    if (Math.abs(ex) > 0.999) { edge = ex > 0 ? 'L' : 'R'; X = ex > 0 ? b.bb.x0 : b.bb.x1; Y = lb[1]; s = (X - lb[0]) / ex; }
    else if (Math.abs(ey) > 0.999) { edge = ey > 0 ? 'B' : 'F'; Y = ey > 0 ? b.bb.y0 : b.bb.y1; X = lb[0]; s = (Y - lb[1]) / ey; }
    else continue;
    qosh(b, { X, Y, z0: true, edge, d: P.d2, dp: Math.round((P.h - s) * 10) / 10, kind: 'evrovint_torets' });
  }

  /* ── 2) Petlya: eshikda kosa Ø D × H (eshik qirrasidan Y) va 2 vint Ø D1 × H1 (kosadan Y1 ichkarida, ±A1/2); yon devorda planka belgilari
   *    Ø D2 × H2 (old qirradan X2, petlya balandligida ±A2/2). Petlya obyekti: boshi eshik qirrasidan HingeOffset da (15 to'g'ri, 7 yarim egri, −1 egri) —
   *    o'qlari: X — eshikdan korpus ichiga, Y — qirradan eshik ichiga, Z — eshik uzunligi bo'ylab. ── */
  const nuqta = (o, a, b, c) => [o.tf.pos[0] + a[0] + b[0] + c[0], o.tf.pos[1] + a[1] + b[1] + c[1], o.tf.pos[2] + a[2] + b[2] + c[2]];
  const kat = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !o.tf.oq || !PETLYA_RE.test(o.name || '')) continue;
    const g = param(o), P = g && g.D && g.Y ? { ...PETLYA_SUKUT, ...g } : { ...PETLYA_SUKUT, ...(/samet/i.test(o.name) ? PETLYA_SAMET : PETLYA_SXEMASIZ) };
    const p = o.tf.pos, hx = o.tf.oq[0], hy = o.tf.oq[1], hz = o.tf.oq[2];
    const Ds = panels.filter(pn => { const l = lok(pn, p); return Math.abs(Math.abs(dot(hx, pn.o.tf.oq[2])) - 1) < 1e-3 && (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    if (Ds.length !== 1) continue;
    const d = Ds[0], ld = lok(d, p), yx = dot(hy, d.o.tf.oq[0]), yy = dot(hy, d.o.tf.oq[1]);
    let masofa;                                              // petlya boshidan eshik qirrasigacha (qirradan eshik ichiga)
    if (Math.abs(yx) > 0.999) masofa = yx > 0 ? ld[0] - d.bb.x0 : d.bb.x1 - ld[0];
    else if (Math.abs(yy) > 0.999) masofa = yy > 0 ? ld[1] - d.bb.y0 : d.bb.y1 - ld[1];
    else continue;
    const z0 = ld[2] < d.t / 2, nol = [0, 0, 0];
    const kosa = nuqta(o, kat(hy, P.Y - masofa), nol, nol);
    const lk = lok(d, kosa);
    qosh(d, { X: lk[0], Y: lk[1], z0, edge: null, d: P.D, dp: P.H, kind: 'd6_kosa' });
    for (const sg of [-1, 1]) {
      const lv = lok(d, nuqta(o, kat(hy, P.Y - masofa + P.Y1), kat(hz, sg * P.A1 / 2), nol));
      qosh(d, { X: lv[0], Y: lv[1], z0, edge: null, d: P.D1, dp: P.H1, kind: 'd6_vint' });
    }
    /* planka: petlya boshi yotgan yon devor (yuzasi petlya X o'qiga parallel) */
    const Ss = panels.filter(pn => { if (pn === d) return false; const l = lok(pn, p); return Math.abs(dot(hx, pn.o.tf.oq[2])) < 1e-3 && (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    if (Ss.length !== 1) continue;
    const sp = Ss[0], lsp = lok(sp, p);
    for (const sg of [-1, 1]) {
      const lm = lok(sp, nuqta(o, kat(hx, P.X2), kat(hz, sg * P.A2 / 2), nol));
      qosh(sp, { X: lm[0], Y: lm[1], z0: lsp[2] < sp.t / 2, edge: null, d: P.D2, dp: P.H2, kind: 'd6_planka' });
    }
  }

  /* ── 3) Samorez / metka ("samorez 16 mm", "metka samarezga"): yotgan yuzada Ø3 × 3 belgi (burama nuqtasi) ── */
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !SAMOREZ_RE.test(o.name || '')) continue;
    const p = o.tf.pos;
    const sp = yuzadagiPanel(panels, o);
    if (!sp) continue;
    const l = lok(sp, p);
    qosh(sp, { X: l[0], Y: l[1], z0: l[2] < sp.t / 2, edge: null, d: 3, dp: 3, kind: 'd6_belgi' });
  }

  /* ── 4) Polka ushlagich ("Полкодержатель D5", "polkoderjatel nikel"): yon devor yuzasida Ø5 × 9 ko'r teshik, ushlagich obyekti turgan joyda ── */
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !POLKA_RE.test(o.name || '')) continue;
    const p = o.tf.pos;
    const sp = yuzadagiPanel(panels, o);
    if (!sp) continue;
    const hy = o.tf.oq[1], l = lok(sp, [p[0] + hy[0] * POLKA.past, p[1] + hy[1] * POLKA.past, p[2] + hy[2] * POLKA.past]);   // markaz polka ostidan 2,5 mm (ushlagich Y o'qi bo'ylab)
    qosh(sp, { X: l[0], Y: l[1], z0: l[2] < sp.t / 2, edge: null, d: POLKA.d, dp: POLKA.dp, kind: 'd6_polka' });
  }

  /* ── 5) Ruchka ("Ручка 160 мм"): eshik/fasadda 2 ta o'tuvchi Ø5, ruchka markazidan ±oraliq/2 (ruchka X o'qi bo'ylab); oraliq — nomdagi son ── */
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !RUCHKA_RE.test(o.name || '') || PROFIL_RE.test(o.name || '')) continue;
    const m = /(\d{2,3})\s*(?:мм|mm)/i.exec(o.name) || /[_\s](\d{2,3})(?!\d)/.exec(o.name);
    const oraliq = m ? +m[1] : 0;
    if (!(oraliq >= 32 && oraliq <= 600)) continue;
    const sp = yuzadagiPanel(panels, o, 2);
    if (!sp) continue;
    const hx = o.tf.oq[0], p = o.tf.pos;
    for (const sg of [-1, 1]) {
      const l = lok(sp, [p[0] + hx[0] * sg * oraliq / 2, p[1] + hx[1] * sg * oraliq / 2, p[2] + hx[2] * sg * oraliq / 2]);
      qosh(sp, { X: l[0], Y: l[1], z0: true, edge: null, d: RUCHKA.d, dp: sp.t, kind: 'd6_ruchka' });
    }
  }

  /* ── 6) Ekssentrik ("Эксцентрик 0.0", "Стяжка Minifix"): obyekt A detal uchida (yuzada, o'qi A uzunligi bo'ylab ichkariga); A yuzasida Ø D2 × H2 (uchidan x2),
   *    A uchida (qirrada) Ø D × H (qalinlik o'rtasida), juft B detal yuzasida Ø D1 × H1 (A qalinligining o'rtasida). B — A uchi taqalgan panel. ── */
  const eksP = new Map();
  for (const o of objects) { const p = o.modelCode === 3001 ? param(o) : null; if (p && p.D2 && p.D && !eksP.has(o.name)) eksP.set(o.name, p); }
  const eksBirikma = (o, P) => {
    const p = o.tf.pos, u = o.tf.oq[0];
    const As = panels.filter(pn => { const l = lok(pn, p); return Math.abs(dot(u, pn.o.tf.oq[2])) < 1e-3 && (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    if (As.length !== 1) return;
    const a = As[0], la = lok(a, p), z0 = la[2] < a.t / 2;
    const ex = dot(u, a.o.tf.oq[0]), ey = dot(u, a.o.tf.oq[1]);
    const lc = lok(a, [p[0] + u[0] * P.x2, p[1] + u[1] * P.x2, p[2] + u[2] * P.x2]);
    let edge, X, Y;
    if (Math.abs(ex) > 0.999) { edge = ex > 0 ? 'L' : 'R'; X = ex > 0 ? a.bb.x0 : a.bb.x1; Y = la[1]; }
    else if (Math.abs(ey) > 0.999) { edge = ey > 0 ? 'B' : 'F'; Y = ey > 0 ? a.bb.y0 : a.bb.y1; X = la[0]; }
    else return;
    qosh(a, { X: lc[0], Y: lc[1], z0, edge: null, d: P.D2, dp: P.H2, kind: 'd6_eksentrik' });
    qosh(a, { X, Y, z0: true, edge, d: P.D, dp: P.H, kind: 'd6_eks_qirra' });
    const mid = [0, 1, 2].map(i => a.o.tf.pos[i] + la[0] * a.o.tf.oq[0][i] + la[1] * a.o.tf.oq[1][i] + (a.t / 2) * a.o.tf.oq[2][i]);
    const Bs = panels.filter(pn => { if (pn === a) return false; const l = lok(pn, mid); return Math.abs(Math.abs(dot(u, pn.o.tf.oq[2])) - 1) < 1e-3 && (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    if (Bs.length === 1) { const lb = lok(Bs[0], mid); qosh(Bs[0], { X: lb[0], Y: lb[1], z0: lb[2] < Bs[0].t / 2, edge: null, d: P.D1, dp: P.H1, kind: 'd6_eks_bolt' }); }
  };
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !o.tf.oq || /шкант|shkant/i.test(o.name || '')) continue;
    if (MINIFIX_RE.test(o.name || '')) { eksBirikma(o, MINIFIX); continue; }
    if (!EKS_RE.test(o.name || '')) continue;
    const g = param(o);
    eksBirikma(o, { ...EKS_SUKUT, ...((g && g.D2 && g.D ? g : null) || eksP.get(o.name) || {}) });
  }

  /* ── 6b) Shkant ("Шкант 8х30", ekssentrik bilan birga): obyekt F panel yuzasida (o'qi yuzaga tik) — F yuzasida Ø8 × 11 ko'r teshik; o'q bo'ylab F dan o'tib,
   *    qo'shni A panel uchiga kiradi — A uchida Ø8 × 22. ── */
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !o.tf.oq || !SHKANT_RE.test(o.name || '')) continue;
    const p = o.tf.pos, u = o.tf.oq[0];
    const Fs = panels.filter(pn => { const l = lok(pn, p); return Math.abs(Math.abs(dot(u, pn.o.tf.oq[2])) - 1) < 1e-3 && (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    if (Fs.length !== 1) continue;
    const f = Fs[0], lf = lok(f, p), n = dot(u, f.o.tf.oq[2]);
    if ((n > 0) !== (lf[2] < f.t / 2)) continue;                     // o'q F ichiga qaragan bo'lishi kerak
    const q = [p[0] + u[0] * (f.t + 1), p[1] + u[1] * (f.t + 1), p[2] + u[2] * (f.t + 1)];
    const As = panels.filter(pn => { if (pn === f) return false; const l = lok(pn, q); return Math.abs(dot(u, pn.o.tf.oq[2])) < 1e-3 && l[2] > -0.01 && l[2] < pn.t + 0.01 && bbIchida(pn, l[0], l[1], 0.01); });
    if (As.length !== 1) continue;
    const a = As[0], la = lok(a, p), ex = dot(u, a.o.tf.oq[0]), ey = dot(u, a.o.tf.oq[1]);
    let edge, X, Y;
    if (Math.abs(ex) > 0.999) { edge = ex > 0 ? 'L' : 'R'; X = ex > 0 ? a.bb.x0 : a.bb.x1; Y = la[1]; }
    else if (Math.abs(ey) > 0.999) { edge = ey > 0 ? 'B' : 'F'; Y = ey > 0 ? a.bb.y0 : a.bb.y1; X = la[0]; }
    else continue;
    const g = param(o), S = g && g.d && g.h1 && g.h2 ? { d: g.d, yuza: g.h1, qirra: g.h2 } : /404\s*$/.test(o.name) ? SHKANT_404 : SHKANT;
    qosh(f, { X: lf[0], Y: lf[1], z0: lf[2] < f.t / 2, edge: null, d: S.d, dp: S.yuza, kind: 'd6_shkant' });
    qosh(a, { X, Y, z0: true, edge, d: S.d, dp: S.qirra, kind: 'd6_shkant_qirra' });
  }

  /* ── 7) Nomi o'lcham bo'lgan teshik obyektlari ("8х13.0", "15х13", "4.5х34", "7"): chuqurlik qalinlikdan katta — qirra teshigi (qirrada, qalinlik o'rtasida),
   *    aks holda — yuzadagi ko'r teshik; nomi faqat son — o'tuvchi. Obyekt joyi — teshik markazi. ── */
  for (const o of objects) {
    if (o.modelCode !== 3001 || !o.tf || !o.tf.oq) continue;
    const m = NOM_TESHIK_RE.exec(String(o.name || '').trim());
    if (!m) continue;
    const d = +m[1].replace(',', '.'), dp = m[2] ? +m[2].replace(',', '.') : 0;
    if (!(d >= 2 && d <= 40)) continue;
    const p = o.tf.pos;
    const yuza = panels.filter(pn => { const l = lok(pn, p); return (Math.abs(l[2]) < TOL || Math.abs(l[2] - pn.t) < TOL) && bbIchida(pn, l[0], l[1], TOL); });
    const qirra = panels.filter(pn => { const l = lok(pn, p); return Math.abs(l[2] - pn.t / 2) < 1 && bbIchida(pn, l[0], l[1], TOL) && (Math.abs(l[0] - pn.bb.x0) < TOL || Math.abs(l[0] - pn.bb.x1) < TOL || Math.abs(l[1] - pn.bb.y0) < TOL || Math.abs(l[1] - pn.bb.y1) < TOL); });
    const chuqur = yuza.length === 1 ? yuza[0] : null;
    if (!dp || (chuqur && dp < chuqur.t - 0.5)) {                       // yuzadagi teshik (o'tuvchi yoki ko'r)
      if (!chuqur) continue;
      const l = lok(chuqur, p);
      qosh(chuqur, { X: l[0], Y: l[1], z0: l[2] < chuqur.t / 2, edge: null, d, dp: dp || chuqur.t, kind: dp ? 'd6_nomli' : 'd6_nomli_otuvchi' });
    } else if (qirra.length === 1) {                                     // qirra teshigi
      const q = qirra[0], l = lok(q, p);
      const eps = [['L', Math.abs(l[0] - q.bb.x0)], ['R', Math.abs(l[0] - q.bb.x1)], ['B', Math.abs(l[1] - q.bb.y0)], ['F', Math.abs(l[1] - q.bb.y1)]].sort((a, b) => a[1] - b[1])[0];
      if (eps[1] > TOL) continue;
      qosh(q, { X: l[0], Y: l[1], z0: true, edge: eps[0], d, dp, kind: 'd6_nomli_qirra' });
    }
  }
  return out;
}

/* ── fragmentda saqlash: loyiha hujjati serverda tekshiriladi (himoya.js: tugunlar ≤ 60000, satr ≤ 2000) — shuning uchun teshiklar ixcham
 *    matn qatorlarida (har detal nusxasiga bir-ikki qator, tugun soni teshik soniga bog'liq emas). Qator: "kod#n|teshik;teshik;…",
 *    teshik: "F1,x,y,d,dp,kind" (yuza: 1 | 2) yoki "TL,x,y,d,dp,kind" (qirra: F | B | L | R); x — F qirradan, y — L uchidan (detal freymi). ── */
const r1 = (v) => Math.round(v * 10) / 10;
const QATOR_MAX = 1800;

/** panel nusxasi (en: { bb, t }) teshiklari → qatorlar */
export function joyQatorlar(ref, en, hs) {
  const out = [];
  let cur = '';
  for (const h of hs) {
    const x = r1(en.bb.y1 - h.Y), y = r1(h.X - en.bb.x0);
    const s = (h.edge ? 'T' + h.edge : 'F' + (h.z0 ? 1 : 2)) + ',' + [x, y, h.d, h.dp].join(',') + ',' + h.kind;
    if (cur && cur.length + s.length + 1 > QATOR_MAX) { out.push(ref + '|' + cur); cur = ''; }
    cur += (cur ? ';' : '') + s;
  }
  if (cur) out.push(ref + '|' + cur);
  return out;
}

/** qator → [{ ref, side: 'F'|'T', yuza | torets, x, y, dia, depth, kind }] (cutlist.js 3d' uchun); yaroqsiz qator o'tkazib yuboriladi */
export function joyOqi(qator) {
  const i = String(qator).indexOf('|');
  if (i < 1) return [];
  const ref = qator.slice(0, i), out = [];
  for (const s of qator.slice(i + 1).split(';')) {
    const m = /^([FT])([FBLR12]),(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+),(\w+)$/.exec(s);
    if (!m) continue;
    const h = { ref, side: m[1], x: +m[3], y: +m[4], dia: +m[5], depth: +m[6], kind: m[7] };
    if (m[1] === 'T') h.torets = m[2]; else h.yuza = +m[2] === 2 ? 2 : 1;
    out.push(h);
  }
  return out;
}
