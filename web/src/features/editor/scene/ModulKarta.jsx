import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useModulKarta } from './useSahna.js';

/* TZ-19: tanlangan modul kartasi — JSX va stillar tasdiqlangan dizayndan; qiymatlar useModulKarta() dan. */
export default function ModulKarta() {
  const v = useModulKarta();
  if (!v.show) return null;
  return (
    <div style={{"position":"absolute","left":"12px","bottom":"12px","zIndex":"4","width":"min(350px,calc(100% - 84px))","maxHeight":"calc(100% - 80px)","overflow":"auto","background":"rgba(23,50,57,.96)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","border":"1px solid var(--line)","borderRadius":"22px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","boxShadow":"0 20px 50px rgba(0,0,0,.4)"}}>
      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"8px"}}>
        <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
          <span style={{"fontSize":"17px","fontWeight":"800","lineHeight":"1.2"}}>
            <span className="sc-interp">{v.sm?.name}</span>
          </span>
          <span style={{"alignSelf":"flex-start","padding":"2px 8px","borderRadius":"999px","background":"var(--sfc2)","fontFamily":"'JetBrains Mono',monospace","fontSize":"12px"}}>
            <span className="sc-interp">{v.sm?.code}</span>
          </span>
        </div>
        <button onClick={v.deselect} aria-label={t('umumiy.yopish')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
          <Ikon n="yopish" size={18} gap={0} />
        </button>
      </div>
      {(v.sm?.rows || []).map((r, $index) => (<React.Fragment key={$index}>
        <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            <span style={{"flex":"1","fontSize":"14px","fontWeight":"700","color":"var(--mut)"}}>
              <span className="sc-interp">{r?.label}</span>
            </span>
            <button onClick={r?.dec} aria-label={t('sahna.kamaytirish')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
              <Ikon n="ayir" size={18} gap={0} />
            </button>
            <input type="number" value={r?.val} onChange={r?.onInput} onBlur={r?.commit} onKeyDown={r?.key} style={{"width":"76px","height":"40px","borderRadius":"12px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","fontWeight":"800","textAlign":"center","fontVariantNumeric":"tabular-nums","outline":"none"}} />
            <button onClick={r?.inc} aria-label={t('sahna.oshirish')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"40px","height":"40px","background":"var(--sfc2)"}}>
              <Ikon n="qosh" size={18} gap={0} />
            </button>
          </div>
          <span style={{"fontSize":"12px","color":"var(--mut)","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
            {t('sahna.min')}<span className="sc-interp">{r?.min}</span>{t('sahna.max')}<span className="sc-interp">{r?.max}</span>
          </span>
        </div>
      </React.Fragment>))}
      {v.sm?.hasWarn ? (<>
        <div style={{"padding":"10px 12px","borderRadius":"12px","background":"rgba(255,123,123,.12)","border":"1px solid rgba(255,123,123,.4)","color":"var(--danger)","fontSize":"13px","fontWeight":"700"}}>
          <Ikon n="ogohlantirish" size={15} /><span className="sc-interp">{v.sm?.warn}</span>
        </div>
      </>) : null}
      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
        <button onClick={v.moveL} aria-label={t('sahna.chapga_50_mm')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
          <Ikon n="chap" size={20} gap={0} />
        </button>
        <button onClick={v.moveR} aria-label={t('sahna.ongga_50_mm')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
          <Ikon n="ong" size={20} gap={0} />
        </button>
        <button onClick={v.rotate} aria-label={t('sahna.90_gradus_burish')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)","fontSize":"14px"}}>
          <Ikon n="burish" size={18} gap={0} />
        </button>
        <button onClick={v.dup} aria-label={t('sahna.nusxa')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"var(--sfc2)"}}>
          <Ikon n="nusxa" size={18} gap={0} />
        </button>
        <button onClick={v.askDel} aria-label={t('sahna.ochirish')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","background":"rgba(255,123,123,.14)","color":"var(--danger)"}}>
          <Ikon n="ochirish" size={18} gap={0} />
        </button>
      </div>
      <button onClick={v.toggleModOpen} style={{"height":"48px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
        <Ikon n="eshik" /><span className="sc-interp">{v.sm?.openLabel}</span>
      </button>
      {/* TZ-24 A: qo'lda chizilgan modul — chizmani tahrirlash */}
      {v.chizma ? <button onClick={v.chizma} data-chizma-tahrir="" style={{"height":"48px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
        <Ikon n="tahrir" /><span className="sc-interp">{t('chizish.tahrirlash')}</span>
      </button> : null}
      {/* egasi #232: o'rnatma texnika — qismlar (korpus, eshik, ruchka, shisha, tugma) rangi: tayyor palitra + o'zi tanlagan rang */}
      {v.texnika ? <div data-texnika-ranglar="" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)"}}>
        <span style={{"fontSize":"14px","fontWeight":"800"}}><Ikon n="material" />{t('mebel.modul_materiali')}</span>
        {v.texnika.qismlar.map(q => (<div key={q.id} data-texnika-qism={q.id} style={{"display":"flex","alignItems":"center","gap":"6px","flexWrap":"wrap"}}>
          <span style={{"flex":"1 1 70px","fontSize":"13px","fontWeight":"700","color":"var(--mut)"}}>{q.label}</span>
          {v.texnika.palitra.map(c => (<button key={c.id} type="button" title={c.label} aria-label={q.label + ' · ' + c.label} data-texnika-rang={q.id + ':' + c.hex} onClick={() => q.tanla(c.n)}
            style={{"width":"28px","height":"28px","borderRadius":"50%","background":c.hex,"cursor":"pointer","padding":"0","border":q.joriy.toLowerCase() === c.hex.toLowerCase() ? '3px solid var(--acc)' : '1px solid rgba(255,255,255,.35)'}}></button>))}
          <label title={t('korinish.oz_rang')} style={{"position":"relative","width":"28px","height":"28px","borderRadius":"50%","border":"1px dashed var(--mut)","display":"grid","placeItems":"center","cursor":"pointer","color":"var(--mut)","fontSize":"15px","overflow":"hidden"}}>
            +<input type="color" aria-label={q.label + ' · ' + t('korinish.oz_rang')} data-texnika-oz={q.id} value={q.joriy} onChange={(e) => q.tanla(parseInt(e.target.value.slice(1), 16))} style={{"position":"absolute","inset":"0","opacity":"0","cursor":"pointer"}} />
          </label>
        </div>))}
        {v.texnika.ozgargan ? <button type="button" onClick={v.texnika.sukut} data-texnika-sukut="" style={{"height":"36px","borderRadius":"10px","border":"1px solid var(--line)","background":"var(--sfc)","color":"var(--txt)","fontWeight":"700","fontSize":"13px","cursor":"pointer"}}>{t('texnika.sukut')}</button> : null}
      </div> : null}
      {/* TZ-23 E: shu modul materiali (dizayndagi tugma uslubi) */}
      {!v.texnika ? <button onClick={v.material} data-modul-material="" style={{"height":"48px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"800","fontSize":"15px","cursor":"pointer","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap","padding":"0 12px"}}>
        <Ikon n="material" /><span className="sc-interp">{v.matLabel}</span>
      </button>
      : null}
      <span style={{"fontSize":"12px","color":"var(--mut)","textWrap":"pretty"}}>
        {t('sahna.eshik_yoki_tortmani_bosing')}
      </span>
      {v.sm?.canIns ? (<>
        <button onClick={v.openInside} style={{"width":"100%","height":"48px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","animation":"s3pulse 2.4s ease-out 2"}}>
          {t('sahna.ichini_korish')}
        </button>
      </>) : null}
      {v.sm?.noIns ? (<>
        <div style={{"height":"48px","borderRadius":"14px","border":"1px dashed var(--line)","color":"var(--mut)","fontWeight":"700","fontSize":"14px","display":"flex","alignItems":"center","justifyContent":"center"}}>
          {t('sahna.ichki_korinish_tez_orada')}
        </div>
      </>) : null}
    </div>
  );
}
