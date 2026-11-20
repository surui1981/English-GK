#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《熟词僻义 100 题专项训练册》验收器

两层验收：
  E1 层：data/book/e1/questions*.json —— 新补的 65 道 E1 题
          （42 道补缺 + 23 道替换；独立成库，不污染首批 200 题）
  BOOK 层：data/product/shici_book.json —— 装配好的 100 题训练册

检查项对应 docs/首批100词精修规范.md §5 六条质量标准：
  A 结构完整 / B id 唯一 / C 绑定闭合 / D 分布达标 / E 版权合规 / F 质量底线
外加一条训练册专属硬约束：
  E陷阱义 —— 册内每道题的目标义项必须 is_trap=true。
            目标义项若是 S1 主义项，学生按自己最熟的那个义就能做对，
            那不是熟词僻义题，与本册核心承诺冲突 —— 必须判不合格。

用法：
  python3 tools/validate_book.py          # 两层都验
  python3 tools/validate_book.py --e1     # 只验新题库
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
E1_DIR = os.path.join(ROOT, "data", "book", "e1")
BOOK_JSON = os.path.join(ROOT, "data", "product", "shici_book.json")

REQUIRED_Q_FIELDS = ["id", "sense_id", "word_id", "carrier", "module", "difficulty",
                     "expected_accuracy", "stem", "stem_cn", "options", "explanation",
                     "trap_note", "tags"]

BANNED = ["真题", "全国卷", "浙江卷", "北京卷", "上海卷", "全国Ⅰ卷", "全国II卷",
          "2023高考", "押题", "押中", "保过", "必胜"]

DIFF_ACC = {"easy": (0.65, 0.95), "mid": (0.35, 0.75), "hard": (0.15, 0.45)}
C_CODES = {"C1", "C2", "C3", "C4", "C5", "C6", "C7"}
E_CODES = {"E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"}
P_CODES = {"P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"}

BOOK_TARGET_DIFF = {"easy": 15, "mid": 55, "hard": 30}
BOOK_TARGET_CARR = {"C1": 58, "C2": 18, "C3": 10, "C4": 8, "C5": 3, "C6": 3}
BOOK_QUESTIONS = 100
BOOK_WORDS = 100

errors = []
warnings = []


def err(cat, msg):
    errors.append(f"[{cat}] {msg}")


def warn(cat, msg):
    warnings.append(f"[{cat}] {msg}")


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        err("解析", f"{os.path.basename(path)} JSON 解析失败: {e}")
        return default


