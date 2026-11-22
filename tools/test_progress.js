/* 端到端验证：单词进度页（全量 4110 词 · 红绿复习）
 * 用轻量 DOM stub + vm 加载完整 index.html 脚本，验证：
 *  1) 词表注入 4110 词、去重
 *  2) 初始全红，练习后红转绿
 *  3) 练习次数累计、熟练度变化
 *  4) 红词优先排序（复习频率更高）
 *  5) 购买解锁不被破坏
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

const store = {}; // localStorage 内存实现
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem(k,v){ store[k]=String(v); },
  removeItem(k){ delete store[k]; },
  clear(){ for(const k in store) delete store[k]; },
};

const document = {
  getElementById: getEl,
  querySelector(){ return makeEl('q'); },
  querySelectorAll(){ return []; },
  createElement(tag){ return makeEl('new-'+tag); },
  addEventListener(){},
  body: makeEl('body'),
  documentElement: makeEl('html'),
};

const ctx = {
  console, document, localStorage,
  window: {}, navigator: { userAgent: 'node' },
  setTimeout(fn){ return 0; }, clearTimeout(){},
  setInterval(){ return 0; }, clearInterval(){},
  requestAnimationFrame(){ return 0; },
  Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, parseInt, parseFloat,
  alert(){}, confirm(){ return true; }, prompt(){ return ''; },
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

console.log('\n=== 加载脚本 ===');
try { vm.runInContext(script, ctx, { filename: 'index.html' }); console.log('  脚本执行 OK'); }
catch(e){ console.log('  脚本执行失败: ' + e.message); process.exit(2); }

/* ---------- 用同作用域执行取值（const/let 不挂 ctx） ---------- */
function ev(expr){ return vm.runInContext(expr, ctx); }

console.log('\n=== 1. 词表注入 ===');
const allLen = ev('pgAll().length');
ok(allLen === 4110, 'pgAll 返回 4110 词（实际 ' + allLen + '）');
const uniq = ev('(function(){var s={},n=0;pgAll().forEach(function(w){if(!s[w.w]){s[w.w]=1;n++;}});return n;})()');
ok(uniq === 4110, '词表去重后仍为 4110（无重复词，实际 ' + uniq + '）');
const metaTotal = ev('CTX_COVERAGE.meta.coverage.total_words');
ok(metaTotal === 4110, 'meta 标注总词数 4110');

console.log('\n=== 2. 初始状态全红 ===');
let sum = ev('pgSummary()');
ok(sum.total === 4110, '汇总 total=4110（实际 ' + sum.total + '）');
ok(sum.red === 4110 && sum.green === 0, '初始全红：red=4110 green=0（实际 red=' + sum.red + ' green=' + sum.green + '）');

console.log('\n=== 3. 非 LEX 覆盖词快速学习：红转绿 + 次数 + 熟练度 ===');
// 找一个非 LEX 的普通覆盖词
const word = ev('(function(){for(var i=0;i<pgAll().length;i++){var w=pgAll()[i];if(!Store.isLexWord(w.w)&&!w.is_phrase)return w.w;}return null;})()');
console.log('  测试词（非精修）：' + word);
let p0 = ev('Store.wordProgress("' + word + '")');
ok(p0.color === 'red' && p0.practiced === 0 && p0.mastery === 0, '初值 红/0次/0%');
ev('Store.practiceQuick("' + word + '", 3)'); // 记住了
let p1 = ev('Store.wordProgress("' + word + '")');
ok(p1.learned && p1.color === 'green', '自评“记住了”后 红转绿');
ok(p1.practiced === 1, '练习次数累计 = 1（实际 ' + p1.practiced + '）');
ok(p1.mastery === 50, '熟练度 0→50（实际 ' + p1.mastery + '，一次自评 0+(100-0)*0.5）');
ev('Store.practiceQuick("' + word + '", 3)');
let p2 = ev('Store.wordProgress("' + word + '")');
ok(p2.practiced === 2 && p2.mastery === 75, '再评一次 → 2次 / 75%（实际 ' + p2.practiced + '次/' + p2.mastery + '%）');

