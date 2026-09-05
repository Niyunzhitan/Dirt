# 阿里云函数计算 FC 部署

项目名称：泥云智探｜齐鲁封泥智慧人文平台

本项目可以把 `server.js` 部署为 FC Web 函数，用来提供 AI、数据库 API，以及可选的静态网页服务。

## 推荐架构

更稳妥的公网部署方式是：

```text
浏览器 → OSS 静态网站 / 自定义域名
              ↓ API 请求
          FC Web 函数 → 百炼 / RDS
```

部分 FC 默认域名或浏览器环境可能把 HTML 响应当作附件下载。如果 FC 地址能够正常内联显示网页，也可以让同一个 `server.js` 同时托管前端和 API；否则前端放在 OSS，FC 只作为 API 地址使用。

## 当前服务配置

- 入口：项目根目录 `server.js`
- 监听地址：`0.0.0.0`
- 监听端口：优先读取 `PORT`，其次读取 `FC_SERVER_PORT`
- 文字问答：百炼应用 Completion API
- 图片问答：`qwen-vl-plus`
- 默认百炼应用 ID：`c786fc9824414081980b6aa3258bb787`

## FC 环境变量

必须设置：

```text
DASHSCOPE_API_KEY=你的百炼API Key
```

建议显式设置：

```text
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

使用 RDS 时还需要：

```text
DB_HOST=RDS 内网地址
DB_PORT=3306
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=云数据库账号密码
DB_CONNECTION_LIMIT=5
```

FC 与 RDS 应位于同一地域和可通信的 VPC。云端 `DB_HOST` 不能填写 `localhost`。

前端和 API 分开部署时，建议设置：

```text
FRONTEND_ORIGIN=https://你的正式前端地址
```

HTTPS 已经稳定后才设置 `ENABLE_HSTS=true`。所有密钥和密码只能放在 FC 环境变量中，不要写进代码包。

## Web 函数设置

```text
运行环境：Node.js 20（Node.js 18 也可）
启动命令：npm start
监听端口：9000（如果控制台要求填写）
请求处理程序：Web 函数无需传统 handler
超时时间：建议 60 秒
内存：建议 512 MB 或更高
```

部署包至少需要 `server.js`、`server/`、`package*.json`、前端资源目录和实际使用的数据文件。不要把 `.env`、`.git`、研究原始资料、QA 截图或本地渲染审计目录打进代码包。

## 前端地址配置

如果网页与 API 同域，可以将 [js/config.js](../../js/config.js) 中对应 API 地址设为空字符串，让浏览器使用同域 `/api/*`。

如果前端部署在 OSS、API 部署在 FC：

1. 将 `AI_API_BASE_URL` 指向 FC 公网地址。
2. 数据库模式需要将 `API_BASE_URL` 指向 FC 地址。
3. 将 FC 环境变量 `FRONTEND_ORIGIN` 设置为 OSS 或自定义域名的完整 HTTPS 地址。
4. 根据需要开启 `USE_DATABASE` 和 `USE_QUIZ_DATABASE`。

不要把 API Key 写入 `js/config.js`，该文件会公开给所有访客。

## 部署后检查

```text
GET /api/health
GET /api/ai/status
GET /api/data/stats
GET /api/data/sites
GET /api/quiz/start
```

数据库连接正常时，健康接口应返回：

```json
{"server":"ok","database":"ok"}
```

未配置数据库时返回 `database: "not-configured"`，这不影响静态页面和 AI 接口。

单题判定：

```http
POST /api/quiz/answer
Content-Type: application/json

{"questionId": 1, "answer": "B"}
```

`GET /api/quiz/start` 应返回最多十道不重复题目和 `scorePerQuestion`，且不包含正确答案。

## 上线前检查

- 确认 `.env`、API Key 和数据库密码不在代码包或 Git 历史中。
- RDS 不开放 `0.0.0.0/0`，网站使用权限受限的数据库账号。
- `FRONTEND_ORIGIN` 不长期使用 `*`。
- 在 API 网关或 WAF 增加统一限流、日志和费用告警。
- 保留 DEM、行政边界、图片、字体和音乐所需的来源与授权说明。
