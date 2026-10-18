import React, { useState, useEffect } from 'react';
import { set, useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { toast } from '../../../store/ui.js';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { chip } from '../../../shared/ui/styles.js';
import * as L from '../../../services/loyiha.js';
import * as D from '../../../services/devor.js';
import { setText, toggleMic, matnniQur } from '../ai/actions.js';
import { bazisYukla } from '../../bazis/bazis.js';
import { asbobTanla, uzunlikBuyruq, tugat, oxirgisiniOchir, bekor } from './devorAsbob.js';
import { tezOshxona, STANDART_XONA } from './ishjoyi.js';
import { openSheet } from '../../../store/ui.js';
import { loyihalarniYukla } from '../../projects/actions.js';
import { useDavom } from '../../projects/davom.js';
import { useRejim } from '../oddiy/rejim.js';

/* TZ-25 B (dizaynda yo'q — AI oynasi bo'laklari bilan: --sfc fon, 52px maydon, --acc asosiy tugma, chiplar).
 * Pastda doim ochiq matn qatori: "Nima chizamiz?" → Enter → loyiha quriladi (AI'siz tahlilchi va avtomatik konstruktor;
 * serverda AI kaliti bo'lsa — AI ham). Devor chizishda — Bazis'dagi buyruq qatori: devor uzunligi (mm) → Enter.
 * Loyiha bo'sh bo'lsa — "tez boshlash" chiplari ("Nima yasaymiz" so'rovnomasi o'rnida). */
const BTN = { width: '44px', height: '44px', flex: '0 0 44px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', display: 'grid', placeItems: 'center', cursor: 'pointer' };

function shaklQoy(tur) {
  const r = project.doc.room, eski = (r.openings || []).length;
  L.applyRoom(project.doc, { outline: D.tayyorShakl(tur, STANDART_XONA.w, STANDART_XONA.d) });   // egasi #152: 5 × 4 m
  r.openings = []; r.utilities = [];
  asbobTanla('tanlash');
  project.changed('room', true);
  toast(t('devor.shakl_qoyildi', { nom: t('devor.shakl_' + tur) }) + (eski ? ' · ' + t('devor.teshiklar_olindi') : ''));
}

/* egasi #245: tez boshlash — tayyor xona matni qatorga yoziladi va darhol quriladi (butun xona katalog modullaridan) */
function tezMatn(matn) { setText(matn); matnniQur(); }

export default function MatnQatori() {
  const ai = useSlice('ai'), ij = useSlice('ishjoyi');
  useSlice('project');
  const [buyruq, setBuyruq] = useState('');
  const devor = ij.asbob === 'devor', bosh = !project.doc.placements.length && !project.doc.bazis;
  const davom = useDavom(), oddiy = useRejim().oddiy;
  useEffect(() => { if (bosh) loyihalarniYukla(); }, [bosh]);      // TZ-27: chala ishlar soni (Davom ettirish)
  const yubor = (ev) => {
    ev.preventDefault();
    if (devor) {
      if (!buyruq.trim()) { tugat(); return; }
      if (uzunlikBuyruq(buyruq)) setBuyruq(''); else toast(t('devor.raqam_yozing'));
      return;
    }
    matnniQur();                                              // TZ-26: modul — AI konstruksiya, xona — loyiha
  };
  const chiplar = devor
    ? [[t('devor.yopish'), tugat, 'yopish'], [t('devor.oxirgisi'), oxirgisiniOchir, 'orqaga'], [t('devor.bekor'), bekor, 'bekor'],
      [t('devor.shakl_rect'), () => shaklQoy('rect'), 'rect'], [t('devor.shakl_L'), () => shaklQoy('L'), 'L'], [t('devor.shakl_P'), () => shaklQoy('P'), 'P']]
    : bosh ? (davom.soni ? [[t('davom.chip', { n: davom.soni }), () => openSheet('davom', {}), 'davom']] : []).concat([[t('tez.oshxona'), tezOshxona, 'kitchen'], [t('tez.yotoqxona'), () => tezMatn(t('tez.yotoqxona_matn')), 'yotoqxona'], [t('tez.mehmonxona'), () => tezMatn(t('tez.mehmonxona_matn')), 'mehmonxona'], [t('tez.garderob'), () => tezMatn(t('tez.garderob_matn')), 'garderob']].concat(oddiy ? [] : [[t('asbob.devor'), () => asbobTanla('devor'), 'devor']]).concat([
      [t('tayyor.tab_tayyor'), () => set('ai', { open: true, tab: 'tayyor' }), 'tayyor']])) : [];
  return (
    <div data-matn-qatori="" style={{ flex: '0 0 auto', borderTop: '1px solid var(--line)', background: 'rgba(15,34,41,.96)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {chiplar.length ? (
        <div data-tez="" style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {chiplar.map(([label, bos, id]) => <button key={id} onClick={bos} data-tez={id} style={{ ...chip(false), flex: '0 0 auto', whiteSpace: 'nowrap' }}>{label}</button>)}
          {!devor && bosh && !oddiy ? (
            <label data-tez="bazis" style={{ ...chip(false), flex: '0 0 auto', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
              {t('asbob.bazis')}<input type="file" accept=".b3d,.fr3d,.bpj" onChange={bazisYukla} style={{ display: 'none' }} />
            </label>) : null}
        </div>) : null}
      <form onSubmit={yubor} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!devor ? <button type="button" onClick={() => set('ai', { open: true, tab: 'tayyor' })} aria-label={t('tayyor.tab_tayyor')} title={t('tayyor.tab_tayyor')} data-matn-menyu="" style={BTN}><Ikon n="kutubxona" size={19} gap={0} /></button>
          : <span aria-hidden="true" style={{ ...BTN, border: '0', background: 'transparent', color: 'var(--acc)' }}><Ikon n="devor" size={19} gap={0} /></span>}
        <input value={devor ? buyruq : ai.text} onChange={ev => (devor ? setBuyruq(ev.target.value) : setText(ev.target.value))} data-matn=""
          inputMode={devor ? 'numeric' : 'text'} enterKeyHint={devor ? 'next' : 'go'} autoComplete="off"
          placeholder={devor ? (ij.nuqtalar.length ? t('devor.qator_davom') : t('devor.qator')) : t('ishjoyi.qator')}
          aria-label={devor ? t('devor.qator') : t('ishjoyi.qator')}
          style={{ flex: '1 1 auto', minWidth: '0', height: '48px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid ' + (devor ? 'var(--acc)' : 'var(--line)'), color: 'var(--txt)', fontSize: '16px', padding: '0 14px', outline: 'none' }} />
        {!devor ? <button type="button" onClick={toggleMic} aria-label={ai.mic ? t('ai.tinglanmoqda') : t('ai.ovoz')} title={t('ai.ovoz')} data-matn-mik=""
          style={{ ...BTN, background: ai.mic ? 'var(--danger)' : 'var(--sfc2)', color: ai.mic ? '#2A0A0A' : 'var(--txt)' }}><Ikon n="mikrofon" size={19} gap={0} /></button> : null}
        <button type="submit" aria-label={devor ? t('devor.qosh') : t('ai.qurish')} title={devor ? t('devor.qosh') : t('ai.qurish')} data-matn-yubor=""
          style={{ ...BTN, border: '0', background: 'var(--acc)', color: 'var(--ink)' }}><Ikon n="yuborish" size={19} gap={0} /></button>
      </form>
    </div>
  );
}
