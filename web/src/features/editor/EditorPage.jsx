import React from 'react';
import { useSlice } from '../../store/index.js';
import { t } from '../../i18n/index.js';
import Sahna from './scene/Sahna.jsx';
import QadamXona from './room/QadamXona.jsx';
import QadamMebel from './catalog/QadamMebel.jsx';
import QadamNarx from './pricing/QadamNarx.jsx';
import QadamFayllar from './files/QadamFayllar.jsx';
import XatoChegarasi from '../../shared/ui/XatoChegarasi.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { iconBtn } from '../../shared/ui/styles.js';
import ChizishPanel from './chizish/ChizishPanel.jsx';
import Asboblar from './ishjoyi/Asboblar.jsx';
import MatnQatori from './ishjoyi/MatnQatori.jsx';
import { panelYop, faylTashlandi, faylUstida } from './ishjoyi/ishjoyi.js';

/* TZ-25 A: bosh ish joyi — bitta ekran (Bazis kabi): chapda asboblar, o'rtada kanva, pastda matn qatori, o'ngda panel
 * faqat kerak bo'lganda (Xona, Mebel, Narx, Fayllar, modul chizish). Telefonda: kanva, asboblar qatori, matn qatori;
 * panel — pastdan chiqadigan varaq (app.css). Bazis fayli ish joyiga sudrab tashlansa — ochiladi. */
const STEP = { 1: [QadamXona, 'editor/room'], 2: [QadamMebel, 'editor/catalog'], 3: [QadamNarx, 'editor/pricing'], 4: [QadamFayllar, 'editor/files'] };

export default function EditorPage() {
  const { step } = useSlice('editor'), chz = useSlice('chizish');
  const [Qadam, qm] = STEP[step] || [];
  const ochiq = chz.ochiq || !!Qadam;
  return (
    <div data-ed="" data-ishjoyi="" onDragOver={faylUstida} onDrop={faylTashlandi}
      style={{ flex: '1 1 auto', height: 'calc(100vh - 64px)', display: 'grid', gridTemplateColumns: ochiq ? '84px minmax(0,1fr) 400px' : '84px minmax(0,1fr)' }}>
      <XatoChegarasi modul="editor/asboblar"><Asboblar /></XatoChegarasi>
      <div data-markaz="" style={{ minWidth: '0', minHeight: '0', display: 'flex', flexDirection: 'column' }}>
        <div data-kanva="" style={{ flex: '1 1 auto', minHeight: '0', position: 'relative', display: 'grid' }}>
          <XatoChegarasi modul="editor/scene"><Sahna /></XatoChegarasi>
        </div>
        <XatoChegarasi modul="editor/matn"><MatnQatori /></XatoChegarasi>
      </div>
      {ochiq ? (
        <aside data-panel="" style={{ position: 'relative', height: '100%', overflow: 'auto', borderLeft: '1px solid var(--line)', background: 'var(--bg)', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 -8px -14px 0' }}>
            <button onClick={panelYop} data-panel-yop="" aria-label={t('umumiy.yopish')} title={t('umumiy.yopish')} style={{ ...iconBtn, width: '36px', height: '36px', borderRadius: '12px' }}>
              <Ikon n="yopish" size={17} gap={0} />
            </button>
          </div>
          {chz.ochiq ? <XatoChegarasi modul="editor/chizish"><ChizishPanel /></XatoChegarasi>   /* TZ-24 A: modul chizish */
            : <XatoChegarasi key={qm} modul={qm}><Qadam /></XatoChegarasi>}
        </aside>) : null}
    </div>
  );
}
