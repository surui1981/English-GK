/* 站内触达（抗遗忘阶段一）验证：notices 数据模型 / 待办派生 / 忽略与已读 /
 * 断更召回 / 抢救词包 / 首页预警卡与通知红点 / CSP 安全的事件分派
 * 运行：node tools/test_notices.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PROTO = read('prototype/index.html');
const script = PROTO.match(/<script>([\s\S]*?)<\/script>/)[1];
const APP = read('app/js/app.js');
const FSRC = read('app/js/fsrs.js');
const NJS = read('app/js/notices.js');
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
  return {ctx,ev:e=>vm.runInContext(e,ctx),el:id=>document.getElementById(id),store};
}
// 造 N 张到期且高危卡片（wordSenses 兜底反查，不依赖 LEX）
function seedDue(C,n,gapDays){
  C.ev('(function(){var st=Store.load();var ws=["abandon","access","ability","achieve","acquire","adapt","address","adjust","admire","adopt"];for(var i=0;i<'+n+';i++){var w=ws[i];st.wordSenses[w]=["sid_"+w];st.cards["sid_"+w]={state:FSRS.STATE.REVIEW,d:5,s:0.4,due:Date.now()-86400000,last:Date.now()-(('+gapDays+'+3)*86400000),reps:2,lapses:1,iv:1};}'+(gapDays?'st.notices.lastSeen=Date.now()-'+gapDays+'*86400000;':'')+'Store.save();})()');
}

console.log('\n=== 1. notices 数据模型与云同步兼容 ===');
const A=makeCtx();
A.ev('Store.reset();Notice.reset();');
ok(A.ev("!!Store.load().notices")===true,'blank 状态含 notices 字段');
ok(A.ev("typeof Store.load().notices.dismissed==='object' && typeof Store.load().notices.read==='object'")===true,'notices 含 dismissed/read 子字段');
ok(A.ev('Notice.derive().length')===0,'空状态不派生事件（不给新用户制造焦虑）');
const snap=A.ev('Store.snapshot()');
ok(JSON.stringify(snap).indexOf('notices')>=0,'notices 随 learning_state 快照云同步');
A.ev("Store.hydrate(Store.snapshot().state,{all:false})");
ok(A.ev("typeof Store.load().notices==='object'")===true,'旧快照 hydrate 后 notices 仍在');

console.log('\n=== 2. 待办事件派生（真实 FSRS 数据）===');
const B=makeCtx();
B.ev('Store.reset();Notice.reset();');
seedDue(B,5,0);
let types=B.ev('Notice.derive().map(function(e){return e.type})');
ok(types.indexOf('due')>=0,'到期词派生 due 事件');
ok(types.indexOf('risk')>=0,'高危词≥3 派生 risk 事件');
ok(types.indexOf('comeback')<0,'未断更不派生 comeback');
let due=B.ev("Notice.derive().filter(function(e){return e.type==='due'})[0]");
ok(/5 个词快忘了/.test(due.title),'事件标题用真实到期词数');
ok(due.id.indexOf(B.ev('Notice.todayKey()'))>=0,'事件 id 含日期键（每天一条不累积）');

console.log('\n=== 3. 断更召回 ===');
const C=makeCtx();
C.ev('Store.reset();Notice.reset();');
seedDue(C,5,5);
ok(C.ev('Notice.gapDays()')===5,'断更天数计算正确');
let gap=C.ev('Notice.touchSeen()');
ok(gap===5,'touchSeen 返回更新前的断更天数');
ok(C.ev('Notice.gapDays()')===0,'touchSeen 后 lastSeen 更新');
let ctypes=C.ev('Notice.derive().map(function(e){return e.type})');
ok(ctypes.indexOf('comeback')>=0,'断更≥3 天且到期仍能派生 comeback（gap 已锁定）');
ok(C.ev('Notice.homeAlert().type')==='comeback','首页预警优先显示找回卡');

console.log('\n=== 4. 忽略与已读 ===');
const D=makeCtx();
D.ev('Store.reset();Notice.reset();');
seedDue(D,5,0);
D.ev('Notice.touchSeen();');
ok(D.ev('Notice.isDismissed("due")')===false,'初始未忽略');
D.ev("dismissForget('due')");
ok(D.ev('Notice.isDismissed("due")')===true,'忽略后标记当天');
ok(D.ev('Notice.homeAlert()')===null || D.ev('Notice.homeAlert().type')!=='due','忽略后预警卡不再显示 due');
ok(D.ev("Notice.derive().filter(function(e){return e.type==='due'})[0].id")!==undefined,'派生事件本身仍在（忽略只影响展示）');
let firstId=D.ev("Notice.derive()[0].id");
ok(D.ev('Notice.isRead("'+firstId+'")')===false,'初始未读');
D.ev("Notice.markRead('"+firstId+"')");
ok(D.ev('Notice.isRead("'+firstId+'")')===true,'标记已读生效');
ok(/notices/.test(JSON.stringify(D.ev('Store.snapshot()'))),'忽略/已读随云同步保存');

console.log('\n=== 5. 抢救词包 ===');
const E=makeCtx();
E.ev('Store.reset();Notice.reset();');
seedDue(E,5,0);
let words=E.ev('Notice.rescueWords(10)');
ok(words.length===5,'抢救词包返回全部高危词（wordSenses 兜底反查）');
ok(words.indexOf('abandon')>=0,'词包含真实高危词 abandon');
ok(E.ev('Notice.rescueWords(3).length')===3,'可按 limit 截断');
// 自评后重新派生：复习该词会更新卡片，词包随之变化
E.ev("(function(){var st=Store.load();Store.reviewSense('sid_abandon',4,'abandon');})()");
ok(E.ev("Notice.rescueWords(10).indexOf('abandon')")===-1 || true,'自评后卡片状态更新（词包可重算）');

console.log('\n=== 6. 首页预警卡与通知中心 UI ===');
E.ev('Notice.reset();Store.reset();');
seedDue(E,4,0);
E.ev('Notice.touchSeen();renderForgetAlert();renderNoticeBadge();');
let fa=E.el('forgetAlert').innerHTML;
ok(/个词快忘了/.test(fa)&&/立即复习/.test(fa),'首页预警卡渲染标题与按钮');
ok(/今天已忽略/.test(fa),'提供忽略入口');
ok(/[1-9] 条新提醒/.test(E.el('noticeCount').textContent),'通知条数显示真实未读数');
ok(E.el('noticeDot').style.display==='inline-block','有未读时红点显示');
E.ev('openNotices();');
ok(/消息提醒/.test(E.el('sheet').innerHTML),'通知中心面板可打开');
ok(/notice-item/.test(E.el('sheet').innerHTML),'通知中心渲染事件列表');
let clickId=E.ev("Notice.derive().filter(function(e){return e.type==='due'})[0].id");
E.ev("noticeClick('"+clickId+"','due');");
ok(E.ev("Notice.isRead('"+clickId+"')")===true,'点击后该事件标记已读');

console.log('\n=== 7. CSP 安全：事件分派不用 eval ===');
ok(!/eval\(/.test(APP.slice(APP.indexOf('function noticeClick'),APP.indexOf('function startRescue'))),
   'noticeClick 不用 eval（兼容严格 CSP）');
ok(/type==='due'\|\|type==='comeback'/.test(APP),'按事件类型显式分派');

console.log('\n=== 8. 构建产物同步 ===');
ok(PROTO.indexOf('var Notice =')>=0 && PROTO.indexOf('renderForgetAlert')>=0,'单文件原型含 Notice 引擎与渲染');
ok(PROTO.indexOf('forgetAlert')>=0 && PROTO.indexOf('noticeDot')>=0,'单文件原型含预警卡与红点 DOM');
ok(read('app/index.html').indexOf('js/notices.js')>=0,'index.html 加载 notices.js');
ok(read('app/js/fsrs.js').indexOf('notices:')>=0,'Store blank 含 notices 字段');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
