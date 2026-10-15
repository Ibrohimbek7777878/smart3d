import React from 'react';

/* TZ-09: App.jsx dan ko'chirildi — JSX va stillar o'zgarishsiz (dizayn). Barcha qiymatlar `v` dan (App.renderVals). */
export default function Toast({ v }) {
  return (
    <>
        {v.hasToast ? (<>
          <div role="status" style={{"position":"fixed","left":"50%","bottom":"92px","zIndex":"90","transform":"translateX(-50%)","maxWidth":"calc(100% - 32px)","padding":"12px 18px","borderRadius":"14px","background":"var(--txt)","color":"var(--bg)","fontWeight":"800","fontSize":"14px","boxShadow":"0 16px 40px rgba(0,0,0,.4)"}}>
            <span className="sc-interp">{v.toast}</span>
          </div>
        </>) : null}
    </>
  );
}
