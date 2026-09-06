# 泥云智探

泥云智探是一个介绍齐鲁封泥的智慧人文网站。网站把封泥实物、印文、出土地和历史背景整理成可浏览的资料，也提供数字手卷、山东文化地图、课程课件、封泥牌具 3D 展示、AI 问答和趣味问答。

项目源码：[Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)。普通访客可以阅读[网站使用说明](./docs/User-Safari.md)。

## 功能概览

- 浏览封泥实物、印文、年代、出土地和研究说明
- 通过数字手卷了解封泥在文书传递中的使用过程
- 使用山东 3D 文化地图查看 45 个区县资料点位
- 在“齐鲁封泥图鉴”中查看精选藏品，并打开完整区县图录
- 阅读封泥故事，了解宫廷日常、金石考证、地方制度和漕运凭信
- 查看三课时课程课件、支教活动回顾视频和教案学习单
- 在“封泥牌具”中体验扑克牌和麻将主题的 Three.js 3D 模型
- 使用“印小灵”进行文字问答和图片辅助观察
- 参加每轮最多十题的趣味问答
- 切换浅色、深色或昼夜自动主题，并调整字号、行距和动效

## 技术结构

网站主体使用原生 HTML、CSS 和 JavaScript。趣味问答由 Vue 3 单文件组件实现，并通过 Vite 编译。`server.js` 负责提供静态文件、AI 代理和可选的 MySQL 接口。

前端交互按功能拆分为几个经典脚本，脚本通过 `window` 命名空间协作，因此直接双击 `index.html` 也能运行：

- [js/app.js](./js/app.js)：页面初始化、共享工具、基础数据渲染和功能模块编排。
- [js/course-browser.js](./js/course-browser.js)：课程课时切换、课件横向阅读、连续拖动和页码定位。
- [js/scroll-story.js](./js/scroll-story.js)：数字手卷的展卷、滚轮、拖动和章节导航。
- [js/opening-loader.js](./js/opening-loader.js)：开屏卷轴展开、进度缓动、封泥裂解和碎片粒子效果。
- [js/search-dialog.js](./js/search-dialog.js)：全站搜索弹窗、藏品定位和图录定位。
- [js/ai-chat.js](./js/ai-chat.js)：AI 对话、图片上传、会话保存和状态显示。
- [js/page-effects.js](./js/page-effects.js)：页面总进度条、拖动、按钮波纹和按压反馈。
- [js/display-settings.js](./js/display-settings.js)：主题、字号、行距和动效设置。
- [js/site-navigation.js](./js/site-navigation.js)：导航栏、栏目跳转、时钟和滚动高亮。
- [js/map-browser.js](./js/map-browser.js)：地图筛选、地图模式和点位选择。
- [js/source-archive.js](./js/source-archive.js)：完整图录弹窗、资料定位和补充史料展开。
- 其他 `js/` 文件负责 API、媒体安全、AI、地图和封泥牌具 3D 展示等独立功能。

新功能文件需要在 `index.html` 中先于 `app.js` 加载；`dist/index.html` 由构建脚本自动生成，不要手工维护。

数据可以来自本地文件，也可以来自数据库：

- 本地模式读取 `data/` 中的数据，适合开发、演示和离线浏览。
- 数据库模式通过 `server.js` 读取 MySQL，适合在线维护内容。

两种数据库开关位于 [js/config.js](./js/config.js)：

```js
USE_DATABASE: false,
USE_QUIZ_DATABASE: false
```

## 快速开始

需要 Node.js 18 或更高版本。

```powershell
npm install
npm start
```

启动后打开 `http://127.0.0.1:3000`。开发前端时也可以运行：

```powershell
npm run dev
```

语法检查：

```powershell
npm run check
```

构建网站并生成可离线打开的 `dist/`：

```powershell
npm run build
```

`index.html` 是唯一的页面源文件。构建完成后仍可直接双击它测试；趣味问答会读取 `dist/assets/quiz-bundle.js`。如果刚修改过 Vue 问答代码，请先重新运行 `npm run build`。直接打开文件时，数据库和 AI 接口可能不可用。

## AI 配置

复制 `.env.example` 为 `.env`，至少填写：

```env
DASHSCOPE_API_KEY=你的百炼API Key
```

默认配置如下，通常不用修改：

