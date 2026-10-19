import React from 'react';
import { t } from '../../i18n/index.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { usePromptlar } from './usePromptlar.js';
import AiSarf from './AiSarf.jsx';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, lbl, belgi } from './stil.js';

/* TZ-37 (d): tayyor so'rovlar — xona turi (guruh) bo'yicha; qo'shish, tahrir, o'chirish, faol, tartib, uz/ru/en matnlar */
const TILLAR = ['uz', 'ru', 'en'];

function Forma({ p }) {
  const x = p.x, ta = { ...maydon, height: 'auto', padding: '12px 16px', resize: 'vertical', fontFamily: 'inherit' };
  return (
    <Varaq title={x.id ? t('admin.prompt_tahrir') : t('admin.prompt_qosh')} kind="admin-prompt" onClose={() => p.setX(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', minHeight: '0' }}>
        <label style={lbl}>{t('admin.prompt_guruh')}
          <input data-f="kat" list="adm-kat" value={x.kat} onChange={p.on('kat')} placeholder={t('admin.prompt_guruh_ph')} style={maydon} />
          <datalist id="adm-kat">{p.turlar.map(k => <option key={k} value={k} />)}</datalist>
        </label>
        {TILLAR.map(l => (
          <React.Fragment key={l}>
            <label style={lbl}>{t('admin.prompt_nom')} ({l})
              <input data-f={'nom_' + l} value={x['nom_' + l] || ''} onChange={p.on('nom_' + l)} style={maydon} />
            </label>
            <label style={lbl}>{t('admin.prompt_matn')} ({l})
              <textarea data-f={'matn_' + l} rows={3} value={x['matn_' + l] || ''} onChange={p.on('matn_' + l)} style={ta} />
            </label>
          </React.Fragment>))}
        <button onClick={p.saqla} disabled={p.band} data-f="saqla" style={tugma}>{t('umumiy.saqlash')}</button>
      </div>
    </Varaq>
  );
}

export default function Promptlar() {
  const p = usePromptlar();
  if (!p.r) return <section style={karta}><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="promptlar">
      <AiSarf />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={izoh}>{t('admin.prompt_izoh', { n: p.r.length })}</span>
        <button onClick={p.yangi} data-prompt="qosh" style={tugma}><Ikon n="qosh" size={18} />{t('admin.prompt_qosh')}</button>
      </div>
      {p.guruhlar.map(g => (
        <section key={g.kat} style={karta} data-prompt-guruh={g.kat}>
          <span style={sarlavha}>{g.kat} <span style={{ ...izoh, fontWeight: '700' }}>({g.list.length})</span></span>
          {g.list.map((q, i) => (
            <div key={q.id} data-prompt-qator={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--line)', opacity: q.faol ? 1 : 0.6 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <b style={{ fontSize: '15px', minWidth: '0', overflowWrap: 'anywhere' }}>{q.nom_uz}</b>
                <span style={belgi(!!q.faol)}>{q.faol ? t('admin.faol') : t('admin.nofaol')}</span>
              </span>
              <span style={{ ...izoh, overflowWrap: 'anywhere' }}>{q.matn_uz}</span>
              {q.manba === 'baza' ? (
                <span data-prompt-spec={q.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={belgi(!!q.spec && (q.spec_manba === 'qoida' || !!q.spec_tasdiq))}>
                    {!q.spec ? t('admin.spec_yoq') : q.spec_manba === 'claude' ? (q.spec_tasdiq ? t('admin.spec_claude_ok') : t('admin.spec_claude_kut')) : t('admin.spec_qoida')}
                  </span>
                  {q.spec && q.spec_manba === 'claude' && !q.spec_tasdiq ? <button onClick={() => p.tasdiq(q)} data-prompt-tasdiq={q.id} style={ghost}>{t('admin.spec_tasdiqla')}</button> : null}
                  {q.spec ? <button onClick={() => p.specKor(q)} data-prompt-spec-kor={q.id} style={ghost}>{t('admin.spec_kor')}</button> : null}
                </span>) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <button onClick={() => p.surish(g, i, -1)} disabled={i === 0} aria-label={t('admin.yuqoriga')} data-prompt-yuqori={q.id} style={ghost}><Ikon n="tepa" size={16} gap={0} /></button>
                <button onClick={() => p.surish(g, i, 1)} disabled={i === g.list.length - 1} aria-label={t('admin.pastga')} data-prompt-past={q.id} style={ghost}><Ikon n="past" size={16} gap={0} /></button>
                <button onClick={() => p.faol(q)} aria-pressed={!!q.faol} data-prompt-faol={q.id} style={ghost}>{q.faol ? t('admin.nofaol_qil') : t('admin.faol_qil')}</button>
                <button onClick={() => p.setX({ ...q })} aria-label={t('admin.tahrirlash')} data-prompt-tahrir={q.id} style={ghost}><Ikon n="tahrir" size={16} gap={0} /></button>
                <a href={'/loyiha/yangi'} target="_blank" rel="noopener" data-prompt-sina={q.id} style={{ ...ghost, textDecoration: 'none' }}>{t('admin.ilovada_sinash')}<Ikon n="havola" size={14} gap={0} /></a>
                <button onClick={() => p.ochir(q)} aria-label={t('umumiy.ochirish')} data-prompt-ochir={q.id} style={xavfli}><Ikon n="ochirish" size={16} gap={0} /></button>
              </div>
            </div>))}
        </section>))}
      {p.x ? <Forma p={p} /> : null}
      {p.spec ? (
        <Varaq title={t('admin.spec_sarlavha', { id: p.spec.id })} kind="admin-prompt-spec" onClose={() => p.setSpec(null)}>
          <pre data-prompt-spec-json="" style={{ margin: '0', overflow: 'auto', minHeight: '0', fontSize: '12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(p.spec.spec, null, 1)}</pre>
        </Varaq>) : null}
    </div>
  );
}
