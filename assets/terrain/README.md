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

当前立体地图显示黄河、大汶河、徒骇河、小清河、沂河、潍河、大沽河和京杭运河山东段。黄河（`Huang`）使用 Natural Earth 数据，其余使用参考图补绘。源数据 `Yi` 的走向不能正确代表本项目需要的临沂段，已停用，改用单独标注的沂河示意。`getDisplayedRivers()` 在开槽前筛选数据，其他河流不着色或降低地形。原数据文件保留供维护使用，但不表示其中所有河流都会显示。

市界来自 [DataV 山东行政区划数据](https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json)，通过 `node scripts/update-prefectures.cjs` 更新，保留源顶点。显示时按端点精确匹配两个不同城市的共享边，并按地形三角网格拆分贴地；并非完整的行政区拓扑校验。

东营、滨州数据中一处已报告的独立小四边形，其行政含义尚未核实。`createExcludedBoundaryEdges()` 只排除这处四条边的展示，原始数据保留；更新数据时应重新核对，不能按面积批量删除其他闭合边界。

河流来自 [Natural Earth 1:10m 河流与湖泊中心线](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson)，为公共领域数据，通过 `node scripts/update-rivers.cjs` 更新。此处 1:10m 表示 1:1000 万比例尺，不是 10 米分辨率。当前只筛选地图包围盒内的连续顶点，包含黄河、沂河及范围内漳河河段，不是完整山东水网。

蓝色河槽通过降低中心线附近的显示网格顶点形成，宽度和深度均为示意参数，未修改原始高度图。除上述七条河流外，当前还显示京杭运河山东段示意与微山湖水面。微山湖使用 Natural Earth 1:1000 万湖泊多边形，数据保存在 `data/shandong-lakes.js`，通过 `node scripts/update-lakes.cjs` 更新。湖面范围概化，深度为展示参数；地图仍不包含完整湖泊、水库数据。

参考图补绘单独保存在 `data/shandong-rivers-reference.js`，仅保留沂河、徒骇河、小清河、大汶河、京杭运河、潍河和大沽河。未使用的补绘与公开数据中的 Yi、Zhang 已删除，更新脚本也只导入黄河。沂河临沂以下向西南出省进入江苏，不沿地图包围盒一路向南，也不做入海延伸。坐标仍按参考图粗略对齐，未核验实际出省交点，不可用于导航或勘界。

## 授权说明

湖区显示范围补充：Natural Earth 的 `Weishan Hu` 只覆盖南部单湖，不能代表参考图中的整个南四湖。`data/shandong-lakes-reference.js` 按参考图补绘北部南阳湖、独山湖、昭阳湖方向的连片水面，合并渲染时不重复开挖重叠区域。补绘不是实测湖岸，未核验面积、水位及岛屿，不能用于地理量测。

现有原数据说明存在冲突：目录中的 `LICENSE` 标为 MIT License，另一处说明又写有“未经允许不得随意传播和商业使用”。正式公开或用于商业项目之前，应向数据提供方确认可否再分发、如何署名，以及是否允许商用。
