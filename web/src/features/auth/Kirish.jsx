import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { useKirish } from './useKirish.js';

/* TZ-23 C4: telefon + SMS kod — maydonlar ro'yxatdagi "Telefon" va "Ismingiz" uslubida (dizayn bo'laklari) */
const MAYDON = {"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none"};
const XATO = {"fontSize":"13px","color":"var(--danger)","fontWeight":"600"};
function SmsMaydonlar({ v }) {
  return (<>
    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
      <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>{t('kirish.telefon')}</span>
      <div style={{"display":"flex","alignItems":"center","height":"52px","borderRadius":"14px","background":"var(--bg)","border":`1px solid ${v.f?.bPhone}`,"overflow":"hidden"}}>
        <span style={{"padding":"0 4px 0 16px","fontWeight":"700","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>{"+998"}</span>
        <input value={v.f?.phone} onChange={v.onPhone} inputMode="numeric" autoComplete="tel-national" placeholder="__ ___ __ __" data-sms-tel="" style={{"flex":"1","minWidth":"0","height":"100%","background":"transparent","border":"0","color":"var(--txt)","fontSize":"16px","fontVariantNumeric":"tabular-nums","outline":"none","padding":"0 12px 0 4px"}} />
      </div>
      {v.f?.ePhone ? <span style={XATO}>{v.f?.ePhonet}</span> : null}
    </label>
    {v.yuborildi ? (<>
      <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
        <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>{t('kirish.sms_kod')}</span>
        <input value={v.kod} onChange={v.onKod} inputMode="numeric" autoComplete="one-time-code" placeholder="______" data-sms-kod="" style={{ ...MAYDON, "borderColor": v.bKod, "letterSpacing": ".3em", "fontVariantNumeric": "tabular-nums" }} />
        {v.eKod ? <span style={XATO}>{v.eKod}</span> : null}
        <button onClick={v.smsYubor} disabled={!v.qaytaBor} style={{"alignSelf":"flex-start","background":"none","border":"0","padding":"0","color":v.qaytaBor ? "var(--acct)" : "var(--mut)","fontWeight":"700","fontSize":"14px","cursor":v.qaytaBor ? "pointer" : "default","minHeight":"32px"}}>{v.qayta}</button>
      </label>
      <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
        <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>{t('kirish.ismingiz')}<span style={{"color":"var(--mut)","fontWeight":"500"}}>{t('kirish.ism_birinchi')}</span></span>
        <input autoComplete="name" value={v.f?.name} onChange={v.onName} placeholder={t('kirish.jasur_aliyev')} style={MAYDON} />
      </label>
    </>) : null}
  </>);
}

/* TZ-19: Kirish / Ro'yxatdan o'tish — JSX va stillar tasdiqlangan dizayndan; qiymatlar useKirish() dan. */
export default function Kirish() {
  const v = useKirish();
  return (
    <div data-auth="" style={{"minHeight":"100vh","display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr)"}}>
      <aside data-auth-aside="" style={{"position":"relative","overflow":"hidden","background":"radial-gradient(ellipse 70% 60% at 50% 45%,rgba(255,122,69,.18),transparent 70%),#0C1C22","borderRight":"1px solid var(--line)","display":"flex","flexDirection":"column","padding":"32px 40px"}}>
        <a href="index.html" style={{"display":"flex","alignItems":"center","gap":"10px","position":"relative","zIndex":"2","color":"var(--txt)"}}>
          <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px"}}>
            {"3D"}
          </div>
          <div style={{"display":"flex","flexDirection":"column","lineHeight":"1.05"}}>
            <span style={{"fontWeight":"800","fontSize":"19px"}}>
              {"Smart3D"}
            </span>
            <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
              {"by Bittada"}
            </span>
          </div>
        </a>
        <div ref={v.regHost} style={{"position":"relative","flex":"1 1 auto","minHeight":"340px"}}>
          <div ref={v.regOv} style={{"position":"absolute","inset":"0","pointerEvents":"none"}}></div>
        </div>
        <div style={{"display":"flex","flexDirection":"column","gap":"12px","position":"relative","zIndex":"2"}}>
          <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
            <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
              <Ikon n="tayyor" size={18} gap={0} />
            </span>
            {t('kirish.detal_va_raskroy_avtomatik')}
          </span>
          <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
            <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
              <Ikon n="tayyor" size={18} gap={0} />
            </span>
            {t('kirish.smeta_zapchasti_bilan_bir')}
          </span>
          <span style={{"display":"flex","gap":"12px","alignItems":"center","fontSize":"17px","fontWeight":"700"}}>
            <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--sfc2)","color":"var(--cyan)","display":"grid","placeItems":"center"}}>
              <Ikon n="tayyor" size={18} gap={0} />
            </span>
            {t('kirish.stanok_fayli_bir_tugmada')}
          </span>
        </div>
      </aside>
      <main style={{"display":"flex","alignItems":"center","justifyContent":"center","padding":"32px 16px"}}>
        <div style={{"width":"min(440px,100%)","display":"flex","flexDirection":"column","gap":"22px"}}>
          <a href="index.html" style={{"alignSelf":"flex-start","color":"var(--mut)","fontWeight":"700","fontSize":"15px","minHeight":"44px","display":"flex","alignItems":"center"}}>
            {t('kirish.saytga_qaytish')}
          </a>
          {v.hasPending ? (<>
            <div style={{"display":"flex","gap":"12px","alignItems":"center","padding":"12px 14px","borderRadius":"16px","background":"rgba(255,122,69,.12)","border":"1px solid rgba(255,122,69,.4)"}}>
              <span style={{"width":"36px","height":"36px","flex":"0 0 36px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800"}}>
                <Ikon n="qosh" size={18} gap={0} />
              </span>
              <span style={{"fontSize":"14px","fontWeight":"700"}}>
                <span className="sc-interp">{v.pendingText}</span>
              </span>
            </div>
          </>) : null}
          <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
            <h1 style={{"margin":"0","fontSize":"clamp(30px,3.4vw,40px)","lineHeight":"1.05","letterSpacing":"-.035em","fontWeight":"800"}}>
              <span className="sc-interp">{v.f?.title}</span>
            </h1>
            <p style={{"margin":"0","color":"var(--mut)"}}>
              <span className="sc-interp">{v.f?.sub}</span>
            </p>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
            {v.isReg ? (<>
              <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                  {t('kirish.ismingiz')}
                </span>
                <input autoComplete="name" value={v.f?.name} onChange={v.onName} placeholder={t('kirish.jasur_aliyev')} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","borderColor":v.f?.bName}} />
                {v.f?.eName ? (<>
                  <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                    <span className="sc-interp">{v.f?.eNamet}</span>
                  </span>
                </>) : null}
              </label>
            </>) : null}
            {v.smsUsul ? <SmsMaydonlar v={v} /> : (<>
            {/* TZ-09 Q2: email bilan kirish — "Ismingiz" maydoni uslubida */}
            <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                {t('kirish.email')}
              </span>
              <input type="email" inputMode="email" autoComplete="email" value={v.f?.email} onChange={v.onEmail} placeholder={t('kirish.jasur_mail_uz')} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","borderColor":v.f?.bEmail}} />
              {v.f?.eEmail ? (<>
                <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                  <span className="sc-interp">{v.f?.eEmailt}</span>
                </span>
              </>) : null}
            </label>
            {v.isReg ? (<>
            <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                {t('kirish.telefon')}
              </span>
              <div style={{"display":"flex","alignItems":"center","height":"52px","borderRadius":"14px","background":"var(--bg)","border":`1px solid ${v.f?.bPhone}`,"overflow":"hidden"}}>
                <span style={{"padding":"0 4px 0 16px","fontWeight":"700","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                  {"+998"}
                </span>
                <input value={v.f?.phone} onChange={v.onPhone} inputMode="numeric" placeholder="__ ___ __ __" style={{"flex":"1","minWidth":"0","height":"100%","background":"transparent","border":"0","color":"var(--txt)","fontSize":"16px","fontVariantNumeric":"tabular-nums","outline":"none","padding":"0 12px 0 4px"}} />
              </div>
              {v.f?.ePhone ? (<>
                <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                  <span className="sc-interp">{v.f?.ePhonet}</span>
                </span>
              </>) : null}
            </label>
            </>) : null}
            <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                {t('kirish.parol')}
              </span>
              <div style={{"display":"flex","alignItems":"center","height":"52px","borderRadius":"14px","background":"var(--bg)","border":`1px solid ${v.f?.bPass}`,"overflow":"hidden"}}>
                <input type={v.f?.passType} autoComplete={v.f?.passAuto} value={v.f?.pass} onChange={v.onPass} placeholder={t('kirish.kamida_8_belgi')} style={{"flex":"1","minWidth":"0","height":"100%","background":"transparent","border":"0","color":"var(--txt)","fontSize":"16px","outline":"none","padding":"0 16px"}} />
                <button onClick={v.toggleEye} aria-label={t('kirish.parolni_korsatish')} style={{"width":"52px","height":"52px","background":"transparent","border":"0","color":"var(--mut)","fontSize":"18px","cursor":"pointer"}}>
                  <Ikon n={v.f?.eye} size={20} gap={0} />
                </button>
              </div>
              {v.isReg ? (<>
                <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                  <div style={{"flex":"1","display":"flex","gap":"4px"}}>
                    {(v.f?.bars || []).map((b, $index) => (<React.Fragment key={$index}>
                      <span style={{"flex":"1","height":"4px","borderRadius":"9px","background":b?.c,"transition":"background .2s"}}></span>
                    </React.Fragment>))}
                  </div>
                  <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","minWidth":"64px","textAlign":"right"}}>
                    <span className="sc-interp">{v.f?.strength}</span>
                  </span>
                </div>
              </>) : null}
              {v.f?.ePass ? (<>
                <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600"}}>
                  <span className="sc-interp">{v.f?.ePasst}</span>
                </span>
              </>) : null}
            </label>
            </>)}
            {v.isReg ? (<>
              <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                <span style={{"fontSize":"14px","fontWeight":"700","color":"var(--txt)"}}>
                  {t('kirish.sex_nomi')}
                  <span style={{"color":"var(--mut)","fontWeight":"500"}}>
                    {t('kirish.ixtiyoriy')}
                  </span>
                </span>
                <input value={v.f?.shop} onChange={v.onShop} placeholder={t('kirish.mebel_pro')} style={{"width":"100%","height":"52px","borderRadius":"14px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none"}} />
              </label>
            </>) : null}
          </div>
          <button onClick={v.smsUsul ? v.smsSubmit : v.submitAuth} data-kirish-cta="" style={{"height":"56px","borderRadius":"16px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","transition":"transform .15s ease-out"}} className="h0">
            <span className="sc-interp">{v.smsUsul ? v.smsCta : v.f?.cta}</span>
          </button>
          {/* TZ-23 C4: telefon + SMS bilan kirish (server SMS ishlaganda) — dizayndagi ikkinchi darajali tugma uslubida */}
          {v.smsBor ? (
            <button onClick={v.usulAlmash} data-kirish-usul="" style={{"height":"48px","borderRadius":"14px","border":"1px solid var(--line)","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"700","fontSize":"15px","cursor":"pointer"}}>
              {v.usulCta}
            </button>) : null}
          <div style={{"display":"flex","justifyContent":"center","gap":"6px","color":"var(--mut)","fontSize":"15px"}}>
            <span>
              <span className="sc-interp">{v.f?.alt}</span>
            </span>
            <button onClick={v.swapAuth} style={{"background":"none","border":"0","padding":"0","color":"var(--acct)","fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
              <span className="sc-interp">{v.f?.altCta}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
