/* ============================================================
 * 拾词 · FSRS-5 记忆调度引擎（义项级）
 * ============================================================
 * 这不是"看起来像算法"的装饰。原型左栏写着「词卡与记忆算法」，
 * 那这里就必须是真算法：每个义项（sense_id）各自维护难度 D 与
 * 稳定度 S，按幂律遗忘曲线算可提取性 R，据此定下次复习时间。
 *
 * 与 Python 参考实现 tools/fsrs_reference.py 逐式对应，
 * 该脚本用公开 FSRS visualizer 基准值校验过（连续按 Good：
 * 稳定度 3.17 → 10.75 → 34.63 → 100.91，公开基准 3.17 → 10.74
 * → 34.58 → 100.75，偏差 ≤0.16，属各公开实现间的取整口径差异）。
 *
 * 三档评价映射（UI 三个按钮）：
 *   1 不认识 → FSRS rating 1 (Again)
 *   2 模糊   → FSRS rating 2 (Hard)
 *   3 认识   → FSRS rating 3 (Good)
 *   FSRS rating 4 (Easy) 未在 UI 暴露。
 * ============================================================ */
var FSRS = (function () {
  'use strict';

  var W = [
    0.40255, 1.18385, 3.173, 15.69105,   // w0-w3  初始稳定度 Again/Hard/Good/Easy
    7.1949, 0.5345,                      // w4-w5  初始难度
    1.4604, 0.0046,                      // w6-w7  难度更新与均值回拉
    1.54575, 0.1192, 1.01925,            // w8-w10 成功后稳定度增长
    1.9395, 0.11, 0.29605, 2.2698,       // w11-w14 失败后稳定度
    0.2315, 2.9898,                      // w15-w16 Hard 惩罚 / Easy 奖励
    0.51655, 0.6621                      // w17-w18 当日复习
  ];
  var DECAY = -0.5;
  var FACTOR = 19 / 81;
  var MIN_D = 1.0, MAX_D = 10.0;
  var REQUEST_RETENTION = 0.90;
  var MAX_INTERVAL = 36500;
  var DAY = 86400000;

  var STATE = { NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3 };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function initStability(rating) { return W[rating - 1]; }

  function initDifficulty(rating) {
    return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, MIN_D, MAX_D);
  }

  function nextDifficulty(d, rating) {
    var delta = -W[6] * (rating - 3);
    var dPrime = d + delta * ((10 - d) / 9);
    var dTarget = initDifficulty(4);
    return clamp(W[7] * dTarget + (1 - W[7]) * dPrime, MIN_D, MAX_D);
  }

  /* 幂律遗忘曲线：t=0 → R=1；t=S → R≈0.9 */
  function retrievability(elapsedDays, s) {
    if (!s || s <= 0) return 0;
    return Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
  }

  /* 解 R(t)=目标留存 → 下次复习间隔（天） */
  function nextInterval(s, requestRetention) {
    if (requestRetention === undefined) requestRetention = REQUEST_RETENTION;
    var iv = (s / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
    return Math.min(MAX_INTERVAL, Math.max(1, Math.round(iv)));
  }

  function stabilityAfterSuccess(s, r, d, rating) {
    var hard = rating === 2 ? W[15] : 1.0;
    var easy = rating === 4 ? W[16] : 1.0;
    return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9])
      * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
  }

  function stabilityAfterFailure(s, r, d) {
    return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1)
      * Math.exp(W[14] * (1 - r));
  }

  function newCard() {
    return { state: STATE.NEW, d: 0, s: 0, due: null, last: null,
             reps: 0, lapses: 0, iv: 0 };
  }

  /* 一次复习 → 更新卡片状态。elapsedDays 为距上次复习的天数 */
  function review(card, elapsedDays, rating, nowMs) {
    var now = nowMs || Date.now();
    if (card.state === STATE.NEW) {
      card.d = initDifficulty(rating);
      card.s = initStability(rating);
      card.state = rating === 1 ? STATE.LEARNING : STATE.REVIEW;
      card.lapses = rating === 1 ? 1 : 0;
      card.reps = 1;
    } else {
      var r = retrievability(elapsedDays, card.s);
      card.d = nextDifficulty(card.d, rating);
      if (rating === 1) {
        card.s = Math.min(stabilityAfterFailure(card.s, r, card.d), card.s);
        card.lapses++;
        card.state = STATE.RELEARNING;
      } else {
        card.s = stabilityAfterSuccess(card.s, r, card.d, rating);
        card.state = STATE.REVIEW;
      }
      card.reps++;
    }
    card.iv = nextInterval(card.s);
    card.last = now;
    card.due = now + card.iv * DAY;
    return card;
  }

  /* 当前可提取性（记忆留存概率） */
  function currentR(card, nowMs) {
    if (!card || card.state === STATE.NEW || !card.last) return 0;
    var elapsed = ((nowMs || Date.now()) - card.last) / DAY;
    return retrievability(elapsed, card.s);
  }

  /* 人类可读的间隔文案 */
  function intervalText(days) {
    if (days <= 0) return '现在';
    if (days === 1) return '明天';
    if (days < 30) return days + ' 天后';
    if (days < 365) return Math.round(days / 30) + ' 个月后';
    return (days / 365).toFixed(1) + ' 年后';
  }

  return {
    W: W, DECAY: DECAY, FACTOR: FACTOR, STATE: STATE,
    REQUEST_RETENTION: REQUEST_RETENTION, DAY: DAY,
    initStability: initStability, initDifficulty: initDifficulty,
    nextDifficulty: nextDifficulty, retrievability: retrievability,
    nextInterval: nextInterval, newCard: newCard, review: review,
    currentR: currentR, intervalText: intervalText,
    stabilityAfterSuccess: stabilityAfterSuccess,
    stabilityAfterFailure: stabilityAfterFailure
  };
})();


