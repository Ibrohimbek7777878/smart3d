#!/usr/bin/env python3 -I
"""ERP eksportidagi furnitura rasmlari -> app/data/rasm/furnitura/<id>.webp + app/data/rasmlar.json.
Ishlatish: python3 -I scripts/erp_rasmlar.py [manba.json]
Manba (ERP eksporti) git'ga kirmaydi. Chiqishda host nomi, narx, mijoz ma'lumoti YOZILMAYDI."""
import io, json, os, re, sys, urllib.request, datetime
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANBA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'Smart3D', 'Smart3D_malumot', 'erp-rasmlar-2026-10-18.json')
DATA = os.path.join(ROOT, 'app', 'data')
OUT = os.path.join(DATA, 'rasm', 'furnitura')
MAXPX = 256

def nom(s):
    s = re.sub(r'^\s*[\d\-\.]+\s+', '', str(s or '')).lower().replace('ё', 'е')
    return re.sub(r'[^0-9a-zа-я]+', '', s)

def main():
    erp = json.load(open(MANBA, encoding='utf-8'))['mahsulotlar']
    kat = json.load(open(os.path.join(DATA, 'furnitura-catalog.json'), encoding='utf-8'))['items']
    by_sku, by_nom = {}, {}
    for x in kat:
        if x.get('sku'): by_sku.setdefault(str(x['sku']).strip().lower(), x)
        by_nom.setdefault(nom(x.get('name')), []).append(x)
    os.makedirs(OUT, exist_ok=True)
    res, used, miss = {}, 0, []
    for m in erp:
        x = by_sku.get(str(m.get('sku') or '').strip().lower())
        if not x:
            c = by_nom.get(nom(m.get('name')), [])
            x = c[0] if len(c) == 1 else None
        url = m.get('main_thumbnail') or m.get('main_image')
        if not x or not url or x['id'] in res: miss.append(m.get('sku')); continue
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Smart3D'}), timeout=30).read()
            im = Image.open(io.BytesIO(raw)); im.load()
            if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'transparency' in im.info else 'RGB')
            im.thumbnail((MAXPX, MAXPX))
            im.save(os.path.join(OUT, x['id'] + '.webp'), 'WEBP', quality=80, method=6)
            res[x['id']] = 'data/rasm/furnitura/' + x['id'] + '.webp'
        except Exception as e:
            miss.append(str(m.get('sku')) + ' (' + type(e).__name__ + ')')
    meta = {'sana': datetime.date.today().isoformat(), 'soni': len(res), 'manba': 'ERP eksporti',
            'eslatma': "furnitura: katalog id -> rasm yo'li; materiallar: dekor kaliti -> rasm yo'li (hozircha bo'sh)"}
    old = {}
    p = os.path.join(DATA, 'rasmlar.json')
    if os.path.exists(p): old = json.load(open(p, encoding='utf-8'))
    json.dump({'_meta': meta, 'furnitura': dict(sorted(res.items())), 'materiallar': old.get('materiallar', {})},
              open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sz = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'mos: {len(res)}/{len(erp)}; mos kelmadi: {len(miss)}; jami {sz//1024} KB')

main()
