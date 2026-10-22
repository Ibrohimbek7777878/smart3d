/* Narx stavkalari hujjati (settings.narx_stavkalari) — admin panelning tarix va ERP bo'limlari uchun umumiy yordamchilar (TZ-37, 3-faza).
 * routes/narxlar.js dagi mantiq bilan BIR XIL: joriy hujjat (bazadagi, bo'lmasa materials.json dan sukut), saqlash va har o'zgarish narx_history ga
 * (kim, eski → yangi). Shakl va tekshiruv — app/js/engine/narxStavka.js (bitta manba). narxlar.js ga tegilmaydi. */
import { narxSukut } from '../../app/js/engine/narxStavka.js';
import { readJsonData } from './malumot.js';

/** joriy hujjat: bazadagi (buzilgan bo'lsa — jurnalga yozib, sukut), yo'q bo'lsa — materials.json dan boshlang'ich */
export function narxCurrent(db, jurnal) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'narx_stavkalari'").get();
  if (row) { try { return JSON.parse(row.value); } catch (e) { jurnal && jurnal.error({ code: 'S3D-NARX-002', msg: 'narx_stavkalari buzilgan: ' + e.message }); } }
  return narxSukut(readJsonData('materials.json'));
}

/** hujjatni saqlaydi va har o'zgarishni narx_history ga yozadi ([{ kalit, eski, yangi }]). Tranzaksiya ichida chaqiriladi.
 *  izoh — _meta.ozgartirildi oxiriga (masalan "(ERP sinxron)"). */
export function narxSaqla(db, userId, next, ozgarish, izoh = '') {
  next._meta = { ozgartirildi: `${userId == null ? 'tizim' : 'admin #' + userId}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}${izoh ? ' ' + izoh : ''}` };   // userId yo'q — ERP jonli sinxron (TZ-44)
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('narx_stavkalari', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(next));
  const ins = db.prepare('INSERT INTO narx_history (user_id, kalit, eski, yangi) VALUES (?, ?, ?, ?)');
  const ids = [];
  for (const o of ozgarish) ids.push(Number(ins.run(userId, o.kalit, JSON.stringify(o.eski), JSON.stringify(o.yangi)).lastInsertRowid));
  return ids;
}
