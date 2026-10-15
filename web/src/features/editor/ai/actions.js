import { get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { S } from '../../../store/session.js';
import { toast, confirm } from '../../../store/ui.js';
import * as L from '../../../services/loyiha.js';
import { aiBuild, startVoice, voiceSupported } from '../../../../../app/js/ai.js';
import { roomBBox } from '../../../../../app/js/engine/rules.js';

/* TZ-19 (TZ-12): AI — server til modeli (kirgan va serverda yoqilgan bo'lsa) yoki qoidali tahlilchi (ai.js), ovoz — brauzer. */
export const AI_EX = ['oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf', '4.2x3.1 xona, 1 garderob, 1 stol', '5x4 mehmonxona, divan, 2 ta toko'];
const VOICE_ERR = { 'not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)', 'service-not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)', 'audio-capture': 'Mikrofon topilmadi', network: 'Ovoz xizmati uchun internet kerak' };

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
  if (!text) { toast('Avval matn yozing yoki ovozni bosing'); return; }
  const H = project.H;
  try {
    const res = await aiBuild(text, H.catalog, { llm: (t) => aiParse(t) });
    res.doc.placements = res.doc.placements.filter(p => H.catalog[p.frg]);
    res.doc.room.utilities = (project.doc.room && project.doc.room.utilities) || [];
    res.doc.kitchen = project.doc.kitchen || L.freshKitchen();
    project.reset(res.doc);
    set('ai', { open: false, mic: false });
    set('editor', { sel: null, part: null, warn: {} });
    project.changed('room', true);
    const bb = roomBBox(res.doc.room.outline);
    toast(res.assumed ? '⚠️ Xona o\'lchami tushunilmadi — 3600×2800 mm taxmin qilindi'
      : '🪄 AI loyihani qurdi: ' + res.doc.placements.length + ' modul · ' + Math.round(bb.w) + '×' + Math.round(bb.h) + ' mm' + (res.unknown.length ? ' · tushunilmadi: ' + res.unknown.join(', ') : ''));
  } catch (e) { if (!silent) toast('AI xato: ' + e.message); }
}

/** "Qurish": joriy loyihada mebel bo'lsa — avval tasdiq */
export function buildFromText() {
  const n = project.doc.placements.length;
  if (n) confirm({ title: 'Loyihani almashtirasizmi?', text: 'Joriy ' + n + ' ta mebel almashtiriladi. Davom etasizmi?', ok: 'Almashtirish', yes: () => runAI() });
  else runAI();
}

export function setText(text) { set('ai', { text }); }
export function openAi() { set('ai', { open: true }); }
export function closeAi() { stopVoice(); set('ai', { open: false, mic: false }); }

function stopVoice() { if (voice) { voice.stop(); voice = null; } }

/** mikrofon: o'zbekcha, qo'llamasa — ruscha */
export function toggleMic() {
  if (voice) { stopVoice(); set('ai', { mic: false }); return; }
  if (!voiceSupported()) { toast('Bu brauzer ovozni qo\'llab-quvvatlamaydi (Chrome/Edge kiriting)'); return; }
  let triedRu = false, rec = null;
  const start = (lang) => startVoice({
    lang, onText: (t) => set('ai', { text: t }),
    onEnd: (err) => {
      if (voice !== rec) return;
      if (err === 'language-not-supported' && !triedRu) { triedRu = true; rec = start('ru-RU'); voice = rec; return; }
      voice = null; set('ai', { mic: false });
      if (err && err !== 'no-speech' && err !== 'aborted') toast(VOICE_ERR[err] || ('Ovoz xatosi: ' + err));
    }
  });
  rec = start('uz-UZ'); voice = rec;
  set('ai', { mic: !!rec });
}

/** AI oynasi va onboarding uchun umumiy ko'rinish qiymatlari */
export function aiView(ai) {
  return {
    aiText: ai.text, onAiText: ev => setText(ev.target.value),
    aiEx: AI_EX.map(t => ({ t, pick: () => setText(t) })),
    toggleMic, micLabel: ai.mic ? 'Tinglanmoqda…' : 'Ovoz', micBg: ai.mic ? 'var(--danger)' : 'var(--sfc2)', micT: ai.mic ? '#2A0A0A' : 'var(--txt)'
  };
}
