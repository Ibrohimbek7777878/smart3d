/* TZ-20 (2026-10-17): kichik .xlsx o'quvchi — sex xizmat jadvalini brauzerda (admin "Sex jadvalidan yuklash") va Node testida o'qish.
 * Kutubxonasiz: ZIP markaziy katalogi + XML (sharedStrings, inlineStr, son). inflateRaw tashqaridan beriladi:
 * brauzerda pako.inflateRaw, Node'da zlib.inflateRawSync. Formulalar hisoblanmaydi — saqlangan qiymat olinadi.
 * → { <varaq nomi>: [[katak, …], …] } (bo'sh katak — null) */

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const dec = (b) => new TextDecoder('utf-8').decode(b);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const xmlMatn = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));

/** ZIP → { nom: Uint8Array } (faqat stored va deflate) */
export function zipOqish(bytes, inflateRaw) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('ZIP emas');
  const n = u16(b, e + 10);
  let p = u32(b, e + 16);
  const out = {};
  for (let k = 0; k < n; k++) {
    if (u32(b, p) !== 0x02014b50) throw new Error('ZIP katalogi buzilgan');
    const method = u16(b, p + 10), csize = u32(b, p + 20), nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), lo = u32(b, p + 42);
    const name = dec(b.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    const ds = lo + 30 + u16(b, lo + 26) + u16(b, lo + 28);
    const raw = b.subarray(ds, ds + csize);
    if (method === 0) out[name] = raw;
    else if (method === 8) out[name] = new Uint8Array(inflateRaw(raw));
  }
  return out;
}

const kolonka = (ref) => { let c = 0; for (const ch of String(ref).replace(/\d+$/, '')) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };

export function xlsxOqish(bytes, inflateRaw) {
  const z = zipOqish(bytes, inflateRaw);
  const f = (nom) => (z[nom] ? dec(z[nom]) : '');
  const ss = [];
  for (const m of f('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(xmlMatn([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  const rels = {};
  for (const m of f('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]), tg = /Target="([^"]+)"/.exec(m[0]);
    if (id && tg) rels[id[1]] = tg[1].replace(/^\/?(xl\/)?/, 'xl/');
  }
  const varaqlar = [...f('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map((m, i) => ({
    nom: xmlMatn((/name="([^"]*)"/.exec(m[0]) || [])[1] || 'Sheet' + (i + 1)),
    yol: rels[(/r:id="([^"]+)"/.exec(m[0]) || [])[1]] || `xl/worksheets/sheet${i + 1}.xml`
  }));
  const out = {};
  for (const v of varaqlar) {
    const rows = [];
    for (const rm of f(v.yol).matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const row = [];
      for (const cm of (rm[1] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const at = cm[1], body = cm[2] || '';
        const ref = (/r="([A-Z]+\d+)"/.exec(at) || [])[1];
        const t = (/t="(\w+)"/.exec(at) || [])[1];
        const vv = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
        let val = null;
        if (t === 's') val = vv != null ? ss[+vv] ?? null : null;
        else if (t === 'inlineStr') val = xmlMatn([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
        else if (t === 'str' || t === 'e') val = vv != null ? xmlMatn(vv) : null;
        else if (t === 'b') val = vv === '1';
        else if (vv != null && vv !== '') val = Number(vv);
        const ci = ref ? kolonka(ref) : row.length;
        while (row.length < ci) row.push(null);
        row[ci] = val;
      }
      rows.push(row);
    }
    out[v.nom] = rows;
  }
  return out;
}
