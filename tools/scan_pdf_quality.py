#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
熟词僻义训练册 · PDF 质量门禁扫描器

把「抽检」变成可重复执行的机器验收。扫两件产物：
  1. output/熟词僻义100题专项训练册.pdf              （主册）
  2. output/熟词僻义100题专项训练册-免费体验3题.pdf   （样张）

检查项（任何一项失败 → 非零退出）：
  A. 结构：主册 8 个必备章节齐全、目录页存在且可点
  B. 空白页（该页可提取文本 < 20 字符）
  C. 稀疏页（该页可提取文本 < 200 字符）
  D. HTML 残留（<b> <font </ &nbsp; 等裸标签被印进 PDF）
  E. 缺字方块（■ / � —— reportlab 用 Helvetica 渲染 CJK 时的经典事故）
  F. 宣传禁用词（提分/保过/押题/押中/必胜 全文硬禁；
                 「保证」按短语判定，只在承诺语境下才算违规）
  G. 真题出处（只放行版权声明里的免责短语；
                 年份+卷名、真题改编等归属语境一律判违规）
  H. 题号齐全（1-100）、逐题解析 100 条、答案速查 100 条
  I. 目录链接：链接目标页必须真实存在，且每个章节起始页都被目录链到

用法：
  python3 tools/scan_pdf_quality.py
  python3 tools/scan_pdf_quality.py --book <pdf> --sample <pdf>
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 宣传禁用词 ───────────────────────────────────────────────────────
# 全文硬禁：这五个词在任何语境下都是宣传承诺，一律不得出现
BANNED_HARD = ["提分", "保过", "押题", "押中", "必胜"]
# 语境判定：「保证」在正文里是普通动词（"才能保证施工期间交通不受影响"），
# 只有构成承诺句式才算违规宣传
BANNED_CONTEXT = [
    (re.compile(r"保证[^。！？；\n]{0,8}(提分|提.{0,4}分|考上|过线|上线|拿分|不失分|正确率|稳过|必过)"),
     "保证+承诺"),
]

# ── 真题出处 ─────────────────────────────────────────────────────────
# 版权声明里的免责短语是必须存在的，放行
EXAM_ALLOWED = ["真题原文", "真题选项", "真题解析", "真题原题", "真题语料", "真题改编"]
# 归属语境：出现即违规
EXAM_PATTERNS = [
    (re.compile(r"(19|20)\d{2}\s*年?[^。\n]{0,12}?(全国|浙江|北京|上海|江苏|天津|山东|湖北|广东|湖南|安徽|四川|福建|辽宁|陕西|重庆|河北|河南|江西|海南|宁夏|青海|甘肃|云南|贵州|广西|内蒙古|新疆|西藏)卷"),
     "年份+卷名"),
    (re.compile(r"(全国|浙江|北京|上海|江苏)卷"), "卷名"),
    (re.compile(r"真题\s*(改编|语料|原题|改编自|选自)"), "真题改编"),
    (re.compile(r"(来源|出处|选自|改编自|摘自)\s*[:：]?\s*[^。\n]{0,10}真题"), "真题出处标注"),
    (re.compile(r"模拟卷|押题卷|密卷"), "模拟卷/押题卷"),
]

HTML_RESIDUE = ["<b>", "</b>", "<font", "</font>", "<br", "&nbsp;", "&amp;", "<i>", "</i>"]
GLYPH_BROKEN = ["■", "�"]

EMPTY_TEXT_CHARS = 20
SPARSE_TEXT_CHARS = 200
HEADER_LINES = 3  # 页眉三行：书名 / 版本 / 页码

CHAPTER_RE = re.compile(
    r"(使用说明|目录|单元[一二三四五六七八九十]|答案速查表|逐题解析|义项速查表|打卡表)")


def load_reader(path):
    from pypdf import PdfReader
    return PdfReader(path)


