import { get, set, store } from '../store/index.js';
import { project } from '../store/project.js';
import { S } from '../store/session.js';
import { toast, xato } from '../store/ui.js';
import { t } from '../i18n/index.js';
import { TELEGRAM } from './bridge/telegram.js';
import { yopiqQil } from './klaviatura.js';
import { goProjects, openProject } from '../features/projects/actions.js';
import { openSettings } from '../features/settings/actions.js';
import { openAdmin } from '../features/admin/actions.js';
import { ishJoyiOch, yangiIshJoyi } from '../features/editor/ishjoyi/ishjoyi.js';
import { yolniOqi, qaytishniOqi, ekranYoli } from './marshrutlar.js';

/* TZ-30 (egasi #179): har ekranning o'z manzili (History API) — /kirish, /loyihalar, /loyiha/5, /sozlamalar … (app/marshrutlar.js).
 *  - ekran almashsa — history.pushState (kirish ↔ ilova chegarasi va bitta ekran ichidagi o'zgarish — replaceState);
 *  - sahifa shu manzil bilan ochilsa — o'sha ekran; kirmagan foydalanuvchi himoyalangan manzilda — /kirish?qaytish=…, kirgach qaytadi;
 *  - eski havolalar (app.html#s=reg, #mod=…) — readHandoff o'qiydi, manzil yangisiga almashtiriladi (replaceState).
 * TZ-27 (egasi #137) saqlangan: "orqaga" (brauzer, sichqoncha tugmasi) — avval eng ustdagi oyna yoki rejim yopiladi
 * (klaviatura.js yopiqQil, Esc tartibi), keyin oldingi manzil; ilovadan chiqib ketmaydi — tarix boshida "ildiz" yozuvi turadi.
 * "Oldinga" — haqiqiy brauzer tarixi bo'yicha. Telegram ichida — Telegram'ning o'z "orqaga" tugmasi (TZ-16), manzil o'zgarmaydi. */
const KIRISH = new Set(['reg', 'login', 'tg']);           // kirish ekranlari — ilova ekranlari bilan chegara
const EKRAN = new Set(['app', 'projects', 'settings', 'admin']);   // tarix boshida "orqaga" — shu ekranlar orasida (TZ-27)

let yoq = true;                       // o'rnatilmagan: Telegram ichida yoki History API yo'q
let kutilgan = null;                  // kirgandan keyin ochiladigan marshrut (yolniOqi natijasi)
let tayyor = false;                   // kirgan foydalanuvchi: kirishdan keyingi birinchi ekran tanlandi (afterLogin)
let band = 0;                         // marshrut ochilmoqda (serverdan loyiha …) — manzil oxirida bir marta yoziladi
let boshlandi = false;                // tarixga "ildiz" va birinchi ekran yozildimi
let oxirgi = { yol: null, sc: null, id: null, i: 0 };   // i — tarixdagi o'rni (ildiz — 0)
let qaytar = null;                    // { i, keyin } — oyna yopildi, brauzer joriy yozuvga qaytarilmoqda (history.go)
let bolim = null, bolimEkran = null;  // /sozlamalar/narxlar, /buyurtmalar — qaysi ekranning bo'limi
const YUK = Date.now().toString(36);  // shu yuklanish belgisi: oldingi yuklanishdagi tarix yozuvlari "begona"

