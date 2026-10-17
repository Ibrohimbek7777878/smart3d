/* TZ-25 D: xona devorlari geometriyasi (web/src/services/devor.js) — brauzersiz.
 * Tekshiriladi: 45° ga yopishish va 10 mm; buyruq qatori ("3000", "3000 90", "3000<90", chegara); tozalash (takror, bir
 * chiziqdagi nuqta, yuzasiz); devor uzunligini o'zgartirish (keyingi devor parallel ko'chadi); devorni surish; eng yaqin
 * devor; teshikni sig'dirish va devor o'zgargach moslash; tayyor shakllar (to'rtburchak, L, P). */
const D = await import('../web/src/services/devor.js');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;

/* 1. yopishish */
ok('0° ga yopishadi, uzunlik 10 mm', J(D.yopishtir([0, 0], [2993, 41])) === J({ p: [2990, 0], len: 2990, deg: 0 }), J(D.yopishtir([0, 0], [2993, 41])));
ok('45° ga yopishadi', D.yopishtir([0, 0], [1000, 960]).deg === 45);
ok('90° (yuqoriga) va 180°', D.yopishtir([0, 0], [12, 1500]).deg === 90 && D.yopishtir([0, 0], [-1500, 30]).deg === 180);
ok('Shift — erkin burchak', D.yopishtir([0, 0], [1000, 960], true).deg === 44);

/* 2. buyruq qatori */
ok('"3000" — uzunlik, yo\'nalish yo\'q', J(D.buyruqOqi('3000')) === J({ len: 3000, deg: null }));
ok('"3000 90", "3000<90", "2500,5 45"', D.buyruqOqi('3000 90').deg === 90 && D.buyruqOqi('3000<90').deg === 90 && D.buyruqOqi('2500,5 45').len === 2501);
ok('noto\'g\'ri matn — null; chegaradan tashqari — xato', D.buyruqOqi('abc') === null && D.buyruqOqi('10').xato === 'uzunlik' && D.buyruqOqi('99999').xato === 'uzunlik');
ok('uzunlikBilan: 90° — yuqoriga', J(D.uzunlikBilan([100, 100], 3000, 90)) === J([100, 3100]));

/* 3. tozalash */
ok('takror va bir chiziqdagi nuqta olib tashlanadi', J(D.tozala([[0, 0], [1800, 0], [3600, 0], [3600, 3000], [0, 3000], [0, 0]])) === J([[0, 0], [3600, 0], [3600, 3000], [0, 3000]]));
ok('hammasi bir chiziqda / 2 nuqta — xona emas', D.tozala([[0, 0], [1000, 0], [2000, 0]]) === null && D.tozala([[0, 0], [1000, 0]]) === null);

/* 4. tahrir */
const r = [[0, 0], [3600, 0], [3600, 3000], [0, 3000]];
ok('uzunlik 3600 → 4000: xona eni o\'zgaradi, shakl to\'g\'ri burchakli', J(D.uzunlikniOzgartir(r, 0, 4000)) === J([[0, 0], [4000, 0], [4000, 3000], [0, 3000]]));
ok('uzunlik chegaradan tashqari — null', D.uzunlikniOzgartir(r, 0, 100) === null);
ok('devorni surish: o\'ng devor +500', J(D.devorniSur(r, 1, -500)) === J([[0, 0], [4100, 0], [4100, 3000], [0, 3000]]));
const L = D.tayyorShakl('L');   // standart 5000 × 4000 (egasi #152; oldin 3600 × 3000) — L ning ichki burchagi D·0.6 = 2400
ok('L shaklda devor uzunligi: keyingi devor parallel ko\'chadi', J(D.uzunlikniOzgartir(L, 0, 4000).slice(0, 3)) === J([[0, 0], [4000, 0], [4000, 2400]]));

/* 5. eng yaqin devor, teshik */
ok('eng yaqin devor va masofa', J(D.engYaqinDevor(r, [1800, 50])) === J({ i: 0, t: 1800, d: 50, L: 3600 }));
ok('teshik devorga sig\'diriladi (chetidan 50 mm)', J(D.teshikSigdir(3600, 3400, 900)) === J({ offset: 2650, width: 900 }) && D.teshikSigdir(800, 0, 900) === null);
const t = D.teshiklarniMosla(D.uzunlikniOzgartir(r, 0, 1500), [{ wall: 0, type: 'door', offset: 2000, width: 900 }, { wall: 1, type: 'window', offset: 500, width: 1200 }]);
ok('devor qisqargach: eshik devorga sig\'diriladi, deraza o\'z devorida', t.length === 2 && t[0].offset === 550 && t[1].offset === 500, J(t));

/* 6. tayyor shakllar */
ok('to\'rtburchak, L (6 nuqta), P (8 nuqta) — yuzasi musbat', D.tayyorShakl('rect').length === 4 && L.length === 6 && D.tayyorShakl('P').length === 8
  && ['rect', 'L', 'P'].every(s => D.yuza(D.tayyorShakl(s)) > 0));

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
