import React from 'react';

/* TZ-19: sayt — kimlar uchun. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Kimlar({ v }) {
  return (
    <section id="kimlar" data-rv-id="s1" data-rv={v.rv?.s1} style={{"maxWidth":"1280px","margin":"0 auto","padding":"clamp(72px,10vw,140px) clamp(16px,4vw,32px) clamp(64px,9vw,120px)","scrollMarginTop":"64px"}}>
      <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"28px"}}>
        <h2 style={{"margin":"0","fontSize":"clamp(32px,4.2vw,56px)","lineHeight":"1.02","letterSpacing":"-.04em","fontWeight":"800","maxWidth":"720px","textWrap":"balance"}}>
          {"Kim uchun qurilgan"}
        </h2>
        <p style={{"margin":"0","color":"var(--mut)","maxWidth":"400px","textWrap":"pretty"}}>
          {"Sexdagi ustadan tortib, mijoz oldidagi dizaynergacha — bitta loyiha, har kimga kerakli ko'rinish."}
        </p>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(280px,1fr))","gap":"14px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h9">
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
              {"01"}
            </span>
            <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
              {"↗"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {"Mebel ustasi"}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {"Zamerda, telefon qo'lida"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"O'lchamni kiriting — modul o'zi moslashadi"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"Mijozga joyida 3D ko'rsating"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"Smeta zapchasti bilan, bir zumda"}
              </span>
            </span>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h10">
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
              {"02"}
            </span>
            <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
              {"↗"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {"Dizayner"}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {"Mijoz oldida, planshetda"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"To'liq ekranli 3D ko'rinish"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"Bir tugmada 1080p rasm"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"360° tur havolasini yuboring"}
              </span>
            </span>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h11">
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
              {"03"}
            </span>
            <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
              {"↗"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {"Bazischi"}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {"Tanish mantiq — o'rnatishsiz"}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"Formulali modullar, detal va raskroy"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"GibLab, DXF, G-code, Biesse, Homag"}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800"}}>
                {"✓"}
              </span>
              <span>
                {"Brauzerda — kompyuter va telefonda"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