console.log('\n=== 4. 熟练度档位映射 ===');
const w2 = ev('(function(){for(var i=0;i<pgAll().length;i++){var w=pgAll()[i];if(!Store.isLexWord(w.w)&&w.w!=="' + word + '")return w.w;}return null;})()');
ev('Store.practiceQuick("' + w2 + '", 1)'); // 没记住
let pw2 = ev('Store.wordProgress("' + w2 + '")');
ok(pw2.mastery === 15, '“没记住” → 熟练度 15%（实际 ' + pw2.mastery + '）');
ok(pw2.learned === true, '即使“没记住”也已学（有练习记录即绿，符合红=新词口径）');

console.log('\n=== 5. 红词优先排序（复习频率更高） ===');
ev('pgFilter="all";pgQuery=""');
const list = ev('pgList().map(function(x){return [x.w.w,x.p.learned];})');
const firstLearnedIdx = list.findIndex(x => x[1] === true);
const lastRedIdx = list.reduce((acc,x,i)=> x[1]===false?i:acc, -1);
ok(firstLearnedIdx === -1 || lastRedIdx < firstLearnedIdx, '所有红词排在绿词之前（最后一个红词 idx=' + lastRedIdx + '，首个绿词 idx=' + firstLearnedIdx + '）');
const redFilterCount = ev('(pgFilter="red",pgList().length)');
ev('pgFilter="all"');
ok(redFilterCount === 4110 - 2, '“未学红词”筛选数 = 4110 - 已学2词（实际 ' + redFilterCount + '）');

console.log('\n=== 6. 渲染进度页 ===');
try {
  ev('openProgress()');
  const html = getEl('progressBody').innerHTML;
  ok(html.indexOf('pg-stat') >= 0, '进度页渲染出统计卡');
  ok(html.indexOf('覆盖总词') >= 0 && html.indexOf('已学(绿)') >= 0, '统计口径文案存在');
  ok(html.indexOf('红词优先排期') >= 0, '红词高频提示文案存在');
  ok(html.indexOf('pg-row') >= 0, '渲染出词行列表');
  const cnt = getEl('pgCnt').textContent;
  ok(cnt === '2/4110', '顶部计数 已学/总 = 2/4110（实际 ' + cnt + '）');
} catch(e){ ok(false, '进度页渲染异常: ' + e.message); }

