/* Smart3D js/auth-core.js — server bilan ishlash, ekransiz (TZ-09: TZ-07 auth.js dan ajratildi, mantiq o'zgarmagan).
 *
 * Kirish kaliti, so'rovlar, avtomatik saqlash va internetsiz navbat, loyihalar ro'yxati. Ekranga tegmaydi —
 * eski sayt (auth.js) ham, yangi frontend (web/) ham shuni ishlatadi.
 * Xavfsiz tartib: kirgan ustaning oxirgi loyihasi AVVAL serverdan yuklanadi, shundan keyingina
 * avtomatik saqlash yoqiladi (namuna loyiha usta loyihasi ustidan yozilmasligi uchun).
 * Internet yo'q bo'lsa — o'zgarish qurilmada navbatda turadi va internet qaytganda yuboriladi.
 *
 * o: { getPayload(), getTotal(), applyPayload(doc), hasWork(),
 *      onState(kind, title)  — 'ok' | 'busy' | 'off' | null (saqlash belgisi),
 *      onUser(user|null, sabab) — kirish/chiqish ('login' | 'logout' | 'expired' | 'restore'),
 *      toast(matn, tur, kod) }
 * TZ-19: server xatosi { error, code, rid } — kod toast'ga va natijaga uzatiladi; so'rov 15 soniyada javob bermasa —
 * to'xtatiladi (katta yuklama — 45 s) va tarmoq xatosi kabi ishlanadi (internetsiz navbat).
 */
export const K = { token: 'smart3d.token', user: 'smart3d.user', pending: 'smart3d.pending' };
const curKey = (u) => 'smart3d.current.' + (u && u.id);
export const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kvota */ } }
};

/** +998 90 123 45 67 ko'rinishida (yozish paytida) */
export function formatPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return '+998' + (parts.length ? ' ' + parts.join(' ') : '');
}

