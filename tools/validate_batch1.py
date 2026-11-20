#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
首批 100 词 + 200 题 集中验收
检查项（对应 docs/首批100词精修规范.md §5 六条质量标准）：
  A. 结构完整   —— 必填字段齐全、类型正确
  B. id 唯一    —— 词条 id / sense_id / 题目 id 全局唯一
  C. 绑定闭合   —— 题目 sense_id 能在对应词条中找到；quiz_ids 双向一致
  D. 分布达标   —— 难度 15/55/30、题型载体、失因模块
  E. 版权合规   —— 例句全部标仿真、无真题字眼、释义未照搬教材
  F. 质量底线   —— 干扰项错因覆盖、explanation 三段式、notes 可执行性
输出: data/batch1/report.json + 终端报告
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")

REQUIRED_WORD_FIELDS = ["id", "headword", "ipa", "level", "pos", "strategies",
                         "carriers", "senses", "confusable", "word_family", "notes", "quiz_ids"]
REQUIRED_SENSE_FIELDS = ["sense_id", "text", "sense_level", "error_mech", "is_trap",
                         "trap_of", "example", "collocations"]
REQUIRED_Q_FIELDS = ["id", "sense_id", "word_id", "carrier", "module", "difficulty",
                     "expected_accuracy", "stem", "stem_cn", "options", "explanation",
                     "trap_note", "tags"]

S_LEVELS = {"S1", "S2", "S3", "S4"}
E_CODES = {"E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"}
C_CODES = {"C1", "C2", "C3", "C4", "C5", "C6", "C7"}
P_CODES = {"P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"}
T_LEVELS = {"T1", "T2", "T3", "T4"}

BANNED = ["真题", "全国卷", "浙江卷", "北京卷", "上海卷", "全国Ⅰ卷", "全国II卷", "2023高考", "押题"]
DIFF_ACC = {"easy": (0.65, 0.95), "mid": (0.35, 0.75), "hard": (0.15, 0.45)}

TARGET_DIFF = {"easy": 30, "mid": 110, "hard": 60}
TARGET_CARRIER = {"C1": 88, "C2": 48, "C3": 32, "C4": 16, "C5": 10, "C6": 6}
TARGET_MODULE = {"E1_熟词僻义": 60, "E2_一词多义混淆": 40, "E4_固定搭配缺失": 30,
                 "E3_形近音近混淆": 24, "E5_词性词形误判": 20, "E6_语境推断失败": 16,
                 "E7_逻辑连接词误用": 6, "E8_情感色彩误判": 4}

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
        return json.load(open(path, encoding="utf-8"))
    except Exception as e:
        err("解析", f"{os.path.basename(path)} JSON 解析失败: {e}")
        return default


def check_words(words):
    ids = Counter()
    sense_ids = Counter()
    for w in words:
        wid = w.get("id", "?")
        ids[wid] += 1
        for f in REQUIRED_WORD_FIELDS:
            if f not in w:
                err("A结构", f"词条 {wid} 缺字段 {f}")
        if w.get("level") not in T_LEVELS:
            err("A结构", f"词条 {wid} level 非法: {w.get('level')}")
        if not isinstance(w.get("senses"), list) or not w["senses"]:
            err("A结构", f"词条 {wid} senses 为空")
            continue
        if not (3 <= len(w["senses"]) <= 5):
            err("F质量", f"词条 {wid} 义项数 {len(w['senses'])} 不在 3–5")
        s1 = sum(1 for s in w["senses"] if s.get("sense_level") == "S1")
        s34 = sum(1 for s in w["senses"] if s.get("sense_level") in ("S3", "S4"))
        trap = sum(1 for s in w["senses"] if s.get("is_trap"))
        if s1 != 1:
            err("F质量", f"词条 {wid} S1 核心义 = {s1}，应为 1")
        if s34 < 1:
            err("F质量", f"词条 {wid} 无 S3/S4 熟词僻义")
        if trap < 1:
            err("F质量", f"词条 {wid} 无 is_trap 义项")
        for p in w.get("strategies", []):
            if p not in P_CODES:
                err("A结构", f"词条 {wid} 非法策略码 {p}")
        for c in w.get("carriers", []):
            if c not in C_CODES:
                err("A结构", f"词条 {wid} 非法载体码 {c}")
        notes = w.get("notes", "")
        if len(notes) < 60:
            err("F质量", f"词条 {wid} notes 过短({len(notes)})，应为考场动作")
        if "考场" not in notes and "判断" not in notes and "看" not in notes:
            warn("F质量", f"词条 {wid} notes 未体现考场动作特征")
        for s in w["senses"]:
            for f in REQUIRED_SENSE_FIELDS:
                if f not in s:
                    err("A结构", f"词条 {wid} 义项缺字段 {f}")
            sid = s.get("sense_id", "?")
            sense_ids[sid] += 1
            if s.get("sense_level") not in S_LEVELS:
                err("A结构", f"义项 {sid} sense_level 非法: {s.get('sense_level')}")
            for e in s.get("error_mech", []):
                if e not in E_CODES:
                    err("A结构", f"义项 {sid} 非法失因码 {e}")
            if s.get("is_trap") and not s.get("trap_of"):
                err("F质量", f"义项 {sid} is_trap=true 但 trap_of 为空")
            if len(s.get("text", "")) < 4:
                err("F质量", f"义项 {sid} 中文释义过短")
            ex = s.get("example", {})
            src = ex.get("source", "")
            if not src.startswith("仿真例句"):
                err("E版权", f"义项 {sid} 例句来源未标仿真: {src!r}")
            for b in BANNED:
                if b in src:
                    err("E版权", f"义项 {sid} 例句来源含真题字眼: {b}")
                if b in ex.get("en", "") or b in ex.get("zh", ""):
                    err("E版权", f"义项 {sid} 例句正文含真题字眼: {b}")
            if not ex.get("en") or not ex.get("zh"):
                err("A结构", f"义项 {sid} 例句缺失 en/zh")
            if len(ex.get("en", "").split()) < 8:
                warn("F质量", f"义项 {sid} 例句过短")
            if ex.get("carrier") not in C_CODES:
                err("A结构", f"义项 {sid} 例句载体非法 {ex.get('carrier')}")
            if len(s.get("collocations", [])) < 2:
                err("F质量", f"义项 {sid} 搭配少于 2 条")
    for k, v in ids.items():
        if v > 1:
            err("B唯一", f"词条 id 重复: {k} × {v}")
    for k, v in sense_ids.items():
        if v > 1:
            err("B唯一", f"sense_id 重复: {k} × {v}")
    return ids, sense_ids


