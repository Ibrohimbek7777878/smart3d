/* TZ-59: furnitura rasmi — katalog ID bo'yicha (rasmlar.json "furnitura": id → yo'l). Rasm yo'q bo'lsa null (o'ylab topilmaydi). */
export const rasmYol = (H, id) => { const y = H && H.rasmlar && H.rasmlar.furnitura && id != null && H.rasmlar.furnitura[id]; return y ? '/' + y : null; };
/** namuna rasm: shu turdagi (boshqa brend) rasm — aniq mahsulot rasmi emas (rasmlar.json _meta.namuna) */
export const rasmNamuna = (H, id) => !!(H && H.rasmlar && H.rasmlar._meta && (H.rasmlar._meta.namuna || []).includes(String(id)));
