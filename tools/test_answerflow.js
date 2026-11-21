/* 今日任务答题交互专项验证：
 *  答对 → 自动进入下一题（无需点击）；答错 → 翻卡背面展示词义详情 + 手动下一题。
 *  其他模式交互保持不变。 */
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
    id, _html: '', _text: '', dataset: {}, style: { setProperty(){} },
    classList: { _s:new Set(), toggle(c,f){ f?this._s.add(c):this._s.delete(c); },
                 add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);} },
    get innerHTML(){ return this._html; }, set innerHTML(v){ this._html = String(v); },
    get textContent(){ return this._text; }, set textContent(v){ this._text = String(v); },
    addEventListener(){}, appendChild(){}, querySelector(){ return null; },
    querySelectorAll(){ return []; }, scrollTop: 0, focus(){}, click(){}
  };
}
function makeCtx() {
  const els = {}, store = {}, timers = [];
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
    setTimeout(fn, ms){ timers.push({fn, ms}); return timers.length; },
    clearTimeout(id){ if (id) timers[id-1] = null; },
    setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
    Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, Promise,
    parseInt, parseFloat, alert(){}, confirm(){ return true; }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx, { filename: 'index.html' });
  return { ctx, els, timers, ev: e => vm.runInContext(e, ctx) };
}
function flushTimers(A) {
  A.timers.forEach(t => { if (t && t.fn) t.fn(); });
  A.timers.length = 0;
}

(async function main(){
  console.log('\n=== 1. 今日任务答对：自动进入下一题 ===');
  const A = makeCtx();
  A.ev('startDailyPlan()');
  ok(A.ev('studyMode') === 'daily', '进入今日任务模式');
  const pos0 = A.ev('studyPos');
  const right = A.ev('curQ.answer');
  A.ev('answerQuestion(' + right + ')'); // 答对
  ok(A.ev('studyAnswered') === true, '答对后标记为已作答');
  ok(A.ev('dailyFlipped') === false, '答对不翻卡');
  let html = A.els['studyBody'].innerHTML;
  ok(html.indexOf('正在进入下一题') >= 0, '答对反馈提示「正在进入下一题」');
  ok(html.indexOf('class="wcard"') >= 0 && html.indexOf('face back') >= 0, '答题卡为 3D 翻卡结构（含正反面）');
  ok(html.indexOf('下一题 <svg') < 0 || html.indexOf('class="btn btn-primary qnext"') < 0,
    '答对不显示「下一题」按钮');
  ok(A.ev('studyPos') === pos0, '答对瞬间尚未跳题（等待定时器）');
  flushTimers(A); // 触发自动跳题
  ok(A.ev('studyPos') === pos0 + 1, '定时器触发后自动进入下一题（' + pos0 + ' → ' + A.ev('studyPos') + '）');
  ok(A.ev('studyAnswered') === false, '自动跳题后重置作答状态');

  console.log('\n=== 2. 今日任务答错：翻卡背面 + 词义详情 ===');
  const B = makeCtx();
  B.ev('startDailyPlan()');
  const posB = B.ev('studyPos');
  const wrong = B.ev('(curQ.answer+1)%4');
  B.ev('answerQuestion(' + wrong + ')'); // 答错
  ok(B.ev('dailyFlipped') === true, '答错后翻面标记 true');
  html = B.els['studyBody'].innerHTML;
  ok(html.indexOf('wcard flip') >= 0, '答题卡加上 flip 类（翻到背面）');
  ok(html.indexOf('答错了 · 已翻开词卡背面') >= 0, '答错反馈提示翻卡');
  ok(html.indexOf('class="btn btn-primary qnext"') >= 0, '答错显示「下一题」按钮（手动继续）');
  ok(html.indexOf('义项树') >= 0 || html.indexOf('核心释义') >= 0 || html.indexOf('主题语义场') >= 0,
    '背面含词义详情（义项树/释义/主题）');
  ok(B.ev('studyPos') === posB, '答错不自动跳题（等用户点下一题）');
  const qLen0 = B.ev('studyQueue.length');
  B.ev('nextQuestion()');
  ok(B.ev('studyPos') === posB + 1, '点下一题后前进');
  ok(B.ev('studyQueue.length') === qLen0 + 1, '答错的词重排到队尾再练');
  ok(B.ev('dailyFlipped') === false, '下一题后翻面状态复位');

  console.log('\n=== 3. 非今日任务模式：交互保持不变 ===');
  const C = makeCtx();
  C.ev('setStudyMode("new");answerQuestion(curQ.answer)'); // smart/new 模式答对
  html = C.els['studyBody'].innerHTML;
  ok(html.indexOf('答对了 · 已按 FSRS 拉长复习间隔') >= 0, '其他模式答对仍显示 FSRS 反馈');
  ok(html.indexOf('class="btn btn-primary qnext"') >= 0, '其他模式答对仍需手动点下一题');
  ok(A.ev('dailyAutoAdvanceTimer') === null || C.ev('dailyAutoAdvanceTimer') === null,
    '其他模式不设置今日任务自动跳题定时器');

  console.log('\n=== 4. 背面详情：精修词与覆盖词均有内容 ===');
  const D = makeCtx();
  const lexBack = D.ev('dailyCardBackHtml(LEX[0])');
  ok(lexBack.indexOf('义项树') >= 0 && lexBack.indexOf('搭配') >= 0, '精修词背面含义项树与搭配');
  const fastWord = D.ev('pgAll().filter(w=>!Store.isLexWord(w.w))[0].w');
  const fastBack = D.ev('dailyCardBackHtml({w:"'+fastWord+'",ipa:"/t/",pos:["n"],fast:true,theme:"",senses:[]})');
  ok(fastBack.length > 50 && fastBack.indexOf('覆盖层词条') >= 0, '覆盖词背面含说明文案');

  console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('测试异常：', e); process.exit(2); });
