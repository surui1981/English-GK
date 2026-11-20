#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 batch1_words.json 切成 5 个生产批次文件，供并行词条精修使用。"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH_DIR = os.path.join(ROOT, "data", "batch1")
os.makedirs(BATCH_DIR, exist_ok=True)

words = json.load(open(os.path.join(ROOT, "data", "batch1_words.json"), encoding="utf-8"))["words"]
BATCH_SIZE = 20

for bi in range(5):
    chunk = words[bi * BATCH_SIZE:(bi + 1) * BATCH_SIZE]
    assert len(chunk) == BATCH_SIZE, (bi, len(chunk))
    payload = {
        "_meta": {
            "batch": bi + 1,
            "batches_total": 5,
            "word_count": len(chunk),
            "spec": "docs/首批100词精修规范.md",
            "gold_standard": "docs/首批100词精修规范.md §6",
            "instruction": "对本批 20 个词条逐条按六维体系精修，输出 JSON 数组",
        },
        "words": chunk,
    }
    p = os.path.join(BATCH_DIR, f"batch{bi+1}_input.json")
    json.dump(payload, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{p}  ({len(chunk)} 词)  ->  {[w['headword'] for w in chunk]}")
