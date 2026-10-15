import React from 'react';
import { s3Load, s3Box, s3Mats, s3Label, s3Viewer, s3Build, s3Apply, s3Spec, s3n, S3_TIPS, s3Thumb } from './engine.js';
import { createSession } from '../../../app/js/auth-core.js';
import { aiBuild, suggestLayout, startVoice, voiceSupported } from '../../../app/js/ai.js';
import { roomBBox } from '../../../app/js/engine/rules.js';
import { loadData, createHisob, baseForSheet, slotForBase } from './bridge/hisob.js';
import * as L from './bridge/loyiha.js';
import { createSahna } from './bridge/sahna.js';
import { ichkiSpec, detalKarta, ichiniKorsaBoladi } from './bridge/ichki.js';
import { eksport } from './bridge/eksport.js';
import AiOyna from './modals/AiOyna.jsx';
import EditorNav from './editor/EditorNav.jsx';
import Header from './shell/Header.jsx';
import IchiniKorish from './modals/IchiniKorish.jsx';
import Kirish from './screens/Kirish.jsx';
import Loyihalar from './screens/Loyihalar.jsx';
import Onboarding from './screens/Onboarding.jsx';
import QadamFayllar from './editor/QadamFayllar.jsx';
import QadamMebel from './editor/QadamMebel.jsx';
import QadamNarx from './editor/QadamNarx.jsx';
import QadamXona from './editor/QadamXona.jsx';
import Sahna from './editor/Sahna.jsx';
import Sozlamalar from './screens/Sozlamalar.jsx';
import Tasdiq from './modals/Tasdiq.jsx';
import Toast from './modals/Toast.jsx';
import Varaqlar from './modals/Varaqlar.jsx';

/* TZ-09: ilova holati va mantiqi. Ekranlar (JSX) — tasdiqlangan dizayndan o'zgarishsiz; ular faqat `v` dan o'qiydi.
 * Ma'lumot HAQIQIY: loyiha (doc) — bridge/loyiha.js, hisob — bridge/hisob.js (eski sayt bilan aynan bir xil),
 * 3D — bizning zamer tizimi dizayn ko'rinishida (bridge/sahna.js), server — auth-core.js. */

const PRESETS = [[3600, 3000, '3.6×3 m'], [4200, 3100, '4.2×3.1 m'], [5000, 4000, '5×4 m'], [6000, 4000, '6×4 m']];
const AI_EX = ['oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf', '4.2x3.1 xona, 1 garderob, 1 stol', '5x4 mehmonxona, divan, 2 ta toko'];
const RANGLAR = ['#FF7A45', '#5FE1C4', '#B9A6FF', '#FFB59A', '#F3F0E9'];    // dizayndagi raskroy ranglari
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* Sozlamalar → stanok profili (server: STANOKLAR bilan bir xil) */
const STANOK = [['dxf', 'DXF', 'raskroy — CNC/lazer'], ['gcode', 'G-code', 'ISO/Fanuc kontur kesish'], ['ptp', 'PTP', 'panel joylashuvi'],
  ['nc', 'NC', 'teshiklar (Excellon)'], ['xnc', 'XNC', 'GibLab Excel importi'], ['altendorf', 'Altendorf', 'formatli arra — fazali kesim']];
