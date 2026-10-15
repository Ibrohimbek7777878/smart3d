import React from 'react';

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
            {"· Smart3D"}
          </span>
        </div>
        <span style={{"padding":"4px 10px","border":"1px dashed var(--mut)","borderRadius":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","color":"var(--mut)"}}>
          {"aloqa — egasi beradi"}
        </span>
        <span style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","alignItems":"center","fontSize":"14px","fontWeight":"600"}}>
          {"O'zbekcha"}
        </span>
      </div>
    </footer>
  );
}
