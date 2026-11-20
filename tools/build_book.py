#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《熟词僻义 100 题专项训练册》装配器

把两处题源合成一本能卖的训练册：
  A. 首批 200 题里 module=E1_熟词僻义 的 58 道（每词 1 道，已过首批验收）
  B. data/book/e1/questions_batch*.json 里新补的 42 道（覆盖此前没有 E1 题的 41 个词 + 1 个替换题）

装配后：100 题 / 100 词（每词恰好 1 题）/ 难度 15-55-30 / 载体 C1-C6 全覆盖。

产出 data/product/shici_book.json：
  meta     商品元信息（定位、承诺、定价位、交付形态、版权声明）
  units    5 个教学单元（每个单元有明确的考场动作）
  questions 100 题（带 book_no、单元号、答案、义项速查指针）
  answers  答案速查表
  wordlist 义项速查表（100 词）
  plan     7 天打卡表
"""
import glob
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = os.path.join(ROOT, "data", "batch1")
E1_DIR = os.path.join(ROOT, "data", "book", "e1")
OUT = os.path.join(ROOT, "data", "product", "shici_book.json")

UNIT_SPECS = [
    {
        "key": "U1", "match": "verb", "title": "单元一 · 动词的第二个意思",
        "action": "看到动词先圈住它后面的宾语或介词短语：宾语是「问题类名词」（problem / gap / issue / concern）→ 多半是「处理、解决」义；宾语是「人 / 场合」（audience / conference / meeting）→ 才是「演讲」义。同一个动词在两个宾语类型上换义，这是高考阅读里最常见的坑。",
        "focus": "动词义项切换",
    },
    {
        "key": "U2", "match": "noun", "title": "单元二 · 名词的第二个意思",
        "action": "名词要看定语和介词：case of flu 里的 case 是「病例」不是「病因」；a case of 与 a case for 的介词不同意思就不同。名词最容易被「医疗 / 法律 / 学术」这些专业语境顶替成另一个义项。",
        "focus": "名词义项切换",
    },
    {
        "key": "U3", "match": "phrase", "title": "单元三 · 搭配里的那个意思",
        "action": "只出现在固定搭配里的义项，只能整块背：stand for 是「代表」，不是「站立」；result in 是「导致」，不是「结果」。看到 in / for / to 这类介词，先在脑中把整个词块调出来，再对号入座。本单元题量不多——因为词库里真正的搭配型陷阱义就这么多，每一个都要背成永久分。",
        "focus": "固定搭配义（S4）",
    },
    {
        "key": "U4", "match": "adj", "title": "单元四 · 形容词与副词的另一个意思",
        "action": "形容词看它修饰谁、修饰的是褒是贬：sound 在「说法严谨」和「声音」之间切换；mean 在「吝啬的」和「意味着」之间切换。副词同理，先确定修饰的是动词、形容词还是整句。",
        "focus": "形容词 / 副词义项切换",
    },
    {
        "key": "U5", "match": "mixed", "title": "单元五 · 综合实战",
        "action": "把义项树摊开做：把该词的所有义项写成一列，再逐个用「这个义项放进句子里通不通」筛掉，最后只留一个。本单元跨动词、名词、形容词、副词混编，专门放最硬的题——考场上时间不够，就用这个 30 秒动作代替犹豫。",
        "focus": "多义辨析 · 义项树定位",
    },
]

# 单元五「综合实战」不是兜底桶：它从动词池与名词池里按比例抽出最难的题混编，
# 它的考场动作（义项树摊开）必须跨词性才成立。剩下的题留在原单元。
MIXED_TARGET = 30
# 单单元上限；超过则拆成 A/B 子单元（当前配额下不会触发）
MAX_UNIT = 32


def load(path, default=None):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def pos_of(entry, sense_id):
    """从 sense_id 还原词性（s_{word}_{pos}_{slug}）。"""
    for p in entry.get("pos", []):
        if sense_id.split("_")[2:3] == [p]:
            return p
    return "x"


def unit_key(entry, sense):
    if sense["sense_level"] == "S4":
        return "U3"
    p = pos_of(entry, sense["sense_id"])
    if p == "v":
        return "U1"
    if p == "n":
        return "U2"
    if p in ("adj", "adv"):
        return "U4"
    return "U5"


def main():
    allow_partial = "--allow-partial" in sys.argv
    words = load(os.path.join(BATCH, "entries.json"))
    bank = load(os.path.join(BATCH, "questions.json"))
    meta_plan = load(os.path.join(E1_DIR, "plan_meta.json"))
    repl_plan = load(os.path.join(E1_DIR, "plan_repl_meta.json"))
    by_id = {w["id"]: w for w in words}
    sense_index = {(w["id"], s["sense_id"]): s for w in words for s in w["senses"]}

    # ── A. 首批 E1 题中保留的 35 道（其余 23 道目标义项非陷阱义，被替换）──
    keep_ids = set(repl_plan["kept_questions"])
    kept = [q for q in bank if q["id"] in keep_ids]
    assert len(kept) == 35, f"保留题数 {len(kept)}（应为 35）"

    # ── B. 新补的 42 道 ───────────────────────────────────────────────
    newqs = []
    for p in sorted(glob.glob(os.path.join(E1_DIR, "questions_batch*.json"))):
        for q in load(p, []):
            q.pop("_src", None)
            newqs.append(q)
    if len(newqs) != 42:
        if not allow_partial:
            print(f"❌ 新题数 {len(newqs)} ≠ 42（补题批次未齐；调试可用 --allow-partial）")
            sys.exit(1)
        print(f"⚠️  部分装配：新题 {len(newqs)}/42")

    # ── C. 替换题 23 道（补齐「目标义项必须是陷阱义」这一硬约束）────────
    replqs = []
    for p in sorted(glob.glob(os.path.join(E1_DIR, "questions_repl_batch*.json"))):
        for q in load(p, []):
            q.pop("_src", None)
            replqs.append(q)
    if len(replqs) != 23:
        if not allow_partial:
            print(f"❌ 替换题数 {len(replqs)} ≠ 23（替换批次未齐；调试可用 --allow-partial）")
            sys.exit(1)
        print(f"⚠️  部分装配：替换题 {len(replqs)}/23")

    new_ids = {q["id"] for q in newqs}
    repl_ids = {q["id"] for q in replqs}
    assert not (new_ids & repl_ids), "新补题与替换题 id 冲突"
    assert not ((new_ids | repl_ids) & {q["id"] for q in kept}), "新旧题 id 冲突"

    allq = kept + newqs + replqs
    if len(allq) != 100 and not allow_partial:
        print(f"❌ 总题数 {len(allq)} ≠ 100")
        sys.exit(1)
    print(f"装配题目 {len(allq)}（首批 E1 保留 {len(kept)} + 新补 {len(newqs)} "
          f"+ 替换新题 {len(replqs)}）")

    # ── 单元分配 ──────────────────────────────────────────────────────
    buckets = defaultdict(list)
    for q in allq:
        w = by_id[q["word_id"]]
        s = sense_index[(q["word_id"], q["sense_id"])]
        q["_unit"] = unit_key(w, s)
        buckets[q["_unit"]].append(q)

    def by_hardness(items):
        """先难后易（考试里先啃硬的），同级按词序。"""
        return sorted(items, key=lambda q: ({"hard": 0, "mid": 1, "easy": 2}[q["difficulty"]],
                                            q["word_id"]))

    for k in list(buckets):
        buckets[k] = by_hardness(buckets[k])

    # 单元五：从动词池 / 名词池按各自占比抽最难的题，混编成综合实战
    v_pool, n_pool = buckets.get("U1", []), buckets.get("U2", [])
    pool_n = len(v_pool) + len(n_pool)
    mixed = []
    if pool_n:
        take_v = round(MIXED_TARGET * len(v_pool) / pool_n)
        take_n = min(MIXED_TARGET - take_v, len(n_pool))
        take_v = min(MIXED_TARGET - take_n, len(v_pool))
        mixed = v_pool[:take_v] + n_pool[:take_n]
        buckets["U1"] = v_pool[take_v:]
        buckets["U2"] = n_pool[take_n:]
    buckets["U5"] = by_hardness(mixed)

    units = []
    for spec in UNIT_SPECS:
        items = buckets.get(spec["key"], [])
        if not items:
            continue
        chunks = [items[i:i + MAX_UNIT] for i in range(0, len(items), MAX_UNIT)]
        for ci, chunk in enumerate(chunks):
            title = spec["title"] + (f"（{ci+1}）" if len(chunks) > 1 else "")
            units.append({
                "key": spec["key"] if len(chunks) == 1 else f"{spec['key']}-{ci+1}",
                "title": title,
                "focus": spec["focus"],
                "action": spec["action"],
                "questions": chunk,
            })

    # ── 题号编排 + 答案 ───────────────────────────────────────────────
    book_no = 0
    for ui, u in enumerate(units, start=1):
        u["no"] = ui
        u["question_nos"] = []
        for q in u["questions"]:
            book_no += 1
            q["book_no"] = book_no
            q["unit_no"] = ui
            if q["id"] in keep_ids:
                q["source"] = "首批200题"
            elif q["id"] in repl_ids:
                q["source"] = "熟词僻义替换题库"
            else:
                q["source"] = "熟词僻义补题库"
            ans = [o for o in q["options"] if o.get("correct")][0]
            q["answer_key"] = ans["key"]
            q["answer_text"] = ans["text"]
            q["sense_level"] = sense_index[(q["word_id"], q["sense_id"])]["sense_level"]
            u["question_nos"].append(book_no)
        u["count"] = len(u["questions"])

    # 全部题目按册内题号重排，保证 questions 数组与 book_no 严格对齐
    allq.sort(key=lambda q: q["book_no"])

    # ── 硬约束：册内 100 题的目标义项必须全部是陷阱义 ──────────────────
    # 这是本册的核心承诺「每个词只考它最容易错的那一个意思」的可执行形式：
    # 目标义项若是 S1 主义项，学生按最熟的那个义就能做对，那不是熟词僻义题。
    non_trap = [(q["book_no"], q["word_id"], q["sense_id"])
                for q in allq
                if not sense_index[(q["word_id"], q["sense_id"])].get("is_trap")]
    if non_trap:
        print(f"❌ {len(non_trap)} 题的目标义项不是陷阱义（is_trap=false）：{non_trap[:5]}")
        if not allow_partial:
            sys.exit(1)
        print("⚠️  部分装配：跳过该硬约束")
    else:
        print("✓ 目标义项陷阱义校验：100 题全部命中 is_trap=true")

    # ── 义项速查表 ────────────────────────────────────────────────────
    wordlist = []
    for q in allq:
        w = by_id[q["word_id"]]
        s = sense_index[(q["word_id"], q["sense_id"])]
        entry = {
            "book_no": q["book_no"],
            "headword": w["headword"],
            "ipa": w["ipa"],
            "level": w["level"],
            "pos": "/".join(w["pos"]),
            "sense_id": s["sense_id"],
            "sense_text": s["text"],
            "sense_level": s["sense_level"],
            "is_trap": s.get("is_trap", False),
            "trap_of": s.get("trap_of", []),
            "collocations": s.get("collocations", []),
            "answer": q["answer_key"],
            "notes": w.get("notes", ""),
            "sense_count": len(w["senses"]),
        }
        wordlist.append(entry)
    wordlist.sort(key=lambda e: e["book_no"])

    # ── 答案速查表 ────────────────────────────────────────────────────
    answers = []
    for q in allq:
        w = by_id[q["word_id"]]
        s = sense_index[(q["word_id"], q["sense_id"])]
        answers.append({
            "book_no": q["book_no"],
            "qid": q["id"],
            "word": w["headword"],
            "answer": q["answer_key"],
            "answer_text": q["answer_text"],
            "sense_text": s["text"],
            "sense_level": s["sense_level"],
            "carrier": q["carrier"],
            "difficulty": q["difficulty"],
            "source": q["source"],
        })

    # ── 7 天打卡表 ────────────────────────────────────────────────────
    per_day = [15, 15, 15, 15, 15, 15, 10]
    plan_days = []
    cur = 1
    for d, n in enumerate(per_day, start=1):
        plan_days.append({"day": d, "from": cur, "to": cur + n - 1, "count": n})
        cur += n
    assert cur - 1 == 100

    # ── 元信息 ────────────────────────────────────────────────────────
    diff = Counter(q["difficulty"] for q in allq)
    carr = Counter(q["carrier"] for q in allq)
    lvl = Counter(sense_index[(q["word_id"], q["sense_id"])]["sense_level"] for q in allq)
    meta = {
        "title": "熟词僻义 100 题专项训练册",
        "subtitle": "100 个高考高频词 · 每个词一个最容易错的义项",
        "version": "v1.0",
        "positioning": "不是词表，是定位器：帮你判断「这个词在这个语境里到底是哪个意思」",
        "promise": "100 题覆盖 100 个高频词的陷阱义，每题给一个可执行的考场动作",
        "stats": {
            "questions": len(allq),
            "words": len({q["word_id"] for q in allq}),
            "senses_tested": len({q["sense_id"] for q in allq}),
            "difficulty": dict(diff),
            "carrier": dict(sorted(carr.items())),
            "sense_level": dict(sorted(lvl.items())),
            "units": len(units),
            "trap_senses": sum(1 for q in allq
                               if sense_index[(q["word_id"], q["sense_id"])].get("is_trap")),
        },
        "copyright": {
            "example_source": "全书例句均为自编仿真例句，来源标注「仿真例句 · 高考阅读高频句式」",
            "no_exam_text": "不含任何真题原文、真题选项、真题解析",
            "textbook": "中文释义为自行改写措辞，未搬运教材原文与词典释义",
        },
        "pricing": {
            "strategy": "分阶段定价：按覆盖词量分档（10% / 50% / 100%）。纸质打印不再单独设档，PDF 自行双面打印即可",
            "tiers": [
                {"key": "p10", "label": "10 题档", "questions": 10, "coverage": "10%",
                 "price": 1.9, "note": "一小块起步，先试自己的节奏"},
                {"key": "p50", "label": "50 题档", "questions": 50, "coverage": "50%",
                 "price": 3.9, "note": "覆盖一半高频词，每题含完整解析"},
                {"key": "p100", "label": "100 题完整档", "questions": 100, "coverage": "100%",
                 "price": 4.9, "note": "全书：100 题 + 逐题解析 + 义项速查表 + 7 天打卡表"},
            ],
            "bundle": {
                "key": "all", "label": "全包", "price": 9.9,
                "includes": "完整 100 题训练册 + App 全部功能（义项树 / FSRS 排期 / 家长周报 / 全部专项训练）",
            },
            "paper_tier": False,
            "max_price": 9.9,
            "note": "全站最高价 ¥9.9；纸质打印不单独设档",
        },
        "generated_from": {
            "bank_questions": len(bank),
            "kept_e1": len(kept),
            "new_e1": len(newqs),
            "replaced_e1": len(replqs),
            "plan_meta": meta_plan["book_diff"],
        },
    }

    out = {
        "meta": meta,
        "units": units,
        "questions": [{k: v for k, v in q.items() if not k.startswith("_")} for q in allq],
        "answers": answers,
        "wordlist": wordlist,
        "plan": plan_days,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f"✅ 装配完成 → {os.path.relpath(OUT, ROOT)}")
    print(f"   题目 {len(allq)} / 词 {len({q['word_id'] for q in allq})} / 单元 {len(units)}")
    print(f"   难度 {dict(diff)}")
    print(f"   载体 {dict(sorted(carr.items()))}")
    print(f"   考义项层级 {dict(sorted(lvl.items()))}")
    for u in units:
        print(f"   {u['title']}: {u['count']} 题（第 {u['question_nos'][0]}-{u['question_nos'][-1]} 题）")


if __name__ == "__main__":
    main()
