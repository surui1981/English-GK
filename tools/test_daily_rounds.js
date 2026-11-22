/* 端到端验证：今日任务多轮组卷与分母口径
 *  1) 会话分母：本轮作答 / 今日累计分别累计，云同步往返不丢
 *  2) 多轮换批：第 2 轮不重复第 1 轮词集，错题回炉优先带上轮错词
 *  3) 人性化重排：错词间隔 3~5 题再出现，同一词单轮最多 2 次
 *  4) 疲劳保护：累计作答达到推荐量后提示收官
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
const script = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
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
    alert(){},confirm(){return true;} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx)};
}

console.log('\n=== 1. 会话分母累计 ===');
const A=makeCtx();
A.ev('Store.reset();Store.resetEnt();');
ok(A.ev('Store.dailySessionStats().rounds')===0,'初始没有轮次');
A.ev('Store.startDailyRound(["a","b","c"])');
ok(A.ev('Store.dailySessionStats().roundNo')===1,'首轮编号 1');
A.ev('Store.noteDailyRoundAnswer("a",true);Store.noteDailyRoundAnswer("b",false);Store.noteDailyRoundAnswer("c",true)');
let s=A.ev('Store.dailySessionStats()');
ok(s.answers===3 && s.right===2 && s.wrong===1,'今日累计 3 次作答 / 2 对 1 错');
ok(s.roundAnswered===3 && s.roundRight===2,'本轮分母与今日分母一致（首轮）');
ok(s.roundWrongWords.length===1 && s.roundWrongWords[0]==='b','错词 b 已记录到本轮');
A.ev('Store.startDailyRound(["d","e"])');
A.ev('Store.noteDailyRoundAnswer("d",true)');
s=A.ev('Store.dailySessionStats()');
ok(s.rounds===2 && s.roundNo===2,'第二轮编号递增');
ok(s.answers===4 && s.right===3,'今日累计分母继续增长（实际 '+s.answers+'）');
ok(s.roundAnswered===1 && s.roundWords.length===2,'第二轮分母独立（1/2）');
const snap=A.ev('Store.snapshot()');
A.ev('Store.reset()');
A.ev('Store.hydrate(' + JSON.stringify(snap.state) + ',' + JSON.stringify(snap.entitlements) + ')');
s=A.ev('Store.dailySessionStats()');
ok(s.answers===4 && s.rounds===2,'云同步快照往返后会话分母不丢');

console.log('\n=== 2. 多轮换批与错题回炉 ===');
const B=makeCtx();
B.ev('Store.reset();Store.resetEnt();');
B.ev('startDailyPlan()');
const r1=B.ev('Store.dailySessionStats().roundWords.slice()');
ok(r1.length===20,'首轮 20 词（实际 '+r1.length+'）');
B.ev('(function(){var s=Store.dailySessionStats();for(var i=0;i<s.roundWords.length;i++)Store.noteDailyRoundAnswer(s.roundWords[i],i%4!==0);})()');
const wrongs=B.ev('Store.dailySessionStats().roundWrongWords.slice()');
ok(wrongs.length>=4,'首轮产生可回炉错词（实际 '+wrongs.length+'）');
B.ev('startDailyPlan("normal")');
const r2=B.ev('Store.dailySessionStats().roundWords.slice()');
const overlap=r2.filter(w=>r1.indexOf(w)>=0).length;
ok(r2.length===20,'换一批仍为 20 词');
ok(overlap<=2,'换一批与上轮重复词很少（实际 '+overlap+'）');
B.ev('startDailyPlan("wrong")');
const r3=B.ev('Store.dailySessionStats().roundWords.slice()');
ok(wrongs.every(w=>r3.indexOf(w)>=0),'错题回炉包含上轮全部错词');
ok(r3.length<=wrongs.length+5,'错题回炉规模受控（实际 '+r3.length+'）');

console.log('\n=== 3. 错词间隔与出现上限 ===');
const C=makeCtx();
C.ev('Store.reset();Store.resetEnt();');
C.ev('startDailyPlan()');
C.ev('var __w=studyQueue[studyPos].w;var __bad=(curQ.answer+1)%4;answerQuestion(__bad);nextQuestion();');
const gap=C.ev('(function(){for(var i=studyPos;i<studyQueue.length;i++)if(studyQueue[i].w===__w)return i-studyPos+1;return -1;})()');
ok(gap>=3&&gap<=5,'错词被插到后续第 3~5 题（实际间隔 '+gap+'）');
C.ev('var __w2=studyQueue[studyPos].w;var __bad2=(curQ.answer+1)%4;answerQuestion(__bad2);nextQuestion();');
C.ev('var __bad3=(curQ.answer+1)%4;answerQuestion(__bad3);nextQuestion();');
const twice=C.ev('(function(){var n=0;for(var i=0;i<studyQueue.length;i++)if(studyQueue[i].w===__w2)n++;return n;})()');
ok(twice<=2,'同一词单轮出现不超过 2 次（实际 '+twice+'）');

console.log('\n=== 4. 收官卡分母与疲劳保护 ===');
const D=makeCtx();
D.ev('Store.reset();Store.resetEnt();');
D.ev('startDailyPlan()');
D.ev('(function(){var s=Store.dailySessionStats();for(var i=0;i<s.roundWords.length;i++)Store.noteDailyRoundAnswer(s.roundWords[i],i%5!==0);})()');
let d=D.ev('dailyWrapData()');
ok(d.answered===20,'本轮作答分母 20（实际 '+d.answered+'）');
ok(d.dayAnswers===20,'今日累计分母 20（实际 '+d.dayAnswers+'）');
D.ev('Store.startDailyRound(["x"]);for(var i=0;i<40;i++)Store.noteDailyRoundAnswer("x",true)');
d=D.ev('dailyWrapData()');
ok(d.dayAnswers===60,'多轮后今日累计分母变 60（实际 '+d.dayAnswers+'）');
ok(d.tired===true,'达到推荐量触发疲劳保护');
const wrap=D.ev('(function(){renderDailyWrap();return document.getElementById("studyBody").innerHTML;})()');
ok(/今日累计 60 次/.test(wrap),'收官卡展示累计分母');
ok(/达到推荐量/.test(wrap),'疲劳保护文案出现');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
