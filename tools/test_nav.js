/* 专项回归：子页面长内容下滑后仍可返回
 *  1) 图书详情页 / 全包详情页提供「返回首页」按钮
 *  2) 子页面顶部返回区 sticky 常驻
 *  3) 构建产物同步包含以上实现
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'app', 'styles.css'), 'utf8');
const PROTO = fs.readFileSync(path.join(ROOT, 'prototype', 'index.html'), 'utf8');

let PASS = 0, FAIL = 0;
function ok(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAIL++; console.log('  FAIL  ' + msg); }
}
function section(id) {
  const start = HTML.indexOf('id="' + id + '"');
  if (start < 0) return '';
  const end = HTML.indexOf('</section>', start);
  return HTML.slice(start, end);
}

console.log('\n=== 1. 图书详情页返回首页 ===');
['s-book', 's-book2', 's-book3', 's-book4'].forEach(id => {
  const s = section(id);
  ok(s.indexOf('class="home-link"') >= 0, id + ' 含「返回首页」按钮');
  ok(s.indexOf("go('s-home')") >= 0, id + ' 的返回按钮指向主页');
  ok(s.indexOf("go('s-shop')") >= 0, id + ' 保留返回资料页按钮');
});
ok(section('s-fullpack').indexOf('class="home-link"') >= 0, '全包详情页含「返回首页」按钮');
ok((HTML.match(/class="home-link"/g) || []).length >= 5, '至少 5 个辅助材料页提供首页入口');

console.log('\n=== 2. 子页面顶部返回区常驻 ===');
ok(/\.screen\.sub\s*>\s*\.backbar/.test(CSS), 'backbar 应用 sticky 常驻样式');
ok(/\.screen\.sub\s*>\s*\.studybar/.test(CSS), 'studybar 同样常驻，背词页下滑不丢返回');
ok(/position:\s*sticky/.test(CSS), '使用 sticky 定位');
ok(/top:\s*0/.test(CSS), 'sticky 吸附在页面顶部');

console.log('\n=== 3. 构建产物同步 ===');
ok(PROTO.indexOf('class="home-link"') >= 0, '单文件原型含返回首页按钮');
ok(/\.screen\.sub\s*>\s*\.backbar/.test(PROTO), '单文件原型含 sticky 样式');

console.log('\n========== 结果：' + PASS + ' 通过 / ' + FAIL + ' 失败 ==========');
if (FAIL) process.exit(1);
