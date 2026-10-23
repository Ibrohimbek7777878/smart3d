#!/usr/bin/env python3
"""ERP stoleshnitsa mahsulotlari (xom JSON ro'yxati) -> app/data/stoleshnitsa-erp.json   (TZ-32 yakuniy, egasi #222 Q1)

Ishlatish:  python3 scripts/stoleshnitsa_erp.py <xom_royxat.json> [sana]
Kirish: ERP mahsulot yozuvlari ro'yxati (maydonlar: id, sku, name, category_name, unit, display_price_uzs,
price_list_uzs, total_stock, is_active). Tarmoqqa chiqmaydi — xom ma'lumot egasining yopiq papkasida.

Qoidalar (narx o'ylab topilmaydi):
  - faqat nomida "Столешница" bor, birligi м2 (ERP'da stoleshnitsa narxi m2 uchun), narxi > 0, faol, qoldig'i yozilgan mahsulot;
  - qalinlik 26 yoki 38 mm (nom/kategoriyadan); chuqurlik (eni) 600 mm — boshqa eni (650, 900, 1200) kiritilmaydi;
  - uzunlik ERP nomida/kategoriyasida yozilgan bo'lsa shu (3050*600*26, 4,1х0,6х38); yozilmagan bo'lsa — egasi #162 standarti [3050, 4200]
    va olcham_manba shuni aytadi;
  - dona narxi = narx_m2 x uzunlik x eni / 1e6 (dvigatel hisoblaydi); narx_m2 = ERP display_price_uzs (tannarx; list — mijoz sotuv narxi).
"""
import json, re, sys, collections

RAZM = re.compile(r'(\d{4})\s*[*xх×]\s*(\d{3,4})\s*[*xх×]\s*(\d{2})')
RAZM_M = re.compile(r'(\d),(\d+)\s*[xх×]\s*0,(\d+)\s*[xх×]\s*(\d{2})')
MM = re.compile(r'(?<!\d)(26|38)\s*мм')
BREND = [('КЕДР', 'Kedr'), ('Ультрадекор', 'Ultradekor'), ('Союз', 'Soyuz'), ('Эггер', 'Egger'), ('Slotex', 'Slotex')]


def qator(r, rad):
    """ERP mahsuloti (id, sku, name, category_name, unit, display_price_uzs, price_list_uzs, total_stock, is_active) -> stoleshnitsa-erp.json yozuvi
    yoki None (rad — Counter: chiqarilish sabablari hisoblanadi). scripts/katalog_yangi_baza.py ham shu funksiyani ishlatadi (qoida bitta)."""
    nom = (r.get('name') or '').strip()
    kat = r.get('category_name') or ''
    if 'столешниц' not in nom.lower() or r.get('unit') != 'м2' or not r.get('is_active', True):
        return None
    narx = float(r.get('display_price_uzs') or 0)
    if narx <= 0:
        rad['narxsiz'] += 1
        return None
    L = W = T = None
    m = RAZM.search(nom) or RAZM.search(kat)
    if m:
        L, W, T = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        m = RAZM_M.search(nom)
        if m:
            L = int(round(float(m.group(1) + '.' + m.group(2)) * 1000))      # 4,1 -> 4100
            W = int(round(float('0.' + m.group(3)) * 1000))                # 0,6 -> 600; 0,65 -> 650
            T = int(m.group(4))
    if T is None:
        mm = MM.search(nom) or MM.search(kat)
        T = int(mm.group(1)) if mm else None
    if T not in (26, 38):
        rad['qalinlik_%s' % T] += 1
        return None
    if W is not None and W != 600:
        rad['eni_%s' % W] += 1
        return None
    manba_o = 'ERP nomi'
    if L is None:
        uz, manba_o = [3050, 4200], "ERP nomida uzunlik yo'q — egasi #162 standarti (3050/4200)"
    else:
        uz = [L]
    brend = next((b for k, b in BREND if k.lower() in nom.lower()), '')
    dekor = re.sub(r'^.*?(?:Столешница)\s*(?:\d{4}\s*[*xх×]\s*\d{3,4}\s*[*xх×]\s*\d{2}\s*мм|\d,\d+\s*[xх×]\s*0,\d+\s*[xх×]\s*\d{2}|%d\s*мм)?\s*' % T, '', nom).strip() or nom
    return {
        'erp_id': r['id'], 'sku': (r.get('sku') or '').strip(), 'nom': nom, 'brend': brend, 'dekor': dekor,
        'qalinlik': T, 'uzunliklar': uz, 'eni': 600, 'olcham_manba': manba_o,
        'narx_m2': round(narx), 'narx_list_m2': round(float(r['price_list_uzs'])) if r.get('price_list_uzs') else None,
        'qoldiq_m2': round(float(r.get('total_stock') or 0), 2), 'kategoriya': kat,
    }


def sukut_tanla(out):
    """qalinlik (26/38) bo'yicha eng ko'p qoldiqli dekor (teng bo'lsa — kichik erp_id) -> { '26': erp_id, '38': erp_id }"""
    sukut = {}
    for T in (26, 38):
        cand = [x for x in out if x['qalinlik'] == T and x['qoldiq_m2'] > 0]
        if cand:
            b = max(cand, key=lambda x: (x['qoldiq_m2'], -x['erp_id']))
            sukut[str(T)] = b['erp_id']
    return sukut


def main():
    src = sys.argv[1]
    sana = sys.argv[2] if len(sys.argv) > 2 else '2026-10-18'
    rows = json.load(open(src))
    out, rad = [], collections.Counter()
    for r in rows:
        x = qator(r, rad)
        if x:
            out.append(x)
    out.sort(key=lambda x: (x['qalinlik'], x['brend'], x['dekor']))
    sukut = sukut_tanla(out)
    json.dump({
        '_meta': {
            'manba': 'ERP ' + sana + ' (mahsulotlar, faqat o\'qish)',
            'birlik': "narx_m2 — 1 m2 narxi (ERP birligi m2: ombor qatorida miqdor x narx = jami); dona narxi = narx_m2 x uzunlik x eni / 1e6",
            'sukut': "egasi aytmagan — qalinlik bo'yicha eng ko'p qoldiqli (qoldiq_m2) dekor",
            'chiqarilgan': 'narxsiz, eni 600 emas, qalinlik 26/38 emas, birligi m2 emas mahsulotlar kiritilmagan',
        },
        'sukut': sukut, 'items': out}, open('app/data/stoleshnitsa-erp.json', 'w'), ensure_ascii=False, indent=1)
    print(len(out), 'ta;', dict(collections.Counter(x['qalinlik'] for x in out)), 'sukut', sukut, 'chiqarilgan', dict(rad))


if __name__ == '__main__':
    main()
