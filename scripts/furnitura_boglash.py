#!/usr/bin/env python3
"""furnitura_boglash.py — TZ-20: modul furniturasini ERP narxiga bog'lash (takrorlanadigan).
Jadval: app/data/furnitura-boglash.json (kod → ID, egasi tasdiqlagan). MC modullari
(fragments-mc.json) dagi hardware[].id shu jadvaldan yoziladi. Bazis importi shu jadvalni
bazisLoyiha(..., {furnituraBoglash}) orqali oladi. Katalog narxlariga tegmaydi.
Ishlatish: python3 scripts/furnitura_boglash.py [--hisobot]"""
import json, sys, pathlib
from collections import Counter
ROOT = pathlib.Path(__file__).resolve().parent.parent / "app" / "data"
def load(n): return json.loads((ROOT / n).read_text(encoding="utf-8"))
links = load("furnitura-boglash.json")["links"]
cat = {i["id"]: i for i in load("furnitura-catalog.json")["items"] if i.get("id")}
for k, i in links.items():
    if i not in cat or not (cat[i].get("uzs") or 0) > 0:
        sys.exit(f"E_BOGLASH_ID: {k} -> {i} katalogda narxli emas")
mc = load("furnitura-catalog.json") and load("fragments-mc.json")
yozildi = 0; narxsiz = Counter()
for f in mc["fragments"]:
    for h in f.get("hardware", []):
        i = links.get(h["code"])
        if i and h.get("id") != i: h["id"] = i; yozildi += 1
        if not h.get("id"): narxsiz[h["code"]] += 1
(ROOT / "fragments-mc.json").write_text(json.dumps(mc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"yozildi: {yozildi}; bog'lanmagan kodlar: {len(narxsiz)}")
if "--hisobot" in sys.argv:
    for k, n in narxsiz.most_common(): print(f"  {n:3d}  {k}")
