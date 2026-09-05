# 项目文档

`docs/` 存放网站使用说明、部署记录、研究材料和视觉验收文件。这里的文件通常不参与网页运行。

```text
docs/
├─ User-Safari.md       普通访客使用说明
├─ deployment/          阿里云 FC 部署说明
├─ research/            研究材料和资料提取文件
└─ qa/screenshots/      视觉验收截图
```

常用入口：

- [网站使用说明](./User-Safari.md)
- [FC 部署说明](./deployment/DEPLOY-FC.md)
- [项目总览](../README.md)

网页运行所需的图片、字体、音乐、视频和封泥牌具贴图放在根目录的 `assets/`，不要随意移入 `docs/`。移动资源后，还需要同步修改 HTML、CSS 或数据配置中的路径。

`research/` 和 `qa/` 可能包含较大的原始文件和截图，默认不建议提交大量生成文件。临时渲染目录也不参与网站运行，应加入 `.gitignore`。

项目开源地址：[Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)。
