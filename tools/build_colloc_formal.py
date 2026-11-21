#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《高考英语高频搭配速记手册》正式版生成器

输入:
  data/batch1/entries.json          100 精修词条（义项级搭配）
  data/core_freq_curated.json       高频分层表
  data/product/ai_paraphrase.json   必考层 443 词自研释义（提取新增搭配）
  data/product/colloc_examples.json 搭配例句库（手工精修 + 义项语境句）
  data/product/colloc_book.json     旧版（读取 headword 顺序参考，非必须）
输出:
  data/product/colloc_book.json     正式版成书数据

正式版改进
----------
1. 词表 100 → 443（100 精修 + 343 必考非精修），规模达到定价完整版。
2. 每条搭配挂独立例句（手工精修 616 条）或明确标注的义项语境句，
   消除旧版「同义项 4 条搭配共用一句」的 100% 复用缺陷。
3. 定价口径统一为「按词分档」：60/300/443 词（原 60/300/600 组口径混乱）。
4. status 升为正式版；coverage 如实标注例句来源分布。
5. 合规：仿真来源标注、无宣传禁用词、无未限定「真题」。
"""
import json
import os
import re
from collections import OrderedDict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
ENTRIES = P('data', 'batch1', 'entries.json')
CORE = P('data', 'core_freq_curated.json')
PARA = P('data', 'product', 'ai_paraphrase.json')
EXAMPLES = P('data', 'product', 'colloc_examples.json')
OUT = P('data', 'product', 'colloc_book.json')

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
    first = c.split()[0].lower().strip('.,') if c.split() else ''
    if first in ARTS:
        return '名词词块'
    if re.match(r"^(be|been|being)\b", c, re.I) or c.startswith('be '):
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


def make_col(text, ex, ctype_count):
    ct = colloc_type(text)
    ctype_count[ct] = ctype_count.get(ct, 0) + 1
    ex = ex or {}
    return OrderedDict([
        ('text', text),
        ('type', ct),
        ('example', ex.get('en', '')),
        ('example_zh', ex.get('zh', '')),
        ('source', ex.get('src', '')),
        ('example_method', ex.get('method', '无例句')),
    ])


def main():
    entries = load(ENTRIES)
    core = load(CORE)['words']
    para = load(PARA)
    examples = load(EXAMPLES)
    para_map = {w['w']: w for w in para['words']}
    deep = {e['headword'] for e in entries}

    words = []
    total_col = 0
    ctype_count = Counter()
    method_count = Counter()

    # ---- 100 精修词 ----
    for e in entries:
        hw = e['headword']
        c = core.get(hw, {})
        groups = []
        for s in e['senses']:
            cols = []
            for col in s.get('collocations', []):
                col_ex = examples.get(col, {})
                method_count[col_ex.get('method', '无例句')] += 1
                cols.append(make_col(col, col_ex, ctype_count))
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
            ('headword', hw), ('ipa', e.get('ipa', '')), ('level', e.get('level', '')),
            ('core_tier', c.get('tier', '')), ('note', e.get('notes', '')),
            ('groups', groups),
            ('colloc_count', sum(len(g['collocations']) for g in groups)),
            ('layer', 'L1-精修词条'),
        ]))

    # ---- 343 必考非精修词 ----
    for w in para['words']:
        hw = w['w']
        if hw in deep:
            continue
        groups = []
        for s in w['senses']:
            cols = []
            for part in re.split(r'[,，]', s.get('collocation', '')):
                text = part.strip()
                if not text:
                    continue
                col_ex = examples.get(text, {})
                method_count[col_ex.get('method', '无例句')] += 1
                cols.append(make_col(text, col_ex, ctype_count))
                total_col += 1
            if cols:
                groups.append(OrderedDict([
                    ('sense', s['meaning']),
                    ('sense_level', ''),
                    ('is_trap', False),
                    ('collocations', cols),
                ]))
        if not groups:
            continue
        words.append(OrderedDict([
            ('headword', hw), ('ipa', ''), ('level', 'T1'),
            ('core_tier', 'required'), ('note', ''),
            ('groups', groups),
            ('colloc_count', sum(len(g['collocations']) for g in groups)),
            ('layer', 'L2-自研释义词条'),
        ]))

    # T1 优先排序
    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words.sort(key=lambda w: (tier_rank.get(w['core_tier'], 9), w['headword']))

    errs = check_compliance(words)
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs[:20]))

    n_words = len(words)
    n_groups = sum(len(w['groups']) for w in words)
    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '一词一组 · 按义项分组 · 词块整体记忆'),
            ('status', '正式版'),
            ('description', '443 个高考核心词，按义项分组收录高频搭配；核心搭配配独立仿真例句，词块整体记忆。'),
            ('method', 'P4 词块整体记忆：看到介词先调出整个词块，命中 E4 固定搭配缺失。'),
            ('copyright', '核心搭配例句为逐条自研仿真写作并标注来源；其余沿用义项语境句并如实标注，不收录真题原文/选项/解析。'),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '10% 试读'), ('words', 60), ('price', 1.9)]),
                    OrderedDict([('name', '50% 进阶'), ('words', 300), ('price', 3.9)]),
                    OrderedDict([('name', '完整版'), ('words', n_words), ('price', 4.9)]),
                ]),
                ('currency', 'CNY'),
                ('unit', '按词分档'),
            ])),
            ('coverage', OrderedDict([
                ('planned_words', n_words),
                ('current_words', n_words),
                ('current_groups', n_groups),
                ('current_collocations', total_col),
                ('examples_by_method', dict(method_count)),
                ('note', '核心搭配配独立仿真例句（手工精修）；其余为义项语境句或无例句，均已逐条标注。'),
            ])),
            ('type_distribution', OrderedDict(sorted(ctype_count.items(), key=lambda x: -x[1]))),
        ])),
        ('words', words),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》正式版：%d 词 / %d 义项组 / %d 条搭配' % (BOOK_NAME, n_words, n_groups, total_col))
    print('  例句来源:', dict(method_count))
    print('  类型分布:', dict(sorted(ctype_count.items(), key=lambda x: -x[1])))
    print('  合规自检通过')


if __name__ == '__main__':
    main()
