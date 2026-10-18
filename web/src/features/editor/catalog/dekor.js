/* Material varag'i: ERP plitalarini dekor bo'yicha guruhlash.
 * ERP nomi: "ЛДСП Эггер 5,796 Белый Альпийский 18мм ST9" → tur (LDSP), ishlab chiqaruvchi (Egger),
 * dekor ("Белый Альпийский"), qalinlik (18). Bir dekorning qalinlik variantlari — bitta plitka. */
const BREND = [
  [/эггер|egger/i, 'Egger'], [/кроностар|kronostar/i, 'Kronostar'], [/кроношпан|kronospan/i, 'Kronospan'],
  [/ультрадекор|ultradekor/i, 'Ultradekor'], [/кастамону|kastamonu/i, 'Kastamonu'], [/алтай|altay/i, 'Altay'],
  [/silkway/i, 'Silkway'], [/moonlight/i, 'Moonlight'], [/кронопол|kronopol/i, 'Kronopol'], [/baeir/i, 'Baeir']
];
const TUR_SOZ = /^(?:ЛДСП|ЛМДФ|МДФ|ЛХДФ|ХДФ|ДСП|АКРИЛ)(?=\s|$)\s*/i;
const SHUM = [
  /\d+(?:[.,]\d+)?\s*(?:мм|mm)(?![а-яёa-z])/gi, /\d{3,4}\s*[*xх×]\s*\d{3,4}(?:\s*[*xх×]\s*[\d.,]+)?/gi, /(?<![\wа-яё])\d[.,]\d+\s*(?:кв|м2)?(?![\wа-яё])/gi,
  /\bST\d*\b/g, /\([^)]*\)/g, /(?<![а-яё])кв(?![а-яё])/gi, /(?<![а-яё])синхро(?: макс)?(?![а-яё])/gi, /(?<![а-яё])(?:индивидуал\.?|упак\.?|без упаковки)/gi
];

export function dekorNomi(name, type) {
  let s = String(name || ''), brend = '';
  for (const [re, nom] of BREND) if (re.test(s)) { brend = nom; s = s.replace(re, ' '); break; }
  s = s.replace(TUR_SOZ, ' ').replace(/(?<![\d.,])[12]\/[12](?![\d.,])/g, ' ');
  for (const re of SHUM) s = s.replace(re, ' ');
  s = s.replace(/[*_,;:|]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) s = String(name || '').replace(TUR_SOZ, '').trim() || String(name || '');
  return { nom: s, brend, key: [type || '', brend, s.toLowerCase()].join('|') };
}

/** plitalar → dekorlar: { key, nom, brend, tur, variantlar: [sheet…] (qalinlik bo'yicha) } */
export function dekorlarga(sheets) {
  const m = new Map();
  for (const sh of sheets) {
    const d = dekorNomi(sh.name, sh.type);
    let g = m.get(d.key);
    if (!g) { g = { key: d.key, nom: d.nom, brend: d.brend, tur: sh.type, variantlar: [] }; m.set(d.key, g); }
    g.variantlar.push(sh);
  }
  for (const g of m.values()) g.variantlar.sort((a, b) => ((+a.th || 0) - (+b.th || 0)) || ((b.uzs > 0) - (a.uzs > 0)));
  return [...m.values()];
}
