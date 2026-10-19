/* Smart3D — matndan zamer va buyurtma: istalgan sun'iy intellekt (TZ-12).
 *
 * Til modeli faqat matnni TUZILMAGA o'giradi (xona o'lchami, shakli, teshiklar, nechta pastki/ustki…).
 * Mebelni joylashtirishni mavjud qoidali dvigatel (suggestLayout) qiladi — AI geometriya o'ylab topmaydi.
 * Javob qat'iy tekshiriladi; xato bo'lsa sayt qoidali tahlilchiga qaytadi.
 *
 * Muhit (faqat serverda, gitga kirmaydi):
 *   AI_PROVIDER   anthropic | gemini | openai   (openai — OpenAI'ga mos istalgan API: OpenAI, DeepSeek, Ollama, OpenRouter…)
 *   AI_API_KEY    provayder kaliti (anthropic uchun yo'q bo'lsa — ANTHROPIC_API_KEY)
 *   AI_MODEL      model nomi. anthropic standarti: claude-sonnet-5-5. gemini/openai — majburiy
 *   AI_BASE_URL   openai uchun (standart https://api.openai.com/v1), masalan http://localhost:11434/v1 (Ollama)
 *   AI_TIMEOUT_MS standart 30000
 *   AI_MAX_TOKENS   javob chegarasi (TZ-40): sukut — parse 1000, konstruksiya 1500 (eski qiymat 4000; yetmasa bir marta 4000 bilan qayta so'raladi)
 *   AI_PROMPT_CACHE tizim ko'rsatmasini keshlash (Anthropic prompt caching): 0 — hech qachon; 1 — doim; sukut (auto) — chaqiruvchi hal qiladi
 *                   (lib/ai-tejash.js: yaqinda Claude chaqirilgan yoki soatiga >= 3 chaqiruv bo'lsagina — yozish narxi o'zini oqlaydi)
 */
import Anthropic from '@anthropic-ai/sdk';
import { TIL_IZOH, TURLAR, specTekshir } from '../app/js/engine/konstruksiyaTili.js';
import { oshxonaSxemadan } from '../app/js/engine/oshxonaTili.js';

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
  /* egasi #166: oshxona parametrlari (mm; 0 — aytilmagan). Sayt AI'siz tahlilchi natijasini asos qiladi, bu — faqat bo'sh joylarga */
  oshxona: obj(Object.fromEntries([
    'uzunlik_mm', 'q1_boyi_mm', 'q1_chuqurligi_mm', 'q2_boyi_mm', 'q2_chuqurligi_mm', 'q3_boyi_mm', 'q3_chuqurligi_mm', 'fartuk_mm',
    'tortma_soni', 'gaz_mm', 'vytyajka_mm', 'stol_qalinlik_mm', 'stol_chuqurligi_mm'].map(k => [k, { type: 'integer' }])
    .concat(['ruchkasiz', 'gola', 'haytek', 'tandem_vakuum'].map(k => [k, { type: 'boolean' }])))),
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
- oshxona — oshxona parametrlari, aytilmagani 0 yoki false: uzunlik_mm (oshxona qatori uzunligi, "kuxnya 4500 mm"), q1/q2/q3 — 1-qavat (pastki, bo'yi poldan stoleshnitsa ustigacha), 2-qavat (ustki), 3-qavat (antresol): boyi_mm va chuqurligi_mm; fartuk_mm; tortma_soni; gaz_mm va vytyajka_mm (eni); stol_qalinlik_mm, stol_chuqurligi_mm (stoleshnitsa); ruchkasiz ("bezruchka", "без ручек"), gola (Gola profil), haytek, tandem_vakuum (Tandem vakuum yo'naltiruvchi).
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
  /* oshxona — xom (sayt oshxonaTekshir bilan chegaraga keltiradi); aytilmagan bo'lsa maydon yo'q */
  const oshxona = oshxonaSxemadan(j.oshxona);
  return oshxona ? { room, orders, unknown, oshxona } : { room, orders, unknown };
}

export function aiConfig() {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  const model = process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-sonnet-5-5' : '');
  const key = process.env.AI_API_KEY || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '');
  const keyless = provider === 'openai' && /localhost|127\.0\.0\.1/.test(process.env.AI_BASE_URL || '');   // mahalliy Ollama
  const enabled = ['anthropic', 'gemini', 'openai'].includes(provider) && !!model && (!!key || keyless);
  return { enabled, provider: enabled ? provider : null, model: enabled ? model : null };
}

const TIMEOUT = () => Number(process.env.AI_TIMEOUT_MS) || 30000;

/* ── Claude (rasmiy SDK) ──
 * max_tokens: javob faqat JSON (kichik); 4000 behuda katta edi (TZ-40). Yetmasa (stop_reason: max_tokens) — bir marta 4000 bilan qayta.
 * Prompt caching: tizim ko'rsatmasi (har safar bir xil) cache_control bilan — kesh urilsa kirish tokeni arzon (usage.cache_read_input_tokens). */
