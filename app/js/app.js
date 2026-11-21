const WORDS=[
 {w:"appreciate",ipa:"/əˈpriːʃieɪt/",pos:"v.",def:"欣赏；感激；<b>意识到</b>",
  tag:"熟词僻义",tagc:"g",
  note:"高考常考 <b>意识到、察觉</b>，而不是「欣赏、感激」。常见考法：<i>I didn't appreciate the risk until it was too late.</i>（直到为时已晚我才意识到风险）",
  coll:["appreciate the difficulty","appreciate that…","I would appreciate it if…"],
  ex:{en:"She didn't appreciate the significance of the change until she saw the results.",zh:"直到看到结果，她才意识到这一变化的重要意义。",src:"仿真例句 · 高考阅读高频句式"},
  root:"← ap+preci (价值) + -ate：把价值看作 → 评估、欣赏、感激、意识到"},
 {w:"address",ipa:"/əˈdres/",pos:"v. / n.",def:"<b>处理、解决</b>；演讲；地址",
  tag:"熟词僻义",tagc:"g",
  note:"作动词时高考高频义为 <b>处理、解决（问题）</b>。注意与名词「地址」区分，语法填空常考词性转换。",
  coll:["address a problem","address the issue","address a concern"],
  ex:{en:"The school must address the issue of exam anxiety before it becomes a serious problem.",zh:"学校必须在考试焦虑成为严重问题之前解决它。",src:"仿真例句 · 应用文写作可复用"},
  root:"← ad (向) + dress (走向)：走向某人 → 演说、地址"},
 {w:"interest",ipa:"/ˈɪntrəst/",pos:"n. / v.",def:"兴趣；<b>利息</b>；使感兴趣",
  tag:"熟词僻义",tagc:"g",
  note:"金融/经济类语境中 <b>interest = 利息</b>。高考阅读（经济、社会类话题）出现频率极高，中文都译「利息」极易误判。",
  coll:["interest rate","compound interest","show interest in"],
  ex:{en:"With interest rates rising, many families are reconsidering their savings plans.",zh:"随着利率上升，许多家庭正在重新考虑自己的储蓄计划。",src:"仿真例句 · 读后续写/说明文题材"},
  root:"← interest 同时含「利益、利息」义，源于「share in the profits」"},
 {w:"sound",ipa:"/saʊnd/",pos:"adj. / n. / v.",def:"<b>健全的、可靠的</b>；声音；听起来",
  tag:"熟词僻义",tagc:"g",
  note:"形容词义 <b>健全的、可信的</b> 高考低频但一考就是关键。例：<i>a sound argument</i>（站得住脚的论点）、<i>a sound sleep</i>（酣睡）。",
  coll:["a sound decision","sound reasoning","sound judgment"],
  ex:{en:"His argument, though unconventional, was sound enough to convince the panel.",zh:"他的论点虽不循规蹈矩，却足够严谨，说服了评审组。",src:"仿真例句 · 议论文素材"},
  root:"← sound 作名词「声音」最常见，其余义项均属熟词僻义"},
 {w:"mean",ipa:"/miːn/",pos:"adj. / v.",def:"吝啬的；平均的；意味着",
  tag:"熟词僻义",tagc:"g",
  note:"形容词 <b>mean = 吝啬的、不善良的</b>。完形填空中 <i>He was too mean to share his lunch.</i> 是经典设定，但学生极易只想到动词义。",
  coll:["mean to sb","mean well","a mean spirit"],
  ex:{en:"He was mean with his money, but never mean to the people around him.",zh:"他对钱很吝啬，但对身边的人从不薄。",src:"仿真例句 · 完形填空句式"},
  root:"← mean 义项极多：平均的/吝啬的/_mean的（区别于 mean 的过去式）"},
 {w:"bear",ipa:"/beə/",pos:"v. / n.",def:"<b>承担、忍受</b>；生育；携带；熊",
  tag:"熟词僻义",tagc:"g",
  note:"<b>bear a responsibility / bear in mind</b> 是高频搭配；<b>bore</b>（生育）需辨析：the verb bear 的过去式是 bore，但 <i>she bore a child</i> 读作「生育」，<i>she bored him</i> 是「厌烦他」。",
  coll:["bear the responsibility","bear in mind","bear with me"],
  ex:{en:"Students should bear in mind that a single careless mistake can cost several points.",zh:"学生应当牢记，一次粗心的失误可能损失好几分。",src:"仿真例句 · 应用文写作可复用"},
  root:"bear（承担）→ bore（生育）→ borne（过去分词）三态同源"},
 {w:"subject",ipa:"/ˈsʌbdʒɪkt/",pos:"n. / adj.",def:"<b>易受…的</b>；主题；科目；使遭受",
  tag:"熟词僻义",tagc:"g",
  note:"<b>be subject to</b> = 易受…影响的 / 须经…同意的。高考阅读中的高频短语结构，比单词本身更常考。",
  coll:["be subject to","a subject for debate","subject to approval"],
  ex:{en:"Teenagers are particularly subject to peer pressure when making academic choices.",zh:"在做学业选择时，青少年尤其容易受到同伴压力影响。",src:"仿真例句 · 议论文/说明文"},
  root:"← sub (在…之下) + ject (投掷)：置于…之下 → 主题、对象、易受…"},
 {w:"fine",ipa:"/faɪn/",pos:"adj. / v. / n.",def:"好的；晴朗的；<b>罚款</b>",
  tag:"熟词僻义",tagc:"g",
  note:"作动词 <b>fine = 处以罚款</b>。完形填空常见：<i>He was fined for parking on the double yellow lines.</i> 注意与副词「很好地」区分。",
  coll:["be fined for","a heavy fine","fine for speeding"],
  ex:{en:"Drivers who ignore the ban are fined heavily, which has cut accidents by a third.",zh:"无视禁令的司机会被重罚，此举使事故减少了三分之一。",src:"仿真例句 · 说明文数据类"},
  root:"← 法语 finer（结束）→ 罚款、结案"}
];

const QUIZ_FALLBACK=[
 {stem:"When she read the letter, she suddenly ___ how much her parents had sacrificed for her.",
  tag:"熟词僻义 · appreciate",opts:["appreciated","appraised","approached","approved"],
  right:0,zh:"当她读到那封信时，她突然意识到父母为她牺牲了多少。",
  rule:"appreciate 此处 = <b>意识到、察觉到</b>。appraise = 评估，approach = 接近，approve = 赞成。"},
 {stem:"The school is taking steps to ___ the growing pressure on students.",
  tag:"熟词僻义 · address",opts:["address","access","assess","accuse"],
  right:0,zh:"学校正在采取措施应对学生身上日益增加的压力。",
  rule:"address 动词 = <b>处理、解决（问题）</b>，最贴近 take steps to 的搭配。access 是名词「通道」，assess 是「评估」，accuse 是「指控」。"},
 {stem:"With interest rates rising, families are saving less than they used to.",
  tag:"熟词僻义 · interest",opts:["interest","interview","interfere","intervene"],
  right:0,zh:"随着利率上升，家庭储蓄比以往少了。",
  rule:"<b>interest rates = 利率</b>，此处 interest = 利息。若译成「兴趣」则完全不通，是典型的阅读陷阱。"},
 {stem:"His explanation sounded reasonable, but it was not ___ enough to satisfy the judges.",
  tag:"熟词僻义 · sound",opts:["sound","soundly","sounding","sounded"],
  right:0,zh:"他的解释听起来有道理，但不够严密，无法让评委满意。",
  rule:"sound 形容词 = <b>严谨的、站得住脚的</b>。soundly 是副词「soundly asleep（睡得熟）」，此处需形容词作表语。",
  headword:"sound", errCode:"E5", type:"C2"},
 {stem:"The poor old woman was too ___ to share her food with the stray dog.",
  tag:"熟词僻义 · mean",opts:["mean","meaning","meanly","meant"],
  right:0,zh:"那位可怜的老太太太吝啬了，不肯把食物分给流浪狗。",
  rule:"mean 形容词 = <b>吝啬的</b>。too mean to… 是高考完形的经典结构，学生常误选副词 meanly。",
  headword:"mean", errCode:"E5", type:"C2"},
 {stem:"___ the child safety seat, the new law was brought into effect last month.",
  tag:"熟词僻义 · bear",opts:["Bearing","Bored","Borne","Bear"],
  right:2,zh:"随着儿童安全座椅被强制使用，新法上月生效。",
  rule:"<b>Borne = 过去分词（被动）</b>，对应 with + 宾语 + 过去分词结构。Bearing 是现在分词，Bore 是过去式。",
  headword:"bear", errCode:"E5", type:"C3"}
];

/* 熟词僻义专项：100 题训练数据来自 CTX_TRAP；缺失时退回上面的手写样题 */
let _trapMapCache=null;
function trapCtx(){return (typeof CTX_TRAP!=='undefined'&&CTX_TRAP)?CTX_TRAP:{words:[],meta:{coverage:{}}};}
function trapMap(){
  if(_trapMapCache)return _trapMapCache;
  _trapMapCache={};
  (trapCtx().words||[]).forEach(function(x){_trapMapCache[x.headword]=x;});
  return _trapMapCache;
}
function trapVarHtml(hw,limit){
  const x=trapMap()[hw];if(!x)return '';
  const vs=(x.variants||[]).slice(0,limit||5);
  if(!vs.length)return '';
  return '<div class="trap-box">'+
    '<h5>高考常考变体 · '+hw+' <span>'+(x.sense_text||'')+'</span></h5>'+
    '<div class="trap-row">'+vs.map(function(v){
      return '<span class="trap-chip '+(v.kind||'')+'"><span class="k">'+v.label+'</span>'+v.form+'</span>';
    }).join('')+'</div>'+
    ((x.common_senses||[]).length?'<div style="margin-top:7px;font-size:10.5px;color:var(--ink-3)">常见义干扰：'+x.common_senses.join(' / ')+'</div>':'')+
    '</div>';
}
function buildTrapQuiz(){
  // 训练题库仍保持 100 道精修真题级仿真题；扩展的 343 核心词进入熟练度词库。
  const src=(trapCtx().words||[]).filter(function(x){return x.featured!==false;});
  if(src.length<10)return QUIZ_FALLBACK;
  return src.map(function(x){
    const q=x.question||{};
    return {
      no:q.no,
      stem:q.stem,
      tag:'熟词僻义 · '+x.headword,
      opts:q.options||[],
      right:q.answer_index||0,
      zh:q.stem_cn||'',
      rule:q.explanation||'',
      headword:x.headword,
      errCode:q.errCode||'E1',
      type:q.type||q.carrier||'C1',
      sense_text:x.sense_text,
      variants:x.variants||[],
      common_senses:x.common_senses||[],
      carrier:q.carrier,
      difficulty:q.difficulty,
      source:q.source
    };
  });
}
const QUIZ=buildTrapQuiz();

const ERRORS=[
 {w:"appreciate",m:"词义误判 · 选成「感激」",c:"熟词僻义"},
 {w:"interest",m:"阅读理解 · 译成「兴趣」",c:"熟词僻义"},
 {w:"mean",m:"完形填空 · 未选「吝啬的」",c:"熟词僻义"},
 {w:"address",m:"语法填空 · 词性误判",c:"词性"},
 {w:"account for",m:"阅读理解 · 未识别短语",c:"固定搭配"}
];

const GOODS=[
 {key:"context",n:"《高考英语核心词 · 仿真语境版》",d:"每个词配一句仿真语境例句 + 3 个高频义项 + 真实搭配",p:2.9,o:null,badge:"热销",cover:"linear-gradient(150deg,#0f766e,#115e59)",coverText:"仿真语境<br>核心词",note:"单本 ¥2.9 · 全书可读 · 一次买断",detail:"openBook"},
 {key:"quiz",n:"《熟词僻义100题专项训练册》",d:"100 题覆盖 100 个高频词的陷阱义，每题附考场动作与错因解析",p:2.9,o:null,badge:"新上架",cover:"linear-gradient(150deg,#f59e0b,#b45309)",coverText:"熟词僻义<br>100题专项",note:"单本 ¥2.9 · 全书可读 · 一次买断",detail:"openBook3"},
 {key:"colloc",n:"《高考英语高频搭配速记手册》",d:"443 词高频搭配，核心搭配配独立仿真例句，词块整体记忆",p:2.9,o:null,badge:"正式版",cover:"linear-gradient(150deg,#475569,#1e293b)",coverText:"高频搭配<br>速记手册",note:"单本 ¥2.9 · 全书可读 · 一次买断",detail:"openBook2"},
 {key:"plan",n:"《30 天冲刺计划表 + 单词打卡表》",d:"可打印 A4，含每日词量梯度与复盘表",p:2.9,o:null,badge:"打印即用",cover:"linear-gradient(150deg,#0369a1,#075985)",coverText:"30天冲刺<br>计划打卡表",note:"单本 ¥2.9 · 全书可读 · 一次买断",detail:"openBook4"}
];

/* ==================== STATE ==================== */
let wIdx=0, flipped=false, rated={unknown:0,vague:0,known:0}, sched=null;
/* 背词记忆专项训练：智能队列 + 选择题出题 */
let studyMode='smart', studyQueue=[], studyPos=0, studyAnswered=false;
let studyRight=0, studyWrong=0, studyRequeued=0; // 本轮统计
let curQ=null; // 当前题目 {type,lw,prompt,options,answer,explain,senseId}
let dailyFlipped=false;       // 今日任务答错后词卡是否翻到背面（展示词义详情）
let dailyPrevWrongFixed=0;    // 本轮答对的「昨日错词」数量，收官卡展示跨天攻克成果
let dailyAutoAdvanceTimer=null; // 答对自动下一题的定时器
let dailyAutoAdvanceFn=null;  // 答对自动前进动作（庆祝弹层 CTA 复用）
/* 今日任务组卷：用户选的排序模式 + 本日缓存（同一天同一模式只算一次） */
let dailyOrder='theme', dailyCache=null;
const DAILY_MODE_NAME={alpha:'字母顺序',theme:'词义相近',random:'随机抽取'};
const DAILY_STAGE_NAME={new:'新学',review:'复习',consolidate:'巩固'};
let famQueue=[], famIdx=0, famFilter='all', famSched=null, famDone=0;
/* 单词进度页状态 */
let pgFilter='all', pgQuery='', pgShown=40, pgReviewQueue=null, pgReviewIdx=0, pgReviewWord=null;
let pgLetter=''; // A-Z 字母筛选：空=全部；点选后只显示该字母开头的词
let _gcLastLearned=null; // 成长看板：上次已学词数（用于数字滚动闪烁判定）
const GAOKAO_DATE = new Date(2027, 5, 7); // 高考日期，月份 0-based：5 = 6 月
let qIdx=0, qAnswered=false, qScore=0, qRight=0, qWrong=0, quizReflow=false;
let twFilter='all', twQuery='', twShown=40, twLastWord='';
let payPlan='year', payStage='plan', buyItem=null, couponUsed=false;

/* ==================== NAV ==================== */
const SCREENS=['s-home','s-study','s-fam','s-progress','s-quiz','s-trapwords','s-review','s-shop','s-book','s-book2','s-book3','s-book4','s-fullpack','s-me'];
/* 失分地图 / 学习周报现在是「学习复盘」内部的两个面板，不再是独立页面。
 * 保留 go('s-err') / go('s-parent') 作为兼容入口，自动切到对应面板。 */
const REVIEW_PANELS=['s-err','s-parent'];
const META={
 's-home':['首页 · 今日任务','首屏解决「今天该学什么」，高考倒计时 + 连续打卡 + 一个明确的主任务入口，降低高三用户的决策成本。'],
 's-study':['背单词卡','词卡正面是词，背面是释义、仿真语境例句、搭配与熟词僻义提示。必须翻面才能评价 —— 这是记忆算法唯一可靠的数据来源。'],
 's-fam':['发散复习','词形网专属复习：一个核心词带出整族派生词与形近词，三档评价喂给词形网 FSRS 卡片，按到期优先排期。'],
 's-progress':['单词进度','全量 4110 词的练习次数与熟练度一目了然：红=新词优先复习，绿=已学完降低频率，点击即可快速学习。'],
 's-book':['仿真语境版 · 图书详情','一词三义 + 仿真例句 + 真实搭配，单本 ¥2.9 买断，可免费试读真实内容（非样张占位）。'],
 's-book2':['高频搭配速记手册 · 图书详情','一词一组、按义项分组的高频搭配，词块整体记忆，可免费试读真实搭配卡。'],
 's-book3':['熟词僻义100题训练册 · 图书详情','100 题 / 100 词 / 100 个陷阱义，附高考常考变体词卡：词形、形近、搭配与常见义干扰，可免费试读 3 题。'],
 's-book4':['30天冲刺计划表 · 图书详情','四轮递进、每日梯度、可打印打卡表，附全 30 天计划表试读。'],
 's-fullpack':['拾词全包 · 词库详情','考纲范围全覆盖 + 必考层自研释义改写：展示真实覆盖词数、分层结构与可检索的释义样本。'],
 's-quiz':['专项训练 · 熟词僻义','100 题仿真训练，答题反馈即时给出高考常考变体词与常见义干扰；免费 3 题，第 4 题触发付费墙。'],
 's-trapwords':['核心变体词 · 熟练度','443 个高考必考核心词的变体词卡与熟练度反馈：练习次数、红绿状态、牢固/巩固/新学分档，三档自评即时回流。'],
 's-review':['学习复盘','把「我英语差」翻译成「我 38% 的失分来自熟词僻义」；再用学习周报把看得见的进步变成下一步计划。'],
 's-err':['失分地图','把「我英语差」翻译成「我 38% 的失分来自熟词僻义」。诊断能力是工具和诊断系统的分界线。'],
 's-shop':['资料商店','全包卡 + 单品教辅。词书按「配套学习进度」推荐，背完词再买词书，转化路径最短。'],
 's-me':['我的','学习数据 + 全包入口 + 订单。数据可视化本身就是留存与建立信任的核心。'],
 's-parent':['学习周报','基础周报永久免费，数字全部来自真实学习记录；完整版 ¥9.9 解锁深度归因与下周行动计划。']
};
const NAVLIST=[
 ['s-home','首页','今日任务与推荐'],
 ['s-study','背单词','词卡与记忆算法'],
 ['s-progress','单词进度','4110 词 · 红绿复习'],
 ['s-quiz','专项训练','熟词僻义付费墙','pay'],
 ['s-review','学习复盘','失分地图 · 学习周报'],
 ['s-shop','资料商店','电商与订阅','pay'],
 ['s-me','我的','数据与订单'],
 ['s-fam','发散复习','词形网 · 一核散整族']
];

/* 账号能力门禁：未登录时引导到「我的」页登录，登录成功后自动续做原动作。
 * 学习功能（背词 / 发散 / 进度 / 训练 / 词库）不设门禁，游客可直接用。 */
function needLogin(action, hint){
  try {
    if(typeof window!=='undefined' && typeof window.__requireLogin==='function' &&
       !(window.CloudStore && typeof window.CloudStore.getSession==='function' && window.CloudStore.getSession())){
      return window.__requireLogin(action, hint);
    }
  } catch(e) { /* 测试环境缺少窗口能力时按已登录处理，保持原行为 */ }
  return true;
}
function setReviewPanel(panel,skipGate){
  if(REVIEW_PANELS.indexOf(panel)<0) panel='s-err';
  if(!skipGate && panel==='s-parent' && !needLogin(function(){setReviewPanel('s-parent');},'学习周报需要登录后查看，请先登录。')) return;
  REVIEW_PANELS.forEach(p=>{
    const el=document.getElementById(p); if(el) el.classList.toggle('on',p===panel);
  });
  document.querySelectorAll('.rv-tab').forEach(t=>t.classList.toggle('on',t.dataset.panel===panel));
}
function go(id){
  let reviewPanel=null;
  if(REVIEW_PANELS.indexOf(id)>=0){
    reviewPanel=id;
    if(id==='s-parent' && !needLogin(function(){go('s-parent');},'学习周报需要登录后查看，请先登录。')) return;
    id='s-review';
  }
  SCREENS.forEach(s=>document.getElementById(s).classList.toggle('on',s===id));
  document.getElementById('phone').classList.toggle('no-tab',['s-study','s-fam','s-progress','s-quiz','s-trapwords','s-book','s-book2','s-book3','s-book4','s-fullpack'].includes(id));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===id||(id==='s-quiz'&&t.dataset.tab==='s-study')));
  if(reviewPanel) setReviewPanel(reviewPanel,true);
  document.getElementById('screens').scrollTop=0;
  const sc=document.getElementById(id); if(sc) sc.scrollTop=0;
  const m=META[id], cap=document.getElementById('caption');
  if(m&&cap){cap.innerHTML=
    '<div class="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg></div><div><b>'+m[0]+'</b><p>'+m[1]+'</p></div>';}
  document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('on',n.dataset.go===id));
  if(id==='s-progress'&&typeof renderProgress==='function')renderProgress();
  if(typeof syncStats==='function') syncStats();
}
function buildNav(){
  const nav=document.getElementById('nav'); if(!nav)return;
  nav.innerHTML=NAVLIST.map((n,i)=>
    '<button class="navitem" data-go="'+n[0]+'" onclick="go(\''+n[0]+'\')"><span class="n">'+String(i+1).padStart(2,'0')+'</span><span><span class="t">'+n[1]+'</span> <span class="d">'+n[2]+'</span>'+(n[3]?'<br><span class="pay">变现点</span>':'')+'</span></button>').join('');
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  if(t.dataset.tab==='s-study'){resetStudy();go('s-study');}
  else go(t.dataset.tab);
}));

