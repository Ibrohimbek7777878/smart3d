"""
Bazis .fr3d — obyektlar daraxti (ichma-ich guruhlar, global joylashuv, mahkamlash sxemalari).

Nima uchun: mebelcity-platform parseri oqimni tekis o'qiydi (B3D_PARSER_BILIM 11.7). Natijada
  • faylning oxiridagi amallar tarixi (undo: "Удаление 40 объектов", "Зеркальное отражение" ...)
    ham detal bo'lib sanaladi — 5 ta modulda detal soni oshib ketgan edi;
  • guruh ichidagi panel va mahkamlagich koordinatasi guruhga nisbatan qoladi (global emas).
Bu modul TLV yozuvlarini daraxt sifatida o'qiydi: <idx:4><soni:4><tur:1><qiymat>,
tur 0/8 — ichida `soni` ta yozuv. Faqat asosiy model ro'yxati olinadi.

Parser faqat o'qiladi (inflate, kontur, kvaternion funksiyalari) — o'zgartirilmaydi.
"""
import math
import struct
import sys
import zlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSER_DIR = ROOT.parent / "mebelcity-platform" / "client_erp" / "DOCS" / "bazis_erp_paket"
sys.path.insert(0, str(PARSER_DIR))
sys.dont_write_bytecode = True   # parser boshqa loyihada — u yerga __pycache__ yozilmasin
import b3d_full_parser as P  # noqa: E402

PANEL = 4002


class Buzuq(Exception):
    pass


# ── TLV daraxti ──────────────────────────────────────────────────────────────
def yozuv(m, pos, chuqur=0):
    if pos + 9 > len(m) or chuqur > 64:
        raise Buzuq(pos)
    idx, soni = struct.unpack_from("<II", m, pos)
    t, vp = m[pos + 8], pos + 9
    if t in (0, 8):
        if soni > 100000:
            raise Buzuq(pos)
        ich = []
        for _ in range(soni):
            k, vp = yozuv(m, vp, chuqur + 1)
            ich.append(k)
        return {"i": idx, "t": "S", "v": ich}, vp
    if t in (1, 2):
        return {"i": idx, "t": "b", "v": t == 1}, vp
    if t == 3:
        return {"i": idx, "t": "i8", "v": m[vp]}, vp + 1
    if t == 4:
        return {"i": idx, "t": "i32", "v": struct.unpack_from("<i", m, vp)[0]}, vp + 4
    if t == 5:
        return {"i": idx, "t": "d", "v": struct.unpack_from("<d", m, vp)[0]}, vp + 8
    if t == 6:
        n = struct.unpack_from("<I", m, vp)[0]
        if n > 5_000_000 or vp + 4 + n * 2 > len(m):
            raise Buzuq(pos)
        raw = m[vp + 4: vp + 4 + n * 2]
        return {"i": idx, "t": "str", "v": raw.decode("utf-16-le", "replace"), "raw": raw}, vp + 4 + n * 2
    if t == 7:
        n = struct.unpack_from("<I", m, vp)[0]
        if vp + 4 + n > len(m):
            raise Buzuq(pos)
        return {"i": idx, "t": "blob", "v": m[vp + 4: vp + 4 + n]}, vp + 4 + n
    raise Buzuq(pos)


def maydonlar(m):
    """Fayl ichidagi raqamlar har faylda boshqacha: obyekt yozuvi (O), kod (C), nom (N)."""
    hits, pos = [], 0
    while True:
        pos = m.find(b"\x04\xa2\x0f\x00\x00", pos)          # i32 = 4002 (panel kodi)
        if pos < 0:
            break
        hits.append(pos - 8)
        pos += 1
    if not hits:
        return None
    C = Counter(struct.unpack_from("<I", m, h)[0] for h in hits).most_common(1)[0][0]
    for h in hits:
        if struct.unpack_from("<I", m, h)[0] == C and m[h - 1] == 0:
            O = struct.unpack_from("<I", m, h - 9)[0]
            N = struct.unpack_from("<I", m, h + 13)[0] if m[h + 21] == 6 else None
            return O, C, N
    return None


