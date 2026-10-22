import React, { useEffect } from 'react';
import { useSlice } from '../store/index.js';
import { confirmNo, confirmYes } from '../store/ui.js';
import Tasdiq from '../shared/ui/Tasdiq.jsx';
import Toast from '../shared/ui/Toast.jsx';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import TilMenyu from '../shared/ui/TilMenyu.jsx';
import { useTil } from '../i18n/index.js';
import { set } from '../store/index.js';
import Kirish from '../features/auth/Kirish.jsx';
import TgKutish from '../features/telegram/TgKutish.jsx';
import Header from '../features/shell/Header.jsx';
import Yuklanish from '../shared/ui/Yuklanish.jsx';
import { kechiktir, boshVaqtda } from '../shared/lib/kechiktir.jsx';
import { S } from '../store/session.js';
import AiOyna from '../features/editor/ai/AiOyna.jsx';
import IchiniKorish from '../features/editor/inside/IchiniKorish.jsx';
import Varaqlar, { varaqlarniOldindanYukla } from '../features/editor/Varaqlar.jsx';

/* Tezlik (testchi nuqsonlari, 2026-10-22): birinchi ekranda (kirish) kerak bo'lmagan qismlar — alohida bo'laklar, kerak bo'lganda yuklanadi:
 * admin (faqat adminga), sozlamalar, "Loyihalarim", "Nima yasaymiz" (yashirilgan) va muharrir sahifasi (faqat kirgandan keyin).
 * Muharrir bo'lagi oldindan yuklab qo'yiladi (pastda) — kirgach kutish bo'lmaydi. Kirish, qobiq va oynalar — asosiy bo'lakda. */
const AdminQobiq = kechiktir(() => import('../features/admin/AdminQobiq.jsx'));
const Sozlamalar = kechiktir(() => import('../features/settings/Sozlamalar.jsx'), { joy: 'qobiq' });
const Loyihalar = kechiktir(() => import('../features/projects/Loyihalar.jsx'), { joy: 'qobiq' });
const EditorPage = kechiktir(() => import('../features/editor/EditorPage.jsx'), { joy: 'qobiq' });
const Onboarding = kechiktir(() => import('../features/onboarding/Onboarding.jsx'));

/* TZ-19: ilova qobig'i — faqat qaysi sahifa ko'rinishini tanlaydi. Har sahifa va bo'lim — o'z modulida (features/*),
 * holat — store/, server va dvigatel — services/. Ekranlar JSX va stillari — tasdiqlangan dizayndan (o'zgarishsiz). */
const SHELL = { app: [EditorPage, 'editor'], projects: [Loyihalar, 'projects'], settings: [Sozlamalar, 'settings'] };
/* har bo'lim — o'z xato chegarasida: bittasi yiqilsa, qolgani ishlaydi */
const M = ({ m, joy, children }) => <XatoChegarasi modul={m} joy={joy}>{children}</XatoChegarasi>;

/* kirish / ro'yxat ekrani yoki (sessiya tiklanayotgan paytda) neutral yuklanish. Alohida komponent: auth holati (har tugma bosish, saqlash belgisi)
 * butun ilovani emas, faqat shuni qayta chizadi. */
function KirishYoki() {
  const { tiklash } = useSlice('auth');
  return tiklash ? <Yuklanish /> : <M m="auth" joy="sahifa"><Kirish /></M>;
}

/* Tezlik (testchi, 2026-10-22): kechiktirilgan bo'laklarni oldindan yuklash (hech narsa chizmaydi).
 *  - muharrir: birinchi chizishdan keyin — kirgan foydalanuvchida darhol (sessiya tekshirilayotgan paytda), kirmaganda bo'sh vaqtda
 *    (ro'yxatdan o'tish formasi to'ldirilguncha keladi);
 *  - 3D sahna ko'tarilgach (tarmoq bo'shadi): sozlamalar, "Loyihalarim", varaq tanalari (admin bo'lsa — admin panel ham): ochilganda kutish bo'lmaydi. */
function OldindanYukla() {
  const sceneOn = useSlice('editor').sceneOn, admin = (useSlice('auth').user || {}).role === 'admin';
  useEffect(() => {
    if (S.loggedIn) { EditorPage.oldindan(); return undefined; }
    return boshVaqtda(() => EditorPage.oldindan());
  }, []);
  useEffect(() => {
    if (!sceneOn) return undefined;
    return boshVaqtda(() => { Sozlamalar.oldindan(); Loyihalar.oldindan(); varaqlarniOldindanYukla(); if (admin) AdminQobiq.oldindan(); }, 5000);
  }, [sceneOn, admin]);
  return null;
}

export default function App() {
  const { screen } = useSlice('nav');
  useTil();                                         // TZ-18: til almashsa — hamma matn qayta chiziladi (sahifa yuklanmaydi)
  const ui = useSlice('ui');
  const [Page, pageM] = SHELL[screen] || [];
  return (
    <div data-s3a="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased"}}>
      {screen === 'tg' ? <TgKutish /> : null}
      {screen === 'admin' ? <M m="admin" joy="sahifa"><AdminQobiq /></M> : null}
      {/* Tezlik (testchi, 2026-10-22): kirgan foydalanuvchi sahifani qayta ochganda sessiya tiklanguncha (/api/me) kirish ekrani EMAS, neutral yuklanish ko'rinadi */}
      {screen === 'reg' || screen === 'login' ? <KirishYoki /> : null}
      {screen === 'onb1' || screen === 'onb2' ? <M m="onboarding" joy="sahifa"><Onboarding /></M> : null}
      {Page ? (
        <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
          <M m="shell"><Header /></M>
          <M key={pageM} m={pageM} joy="sahifa"><Page /></M>
        </div>
      ) : null}
      <M m="editor/ai"><AiOyna /></M>
      <M m="editor/inside"><IchiniKorish /></M>
      <OldindanYukla />
      <Tasdiq cf={ui.cf} onNo={confirmNo} onYes={confirmYes} />
      <M m="editor/varaq"><Varaqlar /></M>
      <Toast text={ui.toast} code={ui.toastCode} />
      <TilMenyu pos={ui.tilMenu} onClose={() => set('ui', { tilMenu: null })} />
    </div>
  );
}
