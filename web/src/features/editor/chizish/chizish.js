import { useMemo, useEffect } from 'react';
import { get, set, useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, confirm, xato } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import * as C from '../../../../../app/js/engine/chizish.js';
import { raqam } from '../../../shared/lib/format.js';
import { t, serverXato } from '../../../i18n/index.js';

/* TZ-24 A: o'z modulini chizish — muharrir paneli (o'ngda; o'rtadagi 3D shu zahoti yangilanadi).
 * Chizma loyihada: doc.chizmalar[kod] = { nom, ch (yassi) }; katalogda — chizmaKatalog (detallar o'lchamga qarab hisoblanadi).
 * "Mening modullarim" — server shablonlari (tur: modul). */
const CHEGARA = { w: [200, 3000], d: [200, 900], h: [200, 2800] };
const yangiKod = () => 'CH-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();

/** chizmani loyihaga, katalogga va joylashuvga yozish (3D va narx yangilanadi) */
function saqla(ch, nom) {
  const s = get().chizish, doc = project.doc, H = project.H;
  if (!s.kod || !H) return;
  const n = nom != null ? nom : s.nom;
  doc.chizmalar = doc.chizmalar || {};
  doc.chizmalar[s.kod] = { nom: n, ch: C.yassi(ch) };
  const fr = C.chizmaKatalog(ch, s.kod, n);
  H.catalog[s.kod] = fr;
  const p = s.pl && project.pl(s.pl);
  if (p) {
    p.w = ch.w; p.d = ch.d; p.h = ch.h; p.name = n;
    if (ch.tur === 'ustki') { if (!(+p.z > 0)) p.z = fr.default_z; } else p.z = fr.default_z || 0;
  }
  set('chizish', st => ({ ch, nom: n, v: st.v + 1 }));
  project.changed('items');
}

function ochish(kod, pl, ch, nom) {
  set('chizish', { ochiq: true, kod, pl, ch, nom, yol: [] });
  set('editor', { sel: pl, part: null });
}

/** yangi modul: tur bo'yicha boshlang'ich chizma → katalog → xonaga */
export function yangiModul(tur, ch0, nom0) {
  const H = project.H, doc = project.doc;
  if (!H) return;
  const ch = ch0 ? JSON.parse(JSON.stringify(ch0)) : C.yangiChizma(tur);
  const kod = yangiKod(), nom = nom0 || t('chizish.nom_' + ch.tur);
  doc.chizmalar = doc.chizmalar || {};
  doc.chizmalar[kod] = { nom, ch: C.yassi(ch) };
  const fr = C.chizmaKatalog(ch, kod, nom);
  H.catalog[kod] = fr;
  const p = L.addPlacement(doc, fr);
  ochish(kod, p.id, ch, nom);
  project.changed('items');
  toast(t('chizish.yaratildi', { nom }));
}

/** joylashuvdagi qo'lda chizilgan modulni tahrirlash */
export function tahrirla(pid) {
  const p = project.pl(pid), x = p && project.doc.chizmalar && project.doc.chizmalar[p.frg];
  if (!x) return;
  const ch = C.tikla(JSON.parse(JSON.stringify(x.ch)));
  ch.w = p.w; ch.d = p.d; ch.h = p.h;                        // joylashuvda cho'zilgan bo'lsa
  ochish(p.frg, pid, ch, x.nom);
}
export const chizishOch = () => set('chizish', { ochiq: true, kod: null, pl: null, ch: null, yol: [] });
export const chizishYop = () => set('chizish', { ochiq: false });

const oz = (fn) => { const s = get().chizish; if (!s.ch) return; const c = JSON.parse(JSON.stringify(s.ch)); fn(c); saqla(c); };
const bolimOz = (fn) => { const s = get().chizish; if (!s.ch) return; saqla(C.bolimOzgar(s.ch, s.yol, fn)); };

/* ── mening modullarim (server: /api/shablonlar, tur — modul) ── */
async function sorov(yol, o) {
  try {
    const r = await S.api(yol, o);
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code) || t('umumiy.xato_n', { n: r.status }), (j && j.code) || 'S3D-SHB-101'); return null; }
    return j;
  } catch (e) { xato('S3D-NET-101', { modul: 'chizish', err: e }); return null; }
}
export async function loadModullarim() {
  if (!S.loggedIn) { set('chizish', { modullarim: [] }); return; }
  const j = await sorov('/api/shablonlar');
  if (j) set('chizish', { modullarim: j.filter(x => x.tur === 'modul') });
}
export async function modullarimgaSaqla() {
  const s = get().chizish;
  if (!s.ch) return;
  if (await sorov('/api/shablonlar', { method: 'POST', body: { tur: 'modul', nom: (s.nom || t('chizish.nom_' + s.ch.tur)).replace(/[<>]/g, '').slice(0, 80), data: { ch: C.yassi(s.ch) } } })) {
    toast(t('chizish.saqlandi', { nom: s.nom }));
    loadModullarim();
  }
}