def asosiy_royxat(m, O, C):
    """Eng katta obyektlar ro'yxati — asosiy model. Undan keyingilari — amallar tarixi."""
    best, pos = None, 0
    op, cp = struct.pack("<I", O), struct.pack("<I", C)
    while True:
        pos = m.find(op, pos)
        if pos < 0:
            break
        q, pos = pos, pos + 1
        if q < 9 or q + 13 > len(m) or m[q + 8] != 0 or m[q + 9:q + 13] != cp or m[q - 1] != 0:
            continue
        if not 0 < struct.unpack_from("<I", m, q - 5)[0] < 5000:
            continue
        try:
            r, end = yozuv(m, q - 9)
        except Buzuq:
            continue
        if not all(k["t"] == "S" and k["i"] == O for k in r["v"]):
            continue
        if best is None or end - (q - 9) > best[1] - best[0]:
            best = (q - 9, end, r)
    return best


# ── joylashuv ────────────────────────────────────────────────────────────────
BIRLIK = ([0.0, 0.0, 0.0], [(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)])


def qosh(ota, ozi):
    """Bola joylashuvi ota koordinatasida → global. o'qlar: [AxisX, AxisY, AxisZ]."""
    (op, oo), (bp, bo) = ota, ozi
    gp = [op[i] + bp[0] * oo[0][i] + bp[1] * oo[1][i] + bp[2] * oo[2][i] for i in range(3)]
    go = [[sum(bo[a][j] * oo[j][i] for j in range(3)) for i in range(3)] for a in range(3)]
    return gp, go


