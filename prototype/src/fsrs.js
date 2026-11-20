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
  var DAY = 86400000;

  var state = null;

  function blank() {
    return {
      cards: {},        // sense_id → FSRS 卡片
      wordSenses: {},  // headword → [sense_id]
      log: [],         // 复习日志 {sid, rating, at, iv}
      quiz: { answered: 0, right: 0, wrong: 0, byModule: {}, byType: {} },
      days: [],        // 有活动的日期戳 (YYYY-MM-DD)
      seconds: 0,      // 累计学习秒数
      startedAt: null
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
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式 */ }
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

  function quizAnswer(correct, module, type) {
    var st = load();
    st.quiz.answered++;
    if (correct) st.quiz.right++; else st.quiz.wrong++;
    if (module) st.quiz.byModule[module] = (st.quiz.byModule[module] || 0) + (correct ? 0 : 1);
    // 题型分布：题库标注了「题型」才统计，没有标记就留空，不臆造
    if (type && !correct) st.quiz.byType[type] = (st.quiz.byType[type] || 0) + 1;
    touchToday();
    save();
  }

  function addTime(sec) {
    var st = load();
    st.seconds += sec;
    touchToday();
    save();
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
    return {
      touchedWords: touchedWords,
      masteredWords: masteredWords,
      weakWords: weakWords,
      senseMastered: senseMastered,
      senseLearning: senseLearning,
      sensesTouched: senseTotal,
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
    reviewSense: reviewSense, mastery: mastery, dueText: dueText,
    quizAnswer: quizAnswer, addTime: addTime, stats: stats, streak: streak
  };
})();
