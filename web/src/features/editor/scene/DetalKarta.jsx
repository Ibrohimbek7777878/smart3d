import React from 'react';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useDetalKarta } from './useSahna.js';

/* TZ-19: detal kartasi (mini-3D, o'lcham, material, kromka) — JSX va stillar tasdiqlangan dizayndan. */
export default function DetalKarta() {
  const v = useDetalKarta();
  if (!v.hasPart) return null;
  return (
    <div style={{"position":"absolute","right":"12px","top":"68px","zIndex":"6","width":"min(330px,calc(100% - 24px))","maxHeight":"calc(100% - 160px)","overflow":"auto","background":"rgba(23,50,57,.97)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"14px","display":"flex","flexDirection":"column","gap":"10px","boxShadow":"0 20px 50px rgba(0,0,0,.45)"}}>
      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
          <span style={{"fontSize":"18px","fontWeight":"800","lineHeight":"1.2"}}>
            <span className="sc-interp">{v.pt?.name}</span>
          </span>
          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
            <span className="sc-interp">{v.pt?.code}</span>
          </span>
        </div>
        <button onClick={v.closePart} aria-label="Yopish" style={{"width":"36px","height":"36px","flex":"0 0 auto","borderRadius":"12px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontSize":"17px","cursor":"pointer"}}>
          <Ikon n="yopish" size={18} gap={0} />
        </button>
      </div>
      <div ref={v.miniHost} style={{"position":"relative","height":"190px","flex":"0 0 auto","borderRadius":"16px","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 50%,rgba(255,122,69,.16),transparent 70%),var(--bg)","border":"1px solid var(--line)"}}>
        <div ref={v.miniOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
        <span style={{"position":"absolute","left":"10px","bottom":"8px","zIndex":"3","fontSize":"11px","color":"var(--mut)","fontWeight":"700"}}>
          {"Detal alohida · aylantiring"}
        </span>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"6px 14px","fontSize":"14px"}}>
        <span style={{"color":"var(--mut)"}}>
          {"O'lcham"}
        </span>
        <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","color":"var(--cyan)"}}>
          <span className="sc-interp">{v.pt?.dim}</span>
        </span>
        <span style={{"color":"var(--mut)"}}>
          {"Material"}
        </span>
        <span style={{"fontWeight":"700"}}>
          <span className="sc-interp">{v.pt?.mat}</span>
        </span>
        <span style={{"color":"var(--mut)"}}>
          {"Kromka"}
        </span>
        <span style={{"fontWeight":"700"}}>
          <span className="sc-interp">{v.pt?.edge}</span>
        </span>
      </div>
      {v.pt?.isMov ? (<>
        <button onClick={v.togglePartOpen} style={{"height":"44px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
          <Ikon n="eshik" /><span className="sc-interp">{v.pt?.movLabel}</span>
        </button>
      </>) : null}
    </div>
  );
}
