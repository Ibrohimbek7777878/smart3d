#!/usr/bin/env python3
"""Ilova katalogini FAQAT yangi baza (ERP 2026-10-23) narxlariga moslash — TZ-50 (egasi #311, #325). Qayta ishga tushiriladigan (idempotent), --dry-run bilan.

  python3 -I scripts/katalog_yangi_baza.py <YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv> <erp-mahsulotlar-2026-10-22.json>
        [--sana 2026-10-23] [--dry-run] [--hisobot yol.json] [--chiqarilgan-csv yol.csv]

Manba fayllar — lokal maxfiy (Smart3D_malumot/, repoga KIRMAYDI; ERP ga bu skript ulanmaydi):
  · CSV (utf-8-sig, ';'): guruh, ERP_id, artikul (14 belgigacha QIRQILGAN!), nomi, birlik, sotuv_UZS, tannarx_UZS + manba (O/K/B), oxirgi_kirim_UZS, qoldiq, ishonch, faol …
  · ERP eksporti (eski narxlar/erp-mahsulotlar-2026-10-22.json): FAQAT id bo'yicha nom, to'liq SKU, length/width/thickness, category_name, unit. NARX maydonlari ISHLATILMAYDI.

Qoidalar (qoida 4.3 — narx o'ylab topilmaydi; egasi: "eski bazadan olmasin, to'liq yangi bazadan olsin"):
  1. Faqat ishonch YUQORI va O'RTA, faol, narxi bor qatorlar kiradi. PAST kirmaydi.
  2. MOSLIK (mavjud yozuv ↔ CSV qatori): nomKalit(ERP nomi) + SKU (ikkala tomonda bo'lsa teng) — engine/erpSinxron.js topish() bilan BIR XIL, faqat bir qiymatli.
     ERP'da bir xil nomli ikki qator bo'lsa, SKU'si aniq teng kelgani olinadi (SKU'siz takror — "dublikat", qo'shilmaydi); aniqlab bo'lmasa — noaniq (tegilmaydi → chiqariladi).
  3. NARX maydonlari (plita):
       uzs (xarid/tannarx asosi) = tannarx (manba O yoki K) → bo'lmasa oxirgi kirim → bo'lmasa tannarx (manba B, eskirgan bo'lishi mumkin) →
                                   bo'lmasa SOTUV narxi (tannarx va kirim yo'q: faqat shu real raqam bor; uzs_turi = 'sotuv' — ochiq belgilanadi)
       lst = sotuv_UZS (plita «sotuv» rejimi: lst − 25 000, narxStavka.plitaNarxi);  usd = 0.0 (yangi bazada dollar narxi yo'q — eski usd tashlanadi)
       src = yangi_baza_<sana>;  uzs_turi = tannarx | kirim | tannarx_eski | sotuv;  ishonch = YUQORI | O'RTA
       th O'ZGARMAYDI (erpKod kaliti: nom|sku|th); l, w — mavjudlarda ERP length/width (nomdagi maydon bilan zid bo'lmasa), yangilarda pastdagi tartib.
  4. YANGI yozuvlar (ilova katalogida yo'q): faqat nomi list materialini aytadigan (ЛДСП/ЛМДФ/МДФ/ЛХДФ/Акрил/PET/Fantini Pella/Стекло), birligi dona, namuna
     (образец) emas va stoleshnitsa (столешница) emas qatorlar; qalinlik (th) va list formati (l×w) ANIQ bo'lishi shart:
       th: nomdagi "NN мм" → nomdagi 3 o'lchamli yozuv → kategoriya → ERP thickness (2…40 mm)
       l×w: nomdagi "2750*1830" yoki "2,75*1,83" → ERP length/width (nomdagi maydon bilan zid bo'lmasa) → nomdagi maydon (4,575 → 2500×1830 …) → kategoriyadagi o'lcham
     Aniqlab bo'lmasa — QO'SHILMAYDI (hisobotda sabab bilan).
  5. Yangi bazada yo'q yoki narxsiz/PAST/noaniq MAVJUD yozuvlar katalogdan CHIQARILADI; ro'yxat — CSV (kod/sku, nomi, eski narx (faqat ma'lumot), sabab). CSV faqat chiqarish
     bo'lsa yoziladi (qayta ishga tushirishda — bo'sh ro'yxat bilan — ustiga yozmaydi).
  6. Stoleshnitsa (stoleshnitsa-erp.json): scripts/stoleshnitsa_erp.py qator() qoidasi (bitta manba) yangi bazadagi YUQORI/O'RTA qatorlarga qo'llanadi;
     narx_m2 = uzs qoidasi (avvalgidek tannarx asosi), narx_list_m2 = sotuv; fayl yangi baza bilan QAYTA quriladi (yangi bazada yo'qlari chiqariladi).
  7. materials.json: faqat sukut_erp (LDSP16/MDF16/HDF3 — ERP id bo'yicha yangi narx) va STOL<qalinlik>-<uzunlik> (sukut dekor narx_m2 dan).
  8. FURNITURA fayllari (furnitura-catalog.json, furnitura-boglash.json) va dekor-asosiy.json, erpKod — TEGILMAYDI.
Engine mantig'i (MAYDON jadvali, nomMaydoni, nomKalit, erpKod) engine/plitaMoslash.js, erpSinxron.js, erpKod.js dan Python'ga ko'chirilgan —
tests/verify_katalog_yangi_baza.mjs haqiqiy JS funksiyalar bilan solishtiradi (farq bo'lsa test yiqiladi)."""
import argparse
import csv
import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "app" / "data"
SC, MI, ST, MJ = D / "sheet-catalog.json", D / "materials-index.json", D / "stoleshnitsa-erp.json", D / "materials.json"
ETIBOR = ("YUQORI", "O'RTA")
PLITA_BIRLIK = {"", "шт", "шт.", "sht", "dona", "pcs", "лист"}                # erpSinxron.js PLITA_BIRLIK
ID_PREFIKS = {"LDSP": "10", "LMDF": "11", "MDF": "40", "HDF": "50", "AKRIL": "60", "OYNA": "70"}      # materials-index.json (id_berish.py kabi)
CAT_KOD = {"LDSP": "LDS", "LMDF": "LMD", "MDF": "MDF", "HDF": "HDF", "AKRIL": "AKR", "OYNA": "OYN"}
MAYDON = [(4.575, (2500, 1830)), (5.0325, (2750, 1830)), (5.175, (2500, 2070)), (5.796, (2800, 2070)), (2.9768, (2440, 1220)), (2.928, (2440, 1200))]   # plitaMoslash.js


