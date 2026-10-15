/* Smart3D js/auth.js — telefon + SMS kirish, "Loyihalarim", avtomatik saqlash (TZ-07).
 *
 * Faqat sayt Smart3D serveri orqali ochilganda ishlaydi (/api/health javob bersa) — statik
 * hostingda tugma ko'rinmaydi, ilova avvalgidek ishlaydi.
 * Xavfsiz tartib: kirgan ustaning oxirgi loyihasi AVVAL serverdan yuklanadi, shundan keyingina
 * avtomatik saqlash yoqiladi (namuna oshxona usta loyihasi ustidan yozilmasligi uchun).
 * Internet yo'q bo'lsa — o'zgarish qurilmada navbatda turadi va internet qaytganda yuboriladi.
 */
import { createSession, formatPhone } from './auth-core.js';
export { formatPhone };   // eski import yo'llari buzilmasin

export function createAuth(o) {
  const $ = (s) => document.querySelector(s);
  let serverOk = false;
  let ai = { enabled: false }, aiEngine = '';            // TZ-12: serverdagi AI holati
  let resendTimer = 0;

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

  /* server bilan ishlash — auth-core.js (TZ-09: yangi frontend bilan umumiy) */
  const S = createSession({
    getPayload: o.getPayload, getTotal: o.getTotal, applyPayload: o.applyPayload, hasWork: o.hasWork,
    toast: o.toast, onState: setState,
    onUser(u, why) {
      if (why === 'logout' || why === 'expired') {
        updateBtn();
        if (why === 'expired') o.toast('Kirish muddati tugadi — qayta kiring', 'warn');
        if (!$('#acctModal').hidden) show();
      }
    }
  });
  const api = S.api;
  const changed = () => S.changed();
  const flush = () => S.flush();
  const logout = (expired) => S.logout(expired);

  /* ── loyihalar ── */
  const openProject = (id) => S.openProject(id);
  async function renderList() {
    const box = $('#acctList');
    box.innerHTML = '<small class="muted">Yuklanmoqda…</small>';
    const list = await S.listProjects();
    if (list === null) return;
    const currentId = S.currentId;
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
        await S.removeProject(p.id);
        renderList();
      });
      row.append(info, open, del);
      box.append(row);
    }
  }

  /* ── oyna ── */
  function show() {
    $('#acctModal').hidden = false;
    const inn = S.loggedIn, user = S.user;
    $('#acctLogin').classList.toggle('hidden', inn);
    $('#acctIn').classList.toggle('hidden', !inn);
    $('#acctTitle').textContent = inn ? 'Akkaunt' : 'Kirish';
    $('#acctErr').classList.add('hidden');
    if (inn) {
      $('#acctUser').textContent = `${(user && user.name) || 'Usta'} · ${user && user.phone ? formatPhone(user.phone) : (user && user.email) || ''}${user && user.role === 'admin' ? ' · admin' : ''}`;
      renderList();
    } else {
      /* har ochilganda — oddiy (SMS) rejim; admin rejimi faqat havola bosilganda */
      $('#acctAdminBox').classList.add('hidden');
      $('#acctAdminLogin').classList.add('hidden');
      $('#acctSend').classList.remove('hidden');
      $('#acctPhone').focus();
    }
  }
  function hide() { $('#acctModal').hidden = true; }
  /* TZ-14: admin — email + parol */
  async function adminLogin() {
    const j = await S.login($('#acctEmail').value, $('#acctPass').value);
    if (!j.ok) { showErr(j.error); return; }
    $('#acctPass').value = '';
    updateBtn();
    o.toast('Admin sifatida kirdingiz', 'good');
    await S.afterLogin(false);
    show();
  }
  const showErr = (t) => { const e = $('#acctErr'); e.textContent = '⚠️ ' + t; e.classList.remove('hidden'); };

  async function sendCode() {
    const phone = $('#acctPhone').value;
    $('#acctSend').disabled = true;
    const j = await S.smsSend(phone);
    if (!j.ok) {
      showErr(j.error);
      if (j.status === 0) { $('#acctSend').disabled = false; return; }
      if (j.retry_after) countdown(j.retry_after); else $('#acctSend').disabled = false;
      return;
    }
    $('#acctErr').classList.add('hidden');
    $('#acctCodeRow').classList.remove('hidden');
    $('#acctVerify').classList.remove('hidden');
    /* dev/test serveri: SMS sozlanmagan — kod javobda keladi (production'da hech qachon) */
    $('#acctDev').textContent = j.dev_code ? `Sinov rejimi (SMS sozlanmagan): kod ${j.dev_code}` : 'Kod SMS bilan yuborildi';
    $('#acctCode').focus();
    countdown(60);
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
    $('#acctVerify').disabled = true;
    try {
      const j = await S.smsVerify($('#acctPhone').value, $('#acctCode').value, $('#acctName').value);
      if (!j.ok) { showErr(j.error); return; }
      clearInterval(resendTimer);
      updateBtn();
      o.toast(j.yangi ? 'Akkaunt ochildi — loyihalaringiz endi serverda saqlanadi' : 'Xush kelibsiz!', 'good');
      await S.afterLogin(true);
      show();
    } finally { $('#acctVerify').disabled = false; }
  }
  function updateBtn() {
    const b = $('#acctBtn');
    b.classList.toggle('hidden', !serverOk);
    b.classList.toggle('is-in', S.loggedIn);
    b.title = S.loggedIn ? 'Akkaunt va loyihalarim' : 'Kirish (telefon + SMS)';
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
    $('#acctStd').addEventListener('click', () => { hide(); o.openStandards && o.openStandards(); });
    $('#acctAdminToggle').addEventListener('click', () => {
      const on = $('#acctAdminBox').classList.toggle('hidden') === false;
      $('#acctAdminLogin').classList.toggle('hidden', !on);
      $('#acctSend').classList.toggle('hidden', on);
      $('#acctVerify').classList.add('hidden');
      $('#acctCodeRow').classList.add('hidden');
      (on ? $('#acctEmail') : $('#acctPhone')).focus();
    });
    $('#acctAdminLogin').addEventListener('click', adminLogin);
    await S.restore();
  }

  /** TZ-12: matn → tuzilma (server AI). Kirmagan, AI o'chiq yoki xato — null (qoidali tahlilchi ishlaydi) */
  async function aiParse(text) {
    if (!S.loggedIn || !ai.enabled) return null;
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
    get aiReady() { return !!(S.loggedIn && ai.enabled); },
    get serverOk() { return serverOk; },
    get isAdmin() { const u = S.user; return !!(u && u.role === 'admin'); },
    /** token bilan server so'rovi (TZ-14) */
    apiFetch: (path, opts) => api(path, opts),
    /** "Yangi" yoki kompyuterdan yuklash — keyingi saqlash serverda yangi loyiha ochadi */
    resetCurrent() { S.resetCurrent(); },
    get loggedIn() { return S.loggedIn; }
  };
}
