import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function Loyihalar({ v }) {
  return (
    <>
            {v.isProjects ? (<>
              <main style={{"maxWidth":"1240px","width":"100%","margin":"0 auto","padding":"clamp(20px,4vw,40px) clamp(16px,4vw,32px) 64px","display":"flex","flexDirection":"column","gap":"24px"}}>
                <div style={{"display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"center","justifyContent":"space-between"}}>
                  <h1 style={{"margin":"0","fontSize":"clamp(28px,3.4vw,40px)","letterSpacing":"-.035em","fontWeight":"800"}}>
                    {"Loyihalarim"}
                  </h1>
                  <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","flex":"1 1 320px","justifyContent":"flex-end"}}>
                    <input value={v.pq} onChange={v.onPq} placeholder="Qidirish: nom yoki mijoz" style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","height":"48px","flex":"1 1 220px","maxWidth":"340px","background":"var(--sfc)"}} />
                    <button onClick={v.newProject} style={{"height":"48px","padding":"0 20px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","whiteSpace":"nowrap"}}>
                      {"+ Yangi loyiha"}
                    </button>
                    {/* TZ-09 8-bosqich (dizaynda yo'q): loyiha faylidan ochish (eski saytdagi "Yuklash" ham shu fayl) */}
                    <label style={{"height":"48px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"700","fontSize":"15px","cursor":"pointer","whiteSpace":"nowrap","display":"inline-flex","alignItems":"center"}}>
                      {"📂 Fayldan ochish"}
                      <input type="file" accept=".json,application/json" onChange={v.openFile} style={{"display":"none"}} />
                    </label>
                  </div>
                </div>
                {v.projEmpty ? (<>
                  <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"48px 24px","display":"flex","flexDirection":"column","alignItems":"center","gap":"14px","textAlign":"center"}}>
                    <span style={{"fontSize":"40px"}}>
                      {"🔍"}
                    </span>
                    <span style={{"fontSize":"18px","fontWeight":"800"}}>
                      {"Topilmadi — boshqa so'z bilan qidiring"}
                    </span>
                  </div>
                </>) : null}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill,minmax(260px,1fr))","gap":"14px"}}>
                  {(v.projects || []).map((X, $index) => (<React.Fragment key={$index}>
                    <div style={{"position":"relative","display":"flex"}}>
                    <button onClick={X?.open} style={{"flex":"1","minWidth":"0","textAlign":"left","borderRadius":"24px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","padding":"12px","cursor":"pointer","display":"flex","flexDirection":"column","gap":"12px","transition":"transform .35s cubic-bezier(.2,.8,.2,1),border-color .2s","transform":"perspective(900px)"}} className="h2">
                      <div style={{"width":"100%","height":"160px","borderRadius":"16px","display":"grid","placeItems":"center","background":"radial-gradient(circle at 50% 75%,rgba(255,122,69,.2),transparent 70%),var(--bg)"}}>
                        <div style={{"position":"relative","width":"120px","height":"120px","flex":"0 0 auto","background":"transparent","perspective":"600px"}}>
                          <div style={{"position":"absolute","inset":"0","transformStyle":"preserve-3d","transform":"rotateX(-22deg) rotateY(-38deg)"}}>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.fh,"background":X?.t?.fbg,"transform":X?.t?.ft,"border":"1px solid rgba(0,0,0,.25)"}}></div>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.sw,"height":X?.t?.fh,"background":"#D9D3C6","transform":X?.t?.st,"border":"1px solid rgba(0,0,0,.2)"}}></div>
                            <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.sw,"background":"#F3F0E9","transform":X?.t?.tt,"border":"1px solid rgba(0,0,0,.15)"}}></div>
                          </div>
                        </div>
                      </div>
                      <div style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 6px"}}>
                        <span style={{"fontSize":"18px","fontWeight":"800"}}>
                          <span className="sc-interp">{X?.name}</span>
                        </span>
                        <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                          <span className="sc-interp">{X?.client}</span>{" · "}<span className="sc-interp">{X?.date}</span>
                        </span>
                      </div>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","padding":"0 6px 6px"}}>
                        <span style={{"padding":"5px 12px","borderRadius":"999px","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"13px","fontVariantNumeric":"tabular-nums"}}>
                          <span className="sc-interp">{X?.price}</span>
                        </span>
                        <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                          <span className="sc-interp">{X?.mods}</span>
                        </span>
                      </div>
                    </button>
                    {/* TZ-09 8-bosqich (dizaynda yo'q): o'chirish = yashirish (arxiv), eski saytdagidek */}
                    <button onClick={X?.del} aria-label={"Loyihani o'chirish: " + (X?.name || '')} style={{"position":"absolute","top":"20px","right":"20px","width":"36px","height":"36px","borderRadius":"12px","border":"1px solid var(--line)","background":"rgba(23,50,57,.9)","color":"var(--danger)","fontSize":"15px","cursor":"pointer"}}>
                      {"🗑"}
                    </button>
                    </div>
                  </React.Fragment>))}
                </div>
              </main>
            </>) : null}
    </>
  );
}
