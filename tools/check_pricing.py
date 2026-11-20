#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定价一致性门禁

定价模型（唯一真值在 data/product/shici_book.json 的 meta.pricing）：
  · 资料端按覆盖量分档：10 题 ¥1.9 / 50 题 ¥3.9 / 100 题 ¥4.9
  · App 端一档：全包 ¥9.9（一次买断，含完整训练册 + App 全部功能）
  · 纸质打印不单独设档
  · 全站最高价 ¥9.9

价格散在 5 个界面（训练册数据 / 主册 PDF / 样张 PDF / 商品详情页 / App 原型 / 方案文档），
改一处忘另一处是最容易犯的错。本脚本把「允许出现的金额」和「绝不允许出现的旧金额」
都写成硬规则，任一界面出现越界金额或旧金额即非零退出。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BOOK = os.path.join(ROOT, "data", "product", "shici_book.json")
BOOK_PDF = os.path.join(ROOT, "output", "熟词僻义100题专项训练册.pdf")
SAMPLE_PDF = os.path.join(ROOT, "output", "熟词僻义100题专项训练册-免费体验3题.pdf")
PAGE_HTML = os.path.join(ROOT, "docs", "熟词僻义100题专项训练册-详情页.html")
PROTO = os.path.join(ROOT, "prototype", "index.html")
PLAN_MD = os.path.join(ROOT, "docs", "熟词僻义专项商品化方案.md")

# 采用白名单而非黑名单：任何 ¥金额只要不在允许集合里，一律判失败。
# 这样新增价格点时必须显式登记，漏改某个界面一定会被拦下。
ALLOWED_AMOUNTS = {1.9, 3.9, 4.9, 9.9, 0}


def pdf_text(path):
    from pypdf import PdfReader
    r = PdfReader(path)
    return "\n".join((p.extract_text() or "") for p in r.pages)


def file_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def amounts_in(text):
    """抽出所有 ¥金额，以及被 JS/CSS 里的 '¥'+expr 形式漏掉的裸数字价格"""
    out = set()
    for m in re.finditer(r"¥\s*([0-9]+(?:\.[0-9]+)?)", text):
        out.add(float(m.group(1)))
    return out


def bare_prices(text, patterns):
    """按指定正则抓裸价格（原型里价格常写成 p:4.9 / b>¥4.9< 等形式）"""
    out = set()
    for pat in patterns:
        for m in re.finditer(pat, text):
            for g in m.groups():
                if g and re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", g):
                    out.add(float(g))
    return out


def main():
    if not os.path.exists(BOOK):
        raise SystemExit(f"缺少 {BOOK}")
    book = json.load(open(BOOK, encoding="utf-8"))
    pricing = book["meta"]["pricing"]

    errors = []

    # ── 1. 数据模型本身 ────────────────────────────────────────────
    tiers = pricing.get("tiers", [])
    got = [(t["questions"], t["price"]) for t in tiers]
    want = [(10, 1.9), (50, 3.9), (100, 4.9)]
    if got != want:
        errors.append(f"meta.pricing.tiers = {got}，应为 {want}")
    if pricing.get("bundle", {}).get("price") != 9.9:
        errors.append(f"meta.pricing.bundle.price = {pricing.get('bundle',{}).get('price')}，应为 9.9")
    if pricing.get("paper_tier") is not False:
        errors.append("meta.pricing.paper_tier 应为 False（纸质档位已取消）")
    if pricing.get("max_price") != 9.9:
        errors.append("meta.pricing.max_price 应为 9.9")

    # ── 2. 各界面金额合规 ─────────────────────────────────────────
    surfaces = []
    for path, label in ((BOOK_PDF, "主册 PDF"), (SAMPLE_PDF, "样张 PDF")):
        if os.path.exists(path):
            surfaces.append((label, pdf_text(path)))
    for path, label in ((PAGE_HTML, "商品详情页"), (PROTO, "App 原型"), (PLAN_MD, "方案文档")):
        if os.path.exists(path):
            surfaces.append((label, file_text(path)))

    for label, text in surfaces:
        found = amounts_in(text)
        bad = sorted(a for a in found if a not in ALLOWED_AMOUNTS)
        if bad:
            errors.append(f"{label} 出现越界金额 {bad}（允许：{sorted(ALLOWED_AMOUNTS)}）")

    # ── 3. 原型裸价格（p: / b>¥ 等写法）──────────────────────────
    if os.path.exists(PROTO):
        proto = file_text(PROTO)
        bare = bare_prices(proto, [
            r"\bp:\s*([0-9]+(?:\.[0-9]+)?)",
            r"¥\s*([0-9]+(?:\.[0-9]+)?)",
            r"微信支付 ¥([0-9]+(?:\.[0-9]+)?)",
        ])
        bad = sorted(a for a in bare if a not in ALLOWED_AMOUNTS)
        if bad:
            errors.append(f"App 原型 出现越界价格 {bad}")

    # ── 4. 必须出现的关键价格点 ───────────────────────────────────
    must = {
        "商品详情页": (PAGE_HTML, ["1.9", "3.9", "4.9", "9.9"]),
        "App 原型": (PROTO, ["9.9", "1.9", "3.9", "4.9"]),
    }
    for label, (path, keys) in must.items():
        if not os.path.exists(path):
            continue
        text = file_text(path)
        miss = [k for k in keys if k not in text]
        if miss:
            errors.append(f"{label} 缺少价格点 {miss}")

    # ── 5. 纸质档位不得复活 ───────────────────────────────────────
    for label, text in surfaces:
        if "纸质打印版" in text or "纸质版 1 册" in text or "电子 + 纸质打印版" in text:
            errors.append(f"{label} 仍出现纸质档位表述")

    # ── 6. 旧的订阅制表述不得复活 ─────────────────────────────────
    for label, text in surfaces:
        for phrase in ("开通年卡", "月卡 ¥", "会员 ¥", "年卡省", "省 ¥132"):
            if phrase in text:
                errors.append(f"{label} 仍出现旧订阅制表述「{phrase}」")

    # ── 输出 ──────────────────────────────────────────────────────
    print("定价模型（数据真值）：")
    for t in tiers:
        print(f"  {t['questions']:>3} 题档（{t['coverage']:>4}）  ¥{t['price']}")
    print(f"  全包（一次买断）      ¥{pricing['bundle']['price']}")
    print(f"  纸质档位              {'已取消' if not pricing['paper_tier'] else '仍存在'}")
    print(f"  全站最高价            ¥{pricing['max_price']}")
    print(f"\n已扫描界面 {len(surfaces)} 个：{'、'.join(l for l, _ in surfaces)}")

    if errors:
        print(f"\n❌ 定价一致性未通过（{len(errors)} 项）：")
        for e in errors:
            print("   -", e)
        sys.exit(1)
    print("\n✅ 定价一致性门禁通过")


if __name__ == "__main__":
    main()
