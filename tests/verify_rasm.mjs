/* Rasmlar: app/data/rasmlar.json tuzilishi, fayllar mavjud va kichik, ERP host/narx/mijoz yo'q; material rasmi → 3D rang obyekti;
 * uvMm — tekstura mm masshtabida (soxta rasm bilan). Ishlatish: node tests/verify_rasm.mjs */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, i); } };

const raw = readFileSync(DATA + 'rasmlar.json', 'utf8'), R = JSON.parse(raw);
ok('tuzilish: _meta, furnitura, materiallar', R._meta && R.furnitura && R.materiallar && typeof R.furnitura === 'object');
ok('_meta.soni = furnitura soni', R._meta.soni === Object.keys(R.furnitura).length);
ok("_meta.manba — 'ERP eksporti'", R._meta.manba === 'ERP eksporti');
ok("ERP host, URL, narx yo'q", !/https?:|mebelcity|bittada|uzs|price|narx/i.test(raw));
const kat = JSON.parse(readFileSync(DATA + 'furnitura-catalog.json', 'utf8')).items, idlar = new Set(kat.map(x => x.id));
const hammasi = [...Object.entries(R.furnitura), ...Object.entries(R.materiallar).map(([k, v]) => [k, typeof v === 'string' ? v : v.src])];
ok('furnitura id — katalogda bor', Object.keys(R.furnitura).every(id => idlar.has(id)));
ok("yo'llar data/rasm/… va fayl mavjud", hammasi.every(([, y]) => /^data\/rasm\/(furnitura|material)\/[\w.-]+\.webp$/.test(y) && existsSync(DATA + y.replace(/^data\//, ''))));
ok('yo\'l nomi — id bilan mos (furnitura)', Object.entries(R.furnitura).every(([id, y]) => y.endsWith('/' + id + '.webp')));
const kb = hammasi.reduce((a, [, y]) => a + statSync(DATA + y.replace(/^data\//, '')).size, 0) / 1024;
ok('jami hajm ≤ 600 KB (' + Math.round(kb) + ')', kb <= 600);
ok('rasm papkasida ortiqcha fayl yo\'q', readdirSync(DATA + 'rasm/furnitura').length === Object.keys(R.furnitura).length);
ok('kamida 20 ta furnituraga rasm', Object.keys(R.furnitura).length >= 20);

/* material rasmi → 3D rang obyekti (soxta rasm) */
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
ok('H.rasmlar yuklanadi (hisob)', H.rasmlar && H.rasmlar.furnitura);
const sh = H.sheetCatalog.sheets.find(s => /LDSP|ЛДСП/i.test(s.type + s.name) && s.th) || H.sheetCatalog.sheets[0];
const kod = E.erpKod(sh), doc = { erpMat: {} };
E.erpQosh(H, doc, sh);
const r0 = E.materialRang(H, kod);
ok("rasm yo'q — oldingidek rang (rasm maydoni yo'q)", !r0 || !r0.rasm);
const H2 = Object.assign({}, H, { rasmlar: { materiallar: { [kod]: { src: 'data/rasm/material/soxta.webp', mm: [1000, 500] } } } });
const r1 = E.materialRang(H2, kod);
ok('rasm bor — rang obyektida rasm + rasmMm', r1 && r1.rasm === 'data/rasm/material/soxta.webp' && r1.rasmMm[0] === 1000 && typeof r1.rang === 'number');
ok("materialRasm — yo'q material → null", E.materialRasm(H, 'ERP-yoq', 'x') === null);

const THREE = await import('../web/node_modules/three/build/three.module.js');
const { uvMm } = await import('../app/js/materials3d.js');
const g = uvMm(new THREE.BoxGeometry(800, 18, 600), 1000, 500), uv = g.attributes.uv, nr = g.attributes.normal;
const maxU = (() => { let m = 0; for (let i = 0; i < uv.count; i++) if (nr.getY(i) > 0.5) m = Math.max(m, uv.getX(i)); return m; })();
const maxV = (() => { let m = 0; for (let i = 0; i < uv.count; i++) if (nr.getY(i) > 0.5) m = Math.max(m, uv.getY(i)); return m; })();
ok('uvMm: tepa yoq 800×600 mm / 1000×500 mm rasm → takrorlanish 0.8 × 1.2', Math.abs(maxU - 0.8) < 1e-6 && Math.abs(maxV - 1.2) < 1e-6, maxU + ',' + maxV);

console.log(`\n${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);
