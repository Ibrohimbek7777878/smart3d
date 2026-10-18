import React, { useEffect, useReducer } from 'react';
import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { scene } from '../scene/sahna.js';
import * as D from '../../../services/devor.js';
import * as A from './devorAsbob.js';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { iconBtn, hint } from '../../../shared/ui/styles.js';

/* TZ-25 D (dizaynda yo'q — dizayn tokenlari bilan: --acc chizish, --cyan eshik, --lav deraza, --sfc yorliq foni, --line chegara).
 * 2D kanva ustidagi qatlam: devorlar o'lcham zanjiri (doim; bosilsa — uzunlik maydoni), eshik va derazalar (sudrab
 * suriladi; bosilsa — eni va joyi kartasi), chizilayotgan devor (nuqtalar, kursorgacha chiziq va uzunligi),
 * suriladigan devorning yangi joyi. Kamera siljisa (sahna 'render' hodisasi) — qayta chiziladi. */
const YORLIQ = { position: 'absolute', transform: 'translate(-50%,-50%)', minHeight: '28px', padding: '0 8px', borderRadius: '9px',
  background: 'rgba(15,34,41,.92)', border: '1px solid var(--line)', color: 'var(--txt)', fontFamily: "'JetBrains Mono',monospace",
  fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const MAYDON = { width: '96px', height: '36px', borderRadius: '10px', background: 'var(--bg)', border: '2px solid var(--acc)', color: 'var(--txt)',
  fontFamily: "'JetBrains Mono',monospace", fontSize: '14px', fontWeight: '700', textAlign: 'center', outline: 'none', padding: '0 6px' };
const RANG = { door: 'var(--cyan)', window: 'var(--lav)' };

function TeshikKarta({ o, idx, tv, joy }) {
  const qator = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--mut)' };
  const inp = { ...MAYDON, border: '1px solid var(--line)', width: '90px' };
  const key = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); A.teshikQolla(); } };
  return (
    <div data-teshik-karta={idx} style={{ position: 'absolute', left: joy[0], top: joy[1], transform: 'translate(-50%,0)', zIndex: '5', pointerEvents: 'auto',
      width: '220px', background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '16px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: '800', display: 'flex', alignItems: 'center' }}><Ikon n={o.type === 'door' ? 'eshik' : 'deraza'} size={16} />{t(o.type === 'door' ? 'xona.eshik' : 'xona.deraza')}</span>
        <button onClick={() => A.teshikTanlov(null)} aria-label={t('umumiy.yopish')} style={{ ...iconBtn, width: '32px', height: '32px', borderRadius: '10px' }}><Ikon n="yopish" size={15} gap={0} /></button>
      </div>
      <label style={qator}>{t('xona.kenglik')}<input type="number" inputMode="numeric" value={tv.en ?? o.width} onChange={ev => A.teshikMaydon('en', ev.target.value)} onBlur={A.teshikQolla} onKeyDown={key} data-teshik-en="" style={inp} /></label>
      <label style={qator}>{t('xona.devor_boshidan')}<input type="number" inputMode="numeric" value={tv.joy ?? o.offset} onChange={ev => A.teshikMaydon('joy', ev.target.value)} onBlur={A.teshikQolla} onKeyDown={key} data-teshik-joy="" style={inp} /></label>
      <button onClick={A.teshikOchir} data-teshik-ochir="" style={{ height: '36px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--danger)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Ikon n="ochirish" size={15} />{t('umumiy.ochirish')}
      </button>
    </div>
  );
}

export default function ChizmaQatlam({ tel }) {
  const ed = useSlice('editor'), ij = useSlice('ishjoyi');
  useSlice('project');
  const [, kuch] = useReducer(x => x + 1, 0);
  useEffect(() => {
    if (!ed.sceneOn || !scene.sahna) return undefined;
    let tirik = true;
    const s = scene.sahna.sp;
    s.on('render', () => { if (tirik && s.mode === '2d') kuch(); });
    const off = A.obuna(kuch), ul = A.devorUla();
    return () => { tirik = false; off(); ul(); };
  }, [ed.sceneOn]);
  const S = scene.sahna;
  if (!ed.sceneOn || !S || S.sp.mode !== '2d' || ed.view !== '2d') return null;

  const room = project.doc.room, sd = A.jonli.sudrash, E = A.ekranga;
  const o = sd && sd.tur === 'devor' ? (D.devorniSur(sd.asl, sd.i, sd.m) || room.outline) : room.outline;
  const n = o.length, ishora = D.yuza(o) >= 0 ? 1 : -1, qal = (+room.wall_thickness || 100) / 2;
  const el = [], html = [];

  /* devorlar: o'lcham zanjiri (tashqarida), suriladigan devor — chiziq bilan */
  for (let i = 0; i < n; i++) {
    const a = o[i], b = o[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!(L > 0)) continue;
    const nx = ishora * (b[1] - a[1]) / L, ny = -ishora * (b[0] - a[0]) / L;            // tashqariga
    const pa = E(a), pb = E(b), pm = E([(a[0] + b[0]) / 2 + nx * qal, (a[1] + b[1]) / 2 + ny * qal]);
    if (sd && sd.tur === 'devor') el.push(<line key={'d' + i} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={i === sd.i ? 'var(--acc)' : 'rgba(255,122,69,.45)'} strokeWidth={i === sd.i ? 4 : 2} strokeDasharray={i === sd.i ? '' : '6 5'} />);
    if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < 44) continue;                        // juda kichik — yozuv sig'maydi
    const x = pm[0] + nx * 20, y = pm[1] - ny * 20;
    if (ij.tahrir && ij.tahrir.i === i) {
      html.push(<input key={'t' + i} autoFocus type="number" inputMode="numeric" value={ij.tahrir.val} data-devor-maydon={i}
        onChange={ev => A.tahrirYoz(ev.target.value)} onBlur={A.tahrirQolla}
        onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); A.tahrirQolla(); } else if (ev.key === 'Escape') { ev.preventDefault(); A.tahrirYop(); } }}
        style={{ ...MAYDON, position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', pointerEvents: 'auto', zIndex: '5' }} />);
    } else {
      html.push(<button key={'l' + i} onClick={() => A.tahrirOch(i)} data-devor-olcham={i} title={t('devor.uzunlik_tahrir')}
        style={{ ...YORLIQ, left: x, top: y, pointerEvents: 'auto', cursor: 'pointer', color: sd && sd.i === i ? 'var(--acc)' : 'var(--txt)' }}>{Math.round(L)}</button>);
    }
  }

  /* eshik va derazalar */
  (room.openings || []).forEach((x, k) => {
    const a = o[x.wall], b = o[(x.wall + 1) % n];
    if (!a || !b) return;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const off = sd && sd.tur === 'teshik' && sd.k === k ? sd.offset : x.offset;
    const p1 = E([a[0] + ux * off, a[1] + uy * off]), p2 = E([a[0] + ux * (off + x.width), a[1] + uy * (off + x.width)]);
    const tanlangan = ij.tanlov && ij.tanlov.idx === k, rang = RANG[x.type] || 'var(--cyan)';
    el.push(<line key={'o' + k} data-teshik={k} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={rang} strokeWidth={tanlangan ? 9 : 7} strokeLinecap="round" opacity={tanlangan ? 1 : 0.9} />);
    const nx = ishora * uy, ny = -ishora * ux, c = E([a[0] + ux * (off + x.width / 2) - nx * qal, a[1] + uy * (off + x.width / 2) - ny * qal]);
    const ic = [c[0] - nx * 18, c[1] + ny * 18];
    html.push(<span key={'ol' + k} style={{ ...YORLIQ, left: ic[0], top: ic[1], color: rang, pointerEvents: 'none' }}>{x.width}</span>);
    if (tanlangan) html.push(<TeshikKarta key={'ok' + k} o={x} idx={k} tv={ij.tanlov} joy={[ic[0], ic[1] + 22]} />);
  });

  /* chizilayotgan devor */
  if (ij.asbob === 'devor') {
    const pts = ij.nuqtalar, k = A.jonli.kursor;
    if (pts.length) {
      const sp = pts.map(E);
      el.push(<polyline key="ch" points={sp.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinejoin="round" />);
      sp.forEach((p, i) => el.push(<circle key={'n' + i} cx={p[0]} cy={p[1]} r={i === 0 ? (k && k.yopiq ? 10 : 7) : 5} fill={i === 0 ? 'var(--bg)' : 'var(--acc)'} stroke="var(--acc)" strokeWidth="3" />));
      for (let i = 1; i < pts.length; i++) {
        const L = Math.round(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])), m = [(sp[i][0] + sp[i - 1][0]) / 2, (sp[i][1] + sp[i - 1][1]) / 2];
        html.push(<span key={'cl' + i} style={{ ...YORLIQ, left: m[0], top: m[1] - 18, pointerEvents: 'none' }}>{L}</span>);
      }
      if (k) {
        const a = sp[sp.length - 1], b = E(k.p);
        el.push(<line key="kr" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--acc)" strokeWidth="2" strokeDasharray="8 6" />);
        el.push(<circle key="kp" cx={b[0]} cy={b[1]} r="5" fill="var(--acc)" />);
        html.push(<span key="kl" data-devor-kursor="" style={{ ...YORLIQ, left: (a[0] + b[0]) / 2, top: (a[1] + b[1]) / 2 - 20, border: '1px solid var(--acc)', color: 'var(--acc)', pointerEvents: 'none' }}>{k.len}{k.deg != null ? ' · ' + k.deg + '°' : ''}</span>);
      }
    } else if (k) {
      const b = E(k.p);
      el.push(<circle key="k0" cx={b[0]} cy={b[1]} r="7" fill="none" stroke="var(--acc)" strokeWidth="2" />);
      el.push(<line key="kx" x1={b[0] - 12} y1={b[1]} x2={b[0] + 12} y2={b[1]} stroke="var(--acc)" strokeWidth="2" />);
      el.push(<line key="ky" x1={b[0]} y1={b[1] - 12} x2={b[0]} y2={b[1] + 12} stroke="var(--acc)" strokeWidth="2" />);
    }
  }

  const izoh = ij.asbob === 'devor' ? (tel ? t('devor.izoh_tel') : t('devor.izoh')) : ij.asbob === 'teshik' ? t('devor.teshik_izoh') : null;
  return (
    <div data-chizma-qatlam="" style={{ position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '2', overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: '0', overflow: 'visible' }}>{el}</svg>
      {html}
      {izoh ? <div data-asbob-izoh="" style={{ position: 'absolute', left: '50%', top: '64px', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 24px)', textAlign: 'center',
        padding: '8px 14px', borderRadius: '999px', background: 'rgba(23,50,57,.92)', border: '1px solid var(--line)', ...hint, color: 'var(--txt)' }}>{izoh}</div> : null}
    </div>
  );
}
