/* SOXTA ERP serveri (TZ-44 sinovlari) — faqat lokal http (127.0.0.1). Haqiqiy ERP'ga HECH QACHON so'rov yuborilmaydi.
 * Django kabi: GET /login/ (csrfmiddlewaretoken + csrftoken cookie) → POST /login/ (sessionid cookie, 302) → autentifikatsiyalangan GET:
 *   /api/v2/products/?category=&page=      (DRF: { count, next, previous, results }, sahifa 50)
 *   /api/v2/products/categories/?page=
 *   /erp/services/api/manage/services/?page=
 * Sessiya tugasa — 302 /login/?next=… Hamma so'rovlar `sorovlar` ga yoziladi (faqat GET + POST /login/ bo'lishi tekshiriladi).
 * `rejim`: 'ok' | 'uzilgan' (ulanish uziladi) | '500' | 'jsonemas' (HTML 200) | 'sekin' (javob kechikadi). */
import http from 'node:http';

export async function soxtaErp({ login = 'sinov-erp-login', parol = 'Sinov-Parol-ERP-9x7!Qz', sahifaHajmi = 50, kategoriyalar = [], mahsulotlar = [], xizmatlar = [] } = {}) {
  const S = { login, parol, kategoriyalar, mahsulotlar, xizmatlar, rejim: 'ok', sahifaTuri: 'page', sorovlar: [], sessiyalar: new Set(), loginSoni: 0, kutish: 0 };
  const taymerlar = new Set();
  let n = 0;
  const kuki = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, v.join('=')]));
  /** sahifa turlari (S.sahifaTuri): 'page' (sukut, ?page=N) | 'offset' (limit/offset, `next` filtrlari bilan) | 'tashqi' (`next` BOSHQA hostga ishora qiladi) | 'ignore' (ERP `page` ni e'tiborsiz qoldiradi, `next` doim bor) */
  const sahifa = (res, req, url, royxat) => {
    let bosh = 0, keyingi = null;
    const q = new URLSearchParams(url.searchParams);
    if (S.sahifaTuri === 'offset') {
      bosh = Number(url.searchParams.get('offset')) || 0;
      if (bosh + sahifaHajmi < royxat.length) { q.delete('page'); q.set('limit', String(sahifaHajmi)); q.set('offset', String(bosh + sahifaHajmi)); keyingi = `http://127.0.0.1:${S.port}${url.pathname}?${q}`; }
    } else if (S.sahifaTuri === 'ignore') {
      keyingi = `http://127.0.0.1:${S.port}${url.pathname}?page=2`;
    } else {
      const p = Math.max(1, Number(url.searchParams.get('page')) || 1);
      bosh = (p - 1) * sahifaHajmi;
      q.set('page', String(p + 1));
      if (bosh + sahifaHajmi < royxat.length) keyingi = `${S.sahifaTuri === 'tashqi' ? 'http://boshqa-host.invalid' : 'http://127.0.0.1:' + S.port}${url.pathname}?${q}`;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: royxat.length, next: keyingi, previous: bosh > 0 ? 'x' : null, results: royxat.slice(bosh, bosh + sahifaHajmi) }));
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    S.sorovlar.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), ua: req.headers['user-agent'] || '' });
    const ishla = () => {
      if (S.rejim === 'uzilgan') return req.destroy();
      if (S.rejim === '500') { res.writeHead(500); return res.end('xato'); }
      if (url.pathname === '/login/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'csrftoken=csrf-' + (++n) + '; Path=/' });
        return res.end(`<html><body><form method="post" action="/login/"><input type="hidden" name="csrfmiddlewaretoken" value="csrf-${n}">
          <input type="hidden" name="next" value="/"><input type="text" name="username" id="id_username"><input type="password" name="password" id="id_password">
          <button type="submit">Войти</button></form></body></html>`);
      }
      if (url.pathname === '/login/' && req.method === 'POST') {
        let b = '';
        req.on('data', d => { b += d; });
        return req.on('end', () => {
          const f = new URLSearchParams(b), c = kuki(req);
          S.loginSoni++;
          if (f.get('csrfmiddlewaretoken') !== c.csrftoken || f.get('username') !== S.login || f.get('password') !== S.parol) {
            res.writeHead(200, { 'Content-Type': 'text/html' });                                             // forma qayta chiqadi; xato matni parolni takrorlaydi (ERP noto'g'ri yozgan holat)
            return res.end(`<html><body><ul class="errorlist"><li>Неверный пароль ${f.get('password')} для ${f.get('username')}</li></ul><form><input type="password" name="password"></form></body></html>`);
          }
          const sid = 'sid-' + (++n);
          S.sessiyalar.add(sid);
          res.writeHead(302, { Location: '/', 'Set-Cookie': [`sessionid=${sid}; Path=/; HttpOnly`, 'csrftoken=csrf-yangi; Path=/'] });
          res.end();
        });
      }
      if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
      if (!S.sessiyalar.has(kuki(req).sessionid)) { res.writeHead(302, { Location: '/login/?next=' + encodeURIComponent(url.pathname) }); return res.end(); }
      if (S.rejim === 'jsonemas') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>texnik ishlar</html>'); }
      if (url.pathname === '/api/v2/products/categories/') return sahifa(res, req, url, S.kategoriyalar);
      if (url.pathname === '/api/v2/products/') {
        const c = url.searchParams.get('category'), q = (url.searchParams.get('search') || '').toLowerCase();
        let r = c ? S.mahsulotlar.filter(m => String(m.category) === c) : S.mahsulotlar;
        if (q) r = r.filter(m => String(m.sku || '').toLowerCase().includes(q) || String(m.name || '').toLowerCase().includes(q));
        return sahifa(res, req, url, r);
      }
      if (url.pathname === '/erp/services/api/manage/services/') return sahifa(res, req, url, S.xizmatlar);
      res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{}');
    };
    if (S.rejim === 'sekin') { const t = setTimeout(() => { taymerlar.delete(t); ishla(); }, S.kutish || 400); taymerlar.add(t); } else ishla();
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  S.port = server.address().port;
  S.url = `http://127.0.0.1:${S.port}`;
  S.sessiyaTugat = () => S.sessiyalar.clear();
  S.tozala = () => { S.sorovlar.length = 0; };
  S.yop = () => new Promise(r => { for (const t of taymerlar) clearTimeout(t); taymerlar.clear(); server.closeAllConnections(); server.close(r); });
  S.getlar = () => S.sorovlar.filter(x => x.method === 'GET' && x.path !== '/login/');
  /** faqat ruxsat etilgan so'rovlar bo'lganmi: GET va POST /login/ */
  S.faqatGet = () => S.sorovlar.every(x => x.method === 'GET' || (x.method === 'POST' && x.path === '/login/'));
  return S;
}

/** ERP mahsulot qatori (haqiqiy maydonlar shakli): so'm narx, dollar, kurs */
export function erpMahsulot({ id, sku, name, kat, uzs, usd = 0, kurs = 11773.68, unit = 'шт', list = null, faol = true }) {
  const narx = uzs !== undefined ? uzs : Math.round(usd * kurs);
  return { id, sku, name, category: kat, category_name: 'Kategoriya ' + kat, unit, price: narx.toFixed(2), price_usd: usd ? usd.toFixed(4) : '0', display_price_uzs: narx,
    display_price_usd: usd, price_list_uzs: list ?? Math.round(narx * 1.35), total_stock: 5, is_active: faol, updated_at: '2026-10-22T10:00:00Z', last_synced_at: '2026-10-22T09:00:00Z' };
}
