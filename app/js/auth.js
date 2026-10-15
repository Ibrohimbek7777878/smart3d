/* Smart3D js/auth.js — telefon + SMS kirish, "Loyihalarim", avtomatik saqlash (TZ-07).
 *
 * Faqat sayt Smart3D serveri orqali ochilganda ishlaydi (/api/health javob bersa) — statik
 * hostingda tugma ko'rinmaydi, ilova avvalgidek ishlaydi.
 * Xavfsiz tartib: kirgan ustaning oxirgi loyihasi AVVAL serverdan yuklanadi, shundan keyingina
 * avtomatik saqlash yoqiladi (namuna oshxona usta loyihasi ustidan yozilmasligi uchun).
 * Internet yo'q bo'lsa — o'zgarish qurilmada navbatda turadi va internet qaytganda yuboriladi.
 */
const K = { token: 'smart3d.token', user: 'smart3d.user', pending: 'smart3d.pending' };
const curKey = (u) => 'smart3d.current.' + (u && u.id);
const ls = {
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

export function createAuth(o) {
  const $ = (s) => document.querySelector(s);
  let token = ls.get(K.token), user = ls.get(K.user);
  let serverOk = false, ready = false, currentId = null;
  let ai = { enabled: false }, aiEngine = '';            // TZ-12: serverdagi AI holati
  let saveTimer = 0, saving = false, dirty = false, resendTimer = 0;

  const api = async (path, { method = 'GET', body } = {}) => fetch(path, {
    method, cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const errText = async (r) => { try { return (await r.json()).error || ('Xato ' + r.status); } catch (e) { return 'Xato ' + r.status; } };

  /* ── holat belgisi (topbar) ── */
  function setState(kind, title) {
    const el = $('#saveState');
    if (!el) return;
    el.classList.toggle('hidden', !kind);
    el.dataset.kind = kind || '';
    el.textContent = { ok: '☁ ✓', busy: '☁ …', off: '☁ ✕' }[kind] || '';
    el.title = title || '';
    el.setAttribute('aria-label', title || '');
  }
  const setCurrent = (id) => { currentId = id; ls.set(curKey(user), id); };

  /* ── avtomatik saqlash ── */
  function changed() {
    if (!token || !ready) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 2000);
    setState('busy', 'Saqlanmoqda…');
  }
  async function flush() {
    if (!token || !ready || !dirty) return;
    if (saving) { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 800); return; }
    saving = true; dirty = false;
    const payload = o.getPayload();
    const body = { name: payload.name || 'Loyiha', doc: payload, total_price: Math.round(o.getTotal() || 0) };
    try {
      let r = currentId ? await api('/api/projects/' + currentId, { method: 'PUT', body }) : null;
      if (!r || r.status === 404) {                     // yangi yoki o'chirilgan — yangi loyiha
        r = await api('/api/projects', { method: 'POST', body });
        if (r.ok) setCurrent((await r.json()).id);
      }
      if (r.status === 401) { logout(true); return; }
      if (!r.ok) { setState('off', await errText(r)); return; }
      ls.set(K.pending, null);
      setState('ok', 'Saqlandi — ' + new Date().toLocaleTimeString().slice(0, 5));
    } catch (e) {                                        // tarmoq yo'q — navbatda qoladi
      dirty = true;
      ls.set(K.pending, { userId: user && user.id, id: currentId, body });
      setState('off', "Internet yo'q — o'zgarishlar qurilmada, internet qaytganda saqlanadi");
    } finally { saving = false; }
  }
  window.addEventListener('online', () => { if (token && ready && dirty) flush(); });

  /* ── loyihalar ── */
  async function openProject(id) {
    const r = await api('/api/projects/' + id);
    if (r.status === 401) { logout(true); return false; }
    if (!r.ok) { o.toast(await errText(r), 'bad'); return false; }
    const j = await r.json();
    ready = false;                                       // yuklash paytidagi qayta hisob saqlanmasin
    o.applyPayload(j.doc);
    setCurrent(j.id);
    ready = true; dirty = false;
    setState('ok', 'Serverdan ochildi');
    return true;
  }
  async function renderList() {
    const box = $('#acctList');
    box.innerHTML = '<small class="muted">Yuklanmoqda…</small>';
    const r = await api('/api/projects');
    if (r.status === 401) { logout(true); return; }
    const list = r.ok ? await r.json() : [];
    box.innerHTML = list.length ? '' : '<small class="muted">Hali loyiha yo\'q — chizishni boshlang, o\'zi saqlanadi.</small>';
    for (const p of list) {
      const row = document.createElement('div');
      row.className = 'acct-item' + (p.id === currentId ? ' is-current' : '');
      const info = document.createElement('div');
      const nm = document.createElement('b'); nm.textContent = p.name || 'Loyiha';
      const meta = document.createElement('small');
      meta.textContent = `${o.fmtSum(p.total_price || 0)} · ${String(p.updated_at || '').slice(0, 16).replace('T', ' ')}`;
      info.append(nm, document.createElement('br'), meta);
      const open = document.createElement('button'); open.className = 'btn'; open.textContent = p.id === currentId ? 'Ochiq' : 'Ochish';
      open.disabled = p.id === currentId;
      open.addEventListener('click', async () => { if (await openProject(p.id)) { hide(); o.toast(`"${p.name}" ochildi`, 'good'); } });
      const del = document.createElement('button'); del.className = 'btn ghost'; del.textContent = '🗑'; del.title = "O'chirish (yashirish)";
      del.setAttribute('aria-label', "Loyihani o'chirish");
      del.addEventListener('click', async () => {
        if (!(await o.askConfirm(`"${p.name}" loyihasi ro'yxatdan olib tashlanadi. Davom etasizmi?`, "O'chirish"))) return;
        const d = await api('/api/projects/' + p.id, { method: 'DELETE' });
        if (d.ok && p.id === currentId) setCurrent(null);
        renderList();
      });
      row.append(info, open, del);
      box.append(row);
    }
  }

  /* ── oyna ── */
  function show() {
    $('#acctModal').hidden = false;
    const inn = !!token;
    $('#acctLogin').classList.toggle('hidden', inn);
    $('#acctIn').classList.toggle('hidden', !inn);
    $('#acctTitle').textContent = inn ? 'Akkaunt' : 'Kirish';
    $('#acctErr').classList.add('hidden');
    if (inn) {
      $('#acctUser').textContent = `${(user && user.name) || 'Usta'} · ${formatPhone(user && user.phone)}`;
      renderList();
    } else {
      $('#acctPhone').focus();
    }
  }
  function hide() { $('#acctModal').hidden = true; }
  const showErr = (t) => { const e = $('#acctErr'); e.textContent = '⚠️ ' + t; e.classList.remove('hidden'); };

  async function sendCode() {
    const phone = $('#acctPhone').value;
    $('#acctSend').disabled = true;
    try {
      const r = await api('/api/auth/sms/send', { method: 'POST', body: { phone } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showErr(j.error || ('Xato ' + r.status)); if (j.retry_after) countdown(j.retry_after); else $('#acctSend').disabled = false; return; }
      $('#acctErr').classList.add('hidden');
      $('#acctCodeRow').classList.remove('hidden');
      $('#acctVerify').classList.remove('hidden');
      /* dev/test serveri: SMS sozlanmagan — kod javobda keladi (production'da hech qachon) */
      $('#acctDev').textContent = j.dev_code ? `Sinov rejimi (SMS sozlanmagan): kod ${j.dev_code}` : 'Kod SMS bilan yuborildi';
      $('#acctCode').focus();
      countdown(60);
    } catch (e) { showErr("Server bilan aloqa yo'q"); $('#acctSend').disabled = false; }
  }
  function countdown(sec) {
    clearInterval(resendTimer);
    const b = $('#acctSend');
    let t = sec;
    b.disabled = true; b.textContent = `Qayta yuborish (${t})`;
    resendTimer = setInterval(() => {
      t--; b.textContent = t > 0 ? `Qayta yuborish (${t})` : 'Qayta yuborish';
      if (t <= 0) { clearInterval(resendTimer); b.disabled = false; }
    }, 1000);
  }
  async function verify() {
    const body = { phone: $('#acctPhone').value, code: $('#acctCode').value, name: $('#acctName').value };
    $('#acctVerify').disabled = true;
    try {
      const r = await api('/api/auth/sms/verify', { method: 'POST', body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { showErr(j.error || ('Xato ' + r.status)); return; }
      token = j.token; user = j.user;
      ls.set(K.token, token); ls.set(K.user, user);
      clearInterval(resendTimer);
      updateBtn();
      o.toast(j.yangi ? 'Akkaunt ochildi — loyihalaringiz endi serverda saqlanadi' : 'Xush kelibsiz!', 'good');
      await afterLogin(true);
      show();
    } catch (e) { showErr("Server bilan aloqa yo'q"); }
    finally { $('#acctVerify').disabled = false; }
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
    setState(null);
    updateBtn();
    if (expired) o.toast('Kirish muddati tugadi — qayta kiring', 'warn');
    if (!$('#acctModal').hidden) show();
  }
  function updateBtn() {
    const b = $('#acctBtn');
    b.classList.toggle('hidden', !serverOk);
    b.classList.toggle('is-in', !!token);
    b.title = token ? 'Akkaunt va loyihalarim' : 'Kirish (telefon + SMS)';
    b.setAttribute('aria-label', b.title);
  }

  async function init() {
    if (!location.protocol.startsWith('http')) return;
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      serverOk = r.ok && (r.headers.get('content-type') || '').includes('json');
    } catch (e) { serverOk = false; }
    updateBtn();
    if (!serverOk) return;
    try { ai = await (await fetch('/api/ai/status', { cache: 'no-store' })).json(); } catch (e) { ai = { enabled: false }; }
    $('#acctBtn').addEventListener('click', show);
    $('#acctClose1').addEventListener('click', hide);
    $('#acctClose2').addEventListener('click', hide);
    $('#acctModal').addEventListener('click', (e) => { if (e.target.id === 'acctModal') hide(); });
    $('#acctPhone').addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
    $('#acctSend').addEventListener('click', sendCode);
    $('#acctVerify').addEventListener('click', verify);
    $('#acctCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
    $('#acctLogout').addEventListener('click', async () => { if (await o.askConfirm('Akkauntdan chiqasizmi?', 'Chiqish')) { logout(false); hide(); } });
    $('#acctNew').addEventListener('click', async () => { hide(); await o.newProject(); });
    if (!token) return;
    const me = await api('/api/me');
    if (me.status === 401 || me.status === 404) { logout(true); return; }
    if (me.ok) { user = Object.assign({}, user, await me.json()); ls.set(K.user, user); }
    await afterLogin(false);
  }

  /** TZ-12: matn → tuzilma (server AI). Kirmagan, AI o'chiq yoki xato — null (qoidali tahlilchi ishlaydi) */
  async function aiParse(text) {
    if (!token || !ai.enabled) return null;
    try {
      const r = await api('/api/ai/parse', { method: 'POST', body: { text } });
      if (!r.ok) return null;
      const j = await r.json();
      aiEngine = j.engine || '';
      return j.parsed || null;
    } catch (e) { return null; }
  }

  return {
    init, changed, flush, aiParse,
    get aiEngine() { return aiEngine; },
    get aiReady() { return !!(token && ai.enabled); },
    /** "Yangi" yoki kompyuterdan yuklash — keyingi saqlash serverda yangi loyiha ochadi */
    resetCurrent() { if (token) setCurrent(null); },
    get loggedIn() { return !!token; }
  };
}
