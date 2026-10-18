import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, confirm, xato, openSheet } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { aiBuild, startVoice, voiceSupported } from '../../../../../app/js/ai.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { konstruksiya } from '../../../../../app/js/engine/konstruktor/index.js';
import { konstruksiyami } from '../../../../../app/js/engine/konstruksiyaTili.js';
import { aiKonstruksiya } from './konstruksiya.js';
import { oshxonaQatorlar, kartaQatorlar, shablonQatorlar, nomalumQatorlar, garniturQatorlar } from './oshxona.js';
import { garnituraReja } from '../../../../../app/js/engine/garnitur.js';
import { erpQosh } from '../../../services/erpMaterial.js';
import { aiTur, shablonReja, XONA_SHABLON } from '../../../../../app/js/engine/aiTur.js';
import { promptLoyiha } from '../../../../../app/js/engine/promptlar.js';
import KUTUBXONA from '../../../../../app/data/promptlar.json';
import { t, til } from '../../../i18n/index.js';

/* TZ-19 (TZ-12): AI — server til modeli (kirgan va serverda yoqilgan bo'lsa) yoki qoidali tahlilchi (ai.js), ovoz — brauzer. */
export const AI_EX = ['ai.misol1', 'ai.misol2', 'ai.misol3', 'ai.misol4'];   // AI ham uch tilni tushunadi (TZ-18 8-bosqich); misol4 — TZ-26 (bitta modul)
const VOICE_ERR = { 'not-allowed': 'ai.mikrofon_ruxsat', 'service-not-allowed': 'ai.mikrofon_ruxsat', 'audio-capture': 'ai.mikrofon_yoq', network: 'ai.ovoz_internet' };

let aiOn = false;
let voice = null;

/** server AI yoqilganmi (sahifa ochilganda bir marta) */
export async function checkAiStatus() {
  try { aiOn = !!(await (await fetch('/api/ai/status', { cache: 'no-store' })).json()).enabled; } catch (_) { aiOn = false; }
}

async function aiParse(text) {
  if (!S.loggedIn || !aiOn) return null;
  try {
    const r = await S.api('/api/ai/parse', { method: 'POST', body: { text } });
    if (!r.ok) return null;
    return (await r.json()).parsed || null;
  } catch (_) { return null; }
}

/** egasi #183: tanilmagan so'rov — hech narsa qurilmaydi, karta: "Tushunmadim" + tayyor variantlar */
function tushunmadim(text) {
  set('ai', { open: false, mic: false });
  openSheet('aioshxona', { sarlavha: 'ai.tur_yoq_sarlavha', qatorlar: nomalumQatorlar(text, KUTUBXONA.promptlar) });
  toast(t('ai.tur_yoq_toast'));
}

/** egasi #183: xona turi (yotoqxona, mehmonxona, dahliz, garderob …) — tayyor shablon matndagi raqamlar bilan, faqat katalog modullari */
function shablondanQur(text, yo) {
  const H = project.H;
  const p = yo.shablon === 'xona' ? XONA_SHABLON : KUTUBXONA.promptlar.find(x => x.id === yo.shablon);
  if (!H || !p) { tushunmadim(text); return; }
  const rj = shablonReja(text, p, H.catalog);
  const r = promptLoyiha(rj.prompt, rj.kirish, H.catalog);
  if (r.xato) { xato(r.xato, { modul: 'editor/ai' }); return; }
  const room = L.freshRoom();
  room.outline = r.xona.outline; room.wall_height = r.xona.H;
  room.utilities = (project.doc.room && project.doc.room.utilities) || [];
  const doc = L.newDoc(room);
  doc.placements = r.placements.filter(x => H.catalog[x.frg]);
  doc.kitchen = L.freshKitchen();
  project.tarix.belgi('ai');                          // bekor qilish: AI qurish — bitta qadam
  project.reset(doc);
  set('ai', { open: false, mic: false });
  set('editor', { sel: null, part: null, warn: {} });
  project.changed('room', true);
  const nom = (p.nom && (p.nom[til()] || p.nom.uz)) || p.id;
  openSheet('aioshxona', { sarlavha: 'ai.sh_sarlavha', qatorlar: shablonQatorlar(nom, rj, r, H.catalog) });
  toast(t('ai.sh_qurdi', { nom, n: doc.placements.length, w: r.xona.W, d: r.xona.D }) + (r.sigmadi.length ? ' · ' + t('tayyor.sigmadi', { n: r.sigmadi.length }) : ''));
}

