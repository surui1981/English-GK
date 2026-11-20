#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拾词 · 原型注入构建器

把 prototype/src/fsrs.js（FSRS-5 引擎 + 真实统计仓库）与
prototype/src/lex.js（义项级词库数据）注入 prototype/index.html。

原型要能单文件分发，所以引擎与数据内联进 HTML；
但它们是生成物，不手改——手改会被下次构建覆盖。

注入点：prototype/index.html 里的 /* @inject:fsrs */ 标记
（幂等：重复运行只替换标记后的注入块，不会重复追加）。

输入: prototype/src/fsrs.js, prototype/src/lex.js
输出: prototype/index.html
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'prototype', 'src')
PAGE = os.path.join(ROOT, 'prototype', 'index.html')

MARK = '/* @inject:fsrs */'
BEGIN = '/* ==== BEGIN @inject:fsrs ==== */'
END = '/* ==== END @inject:fsrs ==== */'


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def main():
    html = read(PAGE)
    fsrs = read(os.path.join(SRC, 'fsrs.js'))
    lex = read(os.path.join(SRC, 'lex.js'))

    block = '\n'.join([
        BEGIN,
        '/* 以下为生成内容，源文件见 prototype/src/，请勿手改 */',
        fsrs.rstrip(),
        lex.rstrip(),
        END,
    ])

    # 先清掉旧的注入块
    pat = re.compile(re.escape(BEGIN) + r'.*?' + re.escape(END), re.S)
    html, n = pat.subn(block, html)
    if n == 0:
        if MARK not in html:
            raise SystemExit('prototype/index.html 中找不到注入标记 /* @inject:fsrs */')
        html = html.replace(MARK, MARK + '\n' + block, 1)
        mode = '插入'
    else:
        mode = '替换'

    with open(PAGE, 'w', encoding='utf-8') as f:
        f.write(html)

    size = os.path.getsize(PAGE) / 1024
    print(f'原型注入{mode}完成：{PAGE}（{size:.1f} KB）')
    print(f'  FSRS 引擎 {len(fsrs)/1024:.1f} KB · 义项数据 {len(lex)/1024:.1f} KB')


if __name__ == '__main__':
    main()
