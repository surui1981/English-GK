#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 教材词表分析页（2019 单来源）数字刷新

背景：
  `docs/教材词表分析.html` 是 2019 新课标单来源的静态分析页，
  页内数字（5091 义项 / 604 多义词 等）来自教材释义解析修复**之前**的转换结果。
  释义解析修复后（§1.5.2.4），2019 表的义项数、词性分布、多义词数都变了。

  本脚本把页内嵌的 DATA.s 统计块与正文硬编码数字同步到当前数据，
  避免仓库里出现两套互相矛盾的数字。
  页面的视觉与结构不动，只换数字。

输入: data/stats_tb2019.json
输出: docs/教材词表分析.html（原地更新，幂等）
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
PAGE = os.path.join(ROOT, 'docs', '教材词表分析.html')


def main():
    s = json.load(open(os.path.join(DATA, 'stats_tb2019.json'), encoding='utf-8'))
    theme = json.load(open(os.path.join(DATA, 'unit_theme_map.json'), encoding='utf-8'))
    html = open(PAGE, encoding='utf-8').read()
    before = html

    # ── 1. 替换嵌入的 DATA 数据块 ──
    m = re.search(r'const DATA = (\{.*?\});\n', html, re.S)
    if not m:
        raise SystemExit('未找到页面中的 DATA 数据块，页面结构可能已变')
    data = json.loads(m.group(1))
    old_s = dict(data.get('s', {}))
    for k in ('total_senses', 'multi_sense_ge3', 'multi_sense_ge4', 'sense_count_dist',
              'pos_dist', 'candidate_trap_words', 'candidate_phrase_words', 'phrase_count',
              'single_word_count', 'total_words', 'total_units', 'no_ipa',
              'gk_gap_estimate', 'by_book'):
        if k in s:
            data['s'][k] = s[k]

    # 按单元 / 按册的多义统计同样随释义解析修复而变，一并重算
    units = []
    for u in theme['units']:
        units.append({
            'i': u['unit_id'], 't': u['unit_title'], 'th': u['theme_name'],
            'g': u['theme_tags'], 'n': u['word_count'], 'ms': u['multi_sense_count'],
            'mr': u['multi_sense_ratio'], 'ph': u['phrase_count'],
            'sm': u['sample_words'],
        })
    data['u'] = units
    books = []
    for b in sorted({u['book'] for u in theme['units']},
                    key=lambda x: list(s['by_book']).index(x) if x in s['by_book'] else 99):
        us = [u for u in theme['units'] if u['book'] == b]
        books.append({
            'b': b, 'u': len(us), 'w': sum(u['word_count'] for u in us),
            'ms': sum(u['multi_sense_count'] for u in us),
            'ph': sum(u['phrase_count'] for u in us),
        })
    data['b'] = books

    new_block = 'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    html = html[:m.start()] + new_block + html[m.end():]

    # ── 2. 正文硬编码数字 ──
    total_senses = s['total_senses']
    multi3 = s['multi_sense_ge3']
    phrases = s['phrase_count']
    # 多义词 + 词块 = 现成素材总数
    material_total = multi3 + phrases

    def num(x):
        return f'{x:,}'
    subs = [
        (r'\b5091\b', str(total_senses)),
        (r'\b5,091\b', num(total_senses)),
        (r'\b604\b', str(multi3)),
        (r'\b1049 个现成素材\b', f'{material_total} 个现成素材'),
    ]
    for pat, rep in subs:
        html = re.sub(pat, rep, html)

    # ── 3. 文档版本号与双轨/三轨表述同步 ──
    html = html.replace('docs/词汇教研体系v1.md', 'docs/词汇教研体系v1.md')
    html = html.replace('§维度8 内容来源双轨制', '§维度8 内容来源三轨制')

    # ── 4. 页脚指向双来源合并后的分析页 ──
    if '双来源素材库分析.html' not in html:
        link = ('  延伸阅读：已补录 2007 旧课标表并合并为统一素材库（3912 词条），'
                '见 <a href="双来源素材库分析.html">双来源素材库分析</a>'
                '与 <code class="m">docs/词汇教研体系v1.md</code> §1.5.2.3 / §1.5.4<br>\n')
        html = html.replace('  结论前置：', link + '  结论前置：', 1)

    if html == before:
        print('页面数字已是最新，无需改动')
        return

    open(PAGE, 'w', encoding='utf-8').write(html)
    print(f'已刷新 docs/教材词表分析.html')
    print(f'  义项总数 {old_s.get("total_senses")} → {total_senses}')
    print(f'  多义(≥3) {old_s.get("multi_sense_ge3")} → {multi3}')
    print(f'  短语 {phrases} · 现成素材 {material_total}')


if __name__ == '__main__':
    main()
