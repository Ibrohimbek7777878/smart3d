import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import Toggle from '../../../shared/ui/Toggle.jsx';
import { useQadamNarx } from './useQadamNarx.js';
import { buyurtmaOch } from '../../buyurtma/buyurtma.js';

/* TZ-19: ③ Narx — JSX va stillar tasdiqlangan dizayndan; qiymatlar useQadamNarx() dan. */
export default function QadamNarx() {
  const v = useQadamNarx();
  return (
    <>
      <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
        <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
          {t('narx.qadam')}
        </span>
        <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
          {t('narx.narx')}
        </h2>
      </div>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(110px,1fr))","gap":"8px"}}>
        <div style={{"borderRadius":"18px","padding":"14px","background":"var(--acc)","color":"var(--ink)","display":"flex","flexDirection":"column","gap":"2px"}}>
          <span style={{"fontSize":"12px","fontWeight":"800"}}>
            {t('narx.mijozga_narx')}
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
            {t('narx.sex_tannarxi')}
          </span>
          <span style={{"fontSize":"19px","fontWeight":"800","fontVariantNumeric":"tabular-nums","lineHeight":"1.15"}}>
            <span className="sc-interp">{v.price?.cost}</span>
          </span>
          <span style={{"fontSize":"12px","color":"var(--mut)"}}>
            {t('narx.som')}
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
            {t('narx.som')} · {t('narx.foyda_izoh')}
          </span>
        </div>
      </div>
      {/* TZ-20 (dizaynda yo'q — chip uslubida): "Narx aniqligi X%" — "* to'liq emas" o'rnida, jami narx ostida; bosilsa taxminiy qatorlar */}
      {v.aniqlik ? <button onClick={v.aniqlik.flip} data-aniqlik="" aria-expanded={v.aniqlik.ochiq} style={{"alignSelf":"flex-start","minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","background":"var(--sfc2)","color":v.aniqlik.toliq ? "var(--cyan)" : "var(--acct)","fontSize":"14px","fontWeight":"800","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","whiteSpace":"nowrap"}}>
        {v.aniqlik.label}<Ikon n={v.aniqlik.ochiq ? "tepa" : "past"} size={16} gap={0} />
      </button> : null}
      {v.aniqlik && v.aniqlik.ochiq ? (
        <div data-aniqlik-royxat="" style={{"borderRadius":"16px","background":"var(--sfc)","border":"1px solid var(--line)","padding":"10px 14px","display":"flex","flexDirection":"column","gap":"4px","fontSize":"13px"}}>
          {v.aniqlik.bosh ? <span style={{"color":"var(--cyan)","fontWeight":"700"}}>{v.aniqlik.bosh}</span> : null}
          {v.aniqlik.rows.map((r, i) => (
            <span key={i} style={{"display":"flex","justifyContent":"space-between","gap":"8px"}}>
              <span style={{"minWidth":"0"}}>{r.n} <span style={{"color":"var(--mut)"}}>· {r.m}</span></span>
              <span style={{"fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>{r.p}</span>
            </span>))}
          {v.aniqlik.narxsiz ? <span style={{"color":"var(--danger)","fontWeight":"700"}}>{v.aniqlik.narxsiz}</span> : null}
        </div>) : null}
      {v.hasMissing ? (<>
      <div style={{"borderRadius":"16px","background":"rgba(255,123,123,.10)","border":"1px solid rgba(255,123,123,.38)"}}>
        <button onClick={v.toggleMissing} style={{"width":"100%","minHeight":"48px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","padding":"10px 14px","background":"none","border":"0","color":"var(--danger)","fontWeight":"800","fontSize":"14px","cursor":"pointer","textAlign":"left"}}>
          <span style={{"display":"flex","alignItems":"center","gap":"8px"}}><Ikon n="ogohlantirish" size={16} gap={0} />{v.missText}</span>
          <span style={{"display":"flex"}}>
            <Ikon n={v.missOpen ? "tepa" : "past"} size={18} gap={0} />
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
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"4px 16px 8px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","padding":"12px 0 6px"}}>
          <span style={{"fontWeight":"800"}}>
            {t('narx.mijozga_kotirovka')}
          </span>
          <span style={{"fontSize":"12px","color":"var(--mut)","fontWeight":"700"}}>
            {t('narx.som')}
          </span>
        </div>
        {/* TZ-09 8-bosqich (dizaynda yo'q): mijoz ismi — "Loyihalarim" kartasidagi mijoz shu yerdan */}
        <label style={{"display":"flex","alignItems":"center","gap":"10px","padding":"0 0 8px","fontSize":"14px","color":"var(--mut)","fontWeight":"700"}}>
          {t('narx.mijoz')}
          <input value={v.client} onChange={v.onClient} placeholder={t('narx.mijoz_ismi')} style={{"flex":"1","minWidth":"0","height":"44px","borderRadius":"12px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"15px","padding":"0 14px","outline":"none"}} />
        </label>
        {(v.quote || []).map((r, $index) => (<React.Fragment key={$index}>
          <div style={{"display":"flex","justifyContent":"space-between","gap":"10px","padding":"9px 0","borderTop":"1px solid var(--line)","fontSize":"13px"}}>
            <span style={{"display":"flex","flexDirection":"column","minWidth":"0"}}>
              <span style={{"fontWeight":"700"}}>
                <span className="sc-interp">{r?.name}</span>
              </span>
              <span style={{"color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{r?.dim}</span>{" · "}<span className="sc-interp">{r?.n}</span>{t('narx.dona')}
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
          {t('narx.xizmatlar_usta_tanlaydi')}
        </span>
        <Toggle label={t('narx.teshik_burgilash_prisadka')} sub={v.xz.sub} on={v.xz.on} onFlip={v.xz.flip} />
        {(v.bz || []).map((b) => (<Toggle key={b.key} label={b.label} sub={b.sub} on={b.on} onFlip={b.flip} />))}
        {v.xz?.note ? (<>
          <span style={{"fontSize":"13px","color":"var(--danger)","fontWeight":"600","paddingTop":"6px","display":"flex","alignItems":"center","gap":"6px"}}><Ikon n="ogohlantirish" size={15} gap={0} />{v.xz?.note}</span>
        </>) : null}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"4px 16px 8px"}}>
        <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
          {t('narx.sex_tannarxi')}
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
            {t('narx.raskroy_varaq', { n: v.rk?.n })}
          </span>
          <div style={{"display":"flex","gap":"6px"}}>
            <button onClick={v.rkPrev} aria-label={t('narx.oldingi_varaq')} style={{"borderRadius":"14px","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
              <Ikon n="chap" size={18} gap={0} />
            </button>
            <button onClick={v.rkNext} aria-label={t('narx.keyingi_varaq')} style={{"borderRadius":"14px","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","cursor":"pointer","display":"grid","placeItems":"center","flex":"0 0 auto","width":"36px","height":"36px","background":"var(--sfc2)"}}>
              <Ikon n="ong" size={18} gap={0} />
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
            <Ikon n="sozlash" gap={0} />{t('narx.parametrlar')}
          </button>
        </div>
        {/* TZ-23 C2 (admin): qoldiqlarni omborga yozish */}
        {v.qoldiq ? <button onClick={v.qoldiq.yoz} data-qoldiq-omborga="" style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","alignSelf":"flex-start"}}>
          <Ikon n="qoldiq" gap={0} />{v.qoldiq.label}
        </button> : null}
      </div>
      <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"4px 16px 8px"}}>
        <div style={{"padding":"12px 0 6px","fontWeight":"800"}}>
          {t('narx.detallar_royxati')}
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
      {/* TZ-23 C1 (dizaynda yo'q — 52px tugma, --acc chegara): sexga buyurtma (egasi #138) */}
      <button onClick={buyurtmaOch} data-buyurtma-ber="" style={{"height":"52px","borderRadius":"14px","border":"2px solid var(--acc)","background":"transparent","color":"var(--acc)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto","display":"flex","alignItems":"center","justifyContent":"center"}}>
        <Ikon n="buyurtma" size={19} />{t('buyurtma.ber')}
      </button>
      <button onClick={v.goStep4} style={{"height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer","flex":"0 0 auto"}}>
        {t('narx.keyingi_fayllar')}
      </button>
    </>
  );
}
