import React from 'react';
import { t } from '../../../i18n/index.js';
import { useMaslahat } from './useSahna.js';

/* TZ-19: birinchi ochilishdagi maslahat (3 qadam) — JSX va stillar tasdiqlangan dizayndan. */
export default function Maslahat() {
  const v = useMaslahat();
  if (!v.tip.on) return null;
  return (
    <div style={{"position":"absolute","left":"50%","top":"72px","zIndex":"5","transform":"translateX(-50%)","width":"min(360px,calc(100% - 24px))","background":"var(--cyan)","color":"#06231E","borderRadius":"18px","padding":"14px 16px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 16px 40px rgba(0,0,0,.35)"}}>
      <div style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
        <span style={{"fontWeight":"800","fontSize":"16px"}}>
          <span className="sc-interp">{v.tip?.text}</span>
        </span>
        <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"12px","fontWeight":"700"}}>
          <span className="sc-interp">{v.tip?.n}</span>{"/3"}
        </span>
      </div>
      <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end"}}>
        <button onClick={v.tipSkip} style={{"height":"36px","padding":"0 12px","borderRadius":"10px","border":"0","background":"transparent","color":"#06231E","fontWeight":"700","cursor":"pointer"}}>
          {t('sahna.otkazib_yuborish')}
        </button>
        <button onClick={v.tipNext} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":"#06231E","color":"var(--cyan)","fontWeight":"800","cursor":"pointer"}}>
          <span className="sc-interp">{v.tip?.btn}</span>
        </button>
      </div>
    </div>
  );
}
