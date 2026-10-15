import React from 'react';
import { useQadamFayllar } from './useQadamFayllar.js';

/* TZ-19: ④ Fayllar — JSX va stillar tasdiqlangan dizayndan; qiymatlar useQadamFayllar() dan. */
export default function QadamFayllar() {
  const v = useQadamFayllar();
  return (
    <>
      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
          {"④ Qadam"}
        </span>
        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
          {"Fayllar"}
        </h2>
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"8px"}}>
        <span style={{"fontWeight":"800"}}>
          {"Tekshiruv"}
        </span>
        {(v.checks || []).map((k, $index) => (<React.Fragment key={$index}>
          {k?.ok ? (<>
            <span style={{"display":"flex","gap":"10px","fontSize":"14px"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              {k?.text}
            </span>
          </>) : (<>
            <span style={{"display":"flex","gap":"10px","fontSize":"14px","color":"var(--danger)"}}>
              <span style={{"fontWeight":"800"}}>
                {"⚠️"}
              </span>
              {k?.text}
            </span>
          </>)}
        </React.Fragment>))}
      </div>
      {(v.fileGroups || []).map((g, $index) => (<React.Fragment key={$index}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","padding":"18px"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":g?.col}}>
              <span className="sc-interp">{g?.title}</span>
            </span>
            <span style={{"fontSize":"12px","color":"var(--mut)"}}>
              <span className="sc-interp">{g?.sub}</span>
            </span>
          </div>
          <button onClick={g?.main} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
            <span className="sc-interp">{g?.mainLabel}</span>
          </button>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
            <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","alignSelf":"center"}}>
              {"Yana:"}
            </span>
            {(g?.more || []).map((m, $index) => (<React.Fragment key={$index}>
              <button onClick={m?.go} disabled={m?.dis} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","minHeight":"34px","background":"var(--sfc2)","color":m?.c,"fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","cursor":m?.cur}}>
                <span className="sc-interp">{m?.label}</span>
              </button>
            </React.Fragment>))}
          </div>
        </div>
      </React.Fragment>))}
    </>
  );
}
