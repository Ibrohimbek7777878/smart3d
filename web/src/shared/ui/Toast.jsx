import React from 'react';

/* TZ-19: qisqa xabar (dizayndagi toast); xato bo'lsa — oxirida kichik kod (S3D-…) qo'llab-quvvatlash uchun */
export default function Toast({ text, code }) {
  if (!text) return null;
  return (
    <div role="status" aria-live="polite" style={{"position":"fixed","left":"50%","bottom":"92px","zIndex":"90","transform":"translateX(-50%)","maxWidth":"calc(100% - 32px)","padding":"12px 18px","borderRadius":"14px","background":"var(--txt)","color":"var(--bg)","fontWeight":"800","fontSize":"14px","boxShadow":"0 16px 40px rgba(0,0,0,.4)"}}>
      <span className="sc-interp">{text}</span>
      {code ? <span data-kod="" style={{"marginLeft":"8px","fontFamily":"'JetBrains Mono',monospace","fontSize":"11px","fontWeight":"700","opacity":".65","whiteSpace":"nowrap"}}>{code}</span> : null}
    </div>
  );
}
