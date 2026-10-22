/* ERP JONLI SINXRON (TZ-44) — fon poller: ERP narxlari har 2 daqiqada (qaynoq to'plam) va har 15 daqiqada (to'liq to'plam) o'qiladi, mavjud quvur
 * (app/js/engine/erpSinxron.js farq mantig'i, erp_narx qatlami, admin_audit, "tasdiq" qoralamasi, qaytarish) orqali qo'llanadi. Dublikat quvur YO'Q.
 *
 * SOZLAMA — faqat muhit o'zgaruvchilari (repoga YOZILMAYDI; yo'q bo'lsa — jonli sinxron O'CHIQ, xato emas):
 *   ERP_JONLI=1   ERP_URL (sukut https://mebelcity.bittada.uz)   ERP_LOGIN   ERP_PASSWORD
 *   Login va parol FAQAT process.env dan o'qiladi; jurnalga, xato matniga, API javobiga, bazaga, faylga HECH QACHON chiqmaydi (maxfiy.js ham tozalaydi).
 *
 * ERP'GA MUNOSABAT: faqat GET (yagona istisno — Django login formasi POST /login/); User-Agent "Smart3D-sync"; taym-aut; yo'naltirishga ergashmaydi
 * (kuki faqat ERP_URL manziliga ketadi); sessiya tugasa (login sahifasiga yo'naltirish / 401 / HTML) — qayta kirish; xatoda eksponensial kechikish
 * (2 → 4 → 8 … 15 daqiqa); bir vaqtda faqat bitta aylanish. ERP o'chsa — oxirgi yaxshi narxlar (erp_narx) qoladi, hech narsa o'chmaydi.
 *
 * ERP YUKI (19 924 mahsulot, sahifa 50 ta; `category=` ishlaydi, `updated_after` ishlamaydi):
 *   qaynoq aylanish (2 daqiqa): xizmatlar (≈5 sahifa) + qaynoq to'plam (Asosiy 100 plitalari, sukut ERP plitalari, bog'langan furnitura) joylashgan
 *     kategoriyalar, eng ko'pi ~60 so'rov, so'rovlar orasida ≥ 0,5 s; byudjetdan oshsa kategoriyalar navbat bilan (eng eskisi birinchi) o'qiladi;
 *   to'liq aylanish (15 daqiqa): ilova katalogi joylashgan HAMMA kategoriyalar (barcha 19 924 mahsulot emas), ≤ 1 so'rov/soniya; kashf qilinmagan
 *     kategoriyalar har aylanishda ≤ 120 so'rov bilan asta-sekin o'rganiladi (qaysi kategoriyada katalog mahsuloti bor); bizniki bo'lmagani 7 kunda bir.
 *
 * QO'LLASH QOIDASI (har qator uchun, mavjud farq holatidan keyin):
 *   narx ±chegara (sukut 30%) ichida o'zgardi → AVTOMATIK qo'llanadi (erp_narx + admin_audit "tizim: ERP jonli" + qaytarish);
 *   > chegara, katalogda narx yo'q edi (birinchi narx), ERP kursi > 10% sakradi → QO'LLANMAYDI: "tasdiq kutadi" qoralamasiga (erp_partiya, manba 'jonli')
 *     tushadi — admin uni mavjud ERP tasdiq oqimi bilan qo'llaydi yoki o'chiradi (o'chirilsa — shu narx qayta taklif qilinmaydi);
 *   ERP'da narx 0/yo'q/manfiy, noaniq moslik (bir nechta mos, SKU farqi, takror) → qo'llanmaydi (narx yo'q bo'lsa mavjud narx qoladi);
 *   admin qo'lda narxi (mat_narx) ustun; admin qaytargan narx shu ERP narxi turguncha qayta qo'llanmaydi. */
import { erpMahsulotOqi, mahsulotFarq, erpXizmatOqi, xizmatFarq, xulosaHisobla } from '../../app/js/engine/erpSinxron.js';
import { narxQollash, narxXatoMi } from '../../app/js/engine/narxStavka.js';
import { narxCurrent, narxSaqla } from './narx-hujjat.js';
import { erpKatalog, farqKirish, qaynoqKalitlar, katCatXarita, katNomNorm, sukutErpOl, qatlamMap, qoldaMap } from './erp-katalog.js';
import { maxfiyTozala } from './maxfiy.js';

/* ── xato kodlari (app/js/xatolar.js) ── */
export const KOD = Object.freeze({
  OCHIQ: 'S3D-ERP-001', KIRISH: 'S3D-ERP-002', TARMOQ: 'S3D-ERP-003', JAVOB: 'S3D-ERP-004', BAND: 'S3D-ERP-005',
  PAUZA: 'S3D-ERP-006', TEZ: 'S3D-ERP-007', SOZLAMA: 'S3D-ERP-008'
});
export class ErpXato extends Error {
  /** yengil — bitta manba (kategoriya/xizmat) o'qilmadi, aylanish davom etadi; aks holda aylanish to'xtaydi va kechikish boshlanadi */
  constructor(kod, matn, { yengil = false } = {}) { super(matn); this.kod = kod; this.yengil = yengil; }
}

export const SUKUT = Object.freeze({
  qaynoqMs: 120_000, toliqMs: 900_000, taymAutMs: 15_000, qaynoqOraliqMs: 500, toliqOraliqMs: 1000,
  qaynoqButget: 55, toliqButget: 600, kashfButget: 40, kashfQaytaKun: 7, katRoyxatMs: 6 * 3600_000, katRoyxatMaxSahifa: 80, bolakSorov: 80, maksSahifa: 400,
  boshKechikishMs: 3000, orqaBoshiMs: 120_000, orqaMaxMs: 900_000, hozirOraliqMs: 30_000, eskiDaqiqa: 10,
  chegaraFoiz: 30, kursChegaraFoiz: 10, kutishMaxMs: 25_000, tarixSaqlash: 2000, qoralamaMax: 500, partiyaKun: 90
});

const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };
const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const bugun = () => new Date().toISOString().slice(0, 10);
const uxla = (ms, signal) => new Promise((resolve) => {
  if (ms <= 0) return resolve();
  const t = setTimeout(resolve, ms); t.unref();
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
});

/* ═══════════ sof yordamchilar (alohida sinaladi) ═══════════ */

