# 课程视频与封面替换目录

将课程视频和封面放在本目录，然后只修改 `data/media-config.js` 中对应课程的两个地址。

示例：

```js
"COURSE-01": {
  videoUrl: "./assets/media/courses/course-01.mp4",
  posterUrl: "./assets/media/courses/course-01.webp"
}
```

允许的视频格式：MP4、WebM。建议使用 MP4（H.264 + AAC），兼容性最好。

安全要求：

- 文件名只使用英文字母、数字、短横线和点，例如 `course-01.mp4`。
- 不要把含有账号、Cookie、Token 或签名密钥的私人播放地址写进前端配置。
- 公开网站中的视频和封面都会被访客下载，因此只放允许公开传播的文件。
