import React from 'react';
import { t } from '../../i18n/index.js';

/* TZ-19: sayt — ro'yxatdan o'tishga chaqiruv. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Royxat({ v }) {
  return (
    <section id="royxat" data-rv-id="s7" data-rv={v.rv?.s7} style={{"maxWidth":"1280px","margin":"0 auto","padding":"0 clamp(16px,4vw,32px) clamp(40px,6vw,72px)","scrollMarginTop":"72px"}}>
      <div style={{"background":"var(--acc)","color":"var(--ink)","borderRadius":"32px","padding":"clamp(32px,6vw,72px)","display":"flex","flexWrap":"wrap","gap":"28px","alignItems":"flex-end","justifyContent":"space-between"}}>
        <div style={{"display":"flex","flexDirection":"column","gap":"14px","maxWidth":"660px"}}>
          <h2 style={{"margin":"0","fontSize":"clamp(32px,4.6vw,60px)","lineHeight":"1","letterSpacing":"-.045em","fontWeight":"800","textWrap":"balance"}}>
            {t('sayt.birinchi_loyihangizni_bugun')}
          </h2>
          <p style={{"margin":"0","fontSize":"18px","fontWeight":"600","color":"var(--ink)"}}>
            {t('sayt.3d_demo_royxatsiz_saqlash')}
          </p>
        </div>
        <div style={{"display":"flex","flexWrap":"wrap","gap":"10px"}}>
          <a href="app.html#reg" onClick={v.goReg} style={{"height":"56px","padding":"0 26px","borderRadius":"16px","background":"var(--bg)","color":"var(--txt)","fontWeight":"800","fontSize":"16px","display":"flex","alignItems":"center","transition":"transform .18s ease-out"}} className="h22">
            {t('kirish.royxat')}
          </a>
          <button onClick={v.goDemo} style={{"height":"56px","padding":"0 22px","borderRadius":"16px","background":"transparent","border":"1.5px solid var(--ink)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
            {t('sayt.3d_demoni_korish')}
          </button>
        </div>
      </div>
    </section>
  );
}
