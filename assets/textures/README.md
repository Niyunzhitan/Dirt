# 封泥牌具贴图

Three.js 负责牌具的形状、圆角、材质和光照，这里的图片只负责牌面图案。贴图缺失时，网页会显示占位材质，模型仍能旋转和切换。

```text
assets/textures/
├─ poker/
│  ├─ front/   扑克牌正面
│  └─ back/    扑克牌背面
└─ mahjong/
   ├─ front/   麻将正面
   ├─ back/    麻将背面
   └─ side/    可选的麻将侧面
```

建议尺寸：

- 扑克牌正面和背面：`750 x 1050 px`
- 麻将正面和背面：`768 x 1024 px`
- 麻将侧面：`512 x 512 px`
- 色彩空间：sRGB
- 当前内嵌构建支持 PNG 和 JPEG

重要文字和印文与边缘至少留出画布宽度的 6%。圆角和立体阴影由模型生成，不必画进贴图。

贴图路径集中在 [data/media-config.js](../../data/media-config.js) 的 `textures` 配置中。保留文件名时直接覆盖图片；更换文件名时只改配置，不要到 `js/three-showcase.js` 中查找路径。外部贴图必须使用 HTTPS，并将主机名加入 `allowedExternalHosts`。

麻将没有侧面图片时，程序会生成暖白木纹、灰蓝边线和朱砂细线的默认侧面。

直接双击 `index.html` 时，WebGL 从 `data/texture-inline.js` 读取内嵌贴图；通过 HTTP 或公网访问时，则加载这里的普通图片。`npm run build` 会执行 `scripts/build-inline-textures.js`，重新内嵌脚本中登记的六张默认贴图。新增纹理配置时，也要在该构建脚本中补上路径和 MIME 类型。

贴图会公开给访客，不要放入私密水印、凭据或没有使用许可的素材。