```env
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

API Key 只能放在 `.env`、函数计算环境变量或其他服务端密钥配置中。不要写入 HTML、前端 JavaScript 或 Git 仓库。AI 功能还需要能够访问 `dashscope.aliyuncs.com`。

检查服务：

```text
http://127.0.0.1:3000/api/health
http://127.0.0.1:3000/api/ai/status
```

## 数据库

在 `.env` 中填写 MySQL 连接信息：

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
DB_CONNECTION_LIMIT=5
```

初始化：

1. 使用管理员账号执行 `db/schema.sql`。
2. 执行 `npm run db:seed`。
3. 在 `js/config.js` 中打开需要的数据库开关。
4. 启动网站并访问 `/api/health`。

详细说明见[数据库说明](./db/README.md)。

## 媒体和 3D 资源

课程课件、教案、视频、音乐和牌具贴图的公开路径集中在 [data/media-config.js](./data/media-config.js)。

- 课程文件放入 `assets/courses/`，并登记到 `courses` 或 `coursePack`。
- 音乐放入 `assets/media/music/`。
- 封泥牌具贴图放入 `assets/textures/`。
- 同名替换不需要改代码；换文件名时修改 `media-config.js`。
- 外部媒体必须使用 HTTPS，并加入 `allowedExternalHosts`。

相关说明：

- [课程资源配置](./assets/courses/README.md)
- [封泥牌具贴图](./assets/textures/README.md)
- [山东 DEM 地形数据](./assets/terrain/README.md)

前端配置会公开给访客，不要放入密码、Token、Cookie 或长期私密签名。

## 地图

山东 3D 文化地图由 [js/three-map.js](./js/three-map.js) 读取轻量 DEM、山东边界和 45 个资料点位。地图用于文化展示和历史地理理解，不用于测绘、导航或工程计算。

主要参数位于文件顶部的 `MAP_VIEW`：

```js
maxZoomFactor: 5,
maxElevation: 1.20
```

## 趣味问答

```text
GET  /api/quiz/start
POST /api/quiz/answer
```

开始答题时不会返回正确答案。前端会打乱选项显示顺序，提交时仍使用原始答案键。每轮最多抽取十道已发布题目，题目不足十道时返回全部已发布题目。

本地题库位于 [data/mock-data.js](./data/mock-data.js)。题目 `id` 必须唯一，`correctAnswer` 只能是 `A`、`B`、`C` 或 `D`，`difficulty` 只能是“简单”“中等”或“困难”。

## 检查和部署

修改页面后，建议检查 `320px`、`375px`、`414px`、`768px`、`1024px` 和 `1440px` 宽度，重点看导航、图录弹窗、地图、课程、封泥牌具、AI 和问答是否溢出或遮挡。

部署说明见 [FC 部署说明](./docs/deployment/DEPLOY-FC.md)。公网发布前请确认 `.env`、API Key 和数据库密码没有进入 Git，RDS 没有对公网开放，HTTPS 稳定后再启用 HSTS。

## 目录

```text
Web/
├─ index.html              页面源码和本地双击入口
├─ server.js               静态网站和 API 服务
├─ assets/                 图片、字体、音乐、视频和贴图
├─ css/                    设计变量和按功能拆分的页面样式
├─ data/                   展示数据和媒体配置
├─ db/                     数据库结构、迁移和种子脚本
├─ docs/                   使用、部署、研究和验收资料
├─ js/                     页面交互、功能模块、AI、问答和 Three.js 场景
└─ templates/              可复用页面模板
```

`dist/` 是构建产物，不是源代码。它可以删除，运行 `npm run build` 或 `npm start` 后会重新生成。

CSS 加载顺序固定为：`tokens.css` → `01-base-opening.css` → `02-content-layout.css` → `03-museum-archive.css` → `04-scroll.css` → `05-typography.css` → `06-enhancements.css`。设计变量和主题放在 `tokens.css`，后面的文件按页面结构、展陈视觉、数字手卷、字体和增强动效依次覆盖。不要随意交换这些链接的顺序。

## 环境变量

```text
DASHSCOPE_API_KEY       百炼 API Key
DASHSCOPE_APP_ID        百炼应用 ID
QWEN_VL_MODEL           视觉模型，默认 qwen-vl-plus
PORT / FC_SERVER_PORT   本地或 FC 监听端口
DB_HOST / DB_PORT       MySQL 或 RDS 地址和端口
DB_NAME / DB_USER       数据库名和账号
DB_PASSWORD             数据库密码
DB_CONNECTION_LIMIT     连接池上限
FRONTEND_ORIGIN         允许访问 API 的前端地址
ENABLE_HSTS             HTTPS 稳定后设为 true
```
