import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useSahnaView } from './useSahna.js';
import Maslahat from './Maslahat.jsx';
import ModulKarta from './ModulKarta.jsx';
import DetalKarta from './DetalKarta.jsx';
import KorinishPanel from './KorinishPanel.jsx';
import { useTor } from '../../../shared/lib/useTor.js';
import ChizmaQatlam from '../ishjoyi/ChizmaQatlam.jsx';
import TeshikPalitra from '../ishjoyi/TeshikPalitra.jsx';
import BekorTugmalar from '../BekorTugmalar.jsx';

/* TZ-19: muharrir sahnasi — 3D/2D, asboblar paneli, maslahat, modul va detal kartalari.
 * JSX va stillar tasdiqlangan dizayndan; qiymatlar useSahnaView() dan.
 * TZ-25: 2D chizma qatlami (devor o'lchamlari, chizish) va eshik/deraza palitrasi; AI tugmasi o'rniga — pastdagi matn qatori. */
export default function Sahna() {
  const v = useSahnaView(), tor = useTor();
  return (
    <div data-scene="" style={{"position":"relative","minWidth":"0","height":"100%","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 40%,rgba(255,122,69,.10),transparent 70%),#0C1C22"}}>
      <div ref={v.roomHost} style={{"position":"absolute","inset":"0"}}>
        <div ref={v.roomOv} style={{"position":"absolute","inset":"0","pointerEvents":"none","zIndex":"2"}}></div>
      </div>
      <ChizmaQatlam tel={tor} />
      <TeshikPalitra />
      {v.notLoaded ? (<>
        <div style={{"position":"absolute","inset":"0","display":"grid","placeItems":"center","color":"var(--mut)","fontFamily":"'JetBrains Mono',monospace","fontSize":"13px"}}>
          {v.loadText}
        </div>
      </>) : null}
      <div style={{"position":"absolute","left":"12px","right":"12px","top":"12px","zIndex":"3","display":"flex","flexWrap":"wrap","gap":"8px","pointerEvents":"none"}}>
        <BekorTugmalar joy="sahna" />{/* telefonda: bekor qilish / qaytarish (kompyuterda — sarlavhada) */}
        <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","pointerEvents":"auto"}}>
          <button onClick={v.set2D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b2,"color":v.vw?.t2,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
            {"2D"}
          </button>
          <button onClick={v.set3D} style={{"height":"36px","padding":"0 14px","borderRadius":"10px","border":"0","background":v.vw?.b3,"color":v.vw?.t3,"fontWeight":"800","fontSize":"14px","cursor":"pointer"}}>
            {"3D"}
          </button>
        </div>
        <button onClick={v.shot} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
          <Ikon n="rasm" />{t('sahna.rasm')}
        </button>
        <button onClick={v.toggleSpin} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":v.vw?.sb,"border":"1px solid var(--line)","color":v.vw?.st,"fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
          <Ikon n="aylanish" />{"360°"}
        </button>
        <button onClick={v.toggleAllOpen} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
          <Ikon n="eshik" /><span className="sc-interp">{v.openAllLabel}</span>
        </button>
        <button onClick={v.center} aria-label={t('sahna.markazga')} style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","pointerEvents":"auto","whiteSpace":"nowrap"}}>
          <Ikon n="markaz" />{t('sahna.markazga')}
        </button>
        {/* TZ-09 8-bosqich (dizaynda yo'q): VR — faqat VR qurilmada ko'rinadi (eski saytdagi WebXR) */}
        {v.vrOk ? (<>
          <button onClick={v.vr} aria-label="VR" style={{"height":"44px","padding":"0 14px","borderRadius":"14px","background":"rgba(23,50,57,.9)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer"}}>
            <Ikon n="vr" />{"VR"}
          </button>
        </>) : null}
      </div>
      <KorinishPanel tel={tor} />
      <Maslahat />
      <ModulKarta />
      <DetalKarta />
    </div>
  );
}
