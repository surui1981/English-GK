/* 文章化背词验证：选词 / 提示词 / JSON 解析校验 / 在线流式生成 / 本地降级 /
 * 页面状态机 / 三档自评回流 FSRS / 入口与构建产物
 * 运行：node tools/test_article_study.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PROTO = read('prototype/index.html');
const script = PROTO.match(/<script>([\s\S]*?)<\/script>/)[1];
const INDEX = read('app/index.html');
const CSS = read('app/styles.css');
const APP = read('app/js/app.js');
const AJS = read('app/js/article.js');
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
  const ctx={ console, document, localStorage, Symbol, URL:global.URL,
    location:{href:'https://x.com/',origin:'https://x.com',assign(){}}, history:{replaceState(){}},
    setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
    Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,Promise,parseInt,parseFloat,isFinite,
    alert(){},confirm(){return true;},print(){} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx),el:id=>document.getElementById(id),store};
}
function sampleJson(words){
  return {
    title:'A Small Decision', theme:'校园生活',
    paragraphs:words.map((w,i)=>[
      'Last term our class had to ____ a serious problem before the final exam.',
      'The teacher asked us to ____ the risk before we made a decision.',
      'With interest rates rising, many families ____ less than they used to.',
      'Every student should ____ the rule before signing the form.'
    ][i]),
    translation:'上学期我们班不得不在期末考试前解决一个严重的问题。',
    blanks:words.map((w,i)=>({
      no:i+1, answer:w, sense_id:'', meaning:'处理、解决',
      options:[w,'access','assess','accuse'], reason:'固定搭配题。'
    }))
  };
}
function installFakeLLM(T, json, calls){
  T.ctx.fakeArticle = json;
  T.ctx.fakeCalls = calls;
  T.ctx.fakeClient = {
    llm:{
      models:{ list:function(){ return Promise.resolve([{id:'test-model',disabled:false}]); } },
      chat:{ completions:{ create:function(opts){
        calls.push(opts);
        return Promise.resolve([{choices:[{delta:{content:JSON.stringify(json)}}]}]);
      }}}
    }
  };
  T.ev('CloudStore.getClient = function(){ return fakeClient; }');
}

(async function(){
  console.log('\n=== 1. 模块、页面与入口 ===');
  const A=makeCtx();
  A.ev('Store.reset();');
  ok(A.ev('typeof Article')==='object','Article 引擎已注册');
  ['open','start','pickWords','buildPrompt','parseArticle','localFallback','generate','pick','rate','next','nextArticle']
    .forEach(k=>ok(A.ev('typeof Article.'+k)==='function','Article.'+k+' 可用'));
  ok(A.ev("SCREENS.indexOf('s-article')")>=0,'SCREENS 注册 s-article');
  ok(A.ev("!!META['s-article']")===true,'META 含 s-article 页面说明');
  ok(A.ev("typeof go==='function'")===true,'go() 导航可用');
  ok(INDEX.indexOf('id="s-article"')>=0,'app/index.html 含文章化背词页面');
  ok(INDEX.indexOf('js/article.js')>=0,'页面引用 article.js');
  ok(INDEX.indexOf('Article.open()')>=0,'首页 / 背词页含文章化背词入口');
  ok(AJS.indexOf("get role: 'system'")<0 && AJS.indexOf("role: 'system'")>=0,'LLM 调用带应用自管 system 消息');
  ok(AJS.indexOf('stream: true')>=0,'LLM 调用强制 stream: true');
  ok(CSS.indexOf('.ar-card')>=0 && CSS.indexOf('.ar-rate')>=0,'文章页样式已补齐');
  ok(PROTO.indexOf('var Article =')>=0,'单文件原型内联 Article 引擎');
  ok(PROTO.indexOf('id="s-article"')>=0,'单文件原型含文章页');
  ok(APP.indexOf("'s-article'")>=0,'app.js 导航逻辑识别文章页');

  console.log('\n=== 2. 选词来自真实记忆状态 ===');
  const B=makeCtx();
  B.ev('Store.reset();');
  let def=B.ev('Article.pickWords(4)');
  ok(Array.isArray(def)&&def.length===4,'新用户兜底取 4 个精修词');
  ok(B.ev("Article.pickWords(4).every(function(w){return typeof w==='string'&&w.length>1;})")===true,'兜底词均为合法词形');
  const sid=B.ev('LEX[0].senses[0].sense_id'), hw=B.ev('LEX[0].w');
  B.ev("Store.reviewSense('"+sid+"',1,'"+hw+"')");
  let picked=B.ev('Article.pickWords(4)');
  ok(picked.indexOf(hw)>=0,'答错过的到期词优先进入下一篇');
  const sid2=B.ev('LEX[1].senses[0].sense_id'), hw2=B.ev('LEX[1].w');
  B.ev("Store.reviewSense('"+sid2+"',3,'"+hw2+"')");
  B.ev("(function(){var st=Store.load();st.cards['"+sid2+"'].lapses=9;st.cards['"+sid2+"'].due=Date.now()-86400000;Store.save();})()");
  picked=B.ev('Article.pickWords(4)');
  ok(picked.indexOf(hw2)>=0,'高危词（多次遗忘）优先进入选词');
  ok(B.ev("Article.pickWords(4).length")===4,'选词数量固定为 4');

  console.log('\n=== 3. 提示词与隐私边界 ===');
  const C=makeCtx();
  C.ev('Store.reset();');
  const cw=C.ev('Article.pickWords(3)');
  C.ctx.cw=cw;
  let prompt=C.ev('Article.buildPrompt(cw)');
  ok(prompt.indexOf('Target words')>=0,'提示词声明目标词');
  ok(cw.every(w=>prompt.indexOf(w)>=0),'提示词包含全部目标词');
  ok(prompt.indexOf('strict JSON')>=0,'提示词要求严格 JSON');
  ok(AJS.indexOf('EXACTLY ONCE')>=0,'system 约束目标词只出现一次');
  ok(prompt.indexOf('13353263911')<0,'提示词不携带用户手机号');
  ok(prompt.indexOf('simulated')>=0 || AJS.indexOf('ORIGINAL simulated')>=0,'system 明确自研仿真边界');

  console.log('\n=== 4. JSON 解析与硬校验 ===');
  const D=makeCtx();
  D.ev('Store.reset();');
  const dw=D.ev("['address','access','interest']");
  D.ctx.dw=dw;
  const good=sampleJson(dw);
  D.ctx.good=good;
  let parsed=D.ev('Article.parseArticle(JSON.stringify(good),dw)');
  ok(!!parsed&&parsed.source==='ai','合法 AI 结果解析成功');
  ok(parsed&&parsed.blanks.length===3,'挖空题数量正确');
  ok(parsed&&parsed.blanks.every(b=>b.options.length===4),'每题四个选项');
  ok(parsed&&parsed.paragraphs.join(' ').match(/_{3,}/g).length>=3,'短文含足够占位符');
  D.ctx.wrapped='```json\n'+JSON.stringify(good)+'\n```';
  ok(!!D.ev("Article.parseArticle(wrapped,dw)"),'可剥离 Markdown 代码块');
  let bad=JSON.parse(JSON.stringify(good)); bad.blanks=[bad.blanks[0],bad.blanks[1]];
  D.ctx.bad=bad;
  ok(D.ev('Article.parseArticle(JSON.stringify(bad),dw)')===null,'挖空少于 3 题时整篇拒绝');
  bad=JSON.parse(JSON.stringify(good)); bad.paragraphs=['No blanks here at all.'];
  D.ctx.bad=bad;
  ok(D.ev('Article.parseArticle(JSON.stringify(bad),dw)')===null,'占位符不足时整篇拒绝');
  bad=JSON.parse(JSON.stringify(good)); bad.blanks[0].options=['address','access'];
  D.ctx.bad=bad;
  ok(D.ev('Article.parseArticle(JSON.stringify(bad),dw)')===null,'选项不足 4 个时整篇拒绝');
  bad=JSON.parse(JSON.stringify(good)); bad.blanks[0].options=['access','assess','accuse','approve'];
  D.ctx.bad=bad;
  ok(D.ev('Article.parseArticle(JSON.stringify(bad),dw)')===null,'答案不在选项时整篇拒绝');
  bad=JSON.parse(JSON.stringify(good)); bad.blanks[0].answer='somewhere';
  D.ctx.bad=bad;
  ok(D.ev('Article.parseArticle(JSON.stringify(bad),dw)')===null,'答案不属于目标词时整篇拒绝');
  bad=JSON.parse(JSON.stringify(good)); bad.blanks[0].sense_id='s_not_exist';
  D.ctx.bad=bad;
  let fixed=D.ev('Article.parseArticle(JSON.stringify(bad),dw)');
  ok(!!fixed&&fixed.blanks[0].light===true&&fixed.blanks[0].sense_id==='','无效 sense_id 降级为轻量词');
  bad=JSON.parse(JSON.stringify(good)); bad.blanks[0].sense_id=D.ev('LEX[0].senses[0].sense_id');
  D.ctx.bad=bad;
  fixed=D.ev('Article.parseArticle(JSON.stringify(bad),dw)');
  ok(!!fixed&&fixed.blanks[0].light===false,'有效 sense_id 保留义项绑定');

  console.log('\n=== 5. 本地离线语境包 ===');
  const E=makeCtx();
  E.ev('Store.reset();');
  const ew=E.ev("['address','access']");
  E.ctx.ew=ew;
  let off=E.ev('Article.localFallback(ew)');
  ok(off&&off.source==='offline','离线包标记来源，不冒充 AI 生成');
  ok(off&&off.paragraphs.length===2,'每个目标词生成一段语境');
  ok(off&&off.blanks.every(b=>b.options.length===4),'离线包每题四个选项');
  ok(off&&off.blanks.every(b=>b.options.indexOf(b.answer)>=0),'离线包答案在选项内');
  ok(off&&off.blanks.every(b=>!!b.meaning&&!!b.reason),'离线包带义项与解析');
  ok(off&&off.paragraphs.some(p=>/_{3,}/.test(p)),'离线包例句已挖空');
  ok(off&&off.blanks.every(b=>b.options.filter((x,i,a)=>a.indexOf(x)===i).length===4),'离线包选项无重复');
  const known=E.ev("['address']"); E.ctx.known=known;
  let off1=E.ev('Article.localFallback(known)');
  ok(off1&&off1.blanks[0].sense_id!=='','词库例句能绑定真实 sense_id');

  console.log('\n=== 6. 在线生成、流式收集与缓存 ===');
  const F=makeCtx();
  F.ev('Store.reset();');
  const fw=F.ev("['address','access','interest']");
  const calls=[];
  installFakeLLM(F,sampleJson(fw),calls);
  F.ctx.fw=fw;
  let gen=await F.ev('Article.generate(fw,true)');
  ok(!!gen&&gen.source==='ai','假模型流式返回解析成功');
  ok(calls.length===1,'调用了一次 chat.completions.create');
  ok(calls[0].stream===true,'调用参数包含 stream: true');
  ok(calls[0].messages[0].role==='system'&&calls[0].model==='test-model','system 消息与模型 ID 正确');
  ok(typeof calls[0].messages[1].content==='string','用户提示词已发送');
  let gen2=await F.ev('Article.generate(fw,false)');
  ok(!!gen2&&calls.length===1,'同组词当天命中缓存，不重复扣配额');
  const G=makeCtx();
  G.ev('Store.reset(); CloudStore.getClient=function(){return null;};');
  ok(await G.ev("Article.generate(['address'],true)")===null,'无云客户端时返回 null 交给降级');
  G.ctx.fakeClient={llm:{models:{list:function(){return Promise.resolve([]);}}}};
  G.ev('CloudStore.getClient=function(){return fakeClient;};');
  ok(await G.ev("Article.generate(['address'],true)")===null,'无可用模型时返回 null');

  console.log('\n=== 7. 完整学习状态机与 FSRS 回流 ===');
  const H=makeCtx();
  H.ev('Store.reset();');
  const hw3=H.ev('Article.pickWords(4)');
  const calls3=[];
  installFakeLLM(H,sampleJson(hw3),calls3);
  H.ctx.hw3=hw3;
  const before=H.ev('JSON.stringify(Store.load().cards)');
  await H.ev('Article.start(true)');
  ok(H.ev("Article.state().stage")==='reading','生成完成后进入通读态');
  ok(H.ev("Article.state().article.source")==='ai','在线生成成功时使用 AI 文章');
  ok(H.el('arBody').innerHTML.indexOf('读完了')>=0,'通读页含进入填词的按钮');
  H.ev('Article.toAnswer()');
  ok(H.ev("Article.state().stage")==='answer','进入语境填词态');
  ok(H.el('arBody').innerHTML.indexOf('ar-opt')>=0,'填词页渲染选项');
  H.ev('Article.pick(0)');
  ok(H.ev('Article.state().picked[0]')===0,'选项已记录');
  ok(H.el('arBody').innerHTML.indexOf('ar-rate')>=0,'选择后出现三档自评');
  const sidH=H.ev("LEX.filter(function(x){return x.w==='address';})[0].senses[0].sense_id");
  H.ev("Article.state().article.blanks[0].sense_id='"+sidH+"'");
  H.ev('Article.rate(3)');
  ok(H.ev('Article.state().rated[0]')===3,'三档自评已记录');
  ok(H.ev("!!Store.load().cards['"+sidH+"']")===true,'自评写回义项 FSRS 卡片');
  ok(H.ev('JSON.stringify(Store.load().cards)')!==before,'记忆状态确实发生变化');
  const blankN=H.ev('Article.state().article.blanks.length');
  ok(blankN>=3&&blankN<=5,'篇长符合 3–5 空约束');
  H.ev('Article.next()');
  ok(H.ev('Article.state().idx')===1,'进入下一个空');
  for(let i=1;i<blankN;i++) H.ev('Article.next()');
  ok(H.ev("Article.state().stage")==='result','全部作答后进入结果页');
  ok(H.el('arBody').innerHTML.indexOf('空选对')>=0,'结果页展示正确率');
  ok(H.el('arBody').innerHTML.indexOf('下一篇')>=0,'结果页含下一篇推荐入口');

  console.log('\n=== 8. 断网降级端到端 ===');
  const I=makeCtx();
  I.ev('Store.reset(); CloudStore.getClient=function(){return null;};');
  await I.ev('Article.start(false)');
  ok(I.ev("Article.state().stage")==='reading','断网时仍进入通读态');
  ok(I.ev("Article.state().article.source")==='offline','断网时使用离线语境包');
  ok(I.el('arBody').innerHTML.indexOf('离线语境包')>=0,'页面明确标注离线包来源');
  I.ev('Article.toAnswer(); Article.pick(0); Article.rate(1);');
  ok(I.ev('Article.state().rated[0]')===1,'离线包同样可完成三档自评');

  console.log('\n=== 9. 构建与文案一致性 ===');
  ok(AJS.indexOf('不新增记忆系统')>=0,'引擎声明复用现有记忆系统');
  ok(INDEX.indexOf('到期词自动成文')>=0,'入口文案说明核心玩法');
  ok(read('docs/文章化背词功能方案.md').indexOf('运行时接大模型生成')>=0,'方案文档记录用户确认的生成方式');
  ok(APP.indexOf("['s-study','s-article'")>=0,'文章页与背词页同属无底栏学习区');

  console.log('\n结果：'+PASS+' 通过 / '+FAIL+' 失败');
  process.exitCode=FAIL?1:0;
})().catch(e=>{ console.error(e); process.exitCode=1; });