export function createSession(o) {
  let token = ls.get(K.token), user = ls.get(K.user);
  let ready = false, currentId = null;
  let saveTimer = 0, saving = false, dirty = false;
  const state = (kind, title) => { if (o.onState) o.onState(kind, title); };
  const toast = (t, k, code) => { if (o.toast) o.toast(t, k, code); };

  const api = async (path, { method = 'GET', body } = {}) => {
    const data = body ? JSON.stringify(body) : undefined;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), data && data.length > 200000 ? 45000 : 15000) : 0;
    try {
      return await fetch(path, {
        method, cache: 'no-store', signal: ctl ? ctl.signal : undefined,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: data
      });
    } finally { clearTimeout(t); }
  };
  /** server xatosi → { text, code } */
  const errInfo = async (r) => { try { const j = await r.json(); return { text: j.error || ('Xato ' + r.status), code: j.code || '' }; } catch (e) { return { text: 'Xato ' + r.status, code: '' }; } };
  const errText = async (r) => { const e = await errInfo(r); return e.text + (e.code ? ' · ' + e.code : ''); };
  const setCurrent = (id) => { currentId = id; ls.set(curKey(user), id); };
  const setAuth = (j) => { token = j.token; user = j.user; ls.set(K.token, token); ls.set(K.user, user); };

  /* ── avtomatik saqlash ── */
  function changed() {
    if (!token || !ready) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 2000);
    state('busy', 'Saqlanmoqda…');
  }
  async function flush() {
    if (!token || !ready || !dirty) return;
    if (saving) { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 800); return; }
    saving = true; dirty = false;
    const payload = o.getPayload();
    const body = { name: payload.name || 'Loyiha', doc: payload, total_price: Math.round(o.getTotal() || 0) };
    if (payload.client !== undefined) body.client = payload.client;
    try {
      let r = currentId ? await api('/api/projects/' + currentId, { method: 'PUT', body }) : null;
      if (!r || r.status === 404) {                     // yangi yoki o'chirilgan — yangi loyiha
        r = await api('/api/projects', { method: 'POST', body });
        if (r.ok) setCurrent((await r.json()).id);
      }
      if (r.status === 401) { logout(true); return; }
      if (!r.ok) { state('off', await errText(r)); return; }
      ls.set(K.pending, null);
      state('ok', 'Saqlandi — ' + new Date().toLocaleTimeString().slice(0, 5));
    } catch (e) {                                        // tarmoq yo'q — navbatda qoladi
      dirty = true;
      ls.set(K.pending, { userId: user && user.id, id: currentId, body });
      state('off', "Internet yo'q — o'zgarishlar qurilmada, internet qaytganda saqlanadi");
    } finally { saving = false; }
  }
  window.addEventListener('online', () => { if (token && ready && dirty) flush(); });

  /* ── loyihalar ── */
  async function openProject(id) {
    const r = await api('/api/projects/' + id);
    if (r.status === 401) { logout(true); return false; }
    if (!r.ok) { const e = await errInfo(r); toast(e.text, 'bad', e.code); return false; }
    const j = await r.json();
    ready = false;                                       // yuklash paytidagi qayta hisob saqlanmasin
    o.applyPayload(j.doc, j);
    setCurrent(j.id);
    ready = true; dirty = false;
    state('ok', 'Serverdan ochildi');
    return true;
  }
  /** → ro'yxat; 401 bo'lsa chiqadi va null qaytaradi */
  async function listProjects() {
    const r = await api('/api/projects');
    if (r.status === 401) { logout(true); return null; }
    return r.ok ? r.json() : [];
  }
  /** o'chirish = yashirish (arxiv) */
  async function removeProject(id) {
    const d = await api('/api/projects/' + id, { method: 'DELETE' });
    if (d.ok && id === currentId) setCurrent(null);
    return d.ok;
  }

  /* ── kirish ── */
  async function post(path, body) {
    try {
      const r = await api(path, { method: 'POST', body });
      const j = await r.json().catch(() => ({}));
      return r.ok ? Object.assign({ ok: true }, j) : Object.assign({ ok: false, status: r.status, error: j.error || ('Xato ' + r.status), code: j.code || '' }, j.retry_after ? { retry_after: j.retry_after } : {});
    } catch (e) { return { ok: false, status: 0, error: "Server bilan aloqa yo'q", code: e && e.name === 'AbortError' ? 'S3D-NET-102' : 'S3D-NET-101' }; }
  }
  /** email + parol (TZ-09 Q2; admin ham shu) */
  async function login(email, password) {
    const j = await post('/api/login', { email, password });
    if (j.ok) { setAuth(j); if (o.onUser) o.onUser(user, 'login'); }
    return j;
  }
  /** ro'yxat: { email, password, name, phone, shop } */
  async function register(b) {
    const j = await post('/api/register', b);
    if (j.ok) { setAuth(j); if (o.onUser) o.onUser(user, 'login'); }
    return j;
  }
  /** SMS (TZ-07) — Eskiz sozlanmagan dev/test serverida kod javobda keladi (dev_code) */
  const smsSend = (phone) => post('/api/auth/sms/send', { phone });
  async function smsVerify(phone, code, name) {
    const j = await post('/api/auth/sms/verify', { phone, code, name });
    if (j.ok) { setAuth(j); if (o.onUser) o.onUser(user, 'login'); }
    return j;
  }
  /** kirgandan keyin: oxirgi loyihani ochish yoki joriy ishni birinchi loyiha qilib saqlash */
  async function afterLogin(fresh) {
    currentId = ls.get(curKey(user));
    const pend = ls.get(K.pending);
    if (pend && pend.userId === user.id) {                // internetsiz qolgan o'zgarish — avval yuboriladi
      currentId = pend.id || null; ready = true; dirty = true;
      o.applyPayload(pend.body.doc);
      ready = true; dirty = true;
      await flush();
      return;
    }
    if (currentId && await openProject(currentId)) return;
    setCurrent(null);
    ready = true;
    if (fresh) {                                         // joriy ish yo'qolmasin — akkauntga saqlanadi
      const r = await api('/api/projects');
      const list = r.ok ? await r.json() : [];
      if (!list.length && o.hasWork()) { dirty = true; await flush(); }
    }
  }
  function logout(expired) {
    token = null; user = null; ready = false; currentId = null;
    ls.set(K.token, null); ls.set(K.user, null);
    clearTimeout(saveTimer);
    state(null);
    if (o.onUser) o.onUser(null, expired ? 'expired' : 'logout');
  }
  /** saqlangan kirish kalitini tekshirish (sahifa ochilganda) → true agar kirgan bo'lsa */
  async function restore() {
    if (!token) return false;
    const me = await api('/api/me');
    if (me.status === 401 || me.status === 404) { logout(true); return false; }
    if (me.ok) { user = Object.assign({}, user, await me.json()); ls.set(K.user, user); }
    if (o.onUser) o.onUser(user, 'restore');
    await afterLogin(false);
    return true;
  }

  return {
    api, errText, errInfo, changed, flush, openProject, listProjects, removeProject,
    login, register, smsSend, smsVerify, afterLogin, logout, restore, setCurrent,
    /** "Yangi" yoki kompyuterdan yuklash — keyingi saqlash serverda yangi loyiha ochadi */
    resetCurrent() { if (token) setCurrent(null); },
    get token() { return token; },
    get user() { return user; },
    get loggedIn() { return !!token; },
    get currentId() { return currentId; },
    get ready() { return ready; }
  };
}
