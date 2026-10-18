/* Google ID token tekshiruvi (Google Identity Services). JWKS keshlanadi (Cache-Control max-age); testda GOOGLE_JWKS_URL bilan almashtiriladi.
 * Imzo RS256, audience = GOOGLE_CLIENT_ID, issuer — Google; email_verified shart (chaqiruvchi tekshiradi). */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
let kesh = { url: '', keys: null, exp: 0 };

async function kalitlar(force) {
  const url = process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
  if (!force && kesh.keys && kesh.url === url && kesh.exp > Date.now()) return kesh.keys;
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw Object.assign(new Error('JWKS ' + r.status), { tarmoq: true });
  const age = +(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '') || [])[1] || 300;
  const keys = (await r.json()).keys || [];
  kesh = { url, keys, exp: Date.now() + Math.min(age, 24 * 3600) * 1000 };
  return keys;
}

/** → token tarkibi (payload). Xato: Error.tarmoq = true (kalitlar olinmadi) yoki oddiy Error (token yaroqsiz) */
export async function googleTokenTekshir(credential, clientId) {
  if (typeof credential !== 'string' || credential.length > 4096) throw new Error('token shakli');
  const dec = jwt.decode(credential, { complete: true });
  if (!dec || dec.header.alg !== 'RS256' || !dec.header.kid) throw new Error('token sarlavhasi');
  let keys;
  try { keys = await kalitlar(false); } catch (e) { throw Object.assign(new Error('JWKS: ' + e.message), { tarmoq: true }); }
  let jwk = keys.find(k => k.kid === dec.header.kid);
  if (!jwk) {                                         // kalit almashgan bo'lishi mumkin — bir marta yangilab ko'ramiz
    try { keys = await kalitlar(true); } catch (e) { throw Object.assign(new Error('JWKS: ' + e.message), { tarmoq: true }); }
    jwk = keys.find(k => k.kid === dec.header.kid);
    if (!jwk) throw new Error('kalit topilmadi');
  }
  const pub = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const p = jwt.verify(credential, pub, { algorithms: ['RS256'], audience: clientId, issuer: ISSUERS });
  if (!p.sub || !p.email) throw new Error('sub/email yo\'q');
  return p;
}
