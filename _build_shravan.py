# -*- coding: utf-8 -*-
"""Build Shravan.pptx from base.pptx facts with Consent Guru visual system."""

from __future__ import annotations

import copy
from pathlib import Path

from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import nsmap, qn
from pptx.util import Emu, Inches, Pt

# ---------------------------------------------------------------------------
# Brand tokens (from consentguru.com / globals.css)
# ---------------------------------------------------------------------------
NAVY = RGBColor(0x0B, 0x2C, 0x4A)
NAVY_DEEP = RGBColor(0x07, 0x1E, 0x33)
TEAL = RGBColor(0x00, 0xC4, 0xA7)
TEAL_DARK = RGBColor(0x00, 0xA8, 0x8F)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MINT = RGBColor(0xF3, 0xF7, 0xF6)
SOFT = RGBColor(0xE6, 0xF9, 0xF5)
SECONDARY = RGBColor(0xE7, 0xF1, 0xF0)
MUTED = RGBColor(0x4D, 0x65, 0x70)
BORDER = RGBColor(0xD3, 0xE0, 0xDE)
DANGER = RGBColor(0xBE, 0x12, 0x3C)
WARN = RGBColor(0xB4, 0x53, 0x09)
INFO_SOFT = RGBColor(0xE8, 0xF1, 0xF4)
PURPLE = RGBColor(0x5B, 0x4B, 0x8A)

FONT = "Calibri"
SITE_URL = "www.consentguru.com"
TAGLINE = "CONSENT GURU  |  Consent Management. Simplified."
TOTAL = 8

ROOT = Path(r"e:\Tor secure\consent-manager")
ASSETS = Path(r"C:\Users\ASUS\.cursor\projects\e-Tor-secure-consent-manager\assets")
LOGO_SRC = ROOT / "public" / "brand" / "consent-guru-logo.jpg"
ICON_SRC = ROOT / "public" / "brand" / "consent-guru-icon.png"
OUT = ROOT / "Shravan.pptx"
TMP = ROOT / "_ppt_tmp"
P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

IMG = {
    "data": ASSETS / "cg-data-abstract.png",
    "types": ASSETS / "cg-data-types.png",
    "choice": ASSETS / "cg-consent-choice.png",
    "dpdp": ASSETS / "cg-dpdp-india.png",
    "roles": ASSETS / "cg-principal-fiduciary.png",
    "dash": ASSETS / "cg-platform-dashboard.png",
    "globe": ASSETS / "cg-global-privacy.png",
    "banner": ASSETS / "cg-website-banner.png",
    "analytics": ASSETS / "cg-analytics.png",
    "sites": ASSETS / "cg-multi-sites.png",
    "life": ASSETS / "cg-lifecycle.png",
    "install": ASSETS / "cg-install.png",
    "contact": ASSETS / "cg-contact.png",
    "maturity": ASSETS / "cg-maturity.png",
}


def crop_logo() -> Path:
    TMP.mkdir(exist_ok=True)
    im = Image.open(LOGO_SRC).convert("RGB")
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r < 248 or g < 248 or b < 248:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    pad = 12
    box = (max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad), min(h, maxy + pad))
    dest = TMP / "logo.png"
    im.crop(box).save(dest, "PNG")
    icon = TMP / "icon.png"
    Image.open(ICON_SRC).convert("RGBA").save(icon, "PNG")
    return dest


def solid(shape, color: RGBColor, line=None):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1)


def shadow(shape, blur=0.18, dist=0.04, alpha=14000):
    spPr = shape._element.spPr
    for child in list(spPr):
        if child.tag == qn("a:effectLst"):
            spPr.remove(child)
    effect = etree.SubElement(spPr, qn("a:effectLst"))
    sh = etree.SubElement(effect, qn("a:outerShdw"))
    sh.set("blurRad", str(int(Inches(blur))))
    sh.set("dist", str(int(Inches(dist))))
    sh.set("dir", "2700000")
    sh.set("algn", "tl")
    sh.set("rotWithShape", "0")
    prst = etree.SubElement(sh, qn("a:sRgbClr"))
    prst.set("val", "0B2C4A")
    etree.SubElement(prst, qn("a:alpha")).set("val", str(alpha))


