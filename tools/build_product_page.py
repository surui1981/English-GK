#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《熟词僻义 100 题专项训练册》商品详情页生成器

输入：data/product/shici_book.json
输出：docs/熟词僻义100题专项训练册-详情页.html

页面模式：Data UI（白底 + 单一琥珀强调色）
设计约束（visual-page skill）：无 emoji 图标、inline SVG、CJK 密度紧凑、
图表优先、单强调色、禁用纯黑/Inter/Roboto/Arial。
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "product", "shici_book.json")
OUT = os.path.join(ROOT, "docs", "熟词僻义100题专项训练册-详情页.html")

DIFF_LABEL = {"easy": "基础", "mid": "中等", "hard": "较难"}
CARRIER_LABEL = {"C1": "阅读理解", "C2": "完形填空", "C3": "语法填空",
                 "C4": "应用文写作", "C5": "读后续写", "C6": "七选五"}


def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def bench(label, val, total, pct=None, note=""):
    p = pct if pct is not None else (val / total * 100 if total else 0)
    return (f'<div class="bench"><span class="bench-label">{esc(label)}</span>'
            f'<div class="bench-track"><div class="bench-fill" style="width:{p:.1f}%"></div></div>'
            f'<span class="bench-val">{val}</span>'
            + (f'<span class="bench-note">{esc(note)}</span>' if note else "")
            + '</div>')


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"缺少 {SRC}，请先运行 tools/build_book.py")
    book = json.load(open(SRC, encoding="utf-8"))
    meta = book["meta"]
    st = meta["stats"]
    units = book["units"]
    qs = book["questions"]

    # 样张：取一道 hard 题（最能说明含金量），并配它的词条与释义
    sample = next((q for q in qs if q["difficulty"] == "hard"), qs[0])
    wl = next((w for w in book["wordlist"] if w["book_no"] == sample["book_no"]), None)

    # 载体 / 难度 / 层级分布
    diff_items = sorted(st["difficulty"].items(), key=lambda kv: ["easy", "mid", "hard"].index(kv[0]))
    carr_items = sorted(st["carrier"].items(), key=lambda kv: -kv[1])
    lvl_items = sorted(st["sense_level"].items())

    total_q = st["questions"]

    # 分档定价卡：按覆盖词量排三档（10% / 50% / 100%），纸质打印不单独设档
    tier_cards = []
    for t in meta["pricing"]["tiers"]:
        hot = " hot" if t["key"] == "p100" else ""
        badge = "最全" if t["key"] == "p100" else f"{t['coverage']} 档"
        tier_cards.append(
            f'      <div class="tier{hot}">\n'
            f'        <span class="badge">{esc(badge)}</span>\n'
            f'        <div class="p">¥{t["price"]}<small> / {t["questions"]} 题</small></div>\n'
            f'        <ul><li>覆盖 {t["coverage"]} 高频词</li>'
            f'<li>{esc(t["note"])}</li>'
            f'<li>电子 PDF，A4 排版，可自行双面打印</li></ul>\n'
            f'      </div>')
    tier_cards = "\n".join(tier_cards)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>熟词僻义 100 题专项训练册 · 拾词</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {{
  --accent: #f59e0b;
  --accent-deep: #b45309;
  --accent-tint: #fef6e7;
  --ink: #14171e;
  --ink-2: #47505f;
  --muted: #7c8a99;
  --line: #e6e9ee;
  --line-2: #f3f5f8;
  --bg: #fafafa;
  --card: #ffffff;
}}
* {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: 'Outfit', -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif;
  font-size: 15px; line-height: 1.6;
}}
.wrap {{ max-width: 960px; margin: 0 auto; padding: 0 24px; }}
.mono {{ font-family: 'JetBrains Mono', monospace; }}
section {{ margin: 48px 0; }}
.eyebrow {{ font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--accent-deep); margin: 0 0 10px; }}
h1 {{ font-size: 32px; line-height: 1.25; margin: 0 0 12px; letter-spacing: -.02em; font-weight: 700; }}
h2 {{ font-size: 23px; line-height: 1.3; margin: 0 0 8px; letter-spacing: -.01em; font-weight: 700; }}
h3 {{ font-size: 16px; margin: 0 0 6px; font-weight: 600; }}
p {{ margin: 0 0 10px; }}
.lead {{ font-size: 16px; color: var(--ink-2); }}
.muted {{ color: var(--muted); font-size: 13px; }}

