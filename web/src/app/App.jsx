import React from 'react';
import { useSlice } from '../store/index.js';
import { confirmNo, confirmYes } from '../store/ui.js';
import Tasdiq from '../shared/ui/Tasdiq.jsx';
import Toast from '../shared/ui/Toast.jsx';
import Kirish from '../features/auth/Kirish.jsx';
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
const SHELL = { app: EditorPage, projects: Loyihalar, settings: Sozlamalar };

export default function App() {
  const { screen } = useSlice('nav');
  const ui = useSlice('ui');
  const Page = SHELL[screen];
  return (
    <div data-s3a="" style={{"minHeight":"100vh","background":"var(--bg)","color":"var(--txt)","fontFamily":"'Manrope',system-ui,sans-serif","fontSize":"16px","lineHeight":"1.5","WebkitFontSmoothing":"antialiased"}}>
      {screen === 'reg' || screen === 'login' ? <Kirish /> : null}
      {screen === 'onb1' || screen === 'onb2' ? <Onboarding /> : null}
      {Page ? (
        <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column"}}>
          <Header />
          <Page />
        </div>
      ) : null}
      <AiOyna />
      <IchiniKorish />
      <Tasdiq cf={ui.cf} onNo={confirmNo} onYes={confirmYes} />
      <Varaqlar />
      <Toast text={ui.toast} />
    </div>
  );
}
