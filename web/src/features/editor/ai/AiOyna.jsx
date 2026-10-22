import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useSlice } from '../../../store/index.js';
import Varaq from '../../../shared/ui/Varaq.jsx';
import { aiView, closeAi, matnniQur } from './actions.js';
import { useTayyor } from './promptlar.js';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, listRow, hint, btnGhost, btnPrimary } from '../../../shared/ui/styles.js';

/* TZ-19: AI oynasi — dizayndagi pastki varaq (JSX va stillar dizayndan).
 * TZ-24 B (dizaynda yo'q — dizayn bo'laklari: chip, karta qatori, 52px input, asosiy tugma): "Tayyor so'rovlar" (kutubxona,
 * AI'siz) va "Shablonlarim" (shaxsiy). "Matn" yorlig'i — avvalgi oyna o'zgarishsiz. */
function Tayyor({ s }) {
  return (<>
    <div data-tayyor-kat=""><Chiplar list={s.kategoriyalar} /></div>
    <div data-tayyor-royxat="" style={{ display: 'flex', flexDirection: 'column' }}>
      {s.promptlar.map(p => (
        <button key={p.id} onClick={p.pick} data-prompt={p.id} style={{ ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', background: p.on ? 'rgba(255,122,69,.12)' : 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}><span style={{ fontWeight: '800' }}>{p.nom}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.izoh}</span></span>
          <Ikon n={p.on ? 'tayyor' : 'ong'} size={16} gap={0} />
        </button>))}
    </div>
    {s.forma ? (
      <div data-tayyor-forma="" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {s.forma.maydonlar.map(m => (
            <label key={m.k} style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--mut)' }}>{m.label}
              <input type="number" inputMode="numeric" value={m.val} onChange={m.on} data-maydon={m.k} style={input} />
            </label>))}
        </div>
        <button onClick={s.forma.qur} data-tayyor-qur="" style={btnPrimary}><Ikon n="qurish" size={18} />{t('tayyor.chizish')}</button>
        <span style={hint}>{t('tayyor.aisiz')}</span>
      </div>) : <span style={hint}>{t('tayyor.tanlang')}</span>}
  </>);
}

function Shablonlar({ s }) {
  const amal = { ...btnGhost, height: '44px', flex: '1 1 180px', fontSize: '14px' };
  return (<>
    <input value={s.shNom} onChange={s.onShNom} placeholder={t('tayyor.shablon_nomi')} maxLength={80} data-shablon-nom="" style={input} />
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button onClick={s.promptSaqla} data-shablon-prompt="" style={amal}>{t('tayyor.saqla_prompt')}</button>
      <button onClick={s.loyihaSaqla} data-shablon-loyiha="" style={amal}>{t('tayyor.saqla_loyiha')}</button>
    </div>
    <div data-shablon-royxat="" style={{ display: 'flex', flexDirection: 'column', maxHeight: '40vh', overflow: 'auto' }}>
      {s.shablonlar.map((sh, i) => (
        <div key={i} style={{ ...listRow }}>
          <button onClick={sh.och} style={{ flex: '1', minWidth: '0', border: '0', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sh.nom}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{sh.tur}</span>
          </button>
          <button onClick={sh.ochir} aria-label={t('sahna.ochirish')} style={{ width: '36px', height: '36px', flex: '0 0 36px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--danger)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <Ikon n="ochirish" size={16} gap={0} />
          </button>
        </div>))}
      {s.shYuklandi && !s.shablonlar.length ? <span style={hint}>{t('tayyor.shablon_yoq')}</span> : null}
    </div>
  </>);
}
export default function AiOyna() {
  const ai = useSlice('ai'), s = useTayyor();       // hook'lar — har doim (shartli qaytishdan oldin)
  if (!ai.open) return null;
  const v = aiView(ai);
  return (
    <Varaq title={<><Ikon n="ai" size={20} style={{ color: "var(--cyan)" }} />{t('ai.aiga_aytib_bering')}</>} label={t('ai.aiga_aytib_bering')} kind="ai" onClose={closeAi}>
      <div data-ai-tab=""><Chiplar list={s.tablar} /></div>
      {s.tab === 'tayyor' ? <Tayyor s={s} /> : s.tab === 'shablon' ? <Shablonlar s={s} /> : (<>
      <textarea value={v.aiText} onChange={v.onAiText} rows="4" placeholder={t('umumiy.oshxona_3_6x3_m_balandlik_2_7')} style={{"width":"100%","borderRadius":"16px","background":"var(--bg)","border":"1px solid var(--line)","color":"var(--txt)","fontSize":"17px","padding":"16px","resize":"none","outline":"none"}}></textarea>
      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
        {v.aiEx.map((x, i) => (
          <button key={i} onClick={x.pick} style={{"minHeight":"36px","padding":"0 14px","borderRadius":"999px","border":"1px solid var(--line)","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px","background":"var(--sfc2)","color":"var(--txt)","fontWeight":"600","fontSize":"13px","textAlign":"left"}}>
            <span className="sc-interp">{x.t}</span>
          </button>))}
      </div>
      <div style={{"display":"flex","gap":"8px"}}>
        <button onClick={v.toggleMic} style={{"height":"52px","padding":"0 18px","borderRadius":"14px","border":"1px solid var(--line)","background":v.micBg,"color":v.micT,"fontWeight":"800","fontSize":"15px","cursor":"pointer"}}>
          <Ikon n="mikrofon" /><span className="sc-interp">{v.micLabel}</span>
        </button>
        <button onClick={matnniQur} style={{"flex":"1","height":"52px","borderRadius":"14px","border":"0","background":"var(--acc)","color":"var(--ink)","fontWeight":"800","fontSize":"16px","cursor":"pointer"}}>
          <Ikon n="qurish" size={18} />{t('ai.qurish')}
        </button>
      </div>
      </>)}
    </Varaq>
  );
}
