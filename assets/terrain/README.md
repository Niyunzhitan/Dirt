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
- `data/shandong-rivers.js`：主要河流概化中心线，供蓝色河槽示意使用
- `data/shandong-rivers-reference.js`：按用户参考图相对位置补绘的河流、运河示意
- `assets/maps/shandong-map-flat.webp`：简化平面版地图
- `js/three-map.js`：相机、缩放、抬升、点位投影和渲染逻辑

替换 DEM 时，要一起核对图片尺寸、`bounds` 经纬度范围、遮罩方向和行政边界映射。只换图片不改配置，点位可能偏离实际位置。

这些数据用于文化展示和历史地理阅读，不能用于测绘、导航、行政勘界或工程计算。

## 市界和河流

市界来自 [DataV 山东行政区划数据](https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json)，通过 `node scripts/update-prefectures.cjs` 更新，保留源顶点。显示时按端点精确匹配两个不同城市的共享边，并按地形三角网格拆分贴地；并非完整的行政区拓扑校验。

东营、滨州数据中一处已报告的独立小四边形，其行政含义尚未核实。`createExcludedBoundaryEdges()` 只排除这处四条边的展示，原始数据保留；更新数据时应重新核对，不能按面积批量删除其他闭合边界。

河流来自 [Natural Earth 1:10m 河流与湖泊中心线](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson)，为公共领域数据，通过 `node scripts/update-rivers.cjs` 更新。此处 1:10m 表示 1:1000 万比例尺，不是 10 米分辨率。当前只筛选地图包围盒内的连续顶点，包含黄河、沂河及范围内漳河河段，不是完整山东水网。

蓝色河槽通过降低中心线附近的显示网格顶点形成，宽度和深度均为示意参数，未修改原始高度图。地图没有完整湖泊、水库面数据，不能将低地或地形阴影直接当成水体。

参考图补绘单独保存在 `data/shandong-rivers-reference.js`，包含马颊河、徒骇河、漳卫新河、卫运河、小清河、大汶河、泗河、洙赵新河、东鱼河、京杭运河、弥河、潍河、胶莱河、大沽河、五龙河、大沽夹河和沭河。坐标根据参考图走向与地名粗略对齐，不是从测绘数据提取的经纬度，不能据此判断河流实际位置、支流连接或水面范围。公开数据更新脚本不会覆盖这份补绘文件。

## 授权说明

现有原数据说明存在冲突：目录中的 `LICENSE` 标为 MIT License，另一处说明又写有“未经允许不得随意传播和商业使用”。正式公开或用于商业项目之前，应向数据提供方确认可否再分发、如何署名，以及是否允许商用。
