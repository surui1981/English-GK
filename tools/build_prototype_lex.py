#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 原型义项级词库数据生成器

输入: prototype/index.html        原型手写 WORDS（易错点 / 词根词缀 / 标签文案）
      data/batch1/entries.json   首批 100 词精修结果（生产内容，义项级 schema）
      data/words.sample.json     13 词样例（义项级 schema）
输出: prototype/src/lex.js        const LEX = [...]，供原型注入

为什么要做这一层：
  「掌握度挂在义项上」是教研体系的地基，但原型 WORDS 是扁平的
  （一条 w.def 字符串），拿不到 sense_id，也就挂不上 FSRS。
  这里把三份数据按 headword 合并：
    1. 精修词条优先（生产内容，释义已改写、例句已标注仿真）
    2. 样例数据次之
    3. 都没有时，从原型手写 def 派生一个单义项（保证 8 个原型词也有 sense_id）
  原型手写的 易错点 / 词根词缀 / 标签 一律保留。
"""
import json
import os
import re
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTO = os.path.join(ROOT, 'prototype', 'index.html')
OUT = os.path.join(ROOT, 'prototype', 'src', 'lex.js')


# ── 迷你 JS 字面量解析器（够用即可：对象/数组/双引号字符串/单引号字符串/数字/true/false/null）──
class JsLit:
    def __init__(self, s):
        self.s = s
        self.i = 0

    def ws(self):
        while self.i < len(self.s) and self.s[self.i] in ' \t\r\n':
            self.i += 1

    def value(self):
        self.ws()
        c = self.s[self.i]
        if c == '{':
            return self.obj()
        if c == '[':
            return self.arr()
        if c in '"\'':
            return self.string()
        m = re.match(r'-?\d+(\.\d+)?', self.s[self.i:])
        if m:
            self.i += m.end()
            v = m.group(0)
            return float(v) if '.' in v else int(v)
        for lit, val in (('true', True), ('false', False), ('null', None)):
            if self.s.startswith(lit, self.i):
                self.i += len(lit)
                return val
        raise ValueError('无法解析于 %d: %r' % (self.i, self.s[self.i:self.i + 40]))

    def obj(self):
        out = OrderedDict()
        self.i += 1
        self.ws()
        if self.s[self.i] == '}':
            self.i += 1
            return out
        while True:
            self.ws()
            key = self.string() if self.s[self.i] in '"\'' else self.ident()
            self.ws()
            assert self.s[self.i] == ':', '期望冒号'
            self.i += 1
            out[key] = self.value()
            self.ws()
            if self.s[self.i] == ',':
                self.i += 1
                continue
            assert self.s[self.i] == '}', '期望右花括号'
            self.i += 1
            return out

    def arr(self):
        out = []
        self.i += 1
        self.ws()
        if self.s[self.i] == ']':
            self.i += 1
            return out
        while True:
            out.append(self.value())
            self.ws()
            if self.s[self.i] == ',':
                self.i += 1
                continue
            assert self.s[self.i] == ']', '期望右方括号'
            self.i += 1
            return out

    def ident(self):
        m = re.match(r'[A-Za-z_$][A-Za-z0-9_$]*', self.s[self.i:])
        self.i += m.end()
        return m.group(0)

    def string(self):
        q = self.s[self.i]
        self.i += 1
        buf = []
        while self.s[self.i] != q:
            if self.s[self.i] == '\\':
                self.i += 1
                esc = self.s[self.i]
                buf.append({'n': '\n', 't': '\t', 'r': '\r'}.get(esc, esc))
                self.i += 1
                continue
            buf.append(self.s[self.i])
            self.i += 1
        self.i += 1
        return ''.join(buf)


def extract_words_array(html):
    start = html.index('const WORDS=[')
    end = html.index('\n];', start) + 3
    block = html[start:end]
    # 连外层方括号一起解析，让 value() 走 arr() 分支
    literal = block[block.index('['):block.rindex(']') + 1]
    return JsLit(literal).value()


def strip_html(s):
    return re.sub(r'<[^>]+>', '', s or '')


def pick_focus(senses):
    """焦点义项：优先陷阱义（S3/S2），否则第一个"""
    if not senses:
        return None
    traps = [s for s in senses if s.get('is_trap')]
    if traps:
        return traps[0]
    s2 = [s for s in senses if s.get('sense_level') == 'S2']
    return s2[0] if s2 else senses[0]


# 精修词条未覆盖的原型词，按词根派生规则补一份词形发散数据。
# 形近词优先取原型 QUIZ 里真实出现过的干扰项，保证「发散」与「题型」同源。
FALLBACK_FAMILY = {
    'appreciate': {
        'word_family': ['appreciate', 'appreciation', 'appreciative',
                        'appreciably', 'unappreciated'],
        'confusable': ['approach', 'appraise', 'approve', 'appropriate'],
    },
    'fine': {
        'word_family': ['fine', 'finely', 'fineness', 'refine', 'refinement'],
        'confusable': ['find', 'defined', 'refine', 'finite'],
    },
}


POS_ZH = {'n': 'n.', 'v': 'v.', 'vt': 'v.', 'vi': 'v.', 'adj': 'adj.',
          'adv': 'adv.', 'phrase': 'phr.'}


def pos_display(pos):
    """entries.json 的 pos 是 ['n','phrase'] 数组，转成词卡显示串。"""
    if isinstance(pos, str):
        return pos
    parts = [POS_ZH.get(str(p).lower(), str(p)) for p in pos]
    # 去重保序
    return ' / '.join(dict.fromkeys(parts))


def senses_from(e):
    return [OrderedDict([
        ('sense_id', s['sense_id']),
        ('text', s['text']),
        ('sense_level', s['sense_level']),
        ('error_mech', s.get('error_mech', [])),
        ('is_trap', bool(s.get('is_trap'))),
        ('trap_of', s.get('trap_of', [])),
        ('example', s.get('example', {})),
        ('collocations', s.get('collocations', [])),
    ]) for s in e['senses']]


def main():
    html = open(PROTO, encoding='utf-8').read()
    proto_words = {pw['w']: pw for pw in extract_words_array(html)}
    entries = {e['headword']: e for e in json.load(open(
        os.path.join(ROOT, 'data', 'batch1', 'entries.json'), encoding='utf-8'))}
    sample = {w['headword']: w for w in json.load(open(
        os.path.join(ROOT, 'data', 'words.sample.json'), encoding='utf-8'))['words']}

    # 以 100 精修词为全集，顺序即 entries.json 顺序；手写词排在前面优先展示。
    ordered = list(entries.keys())
    ordered.sort(key=lambda w: 0 if w in proto_words else 1)

    lex = []
    src_stat = {}
    for hw in ordered:
        e = entries[hw]
        pw = proto_words.get(hw)
        senses = senses_from(e)
        origin = '精修词条'

        # 手写文案优先（8 个原型词有 note/root/例句文案）；其余词用精修的 notes（考场判断法）。
        if pw:
            note = pw.get('note', '')
            root = pw.get('root', '')
            tag = pw.get('tag', '熟词僻义')
            tagc = pw.get('tagc', 'g')
            ipa = pw.get('ipa', '') or e.get('ipa', '')
            pos = pw.get('pos', '') or pos_display(e.get('pos', []))
            origin = '手写精修'
        else:
            note = strip_html(e.get('notes', ''))
            root = ''  # 精修词条无词根词缀字段，留空（UI 会条件隐藏）
            tag = '熟词僻义'
            tagc = 'g'
            ipa = e.get('ipa', '')
            pos = pos_display(e.get('pos', []))

        # 词形发散数据：精修词条优先，未覆盖的原型词走内置派生规则。
        src_entry = e or sample.get(hw) or {}
        fb = FALLBACK_FAMILY.get(hw, {})
        word_family = list(src_entry.get('word_family') or fb.get('word_family') or [])
        confusable = list(src_entry.get('confusable') or fb.get('confusable') or [])
        word_family = [x for x in dict.fromkeys(word_family) if x.lower() != hw.lower()]

        # 沉淀生产元数据，供发散复习按题型/难度筛选
        carriers = list(e.get('carriers', []))
        level = e.get('level', '')
        trap_count = sum(1 for s in e['senses'] if s.get('is_trap'))

        focus = pick_focus(senses)
        lex.append(OrderedDict([
            ('w', hw),
            ('ipa', ipa),
            ('pos', pos),
            ('tag', tag),
            ('tagc', tagc),
            ('note', note),
            ('root', root),
            ('origin', origin),
            ('focus', focus['sense_id'] if focus else None),
            ('senses', senses),
            ('word_family', word_family),
            ('confusable', confusable),
            ('carriers', carriers),
            ('level', level),
            ('trap_count', trap_count),
        ]))
        src_stat[origin] = src_stat.get(origin, 0) + 1

    js = ('/* 自动生成 · tools/build_prototype_lex.py —— 请勿手改\n'
          ' * 义项级词库数据：100 精修词 × 手写文案覆盖，含词形网/题型元数据\n'
          ' */\nvar LEX = ' + json.dumps(lex, ensure_ascii=False, indent=1) + ';\n')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)

    total_senses = sum(len(w['senses']) for w in lex)
    print(f'输出: prototype/src/lex.js（{len(lex)} 词 / {total_senses} 义项）')
    for k, v in sorted(src_stat.items()):
        print(f'  {k}: {v} 词')


if __name__ == '__main__':
    main()
