#!/usr/bin/env python3
"""TZ-37 — "full base" Bazis fragmentlaridan 50+ tayyor modul (korpus + ichki to'plam birlashmalari).

Kirish : full base.zip dan ochilgan papka (argument 1) — begona fayllar: faqat ma'lumot o'qiladi, kod ishga tushirilmaydi.
         Papka tuzilmasi: Korpus/, Korpus ichi/{Polkalar,stoyka,Tortmalar}/…
Parser : fr3d_import.py (bazis_daraxt, b3d_full_parser — faqat o'qish). Shifrlangan fayllar o'tkazib yuboriladi.
Chiqish: app/data/fragments-fr.json  — modullar (MC-FB-NN kodlari, formulalar, slotlar, joy)
         app/data/frag50-bazis.json  — har modulning Bazis kutilma raqamlari (detal/maydon/furnitura) — testlar fayllarsiz ishlaydi
         app/data/nomlar.{ru,en}.json — yangi kodlar nomi (mavjud yozuvlar tegilmaydi)

Modul = KORPUS (Korpus/*.fr3d, formulalar fr3d_import qoidasi bilan) + ICHKI to'plam (tortma paketi / polka / stoyka)
        — ichki to'plam korpus bo'shlig'iga (x: t…w−t, y: t…h−t, z: 0…d) formulalar bilan joylanadi va cho'ziladi.
Ichki to'plam formulalari Bazis fayli o'lchamida AYNAN (±0,6 mm) o'sha detallarni beradi (komponent «native» o'lchami).
Bazis'dagi joy-egalari (qo'g'irchoq 'eshik' 50 mm, korpusning o'z 'polka'si — ichki to'plam almashtirsa) modulga olinmaydi.

Ishlatish:  python3 -I scripts/fr3d_frag50.py <ochilgan-papka>      (qayta ishga tushirilsa AYNAN shu natija)
"""
import copy
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fr3d_import as F  # noqa: E402

P = F.P
ROOT = F.ROOT
DATA = ROOT / "app" / "data"
OUT = DATA / "fragments-fr.json"
OUT_REF = DATA / "frag50-bazis.json"
T = 16
OV = 15            # tortma fasadining korpus bo'shlig'idan chiqishi (primoy)

