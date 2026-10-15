import React from 'react';

/* TZ-19: sayt — bosh qism — aylanuvchi 3D hikoya (skroll bilan). JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Hero({ v }) {
  return (
    <section id="hero" style={{"position":"relative","height":"520vh","marginTop":"-64px"}}>
      <div style={{"position":"sticky","top":"0","height":"100vh","overflow":"hidden","background":"radial-gradient(ellipse 60% 55% at 66% 52%,rgba(255,122,69,.16),transparent 70%),radial-gradient(ellipse 50% 50% at 20% 80%,rgba(95,225,196,.10),transparent 70%),var(--bg)"}}>
        <div ref={v.storyHost} style={{"position":"absolute","inset":"0"}}>
          <div ref={v.storyOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
        </div>
        {v.notLoaded ? (<>
          <div style={{"position":"absolute","right":"clamp(16px,8vw,120px)","top":"50%","zIndex":"1","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
            {"3D yuklanmoqda…"}
          </div>
        </>) : null}
        <div style={{"position":"absolute","inset":"64px 0 0","zIndex":"3","pointerEvents":"none","opacity":v.st?.io,"transform":v.st?.it}}>
          <div style={{"maxWidth":"1280px","height":"100%","margin":"0 auto","padding":"clamp(24px,6vh,72px) clamp(16px,4vw,32px)","display":"flex","flexDirection":"column","justifyContent":"center","gap":"24px"}}>
            <div style={{"display":"flex","flexDirection":"column","gap":"22px","maxWidth":"600px"}}>
              <span style={{"alignSelf":"flex-start","padding":"7px 14px","borderRadius":"999px","border":"1px solid var(--line)","background":"rgba(23,50,57,.7)","fontSize":"13px","fontWeight":"700","color":"var(--cyan)"}}>
                {"Mebel ustalari · dizaynerlar · Bazischilar uchun"}
              </span>
              <h1 style={{"margin":"0","fontSize":"clamp(38px,5.4vw,72px)","lineHeight":"1","letterSpacing":"-.045em","fontWeight":"800","textWrap":"balance"}}>
                {"Mebelni 3D'da chizing. "}
                <span style={{"color":"var(--acc)"}}>
                  {"Kroy, smeta va stanok fayli"}
                </span>
                {" o'zi chiqadi."}
              </h1>
              <p style={{"margin":"0","fontSize":"clamp(16px,1.4vw,19px)","color":"var(--mut)","maxWidth":"520px","textWrap":"pretty"}}>
                {"Zamerdan stanokkacha — bitta brauzer ilovasida, telefoningizda ham. O'rnatish shart emas."}
              </p>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"12px","pointerEvents":"auto"}}>
                <a href="app.html#reg" onClick={v.goReg} style={{"height":"56px","padding":"0 26px","borderRadius":"16px","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","display":"flex","alignItems":"center","transition":"transform .18s ease-out,box-shadow .18s"}} className="h7">
                  {"Ro'yxatdan o'tish"}
                </a>
                <button onClick={v.goDemo} style={{"height":"56px","padding":"0 24px","borderRadius":"16px","background":"rgba(23,50,57,.75)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"16px","cursor":"pointer"}} className="h8">
                  {"3D demoni ochish"}
                </button>
              </div>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
                <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                  <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                    {"121"}
                  </span>
                  {" tayyor modul"}
                </span>
                <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                  <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                    {"17"}
                  </span>
                  {" xil fayl"}
                </span>
                <span style={{"padding":"7px 13px","borderRadius":"999px","background":"rgba(23,50,57,.7)","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"600"}}>
                  {"O'zbek tilida AI"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style={{"position":"absolute","right":"clamp(16px,4vw,48px)","bottom":"28px","zIndex":"3","opacity":v.st?.io,"display":"flex","flexDirection":"column","alignItems":"center","gap":"8px","fontSize":"13px","color":"var(--mut)","fontWeight":"600","pointerEvents":"none"}}>
          <span>
            {"Aylantiring — modul ochiladi"}
          </span>
          <span style={{"width":"26px","height":"42px","borderRadius":"999px","border":"1.5px solid var(--mut)","display":"flex","justifyContent":"center","paddingTop":"8px"}}>
            <span style={{"width":"4px","height":"9px","borderRadius":"9px","background":"var(--acc)"}}></span>
          </span>
        </div>
        <div style={{"position":"absolute","left":"clamp(16px,4vw,48px)","bottom":"clamp(16px,5vh,48px)","zIndex":"3","width":"min(430px,calc(100% - 32px))","opacity":v.st?.co,"transform":v.st?.ct,"background":"rgba(23,50,57,.82)","backdropFilter":"blur(14px)","WebkitBackdropFilter":"blur(14px)","border":"1px solid var(--line)","borderRadius":"24px","padding":"clamp(18px,2.2vw,26px)","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 24px 60px rgba(0,0,0,.25)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","fontWeight":"700","color":"var(--acct)"}}>
              <span className="sc-interp">{v.st?.n}</span>{" / 06"}
            </span>
            <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600"}}>
              {"Pastki shkaf · MC-KP-02"}
            </span>
          </div>
          <h3 style={{"margin":"0","fontSize":"clamp(22px,2.3vw,30px)","lineHeight":"1.1","letterSpacing":"-.02em","fontWeight":"800","textWrap":"balance"}}>
            <span className="sc-interp">{v.st?.title}</span>
          </h3>
          <p style={{"margin":"0","color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            <span className="sc-interp">{v.st?.text}</span>
          </p>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(4,minmax(0,1fr))","gap":"6px"}}>
            <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
              <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.st?.c?.detal}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"detal"}
              </div>
            </div>
            <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
              <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.st?.c?.zap}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"zapchast"}
              </div>
            </div>
            <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
              <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.st?.c?.krom}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"m kromka"}
              </div>
            </div>
            <div style={{"background":"var(--sfc2)","borderRadius":"14px","padding":"10px"}}>
              <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.st?.c?.area}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"m² plita"}
              </div>
            </div>
          </div>
          <div style={{"display":"flex","gap":"4px"}}>
            {(v.st?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
              <span style={{"flex":"1","height":"4px","borderRadius":"999px","background":b?.c}}></span>
            </React.Fragment>))}
          </div>
        </div>
      </div>
    </section>
  );
}
