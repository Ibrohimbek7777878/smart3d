import React from 'react';
import { useIchiniKorish } from './useIchiniKorish.js';

/* TZ-19: "Ichini ko'rish" (Q6) — JSX va stillar tasdiqlangan dizayndan; qiymatlar useIchiniKorish() dan. */
export default function IchiniKorish() {
  const v = useIchiniKorish();
  if (!v.insOpen) return null;
  return (
    <div style={{"position":"fixed","inset":"0","zIndex":"70","background":"rgba(4,12,15,.72)","backdropFilter":"blur(6px)","WebkitBackdropFilter":"blur(6px)","display":"flex","alignItems":"center","justifyContent":"center","padding":"clamp(0px,2vw,24px)"}}>
      <div style={{"width":"min(1180px,100%)","height":"min(760px,100%)","background":"var(--bg)","border":"1px solid var(--line)","borderRadius":"clamp(0px,2vw,28px)","overflow":"hidden","display":"flex","flexWrap":"wrap"}}>
        <div style={{"position":"relative","flex":"1.6 1 480px","minWidth":"0","minHeight":"360px","background":"radial-gradient(ellipse 70% 60% at 50% 45%,rgba(255,122,69,.14),transparent 70%),#0C1C22"}}>
          <div ref={v.insHost} style={{"position":"absolute","inset":"0"}}>
            <div ref={v.insOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
          </div>
          <div style={{"position":"absolute","left":"16px","top":"16px","zIndex":"3","display":"flex","flexDirection":"column","gap":"2px","pointerEvents":"none"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--acct)"}}>
              {"Ichini ko'rish"}
            </span>
            <span style={{"fontSize":"22px","fontWeight":"800"}}>
              <span className="sc-interp">{v.ins?.name}</span>
            </span>
          </div>
          <div style={{"position":"absolute","left":"16px","right":"16px","bottom":"16px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"center","padding":"10px 16px","borderRadius":"18px","background":"rgba(23,50,57,.92)","border":"1px solid var(--line)"}}>
            <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"12px","background":"var(--sfc2)"}}>
              <button onClick={v.insColor} style={{"height":"36px","padding":"0 12px","borderRadius":"9px","border":"0","background":v.ins?.cB,"color":v.ins?.cT,"fontWeight":"800","fontSize":"13px","cursor":"pointer"}}>
                {"Rangli"}
              </button>
              <button onClick={v.insPlain} style={{"height":"36px","padding":"0 12px","borderRadius":"9px","border":"0","background":v.ins?.pB,"color":v.ins?.pT,"fontWeight":"800","fontSize":"13px","cursor":"pointer"}}>
                {"Rangsiz"}
              </button>
            </div>
            <label style={{"flex":"1 1 180px","display":"flex","flexDirection":"column"}}>
              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
                <span>
                  {"Sochish"}
                </span>
                <span style={{"color":"var(--txt)"}}>
                  <span className="sc-interp">{v.ins?.ex}</span>{"%"}
                </span>
              </span>
              <input type="range" min="0" max="100" value={v.ins?.ex} onChange={v.onInsEx} />
            </label>
          </div>
        </div>
        <div style={{"flex":"1 1 320px","minWidth":"0","maxHeight":"100%","overflow":"auto","padding":"20px","display":"flex","flexDirection":"column","gap":"12px","borderLeft":"1px solid var(--line)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
            <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
              <span style={{"padding":"2px 8px","alignSelf":"flex-start","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
                <span className="sc-interp">{v.ins?.code}</span>
              </span>
              <span style={{"fontSize":"15px","fontWeight":"800","color":"var(--cyan)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.ins?.size}</span>
              </span>
              {v.ins?.hasNote ? (<>
                <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600","maxWidth":"240px"}}>
                  <span className="sc-interp">{v.ins?.note}</span>
                </span>
              </>) : null}
            </div>
            <button onClick={v.closeInside} aria-label="Yopish" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto"}}>
              {"×"}
            </button>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"8px"}}>
            <div style={{"background":"var(--sfc)","borderRadius":"16px","padding":"12px"}}>
              <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--acct)","lineHeight":"1.1","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.ins?.detal}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"detal"}
              </div>
            </div>
            <div style={{"background":"var(--sfc)","borderRadius":"16px","padding":"12px"}}>
              <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--acct)","lineHeight":"1.1","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{v.ins?.zap}</span>
              </div>
              <div style={{"fontSize":"12px","color":"var(--mut)"}}>
                {"zapchast"}
              </div>
            </div>
          </div>
          <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 14px 8px"}}>
            {(v.ins?.list || []).map((r, $index) => (<React.Fragment key={$index}>
              <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
                <span>
                  <span style={{"color":"var(--mut)"}}>
                    <span className="sc-interp">{r?.n}</span>{"×"}
                  </span>
                  {" "}
                  <span style={{"fontWeight":"700"}}>
                    <span className="sc-interp">{r?.name}</span>
                  </span>
                </span>
                <span style={{"fontWeight":"700","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                  <span className="sc-interp">{r?.dim}</span>
                </span>
              </div>
            </React.Fragment>))}
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
            {(v.ins?.hw || []).map((h, $index) => (<React.Fragment key={$index}>
              <span style={{"padding":"5px 10px","borderRadius":"999px","background":"var(--sfc)","fontSize":"12px","fontWeight":"700"}}>
                <span className="sc-interp">{h?.name}</span>{" "}
                <span style={{"color":"var(--acct)"}}>
                  {"×"}<span className="sc-interp">{h?.cnt}</span>
                </span>
              </span>
            </React.Fragment>))}
          </div>
        </div>
      </div>
    </div>
  );
}
