#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《熟词僻义 100 题专项训练册》电子版生成器（reportlab 原生排版，非 HTML 转印）

环境说明：本机无 node / playwright / poppler，HTML→PDF 路线不可用，
故改用 reportlab 直接排版（中文用系统 STHeiti 嵌入，英文同一字体）。

输入：data/product/shici_book.json（由 tools/build_book.py 装配）
输出：output/熟词僻义100题专项训练册.pdf

结构：
  封面 → 使用说明 + 目录（可点击）→ 5 个教学单元（题目页）→ 答案速查表
      → 逐题解析 → 义项速查表 → 7 天打卡表
"""
import json
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

# reportlab 默认在普通空格处断行。中文排版里「第 7 天 10 题」不能被拆成
# 「…10」和「题。」两行 —— 在 Paragraph 入口统一把「数字 + 空格 + 量词」
# 中间的空格换成不换行空格（U+00A0），一处生效，全文受益。
_NBSP_RE = re.compile("(?<=\\d)\\u0020(?=[题个次道天页本份条句篇人轮周分秒元%])")


def nbsp(s):
    if not isinstance(s, str):
        return s  # reportlab 内部会用 Paragraph(None, style) 造列表项
    return _NBSP_RE.sub(" ", s)


def pricing_line(meta):
    """分档定价行：按覆盖词量排三档。纸质打印不单独设档。"""
    p = meta["pricing"]
    parts = [f"{t['questions']} 题 ¥{t['price']}" for t in p["tiers"]]
    return "分档定价：" + "　|　".join(parts)


class Paragraph(Paragraph):
    """统一做「数字 + 量词」不换行处理的 Paragraph"""

    def __init__(self, text, style, *args, **kwargs):
        super().__init__(nbsp(text), style, *args, **kwargs)


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "product", "shici_book.json")
OUT_DIR = os.path.join(ROOT, "output")
OUT = os.path.join(OUT_DIR, "熟词僻义100题专项训练册.pdf")
OUT_SAMPLE = os.path.join(OUT_DIR, "熟词僻义100题专项训练册-免费体验3题.pdf")

# ── 颜色（1 强调色 + 灰阶，琥珀仅用于难度标记）────────────────────────
INK = colors.HexColor("#111c18")
INK2 = colors.HexColor("#42514c")
INK3 = colors.HexColor("#7c8b85")
LINE = colors.HexColor("#d8ded9")
LINE2 = colors.HexColor("#eef1ee")
ACCENT = colors.HexColor("#0f5c43")      # 强调色：深绿（产品主色）
ACCENT_BG = colors.HexColor("#eaf3ef")
AMBER = colors.HexColor("#b45309")
PAPER = colors.white

PAGE_W, PAGE_H = A4
LM = RM = 16 * mm
TM = 16 * mm
BM = 16 * mm
CONTENT_W = PAGE_W - LM - RM

DIFF_LABEL = {"easy": "基础", "mid": "中等", "hard": "较难"}
DIFF_COLOR = {"easy": INK3, "mid": AMBER, "hard": ACCENT}
CARRIER_LABEL = {"C1": "阅读理解", "C2": "完形填空", "C3": "语法填空",
                 "C4": "应用文写作", "C5": "读后续写", "C6": "七选五"}


def register_fonts():
    """系统字体嵌入：STHeiti 简体中文子字体。"""
    pairs = [
        ("/System/Library/Fonts/STHeiti Medium.ttc", 1, "HeiM"),
        ("/System/Library/Fonts/STHeiti Light.ttc", 1, "HeiL"),
    ]
    for path, idx, alias in pairs:
        if not os.path.exists(path):
            raise SystemExit(f"缺少中文字体: {path}")
        pdfmetrics.registerFont(TTFont(alias, path, subfontIndex=idx))
    pdfmetrics.registerFontFamily("HeiM", normal="HeiM", bold="HeiM")
    pdfmetrics.registerFontFamily("HeiL", normal="HeiL", bold="HeiM")


def S(name, **kw):
    base = dict(name=name, fontName="HeiL", fontSize=9.4, leading=14.2,
                textColor=INK, spaceBefore=0, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(**base)


def build_styles():
    return {
        "cover_title": S("cover_title", fontName="HeiM", fontSize=30, leading=40,
                         alignment=TA_LEFT),
        "cover_sub": S("cover_sub", fontSize=13.5, leading=21, textColor=INK2),
        "cover_kicker": S("cover_kicker", fontName="HeiM", fontSize=9.5, leading=14,
                          textColor=ACCENT),
        "cover_body": S("cover_body", fontSize=10, leading=16.5, textColor=INK2),
        "h1": S("h1", fontName="HeiM", fontSize=17, leading=24, spaceBefore=0,
                spaceAfter=4),
        "h2": S("h2", fontName="HeiM", fontSize=12.6, leading=18, spaceBefore=7,
                spaceAfter=3),
        "body": S("body", fontSize=9.6, leading=15.2),
        "body_s": S("body_s", fontSize=8.8, leading=13.4, textColor=INK2),
        "lead": S("lead", fontSize=10.4, leading=17.4, textColor=INK2),
        "q": S("q", fontSize=9.8, leading=15),
        "q_cn": S("q_cn", fontSize=9.2, leading=14, textColor=INK2),
        "meta": S("meta", fontSize=8.2, leading=12, textColor=INK3),
        "exp": S("exp", fontSize=8.9, leading=13.6),
        "cell": S("cell", fontSize=8.5, leading=12.4),
        "cell_h": S("cell_h", fontName="HeiM", fontSize=8.5, leading=12.4,
                    textColor=INK),
        "toc_title": S("toc_title", fontName="HeiM", fontSize=17, leading=24),
    }


class BookDoc(BaseDocTemplate):
    """带可点击目录的文档模板。"""

    def __init__(self, filename, styles, **kw):
        BaseDocTemplate.__init__(self, filename, pagesize=A4,
                                 leftMargin=LM, rightMargin=RM,
                                 topMargin=TM, bottomMargin=BM, **kw)
        self.styles = styles
        cover_frame = Frame(LM, BM, CONTENT_W, PAGE_H - TM - BM, id="cover")
        body_frame = Frame(LM, BM, CONTENT_W, PAGE_H - TM - BM, id="body")
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[cover_frame], onPage=self.cover_page),
            PageTemplate(id="Body", frames=[body_frame], onPage=self.body_page),
        ])
        self.seq_title = 0

    # ── 页眉页脚 ──────────────────────────────────────────────────────
    def cover_page(self, canv, doc):
        canv.saveState()
        canv.setFillColor(ACCENT)
        canv.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, stroke=0, fill=1)
        canv.setFillColor(ACCENT_BG)
        canv.rect(0, PAGE_H - 34 * mm, PAGE_W, 22 * mm, stroke=0, fill=1)
        canv.restoreState()

    def body_page(self, canv, doc):
        canv.saveState()
        canv.setFont("HeiL", 7.8)
        canv.setFillColor(INK3)
        canv.drawString(LM, PAGE_H - TM + 5 * mm, "拾词 · 熟词僻义 100 题专项训练册")
        canv.drawRightString(PAGE_W - RM, PAGE_H - TM + 5 * mm, "v1.0 · 仿真例句")
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.5)
        canv.line(LM, PAGE_H - TM + 3 * mm, PAGE_W - RM, PAGE_H - TM + 3 * mm)
        canv.line(LM, BM - 3 * mm, PAGE_W - RM, BM - 3 * mm)
        canv.setFont("HeiL", 8)
        canv.drawCentredString(PAGE_W / 2, BM - 7.5 * mm, str(canv.getPageNumber() - 1))
        canv.restoreState()

    # ── 目录登记 ──────────────────────────────────────────────────────
    def beforeDocument(self):
        # multiBuild 会对同一文档对象反复构建；目录条目编号必须每趟重置，
        # 否则 key 每趟都变，页码永远收敛不了（Index entries not resolved）
        self.seq_title = 0
        try:
            self.seq.reset()
        except Exception:
            pass

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style = flowable.style.name
            if style == "h1" and flowable.getPlainText() != "目录":
                text = flowable.getPlainText()
                self.seq_title += 1
                key = f"toc-{self.seq_title}"
                self.canv.bookmarkPage(key)
                self.notify("TOCEntry", (0, text, self.page, key))


def esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def kv_table(rows, styles, widths, header=None):
    data = []
    if header:
        data.append([Paragraph(h, styles["cell_h"]) for h in header])
    for r in rows:
        data.append([Paragraph(str(c), styles["cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_BG) if header else ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [PAPER, LINE2]),
    ]))
    return t


def option_table(q, styles):
    opts = q["options"]
    cells = []
    for o in opts:
        mark = "●" if o.get("correct") else ""
        cells.append(Paragraph(
            f'<font color="#0f5c43"><b>{o["key"]}.</b></font> {esc(o["text"])}', styles["cell"]))
    data = [cells[0:2], cells[2:4]]
    t = Table(data, colWidths=[CONTENT_W / 2 - 2, CONTENT_W / 2 - 2])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
    ]))
    return t


def question_block(q, styles, with_answer_box=True):
    """一道题的排版。"""
    parts = []
    no = q["book_no"]
    meta = (f'<font color="#0f5c43">{CARRIER_LABEL.get(q["carrier"], q["carrier"])}</font>'
            f' · 难度 {DIFF_LABEL.get(q["difficulty"], q["difficulty"])}'
            f' · 义项层级 {q.get("sense_level", "")}')
    head = (f'<b><font color="#0f5c43">{no}</font></b>　'
            f'{esc(q["stem"])}')
    parts.append(Paragraph(head, styles["q"]))
    parts.append(Paragraph(esc(q["stem_cn"]), styles["q_cn"]))
    parts.append(Spacer(1, 3))
    parts.append(option_table(q, styles))
    parts.append(Spacer(1, 3))
    parts.append(Paragraph(meta, styles["meta"]))
    if with_answer_box:
        parts.append(Spacer(1, 5))
        parts.append(Paragraph(
            '我的答案：<font color="#ffffff">.</font>　　'
            '对答案用：<font color="#ffffff">.</font>　'
            '订正笔记：<font color="#ffffff">____________________________</font>',
            styles["meta"]))
    return KeepTogether(parts)


def build_sample(book, styles):
    """免费体验样张：封面 + 3 道题（含解析）+ 购买引导页。

    这是电商漏斗顶端的资产——详情页可下载的样张文件。
    """
    qs = book["questions"]
    # 3 题要覆盖三种难度、且尽量来自不同单元（让样张体现「每个单元一个考场动作」）
    picks, used_units = [], set()
    for diff in ("easy", "mid", "hard"):
        cands = [q for q in qs if q["difficulty"] == diff]
        if not cands:
            continue
        pick = next((q for q in cands if q.get("unit_no") not in used_units), None)
        if pick is None:
            pick = cands[0]
        picks.append(pick)
        used_units.add(pick.get("unit_no"))
    if len(picks) < 3:
        for q in qs:
            if q not in picks:
                picks.append(q)
            if len(picks) == 3:
                break
    picks = picks[:3]
    picks.sort(key=lambda q: q["book_no"])   # 按册内题号呈现，读者顺序自然

    doc = BookDoc(OUT_SAMPLE, styles)
    story = []
    meta = book["meta"]
    story.append(Spacer(1, 22 * mm))
    story.append(Paragraph("拾词 · 高考英语词汇系统 · 单品系列", styles["cover_kicker"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("熟词僻义 100 题<br/>专项训练册 · 免费体验", styles["cover_title"]))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(f"完整版 100 题 / 100 个高频词 / {len(book['units'])} 个教学单元 / 7 天打卡表", styles["cover_sub"]))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(
        "这份样张给你 3 道题，连解析一起。做完你会发现：高考词汇丢分，"
        "多数不是词不认识，而是同一个词在句子里该取哪个义没分清。<br/>"
        "完整版把这 100 个高频词逐个拆开，每个词只考它最容易错的那一个意思。",
        styles["cover_body"]))
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph(pricing_line(meta), styles["cover_body"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        f"全包 ¥{meta['pricing']['bundle']['price']}：{meta['pricing']['bundle']['includes']}",
        styles["cover_body"]))
    story.append(Spacer(1, 11 * mm))
    story.append(Paragraph("样张之外，完整版还给你四样东西", styles["h2"]))
    story.append(Spacer(1, 4))
    story.append(kv_table([
        ["<b>一个考点</b>", "100 题覆盖 100 个高考高频词的陷阱义，一个词只考它最容易错的那一个意思。"],
        ["<b>一个动作</b>", "每题给一句能直接用的考场动作：看什么线索 → 锁定哪个义。"],
        ["<b>一个错因</b>", "三个干扰项都写清「学生为什么会选它」，错题因此可归因、可复盘。"],
        ["<b>一份速查</b>", "义项速查表按题号排，与 App 里被单独排期的义项一一对应。"],
    ], styles, [CONTENT_W * 0.20, CONTENT_W * 0.80]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "本册例句均为自编仿真例句，不含任何真题原文、真题选项或真题解析。",
        styles["cover_body"]))

    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())
    story.append(Paragraph("免费体验 · 3 题", styles["h1"]))
    story.append(Paragraph("建议先独立作答再看解析。", styles["body_s"]))
    story.append(Spacer(1, 5))
    for q in picks:
        q2 = dict(q)
        q2["sense_level"] = q.get("sense_level", "")
        story.append(question_block(q2, styles, with_answer_box=True))
        story.append(Spacer(1, 10))

    story.append(PageBreak())
    story.append(Paragraph("这 3 题的解析", styles["h1"]))
    qmap = {q["book_no"]: q for q in qs}
    for q in picks:
        story.append(Paragraph(
            f'<b><font color="#0f5c43">第 {q["book_no"]} 题</font></b>　'
            f'<b>{esc(q["answer_key"])}</b>　{esc(q["answer_text"])}', styles["exp"]))
        story.append(Spacer(1, 2))
        story.append(Paragraph(esc(q["explanation"]).replace("\n", "<br/>"), styles["exp"]))
        story.append(Spacer(1, 2))
        dis = [f'<b>{o["key"]}. {esc(o["text"])}</b> —— {esc(o["distractor_reason"] or "")}'
               for o in q["options"] if not o.get("correct")]
        if dis:
            story.append(Paragraph("<br/>".join(dis), styles["exp"]))
        story.append(Spacer(1, 9))

    story.append(PageBreak())
    story.append(Paragraph("完整版里有什么", styles["h1"]))
    rows = [
        ["<b>完整版 100 题</b>", "覆盖 100 个高考高频词的陷阱义，一个词只考它最容易错的那一个意思。"],
        [f"<b>{len(book['units'])} 个教学单元</b>",
         "每个单元配一个考场动作：看宾语 / 看定语与介词 / 整块背 / 看修饰对象 / 义项树摊开。"],
        ["<b>答案速查表</b>", "100 题答案 + 考到的义项 + 题型难度，一页对完。"],
        ["<b>逐题解析</b>", "【考场动作】→【为什么选】→【其他选项】+ 三个干扰项各自的「选它的人在想什么」。"],
        ["<b>义项速查表</b>", "100 个词本册考过的那一个义项，配高频搭配，按题号排——与 App 里排期的义项一一对应。"],
        ["<b>7 天打卡表</b>", "前 6 天各 15 题，第 7 天 10 题，错题记题号，第 8 天重做。"],
    ]
    story.append(kv_table(rows, styles, [CONTENT_W * 0.26, CONTENT_W * 0.74]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"{pricing_line(meta)}（电子 PDF，可自行双面打印）　|　"
        f"全包 ¥{meta['pricing']['bundle']['price']}：{meta['pricing']['bundle']['includes']}",
        styles["body"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "全书例句均为自编仿真例句，不含任何真题原文、真题选项或真题解析；"
        "中文释义为自行改写措辞，未搬运教材原文与词典释义。", styles["body_s"]))

    doc.multiBuild(story)
    from pypdf import PdfReader
    r = PdfReader(OUT_SAMPLE)
    print(f"✅ 样张 PDF → {os.path.relpath(OUT_SAMPLE, ROOT)}  {len(r.pages)} 页")


def build():
    if not os.path.exists(SRC):
        raise SystemExit(f"缺少 {SRC}，请先运行 tools/build_book.py")
    with open(SRC, encoding="utf-8") as f:
        book = json.load(f)
    register_fonts()
    styles = build_styles()
    os.makedirs(OUT_DIR, exist_ok=True)

    doc = BookDoc(OUT, styles)
    story = []
    meta = book["meta"]
    st = meta["stats"]

    # ── 封面 ──────────────────────────────────────────────────────────
    story.append(Spacer(1, 26 * mm))
    story.append(Paragraph("拾词 · 高考英语词汇系统 · 单品系列", styles["cover_kicker"]))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("熟词僻义<br/>100 题专项训练册", styles["cover_title"]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(meta["subtitle"], styles["cover_sub"]))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(meta["positioning"], styles["cover_body"]))

    strip = [
        [f'<b>{st["questions"]}</b>', f'<b>{st["words"]}</b>', f'<b>{st["units"]}</b>', f'<b>7</b>'],
        ["道题目", "个高频词", "个教学单元", "天一轮"],
    ]
    kpi_big = S("kpi_big", fontName="HeiM", fontSize=21, leading=26,
                alignment=TA_CENTER, textColor=ACCENT)
    kpi_small = S("kpi_small", fontSize=8.5, leading=12, alignment=TA_CENTER,
                  textColor=INK3)
    t = Table([[Paragraph(c, kpi_big) for c in strip[0]],
               [Paragraph(c, kpi_small) for c in strip[1]]],
              colWidths=[CONTENT_W / 4] * 4)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 1),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT_BG),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
    ]))
    story.append(t)
    story.append(Spacer(1, 12 * mm))

    promise_rows = [
        ["<b>每题一个考点</b>", "100 题覆盖 100 个高考高频词的陷阱义，一个词只考它最容易错的那一个意思。"],
        ["<b>每题一个考场动作</b>", "解析不是词义罗列，是「看到什么线索 → 锁定哪个义」的可执行步骤。"],
        ["<b>每题一个错因</b>", "三个干扰项都写清「学生为什么会选它」，错题因此可归因、可复盘。"],
    ]
    story.append(kv_table(promise_rows, styles, [CONTENT_W * 0.28, CONTENT_W * 0.72]))
    story.append(Spacer(1, 9 * mm))
    scene_rows = [
        ["<b>什么时候用</b>",
         "高三一轮复习期；考前 60 天做专项补漏；月考后诊断出「阅读理解词汇失分」时。"],
        ["<b>怎么用</b>",
         "每天 15 题（第 7 天 10 题），7 天一轮。错题只抄解析里的【考场动作】那一段，抄进错题本。"],
        ["<b>交付形式</b>",
         "A4 竖版 PDF，文本可选中、可搜索、可打印。纸质版请双面打印，页码已避开装订位。"],
    ]
    story.append(kv_table(scene_rows, styles, [CONTENT_W * 0.20, CONTENT_W * 0.80]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "版权声明：全书例句均为自编仿真例句，不含任何真题原文、真题选项或真题解析；"
        "中文释义为自行改写措辞，未搬运教材原文与词典释义。",
        styles["body_s"]))

    # ── 使用说明 + 目录 ───────────────────────────────────────────────
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())
    story.append(Paragraph("使用说明", styles["h1"]))
    story.append(Paragraph("这本册子怎么用", styles["h2"]))
    steps = [
        ("先做，再看", "一个单元做完再对答案。一上来就翻解析，等于把练习变成阅读。"),
        ("错题只抄「考场动作」", "解析里【考场动作】那一段抄到错题本上，写 3–5 行即可，不要整段抄。"),
        ("按义项背，不按单词背", "同一个词，App 端的义项树会显示每个义项的掌握度。册子里的义项速查表按题号排，"
                          "正好对应你在 App 里排期的义项。"),
        ("7 天一轮，第 8 天重做错题", "打卡表按 7 天排，前 6 天各 15 题，第 7 天 10 题。错题在下一轮重做，正确率上不去说明是义项没分清，"
                              "不是题目没记住。"),
    ]
    step_rows = []
    for i, (t1, t2) in enumerate(steps, start=1):
        step_rows.append([Paragraph(f'<b>{i}</b>', styles["body"]),
                          Paragraph(f'<b>{esc(t1)}</b><br/>{esc(t2)}', styles["body"])])
    st_table = Table(step_rows, colWidths=[8 * mm, CONTENT_W - 8 * mm])
    st_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (1, 0), (1, -2), 0.3, LINE),
    ]))
    story.append(st_table)
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        f"本册共 {len(book['units'])} 个单元，难度分布 基础 15 题 / 中等 55 题 / 较难 30 题；"
        "题型覆盖阅读理解、完形填空、语法填空、应用文写作、读后续写、七选五。",
        styles["body_s"]))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("目录", styles["h1"]))
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(name="toc0", fontName="HeiM", fontSize=10.2, leading=18,
                       leftIndent=0, firstLineIndent=0, spaceBefore=3, textColor=INK),
        ParagraphStyle(name="toc1", fontName="HeiL", fontSize=9.4, leading=16,
                       leftIndent=14, firstLineIndent=0, spaceBefore=1, textColor=INK2),
    ]
    story.append(toc)

    # ── 单元与题目 ────────────────────────────────────────────────────
    # 单元之间连续排版（不强制换页）：强制换页会在单元末尾留下大面积空白页，
    # 单元标题用 KeepTogether 锁住，避免标题与「考场动作」卡被拆到两页。
    for u in book["units"]:
        card = Table([[Paragraph(f'<b>考场动作</b><br/>{esc(u["action"])}', styles["body"])]],
                     colWidths=[CONTENT_W])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ACCENT_BG),
            ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether([
            Paragraph(u["title"], styles["h1"]),
            Paragraph(u["focus"], styles["h2"]),
            card,
        ]))
        story.append(Spacer(1, 7))
        for q in u["questions"]:
            q = dict(q)
            q["sense_level"] = q.get("sense_level", "")
            story.append(question_block(q, styles))
            story.append(Spacer(1, 7))

    # ── 答案速查表 ────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("答案速查表", styles["h1"]))
    story.append(Paragraph("先按题号核对，再把错题号抄进打卡表的「错题」栏。", styles["body_s"]))
    story.append(Spacer(1, 4))
    rows = []
    for a in book["answers"]:
        rows.append([str(a["book_no"]), a["answer"], a["word"],
                     esc(a["sense_text"]), DIFF_LABEL.get(a["difficulty"], ""),
                     CARRIER_LABEL.get(a["carrier"], "")])
    story.append(kv_table(rows, styles,
                           [CONTENT_W * 0.06, CONTENT_W * 0.07, CONTENT_W * 0.17,
                            CONTENT_W * 0.42, CONTENT_W * 0.13, CONTENT_W * 0.15],
                           header=["题号", "答案", "词", "考到的义项", "难度", "题型"]))

    # ── 逐题解析 ──────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("逐题解析", styles["h1"]))
    story.append(Paragraph(
        "每题三段：【考场动作】→【为什么选 X】→【其他选项】。"
        "干扰项后面的「选它的人在想什么」是本册最该抄的部分。", styles["body_s"]))
    story.append(Spacer(1, 4))
    qmap = {q["book_no"]: q for q in book["questions"]}
    for u in book["units"]:
        story.append(Paragraph(u["title"], styles["h2"]))
        for no in u["question_nos"]:
            q = qmap[no]
            head = (f'<b><font color="#0f5c43">第 {no} 题</font></b>　'
                    f'<b>{esc(q["answer_key"])}</b>　{esc(q["answer_text"])}　'
                    f'<font color="#7c8b85">{CARRIER_LABEL.get(q["carrier"], "")} · '
                    f'{DIFF_LABEL.get(q["difficulty"], "")}</font>')
            story.append(Paragraph(head, styles["exp"]))
            story.append(Spacer(1, 2))
            story.append(Paragraph(esc(q["explanation"]).replace("\n", "<br/>"), styles["exp"]))
            story.append(Spacer(1, 2))
            dis = []
            for o in q["options"]:
                if o.get("correct"):
                    continue
                dis.append(f'<b>{o["key"]}. {esc(o["text"])}</b> —— {esc(o["distractor_reason"] or "")}')
            if dis:
                story.append(Paragraph("<br/>".join(dis), styles["exp"]))
            story.append(Spacer(1, 8))

    # ── 义项速查表 ────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("义项速查表", styles["h1"]))
    story.append(Paragraph(
        "按题号排。每一行是本册考过的那一个义项——也就是 App 里被单独排期的那个义项。", styles["body_s"]))
    story.append(Spacer(1, 4))
    rows = []
    for e in book["wordlist"]:
        cols = "　".join(e["collocations"][:3]) if e.get("collocations") else "—"
        rows.append([
            str(e["book_no"]),
            f'<b>{esc(e["headword"])}</b><br/><font size="7.4" color="#7c8b85">{esc(e["ipa"])}</font>',
            esc(e["sense_text"]),
            e["sense_level"],
            esc(cols),
        ])
    story.append(kv_table(rows, styles,
                           [CONTENT_W * 0.06, CONTENT_W * 0.18, CONTENT_W * 0.32,
                            CONTENT_W * 0.08, CONTENT_W * 0.36],
                           header=["题号", "词 / 音标", "本册考到的义项", "层级", "高频搭配（整块背）"]))

    # ── 7 天打卡表 ────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("7 天打卡表", styles["h1"]))
    story.append(Paragraph(
        "每天 15 题，第 7 天收尾 10 题并重做全部错题。错题栏填题号，第 8 天回来重做。", styles["body_s"]))
    story.append(Spacer(1, 5))
    rows = []
    for d in book["plan"]:
        rows.append([
            f'<b>第 {d["day"]} 天</b>',
            f'{d["from"]}–{d["to"]}',
            str(d["count"]),
            '<font color="#c2cbc6">·</font>',
            '<font color="#c2cbc6">·</font>',
            '<font color="#c2cbc6">·</font>',
            '<font color="#c2cbc6">·</font>',
            '<font color="#c2cbc6">·</font>',
        ])
    # 单元格必须包 Paragraph：裸字符串会用默认 Helvetica 绘制，中文变 ■ 且 HTML 标签被原样印出
    t = Table([[Paragraph(h, styles["cell_h"]) for h in
                ["天数", "题号范围", "题数", "用时", "正确", "错题号", "信心", "备注"]]] +
              [[Paragraph(c, styles["cell"]) for c in row] for row in rows],
              colWidths=[CONTENT_W * 0.13, CONTENT_W * 0.15, CONTENT_W * 0.09] +
                        [CONTENT_W * 0.105] * 5,
              rowHeights=[None] + [13 * mm] * len(rows))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_BG),
        ("BACKGROUND", (0, 1), (-1, -1), PAPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "拾词 · 高考英语词汇系统　|　例句为仿真例句，不含真题原文　|　"
        "v1.0　|　电子版可在手机与打印机双端使用，纸质版请自行双面打印",
        styles["body_s"]))

    doc.multiBuild(story)
    print(f"✅ PDF 生成 → {os.path.relpath(OUT, ROOT)}")
    from pypdf import PdfReader
    r = PdfReader(OUT)
    print(f"   页数 {len(r.pages)}")
    links = 0
    for p in r.pages:
        for a in (p.get("/Annots") or []):
            try:
                if a.get_object().get("/Subtype") == "/Link":
                    links += 1
            except Exception:
                pass
    print(f"   可点击链接 {links} 个")

    build_sample(book, styles)


if __name__ == "__main__":
    build()
