/* verify_deraza3d.mjs — egasi #236: real oyna/eshik 3D reja o'lchamlari (faqat ko'rinish; hisob o'zgarmaydi). */
import { derazaReja, OYNA_SUKUT_Z, PEShTAXTA_CHIQISH } from '../app/js/engine/deraza3d.js';
let xato = 0; const ok = (c, m) => { if (!c) { xato++; console.log('XATO:', m); } };
for (const [kat, w, d, h] of [['window', 1400, 60, 1500], ['window', 1800, 70, 1700], ['window', 600, 60, 900], ['door', 900, 40, 2100], ['door', 700, 40, 2000]]) {
  const B = derazaReja(kat, w, d, h), nom = `${kat} ${w}x${d}x${h}`;
  ok(B.length > 5, nom + ': bo\'laklar kam');
  const y = (b) => b.y + b.d / 2;
  for (const b of B) {
    ok(b.x - b.w / 2 >= -w / 2 - 51 && b.x + b.w / 2 <= w / 2 + 51, `${nom}/${b.id}: eni chegaradan chiqdi`);
    ok(b.z - b.h / 2 >= -h / 2 - 1 && b.z + b.h / 2 <= h / 2 + 1, `${nom}/${b.id}: bo'yi chegaradan chiqdi`);
    ok(b.w > 0 && b.d > 0 && b.h > 0, `${nom}/${b.id}: nol o'lcham`);
  }
  if (kat === 'window') {
    const sh = B.filter(b => b.tur === 'shisha'), pt = B.find(b => b.tur === 'peshtaxta');
    ok(sh.length >= 2, nom + ': 2 qanot shishasi yo\'q');
    ok(B.some(b => b.id === 'ustun'), nom + ': o\'rta ustun yo\'q');
    ok(pt && Math.abs(y(pt) - (d / 2 + PEShTAXTA_CHIQISH)) < 0.01, nom + ': peshtaxta chiqishi');
    const ramka = B.filter(b => b.id.startsWith('rama-'));
    ok(ramka.length === 4 && ramka.every(b => b.tur === 'ramka'), nom + ': 4 ta rama');
    ok(!B.some(b => b.tur === 'qanot'), nom + ': oynada yog\'och qanot bo\'lmasin');
  } else {
    ok(B.some(b => b.tur === 'qanot' && b.w > w * 0.8 && b.h > h * 0.9), nom + ': to\'liq qanot');
    ok(B.filter(b => b.tur === 'ruchka').length >= 2, nom + ': ruchka');
    ok(B.filter(b => b.id.startsWith('korobka')).length === 3, nom + ': korobka');
    ok(!B.some(b => b.tur === 'shisha'), nom + ': eshikda shisha bo\'lmasin');
  }
}
ok(OYNA_SUKUT_Z === 900, 'sukut z 900');
console.log(xato ? `❌ deraza3d: ${xato} xato` : '✅ deraza3d: reja o\'lchamlari to\'g\'ri');
process.exit(xato ? 1 : 0);
