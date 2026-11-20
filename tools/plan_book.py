#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
熟词僻义 100 题专项训练册 · 补题规划器

为什么需要补题（实测结论，不是估计）：
  - 首批 200 题里 module=E1_熟词僻义 的只有 60 道，覆盖 59 个词。
  - 100 词里剩下 41 个词一道 E1 题都没有 —— 这些词恰恰是「熟词僻义」的
    主战场（没考过 ≠ 不重要，而是这批题根本没覆盖到）。
  - 全库 420 个义项中，220 个义项尚未出题，其中 161 个是陷阱义（is_trap=true）。
    换句话说：补 100 题专项的素材是现成的，不需要临时造义项。

本脚本只做「规划」，不写题：
  1. 找出 41 个缺 E1 题的词，为每个词挑一个最优靶义（未出题的陷阱义）；
  2. 挑 1 道现有 E1 题替换（该词已有更硬的 S3 陷阱义，题册里用新题替换）；
  3. 按训练册的难度/载体配额，给每道补题分配 difficulty 与 carrier；
  4. 输出 data/book/e1/plan.json —— 每个 worker 批次一份完整上下文。

配额（训练册 100 题）：
  难度 easy 15 / mid 55 / hard 30          （与首批 200 题同一比例）
  载体 C1 58 / C2 18 / C3 10 / C4 8 / C5 3 / C6 3
  覆盖 100 词，每词恰好 1 题
  考义项层级优先 S3（熟词僻义主弹药），其次 S4（搭配义）、S2

