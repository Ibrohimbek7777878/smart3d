/* GLB F1 tekshiruvi: poligon pol (non-indexed, maydoni = L maydoni), boxlar indexes qolgan. */
import { buildGLB } from '../app/js/engine/glbexport.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok    ' + m); } else { fail++; console.log('FAIL  ' + m); } };

const L = [[0, 0], [3600, 0], [3600, 2000], [2200, 2000], [2200, 3000], [0, 3000]];
const RECT = [[0, 0], [4200, 0], [4200, 3100], [0, 3100]];

function parseGlb(glb) {
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  ok(dv.getUint32(0, true) === 0x46546C67, 'GLB magic');
  ok(dv.getUint32(4, true) === 2, 'GLB version 2');
  const total = dv.getUint32(8, true);
  ok(total === glb.byteLength, 'GLB length header = byteLength (' + total + ')');
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    const data = glb.slice(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data));
    if (type === 0x004E4942) bin = data;
    off += 8 + len;
  }
  ok(json && bin, 'JSON va BIN chunklar mavjud');
  return { json, bin };
}

const { glb } = buildGLB({ room: { outline: L, wall_height: 2700, wall_thickness: 100, openings: [] }, placements: [] }, {});
const { json, bin } = parseGlb(glb);

const floorMesh = json.meshes.find(m => m.name === 'Mesh_Pol');
ok(!!floorMesh, 'Mesh_Pol mavjud');
const fp = floorMesh.primitives[0];
ok(fp.indices === undefined, 'pol non-indexed (indices yo\'q)');
const acc = json.accessors[fp.attributes.POSITION];
ok(acc.count === 24, 'L pol: 24 verts (4 tri × 3 × 2 qatlam) — ' + acc.count);

// bin dan o'qish
const pv = json.bufferViews[acc.bufferView];
const f32 = new Float32Array(bin.buffer, bin.byteOffset + pv.byteOffset + acc.byteOffset, acc.count * 3);
// yuqori qatlam = birinchi 12 verts (y=0), maydon m²
let area = 0;
for (let i = 0; i < 12; i += 3) {
  const [ax, az] = [f32[i * 3], f32[i * 3 + 2]];
  const [bx, bz] = [f32[(i + 1) * 3], f32[(i + 1) * 3 + 2]];
  const [cx, cz] = [f32[(i + 2) * 3], f32[(i + 2) * 3 + 2]];
  area += Math.abs(((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2);
}
ok(Math.abs(area - 9.4) < 0.01, 'L pol maydoni = 9.4 m² (bbox 10.8 emas) — ' + area.toFixed(3));
ok(Math.abs(acc.max[0] - 3.6) < 1e-6 && Math.abs(acc.max[2] - 0) < 1e-6, 'bounds: x_max=3.6, z_max=0 (mm→m)');
ok(Math.abs(acc.min[1] - (-0.04)) < 1e-6, 'bounds: y_min=-0.04 (pastki qatlam)');

// barcha qolgan meshlar box: indices 0, count 24
let boxes = 0, bad = 0;
for (const m of json.meshes) {
  if (m.name === 'Mesh_Pol') continue;
  boxes++;
  const p = m.primitives[0];
  if (p.indices !== 0 || json.accessors[p.attributes.POSITION].count !== 24) bad++;
}
ok(boxes > 0 && bad === 0, 'barcha box panellar: indices=0, count=24 (' + boxes + ' ta, yaroqsiz ' + bad + ')');

// bin hajmi mosligi: pos+norm+idx+padding
const bvs = json.bufferViews;
const need = Math.max(...bvs.map(b => b.byteOffset + b.byteLength));
ok(need <= bin.byteLength, 'bufferView chegaralari BIN ichida (' + need + ' ≤ ' + bin.byteLength + ')');

// RECT regressiya
const r2 = buildGLB({ room: { outline: RECT, wall_height: 2700, wall_thickness: 100, openings: [] }, placements: [] }, {});
const p2 = parseGlb(r2.glb);
const fm2 = p2.json.meshes.find(m => m.name === 'Mesh_Pol');
ok(p2.json.accessors[fm2.primitives[0].attributes.POSITION].count === 12, 'RECT pol: 12 verts (2 tri × 3 × 2)');

import { readFileSync } from 'fs';
const frags = JSON.parse(readFileSync(new URL('../app/data/fragments.json', import.meta.url), 'utf8'));
const cat = Object.fromEntries(frags.map(f => [f.code, f]));
const docF = {
  room: { outline: L, wall_height: 2700, wall_thickness: 100, openings: [] },
  placements: [
    { id: 'p1', frg: 'SP-K-001', x: 100, y: 100, w: 600, d: 550, h: 720, rot: 0, qty: 1 },
    { id: 'p2', frg: 'SP-K-002', x: 800, y: 100, w: 600, d: 550, h: 720, rot: 90, qty: 1 },
    { id: 'p3', frg: 'SP-W-001', x: 100, y: 2400, w: 600, d: 550, h: 720, rot: 0, qty: 1 }
  ]
};
const r3 = buildGLB(docF, cat);
const p3 = parseGlb(r3.glb);
let boxBad = 0, boxCount = 0, floorSeen = false;
for (const m of p3.json.meshes) {
  const pr = m.primitives[0];
  if (m.name === 'Mesh_Pol') { floorSeen = true; continue; }
  boxCount++;
  const a = p3.json.accessors[pr.attributes.POSITION];
  if (pr.indices !== 0 || a.count !== 24) boxBad++;
  const bv = p3.json.bufferViews[a.bufferView];
  if (a.byteOffset + a.count * 12 > bv.byteLength) boxBad++;
}
ok(floorSeen, 'mebelli: Mesh_Pol ham bor');
ok(boxCount > 6 && boxBad === 0, 'mebelli: ' + boxCount + ' ta box, hammasi count=24 va byteOffset ichida (yaroqsiz ' + boxBad + ')');
ok(r3.stats.totalVerts > 0 && r3.glb.byteLength === new DataView(r3.glb.buffer, r3.glb.byteOffset).getUint32(8, true), 'mebelli: header length mos');

console.log(`\n=== ${fail ? 'FAIL' : 'HAMMASI OK'} (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