def page_texts(reader):
    out = []
    for i, p in enumerate(reader.pages):
        try:
            t = p.extract_text() or ""
        except Exception as e:  # pragma: no cover
            t = ""
            print(f"   ⚠️ 第 {i+1} 页文本提取异常：{e}")
        out.append(t)
    return out


def first_content_line(text):
    """跳过 3 行页眉后的第一行有效内容"""
    lines = [l.strip() for l in text.split("\n")]
    body = [l for l in lines[HEADER_LINES:] if l]
    return body[0] if body else ""


def chapter_title_lines(text):
    """页内所有「独立成行的章节标题」。

    版式约定：章节标题独占一行（可带 '· 副标题' 后缀，如「单元三 · 搭配里的那个意思」，
    或「7 天打卡表」这种带前缀的）。正文里出现的同名词（如「抄进打卡表的错题栏」）
    不是标题行，不能算章节起始页 —— 这是章节判定与正文交叉引用的分界线。
    """
    out = []
    for raw in text.split("\n")[HEADER_LINES:]:
        s = raw.strip()
        if not s or len(s) > 40:
            continue
        m = CHAPTER_RE.match(s)
        if m and re.fullmatch(r"(?:\d+\s*天\s*)?" + re.escape(m.group(1)) + r"(?:\s*·.*)?", s):
            out.append(m.group(1))
    return out



def link_destinations(reader):
    """返回 {源页号(1-based): [目标页号(1-based), ...]}"""
    idnum_to_page = {}
    for i, p in enumerate(reader.pages):
        try:
            ref = p.indirect_reference
            if ref is not None and hasattr(ref, "idnum"):
                idnum_to_page[ref.idnum] = i + 1
        except Exception:
            pass

    mapping = {}
    for i, p in enumerate(reader.pages):
        try:
            annots = p.get("/Annots")
        except Exception:
            annots = None
        if not annots:
            continue
        dests = []
        for a in annots:
            try:
                obj = a.get_object()
            except Exception:
                continue
            if obj.get("/Subtype") != "/Link":
                continue
            dest = obj.get("/Dest")
            if dest is None and obj.get("/A") is not None:
                try:
                    act = obj["/A"].get_object()
                    if act.get("/S") == "/GoTo":
                        dest = act.get("/D")
                except Exception:
                    dest = None
            page_no = None
            if isinstance(dest, list) and dest:
                d0 = dest[0]
                if isinstance(d0, int):
                    page_no = idnum_to_page.get(d0)
                else:
                    try:
                        page_no = idnum_to_page.get(d0.idnum)
                    except Exception:
                        page_no = None
            elif isinstance(dest, dict):
                try:
                    page_no = idnum_to_page.get(dest[0].idnum)
                except Exception:
                    page_no = None
            if page_no:
                dests.append(page_no)
        if dests:
            mapping[i + 1] = dests
    return mapping


def chapter_pages(texts, exclude_pages=()):
    """章节起始页：按「独立成行的标题」判定，并排除目录页。

    目录页会把所有章节名列成条目，若不排除，单元一会被误判成从目录页开始。
    """
    found = {}
    for i, t in enumerate(texts):
        if (i + 1) in exclude_pages:
            continue
        for name in chapter_title_lines(t):
            found.setdefault(name, []).append(i + 1)
    return found



