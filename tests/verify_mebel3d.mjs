/* egasi #239–#241: yotoqxona va yumshoq mebel 3D shakli (app/js/mebel3d.js) — brauzersiz: har turda bir nechta mesh va rang,
 * o'lchamlar modul o'lchamidan oshmaydi, boshi doim to'g'ri tomonda, tortmalar suriladi, "Modul materiali" ranglari qo'llanadi;
 * hisob/kesim/narx assembler'dan O'ZGARMAYDI (assembler bu fayl uchun chaqirilmaydi, lekin kod ro'yxati assembler bilan solishtiriladi). */
import * as THREE from '../web/node_modules/three/build/three.module.js';
import { mebelMesh, mebelTuri, boshiXda, MEBEL3D_KODLAR } from '../app/js/mebel3d.js';
import { makeItemMesh } from '../app/js/materials3d.js';
import { getModulePanels } from '../app/js/engine/assembler.js';
import fs from 'node:fs';
let n = 0;
const ok = (c, m) => { if (!c) { console.error('XATO:', m); process.exit(1); } n++; };
const R = (f) => JSON.parse(fs.readFileSync(new URL('../app/data/' + f, import.meta.url)));
const cat = {};
for (const f of R('fragments.json')) cat[f.code] = f;
for (const f of R('fragments-mc.json').fragments) cat[f.code] = f;
ok(MEBEL3D_KODLAR.length === 16, 'mebel3d kodlari 16 ta');
const tur = {};
for (const code of MEBEL3D_KODLAR) {
  const f = cat[code];
  ok(!!f, `${code}: katalogda bor`);
  /* faqat yopiq quti (asosiy_korpus) bo'lgan modullar o'zgartiriladi — panelli (tortma/eshikli) modullarga tegilmaydi */
  const asm = getModulePanels(f, f.w, f.d, f.h, { tortma: true, eshiklar: true });
  ok(asm.panels.length === 1 && asm.panels[0].id === 'asosiy_korpus', `${code}: katalogda yopiq quti (${asm.panels.length} panel)`);
  const g = mebelMesh(THREE, f, f.w, f.d, f.h, {});
  const meshlar = []; g.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox')) meshlar.push(o); });
  const ranglar = new Set(meshlar.map(m => m.material.color.getHex()));
  ok(meshlar.length > 1 && ranglar.size > 1, `${code} (${mebelTuri(code)}): bir nechta mesh va rang (${meshlar.length}/${ranglar.size})`);
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g);
  ok(bb.max.x <= f.w / 2 + 1 && bb.min.x >= -f.w / 2 - 1, `${code}: eni chegarada (${bb.min.x.toFixed(0)}..${bb.max.x.toFixed(0)} / ±${f.w / 2})`);
  ok(bb.max.y <= f.d / 2 + 1 && bb.min.y >= -f.d / 2 - 1, `${code}: chuqurligi chegarada (${bb.min.y.toFixed(0)}..${bb.max.y.toFixed(0)} / ±${f.d / 2})`);
  ok(bb.max.z <= f.h / 2 + 1 && bb.min.z >= -f.h / 2 - 1, `${code}: balandligi chegarada (${bb.min.z.toFixed(0)}..${bb.max.z.toFixed(0)} / ±${f.h / 2})`);
  ok(g.userData.themed && g.userData.kind === 'item' && g.userData.w === f.w, `${code}: userData`);
  /* o'lcham cho'zilganda ham chegarada (min_w..max_w oralig'ining chetlari) */
  for (const k of [0.9, 1.15]) {
    const w2 = Math.round(f.w * k), d2 = f.d, h2 = f.h;
    if ((f.min_w && w2 < f.min_w) || (f.max_w && w2 > f.max_w)) continue;
    const g2 = mebelMesh(THREE, f, w2, d2, h2, {});
    const b2 = new THREE.Box3().setFromObject(g2);
    ok(b2.max.x <= w2 / 2 + 1 && b2.min.x >= -w2 / 2 - 1 && b2.max.y <= d2 / 2 + 1 && b2.max.z <= h2 / 2 + 1, `${code}: ${w2} mm enida ham chegarada`);
  }
  /* materials3d zanjiri: theme bilan — yangi shakl; theme'siz — eski quti-panel (eksport va eski sayt O'ZGARMAYDI) */
  const th = { mat: () => new THREE.MeshStandardMaterial({ color: 0x9a7448 }), rangMat: (r) => new THREE.MeshStandardMaterial({ color: r.rang }), ustki: () => false, glass: () => false };
  const gt = makeItemMesh(THREE, f, f.w, f.d, f.h, { theme: th });
  ok(gt.userData.mebel3d === mebelTuri(code), `${code}: makeItemMesh theme bilan mebel3d'ga ulangan`);
  const go = makeItemMesh(THREE, f, f.w, f.d, f.h, {});
  ok(!go.userData.mebel3d, `${code}: theme'siz eski quti-panel`);
  tur[mebelTuri(code)] = (tur[mebelTuri(code)] || 0) + 1;
}
/* rang: korpus → yog'och/karkas, fasad → mato / tortma fasadi */
{
  const th = { mat: () => new THREE.MeshStandardMaterial({ color: 0x9a7448 }), rangMat: (r) => new THREE.MeshStandardMaterial({ color: r.rang }) };
  const bor = (g, hex) => { let b = false; g.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === hex) b = true; }); return b; };
  const divan = mebelMesh(THREE, cat['SP-S-001'], 2100, 900, 850, { theme: th, rang: { fasad: { rang: 0x123456 } } });
  ok(bor(divan, 0x123456), 'divan: fasad rangi mato');
  const komod = mebelMesh(THREE, cat['SP-BD-005'], 800, 450, 1000, { theme: th, rang: { fasad: { rang: 0x654321 }, korpus: { rang: 0x112233 } } });
  ok(bor(komod, 0x654321) && bor(komod, 0x112233), 'komod: fasad va korpus ranglari');
  const kr = mebelMesh(THREE, cat['MC-KR-04'], 2000, 1750, 1166, { theme: th, rang: { korpus: { rang: 0x445566 } } });
  ok(bor(kr, 0x445566), 'krovat: karkas rangi');
  ok(bor(kr, 0xf2ede3), 'krovat: matras oq-bej');
}
/* krovat boshi: orqa (-y) uchida (uzun o'qi y) yoki -x da (uzun o'qi x, 90° burilgan) */
for (const code of ['SP-BD-001', 'SP-BD-003', 'MC-KR-02', 'MC-KR-04', 'MC-KR-05', 'MC-KR-01']) {
  const f = cat[code];
  const g = mebelMesh(THREE, f, f.w, f.d, f.h, {});
  g.updateMatrixWorld(true);
  const bosh = []; g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.id === 'bosh') bosh.push(o); });
  ok(bosh.length === 1, `${code}: boshi (izgolovye) bor`);
  const c = new THREE.Box3().setFromObject(bosh[0]).getCenter(new THREE.Vector3());
  ok(boshiXda(f) ? c.x < -f.w / 2 + 120 : c.y < -f.d / 2 + 120, `${code}: boshi ${boshiXda(f) ? "-x" : "-y"} uchida (${c.x.toFixed(0)}, ${c.y.toFixed(0)})`);
  const yostiq = []; g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.id === 'yostiq') yostiq.push(o); });
  const matras = []; g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.id === 'matras') matras.push(o); });
  ok(yostiq.length >= 1 && matras.length === 1, `${code}: matras va yostiq`);
}
ok(boshiXda(cat['MC-KR-04']) && !boshiXda(cat['SP-BD-003']) && !boshiXda(cat['SP-S-001']), 'boshiXda qoidasi');
/* komod: 4 tortma, oldinga suriladi */
{
  const f = cat['SP-BD-005'];
  const g = mebelMesh(THREE, f, f.w, f.d, f.h, {});
  const mv = g.userData.movers;
  ok(mv.length === 4 && mv.every(m => m.type === 'drawer' && m.dist >= 100), 'komod: 4 tortma (drawer mover)');
  ok(g.userData.doorsCount === 4, 'komod: doorsCount');
  for (const m of mv) {
    const dm = []; m.obj.traverse(o => { if (o.isMesh && o.userData.part) dm.push(o); });
    ok(dm.length >= 1 && dm[0].userData.part.id === m.key && dm[0].userData.mover === m.key, `komod/${m.key}: detal id = mover kaliti`);
  }
  const a = new THREE.Box3().setFromObject(mv[0].obj).max.y;
  mv[0].obj.position.y = mv[0].dist; g.updateMatrixWorld(true);
  ok(new THREE.Box3().setFromObject(mv[0].obj).max.y > a + 100, 'komod: tortma ochilganda old tomonga chiqadi');
}

