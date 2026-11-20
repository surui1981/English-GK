#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 统一单词素材库合并器

输入: data/textbook_lexicon.json  (A1 轨：新课标教材 2019，必修1-3/选必1-4，36 单元)
      data/legacy_lexicon.json    (A2 轨：旧课标教材 2007，必修1-5/选修6-8，40 单元)
输出: data/word_material.json     统一素材库（按词形去重合并，带来源溯源）
      data/stats.json              全库统计（覆盖两来源）

合并规则:
1. **按词形去重**，一个词形一条素材记录，多来源在 `sources` 里并列溯源。
2. **音标互补**：新课标缺音标时用旧课标补，反之亦然；两套都有则保留两者。
3. **义项互补**：`senses_raw` 取两套来源的并集（去重），`sense_count` 取并集后长度——
   同一词的义项数是「高考可考义项总量」的参照上限。
4. **词性互补**：`pos` 取并集。
5. **释义不合并、不外传**：`definition_raw` / `cn_raw` 保留各自原文仅作**改写参照素材**，
   对外释义必须自行改写措辞（版权红线，见 docs/词汇教研体系v1.md §7）。
6. **主轨定位**：A1 轨（有新课标教材锚点）是主题包骨架，优先作为主记录；
   仅 A2 轨的词以旧课标为唯一锚点。
7. `tier` / `sense_levels` / `error_mechs` / `is_trap` / `collocations` / `example`
   仍为教研人工标注位，合并产物保持为空。
