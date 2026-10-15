#!/usr/bin/env python3
"""Egasi to'ldirgan narx jadvalini ilova ma'lumotlariga yozish (TZ-04).

Qoidalar:
  · faqat egasi yozgan qiymat olinadi — bo'sh katak hech narsani o'zgartirmaydi;
  · 'MISOL' qatori o'qilmaydi; noto'g'ri qiymat (son emas, ID topilmadi) — o'tkaziladi va hisobotda;
  · har o'zgarish hisobotda: eski → yangi; manba: "egasi, <sana>";
  · yozishdan oldin va keyin sinov oshxonasi smetasi solishtiriladi;
  · zapchast ID'lari o'zgarsa — Bazis modullari qayta import qilinadi (fr3d_import.py).

Ishlatish:  python3 -B scripts/narx_import.py FAYL.xlsx --dry-run   (faqat hisobot)
            python3 -B scripts/narx_import.py FAYL.xlsx             (yozadi)
"""
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from xlsx_oddiy import read_xlsx  # noqa: E402

D = ROOT / "app" / "data"
SANA = datetime.date.today().isoformat()
MANBA = f"egasi, {SANA}"


def load(name):
    return json.loads((D / name).read_text(encoding="utf8"))


def save(name, data):
    (D / name).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")   # asl format: indent=1


