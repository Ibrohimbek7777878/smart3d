#!/usr/bin/env python3
"""Egasi to'ldiradigan narx jadvali (TZ-04): narx-toldirish-<sana>.xlsx

Varaqlar: Yo'riqnoma · Zapchastlar · Takliflar · Kromka · Ish haqi va teshik ·
          Narxsiz plita · Narxsiz furnitura · Ustama
Sariq katak — egasi to'ldiradi. To'ldirilgan fayl: scripts/narx_import.py bilan qaytariladi.

Ishlatish:  python3 -B scripts/narx_jadval.py [chiqish.xlsx]
            (standart: Smart3D_malumot/narx-toldirish-<sana>.xlsx — gitga kirmaydi)
"""
import datetime
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True                   # mebelcity-platform papkasiga __pycache__ yozilmasin
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import fr3d_import as F                           # noqa: E402  — tokens() (bir xil o'xshashlik qoidasi)
from xlsx_oddiy import (write_xlsx, ODDIY, SARLAVHA, KIRITISH, MISOL, TITUL, IZOH, SON,  # noqa: E402
                        KIRITISH_SON)

D = ROOT / "app" / "data"
J = lambda name: json.loads((D / name).read_text(encoding="utf8"))  # noqa: E731
SANA = datetime.date.today().isoformat()
IZOH_UMUMIY = ("Sariq kataklarni to'ldiring. Bo'sh qoldirilgan katak hech narsani o'zgartirmaydi. "
               "'MISOL' qatori import qilinmaydi. Narx — so'm, butun son.")


def varaq(name, title, header, widths, example, rows, validations=None, extra=None):
    out = [[(title, TITUL)], [(IZOH_UMUMIY, IZOH)], [], [(h, SARLAVHA) for h in header],
           [(v, MISOL) for v in example]]
    out += rows
    if extra:
        out += [[]] + extra
    return dict(name=name, rows=out, widths=widths, freeze=4, validations=validations or [])