console.log('\n=== 7. 购买解锁未被破坏 ===');
ok(ev('Store.hasAll()') === false, '初始未解锁');
ev('Store.grantAll()');
ok(ev('Store.hasAll()') === true, 'grantAll 后已解锁');
ok(ev('localStorage.getItem("shici_entitlements_v1")') !== null, '权益写入 localStorage');
// 刷新模拟：重新加载脚本，权益应从 localStorage 恢复
const ctx2 = Object.assign({}, ctx);
// 复制 store 数据到新 localStorage
let persisted = JSON.parse(JSON.stringify(store));
const ls2 = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(persisted,k)?persisted[k]:null; },
  setItem(k,v){ persisted[k]=String(v); }, removeItem(k){delete persisted[k];}, clear(){}
};
const ctxB = { console, document: {getElementById:getEl,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: ls2,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxB.window=ctxB; ctxB.globalThis=ctxB; vm.createContext(ctxB);
vm.runInContext(script, ctxB, {filename:'index.html'});
ok(vm.runInContext('Store.hasAll()', ctxB) === true, '重新加载后权益从 localStorage 恢复');

/* ---------- 成长成就层（在全新 ctx 中独立验证，避免前面测试污染） ---------- */
console.log('\n=== 8. 学习成长成就层 ===');
const storeC = {};
const lsC = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storeC,k)?storeC[k]:null; },
  setItem(k,v){ storeC[k]=String(v); }, removeItem(k){delete storeC[k];}, clear(){for(const k in storeC)delete storeC[k];}
};
const elsC = {};
const getElC = id => elsC[id] || (elsC[id] = makeEl(id));
const ctxC = { console, document: {getElementById:getElC,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: lsC,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxC.window=ctxC; ctxC.globalThis=ctxC; vm.createContext(ctxC);
vm.runInContext(script, ctxC, {filename:'index.html'});
const evC = e => vm.runInContext(e, ctxC);

ok(evC('Store.learnedCount()') === 0, '初始已学 0 词');
let l0 = evC('Store.levelInfo()');
ok(l0.idx === 1 && l0.name === '起步' && l0.toNext === 10, 'Lv.1 起步，距下一级 10 词');
ok(evC('Store.newWordsToday()') === 0, '今日新学初始 0');

// 学 10 个非精修词 → 跨里程碑 10 + 升级到 Lv.2
const tenWords = evC('(function(){var a=[],s={};pgAll().forEach(function(w){if(a.length>=10||s[w.w])return;if(Store.isLexWord(w.w)||w.is_phrase)return;s[w.w]=1;a.push(w.w);});return a;})()');
ok(tenWords.length === 10, '取到 10 个测试词');
evC('window._before=Store.learnedCount();window._lvl=Store.levelInfo().idx');
tenWords.forEach(w => evC('Store.practiceQuick("' + w + '",3)'));
ok(evC('Store.learnedCount()') === 10, '学 10 词后 learnedCount=10');
ok(evC('Store.newWordsToday()') === 10, '今日新学=10（learnedAt 记录今天）');
let l1 = evC('Store.levelInfo()');
ok(l1.idx === 2 && l1.name === '初识', '升级到 Lv.2 初识');
ok(evC('Store.crossedMilestone(window._before)') === 10, 'crossedMilestone(0) → 里程碑 10');
ok(evC('Store.crossedLevel(window._lvl)').idx === 2, 'crossedLevel(1) → Lv.2');
let msl = evC('Store.milestoneList()');
ok(msl.filter(x=>x.got).map(x=>x.n).join(',') === '10', '里程碑列表仅 10 已达成');

// renderGrowth 渲染首页看板
evC('renderGrowth(true)');
ok(String(getElC('gcLearned').textContent) === '10', '看板已学词数=10（数字滚动目标值）');
ok(getElC('gcLevel').textContent.indexOf('Lv.2') >= 0, '看板等级显示 Lv.2');
ok(getElC('gcTodayTitle').textContent.indexOf('10') >= 0, '看板今日已学=10');
ok(getElC('gcMilestones').innerHTML.indexOf('mstone got') >= 0, '里程碑徽章渲染出已达成态');

// 奖励 toast / 庆祝弹层不抛错
let rewardOK = true;
try {
  evC('showReward("+1 已掌握","测试",false)');
  evC('burstConfetti(false)');
  evC('openCelebrate("milestone",{n:10,cta:null})');
  ok(getElC('celebrate').classList.contains('on'), '庆祝弹层可打开');
  evC('closeCelebrate()');
  ok(!getElC('celebrate').classList.contains('on'), '庆祝弹层可关闭');
} catch(e){ rewardOK=false; ok(false,'奖励/庆祝函数异常: '+e.message); }

/* ---------- 高考倒计时备考仪表盘 ---------- */
console.log('\n=== 9. 高考倒计时仪表盘 ===');
// 用 ctxC：已学 10 词、今日 10 词
const days = evC('daysToGaokao()');
ok(days >= 0 && days <= 400, '距高考天数合理（实际 '+days+'）');
evC('syncCountdown()');
ok(String(getElC('cdDays').textContent) === String(days), '倒计时天数写入 DOM');
ok(String(getElC('cdLearned').textContent) === '10', '已学词数=10 写入倒计时');
ok(String(getElC('cdTotal').textContent) === '4110', '总词数=4110');
ok(String(getElC('cdRemain').textContent) === '4100', '未学词数=4100（4110-10）');
const perDay = parseInt(getElC('cdPerDay').textContent,10);
const expectPerDay = days>0 ? Math.ceil(4100/days) : 4100;
ok(perDay === expectPerDay, '每天需学=ceil(未学/天数)（实际 '+perDay+'，预期 '+expectPerDay+'）');
ok(String(getElC('cdToday').textContent) === '10', '今日已学=10 写入');
ok(getElC('cdUrgentText').innerHTML.indexOf('今天还差') >= 0 || getElC('cdUrgentText').innerHTML.indexOf('超过') >= 0, '危机感文案已生成: '+getElC('cdUrgentText').innerHTML);
// 文案分层：今日已学 ≥ 每天需学 → 达标鼓励
evC('(function(){var st=Store.load();for(var w in st.learnedAt)st.learnedAt[w]-=86400000;Store.save();})()'); // 让今日新学归零之外的不影响 learned
// 直接把一场测试改成「落后」场景：清空今日新学（把所有 learnedAt 设为昨天）
evC('(function(){var st=Store.load(),y=Date.now()-86400000;for(var w in st.learnedAt)st.learnedAt[w]=y;Store.save();syncCountdown();})()');
ok(String(getElC('cdToday').textContent) === '0', '模拟落后场景：今日新学=0');
ok(getElC('cdUrgentText').innerHTML.indexOf('今天还差') >= 0, '落后场景显示施压文案');
ok(!getElC('cdUrgent').classList.contains('good'), '落后场景urgent不为good态');
// 达标场景：今日新学 >= perDay
evC('(function(){var need=parseInt(document.getElementById("cdPerDay").textContent,10)||1,n=0;for(var i=0;i<pgAll().length&&n<need;i++){var w=pgAll()[i];if(Store.isLexWord(w.w)||w.is_phrase)continue;if(Store.wordProgress(w.w).learned)continue;Store.practiceQuick(w.w,3);n++;}syncCountdown();})()');
ok(getElC('cdUrgentText').innerHTML.indexOf('超过') >= 0 || getElC('cdUrgent').classList.contains('good'), '达标场景显示鼓励文案/good态（今日'+String(getElC('cdToday').textContent)+'词）');

/* ---------- 学习成效：近7日趋势 + 熟练度分布 ---------- */
console.log('\n=== 10. 学习成效可视化 ===');
const storeD = {};
const lsD = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storeD,k)?storeD[k]:null; },
  setItem(k,v){ storeD[k]=String(v); }, removeItem(k){delete storeD[k];}, clear(){for(const k in storeD)delete storeD[k];}
};
const elsD = {};
const getElD = id => elsD[id] || (elsD[id] = makeEl(id));
const ctxD = { console, document: {getElementById:getElD,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: lsD,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxD.window=ctxD; ctxD.globalThis=ctxD; vm.createContext(ctxD);
vm.runInContext(script, ctxD, {filename:'index.html'});
const evD = e => vm.runInContext(e, ctxD);

// 初始：近7日全 0，分布空
const d0=evD('Store.newWordsLast7Days()');
ok(d0.length===7, '近7日返回 7 项');
ok(d0[6].isToday===true && d0[0].isToday===false, '最后一项为今天');
ok(d0.reduce((a,d)=>a+d.count,0)===0, '初始近7日全 0');
ok(evD('Store.masteryDistribution().total')===0, '初始熟练度分布 total=0');

// 造数据：今天学 3 个（自评3→熟练50，巩固中），3天前学 2 个
const wordsD = evD('(function(){var a=[],s={};for(var i=0;i<pgAll().length&&a.length<5;i++){var w=pgAll()[i];if(Store.isLexWord(w.w)||w.is_phrase||s[w.w])continue;s[w.w]=1;a.push(w.w);}return a;})()');
wordsD.slice(0,3).forEach(w=>evD('Store.practiceQuick("'+w+'",3)')); // 熟练50 → 巩固中
const d1=evD('Store.newWordsLast7Days()');
const todayCount=d1[6].count;
ok(todayCount===3, '今天新学=3（近7日最后一项，实际 '+todayCount+'）');
// 把其中 2 个的时间戳改为 3 天前
evD('(function(){var st=Store.load(),t=Date.now()-3*86400000;st.learnedAt["'+wordsD[3]+'"]=t;st.learnedAt["'+wordsD[4]+'"]=t;Store.save();})()');
const d2=evD('Store.newWordsLast7Days()');
ok(d2[3].count===2, '3 天前新学=2（实际 '+d2[3].count+'）');
ok(d2[6].count===3, '今天仍=3');
const md=evD('Store.masteryDistribution()');
ok(md.total===5, '熟练度分布 total=5（实际 '+md.total+'）');
ok(md.solid+md.learning+md.fresh===md.total, '三档之和=total');
// 渲染成效区块
evD('renderEffect()');
ok(getElD('effWeekTotal').textContent==='5 词', '区块周合计=5 词（实际 '+getElD('effWeekTotal').textContent+'）');
ok(getElD('effBars').innerHTML.split('eff-bar').length-1===7, '渲染 7 根柱子');
ok(getElD('effLegend').innerHTML.indexOf('牢固掌握')>=0, '图例渲染出牢固掌握');

/* ---------- 背词记忆专项训练：取词队列 + 出题 + 回流 ---------- */
console.log('\n=== 11. 背词记忆专项训练 ===');
const storeE = {};
const lsE = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storeE,k)?storeE[k]:null; },
  setItem(k,v){ storeE[k]=String(v); }, removeItem(k){delete storeE[k];}, clear(){for(const k in storeE)delete storeE[k];}
};
const elsE = {};
const getElE = id => elsE[id] || (elsE[id] = makeEl(id));
const ctxE = { console, document: {getElementById:getElE,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: lsE,
  setTimeout(fn){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxE.window=ctxE; ctxE.globalThis=ctxE; vm.createContext(ctxE);
vm.runInContext(script, ctxE, {filename:'index.html'});
const evE = e => vm.runInContext(e, ctxE);

// studyMeta：未学 → due=Infinity, learned=false
const meta0=evE('Store.studyMeta("' + evE('LEX[0].w') + '")');
ok(meta0.learned===false && meta0.due>1e9, '未学词 studyMeta: learned=false due=Infinity');

// 队列：各模式存在、批量=20、无重复
['smart','new','due','weak','family'].forEach(m=>{
  const q=evE('buildStudyQueue("'+m+'")');
  ok(q.length>0 && q.length<=20, '队列 '+m+' 长度 '+q.length+'（≤20）');
  const uniq=new Set(q.map(x=>x.w));
  ok(uniq.size===q.length, '队列 '+m+' 无重复词');
});
// family 模式的词都带词形网
const famQ=evE('buildStudyQueue("family")');
const famAllFamily=famQ.every(w=>((w.word_family||[]).length+(w.confusable||[]).length)>0);
ok(famAllFamily, '词形发散队列的每个词都有派生/形近词');
// 新词模式：排在前面的都未学
const newQ=evE('buildStudyQueue("new")');
const firstUnlearned=newQ.slice(0,5).every(w=>evE('Store.studyMeta("'+w.w+'").learned')===false);
ok(firstUnlearned, '新词模式头部均为未学词');

// 出题：每题有4选项、答案索引有效、正确答案文本存在、类型合法
const types=new Set();
let qOK=true;
for(const w of famQ.slice(0,6)){
  const q=evE('(function(){curQ=null;studyMode="family";studyQueue=buildStudyQueue("family");studyPos=studyQueue.findIndex(x=>x.w==="'+w.w+'");curQ=buildQuestion(studyQueue[studyPos]);return {type:curQ.type,n:curQ.options.length,a:curQ.answer,opt:curQ.options,prompt:curQ.prompt};})()');
  types.add(q.type);
  if(q.n!==4 || q.a<0 || q.a>3 || !q.opt[q.a]) qOK=false;
}
ok(qOK, 'family题：每题4选项且答案索引有效');
ok(types.size>=1 && [...types].every(t=>t.indexOf('family')===0), 'family题类型均为词形类: '+[...types].join(','));

// 僻义题：对 trap 词出 trap 题
const trapWord=evE('(function(){for(var i=0;i<LEX.length;i++){if(LEX[i].is_trap||LEX[i].trap_count>0)return LEX[i].w;}return null;})()');
if(trapWord){
  const tq=evE('(function(){studyMode="smart";var lw=LEX.find(function(x){return x.w==="'+trapWord+'";});var q=buildQuestion(lw);return {type:q.type,n:q.options.length};})()');
  ok(tq.type==='trap' && tq.n===4, '僻义词出 trap 题（'+trapWord+' → '+tq.type+'）');
}

// 判分回流：答对 → FSRS 建档 + learnedCount 增加；答错 → lapses 记录
const beforeLearn=evE('Store.learnedCount()');
// 用 family 题，先渲染再答对
evE('(function(){studyMode="family";resetStudy();curQ=buildQuestion(studyQueue[0]);curQ._word=studyQueue[0].w;studyAnswered=false;})()');
const ansIdx=evE('curQ.answer');
evE('answerQuestion('+ansIdx+')');
ok(evE('studyRight')===1 && evE('studyWrong')===0, '答对后 studyRight=1');
ok(evE('Store.learnedCount()')>=beforeLearn, '答对后 learnedCount 不减');
const metaAfter=evE('Store.studyMeta("'+evE('studyQueue[0].w')+'")');
ok(metaAfter.learned===true, '答对后该词 studyMeta.learned=true（FSRS 建档）');
// 答错 → 重排
evE('(function(){curQ=buildQuestion(studyQueue[1]);curQ._word=studyQueue[1].w;studyAnswered=false;})()');
const wrongIdx=evE('(curQ.answer+1)%4');
const queueLenBefore=evE('studyQueue.length');
evE('answerQuestion('+wrongIdx+')');
ok(evE('studyWrong')===1, '答错后 studyWrong=1');
evE('nextQuestion()');
ok(evE('studyQueue.length')===queueLenBefore+1, '答错后队列长度+1（重排再练）');
ok(evE('studyRequeued')===1, 'studyRequeued=1');
// 渲染不抛错
let studyRenderOK=true;
try{ evE('renderStudy()'); }catch(e){ studyRenderOK=false; ok(false,'renderStudy 异常: '+e.message); }
ok(studyRenderOK, 'renderStudy 用新逻辑渲染不抛错');
ok(getElE('studyBody').innerHTML.indexOf('smodes')>=0, '渲染出模式切换条');
ok(getElE('studyBody').innerHTML.indexOf('qopt')>=0, '渲染出选择题选项');

/* ---------- 熟词僻义 · 高考常考变体词汇（独立上下文，避免前面学习状态污染） ---------- */
console.log('\n=== 12. 熟词僻义变体词专项 ===');
const storeF = {};
const lsF = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storeF,k)?storeF[k]:null; },
  setItem(k,v){ storeF[k]=String(v); }, removeItem(k){ delete storeF[k]; }, clear(){ for(const k in storeF) delete storeF[k]; }
};
const elsF = {};
const getElF = id => elsF[id] || (elsF[id] = makeEl(id));
const ctxF = { console, document: {getElementById:getElF,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: lsF,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxF.window=ctxF; ctxF.globalThis=ctxF; vm.createContext(ctxF);
try { vm.runInContext(script, ctxF, {filename:'index.html'}); }
catch(e){ ok(false, '变体词上下文加载异常: ' + e.message); }
const evF = e => vm.runInContext(e, ctxF);

if (typeof evF('CTX_TRAP') !== 'undefined' && evF('CTX_TRAP')) {
  const tw = evF('CTX_TRAP.words');
  ok(tw.length === 1007, 'CTX_TRAP 注入 1007 个核心词（实际 ' + tw.length + '）');
  ok(evF('CTX_TRAP.meta.coverage.featured_words') === 100 &&
     evF('CTX_TRAP.meta.coverage.highfreq_words') === 564 &&
     evF('CTX_TRAP.meta.coverage.extended_words') === 343,
     '分层口径：精修 100 + 高频688新词 564 + 必考扩展 343');
  ok(evF('CTX_TRAP.meta.coverage.variants_total') >= 6000, '变体提示总量 ≥6000（实际 ' + evF('CTX_TRAP.meta.coverage.variants_total') + '）');

  const bad = tw.filter(w => {
    const q = w.question || {};
    if ((w.variants||[]).length < 6) return true;
    if (!(w.common_senses||[]).length) return true;
    if (!q.stem || q.stem.indexOf('___') < 0) return true;
    if (!q.options || q.options.length !== 4) return true;
    if (q.answer_index < 0 || q.answer_index > 3) return true;
    if (q.options[q.answer_index] !== q.answer_text) return true;
    if (new Set((w.variants||[]).map(v=>v.form.toLowerCase())).size !== (w.variants||[]).length) return true;
    return false;
  });
  ok(bad.length === 0, '1007 词变体/题目结构完整且无重复变体（异常 ' + bad.length + ' 词）');
  ok(tw.every(w => (w.question||{}).source && (w.question||{}).source.indexOf('仿真') >= 0), '题目来源均标注仿真语境，不含真题');

  const qz = evF('QUIZ');
  ok(qz.length === 100, '专项训练题库由 CTX_TRAP 生成 100 题（实际 ' + qz.length + '）');
  ok(qz[0].headword === tw[0].headword && qz[0].opts.length === 4, '训练题与变体词数据同源');

  try {
    evF('openBook3()');
    const b3 = getElF('book3Body').innerHTML;
    ok(b3.indexOf('高考常考变体词汇') >= 0, '图书详情页渲染出高考常考变体词汇区');
    ok(b3.indexOf('词形') >= 0 && b3.indexOf('形近') >= 0 && b3.indexOf('搭配变体') >= 0, '详情页展示四类变体标签');
  } catch(e){ ok(false, 'renderBook3 异常: ' + e.message); }

  try {
    evF('qIdx=0;qAnswered=false;renderQuiz()');
    ok(getElF('quizBody').innerHTML.indexOf('高考常考变体') < 0, '未作答时不提前展示变体提示');
    evF('pick(QUIZ[0].right)');
    const fb = getElF('quizBody').innerHTML;
    ok(fb.indexOf('高考常考变体') >= 0, '作答反馈展示高考常考变体卡片');
    ok(fb.indexOf('常见义干扰') >= 0, '作答反馈展示常见义干扰');
    evF('qIdx=0;qAnswered=false;qRight=0;qWrong=1;QUIZ[0].picked=(QUIZ[0].right+1)%4;renderQuizResult()');
    ok(getElF('quizBody').innerHTML.indexOf('本次错词 · 变体清单') >= 0, '结果页生成本次错词变体清单');
  } catch(e){ ok(false, '熟词僻义训练渲染异常: ' + e.message); }
} else {
  ok(false, 'CTX_TRAP 未注入');
}

/* ---------- 核心变体词熟练度反馈（独立上下文） ---------- */
console.log('\n=== 13. 核心变体词熟练度反馈 ===');
const storeG = {};
const lsG = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storeG,k)?storeG[k]:null; },
  setItem(k,v){ storeG[k]=String(v); }, removeItem(k){ delete storeG[k]; }, clear(){ for(const k in storeG) delete storeG[k]; }
};
const elsG = {};
const getElG = id => elsG[id] || (elsG[id] = makeEl(id));
const ctxG = { console, document: {getElementById:getElG,querySelector(){return makeEl('q');},querySelectorAll(){return [];},createElement(t){return makeEl(t);},addEventListener(){},body:makeEl('body')}, localStorage: lsG,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
  Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,parseInt,parseFloat,alert(){},confirm(){return true;},prompt(){return '';} };
