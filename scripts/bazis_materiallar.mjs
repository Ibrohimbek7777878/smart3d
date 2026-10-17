/* Asosiy 100 dekor (egasi #182): Bazis .b3d buyurtma fayllaridagi plita materiallari — har buyurtmada qaysi material ishlatilgan.
 * Ishlatish: node scripts/bazis_materiallar.mjs <04_bazis papkasi> > chiqish.json
 * Natija: { "<buyurtma raqami>": ["ЛДСП …", …] } — faqat material nomlari (mijoz ismi yozilmaydi; buyurtma raqami — papka boshidagi son). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { parseBazisB3D } from '../app/js/engine/bazis/b3d.js';

const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
const dir = process.argv[2];
const out = {};
for (const d of readdirSync(dir)) {
  const p = join(dir, d);
  if (!statSync(p).isDirectory() || !/^\d+_/.test(d)) continue;
  const nom = new Set();
  for (const f of readdirSync(p).filter(x => /\.b3d$/i.test(x))) {
    try {
      const r = parseBazisB3D(new Uint8Array(readFileSync(join(p, f))), { inflate });
      for (const o of (r && r.objects) || r || []) if (o && o.material) nom.add(String(o.material).trim());
    } catch (e) { console.error('b3d xato:', d.split('_')[0], String(e.message || e).slice(0, 80)); }
  }
  out[d.split('_')[0]] = [...nom];
}
process.stdout.write(JSON.stringify(out, null, 1));
