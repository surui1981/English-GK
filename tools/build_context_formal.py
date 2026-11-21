#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《高考英语核心词 · 仿真语境版》正式版生成器（1500 词）

与 build_context_book.py（100 词样本）的区别
-------------------------------------------
样本版只从 entries.json 的 100 精修词取数；正式版扩充到 1500 词，分三层：

  L1 深度精修层（100 词）：entries.json 完整义项树 + 仿真例句 + 搭配。
  L2 自研释义层（343 词）：ai_paraphrase.json 里非精修的必考词，模型逐词
      语义改写过的释义 + 搭配，无例句（用户口径「例句精选」）。
  L3 覆盖整理层（1057 词）：推荐层按字母序取词，词典释义做「学习式规范化」
      —— 展开词性缩写、义项分条、剥离乱码与拼写错误、补常见搭配提示。
      ⚠ 这一层是「释义规范化整理」，不是逐词语义改写；单义实词（abacus 算盘、
      acre 英亩）本身没有改写空间，如实标注，绝不冒充自研改写。

合规铁律
--------
- 不照搬教材原文句子；L3 只做词典义项的规范化展开，不引入教材例句/真题。
- 例句仅 L1 有，均带「仿真例句 · …」来源标注。
- 无宣传禁用词、无未限定「真题」。

定价：150/750/1500 词三档不变；status 从「样本卷」升为「正式版」。
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
ENTRIES = P('data', 'batch1', 'entries.json')
CORE = P('data', 'core_freq_curated.json')
COVERAGE = P('data', 'product', 'word_coverage.json')
PARA = P('data', 'product', 'ai_paraphrase.json')
CAND = P('data', 'product', '_fullpack_rec_candidates.json')
OUT = P('data', 'product', 'context_book.json')

BOOK_NAME = '高考英语核心词 · 仿真语境版'
TARGET = 1500
SENSES_PER_WORD = 3

BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']
EXAM_ALLOWED = ['真题原文', '真题选项', '真题解析', '真题原题', '真题语料', '真题改编']

# 词形拼写错误修正（教材素材库的原始数据质量问题）
SPELL_FIX = {
    'accessibel': 'accessible',
    'erane': 'crane',
    'accomodate': 'accommodate',
    'accomodation': 'accommodation',
}
# 释义文本清洗：乱码前缀、重复误字
DEF_FIX = {
    'b,代理人；经纪人': 'n.代理人；经纪人',
    'vt.把…分类(加以归类)': 'vt.把……分类；归类',
    'adj.办正式的;正规的': 'adj.正式的；正规的',
    'n.鹤；吊车；起重机': 'n.鹤；吊车；起重机',  # erane→crane 后保留
}

