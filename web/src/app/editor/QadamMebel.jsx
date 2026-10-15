import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function QadamMebel({ v }) {
  return (
    <>
                  {v.isS2 ? (<>
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","gap":"8px"}}>
                      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                          {"② Qadam"}
                        </span>
                        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                          {"Mebel"}
                        </h2>
                      </div>
                      <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                        {"121 ta modul"}
                      </span>
                    </div>
                    <input value={v.q} onChange={v.onQ} placeholder="shkaf 2 eshik…" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","height":"48px","background":"var(--sfc)","flex":"0 0 auto"}} />
                    <div style={{"display":"flex","gap":"6px","overflowX":"auto","flex":"0 0 auto","paddingBottom":"2px"}}>
                      {(v.cats || []).map((c, $index) => (<React.Fragment key={$index}>
                        <button onClick={c?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","flex":"0 0 auto","background":c?.bg,"color":c?.c,"whiteSpace":"nowrap"}}>
                          <span className="sc-interp">{c?.label}</span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                      {(v.mats || []).map((m, $index) => (<React.Fragment key={$index}>
                        <button onClick={m?.cycle} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc)","color":"var(--txt)","fontWeight":"600"}}>
                          <span style={{"color":"var(--mut)"}}>
                            <span className="sc-interp">{m?.k}</span>{":"}
                          </span>
                          <span style={{"fontWeight":"800"}}>
                            <span className="sc-interp">{m?.v}</span>
                          </span>
                          <span style={{"color":"var(--mut)"}}>
                            {"▾"}
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    {v.catEmpty ? (<>
                      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"32px 16px","textAlign":"center","display":"flex","flexDirection":"column","gap":"6px"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Topilmadi — boshqa so'z bilan qidiring"}
                        </span>
                        <span style={{"color":"var(--mut)","fontSize":"14px"}}>
                          {"Masalan: \"pastki\", \"osma\", \"tortma\""}
                        </span>
                      </div>
                    </>) : null}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {(v.catalog || []).map((X, $index) => (<React.Fragment key={$index}>
                        <button onClick={X?.add} style={{"display":"flex","gap":"12px","alignItems":"center","padding":"10px","borderRadius":"18px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","cursor":"pointer","textAlign":"left","transition":"border-color .2s,transform .2s"}} className="h5">
                          <div style={{"position":"relative","width":"76px","height":"76px","flex":"0 0 auto","borderRadius":"14px","background":"radial-gradient(circle at 50% 70%,rgba(255,122,69,.18),transparent 70%),var(--bg)","perspective":"600px"}}>
                            <div style={{"position":"absolute","inset":"0","transformStyle":"preserve-3d","transform":"rotateX(-22deg) rotateY(-38deg)"}}>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.fh,"background":X?.t?.fbg,"transform":X?.t?.ft,"border":"1px solid rgba(0,0,0,.25)"}}></div>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.sw,"height":X?.t?.fh,"background":"#D9D3C6","transform":X?.t?.st,"border":"1px solid rgba(0,0,0,.2)"}}></div>
                              <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.sw,"background":"#F3F0E9","transform":X?.t?.tt,"border":"1px solid rgba(0,0,0,.15)"}}></div>
                            </div>
                          </div>
                          <span style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
                            <span style={{"fontWeight":"800","fontSize":"15px","lineHeight":"1.25"}}>
                              <span className="sc-interp">{X?.name}</span>
                            </span>
                            <span style={{"fontSize":"13px","color":"var(--cyan)","fontWeight":"700","fontVariantNumeric":"tabular-nums"}}>
                              <span className="sc-interp">{X?.dims}</span>
                            </span>
                            <span style={{"fontSize":"12px","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                              <span className="sc-interp">{X?.lim}</span>
                            </span>
                          </span>
                          <span style={{"display":"flex","flexDirection":"column","alignItems":"flex-end","gap":"6px"}}>
                            <span style={{"fontSize":"13px","fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                              <span className="sc-interp">{X?.price}</span>
                            </span>
                            <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800"}}>
                              {"+"}
                            </span>
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                  </>) : null}
    </>
  );
}
