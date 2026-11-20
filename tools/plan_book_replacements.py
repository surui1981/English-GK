#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
熟词僻义 100 题专项训练册 · 替换题规划器（第二轮）

为什么需要替换（实测结论）：
  装配完成的 100 题里，有 23 题的目标义项 is_trap=false —— 也就是学生在句子里
  按自己最熟的那个义就能做对。这种题不是「熟词僻义」，而是普通词义辨析题，
  与本册的核心承诺（每个词只考它最容易错的那一个意思）直接冲突。
  其中 21 题的目标义项还是 S1 主义项（charge→收费、account→账户、issue→议题）。

本脚本：
  1. 找出目标义项非陷阱义的题（23 道）；
  2. 为同一个词挑一个陷阱义作为新靶义（该义项不能已有任何在册题目占用）；
  3. 严格继承被替换题的 difficulty 与 carrier —— 训练册的 15/55/30 与
     C1-C6 配额因此完全不变；
  4. 输出 data/book/e1/plan_repl_batch*.json —— 每个 worker 批次一份完整上下文。

不动 data/batch1/ 下任何文件：首批 200 题的验收配额是精确锁定的。
"""
import json
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
E1_DIR = os.path.join(ROOT, "data", "book", "e1")
BOOK = os.path.join(ROOT, "data", "product", "shici_book.json")

# 载体 → 偏好的义项层级（阅读偏 S2/S3，语法填空与七选五偏 S4 搭配义）
CARRIER_LEVEL_PREF = {
    "C1": ["S3", "S2", "S4"],
    "C2": ["S3", "S2", "S4"],
    "C3": ["S4", "S3", "S2"],
    "C4": ["S2", "S3", "S4"],
    "C5": ["S3", "S2", "S4"],
    "C6": ["S4", "S3", "S2"],
}

# 人工选定的替换靶义（headword → sense_id）
# 这一步是教研判断，不是排序玄学：每个词都挑「该词在高考语境里最容易被按熟义
# 理解、且有固定搭配可考」的那个陷阱义。收录标准三条：
#   ① 学生真的会按 S1 义选它；② 该义项有 2–4 条可考的固定搭配；
#   ③ 能在 C1 阅读语境里自然造出只有它讲得通的句子。
TARGET_OVERRIDE = {
    "account": "s_account_v_explain",        # account for = 解释、说明原因
    "address": "s_address_v_handle",         # address a problem = 处理、解决（本词最经典的熟词僻义）
    "appeal": "s_appeal_n_attraction",       # appeal = 吸引力、感染力
    "capacity": "s_capacity_n_ability",      # capacity = 能力、才能
    "charge": "s_charge_v_accuse",            # be charged with = 控告、以某罪名指控
    "conduct": "s_conduct_v_perform",         # conduct an investigation = 进行、实施
    "consequence": "s_consequence_n_importance",  # of little consequence = 重要性、紧要性
    "content": "s_content_adj_satisfied",     # be content with = 满足的、知足的
    "critical": "s_critical_adj_essential",   # be critical to = 至关重要的
    "emphasis": "s_emphasis_n_stress",        # 重音、重读
    "flat": "s_flat_adj_plain",               # 平淡乏味的、没劲的
    "issue": "s_issue_v_publish",             # issue a report = 发行、出版
    "major": "s_major_n_field",               # 主修专业、主修科目
    "measure": "s_measure_n_criterion",       # a measure of success = 衡量…的尺度
    "nerve": "s_nerve_n_courage",             # have the nerve to = 勇气、胆量
    "observe": "s_observe_v_celebrate",       # 庆祝、纪念（节日与周年）
    "plant": "s_plant_n_factory",             # 工厂（power plant）
    "position": "s_position_n_job",           # 职位、职务
    "principle": "s_principle_n_scientific",   # 原理、法则（科学原理）
    "prove": "s_prove_v_manifest",            # 展现、显出（某种品质或实力）
    "represent": "s_represent_v_amount_to",   # 在数量或价值上等同于
    "setting": "s_setting_n_device",          # 设备上的设定、档位
    "swing": "s_swing_v_turn",                # 转向、转变（形势与舆论）
}


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    words = load(os.path.join(BATCH, "entries.json"))
    questions = load(os.path.join(BATCH, "questions.json"))
    # 候选来源是「首轮保留清单」（plan_meta.json），不是装配后的训练册——
    # 否则训练册修好之后再跑本脚本就找不到受害者了，脚本不幂等。
    plan_meta = load(os.path.join(E1_DIR, "plan_meta.json"))
    by_id = {w["id"]: w for w in words}
    sense_index = {(w["id"], s["sense_id"]): s for w in words for s in w["senses"]}

    first_pass = [q for q in questions if q["id"] in set(plan_meta["kept_questions"])]
    first_pass.sort(key=lambda q: q["id"])

    # 册内已占用的义项（按词）—— 新靶义不能落在这些义项上
    # 只避让「册内题目」，不避让首批 200 题里的非 E1 题：那些题不在册内，
    # 同一个义项被 App 题库与训练册各考一次是合理的（一边广度一边深度）。
    used_by_word = {}
    for q in first_pass:
        used_by_word.setdefault(q["word_id"], set()).add(q["sense_id"])
    # 册内新补的 42 道题在 data/book/e1/questions_batch*.json 里，
    # 不在 data/batch1/questions.json 里（那是首批 200 题，不动）。
    new_qs = []
    for fn in sorted(os.listdir(E1_DIR)):
        if fn.startswith("questions_batch"):
            new_qs.extend(load(os.path.join(E1_DIR, fn)))
    for q in new_qs:
        used_by_word.setdefault(q["word_id"], set()).add(q["sense_id"])

    # ── 1. 找出目标义项非陷阱义的题 ────────────────────────────────────
    victims = []
    for q in first_pass:
        s = sense_index[(q["word_id"], q["sense_id"])]
        if not s.get("is_trap"):
            victims.append(q)
    print(f"目标义项非陷阱义的题：{len(victims)} 道")
    for q in victims:
        s = sense_index[(q["word_id"], q["sense_id"])]
        print(f"  {q['id']:<8} {by_id[q['word_id']]['headword']:<12} "
              f"{s['sense_level']} {s['text'][:26]}")

    # ── 2. 为每个词挑新的陷阱义靶子 ────────────────────────────────────
    plan = []
    for q in sorted(victims, key=lambda x: x["word_id"]):
        w = by_id[q["word_id"]]
        pref = CARRIER_LEVEL_PREF.get(q["carrier"], ["S3", "S2", "S4"])
        cands = [s for s in w["senses"]
                 if s.get("is_trap") and s["sense_id"] not in used_by_word[q["word_id"]]]
        if not cands:
            print(f"❌ 词 {w['headword']} 没有未被占用的陷阱义")
            sys.exit(1)

        def rank(s):
            # 替换题的选义标准不是载体偏好，而是「这是不是最好的熟词僻义陷阱」：
            # 1) 错因含 E1/E10（正是「按熟悉义去理解」）
            # 2) 有 trap_of 说明（明确记录了学生会当成哪个义）
            # 3) 搭配越多越可考
            # 4) 最后才看层级
            e1 = 0 if ("E1" in s.get("error_mech", []) or "E10" in s.get("error_mech", [])) else 1
            trapinfo = 0 if s.get("trap_of") else 1
            ncol = -min(len(s.get("collocations", [])), 4)
            lv = pref.index(s["sense_level"]) if s["sense_level"] in pref else 9
            return (e1, trapinfo, ncol, lv, s["sense_id"])

        # 人工选定的靶义优先（教研判断 > 自动排序）
        override_id = TARGET_OVERRIDE.get(w["headword"])
        if override_id:
            hit = [s for s in w["senses"] if s["sense_id"] == override_id]
            if not hit:
                print(f"❌ 词 {w['headword']} 的指定靶义 {override_id} 不存在")
                sys.exit(1)
            sense = hit[0]
            if not sense.get("is_trap"):
                print(f"❌ 词 {w['headword']} 的指定靶义不是陷阱义")
                sys.exit(1)
        else:
            cands.sort(key=rank)
            sense = cands[0]
        used_by_word[q["word_id"]].add(sense["sense_id"])
        plan.append({
            "word": w, "sense": sense,
            "carrier": q["carrier"], "difficulty": q["difficulty"],
            "replaces": q["id"],
        })

    print(f"\n替换 {len(plan)} 题（难度继承 {dict(Counter(p['difficulty'] for p in plan))}，"
          f"载体继承 {dict(sorted(Counter(p['carrier'] for p in plan).items()))}）")
    print(f"新靶义层级 {dict(sorted(Counter(p['sense']['sense_level'] for p in plan).items()))}")

    # ── 3. 校验：合并后训练册配额不变 ──────────────────────────────────
    # kept = 首轮保留清单中未被替换的部分；册内新题 42 道单列
    kept = [q for q in first_pass if q["id"] not in {v["id"] for v in victims}]
    new42 = new_qs
    all_diff = Counter([q["difficulty"] for q in kept] + [q["difficulty"] for q in new42] +
                       [p["difficulty"] for p in plan])
    all_carr = Counter([q["carrier"] for q in kept] + [q["carrier"] for q in new42] +
                       [p["carrier"] for p in plan])
    print(f"\n最终构成：首批保留 {len(kept)} + 册内新补 {len(new42)} + 替换新题 {len(plan)} "
          f"= {len(kept) + len(new42) + len(plan)}")
    print(f"替换后训练册 100 题难度 {dict(all_diff)}")
    print(f"替换后训练册 100 题载体 {dict(sorted(all_carr.items()))}")
    assert all_diff == Counter({"easy": 15, "mid": 55, "hard": 30}), all_diff
    assert all_carr == Counter({"C1": 58, "C2": 18, "C3": 10, "C4": 8, "C5": 3, "C6": 3}), all_carr
    covered = {q["word_id"] for q in kept} | {q["word_id"] for q in new42} | {p["word"]["id"] for p in plan}
    assert len(covered) == 100, f"覆盖词数 {len(covered)}"
    print(f"覆盖词数 {len(covered)} ✓（每词 1 题）")

    # ── 4. 切成 worker 批次 ─────────────────────────────────────────────
    nbatch = 3
    batches = [[] for _ in range(nbatch)]
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
                "old_sense": {
                    "sense_id": next(s["sense_id"] for s in w["senses"]
                                     if s["text"] == p["sense"]["text"] and s["sense_id"] == p["sense"]["sense_id"]),
                    "text": p["sense"]["text"],
                },
                "all_senses": [
                    {"sense_id": s["sense_id"], "text": s["text"],
                     "sense_level": s["sense_level"], "is_trap": s.get("is_trap", False),
                     "trap_of": s.get("trap_of", [])}
                    for s in w["senses"]
                ],
                "confusable": w.get("confusable", []),
                "word_family": w.get("word_family", []),
                "notes": w.get("notes", ""),
                "assigned_carrier": p["carrier"],
                "assigned_difficulty": p["difficulty"],
                "replaces_question_id": p["replaces"],
            })
        path = os.path.join(E1_DIR, f"plan_repl_batch{bi+1}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=1)
        outputs.append(path)
        print(f"  {os.path.relpath(path, ROOT)}: {len(items)} 题 "
              f"难度{dict(Counter(i['assigned_difficulty'] for i in items))}")

    meta = {
        "replaced_questions": [q["id"] for q in victims],
        "replacement_count": len(plan),
        "kept_questions": [q["id"] for q in kept],
        "batch_files": [os.path.relpath(p, ROOT) for p in outputs],
        "book_diff": dict(all_diff),
        "book_carrier": dict(sorted(all_carr.items())),
    }
    with open(os.path.join(E1_DIR, "plan_repl_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print(f"\n✅ 替换计划完成: {os.path.relpath(os.path.join(E1_DIR, 'plan_repl_meta.json'), ROOT)}")


if __name__ == "__main__":
    main()
