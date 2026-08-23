# 山东 DEM 高度图

本目录中的 `shandong-heightmap.png` 由用户提供的：

```text
D:\Downloads\21de6-main\21de6-main\DEM_Shandong\Shandong_DEM.tif
```

转换生成。原始数据说明为“山东省 DEM 数据 30 米”，原始文件是 16 位单波段 GeoTIFF，范围和高程统计来自原始 `.tif.xml` 与 `.aux.xml`。

当前网页使用的是降采样后的 768 x 392 灰度高度图，不包含原始 148MB GeoTIFF。灰度值仅用于 Three.js 展示地形起伏，不是测绘、导航或工程计算数据。

`data/shandong-prefectures.js` 使用 DataV 行政区划数据中的山东省 16 个地级市外边界，经过等距抽样后用于网页划分展示。边界折线按经纬度映射到同一 DEM 范围，并逐点采样地形高度，因此会跟随地图缩放、平移和视角抬升。该数据同样只用于文化展示，不作为行政勘界依据。

许可注意：随数据目录提供的 `LICENSE` 写有 MIT License，但数据 README 同时写有“未经允许不得随意传播和商业使用”。两者存在冲突；正式公网商业使用前，应向数据提供方确认最终授权、署名和再分发条件。
