#!/usr/bin/env python3
"""Plita va furnitura kataloglarini ERP /api/v2/products/ eksportiga moslash (egasi #295: "narxni to'g'irlab qo'y, katta ERPni tekshir", 2026-10-22).

Reja (kim bilan kim mos, nima o'zgaradi) — scripts/katalog_erp_moslash.mjs (erpSinxron.js mahsulotFarq: nomKalit + SKU, bir qiymatli bo'lsa).
Bu skript rejani asl JSON formatida (indent=1; 19.0 va 2800 farqi saqlanadi) yozadi.

ERP eksporti — lokal maxfiy fayl (Smart3D_malumot/, gitga KIRMAYDI; ERP ga bu skript ulanmaydi):
  python3 -I scripts/katalog_erp_yangilash.py <erp-mahsulotlar-2026-10-22.json> [--sana 2026-10-22] [--dry-run] [--hisobot yol.json]

Plita (sheet-catalog.json + materials-index.json — ikkalasi bir xil qiymat, narx_import.py kabi):
  · uzs  ← ERP display_price_uzs (> 0 bo'lsa; katalogda narx yo'q bo'lsa ham to'ldiriladi); src = "erp_api_<sana>"
  · usd  ← ERP price_usd (narx yozilganda)
  · l, w ← ERP length/width (ikkalasi > 100; nomdagi maydon — 4,575 va h.k. — ERP formatiga zid bo'lsa tegilmaydi)
  · th   O'ZGARMAYDI (erpKod() kaliti; ERP qalinligi ba'zan noto'g'ri) — farqlar hisobotda
  · ERP'da narxsiz / noaniq / topilmagan — qiymat O'ZGARMAYDI (qoida 4.3)
Stoleshnitsa (stoleshnitsa-erp.json): erp_id bo'yicha aniq moslik — narx_m2 ← ERP display_price_uzs (> 0); qoldiq/o'lcham tegilmaydi
Furnitura (furnitura-catalog.json):
  · uzs ← ERP display_price_uzs (> 0), price_src = "erp_api_<sana>" (ERP'ning o'zi qaytargan so'm narxi; kurs ishlatilmaydi), no_price olinadi
  · exchangeRate — ERP dollar-yolg'iz mahsulotlarga qo'llagan kurs (display_price_uzs / price_usd; 1216 qatorda bir xil = 11950), faqat ERP so'm narxi
    bo'lmagan dollar-yolg'iz qatorlar uchun (furnitura_narx_tiklash.py shu kursni o'qiydi)
  · narxi o'zgarmagan qatorning price_src'i tegilmaydi
"""
import argparse
import json
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "app" / "data"
SC, FC, MI, ST = D / "sheet-catalog.json", D / "furnitura-catalog.json", D / "materials-index.json", D / "stoleshnitsa-erp.json"
NOTE_PLITA = "ERP products API"


def load(p):
    return json.loads(p.read_text(encoding="utf8"))


