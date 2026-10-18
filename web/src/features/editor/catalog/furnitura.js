import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { openSheet, patchSheet } from '../../../store/ui.js';
import { raqam } from '../../../shared/lib/format.js';
import { t } from '../../../i18n/index.js';

/* TZ-23 C3: furnitura katalogi (ERP, 1978 ta: ruchka, petlya, napravlyayushiy, oyoq …) — ko'rish va qidirish.
 *   "Loyihada" — joriy loyiha furniturasi (hisobdagi satrlar: soni, narxi; narx yo'q bo'lsa — "narx yo'q", qoida 4.3);
 *   "Katalog" — nom, SKU yoki ERP ID bo'yicha qidiruv, toifa bo'yicha saralash. Narx hisobiga tegmaydi (faqat ko'rish). */
const MAX = 100;
const nr = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');

/** furnitura zapchasti rasmi (rasmlar.json.furnitura: katalog id → yo'l); yo'q bo'lsa — null (hozirgi ko'rinish) */
const rasmYol = (H, id) => { const y = H && H.rasmlar && H.rasmlar.furnitura && H.rasmlar.furnitura[id]; return y ? '/' + y : null; };

export function openFurnitura() { openSheet('furnitura', { q: '', cat: null, tab: 'loyiha' }); }

export function useFurnituraVaraq() {
  const q = useSlice('ui').vq || {};
  useSlice('project');
  const H = project.H, items = Object.values((H && H.furnById) || {}).filter(it => it.uzs > 0 && it.price_src !== 'no_price' && it.price_src !== 'yoq');   // #151: narxsizlar katalogda ko'rinmaydi (loyihadagilari "Loyihada" ro'yxatida qoladi)
  const narx = (uzs) => (uzs > 0 ? raqam(uzs) + ' ' + t('umumiy.som') : t('mebel.narx_yoq'));

  /* loyihada: hisobdagi "Furnitura" satrlari */
  const lines = ((project.res && project.res.prod && project.res.prod.lines) || []).filter(l => l.group === 'Furnitura');
  const loyiha = lines.map(l => ({ name: l.name || l.code, sub: [l.id ? 'ID ' + l.id : l.code, l.qty + ' ' + (l.unit && l.unit !== 'dona' ? l.unit : t('hujjat.u_dona'))].join(' · '),
    price: l.no_price ? t('mebel.narx_yoq') : raqam(l.amount) + ' ' + t('umumiy.som'), yoq: !!l.no_price, rasm: rasmYol(H, l.id) }));
  const jami = lines.reduce((a, l) => a + (l.amount || 0), 0);

  /* katalog: toifalar (ko'pidan kamiga) va qidiruv */
  const sanoq = {};
  for (const it of items) sanoq[it.cat || '—'] = (sanoq[it.cat || '—'] || 0) + 1;
  const toifalar = Object.entries(sanoq).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const sq = nr(q.q).trim();
  let pool = items;
  if (q.cat) pool = pool.filter(it => (it.cat || '—') === q.cat);
  if (sq) pool = pool.filter(it => nr(it.name + ' ' + it.sku + ' ' + it.id).includes(sq));
  const topildi = pool.length;
  pool = pool.slice().sort((a, b) => (b.uzs > 0) - (a.uzs > 0)).slice(0, MAX);

  return {
    tablar: [['loyiha', t('furnitura.loyihada', { n: lines.length })], ['katalog', t('furnitura.katalog', { n: items.length })]]
      .map(([k, label]) => ({ label, on: (q.tab || 'loyiha') === k, pick: () => patchSheet({ tab: k }) })),
    tab: q.tab || 'loyiha',
    loyiha, jami: lines.length ? t('furnitura.jami', { s: raqam(jami) }) : null, narxsiz: lines.filter(l => l.no_price).length,
    q: q.q || '', onQ: ev => patchSheet({ q: ev.target.value }),
    toifalar: [{ label: t('mebel.rang_hammasi'), on: !q.cat, pick: () => patchSheet({ cat: null }) }]
      .concat(toifalar.slice(0, 14).map(c => ({ label: c, on: q.cat === c, pick: () => patchSheet({ cat: q.cat === c ? null : c }) }))),
    katalog: pool.map(it => ({ name: it.name, sub: [it.sku, it.cat, 'ID ' + it.id].filter(Boolean).join(' · '), price: narx(it.uzs), yoq: !(it.uzs > 0), rasm: rasmYol(H, it.id) })),
    soni: topildi > MAX ? t('mebel.plita_soni', { n: MAX, jami: topildi }) : null
  };
}
