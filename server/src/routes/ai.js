/* ═══════════════════ AI ROUTES ═══════════════════ */
import { Router } from 'express';
import config from '../config.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, aiBuildSchema, aiInspectSchema } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../errors.js';
import { logInfo, logError } from '../logger.js';

const router = Router();

/* ═══ AI Build — matn → konstruksiya ═══ */
router.post('/build', authenticate, validate(aiBuildSchema), asyncHandler(async (req, res) => {
  const { text, room, language } = req.body;

  // 1) Avval lokal rule-engine bilan urinish
  const localResult = await localBuild(text, room, language);

  // 2) AI API bo'lsa, undan foydalanish
  if (config.ai.apiKey) {
    try {
      const aiResult = await aiBuild(text, room, language);
      return res.json({
        source: 'ai',
        ...aiResult,
      });
    } catch (error) {
      logError('AI build failed, using local', error);
    }
  }

  // 3) Local fallback
  res.json({
    source: 'local',
    ...localResult,
  });
}));

/* ═══ AI Inspect — nazoratchi AI ═══ */
router.post('/inspect', authenticate, validate(aiInspectSchema), asyncHandler(async (req, res) => {
  const { project, cutlists } = req.body;

  // Lokal nazoratchi
  const issues = localInspect(project, cutlists);

  // AI API bo'lsa, qo'shimcha tahlil
  if (config.ai.apiKey) {
    try {
      const aiIssues = await aiInspect(project, cutlists);
      return res.json({
        source: 'ai',
        issues: [...issues, ...aiIssues],
      });
    } catch (error) {
      logError('AI inspect failed, using local', error);
    }
  }

  res.json({ source: 'local', issues });
}));

/* ═══ AI Voice — ovozli yozuv ═══ */
router.post('/voice', authenticate, asyncHandler(async (req, res) => {
  const { audio_base64, language } = req.body;
  if (!audio_base64) throw new AppError('audio_base64 required', 400);

  // Hozircha lokal (keyin Yandex Speech API)
  res.json({
    source: 'local',
    text: '',
    message: 'Voice recognition not yet configured. Set YANDEX_SPEECH_KEY.',
  });
}));

/* ═══════════════════ LOCAL BUILD ENGINE ═══════════════════ */
async function localBuild(text, room, language) {
  // Matnni tahlil qilish
  const t = text.toLowerCase();
  const result = {
    room: room || {},
    placements: [],
    material_code: 'MDF16',
    total_price: 0,
    notes: [],
  };

  // O'lchamlarni ajratish
  const sizeMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (sizeMatch) {
    result.room.width = parseInt(sizeMatch[1]);
    result.room.depth = parseInt(sizeMatch[2]);
  }

  // Xona turini aniqlash
  if (/oshxona|kitchen|кухня/.test(t)) {
    result.notes.push('Oshxona aniqlandi');
    // Standart oshxona modullari
    result.placements = [
      { frg: 'SP-K-001', w: 600, d: 550, h: 720, x: 0, y: 0 },
      { frg: 'SP-K-002', w: 600, d: 550, h: 720, x: 600, y: 0 },
    ];
  } else if (/yotoq|bed|спальня/.test(t)) {
    result.notes.push('Yotoq xonasi aniqlandi');
    result.placements = [
      { frg: 'SP-W-001', w: 1800, d: 600, h: 2100, x: 0, y: 0 },
    ];
  } else if (/hammom|bath|ванная/.test(t)) {
    result.notes.push('Hammom aniqlandi');
    result.placements = [
      { frg: 'SP-B-001', w: 600, d: 300, h: 700, x: 0, y: 0 },
    ];
  }

  return result;
}

/* ═══════════════════ LOCAL INSPECT ENGINE ═══════════════════ */
function localInspect(project, cutlists) {
  const issues = [];

  // 1) O'lcham tekshirish
  if (project.room) {
    const { width, depth } = project.room;
    if (width && width < 1000) issues.push({ severity: 'warning', code: 'W_ROOM_SMALL', message: 'Xona juda kichik' });
    if (depth && depth < 1000) issues.push({ severity: 'warning', code: 'W_ROOM_SMALL', message: 'Xona juda kichik' });
  }

  // 2) Modullar soni
  if (project.placements?.length === 0) {
    issues.push({ severity: 'error', code: 'E_NO_MODULES', message: 'Modullar qo\'yilmagan' });
  }

  // 3) Cutlist tekshirish
  if (cutlists.length > 0) {
    for (const cl of cutlists) {
      if (cl.parts?.length === 0) {
        issues.push({ severity: 'error', code: 'E_NO_PARTS', message: `${cl.name}: detallar yo'q` });
      }
    }
  }

  return issues;
}

/* ═══════════════════ AI API (Gemini) ═══════════════════ */
async function aiBuild(text, room, language) {
  const prompt = `Siz mebel konstruktorisiz. Quyidagi matndan mebel konstruksiyasini yarating.

Matn: ${text}
Xona: ${JSON.stringify(room)}
Til: ${language}

Javobni JSON formatida bering:
{
  "room": { "width": number, "depth": number, "height": number },
  "placements": [{ "frg": string, "w": number, "d": number, "h": number, "x": number, "y": number }],
  "material_code": string,
  "total_price": number,
  "notes": [string]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.ai.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) throw new AppError('AI API error', 502);

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // JSON parse (```json wrapper ni olib tashlash)
  const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : textResponse;

  return JSON.parse(jsonStr);
}

async function aiInspect(project, cutlists) {
  const prompt = `Siz mebel nazoratchisisiz. Quyidagi loyihani tekshiring va xatolarni toping.

Loyiha: ${JSON.stringify(project)}
Detallar: ${JSON.stringify(cutlists)}

Javobni JSON formatida bering:
[{ "severity": "error|warning|info", "code": string, "message": string }]`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.ai.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) throw new AppError('AI API error', 502);

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : textResponse;

  return JSON.parse(jsonStr);
}

export default router;
