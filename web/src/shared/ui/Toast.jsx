import React from 'react';

/* TZ-19: qisqa xabar (dizayndagi toast) */
export default function Toast({ text }) {
  if (!text) return null;
  return (
    <div role="status" aria-live="polite" style={{"position":"fixed","left":"50%","bottom":"92px","zIndex":"90","transform":"translateX(-50%)","maxWidth":"calc(100% - 32px)","padding":"12px 18px","borderRadius":"14px","background":"var(--txt)","color":"var(--bg)","fontWeight":"800","fontSize":"14px","boxShadow":"0 16px 40px rgba(0,0,0,.4)"}}>
      <span className="sc-interp">{text}</span>
    </div>
  );
}
