/* ADMIN: ERP SINXRONLASH (TZ-37, 3-faza) — admin ERP'dan olingan JSON'ni YUKLAYDI; panel tekshiradi, farqni ko'rsatadi, admin tasdiqlagach narxlar qo'llanadi.
 * ERP bilan JONLI ALOQA YO'Q: server ERP'ga ulanmaydi, ERP'ga hech narsa yozilmaydi va undan hech narsa so'ralmaydi (qoida 2.10). Repoda ERP'ni xavfsiz o'qiydigan
 * to'g'ridan-to'g'ri vosita yo'q (Smart3D_malumot/erp-*.json — egasi GET bilan olgan eksportlar), shuning uchun usul — "yuklash → farq → tasdiq → qo'llash".
 *
 *   POST   /api/admin/erp/yuklash        { tur?: 'mahsulot'|'xizmat', fayl_nom, json }  → qoralama (hech narsa o'zgarmaydi): { id, xulosa, … }
 *   GET    /api/admin/erp                → { qatlam:{ plita, furnitura, oxirgi_sana }, partiyalar:[…] }
 *   GET    /api/admin/erp/:id?guruh=&holat=&q=&limit=&offset=   → farq qatorlari (|o'zgarish %| bo'yicha; "faylda yo'q" — faqat holat=yoq bilan)
 *   POST   /api/admin/erp/:id/qollash    { tasdiq: true, guruhlar?, istisno?: ['plita:ERP-…', …], yangi_xizmat? }  → narxlar qo'llanadi (admin_audit: 'erp')
 *   DELETE /api/admin/erp/:id            qoralamani o'chirish
 *   POST   /api/admin/erp/sukut          { tasdiq: true, guruh?: 'hammasi'|'plita'|'furnitura' }  → ERP qatlami olib tashlanadi, narxlar fayldagidek
 *   GET    /api/erp-narx  (ochiq)        → { plita:{ERP-kod: so'm}, furnitura:{ID: so'm}, sana, versiya, yangilangan, jonli:{…} } — brauzer fayl narxi USTIGA qo'yadi (engine/adminQatlam.js);
 *                                         ETag / If-None-Match → 304 (TZ-44)
 *   JONLI SINXRON (TZ-44, server/lib/erp-jonli.js; ERP_JONLI=1 + ERP_LOGIN + ERP_PASSWORD muhitda bo'lsa fon poller ishlaydi):
 *   GET    /api/admin/erp/jonli          → holat + oxirgi 50 o'zgarish + tasdiq kutayotganlar (qoralama manba 'jonli' — odatdagi /api/admin/erp/:id bilan qo'llanadi)
 *   POST   /api/admin/erp/jonli/hozir    { toliq?, kut? } → "Hozir sinxronla" (30 soniyada 1 marta)
 *   PUT    /api/admin/erp/jonli          { pauza?: bool, chegara_foiz?: 5..100 }
 *
 * Qatlam tartibi (past → yuqori): fayl narxi < ERP qatlami (erp_narx) < admin qo'lda narxi (mat_narx — "Materiallar"). Qo'lda narx bor plita ERP'dan o'zgarmaydi ("qolda").
 * Xizmat narxlari (raspil, kromka, prisadka, Bazis) — mavjud narx hujjatiga (settings.narx_stavkalari, narx_history) yoziladi; admin qo'lda ("egasi") qo'ygani o'zgarmaydi.
 * Har qo'llash va sukutga qaytarish — admin_audit (bolim 'erp') va tarixdan qaytariladi (qaytarilganda keyin o'zgargan qatorlar o'tkazib yuboriladi).
 * Hamma /api/admin/* — faqat admin (aks holda 404 S3D-AUTH-006). Pul harakati yo'q. Fayllar (app/data/*.json) O'ZGARMAYDI. */
import express from 'express';
import { fail } from '../lib/xato.js';
import { erpKatalog, qoldaMap, farqKirish } from '../lib/erp-katalog.js';
import { ErpXato } from '../lib/erp-jonli.js';
import { narxQollash, narxXatoMi } from '../../app/js/engine/narxStavka.js';
import { erpMahsulotOqi, mahsulotFarq, erpXizmatOqi, xizmatFarq } from '../../app/js/engine/erpSinxron.js';
import { narxCurrent, narxSaqla } from '../lib/narx-hujjat.js';

