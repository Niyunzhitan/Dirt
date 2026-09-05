# 数据库说明

项目默认使用 `data/` 中的本地数据，不需要 MySQL。需要在线维护地点、藏品、课程或趣味问答题库时，再启用数据库模式。

## 初始化

1. 使用 MySQL Workbench 管理员账号执行 [schema.sql](./schema.sql)。
2. 在项目根目录复制 `.env.example` 为 `.env`，填写数据库连接信息。
3. 执行 `npm run db:seed`。
4. 在 `js/config.js` 中打开需要的数据库开关。
5. 启动服务并访问 `http://127.0.0.1:3000/api/health`。

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
DB_CONNECTION_LIMIT=5
```

本地端口以实际配置为准；云端 RDS 通常使用 `3306`。

## 种子数据

`db/seed.js` 可以重复执行。地点、藏品和课程按主键更新，不会重复生成相同记录。

题库只有在 `questions` 表为空时才会导入。已有题目不会被覆盖。

## 数据库升级

旧数据库如果缺少 `questions.difficulty` 字段，执行一次：

```text
db/migrations/001-add-question-difficulty.sql
```

新建数据库直接使用最新的 `schema.sql`。`difficulty` 可填“简单”“中等”或“困难”。

## 开启数据库模式

在 [js/config.js](../js/config.js) 中设置：

```js
USE_DATABASE: true,
USE_QUIZ_DATABASE: true
```

两个开关互不依赖。

## 题库字段

```text
question_text                              题干
option_a / option_b / option_c / option_d  四个选项
correct_answer                             A、B、C 或 D
explanation                                解析
difficulty                                 简单、中等或困难
is_published                               1 参与抽题，0 暂停使用
```

每轮最多随机抽取十道已发布题目。

## 接口

```text
GET /api/quiz/start
POST /api/quiz/answer
```

开始答题时不会返回正确答案。判题接口接收 `questionId` 和答案键，并返回是否正确、正确答案、解析和本题得分。

## 安全

- 正式部署时把数据库变量放在 FC 环境变量中，不要提交真实 `.env`。
- RDS 不要开放 `0.0.0.0/0`。
- 管理账号和网站运行账号分开使用，网站账号只授予实际需要的权限。
