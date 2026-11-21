/* 专项回归：仿真语境版全量补全数据
 *  1) 4110 词全覆盖、分层与字段完整
 *  2) 443 核心词全部配仿真例句，覆盖层如实标注无例句
 *  3) 前端展示口径不再写死 1500
 */
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'app.js'), 'utf8');
const start = HTML.indexOf('var CTX_BOOK = ');
const end = HTML.indexOf('\nvar ', start + 15);
const comment = HTML.indexOf('\n/*', start + 15);
const cut = comment > 0 && comment < end ? comment : end;
if (start < 0 || cut < 0) { console.log('  FAIL  无法从原型中提取 CTX_BOOK'); process.exit(2); }
const raw = HTML.slice(start + 'var CTX_BOOK = '.length, cut).trim().replace(/;$/, '');
const book = JSON.parse(raw);
const words = book.words || [];

let PASS = 0, FAIL = 0;
function ok(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAIL++; console.log('  FAIL  ' + msg); }
}

console.log('\n=== 1. 全量词量与分层 ===');
ok((book.meta.coverage.current_words) === 4110, 'meta 词量为 4110（实际 ' + book.meta.coverage.current_words + '）');
ok(words.length === 4110, '词条数为 4110（实际 ' + words.length + '）');
ok(new Set(words.map(w => w.headword)).size === 4110, 'headword 无重复');
const layers = book.meta.coverage.by_layer || {};
ok(layers['L1-仿真语境'] === 100, 'L1 深度精修 100 词');
ok(layers['L2-自研释义'] === 343, 'L2 自研释义 343 词');
ok(layers['L3-覆盖整理'] === 3667, 'L3 覆盖整理 3667 词');
const core = words.filter(w => w.core_tier === 'required');
const rec = words.filter(w => w.core_tier === 'recommended');
ok(core.length === 443, '必考核心词 443（实际 ' + core.length + '）');
ok(rec.length === 3667, '推荐词 3667（实际 ' + rec.length + '）');

console.log('\n=== 2. 字段补全 ===');
ok(words.every(w => w.ipa && /^\//.test(w.ipa)), '全部词条带音标');
ok(words.every(w => w.ipa_source), '全部词条标注音标来源');
ok(words.every(w => w.core_meaning), '全部词条带核心义');
ok(words.every(w => w.note), '全部词条带学习提示');
ok(words.every(w => w.theme), '全部词条带主题语境');
ok(words.every(w => w.senses && w.senses.length), '全部词条至少 1 个义项');
const auto = words.filter(w => w.ipa_source.indexOf('规则转写') >= 0);
ok(auto.length > 0 && auto.length === words.filter(w => w.ipa_source === '规则转写 · 美音参考').length,
   '自动转写音标如实标注（' + auto.length + ' 词）');

console.log('\n=== 3. 核心词例句 ===');
ok(core.every(w => w.senses.some(s => s.example)), '443 核心词每词至少 1 条仿真例句');
ok(core.every(w => w.senses.filter(s => s.example).every(s => s.source.indexOf('仿真') >= 0)),
   '核心词例句均标注仿真来源');
ok(core.every(w => w.senses.filter(s => s.example).every(s => s.example_zh)),
   '核心词例句均配中文释义');
ok(rec.every(w => w.senses.every(s => !s.example)), '覆盖层如实不配例句');
const examples = words.reduce((n, w) => n + w.senses.filter(s => s.example).length, 0);
ok(examples === book.meta.coverage.example_sentences, '例句计数与 meta 一致（' + examples + '）');

console.log('\n=== 4. 前端展示口径 ===');
ok(APP.indexOf("'1500 词全覆盖'") < 0, '前端不再写死 1500 词');
ok(APP.indexOf("total+' 词全覆盖'") >= 0, '前端使用真实词量展示');
ok(APP.indexOf('t.words/total*100') >= 0, '覆盖率按真实总量计算');
ok(APP.indexOf('443 个高考核心词每词至少一句仿真语境句') >= 0, '卖点文案同步为全量补全');

console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
if (FAIL) process.exit(1);
