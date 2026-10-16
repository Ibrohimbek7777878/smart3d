import React from 'react';
import { t } from '../../i18n/index.js';

/* TZ-19: sayt — qanday ishlaydi — qadamlar. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Qanday({ v }) {
  return (
    <section id="qanday" data-rv-id="s3" data-rv={v.rv?.s3} style={{"maxWidth":"1280px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(64px,9vw,128px)","scrollMarginTop":"72px"}}>
      <h2 style={{"margin":"0 0 24px","fontSize":"clamp(28px,3.4vw,44px)","lineHeight":"1.1","letterSpacing":"-.03em","fontWeight":"800"}}>
        {t('sayt.5_qadam_zamerdan_stanokkacha')}
      </h2>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(200px,1fr))","gap":"12px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h14">
          <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
            {"01"}
          </span>
          <span style={{"fontSize":"20px","fontWeight":"800"}}>
            {t('sayt.zamer')}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            {t('sayt.xona_olchamini_kiriting_yoki')}
          </span>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h15">
          <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
            {"02"}
          </span>
          <span style={{"fontSize":"20px","fontWeight":"800"}}>
            {t('qadam.mebel')}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            {t('sayt.tayyor_modulni_tanlang_olchami')}
          </span>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h16">
          <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
            {"03"}
          </span>
          <span style={{"fontSize":"20px","fontWeight":"800"}}>
            {"3D"}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            {t('sayt.mijozga_korsating_rasm_va_360')}
          </span>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h17">
          <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
            {"04"}
          </span>
          <span style={{"fontSize":"20px","fontWeight":"800"}}>
            {t('qadam.narx')}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            {t('sayt.plita_kromka_zapchast_tannarx')}
          </span>
        </div>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"24px","padding":"22px","display":"flex","flexDirection":"column","gap":"10px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h18">
          <span style={{"fontSize":"44px","fontWeight":"800","lineHeight":"1","color":"var(--acct)","letterSpacing":"-.04em"}}>
            {"05"}
          </span>
          <span style={{"fontSize":"20px","fontWeight":"800"}}>
            {t('qadam.fayllar')}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"15px","textWrap":"pretty"}}>
            {t('sayt.kroy_xaritasi_excel_va_stanok')}
          </span>
        </div>
      </div>
    </section>
  );
}
