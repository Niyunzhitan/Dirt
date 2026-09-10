# 山东地形数据

山东 3D 文化地图使用两张轻量图片：

```text
shandong-heightmap.png   768 x 392 灰度高度图
shandong-mask.png        山东轮廓遮罩
```

它们由山东省 30 米 DEM GeoTIFF 转换而来。原始 GeoTIFF 约 148 MB，没有放进网页仓库。当前图片只用于生成地图起伏和裁出山东轮廓。

地图还会读取：

- `data/shandong-terrain.js`：图片路径、经纬度边界和显示参数
- `data/shandong-terrain-inline.js`：本地双击页面时使用的轻量数据
- `data/shandong-prefectures.js`：山东 16 个地级市边界
- `assets/maps/shandong-map-flat.webp`：简化平面版地图
- `js/three-map.js`：相机、缩放、抬升、点位投影和渲染逻辑

替换 DEM 时，要一起核对图片尺寸、`bounds` 经纬度范围、遮罩方向和行政边界映射。只换图片不改配置，点位可能偏离实际位置。

这些数据用于文化展示和历史地理阅读，不能用于测绘、导航、行政勘界或工程计算。

## 授权说明

现有原数据说明存在冲突：目录中的 `LICENSE` 标为 MIT License，另一处说明又写有“未经允许不得随意传播和商业使用”。正式公开或用于商业项目之前，应向数据提供方确认可否再分发、如何署名，以及是否允许商用。