def check_question(q, word_index, expect=None, tag="题目"):
    qid = q.get("id", "?")
    for f in REQUIRED_Q_FIELDS:
        if f not in q:
            err("A结构", f"{tag} {qid} 缺字段 {f}")
    wid = q.get("word_id")
    sid = q.get("sense_id")
    if wid not in word_index:
        err("C绑定", f"{tag} {qid} word_id {wid} 不存在于词条表")
        return
    sense_ids = {s["sense_id"] for s in word_index[wid]["senses"]}
    if sid not in sense_ids:
        err("C绑定", f"{tag} {qid} sense_id {sid} 不在词条 {wid} 的义项中")
    else:
        # 硬约束：目标义项必须是「陷阱义」——学生按最熟的那个义会做错，
        # 这正是本册与「普通词义辨析题」的分界线。
        sense_obj = next(s for s in word_index[wid]["senses"] if s["sense_id"] == sid)
        if not sense_obj.get("is_trap"):
            err("E陷阱义", f"{tag} {qid} 目标义项 {sid}（{sense_obj['text'][:18]}）"
                           f" is_trap=false，不是熟词僻义陷阱义")
    if q.get("carrier") not in C_CODES:
        err("A结构", f"{tag} {qid} carrier 非法 {q.get('carrier')}")
    if q.get("module") != "E1_熟词僻义":
        err("A结构", f"{tag} {qid} module 必须是 E1_熟词僻义，实际 {q.get('module')}")
    diff = q.get("difficulty")
    if diff not in DIFF_ACC:
        err("A结构", f"{tag} {qid} difficulty 非法 {diff}")
    else:
        lo, hi = DIFF_ACC[diff]
        acc = q.get("expected_accuracy", [])
        if not (isinstance(acc, list) and len(acc) == 2):
            err("A结构", f"{tag} {qid} expected_accuracy 格式错误")
        elif not (lo <= acc[0] and acc[1] <= hi):
            err("F质量", f"{tag} {qid} expected_accuracy {acc} 与 difficulty={diff} 不匹配")
    opts = q.get("options", [])
    if len(opts) != 4:
        err("F质量", f"{tag} {qid} 选项数 {len(opts)} ≠ 4")
    correct = [o for o in opts if o.get("correct")]
    if len(correct) != 1:
        err("F质量", f"{tag} {qid} 正确项数 {len(correct)} ≠ 1")
    if sorted(o.get("key") for o in opts) != ["A", "B", "C", "D"]:
        err("F质量", f"{tag} {qid} 选项 key 非 ABCD")
    for o in opts:
        if o.get("correct"):
            if o.get("distractor_reason") not in (None, ""):
                warn("F质量", f"{tag} {qid} 正确项 {o.get('key')} 仍写了干扰理由")
            continue
        dr = o.get("distractor_reason")
        if not dr or len(str(dr)) < 12:
            err("F质量", f"{tag} {qid} 选项 {o.get('key')} 缺有效 distractor_reason")
        if not o.get("text"):
            err("F质量", f"{tag} {qid} 选项 {o.get('key')} 文本为空")
    exp = q.get("explanation", "")
    if "【考场动作】" not in exp:
        err("F质量", f"{tag} {qid} explanation 缺【考场动作】段")
    if "【为什么选" not in exp:
        err("F质量", f"{tag} {qid} explanation 缺【为什么选…】段")
    if "【其他选项】" not in exp:
        err("F质量", f"{tag} {qid} explanation 缺【其他选项】段")
    if len(exp) < 120:
        warn("F质量", f"{tag} {qid} explanation 偏短({len(exp)})")
    if not q.get("stem") or not q.get("stem_cn"):
        err("A结构", f"{tag} {qid} 题干缺失")
    if len(q.get("stem", "").split()) < 6:
        warn("F质量", f"{tag} {qid} 题干过短")
    if "______" not in q.get("stem", ""):
        warn("F质量", f"{tag} {qid} 题干没有 ______ 空")
    if not q.get("trap_note"):
        warn("F质量", f"{tag} {qid} 缺 trap_note")
    for t in q.get("tags", []):
        if t not in E_CODES and t not in P_CODES:
            err("A结构", f"{tag} {qid} 非法 tag {t}")
    blob = " ".join([q.get("stem", ""), q.get("stem_cn", ""), exp,
                     q.get("trap_note", "")] +
                    [str(o.get("text", "")) for o in opts] +
                    [str(o.get("distractor_reason") or "") for o in opts])
    for b in BANNED:
        if b in blob:
            err("E版权", f"{tag} {qid} 含禁用词: {b}")
    if expect:
        for k, v in expect.items():
            if q.get(k) != v:
                err("C绑定", f"{tag} {qid} {k} 期望 {v}，实际 {q.get(k)}")


def validate_e1(words):
    """新补的 E1 题库。"""
    print("\n" + "=" * 64)
    print("E1 层：熟词僻义补题库")
    print("=" * 64)
    files = (sorted(glob.glob(os.path.join(E1_DIR, "questions_batch*.json"))) +
             sorted(glob.glob(os.path.join(E1_DIR, "questions_repl_batch*.json"))))
    if not files:
        print("❌ 没有找到 data/book/e1/questions_batch*.json")
        err("A结构", "新题库文件缺失")
        return
    questions = []
    for p in files:
        arr = load_json(p, [])
        if not isinstance(arr, list):
            err("解析", f"{os.path.basename(p)} 顶层不是数组")
            continue
        for q in arr:
            q["_src"] = os.path.basename(p)
            questions.append(q)
    print(f"批次文件 {len(files)} 个，题目 {len(questions)} 道")

    word_index = {w["id"]: w for w in words}

    # 与 plan 对齐
    plan = {}
    for p in (sorted(glob.glob(os.path.join(E1_DIR, "plan_batch*.json"))) +
              sorted(glob.glob(os.path.join(E1_DIR, "plan_repl_batch*.json")))):
        for item in load_json(p, []):
            plan[item["word_id"]] = item

    qids = Counter(q.get("id") for q in questions)
    for k, v in qids.items():
        if v > 1:
            err("B唯一", f"题目 id 重复: {k} × {v}")
    for q in questions:
        wid = q.get("word_id")
        p = plan.get(wid)
        expect = None
        if p:
            expect = {"sense_id": p["target_sense"]["sense_id"],
                      "carrier": p["assigned_carrier"],
                      "difficulty": p["assigned_difficulty"]}
        elif wid:
            err("C绑定", f"题目 {q.get('id')} 的 word_id {wid} 不在补题计划内")
        check_question(q, word_index, expect, tag="E1题")

    # 计划覆盖：每个目标词都要有且只有 1 道新题
    got = Counter(q.get("word_id") for q in questions)
    for wid in plan:
        if got.get(wid, 0) != 1:
            err("D分布", f"目标词 {wid} 应有 1 道新题，实际 {got.get(wid,0)}")
    print(f"  计划目标词 {len(plan)}，新题覆盖词 {len(got)}")
    print(f"  难度 {dict(Counter(q['difficulty'] for q in questions))}")
    print(f"  载体 {dict(sorted(Counter(q['carrier'] for q in questions).items()))}")
    print(f"  考义项层级 {dict(sorted(Counter(_sense_lvl(words, q) for q in questions).items()))}")
    return questions


