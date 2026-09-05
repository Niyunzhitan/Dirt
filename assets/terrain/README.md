# 山东 DEM 地形数据

本目录保存山东 3D 文化地图使用的轻量高度图和区域遮罩：

```text
shandong-heightmap.png   768 x 392 灰度高度图
shandong-mask.png        山东轮廓遮罩
```

它们由山东省 30 米 DEM GeoTIFF 转换而来。原始 GeoTIFF 约 148 MB，没有放入网页仓库。当前文件只用于 Three.js 的地形起伏效果。

地图还会读取：

- `data/shandong-terrain.js`：文件路径、经纬度范围和显示参数
- `data/shandong-terrain-inline.js`：直接打开 `index.html` 时使用的轻量数据
- `data/shandong-prefectures.js`：山东 16 个地级市边界
- `js/three-map.js`：相机、缩放、抬升、点位投影和按需渲染

这些数据用于文化展示和历史地理理解，不适合测绘、导航、行政勘界或工程计算。

## 授权

原数据目录中的 `LICENSE` 标注 MIT License，但数据说明同时写有“未经允许不得随意传播和商业使用”，两者存在冲突。正式公网发布或商业使用前，应向数据提供方确认授权、署名和再分发条件。

替换 DEM 时，需要同时核对图片尺寸、`bounds` 经纬度范围、遮罩方向和行政边界映射。只替换图片而不改配置，地图点位可能出现偏移。