/* ==================== 今日任务组卷 · 学习→复习→巩固闭环 ====================
 * 由 Store.dailyPlan() 按全量 4110 词的 FSRS 记忆状态组卷：
 *   new 新学 → review 复习 → consolidate 巩固，三段顺序固定；
 *   用户可切换段内排序：字母顺序 / 词义相近（主题语义场）/ 随机（当天稳定）。
 * 首页卡片展示三段构成与今日词预览；点击后用这份计划驱动背词页。 */
function getDailyPlan(){
  const key=dailyOrder+'-'+new Date().toDateString();
  if(!dailyCache||dailyCache.key!==key){
    dailyCache={key:key,plan:Store.dailyPlan(dailyOrder)};
  }
  return dailyCache.plan;
}
function renderDailyCard(){
  const plan=getDailyPlan(), c=plan.counts;
  const seg=document.getElementById('dpSeg');
  if(seg) seg.innerHTML=
    '<div class="seg s-new"><b>'+c.new+'</b><span>新学 · 装入新知</span></div>'+
    '<div class="seg s-review"><b>'+c.review+'</b><span>复习 · 到期优先</span></div>'+
    '<div class="seg s-consolidate"><b>'+c.consolidate+'</b><span>巩固 · 防止回落</span></div>';
  const name=document.getElementById('dpModeName');
  if(name) name.textContent=DAILY_MODE_NAME[plan.mode]||'主题聚类';
  const sub=document.getElementById('dpSub');
  if(sub) sub.textContent=plan.total+' 词闭环 · 预计 '+Math.max(4,Math.round(plan.total*0.4))+' 分钟'+
    (plan.themeFocus?(' · 聚焦「'+plan.themeFocus.replace(/^T-/,'' )+'」'):'');
  // 昨日错词跨天回带：把「上次错了、今天重点看」直接写进任务卡
  const pw=document.getElementById('dpPrevWrong');
  if(pw){
    const n=plan.prevWrongInPlan||0;
    pw.style.display=n?'':'none';
    if(n) pw.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'+
      '昨日错词 <b>'+n+'</b> 个已排进今天 · 上次错了，这次重点看';
  }
  document.querySelectorAll('#dpOrders button').forEach(b=>b.classList.toggle('on',b.dataset.o===dailyOrder));
  const peek=document.getElementById('dpPeek');
  if(peek){
    const items=plan.items.slice(0,7).map(it=>
      '<span class="pk k-'+it.stage+'"><b>'+DAILY_STAGE_NAME[it.stage]+'</b> '+it.w+'</span>').join('');
    peek.innerHTML=items+(plan.total>7?'<span class="pk more">+'+(plan.total-7)+' 词</span>':'');
  }
}
function setDailyOrder(mode){
  if(!DAILY_MODE_NAME[mode])return;
  dailyOrder=mode;
  dailyCache=null;
  renderDailyCard();
}
function startDailyPlan(){
  studyMode='daily';
  resetStudy();
  go('s-study');
}

/* ==================== STUDY CARD · 记忆专项训练 ====================
 * 取词不再线性 wIdx++，而是按 FSRS 真实状态构建队列：
 *   smart   智能混合：到期优先 → 薄弱(R低/失败多) → 新词，按记忆紧迫度排序
 *   new     新词优先：未学的排前
 *   due     待复习：已学且到期的排前
 *   weak    薄弱词：可提取性低或失败过的排前
 *   family  词形发散专项：有派生/形近词的词
 * 每轮固定批量（WORD_BATCH），答错的词在本轮后段重排再练。 */
const WORD_BATCH = 20;
const STUDY_MODES = [
  ['daily','今日任务'], ['smart','智能混合'], ['new','新词'], ['due','待复习'], ['weak','薄弱词'], ['family','词形发散']
];
function studyMetaOf(w){ return Store.studyMeta(w); }
function buildStudyQueue(mode){
  mode=mode||studyMode;
  /* 今日任务：直接用组卷引擎的学习→复习→巩固 20 词。
   * 非精修词构造轻量词条，由简化词义题引擎出题、practiceQuick 回流。 */
  if(mode==='daily'){
    return getDailyPlan().items.map((it,idx)=>{
      const m=it.meta||{};
      // 精修词：保留完整义项树 / 词形网 / 僻义元数据，走原选择题引擎
      if(Store.isLexWord(it.w)){
        const lw=LEX.find(x=>x.w===it.w);
        if(lw){
          const copy=Object.assign({},lw);
          copy.stage=it.stage;copy.i=idx;copy.fast=false;copy.prevWrong=!!it.prevWrong;
          return copy;
        }
      }
      // 非精修覆盖词：轻量词条，走简化词义题 + practiceQuick 回流
      return {
        w:it.w, ipa:m.ipa||'', pos:Array.isArray(m.pos)?m.pos:(m.pos?[m.pos]:[]),
        level:m.tier==='required'?'T1':'T2', theme:it.theme||'', stage:it.stage,
        word_family:[], confusable:[], senses:[], focus:null, i:idx,
        is_trap:false, trap_count:0, fast:true, prevWrong:!!it.prevWrong
      };
    });
  }
  const list=LEX.map((lw,i)=>{
    const m=studyMetaOf(lw.w);
    const orderT1=(lw.level==='T1'?0:(lw.level==='T2'?1:2));
    return {lw:lw,i:i,m:m,orderT1:orderT1,
            familyN:(lw.word_family||[]).length+(lw.confusable||[]).length};
  });
  let q;
  if(mode==='new'){
    q=list.filter(x=>!x.m.learned).sort((a,b)=>a.orderT1-b.orderT1||a.i-b.i);
  }else if(mode==='due'){
    q=list.filter(x=>x.m.learned&&x.m.due<=0).sort((a,b)=>a.m.due-b.m.due||a.m.r-b.m.r);
    if(!q.length)q=list.slice().sort((a,b)=>a.m.due-b.m.due); // 无到期词则展示最先到期的
  }else if(mode==='weak'){
    q=list.filter(x=>x.m.learned).sort((a,b)=>{
      const sa=(a.m.r)+(a.m.lapses*0.15), sb=(b.m.r)+(b.m.lapses*0.15);
      return sa-sb;
    });
    if(!q.length)q=list.slice().sort((a,b)=>a.orderT1-b.orderT1);
  }else if(mode==='family'){
    q=list.filter(x=>x.familyN>0).sort((a,b)=>b.familyN-a.familyN||a.orderT1-b.orderT1);
  }else{ // smart：到期>薄弱>新词，用紧迫度评分
    q=list.slice().sort((a,b)=>{
      const score=x=>{
        let s=0;
        if(x.m.learned){
          s+= x.m.due<=0 ? 100 : Math.max(0,40-x.m.due); // 到期最紧迫
          s+= (1-x.m.r)*30 + x.m.lapses*5;               // 越不熟越失败越靠前
        }else{
          s+= x.orderT1===0?12:(x.orderT1===1?8:4);      // 新词按优先级
        }
        return s;
      };
      return score(b)-score(a)||a.i-b.i;
    });
  }
  return q.slice(0,WORD_BATCH).map(x=>x.lw);
}
/* ---------- 选择题出题引擎 ----------
 * 题型按词库元数据生成，干扰项取自其他词，避免自造：
 *   family-derive  给核心词，选派生词
 *   family-confuse 给核心词，选形近易混词
 *   family-head    给派生/形近词，反选核心词
 *   trap           僻义辨认（is_trap / trap_count）
 *   sense          焦点义项理解
 * 词形发散优先：mode=family 时只出 family 题；其他模式按词是否有 trap/family 决定。 */
let _qPools=null;
function qPools(){
  if(_qPools)return _qPools;
  const famSet=new Set(), senseSet=new Set();
  LEX.forEach(lw=>{
    (lw.word_family||[]).forEach(x=>famSet.add(x));
    (lw.confusable||[]).forEach(x=>famSet.add(x));
    (lw.senses||[]).forEach(s=>{ if(s.text) senseSet.add(s.text); });
  });
  _qPools={family:Array.from(famSet), sense:Array.from(senseSet)};
  return _qPools;
}
/* 非精修覆盖词的释义映射：自研释义改写（443）+ 仿真语境版（1500）合并，
 * 供今日任务的简化词义选择题使用；同主题词的义项优先作为干扰项。 */
let _fastMean=null;
function fastMeanMap(){
  if(_fastMean)return _fastMean;
  const map={}; // w -> {senses:[{text,theme}], theme}
  const cov=coverageCtx();
  const themeOf={};(cov.all||[]).forEach(x=>{if(x&&x.w)themeOf[x.w]=x.theme||'';});
  (paraCtx().words||[]).forEach(x=>{
    if(!x||!x.w)return;
    const senses=(x.senses||[]).filter(s=>s.meaning).map(s=>({text:s.meaning,pos:s.pos||''}));
    if(senses.length)map[x.w]={senses:senses,theme:themeOf[x.w]||''};
  });
  if(typeof CTX_BOOK!=='undefined'&&CTX_BOOK&&CTX_BOOK.words){
    CTX_BOOK.words.forEach(x=>{
      if(!x||!x.headword||map[x.headword])return;
      const senses=(x.senses||[]).filter(s=>s.text).map(s=>({text:s.text,pos:''}));
      if(!senses.length&&x.core_meaning)senses.push({text:x.core_meaning,pos:''});
      if(senses.length)map[x.headword]={senses:senses,theme:themeOf[x.headword]||''};
    });
  }
  _fastMean=map;
  return map;
}
/* 非精修词简化题：给英文词选中文义。正确义取自释义映射；
 * 干扰项优先同主题其他词的义项，不足再从全库补足。 */