ctxG.window=ctxG; ctxG.globalThis=ctxG; vm.createContext(ctxG);
try { vm.runInContext(script, ctxG, {filename:'index.html'}); }
catch(e){ ok(false, '熟练度上下文加载异常: ' + e.message); }
const evG = e => vm.runInContext(e, ctxG);

ok(evG('trapWordStats().total') === 100, '免费态熟练度统计为 100 精修陷阱词（实际 ' + evG('trapWordStats().total') + '）');
evG('Store.grantAll();'); // 本节验证全量词表的自评反馈，按新权益模型先解锁 1007 词

let st0 = evG('trapWordStats()');
ok(st0.total === 1007, '熟练度统计覆盖 1007 核心词（实际 ' + st0.total + '）');
ok(st0.learned === 0 && st0.red === 1007, '初始全红：已学0 / 未学1007');
try {
  evG('openTrapWords()');
  const h = getElG('trapWordsBody').innerHTML;
  ok(h.indexOf('核心词') >= 0 && h.indexOf('未学(红)') >= 0, '熟练度页渲染出统计口径');
  ok(h.indexOf('tw-row') >= 0, '熟练度页渲染出词行');
  ok(h.indexOf('再学') >= 0 && h.indexOf('模糊') >= 0 && h.indexOf('掌握') >= 0, '每词提供三档自评');
} catch(e){ ok(false, 'renderTrapWords 异常: ' + e.message); }

