#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 教材词表 → 教研体系词库 转换器

输入: 新人教高中单词表全七册精装版.xls
输出: data/textbook_lexicon.json   标准化词库（未标注教研标签的底座）
      data/unit_theme_map.json     36 单元 → 高考主题包映射
      data/stats_tb2019.json       单来源统计（合并后总统计见 data/stats.json）

设计要点:
1. 教材词表是「教学底座」,不是「高考词库」——两者必须区分。教材 2596 词,
   高考考纲约 3500 词,缺口约 900 词需另行补齐。
2. 教材释义是第一义项,高考真正考的多为第二及之后的义项(熟词僻义)。
   因此这里保留原始释义全文,不做义项精简——义项拆分与 S 层级标注
   需教研人工完成(见 docs/词汇教研体系v1.md §8 SOP)。
3. 36 个单元天然构成主题维(T5),可直接打包为资料电商产品。
"""
import xlrd, json, re, os, sys
from collections import OrderedDict, Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wordlist_parse as wlparse

SRC = '新人教高中单词表全七册精装版.xls'
OUT_DIR = 'data'

# ---------------------------------------------------------------- 单元 → 高考主题包
# 依据: 新人教版(2019)必修/选择性必修 单元主题 与 高考真题话题的对应关系
UNIT_THEME = {
    '必修1 1.0': ('T-校园生活与自我介绍', '校园生活;自我介绍;人际交流', '必修一 U1 Teenage Life'),
    '必修1 2.0': ('T-学习成长与课外活动', '学习;成长;社团活动', '必修一 U2 Sports and Fitness'),
    '必修1 3.0': ('T-旅行与世界探索', '旅行;世界遗产;文化交流', '必修一 U3 Travel Around the World'),
    '必修1 4.0': ('T-体育运动与健康意志', '运动;体育精神;团队合作', '必修一 U4 Natural Disasters'),
    '必修1 5.0': ('T-自然灾害与生存自救', '自然灾害;环境保护;应急避险', '必修一 U5 Languages Around the World'),
    '必修1 6.0': ('T-语言文字与历史文化', '语言;文字;历史文化遗产', '必修一 U6 At Work'),

    '必修2 1.0': ('T-文化遗产与保护', '文化遗产;遗产保护;传统文化', '必修二 U1 Cultural Heritage'),
    '必修2 2.0': ('T-生物多样性与野生动物', '生物多样性;濒危物种;生态保护', '必修二 U2 Wildlife Protection'),
    '必修2 3.0': ('T-网络媒体与信息安全', '互联网;网络素养;信息甄别', '必修二 U3 The Internet'),
    '必修2 4.0': ('T-历史文化与哲学智慧', '历史人物;哲学;传统美德', '必修二 U4 History and Traditions'),
    '必修2 5.0': ('T-音乐与艺术创作', '音乐;艺术;创作与表演', '必修二 U5 Music'),

    '必修3 1.0': ('T-传统节日与民俗', '传统节日;民俗;文化传承', '必修三 U1 Festivals and Celebrations'),
    '必修3 2.0': ('T-道德品质与职业伦理', '道德;职业伦理;医德与责任', '必修三 U2 Morals and Virtues'),
    '必修3 3.0': ('T-多元文化与美国社会', '多元文化;移民;社会生活', '必修三 U3 Diverse Cultures'),
    '必修3 4.0': ('T-航天科技与探索精神', '航天;科技;探索与奉献', '必修三 U4 Space Exploration'),
    '必修3 5.0': ('T-金钱观与人生价值', '金钱;价值观;人生选择', '必修三 U5 The Value of Money'),

    '选修1 1.0': ('T-医学成就与科学精神', '医学;科学发现;科学家精神', '选择性必修一 U1 People of Achievement'),
    '选修1 2.0': ('T-智能生活与科技设备', '科技;智能家居;生活便利', '选择性必修一 U2 Looking into the Future'),
    '选修1 3.0': ('T-国家公园与自然保护', '国家公园;自然保护;人与自然', '选择性必修一 U3 Fascinating Parks'),
    '选修1 4.0': ('T-身体语言与非言语沟通', '肢体语言;人际沟通;文化差异', '选择性必修一 U4 Body Language'),
    '选修1 5.0': ('T-粮食安全与农业科技', '粮食;农业;可持续发展', '选择性必修一 U5 Working the Land'),

    '选修2 1.0': ('T-传染病防控与公共卫生', '传染病;防控;公共卫生', '选择性必修二 U1 A Healthy Life'),
    '选修2 2.0': ('T-留学适应与跨文化', '留学;跨文化适应;自我成长', '选择性必修二 U2 The Changing World'),
    '选修2 3.0': ('T-饮食文化与美食', '饮食;美食;中西文化差异', '选择性必修二 U3 Food and Culture'),
    '选修2 4.0': ('T-自然奇观与探险', '自然奇观;探险;旅行', '选择性必修二 U4 History of Transport'),
    '选修2 5.0': ('T-急救医学与健康防护', '急救;医学;健康防护', '选择性必修二 U5 Scenic Spots'),

    '选修3 1.0': ('T-美术与艺术鉴赏', '美术;艺术鉴赏;审美', '选择性必修三 U1 Fascinating Parks'),
    '选修3 2.0': ('T-健康生活与成瘾防治', '健康;成瘾;医学与心理', '选择性必修三 U2 The Body Language'),
    '选修3 3.0': ('T-环境治理与可持续发展', '环境;气候;可持续发展', '选择性必修三 U3 Green Energy'),
    '选修3 4.0': ('T-航海冒险与坚韧品格', '冒险;坚韧;品格', '选择性必修三 U4 Astronomy'),
    '选修3 5.0': ('T-诗歌韵律与文学欣赏', '诗歌;韵律;文学鉴赏', '选择性必修三 U5 Water'),

    '选修4 1.0': ('T-科幻文学与道德想象', '科幻;想象力;道德思考', '选择性必修四 U1 Working the Land'),
    '选修4 2.0': ('T-国家地理与标志景观', '地理;地标;文化符号', '选择性必修四 U2 Literature'),
    '选修4 3.0': ('T-海洋文明与航海史', '海洋;航海;文明交流', '选择性必修四 U3 Contrast'),
    '选修4 4.0': ('T-居家生活与日常物品', '居家;生活常识;人与物', '选择性必修四 U4 Why the Parent Is Dominant'),
    '选修4 5.0': ('T-职业探索与职场角色', '职业;职场;能力与性格', '选择性必修四 U5 On the Road'),
}

# 高考真题高频主题标签(用于匹配主题包)
GK_THEMES = ['科技', '环境', '文化', '健康', '教育', '社会', '职业', '国际交流', '传统节日', '艺术', '体育', '经济']

POS_MAP = [
    (r'^n\.\s*&?\s*vt\.', ['n', 'v'], 'n&vt'),
    (r'^n\.\s*&?\s*vi\.', ['n', 'v'], 'n&vi'),
    (r'^vt\.\s*&?\s*vi\.', ['v'], 'vt&vi'),
    (r'^vt\.\s*&?\s*n\.', ['v', 'n'], 'vt&n'),
    (r'^vi\.\s*&?\s*n\.', ['v', 'n'], 'vi&n'),
    (r'^adj\.\s*&?\s*adv\.', ['adj', 'adv'], 'adj&adv'),
    (r'^n\.', ['n'], 'n'),
    (r'^vt\.', ['v'], 'vt'),
    (r'^vi\.', ['v'], 'vi'),
    (r'^v\.', ['v'], 'v'),
    (r'^adj\.', ['adj'], 'adj'),
    (r'^adv\.', ['adv'], 'adv'),
    (r'^prep\.', ['prep'], 'prep'),
    (r'^conj\.', ['conj'], 'conj'),
    (r'^pron\.', ['pron'], 'pron'),
    (r'^num\.', ['num'], 'num'),
    (r'^art\.', ['art'], 'art'),
    (r'^int\.', ['int'], 'int'),
    (r'^aux\.', ['aux'], 'aux'),
    (r'^modal\.', ['modal'], 'modal'),
    (r'^link-v\.', ['v'], 'link-v'),
    (r'^abbr\.', [], 'abbr'),
]

# 短语/词块识别
PHRASE_HINT = re.compile(r'\s')
# 需要人工判定的低频标记词（教材高频但高考低频）
STOPWORD_HINT = re.compile(
    r'^(abbr\.|（美国）|最终|要是)', re.I)

def parse_pos(zh):
    """返回 (词性列表, 原始标记)

    教材释义的词性标记可以成链（n.&vt. / vi.&vt. / n.&vi.&vt.），
    旧写法只认固定的两两组合，三链与空格分隔的词性组会整条漏标。
    统一交给 wordlist_parse 处理。
    """
    tags, raw, _ = wlparse.parse(zh)
    return tags, raw


def split_senses(zh):
    """把教材释义拆成语项数组(保留原文，不做精炼)

    按词性组切分：'vi.&vt.毕业 n.毕业生' → ['毕业', '毕业生']，
    避免旧写法把两个词性组的义项粘成一条。
    """
    _, _, parts = wlparse.parse(zh)
    return parts

def norm_word(w):
    return re.sub(r'\s+', ' ', w.strip())

def make_id(w, used):
    """生成稳定且唯一的词条 id。

    注意: 'make up' 与 'make-up' 归一化后同形，必须靠连字符保留 + 去重兜底区分。
    """
    slug = re.sub(r'[^a-z0-9]+', '_', w.lower()).strip('_')
    base = 'tb_' + slug
    if base not in used:
        used.add(base)
        return base
    # 冲突时追加短哈希（取词形后段差异）
    import hashlib
    h = hashlib.md5(w.encode('utf-8')).hexdigest()[:6]
    cand = f'{base}_{h}'
    n = 2
    while cand in used:
        cand = f'{base}_{h}_{n}'
        n += 1
    used.add(cand)
    return cand

def main():
    wb = xlrd.open_workbook(SRC)
    sh = wb.sheet_by_index(0)
    rows = []
    for r in range(1, sh.nrows):
        v = [str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
        if v[2]:
            rows.append(v)

    units = OrderedDict()
    for x in rows:
        units.setdefault((x[0], x[1]), []).append(x)

    words = []
    seen = set()        # 已收录的词形（同一词不重复收录）
    used_ids = set()    # 已使用的 id（防 slug 冲突）
    for (book, unit), items in units.items():
        ukey = f'{book} {unit}'
        theme_name, theme_tags, unit_title = UNIT_THEME.get(ukey, (ukey, '', ukey))
        for seq, x in enumerate(items, 1):
            w = norm_word(x[2])
            if w in seen:
                continue
            seen.add(w)
            zh = x[3].strip()
            ipa = x[4].strip()
            tags, raw_pos = parse_pos(zh)
            senses = split_senses(zh)
            is_phrase = bool(PHRASE_HINT.search(w))
            words.append(OrderedDict([
                ('id', make_id(w, used_ids)),
                ('headword', w),
                ('ipa', ipa),
                ('book', book),
                ('unit', unit),
                ('unit_id', ukey),
                ('unit_title', unit_title),
                ('theme', theme_name),
                ('theme_tags', [t for t in theme_tags.split(';') if t]),
                ('pos', tags),
                ('pos_raw', raw_pos),
                ('definition_raw', zh),
                ('sense_count', len(senses)),
                ('senses_raw', senses),
                ('is_phrase', is_phrase),
                ('entry_type', 'phrase' if is_phrase else 'word'),
                ('source', '新人教版(2019)必修1-3/选择性必修1-4 单元词表'),
                ('gk_tags', []),          # 教研人工标注: 高考主题标签
                ('tier', None),           # 教研人工标注: T1-T4
                ('sense_levels', None),   # 教研人工标注: 每义项 S1-S4
                ('error_mechs', []),      # 教研人工标注: E1-E10
                ('is_trap', None),        # 教研人工标注: 是否陷阱义
                ('collocations', []),     # 教研人工标注: 搭配
                ('example', None),        # 教研人工标注: 仿真例句
                ('quiz_ids', []),
            ]))

    lexicon = OrderedDict([
        ('_meta', OrderedDict([
            ('version', '1.0'),
            ('generated_from', SRC),
            ('word_count', len(words)),
            ('unit_count', len(units)),
            ('note', '教材词表是教学底座,非高考词库。高考考纲约3500词,本表2596词,缺口约900词需另行补齐。'),
            ('annotation_status', '机械转换产物。tier / sense_levels / error_mechs / is_trap / collocations / example 六项教研字段待人工标注(见docs/词汇教研体系v1.md §8 SOP)。'),
            ('copyright_note', '教材词表来源为公开教学资料。释义为教材编写组表述,商业使用需自行改写措辞,不可直接照搬。'),
        ])),
        ('words', words),
    ])

    # 主题包映射
    theme_map = []
    for (book, unit), items in units.items():
        ukey = f'{book} {unit}'
        tname, ttags, utitle = UNIT_THEME.get(ukey, (ukey, '', ukey))
        ws = [norm_word(x[2]) for x in items]
        multi = sum(1 for x in items if len(split_senses(x[3])) >= 3)
        phrases = sum(1 for x in items if PHRASE_HINT.search(x[2]))
        theme_map.append(OrderedDict([
            ('unit_id', ukey), ('book', book), ('unit', unit), ('unit_title', utitle),
            ('theme_name', tname), ('theme_tags', [t for t in ttags.split(';') if t]),
            ('word_count', len(items)),
            ('multi_sense_count', multi),
            ('phrase_count', phrases),
            ('multi_sense_ratio', round(multi / len(items), 3)),
            ('gk_match', [t for t in GK_THEMES if t in ttags]),
            ('sample_words', ws[:8]),
            ('commercial_role', '资料电商主题包候选'),
        ]))

    stats = OrderedDict([
        ('total_words', len(words)),
        ('total_units', len(units)),
        ('phrase_count', sum(1 for w in words if w['is_phrase'])),
        ('single_word_count', sum(1 for w in words if not w['is_phrase'])),
        ('multi_sense_ge3', sum(1 for w in words if w['sense_count'] >= 3)),
        ('multi_sense_ge4', sum(1 for w in words if w['sense_count'] >= 4)),
        ('sense_count_dist', dict(sorted(Counter(w['sense_count'] for w in words).items()))),
        ('pos_dist', dict(Counter(w['pos_raw'] for w in words).most_common())),
        ('by_book', dict(Counter(w['book'] for w in words))),
        ('no_ipa', sum(1 for w in words if not w['ipa'])),
        ('total_senses', sum(w['sense_count'] for w in words)),
        ('candidate_trap_words', sum(1 for w in words if w['sense_count'] >= 3)),
        ('candidate_phrase_words', sum(1 for w in words if w['is_phrase'])),
        ('gk_gap_estimate', 3500 - len(words)),
    ])

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(f'{OUT_DIR}/textbook_lexicon.json', 'w', encoding='utf-8') as f:
        json.dump(lexicon, f, ensure_ascii=False, indent=2)
    with open(f'{OUT_DIR}/unit_theme_map.json', 'w', encoding='utf-8') as f:
        json.dump(OrderedDict([('_meta', {'version': '1.0', 'unit_count': len(theme_map)}),
                               ('units', theme_map)]), f, ensure_ascii=False, indent=2)
    with open(f'{OUT_DIR}/stats_tb2019.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print('转换完成')
    print(f"  词条 {len(words)}  单元 {len(units)}  义项总数 {stats['total_senses']}")
    print(f"  短语 {stats['phrase_count']}  多义(≥3) {stats['multi_sense_ge3']}  多义(≥4) {stats['multi_sense_ge4']}")
    print(f"  缺失音标 {stats['no_ipa']}  高考词表缺口约 {stats['gk_gap_estimate']}")
    print(f"  输出: {OUT_DIR}/textbook_lexicon.json, {OUT_DIR}/unit_theme_map.json, {OUT_DIR}/stats_tb2019.json")

if __name__ == '__main__':
    main()
