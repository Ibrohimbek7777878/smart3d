import React from 'react';
import Ikon from '../../shared/ui/Ikon.jsx';

/* TZ-19: sayt — jonli 3D demo — modul, o'lcham, ichi. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Demo({ v }) {
  return (
    <section id="demo" style={{"maxWidth":"1240px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
      <div data-rv-id="s2" data-rv={v.rv?.s2} style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"24px"}}>
        <div style={{"display":"flex","flexDirection":"column","gap":"12px","maxWidth":"680px"}}>
          <span style={{"fontSize":"13px","fontWeight":"700","letterSpacing":".08em","textTransform":"uppercase","color":"var(--acct)"}}>
            {"Haqiqiy MebelCity moduli"}
          </span>
          <h2 style={{"margin":"0","fontSize":"clamp(32px,4.2vw,52px)","lineHeight":"1.05","letterSpacing":"-.035em","fontWeight":"800"}}>
            {"Modul ichida nima bor?"}
          </h2>
        </div>
        <p style={{"margin":"0","color":"var(--mut)","maxWidth":"400px","textWrap":"pretty"}}>
          {"Aylantiring, detalni bosing, enini o'zgartiring — har detal formulasi bo'yicha qayta hisoblanadi."}
        </p>
      </div>
      <div style={{"display":"flex","flexWrap":"wrap","gap":"16px","alignItems":"flex-start"}}>
        <div style={{"flex":"1.7 1 540px","minWidth":"0","display":"flex","flexDirection":"column","gap":"12px"}}>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
            <button onClick={v.modKP} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.kpB,"color":v.tab?.kpT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
              {"Pastki shkaf · 10 detal"}
            </button>
            <button onClick={v.modKU} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.kuB,"color":v.tab?.kuT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
              {"Osma shkaf · 8 detal"}
            </button>
            <button onClick={v.modSH} style={{"minHeight":"44px","padding":"0 16px","borderRadius":"999px","border":"1px solid var(--line)","background":v.tab?.shB,"color":v.tab?.shT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
              {"Shkaf-kupe · 41 detal"}
            </button>
          </div>
          <div ref={v.demoHost} style={{"position":"relative","width":"100%","aspectRatio":"4/5","maxHeight":"660px","borderRadius":"24px","overflow":"hidden","background":"var(--sfc)","border":"1px solid var(--line)","boxShadow":"var(--shadow)"}}>
            {v.demoNoGL ? (<>
              <div style={{"position":"absolute","inset":"0","zIndex":"1","background":"repeating-linear-gradient(135deg,var(--sfc2) 0 10px,var(--sfc) 10px 20px)","display":"grid","placeItems":"center","textAlign":"center","padding":"24px","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
                {"3D bu qurilmada ishlamaydi"}
                <br />
                {"modul rasmi — sochilgan ko'rinish"}
              </div>
            </>) : null}
            <div ref={v.demoOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
            <div style={{"position":"absolute","left":"12px","top":"12px","right":"64px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"6px","pointerEvents":"none"}}>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b0,"color":v.ph?.t0,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"1 Rangsiz"}
              </span>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b1,"color":v.ph?.t1,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"2 Rangli"}
              </span>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b2,"color":v.ph?.t2,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"3 Sochilish"}
              </span>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b3,"color":v.ph?.t3,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"4 Zapchast"}
              </span>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b4,"color":v.ph?.t4,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"5 Hisob"}
              </span>
              <span style={{"padding":"5px 11px","borderRadius":"999px","fontSize":"12px","fontWeight":"700","background":v.ph?.b5,"color":v.ph?.t5,"border":"1px solid var(--line)","transition":"all .25s ease-out"}}>
                {"6 Yig'ilish"}
              </span>
            </div>
            <button onClick={v.replay} aria-label="Qayta ko'rish" style={{"position":"absolute","right":"12px","top":"12px","zIndex":"3","width":"44px","height":"44px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"18px","cursor":"pointer"}} className="h12">
              <Ikon n="qayta" size={19} gap={0} style={{ verticalAlign: "middle" }} />
            </button>
            <div style={{"position":"absolute","left":"0","right":"0","bottom":"12px","zIndex":"1","textAlign":"center","fontSize":"12px","color":"var(--mut)","pointerEvents":"none"}}>
              {"Sudrab aylantiring · detalni bosing"}
            </div>
            {v.hasSel ? (<>
              <div style={{"position":"absolute","right":"12px","top":"60px","zIndex":"4","width":"min(360px,calc(100% - 24px))","maxHeight":"calc(100% - 72px)","overflow":"auto","background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","boxShadow":"0 16px 40px rgba(0,0,0,.28)","display":"flex","flexDirection":"column","gap":"10px"}}>
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
                  <span style={{"fontSize":"18px","fontWeight":"800"}}>
                    <span className="sc-interp">{v.sel?.name}</span>
                  </span>
                  <button onClick={v.closeSel} aria-label="Yopish" style={{"width":"36px","height":"36px","borderRadius":"12px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","cursor":"pointer"}}>
                    {"×"}
                  </button>
                </div>
                <div ref={v.miniHost} style={{"position":"relative","height":"220px","flex":"0 0 auto","borderRadius":"16px","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,122,69,.16),transparent 70%),var(--bg)","border":"1px solid var(--line)"}}>
                  <div ref={v.miniOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
                  <span style={{"position":"absolute","left":"10px","bottom":"8px","zIndex":"3","fontSize":"11px","color":"var(--mut)","fontWeight":"700"}}>
                    {"Detal alohida · aylantiring"}
                  </span>
                </div>
                <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"6px 14px","fontSize":"14px"}}>
                  <span style={{"color":"var(--mut)"}}>
                    {"Tayyor o'lcham"}
                  </span>
                  <span style={{"fontWeight":"700","fontVariantNumeric":"tabular-nums"}}>
                    <span className="sc-interp">{v.sel?.dim}</span>
                  </span>
                  <span style={{"color":"var(--mut)"}}>
                    {"Material"}
                  </span>
                  <span style={{"fontWeight":"600"}}>
                    <span className="sc-interp">{v.sel?.mat}</span>
                  </span>
                  <span style={{"color":"var(--mut)"}}>
                    {"Soni"}
                  </span>
                  <span style={{"fontWeight":"600"}}>
                    <span className="sc-interp">{v.sel?.n}</span>
                  </span>
                  <span style={{"color":"var(--mut)"}}>
                    {"Kromka"}
                  </span>
                  <span style={{"fontWeight":"600"}}>
                    <span className="sc-interp">{v.sel?.edge}</span>
                  </span>
                </div>
              </div>
            </>) : null}
          </div>
          <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"16px 20px","display":"flex","flexWrap":"wrap","gap":"16px 28px","alignItems":"center","boxShadow":"var(--shadow)"}}>
            <div style={{"display":"flex","padding":"4px","borderRadius":"16px","background":"var(--sfc2)","gap":"4px"}}>
              <button onClick={v.setColored} style={{"height":"40px","padding":"0 16px","borderRadius":"12px","border":"0","background":v.seg?.cB,"color":v.seg?.cT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                {"Rangli"}
              </button>
              <button onClick={v.setPlain} style={{"height":"40px","padding":"0 16px","borderRadius":"12px","border":"0","background":v.seg?.pB,"color":v.seg?.pT,"fontWeight":"700","fontSize":"14px","cursor":"pointer","transition":"background .2s ease-out"}}>
                {"Rangsiz"}
              </button>
            </div>
            <label style={{"flex":"1 1 200px","display":"flex","flexDirection":"column","gap":"0"}}>
              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"13px","color":"var(--mut)","fontWeight":"600"}}>
                <span>
                  {"Sochish"}
                </span>
                <span style={{"color":"var(--txt)","fontVariantNumeric":"tabular-nums"}}>
                  <span className="sc-interp">{v.explode}</span>{"%"}
                </span>
              </span>
              <input type="range" min="0" max="100" step="1" value={v.explode} onChange={v.onExplode} />
            </label>
            {v.isKP ? (<>
              <label style={{"flex":"1 1 240px","display":"flex","flexDirection":"column","gap":"0"}}>
                <span style={{"display":"flex","justifyContent":"space-between","fontSize":"13px","color":"var(--mut)","fontWeight":"600"}}>
                  <span>
                    {"Eni · min 600 · max 1070"}
                  </span>
                  <span style={{"color":"var(--txt)","fontVariantNumeric":"tabular-nums"}}>
                    <span className="sc-interp">{v.W}</span>{" mm"}
                  </span>
                </span>
                <input type="range" min="600" max="1070" step="10" value={v.W} onChange={v.onW} />
                <span style={{"fontSize":"13px","color":"var(--cyan)","fontWeight":"600","fontVariantNumeric":"tabular-nums"}}>
                  {"Eshik 2 × "}<span className="sc-interp">{v.doorW}</span>{" mm · Polka "}<span className="sc-interp">{v.polkaW}</span>{" mm"}
                </span>
              </label>
            </>) : null}
            {v.notKP ? (<>
              <span style={{"flex":"1 1 240px","fontSize":"14px","color":"var(--mut)"}}>
                {"O'lchamni sozlash — ilovada, modul chegarasida: "}<span className="sc-interp">{v.spec?.lim}</span>
              </span>
            </>) : null}
          </div>
        </div>
        <aside style={{"flex":"1 1 300px","minWidth":"0","display":"flex","flexDirection":"column","gap":"12px"}}>
          <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"20px","display":"flex","flexDirection":"column","gap":"14px","boxShadow":"var(--shadow)"}}>
            <div style={{"display":"flex","justifyContent":"space-between","gap":"8px","alignItems":"flex-start"}}>
              <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                <span style={{"fontSize":"20px","fontWeight":"800","letterSpacing":"-.01em"}}>
                  <span className="sc-interp">{v.spec?.name}</span>
                </span>
                <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                  <span className="sc-interp">{v.spec?.sub}</span>
                </span>
              </div>
              <span style={{"padding":"4px 10px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","whiteSpace":"nowrap"}}>
                <span className="sc-interp">{v.spec?.code}</span>
              </span>
            </div>
            <span style={{"fontSize":"15px","fontWeight":"700","color":"var(--cyan)","fontVariantNumeric":"tabular-nums"}}>
              <span className="sc-interp">{v.size}</span>
            </span>
            <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"8px"}}>
              <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                  <span className="sc-interp">{v.cnt?.detal}</span>
                </div>
                <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                  {"detal"}
                </div>
              </div>
              <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                  <span className="sc-interp">{v.cnt?.zap}</span>
                </div>
                <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                  {"zapchast"}
                </div>
              </div>
              <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                  <span className="sc-interp">{v.cnt?.krom}</span>
                </div>
                <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                  {"m kromka"}
                </div>
              </div>
              <div style={{"background":"var(--sfc2)","borderRadius":"18px","padding":"14px"}}>
                <div style={{"fontSize":"32px","fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums","lineHeight":"1.1"}}>
                  <span className="sc-interp">{v.cnt?.area}</span>
                </div>
                <div style={{"fontSize":"13px","color":"var(--mut)"}}>
                  {"m² plita"}
                </div>
              </div>
            </div>
          </div>
          <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"8px 20px 12px","boxShadow":"var(--shadow)"}}>
            <div style={{"display":"flex","justifyContent":"space-between","padding":"10px 0 6px","fontSize":"12px","color":"var(--mut)","fontWeight":"700","textTransform":"uppercase","letterSpacing":".06em"}}>
              <span>
                {"Detal"}
              </span>
              <span>
                {"O'lcham, mm"}
              </span>
            </div>
            {(v.spec?.list || []).map((r, $index) => (<React.Fragment key={$index}>
              <div style={{"display":"flex","justifyContent":"space-between","gap":"12px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"14px"}}>
                <span style={{"display":"flex","gap":"8px","minWidth":"0"}}>
                  <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums","width":"22px"}}>
                    <span className="sc-interp">{r?.n}</span>{"×"}
                  </span>
                  <span style={{"fontWeight":"600"}}>
                    <span className="sc-interp">{r?.name}</span>
                  </span>
                </span>
                <span style={{"fontVariantNumeric":"tabular-nums","fontWeight":"600","whiteSpace":"nowrap"}}>
                  <span className="sc-interp">{r?.dim}</span>
                </span>
              </div>
            </React.Fragment>))}
            <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","paddingTop":"12px","borderTop":"1px solid var(--line)"}}>
              {(v.spec?.hwList || []).map((h, $index) => (<React.Fragment key={$index}>
                <span style={{"padding":"5px 10px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"12px","fontWeight":"600"}}>
                  <span className="sc-interp">{h?.name}</span>{" "}
                  <span style={{"color":"var(--acct)","fontWeight":"800"}}>
                    {"×"}<span className="sc-interp">{h?.cnt}</span>
                  </span>
                </span>
              </React.Fragment>))}
            </div>
          </div>
          <a href="app.html#reg" onClick={v.goRegMod} style={{"minHeight":"56px","borderRadius":"18px","background":"var(--acc)","color":"var(--ink)","fontWeight":"700","fontSize":"16px","display":"flex","alignItems":"center","justifyContent":"center","gap":"10px","padding":"0 20px","textAlign":"center","transition":"transform .18s ease-out"}} className="h13">
            {"Bu modulni loyihamga qo'shish →"}
          </a>
          <span style={{"fontSize":"13px","color":"var(--mut)","textAlign":"center","textWrap":"pretty"}}>
            {"Ro'yxatdan keyin modul shu o'lcham bilan yangi loyihada turadi."}
          </span>
        </aside>
      </div>
    </section>
  );
}
