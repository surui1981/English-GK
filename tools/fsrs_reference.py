#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FSRS-5 参考实现（Python）+ 基准校验

用途：
  原型里的「记忆算法」要从静态文案变成真逻辑，必须先有一份可信的参考实现，
  并用公开基准值校验，再移植到前端 JS。此脚本是移植前的唯一真相来源。

公式与参数来源（多来源一致）：
  - FSRS-5 标准 19 权重
  - DECAY = -0.5，FACTOR = 19/81（幂律遗忘曲线）
  - 难度 D ∈ [1,10]，稳定度 S > 0，可提取性 R = (1 + FACTOR·t/S)^DECAY
  - 离散模式：复习间隔按整日取整后再算下一次的可提取性

三档评价映射（原型只有 3 个按钮）：
  1 不认识 → FSRS rating 1 (Again)
  2 模糊   → FSRS rating 2 (Hard)
  3 认识   → FSRS rating 3 (Good)
  （FSRS rating 4 = Easy 未在 UI 暴露）

基准校验（公开 FSRS visualizer 对照值）：
  连续按 Good、目标留存 0.90 时，稳定度序列应为 3.17 → 10.74 → 34.58 → 100.75
  各公开实现因取整口径（间隔是否先取整再算留存）差异有 ~0.16 的偏差，容差取 0.2。
