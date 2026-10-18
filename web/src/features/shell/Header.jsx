import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { useHeader } from './useHeader.js';
import BekorTugmalar from '../editor/BekorTugmalar.jsx';

/* TZ-19: sarlavha — JSX va stillar tasdiqlangan dizayndan; qiymatlar useHeader() dan. */
export default function Header() {
  const v = useHeader();
  return (
    <header style={{"position":"sticky","top":"0","zIndex":"30","height":"64px","flex":"0 0 64px","background":"rgba(15,34,41,.92)","backdropFilter":"blur(14px)","WebkitBackdropFilter":"blur(14px)","borderBottom":"1px solid var(--line)","display":"flex","alignItems":"center","gap":"12px","padding":"0 clamp(12px,2vw,20px)"}}>
      <button onClick={v.goProjects} style={{"display":"flex","alignItems":"center","gap":"10px","background":"none","border":"0","color":"var(--txt)","cursor":"pointer","padding":"0"}}>
        <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"15px"}}>
          {"3D"}
        </div>
        <span data-hide-m="" style={{"display":"flex","flexDirection":"column","lineHeight":"1.05","textAlign":"left"}}>
          <span style={{"fontWeight":"800","fontSize":"18px"}}>
            {"Smart3D"}
          </span>
          <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
            {"by Bittada"}
          </span>
        </span>
      </button>
      {v.isEditor ? (<>
        <label style={{"display":"flex","alignItems":"center","gap":"6px","minWidth":"0","flex":"0 1 auto","height":"40px","padding":"0 12px","borderRadius":"12px","background":"var(--sfc)","border":"1px solid var(--line)"}}>
          <span data-hide-m="" style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
            {t('sarlavha.loyiha')}
          </span>
          <input value={v.projName} onChange={v.onProjName} style={{"width":"150px","minWidth":"0","background":"transparent","border":"0","color":"var(--txt)","fontWeight":"800","fontSize":"15px","outline":"none"}} />
          <span style={{"color":"var(--mut)"}}>
            <Ikon n="tahrir" size={15} gap={0} />
          </span>
        </label>
        {/* TZ-09 8-bosqich (dizaynda yo'q): serverga saqlash holati (TZ-07) — ikon: saqlandi / saqlanmoqda / internet yo'q, tafsiloti — sichqoncha ostida */}
        {v.save?.on ? (<>
          <span role="status" data-save={v.save?.kind} title={v.save?.title} aria-label={v.save?.title} style={{"fontSize":"13px","fontWeight":"700","color":v.save?.c,"whiteSpace":"nowrap","flex":"0 0 auto","display":"flex"}}>
            <Ikon n={v.save?.ikon} size={20} gap={0} />
          </span>
        </>) : null}
        {/* bekor qilish / qaytarish (dizaynda yo'q) — kompyuterda shu yerda, telefonda 3D ustidagi qatorda (BekorTugmalar.jsx) */}
        <BekorTugmalar joy="sarlavha" />
      </>) : null}
      <div style={{"marginLeft":"auto","display":"flex","alignItems":"center","gap":"8px"}}>
        {v.isEditor ? (<>
          <button onClick={v.goStep3} style={{"height":"44px","padding":"0 14px","borderRadius":"999px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"15px","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
            <span className="sc-interp">{v.price?.total}</span>{t('sarlavha.som')}
            <span data-hide-m="" style={{"fontSize":"13px"}}>
              {v.price?.star}
            </span>
          </button>
          <span data-hide-m="" style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700","whiteSpace":"nowrap"}}>
            {v.price?.note}
          </span>
          {/* TZ-25 A (dizaynda yo'q — dizayndagi 44px tugma uslubida): loyihalar ro'yxati va fayllar paneli */}
          <button onClick={v.goProjects} data-sarlavha="loyihalar" data-hide-m="" title={t('qadam.loyihalar')} aria-label={t('qadam.loyihalar')} style={{"height":"44px","padding":"0 12px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","display":"flex","alignItems":"center","whiteSpace":"nowrap","flex":"0 0 auto"}}>
            <Ikon n="papka" size={18} gap={0} /><span data-hide-m="" style={{"marginLeft":"6px"}}>{t('qadam.loyihalar')}</span>
          </button>
          {v.oddiy ? null : <button onClick={v.fayllar} data-sarlavha="fayllar" data-hide-m="" aria-pressed={v.fayllarOn} title={t('qadam.fayllar')} aria-label={t('qadam.fayllar')} style={{"height":"44px","padding":"0 12px","borderRadius":"14px","background":v.fayllarOn ? "var(--sfc2)" : "var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontWeight":"700","fontSize":"14px","cursor":"pointer","display":"flex","alignItems":"center","whiteSpace":"nowrap","flex":"0 0 auto"}}>
            <Ikon n="excel" size={18} gap={0} /><span data-hide-m="" style={{"marginLeft":"6px"}}>{t('qadam.fayllar')}</span>
          </button>}
        </>) : null}
        <button onClick={v.tilMenu} aria-label={t('sarlavha.til')} data-til-menyu="" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto"}}>
          <Ikon n="til" size={19} gap={0} />
        </button>
        {v.admin ? <button onClick={v.goAdmin} data-admin-havola="" title={t('admin.sarlavha')} aria-label={t('admin.sarlavha')} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--acct)","cursor":"pointer","display":"grid","placeItems":"center","padding":"0"}}><Ikon n="sozlash" size={19} gap={0} /></button> : null}
        <div role="button" tabIndex={0} aria-label={t('umumiy.sozlamalar')} data-sozlamalar onClick={v.openSettings} onKeyDown={v.avatarKey} style={{"width":"44px","height":"44px","borderRadius":"999px","background":"var(--sfc2)","border":"1px solid var(--line)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px","color":"var(--cyan)","cursor":"pointer"}}>
          <span className="sc-interp">{v.initials}</span>
        </div>
      </div>
    </header>
  );
}
