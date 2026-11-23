/* ============================================================
 * 拾词 · 文章化背词引擎
 * ------------------------------------------------------------
 * 把「一个词一道题」升级为「一篇短文串起 3–5 个待复习词」。
 * 链路：选词(FSRS) → 运行时大模型生成 → 通读 → 语境填词 →
 *       三档自评 → 回流现有 fsrs 卡片 → 下一篇推荐。
 * 无网 / 无模型 / JSON 非法时自动降级为词库例句拼成的离线语境包。
 * 不新增记忆系统、不新增付费点、不落库文章正文。
 * ============================================================ */
var Article = (function () {
  'use strict';

  /* 应用自管的 system 消息：不放任何用户输入，明确内容合规边界。 */
  var SYSTEM_PROMPT = [
    'You are an item writer for Chinese senior-high-school English exams.',
    'Write ORIGINAL simulated reading material only. Never reproduce or adapt any real exam passage, option or explanation.',
    'The passage must be 120-180 English words, suitable for gaokao reading comprehension, with varied sentence length.',
    'Each target word appears EXACTLY ONCE in the whole passage, and only at its blank position.',
    'Distractors must be the same part of speech and plausible in the same context; never use absurd options.',
    'Return ONLY one strict JSON object. No markdown fences, no commentary, no trailing text.'
  ].join(' ');

  var CACHE_PREFIX = 'shici_article_v1_';
  var _memCache = {};   // 隐私模式 / 无 sessionStorage 时的同页缓存兜底
  var state = {
    words: [], article: null, stage: 'idle',
    idx: 0, picked: [], rated: [], source: '', showZh: false
  };
  var _senseMap = null;
  var _bookMap = null;

  /* ── 基础工具 ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uniq(arr) {
    var seen = {}, out = [];
    (arr || []).forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function cacheKey(words) { return CACHE_PREFIX + todayKey() + '_' + words.join(','); }
  function cacheGet(words) {
    var k = cacheKey(words);
    if (_memCache[k]) return _memCache[k];
    try {
      if (typeof sessionStorage === 'undefined') return null;
      var raw = sessionStorage.getItem(k);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      _memCache[k] = parsed;
      return parsed;
    } catch (e) { return null; }
  }
  function cacheSet(words, article) {
    var k = cacheKey(words);
    _memCache[k] = article;
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(k, JSON.stringify(article));
    } catch (e) { /* 隐私模式忽略 */ }
  }
  function senseMap() {
    if (_senseMap) return _senseMap;
    _senseMap = {};
    (typeof LEX !== 'undefined' && LEX ? LEX : []).forEach(function (lw) {
      (lw.senses || []).forEach(function (s) {
        if (s && s.sense_id) _senseMap[s.sense_id] = { w: lw.w, text: s.text || '', ipa: lw.ipa || '' };
      });
    });
    return _senseMap;
  }
  function bookMap() {
    if (_bookMap) return _bookMap;
    _bookMap = {};
    var words = (typeof CTX_BOOK !== 'undefined' && CTX_BOOK && CTX_BOOK.words) ? CTX_BOOK.words : [];
    words.forEach(function (x) { if (x && x.headword) _bookMap[x.headword] = x; });
    return _bookMap;
  }
  function validSense(w, sid) {
    var hit = senseMap()[sid];
    return !!(hit && hit.w === w);
  }

  /* ── 选词：到期 → 高危 → 薄弱 → 精修高频兜底 ── */
  function pickWords(n) {
    n = n || 4;
    var st = Store.load(), now = Date.now(), scored = {};
    function add(w, score) {
      if (!w) return;
      scored[w] = Math.max(scored[w] || 0, score);
    }
    (function () {
      var cards = st.cards || {}, sm = senseMap();
      for (var sid in cards) {
        var c = cards[sid], hit = sm[sid];
        if (!c || !hit || c.state === 0) continue;         // state 0 = NEW，未学词不进文章
        var due = +c.due || 0;
        if (due <= now + 3 * 86400000) {
          add(hit.w, 1000 - Math.max(0, (due - now) / 86400000) + (+c.lapses || 0) * 10);
        }
      }
    })();
    (function () {
      var q = st.quickPractice || {};
      for (var w in q) {
        var m = +(q[w] && q[w].mastery) || 0;
        if (m < 65) add(w, 60 - m / 2);
      }
    })();
    var list = Object.keys(scored).sort(function (a, b) { return scored[b] - scored[a]; });
    if (!list.length) {
      list = (typeof LEX !== 'undefined' && LEX ? LEX : []).slice(0, 12).map(function (x) { return x.w; });
    }
    /* 同主题优先聚成一篇，读起来才是连贯短文而不是词表 */
    var bm = bookMap(), first = bm[list[0]], theme = first && first.theme;
    if (theme) {
      var same = list.filter(function (w) { return bm[w] && bm[w].theme === theme; });
      if (same.length >= 3) list = same;
    }
    /* 只有 1–2 个已学词时，补足到 3–5 词，避免生成出「一篇只有一空」的文章。
     * 补足词不写入记忆状态，只是给短文提供语境同伴。 */
    if (list.length < n) {
      (typeof LEX !== 'undefined' && LEX ? LEX : []).forEach(function (x) {
        if (list.length < n && x.w && list.indexOf(x.w) < 0) list.push(x.w);
      });
      (typeof CTX_BOOK !== 'undefined' && CTX_BOOK && CTX_BOOK.words ? CTX_BOOK.words : []).forEach(function (x) {
        if (list.length < n && x && x.headword && list.indexOf(x.headword) < 0) list.push(x.headword);
      });
    }
    return uniq(list).slice(0, n);
  }

  /* ── 提示词：只传词形 / 义项 / 主题，不传任何用户身份信息 ── */
  function buildPrompt(words) {
    var bm = bookMap(), sm = senseMap();
    var lines = words.map(function (w, i) {
      var info = bm[w] || {}, anchors = [];
      ((info.senses || []).filter(function (s) { return s && s.is_trap; })).slice(0, 2)
        .forEach(function (s) { if (s.example) anchors.push(s.example); });
      if (!anchors.length) {
        var lw = (typeof LEX !== 'undefined' && LEX ? LEX : []).filter(function (x) { return x.w === w; })[0];
        if (lw && lw.senses && lw.senses[0] && lw.senses[0].example) anchors.push(lw.senses[0].example);
      }
      return (i + 1) + '. ' + w + ' | theme: ' + (info.theme || 'school life') +
        ' | sense: ' + (info.core_meaning || (sm && sm['s_' + w] ? sm['s_' + w].text : 'exam high-frequency meaning')) +
        (anchors.length ? ' | context anchor: ' + anchors[0] : '');
    });
    return [
      'Target words (each must appear exactly once, at its blank):',
      lines.join('\n'), '',
      'Return strict JSON with this exact shape:',
      '{"title":"...","theme":"...","paragraphs":["..."],"translation":"中文大意","blanks":[',
      '{"no":1,"answer":"word1","sense_id":"","meaning":"中文义项","options":["word1","a","b","c"],"reason":"中文解析"}]}',
      'Rules: 3-5 blanks; use ____ in paragraphs for each blank; 4 options per blank including the answer;',
      'all text in Chinese must be Simplified Chinese; sense_id may be left empty.'
    ].join('\n');
  }

  /* ── 流式收集：兼容 async iterable / 普通 iterable / Promise ── */
  function chunkText(chunk) {
    if (!chunk) return '';
    try {
      var c = chunk.choices && chunk.choices[0];
      if (c && c.delta && c.delta.content) return String(c.delta.content);
      if (c && c.message && c.message.content) return String(c.message.content);
      if (typeof chunk === 'string') return chunk;
    } catch (e) { /* 忽略异常分片 */ }
    return '';
  }
  function collect(stream) {
    return Promise.resolve(stream).then(function (iter) {
      var text = '';
      if (iter && typeof Symbol !== 'undefined' && iter[Symbol.asyncIterator]) {
        return (function () {
          var p = Promise.resolve();
          (function step() {
            p = p.then(function () {
              return iter[Symbol.asyncIterator]().next();
            }).then(function (r) {
              if (r.done) return null;
              text += chunkText(r.value);
              return step();
            });
          })();
          return p.then(function () { return text; });
        })();
      }
      if (iter && typeof Symbol !== 'undefined' && typeof iter[Symbol.iterator] === 'function') {
        for (var i = 0; i < iter.length; i++) text += chunkText(iter[i]);
        return text;
      }
      if (Array.isArray(iter)) {
        for (var j = 0; j < iter.length; j++) text += chunkText(iter[j]);
        return text;
      }
      return chunkText(iter);
    });
  }
  function cleanJson(text) {
    var s = String(text || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    return (a >= 0 && b > a) ? s.slice(a, b + 1) : s;
  }

  /* ── 解析 + 硬校验：任何一项不过，整篇降级 ── */
  function parseArticle(text, words) {
    var obj;
    try { obj = JSON.parse(cleanJson(text)); } catch (e) { return null; }
    if (!obj || !Array.isArray(obj.paragraphs) || !obj.paragraphs.length || !Array.isArray(obj.blanks)) return null;
    var blanks = obj.blanks;
    if (blanks.length < 3 || blanks.length > 5) return null;
    var body = obj.paragraphs.join(' ');
    var slots = (body.match(/_{3,}/g) || []).length;
    if (slots < blanks.length) return null;
    var clean = [];
    for (var i = 0; i < blanks.length; i++) {
      var b = blanks[i];
      if (!b || typeof b.answer !== 'string' || !Array.isArray(b.options) || b.options.length !== 4) return null;
      var answer = b.answer.trim();
      if (!answer || b.options.map(String).indexOf(answer) < 0) return null;
      if (words && words.length && words.indexOf(answer.toLowerCase()) < 0) return null;
      var sid = String(b.sense_id || '').trim();
      clean.push({
        no: i + 1, answer: answer,
        sense_id: validSense(answer, sid) ? sid : '',
        meaning: String(b.meaning || '').trim() || '结合上下文判断',
        options: b.options.map(String),
        reason: String(b.reason || '').trim() || '根据上下文语义选择。',
        light: !validSense(answer, sid)
      });
    }
    return {
      title: String(obj.title || '语境微读').trim(),
      theme: String(obj.theme || '综合语境').trim(),
      paragraphs: obj.paragraphs.map(String),
      translation: String(obj.translation || '').trim(),
      blanks: clean, source: 'ai'
    };
  }

  /* ── 本地降级：用词库真实例句拼「微文章」 ── */
  var FALLBACK_POOL = ['access', 'address', 'assess', 'accuse', 'approach', 'approve',
    'assume', 'attach', 'attend', 'avoid', 'bear', 'become', 'believe', 'bring',
    'call', 'carry', 'cause', 'change', 'charge', 'check', 'claim', 'clear'];
  function makeOptions(answer, w, sense) {
    var pool = FALLBACK_POOL.slice();
    (typeof LEX !== 'undefined' && LEX ? LEX : []).forEach(function (x) {
      if (x.w && x.w[0] === answer[0]) pool.push(x.w);
    });
    var others = uniq(pool.filter(function (x) { return x.toLowerCase() !== answer.toLowerCase(); }));
    // 同首字母优先，保证干扰项有迷惑性
    others.sort(function (a, b) {
      var as = a[0] === answer[0] ? 0 : 1, bs = b[0] === answer[0] ? 0 : 1;
      return as - bs;
    });
    var opts = [answer].concat(others.slice(0, 3));
    while (opts.length < 4) opts.push('option' + opts.length);
    return opts.slice(0, 4).sort(function () { return Math.random() - 0.5; });
  }
  function maskSentence(sentence, word) {
    var s = String(sentence || '');
    var re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return re.test(s) ? s.replace(re, '____') : '';
  }
  function localFallback(words) {
    var bm = bookMap(), sm = senseMap(), paragraphs = [], blanks = [], themes = [];
    words.forEach(function (w, i) {
      var info = bm[w] || {}, senses = info.senses || [];
      if (info.theme) themes.push(info.theme.replace(/^T-/, ''));
      var anchors = senses.filter(function (s) { return s && s.example && s.example_zh; });
      var pick = anchors.filter(function (s) { return s.is_trap; })[0] || anchors[0] || null;
      var masked = pick ? maskSentence(pick.example, w) : '';
      if (!masked) {
        masked = 'In the reading task, students were asked to ___ the best word for each blank.';
        pick = null;
      }
      paragraphs.push(masked);
      var sid = '';
      if (pick) {
        for (var k in sm) { if (sm[k].w === w && sm[k].text === pick.text) { sid = k; break; } }
      }
      blanks.push({
        no: i + 1, answer: w,
        sense_id: sid,
        meaning: pick ? pick.text : (info.core_meaning || '核心义'),
        options: makeOptions(w, w, pick),
        reason: pick ? ('语境线索：' + pick.text) : '根据上下文选择最恰当的词。',
        light: !sid, zh: pick ? pick.example_zh : ''
      });
    });
    return {
      title: '语境微读 · ' + words.slice(0, 2).join(' & '),
      theme: uniq(themes).join(' / ') || '综合语境',
      paragraphs: paragraphs,
      translation: blanks.map(function (b) { return b.zh; }).filter(Boolean).join(' '),
      blanks: blanks, source: 'offline'
    };
  }

  /* ── 生成入口：缓存 → 在线 → 降级 ── */
  function client() {
    try {
      return (typeof CloudStore !== 'undefined' && CloudStore && typeof CloudStore.getClient === 'function')
        ? CloudStore.getClient() : null;
    } catch (e) { return null; }
  }
  function generate(words, force) {
    if (!force) {
      var cached = cacheGet(words);
      if (cached) return Promise.resolve(cached);
    }
    var cl = client();
    if (!cl || !cl.llm || !cl.llm.models || !cl.llm.chat) return Promise.resolve(null);
    return Promise.resolve()
      .then(function () { return cl.llm.models.list(); })
      .then(function (models) {
        var arr = Array.isArray(models) ? models : ((models && models.data) || []);
        var m = arr.filter(function (x) { return x && x.disabled !== true && x.enabled !== false; })[0];
        if (!m) throw new Error('NO_MODEL');
        var modelId = m.id || m.name;
        return collect(cl.llm.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(words) }
          ],
          stream: true,
          temperature: 0.7
        }));
      })
      .then(function (text) {
        var a = parseArticle(text, words);
        if (a) cacheSet(words, a);
        return a;
      })
      .catch(function () { return null; });
  }

  /* ── 页面渲染 ── */
  function body() { return document.getElementById('arBody'); }
  function setBar(done, total) {
    var bar = document.getElementById('arBar'), cnt = document.getElementById('arCnt');
    if (bar) bar.style.width = Math.round(total ? done / total * 100 : 0) + '%';
    if (cnt) cnt.textContent = total ? (done + '/' + total) : '';
  }
  function textOf(a, showAnswer) {
    return a.paragraphs.map(function (p) {
      var s = esc(p);
      if (showAnswer) {
        a.blanks.forEach(function (b) { s = s.replace(/_{3,}/, '<mark class="ar-hl">' + esc(b.answer) + '</mark>'); });
      } else {
        s = s.replace(/_{3,}/g, '<span class="ar-slot">____</span>');
      }
      return s;
    }).join('</p><p>');
  }
  function render() {
    var el = body(); if (!el) return;
    var a = state.article;
    if (state.stage === 'loading') {
      setBar(0, 1);
      el.innerHTML = '<div class="ar-card"><div class="ar-loading">' +
        '<div class="ar-spin"></div><b>正在生成你的专属语境短文…</b>' +
        '<p>把「' + esc(state.words.join(' / ')) + '」放进一篇连贯文章，大约几秒钟</p></div></div>';
      return;
    }
    if (!a) {
      el.innerHTML = '<div class="ar-card"><div class="ar-empty">暂时没有可用的语境内容，请稍后再试。</div></div>';
      return;
    }
    if (state.stage === 'reading') {
      setBar(0, a.blanks.length);
      el.innerHTML = '<div class="ar-card">' +
        '<div class="ar-kicker">' + esc(a.theme) + ' · ' + (a.source === 'ai' ? 'AI 生成语境' : '离线语境包') + '</div>' +
        '<h3 class="ar-title">' + esc(a.title) + '</h3>' +
        '<p class="ar-text">' + textOf(a, true) + '</p>' +
        (a.translation ? '<div class="ar-zh' + (state.showZh ? ' on' : '') + '" onclick="Article.toggleZh()">' +
          '<b>中文大意 · ' + (state.showZh ? '点击收起' : '点击展开') + '</b>' +
          (state.showZh ? '<div>' + esc(a.translation) + '</div>' : '') + '</div>' : '') +
        '<div class="ar-tip">先通读一遍，注意加粗的目标词在句中怎么用。读完了再进入填词。</div>' +
        '<button class="btn btn-primary" style="width:100%" onclick="Article.toAnswer()">读完了 · 开始语境填词</button>' +
        '</div>';
      return;
    }
    if (state.stage === 'answer') {
      var idx = state.idx, b = a.blanks[idx], done = state.rated.length;
      setBar(done, a.blanks.length);
      var picked = state.picked[idx], rated = state.rated[idx];
      var opts = b.options.map(function (t, i) {
        var cls = '';
        if (picked != null) {
          if (t === b.answer) cls = ' right';
          else if (i === picked) cls = ' wrong';
        }
        return '<button class="ar-opt' + cls + '" onclick="Article.pick(' + i + ')"' + (rated ? ' disabled' : '') + '>' +
          '<span>' + 'ABCD'[i] + '</span>' + esc(t) + '</button>';
      }).join('');
      var fb = '';
      if (picked != null && !rated) {
        var ok = b.options[picked] === b.answer;
        fb = '<div class="ar-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '选对了' : '再想想') + '</b>' +
          '<p>' + esc(b.reason) + '</p>' +
          '<div class="ar-meaning">此处 <b>' + esc(b.answer) + '</b> = ' + esc(b.meaning) + '</div>' +
          '<div class="ar-rate-tip">刚才这道题，你真实的掌握情况是？</div>' +
          '<div class="ar-rate">' +
          '<button onclick="Article.rate(3)">认识<small>会拉长复习间隔</small></button>' +
          '<button onclick="Article.rate(2)">犹豫<small>按中等间隔复习</small></button>' +
          '<button onclick="Article.rate(1)">忘了<small>明天重点再见</small></button>' +
          '</div></div>';
      } else if (rated) {
        fb = '<div class="ar-next"><button class="btn btn-primary" style="width:100%" onclick="Article.next()">' +
          (idx + 1 < a.blanks.length ? '下一个空' : '查看本篇结果') + '</button></div>';
      }
      el.innerHTML = '<div class="ar-card">' +
        '<div class="ar-qhead">第 ' + (idx + 1) + ' / ' + a.blanks.length + ' 空 · 已评 ' + done + ' 题</div>' +
        '<p class="ar-text ar-sentence">' + esc(a.paragraphs.join(' ')).replace(/_{3,}/, '<span class="ar-slot">____</span>') + '</p>' +
        '<div class="ar-opts">' + opts + '</div>' + fb + '</div>';
      return;
    }
    if (state.stage === 'result') {
      var right = 0;
      a.blanks.forEach(function (b, i) { if (state.picked[i] != null && b.options[state.picked[i]] === b.answer) right++; });
      var rows = a.blanks.map(function (b, i) {
        var meta = Store.studyMeta(b.answer);
        var due = meta && isFinite(meta.due) && meta.due !== Infinity
          ? Math.max(0, Math.ceil(meta.due)) + ' 天后复习' : '进入复习队列';
        return '<div class="ar-row"><b>' + esc(b.answer) + '</b><span>' + esc(b.meaning) + '</span>' +
          '<em>' + (state.rated[i] === 3 ? '认识' : (state.rated[i] === 2 ? '犹豫' : '忘了')) + ' · ' + due + '</em></div>';
      }).join('');
      setBar(a.blanks.length, a.blanks.length);
      el.innerHTML = '<div class="ar-card">' +
        '<div class="ar-kicker">本篇完成 · ' + (a.source === 'ai' ? 'AI 生成语境' : '离线语境包') + '</div>' +
        '<h3 class="ar-title">' + right + ' / ' + a.blanks.length + ' 空选对</h3>' +
        '<div class="ar-tip">自评结果已写回记忆算法，即使选对但点了「犹豫」，系统也会缩短复习间隔。</div>' +
        '<div class="ar-rows">' + rows + '</div>' +
        '<button class="btn btn-primary" style="width:100%" onclick="Article.nextArticle()">按最新记忆状态 · 生成下一篇</button>' +
        '<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="go(\'s-study\')">回到词卡背词</button>' +
        '</div>';
    }
  }

  /* ── 交互动作 ── */
  function start(force) {
    state.toAnswerAt = null;
    state.words = pickWords(4);
    state.stage = 'loading'; state.idx = 0; state.picked = []; state.rated = [];
    state.showZh = false;
    render();
    var words = state.words.slice();
    return generate(words, !!force).then(function (a) {
      // 用户中途离开则不覆盖当前页面
      if (state.stage !== 'loading' || words.join() !== state.words.join()) return;
      state.article = a || localFallback(words);
      state.source = state.article.source;
      state.stage = 'reading';
      render();
    });
  }
  function open() { go('s-article'); start(false); }
  function nextArticle() { start(true); }
  function toAnswer() { if (state.stage === 'reading') { state.stage = 'answer'; render(); } }
  function toggleZh() { state.showZh = !state.showZh; render(); }
  function pick(i) {
    var a = state.article;
    if (!a || state.stage !== 'answer' || state.rated[state.idx] != null) return;
    state.picked[state.idx] = i;
    render();
  }
  function rate(r) {
    var a = state.article;
    if (!a || state.stage !== 'answer') return;
    var idx = state.idx, b = a.blanks[idx];
    if (state.rated[idx] != null) return;
    state.rated[idx] = r;
    applyFeedback(b, r);
    render();
  }
  function applyFeedback(b, rating) {
    var w = b.answer, sid = b.sense_id;
    try {
      if (sid && validSense(w, sid) && Store.isLexWord(w)) {
        Store.reviewSense(sid, rating, w);
      } else {
        Store.practiceQuick(w, rating);
      }
      Store.reviewFamily(w, rating, 'article');
      if (rating === 1 && typeof Store.noteDailyWrong === 'function') Store.noteDailyWrong(w);
      if (typeof syncStats === 'function') syncStats();
      if (typeof renderGrowth === 'function') renderGrowth(true);
    } catch (e) { /* 单题回流失败不影响整篇作答 */ }
  }
  function next() {
    var a = state.article; if (!a) return;
    if (state.idx + 1 < a.blanks.length) {
      state.idx++;
      render();
    } else {
      state.stage = 'result';
      render();
    }
  }

  return {
    open: open, start: start, nextArticle: nextArticle, toAnswer: toAnswer,
    toggleZh: toggleZh, pick: pick, rate: rate, next: next,
    pickWords: pickWords, buildPrompt: buildPrompt, parseArticle: parseArticle,
    localFallback: localFallback, generate: generate,
    state: function () { return state; },
    _render: render
  };
})();
