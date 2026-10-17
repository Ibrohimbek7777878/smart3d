/* TZ-31 B: VR ildiz transformi matematikasi (web/src/services/vr.js ildizHisob) — brauzer/shlemsiz.
 * mm Z-yuqori → m Y-yuqori; xona markazi pol ustida dunyo (0,0,0) ga tushadi; devor balandligi yuqoriga (+Y) qaraydi. */
import { ildizHisob } from '../web/src/services/vr.js';
import * as THREE from '../web/node_modules/three/build/three.module.js';
let n = 0;
const ok = (c, m) => { if (!c) { console.error('XATO:', m); process.exit(1); } n++; };
const yaqin = (a, b) => Math.abs(a - b) < 1e-9;
for (const [cx, cy] of [[0, 0], [2500, 2000], [-1300, 4100]]) {
  const h = ildizHisob(cx, cy);
  const M = new THREE.Matrix4().compose(h.pos, h.quat, new THREE.Vector3().setScalar(h.scale));
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const c = P(cx, cy, 0);
  ok(yaqin(c.x, 0) && yaqin(c.y, 0) && yaqin(c.z, 0), `markaz (${cx},${cy}) dunyo boshida emas: ${c.toArray()}`);
  const t = P(cx, cy, 2700);                       // shift balandligi 2.7 m → +Y
  ok(yaqin(t.x, 0) && yaqin(t.y, 2.7) && yaqin(t.z, 0), `Z-yuqori → Y-yuqori emas: ${t.toArray()}`);
  const x1 = P(cx + 1000, cy, 0);                  // +X 1 m → +X
  ok(yaqin(x1.x, 1) && yaqin(x1.y, 0) && yaqin(x1.z, 0), `X yo'nalishi: ${x1.toArray()}`);
  const y1 = P(cx, cy + 1000, 0);                  // +Y (xona chuqurligi) 1 m → −Z (oldinga)
  ok(yaqin(y1.z, -1) && yaqin(y1.y, 0), `Y → −Z: ${y1.toArray()}`);
  ok(yaqin(h.scale, 0.001), 'masshtab 0.001');
}
console.log(`✅ verify_vr: ${n} tekshiruv`);
