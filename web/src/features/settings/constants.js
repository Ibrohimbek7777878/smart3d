/* TZ-19: Sozlamalar ro'yxatlari. STANOK — server STANOKLAR bilan bir xil (Fayllar → Stanokka ham shuni ishlatadi). */
export const STANOK = [['dxf', 'DXF', 'sozlama.st_dxf'], ['gcode', 'G-code', 'sozlama.st_gcode'], ['ptp', 'PTP', 'sozlama.st_ptp'],
  ['nc', 'NC', 'sozlama.st_nc'], ['xnc', 'XNC', 'sozlama.st_xnc'], ['altendorf', 'Altendorf', 'sozlama.st_altendorf']];   // izoh — lug'at kaliti
export const NEST_F = ['kerf', 'trimL', 'trimW', 'remMinA', 'remMinB', 'remUsableMin'];   // yorliq — t('sozlama.n_' + k)
export const STD_DIMS = ['w', 'd', 'h', 'uzunlik', 'eni'];   // yorliq — t('sozlama.d_' + k)
export const NEST_KEY = 's3d-nest-cfg';   // eski sayt bilan bir xil kalit
