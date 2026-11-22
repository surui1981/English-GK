/* 两档权益重构验证：¥2.9 四本资料包（本地下载） / ¥9.9 资料 + 云端账号 + 全部分析
 * 运行：node tools/test_pricing_v2.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PROTO = read('prototype/index.html');
const script = PROTO.match(/<script>([\s\S]*?)<\/script>/)[1];
const HTML = read('app/index.html');
const APP = read('app/js/app.js');
let PASS = 0, FAIL = 0;
function ok(cond, msg){ if(cond){PASS++;console.log('  PASS  '+msg);}else{FAIL++;console.log('  FAIL  '+msg);} }

function mk(id){
  return {
    id, _html:'', _text:'', dataset:{}, style:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){return false;} },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);},
    get textContent(){return this._text;}, set textContent(v){this._text=String(v);},
    addEventListener(){}, appendChild(c){c.parentNode=this;},
    removeChild(c){c.parentNode=null;}, querySelector(){return null;},
    querySelectorAll(){return [];}, scrollTop:0, focus(){}, click(){}
  };
}
function makeCtx(){
  const els={}, store={};
  const localStorage={ getItem(k){return k in store?store[k]:null;}, setItem(k,v){store[k]=String(v);}, removeItem(k){delete store[k];} };
  const document={
    getElementById(id){return els[id]||(els[id]=mk(id));},
    querySelector(){return mk('q');}, querySelectorAll(){return [];},
    createElement(t){return mk(t);}, addEventListener(){},
    body:mk('body'), documentElement:mk('html'), visibilityState:'visible'
  };
  const ctx={ console, document, localStorage, URL:global.URL,
    location:{href:'https://x.com/',origin:'https://x.com',assign(){}}, history:{replaceState(){}},
    setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
    Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,Promise,parseInt,parseFloat,
    alert(){},confirm(){return true;},print(){} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx),el:id=>document.getElementById(id)};
}

console.log('\n=== 1. 权益模型：materials 与 all 两级 ===');
const A=makeCtx();
A.ev('Store.reset();Store.resetEnt();');
ok(A.ev('Store.hasMaterials()')===false && A.ev('Store.hasAll()')===false,'初始两档都未解锁');
A.ev('Store.grantMaterials();');
ok(A.ev('Store.hasMaterials()')===true && A.ev('Store.hasAll()')===false,'¥2.9 只解锁资料，不给全包');
ok(A.ev('["context","colloc","quiz","plan"].every(k=>Store.hasBook(k))')===true,'资料包一次解锁四本');
ok(A.ev('Store.snapshot().entitlements.all')===false,'资料包用户 all 仍为 false');
A.ev('Store.grantAll();');
ok(A.ev('Store.hasMaterials()')===true && A.ev('Store.hasAll()')===true,'全包同时包含资料包');
A.ev('Store.resetEnt();');
ok(A.ev('Store.hasMaterials()')===false,'重置权益后资料包也清除');
const snap=A.ev('Store.snapshot()');
ok(JSON.parse(JSON.stringify(snap.entitlements)).materials===false,'权益快照含 materials 字段，可云同步');

console.log('\n=== 2. 旧授权与云快照兼容 ===');
A.ev('Store.hydrate('+JSON.stringify(snap.state)+',{"all":false,"books":{"context":true}})');
ok(A.ev('Store.hasBook("context")')===true && A.ev('Store.hasMaterials()')===false,'旧单本授权仍生效，但不会误升为资料包');
A.ev('Store.hydrate('+JSON.stringify(snap.state)+',{"all":true})');
ok(A.ev('Store.hasMaterials()')===true,'旧 all=true 快照自动补齐资料包权益');

console.log('\n=== 3. ¥2.9 资料包下单流程 ===');
const B=makeCtx();
B.ev('Store.reset();Store.resetEnt();');
// 模拟已登录，避免 needLogin 把支付入口拦截到登录弹窗
B.ev("window.CloudStore=Object.assign({},typeof CloudStore!=='undefined'?CloudStore:{},{getSession:function(){return {user:{id:'u1'}};}});");
B.ev("openPay('materials');");
ok(B.ev('payPlan')==='materials','资料包入口选中 materials 档');
let pay=B.el('sheet').innerHTML;
ok(/¥2\.9/.test(pay) && /¥9\.9/.test(pay),'支付弹窗同时展示两档价格');
ok(/gotoQR\(\)/.test(pay) && /微信支付 ¥2\.9/.test(pay),'当前档位支付按钮为 ¥2.9（进入扫码态）');
ok(/四本读本一次下载/.test(pay) && /不含云端账号服务与数据分析/.test(pay),'资料包权益边界写清楚');
B.ev('gotoQR();');
ok(B.ev('payStage')==='qr','点支付后进入收款码阶段');
let qr=B.el('sheet').innerHTML;
ok(/assets\/pay-qr\.jpg/.test(qr) && /¥2\.90/.test(qr),'扫码态展示收款码与 2.90 金额提示');
ok(/我已完成支付/.test(qr),'扫码态提供自助解锁按钮');
B.ev('confirmPay();');
ok(B.ev('Store.hasMaterials()')===true && B.ev('Store.hasAll()')===false,'支付后只发资料包权益');
let orders=B.ev('loadOrders()');
ok(orders.length===1 && Number(orders[0].amount)===2.9 && orders[0].key==='materials','订单记录 ¥2.9 / materials');
ok(/资料包已生效/.test(B.el('sheet').innerHTML),'成功态按资料包文案展示');

console.log('\n=== 4. ¥9.9 全包仍含云端与分析 ===');
const C=makeCtx();
C.ev('Store.reset();Store.resetEnt();payPlan="all";gotoQR();');
ok(/¥9\.90/.test(C.el('sheet').innerHTML),'全包扫码态金额提示为 9.90');
C.ev('confirmPay();');
ok(C.ev('Store.hasAll()')===true && C.ev('loadOrders()[0].amount')===9.9,'全包订单 ¥9.9 且解锁全部');
pay=C.el('sheet').innerHTML;
let hpay=(C.ev("payPlan='all';renderPay();"),C.el('sheet').innerHTML);
ok(/云端账号服务/.test(hpay) && /全部分析/.test(hpay),'全包卖点包含云端账号与全部分析');

console.log('\n=== 5. 云端分析门禁只认全包 ===');
const D=makeCtx();
D.ev('Store.reset();Store.resetEnt();');
D.ev("window.CloudStore=Object.assign({},typeof CloudStore!=='undefined'?CloudStore:{},{getSession:function(){return {user:{id:'u1'}};}});");
D.ev('renderErrCloud();renderReportCloud();');
ok(/全包 ¥9\.9 · 解锁云端算法统计/.test(D.el('errCloud').innerHTML),'已登录但未全包仍看到升级引导');
ok(/全包 ¥9\.9 · 解锁云端分析/.test(D.el('rpCloud').innerHTML),'周报算法卡同样要求全包');
D.ev('Store.grantMaterials();renderErrCloud();renderReportCloud();');
ok(/全包 ¥9\.9/.test(D.el('errCloud').innerHTML),'仅资料包不解锁云端算法');
D.ev('Store.grantAll();renderErrCloud();renderReportCloud();');
ok(/FSRS-5 实时计算/.test(D.el('errCloud').innerHTML) && /记忆健康度/.test(D.el('rpCloud').innerHTML),'全包后两张算法卡都显示真实统计');

console.log('\n=== 6. 商店与详情口径 ===');
ok(HTML.indexOf('四本资料包')>=0 && /打包 ¥2\.9/.test(HTML),'商店出现资料包卡');
ok(HTML.indexOf("onclick=\"openPay('materials')\"")>=0,'商店资料包按钮直达 materials 档');
ok(HTML.indexOf('资料包 + 云端账号 + 全部分析')>=0,'全包卡文案按新权益更新');
ok(APP.indexOf('资料包已解锁 · 四本可下载')>=0,'四本详情页统一显示资料包解锁态');
ok(GOODSNOTE(),'四本目录说明统一为资料包内');
function GOODSNOTE(){ return A.ev('GOODS.every(g=>/四本资料包内/.test(g.note))'); }
A.ev('Store.reset();Store.resetEnt();refreshEntitlementUI();');
ok(/购买资料包 ¥2\.9/.test(A.el('materialsBtn').textContent),'未购买时按钮显示 ¥2.9');
A.ev('Store.grantMaterials();refreshEntitlementUI();');
ok(/资料包已解锁/.test(A.el('materialsBtn').textContent) && A.el('materialsBtn').disabled===true,'购买后按钮变已解锁并禁用');

console.log('\n=== 7. 构建产物同步 ===');
ok(PROTO.indexOf('hasMaterials')>=0 && PROTO.indexOf('grantMaterials')>=0,'单文件原型包含新权益 API');
ok(PROTO.indexOf('四本资料包')>=0 && PROTO.indexOf('云端账号服务')>=0,'单文件原型同步两档文案');
ok(PROTO.indexOf('confirmPay()')>=0 && PROTO.indexOf('function gotoQR')>=0,'单文件原型包含分档支付与扫码入口');
ok(HTML.indexOf('微信支付')>=0 || APP.indexOf('assets/pay-qr.jpg')>=0,'源码引用收款码资源');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
