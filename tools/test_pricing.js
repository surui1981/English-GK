/* 端到端验证：两档定价 + 学习周报分层
 *  1) 四本读本统一 ¥2.9，历史分档不再出现
 *  2) 9.9 全包含四本书权益；单本不含完整周报
 *  3) 基础周报免费、数字来自真实记录；完整版由全包解锁
 *  4) 周报升级卡与完整版模块随权益切换
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
const script = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];

let PASS = 0, FAIL = 0;
function ok(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAIL++; console.log('  FAIL  ' + msg); }
}

/* ---------- DOM stub ---------- */
function makeEl(id) {
  const el = {
    id: id, _html: '', _text: '', dataset: {}, disabled: false,
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
                 toggle(c,f){ if(f===undefined)f=!this._s.has(c); f?this._s.add(c):this._s.delete(c); return f;},
                 contains(c){return this._s.has(c);} },
    style: { setProperty(){} },
    offsetWidth: 100, parentNode: null,
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);},
    get textContent(){return this._text;}, set textContent(v){this._text=String(v);},
    addEventListener(){}, appendChild(c){ c.parentNode=this; },
    removeChild(c){ c.parentNode=null; }, querySelector(){return null;},
    querySelectorAll(){return [];}, scrollTop: 0, focus(){}, click(){},
  };
  return el;
}
const els = {};
function getEl(id){ if(!els[id]) els[id]=makeEl(id); return els[id]; }
const fullEls = [makeEl('full-a'), makeEl('full-b')];
const store = {};
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem(k,v){ store[k]=String(v); },
  removeItem(k){ delete store[k]; },
  clear(){ for(const k in store) delete store[k]; },
};
const document = {
  getElementById: getEl,
  querySelector(){ return makeEl('q'); },
  querySelectorAll(sel){ return sel === '.rp-full' ? fullEls : []; },
  createElement(tag){ return makeEl('new-'+tag); },
  addEventListener(){}, body: makeEl('body'), documentElement: makeEl('html'),
};
const ctx = {
  console, document, localStorage, window: {}, navigator: { userAgent: 'node' },
  setTimeout(fn){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
  requestAnimationFrame(){ return 0; },
  Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, parseInt, parseFloat,
  alert(){}, confirm(){ return true; }, prompt(){ return ''; },
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

function ev(expr){ return vm.runInContext(expr, ctx); }

console.log('\n=== 加载脚本 ===');
try { vm.runInContext(script, ctx, { filename: 'index.html' }); console.log('  脚本执行 OK'); }
catch(e){ console.log('  脚本执行失败: ' + e.message); process.exit(2); }

console.log('\n=== 1. 四本读本统一 ¥2.9 ===');
const goods = ev('GOODS');
ok(goods.length === 4, '四本读本齐全（实际 ' + goods.length + '）');
ok(goods.every(g => Number(g.p) === 2.9), '四本单价全部为 ¥2.9');
ok(goods.every(g => !g.o), '四本均无划线原价');
ok(goods.every(g => !/分档/.test(g.note)), '单品说明不再出现历史分档');
ev('renderBook();renderBook2();renderBook3();renderBook4();');
['bookBody','book2Body','book3Body','book4Body'].forEach(id => {
  const html = getEl(id).innerHTML;
  ok(html.indexOf('¥2.9') >= 0 && !/¥(4\.9|3\.9|1\.9)/.test(html), id + ' 只显示 ¥2.9，无历史分档');
});
['bookSample','collocSample','quizSample','planSample'].forEach(fn => {
  const tiers = ev(fn + '().meta.pricing.tiers');
  ok(tiers.length === 1 && Number(tiers[0].price) === 2.9, fn + ' 单档 ¥2.9');
});

console.log('\n=== 2. 全包权益包含四本书 ===');
ev('Store.reset();Store.resetEnt();');
ok(ev('!Store.hasAll()'), '初始未解锁全包');
ok(ev('!Store.hasBook("quiz")'), '单本未购买时无该书权益');
ev('Store.grantBook("quiz")');
ok(ev('Store.hasBook("quiz") && !Store.hasAll()'), '买单本只获得该书，不获全包');
ok(ev('!Store.hasBook("context")'), '买单本不赠送其他读本');
ev('Store.grantAll()');
ok(ev('Store.hasAll()'), '全包解锁成功');
ok(ev('["context","colloc","quiz","plan"].every(k=>Store.hasBook(k))'), '全包自动包含四本书');

console.log('\n=== 3. 学习周报基础版免费 ===');
ev('Store.reset();Store.resetEnt();');
ev('renderParentReport()');
const upHtml = getEl('rpUpgrade').innerHTML;
ok(/基础周报免费/.test(upHtml) && /9\.9/.test(upHtml), '未解锁时展示基础免费 + ¥9.9 升级卡');
ok(/openPay\('all'\)/.test(upHtml), '升级卡按钮指向全包支付');
ok(fullEls.every(e => e.style.display === 'none'), '完整版模块对免费用户隐藏');
ok(!/解锁深度失分归因/.test(getEl('rpBannerDesc').textContent), '免费态不展示完整版卖点伪装成数据');
ok(getEl('kpiAcc').textContent === '—', '无作答时正确率不编造数字');
ok(/今天开始第一次打卡/.test(getEl('rpCheckSub').textContent), '无打卡时不写死缺勤天数');

console.log('\n=== 4. 周报数字来自真实记录 ===');
const today = new Date();
const todayTs = today.getTime();
ev('(function(){var s=Store.snapshot();s.state.learnedAt={"week-a":' + todayTs + ',"week-b":' + todayTs + '};Store.hydrate(s.state,s.entitlements);})()');
ev('renderParentReport()');
ok(getEl('rpWeekNew').textContent === '2', '本周新学词数来自 learnedAt（实际 ' + getEl('rpWeekNew').textContent + '）');
ok(/本周新学 2 词/.test(getEl('rpBannerTitle').textContent), '周报文案使用真实新学数');
const bars = getEl('weekBars').innerHTML;
ok((bars.match(/wk-col/g) || []).length === 7, '每日柱状图固定 7 天');
ok(/wk-v">2</.test(bars), '今天柱子显示真实数值 2');
const heat = getEl('heat').innerHTML;
ok(/l[1-4]/.test(heat), '热力图最后一格反映今日真实学习量');
ok(heat.length === 0 || (heat.match(/<i/g) || []).length === 28, '热力图为 28 格');

console.log('\n=== 5. 全包解锁后隐藏付费信息 ===');
ev('Store.grantAll()');
ev('renderParentReport()');
ok(/完整周报已解锁/.test(getEl('rpUpgrade').innerHTML), '解锁后升级卡变为已解锁状态');
ok(fullEls.every(e => e.style.display === ''), '解锁后完整版模块显示');
ev('refreshEntitlementUI()');
ok(!/全站最高价/.test(getEl('shopPrice').innerHTML), '商店卡不再出现「全站最高价」');

console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
if (FAIL) process.exit(1);
