const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");

for (const directory of ["assets", "css", "data", "js"]) {
  fs.cpSync(path.join(projectRoot, directory), path.join(distRoot, directory), {
    recursive: true,
    force: true
  });
}

const builtPage = path.join(distRoot, "index.template.html");
const offlinePage = path.join(distRoot, "index.html");
if (fs.existsSync(builtPage)) {
  const version = Date.now().toString(36);
  let html = fs.readFileSync(builtPage, "utf8");
  // 原页面的样式由两份 CSS 提供，离线成品必须显式保留这两个相对路径。
  if (!html.includes('./css/tokens.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./css/tokens.css">\n  <link rel="stylesheet" href="./css/styles.css">\n</head>');
  }
  // file:// 页面不能稳定加载 ES Module，Vue 入口已由 Rollup 输出为 IIFE。
  const quizScript = '<script src="./assets/quiz-bundle.js"></script>';
  html = html.replace(/<script type="module" crossorigin src="\.\/assets\/quiz-bundle\.js"><\/script>/, "");
  html = html.replace(/(href="\.\/css\/[^"?]+)(")/g, `$1?v=${version}$2`);
  html = html.replace(/(src="\.\/assets\/quiz-bundle\.js)(")/g, `$1?v=${version}$2`);
  html = html.replace("</body>", `  ${quizScript}\n</body>`);
  fs.writeFileSync(offlinePage, html, "utf8");
  fs.cpSync(path.join(distRoot, "assets"), path.join(projectRoot, "assets"), {
    recursive: true,
    force: true
  });
  fs.writeFileSync(path.join(projectRoot, "index.html"), html, "utf8");
}

console.log("离线打开目录已准备完成：dist");