def check_questions(questions, word_index):
    qids = Counter()
    for q in questions:
        qid = q.get("id", "?")
        qids[qid] += 1
        for f in REQUIRED_Q_FIELDS:
            if f not in q:
                err("A结构", f"题目 {qid} 缺字段 {f}")
        wid = q.get("word_id")
        sid = q.get("sense_id")
        if wid not in word_index:
            err("C绑定", f"题目 {qid} word_id {wid} 不存在于词条表")
            continue
        sense_ids = {s["sense_id"] for s in word_index[wid]["senses"]}
        if sid not in sense_ids:
            err("C绑定", f"题目 {qid} sense_id {sid} 不在词条 {wid} 的义项中")
        if q.get("carrier") not in C_CODES:
            err("A结构", f"题目 {qid} carrier 非法 {q.get('carrier')}")
        if q.get("module") not in TARGET_MODULE:
            err("A结构", f"题目 {qid} module 非法 {q.get('module')}")
        if q.get("difficulty") not in DIFF_ACC:
            err("A结构", f"题目 {qid} difficulty 非法 {q.get('difficulty')}")
        else:
            lo, hi = DIFF_ACC[q["difficulty"]]
            acc = q.get("expected_accuracy", [])
            if not (isinstance(acc, list) and len(acc) == 2):
                err("A结构", f"题目 {qid} expected_accuracy 格式错误")
            elif not (lo <= acc[0] and acc[1] <= hi):
                err("F质量", f"题目 {qid} expected_accuracy {acc} 与 difficulty={q['difficulty']} 不匹配")
        opts = q.get("options", [])
        if len(opts) != 4:
            err("F质量", f"题目 {qid} 选项数 {len(opts)} ≠ 4")
        correct = [o for o in opts if o.get("correct")]
        if len(correct) != 1:
            err("F质量", f"题目 {qid} 正确项数 {len(correct)} ≠ 1")
        keys = [o.get("key") for o in opts]
        if sorted(keys) != ["A", "B", "C", "D"]:
            err("F质量", f"题目 {qid} 选项 key 非 ABCD: {keys}")
        for o in opts:
            if o.get("correct"):
                if o.get("distractor_reason") not in (None, ""):
                    warn("F质量", f"题目 {qid} 正确项 {o.get('key')} 仍写了干扰理由")
                continue
            dr = o.get("distractor_reason")
            if not dr or len(str(dr)) < 12:
                err("F质量", f"题目 {qid} 选项 {o.get('key')} 缺有效 distractor_reason")
            if o.get("text") in ("", None):
                err("F质量", f"题目 {qid} 选项 {o.get('key')} 文本为空")
        exp = q.get("explanation", "")
        if "【考场动作】" not in exp:
            err("F质量", f"题目 {qid} explanation 缺【考场动作】段")
        if "【为什么选" not in exp:
            err("F质量", f"题目 {qid} explanation 缺【为什么选…】段")
        if "【其他选项】" not in exp:
            err("F质量", f"题目 {qid} explanation 缺【其他选项】段")
        if len(exp) < 120:
            warn("F质量", f"题目 {qid} explanation 偏短({len(exp)})")
        if not q.get("stem") or not q.get("stem_cn"):
            err("A结构", f"题目 {qid} 题干缺失")
        if len(q.get("stem", "").split()) < 6:
            warn("F质量", f"题目 {qid} 题干过短")
        for b in BANNED:
            if b in q.get("stem", "") or b in q.get("stem_cn", ""):
                err("E版权", f"题目 {qid} 题干含真题字眼: {b}")
        if not q.get("trap_note"):
            warn("F质量", f"题目 {qid} 缺 trap_note")
        for t in q.get("tags", []):
            if t not in E_CODES and t not in P_CODES:
                err("A结构", f"题目 {qid} 非法 tag {t}")
    for k, v in qids.items():
        if v > 1:
            err("B唯一", f"题目 id 重复: {k} × {v}")
    return qids