/** TZ-35: garnitur (spalniy garnitur: karavot + shkaf + trimo + oyna) — matn bo'laklarga ajratiladi, har buyum o'z o'lchami bilan katalogdan;
 *  rang butun garniturga (ERP dekori); har bo'lak va xususiyat kartada (bajarildi / qisman / bajarilmadi), tushunilmaganlar ro'yxatda */
function garniturdanQur(text) {
  const H = project.H;
  if (!H) { tushunmadim(text); return; }
  const g = garnituraReja(text, H.catalog, { sheets: (H.sheetCatalog && H.sheetCatalog.sheets) || [] });
  const qatorlar = garniturQatorlar(g);
  if (!g.placements.length) {                          // hech narsa qurilmadi — karta sababi bilan (joriy loyiha o'zgarmaydi)
    set('ai', { open: false, mic: false });
    openSheet('aioshxona', { sarlavha: 'ai.g_sarlavha', qatorlar });
    toast(t('ai.tur_yoq_toast'));
    return;
  }
  const room = L.freshRoom();
  room.outline = g.xona.outline; room.wall_height = g.xona.H;
  room.utilities = (project.doc.room && project.doc.room.utilities) || [];
  const doc = L.newDoc(room);
  doc.placements = g.placements.filter(x => H.catalog[x.frg]);
  doc.kitchen = L.freshKitchen();
  /* butun garnitur bitta dekorda: korpus, ichki qism (polka) va fasad — ERP plitasi (kashemir …) */
  if (g.rang && g.rang.korpus) {
    const kod = {}, olish = (sh) => (kod[sh.name] = kod[sh.name] || erpQosh(H, doc, sh));
    for (const p of doc.placements) if (p.dekor) p.slots = Object.assign({}, p.slots || {}, { korpus: olish(g.rang.korpus), polka: olish(g.rang.korpus), fasad: olish(g.rang.fasad || g.rang.korpus) });
  }
  project.tarix.belgi('ai');                          // bekor qilish: AI qurish — bitta qadam
  project.reset(doc);
  set('ai', { open: false, mic: false });
  set('editor', { sel: null, part: null, warn: {} });
  project.changed('room', true);
  openSheet('aioshxona', { sarlavha: 'ai.g_sarlavha', qatorlar });
  toast(t('ai.sh_qurdi', { nom: t('ai.g_sarlavha'), n: doc.placements.length, w: g.xona.W, d: g.xona.D }) + (g.bajarilmadi.length ? ' · ' + t('ai.g_h_bajarilmadi') + ': ' + g.bajarilmadi.length : ''));
}

/** matndan loyiha quriladi (joriy loyiha almashadi; teshiklar va oshxona sozlamasi saqlanadi) */
export async function runAI(silent) {
  const text = get().ai.text.trim();
  if (!text) { toast(t('ai.avval_matn')); return; }
  const H = project.H;
  /* egasi #183: xona turi — tayyor shablon; tanilmagan — qurilmaydi (avval har qanday matnga oshxona qurilardi) */
  const yo = aiTur(text);
  if (yo.tur === 'garnitur') { try { garniturdanQur(text); } catch (e) { if (!silent) xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e }); } return; }
  if (yo.tur === 'shablon') { try { shablondanQur(text, yo); } catch (e) { if (!silent) xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e }); } return; }
  if (yo.tur === 'nomalum') { tushunmadim(text); return; }
  try {
    const quvur = (project.doc.room && project.doc.room.utilities) || [];
    /* TZ-22: oshxona — avtomatik konstruktor (qoidalar, AI'siz); AI faqat matnni tushunadi */
    const konstruktor = (room, talab) => konstruksiya(Object.assign({}, room, { utilities: quvur }), talab, H.catalog).variantlar[0] || null;
    const res = await aiBuild(text, H.catalog, { llm: (t) => aiParse(t), konstruktor });
    res.doc.placements = res.doc.placements.filter(p => H.catalog[p.frg]);
    res.doc.room.utilities = quvur;
    res.doc.kitchen = res.kitchen ? Object.assign(L.freshKitchen(), res.kitchen) : (project.doc.kitchen || L.freshKitchen());
    project.tarix.belgi('ai');                          // bekor qilish: AI qurish — bitta qadam
    project.reset(res.doc);
    set('ai', { open: false, mic: false });
    set('editor', { sel: null, part: null, warn: {} });
    project.changed('room', true);
    const bb = roomBBox(res.doc.room.outline);
    /* egasi #166: oshxona matni — "nima tushunildi" kartasi (matndan / sukut) */
    if (res.oshxona) {
      openSheet('aioshxona', { qatorlar: kartaQatorlar(res, H.catalog, 'bosh').concat(oshxonaQatorlar(res.oshxona, { w: Math.round(bb.w), d: Math.round(bb.h) }), kartaQatorlar(res, H.catalog, 'talab')) });
      toast(res.oshxona.natija ? t('ai.osh_qurdi', { n: res.doc.placements.length, l: res.oshxona.spec.uzunlik || Math.round(bb.w) }) : t('ai.osh_qurilmadi'));
      return;
    }
    /* egasi #183: karta har qurishda (shakl, o'lchamlar qayerga ishlatildi, talablar, qavat modullari) */
    if (res.karta) {
      openSheet('aioshxona', { qatorlar: kartaQatorlar(res, H.catalog, 'hammasi', { w: Math.round(bb.w), d: Math.round(bb.h), h: res.doc.room.wall_height, taxmin: res.assumed }) });
    }
    toast(res.assumed ? t('ai.olcham_taxmin')
      : t('ai.qurdi', { n: res.doc.placements.length, w: Math.round(bb.w), h: Math.round(bb.h) }) + (res.unknown.length ? t('ai.tushunilmadi', { s: res.unknown.join(', ') }) : ''));
  } catch (e) { if (!silent) xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e }); }
}