function buildFastQuestion(lw){
  const map=fastMeanMap();
  const entry=map[lw.w];
  const pool=Object.keys(map).map(w=>({w:w,senses:map[w].senses,theme:map[w].theme}));
  if(!entry||!entry.senses.length){
    // 覆盖层无释义：用词形/音标拼读辨析，题干给词与主题，问词性
    const posList=(lw.pos&&lw.pos.length)?lw.pos:['n'];
    const right=posList[0]==='v'?'动词 v.':(posList[0]==='adj'?'形容词 adj.':(posList[0]==='adv'?'副词 adv.':'名词 n.'));
    const labels=['名词 n.','动词 v.','形容词 adj.','副词 adv.'];
    const opts=qShuffle([right].concat(labels.filter(x=>x!==right)).slice(0,4));
    return {
      type:'fast-pos', tagLabel:'词性辨析', tagCls:'',
      prompt:'覆盖词 <span class="kw">'+lw.w+'</span> 在考纲中的主要词性是？',
      options:opts, answer:opts.indexOf(right),
      explain:lw.w+' · '+(lw.ipa||'')+' · 主题：'+(lw.theme||'考纲覆盖').replace(/^T-/,''),
      senseId:null, fast:true
    };
  }
  const focus=entry.senses[0].text;
  const sameTheme=pool.filter(x=>x.w!==lw.w&&x.theme&&x.theme===entry.theme)
    .map(x=>x.senses[0].text).filter(t=>t&&t!==focus);
  const others=pool.filter(x=>x.w!==lw.w).map(x=>x.senses[0].text).filter(t=>t&&t!==focus&&sameTheme.indexOf(t)<0);
  const distract=qShuffle(sameTheme.concat(qShuffle(others))).filter((t,i,a)=>a.indexOf(t)===i).slice(0,3);
  while(distract.length<3)distract.push('（释义待补）'+distract.length);
  const opts=qShuffle([focus].concat(distract));
  return {
    type:'fast-sense', tagLabel:entry.theme?'词义 · 主题':'词义理解', tagCls:'',
    prompt:'考纲词 <span class="kw">'+lw.w+'</span> 的意思是？',
    options:opts, answer:opts.indexOf(focus),
    explain:lw.w+' 的核心义为「'+focus+'」'+(entry.theme?('，属于「'+entry.theme.replace(/^T-/,'')+'」语义场。'):'。')+
      ' 干扰项取自同主题词的义项，便于辨析记忆。',
    senseId:null, fast:true
  };
}
function qShuffle(a){
  const r=a.slice();
  for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=r[i];r[i]=r[j];r[j]=t;}
  return r;
}
function qDistractors(pool, exclude, n){
  const cands=qShuffle(pool.filter(x=>!exclude.has(x)));
  return cands.slice(0,n);
}
function qAssemble(correctText, pool, exclude, explain, extra){
  const opts=[{t:correctText,ok:true}];
  qDistractors(pool,exclude,3).forEach(t=>opts.push({t:t,ok:false}));
  const shuffled=qShuffle(opts);
  const answer=shuffled.findIndex(o=>o.ok);
  return Object.assign({options:shuffled.map(o=>o.t),answer:answer,explain:explain},extra||{});
}
function buildQuestion(lw){
  if(lw.fast)return buildFastQuestion(lw);
  const focus=focusSense(lw);
  const fam=lw.word_family||[], conf=lw.confusable||[];
  const pools=qPools();
  const hasFam=fam.length>0, hasConf=conf.length>0;
  const mode=studyMode;
  let type;
  if(mode==='family') type=hasFam?'family-derive':(hasConf?'family-confuse':'family-head');
  else{
    // 按词本身元数据决定题型：有 trap 优先考僻义，其次词形，最后释义
    if(lw.is_trap||focus.is_trap||lw.trap_count>0) type='trap';
    else if(hasFam||hasConf) type=(lw.i%2===0&&hasFam)?'family-derive':(hasConf?'family-confuse':'sense');
    else type='sense';
  }
  const exclude=new Set([lw.w]);
  if(type==='family-derive'){
    const right=fam[Math.floor(Math.random()*fam.length)];
    exclude.add(right);
    return qAssemble(right,pools.family,exclude,
      '「'+right+'」是 '+lw.w+' 的派生/词形变化；词形网记忆就是由一个核心词带出整族。',
      {type:type,tagLabel:'词形发散',tagCls:'fam',prompt:'下列哪个是 <span class="kw">'+lw.w+'</span> 的派生词或词形变化？',senseId:focus.sense_id});
  }
  if(type==='family-confuse'){
    const right=conf[Math.floor(Math.random()*conf.length)];
    exclude.add(right);
    return qAssemble(right,pools.family,exclude,
      '「'+right+'」与 '+lw.w+' 形近/音近，是高考易混点，要放在一起辨析记忆。',
      {type:type,tagLabel:'形近易混',tagCls:'fam',prompt:'下列哪个词与 <span class="kw">'+lw.w+'</span> 形近或音近、容易混淆？',senseId:focus.sense_id});
  }
  if(type==='family-head'){
    const member=(fam.concat(conf))[Math.floor(Math.random()*(fam.length+conf.length))];
    exclude.add(member);
    // 干扰项用其他核心词
    const headPool=LEX.map(x=>x.w).filter(w=>w!==lw.w);
    return qAssemble(lw.w,headPool,new Set([member,lw.w]),
      '「'+member+'」是 '+lw.w+' 词形网的成员，核心词是 '+lw.w+'。',
      {type:type,tagLabel:'词形归属',tagCls:'fam',prompt:'「<span class="kw">'+member+'</span>」属于下列哪个核心词的词形网？',senseId:focus.sense_id});
  }
  if(type==='trap'){
    exclude.add(focus.text);
    return qAssemble(focus.text,pools.sense,exclude,
      lw.w+' 的高考陷阱义是「'+focus.text+'」，不是常见义。'+((focus.trap_of||[]).length?'常见义：'+focus.trap_of.join('、')+'。':''),
      {type:type,tagLabel:'熟词僻义',tagCls:'trap',prompt:'在高考语境中，<span class="kw">'+lw.w+'</span> 常考的僻义是？',senseId:focus.sense_id});
  }
  // sense
  exclude.add(focus.text);
  return qAssemble(focus.text,pools.sense,exclude,
    lw.w+' 的焦点义项是「'+focus.text+'」，掌握度挂在这个义项上。',
    {type:'sense',tagLabel:'词义理解',tagCls:'',prompt:'单词 <span class="kw">'+lw.w+'</span> 在这里的意思是？',senseId:focus.sense_id});
}
function setStudyMode(mode){
  studyMode=mode;
  document.querySelectorAll('.smodes button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  resetStudy();
}
function resetStudy(){
  if(dailyAutoAdvanceTimer){clearTimeout(dailyAutoAdvanceTimer);dailyAutoAdvanceTimer=null;}
  dailyAutoAdvanceFn=null;dailyFlipped=false;dailyPrevWrongFixed=0;
  studyQueue=buildStudyQueue(studyMode);
  studyPos=0;studyAnswered=false;studyRight=0;studyWrong=0;studyRequeued=0;
  wIdx=0;flipped=false;rated={unknown:0,vague:0,known:0};sched=null;
  curQ=null;
  renderStudy();
}
function senseOf(lw,sid){for(var i=0;i<lw.senses.length;i++){if(lw.senses[i].sense_id===sid)return lw.senses[i];}return null;}
function focusSense(lw){return senseOf(lw,lw.focus)||lw.senses[0];}
function senseRow(lw,s){
  var m=Store.mastery(s.sense_id);
  var pct=Math.round(m*100);
  var cls=pct>=90?'':(pct>=50?'mid':'low');
  var due=Store.dueText(s.sense_id);
  return '<div class="sense-row'+(s.sense_id===lw.focus?' focus':'')+'">'+
    '<div class="sense-top"><span class="sense-txt">'+s.text+'</span>'+
      '<span class="sense-lv'+(s.is_trap?' trap':'')+'">'+s.sense_level+(s.is_trap?' 陷阱':'')+'</span>'+
      '<span class="sense-due">'+(due||'未学')+'</span></div>'+
    (m>0?'<div class="mast-bar"><div class="mast-fill '+cls+'" style="width:'+pct+'%"></div></div>'+
      '<div class="mast-meta"><span>掌握度 '+pct+'%</span><span>'+(s.collocations.length||0)+' 搭配</span></div>':'')+
  '</div>';
}
/* ==================== 发散复习（词形网专属入口）==================== */
function famQueueBuild(filter){
  filter=filter||'all';
  const st=Store.load();
  const list=LEX.map((w,i)=>{
    const c=st.families[w.w];
    const due=c&&c.state!==FSRS.STATE.NEW ? (c.due-Date.now())/FSRS.DAY : Infinity;
    const learned=!!(c&&c.state!==FSRS.STATE.NEW);
    return {i:i,w:w,due:due,learned:learned};
  });
  let q;
  if(filter==='due') q=list.filter(x=>x.learned&&x.due<=0).sort((a,b)=>a.due-b.due);
  else if(filter==='new') q=list.filter(x=>!x.learned);
  else if(filter==='learned') q=list.filter(x=>x.learned).sort((a,b)=>a.due-b.due);
  else q=list.slice().sort((a,b)=>{
    // 未学优先；已学的按到期升序（越早到期越靠前）
    if(a.learned!==b.learned) return a.learned?1:-1;
    return a.due-b.due;
  });
  return q;
}
function famSetFilter(f){
  famFilter=f;famIdx=0;famDone=0;famSched=null;
  document.querySelectorAll('.fam-filter button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));
  renderFam();
}
function renderFam(){
  const bar=document.getElementById('fambar'),cnt=document.getElementById('famcnt');
  const body=document.getElementById('famBody');
  if(!bar||!body)return;
  if(!famQueue.length)famQueue=famQueueBuild(famFilter);
  const total=famQueue.length;
  if(famIdx>=total){
    bar.style.width='100%';cnt.textContent=total+'/'+total;
    body.innerHTML='<div class="fam-empty">'+
      '<div class="done-ic" style="background:#fffbeb;color:#b45309"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
      '<h3>本轮发散复习完成</h3><p>复习了 '+famDone+' 张词形网 · 已按 FSRS 排入下次复习</p>'+
      '<button class="btn btn-primary" style="margin-top:14px" onclick="famQueue=famQueueBuild(famFilter);famIdx=0;famDone=0;famSched=null;renderFam()">再背一轮</button>'+
      '<button class="btn btn-ghost" style="margin-top:8px" onclick="go(\'s-home\')">回到首页</button></div>';
    return;
  }
  bar.style.width=Math.round(famIdx/total*100)+'%';
  cnt.textContent=famIdx+'/'+total;
  const w=famQueue[famIdx].w;
  const fm=Store.familyMastery(w.w),pct=Math.round(fm*100);
  const deriv=(w.word_family||[]).map(x=>'<span class="fam-bigchip">'+x+'</span>').join('');
  const confs=(w.confusable||[]).map(x=>'<span class="fam-bigchip conf">'+x+'</span>').join('');
  const fs=w.senses.find(s=>s.sense_id===w.focus)||w.senses[0];
  const circ=2*Math.PI*22, off=circ*(1-fm);
  let schedLine='按 FSRS 排期 · 三个档位算出不同的下次复习时间';
  if(famSched) schedLine='本次「'+famSched.label+'」→ 词形网下次复习 <em style="color:var(--accent-deep)">'+FSRS.intervalText(famSched.iv)+'</em>';
  body.innerHTML=
    '<div class="fam-lead"><h3>发散复习</h3><p>一个核心词，带出整张词形网。看词想派生与形近，再评价掌握度。</p></div>'+
    '<div class="fam-filter">'+
      [['all','全部 '+LEX.length],['due','待复习'],['new','未学'],['learned','已学']].map(f=>
        '<button data-f="'+f[0]+'" class="'+(famFilter===f[0]?'on':'')+'" onclick="famSetFilter(\''+f[0]+'\')">'+f[1]+'</button>').join('')+
    '</div>'+
    '<div class="fam-qcard">'+
      '<div class="fam-qhead"><div><div class="fam-qword">'+w.w+'</div><div class="fam-qipa">'+w.ipa+' · '+w.pos+'</div></div>'+
        '<div class="fam-mring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" stroke-width="4"/>'+
        '<circle cx="26" cy="26" r="22" fill="none" stroke="#d97706" stroke-width="4" stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+off+'"/></svg>'+
        '<div class="lbl">'+(pct?pct+'%':'—')+'</div></div></div>'+
      (deriv?'<div class="fam-sep">派生 / 词形变化 · '+w.word_family.length+'</div><div class="fam-wordgrid">'+deriv+'</div>':'')+
      (confs?'<div class="fam-sep">形近音近 · 易混 · '+w.confusable.length+'</div><div class="fam-wordgrid">'+confs+'</div>':'')+
      (fs?'<div class="fam-sensehint">焦点义项：<b>'+fs.text+'</b>'+(fs.is_trap?' · 陷阱义':'')+'</div>':'')+
      '<div class="fam-rate">'+
        '<button class="u" onclick="famRate(1,\'不认识\')"><b>不认识</b><span>1 · 重排</span></button>'+
        '<button class="v" onclick="famRate(2,\'模糊\')"><b>模糊</b><span>2 · 巩固</span></button>'+
        '<button class="k" onclick="famRate(3,\'认识\')"><b>认识</b><span>3 · 拉长</span></button>'+
      '</div>'+
      '<div class="fam-sched">'+schedLine+'</div>'+
    '</div>';
}
function famRate(rating,label){
  const w=famQueue[famIdx].w;
  const res=Store.reviewFamily(w.w,rating,'study');
  famSched={iv:res.interval,label:label,r:res.r};
  famDone++;
  syncStats();
  renderFam();
  showReward('词形网已复习', w.w+' · 已排入下次复习', false);
  setTimeout(()=>{famSched=null;famIdx++;renderFam();},900);
}
/* ==================== 仿真语境版 · 图书详情 + 试读 ==================== */
let bookTier=0, bookPreviewN=3;
function bookSample(){
  const src=(typeof CTX_BOOK!=='undefined'&&CTX_BOOK)?CTX_BOOK:{meta:{name:'高考英语核心词 · 仿真语境版',subtitle:'一词多义 · 仿真语境',status:'正式版',coverage:{current_words:4110,current_senses:7629,example_sentences:643,by_layer:{}}},words:[]};
  // 两档定价：单本读本统一 ¥2.9 买断，不再展示历史分档
  const total=(src.meta&&src.meta.coverage&&src.meta.coverage.current_words)||4110;
  src.meta=Object.assign({},src.meta,{pricing:{currency:'CNY',tiers:[{name:'完整版',words:total,price:2.9}]}});
  return src;
}
function renderBook(){
  const body=document.getElementById('bookBody');
  if(!body)return;
  const b=bookSample(),m=b.meta;
  const tiers=m.pricing.tiers;
  const cur=tiers[bookTier];
  const cov=m.coverage||{},bl=cov.by_layer||{};
  const total=cov.current_words||4110;
  const layer=bl||{};
  const pts=[
    [total+' 词全覆盖','100 词深度精修 + 343 词自研释义 + '+(layer['L3-覆盖整理']||3667)+' 词规范化整理'],
    ['核心词全部配例句','443 个高考核心词每词至少一句仿真语境句，标注来源，贴近高考阅读高频句式'],
    ['真实搭配','义项配高频搭配，看到介词就能调出整个词块'],
    ['分层如实标注','覆盖整理层为释义卡、明示「无例句」；音标来源逐词标注']
  ];
  const tiersHtml=tiers.map((t,i)=>
    '<div class="bk-tier'+(i===bookTier?' on':'')+'" onclick="bookTier='+i+';renderBook()">'+
      '<div class="lt"><b>'+t.name+'</b><span>'+t.words+' 词 · 覆盖 '+(total>0?Math.round(t.words/total*100):0)+'%</span></div>'+
      '<div class="rt">¥'+t.price.toFixed(1)+'</div></div>').join('');
  const prevWords=(b.words||[]).slice(0,bookPreviewN);
  const prevHtml=prevWords.map(w=>
    '<div class="pv-word">'+
      '<div class="pv-top"><span class="pv-w">'+w.headword+'</span><span class="pv-ipa">'+w.ipa+(w.core_tier?' · '+w.core_tier:'')+'</span></div>'+
      (w.senses||[]).map(s=>
        '<div class="pv-sense"><span class="pv-st">'+s.text+'</span>'+(s.is_trap?'<span class="lv">陷阱义</span>':'')+
          (s.example?'<div class="pv-ex">'+s.example+'</div>':'')+
          (s.example_zh?'<div class="pv-zh">'+s.example_zh+'</div>':'')+
          ((s.collocations&&s.collocations.length)?'<div class="pv-col">搭配 · '+s.collocations.join(' · ')+'</div>':'')+
          (s.source?'<div class="pv-src">'+s.source+'</div>':'')+
        '</div>').join('')+
    '</div>').join('');
  const moreBtn=(b.words&&bookPreviewN<b.words.length)?
    '<div class="pv-more"><button class="btn btn-ghost" onclick="bookPreviewN=Math.min('+(b.words.length)+',bookPreviewN+5);renderBook()">再试读 5 词（已看 '+bookPreviewN+'/'+b.words.length+'）</button></div>':
    (b.words?'<div class="pv-more">试读结束 · 当前样本卷共 '+b.words.length+' 词</div>':'');
  body.innerHTML=
    '<div class="bk-cover"><span class="bk-badge">'+(m.status||'样本卷')+'</span>'+
      '<div class="bk-eyebrow">核心词 · 语境记忆</div>'+
      '<h2>'+m.name+'</h2><div class="bk-sub">'+m.subtitle+'<br>'+
      '正式版 '+m.coverage.current_words+' 词 / '+m.coverage.current_senses+' 义项 · 仿真例句 '+m.coverage.example_sentences+' 句</div></div>'+
    '<div class="bk-pts">'+pts.map(p=>
      '<div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>'+p[0]+'</b> · '+p[1]+'</div></div>').join('')+'</div>'+
    '<div class="bk-tiers">'+tiersHtml+'</div>'+
    (Store.hasBook('context')?'<button class="btn btn-primary" style="width:100%;opacity:.7" disabled>已解锁 · 本书可直接使用</button>':'<button class="btn btn-primary" style="width:100%" onclick="bookBuy()">购买'+cur.name+' ¥'+cur.price.toFixed(1)+'</button>')+
    '<p style="text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.5;margin:9px 2px 0">'+m.description+'</p>'+
    '<div class="bk-preview"><div class="pv-head"><h4>免费试读</h4><span>真实内容 · 非样张占位</span></div>'+
      prevHtml+moreBtn+'</div>';
}
function bookBuy(){
  // 复用现有下单弹窗：单本读本统一作为 ¥2.9 商品
  const b=bookSample(),t=b.meta.pricing.tiers[bookTier];
  buyItem={key:'context',n:'《'+b.meta.name+'》· '+t.name,d:t.words+' 词 · 仿真语境例句',p:t.price,
           cover:'linear-gradient(150deg,#0f766e,#115e59)',coverText:'仿真语境<br>核心词'};
  couponUsed=false;payStage='buy';renderBuy();openMask(document.getElementById('sheet').innerHTML);
}
function openBook(){bookTier=0;bookPreviewN=3;renderBook();go('s-book');}

/* ==================== 高频搭配速记手册 · 详情 + 试读 ==================== */
let colTier=0, colPreviewN=2;
function collocSample(){
  const src=(typeof CTX_COLLOC!=='undefined'&&CTX_COLLOC)?CTX_COLLOC:{meta:{name:'高考英语高频搭配速记手册',subtitle:'一词一组 · 按义项分组 · 词块整体记忆',status:'正式版',coverage:{current_words:443,current_collocations:2302,examples_by_method:{'手工精修':641}},type_distribution:{},description:''},words:[]};
  const total=(src.meta&&src.meta.coverage&&src.meta.coverage.current_words)||443;
  src.meta=Object.assign({},src.meta,{pricing:{currency:'CNY',tiers:[{name:'完整版',words:total,price:2.9}]}});
  return src;
}
function renderBook2(){
  const body=document.getElementById('book2Body');
  if(!body)return;
  const b=collocSample(),m=b.meta,tiers=m.pricing.tiers,cur=tiers[colTier];
  const cov=m.coverage||{},exb=cov.examples_by_method||{};
  const pts=[
    ['443 词全覆盖','高考核心词按义项分组收录高频搭配，词块整体记忆'],
    ['按义项分组','搭配挂在对应义项下，记住「这个词这个意思配什么」'],
    ['核心搭配独立例句','641 条核心搭配逐条配仿真例句，告别同义项共用一句'],
    ['例句来源如实标注','手工精修例句与义项语境句逐条区分，不搞虚假精修']
  ];
  const tiersHtml=tiers.map((t,i)=>
    '<div class="bk-tier'+(i===colTier?' on':'')+'" onclick="colTier='+i+';renderBook2()">'+
      '<div class="lt"><b>'+t.name+'</b><span>'+t.words+' 词 · '+t.price.toFixed(1)+' 元</span></div>'+
      '<div class="rt">¥'+t.price.toFixed(1)+'</div></div>').join('');
  const typeDist=Object.keys(m.type_distribution||{}).map(k=>k+' '+m.type_distribution[k]).join(' · ');
  const prev=(b.words||[]).slice(0,colPreviewN).map(w=>
    '<div class="pv-word"><div class="pv-top"><span class="pv-w">'+w.headword+'</span>'+
      '<span class="pv-ipa">'+w.ipa+' · '+w.colloc_count+' 条搭配</span></div>'+
      (w.groups||[]).map(g=>
        '<div class="cl-group"><div class="cl-group-hd">'+g.sense+
          (g.is_trap?'<span class="trap">陷阱义</span>':'')+'</div>'+
          g.collocations.map(c=>
            '<div class="cl-item"><span class="cl-t">'+c.text+'</span>'+
              '<span class="cl-type">'+c.type+'</span>'+
              (c.example?'<div class="cl-ex">'+c.example+'</div>':'')+
              (c.example_zh?'<div class="cl-zh">'+c.example_zh+'</div>':'')+
              (c.source?'<div class="cl-src">'+c.source+(c.example_method==='手工精修'?' · 独立例句':(c.example_method==='义项语境句'?' · 义项语境':''))+'</div>':'')+
            '</div>').join('')+
        '</div>').join('')+
    '</div>').join('');
  const moreBtn=(b.words&&colPreviewN<b.words.length)?
    '<div class="pv-more"><button class="btn btn-ghost" onclick="colPreviewN=Math.min('+b.words.length+',colPreviewN+3);renderBook2()">再试读 3 词（已看 '+colPreviewN+'/'+b.words.length+'）</button></div>':
    (b.words?'<div class="pv-more">试读结束 · 正式版共 '+b.words.length+' 词 / '+m.coverage.current_collocations+' 条搭配</div>':'');
  body.innerHTML=
    '<div class="bk2-cover"><span class="bk-badge">'+(m.status||'样本卷')+'</span>'+
      '<div class="bk-eyebrow">高频搭配 · 词块记忆</div>'+
      '<h2>'+m.name+'</h2><div class="bk-sub">'+m.subtitle+'<br>'+
      '正式版 '+m.coverage.current_words+' 词 / '+m.coverage.current_collocations+' 条搭配 · 独立例句 '+(m.coverage.examples_by_method||{}).手工精修+' 条</div></div>'+
    '<div class="bk-pts">'+pts.map(p=>
      '<div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>'+p[0]+'</b> · '+p[1]+'</div></div>').join('')+'</div>'+
    (typeDist?'<div style="font-size:11px;color:var(--ink-3);line-height:1.6;margin:2px 0 8px">搭配类型：'+typeDist+'</div>':'')+
    '<div class="bk-tiers">'+tiersHtml+'</div>'+
    (Store.hasBook('colloc')?'<button class="btn btn-primary" style="width:100%;opacity:.7" disabled>已解锁 · 本书可直接使用</button>':'<button class="btn btn-primary" style="width:100%" onclick="colBuy()">购买'+cur.name+' ¥'+cur.price.toFixed(1)+'</button>')+
    '<p style="text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.5;margin:9px 2px 0">'+m.description+'</p>'+
    '<div class="bk-preview"><div class="pv-head"><h4>免费试读</h4><span>按词 · 真实内容</span></div>'+
      prev+moreBtn+'</div>';
}
function colBuy(){
  const b=collocSample(),t=b.meta.pricing.tiers[colTier];
  buyItem={key:'colloc',n:'《'+b.meta.name+'》· '+t.name,d:t.words+' 词 · 词块整体记忆',p:t.price,
           cover:'linear-gradient(150deg,#475569,#1e293b)',coverText:'高频搭配<br>速记手册'};
  couponUsed=false;payStage='buy';renderBuy();openMask(document.getElementById('sheet').innerHTML);
}
function openBook2(){colTier=0;colPreviewN=2;renderBook2();go('s-book2');}

/* ==================== 熟词僻义100题训练册 · 详情 + 试读 ==================== */
let quizTier=0;
function quizSample(){
  const src=(typeof CTX_QUIZ!=='undefined'&&CTX_QUIZ)?CTX_QUIZ:{meta:{name:'熟词僻义 100 题专项训练册',subtitle:'100 个高频词 · 每题一个陷阱义',status:'正式卷',description:'',coverage:{}},preview:[],units:[]};
  const total=(src.meta&&src.meta.coverage&&src.meta.coverage.total_questions)||100;
  src.meta=Object.assign({},src.meta,{pricing:{currency:'CNY',tiers:[{name:'完整版',count:total,price:2.9}]}});
  return src;
}
function renderBook3(){
  const body=document.getElementById('book3Body');if(!body)return;
  const b=quizSample(),m=b.meta,tiers=m.pricing.tiers,cur=tiers[quizTier];
  const pts=[
    ['100 词 100 题','每个高频词只考它最容易错的那个义项，不重复不遗漏'],
    ['陷阱义优先','全部 100 题目标义项都是陷阱义，S1 主义项 0 道'],
    ['考场动作','每题给一个可执行的判断动作，不是定义复述'],
    ['错因解析','逐题讲清学生为什么会选错、干扰项测什么'],
    ['变体词卡','每词附词形派生、形近易混、搭配变体与常见义干扰']
  ];
  const tiersHtml=tiers.map((t,i)=>
    '<div class="bk-tier'+(i===quizTier?' on':'')+'" onclick="quizTier='+i+';renderBook3()">'+
      '<div class="lt"><b>'+t.name+'</b><span>'+t.count+' 题 + 解析</span></div>'+
      '<div class="rt">¥'+t.price.toFixed(1)+'</div></div>').join('');
  const cov=m.coverage||{};
  const statLine=cov.total_questions?(cov.total_questions+' 题 · '+cov.total_words+' 词 · '+cov.trap_senses+' 个陷阱义 · '+cov.units+' 单元'):'';
  const prev=(b.preview||[]).slice(0,3).map(q=>{
    const opts=(q.options||[]).map(o=>
      '<div class="qz-opt'+(o.key===q.answer?' right':'')+'">'+o.key+'. '+o.text+(o.key===q.answer?'　✓':'')+'</div>').join('');
    return '<div class="qz-q"><div class="qz-hd"><span>第 '+q.no+' 题 · '+(q.module||'').split('_')[0]+'</span>'+
      '<span>'+q.carrier+' · '+q.difficulty+'</span></div>'+
      '<div class="qz-stem">'+q.stem.replace('______','<span class="blank">____</span>')+'</div>'+
      (q.stem_cn?'<div class="qz-cn">'+q.stem_cn+'</div>':'')+
      '<div class="qz-opts">'+opts+'</div>'+
      '<div class="qz-ans"><b>义项：</b>'+q.sense_text+'</div></div>';
  }).join('');
  const tv=(trapCtx().words||[]).slice(0,12);
  const tc=(trapCtx().meta&&trapCtx().meta.coverage)||{};
  const variantPreview=tv.map(function(x){
    const chips=(x.variants||[]).slice(0,3).map(function(v){
      return '<div class="var-item"><div class="vf">'+v.form+'</div><div class="vk">'+v.label+'</div></div>';
    }).join('');
    return '<div class="var-word"><div class="var-head"><b>'+x.headword+'</b><span>'+x.sense_text+'</span></div>'+
      '<div class="var-grid">'+chips+'</div></div>';
  }).join('');
  body.innerHTML=
    '<div class="bk3-cover"><span class="bk-badge">'+(m.status||'')+'</span>'+
      '<div class="bk-eyebrow">熟词僻义 · 专项训练</div>'+
      '<h2>'+m.name+'</h2><div class="bk-sub">'+m.subtitle+'<br>'+statLine+'</div></div>'+
    '<div class="bk-pts">'+pts.map(p=>
      '<div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>'+p[0]+'</b> · '+p[1]+'</div></div>').join('')+'</div>'+
    '<div class="bk-tiers">'+tiersHtml+'</div>'+
    (Store.hasBook('quiz')?'<button class="btn btn-primary" style="width:100%;opacity:.7" disabled>已解锁 · 本书可直接使用</button>':'<button class="btn btn-primary" style="width:100%" onclick="quizBookBuy()">购买'+cur.name+' ¥'+cur.price.toFixed(1)+'</button>')+
    '<p style="text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.5;margin:9px 2px 0">'+m.description+'</p>'+
    '<div class="bk-preview"><div class="pv-head"><h4>免费试读 · 3 题</h4><span>含答案解析</span></div>'+prev+
      '<div class="pv-more">完整版 100 题 · 5 单元 · 逐题解析</div></div>'+
    '<button class="btn btn-ghost" style="width:100%;margin-top:12px" onclick="openTrapWords()">查看 443 核心词熟练度</button>'+
    '<div class="bk-preview" style="margin-top:14px"><div class="pv-head"><h4>高考常考变体词汇 · 12 词</h4><span>'+(tc.variants_total||0)+' 条变体提示</span></div>'+
      variantPreview+
      '<div class="pv-more">完整版 '+((tc.words)||100)+' 词 × 词形 / 形近 / 搭配 / 常见义四类提示</div></div>';
}
function quizBookBuy(){
  const b=quizSample(),t=b.meta.pricing.tiers[quizTier];
  buyItem={key:'quiz',n:'《'+b.meta.name+'》· '+t.name,d:t.count+' 题 + 逐题解析',p:t.price,
           cover:'linear-gradient(150deg,#b45309,#78350f)',coverText:'熟词僻义<br>100题专项'};
  couponUsed=false;payStage='buy';renderBuy();openMask(document.getElementById('sheet').innerHTML);
}
function openBook3(){quizTier=0;renderBook3();go('s-book3');}

/* ==================== 30天冲刺计划表 · 详情 + 试读 ==================== */
let planTier=0;
function planSample(){
  const src=(typeof CTX_PLAN!=='undefined'&&CTX_PLAN)?CTX_PLAN:{meta:{name:'30 天冲刺计划表 + 单词打卡表',subtitle:'四轮递进 · 每日梯度',status:'样本卷',description:'',coverage:{}},days:[]};
  const total=(src.days&&src.days.length)||30;
  src.meta=Object.assign({},src.meta,{pricing:{currency:'CNY',tiers:[{name:'完整版',days:total,price:2.9}]}});
  return src;
}
function renderBook4(){
  const body=document.getElementById('book4Body');if(!body)return;
  const b=planSample(),m=b.meta,tiers=m.pricing.tiers,cur=tiers[planTier];
  const pts=[
    ['四轮递进','逐词打底 → 高频突破 → 语境强化 → 提取复习，节奏有据'],
    ['每日明确','每天学多少、复习什么、周日做什么复盘，一目了然'],
    ['先新后固','前两周学完 100 词，后两周只做语境与提取，不引新词'],
    ['可打印打卡','A4 双面打印，每日勾选，30 天进度看得见']
  ];
  const tiersHtml=tiers.map((t,i)=>
    '<div class="bk-tier'+(i===planTier?' on':'')+'" onclick="planTier='+i+';renderBook4()">'+
      '<div class="lt"><b>'+t.name+'</b><span>'+t.days+' 天计划</span></div>'+
      '<div class="rt">¥'+t.price.toFixed(1)+'</div></div>').join('');
  const days=b.days||[];
  // 按阶段分组渲染试读网格（全部30天）
  let grid='',lastPhase='';
  days.forEach(d=>{
    if(d.phase!==lastPhase){lastPhase=d.phase;grid+='<div class="pl-phase">'+d.phase+'</div><div class="pl-grid">';}
    grid+='<div class="pl-cell'+(d.is_review?' review':'')+'">'+
      '<div class="d">D'+d.day+'</div>'+
      '<div class="n">'+(d.is_review?'复习':('+'+d.new_count))+'</div>'+
      '<div class="t">'+(d.review_task?'复盘':'新词')+'</div></div>';
    if(d.day===days.length)grid+='</div>';
  });
  const reviewDays=days.filter(d=>d.review_task).slice(0,2).map(d=>
    '<div class="pl-review">D'+d.day+'：'+d.review_task+'</div>').join('');
  body.innerHTML=
    '<div class="bk4-cover"><span class="bk-badge">'+(m.status||'')+'</span>'+
      '<div class="bk-eyebrow">30 天 · 冲刺计划</div>'+
      '<h2>'+m.name+'</h2><div class="bk-sub">'+m.subtitle+'<br>'+
      '30 天 · 100 词 · 4 阶段'+(m.method?' · '+m.method.split('：')[0]:'')+'</div></div>'+
    '<div class="bk-pts">'+pts.map(p=>
      '<div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>'+p[0]+'</b> · '+p[1]+'</div></div>').join('')+'</div>'+
    '<div class="bk-tiers">'+tiersHtml+'</div>'+
    (Store.hasBook('plan')?'<button class="btn btn-primary" style="width:100%;opacity:.7" disabled>已解锁 · 本书可直接使用</button>':'<button class="btn btn-primary" style="width:100%" onclick="planBookBuy()">购买'+cur.name+' ¥'+cur.price.toFixed(1)+'</button>')+
    '<p style="text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.5;margin:9px 2px 0">'+m.description+'</p>'+
    '<div class="bk-preview"><div class="pv-head"><h4>计划表试读 · 全 30 天</h4><span>每日词量梯度</span></div>'+
      grid+reviewDays+'</div>';
}
function planBookBuy(){
  const b=planSample(),t=b.meta.pricing.tiers[planTier];
  buyItem={key:'plan',n:'《'+b.meta.name+'》· '+t.name,d:t.days+' 天计划 + 可打印打卡表',p:t.price,
           cover:'linear-gradient(150deg,#0369a1,#075985)',coverText:'30天冲刺<br>计划打卡表'};
  couponUsed=false;payStage='buy';renderBuy();openMask(document.getElementById('sheet').innerHTML);
}
function openBook4(){planTier=0;renderBook4();go('s-book4');}
function famNetHtml(lw){
  const fam=lw.word_family||[], conf=lw.confusable||[];
  if(!fam.length&&!conf.length)return '';
  const fm=Store.familyMastery(lw.w), pct=Math.round(fm*100);
  const due=Store.familyDueText(lw.w);
  const state=pct>=90?'已稳固':(pct>0?'巩固中':'未学');
  const deriv=fam.map(x=>'<span class="fchip derived">'+x+'</span>').join('');
  const confs=conf.map(x=>'<span class="fchip conf">'+x+'</span>').join('');
  return '<div class="bk-title">词形网 · 一核散整族</div>'+
    '<div class="fam-wrap">'+
      '<div class="fam-hd"><span class="fam-core">'+lw.w+'</span>'+
        '<span class="fam-state">词形网 '+state+(due?' · '+due:'')+'</span></div>'+
      (deriv?'<div class="fam-group"><div class="fam-lbl"><span class="dot deriv"></span>派生 / 词形变化</div>'+
        '<div class="fam-chips">'+deriv+'</div></div>':'')+
      (confs?'<div class="fam-group"><div class="fam-lbl"><span class="dot conf"></span>形近音近 · 易混</div>'+
        '<div class="fam-chips">'+confs+'</div></div>':'')+
      (pct>0?'<div class="fam-mast"><div class="mast-bar"><div class="mast-fill" style="width:'+pct+'%"></div></div>'+
        '<div class="mast-meta"><span>词形网掌握度 '+pct+'%</span><span>'+(fam.length+conf.length)+' 个成员</span></div></div>':'')+
    '</div>';
}
function renderStudy(){
  if(!studyQueue.length)studyQueue=buildStudyQueue(studyMode);
  const total=studyQueue.length;
  if(studyPos>=total){ renderStudyDone(); return; }
  const lw=studyQueue[studyPos];
  if(!curQ||curQ._word!==lw.w){ curQ=buildQuestion(lw); curQ._word=lw.w; studyAnswered=false; }
  const q=curQ, fs=focusSense(lw);
  const done=studyPos;
  document.getElementById('spbar').style.width=Math.round(done/total*100)+'%';
  document.getElementById('scnt').textContent=done+'/'+total;
  const modes=STUDY_MODES.map(m=>'<button data-m="'+m[0]+'" class="'+(studyMode===m[0]?'on':'')+'" onclick="setStudyMode(\''+m[0]+'\')">'+m[1]+'</button>').join('');
  const opts=q.options.map((t,i)=>{
    let cls='', mk='';
    if(studyAnswered){
      if(i===q.answer){cls=' correct';mk='<span class="mk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';}
      else if(i===q.picked){cls=' wrong';mk='<span class="mk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>';}
    }
    return '<button class="qopt'+cls+(studyAnswered?' picked':'')+'" onclick="answerQuestion('+i+')">'+
      '<span class="idx">'+'ABCD'[i]+'</span><span class="ot">'+t+'</span>'+mk+'</button>';
  }).join('');
  let feedHtml='';
  if(studyAnswered){
    const ok=q.picked===q.answer;
    if(studyMode==='daily'){
      if(ok){
        // 答对：只给轻反馈，自动跳题；昨日错词答对给专属正反馈
        const wasWrong=!!lw.prevWrong;
        feedHtml='<div class="qfeed ok"><b>'+(wasWrong?'上次错了，这次对了 · 正在进入下一题…':'答对了 · 正在进入下一题…')+'</b>'+
          '<div class="why">'+(wasWrong?'昨天的错词今天拿下了，这个词会拉长复习间隔':'掌握度已更新，这个词会按遗忘曲线安排下次复习')+'</div></div>';
      }else{
        // 答错：词卡已翻到背面，展示完整词义，用户看完再点下一题
        feedHtml='<div class="qfeed no"><b>答错了 · 已翻开词卡背面</b>'+
          '<div class="why">剩余时间看词义 / 例句 / 搭配，理解后点「下一题」；这个词本轮稍后会再出现一次。</div></div>'+
          '<button class="btn btn-primary qnext" onclick="nextQuestion()">下一题 <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>';
      }
    }else{
      const head=ok?(q.fast?'答对了 · 熟练度已更新':'答对了 · 已按 FSRS 拉长复习间隔')
                   :'答错了 · 已重排到本轮后段再练';
      feedHtml='<div class="qfeed '+(ok?'ok':'no')+'">'+
        '<b>'+head+'</b>'+
        '<div class="why">'+q.explain+'</div></div>'+
        '<button class="btn btn-primary qnext" onclick="nextQuestion()">下一题 <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>'+
        '<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="'+
          (q.fast?('openQuick(\''+lw.w+'\')'):('showStudyCard(\''+lw.w+'\')'))+'">'+
          (q.fast?'看词条详情':'看完整词卡与义项树')+'</button>';
    }
  }
  document.getElementById('studyBody').innerHTML=
    '<div class="smodes">'+modes+'</div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
      '<span class="qbadge '+q.tagCls+'">'+(q.tagCls==='fam'?'◆':(q.tagCls==='trap'?'⚑':'●'))+' '+q.tagLabel+'</span>'+
      (studyMode==='daily'&&lw.stage?'<span class="qbadge" style="background:var(--accent-tint);color:var(--accent-deep)">'+DAILY_STAGE_NAME[lw.stage]+'</span>':'')+
      '<span style="font-size:11px;color:var(--ink-3)">'+studyModeName(studyMode)+' · 第 '+(studyPos+1)+'/'+total+' 题</span>'+
    '</div>'+
    (studyMode==='daily'
      ? '<div class="wcard-wrap"><div class="wcard'+(dailyFlipped?' flip':'')+'" id="dailyCard">'+
          '<div class="face front" style="min-height:0;padding:20px 18px">'+
            '<div class="w-ipa" style="margin-top:0">'+lw.ipa+' · '+lw.pos+'</div>'+
            '<div class="qstem">'+q.prompt+'</div>'+
            '<div class="qopts">'+opts+'</div>'+
          '</div>'+
          '<div class="face back" style="padding:18px 16px">'+dailyCardBackHtml(lw)+'</div>'+
        '</div></div>'
      : '<div class="wcard-wrap"><div class="face" style="min-height:0;padding:20px 18px">'+
          '<div class="w-ipa" style="margin-top:0">'+lw.ipa+' · '+lw.pos+'</div>'+
          '<div class="qstem">'+q.prompt+'</div>'+
          '<div class="qopts">'+opts+'</div>'+
        '</div></div>')+
    '<div class="study-foot">'+feedHtml+
      (studyAnswered?'':'<p class="fsrs-line">'+(studyMode==='daily'
        ?'今日任务 · 答对自动进入下一题 · 答对就过，答错翻卡看详解'
        :'选择答案后按 FSRS 记录这次记忆 · 答错会自动重排再练')+'</p>')+
    '</div>';
  const scr=document.getElementById('s-study');
  if(scr)scr.scrollTop=0;
}
function studyModeName(m){
  const f=STUDY_MODES.find(x=>x[0]===m);return f?f[1]:'智能混合';
}
/* 作答：判分并立即把结果喂给 FSRS（义项卡 + 词形网），记录本轮统计 */
function answerQuestion(i){
  if(studyAnswered)return;
  studyAnswered=true;
  const q=curQ, lw=studyQueue[studyPos];
  q.picked=i;
  const ok=(i===q.answer);
  const beforeLearned=Store.learnedCount(), beforeLevel=Store.levelInfo().idx;
  const rating=ok?3:1;
  if(lw.fast||q.fast){
    // 非精修覆盖词：简化题走 practiceQuick，熟练度/次数回流到全量进度口径
    Store.practiceQuick(lw.w,rating);
    sched={s:0,d:0,iv:0,r:ok?1:0,label:ok?'答对':'答错',famIv:0};
  }else{
    const res=Store.reviewSense(q.senseId,rating,lw.w);
    const fres=Store.reviewFamily(lw.w,rating,'study');
    sched={s:res.card.s,d:res.card.d,iv:res.interval,r:res.r,label:ok?'答对':'答错',famIv:fres.interval};
  }
  if(ok)studyRight++;else studyWrong++;
  if(studyMode==='daily'){
    if(!ok) Store.noteDailyWrong(lw.w);                    // 错词归档，供次日跨天回带
    else if(lw.prevWrong) dailyPrevWrongFixed++;           // 昨日错词今天拿下，收官卡展示
  }
  syncStats();
  // 清理上一次可能残留的自动跳题定时器
  if(dailyAutoAdvanceTimer){clearTimeout(dailyAutoAdvanceTimer);dailyAutoAdvanceTimer=null;}
  const ms=Store.crossedMilestone(beforeLearned), lv=Store.crossedLevel(beforeLevel);

  if(studyMode==='daily'){
    dailyFlipped=!ok; // 答错翻到背面看词义，答对保持正面
    if(ok){
      // 答对：轻 toast；昨日错词答对给专属正反馈
      showReward(lw.prevWrong?'上次错了，这次对了':'答对了',
        lw.w+' · '+(lw.prevWrong?'昨日错词已拿下':'自动进入下一题'), false);
      renderGrowth(true);
      dailyAutoAdvanceFn=function(){
        dailyAutoAdvanceFn=null;
        if(!curQ||studyPos>=studyQueue.length)return;
        curQ=null;studyAnswered=false;sched=null;dailyFlipped=false;
        studyPos++;renderStudy();
      };
      renderStudy();
      if(ms||lv){
        afterLearn(beforeLearned,beforeLevel,'已学 '+Store.learnedCount()+' 词',dailyAutoAdvanceFn);
      }else{
        dailyAutoAdvanceTimer=setTimeout(function(){
          dailyAutoAdvanceTimer=null;
          if(dailyAutoAdvanceFn)dailyAutoAdvanceFn();
        },900);
      }
      return;
    }
    // 答错：不自动跳，等用户点「下一题」；toast 与庆祝可并存
    showReward('答错了 · 看词卡详解', lw.w+' · '+q.tagLabel, false);
    renderGrowth(true);
    if(ms||lv) afterLearn(beforeLearned,beforeLevel,'已学 '+Store.learnedCount()+' 词',null);
    renderStudy();
    return;
  }

  // 其他模式：保持原交互（手动下一题）
  showReward(ok?'答对了':'答错了 · 已重排', lw.w+' · '+q.tagLabel, ok&&false);
  renderGrowth(true);
  if(ms||lv) afterLearn(beforeLearned,beforeLevel,'已学 '+Store.learnedCount()+' 词',null);
  renderStudy();
}
/* 下一题：答错则把该题插到本队尾再练一次，答对则前进 */
function nextQuestion(){
  if(dailyAutoAdvanceTimer){clearTimeout(dailyAutoAdvanceTimer);dailyAutoAdvanceTimer=null;}
  dailyAutoAdvanceFn=null;
  const q=curQ, ok=q&&q.picked===q.answer;
  if(!ok && studyRequeued<5 && q){
    const lw=studyQueue[studyPos];
    studyQueue.push(lw); // 答错重排到本轮后段
    studyRequeued++;
  }
  studyPos++;
  curQ=null;studyAnswered=false;sched=null;dailyFlipped=false;
  renderStudy();
}
/* 从训练题跳到完整词卡浏览（保留原翻卡查看，不作为评价入口） */
let _cardWord=null;
function showStudyCard(word){
  _cardWord=word;
  const lw=LEX.find(x=>x.w===word);if(!lw)return;
  const fs=focusSense(lw), fm=Store.mastery(fs.sense_id);
  const body=document.getElementById('studyBody');
  body.innerHTML=
    '<div class="backbar"><button class="icon-btn" onclick="closeStudyCard()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><h3>完整词卡 · '+lw.w+'</h3></div>'+
    '<div class="bk-row"><span class="bk '+lw.tagc+'">'+lw.tag+'</span><span class="w-def" style="margin:0;font-size:13px">'+fs.text+'</span></div>'+
    '<div class="wcard-wrap"><div class="face" style="min-height:0;padding:18px">'+
      '<div class="bk-title">义项树 · 掌握度挂在义项上</div>'+
      '<div class="sense-tree">'+lw.senses.map(s=>senseRow(lw,s)).join('')+'</div>'+
      '<div class="bk-title">焦点义项例句</div>'+
      (fs.example&&fs.example.en?'<div class="ex"><p>'+fs.example.en+'</p><div class="zh">'+fs.example.zh+'</div></div>':'<div style="font-size:12px;color:var(--ink-3)">（暂无例句）</div>')+
      '<div class="bk-title">高频搭配</div><div class="cols">'+(fs.collocations||[]).map(c=>'<span class="col">'+c+'</span>').join('')+'</div>'+
      '<div class="bk-title">易错点</div><div class="word-note">'+lw.note+'</div>'+
      famNetHtml(lw)+
    '</div></div>'+
    '<button class="btn btn-primary" onclick="closeStudyCard()">返回继续训练</button>';
  const scr=document.getElementById('s-study');if(scr)scr.scrollTop=0;
}
function closeStudyCard(){curQ=null;renderStudy();}

/* 今日任务答错后翻到的词卡背面：完整描述信息。
 * 精修词：音标词性 + 义项树 + 例句 + 搭配 + 易错点 + 词形网；
 * 非精修词：音标词性 + 自研释义 + 主题语义场。 */
function dailyCardBackHtml(lw){
  let s='<div class="w-word" style="font-size:26px">'+lw.w+'</div>'+
    '<div class="w-ipa">'+(lw.ipa||'')+'</div>'+
    '<div class="w-pos">'+(Array.isArray(lw.pos)?lw.pos.slice(0,3).join(' / '):(lw.pos||'考纲词'))+'</div>';
  if(!lw.fast){
    const fs=focusSense(lw);
    s+='<div class="bk-title">义项树 · 掌握度挂在义项上</div>'+
      '<div class="sense-tree">'+lw.senses.map(x=>senseRow(lw,x)).join('')+'</div>';
    if(fs&&fs.example&&fs.example.en){
      s+='<div class="bk-title">仿真例句</div>'+
        '<div class="ex"><p>'+fs.example.en+'</p><div class="zh">'+fs.example.zh+'</div></div>';
    }
    const cols=(fs&&fs.collocations)||[];
    if(cols.length){
      s+='<div class="bk-title">高频搭配</div><div class="cols">'+
        cols.map(c=>'<span class="col">'+c+'</span>').join('')+'</div>';
    }
    if(lw.note)s+='<div class="bk-title">易错点</div><div class="word-note">'+lw.note+'</div>';
    s+=famNetHtml(lw);
  }else{
    const entry=fastMeanMap()[lw.w];
    if(entry&&entry.senses.length){
      s+='<div class="bk-title">核心释义 · 自研改写</div>'+
        '<div class="sense-tree">'+entry.senses.map(x=>
          '<div class="sense-row"><div class="sense-top"><span class="sense-txt">'+
          (x.pos?'<span style="color:var(--accent-deep)">'+x.pos+'</span> ':'')+x.text+
          '</span></div></div>').join('')+'</div>';
    }
    if(lw.theme)s+='<div class="bk-title">主题语义场</div><div class="cols"><span class="col">'+
      String(lw.theme).replace(/^T-/,'')+'</span></div>';
    s+='<div class="word-note" style="margin-top:10px">覆盖层词条：本层交付词形 / 音标 / 词性索引。'+
      '该词已按本次作答记入熟练度，后面会按遗忘曲线再次出现。</div>';
  }
  return s;
}
/* ==================== 今日任务收官卡 ====================
 * 把「做完 20 词」变成看得见的成就：正确率 / 三段构成 / 昨日错词攻克 /
 * 连续打卡 / 距高考剩余词量，全部来自真实 Store 与本次作答统计。
 * 可一键生成成果图（canvas 本地绘制，不上传、不含任何个人信息）。 */
function dailyWrapData(){
  const total=studyRight+studyWrong;
  const plan=getDailyPlan();
  const st=Store.stats();
  const learnedAll=(typeof CTX_COVERAGE!=='undefined'&&CTX_COVERAGE.all)?CTX_COVERAGE.all.length:4110;
  const remain=Math.max(0,learnedAll-Store.learnedCount());
  const days=Math.max(0,Math.ceil((GAOKAO_DATE-new Date())/86400000));
  return {
    right:studyRight, wrong:studyWrong, answered:total,
    acc:total?Math.round(studyRight/total*100):0,
    counts:plan.counts||{new:0,review:0,consolidate:0},
    prevFixed:dailyPrevWrongFixed, streak:st.streak||0,
    remain:remain, days:days, learned:Store.learnedCount(), total:learnedAll
  };
}
function renderDailyWrap(){
  const d=dailyWrapData();
  const planTotal=(getDailyPlan().total)||studyQueue.length;
  document.getElementById('spbar').style.width='100%';
  // 答错会重排追加队列，用真实作答数收口，避免出现 21/20 这类不自洽数字
  document.getElementById('scnt').textContent=d.answered+'/'+planTotal;
  const seg=d.counts;
  document.getElementById('studyBody').innerHTML=
    '<div class="dw-wrap">'+
      '<div class="dw-hero">'+
        '<div class="dw-ic"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
        '<div class="dw-k">今日任务完成</div>'+
        '<div class="dw-acc"><b>'+d.acc+'</b><small>%</small></div>'+
        '<div class="dw-accsub">本轮正确率 · 答对 '+d.right+' / 作答 '+d.answered+'</div>'+
      '</div>'+
      '<div class="dw-grid">'+
        '<div class="dw-cell"><b>'+seg.new+'</b><span>新学</span></div>'+
        '<div class="dw-cell"><b>'+seg.review+'</b><span>复习</span></div>'+
        '<div class="dw-cell"><b>'+seg.consolidate+'</b><span>巩固</span></div>'+
      '</div>'+
      '<div class="dw-lines">'+
        '<div class="dw-line"><span class="li">昨日错词攻克</span><b>'+d.prevFixed+' 个</b><span class="hint">'+(d.prevFixed?'上次错，这次对了':'今天没有回带的错词')+'</span></div>'+
        '<div class="dw-line"><span class="li">连续打卡</span><b>'+d.streak+' 天</b><span class="hint">保持节奏</span></div>'+
        '<div class="dw-line"><span class="li">距 2027 高考</span><b>'+d.days+' 天</b><span class="hint">还剩 '+d.remain+' 词没学</span></div>'+
      '</div>'+
      '<button class="btn btn-primary" onclick="exportDailyPoster()">生成今日成果图</button>'+
      '<button class="btn btn-ghost" style="margin-top:9px" onclick="resetStudy()">再来一轮</button>'+
      '<button class="btn btn-line" style="margin-top:4px" onclick="go(\'s-home\')">回到首页看进步</button>'+
    '</div>';
  const scr=document.getElementById('s-study');if(scr)scr.scrollTop=0;
}
function exportDailyPoster(){
  const d=dailyWrapData();
  if(typeof document.createElement!=='function')return null;
  const cv=document.createElement('canvas');
  if(!cv||typeof cv.getContext!=='function')return null;
  cv.width=750;cv.height=1000;
  const g=cv.getContext('2d');
  g.fillStyle='#0f766e';g.fillRect(0,0,750,1000);
  g.fillStyle='#ffffff';g.font='bold 40px sans-serif';g.fillText('拾词 · 今日任务完成',60,110);
  g.font='bold 150px sans-serif';g.fillText(d.acc+'%',60,300);
  g.font='30px sans-serif';g.fillText('本轮正确率 · 答对 '+d.right+' / '+d.answered,60,350);
  g.font='28px sans-serif';
  g.fillText('新学 '+d.counts.new+'  ·  复习 '+d.counts.review+'  ·  巩固 '+d.counts.consolidate,60,430);
  g.fillText('昨日错词攻克 '+d.prevFixed+' 个',60,480);
  g.fillText('连续打卡 '+d.streak+' 天',60,530);
  g.fillText('距 2027 高考 '+d.days+' 天 · 还剩 '+d.remain+' 词',60,580);
  g.font='24px sans-serif';g.fillStyle='#b7e4dd';
  g.fillText('例句为仿真语境 · 不含真题与教材原文',60,900);
  let url='';
  try{ url=cv.toDataURL('image/png'); }catch(e){ return null; }
  const a=document.createElement('a');
  a.href=url;a.download='拾词今日成果.png';
  const p=document.body||document.documentElement;
  if(p&&p.appendChild)p.appendChild(a);
  if(typeof a.click==='function')a.click();
  if(a.parentNode&&a.parentNode.removeChild)a.parentNode.removeChild(a);
  return {href:url.slice(0,30),name:a.download};
}
function renderStudyDone(){
  if(studyMode==='daily'){ renderDailyWrap(); return; }
  const total=studyRight+studyWrong;
  const acc=total?Math.round(studyRight/total*100):0;
  document.getElementById('spbar').style.width='100%';
  document.getElementById('scnt').textContent=studyPos+'/'+studyQueue.length;
  document.getElementById('studyBody').innerHTML=
    '<div class="done-wrap">'+
      '<div class="done-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
      '<h3>本轮训练完成</h3><p>'+studyModeName(studyMode)+' · 已按 FSRS 排入下次复习</p>'+
      '<div class="qres-grid">'+
        '<div class="ms"><b style="color:var(--accent-deep)">'+studyRight+'</b><span>答对</span></div>'+
        '<div class="ms"><b style="color:var(--danger)">'+studyWrong+'</b><span>答错</span></div>'+
        '<div class="ms"><b>'+acc+'%</b><span>正确率</span></div>'+
      '</div>'+
      '<button class="btn btn-primary" onclick="resetStudy()">再来一轮</button>'+
      '<button class="btn btn-ghost" style="margin-top:10px" onclick="go(\'s-home\')">回到首页看进步</button>'+
    '</div>';
}
function fsrsLineHtml(){
  if(sched){
    return 'FSRS-5 · 稳定度 S='+sched.s.toFixed(2)+' · 难度 D='+sched.d.toFixed(2)+
      '<span class="sched">本次「'+sched.label+'」→ 义项 '+FSRS.intervalText(sched.iv)+' · 词形网 '+FSRS.intervalText(sched.famIv||0)+'（留存 '+Math.round(sched.r*100)+'%）</span>';
  }
  const lw=LEX[wIdx], fs=focusSense(lw);
  const c=Store.load().cards[fs.sense_id];
  if(c&&c.state!==FSRS.STATE.NEW){
    return 'FSRS-5 · 稳定度 S='+c.s.toFixed(2)+' · 难度 D='+c.d.toFixed(2)+
      ' · 下次复习 '+FSRS.intervalText(Math.max(0,Math.round((c.due-Date.now())/FSRS.DAY)));
  }
  return 'FSRS-5 间隔重复 · 三个评价档位会算出不同的下次复习时间';
}
function flipCard(){flipped=!flipped;document.getElementById('wcard').classList.toggle('flip',flipped);}
function rate(k,btn){
  const RATING={unknown:1,vague:2,known:3};
  const LABEL={unknown:'不认识',vague:'模糊',known:'认识'};
  const lw=LEX[wIdx], fs=focusSense(lw);
  const beforeLearned=Store.learnedCount(), beforeLevel=Store.levelInfo().idx;
  const res=Store.reviewSense(fs.sense_id,RATING[k],lw.w);
  const fres=Store.reviewFamily(lw.w,RATING[k],'study'); // 词形网随核心词一起复习
  rated[k]++;
  if(btn)btn.classList.add('on');
  sched={s:res.card.s,d:res.card.d,iv:res.interval,r:res.r,label:LABEL[k],famIv:fres.interval};
  syncStats();
  const line=document.getElementById('fsrsLine');
  if(line)line.innerHTML=fsrsLineHtml();
  // 下一张：庆祝弹层弹出时交给「继续学习」按钮触发，否则定时自动前进
  const advance=()=>{sched=null;if(wIdx<LEX.length-1){wIdx++;flipped=false;renderStudy();}else{showDone();}};
  const ms=Store.crossedMilestone(beforeLearned), lv=Store.crossedLevel(beforeLevel);
  if(ms||lv){
    afterLearn(beforeLearned,beforeLevel,'已学 '+Store.learnedCount()+' 词',advance);
  }else{
    showReward(RATING[k]===1?'已加入复习':'掌握度已更新', lw.w+' · 累计 '+Store.learnedCount()+' 词', false);
    renderGrowth(true);
    setTimeout(advance,1100);
  }
}
function showDone(){
  const t=LEX.length;
  const st=Store.stats();
  document.getElementById('spbar').style.width='100%';
  document.getElementById('scnt').textContent=t+'/'+t;
  document.getElementById('studyBody').innerHTML=
  '<div class="done-wrap">'+
    '<div class="done-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
    '<h3>本轮完成</h3><p>'+t+' 词 · 已按 FSRS 排入下次复习</p>'+
    '<div class="done-stats">'+
      '<div><b style="color:var(--danger)">'+rated.unknown+'</b><span>不认识</span></div>'+
      '<div><b style="color:var(--warn)">'+rated.vague+'</b><span>模糊</span></div>'+
      '<div><b style="color:var(--accent-deep)">'+rated.known+'</b><span>认识</span></div>'+
    '</div>'+
    '<div class="sense-tree" style="margin-top:14px;text-align:left">'+
      LEX.map(function(lw){var fs=focusSense(lw);return senseRow(lw,fs);}).join('')+
    '</div>'+
    '<button class="btn btn-primary" onclick="go(\'s-err\')">查看本轮失分归因</button>'+
    '<button class="btn btn-ghost" style="margin-top:10px" onclick="resetStudy();renderStudy()">再背一轮</button>'+
  '</div>';
}

/* ==================== QUIZ ==================== */
function renderQuiz(){
  const locked=qIdx>=3&&!Store.hasAll();
  if(locked){renderPayWallQuiz();return;}
  const q=QUIZ[qIdx];
  let opts='';
  q.opts.forEach((o,i)=>{
    let cls='opt';
    if(qAnswered){
      cls+=' locked';
      if(i===q.right)cls+=' right';
      else if(i===q.picked)cls+=' wrong';
    }
    opts+='<button class="'+cls+'" onclick="pick('+i+')"><span class="k">'+'ABCD'[i]+'</span><span class="t">'+o+'</span></button>';
  });
  let fb='';
  if(qAnswered){
    const ok=q.picked===q.right;
    fb='<div class="feedback '+(ok?'right':'wrong')+' on">'+
      '<h4><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+(ok?'<path d="M20 6 9 17l-5-5"/>':'<path d="M18 6 6 18M6 6l12 12"/>')+'</svg>'+(ok?'答对了':'答错了 · 正确答案 '+'ABCD'[q.right])+'</h4>'+
      '<p>'+q.zh+'</p>'+
      '<div class="rule"><b>考点</b> · '+q.rule+'</div>'+
      trapVarHtml(q.headword,5)+
      (quizReflow?'<div class="reflow-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>错因 '+q.errCode+' 已回流到「'+q.headword+'」词形网，下次优先复习</div>':'')+
      '</div>';
  }
  document.getElementById('quizBody').innerHTML=
    '<div class="qprog"><div class="pbar"><i style="width:'+Math.round(qIdx/QUIZ.length*100)+'%"></i></div><span class="cnt">第 '+(qIdx+1)+'/'+QUIZ.length+' 题</span></div>'+
    '<div class="qstem"><span class="tag">'+q.tag+'</span><p>'+q.stem.replace('___','<span class="blank">&nbsp;&nbsp;?&nbsp;&nbsp;</span>')+'</p></div>'+
    '<div class="opts">'+opts+'</div>'+
    fb+
    (qAnswered?'<button class="btn btn-primary" style="margin-top:14px" onclick="nextQ()">'+(qIdx<QUIZ.length-1?'下一题':'查看本次成绩')+'</button>':'');
}
function pick(i){
  if(qAnswered)return;
  qAnswered=true;
  QUIZ[qIdx].picked=i;
  const correct=(i===QUIZ[qIdx].right);
  if(correct){qRight++;qScore++;}
  else{qWrong++;}
  // 写入真实统计：累计题数、错题数、正确率、连续打卡、错因、题型
  // 词形维度错因(E3/E5/E9)会回流到对应词形网，触发重排
  const q=QUIZ[qIdx];
  const res=Store.quizAnswer(correct, (q.tag||'熟词僻义').split(' · ')[0], q.type, q.headword, q.errCode);
  quizReflow=res&&res.reflowed;
  syncStats();
  renderQuiz();
  if(correct) showReward('答对了', '熟词僻义 · 正确率 '+Store.stats().accuracy+'%', false);
}
function nextQ(){
  quizReflow=false;
  if(qIdx<QUIZ.length-1){qIdx++;qAnswered=false;renderQuiz();}
  else{renderQuizResult();}
}
function renderQuizResult(){
  const pct=Math.round(qRight/QUIZ.length*100);
  // 错因归类：按本机真实错题分布出，不用写死百分比
  const bm=Store.load().quiz.byModule||{};
  const tot=Object.keys(bm).reduce(function(a,k){return a+bm[k];},0);
  const rows=ERR_CATS.map(function(c){return {c:c,v:bm[c.k]||0};}).filter(function(r){return r.v>0;}).sort(function(a,b){return b.v-a.v;});
  let benchHtml='<div style="font-size:12.5px;font-weight:700;margin-bottom:9px">错因归类</div>';
  if(tot&&rows.length){
    const shown=rows.slice(0,2);
    benchHtml+=shown.map(function(r,i){
      const p=Math.round(100*r.v/tot);
      return '<div class="bench'+(i===0?' top':'')+'"><span class="bench-label">'+r.c.label+'</span><div class="bench-track"><div class="bench-fill" style="width:'+Math.max(p,3)+'%"></div></div><span class="bench-val">'+p+'%</span></div>';
    }).join('');
    const sum=shown.reduce(function(a,r){return a+r.v;},0);
    benchHtml+='<div style="font-size:11.5px;color:var(--ink-3);margin-top:11px;line-height:1.55">'+(shown.length>1?'这两类':'这类')+'错因占你全部词汇失分的 <b style="color:var(--ink)">'+Math.round(100*sum/tot)+'%</b>。'+(Store.hasAll()?'完整失分地图与针对性词单已解锁。':'解锁全包可查看完整失分地图与针对性词单。')+'</div>';
  }else{
    benchHtml+='<div style="font-size:11.5px;color:var(--ink-3);line-height:1.55">本轮没有错题记录。'+(Store.hasAll()?'完整失分地图与针对性词单已解锁。':'解锁全包可查看完整失分地图与针对性词单。')+'</div>';
  }
  // 本次错词的变体清单：属于用户自己的错因回流，免费可见。
  const wrongQs=QUIZ.filter(function(q){return q.picked!==undefined&&q.picked!==q.right;});
  let wrongHtml='';
  if(wrongQs.length){
    wrongHtml='<div class="card" style="padding:15px;text-align:left;margin-bottom:16px">'+
      '<div style="font-size:12.5px;font-weight:700;margin-bottom:9px">本次错词 · 变体清单</div>'+
      wrongQs.slice(0,6).map(function(q){
        const x=trapMap()[q.headword]||{};
        return '<div style="margin-bottom:10px"><div style="font-size:11.5px;font-weight:700;color:var(--ink);margin-bottom:3px">'+
          q.headword+' · '+(x.sense_text||'')+'</div>'+trapVarHtml(q.headword,4)+'</div>';
      }).join('')+
      (wrongQs.length>6?'<div class="pv-more">另有 '+(wrongQs.length-6)+' 个错词已计入错因回流</div>':'')+
    '</div>';
  }
  document.getElementById('quizBody').innerHTML=
    '<div class="done-wrap">'+
      '<div class="done-ic" style="background:'+(pct>=70?'var(--accent-tint)':'var(--warn-tint)')+';color:'+(pct>=70?'var(--accent-deep)':'#b45309')+'"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div>'+
      '<h3>正确率 '+pct+'%</h3><p>答对 '+qRight+' 题 · 答错 '+qWrong+' 题 · 用时 4 分 12 秒</p>'+
      '<div class="card" style="padding:15px;text-align:left;margin-bottom:16px">'+
        benchHtml+
      '</div>'+
      wrongHtml+
      (Store.hasAll()?'':'<button class="btn btn-primary" onclick="openPay(\'all\')">解锁完整失分地图</button>')+
      '<button class="btn btn-ghost" style="margin-top:10px" onclick="go(\'s-err\')">'+(Store.hasAll()?'查看完整失分地图':'先看免费版失分地图')+'</button>'+
    '</div>';
}
function renderPayWallQuiz(){
  document.getElementById('quizBody').innerHTML=
    '<div class="chart-card" style="text-align:center;padding:24px 18px">'+
      '<div style="width:54px;height:54px;border-radius:16px;background:var(--accent-tint);color:var(--accent-deep);display:grid;place-items:center;margin:0 auto 13px">'+
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>'+
      '<h3 style="font-size:17px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px">免费体验已结束</h3>'+
      '<p style="font-size:12.5px;color:var(--ink-3);line-height:1.6">你已完成 3 道免费题。第 4 题起需要全包 —— 全部专项训练、仿真语境例句库和完整失分地图都在里面。</p>'+
      '<button class="btn btn-primary" style="margin-top:16px" onclick="openPay(\'all\')">购买全包 ¥9.9 继续</button>'+
      '<div style="font-size:11px;color:var(--ink-3);margin-top:12px">¥9.9 一次买断，含完整 100 题训练册 · 支持 7 天无理由退款</div>'+
    '</div>';
}

/* ==================== 核心变体词 · 熟练度反馈 ==================== */
function trapWordStats(){
  const list=trapCtx().words||[];
  const s={total:list.length,learned:0,red:0,solid:0,learning:0,fresh:0};
  list.forEach(function(x){
    const p=Store.wordProgress(x.headword);
    if(p.learned)s.learned++;else s.red++;
    if(!p.learned||p.mastery<40)s.fresh++;
    else if(p.mastery<80)s.learning++;
    else s.solid++;
  });
  return s;
}
function trapStatus(p){
  if(!p.learned)return {key:'red',label:'未学',color:'var(--danger)'};
  if(p.mastery>=80)return {key:'solid',label:'牢固',color:'var(--accent-deep)'};
  if(p.mastery>=40)return {key:'learning',label:'巩固中',color:'#b45309'};
  return {key:'fresh',label:'刚学过',color:'var(--ink-3)'};
}
function trapWordList(){
  const q=twQuery.trim().toLowerCase();
  return (trapCtx().words||[]).filter(function(x){
    if(q && x.headword.toLowerCase().indexOf(q)<0 && (x.sense_text||'').indexOf(twQuery)<0)return false;
    const p=Store.wordProgress(x.headword), st=trapStatus(p);
    return twFilter==='all' || st.key===twFilter;
  }).sort(function(a,b){
    if(a.headword===twLastWord)return -1;
    if(b.headword===twLastWord)return 1;
    const pa=Store.wordProgress(a.headword), pb=Store.wordProgress(b.headword);
    if(pa.learned!==pb.learned)return pa.learned?1:-1;
    if(pa.mastery!==pb.mastery)return pa.mastery-pb.mastery;
    return a.no-b.no;
  });
}
function renderTrapWords(){
  const body=document.getElementById('trapWordsBody');if(!body)return;
  const s=trapWordStats(), list=trapWordList(), shown=list.slice(0,twShown);
  const tabs=[['all','全部',s.total],['red','未学',s.red],['fresh','刚学过',s.fresh],
              ['learning','巩固中',s.learning],['solid','牢固',s.solid]];
  const tabsHtml=tabs.map(function(t){
    return '<button class="tw-tab'+(twFilter===t[0]?' on':'')+'" onclick="twFilter=\''+t[0]+'\';twShown=40;renderTrapWords()">'+t[1]+' '+t[2]+'</button>';
  }).join('');
  const rows=shown.map(function(x){
    const p=Store.wordProgress(x.headword), st=trapStatus(p);
    return '<div class="tw-row">'+
      '<div class="hd"><b>'+x.headword+'</b><span class="lv">'+(x.level||'')+' · '+(x.layer||'').split('-')[0]+'</span></div>'+
      '<div class="sense">'+x.sense_text+'</div>'+
      '<div class="meta">变体 '+(x.variants||[]).length+' 条 · 练过 '+p.practiced+' 次 · '+
        '<span style="color:'+st.color+';font-weight:600">'+st.label+'</span> '+(p.learned?'(绿)':'(红)')+'</div>'+
      '<div class="tw-bar"><i style="width:'+p.mastery+'%;background:'+st.color+'"></i></div>'+
      '<div class="tw-acts">'+
        '<button onclick="trapRate(\''+x.headword+'\',1)">再学</button>'+
        '<button onclick="trapRate(\''+x.headword+'\',2)">模糊</button>'+
        '<button class="primary" onclick="trapRate(\''+x.headword+'\',3)">掌握</button>'+
      '</div></div>';
  }).join('');
  body.innerHTML=
    '<div class="tw-sum">'+
      '<div class="cell"><b>'+s.total+'</b><span>核心词</span></div>'+
      '<div class="cell"><b>'+s.learned+'</b><span>已学(绿)</span></div>'+
      '<div class="cell"><b>'+s.solid+'</b><span>牢固</span></div>'+
      '<div class="cell"><b>'+s.red+'</b><span>未学(红)</span></div>'+
    '</div>'+
    '<div class="tw-tabs">'+tabsHtml+'</div>'+
    '<input class="tw-search" placeholder="搜索单词或义项" value="'+twQuery+'" onchange="twQuery=this.value;twShown=40;renderTrapWords()">'+
    (rows||'<div class="tw-empty">当前筛选下没有词</div>')+
    (list.length>shown.length?'<button class="btn btn-ghost" style="width:100%;margin-top:6px" onclick="twShown+=40;renderTrapWords()">再显示 40 词（'+shown.length+'/'+list.length+'）</button>':'');
}
function trapRate(word, level){
  const p=Store.practiceVariant(word, level);
  twLastWord=word;
  twFilter='all';
  syncStats();
  renderTrapWords();
  showReward('熟练度已更新', word+' · '+p.practiced+' 次 · '+p.mastery+'%', false);
}
function openTrapWords(){twFilter='all';twQuery='';twShown=40;renderTrapWords();go('s-trapwords');}

/* ==================== ERRORS ==================== */
document.getElementById('errList').innerHTML=ERRORS.map(e=>
  '<button class="errrow" onclick="openWord(\''+e.w+'\')"><span class="w">'+e.w+'</span><span class="m">'+e.m+'</span><span class="c">'+e.c+'</span></button>').join('');
function openWord(w){
  // 从失分地图/进度页跳入：直接展示该词完整词卡（浏览，不占用训练队列）
  if(LEX.some(x=>x.w===w)){ go('s-study'); showStudyCard(w); }
}

/* ==================== 全包 · 覆盖层 + 自研释义层 ==================== */
let fpLayer='required', fpQuery='', fpShown=8;
function coverageCtx(){
  if(typeof CTX_COVERAGE!=='undefined'&&CTX_COVERAGE)return CTX_COVERAGE;
  return {meta:{coverage:{}},required:[],recommended_sample:[],recommended_total:0};
}
function paraCtx(){
  if(typeof CTX_PARAPHRASE!=='undefined'&&CTX_PARAPHRASE)return CTX_PARAPHRASE;
  return {meta:{coverage:{}},words:[]};
}
function fpStats(){
  const c=coverageCtx(),p=paraCtx(),cov=c.meta.coverage||{},pc=p.meta.coverage||{};
  return {total:cov.total_words||0,required:cov.required||(c.required||[]).length,
          recommended:cov.recommended||c.recommended_total||0,
          deep:cov.deep_refined||0,
          paraphrased:pc.paraphrased_words||(p.words||[]).length};
}
function renderFullPackTeaser(){
  const el=document.getElementById('fullpackStats');if(!el)return;
  const s=fpStats();
  el.innerHTML='覆盖 <b>'+s.total+'</b> 词（约 3500+ 考纲范围） · 必考 <b>'+s.required+'</b> · 推荐 <b>'+s.recommended+'</b> · 自研释义 <b>'+s.paraphrased+'</b>';
}
function fpParaMap(){
  const m={};(paraCtx().words||[]).forEach(w=>{m[w.w]=w.senses||[];});return m;
}
function fpLayerWords(){
  const c=coverageCtx(),q=fpQuery.trim().toLowerCase();
  let list=[];
  if(fpLayer==='required')list=c.required||[];
  else if(fpLayer==='deep')list=(c.required||[]).filter(w=>w.deep);
  else list=c.recommended_sample||[];
  if(q)list=list.filter(w=>(w.w||'').toLowerCase().indexOf(q)>=0);
  return list;
}
function fpSetLayer(l){fpLayer=l;fpShown=8;renderFullPack();}
function renderFullPack(){
  const body=document.getElementById('fullPackBody');if(!body)return;
  const s=fpStats(),pm=fpParaMap(),list=fpLayerWords(),shown=list.slice(0,fpShown);
  const stats=[['总覆盖词数',s.total,'约 3500+ 考纲范围'],['必考层',s.required,'T1/T2 高频 + 精修词'],
               ['推荐层',s.recommended,'课标范围内补充覆盖'],['自研释义',s.paraphrased,'必考层已逐词改写']];
  const layers=[['required','必考层'],['recommended','推荐层（样例）'],['deep','深度精修']];
  const wordHtml=shown.map(w=>{
    const senses=pm[w.w];
    const senseHtml=senses?senses.map(x=>'<div class="pv-sense"><span class="pv-st">'+x.pos+' '+x.meaning+'</span>'+
      (x.collocation?'<div class="pv-col">搭配 · '+x.collocation+'</div>':'')+'</div>').join(''):
      '<div class="pv-sense"><span class="pv-st">词形索引已覆盖 · 自研释义待生成</span>'+
      '<div class="pv-src">本层当前仅交付词形/音标/词性索引，不含教材原文释义</div></div>';
    return '<div class="pv-word"><div class="pv-top"><span class="pv-w">'+w.w+'</span>'+
      '<span class="pv-ipa">'+(w.ipa||'')+(w.deep?' · 深度精修':'')+'</span></div>'+senseHtml+'</div>';
  }).join('');
  body.innerHTML=
    '<div class="bk-cover"><span class="bk-badge">覆盖层 + 自研释义层</span>'+
      '<div class="bk-eyebrow">全包 ¥9.9 · 一次买断</div><h2>高中考纲词 · 完整覆盖</h2>'+
      '<div class="bk-sub">不是教材影印：只交付词形索引与自研改写释义<br>教材原文释义不进入交付内容</div></div>'+
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:13px 2px">'+
      stats.map(x=>'<div class="card" style="padding:11px 12px"><div style="font-size:10.5px;color:var(--ink-3)">'+x[0]+'</div>'+
        '<div style="font-size:20px;font-weight:700;line-height:1.2;margin:3px 0">'+x[1]+'</div>'+
        '<div style="font-size:10px;color:var(--ink-3)">'+x[2]+'</div></div>').join('')+'</div>'+
    '<div class="bk-pts"><div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>必考层全量改写</b> · 443 词均有自研释义与典型搭配</div></div>'+
      '<div class="bk-pt"><span class="ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
      '<div><b>推荐层真实索引</b> · 词形、音标、词性、主题一应俱全</div></div></div>'+
    '<div class="bk-tiers">'+layers.map(l=>'<div class="bk-tier'+(fpLayer===l[0]?' on':'')+'" onclick="fpSetLayer(\''+l[0]+'\')"><div class="lt"><b>'+l[1]+'</b></div></div>').join('')+'</div>'+
    '<input id="fpSearch" type="search" placeholder="输入单词，检索自研释义" value="'+fpQuery+'" oninput="fpQuery=this.value;fpShown=8;renderFullPack()" '+
      'style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line);border-radius:12px;font-size:12px;background:#fff;margin:4px 0 10px">'+
    '<div class="bk-preview"><div class="pv-head"><h4>释义试读</h4><span>'+list.length+' 词 · 已展示 '+shown.length+'</span></div>'+
      (wordHtml||'<div class="pv-more">没有匹配的单词</div>')+
      (list.length>fpShown?'<div class="pv-more"><button class="btn btn-ghost" onclick="fpShown+=12;renderFullPack()">再看 12 词</button></div>':'')+'</div>'+
    (Store.hasAll()?'<button class="btn btn-primary" style="width:100%;margin-top:12px;opacity:.7" disabled>已解锁 · 全包生效中</button>':'<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="openPay(\'all\')">购买全包 ¥9.9</button>');
}
function openFullPack(){fpLayer='required';fpQuery='';fpShown=8;renderFullPack();go('s-fullpack');}

/* ==================== 单词进度（全量 4110 词 · 红绿复习）==================== */
/* 词表来源：全包覆盖层 CTX_COVERAGE.all。去重后按 tier / 搜索 / 红绿筛选。
 * 红=新词（未学），绿=已学完（用户确认口径）；默认红词排前 —— 复习频率更高。 */
function pgAll(){
  if(typeof CTX_COVERAGE==='undefined'||!CTX_COVERAGE||!CTX_COVERAGE.all)return [];
  return CTX_COVERAGE.all;
}
function pgPosOf(w){return (w&&w.pos&&w.pos.length)?w.pos.slice(0,3).join('/'):'';}
/* A-Z 首字母：跳过前导非字母（如「(be) bound to」→ b、「(get/be)used to」→ g），
 * 短语词条因此能归入真实首字母，而不是落进「#」。 */
function pgFirstLetter(word){
  const s=String(word||'');
  const m=s.match(/[a-zA-Z]/);
  return m?m[0].toLowerCase():'';
}
/* 每个字母的 word 数与已学数统计（全量去重口径，与 pgSummary 一致） */
function pgLetterStats(){
  const stat={};
  for(let i=0;i<26;i++){const c=String.fromCharCode(97+i);stat[c]={total:0,learned:0};}
  const seen={};
  pgAll().forEach(function(w){
    if(seen[w.w])return; seen[w.w]=1;
    const c=pgFirstLetter(w.w);
    if(!stat[c])return;
    stat[c].total++;
    if(Store.wordProgress(w.w).learned)stat[c].learned++;
  });
  return stat;
}
function pgList(){
  var q=pgQuery.trim().toLowerCase();
  var seen={},list=[];
  pgAll().forEach(function(w){
    if(seen[w.w])return; seen[w.w]=1;
    var p=Store.wordProgress(w.w);
    if(pgFilter==='red'&&p.learned)return;
    if(pgFilter==='green'&&!p.learned)return;
    if(pgLetter&&pgFirstLetter(w.w)!==pgLetter)return;
    if(q&&w.w.toLowerCase().indexOf(q)<0)return;
    list.push({w:w,p:p});
  });
  // 红词优先 → 必考优先 → 练习次数少的优先（把学习机会让给新词）
  list.sort(function(a,b){
    if(a.p.learned!==b.p.learned)return a.p.learned?1:-1;
    var ta=a.w.tier==='required'?0:1, tb=b.w.tier==='required'?0:1;
    if(ta!==tb)return ta-tb;
    if(a.p.practiced!==b.p.practiced)return a.p.practiced-b.p.practiced;
    return a.w.w<b.w.w?-1:1;
  });
  return list;
}
function pgSummary(){
  var seen={},red=0,green=0,practiced=0,mSum=0,total=0;
  pgAll().forEach(function(w){
    if(seen[w.w])return; seen[w.w]=1; total++;
    var p=Store.wordProgress(w.w);
    if(p.learned)green++;else red++;
    if(p.practiced>0)practiced++;
    mSum+=p.mastery;
  });
  return {total:total,red:red,green:green,practiced:practiced,
          avg:total?Math.round(mSum/total):0};
}
function pgSetFilter(f){
  pgFilter=f;pgShown=40;
  document.querySelectorAll('.pg-filter button').forEach(function(b){b.classList.toggle('on',b.dataset.f===f);});
  renderProgress();
}
/* 点选字母：再次点同一字母可取消回到全部；选字母时清空搜索，避免双重筛选困惑 */
function pgSetLetter(c){
  pgLetter=(pgLetter===c?'':c);
  if(pgLetter)pgQuery='';
  pgShown=40;
  renderProgress();
}
function pgBarCls(m){return m>=80?'hi':(m>=40?'mid':'lo');}
/* A-Z 字母索引：每格显示 字母 / 词数 / 已学数，点选筛选；进度色条反映该字母掌握进度 */
function pgAlphaHtml(){
  const stat=pgLetterStats();
  let cells='';
  for(let i=0;i<26;i++){
    const c=String.fromCharCode(97+i), v=stat[c];
    const pct=v.total?Math.round(v.learned/v.total*100):0;
    const state=v.total===0?'empty':(pct===100?'done':(pct>0?'part':'new'));
    const on=pgLetter===c?' on':'';
    cells+='<button class="pg-alpha-c '+state+on+'" data-l="'+c+'" onclick="pgSetLetter(\''+c+'\')" title="'+c.toUpperCase()+' · '+v.total+' 词 · 已学 '+v.learned+'">'+
      '<b>'+c.toUpperCase()+'</b><span>'+v.total+'</span>'+
      (v.total?'<i style="height:'+Math.max(2,pct)+'%"></i>':'')+
      '</button>';
  }
  const totalLearned=Object.keys(stat).reduce((a,c)=>a+stat[c].learned,0);
  const totalWords=Object.keys(stat).reduce((a,c)=>a+stat[c].total,0);
  return '<div class="pg-alpha">'+
    '<div class="pa-head"><span>按字母学习 · A–Z</span>'+
      '<span class="pa-tip">'+(pgLetter?('已筛选 '+pgLetter.toUpperCase()+' · 再看一次取消'):('共 '+totalWords+' 词 · 已学 '+totalLearned))+'</span></div>'+
    '<div class="pa-grid">'+cells+'</div>'+
    '<div class="pa-legend"><span><i class="st-new"></i>未开始</span><span><i class="st-part"></i>学习中</span>'+
      '<span><i class="st-done"></i>已学完</span><span class="pa-note">每格底部色条 = 该字母掌握进度</span></div>'+
    '</div>';
}
function renderProgress(){
  const body=document.getElementById('progressBody');if(!body)return;
  const s=pgSummary(),list=pgList(),shown=list.slice(0,pgShown);
  const cnt=document.getElementById('pgCnt');if(cnt)cnt.textContent=s.green+'/'+s.total;
  const paraMap=fpParaMap();
  const rows=shown.map(function(x){
    var w=x.w,p=x.p,lex=Store.isLexWord(w.w);
    var pos=pgPosOf(w);
    var tierTag=w.deep?'<span class="pg-tag deep">精修</span>':(w.tier==='required'?'<span class="pg-tag req">必考</span>':'');
    var src=p.source==='fsrs'?'FSRS':'快速';
    var act=lex
      ? '<button class="pg-learn'+(p.learned?' done':'')+'" onclick="openWord(\''+w.w+'\')">'+(p.learned?'精修':'去学')+'</button>'
      : '<button class="pg-learn'+(p.learned?' done':'')+'" onclick="openQuick(\''+w.w+'\')">'+(p.learned?'再练':'学习')+'</button>';
    return '<div class="pg-row">'+
      '<span class="pg-dot '+p.color+'"></span>'+
      '<div class="pg-main"><div class="pg-w">'+w.w+tierTag+'</div>'+
        '<div class="pg-sub">'+(w.ipa||'')+(pos?' · '+pos:'')+' · '+src+'</div></div>'+
      '<div class="pg-metric"><div class="n">'+p.practiced+'次 · '+p.mastery+'%</div>'+
        '<div class="pg-bar"><i class="'+pgBarCls(p.mastery)+'" style="width:'+p.mastery+'%"></i></div></div>'+
      act+'</div>';
  }).join('');
  const filters=[['all','全部',s.total],['red','未学红词',s.red],['green','已学绿词',s.green]];
  body.innerHTML=
    '<div class="pg-stat">'+
      '<div class="s"><b>'+s.total+'</b><span>覆盖总词</span></div>'+
      '<div class="s red"><b>'+s.red+'</b><span>新词(红)</span></div>'+
      '<div class="s green"><b>'+s.green+'</b><span>已学(绿)</span></div>'+
      '<div class="s"><b>'+s.avg+'%</b><span>平均熟练</span></div>'+
    '</div>'+
    pgAlphaHtml()+
    '<div class="pg-legend"><span><i class="dot-r"></i>红 = 新词</span><span><i class="dot-g"></i>绿 = 已学完</span>'+
      '<span class="freq">红词优先排期 · 复习频率更高</span></div>'+
    '<div class="pg-filter">'+filters.map(function(f){
      return '<button data-f="'+f[0]+'" class="'+(pgFilter===f[0]?'on':'')+'" onclick="pgSetFilter(\''+f[0]+'\')">'+f[1]+' '+f[2]+'</button>';
    }).join('')+'</div>'+
    '<input id="pgSearch" class="pg-search" type="search" placeholder="搜索单词" value="'+pgQuery+'" oninput="pgQuery=this.value;pgShown=40;renderProgress()">'+
    '<div class="pg-list">'+(rows||'<div class="pg-empty">没有匹配的单词</div>')+'</div>'+
    (list.length>pgShown?'<div class="pg-more"><button class="btn btn-ghost" onclick="pgShown+=40;renderProgress()">再看 40 词（已显示 '+shown.length+'/'+list.length+'）</button></div>':'<div class="pg-count">已显示全部 '+list.length+' 词</div>');
  const hl=document.getElementById('homeProgLine');
  if(hl)hl.innerHTML='已学 <b style="color:var(--accent-deep)">'+s.green+'</b> / '+s.total+' 词 · 红 '+s.red+' 待学';
}
function openProgress(){pgQuery='';pgFilter='all';pgLetter='';pgShown=40;renderProgress();go('s-progress');}

/* 非精修覆盖词：快速学习弹窗（自评三档 → practiceQuick → 红转绿） */
function openQuick(word){
  // 精修词有真实 FSRS 义项树，必须走词卡三档评价，不能走轻量快速学习
  if(Store.isLexWord(word)){closeMask();openWord(word);return;}
  pgReviewWord=word;
  var w=null;pgAll().forEach(function(x){if(x.w===word&&!w)w=x;});
  if(!w)w={w:word,ipa:'',pos:[]};
  var para=(paraCtx().words||[]).filter(function(x){return x.w===word;})[0];
  var senses=para?(para.senses||[]).slice(0,3):[];
  var senseHtml=senses.length
    ? senses.map(function(s){return '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.7">'+
        (s.pos?'<span style="color:var(--accent-deep);font-weight:600">'+s.pos+'</span> ':'')+s.meaning+'</div>';}).join('')
    : '<div style="font-size:12.5px;color:var(--ink-3);line-height:1.7">覆盖层词条：本层交付词形/音标/词性索引，暂不含自研释义。按记忆自评即可记录进度。</div>';
  var p=Store.wordProgress(word);
  var html='<div class="handle"></div>'+
    '<div class="qk-w">'+word+'</div>'+
    '<div class="qk-ipa">'+(w.ipa||'')+'</div>'+
    '<div class="qk-pos"><span class="w-pos" style="font-size:11px">'+(pgPosOf(w)||'考纲覆盖词')+'</span></div>'+
    '<div class="bk-title" style="text-align:left">释义 · 快速回忆</div>'+
    '<div style="text-align:left;margin-bottom:16px">'+senseHtml+'</div>'+
    '<div class="qk-hint">当前状态：<b style="color:'+(p.learned?'var(--accent-deep)':'var(--danger)')+'">'+(p.learned?'已学完 · '+p.mastery+'%':'新词 · 未学')+'</b><br>回忆词义后，选一个档位记录这次练习</div>'+
    '<div class="qk-rate">'+
      '<button class="r1" onclick="quickRate(\''+word+'\',1)"><b>没记住</b><span>再学 · 高频</span></button>'+
      '<button class="r2" onclick="quickRate(\''+word+'\',2)"><b>有点模糊</b><span>巩固</span></button>'+
      '<button class="r3" onclick="quickRate(\''+word+'\',3)"><b>记住了</b><span>掌握 · 低频</span></button>'+
    '</div>';
  openMask(html);
}
function quickRate(word,level){
  var beforeLearned=Store.learnedCount(), beforeLevel=Store.levelInfo().idx;
  Store.practiceQuick(word,level);
  var p=Store.wordProgress(word);
  var label=level===3?'记住了':(level===2?'有点模糊':'没记住');
  var html='<div class="handle"></div><div class="qk-done">'+
    '<div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
    '<h3>'+word+' 已记录</h3>'+
    '<p>本次自评「'+label+'」<br>练习 '+p.practiced+' 次 · 熟练度 '+p.mastery+'%<br>'+
      '状态：<b style="color:var(--accent-deep)">'+(p.learned?'已学完（绿）':'仍为新词（红）')+'</b></p>'+
    '<button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="closeMask();renderProgress();syncStats()">继续</button>'+
    '<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="quickNextRed(\''+word+'\')">下一个红词 →</button>'+
    '</div>';
  openMask(html);
  // 关闭试读层后再弹庆祝，避免两层弹窗叠加；把续学动作接到 CTA
  var ms=Store.crossedMilestone(beforeLearned), lv=Store.crossedLevel(beforeLevel);
  if(ms||lv){
    afterLearn(beforeLearned,beforeLevel,'已学 '+Store.learnedCount()+' 词');
  }else{
    showReward(p.learned?'+1 已掌握':'已记录练习', word+' · 熟练度 '+p.mastery+'%', false);
    renderGrowth(true);
  }
  if(typeof syncStats==='function')syncStats();
}
/* 红词优先复习：取下一个仍未学的覆盖词（必考优先），保持红词高频出现 */
function quickNextRed(cur){
  var next=null,backup=null;
  pgAll().forEach(function(w){
    if(next||backup)return;
    if(Store.isLexWord(w.w))return; // 精修词走 FSRS，不在快速队列
    if(Store.wordProgress(w.w).learned)return;
    if(w.w===cur)return;
    if(w.tier==='required')next=w.w; else backup=backup||w.w;
  });
  var target=next||backup;
  if(target)openQuick(target);
  else{closeMask();renderProgress();}
}
function openProgressFromHome(){openProgress();}

/* ==================== GOODS ==================== */
document.getElementById('goodsList').innerHTML=GOODS.map((g,i)=>
  '<div class="card goods"><div class="gcover" style="background:'+g.cover+'">'+g.coverText+'<span class="badge">'+g.badge+'</span></div>'+
  '<div class="ginfo"><h5>'+g.n+'</h5><div class="desc">'+g.d+'</div>'+
  '<div class="gbot"><div><div class="gprice"><b>¥'+g.p+'</b>'+(g.o?'<s>¥'+g.o+'</s>':'')+'</div><div style="font-size:10.5px;color:var(--ink-3)">'+g.note+'</div></div>'+
  '<button class="buy-btn" onclick="'+(g.detail?g.detail+'()':'openBuy('+i+')')+'">'+(g.detail?'查看详情试读':'立即购买')+'</button></div></div></div>').join('');

/* ==================== 学习周报：基础版免费 + 完整版 ¥9.9 解锁 ====================
 * 基础版所有数字来自 Store 的真实记录；深度归因与下周计划属于完整版。 */
function rpKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function rpWeekStart(now){
  return new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
}
function renderHeatmap(){
  const box=document.getElementById('heat'); if(!box)return;
  const st=(typeof Store!=='undefined'&&Store.snapshot)?Store.snapshot().state:{};
  const counts={};
  Object.keys(st.learnedAt||{}).forEach(k=>{
    const t=Number(st.learnedAt[k]); if(isNaN(t))return;
    const key=rpKey(new Date(t)); counts[key]=(counts[key]||0)+1;
  });
  const today=new Date();
  const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()-27);
  let html='';
  for(let i=0;i<28;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
    const c=counts[rpKey(d)]||0, lv=c?Math.min(4,Math.ceil(c/4)):0;
    html+='<i class="'+(lv?'l'+lv:'')+'"></i>';
  }
  box.innerHTML=html;
}
function renderParentReport(){
  const $=id=>document.getElementById(id);
  const set=(id,v)=>{const e=$(id); if(e)e.textContent=v;};
  const stat=(typeof Store!=='undefined'&&Store.stats)?Store.stats():null;
  const st=(typeof Store!=='undefined'&&Store.snapshot)?Store.snapshot().state:{};
  const owned=(typeof Store!=='undefined'&&Store.hasAll&&Store.hasAll());
  const up=$('rpUpgrade');
  if(up) up.innerHTML=owned
    ? '<div class="rp-owned">完整周报已解锁 · 深度归因与下周行动计划已显示</div>'
    : '<div class="rp-up-inner"><div class="rp-up-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/></svg></div>'+
      '<div class="rp-up-tx"><b>基础周报免费 · 完整版 ¥9.9</b><span>解锁深度失分归因、下周行动计划与报告导出；基础数据永久免费。</span></div>'+
      '<button class="rp-up-btn" onclick="openPay(\'all\')">解锁</button></div>';
  document.querySelectorAll('.rp-full').forEach(n=>{n.style.display=owned?'':'none';});
  const now=new Date(), mon=rpWeekStart(now), sun=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+6);
  set('rpRange',(mon.getMonth()+1)+'.'+mon.getDate()+' – '+(sun.getMonth()+1)+'.'+sun.getDate());
  const left=Math.max(0,Math.ceil((GAOKAO_DATE-now)/86400000));
  set('rpBannerKText','本周学习实录 · 距 2027 高考 '+left+' 天');
  const learned=st.learnedAt||{};
  const stamps=Object.keys(learned).map(k=>Number(learned[k])).filter(t=>!isNaN(t));
  const weekEnd=sun.getTime()+86400000-1;
  const weekNew=stamps.filter(t=>t>=mon.getTime()&&t<=weekEnd).length;
  set('rpBannerTitle',weekNew?('本周新学 '+weekNew+' 词，每一步都算数'):'本周还没有新学词，从今日任务开始');
  set('rpBannerDesc','所有数字都来自你的真实学习记录，不做预估、不注水。');
  const mins=stat?stat.minutes:0;
  set('rpTime',mins>=60?(mins/60).toFixed(1)+'h':mins+'min');
  set('rpWeekNew',weekNew);
  const q=st.quiz||{};
  set('rpAccSub',q.answered?(q.right+'/'+q.answered+' 题真实作答'):'先做 3 题看真实正确率');
  set('rpCheckSub',(st.days&&st.days.length)?('累计打卡 '+st.days.length+' 天'):'今天开始第一次打卡');
  if(stat){set('kpiAcc',stat.quizAnswered?stat.accuracy+'%':'—');set('kpiCheckin',stat.streak+'/7');}
  const counts=[0,0,0,0,0,0,0];
  stamps.forEach(t=>{
    if(t<mon.getTime()||t>weekEnd)return;
    const d=new Date(t); counts[(d.getDay()+6)%7]++;
  });
  const max=Math.max.apply(null,counts.concat([1]));
  const bars=$('weekBars');
  if(bars) bars.innerHTML=['一','二','三','四','五','六','日'].map((l,i)=>
    '<div class="wk-col"><span class="wk-v">'+(counts[i]||'')+'</span>'+
    '<div class="wk-bar" style="height:'+Math.max(3,Math.round(counts[i]/max*66))+'px"></div>'+
    '<span class="wk-n">'+l+'</span></div>').join('');
  renderHeatmap();
}
renderParentReport();

