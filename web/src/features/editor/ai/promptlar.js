import { useEffect } from 'react';
import { get, set, useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, confirm, xato } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { promptLoyiha, qiymatlar, KATEGORIYALAR } from '../../../../../app/js/engine/promptlar.js';
import { konstruksiya } from '../../../../../app/js/engine/konstruktor/index.js';
import KUTUBXONA from '../../../../../app/data/promptlar.json';
import { t, til, serverXato } from '../../../i18n/index.js';
import { runAI } from './actions.js';

/* TZ-24 B: tayyor so'rovlar (kutubxona, AI'siz — engine/promptlar.js) va shaxsiy shablonlar (server: /api/shablonlar).
 * Shablon: "prompt" — tayyor so'rov va uning raqamlari yoki o'z matningiz; "loyiha" — joriy xona va modullar. */
const P = KUTUBXONA.promptlar;
const yozuv = (o) => (o && (o[til()] || o.uz)) || '';

/** joriy loyiha bo'sh bo'lmasa — avval tasdiq (AI'dagi "Qurish" kabi) */
function almashtir(fn) {
  const n = project.doc.placements.length;
  if (n) confirm({ title: t('ai.almashtirish_sarlavha'), text: t('ai.almashtirish_matn', { n }), ok: t('ai.almashtirish'), yes: fn });
  else fn();
}

function yangiLoyiha(doc, nom) {
  project.reset(doc);
  set('project', { name: nom });
  set('ai', { open: false, mic: false });
  set('editor', { sel: null, part: null, warn: {} });
  project.changed('room', true);
}

/** tayyor so'rov → yangi loyiha */
export function promptQur(p, kirish) {
  const H = project.H;
  if (!H || !p) return;
  almashtir(() => {
    let r;
    try { r = promptLoyiha(p, kirish, H.catalog, { konstruksiya }); } catch (e) { xato('S3D-KONS-104', { modul: 'ai/promptlar', err: e }); return; }
    if (r.xato) { xato(r.xato, { modul: 'ai/promptlar' }); return; }
    const room = L.freshRoom();
    room.outline = r.xona.outline; room.wall_height = r.xona.H;
    const doc = L.newDoc(room);
    doc.placements = r.placements.filter(x => H.catalog[x.frg]);
    if (r.kitchen) doc.kitchen = Object.assign(L.freshKitchen(), r.kitchen);
    yangiLoyiha(doc, yozuv(p.nom));
    toast(t('tayyor.qurildi', { nom: yozuv(p.nom), n: doc.placements.length, w: r.xona.W, d: r.xona.D })
      + (r.sigmadi.length ? ' · ' + t('tayyor.sigmadi', { n: r.sigmadi.length }) : ''));
  });
}