/* TZ-35: klassik garnitur — yumshoq boshli/ustunchali krovat, trimo (2×3 tortma + oyna), ramkali fasad, karniz, umumiy rang, push */
{
  const th = { mat: (k) => new THREE.MeshStandardMaterial({ color: k === 'glass' ? 0x6fa3aa : 0x9a7448 }), rangMat: (r) => new THREE.MeshStandardMaterial({ color: r.rang }), ustki: () => false, glass: () => false };
  const KASH = 0xd2c2ac;
  const rangi = (g) => { const s = new Set(); g.traverse(o => { if (o.isMesh && o.material && o.material.color && !(o.userData && o.userData.kind === 'hitBox')) s.add(o.material.color.getHex()); }); return s; };
  const qismlar = (g, id) => { let c = 0; g.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.id === id) c++; }); return c; };
  const chegara = (code, g, f) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g); return b.max.x <= f.w / 2 + 1 && b.min.x >= -f.w / 2 - 1 && b.max.y <= f.d / 2 + 1 && b.min.y >= -f.d / 2 - 1 && b.max.z <= f.h / 2 + 1 && b.min.z >= -f.h / 2 - 1; };
  const kr = cat['MC-KR-04'];
  const g = mebelMesh(THREE, kr, kr.w, kr.d, kr.h, { theme: th, klassik: true, garnituRang: KASH });
  ok(chegara('MC-KR-04', g, kr), 'klassik krovat: o\'lchamlar modul chegarasida');
  ok(qismlar(g, 'ustun') === 4 && qismlar(g, 'ustun_oyoq') === 4, 'klassik krovat: 4 ta ustuncha (shar uchli)');
  ok(qismlar(g, 'bosh_yumshoq') === 1 && qismlar(g, 'oyoq_yumshoq') === 1 && qismlar(g, 'tugma') > 8, 'klassik krovat: yumshoq boshi va oyoq tomoni, kapitone tugmachalar');
  ok(rangi(g).has(KASH) && rangi(g).has(0xf2ede3), 'klassik krovat: umumiy rang (kashemir) + oq matras');
  const g0 = mebelMesh(THREE, kr, kr.w, kr.d, kr.h, { theme: th });
  ok(qismlar(g0, 'ustun') === 0, 'klassik bayrog\'isiz — oddiy krovat (o\'zgarmaydi)');
  const km = cat['SP-BD-005'], gt = mebelMesh(THREE, km, 1200, km.d, km.h, { theme: th, klassik: true, push: true, garnituRang: KASH });
  const mvt = gt.userData.movers;
  ok(mvt.length === 6 && mvt.every(m => m.type === 'drawer'), 'trimo: 2 qator × 3 = 6 tortma');
  ok(chegara('trimo', gt, { w: 1200, d: km.d, h: km.h }), 'trimo: o\'lchamlar chegarada (ruchkasiz)');
  let oyna = 0, ruchka = 0, relyef = 0; gt.traverse(o => { if (o.isMesh && o.userData.part && o.userData.part.id === 'oyna') oyna++; if (o.isMesh && o.material === undefined) ruchka++; });
  ok(oyna === 1, 'trimo: tepasida oyna paneli (alohida shisha mesh)');
  const gh = mebelMesh(THREE, km, 1200, km.d, km.h, { theme: th, klassik: true, garnituRang: KASH });
  const bsay = (g) => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };
  ok(bsay(gh) > bsay(gt), 'trimo: push (ruchkasiz) — ruchka mesh\'lari yo\'q');
  ok(bsay(gt) > bsay(mebelMesh(THREE, km, 1200, km.d, km.h, { theme: th, push: true })), 'trimo: klassik — fasadda ramka relyefi bor');
  ok(rangi(gt).has(KASH), 'trimo: umumiy rang');
  const g800 = mebelMesh(THREE, km, 800, km.d, km.h, { theme: th });
  ok(g800.userData.movers.length === 4, 'komod 800: 4 tortma, oyna yo\'q (o\'zgarmagan)');
  /* shkaf: ramkali eshiklar + karniz (materials3d zanjiri), push — ruchka yo'q */
  const sw = cat['SP-W-006'];
  const mkTh = Object.assign({}, th, { mat: () => new THREE.MeshStandardMaterial({ color: 0x9a7448 }) });
  const a = makeItemMesh(THREE, sw, sw.w, sw.d, sw.h, { theme: mkTh });
  const b = makeItemMesh(THREE, sw, sw.w, sw.d, sw.h, { theme: mkTh, klassik: true, garnituRang: KASH, push: true });
  const kl = (gg) => { let n = 0; gg.traverse(o => { if (o.userData && o.userData.klassik) n++; }); return n; };
  ok(kl(a) === 0 && kl(b) >= 2 * 8 + 3, `shkaf: klassik — ramkali eshiklar (2 panel × 4 tasma) va karniz (${kl(b)})`);
  ok(rangi(b).has(KASH) && !rangi(a).has(KASH), 'shkaf: umumiy rang butun garniturda');
  ok(b.userData.doorsCount === a.userData.doorsCount && b.userData.movers.length === a.userData.movers.length, 'shkaf: eshiklar soni o\'zgarmaydi');
}
ok(Object.keys(tur).sort().join() === 'boshi,burchak,divan,komod,kreslo,krovat,skameyka,toshqin', 'barcha turlar: ' + Object.keys(tur));
console.log(`✅ verify_mebel3d: ${n} tekshiruv`);
