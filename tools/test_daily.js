/* 今日任务组卷专项验证：三段分层 / 三种排序 / 非精修词出题与回流 */
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
function mk(id) {
  return {
    id, _html: '', _text: '', dataset: {}, style: {},
    classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    get innerHTML(){ return this._html; }, set innerHTML(v){ this._html = String(v); },
    get textContent(){ return this._text; }, set textContent(v){ this._text = String(v); },
    addEventListener(){}, appendChild(){}, querySelector(){ return null; },
    querySelectorAll(){ return []; }, scrollTop: 0, focus(){}, click(){}
  };
}
function makeCtx() {
  const els = {}, store = {};
  const localStorage = {
    getItem(k){ return k in store ? store[k] : null; },
    setItem(k, v){ store[k] = String(v); }, removeItem(k){ delete store[k]; }
  };
  const document = {
    getElementById(id){ return els[id] || (els[id] = mk(id)); },
    querySelector(){ return mk('q'); }, querySelectorAll(){ return []; },
    createElement(t){ return mk(t); }, addEventListener(){},
    body: mk('body'), documentElement: mk('html'), visibilityState: 'visible'
  };
  const ctx = {
    console, document, localStorage, URL: global.URL,
    location: { href: 'https://x.com/', origin: 'https://x.com', assign(){} },
    history: { replaceState(){} },
    setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    requestAnimationFrame(){ return 0; },
    Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, Promise,
    parseInt, parseFloat, alert(){}, confirm(){ return true; }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx, { filename: 'index.html' });
  return { ctx, ev: e => vm.runInContext(e, ctx) };
}

(async function main(){
  console.log('\n=== 1. 初始全红：20 词全为新学 ===');
  const A = makeCtx();
  let p = A.ev('Store.dailyPlan("theme")');
  ok(p.total === 20, '初始组卷 20 词（实际 ' + p.total + '）');
  ok(p.counts.new === 20 && p.counts.review === 0 && p.counts.consolidate === 0,
    '未学状态下 20 词全部归入新学段');
  ok(new Set(p.words).size === 20, '20 词无重复');

  console.log('\n=== 2. 三种排序模式 ===');
  const alpha = A.ev('Store.dailyPlan("alpha")');
  const alphaNew = alpha.items.filter(x => x.stage === 'new').map(x => x.w);
  ok(alphaNew.every((w, i) => i === 0 || alphaNew[i-1] <= w), '字母顺序：新学段按字母升序');
  const theme = A.ev('Store.dailyPlan("theme")');
  ok(!!theme.themeFocus && theme.themeFocus.indexOf('T-') === 0, '词义相近：聚焦主题语义场（' + theme.themeFocus + '）');
  const r1 = A.ev('Store.dailyPlan("random","2026-11-21").words.join()');
  const r2 = A.ev('Store.dailyPlan("random","2026-11-21").words.join()');
  const r3 = A.ev('Store.dailyPlan("random","2026-11-22").words.join()');
  ok(r1 === r2, '随机抽取：同一天结果稳定');
  ok(r1 !== r3, '随机抽取：不同日期自动换批');

  console.log('\n=== 3. 有已学词后：三段分层 ===');
  const B = makeCtx();
  const words = B.ev('pgAll().filter(w=>!Store.isLexWord(w.w)).slice(0,20).map(w=>w.w)');
  // 前 12 词练 3 次「记住了」→ mastery 87.5 ≥ 80 → 巩固段；后 8 词练 1 次 → 复习段
  words.forEach((w, i) => {
    if (i < 12) { B.ev('Store.practiceQuick("' + w + '",3)'); B.ev('Store.practiceQuick("' + w + '",3)'); B.ev('Store.practiceQuick("' + w + '",3)'); }
    else B.ev('Store.practiceQuick("' + w + '",1)');
  });
  const p3 = B.ev('Store.dailyPlan("theme")');
  const st = p3.items.reduce((a, x) => (a[x.stage] = (a[x.stage] || 0) + 1, a), {});
  ok((st.review || 0) > 0, '低熟练已学词进入复习段（复习 ' + (st.review || 0) + '）');
  ok((st.consolidate || 0) > 0, '高熟练已学词进入巩固段（巩固 ' + (st.consolidate || 0) + '）');
  ok((st.new || 0) > 0, '仍有新学词（新学 ' + (st.new || 0) + '）');
  ok(p3.total === 20, '三段调剂后仍凑满 20 词');
  const order = p3.items.map(x => x.stage);
  const lastNew = order.lastIndexOf('new'), firstRev = order.indexOf('review'), firstCon = order.indexOf('consolidate');
  ok(lastNew < firstRev && firstRev < firstCon, '呈现顺序为 新学→复习→巩固闭环');

  console.log('\n=== 4. 非精修词简化出题 ===');
  const fastWord = B.ev('pgAll().filter(w=>!Store.isLexWord(w.w)&&Object.keys(fastMeanMap()).indexOf(w.w)>=0)[0].w');
  const q = B.ev('buildQuestion({w:"' + fastWord + '",ipa:"",pos:["n"],fast:true,theme:"",word_family:[],confusable:[],senses:[]})');
  ok(q.type === 'fast-sense', '有释义覆盖词 → 简化词义选择题（' + fastWord + '）');
  ok(q.options.length === 4 && q.answer >= 0 && q.answer < 4, '四个选项且答案索引合法');
  ok(!!q.explain && q.fast === true, '含主题解析并标记 fast');
  const qWrong = q.options.filter((_, i) => i !== q.answer);
  ok(new Set(qWrong).size === 3, '三个干扰项互不重复');

  console.log('\n=== 5. 无释义覆盖词 → 词性辨析题 ===');
  const noMean = B.ev('pgAll().filter(w=>!Store.isLexWord(w.w)&&Object.keys(fastMeanMap()).indexOf(w.w)<0)[0].w');
  const q2 = B.ev('buildQuestion({w:"' + noMean + '",ipa:"/test/",pos:["v"],fast:true,theme:"T-测试",word_family:[],confusable:[],senses:[]})');
  ok(q2.type === 'fast-pos', '无释义词 → 词性辨析题');
  ok(q2.options.length === 4 && q2.answer >= 0, '词性题四选项合法');

  console.log('\n=== 6. 今日任务取词与回流 ===');
  B.ev('setDailyOrder("alpha");startDailyPlan()');
  const qLen = B.ev('studyQueue.length');
  ok(qLen === 20, '开始今日任务 → 背词队列 20 词（实际 ' + qLen + '）');
  ok(B.ev('studyMode') === 'daily', '背词模式切为 daily');
  const before = B.ev('Store.wordProgress("' + fastWord + '").practiced');
  B.ev('Store.practiceQuick("' + fastWord + '",3)');
  ok(B.ev('Store.wordProgress("' + fastWord + '").practiced') === before + 1,
    '非精修词答题后练习次数回流 +1');

  console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('测试异常：', e); process.exit(2); });
