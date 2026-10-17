/* Smart3D — matndan zamer va buyurtma: istalgan sun'iy intellekt (TZ-12).
 *
 * Til modeli faqat matnni TUZILMAGA o'giradi (xona o'lchami, shakli, teshiklar, nechta pastki/ustki…).
 * Mebelni joylashtirishni mavjud qoidali dvigatel (suggestLayout) qiladi — AI geometriya o'ylab topmaydi.
 * Javob qat'iy tekshiriladi; xato bo'lsa sayt qoidali tahlilchiga qaytadi.
 *
 * Muhit (faqat serverda, gitga kirmaydi):
 *   AI_PROVIDER   anthropic | gemini | openai   (openai — OpenAI'ga mos istalgan API: OpenAI, DeepSeek, Ollama, OpenRouter…)
 *   AI_API_KEY    provayder kaliti (anthropic uchun yo'q bo'lsa — ANTHROPIC_API_KEY)
 *   AI_MODEL      model nomi. anthropic standarti: claude-opus-5-5. gemini/openai — majburiy
 *   AI_BASE_URL   openai uchun (standart https://api.openai.com/v1), masalan http://localhost:11434/v1 (Ollama)
 *   AI_TIMEOUT_MS standart 30000
 */
import Anthropic from '@anthropic-ai/sdk';
import { TIL_IZOH, TURLAR, specTekshir } from '../app/js/engine/konstruksiyaTili.js';

const KINDS = ['pastki', 'ustki', 'burchak', 'shkaf', 'stol', 'divan', 'orol'];
const FEATURES = ['sink', 'stove', 'fridge', 'corner', 'upper', 'tall', 'wardrobe', 'island'];
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

/** Javob sxemasi — barcha maydon majburiy, son chegaralari serverda tekshiriladi (sxema ularni qo'llamaydi) */
export const AI_SCHEMA = obj({
  room: obj({
    w_mm: { type: 'integer' }, d_mm: { type: 'integer' }, h_mm: { type: 'integer' },
    layout: { type: 'string', enum: ['linear', 'L', 'U', 'island'] },
    openings: { type: 'array', items: obj({ type: { type: 'string', enum: ['window', 'door'] }, width_mm: { type: 'integer' } }) }
  }),
  features: obj(Object.fromEntries(FEATURES.map(f => [f, { type: 'boolean' }]))),
  orders: { type: 'array', items: obj({ kind: { type: 'string', enum: KINDS }, qty: { type: 'integer' } }) },
  unknown: { type: 'array', items: { type: 'string' } }
});

const SYSTEM = `Siz mebel ustasining (o'zbek, rus, ingliz yoki aralash tilda, og'zaki) gapini tuzilmaga o'girasiz.
Faqat matnda AYTILGAN narsani yozing, hech narsani o'ylab topmang:
- room.w_mm, room.d_mm — xona eni va chuqurligi, millimetrda ("3.6x3 m" → 3600 va 3000). Aytilmagan bo'lsa 0.
- room.h_mm — shift balandligi, mm. Aytilmagan bo'lsa 0. Mebel balandligi xona balandligi EMAS.
- room.layout — oshxona shakli: linear (to'g'ri), L (burchakli), U, island (orolli). Aytilmagan bo'lsa linear.
- room.openings — deraza (window) va eshik (door), kengligi mm ("eshik 90 sm" → 900).
- features — aytilgan jihozlar: moyka (sink), plita/duxovka (stove), xolodilnik (fridge), burchak (corner), ustki shkaflar (upper), penal (tall), garderob (wardrobe), orol (island).
- orders — miqdori aytilgan mebel: pastki, ustki (osma), burchak, shkaf (garderob, penal), stol, divan, orol. Faqat aniq son aytilganlar.
- unknown — tushunilmagan bo'laklar (qisqa).
Faqat JSON qaytaring.`;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);