def save(p, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")   # asl format: indent=1


def kurs_aniqla(erp_yol):
    """ERP dollar-yolg'iz mahsulotlarga (so'm narxi — faqat dollardan hisoblanganlar) qo'llagan kurs: display_price_uzs / price_usd — eng ko'p uchragani."""
    c = Counter()
    for m in json.loads(Path(erp_yol).read_text(encoding="utf8")):
        try:
            usd, uzs, p = float(m.get("price_usd") or 0), float(m.get("display_price_uzs") or 0), float(m.get("price") or 0)
        except (TypeError, ValueError):
            continue
        if usd > 0 and uzs > 0 and p == 0:
            c[round(uzs / usd)] += 1
    return c.most_common(1)[0] if c else (0, 0)


def main():
    ap = argparse.ArgumentParser(description="Plita va furnitura kataloglarini ERP eksportiga moslash")
    ap.add_argument("erp", help="ERP /api/v2/products/ eksporti (lokal maxfiy JSON)")
    ap.add_argument("--sana", default="2026-10-22")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--hisobot", help="to'liq hisobot JSON yo'li")
    args = ap.parse_args()
    yol, dry, sana, hisobot_yol = args.erp, args.dry_run, args.sana, args.hisobot
    src = "erp_api_" + sana

    with tempfile.TemporaryDirectory() as t:
        reja_yol = Path(t) / "reja.json"
        r = subprocess.run(["node", "--no-warnings", str(ROOT / "scripts" / "katalog_erp_moslash.mjs"), yol, "--out", str(reja_yol)],
                           capture_output=True, text=True, cwd=ROOT)
        if r.returncode != 0:
            sys.exit("reja tuzilmadi:\n" + r.stderr[-800:])
        R = json.loads(reja_yol.read_text(encoding="utf8"))

    sc_doc, mi_doc, fc_doc, st_doc = load(SC), load(MI), load(FC), load(ST)
    sheets, midx, items = sc_doc["sheets"], mi_doc["items"], fc_doc["items"]
    assert len(sheets) == len(midx), "sheet-catalog va materials-index uzunligi farq qiladi"

    # ───────── PLITA ─────────
    st = {"narx_ozgardi": 0, "narx_toldirildi": 0, "format_ozgardi": 0, "usd_ozgardi": 0, "bir_xil": 0}
    ozg_p, fmt_p = [], []
    for x in R["plita"]:
        s, m = sheets[x["i"]], midx[x["i"]]
        assert (s["sku"], s["name"]) == (m["sku"], m["name"]), f"materials-index tartibi mos emas: {s['name']}"
        o = {"sku": s["sku"], "nom": s["name"]}
        ozgardi = False
        if x["yangi_uzs"] > 0 and round(s.get("uzs") or 0) != x["yangi_uzs"]:
            o.update({"eski_uzs": s.get("uzs") or 0, "yangi_uzs": x["yangi_uzs"], "foiz": x["foiz"]})
            st["narx_toldirildi" if not (s.get("uzs") or 0) > 0 else "narx_ozgardi"] += 1
            s["uzs"] = m["uzs"] = x["yangi_uzs"]
            s["src"] = src
            ozgardi = True
        if x["yangi_usd"] is not None and abs(float(s.get("usd") or 0) - x["yangi_usd"]) > 0.005:
            s["usd"] = m["usd"] = float(x["yangi_usd"])
            st["usd_ozgardi"] += 1
            ozgardi = True
        if x["yangi_lw"]:
            l, w = (float(v) for v in x["yangi_lw"])
            if (float(s["l"]), float(s["w"])) != (l, w):
                fmt_p.append({"sku": s["sku"], "nom": s["name"], "eski": [s["l"], s["w"]], "yangi": [l, w]})
                s["l"] = m["l"] = l
                s["w"] = m["w"] = w
                st["format_ozgardi"] += 1
                ozgardi = True
        if o.get("yangi_uzs"):
            ozg_p.append(o)
        if not ozgardi:
            st["bir_xil"] += 1

    # ───────── FURNITURA ─────────
    kurs, kurs_soni = kurs_aniqla(yol)
    by_id = {str(i["id"]): i for i in items if i.get("id")}
    sf = {"narx_ozgardi": 0, "narx_toldirildi": 0, "usd_ozgardi": 0, "bir_xil": 0, "narxsiz_tegilmadi": 0}
    ozg_f = []
    for x in R["furnitura"]:
        it = by_id[x["id"]]
        if not x["yangi_uzs"] > 0:
            sf["narxsiz_tegilmadi"] += 1
            continue
        ozgardi = False
        if round(it.get("uzs") or 0) != x["yangi_uzs"] or it.get("no_price"):
            ozg_f.append({"id": it["id"], "sku": it.get("sku", ""), "nom": it["name"], "eski_uzs": it.get("uzs") or 0, "yangi_uzs": x["yangi_uzs"], "foiz": x["foiz"],
                          "eski_manba": it.get("price_src", ""), "erp_faol": x["faol"], "erp_narx_turi": x["narx_manba"]})
            sf["narx_toldirildi" if (it.get("no_price") or not (it.get("uzs") or 0) > 0) else "narx_ozgardi"] += 1
            it["uzs"] = x["yangi_uzs"]
            it["price_src"] = src
            it.pop("no_price", None)
            ozgardi = True
        if x["yangi_usd"] is not None and (ozgardi or float(it.get("usd") or 0) > 0) and abs(float(it.get("usd") or 0) - x["yangi_usd"]) > 0.005:
            it["usd"] = float(x["yangi_usd"])
            sf["usd_ozgardi"] += 1
            ozgardi = True
        if not ozgardi:
            sf["bir_xil"] += 1
    eski_kurs = fc_doc.get("exchangeRate")
    if kurs > 0 and kurs_soni >= 100:
        fc_doc["exchangeRate"] = kurs

    # ───────── STOLESHNITSA (erp_id bo'yicha aniq moslik; faqat narx_m2) ─────────
    stol_by = {str(i["erp_id"]): i for i in st_doc["items"]}
    ozg_s = []
    for x in R["stoleshnitsa"]:
        if x["h"] == "ozgardi" and x["yangi"] > 0:
            it = stol_by[str(x["erp_id"])]
            ozg_s.append({"erp_id": it["erp_id"], "sku": it["sku"], "nom": it["nom"], "eski": it["narx_m2"], "yangi": x["yangi"], "foiz": x["foiz"]})
            it["narx_m2"] = x["yangi"]
    if isinstance(st_doc.get("_meta"), dict):
        manba = st_doc["_meta"].get("manba", "").split("; narx_m2")[0]
        st_doc["_meta"]["manba"] = manba + f"; narx_m2 {sana} ERP products API bilan yangilandi (scripts/katalog_erp_yangilash.py)"

    # ───────── _meta ─────────
    sc_doc["_meta"] = (sc_doc["_meta"].split(" ERP API")[0].rstrip(".") +
                       f". ERP API {sana}: narx (display_price_uzs), usd va list formati (length×width) ERP bilan moslandi (bir qiymatli moslik: nom+SKU); "
                       "qalinlik o'zgarmagan (erpKod kaliti). src: katalog | narx-2026 | erp_api_<sana>. Qayta moslash: scripts/katalog_erp_yangilash.py")
    mi_doc["_meta"] = (mi_doc["_meta"].split(" ERP API")[0].rstrip(".") +
                       f". ERP API {sana}: narx/usd/l/w sheet-catalog.json bilan bir xil (scripts/katalog_erp_yangilash.py)") if isinstance(mi_doc.get("_meta"), str) else mi_doc.get("_meta")
    fc_doc["_meta"] = (f"Furnitura katalogi ({len(items)} ta). Narx manbai: Mahsulotlar_Katalog_Narxlari.xlsx / Zapchast_Furnitura, do'kon narx ro'yxati NARX.pdf "
                       f"(2026-10-17; dokon — qator kaliti, scripts/narx_pdf_import.py) va ERP /api/v2/products/ ({sana}; scripts/katalog_erp_yangilash.py). "
                       f"price_src: erp_api_<sana> (ERP display_price_uzs — ERP'ning o'zi qaytargan so'm narxi) | erp_uzs | erp_usd×kurs (kurs {fc_doc.get('exchangeRate')}: "
                       "ERP dollar-yolg'iz mahsulotlarga qo'llagan kurs; faqat so'm narxi yo'q qatorlar uchun) | dokon_<sana> | yoq (narx yo'q — o'ylab topilmaydi). "
                       "Qayta tiklash: scripts/furnitura_narx_tiklash.py (erp_api_ qatorlarga tegmaydi)")

    hisobot = {"sana": sana, "erp_jami": R["erp_jami"], "plita": st,
               "plita_narxsiz_tegilmadi": sum(1 for x in R["plita"] if not x["yangi_uzs"] > 0),
               "plita_noaniq": R["noaniq"]["plita"], "plita_yoq": R["yoq"]["plita"], "th_farq": R["th_farq"], "format_ziddiyat": R["format_ziddiyat"],
               "plita_narx_ozgargan": ozg_p, "plita_format_ozgargan": fmt_p,
               "stoleshnitsa_narx_m2_ozgargan": ozg_s, "furnitura": sf, "furnitura_narx_ozgargan": ozg_f, "furnitura_noaniq": R["noaniq"]["furnitura"],
               "furnitura_katalogda_erpda_topilmadi_yoki_noaniq": len(R["yoq"]["furnitura"]),
               "exchangeRate": {"eski": eski_kurs, "yangi": fc_doc.get("exchangeRate"), "dalil_qator": kurs_soni}}
    print(json.dumps({k: hisobot[k] for k in ("plita", "plita_narxsiz_tegilmadi", "furnitura", "exchangeRate")}, ensure_ascii=False))
    print("stoleshnitsa narx_m2 o'zgardi:", len(ozg_s))
    print("plita: noaniq", len(R["noaniq"]["plita"]), "| ERP'da topilmadi", len(R["yoq"]["plita"]), "| qalinlik farqi (tegilmadi)", len(R["th_farq"]),
          "| furnitura: noaniq", len(R["noaniq"]["furnitura"]), "| topilmadi/noaniq", len(R["yoq"]["furnitura"]))
    if hisobot_yol:
        Path(hisobot_yol).write_text(json.dumps(hisobot, ensure_ascii=False, indent=1), encoding="utf8")
    if dry:
        print("(--dry-run: fayllar yozilmadi)")
        return
    save(SC, sc_doc)
    save(MI, mi_doc)
    save(FC, fc_doc)
    save(ST, st_doc)
    print("yozildi:", ", ".join(p.relative_to(ROOT).as_posix() for p in (SC, MI, FC, ST)))


if __name__ == "__main__":
    main()
