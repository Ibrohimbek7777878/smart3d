"""
Bazis mahkamlagichlaridan teshiklar (TZ-06, A varianti).

Bazis panelda teshik ro'yxatini saqlamaydi — teshik mahkamlagichdan hisoblanadi. Faylda bor:
  • mahkamlagich guruhi + mahkamlash sxemasi (zlib): diametrlar, joylashtirish qoidasi;
  • birikish chizig'i ("Линия стыка"): boshi, yo'nalishi, uzunligi;
  • har vint (3001): joyi; o'zining X o'qi — vint yo'nalishi (boshidan birikmaga).
Evrovint (konfirmat) ikki detalga teshik beradi:
  A — vint boshi turgan detal: plastdan o'tuvchi teshik, Ø d1, chuqurligi = A qalinligi;
  B — vint kiradigan detal: toretsdagi teshik, Ø d2, chuqurligi = h − A qalinligi.

Detal koordinatasi (ilovadagi kelishuv, cutlist.js 3-bo'lim):
  x — EN bo'ylab F chetdan, y — UZUNLIK bo'ylab L chetdan.
  F cheti: eni Z o'qida bo'lsa — old (Z max); eni X o'qida bo'lsa — chap (X min).
  L cheti: uzunlik o'qining boshi (pastki / chap / orqa).
  side: F — modul markaziga qaragan yuz, B — tashqi yuz; T — torets (cheti `torets` da: F/B/L/R).
"""
import math

AXI = {"X": 0, "Y": 1, "Z": 2}


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _sub(a, b):
    return [x - y for x, y in zip(a, b)]


def _add(a, b, k=1.0):
    return [x + k * y for x, y in zip(a, b)]


# ── panel ────────────────────────────────────────────────────────────────────
def panel(ob, rec, P):
    """Daraxt obyekti + parser yozuvi → teshik hisobi uchun panel."""
    els = rec["contour_outer"]
    pts = [q for el in els for q in (el["p1"], el["p2"])] + P.contour_polygon(els)   # elementlar tartibsiz bo'lishi mumkin
    bb = (min(q[0] for q in pts), max(q[0] for q in pts), min(q[1] for q in pts), max(q[1] for q in pts))
    th = float(rec.get("thickness") or 16)
    a, v = ob["oqlar"], ob["pos"]
    gp = [[v[i] + x * a[0][i] + y * a[1][i] + z * a[2][i] for i in range(3)]
          for x in (bb[0], bb[1]) for y in (bb[2], bb[3]) for z in (0.0, th)]
    gb = [(min(p[i] for p in gp), max(p[i] for p in gp)) for i in range(3)]
    normal = "XYZ"[max(range(3), key=lambda i: abs(a[2][i]))]
    len_ax, wid_ax = (("Y", "Z") if normal == "X" else ("X", "Z") if normal == "Y" else ("Y", "X"))
    return dict(ob=ob, nom=str(rec.get("name") or "").strip(), th=th, bb=bb, gb=gb,
                normal=normal, len_ax=len_ax, wid_ax=wid_ax)


def _local(pn, p):
    d, a = _sub(p, pn["ob"]["pos"]), pn["ob"]["oqlar"]
    return [_dot(d, a[0]), _dot(d, a[1]), _dot(d, a[2])]


def _in_bb(pn, x, y, tol):
    b = pn["bb"]
    return b[0] - tol <= x <= b[1] + tol and b[2] - tol <= y <= b[3] + tol


def _kirish_yuzi(pn, p, u):
    """p nuqtada u yo'nalishda pn plastiga kirilyaptimi (yuzida, o'qi plastga perpendikulyar)."""
    nz = _dot(u, pn["ob"]["oqlar"][2])
    if abs(abs(nz) - 1) > 1e-3:
        return False
    x, y, z = _local(pn, p)
    return abs(z - (0.0 if nz > 0 else pn["th"])) < 0.6 and _in_bb(pn, x, y, 0.6)


def _ichida(pn, q, u):
    """q nuqta pn ichida va u plast tekisligida (torets teshigi)."""
    if abs(_dot(u, pn["ob"]["oqlar"][2])) > 1e-3:
        return False
    x, y, z = _local(pn, q)
    return -0.01 < z < pn["th"] + 0.01 and _in_bb(pn, x, y, 0.01)


