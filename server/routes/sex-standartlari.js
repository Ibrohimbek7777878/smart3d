/* SEX STANDARTLARI (TZ-14)
 * O'qish — hamma; o'zgartirish — faqat admin. Boshlang'ich qiymat app/data/sex-standartlari.json dan,
 * o'zgargani settings jadvalida. Har o'zgarish tarixga yoziladi (eski → yangi), qaytarish mumkin. */
import express from 'express';
import { bad, fail } from '../lib/xato.js';
import { num } from '../lib/tekshir.js';
import { readJsonData } from '../lib/malumot.js';

const STD_DIMS = ['w', 'd', 'h', 'uzunlik', 'eni'];

export default function sexStandartlariRouter({ db, auth, adminOnly }) {
  const r = express.Router();
  function sexStdCurrent() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'sex_standartlari'").get();
    return row ? JSON.parse(row.value) : readJsonData('sex-standartlari.json');
  }

  r.get('/api/sex-standartlari', (req, res) => {
    const cur = sexStdCurrent();
    if (!cur) return fail(res, 'S3D-STD-001');
    res.json(cur);
  });
  r.put('/api/sex-standartlari', auth, adminOnly, (req, res) => {
    const cur = sexStdCurrent();
    const inc = (req.body || {}).modullar;
    if (!cur || !inc || typeof inc !== 'object' || Array.isArray(inc)) bad('modullar kerak');
    const next = JSON.parse(JSON.stringify(cur));
    for (const [tur, v] of Object.entries(inc)) {
      if (!next.modullar[tur]) bad(`noma'lum tur: ${tur}`);
      if (!v || typeof v !== 'object') bad(`${tur}: qiymat kerak`);
      for (const k of STD_DIMS) {
        if (!(k in v)) continue;
        if (!next.modullar[tur][k]) bad(`${tur}.${k}: bu tur uchun bunday o'lcham yo'q`);
        const x = v[k] || {};
        const min = x.min == null || x.min === '' ? null : Math.round(num(x.min, `${tur}.${k}.min`, { min: 1, max: 20000 }));
        const max = x.max == null || x.max === '' ? null : Math.round(num(x.max, `${tur}.${k}.max`, { min: 1, max: 20000 }));
        if (min != null && max != null && min >= max) bad(`${tur}.${k}: min max dan kichik bo'lishi kerak`);
        const out = Object.assign({}, next.modullar[tur][k]);
        if (min == null) delete out.min; else out.min = min;
        if (max == null) delete out.max; else out.max = max;
        if (x.std !== undefined) {
          if (!Array.isArray(x.std) || x.std.length > 20) bad(`${tur}.${k}.std: ro'yxat (20 tagacha) bo'lishi kerak`);
          const std = x.std.map((s, i) => Math.round(num(s, `${tur}.${k}.std[${i}]`, { min: 1, max: 20000, required: true })));
          if (std.some(s => (min != null && s < min) || (max != null && s > max))) bad(`${tur}.${k}: standart qiymat chegaradan tashqarida`);
          if (std.length) out.std = std; else delete out.std;
        }
        next.modullar[tur][k] = out;
      }
    }
    next._meta = Object.assign({}, next._meta, { ozgartirildi: `admin #${req.user.id}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}` });
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('sex_standartlari', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(next));
    db.prepare('INSERT INTO sex_std_history (user_id, old_json, new_json) VALUES (?, ?, ?)').run(req.user.id, JSON.stringify(cur), JSON.stringify(next));
    res.json({ ok: true, standartlar: next });
  });

  return r;
}
