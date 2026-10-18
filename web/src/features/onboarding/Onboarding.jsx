import TilTugma from '../../shared/ui/TilTugma.jsx';
import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { useOnboarding } from './useOnboarding.js';

/* TZ-19: yangi loyiha (1/3, 2/3) — JSX va stillar tasdiqlangan dizayndan; qiymatlar useOnboarding() dan. */
export default function Onboarding() {
  const v = useOnboarding();
  return (
    <div style={{"minHeight":"100vh","display":"flex","flexDirection":"column","background":"radial-gradient(ellipse 60% 50% at 50% 0%,rgba(255,122,69,.12),transparent 70%),var(--bg)"}}>
      <div style={{"maxWidth":"1080px","width":"100%","margin":"0 auto","padding":"20px clamp(16px,4vw,32px)","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"16px"}}>
        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
          <div style={{"width":"36px","height":"36px","borderRadius":"11px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
            {"3D"}
          </div>
          <span style={{"fontWeight":"800","fontSize":"18px"}}>
            {"Smart3D"}
          </span>
        </div>
        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
          <TilTugma />
          <div style={{"display":"flex","gap":"4px"}}>
            {(v.onb?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
              <span style={{"width":"28px","height":"5px","borderRadius":"9px","background":b?.c}}></span>
            </React.Fragment>))}
          </div>
          <span style={{"fontFamily":"'JetBrains Mono',monospace","fontSize":"13px","color":"var(--mut)"}}>
            <span className="sc-interp">{v.onb?.n}</span>{" / 3"}
          </span>
        </div>
      </div>
      <div style={{"flex":"1","maxWidth":"1080px","width":"100%","margin":"0 auto","padding":"clamp(16px,5vh,56px) clamp(16px,4vw,32px) 48px","display":"flex","flexDirection":"column","gap":"28px"}}>
        {v.isOnb1 ? (<>
          <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
            <h1 style={{"margin":"0","fontSize":"clamp(30px,4vw,48px)","letterSpacing":"-.04em","lineHeight":"1.05","fontWeight":"800"}}>
              {t('onb.nima_yasaymiz')}
            </h1>
            <p style={{"margin":"0","color":"var(--mut)","fontSize":"17px"}}>
              {t('onb.tanlang_keyin_hammasini')}
            </p>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(220px,1fr))","gap":"12px"}}>
            {(v.onb?.kinds || []).map((k, $index) => (<React.Fragment key={$index}>
              <button onClick={k?.pick} style={{"minHeight":"200px","textAlign":"left","borderRadius":"24px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","padding":"24px","cursor":"pointer","display":"flex","flexDirection":"column","justifyContent":"space-between","gap":"16px","transition":"transform .35s cubic-bezier(.2,.8,.2,1),border-color .2s","transform":"perspective(900px)"}} className="h1">
                <span style={{"width":"64px","height":"64px","borderRadius":"20px","background":"var(--sfc2)","display":"grid","placeItems":"center","fontSize":"32px"}}>
                  <Ikon n={k?.icon} size={30} gap={0} style={{ color: "var(--acct)" }} />
                </span>
                <span style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                  <span style={{"fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
                    <span className="sc-interp">{k?.label}</span>
                  </span>
                  <span style={{"fontSize":"14px","color":"var(--mut)"}}>
                    <span className="sc-interp">{k?.sub}</span>
                  </span>
                </span>
              </button>
            </React.Fragment>))}
          </div>
        </>) : null}
        {v.isOnb2 ? (<>
          <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
            <button onClick={v.onbBack} style={{"alignSelf":"flex-start","background":"none","border":"0","color":"var(--mut)","fontWeight":"700","fontSize":"15px","cursor":"pointer","padding":"0"}}>
              {t('onb.orqaga')}
            </button>
            <h1 style={{"margin":"0","fontSize":"clamp(30px,4vw,48px)","letterSpacing":"-.04em","lineHeight":"1.05","fontWeight":"800"}}>
              <span className="sc-interp">{v.onb?.t2}</span>
            </h1>
            <p style={{"margin":"0","color":"var(--mut)","fontSize":"17px"}}>
              <span className="sc-interp">{v.onb?.s2}</span>
            </p>
          </div>
          {v.onb?.notAi ? (<>
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(170px,1fr))","gap":"10px"}}>
              {(v.onb?.presets || []).map((p, $index) => (<React.Fragment key={$index}>
                <button onClick={p?.pick} style={{"minHeight":"96px","borderRadius":"20px","background":p?.bg,"border":`1px solid ${p?.bd}`,"color":"var(--txt)","cursor":"pointer","display":"flex","flexDirection":"column","alignItems":"flex-start","justifyContent":"center","gap":"2px","padding":"16px 20px","transition":"border-color .2s"}}>
                  <span style={{"fontSize":"26px","fontWeight":"800","fontVariantNumeric":"tabular-nums","letterSpacing":"-.02em"}}>
                    <span className="sc-interp">{p?.label}</span>
                  </span>
                  <span style={{"fontSize":"13px","color":"var(--mut)"}}>
                    <span className="sc-interp">{p?.area}</span>
                  </span>
                </button>
              </React.Fragment>))}
            </div>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexWrap":"wrap","gap":"12px","alignItems":"flex-end"}}>
              <span style={{"flex":"1 0 100%","fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
                {t('onb.yoki_oz_olchamingiz')}
              </span>
              <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                  {t('umumiy.eni_mm')}
                </span>
                <input type="number" value={v.room?.w} onChange={v.onRoomW} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
              </label>
              <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                  {t('onb.chuqurligi_mm')}
                </span>
                <input type="number" value={v.room?.d} onChange={v.onRoomD} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
              </label>
              <label style={{"flex":"1 1 140px","display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
                  {t('onb.boyi_mm')}
                </span>
                <input type="number" value={v.room?.h} onChange={v.onRoomH} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","fontVariantNumeric":"tabular-nums"}} />
              </label>
            </div>
          </>) : null}
          {v.onb?.isAi ? (<>
            <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"16px","display":"flex","flexDirection":"column","gap":"12px","padding":"20px"}}>
              <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder={t('umumiy.oshxona_3_6x3_m_balandlik_2_7')} style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"vertical","outline":"none"}}></textarea>
              <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                <button onClick={v.toggleMic} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","height":"44px","background":v.micBg,"color":v.micT}}>
                  <Ikon n="mikrofon" size={16} gap={0} /><span className="sc-interp">{v.micLabel}</span>
                </button>
                {(v.aiEx || []).map((x, $index) => (<React.Fragment key={$index}>
                  <button onClick={x?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600"}}>
                    <span className="sc-interp">{x?.t}</span>
                  </button>
                </React.Fragment>))}
              </div>
            </div>
          </>) : null}
          <div style={{"display":"flex","justifyContent":"flex-end"}}>
            <button onClick={v.openEditor} style={{"height":"56px","padding":"0 28px","borderRadius":"16px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
              {t('onb.muharrirni_ochish')}
            </button>
          </div>
        </>) : null}
      </div>
    </div>
  );
}