const NEST_F = [['kerf', 'Arra qalinligi, mm'], ['trimL', 'Trim (old), mm'], ['trimW', 'Trim (yon), mm'], ['remMinA', 'Qoldiq min A, mm'], ['remMinB', 'Qoldiq min B, mm'], ['remUsableMin', 'Delovoy qoldiq min, m²']];
const STD_LABEL = { w: 'Eni (w)', d: 'Chuqurligi (d)', h: "Bo'yi (h)", uzunlik: 'Asos uzunligi', eni: 'Asos eni' };
const sana = (t) => { const d = new Date(String(t || '').replace(' ', 'T') + (String(t || '').includes('Z') ? '' : 'Z')); return isNaN(d) ? '' : d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'); };

export default class App extends React.Component {
  state = {
    screen: 'reg', f: { name: '', email: '', phone: '', pass: '', shop: '', show: false, err: {}, tried: false }, user: null, save: null,
    onbKind: 'kitchen', step: 2, done: { 1: true }, room: { w: 3600, d: 3000, h: 2700 },
    dv: 0, dataReady: false, dataErr: '', sel: null, part: null, raw: {}, warn: {}, view: '3d', spin: false, tip: 3,
    ai: false, aiText: '', mic: false, cf: null, toast: '', ins: null, insA: { ex: 0, color: 1 },
    cat: 'all', q: '', rk: 0, miss: false, projName: 'Yangi loyiha', pq: '', loaded: false, projects: null,
    matCode: 'LDSP18', fasadCode: 'MDF16', sheet: null,
    sets: { markup_pct: null, stanoklar: null, logo: null }, markupIn: null, nestIn: null, stdIn: null, from: 'projects',
    vq: null   // dizaynda yo'q qismlar: pastdan chiqadigan varaq (teshik, shakl, material, oshxona)
  };
  doc = L.newDoc();
  res = null;
  miniHost = React.createRef(); miniOv = React.createRef(); regHost = React.createRef(); regOv = React.createRef();
  roomHost = React.createRef(); roomOv = React.createRef(); insHost = React.createRef(); insOv = React.createRef();

  /* ── server: auth-core.js (eski sayt bilan umumiy: kirish, avtomatik saqlash, internetsiz navbat, loyihalar) ── */
  S = createSession({
    toast: t => this.toastMsg(t),
    onState: (kind, title) => this.setState({ save: kind ? { kind, title } : null }),
    onUser: (u, why) => { this.setState({ user: u }); if (why === 'expired') { this.toastMsg('Kirish muddati tugadi — qayta kiring'); this.setState({ screen: 'login' }); } },
    getPayload: () => this.projectPayload(), getTotal: () => (this.res ? this.res.priceRes.total : 0),
    applyPayload: (p, meta) => this.applyProject(p, meta), hasWork: () => this.doc.placements.length > 0
  });
  /** saqlanadigan loyiha fayli — eski buildProjectPayload bilan bir xil shakl (eski sayt ham ocha oladi) */
  projectPayload() {
    const s = this.state, sh = s.sheet;
    return { app: 'smart3d', v: 2, ts: Date.now(), name: s.projName, material: s.matCode, fasad: s.fasadCode,
      sheet: sh ? { sku: sh.sku, name: sh.name, type: sh.type, th: sh.th, l: sh.l, w: sh.w, uzs: sh.uzs } : null, doc: this.doc };
  }
  applyProject(p) {
    if (!p || !p.doc) return;
    this.doc = p.doc;
    if (!this.doc.kitchen) this.doc.kitchen = L.freshKitchen();
    this.setState({ projName: p.name || 'Loyiha', matCode: p.material || 'LDSP18', fasadCode: p.fasad || 'MDF16', sheet: p.sheet || null, sel: null, part: null, warn: {} },
      () => this.docChanged('room', true));
  }
  afterAuthState() { return { screen: 'projects' }; }
  async afterLogin() {
    await this.dataP;
    this.loadSettings();
    await this.S.afterLogin(false).catch(() => {});        // internetsiz qolgan o'zgarish — avval yuboriladi
    if (this.state.pending) { this.openPending(); return; }
    this.goProjects();
  }
  async initSession() {
    const S = this.S;
    try { this.aiOn = !!(await (await fetch('/api/ai/status', { cache: 'no-store' })).json()).enabled; } catch (_) { this.aiOn = false; }
    if (!S.loggedIn) return;
    this.setState({ user: S.user });
    try {
      const r = await S.api('/api/me');
      if (r.status === 401 || r.status === 404) { S.logout(true); return; }
      if (r.ok) this.setState({ user: { ...S.user, ...(await r.json()) } });
      this.loadSettings();
    } catch (_) { /* internet yo'q — kirgan holat saqlanadi */ }
    if (this.state.screen === 'reg' || this.state.screen === 'login') this.afterLogin();
  }

  componentDidMount() {
    this.dead = false; document.body.style.background = '#0F2229';
    window.__app = this;                                // QA uchun (eski saytdagi __s3d kabi)
    this.dataP = loadData().then(d => { this.H = createHisob(d); this.est = L.createEstimator(this.H); this.setState({ dataReady: true }); this.loadServerStd(); })
      .catch(e => { console.warn('data', e); this.setState({ dataErr: 'Ma\'lumot yuklanmadi — internetni tekshiring' }); });
    this.readHandoff(); this.initSession();
    this.onHash = () => this.readHandoff(); window.addEventListener('hashchange', this.onHash);
    s3Load().then(T => { if (this.dead) return; this.T = T; this.setState({ loaded: true }, () => this.sync()); }).catch(e => console.warn('three load failed', e));
  }
  componentWillUnmount() {
    this.dead = true; window.removeEventListener('hashchange', this.onHash); clearTimeout(this.tT); clearTimeout(this.rT);
    ['vReg', 'vIns', 'vMini'].forEach(k => this[k] && this[k].dispose()); if (this.sahna) this.sahna.dispose();
  }
  componentDidUpdate(_, p) {
    const s = this.state;
    this.sync();
    if (this.sahna) {
      if (s.view !== p.view) this.sahna.setMode(s.view);
      if (s.spin !== p.spin) this.sahna.spin(s.spin);
      if (s.sel !== p.sel) this.sahna.select(s.sel);
    }
  }

  /* ── 3D ko'rinishlar: sahna (bizning tizim), ro'yxat oynasi animatsiyasi, "Ichini ko'rish", detal mini-3D ── */
  sync() {
    const s = this.state;
    const roomEl = this.roomHost.current;
    if (this.sahna && (s.screen !== 'app' || this.sahna.host !== roomEl)) { this.sahna.dispose(); this.sahna = null; }
    if (!this.sahna && s.screen === 'app' && s.dataReady && roomEl) {
      try {
        this.sahna = createSahna(roomEl, {
          getPlacements: () => this.H.viewPlacements(this.doc),
          onSelect: (id) => { if (this.state.sel !== id) this.setState({ sel: id || null, raw: {}, part: null }); if (id && this.state.tip === 0) this.setState({ tip: 1 }); },
          onDrag: (id, x, y) => { const p = this.pl(id); if (p) { p.x = x; p.y = y; this.scheduleRecalc(); } },
          onRotate: (id, rot, x, y) => { const p = this.pl(id); if (p) { p.rot = rot; p.x = x; p.y = y; this.scheduleRecalc(); } },
          onRotateEnd: () => this.docChanged('items'),
          onTap: (id, part) => this.roomTap(id, part)
        });
        this.sahna.host = roomEl;
        this.sahna.setDoc(this.doc, this.H.viewPlacements(this.doc), this.H.catalog);
        this.sahna.setMode(s.view);
        this.sahna.center();                                 // dizayndagi boshlang'ich ko'rinish (camHome)
        if (s.sel) this.sahna.select(s.sel);
        this.forceUpdate();
      } catch (e) { console.warn('sahna', e); }
    }
    if (!this.T) return;
    const T = this.T;
    if (this.vMini && (!s.part || this.vMini.pid !== s.part.id)) { this.vMini.dispose(); this.vMini = null; }
    const want = { vReg: s.screen === 'reg' || s.screen === 'login', vIns: !!s.ins, vMini: s.screen === 'app' && !!s.part };
    const hosts = { vReg: [this.regHost, this.regOv], vIns: [this.insHost, this.insOv], vMini: [this.miniHost, this.miniOv] };
    for (const k in want) {
      const h = hosts[k][0].current;
      if (this[k] && (!want[k] || !h || this[k].host !== h)) { this[k].dispose(); this[k] = null; }
      if (want[k] && h && !this[k]) { try { this['init_' + k](T, h, hosts[k][1].current); } catch (e) { console.warn(k, e); } }
    }
  }
  /* ro'yxat oynasidagi aylanuvchi shkaf — dizayn animatsiyasi (marketing namunasi, o'zgarishsiz) */
  init_vReg(T, h, o) {
    const v = s3Viewer(T, h, o); this.vReg = v; v.pC = new T.Plane(new T.Vector3(0, -1, 0), 0); v.pP = new T.Plane(new T.Vector3(0, 1, 0), 0); v.M = s3Mats(T, [v.pC], [v.pP]);
    const m = s3Build(T, v, s3Spec('kp', 600), false); v.dist = 2.6; v.phi = .28; const a = { color: 1, explode: 0, hw: 1, count: 1 };
    v.onTick = (dt, t) => { a.explode = (Math.sin(t * .7 - 1.5) * .5 + .5) * .75; s3Apply(v, m, a); for (const Lb of v.labels) Lb.op = 0; };
  }
  /* detal kartasi: aylanuvchi mini-3D (dizayn kodi), o'lcham — haqiqiy */
  init_vMini(T, h, o) {
    const P = this.state.part, v = s3Viewer(T, h, o); this.vMini = v; v.pid = P.id; v.M = s3Mats(T, null, null); v.grid.visible = false; v.shadow.visible = false;
    const s = P.size.map(x => x / 1000), geo = s3Box(T, s[0], s[1], s[2]), mt = P.mk === 'glass' ? new T.MeshStandardMaterial({ color: 0x6FA3AA, roughness: .2 }) : v.M[P.mk]();
    const g = new T.Group(); g.add(new T.Mesh(geo, mt), new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xFF7A45 }))); v.root.add(g);
    v.target.set(0, 0, 0); v.dist = Math.max(...s) * 2.5 + .12; const tn = s.indexOf(Math.min(...s)); v.phi = tn === 1 ? .9 : .32; v.theta = tn === 0 ? 1.05 : -.5; v.auto = true;
    const an = (x, y, z) => { const q = new T.Object3D(); q.position.set(x, y, z); g.add(q); return q; };
    if (P.size[0] >= 30) s3Label(v, Math.round(P.size[0]) + '', '', an(0, -s[1] / 2 - .02, s[2] / 2 + .02), 'dim').op = 1;
    if (P.size[1] >= 30) s3Label(v, Math.round(P.size[1]) + '', '', an(s[0] / 2 + .03, 0, s[2] / 2), 'dim').op = 1;
    if (P.size[2] >= 30) s3Label(v, Math.round(P.size[2]) + '', '', an(s[0] / 2 + .03, -s[1] / 2, 0), 'dim').op = 1;
  }
  /* "Ichini ko'rish": dizayn ko'rinishi, panellar — assembler.js, son — kesim ro'yxati (Q6) */
  insSpecOf(id) {
    const p = this.pl(id), frag = p && this.H.catalog[p.frg];
    if (!frag) return null;
    const cl = this.res && this.res.cutlists.find(c => c.placementId === id);
    return ichkiSpec(frag, p.w, p.d, p.h, cl);
  }
  init_vIns(T, h, o) {
    const spec = this.insSpecOf(this.state.ins); if (!spec) return;
    const v = s3Viewer(T, h, o); this.vIns = v; v.columns = true; v.colTop = 80; v.colBot = 90; v.pC = new T.Plane(new T.Vector3(0, -1, 0), 0); v.pP = new T.Plane(new T.Vector3(0, 1, 0), 0); v.M = s3Mats(T, [v.pC], [v.pP]);
    const b = s3Build(T, v, spec, false); v.dist *= 1.3;
    const a = { color: 1, explode: 0, hw: 0, count: 1 }; this.insT0 = performance.now();
    v.onTick = (dt) => {
      const st = this.state.insA, age = (performance.now() - this.insT0) / 1000;
      let ex = st.ex / 100; if (this.insAuto) ex = Math.min(1, Math.max(0, (age - .6) / 1.4)); const k = 1 - Math.exp(-dt * 5);
      a.explode += (ex - a.explode) * k; a.color += (st.color - a.color) * k; a.hw += ((age > 1.4 ? 1 : 0) - a.hw) * k; s3Apply(v, b, a);
      if (this.insAuto && age > 2.2) { this.insAuto = false; this.setState({ insA: { ...this.state.insA, ex: 100 } }); }
    };
  }

  /* ── loyiha ── */
  pl(id) { return this.doc.placements.find(p => p.id === id) || null; }
  fr(p) { return (p && this.H && this.H.catalog[p.frg]) || null; }
  /** loyiha o'zgardi: 'room' — devorlar ham, 'items' — faqat mebel; keyin hisob */
  docChanged(kind, now) {
    if (this.sahna && this.H) {
      if (kind === 'room') { this.sahna.setDoc(this.doc, this.H.viewPlacements(this.doc), this.H.catalog); this.sahna.center(); }   // dizayn: xona o'zgarsa — camHome
      else this.sahna.setPlacements(this.H.viewPlacements(this.doc), this.H.catalog);
    }
    this.scheduleRecalc(now);
  }
  scheduleRecalc(now) { clearTimeout(this.rT); if (now) this.recalc(); else this.rT = setTimeout(() => this.recalc(), 220); }
  recalc() {
    if (!this.H) return;
    const s = this.state;
    try { this.res = this.H.recalc(this.doc, { materialCode: s.matCode, fasadCode: s.fasadCode, sheet: s.sheet, nestCfg: this.nestCfg(), markupPct: s.sets.markup_pct }); }
    catch (e) { console.warn('hisob', e); }
    this.setState({ dv: s.dv + 1 });
    this.S.changed();                                   // kirgan bo'lsa — 2 soniyadan keyin serverga saqlanadi
  }
  nestCfg() { const c = Object.assign({}, this.H.nestDefaults); try { Object.assign(c, JSON.parse(localStorage.getItem('s3d-nest-cfg') || 'null') || {}); } catch (_) {} delete c._meta; return c; }
  matName(code) { const m = (this.H.materials.panel_materials || []).find(x => x.code === code); return m ? m.name : code; }
  select(id) { this.setState({ sel: id || null, raw: {}, part: null }); if (this.sahna) { this.sahna.select(id || null); this.sahna.items.setFocus(null); } }
  /** sahnada tegish — dizayndagi roomClick: avval modul, keyin eshik ochiladi, keyin detal kartasi */
  roomTap(id, part) {
    const s = this.state, it = this.sahna && this.sahna.items;
    if (!id) { this.select(null); return; }
    if (s.sel !== id) { this.select(id); return; }
    if (!part) return;
    if (part.key && !it.isOpen(part.key) && !s.part) { it.setOpen([part.key], true); this.forceUpdate(); return; }
    const frag = this.fr(this.pl(id)) || {};
    const names = { korpus: this.matName(s.matCode), polka: this.matName(s.matCode), fasad: this.matName(s.fasadCode), orqa: this.matName('HDF3') };
    this.setState({ part: detalKarta(part, frag, names) });
    it.setFocus(id, part.id);
  }
  /** yangi loyiha: xona (onboarding) + oshxona tanlansa — eski saytdagi namuna (3 pastki + 2 ustki) */
  newProjectDoc() {
    const s = this.state, room = L.freshRoom();
    room.outline = L.rectOutline(s.room.w, s.room.d); room.wall_height = s.room.h;
    const doc = L.newDoc(room);
    if (s.onbKind === 'kitchen' && this.H) {
      doc.placements = suggestLayout({ w: s.room.w, d: s.room.d }, this.H.catalog, [{ kind: 'pastki', qty: 3 }, { kind: 'ustki', qty: 2 }])
        .filter(p => this.H.catalog[p.frg]);
    }
    return doc;
  }
  async openEditor() {
    await this.dataP;
    if (!this.H) return;
    this.S.resetCurrent();
    if (this.state.onbKind === 'ai' && this.state.aiText.trim()) { this.doc = L.newDoc(); await this.runAI(true); }
    else this.doc = this.newProjectDoc();
    this.setState({ screen: 'app', step: 2, done: { 1: true }, tip: 0, sel: null, part: null, warn: {} }, () => { this.docChanged('room', true); this.applyPending(); });
  }
  /** saytdagi "Bu modulni loyihamga qo'shish" — haqiqiy katalogdan, chegarasiga keltirilgan eni bilan */
  applyPending() {
    const pd = this.state.pending; if (!pd || !this.H) return;
    const frag = this.H.catalog[pd.mod]; this.setState({ pending: null }); if (!frag) return;
    const p = L.addPlacement(this.doc, frag);
    const warn = L.setSize(p, frag, 'w', pd.w);
    this.setState({ sel: p.id, warn: warn ? { ...this.state.warn, [p.id]: warn } : this.state.warn });
    this.docChanged('items', true);
    setTimeout(() => this.toastMsg('Saytdagi modul loyihaga qo\'shildi: ' + pd.mod + ' · ' + p.w + ' mm'), 400);
  }
  async openPending() {
    await this.dataP; if (!this.H) return;
    this.S.resetCurrent(); this.doc = L.newDoc();
    this.setState({ screen: 'app', step: 2, done: { 1: true }, tip: 3, projName: 'Yangi loyiha' }, () => { this.docChanged('room', true); this.applyPending(); });
  }
  async goProjects() {
    this.setState({ screen: 'projects', sel: null, part: null });
    if (!this.S.loggedIn) { this.setState({ projects: [] }); return; }
    const list = await this.S.listProjects().catch(() => null);
    if (list) this.setState({ projects: list });
  }
  async openProject(id) {
    await this.dataP;
    if (await this.S.openProject(id)) this.setState({ screen: 'app', step: 2, done: { 1: true }, tip: 3 }, () => this.docChanged('room', true));
  }
  newProject() {
    this.S.resetCurrent(); this.doc = L.newDoc(); this.res = null;
    this.setState({ screen: 'onb1', projName: 'Yangi loyiha', sel: null, part: null, warn: {} });
  }

  /* ── AI (TZ-12): server AI (kirgan va yoqilgan bo'lsa) yoki qoidali tahlilchi ── */
  async aiParse(text) {
    if (!this.S.loggedIn || !this.aiOn) return null;
    try { const r = await this.S.api('/api/ai/parse', { method: 'POST', body: { text } }); if (!r.ok) return null; const j = await r.json(); this.aiEngine = j.engine || ''; return j.parsed || null; }
    catch (_) { return null; }
  }
  async runAI(silent) {
    const text = this.state.aiText.trim();
    if (!text) { this.toastMsg('Avval matn yozing yoki ovozni bosing'); return; }
    try {
      const res = await aiBuild(text, this.H.catalog, { llm: (t) => this.aiParse(t) });
      res.doc.placements = res.doc.placements.filter(p => this.H.catalog[p.frg]);
      res.doc.room.utilities = (this.doc.room && this.doc.room.utilities) || [];
      res.doc.kitchen = this.doc.kitchen || L.freshKitchen();
      this.doc = res.doc;
      this.setState({ ai: false, mic: false, sel: null, part: null, warn: {} });
      this.docChanged('room', true);
      const bb = roomBBox(res.doc.room.outline);
      this.toastMsg(res.assumed ? '⚠️ Xona o\'lchami tushunilmadi — 3600×2800 mm taxmin qilindi'
        : '🪄 AI loyihani qurdi: ' + res.doc.placements.length + ' modul · ' + Math.round(bb.w) + '×' + Math.round(bb.h) + ' mm' + (res.unknown.length ? ' · tushunilmadi: ' + res.unknown.join(', ') : ''));
    } catch (e) { if (!silent) this.toastMsg('AI xato: ' + e.message); }
  }
  toggleMic() {
    if (this.voice) { this.voice.stop(); this.voice = null; this.setState({ mic: false }); return; }
    if (!voiceSupported()) { this.toastMsg('Bu brauzer ovozni qo\'llab-quvvatlamaydi (Chrome/Edge kiriting)'); return; }
    const ERR = { 'not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)', 'service-not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)', 'audio-capture': 'Mikrofon topilmadi', network: 'Ovoz xizmati uchun internet kerak' };
    let triedRu = false;
    const start = (lang) => startVoice({
      lang, onText: (t) => this.setState({ aiText: t }),
      onEnd: (err) => {
        if (this.voice !== rec) return;
        if (err === 'language-not-supported' && !triedRu) { triedRu = true; rec = start('ru-RU'); this.voice = rec; return; }
        this.voice = null; this.setState({ mic: false });
        if (err && err !== 'no-speech' && err !== 'aborted') this.toastMsg(ERR[err] || ('Ovoz xatosi: ' + err));
      }
    });
    let rec = start('uz-UZ'); this.voice = rec;
    this.setState({ mic: !!rec });
  }

  readHandoff() {
    let h = (location.hash || '').replace(/^#/, ''); if (!h) { try { h = sessionStorage.getItem('s3d-handoff') || ''; } catch (_) {} }
    try { sessionStorage.removeItem('s3d-handoff'); } catch (_) {} if (!h) return;
    const q = new URLSearchParams(h.includes('=') ? h : 's=' + h), s = q.get('s'); const st = {};
    if (s === 'login' || s === 'reg') st.screen = s;
    const mod = q.get('mod'); if (mod) st.pending = { mod, w: +q.get('w') || 0 };
    /* shu qurilmada avval kirilgan bo'lsa — kirish oynasi, email tayyor (dizayndagi xatti-harakat, haqiqiy akkaunt bilan) */
    let last = ''; try { last = localStorage.getItem('s3d-last-email') || ''; } catch (_) {}
    if (last && s === 'reg' && !mod) st.screen = 'login';
    if (last) st.f = { ...this.state.f, email: last };
    this.setState(st, () => { if (this.S.loggedIn && (this.state.screen === 'reg' || this.state.screen === 'login')) this.afterLogin(); });
  }
  toastMsg(t) { clearTimeout(this.tT); this.setState({ toast: t }); this.tT = setTimeout(() => this.setState({ toast: '' }), 3000); }
  confirm(o) { this.setState({ cf: o }); }
  goStep(n) { this.setState(s => { const done = { ...s.done }; for (let i = 1; i < n; i++) done[i] = true; return { step: n, done }; }); }

  /* TZ-09 Q2: email + parol (server: /api/register, /api/login). SMS (TZ-07) auth-core.js da tayyor — Eskiz kelgach yoqiladi */
  async submitAuth() {
    const s = this.state, f = s.f, reg = s.screen === 'reg', e = {}, em = f.email.trim();
    if (reg && !f.name.trim()) e.name = 'Ismingizni yozing';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) e.email = 'Emailni to\'g\'ri yozing';
    if (reg && f.phone.length !== 9) e.phone = 'Telefon 9 raqam bo\'lishi kerak';
    if (f.pass.length < 8) e.pass = 'Parol kamida 8 belgi';
    if (Object.keys(e).length) { this.setState({ f: { ...f, err: e, tried: true } }); return; }
    if (this.authBusy) return; this.authBusy = true;
    const j = reg ? await this.S.register({ email: em, password: f.pass, name: f.name.trim(), phone: '998' + f.phone, shop: f.shop.trim() })
      : await this.S.login(em, f.pass);
    this.authBusy = false;
    if (!j.ok) {
      if (j.status === 0) { this.toastMsg('Server bilan aloqa yo\'q — internetni tekshiring'); return; }
      const t = String(j.error || '');
      if (j.status === 409) (/telefon/i.test(t) ? e.phone = 'Bu raqam bilan akkaunt bor — kirish' : e.email = 'Bu email bilan akkaunt bor — kirish');
      else if (j.status === 401) e.pass = 'Email yoki parol noto\'g\'ri';
      else if (/parol/i.test(t)) e.pass = t; else if (/telefon/i.test(t)) e.phone = t; else if (/ism/i.test(t)) e.name = t; else e.email = t;
      this.setState({ f: { ...f, err: e, tried: true } }); return;
    }
    try { localStorage.setItem('s3d-last-email', em); } catch (_) {}
    const name = (j.user && j.user.name) || f.name;
    this.setState({ f: { ...f, name, pass: '', err: {} }, user: j.user });
    if (reg) { await this.S.afterLogin(true).catch(() => {}); if (this.state.pending) { this.openPending(); return; } this.setState({ screen: 'onb1' }); }
    else this.afterLogin();
  }

  /* ── Sozlamalar (TZ-09 4.1): server — kirgan bo'lsa, aks holda qurilmada ── */
  async loadSettings() {
    let v = null;
    if (this.S.loggedIn) { try { const r = await this.S.api('/api/settings'); if (r.ok) v = await r.json(); } catch (_) {} }
    if (!v) { try { v = JSON.parse(localStorage.getItem('s3d-settings') || 'null'); } catch (_) {} }
    if (v) this.setState({ sets: { markup_pct: v.markup_pct ?? null, stanoklar: v.stanoklar ?? null, logo: v.logo ?? null } }, () => this.scheduleRecalc(true));
  }
  async saveSettings(patch) {
    const next = { ...this.state.sets, ...patch };
    if (this.S.loggedIn) {
      try {
        const r = await this.S.api('/api/settings', { method: 'PUT', body: next });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { this.toastMsg('⚠️ ' + (j.error || ('Xato ' + r.status))); return false; }
      } catch (_) { this.toastMsg('Server bilan aloqa yo\'q — sozlama saqlanmadi'); return false; }
    } else { try { localStorage.setItem('s3d-settings', JSON.stringify(next)); } catch (_) {} }
    this.setState({ sets: next }, () => this.scheduleRecalc(true));
    return true;
  }
  /** admin o'zgartirgan sex standartlari (TZ-14) — server bo'lsa undan, aks holda fayldagi */
  async loadServerStd() {
    try {
      const r = await fetch('/api/sex-standartlari', { cache: 'no-store' });
      if (r.ok && this.H.applyStandards(await r.json())) { this.est = L.createEstimator(this.H); this.scheduleRecalc(true); }
    } catch (_) { /* server yo'q — fayldagi standartlar */ }
  }
  openSettings(section) {
    const s = this.state;
    this.setState({ screen: 'settings', from: s.screen === 'settings' ? s.from : s.screen, sel: null, part: null, markupIn: null, nestIn: null, stdIn: null }, () => {
      if (section) setTimeout(() => { const el = document.querySelector('[data-set="' + section + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    });
  }

  /** eksport konteksti (bridge/eksport.js) */
  ctx() {
    const s = this.state;
    return { doc: this.doc, H: this.H, res: this.res, name: s.projName, matCode: s.matCode, fasadCode: s.fasadCode, sheet: s.sheet,
      nestCfg: this.H ? this.nestCfg() : {}, sp: this.sahna && this.sahna.sp, toast: t => this.toastMsg(t), logo: s.sets.logo };
  }
  fayl(k) { if (this.H) eksport[k](this.ctx()); }

  /* ── modul kartasi ── */
  setDimP(key, val) {
    const p = this.pl(this.state.sel), frag = this.fr(p); if (!p || !frag) return;
    const warn = L.setSize(p, frag, key, val);
    this.setState(st => ({ warn: { ...st.warn, [p.id]: warn }, raw: { ...st.raw, [key]: undefined } }));
    this.docChanged('items');
  }

  /* ── 8-bosqich: dizaynda yo'q qismlar — varaqlar (modals/Varaqlar.jsx) ── */
  openVaraq(kind, extra) {
    const doc = this.doc, k = doc.kitchen || L.freshKitchen(), m = k.moyka || {};
    const init = {
      teshik: { tur: 'window', wall: 0, width: 1200, offset: 500, z: 1000 },
      shakl: { pts: (doc.room.outline || []).map(p => [String(p[0]), String(p[1])]) },
      material: { slot: 'matCode', q: '' },
      oshxona: { doborH: k.doborH || 60, karnizH: k.karnizH || 60, size: m.size || 500, offset: m.offset ?? 600, fromBack: m.fromBack ?? 100 }
    }[kind];
    this.setState({ vq: { kind, ...init, ...(extra || {}) } });
  }
  sheetVals() {
    const s = this.state, q = s.vq, doc = this.doc, H = this.H;
    if (!q || !H) return { on: false };
    const set = (patch) => this.setState({ vq: { ...q, ...patch } });
    const num = (v) => Number(String(v).replace(',', '.'));
    const close = () => this.setState({ vq: null });
    if (q.kind === 'teshik') {
      const pts = doc.room.outline || [], util = q.tur === 'pipe' || q.tur === 'outlet';
      const T = [['window', 'Deraza'], ['door', 'Eshik'], ['pipe', 'Quvur'], ['outlet', 'Rozetka']];
      return { on: true, kind: 'teshik', title: 'Teshiklar', close,
        turlar: T.map(([k, l]) => ({ label: l, on: q.tur === k, pick: () => set({ tur: k }) })),
        devorlar: pts.map((_, i) => ({ label: (i + 1) + '-devor · ' + Math.round(L.wallLen(doc, i)) + ' mm', on: q.wall === i, pick: () => set({ wall: i }) })),
        maydonlar: util
          ? [{ label: 'Devor boshidan, mm', val: q.offset, on: ev => set({ offset: ev.target.value }) }, { label: 'Balandlik, mm', val: q.z, on: ev => set({ z: ev.target.value }) }]
          : [{ label: 'Kenglik, mm', val: q.width, on: ev => set({ width: ev.target.value }) }],
        qosh: () => {
          const r = util ? L.addUtility(doc, { wall: q.wall, type: q.tur, offset: num(q.offset), z: num(q.z) }) : L.addOpening(doc, { wall: q.wall, type: q.tur, width: num(q.width) });
          if (!r) { this.toastMsg('Devor juda qisqa — kenglikni kamaytiring'); return; }
          this.docChanged('room', true); this.forceUpdate(); this.toastMsg(T.find(t => t[0] === q.tur)[1] + ' qo\'shildi');
        },
        royxat: [...(doc.room.openings || []).map((o, i) => ({ t: o.type === 'window' ? 'Deraza' : 'Eshik', d: (o.width || 0) + ' mm · ' + (+o.wall + 1) + '-devor',
          del: () => { doc.room.openings.splice(i, 1); this.docChanged('room', true); this.forceUpdate(); } })),
          ...(doc.room.utilities || []).map((u, i) => ({ t: u.type === 'outlet' ? 'Rozetka' : 'Quvur', d: (+u.wall + 1) + '-devor · ' + (u.offset || 0) + ' mm · h ' + (u.z || 0),
            del: () => { doc.room.utilities.splice(i, 1); this.docChanged('room', true); this.forceUpdate(); } }))] };
    }
    if (q.kind === 'shakl') {
      const pts = q.pts;
      return { on: true, kind: 'shakl', title: '✎ Erkin shakl', close,
        nuqtalar: pts.map((p, i) => ({ x: p[0], y: p[1], canDel: pts.length > 3,
          onX: ev => set({ pts: pts.map((r, j) => j === i ? [ev.target.value, r[1]] : r) }), onY: ev => set({ pts: pts.map((r, j) => j === i ? [r[0], ev.target.value] : r) }),
          del: () => { if (pts.length > 3) set({ pts: pts.filter((_, j) => j !== i) }); } })),
        qoshNuqta: () => { const l = pts[pts.length - 1] || ['0', '0']; set({ pts: pts.concat([[String(num(l[0]) + 500), l[1]]]) }); },
        lShakl: () => set({ pts: L.L_OUTLINE.map(p => [String(p[0]), String(p[1])]) }),
        qolla: () => {
          const o = pts.map(p => [Math.round(num(p[0])), Math.round(num(p[1]))]);
          if (o.length < 3 || o.some(p => !isFinite(p[0]) || !isFinite(p[1]))) { this.toastMsg('Kamida 3 ta to\'g\'ri nuqta kiriting'); return; }
          L.applyRoom(doc, { outline: o }); this.docChanged('room', true); close();
          const b = roomBBox(o); this.toastMsg('Xona: ' + o.length + ' nuqta · ' + Math.round(b.w) + '×' + Math.round(b.h) + ' mm');
        } };
    }
    if (q.kind === 'material') {
      const pm = (H.materials.panel_materials || []).filter(m => /^(LDSP|LMDF|MDF|OSB)/.test(m.code));
      const all = (H.sheetCatalog && H.sheetCatalog.sheets) || [];
      const same = (a, b) => a && b && ((a.sku && a.sku === b.sku && a.name === b.name) || (a.name === b.name && a.type === b.type));
      return { on: true, kind: 'material', title: q.slot === 'matCode' ? 'Korpus materiali' : 'Fasad materiali', close,
        turlar: pm.map(m => ({ label: m.name, on: s[q.slot] === m.code, pick: () => { this.setState({ [q.slot]: m.code, sheet: null }, () => this.scheduleRecalc(true)); this.toastMsg((q.slot === 'matCode' ? 'Korpus' : 'Fasad') + ': ' + m.name + ' — narx yangilandi'); } })),
        q: q.q, onQ: ev => set({ q: ev.target.value }), demoOn: !s.sheet,
        demo: () => { this.setState({ sheet: null }, () => this.scheduleRecalc(true)); this.toastMsg('Bazaviy narx (materials.json)'); },
        plitalar: L.plitaRoyxati(H, q.q, s[q.slot]).slice(0, 80).map(({ s: sh }) => ({
          name: (sh.id ? '[' + sh.id + '] ' : '') + sh.name, sub: [sh.sku, sh.th ? sh.th + ' mm' : '', sh.l && sh.w ? sh.l + '×' + sh.w : ''].filter(Boolean).join(' · '),
          price: sh.uzs > 0 ? s3n(sh.uzs) + ' so\'m' : 'narx yo\'q', on: same(s.sheet, sh),
          pick: () => {
            const base = baseForSheet(sh), slot = slotForBase(base), st = { sheet: sh };
            if (slot === 'korpus') st.matCode = base; else if (slot === 'fasad') st.fasadCode = base;
            this.setState(st, () => this.scheduleRecalc(true));
            this.toastMsg(slot ? 'Real material (' + slot + '): ' + sh.name : sh.name + ' — korpus/fasad uchun emas, faqat narx bazasi');
          } })) };
    }
    if (q.kind === 'oshxona') {
      const F = [['doborH', 'Dobor balandligi, mm'], ['karnizH', 'Karniz balandligi, mm'], ['size', 'Moyka kesimi, mm'], ['offset', 'Moyka — chapdan, mm'], ['fromBack', 'Moyka — devordan, mm']];
      return { on: true, kind: 'oshxona', title: 'Oshxona elementlari', close,
        maydonlar: F.map(([k, l]) => ({ label: l, val: q[k], on: ev => set({ [k]: ev.target.value }) })),
        saqla: () => {   /* eski kitchenApply chegaralari bilan bir xil */
          const kk = doc.kitchen || (doc.kitchen = L.freshKitchen()), m = kk.moyka || (kk.moyka = { on: false, offset: 600, fromBack: 100, size: 500 });
          kk.doborH = Math.max(30, num(q.doborH) || 60); kk.karnizH = Math.max(30, num(q.karnizH) || 60);
          m.size = Math.max(300, Math.min(900, num(q.size) || 0) || 500); m.offset = Math.max(0, num(q.offset) || 0); m.fromBack = Math.max(0, num(q.fromBack) || 0);
          this.docChanged('room', true); close(); this.toastMsg('Oshxona elementlari saqlandi');
        } };
    }
    return { on: false };
  }

  /** Sozlamalar sahifasi qiymatlari */
  setVals() {
    const s = this.state, H = this.H, u = s.user || {}, admin = u.role === 'admin';
    if (s.screen !== 'settings') return {};
    const std = (H && H.sexStd && H.sexStd.modullar) || {};
    const stdIn = s.stdIn || Object.fromEntries(Object.entries(std).map(([t, m]) => [t, Object.fromEntries(Object.keys(STD_LABEL).filter(k => m[k]).map(k => [k, { min: m[k].min ?? '', max: m[k].max ?? '' }]))]));
    const nc = s.nestIn || (H ? this.nestCfg() : {});
    const std0 = H ? Math.round(((H.materials.pricing && H.materials.pricing.markup_pct) ?? 0.35) * 100) : 35;
    const tel = String(u.phone || '').replace(/^998/, '');
    return {
      back: () => (s.from === 'app' ? this.setState({ screen: 'app' }, () => this.docChanged('room', true)) : this.goProjects()),
      backLabel: s.from === 'app' ? '← Muharrirga' : '← Loyihalarim',
      akkaunt: [['Ism', u.name || '—'], ['Email', u.email || '—'], ['Telefon', tel ? '+998 ' + [tel.slice(0, 2), tel.slice(2, 5), tel.slice(5, 7), tel.slice(7, 9)].join(' ') : '—'], ['Sex nomi', u.shop || '—']].concat(admin ? [['Rol', 'admin']] : []),
      logout: () => this.confirm({ title: 'Akkauntdan chiqasizmi?', text: 'Loyihalaringiz serverda saqlangan — qayta kirganda ochiladi.', ok: 'Chiqish', danger: true,
        yes: () => { this.S.logout(false); this.setState({ screen: 'login', projects: null, sets: { markup_pct: null, stanoklar: null, logo: null } }); } }),
      markup: s.markupIn ?? (s.sets.markup_pct != null ? Math.round(s.sets.markup_pct * 1000) / 10 : ''), markupPh: std0 + ' (standart)', markupStd: std0,
      onMarkup: ev => this.setState({ markupIn: ev.target.value }),
      saveMarkup: async () => {
        if (s.markupIn == null) return;
        const t = String(s.markupIn).trim(), n = Number(t.replace(',', '.'));
        if (t !== '' && !(n >= 0 && n <= 300)) { this.toastMsg('Ustama 0–300% oralig\'ida bo\'lsin'); return; }
        if (await this.saveSettings({ markup_pct: t === '' ? null : Math.round(n * 10) / 1000 })) { this.setState({ markupIn: null }); this.toastMsg('Ustama saqlandi — narx yangilandi'); }
      },
      enter: ev => { if (ev.key === 'Enter') ev.target.blur(); },
      logo: s.sets.logo,
      onLogo: ev => {
        const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
        if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { this.toastMsg('Faqat PNG, JPEG yoki WEBP'); return; }
        if (f.size > 300 * 1024) { this.toastMsg('Logo 300 KB dan kichik bo\'lsin'); return; }
        const rd = new FileReader();
        rd.onload = async () => { if (await this.saveSettings({ logo: String(rd.result) })) this.toastMsg('Sex logosi saqlandi'); };
        rd.readAsDataURL(f);
      },
      removeLogo: async () => { if (await this.saveSettings({ logo: null })) this.toastMsg('Sex logosi olib tashlandi'); },
      stanoklar: STANOK.map(([k, l, sub]) => { const on = !s.sets.stanoklar || s.sets.stanoklar.includes(k);
        return { label: l, sub, on, flip: () => { const cur = s.sets.stanoklar || STANOK.map(x => x[0]); this.saveSettings({ stanoklar: on ? cur.filter(x => x !== k) : cur.concat(k) }); } }; }),
      modes: [['bssf', 'Guillotine (BSSF)'], ['strip', 'Lenta (LSTR)']].map(([k, l]) => ({ label: l, on: nc.mode === k, pick: () => this.setState({ nestIn: { ...nc, mode: k } }) })),
      rots: [[1, 'Yo\'q — tekstura'], [2, '90° — zichroq']].map(([k, l]) => ({ label: l, on: +nc.maxRot === k, pick: () => this.setState({ nestIn: { ...nc, maxRot: k } }) })),
      nest: NEST_F.map(([k, l]) => ({ label: l, val: nc[k] ?? '', on: ev => this.setState({ nestIn: { ...nc, [k]: ev.target.value } }) })),
      saveNest: () => {
        const out = {};
        for (const [k] of NEST_F) { const n = Number(String(nc[k]).replace(',', '.')); if (!(n >= 0)) { this.toastMsg('Raskroy: son kiriting'); return; } out[k] = n; }
        out.mode = nc.mode; out.maxRot = +nc.maxRot || 2;
        try { localStorage.setItem('s3d-nest-cfg', JSON.stringify(out)); } catch (_) {}   // eski sayt bilan bir xil kalit
        this.setState({ nestIn: null }); this.scheduleRecalc(true); this.toastMsg('Raskroy parametrlari saqlandi');
      },
      resetNest: () => { try { localStorage.removeItem('s3d-nest-cfg'); } catch (_) {} this.setState({ nestIn: null }); this.scheduleRecalc(true); this.toastMsg('Raskroy — standart parametrlar'); },
      admin, stdNote: admin ? 'Admin: chegarani o\'zgartirsangiz — katalog va ogohlantirishlar darhol yangilanadi.' : 'Modul o\'lcham chegaralari (mm). O\'zgartirish — faqat admin.',
      std: Object.entries(std).map(([t, m]) => ({ nom: m.nom || t, rows: Object.keys(STD_LABEL).filter(k => m[k]).map(k => ({ label: STD_LABEL[k],
        min: stdIn[t][k].min, max: stdIn[t][k].max,
        onMin: ev => this.setState({ stdIn: { ...stdIn, [t]: { ...stdIn[t], [k]: { ...stdIn[t][k], min: ev.target.value } } } }),
        onMax: ev => this.setState({ stdIn: { ...stdIn, [t]: { ...stdIn[t], [k]: { ...stdIn[t][k], max: ev.target.value } } } }) })) })),
      saveStd: async () => {
        const mod = {};
        for (const [t, ks] of Object.entries(stdIn)) for (const [k, v] of Object.entries(ks)) {
          (mod[t] = mod[t] || {})[k] = { min: v.min === '' ? null : Number(v.min), max: v.max === '' ? null : Number(v.max), std: (std[t][k] && std[t][k].std) || [] };
        }
        const r = await this.S.api('/api/sex-standartlari', { method: 'PUT', body: { modullar: mod } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { this.toastMsg('⚠️ ' + (j.error || ('Xato ' + r.status))); return; }
        this.H.applyStandards(j.standartlar); this.est = L.createEstimator(this.H);
        this.setState({ stdIn: null }); this.scheduleRecalc(true); this.toastMsg('Sex standartlari saqlandi — katalog chegaralari yangilandi');
      }
    };
  }

  renderVals() {
    const s = this.state, f = s.f, reg = s.screen === 'reg', e = f.err, H = this.H, R = this.res;
    const sc = f.pass.length ? [f.pass.length >= 8, /\d/.test(f.pass), /[A-ZА-Я]/.test(f.pass), /[^\w]/.test(f.pass)].filter(Boolean).length : 0;
    const scC = ['var(--sfc3)', 'var(--danger)', 'var(--acc)', 'var(--cyan)', 'var(--cyan)'][sc];
    const fmt = d => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
    const bd = k => e[k] ? 'var(--danger)' : 'var(--line)';
    const doc = this.doc, it = this.sahna && this.sahna.items;
    const sm = this.pl(s.sel), smF = this.fr(sm), P = s.part;
    const allKeys = it ? it.moverKeys(null) : [], anyOpen = allKeys.some(k => it.isOpen(k));
    const smKeys = it && sm ? it.moverKeys(sm.id) : [], smOpen = smKeys.some(k => it.isOpen(k));
    const bb = roomBBox(doc.room.outline), room = { w: Math.round(bb.w), d: Math.round(bb.h), h: doc.room.wall_height || 2700 };
    const K = doc.kitchen || L.freshKitchen();
    /* narx */
    const pr = R ? R.priceRes : null, prod = R ? R.prod : null, B = prod ? prod.breakdown : {}, NS = R ? R.nest.summary : {};
    const total = pr ? pr.total : 0, cost = prod ? prod.totalCost : 0, inc = pr ? pr.incomplete : false;
    const missN = prod ? prod.missing.length : 0;
    /* raskroy varaqlari (haqiqiy) */
    const sheets = [];
    if (R) for (const [mc, m] of Object.entries(R.nest.by_material || {})) for (const sh of m.sheets || []) sheets.push({ mc, sh, L: sh.length || m.sheet_length, W: sh.width || m.sheet_width });
    const rk = Math.min(s.rk, Math.max(0, sheets.length - 1)), cur = sheets[rk];
    const frCol = {}; let ci = 0;
    const rects = cur ? (cur.sh.parts || []).map(pt => {
      const w = pt.rotated ? pt.width : pt.length, h = pt.rotated ? pt.length : pt.width;
      const key = pt.fragment || pt.code; if (!(key in frCol)) frCol[key] = RANGLAR[ci++ % RANGLAR.length];
      return { l: (pt.x / cur.L * 100) + '%', t: (pt.y / cur.W * 100) + '%', w: (w / cur.L * 100) + '%', h: (h / cur.W * 100) + '%', c: frCol[key] };
    }) : [];
    /* kesim guruhlari (material bo'yicha) */
    const det = {};
    if (R) for (const cl of R.cutlists) for (const pt of cl.parts) { const k = pt.material || '—'; det[k] = (det[k] || 0) + (+pt.qty || 1); }
    const detTotal = Object.values(det).reduce((a, b) => a + b, 0);
    const sizeWarn = pr ? pr.warnings.filter(w => /SIZE|CLAMP/.test(w.code)).length : 0;
    const valErr = R ? R.val.errors : [];
    /* katalog */
    const cats = L.DIZAYN_KATEGORIYA, curCat = cats.find(c => c[0] === s.cat) || cats[0];
    const ql = s.q.trim().toLowerCase();
    const allFr = H ? Object.values(H.catalog) : [];
    const catalog = allFr.filter(fr => curCat[2](fr) && (!ql || (fr.name + ' ' + fr.code).toLowerCase().includes(ql))).map(fr => {
      const ust = L.isUstki(fr), kind = fr.category === 'drawer_base' ? 'tortma' : /moyka/i.test(fr.name) ? 'moyka' : /shisha|vitr/i.test(fr.name) ? 'glass' : 'door';
      const est = fr.category === 'appliance' ? null : this.est(fr, { materialCode: s.matCode, fasadCode: s.fasadCode, sheet: s.sheet, xizmatlar: doc.xizmatlar });
      return { name: fr.name, dims: fr.w + '×' + fr.d + '×' + fr.h + ' mm',
        lim: 'min ' + (fr.min_w || '—') + ' · max ' + (fr.max_w || '—'),
        price: est == null ? 'o\'rnatma texnika' : '~' + s3n(est) + ' so\'m',
        add: () => { const p = L.addPlacement(doc, fr); this.setState({ sel: p.id }); this.docChanged('items'); this.toastMsg(fr.code + ' sahnaga qo\'shildi'); },
        t: s3Thumb(fr.w, fr.h, fr.d, ust ? '#E8E4DA' : '#B4834F', kind, fr.w > 600 ? 2 : 1, 48) };
    });
    const panelMats = H ? (H.materials.panel_materials || []).filter(m => /^(LDSP|LMDF|MDF|OSB)/.test(m.code)) : [];
    const cycleMat = (key, label) => {
      const codes = panelMats.map(m => m.code), i = codes.indexOf(s[key]), next = codes[(i + 1) % codes.length];
      if (!next) return;
      this.setState({ [key]: next, sheet: null }, () => this.scheduleRecalc(true));
      this.toastMsg(label + ': ' + this.matName(next) + ' — narx yangilandi');
    };
    const dimRow = (key, label) => {
      const lo = smF['min_' + key], hi = smF['max_' + key];
      return { label, min: lo || '—', max: hi || '—', val: s.raw[key] ?? sm[key],
        dec: () => this.setDimP(key, sm[key] - 10), inc: () => this.setDimP(key, sm[key] + 10),
        onInput: ev => { const val = ev.target.value; this.setState(st => ({ raw: { ...st.raw, [key]: val } })); },
        commit: () => { if (s.raw[key] !== undefined) this.setDimP(key, s.raw[key]); }, key: ev => { if (ev.key === 'Enter') ev.target.blur(); } };
    };
    const insP = this.pl(s.ins), insSpec = s.ins && H ? this.insSpecOf(s.ins) : null;
    const pList = (s.projects || []).filter(p => !s.pq || ((p.name || '') + ' ' + (p.client || '')).toLowerCase().includes(s.pq.toLowerCase()));
    const holes = [
      ...(doc.room.openings || []).map(o => ({ t: o.type === 'window' ? 'Deraza' : 'Eshik', d: (o.width || 0) + ' mm · ' + (+o.wall + 1) + '-devor' })),
      ...(doc.room.utilities || []).map(u => ({ t: u.type === 'outlet' ? 'Rozetka' : 'Quvur', d: (+u.wall + 1) + '-devor · ' + (u.offset || 0) + ' mm · h ' + (u.z || 0) }))];
    const isRect = (doc.room.outline || []).length === 4;
    const kt = [['stoleshnitsa', 'Stoleshnitsa', H && H.catalog['SP-ST-001'] ? H.catalog['SP-ST-001'].h + ' mm, yaxlit' : 'yaxlit'],
      ['sokol', 'Sokol', H && H.catalog['SP-ST-002'] ? H.catalog['SP-ST-002'].d + ' mm' : ''],   // tik planka: balandligi = d (kitchen.js)
      ['dobor', 'Dobor', (K.doborH || 60) + ' mm'], ['karniz', 'Karniz', (K.karnizH || 60) + ' mm'],
      ['moyka', 'Moyka', ((K.moyka || {}).size || 500) + ' mm kesim']];
    const pctMarkup = prod ? Math.round((prod.markupPct || 0) * 100) : 0;
    const admin = !!(s.user && s.user.role === 'admin');
    /* dizayndagi ro'yxat; har yorliq — haqiqiy fayl. Biesse/Homag — TZ-11 gacha yo'q (doim namuna detal chiqaradi, TZ-01);
       BPJ — TZ-17 gacha faqat admin, SINOV. "Smeta (CSV)", "OBJ", "Teshiklar (JSON)" — eski saytdagi fayllar yo'qolmasin (5-bo'lim) */
    const fileG = [
      { title: 'Mijozga', col: 'var(--cyan)', sub: 'Bittada logosi bilan', mainLabel: '🖨 Hisobot (PDF)', main: 'hisobot', more: [['📸 Rasm', 'rasm'], ['🔄 360°', 'panorama'], ['GLB (3D/AR)', 'glb']] },
      { title: 'Sexga', col: 'var(--lav)', sub: (NS.panel_count || 0) + ' detal · ' + (NS.total_sheets || 0) + ' varaq', mainLabel: '📊 Excel smeta', main: 'excel',
        more: [['Detallar (CSV)', 'cutlist'], ['Loyiha fayli', 'loyiha'], ['Smeta (CSV)', 'smetaCsv'], ['OBJ', 'obj'], ['Teshiklar (JSON)', 'teshiklar']] },
      { title: 'Stanokka', col: 'var(--acct)', sub: 'alohida dastursiz', mainLabel: 'GibLab', main: 'giblab',
        more: [['DXF', 'dxf'], ['G-code', 'gcode'], ['Biesse · tez orada', null], ['Homag · tez orada', null], ['PTP', 'ptp'], ['NC', 'nc'], ['XNC', 'xnc'], ['Altendorf', 'altendorf'],
          admin ? ['Bazis (BPJ) · SINOV', 'bpj'] : ['Bazis (BPJ) · tez orada', null]]
          .filter(([, k]) => !k || !s.sets.stanoklar || !STANOK.some(x => x[0] === k) || s.sets.stanoklar.includes(k)) }];   // stanok profili (Sozlamalar)
    return {
      hasPending: !!s.pending, pendingText: s.pending ? (s.pending.mod + (s.pending.w ? ' · ' + s.pending.w + ' mm' : '') + ' — ro\'yxatdan keyin loyihangizda turadi') : '',
      isAuth: reg || s.screen === 'login', isReg: reg, regHost: this.regHost, regOv: this.regOv,
      f: { title: reg ? 'Ro\'yxatdan o\'tish' : 'Kirish', sub: reg ? '1 daqiqa. Keyin birinchi loyihangizni chizasiz.' : 'Email va parolingiz bilan.',
        cta: reg ? 'Ro\'yxatdan o\'tish' : 'Kirish', alt: reg ? 'Akkauntingiz bormi?' : 'Akkaunt yo\'qmi?', altCta: reg ? 'Kirish' : 'Ro\'yxatdan o\'tish',
        name: f.name, email: f.email, eEmail: !!e.email, eEmailt: e.email || '', bEmail: bd('email'), passAuto: reg ? 'new-password' : 'current-password', phone: fmt(f.phone), pass: f.pass, shop: f.shop, passType: f.show ? 'text' : 'password', eye: f.show ? '🙈' : '👁',
        bars: [1, 2, 3, 4].map(i => ({ c: i <= sc ? scC : 'var(--sfc2)' })), strength: ['', 'Zaif', 'O\'rtacha', 'Yaxshi', 'Kuchli'][sc],
        eName: !!e.name, eNamet: e.name || '', ePhone: !!e.phone, ePhonet: e.phone || '', ePass: !!e.pass, ePasst: e.pass || '', bName: bd('name'), bPhone: bd('phone'), bPass: bd('pass') },
      onName: ev => this.setState({ f: { ...f, name: ev.target.value } }), onEmail: ev => this.setState({ f: { ...f, email: ev.target.value } }), onShop: ev => this.setState({ f: { ...f, shop: ev.target.value } }),
      onPhone: ev => { let d = ev.target.value.replace(/\D/g, ''); if (d.startsWith('998') && d.length > 9) d = d.slice(3); this.setState({ f: { ...f, phone: d.slice(0, 9) } }); },
      onPass: ev => this.setState({ f: { ...f, pass: ev.target.value } }), toggleEye: () => this.setState({ f: { ...f, show: !f.show } }),
      submitAuth: () => this.submitAuth(), swapAuth: () => this.setState({ screen: reg ? 'login' : 'reg', f: { ...f, err: {} } }),
      isOnb: s.screen === 'onb1' || s.screen === 'onb2', isOnb1: s.screen === 'onb1', isOnb2: s.screen === 'onb2',
      onb: { n: s.screen === 'onb1' ? 1 : 2, bars: [1, 2, 3].map(i => ({ c: i <= (s.screen === 'onb1' ? 1 : 2) ? 'var(--acc)' : 'var(--sfc2)' })),
        kinds: [['kitchen', '🍳', 'Oshxona', 'Pastki va osma modullar'], ['wardrobe', '🚪', 'Shkaf / garderob', 'Kupe, penal, garderob'], ['other', '🛏', 'Boshqa mebel', 'Krovat, stol, javon'], ['ai', '✨', 'AI\'ga aytib beraman', 'Matn yoki ovoz bilan']].map(k => ({ icon: k[1], label: k[2], sub: k[3], pick: () => this.setState({ onbKind: k[0], screen: 'onb2' }) })),
        isAi: s.onbKind === 'ai', notAi: s.onbKind !== 'ai', t2: s.onbKind === 'ai' ? 'AI\'ga aytib bering' : 'Xona o\'lchami', s2: s.onbKind === 'ai' ? 'Xona va mebelni oddiy so\'z bilan yozing yoki ayting.' : 'Tayyor o\'lchamni tanlang yoki o\'zingiz yozing.',
        presets: PRESETS.map(p => { const on = s.room.w === p[0] && s.room.d === p[1]; return { label: p[2], area: ((p[0] * p[1]) / 1e6).toFixed(1).replace('.', ',') + ' m²', bg: on ? 'rgba(255,122,69,.14)' : 'var(--sfc)', bd: on ? 'var(--acc)' : 'var(--line)', pick: () => this.setState({ room: { ...s.room, w: p[0], d: p[1] } }) }; }) },
      onbBack: () => this.setState({ screen: 'onb1' }), openEditor: () => this.openEditor(),
      aiEx: AI_EX.map(t => ({ t, pick: () => this.setState({ aiText: t }) })), aiText: s.aiText, onAiText: ev => this.setState({ aiText: ev.target.value }),
      toggleMic: () => this.toggleMic(), micLabel: s.mic ? 'Tinglanmoqda…' : 'Ovoz', micBg: s.mic ? 'var(--danger)' : 'var(--sfc2)', micT: s.mic ? '#2A0A0A' : 'var(--txt)',
      inShell: s.screen === 'app' || s.screen === 'projects' || s.screen === 'settings', isEditor: s.screen === 'app', isProjects: s.screen === 'projects', isSettings: s.screen === 'settings',
      openSettings: () => this.openSettings(), set: this.setVals(),
      projName: s.projName, onProjName: ev => { this.setState({ projName: ev.target.value }); this.S.changed(); },
      initials: (() => { const u = s.user || {}, nm = String(u.name || f.name || '').trim(); return (nm ? nm.split(/\s+/).map(w => w[0]).join('').slice(0, 2) : String(u.email || '').slice(0, 2) || '•').toUpperCase(); })(),
      price: { total: R ? s3n(total) : '…', cost: R ? s3n(cost) : '…', profit: R ? s3n(total - cost) : '…', star: inc ? '*' : '', note: inc ? '* to\'liq emas' : '', som: inc ? 'so\'m *' : 'so\'m' },
      goStep3: () => this.goStep(3), goStep2: () => this.goStep(2), goStep4: () => this.goStep(4),
      langToast: () => this.toastMsg('O\'zbekcha · Русский — tez orada'), settingsToast: () => this.openSettings(),
      goProjects: () => this.goProjects(), newProject: () => this.newProject(),
      pq: s.pq, onPq: ev => this.setState({ pq: ev.target.value }), projEmpty: !pList.length,
      projects: pList.map(p => ({ name: p.name || 'Loyiha', client: p.client || '—', date: sana(p.updated_at), price: s3n(p.total_price || 0) + ' so\'m', mods: (p.modules || 0) + ' modul',
        t: s3Thumb(1200, 800, 450, '#B4834F', 'door', 2, 100), open: () => this.openProject(p.id) })),
      nav: ['Xona', 'Mebel', 'Narx', 'Fayllar'].map((l, i) => { const n = i + 1, on = s.step === n, dn = s.done[n]; return { label: l, mark: dn && !on ? '✓' : n, go: () => this.goStep(n), bg: on ? 'var(--sfc2)' : 'transparent', c: on ? 'var(--txt)' : 'var(--mut)', nb: on ? 'var(--acc)' : dn ? 'rgba(95,225,196,.18)' : 'var(--sfc)', nc: on ? 'var(--ink)' : dn ? 'var(--cyan)' : 'var(--mut)' }; }),
      roomHost: this.roomHost, roomOv: this.roomOv, notLoaded: !this.sahna,
      vw: { b2: s.view === '2d' ? 'var(--acc)' : 'transparent', t2: s.view === '2d' ? 'var(--ink)' : 'var(--txt)', b3: s.view === '3d' ? 'var(--acc)' : 'transparent', t3: s.view === '3d' ? 'var(--ink)' : 'var(--txt)', sb: s.spin ? 'var(--cyan)' : 'rgba(23,50,57,.9)', st: s.spin ? '#06231E' : 'var(--txt)' },
      set2D: () => this.setState({ view: '2d', spin: false }), set3D: () => this.setState({ view: '3d' }), toggleSpin: () => this.setState({ spin: !s.spin, view: '3d' }), center: () => this.sahna && this.sahna.center(),
      shot: () => this.fayl('rasm'),
      tip: { on: s.screen === 'app' && s.tip < 3, text: S3_TIPS[Math.min(s.tip, 2)], n: Math.min(s.tip, 2) + 1, btn: s.tip >= 2 ? 'Tushunarli' : 'Keyingi' },
      tipNext: () => this.setState({ tip: s.tip + 1 }), tipSkip: () => this.setState({ tip: 3 }),
      hasSel: !!sm, deselect: () => this.select(null),
      toggleAllOpen: () => { if (it) { it.setOpen(allKeys, !anyOpen); this.setState({ part: null }); it.setFocus(null); } }, openAllLabel: anyOpen ? 'Hammasini yopish' : 'Eshiklarni ochish',
      toggleModOpen: () => { if (it) { it.setOpen(smKeys, !smOpen); this.setState({ part: null }); it.setFocus(null); } },
      hasPart: !!P, showModCard: !!sm && !!smF && !P, closePart: () => { this.setState({ part: null }); if (it) it.setFocus(null); }, miniHost: this.miniHost, miniOv: this.miniOv,
      pt: P ? { name: P.name, dim: P.dim + ' mm', mat: P.mat, edge: P.edge, code: P.code, isMov: !!P.key, movLabel: it && P.key && it.isOpen(P.key) ? 'Yopish' : 'Ochish' } : {},
      togglePartOpen: () => { if (!P || !P.key || !it) return; it.setOpen([P.key], !it.isOpen(P.key)); this.forceUpdate(); },
      sm: sm && smF ? { openLabel: (smOpen ? 'Yopish' : 'Ochish') + (smF.category === 'drawer_base' ? ' · tortmalar' : ' · eshiklar'), canIns: ichiniKorsaBoladi(smF), noIns: !ichiniKorsaBoladi(smF),
        name: sm.name || smF.name, code: sm.frg, warn: s.warn[sm.id] || '', hasWarn: !!s.warn[sm.id], rows: [dimRow('w', 'Eni'), dimRow('d', 'Chuqurligi'), dimRow('h', 'Bo\'yi')] } : { rows: [] },
      moveL: () => { if (sm) { L.moveAlong(sm, -50); this.docChanged('items'); } }, moveR: () => { if (sm) { L.moveAlong(sm, 50); this.docChanged('items'); } },
      rotate: () => { if (sm) { L.rotate90(sm); this.docChanged('items'); } },
      dup: () => { if (!sm) return; const c = L.duplicatePlacement(doc, sm.id); this.setState({ sel: c.id }); this.docChanged('items'); this.toastMsg('Nusxa qo\'shildi'); },
      askDel: () => sm && this.confirm({ title: 'Modulni o\'chirasizmi?', text: sm.frg + ' · ' + (sm.name || '') + ' loyihadan olib tashlanadi.', ok: 'O\'chirish', danger: true, yes: () => { L.removePlacement(doc, sm.id); this.select(null); this.docChanged('items', true); this.toastMsg('Modul o\'chirildi'); } }),
      openInside: () => { if (!sm || !ichiniKorsaBoladi(smF)) return; this.insAuto = true; this.setState({ ins: sm.id, insA: { ex: 0, color: 1 } }); },
      openAi: () => this.setState({ ai: true }), closeAi: () => { if (this.voice) { this.voice.stop(); this.voice = null; } this.setState({ ai: false, mic: false }); }, aiOpen: s.ai,
      aiBuild: () => { const n = doc.placements.length; const go = () => { this.setState({ cf: null }); this.runAI(); };
        if (n) this.setState({ cf: { title: 'Loyihani almashtirasizmi?', text: 'Joriy ' + n + ' ta mebel almashtiriladi. Davom etasizmi?', ok: 'Almashtirish', yes: go } }); else go(); },
      isS1: s.step === 1, isS2: s.step === 2, isS3: s.step === 3, isS4: s.step === 4,
      shapes: [['rect', '▣ To\'rtburchak'], ['L', '◩ L-shakl'], ['free', '✎ Erkin']].map(x => { const on = x[0] === 'rect' ? isRect : x[0] === 'L' ? !isRect : false;
        return { label: x[1], bg: on ? 'var(--acc)' : 'transparent', c: on ? 'var(--ink)' : 'var(--txt)',
          pick: () => { if (x[0] === 'free') { this.openVaraq('shakl'); return; }
            L.applyRoom(doc, { outline: x[0] === 'L' ? L.L_OUTLINE.map(p => p.slice()) : L.rectOutline(room.w, room.d) }); this.docChanged('room', true); } }; }),
      room, onRoomW: ev => { L.applyRoom(doc, { w: clamp(+ev.target.value || 0, 1500, 9000), d: room.d }); this.docChanged('room'); this.forceUpdate(); },
      onRoomD: ev => { L.applyRoom(doc, { w: room.w, d: clamp(+ev.target.value || 0, 1500, 9000) }); this.docChanged('room'); this.forceUpdate(); },
      onRoomH: ev => { L.applyRoom(doc, { h: clamp(+ev.target.value || 0, 2200, 4000) }); this.docChanged('room'); this.forceUpdate(); },
      roomPresets: PRESETS.map(p => { const on = room.w === p[0] && room.d === p[1]; return { label: p[2], bg: on ? 'var(--acc)' : 'var(--sfc)', c: on ? 'var(--ink)' : 'var(--txt)', pick: () => { L.applyRoom(doc, { outline: L.rectOutline(p[0], p[1]) }); this.docChanged('room', true); } }; }),
      holes, addHole: () => this.openVaraq('teshik'), openKitchen: () => this.openVaraq('oshxona'), sheet: this.sheetVals(),
      toggles: kt.map(t => { const on = t[0] === 'moyka' ? !!(K.moyka && K.moyka.on) : !!K[t[0]];
        return { label: t[1], sub: t[2], bg: on ? 'var(--acc)' : 'var(--sfc3)', kx: on ? 'translateX(20px)' : 'none',
          flip: () => { const k = doc.kitchen || (doc.kitchen = L.freshKitchen()); if (t[0] === 'moyka') { k.moyka = k.moyka || { on: false, offset: 600, fromBack: 100, size: 500 }; k.moyka.on = !k.moyka.on; } else k[t[0]] = !k[t[0]]; this.docChanged('room', true); } }; }),
      q: s.q, onQ: ev => this.setState({ q: ev.target.value }),
      catCount: allFr.length + ' ta modul',
      cats: cats.map(c => ({ label: c[1], bg: s.cat === c[0] ? 'var(--acc)' : 'var(--sfc)', c: s.cat === c[0] ? 'var(--ink)' : 'var(--txt)', pick: () => this.setState({ cat: c[0] }) })),
      mats: [['Korpus', 'matCode'], ['Fasad', 'fasadCode']].map(([k, key]) => ({ k, v: H ? (s.sheet && slotForBase(baseForSheet(s.sheet)) === (key === 'matCode' ? 'korpus' : 'fasad') ? s.sheet.name : this.matName(s[key])) : '…', cycle: () => this.openVaraq('material', { slot: key }) })),
      catalog, catEmpty: !catalog.length,
      toggleMissing: () => this.setState({ miss: !s.miss }), missOpen: s.miss, missArrow: s.miss ? '▴' : '▾',
      markupLabel: 'Foyda (+' + pctMarkup + '%)', hasMissing: missN > 0, missText: '⚠️ ' + missN + ' ta zapchastning narxi bazada yo\'q — 0 deb olindi',
      missing: prod ? prod.missing.map(m => ({ n: m.name || m.code, c: m.qty ? '×' + m.qty : '' })) : [],
      quote: pr ? pr.lines.map(l => ({ name: l.code + ' · ' + l.name, dim: (l.w || 0) + '×' + (l.d || 0) + '×' + (l.h || 0), n: l.qty, p: s3n(l.amount) })) : [],
      costRows: prod ? [['Plita', (B.sheetsCount || 0) + ' varaq · ' + String(B.panelAreaM2 || 0).replace('.', ',') + ' m²', prod.sheetCost], ['Kromka', String(B.edgeMeters || 0).replace('.', ',') + ' m', prod.edgeCost],
        ['Zapchast', (B.hwCount || 0) + ' dona', prod.hwCost], ['Teshiklar', 'присадка · ' + (B.holeCount || 0), prod.holeCost], ['Ish haqi', 'sex', prod.laborCost]].map(r => ({ name: r[0], q: r[1], p: s3n(r[2] || 0) })) : [],
      rk: { n: rk + 1, rects, ar: cur ? cur.L + '/' + cur.W : '2800/2070', summary: (NS.total_sheets || 0) + ' varaq · ' + (NS.panel_count || 0) + ' detal · isrof ' + Math.max(0, Math.round(100 - (NS.utilization_pct || 0))) + '%',
        dots: sheets.map((_, i) => ({ w: i === rk ? '22px' : '6px', c: i === rk ? 'var(--acc)' : 'var(--sfc3)' })) },
      rkPrev: () => this.setState({ rk: (rk + sheets.length - 1) % Math.max(1, sheets.length) }), rkNext: () => this.setState({ rk: (rk + 1) % Math.max(1, sheets.length) }),
      openParams: () => this.openSettings('raskroy'),
      detGroups: Object.entries(det).map(([mc, n]) => ({ n: (H ? this.matName(mc) : mc), c: n + ' detal' })),
      checks: [
        ...(R ? [{ ok: !NS.placed_count || NS.placed_count === NS.panel_count, text: NS.placed_count === NS.panel_count ? detTotal + ' detal ' + (NS.total_sheets || 0) + ' varaqqa sig\'di' : (NS.panel_count - NS.placed_count) + ' ta detal varaqqa sig\'madi' }] : []),
        { ok: !sizeWarn, text: sizeWarn ? sizeWarn + ' ta o\'lcham chegaradan tashqari' : 'Hamma o\'lcham modul chegarasida' },
        ...valErr.map(x => ({ ok: false, text: x.message || x.code })),
        ...(missN ? [{ ok: false, text: missN + ' ta zapchastning narxi yo\'q' }] : [])],
      fileGroups: fileG.map(g => ({ ...g, main: () => this.fayl(g.main), more: g.more.map(([l, k]) => { const dis = !k; return { label: l, dis, c: dis ? 'var(--mut)' : 'var(--txt)', cur: dis ? 'not-allowed' : 'pointer', go: () => { if (k) this.fayl(k); } }; }) })),
      insOpen: !!s.ins && !!insSpec, insHost: this.insHost, insOv: this.insOv, closeInside: () => this.setState({ ins: null }),
      ins: insSpec && insP ? { name: insP.name || (this.fr(insP) || {}).name, code: insP.frg, size: insP.w + '×' + insP.d + '×' + insP.h + ' mm', hasNote: false, note: '', detal: insSpec.stats.detal, zap: insSpec.stats.zap, list: insSpec.list, hw: insSpec.hwList, ex: s.insA.ex,
        cB: s.insA.color ? 'var(--acc)' : 'transparent', cT: s.insA.color ? 'var(--ink)' : 'var(--mut)', pB: s.insA.color ? 'transparent' : 'var(--sfc)', pT: s.insA.color ? 'var(--mut)' : 'var(--txt)' } : { list: [], hw: [] },
      onInsEx: ev => { this.insAuto = false; this.setState({ insA: { ...s.insA, ex: +ev.target.value } }); }, insColor: () => this.setState({ insA: { ...s.insA, color: 1 } }), insPlain: () => this.setState({ insA: { ...s.insA, color: 0 } }),
      cf: s.cf ? { on: true, title: s.cf.title, text: s.cf.text, ok: s.cf.ok, bg: s.cf.danger ? 'var(--danger)' : 'var(--acc)', c: s.cf.danger ? '#2A0A0A' : 'var(--ink)' } : { on: false },
      cfNo: () => this.setState({ cf: null }), cfYes: () => { const y = s.cf && s.cf.yes; this.setState({ cf: null }); y && y(); },
      hasToast: !!s.toast, toast: s.toast
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <>
      <div data-s3a="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased"}}>
        <Kirish v={v} />
        <Onboarding v={v} />
        {v.inShell ? (<>
          <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
            <Header v={v} />
            <Loyihalar v={v} />
            <Sozlamalar v={v} />
            {v.isEditor ? (<>
              <div data-ed="" style={{"flex":"1 1 auto","height":"calc(100vh - 64px)","display":"grid","gridTemplateColumns":"200px minmax(0,1fr) 400px"}}>
                <EditorNav v={v} />
                <Sahna v={v} />
                <aside data-panel="" style={{"height":"100%","overflow":"auto","borderLeft":"1px solid var(--line)","background":"var(--bg)","padding":"20px","display":"flex","flexDirection":"column","gap":"16px"}}>
                  <QadamXona v={v} />
                  <QadamMebel v={v} />
                  <QadamNarx v={v} />
                  <QadamFayllar v={v} />
                </aside>
              </div>
            </>) : null}
          </div>
        </>) : null}
        <AiOyna v={v} />
        <IchiniKorish v={v} />
        <Tasdiq v={v} />
        <Varaqlar v={v} />
        <Toast v={v} />
      </div>
      </>
    );
  }
}
