"""Kutubxonasiz .xlsx yozish va o'qish (faqat standart Python) — TZ-04.

openpyxl o'rnatilmagan muhitda ham ishlaydi. Faqat kerakli qismi:
  yozish — matn/son kataklari, uslublar (Arial, qalin sarlavha, sariq kiritish katagi,
           kursiv misol qatori), ustun kengligi, sarlavhani qotirish, ro'yxatli tanlov;
  o'qish — Excel saqlagan faylni (sharedStrings, inlineStr, son) varaqlar bo'yicha qatorlarga.
"""
import re
import zipfile
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "pr": "http://schemas.openxmlformats.org/package/2006/relationships"}

# uslub indekslari (styles.xml dagi cellXfs tartibi)
ODDIY, SARLAVHA, KIRITISH, MISOL, TITUL, IZOH, SON, KIRITISH_SON = 0, 1, 2, 3, 4, 5, 6, 7

_STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>
<fonts count="4">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><i/><sz val="10"/><color rgb="FF7F7F7F"/><name val="Arial"/></font>
<font><b/><sz val="12"/><name val="Arial"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyProtection="1"><alignment vertical="top" wrapText="1"/><protection locked="0"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyBorder="1" applyProtection="1"><protection locked="0"/></xf>
</cellXfs>
</styleSheet>"""


def col_letter(i):
    """0 → A, 25 → Z, 26 → AA"""
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def _cell(ref, val, style):
    if val is None or val == "":
        return f'<c r="{ref}" s="{style}"/>' if style else ""
    if isinstance(val, bool):
        val = "ha" if val else "yo'q"
    if isinstance(val, (int, float)):
        return f'<c r="{ref}" s="{style}"><v>{val}</v></c>'
    txt = escape(str(val)).replace("\r", "")
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{txt}</t></is></c>'


def write_xlsx(path, sheets):
    """sheets: [{name, rows: [[val | (val, uslub)], ...], widths: [..], freeze: qator, validations: [(diapazon, [variantlar])]}]"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                   + "".join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" '
                             'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                             for i in range(len(sheets)))
                   + "</Types>")
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '</Relationships>')
        z.writestr("xl/workbook.xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                   + "".join(f'<sheet name="{escape(s["name"])}" sheetId="{i + 1}" r:id="rId{i + 1}"/>'
                             for i, s in enumerate(sheets))
                   + "</sheets></workbook>")
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   + "".join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                             f'Target="worksheets/sheet{i + 1}.xml"/>' for i in range(len(sheets)))
                   + f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                   "</Relationships>")
        z.writestr("xl/styles.xml", _STYLES)
        for i, s in enumerate(sheets):
            x = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                 '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">']
            if s.get("freeze"):
                fr = s["freeze"]
                x.append(f'<sheetViews><sheetView workbookViewId="0"><pane ySplit="{fr}" topLeftCell="A{fr + 1}" '
                         'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
            if s.get("widths"):
                x.append("<cols>" + "".join(f'<col min="{j + 1}" max="{j + 1}" width="{w}" customWidth="1"/>'
                                            for j, w in enumerate(s["widths"])) + "</cols>")
            x.append("<sheetData>")
            for ri, row in enumerate(s["rows"]):
                cells = []
                for ci, c in enumerate(row):
                    val, st = c if isinstance(c, tuple) else (c, ODDIY)
                    cells.append(_cell(f"{col_letter(ci)}{ri + 1}", val, st))
                x.append(f'<row r="{ri + 1}">' + "".join(cells) + "</row>")
            x.append("</sheetData>")
            if s.get("validations"):
                x.append(f'<dataValidations count="{len(s["validations"])}">')
                for rng, opts in s["validations"]:
                    lst = escape(",".join(opts))
                    x.append(f'<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="{rng}">'
                             f'<formula1>"{lst}"</formula1></dataValidation>')
                x.append("</dataValidations>")
            x.append("</worksheet>")
            z.writestr(f"xl/worksheets/sheet{i + 1}.xml", "".join(x))


def _col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_xlsx(path):
    """→ {varaq nomi: [[qiymat, ...], ...]} — son float, matn str, bo'sh None."""
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        target = {r.get("Id"): r.get("Target") for r in rels.findall("pr:Relationship", NS)}
        out = {}
        for sh in wb.find("m:sheets", NS).findall("m:sheet", NS):
            rid = sh.get(f"{{{NS['r']}}}id")
            t = target[rid].lstrip("/")
            t = t if t.startswith("xl/") else "xl/" + t
            root = ET.fromstring(z.read(t))
            rows = []
            for row in root.iter(f"{{{NS['m']}}}row"):
                ri = int(row.get("r")) - 1
                while len(rows) <= ri:
                    rows.append([])
                cur = rows[ri]
                for c in row.findall("m:c", NS):
                    ci = _col_index(c.get("r"))
                    typ = c.get("t")
                    v = c.find("m:v", NS)
                    if typ == "s":
                        val = shared[int(v.text)] if v is not None else None
                    elif typ == "inlineStr":
                        val = "".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t"))
                    elif typ in ("str", "e"):
                        val = v.text if v is not None else None
                    elif typ == "b":
                        val = (v.text == "1") if v is not None else None
                    else:
                        val = float(v.text) if v is not None and v.text not in (None, "") else None
                    while len(cur) <= ci:
                        cur.append(None)
                    cur[ci] = val
            out[sh.get("name")] = rows
        return out
