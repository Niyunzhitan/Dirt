# 课程资源

三课时 PDF、逐页预览图、教案学习单和支教活动回顾视频都放在这个目录。网页中的路径统一写在 [data/media-config.js](../../data/media-config.js)，替换同名文件时不需要改页面代码。

当前目录：

```text
assets/courses/
├─ course-slides/course-01/   第一课时预览图，共 24 页
├─ course-slides/course-02/   第二课时预览图，共 31 页
├─ course-slides/course-03/   第三课时预览图，共 22 页
├─ 第一课时.pdf
├─ 第二课时 ppt.pdf
├─ 第三课时（1）.pdf
├─ 教案+学习单(2).docx
└─ 视频.mp4
```

一门课程的配置示例：

```js
"COURSE-01": {
  videoUrl: "",
  posterUrl: "",
  resourceUrl: "./assets/courses/第一课时.pdf",
  resourceType: "PDF",
  resourceName: "第一课时教学课件 PDF",
  resourceFileName: "第一课时.pdf",
  slideBasePath: "./assets/courses/course-slides/course-01",
  slideCount: 24
}
```

课程 ID 必须与 `data/mock-data.js` 或数据库记录一致。教案和活动回顾视频写在 `coursePack` 中，不要放进某一课的 `videoUrl`。新增或删除预览页后，要同步修改 `slideCount`。

视频建议使用 MP4（H.264 + AAC）或 WebM，封面使用 WebP 或 PNG。新文件名尽量只用英文字母、数字、短横线和点，例如 `course-01.mp4`；现有中文文件名可继续使用，但修改名称后必须更新配置。

外部媒体地址必须使用 HTTPS，并把主机名加入 `allowedExternalHosts`。前端配置和媒体文件都能被访客访问，不要放入账号、Cookie、Token、私密签名或没有公开授权的内容。
