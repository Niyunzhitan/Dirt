# 课程视频与封面

课程媒体文件放在本目录，网页中的公开路径统一配置在 [data/media-config.js](../../../data/media-config.js)。不需要修改 `js/app.js`。

示例：

```js
"COURSE-01": {
  videoUrl: "./assets/media/courses/course-01.mp4",
  posterUrl: "./assets/media/courses/course-01.webp"
}
```

课程 ID 必须与 `data/mock-data.js` 或数据库中的课程 ID 一致。

## 建议格式

- 视频：MP4（H.264 + AAC），兼容性最好
- 备选视频：WebM
- 封面：WebP 或 PNG
- 文件名：只使用英文字母、数字、短横线和点，例如 `course-01.mp4`

视频开始播放时，页面会暂停背景音乐；视频暂停或结束后，如果音乐之前正在播放，页面会恢复音乐。

## 外部视频

外部地址必须使用 HTTPS，并将域名加入 `data/media-config.js` 的 `allowedExternalHosts`。未进入白名单的地址会被前端拒绝。

不要把账号、Cookie、Token、API Key 或长期私密签名写进前端配置。网站中的视频和封面可以被访客访问和下载，因此只放允许公开传播的素材。
