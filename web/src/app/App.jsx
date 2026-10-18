import React from 'react';
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
import Onboarding from '../features/onboarding/Onboarding.jsx';
import Header from '../features/shell/Header.jsx';
import Loyihalar from '../features/projects/Loyihalar.jsx';
import Sozlamalar from '../features/settings/Sozlamalar.jsx';
import EditorPage from '../features/editor/EditorPage.jsx';
import AiOyna from '../features/editor/ai/AiOyna.jsx';
import IchiniKorish from '../features/editor/inside/IchiniKorish.jsx';
import Varaqlar from '../features/editor/Varaqlar.jsx';

/* TZ-19: ilova qobig'i — faqat qaysi sahifa ko'rinishini tanlaydi. Har sahifa va bo'lim — o'z modulida (features/*),
 * holat — store/, server va dvigatel — services/. Ekranlar JSX va stillari — tasdiqlangan dizayndan (o'zgarishsiz). */
const SHELL = { app: [EditorPage, 'editor'], projects: [Loyihalar, 'projects'], settings: [Sozlamalar, 'settings'] };
/* har bo'lim — o'z xato chegarasida: bittasi yiqilsa, qolgani ishlaydi */
const M = ({ m, joy, children }) => <XatoChegarasi modul={m} joy={joy}>{children}</XatoChegarasi>;

export default function App() {
  const { screen } = useSlice('nav');
  useTil();                                         // TZ-18: til almashsa — hamma matn qayta chiziladi (sahifa yuklanmaydi)
  const ui = useSlice('ui');
  const [Page, pageM] = SHELL[screen] || [];
  return (
    <div data-s3a="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased"}}>
      {screen === 'tg' ? <TgKutish /> : null}
      {screen === 'reg' || screen === 'login' ? <M m="auth" joy="sahifa"><Kirish /></M> : null}
      {screen === 'onb1' || screen === 'onb2' ? <M m="onboarding" joy="sahifa"><Onboarding /></M> : null}
      {Page ? (
        <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
          <M m="shell"><Header /></M>
          <M key={pageM} m={pageM} joy="sahifa"><Page /></M>
        </div>
      ) : null}
      <M m="editor/ai"><AiOyna /></M>
      <M m="editor/inside"><IchiniKorish /></M>
      <Tasdiq cf={ui.cf} onNo={confirmNo} onYes={confirmYes} />
      <M m="editor/varaq"><Varaqlar /></M>
      <Toast text={ui.toast} code={ui.toastCode} />
      <TilMenyu pos={ui.tilMenu} onClose={() => set('ui', { tilMenu: null })} />
    </div>
  );
}
