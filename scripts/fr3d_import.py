#!/usr/bin/env python3
"""Bazis .fr3d modullarini Smart3D fragmentlariga aylantiradi (TZ-HAQIQIY-MODULLAR A2, A3).

Kirish : data1/modulniy/modulniy/**/*.fr3d   (MebelCity'ning 38 ta moduli)
Parser : mebelcity-platform/client_erp/DOCS/bazis_erp_paket/b3d_full_parser.py — FAQAT O'QISH
Chiqish: app/data/fragments-mc.json  — MC-… fragmentlar (qayta ishga tushirilsa aynan shu natija)
         app/data/id-links.json      — Bazis nomi → ERP mahsuloti (aniq / taklif / yoq)

Asosiy qoidalar:
  · Bazis o'qlari: X = eni (w), Y = bo'yi (h), Z = chuqurligi (d). Panel o'lchami global
    bbox'dan; POZITSIYA ishlatilmaydi (ichma-ich bloklar siljishi parserda yo'q — 11.7).
  · Gabarit faqat korpus panellaridan: D = yon devor chuqurligi, W = to'liq enli gorizontal
    panel eni, H = yon devor bo'yi + yon devorlarni yopuvchi to'liq enli gorizontallar.
  · Formula: modul bo'ylab cho'zilgan detal (≥ 50% o'q) → "o'q − k·t" yoki "o'q − c";
    bir xil n ta detal o'qni bo'lsa → "(o'q − c)/n"; kichik detal → o'zgarmas son.
    Standart (Bazis) o'lchamda formula natijasi Bazis o'lchami bilan AYNAN teng bo'lishi shart.
  · Stoleshnitsa bo'lagi chiqarib tashlanadi — F2 (kitchen.js) yaxlit stoleshnitsa quradi.
  · Teshiklar yo'q (parser cheklovi 11.5). Kromka — qoida bo'yicha (Bazis BOM bilan
    solishtiriladi). Narx o'ylab topilmaydi: faqat `aniq` ID bog'lanishi narxga kiradi.

Ishlatish:  python3 -I scripts/fr3d_import.py
"""
import json
import math
import re
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data1" / "modulniy" / "modulniy"
PARSER_DIR = ROOT.parent / "mebelcity-platform" / "client_erp" / "DOCS" / "bazis_erp_paket"
OUT = ROOT / "app" / "data" / "fragments-mc.json"
LINKS = ROOT / "app" / "data" / "id-links.json"
STD = ROOT / "app" / "data" / "sex-standartlari.json"
FURN = ROOT / "app" / "data" / "furnitura-catalog.json"
MATIDX = ROOT / "app" / "data" / "materials-index.json"

sys.path.insert(0, str(PARSER_DIR))
sys.dont_write_bytecode = True   # parser boshqa loyihada — u yerga __pycache__ yozilmasin (faqat o'qish, 2.10)
import b3d_full_parser as P  # noqa: E402

AX = "XYZ"
AXIS_VAR = {"X": "w", "Y": "h", "Z": "d"}

# ── bo'limlar ────────────────────────────────────────────────────────────────
SECTIONS = [
    # (yo'l qismi, kod prefiksi, kategoriya, guruh, standart turi (eshik soni bilan '{n}'))
    ("kuxnya/nijniy korpus", "KP", "cabinet", "kuxnya-pastki", "oshxona_pastki_{n}e"),
    ("kuxnya/verxniy", "KU", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_{n}e"),
    ("kuxnya/antirsol", "KA", "wall_cabinet", "kuxnya-antresol", None),
    ("kuxnya/penal", "KK", "tall_cabinet", "kuxnya-kolonna", "oshxona_penal"),
    ("shkaf", "SH", "wardrobe", "garderob", "shkaf"),
    ("krovat", "KR", "bed", "yotoqxona", "krovat"),
    ("parta", "PA", "desk", "bolalar", "parta"),
]
# standart o'lchami bo'lmagan maxsus modullar — shu o'lchamlar o'zgarmas qoladi
SPECIAL_FIXED = [(re.compile(r"vityachka|вытяжк", re.I), ["w", "d", "h"]),   # vityajka — texnikaga moslangan
                 (re.compile(r"kargo", re.I), ["w"]),
                 (re.compile(r"gluxoy|глух", re.I), ["w"])]                    # burchak — eni o'zgarmas

TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюяўқғҳ",
              ["a", "b", "v", "g", "d", "e", "yo", "j", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t",
               "u", "f", "x", "ts", "ch", "sh", "sh", "", "i", "", "e", "yu", "ya", "o", "q", "g", "h"]))


