import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, confirm, xato } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { aiBuild, startVoice, voiceSupported } from '../../../../../app/js/ai.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { konstruksiya } from '../../../../../app/js/engine/konstruktor/index.js';
import { t, til } from '../../../i18n/index.js';

/* TZ-19 (TZ-12): AI — server til modeli (kirgan va serverda yoqilgan bo'lsa) yoki qoidali tahlilchi (ai.js), ovoz — brauzer. */
export const AI_EX = ['ai.misol1', 'ai.misol2', 'ai.misol3'];   // AI ham uch tilni tushunadi (TZ-18 8-bosqich)
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

/** matndan loyiha quriladi (joriy loyiha almashadi; teshiklar va oshxona sozlamasi saqlanadi) */
export async function runAI(silent) {
  const text = get().ai.text.trim();
  if (!text) { toast(t('ai.avval_matn')); return; }
  const H = project.H;
  try {
    const quvur = (project.doc.room && project.doc.room.utilities) || [];
    /* TZ-22: oshxona — avtomatik konstruktor (qoidalar, AI'siz); AI faqat matnni tushunadi */
    const konstruktor = (room, talab) => konstruksiya(Object.assign({}, room, { utilities: quvur }), talab, H.catalog).variantlar[0] || null;
    const res = await aiBuild(text, H.catalog, { llm: (t) => aiParse(t), konstruktor });
    res.doc.placements = res.doc.placements.filter(p => H.catalog[p.frg]);
    res.doc.room.utilities = quvur;
    res.doc.kitchen = res.kitchen ? Object.assign(L.freshKitchen(), res.kitchen) : (project.doc.kitchen || L.freshKitchen());
    project.reset(res.doc);
    set('ai', { open: false, mic: false });
    set('editor', { sel: null, part: null, warn: {} });
    project.changed('room', true);
    const bb = roomBBox(res.doc.room.outline);
    toast(res.assumed ? t('ai.olcham_taxmin')
      : t('ai.qurdi', { n: res.doc.placements.length, w: Math.round(bb.w), h: Math.round(bb.h) }) + (res.unknown.length ? t('ai.tushunilmadi', { s: res.unknown.join(', ') }) : ''));
  } catch (e) { if (!silent) xato('S3D-AI-101', { matn: t('ai.xato', { s: e.message }), modul: 'editor/ai', err: e }); }
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