/* ==================== 订单：一次买断，订单与资料永久可下载 ==================== */
function loadOrders(){
  try{
    const arr=(Store.snapshot().state||{}).orders;
    return Array.isArray(arr)?arr:[];
  }catch(e){ return []; }
}
/* 订单并入 learning_state.state.orders：随账号云同步，换设备/清缓存后仍可下载凭证 */
function saveOrders(list){
  try{
    const s=Store.snapshot(); s.state.orders=list;
    Store.hydrate(s.state,s.entitlements); Store.save();
  }catch(e){}
}
function recordOrder(o){
  const list=loadOrders();
  const no='SC'+Date.now().toString(36).toUpperCase()+String(Math.floor(Math.random()*900)+100);
  const rec={no:no,name:o.name||'',amount:Number(o.amount||0),source:o.source||'支付',key:o.key||'',at:o.at||Date.now()};
  list.unshift(rec); saveOrders(list); refreshOrderUI();
  return rec;
}
function recordRedeemOrder(code){
  return recordOrder({name:'拾词全包（兑换码激活）',amount:0,source:'兑换码 '+(code||''),key:'all'});
}
function refreshOrderUI(){
  const n=document.getElementById('orderCount');
  if(n) n.textContent=loadOrders().length+' 笔';
}
function fmtAmount(v){
  const n=Number(v||0);
  return n?n.toFixed(2).replace(/\.?0+$/,''):'0';
}
function fmtOrderTime(ts){
  try{
    const d=new Date(ts);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+
      ' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }catch(e){ return ''; }
}
function downloadText(name,text){
  const a=document.createElement('a');
  a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(text);
  a.download=name;
  const parent=document.body||document.documentElement;
  if(parent&&parent.appendChild) parent.appendChild(a);
  if(typeof a.click==='function') a.click();
  if(a.parentNode&&a.parentNode.removeChild) a.parentNode.removeChild(a);
  return {href:a.href,name:a.download};
}
function downloadOrder(no){
  const o=loadOrders().find(x=>x.no===no); if(!o)return null;
  const text=[
    '拾词 · 订单凭证','========================',
    '订单号：'+o.no,
    '商品：'+o.name,
    '金额：¥'+fmtAmount(o.amount),
    '来源：'+o.source,
    '下单时间：'+fmtOrderTime(o.at),
    '权益状态：永久有效 · 一次买断 · 无续费',
    '下载说明：订单与资料可在应用「我的 → 我的订单」随时重新下载，链接不过期。',
    '合规说明：例句为仿真语境，不含真题与教材原文。',
    '凭证生成时间：'+fmtOrderTime(Date.now())
  ].join('\n');
  return downloadText('拾词订单凭证_'+o.no+'.txt',text);
}
function downloadLegacyVoucher(){
  const text=[
    '拾词 · 全包权益凭证','========================',
    '权益：拾词全包（历史权益）',
    '状态：永久有效 · 一次买断 · 无续费',
    '说明：该权益早于订单记录功能，凭证可随时在本应用「我的 → 我的订单」重新下载。',
    '合规说明：例句为仿真语境，不含真题与教材原文。',
    '凭证生成时间：'+fmtOrderTime(Date.now())
  ].join('\n');
  return downloadText('拾词全包权益凭证.txt',text);
}
function openOrders(){
  const list=loadOrders();
  let s='<div class="handle"></div><h3>我的订单</h3><p class="sub">一次买断 · 订单与资料永久可下载</p>';
  if(!list.length){
    s+=(typeof Store!=='undefined'&&Store.hasAll())
      ? '<div class="card" style="padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:700">拾词全包权益已生效</div><div style="font-size:11px;color:var(--ink-3);line-height:1.6;margin:6px 0 10px">该权益来自历史记录，可下载权益凭证，永久有效。</div><button class="btn btn-ghost" onclick="downloadLegacyVoucher()">下载权益凭证</button></div>'
      : '<div class="pg-empty">还没有订单，购买后这里会永久保存</div>';
  }else{
    s+=list.map(o=>
      '<div class="ord-item"><div class="ord-hd"><span class="ord-name">'+o.name+'</span><span class="ord-amt">¥'+fmtAmount(o.amount)+'</span></div>'+
      '<div class="ord-meta">'+o.source+' · '+fmtOrderTime(o.at)+' · 永久有效</div>'+
      '<div class="ord-btns"><button class="ord-btn" onclick="downloadOrder(\''+o.no+'\')">下载订单凭证</button></div></div>').join('');
  }
  s+='<p style="text-align:center;font-size:11px;color:var(--ink-3);margin-top:12px;line-height:1.6">订单与资料永久可下载 · 链接过期也可在这里重新获取<br>7 天无理由退款 · 一次买断无续费</p>';
  openMask(s);
}
refreshOrderUI();

/* ==================== MODALS ==================== */
function openMask(html){document.getElementById('sheet').innerHTML=html;document.getElementById('mask').classList.add('on');}
function closeMask(){document.getElementById('mask').classList.remove('on');}
function openPay(plan){
  if(Store.hasAll()){ closeMask(); return; }  // 已解锁不再弹购买弹窗
  if(!needLogin(function(){openPay(plan);},'登录后即可开通全包，权益与进度会保存到你的账号。')) return;
  payPlan=plan;payStage='plan';
  renderPay();
  openMask(document.getElementById('sheet').innerHTML);
}
/* 全包支付成功：写入权益 → 刷新全站付费信息 → 展示成功态 */
function payAll(){
  Store.grantAll();
  recordOrder({name:'拾词全包',amount:9.9,source:'支付',key:'all'});
  payStage='done';
  refreshEntitlementUI();
  renderPay();
  openMask(document.getElementById('sheet').innerHTML);
}
function renderPay(){
  let s='<div class="handle"></div>';
  if(payStage==='done'){
    s+='<div class="success"><div class="ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
      '<h3>开通成功</h3><p>全包已生效：完整训练册 + App 全部功能，一次买断，没有续费。订单已保存，可永久下载凭证。</p>'+
      '<button class="btn btn-primary" onclick="closeMask();openOrders()">查看并下载订单凭证</button>'+
      '<button class="btn btn-ghost" style="margin-top:10px" onclick="closeMask();go(\'s-quiz\')">继续刷题</button></div>';
  }else{
    s+='<h3>拾词全包</h3><p class="sub">一次买断，含完整 100 题训练册 + App 全部功能</p>'+
      '<div class="plan">'+
        '<button class="plan-c on"><b>¥9.9</b><span>全包 · 一次买断</span></button>'+
      '</div>'+
      '<div style="margin-bottom:12px">'+
        ['四本读本全含（单买 ¥2.9 / 本）','完整 100 题专项训练册 PDF','全部专项训练题库 + 完整解析','仿真语境例句库','错词自动复习 + 完整失分地图','完整学习周报 · 深度归因与下周行动计划','一次买断 · 永久可用'].map(p=>
        '<div class="perk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'+p+'</div>').join('')+
      '</div>'+
      '<div class="coupon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z"/><path d="M12 6v2M12 16v2M12 11v2"/></svg>全包一次性买断，没有年卡月卡，也不需要续费</div>'+
      '<button class="btn btn-primary" style="margin-top:14px" onclick="payAll()">微信支付 ¥9.9</button>'+
      '<p style="text-align:center;font-size:11px;color:var(--ink-3);margin-top:10px">订单与资料永久可下载 · 一次买断无续费 · 7 天无理由退款<br>演示支付流程 · 当前可用兑换码开通</p>';
  }
  document.getElementById('sheet').innerHTML=s;
}
function openBuy(i){
  if(!needLogin(function(){openBuy(i);},'登录后即可购买，订单与资料会保存在你的账号。')) return;
  buyItem=GOODS[i];couponUsed=false;payStage='buy';
  renderBuy();
  openMask(document.getElementById('sheet').innerHTML);
}
/* 单品支付成功：写入该书权益 → 刷新全站 → 成功态 */
function payBook(){
  if(buyItem&&buyItem.key){
    Store.grantBook(buyItem.key);
    recordOrder({name:buyItem.n,amount:buyItem.p,source:'支付',key:buyItem.key});
  }
  payStage='buydone';
  refreshEntitlementUI();
  renderBuy();
  openMask(document.getElementById('sheet').innerHTML);
}
function renderBuy(){
  const g=buyItem;
  const total=Number(g.p).toFixed(2).replace(/\.?0+$/,'');
  let s='<div class="handle"></div>';
  if(payStage==='buydone'){
    s+='<div class="success"><div class="ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
      '<h3>下单成功</h3><p>《'+g.n+'》已解锁，可在「我的资料」中查看。订单已保存，凭证与资料永久可下载。</p>'+
      '<button class="btn btn-primary" onclick="closeMask();openOrders()">下载订单凭证</button>'+
      '<button class="btn btn-ghost" style="margin-top:10px" onclick="closeMask()">去学习</button></div>';
  }else{
    s+='<h3>确认订单</h3><p class="sub">电子版即时下载，可自行双面打印</p>'+
      '<div class="card goods" style="box-shadow:none;padding:12px;margin-bottom:14px"><div class="gcover" style="background:'+g.cover+';height:78px;width:62px">'+g.coverText+'</div>'+
      '<div class="ginfo"><h5 style="font-size:13px">'+g.n+'</h5><div class="desc" style="margin-bottom:6px">电子 PDF（立即下载）</div>'+
      '<div class="gprice"><b>¥'+g.p+'</b></div></div></div>'+
      '<div class="opt-row on"><span class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span class="t"><b>下载方式</b><span>微信接收下载链接 · 邮箱同步一份</span></span><span class="ck"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>'+
      '<div class="opt-row" onclick="closeMask();openPay(\'all\')"><span class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 6v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-6Z"/></svg></span><span class="t"><b>更划算：全包 ¥9.9</b><span>含完整训练册 + App 全部功能，一次买断</span></span><span class="ck"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>'+
      '<div class="summary">'+
        '<div class="sline"><span>商品小计</span><span>¥'+g.p+'</span></div>'+
        '<div class="sline"><span>配送</span><span>¥0（电子版）</span></div>'+
        '<div class="sline total"><span>实付金额</span><b>¥'+total+'</b></div>'+
      '</div>'+
      '<div class="paybar"><span class="wx"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3.5c-3.3 0-6 2.1-6 4.7 0 1.5.9 2.8 2.3 3.7-.2.5-.6 1.4-1.3 2.4-.2.2 0 .5.3.4 1.7-.6 3-1.6 3.6-2.2.5.1 1 .2 1.6.2.6 0 1.2 0 1.7-.1-.3-.7-.5-1.4-.5-2.2 0-3.4 3.1-6.1 6.9-6.1h.6C16.8 3.8 13.4 3.5 9 3.5Z" transform="translate(0,4) scale(.78)"/><path d="M17.3 9.9c-3 0-5.4 1.9-5.4 4.3s2.4 4.3 5.4 4.3c.7 0 1.3-.1 1.9-.3-.3 1.1-.9 2-1.8 2.7-.2.2-.1.5.2.4 1.4-.5 2.5-1.4 3.1-2.3.9-.7 1.5-1.6 1.7-2.6.1-.3-.1-.5-.4-.4-.5.2-1.1.3-1.7.3 1.4-1 2.3-2.4 2.3-4 0-1-.4-1.8-1.2-2.5 2.4.1 4.4.9 4.4.9.4.1.5-.3.3-.6-.9-1.7-3.2-2.6-5.6-2.6-.7 0-1.3.1-1.9.2.1-.3.2-.7.2-1 .1-2.1-1.7-3.7-3.7-3.7-1.9 0-3.5 1.6-3.5 3.5 0 .6.2 1.2.5 1.7-.6.1-1.3.3-1.9.6-.2.1-.3.3-.1.5.8.7 2.1 1.1 3.4 1.1 1.2 0 2.3-.3 3.2-.8.1.4.2.8.2 1.2 0 1.6-.9 2.9-2.1 3.8-.2.2-.1.5.2.4 1.3-.6 2.3-1.6 2.8-2.5.6.4 1.3.6 2 .6h.5c-.9 1.5-2.6 2.5-4.6 2.5-3 0-5.4-1.9-5.4-4.3s2.4-4.3 5.4-4.3c2.9 0 5.3 1.9 5.3 4.3 0 2.3-2.4 4.2-5.3 4.2Z"/></svg></span><span class="t">微信支付</span><span style="font-size:11.5px;color:var(--ink-3)">推荐使用</span></div>'+
      '<button class="btn btn-primary" style="margin-top:14px" onclick="payBook()">确认支付 ¥'+total+'</button>'+
      '<p style="text-align:center;font-size:11px;color:var(--ink-3);margin-top:10px">支持 7 天无理由退款 · 电子版永久可下载</p>';
  }
  document.getElementById('sheet').innerHTML=s;
}

/* ==================== 购买解锁：全站付费信息统一刷新 ====================
 * 付款成功后写入 Store 权益，调用本函数把「购买/解锁/开通」类信息
 * 全部替换为「已解锁」状态；刷新后不再出现需要付费的提示。
 * ================================================================ */
function refreshEntitlementUI(){
  const owned=Store.hasAll();
  const $=id=>document.getElementById(id);

  // 我的页：用户等级 + 升级卡片
  const tier=$('userTier');
  if(tier){
    tier.textContent=owned?'全包用户':'普通用户';
    tier.style.background=owned?'var(--accent-tint)':'';
    tier.style.color=owned?'var(--accent-deep)':'';
  }
  const title=$('upgradeTitle'),sub=$('upgradeSub'),btn=$('upgradeBtn');
  if(title&&sub&&btn){
    if(owned){
      title.textContent='全包已解锁';
      sub.textContent='一次买断 · 全部专项与资料永久可用';
      btn.textContent='已开通'; btn.disabled=true;
      btn.style.opacity='.6'; btn.style.cursor='default';
    }else{
      title.textContent='升级全包，解锁全部专项';
      sub.textContent='全包 ¥9.9 · 一次买断';
      btn.textContent='开通'; btn.disabled=false;
      btn.style.opacity=''; btn.style.cursor='';
    }
  }
  // 资料商店全包卡：已解锁则隐藏价格、标注已解锁（仍可点进词库详情）
  const shopBtn=$('shopAllBtn'),shopPrice=$('shopPrice');
  if(shopBtn){
    shopBtn.textContent=owned?'已解锁 · 查看词库':'查看详情试读词库';
    shopBtn.style.opacity=owned?'.72':'';
  }
  if(shopPrice){
    shopPrice.innerHTML=owned?'<b style="font-size:15px;color:var(--accent-deep)">已解锁</b><em>一次买断 · 永久可用</em>':'<b>¥9.9</b><em>含四本书 + 完整周报</em>';
  }
  // 重新渲染所有动态页面，让购买按钮按最新权益显示
  if(typeof renderBook==='function')renderBook();
  if(typeof renderBook2==='function')renderBook2();
  if(typeof renderBook3==='function')renderBook3();
  if(typeof renderBook4==='function')renderBook4();
  if(typeof renderFullPack==='function')renderFullPack();
  if(typeof renderQuiz==='function')renderQuiz();
}

/* ==================== INIT ==================== */
buildNav();
refreshEntitlementUI();
renderStudy();
renderFam();
renderQuiz();
renderFullPackTeaser();

/* ============================================================
 * 真实统计同步
 * ------------------------------------------------------------
 * 原型首页/我的页的「1,284 累计接触 / 862 已掌握 / 54 待巩固 /
 * 23 天连续 / 42h 学习时长」原本是 HTML 里的字面量，做完题不会动。
 * 现在全部由 Store（FSRS 卡片状态 + 活动日志）推导。
 * ============================================================ */
var ERR_CATS=[
  {k:'熟词僻义',label:'熟词僻义',o:.9},
  {k:'一词多义',label:'一词多义',o:.72},
  {k:'固定搭配',label:'固定搭配',o:.52},
  {k:'词性误判',label:'词性误判',o:.38},
  {k:'拼写变形',label:'拼写变形',o:.26}
];
function renderErrDist(){
  const bm=Store.load().quiz.byModule||{};
  const total=Object.keys(bm).reduce(function(a,k){return a+bm[k];},0);
  const box=document.getElementById('errDist');
  const sub=document.getElementById('errDistSub');
  const adv=document.getElementById('errAdvice');
  if(!box)return;
  if(!total){
    box.innerHTML='<div style="font-size:12.5px;color:var(--ink-3);padding:8px 0">尚无错题数据。先去「熟词僻义专项」答几题，这里会按真实错因出分布。</div>';
    if(sub)sub.textContent='按失分原因归类，而非词表顺序';
    if(adv)adv.innerHTML='还没有足够的作答数据来定位你的失因分布。<b style="color:#fff">先做 3 题</b>，系统就会按你真实错在哪来排序。';
    return;
  }
  const rows=ERR_CATS.map(function(c){
    const v=bm[c.k]||0; const pct=Math.round(100*v/total);
    return '<div class="bench'+(c===ERR_CATS[0]?' top':'')+'"><span class="bench-label">'+c.label+'</span>'+
      '<div class="bench-track"><div class="bench-fill" style="width:'+Math.max(pct,1.5)+'%;opacity:'+c.o+'"></div></div>'+
      '<span class="bench-val">'+pct+'%</span></div>';
  }).join('');
  box.innerHTML=rows;
  if(sub)sub.textContent='本机真实作答：'+total+' 道错题';
  const top=ERR_CATS.slice().sort(function(a,b){return (bm[b.k]||0)-(bm[a.k]||0);})[0];
  const pct=Math.round(100*(bm[top.k]||0)/total);
  if(adv)adv.innerHTML='你因「'+top.label+'」丢掉 <b style="color:#fff">'+pct+'%</b> 的词汇失分，'+
    '集中练 40 分钟，预计可在阅读与完形挽回 <b style="color:#fff">8–12 分</b>。';
}
/* 题型分布：按真实作答里的题型标记出，没数据不预填百分比 */
function renderTypeDist(){
  const box=document.getElementById('typeDist');
  if(!box)return;
  const bt=(Store.load().quiz.byType)||{};
  const rows=Object.keys(bt).map(k=>({k:k,v:bt[k]})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const total=rows.reduce((a,r)=>a+r.v,0);
  if(!total){
    box.innerHTML='<div style="font-size:12.5px;color:var(--ink-3);padding:8px 0;line-height:1.6">还没有题型数据。题库给每道题标注「题型」后，这里会按你的真实作答出分布——不会预填任何百分比。</div>';
    return;
  }
  const cols=['#10b981','#34d399','#7fe0bd','#c9f2e2'];
  let acc=0;
  const stops=rows.slice(0,4).map((r,i)=>{
    const from=Math.round(acc/total*100), to=Math.round((acc+r.v)/total*100); acc+=r.v;
    return cols[i]+' '+from+'% '+to+'%';
  }).join(',');
  box.innerHTML='<div class="donut-wrap">'+
    '<div class="donut" style="background:conic-gradient('+stops+')"><div class="donut-c"><b>'+Math.round(100*rows[0].v/total)+'%</b><span>'+rows[0].k+'</span></div></div>'+
    '<div class="dl">'+rows.slice(0,4).map((r,i)=>'<div><i style="background:'+cols[i]+'"></i>'+r.k+'<b>'+Math.round(100*r.v/total)+'%</b></div>').join('')+'</div>'+
  '</div>';
}
function syncStats(){
  const st=Store.stats();
  const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent=v;};
  set('kpiStreak',st.streak);
  set('kpiStreak2',st.streak);
  set('kpiStreak3',st.streak);
  set('kpiTouched2',st.touchedWords);
  set('kpiMastered',st.masteredWords);
  set('kpiMastered2',st.masteredWords);
  set('kpiWeak',st.weakWords);
  set('kpiQuizN',st.quizAnswered);
  set('kpiQuizW',st.quizWrong);
  set('kpiMinutes',st.minutes);
  set('kpiMinutes2',st.minutes);
  set('kpiAcc',st.quizAnswered?st.accuracy+'%':'—');
  set('kpiCheckin',st.streak+'/7');
  // 今日任务环：今日新学 / 每日目标 20（与成长看板口径一致）
  const plan=20;
  const done=Math.min(plan, Store.newWordsToday());
  set('ringp',done);
  set('ringSub','今日 '+done+'/'+plan);
  const ring=document.getElementById('ring');
  if(ring) ring.style.background='conic-gradient(var(--accent) 0 '+Math.round(done/plan*100)+'%, var(--line-2) '+Math.round(done/plan*100)+'% 100%)';
  // 首页/我的页文案随真实作答变化（不再写死 62% / 54 个）
  const hq=document.getElementById('homeQuizLine');
  if(hq) hq.textContent=st.quizAnswered?('12 道高频陷阱题 · 你的正确率 '+st.accuracy+'%'):'12 道高频陷阱题 · 做完 3 题看你的真实正确率';
  const et=document.getElementById('errTotal');
  if(et) et.textContent='全部 '+st.quizWrong+' 个';
  const eb=document.getElementById('errBook');
  if(eb) eb.textContent=st.quizWrong+' 个待攻克';
  // 首页单词进度快照：随全量覆盖词红绿状态刷新
  const hp=document.getElementById('homeProgLine');
  if(hp&&typeof pgSummary==='function'){
    const ps=pgSummary();
    hp.innerHTML='已学 <b style="color:var(--accent-deep)">'+ps.green+'</b> / '+ps.total+' 词 · 红 '+ps.red+' 待学';
  }
  // 高考倒计时仪表盘：剩余天数 × 未学词量 → 危机感数据
  if(typeof syncCountdown==='function') syncCountdown();
  // 今日任务组卷：三段构成随作答/登录后云端状态实时刷新
  if(typeof renderDailyCard==='function') renderDailyCard();
  // 学习周报：基础数据随真实学习记录刷新，完整版门禁随权益刷新
  if(typeof renderParentReport==='function') renderParentReport();
  // 成长看板：已学词数滚动 + 等级 + 里程碑 + 今日新学
  if(typeof renderGrowth==='function') renderGrowth();
  // 学习成效：近7日趋势 + 熟练度分布
  if(typeof renderEffect==='function') renderEffect();
  // 失分地图：错因分布按真实作答统计刷新
  renderErrDist();
  renderTypeDist();
}
syncStats();

/* ==================== 学习成长看板 + 即时激励 ====================
 * 目标：每次学习后给用户「看得见的进步」——
 *  1) 首页成长看板：已学词数滚动、等级进度、里程碑徽章、今日新学
 *  2) 学习动作后：浮动 +N 反馈 toast + 撒花
 *  3) 跨里程碑/升级：庆祝弹层 + 继续学习 CTA（把成就感转成下一步动作）
 * 所有数字均来自 Store 真实状态，不写死。 */
function rollNumber(el, to, flash){
  if(!el) return;
  const from = parseInt(el.textContent,10)||0;
  if(!flash && from===to){ el.textContent=to; return; }
  el.textContent=to;
  if(flash){
    el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll');
  }
}
/* 高考倒计时：距 2027-06-07 的真实天数（当天 0 点起算） */
function daysToGaokao(){
  const now=new Date();
  const t=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.max(0, Math.round((GAOKAO_DATE - t)/86400000));
}
/* 备考仪表盘：把「剩余时间 × 剩余词量」绑成危机感数据。
 * 每天要拿下 = 未学词数 / 剩余天数（向上取整，至少 1）；
 * 文案按今天已学 vs 每天需学的差距分层，落后施压、达标鼓励。 */
function syncCountdown(){
  const days=daysToGaokao();
  const total=(typeof pgAll==='function')?pgAll().length:4110;
  const learned=Store.learnedCount();
  const remain=Math.max(0,total-learned);
  const todayNew=Store.newWordsToday();
  const perDay=days>0?Math.max(1,Math.ceil(remain/days)):remain;
  const pct=total?Math.round(learned/total*100):0;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('cdDays',days);
  set('cdLearned',learned);
  set('cdTotal',total);
  set('cdRemain',remain);
  set('cdPerDay',perDay);
  set('cdToday',todayNew);
  const bar=document.getElementById('cdBar');
  if(bar)bar.style.width=pct+'%';
  // 危机感文案分层
  const urg=document.getElementById('cdUrgent'), txt=document.getElementById('cdUrgentText');
  if(txt){
    let msg;
    if(days===0){
      msg='就是今天，把会的都稳住 —— 你已经积累了 <b>'+learned+'</b> 词';
    }else if(remain===0){
      msg='4110 词全部拿下，剩下的是稳住复习节奏，稳赢';
    }else if(todayNew>=perDay){
      msg='今日已学 <b>'+todayNew+'</b> 词，超过每天的「'+perDay+' 词」底线，保持住';
    }else{
      const gap=perDay-todayNew;
      msg='剩 <b>'+days+'</b> 天 / <b>'+remain+'</b> 词没学，今天还差 <b>'+gap+' 词</b> 才达标';
    }
    txt.innerHTML=msg;
  }
  if(urg) urg.classList.toggle('good', remain===0 || todayNew>=perDay);
}
/* 学习成效：近7日新学趋势 + 熟练度分布，全部来自真实记录 */
function renderEffect(){
  const days=Store.newWordsLast7Days();
  const weekTotal=days.reduce((a,d)=>a+d.count,0);
  const wt=document.getElementById('effWeekTotal');
  if(wt) wt.textContent=weekTotal+' 词';
  const tr=document.getElementById('effTrend');
  if(tr){
    const active=days.filter(d=>d.count>0).length;
    if(weekTotal===0) tr.textContent='新学的词会出现在这里，坚持几天就能看到趋势';
    else {
      const peak=Math.max.apply(null,days.map(d=>d.count));
      tr.innerHTML='本周有 <b style="color:var(--accent-deep)">'+active+'</b> 天在学 · 单日最多 <b style="color:var(--accent-deep)">'+peak+'</b> 词';
    }
  }
  const max=Math.max(1,Math.max.apply(null,days.map(d=>d.count)));
  const bars=document.getElementById('effBars');
  if(bars){
    bars.innerHTML=days.map(d=>{
      const h=d.count?Math.max(8,Math.round(d.count/max*52)):3;
      return '<div class="eff-bar'+(d.isToday?' today':'')+(d.count>0?' has':'')+'">'+
        '<span class="n">'+(d.count||'')+'</span>'+
        '<div class="col" style="height:'+h+'px"></div>'+
        '<span class="d">'+(d.isToday?'今天':d.label)+'</span></div>';
    }).join('');
  }
  const md=Store.masteryDistribution();
  const pct=document.getElementById('effMasteredPct');
  if(pct) pct.textContent=(md.total?Math.round(md.solid/md.total*100):0)+'% 牢固';
  const seg=[md.solid,md.learning,md.fresh];
  ['effS1','effS2','effS3'].forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el) el.style.width=(md.total?seg[i]/md.total*100:0)+'%';
  });
  const lg=document.getElementById('effLegend');
  if(lg){
    if(md.total===0){
      lg.innerHTML='<div class="eff-empty" style="width:100%">还没有已学的词。每学一个词，这里就会出现你的第一份成果。</div>';
    }else{
      lg.innerHTML=
        '<div><i style="background:#10b981"></i>牢固掌握 <b>'+md.solid+'</b></div>'+
        '<div><i style="background:#fbbf24"></i>巩固中 <b>'+md.learning+'</b></div>'+
        '<div><i style="background:#fda4af"></i>刚学过 <b>'+md.fresh+'</b></div>';
    }
  }
}
function renderGrowth(flash){
  const learned=Store.learnedCount(), lv=Store.levelInfo(), todayNew=Store.newWordsToday();
  const ms=Store.milestoneList();
  // 大数字（新学时闪烁）
  const doFlash = flash || (_gcLastLearned!==null && learned>_gcLastLearned);
  rollNumber(document.getElementById('gcLearned'), learned, doFlash);
  _gcLastLearned=learned;
  // 等级
  const lvEl=document.getElementById('gcLevel');
  if(lvEl) lvEl.textContent='Lv.'+lv.idx+' '+lv.name;
  const hint=document.getElementById('gcLevelHint');
  if(hint) hint.textContent=lv.isMax?'已达最高等级':('距离「'+lv.nextName+'」还差 '+lv.toNext+' 词');
  const nn=document.getElementById('gcNextName');
  if(nn) nn.textContent=lv.isMax?'已全部掌握':'下一等级 · '+lv.nextName+'（'+lv.need+' 词）';
  const pct=document.getElementById('gcLevelPct');
  if(pct) pct.textContent=lv.pct+'%';
  const bar=document.getElementById('gcLevelBar');
  if(bar) bar.style.width=lv.pct+'%';
  // 激励文案：随进度推进而变
  const mot=document.getElementById('gcMotivation');
  if(mot){
    let m;
    if(learned===0) m='从第一个词开始，每一天都算数';
    else if(lv.isMax) m='4110 词全部拿下，你已经是词汇词霸';
    else if(lv.toNext<=5) m='再学 <b>'+lv.toNext+'</b> 词就升到「'+lv.nextName+'」，冲刺！';
    else if(todayNew>=20) m='今日目标已达成，继续保持这股势头';
    else if(todayNew>0) m='今天已拿下 <b>'+todayNew+'</b> 个新词，再接再厉';
    else m='已积累 <b>'+learned+'</b> 词，今天也来学几个吧';
    mot.innerHTML=m;
  }
  // 里程碑徽章（显示已达成的最近 5 个 + 下一个）
  const wrap=document.getElementById('gcMilestones');
  if(wrap){
    // 以「最近达成」为中心取 5 个，保证刚拿到的徽章一定可见，再带的看到下一个目标
    let lastGot=-1;
    for(let i=0;i<ms.length;i++) if(ms[i].got) lastGot=i;
    const start=Math.max(0,Math.min(lastGot-1,ms.length-5));
    const shown=ms.slice(start,start+5);
    wrap.innerHTML=shown.map(x=>'<div class="mstone'+(x.got?' got':'')+'">'+
      '<div class="mi">'+(x.got?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="10" width="14" height="10" rx="2"/></svg>')+'</div>'+
      '<div class="ml">'+x.n+' 词</div></div>').join('');
  }
  // 今日目标
  const tt=document.getElementById('gcTodayTitle'), ts=document.getElementById('gcTodaySub'), gb=document.getElementById('gcGoalBtn');
  if(tt) tt.textContent='今日已学 '+todayNew+' 词';
  if(ts) ts.textContent=todayNew>=20?'目标达成 · 超额 '+todayNew+' 词':'目标 20 词 · 还差 '+(20-todayNew)+' 词';
  if(gb){ gb.textContent=todayNew>=20?'再学一组':'去学习'; gb.classList.toggle('done',todayNew>=20); }
}
/* 浮动 +N 反馈：学习动作后即时显示 */
function showReward(title, sub, gold){
  const layer=document.getElementById('rewardLayer'); if(!layer) return;
  const pop=document.createElement('div');
  pop.className='rw-pop';
  pop.innerHTML='<div class="rw-card">'+
    '<div class="rw-ic'+(gold?' gold':'')+'">'+
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'+
    '<div class="rw-tx"><b>'+title+'</b><span>'+(sub||'')+'</span></div></div>';
  layer.appendChild(pop);
  void pop.offsetWidth; pop.classList.add('show');
  burstConfetti(gold);
  setTimeout(()=>{ if(pop.parentNode) pop.parentNode.removeChild(pop); },1600);
}
function burstConfetti(gold){
  const layer=document.getElementById('rewardLayer'); if(!layer) return;
  const colors=gold?['#fcd34d','#f59e0b','#fbbf24','#fef3c7']:['#34d399','#10b981','#a7f3d0','#fbbf24'];
  for(let i=0;i<10;i++){
    const b=document.createElement('i');
    b.className='rw-burst';
    const ang=(Math.PI*2*i/10)+(Math.random()*.4);
    const dist=42+Math.random()*38;
    b.style.background=colors[i%colors.length];
    b.style.setProperty('--bx',Math.cos(ang)*dist+'px');
    b.style.setProperty('--by',Math.sin(ang)*dist+'px');
    b.style.animationDelay=(Math.random()*.08)+'s';
    layer.appendChild(b);
    void b.offsetWidth; b.classList.add('show');
    setTimeout(()=>{ if(b.parentNode) b.parentNode.removeChild(b); },1000);
  }
}
/* 里程碑 / 升级庆祝弹层 */
function openCelebrate(kind, payload){
  const box=document.getElementById('celebrate'), card=document.getElementById('celeCard');
  if(!box||!card) return;
  const learned=Store.learnedCount(), lv=Store.levelInfo();
  let eyebrow,title,desc;
  if(kind==='milestone'){
    eyebrow='里程碑达成'; title='已掌握 '+payload.n+' 词！';
    desc='每一点积累都算数。你已经把 '+payload.n+' 个词真正装进了长期记忆。';
  }else{
    eyebrow='等级提升'; title='升到 Lv.'+payload.idx+' · '+payload.name;
    desc='距离下一等级「'+payload.nextName+'」还有 '+payload.toNext+' 词，继续前进。';
  }
  card.innerHTML=
    '<div class="cele-medal"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/></svg></div>'+
    '<div class="cele-eyebrow">'+eyebrow+'</div>'+
    '<h3>'+title+'</h3><p>'+desc+'</p>'+
    '<div class="cele-stats">'+
      '<div><b>'+learned+'</b><span>累计已学</span></div>'+
      '<div><b>Lv.'+lv.idx+'</b><span>当前等级</span></div>'+
      '<div><b>'+Store.newWordsToday()+'</b><span>今日新学</span></div>'+
    '</div>'+
    (payload.cta?'<button class="btn btn-primary" onclick="celebrateContinue()">'+payload.cta+'</button>':'')+
    '<div class="cele-quit" onclick="closeCelebrate()">稍后再说</div>';
  box.classList.add('on');
  burstConfetti(true);
}
function closeCelebrate(){
  const box=document.getElementById('celebrate'); if(box) box.classList.remove('on');
}
let _celeNext=null;
function celebrateContinue(){
  closeCelebrate();
  if(typeof _celeNext==='function'){ const fn=_celeNext; _celeNext=null; fn(); }
}
/* 统一的「学习后反馈」入口：先在动作前记录 before，再调用本函数。
 * 优先级：里程碑 > 升级 > 普通 +N。庆祝弹层的 CTA 可接一个续学动作。 */
function afterLearn(beforeLearned, beforeLevelIdx, label, nextFn){
  const learned=Store.learnedCount();
  const ms=Store.crossedMilestone(beforeLearned);
  const lv=Store.crossedLevel(beforeLevelIdx);
  if(ms){
    _celeNext=nextFn||null;
    openCelebrate('milestone',{n:ms,cta:nextFn?'继续学习':null});
  }else if(lv){
    _celeNext=nextFn||null;
    openCelebrate('level',{idx:lv.idx,name:lv.name,nextName:lv.nextName,toNext:lv.toNext,cta:nextFn?'继续学习':null});
  }else{
    showReward('+1 已掌握', label||('累计 '+learned+' 词'), false);
  }
  renderGrowth(true);
  if(typeof syncStats==='function') syncStats();
}

/* 学习时长：按页面停留累计（每 15 秒结算一次） */
let lastTick=Date.now();
setInterval(()=>{
  // 未登录时不累计学习时长：用户数据页由登录门禁拦截。
  if(typeof CloudStore!=='undefined' && !CloudStore.isReady()) { lastTick=Date.now(); return; }
  const now=Date.now();
  const sc=document.querySelector('.screen.on');
  if(sc&&sc.id!=='s-shop'){ Store.addTime(Math.min(60,(now-lastTick)/1000)); syncStats(); }
  lastTick=now;
},15000);

/* keyboard nav */
document.addEventListener('keydown',e=>{
  const order=['s-home','s-study','s-review','s-shop','s-me'];
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    const cur=SCREENS.findIndex(s=>document.getElementById(s).classList.contains('on'));
    const tabIdx=order.findIndex(s=>s===SCREENS[cur]);
    if(tabIdx<0)return;
    const ni=(tabIdx+(e.key==='ArrowRight'?1:order.length-1))%order.length;
    if(order[ni]==='s-study')resetStudy();
    go(order[ni]);
  }
});

