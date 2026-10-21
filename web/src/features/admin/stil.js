import { input, btnPrimary, btnGhost, card as kartaUslub, hint as hintUslub } from '../../shared/ui/styles.js';

/* admin sahifalari uslublari — Sozlamalar kartalari bilan bir xil (dizayn tokenlari, 48px tugma, 20px radius) */
export const karta = { ...kartaUslub, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '0' };
export const sarlavha = { fontWeight: '800', fontSize: '17px' };
export const izoh = { ...hintUslub, fontWeight: '500' };
export const tugma = { ...btnPrimary, height: '48px', padding: '0 20px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
export const ghost = { ...btnGhost, height: '44px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' };
export const xavfli = { ...ghost, color: 'var(--danger)' };
export const maydon = { ...input, height: '48px' };
export const lbl = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--mut)', minWidth: '0' };
export const mono = { fontFamily: "'JetBrains Mono',monospace", fontSize: '12px' };
export const belgi = (ok) => ({ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
  background: ok ? 'rgba(95,225,196,.14)' : 'rgba(255,181,154,.14)', color: ok ? 'var(--cyan)' : 'var(--acct)' });
export const chipU = (on) => ({ minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: on ? '0' : '1px solid var(--line)', background: on ? 'var(--acc)' : 'var(--sfc)', color: on ? 'var(--ink)' : 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' });
export const belgiXato = { ...belgi(false), background: 'rgba(255,123,123,.16)', color: 'var(--danger)' };   // TZ-37 (3-faza): xato / sozlanmagan holat
