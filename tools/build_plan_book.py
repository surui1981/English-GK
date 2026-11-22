#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《30 天冲刺计划表 + 单词打卡表》内容装配器

输入: data/batch1/entries.json       100 精修词（词序即学习序列）
      data/core_freq_curated.json     高频分层（T1/T2）
输出: data/product/plan_book.json     第三本单品成书数据

设计依据（教研体系 §4 四轮学习法）：
  第一轮(逐词学习) → 第二轮(重点突破) → 第三轮(意识增进) → 第四轮(温故知新)
  30 天分 4 阶段，每日新词量梯度：起步 15 → 峰值 30 → 回落复习；
  每周一个复盘节点，末周全量提取复习。计划表不含教材原文，词序取自自研精修库。
"""
import json
import os
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRIES = os.path.join(ROOT, 'data', 'batch1', 'entries.json')
CORE = os.path.join(ROOT, 'data', 'core_freq_curated.json')
OUT = os.path.join(ROOT, 'data', 'product', 'plan_book.json')

BOOK_NAME = '30 天冲刺计划表 + 单词打卡表'
BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']

# 30 天节奏：阶段 + 每日新词量（0 = 纯复习日）
# 新词总量须等于精修词数（100）：先集中学新词，后段转入提取复习。
# 括号内为当日「首次学习」的新词数，0 表示纯复习日（当天强度不低，只是不引新词）。
PHASES = [
    ('第一轮 · 逐词打底', [15, 15, 15, 15, 15, 5, 0]),            # 7 天 / 80 新词
    ('第二轮 · 高频突破', [5, 5, 5, 5, 0, 0, 0]),                # 7 天 / 20 新词
    ('第三轮 · 语境强化', [0, 0, 0, 0, 0, 0, 0, 0]),             # 8 天 / 纯语境复习
    ('第四轮 · 提取复习', [0, 0, 0, 0, 0, 0, 0, 0]),             # 8 天 / 纯提取复习
]
REVIEW_TASKS = {
    7: '本周复盘：遮住中文自测前 %d 词，错的重回词卡',
    14: '阶段检测：前 %d 词按 S 层级抽查陷阱义',
    21: '语境复盘：把熟词僻义词放进例句重译',
    30: '全量提取：100 词随机抽测 + 错因归类',
}


def main():
    entries = load_entr()
    core = load(CORE)['words']
    # 词序：T1 优先、tier 内按精修顺序
    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words = sorted([e['headword'] for e in entries],
                   key=lambda w: tier_rank.get(core.get(w, {}).get('tier', ''), 9))

    days = []
    day_no = 0
    cursor = 0
    for phase_name, counts in PHASES:
        for count in counts:
            day_no += 1
            start = cursor
            new_words = words[cursor:cursor + count] if count else []
            cursor += count
            item = OrderedDict([
                ('day', day_no),
                ('phase', phase_name),
                ('new_count', len(new_words)),
                ('new_words', new_words),
                ('range', [start + 1, cursor] if new_words else [start, start]),
                ('is_review', count == 0),
            ])
            if day_no in REVIEW_TASKS:
                task = REVIEW_TASKS[day_no]
                item['review_task'] = task % cursor if '%d' in task else task
            days.append(item)

    # 合规
    errs = []
    blob = json.dumps(days, ensure_ascii=False)
    for w in BANNED_HARD:
        if w in blob:
            errs.append('宣传禁用词: ' + w)
    for t in [BOOK_NAME] + [d.get('review_task', '') for d in days]:
        if '真题' in t and not any(a in t for a in EXAM_ALLOWED):
            errs.append('未限定真题: ' + t[:40])
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs))

    total_new = sum(d['new_count'] for d in days)
    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '四轮递进 · 每日梯度 · 可打印打卡'),
            ('status', '正式版'),
            ('description', '30 天四阶段递进计划：前两周集中学完 100 词，后两周转入语境强化与提取复习；每日任务与复盘节点明确，附可打印打卡表。'),
            ('method', '教研体系四轮学习法：逐词学习 → 重点突破 → 意识增进 → 温故知新。'),
            ('copyright', '计划表为自研编排，词序来自自建精修词库，不含教材原文与单元词表。'),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '30 天完整版'), ('days', 30), ('price', 2.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('total_days', 30),
                ('planned_words', 100),
                ('scheduled_new_words', total_new),
                ('phases', [p[0] for p in PHASES]),
            ])),
        ])),
        ('days', days),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 天 / 安排新词 %d' % (BOOK_NAME, len(days), total_new))
    print('  阶段:', [p[0] for p in PHASES])
    print('  合规自检通过：无宣传禁用词、无未限定真题')


def load_entr():
    return load(ENTRIES)


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


if __name__ == '__main__':
    main()