def translit(s):
    return "".join(TR.get(ch, ch) for ch in s.lower())


def norm(s):
    """Taqqoslash uchun: kichik harf, kirill → lotin, belgilar → bo'shliq."""
    t = translit(str(s or "")).replace("ё", "e")
    t = re.sub(r"[^a-z0-9.,/]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def slug(s):
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", translit(s))).strip("_") or "detal"


# ── Bazis faylini o'qish ─────────────────────────────────────────────────────
def load_objects(path):
    raw = path.read_bytes()
    model = P.inflate_biggest(raw)
    if P.looks_encrypted(model):
        raise ValueError("shifrlangan")
    names, start, vs = P.read_schema(model)
    objs = P.parse_objects(P.decode_stream(model, vs, names))
    if not any(o.get("modelCode") == 4002 for o in objs):
        objs = P.parse_objects(P.decode_stream_nameless(model))
    return objs


def panel_box(o):
    """Panelning global bbox o'lchami (X, Y, Z) va normal o'qi."""
    j = P.obj_to_json(o)
    tf = j["TTransformation"]
    v, ax = tf["vector"], [tf["AxisX"], tf["AxisY"], tf["AxisZ"]]
    poly = P.contour_polygon(o["contour_outer"])
    th = float(o.get("thickness") or 16)
    pts = [[v[i] + x * ax[0][i] + y * ax[1][i] + z * ax[2][i] for i in range(3)] for (x, y) in poly for z in (0.0, th)]
    size = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 1) for i in range(3)]
    normal = AX[max(range(3), key=lambda i: abs(ax[2][i]))]
    return size, normal, th


# ── detal roli ───────────────────────────────────────────────────────────────
RE_TOP = re.compile(r"stol|столешн", re.I)
RE_BACK = re.compile(r"xdf|hdf|хдф|лхдф", re.I)
RE_FRONT = re.compile(r"двер|dver|eshik|фасад|fasad|фронт.*ящик", re.I)
RE_SHELF = re.compile(r"polka|полк", re.I)
RE_GLASS = re.compile(r"стекл|зеркал|oyna|shisha|glass", re.I)
RE_SIDE = re.compile(r"^(bok|бок|yon|боковин(?!а ящик)|urta bok|stoyka|стойк)", re.I)


def role_of(name, material, normal, th=16):
    n, m = str(name or ""), str(material or "")
    if RE_TOP.search(n) or RE_TOP.search(m):
        return "stoleshnitsa"
    if RE_GLASS.search(m):
        return "oyna"                                       # shisha — LDSP kroyiga tushmaydi
    if RE_BACK.search(n) or RE_BACK.search(m) or th < 10:
        return "orqa"                                       # HDF yoki boshqa yupqa plita
    if RE_FRONT.search(n):
        return "fasad"
    if RE_SHELF.search(n) and normal == "Y":
        return "polka"
    return "korpus"


# ── formula ──────────────────────────────────────────────────────────────────
def fmt_num(x):
    return str(int(x)) if abs(x - round(x)) < 1e-6 else f"{x:.1f}"


def formula_for(v, axis, S, t, n_same=1):
    """v — detal o'lchami, S — modul o'lchami (shu o'q bo'yicha). Natija formula satri."""
    var = AXIS_VAR[axis]
    v = round(v)
    if S <= 0:
        return fmt_num(v)
    # n ta bir xil detal o'qni bo'ladi (eshiklar, tortma fasadlari yonma-yon)
    if n_same > 1 and abs(S - n_same * v) <= 12:
        c = S - n_same * v
        if not c:
            return f"{var}/{n_same}"
        return f"({var} - {fmt_num(c)})/{n_same}" if c > 0 else f"({var} + {fmt_num(-c)})/{n_same}"
    if v < 0.5 * S:
        return fmt_num(v)                                   # kichik detal — o'zgarmas
    c = round(S - v)
    if c == 0:
        return var
    if c < 0:
        return f"{var} + {fmt_num(-c)}"
    for k in (1, 2, 3, 4):
        if abs(c - k * t) < 0.5:
            return f"{var} - {k}*t" if k > 1 else f"{var} - t"
    for k in (1, 2):                                        # k·t + kichik tirqish
        r = c - k * t
        if 0 < r <= 6:
            return f"{var} - {k}*t - {fmt_num(r)}" if k > 1 else f"{var} - t - {fmt_num(r)}"
    return f"{var} - {fmt_num(c)}"


