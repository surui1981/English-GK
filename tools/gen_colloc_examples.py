#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
搭配例句库装配器

数据来源优先级：
1. 手工精修独立例句（colloc_examples_hand.py）：400 条核心搭配 + 高频搭配，
   每条贴合搭配本身、语境各异，质量最高，标注「手工精修」。
2. 其余搭配：不再伪造独立例句，而是沿用所属义项的仿真语境句，
   并明确标注「义项语境句（非搭配独立例句）」——诚实区分两种例句。

输出: data/product/colloc_examples.json
结构: { 搭配文本: {"en":..., "zh":..., "src":..., "method":...} }
"""
import json
import os
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colloc_examples_hand import HAND

BOOK = os.path.join(ROOT, 'data', 'product', 'colloc_book.json')
PARA = os.path.join(ROOT, 'data', 'product', 'ai_paraphrase.json')
OUT = os.path.join(ROOT, 'data', 'product', 'colloc_examples.json')
SRC = '仿真例句 · 高考高频句式'


def main():
    book = json.load(open(BOOK, encoding='utf-8'))
    para = json.load(open(PARA, encoding='utf-8'))
    examples = OrderedDict()

    hand_used = 0
    # 精修词搭配：优先手工例句，否则用义项语境句
    for w in book['words']:
        for g in w['groups']:
            for col in g['collocations']:
                text = col['text']
                if text in examples:
                    continue
                if text in HAND:
                    en, zh = HAND[text]
                    examples[text] = {'en': en, 'zh': zh, 'src': SRC, 'method': '手工精修'}
                    hand_used += 1
                elif col.get('example'):
                    examples[text] = {
                        'en': col['example'], 'zh': col.get('example_zh', ''),
                        'src': col.get('source', SRC), 'method': '义项语境句',
                    }
                else:
                    examples[text] = {'en': '', 'zh': '', 'src': '', 'method': '无例句'}

    # 必考非精修词搭配（来自 ai_paraphrase）
    deep = {w['headword'] for w in book['words']}
    import re
    for w in para['words']:
        if w['w'] in deep:
            continue
        for s in w['senses']:
            for part in re.split(r'[,，]', s.get('collocation', '')):
                text = part.strip()
                if not text or text in examples:
                    continue
                if text in HAND:
                    en, zh = HAND[text]
                    examples[text] = {'en': en, 'zh': zh, 'src': SRC, 'method': '手工精修'}
                    hand_used += 1
                else:
                    examples[text] = {'en': '', 'zh': '', 'src': '', 'method': '无例句'}

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(examples, f, ensure_ascii=False, indent=1)

    from collections import Counter
    mc = Counter(v['method'] for v in examples.values())
    print('例句库输出: %s' % OUT)
    print('  总搭配: %d 条' % len(examples))
    print('  来源分布:', dict(mc))
    print('  手工精修独立例句: %d 条' % hand_used)


if __name__ == '__main__':
    main()