/** Model javobini tekshirib, qoidali tahlilchi (parseZamer) shakliga keltiradi. Yaroqsiz bo'lsa — Error */
export function normalizeParsed(j) {
  if (!j || typeof j !== 'object' || !j.room || typeof j.room !== 'object') throw new Error('AI javobi tuzilmasi noto\'g\'ri');
  const w = num(j.room.w_mm), d = num(j.room.d_mm), h = num(j.room.h_mm);
  const okDim = (x) => x >= 1000 && x <= 20000;
  const room = {
    w: okDim(w) ? w : 0, d: okDim(d) ? d : 0,
    h: h >= 2000 && h <= 6000 ? h : 2700,
    layoutType: ['linear', 'L', 'U', 'island'].includes(j.room.layout) ? j.room.layout : 'linear',
    openings: (Array.isArray(j.room.openings) ? j.room.openings : []).slice(0, 10)
      .filter(o => o && (o.type === 'window' || o.type === 'door'))
      .map(o => ({ type: o.type, width: Math.min(5000, Math.max(300, num(o.width_mm) || 900)) })),
    features: Object.fromEntries(FEATURES.map(f => [f, !!(j.features && j.features[f] === true)])),
    outline: null
  };
  if (room.w && room.d) room.outline = [[0, 0], [room.w, 0], [room.w, room.d], [0, room.d]];
  const orders = (Array.isArray(j.orders) ? j.orders : []).slice(0, 20)
    .filter(o => o && KINDS.includes(o.kind) && num(o.qty) >= 1)
    .map(o => ({ kind: o.kind, qty: Math.min(50, num(o.qty)) }));
  const unknown = (Array.isArray(j.unknown) ? j.unknown : []).slice(0, 10).map(s => String(s).slice(0, 100));
  return { room, orders, unknown };
}

export function aiConfig() {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  const model = process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-opus-5-5' : '');
  const key = process.env.AI_API_KEY || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '');
  const keyless = provider === 'openai' && /localhost|127\.0\.0\.1/.test(process.env.AI_BASE_URL || '');   // mahalliy Ollama
  const enabled = ['anthropic', 'gemini', 'openai'].includes(provider) && !!model && (!!key || keyless);
  return { enabled, provider: enabled ? provider : null, model: enabled ? model : null };
}

const TIMEOUT = () => Number(process.env.AI_TIMEOUT_MS) || 30000;

/* ── Claude (rasmiy SDK) ── */
let anthropicClient = null;
async function viaAnthropic(text, model, system = SYSTEM, schema = AI_SCHEMA, effort = 'low') {
  anthropicClient = anthropicClient || new Anthropic({ apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT(), maxRetries: 2 });
  const gen5 = /^claude-(opus|sonnet|haiku|fable)-5/.test(model);
  const withFallback = /^claude-(opus-5|opus-5-5|fable-5|fable-5-1|sonnet-5-5)$/.test(model);   // server-side fallback qo'llaydigan modellar
  const params = {
    model, max_tokens: 4000, system,
    messages: [{ role: 'user', content: text }],
    output_config: { format: { type: 'json_schema', schema }, ...(gen5 ? { effort } : {}) }
  };
  const res = withFallback
    ? await anthropicClient.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
    : await anthropicClient.messages.create(params);
  if (res.stop_reason === 'refusal') throw new Error('AI so\'rovni rad etdi');
  if (res.stop_reason === 'max_tokens') throw new Error('AI javobi to\'liq emas');
  const block = res.content.find(b => b.type === 'text');
  if (!block) throw new Error('AI matn qaytarmadi');
  return JSON.parse(block.text);
}