/* ============================================================
 * 拾词 · 学习状态仓库（真实统计，替代原先写死的数字）
 * ============================================================
 * 原型首页与「我的」页的 1,284 累计接触 / 862 已掌握 / 54 待巩固 /
 * 23 天连续 / 42h 学习时长，全是 HTML 里的字面量，做完题不会动。
 * 这里换成真实状态：每次评价、每次答题都写进 localStorage，
 * 计数器由 FSRS 卡片状态推导出来。
 * ============================================================ */
var Store = (function () {
  'use strict';
  var KEY = 'shici_state_v1';
  var ENT_KEY = 'shici_entitlements_v1';  // 购买权益独立持久化，与学习状态分离
  var DAY = 86400000;

  var state = null;
  var entitlements = null;
  /* 云端同步钩子：由 js/cloud.js 注入。未注入时保持原型单机行为，
   * 注入后每次 save/saveEnt 都会把快照投递给云端（本地写入仅作离线暂存）。 */
  var syncHook = null;
  var CACHE_KEY = KEY, ENT_CACHE_KEY = ENT_KEY;
  function setSyncHook(fn) { syncHook = (typeof fn === 'function') ? fn : null; }
  function snapshot() {
    return {
      state: JSON.parse(JSON.stringify(load())),
      entitlements: JSON.parse(JSON.stringify(loadEnt()))
    };
  }
  /* 用云端快照覆盖本地状态。缺失字段用 blank() 补齐，保证旧版本兼容。 */
  function hydrate(remoteState, remoteEnt) {
    var b = blank(), k;
    state = (remoteState && typeof remoteState === 'object') ? remoteState : blank();
    for (k in b) if (!(k in state)) state[k] = b[k];
    entitlements = (remoteEnt && typeof remoteEnt === 'object') ? remoteEnt : { all: false, materials: false, books: {} };
    if (!entitlements.books) entitlements.books = {};
    if (typeof entitlements.materials !== 'boolean') entitlements.materials = !!entitlements.all;
    if (!state.quiz) state.quiz = b.quiz;
    if (!state.quiz.wrongLog) state.quiz.wrongLog = [];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
      localStorage.setItem(ENT_CACHE_KEY, JSON.stringify(entitlements));
    } catch (e) { /* 隐私模式：缓存失败不影响云端主存储 */ }
    return state;
  }

  function blank() {
    return {
      cards: {},        // sense_id → FSRS 卡片（义项维度）
      wordSenses: {},  // headword → [sense_id]
      families: {},    // headword → FSRS 卡片（词形网维度，一词一网一卡）
      log: [],         // 复习日志 {sid, rating, at, iv}
      familyLog: [],   // 词形网复习/回流日志 {hw, rating, cause, at, iv}
      quiz: { answered: 0, right: 0, wrong: 0, byModule: {}, byType: {}, wrongLog: [] },
      days: [],        // 有活动的日期戳 (YYYY-MM-DD)
      seconds: 0,      // 累计学习秒数
      startedAt: null,
      quickPractice: {},  // 非 LEX 覆盖词：word → {count, mastery, lastAt}
      learnedAt: {},      // word → 首次学会时间戳（红转绿的时刻）
      orders: [],         // 购买/兑换订单记录，随 learning_state 一起云同步，永久可下载凭证
      dailyWrong: {},     // 每日今日任务答错的词：{ 'YYYY-MM-DD': [word,...] }，用于跨天追踪
      dailySessions: {},  // 今日任务多轮会话：{ 'YYYY-MM-DD': { rounds:[...], answers, right, wrong } }
      planChecks: {},     // 30 天计划打卡：{ '1': 完成时间戳, ... }，随 learning_state 云同步
      notices: {          // 站内触达：lastSeen 上次打开；dismissed 当天已忽略；read 已读事件
        lastSeen: null,
        dismissed: {},
        read: {}
      }
    };
  }

  function load() {
    if (state) return state;
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : blank();
    } catch (e) { state = blank(); }
    // 兼容字段缺失
    var b = blank();
    for (var k in b) if (!(k in state)) state[k] = b[k];
    if (!state.quiz) state.quiz = b.quiz;
    if (!state.quiz.wrongLog) state.quiz.wrongLog = [];
    if (!state.notices) state.notices = b.notices;
    if (!state.notices.dismissed) state.notices.dismissed = {};
    if (!state.notices.read) state.notices.read = {};
    return state;
  }

  function save() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式 */ }
    if (syncHook) syncHook('state');
  }

  /* ── 购买权益 ──
   * 一次购买全站解锁：付款成功后不再出现付费信息。
   * 权益与学习状态分开存储，重置学习不会掉权益。 */
  /* 两档权益：¥2.9 materials = 四本资料打包下载（本地）；
   * ¥9.9 all = 资料包 + 云端账号服务 + 全部分析。books 保留旧单本授权兼容。 */
  function loadEnt() {
    if (entitlements) return entitlements;
    try {
      var raw = localStorage.getItem(ENT_KEY);
      entitlements = raw ? JSON.parse(raw) : { all: false, materials: false, books: {} };
    } catch (e) { entitlements = { all: false, materials: false, books: {} }; }
    if (!entitlements.books) entitlements.books = {};
    if (typeof entitlements.materials !== 'boolean') entitlements.materials = !!entitlements.all;
    return entitlements;
  }
  function saveEnt() {
    try { localStorage.setItem(ENT_CACHE_KEY, JSON.stringify(entitlements)); } catch (e) { /* 隐私模式 */ }
    if (syncHook) syncHook('entitlements');
  }
  function hasAll() { return !!loadEnt().all; }
  function hasMaterials() { return hasAll() || !!loadEnt().materials; }
  function hasBook(key) { return hasMaterials() || !!loadEnt().books[key]; }
  function grantMaterials() { loadEnt().materials = true; saveEnt(); }
  function grantAll() {
    loadEnt().all = true;
    loadEnt().materials = true;
    saveEnt();
  }
  function grantBook(key) { loadEnt().books[key] = true; saveEnt(); }
  function resetEnt() {
    entitlements = { all: false, materials: false, books: {} };
    saveEnt();
    return entitlements;
  }

  /* 首次学会时间戳：LEX 走 FSRS、覆盖词走 quickPractice，统一在这里记一次。 */
  function noteLearn(word) {
    if (!word) return;
    var st = load();
    if (!st.learnedAt) st.learnedAt = {};
    if (!st.learnedAt[word]) st.learnedAt[word] = Date.now();
  }

  function reset() {
    state = blank();
    save();
    return state;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  /* 相对某日期戳偏移 N 天，返回 YYYY-MM-DD；用于定位「昨日错词」 */
  function dateKeyOffset(key, delta) {
    var p = String(key || today()).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /* 今日任务答错的词：按日期归档，去重，随学习状态云同步 */
  function noteDailyWrong(word) {
    if (!word) return;
    var st = load();
    if (!st.dailyWrong) st.dailyWrong = {};
    var k = today();
    if (!st.dailyWrong[k]) st.dailyWrong[k] = [];
    if (st.dailyWrong[k].indexOf(word) < 0) st.dailyWrong[k].push(word);
    save();
  }
  function dailyWrongOn(key) {
    var st = load();
    if (!st.dailyWrong || !key) return [];
    return (st.dailyWrong[key] || []).slice();
  }

  /* ── 今日任务多轮会话 ──
   * 一轮 = 一次入队词集 + 这一轮的真实作答次数（错词重练也算一次）。
   * 按日期存进 learning_state，随云同步；分母不再只在内存里。 */
  function dailySession(key) {
    var st = load(), k = key || today();
    if (!st.dailySessions) st.dailySessions = {};
    if (!st.dailySessions[k]) {
      st.dailySessions[k] = { rounds: [], answers: 0, right: 0, wrong: 0 };
    }
    return st.dailySessions[k];
  }
  function startDailyRound(words, key) {
    var s = dailySession(key);
    s.rounds.push({
      no: s.rounds.length + 1,
      words: (words || []).slice(),
      answered: 0, right: 0, wrong: 0, wrongWords: []
    });
    save();
    return s.rounds[s.rounds.length - 1];
  }
  function noteDailyRoundAnswer(word, ok, key) {
    var s = dailySession(key);
    var r = s.rounds[s.rounds.length - 1];
    if (!r) r = startDailyRound([], key);
    s.answers++;
    s[ok ? 'right' : 'wrong']++;
    r.answered++;
    r[ok ? 'right' : 'wrong']++;
    if (!ok && word && r.wrongWords.indexOf(word) < 0) r.wrongWords.push(word);
    save();
    return s;
  }
  function dailySessionStats(key) {
    var s = dailySession(key);
    var r = s.rounds[s.rounds.length - 1] || {
      no: 0, words: [], answered: 0, right: 0, wrong: 0, wrongWords: []
    };
    return {
      dateKey: key || today(), rounds: s.rounds.length,
      answers: s.answers, right: s.right, wrong: s.wrong,
      accuracy: s.answers ? Math.round(100 * s.right / s.answers) : 0,
      roundNo: r.no, roundWords: (r.words || []).slice(),
      roundAnswered: r.answered, roundRight: r.right, roundWrong: r.wrong,
      roundWrongWords: (r.wrongWords || []).slice()
    };
  }

  /* ── 30 天计划表打卡 ──
   * 打卡写入 learning_state，跟今日任务分母、订单一样随云同步；换设备不丢。
   * 再次点击同一天撤销，方便误勾后修正。 */
  function planCheckMap() {
    var st = load();
    if (!st.planChecks) st.planChecks = {};
    return st.planChecks;
  }
  function togglePlanCheck(day) {
    var n = Number(day);
    if (!(n >= 1 && n <= 30)) return false;
    var m = planCheckMap(), k = String(n);
    if (m[k]) delete m[k]; else m[k] = Date.now();
    save();
    return !!m[k];
  }
  function planCheckDone(day) { return !!planCheckMap()[String(day)]; }
  function planCheckCount() {
    var m = planCheckMap(), n = 0;
    for (var k in m) if (m[k]) n++;
    return n;
  }

  function touchToday() {
    var st = load();
    var t = today();
    if (st.days.indexOf(t) < 0) { st.days.push(t); }
    if (!st.startedAt) st.startedAt = Date.now();
  }

  /* 连续打卡天数：从今天（或昨天）往前数连续有活动的日子 */
  function streak() {
    var st = load();
    if (!st.days.length) return 0;
    var set = {};
    st.days.forEach(function (d) { set[d] = 1; });
    var n = 0;
    var cur = new Date();
    // 今天没活动则从昨天开始数（当天还没学不算断）
    if (!set[today()]) cur.setDate(cur.getDate() - 1);
    for (;;) {
      var k = cur.getFullYear() + '-' + pad(cur.getMonth() + 1) + '-' + pad(cur.getDate());
      if (!set[k]) break;
      n++;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  }

  function card(sid) {
    var st = load();
    if (!st.cards[sid]) st.cards[sid] = FSRS.newCard();
    return st.cards[sid];
  }

  /* ── 词形网维度 ──
   * 一张网 = 一个核心词 + 它的派生词(word_family) + 形近词(confusable)。
   * 记忆单位是「网」不是单个词形：评价核心词时整网一起调稳定度，
   * 符合「学 access 顺带激活 accessible/accessibility」的发散本意。
   * 网卡片与义项卡片用同一套 FSRS，只是存在 families{} 里、键为 headword。 */
  function familyCard(hw) {
    var st = load();
    if (!st.families[hw]) st.families[hw] = FSRS.newCard();
    return st.families[hw];
  }

  /* 对一张词形网做一次评价。
   * cause: 'study'(背词页三档) | 'E3'|'E5'|'E9'(错因回流)；回流视为一次 Again。 */
  function reviewFamily(hw, rating, cause) {
    var st = load();
    var c = familyCard(hw);
    var elapsed = c.last ? Math.max(0, (Date.now() - c.last) / FSRS.DAY) : 0;
    FSRS.review(c, elapsed, rating, Date.now());
    st.familyLog.push({ hw: hw, rating: rating, cause: cause || 'study',
                        at: Date.now(), iv: c.iv });
    noteLearn(hw);
    touchToday();
    save();
    return { card: c, interval: c.iv, r: FSRS.currentR(c) };
  }

  /* 错因回流：题目答错且错因属于词形维度(E3 形近 / E5 词形 / E9 拼写)时，
   * 把对应词形网按一次失败重排，让它下次优先出现。 */
  var FAMILY_CAUSES = { E3: 1, E5: 1, E9: 1 };
  function reflowOnError(headword, errCode) {
    if (!headword || !FAMILY_CAUSES[errCode]) return null;
    return reviewFamily(headword, 1, errCode); // 1 = Again
  }

  function familyMastery(hw) {
    var st = load();
    var c = st.families[hw];
    if (!c || c.state === FSRS.STATE.NEW) return 0;
    return FSRS.currentR(c);
  }

  function familyDueText(hw) {
    var st = load();
    var c = st.families[hw];
    if (!c || c.state === FSRS.STATE.NEW) return '';
    var d = Math.round((c.due - Date.now()) / FSRS.DAY);
    if (d <= 0) return '待复习';
    return FSRS.intervalText(d);
  }

  /* 对某个义项做一次评价，返回排期结果 */
  function reviewSense(sid, rating, headword) {
    var st = load();
    var c = card(sid);
    var elapsed = c.last ? Math.max(0, (Date.now() - c.last) / FSRS.DAY) : 0;
    FSRS.review(c, elapsed, rating, Date.now());
    st.log.push({ sid: sid, rating: rating, at: Date.now(), iv: c.iv });
    if (headword) {
      if (!st.wordSenses[headword]) st.wordSenses[headword] = [];
      if (st.wordSenses[headword].indexOf(sid) < 0) st.wordSenses[headword].push(sid);
      noteLearn(headword);
    }
    touchToday();
    save();
    return { card: c, interval: c.iv, r: FSRS.currentR(c) };
  }

  /* 某义项的掌握度（0~1），未学过为 0 */
  function mastery(sid) {
    var st = load();
    var c = st.cards[sid];
    if (!c || c.state === FSRS.STATE.NEW) return 0;
    return FSRS.currentR(c);
  }

  function dueText(sid) {
    var st = load();
    var c = st.cards[sid];
    if (!c || c.state === FSRS.STATE.NEW) return '';
    var d = Math.round((c.due - Date.now()) / FSRS.DAY);
    if (d <= 0) return '待复习';
    return FSRS.intervalText(d);
  }

  /* ── 全量单词进度 ──
   * 颜色口径（用户确认）：未学=红，学过=绿；与熟练度细分无关。 */
  var _sidWord = null;
  function sidWordMap() {
    if (_sidWord) return _sidWord;
    _sidWord = {};
    if (typeof LEX !== 'undefined' && LEX.length) {
      for (var i = 0; i < LEX.length; i++) {
        var lw = LEX[i];
        var sids = lw.senses || [];
        for (var j = 0; j < sids.length; j++) _sidWord[sids[j].sense_id] = lw.w;
      }
    }
    return _sidWord;
  }
  function isLexWord(word) {
    if (typeof LEX === 'undefined') return false;
    for (var i = 0; i < LEX.length; i++) if (LEX[i].w === word) return true;
    return false;
  }
  /* 返回 {practiced, mastery, learned, color, source} */
  function wordProgress(word) {
    var st = load();
    if (isLexWord(word)) {
      var m = sidWordMap();
      var sids = [];
      for (var i = 0; i < (typeof LEX !== 'undefined' ? LEX.length : 0); i++) {
        if (LEX[i].w === word) {
          sids = (LEX[i].senses || []).map(function (s) { return s.sense_id; });
          break;
        }
      }
      var cnt = 0, sum = 0, n = 0;
      for (var k = 0; k < st.log.length; k++) {
        if (m[st.log[k].sid] === word) cnt++;
      }
      for (var q = 0; q < sids.length; q++) {
        var c = st.cards[sids[q]];
        if (c && c.state !== FSRS.STATE.NEW) { sum += FSRS.currentR(c); n++; }
      }
      var learned = n > 0;
      return { practiced: cnt, mastery: n ? Math.round(100 * sum / n) : 0,
        learned: learned, color: learned ? 'green' : 'red', source: 'fsrs' };
    }
    var q = st.quickPractice[word];
    var learnedQ = !!(q && q.count > 0);
    return { practiced: q ? q.count : 0, mastery: q ? q.mastery : 0,
      learned: learnedQ, color: learnedQ ? 'green' : 'red', source: 'quick' };
  }
  /* 覆盖词快速学习：rating 1~3 映射到熟练度增量 */
  function practiceQuick(word, level) {
    var st = load();
    var q = st.quickPractice[word] || { count: 0, mastery: 0, lastAt: 0 };
    q.count++;
    var target = level === 3 ? 100 : (level === 2 ? 65 : 30);
    q.mastery = Math.round(q.mastery + (target - q.mastery) * 0.5);
    q.lastAt = Date.now();
    st.quickPractice[word] = q;
    noteLearn(word);
    touchToday();
    save();
    return wordProgress(word);
  }
  /* 核心变体词统一自评入口：LEX 词写 FSRS，覆盖词写 quickPractice。
   * 反馈口径与单词进度页一致：练习次数 + 熟练度 + 红/绿状态。 */
  function practiceVariant(word, level) {
    if (isLexWord(word)) {
      var sid = null;
      if (typeof LEX !== 'undefined') {
        for (var i = 0; i < LEX.length; i++) {
          if (LEX[i].w === word) {
            sid = LEX[i].focus || (LEX[i].senses[0] && LEX[i].senses[0].sense_id);
            break;
          }
        }
      }
      if (sid) {
        reviewSense(sid, level, word);
        reviewFamily(word, level, 'variant');
        return wordProgress(word);
      }
    }
    return practiceQuick(word, level);
  }

  /* 背词取词所需记忆状态：聚焦义项卡片的到期天数/可提取性/失败次数 */
  function studyMeta(word) {
    var st = load();
    var sid = null;
    if (typeof LEX !== 'undefined') {
      for (var i = 0; i < LEX.length; i++) {
        if (LEX[i].w === word) {
          sid = LEX[i].focus || (LEX[i].senses[0] && LEX[i].senses[0].sense_id);
          break;
        }
      }
    }
    if (!sid) return { learned: false, due: Infinity, r: 0, lapses: 0 };
    var c = st.cards[sid];
    if (!c || c.state === FSRS.STATE.NEW) return { learned: false, due: Infinity, r: 0, lapses: 0 };
    var dueDays = Math.round((c.due - Date.now()) / FSRS.DAY);
    return { learned: true, due: dueDays, r: FSRS.currentR(c), lapses: c.lapses || 0 };
  }

  /* ── 成长成就层 ──
   * 以 learnedAt 为口径：红转绿即算已学，与进度页一致。 */
  var LEVELS = [
    { need: 0,    name: '起步' },
    { need: 10,   name: '初识' },
    { need: 50,   name: '入门' },
    { need: 150,  name: '进阶' },
    { need: 400,  name: '熟练' },
    { need: 800,  name: '精通' },
    { need: 1500, name: '高手' },
    { need: 2500, name: '达人' },
    { need: 4110, name: '词霸' }
  ];
  var MILESTONES = [10, 50, 100, 250, 500, 1000, 2000, 4110];

  function learnedCount() {
    var st = load(), n = 0;
    for (var w in st.learnedAt) if (st.learnedAt[w]) n++;
    return n;
  }
  function newWordsToday() {
    var st = load(), t = today(), n = 0;
    for (var w in st.learnedAt) {
      var ts = st.learnedAt[w];
      if (!ts) continue;
      var d = new Date(ts);
      if (d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) === t) n++;
    }
    return n;
  }
  function levelInfo() {
    var n = learnedCount(), idx = 0;
    for (var i = 0; i < LEVELS.length; i++) if (n >= LEVELS[i].need) idx = i;
    var cur = LEVELS[idx], next = LEVELS[idx + 1] || null;
    var span = next ? (next.need - cur.need) : 1;
    var done = n - cur.need;
    return {
      idx: idx + 1, total: LEVELS.length, name: cur.name,
      nextName: next ? next.name : '满级',
      cur: n, need: next ? next.need : cur.need,
      curNeed: cur.need,
      pct: next ? Math.min(100, Math.round(done / span * 100)) : 100,
      toNext: next ? (next.need - n) : 0,
      isMax: !next
    };
  }
  function milestoneList() {
    var n = learnedCount();
    return MILESTONES.map(function (m) { return { n: m, got: n >= m }; });
  }
  function crossedMilestone(before) {
    var after = learnedCount(), hit = null;
    for (var i = 0; i < MILESTONES.length; i++) {
      if (before < MILESTONES[i] && after >= MILESTONES[i]) { hit = MILESTONES[i]; break; }
    }
    return hit;
  }
  function crossedLevel(beforeIdx) {
    var info = levelInfo();
    return info.idx > beforeIdx ? info : null;
  }

  /* 近 7 天每天新学词数：最旧 → 最新 */
  function newWordsLast7Days() {
    var st = load(), out = [], base = new Date();
    base.setHours(0, 0, 0, 0);
    var i, keys = [];
    for (i = 6; i >= 0; i--) {
      var d = new Date(base.getTime() - i * 86400000);
      keys.push({
        key: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        count: 0, isToday: i === 0
      });
    }
    var map = {};
    keys.forEach(function (k) { map[k.key] = k; });
    for (var w in st.learnedAt) {
      var ts = st.learnedAt[w];
      if (!ts) continue;
      var dd = new Date(ts);
      var k = dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate());
      if (map[k]) map[k].count++;
    }
    return keys;
  }
  /* 熟练度分布：牢固(≥80) / 巩固中(40~79) / 新学(<40) */
  function masteryDistribution() {
    var st = load(), solid = 0, learning = 0, fresh = 0;
    for (var w in st.learnedAt) {
      if (!st.learnedAt[w]) continue;
      var m = wordProgress(w).mastery;
      if (m >= 80) solid++;
      else if (m >= 40) learning++;
      else fresh++;
    }
    var total = solid + learning + fresh;
    return { solid: solid, learning: learning, fresh: fresh, total: total };
  }

  /* ── 复盘：逐条错词流水聚合 ──
   * 默认近 30 天，days=0 表示全部；Top 按错次降序、最近错的时间降序。
   * 前端失分地图的错词榜、错因分布、复习队列都取自这里，不再用静态样例。 */
  function wrongWordStats(days) {
    var st = load(), log = (st.quiz && st.quiz.wrongLog) || [];
    var windowMs = days ? Number(days) * DAY : 0, now = Date.now();
    var map = {}, byErr = {}, i, e;
    for (i = 0; i < log.length; i++) {
      e = log[i] || {};
      if (windowMs && (!e.at || now - e.at > windowMs)) continue;
      var ek = e.errCode || e.module || '未标注';
      byErr[ek] = (byErr[ek] || 0) + 1;
      var hw = e.hw || '(未标注)';
      if (!map[hw]) map[hw] = { w: hw, n: 0, at: 0, errCode: e.errCode || '', module: e.module || '' };
      var r = map[hw];
      r.n++;
      if (e.at > r.at) r.at = e.at;
      if (!r.errCode && e.errCode) r.errCode = e.errCode;
      if (!r.module && e.module) r.module = e.module;
    }
    var top = Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.n - a.n || b.at - a.at; });
    return {
      total: top.reduce(function (a, r) { return a + r.n; }, 0),
      distinct: top.length, top: top, byErr: byErr
    };
  }

  /* ── 云端算法统计：FSRS 预测 ──
   * 到期/明日到期来自真实 due；可提取性 R 由幂律遗忘曲线现算。
   * 这是登录后才能看到的「云端算法」权益，数字全部可从卡片状态复核。 */
  function reviewForecast() {
    var st = load(), now = Date.now(), day = FSRS.DAY;
    var dueToday = 0, dueTomorrow = 0, atRisk = 0, solid = 0, cards = 0, sumR = 0, lapses = 0;
    var wordMap = sidWordMap(), seen = {}, weakWords = [];
    Object.keys(st.cards || {}).forEach(function (sid) {
      var c = st.cards[sid];
      if (!c || c.state === FSRS.STATE.NEW || !c.last) return;
      cards++;
      var r = FSRS.currentR(c, now), daysLeft = (c.due - now) / day;
      sumR += r;
      lapses += c.lapses || 0;
      if (daysLeft <= 0) dueToday++;
      else if (daysLeft <= 1) dueTomorrow++;
      if (r >= 0.9) solid++;
      if (r < 0.75) {
        atRisk++;
        var w = wordMap[sid];
        if (w && !seen[w]) {
          seen[w] = 1;
          weakWords.push({
            w: w, r: Math.round(r * 100),
            due: daysLeft <= 0 ? '待复习' : FSRS.intervalText(Math.ceil(daysLeft))
          });
        }
      }
    });
    weakWords.sort(function (a, b) { return a.r - b.r; });
    var famTotal = 0, famSolid = 0;
    Object.keys(st.families || {}).forEach(function (hw) {
      var c = st.families[hw];
      if (!c || c.state === FSRS.STATE.NEW || !c.last) return;
      famTotal++;
      if (FSRS.currentR(c, now) >= 0.9) famSolid++;
    });
    return {
      cards: cards,
      dueToday: dueToday, dueTomorrow: dueTomorrow,
      atRisk: atRisk, solid: solid,
      solidPct: cards ? Math.round(100 * solid / cards) : 0,
      avgR: cards ? Math.round(100 * sumR / cards) : 0,
      lapses: lapses,
      weakWords: weakWords.slice(0, 8),
      familyTotal: famTotal, familySolid: famSolid,
      familySolidPct: famTotal ? Math.round(100 * famSolid / famTotal) : 0
    };
  }

  function quizAnswer(correct, module, type, headword, errCode) {
    var st = load();
    st.quiz.answered++;
    if (correct) st.quiz.right++; else st.quiz.wrong++;
    if (module) st.quiz.byModule[module] = (st.quiz.byModule[module] || 0) + (correct ? 0 : 1);
    // 题型分布：题库标注了「题型」才统计，没有标记就留空，不臆造
    if (type && !correct) st.quiz.byType[type] = (st.quiz.byType[type] || 0) + 1;
    /* 逐条错词流水：复盘页的 Top 错词 / 错因归因 / 复习队列都从这里来。
     * 只留最近 300 条，避免云端快照无限膨胀；统计按 30 天窗口过滤。 */
    if (!correct) {
      if (!st.quiz.wrongLog) st.quiz.wrongLog = [];
      st.quiz.wrongLog.push({
        hw: headword || '', module: module || '', errCode: errCode || '',
        type: type || '', at: Date.now()
      });
      if (st.quiz.wrongLog.length > 300) st.quiz.wrongLog = st.quiz.wrongLog.slice(-300);
    }
    // 错因回流：答错且属于词形维度 → 重排对应词形网
    var reflowed = (!correct ? reflowOnError(headword, errCode) : null);
    touchToday();
    save();
    return { reflowed: !!reflowed };
  }

  function addTime(sec) {
    var st = load();
    st.seconds += sec;
    touchToday();
    save();
  }

  /* ── 今日任务组卷引擎 ──
   * 按「学习 → 复习 → 巩固」闭环，把全量词库分成三段：
   *   new         新学：从未学过的红词，先装入新知
   *   review      复习：FSRS 到期 / 可提取性低 / 失败过，或熟练度偏低的已学词
   *   consolidate 巩固：已学且状态稳定的词，保持接触防止回落
   * 基准配额 8/8/4，某段不足时由其他段按剩余量调剂，凑满 20 词。
   * 排序模式（用户可选）：
   *   alpha 字母序 / theme 主题语义场聚类 / random 日期种子伪随机（当天稳定）。
   * 模式决定「段内以什么顺序学」，三段先后顺序固定为闭环顺序。 */
  var DAILY_TOTAL = 20;
  var DAILY_QUOTA = { new: 8, review: 8, consolidate: 4 };

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function dailyPlan(mode, dateKey, opts) {
    mode = mode || 'theme';
    dateKey = dateKey || today();
    opts = opts || {};
    var st = load();
    var focusSet = {}, excludeSet = {};
    (opts.focus || []).forEach(function (w) { if (w) focusSet[w] = 1; });
    (opts.exclude || []).forEach(function (w) { if (w) excludeSet[w] = 1; });
    var limit = opts.limit || DAILY_TOTAL;
    var quota = opts.quota || DAILY_QUOTA;
    var seedExtra = opts.seedExtra ? String(opts.seedExtra) : '';

    /* 全量词源：CTX_COVERAGE.all 去重 */
    var all = [];
    if (typeof CTX_COVERAGE !== 'undefined' && CTX_COVERAGE && CTX_COVERAGE.all) {
      var seen = {};
      for (var i = 0; i < CTX_COVERAGE.all.length; i++) {
        var meta = CTX_COVERAGE.all[i];
        if (!meta || seen[meta.w]) continue;
        seen[meta.w] = 1;
        all.push(meta);
      }
    }

    /* 昨日错词跨天回带：昨天今日任务答错的词，优先排进今天的复习段，
     * 并打 prevWrong 标记，答对时可提示「上次错了，这次对了」。 */
    var prevKey = dateKeyOffset(dateKey, -1);
    var prevList = dailyWrongOn(prevKey);
    var prevSet = {};
    for (var pi = 0; pi < prevList.length; pi++) prevSet[prevList[pi]] = 1;

    var buckets = { new: [], review: [], consolidate: [] };
    for (var j = 0; j < all.length; j++) {
      var m = all[j];
      /* 多轮换批：上一轮已答对的词默认不再抽；错题回炉的词即使排除也保留 */
      if (excludeSet[m.w] && !focusSet[m.w]) continue;
      var p = wordProgress(m.w);
      var sm = studyMeta(m.w);
      var fast = !isLexWord(m.w);
      var it = {
        w: m.w, meta: m, progress: p,
        due: sm.due, r: sm.r, lapses: sm.lapses,
        theme: m.theme || '', tier: m.tier || 'recommended', deep: !!m.deep,
        learned: p.learned, mastery: p.mastery, practiced: p.practiced, stage: '',
        prevWrong: !!prevSet[m.w], focusWrong: !!focusSet[m.w]
      };
      if (!p.learned) {
        buckets.new.push(it);
      } else {
        var needReview;
        if (fast) {
          /* 覆盖词走 quickPractice：熟练度偏低即需回炉复习 */
          needReview = p.mastery < 80;
        } else {
          needReview = (sm.learned && (sm.due <= 0 || sm.r < 0.85)) ||
                       p.mastery < 70 || sm.lapses > 0;
        }
        if (needReview) buckets.review.push(it);
        else buckets.consolidate.push(it);
      }
    }

    /* 昨日错词强制归入复习段（可能原本在巩固/新学段），确保跨天回带兑现 */
    ['new', 'consolidate'].forEach(function (k) {
      buckets[k] = buckets[k].filter(function (it) {
        if (it.prevWrong || it.focusWrong) { buckets.review.push(it); return false; }
        return true;
      });
    });

    /* 用户选择的模式：决定同优先级内以什么顺序取词 */
    function modeCompare(a, b) {
      if (mode === 'alpha') return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
      if (mode === 'theme') {
        var ta = a.theme || '\uffff', tb = b.theme || '\uffff';
        if (ta !== tb) return ta < tb ? -1 : 1;
        return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
      }
      /* random：日期 + 单词做稳定哈希，同一天刷新结果不变，隔天自动换一批 */
      var ka = hashSeed(dateKey + seedExtra + '|' + a.w), kb = hashSeed(dateKey + seedExtra + '|' + b.w);
      return ka - kb || (a.w < b.w ? -1 : 1);
    }
    ['new', 'review', 'consolidate'].forEach(function (k) {
      buckets[k].sort(function (a, b) {
        if (k === 'new') {
          var ta = a.tier === 'required' ? 0 : 1, tb = b.tier === 'required' ? 0 : 1;
          if (ta !== tb) return ta - tb;                 // 必考层优先装入
          if (a.deep !== b.deep) return a.deep ? -1 : 1; // 精修词优先
        } else if (k === 'review') {
          if (!!a.focusWrong !== !!b.focusWrong) return a.focusWrong ? -1 : 1; // 上轮错词最优先回炉
          if (!!a.prevWrong !== !!b.prevWrong) return a.prevWrong ? -1 : 1;    // 昨日错词次优先
          var da = isFinite(a.due) ? a.due : 9999, db = isFinite(b.due) ? b.due : 9999;
          if (da !== db) return da - db;                 // 越早到期越先复习
        } else {
          if (a.mastery !== b.mastery) return a.mastery - b.mastery; // 越薄弱越先巩固
        }
        return modeCompare(a, b);
      });
    });

    /* 基准配额 + 动态调剂：某段不够由剩余最多的段补齐 */
    var picked = { new: [], review: [], consolidate: [] };
    var stageOrder = ['new', 'review', 'consolidate'];
    stageOrder.forEach(function (k) {
      picked[k] = buckets[k].slice(0, quota[k]);
    });
    var count = picked.new.length + picked.review.length + picked.consolidate.length;
    if (count < limit) {
      var donors = stageOrder.map(function (k) {
        return { k: k, rest: buckets[k].slice(picked[k].length) };
      }).sort(function (a, b) { return b.rest.length - a.rest.length; });
      var need = limit - count, di = 0;
      while (need > 0 && di < donors.length) {
        var d = donors[di];
        if (d.rest.length) { picked[d.k].push(d.rest.shift()); need--; }
        else di++;
      }
    }
    /* 主题模式：同主题打散成「主主题 + 相邻主题」轮转，避免一整段都是同一语境；
     * 错词回炉轮保持原优先级，确保错误词连续拿下。 */
    function mixThemes(list) {
      if (mode !== 'theme' || (opts.focus && opts.focus.length) || list.length < 6) return list;
      var groups = {}, order = [];
      for (var i = 0; i < list.length; i++) {
        var k = list[i].theme || '';
        if (!groups[k]) { groups[k] = []; order.push(k); }
        groups[k].push(list[i]);
      }
      var out = [], idx = 0;
      while (out.length < list.length) {
        var added = false;
        for (var g = 0; g < order.length; g++) {
          var arr = groups[order[g]];
          if (idx < arr.length) { out.push(arr[idx]); added = true; }
        }
        if (!added) break;
        idx++;
      }
      return out;
    }
    stageOrder.forEach(function (k) {
      picked[k] = mixThemes(picked[k]);
      picked[k].forEach(function (it) { it.stage = k; });
    });

    /* 呈现顺序 = 学习闭环：新学 → 复习 → 巩固 */
    var items = picked.new.concat(picked.review).concat(picked.consolidate);
    var counts = {
      new: picked.new.length, review: picked.review.length,
      consolidate: picked.consolidate.length
    };
    /* 主题模式：给出今日聚焦主题（新学段出现最多的 theme） */
    var themeFocus = '';
    if (mode === 'theme') {
      var freq = {}, best = '';
      picked.new.forEach(function (it) {
        if (!it.theme) return;
        freq[it.theme] = (freq[it.theme] || 0) + 1;
        if (!best || freq[it.theme] > freq[best]) best = it.theme;
      });
      themeFocus = best;
    }
    return {
      mode: mode, dateKey: dateKey, total: items.length, counts: counts,
      items: items, words: items.map(function (x) { return x.w; }),
      themeFocus: themeFocus, generatedAt: Date.now(),
      prevWrongWords: prevList,
      prevWrongCount: prevList.length,
      prevWrongInPlan: items.filter(function (x) { return x.prevWrong; }).length,
      focusWords: (opts.focus || []).slice(),
      focusInPlan: items.filter(function (x) { return x.focusWrong; }).length
    };
  }

  /* ── 由 FSRS 状态推导的聚合计数 ──
   * 口径（与「掌握度挂在义项上」一致，不得注水）：
   *   累计接触 = 至少有一个义项学过（该词条出现在 LEX 的全量义项里）
   *   已掌握   = 该词的【全部义项】都在学，且当前留存率都 ≥ 0.90
   *   待巩固   = 学过但尚未全部达标
   * 只学过 1 个义项的词绝不算「已掌握」。 */
  function stats() {
    var st = load();
    var touchedWords = 0, masteredWords = 0, weakWords = 0;
    var senseTotal = 0, senseMastered = 0, senseLearning = 0;

    // 词 → 全量义项。以 LEX 为准（拿得到全量义项），否则退回已学义项
    var list = [];
    if (typeof LEX !== 'undefined' && LEX.length) {
      for (var i = 0; i < LEX.length; i++) {
        var lw = LEX[i];
        var sids = [];
        for (var j = 0; j < (lw.senses || []).length; j++) sids.push(lw.senses[j].sense_id);
        list.push({ w: lw.w, sids: sids });
      }
    } else {
      for (var hw in st.wordSenses) list.push({ w: hw, sids: st.wordSenses[hw] });
    }

    for (var n = 0; n < list.length; n++) {
      var sids = list[n].sids;
      if (!sids || !sids.length) continue;
      var allOk = true, any = false;
      for (var k = 0; k < sids.length; k++) {
        var c = st.cards[sids[k]];
        if (!c || c.state === FSRS.STATE.NEW) { allOk = false; continue; }
        any = true;
        senseTotal++;
        var r = FSRS.currentR(c);
        if (r >= 0.9) senseMastered++; else { senseLearning++; allOk = false; }
      }
      if (any) {
        touchedWords++;
        if (allOk) masteredWords++; else weakWords++;
      }
    }
    // 词形网统计：学到过的网 / 达标的网
    var famTouched = 0, famMastered = 0;
    for (var fh in st.families) {
      var fc = st.families[fh];
      if (!fc || fc.state === FSRS.STATE.NEW) continue;
      famTouched++;
      if (FSRS.currentR(fc) >= 0.9) famMastered++;
    }

    return {
      touchedWords: touchedWords,
      masteredWords: masteredWords,
      weakWords: weakWords,
      senseMastered: senseMastered,
      senseLearning: senseLearning,
      sensesTouched: senseTotal,
      familiesTouched: famTouched,
      familiesMastered: famMastered,
      streak: streak(),
      minutes: Math.round(st.seconds / 60),
      quizAnswered: st.quiz.answered,
      quizRight: st.quiz.right,
      quizWrong: st.quiz.wrong,
      accuracy: st.quiz.answered ? Math.round(100 * st.quiz.right / st.quiz.answered) : 0
    };
  }

  return {
    load: load, save: save, reset: reset, card: card,
    setSyncHook: setSyncHook, snapshot: snapshot, hydrate: hydrate,
    reviewSense: reviewSense, mastery: mastery, dueText: dueText,
    reviewFamily: reviewFamily, reflowOnError: reflowOnError,
    familyMastery: familyMastery, familyDueText: familyDueText,
    quizAnswer: quizAnswer, addTime: addTime, stats: stats, streak: streak,
    hasAll: hasAll, hasBook: hasBook, hasMaterials: hasMaterials,
    grantAll: grantAll, grantMaterials: grantMaterials, grantBook: grantBook,
    resetEnt: resetEnt,
    isLexWord: isLexWord, wordProgress: wordProgress, practiceQuick: practiceQuick,
    practiceVariant: practiceVariant, studyMeta: studyMeta,
    learnedCount: learnedCount, newWordsToday: newWordsToday,
    dailyPlan: dailyPlan, DAILY_TOTAL: DAILY_TOTAL,
    noteDailyWrong: noteDailyWrong, dailyWrongOn: dailyWrongOn, dateKeyOffset: dateKeyOffset, today: today,
    startDailyRound: startDailyRound, noteDailyRoundAnswer: noteDailyRoundAnswer,
    dailySession: dailySession, dailySessionStats: dailySessionStats,
    wrongWordStats: wrongWordStats, reviewForecast: reviewForecast,
    planCheckMap: planCheckMap, togglePlanCheck: togglePlanCheck,
    planCheckDone: planCheckDone, planCheckCount: planCheckCount,
    levelInfo: levelInfo, milestoneList: milestoneList,
    crossedMilestone: crossedMilestone, crossedLevel: crossedLevel,
    newWordsLast7Days: newWordsLast7Days, masteryDistribution: masteryDistribution
  };
})();
