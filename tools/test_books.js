/* 三本辅助材料专项回归：搭配手册数据完整、训练册与答题引擎同源、30 天计划可打卡可打印
 * 运行：node tools/test_books.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
const PROTO = read('prototype/index.html');
const script = PROTO.match(/<script>([\s\S]*?)<\/script>/)[1];
const APP = read('app/js/app.js');
const CSS = read('app/styles.css');
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
    print(){}, alert(){}, confirm(){return true;} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx)};
}

console.log('\n=== 1. 高频搭配手册：字段完整、例句来源如实标注 ===');
const col = json('data/product/colloc_book.json');
ok(col.words.length===443,'443 词（实际 '+col.words.length+'）');
ok(col.words.every(w=>w.ipa&&w.ipa.trim()),'全部词条有音标');
ok(col.words.every(w=>w.note&&w.note.trim()),'全部词条有考场判断提示');
const methods = col.meta.coverage.examples_by_method;
ok(methods['手工精修']===641 && methods['义项语境句']===1145 &&
   methods['词条语境句']===224 && methods['无例句']===292,
   '例句来源统计一致：641/1145/224/292');
ok(APP.indexOf('641 条核心搭配逐条配仿真例句')>=0 && APP.indexOf('292 条无例句如实保留')>=0,
   '前端卖点与真实数据一致，不夸大例句覆盖');
ok(APP.indexOf('w.note')>=0 && APP.indexOf('pv-src')>=0,'试读页展示词条学习提示');
ok(col.meta.pricing.tiers.length===1 && col.meta.pricing.tiers[0].price===2.9,'搭配手册数据层为单本 ¥2.9');

console.log('\n=== 2. 熟词僻义训练册：试读题即实战题 ===');
const qb = json('data/product/quiz_book.json');
const tv = json('data/product/trap_variants.json');
const featured = tv.words.filter(x=>x.featured!==false);
ok(qb.questions.length===100 && featured.length===100,'题库与变体库 featured 均为 100 题');
ok(qb.questions.every((q,i)=>q.headword===featured[i].headword &&
   q.answer_text===featured[i].answer_form &&
   q.stem_cn===featured[i].example.zh),'100 题词序、答案、语境与答题引擎同源');
ok(JSON.stringify(qb.preview)===JSON.stringify(qb.questions.slice(0,5)),'试读 5 题与正式题完全一致');
ok(qb.questions.every(q=>q.explanation&&q.sense_text&&q.options.length===4),'每题含解析、义项与四选项');
ok(qb.meta.coverage.s1_senses===1,'S1 义项数量如实标注（1 道）');
ok(APP.indexOf('试读即实战')>=0 && APP.indexOf('startQuiz()')>=0 && CSS.indexOf('.qz-why')>=0,
   '详情页同源文案、训练入口与解析样式齐备');
ok(qb.meta.pricing.tiers.length===1 && qb.meta.pricing.tiers[0].price===2.9,'训练册数据层为单本 ¥2.9');

console.log('\n=== 3. 30 天计划表：数据口径与定价 ===');
const plan = json('data/product/plan_book.json');
ok(plan.days.length===30,'30 天计划完整');
ok(plan.days.reduce((n,d)=>n+d.new_count,0)===100,'100 新词无缺漏');
ok(plan.days.every(d=>d.new_words.length===d.new_count),'每日词表与词量一致');
ok(plan.meta.status==='正式版','状态口径已从「样本卷」改为正式版');
ok(plan.meta.pricing.tiers.length===1 && plan.meta.pricing.tiers[0].price===2.9,'计划表数据层为单本 ¥2.9');
ok(['context_book.json','colloc_book.json','quiz_book.json','plan_book.json'].every(f=>{
  const t=json('data/product/'+f).meta.pricing.tiers;
  return t.length===1 && t[0].price===2.9;
}),'四本读本数据层定价均为 ¥2.9，与前端两档收费一致');

console.log('\n=== 4. 打卡状态：持久化、撤销、云同步往返 ===');
const E = makeCtx();
E.ev('Store.reset();Store.resetEnt();');
ok(E.ev('Store.planCheckCount()')===0,'初始打卡为 0 天');
E.ev('togglePlanCheck(1);');
ok(E.ev('Store.planCheckDone(1)')===true && E.ev('Store.planCheckCount()')===1,'第 1 天打卡写入成功');
let h=E.ev('document.getElementById("book4Body").innerHTML');
ok(/已打卡 1 \/ 30 天/.test(h),'页面进度显示 1/30');
ok(/pl-cell checked/.test(h),'已打卡格子显示完成态');
E.ev('togglePlanCheck(1);');
ok(E.ev('Store.planCheckCount()')===0,'再次点击可撤销误勾');
E.ev('togglePlanCheck(2);togglePlanCheck(3);');
const snap=E.ev('Store.snapshot()');
E.ev('Store.reset();Store.hydrate('+JSON.stringify(snap.state)+','+JSON.stringify(snap.entitlements)+')');
ok(E.ev('Store.planCheckCount()')===2 && E.ev('Store.planCheckDone(3)')===true,'云同步快照往返后打卡不丢');

console.log('\n=== 5. 计划表交互：展开词表、打印入口、构建产物 ===');
E.ev('togglePlanDay(1);');
h=E.ev('document.getElementById("book4Body").innerHTML');
ok(/class="pl-detail"/.test(h),'点击 D1 展开当天详情');
ok(/case/.test(h) && /新词 15/.test(h),'展开后显示当天 15 个新词');
ok(/togglePlanDay\(1\)/.test(h) && /togglePlanCheck\(1\)/.test(h),'日期展开与打卡按钮并存');
ok(/printPlan\(\)/.test(h),'页面提供打印入口');
ok(/@media print/.test(CSS) && /size:A4 portrait/.test(CSS),'A4 打印样式已落地');
ok(PROTO.indexOf('togglePlanCheck')>=0 && PROTO.indexOf('已打卡')>=0 && PROTO.indexOf('@media print')>=0,
   '单文件原型已同步打卡与打印功能');
ok(PROTO.indexOf('"status": "正式版"')>=0,'单文件原型同步正式版口径');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
