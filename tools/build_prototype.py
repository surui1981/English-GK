#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 构建器（多文件源码 → 单文件原型）

源码在 app/：
  app/index.html      页面骨架（含登录门禁）
  app/styles.css      样式
  app/js/config.js    云服务公开配置
  app/js/cloud.js     Auth + Database 适配层
  app/js/fsrs.js      FSRS 引擎 + Store（源：prototype/src/fsrs.js）
  app/js/lex.js       义项级词库（源：prototype/src/lex.js）
  app/js/data.js      成书数据（源：data/product/*.json）
  app/js/app.js       页面交互
  app/js/boot.js      启动编排（登录门禁 + 云端恢复）

本脚本做两件事：
  1) 从数据源刷新 app/js/{fsrs,lex,data}.js
  2) 把 app/ 组装成 prototype/index.html 单文件包（便于离线分发与端到端测试）

单文件包里去掉 CDN 的 <script src>：测试环境用替身注入 WorkBuddyCloud。
输入: app/**, prototype/src/**, data/product/**
输出: app/js/{fsrs,lex,data}.js, prototype/index.html
"""
import os
import re
import json
import shutil
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'app')
SRC = os.path.join(ROOT, 'prototype', 'src')
PAGE = os.path.join(ROOT, 'prototype', 'index.html')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def refresh_data():
    """从数据源刷新三个生成物，避免手改被覆盖。"""
    for name in ('fsrs.js', 'lex.js'):
        shutil.copyfile(os.path.join(SRC, name), os.path.join(APP, 'js', name))

    def inject_json(filename, varname, note):
        p = os.path.join(ROOT, 'data', 'product', filename)
        if not os.path.exists(p):
            return ''
        data = json.load(open(p, encoding='utf-8'))
        return ('/* %s · 由 tools/build_*.py 生成 */\nvar %s = %s;\n'
                % (note, varname, json.dumps(data, ensure_ascii=False)))

    def coverage_js():
        p = os.path.join(ROOT, 'data', 'product', 'word_coverage.json')
        if not os.path.exists(p):
            return ''
        data = json.load(open(p, encoding='utf-8'))
        keep = ('w', 'ipa', 'pos', 'theme', 'tier', 'deep', 'sense_count', 'is_phrase')
        slim = lambda w: {k: w[k] for k in keep if k in w}
        all_words = [slim(w) for w in data.get('words', [])]
        required = [w for w in all_words if w.get('tier') == 'required']
        recommended = [w for w in all_words if w.get('tier') == 'recommended']
        payload = OrderedDict([
            ('meta', data.get('meta', {})),
            ('all', all_words),
            ('required', required),
            ('recommended_sample', recommended[:80]),
            ('recommended_total', len(recommended)),
        ])
        return ('/* 全包覆盖层 · 已移除教材原始释义字段 · all 为全量进度词表 */\n'
                'var CTX_COVERAGE = %s;\n' % json.dumps(payload, ensure_ascii=False))

    js = '\n'.join(filter(None, [
        inject_json('context_book.json', 'CTX_BOOK', '《仿真语境版》成书数据'),
        inject_json('colloc_book.json', 'CTX_COLLOC', '《高频搭配速记手册》成书数据'),
        inject_json('quiz_book.json', 'CTX_QUIZ', '《熟词僻义100题训练册》成书数据'),
        inject_json('trap_variants.json', 'CTX_TRAP', '熟词僻义 · 高考常考变体词汇数据'),
        inject_json('plan_book.json', 'CTX_PLAN', '《30天冲刺计划表》成书数据'),
        coverage_js(),
        inject_json('ai_paraphrase.json', 'CTX_PARAPHRASE', '必考层 · 自研释义改写数据'),
    ]))
    write(os.path.join(APP, 'js', 'data.js'), js.rstrip() + '\n')


def build_bundle():
    html = read(os.path.join(APP, 'index.html'))

    # 1) 内联样式
    css = read(os.path.join(APP, 'styles.css'))
    html, n = re.subn(
        r'<link rel="stylesheet" href="styles\.css">',
        '<style>\n' + css.rstrip() + '\n</style>', html, count=1)
    if n != 1:
        raise SystemExit('app/index.html 中找不到 styles.css 引用')

    # 2) 去掉 CDN SDK（测试环境自行注入替身；线上仍从 app/ 走 CDN）
    html, n = re.subn(
        r'\s*<script src="https://cdn\.jsdelivr\.net/npm/@tencent-ai/workbuddy-cloud-sdk[^>]*></script>',
        '', html, count=1)
    if n != 1:
        raise SystemExit('app/index.html 中找不到云服务 SDK 引用')

    # 3) 内联全部应用脚本（按 index.html 中声明的顺序）
    scripts = re.findall(r'<script src="js/([^"]+\.js)"></script>', html)
    if not scripts:
        raise SystemExit('app/index.html 中找不到应用脚本引用')
    parts = []
    for name in scripts:
        parts.append('/* ==== app/js/%s ==== */\n%s' % (name, read(os.path.join(APP, 'js', name)).rstrip()))
    inline = '<script>\n' + '\n\n'.join(parts) + '\n</script>'
    html = re.sub(r'<script src="js/[^"]+\.js"></script>\n?', '', html)
    html = html.replace('</body>', inline + '\n</body>', 1)

    write(PAGE, html)
    return scripts


def main():
    refresh_data()
    scripts = build_bundle()
    size = os.path.getsize(PAGE) / 1024
    print('单文件原型已生成：%s（%.1f KB）' % (PAGE, size))
    print('  内联脚本：' + ', '.join(scripts))
    print('  源码目录：app/（多文件，为唯一可维护源）')


if __name__ == '__main__':
    main()
