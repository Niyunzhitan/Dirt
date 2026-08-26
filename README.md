# 泥云智探

“泥云智探”是一个面向公众、学生和传统文化爱好者的齐鲁封泥智慧人文平台。网站把文物调研、金石资料、文化地图、开源课程、3D 牌具、趣味问答和“印小灵”AI 导览放在同一个浏览体验中。

项目已开源：[Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)。普通访客可以先阅读 [网站使用说明](./docs/User-Safari.md)。

## 主要功能

- 封泥实物、印文、年代、出土地与史料价值展示
- 山东 3D 地形图和简化平面图，支持 45 处现代区县资料检索
- 数字手卷、封泥故事与开源研学课程
- 可替换 Photoshop 贴图的扑克牌、麻将 3D 展厅
- “印小灵”文字问答和多图辅助观察
- 每轮随机十题、逐题判定的趣味问答
- 汉白玉、墨玉、昼夜自动主题，以及音乐、字号、行距和动效设置

## 项目结构

前端使用原生 HTML、CSS 和 JavaScript，并在本地保存 Vue 与 Three.js 依赖。`server.js` 同时提供静态文件、AI 代理和可选的 MySQL 数据接口。

数据有两种来源：

- **本地数据模式**：读取 `data/` 中的展示数据和题库，适合开发、演示和离线浏览。
- **数据库模式**：通过 `server.js` 读取 MySQL，适合在线维护内容和题库。

两种模式由 [js/config.js](./js/config.js) 分别控制：

```js
USE_DATABASE: false,      // 藏品、地图、课程和文创
USE_QUIZ_DATABASE: false  // 趣味问答
```

## 快速开始

需要 Node.js 18 或更高版本。

```powershell
npm install
npm start
```

打开 `http://127.0.0.1:3000`。运行语法检查：

```powershell
npm run check
```

如果只想浏览静态内容，也可以直接双击 `index.html`。这种方式不会启动本地 API，因此数据库和本地 AI 服务不可用；本地展示数据、内嵌 DEM 地图和大部分前端交互仍可使用。

## AI 配置

复制 `.env.example` 为 `.env`，至少填写：

```env
DASHSCOPE_API_KEY=你的百炼API Key
```

以下配置已有默认值，通常不需要修改：

```env
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

调用路线：

```text
纯文字：浏览器 → POST /api/ai/chat → 百炼应用 Completion API
带图片：浏览器 → POST /api/ai/chat → DashScope 兼容接口 → qwen-vl-plus
```

API Key 只能放在 `.env`、FC 环境变量或其他服务端密钥配置中，不能写进 HTML、前端 JavaScript 或 Git 仓库。本地 AI 还要求电脑能够访问 `dashscope.aliyuncs.com`；失效的 `HTTP_PROXY` 或 `HTTPS_PROXY` 也会导致连接失败。

常用检查地址：

```text
http://127.0.0.1:3000/api/health
http://127.0.0.1:3000/api/ai/status
```

## 数据库配置

使用 MySQL 时，在 `.env` 中填写：

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
DB_CONNECTION_LIMIT=5
```

本地端口以你的 MySQL 配置为准；云端 RDS 通常使用 `3306`。

初始化流程：

1. 使用 MySQL Workbench 管理员账号执行 `db/schema.sql`。
2. 在项目根目录执行 `npm run db:seed`。
3. 将 `js/config.js` 中需要启用的数据库开关改为 `true`。
4. 启动网站并检查 `/api/health`。

完整说明见 [数据库部署](./db/README.md)。

## 媒体与 3D 资源

课程视频、封面、背景音乐和 3D 贴图的公开路径统一写在 [data/media-config.js](./data/media-config.js)。

1. 课程视频和封面放入 `assets/media/courses/`。
2. 背景音乐放入 `assets/media/music/`。
3. 扑克牌和麻将贴图放入 `assets/textures/`。
4. 使用新文件名时修改 `data/media-config.js`；同名覆盖不需要改代码。

