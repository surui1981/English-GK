/* 熟词僻义专项分层验证：首页 100 词口径、免费 100 / 全包 443、题源同源
 * 运行：node tools/test_trap_access.js
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
const tv = JSON.parse(read('data/product/trap_variants.json'));
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

console.log('\n=== 1. 首页专项：100 词真实口径 ===');
ok(/100 个高频陷阱词/.test(HTML),'首页卡片静态文案已改为 100 词');
ok(HTML.indexOf('12 道高频陷阱题')<0,'旧的「12 道」错误口径已移除');
ok(/onclick="event.stopPropagation\(\);openTrapWords\(\)"/.test(HTML),'首页提供独立的陷阱词表入口');
const A=makeCtx();
A.ev('Store.reset();Store.resetEnt();syncStats();');
ok(/100 个高频陷阱词/.test(A.el('homeQuizLine').textContent),'未答题时动态文案显示 100 词');
A.ev('Store.quizAnswer(true,"熟词僻义","C1","case","E1");syncStats();');
ok(/100 个高频陷阱词 · 你的正确率/.test(A.el('homeQuizLine').textContent),'有作答后仍保持 100 词口径');

console.log('\n=== 2. 题库与词库数据边界 ===');
ok(tv.meta.coverage.featured_words===100 && tv.meta.coverage.total_words===443,'变体库含 100 精修词 + 343 扩展词');
ok(A.ev('QUIZ.length')===100,'答题引擎题库为 100 题');
ok(A.ev('QUIZ.every(q=>!!q.headword&&q.opts.length>=2)'),'100 题均含词与选项');
ok(A.ev('trapCtx().words.length')===443,'前端数据源保留全量 443 词');

console.log('\n=== 3. 免费态：只展示 100 精修陷阱词 ===');
ok(A.ev('trapVisible().length')===100,'免费可见词表为 100 词');
ok(A.ev('trapWordStats().total')===100,'熟练度统计口径同步为 100');
A.ev('renderTrapWords();');
let h=A.el('trapWordsBody').innerHTML;
ok(/免费 100 个精修陷阱词/.test(h),'词表顶部明示免费 100 词');
ok(/全部 443 个高频词汇陷阱/.test(h) && /3370 条变体提示/.test(h),'升级说明写明全量规模');
ok(/解锁全量 ¥9\.9/.test(h) && /openPay\('all'\)/.test(h),'提供全包解锁入口');
ok(A.el('trapCountLabel').textContent==='100 词','页面标题计数为 100 词');
ok(h.indexOf('accumulate')<0,'扩展词 accumulate 不出现在免费词表');
ok(h.indexOf('case')>=0,'精修词 case 出现在免费词表');
A.ev('twQuery="accumulate";twShown=40;renderTrapWords();');
let filtered=A.el('trapWordsBody').innerHTML;
ok(/当前筛选下没有词/.test(filtered),'免费态搜扩展词也查不到，不泄漏付费内容');
A.ev('twQuery="";twFilter="all";renderTrapWords();');

console.log('\n=== 4. 购买后：开放全量 443 高频词汇陷阱 ===');
A.ev('Store.grantAll();renderTrapWords();');
h=A.el('trapWordsBody').innerHTML;
ok(A.ev('trapVisible().length')===443,'购买全包后可见 443 词');
ok(A.ev('trapWordStats().total')===443,'统计口径切换为 443');
ok(/全量 443 个高频词汇陷阱已解锁/.test(h) && /3370 条变体提示/.test(h),'顶部显示已解锁全量');
ok(!/解锁全量 ¥9\.9/.test(h),'已解锁后不再出现付费引导');
ok(A.el('trapCountLabel').textContent==='443 词 · 全量','标题标注全量');
A.ev('twQuery="accumulate";renderTrapWords();');
ok(!/当前筛选下没有词/.test(A.el('trapWordsBody').innerHTML),'购买后可搜到扩展词 accumulate');
ok(APP.indexOf("renderTrapWords(); // 词表从 100 免费词切到全量 443 词")>=0,'购买成功后立即刷新词表权益');

console.log('\n=== 5. 构建产物同步 ===');
ok(PROTO.indexOf('100 个高频陷阱词')>=0 && PROTO.indexOf('12 道高频陷阱题')<0,'单文件原型同步首页 100 词口径');
ok(PROTO.indexOf('trapVisible')>=0 && PROTO.indexOf('tw-upsell')>=0 &&
   PROTO.indexOf('购买全包后开放全部')>=0,'单文件原型包含分层逻辑与升级卡');
ok(PROTO.indexOf('class="hero-alt"')>=0,'单文件原型含词表独立入口');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
