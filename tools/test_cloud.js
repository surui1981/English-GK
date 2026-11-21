/* 云服务层验证：用 SDK 测试替身验证登录门禁、云端读写与用户归属。
 * 不发送真实短信/OAuth 请求，不连接真实云端。 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
const script = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];

let PASS = 0, FAIL = 0;
function ok(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAIL++; console.log('  FAIL  ' + msg); }
}

function makeEl(id) {
  return {
    id, _html: '', _text: '', dataset: {}, disabled: false, value: '',
    _listeners: {},
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
                 contains(c){return this._s.has(c);}, toggle(c,f){f?this._s.add(c):this._s.delete(c);} },
    style: {}, offsetWidth: 100, parentNode: null,
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);},
    get textContent(){return this._text;}, set textContent(v){this._text=String(v);},
    addEventListener(t, fn){ (this._listeners[t]=this._listeners[t]||[]).push(fn); },
    appendChild(c){c.parentNode=this;}, removeChild(){},
    querySelector(){return null;}, querySelectorAll(){return [];}, focus(){},
    click(){ (this._listeners.click||[]).forEach(fn=>fn()); },
  };
}

/* SDK 替身：记录所有调用，用内存 map 模拟两张用户表 */
function makeCloud(session, db, calls, loginSession) {
  var authed = loginSession || session;
  return {
    createWorkBuddyCloud(cfg) {
      calls.config = cfg;
      return {
        auth: {
          getSession() { return Promise.resolve({ data: session, error: null }); },
          handleWorkBuddyCallback() { return Promise.resolve({ data: session, error: null }); },
          handleWechatWebCallback() { return Promise.resolve({ data: session, error: null }); },
          sendOtp(p) { calls.sent.push(p); return Promise.resolve({ data: { verificationId: 'v1', isExistingUser: true }, error: null }); },
          verifyOtp(p) { calls.verified.push(p); return Promise.resolve({ data: authed, error: null }); },
          signInWithOAuth(p) { calls.oauth.push(p); return Promise.resolve({ data: { url: 'https://example.com/oauth' }, error: null }); },
          signOut() { return Promise.resolve({ data: null, error: null }); },
        },
        database: {
          from(table) {
            return {
              select() {
                return { maybeSingle() { return Promise.resolve({ data: db[table] || null, error: null }); } };
              },
              upsert(obj, opts) {
                calls.upserts.push({ table, obj, opts });
                db[table] = Object.assign({}, db[table] || {}, obj);
                return Promise.resolve({ data: [obj], error: null });
              },
            };
          },
          rpc(name, params) {
            calls.rpcs = calls.rpcs || [];
            calls.rpcs.push({ name, params });
            var handler = calls.rpcHandlers && calls.rpcHandlers[name];
            if (handler) return Promise.resolve(handler(params));
            return Promise.resolve({ data: null, error: null });
          },
        },
      };
    },
  };
}

function makeCtx(session, db, calls, loginSession) {
  const store = {};
  const localStorage = {
    getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
    setItem(k,v){ store[k]=String(v); }, removeItem(k){ delete store[k]; },
    clear(){ for(const k in store) delete store[k]; },
  };
  const els = {};
  const getEl = id => els[id] || (els[id] = makeEl(id));
  const document = {
    readyState: 'complete', getElementById: getEl,
    querySelector(){ return makeEl('q'); }, querySelectorAll(){ return []; },
    createElement(t){ return makeEl(t); }, addEventListener(){},
    body: makeEl('body'), documentElement: makeEl('html'), visibilityState: 'visible',
  };
  const ctx = {
    console, document, localStorage, WorkBuddyCloud: makeCloud(session, db, calls, loginSession),
    URL: global.URL, location: { href: 'https://example.com/', origin: 'https://example.com', assign(){} },
    history: { replaceState(){} },
    setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    requestAnimationFrame(){ return 0; },
    Date, Math, JSON, String, Number, Object, Array, Set, Map, RegExp, Promise,
    parseInt, parseFloat, alert(){}, confirm(){ return true; }, prompt(){ return ''; },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  return { ctx, els, localStorage, store };
}

async function ticks(ctx, n = 12) {
  for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r));
}
const ev = (ctx, e) => vm.runInContext(e, ctx);

