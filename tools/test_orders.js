/* 端到端验证：订单记录与永久下载
 *  1) 支付 / 兑换成功后生成订单，计数与列表同步
 *  2) 每条订单可下载永久有效的凭证（链接不过期）
 *  3) 历史权益无订单时也能下载权益凭证
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

function makeEl(id) {
  const el = {
    id: id, _html: '', _text: '', dataset: {}, disabled: false,
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
                 toggle(c,f){ if(f===undefined)f=!this._s.has(c); f?this._s.add(c):this._s.delete(c); return f;},
                 contains(c){return this._s.has(c);} },
    style: { setProperty(){} }, offsetWidth: 100, parentNode: null,
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
const store = {};
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem(k,v){ store[k]=String(v); },
  removeItem(k){ delete store[k]; },
  clear(){ for(const k in store) delete store[k]; },
};
const document = {
  getElementById: getEl, querySelector(){ return makeEl('q'); },
  querySelectorAll(){ return []; }, createElement(tag){ return makeEl('new-'+tag); },
  addEventListener(){}, body: makeEl('body'), documentElement: makeEl('html'),
};
const ctx = {
  console, document, localStorage, window: {}, navigator: { userAgent: 'node' },
  setTimeout(fn){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
  requestAnimationFrame(){ return 0; },
  Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, parseInt, parseFloat,
  encodeURIComponent, decodeURIComponent,
  alert(){}, confirm(){ return true; }, prompt(){ return ''; },
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
function ev(expr){ return vm.runInContext(expr, ctx); }

console.log('\n=== 加载脚本 ===');
try { vm.runInContext(script, ctx, { filename: 'index.html' }); console.log('  脚本执行 OK'); }
catch(e){ console.log('  脚本执行失败: ' + e.message); process.exit(2); }

ev('Store.reset();Store.resetEnt();refreshOrderUI();');

console.log('\n=== 1. 全包支付生成订单 ===');
ok(ev('loadOrders().length') === 0, '初始无订单');
ok(getEl('orderCount').textContent === '0 笔', '订单计数初始为 0');
ev('payAll()');
const orders1 = ev('loadOrders()');
ok(orders1.length === 1, '支付后生成 1 条订单（实际 ' + orders1.length + '）');
ok(Number(orders1[0].amount) === 9.9, '订单金额为 ¥9.9');
ok(orders1[0].name === '拾词全包' && orders1[0].key === 'all', '订单商品为全包');
ok(/^SC/.test(orders1[0].no), '生成订单号：' + orders1[0].no);
ok(getEl('orderCount').textContent === '1 笔', '订单计数同步为 1');
ok(ev('Store.snapshot().state.orders.length') === 1, '订单写入 learning_state.state.orders，随账号云同步');
ev('(function(){var s=Store.snapshot();Store.hydrate(JSON.parse(JSON.stringify(s.state)),s.entitlements);})()');
ok(ev('loadOrders().length') === 1, '模拟云端回写后订单不丢失');

console.log('\n=== 2. 订单列表与永久下载 ===');
ev('openOrders()');
const sheetHtml = getEl('sheet').innerHTML;
ok(/我的订单/.test(sheetHtml), '订单列表标题存在');
ok(/订单与资料永久可下载/.test(sheetHtml), '列表注明永久可下载');
ok(/下载订单凭证/.test(sheetHtml), '每条订单提供下载按钮');
ok(/永久有效/.test(sheetHtml), '订单标注永久有效');
const dl = ev('downloadOrder(loadOrders()[0].no)');
ok(dl && /^data:text\/plain/.test(dl.href), '凭证下载使用 data URL，不依赖外部链接');
const text = decodeURIComponent(dl.href.split(',')[1]);
ok(text.indexOf(orders1[0].no) >= 0, '凭证含订单号');
ok(/权益状态：永久有效/.test(text), '凭证写明永久有效');
ok(/链接不过期/.test(text), '凭证写明链接不过期');
ok(/不含真题与教材原文/.test(text), '凭证含合规说明');
ok(/拾词订单凭证_.*\.txt/.test(dl.name), '下载文件名正确：' + dl.name);

console.log('\n=== 3. 单本支付与兑换码各生成订单 ===');
ev('buyItem=GOODS[0];payBook()');
const orders2 = ev('loadOrders()');
ok(orders2.length === 2, '单本支付后共 2 条订单');
ok(Number(orders2[0].amount) === 2.9 && orders2[0].key === 'context', '单本订单金额 ¥2.9 且绑定读本');
ev('recordRedeemOrder("SC-TEST-2026")');
const orders3 = ev('loadOrders()');
ok(orders3.length === 3, '兑换码激活后共 3 条订单');
ok(Number(orders3[0].amount) === 0 && /SC-TEST-2026/.test(orders3[0].source), '兑换订单金额为 0 且保留学号');
ok(getEl('orderCount').textContent === '3 笔', '订单计数同步为 3');

console.log('\n=== 4. 历史权益无订单也能下载凭证 ===');
ev('Store.reset();Store.grantAll();refreshOrderUI();openOrders()');
const legacy = getEl('sheet').innerHTML;
ok(/拾词全包权益已生效/.test(legacy), '历史权益展示说明卡');
ok(/下载权益凭证/.test(legacy), '提供权益凭证下载');
const legacyDl = ev('downloadLegacyVoucher()');
ok(legacyDl && /永久有效/.test(decodeURIComponent(legacyDl.href.split(',')[1])), '权益凭证写明永久有效');

console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
if (FAIL) process.exit(1);