/** TZ-26: matn qatori va AI oynasidagi "Qurish" — bitta mebel konstruksiyasi bo'lsa — AI konstruksiya (joriy xonaga modul),
 *  xona yoki oshxona bo'lsa — avvalgidek loyiha quriladi */
export function matnniQur() {
  const text = get().ai.text.trim();
  if (!text) { toast(t('ai.avval_matn')); return; }
  /* egasi #183: avval turi — xona (shablon), oshxona, bitta modul yoki tanilmagan (qurilmaydi) */
  const yo = aiTur(text);
  if (yo.tur === 'nomalum') { tushunmadim(text); return; }
  if (yo.tur !== 'modul' || (!yo.buyum && !konstruksiyami(text))) { buildFromText(); return; }
  set('ai', { open: false, mic: false });
  aiKonstruksiya(text, aiOn, yo.buyum ? { buyum: yo.buyum } : {})
    .then(r => { if (r === 'xona') buildFromText(); })   // egasi #168: 'katalog' — tayyor modul qo'yildi, 'yoq' — xabar va "Baribir chizish"
    .catch(e => xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e }));
}

/** "Qurish": joriy loyihada mebel bo'lsa — avval tasdiq */
export function buildFromText() {
  const n = project.doc.placements.length;
  if (n) confirm({ title: t('ai.almashtirish_sarlavha'), text: t('ai.almashtirish_matn', { n }), ok: t('ai.almashtirish'), yes: () => runAI() });
  else runAI();
}

export function setText(text) { set('ai', { text }); }
export function openAi() { set('ai', { open: true }); }
export function closeAi() { stopVoice(); set('ai', { open: false, mic: false }); }

function stopVoice() { if (voice) { voice.stop(); voice = null; } }

/** mikrofon: tanlangan tilda (TZ-18); o'zbekchani brauzer qo'llamasa — ruscha */
const OVOZ_TIL = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
export function toggleMic() {
  if (voice) { stopVoice(); set('ai', { mic: false }); return; }
  if (!voiceSupported()) { toast(t('ai.brauzer_ovozsiz')); return; }
  let triedRu = false, rec = null;
  const start = (lang) => startVoice({
    lang, onText: (t) => set('ai', { text: t }),
    onEnd: (err) => {
      if (voice !== rec) return;
      if (err === 'language-not-supported' && !triedRu) { triedRu = true; rec = start('ru-RU'); voice = rec; return; }
      voice = null; set('ai', { mic: false });
      if (err && err !== 'no-speech' && err !== 'aborted') xato('S3D-AI-102', { matn: VOICE_ERR[err] ? t(VOICE_ERR[err]) : t('ai.ovoz_xatosi', { s: err }), modul: 'editor/ai' });
    }
  });
  const lang = OVOZ_TIL[til()] || 'uz-UZ';
  triedRu = lang !== 'uz-UZ';                     // zaxira (ruscha) — faqat o'zbekcha uchun
  rec = start(lang); voice = rec;
  set('ai', { mic: !!rec });
}

/** AI oynasi va onboarding uchun umumiy ko'rinish qiymatlari */
export function aiView(ai) {
  return {
    aiText: ai.text, onAiText: ev => setText(ev.target.value),
    aiEx: AI_EX.map(k => { const m = t(k); return { t: m, pick: () => setText(m) }; }),
    toggleMic, micLabel: ai.mic ? t('ai.tinglanmoqda') : t('ai.ovoz'), micBg: ai.mic ? 'var(--danger)' : 'var(--sfc2)', micT: ai.mic ? '#2A0A0A' : 'var(--txt)'
  };
}
