/* 端到端验证：用户粘性改进（收官卡 + 错词跨天追踪）
 *  1) 每日错词归档、按日期去重
 *  2) 昨日错词优先回带进今日复习段，并打 prevWrong 标记
 *  3) 答对昨日错词时给「上次错了，这次对了」正反馈
 *  4) 收官卡展示真实正确率 / 三段 / 攻克数 / 打卡 / 高考剩余词量
 *  5) 成果图可本地生成，不外传、不造假
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
    alert(){},confirm(){return true;} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx)};
}

(async function main(){
  console.log('\n=== 1. 每日错词归档 ===');
  const A=makeCtx();
  A.ev('Store.reset();Store.resetEnt();');
  const y=A.ev('Store.dateKeyOffset(Store.today(),-1)');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(y),'日期偏移产出 YYYY-MM-DD（昨日 '+y+'）');
  ok(A.ev('Store.dailyWrongOn("'+y+'").length')===0,'昨日初始无错词');
  // 用昨日日期写入两条错词
  A.ev('(function(){var s=Store.snapshot();s.state.dailyWrong={"'+y+'":["accumulate","address"]};Store.hydrate(s.state,s.entitlements);})()');
  ok(A.ev('Store.dailyWrongOn("'+y+'").length')===2,'昨日错词可读出 2 个');
  ok(A.ev('Store.dailyWrongOn("1999-01-01").length')===0,'无关日期不串数据');
  // noteDailyWrong 写今天，重复不叠加
  A.ev('Store.noteDailyWrong("boost");Store.noteDailyWrong("boost")');
  ok(A.ev('Store.dailyWrongOn(Store.today()).length')===1,'今日错词去重（实际 '+A.ev('Store.dailyWrongOn(Store.today()).length')+'）');

  console.log('\n=== 2. 昨日错词优先回带 ===');
  const B=makeCtx();
  B.ev('Store.reset();Store.resetEnt();');
  const words=B.ev('pgAll().filter(w=>!Store.isLexWord(w.w)).slice(0,24).map(w=>w.w)');
  words.forEach(w=>B.ev('Store.practiceQuick("'+w+'",1)')); // 全部练成已学且偏弱
  const by=B.ev('Store.dateKeyOffset(Store.dailyPlan("theme").dateKey,-1)');
  const wrongTwo=[words[3],words[9]];
  B.ev('(function(){var s=Store.snapshot();s.state.dailyWrong={"'+by+'":["'+wrongTwo.join('","')+'"]};Store.hydrate(s.state,s.entitlements);})()');
  const plan=B.ev('Store.dailyPlan("theme")');
  ok(plan.prevWrongCount===2,'组卷识别到 2 个昨日错词');
  ok(plan.prevWrongInPlan>=1,'昨日错词至少 1 个实际排进今天（实际 '+plan.prevWrongInPlan+'）');
  const rev=plan.items.filter(x=>x.stage==='review');
  const revIdx=rev.findIndex(x=>x.prevWrong);
  ok(revIdx>=0,'昨日错词归入复习段');
  ok(revIdx<=1,'昨日错词在复习段最前（索引 '+revIdx+'）');
  ok(plan.items.every(x=>typeof x.prevWrong==='boolean'),'每个词项都带 prevWrong 标记');

  console.log('\n=== 3. 答对昨日错词的正反馈 ===');
  const C=makeCtx();
  C.ev('Store.reset();Store.resetEnt();');
  // 捕获 showReward 文案
  C.ev('var __reward=[];showReward=function(t,s){__reward.push(t+"|"+s);};');
  // 构造一个真实的今日任务场景：昨日错词标记在队首词条上
  C.ev('startDailyPlan();');
  C.ev('dailyPrevWrongFixed=0;studyQueue[0].prevWrong=true;');
  ok(C.ev('studyQueue[0].prevWrong')===true,'队首词被标记为昨日错词');
  ok(C.ev('dailyPrevWrongFixed')===0,'攻克计数初始为 0');
  const ans=C.ev('curQ.answer');
  C.ev('answerQuestion('+ans+')'); // 答对这个昨日错词
  ok(C.ev('dailyPrevWrongFixed')===1,'答对昨日错词后攻克计数 +1（实际 '+C.ev('dailyPrevWrongFixed')+'）');
  const reward=C.ev('__reward.join(" ; ")');
  ok(/上次错了，这次对了/.test(reward),'toast 给出专属正反馈（'+reward+'）');
  const html3=C.ev('document.getElementById("studyBody").innerHTML');
  ok(/上次错了，这次对了/.test(html3),'答题反馈区显示专属文案');
  // 答错时写入当日错词归档
  C.ev('nextQuestion();');
  const wrongIdx=C.ev('(curQ.answer+1)%4');
  const wrongWord=C.ev('studyQueue[studyPos].w');
  C.ev('answerQuestion('+wrongIdx+')');
  ok(C.ev('Store.dailyWrongOn(Store.today()).length')>=1,'今日任务答错后写入当日错词归档');

  console.log('\n=== 4. 收官卡真实数据 ===');
  const D=makeCtx();
  D.ev('Store.reset();Store.resetEnt();');
  D.ev('studyMode="daily";studyRight=15;studyWrong=5;studyRequeued=2;dailyPrevWrongFixed=3;');
  const data=D.ev('dailyWrapData()');
  ok(data.answered===20,'作答数=20（实际 '+data.answered+'）');
  ok(data.acc===75,'正确率按真实作答=75%（实际 '+data.acc+'）');
  ok(data.prevFixed===3,'昨日错词攻克数=3');
  ok(typeof data.streak==='number' && data.streak>=0,'连续打卡为真实数值');
  ok(data.remain===data.total-data.learned,'剩余词量=总量-已学，不注水');
  ok(data.days>=0,'距高考天数非负');
  D.ev('renderDailyWrap()');
  const wrap=D.ev('document.getElementById("studyBody").innerHTML');
  ok(/今日任务完成/.test(wrap),'收官卡标题存在');
  ok(/75/.test(wrap) && /%/.test(wrap),'收官卡显示真实正确率');
  ok(/昨日错词攻克/.test(wrap) && /3 个/.test(wrap),'展示昨日错词攻克数');
  ok(/连续打卡/.test(wrap) && /距 2027 高考/.test(wrap),'展示打卡与高考倒计时');
  ok(/新学/.test(wrap) && /复习/.test(wrap) && /巩固/.test(wrap),'展示三段构成');
  ok(/生成今日成果图/.test(wrap),'提供成果图入口');

  console.log('\n=== 5. 成果图本地生成 ===');
  const poster=D.ev('exportDailyPoster()');
  ok(poster===null,'无 canvas 能力时安全返回 null，不抛错');
  ok(D.ev('dailyWrapData().total')>=4110,'收官卡基于全量 4110 词口径');

  console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
  if(FAIL)process.exit(1);
})().catch(e=>{console.error(e);process.exit(2);});
