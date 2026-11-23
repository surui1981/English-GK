/* 下单后免费下载 · 电子资料下载入口验证
 * 运行：node tools/test_downloads.js
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
const DL = path.join(ROOT, 'app', 'assets', 'downloads');
let PASS = 0, FAIL = 0;
function ok(cond, msg){ if(cond){PASS++;console.log('  PASS  '+msg);}else{FAIL++;console.log('  FAIL  '+msg);} }

function mk(id){
  return {
    id, _html:'', _text:'', dataset:{}, style:{setProperty(){}},
    classList:{ _s:{}, toggle(c,v){this._s[c]=!!v;}, add(c){this._s[c]=true;}, remove(c){this._s[c]=false;}, contains(c){return !!this._s[c];} },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);},
    get textContent(){return this._text;}, set textContent(v){this._text=String(v);},
    addEventListener(){}, appendChild(){}, removeChild(){}, querySelector(){return null;},
    querySelectorAll(){return [];}, scrollTop:0, focus(){}, click(){}, setAttribute(){}
  };
}
function makeCtx(){
  const els={}, store={};
  const localStorage={ getItem(k){return k in store?store[k]:null;}, setItem(k,v){store[k]=String(v);}, removeItem(k){delete store[k];} };
  const document={
    getElementById(id){return els[id]||(els[id]=mk(id));},
    querySelector(){return mk('q');}, querySelectorAll(){return [];},
    createElement(){return mk('a');}, addEventListener(){},
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

console.log('\n=== 1. 下载文件真实存在且为自研内容 ===');
const files=[
  ['高考英语核心词-仿真语境版.html', /仿真语境版/],
  ['高考英语高频搭配速记手册.html', /高频搭配/],
  ['熟词僻义100题专项训练册.html', /熟词僻义/],
  ['30天冲刺计划表.html', /30 天冲刺/],
  ['高考核心高频688词表.html', /688 词/]
];
files.forEach(([f,re])=>{
  ok(fs.existsSync(path.join(DL,f)),'下载文件存在：'+f);
  if(fs.existsSync(path.join(DL,f))){
    const c=read('app/assets/downloads/'+f);
    ok(c.indexOf('<html')>=0 && re.test(c),'文件内容为可打印 HTML：'+f);
    ok(!/真题原文|真题选项/.test(c.replace(/不含真题原文/g,'')) || /不含真题/.test(c),'合规声明在位：'+f);
  }
});
ok(fs.existsSync(path.join(DL,'熟词僻义100题专项训练册.pdf')),'训练册 PDF 也在下载目录');

console.log('\n=== 2. 下载清单映射 ===');
const A=makeCtx();
const mf=A.ev('MATERIAL_FILES');
ok(Object.keys(mf).length===5,'5 项资料登记在下载清单');
ok(['context','colloc','quiz','plan','highfreq'].every(k=>mf[k]&&mf[k].name),'四本书 + 688 词表均在清单');
ok(mf.quiz.name.endsWith('.pdf') && mf.quiz.alt.endsWith('.html'),'训练册含 PDF 与 HTML 兜底');

console.log('\n=== 3. 门禁：未下单不能下载，下单后可下载 ===');
A.ev('Store.reset();Store.resetEnt();refreshEntitlementUI();');
ok(A.ev('canDownload()')===false,'未下单时不可下载');
A.ev('Store.grantMaterials();refreshEntitlementUI();');
ok(A.ev('canDownload()')===true,'资料包下单后可下载');
A.ev('Store.reset();Store.resetEnt();Store.grantAll();');
ok(A.ev('canDownload()')===true,'全包下单后可下载');

console.log('\n=== 4. 详情页解锁按钮为真实下载入口 ===');
const btn=A.ev("materialDownloadBtn('context')");
ok(/downloadMaterial\('context'\)/.test(btn),'下载按钮调用 downloadMaterial');
ok(!/disabled/.test(btn),'下载按钮不是灰色禁用态');
ok(/免费下载资料/.test(btn),'按钮文案为免费下载');
A.ev('openBook();');
ok(/materialDownloadBtn|免费下载资料/.test(A.el('bookBody').innerHTML),'仿真语境版详情页含下载按钮（全包态）');

console.log('\n=== 5. 文案口径：下单后免费下载 ===');
ok(HTML.indexOf('下单后立即免费下载')>=0,'资料页标注下单后立即免费下载');
ok(HTML.indexOf('下单后 3 分钟内可下载')<0,'旧的「3 分钟内」文案已移除');
ok(HTML.indexOf('id="openDownloads"')<0 || HTML.indexOf('openDownloads()')>=0,'我的页含资料下载入口');
ok(HTML.indexOf('downloadHint')>=0,'我的页下载入口有动态提示');
ok(APP.indexOf('下单后免费下载')>=0 || APP.indexOf('下单后免费')>=0,'前端含下单后免费下载口径');

console.log('\n=== 6. 下单成功态提供立即下载 ===');
ok(/openDownloads\(\)/.test(APP),'下单成功提供 openDownloads 入口');
ok(/立即免费下载资料/.test(APP),'成功态含立即免费下载按钮');
ok(APP.indexOf('function openDownloads')>=0,'资料下载中心函数已定义');
ok(/一键下载全部资料/.test(APP),'下载中心含一键下载');

console.log('\n=== 7. 构建产物同步 ===');
ok(PROTO.indexOf('function downloadMaterial')>=0,'单文件原型含下载函数');
ok(PROTO.indexOf('function openDownloads')>=0,'单文件原型含下载中心');
ok(PROTO.indexOf('MATERIAL_FILES')>=0,'单文件原型含下载清单');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
process.exit(FAIL?1:0);
