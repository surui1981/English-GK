/* ============================================================
 * 拾词 · 云服务适配层（Auth + Database）
 * ------------------------------------------------------------
 * 唯一数据源：云数据库 learning_state / entitlements。
 * 浏览器本地存储只作为离线暂存，登录后一律以云端快照为准。
 * 客户端不发送 owner_id —— 由 DEFAULT auth.uid() 与 RLS 负责归属。
 * ============================================================ */
var CloudStore = (function () {
  'use strict';

  var cloud = null;
  var session = null;
  var ready = false;
  var pushTimer = null;
  var pushing = false;
  var dirty = false;
  var pendingOtp = null; // { phone, verificationId, isExistingUser }
  var lastError = '';

  /* ── 初始化（只建一个客户端实例） ── */
  function init() {
    if (typeof WorkBuddyCloud === 'undefined' || !WorkBuddyCloud.createWorkBuddyCloud) {
      lastError = '云服务组件未加载，请检查网络后刷新页面。';
      return null;
    }
    if (!cloud) {
      cloud = WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CLOUD_CONFIG.endpoint,
        oauthRelayBaseUrl: CLOUD_CONFIG.oauthRelayBaseUrl,
        publishableKey: CLOUD_CONFIG.publishableKey
      });
    }
    return cloud;
  }

  function isReady() { return ready; }
  function getSession() { return session; }
  function lastErrorMessage() { return lastError; }

  /* ── 错误分类：可恢复的网络错误保留会话，鉴权错误要求重新登录 ── */
  function describeError(err) {
    if (!err) return '未知错误';
    var kind = err.kind || '';
    if (kind === 'unauthenticated' || kind === 'invalid_grant') {
      return '登录已失效，请重新登录。';
    }
    if (kind === 'network' || kind === 'backend-unavailable') {
      return '网络连接失败，已保留本地进度，稍后会自动重试。';
    }
    if (err.code === '42501') return '没有权限访问这份数据。';
    if (err.code === '42P01') return '云端数据表尚未就绪，请联系管理员。';
    if (err.code === '23505') return '记录已存在。';
    return err.message || '操作失败，请稍后重试。';
  }

  function setStatus(msg, isError) {
    var el = document.getElementById('cloudStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = isError ? 'var(--danger)' : 'var(--accent-deep)';
    if (msg) el.style.display = 'block';
  }

  /* ── 回调分发：必须在任何登录门禁之前执行 ──
   * 只处理 code/error 回调；普通访问走 getSession() 恢复会话。
   * WorkBuddy 与微信是两个不同的 SDK 方法，不可混用。 */
  function restoreAuth() {
    init();
    if (!cloud) return Promise.resolve({ session: null, callback: false });

    var url;
    try { url = new URL(location.href); } catch (e) { url = { searchParams: { has: function () { return false; } } }; }

    if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
      return cloud.auth.getSession().then(function (res) {
        session = (res && res.data) ? res.data : null;
        if (res && res.error) lastError = describeError(res.error);
        return { session: session, callback: false };
      });
    }

    var provider = url.searchParams.get('provider');
    if (provider !== 'workbuddy' && provider !== 'wechat') {
      lastError = '登录回调缺少有效的登录方式，请重新登录。';
      return Promise.resolve({ session: null, callback: true });
    }
    var handler = provider === 'workbuddy'
      ? cloud.auth.handleWorkBuddyCallback
      : cloud.auth.handleWechatWebCallback;
    if (typeof handler !== 'function') {
      lastError = '当前云服务组件不支持该登录方式，请刷新后重试。';
      return Promise.resolve({ session: null, callback: true });
    }

    return handler.call(cloud.auth).then(function (res) {
      if (res && res.error) {
        lastError = describeError(res.error);
        return { session: null, callback: true };
      }
      session = (res && res.data) ? res.data : null;
      clearCallbackParams();
      return { session: session, callback: true };
    });
  }

  /* 只清除 code/state/provider，保留应用自己的查询参数 */
  function clearCallbackParams() {
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
      ['code', 'state', 'provider'].forEach(function (k) { url.searchParams.delete(k); });
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) { /* 老浏览器忽略 */ }
  }

  /* ── 登录方式：手机号验证码 + 微信授权 ── */
  function sendPhoneCode(phone) {
    init();
    if (!cloud) return Promise.reject(new Error(lastError));
    if (!/^1\d{10}$/.test(phone || '')) {
      return Promise.reject(new Error('请输入正确的 11 位手机号'));
    }
    return cloud.auth.sendOtp({ phone: phone }).then(function (res) {
      if (res.error) throw new Error(describeError(res.error));
      pendingOtp = {
        phone: phone,
        verificationId: res.data.verificationId,
        isExistingUser: res.data.isExistingUser
      };
      return true;
    });
  }

  function submitPhoneLogin(phone, token) {
    init();
    if (!cloud) return Promise.reject(new Error(lastError));
    var p = pendingOtp;
    if (!p || p.phone !== phone) {
      return Promise.reject(new Error('请先获取该手机号的验证码'));
    }
    return cloud.auth.verifyOtp({
      phone: p.phone,
      verificationId: p.verificationId,
      isExistingUser: p.isExistingUser,
      token: token
    }).then(function (res) {
      if (res.error) throw new Error(describeError(res.error));
      pendingOtp = null;
      session = res.data || null;
      return session;
    });
  }

  function signInWechat() {
    init();
    if (!cloud) return Promise.reject(new Error(lastError));
    return cloud.auth.signInWithOAuth({
      provider: 'wechat',
      redirectTo: location.origin
    }).then(function (res) {
      if (res.error) throw new Error(describeError(res.error));
      // 必须同页跳转；SDK 把校验凭据留在当前标签页的 sessionStorage。
      location.assign(res.data.url);
      return true;
    });
  }

  function signOut() {
    if (!cloud) return Promise.resolve(true);
    return cloud.auth.signOut().then(function (res) {
      if (res && res.error) { lastError = describeError(res.error); return false; }
      session = null;
      ready = false;
      return true;
    });
  }

  /* ── 云端读取：登录后以云端为准 ── */
  function load() {
    if (!session) return Promise.resolve(null);
    return Promise.all([
      cloud.database.from('learning_state').select('state').maybeSingle(),
      cloud.database.from('entitlements').select('all_access, books').maybeSingle()
    ]).then(function (rs) {
      var sRes = rs[0], eRes = rs[1];
      if ((sRes && sRes.error) || (eRes && eRes.error)) {
        var err = (sRes && sRes.error) || (eRes && eRes.error);
        lastError = describeError(err);
        setStatus(lastError, true);
        return null;
      }
      return {
        state: (sRes && sRes.data && sRes.data.state) || null,
        entitlements: (eRes && eRes.data)
          ? { all: !!eRes.data.all_access, books: eRes.data.books || {} }
          : null
      };
    }).catch(function (e) {
      lastError = describeError(e);
      setStatus(lastError, true);
      return null;
    });
  }

  /* ── 云端写入：upsert 按 owner_id 冲突合并，不发送 owner_id ── */
  function push() {
    if (!session || pushing) {
      if (session && pushing) dirty = true;
      return Promise.resolve(false);
    }
    var snap = Store.snapshot();
    pushing = true;
    dirty = false;
    var ls = cloud.database.from('learning_state').upsert(
      { state: snap.state }, { onConflict: 'owner_id' }
    );
    return ls.then(function (r1) {
      if (r1 && r1.error) throw r1.error;
      var en = cloud.database.from('entitlements').upsert(
        { all_access: !!snap.entitlements.all, books: snap.entitlements.books || {} },
        { onConflict: 'owner_id' }
      );
      return en;
    }).then(function (r2) {
      if (r2 && r2.error) throw r2.error;
      setStatus('已同步到云端', false);
      if (dirty) { dirty = false; return push(); }
      return true;
    }).catch(function (e) {
      lastError = describeError(e);
      setStatus(lastError + '（本地已暂存）', true);
      return false;
    }).then(function (result) {
      pushing = false;
      return result;
    });
  }

  /* 学习动作高频，合并 1.2 秒内的写入，避免每次点按都发两次请求 */
  function schedulePush() {
    if (!session) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushTimer = null; push(); }, 1200);
  }

  /* 立刻冲刷尚未发出的写入（页面隐藏 / 退出登录前） */
  function flush() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    return push();
  }

  /* ── 通用 RPC：调用 SECURITY DEFINER 函数 ──
   * 标量 JSONB 函数返回对象本身；部分网关包成数组，这里统一拆开。 */
  function rpc(name, params) {
    init();
    if (!cloud) return Promise.reject(new Error(lastError || '云服务未就绪'));
    return cloud.database.rpc(name, params || {}).then(function (res) {
      if (res && res.error) {
        var m = res.error.message || '';
        if (m.indexOf('FORBIDDEN') >= 0 || m.indexOf('42501') >= 0) {
          throw new Error('没有管理员权限');
        }
        throw new Error(describeError(res.error));
      }
      var d = res ? res.data : null;
      if (Array.isArray(d)) d = d.length ? d[0] : null;
      return d;
    });
  }

  /* 兑换码相关：前台仅这三个；管理函数由 admin 页调用 */
  function redeemCode(code) { return rpc('redeem_code', { p_code: code }); }
  function myRedeemCode() { return rpc('my_redeem_code', {}); }
  function isAdmin() { return rpc('is_admin', {}).then(function (v) { return v === true; }); }
  function createBatch(name, count, note) {
    return rpc('create_batch', { p_name: name, p_count: count, p_note: note || '' });
  }
  function adminStats() { return rpc('admin_stats', {}); }
  function adminListCodes(status, limit) {
    return rpc('admin_list_codes', { p_status: status || 'all', p_limit: limit || 200 });
  }
  function adminListBatches() { return rpc('admin_list_batches', {}); }
  function adminVoidCode(code) { return rpc('admin_void_code', { p_code: code }); }
  /* 首登自举：管理员表为空时，第一个登录者自动成为管理员；之后恒失败。 */
  function bootstrapFirstAdmin() { return rpc('bootstrap_first_admin', {}); }

  /* 兑换成功后，用服务端结果刷新本机权益快照（云端为准） */
  function applyFullEntitlement() {
    var ent = Store.snapshot().entitlements;
    ent.all = true;
    Store.hydrate(Store.snapshot().state, ent);
    Store.save();
    return push();
  }

  return {
    init: init, restoreAuth: restoreAuth, load: load, push: push,
    schedulePush: schedulePush, flush: flush, isReady: isReady,
    getSession: getSession, lastErrorMessage: lastErrorMessage,
    sendPhoneCode: sendPhoneCode, submitPhoneLogin: submitPhoneLogin,
    signInWechat: signInWechat, signOut: signOut, setStatus: setStatus,
    markReady: function () { ready = true; },
    rpc: rpc, redeemCode: redeemCode, myRedeemCode: myRedeemCode,
    isAdmin: isAdmin, createBatch: createBatch, adminStats: adminStats,
    adminListCodes: adminListCodes, adminListBatches: adminListBatches,
    adminVoidCode: adminVoidCode, applyFullEntitlement: applyFullEntitlement,
    bootstrapFirstAdmin: bootstrapFirstAdmin
  };
})();
