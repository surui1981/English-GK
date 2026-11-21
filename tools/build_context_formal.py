#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 《高考英语核心词 · 仿真语境版》全量补全生成器（4110 词）

在正式版 1500 词基础上补全三类缺口：
  1. 词量：从 1500 扩到全量 4110 词（443 必考 + 3667 推荐）
  2. 字段：L2/L3 词条补音标、核心义、考场提示、主题语境
  3. 例句：443 个高考核心词全部配仿真例句（100 精修 + 119 义项语境 + 224 新增手工精修）

分层：
  L1 深度精修层（100 词）：entries.json 完整义项树 + 仿真例句 + 搭配。
  L2 自研释义层（343 词）：ai_paraphrase.json 自研义项 + 仿真例句（来自搭配手册与新增例句库）。
  L3 覆盖整理层（3667 词）：词典义项规范化整理，配音标/核心义/主题；无例句，如实标注。

合规：不照搬教材原句，不收录真题原文/选项/解析；所有例句均为自研仿真写作并标注来源。
"""
import difflib
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
COLLOC_BOOK = P('data', 'product', 'colloc_book.json')
COLLOC_EX = P('data', 'product', 'colloc_examples.json')
EXTRA_EX = P('data', 'product', 'context_examples_extra.txt')
IPA_AUTO = P('data', 'product', 'context_ipa_autofill.json')
TRAP = P('data', 'product', 'trap_variants.json')
WM = P('data', 'word_material.json')
LEGACY = P('data', 'legacy_lexicon.json')
OUT = P('data', 'product', 'context_book.json')

BOOK_NAME = '高考英语核心词 · 仿真语境版'
TARGET = 4110
SENSES_PER_WORD = 3
BANNED_HARD = ['提分', '保过', '押题', '押中', '必胜']

SPELL_FIX = {
    'accessibel': 'accessible',
    'erane': 'crane',
    'accomodate': 'accommodate',
    'accomodation': 'accommodation',
}
DEF_FIX = {
    'b,代理人；经纪人': 'n.代理人；经纪人',
    'vt.把…分类(加以归类)': 'vt.把……分类；归类',
    'adj.办正式的;正规的': 'adj.正式的；正规的',
}


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def load_extra_examples():
    """手工例句源文件：word || English || 中文。"""
    out = {}
    with open(EXTRA_EX, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\r\n')
            if not line:
                continue
            parts = line.split(' || ')
            if len(parts) != 3:
                raise SystemExit('例句行格式错误: ' + line)
            out[parts[0]] = {'en': parts[1], 'zh': parts[2],
                             'source': '仿真例句 · 高考高频句式'}
    return out


def clean_definition(raw):
    s = DEF_FIX.get(raw, raw)
    s = re.sub(r'^[a-zA-Z]\s*[,，]\s*', '', s)
    s = s.replace('；', ';').replace('。', '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def parse_l3(raw):
    s = clean_definition(raw or '')
    pos_tokens = re.findall(r'(?:n|v|vt|vi|adj|a|ad|adv|prep|conj|pron|num)\.', s)
    rep_pos = normalize_pos(pos_tokens[0]) if pos_tokens else 'n.'
    s = s.replace('modal v.', 'v.')
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
    return senses or [('n.', body or '按上下文确认具体所指')]


def normalize_pos(p):
    m = {'vt.': 'v.', 'vi.': 'v.', 'v.': 'v.', 'a.': 'adj.', 'adj.': 'adj.',
         'ad.': 'adv.', 'adv.': 'adv.', 'n.': 'n.', 'prep.': 'prep.',
         'conj.': 'conj.', 'pron.': 'pron.', 'num.': 'num.'}
    return m.get(p, p)


def strip_paren_noise(t):
    t = re.sub(r'\((?:美|英|喻|文献等)\)', '', t)
    t = t.replace('(船/飞机等)', '(船/飞机等)')
    return t.strip(' ;,，')


def pick_senses(senses, n=SENSES_PER_WORD):
    rank = {'S2': 0, 'S3': 1, 'S1': 2, 'S4': 3}
    ordered = sorted(senses, key=lambda s: (0 if s.get('is_trap') else 1,
                                            rank.get(s.get('sense_level'), 9)))
    return ordered[:n]


def norm_ipa(v):
    if not v:
        return ''
    v = str(v).strip()
    if v.startswith('/') and v.endswith('/') and len(v) > 2:
        return v
    v = v.strip('/').replace("'", 'ˈ').replace('ˋ', 'ˌ')
    return '/' + v + '/'


def build_ipa_map(cov_words, wm, legacy, trap_words, entries):
    ipa = {}
    for x in cov_words:
        if x.get('ipa'):
            ipa[x['w']] = norm_ipa(x['ipa'])
    for coll in (wm, legacy):
        for x in coll:
            w = x.get('headword', '')
            if w and w not in ipa and x.get('ipa'):
                ipa[w] = norm_ipa(x['ipa'])
    for x in trap_words:
        if x.get('ipa') and x['headword'] not in ipa:
            ipa[x['headword']] = norm_ipa(x['ipa'])
    for x in entries:
        if x.get('ipa') and x['headword'] not in ipa:
            ipa[x['headword']] = norm_ipa(x['ipa'])
    auto = load(IPA_AUTO)['ipa']
    for w, v in auto.items():
        if w not in ipa and v:
            ipa[w] = v
    # 拼写修正词（accessibel→accessible、erane→crane）沿用原词条的自动转写结果
    for wrong, right in SPELL_FIX.items():
        if wrong in auto and right not in ipa:
            ipa[right] = auto[wrong]
    return ipa, set(auto) | set(SPELL_FIX.values())


def build_example_pool(colloc_words, colloc_ex, extra_ex, trap_words):
    """word -> [{sense, en, zh, source}]，按句去重。"""
    pool = {}

    def add(word, sense_text, en, zh, source):
        if not word or not en:
            return
        arr = pool.setdefault(word, [])
        if any(x['en'] == en for x in arr):
            return
        arr.append({'sense': sense_text or '', 'en': en, 'zh': zh or '',
                    'source': source or '仿真例句 · 高考高频句式'})

    for w in colloc_words:
        hw = w['headword']
        for g in w.get('groups', []):
            for c in g.get('collocations', []):
                ex = colloc_ex.get(c['text']) or {}
                if ex.get('en'):
                    add(hw, g.get('sense', ''), ex['en'], ex.get('zh', ''),
                        ex.get('src', '仿真例句 · 高考高频句式'))
    for hw, ex in extra_ex.items():
        add(hw, '', ex.get('en'), ex.get('zh'), ex.get('source'))
    for x in trap_words:
        ex = x.get('example') or {}
        if ex.get('en'):
            add(x['headword'], x.get('sense_text', ''), ex['en'], ex.get('zh', ''),
                ex.get('source', '仿真例句 · 高考高频句式'))
    return pool


def attach_examples(cards, pool):
    """把例句分配到最匹配的义项；每个例句只用一次。"""
    if not pool:
        return cards
    remain = list(pool)
    used = set()
    for i, card in enumerate(cards):
        if card.get('example'):
            continue
        if not remain:
            break
        text = card.get('text', '')
        generic = [x for x in remain if not x['sense']]
        if i == 0 and generic:
            best = generic[0]
        else:
            scored = [(difflib.SequenceMatcher(None, text, x['sense']).ratio(), x)
                      for x in remain]
            scored.sort(key=lambda t: (-t[0], remain.index(t[1])))
            best = scored[0][1]
        card['example'] = best['en']
        card['example_zh'] = best['zh']
        card['source'] = best['source']
        card['example_method'] = '手工精修' if best in generic else '义项语境句'
        used.add(id(best))
        remain = [x for x in remain if id(x) not in used]
    return cards


def note_for(cur, trap, para, theme, meaning):
    if cur.get('note'):
        return cur['note']
    if trap:
        exp = (trap.get('explanation') or '').split('\n')[0]
        exp = re.sub(r'【[^】]+】', '', exp).strip()
        if exp:
            return '考场提示：' + exp
        common = trap.get('common_senses') or []
        if common:
            return '常见义「' + '、'.join(common[:2]) + '」是干扰项；本词在考点语境中取「' + (trap.get('sense_text') or meaning) + '」。'
    if para and para.get('senses'):
        cols = [s.get('collocation', '') for s in para['senses'] if s.get('collocation')]
        if cols:
            return '重点搭配：' + '；'.join(cols[:2]) + '。词块整体记忆效果优于单记词义。'
    if theme:
        return '主题语境：' + theme + '。先记「' + meaning + '」，再对照义项卡片分辨用法。'
    return '先记「' + meaning + '」，再按义项卡片对照复习。'


def sense_card_entry(s):
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


def sense_card_simple(pos, meaning, collocation='', layer='L2-自研释义', extra=None):
    ex = extra or {}
    return OrderedDict([
        ('text', meaning),
        ('pos', pos),
        ('is_trap', False),
        ('example', ex.get('example', '')),
        ('example_zh', ex.get('example_zh', '')),
        ('source', ex.get('source', '精选释义 · 无语境例句' if layer.startswith('L2') else '词典释义规范化整理 · 无语境例句')),
        ('collocations', [c.strip() for c in re.split(r'[,，]', collocation) if c.strip()][:4]),
        ('layer', layer),
    ])


def main():
    entries = load(ENTRIES)
    core = load(CORE)['words']
    cov_words = load(COVERAGE)['words']
    para_list = load(PARA)['words']
    para = {x['w']: x for x in para_list}
    colloc_words = load(COLLOC_BOOK)['words']
    colloc_ex = load(COLLOC_EX)
    extra_ex = load_extra_examples()
    trap_list = load(TRAP)['words']
    trap = {x['headword']: x for x in trap_list}
    wm = load(WM)['words']
    legacy = load(LEGACY)['words']

    ipa_map, auto_ipa = build_ipa_map(cov_words, wm, legacy, trap_list, entries)
    ex_pool = build_example_pool(colloc_words, colloc_ex, extra_ex, trap_list)
    cov_by_word = {x['w']: x for x in cov_words}
    deep_words = {e['headword'] for e in entries}
    words = []

    # ---- L1 深度精修层（100 词）----
    for e in entries:
        hw = e['headword']
        c = core.get(hw, {})
        cov = cov_by_word.get(hw, {})
        senses = [sense_card_entry(s) for s in pick_senses(e['senses'])]
        tv = trap.get(hw)
        words.append(OrderedDict([
            ('headword', hw), ('ipa', ipa_map.get(hw, e.get('ipa', ''))),
            ('ipa_source', '规则转写 · 美音参考' if hw in auto_ipa else '词库原标注'),
            ('level', e.get('level', 'T1')), ('core_tier', cov.get('tier', 'required')),
            ('theme', cov.get('theme', '')),
            ('trap_focus', c.get('trap', '') or (tv.get('sense_text', '') if tv else '')),
            ('core_meaning', c.get('core') or (senses[0]['text'] if senses else '')),
            ('note', e.get('notes', '') or c.get('note', '') or note_for(c, tv, None, cov.get('theme', ''), senses[0]['text'] if senses else '')),
            ('senses', senses), ('layer', 'L1-仿真语境'),
        ]))

    # ---- L2 自研释义层（343 词）----
    for x in para_list:
        hw = x['w']
        if hw in deep_words:
            continue
        c = core.get(hw, {})
        tv = trap.get(hw)
        cov = cov_by_word.get(hw, {})
        cards = [sense_card_simple(s['pos'], s['meaning'], s.get('collocation', ''),
                                   'L2-自研释义') for s in x.get('senses', [])[:SENSES_PER_WORD]]
        cards = attach_examples(cards, ex_pool.get(hw, []))
        meaning = c.get('core') or (cards[0]['text'] if cards else '')
        words.append(OrderedDict([
            ('headword', hw), ('ipa', ipa_map.get(hw, '')),
            ('ipa_source', '规则转写 · 美音参考' if hw in auto_ipa else '词库原标注'),
            ('level', c.get('tier', 'T1')), ('core_tier', 'required'),
            ('theme', cov.get('theme', '')),
            ('trap_focus', c.get('trap', '') or (tv.get('sense_text', '') if tv else '')),
            ('core_meaning', meaning),
            ('note', note_for(c, tv, x, cov.get('theme', ''), meaning)),
            ('senses', cards), ('layer', 'L2-自研释义'),
        ]))

    # ---- L3 覆盖整理层（3667 词，全量推荐层）----
    for cov in cov_words:
        if cov.get('tier') != 'recommended':
            continue
        hw = SPELL_FIX.get(cov['w'], cov['w'])
        senses = parse_l3(cov.get('_raw_definition', '') or cov.get('w', ''))
        cards = [sense_card_simple(pos, txt, layer='L3-覆盖整理') for pos, txt in senses]
        meaning = cards[0]['text'] if cards else ''
        words.append(OrderedDict([
            ('headword', hw), ('ipa', ipa_map.get(hw, cov.get('ipa', ''))),
            ('ipa_source', '规则转写 · 美音参考' if hw in auto_ipa else '词库原标注'),
            ('level', 'T3'), ('core_tier', 'recommended'),
            ('theme', cov.get('theme', '')),
            ('trap_focus', ''), ('core_meaning', meaning),
            ('note', note_for({}, None, None, cov.get('theme', ''), meaning)),
            ('senses', cards), ('layer', 'L3-覆盖整理'),
        ]))

    if len(words) != TARGET:
        raise SystemExit('词量异常：%d（期望 %d）' % (len(words), TARGET))

    tier_rank = {'T1': 0, 'T2': 1, 'T3': 2}
    words.sort(key=lambda w: (0 if w.get('core_tier') == 'required' else 1,
                              tier_rank.get(w.get('level'), 9), w['headword']))

    # ---- 合规与完整性自检 ----
    errs = []
    blob = json.dumps(words, ensure_ascii=False)
    for b in BANNED_HARD:
        if b in blob:
            errs.append('宣传禁用词: ' + b)
    for w in words:
        for field in ('ipa', 'core_meaning', 'note', 'senses'):
            if not w.get(field):
                errs.append('%s %s为空' % (w['headword'], field))
        if w.get('core_tier') == 'required' and not any(s.get('example') for s in w['senses']):
            errs.append('%s 核心词缺例句' % w['headword'])
        for s in w['senses']:
            if s.get('example') and '仿真' not in s.get('source', ''):
                errs.append('%s 例句缺仿真来源标注' % w['headword'])
    if errs:
        raise SystemExit('自检未通过：\n  ' + '\n  '.join(errs[:30]))

    n_senses = sum(len(w['senses']) for w in words)
    n_examples = sum(1 for w in words for s in w['senses'] if s.get('example'))
    layers = {}
    for w in words:
        layers[w['layer']] = layers.get(w['layer'], 0) + 1

    book = OrderedDict([
        ('meta', OrderedDict([
            ('name', BOOK_NAME),
            ('subtitle', '一词多义 · 仿真语境 · 高考高频句式'),
            ('status', '正式版 · 全量补全'),
            ('description', '4110 词全覆盖：100 词深度仿真语境 + 343 词自研释义 + 3667 词规范化释义整理；443 高考核心词全部配仿真例句，覆盖层如实标注无例句。'),
            ('source_basis', '高考高频复现频次 + 自建义项树 + 仿真语境句 + 必考层自研释义改写 + 全量词库规范化整理'),
            ('copyright', '深度层与核心词例句为自研仿真写作并标注来源；必考层释义经语义改写；覆盖层仅做词典义项规范化整理，不照搬教材原句。真题原文/选项/解析一律不收录。'),
            ('pricing', OrderedDict([
                ('tiers', [OrderedDict([('name', '全量完整版'), ('words', len(words)), ('price', 2.9)])]),
                ('currency', 'CNY'),
            ])),
            ('coverage', OrderedDict([
                ('planned_total', TARGET),
                ('current_words', len(words)),
                ('current_senses', n_senses),
                ('example_sentences', n_examples),
                ('by_layer', layers),
                ('note', '100 深度层 + 343 自研释义层全部配仿真例句；覆盖整理层 3667 词为释义卡，无例句，已如实标注。'),
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
    print('  核心词有例句:', sum(1 for w in words if w.get('core_tier') == 'required' and any(s.get('example') for s in w['senses'])))
    print('  自检通过')


if __name__ == '__main__':
    main()
