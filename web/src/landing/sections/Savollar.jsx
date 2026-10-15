import React from 'react';

/* TZ-19: sayt — ko'p so'raladigan savollar. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Savollar({ v }) {
  return (
    <section id="savollar" data-rv-id="s6" data-rv={v.rv?.s6} style={{"maxWidth":"880px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
      <h2 style={{"margin":"0 0 24px","fontSize":"clamp(28px,3.4vw,40px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
        {"Savollar"}
      </h2>
      <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t0} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {"Bazis kerakmi?"}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x0,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r0,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {"Yo'q, brauzerda ishlaydi. O'rnatish shart emas."}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t1} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {"Telefonda ishlaydimi?"}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x1,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r1,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {"Ha, 360 px ekrandan boshlab tekshirilgan — 7 xil qurilmada."}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t2} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {"Narxlar qayerdan olinadi?"}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x2,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r2,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {"ERP katalogidagi haqiqiy narxdan — 1 281 plita va 1 978 zapchast, haqiqiy SKU bilan. Narx yo'q bo'lsa, \"narx yo'q\" deb ochiq ko'rsatiladi."}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t3} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {"Internetsiz ishlaydimi?"}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x3,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r3,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {"Ochilgan ilova internetsiz ham ochiladi (PWA)."}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t4} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {"Narxi qancha?"}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x4,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r4,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                <span style={{"padding":"2px 8px","border":"1px dashed var(--mut)","borderRadius":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
                  {"tarif — egasi yozadi"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