/** Django login sahifasi → forma: { amal, yashirin:[[nom, qiymat]], loginNom, parolNom } yoki null. Maydon nomlari sahifadan o'qiladi (username/login/email farqi). */
export function loginFormaOqi(html) {
  if (typeof html !== 'string' || !html) return null;
  const attr = (tag) => {
    const a = {};
    for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/g)) a[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[2];
    return a;
  };
  const formlar = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map(m => m[0]);
  const forma = formlar.find(f => /type\s*=\s*["']?password/i.test(f)) || (/type\s*=\s*["']?password/i.test(html) ? html : null);
  if (!forma) return null;
  const amalTag = /^<form\b[^>]*>/i.exec(forma);
  const amal = amalTag ? (attr(amalTag[0]).action || '') : '';
  const yashirin = [];
  let loginNom = '', parolNom = '';
  for (const m of forma.matchAll(/<input\b[^>]*>/gi)) {
    const a = attr(m[0]), tur = (a.type || 'text').toLowerCase();
    if (!a.name) continue;
    if (tur === 'hidden') yashirin.push([a.name, a.value || '']);
    else if (tur === 'password') { if (!parolNom) parolNom = a.name; }
    else if ((tur === 'text' || tur === 'email') && !loginNom) loginNom = a.name;
  }
  return loginNom && parolNom ? { amal, yashirin, loginNom, parolNom } : null;
}

const son0 = (v) => (v == null || v === '' ? 0 : Number(String(v).replace(/\s/g, '').replace(',', '.')));
/** ERP mahsulot qatori → erpSinxron.erpMahsulotOqi kirish shakli (+ yon ma'lumot). null — o'tkazib yuboriladi (nofaol, obyekt emas).
 *  So'm narxi: display_price_uzs (mavjud qoida), bo'lmasa price; ikkalasi ham yo'q, dollar bor — dollar × ERP'ning o'z kursi. */
export function erpQatorNormal(r, kurs = 0) {
  if (!obj(r) || r.is_active === false) return null;
  const dp = son0(r.display_price_uzs), p = son0(r.price), usd = son0(r.display_price_usd) || son0(r.price_usd), lst = son0(r.price_list_uzs);
  const buzuq = [dp, p, usd, lst].some(x => !Number.isFinite(x) || x < 0);
  const uzs = buzuq ? -1 : dp > 0 ? dp : p > 0 ? p : usd > 0 && kurs > 0 ? Math.round(usd * kurs) : 0;
  const q = r.total_stock !== undefined ? r.total_stock : r.qoldiq;
  const kat = r.category !== undefined && r.category !== null ? (obj(r.category) ? r.category.id : r.category) : r.category_id;
  return {
    qator: { id: r.id, sku: r.sku, name: r.name, category_name: r.category_name, unit: r.unit, display_price_uzs: uzs, price_list_uzs: lst || null,
      display_price_usd: buzuq ? 0 : usd, qoldiq: typeof q === 'number' ? q : undefined },
    yon: { kat: kat == null ? '' : String(kat), price: son0(r.price), usd: son0(r.price_usd) || son0(r.display_price_usd), sana: String(r.last_synced_at || r.updated_at || '') }
  };
}

/** so'm/dollar kursi: price / price_usd nisbatlarining medianasi (kamida 3 ta mahsulotdan); aks holda 0 */
export function kursMediana(yonlar) {
  const n = [];
  for (const y of yonlar) if (y.price > 0 && y.usd > 0) n.push(y.price / y.usd);
  if (n.length < 3) return 0;
  n.sort((a, b) => a - b);
  const m = n.length >> 1;
  return Math.round((n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2) * 100) / 100;
}

/** bitta o'zgargan qator uchun qaror: avtomatik qo'llash yoki tasdiq kutish (sabab bilan). x — erpSinxron farq qatori (h: ozgardi | toldirildi) */
export function qaror(x, { chegara = SUKUT.chegaraFoiz, kursSakradi = false } = {}) {
  if (x.h === 'toldirildi') return { amal: 'kutadi', sabab: 'birinchi_narx' };
  if (x.h !== 'ozgardi') return { amal: 'yoq' };
  if (kursSakradi) return { amal: 'kutadi', sabab: 'kurs_sakradi' };
  if (!(x.yangi > 0)) return { amal: 'kutadi', sabab: 'narx_yoq' };
  if (x.foiz === null || Math.abs(x.foiz) > chegara) return { amal: 'kutadi', sabab: 'katta_ozgarish' };
  return { amal: 'qollash' };
}

const royxatOl = (j) => {
  if (Array.isArray(j)) return j;
  if (obj(j)) for (const k of ['results', 'items', 'data', 'categories', 'services']) if (Array.isArray(j[k])) return j[k];
  return null;
};

/* ═══════════ ERP mijozi (faqat GET; login — Django forma) ═══════════ */
class ErpMijoz {
  constructor({ baseUrl, login, parol, fetchImpl, taymAutMs, signal, oraliqMs, sanagich }) {
    this.base = new URL(baseUrl);
    this.login = login; this.parol = parol;
    this.fetchImpl = fetchImpl; this.taymAutMs = taymAutMs; this.signal = signal;
    this.oraliqMs = oraliqMs; this.sanagich = sanagich;
    this.kukilar = new Map(); this.kirdi = false; this.oxirgi = 0; this.qaytaKirish = 0;
  }
  /** parolni hech qachon chiqarmaydi (JSON.stringify / console.log) */
  toJSON() { return { erp: this.base.origin }; }
  [Symbol.for('nodejs.util.inspect.custom')]() { return `ErpMijoz(${this.base.origin})`; }

  cookie() { return [...this.kukilar].map(([k, v]) => `${k}=${v}`).join('; '); }
  kukiOl(res) {
    const l = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const c of l) {
      const [juft, ...qolgan] = c.split(';');
      const i = juft.indexOf('=');
      if (i < 1) continue;
      const nom = juft.slice(0, i).trim(), qiymat = juft.slice(i + 1).trim();
      const eskirgan = qolgan.some(p => /^\s*max-age\s*=\s*0\s*$/i.test(p));
      if (!qiymat || eskirgan) this.kukilar.delete(nom); else this.kukilar.set(nom, qiymat);
    }
  }
  async matn(res) {
    const b = Buffer.from(await res.arrayBuffer());
    if (b.length > 8 * 1024 * 1024) throw new ErpXato(KOD.JAVOB, 'ERP javobi juda katta', { yengil: true });
    return b.toString('utf8');
  }
  async tezlik() {
    const kut = this.oraliqMs - (Date.now() - this.oxirgi);
    if (kut > 0) await uxla(kut, this.signal);
    this.oxirgi = Date.now();
  }
  async so(method, yol, { headers = {}, body } = {}) {
    if (this.signal && this.signal.aborted) throw new ErpXato(KOD.TARMOQ, "sinxron to'xtatildi");
    const url = new URL(yol, this.base);
    if (url.origin !== this.base.origin) throw new ErpXato(KOD.JAVOB, 'manzil boshqa serverga ishora qiladi', { yengil: true });
    await this.tezlik();
    this.sanagich();
    const signals = [AbortSignal.timeout(this.taymAutMs)];
    if (this.signal) signals.push(this.signal);
    const h = { 'User-Agent': 'Smart3D-sync', ...headers };
    const ck = this.cookie();
    if (ck) h.Cookie = ck;
    let res;
    try {
      res = await this.fetchImpl(url, { method, redirect: 'manual', headers: h, body, signal: AbortSignal.any(signals) });
    } catch (e) {
      const sabab = this.signal && this.signal.aborted ? "to'xtatildi" : (e && e.cause && e.cause.code) || (e && e.name) || 'xato';
      throw new ErpXato(KOD.TARMOQ, 'ERP bilan aloqa yo\'q (' + String(sabab).slice(0, 40) + ')');
    }
    this.kukiOl(res);
    return res;
  }
  async kirish() {
    this.kirdi = false; this.kukilar.clear();
    const r1 = await this.so('GET', '/login/', { headers: { Accept: 'text/html' } });
    const html = await this.matn(r1);
    if (r1.status >= 500 || r1.status === 429) throw new ErpXato(KOD.TARMOQ, `ERP login sahifasi: HTTP ${r1.status}`);
    const forma = r1.status === 200 ? loginFormaOqi(html) : null;
    if (!forma) throw new ErpXato(KOD.KIRISH, `ERP login sahifasi tushunarsiz (HTTP ${r1.status})`);
    const b = new URLSearchParams();
    for (const [k, v] of forma.yashirin) b.set(k, v);
    b.set(forma.loginNom, this.login); b.set(forma.parolNom, this.parol);
    const amal = forma.amal && !/^[a-z][a-z0-9+.-]*:/i.test(forma.amal) ? forma.amal : '/login/';     // faqat shu ERP ichidagi yo'l
    const r2 = await this.so('POST', amal, { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: new URL('/login/', this.base).href, Origin: this.base.origin }, body: b.toString() });
    await this.matn(r2);
    if (r2.status >= 300 && r2.status < 400) {
      if (/\/login\b/i.test(r2.headers.get('location') || '')) throw new ErpXato(KOD.KIRISH, 'ERP login yoki parolni rad etdi');
      this.kirdi = true; return;
    }
    if (r2.status >= 500 || r2.status === 429) throw new ErpXato(KOD.TARMOQ, `ERP login: HTTP ${r2.status}`);
    throw new ErpXato(KOD.KIRISH, r2.status === 200 ? 'ERP login yoki parolni rad etdi' : `ERP login: HTTP ${r2.status}`);
  }
  /** autentifikatsiyalangan GET → JSON. Sessiya tugasa — bir marta qayta kiradi */
  async json(yol) {
    for (let i = 0; i < 2; i++) {
      if (!this.kirdi) await this.kirish();
      const res = await this.so('GET', yol, { headers: { Accept: 'application/json' } });
      const st = res.status, text = await this.matn(res);
      const qayta = () => {
        this.kirdi = false;
        if (i === 0 && this.qaytaKirish++ < 3) return true;
        throw new ErpXato(KOD.KIRISH, "ERP sessiyasi tugadi, qayta kirib bo'lmadi");
      };
      if (st >= 300 && st < 400) {
        if (/login/i.test(res.headers.get('location') || '')) { qayta(); continue; }
        throw new ErpXato(KOD.JAVOB, `ERP: HTTP ${st} (yo'naltirish)`, { yengil: true });
      }
      if (st === 401 || st === 403) { qayta(); continue; }
      if (st === 429 || st >= 500) throw new ErpXato(KOD.TARMOQ, `ERP xatosi: HTTP ${st}`);
      if (st < 200 || st >= 300) throw new ErpXato(KOD.JAVOB, `ERP: HTTP ${st}`, { yengil: true });
      if (/html/i.test(res.headers.get('content-type') || '')) { qayta(); continue; }
      const j = js(text);
      if (j === null) throw new ErpXato(KOD.JAVOB, 'ERP javobi JSON emas', { yengil: true });
      return j;
    }
    throw new ErpXato(KOD.KIRISH, 'ERP sessiyasi tugadi');
  }
  /** sahifalangan ro'yxat (ERP sahifa hajmi 50, oshmaydi): birinchi so'rov ?page=1; keyingisi — javobdagi `next` ning FAQAT so'rov qatori (page / offset / cursor)
   *  bizning yo'limizga qo'shiladi: `next` ko'rsatgan boshqa manzilga (host, yo'l) HECH QACHON ergashilmaydi. → { qatorlar, jami, sahifa, toliq } */
  async royxat(yol, params = {}, maks = SUKUT.maksSahifa) {
    const out = []; let sahifa = 0, jami = null, oldingi = null, toliq = true, qs = new URLSearchParams({ ...params, page: '1' });
    for (;;) {
      if (sahifa >= maks) { toliq = false; break; }
      sahifa++;
      const j = await this.json(`${yol}?${qs}`);
      const arr = royxatOl(j);
      if (!arr) throw new ErpXato(KOD.JAVOB, "ERP javobida ro'yxat yo'q", { yengil: true });
      if (jami === null && obj(j) && Number.isFinite(Number(j.count))) jami = Number(j.count);
      const bosh = arr.length && obj(arr[0]) ? String(arr[0].id ?? '') : '';
      if (sahifa > 1 && bosh && bosh === oldingi) break;                    // ERP `page` ni e'tiborsiz qoldirdi — takror
      oldingi = bosh;
      out.push(...arr);
      if (!arr.length || Array.isArray(j)) break;
      if (j.next === null) break;
      if (typeof j.next === 'string' && j.next) {
        let nq = null;
        try { nq = new URL(j.next, this.base).searchParams; } catch (_) { /* yaroqsiz manzil — o'z sahifa raqamimiz */ }
        qs = nq && [...nq.keys()].length ? new URLSearchParams(nq) : new URLSearchParams({ ...params, page: String(sahifa + 1) });
        for (const [k, v] of Object.entries(params)) if (!qs.has(k)) qs.set(k, v);          // filtr (category) yo'qolmasin
      } else if (j.next === undefined && jami !== null && out.length < jami) qs = new URLSearchParams({ ...params, page: String(sahifa + 1) });
      else break;
    }
    return { qatorlar: out, jami, sahifa, toliq };
  }
}

