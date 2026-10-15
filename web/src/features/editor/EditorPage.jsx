import React from 'react';
import { useSlice } from '../../store/index.js';
import EditorNav from './EditorNav.jsx';
import Sahna from './scene/Sahna.jsx';
import QadamXona from './room/QadamXona.jsx';
import QadamMebel from './catalog/QadamMebel.jsx';
import QadamNarx from './pricing/QadamNarx.jsx';
import QadamFayllar from './files/QadamFayllar.jsx';

/* TZ-19: muharrir sahifasi — chapda qadamlar, o'rtada sahna, o'ngda joriy qadam paneli (dizayndagi joylashuv). */
const STEP = { 1: QadamXona, 2: QadamMebel, 3: QadamNarx, 4: QadamFayllar };

export default function EditorPage() {
  const { step } = useSlice('editor');
  const Qadam = STEP[step];
  return (
    <div data-ed="" style={{"flex":"1 1 auto","height":"calc(100vh - 64px)","display":"grid","gridTemplateColumns":"200px minmax(0,1fr) 400px"}}>
      <EditorNav />
      <Sahna />
      <aside data-panel="" style={{"height":"100%","overflow":"auto","borderLeft":"1px solid var(--line)","background":"var(--bg)","padding":"20px","display":"flex","flexDirection":"column","gap":"16px"}}>
        {Qadam ? <Qadam /> : null}
      </aside>
    </div>
  );
}
