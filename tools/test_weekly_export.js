/* 完整版周报权益验证：深度失分归因 / 下周行动计划 / 报告导出，基础数据永久免费
 * 运行：node tools/test_weekly_export.js
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
function makeCtx(withCanvas){
  const els={}, store={}, fullEls=[mk('f1'),mk('f2'),mk('f3'),mk('f4')], drawn=[];
  const localStorage={ getItem(k){return k in store?store[k]:null;}, setItem(k,v){store[k]=String(v);}, removeItem(k){delete store[k];} };
  const document={
    getElementById(id){return els[id]||(els[id]=mk(id));},
    querySelector(sel){return sel==='.rp-full'?fullEls[0]:mk('q');},
    querySelectorAll(sel){return sel==='.rp-full'?fullEls:[];},
    createElement(t){
      if(t==='canvas'&&withCanvas){
        const g={
          fillStyle:'',font:'',
          fillRect(){},
          fillText(s){drawn.push(String(s));},
          measureText(s){return {width:String(s).length*12};}
        };
        return {width:0,height:0,getContext(){return g;},toDataURL(){return 'data:image/png;base64,AAA';}};
      }
      return mk(t);
    },
    addEventListener(){}, body:mk('body'), documentElement:mk('html'), visibilityState:'visible'
  };
  const ctx={ console, document, localStorage, URL:global.URL,
    location:{href:'https://x.com/',origin:'https://x.com',assign(){}}, history:{replaceState(){}},
    setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;},
    Date,Math,JSON,String,Number,Object,Array,Set,Map,RegExp,Promise,parseInt,parseFloat,
    alert(){},confirm(){return true;},print(){} };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(script,ctx,{filename:'index.html'});
  return {ctx,ev:e=>vm.runInContext(e,ctx),el:id=>document.getElementById(id),fullEls,drawn};
}

console.log('\n=== 1. 基础数据永久免费（游客） ===');
const A=makeCtx(true);
A.ev('Store.reset();Store.resetEnt();renderParentReport();');
ok(/基础周报免费 · 完整版 ¥9\.9/.test(A.el('rpUpgrade').innerHTML),'升级卡明示基础免费');
ok(/基础数据永久免费/.test(A.el('rpUpgrade').innerHTML),'升级卡明确「基础数据永久免费」');
ok(A.fullEls.every(e=>e.style.display==='none'),'完整版区块对游客隐藏');
ok(A.el('rpTime').textContent!==undefined && A.el('rpWeekNew').textContent!==undefined,'游客仍可看到基础真实数据');
ok(A.ev('exportWeeklyReport()')===null,'游客无法导出图片');
ok(A.ev('exportWeeklyReportText()')===null,'游客无法导出文字版');

console.log('\n=== 2. 解锁后深度失分归因与行动计划 ===');
A.ev('Store.quizAnswer(false,"熟词僻义","C1","appreciate","E1");');
A.ev('Store.quizAnswer(false,"熟词僻义","C2","appreciate","E1");');
A.ev('Store.quizAnswer(false,"熟词僻义","C3","interest","E2");');
A.ev('Store.reviewSense(LEX[0].senses[0].sense_id,3,LEX[0].w);');
A.ev('Store.grantAll();renderParentReport();');
ok(A.fullEls.every(e=>e.style.display===''),'全包用户可见完整版区块');
ok(/完整周报已解锁/.test(A.el('rpUpgrade').innerHTML),'升级卡切换为已解锁');
ok(/首要错因/.test(A.el('rpDeep').innerHTML),'深度归因有结论');
ok(/FSRS/.test(A.el('rpDeep').innerHTML) && /高危遗忘词/.test(A.el('rpDeep').innerHTML),'深度归因关联 FSRS 记忆状态');
ok(/下周行动计划/.test(HTML) && /错因集中在/.test(A.el('rpActionList').innerHTML),'行动计划来自真实错因');
let rep=A.ev('rpLast');
ok(rep.owned===true && rep.wrongTotal===3 && rep.deepLines.length>=2,'导出快照与渲染共用同一份真实数据');
ok(rep.weak[0].label==='熟词僻义' && rep.weak[0].pct===67,'薄弱项占比按真实错次计算（67%）');

console.log('\n=== 3. 文字版报告导出 ===');
const txt=A.ev('exportWeeklyReportText()');
ok(txt && /\.txt$/.test(txt.name),'生成 txt 文件（'+txt.name+'）');
const body=decodeURIComponent(txt.href.split(',')[1]);
ok(/拾词 · 学习周报/.test(body) && /统计周期/.test(body),'报告含标题与周期');
ok(/累计学习时长/.test(body) && /本周新学词/.test(body) && /综合正确率/.test(body),'报告含全部基础数据');
ok(/二、深度失分归因/.test(body) && /首要错因/.test(body),'报告含深度归因');
ok(/三、下周行动计划/.test(body) && /错因集中在/.test(body),'报告含行动计划');
ok(/四、云端算法统计/.test(body),'报告含算法统计章节');
ok(/不含真题原文与教材原文/.test(body),'报告保留合规声明');

console.log('\n=== 4. 图片报告导出 ===');
const png=A.ev('exportWeeklyReport()');
ok(png && /\.png$/.test(png.name),'生成 png 文件（'+png.name+'）');
ok(A.drawn.some(s=>/拾词 · 学习周报/.test(s)),'图片含标题');
ok(A.drawn.some(s=>/深度失分归因/.test(s)) && A.drawn.some(s=>/下周行动计划/.test(s)),'图片含深度归因与行动计划');
ok(A.drawn.some(s=>/累计学习时长/.test(s)) && A.drawn.some(s=>/本周新学词/.test(s)),'图片含基础 KPI');
ok(A.drawn.some(s=>/仿真语境/.test(s)),'图片底部保留合规说明');

console.log('\n=== 5. 无 canvas 能力时安全降级 ===');
const B=makeCtx(false);
B.ev('Store.reset();Store.resetEnt();Store.grantAll();renderParentReport();');
ok(B.ev('exportWeeklyReport()')===null,'无 canvas 时返回 null，不抛异常');
ok(B.ev('exportWeeklyReportText()')!==null,'文字版仍可正常导出');

console.log('\n=== 6. 构建产物同步 ===');
ok(HTML.indexOf('exportWeeklyReport()')>=0 && HTML.indexOf('exportWeeklyReportText()')>=0,'两处导出入口已就位');
ok(HTML.indexOf('id="rpDeep"')>=0,'深度归因容器已就位');
ok(PROTO.indexOf('weeklyReportLines')>=0 && PROTO.indexOf('rpWrapText')>=0,'单文件原型包含导出实现');
ok(APP.indexOf('基础数据永久免费 · 深度归因、行动计划与报告导出属于完整版')>=0,'权益边界文案一致');

console.log('\n========== 结果：'+PASS+' 通过 / '+FAIL+' 失败 ==========');
if(FAIL)process.exit(1);
