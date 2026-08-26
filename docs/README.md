# 项目文档

`docs/` 保存使用说明、部署记录、研究材料和视觉验收文件。这里的内容主要供团队查阅，通常不直接参与网页运行。

```text
docs/
├─ User-Safari.md       普通访客使用说明
├─ deployment/          阿里云 FC 部署说明
├─ research/            答辩稿、资料提取文本和研究原始文件
└─ qa/screenshots/      桌面端、移动端视觉验收截图
```

常用入口：

- [网站使用说明](./User-Safari.md)
- [FC 部署说明](./deployment/DEPLOY-FC.md)
- [项目总览](../README.md)

网页正在使用的图片、字体、音乐、视频和 3D 贴图应放在根目录的 `assets/` 中。不要把运行资源随意移进 `docs/`，否则还要同步修改 HTML、CSS 或数据配置中的路径。

`research/` 和 `qa/` 中可能包含较大的原始文件或生成截图，默认不建议提交到 Git。临时 PPT 渲染目录也不参与网站运行，应加入 `.gitignore`，避免一次提交上百兆图片。

项目开源地址：[Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)。
