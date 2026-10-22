/* Maxfiy qiymatlarni matndan olib tashlash (TZ-37, 3-faza, "Tizim" bo'limi): admin panel javobida kalit, parol yoki token QIYMATI hech qachon
 * chiqmasligi kerak — hatto xato matni (jurnal, AI xatosi) ichida tasodifan bo'lsa ham.
 *   1) muhitdagi maxfiy o'zgaruvchilar qiymati (kamida 8 belgi) matnda uchrasa — "[maxfiy]" bilan almashtiriladi;
 *   2) umumiy shakllar: Anthropic/OpenAI kaliti (sk-…), Google API kaliti (AIza…), Telegram bot kaliti (123456:ABC…), JWT, "Bearer …".
 * Faqat matn bilan ishlaydi (hech narsa yozmaydi, tarmoqqa chiqmaydi). */
const MAXFIY_MUHIT = ['AI_API_KEY', 'ANTHROPIC_API_KEY', 'ESKIZ_PASSWORD', 'ESKIZ_EMAIL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'JWT_SECRET',
  'ADMIN_PASSWORD', 'YANDEX_SPEECH_KEY', 'DATABASE_URL', 'REDIS_URL', 'ERP_LOGIN', 'ERP_PASSWORD'];   // TZ-44: ERP kirish ma'lumoti
const SHAKLLAR = [
  /\bsk-[A-Za-z0-9_-]{12,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\b\d{6,}:[A-Za-z0-9_-]{25,}/g,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi
];

/** matn ichidagi maxfiy qiymatlarni yashiradi (matn bo'lmasa — o'zgarishsiz) */
export function maxfiyTozala(s, env = process.env) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;
  for (const k of MAXFIY_MUHIT) {
    const v = env[k];
    if (typeof v === 'string' && v.trim().length >= 8) out = out.split(v.trim()).join('[maxfiy]');
  }
  for (const re of SHAKLLAR) out = out.replace(re, '[maxfiy]');
  return out;
}

/** obyekt/massiv ichidagi hamma matnni tozalaydi (yangi nusxa qaytaradi) */
export function maxfiyTozalaChuqur(v, env = process.env) {
  if (typeof v === 'string') return maxfiyTozala(v, env);
  if (Array.isArray(v)) return v.map(x => maxfiyTozalaChuqur(x, env));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, maxfiyTozalaChuqur(x, env)]));
  return v;
}
