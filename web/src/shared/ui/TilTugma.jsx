import React from 'react';
import { t } from '../../i18n/index.js';
import { set } from '../../store/index.js';
import Ikon from './Ikon.jsx';

/* #219: til tugmasi — sarlavhasi yo'q ekranlarda (kirish, ro'yxat, yangi loyiha) yuqori qatorda; sarlavhadagi tugma bilan bir xil
 * uslub (44px, Ikon "til"). fixed — yuqori o'ng burchakda qotiriladi. Menyu — tugma ostida (ui.tilMenu). */
export default function TilTugma({ fixed = false }) {
  const och = (ev) => { const r = ev.currentTarget.getBoundingClientRect(); set('ui', { tilMenu: { top: Math.round(r.bottom + 8), right: Math.round(window.innerWidth - r.right) } }); };
  const st = { "width": "44px", "height": "44px", "borderRadius": "14px", "background": "var(--sfc)", "border": "1px solid var(--line)", "color": "var(--txt)", "cursor": "pointer", "display": "grid", "placeItems": "center", "flex": "0 0 auto" };
  if (fixed) Object.assign(st, { position: 'fixed', top: '12px', right: '12px', zIndex: '60' });
  return (
    <button onClick={och} aria-label={t('sarlavha.til')} aria-haspopup="menu" data-til-menyu="" style={st}>
      <Ikon n="til" size={19} gap={0} />
    </button>
  );
}
