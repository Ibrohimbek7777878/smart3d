/* egasi #232: o'rnatma texnika 3D shakli (app/js/texnika3d.js) — brauzersiz: har turda bir nechta mesh va rang, o'lcham chegarasida
 * (ruchka/tugma ≤ 40 mm chiqib turadi), eshiklar OLDINGA ochiladi (flap: rotation.x < 0, door: rotation.z), rang almashtirilsa
 * material rangi o'zgaradi; hisob/kesimga bog'liq emas (assembler/cutlist chaqirilmaydi). */
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { texnikaMesh, texnikaTuri, texnikaSukut, TEXNIKA_QISMLAR, TEXNIKA_PALITRA } from '../app/js/texnika3d.js';
import fs from 'node:fs';
let n = 0;
const ok = (c, m) => { if (!c) { console.error('XATO:', m); process.exit(1); } n++; };
const A = JSON.parse(fs.readFileSync(new URL('../app/data/appliances.json', import.meta.url))).appliances;
const bosh = new Set(A.map(a => a.code));
ok(A.length === 7 && A.every(a => texnikaTuri(a.code)), 'har texnika kodi turga ega');
for (const a of A) {
  const frag = { code: a.code, name: a.name, category: 'appliance' };
  const g = texnikaMesh(THREE, frag, a.w, a.d, a.h, {});
  const tur = texnikaTuri(a.code);
  const meshlar = []; g.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox')) meshlar.push(o); });
  const ranglar = new Set(meshlar.map(m => m.material.color.getHex()));
  ok(meshlar.length > 4 && ranglar.size > 1, `${a.code} (${tur}): bir nechta mesh va rang (${meshlar.length}/${ranglar.size})`);
  const bb = new THREE.Box3().setFromObject(g);
  ok(bb.max.x <= a.w / 2 + 2 && bb.min.x >= -a.w / 2 - 2, `${a.code}: eni chegarada`);
  ok(bb.max.z <= a.h / 2 + 30 && bb.min.z >= -a.h / 2 - 2, `${a.code}: balandligi chegarada (panjara ≤ 30 mm chiqadi)`);
  ok(bb.min.y >= -a.d / 2 - 2 && bb.max.y <= a.d / 2 + 40, `${a.code}: chuqurligi chegarada (old tomonga ≤ 40 mm)`);
  /* rang almashtirish: har qism */
  for (const q of TEXNIKA_QISMLAR[tur]) {
    const g2 = texnikaMesh(THREE, frag, a.w, a.d, a.h, { rang: { [q]: 0x123456 } });
    let bor = false; g2.traverse(o => { if (o.isMesh && o.userData.texnikaSlot === q && o.material.color.getHex() === 0x123456) bor = true; });
    ok(bor, `${a.code}: "${q}" qismi rangi o'zgaradi`);
  }
  /* eshik ochilishi */
  const mv = g.userData.movers;
  ok(Array.isArray(mv) && mv.length === g.userData.doorsCount, `${a.code}: movers`);
  ok(mv.length > 0 || tur === 'varochnaya' || tur === 'chimeney', `${a.code}: eshikli turda eshik bor`);
  for (const m of mv) {
    ok(m.type === 'door' || m.type === 'flap', 'mover turi');
    const dm = []; m.obj.traverse(o => { if (o.isMesh && o.userData.part) dm.push(o); });
    ok(dm.length >= 1 && dm[0].userData.part.id === m.key, `${a.code}: eshik detali id = mover kaliti (${m.key})`);
    if (m.type === 'flap') m.obj.rotation.x = m.sign * 1.2; else m.obj.rotation.z = m.sign * Math.PI / 4;
    g.updateMatrixWorld(true);
    const eb = new THREE.Box3().setFromObject(dm[0]);
    ok(eb.max.y > a.d / 2 + 25, `${a.code}/${m.key}: eshik ochilganda old tomonga chiqadi (${eb.max.y.toFixed(0)} > ${a.d / 2})`);
  }
}
ok(TEXNIKA_PALITRA.length === 5, 'palitra: oq, kulrang, qora, zanglamas, bronza');
ok(Object.keys(texnikaSukut('muzlatgich')).length >= 3, 'sukut ranglar');
console.log(`✅ verify_texnika3d: ${n} tekshiruv`);
