import React from 'react';
import { t } from '../../i18n/index.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { raqam } from '../../shared/lib/format.js';
import { useMateriallar, narxSon } from './useMateriallar.js';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, lbl, mono, belgi, chipU } from './stil.js';

/* TZ-37 (2-faza, bo'lim 3): "Asosiy 100" dekorlar — rang, rasm, varaq narxi. Fayl qiymati ustiga baza; "Fayldagiga qaytarish" bor. */
const nuqta = (hex) => ({ width: '28px', height: '28px', borderRadius: '8px', background: hex, border: '1px solid var(--line)', flex: '0 0 auto' });

function Tahrir({ m }) {
  const e = m.dekor, x = m.x;
  if (!e) return null;
  return (
    <Varaq title={e.dekor} kind="admin-mat" onClose={() => m.setX(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', minHeight: '0' }}>
        <span style={izoh}>{[e.tur.join(' · '), e.qalinlik.join('/') + ' ' + t('umumiy.mm'), e.guruh].filter(Boolean).join(' · ')}</span>

        <section style={{ ...karta, background: 'var(--sfc2)' }} data-mat-blok="rang">
          <span style={sarlavha}>{t('admin.mat_rang')} <b style={belgi(e.rang_manba === 'baza')}>{e.rang_manba === 'baza' ? t('admin.manba_baza') : t('admin.manba_fayl')}</b></span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="color" data-mat-f="rang-tanla" value={/^#[0-9a-f]{6}$/i.test(x.rang) ? x.rang.toLowerCase() : '#000000'} onChange={(ev) => m.rangYoz(ev.target.value)}
              aria-label={t('admin.mat_rang')} style={{ width: '56px', height: '48px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--bg)', padding: '2px' }} />
            <input data-mat-f="rang" value={x.rang} onChange={(ev) => m.rangYoz(ev.target.value)} maxLength={7} spellCheck={false} style={{ ...maydon, ...mono, fontSize: '15px', width: '140px' }} />
            <button onClick={m.rangSaqla} disabled={m.band} data-mat-f="rang-saqla" style={tugma}>{t('umumiy.saqlash')}</button>
            {e.rang_manba === 'baza' ? <button onClick={m.rangQayt} data-mat-f="rang-qayt" style={xavfli}>{t('admin.fayldagiga_qaytar')}</button> : null}
          </div>
          <span style={izoh}>{t('admin.mat_rang_izoh', { hex: e.rang_fayl })}</span>
        </section>

        <section style={{ ...karta, background: 'var(--sfc2)' }} data-mat-blok="rasm">
          <span style={sarlavha}>{t('admin.mat_rasm')} <b style={belgi(!!e.rasm && e.rasm.manba === 'baza')}>{e.rasm ? (e.rasm.manba === 'baza' ? t('admin.manba_baza') : t('admin.manba_fayl')) : t('admin.mat_rasm_yoq')}</b></span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {e.rasm ? <img data-mat-f="rasm-korinish" src={e.rasm.url} alt={e.dekor} width="96" height="96" style={{ objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--line)' }} />
              : <span style={{ ...nuqta(e.rang), width: '96px', height: '96px', borderRadius: '12px' }} />}
            <label style={{ ...ghost, cursor: 'pointer' }}><Ikon n="yuklash" size={16} gap={0} />{t('admin.mat_rasm_yukla')}
              <input type="file" data-mat-f="rasm-fayl" accept="image/png,image/jpeg,image/webp" onChange={m.rasmYukla} style={{ display: 'none' }} />
            </label>
            {e.rasm && e.rasm.manba === 'baza' ? <button onClick={m.rasmOchir} data-mat-f="rasm-ochir" style={xavfli}>{t('admin.fayldagiga_qaytar')}</button> : null}
          </div>
          <span style={izoh}>{t('admin.mat_rasm_izoh')}</span>
        </section>

        <section style={{ ...karta, background: 'var(--sfc2)' }} data-mat-blok="narx">
          <span style={sarlavha}>{t('admin.mat_narx')} ({e.variantlar.length})</span>
          <span style={izoh}>{t('admin.mat_narx_izoh')}</span>
          {e.variantlar.map(v => {
            const n = narxSon(x.narx[v.kod]);
            return (
              <div key={v.kod} data-mat-variant={v.kod} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', overflowWrap: 'anywhere' }}>{v.nom || v.kod}</span>
                <span style={izoh}>{[v.tur, v.th ? v.th + ' ' + t('umumiy.mm') : '', v.sku].filter(Boolean).join(' · ')} · {t('admin.mat_narx_fayl')}: {v.narx_fayl ? raqam(v.narx_fayl) : t('admin.narx_yoq')} {t('sarlavha.som')}{v.narx_erp > 0 ? <b data-mat-narx-erp={v.kod}> · {t('admin.mat_narx_erp')}: {raqam(v.narx_erp)} {t('sarlavha.som')}</b> : null}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input data-mat-narx={v.kod} inputMode="numeric" value={x.narx[v.kod] ?? ''} onChange={(ev) => m.narxYoz(v.kod, ev.target.value)} style={{ ...maydon, width: '170px', fontVariantNumeric: 'tabular-nums' }} />
                  <span style={izoh}>{t('sarlavha.som')} / {t('admin.mat_varaq')}</span>
                  <button onClick={() => m.narxSaqla(v)} disabled={m.band || !(n >= 1) || n === v.narx} data-mat-narx-saqla={v.kod} style={tugma}>{t('umumiy.saqlash')}</button>
                  {v.narx_manba === 'baza' ? <button onClick={() => m.narxQayt(v)} data-mat-narx-qayt={v.kod} style={xavfli}>{t('admin.fayldagiga_qaytar')}</button> : null}
                </div>
              </div>);
          })}
        </section>
      </div>
    </Varaq>
  );
}

export default function Materiallar() {
  const m = useMateriallar();
  if (!m.d) return <section style={karta}><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="materiallar">
      <section style={karta}>
        <span style={sarlavha}>{t('admin.mat_sarlavha')} ({m.royxat.length}/{m.d.length})</span>
        <span style={izoh}>{t('admin.mat_izoh')}</span>
        <input data-mat="qidir" value={m.q} onChange={(ev) => m.setQ(ev.target.value)} placeholder={t('admin.mat_qidir_ph')} aria-label={t('admin.mat_qidir_ph')} style={maydon} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['', ...m.guruhlar].map(g => <button key={g || 'hammasi'} onClick={() => m.setGuruh(g)} aria-pressed={m.guruh === g} data-mat-guruh={g} style={chipU(m.guruh === g)}>{g ? t('mebel.rang_' + g) : t('admin.hammasi')}</button>)}
        </div>
        <div role="table">
          {m.royxat.map(e => {
            const narxlar = e.variantlar.map(v => v.narx).filter(n => n > 0), min = Math.min(...narxlar), max = Math.max(...narxlar);
            return (
              <div key={e.kalit} className="adm-mt" role="row" data-mat-qator={e.kalit}>
                {e.rasm ? <img src={e.rasm.url} alt="" width="40" height="40" loading="lazy" style={{ objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--line)' }} /> : <span style={{ ...nuqta(e.rang), width: '40px', height: '40px' }} />}
                <span style={{ minWidth: '0' }}>
                  <b style={{ fontSize: '15px', overflowWrap: 'anywhere' }}>{e.o}. {e.dekor}</b><br />
                  <span style={izoh}>{[e.tur.join(' · '), e.qalinlik.join('/') + ' ' + t('umumiy.mm')].join(' · ')}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={nuqta(e.rang)} /><span style={mono}>{e.rang}</span></span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>{narxlar.length ? (min === max ? raqam(min) : raqam(min) + '–' + raqam(max)) : t('admin.narx_yoq')}</span>
                <span>{e.tahrir ? <b style={belgi(true)}>{t('admin.manba_baza')}</b> : <b style={belgi(false)}>{t('admin.manba_fayl')}</b>}</span>
                <button onClick={() => m.ochish(e)} aria-label={t('admin.tahrirlash')} data-mat-tahrir={e.kalit} style={ghost}><Ikon n="tahrir" size={16} gap={0} /></button>
              </div>);
          })}
          {!m.royxat.length ? <span style={izoh}>{t('admin.topilmadi')}</span> : null}
        </div>
      </section>
      {m.x ? <Tahrir m={m} /> : null}
    </div>
  );
}
