import { useSlice } from '../../store/index.js';
import { telGuruh } from '../../shared/lib/format.js';
import { useViewer } from '../../shared/design3d/useViewer.js';
import { s3Viewer, s3Mats, s3Build, s3Apply, s3Spec } from '../../shared/design3d/engine.js';
import { setField, submitAuth, swapAuth } from './actions.js';

/* ro'yxat oynasidagi aylanuvchi shkaf — dizayn animatsiyasi (marketing namunasi, o'zgarishsiz) */
function regViewer(T, h, o) {
  const v = s3Viewer(T, h, o);
  v.pC = new T.Plane(new T.Vector3(0, -1, 0), 0); v.pP = new T.Plane(new T.Vector3(0, 1, 0), 0); v.M = s3Mats(T, [v.pC], [v.pP]);
  const m = s3Build(T, v, s3Spec('kp', 600), false); v.dist = 2.6; v.phi = .28;
  const a = { color: 1, explode: 0, hw: 1, count: 1 };
  v.onTick = (dt, t) => { a.explode = (Math.sin(t * .7 - 1.5) * .5 + .5) * .75; s3Apply(v, m, a); for (const Lb of v.labels) Lb.op = 0; };
  return v;
}

const STRENGTH_C = ['var(--sfc3)', 'var(--danger)', 'var(--acc)', 'var(--cyan)', 'var(--cyan)'];

/** Kirish / Ro'yxat ekrani qiymatlari */
export function useKirish() {
  const nav = useSlice('nav'), auth = useSlice('auth');
  const reg = nav.screen === 'reg', f = auth.f, e = f.err;
  const [regHost, regOv] = useViewer(true, regViewer, []);
  const sc = f.pass.length ? [f.pass.length >= 8, /\d/.test(f.pass), /[A-ZА-Я]/.test(f.pass), /[^\w]/.test(f.pass)].filter(Boolean).length : 0;
  const bd = k => e[k] ? 'var(--danger)' : 'var(--line)';
  const pd = nav.pending;
  return {
    isReg: reg, regHost, regOv,
    hasPending: !!pd, pendingText: pd ? (pd.mod + (pd.w ? ' · ' + pd.w + ' mm' : '') + ' — ro\'yxatdan keyin loyihangizda turadi') : '',
    f: { title: reg ? 'Ro\'yxatdan o\'tish' : 'Kirish', sub: reg ? '1 daqiqa. Keyin birinchi loyihangizni chizasiz.' : 'Email va parolingiz bilan.',
      cta: reg ? 'Ro\'yxatdan o\'tish' : 'Kirish', alt: reg ? 'Akkauntingiz bormi?' : 'Akkaunt yo\'qmi?', altCta: reg ? 'Kirish' : 'Ro\'yxatdan o\'tish',
      name: f.name, email: f.email, eEmail: !!e.email, eEmailt: e.email || '', bEmail: bd('email'), passAuto: reg ? 'new-password' : 'current-password',
      phone: telGuruh(f.phone), pass: f.pass, shop: f.shop, passType: f.show ? 'text' : 'password', eye: f.show ? '🙈' : '👁',
      bars: [1, 2, 3, 4].map(i => ({ c: i <= sc ? STRENGTH_C[sc] : 'var(--sfc2)' })), strength: ['', 'Zaif', 'O\'rtacha', 'Yaxshi', 'Kuchli'][sc],
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