"""
import json
import os
import re
from collections import OrderedDict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip().lower())


POS_PREFIX = re.compile(
    r'^(vt|vi|n|adj|adv|prep|conj|pron|art|num|int|art|aux|modal|abbr)\s*[.．]\s*',
    re.I)


def sense_key(s):
    """义项去重键：剥掉词性前缀后的释义文本。

    两套来源对同一义项的写法常差一个词性标记（A1 'vt.交换' vs A2 '交换'），
    直接按原文比对会把同一义项算成两个，导致 sense_count 虚高。
    """
    return re.sub(r'\s+', '', POS_PREFIX.sub('', (s or '').strip().lower()))


def load(name):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        raise SystemExit(f'缺少输入文件: {name}，请先运行对应的转换器')
    return json.load(open(p, encoding='utf-8'))


def src_view(w, sid):
    return OrderedDict([
        ('source_id', sid),
        ('book', w.get('book', '')),
        ('unit', w.get('unit', '')),
        ('unit_id', w.get('unit_id', '')),
        ('unit_title', w.get('unit_title', '')),
        ('theme', w.get('theme', '')),
        ('theme_tags', w.get('theme_tags', [])),
        ('sense_count', w.get('sense_count', 0)),
        ('senses_raw', w.get('senses_raw', [])),
        ('definition_raw', w.get('definition_raw', '')),
        ('ipa', w.get('ipa', '')),
        ('pos', w.get('pos', [])),
        ('culture_marked', bool(w.get('culture_marked', False))),
    ])


def main():
    a1 = load('textbook_lexicon.json')
    a2 = load('legacy_lexicon.json')
    print(f"A1 轨(2019 新课标) {len(a1['words'])} 条；A2 轨(2007 旧课标) {len(a2['words'])} 条")

    idx = OrderedDict()   # norm headword -> record
    for sid, lex in (('tb2019', a1), ('tb2007', a2)):
        for w in lex['words']:
            k = norm(w['headword'])
            if not k:
                continue
            rec = idx.get(k)
            if rec is None:
                rec = OrderedDict([
                    ('id', w['id']),
                    ('headword', w['headword']),
                    ('ipa', w.get('ipa', '')),
                    ('ipa_by_source', OrderedDict()),
                    ('pos', list(w.get('pos', []))),
                    ('pos_by_source', OrderedDict()),
                    ('sense_count', 0),
                    ('sense_count_by_source', OrderedDict()),
                    ('senses_raw', []),
                    ('senses_by_source', OrderedDict()),
                    ('definition_raw', w.get('definition_raw', '')),
                    ('cn_raw', w.get('cn_raw', w.get('definition_raw', ''))),
                    ('book', w.get('book', '')),
                    ('unit', w.get('unit', '')),
                    ('unit_id', w.get('unit_id', '')),
                    ('unit_title', w.get('unit_title', '')),
                    ('theme', w.get('theme', '')),
                    ('theme_tags', list(w.get('theme_tags', []))),
                    ('is_phrase', bool(w.get('is_phrase', False))),
                    ('entry_type', w.get('entry_type', 'word')),
                    ('culture_marked', bool(w.get('culture_marked', False))),
                    ('source_ids', []),
                    ('sources', []),
                    ('in_tb2019', False),
                    ('in_tb2007', False),
                    ('source', ''),
                    # ── 教研人工标注位（合并产物保持为空）──
                    ('tier', None),
                    ('sense_levels', None),
                    ('error_mechs', []),
                    ('is_trap', None),
                    ('collocations', []),
                    ('example', None),
                    ('quiz_ids', []),
                ])
                idx[k] = rec
            # 合并
            if sid not in rec['source_ids']:
                rec['source_ids'].append(sid)
                rec['sources'].append(src_view(w, sid))
            if sid == 'tb2019':
                rec['in_tb2019'] = True
            else:
                rec['in_tb2007'] = True
            if w.get('ipa'):
                rec['ipa_by_source'][sid] = w['ipa']
                if not rec['ipa']:
                    rec['ipa'] = w['ipa']
            if w.get('pos'):
                rec['pos_by_source'][sid] = w['pos']
                for p in w['pos']:
                    if p not in rec['pos']:
                        rec['pos'].append(p)
            if w.get('senses_raw'):
                rec['senses_by_source'][sid] = w['senses_raw']
                rec['sense_count_by_source'][sid] = len(w['senses_raw'])
                have = set(sense_key(x) for x in rec['senses_raw'])
                for s in w['senses_raw']:
                    if sense_key(s) not in have:
                        have.add(sense_key(s))
                        rec['senses_raw'].append(s)
            rec['culture_marked'] = rec['culture_marked'] or bool(w.get('culture_marked', False))
            rec['is_phrase'] = rec['is_phrase'] or bool(w.get('is_phrase', False))
            if w.get('entry_type') == 'phrase':
                rec['entry_type'] = 'phrase'

    words = []
    src_names = {'tb2019': '新人教版(2019)必修1-3/选择性必修1-4 单元词表',
                 'tb2007': '人教版旧课标(2007)必修1-5/选修6-8 单元词表'}
    for rec in idx.values():
        rec['sense_count'] = len(rec['senses_raw'])
        rec['source'] = ' + '.join(src_names[s] for s in rec['source_ids'])
        words.append(rec)

    only_a2 = [w for w in words if not w['in_tb2019']]
    both = [w for w in words if w['in_tb2019'] and w['in_tb2007']]

    # 音标互补实测：仅双来源词可能出现互补
    ipa_filled_total = 0
    ipa_filled_from_2019 = 0   # 2019 有、2007 缺 → 用 2019 补 2007
    ipa_filled_from_2007 = 0   # 2007 有、2019 缺 → 用 2007 补 2019
    ipa_both_sources = 0
    ipa_gap_both = 0
    for w in words:
        if len(w['source_ids']) != 2:
            continue
        ipa_both_sources += 1
        a = w['sources'][0]['ipa']   # tb2019
        b = w['sources'][1]['ipa']   # tb2007
        if bool(a) != bool(b):
            ipa_gap_both += 1
            ipa_filled_total += 1
            if a:
                ipa_filled_from_2019 += 1
            else:
                ipa_filled_from_2007 += 1

    material = OrderedDict([
        ('_meta', OrderedDict([
            ('version', '2.0'),
            ('name', '拾词 · 统一单词素材库'),
            ('generated_from', ['data/textbook_lexicon.json', 'data/legacy_lexicon.json']),
            ('sources', [
                OrderedDict([
                    ('id', 'tb2019'),
                    ('name', '新人教版(2019) 必修1-3 / 选择性必修1-4'),
                    ('type', 'textbook'),
                    ('role', 'A1 轨 · 教学底座 · 36 主题包骨架'),
                    ('units', a1['_meta'].get('unit_count', 0)),
                    ('entries', len(a1['words'])),
                ]),
                OrderedDict([
                    ('id', 'tb2007'),
                    ('name', '人教版旧课标(2007) 必修1-5 / 选修6-8'),
                    ('type', 'textbook'),
                    ('role', 'A2 轨 · 考试底座补充 · 课标已退役，仅作词库覆盖与释义参照'),
                    ('units', a2['_meta'].get('unit_count', 0)),
                    ('entries', len(a2['words'])),
                ]),
            ]),
            ('word_count', len(words)),
            ('note', '素材库是「已采集的词条集合」，不是高考词库。高考高频分层(tier)须按真题复现频次另行人工判定，见 data/core_freq_curated.json。'),
            ('copyright_note', '两套来源均为公开教学资料。释义为教材编写组表述，商业使用需自行改写措辞，不可直接照搬；单词拼写、音标、词性属事实性信息，可直接使用。'),
            ('annotation_status', '合并产物。tier / sense_levels / error_mechs / is_trap / collocations / example 六项教研字段待人工标注。'),
        ])),
        ('words', words),
    ])

    with open(os.path.join(DATA, 'word_material.json'), 'w', encoding='utf-8') as f:
        json.dump(material, f, ensure_ascii=False, indent=1)

    # 统计
    stats = OrderedDict([
        ('material_word_count', len(words)),
        ('source_tb2019_entries', len(a1['words'])),
        ('source_tb2007_entries', len(a2['words'])),
        ('in_both_sources', len(both)),
        ('only_tb2019', len(words) - len(both) - len(only_a2)),
        ('only_tb2007', len(only_a2)),
        ('new_from_tb2007', len(only_a2)),
        ('phrase_count', sum(1 for w in words if w['is_phrase'])),
        ('single_word_count', sum(1 for w in words if not w['is_phrase'])),
        ('total_senses', sum(w['sense_count'] for w in words)),
        ('multi_sense_ge3', sum(1 for w in words if w['sense_count'] >= 3)),
        ('multi_sense_ge4', sum(1 for w in words if w['sense_count'] >= 4)),
        ('no_ipa', sum(1 for w in words if not w['ipa'])),
        ('ipa_both_source_words', ipa_both_sources),
        ('ipa_gap_in_both_sources', ipa_gap_both),
        ('ipa_filled_by_other_source', ipa_filled_total),
        ('ipa_filled_from_2019', ipa_filled_from_2019),
        ('ipa_filled_from_2007', ipa_filled_from_2007),
        ('culture_marked', sum(1 for w in words if w['culture_marked'])),
        ('sense_count_dist', dict(sorted(Counter(w['sense_count'] for w in words).items()))),
        ('sense_count_dist_tb2019_only', dict(sorted(Counter(
            w['sense_count_by_source'].get('tb2019', 0) for w in words
            if w['in_tb2019'] and not w['in_tb2007']).items()))),
        ('sense_count_dist_tb2007_only', dict(sorted(Counter(
            w['sense_count_by_source'].get('tb2007', 0) for w in words
            if w['in_tb2007'] and not w['in_tb2019']).items()))),
        ('by_book_2019', dict(Counter(w['book'] for w in a1['words']))),
        ('by_book_2007', dict(Counter(w['book'] for w in a2['words']))),
        ('unit_count_total', a1['_meta'].get('unit_count', 0) + a2['_meta'].get('unit_count', 0)),
    ])

    with open(os.path.join(DATA, 'stats.json'), 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=1)

    print(f"\n统一素材库 {len(words)} 词条")
    print(f"  两套来源都有 {len(both)} | 仅 2019 新课标 {stats['only_tb2019']} | 仅 2007 旧课标 {len(only_a2)}")
    print(f"  单词 {stats['single_word_count']} / 短语 {stats['phrase_count']} | 义项总数 {stats['total_senses']}")
    print(f"  多义(≥3) {stats['multi_sense_ge3']} | 缺音标 {stats['no_ipa']} | 由另一来源补齐音标 {stats['ipa_filled_by_other_source']}")
    print(f"  输出: data/word_material.json, data/stats.json")


if __name__ == '__main__':
    main()
