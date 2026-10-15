import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function QadamXona({ v }) {
  return (
    <>
                  {v.isS1 ? (<>
                    <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                        {"① Qadam"}
                      </span>
                      <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                        {"Xona"}
                      </h2>
                    </div>
                    <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"var(--sfc)"}}>
                      {(v.shapes || []).map((x, $index) => (<React.Fragment key={$index}>
                        <button onClick={x?.pick} style={{"flex":"1","height":"40px","borderRadius":"10px","border":"0","background":x?.bg,"color":x?.c,"fontWeight":"800","fontSize":"14px","cursor":"pointer","whiteSpace":"nowrap"}}>
                          <span className="sc-interp">{x?.label}</span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"8px"}}>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Eni, mm"}
                        </span>
                        <input type="number" value={v.room?.w} onChange={v.onRoomW} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Chuqurligi"}
                        </span>
                        <input type="number" value={v.room?.d} onChange={v.onRoomD} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                          {"Bo'yi"}
                        </span>
                        <input type="number" value={v.room?.h} onChange={v.onRoomH} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
                      </label>
                    </div>
                    <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                      {(v.roomPresets || []).map((p, $index) => (<React.Fragment key={$index}>
                        <button onClick={p?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":p?.bg,"color":p?.c,"fontVariantNumeric":"tabular-nums"}}>
                          <span className="sc-interp">{p?.label}</span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"10px"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Teshiklar"}
                        </span>
                        <button onClick={v.addHole} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","minHeight":"32px"}}>
                          {"+ Qo'shish"}
                        </button>
                      </div>
                      {(v.holes || []).map((h, $index) => (<React.Fragment key={$index}>
                        <div style={{"display":"flex","justifyContent":"space-between","gap":"8px","padding":"8px 0","borderTop":"1px solid var(--line)","fontSize":"14px"}}>
                          <span style={{"fontWeight":"700"}}>
                            <span className="sc-interp">{h?.t}</span>
                          </span>
                          <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                            <span className="sc-interp">{h?.d}</span>
                          </span>
                        </div>
                      </React.Fragment>))}
                    </div>
                    <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"2px"}}>
                      {/* TZ-09 8-bosqich (dizaynda yo'q): ⚙ — dobor/karniz balandligi, moyka o'lchami; "+ Qo'shish" tugmasi uslubida */}
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingBottom":"6px"}}>
                        <span style={{"fontWeight":"800"}}>
                          {"Oshxona elementlari"}
                        </span>
                        <button onClick={v.openKitchen} aria-label="Oshxona elementlarini sozlash" style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)"}}>
                          {"⚙ Sozlash"}
                        </button>
                      </div>
                      {(v.toggles || []).map((t, $index) => (<React.Fragment key={$index}>
                        <button onClick={t?.flip} style={{"minHeight":"48px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","background":"none","border":"0","borderTop":"1px solid var(--line)","color":"var(--txt)","fontSize":"15px","fontWeight":"700","cursor":"pointer","padding":"0","textAlign":"left"}}>
                          <span style={{"display":"flex","flexDirection":"column"}}>
                            <span>
                              <span className="sc-interp">{t?.label}</span>
                            </span>
                            <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600"}}>
                              <span className="sc-interp">{t?.sub}</span>
                            </span>
                          </span>
                          <span style={{"width":"48px","height":"28px","flex":"0 0 48px","borderRadius":"999px","background":t?.bg,"position":"relative","transition":"background .2s"}}>
                            <span style={{"position":"absolute","left":"3px","top":"3px","width":"22px","height":"22px","borderRadius":"999px","background":"#fff","transform":t?.kx,"transition":"transform .2s ease-out"}}></span>
                          </span>
                        </button>
                      </React.Fragment>))}
                    </div>
                    <button onClick={v.goStep2} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
                      {"Keyingi: Mebel →"}
                    </button>
                  </>) : null}
    </>
  );
}