def eval_formula(expr, w, h, d, t):
    return eval(expr, {"__builtins__": {}}, {"w": w, "h": h, "d": d, "t": t, "t_korpus": t})  # faqat o'z formulalarimiz


# ── ID bog'lash ──────────────────────────────────────────────────────────────
def build_matchers():
    furn = json.loads(FURN.read_text(encoding="utf8"))["items"]
    mats = json.loads(MATIDX.read_text(encoding="utf8"))["items"]
    f_by_norm = {}
    for it in furn:
        f_by_norm.setdefault(norm(it["name"]), it)
    m_by_norm = {}
    for it in mats:
        m_by_norm.setdefault(norm(it["name"]), it)
    return furn, f_by_norm, mats, m_by_norm


def tokens(s):
    """Taqqoslash tokenlari: o'lchov birligi mm ga keltiriladi ("10 sm" → "100mm"),
    so'zlar o'zagi (5 harf) bo'yicha — "nikelirovannaya" ~ "nikel" (taklif uchun)."""
    t = norm(s)
    t = re.sub(r"(\d+(?:[.,]\d+)?)\s*sm\b", lambda m: f"{round(float(m.group(1).replace(',', '.')) * 10)}mm", t)
    t = re.sub(r"(\d+(?:[.,]\d+)?)\s*mm\b", lambda m: f"{m.group(1).replace(',', '.')}mm", t)
    out = set()
    for w in t.split(" "):
        if len(w) < 2:
            continue
        out.add(w if re.search(r"\d", w) else w[:5])
    return out


PLITA_IGNORE = {"stand"}   # "Standart" — seriya so'zi, rang/dekor emas


def best_candidate(name, pool, strict=False):
    """O'xshash mahsulot (taklif): token o'xshashligi; raqamli tokenlar mos bo'lishi shart.
    strict (plita) — Bazis nomidagi barcha so'zlar (rang, dekor) ERP nomida bo'lishi shart:
    "ЛХДФ … Белый" ga "ЛХДФ … Кашемир" taklif qilinmaydi."""
    tn = tokens(name)
    if not tn:
        return None, 0.0
    nums = {t for t in tn if re.search(r"\d", t)}
    need = (tn - PLITA_IGNORE) if strict else nums
    best, score = None, 0.0
    for it in pool:
        ti = tokens(it["name"])
        if need and not need <= ti:
            continue
        inter = len(tn & ti)
        if not inter:
            continue
        s = inter / len(tn | ti)
        if s > score:
            best, score = it, s
    return best, round(score, 2)


def link(name, kind, furn, f_by_norm, mats, m_by_norm, old):
    """kind: furnitura | plita | kromka. Avval qo'lda tasdiqlangan yozuv saqlanadi."""
    prev = old.get(name)
    if prev and prev.get("holat") in ("tasdiqlangan", "rad_etilgan"):   # egasining qarori saqlanadi (TZ-04)
        return prev
    rec = OrderedDict(nom=name, tur=kind)
    if kind == "kromka":
        rec.update(holat="yoq", sabab="ERP katalogida kromka yo'q (TZ D3)")
        return rec
    exact = (f_by_norm if kind == "furnitura" else m_by_norm).get(norm(name))
    if exact:
        rec.update(holat="aniq", id=exact["id"], erp_nom=exact["name"], sku=exact.get("sku"))
        return rec
    cand, score = best_candidate(name, furn if kind == "furnitura" else mats, strict=(kind == "plita"))
    if cand and score >= 0.5:
        rec.update(holat="taklif", id=cand["id"], erp_nom=cand["name"], sku=cand.get("sku"), oxshashlik=score,
                   sabab="narxga kirmaydi — egasi tasdiqlashi kerak ('holat': 'tasdiqlangan')")
    else:
        rec.update(holat="yoq", sabab="ERP katalogida mos mahsulot topilmadi")
    return rec


