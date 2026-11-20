#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 entries.json / questions.json 注入可视化页的 __DATA__ 占位符。"""
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
HTML = os.path.join(ROOT, "docs", "首批100词内容总览.html")

words = json.load(open(os.path.join(BATCH, "entries.json"), encoding="utf-8"))
questions = json.load(open(os.path.join(BATCH, "questions.json"), encoding="utf-8"))
sel = json.load(open(os.path.join(ROOT, "data", "batch1_words.json"), encoding="utf-8"))
seed = {w["headword"]: w for w in sel["words"]}

# 单元覆盖
unit_ct = Counter()
unit_theme = {}
for w in words:
    s = seed.get(w["headword"])
    if not s:
        continue
    uid = s["seed"].get("unit_id") or "__B轨__"
    unit_ct[uid] += 1
    unit_theme[uid] = s["seed"].get("theme") or "教材表未收录"
units = [{"unit_id": u, "theme": unit_theme.get(u, ""), "count": c,
          "unit_title": ""} for u, c in sorted(unit_ct.items())]

w_out = []
for w in words:
    s = seed.get(w["headword"], {})
    w_out.append({
        "id": w["id"], "headword": w["headword"], "ipa": w.get("ipa", ""),
        "level": w.get("level", ""), "track": s.get("track", "A"),
        "trap_strength": s.get("trap_strength", 2),
        "unit_id": s.get("seed", {}).get("unit_id", ""),
        "theme": s.get("seed", {}).get("theme", ""),
        "pos": w.get("pos", []),
        "strategies": w.get("strategies", []),
        "carriers": w.get("carriers", []),
        "notes": w.get("notes", ""),
        "senses": [{
            "sense_id": x["sense_id"], "text": x["text"], "sense_level": x["sense_level"],
            "is_trap": x.get("is_trap", False), "trap_of": x.get("trap_of", []),
            "error_mech": x.get("error_mech", []),
            "example": x.get("example", {}), "collocations": x.get("collocations", []),
        } for x in w["senses"]],
    })

q_out = [{
    "id": q["id"], "module": q["module"], "carrier": q["carrier"],
    "difficulty": q["difficulty"], "expected_accuracy": q["expected_accuracy"],
    "stem": q["stem"], "stem_cn": q["stem_cn"],
    "options": q["options"], "explanation": q["explanation"],
} for q in questions]

summary = {
    "sense_count": sum(len(w["senses"]) for w in words),
    "trap_sense_count": sum(1 for w in words for x in w["senses"] if x.get("is_trap")),
    "question_count": len(questions),
    "s_level": dict(Counter(x["sense_level"] for w in words for x in w["senses"])),
    "e_mech": dict(Counter(e for w in words for x in w["senses"] for e in x.get("error_mech", []))),
    "carrier_entries": dict(Counter(c for w in words for c in w.get("carriers", []))),
    "difficulty": dict(Counter(q["difficulty"] for q in questions)),
    "carrier_questions": dict(Counter(q["carrier"] for q in questions)),
    "module": dict(Counter(q["module"] for q in questions)),
}

data = {
    "meta": {"generated_by": "tools/select_batch1.py + tools/plan_questions.py"},
    "stats": sel["_meta"]["stats"],
    "summary": summary,
    "words": w_out,
    "units": units,
    "questions": q_out,
}

html = open(HTML, encoding="utf-8").read()
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
if "__DATA__" in html:
    html = html.replace("__DATA__", payload)
else:
    # 已注入过一次：替换掉原有的 const DATA = {...}; 行，保证脚本可重复运行
    import re
    new_html, n = re.subn(r"const DATA = \{.*?\};\n", "const DATA = __DATA__;\n",
                           html, count=1, flags=re.S)
    if n == 0:
        raise SystemExit("HTML 中未找到 __DATA__ 占位符，也未找到可替换的 const DATA 语句")
    html = new_html.replace("__DATA__", payload)
open(HTML, "w", encoding="utf-8").write(html)
print(f"注入完成：{len(words)} 词条 / {summary['sense_count']} 义项 / {len(questions)} 题")
print(f"HTML: {HTML}  ({os.path.getsize(HTML)/1024:.1f} KB)")
