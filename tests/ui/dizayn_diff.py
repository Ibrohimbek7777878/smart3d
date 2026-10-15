"""TZ-09: dizayn va React skrinshotlarini pikselma-piksel solishtirish.
Ishlatish: python3 -I tests/ui/dizayn_diff.py <OUT papka> [chegara_foiz=0.5]
3D maydonlar (masks.json) ikkala tomonda ham chetlab o'tiladi. Chegaradan oshsa — yonma-yon rasm (yonma-*.png) va chiqish kodi 1."""
import json, os, sys
from PIL import Image, ImageChops, ImageDraw

out = sys.argv[1]
# Egasi qarori bilan dizayndan ATAYLAB farq qiladigan ekranlar (TZ-09). Farq ko'rsatiladi, yonma-yon rasm olinadi.
KUTILGAN = {
    '1-royxat': 'Q2: Email maydoni (email + parol bilan kirish)',
    '2-kirish': 'Q2: Telefon o\'rniga Email',
    # TZ-09 §9: ma'lumotli ekranlar — haqiqiy loyiha, hisob va 3D (bizning sahna); joylashuv/uslub yonma-yon solishtiriladi
    '5-mebel': 'haqiqiy katalog (121) va 3D sahna',
    '6-xona': 'haqiqiy xona va oshxona elementlari',
    '7-narx': 'haqiqiy hisob (kotirovka, tannarx, raskroy)',
    '8-fayllar': 'haqiqiy tekshiruv natijasi',
    '9-loyihalar': 'haqiqiy loyihalar ro\'yxati (serverdan)',
}
limit = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
masks = {}
for f in os.listdir(out):
    if f.endswith('-masks.json'):
        tag, w = f.split('-')[:2]
        for name, rects in json.load(open(os.path.join(out, f))).items():
            masks[(tag, w, name)] = rects

bad = 0
rows = []
for f in sorted(os.listdir(out)):
    if not f.startswith('dizayn-') or not f.endswith('.png'):
        continue
    _, w, rest = f.split('-', 2)
    name = rest[:-4]
    rf = os.path.join(out, f'react-{w}-{name}.png')
    if not os.path.exists(rf):
        rows.append((w, name, 'REACT SKRINSHOTI YO\'Q', '')); bad += 1; continue
    a = Image.open(os.path.join(out, f)).convert('RGB')
    b = Image.open(rf).convert('RGB')
    if a.size != b.size:
        rows.append((w, name, f'O\'LCHAM FARQ {a.size} {b.size}', '')); bad += 1; continue
    m = Image.new('L', a.size, 255)
    d = ImageDraw.Draw(m)
    for rect in masks.get(('dizayn', w, name), []) + masks.get(('react', w, name), []):
        d.rectangle(rect, fill=0)
    diff = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
    diff = ImageChops.multiply(diff, m)
    n = diff.histogram()[255]
    area = sum(m.histogram()[255:]) or 1
    pct = 100 * n / area
    ok = pct <= limit
    sabab = KUTILGAN.get(name)
    if not ok or sabab:
        if not ok and not sabab:
            bad += 1
        s = Image.new('RGB', (a.width * 2 + 10, a.height), (255, 0, 0))
        s.paste(a, (0, 0)); s.paste(b, (a.width + 10, 0))
        s.save(os.path.join(out, f'yonma-{w}-{name}.png'))
    rows.append((w, name, f'{pct:6.2f}%', 'OK' if ok else (f'KUTILGAN FARQ — {sabab}' if sabab else f'FARQ joyi {diff.getbbox()}')))

for r in rows:
    print(f'{r[0]:>5} {r[1]:<16} {r[2]:>10}  {r[3]}')
print(f'\n{"✅ dizayn bilan bir xil" if not bad else f"❌ {bad} ta ekranda farq"} (chegara {limit}%, 3D maydonlar chetlab)')
sys.exit(1 if bad else 0)
