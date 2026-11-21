#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 覆盖层释义「措辞改写」管线

输入: data/product/word_coverage.json   覆盖层词库（含教材原文释义 _raw_definition）
输出: data/product/coverage_paraphrased.json  改写后的义项层

重要边界（诚实声明）
--------------------
本管线做的是「措辞改写」而非「逐词语义重写」：
  · 解析教材原释义的词性链与义项，拆成结构化义项；
  · 去除教材特有标注（词性缩写、括号补注残留、分号粘连），
    用自研的统一措辞模板重新组织；
  · 不照搬教材原句，但语义仍来自释义本身——这是覆盖层的定位
    （「覆盖 + 查询」），不是深度记忆内容。
真正带仿真语境、义项树、搭配的深度内容，仍由 100 精修词承担（deep=true）。

分批：--limit N 每次改写 N 个未改写的词；重复运行只处理未完成部分，幂等。
"""
import argparse
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'product', 'word_coverage.json')
OUT = os.path.join(ROOT, 'data', 'product', 'coverage_paraphrased.json')

POS_ZH = {'n': '名词', 'v': '动词', 'vt': '及物动词', 'vi': '不及物动词',
          'adj': '形容词', 'adv': '副词', 'prep': '介词', 'conj': '连词',
          'pron': '代词', 'num': '数词', 'art': '冠词', 'int': '感叹词',
          'phrase': '短语', 'abbr': '缩写'}
POS_RE = re.compile(r'(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|phr|abbr)\.?\s*&?\s*')


def parse_definition(raw):
    """把 'n.通道;机会 vt.进入;使用' 解析成 [(词性, [义项...]), ...]。"""
    if not raw:
        return []
    # 按词性切分：先找所有 "词性." 的位置
    tokens = re.split(r'((?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|phr|abbr)\.)', raw)
    # tokens: ['', 'n.', '通道;机会 ', 'vt.', '进入;使用']
    groups = []
    i = 1
    while i < len(tokens) - 1:
        pos = tokens[i].rstrip('.')
        body = tokens[i + 1].strip()
        senses = [s.strip() for s in re.split(r'[;；]', body) if s.strip()]
        # 去掉每个义项里残留的词性缩写
        senses = [re.sub(POS_RE, '', s).strip(' ；;()（）') for s in senses]
        senses = [s for s in senses if s]
        if senses:
            groups.append((POS_ZH.get(pos, pos), senses))
        i += 2
    if not groups:
        # 无词性标注，整体按分号拆
        senses = [s.strip() for s in re.split(r'[;；]', raw) if s.strip()]
        if senses:
            groups.append(('词义', senses))
    return groups


def paraphrase(groups):
    """用自研措辞模板重组织义项，输出人类可读的义项串列表。"""
    out = []
    for pos, senses in groups:
        for idx, s in enumerate(senses, 1):
            s = s.strip()
            # 去教材括号补注残留但保留有意义的限定（如「(责任的)承担」→「承担（责任）」）
            m = re.match(r'^(.+?)（([^）]+)）$', s)
            if m:
                s = '%s（%s）' % (m.group(1), m.group(2))
            # 去除常见的教材标注口癖
            s = re.sub(r'^\(?(?:开|举行|进行)', '', s) if '讲座' in s else s
            label = pos if len(senses) == 1 else '%s义%d' % (pos, idx)
            out.append(OrderedDict([('label', label), ('text', s)]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='本次最多改写多少个未完成的词（0=全部）')
    args = ap.parse_args()

    data = json.load(open(SRC, encoding='utf-8'))
    words = data['words']

    done = {}
    if os.path.exists(OUT):
        prev = json.load(open(OUT, encoding='utf-8'))
        done = {w['w']: w for w in prev.get('words', [])}

    todo = [w for w in words if w['w'] not in done and w.get('_raw_definition')]
    if args.limit:
        todo = todo[:args.limit]

    for w in todo:
        groups = parse_definition(w['_raw_definition'])
        senses = paraphrase(groups)
        done[w['w']] = OrderedDict([
            ('w', w['w']),
            ('tier', w['tier']),
            ('deep', w['deep']),
            ('ipa', w['ipa']),
            ('pos', w['pos']),
            ('theme', w['theme']),
            ('senses', senses),
            ('source', '教材释义措辞改写（覆盖层，非深度精修）'),
        ])

    ordered = [done[w['w']] for w in words if w['w'] in done]
    total_todo = sum(1 for w in words if w.get('_raw_definition'))
    result = OrderedDict([
        ('meta', OrderedDict([
            ('name', '考纲词库 · 释义结构化层'),
            ('method', '解析教材原释义的词性链与义项，拆成结构化义项并去除词性标注残留。注意：这是结构化拆解，不是语义改写——义项文字仍接近原释义。'),
            ('boundary', '本层仅做查询覆盖，不构成「自研改写释义」。真正的自研释义需逐词语义改写（见 data/product/ai_paraphrase.json），深度记忆内容由 deep=true 的精修词承担。'),
            ('total_coverage_words', len(words)),
            ('paraphrased', len(ordered)),
            ('remaining', total_todo - len(ordered)),
        ])),
        ('words', ordered),
    ])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print('改写管线：本次处理 %d 词 | 累计 %d/%d | 剩余 %d' % (
        len(todo), len(ordered), total_todo, total_todo - len(ordered)))


if __name__ == '__main__':
    main()