/* ═══════════ asosiy ═══════════ */

/** createErpJonli({ db, jurnal, env, fetchImpl, katalog, sozlama })
 *  katalog — { ol() → erpKatalog() shakli, qaynoq(db) → { plita:Set, furnitura:Set } } (sinov uchun); sozlama — SUKUT ustiga (sinov uchun qisqa vaqtlar). */
export function erpJonliYarat({ db, jurnal, env = process.env, fetchImpl = globalThis.fetch, katalog, sozlama = {} }) {
  /* ERP_SINOV_REJIM=1 — FAQAT sinov (NODE_ENV=production da e'tiborsiz): qisqa vaqtlar, shunda spawn qilingan sinov serveri sekin kutmaydi */
  const sinov = env.ERP_SINOV_REJIM === '1' && env.NODE_ENV !== 'production';
  const S = { ...SUKUT, ...(sinov ? { boshKechikishMs: 300, hozirOraliqMs: 1500, qaynoqOraliqMs: 0, toliqOraliqMs: 0, taymAutMs: 5000 } : {}), ...sozlama };
  const katOl = katalog && katalog.ol ? katalog.ol : erpKatalog;
  const qaynoqOl = katalog && katalog.qaynoq ? katalog.qaynoq : (d, k) => qaynoqKalitlar(d, k);
  const sukutOl = katalog && katalog.sukut ? katalog.sukut : sukutErpOl;           // sukut plitalar (materials.json sukut_erp): kod → { erp_id, sku, nom, fayl }

  /* — sozlama (faqat muhitdan) — */
  const login = typeof env.ERP_LOGIN === 'string' ? env.ERP_LOGIN : '';
  const parol = typeof env.ERP_PASSWORD === 'string' ? env.ERP_PASSWORD : '';
  const yoqilganEnv = env.ERP_JONLI === '1' || env.ERP_JONLI === 'true';
  let baseUrl = (env.ERP_URL || 'https://mebelcity.bittada.uz').trim();
  let urlYaroqsiz = false;
  try { const u = new URL(baseUrl); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protokol'); baseUrl = u.origin; } catch (_) { urlYaroqsiz = true; }
  const sabab = !yoqilganEnv ? 'ochirilgan' : (!login || !parol) ? 'env_yoq' : urlYaroqsiz ? 'url_yaroqsiz' : '';
  const yoqilgan = sabab === '';
  const erpManzil = yoqilgan ? baseUrl : '';

  /* — holat (baza: erp_jonli_holat) — */
  const kvOl = db.prepare('SELECT qiymat FROM erp_jonli_holat WHERE kalit = ?');
  const kvYoz = db.prepare(`INSERT INTO erp_jonli_holat (kalit, qiymat, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(kalit) DO UPDATE SET qiymat = excluded.qiymat, updated_at = CURRENT_TIMESTAMP`);
  const kv = (k, bosh = '') => { const r = kvOl.get(k); return r ? r.qiymat : bosh; };
  const kvSon = (k, bosh = 0) => { const s = kv(k, ''); const n = Number(s); return s !== '' && Number.isFinite(n) ? n : bosh; };
  const kvJs = (k) => js(kv(k, ''));
  const set = (k, v) => kvYoz.run(k, typeof v === 'string' ? v : JSON.stringify(v));
  const chegaraOl = () => { const n = kvSon('chegara_foiz', S.chegaraFoiz); return n >= 5 && n <= 100 ? n : S.chegaraFoiz; };
  const pauzaOl = () => kv('pauza', '0') === '1';

  const boshlangan = Date.now();
  let band = false, taymer = null, ishlayapti = false, abort = new AbortController(), mijoz = null, hozirgiAylanish = null;
  let qaynoqDue = 0, toliqDue = 0, keyingiUrinish = 0, oxirgiHozir = 0;
  let sorovSoni = 0;
  const ssb = { qaynoq: null, toliq: null };

  const versiyaOshir = () => {
    const v = kvSon('versiya', 0) + 1;
    set('versiya', String(v)); set('yangilangan', new Date().toISOString());
    return v;
  };

  /* ═══ ommaviy javob (GET /api/erp-narx) ═══ */
  let narxKesh = { imzo: '', plita: {}, furnitura: {}, sukut: {}, sana: '' };
  function narxlar() {
    const imzo = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(uzs), 0) AS s, COALESCE(MAX(updated_at), '') AS m, COALESCE(MAX(sana), '') AS d FROM erp_narx WHERE uzs > 0").get();
    const kalit = `${kvSon('versiya', 0)}|${imzo.n}|${imzo.s}|${imzo.m}|${imzo.d}`;
    if (narxKesh.imzo !== kalit) {
      const plita = {}, furnitura = {}, sukut = {};
      for (const x of db.prepare('SELECT tur, kalit, uzs FROM erp_narx WHERE uzs > 0').all()) (x.tur === 'plita' ? plita : x.tur === 'sukut' ? sukut : furnitura)[x.kalit] = x.uzs;
      narxKesh = { imzo: kalit, plita, furnitura, sukut, sana: imzo.d };
    }
    return narxKesh;
  }
  const eskiMi = () => {
    if (!yoqilgan) return false;
    const o = Date.parse(kv('oxirgi_muvaffaqiyat', ''));
    return Date.now() - (Number.isFinite(o) ? o : boshlangan) > S.eskiDaqiqa * 60_000;
  };
  const jonliKorinish = () => ({
    yoqilgan, pauza: pauzaOl(), oxirgi_muvaffaqiyat: kv('oxirgi_muvaffaqiyat', '') || null, manba_sana: kv('manba_sana', '') || null,
    xato_soni: kvSon('xato_soni', 0), xato_kodi: kvSon('xato_soni', 0) > 0 ? ((kvJs('oxirgi_xato') || {}).kod || '') : '',
    kurs: kvSon('kurs', 0) || null, eski: eskiMi()
  });
  /** ETag: narxlar + versiya + jonli holatning QO'POL ko'rinishi (oxirgi muvaffaqiyat 5 daqiqalik bo'lak bilan) — har 2 daqiqada o'zgarmaydi, shuning uchun 304 ishlaydi */
  function ommaviyEtag() {
    const n = narxlar(), j = jonliKorinish();
    const o = Date.parse(j.oxirgi_muvaffaqiyat || '');
    const imzo = [n.imzo, j.yoqilgan, j.pauza, j.eski, Number.isFinite(o) ? Math.floor(o / 300_000) : 0, j.xato_soni, j.kurs, j.manba_sana].join('~');
    let h = 0x811c9dc5;
    for (let i = 0; i < imzo.length; i++) { h ^= imzo.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return `W/"${kvSon('versiya', 0)}-${h.toString(36)}"`;
  }
  /** /api/erp-narx sarlavhalari uchun arzon o'qish (holat() ning og'ir qismisiz) */
  const sarlavha = () => ({ versiya: kvSon('versiya', 0), oxirgi: kv('oxirgi_muvaffaqiyat', '') });
  function ommaviy() {
    const n = narxlar();
    return { plita: n.plita, furnitura: n.furnitura, sukut: n.sukut, sana: n.sana, versiya: kvSon('versiya', 0), yangilangan: kv('yangilangan', '') || null, jonli: jonliKorinish() };
  }

  /* ═══ yozuvlar ═══ */
  const obyektOl = db.prepare('SELECT * FROM erp_jonli_obyekt WHERE tur = ? AND kalit = ?');
  const obyektYoz = db.prepare(`INSERT INTO erp_jonli_obyekt (tur, kalit, kat_id, kat_nom, erp_id, sku, uzs, usd, erp_sana, korilgan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tur, kalit) DO UPDATE SET kat_id = CASE WHEN excluded.kat_id <> '' THEN excluded.kat_id ELSE erp_jonli_obyekt.kat_id END,
      kat_nom = CASE WHEN excluded.kat_id <> '' THEN excluded.kat_nom ELSE erp_jonli_obyekt.kat_nom END,
      erp_id = excluded.erp_id, sku = excluded.sku, uzs = excluded.uzs, usd = excluded.usd, erp_sana = excluded.erp_sana, korilgan = CURRENT_TIMESTAMP,
      rad_uzs = CASE WHEN excluded.uzs = erp_jonli_obyekt.rad_uzs THEN erp_jonli_obyekt.rad_uzs ELSE 0 END`);
  const radYoz = db.prepare(`INSERT INTO erp_jonli_obyekt (tur, kalit, rad_uzs, korilgan) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tur, kalit) DO UPDATE SET rad_uzs = excluded.rad_uzs`);
  const tarixYoz = db.prepare('INSERT INTO erp_jonli_tarix (tur, kalit, nom, eski, yangi, foiz, harakat, sabab, partiya_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const layerOl = db.prepare('SELECT uzs, erp_id, sku, nom, sana, partiya_id FROM erp_narx WHERE tur = ? AND kalit = ?');
  const layerYoz = db.prepare(`INSERT INTO erp_narx (tur, kalit, uzs, erp_id, sku, nom, sana, partiya_id, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)
    ON CONFLICT(tur, kalit) DO UPDATE SET uzs = excluded.uzs, erp_id = excluded.erp_id, sku = excluded.sku, nom = excluded.nom, sana = excluded.sana, partiya_id = excluded.partiya_id,
      updated_by = NULL, updated_at = CURRENT_TIMESTAMP`);
  const katYoz = db.prepare(`INSERT INTO erp_jonli_kat (kat_id, nom, mos, jami, sahifa, skan_at, qaynoq_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(kat_id) DO UPDATE SET nom = excluded.nom, mos = excluded.mos, jami = excluded.jami, sahifa = excluded.sahifa, skan_at = CURRENT_TIMESTAMP,
      qaynoq_at = COALESCE(excluded.qaynoq_at, erp_jonli_kat.qaynoq_at)`);
  const katMos = db.prepare('UPDATE erp_jonli_kat SET mos = ? WHERE kat_id = ?');

  /* ── tasdiq kutayotgan qoralama (erp_partiya, manba 'jonli') ── */
  const qoralamaOl = () => db.prepare("SELECT * FROM erp_partiya WHERE manba = 'jonli' AND holat = 'qoralama' ORDER BY id DESC LIMIT 1").get() || null;
  const sort = (a, b) => (b.q ? 1 : 0) - (a.q ? 1 : 0) || Math.abs(b.foiz || 0) - Math.abs(a.foiz || 0) || String(a.g + a.nom).localeCompare(String(b.g + b.nom));
  /** baholangan kalitlar uchun qoralamani yangilaydi: baholanmaganlari qoladi, baholanganlari — yangi natija bilan almashadi. → { partiyaId, yangiKutadi } */
  function qoralamaYangila(baholangan, qatorlar, sana) {
    const d = qoralamaOl();
    const eski = d ? (js(d.farq_json) || []) : [];
    const eskiXarita = new Map(eski.map(x => [x.g + ':' + x.k, x]));
    const saqla = eski.filter(x => !baholangan.has(x.g + ':' + x.k));
    let hammasi = [...saqla, ...qatorlar].sort(sort);
    if (hammasi.length > S.qoralamaMax) hammasi = hammasi.slice(0, S.qoralamaMax);
    if (!hammasi.length) { if (d) db.prepare('DELETE FROM erp_partiya WHERE id = ?').run(d.id); return { partiyaId: null, yangi: [] }; }
    const sababSoni = {};
    for (const x of hammasi) if (x.sabab) sababSoni[x.sabab] = (sababSoni[x.sabab] || 0) + 1;
    const xulosa = xulosaHisobla(hammasi, { qatorlar: hammasi.length, jonli: true, sabab: sababSoni });
    let id;
    if (d) {
      const yangiJson = JSON.stringify(hammasi);
      if (yangiJson !== d.farq_json) db.prepare('UPDATE erp_partiya SET farq_json = ?, xulosa_json = ?, erp_sana = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(yangiJson, JSON.stringify(xulosa), sana, d.id);
      id = d.id;
    } else {
      id = Number(db.prepare("INSERT INTO erp_partiya (user_id, tur, holat, fayl_nom, erp_sana, xulosa_json, farq_json, manba) VALUES (NULL, 'mahsulot', 'qoralama', 'ERP jonli — tasdiq kutadi', ?, ?, ?, 'jonli')")
        .run(sana, JSON.stringify(xulosa), JSON.stringify(hammasi)).lastInsertRowid);
    }
    const yangi = qatorlar.filter(x => x.q).filter(x => { const e = eskiXarita.get(x.g + ':' + x.k); return !e || e.yangi !== x.yangi; });
    return { partiyaId: id, yangi };
  }

  /* ── avtomatik qo'llash: erp_narx + (xizmat bo'lsa) narx hujjati + partiya + admin_audit + tarix + versiya — BITTA tranzaksiyada ── */
  function avtoQollash(royxat, sana, tur) {
    const ozgarish = { plita: [], furnitura: [], xizmat: [], sukut: [] }, otkazildi = { qolda: 0, katalogda_yoq: 0, chegara: 0 };
    const id = Number(db.prepare("INSERT INTO erp_partiya (user_id, tur, holat, fayl_nom, erp_sana, qollangan_at, manba) VALUES (NULL, 'jonli', 'qollandi', ?, ?, CURRENT_TIMESTAMP, 'jonli')")
      .run(`ERP jonli (${tur})`, sana).lastInsertRowid);
    for (const x of royxat) {
      if (x.g === 'xizmat') continue;
      const eski = layerOl.get(x.g, x.k) || null;
      if (!(Number.isInteger(x.yangi) && x.yangi > 0)) { otkazildi.chegara++; continue; }
      layerYoz.run(x.g, x.k, x.yangi, x.erp_id || '', x.sku || '', x.nom || '', sana, id);
      ozgarish[x.g].push({ k: x.k, eski, yangi: x.yangi, nom: x.nom || '' });
    }
    const xz = royxat.filter(x => x.g === 'xizmat');
    if (xz.length) {
      const cur = narxCurrent(db, jurnal), patch = {};
      for (const x of xz) {
        const hozir = cur.xizmatlar[x.k];
        if (hozir && hozir.manba === 'egasi') { otkazildi.qolda++; continue; }
        try { narxQollash(cur, { xizmatlar: { [x.k]: x.satr } }); patch[x.k] = x.satr; } catch (e) { if (!narxXatoMi(e)) throw e; otkazildi.chegara++; }
      }
      if (Object.keys(patch).length) {
        const q = narxQollash(cur, { xizmatlar: patch });
        narxSaqla(db, null, q.next, q.ozgarish, `(ERP jonli #${id})`);
        for (const o of q.ozgarish) if (o.kalit.startsWith('xizmatlar.')) ozgarish.xizmat.push({ k: o.kalit.slice(10), eski: o.eski, yangi: o.yangi, nom: (o.yangi && o.yangi.nom) || '' });
      }
    }
    const qollandi = { plita: ozgarish.plita.length, furnitura: ozgarish.furnitura.length, xizmat: ozgarish.xizmat.length, sukut: ozgarish.sukut.length };
    const jami = qollandi.plita + qollandi.furnitura + qollandi.xizmat + qollandi.sukut;
    if (!jami) { db.prepare('DELETE FROM erp_partiya WHERE id = ?').run(id); return { id: null, qollandi, otkazildi }; }
    db.prepare("UPDATE erp_partiya SET qollangan_json = ?, xulosa_json = ? WHERE id = ?").run(JSON.stringify(ozgarish), JSON.stringify({ qollandi, otkazildi, tur }), id);
    db.prepare('INSERT INTO admin_audit (user_id, bolim, kalit, eski, yangi) VALUES (NULL, ?, ?, NULL, ?)')
      .run('erp', 'partiya:' + id, JSON.stringify({ fayl: 'ERP jonli', tur: 'jonli', manba: 'tizim: ERP jonli', erp_sana: sana, qollandi, otkazildi }));
    for (const x of royxat) {
      const q = (x.g === 'xizmat' ? ozgarish.xizmat : ozgarish[x.g]).find(y => y.k === x.k);
      if (q) tarixYoz.run(x.g, x.k, x.nom || '', x.eski ?? null, x.yangi ?? null, x.foiz ?? null, 'qollandi', '', id);
    }
    versiyaOshir();
    jurnal.info({ code: 'S3D-ADM-100', msg: `ERP jonli: ${jami} narx qo'llandi (plita ${qollandi.plita}, furnitura ${qollandi.furnitura}, xizmat ${qollandi.xizmat}, sukut ${qollandi.sukut}; partiya #${id})` });
    return { id, qollandi, otkazildi };
  }

  /* ═══ qatorlarni baholash (mahsulotlar va xizmatlar umumiy yakuni) ═══ */
  function yakunlash({ avto, kutadi, info, baholangan, sana, tur, st }) {
    const tx = db.transaction(() => {
      const ql = avto.length ? avtoQollash(avto, sana, tur) : { id: null, qollandi: { plita: 0, furnitura: 0, xizmat: 0, sukut: 0 } };
      st.qollandi += ql.qollandi.plita + ql.qollandi.furnitura + ql.qollandi.xizmat + ql.qollandi.sukut;
      const rows = [...kutadi, ...info];
      const yq = qoralamaYangila(baholangan, rows, sana);
      st.kutadi += kutadi.length;
      for (const x of yq.yangi) tarixYoz.run(x.g, x.k, x.nom || '', x.eski ?? null, x.yangi ?? null, x.foiz ?? null, 'kutadi', x.sabab || '', yq.partiyaId);
      return yq.partiyaId;
    });
    return tx();
  }

  /** ERP mahsulot qatorlari (xom) → baholash va qo'llash. kat — { id, nom } xaritasi: xom qator → kategoriya */
  function mahsulotIshlov(xomlar, tur, st, kurs) {
    const yon = new Map(), qatorlar = [];
    for (const r of xomlar) {
      const n = erpQatorNormal(r, kurs);
      if (!n) continue;
      n.yon.kat = r.__kat || n.yon.kat; n.yon.katNom = r.__katNom || '';
      qatorlar.push(n.qator); yon.set(String(n.qator.id), n.yon);
    }
    st.mahsulot += qatorlar.length;
    const o = erpMahsulotOqi({ _meta: { sana: bugun() }, mahsulotlar: qatorlar });
    if (o.xato) return;
    const f = mahsulotFarq(o.qatorlar, farqKirish(db, katOl(), { kurs: 0 }));
    const chegara = chegaraOl(), sana = bugun();
    const kursQabul = kvSon('kurs_qabul', 0);
    const kursSakradi = !!(kurs > 0 && kursQabul > 0 && Math.abs(kurs / kursQabul - 1) * 100 > S.kursChegaraFoiz);
    const avto = [], kutadi = [], info = [], baholangan = new Set(), mosKat = new Map();
    const yoz = [];
    /* sukut plitalar (LDSP16, MDF16, HDF3 …): ERP mahsulot ID bo'yicha moslanadi (nom bo'yicha katalogda topilmaydi); qatlam — erp_narx tur 'sukut' */
    const sukutQ = [];
    const sk = sukutOl();
    if (sk.size) {
      const idKod = new Map([...sk].map(([kod, v]) => [v.erp_id, [kod, v]]));
      const lay = qatlamMap(db, 'sukut'), qolda = qoldaMap(db);
      for (const r of o.qatorlar) {
        const t = idKod.get(String(r.id));
        if (!t) continue;
        const [kod, v] = t, qd = qolda.get(kod) || 0, ly = lay.get(kod) || 0, eski = qd > 0 ? qd : ly > 0 ? ly : v.fayl || 0, yangi = r.narx;
        const h = !(yangi > 0) ? 'narxsiz' : qd > 0 ? (yangi === qd ? 'bir_xil' : 'qolda') : eski === yangi ? 'bir_xil' : eski > 0 ? 'ozgardi' : 'toldirildi';
        sukutQ.push({ g: 'sukut', k: kod, erp_id: r.id, sku: r.sku || v.sku, nom: v.nom || r.nom, birlik: r.birlik, royxat: r.royxat, katalog_nom: v.nom, eski, yangi,
          foiz: eski > 0 && yangi > 0 ? Math.round((yangi - eski) / eski * 1000) / 10 : null, manba: qd > 0 ? 'qolda' : ly > 0 ? 'erp' : 'fayl', h, q: h === 'ozgardi' || h === 'toldirildi' });
      }
    }
    for (const x of [...f.qatorlar, ...sukutQ]) {
      if (x.g !== 'plita' && x.g !== 'furnitura' && x.g !== 'sukut') { if (x.h === 'noaniq') st.noaniq++; continue; }
      if (x.h === 'yoq') continue;
      if (x.h === 'noaniq') { st.noaniq++; continue; }
      const y = yon.get(String(x.erp_id)) || {};
      const ob = obyektOl.get(x.g, x.k);
      if (ob && ob.erp_id && ob.erp_id !== String(x.erp_id) && Date.now() - Date.parse(ob.korilgan + 'Z') < 2 * 3600_000) { st.ziddiyat++; continue; }   // bitta katalog yozuviga ikki ERP mahsuloti — birinchisi ustun
      st.mos++;
      baholangan.add(x.g + ':' + x.k);
      if (y.kat) mosKat.set(y.kat, (mosKat.get(y.kat) || 0) + 1);
      yoz.push([x, y]);
      if (x.h === 'qolda') { st.qolda++; continue; }
      if (x.h === 'bir_xil') continue;
      if (x.h === 'narxsiz') { if (x.eski > 0) info.push({ ...x, q: false, sabab: 'narx_yoq' }); continue; }
      if (ob && ob.rad_uzs > 0 && ob.rad_uzs === x.yangi) { st.rad++; continue; }                  // admin aynan shu narxni rad etgan
      const q = qaror(x, { chegara, kursSakradi });
      if (q.amal === 'qollash') avto.push(x);
      else if (q.amal === 'kutadi') kutadi.push({ ...x, sabab: q.sabab });
    }
    db.transaction(() => {
      for (const [x, y] of yoz) obyektYoz.run(x.g, x.k, y.kat || '', y.katNom || '', String(x.erp_id || ''), x.sku || '', x.yangi > 0 ? x.yangi : 0, y.usd || 0, y.sana || '');
    })();
    /* kurs: sakrash bo'lmasa qabul qilinadi; sakragan bo'lsa — qoralama qo'llanguncha/o'chirilguncha kutadi */
    if (kurs > 0) {
      set('kurs', String(kurs));
      if (!kursSakradi) { if (!kvJs('kurs_kutadi')) set('kurs_qabul', String(kurs)); }
      else if (kutadi.some(x => x.sabab === 'kurs_sakradi')) { if (!kvJs('kurs_kutadi')) set('kurs_kutadi', { eski: kursQabul, yangi: kurs, vaqt: new Date().toISOString() }); }
      else set('kurs_qabul', String(kurs));
    }
    const pid = yakunlash({ avto, kutadi, info, baholangan, sana, tur, st });
    const kk = kvJs('kurs_kutadi');
    if (kk && !kk.partiya_id && pid) set('kurs_kutadi', { ...kk, partiya_id: pid });
    return mosKat;
  }

  /** ERP xizmatlar qatorlari → baholash va qo'llash */
  function xizmatIshlov(xomlar, tur, st) {
    const o = erpXizmatOqi({ _meta: { sana: bugun() }, xizmatlar: xomlar });
    if (o.xato) { st.ogohlantirish.push({ kod: KOD.JAVOB, matn: 'xizmatlar: ' + o.xato }); return false; }
    const cur = narxCurrent(db, jurnal);
    const tekshir = (kod, satr) => { try { narxQollash(cur, { xizmatlar: { [kod]: satr } }); return ''; } catch (e) { if (narxXatoMi(e)) return e.message; throw e; } };
    const f = xizmatFarq(o, cur, tekshir);
    const chegara = chegaraOl();
    const avto = [], kutadi = [], baholangan = new Set();
    for (const x of f.qatorlar) {
      if (x.h === 'yoq') continue;
      if (x.h === 'noaniq') { st.noaniq++; continue; }
      baholangan.add('xizmat:' + x.k);
      st.xizmat++;
      if (x.h === 'qolda') { st.qolda++; continue; }
      if (x.h === 'yangi') { st.xizmat_yangi = (st.xizmat_yangi || 0) + 1; baholangan.delete('xizmat:' + x.k); continue; }    // yangi xizmat avtomatik qo'shilmaydi (admin "yangi_xizmat" bilan)
      if (x.h !== 'ozgardi') continue;
      const ob = obyektOl.get('xizmat', x.k);
      if (ob && ob.rad_uzs > 0 && ob.rad_uzs === Math.round(x.yangi)) { st.rad++; continue; }
      const q = qaror(x, { chegara });
      if (q.amal === 'qollash') avto.push(x); else if (q.amal === 'kutadi') kutadi.push({ ...x, sabab: q.sabab });
    }
    db.transaction(() => { for (const x of f.qatorlar) if (x.h !== 'yoq' && x.h !== 'noaniq') obyektYoz.run('xizmat', x.k, '', '', x.erp_id || x.k, x.sku || '', Math.round(x.yangi) || 0, 0, ''); })();
    yakunlash({ avto, kutadi, info: [], baholangan, sana: bugun(), tur, st });
    return true;
  }

  /* ═══ kategoriyalar va aylanish rejasi ═══ */
  /** ERP kategoriyalar ro'yxati (id, name, products_count; sahifa 50) → erp_jonli_kat. Katalogdagi `cat` nomiga AYNAN mos kategoriyalar belgilanadi (kat_mos > 0) —
   *  ular kashf navbatida birinchi o'qiladi; products_count = 0 — bo'sh kategoriya (o'qilmaydi). Ro'yxat mahsulot so'rovi emas, lekin ERP'ga so'rov: 6 soatda bir marta. */
  const katRoyxatYoz = db.prepare(`INSERT INTO erp_jonli_kat (kat_id, nom, nom_norm, kat_mos, erp_soni, sahifa, skan_at)
      VALUES (@id, @nom, @norm, @mos, @soni, @sahifa, CASE WHEN @soni = 0 THEN CURRENT_TIMESTAMP END)
    ON CONFLICT(kat_id) DO UPDATE SET nom = excluded.nom, nom_norm = excluded.nom_norm, kat_mos = excluded.kat_mos, erp_soni = excluded.erp_soni,
      sahifa = CASE WHEN excluded.erp_soni > 0 THEN excluded.sahifa ELSE erp_jonli_kat.sahifa END, skan_at = COALESCE(erp_jonli_kat.skan_at, excluded.skan_at)`);
  async function kategoriyalarYangila(m, signal) {
    if (signal && signal.aborted) return 0;
    const r = await m.royxat('/api/v2/products/categories/', {}, S.katRoyxatMaxSahifa);
    const nomlar = katCatXarita(katOl()).nomlar;
    let n = 0;
    db.transaction(() => {
      for (const c of r.qatorlar) {
        if (!obj(c) || c.id == null) continue;
        const nom = String(c.name ?? c.title ?? c.category_name ?? '').slice(0, 200), norm = katNomNorm(nom), mos = nomlar.get(norm);
        const soni = Number.isFinite(Number(c.products_count)) && c.products_count !== null && c.products_count !== '' ? Math.max(0, Math.round(Number(c.products_count))) : -1;
        katRoyxatYoz.run({ id: String(c.id), nom, norm, mos: mos ? mos.plita + mos.furnitura + mos.stol : 0, soni, sahifa: soni > 0 ? Math.ceil(soni / 50) : 0 }); n++;
      }
    })();
    set('kat_royxat_vaqti', new Date().toISOString()); set('kat_royxat_v', '2');
    return n;
  }
  const katSoni = () => db.prepare('SELECT COUNT(*) AS n FROM erp_jonli_kat').get().n;
  const katNarx = (c) => Math.max(1, c.sahifa || (c.erp_soni > 0 ? Math.ceil(c.erp_soni / 50) : 0) || 4);      // o'qish narxi (sahifalar soni)

  /** qaynoq kategoriyalar: qaynoq kalit uchun avval o'rganilgan kategoriya (erp_jonli_obyekt), bo'lmasa katalogdagi `cat` NOMI bo'yicha ERP kategoriyasi
   *  (birinchi tsiklning o'zidayoq); ikkalasi ham yo'q bo'lsa — nomalum (kashf bilan topiladi). Eng eski o'qilgani birinchi. */
  function qaynoqKategoriyalar() {
    const kat = katOl(), q = qaynoqOl(db, kat), cx = katCatXarita(kat);
    const nomXarita = new Map();
    for (const r of db.prepare("SELECT kat_id, nom_norm FROM erp_jonli_kat WHERE nom_norm <> ''").all()) { const l = nomXarita.get(r.nom_norm); if (l) l.push(r.kat_id); else nomXarita.set(r.nom_norm, [r.kat_id]); }
    const kats = new Set();
    let nomalum = 0, nomBilan = 0, urganilgan = 0;
    const sukutNomalum = [];
    for (const kod of sukutOl().keys()) {                                     // sukut plitalar: kategoriyasi o'rganilgan bo'lsa — o'sha; aks holda qidiruv (search=<sku>) bilan topiladi
      const o = obyektOl.get('sukut', kod);
      if (o && o.kat_id) { kats.add(o.kat_id); urganilgan++; } else sukutNomalum.push(kod);
    }
    for (const [tur, to] of [['plita', q.plita], ['furnitura', q.furnitura]]) {
      for (const k of to) {
        const o = obyektOl.get(tur, k);
        if (o && o.kat_id) { kats.add(o.kat_id); urganilgan++; continue; }
        const l = nomXarita.get(cx[tur].get(k));
        if (l && l.length) { for (const id of l) kats.add(id); nomBilan++; } else nomalum++;
      }
    }
    const get = db.prepare('SELECT kat_id, nom, sahifa, erp_soni, qaynoq_at FROM erp_jonli_kat WHERE kat_id = ?');
    const royxat = [...kats].map(id => get.get(id) || { kat_id: id, nom: '', sahifa: 0, erp_soni: -1, qaynoq_at: null }).filter(c => c.erp_soni !== 0)
      .sort((a, b) => String(a.qaynoq_at || '').localeCompare(String(b.qaynoq_at || '')));
    return { royxat, nomalum, sukutNomalum, jami: q.plita.size + q.furnitura.size, nom_bilan: nomBilan, urganilgan, qaynoq: { plita: q.plita.size, furnitura: q.furnitura.size, sukut: sukutOl().size } };
  }
  /** to'liq aylanish: bizniki kategoriyalar — mahsulot mos tushgan, o'rganilgan yoki katalog `cat` nomiga teng. Hali o'qilmaganlari birinchi, keyin eng eskisi. */
  const bizniki = () => db.prepare(`SELECT kat_id, nom, sahifa, erp_soni, skan_at FROM erp_jonli_kat WHERE erp_soni <> 0
    AND (mos > 0 OR kat_mos > 0 OR kat_id IN (SELECT kat_id FROM erp_jonli_obyekt WHERE kat_id <> '')) ORDER BY COALESCE(skan_at, '') ASC, kat_mos DESC, kat_id`).all();
  /** kashf: nomi katalogga mos kelmagan, hali o'qilmagan (yoki bizniki emas deb 7 kundan oshgan) kategoriyalar — past ustuvorlik, kichik byudjet */
  const kashfEtilmagan = () => db.prepare(`SELECT kat_id, nom, sahifa, erp_soni, skan_at FROM erp_jonli_kat WHERE erp_soni <> 0 AND kat_mos = 0 AND mos = 0
    AND kat_id NOT IN (SELECT kat_id FROM erp_jonli_obyekt WHERE kat_id <> '')
    AND (skan_at IS NULL OR skan_at < datetime('now', '-${S.kashfQaytaKun} days')) ORDER BY COALESCE(skan_at, '') ASC, kat_id`).all();

  /** sukut plitalarning ERP kategoriyasi noma'lum: `search=<sku>` (so'ng nom) bilan ERP mahsuloti ID bo'yicha topiladi va oddiy quvurdan o'tadi (narx + kategoriya o'rganiladi).
   *  Topilmagan — 6 soatda bir urinish; topilgan, lekin javobda kategoriya yo'q — har tsiklda (≤ 2 so'rov). */
  async function sukutQidir(m, kodlar, tur, st, yengilXato) {
    const sk = sukutOl();
    for (const kod of kodlar) {
      const v = sk.get(kod);
      if (!v) continue;
      const ob = obyektOl.get('sukut', kod);
      if (!(ob && ob.erp_id) && Date.now() - Date.parse(kv('sukut_izlash_' + kod, '')) < 6 * 3600_000) continue;
      let row = null;
      for (const q of [v.sku, v.nom]) {
        if (!q || row) continue;
        try { const r = await m.royxat('/api/v2/products/', { search: q }, 2); row = r.qatorlar.find(x => obj(x) && String(x.id) === v.erp_id) || null; } catch (e) { yengilXato(e, `sukut ${kod} qidiruvi`); break; }
      }
      set('sukut_izlash_' + kod, new Date().toISOString());
      if (!row) { st.ogohlantirish.push({ kod: KOD.JAVOB, matn: `sukut ${kod}: ERP mahsuloti (id ${v.erp_id}) topilmadi` }); continue; }
      mahsulotIshlov([row], tur, st, 0);
    }
  }

  /** kategoriyani o'qiydi (maks sahifagacha), xom qatorlarga kategoriya belgisini qo'yadi */
  async function kategoriyaOqi(m, kat, maks, st) {
    const r = await m.royxat('/api/v2/products/', { category: kat.kat_id }, maks);
    for (const x of r.qatorlar) if (obj(x)) { x.__kat = String(kat.kat_id); x.__katNom = kat.nom || ''; }
    st.kategoriya++;
    return r;
  }

  /** bir aylanish. tur: 'qaynoq' | 'toliq'. HECH QACHON throw qilmaydi — natija st (xato — st.xato) */
  async function aylanish(tur) {
    band = true;
    const t0 = Date.now();
    const sorovBosh = sorovSoni;
    const st = { tur, boshlandi: new Date(t0).toISOString(), sorov: 0, kategoriya: 0, mahsulot: 0, mos: 0, qollandi: 0, kutadi: 0, noaniq: 0, qolda: 0, rad: 0, ziddiyat: 0, xizmat: 0,
      ogohlantirish: [], xato: null, davomiyligi_ms: 0 };
    try {
      if (!mijoz) mijoz = new ErpMijoz({ baseUrl, login, parol, fetchImpl, taymAutMs: S.taymAutMs, signal: abort.signal, oraliqMs: 0, sanagich: () => { sorovSoni++; } });
      mijoz.oraliqMs = tur === 'toliq' ? S.toliqOraliqMs : S.qaynoqOraliqMs;
      mijoz.qaytaKirish = 0;
      kursKutadiTekshir();
      const m = mijoz;
      const signal = abort.signal;
      let manbaOk = 0, manbaXato = 0, birinchiXato = null;
      const yengilXato = (e, nom) => {
        if (!(e instanceof ErpXato) || !e.yengil) throw e;
        manbaXato++; birinchiXato = birinchiXato || e;
        st.ogohlantirish.push({ kod: e.kod, matn: `${nom}: ${e.message}` });
      };
      /* 1) kategoriyalar ro'yxati (hech yuklanmagan yoki 6 soatdan eski bo'lsa; ~1000 kategoriya = ~20 sahifa). Qaynoq aylanishda bu ham byudjetdan ayriladi */
      const royxatVaqti = Date.parse(kv('kat_royxat_vaqti', ''));
      let royxatSarf = 0;
      if (katSoni() === 0 || kv('kat_royxat_v', '') !== '2' || !(Date.now() - royxatVaqti < S.katRoyxatMs)) {      // v2: nom_norm / products_count bilan (eski bazada bir marta qayta o'qiladi)
        const s0 = sorovSoni;
        try { await kategoriyalarYangila(m, signal); manbaOk++; } catch (e) { yengilXato(e, 'kategoriyalar'); }
        royxatSarf = sorovSoni - s0; st.kat_royxat_sorov = royxatSarf;
      }
      /* 2) o'qiladigan kategoriyalar: qaynoq (o'z kategoriyasi — o'rganilgan yoki katalog `cat` nomi bo'yicha) → bizniki (nom mos) → kashf (nom mos emas, kichik byudjet) */
      let byudjet = tur === 'toliq' ? S.toliqButget : Math.max(S.qaynoqButget - royxatSarf, Math.min(15, S.qaynoqButget));
      const qk = qaynoqKategoriyalar();
      if (qk.sukutNomalum.length && !signal.aborted) {
        const s1 = sorovSoni;
        await sukutQidir(m, qk.sukutNomalum, tur, st, yengilXato);
        byudjet = Math.max(0, byudjet - (sorovSoni - s1));
      }
      const reja = [], korilgan = new Set();
      const qosh = (c, qism) => { if (!korilgan.has(c.kat_id)) { korilgan.add(c.kat_id); reja.push({ ...c, qism }); } };
      for (const c of qk.royxat) qosh(c, 'qaynoq');
      if (tur === 'toliq') for (const c of bizniki()) qosh(c, 'bizniki');
      let kashf = tur === 'toliq' ? S.kashfButget : (qk.nomalum > 0 ? Math.min(20, Math.max(0, byudjet - qk.royxat.reduce((a, c) => a + katNarx(c), 0))) : 0);
      for (const c of kashfEtilmagan()) { if (kashf <= 0) break; if (!korilgan.has(c.kat_id)) { qosh(c, 'kashf'); kashf -= katNarx(c); } }
      /* 3) bo'lak-bo'lak o'qish va qo'llash (qaynoq kategoriyalar birinchi — ular tezroq yangilanadi; bo'lak kategoriya chegarasida tugaydi) */
      let xomlar = [], bolakSorov = 0;
      const bolakYakun = () => {
        if (!xomlar.length) return;
        const kurs = kursMediana(xomlar.map(r => (erpQatorNormal(r) || {}).yon).filter(Boolean));
        const mosKat = mahsulotIshlov(xomlar, tur, st, kurs);
        if (mosKat) for (const [kid, n] of mosKat) katMos.run(n, kid);
        xomlar = []; bolakSorov = 0;
      };
      for (let i = 0; i < reja.length; i++) {
        const c = reja[i];
        if (signal.aborted || byudjet <= 0) break;
        const sBosh = sorovSoni;
        try {
          const r = await kategoriyaOqi(m, c, Math.min(S.maksSahifa, byudjet), st);
          manbaOk++;
          xomlar.push(...r.qatorlar);
          katYoz.run(String(c.kat_id), c.nom || '', 0, r.jami ?? r.qatorlar.length, r.toliq ? r.sahifa : Math.max(r.sahifa, c.sahifa || 0),
            c.qism === 'qaynoq' ? new Date().toISOString() : null);
        } catch (e) { yengilXato(e, `kategoriya ${c.kat_id}`); }
        const sarf = Math.max(1, sorovSoni - sBosh);
        byudjet -= sarf; bolakSorov += sarf;
        const keyingi = reja[i + 1];
        if (bolakSorov >= S.bolakSorov || !keyingi || keyingi.qism !== c.qism) bolakYakun();
      }
      bolakYakun();
      /* 4) xizmatlar */
      try {
        const r = await m.royxat('/erp/services/api/manage/services/', {}, 40);
        if (xizmatIshlov(r.qatorlar, tur, st)) manbaOk++;
      } catch (e) { yengilXato(e, 'xizmatlar'); }
      if (manbaOk === 0 && manbaXato > 0) throw birinchiXato;
      muvaffaqiyat(st);
    } catch (e) {
      xatoQayd(e, st);
    } finally {
      st.sorov = sorovSoni - sorovBosh;
      st.davomiyligi_ms = Date.now() - t0;
      band = false;
      try {
        set(tur === 'toliq' ? 'oxirgi_toliq' : 'oxirgi_qaynoq', { ...st, ogohlantirish: st.ogohlantirish.slice(0, 5) });
        set('oxirgi_urinish', st.boshlandi);
        db.prepare('DELETE FROM erp_jonli_tarix WHERE id <= (SELECT COALESCE(MAX(id), 0) FROM erp_jonli_tarix) - ?').run(S.tarixSaqlash);
        db.prepare(`DELETE FROM erp_partiya WHERE manba = 'jonli' AND holat <> 'qoralama' AND created_at < datetime('now', '-${S.partiyaKun} days')`).run();
      } catch (e) { jurnal.error({ code: 'S3D-ERP-004', msg: 'ERP jonli holati saqlanmadi: ' + maxfiyTozala(String(e && e.message), env) }); }
      qaynoqDue = tur === 'toliq' ? Date.now() + S.qaynoqMs : t0 + S.qaynoqMs;
      if (tur === 'toliq') toliqDue = t0 + S.toliqMs;
      rejala();
    }
    return st;
  }
  function muvaffaqiyat(st) {
    set('oxirgi_muvaffaqiyat', new Date().toISOString());
    set('xato_soni', '0');
    keyingiUrinish = 0;
    const msana = db.prepare("SELECT COALESCE(MAX(erp_sana), '') AS d FROM erp_jonli_obyekt").get().d;
    if (msana && msana > kv('manba_sana', '')) set('manba_sana', msana);
    if (st.qollandi || st.kutadi) jurnal.info({ code: 'S3D-ADM-100', msg: `ERP jonli (${st.tur}): qo'llandi ${st.qollandi}, tasdiq kutadi ${st.kutadi}, noaniq ${st.noaniq}, so'rov ${sorovSoni}` });
  }
  function xatoQayd(e, st) {
    const kod = e instanceof ErpXato ? e.kod : KOD.JAVOB;
    const matn = maxfiyTozala(String(e && e.message || e), env).slice(0, 200);
    st.xato = { kod, matn };
    const n = kvSon('xato_soni', 0) + 1;
    set('xato_soni', String(n)); set('xato_jami', String(kvSon('xato_jami', 0) + 1));
    set('oxirgi_xato', { kod, matn, vaqt: new Date().toISOString() });
    keyingiUrinish = Date.now() + Math.min(S.orqaMaxMs, S.orqaBoshiMs * 2 ** (n - 1));
    jurnal.warn({ code: kod, msg: `ERP jonli (${st.tur}): ${matn} — keyingi urinish ${Math.round((keyingiUrinish - Date.now()) / 1000)} s dan keyin (ketma-ket xato: ${n})` });
  }
  /** kurs sakrashi qoralama bilan hal bo'lganmi (qo'llangan yoki o'chirilgan) — tekshiradi */
  function kursKutadiTekshir() {
    const kk = kvJs('kurs_kutadi');
    if (!kk) return;
    const d = kk.partiya_id ? db.prepare('SELECT holat FROM erp_partiya WHERE id = ?').get(kk.partiya_id) : null;
    if (!d || d.holat !== 'qoralama') { set('kurs_qabul', String(kk.yangi)); kvYoz.run('kurs_kutadi', ''); }
  }

  /* ═══ jadval ═══ */
  function rejala() {
    if (taymer) { clearTimeout(taymer); taymer = null; }
    if (!ishlayapti || band) return;
    const now = Date.now();
    const due = Math.max(keyingiUrinish, Math.min(qaynoqDue, toliqDue));
    taymer = setTimeout(tik, pauzaOl() ? 5000 : Math.min(60_000, Math.max(50, due - now)));
    taymer.unref();
  }
  function tik() {
    taymer = null;
    if (!ishlayapti || band) return;
    const now = Date.now();
    if (pauzaOl() || now < keyingiUrinish || now < Math.min(qaynoqDue, toliqDue)) return rejala();
    hozirgiAylanish = bajar(now >= toliqDue ? 'toliq' : 'qaynoq');
  }
  function bajar(tur) {
    const p = aylanish(tur);
    hozirgiAylanish = p;
    p.finally(() => { if (hozirgiAylanish === p) hozirgiAylanish = null; });
    return p;
  }

  /* ═══ tashqi API ═══ */
  return {
    yoqilgan, sabab, erpManzil,
    /** poller'ni ishga tushiradi (yoqilmagan bo'lsa — hech narsa qilmaydi). Taymer unref — jarayonni ushlab turmaydi */
    start() {
      if (!yoqilgan || ishlayapti) return false;
      ishlayapti = true; if (abort.signal.aborted) abort = new AbortController(); mijoz = null;
      const now = Date.now();
      qaynoqDue = now + S.boshKechikishMs; toliqDue = now + S.boshKechikishMs + S.toliqMs; keyingiUrinish = 0;
      rejala();
      return true;
    },
    /** to'xtatadi: taymer o'chadi, ketayotgan so'rovlar bekor, aylanish tugashini kutadi */
    async stop() {
      ishlayapti = false;
      if (taymer) { clearTimeout(taymer); taymer = null; }
      if (abort) abort.abort();
      if (hozirgiAylanish) { try { await hozirgiAylanish; } catch (_) { /* tugadi */ } }
      mijoz = null;
    },
    /** admin "Hozir": { toliq?, kut? }. kut — aylanish tugaguncha (≤ 25 s) kutadi va natijani qaytaradi */
    async hozirSinxron({ toliq = false, kut = false } = {}) {
      if (!yoqilgan) throw new ErpXato(KOD.OCHIQ, `ERP jonli sinxron o'chiq (${sabab === 'env_yoq' ? 'ERP_LOGIN / ERP_PASSWORD berilmagan' : "ERP_JONLI=1 qo'yilmagan"})`);
      if (pauzaOl()) throw new ErpXato(KOD.PAUZA, 'ERP jonli sinxron pauzada');
      if (band) throw new ErpXato(KOD.BAND, 'sinxronlash allaqachon bajarilmoqda');
      if (Date.now() - oxirgiHozir < S.hozirOraliqMs) throw new ErpXato(KOD.TEZ, `"Hozir" ${Math.round(S.hozirOraliqMs / 1000)} soniyada bir martadan ko'p emas`);
      oxirgiHozir = Date.now();
      if (abort.signal.aborted) { abort = new AbortController(); mijoz = null; }
      const tur = toliq ? 'toliq' : 'qaynoq';
      const p = bajar(tur);
      if (!kut) return { boshlandi: true, tur };
      const natija = await Promise.race([p, uxla(S.kutishMaxMs).then(() => null)]);
      return natija ? { boshlandi: true, tur, tugadi: true, natija: ochiqNatija(natija) } : { boshlandi: true, tur, tugadi: false };
    },
    /** "Hozir" ning javobi uchun — ichki ma'lumotsiz */
    aylanish: (tur) => (band ? Promise.resolve({ tur, xato: { kod: KOD.BAND, matn: 'sinxronlash allaqachon bajarilmoqda' } }) : bajar(tur)),
    holat() {
      const xato = kvJs('oxirgi_xato');
      const q = qoralamaOl();
      const qx = q ? (js(q.xulosa_json) || {}) : {};
      const qr = q ? (js(q.farq_json) || []) : [];
      const katlar = db.prepare(`SELECT COUNT(*) AS n, SUM(skan_at IS NOT NULL) AS k, SUM(mos > 0) AS b, SUM(kat_mos > 0) AS nm,
        SUM(kat_mos > 0 AND skan_at IS NULL AND erp_soni <> 0) AS nmk, SUM(skan_at IS NULL AND erp_soni <> 0) AS kk FROM erp_jonli_kat`).get();
      const kuz = { plita: 0, furnitura: 0, xizmat: 0, sukut: 0 };
      for (const r of db.prepare("SELECT tur, COUNT(*) AS n FROM erp_jonli_obyekt WHERE erp_id <> '' GROUP BY tur").all()) kuz[r.tur] = r.n;
      let kat = { plita: [], furnitura: [] }, qk = { royxat: [], nomalum: 0, qaynoq: { plita: 0, furnitura: 0, sukut: 0 } };
      try { kat = katOl(); qk = qaynoqKategoriyalar(); } catch (_) { /* diagnostika ixtiyoriy: katalog o'qilmasa ham holat chiqadi */ }
      const kk = kvJs('kurs_kutadi');
      return {
        yoqilgan, sabab, manzil: erpManzil, pauza: pauzaOl(), chegara_foiz: chegaraOl(), band,
        versiya: kvSon('versiya', 0), yangilangan: kv('yangilangan', '') || null,
        oxirgi_urinish: kv('oxirgi_urinish', '') || null, keyingi_urinish: keyingiUrinish > Date.now() ? new Date(keyingiUrinish).toISOString() : null, oxirgi_muvaffaqiyat: kv('oxirgi_muvaffaqiyat', '') || null, manba_sana: kv('manba_sana', '') || null,
        xato_soni: kvSon('xato_soni', 0), xato_jami: kvSon('xato_jami', 0), oxirgi_xato: xato && xato.kod ? xato : null,
        eski: eskiMi(), kurs: kvSon('kurs', 0) || null, kurs_qabul: kvSon('kurs_qabul', 0) || null, kurs_kutadi: kk && kk.yangi ? { eski: kk.eski, yangi: kk.yangi } : null,
        keyingi_qaynoq: ishlayapti && !pauzaOl() ? new Date(Math.max(keyingiUrinish, qaynoqDue)).toISOString() : null,
        keyingi_toliq: ishlayapti && !pauzaOl() ? new Date(Math.max(keyingiUrinish, toliqDue)).toISOString() : null,
        oxirgi_qaynoq: kvJs('oxirgi_qaynoq'), oxirgi_toliq: kvJs('oxirgi_toliq'),
        kategoriyalar: { jami: katlar.n || 0, kashf: katlar.k || 0, bizniki: katlar.b || 0, kashf_qilinmagan: katlar.kk || 0, nom_mos: katlar.nm || 0, nom_mos_kashf_qilinmagan: katlar.nmk || 0,
          qaynoq: qk.royxat.length, qaynoq_nomalum: qk.nomalum },
        kuzatilayotgan: kuz,                                                    // ERP'dan oxirgi ko'rilgan obyektlar soni (plita / furnitura / xizmat)
        katalog: { plita: kat.plita.length, furnitura: kat.furnitura.length, qaynoq_plita: qk.qaynoq.plita, qaynoq_furnitura: qk.qaynoq.furnitura, qaynoq_sukut: qk.qaynoq.sukut },
        sozlama: { qaynoq_soniya: Math.round(S.qaynoqMs / 1000), toliq_soniya: Math.round(S.toliqMs / 1000), taym_aut_soniya: Math.round(S.taymAutMs / 1000), eski_daqiqa: S.eskiDaqiqa },
        tasdiq_kutadi: { soni: qr.filter(x => x.q).length, ogohlantirish: qr.filter(x => !x.q).length, partiya_id: q ? q.id : null, sabab: qx.sabab || {} },
        ozgarishlar: db.prepare('SELECT id, vaqt, tur, kalit, nom, eski, yangi, foiz, harakat, sabab, partiya_id FROM erp_jonli_tarix ORDER BY id DESC LIMIT 50').all()
      };
    },
    /** PUT: { pauza?, chegara_foiz? } — tekshirilgan qiymatlarni saqlaydi, eskisini qaytaradi */
    sozla(b) {
      const eski = { pauza: pauzaOl(), chegara_foiz: chegaraOl() };
      if (!obj(b) || (b.pauza === undefined && b.chegara_foiz === undefined)) throw new ErpXato(KOD.SOZLAMA, 'pauza (ha/yo\'q) yoki chegara_foiz (5…100) kerak');
      if (b.pauza !== undefined && typeof b.pauza !== 'boolean') throw new ErpXato(KOD.SOZLAMA, 'pauza: true yoki false');
      if (b.chegara_foiz !== undefined && !(typeof b.chegara_foiz === 'number' && Number.isFinite(b.chegara_foiz) && b.chegara_foiz >= 5 && b.chegara_foiz <= 100)) throw new ErpXato(KOD.SOZLAMA, 'chegara_foiz: 5…100 oralig\'ida son');
      if (b.pauza !== undefined) set('pauza', b.pauza ? '1' : '0');
      if (b.chegara_foiz !== undefined) set('chegara_foiz', String(b.chegara_foiz));
      rejala();
      return { eski, yangi: { pauza: pauzaOl(), chegara_foiz: chegaraOl() } };
    },
    versiyaOshir,
    ommaviy, ommaviyEtag, sarlavha,
    /** admin shu narxlarni rad etdi (qoralama o'chirildi / istisno / qaytarildi) — ERP narxi shu qiymatda turganda qayta taklif qilinmaydi */
    radEtish(qatorlar, harakat = 'rad') {
      db.transaction(() => {
        for (const x of qatorlar) {
          if (!x || !x.g || !x.k || !(x.yangi > 0)) continue;
          radYoz.run(x.g, String(x.k), Math.round(x.yangi));
          tarixYoz.run(x.g, String(x.k), x.nom || '', x.eski ?? null, x.yangi, x.foiz ?? null, harakat, x.sabab || '', null);
        }
      })();
    },
    /** testlar uchun: ichki holat */
    _kv: kv
  };

  function ochiqNatija(st) {
    return { tur: st.tur, sorov: st.sorov, kategoriya: st.kategoriya, mahsulot: st.mahsulot, mos: st.mos, qollandi: st.qollandi, kutadi: st.kutadi, noaniq: st.noaniq,
      rad: st.rad, davomiyligi_ms: st.davomiyligi_ms, xato: st.xato, ogohlantirish: st.ogohlantirish.slice(0, 5) };
  }
}
