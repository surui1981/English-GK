#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 旧课标教材词表 → 素材库第二来源 转换器

输入: 高中人教版英语单词表（必修1至选修11）.doc   （WPS 生成的 legacy OLE2 .doc）
      高中人教版必修1到5单词表（含重点黑体词汇）.doc  （△ 标记文化词汇，用于交叉校验）
输出: data/legacy_lexicon.json   旧课标来源词库（2499 行 → 约 1987 词 + 418 短语）
      data/_legacy_raw.txt       textutil 中间产物缓存

说明:
1. 文本抽取依赖 macOS 内置 textutil（.doc → .txt），不引入额外依赖。
2. 中文释义按版权红线只作**参照素材**存为 cn_raw / senses_raw，
   对外释义必须自行改写措辞（与 2019 教材来源同一规则）。
3. 单词拼写、音标、词性属事实性信息，可直接使用。
4. doc1 与 doc2 内容高度重叠，doc1 仅用于提取 △ 文化词汇标记与交叉校验。
"""
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wordlist_parse as wlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
DOC_MAIN = os.path.join(ROOT, '高中人教版英语单词表（必修1至选修11）.doc')
DOC_MARK = os.path.join(ROOT, '高中人教版必修1到5单词表（含重点黑体词汇）.doc')
RAW_TXT = os.path.join(DATA, '_legacy_raw.txt')
MARK_TXT = os.path.join(DATA, '_legacy_mark_raw.txt')

BOOKS = ['必修1', '必修2', '必修3', '必修4', '必修5', '选修6', '选修7', '选修8']

# 旧课标 40 单元 → 主题（按各单元实际词汇反推，与 2019 来源同样处理源表标题不可信问题）
LEGACY_UNIT_THEME = {
    '必修1 1': ('T-校园生活与自我调整', '校园;朋友;情绪;日常'),
    '必修1 2': ('T-出行方式与旅途见闻', '交通;出行;异域风情;旅行'),
    '必修1 3': ('T-旅行方式与说服表达', '旅行;路线;媒体;沟通'),
    '必修1 4': ('T-自然灾害与应急处置', '自然灾害;地震;预警;救援'),
    '必修1 5': ('T-名人品格与人生智慧', '名人;品格;宽容;自我认知'),

    '必修2 1': ('T-文化遗产与文明传承', '文化遗产;文物;文明交流'),
    '必修2 2': ('T-奥林匹克与体育精神', '奥林匹克;竞技;古希腊'),
    '必修2 3': ('T-信息科技与计算演进', '计算机;科技;信息处理'),
    '必修2 4': ('T-生物多样性与物种保护', '野生动物;栖息地;濒危'),
    '必修2 5': ('T-音乐类型与表演艺术', '音乐;流派;表演'),

    '必修3 1': ('T-传统节日与农事收获', '节日;民俗;丰收'),
    '必修3 2': ('T-饮食结构与营养健康', '饮食;营养;食品'),
    '必修3 3': ('T-人物传记与成长经历', '传记;成长;文学'),
    '必修3 4': ('T-宇宙探索与科学发现', '天文;宇宙;科学'),
    '必修3 5': ('T-加拿大与多元文化', '加拿大;地理;多元文化'),

    '必修4 1': ('T-社会服务与公益事业', '社会;福利;公益'),
    '必修4 2': ('T-农业科技与粮食产量', '农业;粮食;科技'),
    '必修4 3': ('T-幽默语言与喜剧艺术', '幽默;语言;喜剧'),
    '必修4 4': ('T-集体生活与人际交往', '宿舍;集体;人际'),
    '必修4 5': ('T-娱乐产业与流行文化', '娱乐;迪士尼;美国文化'),

    '必修5 1': ('T-医学突破与科学精神', '医学;科学;贡献'),
    '必修5 2': ('T-英国地理与国家认同', '英国;地理;国家'),
    '必修5 3': ('T-旅行见闻与定居生活', '旅行;居住;城市'),
    '必修5 4': ('T-职业世界与工作态度', '职业;记者;职场'),
    '必修5 5': ('T-急救处置与健康护理', '急救;伤病;护理'),

    '选修6 1': ('T-雕塑艺术与审美追求', '雕塑;艺术;审美'),
    '选修6 2': ('T-诗歌韵律与情感表达', '诗歌;韵律;情感'),
    '选修6 3': ('T-健康生活与压力管理', '健康;压力;青春期'),
    '选修6 4': ('T-新能源与气候问题', '能源;温室效应;气候'),
    '选修6 5': ('T-火山地震与自然灾害', '火山;地质;灾害'),

    '选修7 1': ('T-残障保障与生命尊严', '残障;保障;励志'),
    '选修7 2': ('T-科幻想象与幻想文学', '科幻;漫画;幻想'),
    '选修7 3': ('T-海洋生物与鲸类保护', '海洋;鲸鱼;生态'),
    '选修7 4': ('T-南太平洋岛国与人文地理', '巴布亚;岛国;人文'),
    '选修7 5': ('T-大学生活与校园适应', '大学;校园;适应'),

    '选修8 1': ('T-地理大发现与文明扩张', '地理;探险;历史'),
    '选修8 2': ('T-基因科技与克隆伦理', '基因;克隆;科技伦理'),
    '选修8 3': ('T-交通发明与工程史', '交通;发明;工程'),
    '选修8 4': ('T-戏剧改编与语言学习', '戏剧;改编;语言'),
    '选修8 5': ('T-考古发现与文明溯源', '考古;文物;文明'),
}

# 词性标记与词性组解析统一由 tools/wordlist_parse.py 提供，
# 与 build_lexicon.py 共用同一套语法（词性链 + 词性组分隔）。


def doc_to_txt(src, out):
    """用 macOS textutil 把 legacy .doc 转成 txt（带缓存）"""
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(src):
        return out
    cmd = ['textutil', '-convert', 'txt', '-encoding', 'UTF-8', '-output', out, src]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f'textutil 转换失败: {src}\n{r.stderr}')
    return out


def norm_word(w):
    return re.sub(r'\s+', ' ', (w or '').strip())


def clean_ipa(s):
    s = (s or '').strip()
    if not s:
        return ''
    s = s.strip('[]')
    s = s.replace('/ ', '/').strip()
    if s.endswith('/'):
        s = s[:-1].strip()
    return s


def parse_groups(cn):
    """把中文释义拆成 [(词性链原文, [义项...]), ...]

    旧课标表用 U+3000 分词性组，组内词性可成链（vt.&vi.）。
    统一交给 wordlist_parse 处理，避免词性链残留在义项文本里。
    """
    out = []
    for g in re.split(r'[\u3000]', cn or ''):
        g = g.strip()
        if not g:
            continue
        tags, raw, senses = wlparse.parse(g)
        out.append((raw, senses))
    return out


def parse_pos(cn):
    """返回 (词性列表, 原始标记)"""
    tags, raw, _ = wlparse.parse(cn)
    return tags, raw


def split_senses(cn):
    """拆义项：先按词性组切，再按全角/半角分号切，保留原文"""
    _, _, parts = wlparse.parse(cn)
    return parts


def make_id(w, used):
    slug = re.sub(r'[^a-z0-9]+', '_', w.lower()).strip('_')
    base = 'lg_' + slug
    if base not in used:
        used.add(base)
        return base
    import hashlib
    h = hashlib.md5(w.encode('utf-8')).hexdigest()[:6]
    cand = f'{base}_{h}'
    n = 2
    while cand in used:
        cand = f'{base}_{h}_{n}'
        n += 1
    used.add(cand)
    return cand


def parse_main():
    """解析 doc2（TSV 结构）"""
    doc_to_txt(DOC_MAIN, RAW_TXT)
    rows = []
    for ln in open(RAW_TXT, encoding='utf-8'):
        p = ln.rstrip('\n').rstrip('\r').split('\t')
        if len(p) < 5:
            continue
        book, unit, word, cn, ipa = [x.strip() for x in p[:5]]
        if book not in BOOKS or not word or word == '单词':
            continue
        rows.append((book, unit, word, cn, ipa))
    return rows


def parse_culture_marks():
    """从 doc1 提取 △ 标记的文化词汇（教材中标△ = 供了解的专有名词/文化词）"""
    if not os.path.exists(DOC_MARK):
        return set()
    doc_to_txt(DOC_MARK, MARK_TXT)
    marks = set()
    for ln in open(MARK_TXT, encoding='utf-8'):
        s = ln.strip()
        if not s.startswith('△'):
            continue
        w = s[1:].split()[0] if s[1:].split() else ''
        w = re.split(r'[\u3000]', s[1:])[0].strip()
        m = re.match(r'^[A-Za-z][A-Za-z\'\-]*', w)
        if m:
            marks.add(m.group(0).lower())
    return marks


def main():
    rows = parse_main()
    marks = parse_culture_marks()
    print(f'doc2 解析 {len(rows)} 行；doc1 △ 文化词标记 {len(marks)} 个')

    # 同一 headword 在多个单元出现：全部保留位置，取首个为主条目
    units = OrderedDict()
    for book, unit, word, cn, ipa in rows:
        units.setdefault((book, unit), []).append((word, cn, ipa))

    words = []
    seen = set()
    used_ids = set()
    for (book, unit), items in units.items():
        unum = unit.replace('Unit ', '')
        ukey = f'{book} {unum}'
        tname, ttags = LEGACY_UNIT_THEME.get(ukey, (f'旧课标 {ukey}', ''))
        for seq, (w, cn, ipa) in enumerate(items, 1):
            key = norm_word(w)
            if not key or key in seen:
                continue
            seen.add(key)
            tags, raw_pos = parse_pos(cn)
            senses = split_senses(cn)
            is_phrase = ' ' in key
            words.append(OrderedDict([
                ('id', make_id(key, used_ids)),
                ('headword', key),
                ('ipa', clean_ipa(ipa)),
                ('book', book),
                ('unit', unum),
                ('unit_id', ukey),
                ('unit_title', f'旧课标 {book} {unit}'),
                ('theme', tname),
                ('theme_tags', [t for t in ttags.split(';') if t]),
                ('pos', tags),
                ('pos_raw', raw_pos),
                ('definition_raw', cn),
                ('cn_raw', cn),
                ('sense_count', len(senses)),
                ('senses_raw', senses),
                ('is_phrase', is_phrase),
                ('entry_type', 'phrase' if is_phrase else 'word'),
                ('culture_marked', key in marks),
                ('source', '人教版旧课标(2007)必修1-5/选修6-8 单元词表'),
                ('source_id', 'tb2007'),
            ]))

    # 同一 headword 跨单元出现的位置索引
    pos_index = {}
    for book, unit, w, cn, ipa in rows:
        key = norm_word(w)
        pos_index.setdefault(key, []).append(f'{book} {unit.replace("Unit ", "")}')

    lexicon = OrderedDict([
        ('_meta', OrderedDict([
            ('version', '1.0'),
            ('source_id', 'tb2007'),
            ('source_name', '人教版旧课标(2007) 必修1-5 / 选修6-8 单元词表'),
            ('generated_from', os.path.basename(DOC_MAIN)),
            ('row_count', len(rows)),
            ('word_count', len(words)),
            ('unit_count', len(units)),
            ('copyright_note', '教材词表来源为公开教学资料。释义为教材编写组表述,商业使用需自行改写措辞,不可直接照搬。单词拼写、音标、词性属事实性信息,可直接使用。'),
            ('annotation_status', '机械转换产物。theme / tier / sense_levels / error_mechs / is_trap 等教研字段待人工标注。'),
        ])),
        ('words', words),
    ])

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, 'legacy_lexicon.json'), 'w', encoding='utf-8') as f:
        json.dump(lexicon, f, ensure_ascii=False, indent=1)

    # 旧课标单元主题映射（与 2019 的 36 单元主题包分开存放，不合并）
    theme_map = []
    for (book, unit), items in units.items():
        unum = unit.replace('Unit ', '')
        ukey = f'{book} {unum}'
        tname, ttags = LEGACY_UNIT_THEME.get(ukey, (ukey, ''))
        utitle = f'旧课标 {book} {unit}'
        ws = [norm_word(w) for w, _, _ in items]
        multi = sum(1 for _, cn, _ in items if len(split_senses(cn)) >= 3)
        phrases = sum(1 for w, _, _ in items if ' ' in norm_word(w))
        theme_map.append(OrderedDict([
            ('unit_id', ukey), ('book', book), ('unit', unum), ('unit_title', utitle),
            ('theme_name', tname), ('theme_tags', [t for t in ttags.split(';') if t]),
            ('word_count', len(items)),
            ('multi_sense_count', multi),
            ('phrase_count', phrases),
            ('multi_sense_ratio', round(multi / len(items), 3)),
            ('sample_words', ws[:8]),
            ('commercial_role', '旧课标单元（已退役，仅作词库覆盖与释义参照，不做主题包）'),
        ]))
    with open(os.path.join(DATA, 'legacy_unit_theme_map.json'), 'w', encoding='utf-8') as f:
        json.dump(OrderedDict([
            ('_meta', OrderedDict([
                ('version', '1.0'),
                ('unit_count', len(theme_map)),
                ('note', '旧课标(2007)单元主题，按实际词汇反推。该课标已退役，此表仅用于词库覆盖、释义改写参照与主题检索，不用于资料电商主题包。'),
            ])),
            ('units', theme_map)]), f, ensure_ascii=False, indent=1)

    stats = OrderedDict([
        ('row_count', len(rows)),
        ('total_words', len(words)),
        ('total_units', len(units)),
        ('single_word_count', sum(1 for w in words if not w['is_phrase'])),
        ('phrase_count', sum(1 for w in words if w['is_phrase'])),
        ('multi_sense_ge3', sum(1 for w in words if w['sense_count'] >= 3)),
        ('multi_sense_ge4', sum(1 for w in words if w['sense_count'] >= 4)),
        ('total_senses', sum(w['sense_count'] for w in words)),
        ('no_ipa', sum(1 for w in words if not w['ipa'])),
        ('culture_marked', sum(1 for w in words if w['culture_marked'])),
        ('by_book', dict(Counter(w['book'] for w in words))),
        ('sense_count_dist', dict(sorted(Counter(w['sense_count'] for w in words).items()))),
    ])

    with open(os.path.join(DATA, 'stats_tb2007.json'), 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=1)

    print(f"  词条 {len(words)}  单元 {len(units)}  义项总数 {stats['total_senses']}")
    print(f"  单词 {stats['single_word_count']} / 短语 {stats['phrase_count']}")
    print(f"  多义(≥3) {stats['multi_sense_ge3']}  缺音标 {stats['no_ipa']}  文化词标记 {stats['culture_marked']}")
    print(f"  输出: data/legacy_lexicon.json, data/legacy_unit_theme_map.json, data/stats_tb2007.json")

    # 单元词汇采样（用于人工标注主题）
    print('\n--- 各单元代表词（人工反推主题用）---')
    for (book, unit), items in units.items():
        sample = [norm_word(w) for w, _, _ in items[:10]]
        print(f'  {book} U{unit.replace("Unit ", "")}: ' + ' '.join(sample))


if __name__ == '__main__':
    main()