def main():
    words = load_json(os.path.join(BATCH, "entries.json"))
    questions = load_json(os.path.join(BATCH, "questions.json"))
    if words is None or questions is None:
        print("缺少 entries.json 或 questions.json")
        sys.exit(1)

    word_index = {w["id"]: w for w in words}
    print(f"词条 {len(words)} 条，题目 {len(questions)} 道\n")

    check_words(words)
    check_questions(questions, word_index)

    # C: quiz_ids 双向一致
    q_by_word = defaultdict(list)
    for q in questions:
        q_by_word[q.get("word_id")].append(q.get("id"))
    for w in words:
        declared = set(w.get("quiz_ids", []))
        actual = set(q_by_word.get(w["id"], []))
        if declared != actual:
            err("C绑定", f"词条 {w['id']} quiz_ids 与实际题目不一致 "
                          f"(声明 {sorted(declared)} vs 实际 {sorted(actual)})")
    covered = set(q_by_word.keys())
    uncovered = [w["id"] for w in words if w["id"] not in covered]
    if uncovered:
        err("D分布", f"{len(uncovered)} 个词条没有配套题目: {uncovered[:10]}")

    # D: 分布
    diff = Counter(q["difficulty"] for q in questions)
    carr = Counter(q["carrier"] for q in questions)
    mod = Counter(q["module"] for q in questions)
    for k, v in TARGET_DIFF.items():
        if diff.get(k, 0) != v:
            err("D分布", f"难度 {k} 实际 {diff.get(k,0)} ≠ 目标 {v}")
    for k, v in TARGET_CARRIER.items():
        if carr.get(k, 0) != v:
            err("D分布", f"载体 {k} 实际 {carr.get(k,0)} ≠ 目标 {v}")
    for k, v in TARGET_MODULE.items():
        if mod.get(k, 0) != v:
            err("D分布", f"失因模块 {k} 实际 {mod.get(k,0)} ≠ 目标 {v}")

    # E: 释义未照搬教材
    seed = {w["headword"]: w for w in load_json(os.path.join(ROOT, "data", "batch1_words.json"), {"words": []})["words"]}
    for w in words:
        s = seed.get(w["headword"])
        if not s:
            continue
        raw = (s["seed"].get("definition_raw") or "").replace(" ", "")
        for sn in w["senses"]:
            t = sn["text"].replace(" ", "")
            if len(t) >= 6 and t in raw:
                err("E版权", f"词条 {w['headword']} 义项释义照搬教材原文: {sn['text']}")

    # 报告
    report = {
        "word_count": len(words),
        "question_count": len(questions),
        "sense_count": sum(len(w["senses"]) for w in words),
        "trap_sense_count": sum(1 for w in words for s in w["senses"] if s.get("is_trap")),
        "s_level": dict(Counter(s["sense_level"] for w in words for s in w["senses"])),
        "e_mech": dict(Counter(e for w in words for s in w["senses"] for e in s.get("error_mech", []))),
        "carrier_entries": dict(Counter(c for w in words for c in w.get("carriers", []))),
        "difficulty": dict(diff),
        "carrier_questions": dict(carr),
        "module": dict(mod),
        "errors": errors,
        "warnings": warnings,
        "error_count": len(errors),
        "warning_count": len(warnings),
    }
    json.dump(report, open(os.path.join(BATCH, "report.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print("=" * 64)
    print(f"义项总数 {report['sense_count']}（其中陷阱义 {report['trap_sense_count']}）")
    print("S 层级分布:", report["s_level"])
    print("失因分布(词条):", report["e_mech"])
    print("难度分布(题目):", dict(diff))
    print("载体分布(题目):", dict(carr))
    print("失因模块(题目):", dict(mod))
    print("=" * 64)
    if errors:
        print(f"\n❌ 错误 {len(errors)} 条：")
        for e in errors[:60]:
            print("  " + e)
        if len(errors) > 60:
            print(f"  ... 另有 {len(errors)-60} 条")
    if warnings:
        print(f"\n⚠️  警告 {len(warnings)} 条（前 20）：")
        for w in warnings[:20]:
            print("  " + w)
        if len(warnings) > 20:
            print(f"  ... 另有 {len(warnings)-20} 条")
    if not errors:
        print("\n✅ 全部验收项通过")
    print(f"\n报告: data/batch1/report.json")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
