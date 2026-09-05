# 课程资源配置

课程课件、教案、活动视频和其他媒体的路径统一配置在 [data/media-config.js](../../../data/media-config.js)。替换同名文件时不需要修改页面代码。

当前三课时原文件位于 `assets/`，逐页预览图位于 `assets/course-slides/`。本目录用于以后补充课程视频或封面。

## 配置示例

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

课程 ID 必须和 `data/mock-data.js` 或数据库中的课程 ID 一致。教案学习单和支教活动回顾视频配置在 `coursePack` 中，活动视频不要写进某一课的 `videoUrl`。

## 媒体格式

- 视频优先使用 MP4（H.264 + AAC），也可以使用 WebM。
- 封面使用 WebP 或 PNG。
- 文件名只使用英文字母、数字、短横线和点，例如 `course-01.mp4`。

如果以后加入教学视频，可以继续使用 `videoUrl` 和 `posterUrl`。

## 外部视频

外部地址必须使用 HTTPS，并把域名加入 `data/media-config.js` 的 `allowedExternalHosts`。不在白名单中的地址会被前端拒绝。

不要把账号、Cookie、Token、API Key 或长期私密签名写入前端配置。网页中的视频和封面对访客可见，只放允许公开传播的文件。