def _sense_lvl(words, q):
    w = next((x for x in words if x["id"] == q["word_id"]), None)
    if not w:
        return "?"
    s = next((x for x in w["senses"] if x["sense_id"] == q["sense_id"]), None)
    return s["sense_level"] if s else "?"


def _is_trap(words, q):
    w = next((x for x in words if x["id"] == q["word_id"]), None)
    if not w:
        return False
    s = next((x for x in w["senses"] if x["sense_id"] == q["sense_id"]), None)
    return bool(s and s.get("is_trap"))


def validate_book(words):
    """装配好的 100 题训练册。"""
    print("\n" + "=" * 64)
    print("BOOK 层：100 题训练册")
    print("=" * 64)
    book = load_json(BOOK_JSON)
    if not book:
        print("❌ 缺少 data/product/shici_book.json")
        err("A结构", "训练册数据缺失")
        return
    qs = book.get("questions", [])
    print(f"题目 {len(qs)} 道，单元 {len(book.get('units', []))} 个")
    if len(qs) != BOOK_QUESTIONS:
        err("D分布", f"训练册题数 {len(qs)} ≠ {BOOK_QUESTIONS}")
    word_index = {w["id"]: w for w in words}
    for q in qs:
        check_question(q, word_index, tag="册题")
    # 每词 1 题
    byword = Counter(q["word_id"] for q in qs)
    dup = [w for w, c in byword.items() if c > 1]
    if dup:
        err("D分布", f"以下词出现多题: {dup}")
    if len(byword) != BOOK_WORDS:
        err("D分布", f"覆盖词数 {len(byword)} ≠ {BOOK_WORDS}")
    # 分布
    diff = Counter(q["difficulty"] for q in qs)
    carr = Counter(q["carrier"] for q in qs)
    for k, v in BOOK_TARGET_DIFF.items():
        if diff.get(k, 0) != v:
            err("D分布", f"训练册难度 {k} 实际 {diff.get(k,0)} ≠ 目标 {v}")
    for k, v in BOOK_TARGET_CARR.items():
        if carr.get(k, 0) != v:
            err("D分布", f"训练册载体 {k} 实际 {carr.get(k,0)} ≠ 目标 {v}")
    # 题号连续
    nums = [q.get("book_no") for q in qs]
    if nums != list(range(1, len(qs) + 1)):
        err("D分布", "训练册题号不连续")
    print(f"  难度 {dict(diff)}")
    print(f"  载体 {dict(sorted(carr.items()))}")
    print(f"  覆盖词 {len(byword)} 个，每词 1 题")
    print(f"  考义项层级 {dict(sorted(Counter(_sense_lvl(words, q) for q in qs).items()))}")
    traps = sum(1 for q in qs if _is_trap(words, q))
    print(f"  目标义项为陷阱义 {traps}/{len(qs)}")
    if traps != len(qs):
        err("E陷阱义", f"训练册有 {len(qs) - traps} 题的目标义项不是陷阱义")
    # 单元
    for u in book.get("units", []):
        n = len(u.get("questions", []))
        if n == 0:
            err("A结构", f"单元 {u.get('title')} 没有题目")
    return qs


def main():
    words = load_json(os.path.join(BATCH, "entries.json"))
    if words is None:
        print("缺少 data/batch1/entries.json")
        sys.exit(1)
    only = None
    if len(sys.argv) > 1 and sys.argv[1] in ("--e1", "--book"):
        only = sys.argv[1]

    if only in (None, "--e1"):
        validate_e1(words)
    if only in (None, "--book"):
        validate_book(words)

    print("\n" + "=" * 64)
    if errors:
        print(f"❌ 错误 {len(errors)} 条：")
        for e in errors[:60]:
            print("  " + e)
        if len(errors) > 60:
            print(f"  ... 另有 {len(errors)-60} 条")
    if warnings:
        print(f"\n⚠️  警告 {len(warnings)} 条（前 15）：")
        for w in warnings[:15]:
            print("  " + w)
        if len(warnings) > 15:
            print(f"  ... 另有 {len(warnings)-15} 条")
    if not errors:
        print("\n✅ 全部验收项通过")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