const MAX_TOKENS_ESKI = 4000;
const maxTokensOl = (sukut) => { const n = Number(process.env.AI_MAX_TOKENS); return Number.isFinite(n) && n >= 200 ? Math.floor(n) : sukut; };
const keshYoqilgan = (talab) => { const v = process.env.AI_PROMPT_CACHE; return v === '0' ? false : v === '1' ? true : talab !== false; };
const sarf = (kirish, chiqish, yozildi = 0, oqildi = 0) => ({ kirish: kirish | 0, chiqish: chiqish | 0, kesh_yozildi: yozildi | 0, kesh_oqildi: oqildi | 0 });
let anthropicClient = null;
async function viaAnthropic(text, model, system = SYSTEM, schema = AI_SCHEMA, effort = 'low', maxTokens = MAX_TOKENS_ESKI, keshTalab = true) {
  anthropicClient = anthropicClient || new Anthropic({ apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT(), maxRetries: 2 });
  const gen5 = /^claude-(opus|sonnet|haiku|fable)-5/.test(model);
  const withFallback = /^claude-(opus-5|opus-5-5|fable-5|fable-5-1|sonnet-5-5)$/.test(model);   // server-side fallback qo'llaydigan modellar
  const jami = sarf(0, 0);
  const bir = async (cap) => {
    const params = {
      model, max_tokens: cap,
      system: keshYoqilgan(keshTalab) ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system,
      messages: [{ role: 'user', content: text }],
      output_config: { format: { type: 'json_schema', schema }, ...(gen5 ? { effort } : {}) }
    };
    const res = withFallback
      ? await anthropicClient.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await anthropicClient.messages.create(params);
    const u = res.usage || {};
    jami.kirish += u.input_tokens | 0; jami.chiqish += u.output_tokens | 0;
    jami.kesh_yozildi += u.cache_creation_input_tokens | 0; jami.kesh_oqildi += u.cache_read_input_tokens | 0;
    return res;
  };
  let res = await bir(maxTokens);
  if (res.stop_reason === 'max_tokens' && maxTokens < MAX_TOKENS_ESKI) res = await bir(MAX_TOKENS_ESKI);   // kam kelgan — bir marta eski chegara bilan
  const xato = (m) => Object.assign(new Error(m), { sarf: jami });   // xatoda ham ketgan token hisobga olinadi
  if (res.stop_reason === 'refusal') throw xato('AI so\'rovni rad etdi');
  if (res.stop_reason === 'max_tokens') throw xato('AI javobi to\'liq emas');
  const block = res.content.find(b => b.type === 'text');
  if (!block) throw xato('AI matn qaytarmadi');
  let json;
  try { json = JSON.parse(block.text); } catch (e) { throw xato('AI javobi JSON emas'); }
  return { json, sarf: jami };
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
  const u = j.usageMetadata || {};
  return { json: JSON.parse(out[0].text), sarf: sarf(u.promptTokenCount, u.candidatesTokenCount) };
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
  const u = j.usage || {};
  return { json: JSON.parse(c), sarf: sarf(u.prompt_tokens, u.completion_tokens) };
}

/** Ko'rsatma versiyasi — KESH KALITIGA kiradi: tizim ko'rsatmasi yoki sxema o'zgarsa oshiring (eski keshlar o'z-o'zidan ishlamay qoladi) */
export const KORSATMA_V = 1;
export const PARSE_MAX_TOKENS = 1000, KONS_MAX_TOKENS = 1500;

/** text → { room, orders, unknown } (parseZamer shakli). Xato bo'lsa — Error (sayt qoidali tahlilchiga qaytadi). sarf — token hisobi */
export async function llmParse(text, o = {}) {
  const cfg = aiConfig();
  if (!cfg.enabled) throw new Error('AI sozlanmagan');
  const { json, sarf: s } = cfg.provider === 'anthropic' ? await viaAnthropic(text, cfg.model, SYSTEM, AI_SCHEMA, 'low', maxTokensOl(PARSE_MAX_TOKENS), o.kesh)
    : cfg.provider === 'gemini' ? await viaGemini(text, cfg.model)
      : await viaOpenAI(text, cfg.model);
  return { parsed: normalizeParsed(json), engine: `${cfg.provider}:${cfg.model}`, sarf: s };
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
export async function llmKonstruksiya(text, o = {}) {
  const cfg = aiConfig();
  if (!cfg.enabled) throw new Error('AI sozlanmagan');
  const { json: raw, sarf: s } = cfg.provider === 'anthropic' ? await viaAnthropic(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA, 'medium', maxTokensOl(KONS_MAX_TOKENS), o.kesh)
    : cfg.provider === 'gemini' ? await viaGemini(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA)
      : await viaOpenAI(text, cfg.model, KONS_SYSTEM, KONS_SCHEMA);
  if (!raw || typeof raw !== 'object' || ![...TURLAR, 'xona'].includes(raw.tur)) throw new Error('AI javobi tuzilmasi noto\'g\'ri');
  return { natija: specTekshir(raw), engine: `${cfg.provider}:${cfg.model}`, sarf: s };
}
