# 泥云智探

泥云智探是一个介绍齐鲁封泥的网站。访客可以查看封泥实物、印文、现代发现地和古代行政归属，也可以阅读数字手卷与专题故事、浏览课程课件、操作 3D 地图和牌具、向“印小灵”提问，或参加趣味问答。

项目由 [Windy-Field](https://github.com/Windy-Field) 维护，源码见 [Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)。第一次使用网站，可先读[访客使用说明](./docs/User-Safari.md)。

## 本地运行

需要 Node.js 18 或更高版本。

```powershell
npm install
npm start
```

`npm start` 会先构建前端，再启动 `server.js`。浏览器访问 `http://127.0.0.1:3000` 即可。

只调试前端时可以运行：

```powershell
npm run dev
```

常用命令：

```powershell
npm run check       # 检查 JavaScript 语法
npm run build       # 生成 dist/
npm run build:three # 重新生成按需版 Three.js
npm run db:seed     # 写入数据库种子数据
npm run package:fc  # 生成阿里云 FC 部署包
```

`index.html` 是页面源文件，`dist/index.html` 由构建脚本生成，不要手工修改。直接双击根目录的 `index.html` 可以查看大部分静态内容；AI 和数据库接口仍需要 `server.js`，趣味问答需要先运行一次 `npm run build`。

## 网站功能

- 数字手卷介绍封泥从书写、系绳到验封的过程，支持按钮、键盘、滚轮、拖动和触屏滑动。
- 齐鲁封泥图鉴展示代表藏品，完整图录收录 45 个现代县区的资料。
- 地图有精细立体版和简化平面版，可以筛选青州、兖州、徐州等历史行政体系。地点详情显示现代位置、古代归属和资料数量。
- 课程区提供三课时课件、原始 PDF、教案学习单和支教活动回顾视频。课件进度条和视频进度条都可以拖动。
- 封泥牌具用 Three.js 展示麻将和扑克牌，可旋转、缩放、翻面、切换款式和全屏查看。
- “印小灵”支持文字提问和图片辅助观察。一次最多上传 4 张 JPEG、PNG 或 WebP 图片，每张不超过 5 MB。
- 趣味问答每轮最多抽取 10 道题，提交答案后显示解析。
- 显示设置包含浅色、深色、昼夜自动主题，以及字号、行距、动效、背景微尘、开屏动画、音乐和宠物设置。

## 代码结构

页面主体使用原生 HTML、CSS 和 JavaScript，趣味问答使用 Vue 3，并由 Vite 编译。前端脚本通过 `window` 命名空间协作，以兼容本地双击预览。

常改的文件如下：

- [index.html](./index.html)：页面结构和脚本加载顺序。
- [css/tokens.css](./css/tokens.css)：颜色、字体、间距、布局尺寸和动效参数。
- [js/app.js](./js/app.js)：页面初始化、共享工具和基础数据渲染。
- [js/theme-bootstrap.js](./js/theme-bootstrap.js)：在 CSS 加载前恢复主题，避免刷新时闪出错误颜色。
- [js/course-browser.js](./js/course-browser.js)：课程切换、课件翻页和进度条。
- [js/scroll-story.js](./js/scroll-story.js)：数字手卷。
- [js/map-browser.js](./js/map-browser.js) 与 [js/three-map.js](./js/three-map.js)：地图筛选、模式切换和 3D 地形。
- [js/source-archive.js](./js/source-archive.js)：完整图录与补充史料。
- [js/three-showcase.js](./js/three-showcase.js)：封泥牌具。
- [js/ai-chat.js](./js/ai-chat.js)、[js/ai-service.js](./js/ai-service.js)：AI 对话界面和请求。
- [js/media-coordinator.js](./js/media-coordinator.js)：背景音乐与视频之间的播放协调。
- [server.js](./server.js)：静态文件、视频分段请求、AI 代理和数据库 API。

`js/seal-glyph-paths.js` 保存开屏四字的 SVG 路径，`js/offline-texture-loader.js` 只在 `file://` 模式加载内嵌 3D 贴图。新增前端模块后，还要在 `index.html` 中按依赖顺序引入，并在需要时加入 `npm run check`。

CSS 的加载顺序不可随意交换：

```text
tokens.css
01-base-opening.css
02-content-layout.css
03-museum-archive.css
04-scroll.css
05-typography.css
06-enhancements.css
```

## 数据和配置

项目默认读取 `data/` 中的本地数据：

```js
USE_DATABASE: false,
USE_QUIZ_DATABASE: false
```

这两个开关位于 [js/config.js](./js/config.js)，可以分别启用栏目数据库和题库数据库。数据库准备方法见[数据库说明](./db/README.md)。

课程文件、音乐和牌具贴图的路径集中在 [data/media-config.js](./data/media-config.js)。本地资源使用 `./assets/` 下的相对路径；外部资源必须使用 HTTPS，并将主机名加入 `allowedExternalHosts`。该配置会发送给浏览器，不能写入密码、Token、Cookie 或私密签名。

资源维护说明：

- [课程资源](./assets/courses/README.md)
- [封泥牌具贴图](./assets/textures/README.md)
- [山东地形数据](./assets/terrain/README.md)

## AI 配置

复制 `.env.example` 为 `.env`，至少填写百炼 API Key：

```env
DASHSCOPE_API_KEY=你的百炼API Key
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

API Key 只能放在本地 `.env` 或 FC 环境变量中。不要把真实密钥写入 HTML、前端 JavaScript、文档或 Git 仓库。

服务启动后可检查：

```text
GET http://127.0.0.1:3000/api/health
GET http://127.0.0.1:3000/api/ai/status
```

## Umami 统计

当前 [js/config.js](./js/config.js) 已接入 Umami Cloud，并将统计域名限制为 `niyunzhitan.cn` 和 `www.niyunzhitan.cn`。本地双击页面不会加载统计脚本；浏览器启用 Do Not Track 时也不会记录访问。

更换 Umami 站点时，修改以下三项：

```js
UMAMI_WEBSITE_ID: "新的 Website ID",
UMAMI_SCRIPT_URL: "https://cloud.umami.is/script.js",
UMAMI_DOMAINS: "niyunzhitan.cn,www.niyunzhitan.cn",
```

留空 `UMAMI_WEBSITE_ID` 即可关闭统计。使用自建 Umami 时，还要在 `server.js` 的 CSP 中放行新的脚本和上报域名。

## Three.js 和地图

[js/vendor/three.js](./js/vendor/three.js) 是基于 Three.js 0.160.0 生成的按需版本，导出列表位于 [scripts/three-entry.js](./scripts/three-entry.js)。新增 `THREE.xxx` 调用后，先补充对应导出，再运行 `npm run build:three`。不要直接删改生成文件里的内部类或着色器。

地图参数放在 `js/three-map.js` 顶部的 `MAP_VIEW`，牌具参数放在 `js/three-showcase.js` 顶部。Three.js 许可证见 [LICENSE.three.txt](./js/vendor/LICENSE.three.txt)。

## 构建和发布

构建前端：

```powershell
npm run build
```

生成 FC 包：

```powershell
npm run package:fc
```

打包脚本会检查源码、重建 `dist/`、同步 FC 运行文件，并输出：

```text
releases/niyun-zhitan-fc.zip
```

`dist/`、`deploy/fc/dist/` 和 `releases/` 都是生成目录。FC 包装层位于 `deploy/fc/`；其中 `package.json` 和锁文件保留精简运行依赖，`server.js`、`server/` 和 `dist/` 由打包脚本同步。详细步骤见 [FC 部署说明](./docs/deployment/DEPLOY-FC.md)。

## 目录一览

```text
Web/
├─ assets/       图片、字体、课件、音视频、地形和贴图
├─ css/          页面样式
├─ data/         展示数据与公开配置
├─ db/           数据库结构、迁移和种子脚本
├─ deploy/fc/    FC 运行包装层
├─ docs/         使用说明和部署文档
├─ js/           前端功能模块
├─ releases/     本地生成的发布包，不提交 Git
├─ scripts/      构建和打包脚本
├─ templates/    可复用模板
├─ index.html    页面源文件
└─ server.js     Node.js 服务入口
```

提交或部署前，请确认 `.env`、API Key、数据库密码和本地调试文件没有进入 Git 或压缩包。页面修改后至少检查手机和桌面宽度，并实际测试地图、课件、视频、AI 与问答。
