/* 熟词僻义专项分层验证：首页 100 词口径、三层门禁（免费100 / 资料包664 / 全包1007）、题源同源
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
const hf = JSON.parse(read('data/product/highfreq688.json'));
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

console.log('\n=== 2. 数据源：688 词表 + 三层词库 ===');
ok(hf.words.length===688,'688 词数据源完整');
ok(hf.meta.freq_range[1]===310 && hf.meta.freq_range[0]===1,'考频范围 1–310');
ok(hf.words.every((w,i)=>w.no===i+1 && w.headword && w.cn_raw),'688 词字段齐全且序号连续');
ok(tv.meta.coverage.total_words===1007,'变体库含 1007 词');
ok(tv.meta.coverage.featured_words===100 && tv.meta.coverage.highfreq_words===564 &&
   tv.meta.coverage.extended_words===343,'三层数量 100 / 564 / 343 正确');
ok(tv.meta.coverage.variants_per_word_min>=6,'每词至少 6 条变体');
ok(A.ev('QUIZ.length')===100,'答题引擎题库仍为 100 题（精修题不变）');
ok(A.ev('trapCtx().words.length')===1007,'前端数据源为全量 1007 词');
ok(A.ev("trapCtx().words.filter(x=>x.layer==='L3-高频688'&&x.access==='materials').length")===564,
   'L3 高频词均标记 access=materials');

console.log('\n=== 3. 免费态：只展示 100 精修陷阱词 ===');
A.ev('Store.reset();Store.resetEnt();renderTrapWords();');
ok(A.ev('trapVisible().length')===100,'免费可见词表为 100 词');
ok(A.ev('trapWordStats().total')===100,'熟练度统计口径同步为 100');
let h=A.el('trapWordsBody').innerHTML;
ok(/免费 100 个精修陷阱词/.test(h),'词表顶部明示免费 100 词');
ok(/解锁全部 564 个高频688词/.test(h),'升级说明写明资料包含 688 高频词');
ok(/资料包 ¥2\.9/.test(h) && /全包 ¥9\.9/.test(h),'免费态同时提供两档升级入口');
ok(A.el('trapCountLabel').textContent==='100 词','页面标题计数为 100 词');
ok(h.indexOf('personal')<0,'扩展词 personal 不出现在免费词表');
ok(h.indexOf('case')>=0,'精修词 case 出现在免费词表');
A.ev('twQuery="personal";twShown=40;renderTrapWords();');
ok(/当前筛选下没有词/.test(A.el('trapWordsBody').innerHTML),'免费态搜高频词也查不到，不泄漏付费内容');
A.ev('twQuery="";twFilter="all";renderTrapWords();');

console.log('\n=== 4. ¥2.9 资料包态：100 + 564 = 664 词 ===');
A.ev('Store.grantMaterials();renderTrapWords();');
h=A.el('trapWordsBody').innerHTML;
ok(A.ev('trapVisible().length')===664,'资料包可见 664 词');
ok(A.ev('trapWordStats().total')===664,'统计口径切换为 664');
ok(/资料包已生效/.test(h) && /含 688 词表新增词/.test(h),'资料包态显示生效横幅');
ok(/升级全包/.test(h) && /openPay\('all'\)/.test(h),'资料包态引导升级全包');
ok(A.el('trapCountLabel').textContent==='664 词','标题计数为 664 词');
A.ev('twQuery="personal";renderTrapWords();');
ok(!/当前筛选下没有词/.test(A.el('trapWordsBody').innerHTML),'资料包态可搜到高频词 personal');
ok(A.ev("trapCtx().words.filter(x=>x.layer==='L2-必考核心').every(w=>trapVisible().indexOf(w)<0)"),
   '资料包态仍看不到 L2 必考核心词（归全包）');
A.ev('twQuery="";renderTrapWords();');

console.log('\n=== 5. ¥9.9 全包态：开放全量 1007 词 ===');
A.ev('Store.grantAll();renderTrapWords();');
h=A.el('trapWordsBody').innerHTML;
ok(A.ev('trapVisible().length')===1007,'全包可见 1007 词');
ok(A.ev('trapWordStats().total')===1007,'统计口径切换为 1007');
ok(/全量 1007 个高频词汇陷阱已解锁/.test(h),'顶部显示已解锁全量');
ok(!/资料包 ¥2\.9/.test(h) && !/升级全包/.test(h),'全包态不再出现付费引导');
ok(A.el('trapCountLabel').textContent==='1007 词 · 全量','标题标注全量');
ok(APP.indexOf("renderTrapWords(); // 词表按资料包/全包权益切换 100→664→1007 词")>=0,'购买成功后立即刷新词表权益');

console.log('\n=== 6. 构建产物同步 ===');
ok(PROTO.indexOf('100 个高频陷阱词')>=0 && PROTO.indexOf('12 道高频陷阱题')<0,'单文件原型同步首页 100 词口径');
ok(PROTO.indexOf('trapVisible')>=0 && PROTO.indexOf("access==='materials'")>=0,
   '单文件原型包含三层门禁逻辑');
ok(PROTO.indexOf('高频688词')>=0 && PROTO.indexOf('hf688_')>=0,'单文件原型注入 688 高频词数据');
ok(PROTO.indexOf('class="hero-alt"')>=0,'单文件原型含词表独立入口');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
