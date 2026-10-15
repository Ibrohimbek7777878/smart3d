import React from 'react';
import { useSlice } from '../../store/index.js';
import EditorNav from './EditorNav.jsx';
import Sahna from './scene/Sahna.jsx';
import QadamXona from './room/QadamXona.jsx';
import QadamMebel from './catalog/QadamMebel.jsx';
import QadamNarx from './pricing/QadamNarx.jsx';
import QadamFayllar from './files/QadamFayllar.jsx';
import XatoChegarasi from '../../shared/ui/XatoChegarasi.jsx';

/* TZ-19: muharrir sahifasi — chapda qadamlar, o'rtada sahna, o'ngda joriy qadam paneli (dizayndagi joylashuv). */
const STEP = { 1: [QadamXona, 'editor/room'], 2: [QadamMebel, 'editor/catalog'], 3: [QadamNarx, 'editor/pricing'], 4: [QadamFayllar, 'editor/files'] };

export default function EditorPage() {
  const { step } = useSlice('editor');
  const [Qadam, qm] = STEP[step] || [];
  return (
    <div data-ed="" style={{"flex":"1 1 auto","height":"calc(100vh - 64px)","display":"grid","gridTemplateColumns":"200px minmax(0,1fr) 400px"}}>
      <XatoChegarasi modul="editor/nav"><EditorNav /></XatoChegarasi>
      <XatoChegarasi modul="editor/scene"><Sahna /></XatoChegarasi>
      <aside data-panel="" style={{"height":"100%","overflow":"auto","borderLeft":"1px solid var(--line)","background":"var(--bg)","padding":"20px","display":"flex","flexDirection":"column","gap":"16px"}}>
        {Qadam ? <XatoChegarasi key={qm} modul={qm}><Qadam /></XatoChegarasi> : null}
      </aside>
    </div>
  );
}