/** panel ko'rinishi */
export function useChizish() {
  const s = useSlice('chizish'), auth = useSlice('auth');
  useSlice('project');
  useEffect(() => { if (s.ochiq && !s.ch && auth.user && s.modullarim == null) loadModullarim(); }, [s.ochiq, s.ch, auth.user && auth.user.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const ch = s.ch;
  const K = useMemo(() => (ch ? C.chizmaKorinish(ch) : null), [ch]);
  /* narx: shu modul alohida (hisob dvigateli — raskroy bilan) */
  const narx = useMemo(() => {
    const H = project.H;
    if (!ch || !H || !s.kod || !H.catalog[s.kod]) return null;
    try {
      const doc = { v: 1, room: { outline: [[0, 0], [5000, 0], [5000, 5000], [0, 5000]], wall_height: 3000, wall_thickness: 100, openings: [] },
        placements: [{ id: 'p1', frg: s.kod, x: 0, y: 0, z: 0, w: ch.w, d: ch.d, h: ch.h, rot: 0, qty: 1 }] };
      const pj = get().project;
      const r = H.recalc(doc, { materialCode: pj.matCode, fasadCode: pj.fasadCode, polkaCode: pj.polkaCode, orqaCode: pj.orqaCode });
      return { jami: r.priceRes.total, detal: r.cutlists[0] ? r.cutlists[0].parts.length : 0, narxsiz: r.prod.lines.filter(l => l.group === 'Furnitura' && l.no_price).length };
    } catch (e) { return null; }
  }, [ch, s.kod, s.v]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.ochiq) return { ochiq: false };
  if (!ch) {
    return {
      ochiq: true, tanlov: true,
      turlar: C.CHIZMA_TURLARI.map(tur => ({ tur, label: t('chizish.tur_' + tur), izoh: t('chizish.turiz_' + tur), pick: () => yangiModul(tur) })),
      modullarim: (s.modullarim || []).map(m => ({ nom: m.nom, pick: () => yangiModul(null, C.tikla(m.data.ch), m.nom) })),
      kirgan: !!auth.user, yop: chizishYop
    };
  }
  const tanlangan = C.bolim(ch, s.yol) || ch.ichki;
  const bolR = K.bolimlar.find(b => b.yol.join() === s.yol.join()) || K.bolimlar[0];
  const past = ch.tur === 'pastki' || ch.tur === 'tumba', baland = ch.tur === 'shkaf' || ch.tur === 'erkin';
  const sanoq = (key, max) => ({
    n: tanlangan[key] | 0,
    kam: () => bolimOz(n => { n[key] = Math.max(0, (n[key] | 0) - 1); }),
    kop: () => bolimOz(n => { n[key] = Math.min(max, (n[key] | 0) + 1); if (key === 'tortma') n.polka = 0; if (key === 'polka') n.tortma = 0; })
  });
  return {
    ochiq: true, tanlov: false, v: s.v,
    nom: s.nom, onNom: ev => saqla(ch, ev.target.value.replace(/[<>]/g, '').slice(0, 80)),
    turlar: C.CHIZMA_TURLARI.map(tur => ({ label: t('chizish.tur_' + tur), on: ch.tur === tur,
      pick: () => { if (ch.tur === tur) return; confirm({ title: t('chizish.tur_almash'), text: t('chizish.tur_almash_matn'), ok: t('chizish.almashtirish'),
        yes: () => { const c = C.yangiChizma(tur); set('chizish', { yol: [] }); saqla(c); } }); } })),
    /* o'lcham: yozilayotganda — xom matn, Enter yoki chiqqanda — chegarada qo'llanadi */
    olchamlar: ['w', 'd', 'h'].map(k => ({ k, label: t('chizish.o_' + k) + ' (' + CHEGARA[k][0] + '–' + CHEGARA[k][1] + ')', val: (s.raw || {})[k] ?? ch[k],
      on: ev => set('chizish', st => ({ raw: { ...(st.raw || {}), [k]: ev.target.value } })),
      commit: () => { const r = (get().chizish.raw || {})[k]; set('chizish', st => { const x = { ...(st.raw || {}) }; delete x[k]; return { raw: x }; });
        if (r == null || r === '') return; const v = Math.min(CHEGARA[k][1], Math.max(CHEGARA[k][0], Math.round(+r) || ch[k])); if (v !== ch[k]) oz(c => { c[k] = v; }); } })),
    taglar: ch.tur === 'ustki' ? [] : (past ? ['oyoq', 'sokol'] : ['sokol', 'yoq']).map(k => ({ label: t('chizish.tag_' + k), on: (ch.tag || {}).tur === k,
      pick: () => oz(c => { c.tag = { tur: k, h: k === 'yoq' ? 0 : (past ? 100 : 84) }; }) })),
    qopqoqlar: past ? ['planka', 'yaxlit'].map(k => ({ label: t('chizish.qop_' + k), on: (ch.qopqoq || 'planka') === k, pick: () => oz(c => { c.qopqoq = k; }) })) : [],
    orqa: { on: ch.orqa !== 'yoq', flip: () => oz(c => { c.orqa = c.orqa === 'yoq' ? 'hdf' : 'yoq'; }) },
    fasad: { on: s.fasad, flip: () => set('chizish', { fasad: !s.fasad }) },
    /* chizma (old ko'rinish, mm) */
    svg: {
      w: ch.w, h: ch.h, tag: past ? +((ch.tag || {}).h) || 0 : 0,
      qutilar: K.qutilar.filter(q => q.slot !== 'orqa' && !q.drawerOf),
      bolimlar: K.bolimlar.map(b => ({ ...b, on: b.yol.join() === s.yol.join(), pick: () => set('chizish', { yol: b.yol }) })),
      bolgichlar: K.bolgichlar.map(b => ({ ...b, sur: (mm) => { const c = C.bolgichSur(get().chizish.ch, b.yol, b.i, mm); saqla(c); } })),
      fasadKor: s.fasad
    },
    /* tanlangan bo'lim */
    bolim: {
      olcham: bolR ? Math.round(bolR.x1 - bolR.x0) + ' × ' + Math.round(bolR.z1 - bolR.z0) + ' ' + t('umumiy.mm') : '',
      ildiz: !s.yol.length, yuqori: s.yol.length ? () => set('chizish', { yol: s.yol.slice(0, -1) }) : null,
      bolingan: !!tanlangan.yo,
      bol: [['v', 2], ['v', 3], ['h', 2], ['h', 3]].map(([yo, k]) => ({ label: t('chizish.bol_' + yo, { k }), yo, k, pick: () => saqla(C.bol(ch, s.yol, yo, k)) })),
      birlashtir: tanlangan.yo ? () => saqla(C.birlashtir(ch, s.yol)) : null,
      bolaklar: tanlangan.yo ? tanlangan.bo.map((b, i) => {
        const rk = 'b' + i;
        return { label: t('chizish.bolak', { i: i + 1 }), val: (s.raw || {})[rk] ?? (b.o > 0 ? b.o : ''),
          on: ev => set('chizish', st => ({ raw: { ...(st.raw || {}), [rk]: ev.target.value } })),
          commit: () => { const r = (get().chizish.raw || {})[rk]; set('chizish', st => { const x = { ...(st.raw || {}) }; delete x[rk]; return { raw: x }; });
            if (r == null) return; const v = Math.round(+r); bolimOz(n => { n.bo[i].o = v >= C.QOIDA.bolimMin ? v : null; }); },
          tanla: () => set('chizish', { yol: s.yol.concat(i) }) };
      }) : [],
      polka: !tanlangan.yo ? sanoq('polka', 20) : null,
      tortma: !tanlangan.yo ? sanoq('tortma', 8) : null,
      shtanga: !tanlangan.yo ? { on: !!tanlangan.shtanga, flip: () => bolimOz(n => { n.shtanga = !n.shtanga; }) } : null,
      eshiklar: [0, 1, 2].map(k => ({ label: t('chizish.eshik_' + k), on: (tanlangan.eshik | 0) === k, pick: () => bolimOz(n => { n.eshik = k; }) })),
      petlyalar: (tanlangan.eshik | 0) === 1 ? ['chap', 'ong'].map(k => ({ label: t('chizish.petlya_' + k), on: (tanlangan.petlya || 'chap') === k, pick: () => bolimOz(n => { n.petlya = k; }) })) : []
    },
    ogoh: K.ogoh.map(o => t('chizish.og_' + o.kod, { n: o.n, m: o.m })),
    narx: narx ? { jami: raqam(narx.jami) + ' ' + t('umumiy.som'), detal: t('chizish.detal_n', { n: narx.detal }), narxsiz: narx.narxsiz ? t('chizish.narxsiz', { n: narx.narxsiz }) : '' } : null,
    baland,
    saqlaModul: auth.user ? modullarimgaSaqla : null,
    yop: chizishYop
  };
}
