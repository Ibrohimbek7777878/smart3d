import React from 'react';

/* TZ-09 8-bosqich: dizaynda yo'q qismlar — pastdan chiqadigan varaq (dizayndagi AI oynasi qobig'i: fon, 28px radius,
 * tutqich, × tugma) ichida dizayn bo'laklari: chip, 52px input, asosiy tugma. Egasi skrinshot bilan tasdiqlaydi (3.3).
 *   teshik   — deraza / eshik / quvur / rozetka qo'shish va o'chirish (dizayndagi "+ Qo'shish")
 *   shakl    — erkin xona: burchak nuqtalari (dizayndagi "✎ Erkin")
 *   material — korpus/fasad materiali va ERP plitasi (1281) — dizayndagi chipdagi ▾
 *   oshxona  — dobor/karniz balandligi, moyka o'lchami va joyi
 * Barcha qiymatlar `v.sheet` dan (App.renderVals). */
const input = { width: '100%', height: '52px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '16px', padding: '0 16px', outline: 'none' };
const lbl = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--mut)' };
const btn = { height: '52px', borderRadius: '14px', border: '0', background: 'var(--acc)', color: 'var(--ink)', fontWeight: '800', fontSize: '16px', cursor: 'pointer' };
const ghost = { height: '44px', padding: '0 14px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' };
const chip = (on) => ({ minHeight: '36px', padding: '0 14px', borderRadius: '999px', border: on ? '0' : '1px solid var(--line)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', background: on ? 'var(--acc)' : 'var(--sfc2)', color: on ? 'var(--ink)' : 'var(--txt)' });
const rowS = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '14px' };
const x = { width: '36px', height: '36px', flex: '0 0 36px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--danger)', fontSize: '15px', cursor: 'pointer' };

function Chips({ list }) {
  return <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{list.map((c, i) => <button key={i} onClick={c.pick} style={chip(c.on)}>{c.label}</button>)}</div>;
}
function Num({ f }) {
  return <label style={lbl}>{f.label}<input type="number" inputMode="decimal" value={f.val} onChange={f.on} style={input} /></label>;
}

function Teshik({ s }) {
  return (<>
    <Chips list={s.turlar} />
    <span style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: '700' }}>Devor</span>
    <Chips list={s.devorlar} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>{s.maydonlar.map((f, i) => <Num key={i} f={f} />)}</div>
    <button onClick={s.qosh} style={btn}>+ Qo'shish</button>
    {s.royxat.length ? <div>{s.royxat.map((r, i) => (
      <div key={i} style={rowS}><span><b>{r.t}</b> <span style={{ color: 'var(--mut)' }}>{r.d}</span></span><button aria-label={'O\'chirish: ' + r.t} onClick={r.del} style={x}>✕</button></div>))}</div> : null}
  </>);
}
function Shakl({ s }) {
  return (<>
    <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Xona burchaklari, mm — soat strelkasiga qarshi yoki bo'yicha, ketma-ket. Kamida 3 nuqta.</span>
    <div style={{ maxHeight: '38vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {s.nuqtalar.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 36px', gap: '8px', alignItems: 'center' }}>
          <b style={{ textAlign: 'center' }}>{i + 1}</b>
          <input type="number" inputMode="numeric" aria-label={'X ' + (i + 1)} value={p.x} onChange={p.onX} style={{ ...input, height: '44px' }} />
          <input type="number" inputMode="numeric" aria-label={'Y ' + (i + 1)} value={p.y} onChange={p.onY} style={{ ...input, height: '44px' }} />
          <button aria-label={'Nuqtani o\'chirish ' + (i + 1)} onClick={p.del} disabled={!p.canDel} style={{ ...x, opacity: p.canDel ? 1 : 0.35 }}>✕</button>
        </div>))}
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={s.qoshNuqta} style={ghost}>+ Nuqta</button>
      <button onClick={s.lShakl} style={ghost}>◩ L-shakl</button>
      <button onClick={s.qolla} style={{ ...btn, flex: '1' }}>Qo'llash</button>
    </div>
  </>);
}
function Material({ s }) {
  return (<>
    <span style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: '700' }}>Material turi</span>
    <Chips list={s.turlar} />
    <span style={{ fontSize: '13px', color: 'var(--mut)', fontWeight: '700' }}>ERP plitasi — haqiqiy narx va varaq o'lchami</span>
    <input value={s.q} onChange={s.onQ} placeholder="Qidiruv: nom yoki SKU (masalan Egger, W1000)" style={input} />
    <div style={{ maxHeight: '36vh', overflow: 'auto' }}>
      <button onClick={s.demo} style={{ ...rowS, width: '100%', background: 'none', border: '0', borderTop: '1px solid var(--line)', color: s.demoOn ? 'var(--acct)' : 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}>
        <span>— Bazaviy narx (materials.json)</span><span>{s.demoOn ? '✓' : ''}</span></button>
      {s.plitalar.map((p, i) => (
        <button key={i} onClick={p.pick} style={{ ...rowS, width: '100%', background: p.on ? 'rgba(255,122,69,.12)' : 'none', border: '0', borderTop: '1px solid var(--line)', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: '700' }}>{p.name}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.sub}</span></span>
          <span style={{ fontWeight: '800', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
        </button>))}
      {!s.plitalar.length ? <div style={{ ...rowS, color: 'var(--mut)' }}>Topilmadi</div> : null}
    </div>
  </>);
}
function Oshxona({ s }) {
  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>{s.maydonlar.map((f, i) => <Num key={i} f={f} />)}</div>
    <button onClick={s.saqla} style={btn}>Saqlash</button>
  </>);
}

export default function Varaqlar({ v }) {
  const s = v.sheet;
  if (!s || !s.on) return null;
  return (
    <>
      <div onClick={s.close} style={{ position: 'fixed', inset: '0', zIndex: '60', background: 'rgba(4,12,15,.55)' }}></div>
      <div role="dialog" aria-label={s.title} data-varaq={s.kind} style={{ position: 'fixed', left: '50%', bottom: '0', zIndex: '61', transform: 'translateX(-50%)', width: 'min(640px,100%)', maxHeight: '92vh', overflow: 'auto', background: 'var(--sfc)', border: '1px solid var(--line)', borderBottom: '0', borderRadius: '28px 28px 0 0', padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 -20px 60px rgba(0,0,0,.4)' }}>
        <span style={{ alignSelf: 'center', width: '44px', height: '5px', borderRadius: '9px', background: 'var(--sfc3)' }}></span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: '800' }}>{s.title}</span>
          <button onClick={s.close} aria-label="Yopish" style={{ width: '44px', height: '44px', borderRadius: '14px', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '17px', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: '0 0 auto', background: 'var(--sfc2)' }}>×</button>
        </div>
        {s.kind === 'teshik' ? <Teshik s={s} /> : s.kind === 'shakl' ? <Shakl s={s} /> : s.kind === 'material' ? <Material s={s} /> : s.kind === 'oshxona' ? <Oshxona s={s} /> : null}
      </div>
    </>
  );
}