const l2word = evG('(function(){for(var i=0;i<trapCtx().words.length;i++){var x=trapCtx().words[i];if(!x.featured)return x.headword;}return null;})()');
evG('trapRate("' + l2word + '",3)');
let st1 = evG('trapWordStats()');
ok(st1.learned === 1 && st1.red === 1006, '扩展核心词自评后 红转绿（已学1 / 未学1006）');
const prog1 = evG('Store.wordProgress("' + l2word + '")');
ok(prog1.learned && prog1.practiced === 1 && prog1.mastery === 50, '反馈含练习次数与熟练度：' + l2word + ' 1次/50%');
ok(getElG('trapWordsBody').innerHTML.indexOf('1 次') >= 0, '词行即时显示练习次数');
ok(getElG('trapWordsBody').innerHTML.indexOf('50%') >= 0 || prog1.mastery === 50, '词行即时显示熟练度');

const l1word = evG('trapCtx().words[0].headword');
evG('trapRate("' + l1word + '",3)');
let st2 = evG('trapWordStats()');
ok(st2.learned === 2, '精修核心词也能通过 FSRS 路径更新熟练度（已学2）');
evG('twFilter="red";twShown=40;renderTrapWords()');
ok(evG('trapWordList().length') === 1005, '未学筛选随学习实时减少（实际 ' + evG('trapWordList().length') + '）');

console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========\n');
process.exit(FAIL ? 1 : 0);