/* ============================================================
 * 云端快照载入后由 boot.js 调用：重绘所有依赖 Store 的区块。
 * 函数声明会提升到脚本顶部，因此可在 boot.js 中直接调用。
 * ============================================================ */
function refreshAppUI(){
  try {
    if(typeof buildNav==='function') buildNav();
    if(typeof refreshEntitlementUI==='function') refreshEntitlementUI();
    if(typeof renderStudy==='function') renderStudy();
    if(typeof renderFam==='function') renderFam();
    if(typeof renderQuiz==='function') renderQuiz();
    if(typeof renderFullPackTeaser==='function') renderFullPackTeaser();
    if(typeof renderProgress==='function') renderProgress();
    if(typeof renderTrapWords==='function') renderTrapWords();
    if(typeof renderParentReport==='function') renderParentReport();
    if(typeof refreshOrderUI==='function') refreshOrderUI();
    if(typeof renderGrowth==='function') renderGrowth();
    if(typeof syncStats==='function') syncStats();
  } catch(e) { console.error('[拾词] 云端状态重绘失败', e && e.message ? e.message : e); }
}

/* 从任意位置进入兑换：定位到「我的」页的兑换卡（未登录会先显示登录卡）。 */
window.__openRedeem = function () {
  if (typeof go === 'function') go('s-me');
  var input = document.getElementById('redeemInput');
  var card = document.getElementById('meLoginCard');
  var target = (input && input.offsetParent !== null) ? input : (card || input);
  if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (input && input.focus) setTimeout(function () { input.focus(); }, 120);
};
