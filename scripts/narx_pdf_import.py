#!/usr/bin/env python3
"""Do'kon narx ro'yxati (NARX.pdf, egasi #142, 2026-10-17) → furnitura katalogi (app/data/furnitura-catalog.json).

PDF — Excel'dan chiqarilgan jadval: # | Артикул | Наименование | Количество (qoldiq) | Цена (1 dona narxi, so'm).
`pdftotext -layout` (poppler) bilan o'qiladi. Katak bir necha qator bo'lsa — raqamli qator oxirgisi, nom boshi yuqorida.

Qoidalar:
  · artikuli katalogdagi SKU bilan mos qator — narxi solishtiriladi; farq bo'lsa yangilanadi (price_src = "dokon_<sana>"),
    ID o'zgarmaydi;
  · yangi qator — katalogga qo'shiladi: ID "90" prefiksi bilan davomi (scripts/id_berish.py bilan bir xil format),
    toifa nomdagi kalit so'zdan; narxi 0 yoki yo'q — no_price, price_src = "yoq" (narx o'ylab topilmaydi, 4.3);
  · qoldiq (Количество) katalogga yozilmaydi — ombor ma'lumoti, narx emas;
  · qayta ishga tushirilsa takror qo'shilmaydi: har qator kaliti — artikul | nom | shu juftlikning tartibi (PDF'da bir xil nomli
    turli mahsulotlar bor, masalan "SAMET SREDNIY 35 SM" — 8 000 va 25 000).
Birlik PDF'da yo'q: samorez/konfirmat kabi qatorlar quti narxi bo'lishi mumkin — modulga bog'lashdan oldin egasi tasdiqlaydi.

Ishlatish:  python3 -I scripts/narx_pdf_import.py <NARX.pdf> [--sana 2026-10-17] [--dry-run]
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "app" / "data" / "furnitura-catalog.json"
PREFIX = "90"

NUM = re.compile(r"^\s*(\d+)\s+(.*?)\s+(-?\d+(?:\.\d+)?)\s+(\d[\d ]*[.,]\d\d)\s*$")
NUM0 = re.compile(r"^\s*(\d+)\s+(.*?)\s+(-?\d+(?:\.\d+)?)()\s*$")          # narxi yo'q qator

# toifa: (naqsh, katalogdagi toifa nomi) — birinchi mosi
TOIFA = [
    (r"PETL|Петл|петл", "Петли"),
    (r"Направляющ|направляющ|ROLIK|TANDEM|SALAZKA|SAMET SREDNIY", "Направляющие"),
    (r"POLKADERJ|Полкодерж", "Полкодержатели"),
    (r"NOSHKA|Ножк|ножк|Опор|опор|Подпятник", "Ножки и опоры"),
    (r"SAMOREZ|SAMAREZ|VINT|Винт|Конфирмат|конфирмат|Дюбель|дюбель|Эксцентрик|эксцентрик|EKSENTRIK|Заглушка|UGOL|Уголок|уголок|SHAYBA|Монтефикс|Стяжка",
     "Крепёж"),
    (r"RUCHKA|Ручка|ручка|SKOBA|^\d{3,4}\s*-?\s*\d{3}\b|^\d{3,4}-\s*\d{3,4}\s*MM", "Ручки"),
    (r"INGCO|Отвертка|Перфоратор|лобзик|Фен |Шпатель|Штангенциркуль|Линейка|Фонарь|диск|RULETKA|уровень|Пистолет|SVIRLO|Сверл|Аккумулятор",
     "Инструменты"),
    (r"SUSHILKA|Сушилк|MOYKA|Мойк|KARGO|Карго|Корзин|Бутылочниц|Выдвижн|Модуль|SMISTITEL|BARNASOS|Ведро|Поддон|STARAX|сифон",
     "Кухонные аксессуары"),
    (r"VESHOLKA|VESHILKA|Вешалк|GARDIROB|Гардероб|Штанг|TURBA|FLYANS|Брюк", "Гардероб"),
    (r"Подъемник|LIFT|Лифт|GAZ", "Подъемники"),
    (r"PROFIL|Профил|LED|Алюминиев|PLINTUS|Плинтус|KARNIZ|RELS", "Профили и освещение"),
    (r"ВОСК|Воск|МАРКЕР|Маркер|ШТРИХ|Штрих|ЖИДКАЯ|Жидкая|SKOTCH|Краска|Клей|клей|Набор", "Ремонт и уход"),
]


def toifa(nom):
    for naqsh, cat in TOIFA:
        if re.search(naqsh, nom):
            return cat
    return "Прочая фурнитура"


def oqi(pdf):
    """PDF → [{n, artikul, nom, narx}]"""
    txt = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True, text=True).stdout
    rows, pending = [], []
    for line in txt.split("\n"):
        line = line.replace("\f", "").rstrip()
        if not line.strip() or ("Артикул" in line and "Наименование" in line):
            continue
        m = NUM.match(line)
        if not m:
            m0 = NUM0.match(line)
            if m0 and int(m0.group(1)) == (rows[-1]["n"] + 1 if rows else 1):
                m = m0
        if not m:
            pending.append(line.strip())
            continue
        n, mid, _qoldiq, price = m.groups()
        parts = re.split(r"\s{2,}", mid.strip())
        art, nom = (parts[0], " ".join(parts[1:])) if len(parts) > 1 else ("", parts[0])
        nom = re.sub(r"\s+", " ", " ".join(pending + [nom])).strip()
        if art and nom.startswith(art + " "):            # nom boshida artikul takrorlangan
            nom = nom[len(art) + 1:]
        rows.append({"n": int(n), "artikul": art, "nom": nom,
                     "narx": float(price.replace(" ", "").replace(",", ".")) if price else 0.0})
        pending = []
    ns = [r["n"] for r in rows]
    assert ns == list(range(1, len(rows) + 1)), "PDF qatorlari ketma-ket emas — o'qish xato"
    return rows


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    dry = "--dry-run" in sys.argv
    sana = sys.argv[sys.argv.index("--sana") + 1] if "--sana" in sys.argv else "2026-10-17"
    if "--sana" in sys.argv:
        args.remove(sana)
    src = "dokon_" + sana
    rows = oqi(Path(args[0]))

    cat = json.loads(PATH.read_text(encoding="utf8"))
    items = cat["items"]
    norm = lambda s: re.sub(r"[\s\-./]", "", str(s or "")).upper()
    by_sku = {}
    for it in items:
        if it.get("sku"):
            by_sku.setdefault(norm(it["sku"]), it)
    by_kalit = {it["dokon"]: it for it in items if isinstance(it.get("dokon"), str)}
    seq = max((int(it["id"][2:]) for it in items if str(it.get("id", "")).startswith(PREFIX)), default=0)

    hisob = {"pdf_qator": len(rows), "narxi_bor": sum(r["narx"] > 0 for r in rows), "erp_bilan_mos": 0, "narx_bir_xil": 0,
             "narx_yangilandi": 0, "yangi": 0, "yangi_narxsiz": 0}
    ozgardi, sanoq = [], {}
    for r in rows:
        uzs = int(round(r["narx"]))
        juft = r["artikul"] + "|" + r["nom"]
        sanoq[juft] = sanoq.get(juft, 0) + 1
        kalit = juft + "|" + str(sanoq[juft])
        it = by_sku.get(norm(r["artikul"])) if len(norm(r["artikul"])) >= 4 else None   # "1" kabi qisqa artikul — ishonchsiz
        if it is None:
            it = by_kalit.get(kalit)
        if it is not None and not it.get("dokon"):
            hisob["erp_bilan_mos"] += 1
            if uzs > 0 and it.get("uzs") != uzs:
                ozgardi.append({"id": it["id"], "nom": it["name"], "eski": it.get("uzs"), "yangi": uzs})
                it.update({"uzs": uzs, "price_src": src})
                it.pop("no_price", None)
                hisob["narx_yangilandi"] += 1
            elif uzs > 0:
                hisob["narx_bir_xil"] += 1
            continue
        if it is not None:                                # oldingi importdan — narxi yangilanadi
            if uzs > 0 and it.get("uzs") != uzs:
                ozgardi.append({"id": it["id"], "nom": it["name"], "eski": it.get("uzs"), "yangi": uzs})
                it.update({"uzs": uzs, "price_src": src})
                it.pop("no_price", None)
                hisob["narx_yangilandi"] += 1
            continue
        seq += 1
        yangi = {"sku": r["artikul"], "name": r["nom"], "cat": toifa(r["nom"]), "uzs": uzs, "usd": 0,
                 "price_src": src if uzs > 0 else "yoq", "id": f"{PREFIX}{seq:06d}", "dokon": kalit}
        if uzs <= 0:
            yangi["no_price"] = True
            hisob["yangi_narxsiz"] += 1
        items.append(yangi)
        by_kalit[kalit] = yangi
        hisob["yangi"] += 1

    ids = [it["id"] for it in items]
    assert len(ids) == len(set(ids)), "takroriy ID!"
    hisob["jami"] = len(items)
    print(json.dumps(hisob, ensure_ascii=False))
    for o in ozgardi[:30]:
        print("  narx:", o["id"], o["nom"][:60], o["eski"], "→", o["yangi"])
    if not dry:
        cat["_meta"] = (f"Furnitura katalogi ({len(items)} ta). Narx manbai: Mahsulotlar_Katalog_Narxlari.xlsx / Zapchast_Furnitura "
                        f"va do'kon narx ro'yxati NARX.pdf ({sana}; dokon — qator kaliti, scripts/narx_pdf_import.py). "
                        "price_src: erp_uzs | erp_usd×kurs (kurs 12800) | dokon_<sana> | yoq (narx yo'q — o'ylab topilmaydi). "
                        "Qayta tiklash: scripts/furnitura_narx_tiklash.py")
        PATH.write_text(json.dumps(cat, ensure_ascii=False, indent=1), encoding="utf8")
        print("yozildi:", PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
