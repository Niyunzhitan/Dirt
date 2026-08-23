# 3D 牌具贴图

Three.js 模型和 Photoshop 表面设计相互独立。贴图不存在时，网页会自动生成“PS 贴图占位”图案；设计完成后覆盖对应文件即可。

- 直接双击 `index.html` 时，浏览器会使用内置占位贴图，3D 模型和切换功能仍可运行。
- 通过 `node server.js` 打开时，网页会优先读取下方目录中的实际 PNG / WebP 贴图。

## 目录

```text
poker/
  front/   扑克牌正面
  back/    扑克牌公共背面

mahjong/
  front/   麻将正面
  back/    麻将背面
  side/    麻将侧面
```

## 建议尺寸

- 扑克牌正面、背面：`750 x 1050px`，sRGB，PNG 或 WebP。
- 麻将正面、背面：`768 x 1024px`，sRGB，PNG 或 WebP。
- 麻将侧面：`512 x 512px`，sRGB，PNG 或 WebP。
- 重要文字和印文距离边缘至少为画布宽度的 `6%`。
- 圆角和模型高光由 Three.js 负责，Photoshop 贴图不要再裁圆角或绘制立体阴影。

## 路径配置

所有常用贴图路径集中在 `data/media-config.js` 的 `textures` 区域。保留同名文件时不需要修改代码，只覆盖 `assets/textures/` 中的文件；使用新文件名时只修改 `media-config.js`，不要修改 Three.js 核心代码。

外部贴图必须使用 HTTPS，并把域名加入 `data/media-config.js` 顶部的 `allowedExternalHosts`；没有进入白名单的外部贴图会自动使用安全占位图。