def detal_xy(pn, g):
    """Global nuqta → detal koordinatasi (x — F chetdan, y — L chetdan) va detal eni/uzunligi."""
    gb, wi, li = pn["gb"], AXI[pn["wid_ax"]], AXI[pn["len_ax"]]
    x = (gb[wi][1] - g[wi]) if pn["wid_ax"] == "Z" else (g[wi] - gb[wi][0])
    return x, g[li] - gb[li][0], gb[wi][1] - gb[wi][0], gb[li][1] - gb[li][0]


def detal_yon(pn, g):
    """Global yo'nalish → detal koordinatasidagi (dx, dy)."""
    wi, li = AXI[pn["wid_ax"]], AXI[pn["len_ax"]]
    return (-g[wi] if pn["wid_ax"] == "Z" else g[wi]), g[li]


def yuz(pn, tashqi_normal, markaz):
    """F — modul markaziga qaragan yuz, B — tashqi. Markazdagi panelda +o'q tomoni F."""
    ni = AXI[pn["normal"]]
    c = (pn["gb"][ni][0] + pn["gb"][ni][1]) / 2
    k = markaz[ni] - c
    if abs(k) < 1:
        k = 1.0
    return "F" if tashqi_normal[ni] * k > 0 else "B"


# ── Bazis joylashtirish qoidasi ──────────────────────────────────────────────
def qoida_t(L, q):
    """Birikish chizig'i uzunligi L → vintlar joyi (chiziq boshidan).
    Soni — jadvaldan (L ≤ Length bo'lgan birinchi qator); chetdan kamida S; qo'shni oraliq P ga karrali;
    simmetrik. 38 faylning 360/377 birikmasida aynan tekshirildi (qolgani qo'lda surilgan)."""
    S, P, jad = q["S"], q["P"], q["jadval"]
    n = next((c for Lm, c in jad if L <= Lm + 1e-6), jad[-1][1] if jad else 1)
    if n >= 2 and L - 2 * S < -1e-6:
        n = 1
    if n <= 1:
        return [L / 2]
    step = math.floor((L - 2 * S) / ((n - 1) * P) + 1e-6) * P
    f = (L - step * (n - 1)) / 2
    return [f + k * step for k in range(n)]


def _sxema_qoida(s):
    jad = [[r["Length"], r["FurnCount"]] for r in s.get("Table", []) if r.get("Length")]
    return dict(S=s["StartIndent"]["Value"], P=s["PrimStep"], jadval=jad)


# ── birikmalar ──────────────────────────────────────────────────────────────
def _bolalar(obs, i):
    g, out = obs[i], []
    for ob in obs[i + 1:]:
        if ob["chuqur"] <= g["chuqur"]:
            break
        if ob["chuqur"] == g["chuqur"] + 1:
            out.append(ob)
    return out


def birikma_guruhi(obs, i):
    """Mahkamlagich guruhi (sxemali yoki "Линия стыка" chiziqli) — jismoniy zapchast emas, BOM ga kirmaydi."""
    g = obs[i]
    if g["kod"] != 1005:
        return False
    return bool(g.get("sxema")) or any(b["kod"] == 1001 and "стык" in b["nom"].lower() for b in _bolalar(obs, i))


def _ab(pans, p, u):
    A = [pn for pn in pans if _kirish_yuzi(pn, p, u)]
    if len(A) != 1:
        return None
    Bs = [pn for pn in pans if _ichida(pn, _add(p, u, A[0]["th"] + 1.0), u)]
    return (A[0], Bs[0]) if len(Bs) == 1 else None