# 词性缩写 → 学习式中文标签
POS_MAP = [
    (r'vt\.&vi\.|vi\.&vt\.|v\.', 'v.'),
    (r'vt\.', 'v.'), (r'vi\.', 'v.'),
    (r'adj\.|a\.', 'adj.'), (r'adv\.|ad\.', 'adv.'),
    (r'n\.', 'n.'), (r'pron\.', 'pron.'), (r'num\.', 'num.'),
    (r'prep\.', 'prep.'), (r'conj\.', 'conj.'),
]


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def clean_definition(raw):
    """词典释义规范化：修乱码、统一分隔符、展开词性缩写。"""
    s = DEF_FIX.get(raw, raw)
    s = re.sub(r'^[a-zA-Z]\s*[,，]\s*', '', s)   # 去掉 b,代理人 这类乱码前缀
    s = s.replace('；', ';').replace('。', '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def parse_l3(raw):
    """把词典释义解析成 1~3 条学习式义项。"""
    s = clean_definition(raw)
    # 组合词性归一：ad.&prep. / vi.&n. / n.,vi.&vt. → 统一成单个通用词性标记 v./n./adj.等
    # 先收集整条释义里出现的词性，决定一个代表词性
    pos_tokens = re.findall(r'(?:n|v|vt|vi|adj|a|ad|adv|prep|conj|pron|num)\.', s)
    rep_pos = normalize_pos(pos_tokens[0]) if pos_tokens else 'n.'
    # 去掉所有词性标记和 & 连接符，只留义项正文，再按 ; 分条
    s = s.replace('modal v.', 'v.')  # 情态动词归一
    # 内嵌词性标记（如 …蜇 n.咬）替换为分号，避免义项粘连
    s = re.sub(r'\s+(?:n|v|vt|vi|adj|a|ad|adv)\.', ';', s)
    body = re.sub(r'(?:n|v|vt|vi|adj|a|ad|adv|prep|conj|pron|num)\.', ' ', s)
    body = re.sub(r'[&,]+\s*', ' ', body)
    body = re.sub(r'\s+', ' ', body).strip()
    senses = []
    for part in [x.strip() for x in body.split(';') if x.strip()]:
        part = strip_paren_noise(part)
        if not part or part in ('&', '和', '与'):
            continue
        senses.append((rep_pos, part))
        if len(senses) >= SENSES_PER_WORD:
            break
    return senses or [('n.', body)]


def normalize_pos(p):
    m = {'vt.': 'v.', 'vi.': 'v.', 'v.': 'v.', 'a.': 'adj.', 'adj.': 'adj.',
         'ad.': 'adv.', 'adv.': 'adv.', 'n.': 'n.', 'prep.': 'prep.',
         'conj.': 'conj.', 'pron.': 'pron.', 'num.': 'num.'}
    return m.get(p, p)


def strip_paren_noise(t):
    """保留括注里的实际内容（如 上(船/飞机等) → 上(船/飞机等)），只清理空括注与纯标记。"""
    # 空括注或只有语种的括注去掉
    t = re.sub(r'\((?:美|英|喻|文献等)\)', '', t)
    # 括注内是补充说明的（如 船/飞机等），保留但去掉尾部"等"字噪声
    t = t.replace('(船/飞机等)', '(船/飞机等)')
    return t.strip(' ;,，')


def pick_senses(senses, n=SENSES_PER_WORD):
    rank = {'S2': 0, 'S3': 1, 'S1': 2, 'S4': 3}
    ordered = sorted(senses, key=lambda s: (0 if s.get('is_trap') else 1,
                                            rank.get(s.get('sense_level'), 9)))
    return ordered[:n]


def sense_card_from_entry(s):
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
        ('layer', 'L1-仿真语境'),
    ])


def sense_card_simple(pos, meaning, collocation='', layer='L2-自研释义'):
    return OrderedDict([
        ('text', meaning),
        ('pos', pos),
        ('is_trap', False),
        ('example', ''),
        ('example_zh', ''),
        ('source', '精选释义 · 无语境例句' if layer.startswith('L2') else '词典释义规范化整理 · 无语境例句'),
        ('collocations', [c.strip() for c in re.split(r'[,，]', collocation) if c.strip()][:4]),
        ('layer', layer),
    ])


