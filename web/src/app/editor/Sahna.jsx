import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function Sahna({ v }) {
  return (
    <>
                <div data-scene="" style={{"position":"relative","minWidth":"0","height":"100%","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 40%,rgba(255,122,69,.10),transparent 70%),#0C1C22"}}>
                  <div ref={v.roomHost} style={{"position":"absolute","inset":"0"}}>
                    <div ref={v.roomOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                  </div>
                  {v.notLoaded ? (<>
                    <div style={{"position":"absolute","inset":"0","display":"grid","placeItems":"center","color":"var(--mut)","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
                      {"3D sahna yuklanmoqda…"}
                    </div>
                  </>) : null}
                  <div style={{"position":"absolute","left":"12px","right":"12px","top":"12px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"8px","pointerEvents":"none"}}>
                    <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","pointerEvents":"auto"}}>
                      <button onClick={v.set2D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b2,"color":v.vw?.t2,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
                        {"2D"}
                      </button>
                      <button onClick={v.set3D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b3,"color":v.vw?.t3,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
                        {"3D"}
                      </button>
                    </div>
                    <button onClick={v.shot} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"📸 Rasm"}
                    </button>
                    <button onClick={v.toggleSpin} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":v.vw?.sb,"border":"1px solid var(--line)","color":v.vw?.st,"fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"🔄 360°"}
                    </button>
                    <button onClick={v.toggleAllOpen} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"🚪 "}<span className="sc-interp">{v.openAllLabel}</span>
                    </button>
                    <button onClick={v.center} aria-label="Markazga" style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
                      {"⌖ Markazga"}
                    </button>
                    {/* TZ-09 8-bosqich (dizaynda yo'q): VR — faqat VR qurilmada ko'rinadi (eski saytdagi WebXR) */}
                    {v.vrOk ? (<>
                      <button onClick={v.vr} aria-label="VR" style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer"}}>
                        {"🥽 VR"}
                      </button>
                    </>) : null}
                  </div>
                  {v.tip?.on ? (<>
                    <div style={{"position":"absolute","left":"50%","top":"72px","zIndex":"5","transform":"translateX(-50%)","width":"min(360px,calc(100% - 24px))","background":"var(--cyan)","color":"#06231E","borderRadius":"18px","padding":"14px 16px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 16px 40px rgba(0,0,0,.35)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontWeight":"800","fontSize":"16px"}}>
                          <span className="sc-interp">{v.tip?.text}</span>
                        </span>
                        <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","fontWeight":"700"}}>
                          <span className="sc-interp">{v.tip?.n}</span>{"/3"}
                        </span>
                      </div>
                      <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end"}}>
                        <button onClick={v.tipSkip} style={{"height":"36px","padding":"0 12px","borderRadius":"10px","border":"0","background":"transparent","color":"#06231E","fontWeight":"700","cursor":"pointer"}}>
                          {"O'tkazib yuborish"}
                        </button>
                        <button onClick={v.tipNext} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":"#06231E","color":"var(--cyan)","fontWeight":"800","cursor":"pointer"}}>
                          <span className="sc-interp">{v.tip?.btn}</span>
                        </button>
                      </div>
                    </div>
                  </>) : null}
                  {v.showModCard ? (<>
                    <div style={{"position":"absolute","left":"12px","bottom":"12px","zIndex":"4","width":"min(350px,calc(100% - 84px))","maxHeight":"calc(100% - 80px)","overflow":"auto","background":"rgba(23,50,57,.96)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 20px 50px rgba(0,0,0,.4)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                          <span style={{"fontSize":"17px","fontWeight":"800","lineHeight":"1.2"}}>
                            <span className="sc-interp">{v.sm?.name}</span>
                          </span>
                          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                            <span className="sc-interp">{v.sm?.code}</span>
                          </span>
                        </div>
                        <button onClick={v.deselect} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
                          {"×"}
                        </button>
                      </div>
                      {(v.sm?.rows || []).map((r, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                            <span style={{"flex":"1","fontSize":"14px","fontWeight":"700","color":"var(--mut)"}}>
                              <span className="sc-interp">{r?.label}</span>
                            </span>
                            <button onClick={r?.dec} aria-label="Kamaytirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
                              {"–"}
                            </button>
                            <input type="number" value={r?.val} onChange={r?.onInput} onBlur={r?.commit} onKeyDown={r?.key} style={{"width":"76px","height":"40px","borderRadius":"12px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","textAlign":"center","fontVariantNumeric":"tabular-nums","outline":"none"}} />
                            <button onClick={r?.inc} aria-label="Oshirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
                              {"+"}
                            </button>
                          </div>
                          <span style={{"fontSize":"12px","color":"var(--mut)","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                            {"min "}<span className="sc-interp">{r?.min}</span>{" · max "}<span className="sc-interp">{r?.max}</span>
                          </span>
                        </div>
                      </React.Fragment>))}
                      {v.sm?.hasWarn ? (<>
                        <div style={{"padding":"10px 12px","borderRadius":"12px","background":"rgba(255,123,123,.12)","border":"1px solid rgba(255,123,123,.4)","color":"var(--danger)","fontSize":"13px","fontWeight":"700"}}>
                          {"⚠️ "}<span className="sc-interp">{v.sm?.warn}</span>
                        </div>
                      </>) : null}
                      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        <button onClick={v.moveL} aria-label="Chapga 50 mm" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"◀"}
                        </button>
                        <button onClick={v.moveR} aria-label="O'ngga 50 mm" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"▶"}
                        </button>
                        <button onClick={v.rotate} aria-label="90 gradus burish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)","fontSize":"14px"}}>
                          {"⟳"}
                        </button>
                        <button onClick={v.dup} aria-label="Nusxa" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
                          {"⧉"}
                        </button>
                        <button onClick={v.askDel} aria-label="O'chirish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"rgba(255,123,123,.14)","color":"var(--danger)"}}>
                          {"🗑"}
                        </button>
                      </div>
                      <button onClick={v.toggleModOpen} style={{"height":"48px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                        {"🚪 "}<span className="sc-interp">{v.sm?.openLabel}</span>
                      </button>
                      <span style={{"fontSize":"12px","color":"var(--mut)","textWrap":"pretty"}}>
                        {"Eshik yoki tortmani bosing — ochiladi. Ochilgan detalni bosing — ma'lumot chiqadi."}
                      </span>
                      {v.sm?.canIns ? (<>
                        <button onClick={v.openInside} style={{"width":"100%","height":"48px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","animation":"s3pulse 2.4s ease-out 2"}}>
                          {"Ichini ko'rish →"}
                        </button>
                      </>) : null}
                      {v.sm?.noIns ? (<>
                        <div style={{"height":"48px","borderRadius":"14px","border":"1px dashed var(--line)","color":"var(--mut)","fontWeight":"700","fontSize":"14px","display":"flex","alignItems":"center","justifyContent":"center"}}>
                          {"Ichki ko'rinish tez orada"}
                        </div>
                      </>) : null}
                    </div>
                  </>) : null}
                  {v.hasPart ? (<>
                    <div style={{"position":"absolute","right":"12px","top":"68px","zIndex":"6","width":"min(330px,calc(100% - 24px))","maxHeight":"calc(100% - 160px)","overflow":"auto","background":"rgba(23,50,57,.97)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"14px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 20px 50px rgba(0,0,0,.45)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
                        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                          <span style={{"fontSize":"18px","fontWeight":"800","lineHeight":"1.2"}}>
                            <span className="sc-interp">{v.pt?.name}</span>
                          </span>
                          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                            <span className="sc-interp">{v.pt?.code}</span>
                          </span>
                        </div>
                        <button onClick={v.closePart} aria-label="Yopish" style={{"width":"36px","height":"36px","flex":"0 0 auto","borderRadius":"12px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontSize":"17px","cursor":"pointer"}}>
                          {"×"}
                        </button>
                      </div>
                      <div ref={v.miniHost} style={{"position":"relative","height":"190px","flex":"0 0 auto","borderRadius":"16px","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,122,69,.16),transparent 70%),var(--bg)","border":"1px solid var(--line)"}}>
                        <div ref={v.miniOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                        <span style={{"position":"absolute","left":"10px","bottom":"8px","zIndex":"3","fontSize":"11px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Detal alohida · aylantiring"}
                        </span>
                      </div>
                      <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"6px 14px","fontSize":"14px"}}>
                        <span style={{"color":"var(--mut)"}}>
                          {"O'lcham"}
                        </span>
                        <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","color":"var(--cyan)"}}>
                          <span className="sc-interp">{v.pt?.dim}</span>
                        </span>
                        <span style={{"color":"var(--mut)"}}>
                          {"Material"}
                        </span>
                        <span style={{"fontWeight":"700"}}>
                          <span className="sc-interp">{v.pt?.mat}</span>
                        </span>
                        <span style={{"color":"var(--mut)"}}>
                          {"Kromka"}
                        </span>
                        <span style={{"fontWeight":"700"}}>
                          <span className="sc-interp">{v.pt?.edge}</span>
                        </span>
                      </div>
                      {v.pt?.isMov ? (<>
                        <button onClick={v.togglePartOpen} style={{"height":"44px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
                          {"🚪 "}<span className="sc-interp">{v.pt?.movLabel}</span>
                        </button>
                      </>) : null}
                    </div>
                  </>) : null}
                  <button onClick={v.openAi} aria-label="AI" style={{"position":"absolute","right":"16px","bottom":"16px","zIndex":"4","width":"60px","height":"60px","borderRadius":"20px","border":"0","background":"var(--cyan)","color":"#06231E","fontSize":"24px","fontWeight":"800","cursor":"pointer","boxShadow":"0 14px 36px rgba(95,225,196,.3)"}}>
                    {"✨"}
                  </button>
                </div>
    </>
  );
}
