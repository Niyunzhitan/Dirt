# 源码阅读导航

## 入口与加载顺序

从 `index.html` 的底部脚本列表开始阅读。项目主体使用普通浏览器脚本，模块通过 `window.Niyun*` 注册工厂，`js/app.js` 注入依赖并启动。这样根目录网页可以保留 `file://` 预览方式；不要直接把这些脚本改成 ES Modules。

`js/theme-bootstrap.js` 在样式表之前恢复主题。配置和数据先加载，服务和控制器随后注册，`app.js` 最后组装页面。问答区是独立的 Vue 应用，由 `js/quiz/main.js` 挂载。

## 按功能阅读

| 功能 | 主要文件 | 维护要点 |
| --- | --- | --- |
| 页面组装与内容模板 | `js/app.js` | 提供 DOM 工具、HTML 转义、显示设置和栏目渲染 |
| 数据访问 | `js/api.js` | 在本地展示数据与数据库接口间切换 |
| AI 请求 | `js/ai-service.js` | 候选后端、文件编码、失败详情和状态广播 |
| AI 界面 | `js/ai-chat.js`、`js/ai-pet.js` | 两个入口使用独立会话存储，共享请求服务 |
| 地图 | `js/map-browser.js`、`js/three-map.js` | 前者负责筛选，后者负责地形、坐标投影和手势 |
| 课程与手卷 | `js/course-browser.js`、`js/scroll-story.js` | 滚动位置驱动页码；课程请求编号防止旧结果覆盖 |
| 3D 牌具 | `js/three-showcase.js` | 加载贴图、管理模型资源、控制相机与渲染 |
| 搜索与图录 | `js/search-dialog.js`、`js/source-archive.js` | 共用入口传入的模板及定位函数 |
| 开屏与装饰 | `js/opening-loader.js`、`js/page-effects.js` | 管理动画帧、超时退场和可见性 |
| 鼠标尾迹 | `js/cursor-debris.js` | 管理碎屑生成、尾迹控件、本地保存和设备限制；常用参数位于文件顶部 |
| 导航与设置 | `js/site-navigation.js`、`js/display-settings.js` | 设置通过回调读写，避免保存过期状态引用 |
| 音乐协调 | `js/media-coordinator.js` | 处理播放权限、用户偏好和视频播放时暂停音乐 |
| 服务端 | `server.js`、`server/db.js` | 静态资源、AI 代理、数据库与问答 API |
| 数据初始化 | `db/schema.sql`、`db/seed.js` | 手动维护任务，导入采用事务，不在访问页面时运行 |

## 不应丢失的约定

- AI 的 `connected` 分别用 `true`、`false`、`null` 表示成功、失败、未知；`configured` 不代表上游可用。
- AI 状态接口会调用真实应用并缓存结果，可能消耗额度。不要为了界面刷新而频繁调用。
- 地图覆盖物的高度必须与显示网格一致；修改顶点后必须标记 `position.needsUpdate`。
- 请求编号用于丢弃过期结果，不代表网络请求已取消。
- 数据生成的 HTML 需要转义；媒体地址通过 `MediaSecurity.resolve` 校验。
- 浏览器配置全部公开。API Key 和数据库凭据只放服务端环境变量，不写入前端或文档。

## 样式与数据

字号和行距不再提供用户调整，正文默认值固定在 `css/02-content-layout.css`。开屏开关位于设置面板的“动态效果”分组。

鼠标尾迹偏好单独保存在 `niyun-cursor-trail` 中，不属于 `app.js` 的显示设置对象。尾迹模块通过 `media-settings-reset` 响应“恢复默认”。窄屏、触屏、系统减少动态效果或页面动效为 0 时，控件锁定关闭；设备限制解除后仍使用原先保存的偏好。

`css/tokens.css` 定义主题和尺寸变量，`01` 至 `06` 样式表按顺序叠加。相同选择器可能是有意覆盖，移动规则或合并媒体查询前应检查最终计算样式。

`data/media-config.js` 管理媒体地址与允许的外站；`data/ai-pet-config.js`、`data/3d-products.js`、`data/shandong-terrain.js` 管理对应功能配置。史料、题目和地理坐标属于内容数据，不应为了代码格式整理改动事实值。

## 生成文件与发布

- `js/vendor/three.js`：由 `scripts/build-three.mjs` 生成，导出入口为 `scripts/three-entry.js`。
- `data/texture-inline.js`：由 `scripts/build-inline-textures.js` 生成。
- `js/seal-glyph-paths.js`：由 `scripts/extract-seal-glyphs.ps1` 生成，修改逻辑应先修改生成模板。
- `dist/`、`deploy/fc/dist/`、FC 服务端副本和 `releases/`：通过构建及打包同步，不单独手改。
- DEM 内嵌数组、行政区坐标和二进制资源不做逐项注释。

`npm run package:fc` 执行语法检查、生产构建、运行依赖安装和压缩包校验，不执行线上部署。包中不包含 `.env`，线上配置仍由 FC 环境变量提供。

字形提取脚本含 UTF-8 中文，使用 PowerShell 7 执行：`pwsh -NoProfile -File scripts/extract-seal-glyphs.ps1`。旧版 Windows PowerShell 默认编码可能无法正确解析。

## 验证

```sh
npm run check
node --test tests/*.test.cjs
npm run build
```

`tests/terrain-browser.cjs` 使用 Playwright 和 sharp，连接本地 `127.0.0.1:5173`，验证地图画布及移动端双触点。它们不是项目运行依赖；可以通过 `PLAYWRIGHT_MODULE`、`SHARP_MODULE` 指定已有安装路径。

`node tests/cursor-debris.cjs` 使用 Playwright 检查尾迹生成、清理、控件和设备限制，无需启动网站服务；可通过 `PLAYWRIGHT_MODULE` 指定已有安装路径。该测试不是 `*.test.cjs`，需要单独执行。

本轮整理保留常用简短的 `map`、`filter`、Promise 兜底和参数转发箭头函数。复杂回调采用具名函数，注释用于说明约束、时序和原因，不逐行复述代码。
