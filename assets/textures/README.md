# 3D 牌具贴图

Three.js 模型负责形状、圆角、材质和光照，Photoshop 贴图只负责表面图案。贴图缺失或加载失败时，网页会生成占位图，模型和切换功能仍可使用。

## 目录结构

```text
poker/
├─ front/   扑克牌正面
└─ back/    扑克牌公共背面

mahjong/
├─ front/   麻将正面
├─ back/    麻将背面
└─ side/    麻将侧面
```

## 建议尺寸

- 扑克牌正面、背面：`750 x 1050px`
- 麻将正面、背面：`768 x 1024px`
- 麻将侧面：`512 x 512px`
- 色彩空间：sRGB
- 格式：优先 WebP，也支持 PNG

重要文字和印文距离画布边缘至少保留宽度的 `6%`。不要在贴图中重复绘制圆角和立体投影，这些效果由模型完成。

## 替换方式

常用路径集中在 [data/media-config.js](../../data/media-config.js) 的 `textures` 中。

- 保留文件名：直接覆盖同名文件，不需要改代码。
- 使用新文件名：只修改 `media-config.js`，不要改 `three-showcase.js`。
- 使用外部贴图：必须使用 HTTPS，并把域名加入 `allowedExternalHosts`。

直接双击 `index.html` 时，浏览器可能因 `file://` 安全限制使用占位贴图；通过 `npm start` 打开时会正常读取本地 PNG 或 WebP。

贴图会公开给网站访客，不要在文件或配置中放入账号、Token、Cookie、水印私密信息或未获授权的素材。
