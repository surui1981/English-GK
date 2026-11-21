/* ============================================================
 * 拾词 · 启动编排（游客优先 + 登录增强）
 * ------------------------------------------------------------
 * 游客：直接用本机暂存数据渲染，全部学习功能开放，无登录墙。
 * 登录：拉取云端快照覆盖本机 → 迁移本地进度 → 注入同步钩子。
 * 需要账号的动作（购买/兑换/周报）走 requireLogin：暂存意图 →
 * 引导到「我的」页登录 → 登录成功后自动续做。
 * ============================================================ */
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function show(id, on) { var el = byId(id); if (el) el.style.display = on ? '' : 'none'; }
  function msg(text, isError) {
    var el = byId('loginMsg');
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isError ? 'var(--danger)' : 'var(--accent-deep)';
  }
  function busy(on) {
    [byId('btnSendCode'), byId('btnLoginPhone'), byId('btnWechat'), byId('btnRedeem')]
      .forEach(function (b) { if (b) b.disabled = !!on; });
  }

  var PENDING_CODE = 'shici_pending_redeem';
  function rememberCode(code) {
    try { sessionStorage.setItem(PENDING_CODE, code); } catch (e) { /* 隐私模式忽略 */ }
  }
  function takeCode() {
    try {
      var c = sessionStorage.getItem(PENDING_CODE);
      if (c) sessionStorage.removeItem(PENDING_CODE);
      return c;
    } catch (e) { return null; }
  }

  /* 延后动作：登录后自动续做（购买 / 周报 / 兑换等） */
  var pendingAction = null;
  function requireLogin(action, hint) {
    if (CloudStore.getSession()) { if (action) action(); return true; }
    pendingAction = action || null;
    if (hint) msg(hint, false);
    if (typeof go === 'function') go('s-me');
    var card = byId('meLoginCard');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var p = byId('loginPhone');
    if (p && p.focus) setTimeout(function () { p.focus(); }, 120);
    return false;
  }
  window.__requireLogin = requireLogin;

  function renderAuthUI(session) {
    var loggedIn = !!session;
    show('meLoginCard', !loggedIn);
    show('memberHead', loggedIn);
    show('btnSignOut', loggedIn);
    var u = (session && session.user) || {};
    var name = u.name || '同学';
    var n = byId('userName'); if (n) n.textContent = name;
    var av = byId('userAvatar'); if (av) av.textContent = (name || '同').slice(0, 1);
    var badge = byId('userTier');
    if (badge) badge.textContent = loggedIn ? (Store.hasAll() ? '全包用户' : '普通用户') : '游客';
  }

  /* 展示当前账号绑定的兑换码（学号） */
  function refreshStudentId() {
    var box = byId('studentIdBox');
    if (!box) return;
    if (!CloudStore.getSession()) { box.innerHTML = ''; return; }
    CloudStore.myRedeemCode().then(function (r) {
      if (r && r.code) {
        box.innerHTML = '<div class="sid-card"><div class="lb">我的学号（兑换码）</div>' +
          '<div class="code">' + r.code + '</div>' +
          '<div class="mt">一码一号 · 终身绑定 · 绑定于 ' +
          new Date(r.bound_at).toLocaleDateString('zh-CN') + '</div></div>';
      } else { box.innerHTML = ''; }
    }).catch(function () { box.innerHTML = ''; });
  }

  /* 兑换 */
  var REDEEM_REASON = {
    INVALID: '兑换码不存在，请检查后重试', EXPIRED: '兑换码已过期',
    VOID: '兑换码已作废', TAKEN: '该兑换码已被其他账号使用'
  };
  function doRedeem(code) {
    return CloudStore.redeemCode(code).then(function (r) {
      if (!r || !r.ok) throw new Error((r && REDEEM_REASON[r.reason]) || '兑换失败，请稍后重试');
      return CloudStore.applyFullEntitlement().then(function () {
        if (typeof recordRedeemOrder === 'function') recordRedeemOrder(r.code);
        if (typeof refreshAppUI === 'function') refreshAppUI();
        renderAuthUI(CloudStore.getSession());
        if (typeof showReward === 'function') showReward('兑换成功', '全包已解锁 · 学号 ' + r.code, false);
      });
    });
  }
  function onRedeem() {
    var code = ((byId('redeemInput') || {}).value || '').trim().toUpperCase();
    if (!code) { msg('请输入兑换码', true); return; }
    if (!CloudStore.getSession()) {
      rememberCode(code);
      msg('兑换码已记录，请先登录，登录后将自动兑换。', false);
      var p = byId('loginPhone'); if (p && p.focus) p.focus();
      return;
    }
    msg('正在兑换…', false); busy(true);
    doRedeem(code).then(function () {
      busy(false); msg('兑换成功，全包已解锁！', false);
    }).catch(function (e) { busy(false); msg(e.message, true); });
  }
  function consumePendingCode() {
    var code = takeCode();
    if (!code) return Promise.resolve(false);
    return doRedeem(code).then(function () { return true; }).catch(function (e) {
      CloudStore.setStatus('自动兑换未完成：' + e.message, true);
      return false;
    });
  }

  /* 首登自举：管理员表为空时首位登录者自动成为管理员 */
  var bootstrapTried = false;
  function tryBootstrapAdmin() {
    if (bootstrapTried) return Promise.resolve(false);
    bootstrapTried = true;
    return CloudStore.bootstrapFirstAdmin().then(function (r) {
      if (r && r.ok && r.first) {
        if (typeof showReward === 'function') showReward('管理员已开通', '你是首个登录账号，已进入管理白名单', false);
        CloudStore.setStatus('已开通管理员权限', false);
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  /* 游客本地暂存 + 云端快照合并：学习记录不因登录而丢失。
   * 冲突口径：练习次数/掌握度取大值，首次学会时间取早值，
   * FSRS 卡以复习次数多的一方为准，日志按内容去重后合并。 */
  function mergeCounter(a, b) {
    var out = {}, k;
    a = a || {}; b = b || {};
    for (k in a) out[k] = (+a[k] || 0);
    for (k in b) out[k] = (out[k] || 0) + (+b[k] || 0);
    return out;
  }
  function mergeStates(local, remote) {
    if (!remote || typeof remote !== 'object') return local;
    var out = JSON.parse(JSON.stringify(remote));
    var k, w;

    /* 词形/义项列表：并集 */
    var ls = local.wordSenses || {}, rs = out.wordSenses || {};
    for (w in ls) {
      if (!rs[w]) { rs[w] = (ls[w] || []).slice(); continue; }
      var seenS = {}, arrS = (rs[w] || []).concat(ls[w] || []);
      rs[w] = arrS.filter(function (s) { if (seenS[s]) return false; seenS[s] = 1; return true; });
    }
    out.wordSenses = rs;

    /* 覆盖词轻量记录：次数与熟练度取大值 */
    var lq = local.quickPractice || {}, rq = out.quickPractice || {};
    for (w in lq) {
      var a = lq[w] || {}, b = rq[w] || { count: 0, mastery: 0, lastAt: 0 };
      rq[w] = {
        count: Math.max(+a.count || 0, +b.count || 0),
        mastery: Math.max(+a.mastery || 0, +b.mastery || 0),
        lastAt: Math.max(+a.lastAt || 0, +b.lastAt || 0)
      };
    }
    out.quickPractice = rq;

    /* 红转绿时刻取最早，避免登录把已学词打回新词 */
    var ll = local.learnedAt || {}, rl = out.learnedAt || {};
    for (w in ll) {
      var lv = +ll[w] || 0, rv = +rl[w] || 0;
      if (lv) rl[w] = rv ? Math.min(lv, rv) : lv;
    }
    out.learnedAt = rl;

    /* FSRS 卡片：复习次数多的一方胜出，云端没有则直接带入 */
    ['cards', 'families'].forEach(function (key) {
      var lc = local[key] || {}, rc = out[key] || {};
      for (var id in lc) {
        if (!rc[id]) { rc[id] = lc[id]; continue; }
        var ln = (+lc[id].reps || 0) + (+lc[id].lapses || 0);
        var rn = (+rc[id].reps || 0) + (+rc[id].lapses || 0);
        if (ln > rn) rc[id] = lc[id];
      }
      out[key] = rc;
    });

    /* 日志：按内容去重，保留最近 2000 条 */
    ['log', 'familyLog'].forEach(function (key) {
      var arr = (out[key] || []).concat(local[key] || []);
      var seen = {}, uniq = [];
      for (var i = arr.length - 1; i >= 0; i--) {
        var sig = JSON.stringify(arr[i]);
        if (seen[sig]) continue;
        seen[sig] = 1; uniq.push(arr[i]);
      }
      out[key] = uniq.reverse().slice(-2000);
    });

    out.days = (out.days || []).concat(local.days || [])
      .filter(function (d, i, xs) { return xs.indexOf(d) === i; }).sort();
    out.seconds = Math.max(+out.seconds || 0, +local.seconds || 0);
    out.startedAt = out.startedAt || local.startedAt || null;

    var lz = local.quiz || {}, rz = out.quiz || {};
    out.quiz = {
      answered: (+rz.answered || 0) + (+lz.answered || 0),
      right: (+rz.right || 0) + (+lz.right || 0),
      wrong: (+rz.wrong || 0) + (+lz.wrong || 0),
      byModule: mergeCounter(rz.byModule, lz.byModule),
      byType: mergeCounter(rz.byType, lz.byType)
    };
    return out;
  }

  /* 登录后：合并游客暂存与云端快照，续做待办 */
  function enterApp(session) {
    return CloudStore.load().then(function (remote) {
      var local = Store.snapshot();
      if (remote && remote.state) {
        Store.hydrate(mergeStates(local.state, remote.state), remote.entitlements);
        CloudStore.push(); // 合并结果立即回写云端，游客进度完成上云
      } else {
        Store.hydrate(local.state,
          (remote && remote.entitlements) ? remote.entitlements : local.entitlements);
        CloudStore.push();
      }
      Store.setSyncHook(CloudStore.schedulePush);
      CloudStore.markReady();
      if (typeof refreshAppUI === 'function') refreshAppUI();
      renderAuthUI(session);
      refreshStudentId();
      msg('', false);
      CloudStore.setStatus(remote ? '已从云端恢复进度' : '进度将保存到云端', false);
      return tryBootstrapAdmin()
        .then(function () { return consumePendingCode(); })
        .then(function () {
          if (pendingAction) { var a = pendingAction; pendingAction = null; try { a(); } catch (e) {} }
        });
    });
  }

  /* 游客启动：用本地暂存直接渲染，不弹登录墙 */
  function enterGuest(callbackMsg) {
    Store.setSyncHook(null);
    if (typeof refreshAppUI === 'function') refreshAppUI();
    renderAuthUI(null);
    refreshStudentId();
    if (callbackMsg) msg(callbackMsg, true);
    CloudStore.setStatus('游客模式 · 进度暂存在本机', false);
  }

  function onSendCode() {
    var phone = (byId('loginPhone') || {}).value || '';
    msg('正在发送验证码…', false); busy(true);
    CloudStore.sendPhoneCode(phone).then(function () {
      busy(false); msg('验证码已发送，请查收短信。', false);
    }).catch(function (e) { busy(false); msg(e.message || '发送失败，请稍后重试。', true); });
  }
  function onSubmitPhone() {
    var phone = (byId('loginPhone') || {}).value || '';
    var token = (byId('loginCode') || {}).value || '';
    msg('正在登录…', false); busy(true);
    CloudStore.submitPhoneLogin(phone, token).then(function (session) {
      busy(false); return enterApp(session);
    }).catch(function (e) { busy(false); msg(e.message || '登录失败，请重试。', true); });
  }
  function onWechat() {
    busy(true);
    CloudStore.signInWechat().catch(function (e) { busy(false); msg(e.message || '微信登录失败，请重试。', true); });
  }
  function onSignOut() {
    if (!confirm('退出后本机暂存进度仍会保留，确定退出？')) return;
    CloudStore.flush().then(function () { return CloudStore.signOut(); }).then(function (ok) {
      if (!ok) { CloudStore.setStatus(CloudStore.lastErrorMessage(), true); return; }
      Store.setSyncHook(null);
      location.reload();
    });
  }

  function wire() {
    var b;
    if ((b = byId('btnSendCode'))) b.addEventListener('click', onSendCode);
    if ((b = byId('btnLoginPhone'))) b.addEventListener('click', onSubmitPhone);
    if ((b = byId('btnWechat'))) b.addEventListener('click', onWechat);
    if ((b = byId('btnRedeem'))) b.addEventListener('click', onRedeem);
    if ((b = byId('btnSignOut'))) b.addEventListener('click', onSignOut);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && CloudStore.isReady()) CloudStore.flush();
    });
  }

  function start() {
    wire();
    CloudStore.restoreAuth().then(function (res) {
      if (!res.session) {
        enterGuest(res.callback ? (CloudStore.lastErrorMessage() || '登录未完成，请重试。') : null);
        return;
      }
      return enterApp(res.session);
    }).catch(function (e) {
      enterGuest('云端连接失败：' + (e && e.message ? e.message : '请稍后重试'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