外部媒体必须使用 HTTPS，并将域名加入 `allowedExternalHosts`。前端配置会公开给访客，不能填写密码、Token、Cookie 或长期私密签名。

相关说明：

- [课程视频与封面](./assets/media/courses/README.md)
- [3D 牌具贴图](./assets/textures/README.md)
- [山东 DEM 数据](./assets/terrain/README.md)

## 地图配置

文化地图由 [js/three-map.js](./js/three-map.js) 读取轻量 DEM、山东边界和 45 个资料点位。它用于文化展示，不适合测绘、导航或工程计算。

常用参数集中在文件顶部的 `MAP_VIEW`：

```js
maxZoomFactor: 5,  // 最大放大比例
maxElevation: 1.20 // 最大抬升角，单位为弧度，约 69°
```

地图按需渲染：进入视口、切换模式、调整相机或点位变化时更新，离开视口后暂停 WebGL 工作。

## 趣味问答

```text
GET  /api/quiz/start
POST /api/quiz/answer
```

`/api/quiz/start` 不返回正确答案。前端会打乱选项显示顺序，并把原始答案键提交给 `/api/quiz/answer`。题库达到十道后，每轮随机抽取十道且不重复；少于十道时返回当前全部已发布题目。

本地题库位于 [data/mock-data.js](./data/mock-data.js)。每道题的 `id` 必须唯一，`correctAnswer` 只能为 A、B、C 或 D，`difficulty` 只能为简单、中等或困难，四个选项与解析都需要填写。

## 响应式检查

修改页面后，建议至少检查 `320px`、`375px`、`414px`、`768px`、`1024px` 和 `1440px`。重点查看横向溢出、文字遮挡、固定导航、44px 触控目标、弹窗位置，以及地图、课程、3D 展厅、AI 和问答在不同断点下的排列。

## 部署

推荐将前端静态文件部署到 OSS，将 `server.js` 部署为阿里云 FC Web 函数；也可以让 Node 服务同时托管网页和 API，具体取决于当前 FC 域名是否能正常内联显示 HTML。

部署步骤见 [FC 部署说明](./docs/deployment/DEPLOY-FC.md)。公网发布前请确认：

- `.env`、API Key 和数据库密码没有进入 Git；
- `FRONTEND_ORIGIN` 已限制为正式前端地址；
- RDS 没有开放 `0.0.0.0/0`；
- `ENABLE_HSTS=true` 只在 HTTPS 已稳定后启用；
- 临时截图、渲染审计目录和研究原始文件没有被误提交。

## 目录速览

```text
Web/
├─ index.html              网页入口
├─ server.js               静态网站、AI 与数据库 API
├─ assets/                 图片、字体、音乐、视频与贴图
├─ css/                    设计变量和页面样式
├─ data/                   展示数据与公开媒体配置
├─ db/                     数据库结构、迁移和种子脚本
├─ docs/                   使用、部署、研究和验收资料
├─ js/                     页面交互、AI、问答和 Three.js 场景
└─ templates/              可复用页面模板
```

`docs/research/`、`docs/qa/` 和本地渲染审计目录不参与网站运行，也不建议提交大批生成图片。

## 环境变量速查

```text
DASHSCOPE_API_KEY       百炼 API Key，服务端必填
DASHSCOPE_APP_ID        百炼应用 ID，已有默认值
QWEN_VL_MODEL           视觉模型，默认 qwen-vl-plus
PORT / FC_SERVER_PORT   本地或 FC 监听端口
DB_HOST / DB_PORT       MySQL / RDS 地址和端口
DB_NAME / DB_USER       数据库名和账号
DB_PASSWORD             数据库密码
DB_CONNECTION_LIMIT     连接池上限
FRONTEND_ORIGIN         允许跨域调用 API 的正式前端地址
ENABLE_HSTS             HTTPS 稳定后设为 true
```
