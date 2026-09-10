# 项目文档

`docs/` 放使用说明和部署资料，不参与网站运行。

```text
docs/
├─ User-Safari.md                  访客使用说明
├─ deployment/DEPLOY-FC.md         阿里云 FC 部署说明
└─ 泥云智探更新与使用手册.docx      完整图文手册
```

常用入口：

- [访客使用说明](./User-Safari.md)
- [FC 部署说明](./deployment/DEPLOY-FC.md)
- [项目总览](../README.md)

网站要加载的图片、字体、课件、音视频和贴图都在根目录 `assets/` 中。移动这些文件时，需要同步修改 `index.html`、CSS 或 `data/media-config.js` 中的路径。

研究原始材料、QA 截图和临时渲染结果不放在这里，也不参与发布。FC 压缩包由 `npm run package:fc` 生成到根目录的 `releases/`。
