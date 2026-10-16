import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import Toggle from '../../../shared/ui/Toggle.jsx';
import { useQadamXona } from './useQadamXona.js';

/* TZ-19: ① Xona — JSX va stillar tasdiqlangan dizayndan; qiymatlar useQadamXona() dan. */
export default function QadamXona() {
  const v = useQadamXona();
  return (
    <>
      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
          {t('xona.qadam')}
        </span>
        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
          {t('xona.xona')}
        </h2>
      </div>
      <div style={{"display":"flex","padding":"4px","gap":"4px","borderRadius":"14px","background":"var(--sfc)"}}>
        {(v.shapes || []).map((x, $index) => (<React.Fragment key={$index}>
          <button onClick={x?.pick} style={{"flex":"1","height":"40px","borderRadius":"10px","border":"0","background":x?.bg,"color":x?.c,"fontWeight":"800","fontSize":"14px","cursor":"pointer","whiteSpace":"nowrap"}}>
            <Ikon n={x?.ikon} size={15} /><span className="sc-interp">{x?.label}</span>
          </button>
        </React.Fragment>))}
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(3,minmax(0,1fr))","gap":"8px"}}>
        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
            {t('umumiy.eni_mm')}
          </span>
          <input type="number" value={v.w.val} onChange={v.w.on} onBlur={v.w.commit} onKeyDown={v.w.key} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
        </label>
        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
            {t('xona.chuqurligi')}
          </span>
          <input type="number" value={v.d.val} onChange={v.d.on} onBlur={v.d.commit} onKeyDown={v.d.key} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
        </label>
        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
            {t('xona.boyi')}
          </span>
          <input type="number" value={v.h.val} onChange={v.h.on} onBlur={v.h.commit} onKeyDown={v.h.key} style={{"height":"44px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","padding":"0 10px","fontVariantNumeric":"tabular-nums","outline":"none","width":"100%"}} />
        </label>
      </div>
      <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
        {(v.roomPresets || []).map((p, $index) => (<React.Fragment key={$index}>
          <button onClick={p?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":p?.bg,"color":p?.c,"fontVariantNumeric":"tabular-nums"}}>
            <span className="sc-interp">{p?.label}</span>
          </button>
        </React.Fragment>))}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"10px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
          <span style={{"fontWeight":"800"}}>
            {t('xona.teshiklar')}
          </span>
          <button onClick={v.addHole} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","minHeight":"32px"}}>
            {t('xona.qoshish')}
          </button>
        </div>
        {(v.holes || []).map((h, $index) => (<React.Fragment key={$index}>
          <div style={{"display":"flex","justifyContent":"space-between","gap":"8px","padding":"8px 0","borderTop":"1px solid var(--line)","fontSize":"14px"}}>
            <span style={{"fontWeight":"700"}}>
              <span className="sc-interp">{h?.t}</span>
            </span>
            <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
              <span className="sc-interp">{h?.d}</span>
            </span>
          </div>
        </React.Fragment>))}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"2px"}}>
        {/* TZ-09 8-bosqich (dizaynda yo'q): ⚙ — dobor/karniz balandligi, moyka o'lchami; "+ Qo'shish" tugmasi uslubida */}
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingBottom":"6px"}}>
          <span style={{"fontWeight":"800"}}>
            {t('xona.oshxona_elementlari')}
          </span>
          <button onClick={v.openKitchen} aria-label={t('xona.oshxona_elementlarini_sozlash')} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)"}}>
            <Ikon n="sozlash" gap={0} />{t('xona.sozlash')}
          </button>
        </div>
        {v.toggles.map((t, i) => <Toggle key={i} label={t.label} sub={t.sub} on={t.on} onFlip={t.flip} />)}
      </div>
      <button onClick={v.goStep2} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
        {t('xona.keyingi_mebel')}
      </button>
    </>
  );
}