# ── 'asos' standarti (krovat, parta) ─────────────────────────────────────────
# Standart matras asosiga (tub panel) yoki stol ustiga tegishli — modul gabaritiga emas.
ASOS_RX = {"bed": re.compile(r"^(krovat_)?pol$"), "desk": re.compile(r"^parta_tom$")}


def find_asos(parts, category, W, H, D, t):
    """Tub/ustki panel va uning formulasidan: {uzunlik: (o'q, siljish, Bazis qiymati), eni: (...), detal}.
    Formula o'qqa 1:1 chiziqli bo'lishi shart (masalan "d - 10", "w - 5", "d + 110")."""
    rx = ASOS_RX.get(category)
    cands = [p for p in parts if rx and rx.match(p["code"])]
    if not cands:
        return None
    val = lambda f, w=W, h=H, d=D: eval_formula(str(f), w, h, d, t)  # noqa: E731
    p = max(cands, key=lambda q: val(q["len"]) * val(q["width"]))
    out = []
    for f in (str(p["len"]), str(p["width"])):
        vs = [v for v in ("w", "d", "h") if re.search(rf"\b{v}\b", f)]
        if len(vs) != 1:
            return None
        v = vs[0]
        a = dict(w=W, h=H, d=D)
        a[v] += 100
        if abs(val(f, **a) - val(f) - 100) > 0.01:                 # 1:1 chiziqli emas
            return None
        base = {"w": W, "d": D, "h": H}[v]
        out.append((v, round(base - val(f)), round(val(f))))
    if out[0][0] == out[1][0]:
        return None
    uz, en = (out[0], out[1]) if out[0][2] >= out[1][2] else (out[1], out[0])
    return {"uzunlik": uz, "eni": en, "detal": p["code"]}


# ── bitta modul ──────────────────────────────────────────────────────────────
NOT_HW = re.compile(r"^(фрагмент\d*|blok\b|новый фрагмент)", re.I)


