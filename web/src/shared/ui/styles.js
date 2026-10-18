/* TZ-19: dizayndagi takrorlanuvchi uslublar — bitta manba (qiymatlar tasdiqlangan dizayndan, o'zgartirilmaydi).
 * Komponent ichida ustiga qo'shimcha yozilsa — dizayndagi kabi: { ...iconBtn, width: '36px' }. */
export const input = { width: '100%', height: '52px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '16px', padding: '0 16px', outline: 'none' };
export const label = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--mut)' };
export const btnPrimary = { height: '52px', borderRadius: '14px', border: '0', background: 'var(--acc)', color: 'var(--ink)', fontWeight: '800', fontSize: '16px', cursor: 'pointer' };
export const btnGhost = { height: '44px', padding: '0 14px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' };
export const iconBtn = { width: '44px', height: '44px', borderRadius: '14px', background: 'var(--sfc)', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '17px', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: '0 0 auto' };
export const chip = (on) => ({ minHeight: '36px', padding: '0 14px', borderRadius: '999px', border: on ? '0' : '1px solid var(--line)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', background: on ? 'var(--acc)' : 'var(--sfc2)', color: on ? 'var(--ink)' : 'var(--txt)' });
export const card = { background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '20px', padding: '16px' };
export const listRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '14px' };
export const delBtn = { width: '36px', height: '36px', flex: '0 0 36px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--danger)', fontSize: '15px', cursor: 'pointer' };
export const hint = { fontSize: '13px', color: 'var(--mut)', fontWeight: '700' };
