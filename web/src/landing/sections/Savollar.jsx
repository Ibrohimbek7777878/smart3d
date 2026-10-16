import React from 'react';
import { t } from '../../i18n/index.js';

/* TZ-19: sayt — ko'p so'raladigan savollar. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Savollar({ v }) {
  return (
    <section id="savollar" data-rv-id="s6" data-rv={v.rv?.s6} style={{"maxWidth":"880px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
      <h2 style={{"margin":"0 0 24px","fontSize":"clamp(28px,3.4vw,40px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
        {t('sayt.savollar')}
      </h2>
      <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t0} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {t('sayt.bazis_kerakmi')}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x0,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r0,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {t('sayt.yoq_brauzerda_ishlaydi')}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t1} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {t('sayt.telefonda_ishlaydimi')}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x1,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r1,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {t('sayt.ha_360_px_ekrandan_boshlab')}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t2} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {t('sayt.narxlar_qayerdan_olinadi')}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x2,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r2,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {t('sayt.erp_katalogidagi_haqiqiy')}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t3} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {t('sayt.internetsiz_ishlaydimi')}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x3,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r3,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                {t('sayt.ochilgan_ilova_internetsiz_ham')}
              </p>
            </div>
          </div>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","boxShadow":"var(--shadow)"}}>
          <button onClick={v.fq?.t4} style={{"width":"100%","minHeight":"60px","padding":"16px 20px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"16px","background":"none","border":"0","color":"var(--txt)","fontSize":"17px","fontWeight":"700","textAlign":"left","cursor":"pointer"}}>
            {t('sayt.narxi_qancha')}
            <span style={{"fontSize":"22px","color":"var(--acct)","transform":v.fq?.x4,"transition":"transform .2s ease-out"}}>
              {"+"}
            </span>
          </button>
          <div style={{"display":"grid","gridTemplateRows":v.fq?.r4,"transition":"grid-template-rows .25s ease-out"}}>
            <div style={{"overflow":"hidden"}}>
              <p style={{"margin":"0","padding":"0 20px 18px","color":"var(--mut)"}}>
                <span style={{"padding":"2px 8px","border":"1px dashed var(--mut)","borderRadius":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
                  {t('sayt.tarif_egasi_yozadi')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