"""
import math

W = [
    0.40255, 1.18385, 3.173, 15.69105,        # w0-w3  初始稳定度（Again/Hard/Good/Easy）
    7.1949, 0.5345,                           # w4-w5  初始难度
    1.4604, 0.0046,                           # w6-w7  难度更新与均值回拉
    1.54575, 0.1192, 1.01925,                 # w8-w10 成功后的稳定度增长
    1.9395, 0.11, 0.29605, 2.2698,            # w11-w14 失败后的稳定度
    0.2315, 2.9898,                           # w15-w16 Hard 惩罚 / Easy 奖励
    0.51655, 0.6621,                          # w17-w18 当日复习
]
DECAY = -0.5
FACTOR = 19 / 81
MIN_D, MAX_D = 1.0, 10.0
REQUEST_RETENTION = 0.90
MAX_INTERVAL = 36500

# 状态机
NEW, LEARNING, REVIEW, RELEARNING = 0, 1, 2, 3


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def init_stability(rating):
    return W[rating - 1]


def init_difficulty(rating):
    return clamp(W[4] - math.exp(W[5] * (rating - 1)) + 1, MIN_D, MAX_D)


def next_difficulty(d, rating):
    delta = -W[6] * (rating - 3)
    d_prime = d + delta * ((10 - d) / 9)
    d_target = init_difficulty(4)
    return clamp(W[7] * d_target + (1 - W[7]) * d_prime, MIN_D, MAX_D)


def retrievability(elapsed_days, s):
    """幂律遗忘曲线：t=0 时 R=1，t=S 时 R≈0.9"""
    return math.pow(1 + FACTOR * elapsed_days / s, DECAY)


def next_interval(s, request_retention=REQUEST_RETENTION):
    """解 R(t)=request_retention 得下次复习间隔（天，未取整）"""
    return (s / FACTOR) * (math.pow(request_retention, 1 / DECAY) - 1)


def stability_after_success(s, r, d, rating):
    hard = W[15] if rating == 2 else 1.0
    easy = W[16] if rating == 4 else 1.0
    return s * (1 + math.exp(W[8]) * (11 - d) * math.pow(s, -W[9])
                * (math.exp((1 - r) * W[10]) - 1) * hard * easy)


def stability_after_failure(s, r, d):
    return (W[11] * math.pow(d, -W[12]) * (math.pow(s + 1, W[13]) - 1)
            * math.exp(W[14] * (1 - r)))


def short_term_stability(s, rating):
    return s * math.exp(W[17] * (rating - 3 + W[18]))


def new_card():
    return {'state': NEW, 'd': 0.0, 's': 0.0, 'due': None, 'last': None,
            'reps': 0, 'lapses': 0}


def review(card, elapsed_days, rating):
    """一次复习 → 新卡状态。elapsed_days 为距上次复习的天数。"""
    if card['state'] == NEW:
        d = init_difficulty(rating)
        s = init_stability(rating)
        state = LEARNING if rating == 1 else REVIEW
        iv = round(next_interval(s))
        card.update(state=state, d=d, s=s, reps=1,
                    lapses=1 if rating == 1 else 0)
    else:
        r = retrievability(elapsed_days, card['s'])
        d = next_difficulty(card['d'], rating)
        if rating == 1:
            s = min(stability_after_failure(card['s'], r, d), card['s'])
            card['lapses'] += 1
            state = RELEARNING
        else:
            s = stability_after_success(card['s'], r, d, rating)
            state = REVIEW
        iv = round(next_interval(s))
        card.update(state=state, d=d, s=s, reps=card['reps'] + 1)
    card['iv'] = iv
    return card


def check():
    ok = True
    print('=' * 62)
    print('FSRS-5 基准校验')
    print('=' * 62)

    # 1) 初始难度
    d3 = init_difficulty(3)
    good = abs(d3 - 5.28) < 0.01
    ok &= good
    print(f'  初始难度(Good=3) = {d3:.2f}  期望 5.28  {"OK" if good else "FAIL"}')

    # 2) 稳定度序列：连续 Good
    card = new_card()
    seq = []
    elapsed = 0
    for _ in range(4):
        review(card, elapsed, 3)
        seq.append(round(card['s'], 2))
        elapsed = card['iv']
    expect = [3.17, 10.74, 34.58, 100.75]
    good = all(abs(a - b) < 0.2 for a, b in zip(seq, expect))
    ok &= good
    print(f'  连续Good稳定度 = {seq}')
    print(f'  期望           = {expect}   {"OK" if good else "FAIL"}')

    # 3) 遗忘曲线性质
    s = card['s']
    r0, r_at_s = retrievability(0, s), retrievability(s, s)
    good = abs(r0 - 1.0) < 1e-9 and abs(r_at_s - 0.9) < 0.005
    ok &= good
    print(f'  R(0)={r0:.4f}（应=1.0）  R(S)={r_at_s:.4f}（应≈0.9）  {"OK" if good else "FAIL"}')

    # 4) 三档评价必须产生不同间隔（原型核心断言）
    base = new_card()
    review(base, 0, 3)
    rows = []
    for rating, label in ((1, '不认识'), (2, '模糊'), (3, '认识')):
        c = dict(base)
        review(c, c['iv'], rating)
        rows.append((rating, label, round(c['s'], 2), c['iv']))
    ivs = [r[3] for r in rows]
    good = all(ivs[i] < ivs[i + 1] for i in range(len(ivs) - 1))
    ok &= good
    print('  三档评价产生不同间隔（不认识 < 模糊 < 认识）:')
    for rating, label, ss, iv in rows:
        print(f'     {label}(r={rating})  S\'={ss:<8} 下次间隔={iv} 天')
    print(f'  {"OK" if good else "FAIL"}')

    # 5) 失败不得增长稳定度
    c = new_card()
    review(c, 0, 3)
    before = c['s']
    review(c, c['iv'], 1)
    good = c['s'] <= before
    ok &= good
    print(f'  失败后稳定度 {before:.3f} → {c["s"]:.3f}（不得增长）  {"OK" if good else "FAIL"}')

    # 6) 间隔必须单调随重复次数增长
    c = new_card()
    review(c, 0, 3)
    ivs = [c['iv']]
    for _ in range(3):
        review(c, c['iv'], 3)
        ivs.append(c['iv'])
    good = all(ivs[i] < ivs[i + 1] for i in range(len(ivs) - 1))
    ok &= good
    print(f'  连续Good间隔序列 = {ivs}（应单调递增）  {"OK" if good else "FAIL"}')

    print('=' * 62)
    print('结论：' + ('全部通过，可作为 JS 移植基准' if ok else '存在偏差，暂不移植'))
    return ok


if __name__ == '__main__':
    raise SystemExit(0 if check() else 1)
