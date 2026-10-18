/* Katalog kodlari almashuvi — eski loyihalar ochilganda avtomatik (yangi sayt va eski sayt bir xil).
 *
 * 2026-10-16 (egasi, SORIZLAR #119): o'rnatma texnika kodlari stollar bilan to'qnashardi — SP-T-001…006 ham stol
 * (fragments.json), ham texnika (appliances.json) edi; texnika katalogni ustidan yozgani uchun 6 ta stol ko'rinmasdi.
 * Texnika SP-TX-… ga ko'chdi, stollar o'z kodida qoldi. Eski hujjatdagi bu kodlar texnika edi (stollarni katalogdan
 * qo'yib bo'lmasdi) — faqat nomi aniq stol bo'lsa, o'zgarmaydi.
 */
export const TEXNIKA_KOD = {
  'SP-T-001': 'SP-TX-001', 'SP-T-002': 'SP-TX-002', 'SP-T-003': 'SP-TX-003', 'SP-T-004': 'SP-TX-004',
  'SP-T-005': 'SP-TX-005', 'SP-T-006': 'SP-TX-006', 'SP-T-008': 'SP-TX-008'
};
const STOL_NOMI = /stol|kofegini|karolina|стол|desk|table/i;

/** hujjatdagi eski kodlarni yangisiga o'tkazadi (joyida); o'zgargan joylashuvlar soni */
export function eskiKodlar(doc) {
  let n = 0;
  for (const p of (doc && doc.placements) || []) {
    const yangi = TEXNIKA_KOD[p && p.frg];
    if (!yangi || (p.name && STOL_NOMI.test(p.name))) continue;
    p.frg = yangi;
    n++;
  }
  return n;
}