def build_fragment(path, sec, idx, std, matchers, old_links, links_out):
    sec_path, prefix, category, group, std_tpl = sec
    objs = load_objects(path)
    raw = []
    for o in objs:
        if o.get("modelCode") != 4002 or not o.get("contour_outer"):
            continue
        size, normal, th = panel_box(o)
        flat = [s for a, s in zip(AX, size) if a != normal]
        raw.append(dict(name=str(o.get("name") or "detal").strip(), material=str(o.get("material") or ""),
                        size=size, normal=normal, th=th, role=role_of(o.get("name"), o.get("material"), normal, th),
                        bb_m2=flat[0] * flat[1] / 1e6, kontur_m2=P._poly_area(o["contour_outer"]) / 1e6))
    notes = []
    dropped = [p for p in raw if p["role"] == "stoleshnitsa"]
    if dropped:
        notes.append(f"stoleshnitsa bo'lagi chiqarildi ({len(dropped)} ta) — F2 yaxlit stoleshnitsa quradi")
    panels = [p for p in raw if p["role"] != "stoleshnitsa"]

    korpus = [p for p in panels if p["role"] in ("korpus", "polka")]
    t = Counter(round(p["th"]) for p in korpus).most_common(1)[0][0] if korpus else 16
    sides = [p for p in panels if p["normal"] == "X" and p["role"] == "korpus"]
    horiz = [p for p in panels if p["normal"] == "Y" and p["role"] in ("korpus", "polka")]
    side_h = max((p["size"][1] for p in sides), default=0)
    D = max((p["size"][2] for p in sides), default=max((p["size"][2] for p in horiz), default=0))
    W = max((p["size"][0] for p in horiz), default=max((p["size"][0] for p in panels), default=0))
    caps = [p for p in horiz if abs(p["size"][0] - W) < 1 and p["role"] == "korpus"]
    H = side_h + min(len(caps), 2) * t if side_h else max((p["size"][1] for p in panels), default=0)
    W, H, D = round(W), round(H), round(D)

    # detallar: bir xil (rol, nom, o'lcham) larni guruhlash
    groups = OrderedDict()
    for p in panels:
        key = (p["role"], p["name"].lower(), tuple(round(s) for s in p["size"]), p["normal"], p["material"])
        groups.setdefault(key, []).append(p)
    parts, used_codes = [], Counter()
    for (role, _, size, normal, _m), ps in groups.items():
        p0 = ps[0]
        n = len(ps)
        in_plane = [a for a in AX if a != normal]
        # len — vertikal panellarda bo'yi (Y), gorizontalda eni (X)
        len_ax, wid_ax = (("Y", "Z") if normal == "X" else ("X", "Z") if normal == "Y" else ("Y", "X"))
        S = {"X": W, "Y": H, "Z": D}
        fl = formula_for(size[AX.index(len_ax)], len_ax, S[len_ax], t, n_same=n if len_ax == "X" else 1)
        fw = formula_for(size[AX.index(wid_ax)], wid_ax, S[wid_ax], t, n_same=n if wid_ax == "X" else 1)
        # tekshiruv: Bazis o'lchamida formula aynan o'sha o'lchamni berishi shart
        got = (eval_formula(fl, W, H, D, t), eval_formula(fw, W, H, D, t))
        want = (round(size[AX.index(len_ax)]), round(size[AX.index(wid_ax)]))
        if abs(got[0] - want[0]) > 0.6 or abs(got[1] - want[1]) > 0.6:
            notes.append(f"{p0['name']}: formula {fl}×{fw} = {got}, Bazis {want} — o'zgarmas o'lcham olindi")
            fl, fw = fmt_num(want[0]), fmt_num(want[1])
        if role != "korpus":
            # cutlist detal sloti qalinligini 't' qiladi; Bazis formulasidagi t — korpus qalinligi
            fl, fw = (re.sub(r"\bt\b", "t_korpus", f) for f in (fl, fw))
        code = slug(p0["name"])
        used_codes[code] += 1
        if used_codes[code] > 1:
            code = f"{code}_{used_codes[code]}"
        slot = {"orqa": "orqa", "fasad": "fasad", "polka": "polka", "oyna": "oyna"}.get(role, "korpus")
        part = OrderedDict(code=code, nom=p0["name"], qty=n, len=fl, width=fw, slot=slot,
                           tekstura="erkin" if role in ("orqa", "oyna") else "uzunlik", bazis_material=p0["material"])
        if role == "orqa" and p0["th"] >= 4 and not RE_BACK.search(p0["name"] + p0["material"]):
            notes.append(f"{p0['name']}: Bazis {p0['material']} ({p0['th']:g} mm) — Smart3D da yupqa plita "
                         f"'orqa' slotida (HDF3); kerak bo'lsa usta slotni almashtiradi")
        if role == "fasad":
            part["edge"] = "hammasi:kromka_fasad"
        elif role in ("korpus", "polka"):
            part["edge"] = {"F": "kromka_korpus"}
        parts.append(part)

    # furnitura va mahkamlagich — Bazis BOM
    bom = P.compute_bom(objs)
    hardware = []
    furn, f_by_norm, mats, m_by_norm = matchers
    for x in list(bom.get("fittings", [])) + list(bom.get("fasteners", [])):
        nm = str(x.get("name") or "").strip()
        if not nm or NOT_HW.search(nm):
            continue
        rec = links_out.get(nm) or link(nm, "furnitura", furn, f_by_norm, mats, m_by_norm, old_links)
        links_out[nm] = rec
        hw = OrderedDict(code=rec["id"] if rec.get("holat") in ("aniq", "tasdiqlangan") else "BZ-" + slug(nm)[:40],
                         name=nm, qty=int(x.get("count") or 1), unit=x.get("unit") or "dona")
        if rec.get("holat") in ("aniq", "tasdiqlangan"):
            hw["id"] = rec["id"]
        hardware.append(hw)
    for m in bom.get("materials", []):
        nm = m["name"]
        if nm not in links_out:
            links_out[nm] = link(nm, "kromka" if "кромк" in nm.lower() else "plita", furn, f_by_norm, mats, m_by_norm, old_links)
    for e in bom.get("edgeBands", []):
        if e["name"] not in links_out:
            links_out[e["name"]] = link(e["name"], "kromka", furn, f_by_norm, mats, m_by_norm, old_links)

    # nom, eshik soni, standart
    title = re.sub(r"\s+", " ", path.stem).strip()
    doors = sum(len(ps) for (role, _, _, _, _), ps in groups.items() if role == "fasad" and not re.search(r"ящик|yash", ps[0]["name"], re.I))
    m = re.search(r"(\d)\s*(?:x\s*)?fasad", title, re.I)
    ndoor = int(m.group(1)) if m else (doors or (1 if W <= 540 else 2))
    std_key = std_tpl.format(n=1 if ndoor <= 1 else 2) if std_tpl else None
    frag = OrderedDict(code=f"MC-{prefix}-{idx:02d}", name=f"MC · {title}", category=category, group=group,
                       w=W, d=D, h=H)
    if category == "cabinet" and re.search(r"yash|ящик|kargo", title, re.I):
        frag["category"] = "drawer_base" if not re.search(r"kargo", title, re.I) else "cargo_base"
    fixed_dims = []
    st_asos = std_key and std["modullar"].get(std_key, {}).get("olchov") == "asos"
    asos = find_asos(parts, frag["category"], W, H, D, t) if st_asos else None
    if st_asos and not asos:
        fixed_dims = ["w", "d", "h"]
        notes.append("tub/ustki panel formulasi topilmadi (geometriya aniq emas) — o'lcham o'zgarmas")
    elif st_asos:
        st = std["modullar"][std_key]
        dims, smap, covered = [], OrderedDict(), set()
        for k in ("uzunlik", "eni", "h"):
            if k not in st:
                continue
            var, ofset, own = ("h", 0, frag["h"]) if k == "h" else asos[k]
            lo, hi = st[k].get("min"), st[k].get("max")
            dims.append(k)
            covered.add(var)
            smap[k] = OrderedDict(o=var, ofset=ofset)
            if (lo is not None and own < lo) or (hi is not None and own > hi):
                newv = (st[k].get("std") or [lo if lo is not None and own < lo else hi])[0]
                notes.append(f"{k} ({asos['detal'] if k != 'h' else 'bo`yi'}): Bazis {own} mm standart "
                             f"[{lo}–{hi if hi is not None else '…'}] dan tashqarida → {newv} mm (shablon cho'ziladi)")
                frag[var] = newv + ofset
        fixed_dims = [k for k in ("w", "d", "h") if k not in covered]
        if "h" in fixed_dims and st.get("izoh"):
            notes.append("h: " + st["izoh"])
        frag["standart"] = std_key
        frag["standart_olchamlar"] = dims
        frag["standart_map"] = smap
        frag["standart_detal"] = asos["detal"]
    elif std_key and std_key in std["modullar"]:
        st = std["modullar"][std_key]
        dims = []
        for k in ("w", "d", "h"):
            if k not in st:
                continue
            if any(rx.search(title) and k in ks for rx, ks in SPECIAL_FIXED):
                fixed_dims.append(k)
                continue
            lo, hi = st[k]["min"], st[k]["max"]
            own = frag[k]
            if lo <= own <= hi:
                dims.append(k)
            elif own < lo and own >= lo * 0.75 or own > hi and own <= hi * 1.25:
                dims.append(k)
                newv = (st[k].get("std") or [lo if own < lo else hi])[0]
                notes.append(f"{k}: Bazis {own} mm standartdan tashqarida → standart {newv} mm (formula cho'ziladi)")
                frag[k] = newv
            else:
                fixed_dims.append(k)
                notes.append(f"{k}: Bazis {own} mm standart [{lo}–{hi}] dan juda uzoq — o'zgarmas qoldi")
        frag["standart"] = std_key
        frag["standart_olchamlar"] = dims
    else:
        fixed_dims = ["w", "d", "h"]
        notes.append("sex standarti yo'q — o'lcham o'zgarmas (sex-standartlari.json ga qo'shilsa ishlaydi)")
    zag = OrderedDict()
    for p in panels:
        zag[p["material"]] = round(zag.get(p["material"], 0) + p["bb_m2"], 3)
    # egri/shaklli panel yoki parser konturni o'qiy olmagan — BOM maydoni zagotovkadan farq qiladi
    shaped = [p for p in panels if abs(p["kontur_m2"] - p["bb_m2"]) > 0.01 * p["bb_m2"]]
    if shaped:
        notes.append(f"{len(shaped)} ta panel shaklli yoki konturi o'qilmadi — kroy to'g'ri to'rtburchak zagotovka bo'yicha")
    plita = sorted({p["material"] for p in panels if p["role"] in ("korpus", "polka", "fasad")})
    if len(plita) > 1:
        notes.append("bir nechta rang: " + " · ".join(plita) + " — Smart3D da rangni slot (korpus/fasad) belgilaydi")
    for k in fixed_dims:
        frag[f"min_{k}"] = frag[k]
        frag[f"max_{k}"] = frag[k]
    slots = OrderedDict(korpus="LDSP16" if t == 16 else "LDSP18",
                        fasad="LDSP16" if t == 16 else "LDSP18", orqa="HDF3")
    if any(p["slot"] == "oyna" for p in parts):
        slots["oyna"] = "OYNA"
    frag.update(
        stretch_axis="xy", price_mode="unit", price=0, production="panel",
        material_code="LDSP16" if t == 16 else "LDSP18",
        slots=slots,
        parts=parts, edge=[], holes=[], hardware=hardware, auto_hardware=False,
        manba=OrderedDict(fayl=str(path.relative_to(ROOT)), bazis_olcham=[W, D, H] if not notes else None,
                          bazis_panel=len(raw), stoleshnitsa_chiqarildi=len(dropped),
                          bom_kromka_m=round(sum(e.get("totalLength_m", 0) for e in bom.get("edgeBands", [])), 2),
                          bom_maydon_m2=OrderedDict((mm["name"], mm["totalArea_m2"]) for mm in bom.get("materials", [])),
                          # zagotovka — to'g'ri to'rtburchak (kesish uchun); BOM — kontur (parser) maydoni
                          zagotovka_m2=zag, kontur_farq=len(shaped)),
        teshiklar_izoh="Bazis teshiklari parserda ochilmagan (B3D_PARSER_BILIM 11.5) — teshiksiz",
        import_izoh=notes)
    frag["manba"]["bazis_olcham"] = [W, D, H]
    return frag


