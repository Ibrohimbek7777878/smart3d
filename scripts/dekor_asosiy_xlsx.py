"""Asosiy 100 dekor (egasi #182) — sex ma'lumotidan oraliq JSON: GibLab kroy natijalari ("Material bo'yicha") va ERP qoldig'i.

Ishlatish (sex ma'lumoti maxfiy — natija repoga tushmaydi, vaqtinchalik papkaga yoziladi):
  python3 -I scripts/dekor_asosiy_xlsx.py <Smart3D_toplam papkasi> <chiqish.json>
Natija: { giblab: { "<buyurtma raqami>": [[material nomi, listlar soni], …] }, qoldiq: [{ id, nom, uzs, th, qoldiq }] }
Keyin: node scripts/dekor_asosiy.mjs <chiqish.json> <bazis.json>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx_oddiy import read_xlsx  # noqa: E402


def main(toplam, chiqish):
    g = read_xlsx(os.path.join(toplam, '06_kroy_natijalari', 'GibLab_kroy_natijalari_30.xlsx'))["Material bo'yicha"]
    gib = {}
    for r in g[1:]:
        if not r or r[0] is None or not r[1]:
            continue
        gib.setdefault(str(int(r[0])), []).append([r[1], r[4] or 0])
    m = read_xlsx(os.path.join(toplam, '03_material_narxlar', 'Materiallar_va_narxlar.xlsx'))
    q = []
    for sh in ('LDSP', 'LMDF', 'MDF'):
        for r in m[sh][1:]:
            if r and r[2]:
                q.append({'id': r[0], 'nom': str(r[2]).strip(), 'uzs': r[5], 'th': r[9], 'qoldiq': r[10] or 0})
    with open(chiqish, 'w') as f:
        json.dump({'giblab': gib, 'qoldiq': q}, f, ensure_ascii=False)
    print(len(gib), 'buyurtma,', len(q), 'material')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
