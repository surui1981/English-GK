#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 统一素材库联合分析

输入: data/word_material.json          统一素材库（双来源合并）
      data/core_freq_curated.json       人工频次判定表（主）
      data/core_freq_curated_ext.json   人工频次判定表（补充）
      data/batch1_words.json            首批 100 词筛选结果
输出: data/material_impact.json         影响面量化报告

回答四个问题:
1. 570 个人工判定词在两套教材来源中的覆盖情况如何？
2. T1 / T2 层缺口被旧课标表补上了多少？还剩多少？
3. 首批 100 词的 track 标签是否需要重标？
4. 强陷阱词（trap_strength=3）的覆盖缺口是否收窄？
"""
import json
import os
import re
import sys
from collections import OrderedDict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wordlist_parse as wl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip().lower())


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def track_of(rec):
    """来源标记：2019 / 2007 / 双源 / 无"""
    if rec is None:
        return 'none'
    if rec['in_tb2019'] and rec['in_tb2007']:
        return 'both'
    if rec['in_tb2019']:
        return 'tb2019'
    if rec['in_tb2007']:
        return 'tb2007'
    return 'none'


def main():
    mat = load('word_material.json')
    mat_idx = {norm(w['headword']): w for w in mat['words']}

    curated = {}
    for fn in ('core_freq_curated.json', 'core_freq_curated_ext.json'):
        for k, v in load(fn)['words'].items():
            curated[norm(k)] = v

    report = OrderedDict()
    report['_meta'] = OrderedDict([
        ('generated_by', 'tools/analyze_material.py'),
        ('purpose', '量化旧课标补录对高频分层与首批 100 词名单的影响'),
        ('material_version', mat['_meta'].get('version')),
    ])

    # ── 1. 570 词覆盖总览 ──
    cov = Counter()
    by_tier = OrderedDict()
    for t in ('T1', 'T2', 'T3', 'T4'):
        sub = {k: v for k, v in curated.items() if v.get('tier') == t}
        if not sub:
            continue
        c = Counter(track_of(mat_idx.get(k)) for k in sub)
        by_tier[t] = OrderedDict([
            ('candidates', len(sub)),
            ('in_tb2019', c['tb2019']),
            ('in_tb2007', c['tb2007']),
            ('in_both', c['both']),
            ('in_neither', c['none']),
            ('covered_total', len(sub) - c['none']),
            ('coverage_rate', round(100 * (len(sub) - c['none']) / len(sub), 1)),
        ])
        cov.update(c)
    report['curated_coverage'] = OrderedDict([
        ('total_candidates', len(curated)),
        ('in_tb2019', cov['tb2019']),
        ('in_tb2007', cov['tb2007']),
        ('in_both', cov['both']),
        ('in_neither', cov['none']),
        ('by_tier', by_tier),
    ])

    # ── 2. T1 缺口收窄 ──
    t1 = {k: v for k, v in curated.items() if v.get('tier') == 'T1'}
    t1_only_2019 = sorted(k for k in t1 if track_of(mat_idx.get(k)) == 'tb2019')
    t1_both = sorted(k for k in t1 if track_of(mat_idx.get(k)) == 'both')
    t1_only_2007 = sorted(k for k in t1 if track_of(mat_idx.get(k)) == 'tb2007')
    t1_missing = sorted(k for k in t1 if track_of(mat_idx.get(k)) == 'none')
    report['t1_gap'] = OrderedDict([
        ('t1_candidates', len(t1)),
        ('before_tb2019_only', len(t1_both) + len(t1_only_2019)),
        ('after_both_sources', len(t1_both) + len(t1_only_2019) + len(t1_only_2007)),
        ('newly_anchored_by_tb2007', len(t1_only_2007)),
        ('newly_anchored_words', t1_only_2007),
        ('still_missing', len(t1_missing)),
        ('still_missing_words', t1_missing),
        ('missing_rate_before', round(100 * len(t1_missing) / len(t1), 1)),
        ('missing_rate_after', round(
            100 * len(t1_missing) / len(t1), 1)),
    ])
    # 缺口率口径修正：before = 不在 2019 表内；after = 两源都没有
    report['t1_gap']['missing_rate_before'] = round(
        100 * (len(t1) - len(t1_both) - len(t1_only_2019)) / len(t1), 1)
    report['t1_gap']['missing_rate_after'] = round(
        100 * len(t1_missing) / len(t1), 1)

    # ── 3. 强陷阱词覆盖 ──
    strong = {k: v for k, v in curated.items() if v.get('trap_strength') == 3}
    s_c = Counter(track_of(mat_idx.get(k)) for k in strong)
    report['strong_trap'] = OrderedDict([
        ('candidates', len(strong)),
        ('in_tb2019', s_c['tb2019']),
        ('in_tb2007', s_c['tb2007']),
        ('in_both', s_c['both']),
        ('in_neither', s_c['none']),
        ('coverage_rate', round(100 * (len(strong) - s_c['none']) / len(strong), 1)),
        ('missing_count', s_c['none']),
    ])

    # ── 4. 首批 100 词 track 影响 ──
    b1 = load('batch1_words.json')['words']
    entries = load('batch1/entries.json')
    ent_idx = {norm(e['headword']): e for e in entries}

    all_items = []
    for w in b1:
        k = norm(w['headword'])
        rec = mat_idx.get(k)
        tk = track_of(rec)
        it = OrderedDict([
            ('seq', w['seq']),
            ('headword', w['headword']),
            ('current_track', w['track']),
            ('source_track', tk),
            ('tier', w['tier']),
            ('trap_strength', w['trap_strength']),
            ('sense_count_merged', rec['sense_count'] if rec else 0),
            ('sense_count_2019', rec['sense_count_by_source'].get('tb2019') if rec else None),
            ('sense_count_2007', rec['sense_count_by_source'].get('tb2007') if rec else None),
            ('sources', rec['source_ids'] if rec else []),
        ])
        # 教材锚点对「已精修义项」的覆盖度：教材释义只覆盖了精修义项的多少
        e = ent_idx.get(k)
        if e and rec:
            ours = [s['text'] for s in e['senses']]
            for sid, keyname in (('tb2019', '2019'), ('tb2007', '2007')):
                raw = next((s['senses_raw'] for s in rec['sources'] if s['source_id'] == sid), [])
                if not raw:
                    continue
                rawk = set()
                for x in raw:
                    rawk.add(re.sub(r'\s+', '', wl.sense_key(x)))
                hit = sum(1 for t in ours if any(
                    re.sub(r'\s+', '', wl.sense_key(t)) in k2 or k2 in re.sub(r'\s+', '', wl.sense_key(t))
                    for k2 in rawk if k2))
                it[f'anchor_coverage_{keyname}'] = OrderedDict([
                    ('raw_senses', len(raw)),
                    ('curated_senses', len(ours)),
                    ('covered', hit),
                    ('ratio', round(hit / len(ours), 2) if ours else 0),
                ])
        if w['track'] == 'B':
            it['suggestion'] = '维持 B（教材锚点不完整，义项树仍须自建）'
        else:
            it['suggestion'] = '维持 A'
        all_items.append(it)

    # 冻结名单漂移（由 tools/select_batch1.py 重跑产生）
    drift = None
    dp = os.path.join(DATA, '_batch1_selection_drift.json')
    if os.path.exists(dp):
        drift = json.load(open(dp, encoding='utf-8'))
        drift['note'] = ('首批 100 词名单已冻结（词条 + 配套题绑定其上）。'
                         '教材释义解析器修正会改变教材 sense_count，从而让排序变化 9 个词。'
                         '本阶段不改名单：该差异归入第二批选词输入，'
                         '如要改须重做对应词条与配套题。')

    report['batch1_impact'] = OrderedDict([
        ('total', len(b1)),
        ('current_track_a', sum(1 for w in b1 if w['track'] == 'A')),
        ('current_track_b', sum(1 for w in b1 if w['track'] == 'B')),
        ('source_track_dist', dict(Counter(track_of(mat_idx.get(norm(w['headword']))) for w in b1))),
        ('frozen', True),
        ('selection_drift', drift),
        ('per_word', all_items),
    ])

    # ── 5. 名单稳定性检验：若用统一素材库重跑筛选，排序会怎么变 ──
    # 判定口径：人工频次表 tier + trap_strength 不变；教材锚点只影响"是否需要自建义项树"，
    # 不改变高频分层。列出统一库中「原本不在首批、但在新来源拿到锚点且分层够高」的词 → 第二批候选。
    b1_set = {norm(w['headword']) for w in b1}
    new_candidates = []
    for k, v in curated.items():
        if k in b1_set:
            continue
        rec = mat_idx.get(k)
        tk = track_of(rec)
        if tk == 'tb2007' and v.get('tier') in ('T1', 'T2') and v.get('trap_strength', 0) >= 2:
            new_candidates.append(OrderedDict([
                ('headword', k),
                ('tier', v.get('tier')),
                ('trap_strength', v.get('trap_strength')),
                ('trap', v.get('trap', '')),
                ('core', v.get('core', '')),
                ('note', v.get('note', '')),
                ('sense_count_2007', rec['sense_count_by_source'].get('tb2007')),
                ('unit_title_2007', next(
                    (s['unit_title'] for s in rec['sources'] if s['source_id'] == 'tb2007'), '')),
            ]))
    new_candidates.sort(key=lambda x: (x['tier'], -x['trap_strength'], x['headword']))
    report['batch2_candidates'] = OrderedDict([
        ('note', '人工判定为 T1/T2 且 trap_strength≥2、但不在首批 100 词内、且仅在旧课标表有锚点的词。'
                 '它们是第二批的优先候选：教材有释义底稿可参照，但仍需自建六维义项树。'),
        ('count', len(new_candidates)),
        ('words', new_candidates),
    ])

    # ── 6. 素材库自身健康度 ──
    allw = mat['words']
    report['material_health'] = OrderedDict([
        ('word_count', len(allw)),
        ('single_word', sum(1 for w in allw if not w['is_phrase'])),
        ('phrase', sum(1 for w in allw if w['is_phrase'])),
        ('total_senses', sum(w['sense_count'] for w in allw)),
        ('multi_sense_ge3', sum(1 for w in allw if w['sense_count'] >= 3)),
        ('no_ipa', sum(1 for w in allw if not w['ipa'])),
        ('zero_sense', sum(1 for w in allw if w['sense_count'] == 0)),
        ('culture_marked', sum(1 for w in allw if w['culture_marked'])),
        ('annotation_pending', sum(1 for w in allw if w['tier'] is None)),
    ])

    with open(os.path.join(DATA, 'material_impact.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    # ── 控制台摘要 ──
    print('=' * 62)
    print('统一素材库 × 人工频次判定表 · 联合分析')
    print('=' * 62)
    cc = report['curated_coverage']
    print(f"\n【1】{cc['total_candidates']} 个候选词覆盖")
    print(f"   仅2019 {cc['in_tb2019']} | 仅2007 {cc['in_tb2007']} | 双源 {cc['in_both']} | 两源皆无 {cc['in_neither']}")
    for t, v in cc['by_tier'].items():
        print(f"   {t}: {v['covered_total']}/{v['candidates']} 覆盖 ({v['coverage_rate']}%)  缺 {v['in_neither']}")

    g = report['t1_gap']
    print(f"\n【2】T1 缺口")
    print(f"   仅看2019表: 缺 {g['t1_candidates'] - g['before_tb2019_only']} / {g['t1_candidates']} "
          f"(缺失率 {g['missing_rate_before']}%)")
    print(f"   双来源合计: 缺 {g['still_missing']} / {g['t1_candidates']} "
          f"(缺失率 {g['missing_rate_after']}%)")
    print(f"   新获锚点 {g['newly_anchored_by_tb2007']} 个: {', '.join(g['newly_anchored_words'])}")

    s = report['strong_trap']
    print(f"\n【3】强陷阱词 {s['candidates']} 个，覆盖 {s['coverage_rate']}%，仍缺 {s['missing_count']}")

    b = report['batch1_impact']
    print(f"\n【4】首批 100 词 track 影响")
    print(f"   来源分布: {b['source_track_dist']}")
    print(f"   名单冻结: 是（词条与 200 道题绑定其上）")
    if b.get('selection_drift'):
        d = b['selection_drift']
        print(f"   选词漂移: 移出 {len(d['dropped'])} / 移入 {len(d['added'])}（归入第二批输入）")
        print(f"     移出: {', '.join(d['dropped'])}")
        print(f"     移入: {', '.join(d['added'])}")
    # 教材锚点覆盖度：只看 B 轨里现在有旧课标锚点的词
    frag = [i for i in b['per_word']
            if i['current_track'] == 'B' and i['source_track'] == 'tb2007']
    if frag:
        print(f"   B 轨但有旧课标锚点的 {len(frag)} 个词（锚点只覆盖部分义项，义项树仍须自建）:")
        for i in frag:
            c = i.get('anchor_coverage_2007', {})
            print(f"     {i['headword']:<10} 精修{c.get('curated_senses')}义 / "
                  f"教材锚点{c.get('raw_senses')}义 → 覆盖 {c.get('covered')} "
                  f"({int(c.get('ratio', 0) * 100)}%)")

    n = report['batch2_candidates']
    print(f"\n【5】第二批候选（仅旧课标有锚点、层级够高）{n['count']} 个")
    print(f"   {', '.join(x['headword'] for x in n['words'][:40])}"
          f"{' ...' if n['count'] > 40 else ''}")

    h = report['material_health']
    print(f"\n【6】素材库健康度: {h['word_count']} 条 / 义项 {h['total_senses']} / "
          f"多义≥3 {h['multi_sense_ge3']} / 缺音标 {h['no_ipa']} / "
          f"零义项 {h['zero_sense']} / 待标注 {h['annotation_pending']}")
    print(f"\n输出: data/material_impact.json")


if __name__ == '__main__':
    main()