def round_adj(shape, val=0.12):
    try:
        shape.adjustments[0] = val
    except Exception:
        pass


def round_picture(picture, adj=8000):
    spPr = picture._element.find(qn("p:spPr"))
    if spPr is None:
        spPr = picture._element.find("{%s}spPr" % A_NS)
    if spPr is None:
        return
    geom = spPr.find(qn("a:prstGeom"))
    if geom is None:
        return
    geom.set("prst", "roundRect")
    av = geom.find(qn("a:avLst"))
    if av is None:
        av = etree.SubElement(geom, qn("a:avLst"))
    else:
        for c in list(av):
            av.remove(c)
    gd = etree.SubElement(av, qn("a:gd"))
    gd.set("name", "adj")
    gd.set("fmla", f"val {adj}")


def set_anchor(tf, anchor="ctr", l=0.12, t=0.08, r=0.12, b=0.08):
    bodyPr = tf._txBody.find(qn("a:bodyPr"))
    if bodyPr is None:
        return
    bodyPr.set("anchor", anchor)
    bodyPr.set("lIns", str(int(Inches(l))))
    bodyPr.set("tIns", str(int(Inches(t))))
    bodyPr.set("rIns", str(int(Inches(r))))
    bodyPr.set("bIns", str(int(Inches(b))))


def run_font(run, size, bold=False, color=NAVY, italic=False):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = FONT
    run.font.italic = italic


def textbox(slide, l, t, w, h, text, size=14, bold=False, color=NAVY, align=PP_ALIGN.LEFT, anchor="t"):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run_font(run, size, bold, color)
    set_anchor(tf, anchor, 0.02, 0.0, 0.02, 0.0)
    return box


def shape_text(shape, lines, sizes, colors, bolds, align=PP_ALIGN.LEFT, anchor="ctr", pad=(0.16, 0.12, 0.16, 0.12)):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.clear()
    set_anchor(tf, anchor, *pad)
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_before = Pt(0 if i == 0 else 4)
        p.space_after = Pt(0)
        run = p.add_run()
        run.text = line
        run_font(run, sizes[i], bolds[i], colors[i])
    return shape


def add_rect(slide, l, t, w, h, color, rounded=True, adj=0.08, line=None, drop=False):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    sh = slide.shapes.add_shape(kind, Inches(l), Inches(t), Inches(w), Inches(h))
    solid(sh, color, line)
    if rounded:
        round_adj(sh, adj)
    if drop:
        shadow(sh)
    return sh


def add_oval(slide, l, t, w, h, color):
    sh = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(l), Inches(t), Inches(w), Inches(h))
    solid(sh, color)
    return sh


def add_pic(slide, path, l, t, w, h, rounded=True):
    pic = slide.shapes.add_picture(str(path), Inches(l), Inches(t), Inches(w), Inches(h))
    if rounded:
        round_picture(pic, 9000)
        shadow(pic, 0.16, 0.03, 10000)
    return pic


def add_chrome(slide, n: int, logo_path: Path, dark=False):
    """Persistent header/footer: logo top-left, URL, tagline, slide number."""
    bg = NAVY if dark else WHITE
    add_rect(slide, 0, 0, 13.333, 7.5, bg, rounded=False)

    if not dark:
        add_oval(slide, 11.6, -1.4, 3.2, 3.2, MINT)
        add_oval(slide, -1.1, 5.6, 2.6, 2.6, SOFT)
        add_rect(slide, 0, 0, 13.333, 0.08, TEAL, rounded=False)

    # Logo
    slide.shapes.add_picture(str(logo_path), Inches(0.38), Inches(0.16), height=Inches(0.42))

    url_color = TEAL if not dark else TEAL
    textbox(slide, 8.6, 0.20, 4.35, 0.32, SITE_URL, 12, True, url_color, PP_ALIGN.RIGHT, "ctr")

    # Footer bar
    if dark:
        add_rect(slide, 0, 7.12, 13.333, 0.38, NAVY_DEEP, rounded=False)
        fg, sub = WHITE, TEAL
    else:
        add_rect(slide, 0, 7.12, 13.333, 0.38, MINT, rounded=False)
        add_rect(slide, 0, 7.12, 13.333, 0.015, TEAL, rounded=False)
        fg, sub = MUTED, TEAL

    textbox(slide, 0.40, 7.16, 7.6, 0.28, TAGLINE, 10, False, fg, PP_ALIGN.LEFT, "ctr")
    textbox(slide, 7.4, 7.16, 3.4, 0.28, SITE_URL, 10, True, sub, PP_ALIGN.RIGHT, "ctr")

    # Slide number pill
    pill = add_rect(slide, 11.55, 7.18, 1.38, 0.26, NAVY if not dark else TEAL, adj=0.5)
    shape_text(
        pill,
        [f"{n:02d}  /  {TOTAL:02d}"],
        [10],
        [WHITE if not dark else NAVY],
        [True],
        PP_ALIGN.CENTER,
        "ctr",
        (0.02, 0.01, 0.02, 0.01),
    )
    return len(slide.shapes)


