#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《熟词僻义 100 题专项训练册》成书装配器

输入: data/product/trap_variants.json   featured 100 题（与 App 答题引擎同源）
      data/product/shici_book.json      单元标题与考场动作（沿用教研编排）
输出: data/product/quiz_book.json       详情页 / 试读页 / 完整题库

改动说明：旧版从 shici_book 取 5 道预览题，与 App 实际作答的 100 题不同源，
用户「试读的题」和「点进去做的题」对不上。本版统一以 trap_variants.featured
为唯一题库，并把 100 题全部写入成书数据，详情页可逐题展示解析。
"""
import json
import os
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
TRAP = P('data', 'product', 'trap_variants.json')
SRC = P('data', 'product', 'shici_book.json')
OUT = P('data', 'product', 'quiz_book.json')

BOOK_NAME = '熟词僻义 100 题专项训练册'
BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']
LETTERS = 'ABCD'


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def question_card(x, no):
    q = x.get('question') or {}
    opts = q.get('options') or []
    ai = q.get('answer_index', 0)
    return OrderedDict([
        ('no', no),
        ('stem', q.get('stem', '')),
        ('stem_cn', q.get('stem_cn', '')),
        ('carrier', q.get('carrier', x.get('source_basis', ''))),
        ('difficulty', q.get('difficulty', 'mid')),
        ('module', q.get('module', 'E1_熟词僻义')),
        ('options', [OrderedDict([('key', LETTERS[i]), ('text', str(t))])
                     for i, t in enumerate(opts[:4])]),
        ('answer', LETTERS[ai] if 0 <= ai < 4 else ''),
        ('answer_text', q.get('answer_text', opts[ai] if 0 <= ai < len(opts) else '')),
        ('sense_text', x.get('sense_text', '')),
        ('sense_level', x.get('sense_level', '')),
        ('headword', x.get('headword', '')),
        ('errCode', q.get('errCode', 'E1')),
        ('source', q.get('source', '')),
        ('explanation', q.get('explanation', '')),
        ('variants', x.get('variants', [])[:6]),
        ('common_senses', x.get('common_senses', [])),
    ])


def main():
    tv = load(TRAP)
    src = load(SRC)
    featured = [x for x in tv['words'] if x.get('featured') is not False]
    if len(featured) != 100:
        raise SystemExit('featured 题量异常：%d（应为 100）' % len(featured))

    questions = [question_card(x, i + 1) for i, x in enumerate(featured)]
    units_src = src.get('units', []) or []
    titles = [u.get('title', '单元%d' % (i + 1)) for i, u in enumerate(units_src[:5])]
    actions = [u.get('action', '') for i, u in enumerate(units_src[:5])]
    while len(titles) < 5:
        titles.append('单元%d · 熟词僻义判断' % (len(titles) + 1))
        actions.append('先看搭配，再定义项，最后套入语境验证。')

    units = []
    for i in range(5):
        chunk = questions[i * 20:(i + 1) * 20]
        units.append(OrderedDict([
            ('title', titles[i]),
            ('action', actions[i]),
            ('count', len(chunk)),
            ('questions', chunk),
        ]))

    variant_layer = OrderedDict([
        ('source', 'trap_variants.json'),
        ('words', (tv.get('meta', {}).get('coverage') or {}).get('total_words', len(tv['words']))),
        ('variants_total', (tv.get('meta', {}).get('coverage') or {}).get('variants_total', 0)),
        ('types', (tv.get('meta', {}).get('coverage') or {}).get('types', [])),
    ])

    errs = []
    blob = json.dumps(questions, ensure_ascii=False)
    for w in BANNED_HARD:
        if w in blob:
            errs.append('宣传禁用词: ' + w)
    for q in questions:
        if not q['stem'] or not q['explanation'] or not q['options']:
            errs.append('第 %d 题字段缺失' % q['no'])
        if q['answer'] and not any(o['key'] == q['answer'] for o in q['options']):
            errs.append('第 %d 题答案与选项不一致' % q['no'])
        if q['stem'] and '真题' in q['stem'] and not any(a in q['stem'] for a in EXAM_ALLOWED):
            errs.append('第 %d 题未限定真题' % q['no'])
    if errs:
        raise SystemExit('自检未通过：\n  ' + '\n  '.join(errs[:20]))

    diff = Counter(q['difficulty'] for q in questions)
    carrier = Counter(q['carrier'] for q in questions)
    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', src['meta'].get('subtitle', '100 个高考高频词 · 每个词一个最容易错的义项')),
            ('status', '正式卷'),
            ('positioning', src['meta'].get('positioning', '不是词表，是定位器')),
            ('promise', src['meta'].get('promise', '100 题覆盖 100 个高频词的陷阱义')),
            ('description', '100 个高考高频词，每个词只考它最容易错的那个义项；试读题与答题引擎同源，每题配可执行考场动作与错因解析。'),
            ('copyright', src['meta'].get('copyright', {})),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '完整版'), ('count', len(questions)), ('price', 2.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('total_questions', len(questions)),
                ('total_words', len(set(q['headword'] for q in questions))),
                ('trap_senses', len(set(q['sense_text'] for q in questions))),
                ('s1_senses', sum(1 for q in questions if q['sense_level'] == 'S1')),
                ('units', len(units)),
                ('difficulty', dict(diff)),
                ('carrier', dict(carrier)),
                ('note', '题源与 App 训练引擎同为 trap_variants.featured，试读题目即实际可练题目。'),
            ])),
            ('variant_layer', variant_layer),
        ])),
        ('units', units),
        ('questions', questions),
        ('preview', questions[:5]),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 题 / %d 单元 / %d 词' % (BOOK_NAME, len(questions), len(units), book['meta']['coverage']['total_words']))
    print('  难度:', dict(diff), 'S1 义项:', book['meta']['coverage']['s1_senses'])
    print('  题源与 App 引擎同源，自检通过')


if __name__ == '__main__':
    main()
