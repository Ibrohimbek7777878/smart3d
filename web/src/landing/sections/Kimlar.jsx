import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';

/* TZ-19: sayt — kimlar uchun. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Kimlar({ v }) {
  return (
    <section id="kimlar" data-rv-id="s1" data-rv={v.rv?.s1} style={{"maxWidth":"1280px","margin":"0 auto","padding":"clamp(72px,10vw,140px) clamp(16px,4vw,32px) clamp(64px,9vw,120px)","scrollMarginTop":"64px"}}>
      <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","alignItems":"flex-end","gap":"16px","marginBottom":"28px"}}>
        <h2 style={{"margin":"0","fontSize":"clamp(32px,4.2vw,56px)","lineHeight":"1.02","letterSpacing":"-.04em","fontWeight":"800","maxWidth":"720px","textWrap":"balance"}}>
          {t('sayt.kim_uchun_qurilgan')}
        </h2>
        <p style={{"margin":"0","color":"var(--mut)","maxWidth":"400px","textWrap":"pretty"}}>
          {t('sayt.sexdagi_ustadan_tortib_mijoz')}
        </p>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(280px,1fr))","gap":"14px"}}>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"28px","padding":"28px","display":"flex","flexDirection":"column","gap":"20px","transform":"perspective(1000px) rotateX(0deg) rotateY(0deg)","transition":"transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s"}} className="h9">
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
            <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--acct)","fontWeight":"700"}}>
              {"01"}
            </span>
            <span style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc2)","display":"grid","placeItems":"center","color":"var(--cyan)","fontWeight":"800"}}>
              <Ikon n="havola" size={20} gap={0} />
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {t('sayt.mebel_ustasi')}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {t('sayt.zamerda_telefon_qolida')}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.olchamni_kiriting_modul_ozi')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.mijozga_joyida_3d_korsating')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('kirish.smeta_zapchasti_bilan_bir')}
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
              <Ikon n="havola" size={20} gap={0} />
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {t('sayt.dizayner')}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {t('sayt.mijoz_oldida_planshetda')}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.toliq_ekranli_3d_korinish')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.bir_tugmada_1080p_rasm')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.360_tur_havolasini_yuboring')}
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
              <Ikon n="havola" size={20} gap={0} />
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <span style={{"fontSize":"28px","fontWeight":"800","letterSpacing":"-.02em"}}>
              {t('sayt.bazischi')}
            </span>
            <span style={{"fontSize":"15px","color":"var(--mut)"}}>
              {t('sayt.tanish_mantiq_ornatishsiz')}
            </span>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid var(--line)"}}>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.formulali_modullar_detal_va')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.giblab_dxf_g_code_biesse_homag')}
              </span>
            </span>
            <span style={{"display":"flex","gap":"10px","alignItems":"flex-start"}}>
              <span style={{"color":"var(--cyan)","fontWeight":"800","display":"flex","paddingTop":"3px"}}>
                <Ikon n="tayyor" size={14} gap={0} />
              </span>
              <span>
                {t('sayt.brauzerda_kompyuter_va')}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
