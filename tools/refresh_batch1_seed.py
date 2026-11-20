#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 首批 100 词 seed 刷新

背景：
  2024 底修正了教材释义的词性组解析（空格/U+3000 分隔的词性组此前被粘成一条义项，
  词性链如 n.&vt. 也整条漏标）。修正后教材表的 sense_count / pos 变准，
  但 select_batch1.py 的排序也随之变化，首批 100 词会有 9 个词进出。

  首批 100 词的词条精修（100 词 / 420 义项）与 200 道配套题已完成并通过验收，
  全部绑定在原名单上。重新选词属于第二批的输入调整，不在本阶段动它。

  本脚本做两件事：
  1. 把首批名单**冻结**（选定结果 = 已交付内容，不再随工具链变动）。
  2. 刷新名单里每个词的 seed 参考块 —— 只更新解析器派生的字段
     （senses_raw / pos / pos_raw / sense_count），让 seed 与修正后的素材库一致，
     消除 '范围 vi.包括' 这类粘连义项；选词字段（seq / track / tier / score）保持原样。

输入: data/batch1_words.json（冻结名单）+ data/textbook_lexicon.json
输出: data/batch1_words.json（原地刷新 seed）
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip().lower())


def main():
    p = os.path.join(DATA, 'batch1_words.json')
    doc = json.load(open(p, encoding='utf-8'))
    lex = json.load(open(os.path.join(DATA, 'textbook_lexicon.json'), encoding='utf-8'))
    idx = {norm(w['headword']): w for w in lex['words']}

    updated = 0
    no_anchor = 0
    for w in doc['words']:
        seed = w.setdefault('seed', {})
        rec = idx.get(norm(w['headword']))
        if not rec:
            # B 轨词：两套教材都没有锚点，seed 保持空
            seed.update({
                'ipa': '', 'pos': [], 'pos_raw': '', 'sense_count': 0,
                'senses_raw': [], 'definition_raw': '', 'book': '', 'unit': '',
                'unit_id': '', 'unit_title_raw': '', 'theme': '', 'theme_tags': [],
                'source': '无教材锚点 · 义项树自建',
            })
            no_anchor += 1
            continue
        # 仅刷新解析器派生字段
        seed['ipa'] = rec.get('ipa', '')
        seed['pos'] = rec.get('pos', [])
        seed['pos_raw'] = rec.get('pos_raw', '')
        seed['sense_count'] = rec.get('sense_count', 0)
        seed['senses_raw'] = rec.get('senses_raw', [])
        seed['definition_raw'] = rec.get('definition_raw', '')
        seed['source'] = rec.get('source', '')
        updated += 1

    doc['_meta']['frozen'] = OrderedDict([
        ('frozen_at', '首批 100 词选词结果已冻结'),
        ('reason', '词条精修与 200 道配套题已完成并通过验收，全部绑定本名单；'
                   '选词调整归入第二批输入，不在本阶段变更'),
        ('seed_refreshed', 'seed 参考块随教材释义解析器修正同步刷新（仅解析器派生字段）'),
        ('selection_drift_note', '当前 select_batch1.py 重跑会因教材 sense_count 修正产生 9 词进出，'
                                 '差异记录见 data/material_impact.json · batch1_selection_drift'),
    ])

    json.dump(doc, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'seed 刷新完成：A 轨 {updated} 词，B 轨（无锚点）{no_anchor} 词')
    print(f'输出: data/batch1_words.json')


if __name__ == '__main__':
    main()
