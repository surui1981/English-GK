#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《高考英语核心词 · 仿真语境版》内容装配器

输入: data/batch1/entries.json       100 精修词条（义项级仿真语境 + 搭配 + 考场判断法）
      data/core_freq_curated.json    高频分层表（tier / trap_strength / core / trap）
输出: data/product/context_book.json 第一本书的成书数据（当前 100 词样本）

设计口径
--------
- 一词一卡：词头 + 音标 + 3 个高频义项；每个义项配一句仿真语境句 + 搭配。
- 义项挑选：陷阱义(is_trap)优先，其次按 S 层级 S2>S3>S1>S4，保证「考的就是会错的」。
- 合规铁律（见 README「版权与合规红线」）：
    * 全部例句沿用精修词条的「仿真例句 · …」来源标注，绝不引入真题原文。
    * 书名/文案不出现未限定的「真题」二字，规避 scan_pdf_quality 的 G 项门禁。
    * 无宣传禁用词（提分/保过/押题/押中/必胜）。
- 分档：150 词 ¥1.9 / 750 词 ¥3.9 / 全书 1500 词 ¥4.9 —— 元数据登记规划，
  当前产出 100 词样本（第一档未填满，如实标注，不虚报覆盖量）。
- 幂等：重复运行产出一致，不追加、不改写源数据。
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRIES = os.path.join(ROOT, 'data', 'batch1', 'entries.json')
CORE = os.path.join(ROOT, 'data', 'core_freq_curated.json')
OUT = os.path.join(ROOT, 'data', 'product', 'context_book.json')

BOOK_NAME = '高考英语核心词 · 仿真语境版'
SENSES_PER_WORD = 3

# 合规扫描：与 scan_pdf_quality.py 的 BANNED_HARD 对齐
BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
# 未限定的「真题」：只放行白名单短语
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def pick_senses(senses, n=SENSES_PER_WORD):
    """挑 n 个高频义项：陷阱义优先，其次按 S 层级排序，保序去重。"""
    rank = {'S2': 0, 'S3': 1, 'S1': 2, 'S4': 3}
    def key(s):
        trap = 0 if s.get('is_trap') else 1
        lvl = rank.get(s.get('sense_level'), 9)
        return (trap, lvl)
    ordered = sorted(senses, key=key)
    return ordered[:n]


def sense_card(s):
    ex = s.get('example', {}) or {}
    return OrderedDict([
        ('text', s.get('text', '')),
        ('sense_level', s.get('sense_level', '')),
        ('is_trap', bool(s.get('is_trap'))),
        ('error_mech', s.get('error_mech', [])),
        ('example', ex.get('en', '')),
        ('example_zh', ex.get('zh', '')),
        ('source', ex.get('source', '')),
        ('carrier', ex.get('carrier', '')),
        ('collocations', s.get('collocations', [])[:4]),
    ])


def check_compliance(words):
    """合规自检：返回错误列表，非空则中止产出。"""
    errs = []
    blob = json.dumps(words, ensure_ascii=False)
    for w in BANNED_HARD:
        if w in blob:
            errs.append('宣传禁用词: ' + w)
    # 例句必须带仿真来源标注
    for e in words:
        for s in e['senses']:
            if s['example'] and '仿真例句' not in s['source']:
                errs.append('%s/%s 例句缺仿真来源标注' % (e['headword'], s['text']))
    # 未限定「真题」扫描（对书名 + 所有中文释义/说明文本）
    texts = [BOOK_NAME]
    for e in words:
        texts.append(e.get('note', ''))
        for s in e['senses']:
            texts.append(s['source'])
            texts.append(s['example_zh'])
    for t in texts:
        if '真题' in t and not any(a in t for a in EXAM_ALLOWED):
            errs.append('未限定「真题」: ' + t[:40])
    return errs


def main():
    entries = load(ENTRIES)
    core = load(CORE)['words']

    words = []
    for e in entries:
        hw = e['headword']
        c = core.get(hw, {})
        senses = pick_senses(e['senses'])
        words.append(OrderedDict([
            ('headword', hw),
            ('ipa', e.get('ipa', '')),
            ('level', e.get('level', '')),
            ('core_tier', c.get('tier', '')),
            ('trap_focus', c.get('trap', '')),
            ('core_meaning', c.get('core', '')),
            ('note', e.get('notes', '')),
            ('senses', [sense_card(s) for s in senses]),
        ]))

    # 按 tier（T1 优先）+ 陷阱强度排序，核心竞争力词条靠前
    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words.sort(key=lambda w: (tier_rank.get(w['core_tier'], 9), w['headword']))

    errs = check_compliance(words)
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs[:20]))

    n_total = len(words)
    n_senses = sum(len(w['senses']) for w in words)
    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '一词三义 · 仿真语境 · 高考高频句式'),
            ('status', '样本卷'),
            ('description', '每个核心词配 3 个高频义项，每义项一句仿真语境例句与真实搭配。全部例句为仿真写作，非真题原文。'),
            ('source_basis', '高考高频复现频次（人工判定）+ 自建义项树 + 仿真语境句'),
            ('copyright', '全部释义与例句为自研改写；例句标注「仿真例句 · 高考阅读高频句式」。真题原文/选项/解析一律不收录。'),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '10% 试读'), ('words', 150), ('price', 1.9)]),
                    OrderedDict([('name', '50% 进阶'), ('words', 750), ('price', 3.9)]),
                    OrderedDict([('name', '完整版'), ('words', 1500), ('price', 4.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('planned_total', 1500),
                ('current_words', n_total),
                ('current_senses', n_senses),
                ('note', n_total < 1500 and '当前为第一档样本卷，覆盖量未达完整版，交付时须如实标注' or ''),
            ])),
        ])),
        ('words', words),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 词 / %d 义项' % (BOOK_NAME, n_total, n_senses))
    print('  合规自检通过：无宣传禁用词、无未限定「真题」、例句均标仿真来源')
    tiers = {}
    for w in words:
        tiers[w['core_tier']] = tiers.get(w['core_tier'], 0) + 1
    print('  分层:', dict(sorted(tiers.items())))


if __name__ == '__main__':
    main()
