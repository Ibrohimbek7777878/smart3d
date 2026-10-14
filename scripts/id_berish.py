#!/usr/bin/env python3
"""Furnitura katalogiga 8 xonali barqaror ID beradi (TZ-HAQIQIY-MODULLAR A3).

Format — plitalardagi bilan bir xil: {prefiks 2 xona}{tartib 6 xona}.
  Band prefikslar (materials-index.json): 10 LDS · 11 LMD · 40 MDF · 50 HDF · 60 AKR · 70 OYN
  Furnitura: 90 (FUR)

Barqarorlik: ID bir marta berilgach O'ZGARMAYDI. Qayta ishga tushirilsa, IDsiz yangi
mahsulotlarga mavjud eng katta raqamdan keyingisi beriladi.

Ishlatish:  python3 -I scripts/id_berish.py [--dry-run]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "app" / "data" / "furnitura-catalog.json"
PREFIX = "90"


def main():
    dry = "--dry-run" in sys.argv
    cat = json.loads(PATH.read_text(encoding="utf8"))
    items = cat["items"]
    used = [int(it["id"][2:]) for it in items if str(it.get("id", "")).startswith(PREFIX)]
    seq = max(used, default=0)
    new = 0
    for it in items:
        if it.get("id"):
            continue
        seq += 1
        it["id"] = f"{PREFIX}{seq:06d}"
        new += 1
    ids = [it["id"] for it in items]
    assert len(ids) == len(set(ids)), "takroriy ID!"
    print(json.dumps({"jami": len(items), "yangi_id": new, "oxirgi": f"{PREFIX}{seq:06d}"}, ensure_ascii=False))
    if not dry and new:
        PATH.write_text(json.dumps(cat, ensure_ascii=False, indent=1), encoding="utf8")
        print("yozildi:", PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