def main():
    std = json.loads(STD.read_text(encoding="utf8"))
    old_links = {}
    if LINKS.exists():
        old_links = {r["nom"]: r for r in json.loads(LINKS.read_text(encoding="utf8")).get("links", [])}
    matchers = build_matchers()
    links_out = OrderedDict()
    frags, report = [], Counter()
    for sec in SECTIONS:
        files = sorted((SRC / sec[0]).glob("*.fr3d")) if (SRC / sec[0]).is_dir() else []
        for i, f in enumerate(files, 1):
            fr = build_fragment(f, sec, i, std, matchers, old_links, links_out)
            frags.append(fr)
            report[sec[1]] += 1
    out = OrderedDict(_meta=OrderedDict(
        nima="MebelCity haqiqiy modullari (Bazis .fr3d) — scripts/fr3d_import.py natijasi, QO'LDA TAHRIRLAMANG",
        manba="data1/modulniy/modulniy", tz="TZ-HAQIQIY-MODULLAR.md A2",
        soni=len(frags)), fragments=frags)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
    holat = Counter(r["holat"] for r in links_out.values())
    LINKS.write_text(json.dumps(OrderedDict(_meta=OrderedDict(
        nima="Bazis material/zapchast nomi → ERP mahsuloti (8 xonali ID). Narxga faqat 'aniq' va 'tasdiqlangan' kiradi.",
        tasdiqlash="Taklifni tasdiqlash: shu yozuvda 'holat' ni 'tasdiqlangan' qiling — qayta import uni saqlaydi.",
        holat=dict(holat)), links=list(links_out.values())), ensure_ascii=False, indent=1), encoding="utf8")
    print(json.dumps({"fragmentlar": len(frags), "bo'limlar": dict(report), "bog'lanish": dict(holat),
                      "izohli_modullar": sum(1 for f in frags if f["import_izoh"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
