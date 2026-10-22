import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useQadamMebel } from './useQadamMebel.js';
import { openKonstruktor } from '../konstruktor/konstruktor.js';
import { openFurnitura } from './furnitura.js';
import { chizishOch } from '../chizish/chizish.js';
import { openSheet } from '../../../store/ui.js';
import { btnGhost } from '../../../shared/ui/styles.js';

/* TZ-19: ② Mebel (katalog) — JSX va stillar tasdiqlangan dizayndan; qiymatlar useQadamMebel() dan. */
export default function QadamMebel() {
  const v = useQadamMebel();
  return (
    <>
      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","gap":"8px"}}>
        <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
          <span style={{"fontSize":"12px","fontWeight":"800","letterSpacing":".08em","textTransform":"uppercase","color":"var(--mut)"}}>
            {t('mebel.qadam')}
          </span>
          <h2 style={{"margin":"0","fontSize":"22px","fontWeight":"800","letterSpacing":"-.02em"}}>
            {t('mebel.mebel')}
          </h2>
        </div>
        <span style={{"fontSize":"13px","color":"var(--mut)","fontWeight":"700"}}>
          {v.catCount}
        </span>
      </div>
      {/* egasi #239–#241: almashtirish rejimi — katalogdan bosilgan modul tanlangan modul o'rniga qo'yiladi */}
      {v.almash ? <div data-almash-rejim="" style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,122,69,.14)', border: '1px solid var(--acc)', display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
        <Ikon n="almashtirish" size={20} gap={0} />
        <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: '800', fontSize: '14px' }}>{t('mebel.almash_sarlavha', { nom: v.almash.nom })}</span>
          <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{t('mebel.almash_matn')}</span>
        </span>
        <button onClick={v.almash.bekor} data-almash-bekor="" style={{ ...btnGhost, height: '36px', flex: '0 0 auto' }}>{t('mebel.almash_bekor')}</button>
      </div> : null}
      {/* TZ-22 (dizaynda yo'q — egasi skrinshot bilan tasdiqlaydi): avtomatik konstruksiya */}
      <button onClick={openKonstruktor} data-konstruktor style={{ ...btnGhost, height: '48px', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Ikon n="konstruktor" size={18} gap={0} />{t('konstruktor.tugma')}
      </button>
      {/* TZ-24 A: o'z modulini chizish */}
      <button onClick={chizishOch} data-chizish-yangi="" style={{ ...btnGhost, height: '44px', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Ikon n="tahrir" size={17} gap={0} />{t('chizish.tugma')}
      </button>
      {/* TZ-23 C3: furnitura — loyihadagisi va ERP katalogi (faqat ko'rish) */}
      <button onClick={openFurnitura} data-furnitura style={{ ...btnGhost, height: '44px', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Ikon n="furnitura" size={17} gap={0} />{t('furnitura.tugma')}
      </button>
      {/* TZ-21: Bazis'dan yuklangan loyiha — hisobot (nima o'qildi, nima kesimga kirmadi) */}
      {v.bazis ? <button onClick={() => openSheet('bazis', {})} data-bazis-hisobot style={{ ...btnGhost, height: '44px', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Ikon n="bazis" size={17} gap={0} />{t('bazis.hisobot')}
      </button> : null}
      <input value={v.q} onChange={v.onQ} placeholder={t('mebel.shkaf_2_eshik')} style={{"width":"100%","borderRadius":"14px","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"16px","padding":"0 16px","outline":"none","height":"48px","background":"var(--sfc)","flex":"0 0 auto"}} />
      <div style={{"display":"flex","gap":"6px","overflowX":"auto","flex":"0 0 auto","paddingBottom":"2px"}}>
        {(v.cats || []).map((c, $index) => (<React.Fragment key={$index}>
          <button onClick={c?.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","flex":"0 0 auto","background":c?.bg,"color":c?.c,"whiteSpace":"nowrap"}}>
            <span className="sc-interp">{c?.label}</span>
          </button>
        </React.Fragment>))}
      </div>
      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
        {(v.mats || []).map((m, $index) => (<React.Fragment key={$index}>
          <button onClick={m?.cycle} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","fontSize":"14px","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc)","color":"var(--txt)","fontWeight":"600"}}>
            <span style={{"color":"var(--mut)"}}>
              <span className="sc-interp">{m?.k}</span>{":"}
            </span>
            <span style={{"fontWeight":"800"}}>
              <span className="sc-interp">{m?.v}</span>
            </span>
            <span style={{"color":"var(--mut)"}}>
              <Ikon n="ochiladi" size={8} gap={0} style={{ verticalAlign: "1px" }} />
            </span>
          </button>
        </React.Fragment>))}
      </div>
      {v.catEmpty ? (<>
        <div style={{"background":"var(--sfc)","border":"1px solid var(--line)","borderRadius":"20px","padding":"32px 16px","textAlign":"center","display":"flex","flexDirection":"column","gap":"6px"}}>
          <span style={{"fontWeight":"800"}}>
            {t('umumiy.topilmadi_boshqa_soz_bilan')}
          </span>
          <span style={{"color":"var(--mut)","fontSize":"14px"}}>
            {t('mebel.masalan_pastki_osma_tortma')}
          </span>
        </div>
      </>) : null}
      <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
        {(v.catalog || []).map((X, $index) => (<React.Fragment key={$index}>
          <button onClick={X?.add} style={{"display":"flex","gap":"12px","alignItems":"center","padding":"10px","borderRadius":"18px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","cursor":"pointer","textAlign":"left","transition":"border-color .2s,transform .2s"}} className="h5">
            <div style={{"position":"relative","width":"76px","height":"76px","flex":"0 0 auto","borderRadius":"14px","background":"radial-gradient(circle at 50% 70%,rgba(255,122,69,.18),transparent 70%),var(--bg)","perspective":"600px"}}>
              <div style={{"position":"absolute","inset":"0","transformStyle":"preserve-3d","transform":"rotateX(-22deg) rotateY(-38deg)"}}>
                <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.fh,"background":X?.t?.fbg,"transform":X?.t?.ft,"border":"1px solid rgba(0,0,0,.25)"}}></div>
                <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.sw,"height":X?.t?.fh,"background":"#D9D3C6","transform":X?.t?.st,"border":"1px solid rgba(0,0,0,.2)"}}></div>
                <div style={{"position":"absolute","left":"50%","top":"50%","width":X?.t?.fw,"height":X?.t?.sw,"background":"#F3F0E9","transform":X?.t?.tt,"border":"1px solid rgba(0,0,0,.15)"}}></div>
              </div>
            </div>
            <span style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
              <span style={{"fontWeight":"800","fontSize":"15px","lineHeight":"1.25"}}>
                <span className="sc-interp">{X?.name}</span>
              </span>
              <span style={{"fontSize":"13px","color":"var(--cyan)","fontWeight":"700","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{X?.dims}</span>
              </span>
              <span style={{"fontSize":"12px","color":"var(--mut)","fontVariantNumeric":"tabular-nums"}}>
                <span className="sc-interp">{X?.lim}</span>
              </span>
            </span>
            <span style={{"display":"flex","flexDirection":"column","alignItems":"flex-end","gap":"6px"}}>
              <span style={{"fontSize":"13px","fontWeight":"800","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}}>
                <span className="sc-interp">{X?.price}</span>
              </span>
              <span style={{"width":"32px","height":"32px","borderRadius":"10px","background":"var(--acc)","color":"var(--ink)","display":"grid","placeItems":"center","fontWeight":"800"}}>
                {"+"}
              </span>
            </span>
          </button>
        </React.Fragment>))}
      </div>
    </>
  );
}
