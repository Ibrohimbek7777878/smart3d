/* TZ-19: Sozlamalar ro'yxatlari. STANOK — server STANOKLAR bilan bir xil (Fayllar → Stanokka ham shuni ishlatadi). */
export const STANOK = [['dxf', 'DXF', 'raskroy — CNC/lazer'], ['gcode', 'G-code', 'ISO/Fanuc kontur kesish'], ['ptp', 'PTP', 'panel joylashuvi'],
  ['nc', 'NC', 'teshiklar (Excellon)'], ['xnc', 'XNC', 'GibLab Excel importi'], ['altendorf', 'Altendorf', 'formatli arra — fazali kesim']];
export const NEST_F = [['kerf', 'Arra qalinligi, mm'], ['trimL', 'Trim (old), mm'], ['trimW', 'Trim (yon), mm'], ['remMinA', 'Qoldiq min A, mm'],
  ['remMinB', 'Qoldiq min B, mm'], ['remUsableMin', 'Delovoy qoldiq min, m²']];
export const STD_LABEL = { w: 'Eni (w)', d: 'Chuqurligi (d)', h: "Bo'yi (h)", uzunlik: 'Asos uzunligi', eni: 'Asos eni' };
export const NEST_KEY = 's3d-nest-cfg';   // eski sayt bilan bir xil kalit
