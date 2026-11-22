#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拾词 · 高考核心高频 688 词数据源构建

输入（用户提供）：核心高频688词汇.doc（Word 97-2003 / OLE2）
  经 Word/WPS 另存为纯文本（GB18030）后的中间产物：data/_688_raw.txt
  原表 5 列：序号 / 考频 / 单词 / 音标 / 中文词义，按 CR(\\r) 分隔单元格。
  转换命令（Windows Word COM）：
    $w=New-Object -ComObject Word.Application; $w.Visible=$false
    $d=$w.Documents.Open('核心高频688词汇.doc',$false,$true)
    $d.SaveAs([ref]'data/_688_raw.txt',[ref]7); $d.Close([ref]0); $w.Quit([ref]0)
  macOS 可用 textutil -convert txt -encoding GB18030 -output data/_688_raw.txt ...

输出：data/product/highfreq688.json
  { meta:{...}, words:[{no, freq, headword, ipa, cn_raw, senses:[...]}] }

版权红线：中文词义仅作参照素材（cn_raw / senses 供内部义项拆分），
对外呈现的义项/搭配/例句一律由 build_trap_variants.py 自研生成，不含真题原文。
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data', '_688_raw.txt')
OUT = os.path.join(ROOT, 'data', 'product', 'highfreq688.json')


def parse_raw(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('gb18030')
    # Word 表格：单元格用 \r 分隔，行首带 \n。个别词义内含换行（如 block），
    # 会在音标后出现空 cell + \n 起始的词义，需要先规范化再切。
    text = text.replace('\r\n', '\r').replace('\n', '\r')
    segs = [s.strip() for s in text.split('\r')]
    segs = [s for s in segs if s]  # 丢弃空 cell（含被换行切断产生的空段）
    # 定位第一个序号 1（跳过标题与表头）
    start = segs.index('1', 5)
    cells = segs[start:]
    recs = []
    i = 0
    while i + 4 < len(cells):
        seq, freq, word, ipa, cn = cells[i:i + 5]
        if not re.fullmatch(r'\d+', seq):
            i += 1
            continue
        recs.append(OrderedDict([
            ('no', int(seq)),
            ('freq', int(freq) if freq.isdigit() else 0),
            ('headword', word.strip().lower()),
            ('ipa', clean_ipa(ipa.strip())),
            ('cn_raw', cn.strip()),
        ]))
        i += 5
    return recs


def clean_ipa(s):
    """原 doc 音标符号在转码中部分丢失为 '?'，仅保留可读形式。"""
    s = s.strip()
    if not s:
        return ''
    s = re.sub(r'\?+', '?', s)
    s = s.strip("'[]/ ")
    if not s or '?' in s:
        return ''  # 残缺音标不对外呈现，交给生成器用自研音标补齐
    return '/' + s + '/'


def split_senses(cn):
    """从中文词义拆出义项列表，保留词性前缀。"""
    parts = re.split(r'[；;]', cn or '')
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # 「v.系，联系」内部逗号也算一个义项簇，拆开
        sub = [x.strip() for x in re.split(r'[,，、]', p) if x.strip()]
        for s in sub:
            s = re.sub(r'^[a-z]+\.', '', s).strip()  # 去掉行内词性前缀
            if s and s not in out:
                out.append(s)
    return out[:6]


def main():
    recs = parse_raw(RAW)
    if len(recs) != 688:
        raise SystemExit('期望 688 词，实际 %d' % len(recs))
    seqs = [r['no'] for r in recs]
    if seqs != list(range(1, 689)):
        raise SystemExit('序号不连续：%s' % seqs[:5])
    if len({r['headword'] for r in recs}) != 688:
        raise SystemExit('存在重复单词')

    words = []
    for r in recs:
        w = OrderedDict(r)
        w['senses'] = split_senses(r['cn_raw'])
        words.append(w)

    data = OrderedDict([
        ('meta', OrderedDict([
            ('name', '高考核心高频 688 词'),
            ('source', '用户提供《核心高频688词汇》· 序号/考频/单词/音标/中文词义'),
            ('copyright', '中文词义仅作内部义项拆分参照；对外词卡/题由自研生成器产出，不含真题原文。'),
            ('total', len(words)),
            ('freq_range', [min(r['freq'] for r in recs), max(r['freq'] for r in recs)]),
            ('desc', '按真题复现考频排序的 688 个核心高频词，考频越高越靠前。'),
        ])),
        ('words', words),
    ])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('输出 %s：%d 词，考频 %d–%d' % (
        OUT, len(words), data['meta']['freq_range'][0], data['meta']['freq_range'][1]))
    print('样例：', json.dumps(words[0], ensure_ascii=False))


if __name__ == '__main__':
    main()
