/* ============================================================
 * 拾词 · 站内触达（Notice）派生引擎
 * ------------------------------------------------------------
 * 待办事件不落库，进入 App 时由真实 FSRS 状态现算；
 * learning_state.notices 只存「上次打开 / 当天忽略 / 已读」，
 * 与未来接微信/短信推送共用同一份事件模型。
 * 所有数字来自 Store.reviewForecast() / stats()，不写死。
 * ============================================================ */
var Notice = (function () {
  'use strict';

  var _gapCache = null; // 本次进入的断更天数（touchSeen 时锁定，避免更新 lastSeen 后归零）

  function dayMs() { return (typeof FSRS !== 'undefined' && FSRS.DAY) ? FSRS.DAY : 86400000; }

  function todayKey(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function state() {
    var st = (typeof Store !== 'undefined' && Store.load) ? Store.load() : {};
    if (!st.notices) st.notices = { lastSeen: null, dismissed: {}, read: {} };
    if (!st.notices.dismissed) st.notices.dismissed = {};
    if (!st.notices.read) st.notices.read = {};
    return st;
  }

  function save() { if (typeof Store !== 'undefined' && Store.save) Store.save(); }

  /* 断更天数：以 lastSeen 距今天数取整；从未打开视为 0（新用户不召回） */
  function gapDays() {
    var last = state().notices.lastSeen;
    if (!last) return 0;
    return Math.max(0, Math.floor((Date.now() - last) / dayMs()));
  }

  /* 每次进入 App 更新 lastSeen；锁定本次断更天数供整场会话的派生使用，
   * 否则更新 lastSeen 后 gapDays() 变 0，comeback 事件会消失。 */
  function touchSeen() {
    var n = state().notices;
    var gap = gapDays(); // 更新前的真实断更天数
    _gapCache = gap;
    n.lastSeen = Date.now();
    save();
    return gap;
  }

  function forecast() {
    return (typeof Store !== 'undefined' && Store.reviewForecast) ? Store.reviewForecast() :
      { dueToday: 0, atRisk: 0, weakWords: [], solid: 0, cards: 0, solidPct: 0 };
  }

  /* 派生待办事件。每项：{id, type, title, desc, cta, panel}
   * id 含日期键 → 每天一条，不无限累积；未读判定看 notices.read。 */
  function derive(opts) {
    opts = opts || {};
    var f = forecast(), st = state(), n = st.notices;
    var gap = opts.gap != null ? opts.gap : (_gapCache != null ? _gapCache : gapDays());
    var today = todayKey(), out = [];

    // 新用户没有学习卡片时不制造焦虑
    if (!f.cards) return out;

    if (f.dueToday >= 1) {
      out.push({
        id: 'due-' + today, type: 'due',
        title: f.dueToday + ' 个词快忘了 · 现在只要 30 秒',
        desc: '今日到期词，趁还记得先过一遍',
        cta: '立即复习', action: 'startRescue()', panel: 's-home'
      });
    }
    if (gap >= 3 && f.dueToday >= 1) {
      out.push({
        id: 'comeback-' + today, type: 'comeback',
        title: '欢迎回来，只补快忘的，不用重来',
        desc: '断更 ' + gap + ' 天，为你挑了 ' + Math.min(10, f.atRisk || f.dueToday) + ' 个高危词',
        cta: '快速找回', action: 'startRescue()', panel: 's-home'
      });
    }
    if (f.atRisk >= 3) {
      out.push({
        id: 'risk-' + today, type: 'risk',
        title: f.atRisk + ' 个词处于遗忘边缘',
        desc: '可提取性低于 75%，建议先复习再学新词',
        cta: '查看', action: "go('s-review')", panel: 's-review'
      });
    }
    if (typeof Store !== 'undefined' && Store.stats && Store.stats().streak >= 7) {
      var streak = Store.stats().streak;
      out.push({
        id: 'streak-' + today, type: 'streak',
        title: '连续打卡 ' + streak + ' 天',
        desc: '记忆正在变成长期资产，继续保持',
        cta: '看看成果', action: "go('s-progress')", panel: 's-progress'
      });
    }
    return out;
  }

  /* 首页预警卡：只关心 due 且当天未忽略；comeback 单独一张卡 */
  function homeAlert() {
    var evs = derive();
    var due = null, comeback = null;
    evs.forEach(function (e) {
      if (e.type === 'due') due = e;
      if (e.type === 'comeback') comeback = e;
    });
    var n = state().notices, today = todayKey();
    if (due && n.dismissed.due === today) due = null;
    if (comeback && n.dismissed.comeback === today) comeback = null;
    return comeback || due; // 断更回来优先展示找回卡
  }

  function isDismissed(type) { return state().notices.dismissed[type] === todayKey(); }
  function dismiss(type) { state().notices.dismissed[type] = todayKey(); save(); }

  function isRead(id) { return !!state().notices.read[id]; }
  function markRead(id) { state().notices.read[id] = Date.now(); save(); }

  /* 未读且未忽略的事件数（用于红点） */
  function unreadCount() {
    var n = state().notices, today = todayKey();
    return derive().filter(function (e) {
      return !n.read[e.id] && n.dismissed[e.type] !== today;
    }).length;
  }

  /* 通知中心列表：近 7 天已知事件（今天派生 + 历史已读记录），新→旧 */
  function recent() {
    var n = state().notices;
    var list = derive().slice();
    // 已读/已忽略的历史事件也保留，保证列表不空
    var tracked = {};
    list.forEach(function (e) { tracked[e.id] = e; });
    Object.keys(n.read).forEach(function (id) {
      if (tracked[id]) return;
      var m = /^(due|risk|comeback|streak)-(\d{4}-\d{2}-\d{2})$/.exec(id);
      if (!m) return;
      var ago = (Date.now() - new Date(m[2] + 'T00:00:00').getTime()) / dayMs();
      if (ago > 7 || ago < 0) return;
      tracked[id] = { id: id, type: m[1], title: '已查看提醒', desc: '', action: '', panel: '', readAt: n.read[id] };
    });
    return Object.keys(tracked).map(function (k) { return tracked[k]; }).sort(function (a, b) {
      var ta = a.readAt || Date.now(), tb = b.readAt || Date.now();
      return tb - ta;
    }).slice(0, 12);
  }

  /* 抢救词包：到期且低可提取性的词优先，最多 10 个。
   * 先取 reviewForecast().weakWords（已按 R 升序排好）；
   * 再直接从 cards + wordSenses 兜底反查，避免词库映射缺失时包为空。 */
  function rescueWords(limit) {
    limit = limit || 10;
    var pool = (forecast().weakWords || []).map(function (x) { return x.w; });
    if (pool.length >= limit) return pool.slice(0, limit);
    var st = state(), now = Date.now(), norm = FSRS && FSRS.DAY ? FSRS.DAY : 86400000;
    var reverse = {};
    Object.keys(st.wordSenses || {}).forEach(function (w) {
      (st.wordSenses[w] || []).forEach(function (sid) { reverse[sid] = w; });
    });
    var extra = [];
    Object.keys(st.cards || {}).forEach(function (sid) {
      var c = st.cards[sid];
      if (!c || !c.last || c.state === FSRS.STATE.NEW) return;
      var overdue = (now - c.due) / norm >= 0;
      var lowR = FSRS.currentR(c, now) < 0.85;
      if ((overdue || lowR) && reverse[sid] && pool.indexOf(reverse[sid]) < 0) {
        extra.push({ w: reverse[sid], r: FSRS.currentR(c, now), due: c.due });
      }
    });
    extra.sort(function (a, b) { return a.r - b.r || a.due - b.due; });
    extra.forEach(function (e) { if (pool.length < limit) pool.push(e.w); });
    return pool.slice(0, limit);
  }

  function reset() {
    var st = state();
    st.notices = { lastSeen: null, dismissed: {}, read: {} };
    save();
  }

  return {
    todayKey: todayKey, gapDays: gapDays, touchSeen: touchSeen,
    derive: derive, homeAlert: homeAlert,
    isDismissed: isDismissed, dismiss: dismiss,
    isRead: isRead, markRead: markRead, unreadCount: unreadCount, recent: recent,
    rescueWords: rescueWords, reset: reset
  };
})();
