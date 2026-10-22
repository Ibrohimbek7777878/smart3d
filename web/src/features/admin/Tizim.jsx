import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { raqam } from '../../shared/lib/format.js';
import { useTizim, hajm, ishlash } from './useTizim.js';
import AiSarf from './AiSarf.jsx';
import { karta, sarlavha, izoh, ghost, maydon, mono, belgi, belgiXato } from './stil.js';

/* TZ-37 (3-faza, bo'lim 8): Tizim holati — faqat ko'rish. AI kaliti: "bor / yo'q" (qiymati, uzunligi, boshi-oxiri hech qachon yo'q).
 * Model va kalit serverning muhit sozlamasida — panelda o'zgartirilmaydi. Hamma holat belgisi rang bilan birga MATN ham (rang ko'rmaydiganlar uchun). */
const Holat = ({ ok, k, children }) => (
  <b data-tz-holat={k} data-ok={ok ? '1' : '0'} style={{ ...(ok ? belgi(true) : belgiXato), display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
    <Ikon n={ok ? 'holatOk' : 'holatXato'} size={13} gap={0} />{children}
  </b>);
const Qator = ({ nom, children, k }) => (
  <div data-tz-qator={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '8px', fontSize: '14px', minWidth: '0' }}>
    <span style={{ color: 'var(--mut)', fontWeight: '700', fontSize: '13px' }}>{nom}</span>
    <span style={{ textAlign: 'right', overflowWrap: 'anywhere', minWidth: '0' }}>{children}</span>
  </div>);
const Karta = ({ k, nom, ikon, bosh, children }) => (
  <section style={karta} data-tz={k}>
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ ...sarlavha, display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Ikon n={ikon} size={18} gap={0} />{nom}</span>
      {bosh}
    </span>
    {children}
  </section>);

export default function Tizim() {
  const h = useTizim();
  const d = h.d;
  if (!d) return <section style={karta} data-admin-bolim="tizim"><span style={izoh}>{h.xato ? t('admin.tz_yuklanmadi') : t('admin.yuklanmoqda')}</span>{h.xato ? <button onClick={h.yukla} style={ghost} data-tz="qayta">{t('admin.tz_yangila')}</button> : null}</section>;
  const { ai, google, sms, telegram, xatolar, zaxira, server } = d;
  const xn = (g) => t('admin.tz_xato_n', { e: g.error, w: g.warn });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="tizim">
      <section style={karta}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={sarlavha}>{t('admin.tz_sarlavha')}</span>
          <button onClick={h.yukla} data-tz="yangila" style={ghost}><Ikon n="sinxron" size={15} />{t('admin.tz_yangila')}</button>
        </span>
        <span style={izoh}>{t('admin.tz_izoh')}</span>
        <Qator k="server" nom={t('admin.tz_server')}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ishlash(server.uptime)} · {server.muhit} · Node {server.node} · {t('admin.tz_baza')} {hajm(server.baza_hajm)}</span>
        </Qator>
      </section>

      <Karta k="ai" nom={t('admin.tz_ai')} ikon="ai" bosh={<Holat ok={ai.yoqilgan} k="ai">{ai.yoqilgan ? t('admin.tz_ai_yoqilgan') : t('admin.tz_ai_ochiq')}</Holat>}>
        {!ai.yoqilgan ? <span style={izoh} data-tz-sabab={ai.sabab}>{t('admin.tz_ai_sabab_' + ai.sabab)}</span> : null}
        <Qator k="provayder" nom={t('admin.tz_ai_provayder')}><b>{ai.provayder || '—'}</b></Qator>
        <Qator k="model" nom={t('admin.tz_ai_model')}><b style={mono}>{ai.model || '—'}</b></Qator>
        <Qator k="kalit" nom={t('admin.tz_ai_kalit')}>
          {ai.kalit.bor
            ? <><Holat ok k="kalit">{t('admin.tz_kalit_bor')}</Holat> <span style={{ ...izoh, ...mono }}>{t('admin.tz_kalit_manba', { nom: ai.kalit.manba })}</span></>
            : ai.kalit.kerak ? <Holat ok={false} k="kalit">{t('admin.tz_kalit_yoq')}</Holat> : <span style={izoh} data-tz-holat="kalit">{t('admin.tz_kalit_shart_emas')}</span>}
        </Qator>
        {ai.base_url_host ? <Qator k="host" nom={t('admin.tz_ai_host')}><span style={mono}>{ai.base_url_host}</span></Qator> : null}
        <Qator k="kesh" nom={t('admin.tz_ai_kesh')}>{t('admin.tz_kesh_' + ai.prompt_kesh)}</Qator>
        <Qator k="xato24" nom={t('admin.tz_ai_xato24')}><b style={ai.xato_24soat ? { color: 'var(--danger)' } : null}>{ai.xato_24soat}</b></Qator>
        {ai.oxirgi_xato ? (
          <Qator k="oxirgi-xato" nom={t('admin.tz_ai_oxirgi_xato')}>
            <span style={{ ...izoh, ...mono }}>{h.vaqtKor(ai.oxirgi_xato.vaqt)} · {ai.oxirgi_xato.sabab}</span>
          </Qator>) : null}
        <span style={izoh}>{t('admin.tz_ai_izoh')}</span>
      </Karta>
      <AiSarf />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '14px' }}>
        <Karta k="google" nom={t('admin.tz_google')} ikon="til" bosh={<Holat ok={google.sozlangan} k="google">{google.sozlangan ? t('admin.tz_sozlangan') : t('admin.tz_sozlanmagan')}</Holat>}>
          <Qator k="google-ulangan" nom={t('admin.tz_ulangan')}><b>{raqam(google.ulangan)}</b></Qator>
          <Qator k="google-xato" nom={t('admin.tz_xato7')}><b style={google.xato_7kun ? { color: 'var(--danger)' } : null}>{google.xato_7kun}</b></Qator>
        </Karta>
        <Karta k="sms" nom={t('admin.tz_sms')} ikon="yuborish" bosh={<Holat ok={sms.sozlangan} k="sms">{sms.sozlangan ? t('admin.tz_sozlangan') : t('admin.tz_sozlanmagan')}</Holat>}>
          <Qator k="sms-jonatuvchi" nom={t('admin.tz_sms_jonatuvchi')}><b style={mono}>{sms.jonatuvchi}</b></Qator>
          <Qator k="sms-xato" nom={t('admin.tz_xato7')}><b style={sms.xato_7kun ? { color: 'var(--danger)' } : null}>{sms.xato_7kun}</b></Qator>
        </Karta>
        <Karta k="telegram" nom={t('admin.tz_telegram')} ikon="bulut" bosh={<Holat ok={telegram.bot} k="telegram">{telegram.bot ? t('admin.tz_sozlangan') : t('admin.tz_sozlanmagan')}</Holat>}>
          <Qator k="tg-bot" nom={t('admin.tz_tg_bot')}>{telegram.bot ? t('admin.tz_kalit_bor') : t('admin.tz_kalit_yoq')}</Qator>
          <Qator k="tg-sir" nom={t('admin.tz_tg_sir')}>{telegram.webhook_sir ? t('admin.tz_kalit_bor') : t('admin.tz_kalit_yoq')}</Qator>
          <Qator k="tg-ulangan" nom={t('admin.tz_ulangan')}><b>{raqam(telegram.ulangan)}</b></Qator>
          <Qator k="tg-xato" nom={t('admin.tz_xato7')}><b style={telegram.xato_7kun ? { color: 'var(--danger)' } : null}>{telegram.xato_7kun}</b></Qator>
        </Karta>
      </div>

      <Karta k="xatolar" nom={t('admin.tz_xatolar')} ikon="ogohlantirish">
        <Qator k="xato-24" nom={t('admin.tz_xato_soat24')}><b>{xn(xatolar.soat24)}</b></Qator>
        <Qator k="xato-7" nom={t('admin.tz_xato_kun7')}><b>{xn(xatolar.kun7)}</b></Qator>
        <span style={{ ...izoh, marginTop: '4px' }}>{t('admin.tz_xato_top')}</span>
        {xatolar.top.length ? xatolar.top.map(x => (
          <div key={x.code + x.source} data-tz-top={x.code} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '13px', borderTop: '1px solid var(--line)', paddingTop: '6px' }}>
            <span style={{ minWidth: '0', overflowWrap: 'anywhere' }}><b style={mono}>{x.code}</b> <span style={{ color: 'var(--mut)' }}>{x.msg}</span></span>
            <span style={{ color: 'var(--mut)', whiteSpace: 'nowrap' }}>× {x.n} · {h.vaqtKor(x.oxirgi)}</span>
          </div>)) : <span style={izoh} data-tz-xato-yoq="">{t('admin.tz_xato_yoq')}</span>}
        <input data-tz="xato-qidir" value={h.q} onChange={(ev) => h.setQ(ev.target.value)} maxLength={24} placeholder={t('admin.tz_xato_qidir')} aria-label={t('admin.tz_xato_qidir')} style={{ ...maydon, marginTop: '6px' }} />
        <span style={izoh}>{t('admin.tz_xato_royxat')}</span>
        {h.royxat && !h.royxat.length ? <span style={izoh}>{t('admin.topilmadi')}</span> : null}
        {(h.royxat || []).slice(0, 15).map(x => (
          <div key={x.id} data-tz-jurnal={x.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', borderTop: '1px solid var(--line)', paddingTop: '6px', minWidth: '0' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span><b style={x.level === 'error' ? { ...mono, color: 'var(--danger)' } : mono}>{x.code}</b> <span style={{ ...mono, color: 'var(--mut)' }}>{x.rid}</span></span>
              <span style={{ color: 'var(--mut)' }}>{h.vaqtKor(x.ts)}{x.status ? ' · ' + x.status : ''}</span>
            </span>
            <span style={{ color: 'var(--mut)', overflowWrap: 'anywhere' }}>{x.method ? x.method + ' ' : ''}{x.path || ''} {x.msg || ''}</span>
          </div>))}
      </Karta>

      <Karta k="zaxira" nom={t('admin.tz_zaxira')} ikon="zaxira" bosh={<Holat ok={zaxira.holat === 'yaxshi'} k="zaxira">{t('admin.tz_zaxira_' + zaxira.holat)}</Holat>}>
        {zaxira.oxirgi
          ? <Qator k="zaxira-oxirgi" nom={t('admin.tz_zaxira_oxirgi')}><span style={{ fontVariantNumeric: 'tabular-nums' }}>{h.vaqtKor(zaxira.oxirgi.vaqt)} · {t('admin.tz_zaxira_yosh', { n: zaxira.oxirgi.yosh_soat })} · {hajm(zaxira.oxirgi.hajm)}</span></Qator>
          : <span style={izoh} data-tz-zaxira-yoq="">{zaxira.papka_bor ? t('admin.tz_zaxira_bosh') : t('admin.tz_zaxira_papka_yoq')}</span>}
        <Qator k="zaxira-soni" nom={t('admin.tz_zaxira_soni')}><b>{zaxira.soni}</b></Qator>
        <Qator k="zaxira-papka" nom={t('admin.tz_zaxira_papka')}><span style={mono}>{zaxira.papka}</span></Qator>
        {zaxira.royxat.map(x => (
          <div key={x.fayl} data-tz-nusxa={x.fayl} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--mut)' }}>
            <span style={mono}>{x.fayl}</span><span>{h.vaqtKor(x.vaqt)} · {hajm(x.hajm)}</span>
          </div>))}
        <span style={izoh}>{t('admin.tz_zaxira_izoh', { soat: zaxira.eskirish_soat })}</span>
      </Karta>
    </div>
  );
}
