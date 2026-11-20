#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 「教材词表单元截断」假说检验

问题：两套教材词表里，同一个词的释义是否完整？

若教材词表是「完整词条」，则同一词在两套表中的义项集合应高度重合；
若是「单元语境义项」（只记该单元用到的那个义），则
  (a) 义项数会显著偏少，
  (b) 一套表的义项集合会明显是另一套的子集/超集（而非互有出入），
  (c) 词表里会出现「只给一个罕见义项、缺最高频义项」的条目。

输出: data/textbook_fragment_analysis.json
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
    r'^(vt|vi|n|adj|adv|prep|conj|pron|art|num|int|aux|modal|abbr)\s*[.．]\s*', re.I)


def key(s):
    return re.sub(r'\s+', '', POS_PREFIX.sub('', (s or '').strip().lower()))


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def main():
    a1 = {norm(w['headword']): w for w in load('textbook_lexicon.json')['words']}
    a2 = {norm(w['headword']): w for w in load('legacy_lexicon.json')['words']}
    both = sorted(set(a1) & set(a2))

    rep = OrderedDict()
    rep['_meta'] = OrderedDict([
        ('generated_by', 'tools/analyze_textbook_fragment.py'),
        ('hypothesis', '教材词表记录的是「该单元用到的义项」，而非完整词条'),
    ])

    # ── (a) 义项数对比 ──
    s1 = [a1[k]['sense_count'] for k in both]
    s2 = [a2[k]['sense_count'] for k in both]
    fewer = sum(1 for x, y in zip(s1, s2) if y < x)
    more = sum(1 for x, y in zip(s1, s2) if y > x)
    same = len(both) - fewer - more
    rep['a_sense_count'] = OrderedDict([
        ('both_source_words', len(both)),
        ('tb2019_mean_senses', round(sum(s1) / len(s1), 2)),
        ('tb2007_mean_senses', round(sum(s2) / len(s2), 2)),
        ('tb2007_fewer_than_2019', fewer),
        ('tb2007_more_than_2019', more),
        ('equal', same),
        ('tb2007_fewer_ratio', round(100 * fewer / len(both), 1)),
    ])

    # ── (b) 集合关系：子集 / 超集 / 互有出入 ──
    sub = sup = other = 0
    disjoint = 0
    jacc = []
    for k in both:
        k1 = set(key(x) for x in a1[k]['senses_raw'])
        k2 = set(key(x) for x in a2[k]['senses_raw'])
        if not k1 or not k2:
            continue
        if k2 <= k1:
            sub += 1
        elif k1 <= k2:
            sup += 1
        else:
            other += 1
        if not (k1 & k2):
            disjoint += 1
        jacc.append(len(k1 & k2) / len(k1 | k2))
    n = sub + sup + other
    rep['b_set_relation'] = OrderedDict([
        ('compared', n),
        ('tb2007_subset_of_2019', sub),
        ('tb2019_subset_of_2007', sup),
        ('neither_contains_other', other),
        ('completely_disjoint', disjoint),
        ('subset_ratio', round(100 * (sub + sup) / n, 1)),
        ('mean_jaccard', round(sum(jacc) / len(jacc), 3)),
    ])

    # ── (c) 只给罕见义项、缺最高频义项的条目 ──
    # 用人工频次表给出的 core（核心义）反查教材释义是否包含它
    curated = {}
    for fn in ('core_freq_curated.json', 'core_freq_curated_ext.json'):
        for kw, v in load(fn)['words'].items():
            curated[norm(kw)] = v

    hit_2019 = hit_2007 = neither = 0
    missing_core_2019 = []
    missing_core_2007 = []
    for kw, v in curated.items():
        if kw not in a1 and kw not in a2:
            continue
        core = (v.get('core') or '').strip()
        if not core:
            continue
        # 核心义按「子串包含」判定：教材写「充值」而人工写「收费」这类措辞差异算命中，
        # 严格等值会低估覆盖。词性前缀在两侧都剥掉。
        ckeys = set()
        for x in re.split(r'[；;，,、]', core):
            kx = key(x)
            if kx:
                ckeys.add(kx)
        if not ckeys:
            continue
        k1 = set(key(x) for x in a1[kw]['senses_raw']) if kw in a1 else set()
        k2 = set(key(x) for x in a2[kw]['senses_raw']) if kw in a2 else set()

        def covered(ck, sk):
            for c in ck:
                for t in sk:
                    if not t:
                        continue
                    if c in t or t in c:
                        return True
            return False

        h1 = covered(ckeys, k1)
        h2 = covered(ckeys, k2)
        if h1:
            hit_2019 += 1
        else:
            missing_core_2019.append(kw)
        if h2:
            hit_2007 += 1
        else:
            missing_core_2007.append(kw)
        if not h1 and not h2:
            neither += 1
    total = hit_2019 + len(missing_core_2019)
    rep['c_core_sense_coverage'] = OrderedDict([
        ('words_with_core_defined', total),
        ('tb2019_contains_core', hit_2019),
        ('tb2019_misses_core', len(missing_core_2019)),
        ('tb2007_contains_core', hit_2007),
        ('tb2007_misses_core', len(missing_core_2007)),
        ('tb2007_miss_rate', round(100 * len(missing_core_2007) / total, 1)),
        ('tb2007_miss_examples', missing_core_2007[:30]),
    ])

    # ── (d) 词性覆盖：教材条目给几个词性 ──
    pos1 = Counter(len(a1[k]['pos']) for k in both)
    pos2 = Counter(len(a2[k]['pos']) for k in both)
    rep['d_pos_coverage'] = OrderedDict([
        ('tb2019_pos_count_dist', dict(sorted(pos1.items()))),
        ('tb2007_pos_count_dist', dict(sorted(pos2.items()))),
        ('tb2007_single_pos_ratio', round(
            100 * sum(v for k, v in pos2.items() if k <= 1) / len(both), 1)),
        ('tb2019_single_pos_ratio', round(
            100 * sum(v for k, v in pos1.items() if k <= 1) / len(both), 1)),
    ])

    # ── (e) 单元内重复出现：同词多单元 → 多份语境义项 ──
    unit_hits = Counter()
    for w in load('legacy_lexicon.json')['words']:
        unit_hits[(norm(w['headword']), w['unit_id'])] += 1
    rep['e_legacy_occurrences'] = OrderedDict([
        ('legacy_entries', sum(unit_hits.values())),
        ('distinct_headwords', len({k[0] for k in unit_hits})),
        ('entries_in_multi_unit_words', sum(v for v in unit_hits.values() if v > 1)),
        ('note', '同一词在旧课标不同单元各记一条，条数 > 唯一词形数即为多单元复现'),
    ])

    with open(os.path.join(DATA, 'textbook_fragment_analysis.json'), 'w', encoding='utf-8') as f:
        json.dump(rep, f, ensure_ascii=False, indent=1)

    print('=' * 64)
    print('「教材词表单元截断」假说检验')
    print('=' * 64)
    a = rep['a_sense_count']
    print(f"\n(a) 双来源 {a['both_source_words']} 词："
          f"2019 均 {a['tb2019_mean_senses']} 义 / 2007 均 {a['tb2007_mean_senses']} 义；"
          f"2007 更少占 {a['tb2007_fewer_ratio']}%")
    b = rep['b_set_relation']
    print(f"(b) 集合关系：2007⊂2019 或 2019⊂2007 的占 {b['subset_ratio']}%，"
          f"平均 Jaccard {b['mean_jaccard']}，完全不相交 {b['completely_disjoint']} 词")
    c = rep['c_core_sense_coverage']
    print(f"(c) 教材是否含人工判定的核心义：2019 缺 {c['tb2019_misses_core']} 个，"
          f"2007 缺 {c['tb2007_misses_core']} 个（缺失率 {c['tb2007_miss_rate']}%）")
    d = rep['d_pos_coverage']
    print(f"(d) 只给一个词性的条目占比：2019 {d['tb2019_single_pos_ratio']}% / "
          f"2007 {d['tb2007_single_pos_ratio']}%")
    e = rep['e_legacy_occurrences']
    print(f"(e) 旧课标 {e['legacy_entries']} 条 → 唯一词形 {e['distinct_headwords']} 个")
    print(f"\n输出: data/textbook_fragment_analysis.json")


if __name__ == '__main__':
    main()
