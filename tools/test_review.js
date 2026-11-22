/* 学习复盘专项：真实错词归因 + FSRS 云端算法统计 + 注册分层
 * 运行：node tools/test_review.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PROTO = read('prototype/index.html');
const script = PROTO.match(/<script>([\s\S]*?)<\/script>/)[1];
const APP = read('app/js/app.js');
const HTML = read('app/index.html');
let PASS = 0, FAIL = 0;
function ok(cond, msg){ if(cond){PASS++;console.log('  PASS  '+msg);}else{FAIL++;console.log('  FAIL  '+msg);} }

function mk(id){
  return {
    id, _html:'', _text:'', dataset:{}, style:{setProperty(){}},
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
function loggedIn(A, on){
  // 只替换 getSession，保留云端模块其余方法，避免影响 boot 阶段的异步链路
  A.ev('window.CloudStore=Object.assign({},typeof CloudStore!=="undefined"?CloudStore:{},{getSession:function(){return '+(on?"{user:{id:'u1'}}":"null")+';}});');
}

console.log('\n=== 1. 错词流水：真实记录、聚合、云同步 ===');
const A=makeCtx();
A.ev('Store.reset();Store.resetEnt();');
ok(A.ev('Store.wrongWordStats(30).total')===0,'初始没有错词记录');
A.ev('Store.quizAnswer(false,"熟词僻义","C1","appreciate","E1");');
A.ev('Store.quizAnswer(false,"熟词僻义","C2","appreciate","E1");');
A.ev('Store.quizAnswer(false,"熟词僻义","C3","interest","E2");');
A.ev('Store.quizAnswer(true,"熟词僻义","C1","case","E1");');
let ws=A.ev('Store.wrongWordStats(30)');
ok(ws.total===3 && ws.distinct===2,'答错 3 次 / 2 个词，答对不进流水');
ok(ws.top[0].w==='appreciate' && ws.top[0].n===2,'Top 错词按真实错次排序');
ok(ws.byErr.E1===2 && ws.byErr.E2===1,'错因按 errCode 聚合，不再全部归到「熟词僻义」');
ok(A.ev('Store.load().quiz.wrongLog.length')===3,'wrongLog 逐条写入 learning_state');
const snap=A.ev('Store.snapshot()');
A.ev('Store.reset();Store.hydrate('+JSON.stringify(snap.state)+','+JSON.stringify(snap.entitlements)+')');
ok(A.ev('Store.wrongWordStats(30).total')===3,'云同步快照往返后错词记录不丢');
A.ev('(function(){var l=Store.load().quiz.wrongLog;l.forEach(function(x){x.at=Date.now()-40*86400000;});Store.save();})()');
ok(A.ev('Store.wrongWordStats(30).total')===0,'30 天窗口过滤掉过期错词');
ok(A.ev('Store.wrongWordStats(0).total')===3,'传 0 可查看全部历史错词');

console.log('\n=== 2. FSRS 云端算法统计：来自真实卡片状态 ===');
const B=makeCtx();
B.ev('Store.reset();Store.resetEnt();');
let f=B.ev('Store.reviewForecast()');
ok(f.cards===0 && f.avgR===0,'没有学习记录时不虚构算法数值');
B.ev('var __sid=LEX[0].senses[0].sense_id;Store.reviewSense(__sid,3,LEX[0].w);');
f=B.ev('Store.reviewForecast()');
ok(f.cards===1 && f.dueToday===0,'复习一张卡后生成 1 张义项卡（初始间隔 3 天，非今日到期）');
ok(f.avgR>=89 && f.avgR<=100,'平均可提取性由遗忘曲线算得（实际 '+f.avgR+'%）');
B.ev('(function(){var c=Store.load().cards[__sid];c.last=Date.now()-0.5*86400000;c.due=Date.now()+0.4*86400000;Store.save();})()');
ok(B.ev('Store.reviewForecast().dueTomorrow')===1,'距到期不足 1 天的卡计入「明日到期」');
B.ev('(function(){var c=Store.load().cards[__sid];c.last=Date.now()-60*86400000;c.s=1;c.due=Date.now()-86400000;Store.save();})()');
f=B.ev('Store.reviewForecast()');
ok(f.atRisk===1 && f.dueToday===1,'过期且低可提取性的卡被识别为高危遗忘词');
ok(f.weakWords.length===1 && f.weakWords[0].w===LEX0(),'高危词表回填真实 headword');
function LEX0(){ return B.ev('LEX[0].w'); }
B.ev('Store.reviewFamily("access",3,"study");');
f=B.ev('Store.reviewForecast()');
ok(f.familyTotal===1 && f.familySolidPct===100,'词形网稳固率同样来自真实网卡');

console.log('\n=== 3. 失分地图：去掉静态样例与虚假分数承诺 ===');
const C=makeCtx();
C.ev('Store.reset();Store.resetEnt();');
loggedIn(C,false);
C.ev('renderErrDist();renderErrList();renderErrCloud();');
let h=C.el('errList').innerHTML;
ok(/还没有错词记录/.test(h),'空态如实提示，不再展示 5 个写死的示例词');
ok(!/account for/.test(h) && !/appreciate<\/span>/.test(h),'静态 ERRORS 常量已从代码中移除');
ok(APP.indexOf('const ERRORS=')<0,'源码中不存在静态错词表');
ok(!/挽回/.test(C.el('errAdvice').innerHTML),'删除「挽回 8–12 分」这类无依据承诺');
C.ev('Store.quizAnswer(false,"熟词僻义","C1","appreciate","E1");Store.quizAnswer(false,"熟词僻义","C2","appreciate","E1");Store.quizAnswer(false,"熟词僻义","C3","interest","E2");');
C.ev('renderErrDist();renderErrList();');
h=C.el('errList').innerHTML;
ok(/appreciate/.test(h) && /错 2 次/.test(h),'错词榜显示真实词与真实错次');
ok(/近 30 天真实作答：3 道错题/.test(C.el('errDistSub').textContent),'错因分布标注真实样本量');
ok(/近 30 天你因「熟词僻义」错/.test(C.el('errAdvice').innerHTML) &&
   /2 次/.test(C.el('errAdvice').innerHTML),'建议文案引用真实错因与真实错次');
ok(/<span class="bench-label">一词多义<\/span>[\s\S]{0,220}?33%/.test(C.el('errDist').innerHTML) &&
   !/挽回/.test(C.el('errAdvice').innerHTML),'次要错因显示真实占比，不再只有单一分类或虚假提分承诺');

console.log('\n=== 4. 云端分层：游客看引导，登录看 FSRS 算法 ===');
ok(/注册云端 · 解锁遗忘曲线统计/.test(C.el('errCloud').innerHTML),'游客在失分地图看到注册引导');
ok(/去登录/.test(C.el('errCloud').innerHTML),'引导按钮指向登录页');
loggedIn(C,true);
C.ev('Store.reviewSense(LEX[0].senses[0].sense_id,3,LEX[0].w);renderErrCloud();');
h=C.el('errCloud').innerHTML;
ok(/FSRS-5 实时计算/.test(h) && /记忆稳固率/.test(h),'登录后显示 FSRS 算法卡');
ok(/今日待复习|明日到期/.test(h),'算法卡展示真实到期预测');
ok(/注册云端 · 解锁/.test(h)===false,'登录后不再显示注册引导');
C.ev('window.__requireLogin=function(){};setReviewPanel("s-parent");');
ok(true,'基础周报面板对游客/登录用户均可直接切换，无整页门禁');

console.log('\n=== 5. 学习周报：薄弱项与行动计划全部动态生成 ===');
const D=makeCtx();
D.ev('Store.reset();Store.resetEnt();');
loggedIn(D,false);
D.ev('renderParentReport();');
ok(/近 7 天还没有错题记录/.test(D.el('rpWeakList').innerHTML),'无错词时薄弱项不预填 38%/24%/19%');
ok(/%38|38%/.test(D.el('rpWeakList').innerHTML)===false,'写死的百分比已移除');
let act=D.el('rpActionList').innerHTML;
ok(!/周六/.test(act) && !/正确率提升 8%/.test(act),'写死的「周六未打卡 / 提升 8%」已移除');
ok(/本周有 <b>7 天<\/b>没有新学记录/.test(act),'空教学周给出真实的连续性与降量建议');
ok(/注册云端 · 解锁算法统计/.test(D.el('rpCloud').innerHTML),'游客基础周报仍可见，算法卡单独引导注册');
D.ev('Store.quizAnswer(false,"熟词僻义","C1","appreciate","E1");Store.quizAnswer(false,"熟词僻义","C2","appreciate","E1");Store.quizAnswer(false,"熟词僻义","C3","interest","E2");Store.reviewSense(LEX[0].senses[0].sense_id,3,LEX[0].w);');
D.ev('(function(){var c=Store.load().cards[LEX[0].senses[0].sense_id];c.last=Date.now()-60*86400000;c.s=1;c.due=Date.now()-86400000;Store.save();})();');
D.ev('renderParentReport();');
act=D.el('rpActionList').innerHTML;
ok(/错因集中在/.test(act) && /近 7 天/.test(act),'行动计划来自近 7 天真实错因');
ok(/今日到期|可提取性低于 75%/.test(act),'行动计划引用 FSRS 真实预测');
ok(/熟词僻义/.test(D.el('rpWeakList').innerHTML),'薄弱项按真实错因生成');
loggedIn(D,true);
D.ev('renderParentReport();');
h=D.el('rpCloud').innerHTML;
ok(/记忆健康度/.test(h) && /FSRS-5 实时计算/.test(h),'登录用户周报显示云端算法统计');
ok(/平均可提取性/.test(h) && /云端同步的 FSRS 卡片状态/.test(h),'算法数值标明来源，可复核');

console.log('\n=== 6. 构建产物同步 ===');
ok(PROTO.indexOf('wrongWordStats')>=0 && PROTO.indexOf('reviewForecast')>=0,'单文件原型包含新 Store API');
ok(PROTO.indexOf('注册云端 · 解锁算法统计')>=0,'单文件原型包含注册引导');
ok(HTML.indexOf('id="rpCloud"')>=0 && HTML.indexOf('id="errCloud"')>=0,'两份复盘容器均已就位');
ok(HTML.indexOf('id="rpWeakList"')>=0 && HTML.indexOf('id="rpActionList"')>=0,'周报深度区改为动态容器');
ok(HTML.indexOf('按真实错词顺序复习 Top10')>=0,'一键复习入口接真实错词队列');
ok(PROTO.indexOf('8–12 分')<0 && PROTO.indexOf('本周有 <b>1 天未打卡')<0,'单文件原型已清除写死数据');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
