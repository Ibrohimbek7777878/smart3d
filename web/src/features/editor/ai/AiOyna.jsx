import React from 'react';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useSlice } from '../../../store/index.js';
import Varaq from '../../../shared/ui/Varaq.jsx';
import { aiView, closeAi, buildFromText } from './actions.js';

/* TZ-19: AI oynasi — dizayndagi pastki varaq (JSX va stillar dizayndan). */
export default function AiOyna() {
  const ai = useSlice('ai');
  if (!ai.open) return null;
  const v = aiView(ai);
  return (
    <Varaq title={<><Ikon n="ai" size={20} style={{ color: "var(--cyan)" }} />{"AI'ga aytib bering"}</>} label={"AI'ga aytib bering"} kind="ai" onClose={closeAi}>
      <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder="oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf" style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"none","outline":"none"}}></textarea>
      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
        {v.aiEx.map((x, i) => (
          <button key={i} onClick={x.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600","fontSize":"13px","textAlign":"left"}}>
            <span className="sc-interp">{x.t}</span>
          </button>))}
      </div>
      <div style={{"display":"flex","gap":"8px"}}>
        <button onClick={v.toggleMic} style={{"height":"52px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":v.micBg,"color":v.micT,"fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
          <Ikon n="mikrofon" /><span className="sc-interp">{v.micLabel}</span>
        </button>
        <button onClick={buildFromText} style={{"flex":"1","height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
          <Ikon n="qurish" size={18} />{"Qurish"}
        </button>
      </div>
    </Varaq>
  );
}