def main():
    entries = load(ENTRIES)
    core = load(CORE)['words']
    para = {w['w']: w for w in load(PARA)['words']}
    cand = load(CAND)

    deep_words = {e['headword'] for e in entries}
    words = []

    # ---- L1 深度精修层 ----
    for e in entries:
        hw = e['headword']
        c = core.get(hw, {})
        senses = pick_senses(e['senses'])
        words.append(OrderedDict([
            ('headword', hw), ('ipa', e.get('ipa', '')),
            ('level', e.get('level', '')), ('core_tier', c.get('tier', '')),
            ('trap_focus', c.get('trap', '')), ('core_meaning', c.get('core', '')),
            ('note', e.get('notes', '')),
            ('senses', [sense_card_from_entry(s) for s in senses]),
            ('layer', 'L1-仿真语境'),
        ]))

    # ---- L2 自研释义层（必考非精修）----
    l2_added = 0
    for hw, p in para.items():
        if hw in deep_words:
            continue
        senses = p.get('senses', [])
        cards = [sense_card_simple(s['pos'], s['meaning'], s.get('collocation', ''),
                                   'L2-自研释义') for s in senses[:SENSES_PER_WORD]]
        words.append(OrderedDict([
            ('headword', hw), ('ipa', ''), ('level', 'T1'),
            ('core_tier', 'required'), ('trap_focus', ''), ('core_meaning', ''),
            ('note', ''), ('senses', cards), ('layer', 'L2-自研释义'),
        ]))
        l2_added += 1

    # ---- L3 覆盖整理层（推荐词，按字母序+清洗补足到 1500）----
    need = TARGET - len(words)
    l3_added = 0
    for c in cand:
        if l3_added >= need:
            break
        hw = SPELL_FIX.get(c['w'], c['w'])
        if hw in deep_words or hw in para:
            continue
        senses = parse_l3(c['raw'])
        cards = [sense_card_simple(pos, txt, layer='L3-覆盖整理') for pos, txt in senses]
        words.append(OrderedDict([
            ('headword', hw), ('ipa', c.get('ipa', '')),
            ('level', 'T3'), ('core_tier', 'recommended'),
            ('trap_focus', ''), ('core_meaning', ''), ('note', ''),
            ('senses', cards), ('layer', 'L3-覆盖整理'),
        ]))
        l3_added += 1

    # 排序：T1 → T2 → T3，同级按词字母序
    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words.sort(key=lambda w: (tier_rank.get(w.get('core_tier', ''), 9), w['headword']))

    # ---- 合规自检 ----
    errs = []
    blob = json.dumps(words, ensure_ascii=False)
    for b in BANNED_HARD:
        if b in blob:
            errs.append('宣传禁用词: ' + b)
    for e in words:
        for s in e['senses']:
            if s['example'] and '仿真例句' not in s['source']:
                errs.append('%s 例句缺仿真来源标注' % e['headword'])
    if errs:
        raise SystemExit('合规自检未通过:\n  ' + '\n  '.join(errs[:20]))

    n_senses = sum(len(w['senses']) for w in words)
    n_examples = sum(1 for w in words for s in w['senses'] if s['example'])
    layers = {}
    for w in words:
        layers[w['layer']] = layers.get(w['layer'], 0) + 1

    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '一词多义 · 仿真语境 · 高考高频句式'),
            ('status', '正式版'),
            ('description', '1500 词全覆盖：100 词深度仿真语境 + 343 词自研释义 + 1057 词规范化释义整理。例句精选，仅深度层配仿真例句。'),
            ('source_basis', '高考高频复现频次 + 自建义项树 + 仿真语境句 + 必考层自研释义改写'),
            ('copyright', '深度层例句为自研仿真写作并标注来源；必考层释义经语义改写；覆盖层仅做词典义项规范化整理，不照搬教材原句。真题原文/选项/解析一律不收录。'),
            ('pricing', OrderedDict([
                ('tiers', [
                    OrderedDict([('name', '10% 试读'), ('words', 150), ('price', 1.9)]),
                    OrderedDict([('name', '50% 进阶'), ('words', 750), ('price', 3.9)]),
                    OrderedDict([('name', '完整版'), ('words', 1500), ('price', 4.9)]),
                ]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('planned_total', TARGET),
                ('current_words', len(words)),
                ('current_senses', n_senses),
                ('example_sentences', n_examples),
                ('by_layer', layers),
                ('note', '例句精选：仅 L1 深度精修层配仿真语境例句；L2/L3 为释义卡，无例句，已如实标注。'),
            ])),
        ])),
        ('words', words),
    ])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(book, f, ensure_ascii=False, indent=1)

    print('输出: %s' % OUT)
    print('  《%s》%d 词 / %d 义项 / %d 仿真例句' % (BOOK_NAME, len(words), n_senses, n_examples))
    print('  分层:', dict(layers))
    print('  合规自检通过')


if __name__ == '__main__':
    main()