/** sahifa ochilganda (bootstrap, readHandoff'dan OLDIN): manzil → ekran. Eski havola (#s=…, #mod=…) — readHandoff'ga qoladi. */
export function marshrutOqi() {
  if (TELEGRAM || typeof history === 'undefined' || !history.pushState) return;
  if (/(?:^#|&)(?:s|mod)=/.test(location.hash || '')) return;
  const m = yolniOqi(location.pathname);
  if (!m) return;                                        // /app.html — odatdagi oqim (oxirgi loyiha yoki kirish)
  if (!m.himoya) {                                       // /kirish, /royxat; /tg Telegram'siz — kirish oynasi
    kutilgan = qaytishniOqi(location.search);
    set('nav', { screen: m.nom === 'royxat' ? 'reg' : 'login' });
    return;
  }
  kutilgan = m;                                          // kirgan — afterLogin ochadi (marshrutgaQayt); kirmagan — avval kirish
  if (!S.loggedIn) set('nav', { screen: 'login' });
}

/** kirgandan keyin (afterLogin, ro'yxat): kutilgan manzil bo'lsa — o'sha ochiladi → true; aks holda odatdagi oqim → false.
 *  Saytdan kelgan modul (nav.pending) — ustun, manzil kutilmaydi. */
export async function marshrutgaQayt() {
  const m = kutilgan;
  kutilgan = null;
  tayyor = true;
  if (!m || get().nav.pending) return false;
  await qolla(m, false);
  return true;
}

export function tarixOrnat() {
  if (TELEGRAM || typeof history === 'undefined' || !history.pushState) return;
  yoq = false;
  store.subscribe(() => yoz(false));
  window.addEventListener('popstate', orqaga);
  yoz(false);
}

/* joriy ekran → manzil */
function joriy() {
  const sc = get().nav.screen;
  if (sc !== bolimEkran) { bolim = null; bolimEkran = null; }
  const id = sc === 'app' && S.currentId != null ? String(S.currentId) : null;
  if (sc === 'admin') bolim = get().nav.adminBolim || 'narxlar';
  const qaytish = (sc === 'login' || sc === 'reg') && kutilgan ? kutilgan.yol : null;
  return { sc, id, yol: ekranYoli({ screen: sc, id, bolim, qaytish }) };
}

/* holat o'zgardi → manzil. almashtir — replaceState (marshrut tarixdan ochilganda) */
function yoz(almashtir) {
  if (yoq || band || qaytar || (!tayyor && S.loggedIn)) return;   // kirgan foydalanuvchi: sessiya tiklanguncha manzil o'zgarmaydi
  const j = joriy();
  if (!j.yol) return;
  try {
    if (!boshlandi) {
      boshlandi = true;
      history.replaceState(Object.assign({}, history.state, { s3d: 'ildiz', i: 0, y: YUK }), '', j.yol);
      j.i = 1;
      history.pushState({ s3d: 'ekran', i: j.i, y: YUK }, '', j.yol);
    } else if (j.yol !== oxirgi.yol) {
      const chegara = KIRISH.has(j.sc) !== KIRISH.has(oxirgi.sc);                 // kirish ↔ ilova: orqaga qaytilmaydi
      const boshqaLoyiha = j.sc === 'app' && oxirgi.sc === 'app' && j.id && oxirgi.id && j.id !== oxirgi.id;
      const almash = almashtir || chegara || (j.sc === oxirgi.sc && !boshqaLoyiha);
      j.i = almash ? oxirgi.i : oxirgi.i + 1;
      history[almash ? 'replaceState' : 'pushState']({ s3d: 'ekran', i: j.i, y: YUK }, '', j.yol);
    } else j.i = oxirgi.i;
  } catch (_) { return; }
  oxirgi = j;
}

/* ekran o'zgarmaydi: brauzer joriy yozuvga qaytariladi (history.go — "oldinga" tarixi saqlanadi); keyin — qaytgach bajariladi */
function joyidaQol(e, keyin) {
  if (!bizniki(e)) {                                     // oldingi yuklanish yozuvi (bir necha qadam sakrash) — shu joydan yangi ildiz
    try {
      history.replaceState({ s3d: 'ildiz', i: 0, y: YUK }, '', oxirgi.yol);
      history.pushState({ s3d: 'ekran', i: 1, y: YUK }, '', oxirgi.yol);
      oxirgi = { ...oxirgi, i: 1 };
    } catch (_) { /* yo'q */ }
    if (keyin) keyin();
    return;
  }
  const d = oxirgi.i - e.state.i;
  if (!d) { if (keyin) keyin(); return; }
  qaytar = { i: oxirgi.i, keyin };
  setTimeout(() => { if (qaytar && qaytar.i === oxirgi.i && qaytar.keyin === keyin) qaytar = null; }, 1500);   // brauzer qaytarmadi — kutish tugaydi
  history.go(d);
}

const bizniki = (e) => !!e.state && e.state.y === YUK && typeof e.state.i === 'number';

function orqaga(e) {
  if (!e.state && location.pathname + location.search === oxirgi.yol) return;   // faqat #… o'zgardi — readHandoff (hashchange)
  if (qaytar) {                                          // joyidaQol qaytargan qadam
    const q = qaytar;
    qaytar = null;
    if (bizniki(e) && e.state.i === q.i) { if (q.keyin) q.keyin(); return; }
  }
  if (yopiqQil(true)) { joyidaQol(e); return; }         // avval oyna yoki rejim yopiladi (Esc tartibi)
  if (!bizniki(e) || e.state.s3d !== 'ekran') {          // tarix boshi — ilovadan chiqmaymiz (TZ-27)
    const sc = get().nav.screen;
    joyidaQol(e, sc === 'app' ? () => goProjects() : EKRAN.has(sc) ? () => set('nav', { screen: 'app' }) : null);
    return;
  }
  const m = yolniOqi(location.pathname);
  /* kirmagan — himoyalangan ekranga, kirgan — kirish oynasiga tarix orqali qaytmaydi */
  if (!m || m.himoya !== !!S.loggedIn || m.nom === 'tg') { joyidaQol(e); return; }
  oxirgi = { ...oxirgi, yol: location.pathname + location.search, i: e.state.i };
  qolla(m, true);
}

/* marshrutni ochish; tugagach manzil bir marta yoziladi (topilmasa — /loyihalar) */
async function qolla(m, tarixdan) {
  band++;
  try { await ochish(m, tarixdan); } catch (e) { xato('S3D-UI-102', { modul: 'marshrut', err: e, xabar: m.yol }); }
  finally { band--; yoz(true); }
}

async function ochish(m, tarixdan) {
  switch (m.nom) {
    case 'kirish': case 'royxat':
      kutilgan = qaytishniOqi(location.search);
      set('nav', { screen: m.nom === 'royxat' ? 'reg' : 'login' });
      return;
    case 'loyihalar': goProjects(); return;              // ekran darhol, ro'yxat keyin keladi — manzil kutmaydi
    case 'sozlamalar':
      openSettings();
      if (m.bolim) { bolim = m.bolim; bolimEkran = 'settings'; korsat('[data-set="' + m.bolim + '"]'); }
      return;
    case 'admin': openAdmin(m.bolim); return;           // TZ-37: admin panel (role tekshiruvi — AdminQobiq)
    case 'buyurtmalar': {                                // admin — Sozlamalardagi "Buyurtmalar", usta — Loyihalarimdagi "Buyurtmalarim"
      const admin = ((get().auth.user || S.user || {}).role) === 'admin';
      if (admin) openSettings(); else goProjects();
      bolim = 'buyurtmalar'; bolimEkran = admin ? 'settings' : 'projects';
      korsat('[data-buyurtmalar]');
      return;
    }
    case 'yangi':
      if (tarixdan || S.dirty) { ishJoyiKorsat(tarixdan); return; }   // tarixdan — ochiq ish; saqlanmagan ish (internetsiz) yo'qolmaydi
      await yangiIshJoyi();
      return;
    case 'loyiha': {
      if (S.currentId != null && String(S.currentId) === m.id) { ishJoyiKorsat(tarixdan); return; }
      if (S.dirty) await S.flush().catch(() => {});      // ochiq loyihadagi oxirgi o'zgarish avval saqlanadi
      let ok = null;
      try { ok = await openProject(m.id); } catch (e) { xato('S3D-NET-101', { modul: 'marshrut', err: e }); }
      if (ok || !S.loggedIn) return;                     // 401 — sessiya tugadi, kirish oynasi (store/session.js)
      goProjects();
      if (ok === false) toast(t('loyihalar.topilmadi'), 'S3D-PROJ-001');
      return;
    }
    default:
  }
}

/* ish joyi: tarixdan — ochiq loyiha (oldingi tarix.js kabi), kirgandan keyin — afterLogin kabi */
function ishJoyiKorsat(tarixdan) {
  if (tarixdan) { set('nav', { screen: 'app' }); return; }
  ishJoyiOch();
  project.changed('room', true);
}

/* bo'lim chizilguncha (ro'yxat serverdan keladi) kutib, unga aylantiriladi; yuqoridagi bo'limlar yuklanib joy surilsa — yana bir marta */
function korsat(sel, n = 0) {
  const el = document.querySelector(sel);
  if (!el) { if (n < 30) setTimeout(() => korsat(sel, n + 1), 100); return; }
  el.scrollIntoView({ block: 'start' });
  setTimeout(() => { const e2 = document.querySelector(sel); if (e2) e2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 800);
}