def num(v):
    """Katak → son (None — bo'sh). "15 000 so'm", "15000,5", 15000.0 — hammasi qabul qilinadi."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    s = re.sub(r"[\s ]|so'm|so`m|сум|%", "", str(v), flags=re.I).replace(",", ".")
    return float(s)


def erp_id(v):
    if v is None or str(v).strip() == "":
        return None
    s = str(int(v)) if isinstance(v, float) else re.sub(r"\D", "", str(v))
    return s.zfill(8) if s else None


def data_rows(sheet, first_header):
    """Sarlavha qatoridan keyingi ma'lumot qatorlari; MISOL va bo'sh kalit o'tkaziladi, birinchi bo'sh qatorda to'xtaydi."""
    rows = sheet or []
    start = next((i for i, r in enumerate(rows) if r and r[0] == first_header), None)
    if start is None:
        return []
    out = []
    for r in rows[start + 1:]:
        if not r or all(c in (None, "") for c in r):
            break
        if str(r[0]).strip().upper() == "MISOL":
            continue
        out.append(r + [None] * 10)
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    path, dry = Path(sys.argv[1]), "--dry-run" in sys.argv
    wb = read_xlsx(path)
    links_doc, mats, furn_doc = load("id-links.json"), load("materials.json"), load("furnitura-catalog.json")
    sc_doc, idx_doc = load("sheet-catalog.json"), load("materials-index.json")
    furn_by_id = {it["id"]: it for it in furn_doc["items"]}
    link_by_nom = {l["nom"]: l for l in links_doc["links"]}
    changes, errors = [], []
    touched, links_changed = set(), False

    def change(where, old, new):
        changes.append(f"{where}: {old} → {new}")

    # ── Zapchastlar ──
    for r in data_rows(wb.get("Zapchastlar"), "Bazis nomi"):
        i = erp_id(r[6])
        if not i:
            continue
        l, it = link_by_nom.get(r[0]), furn_by_id.get(i)
        if not l:
            errors.append(f"Zapchastlar: '{r[0]}' — Bazis nomi topilmadi"); continue
        if not it:
            errors.append(f"Zapchastlar: '{r[0]}' — ERP ID {i} katalogda yo'q"); continue
        change(f"zapchast '{r[0]}'", l.get("holat"), f"tasdiqlangan {i} ({it['name'][:50]})")
        l.clear(); l.update(nom=r[0], tur="furnitura", holat="tasdiqlangan", id=i, erp_nom=it["name"], sku=it.get("sku"), manba=MANBA)
        if r[7]:
            l["izoh"] = str(r[7])
        touched.add("id-links.json"); links_changed = True

    # ── Takliflar ──
    for r in data_rows(wb.get("Takliflar"), "Bazis nomi"):
        ans = str(r[5] or "").strip().lower()
        if not ans:
            continue
        l = link_by_nom.get(r[0])
        if not l or l.get("holat") != "taklif":
            errors.append(f"Takliflar: '{r[0]}' — taklif holatida emas"); continue
        if ans in ("ha", "xa", "да", "yes"):
            change(f"taklif '{r[0]}'", "taklif", f"tasdiqlangan {l['id']}")
            l["holat"] = "tasdiqlangan"; l["manba"] = MANBA; l.pop("sabab", None); l.pop("oxshashlik", None)
        elif ans in ("yo'q", "yoq", "yo`q", "нет", "no"):
            change(f"taklif '{r[0]}'", "taklif", "rad_etilgan")
            l["holat"] = "rad_etilgan"; l["rad_id"] = l.pop("id", None); l["manba"] = MANBA
            l.pop("erp_nom", None); l.pop("sku", None); l.pop("oxshashlik", None); l["sabab"] = "egasi rad etdi"
        else:
            errors.append(f"Takliflar: '{r[0]}' — javob 'ha' yoki 'yo'q' bo'lishi kerak: {r[5]}"); continue
        touched.add("id-links.json"); links_changed = True

    # ── Kromka ──
    edges = {e["code"]: e for e in mats.get("edge_materials", [])}
    for r in data_rows(wb.get("Kromka"), "Kod"):
        try:
            v = num(r[5])
        except ValueError:
            errors.append(f"Kromka {r[0]}: son emas — {r[5]}"); continue
        if v is None:
            continue
        e = edges.get(r[0])
        if not e or v <= 0:
            errors.append(f"Kromka {r[0]}: kod topilmadi yoki narx ≤ 0"); continue
        change(f"kromka {r[0]} so'm/m", e.get("price_m"), int(round(v)))
        e["price_m"] = int(round(v)); e["price_src"] = MANBA
        if r[6]:
            e["price_note"] = str(r[6])
        touched.add("materials.json")

    # ── Ish haqi va teshik ──
    lab, holes = mats.setdefault("labor", {}), {h["code"]: h for h in mats.get("hole_kinds", [])}
    lab_keys = {"labor.panel_per_piece": "panel_per_piece", "labor.per_fragment_min": "per_fragment_min"}
    lab_done = set()
    for r in data_rows(wb.get("Ish haqi va teshik"), "Kalit"):
        try:
            v = num(r[5])
        except ValueError:
            errors.append(f"{r[0]}: son emas — {r[5]}"); continue
        if v is None:
            continue
        if v < 0:
            errors.append(f"{r[0]}: manfiy qiymat"); continue
        if r[0] in lab_keys:
            k = lab_keys[r[0]]
            change(f"{r[0]}", lab.get(k), int(round(v)))
            lab[k] = int(round(v)); lab_done.add(k)
        elif str(r[0]).startswith("hole.") and r[0][5:] in holes:
            h = holes[r[0][5:]]
            change(f"{r[0]} so'm/dona", h.get("price"), int(round(v)))
            h["price"] = int(round(v)); h["price_src"] = MANBA; h.pop("note", None)
        else:
            errors.append(f"{r[0]}: noma'lum kalit"); continue
        touched.add("materials.json")
    if lab_done:
        if lab_done == set(lab_keys.values()):
            lab["price_src"] = MANBA
            lab["note"] = f"Kesim + yig'ish ish haqi — egasi stavkasi ({SANA})"
        else:
            errors.append("Ish haqi: ikkala stavka to'ldirilmagan — qiymat yozildi, lekin 'taxminiy' belgisi qoladi")

    # ── Narxsiz plita (sheet-catalog + materials-index) ──
    idx_by_id = {it["id"]: it for it in idx_doc["items"]}
    sc_by_key = {(s.get("sku"), s.get("name")): s for s in sc_doc["sheets"]}
    for r in data_rows(wb.get("Narxsiz plita"), "ID"):
        try:
            v = num(r[6])
        except ValueError:
            errors.append(f"Plita {r[0]}: son emas — {r[6]}"); continue
        if v is None:
            continue
        i = erp_id(r[0])
        it = idx_by_id.get(i)
        if not it or v <= 0:
            errors.append(f"Plita {r[0]}: ID topilmadi yoki narx ≤ 0"); continue
        s = sc_by_key.get((it.get("sku"), it.get("name")))
        change(f"plita {i} {it['name'][:40]}", it.get("uzs"), int(round(v)))
        it["uzs"] = int(round(v))
        if s:
            s["uzs"] = int(round(v)); s["src"] = MANBA
        touched.update({"materials-index.json", "sheet-catalog.json"})

    # ── Narxsiz furnitura ──
    for r in data_rows(wb.get("Narxsiz furnitura"), "ID"):
        try:
            v = num(r[4])
        except ValueError:
            errors.append(f"Furnitura {r[0]}: son emas — {r[4]}"); continue
        if v is None:
            continue
        it = furn_by_id.get(erp_id(r[0]))
        if not it or v <= 0:
            errors.append(f"Furnitura {r[0]}: ID topilmadi yoki narx ≤ 0"); continue
        change(f"furnitura {it['id']} {it['name'][:40]}", it.get("uzs"), int(round(v)))
        it["uzs"] = int(round(v)); it["no_price"] = False; it["price_src"] = MANBA
        touched.add("furnitura-catalog.json")

    # ── Ustama ──
    for r in data_rows(wb.get("Ustama"), "Kalit"):
        try:
            v = num(r[3])
        except ValueError:
            errors.append(f"Ustama: son emas — {r[3]}"); continue
        if v is None:
            continue
        if not (0 <= v <= 300):
            errors.append(f"Ustama: {v}% — oraliqdan tashqari"); continue
        pr = mats.setdefault("pricing", {})
        change("ustama %", round((pr.get("markup_pct") or 0) * 100, 2), v)
        pr["markup_pct"] = round(v / 100, 4); pr["price_src"] = MANBA
        pr["note"] = f"Mijoz narxi = tannarx × (1 + markup_pct). Egasi tasdiqladi — {SANA}."
        touched.add("materials.json")

    print(f"=== {path.name}: {len(changes)} ta o'zgarish, {len(errors)} ta muammo ===")
    for c in changes:
        print("  ✓ " + c)
    for e in errors:
        print("  ⚠ " + e)
    if dry or not changes:
        print("(--dry-run: hech narsa yozilmadi)" if dry else "(o'zgarish yo'q)")
        return

    hisob = lambda: json.loads(subprocess.run(["node", str(ROOT / "scripts" / "smeta_hisob.mjs")],  # noqa: E731
                                              capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1])
    before = hisob()
    saved = {"id-links.json": links_doc, "materials.json": mats, "furnitura-catalog.json": furn_doc,
             "sheet-catalog.json": sc_doc, "materials-index.json": idx_doc}
    for name in sorted(touched):
        save(name, saved[name])
        print("  yozildi: app/data/" + name)
    if links_changed:
        print("  Bazis modullari qayta import qilinmoqda (tasdiqlangan ID'lar zapchast kodiga tushadi)...")
        subprocess.run([sys.executable, "-B", str(ROOT / "scripts" / "fr3d_import.py")], check=True)
    after = hisob()
    print(f"  sinov oshxonasi: tannarx {before['tannarx']} → {after['tannarx']} · mijoz {before['mijoz']} → {after['mijoz']}"
          f" · narxsiz {before['narxsiz']} → {after['narxsiz']} · taxminiy {before['taxminiy']} → {after['taxminiy']}")


if __name__ == "__main__":
    main()
