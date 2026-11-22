#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 高考核心词「变体词 + 熟练度反馈」数据生成器

数据源（全部为自研/规范化产物，不含真题原文、选项、解析）：
  data/batch1/entries.json        100 精修词（陷阱义 + 仿真例句）
  data/product/ai_paraphrase.json 443 必考词自研释义
  data/product/colloc_book.json   443 必考词高频搭配
  data/product/context_book.json  1500 词分层释义
  data/product/word_coverage.json 4110 词覆盖索引（取 required 层）

输出：data/product/trap_variants.json

分层：
  L1-精修陷阱 100 词：保留原有高质量仿真例句题与词形/形近变体。
  L2-必考核心 343 词：从自研释义拆义项、从搭配手册取高频搭配，
                      生成「搭配义项判断」题与变体词卡。
两层合计 443 个高考必考核心词，全部可用于熟练度反馈。
"""
import json
import os
import re
from collections import OrderedDict
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCT = os.path.join(ROOT, 'data', 'product')
SRC = os.path.join(ROOT, 'data', 'batch1', 'entries.json')
OUT = os.path.join(PRODUCT, 'trap_variants.json')

IRREGULAR = {
    'bear': 'bore', 'mean': 'meant', 'swing': 'swung',
    'occupy': 'occupied', 'criterion': 'criteria',
    'dominate': 'dominant', 'category': 'categories',
}

POS_ZH = {'n': 'n.', 'v': 'v.', 'vt': 'v.', 'vi': 'v.', 'adj': 'adj.',
          'adv': 'adv.', 'phrase': 'phr.', 'prep': 'prep.', 'conj': 'conj.'}

SUFFIX_NOTES = [
    (('tion', 'sion'), '名词后缀：动作、过程或结果'),
    (('ment',), '名词后缀：行为、状态或结果'),
    (('ance', 'ence'), '名词后缀：性质、状态或行为'),
    (('ness',), '名词后缀：性质或状态'),
    (('ity',), '名词后缀：性质、状态或程度'),
    (('able', 'ible'), '形容词后缀：可…的、能…的'),
    (('ive',), '形容词后缀：有…倾向的'),
    (('al',), '形容词后缀：与…有关的'),
    (('ly',), '副词后缀：以…方式'),
    (('ee',), '名词后缀：受…影响的人'),
    (('er', 'or', 'ist'), '名词后缀：做…的人或物'),
    (('ed',), '过去式/过去分词，也可作形容词'),
    (('ing',), '现在分词/动名词，也可作形容词'),
]


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def jload(name):
    return load(os.path.join(PRODUCT, name))


def pick_focus(senses):
    traps = [s for s in senses if s.get('is_trap')]
    if traps:
        return traps[0]
    s2 = [s for s in senses if s.get('sense_level') == 'S2']
    return s2[0] if s2 else (senses[0] if senses else None)


def word_forms(hw):
    out = {hw.lower()}
    if hw.endswith('e'):
        out.update([(hw + 's').lower(), (hw + 'd').lower(), (hw[:-1] + 'ing').lower()])
    elif hw.endswith('y') and len(hw) > 1 and hw[-2] not in 'aeiou':
        out.update([(hw[:-1] + 'ies').lower(), (hw[:-1] + 'ied').lower()])
    elif re.search(r'(s|x|ch|sh)$', hw.lower()):
        out.update([(hw + 'es').lower(), (hw + 'ed').lower(),
                    (hw + 'ing').lower()])
    else:
        out.update([(hw + 's').lower(), (hw + 'ed').lower(),
                    (hw + 'ing').lower()])
    if hw in IRREGULAR:
        out.add(IRREGULAR[hw].lower())
    return out


def is_inflection(hw, form):
    return form.lower() in word_forms(hw)


def suffix_note(form):
    f = form.lower()
    for suffixes, note in SUFFIX_NOTES:
        if any(f.endswith(sx) for sx in suffixes):
            return note
    return '同词族高频派生词，先确认词性再定义项'


def locate_answer(hw, sentence):
    if hw in IRREGULAR:
        candidates = [IRREGULAR[hw]]
    else:
        candidates = [hw]
        if hw.endswith('e'):
            candidates += [hw[:-1] + 'ing', hw + 'd', hw + 's']
        elif hw.endswith('y') and len(hw) > 1 and hw[-2] not in 'aeiou':
            candidates += [hw[:-1] + 'ies', hw[:-1] + 'ied', hw + 'ing']
        else:
            candidates += [hw + 'ing', hw + 'ed', hw + 'es', hw + 's']
    candidates = sorted(set(candidates), key=len, reverse=True)
    pattern = r'\b(?:' + '|'.join(re.escape(c) for c in candidates) + r')\b'
    m = re.search(pattern, sentence, re.I)
    if not m:
        return hw, sentence
    return m.group(0), sentence[:m.start()] + '___' + sentence[m.end():]


def split_meanings(text):
    parts = [p.strip() for p in re.split(r'[；;]', text or '') if p.strip()]
    return parts


def dedupe(items):
    out, seen = [], set()
    for x in items:
        if not x:
            continue
        k = str(x).strip().lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(str(x).strip())
    return out


# ───────────────────────── L1：100 精修词 ─────────────────────────

def make_l1_variants(entry, sense):
    hw = entry['headword']
    variants, seen = [], set()

    def add(form, kind, label, note):
        key = form.lower()
        if not form or key in seen:
            return
        seen.add(key)
        variants.append(OrderedDict([
            ('form', form), ('kind', kind), ('label', label), ('note', note),
        ]))

    for form in (entry.get('word_family') or [])[:3]:
        if form.lower() == hw.lower():
            continue
        inflected = is_inflection(hw, form)
        add(form,
            'inflection' if inflected else 'derivation',
            '词形变化' if inflected else '词形派生',
            suffix_note(form))

    for form in (entry.get('confusable') or [])[:2]:
        if form.lower() in word_forms(hw):
            continue
        add(form, 'confusable', '形近易混',
            '与 %s 拼写或读音接近，先看搭配再定词' % hw)

    for form in (sense.get('collocations') or [])[:3]:
        add(form, 'collocation', '搭配变体', '高考高频语境，建议整块记忆')

    for form in (sense.get('trap_of') or [])[:2]:
        add(form, 'common', '常见义干扰',
            '看到这个词形先别急着套这个常见义')
    return variants


def make_l1_distractors(entry, answer_form, all_headwords, need=3):
    hw = entry['headword']
    banned = set(word_forms(hw))
    banned.add(answer_form.lower())
    pool = []

    def add(c):
        if not c or c.lower() in banned or c in pool:
            return
        pool.append(c)

    for c in (entry.get('confusable') or []):
        add(c)
    for c in (entry.get('word_family') or []):
        add(c)
    if len(pool) < need:
        start = ord(hw[0].lower())
        near = sorted(all_headwords, key=lambda x: (abs(ord(x[0].lower()) - start), x))
        for c in near:
            if len(pool) >= need:
                break
            add(c)
    if len(pool) < need:
        raise ValueError('L1 干扰项不足：%s' % hw)
    return pool[:need]


def build_l1_word(idx, e, all_headwords):
    hw = e['headword']
    sense = pick_focus(e['senses'])
    if not sense or not sense.get('is_trap'):
        raise ValueError('%s 没有可用陷阱义' % hw)

    answer_form, stem = locate_answer(hw, sense['example']['en'])
    variants = make_l1_variants(e, sense)
    if len(variants) < 6:
        raise ValueError('%s L1 变体不足：%d' % (hw, len(variants)))

    common = list(sense.get('trap_of') or [])
    if not common:
        common = [s['text'] for s in e['senses']
                  if s['sense_id'] != sense['sense_id']][:2]

    distractors = make_l1_distractors(e, answer_form, all_headwords)
    answer_index = idx % 4
    options = [None] * 4
    options[answer_index] = answer_form
    di = 0
    for pos in range(4):
        if pos != answer_index:
            options[pos] = distractors[di]
            di += 1

    letter = 'ABCD'[answer_index]
    carrier = sense['example'].get('carrier') or (e.get('carriers') or ['C1'])[0]
    err_code = next((x for x in sense.get('error_mech') or [] if x.startswith('E')), 'E1')
    collocations = sense.get('collocations') or []
    explanation = (
        '【考场动作】先看空前后的搭配线索：%s。此处应取「%s」，而不是「%s」。\n'
        '【为什么选 %s】%s 在这句话里 = <b>%s</b>。仿真语境：%s\n'
        '【常见义干扰】%s 是最容易被直接套进来的常见义。\n'
        '【变体提醒】%s 都和 %s 同族或形近；先看清词性与后缀。'
    ) % (
        collocations[0] if collocations else sense['example']['en'][:60] + '…',
        sense['text'], '、'.join(common[:2]) if common else '常规义',
        letter, answer_form, sense['text'], sense['example']['zh'],
        '、'.join(common[:2]) if common else '常规义',
        '、'.join(v['form'] for v in variants[:4]), hw,
    )
    question = OrderedDict([
        ('no', idx), ('stem', stem), ('stem_cn', sense['example']['zh']),
        ('options', options), ('answer_index', answer_index),
        ('answer_text', answer_form), ('explanation', explanation),
        ('carrier', carrier),
        ('difficulty', 'hard' if sense.get('sense_level') in ('S3', 'S4')
         else ('mid' if sense.get('sense_level') == 'S2' else 'easy')),
        ('module', 'E1_熟词僻义'), ('headword', hw), ('errCode', err_code),
        ('type', carrier),
        ('source', sense['example'].get('source', '仿真例句 · 高考高频句式')),
        ('mode', 'sentence'), ('featured', True),
    ])
    return OrderedDict([
        ('no', idx), ('headword', hw), ('ipa', e.get('ipa', '')),
        ('level', e.get('level', '')), ('layer', 'L1-精修陷阱'),
        ('featured', True),
        ('source_basis', '100 精修词 · 义项级词库 + 仿真语境例句'),
        ('sense_id', sense['sense_id']), ('sense_text', sense['text']),
        ('sense_level', sense.get('sense_level', '')),
        ('common_senses', common), ('answer_form', answer_form),
        ('example', sense['example']), ('patterns', collocations),
        ('variants', variants), ('question', question),
    ])


# ───────────────────────── L2：343 必考核心词 ─────────────────────────

def shape_neighbors(hw, all_headwords, k=2):
    scored = []
    for other in all_headwords:
        if other == hw:
            continue
        r = SequenceMatcher(None, hw.lower(), other.lower()).ratio()
        if r >= 0.72 or (len(hw) >= 5 and hw[:3].lower() == other[:3].lower()):
            scored.append((r, -abs(len(hw) - len(other)), other))
    scored.sort(reverse=True)
    if not scored:
        start = hw[0].lower()
        near = sorted(all_headwords, key=lambda x: (abs(ord(x[0].lower()) - ord(start)), x))
        return [x for x in near if x != hw][:k]
    return [x[2] for x in scored[:k]]


def l2_source(para_w, colloc_w, context_w, cov_w):
    para_senses = (para_w or {}).get('senses', [])
    subs = []
    for s in para_senses:
        subs.extend(split_meanings(s.get('meaning', '')))
    subs = dedupe(subs)
    if not subs:
        for g in (colloc_w or {}).get('groups', []):
            subs.extend(split_meanings(g.get('sense', '')))
        subs = dedupe(subs)
    if not subs:
        for s in (context_w or {}).get('senses', []):
            if s.get('text'):
                subs.append(s['text'])
        subs = dedupe(subs)

    groups = (colloc_w or {}).get('groups', [])

    def group_score(g):
        cs = g.get('collocations', [])
        return (
            2 if any(c.get('example_method') == '手工精修' for c in cs) else 0,
            1 if any(c.get('example') for c in cs) else 0,
            len(cs),
        )

    mg = sorted(groups, key=group_score, reverse=True)[0] if groups else {}
    group_subs = dedupe(split_meanings(mg.get('sense', '')))
    candidates = [x for x in group_subs if x in subs] or group_subs or subs

    ex = {}
    ex_cands = [c for c in mg.get('collocations', []) if c.get('example')]
    if ex_cands:
        ex = next((c for c in ex_cands if c.get('example_method') == '手工精修'), ex_cands[0])
    ex_zh = ex.get('example_zh', '')

    if candidates:
        if len(candidates) > 1 and ex_zh:
            def overlap(s):
                chars = re.sub(r'[、，；\s]', '', s)
                return sum(1 for ch in set(chars) if ch in ex_zh)
            # 同分时取靠后的义项：更符合「僻义优先」的专项口径。
            focus = max(candidates, key=lambda s: (overlap(s), candidates.index(s)))
        else:
            focus = candidates[-1]
    else:
        focus = subs[0] if subs else ''

    others = [x for x in subs if x != focus]
    common = others[0] if others else (subs[0] if subs else '')

    # 先取含目标义的释义组搭配，保证搭配与考点对齐；再按原顺序补齐。
    preferred = [s for s in para_senses if focus and focus in s.get('meaning', '')]
    ordered_senses = preferred + [s for s in para_senses if s not in preferred]
    patterns = []
    for s in ordered_senses:
        patterns.extend([p.strip() for p in re.split(r'[,，、]', s.get('collocation', '')) if p.strip()])
    for c in mg.get('collocations', [])[:5]:
        if c.get('text'):
            patterns.append(c['text'])
    for s in (context_w or {}).get('senses', []):
        patterns.extend(s.get('collocations') or [])
    patterns = dedupe(patterns)
    if not patterns and focus:
        patterns = [focus]

    carrier = 'C1'
    for s in (context_w or {}).get('senses', []):
        if s.get('carrier'):
            carrier = s['carrier']
            break
    example = OrderedDict([
        ('en', ex.get('example', '')),
        ('zh', ex.get('example_zh', '')),
        ('source', ex.get('source', '自研释义 + 高频搭配辨析（无语境例句，不含真题）')),
        ('carrier', carrier),
    ])

    return {
        'subs': subs, 'common': common, 'focus': focus,
        'patterns': patterns, 'example': example,
        'groups': groups, 'cov': cov_w or {}, 'single': len(subs) <= 1,
    }


def make_l2_variants(hw, info, neighbors):
    variants, seen = [], set()

    def add(form, kind, label, note):
        key = form.lower()
        if not form or key in seen:
            return
        seen.add(key)
        variants.append(OrderedDict([
            ('form', form), ('kind', kind), ('label', label), ('note', note),
        ]))

    # 词形变化：仅用规则屈折，不臆造派生词。
    forms = sorted([f for f in word_forms(hw) if f != hw.lower()], key=len)
    for form in forms[:2]:
        add(form, 'inflection', '词形变化', '高考阅读中常见的屈折形式')

    for form in [x for x in info['subs'] if x != info['focus']][:3]:
        add(form, 'sense', '义项变体', '同一个词在不同语境下的另一个高频义')

    for form in info['patterns'][:3]:
        add(form, 'collocation', '搭配变体', '高考高频词块，建议整体记忆')

    if info['common']:
        add(info['common'], 'common', '常见义干扰',
            '看到这个词先别急着套最常见义，先看搭配')

    for nb in neighbors[:2]:
        add(nb, 'confusable', '形近易混',
            '与 %s 拼写接近，考场先看清后缀和搭配' % hw)

    pos = info['cov'].get('pos') or ''
    if isinstance(pos, list):
        pos = ' / '.join(POS_ZH.get(str(x).lower(), str(x)) for x in pos)
    pos = str(pos).strip()
    if pos:
        add(pos, 'pos', '词性提示', '先判词性再定义项，避免词性误判')

    if len(variants) < 6:
        add('高考高频核心词', 'tip', '语境提示',
            '按搭配判断义项，不要按中文直译硬套')
    return variants


def make_l2_question(idx, hw, info, neighbors, focus_map):
    subs = info['subs']
    focus = info['focus'] or (subs[0] if subs else hw)
    pattern = info['patterns'][0] if info['patterns'] else focus

    pool = [focus]
    pool += [x for x in subs if x != focus]
    for nb in neighbors:
        if focus_map.get(nb):
            pool.append(focus_map[nb])
    if len(dedupe(pool)) < 4:
        pool += [v for v in focus_map.values() if v]
    options_pool = dedupe(pool)[:4]
    if len(options_pool) < 4:
        options_pool += ['义项待辨析'] * (4 - len(options_pool))

    answer_index = idx % 4
    options = [None] * 4
    options[answer_index] = focus
    di = 0
    for pos in range(4):
        if pos != answer_index:
            options[pos] = options_pool[di] if di < len(options_pool) else '其他义项'
            di += 1
    # 保证选项不重复，且不把正确答案重复塞进干扰项
    seen = {focus}
    for pos in range(4):
        if pos == answer_index:
            continue
        if options[pos] in seen:
            for cand in options_pool:
                if cand not in seen:
                    options[pos] = cand
                    break
        seen.add(options[pos])

    letter = 'ABCD'[answer_index]
    carrier = info['example'].get('carrier') or 'C1'
    if info.get('single'):
        trap_line = '【义项聚焦】本词在高考中主要考这一条义项，重点看搭配是否匹配。'
    else:
        trap_line = '【常见义干扰】%s 是更常见的日常义，放在这个搭配里往往讲不通。' % (
            info['common'] or '日常常用义')
    explanation = (
        '【考场动作】先抓住整个搭配「%s」，不要逐词直译。\n'
        '【为什么选 %s】%s 在该搭配中取「%s」。\n'
        '%s\n'
        '【变体提醒】本词还可表示 %s；先判语境，再定义项。'
    ) % (
        pattern, letter, hw, focus, trap_line,
        '、'.join([x for x in subs if x != focus][:3]) or '其他搭配义',
    )
    return OrderedDict([
        ('no', idx),
        ('stem', 'In “%s”, the word “%s” most probably means ___.' % (pattern, hw)),
        ('stem_cn', '在搭配「%s」中，%s 的义项更接近「%s」。' % (pattern, hw, focus)),
        ('options', options), ('answer_index', answer_index),
        ('answer_text', focus), ('explanation', explanation),
        ('carrier', carrier),
        ('difficulty', 'hard' if len(subs) >= 3 else ('mid' if len(subs) == 2 else 'easy')),
        ('module', 'E1_熟词僻义'), ('headword', hw), ('errCode', 'E1'),
        ('type', carrier),
        ('source', '自研释义 + 高频搭配辨析（仿真语境，不含真题原文/选项/解析）'),
        ('mode', 'collocation'), ('featured', False),
    ])


def build_l2_word(idx, hw, para_map, colloc_map, context_map, cov_map,
                  all_headwords, focus_map):
    para_w = para_map.get(hw, {})
    colloc_w = colloc_map.get(hw, {})
    context_w = context_map.get(hw, {})
    cov_w = cov_map.get(hw, {})
    info = l2_source(para_w, colloc_w, context_w, cov_w)
    neighbors = shape_neighbors(hw, all_headwords, 2)
    variants = make_l2_variants(hw, info, neighbors)
    if len(variants) < 6:
        raise ValueError('%s L2 变体不足：%d' % (hw, len(variants)))

    carriers = (cov_w.get('theme') or '')
    sense_id = 'core_' + re.sub(r'[^A-Za-z0-9]+', '_', hw).strip('_')
    return OrderedDict([
        ('no', idx), ('headword', hw),
        ('ipa', cov_w.get('ipa') or colloc_w.get('ipa', '')),
        ('level', colloc_w.get('level') or cov_w.get('tier') or ''),
        ('layer', 'L2-必考核心'), ('featured', False),
        ('source_basis', '必考层自研释义 + 高频搭配 + 义项规范化整理'),
        ('sense_id', sense_id), ('sense_text', info['focus']),
        ('sense_level', 'S2' if len(info['subs']) > 1 else 'S1'),
        ('common_senses', [info['common']] if info['common'] else []),
        ('answer_form', info['focus']),
        ('example', info['example']),
        ('patterns', info['patterns']),
        ('variants', variants),
        ('question', make_l2_question(idx, hw, info, neighbors, focus_map)),
        ('note', (context_w.get('note') or colloc_w.get('note') or '')[:160]),
        ('theme', carriers),
    ])


# ───────────────────────── L3：688 高频词轻量词卡（¥2.9 资料包权益） ─────────────────────────
# 这批词来自用户提供的《核心高频688词汇》，自带考频/中文义，但多数无自研搭配与例句。
# 轻量标准：用中文义拆义项 + 规则词形变化 + 形近词 + 常见义干扰，保证每词 ≥6 条变体 + 1 道义项辨析题。
# 对外不呈现真题原文；例句字段留空或标为「义项辨析（无语境例句）」。

def make_l3_variants(hw, senses, common, neighbors, pos, freq=0):
    variants, seen = [], set()

    def add(form, kind, label, note):
        key = str(form).strip().lower()
        if not form or key in seen:
            return
        seen.add(key)
        variants.append(OrderedDict([
            ('form', form), ('kind', kind), ('label', label), ('note', note),
        ]))

    # 1) 义项变体：把中文义拆出的其余义项作为同词不同语境义
    for s in [x for x in senses if x != common][:3]:
        add(s, 'sense', '义项变体', '同一个词在不同语境下的另一个高频义')
    # 2) 词形变化：只用最稳妥的 -s/-es 复数或三单形式，不臆造 -ed/-ing
    plurals = [f for f in word_forms(hw) if f != hw.lower() and f.endswith(('s', 'es'))]
    if plurals:
        add(sorted(plurals, key=len)[0], 'inflection', '词形变化', '高考阅读中常见的复数/三单形式')
    # 3) 常见义干扰
    if common:
        add(common, 'common', '常见义干扰', '看到这个词先别急着套最常见义，先看搭配')
    # 4) 形近易混
    for nb in neighbors[:2]:
        add(nb, 'confusable', '形近易混', '与 %s 拼写接近，考场先看清词尾和搭配' % hw)
    # 5) 词性提示
    if pos:
        add(pos, 'pos', '词性提示', '先判词性再定义项，避免词性误判')
    # 兜底：确保每词至少 6 条（考频高时用考频提示，避免与其他 tip 文案重复）
    if len(variants) < 6 and freq:
        add('考频 %d · 高考核心高频词' % freq, 'tip', '语境提示',
            '复现考频高，优先掌握核心义项与常见搭配')
    if len(variants) < 6:
        add('结合语境判断义项', 'tip', '语境提示', '不要按中文直译硬套，先看这个词在句中的作用')
    if len(variants) < 6:
        add('按词性辨析义项', 'tip', '语境提示', '先定词性再定义项，避免常见义先入为主')
    return variants


def make_l3_question(idx, hw, senses, common, pos):
    focus = senses[0] if senses else hw
    distract = [s for s in senses if s != focus]
    pool = dedupe(distract + [common, '其他义项', '常见义干扰'])
    answer_index = idx % 4
    options = [None] * 4
    options[answer_index] = focus
    di = 0
    for p in range(4):
        if p != answer_index:
            options[p] = pool[di] if di < len(pool) else '其他义项'
            di += 1
    # 去重，避免干扰项与答案重复
    seen = {focus}
    for p in range(4):
        if p == answer_index:
            continue
        if options[p] in seen:
            for cand in pool + ['其他义项', '常见义干扰', '词义待辨析']:
                if cand not in seen:
                    options[p] = cand
                    break
        seen.add(options[p])
    letter = 'ABCD'[answer_index]
    explanation = (
        '【考场动作】先看该词在句中的词性与搭配，不要直接套中文最常见义。\n'
        '【为什么选 %s】%s 在此语境取「%s」。\n'
        '【常见义干扰】%s 往往是最先被套入的日常义，需结合上下文排除。\n'
        '【变体提醒】本词还可表示 %s；判语境再定义项。'
    ) % (
        letter, hw, focus, common or '日常常用义',
        '、'.join(distract[:3]) or '其他搭配义',
    )
    return OrderedDict([
        ('no', idx),
        ('stem', 'In this list, the high-frequency word "%s" most probably means ___.' % hw),
        ('stem_cn', '高频词「%s」在高考语境中最接近下列哪个义项？' % hw),
        ('options', options), ('answer_index', answer_index),
        ('answer_text', focus), ('explanation', explanation),
        ('carrier', 'C1'),
        ('difficulty', 'hard' if len(senses) >= 3 else ('mid' if len(senses) == 2 else 'easy')),
        ('module', 'E1_熟词僻义'), ('headword', hw), ('errCode', 'E1'),
        ('type', 'C1'),
        ('source', '688 高频词中文义拆分 · 义项辨析（仿真语境，不含真题原文/选项/解析）'),
        ('mode', 'collocation'), ('featured', False),
    ])


def build_l3_word(idx, rec, neighbors, pos):
    hw = rec['headword']
    senses = dedupe(rec.get('senses') or [])
    if not senses:
        senses = [rec['cn_raw'] or hw]
    common = senses[-1] if len(senses) > 1 else (senses[0] if senses else '')
    variants = make_l3_variants(hw, senses, common, neighbors, pos, rec.get('freq', 0))
    if len(variants) < 6:
        raise ValueError('%s L3 变体不足：%d' % (hw, len(variants)))
    sense_id = 'hf688_' + re.sub(r'[^A-Za-z0-9]+', '_', hw).strip('_')
    return OrderedDict([
        ('no', idx), ('headword', hw),
        ('ipa', rec.get('ipa') or ''),
        ('level', '高频'), ('layer', 'L3-高频688'), ('featured', False),
        ('access', 'materials'),
        ('freq', rec.get('freq', 0)),
        ('source_basis', '用户提供的 688 高频词表 · 中文义拆分义项（轻量词卡）'),
        ('sense_id', sense_id), ('sense_text', senses[0] if senses else ''),
        ('sense_level', 'S2' if len(senses) > 1 else 'S1'),
        ('common_senses', [common] if common else []),
        ('answer_form', senses[0] if senses else ''),
        ('example', OrderedDict([
            ('en', ''), ('zh', ''),
            ('source', '义项辨析 · 无独立语境例句（不含真题）'),
            ('carrier', 'C1'),
        ])),
        ('patterns', senses[:4]),
        ('variants', variants),
        ('question', make_l3_question(idx, hw, senses, common, pos)),
    ])


def main():
    entries = load(SRC)
    if len(entries) != 100:
        raise SystemExit('期望 100 精修词，实际 %d' % len(entries))

    para = jload('ai_paraphrase.json')
    colloc = jload('colloc_book.json')
    context = jload('context_book.json')
    coverage = jload('word_coverage.json')

    required = [w for w in coverage['words'] if w.get('tier') == 'required']
    if len(required) != 443:
        raise SystemExit('期望必考层 443 词，实际 %d' % len(required))

    para_map = {w['w']: w for w in para['words']}
    colloc_map = {w['headword']: w for w in colloc['words']}
    context_map = {w['headword']: w for w in context['words']}
    cov_map = {w['w']: w for w in required}
    all_headwords = [w['w'] for w in required]

    focus_map = {}
    for hw in all_headwords:
        pw = para_map.get(hw, {})
        subs = []
        for s in pw.get('senses', []):
            subs.extend(split_meanings(s.get('meaning', '')))
        subs = dedupe(subs)
        focus_map[hw] = subs[-1] if subs else hw

    refined = {e['headword'] for e in entries}
    words = []
    for idx, e in enumerate(entries, 1):
        words.append(build_l1_word(idx, e, all_headwords))

    for hw in all_headwords:
        if hw in refined:
            continue
        words.append(build_l2_word(
            len(words) + 1, hw, para_map, colloc_map, context_map,
            cov_map, all_headwords, focus_map))

    # ── L3：688 高频词中的新词（不与现有 443 重合），轻量词卡 ──
    hf = jload('highfreq688.json')
    existing = {w['headword'].lower() for w in words}
    # 规范音标：只接受 /.../ 包裹的国际音标（语境版优先，覆盖索引次之）；
    # 两者都没有时留空，绝不用 doc 转码后残缺的问号音标。
    def valid_ipa(s):
        return isinstance(s, str) and s.startswith('/') and s.endswith('/') and '?' not in s

    ipa_map = {}
    for w in context['words']:
        if valid_ipa(w.get('ipa')):
            ipa_map.setdefault(w['headword'].lower(), w['ipa'])
    for w in coverage['words']:
        if valid_ipa(w.get('ipa')):
            ipa_map.setdefault(w['w'].lower(), w['ipa'])
    # 形近词候选池：现有全词表 + 688 全词表
    neighbor_pool = list(existing) + [r['headword'] for r in hf['words']]
    l3_added = 0
    for rec in hf['words']:
        hw = rec['headword']
        if hw in existing:
            continue  # 已在 L1/L2，保留原精修词卡
        r = OrderedDict(rec)
        if ipa_map.get(hw):
            r['ipa'] = ipa_map[hw]
        neighbors = shape_neighbors(hw, neighbor_pool, 2)
        pos = ''
        cw = next((x for x in coverage['words'] if x['w'].lower() == hw), None)
        if cw and cw.get('pos'):
            p = cw['pos']
            pos = ' / '.join(POS_ZH.get(str(x).lower(), str(x)) for x in p) if isinstance(p, list) else str(p)
        words.append(build_l3_word(len(words) + 1, r, neighbors, pos))
        existing.add(hw)
        l3_added += 1

    variants_total = sum(len(w['variants']) for w in words)
    types = sorted({v['label'] for w in words for v in w['variants']})
    featured = sum(1 for w in words if w.get('featured'))
    l3 = sum(1 for w in words if w.get('layer') == 'L3-高频688')
    l2 = len(words) - featured - l3
    materials_words = featured + l3  # ¥2.9 资料包可解锁：免费 100 + 高频 688 新词

    data = OrderedDict([
        ('meta', OrderedDict([
            ('name', '高考核心词变体库 · 熟词僻义专项'),
            ('status', '正式版'),
            ('source', 'batch1 精修词 + 必考层自研释义 + 高频搭配 + 覆盖索引 + 688 高频词表'),
            ('copyright', '例句与搭配语境均为自研仿真，不含真题原文、真题选项与真题解析。'),
            ('coverage', OrderedDict([
                ('total_words', len(words)),
                ('required_words', len(required)),
                ('featured_words', featured),
                ('extended_words', l2),
                ('highfreq_words', l3),
                ('materials_words', materials_words),
                ('questions', len(words)),
                ('featured_questions', featured),
                ('variants_total', variants_total),
                ('variants_per_word_min', min(len(w['variants']) for w in words)),
                ('layers', OrderedDict([
                    ('L1-精修陷阱', featured), ('L2-必考核心', l2),
                    ('L3-高频688', l3),
                ])),
                ('access', OrderedDict([
                    ('free', featured), ('materials', l3), ('all', l2),
                ])),
                ('types', types),
            ])),
        ])),
        ('words', words),
    ])

    os.makedirs(PRODUCT, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('输出: %s' % OUT)
    print('  %d 核心词（精修 %d + L2必考 %d + L3高频688新词 %d）/ %d 题 / %d 条变体提示' % (
        len(words), featured, l2, l3, len(words), variants_total))
    print('  门禁分层：免费 %d / ¥2.9资料包累计 %d / 全包 %d' % (
        featured, materials_words, len(words)))
    print('  每词至少 %d 条变体；类型：%s' % (
        min(len(w['variants']) for w in words), '、'.join(types)))


if __name__ == '__main__':
    main()
