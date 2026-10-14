#!/usr/bin/env python3
"""Furnitura narxlarini manba ERP Excel faylidan qayta tiklaydi.

AUDIT-2026-10-14: app/data/furnitura-catalog.json dagi 187 ta furnituraga manbada narxi 0
bo'lgan holda narx qo'yib qo'yilgan edi. Qoida (TZ §1.2): narx hech qachon o'ylab topilmaydi.

Har bir element uchun (SKU + nom bo'yicha manbadagi qator):
  · manbada so'm narxi > 0      → uzs = manba, price_src = "erp_uzs"
  · faqat dollar narxi > 0      → uzs = usd × kurs (fayldagi exchangeRate), price_src = "erp_usd×kurs"
  · ikkalasi ham 0 yoki yo'q    → uzs = usd = 0, no_price = true, price_src = "yoq"

Ishlatish:  python3 -I scripts/furnitura_narx_tiklash.py [--dry-run]
Faqat Python standart kutubxonasi (openpyxl shart emas).
"""
import html
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "Mahsulotlar_Katalog_Narxlari.xlsx"
SHEET = "Zapchast_Furnitura"
JSON_PATH = ROOT / "app" / "data" / "furnitura-catalog.json"


def read_sheet(path, name):
    """Inline-string xlsx varag'ini {ustun: qiymat} qatorlari ro'yxati sifatida o'qiydi."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        x = z.read("xl/sharedStrings.xml").decode()
        for si in re.findall(r"<si>(.*?)</si>", x, re.S):
            shared.append(html.unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si))))
    names = re.findall(r'<sheet [^>]*name="([^"]+)"', z.read("xl/workbook.xml").decode())
    x = z.read(f"xl/worksheets/sheet{names.index(name) + 1}.xml").decode()
    rows = []
    for row in re.findall(r"<row[^>]*>(.*?)</row>", x, re.S):
        cells = {}
        for m in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', row, re.S):
            col, attrs, body = m.group(1), m.group(2), m.group(3) or ""
            inline = re.search(r"<is>.*?<t[^>]*>([^<]*)</t>", body, re.S)
            v = re.search(r"<v>([^<]*)</v>", body)
            val = html.unescape(inline.group(1)) if inline else (v.group(1) if v else None)
            if 't="s"' in attrs and val is not None:
                val = shared[int(val)]
            cells[col] = val
        rows.append(cells)
    return rows


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def main():
    dry = "--dry-run" in sys.argv
    rows = read_sheet(XLSX, SHEET)
    header, data = rows[0], rows[1:]
    # ustunlar: B=Nomi, D=Artikul (SKU), F=Narx (so'm), G=Narx ($)
    assert header.get("B") == "Nomi" and "SKU" in (header.get("D") or ""), header
    src = {}
    for r in data:
        src.setdefault(((r.get("D") or "").strip(), (r.get("B") or "").strip()), r)

    cat = json.loads(JSON_PATH.read_text(encoding="utf8"))
    rate = cat.get("exchangeRate") or 12800
    stats = {"erp_uzs": 0, "erp_usd×kurs": 0, "yoq": 0, "manbada_yoq": 0, "ozgardi": 0}
    for it in cat["items"]:
        r = src.get((it.get("sku", "").strip(), it.get("name", "").strip()))
        if r is None:
            stats["manbada_yoq"] += 1
            continue
        uzs, usd = num(r.get("F")), num(r.get("G"))
        before = (it.get("uzs"), it.get("usd"))
        it.pop("no_price", None)
        if uzs > 0:
            it["uzs"], it["usd"], it["price_src"] = round(uzs), usd, "erp_uzs"
        elif usd > 0:
            it["uzs"], it["usd"], it["price_src"] = round(usd * rate), usd, "erp_usd×kurs"
        else:
            it["uzs"], it["usd"], it["price_src"], it["no_price"] = 0, 0, "yoq", True
        stats[it["price_src"]] += 1
        if (it["uzs"], it["usd"]) != before:
            stats["ozgardi"] += 1

    cat["_meta"] = (f"Furnitura katalogi ({len(cat['items'])} ta). Narx manbai: {XLSX.name} / {SHEET}. "
                    f"price_src: erp_uzs | erp_usd×kurs (kurs {rate}) | yoq (narx yo'q — o'ylab topilmaydi). "
                    "Qayta tiklash: scripts/furnitura_narx_tiklash.py")
    print(json.dumps(stats, ensure_ascii=False))
    if not dry:
        JSON_PATH.write_text(json.dumps(cat, ensure_ascii=False, indent=1), encoding="utf8")
        print("yozildi:", JSON_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