/* hero */
.hero {{ padding: 40px 0 32px; }}
.hero-grid {{ display: grid; grid-template-columns: 1.35fr .65fr; gap: 32px; align-items: start; }}
.price {{ background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px; }}
.price .now {{ font-size: 34px; font-weight: 700; color: var(--accent-deep); line-height: 1; }}
.price .now small {{ font-size: 15px; font-weight: 500; }}
.price .was {{ color: var(--muted); text-decoration: line-through; font-size: 13px; margin-left: 8px; }}
.price .from {{ color: var(--muted); font-size: 13px; margin-left: 6px; }}
.cta {{ display: block; margin-top: 14px; text-align: center; background: var(--accent-deep); color: #fff;
  border-radius: 12px; padding: 13px 16px; font-weight: 600; border: 0; cursor: pointer;
  font-family: inherit; font-size: 15px; transition: filter .18s; }}
.cta:hover {{ filter: brightness(1.08); }}
.cta.ghost {{ background: var(--card); color: var(--ink); border: 1px solid var(--line); margin-top: 8px; }}
.kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line);
  border: 1px solid var(--line); border-radius: 16px; overflow: hidden; margin: 26px 0 0; }}
.kpi {{ background: var(--card); padding: 14px 16px; }}
.kpi b {{ display: block; font-size: 26px; font-weight: 700; letter-spacing: -.02em; }}
.kpi span {{ font-size: 12px; color: var(--muted); }}

/* bench */
.bench {{ display: grid; grid-template-columns: 96px 1fr 42px; gap: 12px; align-items: center;
  padding: 5px 0; }}
.bench-label {{ font-size: 13.5px; color: var(--ink-2); }}
.bench-track {{ height: 14px; background: var(--line-2); border-radius: 7px; overflow: hidden; }}
.bench-fill {{ height: 100%; background: var(--accent); border-radius: 7px; }}
.bench-val {{ font-family: 'JetBrains Mono', monospace; font-size: 13px; text-align: right; color: var(--ink); }}
.bench-note {{ font-size: 12px; color: var(--muted); }}
.cols2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }}

/* cards */
.card {{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }}
.grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
.grid3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
.icon {{ width: 20px; height: 20px; color: var(--accent-deep); }}

/* 单元 */
.unit {{ display: grid; grid-template-columns: 40px 1fr; gap: 16px; padding: 18px 0;
  border-top: 1px solid var(--line); }}
.unit-no {{ font-family: 'JetBrains Mono', font-size: 13px; color: var(--accent-deep); }}
.unit-no b {{ display: block; font-size: 17px; font-weight: 700; letter-spacing: -.02em; }}
.action {{ background: var(--accent-tint); border-left: 3px solid var(--accent); border-radius: 10px;
  padding: 12px 14px; font-size: 13.5px; color: var(--ink-2); margin-top: 8px; }}

/* 样张 */
.sample {{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 22px 24px; }}
.sample .stem {{ font-size: 15.5px; line-height: 1.65; margin-bottom: 4px; }}
.sample .cn {{ font-size: 13.5px; color: var(--muted); margin-bottom: 12px; }}
.opts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }}
.opt {{ border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font-size: 14px; }}
.opt b {{ font-family: 'JetBrains Mono'; color: var(--accent-deep); margin-right: 6px; }}
.opt.right {{ background: var(--accent-tint); border-color: var(--accent); }}
.exp {{ border-top: 1px dashed var(--line); padding-top: 12px; font-size: 13.5px; color: var(--ink-2); }}
.exp p {{ margin: 0 0 8px; }}
.exp .seg {{ font-weight: 600; color: var(--ink); }}
.dis {{ margin: 6px 0 0; padding-left: 0; list-style: none; font-size: 13px; color: var(--ink-2); }}
.dis li {{ margin-bottom: 5px; }}
.dis b {{ color: var(--accent-deep); }}

