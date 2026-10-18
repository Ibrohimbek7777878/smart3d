import React from 'react';
import { t } from '../../i18n/index.js';
import { useStandart, QISMLAR } from './useStandart.js';
import { karta, sarlavha, izoh, tugma, ghost, maydon, lbl } from './stil.js';

/* TZ-37 (e): standart konstruksiya — matnda aytilmagan qiymatlar o'rniga AI va konstruksiya tahlilchisi shuni ishlatadi */
export default function Standart() {
  const s = useStandart();
  const f = s.f;
  if (!f) return <section style={karta}><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  const juft = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px' };
  return (
    <section style={karta} data-admin-bolim="standart">
      <span style={sarlavha}>{t('admin.std_sarlavha')}</span>
      <span style={izoh}>{t('admin.std_izoh')}</span>
      {QISMLAR.map(k => (
        <div key={k} style={juft} data-std={k}>
          <label style={lbl}>{t('admin.std_' + k)} — {t('admin.std_material')}
            <input data-f={k + '-nom'} value={f[k].nom} onChange={s.qism(k, 'nom')} style={maydon} />
          </label>
          <label style={lbl}>{t('admin.std_qalinlik')}
            <input data-f={k + '-q'} inputMode="decimal" value={f[k].qalinlik} onChange={s.qism(k, 'qalinlik')} style={maydon} />
          </label>
        </div>))}
      <div style={juft}>
        <label style={lbl}>{t('admin.std_ruchka_tur')}
          <input data-f="ruchka-tur" value={f.ruchka.tur} onChange={s.qism('ruchka', 'tur')} style={maydon} />
        </label>
        <label style={lbl}>{t('admin.std_ruchka_uzunlik')}
          <input data-f="ruchka-uz" inputMode="decimal" value={f.ruchka.uzunlik} onChange={s.qism('ruchka', 'uzunlik')} style={maydon} />
        </label>
      </div>
      <div style={juft}>
        <label style={lbl}>{t('admin.std_birikma')}
          <input data-f="birikma" list="adm-birikma" value={f.birikma} onChange={s.oddiy('birikma')} style={maydon} />
          <datalist id="adm-birikma"><option value="konfirmat" /><option value="ekssentrik" /><option value="shkant" /></datalist>
        </label>
        <label style={lbl}>{t('admin.std_tag')}
          <select data-f="tag" value={f.tag} onChange={s.oddiy('tag')} style={maydon}>
            <option value="oyoq">{t('admin.std_oyoq')}</option>
            <option value="sokol">{t('admin.std_sokol')}</option>
          </select>
        </label>
        <label style={lbl}>{t('admin.std_oyoq_balandlik')}
          <input data-f="oyoq-h" inputMode="decimal" value={f.oyoqBalandlik} onChange={s.oddiy('oyoqBalandlik')} style={maydon} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={s.saqla} disabled={s.band} data-f="saqla" style={tugma}>{t('umumiy.saqlash')}</button>
        <button onClick={s.sukut} data-std="sukut" style={{ ...ghost, height: '48px' }}>{t('admin.std_sukutga')}</button>
      </div>
    </section>
  );
}
