#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
首批 100 词筛选器（双轨制）
输入: data/core_freq_curated.json + data/core_freq_curated_ext.json (人工频次判定表)
      data/textbook_lexicon.json (A轨教材词库)
输出: data/batch1_words.json

筛选逻辑（四段式）：
  1. 人工频次层 T1/T2 —— 高考真题复现率，决定「值不值得做」
  2. 陷阱强度 1-3 —— 决定「能不能作为熟词僻义弹药」
  3. A/B 双轨 —— 教材内词用教材义项骨架；教材缺失词走 B 轨自建义项树
  4. 单元配额 —— 每单元保底 2 词（保证 36 主题包都有种子内容），上限 5 词

B 轨配额说明：
  实测 190 个 T1 高价值多义词中，109 个（57%）根本不在教材词表内。
  若严格限定在教材表内，将失去 address / interest / sound / mean 等旗舰熟词僻义词，
  与「熟词僻义专项」这一核心产品形态直接冲突。故采用 A 轨为主 + B 轨补齐。
"""
import json
import os
import re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CURATED = [os.path.join(ROOT, "data", "core_freq_curated.json"),
           os.path.join(ROOT, "data", "core_freq_curated_ext.json")]
LEXICON = os.path.join(ROOT, "data", "textbook_lexicon.json")
OUT = os.path.join(ROOT, "data", "batch1_words.json")

TIER_SCORE = {"T1": 100, "T2": 62, "T3": 30}
UNIT_FLOOR = 2      # 每单元保底入选数
UNIT_CAP = 5        # 每单元上限
B_TRACK_QUOTA = 22  # B 轨（教材缺失）配额
TARGET = 100

# B 轨旗舰名单：人工判定，按「熟词僻义专项」核心弹药价值排序
B_TRACK_PRIORITY = [
    "address", "interest", "sound", "mean", "cover", "develop", "subject", "bear",
    "plant", "state", "value", "sense", "mind", "order", "point", "present",
    "right", "result", "stand", "treat", "nature", "practice",
]


def norm(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def load():
    words = {}
    for p in CURATED:
        data = json.load(open(p, encoding="utf-8"))
        for k, v in data["words"].items():
            words[norm(k)] = v
    lex = json.load(open(LEXICON, encoding="utf-8"))
    tb = {}
    for w in lex["words"]:
        tb.setdefault(norm(w["headword"]), w)
    return words, tb


def score(item, tbw):
    tier = item["tier"]
    trap = item.get("trap_strength", 1)
    parts = {"tier": TIER_SCORE[tier], "trap": trap * 9}
    if tbw:
        parts["track_a"] = 26 if tbw.get("sense_count", 1) >= 2 else 9
        parts["senses"] = min(tbw.get("sense_count", 1), 7) * 4
        parts["has_ipa"] = 3 if tbw.get("ipa") else 0
    else:
        parts["track_a"] = 0
        parts["senses"] = 0
        parts["has_ipa"] = 0
    return sum(parts.values()), parts


def main():
    curated, tb = load()

    rows = []
    for head, item in curated.items():
        tbw = tb.get(head)
        s, parts = score(item, tbw)
        rows.append({
            "headword": head, "tier": item["tier"],
            "trap_strength": item.get("trap_strength", 1),
            "trap_hint": item.get("trap", ""), "core_hint": item.get("core", ""),
            "note": item.get("note", ""), "score": s, "parts": parts,
            "in_textbook": bool(tbw), "tb": tbw,
        })
    rows.sort(key=lambda r: (-r["score"], r["headword"]))
    by_head = {r["headword"]: r for r in rows}

    # ── 段一：B 轨旗舰名单（人工优先级） ──
    b_rows = []
    for h in B_TRACK_PRIORITY:
        r = by_head.get(h)
        if r and not r["in_textbook"]:
            b_rows.append(r)
        elif r and r["in_textbook"]:
            print(f"  [提示] {h} 实际在教材表内，转为 A 轨")
    # 若旗舰名单不足配额，按分数补 B 轨
    if len(b_rows) < B_TRACK_QUOTA:
        for r in rows:
            if len(b_rows) >= B_TRACK_QUOTA:
                break
            if not r["in_textbook"] and r not in b_rows:
                b_rows.append(r)
    b_rows = b_rows[:B_TRACK_QUOTA]

    # ── 段二：A 轨单元保底（每单元先保底 2 词） ──
    a_rows = [r for r in rows if r["in_textbook"] and r not in b_rows]
    unit_count = Counter()
    picked = []
    picked_heads = set()

    def unit_of(r):
        return r["tb"]["unit_id"]

    for r in a_rows:
        u = unit_of(r)
        if unit_count[u] < UNIT_FLOOR:
            unit_count[u] += 1
            picked.append(r)
            picked_heads.add(r["headword"])

    # ── 段三：A 轨按分数补齐（受 UNIT_CAP 约束） ──
    a_target = TARGET - len(b_rows)
    for r in a_rows:
        if len(picked) >= a_target:
            break
        if r["headword"] in picked_heads:
            continue
        u = unit_of(r)
        if unit_count[u] >= UNIT_CAP:
            continue
        unit_count[u] += 1
        picked.append(r)
        picked_heads.add(r["headword"])

    # 若仍不足（受单元上限卡住），放宽上限补齐
    if len(picked) < a_target:
        for r in a_rows:
            if len(picked) >= a_target:
                break
            if r["headword"] in picked_heads:
                continue
            unit_count[unit_of(r)] += 1
            picked.append(r)
            picked_heads.add(r["headword"])

    selected = b_rows + picked
    # 按分数排序输出，但保留 B/A 轨标记
    selected.sort(key=lambda r: (r["tier"] != "T1", -r["score"], r["headword"]))

    out_words = []
    for i, r in enumerate(selected, 1):
        tbw = r["tb"]
        out_words.append({
            "seq": i,
            "id": f"w_{r['headword'].replace(' ', '_').replace('-', '_')}",
            "headword": r["headword"],
            "track": "A" if r["in_textbook"] else "B",
            "tier": r["tier"],
            "trap_strength": r["trap_strength"],
            "trap_hint": r["trap_hint"],
            "core_hint": r["core_hint"],
            "note": r["note"],
            "score": r["score"],
            "seed": {
                "ipa": tbw.get("ipa") if tbw else "",
                "pos": tbw.get("pos", []) if tbw else [],
                "pos_raw": tbw.get("pos_raw", "") if tbw else "",
                "sense_count": tbw.get("sense_count", 0) if tbw else 0,
                "senses_raw": tbw.get("senses_raw", []) if tbw else [],
                "definition_raw": tbw.get("definition_raw", "") if tbw else "",
                "book": tbw.get("book", "") if tbw else "",
                "unit": tbw.get("unit", "") if tbw else "",
                "unit_id": tbw.get("unit_id", "") if tbw else "",
                "unit_title_raw": tbw.get("unit_title", "") if tbw else "",
                "theme": tbw.get("theme", "") if tbw else "",
                "theme_tags": tbw.get("theme_tags", []) if tbw else [],
                "source": tbw.get("source", "") if tbw else "",
            },
        })

    units_covered = len([u for u in unit_count if u != "__B轨__"])
    stats = {
        "selected": len(out_words),
        "track_a": sum(1 for w in out_words if w["track"] == "A"),
        "track_b": sum(1 for w in out_words if w["track"] == "B"),
        "tier_mix": dict(Counter(w["tier"] for w in out_words)),
        "trap_mix": dict(Counter(w["trap_strength"] for w in out_words)),
        "units_covered": units_covered,
        "units_total": 36,
        "unit_floor": UNIT_FLOOR,
        "unit_cap": UNIT_CAP,
        "b_track_quota": B_TRACK_QUOTA,
    }

    # ── 冻结名单漂移检测 ──
    # 首批 100 词的选词结果已冻结（词条精修 + 200 道配套题绑定其上）。
    # 本脚本重跑只做「漂移检测」：若教材词表或解析器变动导致名单变化，
    # 明确报出来而不是静默改写已交付内容。漂移量记入第二批输入。
    drift = None
    if os.path.exists(OUT):
        frozen = json.load(open(OUT, encoding="utf-8")).get("words", [])
        if frozen:
            fset = {w["headword"] for w in frozen}
            nset = {w["headword"] for w in out_words}
            if fset != nset:
                drift = {
                    "frozen_count": len(fset),
                    "current_count": len(nset),
                    "dropped": sorted(fset - nset),
                    "added": sorted(nset - fset),
                    "order_changed": [w["headword"] for w in frozen] != [w["headword"] for w in out_words],
                }

    if drift is None:
        json.dump({"_meta": {"generated_by": "tools/select_batch1.py",
                             "method": "人工频次层 × 陷阱强度 × A/B 双轨 × 单元保底2上限5",
                             "stats": stats},
                   "words": out_words},
                  open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(json.dumps(stats, ensure_ascii=False, indent=1))
    else:
        print(json.dumps(stats, ensure_ascii=False, indent=1))
        print("\n[冻结名单漂移] 已交付的首批 100 词不随本次重跑改写。")
        print(f"  移出 {len(drift['dropped'])}: {', '.join(drift['dropped'])}")
        print(f"  移入 {len(drift['added'])}: {', '.join(drift['added'])}")
        print("  → 该差异记入 data/material_impact.json · batch1_selection_drift，"
              "作为第二批选词输入；如需改名单，须重做对应词条与配套题。")
        with open(os.path.join(ROOT, "data", "_batch1_selection_drift.json"), "w",
                  encoding="utf-8") as f:
            json.dump(drift, f, ensure_ascii=False, indent=1)
    print("\n--- B 轨入选（教材表没有，义项树需自建）---")
    for w in out_words:
        if w["track"] == "B":
            print(f"  {w['seq']:3d} {w['headword']:<12} {w['tier']} t{w['trap_strength']}  {w['trap_hint'][:50]}")

    print("\n--- 单元分布 ---")
    for u, c in sorted(unit_count.items(), key=lambda x: (x[0] == "__B轨__", x[0])):
        print(f"  {u:<14} {c}")


if __name__ == "__main__":
    main()