/* ── shaxsiy shablonlar ── */
async function sorov(yol, o) {
  try {
    const r = await S.api(yol, o);
    const j = await r.json().catch(() => null);
    if (!r.ok) { toast(serverXato(j && j.error, j && j.code) || t('umumiy.xato_n', { n: r.status }), (j && j.code) || 'S3D-SHB-101'); return null; }
    return j;
  } catch (e) { xato('S3D-NET-101', { modul: 'ai/shablon', err: e }); return null; }
}
export async function loadShablonlar() {
  if (!S.loggedIn) { set('ai', { shablonlar: [] }); return; }
  const j = await sorov('/api/shablonlar');
  if (j) set('ai', { shablonlar: j });
}
async function saqla(tur, data) {
  const nom = (get().ai.shNom || '').trim().replace(/[<>]/g, '');
  if (!nom) { toast(t('tayyor.nom_yozing')); return; }
  if (await sorov('/api/shablonlar', { method: 'POST', body: { tur, nom: nom.slice(0, 80), data } })) {
    set('ai', { shNom: '' });
    toast(t('tayyor.saqlandi', { nom }));
    loadShablonlar();
  }
}
/** joriy tanlov: tayyor so'rov (raqamlari bilan) yoki AI matni */
export function promptSaqla() {
  const ai = get().ai, p = P.find(x => x.id === ai.tanlangan);
  if (p) return saqla('prompt', { promptId: p.id, qiymatlar: qiymatlar(p, ai.qiymat || {}) });
  if (ai.text.trim()) return saqla('prompt', { matn: ai.text.trim().slice(0, 2000) });
  toast(t('tayyor.saqlash_yoq'));
  return null;
}
/** joriy loyiha (xona, modullar, oshxona, materiallar) */
export function loyihaSaqla() {
  const pl = project.payload();
  if (!pl.doc.placements.length) { toast(t('tayyor.loyiha_bosh')); return null; }
  return saqla('loyiha', { doc: { room: pl.doc.room, placements: pl.doc.placements, kitchen: pl.doc.kitchen, ...(pl.doc.erpMat ? { erpMat: pl.doc.erpMat } : {}) },
    material: pl.material, fasad: pl.fasad, ...(pl.polka ? { polka: pl.polka } : {}) });
}
export function shablonOch(sh) {
  const d = sh && sh.data;
  if (!d) return;
  if (sh.tur === 'loyiha') {
    almashtir(() => {
      const doc = JSON.parse(JSON.stringify(d.doc));
      if (!doc.kitchen) doc.kitchen = L.freshKitchen();
      yangiLoyiha(doc, sh.nom);
      set('project', { ...(d.material ? { matCode: d.material } : {}), ...(d.fasad ? { fasadCode: d.fasad } : {}), ...(d.polka ? { polkaCode: d.polka } : {}) });
      project.changed('items', true);
      toast(t('tayyor.ochildi', { nom: sh.nom }));
    });
    return;
  }
  const p = d.promptId && P.find(x => x.id === d.promptId);
  if (p) { promptQur(p, d.qiymatlar || {}); return; }
  if (d.matn) { set('ai', { text: d.matn, tab: 'matn' }); almashtir(() => runAI()); }
}
export function shablonOchir(sh) {
  confirm({ title: t('tayyor.ochirish_sarlavha'), text: t('tayyor.ochirish_matn', { nom: sh.nom }), ok: t('sahna.ochirish'), danger: true,
    yes: async () => { if (await sorov('/api/shablonlar/' + sh.id, { method: 'DELETE' })) { toast(t('tayyor.ochirildi')); loadShablonlar(); } } });
}

export function useTayyor() {
  const ai = useSlice('ai'), auth = useSlice('auth');
  useSlice('data');
  const tab = ai.tab || 'matn';
  useEffect(() => { if (tab === 'shablon') loadShablonlar(); }, [tab, auth.user && auth.user.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const kat = ai.kat || 'oshxona';
  const p = P.find(x => x.id === ai.tanlangan) || null;
  const q = p ? qiymatlar(p, ai.qiymat || {}) : {};
  return {
    tab,
    tablar: [['matn', t('tayyor.tab_matn')], ['tayyor', t('tayyor.tab_tayyor')]].concat(auth.user ? [['shablon', t('tayyor.tab_shablon')]] : [])
      .map(([k, label]) => ({ label, on: tab === k, pick: () => set('ai', { tab: k }) })),
    kategoriyalar: KATEGORIYALAR.map(k => ({ label: t('tayyor.kat_' + k), on: kat === k, pick: () => set('ai', { kat: k, tanlangan: null, qiymat: {} }) })),
    promptlar: P.filter(x => x.kat === kat).map(x => ({ id: x.id, nom: yozuv(x.nom), izoh: yozuv(x.izoh), on: x.id === ai.tanlangan,
      pick: () => set('ai', { tanlangan: x.id === ai.tanlangan ? null : x.id, qiymat: {} }) })),
    forma: p ? {
      maydonlar: p.maydon.map(m => ({ k: m.k, label: t('tayyor.m_' + m.k) + ' (' + m.min + '–' + m.max + ' ' + t('umumiy.mm') + ')',
        val: (ai.qiymat || {})[m.k] ?? q[m.k], on: ev => set('ai', s => ({ qiymat: { ...(s.qiymat || {}), [m.k]: ev.target.value } })) })),
      qur: () => promptQur(p, ai.qiymat || {})
    } : null,
    /* shablonlar */
    shNom: ai.shNom || '', onShNom: ev => set('ai', { shNom: ev.target.value }),
    promptSaqla, loyihaSaqla,
    shablonlar: (ai.shablonlar || []).map(sh => ({ nom: sh.nom, tur: t('tayyor.tur_' + sh.tur), och: () => shablonOch(sh), ochir: () => shablonOchir(sh) })),
    shYuklandi: ai.shablonlar != null
  };
}