def load(p):
    return json.loads(Path(p).read_text(encoding="utf8"))


def save(p, data):
    Path(p).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")   # asl format: indent=1 (19.0 va 2800 farqi saqlanadi), oxirida yangi qator yo'q


def stol_modul():
    """stoleshnitsa_erp.py ni yuklaydi (python -I da skript papkasi sys.path'da emas)"""
    spec = importlib.util.spec_from_file_location("stoleshnitsa_erp", ROOT / "scripts" / "stoleshnitsa_erp.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# ───────── engine funksiyalari (JS'dan) ─────────
def nom_kalit(s):
    """erpSinxron.js nomKalit: boshidagi kod olinadi, faqat harf va raqam"""
    s = re.sub(r"^\s*[\d\-.]+\s+", "", str(s if s is not None else ""))
    return re.sub(r"[^0-9a-zа-я]+", "", s.lower().replace("ё", "е"))


def norm_sku(s):
    return re.sub(r"\s+", " ", str(s if s is not None else "").lower().replace("ё", "е")).strip()


def js_son(x):
    """JS String(number): 16.0 → '16', 5.5 → '5.5'"""
    if x is None or x == "":
        return ""
    x = float(x)
    return str(int(x)) if x == int(x) else repr(x)


def erp_kod(name, sku, th):
    """engine/erpKod.js: FNV-1a(nom|SKU|qalinlik) → 'ERP-' + base36. JS charCodeAt — UTF-16 birliklari"""
    s = str(name or "") + "|" + str(sku or "") + "|" + (js_son(th) if th else "")
    b = s.encode("utf-16-le")
    h = 0x811C9DC5
    for i in range(0, len(b), 2):
        h = ((h ^ (b[i] | (b[i + 1] << 8))) * 0x01000193) & 0xFFFFFFFF
    d = "0123456789abcdefghijklmnopqrstuvwxyz"
    t = ""
    while h:
        h, r = divmod(h, 36)
        t = d[r] + t
    return "ERP-" + (t or "0")


def nom_maydoni(nom, yaxlit=True):
    """plitaMoslash.js nomMaydoni: nomdagi maydon (m²): '4,575' → 4.575; '4,6кв' (yaxlit) — yaqin yagona format"""
    s = str(nom or "")
    m = re.search(r"(?<![\d.,])(\d)[,.](\d{2,4})(?!\d)", s)
    if m:
        a = float(m.group(1) + "." + m.group(2))
        f = next((x for x in MAYDON if abs(x[0] - a) <= 0.006), None)
        return f[0] if f else None
    if not yaxlit:
        return None
    m = re.search(r"(?<![\d.,])(\d)[,.](\d)\s*кв(?![а-яёa-z])", s, re.I)
    if m:
        a = float(m.group(1) + "." + m.group(2))
        yaqin = [x for x in MAYDON if abs(x[0] - a) <= 0.05]
        return yaqin[0][0] if len(yaqin) == 1 else None
    return None


def nom_formati(nom):
    a = nom_maydoni(nom, True)
    f = next((x for x in MAYDON if x[0] == a), None) if a is not None else None
    return list(f[1]) if f else None


def erp_format(p):
    """katalog_erp_moslash.mjs erpFormat: ikkala o'lcham 100..6000 mm; katta qiymat — uzunlik"""
    a, b = float(p.get("length") or 0), float(p.get("width") or 0)
    if not (a > 100 and b > 100 and a <= 6000 and b <= 6000):
        return None
    return [max(a, b), min(a, b)]


def format_zid(nom, l, w):
    """katalog_erp_moslash.mjs formatZid: nomdagi maydon ERP formatiga zid (>1%)"""
    m = nom_maydoni(nom, False)
    return m is not None and abs(l * w / 1e6 - m) / m > 0.01


# ───────── nomdan o'lcham va qalinlik ─────────
RAZM = re.compile(r"(?<![\d.,])(\d{3,4})\s*[*xхXХ×]\s*(\d{3,4})(?:\s*[*xхXХ×]\s*(\d{1,2}(?:[.,]\d+)?))?(?![\d])")
RAZM_M = re.compile(r"(?<![\d.,])(\d[.,]\d{1,3})\s*[*xхXХ×]\s*(\d[.,]\d{1,3})(?![\d.,])")
MM = re.compile(r"(?<![\d.,*xхXХ×])(\d{1,2}(?:[.,]\d+)?)\s*(?:мм|mm)(?![а-яёa-z])", re.I)


def th_ok(x):
    return x is not None and 2 <= x <= 40


def num_nom(t):
    return float(t.replace(",", "."))


def nom_olchami(s):
    """nomdagi aniq o'lcham: '2750*1830' / '2800*2070*18' / '2,75*1,83' → ([l, w], qalinlik|None) yoki (None, None). l,w 1000..6000"""
    for m in RAZM.finditer(s):
        a, b = float(m.group(1)), float(m.group(2))
        if 1000 <= a <= 6000 and 1000 <= b <= 6000:
            return [max(a, b), min(a, b)], (num_nom(m.group(3)) if m.group(3) else None)
    m = RAZM_M.search(s)
    if m:
        a, b = round(num_nom(m.group(1)) * 1000), round(num_nom(m.group(2)) * 1000)
        if 1000 <= a <= 6000 and 1000 <= b <= 6000:
            return [float(max(a, b)), float(min(a, b))], None
    return None, None


def format_tanla(nom, kat, p, mavjud=False):
    """list formati [l, w]: nomdagi aniq o'lcham → ERP length/width (nomdagi maydon bilan zid bo'lmasa) → (faqat yangi yozuvda) nomdagi maydon → kategoriyadagi o'lcham; aniqlanmasa None"""
    o_nom, _ = nom_olchami(nom)
    if o_nom:
        return o_nom
    fm = erp_format(p)
    if fm and not format_zid(nom, fm[0], fm[1]):
        return fm
    if mavjud:
        return None            # mavjud yozuvda boshqa aniq manba yo'q — o'zgarmaydi
    nf = nom_formati(nom)
    if nf:
        return [float(x) for x in nf]
    return nom_olchami(kat)[0]


def nom_qalinligi(s):
    m = MM.search(s)
    return num_nom(m.group(1)) if m else None


# ───────── list materiali turi (nomdan) ─────────
NOSHEET = re.compile(r"образ(?:ец|цы|ца|ов)|sample|столешниц", re.I)
def turi(nom, kat):
    """nom (va kategoriya) → LDSP | LMDF | MDF | HDF | AKRIL | OYNA yoki None (list materiali emas / aytilmagan)"""
    s = (str(nom) + " " + str(kat)).lower().replace("ё", "е")
    if NOSHEET.search(s):
        return None
    n = str(nom).lower().replace("ё", "е")
    if re.search(r"акрил|akril|acryl|shanghai|pakchoob|(?<![а-яa-z])пет(?![а-яa-z])|(?<![a-z])pet(?![a-z])", n):
        return "AKRIL"
    if re.search(r"лхдф|хдф|(?<![a-z])hdf(?![a-z])", n):
        return "HDF"
    if re.search(r"лмдф|lmdf", n):
        return "LMDF"
    if re.search(r"лдсп|ldsp|(?<![а-яa-z])дсп(?![а-яa-z])", n):
        return "LDSP"
    if re.search(r"мдф|(?<![a-z])mdf(?![a-z])|синхро|perfectsense", n) or "fantini pella" in s:
        return "MDF"
    if re.search(r"стекл|зеркал", n):
        return "OYNA"
    return None


# ───────── CSV qatori → narx ─────────
def son(s):
    s = (s or "").strip()
    return float(s) if s else 0.0


def narx_oling(r):
    """CSV qatori → (uzs, uzs_turi, lst) yoki None (narx yo'q)"""
    sotuv, tan, kirim, m = son(r["sotuv_UZS"]), son(r["tannarx_UZS"]), son(r["oxirgi_kirim_UZS"]), (r.get("tannarx_manba(O/K/B)") or "").strip()
    if tan > 0 and m in ("O", "K"):
        uzs, tur = tan, "tannarx"
    elif kirim > 0:
        uzs, tur = kirim, "kirim"
    elif tan > 0:
        uzs, tur = tan, "tannarx_eski"
    elif sotuv > 0:
        uzs, tur = sotuv, "sotuv"
    else:
        return None
    return int(round(uzs)), tur, (int(round(sotuv)) if sotuv > 0 else None)


def tozala(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


# ───────── alias / qidiruv matni (materials-index.json uchun) ─────────
LAT = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p",
       "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"}


def lotin(s):
    return "".join(LAT.get(c, c) for c in s.lower())


def alias_qidiruv(name, sku, cat):
    n, k, c = name.lower(), sku.lower(), cat.lower()
    al = []
    for a in (k, n, lotin(n), c, " ".join(n.split()[:3])):
        a = a.strip()
        if a and a not in al:
            al.append(a)
    return al, " ".join(x for x in (n, k, c, lotin(n)) if x)


def main():
    ap = argparse.ArgumentParser(description="Katalogni faqat yangi baza narxlariga moslash (TZ-50)")
    ap.add_argument("csv", nargs="?")
    ap.add_argument("erp", nargs="?", help="ERP mahsulotlar eksporti (faqat nom/SKU/o'lcham/kategoriya/birlik o'qiladi)")
    ap.add_argument("--solishtir", action="store_true", help="stdin: {sheets:[{name,sku,th}], nomlar:[...]} → erpKod / nomKalit / nomMaydoni natijalari (tests/verify_katalog_yangi_baza.mjs JS bilan solishtiradi)")
    ap.add_argument("--sana", default="2026-10-23")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--hisobot")
    ap.add_argument("--chiqarilgan-csv")
    a = ap.parse_args()
    if a.solishtir:
        inp = json.load(sys.stdin)
        print(json.dumps({"erpKod": [erp_kod(x["name"], x["sku"], x["th"]) for x in inp["sheets"]], "nomKalit": [nom_kalit(x) for x in inp["nomlar"]],
                          "maydon": [nom_maydoni(x, True) for x in inp["nomlar"]], "maydon_aniq": [nom_maydoni(x, False) for x in inp["nomlar"]],
                          "formati": [nom_formati(x) for x in inp["nomlar"]]}, ensure_ascii=False))
        return
    if not a.csv or not a.erp:
        ap.error("csv va erp (ERP eksporti) kerak")
    SRC = "yangi_baza_" + a.sana

    rows = list(csv.DictReader(open(a.csv, encoding="utf-8-sig"), delimiter=";"))
    E = {str(p["id"]): p for p in load(a.erp)}
    for r in rows:
        p = E.get(r["ERP_id"])
        assert p is not None, "ERP eksportida yo'q id: " + r["ERP_id"]
        r["_p"], r["_nom"], r["_sku"] = p, tozala(p.get("name")), tozala(p.get("sku")) if tozala(p.get("sku")) not in (",", ".") else ""
        r["_nk"] = nom_kalit(r["_nom"])
        r["_ok"] = r["ishonch"] in ETIBOR and r["faol"] == "FAOL" and narx_oling(r) is not None
    by_nk = defaultdict(list)
    for r in rows:
        by_nk[r["_nk"]].append(r)

    sc_doc, mi_doc, st_doc, mj = load(SC), load(MI), load(ST), load(MJ)
    sheets, midx = sc_doc["sheets"], mi_doc["items"]
    assert len(sheets) == len(midx), "sheet-catalog va materials-index uzunligi farq qiladi"
    for s, m in zip(sheets, midx):
        assert (s["sku"], s["name"]) == (m["sku"], m["name"]), "materials-index tartibi mos emas: " + s["name"]

    # ───────── MOSLASH: mavjud yozuv ↔ CSV qatori (bir qiymatli) ─────────
    cat_by_nk = defaultdict(list)
    for i, s in enumerate(sheets):
        cat_by_nk[nom_kalit(s["name"])].append(i)

    def sku_mos(row_sku, cat_sku):
        return not norm_sku(row_sku) or not norm_sku(cat_sku) or norm_sku(row_sku) == norm_sku(cat_sku)

    def aniq_sku(row_sku, cat_sku):
        return bool(norm_sku(row_sku)) and norm_sku(row_sku) == norm_sku(cat_sku)

    row2cat, noaniq_qator = {}, {}
    for r in rows:
        c = [i for i in cat_by_nk.get(r["_nk"], []) if sku_mos(r["_sku"], sheets[i]["sku"])]
        if len(c) > 1:
            ex = [i for i in c if aniq_sku(r["_sku"], sheets[i]["sku"])]
            c = ex if len(ex) == 1 else c
        if len(c) == 1:
            row2cat[r["ERP_id"]] = c[0]
        elif c:
            noaniq_qator[r["ERP_id"]] = c
    cat2rows = defaultdict(list)
    for r in rows:
        if r["ERP_id"] in row2cat:
            cat2rows[row2cat[r["ERP_id"]]].append(r)
    juft, dublikat, noaniq_cat = {}, [], set(i for c in noaniq_qator.values() for i in c)
    for i, rs in cat2rows.items():
        if len(rs) > 1:
            ex = [r for r in rs if aniq_sku(r["_sku"], sheets[i]["sku"])]
            if len(ex) == 1:
                juft[i] = ex[0]
                dublikat += [(r, i) for r in rs if r is not ex[0]]
            else:
                noaniq_cat.add(i)
        else:
            juft[i] = rs[0]

    # ───────── MAVJUD YOZUVLAR: yangilash / chiqarish ─────────
    chiq = []                                                             # (guruh, kod, sku, nomi, eski_narx, sabab)
    st = defaultdict(Counter)                                             # tur → hisoblagich
    yangi_sheets, yangi_midx, narx_farq = [], [], []
    for i, (s, m) in enumerate(zip(sheets, midx)):
        tur = s["type"]
        r = juft.get(i)
        sabab = None
        if i in noaniq_cat:
            sabab = "moslik noaniq (yangi bazada bir nechta mos mahsulot — narx o'ylab topilmaydi)"
        elif r is None:
            sabab = "yangi bazada yo'q (ERP'da faol emas yoki narxsiz)"
        elif r["ishonch"] not in ETIBOR:
            sabab = "yangi bazada ishonch PAST (sotuv narxi ombor balansidan / sotuv<tannarx / faqat kirim) — katalogga kirmaydi"
        elif r["faol"] != "FAOL" or not r["_ok"]:
            sabab = "yangi bazada narxsiz yoki faol emas"
        if sabab:
            chiq.append(("plita", erp_kod(s["name"], s["sku"], s["th"]), s["sku"], s["name"], s.get("uzs") or 0, sabab))
            st[tur]["chiqarildi"] += 1
            continue
        uzs, uzs_turi, lst = narx_oling(r)
        eski = (s.get("uzs") or 0, s.get("lst"))
        yangi = {k: v for k, v in s.items() if k not in ("lst", "src", "uzs_turi", "ishonch")}
        yangi.update({"uzs": uzs, "usd": 0.0})
        fm = format_tanla(s["name"], s["cat"], r["_p"], mavjud=True)
        if fm and (float(s["l"]), float(s["w"])) != (fm[0], fm[1]):
            yangi["l"], yangi["w"] = fm[0], fm[1]
            st[tur]["format_ozgardi"] += 1
        yangi["src"] = SRC
        if lst:
            yangi["lst"] = lst
        yangi["uzs_turi"], yangi["ishonch"] = uzs_turi, r["ishonch"]
        mm = {k: v for k, v in m.items() if k not in ("lst", "src", "uzs_turi", "ishonch")}
        for k in ("uzs", "usd", "l", "w"):
            mm[k] = yangi[k]
        if lst:
            mm["lst"] = lst
        mm["uzs_turi"], mm["ishonch"] = uzs_turi, r["ishonch"]
        yangi_sheets.append(yangi)
        yangi_midx.append(mm)
        if eski == (uzs, lst):
            st[tur]["saqlandi"] += 1
        else:
            st[tur]["yangilandi"] += 1
            narx_farq.append({"sku": s["sku"], "nom": s["name"], "eski_uzs": eski[0], "yangi_uzs": uzs, "eski_lst": eski[1], "yangi_lst": lst})
        st[tur]["uzs_turi_" + uzs_turi] += 1
    # ───────── YANGI YOZUVLAR ─────────
    taqiq = Counter()
    royxat_qoshilmadi = []
    kodlar = {erp_kod(x["name"], x["sku"], x["th"]) for x in yangi_sheets}
    nomzod = []
    for r in rows:
        if r["guruh"] not in ("plita", "akril", "boshqa") or r["ERP_id"] in row2cat or r["ERP_id"] in noaniq_qator:
            continue
        if not r["_ok"]:
            taqiq["PAST_yoki_narxsiz"] += 1
            continue
        nomzod.append(r)
    guruh_nk = defaultdict(list)
    for r in nomzod:
        guruh_nk[r["_nk"]].append(r)
    tanlangan = []
    for k, rs in guruh_nk.items():
        sk = [r for r in rs if r["_sku"]]
        if len(rs) > 1:
            rs = sk if len(sk) == 1 else []
            if not rs:
                taqiq["takror_nom_noaniq"] += len(guruh_nk[k])
                royxat_qoshilmadi += [(r, "ERP'da bir xil nomli bir nechta mahsulot — noaniq") for r in guruh_nk[k]]
                continue
            taqiq["dublikat_SKUsiz"] += len(guruh_nk[k]) - 1
        tanlangan.append(rs[0])
    for r in sorted(tanlangan, key=lambda x: int(x["ERP_id"])):
        p, nom, sku = r["_p"], r["_nom"], r["_sku"]
        kat = tozala(p.get("category_name"))
        t = turi(nom, kat)
        if t is None:
            taqiq["list_materiali_emas_yoki_turi_aytilmagan"] += 1
            royxat_qoshilmadi.append((r, "turi nomdan aniqlanmadi / list materiali emas (namuna, stoleshnitsa, brend nomi …)"))
            continue
        birlik = (p.get("unit") or "").strip().lower()
        if birlik not in PLITA_BIRLIK:
            taqiq["birlik_dona_emas"] += 1
            royxat_qoshilmadi.append((r, "birligi dona emas (%s) — narx varaqqa mos emas" % (p.get("unit") or "")))
            continue
        # qalinlik
        o_nom, t_nom3 = nom_olchami(nom)
        th = nom_qalinligi(nom)
        th = th if th_ok(th) else (t_nom3 if th_ok(t_nom3) else None)
        if th is None:
            tk = nom_qalinligi(kat)
            th = tk if th_ok(tk) else None
        if th is None and th_ok(float(p.get("thickness") or 0)):
            th = float(p["thickness"])
        if th is None:
            taqiq["qalinlik_nomaolum"] += 1
            royxat_qoshilmadi.append((r, "qalinlik nomi/kategoriyasi/ERP'da yo'q"))
            continue
        # list formati
        lw = format_tanla(nom, kat, p)
        if lw is None:
            taqiq["format_nomaolum"] += 1
            royxat_qoshilmadi.append((r, "list formati (l×w) nomi/ERP/kategoriyada yo'q"))
            continue
        kod = erp_kod(nom, sku, th)
        if kod in kodlar:
            taqiq["erpKod_takror"] += 1
            royxat_qoshilmadi.append((r, "erpKod takrorlanadi (nom|SKU|qalinlik bir xil)"))
            continue
        kodlar.add(kod)
        uzs, uzs_turi, lst = narx_oling(r)
        s = {"sku": sku, "name": nom, "cat": kat or "ERP (kategoriyasiz)", "type": t, "th": float(th), "l": float(lw[0]), "w": float(lw[1]), "uzs": uzs, "usd": 0.0, "src": SRC}
        if lst:
            s["lst"] = lst
        s["uzs_turi"], s["ishonch"] = uzs_turi, r["ishonch"]
        yangi_sheets.append(s)
        st[t]["qoshildi"] += 1
        st[t]["uzs_turi_" + uzs_turi] += 1
        yangi_midx.append({"s": s})       # materials-index yozuvi (ID bilan) keyin quriladi
    # materials-index: yangi yozuvlar uchun barqaror ID (chiqarilganlarning ID'si QAYTA ISHLATILMAYDI — eng katta raqam: avvalgi nusxa + id_seq)
    seq = dict(mi_doc.get("id_seq") or {})
    for m in midx:
        p2 = m["id"][:2]
        seq[p2] = max(int(seq.get(p2, 0)), int(m["id"][2:]))
    for j, m in enumerate(yangi_midx):
        if isinstance(m, dict) and set(m.keys()) == {"s"}:
            s = m["s"]
            p2 = ID_PREFIKS[s["type"]]
            seq[p2] = int(seq.get(p2, 0)) + 1
            al, qs = alias_qidiruv(s["name"], s["sku"], s["cat"])
            mm = {"id": p2 + "%06d" % seq[p2], "name": s["name"], "sku": s["sku"], "cat": s["cat"], "cat_code": CAT_KOD[s["type"]], "type": s["type"], "th": s["th"], "l": s["l"], "w": s["w"],
                  "uzs": s["uzs"], "usd": 0.0, "aliases": al, "search_text": qs}
            if s.get("lst"):
                mm["lst"] = s["lst"]
            mm["uzs_turi"], mm["ishonch"] = s["uzs_turi"], s["ishonch"]
            yangi_midx[j] = mm
    ids = [m["id"] for m in yangi_midx]
    assert len(ids) == len(set(ids)), "takroriy ID!"

    # ───────── STOLESHNITSA ─────────
    sm = stol_modul()
    rad = Counter()
    stol_items, stol_qator_rows = [], {}
    for r in rows:
        if "столешниц" not in r["_nom"].lower() or not r["_ok"]:
            continue
        uzs, uzs_turi, lst = narx_oling(r)
        x = sm.qator({"id": int(r["ERP_id"]), "sku": r["_sku"], "name": r["_nom"], "category_name": tozala(r["_p"].get("category_name")), "unit": (r["_p"].get("unit") or "").strip(),
                      "is_active": True, "display_price_uzs": uzs, "price_list_uzs": lst, "total_stock": son(r["qoldiq"])}, rad)
        if x:
            x["narx_turi"], x["ishonch"] = uzs_turi, r["ishonch"]
            stol_items.append(x)
            stol_qator_rows[x["erp_id"]] = r
    stol_items.sort(key=lambda x: (x["qalinlik"], x["brend"], x["dekor"]))
    eski_stol = {str(i["erp_id"]): i for i in st_doc["items"]}
    yangi_stol_id = {str(i["erp_id"]) for i in stol_items}
    rbyid = {r["ERP_id"]: r for r in rows}
    stol_st = Counter()
    yangi_stol = {str(x["erp_id"]): x for x in stol_items}
    for k, i in eski_stol.items():
        if k in yangi_stol_id:
            stol_st["saqlandi" if i["narx_m2"] == yangi_stol[k]["narx_m2"] else "yangilandi"] += 1
            continue
        r = rbyid.get(k)
        sabab = ("yangi bazada ishonch PAST" if r and r["ishonch"] not in ETIBOR else
                 "yangi bazada, lekin stoleshnitsa qoidasiga to'g'ri kelmaydi (birlik m2 / qalinlik 26-38 / eni 600 / narx)" if r else
                 "yangi bazada yo'q (ERP'da faol emas yoki narxsiz)")
        chiq.append(("stoleshnitsa", k, i["sku"], i["nom"], i["narx_m2"], sabab))
        stol_st["chiqarildi"] += 1
    stol_st["qoshildi"] = len([x for x in stol_items if str(x["erp_id"]) not in eski_stol])
    sukut = sm.sukut_tanla(stol_items)
    for T, eid in (st_doc.get("sukut") or {}).items():       # oldingi sukut dekor yangi bazada bor bo'lsa SAQLANADI (yangi bazada qoldiq ma'lumoti siyrak — qayta tanlash tasodifiy bo'lardi)
        if str(eid) in yangi_stol and yangi_stol[str(eid)]["qalinlik"] == int(T):
            sukut[T] = eid

    # ───────── materials.json: sukut_erp ─────────
    mj_hisobot = {}
    for kod, v in (mj.get("sukut_erp") or {}).items():
        if kod[0] == "_" or not isinstance(v, dict) or not v.get("erp_id"):
            continue
        r = rbyid.get(str(v["erp_id"]))
        if not r or not r["_ok"]:
            mj_hisobot[kod] = "yangi bazada ishonchli narx yo'q — O'ZGARMADI"
            continue
        uzs, uzs_turi, lst = narx_oling(r)
        mj_hisobot[kod] = {"eski": [v.get("uzs"), v.get("lst")], "yangi": [uzs, lst], "uzs_turi": uzs_turi}
        v["uzs"], v["manba"], v["sana"] = uzs, "ERP", a.sana        # manba "ERP" qoladi: price_src "ERP, <sana>" — plitaERPMi («sotuv» rejimi) shuni ko'radi
        if lst:
            v["lst"] = lst
        v["izoh"] = (v.get("izoh", "").split(" | Yangi baza")[0] +
                     " | Yangi baza %s (TZ-50): uzs %s (%s), lst %s — YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv, ERP id %s." % (a.sana, uzs, uzs_turi, lst, v["erp_id"]))
    # STOL<qalinlik>-<uzunlik>: sukut dekorning narx_m2 × uzunlik × eni / 1e6 (stolMaterialQollash bilan bir xil formula)
    stol_by = {x["erp_id"]: x for x in stol_items}
    for pm in mj.get("panel_materials", []):
        mm_ = re.match(r"^STOL(\d+)-(\d+)$", pm.get("code", ""))
        if not mm_:
            continue
        T, L = int(mm_.group(1)), int(mm_.group(2))
        d = stol_by.get(sukut.get(str(T)))
        if d and L in d["uzunliklar"]:
            pm["name"] = "%s %d×%d×%d" % (d["nom"], L, d["eni"], T)
            pm["sheet_price"] = round(d["narx_m2"] * L * d["eni"] / 1e6)
            pm["price_src"] = "ERP " + a.sana
            pm["src"] = ("sukut dekor ERP %s (%s so'm/m²): ilovada dekor tanlanadi (stoleshnitsa-erp.json). Yangi baza %s, narx_turi: %s"
                         % (d["sku"], d["narx_m2"], a.sana, d["narx_turi"]))
            pm["erp"] = {"id": d["erp_id"], "sku": d["sku"], "narx_m2": d["narx_m2"]}
            mj_hisobot[pm["code"]] = {"narx": pm["sheet_price"], "dekor": d["nom"]}
        else:   # sukut dekorda bu uzunlik yo'q (yoki sukut dekor yo'q) — eski narx QOLMAYDI (qoida: eski narx ishlatilmaydi); ilova tanlangan dekor uzunligini ishlatadi
            pm["name"] = "Stoleshnitsa %d mm × %d" % (T, L)
            pm["sheet_price"] = 0
            pm["price_src"] = "yoq — yangi bazada %d mm sukut dekorida %d mm uzunlik yo'q (ilova tanlangan dekor uzunligini ishlatadi)" % (T, L)
            pm["src"] = "TZ-32 yakuniy: narx dekor bo'yicha (stoleshnitsa-erp.json)"
            pm.pop("erp", None)
            mj_hisobot[pm["code"]] = "sukut dekorda bu uzunlik yo'q — narx 0 (yoq)"

    # ───────── hujjatlarni yig'ish ─────────
    jami_chiq = sum(1 for c in chiq if c[0] == "plita")
    sc_doc["sheets"] = yangi_sheets
    sc_doc["_meta"] = ("Smart3D material katalogi — FAQAT yangi baza (ERP 2026-10-23, YANGI-BAZA-ISHONCHLI-NARXLAR) ishonch YUQORI/O'RTA. type: LDSP/LMDF/AKRIL/MDF/HDF/OYNA. "
                       "uzs — xarid/tannarx asosi (uzs_turi: tannarx | kirim | tannarx_eski (eskirgan bo'lishi mumkin) | sotuv (tannarx yo'q — sotuv narxi)); lst — sotuv narxi (TZ-48 «sotuv» rejimi); usd — yangi bazada yo'q (0). "
                       "th o'zgarmaydi (erpKod kaliti). src: " + SRC + ". Qayta moslash: scripts/katalog_yangi_baza.py (TZ-50)")
    mi_doc["items"] = yangi_midx
    mi_doc["count"] = len(yangi_midx)
    mi_doc["id_seq"] = {k: v for k, v in sorted(seq.items())}          # ishlatilgan eng katta ID raqami (chiqarilganlarniki qayta berilmaydi)
    mi_doc["_meta"] = ("Material ID tizimi — 8 xonali ID + kategoriya + multi-til qidiruv (2026-10-13). " +
                       "TZ-50 (%s): narx/usd/l/w/lst sheet-catalog.json bilan bir xil, FAQAT yangi baza; chiqarilganlarning ID'si qayta ishlatilmaydi (id_seq) — scripts/katalog_yangi_baza.py" % a.sana)
    st_doc["items"] = stol_items
    st_doc["sukut"] = sukut
    st_doc["_meta"] = dict(st_doc["_meta"], manba="Yangi baza %s (YANGI-BAZA-ISHONCHLI-NARXLAR, ishonch YUQORI/O'RTA; scripts/katalog_yangi_baza.py, TZ-50). Nom/SKU/o'lcham — ERP eksporti" % a.sana,
                           sukut="egasi aytmagan — qalinlik bo'yicha eng ko'p qoldiqli (qoldiq_m2) dekor; TZ-50: oldingi sukut dekor yangi bazada bo'lsa saqlanadi",
                           narx="narx_m2 — tannarx asosi (narx_turi: tannarx | kirim | tannarx_eski | sotuv), narx_list_m2 — sotuv narxi (1 m²)")

    hisobot = {"sana": a.sana, "mavjud_plita": len(sheets), "natija_plita": len(yangi_sheets), "chiqarildi_plita": jami_chiq, "tur_boyicha": {k: dict(v) for k, v in sorted(st.items())},
               "stoleshnitsa": dict(stol_st), "stoleshnitsa_jami": len(stol_items), "stoleshnitsa_sukut": sukut, "stoleshnitsa_rad": dict(rad),
               "qoshilmadi": dict(taqiq), "chiqarildi_sabab": {k[0] + ": " + k[1]: v for k, v in Counter((c[0], c[5].split(" (")[0].split(" —")[0]) for c in chiq).items()}, "materials_json": mj_hisobot, "dublikat_qatorlar": [(r["ERP_id"], r["_nom"]) for r, _ in dublikat], "noaniq_mavjud": len(noaniq_cat),
               "qoshilmadi_royxat": [{"erp_id": r["ERP_id"], "nom": r["_nom"], "ishonch": r["ishonch"], "guruh": r["guruh"], "sabab": s} for r, s in royxat_qoshilmadi],
               "narx_ozgargan": narx_farq}
    print(json.dumps({k: hisobot[k] for k in ("mavjud_plita", "natija_plita", "chiqarildi_plita", "tur_boyicha", "stoleshnitsa", "stoleshnitsa_jami", "stoleshnitsa_sukut", "qoshilmadi")}, ensure_ascii=False, indent=1))
    print("materials.json:", json.dumps(mj_hisobot, ensure_ascii=False))
    if a.hisobot:
        Path(a.hisobot).write_text(json.dumps(hisobot, ensure_ascii=False, indent=1), encoding="utf8")
    if a.dry_run:
        print("(--dry-run: fayllar yozilmadi)")
        return
    for p, doc in ((SC, sc_doc), (MI, mi_doc), (ST, st_doc), (MJ, mj)):
        save(p, doc)
    print("yozildi:", ", ".join(p.relative_to(ROOT).as_posix() for p in (SC, MI, ST, MJ)))
    if a.chiqarilgan_csv and chiq:
        with open(a.chiqarilgan_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["guruh", "kod", "sku", "nomi", "eski_narx_UZS (faqat ma'lumot)", "sabab"])
            for c in chiq:
                w.writerow(c)
        print("chiqarilganlar CSV:", a.chiqarilgan_csv, len(chiq), "qator")
    elif a.chiqarilgan_csv:
        print("chiqarilgan yo'q — CSV tegilmadi")


if __name__ == "__main__":
    main()
