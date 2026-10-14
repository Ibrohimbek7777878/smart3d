import { buildGLB } from '../app/js/engine/glbexport.js';
import { buildOBJ } from '../app/js/engine/objexport.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };

const L = [[0,0],[4000,0],[4000,2800],[1500,2800],[1500,4500],[0,4500]];
const utils = [
  { wall: 0, offset: 900, z: 300, type: 'outlet' },
  { wall: 1, offset: 1200, z: 400, type: 'pipe' },
  { wall: 3, offset: 600, z: 1100, type: 'outlet' }
];
const docL = { room: { outline: L, wall_height: 2700, wall_thickness: 100, openings: [], utilities: utils }, placements: [] };

/* ── GLB ── */
const r = buildGLB(docL, {});
function parseJson(glb) {
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  let off = 12;
  const len = dv.getUint32(off, true);
  return JSON.parse(new TextDecoder().decode(glb.slice(off + 8, off + 8 + len)));
}
const g = parseJson(r.glb);
const names = g.nodes.map(n => n.name);
ok(names.some(n => /Rozetka/.test(n)), 'GLB: Rozetka node bor (L-xona)');
ok(names.some(n => /Quvur/.test(n)), 'GLB: Quvur node bor');
ok(g.materials.some(m => m.name === 'cat_pipe'), 'GLB: cat_pipe material');
ok(g.materials.some(m => m.name === 'cat_outlet'), 'GLB: cat_outlet material');
// box geometriyasi24 vert / count=24 bo'lishi kerak
const pipeMesh = g.meshes.find(m => /Quvur/.test(m.name));
const pipeAcc = g.accessors[g.meshes[pipeMesh.primitives ? 0 : 0] ? 0 : 0];
ok(g.nodes.filter(n => /Quvur|Rozetka/.test(n.name)).length === 3, 'GLB: 3 ta utility node (2 outlet + 1 pipe)');

/* ── OBJ ── */
const ro = buildOBJ(docL, {});
ok(ro.mtl.includes('newmtl cat_outlet') && ro.mtl.includes('newmtl cat_pipe'), 'OBJ: MTL da outlet/pipe materiallar');
ok((ro.obj.match(/o rozetka_/g) || []).length === 2, 'OBJ: 2 ta rozetka obyekti');
ok((ro.obj.match(/o quvur_/g) || []).length === 1, 'OBJ: 1 ta quvur obyekti');
ok(ro.obj.includes('usemtl cat_outlet') && ro.obj.includes('usemtl cat_pipe'), 'OBJ: usemtl outlet/pipe');

/* ── bo'sh utilities — eskidek o'zgarmasdan ── */
const r0 = buildGLB({ room: { outline: L, wall_height: 2700, wall_thickness: 100, openings: [] }, placements: [] }, {});
const j0 = parseJson(r0.glb);
ok(!j0.nodes.some(n => /Quvur|Rozetka/.test(n.name)), 'GLB: utilities bo\'sh bo\'lsa utility node yo\'q');
const ro0 = buildOBJ({ room: { outline: L, wall_height: 2700, wall_thickness: 100, openings: [] }, placements: [] }, {});
ok(!/quvur_|rozetka_/.test(ro0.obj), 'OBJ: utilities bo\'sh bo\'lsa utility obyekt yo\'q');

console.log('\n=== ' + (fail ? 'FAIL' : 'HAMMASI OK') + ' (' + pass + ' pass, ' + fail + ' fail) ===');
process.exit(fail ? 1 : 0);
