#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 双来源素材库分析页构建器

输入: data/stats.json                 统一素材库总统计
      data/material_impact.json       素材库 × 人工频次判定表 联合分析
      data/textbook_fragment_analysis.json  教材词表单元截断假说检验
      data/stats_tb2019.json / stats_tb2007.json  单来源统计
输出: docs/双来源素材库分析.html       单文件离线可视化

设计: Data UI（仪表盘）模式，单强调色 #f59e0b，图表优先。
"""
import json
import os
from collections import OrderedDict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'docs', '双来源素材库分析.html')

ACCENT = '#f59e0b'


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def build_data():
    st = load('stats.json')
    imp = load('material_impact.json')
    frag = load('textbook_fragment_analysis.json')
    s19 = load('stats_tb2019.json')
    s07 = load('stats_tb2007.json')

    # 各册词量
    by_book = OrderedDict()
    for b, n in s19['by_book'].items():
        by_book[b] = {'tb2019': n, 'tb2007': s07['by_book'].get(b, 0)}
    for b, n in s07['by_book'].items():
        if b not in by_book:
            by_book[b] = {'tb2019': 0, 'tb2007': n}

    # 首批 B 轨词的教材锚点覆盖度
    anchor = []
    for it in imp['batch1_impact']['per_word']:
        if it['current_track'] == 'B' and it['source_track'] == 'tb2007':
            c = it.get('anchor_coverage_2007', {})
            anchor.append({
                'headword': it['headword'],
                'curated': c.get('curated_senses', 0),
                'raw': c.get('raw_senses', 0),
                'covered': c.get('covered', 0),
                'ratio': c.get('ratio', 0),
            })

    # 教材释义例证：同一词两套教材给的是不同义项
    examples = []
    for it in imp['batch1_impact']['per_word']:
        if it['source_track'] == 'both':
            examples.append(it['headword'])
    examples = examples[:40]

    return OrderedDict([
        ('stats', st),
        ('coverage', imp['curated_coverage']),
        ('t1gap', imp['t1_gap']),
        ('strongTrap', imp['strong_trap']),
        ('fragment', frag),
        ('byBook', by_book),
        ('senseDist', st['sense_count_dist']),
        ('anchor', anchor),
        ('batch2', imp['batch2_candidates']),
        ('drift', imp['batch1_impact'].get('selection_drift')),
        ('sourceDist', imp['batch1_impact']['source_track_dist']),
        ('single2019', {k: v for k, v in s19.items() if not isinstance(v, dict)}),
        ('single2007', {k: v for k, v in s07.items() if not isinstance(v, dict)}),
    ])


HTML = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>拾词 · 双来源素材库分析</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#fafafa;--card:#fff;--ink:#18181b;--ink2:#52525b;--ink3:#8b8b94;
  --line:#e8e8ec;--line2:#f1f1f4;--accent:#f59e0b;--accent-soft:rgba(245,158,11,.10);--accent-line:rgba(245,158,11,.32);
  --font:'Outfit','Noto Sans SC','PingFang SC','Hiragino Sans GB',sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--ink);font-size:14px;line-height:1.55;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px 72px}
header{padding:44px 0 30px;border-bottom:1px solid var(--line);margin-bottom:34px}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--accent);text-transform:uppercase;margin-bottom:12px}
h1{font-size:31px;line-height:1.22;font-weight:700;letter-spacing:-.022em}
.lede{margin-top:12px;font-size:15px;color:var(--ink2);max-width:62ch}
h2{font-size:22px;font-weight:600;letter-spacing:-.014em;margin-bottom:6px}
.sec{margin-bottom:46px}
.sec-h{display:flex;align-items:baseline;gap:10px;margin-bottom:16px}
.sec-h svg{width:17px;height:17px;color:var(--accent);flex:none;align-self:center}
.sec-n{font-family:var(--mono);font-size:11px;color:var(--ink3);letter-spacing:.08em}
.sub{color:var(--ink3);font-size:13px;margin-bottom:16px;max-width:70ch}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.card+.card{margin-top:14px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.kpi{padding:17px 19px;border-right:1px solid var(--line2)}
.kpi:last-child{border-right:0}
.kpi .l{font-size:12px;color:var(--ink3);letter-spacing:.01em}
.kpi b{display:block;font-size:27px;font-weight:600;letter-spacing:-.02em;margin:3px 0 1px;font-variant-numeric:tabular-nums}
.kpi .d{font-size:12px;color:var(--ink3)}
.kpi b.hi{color:var(--accent)}
.bench{display:grid;grid-template-columns:168px 1fr 92px;gap:12px;align-items:center;padding:5px 0}
.bench-label{font-size:13px;color:var(--ink2)}
.bench-track{height:15px;background:var(--line2);border-radius:5px;overflow:hidden}
.bench-fill{height:100%;background:var(--accent);border-radius:5px}
.bench-fill.dim{background:var(--accent-line)}
.bench-val{font-family:var(--mono);font-size:12px;color:var(--ink2);text-align:right;font-variant-numeric:tabular-nums}
.note{border-left:2px solid var(--accent);padding:2px 0 2px 13px;color:var(--ink2);font-size:13px;margin-top:14px}
.note b{color:var(--ink)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;font-weight:500;color:var(--ink3);font-size:12px;padding:7px 10px;border-bottom:1px solid var(--line)}
.tbl td{padding:8px 10px;border-bottom:1px solid var(--line2)}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{font-family:var(--mono);text-align:right;font-variant-numeric:tabular-nums}
.tbl .w{font-weight:500}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:12px;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:#92400e;border:1px solid var(--accent-line)}
.chip.q{background:var(--line2);color:var(--ink2);border-color:var(--line)}
.hint{font-size:12px;color:var(--ink3);margin-top:11px;line-height:1.5}
.hint b{color:var(--ink2);font-weight:500}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--ink2);margin-top:12px}
.legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
footer{border-top:1px solid var(--line);padding-top:18px;color:var(--ink3);font-size:12px}
footer code{font-family:var(--mono);font-size:11.5px;background:var(--line2);padding:1px 6px;border-radius:4px;color:var(--ink2)}
@media (max-width:900px){.kpis{grid-template-columns:1fr 1fr}.kpi:nth-child(2){border-right:0}.kpi:nth-child(1),.kpi:nth-child(2){border-bottom:1px solid var(--line2)}.grid2{grid-template-columns:1fr}}
@media (max-width:640px){.kpis{grid-template-columns:1fr}.kpi{border-right:0;border-bottom:1px solid var(--line2)}.kpi:last-child{border-bottom:0}.bench{grid-template-columns:110px 1fr 66px}.wrap{padding:0 16px 56px}h1{font-size:25px}}
</style>
</head>
<body>
<div class="wrap">

<header>
  <div class="eyebrow">拾词 · 素材库 v2.0 · 双来源合并</div>
  <h1>两套教材词表合并后，我们到底拿到了什么</h1>
  <p class="lede">2019 新课标（36 单元）与 2007 旧课标（40 单元）两套词表合并成 3912 条统一素材库。关键结论不是"多收了 965 个词"，而是：<b>两套教材彼此互补却不互相包含，合并能把 T1 核心词的教材缺失率从 57.3% 压到 47.4%，但剩下的缺口只能靠自建义项树补。</b></p>
</header>

<section class="sec">
  <div class="kpis">
    <div class="kpi"><div class="l">统一素材库词条</div><b class="hi" id="k-words">—</b><div class="d">单词 <span id="k-single">—</span> · 短语 <span id="k-phrase">—</span></div></div>
    <div class="kpi"><div class="l">义项总量</div><b id="k-senses">—</b><div class="d">多义（≥3 义）<span id="k-multi">—</span></div></div>
    <div class="kpi"><div class="l">T1 缺失率</div><b id="k-gap">—</b><div class="d">双来源合并后</div></div>
    <div class="kpi"><div class="l">仍需自建义项树</div><b id="k-self">—</b><div class="d">两套教材都没有的候选词</div></div>
  </div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/></svg><h2>两套教材的重叠结构</h2><span class="sec-n">01</span></div>
  <p class="sub">合并不是简单加法。1087 个词两套都有，1508 个只有新课标，1317 个只有旧课标——旧课标独有部分几乎与新课标等量，说明它覆盖的是一片新课标完全没碰的区域。</p>
  <div class="card">
    <svg id="ch-venn" viewBox="0 0 720 260" role="img" aria-label="两套教材词条重叠结构"></svg>
    <div class="legend">
      <span><i style="background:#f59e0b"></i>仅 2019 新课标</span>
      <span><i style="background:#fcd34d"></i>两套都有</span>
      <span><i style="background:#fde9c2"></i>仅 2007 旧课标</span>
    </div>
  </div>
  <div class="note">两套教材的独有部分几乎一样多（1508 vs 1317），<b>旧课标不是新课标的子集，也不是它的补充版</b>——它覆盖的是另一片区域。这正是"双轨制"能成立的事实基础，也说明单一教材词表离高考词库差得很远。</div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-5 3 3 5-7"/></svg><h2>T1 核心词的教材缺失率</h2><span class="sec-n">02</span></div>
  <p class="sub">人工判定的 211 个 T1 级高考核心词里，有多少能在教材词表中找到锚点。教材里没有，义项树就得完全自建。</p>
  <div class="card">
    <div class="bench"><span class="bench-label">仅看 2019 新课标</span><div class="bench-track"><div class="bench-fill dim" id="g1"></div></div><span class="bench-val" id="g1v">—</span></div>
    <div class="bench"><span class="bench-label">加上 2007 旧课标</span><div class="bench-track"><div class="bench-fill" id="g2"></div></div><span class="bench-val" id="g2v">—</span></div>
    <div class="hint" id="g-note"></div>
  </div>
  <div class="note">旧课标补上了 21 个 T1 词（express、lie、mean、note、object、pull、recognize、require、result、scheme、section、sign、solve、state、statement、succeed、support、survey、trade、value、vote），缺失率从 57.3% 降到 47.4%。<b>但仍有 100 个 T1 词两套教材都没有</b>——这部分是 B 轨自建义项树的全部工作量所在。</div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg><h2>两套教材给的是"不同义项"，不是"不同措辞"</h2><span class="sec-n">03</span></div>
  <p class="sub">对 1087 个双来源词，逐义项比对两套教材的释义集合。结果：平均 Jaccard 相似度只有 0.306，384 个词的义项集合完全不相交，只有 26.8% 构成包含关系。</p>
  <div class="grid2">
    <div class="card">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:10px">义项集合关系（1087 词）</div>
      <svg id="ch-set" viewBox="0 0 360 200" role="img" aria-label="义项集合关系分布"></svg>
    </div>
    <div class="card">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:10px">教材条目给几个词性</div>
      <svg id="ch-pos" viewBox="0 0 360 200" role="img" aria-label="教材条目词性覆盖"></svg>
      <div class="hint">两套教材都有 <b>约 85%</b> 的条目只标一个词性。单词表记的是"这个词在本单元用到的那个义项"，不是完整词条。</div>
    </div>
  </div>
  <div class="note"><b>这解释了为什么教材词表不能当词库用。</b>56.7% 的旧课标条目里找不到人工判定的核心义——教材给的多是该单元语境下的那个义项，恰好常常是高考不考的那个。比如 mean 在旧课标必修一里只标了形容词"吝啬的"，而高考最考的"意味着"根本没有出现。</div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><h2>教材锚点对已精修义项的覆盖度</h2><span class="sec-n">04</span></div>
  <p class="sub">首批 100 词里有 4 个 B 轨词在旧课标表中找到了锚点。用精修后的真实义项去比对这些锚点，看它们到底能覆盖多少。</p>
  <div class="card" id="anchor-card"></div>
  <div class="note">锚点只覆盖到 <b>20%–25%</b>。旧课标虽然给了释义，但只覆盖了高考要考的那个义项的一小部分——<b>它并不能减轻义项树自建的工作量</b>，所以这 4 个词的 B 轨身份维持不变。教材锚点的真实价值是"这个词在某单元出现过、这层单元语境义项存在"，而不是完整释义。</div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="6" y="10" width="3" height="8" fill="currentColor" stroke="none"/><rect x="12" y="6" width="3" height="12" fill="currentColor" stroke="none"/><rect x="18" y="13" width="3" height="5" fill="currentColor" stroke="none"/></svg><h2>两套教材的册别分布</h2><span class="sec-n">05</span></div>
  <p class="sub">左柱为 2019 新课标（7 册 36 单元），右柱为 2007 旧课标（8 册 40 单元）。旧课标体量略小，但单元更多、平均每单元词量更低。</p>
  <div class="card">
    <svg id="ch-book" viewBox="0 0 720 240" role="img" aria-label="各册词量分布"></svg>
  </div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5M12 16V7M17 16v-3"/></svg><h2>素材库义项数分布</h2><span class="sec-n">06</span></div>
  <p class="sub">3912 条词料的义项数分布。义项数越多，熟词僻义的出题空间越大——1 个义项的词直接进不了"熟词僻义"弹药池。</p>
  <div class="card">
    <svg id="ch-dist" viewBox="0 0 720 200" role="img" aria-label="义项数分布"></svg>
    <div class="legend">
      <span><i style="background:#f59e0b"></i>≥3 义项（可做熟词僻义弹药）</span>
      <span><i style="background:#fde9c2"></i>1–2 义项</span>
    </div>
  </div>
</section>

<section class="sec">
  <div class="sec-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></svg><h2>第二批选词候选</h2><span class="sec-n">07</span></div>
  <p class="sub">人工判定为 T1/T2、陷阱强度 ≥2，但不在首批 100 词内、且仅在旧课标有锚点的词，共 <b id="b2n">—</b> 个。它们是第二批的优先候选：有教材释义可参照，但义项树仍须自建。</p>
  <div class="card"><div class="chips" id="b2chips"></div></div>
  <div class="note">首批 100 词名单已冻结（词条与 200 道配套题绑定其上）。因教材释义解析修正，选词排序会产生 <b id="driftn">—</b> 词进出，差异归入第二批输入，不在本阶段改名单。</div>
</section>

<footer>
  <p>数据文件：<code>data/word_material.json</code> 统一素材库 · <code>data/material_impact.json</code> 联合分析 · <code>data/textbook_fragment_analysis.json</code> 截断检验 · <code>data/stats.json</code> 总统计</p>
  <p style="margin-top:6px">释义原文为教材编写组表述，仅作改写参照素材，对外释义须自行改写措辞；单词拼写、音标、词性属事实性信息，可直接使用。</p>
</footer>

</div>
<script>
const D = __DATA__;
const ACCENT = '#f59e0b';
const S = {solid:ACCENT, mid:'#fcd34d', soft:'#fde9c2', line:'#e8e8ec', ink:'#18181b', ink3:'#8b8b94', ink2:'#52525b'};
const fmt = n => n.toLocaleString('zh-CN');
const $ = id => document.getElementById(id);

/* ── KPI ── */
$('k-words').textContent = fmt(D.stats.material_word_count);
$('k-single').textContent = fmt(D.stats.single_word_count);
$('k-phrase').textContent = fmt(D.stats.phrase_count);
$('k-senses').textContent = fmt(D.stats.total_senses);
$('k-multi').textContent = fmt(D.stats.multi_sense_ge3);
$('k-gap').textContent = D.t1gap.missing_rate_after + '%';
$('k-self').textContent = D.coverage.in_neither;

/* ── 01 重叠结构 ── */
(function(){
  const W=720,H=260, svg=$('ch-venn');
  const d=D.stats;
  const a=d.only_tb2019, b=d.in_both_sources, c=d.only_tb2007;
  const total=a+b+c;
  const maxV=Math.max(a,b,c);
  const barW=118, gap=34, x0=70, baseY=196, maxH=140;
  const items=[
    {k:'仅 2019 新课标',v:a,fill:S.solid},
    {k:'两套都有',v:b,fill:S.mid},
    {k:'仅 2007 旧课标',v:c,fill:S.soft}
  ];
  let s='';
  items.forEach((it,i)=>{
    const x=x0+i*(barW+gap);
    const h=Math.max(6, it.v/maxV*maxH);
    s+=`<rect x="${x}" y="${baseY-h}" width="${barW}" height="${h}" rx="7" fill="${it.fill}"/>`;
    s+=`<text x="${x+barW/2}" y="${baseY-h-12}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="21" font-weight="600" fill="${S.ink}">${fmt(it.v)}</text>`;
    s+=`<text x="${x+barW/2}" y="${baseY-h-30}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="12" fill="${S.ink3}">${it.v/total*100>.1?Math.round(it.v/total*100)+'%':''}</text>`;
    s+=`<text x="${x+barW/2}" y="${baseY+20}" text-anchor="middle" font-family="Noto Sans SC,sans-serif" font-size="13" fill="${S.ink2}">${it.k}</text>`;
  });
  s+=`<line x1="40" y1="${baseY}" x2="680" y2="${baseY}" stroke="${S.line}" stroke-width="1"/>`;
  s+=`<text x="40" y="${baseY+44}" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink3}">词条总数 ${fmt(total)}（按词形去重后）· 短语 ${fmt(d.phrase_count)} 条已计入</text>`;
  svg.innerHTML=s;
})();

/* ── 02 T1 缺口 ── */
(function(){
  const before=D.t1gap.missing_rate_before, after=D.t1gap.missing_rate_after;
  $('g1').style.width=before+'%'; $('g1v').textContent=before+'% 缺';
  $('g2').style.width=after+'%';  $('g2v').textContent=after+'% 缺';
  $('g-note').innerHTML=`T1 候选 ${D.t1gap.t1_candidates} 词 · 仅 2019 表时缺 ${D.t1gap.t1_candidates-D.t1gap.before_tb2019_only} 个 → 双来源后缺 ${D.t1gap.still_missing} 个`;
})();

/* ── 03 集合关系 ── */
(function(){
  const b=D.fragment.b_set_relation, svg=$('ch-set');
  const rows=[
    {l:'互相包含',v:b.tb2007_subset_of_2019+b.tb2019_subset_of_2007,fill:S.solid},
    {l:'互有出入',v:b.neither_contains_other,fill:S.mid},
    {l:'完全不相交',v:b.completely_disjoint,fill:S.soft}
  ];
  const maxV=Math.max(...rows.map(r=>r.v));
  let s='';
  rows.forEach((r,i)=>{
    const y=26+i*52;
    const w=Math.max(4, r.v/maxV*230);
    s+=`<text x="0" y="${y+14}" font-family="Noto Sans SC,sans-serif" font-size="13" fill="${S.ink2}">${r.l}</text>`;
    s+=`<rect x="86" y="${y}" width="${w}" height="20" rx="5" fill="${r.fill}"/>`;
    s+=`<text x="${86+w+9}" y="${y+15}" font-family="Outfit,sans-serif" font-size="13" font-weight="500" fill="${S.ink}">${r.v}</text>`;
  });
  s+=`<text x="0" y="180" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink3}">平均 Jaccard ${D.fragment.b_set_relation.mean_jaccard}（0=毫无重叠，1=完全一致）</text>`;
  svg.innerHTML=s;

  const p=D.fragment.d_pos_coverage, svg2=$('ch-pos');
  const rows2=[
    {l:'2019 新课标',v:p.tb2019_single_pos_ratio},
    {l:'2007 旧课标',v:p.tb2007_single_pos_ratio}
  ];
  let s2='';
  rows2.forEach((r,i)=>{
    const y=34+i*56;
    s2+=`<text x="0" y="${y+14}" font-family="Noto Sans SC,sans-serif" font-size="13" fill="${S.ink2}">${r.l}</text>`;
    s2+=`<rect x="86" y="${y}" width="${r.v/100*230}" height="20" rx="5" fill="${S.solid}"/>`;
    s2+=`<text x="${86+r.v/100*230+9}" y="${y+15}" font-family="Outfit,sans-serif" font-size="13" font-weight="500" fill="${S.ink}">${r.v}%</text>`;
    s2+=`<text x="86" y="${y+38}" font-family="Noto Sans SC,sans-serif" font-size="11.5" fill="${S.ink3}">只标一个词性的条目占比</text>`;
  });
  s2+=`<text x="0" y="176" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink3}">旧课标有 ${D.fragment.c_core_sense_coverage.tb2007_misses_core} 个条目不含人工判定的核心义</text>`;
  svg2.innerHTML=s2;
})();

/* ── 04 锚点覆盖度 ── */
(function(){
  const a=D.anchor;
  let h='<div class="bench" style="grid-template-columns:120px 1fr 210px"><span class="bench-label" style="color:var(--ink3);font-size:12px">单词</span><span style="color:var(--ink3);font-size:12px">锚点覆盖已精修义项的比例</span><span style="color:var(--ink3);font-size:12px;text-align:right">覆盖 / 精修义项</span></div>';
  a.forEach(x=>{
    h+=`<div class="bench"><span class="bench-label"><b style="font-weight:500">${x.headword}</b></span><div class="bench-track"><div class="bench-fill" style="width:${Math.max(3,x.ratio*100)}%"></div></div><span class="bench-val">${x.covered} / ${x.curated}　${Math.round(x.ratio*100)}%</span></div>`;
  });
  $('anchor-card').innerHTML=h;
})();

/* ── 05 册别分布 ── */
(function(){
  const rows=Object.entries(D.byBook);
  const svg=$('ch-book');
  const maxV=Math.max(...rows.map(r=>Math.max(r[1].tb2019,r[1].tb2007)));
  const W=720,baseY=176,maxH=116,slot=720/rows.length;
  let s='';
  rows.forEach((r,i)=>{
    const cx=slot*i+slot/2;
    const h1=r[1].tb2019/maxV*maxH, h2=r[1].tb2007/maxV*maxH;
    s+=`<rect x="${cx-27}" y="${baseY-h1}" width="24" height="${h1}" rx="4" fill="${S.solid}"/>`;
    s+=`<rect x="${cx+3}" y="${baseY-h2}" width="24" height="${h2}" rx="4" fill="${S.soft}"/>`;
    s+=`<text x="${cx}" y="${baseY+18}" text-anchor="middle" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink2}">${r[0]}</text>`;
    s+=`<text x="${cx-15}" y="${baseY-h1-7}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" fill="${S.ink3}">${r[1].tb2019}</text>`;
    s+=`<text x="${cx+15}" y="${baseY-h2-7}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="11" fill="${S.ink3}">${r[1].tb2007}</text>`;
  });
  s+=`<line x1="30" y1="${baseY}" x2="690" y2="${baseY}" stroke="${S.line}" stroke-width="1"/>`;
  s+=`<g transform="translate(30,${baseY+40})"><rect width="11" height="11" rx="3" fill="${S.solid}"/><text x="17" y="10" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink2}">2019 新课标（7 册 36 单元）</text><rect x="200" width="11" height="11" rx="3" fill="${S.soft}"/><text x="217" y="10" font-family="Noto Sans SC,sans-serif" font-size="12" fill="${S.ink2}">2007 旧课标（8 册 40 单元）</text></g>`;
  svg.innerHTML=s;
})();

/* ── 06 义项分布 ── */
(function(){
  const d=D.senseDist, svg=$('ch-dist');
  const keys=Object.keys(d).map(Number).sort((a,b)=>a-b);
  const maxV=Math.max(...keys.map(k=>d[k]));
  const W=720,baseY=150,maxH=100,slot=720/keys.length;
  let s='';
  keys.forEach((k,i)=>{
    const cx=slot*i+slot/2;
    const h=Math.max(3,d[k]/maxV*maxH);
    const fill=k>=3?S.solid:S.soft;
    s+=`<rect x="${cx-slot*0.28}" y="${baseY-h}" width="${slot*0.56}" height="${h}" rx="4" fill="${fill}"/>`;
    s+=`<text x="${cx}" y="${baseY-h-7}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="12" fill="${S.ink2}">${fmt(d[k])}</text>`;
    s+=`<text x="${cx}" y="${baseY+18}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="12" fill="${S.ink3}">${k} 义</text>`;
  });
  s+=`<line x1="20" y1="${baseY}" x2="700" y2="${baseY}" stroke="${S.line}" stroke-width="1"/>`;
  svg.innerHTML=s;
})();

/* ── 07 第二批候选 ── */
(function(){
  const b=D.batch2;
  $('b2n').textContent=b.count;
  $('b2chips').innerHTML=b.words.map(w=>`<span class="chip">${w.headword}</span>`).join('');
  $('driftn').textContent=D.drift?(D.drift.dropped.length+' 词'):'0';
})();
</script>
</body>
</html>
'''


def main():
    data = build_data()
    html = HTML.replace('__DATA__', json.dumps(data, ensure_ascii=False))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    size = os.path.getsize(OUT)
    print(f'输出: docs/双来源素材库分析.html（{size/1024:.1f} KB）')
    print(f"  素材库 {data['stats']['material_word_count']} 条 · 义项 {data['stats']['total_senses']} · "
          f"T1 缺失率 {data['t1gap']['missing_rate_before']}% → {data['t1gap']['missing_rate_after']}%")
    print(f"  第二批候选 {data['batch2']['count']} 个")


if __name__ == '__main__':
    main()
