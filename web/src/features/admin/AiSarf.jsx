import React from 'react';
import { t } from '../../i18n/index.js';
import { useAiSarf } from './useAiSarf.js';
import { karta, sarlavha, izoh, ghost } from './stil.js';

/* TZ-40: "AI sarfi" kartasi — Claude qancha chaqirilgani va qancha tejalgani. Token — taxminiy (kirish + chiqish + kesh), narx emas. */
const son = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const Blok = ({ k, label, v, sub }) => (
  <div data-ai-sarf={k} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
    <span style={{ ...izoh, fontSize: '12px' }}>{label}</span>
    <b style={{ fontSize: '20px', overflowWrap: 'anywhere' }}>{v}</b>
    {sub ? <span style={{ ...izoh, fontSize: '12px' }}>{sub}</span> : null}
  </div>);

export default function AiSarf() {
  const { d, xato, yukla } = useAiSarf();
  const B = d && d.byudjet, bu = d && d.bugun, oy = d && d.oy_jami;
  return (
    <section style={karta} data-ai-sarf-karta="">
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={sarlavha}>{t('admin.ai_sarf')}</span>
        <button onClick={yukla} data-ai-sarf="yangila" style={ghost}>{t('admin.ai_sarf_yangila')}</button>
      </span>
      {!d ? <span style={izoh}>{xato ? t('admin.ai_sarf_yoq') : t('admin.yuklanmoqda')}</span> : (
        <>
          <span style={izoh}>{d.ai.yoqilgan ? t('admin.ai_sarf_model', { model: d.ai.model || '—' }) : t('admin.ai_sarf_ochiq')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '14px' }}>
            <Blok k="bugun-sorov" label={t('admin.ai_sarf_bugun')} v={son(bu.jami)} sub={t('admin.ai_sarf_manba', { t: bu.tayyor, k: bu.kesh, q: bu.qoida, c: bu.claude })} />
            <Blok k="oy-sorov" label={t('admin.ai_sarf_oy')} v={son(oy.jami)} sub={t('admin.ai_sarf_manba', { t: oy.tayyor, k: oy.kesh, q: oy.qoida, c: oy.claude })} />
            <Blok k="token" label={t('admin.ai_sarf_token')} v={son(oy.token)} sub={t('admin.ai_sarf_token_bugun', { n: son(bu.token) })} />
            <Blok k="ulush" label={t('admin.ai_sarf_ulush')} v={oy.tayyor_kesh_foiz + '%'} sub={t('admin.ai_sarf_tejaldi', { n: son(oy.tejaldi) })} />
            <Blok k="prompt-kesh" label={t('admin.ai_sarf_prompt_kesh')} v={oy.kesh_urildi_foiz + '%'} sub={t('admin.ai_sarf_kesh_yozuv', { n: d.kesh.yozuv, kun: d.kesh.kun })} />
            <Blok k="byudjet" label={t('admin.ai_sarf_byudjet')} v={son(B.qoldiq)} sub={t('admin.ai_sarf_byudjet_sub', { a: son(B.ishlatilgan), b: son(B.chegara) })} />
          </div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={B.foiz} aria-label={t('admin.ai_sarf_byudjet')}
            style={{ height: '8px', borderRadius: '999px', background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ width: B.foiz + '%', height: '100%', background: B.foiz >= 90 ? 'var(--danger)' : 'var(--cyan)' }} />
          </div>
          {B.qoldiq <= 0 ? <span data-ai-sarf="tugadi" style={{ ...izoh, color: 'var(--danger)', fontWeight: '700' }}>{t('admin.ai_sarf_tugadi')}</span> : null}
          <span style={izoh}>{t('admin.ai_sarf_kunlik', { n: d.kunlik_chegara })}</span>
        </>)}
    </section>
  );
}