# ── modullar ro'yxati ────────────────────────────────────────────────────────
# korpus: (kalit, fayl, uz, ru, en, kategoriya, guruh, standart kaliti|None, (w, d, h) standart, tur-so'zi)
KORPUS = OrderedDict([
    ("n450", ("Korpus/Kuxnya nijniy 450 mm.fr3d", "Oshxona pastki 450", "Кухня нижний 450", "Kitchen base 450",
              "cabinet", "kuxnya-pastki", "oshxona_pastki_1e", (450, 450, 708))),
    ("n500", ("Korpus/kuxnya nijniy 500mm.fr3d", "Oshxona pastki 500", "Кухня нижний 500", "Kitchen base 500",
              "cabinet", "kuxnya-pastki", "oshxona_pastki_2e", (600, 500, 708))),
    ("g450", ("Korpus/kuxnya nije gola 450 mm.fr3d", "Oshxona pastki gola 450", "Кухня нижний GOLA 450", "Kitchen base GOLA 450",
              "cabinet", "kuxnya-pastki", "oshxona_pastki_2e", (600, 450, 708))),
    ("g500", ("Korpus/kuxnya nije gola 500 mm.fr3d", "Oshxona pastki gola 500", "Кухня нижний GOLA 500", "Kitchen base GOLA 500",
              "cabinet", "kuxnya-pastki", "oshxona_pastki_2e", (600, 500, 708))),
    ("k1", ("Korpus/korpus 1.fr3d", "Korpus 1", "Корпус 1", "Carcass 1", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
    ("k2", ("Korpus/korpus 2.fr3d", "Korpus 2 (oyoqli)", "Корпус 2 (на ножках)", "Carcass 2 (legs)", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
    ("k3", ("Korpus/korpus 3.fr3d", "Korpus 3", "Корпус 3", "Carcass 3", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (400, 300, 668))),
    ("k4", ("Korpus/korpus 4.fr3d", "Korpus 4", "Корпус 4", "Carcass 4", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (400, 300, 668))),
    ("k5", ("Korpus/korpus 5.fr3d", "Korpus 5", "Корпус 5", "Carcass 5", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (400, 300, 668))),
    ("k6", ("Korpus/korpus 6.fr3d", "Korpus 6 (oyoqli)", "Корпус 6 (на ножках)", "Carcass 6 (legs)", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (400, 300, 668))),
    ("s0", ("Korpus/korpus s sokol.fr3d", "Korpus sokolli", "Корпус с цоколем", "Carcass with plinth", "cabinet", "kuxnya-pastki", "oshxona_pastki_1e", (450, 450, 708))),
    ("s1", ("Korpus/korpus s sokol 1x.fr3d", "Korpus sokolli 1x", "Корпус с цоколем 1x", "Carcass with plinth 1x", "cabinet", "kuxnya-pastki", "oshxona_pastki_1e", (450, 450, 708))),
    ("s100", ("Korpus/korpus s sokol 100.fr3d", "Korpus sokol 100", "Корпус цоколь 100", "Carcass plinth 100", "cabinet", "kuxnya-pastki", "oshxona_pastki_1e", (450, 450, 708))),
    ("s100x", ("Korpus/korpus s sokol 100mm 1x.fr3d", "Korpus sokol 100 1x", "Корпус цоколь 100 1x", "Carcass plinth 100 1x", "cabinet", "kuxnya-pastki", "oshxona_pastki_1e", (450, 450, 708))),
    ("vy", ("Korpus/vityachka 2 fasad.fr3d", "Vityachka 2 fasadli", "Вытяжка 2 фасада", "Hood cabinet 2 doors", "wall_cabinet", "kuxnya-ustki", None, (450, 250, 400))),
    ("a1", ("Korpus/abmanka/abmanka 10 ichki korpus.fr3d", "Abmanka ichki korpus", "Абманка внутренний корпус", "Inset-front carcass", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
    ("a2", ("Korpus/abmanka/abmanka 10 ichki korpus 1x.fr3d", "Abmanka ichki korpus 1x", "Абманка внутренний корпус 1x", "Inset-front carcass 1x", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
    ("a3", ("Korpus/abmanka/shkaf korpus s obmanka 70 tashqi.fr3d", "Abmanka tashqi korpus 70", "Абманка внешний корпус 70", "Overlay-front carcass 70", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
    ("a4", ("Korpus/abmanka/shkaf korpus s obmanka 70 tashqi 1x.fr3d", "Abmanka tashqi korpus 70 1x", "Абманка внешний корпус 70 1x", "Overlay-front carcass 70 1x", "wall_cabinet", "kuxnya-ustki", "oshxona_ustki_1e", (300, 300, 668))),
])
TORTMA = {  # kalit: (fayl, uz, ru, en)
    "3ss": ("Korpus ichi/Tortmalar/primoy/3x salazka.fr3d", "3 tortma salazka", "3 ящика салазки", "3 drawers ball-bearing"),
    "4ss": ("Korpus ichi/Tortmalar/primoy/4x salazka.fr3d", "4 tortma salazka", "4 ящика салазки", "4 drawers ball-bearing"),
    "3td": ("Korpus ichi/Tortmalar/primoy/3x tandem.fr3d", "3 tortma tandem", "3 ящика тандем", "3 drawers tandem"),
    "4td": ("Korpus ichi/Tortmalar/primoy/4x tandem.fr3d", "4 tortma tandem", "4 ящика тандем", "4 drawers tandem"),
}
POLKA = {n: (f"Korpus ichi/Polkalar/polka {n}x [→ -20].fr3d", f"{n} polka", f"{n} полок" if n > 4 else f"{n} полки", f"{n} shelves")
         for n in range(2, 8)}
STOYKA = {"1": ("Korpus ichi/stoyka/1x.fr3d", "1 stoyka, 2 polka", "1 стойка, 2 полки", "1 divider, 2 shelves")}

# birlashmalar: (korpus, ichki turi, ichki kaliti)
KOMBO = (
    [(k, "t", t) for k in ("n450", "n500", "g450", "g500") for t in ("3ss", "4ss", "3td", "4td")]      # oshxona pastki + tortma paketi
    + [(k, "p", 2) for k in ("n450", "n500", "g450", "g500")]                                          # oshxona pastki + 2 polka (ochiq)
    + [(k, "s", "1") for k in ("n450", "n500", "g450", "g500")]                                        # oshxona pastki + stoyka (2 bo'lim)
    + [("k1", "p", 2), ("k2", "p", 3), ("k3", "p", 4), ("k4", "p", 3), ("k5", "p", 4), ("k6", "p", 2),
       ("k3", "p", 2), ("k4", "p", 2), ("k5", "p", 3), ("k1", "p", 3)]                                 # ochiq (polkali) shkaflar
    + [("s0", "p", 3), ("s100", "p", 2), ("s1", "p", 2), ("s100x", "p", 3)]                            # sokolli + polka
    + [("a1", "p", 3), ("a3", "p", 3), ("a2", "p", 2), ("a4", "p", 2)]                                 # abmanka + polka
)
# korpus + ichki birlashmasida modul nomi (korpus nomi 'Korpus N' foydalanuvchiga tushunarsiz): kalit → (uz, ru, en)
OCHIQ = {
    "k1": ("Ochiq shkaf K1", "Открытый шкаф К1", "Open cabinet C1"), "k2": ("Ochiq shkaf K2 oyoqli", "Открытый шкаф К2 на ножках", "Open cabinet C2 legs"),
    "k3": ("Ochiq shkaf K3", "Открытый шкаф К3", "Open cabinet C3"), "k4": ("Ochiq shkaf K4", "Открытый шкаф К4", "Open cabinet C4"),
    "k5": ("Ochiq shkaf K5", "Открытый шкаф К5", "Open cabinet C5"), "k6": ("Ochiq shkaf K6 oyoqli", "Открытый шкаф К6 на ножках", "Open cabinet C6 legs"),
    "s0": ("Sokolli ochiq shkaf", "Открытый шкаф с цоколем", "Open cabinet with plinth"),
    "s100": ("Sokolli ochiq shkaf 100", "Открытый шкаф цоколь 100", "Open cabinet plinth 100"),
    "s1": ("Sokolli ochiq shkaf 1x", "Открытый шкаф с цоколем 1x", "Open cabinet with plinth 1x"),
    "s100x": ("Sokolli ochiq shkaf 100 1x", "Открытый шкаф цоколь 100 1x", "Open cabinet plinth 100 1x"),
}

AX = "XYZ"
LEN_WID = {"X": ("Y", "Z"), "Y": ("X", "Z"), "Z": ("Y", "X")}
SLOT_OF_ROLE = {"orqa": "orqa", "fasad": "fasad", "polka": "polka", "oyna": "oyna"}


def num(x):
    x = round(x, 1)
    return str(int(x)) if abs(x - round(x)) < 1e-6 else f"{x:.1f}"


def plus(base, c):
    """'base + c' / 'base - |c|' / 'base'"""
    c = round(c, 1)
    if abs(c) < 0.05:
        return base
    return f"{base} + {num(c)}" if c > 0 else f"{base} - {num(-c)}"


# ── fayl o'qish ──────────────────────────────────────────────────────────────
def read_panels(path):
    """Fayl panellari (global bbox) va BOM; shifrlangan bo'lsa — None."""
    try:
        obs = F.bazis_daraxt.daraxt(path)
        objs = F.bazis_daraxt.yozuvlar(obs) if obs is not None else F.load_objects(path)
    except Exception:
        return None
    panels = []
    for o in objs:
        if o.get("modelCode") != 4002 or not o.get("contour_outer"):
            continue
        size, normal, th, mn = F.panel_box(o)
        name = str(o.get("name") or "detal").strip()
        material = str(o.get("material") or "")
        panels.append(dict(name=name, material=material, size=size, normal=normal, th=th, mn=mn,
                           role=F.role_of(name, material, normal, th)))
    bom = P.compute_bom([o for k, o in enumerate(objs) if obs is None or not F.bazis_teshik.birikma_guruhi(obs, k)])
    return panels, bom, obs


def hardware_of(bom, matchers, old_links, links_out):
    furn, f_by_norm, mats, m_by_norm = matchers
    hw = []
    for x in list(bom.get("fittings", [])) + list(bom.get("fasteners", [])):
        nm = str(x.get("name") or "").strip()
        if not nm or F.NOT_HW.search(nm):
            continue
        rec = links_out.get(nm) or F.link(nm, "furnitura", furn, f_by_norm, mats, m_by_norm, old_links)
        links_out[nm] = rec
        h = OrderedDict(code=rec["id"] if rec.get("holat") in ("aniq", "tasdiqlangan") else "BZ-" + F.slug(nm)[:40],
                        name=nm, qty=int(x.get("count") or 1), unit=x.get("unit") or "dona")
        if rec.get("holat") in ("aniq", "tasdiqlangan"):
            h["id"] = rec["id"]
        elif h["code"] in F.BOGLASH:
            h["id"] = F.BOGLASH[h["code"]]
        hw.append(h)
    return hw


def part_dict(code, nom, qty, ln, wd, p0, joy, prefix_t=True):
    role = p0["role"]
    slot = SLOT_OF_ROLE.get(role, "korpus")
    if role != "korpus":      # cutlist: detal sloti qalinligi — korpus qalinligidan farq qilishi mumkin
        ln, wd = (re.sub(r"\bt\b", "t_korpus", s) for s in (ln, wd))
    part = OrderedDict(code=code, nom=nom, qty=qty, len=ln, width=wd, slot=slot,
                       tekstura="erkin" if role in ("orqa", "oyna") else "uzunlik", bazis_material=p0["material"])
    if role == "fasad":
        part["edge"] = "hammasi:kromka_fasad"
    elif role in ("korpus", "polka"):
        part["edge"] = {"F": "kromka_korpus"}
    part["joy"] = joy
    return part


def axis_sizes(p):
    """(len o'qi, len, wid o'qi, wid) — fr3d_import/joy.js qoidasi bo'yicha"""
    la, wa = LEN_WID[p["normal"]]
    return la, p["size"][AX.index(la)], wa, p["size"][AX.index(wa)]


def tt(role):
    return "t" if role == "korpus" else "t_korpus"


# ── ichki to'plamlar (formulalar) ────────────────────────────────────────────
def ichki_tortma(panels):
    """Tortma paketi: n ta bir xil tortma, korpus bo'shlig'iga (Wc, Hc, Dc) cho'ziladi. Natija: (parts, bo'shliq native, izoh)."""
    faces = sorted([p for p in panels if re.search(r"фасад|fasad", p["name"], re.I)], key=lambda p: p["mn"][1])
    n = len(faces)
    fh, fw = faces[0]["size"][1], faces[0]["size"][0]
    pitch = faces[1]["mn"][1] - faces[0]["mn"][1] if n > 1 else fh
    gap = round(pitch - fh, 1)
    cx0, cy0 = faces[0]["mn"][0] + OV, faces[0]["mn"][1] + OV
    Wc0, Dc0 = fw - 2 * OV, faces[0]["mn"][2]
    Hc0 = n * fh + (n - 1) * gap - 2 * OV
    pit = f"(h - 2*t + {2 * OV} + {num(gap)})/{n}"
    groups = OrderedDict()
    for p in panels:
        groups.setdefault((p["name"], tuple(p["size"]), p["normal"], p["material"]), []).append(p)
    parts = []
    for (name, size, normal, mat), ps in groups.items():
        ps = sorted(ps, key=lambda p: p["mn"][1])
        if len(ps) != n:
            raise ValueError(f"{name}: {len(ps)} ta, tortma {n} ta")
        p0 = ps[0]
        la, lv, wa, wv = axis_sizes(p0)
        is_face = bool(re.search(r"фасад|fasad", name, re.I))
        def fx(ax, v):                       # o'q bo'yicha o'lcham formulasi
            if ax == "X":
                return plus("w - 2*t", v - Wc0) if v >= 0.5 * Wc0 and normal != "X" else num(v)
            if ax == "Z":
                return plus("d", v - Dc0) if v >= 0.5 * Dc0 and normal != "Z" else num(v)
            if is_face:
                return f"{pit} - {num(gap)}" if abs(gap) > 0.05 else pit
            return num(v)
        ln, wd = fx(la, lv), fx(wa, wv)
        # joy
        xs = p0["mn"][0] - cx0
        if "w - 2*t" in (ln + wd) and normal != "X":
            X = plus("t", xs)
        elif p0["mn"][0] + size[0] / 2 > cx0 + Wc0 / 2 + 1:
            X = plus("w - t", -((cx0 + Wc0) - p0["mn"][0]))
        else:
            X = plus("t", xs)
        z0 = p0["mn"][2]
        if size[2] >= 0.5 * Dc0 and normal != "Z":
            Z = num(z0)
        elif z0 + size[2] / 2 > Dc0 / 2:
            Z = plus("d", z0 - Dc0)
        else:
            Z = num(z0)
        pts = []
        for i, p in enumerate(ps):
            dy = p["mn"][1] - faces[i]["mn"][1]
            Y = f"t - {OV}" + (f" + {i}*{pit}" if i else "")
            pts.append([X, plus(Y, dy), Z])
        parts.append(part_dict(F.slug(name), name, n, ln, wd, p0, {"o": normal, "p": pts}))
    # eng past tortma balandligi: quti (yon, orqa) fasad ichida qolishi shart — fasad balandligi shundan past bo'lmasin
    fh_need = max(p["mn"][1] + p["size"][1] - faces[0]["mn"][1] for p in panels
                  if p not in faces and p["mn"][1] < faces[0]["mn"][1] + pitch - 1)
    return parts, (Wc0, Hc0, Dc0), dict(n=n, gap=gap, fh_need=fh_need)


def ichki_polka(panels, n):
    sh = [p for p in panels if re.search(r"polka|полк", p["name"], re.I) and p["normal"] == "Y"]
    door = [p for p in panels if re.search(r"eshik|двер", p["name"], re.I)]
    assert len(sh) == n and door, "polka"
    Wc0, Dc0 = sh[0]["size"][0], door[0]["mn"][2]
    gp = f"(h - 2*t - {n}*t)/{n + 1}"
    pts = [["t", f"t + {k + 1}*{gp} + {k}*t", "0"] for k in range(n)]
    part = part_dict("polka", "polka", n, "w - 2*t", plus("d", sh[0]["size"][2] - Dc0), sh[0], {"o": "Y", "p": pts})
    Hc0 = max(p["mn"][1] + p["size"][1] for p in sh)
    return [part], (Wc0, Hc0, Dc0), dict(n=n)


def ichki_stoyka(panels):
    vert = [p for p in panels if p["normal"] == "X"]
    sh = sorted([p for p in panels if re.search(r"polka|полк", p["name"], re.I) and p["normal"] == "Y"], key=lambda p: p["mn"][0])
    door = [p for p in panels if re.search(r"eshik|двер", p["name"], re.I)]
    assert len(vert) == 1 and len(sh) == 2 and door
    v = vert[0]
    Wc0, Hc0, Dc0 = sh[1]["mn"][0] + sh[1]["size"][0], v["size"][1], door[0]["mn"][2]
    parts = [part_dict("vertikalnaya", v["name"], 1, plus("h - 2*t", v["size"][1] - Hc0), plus("d", v["size"][2] - Dc0), v,
                       {"o": "X", "p": [["(w - 3*t)/2 + t", "t", "0"]]}),
             part_dict("polka", "polka", 2, "(w - 3*t)/2", plus("d", sh[0]["size"][2] - Dc0), sh[0],
                       {"o": "Y", "p": [["t", f"t + (h - 3*t)/2 + {num(sh[0]['mn'][1] - (Hc0 - T) / 2)}", "0"],
                                        ["(w - 3*t)/2 + 2*t", f"t + (h - 3*t)/2 + {num(sh[1]['mn'][1] - (Hc0 - T) / 2)}", "0"]]})]
    return parts, (Wc0, Hc0, Dc0), dict(n=2)


def ev(expr, w, h, d, t=T):
    return eval(expr, {"__builtins__": {}}, {"w": w, "h": h, "d": d, "t": t, "t_korpus": t})


def check_native(parts, panels, dims, label):
    """Formulalar native (Bazis) o'lchamda aynan Bazis panellarini beradi (±0.6 mm): har detal bo'yicha."""
    w, d, h = dims
    got = []
    for q in parts:
        for _ in range(q["qty"]):
            a, b = sorted((ev(q["len"], w, h, d), ev(q["width"], w, h, d)))
            got.append((round(a, 1), round(b, 1), q["slot"]))
    want = []
    for p in panels:
        s = sorted(v for ax, v in zip(AX, p["size"]) if ax != p["normal"])
        want.append((s[0], s[1]))
    bad = []
    pool = list(want)
    for a, b, _ in got:
        m = next((x for x in pool if abs(x[0] - a) <= 0.6 and abs(x[1] - b) <= 0.6), None)
        if m is None:
            bad.append((a, b))
        else:
            pool.remove(m)
    if bad or pool:
        raise ValueError(f"{label}: native mos emas: formuladan {bad}, Bazisda ortib qolgan {pool}")


# ── Bazis kutilma raqamlari (komponent) ──────────────────────────────────────
def ref_component(src, rel, native, panels, bom, hardware, drop_names=()):
    pl = [p for p in panels if p["name"].lower() not in drop_names]
    parts = []
    for p in pl:
        s = [v for ax, v in zip(AX, p["size"]) if ax != p["normal"]]
        parts.append(OrderedDict(nom=p["name"], len=s[0], wid=s[1], th=round(p["th"]), mat=p["material"],
                                 slot=SLOT_OF_ROLE.get(p["role"], "korpus")))
    area = OrderedDict()
    for q in parts:
        area[q["mat"]] = round(area.get(q["mat"], 0) + q["len"] * q["wid"] / 1e6, 4)
    return OrderedDict(src=src, fayl=rel, native=[round(v) for v in native], panel_soni=len(parts), detallar=parts,
                       maydon_m2=area, furnitura=[OrderedDict(code=h["code"], name=h["name"], qty=h["qty"], id=h.get("id")) for h in hardware],
                       bom_kromka_m=round(sum(e.get("totalLength_m", 0) for e in bom.get("edgeBands", [])), 2))


def main():
    if P is None:
        sys.exit("b3d_full_parser topilmadi — faqat sexning to'liq papkasida ishlaydi")
    base = Path(sys.argv[1]).resolve()
    F.SRC = base / "x" / "y" / "z"        # manba.fayl — papkaga nisbiy yo'l (fr3d_import.build_fragment)
    std = json.loads(F.STD.read_text(encoding="utf8"))
    matchers = F.build_matchers()
    old_links = {r["nom"]: r for r in json.loads(F.LINKS.read_text(encoding="utf8")).get("links", [])}
    links_out = {}

    # 1) korpuslar
    carc = OrderedDict()
    for key, (rel, uz, ru, en, cat, grp, skey, sd) in KORPUS.items():
        path = base / rel
        sec = ("x", "FB", cat, grp, None)
        fr = F.build_fragment(path, sec, 1, std, matchers, old_links, links_out)
        got = read_panels(path)
        carc[key] = (fr, got[0], got[1])
    # 2) ichki to'plamlar
    inner = {}
    shifr = []
    for tur, tbl in (("t", TORTMA), ("p", POLKA), ("s", STOYKA)):
        for k, (rel, *_n) in tbl.items():
            got = read_panels(base / rel)
            if got is None:
                shifr.append(rel)
                continue
            panels, bom, _o = got
            if tur == "t":
                prts, cav, info = ichki_tortma(panels)
            elif tur == "p":
                prts, cav, info = ichki_polka(panels, k)
            else:
                prts, cav, info = ichki_stoyka(panels)
            Wc0, Hc0, Dc0 = cav
            native = (Wc0 + 2 * T, Dc0, Hc0 + 2 * T)
            check_native(prts, [p for p in panels if p["name"].lower() != "eshik"], native, rel)
            inner[(tur, k)] = (prts, native, panels, bom, hardware_of(bom, matchers, old_links, links_out), rel, info)

    frags, refs = [], OrderedDict()
    seen_corpus_only = set()

    def finish(code, uz, ru, en, kkey, ikey):
        fr0, cpanels, cbom = carc[kkey]
        fr = copy.deepcopy(fr0)
        rel_k, _uz, _ru, _en, cat, grp, skey, (sw, sd, sh_) = KORPUS[kkey]
        parts, hw, bir = list(fr["parts"]), list(fr["hardware"]), list(fr["birikmalar"])
        for q in parts:
            q["src"] = "k"
        for h in hw:
            h["src"] = "k"
        comps = []
        native_k = list(fr["manba"]["bazis_olcham"])      # [W, D, H]
        drop_c = {"eshik"} | ({"polka"} if ikey else set())      # 'eshik' — Bazis joy-egasi (50 mm); polka — ichki to'plam almashtiradi
        names_gone = set()
        parts = [q for q in parts if q["code"] not in drop_c] if not ikey else parts
        if not ikey:
            hw = list(hw)
        if ikey:
            prts, native_i, ipanels, ibom, ihw, irel, _info = inner[ikey]
            dropped = [q for q in parts if q["code"] in drop_c]
            parts = [q for q in parts if q["code"] not in drop_c]
            dropped_polka = any(q["code"] == "polka" for q in dropped)
            if dropped_polka:
                hw = [h for h in hw if not re.search(r"polkoderjatel", h["name"], re.I)]
            names_gone = {q["nom"].lower() for q in dropped}
            # dropped detallarga bog'liq birikmalar
            bir = [b for b in bir if not any(t_["part"] in drop_c for t_ in b["teshiklar"])]
            for q in prts:
                q["src"] = "i"
            for h in ihw:
                h["src"] = "i"
            # ichki to'plamning 'eshik' joy-egasi olinmaydi — uning panelsi ref dan ham chiqadi
            ihw2 = [h for h in ihw]
            used = {q["code"] for q in parts}
            for q in prts:
                assert q["code"] not in used, f"{code}: detal kodi takror: {q['code']}"
            parts += prts
            hw += ihw2
        names_gone = {n for n in ("eshik",) } | (names_gone if ikey else set())
        # komponentlar
        comps.append(ref_component("k", rel_k, [native_k[0], native_k[1], native_k[2]], cpanels, cbom,
                                   [h for h in hw if h["src"] == "k"], drop_names=names_gone))
        if ikey:
            comps.append(ref_component("i", irel, [native_i[0], native_i[1], native_i[2]],
                                       [p for p in ipanels], ibom, [h for h in hw if h["src"] == "i"], drop_names={"eshik"}))
        refs[code] = comps
        fr["code"], fr["name"] = code, "MC · " + uz
        fr["category"], fr["group"] = ("drawer_base" if ikey and ikey[0] == "t" else cat), grp
        fr["parts"], fr["hardware"], fr["birikmalar"] = parts, hw, bir
        w0, d0, h0 = sw, sd, sh_
        if ikey and ikey[0] == "p" and cat == "wall_cabinet" and skey:       # ochiq ustki shkaf: polkalar oralig'i ≥ ~150 mm bo'lishi uchun balandlik (sex std ro'yxatidan)
            h0 = {2: 668, 3: 768, 4: 868}[ikey[1]]
        for k in ("min_w", "max_w", "min_d", "max_d", "min_h", "max_h"):
            fr.pop(k, None)
        for k in ("standart", "standart_olchamlar", "standart_map", "standart_detal"):
            fr.pop(k, None)
        fr["w"], fr["d"], fr["h"] = w0, d0, h0
        if skey:
            st = std["modullar"][skey]
            fr["standart"], fr["standart_olchamlar"] = skey, ["w", "d", "h"]
            for k in ("w", "d", "h"):
                fr["min_" + k], fr["max_" + k] = st[k]["min"], st[k]["max"]
                assert st[k]["min"] <= fr[k] <= st[k]["max"], (code, k, fr[k])
        else:
            for k in ("w", "d", "h"):
                fr["min_" + k] = fr["max_" + k] = fr[k]
        if ikey and ikey[0] == "t":     # quti fasad ichida qolishi uchun eng kichik balandlik (sex standartidan qattiqroq bo'lishi mumkin)
            n_, gap_, need = inner[ikey][6]["n"], inner[ikey][6]["gap"], inner[ikey][6]["fh_need"]
            hmin = -(-int(((need + gap_) * n_ - gap_ - 2 * OV + 2 * T + 0.999)) // 10) * 10
            if hmin > fr["min_h"]:
                assert hmin <= fr["h"], (code, hmin, fr["h"])
                fr["min_h"] = hmin
                fr["standart_olchamlar"] = ["w", "d"]      # min_h qo'lda (sex standartidan qattiqroq) — applySexStandart uni bosib ketmasin
                fr["import_izoh"] = list(fr.get("import_izoh") or []) + [f"min bo'yi {hmin} mm: tortma qutisi fasad ichida qolishi uchun (sex standartidan {std['modullar'][skey]['h']['min']} mm)"]
        fr["tur"] = "tayyor-modul"
        fr["manba"] = OrderedDict(fayl=[rel_k] + ([inner[ikey][5]] if ikey else []), bazis_olcham=native_k,
                                  komponentlar=[OrderedDict(src=c["src"], fayl=c["fayl"], native=c["native"]) for c in comps],
                                  tz="TZ-37", izoh="full base.zip — korpus" + (" + ichki to'plam" if ikey else ""))
        fr["import_izoh"] = list(fr.get("import_izoh") or [])
        if ikey:
            fr["import_izoh"].append("Ichki to'plam korpus bo'shlig'iga formula bilan joylashdi; Bazis 'eshik' joy-egasi va korpusning o'z polkasi olinmadi")
        return fr

    idx = 0
    n_k = {}
    for kkey in KORPUS:
        idx += 1
        rel, uz, ru, en, *_r = KORPUS[kkey]
        frags.append(finish(f"MC-FB-{idx:02d}", uz, ru, en, kkey, None))
        frags[-1]["_nom"] = (uz, ru, en)
    for kkey, tur, ik in KOMBO:
        if (tur, ik) not in inner:
            continue
        idx += 1
        _r, uz, ru, en, *_x = KORPUS[kkey]
        uz, ru, en = OCHIQ.get(kkey, (uz, ru, en)) if tur == "p" else (uz, ru, en)
        tbl = {"t": TORTMA, "p": POLKA, "s": STOYKA}[tur]
        _rr, iuz, iru, ien = tbl[ik]
        code = f"MC-FB-{idx:02d}"
        fr = finish(code, f"{uz} + {iuz}", ru, en, kkey, (tur, ik))
        fr["_nom"] = (f"{uz} + {iuz}", f"{ru} + {iru}", f"{en} + {ien}")
        frags.append(fr)
    nomlar = {f["code"]: f.pop("_nom") for f in frags}
    for f in frags:
        f["name"] = "MC · " + nomlar[f["code"]][0]

    out = OrderedDict(_meta=OrderedDict(
        nima="TZ-37: full base.zip dan tayyor modullar — scripts/fr3d_frag50.py natijasi, QO'LDA TAHRIRLAMANG",
        manba="full base.zip (Korpus + Korpus ichi)", soni=len(frags), shifrlangan_ichki=shifr), fragments=frags)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    OUT_REF.write_text(json.dumps(OrderedDict(_meta=OrderedDict(
        nima="TZ-37: har modulning Bazis (fr3d) kutilma raqamlari — komponentlar: korpus 'k', ichki to'plam 'i'; testlar fayllarsiz ishlaydi",
        qoida="detal soni, maydon (m2), furnitura soni; narx — tests/frag50 (productionCost bilan)"), modullar=refs),
        ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    for lang, idxn in (("ru", 1), ("en", 2)):
        p = DATA / f"nomlar.{lang}.json"
        d = json.loads(p.read_text(encoding="utf8"))
        for c, nm in nomlar.items():
            d["modullar"][c] = "MC · " + nm[idxn]
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    unlinked = sorted({h["name"] for f in frags for h in f["hardware"] if not h.get("id")})
    print(json.dumps({"modullar": len(frags), "shifrlangan_ichki": shifr, "id_siz_furnitura": unlinked}, ensure_ascii=False))


if __name__ == "__main__":
    main()
