#!/usr/bin/env python3
"""TZ-17: bizning .bpj faylini ERP o'quvchisi (mebelcity-platform/widget_bazis/bpj_parser.py — faqat o'qiladi,
qoida 2.10) bilan o'qiydi va natijani JSON qilib chiqaradi. tests/bpj_check.mjs chaqiradi.
Ishlatish: python3 -I tests/bpj_erp.py fayl.bpj   (parser yo'q bo'lsa — {"yoq": true})"""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True     # parser boshqa loyihada — u yerga __pycache__ yozilmasin
WB = Path(__file__).resolve().parent.parent.parent / "mebelcity-platform" / "widget_bazis"
if not (WB / "bpj_parser.py").exists():
    print(json.dumps({"yoq": True}))
    sys.exit(0)
sys.path.insert(0, str(WB))
import bpj_parser  # noqa: E402

r = bpj_parser.parse_bpj(Path(sys.argv[1]).read_bytes())
print(json.dumps({
    "model_name": r["model_name"],
    "total_panels": r["total_panels"],
    "has_giblab": r["has_giblab"],
    "panels": [{k: p[k] for k in ("name", "art_pos", "dl", "dw", "dp", "count", "material")} for p in r["panels"]],
    "edges": len(r["edges"]),
    "materials": [m["name"] for m in r["materials"]],
}, ensure_ascii=False))