def kicker_title(slide, kicker: str, title: str, l=0.45, t=0.68, w=12.4, size=26):
    textbox(slide, l, t, w, 0.26, kicker.upper(), 11, True, TEAL, PP_ALIGN.LEFT, "ctr")
    textbox(slide, l, t + 0.24, w, 0.48, title, size, True, NAVY, PP_ALIGN.LEFT, "t")


def card(slide, l, t, w, h, eyebrow, title, body, accent=TEAL):
    sh = add_rect(slide, l, t, w, h, WHITE, adj=0.08, line=BORDER, drop=True)
    bar = add_rect(slide, l, t, 0.09, h, accent, rounded=False)
    lines = [eyebrow, title, body]
    tf = sh.text_frame
    tf.word_wrap = True
    tf.clear()
    set_anchor(tf, "t", 0.22, 0.14, 0.16, 0.12)
    specs = [
        (eyebrow, 10, True, TEAL),
        (title, 15, True, NAVY),
        (body, 12, False, MUTED),
    ]
    for i, (txt, sz, bd, col) in enumerate(specs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_before = Pt(0 if i == 0 else (6 if i == 1 else 8))
        p.space_after = Pt(0)
        run = p.add_run()
        run.text = txt
        run_font(run, sz, bd, col)
    return sh, bar


def num_card(slide, l, t, w, h, num, title, body):
    sh = add_rect(slide, l, t, w, h, WHITE, adj=0.08, line=BORDER, drop=True)
    badge = add_oval(slide, l + 0.18, t + 0.18, 0.42, 0.42, SOFT)
    shape_text(badge, [num], [11], [TEAL_DARK], [True], PP_ALIGN.CENTER, "ctr", (0, 0, 0, 0))
    tf = sh.text_frame
    tf.word_wrap = True
    tf.clear()
    set_anchor(tf, "t", 0.18, 0.72, 0.16, 0.12)
    specs = []
    if title:
        specs.append((title, 14, True, NAVY))
    specs.append((body, 13 if not title else 12, True if not title else False, NAVY if not title else MUTED))
    for i, (txt, sz, bd, col) in enumerate(specs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_before = Pt(0 if i == 0 else 6)
        run = p.add_run()
        run.text = txt
        run_font(run, sz, bd, col)
    return sh


def bullet_stack(slide, l, t, w, items, row_h=1.18):
    shapes = []
    for i, item in enumerate(items):
        y = t + i * (row_h + 0.12)
        sh = add_rect(slide, l, y, w, row_h, WHITE, adj=0.1, line=BORDER, drop=True)
        add_rect(slide, l, y, 0.09, row_h, TEAL, rounded=False)
        num = add_oval(slide, l + 0.22, y + (row_h - 0.38) / 2, 0.38, 0.38, SOFT)
        shape_text(num, [f"{i+1:02d}"], [10], [TEAL_DARK], [True], PP_ALIGN.CENTER, "ctr", (0, 0, 0, 0))
        tf = sh.text_frame
        tf.word_wrap = True
        tf.clear()
        set_anchor(tf, "ctr", 0.72, 0.1, 0.16, 0.1)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT
        run = p.add_run()
        run.text = item
        run_font(run, 13, False, NAVY)
        shapes.append(sh)
    return shapes


def add_transition(slide, kind="fade"):
    sld = slide._element
    for old in sld.findall(f"{{{P_NS}}}transition"):
        sld.remove(old)
    tr = etree.Element(f"{{{P_NS}}}transition")
    tr.set("spd", "med")
    tr.set("advClick", "1")
    child = etree.SubElement(tr, f"{{{P_NS}}}{kind}")
    if kind in ("push", "wipe", "cover"):
        child.set("dir", "r")
    # Place before clrMapOvr if present
    clr = sld.find(f"{{{P_NS}}}clrMapOvr")
    if clr is not None:
        clr.addprevious(tr)
    else:
        sld.append(tr)


def add_entrance_anims(slide, start_idx: int):
    ids = []
    for sh in list(slide.shapes)[start_idx:]:
        try:
            ids.append(int(sh.shape_id))
        except Exception:
            continue
    if not ids:
        return
    sld = slide._element
    for old in sld.findall(f"{{{P_NS}}}timing"):
        sld.remove(old)

    def el(tag, **attrs):
        node = etree.Element(f"{{{P_NS}}}{tag}")
        for k, v in attrs.items():
            node.set(k, str(v))
        return node

    timing = el("timing")
    tnLst = el("tnLst")
    par_root = el("par")
    cTn_root = el("cTn", id="1", dur="indefinite", restart="never", nodeType="tmRoot")
    child_root = el("childTnLst")
    seq = el("seq", concurrent="true", nextAc="seek")
    cTn_main = el("cTn", id="2", dur="indefinite", nodeType="mainSeq")
    child_main = el("childTnLst")

    nid = 10
    for i, spid in enumerate(ids[:18]):
        delay = 0 if i == 0 else 200
        par = el("par")
        cTn = el("cTn", id=str(nid), fill="hold")
        nid += 1
        st = el("stCondLst")
        st.append(el("cond", delay=str(delay)))
        cTn.append(st)
        inner_lst = el("childTnLst")
        par2 = el("par")
        cTn2 = el(
            "cTn",
            id=str(nid),
            presetID="10",
            presetClass="entr",
            presetSubtype="0",
            fill="hold",
            grpId="0",
            nodeType="withEffect",
        )
        nid += 1
        st2 = el("stCondLst")
        st2.append(el("cond", delay="0"))
        cTn2.append(st2)
        kids = el("childTnLst")
        # visibility
        setn = el("set")
        cb = el("cBhvr")
        cb.append(el("cTn", id=str(nid), dur="1", fill="hold"))
        nid += 1
        tgt = el("tgtEl")
        tgt.append(el("spTgt", spid=str(spid)))
        cb.append(tgt)
        an = el("attrNameLst")
        an.append(el("attrName"))
        an[0].text = "style.visibility"
        cb.append(an)
        setn.append(cb)
        to = el("to")
        to.append(el("strVal", val="visible"))
        setn.append(to)
        kids.append(setn)
        # fade
        anim = el("animEffect", transition="in", filter="fade")
        cb2 = el("cBhvr")
        cb2.append(el("cTn", id=str(nid), dur="500"))
        nid += 1
        tgt2 = el("tgtEl")
        tgt2.append(el("spTgt", spid=str(spid)))
        cb2.append(tgt2)
        anim.append(cb2)
        kids.append(anim)
        cTn2.append(kids)
        par2.append(cTn2)
        inner_lst.append(par2)
        cTn.append(inner_lst)
        par.append(cTn)
        child_main.append(par)

    cTn_main.append(child_main)
    seq.append(cTn_main)
    prev = el("prevCondLst")
    pc = el("cond", evt="onPrev", delay="0")
    te = el("tgtEl")
    te.append(el("sldTgt"))
    pc.append(te)
    prev.append(pc)
    nxt = el("nextCondLst")
    nc = el("cond", evt="onNext", delay="0")
    te2 = el("tgtEl")
    te2.append(el("sldTgt"))
    nc.append(te2)
    nxt.append(nc)
    seq.append(prev)
    seq.append(nxt)
    child_root.append(seq)
    cTn_root.append(child_root)
    par_root.append(cTn_root)
    tnLst.append(par_root)

    bld = el("bldLst")
    for spid in ids[:18]:
        bld.append(el("bldP", spid=str(spid), grpId="0", animBg="1"))
    timing.append(tnLst)
    timing.append(bld)
    sld.append(timing)


def style_pie(chart, colors, number_format="0", show_values=True):
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(10)
    chart.legend.font.color.rgb = NAVY
    chart.legend.font.name = FONT
    chart.has_title = False
    plot = chart.plots[0]
    plot.has_data_labels = show_values
    if show_values:
        dLbls = plot.data_labels
        dLbls.font.size = Pt(11)
        dLbls.font.bold = True
        dLbls.font.color.rgb = NAVY
        dLbls.font.name = FONT
        dLbls.number_format = number_format
    try:
        plot.doughnut_hole_size = 58
    except Exception:
        pass
    series = chart.series[0]
    for i, color in enumerate(colors):
        try:
            pt = series.points[i]
            pt.format.fill.solid()
            pt.format.fill.fore_color.rgb = color
            pt.format.line.color.rgb = WHITE
            pt.format.line.width = Pt(1.75)
        except Exception:
            pass
    try:
        chart.chart_area.format.fill.background()
        chart.plot_area.format.fill.background()
    except Exception:
        pass


def pie_chart(slide, l, t, w, h, cats, vals, colors, number_format="0", show_values=True):
    data = CategoryChartData()
    data.categories = cats
    data.add_series("Value", vals)
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.DOUGHNUT, Inches(l), Inches(t), Inches(w), Inches(h), data
    ).chart
    style_pie(chart, colors, number_format=number_format, show_values=show_values)
    return chart


# ---------------------------------------------------------------------------
# Pitch deck — 8 slides (Consent Guru facts only)
# ---------------------------------------------------------------------------

def s01(slide, logo):
    """Why consent + DPDP — the pitch opening."""
    i0 = add_chrome(slide, 1, logo)
    kicker_title(slide, "01  ·  The brief", "Why Consent. Why DPDP.")
    why = [
        "Users should know what data is collected and why",
        "Consent provides a clear record of the individual's choice",
        "Users should be able to give, review and withdraw consent",
        "Organisations need mechanisms to demonstrate and manage consent",
    ]
    for i, body in enumerate(why):
        x = 0.45 + (i % 2) * 4.15
        y = 1.50 + (i // 2) * 1.55
        num_card(slide, x, y, 4.0, 1.42, f"{i+1:02d}", "", body)
    panel = add_rect(slide, 8.75, 1.50, 4.15, 4.60, WHITE, adj=0.08, line=BORDER, drop=True)
    add_rect(slide, 8.75, 1.50, 4.15, 0.08, TEAL, rounded=False)
    shape_text(
        panel,
        [
            "What is DPDP?",
            "India's Digital Personal Data Protection Act, 2023",
            "Provides a framework for processing digital personal data",
            "Defines responsibilities of organisations processing personal data",
            "Provides rights and protections for individuals",
        ],
        [12, 15, 13, 13, 13],
        [TEAL, NAVY, MUTED, MUTED, MUTED],
        [True, True, False, False, False],
        PP_ALIGN.LEFT,
        "t",
        (0.24, 0.28, 0.2, 0.18),
    )
    bar = add_rect(slide, 0.45, 4.72, 8.05, 2.08, SOFT, adj=0.1)
    shape_text(
        bar,
        [
            "DPDP Act specifically recognises the concept of a Consent Manager",
            "India – DPDP Act: Explicitly recognises the Consent Manager concept",
        ],
        [16, 13],
        [NAVY, MUTED],
        [True, False],
        PP_ALIGN.LEFT,
        "ctr",
        (0.32, 0.16, 0.24, 0.16),
    )
    return i0


def s02(slide, logo):
    """DPDP penalties — urgency for the pitch."""
    i0 = add_chrome(slide, 2, logo)
    kicker_title(slide, "02  ·  The stakes", "DPDP Penalties: Up to ₹250 Crore")
    add_rect(slide, 0.4, 1.5, 6.35, 5.35, WHITE, adj=0.07, line=BORDER, drop=True)
    pie_chart(
        slide,
        0.55,
        1.7,
        6.05,
        4.15,
        [
            "Security safeguards",
            "Breach notify / child data",
            "Significant Data Fiduciary",
            "Other specified breaches",
        ],
        (250, 200, 150, 50),
        [TEAL, NAVY, TEAL_DARK, RGBColor(0x7A, 0x9A, 0xA8)],
        number_format="₹0",
    )
    textbox(
        slide,
        0.7,
        5.85,
        5.8,
        0.7,
        "Penalty amounts in ₹ crore as specified under the DPDP Act",
        11,
        False,
        MUTED,
        PP_ALIGN.CENTER,
    )
    facts = [
        ("₹250 crore", TEAL, "Failure to implement reasonable security safeguards"),
        ("₹200 crore", NAVY, "Failure to notify a personal data breach and certain child-data obligations"),
        ("₹150 crore", TEAL_DARK, "Breach of specified Significant Data Fiduciary obligations"),
        ("₹50 crore", WARN, "Other specified breaches; ₹10,000 for specified Data Principal duties"),
    ]
    for i, (amt, col, body) in enumerate(facts):
        y = 1.5 + i * 1.35
        sh = add_rect(slide, 6.95, y, 5.95, 1.22, WHITE, adj=0.1, line=BORDER, drop=True)
        add_rect(slide, 6.95, y, 0.1, 1.22, col, rounded=False)
        shape_text(
            sh,
            [amt, body],
            [18, 12],
            [col, MUTED],
            [True, False],
            PP_ALIGN.LEFT,
            "ctr",
            (0.28, 0.1, 0.16, 0.1),
        )
    return i0


def s03(slide, logo):
    """What is Consent Guru."""
    i0 = add_chrome(slide, 3, logo)
    kicker_title(slide, "03  ·  The product", "What is Consent Guru?")
    bullets = [
        "A Consent Management Platform for organisations",
        "Helps collect, record and manage user consent",
        "Designed with the Indian privacy and DPDP ecosystem in mind",
        "Provides a centralised platform for consent management",
    ]
    bullet_stack(slide, 0.45, 1.50, 7.15, bullets, 1.15)
    add_pic(slide, IMG["dash"], 7.85, 1.50, 5.05, 5.30)
    return i0


def s04(slide, logo):
    """Key features + unique positioning."""
    i0 = add_chrome(slide, 4, logo)
    kicker_title(slide, "04  ·  Product", "Key Features of Consent Guru")
    items = [
        ("01", "Consent banner and preference centre"),
        ("02", "Consent collection, recording and withdrawal"),
        ("03", "Consent logs and audit trail"),
        ("04", "Website, cookie and third-party tracker management"),
    ]
    for i, (num, body) in enumerate(items):
        x = 0.45 + i * 3.2
        sh = add_rect(slide, x, 1.48, 3.05, 2.55, WHITE, adj=0.08, line=BORDER, drop=True)
        add_rect(slide, x, 1.48, 3.05, 0.08, TEAL, rounded=False)
        badge = add_oval(slide, x + 0.18, 1.70, 0.42, 0.42, SOFT)
        shape_text(badge, [num], [11], [TEAL_DARK], [True], PP_ALIGN.CENTER, "ctr", (0, 0, 0, 0))
        shape_text(sh, [body], [14], [NAVY], [True], PP_ALIGN.LEFT, "ctr", (0.18, 0.72, 0.16, 0.14))
    uniques = [
        "India-first consent management",
        "Designed around the DPDP ecosystem",
        "Centralised management of multiple websites",
        "Simple implementation for organisations of different sizes",
    ]
    textbox(slide, 0.45, 4.18, 12.4, 0.28, "Unique Features of Consent Guru", 14, True, TEAL, PP_ALIGN.LEFT, "ctr")
    for i, body in enumerate(uniques):
        x = 0.45 + i * 3.2
        sh = add_rect(slide, x, 4.52, 3.05, 2.28, SOFT if i == 0 else WHITE, adj=0.1, line=BORDER, drop=True)
        shape_text(sh, [f"0{i+1}", body], [11, 13], [TEAL_DARK, NAVY], [True, True], PP_ALIGN.LEFT, "ctr", (0.2, 0.16, 0.16, 0.14))
    return i0


def s05(slide, logo):
    """Why Consent Guru vs the market."""
    i0 = add_chrome(slide, 5, logo)
    kicker_title(slide, "05  ·  Why us", "Consent Guru vs other CMPs")
    quote = add_rect(slide, 0.45, 1.48, 12.45, 1.05, SOFT, adj=0.1)
    shape_text(
        quote,
        ["Consent Guru differentiates through its India-first and DPDP-focused positioning"],
        [16],
        [NAVY],
        [True],
        PP_ALIGN.CENTER,
        "ctr",
        (0.3, 0.12, 0.3, 0.12),
    )
    names = ["Consent Guru", "OneTrust", "Usercentrics", "Cookiebot", "Didomi"]
    for i, name in enumerate(names):
        x = 0.45 + i * 2.55
        chip = add_rect(slide, x, 2.68, 2.4, 0.48, SOFT if i == 0 else WHITE, adj=0.4, line=TEAL if i == 0 else BORDER)
        shape_text(chip, [name], [12], [NAVY], [True], PP_ALIGN.CENTER, "ctr", (0.06, 0.04, 0.06, 0.04))
    items = [
        ("Consent Guru", "India / DPDP-focused consent management", TEAL),
        ("CookieYes", "Global / SMB-oriented CMP", NAVY),
        ("Complianz", "Website / WordPress-oriented privacy solution", TEAL_DARK),
        ("OneTrust and Usercentrics", "Global enterprise/privacy platforms", PURPLE),
    ]
    for i, (name, body, col) in enumerate(items):
        x = 0.45 + (i % 2) * 6.4
        y = 3.35 + (i // 2) * 1.75
        sh = add_rect(slide, x, y, 6.15, 1.62, WHITE, adj=0.08, line=BORDER, drop=True)
        add_rect(slide, x, y, 0.1, 1.62, col, rounded=False)
        shape_text(
            sh,
            [name, body],
            [16, 13],
            [NAVY, MUTED],
            [True, False],
            PP_ALIGN.LEFT,
            "ctr",
            (0.32, 0.14, 0.2, 0.14),
        )
    return i0


def s06(slide, logo):
    """How it works — install, banner, scale."""
    i0 = add_chrome(slide, 6, logo)
    kicker_title(slide, "06  ·  Go live", "How to Install Consent Guru")
    steps = [
        ("01", "Create your Consent Guru account"),
        ("02", "Add and configure your website"),
        ("03", "Configure consent categories, purposes and preferences"),
        ("04", "Add the Consent Guru script to your website"),
    ]
    for i, (num, body) in enumerate(steps):
        y = 1.48 + i * 0.88
        sh = add_rect(slide, 0.45, y, 7.35, 0.78, WHITE, adj=0.12, line=BORDER, drop=True)
        badge = add_oval(slide, 0.62, y + 0.16, 0.46, 0.46, TEAL)
        shape_text(badge, [num], [11], [WHITE], [True], PP_ALIGN.CENTER, "ctr", (0, 0, 0, 0))
        shape_text(sh, [body], [14], [NAVY], [True], PP_ALIGN.LEFT, "ctr", (0.85, 0.08, 0.16, 0.08))
    add_pic(slide, IMG["install"], 8.05, 1.48, 4.85, 3.05)
    row = [
        ("On the website", "Clear options to Accept, Reject or Manage Preferences"),
        ("Multiple websites", "Add and manage multiple websites"),
        ("One dashboard", "Centralise consent configurations"),
    ]
    for i, (title, body) in enumerate(row):
        x = 0.45 + i * 4.25
        sh = add_rect(slide, x, 5.18, 4.1, 1.62, WHITE, adj=0.1, line=BORDER, drop=True)
        add_rect(slide, x, 5.18, 4.1, 0.08, TEAL, rounded=False)
        shape_text(sh, [title, body], [12, 13], [TEAL_DARK, NAVY], [True, False], PP_ALIGN.LEFT, "ctr", (0.2, 0.22, 0.16, 0.12))
    return i0


def s07(slide, logo):
    """Why businesses buy + lifecycle."""
    i0 = add_chrome(slide, 7, logo)
    kicker_title(slide, "07  ·  Outcomes", "Why Businesses Need Consent Guru")
    items = [
        ("01", "Simplify consent management"),
        ("02", "Maintain centralised consent records"),
        ("03", "Improve transparency and user control"),
        ("04", "Support organisational privacy and compliance processes"),
    ]
    for i, (num, body) in enumerate(items):
        x = 0.45 + (i % 2) * 6.4
        y = 1.48 + (i // 2) * 1.85
        num_card(slide, x, y, 6.15, 1.72, num, "", body)
    steps = ["Collect", "Record", "Manage", "Communicate", "Withdraw", "Audit"]
    for i, name in enumerate(steps):
        x = 0.45 + i * 2.14
        chip = add_rect(slide, x, 5.35, 2.0, 0.62, TEAL if i % 2 == 0 else NAVY, adj=0.35)
        shape_text(chip, [name], [12], [WHITE], [True], PP_ALIGN.CENTER, "ctr", (0.04, 0.04, 0.04, 0.04))
        if i < 5:
            add_rect(slide, x + 1.98, 5.58, 0.18, 0.08, TEAL, rounded=False)
    textbox(
        slide,
        0.45,
        6.08,
        12.4,
        0.72,
        "Collect → Record → Manage → Communicate → Withdraw → Audit    ·    Consent is not simply a one-time checkbox",
        13,
        False,
        MUTED,
        PP_ALIGN.LEFT,
        "ctr",
    )
    return i0


def s08(slide, logo):
    """Close — questions + contact."""
    i0 = add_chrome(slide, 8, logo)
    kicker_title(slide, "08  ·  Next step", "Experience Consent Guru")
    phrases = [
        ("Your Data.", NAVY),
        ("Your Consent.", TEAL_DARK),
        ("Your Choice.", TEAL),
    ]
    for i, (txt, col) in enumerate(phrases):
        x = 0.45 + i * 4.25
        sh = add_rect(slide, x, 1.48, 4.1, 1.45, WHITE, adj=0.1, line=BORDER, drop=True)
        shape_text(sh, [txt], [22], [col], [True], PP_ALIGN.CENTER, "ctr", (0.1, 0.1, 0.1, 0.1))
    hero = add_rect(slide, 0.45, 3.12, 7.35, 1.55, NAVY, adj=0.1, drop=True)
    shape_text(
        hero,
        ["CONSENT GURU", "Consent Management. Simplified."],
        [22, 14],
        [WHITE, TEAL],
        [True, False],
        PP_ALIGN.LEFT,
        "ctr",
        (0.36, 0.18, 0.24, 0.18),
    )
    web = add_rect(slide, 8.05, 3.12, 4.85, 1.55, WHITE, adj=0.1, line=BORDER, drop=True)
    shape_text(
        web,
        ["Website: www.consentguru.in", SITE_URL],
        [14, 14],
        [NAVY, TEAL_DARK],
        [True, True],
        PP_ALIGN.LEFT,
        "ctr",
        (0.28, 0.16, 0.2, 0.16),
    )
    extra = add_rect(slide, 0.45, 4.88, 7.35, 1.92, SOFT, adj=0.1)
    shape_text(
        extra,
        ["Email / Phone / Address: Add your official details", "Questions?"],
        [15, 20],
        [NAVY, TEAL_DARK],
        [True, True],
        PP_ALIGN.LEFT,
        "ctr",
        (0.32, 0.2, 0.24, 0.18),
    )
    add_pic(slide, IMG["contact"], 8.05, 4.88, 4.85, 1.92)
    return i0


def main():
    logo = crop_logo()
    prs = Presentation()
    prs.slide_width = Inches(13.333333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    builders = [s01, s02, s03, s04, s05, s06, s07, s08]
    for fn in builders:
        slide = prs.slides.add_slide(blank)
        fn(slide, logo)
    prs.core_properties.title = "Consent Guru — Pitch Deck"
    prs.core_properties.author = "Consent Guru"
    prs.core_properties.subject = "8-slide Consent Guru pitch"
    prs.core_properties.comments = "Pitch cut of base deck. Facts unchanged. www.consentguru.com"
    prs.save(str(OUT))
    print(f"Wrote {OUT} with {len(prs.slides)} slides")


if __name__ == "__main__":
    main()