不动 data/batch1/ 下的任何文件：首批 200 题的验收配额是精确锁定的
（tools/validate_batch1.py），新题独立成库、独立验收。
"""
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
OUT_DIR = os.path.join(ROOT, "data", "book", "e1")

# 训练册目标配额
BOOK_TARGET = {
    "difficulty": {"easy": 15, "mid": 55, "hard": 30},
    "carrier": {"C1": 58, "C2": 18, "C3": 10, "C4": 8, "C5": 3, "C6": 3},
    "words": 100,
    "questions": 100,
}

# 现有 E1 题（来自首批 200 题）的难度分布：easy16/mid27/hard17
# w_consequence 占 2 道（q_045 hard / q_046 mid），题册每词 1 题 → 保留 q_046(mid)
# 再换掉 1 道 easy（该词有更硬的 S3 陷阱义可用）→ 现有保留 58 题：easy15/mid27/hard16
# 新增 42 题：easy0 / mid28 / hard14 → 合计 easy15/mid55/hard30 ✓

# 新增 42 题的载体配额（现有 58 题全是 C1，新增题承担非阅读载体）
NEW_CARRIER_QUOTA = {"C1": 0, "C2": 18, "C3": 10, "C4": 8, "C5": 3, "C6": 3}
# 新增题难度配额：0 easy / 28 mid / 14 hard
NEW_DIFF_QUOTA = {"easy": 0, "mid": 28, "hard": 14}

# 载体 → 该载体偏好的 sense_level（阅读偏 S2/S3，语法填空偏 S4/搭配，写作偏 S2）
CARRIER_LEVEL_PREF = {
    "C1": ["S3", "S2", "S4"],
    "C2": ["S3", "S2", "S4"],
    "C3": ["S4", "S3", "S2"],
    "C4": ["S2", "S3", "S4"],
    "C5": ["S3", "S2", "S4"],
    "C6": ["S4", "S3", "S2"],
}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def pick_target_sense(word, qmap, carrier):
    """为词挑一个最优靶义：必须是未出题的陷阱义，按载体偏好排层级。"""
    pref = CARRIER_LEVEL_PREF.get(carrier, ["S3", "S2", "S4"])
    cands = [s for s in word["senses"]
             if s.get("is_trap") and s["sense_id"] not in qmap]
    if not cands:
        return None

    def rank(s):
        lv = pref.index(s["sense_level"]) if s["sense_level"] in pref else 9
        # E1/E10 优先：这两个错因就是「按熟悉义去理解」
        e1 = 0 if ("E1" in s.get("error_mech", []) or "E10" in s.get("error_mech", [])) else 1
        # 有陷阱说明的义项更适合出题
        trapinfo = 0 if s.get("trap_of") else 1
        return (lv, e1, trapinfo, s["sense_id"])

    cands.sort(key=rank)
    return cands[0]


def main():
    words = load(os.path.join(BATCH, "entries.json"))
    questions = load(os.path.join(BATCH, "questions.json"))
    qmap = {q["sense_id"]: q for q in questions}
    by_id = {w["id"]: w for w in words}

    e1_qs = [q for q in questions if q.get("module") == "E1_熟词僻义"]
    e1_words = defaultdict(list)
    for q in e1_qs:
        e1_words[q["word_id"]].append(q)

    # ── 1. 现有 E1 题：每词取 1 道（w_consequence 保留 mid 那道）──────────
    keep = []
    for wid, qs in e1_words.items():
        if wid == "w_consequence":
            chosen = [q for q in qs if q["id"] == "q_046"][0]
        else:
            chosen = sorted(qs, key=lambda q: q["id"])[0]
        keep.append(chosen)
    keep.sort(key=lambda q: q["id"])

    # ── 2. 换掉 1 道 easy：找一道 easy E1 题，其词还有未出题的 S3 陷阱义 ──
    replace_q = None
    for q in keep:
        if q["difficulty"] != "easy":
            continue
        w = by_id[q["word_id"]]
        s3 = [s for s in w["senses"]
              if s.get("is_trap") and s["sense_level"] == "S3" and s["sense_id"] not in qmap]
        if s3:
            replace_q = q
            break
    if replace_q is None:
        print("❌ 找不到可替换的 easy E1 题")
        sys.exit(1)

    keep_final = [q for q in keep if q["id"] != replace_q["id"]]
    keep_diff = Counter(q["difficulty"] for q in keep_final)
    print(f"现有 E1 题：{len(e1_qs)} → 保留 {len(keep_final)} "
          f"(换掉 {replace_q['id']} easy)")
    print(f"  保留后难度 {dict(keep_diff)}")
    assert keep_diff["easy"] == 15 and keep_diff["mid"] == 27 and keep_diff["hard"] == 16, keep_diff

    # ── 3. 需要补的词：41 个无 E1 题的词 + 1 个被替换题所属的词 ──────────
    need_words = []
    for w in words:
        if w["id"] not in e1_words:
            need_words.append(w)
    need_words.sort(key=lambda w: (w["level"] != "T1", w["headword"]))
    rw = by_id[replace_q["word_id"]]
    targets_words = need_words + [rw]
    print(f"补题目标词：{len(need_words)} 个无 E1 题的词 + {rw['headword']}（替换题）"
          f"= {len(targets_words)} 词")

    # ── 4. 分配难度与载体 ───────────────────────────────────────────────
    diff_list = ([("hard")] * NEW_DIFF_QUOTA["hard"]) + \
                ([("mid")] * NEW_DIFF_QUOTA["mid"]) + \
                ([("easy")] * NEW_DIFF_QUOTA["easy"])
    carr_list = ([("C2")] * NEW_CARRIER_QUOTA["C2"]) + \
                ([("C3")] * NEW_CARRIER_QUOTA["C3"]) + \
                ([("C4")] * NEW_CARRIER_QUOTA["C4"]) + \
                ([("C5")] * NEW_CARRIER_QUOTA["C5"]) + \
                ([("C6")] * NEW_CARRIER_QUOTA["C6"]) + \
                ([("C1")] * NEW_CARRIER_QUOTA["C1"])

    # 难度与载体交叉约束：hard 题优先给阅读/完形语境强的载体
    # C3/C6 偏搭配义（S4），C4 偏 S2，S5 偏 S3
    # 用「难度 - 载体适配度」贪心：先给高适配度载体分配 hard
    plan = []
    diff_pool = list(diff_list)
    carr_pool = list(carr_list)
    # 载体适配：hard 更适合 C1/C2/C5；mid 适合 C2/C4；easy 适合 C1/C3/C6
    fit = {
        "hard": {"C1": 3, "C2": 3, "C5": 3, "C4": 2, "C3": 2, "C6": 2},
        "mid": {"C2": 3, "C4": 3, "C1": 3, "C5": 2, "C3": 2, "C6": 2},
        "easy": {"C1": 3, "C3": 3, "C6": 3, "C2": 2, "C4": 2, "C5": 2},
    }
    # 词序：T1 优先、已替换词最后（它的靶义已被挑过）
    ordered = sorted(targets_words, key=lambda w: (w["level"] != "T1", w["headword"]))
    for w in ordered:
        # 先给这个词挑载体（看它有哪些义项层级可用），再定难度
        best = None
        for _ in range(len(carr_pool)):
            carr = carr_pool[0]
            s = pick_target_sense(w, qmap, carr)
            if s:
                # 在该载体适配度下挑难度：优先把 hard 留给适配度高的载体
                pick_diff = None
                for d in ("hard", "mid", "easy"):
                    if d in diff_pool and fit[d][carr] >= 2:
                        pick_diff = d
                        break
                if pick_diff is None:
                    pick_diff = diff_pool[0]
                best = (carr, pick_diff, s)
                break
            carr_pool.append(carr_pool.pop(0))
        if not best:
            print(f"❌ 词 {w['headword']} 找不到可用靶义")
            sys.exit(1)
        carr, diff, sense = best
        carr_pool.remove(carr)
        diff_pool.remove(diff)
        plan.append({"word": w, "sense": sense, "carrier": carr, "difficulty": diff})

    print(f"\n新增 42 题难度 {dict(Counter(p['difficulty'] for p in plan))}")
    print(f"新增 42 题载体 {dict(sorted(Counter(p['carrier'] for p in plan).items()))}")
    print(f"新增 42 题靶义层级 {dict(sorted(Counter(p['sense']['sense_level'] for p in plan).items()))}")

    # ── 5. 校验合并后的训练册配额 ───────────────────────────────────────
    all_diff = Counter([q["difficulty"] for q in keep_final] +
                       [p["difficulty"] for p in plan])
    all_carr = Counter([q["carrier"] for q in keep_final] +
                       [p["carrier"] for p in plan])
    print(f"\n训练册 100 题难度 {dict(all_diff)}")
    print(f"训练册 100 题载体 {dict(sorted(all_carr.items()))}")
    assert all_diff == Counter(BOOK_TARGET["difficulty"]), all_diff
    assert all_carr == Counter(BOOK_TARGET["carrier"]), all_carr
    covered = {q["word_id"] for q in keep_final} | {p["word"]["id"] for p in plan}
    assert len(covered) == 100, f"覆盖词数 {len(covered)}"
    print(f"覆盖词数 {len(covered)} ✓（每词 1 题）")

    # ── 6. 切成 worker 批次 ─────────────────────────────────────────────
    os.makedirs(OUT_DIR, exist_ok=True)
    nbatch = 5
    batches = [[] for _ in range(nbatch)]
    # 交错分配，保证每批难度分布接近
    for i, p in enumerate(sorted(plan, key=lambda x: (x["difficulty"], x["word"]["headword"]))):
        batches[i % nbatch].append(p)

    outputs = []
    for bi, batch in enumerate(batches):
        items = []
        for p in batch:
            w = p["word"]
            items.append({
                "word_id": w["id"],
                "headword": w["headword"],
                "ipa": w["ipa"],
                "level": w["level"],
                "pos": w["pos"],
                "target_sense": {
                    "sense_id": p["sense"]["sense_id"],
                    "text": p["sense"]["text"],
                    "sense_level": p["sense"]["sense_level"],
                    "error_mech": p["sense"].get("error_mech", []),
                    "is_trap": p["sense"].get("is_trap"),
                    "trap_of": p["sense"].get("trap_of", []),
                    "example": p["sense"].get("example"),
                    "collocations": p["sense"].get("collocations", []),
                },
                "all_senses": [
                    {"sense_id": s["sense_id"], "text": s["text"],
                     "sense_level": s["sense_level"], "is_trap": s.get("is_trap", False)}
                    for s in w["senses"]
                ],
                "confusable": w.get("confusable", []),
                "word_family": w.get("word_family", []),
                "notes": w.get("notes", ""),
                "assigned_carrier": p["carrier"],
                "assigned_difficulty": p["difficulty"],
                "replaces_question_id": (replace_q["id"]
                                         if w["id"] == replace_q["word_id"] else None),
            })
        path = os.path.join(OUT_DIR, f"plan_batch{bi+1}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=1)
        outputs.append(path)
        print(f"  {os.path.relpath(path, ROOT)}: {len(items)} 题 "
              f"难度{dict(Counter(i['assigned_difficulty'] for i in items))} "
              f"载体{dict(sorted(Counter(i['assigned_carrier'] for i in items).items()))}")

    # 汇总元信息
    meta = {
        "kept_questions": [q["id"] for q in keep_final],
        "replaced_question": replace_q["id"],
        "replaced_word": replace_q["word_id"],
        "new_count": len(plan),
        "book_targets": BOOK_TARGET,
        "batch_files": [os.path.relpath(p, ROOT) for p in outputs],
        "book_diff": dict(all_diff),
        "book_carrier": dict(sorted(all_carr.items())),
        "new_diff": dict(Counter(p["difficulty"] for p in plan)),
        "new_carrier": dict(sorted(Counter(p["carrier"] for p in plan).items())),
    }
    with open(os.path.join(OUT_DIR, "plan_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f"\n✅ 计划完成: {os.path.relpath(os.path.join(OUT_DIR, 'plan_meta.json'), ROOT)}")


if __name__ == "__main__":
    main()
