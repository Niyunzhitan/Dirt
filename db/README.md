# 数据库说明

数据库用于在线维护地点、藏品、课程、文创和趣味问答。只做静态演示时可以继续使用 `data/` 中的本地数据，不必安装 MySQL。

## 初次初始化

1. 使用 MySQL Workbench 管理员账号执行 [schema.sql](./schema.sql)。
2. 在项目根目录复制 `.env.example` 为 `.env`，填写数据库连接信息。
3. 执行 `npm run db:seed`，导入项目当前的地点、藏品、课程、文创和初始题库。
4. 执行 `npm start`，访问 `http://127.0.0.1:3000/api/health`。

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
DB_CONNECTION_LIMIT=5
```

本地端口以实际 MySQL 配置为准；RDS 通常使用 `3306`。

## 种子脚本

`db/seed.js` 可以重复执行：地点、藏品、课程和文创会按主键更新，不会不断生成重复记录。

题库采用更谨慎的规则：只有 `questions` 表为空时，脚本才会导入 `data/mock-data.js` 中当前的 13 道题。如果数据库已有题目，种子脚本不会覆盖它们。

## 已有数据库升级

早期数据库如果还没有 `questions.difficulty` 字段，需要执行一次：

```text
db/migrations/001-add-question-difficulty.sql
```

如果该字段已经存在，不要重复执行迁移。新建数据库直接使用最新的 `schema.sql`，不需要再跑这条迁移。

`difficulty` 可填写：`简单`、`中等`或`困难`。

## 启用数据库数据

数据库连接成功后，在 [js/config.js](../js/config.js) 中按需要开启：

```js
USE_DATABASE: true,      // 地点、藏品、课程和文创
USE_QUIZ_DATABASE: true  // 趣味问答
```

两个开关互不依赖，可以只启用其中一个。

## 题库字段

```text
question_text                         题干
option_a / option_b / option_c / option_d  四个选项
correct_answer                        A、B、C 或 D
explanation                           解析
difficulty                            简单、中等或困难
is_published                          1 参与抽题，0 暂停使用
```

问答每轮会从 `is_published = 1` 的记录中随机抽取最多十道且不重复。少于十道时返回当前全部已发布题目；题库为空时返回明确错误。

## 问答接口

开始一轮：

```text
GET /api/quiz/start
```

该接口不返回正确答案。

判定一道题：

```http
POST /api/quiz/answer
Content-Type: application/json

{"questionId": 1, "answer": "B"}
```

后端返回 `correct`、`correctAnswer`、`explanation` 和 `earnedScore`。前端即使打乱选项顺序，也会提交原始答案键，并把返回答案转换成当前显示的字母。

## 安全提醒

- 正式部署时，把数据库变量填在 FC 环境变量中，不要上传真实 `.env`。
- RDS 应只允许 FC 所在 VPC 和必要的管理地址访问，不要开放 `0.0.0.0/0`。
- Workbench 管理账号和网站运行账号应分开，网站账号只授予需要的表权限。
