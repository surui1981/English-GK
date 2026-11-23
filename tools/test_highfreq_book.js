/* 高考核心高频688词 · 资料页详情页验证
 * 运行：node tools/test_highfreq_book.js
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
const DATA = read('app/js/data.js');
const BUILD = read('tools/build_prototype.py');
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

console.log('\n=== 1. 数据源：688 高频词完整 ===');
ok(hf.words.length===688,'688 词数据源完整');
ok(/按真题复现考频排序|考频越高越靠前/.test(hf.meta.desc||''),'词表 meta 说明考频排序');
ok(hf.meta.freq_range && hf.meta.freq_range[1]===310,'考频区间上限 310');

console.log('\n=== 2. 数据注入：CTX_HIGHFREQ 进入前端 ===');
ok(DATA.indexOf('var CTX_HIGHFREQ =')>=0,'data.js 注入 CTX_HIGHFREQ');
ok(PROTO.indexOf('var CTX_HIGHFREQ =')>=0,'单文件原型注入 CTX_HIGHFREQ');
ok(/inject_json\('highfreq688\.json', 'CTX_HIGHFREQ'/.test(BUILD),'构建脚本注入规则已登记（重建不丢）');

console.log('\n=== 3. 资料页入口卡片 ===');
ok(HTML.indexOf('id="highfreqCard"')>=0,'资料商店新增 688 词表入口卡片');
ok(/onclick="openBook5\(\)"/.test(HTML),'入口卡片指向 openBook5');
ok(/高考核心高频 688 词/.test(HTML),'入口卡片展示词表名称');
ok(/免费试读前 20 词/.test(HTML),'入口卡片标注免费试读口径');

console.log('\n=== 4. 详情页骨架与导航注册 ===');
ok(HTML.indexOf('id="s-book5"')>=0 && HTML.indexOf('id="book5Body"')>=0,'index.html 新增 s-book5 详情页');
ok(PROTO.indexOf('id="s-book5"')>=0,'单文件原型含 s-book5 页面');
ok(APP.indexOf("'s-book5'")>=0,'SCREENS 已注册 s-book5');
ok(/'s-book5':\[/.test(APP),'META 含 s-book5 页面说明');
ok(/s-book5[^\]]*s-fullpack/.test(APP),'go() 无 tab 列表含 s-book5');
ok(APP.indexOf('function renderBook5')>=0 && APP.indexOf('function openBook5')>=0,'renderBook5 / openBook5 已定义');

console.log('\n=== 5. 未解锁：免费试读 20 词 + 购买引导 ===');
const A=makeCtx();
A.ev('Store.reset();Store.resetEnt();openBook5();');
const free=A.el('book5Body').innerHTML;
ok(/高考核心高频 688 词/.test(free),'详情页标题为 688 词表');
ok(/共 688 词/.test(free) && /考频 1–310/.test(free),'详情页展示词量与考频区间');
ok((free.match(/class="pv-word"/g)||[]).length===20,'免费态试读恰好 20 词');
ok(/personal/.test(free) && /考频 310/.test(free),'首词为 personal 且带真实考频（数据真实非占位）');
ok(/下单 ¥2\.9 · 解锁后免费下载全表/.test(free),'未解锁态展示下单引导');
ok(/当前免费试读前 20 词/.test(free),'未解锁态标注试读口径');
ok(free.indexOf('去练习高频词卡')<0,'未解锁态不出现已解锁按钮');
ok(/不含云端账号服务与分析/.test(free),'权益边界写清楚（资料包不含分析）');

console.log('\n=== 6. 已解锁（资料包）：全表试读 + 去练习 ===');
A.ev('Store.grantMaterials();refreshEntitlementUI();openBook5();');
const mat=A.el('book5Body').innerHTML;
ok(/已解锁全表 688 词/.test(mat),'资料包态显示已解锁全表');
ok(/去练习高频词卡/.test(mat) && /go\('s-trapwords'\)/.test(mat),'已解锁态提供去练习入口');
ok(mat.indexOf('购买资料包 ¥2.9 · 解锁全表')<0,'已解锁态隐藏购买按钮');
ok(/再显示 20 词/.test(mat),'已解锁态提供分页试读按钮');
ok((mat.match(/class="pv-word"/g)||[]).length===20,'已解锁初始仍为 20 词（分页渐进）');
A.ev('hfPreviewN=60;renderBook5();');
ok((A.el('book5Body').innerHTML.match(/class="pv-word"/g)||[]).length===60,'调整 hfPreviewN 后试读 60 词');

console.log('\n=== 7. 全包态同样解锁 ===');
A.ev('Store.reset();Store.grantAll();openBook5();');
ok(/已解锁全表 688 词/.test(A.el('book5Body').innerHTML),'全包态同样解锁 688 词表');

console.log('\n=== 8. 入口按钮收拢到资料包收款码 ===');
ok(/function hfBookBuy\(\)\{ openPay\('materials'\)/.test(APP),'词表下单走资料包收款码流程');

console.log('\n=== 9. 构建产物同步 ===');
ok(PROTO.indexOf('function renderBook5')>=0,'单文件原型含 renderBook5');
ok(PROTO.indexOf('highfreqCard')>=0,'单文件原型含资料页入口卡片');
ok(PROTO.indexOf('下单 ¥2.9 · 解锁后免费下载全表')>=0,'单文件原型含下单引导文案');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
process.exit(FAIL?1:0);
