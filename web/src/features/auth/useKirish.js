import { useCallback, useEffect, useState } from 'react';
import { useSlice } from '../../store/index.js';
import { telGuruh } from '../../shared/lib/format.js';
import { useViewer } from '../../shared/design3d/useViewer.js';
import { s3Viewer, s3Mats, s3Build, s3Apply, s3Spec } from '../../shared/design3d/engine.js';
import { setField, submitAuth, swapAuth, loadUsullar, usulAlmash, smsYubor, smsKirish, googleTugma } from './actions.js';
import { t } from '../../i18n/index.js';

/* ro'yxat oynasidagi aylanuvchi shkaf — dizayn animatsiyasi (marketing namunasi, o'zgarishsiz) */
function regViewer(T, h, o) {
  const v = s3Viewer(T, h, o);
  v.pC = new T.Plane(new T.Vector3(0, -1, 0), 0); v.pP = new T.Plane(new T.Vector3(0, 1, 0), 0); v.M = s3Mats(T, [v.pC], [v.pP]);
  const m = s3Build(T, v, s3Spec('kp', 600), false); v.dist = 2.6; v.phi = .28;
  const a = { color: 1, explode: 0, hw: 1, count: 1 };
  v.onTick = (dt, t) => { a.explode = (Math.sin(t * .7 - 1.5) * .5 + .5) * .75; s3Apply(v, m, a); for (const Lb of v.labels) Lb.op = 0; };
  return v;
}

/* #209: SMS usuli yashirin (kodi qoladi) — yoqish uchun true */
const SMS_KORINADI = false;
const STRENGTH_C = ['var(--sfc3)', 'var(--danger)', 'var(--acc)', 'var(--cyan)', 'var(--cyan)'];

/** Kirish / Ro'yxat ekrani qiymatlari */
export function useKirish() {
  const nav = useSlice('nav'), auth = useSlice('auth');
  const reg = nav.screen === 'reg', f = auth.f, e = f.err;
  const [regHost, regOv] = useViewer(true, regViewer, []);
  const sc = f.pass.length ? [f.pass.length >= 8, /\d/.test(f.pass), /[A-ZА-Я]/.test(f.pass), /[^\w]/.test(f.pass)].filter(Boolean).length : 0;
  const bd = k => e[k] ? 'var(--danger)' : 'var(--line)';
  const pd = nav.pending;
  /* TZ-23 C4: telefon + SMS (faqat kirishda va server SMS ishlaganda); qayta yuborish — 60 soniyadan keyin */
  useEffect(() => { loadUsullar(); }, []);
  const [hozir, setHozir] = useState(Date.now());
  const qoldi = Math.max(0, Math.ceil((f.qayta - hozir) / 1000));
  useEffect(() => { if (!qoldi) return undefined; const id = setTimeout(() => setHozir(Date.now()), 1000); return () => clearTimeout(id); }, [qoldi, hozir]);
  const smsUsul = SMS_KORINADI && !reg && auth.smsBor && f.usul === 'sms';
  const gId = auth.googleId, googleBor = !!gId && !smsUsul;
  const gRef = useCallback(el => { if (el && gId) googleTugma(el, gId); }, [gId, reg]);
  return {
    googleBor, gRef, googleNomi: t('kirish.google_davom'), yoki: t('kirish.yoki'),
    smsBor: SMS_KORINADI && !reg && auth.smsBor, smsUsul, yuborildi: smsUsul && f.yuborildi,
    usulCta: smsUsul ? t('kirish.email_bilan') : t('kirish.telefon_bilan'),
    usulAlmash: () => usulAlmash(smsUsul ? 'email' : 'sms'),
    kod: f.kod, eKod: e.kod || '', bKod: bd('kod'),
    onKod: ev => setField({ kod: ev.target.value.replace(/\D/g, '').slice(0, 6) }),
    qayta: f.yuborildi ? (qoldi ? t('kirish.qayta_n', { n: qoldi }) : t('kirish.qayta')) : '', qaytaBor: f.yuborildi && !qoldi, smsYubor,
    smsCta: f.yuborildi ? t('kirish.kirish') : t('kirish.kod_yuborish'), smsSubmit: f.yuborildi ? smsKirish : smsYubor,
    isReg: reg, regHost, regOv,
    hasPending: !!pd, pendingText: pd ? t('kirish.pending', { mod: pd.mod + (pd.w ? ' · ' + pd.w + ' ' + t('umumiy.mm') : '') }) : '',
    f: { title: reg ? t('kirish.royxat') : t('kirish.kirish'), sub: reg ? t('kirish.royxat_sub') : smsUsul ? t('kirish.sms_sub') : t('kirish.kirish_sub'),
      cta: reg ? t('kirish.royxat') : t('kirish.kirish'), alt: reg ? t('kirish.akkaunt_bormi') : t('kirish.akkaunt_yoqmi'), altCta: reg ? t('kirish.kirish') : t('kirish.royxat'),
      name: f.name, email: f.email, eEmail: !!e.email, eEmailt: e.email || '', bEmail: bd('email'), passAuto: reg ? 'new-password' : 'current-password',
      phone: telGuruh(f.phone), pass: f.pass, shop: f.shop, passType: f.show ? 'text' : 'password', eye: f.show ? 'yashirish' : 'korish',
      bars: [1, 2, 3, 4].map(i => ({ c: i <= sc ? STRENGTH_C[sc] : 'var(--sfc2)' })), strength: ['', t('kirish.zaif'), t('kirish.ortacha'), t('kirish.yaxshi'), t('kirish.kuchli')][sc],
      eName: !!e.name, eNamet: e.name || '', ePhone: !!e.phone, ePhonet: e.phone || '', ePass: !!e.pass, ePasst: e.pass || '',
      bName: bd('name'), bPhone: bd('phone'), bPass: bd('pass') },
    onName: ev => setField({ name: ev.target.value }),
    onEmail: ev => setField({ email: ev.target.value }),
    onShop: ev => setField({ shop: ev.target.value }),
    onPhone: ev => { let d = ev.target.value.replace(/\D/g, ''); if (d.startsWith('998') && d.length > 9) d = d.slice(3); setField({ phone: d.slice(0, 9) }); },
    onPass: ev => setField({ pass: ev.target.value }),
    toggleEye: () => setField({ show: !f.show }),
    submitAuth, swapAuth
  };
}
