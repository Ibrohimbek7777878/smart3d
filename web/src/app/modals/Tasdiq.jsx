import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function Tasdiq({ v }) {
  return (
    <>
        {v.cf?.on ? (<>
          <div style={{"position":"fixed","inset":"0","zIndex":"80","background":"rgba(4,12,15,.6)","display":"grid","placeItems":"center","padding":"16px"}}>
            <div role="dialog" style={{"width":"min(420px,100%)","background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 30px 80px rgba(0,0,0,.5)"}}>
              <span style={{"fontSize":"20px","fontWeight":"800"}}>
                <span className="sc-interp">{v.cf?.title}</span>
              </span>
              <span style={{"color":"var(--mut)"}}>
                <span className="sc-interp">{v.cf?.text}</span>
              </span>
              <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end","paddingTop":"8px"}}>
                <button onClick={v.cfNo} style={{"height":"48px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","cursor":"pointer"}}>
                  {"Bekor"}
                </button>
                <button onClick={v.cfYes} style={{"height":"48px","padding":"0 18px","borderRadius":"14px","border":"0","background":v.cf?.bg,"color":v.cf?.c,"fontWeight":"800","cursor":"pointer"}}>
                  <span className="sc-interp">{v.cf?.ok}</span>
                </button>
              </div>
            </div>
          </div>
        </>) : null}
    </>
  );
}
