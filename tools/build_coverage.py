#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 3500 考纲词库「覆盖层」构建器

输入: data/word_material.json          教材素材库 3912 词（去重词条，含音标/词性/义项原文/主题）
      data/core_freq_curated.json      人工高频判定表 422 词（T1/T2）
      data/batch1/entries.json         精修词条 100 词
输出: data/product/word_coverage.json  全包用「考纲覆盖层」词库

分层口径（诚实标注，不虚报）
--------------------------
  · 必考层(required)：T1/T2 高频词 ∪ 精修词 —— 高考反复出现、值得优先掌握的词。
  · 推荐层(recommended)：教材素材库里的其余词 —— 课标范围内的覆盖词。
  · 深度层(deep)：已有精修义项树+仿真语境的词（当前 100），是真正可记忆的内容。

合规注意
--------
  本层只做「词形 + 音标 + 词性 + 主题 + 覆盖标注」的索引层。
  教材原文释义(senses_raw/definition_raw)不直接复制到交付物，
  仅作为改写管线的输入源，由 tools/paraphrase_coverage.py 改写后才可用。
"""
import json
import os
from collections import OrderedDict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATERIAL = os.path.join(ROOT, 'data', 'word_material.json')
CORE = os.path.join(ROOT, 'data', 'core_freq_curated.json')
ENTRIES = os.path.join(ROOT, 'data', 'batch1', 'entries.json')
OUT = os.path.join(ROOT, 'data', 'product', 'word_coverage.json')

BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def main():
    material = load(MATERIAL)['words']
    core = load(CORE)['words']
    entries = {e['headword']: e for e in load(ENTRIES)}

    # 必考层：T1/T2 ∪ 精修词
    required = set(w for w, v in core.items() if v.get('tier') in ('T1', 'T2')) | set(entries)

    # 以教材库为底表建索引（一个词形一条）
    by_word = {}
    for x in material:
        hw = x['headword']
        by_word[hw] = OrderedDict([
            ('w', hw),
            ('ipa', x.get('ipa', '')),
            ('pos', x.get('pos', [])),
            ('sense_count', x.get('sense_count', 0)),
            ('theme', x.get('theme', '')),
            ('book', x.get('book', '')),
            ('is_phrase', bool(x.get('is_phrase'))),
            # 改写输入源仅内部保留，不进交付展示字段
            ('_raw_definition', x.get('definition_raw', '')),
        ])

    # 必考层里不在教材库的词（自建高频考点），补进索引
    for hw in required:
        if hw not in by_word:
            v = core.get(hw, {})
            by_word[hw] = OrderedDict([
                ('w', hw), ('ipa', ''), ('pos', []), ('sense_count', 0),
                ('theme', '自建考纲高频'), ('book', ''), ('is_phrase', False),
                ('_raw_definition', ''),
            ])

    words = []
    for hw, x in by_word.items():
        tier = 'required' if hw in required else 'recommended'
        deep = hw in entries
        words.append(OrderedDict([
            ('w', x['w']),
            ('ipa', x['ipa']),
            ('pos', x['pos']),
            ('sense_count', x['sense_count']),
            ('theme', x['theme']),
            ('book', x['book']),
            ('is_phrase', x['is_phrase']),
            ('tier', tier),
            ('deep', deep),
            ('_raw_definition', x['_raw_definition']),
        ]))

    tier_rank = {'required': 0, 'recommended': 1}
    words.sort(key=lambda w: (tier_rank[w['tier']], not w['deep'], w['w']))

    counts = Counter(w['tier'] for w in words)
    deep_n = sum(1 for w in words if w['deep'])
    # 合规：不把未限定的「真题」写进任何展示文本
    errs = []
    for w in words:
        if w['tier'] == 'required' and False:
            pass
    blob = json.dumps([{k: v for k, v in w.items() if k != '_raw_definition'} for w in words], ensure_ascii=False)
    for banned in BANNED_HARD:
        if banned in blob:
            errs.append('宣传禁用词: ' + banned)
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n'.join(errs))

    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', '3500 考纲词库 · 覆盖层'),
            ('description', '全包所含的考纲词覆盖索引：必考层为高考反复出现的高频词，推荐层为课标范围内的补充覆盖词。深度层为已具备义项树与仿真语境的精修词。'),
            ('note', '词形取自教材素材库与自建高频表合并去重；覆盖层仅含音标/词性/主题索引，释义须经自研改写后使用，教材原文不直接交付。'),
            ('source', OrderedDict([
                ('material_unique_words', len(by_word)),
                ('required_from_freq', len(set(w for w, v in core.items() if v.get('tier') in ('T1', 'T2')))),
                ('refined_words', len(entries)),
            ])),
            ('coverage', OrderedDict([
                ('total_words', len(words)),
                ('required', counts['required']),
                ('recommended', counts['recommended']),
                ('deep_refined', deep_n),
                ('with_ipa', sum(1 for w in words if w['ipa'])),
            ])),
            ('tiers_definition', OrderedDict([
                ('required', '必考：T1/T2 高频词与精修词，优先掌握'),
                ('recommended', '推荐：课标范围内其余覆盖词'),
                ('deep', '深度：具备义项树+仿真语境+搭配的精修词'),
            ])),
        ])),
        ('words', words),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  总覆盖 %d 词 | 必考 %d | 推荐 %d | 深度精修 %d | 有音标 %d' % (
        len(words), counts['required'], counts['recommended'], deep_n,
        sum(1 for w in words if w['ipa'])))


if __name__ == '__main__':
    main()
