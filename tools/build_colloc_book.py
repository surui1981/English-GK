#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《高考英语高频搭配速记手册》内容装配器

输入: data/batch1/entries.json   100 精修词条（义项级搭配 + 仿真例句 + 考场判断法）
      data/core_freq_curated.json 高频分层表
输出: data/product/colloc_book.json 第二本书的成书数据

设计口径
--------
- 按词组织：一个核心词 = 一组搭配卡，卡内按义项分组，每条搭配带仿真例句。
- 词块整体记忆（教研体系 P4 策略）：搭配不可拆，整块记；命中 E4 固定搭配缺失。
- 搭配类型自动标注（名词词块/系表搭配/介词短语/动词搭配/其他），供试读页分类展示。
- 合规：例句沿用「仿真例句 · …」来源标注；无宣传禁用词；无未限定「真题」。
- 分档：60 组 ¥1.9 / 300 组 ¥3.9 / 全书 ¥4.9 —— 登记规划，当前 100 词样本如实标注。
- 幂等：重复运行产出一致。
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRIES = os.path.join(ROOT, 'data', 'batch1', 'entries.json')
CORE = os.path.join(ROOT, 'data', 'core_freq_curated.json')
OUT = os.path.join(ROOT, 'data', 'product', 'colloc_book.json')

BOOK_NAME = '高考英语高频搭配速记手册'

BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']
PREPS = set('in on at of for with to from by about into over through against '
            'without during before after between among under above below'.split())
ARTS = set('a an the'.split())


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def colloc_type(c):
    """按搭配的语言结构标注类型（用于分类展示，不改变记忆单位）。"""
    first = c.split()[0].lower().strip('.,') if c.split() else ''
    if first in ARTS:
        return '名词词块'
    if first == 'be' or re.match(r"^(be|been|being)\b", c, re.I):
        return '系表搭配'
    if first in PREPS:
        return '介词短语'
    if re.search(r'\b(in|on|at|of|for|with|to|from|by|about|into|over|against|through)\b', c):
        return '动词+介词'
    return '动词搭配'


def check_compliance(words):
    errs = []
    blob = json.dumps(words, ensure_ascii=False)
    for w in BANNED_HARD:
        if w in blob:
            errs.append('宣传禁用词: ' + w)
    for e in words:
        for g in e['groups']:
            for c in g['collocations']:
                if c['example'] and '仿真例句' not in c['source']:
                    errs.append('%s/%s 例句缺仿真标注' % (e['headword'], c['text']))
    texts = [BOOK_NAME]
    for e in words:
        texts.append(e.get('note', ''))
        for g in e['groups']:
            for c in g['collocations']:
                texts.append(c['source'])
                texts.append(c['example_zh'])
    for t in texts:
        if '真题' in t and not any(a in t for a in EXAM_ALLOWED):
            errs.append('未限定「真题」: ' + t[:40])
    return errs


def main():
    entries = load(ENTRIES)
    core = load(CORE)['words']

    words = []
    total_col = 0
    type_count = {}
    for e in entries:
        hw = e['headword']
        c = core.get(hw, {})
        groups = []
        for s in e['senses']:
            cols = []
            for col in s.get('collocations', []):
                ex = s.get('example', {}) or {}
                ct = colloc_type(col)
                type_count[ct] = type_count.get(ct, 0) + 1
                cols.append(OrderedDict([
                    ('text', col),
                    ('type', ct),
                    ('example', ex.get('en', '')),
                    ('example_zh', ex.get('zh', '')),
                    ('source', ex.get('source', '')),
                ]))
                total_col += 1
            if cols:
                groups.append(OrderedDict([
                    ('sense', s.get('text', '')),
                    ('sense_level', s.get('sense_level', '')),
                    ('is_trap', bool(s.get('is_trap'))),
                    ('collocations', cols),
                ]))
        if not groups:
            continue
        words.append(OrderedDict([
            ('headword', hw),
            ('ipa', e.get('ipa', '')),
            ('level', e.get('level', '')),
            ('core_tier', c.get('tier', '')),
            ('note', e.get('notes', '')),
            ('groups', groups),
            ('colloc_count', sum(len(g['collocations']) for g in groups)),
        ]))

    # T1 优先排序
    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words.sort(key=lambda w: (tier_rank.get(w['core_tier'], 9), w['headword']))

    errs = check_compliance(words)
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs[:20]))

    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '一词一组 · 按义项分组 · 词块整体记忆'),
            ('status', '样本卷'),
            ('description', '每个核心词的一组高频搭配，按义项分组，每条搭配配仿真语境例句。搭配不可拆，整块记忆。'),
            ('method', 'P4 词块整体记忆（见教研体系）：看到介词先调出整个词块，命中 E4 固定搭配缺失。'),
            ('copyright', '全部例句为自研仿真写作，标注「仿真例句 · 高考高频句式」；真题原文/选项/解析一律不收录。'),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '10% 试读'), ('groups', 60), ('price', 1.9)]),
                    OrderedDict([('name', '50% 进阶'), ('groups', 300), ('price', 3.9)]),
                    OrderedDict([('name', '完整版'), ('groups', 600), ('price', 4.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('planned_groups', 600),
                ('current_words', len(words)),
                ('current_collocations', total_col),
                ('note', '当前为样本卷，按词组织 %d 词 / %d 条搭配' % (len(words), total_col)),
            ])),
            ('type_distribution', OrderedDict(sorted(type_count.items(), key=lambda x: -x[1]))),
        ])),
        ('words', words),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 词 / %d 条搭配' % (BOOK_NAME, len(words), total_col))
    print('  类型分布:', dict(sorted(type_count.items(), key=lambda x: -x[1])))
    print('  合规自检通过：无宣传禁用词、无未限定「真题」、例句均标仿真来源')


if __name__ == '__main__':
    main()
