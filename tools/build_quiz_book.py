#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《熟词僻义 100 题专项训练册》成书装配器

输入: data/product/shici_book.json   题库装配产物（100 题 / 5 单元 / 答案 / 打卡表）
输出: data/product/quiz_book.json     详情页/试读页用的成书数据

说明：题库本体由 tools/build_book.py 生成（见该书 README 的 8 步流水线），
本脚本不重复造题，只把它包装成单品教辅统一的成书格式，并做合规复核。
"""
import json
import os
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'product', 'shici_book.json')
OUT = os.path.join(ROOT, 'data', 'product', 'quiz_book.json')
TRAP = os.path.join(ROOT, 'data', 'product', 'trap_variants.json')

BOOK_NAME = '熟词僻义 100 题专项训练册'
BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def question_card(q, answers_map):
    opts = q.get('options', [])[:4]
    ans = answers_map.get(q['id'], {})
    return OrderedDict([
        ('no', q.get('book_no', '')),
        ('stem', q.get('stem', '')),
        ('stem_cn', q.get('stem_cn', '')),
        ('carrier', q.get('carrier', '')),
        ('difficulty', q.get('difficulty', '')),
        ('module', q.get('module', '')),
        ('options', [OrderedDict([('key', o.get('key', '')), ('text', o.get('text', ''))]) for o in opts]),
        ('answer', ans.get('answer', '')),
        ('answer_text', ans.get('answer_text', '')),
        ('sense_text', ans.get('sense_text', '')),
        ('explanation', q.get('explanation', '') or q.get('analysis', '')),
    ])


def main():
    src = load(SRC)
    answers_map = {a['qid']: a for a in src.get('answers', [])}
    stats = src['meta']['stats']

    # 单元下的题补全 book_no（原 units 内嵌题目带 id，需映射全局序号）
    global_no = {q['id']: i + 1 for i, q in enumerate(src['questions'])}
    preview = []
    for q in src['questions'][:5]:
        qc = question_card(dict(q, book_no=global_no.get(q['id'], '')), answers_map)
        preview.append(qc)

    units = []
    for u in src.get('units', []):
        units.append(OrderedDict([
            ('title', u.get('title', '')),
            ('action', u.get('action', '')),
            ('count', len(u.get('questions', []))),
        ]))

    # 高考常考变体词汇层：由 build_trap_variants.py 产出，供详情页/训练反馈展示
    variant_layer = OrderedDict()
    if os.path.exists(TRAP):
        tv = load(TRAP)
        tc = (tv.get('meta') or {}).get('coverage') or {}
        variant_layer = OrderedDict([
            ('source', 'trap_variants.json'),
            ('words', tc.get('total_words', tc.get('words', 0))),
            ('variants_total', tc.get('variants_total', 0)),
            ('types', tc.get('types', [])),
        ])

    # 合规复核：全书例句来源 + 版权声明
    errs = []
    blob = json.dumps(src, ensure_ascii=False)
    for w in BANNED_HARD:
        if w in blob:
            errs.append('宣传禁用词: ' + w)
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs))

    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', src['meta']['subtitle']),
            ('status', '正式卷'),
            ('positioning', src['meta']['positioning']),
            ('promise', src['meta']['promise']),
            ('description', '100 个高考高频词，每个词只考它最容易错的那个义项；每题配一个可执行的考场动作与错因解析。'),
            ('copyright', src['meta']['copyright']),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '10 题档'), ('count', 10), ('price', 1.9)]),
                    OrderedDict([('name', '50 题档'), ('count', 50), ('price', 3.9)]),
                    OrderedDict([('name', '完整版'), ('count', 100), ('price', 4.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('total_questions', stats['questions']),
                ('total_words', stats['words']),
                ('trap_senses', stats['trap_senses']),
                ('units', stats['units']),
                ('difficulty', stats['difficulty']),
                ('carrier', stats['carrier']),
            ])),
            ('variant_layer', variant_layer),
        ])),
        ('units', units),
        ('preview', preview),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 题 / %d 单元 / %d 词' % (BOOK_NAME, stats['questions'], stats['units'], stats['words']))
    print('  合规自检通过：无宣传禁用词')


if __name__ == '__main__':
    main()
