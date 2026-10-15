import React from 'react';

/* TZ-19: sayt — sarlavha va menyu. JSX va stillar tasdiqlangan dizayndan (o'zgarishsiz); qiymatlar Landing.renderVals() dan. */
export default function Header({ v }) {
  return (
    <header style={{"position":"sticky","top":"0","zIndex":"50","height":"64px","background":"rgba(15,34,41,.78)","backdropFilter":"blur(16px)","WebkitBackdropFilter":"blur(16px)","borderBottom":"1px solid var(--line)"}}>
      <div style={{"maxWidth":"1280px","height":"100%","margin":"0 auto","padding":"0 clamp(16px,4vw,32px)","display":"flex","alignItems":"center","gap":"16px"}}>
        <a href="#hero" style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--txt)"}}>
          <div style={{"width":"38px","height":"38px","borderRadius":"12px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"18px"}}>
            {"3D"}
          </div>
          <div style={{"display":"flex","flexDirection":"column","lineHeight":"1.05"}}>
            <span style={{"fontWeight":"800","fontSize":"19px","letterSpacing":"-.02em","color":"var(--txt)"}}>
              {"Smart3D"}
            </span>
            <span style={{"fontSize":"11px","color":"var(--mut)","fontWeight":"600"}}>
              {"by Bittada"}
            </span>
          </div>
        </a>
        <nav data-desk="" style={{"display":"flex","gap":"4px","margin":"0 auto"}}>
          <a href="#kimlar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h0">
            {"Kimlar uchun"}
          </a>
          <a href="#demo" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h1">
            {"3D demo"}
          </a>
          <a href="#qanday" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h2">
            {"Qanday ishlaydi"}
          </a>
          <a href="#imkoniyatlar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h3">
            {"Fayllar"}
          </a>
          <a href="#savollar" style={{"padding":"10px 14px","borderRadius":"999px","color":"var(--mut)","fontWeight":"600","fontSize":"14px","whiteSpace":"nowrap"}} className="h4">
            {"Savollar"}
          </a>
        </nav>
        <div style={{"display":"flex","gap":"8px","alignItems":"center","marginLeft":"auto"}}>
          <a data-desk="" href="app.html#login" onClick={v.goLogin} style={{"height":"44px","padding":"0 18px","borderRadius":"14px","display":"flex","alignItems":"center","whiteSpace":"nowrap","color":"var(--txt)","fontWeight":"700","fontSize":"15px","border":"1px solid var(--line)"}} className="h5">
            {"Kirish"}
          </a>
          <a href="app.html#reg" onClick={v.goReg} style={{"height":"44px","padding":"0 20px","borderRadius":"14px","display":"flex","alignItems":"center","whiteSpace":"nowrap","color":"var(--ink)","fontWeight":"800","fontSize":"15px","background":"var(--acc)"}} className="h6">
            {"Ro'yxatdan o'tish"}
          </a>
          <button data-mob="" onClick={v.toggleMenu} aria-label="Menyu" style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"18px","cursor":"pointer"}}>
            {"☰"}
          </button>
        </div>
      </div>
      {v.menu ? (<>
        <div data-mob="" style={{"background":"var(--bg)","borderBottom":"1px solid var(--line)","padding":"8px 16px 16px","display":"flex","flexDirection":"column","gap":"2px"}}>
          <a href="#kimlar" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
            {"Kimlar uchun"}
          </a>
          <a href="#demo" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
            {"3D demo"}
          </a>
          <a href="#qanday" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
            {"Qanday ishlaydi"}
          </a>
          <a href="#savollar" onClick={v.closeMenu} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
            {"Savollar"}
          </a>
          <a href="app.html#login" onClick={v.goLogin} style={{"padding":"12px","color":"var(--txt)","fontWeight":"700"}}>
            {"Kirish"}
          </a>
        </div>
      </>) : null}
    </header>
  );
}
