/* Smart3D engine/narxTarkib.js — TZ-48 (egasi #301, 7-qaror): NARX TARKIBI — nima qancha va nimadan qanchadan hisoblangani.
 * SOF funksiya (Node va brauzer). productionCost (cutlist.js) chaqiradi; natija prod.tarkib.
 *
 * Bo'limlar (tartib bilan): plita (list soni; stoleshnitsa ham), kromka, raspil (+1 qo'shimcha), prisadka (teshik turlari bo'yicha), Bazis (detal soni × stavka),
 * furnitura, ish haqi, qo'shilgan xizmatlar, ustama. Har qator: nom, miqdor × birlik narx = summa, manba (ERP / egasi / taxmin / mijoz / narx yo'q),
 * qoida (kod — UI tilga o'giradi) va qoida o'zgaruvchilari (qv). Bo'lim `jami` = dvigatel hisobidagi o'sha komponent (sheetCost, raspilCost …);
 * bo'limlar yig'indisi (ustama bilan) AYNAN mijoz narxiga (clientTotal) teng — ustama bo'limi qoldiq emas, balki hisoblangan ustama summasi, shuning uchun
 * test yig'indini mustaqil tekshiradi. «Furniturasiz» jami — furnitura (va unga qo'shilgan ustama) chiqarilgan mijoz narxi. */

const BOLIMLAR = [
  ['plita', (l) => /^Plita/.test(l.group) || l.group === 'Stoleshnitsa'],
  ['kromka', (l) => l.group === 'Kromka'],
  ['raspil', (l) => l.group === 'Raspil'],
  ['prisadka', (l) => l.group === 'Xizmatlar' && /^hole:/.test(l.code) && !l.info],
  ['bazis', (l) => l.group === 'Xizmatlar' && l.code === 'bazis'],
  ['furnitura', (l) => l.group === 'Furnitura'],
  ['ish_haqi', (l) => l.group === 'Ish haqi'],
  ['qosh', (l) => l.qosh === true]
];

/** qator → qoida kodi (UI: narx.q_<kod>) */
function qoida(bolim, l) {
  if (bolim === 'plita') {
    if (l.group === 'Stoleshnitsa') return l.mijoz ? 'mijoz' : 'stol';
    return l.mijoz ? 'mijoz' : l.sigmadi ? 'sigmadi' : (l.narx_qoida || (l.manba === 'yoq' ? 'yoq' : 'asl'));
  }
  if (bolim === 'raspil') return l.code === 'raspil_qosh' ? 'raspil_qosh' : l.code === 'raspil_yupqa' ? 'raspil_yupqa' : 'raspil';
  if (bolim === 'kromka') return 'kromka';
  if (bolim === 'prisadka') return 'prisadka';
  if (bolim === 'bazis') return 'bazis_16_18_19';
  if (bolim === 'furnitura') return 'furnitura';
  if (bolim === 'ish_haqi') return 'ish_haqi';
  return 'qosh_xizmat';
}

/**
 * @param {Array} lines — productionCost qatorlari
 * @param {Object} k — { sheetCost, raspilCost, edgeCost, holeCost, bazisCost, hwCost, laborCost, qoshCost, totalCost, clientTotal, clientFurnsiz,
 *                       markup, markupManba, ustamaAsos, plitaSz }
 */
export function narxTarkibiQur(lines, k) {
  const jami = { plita: k.sheetCost, kromka: k.edgeCost, raspil: k.raspilCost, prisadka: k.holeCost, bazis: k.bazisCost, furnitura: k.hwCost, ish_haqi: k.laborCost, qosh: k.qoshCost };
  const bolimlar = [];
  for (const [kod, mos] of BOLIMLAR) {
    const qatorlar = (lines || []).filter(l => !l.info && mos(l)).map(l => ({
      kod: l.code, nom: l.name, miqdor: l.qty, birlik: l.unit, narx: l.unit_price, summa: l.amount,
      manba: l.mijoz ? 'mijoz' : (l.no_price || l.manba === 'yoq' ? 'yoq' : (l.manba || 'taxmin')), qoida: qoida(kod, l),
      qv: {
        ...(l.narx_tannarx ? { tannarx: l.narx_tannarx } : {}), ...(l.narx_lst ? { lst: l.narx_lst } : {}),
        ...(kod === 'plita' && l.narx_qoida ? { chegirma: k.plitaSz.chegirma, koef: k.plitaSz.koef } : {}),
        ...(kod === 'kromka' ? { chiqit: l.chiqit_foiz, sof: l.metr_sof } : {}),
        ...(l.xizmat ? { xizmat: l.xizmat } : {}), ...(l.sigmadi ? { soni: l.sigmadi.soni } : {}), ...(l.util != null ? { util: l.util } : {})
      }
    }));
    if (qatorlar.length || jami[kod] > 0) bolimlar.push({ kod, jami: jami[kod], qatorlar });
  }
  /* ustama — plita (stoleshnitsa ham) va furnitura narxiga; xizmatlar ustamasiz */
  const ustamaSumma = k.clientTotal - k.totalCost;
  bolimlar.push({ kod: 'ustama', jami: ustamaSumma, qatorlar: [{ kod: 'ustama', nom: 'Ustama', miqdor: Math.round(k.markup * 1000) / 10, birlik: '%', narx: k.ustamaAsos, summa: ustamaSumma,
    manba: k.markupManba, qoida: 'ustama', qv: { asos: k.ustamaAsos } }] });
  return {
    bolimlar,
    jami: k.clientTotal,                         // = bo'limlar yig'indisi (ustama bilan)
    furnsiz: k.clientFurnsiz,                    // «Furniturasiz» jami
    furnituraJami: k.clientTotal - k.clientFurnsiz   // furnitura va unga qo'shilgan ustama
  };
}