def birikmalar(obs, pans):
    """Evrovint birikmalari. Har birida: sxema, chiziq, vintlar (t, A, B, teshiklar).
    Qaytaradi: (birikmalar, o'qilmagan mahkamlagichlar ro'yxati)."""
    allb = [p["gb"] for p in pans]
    markaz = [(min(b[i][0] for b in allb) + max(b[i][1] for b in allb)) / 2 for i in range(3)] if allb else [0, 0, 0]
    out, qoldi, ishlatildi, evro_par = [], [], set(), {}
    for i, g in enumerate(obs):
        s = g.get("sxema")
        if not s:
            continue
        sc = s.get("Scheme") or {}
        fu = sc.get("Furniture") if isinstance(sc.get("Furniture"), dict) else {}
        par = fu.get("Param") if isinstance(fu.get("Param"), dict) else {}
        bolalar = _bolalar(obs, i)
        vintlar = [b for b in bolalar if b["kod"] == 3001]
        if not ("d1" in par and "d2" in par and "h" in par):
            qoldi.append(dict(nom=sc.get("Name") or g["nom"], soni=len(vintlar),
                              sabab="diametr/chuqurlik faylda yo'q yoki sxema boshqacha (D6 kerak)"))
            continue
        chiziq = next((b for b in bolalar if b["kod"] == 1001), None)
        dd = [k["v"] for k in chiziq["node"]["v"] if k["t"] == "d"] if chiziq else []
        if not chiziq or len(dd) < 3 or not vintlar:
            qoldi.append(dict(nom=sc.get("Name") or g["nom"], soni=len(vintlar), sabab="birikish chizig'i o'qilmadi"))
            continue
        L, v0, v = dd[2], chiziq["pos"], chiziq["oqlar"][2]
        for it in vintlar:
            evro_par.setdefault(it["nom"], (par["d1"], par["d2"], par["h"]))
        items = []
        for it in vintlar:
            p, u = it["pos"], it["oqlar"][0]
            ab = _ab(pans, p, u)
            if not ab:
                items = None
                break
            items.append(dict(t=_dot(_sub(p, v0), v), p=p, u=u, A=ab[0], B=ab[1], nom=it["nom"], ob=it))
        if not items:
            qoldi.append(dict(nom=sc.get("Name") or g["nom"], soni=len(vintlar), sabab="vint qaysi detalga tegishli aniqlanmadi"))
            continue
        items.sort(key=lambda r: r["t"])
        ishlatildi.update(id(r["ob"]) for r in items)
        q = _sxema_qoida(sc)
        pr = qoida_t(L, q)
        mos = len(pr) == len(items) and all(abs(a - r["t"]) < 0.6 for a, r in zip(pr, items))
        out.append(dict(nom=sc.get("Name") or g["nom"], zapchast=items[0]["nom"], d1=par["d1"], d2=par["d2"], h=par["h"],
                        L=L, chiziq_ax="XYZ"[max(range(3), key=lambda k: abs(v[k]))], v=v, v0=v0,
                        qoida=q if mos else None, items=items, markaz=markaz))
    # sxemasiz evrovintlar (tortma konstruktori ichida): o'sha nomli vint — shu fayldagi sxemadagi diametrlar
    for ob in obs:
        if ob["kod"] != 3001 or id(ob) in ishlatildi or ob["nom"] not in evro_par:
            continue
        p, u = ob["pos"], ob["oqlar"][0]
        ab = _ab(pans, p, u)
        d1, d2, h = evro_par[ob["nom"]]
        if not ab:
            qoldi.append(dict(nom=ob["nom"], soni=1, sabab="vint qaysi detalga tegishli aniqlanmadi"))
            continue
        out.append(dict(nom=ob["ota"] or ob["nom"], zapchast=ob["nom"], d1=d1, d2=d2, h=h, L=0.0, chiziq_ax=None,
                        v=[0.0, 0.0, 0.0], v0=p, qoida=None, markaz=markaz,
                        items=[dict(t=0.0, p=p, u=u, A=ab[0], B=ab[1], nom=ob["nom"], ob=ob)]))
    return out, qoldi


def vint_teshiklari(it, d1, d2, h, markaz):
    """Bitta vint → [(panel, teshik)] Bazis o'lchamida, detal koordinatasida."""
    A, Bp, p, u = it["A"], it["B"], it["p"], it["u"]
    xa, ya, _, _ = detal_xy(A, p)
    ta = dict(side=yuz(A, [-c for c in u], markaz), x=xa, y=ya, dia=d1, depth=A["th"], kind="evrovint")
    q = _add(p, u, A["th"])
    xb, yb, wb, lb = detal_xy(Bp, q)
    e = "F" if abs(xb) < 0.6 else "B" if abs(xb - wb) < 0.6 else "L" if abs(yb) < 0.6 else "R" if abs(yb - lb) < 0.6 else None
    tb = dict(side="T", torets=e, x=xb, y=yb, dia=d2, depth=round(h - A["th"], 3), kind="evrovint_torets")
    return [(A, ta), (Bp, tb)]
