import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function AiOyna({ v }) {
  return (
    <>
        {v.aiOpen ? (<>
          <div onClick={v.closeAi} style={{"position":"fixed","inset":"0","zIndex":"60","background":"rgba(4,12,15,.55)"}}></div>
          <div style={{"position":"fixed","left":"50%","bottom":"0","zIndex":"61","transform":"translateX(-50%)","width":"min(640px,100%)","background":"var(--sfc)","border":"1px solid var(--line)","borderBottom":"0","borderRadius":"28px 28px 0 0","padding":"12px 20px 24px","display":"flex","flexDirection":"column","gap":"14px","boxShadow":"0 -20px 60px rgba(0,0,0,.4)"}}>
            <span style={{"alignSelf":"center","width":"44px","height":"5px","borderRadius":"9px","background":"var(--sfc3)"}}></span>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                {"✨ AI'ga aytib bering"}
              </span>
              <button onClick={v.closeAi} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                {"×"}
              </button>
            </div>
            <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder="oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf" style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"none","outline":"none"}}></textarea>
            <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
              {(v.aiEx || []).map((x, $index) => (<React.Fragment key={$index}>
                <button onClick={x?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600","fontSize":"13px","textAlign":"left"}}>
                  <span className="sc-interp">{x?.t}</span>
                </button>
              </React.Fragment>))}
            </div>
            <div style={{"display":"flex","gap":"8px"}}>
              <button onClick={v.toggleMic} style={{"height":"52px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":v.micBg,"color":v.micT,"fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                {"🎤 "}<span className="sc-interp">{v.micLabel}</span>
              </button>
              <button onClick={v.aiBuild} style={{"flex":"1","height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
                {"🪄 Qurish"}
              </button>
            </div>
          </div>
        </>) : null}
    </>
  );
}
