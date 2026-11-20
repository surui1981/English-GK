#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把原型的定价模型一次性切到「分阶段定价 + ¥9.9 全包」。

改这一处的原因是它散落在 20 多个位置（会员页 / 我的 / 付费墙 / 支付弹窗 /
下单弹窗 / 商品卡 / 首页卡 / 设计说明），手工改容易漏。每条替换都断言命中，
漏一条直接失败，不留半改状态。
"""
import io
import sys

P = "prototype/index.html"

# (说明, 旧串, 新串)
REPL = [
    # ── 首页三张商品卡 ─────────────────────────────────────────────
    ("首页卡·核心1500词",
     '<div class="prod-price"><b>¥39</b><span>¥68</span></div>\n                    <div class="prod-meta">电子 PDF + 纸质</div>',
     '<div class="prod-price"><b>¥4.9</b></div>\n                    <div class="prod-meta">分档 150/750/1500 词 · ¥1.9 起</div>'),
    ("首页卡·熟词僻义",
     '<div class="prod-price"><b>¥19</b><span>¥35</span></div>\n                    <div class="prod-meta">电子 PDF · 含逐题解析与义项速查</div>',
     '<div class="prod-price"><b>¥4.9</b></div>\n                    <div class="prod-meta">分档 10/50/100 题 · ¥1.9 起</div>'),
    ("首页卡·高频搭配",
     '<div class="prod-price"><b>¥29</b><span>¥52</span></div>\n                    <div class="prod-meta">口袋本</div>',
     '<div class="prod-price"><b>¥4.9</b></div>\n                    <div class="prod-meta">分档 60/300/600 组 · ¥1.9 起</div>'),

    # ── GOODS 数组：分档价 + 去掉虚构原价 ───────────────────────────
    ("GOODS·核心1500词",
     'p:39,o:68,badge:"热销"',
     'p:4.9,o:null,badge:"热销"'),
    ("GOODS·核心1500词 note",
     'coverText:"真题语境<br>核心1500词",note:"新上架 · 会员再减 20%"',
     'coverText:"真题语境<br>核心1500词",note:"分档：150 词 ¥1.9 / 750 词 ¥3.9 / 全书 ¥4.9"'),
    ("GOODS·熟词僻义",
     'p:19,o:35,badge:"新上架"',
     'p:4.9,o:null,badge:"新上架"'),
    ("GOODS·熟词僻义 note",
     'coverText:"熟词僻义<br>100题专项",note:"首册 · 会员再减 20%"',
     'coverText:"熟词僻义<br>100题专项",note:"分档：10 题 ¥1.9 / 50 题 ¥3.9 / 全册 ¥4.9"'),
    ("GOODS·高频搭配",
     'p:29,o:52,badge:"口袋本"',
     'p:4.9,o:null,badge:"分档"'),
    ("GOODS·高频搭配 note",
     'coverText:"高频搭配<br>速记手册",note:"新上架 · 会员再减 20%"',
     'coverText:"高频搭配<br>速记手册",note:"分档：60 组 ¥1.9 / 300 组 ¥3.9 / 全书 ¥4.9"'),
    ("GOODS·计划表",
     'p:9.9,o:19,badge:"打印即用"',
     'p:3.9,o:null,badge:"打印即用"'),
    ("GOODS·计划表 note",
     'coverText:"30天冲刺<br>计划打卡表",note:"新上架 · 会员再减 20%"',
     'coverText:"30天冲刺<br>计划打卡表",note:"分档：7 天 ¥1.9 / 30 天全套 ¥3.9"'),

    # ── 商品卡渲染：原价可缺省 ─────────────────────────────────────
    ("GOODS 渲染·原价可选",
     "'<div class=\"gbot\"><div><div class=\"gprice\"><b>¥'+g.p+'</b><s>¥'+g.o+'</s></div>",
     "'<div class=\"gbot\"><div><div class=\"gprice\"><b>¥'+g.p+'</b>'+(g.o?'<s>¥'+g.o+'</s>':'')+'</div>"),

    # ── 会员卡 → 全包卡 ────────────────────────────────────────────
    ("会员卡·标题",
     '<span class="k">最受欢迎 · 覆盖全部核心词</span>\n                <h4>拾词年度会员</h4>\n                <p style="font-size:12px;color:var(--ink-3)">解锁全部专项训练、真题例句库与家长周报</p>',
     '<span class="k">全包 · 一次买断</span>\n                <h4>拾词全包</h4>\n                <p style="font-size:12px;color:var(--ink-3)">完整 100 题训练册 + 全部专项训练、义项树与家长周报</p>'),
    ("会员卡·价格",
     '<b>¥168</b><s>¥300</s><em>年卡省 ¥132</em>',
     '<b>¥9.9</b><em>全站最高价</em>'),
    ("会员卡·权益加训练册",
     '<div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>全部专项训练题库 + 解析</div>',
     '<div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>完整 100 题专项训练册 PDF</div>\n                  <div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>全部专项训练题库 + 解析</div>'),
    ("会员卡·例句库",
     '<div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>真题风格例句库（仅会员）</div>',
     '<div><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>真题风格例句库</div>'),
    ("会员卡·按钮",
     '<button class="btn btn-primary" onclick="openPay(\'year\')">立即开通年卡</button>',
     '<button class="btn btn-primary" onclick="openPay(\'all\')">立即购买全包</button>'),

    # ── 单品教辅区：去纸质 ─────────────────────────────────────────
    ("单品教辅·副标",
     '<div class="sec-head"><h3>单品教辅</h3><span class="more">支持 PDF + 纸质书</span></div>',
     '<div class="sec-head"><h3>单品教辅</h3><span class="more">电子 PDF · 分档定价</span></div>'),
    ("单品教辅·配送说明",
     '<div style="font-size:11.5px;color:var(--ink-3)">纸质版由合作印厂发出，48 小时内寄出</div>',
     '<div style="font-size:11.5px;color:var(--ink-3)">全部电子版，可自行双面打印，无实体书</div>'),

    # ── 我的页：升级入口 ───────────────────────────────────────────
    ("我的·升级卡标题",
     '<div style="font-size:15px;font-weight:700">升级会员，解锁全部专项</div>',
     '<div style="font-size:15px;font-weight:700">升级全包，解锁全部专项</div>'),
    ("我的·升级卡价格",
     '<div style="font-size:12px;color:var(--ink-3);margin-top:2px">年卡 ¥168 · 覆盖到高考</div>',
     '<div style="font-size:12px;color:var(--ink-3);margin-top:2px">全包 ¥9.9 · 一次买断</div>'),
    ("我的·升级卡按钮",
     '<button class="btn btn-primary btn-sm" onclick="openPay(\'year\')">开通</button>',
     '<button class="btn btn-primary btn-sm" onclick="openPay(\'all\')">开通</button>'),
    ("我的·专项统计",
     '<div><b style="font-family:\'Outfit\';font-size:17px">32</b><div style="font-size:10.5px;color:var(--ink-3)">专项训练</div></div>',
     '<div><b style="font-family:\'Outfit\';font-size:17px">全部</b><div style="font-size:10.5px;color:var(--ink-3)">专项训练</div></div>'),
    ("我的·订单入口",
     '<button class="mrow" onclick="openPay(\'month\')">',
     '<button class="mrow" onclick="openPay(\'all\')">'),

    # ── 设计说明 ───────────────────────────────────────────────────
    ("设计说明·定价",
     '<li><span class="k">A</span><span>专项训练第 4 题起 · 年卡 ¥168 / 月卡 ¥25</span></li>',
     '<li><span class="k">A</span><span>专项训练第 4 题起 · 全包 ¥9.9（一次买断，含完整训练册）</span></li>'),

    # ── 付费墙 ─────────────────────────────────────────────────────
    ("付费墙·错因地图按钮",
     '\'<button class="btn btn-primary" onclick="openPay(\\\'year\\\')">解锁完整失分地图</button>\'+',
     '\'<button class="btn btn-primary" onclick="openPay(\\\'all\\\')">解锁完整失分地图</button>\'+'),
    ("付费墙·文案",
     "'<p style=\"font-size:12.5px;color:var(--ink-3);line-height:1.6\">你已完成 3 道免费题。第 4 题起需要会员 —— 全部 32 个专项训练、真题例句库和完整失分地图都在里面。</p>'+",
     "'<p style=\"font-size:12.5px;color:var(--ink-3);line-height:1.6\">你已完成 3 道免费题。第 4 题起需要全包 —— 全部专项训练、真题例句库和完整失分地图都在里面。</p>'+"),
    ("付费墙·按钮组",
     "'<button class=\"btn btn-primary\" style=\"margin-top:16px\" onclick=\"openPay(\\'year\\')\">开通年卡 ¥168 继续</button>'+\n      '<button class=\"btn btn-line\" style=\"margin-top:6px\" onclick=\"paywallPassed=true;renderQuiz()\">先用月卡试试 · ¥25</button>'+\n      '<div style=\"font-size:11px;color:var(--ink-3);margin-top:12px\">已有 12,400+ 高考生开通 · 支持 7 天无理由退款</div>'+",
     "'<button class=\"btn btn-primary\" style=\"margin-top:16px\" onclick=\"openPay(\\'all\\')\">购买全包 ¥9.9 继续</button>'+\n      '<button class=\"btn btn-line\" style=\"margin-top:6px\" onclick=\"paywallPassed=true;renderQuiz()\">先继续刷题（演示跳过付费墙）</button>'+\n      '<div style=\"font-size:11px;color:var(--ink-3);margin-top:12px\">¥9.9 一次买断，含完整 100 题训练册 · 支持 7 天无理由退款</div>'+"),

    # ── 支付弹窗：单档全包 ─────────────────────────────────────────
    ("支付·成功文案",
     "'<h3>开通成功</h3><p>'+(y?'年度会员已生效，有效期至 2027 年 6 月高考结束':'月卡会员已生效，可随时续费')+'</p>'+",
     "'<h3>开通成功</h3><p>全包已生效：完整训练册 + App 全部功能，一次买断，没有续费</p>'+"),
    ("支付·标题",
     "s+='<h3>拾词会员</h3><p class=\"sub\">解锁全部专项训练与真题例句库</p>'+",
     "s+='<h3>拾词全包</h3><p class=\"sub\">一次买断，含完整 100 题训练册 + App 全部功能</p>'+"),
    ("支付·档位",
     "      '<div class=\"plan\">'+\n        '<button class=\"plan-c'+(y?' on':'')+'\" onclick=\"payPlan=\\'year\\';renderPay();openMask(document.getElementById(\\'sheet\\').innerHTML)\"><span class=\"save\">省 ¥132</span><b>¥168</b><span>年卡 · 覆盖到高考</span></button>'+\n        '<button class=\"plan-c'+(!y?' on':'')+'\" onclick=\"payPlan=\\'month\\';renderPay();openMask(document.getElementById(\\'sheet\\').innerHTML)\"><b>¥25</b><span>月卡 · 可随时退</span></button>'+\n      '</div>'+",
     "      '<div class=\"plan\">'+\n        '<button class=\"plan-c on\"><b>¥9.9</b><span>全包 · 一次买断</span></button>'+\n      '</div>'+"),
    ("支付·权益",
     "['32 个专项训练题库 + 完整解析','真题风格例句库（3000 词全覆盖）','错词自动复习 + 完整失分地图','家长周报每周推送','离线词库，校园网无信号也能背','新高考卷型更新免费'].map(p=>",
     "['完整 100 题专项训练册 PDF','全部专项训练题库 + 完整解析','真题风格例句库','错词自动复习 + 完整失分地图','家长周报每周推送','离线词库，校园网无信号也能背','新高考卷型更新免费'].map(p=>"),
    ("支付·优惠说明",
     "'<div class=\"coupon\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z\"/><path d=\"M12 6v2M12 16v2M12 11v2\"/></svg>'+(y?'年卡立减 ¥132 优惠券已自动使用':'新用户首月立减 ¥10 优惠券已自动使用')+'</div>'+",
     "'<div class=\"coupon\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z\"/><path d=\"M12 6v2M12 16v2M12 11v2\"/></svg>全包一次性买断，没有年卡月卡，也不需要续费</div>'+"),
    ("支付·支付按钮",
     "'<button class=\"btn btn-primary\" style=\"margin-top:14px\" onclick=\"payStage=\\'done\\';renderPay();openMask(document.getElementById(\\'sheet\\').innerHTML)\">微信支付 ¥'+(y?168:25)+'</button>'+",
     "'<button class=\"btn btn-primary\" style=\"margin-top:14px\" onclick=\"payStage=\\'done\\';renderPay();openMask(document.getElementById(\\'sheet\\').innerHTML)\">微信支付 ¥9.9</button>'+"),
    ("支付·底部说明",
     "'<p style=\"text-align:center;font-size:11px;color:var(--ink-3);margin-top:10px\">支持微信 / 支付宝 · 7 天无理由退款 · 已有 12,400+ 学员</p>';",
     "'<p style=\"text-align:center;font-size:11px;color:var(--ink-3);margin-top:10px\">支持微信 / 支付宝 · 7 天无理由退款</p>';"),
    ("支付·去掉 y 变量",
     "  const y=payPlan==='year';\n  let s='<div class=\"handle\"></div>';",
     "  let s='<div class=\"handle\"></div>';"),

    # ── 下单弹窗：去纸质、去会员折扣 ───────────────────────────────
    ("下单·副标",
     "s+='<h3>确认订单</h3><p class=\"sub\">实物 + 电子版一起寄送</p>'+",
     "s+='<h3>确认订单</h3><p class=\"sub\">电子版即时下载，可自行双面打印</p>'+"),
    ("下单·商品描述",
     "'<div class=\"ginfo\"><h5 style=\"font-size:13px\">'+g.n+'</h5><div class=\"desc\" style=\"margin-bottom:6px\">电子PDF（立即下载） + 纸质版 1 册</div>'+",
     "'<div class=\"ginfo\"><h5 style=\"font-size:13px\">'+g.n+'</h5><div class=\"desc\" style=\"margin-bottom:6px\">电子 PDF（立即下载）</div>'+"),
    ("下单·收货地址 → 下载方式",
     '<span class="t"><b>收货地址</b><span>浙江省杭州市 · 已保存默认地址</span></span>',
     '<span class="t"><b>下载方式</b><span>微信接收下载链接 · 邮箱同步一份</span></span>'),
    ("下单·会员折扣 → 全包更划算",
     "'<div class=\"opt-row'+(couponUsed?' on':'')+'\" onclick=\"couponUsed=!couponUsed;renderBuy();openMask(document.getElementById(\\'sheet\\').innerHTML)\"><span class=\"ic\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z\"/></svg></span><span class=\"t\"><b>会员折扣</b><span>'+(couponUsed?'已使用 · 立减 ¥'+off:'开通会员立减 20%')+'</span></span><span class=\"ck\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg></span></div>'+",
     "'<div class=\"opt-row\" onclick=\"closeMask();openPay(\\'all\\')\"><span class=\"ic\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z\"/></svg></span><span class=\"t\"><b>更划算：全包 ¥9.9</b><span>含完整训练册 + App 全部功能，一次买断</span></span><span class=\"ck\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg></span></div>'+"),
    ("下单·折扣行移除",
     "        (couponUsed?'<div class=\"sline\"><span>会员折扣</span><span style=\"color:var(--danger)\">-¥'+off+'</span></div>':'')+\n",
     ""),
    ("下单·运费改配送",
     "'<div class=\"sline\"><span>运费</span><span>¥0</span></div>'+",
     "'<div class=\"sline\"><span>配送</span><span>¥0（电子版）</span></div>'+"),
    ("下单·去掉折扣计算",
     "  const off=couponUsed?Math.round(g.p*0.2*100)/100:0;\n  const total=(g.p-off).toFixed(2).replace(/\\.00$/,'');",
     "  const total=Number(g.p).toFixed(2).replace(/\\.00$/,'');"),
]


def main():
    src = io.open(P, encoding="utf-8").read()
    miss = []
    for name, old, new in REPL:
        n = src.count(old)
        if n != 1:
            miss.append((name, n))
            continue
        src = src.replace(old, new)
    if miss:
        print("❌ 以下替换未唯一命中，未写盘：")
        for name, n in miss:
            print(f"   - {name}（命中 {n} 次）")
        sys.exit(1)
    io.open(P, "w", encoding="utf-8").write(src)
    print(f"✅ 原型定价模型已切换：{len(REPL)} 处替换全部命中")


if __name__ == "__main__":
    main()
