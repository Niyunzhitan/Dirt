const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const builtQuizPath = path.join(distRoot, "assets", "quiz-bundle.js");

if (!fs.existsSync(builtQuizPath)) {
  throw new Error("未找到 dist/assets/quiz-bundle.js，请先运行 Vite 构建。");
}

const quizBundle = fs.readFileSync(builtQuizPath);

for (const directory of ["assets", "css", "data", "js"]) {
  fs.cpSync(path.join(projectRoot, directory), path.join(distRoot, directory), {
    recursive: true,
    force: true
  });
}

fs.writeFileSync(builtQuizPath, quizBundle);

const sourcePage = path.join(projectRoot, "index.html");
const outputPage = path.join(distRoot, "index.html");
const version = Date.now().toString(36);
let html = fs.readFileSync(sourcePage, "utf8");

html = html.replace(/\.\/dist\/assets\/quiz-bundle\.js(?:\?v=[^"']+)?/g, "./assets/quiz-bundle.js");
html = html.replace(/(href="\.\/css\/[^"?]+)(?:\?v=[^"]+)?(")/g, `$1?v=${version}$2`);
html = html.replace(/\r\n?/g, "\n");

fs.writeFileSync(outputPage, html, "utf8");
console.log("构建目录已准备完成：dist");
