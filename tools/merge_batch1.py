#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""合并 5 个批次的词条/题目文件为 entries.json / questions.json，并回填 quiz_ids。"""
import json
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")


def merge(kind):
    """合并一个目录下所有 batch*.json（支持 2a / 2b 这类拆批）"""
    out = []
    missing = []
    d = os.path.join(BATCH, kind)
    if not os.path.isdir(d):
        return out, [kind]
    files = sorted(f for f in os.listdir(d)
                   if f.startswith("batch") and f.endswith(".json"))
    for fn in files:
        p = os.path.join(d, fn)
        data = json.load(open(p, encoding="utf-8"))
        out += data
        print(f"  {fn}: {len(data)} 条")
    if not files:
        missing.append(kind)
    return out, missing


def main():
    print("合并词条:")
    words, mw = merge("entries")
    print("合并题目:")
    questions, mq = merge("questions")

    # 回填 quiz_ids
    q_by_word = {}
    for q in questions:
        q_by_word.setdefault(q.get("word_id"), []).append(q.get("id"))
    for w in words:
        w["quiz_ids"] = sorted(q_by_word.get(w["id"], []))

    # sense_id → word_id 反查，补全题目缺失的 word_id
    s2w = {}
    for w in words:
        for s in w["senses"]:
            s2w[s["sense_id"]] = w["id"]
    for q in questions:
        if not q.get("word_id") and q.get("sense_id") in s2w:
            q["word_id"] = s2w[q["sense_id"]]

    json.dump(words, open(os.path.join(BATCH, "entries.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump(questions, open(os.path.join(BATCH, "questions.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"\n词条 {len(words)} 条 → data/batch1/entries.json")
    print(f"题目 {len(questions)} 道 → data/batch1/questions.json")
    if words:
        print("义项总数:", sum(len(w["senses"]) for w in words))
        print("S 层级:", dict(Counter(s["sense_level"] for w in words for s in w["senses"])))
    if questions:
        print("难度:", dict(Counter(q["difficulty"] for q in questions)))
        print("载体:", dict(Counter(q["carrier"] for q in questions)))
        print("模块:", dict(Counter(q["module"] for q in questions)))
    if mw or mq:
        sys.exit(1)


if __name__ == "__main__":
    main()
