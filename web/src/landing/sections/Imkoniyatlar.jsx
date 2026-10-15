import React from 'react';

/* TZ-19: sayt — imkoniyatlar va fayllar. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Imkoniyatlar({ v }) {
  return (
    <section id="imkoniyatlar" data-rv-id="s4" data-rv={v.rv?.s4} style={{"maxWidth":"1240px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
      <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"24px"}}>
        <h2 style={{"margin":"0","fontSize":"clamp(28px,3.4vw,40px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
          {"Nimalar olasiz — "}
          <span style={{"color":"var(--acct)"}}>
            {"17 xil fayl"}
          </span>
        </h2>
        <p style={{"margin":"0","color":"var(--mut)","maxWidth":"380px"}}>
          {"Mijoz, sex va stanok uchun — bitta loyihadan."}
        </p>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(260px,1fr))","gap":"12px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h19">
          <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--cyan)","textTransform":"uppercase","letterSpacing":".08em"}}>
            {"Mijozga"}
          </span>
          <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
            {"Ko'rinishi va narxi tushunarli"}
          </span>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"3D"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"1080p rasm"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"360° tur"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"PDF hisobot"}
            </span>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h20">
          <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--lav)","textTransform":"uppercase","letterSpacing":".08em"}}>
            {"Sexga"}
          </span>
          <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
            {"Detal, kroy va smeta tayyor"}
          </span>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"Detallar ro'yxati"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"Raskroy xaritasi"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600"}}>
              {"Excel smeta"}
            </span>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"24px","display":"flex","flexDirection":"column","gap":"16px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h21">
          <span style={{"fontSize":"13px","fontWeight":"700","color":"var(--acct)","textTransform":"uppercase","letterSpacing":".08em"}}>
            {"Stanokka"}
          </span>
          <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em","textWrap":"balance"}}>
            {"Alohida dastursiz — bir tugma"}
          </span>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"GibLab"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"DXF"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"G-code"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"Biesse"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"Homag"}
            </span>
            <span style={{"padding":"6px 12px","borderRadius":"999px","background":"var(--sfc2)","fontSize":"13px","fontWeight":"600","fontFamily":"'JetBrains Mono',monospace"}}>
              {"Altendorf"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
