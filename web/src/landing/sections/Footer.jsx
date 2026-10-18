import React from 'react';
import { t } from '../../i18n/index.js';

/* TZ-19: sayt — pastki qism. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Footer({ v }) {
  return (
    <footer style={{"borderTop":"1px solid var(--line)"}}>
      <div style={{"maxWidth":"1280px","margin":"0 auto","padding":"28px clamp(16px,4vw,32px) 40px","display":"flex","flexWrap":"wrap","gap":"20px","alignItems":"center","justifyContent":"space-between"}}>
        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
          <div style={{"width":"36px","height":"36px","borderRadius":"11px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
            {"3D"}
          </div>
          <span style={{"fontWeight":"800"}}>
            {"Bittada"}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"14px"}}>
            {t('sayt.smart3d')}
          </span>
        </div>
        <span style={{"fontSize":"14px","fontWeight":"600","color":"var(--mut)"}}>
          {t('sayt.aloqa_egasi_beradi')}
        </span>
        {/* TZ-18: dizayndagi til belgisi — endi til menyusini ochadi (ilova bilan bir xil menyu) */}
        <button onClick={v.tilMenu} aria-haspopup="menu" aria-label="Til / Язык / Language" style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","alignItems":"center","fontSize":"14px","fontWeight":"600","color":"var(--txt)","fontFamily":"inherit","cursor":"pointer"}}>
          {v.tilNomi}
        </button>
      </div>
    </footer>
  );
}