def kvaternion(o):
    """P.quat_to_matrix ga teskari: o'qlar → (qx, qy, qz, qw)."""
    R = [[o[j][i] for j in range(3)] for i in range(3)]           # ustunlar = o'qlar
    tr = R[0][0] + R[1][1] + R[2][2]
    if tr > 0:
        s = math.sqrt(tr + 1.0) * 2
        return ((R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s, 0.25 * s)
    if R[0][0] > R[1][1] and R[0][0] > R[2][2]:
        s = math.sqrt(1.0 + R[0][0] - R[1][1] - R[2][2]) * 2
        return (0.25 * s, (R[0][1] + R[1][0]) / s, (R[0][2] + R[2][0]) / s, (R[2][1] - R[1][2]) / s)
    if R[1][1] > R[2][2]:
        s = math.sqrt(1.0 + R[1][1] - R[0][0] - R[2][2]) * 2
        return ((R[0][1] + R[1][0]) / s, 0.25 * s, (R[1][2] + R[2][1]) / s, (R[0][2] - R[2][0]) / s)
    s = math.sqrt(1.0 + R[2][2] - R[0][0] - R[1][1]) * 2
    return ((R[0][2] + R[2][0]) / s, (R[1][2] + R[2][1]) / s, 0.25 * s, (R[1][0] - R[0][1]) / s)


def _tf_mi(k):
    if k["t"] != "S" or len(k["v"]) != 7 or not all(x["t"] == "d" for x in k["v"]):
        return False
    return abs(sum(x["v"] ** 2 for x in k["v"][3:]) - 1) < 0.02


# ── mahkamlash sxemasi (evrovint, eksantrik, polka ushlagich ...) ────────────
def sxema(d):
    """zlib ichidagi o'z lug'atli TLV → dict. Ro'yxat (nomsiz elementlar) → list."""
    n, pos, nomlar = struct.unpack_from("<I", d, 0)[0], 4, []
    for _ in range(n):
        ln = struct.unpack_from("<I", d, pos)[0]
        nomlar.append(d[pos + 4:pos + 4 + ln].decode("latin1"))
        pos += 4 + ln
    if d[pos:pos + 4] != b"\xff\xff\xff\xff":
        raise Buzuq(pos)
    soni, pos = struct.unpack_from("<I", d, pos + 4)[0], pos + 9
    ich = []
    for _ in range(soni):
        r, pos = yozuv(d, pos)
        ich.append(r)

    def ol(k):
        nom = nomlar[k["i"]] if k["i"] < len(nomlar) else "_"
        if k["t"] == "S":
            el = [ol(x) for x in k["v"]]
            if el and all(e[0] == "_" for e in el):
                return nom, [e[1] for e in el]
            return nom, dict(el)
        if k["t"] == "blob":
            return nom, "<blob>"
        return nom, k["v"]
    return dict(ol(k) for k in ich)


def _sxema_top(node):
    for k in node["v"]:
        if k["t"] == "str" and len(k["raw"]) > 20:
            i = k["raw"].find(b"\x78\x9c")
            if 0 <= i <= 8:
                try:
                    return sxema(zlib.decompressobj().decompress(k["raw"][i:]))
                except Exception:                                   # noqa: BLE001 — o'qilmagan sxema = yo'q
                    return None
    return None


# ── daraxt ───────────────────────────────────────────────────────────────────
def _tekis(node, O, out):
    """Parser oqimi shaklida (str(idx), tur, qiymat): bolalar ro'yxatisiz, mantiqiy qiymatlarsiz."""
    for k in node["v"]:
        if k["t"] == "S":
            if k["v"] and all(c["t"] == "S" and c["i"] == O for c in k["v"]):
                continue
            _tekis(k, O, out)
        elif k["t"] != "b":
            out.append((str(k["i"]), k["t"], k["v"]))
    return out


def daraxt(path):
    """Asosiy modeldagi barcha obyektlar, daraxt tartibida (DFS).
    Har biri: kod, nom, chuqurlik, ota, global joylashuv (pos, o'qlar), sxema (bo'lsa), node."""
    m = P.inflate_biggest(Path(path).read_bytes())
    if P.looks_encrypted(m):
        raise ValueError("shifrlangan")
    mk = maydonlar(m)
    if not mk:
        return None
    O, C, N = mk
    r = asosiy_royxat(m, O, C)
    if not r:
        return None
    out = []

    def yur(royxat, ota, chuqur, ota_nom):
        for node in royxat:
            if node["t"] != "S" or node["i"] != O:
                continue
            kod = next((k["v"] for k in node["v"] if k["i"] == C), None)
            nom = next((k["v"] for k in node["v"] if k["i"] == N and k["t"] == "str"), "") if N is not None else ""
            tf = next((k for k in node["v"] if _tf_mi(k)), None)
            ozi = BIRLIK
            if tf:
                v = [k["v"] for k in tf["v"]]
                ozi = (v[:3], P.quat_to_matrix(v[3], v[4], v[5], v[6]))
            g = qosh(ota, ozi)
            ob = dict(kod=kod, nom=nom.strip(), chuqur=chuqur, ota=ota_nom, pos=g[0], oqlar=g[1], node=node)
            if kod != PANEL:
                s = _sxema_top(node)
                if s:
                    ob["sxema"] = s
            out.append(ob)
            for k in node["v"]:
                if k["t"] == "S" and k["v"] and all(c["t"] == "S" and c["i"] == O for c in k["v"]):
                    yur(k["v"], g, chuqur + 1, ob["nom"])
    yur(r[2]["v"], BIRLIK, 0, None)
    for ob in out:
        ob["_O"] = O
    return out


def parser_yozuvlari(path):
    """fr3d_import uchun: P.parse_objects bilan bir xil shakldagi yozuvlar, lekin
    faqat asosiy modeldan va global joylashuv bilan. Daraxt o'qilmasa — None."""
    obs = daraxt(path)
    if obs is None:
        return None
    res = []
    for ob in obs:
        q = kvaternion(ob["oqlar"])
        tf = {"Rx": ob["pos"][0], "Ry": ob["pos"][1], "Rz": ob["pos"][2],
              "Anim": q[0], "Axis": q[1], "Butt": q[2], "Vis": q[3]}
        if ob["kod"] == PANEL:
            recs = P.parse_objects(_tekis(ob["node"], ob["_O"], []))
            if len(recs) != 1:
                raise ValueError(f"panel o'qilmadi: {ob['nom']}")
            rec = recs[0]
        else:
            rec = {"modelCode": ob["kod"]}
            nm = next((v.strip() for _, t, v in _tekis(ob["node"], ob["_O"], []) if t == "str" and v.strip()), None)
            if nm:
                rec["name"] = nm
        rec["tf"] = tf
        res.append(rec)
    return res