def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "Smart3D_malumot" / f"narx-toldirish-{SANA}.xlsx"
    links = J("id-links.json")["links"]
    mc = J("fragments-mc.json")["fragments"]
    furn = J("furnitura-catalog.json")["items"]
    mats = J("materials.json")
    sheets_cat = J("sheet-catalog.json")["sheets"]
    idx = J("materials-index.json")["items"]

    # ── Zapchastlar: Bazis nomi → ERP ID (69 ta "yo'q") ──
    use = {}
    for f in mc:
        for h in f["hardware"]:
            u = use.setdefault(h["name"], [set(), 0])
            u[0].add(f["code"])
            u[1] += int(h.get("qty") or 0)
    ftok = [(it, F.tokens(it["name"])) for it in furn]
    fmt_narx = lambda it: f'{int(it["uzs"]):,} so\'m'.replace(",", " ") if it.get("uzs") and not it.get("no_price") else "narx yo'q"  # noqa: E731
    zap_rows = []
    for l in links:
        if l["tur"] != "furnitura" or l["holat"] != "yoq":
            continue
        tn = F.tokens(l["nom"])
        scored = sorted(((len(tn & ti) / len(tn | ti), it) for it, ti in ftok if tn and tn & ti),
                        key=lambda x: -x[0])[:3]
        tak = [f'{it["id"]} · {it["name"]} · {fmt_narx(it)} (o\'xshashlik {s:.2f})' for s, it in scored]
        tak += [""] * (3 - len(tak))
        u = use.get(l["nom"], [set(), 0])
        zap_rows.append([l["nom"], (len(u[0]), SON), (u[1], SON), *tak, ("", KIRITISH), ("", KIRITISH)])
    zap_rows.sort(key=lambda r: -r[2][0])

    # ── Takliflar ──
    by_id = {it["id"]: it for it in furn}
    tak_rows = []
    for l in links:
        if l["holat"] != "taklif":
            continue
        it = by_id.get(l.get("id"), {})
        tak_rows.append([l["nom"], l.get("id", ""), l.get("erp_nom", ""), (int(it.get("uzs") or 0), SON),
                         (l.get("oxshashlik", ""), ODDIY), ("", KIRITISH)])

    # ── Kromka ──
    krom_rows = [[e["code"], e.get("name", ""), (e.get("thickness") or "", ODDIY), (e.get("price_m") or 0, SON),
                  e.get("price_src") or "taxmin (bozor oralig'i, tasdiqlanmagan)", ("", KIRITISH_SON), ("", KIRITISH)]
                 for e in mats.get("edge_materials", [])]
    bazis_krom = sorted(l["nom"].replace("\r", " ") for l in links if l["tur"] == "kromka")
    krom_extra = [[("Bazis modullaridagi kromka nomlari (ma'lumot uchun — qaysi kodga mosligini izohda yozing):", IZOH)]]
    krom_extra += [[("· " + n, IZOH)] for n in bazis_krom]

    # ── Ish haqi va teshik ──
    lab = mats.get("labor", {})
    src = lambda m: m.get("price_src") or "taxmin (bozor oralig'i, tasdiqlanmagan)"  # noqa: E731
    ih_rows = [
        ["labor.panel_per_piece", "Ish haqi: arralash + kromka urish + yig'ish, har detal uchun", "so'm/detal",
         (lab.get("panel_per_piece") or 0, SON), src(lab), ("", KIRITISH_SON), ("", KIRITISH)],
        ["labor.per_fragment_min", "Ish haqi: bitta modul uchun eng kami", "so'm/modul",
         (lab.get("per_fragment_min") or 0, SON), src(lab), ("", KIRITISH_SON), ("", KIRITISH)],
    ]
    for h in mats.get("hole_kinds", []):
        ih_rows.append([f'hole.{h["code"]}', h.get("name", ""), "so'm/dona", (h.get("price") or 0, SON), src(h),
                        ("", KIRITISH_SON), ("", KIRITISH)])

    # ── Narxsiz plita (sheet-catalog) — ID materials-index dan ──
    id_of = {(it.get("sku"), it.get("name")): it["id"] for it in idx}
    pl_rows = []
    for s in sheets_cat:
        if s.get("uzs"):
            continue
        pl_rows.append([id_of.get((s.get("sku"), s.get("name")), ""), s.get("sku", ""), s.get("name", ""), s.get("type", ""),
                        (s.get("th") or "", ODDIY), f'{int(s.get("l") or 0)}×{int(s.get("w") or 0)}', ("", KIRITISH_SON)])

    # ── Narxsiz furnitura ──
    fu_rows = [[it["id"], it.get("sku", ""), it.get("name", ""), it.get("cat", ""), ("", KIRITISH_SON)]
               for it in furn if it.get("no_price") or not it.get("uzs")]

    mk = mats.get("pricing", {}).get("markup_pct", 0.35)
    sheets = [
        dict(name="Yo'riqnoma", widths=[110], rows=[
            [(f"Smart3D — narxlarni to'ldirish jadvali ({SANA})", TITUL)], [],
            [("Nima uchun: smetada narxi yo'q yoki taxminiy qatorlar bor. Narx o'ylab topilmaydi — faqat siz yozgan qiymat olinadi.", IZOH)],
            [("Qanday: har varaqda SARIQ kataklarni to'ldiring. Bo'sh katak — o'zgarmaydi. 'MISOL' qatori o'qilmaydi.", IZOH)],
            [("Tayyor bo'lgach faylni saqlab, Claude'ga bering: python3 -B scripts/narx_import.py <fayl> — avval --dry-run bilan tekshiriladi.", IZOH)],
            [],
            [(f"Zapchastlar — Bazis modullaridagi {len(zap_rows)} ta zapchast ERP'da topilmadi. 'ERP ID' ustuniga mos mahsulot ID'sini yozing (takliflardan yoki katalogdan).", IZOH)],
            [(f"Takliflar — {len(tak_rows)} ta o'xshash moslik: 'ha' yoki 'yo'q'.", IZOH)],
            [("Kromka — ERP'da kromka yo'q; hozirgi narxlar taxmin. Metr narxini yozing.", IZOH)],
            [("Ish haqi va teshik — hozirgi stavkalar taxmin. Sex stavkasini yozing.", IZOH)],
            [(f"Narxsiz plita — {len(pl_rows)} ta, Narxsiz furnitura — {len(fu_rows)} ta: ERP'da narxi 0. Bilganlaringizni yozing.", IZOH)],
            [(f"Ustama — hozir {round(mk * 100)}% (kodda turgan qiymat, tasdiqlanmagan).", IZOH)],
        ]),
        varaq("Zapchastlar", "Bazis zapchastlari → ERP mahsuloti (ID)",
              ["Bazis nomi", "Nechta modulda", "Jami dona", "Taklif 1", "Taklif 2", "Taklif 3", "ERP ID (yozing)", "Izoh"],
              [34, 10, 9, 46, 46, 46, 14, 24],
              ["MISOL", 3, 12, "", "", "", "90000123", "ERP'dagi aynan shu mahsulot"], zap_rows),
        varaq("Takliflar", "O'xshash moslik — tasdiqlaysizmi?",
              ["Bazis nomi", "Taklif ERP ID", "ERP nomi", "ERP narxi (so'm)", "O'xshashlik", "Tasdiq (ha / yo'q)"],
              [34, 14, 46, 14, 11, 16], ["MISOL", "90000123", "Петля прямая", 12000, 0.67, "ha"], tak_rows,
              validations=[(f"F6:F{5 + max(1, len(tak_rows))}", ["ha", "yo'q"])]),
        varaq("Kromka", "Kromka metr narxi",
              ["Kod", "Nomi", "Qalinlik, mm", "Hozirgi narx, so'm/m", "Hozirgi manba", "Yangi narx, so'm/m", "Manba / izoh"],
              [10, 24, 11, 14, 30, 14, 30],
              ["MISOL", "PVC kromka 0.4mm", 0.4, 800, "taxmin", 950, "Sotuvchi nomi, 2026-10 narxi"], krom_rows, extra=krom_extra),
        varaq("Ish haqi va teshik", "Sex stavkalari",
              ["Kalit", "Nomi", "Birlik", "Hozirgi qiymat", "Hozirgi manba", "Yangi qiymat", "Manba / izoh"],
              [22, 46, 12, 13, 30, 13, 30],
              ["MISOL", "Ish haqi, har detal uchun", "so'm/detal", 12000, "taxmin", 15000, "Sex hisobi, 2026-10"], ih_rows),
        varaq("Narxsiz plita", "ERP'da narxi 0 bo'lgan plitalar",
              ["ID", "SKU", "Nomi", "Turi", "Qalinlik", "Format", "Narx, so'm/varaq"],
              [11, 14, 46, 9, 9, 12, 15],
              ["MISOL", "DM-9604", "Акрил Китай 19мм DM-9604", "AKRIL", 19, "2800×1220", 850000], pl_rows),
        varaq("Narxsiz furnitura", "ERP'da narxi 0 bo'lgan furnitura",
              ["ID", "SKU", "Nomi", "Kategoriya", "Narx, so'm"],
              [11, 14, 60, 30, 13],
              ["MISOL", "9319329", "Hettich направляющие Quadro 25", "Quadro 25", 185000], fu_rows),
        varaq("Ustama", "Mijoz narxi = tannarx × (1 + ustama)",
              ["Kalit", "Nomi", "Hozirgi, %", "Yangi, %", "Izoh"], [12, 40, 11, 11, 40],
              ["MISOL", "Ustama", 35, 30, "Egasi qarori, 2026-10"],
              [["ustama", "Ustama (foiz)", (round(mk * 100, 2), SON), ("", KIRITISH_SON), ("", KIRITISH)]]),
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_xlsx(out_path, sheets)
    print(json.dumps({"fayl": str(out_path), "zapchast": len(zap_rows), "taklif": len(tak_rows),
                      "kromka": len(krom_rows), "stavka": len(ih_rows), "narxsiz_plita": len(pl_rows),
                      "narxsiz_furnitura": len(fu_rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
