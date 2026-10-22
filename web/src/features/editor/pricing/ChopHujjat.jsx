import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n/index.js';
import { useTarkibKorinish } from './useQadamNarx.js';

/* TZ-49 (2; egasi #303): A4 chop hujjati — loyiha nomi, sana, mijoz, to'liq ro'yxat BITTAMA-BITTA (har qator alohida: har plita, kromka turi, raspil,
 * prisadka turi, furnitura, Bazis, ish haqi, qo'shilgan xizmatlar; bo'limlarga ajratilgan), har qator: nom, miqdor × birlik narx = summa;
 * pastda tannarx, ustama (bo'lsa), JAMI va «Furniturasiz» jami. Ma'lumot — NarxTarkibKorinish bilan bir xil (useTarkibKorinish): yig'indi narx paneli jami bilan aynan teng.
 * Ekranda ko'rinmaydi (.chop-hujjat{display:none}); «PDF / Chop etish» (window.print) da @media print faqat shu hujjatni qoldiradi (app.css). Brauzer oynasida
 * printer yoki «PDF sifatida saqlash» tanlanadi. Rang — ataylab oq/qora (printerga qulay), tema tokenlari emas. */
export default function ChopHujjat() {
  const k = useTarkibKorinish();
  const nom = k ? k.meta.nom : '';
  /* PDF fayl nomi — hujjat sarlavhasidan: chop paytida document.title almashtiriladi, keyin qaytariladi */
  useEffect(() => {
    let eski = null;
    const oldin = () => { eski = document.title; document.title = 'Smart3D — ' + (nom || t('narx.ch_sarlavha')); };
    const keyin = () => { if (eski != null) { document.title = eski; eski = null; } };
    window.addEventListener('beforeprint', oldin); window.addEventListener('afterprint', keyin);
    return () => { window.removeEventListener('beforeprint', oldin); window.removeEventListener('afterprint', keyin); keyin(); };
  }, [nom]);
  if (!k || typeof document === 'undefined') return null;
  const bolimlar = k.bolimlar.filter(b => b.kod !== 'ustama');
  return createPortal(
    <div className="chop-hujjat" data-chop="" aria-hidden="true">
      <div className="chop-bosh">
        <span className="chop-brend"><b>Smart3D</b><small>by Bittada</small></span>
        <span className="chop-sana">{k.meta.sana}</span>
      </div>
      <h1 data-chop-loyiha="">{k.meta.nom}</h1>
      <div className="chop-meta">
        <span>{t('narx.ch_sarlavha')}</span>
        {k.meta.mijoz ? <span data-chop-mijoz="">{t('narx.mijoz')}: <b>{k.meta.mijoz}</b></span> : null}
        <span>{t('narx.tarkib_sana')}: {k.meta.sana}</span>
      </div>
      {bolimlar.map((b) => (
        <section key={b.kod} className="chop-bolim" data-chop-bolim={b.kod}>
          <table>
            <thead>
              <tr className="chop-bnom"><th colSpan={4}>{b.nom}</th></tr>
              <tr><th>{t('narx.ch_nom')}</th><th className="n">{t('narx.ch_miqdor')}</th><th className="n">{t('narx.ch_narx')}</th><th className="n">{t('narx.ch_summa')}</th></tr>
            </thead>
            <tbody>
              {b.qatorlar.map((r, i) => (
                <tr key={r.kod + ':' + i} data-chop-qator="">
                  <td>{r.nom}<small> · {r.manba}</small></td>
                  <td className="n">{r.miqdor}</td>
                  <td className="n">{r.narxsiz ? t('narx.ch_narxsiz') : r.narx}</td>
                  <td className="n" data-chop-summa={r.summaSon}>{r.summa}</td>
                </tr>))}
            </tbody>
            <tfoot><tr><td colSpan={3}>{b.nom} — {t('narx.ch_bolim_jami')}</td><td className="n" data-chop-bolim-jami="">{b.jami}</td></tr></tfoot>
          </table>
        </section>))}
      <section className="chop-jami">
        <table>
          <tbody>
            <tr><td>{t('narx.tarkib_tannarx')}</td><td className="n" data-chop-tannarx="">{k.tannarx}</td></tr>
            <tr><td>{k.ustama.bor ? t('narx.tarkib_ustama_jami', { n: String(k.ustama.foiz).replace('.', ',') }) : t('narx.tarkib_ustama_yoq')}</td><td className="n" data-chop-ustama="">{k.ustama.summa}</td></tr>
            <tr className="chop-umumiy"><td>{t('narx.tarkib_jami')}</td><td className="n" data-chop-jami="">{k.jami}</td></tr>
            <tr><td>{t('narx.tarkib_furnsiz')}</td><td className="n" data-chop-furnsiz="">{k.furnsiz}</td></tr>
          </tbody>
        </table>
        <p className="chop-izoh">{t('narx.ch_izoh')}</p>
      </section>
      <footer className="chop-oyoq">Smart3D by Bittada · {k.meta.nom} · {k.meta.sana}</footer>
    </div>,
    document.body
  );
}
