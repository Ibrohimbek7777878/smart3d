import React from 'react';

/* TZ-19: dizayndagi almashtirgich ("Oshxona elementlari" qatori) — Xona, Narx (xizmatlar), Sozlamalar (stanok) uchun bitta. */
export default function Toggle({ label, sub, on, onFlip }) {
  return (
    <button onClick={onFlip} role="switch" aria-checked={!!on} style={{"minHeight":"48px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","background":"none","border":"0","borderTop":"1px solid var(--line)","color":"var(--txt)","fontSize":"15px","fontWeight":"700","cursor":"pointer","padding":"0","textAlign":"left"}}>
      <span style={{"display":"flex","flexDirection":"column"}}>
        <span>
          <span className="sc-interp">{label}</span>
        </span>
        <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"600"}}>
          <span className="sc-interp">{sub}</span>
        </span>
      </span>
      <span style={{"width":"48px","height":"28px","flex":"0 0 48px","borderRadius":"999px","background":on ? 'var(--acc)' : 'var(--sfc3)',"position":"relative","transition":"background .2s"}}>
        <span style={{"position":"absolute","left":"3px","top":"3px","width":"22px","height":"22px","borderRadius":"999px","background":"#fff","transform":on ? 'translateX(20px)' : 'none',"transition":"transform .2s ease-out"}}></span>
      </span>
    </button>
  );
}
