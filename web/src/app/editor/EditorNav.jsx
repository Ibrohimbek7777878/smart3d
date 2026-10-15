import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function EditorNav({ v }) {
  return (
    <>
                <nav data-ednav="" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"16px 12px","borderRight":"1px solid var(--line)","background":"#0C1D23"}}>
                  {(v.nav || []).map((s, $index) => (<React.Fragment key={$index}>
                    <button data-navbtn="" onClick={s?.go} style={{"minHeight":"52px","borderRadius":"14px","border":"0","background":s?.bg,"color":s?.c,"display":"flex","alignItems":"center","gap":"12px","padding":"0 12px","fontWeight":"800","fontSize":"15px","cursor":"pointer","textAlign":"left","transition":"background .2s"}}>
                      <span style={{"width":"30px","height":"30px","flex":"0 0 30px","borderRadius":"999px","display":"grid","placeItems":"center","fontSize":"13px","fontWeight":"800","background":s?.nb,"color":s?.nc}}>
                        <span className="sc-interp">{s?.mark}</span>
                      </span>
                      <span>
                        <span className="sc-interp">{s?.label}</span>
                      </span>
                    </button>
                  </React.Fragment>))}
                  <div data-ednav-x="" style={{"height":"1px","background":"var(--line)","margin":"10px 4px"}}></div>
                  <button data-ednav-x="" onClick={v.goProjects} style={{"minHeight":"44px","borderRadius":"12px","border":"0","background":"transparent","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","textAlign":"left","padding":"0 12px"}} className="h3">
                    {"Loyihalar"}
                  </button>
                  <button data-ednav-x="" onClick={v.settingsToast} style={{"minHeight":"44px","borderRadius":"12px","border":"0","background":"transparent","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","textAlign":"left","padding":"0 12px"}} className="h4">
                    {"Sozlamalar"}
                  </button>
                </nav>
    </>
  );
}