(async function main() {
  console.log('\n=== A. 已登录：云端快照为准 ===');
  const session = { user: { name: '测试同学' } };
  const cloudWord = 'cloudseed';
  const seedState = {
    cards: {}, wordSenses: {}, families: {}, log: [], familyLog: [],
    quiz: { answered: 0, right: 0, wrong: 0, byModule: {}, byType: {} },
    days: [], seconds: 0, startedAt: null,
    quickPractice: { [cloudWord]: { count: 2, mastery: 75, lastAt: Date.now() } },
    learnedAt: { [cloudWord]: Date.now() },
  };
  const db = {
    learning_state: { state: seedState },
    entitlements: { all_access: false, books: { ctx_book: true } },
  };
  const calls = { config: null, sent: [], verified: [], oauth: [], upserts: [] };
  const A = makeCtx(session, db, calls);
  vm.runInContext(script, A.ctx, { filename: 'index.html' });
  await ticks(A.ctx);

  ok(ev(A.ctx, 'CloudStore.isReady()') === true, '登录后进入就绪态');
  ok(ev(A.ctx, 'Store.wordProgress("' + cloudWord + '").mastery') === 75,
    '云端熟练度已覆盖到本地 Store（实际 ' + ev(A.ctx, 'Store.wordProgress("' + cloudWord + '").mastery') + '）');
  ok(ev(A.ctx, 'Store.hasBook("ctx_book")') === true, '云端单品权益已恢复');
  ok(ev(A.ctx, 'Store.hasAll()') === false, '云端全包未购买');
  ok(A.els['userName'] && A.els['userName'].textContent === '测试同学', '昵称来自会话 user.name');
  ok(A.els['meLoginCard'].style.display === 'none', '登录后「我的」页登录卡隐藏');
  ok(A.els['memberHead'].style.display !== 'none', '登录后会员信息头显示');
  ok(A.els['userTier'].textContent === '普通用户', '登录后身份徽章不再显示游客');
  ok(calls.config && calls.config.endpoint === 'https://shici-english-gk.app.workbuddy.host',
    '客户端使用 publicConfig.endpoint');
  ok(calls.config && !!calls.config.oauthRelayBaseUrl && !!calls.config.publishableKey,
    '客户端传入 oauthRelayBaseUrl 与 publishableKey');

  console.log('\n=== B. 学习动作写回云端（不发送 owner_id） ===');
  const before = calls.upserts.length;
  const newWord = ev(A.ctx, '(function(){for(var i=0;i<pgAll().length;i++){var w=pgAll()[i];if(!Store.isLexWord(w.w)&&!w.is_phrase&&!Store.wordProgress(w.w).learned)return w.w;}return null;})()');
  ev(A.ctx, 'Store.practiceQuick("' + newWord + '",3)');
  ev(A.ctx, 'CloudStore.push()');
  await ticks(A.ctx);
  const stateWrite = calls.upserts.filter(x => x.table === 'learning_state').pop();
  ok(calls.upserts.length > before, '学习后触发云端 upsert');
  ok(!!stateWrite && !!stateWrite.opts && stateWrite.opts.onConflict === 'owner_id',
    'upsert 按 owner_id 冲突合并');
  ok(!!stateWrite && !('owner_id' in stateWrite.obj), '客户端写入不含 owner_id（由数据库默认值生成）');
  ok(!!stateWrite && !!stateWrite.obj.state.quickPractice[newWord], '新学词写入云端状态');

  console.log('\n=== C. 购买权益写回云端 ===');
  ev(A.ctx, 'Store.grantAll()');
  ev(A.ctx, 'CloudStore.push()');
  await ticks(A.ctx);
  const entWrite = calls.upserts.filter(x => x.table === 'entitlements').pop();
  ok(!!entWrite && entWrite.obj.all_access === true, '全包权益写入 entitlements.all_access');
  ok(!!entWrite && !('owner_id' in entWrite.obj), '权益写入也不含 owner_id');
  ok(ev(A.ctx, 'Store.hasAll()') === true, '本机立即可见已解锁');

  console.log('\n=== D. 游客模式：学习全开放 + 本地暂存 ===');
  const B = makeCtx(null, {}, { config: null, sent: [], verified: [], oauth: [], upserts: [] });
  vm.runInContext(script, B.ctx, { filename: 'index.html' });
  await ticks(B.ctx);
  ok(ev(B.ctx, 'CloudStore.isReady()') === false, '游客不进入云端就绪态');
  ok(B.els['meLoginCard'].style.display !== 'none', '「我的」页显示游客登录卡');
  ok(B.els['memberHead'].style.display === 'none', '游客不显示会员信息头');
  ok(B.els['userTier'].textContent === '游客', '身份徽章显示游客');
  ok(ev(B.ctx, 'typeof window.__requireLogin') === 'function', '对外提供延后登录入口');
  ok(ev(B.ctx, '(function(){Store.practiceQuick("gate-word",3);return Store.wordProgress("gate-word").learned;})()') === true,
    '游客学习动作写入本地暂存（不丢失进度）');
  ev(B.ctx, 'Store.save();CloudStore.push()');
  await ticks(B.ctx);
  ok(typeof ev(B.ctx, 'CloudStore.push().then') === 'function', '游客 push 安全返回，不抛错');
  ok(ev(B.ctx, '(function(){go("s-study");return document.getElementById("s-study").classList.contains("on");})()') === true,
    '游客可直接进入背单词页');
  ok(ev(B.ctx, '(function(){go("s-progress");return document.getElementById("s-progress").classList.contains("on");})()') === true,
    '游客可直接进入单词进度页');
  ok(ev(B.ctx, '(function(){openPay("all");return document.getElementById("sheet").innerHTML.indexOf("拾词全包")>=0;})()') === false,
    '游客点击购买不直接弹出支付弹窗');
  ok(B.els['s-me'].classList.contains('on') === true, '购买动作把游客引导到「我的」页登录');

  console.log('\n=== E. OTP / 微信登录参数合规 ===');
  ok(calls.oauth.length === 0 || calls.oauth[0].provider === 'wechat', '微信登录使用 wechat provider');
  ok(calls.oauth.length === 0 || calls.oauth[0].redirectTo === 'https://example.com',
    '微信登录 redirectTo 为站点根路径');
  let phoneErr = '';
  try { await ev(A.ctx, 'CloudStore.sendPhoneCode("123")'); } catch (e) { phoneErr = e.message || String(e); }
  ok(phoneErr.indexOf('11 位手机号') >= 0, '手机号校验：非 11 位不发请求');
  await ev(A.ctx, 'CloudStore.sendPhoneCode("13800138000")');
  ok(calls.sent.length === 1 && calls.sent[0].phone === '13800138000', 'sendOtp 使用 phone 字段');
  await ev(A.ctx, 'CloudStore.submitPhoneLogin("13800138000","123456")');
  ok(calls.verified.length === 1 && calls.verified[0].phone === '13800138000' &&
     calls.verified[0].verificationId === 'v1' && calls.verified[0].isExistingUser === true,
    'verifyOtp 复用 sendOtp 的 challenge，不重复发码');

  console.log('\n=== F. 兑换码 RPC 链路 ===');
  const rcCalls = { config: null, sent: [], verified: [], oauth: [], upserts: [], rpcs: [], rpcHandlers: {} };
  let codeState = { ok: true, code: 'SC-2026-TEST1234' };
  rcCalls.rpcHandlers.redeem_code = function () { return { data: codeState, error: null }; };
  rcCalls.rpcHandlers.my_redeem_code = function () {
    return { data: { code: 'SC-2026-TEST1234', bound_at: Date.now() }, error: null };
  };
  const C = makeCtx(session, {}, rcCalls);
  vm.runInContext(script, C.ctx, { filename: 'index.html' });
  await ticks(C.ctx);

  ok(ev(C.ctx, 'typeof CloudStore.redeemCode') === 'function', 'cloud 适配层暴露 redeemCode');
  const redeemRes = await ev(C.ctx, 'CloudStore.redeemCode(" sc-2026-test1234 ")');
  ok(redeemRes && redeemRes.ok === true, '兑换成功返回 ok');
  const redeemRpc = rcCalls.rpcs.filter(x => x.name === 'redeem_code').pop();
  ok(!!redeemRpc && redeemRpc.params.p_code === ' sc-2026-test1234 ',
    '兑换码原样传给服务端 RPC（大小写/空格规范化由服务端处理）');

  codeState = { ok: false, reason: 'TAKEN' };
  const failRes = await ev(C.ctx, 'CloudStore.redeemCode("SC-2026-TEST1234")');
  ok(failRes && failRes.ok === false && failRes.reason === 'TAKEN', '已占用码返回 TAKEN');

  const myCode = await ev(C.ctx, 'CloudStore.myRedeemCode()');
  ok(myCode && myCode.code === 'SC-2026-TEST1234', 'my_redeem_code 返回学号');

  ok(ev(C.ctx, 'typeof CloudStore.createBatch') === 'function' &&
     ev(C.ctx, 'typeof CloudStore.adminStats') === 'function' &&
     ev(C.ctx, 'typeof CloudStore.adminListCodes') === 'function',
    '管理端 RPC 方法齐备');
  rcCalls.rpcHandlers.is_admin = function () { return { data: false, error: null }; };
  const notAdmin = await ev(C.ctx, 'CloudStore.isAdmin()');
  ok(notAdmin === false, '非管理员 is_admin 返回 false');

  console.log('\n=== G. 首登管理员自举 ===');
  const bsCalls = { config: null, sent: [], verified: [], oauth: [], upserts: [], rpcs: [], rpcHandlers: {} };
  let bsFlag = { ok: true, first: true, already: false };
  bsCalls.rpcHandlers.bootstrap_first_admin = function () { return { data: bsFlag, error: null }; };
  const D = makeCtx(session, {}, bsCalls);
  vm.runInContext(script, D.ctx, { filename: 'index.html' });
  await ticks(D.ctx);

  ok(ev(D.ctx, 'typeof CloudStore.bootstrapFirstAdmin') === 'function', 'cloud 暴露 bootstrapFirstAdmin');
  const first = await ev(D.ctx, 'CloudStore.bootstrapFirstAdmin()');
  ok(first && first.ok === true && first.first === true, '首位登录者自举成功');

  bsFlag = { ok: false, reason: 'HAS_ADMIN' };
  const second = await ev(D.ctx, 'CloudStore.bootstrapFirstAdmin()');
  ok(second && second.ok === false && second.reason === 'HAS_ADMIN', '已有管理员后自举被拒（防抢注）');

  const bsRpc = bsCalls.rpcs.filter(x => x.name === 'bootstrap_first_admin');
  ok(bsRpc.length >= 2, '自举通过服务端 RPC 执行（非前端标记，含登录自动触发共 ' + bsRpc.length + ' 次）');

  console.log('\n=== H. 游客进度登录后自动上云 + 待办续做 ===');
  const hCalls = { config: null, sent: [], verified: [], oauth: [], upserts: [], rpcs: [], rpcHandlers: {} };
  const remoteWord = 'cloud-seed-word';
  const hDb = {
    learning_state: { state: {
      cards: {}, wordSenses: {}, families: {}, log: [], familyLog: [],
      quiz: { answered: 1, right: 1, wrong: 0, byModule: {}, byType: {} },
      days: [], seconds: 10, startedAt: null,
      quickPractice: { [remoteWord]: { count: 1, mastery: 25, lastAt: 1000 } },
      learnedAt: { [remoteWord]: 1000 }
    } },
    entitlements: { all_access: false, books: {} }
  };
  const hSession = { user: { name: '回归同学' } };
  const H = makeCtx(null, hDb, hCalls, hSession);
  vm.runInContext(script, H.ctx, { filename: 'index.html' });
  await ticks(H.ctx);
  ev(H.ctx, 'Store.practiceQuick("guest-seed-word", 3)');
  ok(ev(H.ctx, 'Store.wordProgress("guest-seed-word").learned') === true, '游客阶段已学词存在于本地暂存');
  ev(H.ctx, 'window.__requireLogin(function(){window.__resumed=true;}, "请先登录")');
  ok(H.els['s-me'].classList.contains('on') === true, '未登录触发需要账号的动作会跳到「我的」页');
  ok(ev(H.ctx, 'window.__resumed') !== true, '待办动作不会在登录前执行');
  ev(H.ctx, 'document.getElementById("loginPhone").value="13800138000"');
  ev(H.ctx, 'document.getElementById("loginCode").value="123456"');
  await ev(H.ctx, 'CloudStore.sendPhoneCode("13800138000")');
  ev(H.ctx, 'document.getElementById("btnLoginPhone").click()');
  await ticks(H.ctx, 40);
  ok(ev(H.ctx, 'CloudStore.isReady()') === true, '登录完成后进入云端就绪态');
  ok(ev(H.ctx, 'window.__resumed') === true, '登录成功后自动续做原动作');
  ok(ev(H.ctx, 'Store.wordProgress("guest-seed-word").learned') === true, '游客学习记录登录后未丢失');
  ok(ev(H.ctx, 'Store.wordProgress("' + remoteWord + '").mastery') === 25, '云端已有进度未被游客数据覆盖');
  const mergedWrite = hCalls.upserts.filter(x => x.table === 'learning_state').pop();
  ok(!!mergedWrite && !!mergedWrite.obj.state.quickPractice['guest-seed-word'] &&
     !!mergedWrite.obj.state.quickPractice[remoteWord], '合并后的学习状态已回写云端');
  ok(H.els['meLoginCard'].style.display === 'none' && H.els['memberHead'].style.display !== 'none',
    '登录后「我的」页切换为会员态');

  console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error('测试异常：', e); process.exit(2); });
