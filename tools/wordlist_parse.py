#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 教材词表释义解析（两套来源共用）

两套教材词表的释义串遵循同一套语法，只是分隔符不同：

    定义 := 词性组 (SEP 词性组)*
    词性组 := 词性链 义项 (';' 义项)*
    词性链 := POS ('.'? [&＆] POS)*      # '&' 表示该组覆盖多个词性
    SEP   := 空格 | U+3000 全角空格

例：
    2019  "vi.&vt.毕业 n.毕业生"            → [vi&vt: 毕业] [n: 毕业生]
    2019  "n.&vt.交换;交流;交易;兑换"        → [n&vt: 交换, 交流, 交易, 兑换]
    2007  "adj.平静的；镇静的　vt.&vi.（使）平静" → [adj: ...] [vt&vi: ...]

旧写法把整串按分号一刀切，会把不同词性组的义项粘成一条
（如 "vt.毕业 n.毕业生" 被当成 1 个义项），并把词性链残留在义项文本里。
本模块按组解析，一次解决三件事：
  1. 词性组正确切分 → 义项数准确
  2. 词性链完整识别 → pos 不再漏标
  3. 义项文本去掉词性残留 → 释义干净
"""
import re

# 词性标记（两套来源同构）
POS_LIST = ['n', 'vt', 'vi', 'v', 'adj', 'adv', 'prep', 'conj', 'pron',
            'num', 'art', 'int', 'aux', 'modal', 'link-v', 'abbr']

POS_ALT = '|'.join(re.escape(p) for p in POS_LIST)

# 词性链： POS. (&|＆)* POS. ...   （POS 可带或不带尾点；源表存在 Vi./Vt./N. 等大小写变体）
CHAIN_RE = re.compile(
    r'^((?:' + POS_ALT + r')\s*\.?\s*(?:[&＆]\s*(?:' + POS_ALT + r')\s*\.?\s*)*)',
    re.I)

# 分组分隔：U+3000 全角空格，或后接词性标记的半角空格
SEP_RE = re.compile(
    r'[　]|\s(?=(?:' + POS_ALT + r')\s*\.?\s*[&＆]?\s*(?:' + POS_ALT + r')?\s*\.?\s*'
    r'[一-鿿]?[\u4e00-\u9fff])', re.I)

# 词性 → 规范标签
POS_TAGS = {
    'n': ['n'], 'vt': ['v'], 'vi': ['v'], 'v': ['v'], 'adj': ['adj'],
    'adv': ['adv'], 'prep': ['prep'], 'conj': ['conj'], 'pron': ['pron'],
    'num': ['num'], 'art': ['art'], 'int': ['int'], 'aux': ['aux'],
    'modal': ['modal'], 'link-v': ['v'], 'abbr': [],
}


def _groups(defn):
    """把释义串切成 [(词性链原文, [义项...]), ...]"""
    out = []
    for g in SEP_RE.split(defn or ''):
        g = (g or '').strip()
        if not g:
            continue
        m = CHAIN_RE.match(g)
        chain = m.group(1).strip() if m else ''
        rest = g[len(chain):].strip() if m else g
        senses = [s.strip() for s in re.split(r'[；;]', rest) if s.strip()]
        if chain or senses:
            out.append((chain, senses))
    return out


def chain_markers(chain):
    """从词性链原文取出词性列表，如 'vt.&vi.' → ['vt', 'vi']（统一小写）"""
    return [m.lower() for m in re.findall(POS_ALT, chain or '', re.I)]


def chain_tags(chain):
    """词性链 → 规范标签列表（去重、保序）"""
    tags = []
    for p in chain_markers(chain):
        for t in POS_TAGS.get(p, []):
            if t not in tags:
                tags.append(t)
    return tags


def chain_raw(chain):
    """词性链 → 原始标记串，如 'vt.&vi.' → 'vt.&vi'"""
    ms = chain_markers(chain)
    return '&'.join(ms) if ms else 'other'


def parse(defn):
    """解析释义串 → (词性标签列表, 词性原始标记, 义项文本列表)

    词性跨组时取并集；义项按组顺序拼接。
    """
    groups = _groups(defn)
    tags, senses = [], []
    raws = []
    for chain, ss in groups:
        for t in chain_tags(chain):
            if t not in tags:
                tags.append(t)
        if chain:
            for p in chain_markers(chain):
                if p not in raws:
                    raws.append(p)
        senses.extend(ss)
    return tags, '&'.join(raws) if raws else 'other', senses


def sense_key(s):
    """义项去重键：剥掉可能残留的词性前缀后的释义文本"""
    s = (s or '').strip()
    s = re.sub(r'^[&＆]\s*', '', s)
    s = re.sub(r'^(?:' + POS_ALT + r')\s*\.\s*', '', s, flags=re.I)
    return re.sub(r'\s+', '', s.lower())


if __name__ == '__main__':
    tests = [
        "vi.&vt.毕业 n.毕业生",
        "n.&vt.交换;交流;交易;兑换",
        "adj.平静的；镇静的；沉着的　vt.&vi.（使）平静；（使）镇定",
        "vt.&n.（使）担忧；涉及；关系到　n.担心；关注；（利害）关系",
        "vi.&vt.捆扎；包装；打行李　n.小包；包裹",
        "vt.＆Vi.发行（钞票等）；发布（命令）；出版（杂志等）",
        "n.&vi.&vt.前进;发展;促进",
        "n.辩论;争论 vt.&vi.辩论",
    ]
    for t in tests:
        tags, raw, senses = parse(t)
        print(f'{t}\n   → tags={tags} raw={raw} senses={senses}\n')