async function postJson(url, body, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT());
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error('AI HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const schemaHint = (schema) => '\nJSON sxemasi (aynan shu maydonlar):\n' + JSON.stringify(schema);

/* ── Gemini (Google) ── */
async function viaGemini(text, model, system = SYSTEM, schema = AI_SCHEMA) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const j = await postJson(url, {
    systemInstruction: { parts: [{ text: system + schemaHint(schema) }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { responseMimeType: 'application/json' }
  }, { 'x-goog-api-key': process.env.AI_API_KEY });
  const out = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
  if (!out || !out[0] || typeof out[0].text !== 'string') throw new Error('Gemini javobi bo\'sh');
  return JSON.parse(out[0].text);
}

/* ── OpenAI'ga mos API (OpenAI, DeepSeek, Ollama, OpenRouter…) ── */
async function viaOpenAI(text, model, system = SYSTEM, schema = AI_SCHEMA) {
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const j = await postJson(base + '/chat/completions', {
    model,
    messages: [{ role: 'system', content: system + schemaHint(schema) }, { role: 'user', content: text }],
    response_format: { type: 'json_object' }
  }, process.env.AI_API_KEY ? { authorization: 'Bearer ' + process.env.AI_API_KEY } : {});
  const c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (typeof c !== 'string') throw new Error('AI javobi bo\'sh');
  return JSON.parse(c);
}

/** text → { room, orders, unknown } (parseZamer shakli). Xato bo'lsa — Error (sayt qoidali tahlilchiga qaytadi) */
export async function llmParse(text) {
  const cfg = aiConfig();
  if (!cfg.enabled) throw new Error('AI sozlanmagan');
  const raw = cfg.provider === 'anthropic' ? await viaAnthropic(text, cfg.model)
    : cfg.provider === 'gemini' ? await viaGemini(text, cfg.model)
      : await viaOpenAI(text, cfg.model);
  return { parsed: normalizeParsed(raw), engine: `${cfg.provider}:${cfg.model}` };
}

/* ═══ TZ-26: AI konstruksiya — usta matni → konstruksiya tili (app/js/engine/konstruksiyaTili.js) ═══
 * AI faqat matnni tilga o'giradi; o'lcham chegarasi, eshik va polka qoidalari, chizma, narx — tizimda (specTekshir). */
const int = { type: 'integer' };
const TARKIB = { eshik: int, petlya: { type: 'string', enum: ['chap', 'ong', 'auto'] }, polka: int, tortma: int, shtanga: { type: 'boolean' } };
const QATLAM = obj({ boyi: int, ...TARKIB });
const BOLIM = obj({ eni: int, ...TARKIB, ajrat: { type: 'string', enum: ['polka', 'auto'] }, qatlamlar: { type: 'array', items: QATLAM } });
const MAT = obj({ nom: { type: 'string' }, qalinlik: int });   // dekor nomi matndagidek — ERP ro'yxatidan saytda qidiriladi
export const KONS_SCHEMA = obj({
  tur: { type: 'string', enum: [...TURLAR, 'xona'] }, nom: { type: 'string' }, eni: int, chuqurligi: int, boyi: int,
  tag: { type: 'string', enum: ['sokol', 'oyoq', 'yoq', 'auto'] }, qopqoq: { type: 'string', enum: ['yaxlit', 'planka', 'auto'] },
  bolimlar: { type: 'array', items: BOLIM },
  orqa: { type: 'string', enum: ['hdf', 'yergacha', 'yoq', 'auto'] },
  material: obj({ korpus: MAT, polka: MAT, fasad: MAT }),
  furnitura: obj({ birikma: { type: 'string', enum: ['konfirmat', 'ekssentrik', 'auto'] }, polka: { type: 'string', enum: ['polkaderjatel', 'auto'] }, ruchka: int }),
  eksport: { type: 'string', enum: ['obj', 'yoq'] },
  tushunilmadi: { type: 'array', items: { type: 'string' } }
});
const KONS_SYSTEM = `Siz mebel ustasining (o'zbek, rus, ingliz yoki aralash tilda, og'zaki) BITTA mebel konstruksiyasi haqidagi gapini Smart3D konstruksiya tiliga o'girasiz.
${TIL_IZOH}
- tushunilmadi — matnning tushunilmagan bo'laklari (qisqa).
Faqat JSON qaytaring.`;

/** text → { natija: { spec, tuzatish, tushunilmadi } | { xona: true }, engine }. AI javobi tuzilmasi noto'g'ri bo'lsa — Error */
export async function llmKonstruksiya(text) {
  const cfg = aiConfig();
  if (!cfg.enabled) throw new Error('AI sozlanmagan');
  const raw = cfg.provider === 'anthropic' ? await viaAnthropic(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA, 'medium')
    : cfg.provider === 'gemini' ? await viaGemini(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA)
      : await viaOpenAI(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA);
  if (!raw || typeof raw !== 'object' || ![...TURLAR, 'xona'].includes(raw.tur)) throw new Error('AI javobi tuzilmasi noto\'g\'ri');
  return { natija: specTekshir(raw), engine: `${cfg.provider}:${cfg.model}` };
}