def scan(path, is_book):
    print(f"\n{'='*70}\n扫描：{os.path.relpath(path, ROOT)}\n{'='*70}")
    reader = load_reader(path)
    texts = page_texts(reader)
    npages = len(reader.pages)
    errors = []
    warns = []

    print(f"  页数：{npages}")

    # ── B/C 空白页与稀疏页 ───────────────────────────────────────────
    blanks, sparses = [], []
    for i, t in enumerate(texts):
        n = len(t.strip())
        if n < EMPTY_TEXT_CHARS:
            blanks.append(i + 1)
        elif n < SPARSE_TEXT_CHARS:
            sparses.append((i + 1, n))
    if blanks:
        errors.append(f"空白页 {len(blanks)} 页：{blanks}")
    print(f"  空白页（<{EMPTY_TEXT_CHARS}字符）：{len(blanks)}"
          + (f" → {blanks}" if blanks else " ✓"))
    if sparses:
        warns.append(f"稀疏页 {len(sparses)} 页：{sparses}")
    print(f"  稀疏页（<{SPARSE_TEXT_CHARS}字符）：{len(sparses)}"
          + (f" → {sparses}" if sparses else " ✓"))

    full = "\n".join(texts)

    # ── D HTML 残留 ──────────────────────────────────────────────────
    hits = [w for w in HTML_RESIDUE if w in full]
    if hits:
        errors.append(f"HTML 残留 {hits}")
    print(f"  HTML 残留：{len(hits)}" + (f" → {hits}" if hits else " ✓"))

    # ── E 缺字方块 ───────────────────────────────────────────────────
    hits = [w for w in GLYPH_BROKEN if w in full]
    if hits:
        errors.append(f"缺字方块 {hits}")
    print(f"  缺字方块：{len(hits)}" + (f" → {hits}" if hits else " ✓"))

    # ── F 宣传禁用词 ─────────────────────────────────────────────────
    hits = [w for w in BANNED_HARD if w in full]
    for rx, label in BANNED_CONTEXT:
        if rx.search(full):
            hits.append(label)
    if hits:
        errors.append(f"宣传禁用词 {hits}")
    print(f"  宣传禁用词：{len(hits)}" + (f" → {hits}" if hits else " ✓"))

    # ── G 真题出处 ───────────────────────────────────────────────────
    hits = []
    for m in re.finditer("真题", full):
        ctx = full[max(0, m.start() - 4): m.start() + 4]
        if not any(ph in ctx for ph in EXAM_ALLOWED):
            hits.append(f"未加限定的「真题」@…{ctx}…")
    for rx, label in EXAM_PATTERNS:
        for m in rx.finditer(full):
            hits.append(f"{label}: {full[max(0,m.start()-14):m.end()+10]}")
    if hits:
        errors.append(f"真题出处 {hits[:5]}")
    print(f"  真题出处：{len(hits)}" + (f" → {hits[:5]}" if hits else " ✓"))

    if not is_book:
        return errors, warns, texts, {}

    # ── A 结构 ───────────────────────────────────────────────────────
    # 目录页 = 带链接注释的页；章节判定必须排除它，否则单元一会被判成从目录页开始
    links = link_destinations(reader)
    toc_pages = set(links.keys())
    chap = chapter_pages(texts, exclude_pages=toc_pages)
    need = ["单元一", "单元二", "单元三", "单元四", "单元五",
            "答案速查表", "逐题解析", "义项速查表"]
    missing = [c for c in need if c not in chap]
    if missing:
        errors.append(f"缺少章节：{missing}")
    print(f"  目录页 {sorted(toc_pages)}（已排除，不参与章节判定）")
    print(f"  章节起始页：{ {k: v for k, v in sorted(chap.items())} }")

    # ── H 题号 / 解析 / 速查 ─────────────────────────────────────────
    u1 = chap.get("单元一", [1])[0]
    ans = chap.get("答案速查表", [npages + 1])[0]
    ex_start = chap.get("逐题解析", [npages + 1])[0]
    quick = chap.get("义项速查表", [npages + 1])[0]

    # 题号必须逐行独立匹配：正则若跨行扫描，页眉那行的页码会把下一行的题号吞掉
    nums = set()
    for t in texts[u1 - 1: ans - 1]:
        for line in t.split("\n")[HEADER_LINES:]:
            m = re.match(r"\s*(\d{1,3})\s+\S", line)
            if m:
                v = int(m.group(1))
                if 1 <= v <= 100:
                    nums.add(v)
    missing_q = sorted(set(range(1, 101)) - nums)
    if missing_q:
        errors.append(f"题目页缺题号：{missing_q}")
    print(f"  题目页题号齐全：{len(nums)}/100"
          + (f" → 缺 {missing_q}" if missing_q else " ✓"))

    ex_text = "\n".join(texts[ex_start - 1: quick - 1]) if quick > ex_start else "\n".join(texts[ex_start - 1:])
    ex_nums = set()
    for m in re.finditer(r"第\s*(\d{1,3})\s*题", ex_text):
        v = int(m.group(1))
        if 1 <= v <= 100:
            ex_nums.add(v)
    if len(ex_nums) < 100:
        errors.append(f"逐题解析仅覆盖 {len(ex_nums)}/100")
    print(f"  逐题解析覆盖：{len(ex_nums)}/100" + (" ✓" if len(ex_nums) >= 100 else " ✗"))

    # 答案速查表：reportlab 表格逐格抽取，每格独占一行，题号是「整行只有数字」
    ans_nums = set()
    for t in texts[ans - 1: (ex_start - 1) if ex_start > ans else npages]:
        for line in t.split("\n")[HEADER_LINES:]:
            m = re.fullmatch(r"\s*(\d{1,3})\s*", line)
            if m:
                v = int(m.group(1))
                if 1 <= v <= 100:
                    ans_nums.add(v)
    if len(ans_nums) < 100:
        errors.append(f"答案速查表仅覆盖 {len(ans_nums)}/100")
    print(f"  答案速查覆盖：{len(ans_nums)}/100" + (" ✓" if len(ans_nums) >= 100 else " ✗"))

    # ── I 目录链接 ───────────────────────────────────────────────────
    total_links = sum(len(v) for v in links.values())
    dest_pages = sorted({d for v in links.values() for d in v})
    print(f"  可点击链接：{total_links} 个，源页 {sorted(toc_pages)}")
    print(f"  链接目标页：{dest_pages}")

    if not links:
        errors.append("PDF 内没有任何可点击链接（目录不可点）")
    else:
        bad_dest = [d for d in dest_pages if d < 1 or d > npages]
        if bad_dest:
            errors.append(f"链接目标越界：{bad_dest}")
        empty_dest = [d for d in dest_pages if len(texts[d - 1].strip()) < EMPTY_TEXT_CHARS]
        if empty_dest:
            errors.append(f"链接指向空白页：{empty_dest}")

        chapter_start = set()
        for name, pages in chap.items():
            chapter_start.add(pages[0])
        uncovered = sorted(chapter_start - set(dest_pages))
        if uncovered:
            errors.append(f"章节页未被目录链接覆盖：{uncovered}")
        print(f"  章节起始页 {sorted(chapter_start)}")
        print(f"  未被目录链接的章节页：{len(uncovered)}"
              + (f" → {uncovered}" if uncovered else " ✓"))

    return errors, warns, texts, chap


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default=os.path.join(ROOT, "output", "熟词僻义100题专项训练册.pdf"))
    ap.add_argument("--sample",
                    default=os.path.join(ROOT, "output", "熟词僻义100题专项训练册-免费体验3题.pdf"))
    args = ap.parse_args()

    all_err, all_warn = [], []
    for path, is_book in ((args.book, True), (args.sample, False)):
        if not os.path.exists(path):
            print(f"❌ 找不到文件：{path}")
            all_err.append(f"缺文件 {path}")
            continue
        e, w, _, _ = scan(path, is_book)
        all_err += [f"{os.path.basename(path)}: {x}" for x in e]
        all_warn += [f"{os.path.basename(path)}: {x}" for x in w]

    print(f"\n{'='*70}")
    if all_warn:
        print("⚠️  警告：")
        for x in all_warn:
            print("   -", x)
    if all_err:
        print(f"❌ 质量门禁未通过（{len(all_err)} 项）：")
        for x in all_err:
            print("   -", x)
        sys.exit(1)
    print("✅ PDF 质量门禁全部通过")


if __name__ == "__main__":
    main()
