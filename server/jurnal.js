/* Smart3D server jurnali (TZ-19 §2): tuzilmali JSON qatorlar (stdout) + error_log jadvali (ogohlantirish va xatolar).
 *
 * Har yozuv: vaqt, daraja, kod (S3D-…), rid (so'rov raqami), foydalanuvchi id, yo'l, status, qisqa matn.
 * Shaxsiy ma'lumot niqoblanadi (email, telefon, token); parol, token va so'rov tanasi HECH QACHON yozilmaydi.
 * Saqlash: oxirgi 30 kun va ko'pi bilan 10 000 qator (eskisi o'chiriladi). Bazaga daqiqasiga ko'pi bilan 120 yozuv —
 * hujum paytida jadval to'lib ketmaydi (ortig'i faqat stdout'da). */
const KEEP_DAYS = 30, KEEP_ROWS = 10000, MAX_PER_MIN = 120;

/** email → a***@mail.uz, telefon → 99890*****67, JWT/Bearer → [token] */
export function niqob(v) {
  return String(v == null ? '' : v)
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [token]')
    .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1***@$2')
    .replace(/\b(998\d{2})\d{5}(\d{2})\b/g, '$1*****$2')
    .replace(/\b(\d{2})\d{5}(\d{2})\b/g, '$1*****$2');
}
const qisqa = (v, n) => niqob(v).replace(/[\r\n\t]+/g, ' ').slice(0, n);

export function createJurnal(db, { out = process.stdout, err = process.stderr } = {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'server',
      code TEXT NOT NULL,
      rid TEXT DEFAULT '',
      user_id INTEGER,
      method TEXT DEFAULT '',
      path TEXT DEFAULT '',
      status INTEGER,
      msg TEXT DEFAULT '',
      meta TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_error_log_code ON error_log(code, ts);
    CREATE INDEX IF NOT EXISTS idx_error_log_rid ON error_log(rid);
  `);
  const ins = db.prepare(`INSERT INTO error_log (level, source, code, rid, user_id, method, path, status, msg, meta)
    VALUES (@level, @source, @code, @rid, @user_id, @method, @path, @status, @msg, @meta)`);
  const prune = () => {
    db.prepare(`DELETE FROM error_log WHERE ts < datetime('now', '-${KEEP_DAYS} days')`).run();
    db.prepare(`DELETE FROM error_log WHERE id <= (SELECT id FROM error_log ORDER BY id DESC LIMIT 1 OFFSET ${KEEP_ROWS})`).run();
  };
  prune();
  setInterval(prune, 10 * 60 * 1000).unref();
  let minute = 0, saved = 0;

  /** o: { code, msg, rid, uid, method, path, status, source, meta, save } — save=false: faqat stdout */
  function write(level, o) {
    const row = {
      level, source: o.source || 'server', code: o.code || 'S3D-SRV-001', rid: o.rid || '', user_id: o.uid ?? null,
      method: o.method || '', path: qisqa(o.path, 200), status: o.status ?? null, msg: qisqa(o.msg, 300),
      meta: o.meta ? qisqa(typeof o.meta === 'string' ? o.meta : JSON.stringify(o.meta), 1500) : ''
    };
    const line = JSON.stringify({ t: new Date().toISOString(), lvl: level, code: row.code, rid: row.rid || undefined, uid: row.user_id ?? undefined,
      m: row.method || undefined, p: row.path || undefined, s: row.status ?? undefined, src: row.source !== 'server' ? row.source : undefined, msg: row.msg, x: row.meta || undefined });
    (level === 'error' ? err : out).write(line + '\n');
    if (level === 'info' || o.save === false) return;
    const m = Math.floor(Date.now() / 60000);
    if (m !== minute) { minute = m; saved = 0; }
    if (++saved > MAX_PER_MIN) return;
    try { ins.run(row); } catch (e) { err.write('{"lvl":"error","msg":"jurnal yozilmadi"}\n'); }
  }

  return {
    info: (o) => write('info', o),
    warn: (o) => write('warn', o),
    error: (o) => write('error', o),
    /** admin: kod bo'yicha guruh (soni, oxirgi vaqt, oxirgi matn) va oxirgi yozuvlar; rid yoki kod bo'yicha qidiruv */
    royxat({ rid = '', kod = '' } = {}) {
      const where = [], args = [];
      if (rid) { where.push('rid = ?'); args.push(rid); }
      if (kod) { where.push('code = ?'); args.push(kod); }
      const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const guruhlar = db.prepare(`SELECT code, source, COUNT(*) AS n, MAX(ts) AS oxirgi,
          (SELECT msg FROM error_log e2 WHERE e2.code = e1.code ORDER BY id DESC LIMIT 1) AS msg
        FROM error_log e1 ${w} GROUP BY code, source ORDER BY oxirgi DESC LIMIT 100`).all(...args);
      const oxirgi = db.prepare(`SELECT id, ts, level, source, code, rid, user_id, method, path, status, msg FROM error_log ${w} ORDER BY id DESC LIMIT 50`).all(...args);
      return { guruhlar, oxirgi };
    }
  };
}
