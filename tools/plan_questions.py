#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
题目编排器：为 200 道题精确配平 考义项 / 失因模块 / 难度 / 题型载体。

体系细化（实测定稿）：
  E3 形近音近混淆 与 E9 拼写变形错误 **无法挂在义项上** —— 它们是词形维度的失分，
  只能由题目的干扰项设计承载。实测 420 个义项中带 E3 的仅 1 个、带 E9 的仅 1 个。
  故 E3 由干扰项设计决定（从该词 confusable 列表取形近干扰项）；E9 归入 E5；E10 归入 E1。

三段解耦编排（容量可行 + 分布精确）：
  1. 选义项：每词 2 题。第 1 题考陷阱义（优先 S3/S4）→ 偏难；第 2 题考另一义项 → 偏易中。
  2. 配模块：失因模块主要取决于「干扰项设计」而非义项层标注，故按稀缺度优先匹配
     —— 优先把模块配给 error_mech 含该码的义项，配不上的再由剩余题目兜底，
     保证 8 个模块的配额精确达标，同时最大化「题—义项」语义一致度。
  3. 定难度：精确配平 30 easy / 110 mid / 60 hard，且陷阱义题整体偏难。
"""
import json
import os
import random
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
random.seed(20241117)

E_NAME = {
    "E1": "熟词僻义", "E2": "一词多义混淆", "E3": "形近音近混淆", "E4": "固定搭配缺失",
    "E5": "词性词形误判", "E6": "语境推断失败", "E7": "逻辑连接词误用", "E8": "情感色彩误判",
}
TARGET_MODULE = {"E1": 60, "E2": 40, "E4": 30, "E3": 24, "E5": 20, "E6": 16, "E7": 6, "E8": 4}
TARGET_CARRIER = {"C1": 88, "C2": 48, "C3": 32, "C4": 16, "C5": 10, "C6": 6}
TARGET_DIFF = {"easy": 30, "mid": 110, "hard": 60}
ACC = {"easy": [0.65, 0.95], "mid": [0.35, 0.75], "hard": [0.15, 0.45]}
MOD_ALIAS = {"E9": "E5", "E10": "E1"}
AFFINITY = {
    "E1": {"C1": 5, "C2": 4, "C3": 2, "C4": 1, "C5": 1, "C6": 1},
    "E2": {"C1": 3, "C2": 4, "C3": 3, "C4": 1, "C5": 1, "C6": 1},
    "E3": {"C1": 2, "C2": 4, "C3": 4, "C4": 1, "C5": 1, "C6": 2},
    "E4": {"C1": 4, "C2": 3, "C3": 4, "C4": 2, "C5": 1, "C6": 2},
    "E5": {"C1": 1, "C2": 2, "C3": 5, "C4": 2, "C5": 2, "C6": 1},
    "E6": {"C1": 5, "C2": 4, "C3": 2, "C4": 1, "C5": 2, "C6": 3},
    "E7": {"C1": 3, "C2": 3, "C3": 4, "C4": 2, "C5": 1, "C6": 4},
    "E8": {"C1": 4, "C2": 3, "C3": 1, "C4": 2, "C5": 2, "C6": 2},
}
HINT = {
    "E1": "考熟词僻义：干扰项按学生最熟悉的那个义项设置，正解是本义项",
    "E2": "考同一词的另一义项：干扰项是该词另一个真实存在的义项",
    "E3": "干扰项必须取自该词的 confusable 形近/音近列表，正确项与干扰项共享词根或音节",
    "E4": "考固定搭配：干扰项须能接在同一结构下但搭配错",
    "E5": "考词性或词形变化（-ed/-ing/名词化/形容词↔名词），干扰项用同一词根的另一词性",
    "E6": "考语境推断：干扰项字面讲得通但与上下文线索矛盾",
    "E7": "考逻辑连接词的语义方向：干扰项用方向相反或关系不同的连接词",
    "E8": "考褒贬色彩/语气强度：干扰项用色彩相反的近义词",
}


def main():
    words = json.load(open(os.path.join(BATCH, "entries.json"), encoding="utf-8"))

    # ── 1. 模块 → 每词 2 个模块（稀缺优先，尊重各词的能力支撑） ──
    def codes_of(s):
        em = s.get("error_mech", [])
        out = {MOD_ALIAS.get(e, e) for e in em}
        if em:
            out.add(MOD_ALIAS.get(em[0], em[0]))
        return out

    word_supports = defaultdict(lambda: defaultdict(list))
    for w in words:
        for s in w["senses"]:
            for c in codes_of(s):
                word_supports[w["id"]][c].append(s)

    word_slots = {w["id"]: [] for w in words}
    for m in sorted(TARGET_MODULE, key=lambda k: TARGET_MODULE[k]):
        need = TARGET_MODULE[m]
        cands = [w["id"] for w in words
                 if m in word_supports[w["id"]] and len(word_slots[w["id"]]) < 2]
        cands.sort(key=lambda wid: (len(word_slots[wid]), random.random()))
        for wid in cands:
            if need <= 0:
                break
            word_slots[wid].append(m)
            need -= 1
        if need > 0:
            rest = [w["id"] for w in words if len(word_slots[w["id"]]) < 2]
            random.shuffle(rest)
            for wid in rest[:need]:
                word_slots[wid].append(m)
                need -= 1
        if need > 0:
            print(f"⚠️ 模块 {m} 仍有 {need} 个 slot 未分配")

    # ── 2. 按模块选义项：匹配 error_mech，优先陷阱义 ──
    slots = []
    coherence = 0
    nontrap_used = 0
    NONTRAP_TARGET = 30   # 非陷阱义题至少 30 道，保证 easy 难度配额可达
    for w in words:
        mods = word_slots[w["id"]]
        if len(mods) != 2:
            continue
        used = set()
        for i, m in enumerate(mods):
            all_s = [s for s in w["senses"] if s["sense_id"] not in used]
            match = [s for s in all_s if m in codes_of(s)]
            if match:
                coherence += 1
            pool = match or all_s
            if not pool:
                continue
            trap = [s for s in pool if s.get("is_trap")]
            nontrap = [s for s in pool if not s.get("is_trap")]
            if i == 0:
                # 题 A：优先陷阱义，S3/S4 优先
                ranked = sorted(trap or pool, key=lambda s: (s["sense_level"] not in ("S3", "S4"),
                                                             random.random()))
            else:
                # 题 B：优先非陷阱义；非陷阱配额未用尽时，模块匹配可让位给非陷阱义
                if nontrap_used < NONTRAP_TARGET:
                    loose_non = [s for s in all_s if not s.get("is_trap")]
                    if loose_non and not nontrap:
                        ranked = sorted(loose_non,
                                        key=lambda s: (s["sense_level"] == "S1",
                                                       s["sense_level"] not in ("S2", "S3"),
                                                       random.random()))
                        pool = ranked
                    else:
                        ranked = sorted(nontrap or pool,
                                        key=lambda s: (s["sense_level"] == "S1",
                                                       s["sense_level"] not in ("S2", "S3"),
                                                       random.random()))
                else:
                    ranked = sorted(nontrap or pool,
                                    key=lambda s: (s["sense_level"] == "S1",
                                                   s["sense_level"] not in ("S2", "S3"),
                                                   random.random()))
            s = ranked[0]
            used.add(s["sense_id"])
            if not s.get("is_trap"):
                nontrap_used += 1
            slots.append({"word": w, "sense": s, "module": m, "slot": "A" if i == 0 else "B"})

    print(f"选义项：{len(slots)} 题（{len(words)} 词 × 2）；"
          f"题—义项语义一致 {coherence}/{len(slots)} ({coherence/len(slots)*100:.0f}%)")
    trap_ct = sum(1 for s in slots if s["sense"].get("is_trap"))
    print(f"  陷阱义题 {trap_ct} / 非陷阱义题 {len(slots)-trap_ct}")
    print("  S 层级:", dict(Counter(s["sense"]["sense_level"] for s in slots)))

    # ── 3. 定难度：精确 30 easy / 110 mid / 60 hard，陷阱义题偏难 ──
    trap_slots = [q for q in slots if q["sense"].get("is_trap")]
    non_slots = [q for q in slots if not q["sense"].get("is_trap")]
    random.shuffle(trap_slots)
    random.shuffle(non_slots)
    diff = {}
    n_hard = TARGET_DIFF["hard"]
    n_easy = TARGET_DIFF["easy"]
    # hard 优先给陷阱义题
    hard_src = trap_slots[:n_hard]
    if len(hard_src) < n_hard:
        hard_src += non_slots[:n_hard - len(hard_src)]
    rest_trap = trap_slots[len(hard_src):]
    used_non = max(0, n_hard - len(trap_slots))
    rest_non = non_slots[used_non:]
    easy_src = rest_non[:n_easy]
    mid_src = rest_trap + rest_non[n_easy:]
    for q in hard_src:
        diff[id(q)] = "hard"
    for q in easy_src:
        diff[id(q)] = "easy"
    for q in mid_src:
        diff[id(q)] = "mid"
    print(f"难度来源：hard {len(hard_src)} / easy {len(easy_src)} / mid {len(mid_src)}")

    # ── 4. 载体：按失因机制 × 题型亲和度 ──
    carr_left = Counter(TARGET_CARRIER)
    carr = {}
    order = sorted(slots, key=lambda q: -AFFINITY.get(q["module"], {}).get("C1", 0))
    for q in order:
        m = q["module"]
        best, best_sc = None, -1
        for c, left in carr_left.items():
            if left <= 0:
                continue
            sc = AFFINITY.get(m, {}).get(c, 0)
            if sc > best_sc:
                best, best_sc = c, sc
        if best is None:
            best = next(c for c, l in carr_left.items() if l > 0)
        carr_left[best] -= 1
        carr[id(q)] = best

    # ── 5. 输出（按词序排列，题 A 在前） ──
    out = []
    idx = 0
    for w in words:
        for s in [x for x in slots if x["word"]["id"] == w["id"]]:
            sense = s["sense"]
            m = s["module"]
            d = diff[id(s)]
            c = carr[id(s)]
            idx += 1
            out.append({
                "id": f"q_{idx:03d}",
                "word_id": w["id"],
                "headword": w["headword"],
                "sense_id": sense["sense_id"],
                "sense_text": sense["text"],
                "sense_level": sense["sense_level"],
                "is_trap": bool(sense.get("is_trap")),
                "trap_of": sense.get("trap_of", []),
                "sense_error_mech": sense.get("error_mech", []),
                "module": f"{m}_{E_NAME[m]}",
                "module_code": m,
                "difficulty": d,
                "expected_accuracy": ACC[d],
                "carrier": c,
                "collocations": sense.get("collocations", []),
                "confusable": w.get("confusable", []),
                "notes": w.get("notes", ""),
                "example": sense.get("example", {}),
                "design_hint": HINT.get(m, ""),
            })

    print(f"\n生成编排 {len(out)} 题")
    print("难度:", dict(Counter(o["difficulty"] for o in out)))
    print("载体:", dict(Counter(o["carrier"] for o in out)))
    print("模块:", dict(Counter(o["module"] for o in out)))
    print("S 层级:", dict(Counter(o["sense_level"] for o in out)))
    print("陷阱义题:", sum(1 for o in out if o["is_trap"]))
    print("难度×陷阱:", dict(Counter((o["difficulty"], o["is_trap"]) for o in out)))

    c = Counter(o["word_id"] for o in out)
    bad = [k for k, v in c.items() if v != 2]
    if bad:
        print(f"⚠️ 题量不为 2 的词: {bad}")

    os.makedirs(os.path.join(BATCH, "qplan"), exist_ok=True)
    per = len(out) // 5
    for i in range(5):
        chunk = out[i * per:(i + 1) * per] if i < 4 else out[4 * per:]
        json.dump({"_meta": {"batch": i + 1, "count": len(chunk),
                             "spec": "docs/首批100词精修规范.md",
                             "gold_standard": "docs/首批100词精修规范.md §6.2"},
                  "questions": chunk},
                  open(os.path.join(BATCH, "qplan", f"qplan{i+1}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
    json.dump(out, open(os.path.join(BATCH, "q_plan.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\n已写 q_plan.json 与 qplan/qplan1–5.json")


if __name__ == "__main__":
    main()
