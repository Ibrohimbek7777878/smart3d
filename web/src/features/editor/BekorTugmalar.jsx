import React from 'react';
import Ikon from '../../shared/ui/Ikon.jsx';
import { t } from '../../i18n/index.js';
import { useBekor } from './bekor.js';

/* Bekor qilish / qaytarish tugmalari (dizaynda yo'q — 3D ustidagi 2D/3D guruhi uslubida: 4px ichki chegara, 14px burchak,
 * ichida 34px ikon tugmalar; balandligi sarlavha tugmalaridek 44px). Ikki joyda, bittasi ko'rinadi:
 *   joy="sarlavha" — kompyuterda, loyiha nomi va saqlash belgisi yonida (hujjat amali);
 *   joy="sahna"    — telefonda (sarlavha tor, nom maydoni siqilib qoladi), 3D ustidagi asboblar qatorining boshida. */
export default function BekorTugmalar({ joy }) {
  const v = useBekor(), sahna = joy === 'sahna';
  const tugma = (k, ik) => {
    const b = v[k];
    return (
      <button onClick={b.bos} disabled={!b.on} data-tarix-tugma={k} title={b.title} aria-label={b.title} style={{"width":"34px","height":"34px","borderRadius":"10px","border":"0","background":"transparent","color":b.on ? "var(--txt)" : "var(--mut)","opacity":b.on ? "1" : ".45","cursor":b.on ? "pointer" : "default","display":"grid","placeItems":"center","padding":"0"}}>
        <Ikon n={ik} size={18} gap={0} />
      </button>
    );
  };
  return (
    <div role="group" data-tarix={joy} {...(sahna ? { 'data-faqat-tel': '' } : { 'data-hide-m': '' })} aria-label={t('tarix.bekor') + ' / ' + t('tarix.qayta')}
      style={{"display":"flex","padding":"4px","gap":"2px","borderRadius":"14px","background":sahna ? "rgba(23,50,57,.9)" : "var(--sfc)","border":"1px solid var(--line)","flex":"0 0 auto","pointerEvents":"auto"}}>
      {tugma('bekor', 'bekorQil')}
      {tugma('qayta', 'qaytarish')}
    </div>
  );
}