const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };
const GURUHLAR = ['plita', 'furnitura', 'xizmat'];
const KOR_GURUH = ['plita', 'furnitura', 'xizmat', 'stoleshnitsa', 'yangi', 'noaniq'];
const KOR_HOLAT = ['q', 'ozgardi', 'toldirildi', 'bir_xil', 'narxsiz', 'qolda', 'yangi', 'noaniq', 'yoq'];
const QORALAMA_SAQLASH = 8;             // eng ko'pi bilan shuncha qoralama (eskisi o'chadi)
const QORALAMA_KUN = 14;
const TOLIQ_SAQLASH = 20;               // oxirgi shuncha yuklashning farq ro'yxati saqlanadi (qo'llanganlarniki ham — keyin ko'rish uchun)

export default function adminErpRouter({ db, jurnal, erpJonli }, { guard, yoz, matn, himoya, Kirish, qaytaruvchilar }) {
  const r = express.Router();
  const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});

  /* ── fayl katalogi va qatlamlar — lib/erp-katalog.js (jonli sinxron bilan umumiy) ── */
  const katalog = erpKatalog;
  const bump = () => { if (erpJonli) erpJonli.versiyaOshir(); };          // ERP qatlami o'zgardi — brauzerlar yangilanadi (TZ-44 versiya)

  /* ═══════════ OCHIQ: brauzer fayl narxi ustiga qo'yadi ═══════════ */
  r.get('/api/erp-narx', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    if (!erpJonli) {                                                         // jonli modul ulanmagan (eski sinov muhiti) — avvalgi shakl
      const plita = {}, furnitura = {};
      let sana = '';
      for (const x of db.prepare('SELECT tur, kalit, uzs, sana FROM erp_narx WHERE uzs > 0').all()) {
        (x.tur === 'plita' ? plita : furnitura)[x.kalit] = x.uzs;
        if (x.sana > sana) sana = x.sana;
      }
      return res.json({ plita, furnitura, sana });
    }
    const etag = erpJonli.ommaviyEtag(), j = erpJonli.sarlavha();
    res.set('ETag', etag).set('X-Erp-Versiya', String(j.versiya)).set('X-Erp-Oxirgi', j.oxirgi || '');   // 304 da ham keladi: ERP tirikligi sarlavhada
    const inm = String(req.headers['if-none-match'] || '');
    if (inm && inm.split(',').some(t => t.trim() === etag || t.trim() === etag.replace(/^W\//, ''))) return res.status(304).end();
    res.json(erpJonli.ommaviy());
  });

  /* ═══════════ JONLI SINXRON (TZ-44) ═══════════ */
  const jonliXato = (res, e) => {
    if (e instanceof ErpXato) return fail(res, e.kod, e.message);
    throw e;
  };
  r.get('/api/admin/erp/jonli', guard, himoya((req, res) => {
    res.set('Cache-Control', 'no-store').json(erpJonli.holat());
  }));
  r.post('/api/admin/erp/jonli/hozir', guard, himoya(async (req, res) => {
    const b = obj(req.body);
    if ((b.toliq !== undefined && typeof b.toliq !== 'boolean') || (b.kut !== undefined && typeof b.kut !== 'boolean')) throw new Kirish('S3D-ERP-008', 'toliq / kut: true yoki false');
    let natija;
    try { natija = await erpJonli.hozirSinxron({ toliq: b.toliq === true, kut: b.kut === true }); } catch (e) { return jonliXato(res, e); }
    yoz(req, 'erp_jonli', 'hozir', null, { tur: natija.tur });
    res.status(natija.tugadi ? 200 : 202).json({ ok: true, ...natija });
  }));
  r.put('/api/admin/erp/jonli', guard, himoya((req, res) => {
    let o;
    try { o = erpJonli.sozla(req.body); } catch (e) { return jonliXato(res, e); }
    yoz(req, 'erp_jonli', 'sozlama', o.eski, o.yangi);
    res.json({ ok: true, ...o.yangi });
  }));

  /* ═══════════ YUKLASH (qoralama) ═══════════ */
  function tozalash() {
    /* jonli sinxron yozuvlari (manba 'jonli') bu yerda tegilmaydi — ularni lib/erp-jonli.js o'zi yuritadi */
    db.prepare(`DELETE FROM erp_partiya WHERE manba <> 'jonli' AND holat = 'qoralama' AND created_at < datetime('now', '-${QORALAMA_KUN} days')`).run();
    db.prepare(`DELETE FROM erp_partiya WHERE manba <> 'jonli' AND holat = 'qoralama' AND id NOT IN (SELECT id FROM erp_partiya WHERE manba <> 'jonli' AND holat = 'qoralama' ORDER BY id DESC LIMIT ${QORALAMA_SAQLASH})`).run();
    db.prepare(`UPDATE erp_partiya SET farq_json = '' WHERE manba <> 'jonli' AND farq_json <> '' AND id NOT IN (SELECT id FROM erp_partiya WHERE manba <> 'jonli' ORDER BY id DESC LIMIT ${TOLIQ_SAQLASH})`).run();
  }
  const xizmatTekshir = (cur) => (kod, satr) => {
    try { narxQollash(cur, { xizmatlar: { [kod]: satr } }); return ''; } catch (e) { if (narxXatoMi(e)) return e.message; throw e; }
  };

  r.post('/api/admin/erp/yuklash', guard, himoya((req, res) => {
    const b = obj(req.body), j = b.json;
    if (!j || typeof j !== 'object') throw new Kirish('S3D-ADM-019', 'json: ERP eksporti (obyekt yoki ro\'yxat) kerak');
    let tur = b.tur === undefined || b.tur === '' ? (Array.isArray(j) || j.mahsulotlar ? 'mahsulot' : j.xizmatlar ? 'xizmat' : '') : b.tur;
    if (tur !== 'mahsulot' && tur !== 'xizmat') throw new Kirish('S3D-ADM-019', 'tur: mahsulot yoki xizmat (mahsulotlar / xizmatlar ro\'yxati topilmadi)');
    const faylNom = matn(b.fayl_nom, 'fayl_nom', { max: 120, kod: 'S3D-ADM-019' });
    let farq, meta, rad;
    if (tur === 'mahsulot') {
      const o = erpMahsulotOqi(j);
      if (o.xato) throw new Kirish('S3D-ADM-019', o.xato);
      farq = mahsulotFarq(o.qatorlar, farqKirish(db, katalog()));
      meta = o.meta; rad = o.rad;
    } else {
      const o = erpXizmatOqi(j);
      if (o.xato) throw new Kirish('S3D-ADM-019', o.xato);
      const cur = narxCurrent(db, jurnal);
      farq = xizmatFarq(o, cur, xizmatTekshir(cur));
      meta = o.meta; rad = o.rad;
    }
    farq.xulosa.rad = rad.length;
    farq.xulosa.rad_royxat = rad.slice(0, 10);
    const id = Number(db.prepare('INSERT INTO erp_partiya (user_id, tur, holat, fayl_nom, erp_sana, xulosa_json, farq_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.id, tur, 'qoralama', faylNom, meta.sana || '', JSON.stringify(farq.xulosa), JSON.stringify(farq.qatorlar)).lastInsertRowid);
    tozalash();
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: ERP ${tur} yuklandi (#${id}, ${farq.xulosa.qatorlar} qator) — hech narsa o'zgarmadi` });
    res.status(201).json({ ok: true, id, tur, holat: 'qoralama', fayl_nom: faylNom, erp_sana: meta.sana || '', xulosa: farq.xulosa });
  }));

  /* ═══════════ RO'YXAT ═══════════ */
  const kimlar = () => new Map(db.prepare('SELECT id, COALESCE(NULLIF(name, \'\'), email) AS nom FROM users').all().map(u => [u.id, u.nom]));
  const partiyaKorinish = (p, kim) => ({ id: p.id, tur: p.tur, holat: p.holat, fayl_nom: p.fayl_nom, erp_sana: p.erp_sana, vaqt: p.created_at, qollangan_vaqt: p.qollangan_at, qaytarilgan_vaqt: p.qaytarilgan_at,
    kim: kim.get(p.user_id) || (p.user_id ? '#' + p.user_id : p.manba === 'jonli' ? 'tizim: ERP jonli' : '—'), manba: p.manba || '', xulosa: js(p.xulosa_json) || {}, farq_bor: !!p.farq_json });
  r.get('/api/admin/erp', guard, himoya((req, res) => {
    const qatlam = { plita: 0, furnitura: 0, oxirgi_sana: '', oxirgi_partiya: null };
    for (const x of db.prepare('SELECT tur, COUNT(*) AS n, MAX(sana) AS sana, MAX(partiya_id) AS pid FROM erp_narx GROUP BY tur').all()) {
      qatlam[x.tur] = x.n;
      if (x.sana > qatlam.oxirgi_sana) qatlam.oxirgi_sana = x.sana;
      if (x.pid > (qatlam.oxirgi_partiya || 0)) qatlam.oxirgi_partiya = x.pid;
    }
    const kim = kimlar();
    const partiyalar = db.prepare('SELECT id, user_id, tur, holat, fayl_nom, erp_sana, manba, xulosa_json, farq_json <> \'\' AS farq_bor, created_at, qollangan_at, qaytarilgan_at FROM erp_partiya WHERE manba <> \'jonli\' OR holat = \'qoralama\' ORDER BY id DESC LIMIT 30').all()
      .map(p => partiyaKorinish({ ...p, farq_json: p.farq_bor ? 'x' : '' }, kim));
    res.set('Cache-Control', 'no-store').json({ qatlam, partiyalar });
  }));

  const partiyaOl = (idStr) => {
    const id = /^\d{1,9}$/.test(String(idStr)) ? Number(idStr) : 0;
    return id ? db.prepare('SELECT * FROM erp_partiya WHERE id = ?').get(id) || null : null;
  };
  const son = (v, nom, min, max, bosh) => {
    if (v === undefined) return bosh;
    const n = typeof v === 'string' && /^\d{1,7}$/.test(v) ? Number(v) : NaN;
    if (!Number.isInteger(n) || n < min || n > max) throw new Kirish('S3D-ADM-001', `${nom}: ${min}…${max}`);
    return n;
  };
  r.get('/api/admin/erp/:id', guard, himoya((req, res) => {
    const p = partiyaOl(req.params.id);
    if (!p) return fail(res, 'S3D-ADM-018');
    const guruh = req.query.guruh === undefined ? '' : req.query.guruh, holat = req.query.holat === undefined ? '' : req.query.holat;
    if (guruh !== '' && !KOR_GURUH.includes(guruh)) throw new Kirish('S3D-ADM-001', 'guruh: ' + KOR_GURUH.join(' | '));
    if (holat !== '' && !KOR_HOLAT.includes(holat)) throw new Kirish('S3D-ADM-001', 'holat: ' + KOR_HOLAT.join(' | '));
    const q = req.query.q === undefined ? '' : req.query.q;
    if (typeof q !== 'string' || q.length > 100 || /[\u0000-\u001f]/.test(q)) throw new Kirish('S3D-ADM-001', 'q: 100 belgigacha oddiy matn');
    const limit = son(req.query.limit, 'limit', 1, 200, 50), offset = son(req.query.offset, 'offset', 0, 1e6, 0);
    const hammasi = js(p.farq_json) || [];
    const s = q.trim().toLowerCase();
    const sh = hammasi.filter(x => (!guruh || x.g === guruh) && (holat ? (holat === 'q' ? x.q : x.h === holat) : x.h !== 'yoq')       // "faylda yo'q" qatorlari faqat so'ralganda (holat=yoq)
      && (!s || [x.nom, x.sku, x.katalog_nom, x.k, x.erp_id].some(v => String(v || '').toLowerCase().includes(s))));
    const kim = kimlar();
    res.set('Cache-Control', 'no-store').json({ ...partiyaKorinish(p, kim), jami: sh.length, limit, offset, eskirgan: !p.farq_json,
      items: sh.slice(offset, offset + limit).map(({ satr, ...x }) => x) });   // eslint-disable-line no-unused-vars
  }));

  r.delete('/api/admin/erp/:id', guard, himoya((req, res) => {
    const p = partiyaOl(req.params.id);
    if (!p) return fail(res, 'S3D-ADM-018');
    if (p.holat !== 'qoralama') return fail(res, 'S3D-ADM-020');
    db.transaction(() => {
      if (p.manba === 'jonli' && erpJonli) erpJonli.radEtish((js(p.farq_json) || []).filter(x => x.q));        // jonli qoralama o'chirildi = shu narxlar rad etildi
      db.prepare('DELETE FROM erp_partiya WHERE id = ?').run(p.id);
    })();
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: ERP qoralama #${p.id} o'chirildi` });
    res.json({ ok: true, id: p.id });
  }));

  /* ═══════════ QO'LLASH ═══════════ */
  const layerUpsert = db.prepare(`INSERT INTO erp_narx (tur, kalit, uzs, erp_id, sku, nom, sana, partiya_id, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tur, kalit) DO UPDATE SET uzs = excluded.uzs, erp_id = excluded.erp_id, sku = excluded.sku, nom = excluded.nom, sana = excluded.sana, partiya_id = excluded.partiya_id,
      updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`);
  const layerOl = db.prepare('SELECT uzs, erp_id, sku, nom, sana, partiya_id FROM erp_narx WHERE tur = ? AND kalit = ?');
  const bugun = () => new Date().toISOString().slice(0, 10);

  r.post('/api/admin/erp/:id/qollash', guard, himoya((req, res) => {
    const p = partiyaOl(req.params.id);
    if (!p) return fail(res, 'S3D-ADM-018');
    if (p.holat !== 'qoralama') return fail(res, 'S3D-ADM-020');
    const b = obj(req.body);
    if (b.tasdiq !== true) throw new Kirish('S3D-ADM-021', 'tasdiq: true kerak (qo\'llashni tasdiqlang)');
    const guruhlar = b.guruhlar === undefined ? GURUHLAR : b.guruhlar;
    if (!Array.isArray(guruhlar) || !guruhlar.length || guruhlar.some(g => !GURUHLAR.includes(g))) throw new Kirish('S3D-ADM-021', 'guruhlar: ' + GURUHLAR.join(', '));
    if (b.istisno !== undefined && (!Array.isArray(b.istisno) || b.istisno.length > 20000 || b.istisno.some(x => typeof x !== 'string' || x.length > 100))) throw new Kirish('S3D-ADM-021', 'istisno: matnlar ro\'yxati (20000 gacha)');
    if (b.yangi_xizmat !== undefined && typeof b.yangi_xizmat !== 'boolean') throw new Kirish('S3D-ADM-021', 'yangi_xizmat: ha/yo\'q');
    const istisno = new Set(b.istisno || []);
    const qatorlar = js(p.farq_json) || [];
    const tanlangan = qatorlar.filter(x => x.q && guruhlar.includes(x.g) && !istisno.has(x.g + ':' + x.k) && (x.g !== 'xizmat' || x.h !== 'yangi' || b.yangi_xizmat === true));
    if (!tanlangan.length) throw new Kirish('S3D-ADM-021', 'qo\'llanadigan qator yo\'q');
    const sana = p.erp_sana || bugun();
    const qollandi = { plita: 0, furnitura: 0, xizmat: 0 }, otkazildi = { qolda: 0, katalogda_yoq: 0, chegara: 0 };
    const ozgarish = { plita: [], furnitura: [], xizmat: [] };
    db.transaction(() => {
      const K = katalog(), qolda = qoldaMap(db);
      for (const x of tanlangan) {
        if (x.g === 'xizmat') continue;
        if (!K.kodlar[x.g].has(x.k)) { otkazildi.katalogda_yoq++; continue; }
        if (x.g === 'plita' && qolda.get(x.k) > 0) { otkazildi.qolda++; continue; }                 // qoralamadan keyin admin qo'lda narx qo'ygan — u ustun
        if (!(Number.isInteger(x.yangi) && x.yangi > 0)) { otkazildi.chegara++; continue; }
        const eski = layerOl.get(x.g, x.k) || null;
        layerUpsert.run(x.g, x.k, x.yangi, x.erp_id || '', x.sku || '', x.nom || '', sana, p.id, req.user.id);
        ozgarish[x.g].push({ k: x.k, eski, yangi: x.yangi, nom: x.nom || '' });
        qollandi[x.g]++;
      }
      const xz = tanlangan.filter(x => x.g === 'xizmat');
      if (xz.length) {
        const cur = narxCurrent(db, jurnal), patch = {};
        for (const x of xz) {
          const hozir = cur.xizmatlar[x.k];
          if (hozir && hozir.manba === 'egasi') { otkazildi.qolda++; continue; }                     // admin qo'lda ("egasi") qo'ygan qiymat o'zgarmaydi
          try { narxQollash(cur, { xizmatlar: { [x.k]: x.satr } }); patch[x.k] = x.satr; } catch (e) { if (!narxXatoMi(e)) throw e; otkazildi.chegara++; }
        }
        if (Object.keys(patch).length) {
          const q = narxQollash(cur, { xizmatlar: patch });
          narxSaqla(db, req.user.id, q.next, q.ozgarish, `(ERP sinxron #${p.id})`);
          for (const o of q.ozgarish) if (o.kalit.startsWith('xizmatlar.')) { ozgarish.xizmat.push({ k: o.kalit.slice(10), eski: o.eski, yangi: o.yangi }); qollandi.xizmat++; }
        }
      }
      const jami = qollandi.plita + qollandi.furnitura + qollandi.xizmat;
      if (!jami) throw new Kirish('S3D-ADM-021', 'hech qaysi qator qo\'llanmadi (hammasi o\'tkazib yuborildi)');
      db.prepare("UPDATE erp_partiya SET holat = 'qollandi', qollangan_at = CURRENT_TIMESTAMP, qollagan_by = ?, qollangan_json = ? WHERE id = ?").run(req.user.id, JSON.stringify(ozgarish), p.id);
      yoz(req, 'erp', 'partiya:' + p.id, null, { fayl: p.fayl_nom, erp_sana: p.erp_sana, tur: p.tur, qollandi, otkazildi });
      if (p.manba === 'jonli' && erpJonli) erpJonli.radEtish(qatorlar.filter(x => x.q && !tanlangan.includes(x)));   // jonli qoralamada admin istisno qilganlar — rad etilgan narx
      bump();
    })();
    res.json({ ok: true, id: p.id, qollandi, otkazildi });
  }));

  /* ═══════════ SUKUTGA QAYTARISH (ERP qatlamini olib tashlash) ═══════════ */
  r.post('/api/admin/erp/sukut', guard, himoya((req, res) => {
    const b = obj(req.body);
    if (b.tasdiq !== true) throw new Kirish('S3D-ADM-021', 'tasdiq: true kerak');
    const guruh = b.guruh === undefined ? 'hammasi' : b.guruh;
    if (!['hammasi', 'plita', 'furnitura'].includes(guruh)) throw new Kirish('S3D-ADM-021', 'guruh: hammasi | plita | furnitura');
    const turlar = guruh === 'hammasi' ? ['plita', 'furnitura'] : [guruh];
    const qatorlar = db.prepare(`SELECT * FROM erp_narx WHERE tur IN (${turlar.map(() => '?').join(',')})`).all(...turlar);
    if (!qatorlar.length) return fail(res, 'S3D-ADM-016');
    const ozgarish = { plita: [], furnitura: [], xizmat: [] };
    let id;
    db.transaction(() => {
      id = Number(db.prepare("INSERT INTO erp_partiya (user_id, tur, holat, fayl_nom, qollangan_at, qollagan_by) VALUES (?, 'sukut', 'qollandi', ?, CURRENT_TIMESTAMP, ?)").run(req.user.id, guruh, req.user.id).lastInsertRowid);
      for (const x of qatorlar) ozgarish[x.tur].push({ k: x.kalit, eski: { uzs: x.uzs, erp_id: x.erp_id, sku: x.sku, nom: x.nom, sana: x.sana, partiya_id: x.partiya_id }, yangi: null, nom: x.nom });
      db.prepare(`DELETE FROM erp_narx WHERE tur IN (${turlar.map(() => '?').join(',')})`).run(...turlar);
      db.prepare('UPDATE erp_partiya SET qollangan_json = ?, xulosa_json = ? WHERE id = ?').run(JSON.stringify(ozgarish), JSON.stringify({ olib_tashlandi: { plita: ozgarish.plita.length, furnitura: ozgarish.furnitura.length } }), id);
      yoz(req, 'erp', 'sukut:' + id, { plita: ozgarish.plita.length, furnitura: ozgarish.furnitura.length }, null);
      bump();
    })();
    res.json({ ok: true, id, olib_tashlandi: { plita: ozgarish.plita.length, furnitura: ozgarish.furnitura.length } });
  }));

  /* ═══════════ TARIXDAN QAYTARISH ═══════════ */
  qaytaruvchilar.set('erp', (a, eski, req) => {
    const id = Number((String(a.kalit).split(':')[1]) || 0);
    const p = id ? db.prepare('SELECT * FROM erp_partiya WHERE id = ?').get(id) : null;
    if (!p || !p.qollangan_json || p.holat === 'qaytarilgan') throw new Kirish('S3D-ADM-007', 'bu ERP yozuvini qaytarib bo\'lmaydi');
    const ch = js(p.qollangan_json) || {};
    const qaytdi = { plita: 0, furnitura: 0, xizmat: 0 };
    let otkazildi = 0;
    for (const g of ['plita', 'furnitura']) {
      for (const x of ch[g] || []) {
        const hozir = layerOl.get(g, x.k) || null;
        const mos = x.yangi === null ? hozir === null : !!hozir && hozir.uzs === x.yangi;          // keyin boshqa o'zgargan bo'lsa — tegmaymiz
        if (!mos) { otkazildi++; continue; }
        if (x.eski) layerUpsert.run(g, x.k, x.eski.uzs, x.eski.erp_id || '', x.eski.sku || '', x.eski.nom || '', x.eski.sana || '', x.eski.partiya_id || null, req.user.id);
        else db.prepare('DELETE FROM erp_narx WHERE tur = ? AND kalit = ?').run(g, x.k);
        qaytdi[g]++;
      }
    }
    if ((ch.xizmat || []).length) {
      const cur = narxCurrent(db, jurnal), next = JSON.parse(JSON.stringify(cur)), oz = [];
      for (const x of ch.xizmat) {
        const hozir = next.xizmatlar[x.k] || null;
        const mos = x.yangi === null ? hozir === null : !!hozir && hozir.qiymat === x.yangi.qiymat && hozir.manba === x.yangi.manba;
        if (!mos) { otkazildi++; continue; }
        if (x.eski) next.xizmatlar[x.k] = x.eski; else delete next.xizmatlar[x.k];
        oz.push({ kalit: 'xizmatlar.' + x.k, eski: hozir, yangi: x.eski || null });
        qaytdi.xizmat++;
      }
      if (oz.length) {
        const t = narxQollash(next, {});                                                           // o'chgan xizmatga bog'langan tanlov ham tozalanadi
        narxSaqla(db, req.user.id, t.next, [...oz, ...t.ozgarish], `(ERP #${p.id} qaytarildi)`);
      }
    }
    db.prepare("UPDATE erp_partiya SET holat = 'qaytarilgan', qaytarilgan_at = CURRENT_TIMESTAMP WHERE id = ?").run(p.id);
    if (p.manba === 'jonli' && erpJonli) {                                                         // jonli sinxron qo'llagan narx qaytarildi — ERP'da shu narx turguncha qayta qo'llanmaydi
      erpJonli.radEtish(['plita', 'furnitura'].flatMap(g => (ch[g] || []).map(x => ({ g, k: x.k, nom: x.nom, eski: x.eski && x.eski.uzs, yangi: x.yangi }))), 'qaytarildi');
      erpJonli.radEtish((ch.xizmat || []).filter(x => x.yangi && x.yangi.qiymat > 0).map(x => ({ g: 'xizmat', k: x.k, nom: x.yangi.nom, eski: x.eski && x.eski.qiymat, yangi: x.yangi.qiymat })), 'qaytarildi');
    }
    bump();
    return { qaytarildi: qaytdi, otkazildi };
  });

  return r;
}
