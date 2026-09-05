# 课程资源配置

网页中的课程课件、教案、活动记录和可选媒体路径统一配置在 [data/media-config.js](../../../data/media-config.js)，不需要修改 `js/app.js`。当前三课时原文件保存在 `assets/`，逐页预览图位于 `assets/course-slides/`。本目录留作以后补充教学视频或课程封面。

示例：

```js
"COURSE-01": {
  resourceUrl: "./assets/第一课时.pdf",
  resourceType: "PDF",
  resourceName: "第一课时教学课件",
  resourceFileName: "第一课时.pdf",
  slideBasePath: "./assets/course-slides/course-01",
  slideCount: 24
}
```

课程 ID 必须与 `data/mock-data.js` 或数据库中的课程 ID 一致。

整套课程的教案学习单和支教活动回顾配置在 `coursePack` 中。活动回顾视频不应写入某一课的 `videoUrl`。

## 可选媒体格式

- 视频：MP4（H.264 + AAC），兼容性最好
- 备选视频：WebM
- 封面：WebP 或 PNG
- 文件名：只使用英文字母、数字、短横线和点，例如 `course-01.mp4`

如果以后加入真正的教学视频，可以继续使用 `videoUrl` 和 `posterUrl` 字段。

## 外部视频

外部地址必须使用 HTTPS，并将域名加入 `data/media-config.js` 的 `allowedExternalHosts`。未进入白名单的地址会被前端拒绝。

不要把账号、Cookie、Token、API Key 或长期私密签名写进前端配置。网站中的视频和封面可以被访客访问和下载，因此只放允许公开传播的素材。
