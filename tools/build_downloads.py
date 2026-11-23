#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 下单后可下载电子资料生成器

从 data/product/*.json 派生自研内容，生成自包含、可 A4 打印的 HTML 资料，
放在 app/assets/downloads/，下单后由前端提供下载入口。

输入：data/product/{context_book,colloc_book,quiz_book,plan_book,highfreq688}.json
输出：
  app/assets/downloads/高考英语核心词-仿真语境版.html
  app/assets/downloads/高考英语高频搭配速记手册.html
  app/assets/downloads/熟词僻义100题专项训练册.html
  app/assets/downloads/30天冲刺计划表.html
  app/assets/downloads/高考核心高频688词表.html
  app/assets/downloads/熟词僻义100题专项训练册.pdf  （复制现成 PDF）

版权红线：所有内容均为自研仿真写作 + 规范化义项整理，不含真题原文/选项/解析，
不引用教材原文件。教材 .doc/.xls 一律不进入下载资源。
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'product')
OUT = os.path.join(ROOT, 'app', 'assets', 'downloads')


def load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


def esc(s):
    if s is None:
        return ''
    return (str(s).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


CSS = """
@page{size:A4;margin:16mm}
*{box-sizing:border-box}
body{font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;color:#1f2937;line-height:1.65;margin:0;font-size:11px}
h1{font-size:24px;margin:0 0 6px;color:#0f766e}
h2{font-size:15px;margin:26px 0 10px;padding-bottom:6px;border-bottom:2px solid #0f766e;color:#0f766e}
h3{font-size:12.5px;margin:16px 0 6px;color:#111827}
.cover{text-align:center;padding:46mm 0 30mm;border-bottom:3px solid #0f766e;margin-bottom:10mm}
.cover .eyebrow{font-size:11px;letter-spacing:.2em;color:#0f766e;text-transform:uppercase}
.cover h1{font-size:34px;margin:16px 0 10px}
.cover .sub{font-size:14px;color:#4b5563}
.cover .meta{margin-top:40px;font-size:11px;color:#6b7280;line-height:2}
.note{background:#f0fdfa;border-left:3px solid #0f766e;padding:10px 13px;margin:10px 0;font-size:10.5px;color:#374151}
.legal{font-size:9.5px;color:#9ca3af;margin-top:8px;line-height:1.6}
.word{break-inside:avoid;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:9px;padding:11px 13px;margin:0 0 9px}
.word .hd{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
.word .hw{font-size:16px;font-weight:700;color:#111827}
.word .ipa{font-family:monospace;font-size:10px;color:#6b7280}
.word .tier{font-size:9px;color:#0f766e;border:1px solid #0f766e;border-radius:4px;padding:1px 6px;margin-left:auto}
.sense{border-top:1px dashed #e5e7eb;padding-top:6px;margin-top:6px}
.sense:first-of-type{border-top:none;padding-top:0;margin-top:0}
.sense .st{font-weight:600;color:#0f766e}
.trap{font-size:9px;color:#dc2626;border:1px solid #dc2626;border-radius:4px;padding:1px 5px;margin-left:6px}
.ex{color:#374151;font-style:italic;margin:4px 0 2px}
.zh{color:#6b7280;font-size:10px}
.col{color:#0f766e;font-size:9.5px;margin-top:3px}
.src{color:#9ca3af;font-size:8.5px;margin-top:3px}
.q{break-inside:avoid;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:9px;padding:12px 14px;margin:0 0 10px}
.q .no{font-size:10px;color:#9ca3af;font-family:monospace}
.q .stem{font-size:12.5px;font-weight:600;margin:4px 0}
.q .opts{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin:7px 0;font-size:11px}
.q .ans{background:#f0fdfa;padding:7px 10px;border-radius:6px;font-size:10.5px}
.q .exp{font-size:10px;color:#4b5563;white-space:pre-wrap;margin-top:5px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f0fdfa;color:#0f766e}
.foot{margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:9px}
@media print{.no-print{display:none}}
"""


def page(title, eyebrow, subtitle, body_html, legal):
    return ('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>'
            '<div class="cover"><div class="eyebrow">' + esc(eyebrow) + '</div>'
            '<h1>' + esc(title) + '</h1><div class="sub">' + esc(subtitle) + '</div>'
            '<div class="meta">拾词 · 高考英语核心词资料包<br>电子版 · 下单后免费下载 · 可打印 A4<br>'
            '自研仿真内容，不含真题原文</div></div>'
            '<div class="note">使用说明：本资料为电子版，可直接在浏览器打印（Ctrl/Cmd + P）为 PDF 或纸质版；'
            '双面打印亦可。例句与解析均为自研仿真写作，用于语境记忆训练。</div>'
            + body_html +
            '<div class="legal">' + esc(legal) + '</div>'
            '<div class="foot">拾词 · 下单后免费下载 · 一次买断永久可读 &nbsp;|&nbsp; ' + esc(title) + '</div>'
            '</body></html>')


def write(name, html):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(html)
    print('  生成 %s（%.1f KB）' % (name, len(html.encode('utf-8')) / 1024))


def build_context():
    d = load('context_book.json')
    m = d['meta']
    chunks = ['<h2>正文 · 核心词释义与仿真语境</h2>']
    for w in d['words']:
        senses = []
        for s in w.get('senses', []):
            parts = ['<div class="sense"><span class="st">' + esc(s.get('text')) + '</span>']
            if s.get('is_trap'):
                parts.append('<span class="trap">陷阱义</span>')
            if s.get('example'):
                parts.append('<div class="ex">' + esc(s['example']) + '</div>')
            if s.get('example_zh'):
                parts.append('<div class="zh">' + esc(s['example_zh']) + '</div>')
            if s.get('collocations'):
                parts.append('<div class="col">搭配 · ' + esc(' / '.join(s['collocations'])) + '</div>')
            parts.append('</div>')
            senses.append(''.join(parts))
        hdr = ('<div class="hd"><span class="hw">' + esc(w['headword']) + '</span>'
               '<span class="ipa">' + esc(w.get('ipa', '')) + '</span>'
               '<span class="tier">' + esc(w.get('core_tier') or w.get('level', '')) + '</span></div>')
        core = ''
        if w.get('core_meaning'):
            core = '<div class="zh">核心义：' + esc(w['core_meaning']) + '</div>'
        chunks.append('<div class="word">' + hdr + core + ''.join(senses) + '</div>')
    return page(m['name'], 'CONTEXT · 仿真语境版', m.get('subtitle', ''),
                ''.join(chunks), m.get('copyright', ''))


def build_colloc():
    d = load('colloc_book.json')
    m = d['meta']
    chunks = ['<h2>正文 · 高频搭配（按义项分组）</h2>']
    for w in d['words']:
        groups = []
        for g in w.get('groups', []):
            cols = []
            for c in g.get('collocations', []):
                item = '<div class="sense"><span class="st">' + esc(c.get('text')) + '</span>'
                if c.get('type'):
                    item += ' <span class="src">' + esc(c['type']) + '</span>'
                if c.get('example'):
                    item += '<div class="ex">' + esc(c['example']) + '</div>'
                if c.get('example_zh'):
                    item += '<div class="zh">' + esc(c['example_zh']) + '</div>'
                item += '</div>'
                cols.append(item)
            groups.append('<h3>' + esc(g.get('sense', '')) + '</h3>' + ''.join(cols))
        if w.get('note'):
            groups.insert(0, '<div class="note">' + esc(w['note']) + '</div>')
        hdr = ('<div class="hd"><span class="hw">' + esc(w['headword']) + '</span>'
               '<span class="ipa">' + esc(w.get('ipa', '')) + '</span>'
               '<span class="tier">' + esc(w.get('level', '')) + '</span></div>')
        chunks.append('<div class="word">' + hdr + ''.join(groups) + '</div>')
    return page(m['name'], 'COLLOCATION · 高频搭配', m.get('subtitle', ''),
                ''.join(chunks), m.get('copyright', ''))


def build_quiz():
    d = load('quiz_book.json')
    m = d['meta']
    chunks = ['<h2>题目与解析</h2>']
    for q in d['questions']:
        opts = ''.join('<div>' + esc(o['key']) + '. ' + esc(o['text']) + '</div>'
                       for o in q.get('options', []))
        expl = (q.get('explanation', '').replace('<b>', '').replace('</b>', ''))
        chunks.append(
            '<div class="q"><div class="no">No.' + str(q.get('no', '')) +
            ' &nbsp;|&nbsp; ' + esc(q.get('module', '')) + ' &nbsp;|&nbsp; ' + esc(q.get('difficulty', '')) + '</div>'
            '<div class="stem">' + esc(q.get('stem', '')) + '</div>'
            '<div class="zh">' + esc(q.get('stem_cn', '')) + '</div>'
            '<div class="opts">' + opts + '</div>'
            '<div class="ans">答案 ' + esc(q.get('answer', '')) + ' · ' + esc(q.get('answer_text', '')) +
            '（' + esc(q.get('sense_text', '')) + '）</div>'
            '<div class="exp">' + esc(expl) + '</div></div>')
    return page(m['name'], 'TRAP · 熟词僻义 100 题', m.get('subtitle', ''),
                ''.join(chunks), m.get('copyright', ''))


def build_plan():
    d = load('plan_book.json')
    m = d['meta']
    chunks = ['<h2>30 天冲刺计划表</h2>',
              '<table><tr><th>天数</th><th>阶段</th><th>新词量</th><th>当日词表</th><th>类型</th></tr>']
    for day in d['days']:
        words = ' / '.join(day.get('new_words', []))
        chunks.append('<tr><td>D' + str(day['day']) + '</td><td>' + esc(day.get('phase', '')) +
                      '</td><td>' + str(day.get('new_count', '')) + '</td><td>' + esc(words) +
                      '</td><td>' + ('复习' if day.get('is_review') else '新学') + '</td></tr>')
    chunks.append('</table>')
    chunks.append('<div class="note">打卡用法：每天完成后在纸质版上勾选；' +
                  'App 内「30 天计划表」页面也提供逐日展开与在线打卡（随账号云同步）。</div>')
    return page(m['name'], 'PLAN · 30 天冲刺', m.get('subtitle', ''),
                ''.join(chunks), m.get('copyright', ''))


def build_688():
    d = load('highfreq688.json')
    m = d['meta']
    chunks = ['<h2>高频词表 · 按真题考频排序</h2>',
              '<table><tr><th>序号</th><th>单词</th><th>音标</th><th>考频</th><th>义项</th></tr>']
    for w in d['words']:
        senses = ' / '.join(w.get('senses', [])) or w.get('cn_raw', '')
        chunks.append('<tr><td>' + str(w['no']) + '</td><td><b>' + esc(w['headword']) + '</b></td>'
                      '<td>' + esc(w.get('ipa', '')) + '</td><td>' + str(w.get('freq', '')) + '</td>'
                      '<td>' + esc(senses) + '</td></tr>')
    chunks.append('</table>')
    return page('高考核心高频 688 词', 'FREQUENCY · 高频词表', m.get('desc', ''),
                ''.join(chunks), m.get('copyright', ''))


def main():
    os.makedirs(OUT, exist_ok=True)
    write('高考英语核心词-仿真语境版.html', build_context())
    write('高考英语高频搭配速记手册.html', build_colloc())
    write('熟词僻义100题专项训练册.html', build_quiz())
    write('30天冲刺计划表.html', build_plan())
    write('高考核心高频688词表.html', build_688())

    pdf_src = os.path.join(ROOT, 'output', '熟词僻义100题专项训练册.pdf')
    if os.path.exists(pdf_src):
        shutil.copyfile(pdf_src, os.path.join(OUT, '熟词僻义100题专项训练册.pdf'))
        print('  复制 熟词僻义100题专项训练册.pdf（现成 PDF）')
    print('电子资料生成完成：%s' % OUT)


if __name__ == '__main__':
    main()