/* 表 */
table {{ width: 100%; border-collapse: collapse; font-size: 13.5px; }}
th {{ text-align: left; font-weight: 600; color: var(--ink); background: var(--accent-tint);
  padding: 8px 10px; border-bottom: 1px solid var(--line); }}
td {{ padding: 8px 10px; border-bottom: 1px solid var(--line-2); vertical-align: top; }}
tr:nth-child(even) td {{ background: #fcfcfd; }}

/* 定价 */
.tiers {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
.tier {{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }}
.tier.hot {{ border-color: var(--accent); box-shadow: 0 4px 16px -6px rgba(245,158,11,.25); }}
.tier .p {{ font-size: 26px; font-weight: 700; letter-spacing: -.02em; margin: 4px 0 6px; }}
.tier .p small {{ font-size: 13px; font-weight: 500; color: var(--muted); }}
.tier ul {{ margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--ink-2); }}
.badge {{ display: inline-block; font-size: 11px; font-weight: 600; color: var(--accent-deep);
  background: var(--accent-tint); border-radius: 999px; padding: 2px 9px; }}

.foot {{ border-top: 1px solid var(--line); margin-top: 56px; padding: 22px 0 40px;
  font-size: 12.5px; color: var(--muted); }}
.notice {{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px;
  font-size: 13.5px; color: var(--ink-2); }}
@media (max-width: 820px) {{
  .hero-grid, .cols2, .grid2, .grid3, .tiers {{ grid-template-columns: 1fr; }}
  .kpis {{ grid-template-columns: 1fr 1fr; }}
  h1 {{ font-size: 26px; }}
  h2 {{ font-size: 20px; }}
}}
</style>
</head>
<body>
<div class="wrap">

  <div class="hero">
    <div class="hero-grid">
      <div>
        <p class="eyebrow">拾词 · 高考英语词汇系统 · 单品</p>
        <h1>熟词僻义 100 题<br>专项训练册</h1>
        <p class="lead">{esc(meta['subtitle'])}。{esc(meta['positioning'])}。</p>
        <p class="muted">每个词只考它最容易错的那一个意思；每题给一个能直接用的考场动作。</p>
      </div>
      <div class="price">
        <div><span class="now"><small>¥</small>{meta['pricing']['tiers'][0]['price']}</span><span class="from">起</span></div>
        <p class="muted" style="margin:6px 0 0">分档定价：10 题 ¥{meta['pricing']['tiers'][0]['price']}　·　50 题 ¥{meta['pricing']['tiers'][1]['price']}　·　全书 100 题 ¥{meta['pricing']['tiers'][2]['price']}</p>
        <p class="muted" style="margin:6px 0 0">全包 ¥{meta['pricing']['bundle']['price']}：{meta['pricing']['bundle']['includes']}</p>
        <p class="muted" style="margin:6px 0 0">电子 PDF · A4 可打印 · 约 {len(qs)} 题 / {st['units']} 单元 / 7 天打卡表</p>
        <button class="cta">立即购买</button>
        <button class="cta ghost">先免费做 3 题</button>
        <p class="muted" style="margin:10px 0 0">免费 3 题在 App 内做完看不到解析，第 4 题起需要全包 ¥{meta['pricing']['bundle']['price']}。</p>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><b>{st['questions']}</b><span>道题目</span></div>
      <div class="kpi"><b>{st['words']}</b><span>个高频词，每词 1 题</span></div>
      <div class="kpi"><b>{st['units']}</b><span>个教学单元</span></div>
      <div class="kpi"><b>7</b><span>天一轮打卡</span></div>
    </div>
  </div>

  <section>
    <p class="eyebrow">痛点</p>
    <h2>你认识这个词，但不知道在这个句子里是哪一个意思</h2>
    <p class="lead">高考丢分很少是因为「不认识」，多数是因为「按自己最熟的那个义去理解句子」。
       这本册子只解决这一件事。</p>
    <div class="card" style="margin-top:14px">
      <svg viewBox="0 0 860 220" width="100%" role="img" aria-label="义项树示意：同一个词在不同语境下锁定不同义项">
        <defs>
          <style>
            .tn {{ font-family: 'Outfit','PingFang SC',sans-serif; font-size: 13px; fill: #47505f; }}
            .tw {{ font-family: 'Outfit','PingFang SC',sans-serif; font-size: 14px; fill: #14171e; font-weight: 600; }}
            .tk {{ font-family: 'JetBrains Mono',monospace; font-size: 11px; fill: #7c8a99; }}
          </style>
        </defs>
        <rect x="0" y="0" width="860" height="220" fill="none"/>
        <text class="tw" x="24" y="34">address</text>
        <text class="tk" x="24" y="52">/əˈdres/</text>
        <path d="M150 44 L214 44" stroke="#f59e0b" stroke-width="2"/>
        <path d="M214 44 L214 96" stroke="#f59e0b" stroke-width="2"/>
        <path d="M214 44 L214 152" stroke="#f59e0b" stroke-width="2"/>
        <path d="M214 96 L268 96" stroke="#f59e0b" stroke-width="2"/>
        <path d="M214 152 L268 152" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="214" cy="44" r="4" fill="#b45309"/>
        <text class="tw" x="24" y="96">address</text>
        <text class="tk" x="24" y="114">语境线索：the widening gap</text>
        <text class="tn" x="268" y="90">处理、解决（问题）</text>
        <text class="tk" x="268" y="108">S2 高考核心义 · 陷阱义</text>
        <text class="tn" x="268" y="126">→ address the gap</text>
        <text class="tw" x="24" y="152">address</text>
        <text class="tk" x="24" y="170">语境线索：the conference</text>
        <text class="tn" x="268" y="146">向…发表演说</text>
        <text class="tk" x="268" y="164">S2 · address an audience</text>
        <text class="tn" x="268" y="182">→ 同一词，两个义，看宾语决定</text>
        <text class="tk" x="560" y="52">考场动作：</text>
        <text class="tn" x="560" y="74">先圈动词后面的宾语是</text>
        <text class="tn" x="560" y="94">「问题类名词」还是「人 / 场合」</text>
        <text class="tn" x="560" y="114">→ 前者必是「处理、解决」义</text>
        <text class="tn" x="560" y="134">→ 后者才是「演讲」义</text>
      </svg>
    </div>
  </section>

  <section>
    <p class="eyebrow">内容规格</p>
    <h2>这本册子里是什么</h2>
    <div class="cols2" style="margin-top:14px">
      <div>
        <h3>难度分布</h3>
        {''.join(bench(DIFF_LABEL[k], v, total_q, pct=v / total_q * 100, note=f'{v/total_q*100:.0f}%') for k, v in diff_items)}
        <h3 style="margin-top:16px">题型载体</h3>
        {''.join(bench(CARRIER_LABEL.get(k, k), v, total_q, pct=v / total_q * 100, note=f'{v/total_q*100:.0f}%') for k, v in carr_items)}
      </div>
      <div>
        <h3>考的是哪个义项</h3>
        {''.join(bench(k, v, total_q, pct=v / total_q * 100, note=f'{v/total_q*100:.0f}%') for k, v in lvl_items)}
        <div class="card" style="margin-top:16px">
          <h3>每道题的三个固定件</h3>
          <p class="muted" style="margin:8px 0 0">
            ① 一个考点义项　② 三个讲清「学生为什么会选它」的干扰项　③ 一段可执行的考场动作。
            解析不写「A 是…，B 是…」，只写「看到什么线索 → 锁定哪个义」。
          </p>
          <p class="muted" style="margin:8px 0 0">
            册内 <b>{st.get('trap_senses', total_q)}/{total_q}</b> 题的目标义项是「陷阱义」——
            学生按自己最熟的那个义就会做错。考「收费」「账户」这类一读就懂的义项，不算熟词僻义，本册一道都没有。
          </p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">目录</p>
    <h2>{st['units']} 个教学单元，每个单元一个考场动作</h2>
    <div style="margin-top:10px">
      {''.join(f'''<div class="unit">
        <div class="unit-no"><b>单元 {u['no']}</b>{u['count']} 题</div>
        <div>
          <h3>{esc(u['title'])}</h3>
          <p class="muted" style="margin:0">{esc(u['focus'])}</p>
          <div class="action">{esc(u['action'])}</div>
        </div>
      </div>''' for u in units)}
    </div>
    <div class="grid3" style="margin-top:18px">
      <div class="card"><h3>答案速查表</h3><p class="muted">100 题答案 + 考到的义项 + 题型难度，一页对完。</p></div>
      <div class="card"><h3>逐题解析</h3><p class="muted">三段式解析 + 三个干扰项各自的「选它的人在想什么」。</p></div>
      <div class="card"><h3>义项速查表</h3><p class="muted">100 个词本册考过的那一个义项，配高频搭配，按题号排。</p></div>
    </div>
  </section>

  <section>
    <p class="eyebrow">样张</p>
    <h2>第 {sample['book_no']} 题 · 长什么样</h2>
    <p class="lead">下面是册子里的一道较难题原样呈现（含解析）。</p>
    <div class="sample" style="margin-top:14px">
      <div class="stem"><b class="mono" style="color:var(--accent-deep)">{sample['book_no']}</b>　{esc(sample['stem'])}</div>
      <div class="cn">{esc(sample['stem_cn'])}</div>
      <div class="opts">
        {''.join(f'<div class="opt{" right" if o.get("correct") else ""}"><b>{o["key"]}.</b>{esc(o["text"])}</div>' for o in sample['options'])}
      </div>
      <p class="muted" style="margin:0 0 10px">
        {CARRIER_LABEL.get(sample['carrier'], sample['carrier'])} · 难度 {DIFF_LABEL.get(sample['difficulty'], sample['difficulty'])}
        {f" · 考义项：{esc(wl['sense_text'])}（{wl['sense_level']}）" if wl else ''}
      </p>
      <div class="exp">
        {''.join(f'<p><span class="seg">{esc(seg.split(chr(10))[0])}</span>{"<br/>".join(esc(x) for x in seg.split(chr(10))[1:] if x)}</p>' for seg in sample['explanation'].split('【其他选项】')[:2])}
        <p><span class="seg">【其他选项】</span></p>
        <ul class="dis">
          {''.join(f'<li><b>{o["key"]}. {esc(o["text"])}</b> —— {esc(o["distractor_reason"] or "")}</li>' for o in sample['options'] if not o.get('correct'))}
        </ul>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">定价与交付</p>
    <h2>按覆盖量分档买，越买越全</h2>
    <div class="tiers" style="margin-top:14px">
{tier_cards}
    </div>
    <div class="tier hot" style="margin-top:16px">
      <span class="badge">全包 · App 内一价</span>
      <div class="p">¥{meta['pricing']['bundle']['price']}<small> / {esc(meta['pricing']['bundle']['includes'])}</small></div>
      <ul><li>完整 100 题训练册 PDF（100% 覆盖）</li><li>App 内全部专项训练、义项树与 FSRS 排期</li><li>家长周报 + 按你错因自动生成的复习词单</li></ul>
    </div>
    <p class="muted" style="margin-top:12px">纸质打印不再单独设档：所有档位都是电子 PDF，需要纸质自己双面打印即可，页码已避开装订位。全包与 App 内购买不互斥，可分开买。</p>
  </section>

  <section>
    <p class="eyebrow">体验与付费墙</p>
    <h2>App 内免费做 3 题，第 4 题起需要全包 ¥{meta['pricing']['bundle']['price']}</h2>
    <div class="card" style="margin-top:14px">
      <div class="grid2">
        <div>
          <h3>免费能拿到什么</h3>
          <p class="muted" style="margin:6px 0 0">3 道题的题干与选项、做完后知道自己错了哪一类错因、以及一张本机真实作答的错因分布图。</p>
        </div>
        <div>
          <h3>付费墙后面是什么</h3>
          <p class="muted" style="margin:6px 0 0">全包 ¥{meta['pricing']['bundle']['price']} 一次买断：全部专项训练、义项树与 FSRS 排期、家长周报，以及按你错因自动生成的复习词单。</p>
        </div>
      </div>
      <div style="margin-top:16px">
        <svg viewBox="0 0 820 76" width="100%" role="img" aria-label="付费墙落点流程">
          <defs><style>
            .fn {{ font-family:'Outfit','PingFang SC',sans-serif; font-size:12.5px; fill:#47505f; }}
            .fb {{ font-family:'Outfit','PingFang SC',sans-serif; font-size:13px; fill:#14171e; font-weight:600; }}
          </style></defs>
          <rect x="0" y="14" width="150" height="48" rx="10" fill="#fef6e7" stroke="#f59e0b"/>
          <text class="fb" x="16" y="36">第 1–3 题</text><text class="fn" x="16" y="53">免费 · 有解析</text>
          <path d="M156 38 L196 38" stroke="#f59e0b" stroke-width="2"/><path d="M190 32 L198 38 L190 44" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <rect x="204" y="14" width="190" height="48" rx="10" fill="#ffffff" stroke="#e6e9ee"/>
          <text class="fb" x="220" y="36">第 4 题</text><text class="fn" x="220" y="53">付费墙 · 全包 ¥{meta['pricing']['bundle']['price']}</text>
          <path d="M400 38 L440 38" stroke="#f59e0b" stroke-width="2"/><path d="M434 32 L442 38 L434 44" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <rect x="448" y="14" width="170" height="48" rx="10" fill="#ffffff" stroke="#e6e9ee"/>
          <text class="fb" x="464" y="36">解锁专项</text><text class="fn" x="464" y="53">全部专项 + 错因地图</text>
          <path d="M624 38 L664 38" stroke="#f59e0b" stroke-width="2"/><path d="M658 32 L666 38 L658 44" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <rect x="672" y="14" width="148" height="48" rx="10" fill="#fef6e7" stroke="#f59e0b"/>
          <text class="fb" x="688" y="36">按错因排期</text><text class="fn" x="688" y="53">FSRS 义项级复习</text>
        </svg>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">合规</p>
    <h2>版权边界</h2>
    <div class="notice" style="margin-top:12px">
      <p style="margin:0 0 6px">· 全书例句均为自编仿真例句，来源统一标注「仿真例句 · 高考阅读高频句式」。</p>
      <p style="margin:0 0 6px">· 不含任何真题原文、真题选项或真题解析。</p>
      <p style="margin:0 0 6px">· 中文释义为自行改写措辞，未搬运教材原文与词典释义。</p>
      <p style="margin:0">· 单词拼写与音标属事实性信息，按国际音标惯例标注。</p>
    </div>
  </section>

  <div class="foot">
    拾词 · 高考英语词汇系统　|　本册内容与题库版本 v1.0　|　共 {st['questions']} 题 / {st['words']} 词 / {st['units']} 单元
  </div>
</div>
</body>
</html>
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ 商品详情页 → {os.path.relpath(OUT, ROOT)}  ({len(html)} bytes)")


if __name__ == "__main__":
    main()
