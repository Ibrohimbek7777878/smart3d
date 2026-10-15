import React from 'react';
import Toggle from '../../../shared/ui/Toggle.jsx';
import { useQadamNarx } from './useQadamNarx.js';

/* TZ-19: ③ Narx — JSX va stillar tasdiqlangan dizayndan; qiymatlar useQadamNarx() dan. */
export default function QadamNarx() {
  const v = useQadamNarx();
  return (
    <>
      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
          {"③ Qadam"}
        </span>
        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
          {"Narx"}
        </h2>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(110px,1fr))","gap":"8px"}}>
        <div style={{"borderRadius":"18px","padding":"14px","background":"var(--acc)","color":"var(--ink)","display":"flex","flexDirection":"column","gap":"2px"}}>
          <span style={{"fontSize":"12px","fontWeight":"800"}}>
            {"Mijozga narx"}
          </span>
          <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15"}}>
            <span className="sc-interp">{v.price?.total}</span>
          </span>
          <span style={{"fontSize":"12px","fontWeight":"700"}}>
            {v.price?.som}
          </span>
        </div>
        <div style={{"borderRadius":"18px","padding":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","flexDirection":"column","gap":"2px"}}>
          <span style={{"fontSize":"12px","fontWeight":"800","color":"var(--mut)"}}>
            {"Sex tannarxi"}
          </span>
          <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15"}}>
            <span className="sc-interp">{v.price?.cost}</span>
          </span>
          <span style={{"fontSize":"12px","color":"var(--mut)"}}>
            {"so'm"}
          </span>
        </div>
        <div style={{"borderRadius":"18px","padding":"14px","background":"var(--sfc)","border":"1px solid var(--line)","display":"flex","flexDirection":"column","gap":"2px"}}>
          <span style={{"fontSize":"12px","fontWeight":"800","color":"var(--mut)"}}>
            {v.markupLabel}
          </span>
          <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15","color":"var(--cyan)"}}>
            <span className="sc-interp">{v.price?.profit}</span>
          </span>
          <span style={{"fontSize":"12px","color":"var(--mut)"}}>
            {"so'm"}
          </span>
        </div>
      </div>
      {v.hasMissing ? (<>
      <div style={{"borderRadius":"16px","background":"rgba(255,123,123,.10)","border":"1px solid rgba(255,123,123,.38)"}}>
        <button onClick={v.toggleMissing} style={{"width":"100%","minHeight":"48px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","padding":"10px 14px","background":"none","border":"0","color":"var(--danger)","fontWeight":"800","fontSize":"14px","cursor":"pointer","textAlign":"left"}}>
          {v.missText}
          <span>
            <span className="sc-interp">{v.missArrow}</span>
          </span>
        </button>
        {v.missOpen ? (<>
          <div style={{"padding":"0 14px 12px","display":"flex","flexDirection":"column","gap":"4px","fontSize":"13px","color":"var(--txt)"}}>
            {(v.missing || []).map((m, $index) => (<React.Fragment key={$index}>
              <span style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
                <span>
                  <span className="sc-interp">{m?.n}</span>
                </span>
                <span style={{"color":"var(--mut)"}}>
                  <span className="sc-interp">{m?.c}</span>
                </span>
              </span>
            </React.Fragment>))}
          </div>
        </>) : null}
      </div>
      </>) : null}
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","padding":"12px 0 6px"}}>
          <span style={{"fontWeight":"800"}}>
            {"Mijozga kotirovka"}
          </span>
          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
            {"so'm"}
          </span>
        </div>
        {/* TZ-09 8-bosqich (dizaynda yo'q): mijoz ismi — "Loyihalarim" kartasidagi mijoz shu yerdan */}
        <label style={{"display":"flex","alignItems":"center","gap":"10px","padding":"0 0 8px","fontSize":"14px","color":"var(--mut)","fontWeight":"700"}}>
          {"Mijoz"}
          <input value={v.client} onChange={v.onClient} placeholder="Mijoz ismi" style={{"flex":"1","minWidth":"0","height":"44px","borderRadius":"12px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"15px","padding":"0 14px","outline":"none"}} />
        </label>
        {(v.quote || []).map((r, $index) => (<React.Fragment key={$index}>
          <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
            <span style={{"display":"flex","flexDirection":"column","minWidth":"0"}}>
              <span style={{"fontWeight":"700"}}>
                <span className="sc-interp">{r?.name}</span>
              </span>
              <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{r?.dim}</span>{" · "}<span className="sc-interp">{r?.n}</span>{" dona"}
              </span>
            </span>
            <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
              <span className="sc-interp">{r?.p}</span>
            </span>
          </div>
        </React.Fragment>))}
      </div>
      {/* TZ-09 8-bosqich (dizaynda yo'q): xizmatlar — usta tanlaydi (qoida S3); "Oshxona elementlari" toggle uslubida */}
      <div data-xizmat="" style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"2px"}}>
        <span style={{"fontWeight":"800","paddingBottom":"6px"}}>
          {"Xizmatlar — usta tanlaydi"}
        </span>
        <Toggle label={"Teshik burg'ilash (prisadka)"} sub={v.xz.sub} on={v.xz.on} onFlip={v.xz.flip} />
        {v.xz?.note ? (<>
          <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600","paddingTop":"6px"}}>{v.xz?.note}</span>
        </>) : null}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
        <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
          {"Sex tannarxi"}
        </div>
        {(v.costRows || []).map((r, $index) => (<React.Fragment key={$index}>
          <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
            <span style={{"display":"flex","flexDirection":"column"}}>
              <span style={{"fontWeight":"700"}}>
                <span className="sc-interp">{r?.name}</span>
              </span>
              <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{r?.q}</span>
              </span>
            </span>
            <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
              <span className="sc-interp">{r?.p}</span>
            </span>
          </div>
        </React.Fragment>))}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"10px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
          <span style={{"fontWeight":"800"}}>
            {"Raskroy · "}<span className="sc-interp">{v.rk?.n}</span>{"-varaq"}
          </span>
          <div style={{"display":"flex","gap":"6px"}}>
            <button onClick={v.rkPrev} aria-label="Oldingi varaq" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
              {"←"}
            </button>
            <button onClick={v.rkNext} aria-label="Keyingi varaq" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
              {"→"}
            </button>
          </div>
        </div>
        <div style={{"position":"relative","width":"100%","aspectRatio":v.rk?.ar,"borderRadius":"8px","background":"repeating-linear-gradient(135deg,#2A4D57 0 6px,#244550 6px 12px)","border":"1px solid var(--line)","overflow":"hidden"}}>
          {(v.rk?.rects || []).map((r, $index) => (<React.Fragment key={$index}>
            <div style={{"position":"absolute","left":r?.l,"top":r?.t,"width":r?.w,"height":r?.h,"background":r?.c,"borderRadius":"2px","opacity":".92"}}></div>
          </React.Fragment>))}
        </div>
        <div style={{"display":"flex","gap":"4px","justifyContent":"center"}}>
          {(v.rk?.dots || []).map((d, $index) => (<React.Fragment key={$index}>
            <span style={{"width":d?.w,"height":"6px","borderRadius":"9px","background":d?.c,"transition":"all .2s"}}></span>
          </React.Fragment>))}
        </div>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
          <span style={{"fontWeight":"800","color":"var(--acct)","fontVariantNumeric":"tabular-nums"}}>
            {v.rk?.summary}
          </span>
          <button onClick={v.openParams} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)"}}>
            {"⚙️ Parametrlar"}
          </button>
        </div>
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","padding":"4px 16px 8px"}}>
        <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
          {"Detallar ro'yxati"}
        </div>
        {(v.detGroups || []).map((g, $index) => (<React.Fragment key={$index}>
          <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
            <span style={{"fontWeight":"700"}}>
              <span className="sc-interp">{g?.n}</span>
            </span>
            <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
              <span className="sc-interp">{g?.c}</span>
            </span>
          </div>
        </React.Fragment>))}
      </div>
      <button onClick={v.goStep4} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
        {"Keyingi: Fayllar →"}
      </button>
    </>
  );
}
