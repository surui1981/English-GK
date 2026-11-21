/* 单词进度页 A-Z 字母索引专项验证：统计 / 筛选 / 短语归类 / 已学进度 */
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
  return { ctx, els, ev: e => vm.runInContext(e, ctx) };
}

(async function main(){
  console.log('\n=== 1. 字母统计合计与覆盖 ===');
  const A = makeCtx();
  const st = A.ev('pgLetterStats()');
  const total = Object.keys(st).reduce((a, c) => a + st[c].total, 0);
  ok(total === 4110, '字母统计合计 = 全量 4110（实际 ' + total + '）');
  ok(Object.keys(st).length === 26, 'A-Z 共 26 个字母格');
  const withWords = Object.keys(st).filter(c => st[c].total > 0);
  ok(withWords.length === 25 && st.x.total === 0, '25 个字母有词，X 为空格（' + withWords.length + '）');
  ok(st.a.total === 335 && st.s.total === 449, 'A=335 / S=449 词量与词库一致');

  console.log('\n=== 2. 短语词条首字母清洗 ===');
  ok(A.ev('pgFirstLetter("(be) bound to")') === 'b', '(be) bound to → b');
  ok(A.ev('pgFirstLetter("(get/be)used to")') === 'g', '(get/be)used to → g');
  ok(A.ev('pgFirstLetter("abandon")') === 'a', '普通词 abandon → a');
  ok(A.ev('pgFirstLetter("")') === '', '空词返回空');

  console.log('\n=== 3. 点选字母筛选 ===');
  A.ev('pgSetLetter("a")');
  ok(A.ev('pgList().length') === 335, '选 A 后列表 335 词（实际 ' + A.ev('pgList().length') + '）');
  ok(A.ev('pgList().every(x=>pgFirstLetter(x.w.w)==="a")') === true, '列表全部为 A 开头');
  A.ev('pgSetLetter("a")');
  ok(A.ev('pgList().length') === 4110, '再点 A 取消筛选，恢复全量');

  console.log('\n=== 4. 渲染与已学进度反射 ===');
  A.ev('renderProgress()');
  let html = A.els['progressBody'].innerHTML;
  ok(html.indexOf('pg-alpha') >= 0, '进度页含 A-Z 索引面板');
  ok((html.match(/pg-alpha-c/g) || []).length === 26, '渲染 26 个字母格');
  ok(html.indexOf('A') >= 0 && html.indexOf('按字母学习') >= 0, '含面板标题与字母标签');
  // 学 3 个 A 开头的词 → A 格已学数应为 3（用统一入口 practiceVariant，兼容精修词与非精修词）
  const aWords = A.ev('pgAll().filter(w=>pgFirstLetter(w.w)==="a").slice(0,3).map(w=>w.w)');
  aWords.forEach(w => A.ev('Store.practiceVariant("' + w + '",3)'));
  A.ev('renderProgress()');
  html = A.els['progressBody'].innerHTML;
  ok(A.ev('pgLetterStats().a.learned') === 3, '学 3 个 A 词后 A 格已学数 = 3');
  ok(html.indexOf('已学 3') >= 0, '面板提示实时反映已学数');

  console.log('\n=== 5. 字母筛选与红绿筛选叠加 ===');
  A.ev('pgSetLetter("a");pgSetFilter("green")');
  ok(A.ev('pgList().length') === 3, 'A + 已学绿词 = 3（实际 ' + A.ev('pgList().length') + '）');
  A.ev('pgSetFilter("red")');
  ok(A.ev('pgList().length') === 332, 'A + 未学红词 = 332（实际 ' + A.ev('pgList().length') + '）');

  console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('测试异常：', e); process.exit(2); });
